// components/admin/DriverDetailsModal.tsx
'use client';
import { useState, useEffect, useRef } from 'react';
import { DriverWithStats } from '@/src/types/driver';
import {
  X,
  Car,
  Bike,
  Truck,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  Shield,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Star,
  TrendingUp,
  Download,
  Send,
  Eye,
  FileText,
  User,
  Settings,
  MoreVertical,
  Play,
  Pause,
  Circle,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  ExternalLink
} from 'lucide-react';

interface DriverDetailsModalProps {
  driver: DriverWithStats;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: (driverId: number, newStatus: string) => void;
}

export default function DriverDetailsModal({
  driver,
  isOpen,
  onClose,
  onStatusChange,
}: DriverDetailsModalProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [imageError, setImageError] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<{ type: string; side: string; url: string } | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [documentErrors, setDocumentErrors] = useState<{ [key: string]: boolean }>({});
  const downloadLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
      setSelectedDocument(null);
      setZoomLevel(1);
      setRotation(0);
      setDocumentErrors({});
    }, 300);
  };

  const openDocumentViewer = (type: string, side: string, url: string) => {
    setSelectedDocument({ type, side, url });
    setZoomLevel(1);
    setRotation(0);
  };

  const closeDocumentViewer = () => {
    setSelectedDocument(null);
    setZoomLevel(1);
    setRotation(0);
  };

  const zoomIn = () => setZoomLevel(prev => Math.min(prev + 0.25, 3));
  const zoomOut = () => setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
  const rotate = () => setRotation(prev => (prev + 90) % 360);
  const resetZoom = () => setZoomLevel(1);

  const handleDocumentError = (documentKey: string) => {
    setDocumentErrors(prev => ({ ...prev, [documentKey]: true }));
  };

  // Safe document download function
  const downloadFile = async (url: string, filename: string) => {
    if (typeof window === 'undefined') return; // Skip during SSR
    
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      
      // Use ref to avoid direct DOM manipulation
      if (downloadLinkRef.current) {
        downloadLinkRef.current.href = downloadUrl;
        downloadLinkRef.current.download = filename;
        downloadLinkRef.current.click();
      } else {
        // Fallback: create temporary link
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error(`Failed to download ${filename}:`, error);
      throw error;
    }
  };

  // Create actual document data from driver's document URLs
  const actualDocuments = {
    license: {
      front: driver.licenseFrontUrl || '/api/placeholder/400/250?text=License+Front+Not+Uploaded',
      back: driver.licenseBackUrl || '/api/placeholder/400/250?text=License+Back+Not+Uploaded'
    },
    vehicle: {
      front: driver.vehicleFrontUrl || '/api/placeholder/400/250?text=Vehicle+Front+Not+Uploaded',
      back: driver.vehicleBackUrl || '/api/placeholder/400/250?text=Vehicle+Back+Not+Uploaded'
    },
    registration: {
      front: driver.registrationFrontUrl || '/api/placeholder/400/250?text=Registration+Front+Not+Uploaded',
      back: driver.registrationBackUrl || '/api/placeholder/400/250?text=Registration+Back+Not+Uploaded'
    },
    nationalId: {
      front: driver.nationalIdFrontUrl || '/api/placeholder/400/250?text=National+ID+Front+Not+Uploaded',
      back: driver.nationalIdBackUrl || '/api/placeholder/400/250?text=National+ID+Back+Not+Uploaded'
    }
  };

  // Check if documents are uploaded
  const hasUploadedDocuments = {
    license: {
      front: !!driver.licenseFrontUrl,
      back: !!driver.licenseBackUrl
    },
    vehicle: {
      front: !!driver.vehicleFrontUrl,
      back: !!driver.vehicleBackUrl
    },
    registration: {
      front: !!driver.registrationFrontUrl,
      back: !!driver.registrationBackUrl
    },
    nationalId: {
      front: !!driver.nationalIdFrontUrl,
      back: !!driver.nationalIdBackUrl
    }
  };

  // Determine document status based on upload and expiry
  const getDocumentStatus = (type: keyof typeof hasUploadedDocuments, expiryDate?: string) => {
    const hasFront = hasUploadedDocuments[type].front;
    const hasBack = hasUploadedDocuments[type].back;
    
    if (!hasFront || !hasBack) {
      return 'pending';
    }

    if (expiryDate) {
      const expiry = new Date(expiryDate);
      const today = new Date();
      if (expiry < today) {
        return 'expired';
      }
    }

    return 'verified';
  };

  const getVerificationStatus = (type: string) => {
    switch (type) {
      case 'license':
        return getDocumentStatus('license', driver.licenseExpiry);
      case 'registration':
        return getDocumentStatus('registration', driver.registrationExpiry);
      case 'vehicle':
        return getDocumentStatus('vehicle');
      case 'nationalId':
        return getDocumentStatus('nationalId');
      default:
        return 'pending';
    }
  };

  const handleDownloadAll = async () => {
    try {
      // Create a list of all document URLs
      const documents = [
        { url: driver.licenseFrontUrl, name: `license_front_${driver.id}` },
        { url: driver.licenseBackUrl, name: `license_back_${driver.id}` },
        { url: driver.registrationFrontUrl, name: `registration_front_${driver.id}` },
        { url: driver.registrationBackUrl, name: `registration_back_${driver.id}` },
        { url: driver.nationalIdFrontUrl, name: `national_id_front_${driver.id}` },
        { url: driver.nationalIdBackUrl, name: `national_id_back_${driver.id}` },
        { url: driver.vehicleFrontUrl, name: `vehicle_front_${driver.id}` },
        { url: driver.vehicleBackUrl, name: `vehicle_back_${driver.id}` },
      ].filter(doc => doc.url); // Filter out null/undefined URLs

      // Download each document
      for (const doc of documents) {
        try {
          await downloadFile(doc.url!, `${doc.name}.jpg`);
          // Add small delay between downloads
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Failed to download ${doc.name}:`, error);
        }
      }
    } catch (error) {
      console.error('Download all failed:', error);
      alert('Some documents failed to download. Please check each document individually.');
    }
  };

  if (!isOpen && !isClosing) return null;

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const formatBalance = (balance: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(balance / 100);
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active':
        return {
          color: 'bg-emerald-500',
          textColor: 'text-emerald-400',
          borderColor: 'border-emerald-500/30',
          bgColor: 'bg-emerald-500/10',
          icon: <CheckCircle2 className="w-4 h-4" />,
          label: 'Active'
        };
      case 'pending':
        return {
          color: 'bg-amber-500',
          textColor: 'text-amber-400',
          borderColor: 'border-amber-500/30',
          bgColor: 'bg-amber-500/10',
          icon: <Clock className="w-4 h-4" />,
          label: 'Pending'
        };
      case 'suspended':
        return {
          color: 'bg-red-500',
          textColor: 'text-red-400',
          borderColor: 'border-red-500/30',
          bgColor: 'bg-red-500/10',
          icon: <XCircle className="w-4 h-4" />,
          label: 'Suspended'
        };
      case 'inactive':
        return {
          color: 'bg-gray-500',
          textColor: 'text-gray-400',
          borderColor: 'border-gray-500/30',
          bgColor: 'bg-gray-500/10',
          icon: <AlertCircle className="w-4 h-4" />,
          label: 'Inactive'
        };
      default:
        return {
          color: 'bg-gray-500',
          textColor: 'text-gray-400',
          borderColor: 'border-gray-500/30',
          bgColor: 'bg-gray-500/10',
          icon: <AlertCircle className="w-4 h-4" />,
          label: 'Unknown'
        };
    }
  };

  const getVehicleConfig = (vehicleType: string) => {
    switch (vehicleType.toLowerCase()) {
      case 'bicycle':
        return {
          icon: <Bike className="w-5 h-5" />,
          color: 'text-cyan-400',
          bgColor: 'bg-cyan-500/20',
          label: 'Bicycle'
        };
      case 'motorbike':
        return {
          icon: <Bike className="w-5 h-5" />,
          color: 'text-blue-400',
          bgColor: 'bg-blue-500/20',
          label: 'Motorbike'
        };
      case 'car':
        return {
          icon: <Car className="w-5 h-5" />,
          color: 'text-purple-400',
          bgColor: 'bg-purple-500/20',
          label: 'Car'
        };
      default:
        return {
          icon: <Truck className="w-5 h-5" />,
          color: 'text-gray-400',
          bgColor: 'bg-gray-500/20',
          label: 'Vehicle'
        };
    }
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

  const tabs = [
    { id: 'overview', name: 'Overview', icon: <User className="w-4 h-4" /> },
    { id: 'documents', name: 'Documents', icon: <FileText className="w-4 h-4" /> },
    { id: 'performance', name: 'Performance', icon: <TrendingUp className="w-4 h-4" /> },
  ];

  return (
    <>
      {/* Hidden download link for file downloads */}
      <a ref={downloadLinkRef} className="hidden" aria-hidden="true" />
      
      <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
        isClosing ? 'bg-black/0' : 'bg-black/50'
      }`}>
        <div 
          className={`bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl w-full max-w-6xl max-h-[95vh] overflow-hidden border border-purple-500/20 shadow-2xl shadow-purple-500/10 transform transition-all duration-300 ${
            isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
          }`}
        >
          {/* Header */}
          <div className="relative bg-gradient-to-r from-purple-600 via-purple-700 to-blue-600 p-8">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative flex items-start justify-between">
              <div className="flex items-center space-x-6">
                {/* Profile Picture */}
                <div className="relative">
                  {driver.profilePictureUrl && !imageError ? (
                    <div className="relative">
                      <img
                        src={driver.profilePictureUrl}
                        alt={`${driver.firstName} ${driver.lastName}`}
                        className="w-20 h-20 rounded-2xl object-cover border-4 border-white/20 shadow-2xl"
                        onError={() => setImageError(true)}
                      />
                      {/* Online Status */}
                      <div className={`absolute -bottom-2 -right-2 w-6 h-6 rounded-full border-3 border-purple-700 ${
                        driver.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-500'
                      }`}></div>
                    </div>
                  ) : (
                    <div className="w-20 h-20 bg-gradient-to-br from-white/20 to-white/10 rounded-2xl flex items-center justify-center text-white text-2xl font-bold border-4 border-white/20 shadow-2xl">
                      {getInitials(driver.firstName, driver.lastName)}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-4">
                    <h2 className="text-3xl font-bold text-white">
                      {driver.firstName} {driver.lastName}
                    </h2>
                    <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border ${statusConfig.borderColor} ${statusConfig.bgColor} backdrop-blur-sm`}>
                      {statusConfig.icon}
                      <span className={`text-sm font-semibold ${statusConfig.textColor}`}>
                        {statusConfig.label}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-6 text-purple-100">
                    <div className="flex items-center space-x-2">
                      <Mail className="w-4 h-4" />
                      <span className="font-medium">{driver.email}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4" />
                      <span className="font-medium">{driver.phoneNumber}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {vehicleConfig.icon}
                      <span className="font-medium capitalize">{driver.vehicleType}</span>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleClose}
                className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all duration-200 transform hover:scale-110 backdrop-blur-sm"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-700/50 bg-gray-800/50 backdrop-blur-sm">
            <div className="flex space-x-1 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-6 border-b-2 font-medium text-sm transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'border-purple-500 text-purple-400 bg-purple-500/10'
                      : 'border-transparent text-gray-400 hover:text-gray-300 hover:bg-gray-700/50'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-8 max-h-[60vh] overflow-y-auto">
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* Left Column */}
                <div className="space-y-8">
                  {/* Personal Information */}
                  <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-6 backdrop-blur-sm">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
                      <User className="w-5 h-5 text-purple-400" />
                      <span>Personal Information</span>
                    </h3>
                    <div className="space-y-4">
                      <InfoRow label="Full Name" value={`${driver.firstName} ${driver.lastName}`} />
                      <InfoRow label="Email" value={driver.email} />
                      <InfoRow label="Phone" value={driver.phoneNumber} />
                      <InfoRow label="Member Since" value={formatDate(driver.createdAt)} />
                      <InfoRow label="Last Updated" value={formatDate(driver.updatedAt)} />
                    </div>
                  </div>

                  {/* Status Information */}
                  <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-6 backdrop-blur-sm">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
                      <Settings className="w-5 h-5 text-blue-400" />
                      <span>Status Information</span>
                    </h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-purple-300">Account Status</span>
                        <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full ${statusConfig.bgColor} border ${statusConfig.borderColor}`}>
                          {statusConfig.icon}
                          <span className={`text-sm font-semibold ${statusConfig.textColor}`}>
                            {statusConfig.label}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-purple-300">Online Status</span>
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${driver.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-500'}`}></div>
                          <span className="text-white font-medium">
                            {driver.isOnline ? 'Online Now' : 'Offline'}
                          </span>
                        </div>
                      </div>
                      <InfoRow label="Current Balance" value={formatBalance(driver.balance)} />
                      <InfoRow label="Last Online" value={formatDate(driver.lastOnline)} />
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-8">
                  {/* Vehicle Information */}
                  <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-6 backdrop-blur-sm">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
                      <Car className="w-5 h-5 text-cyan-400" />
                      <span>Vehicle Information</span>
                    </h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-purple-300">Vehicle Type</span>
                        <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full ${vehicleConfig.bgColor}`}>
                          {vehicleConfig.icon}
                          <span className="text-white font-medium capitalize">{driver.vehicleType}</span>
                        </div>
                      </div>
                      <InfoRow label="Car Name" value={driver.carName} />
                      <InfoRow label="Number Plate" value={driver.numberPlate} />
                      <InfoRow label="Registration Expiry" value={formatDate(driver.registrationExpiry)} />
                      <InfoRow label="License Expiry" value={formatDate(driver.licenseExpiry)} />
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-6 backdrop-blur-sm">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
                      <Send className="w-5 h-5 text-emerald-400" />
                      <span>Quick Actions</span>
                    </h3>
                    <div className="space-y-3">
                      {driver.status === 'active' ? (
                        <ActionButton
                          icon={<Pause className="w-4 h-4" />}
                          label="Suspend Driver"
                          description="Temporarily disable driver account"
                          color="red"
                          onClick={() => onStatusChange(driver.id, 'suspended')}
                        />
                      ) : (
                        <ActionButton
                          icon={<Play className="w-4 h-4" />}
                          label="Activate Driver"
                          description="Enable driver to receive orders"
                          color="green"
                          onClick={() => onStatusChange(driver.id, 'active')}
                        />
                      )}
                      <ActionButton
                        icon={<Send className="w-4 h-4" />}
                        label="Send Notification"
                        description="Send push notification to driver"
                        color="blue"
                        onClick={() => {/* Send notification */}}
                      />
                      <ActionButton
                        icon={<Eye className="w-4 h-4" />}
                        label="View Full History"
                        description="Complete delivery and payment history"
                        color="purple"
                        onClick={() => {/* View history */}}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-white">Driver Documents</h3>
                    <p className="text-purple-300 mt-1">
                      {Object.values(hasUploadedDocuments).some(doc => doc.front && doc.back) 
                        ? 'View and verify all uploaded documents' 
                        : 'No documents uploaded yet'}
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button 
                      onClick={handleDownloadAll}
                      className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white py-2.5 px-4 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!Object.values(hasUploadedDocuments).some(doc => doc.front || doc.back)}
                    >
                      <Download className="w-4 h-4" />
                      <span>Download All</span>
                    </button>
                  </div>
                </div>

                {/* Documents Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Driver's License */}
                  <DocumentSection
                    title="Driver's License"
                    icon={<FileText className="w-5 h-5" />}
                    status={getVerificationStatus('license')}
                    expiryDate={driver.licenseExpiry}
                    documents={actualDocuments.license}
                    hasUploadedDocuments={hasUploadedDocuments.license}
                    onView={openDocumentViewer}
                    onDocumentError={handleDocumentError}
                    onDownloadFile={downloadFile}
                  />

                  {/* Vehicle Photos */}
                  <DocumentSection
                    title="Vehicle Photos"
                    icon={<Car className="w-5 h-5" />}
                    status={getVerificationStatus('vehicle')}
                    documents={actualDocuments.vehicle}
                    hasUploadedDocuments={hasUploadedDocuments.vehicle}
                    onView={openDocumentViewer}
                    onDocumentError={handleDocumentError}
                    onDownloadFile={downloadFile}
                  />

                  {/* Vehicle Registration */}
                  <DocumentSection
                    title="Registration Certificate"
                    icon={<Shield className="w-5 h-5" />}
                    status={getVerificationStatus('registration')}
                    expiryDate={driver.registrationExpiry}
                    documents={actualDocuments.registration}
                    hasUploadedDocuments={hasUploadedDocuments.registration}
                    onView={openDocumentViewer}
                    onDocumentError={handleDocumentError}
                    onDownloadFile={downloadFile}
                  />

                  {/* National ID */}
                  <DocumentSection
                    title="National ID"
                    icon={<User className="w-5 h-5" />}
                    status={getVerificationStatus('nationalId')}
                    documents={actualDocuments.nationalId}
                    hasUploadedDocuments={hasUploadedDocuments.nationalId}
                    onView={openDocumentViewer}
                    onDocumentError={handleDocumentError}
                    onDownloadFile={downloadFile}
                  />
                </div>

                {/* Verification Status */}
                <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-6 backdrop-blur-sm">
                  <h4 className="text-lg font-semibold text-white mb-4">Verification Status</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <VerificationItem
                      title="Driver's License"
                      status={getVerificationStatus('license')}
                      verifiedDate={hasUploadedDocuments.license.front && hasUploadedDocuments.license.back ? driver.createdAt : undefined}
                    />
                    <VerificationItem
                      title="Vehicle Registration"
                      status={getVerificationStatus('registration')}
                      verifiedDate={hasUploadedDocuments.registration.front && hasUploadedDocuments.registration.back ? driver.createdAt : undefined}
                    />
                    <VerificationItem
                      title="National ID"
                      status={getVerificationStatus('nationalId')}
                      verifiedDate={hasUploadedDocuments.nationalId.front && hasUploadedDocuments.nationalId.back ? driver.createdAt : undefined}
                    />
                    <VerificationItem
                      title="Vehicle Photos"
                      status={getVerificationStatus('vehicle')}
                      verifiedDate={hasUploadedDocuments.vehicle.front && hasUploadedDocuments.vehicle.back ? driver.createdAt : undefined}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'performance' && (
              <div className="space-y-8">
                <h3 className="text-2xl font-bold text-white mb-6">Performance Metrics</h3>
                
                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                  <MetricCard
                    value={driver.totalDeliveries?.toString() || '0'}
                    label="Total Deliveries"
                    icon={<CheckCircle2 className="w-6 h-6" />}
                    color="purple"
                  />
                  <MetricCard
                    value={driver.averageRating ? driver.averageRating.toFixed(1) : 'N/A'}
                    label="Average Rating"
                    icon={<Star className="w-6 h-6" />}
                    color="amber"
                    rating={driver.averageRating}
                  />
                  <MetricCard
                    value={formatBalance(driver.totalEarnings || 0)}
                    label="Total Earnings"
                    icon={<DollarSign className="w-6 h-6" />}
                    color="emerald"
                  />
                  <MetricCard
                    value={`${driver.onTimeRate || 98}%`}
                    label="On-Time Rate"
                    icon={<Clock className="w-6 h-6" />}
                    color="blue"
                  />
                </div>

                {/* Performance Charts Placeholder */}
                <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-6 backdrop-blur-sm">
                  <h4 className="text-lg font-semibold text-white mb-4">Performance Overview</h4>
                  <div className="h-48 bg-gray-700/30 rounded-xl border border-gray-600/30 flex items-center justify-center">
                    <div className="text-center text-gray-400">
                      <TrendingUp className="w-12 h-12 mx-auto mb-2" />
                      <p>Performance charts will be displayed here</p>
                    </div>
                  </div>
                </div>

                {/* Performance Actions */}
                <div className="flex space-x-4">
                  <button className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white py-3 px-6 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105">
                    <Eye className="w-4 h-4" />
                    <span>View Detailed Reports</span>
                  </button>
                  <button className="flex items-center space-x-2 bg-gray-700 hover:bg-gray-600 text-white py-3 px-6 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105">
                    <Download className="w-4 h-4" />
                    <span>Download Performance Data</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Document Viewer Modal */}
      {selectedDocument && (
        <DocumentViewer
          document={selectedDocument}
          zoomLevel={zoomLevel}
          rotation={rotation}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onRotate={rotate}
          onReset={resetZoom}
          onClose={closeDocumentViewer}
          onDownloadFile={downloadFile}
        />
      )}
    </>
  );
}

// Helper Components

// InfoRow Component
interface InfoRowProps {
  label: string;
  value: string;
}

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-700/30 last:border-b-0">
      <span className="text-purple-300 font-medium">{label}</span>
      <span className="text-white font-semibold text-right">{value}</span>
    </div>
  );
}

// ActionButton Component
interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  color: 'red' | 'green' | 'blue' | 'purple';
  onClick: () => void;
}

function ActionButton({ icon, label, description, color, onClick }: ActionButtonProps) {
  const colorClasses = {
    red: 'bg-red-600/20 border-red-500/30 hover:bg-red-600/30 text-red-400',
    green: 'bg-emerald-600/20 border-emerald-500/30 hover:bg-emerald-600/30 text-emerald-400',
    blue: 'bg-blue-600/20 border-blue-500/30 hover:bg-blue-600/30 text-blue-400',
    purple: 'bg-purple-600/20 border-purple-500/30 hover:bg-purple-600/30 text-purple-400'
  };

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border transition-all duration-200 transform hover:scale-[1.02] ${colorClasses[color]}`}
    >
      <div className="flex items-center space-x-3">
        <div className="p-2 rounded-lg bg-current/20">
          {icon}
        </div>
        <div className="flex-1">
          <div className="text-white font-medium">{label}</div>
          <div className="text-current/80 text-sm">{description}</div>
        </div>
      </div>
    </button>
  );
}

// MetricCard Component
interface MetricCardProps {
  value: string;
  label: string;
  icon: React.ReactNode;
  color: 'purple' | 'amber' | 'emerald' | 'blue';
  rating?: number;
}

function MetricCard({ value, label, icon, color, rating }: MetricCardProps) {
  const colorClasses = {
    purple: 'text-purple-400 bg-purple-500/20 border-purple-500/30',
    amber: 'text-amber-400 bg-amber-500/20 border-amber-500/30',
    emerald: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30',
    blue: 'text-blue-400 bg-blue-500/20 border-blue-500/30'
  };

  const ratingColor = rating ? getRatingColor(rating) : '';

  return (
    <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-6 text-center backdrop-blur-sm hover:scale-105 transition-transform duration-200">
      <div className={`w-12 h-12 ${colorClasses[color]} rounded-xl flex items-center justify-center mx-auto mb-3`}>
        {icon}
      </div>
      <div className={`text-2xl font-bold mb-1 ${rating ? ratingColor : 'text-white'}`}>
        {value}
      </div>
      <div className="text-purple-300 text-sm">{label}</div>
    </div>
  );
}

// Document Section Component
interface DocumentSectionProps {
  title: string;
  icon: React.ReactNode;
  status: 'verified' | 'pending' | 'expired';
  expiryDate?: string;
  documents: {
    front?: string;
    back?: string;
  };
  hasUploadedDocuments: {
    front: boolean;
    back: boolean;
  };
  onView: (type: string, side: string, url: string) => void;
  onDocumentError: (documentKey: string) => void;
  onDownloadFile: (url: string, filename: string) => Promise<void>;
}

function DocumentSection({ title, icon, status, expiryDate, documents, hasUploadedDocuments, onView, onDocumentError, onDownloadFile }: DocumentSectionProps) {
  const statusConfig = {
    verified: { color: 'text-emerald-400', bg: 'bg-emerald-500/20', label: 'Verified', icon: <CheckCircle2 className="w-4 h-4" /> },
    pending: { color: 'text-amber-400', bg: 'bg-amber-500/20', label: 'Pending', icon: <Clock className="w-4 h-4" /> },
    expired: { color: 'text-red-400', bg: 'bg-red-500/20', label: 'Expired', icon: <XCircle className="w-4 h-4" /> }
  };

  const config = statusConfig[status];

  const handleDownload = async (side: 'front' | 'back') => {
    const url = documents[side];
    if (!url || !hasUploadedDocuments[side]) return;

    try {
      await onDownloadFile(url, `${title.toLowerCase().replace(/\s+/g, '_')}_${side}.jpg`);
    } catch (error) {
      console.error(`Download failed for ${title} ${side}:`, error);
      alert(`Failed to download ${title} ${side}. Please try again.`);
    }
  };

  return (
    <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-6 backdrop-blur-sm hover:border-purple-500/30 transition-all duration-200">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
            {icon}
          </div>
          <div>
            <h4 className="text-white font-semibold">{title}</h4>
            {expiryDate && (
              <p className="text-purple-300 text-sm">
                Expires: {new Date(expiryDate).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
        <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full ${config.bg}`}>
          {config.icon}
          <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <DocumentThumbnail
          title={`${title} - Front`}
          imageUrl={documents.front}
          isUploaded={hasUploadedDocuments.front}
          onView={() => onView(title, 'Front', documents.front!)}
          onDownload={() => handleDownload('front')}
          onError={() => onDocumentError(`${title}_front`)}
        />
        <DocumentThumbnail
          title={`${title} - Back`}
          imageUrl={documents.back}
          isUploaded={hasUploadedDocuments.back}
          onView={() => onView(title, 'Back', documents.back!)}
          onDownload={() => handleDownload('back')}
          onError={() => onDocumentError(`${title}_back`)}
        />
      </div>

      <div className="flex space-x-2 mt-4">
        <button 
          className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => {
            handleDownload('front');
            handleDownload('back');
          }}
          disabled={!hasUploadedDocuments.front && !hasUploadedDocuments.back}
        >
          <Download className="w-4 h-4" />
          <span>Download All</span>
        </button>
        <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center space-x-2">
          <ExternalLink className="w-4 h-4" />
          <span>View All</span>
        </button>
      </div>
    </div>
  );
}

// Document Thumbnail Component
interface DocumentThumbnailProps {
  title: string;
  imageUrl?: string;
  isUploaded: boolean;
  onView: () => void;
  onDownload: () => void;
  onError: () => void;
}

function DocumentThumbnail({ title, imageUrl, isUploaded, onView, onDownload, onError }: DocumentThumbnailProps) {
  const [imgError, setImgError] = useState(false);

  const handleError = () => {
    setImgError(true);
    onError();
  };

  const handleClick = () => {
    if (isUploaded && !imgError) {
      onView();
    }
  };

  return (
    <div 
      className={`group cursor-pointer bg-gray-700/30 rounded-xl border p-3 transition-all duration-200 ${
        isUploaded && !imgError 
          ? 'border-gray-600/30 hover:border-purple-500/50' 
          : 'border-amber-500/30 hover:border-amber-500/50'
      }`}
      onClick={handleClick}
    >
      <div className="relative aspect-[4/3] bg-gray-600/20 rounded-lg overflow-hidden mb-2">
        {isUploaded && imageUrl && !imgError ? (
          <>
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              onError={handleError}
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 flex items-center justify-center">
              <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
            <FileText className="w-8 h-8 mb-1" />
            <span className="text-xs text-center">Not Uploaded</span>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between">
        <p className="text-purple-300 text-xs truncate flex-1">{title}</p>
        {isUploaded && imageUrl && !imgError && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDownload();
            }}
            className="p-1 hover:bg-purple-600/20 rounded transition-colors duration-200"
            title="Download"
          >
            <Download className="w-3 h-3 text-purple-400" />
          </button>
        )}
      </div>
    </div>
  );
}

// Document Viewer Component
interface DocumentViewerProps {
  document: { type: string; side: string; url: string };
  zoomLevel: number;
  rotation: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRotate: () => void;
  onReset: () => void;
  onClose: () => void;
  onDownloadFile: (url: string, filename: string) => Promise<void>;
}

function DocumentViewer({ document, zoomLevel, rotation, onZoomIn, onZoomOut, onRotate, onReset, onClose, onDownloadFile }: DocumentViewerProps) {
  const [imageError, setImageError] = useState(false);

  const handleDownload = async () => {
    try {
      await onDownloadFile(
        document.url, 
        `${document.type.toLowerCase().replace(/\s+/g, '_')}_${document.side.toLowerCase()}.jpg`
      );
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download document. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-purple-500/20">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gray-800/50 border-b border-gray-700/50">
          <div>
            <h3 className="text-white font-semibold">{document.type} - {document.side} Side</h3>
            <p className="text-purple-300 text-sm">Use controls to zoom and rotate</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Image Container */}
        <div className="flex-1 p-8 flex items-center justify-center bg-gray-800/30">
          <div className="relative max-w-full max-h-[60vh] overflow-auto">
            {!imageError ? (
              <img
                src={document.url}
                alt={`${document.type} ${document.side}`}
                className="transition-all duration-200 shadow-2xl"
                style={{
                  transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                  maxWidth: '100%',
                  maxHeight: '60vh',
                  objectFit: 'contain'
                }}
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="flex flex-col items-center justify-center w-96 h-64 bg-gray-700/50 rounded-lg border border-gray-600/30">
                <AlertCircle className="w-12 h-12 text-amber-500 mb-2" />
                <p className="text-amber-400 font-medium">Failed to load document</p>
                <p className="text-gray-400 text-sm mt-1">The document may have been moved or deleted</p>
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="p-4 bg-gray-800/50 border-t border-gray-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-purple-300 text-sm">
                Zoom: {Math.round(zoomLevel * 100)}%
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={onZoomOut}
                disabled={zoomLevel <= 0.5}
                className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={onReset}
                className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all duration-200"
              >
                Reset
              </button>
              <button
                onClick={onZoomIn}
                disabled={zoomLevel >= 3}
                className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={onRotate}
                className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all duration-200"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <button 
                onClick={handleDownload}
                className="p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all duration-200"
                disabled={imageError}
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Verification Item Component
interface VerificationItemProps {
  title: string;
  status: 'verified' | 'pending' | 'rejected' | 'expired';
  verifiedDate?: string;
}

function VerificationItem({ title, status, verifiedDate }: VerificationItemProps) {
  const statusConfig = {
    verified: { color: 'text-emerald-400', icon: <CheckCircle2 className="w-5 h-5" />, label: 'Verified' },
    pending: { color: 'text-amber-400', icon: <Clock className="w-5 h-5" />, label: 'Pending' },
    rejected: { color: 'text-red-400', icon: <XCircle className="w-5 h-5" />, label: 'Rejected' },
    expired: { color: 'text-red-400', icon: <XCircle className="w-5 h-5" />, label: 'Expired' }
  };

  const config = statusConfig[status];

  return (
    <div className="flex items-center space-x-3 p-3 bg-gray-700/30 rounded-lg border border-gray-600/30">
      <div className={config.color}>
        {config.icon}
      </div>
      <div className="flex-1">
        <div className="text-white text-sm font-medium">{title}</div>
        <div className="text-purple-300 text-xs">
          {status === 'verified' && verifiedDate ? `Verified ${new Date(verifiedDate).toLocaleDateString()}` : config.label}
        </div>
      </div>
    </div>
  );
}

// Helper function to get rating color
function getRatingColor(rating: number): string {
  if (rating >= 4.5) return 'text-emerald-400';
  if (rating >= 4.0) return 'text-amber-400';
  if (rating >= 3.0) return 'text-orange-400';
  return 'text-red-400';
}