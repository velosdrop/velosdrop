// app/admin/drivers/page.tsx
'use client';
import { useState, useEffect } from 'react';
import DriverCard from '@/components/admin/DriverCard';
import DriverDetailsModal from '@/components/admin/DriverDetailsModal';
import { DriverWithStats } from '@/src/types/driver';
import {
  Search,
  Filter,
  Users,
  Car,
  Bike,
  Truck,
  Download,
  Plus,
  RefreshCw,
  MoreVertical,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle
} from 'lucide-react';

export default function DriversPage() {
  const [drivers, setDrivers] = useState<DriverWithStats[]>([]);
  const [filteredDrivers, setFilteredDrivers] = useState<DriverWithStats[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<DriverWithStats | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [vehicleFilter, setVehicleFilter] = useState('all');

  useEffect(() => {
    fetchDrivers();
  }, []);

  useEffect(() => {
    filterDrivers();
  }, [drivers, searchTerm, statusFilter, vehicleFilter]);

  const fetchDrivers = async () => {
    try {
      const response = await fetch('/api/admin/drivers');
      const data = await response.json();
      
      if (response.ok) {
        setDrivers(data.drivers);
      } else {
        console.error('Failed to fetch drivers:', data.error);
      }
    } catch (error) {
      console.error('Error fetching drivers:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDrivers();
  };

  const filterDrivers = () => {
    let filtered = drivers;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(driver =>
        driver.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        driver.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        driver.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        driver.phoneNumber.includes(searchTerm) ||
        driver.numberPlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        driver.carName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(driver => driver.status === statusFilter);
    }

    // Vehicle filter
    if (vehicleFilter !== 'all') {
      filtered = filtered.filter(driver => driver.vehicleType === vehicleFilter);
    }

    setFilteredDrivers(filtered);
  };

  const handleStatusChange = async (driverId: number, newStatus: string) => {
    try {
      const response = await fetch('/api/admin/drivers', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          driverId,
          status: newStatus,
        }),
      });

      if (response.ok) {
        // Update local state
        setDrivers(prev =>
          prev.map(driver =>
            driver.id === driverId ? { ...driver, status: newStatus } : driver
          )
        );
        
        // Update selected driver if modal is open
        if (selectedDriver?.id === driverId) {
          setSelectedDriver(prev => prev ? { ...prev, status: newStatus } : null);
        }
      } else {
        console.error('Failed to update driver status');
      }
    } catch (error) {
      console.error('Error updating driver status:', error);
    }
  };

  const handleViewDetails = (driver: DriverWithStats) => {
    setSelectedDriver(driver);
    setIsModalOpen(true);
  };

  const getStatusStats = () => {
    const stats = {
      active: drivers.filter(d => d.status === 'active').length,
      pending: drivers.filter(d => d.status === 'pending').length,
      suspended: drivers.filter(d => d.status === 'suspended').length,
      inactive: drivers.filter(d => d.status === 'inactive').length,
      online: drivers.filter(d => d.isOnline).length
    };
    return stats;
  };

  const statusStats = getStatusStats();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-6 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto"></div>
          <div className="text-white text-xl font-semibold">Loading Drivers...</div>
          <p className="text-purple-300">Fetching driver information</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-6">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
              Drivers Management
            </h1>
            <p className="text-purple-300 text-lg">
              Manage and monitor your delivery drivers in real-time
            </p>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center space-x-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center space-x-2 bg-gray-800 hover:bg-gray-700 text-white py-2.5 px-4 rounded-xl border border-purple-500/20 transition-all duration-200 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white py-2.5 px-4 rounded-xl transition-all duration-200 transform hover:scale-105">
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
            <button className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 rounded-xl transition-all duration-200 transform hover:scale-105">
              <Plus className="w-4 h-4" />
              <span>Add Driver</span>
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <StatCard
            icon={<Users className="w-5 h-5" />}
            value={drivers.length}
            label="Total Drivers"
            color="purple"
          />
          <StatCard
            icon={<CheckCircle2 className="w-5 h-5" />}
            value={statusStats.active}
            label="Active"
            color="emerald"
          />
          <StatCard
            icon={<Clock className="w-5 h-5" />}
            value={statusStats.pending}
            label="Pending"
            color="amber"
          />
          <StatCard
            icon={<XCircle className="w-5 h-5" />}
            value={statusStats.suspended}
            label="Suspended"
            color="red"
          />
          <StatCard
            icon={<div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />}
            value={statusStats.online}
            label="Online Now"
            color="blue"
          />
        </div>
      </div>

      {/* Filters and Search Section */}
      <div className="bg-gray-800/50 rounded-2xl border border-purple-500/20 p-6 mb-8 backdrop-blur-sm">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
          {/* Search */}
          <div className="lg:col-span-4">
            <label className="block text-sm font-semibold text-purple-300 mb-2 flex items-center space-x-2">
              <Search className="w-4 h-4" />
              <span>Search Drivers</span>
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-400 w-4 h-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, email, phone, vehicle..."
                className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-purple-500/30 rounded-xl text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="lg:col-span-3">
            <label className="block text-sm font-semibold text-purple-300 mb-2 flex items-center space-x-2">
              <Filter className="w-4 h-4" />
              <span>Status</span>
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-purple-500/30 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTQgNkw4IDEwTDEyIDYiIHN0cm9rZT0iIzlGNThGQiIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+')] bg-no-repeat bg-right-3 bg-center bg-[length:16px_16px]"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Vehicle Filter */}
          <div className="lg:col-span-3">
            <label className="block text-sm font-semibold text-purple-300 mb-2">
              Vehicle Type
            </label>
            <select
              value={vehicleFilter}
              onChange={(e) => setVehicleFilter(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-purple-500/30 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTQgNkw4IDEwTDEyIDYiIHN0cm9rZT0iIzlGNThGQiIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+')] bg-no-repeat bg-right-3 bg-center bg-[length:16px_16px]"
            >
              <option value="all">All Vehicles</option>
              <option value="bicycle">Bicycle</option>
              <option value="motorbike">Motorbike</option>
              <option value="car">Car</option>
            </select>
          </div>

          {/* Results Count */}
          <div className="lg:col-span-2">
            <div className="text-center p-3 bg-gray-700/50 rounded-xl border border-purple-500/20">
              <div className="text-2xl font-bold text-white">{filteredDrivers.length}</div>
              <div className="text-purple-300 text-sm">Results</div>
            </div>
          </div>
        </div>

        {/* Active Filters */}
        {(searchTerm || statusFilter !== 'all' || vehicleFilter !== 'all') && (
          <div className="flex items-center space-x-2 mt-4 flex-wrap gap-2">
            <span className="text-purple-300 text-sm">Active filters:</span>
            {searchTerm && (
              <FilterBadge
                label={`Search: "${searchTerm}"`}
                onRemove={() => setSearchTerm('')}
              />
            )}
            {statusFilter !== 'all' && (
              <FilterBadge
                label={`Status: ${statusFilter}`}
                onRemove={() => setStatusFilter('all')}
              />
            )}
            {vehicleFilter !== 'all' && (
              <FilterBadge
                label={`Vehicle: ${vehicleFilter}`}
                onRemove={() => setVehicleFilter('all')}
              />
            )}
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setVehicleFilter('all');
              }}
              className="text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors duration-200"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Drivers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-8">
        {filteredDrivers.map((driver) => (
          <DriverCard
            key={driver.id}
            driver={driver}
            onStatusChange={handleStatusChange}
            onViewDetails={handleViewDetails}
          />
        ))}
      </div>

      {/* Empty State */}
      {filteredDrivers.length === 0 && (
        <div className="text-center py-16 bg-gray-800/30 rounded-2xl border border-purple-500/20 backdrop-blur-sm">
          <div className="text-purple-400 text-8xl mb-6">🚗</div>
          <h3 className="text-2xl font-semibold text-white mb-3">
            {drivers.length === 0 ? 'No Drivers Yet' : 'No Drivers Found'}
          </h3>
          <p className="text-purple-300 text-lg max-w-md mx-auto mb-8">
            {drivers.length === 0 
              ? 'Get started by adding your first driver to the platform.' 
              : 'Try adjusting your search criteria or filters to find what you\'re looking for.'}
          </p>
          <div className="flex items-center justify-center space-x-4">
            <button className="bg-purple-600 hover:bg-purple-700 text-white py-3 px-6 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105">
              <Plus className="w-5 h-5 inline mr-2" />
              Add First Driver
            </button>
            {(searchTerm || statusFilter !== 'all' || vehicleFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setVehicleFilter('all');
                }}
                className="bg-gray-700 hover:bg-gray-600 text-white py-3 px-6 rounded-xl font-semibold transition-all duration-200"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* Loading State for Refresh */}
      {refreshing && (
        <div className="fixed top-4 right-4 bg-emerald-600 text-white px-4 py-2 rounded-xl shadow-lg flex items-center space-x-2 animate-pulse">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Refreshing drivers...</span>
        </div>
      )}

      {/* Driver Details Modal */}
      {selectedDriver && (
        <DriverDetailsModal
          driver={selectedDriver}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}

// Stat Card Component
interface StatCardProps {
  icon: React.ReactNode;
  value: number;
  label: string;
  color: 'purple' | 'emerald' | 'amber' | 'red' | 'blue';
}

function StatCard({ icon, value, label, color }: StatCardProps) {
  const colorClasses = {
    purple: 'bg-purple-500/20 border-purple-500/30 text-purple-400',
    emerald: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400',
    amber: 'bg-amber-500/20 border-amber-500/30 text-amber-400',
    red: 'bg-red-500/20 border-red-500/30 text-red-400',
    blue: 'bg-blue-500/20 border-blue-500/30 text-blue-400'
  };

  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-4 backdrop-blur-sm hover:scale-105 transition-transform duration-200">
      <div className="flex items-center space-x-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
        <div>
          <div className="text-2xl font-bold text-white">{value}</div>
          <div className="text-purple-300 text-sm">{label}</div>
        </div>
      </div>
    </div>
  );
}

// Filter Badge Component
interface FilterBadgeProps {
  label: string;
  onRemove: () => void;
}

function FilterBadge({ label, onRemove }: FilterBadgeProps) {
  return (
    <div className="flex items-center space-x-1 bg-purple-600/20 text-purple-400 px-3 py-1 rounded-full text-sm border border-purple-500/30">
      <span>{label}</span>
      <button
        onClick={onRemove}
        className="hover:text-purple-300 transition-colors duration-200"
      >
        <XCircle className="w-3 h-3" />
      </button>
    </div>
  );
}