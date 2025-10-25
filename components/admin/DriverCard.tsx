// components/admin/DriverCard.tsx
'use client';
import { useState } from 'react';
import { SelectDriver } from '@/src/db/schema';
import { 
  Car, 
  Bike, 
  Truck,
  Phone, 
  Mail, 
  MapPin, 
  DollarSign, 
  Shield,
  Play,
  Pause,
  MoreVertical,
  Star,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';

interface DriverWithStats extends SelectDriver {
  totalDeliveries?: number;
  averageRating?: number;
  totalEarnings?: number;
  completedDeliveries?: number;
}

interface DriverCardProps {
  driver: DriverWithStats;
  onStatusChange: (driverId: number, newStatus: string) => void;
  onViewDetails: (driver: DriverWithStats) => void;
}

export default function DriverCard({ driver, onStatusChange, onViewDetails }: DriverCardProps) {
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active':
        return {
          color: 'bg-emerald-500',
          textColor: 'text-emerald-400',
          borderColor: 'border-emerald-500/30',
          bgColor: 'bg-emerald-500/10',
          icon: <CheckCircle2 className="w-3 h-3" />,
          label: 'Active'
        };
      case 'pending':
        return {
          color: 'bg-amber-500',
          textColor: 'text-amber-400',
          borderColor: 'border-amber-500/30',
          bgColor: 'bg-amber-500/10',
          icon: <Clock className="w-3 h-3" />,
          label: 'Pending'
        };
      case 'suspended':
        return {
          color: 'bg-red-500',
          textColor: 'text-red-400',
          borderColor: 'border-red-500/30',
          bgColor: 'bg-red-500/10',
          icon: <XCircle className="w-3 h-3" />,
          label: 'Suspended'
        };
      case 'inactive':
        return {
          color: 'bg-gray-500',
          textColor: 'text-gray-400',
          borderColor: 'border-gray-500/30',
          bgColor: 'bg-gray-500/10',
          icon: <AlertCircle className="w-3 h-3" />,
          label: 'Inactive'
        };
      default:
        return {
          color: 'bg-gray-500',
          textColor: 'text-gray-400',
          borderColor: 'border-gray-500/30',
          bgColor: 'bg-gray-500/10',
          icon: <AlertCircle className="w-3 h-3" />,
          label: 'Unknown'
        };
    }
  };

  const getVehicleConfig = (vehicleType: string) => {
    switch (vehicleType.toLowerCase()) {
      case 'bicycle':
        return {
          icon: <Bike className="w-4 h-4" />,
          color: 'text-cyan-400',
          bgColor: 'bg-cyan-500/20',
          borderColor: 'border-cyan-500/30'
        };
      case 'motorbike':
        return {
          icon: <Bike className="w-4 h-4" />,
          color: 'text-blue-400',
          bgColor: 'bg-blue-500/20',
          borderColor: 'border-blue-500/30'
        };
      case 'car':
        return {
          icon: <Car className="w-4 h-4" />,
          color: 'text-purple-400',
          bgColor: 'bg-purple-500/20',
          borderColor: 'border-purple-500/30'
        };
      default:
        return {
          icon: <Truck className="w-4 h-4" />,
          color: 'text-gray-400',
          bgColor: 'bg-gray-500/20',
          borderColor: 'border-gray-500/30'
        };
    }
  };

  const formatBalance = (balance: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(balance / 100);
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]?.toUpperCase() || ''}${lastName[0]?.toUpperCase() || ''}`;
  };

  const getRatingColor = (rating?: number) => {
    if (!rating) return 'text-gray-400';
    if (rating >= 4.5) return 'text-emerald-400';
    if (rating >= 4.0) return 'text-amber-400';
    if (rating >= 3.0) return 'text-orange-400';
    return 'text-red-400';
  };

  const statusConfig = getStatusConfig(driver.status);
  const vehicleConfig = getVehicleConfig(driver.vehicleType);

  return (
    <div 
      className="group relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-purple-500/20 p-6 hover:border-purple-500/40 hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-500 ease-out transform hover:scale-[1.02]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Background Glow Effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      
      {/* Header */}
      <div className="relative flex items-start justify-between mb-6">
        <div className="flex items-center space-x-4">
          {/* Profile Picture with Fallback */}
          <div className="relative">
            {driver.profilePictureUrl && !imageError ? (
              <div className="relative">
                <img
                  src={driver.profilePictureUrl}
                  alt={`${driver.firstName} ${driver.lastName}`}
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-purple-500/30 group-hover:border-purple-500/60 transition-all duration-300"
                  onError={() => setImageError(true)}
                />
                {/* Online Status Indicator */}
                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-gray-800 transition-all duration-300 ${
                  driver.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-500'
                }`}></div>
              </div>
            ) : (
              <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:scale-110 transition-transform duration-300">
                {getInitials(driver.firstName, driver.lastName)}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <h3 className="text-white font-bold text-lg group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-purple-400 group-hover:to-blue-400 transition-all duration-300">
              {driver.firstName} {driver.lastName}
            </h3>
            <div className="flex items-center space-x-2 text-purple-300/80 text-sm">
              <Mail className="w-3 h-3" />
              <span className="truncate max-w-[140px]">{driver.email}</span>
            </div>
            <div className="flex items-center space-x-3 mt-2">
              {/* Rating */}
              {driver.averageRating && (
                <div className={`flex items-center space-x-1 text-sm font-medium ${getRatingColor(driver.averageRating)}`}>
                  <Star className="w-3 h-3 fill-current" />
                  <span>{driver.averageRating.toFixed(1)}</span>
                </div>
              )}
              
              {/* Deliveries Count */}
              {driver.totalDeliveries !== undefined && (
                <div className="flex items-center space-x-1 text-cyan-400 text-sm">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{driver.totalDeliveries}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end space-y-2">
          {/* Status Badge */}
          <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full border ${statusConfig.borderColor} ${statusConfig.bgColor} backdrop-blur-sm transition-all duration-300 group-hover:scale-105`}>
            {statusConfig.icon}
            <span className={`text-xs font-semibold ${statusConfig.textColor}`}>
              {statusConfig.label}
            </span>
          </div>

          {/* Vehicle Type */}
          <div className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-full border ${vehicleConfig.borderColor} ${vehicleConfig.bgColor} backdrop-blur-sm`}>
            {vehicleConfig.icon}
            <span className="text-white text-xs font-medium capitalize">
              {driver.vehicleType}
            </span>
          </div>
        </div>
      </div>

      {/* Driver Info Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="space-y-3">
          {/* Phone */}
          <div className="flex items-center space-x-2 text-sm">
            <Phone className="w-4 h-4 text-purple-400" />
            <span className="text-white font-medium truncate">{driver.phoneNumber}</span>
          </div>
          
          {/* Vehicle */}
          <div className="flex items-center space-x-2 text-sm">
            {vehicleConfig.icon}
            <span className="text-gray-300 truncate">{driver.carName}</span>
          </div>
        </div>

        <div className="space-y-3">
          {/* License Plate */}
          <div className="flex items-center space-x-2 text-sm">
            <Shield className="w-4 h-4 text-blue-400" />
            <span className="text-white font-mono text-xs bg-gray-700/50 px-2 py-1 rounded">
              {driver.numberPlate}
            </span>
          </div>
          
          {/* Balance */}
          <div className="flex items-center space-x-2 text-sm">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span className="text-white font-semibold">{formatBalance(driver.balance)}</span>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center justify-between mb-6 p-3 bg-gray-700/30 rounded-xl border border-gray-600/30 backdrop-blur-sm">
        <div className="text-center">
          <div className="text-white font-bold text-lg">{driver.totalDeliveries || 0}</div>
          <div className="text-purple-300 text-xs">Deliveries</div>
        </div>
        <div className="w-px h-8 bg-gray-600/50"></div>
        <div className="text-center">
          <div className={`font-bold text-lg ${getRatingColor(driver.averageRating)}`}>
            {driver.averageRating ? driver.averageRating.toFixed(1) : 'N/A'}
          </div>
          <div className="text-purple-300 text-xs">Rating</div>
        </div>
        <div className="w-px h-8 bg-gray-600/50"></div>
        <div className="text-center">
          <div className="text-white font-bold text-lg">
            {driver.completedDeliveries || 0}
          </div>
          <div className="text-purple-300 text-xs">Completed</div>
        </div>
      </div>

      {/* Online Status with Animation */}
      <div className="flex items-center justify-between mb-6 p-4 bg-gradient-to-r from-gray-700/50 to-gray-800/50 rounded-xl border border-gray-600/30 backdrop-blur-sm group-hover:border-purple-500/30 transition-all duration-300">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${driver.isOnline ? 'bg-emerald-500' : 'bg-gray-500'} animate-pulse`}></div>
          <span className="text-purple-300 text-sm font-medium">Status</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-white text-sm font-semibold">
            {driver.isOnline ? 'Online Now' : 'Offline'}
          </span>
          {driver.isOnline && (
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-3">
        <button
          onClick={() => onViewDetails(driver)}
          className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-purple-500/25 flex items-center justify-center space-x-2 group/btn"
        >
          <span>View Details</span>
          <MoreVertical className="w-4 h-4 group-hover/btn:translate-x-0.5 transition-transform duration-200" />
        </button>
        
        {driver.status === 'active' ? (
          <button
            onClick={() => onStatusChange(driver.id, 'suspended')}
            className="p-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white rounded-xl transition-all duration-300 transform hover:scale-110 hover:shadow-lg hover:shadow-red-500/25 group/tooltip relative"
            title="Suspend Driver"
          >
            <Pause className="w-4 h-4" />
            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-200 whitespace-nowrap">
              Suspend Driver
            </div>
          </button>
        ) : (
          <button
            onClick={() => onStatusChange(driver.id, 'active')}
            className="p-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-xl transition-all duration-300 transform hover:scale-110 hover:shadow-lg hover:shadow-emerald-500/25 group/tooltip relative"
            title="Activate Driver"
          >
            <Play className="w-4 h-4" />
            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-200 whitespace-nowrap">
              Activate Driver
            </div>
          </button>
        )}
      </div>

      {/* Hover Effect Border */}
      <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-purple-500/20 transition-all duration-500 pointer-events-none"></div>
    </div>
  );
}