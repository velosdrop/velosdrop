// app/admin/live-tracking/page.tsx
'use client';
import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Users, 
  Car, 
  Package, 
  Eye, 
  Filter, 
  RefreshCw, 
  ZoomIn, 
  ZoomOut, 
  MapPin,
  Navigation,
  Clock,
  Star,
  Truck,
  Bike,
  CheckCircle,
  XCircle,
  Phone,
  Mail
} from 'lucide-react';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
if (!MAPBOX_TOKEN) {
  throw new Error('Missing NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN environment variable');
}
mapboxgl.accessToken = MAPBOX_TOKEN;

interface Driver {
  id: number;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string;
  isOnline: boolean;
  status: 'active' | 'idle' | 'offline';
  profilePictureUrl?: string;
  vehicleType: 'car' | 'motorcycle' | 'bike' | 'truck';
  carName: string;
  numberPlate: string;
  currentLocation?: {
    longitude: number;
    latitude: number;
    timestamp: string;
    heading?: number;
    speed?: number;
  };
  currentOrder?: {
    id: string;
    status: 'pending' | 'picked_up' | 'in_progress' | 'delivered';
    pickupLocation: { longitude: number; latitude: number };
    deliveryLocation: { longitude: number; latitude: number };
    customerName: string;
    estimatedDelivery: string;
  };
  totalDeliveries: number;
  averageRating: number;
}

interface LiveTrackingStats {
  totalDrivers: number;
  onlineDrivers: number;
  activeDeliveries: number;
  idleDrivers: number;
}

