'use client';
import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
if (MAPBOX_TOKEN) {
  mapboxgl.accessToken = MAPBOX_TOKEN;
}

interface RouteMapProps {
  pickupCoords: [number, number] | null;
  deliveryCoords: [number, number] | null;
  height?: string;
  onRouteCalculated?: (routeData: any) => void; // Add this prop
}

export default function RouteMap({ pickupCoords, deliveryCoords, height = "200px", onRouteCalculated }: RouteMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [routeData, setRouteData] = useState<any>(null);
  const pickupMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const deliveryMarkerRef = useRef<mapboxgl.Marker | null>(null);

  // Main map initialization
  useEffect(() => {
    if (!MAPBOX_TOKEN || !mapContainer.current) return;

    if (!map.current) {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12', // Using standard style
        center: [31.033, -17.827],
        zoom: 12,
        interactive: false
      });
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
      // Clean up markers
      if (pickupMarkerRef.current) {
        pickupMarkerRef.current.remove();
        pickupMarkerRef.current = null;
      }
      if (deliveryMarkerRef.current) {
        deliveryMarkerRef.current.remove();
        deliveryMarkerRef.current = null;
      }
    };
  }, []); // Empty dependency array for one-time initialization

  // Handle coordinate changes and route calculation
  useEffect(() => {
    if (!map.current || !pickupCoords || !deliveryCoords) return;

    const updateMapWithRoute = async () => {
      try {
        // Clear existing markers
        if (pickupMarkerRef.current) {
          pickupMarkerRef.current.remove();
        }
        if (deliveryMarkerRef.current) {
          deliveryMarkerRef.current.remove();
        }

        // Add new markers
        pickupMarkerRef.current = new mapboxgl.Marker({ color: '#10b981' })
          .setLngLat(pickupCoords)
          .addTo(map.current!);

        deliveryMarkerRef.current = new mapboxgl.Marker({ color: '#ef4444' })
          .setLngLat(deliveryCoords)
          .addTo(map.current!);

        // Fetch route
        const response = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/driving/${pickupCoords[0]},${pickupCoords[1]};${deliveryCoords[0]},${deliveryCoords[1]}?geometries=geojson&access_token=${MAPBOX_TOKEN}`
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch route');
        }

        const data = await response.json();
        
        if (data.routes && data.routes.length > 0) {
          setRouteData(data.routes[0]);
          addRouteToMap(data.routes[0]);

          // Call the callback if provided
          if (onRouteCalculated) {
            onRouteCalculated(data.routes[0]);
          }

          // Fit map to show the entire route
          const bounds = new mapboxgl.LngLatBounds()
            .extend(pickupCoords)
            .extend(deliveryCoords);
          
          map.current!.fitBounds(bounds, {
            padding: 50,
            maxZoom: 15,
            duration: 1000 // Smooth animation
          });
        }
      } catch (error) {
        console.error('Error fetching route:', error);
      }
    };

    // Wait for map to load before adding route
    if (map.current.isStyleLoaded()) {
      updateMapWithRoute();
    } else {
      map.current.on('load', updateMapWithRoute);
    }

  }, [pickupCoords, deliveryCoords, MAPBOX_TOKEN, onRouteCalculated]); // Add onRouteCalculated to dependencies

  const addRouteToMap = (route: any) => {
    if (!map.current) return;

    // Remove existing route layer if it exists
    if (map.current.getLayer('route')) {
      map.current.removeLayer('route');
    }
    if (map.current.getSource('route')) {
      map.current.removeSource('route');
    }

    // Add route source and layer
    map.current.addSource('route', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: route.geometry
      }
    });

    map.current.addLayer({
      id: 'route',
      type: 'line',
      source: 'route',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#8b5cf6',
        'line-width': 4,
        'line-opacity': 0.8
      }
    });
  };

  if (!MAPBOX_TOKEN) {
    return (
      <div className="bg-gray-800/50 rounded-xl flex items-center justify-center" style={{ height }}>
        <div className="text-center text-gray-400">
          <p>Map configuration required</p>
          <p className="text-sm">Please check your Mapbox token</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={mapContainer}
        className="rounded-xl overflow-hidden"
        style={{ height }}
      />
      {routeData && (
        <div className="absolute top-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
          Distance: {(routeData.distance / 1000).toFixed(1)} km
        </div>
      )}
    </div>
  );
}