export default function LiveTrackingPage() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<number, mapboxgl.Marker>>(new Map());
  const pubNubRef = useRef<any>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [stats, setStats] = useState<LiveTrackingStats>({
    totalDrivers: 0,
    onlineDrivers: 0,
    activeDeliveries: 0,
    idleDrivers: 0
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('Just now');
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [filters, setFilters] = useState({
    showOnline: true,
    showOffline: false,
    showActive: true,
    showIdle: true,
    vehicleType: 'all' as 'all' | 'car' | 'motorcycle' | 'bike' | 'truck'
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const mapInstance = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/murombo/cmdq9jyzw00hd01s87etkezgc',
      center: [31.033, -17.827],
      zoom: 13,
      pitch: 45,
      bearing: 0,
      antialias: true
    });

    mapInstance.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
    mapInstance.addControl(new mapboxgl.FullscreenControl(), 'top-right');

    mapInstance.on('load', () => {
      // Add 3D buildings
      mapInstance.addLayer({
        'id': '3d-buildings',
        'source': 'composite',
        'source-layer': 'building',
        'filter': ['==', 'extrude', 'true'],
        'type': 'fill-extrusion',
        'minzoom': 15,
        'paint': {
          'fill-extrusion-color': '#242424',
          'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ['zoom'],
            15,
            0,
            15.05,
            ['get', 'height']
          ],
          'fill-extrusion-base': [
            'interpolate',
            ['linear'],
            ['zoom'],
            15,
            0,
            15.05,
            ['get', 'min_height']
          ],
          'fill-extrusion-opacity': 0.8
        }
      });

      loadDriverData();
      setupPubNubConnection();
    });

    map.current = mapInstance;

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
      cleanupPubNubConnection();
      clearAllMarkers();
    };
  }, []);

  // Update markers when drivers or filters change
  useEffect(() => {
    if (drivers.length > 0 && map.current) {
      updateMapMarkers(drivers);
    }
  }, [drivers, filters]);

  // Setup PubNub connection for real-time updates
  const setupPubNubConnection = async () => {
    try {
      // Use your existing PubNub configuration
      const { createPubNubClient } = await import('@/lib/pubnub');
      
      pubNubRef.current = createPubNubClient(`admin_tracking_${Date.now()}`);

      // Add listener for real-time updates
      pubNubRef.current.addListener({
        message: (event: any) => {
          console.log('Real-time driver update received:', event);
          
          if (event.channel === 'driver_locations' && event.message.type === 'driver_location_update') {
            handleDriverLocationUpdate(event.message.data);
          } else if (event.channel === 'drivers' && event.message.type === 'driver_online_status') {
            handleDriverStatusUpdate(event.message.data);
          }
        },
        status: (event: any) => {
          console.log('PubNub connection status:', event);
          if (event.category === 'PNConnectedCategory') {
            setIsConnected(true);
            console.log('✅ Connected to real-time tracking');
          } else if (event.category === 'PNDisconnectedCategory') {
            setIsConnected(false);
          }
        }
      });

      // Subscribe to driver location updates
      pubNubRef.current.subscribe({
        channels: ['driver_locations', 'drivers'],
        withPresence: true
      });

    } catch (error) {
      console.error('Failed to setup PubNub connection:', error);
    }
  };

  // Cleanup PubNub connection
  const cleanupPubNubConnection = () => {
    if (pubNubRef.current) {
      pubNubRef.current.unsubscribeAll();
      pubNubRef.current.removeAllListeners();
      pubNubRef.current.stop();
    }
  };

  // Handle real-time driver location updates
  const handleDriverLocationUpdate = (data: any) => {
    setDrivers(prevDrivers => 
      prevDrivers.map(driver => 
        driver.id === data.driverId 
          ? {
              ...driver,
              currentLocation: {
                longitude: data.location.longitude,
                latitude: data.location.latitude,
                timestamp: new Date().toISOString(),
                heading: data.location.heading,
                speed: data.location.speed
              }
            }
          : driver
      )
    );

    // Update marker on map
    updateDriverMarker(data.driverId, data.location);
  };

  // Handle driver status updates
  const handleDriverStatusUpdate = (data: any) => {
    setDrivers(prevDrivers =>
      prevDrivers.map(driver =>
        driver.id === data.driverId
          ? { ...driver, isOnline: data.isOnline }
          : driver
      )
    );
  };

  // Update individual driver marker
  const updateDriverMarker = (driverId: number, location: any) => {
    const marker = markersRef.current.get(driverId);
    if (marker && map.current) {
      marker.setLngLat([location.longitude, location.latitude]);
      
      if (location.heading) {
        marker.setRotation(location.heading);
      }
    }
  };

  // Load driver data
  const loadDriverData = async () => {
    try {
      setLoading(true);
      
      const driversResponse = await fetch('/api/admin/drivers');
      if (!driversResponse.ok) throw new Error('Failed to fetch drivers');
      
      const driversData = await driversResponse.json();
      const driversList: Driver[] = driversData.drivers || [];
      
      setDrivers(driversList);
      updateStats(driversList);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Error loading driver data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Update statistics
  const updateStats = (driversList: Driver[]) => {
    const totalDrivers = driversList.length;
    const onlineDrivers = driversList.filter(d => d.isOnline).length;
    const activeDeliveries = driversList.filter(d => d.currentOrder && d.isOnline).length;
    const idleDrivers = onlineDrivers - activeDeliveries;

    setStats({
      totalDrivers,
      onlineDrivers,
      activeDeliveries,
      idleDrivers
    });
  };

  // Create amazing black and purple car marker with animations
  const createDriverMarkerElement = (driver: Driver) => {
    const el = document.createElement('div');
    el.className = 'driver-marker cursor-pointer transform transition-all duration-500';
    
    const status = driver.isOnline 
      ? (driver.currentOrder ? 'active' : 'idle')
      : 'offline';

    const statusColors = {
      active: { 
        primary: '#8B5CF6', // Purple
        secondary: '#10B981', // Emerald
        glow: 'rgba(139, 92, 246, 0.4)'
      },
      idle: { 
        primary: '#8B5CF6', // Purple
        secondary: '#F59E0B', // Amber
        glow: 'rgba(139, 92, 246, 0.4)'
      },
      offline: { 
        primary: '#6B7280', // Gray
        secondary: '#6B7280',
        glow: 'rgba(107, 114, 128, 0.4)'
      }
    };

    const vehicleIcons = {
      car: '🚗',
      motorcycle: '🏍️',
      bike: '🚲',
      truck: '🚛'
    };

    const colors = statusColors[status];

    el.innerHTML = `
      <div class="relative animate-bounce-subtle">
        <!-- Pulsing glow effect for active drivers -->
        ${status === 'active' ? `
          <div class="absolute inset-0 animate-ping-slow">
            <div class="w-16 h-16 rounded-full" style="background: ${colors.glow}"></div>
          </div>
        ` : ''}
        
        <!-- Main marker container -->
        <div class="relative bg-gradient-to-br from-gray-900 to-black rounded-2xl p-2 shadow-2xl border-2 border-purple-500/50 transform hover:scale-110 hover:rotate-3 transition-all duration-300 backdrop-blur-sm">
          
          <!-- Vehicle icon with status ring -->
          <div class="relative">
            <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center text-white text-lg shadow-inner">
              ${vehicleIcons[driver.vehicleType]}
            </div>
            
            <!-- Status indicator dot -->
            <div class="absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-gray-900" style="background: ${colors.secondary}">
              ${driver.currentOrder ? `
                <div class="absolute inset-0 bg-red-500 rounded-full animate-pulse"></div>
              ` : ''}
            </div>
            
            <!-- Direction indicator for moving vehicles -->
            ${driver.currentLocation?.heading ? `
              <div class="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-4 border-transparent" style="border-top-color: ${colors.primary}; transform: rotate(${driver.currentLocation.heading}deg)"></div>
            ` : ''}
          </div>
          
          <!-- Delivery indicator -->
          ${driver.currentOrder ? `
            <div class="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full border-2 border-gray-900 flex items-center justify-center animate-pulse">
              <div class="w-1.5 h-1.5 bg-white rounded-full"></div>
            </div>
          ` : ''}
        </div>
        
        <!-- Pointer triangle -->
        <div class="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
          <div class="w-4 h-4 bg-gray-900 rotate-45 transform origin-center border-r border-b border-purple-500/50"></div>
        </div>
        
        <!-- Speed indicator for moving vehicles -->
        ${driver.currentLocation?.speed && driver.currentLocation.speed > 5 ? `
          <div class="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded-full border border-purple-500/30 whitespace-nowrap">
            ${driver.currentLocation.speed.toFixed(0)} km/h
          </div>
        ` : ''}
      </div>
    `;
    
    return el;
  };

  // Update all markers on the map
  const updateMapMarkers = (driversList: Driver[]) => {
    if (!map.current) return;

    clearAllMarkers();

    driversList
      .filter(driver => filterDriver(driver))
      .forEach(driver => {
        if (driver.currentLocation) {
          addDriverMarker(driver);
        }
      });

    if (!selectedDriver) {
      setTimeout(() => {
        fitMapToMarkers();
      }, 500);
    }
  };

  // Filter driver based on current filters
  const filterDriver = (driver: Driver) => {
    if (!filters.showOnline && driver.isOnline) return false;
    if (!filters.showOffline && !driver.isOnline) return false;
    if (!filters.showActive && driver.currentOrder) return false;
    if (!filters.showIdle && driver.isOnline && !driver.currentOrder) return false;
    if (filters.vehicleType !== 'all' && driver.vehicleType !== filters.vehicleType) return false;
    return true;
  };

  // Add individual driver marker
  const addDriverMarker = (driver: Driver) => {
    if (!map.current || !driver.currentLocation) return;

    const marker = new mapboxgl.Marker({
      element: createDriverMarkerElement(driver),
      anchor: 'bottom'
    })
      .setLngLat([driver.currentLocation.longitude, driver.currentLocation.latitude])
      .addTo(map.current);

    if (driver.currentLocation.heading) {
      marker.setRotation(driver.currentLocation.heading);
    }

    marker.getElement().addEventListener('click', (e) => {
      e.stopPropagation();
      setSelectedDriver(driver);
      flyToDriver(driver);
    });

    marker.getElement().addEventListener('mouseenter', () => {
      marker.getElement().classList.add('scale-110');
    });

    marker.getElement().addEventListener('mouseleave', () => {
      marker.getElement().classList.remove('scale-110');
    });

    markersRef.current.set(driver.id, marker);
  };

  // Clear all markers
  const clearAllMarkers = () => {
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current.clear();
  };

  // Fit map to show all markers
  const fitMapToMarkers = () => {
    if (!map.current || markersRef.current.size === 0) return;

    const bounds = new mapboxgl.LngLatBounds();
    
    markersRef.current.forEach((marker, driverId) => {
      const driver = drivers.find(d => d.id === driverId);
      if (driver?.currentLocation) {
        bounds.extend([driver.currentLocation.longitude, driver.currentLocation.latitude]);
      }
    });

    if (!bounds.isEmpty()) {
      map.current.fitBounds(bounds, {
        padding: { top: 50, bottom: 50, left: isSidebarCollapsed ? 50 : 350, right: 50 },
        maxZoom: 15,
        duration: 1000
      });
    }
  };

  // Fly to specific driver
  const flyToDriver = (driver: Driver) => {
    if (!map.current || !driver.currentLocation) return;

    map.current.flyTo({
      center: [driver.currentLocation.longitude, driver.currentLocation.latitude],
      zoom: 16,
      bearing: driver.currentLocation.heading || 0,
      pitch: 60,
      speed: 1.5,
      curve: 1.2,
      essential: true
    });
  };

  // Map controls
  const zoomIn = () => map.current?.zoomIn();
  const zoomOut = () => map.current?.zoomOut();

  // Get vehicle icon component
  const getVehicleIcon = (type: string) => {
    switch (type) {
      case 'car': return <Car className="w-4 h-4" />;
      case 'motorcycle': return <Bike className="w-4 h-4" />;
      case 'bike': return <Bike className="w-4 h-4" />;
      case 'truck': return <Truck className="w-4 h-4" />;
      default: return <Car className="w-4 h-4" />;
    }
  };

  const filteredDrivers = drivers.filter(filterDriver);

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Custom CSS for animations */}
      <style jsx global>{`
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        @keyframes ping-slow {
          0% { transform: scale(1); opacity: 1; }
          75%, 100% { transform: scale(2); opacity: 0; }
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 2s infinite;
        }
        .animate-ping-slow {
          animation: ping-slow 3s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        .driver-marker:hover {
          z-index: 1000 !important;
        }
      `}</style>

      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/admin/dashboard"
              className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span className="font-medium">Dashboard</span>
            </Link>
            <div className="h-6 w-px bg-slate-600"></div>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-500/20 rounded-xl">
                <Navigation className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Live Fleet Tracking</h1>
                <p className="text-slate-400">Real-time monitoring of delivery operations</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3 px-4 py-2 bg-slate-800 rounded-xl border border-slate-600">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                <span className="text-slate-300 text-sm font-medium">
                  {isConnected ? 'LIVE' : 'OFFLINE'}
                </span>
              </div>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400 text-sm">Updated: {lastUpdated}</span>
            </div>
            
            <button
              onClick={loadDriverData}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl text-white transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="font-medium">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Collapsible Sidebar */}
        <div className={`
          bg-slate-900 border-r border-slate-700 transition-all duration-300 overflow-hidden
          ${isSidebarCollapsed ? 'w-20' : 'w-96'}
        `}>
          {!isSidebarCollapsed ? (
            <div className="p-6 h-full overflow-y-auto">
              {/* Stats Overview */}
              <div className="space-y-6 mb-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">Fleet Overview</h2>
                  <button
                    onClick={() => setIsSidebarCollapsed(true)}
                    className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-2xl p-4 border border-blue-500/20">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-500/20 rounded-xl">
                        <Users className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-white">{stats.totalDrivers}</div>
                        <div className="text-blue-300 text-sm font-medium">Total Fleet</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 rounded-2xl p-4 border border-emerald-500/20">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-emerald-500/20 rounded-xl">
                        <Car className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-white">{stats.onlineDrivers}</div>
                        <div className="text-emerald-300 text-sm font-medium">Online</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/10 rounded-2xl p-4 border border-amber-500/20">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-amber-500/20 rounded-xl">
                        <Package className="w-5 h-5 text-amber-400" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-white">{stats.activeDeliveries}</div>
                        <div className="text-amber-300 text-sm font-medium">Active</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/10 rounded-2xl p-4 border border-cyan-500/20">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-cyan-500/20 rounded-xl">
                        <Eye className="w-5 h-5 text-cyan-400" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-white">{stats.idleDrivers}</div>
                        <div className="text-cyan-300 text-sm font-medium">Available</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="space-y-6 mb-8">
                <h2 className="text-lg font-semibold text-white">Filters</h2>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, showOnline: !prev.showOnline }))}
                      className={`flex items-center justify-center space-x-2 p-3 rounded-xl border transition-all ${
                        filters.showOnline 
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
                          : 'bg-slate-800 border-slate-600 text-slate-400'
                      }`}
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">Online</span>
                    </button>
                    
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, showOffline: !prev.showOffline }))}
                      className={`flex items-center justify-center space-x-2 p-3 rounded-xl border transition-all ${
                        filters.showOffline 
                          ? 'bg-slate-600 border-slate-500 text-slate-300' 
                          : 'bg-slate-800 border-slate-600 text-slate-400'
                      }`}
                    >
                      <XCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">Offline</span>
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    <label className="text-slate-300 text-sm font-medium">Vehicle Type</label>
                    <select
                      value={filters.vehicleType}
                      onChange={(e) => setFilters(prev => ({ ...prev, vehicleType: e.target.value as any }))}
                      className="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">All Vehicles</option>
                      <option value="car">Cars</option>
                      <option value="motorcycle">Motorcycles</option>
                      <option value="bike">Bikes</option>
                      <option value="truck">Trucks</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Drivers List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">
                    Drivers ({filteredDrivers.length})
                  </h2>
                  <button
                    onClick={fitMapToMarkers}
                    className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                    title="Fit to all drivers"
                  >
                    <MapPin className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
                
                {filteredDrivers.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <Car className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">No drivers found</p>
                    <p className="text-sm">Adjust your filters to see more drivers</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {filteredDrivers.map(driver => (
                      <div
                        key={driver.id}
                        className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 group backdrop-blur-sm ${
                          selectedDriver?.id === driver.id
                            ? 'bg-blue-500/20 border-blue-500 shadow-lg shadow-blue-500/20'
                            : 'bg-slate-800/50 border-slate-600 hover:border-slate-500 hover:bg-slate-700/50'
                        }`}
                        onClick={() => {
                          setSelectedDriver(driver);
                          flyToDriver(driver);
                        }}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="relative">
                            <div className={`w-12 h-12 rounded-full ${driver.isOnline ? (driver.currentOrder ? 'bg-emerald-500/20' : 'bg-amber-500/20') : 'bg-slate-600'} p-1`}>
                              {driver.profilePictureUrl ? (
                                <img 
                                  src={driver.profilePictureUrl} 
                                  alt={driver.firstName}
                                  className="w-full h-full rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full rounded-full bg-slate-700 flex items-center justify-center text-white font-semibold">
                                  {driver.firstName.charAt(0)}{driver.lastName.charAt(0)}
                                </div>
                              )}
                            </div>
                            <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-slate-900 ${
                              driver.isOnline 
                                ? (driver.currentOrder ? 'bg-emerald-500' : 'bg-amber-500')
                                : 'bg-slate-500'
                            }`}></div>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <h3 className="text-white font-semibold truncate">
                                {driver.firstName} {driver.lastName}
                              </h3>
                              {driver.currentOrder && (
                                <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full font-medium">
                                  DELIVERING
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center space-x-4 mt-1">
                              <span className="text-slate-300 text-sm capitalize">
                                {driver.vehicleType}
                              </span>
                              <span className="text-slate-500 text-sm">
                                {driver.carName}
                              </span>
                            </div>
                            
                            <div className="flex items-center space-x-4 mt-1">
                              <span className="flex items-center space-x-1 text-slate-400 text-sm">
                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                <span>{driver.averageRating.toFixed(1)}</span>
                              </span>
                              <span className="text-slate-500 text-sm">
                                {driver.totalDeliveries} deliveries
                              </span>
                            </div>
                            
                            {driver.currentLocation && (
                              <div className="flex items-center space-x-1 mt-2">
                                <Clock className="w-3 h-3 text-slate-500" />
                                <span className="text-slate-400 text-xs">
                                  {new Date(driver.currentLocation.timestamp).toLocaleTimeString()}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 h-full flex flex-col items-center space-y-6">
              <button
                onClick={() => setIsSidebarCollapsed(false)}
                className="p-3 hover:bg-slate-800 rounded-xl transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-slate-400 rotate-180" />
              </button>
              
              <div className="space-y-6">
                <button
                  onClick={fitMapToMarkers}
                  className="p-3 hover:bg-slate-800 rounded-xl transition-colors"
                  title="Fit to all drivers"
                >
                  <MapPin className="w-5 h-5 text-slate-400" />
                </button>
                
                <button
                  onClick={loadDriverData}
                  className="p-3 hover:bg-slate-800 rounded-xl transition-colors"
                  title="Refresh data"
                >
                  <RefreshCw className="w-5 h-5 text-slate-400" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Main Map Area */}
        <div className="flex-1 relative">
          {/* Enhanced Map Controls */}
          <div className="absolute top-6 left-6 z-10 space-y-3">
            <div className="bg-slate-900/90 backdrop-blur-sm rounded-2xl p-2 border border-slate-700 shadow-2xl">
              <button
                onClick={zoomIn}
                className="flex items-center justify-center w-10 h-10 hover:bg-slate-800 rounded-xl transition-colors group"
                title="Zoom In"
              >
                <ZoomIn className="w-5 h-5 text-slate-300 group-hover:text-white" />
              </button>
              <div className="w-8 h-px bg-slate-600 mx-auto my-1"></div>
              <button
                onClick={zoomOut}
                className="flex items-center justify-center w-10 h-10 hover:bg-slate-800 rounded-xl transition-colors group"
                title="Zoom Out"
              >
                <ZoomOut className="w-5 h-5 text-slate-300 group-hover:text-white" />
              </button>
            </div>
          </div>

          {/* Selected Driver Panel */}
          {selectedDriver && (
            <div className="absolute top-6 right-6 z-10 bg-slate-900/90 backdrop-blur-sm rounded-2xl border border-slate-700 shadow-2xl max-w-sm w-full animate-in slide-in-from-right">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-slate-700 overflow-hidden">
                        {selectedDriver.profilePictureUrl ? (
                          <img 
                            src={selectedDriver.profilePictureUrl} 
                            alt={selectedDriver.firstName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white font-semibold text-lg">
                            {selectedDriver.firstName.charAt(0)}{selectedDriver.lastName.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-900 ${
                        selectedDriver.isOnline 
                          ? (selectedDriver.currentOrder ? 'bg-emerald-500' : 'bg-amber-500')
                          : 'bg-slate-500'
                      }`}></div>
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-lg">
                        {selectedDriver.firstName} {selectedDriver.lastName}
                      </h3>
                      <p className="text-slate-400 text-sm">{selectedDriver.numberPlate}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedDriver(null)}
                    className="p-2 hover:bg-slate-800 rounded-xl transition-colors"
                  >
                    <XCircle className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  {/* Contact Information - Improved Layout */}
                  <div className="bg-slate-800/50 rounded-xl p-4 space-y-3">
                    <h4 className="text-slate-300 text-sm font-medium">Contact Information</h4>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3 text-sm">
                        <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span className="text-slate-200">{selectedDriver.phoneNumber}</span>
                      </div>
                      <div className="flex items-start space-x-3 text-sm">
                        <Mail className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                        <span className="text-slate-200 break-all">{selectedDriver.email}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-800/50 rounded-xl p-3">
                      <p className="text-slate-400 text-sm font-medium">Status</p>
                      <p className={`text-sm font-semibold ${
                        selectedDriver.isOnline 
                          ? (selectedDriver.currentOrder ? 'text-emerald-400' : 'text-amber-400')
                          : 'text-slate-400'
                      }`}>
                        {selectedDriver.isOnline 
                          ? (selectedDriver.currentOrder ? 'On Delivery' : 'Available')
                          : 'Offline'
                        }
                      </p>
                    </div>
                    
                    <div className="bg-slate-800/50 rounded-xl p-3">
                      <p className="text-slate-400 text-sm font-medium">Vehicle</p>
                      <p className="text-white font-semibold capitalize">{selectedDriver.vehicleType}</p>
                      <p className="text-slate-300 text-xs">{selectedDriver.carName}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-800/50 rounded-xl p-3">
                      <p className="text-slate-400 text-sm font-medium">Rating</p>
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-white font-semibold">{selectedDriver.averageRating.toFixed(1)}</span>
                      </div>
                    </div>
                    
                    <div className="bg-slate-800/50 rounded-xl p-3">
                      <p className="text-slate-400 text-sm font-medium">Deliveries</p>
                      <p className="text-white font-semibold">{selectedDriver.totalDeliveries}</p>
                    </div>
                  </div>
                  
                  {selectedDriver.currentLocation && (
                    <div className="bg-slate-800/50 rounded-xl p-3">
                      <p className="text-slate-400 text-sm font-medium mb-2">Last Location</p>
                      <div className="flex items-center space-x-2 text-sm">
                        <Clock className="w-4 h-4 text-slate-500" />
                        <span className="text-slate-300">
                          {new Date(selectedDriver.currentLocation.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      {selectedDriver.currentLocation.speed && (
                        <p className="text-slate-400 text-sm mt-1">
                          Speed: {selectedDriver.currentLocation.speed.toFixed(1)} km/h
                        </p>
                      )}
                    </div>
                  )}
                  
                  {selectedDriver.currentOrder && (
                    <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/20">
                      <h4 className="text-blue-400 font-semibold mb-2">Active Delivery</h4>
                      <div className="space-y-2 text-sm">
                        <p className="text-white">Order #{selectedDriver.currentOrder.id}</p>
                        <p className="text-slate-300">Customer: {selectedDriver.currentOrder.customerName}</p>
                        <p className="text-emerald-400 font-medium">
                          ETA: {selectedDriver.currentOrder.estimatedDelivery}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <button
                    onClick={() => flyToDriver(selectedDriver)}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-3 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center space-x-2 transform hover:scale-105"
                  >
                    <Navigation className="w-4 h-4" />
                    <span>Focus on Driver</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Loading Overlay */}
          {loading && (
            <div className="absolute inset-0 z-20 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
                <p className="text-purple-300 font-medium">Loading live data...</p>
                <p className="text-slate-400 text-sm">Tracking {drivers.length} drivers</p>
              </div>
            </div>
          )}

          {/* Connection Status */}
          {!isConnected && (
            <div className="absolute bottom-6 left-6 z-10 bg-amber-500/20 border border-amber-500/30 text-amber-400 px-4 py-2 rounded-xl backdrop-blur-sm">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                <span className="text-sm font-medium">Reconnecting to real-time updates...</span>
              </div>
            </div>
          )}

          {/* Map Container */}
          <div 
            ref={mapContainer} 
            className="h-full w-full"
          />
        </div>
      </div>
    </div>
  );
}