// app/admin/drivers/add/page.tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  UserPlus,
  Users,
  Mail,
  Phone,
  Lock,
  Car,
  FileText,
  Calendar,
  Shield,
  Upload,
  Camera,
  CreditCard,
  MapPin,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export default function AddDriverPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [driverData, setDriverData] = useState({
    // Personal Information
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    password: '',
    
    // Vehicle Information
    vehicleType: 'car',
    carName: '',
    numberPlate: '',
    
    // Document Details
    licenseExpiry: '',
    registrationExpiry: '',
    
    // Status
    status: 'pending' as 'pending' | 'active' | 'suspended' | 'inactive',
    
    // Optional fields
    profilePictureUrl: '',
    licenseFrontUrl: '',
    licenseBackUrl: '',
    registrationFrontUrl: '',
    registrationBackUrl: '',
    nationalIdFrontUrl: '',
    nationalIdBackUrl: '',
    vehicleFrontUrl: '',
    vehicleBackUrl: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateStep = () => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!driverData.firstName.trim()) newErrors.firstName = 'First name is required';
      if (!driverData.lastName.trim()) newErrors.lastName = 'Last name is required';
      if (!driverData.email.trim()) newErrors.email = 'Email is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(driverData.email)) newErrors.email = 'Invalid email format';
      if (!driverData.phoneNumber.trim()) newErrors.phoneNumber = 'Phone number is required';
      if (!driverData.password.trim()) newErrors.password = 'Password is required';
      else if (driverData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    }

    if (step === 2) {
      if (!driverData.vehicleType.trim()) newErrors.vehicleType = 'Vehicle type is required';
      if (!driverData.carName.trim()) newErrors.carName = 'Car name is required';
      if (!driverData.numberPlate.trim()) newErrors.numberPlate = 'Number plate is required';
    }

    if (step === 3) {
      if (!driverData.licenseExpiry.trim()) newErrors.licenseExpiry = 'License expiry date is required';
      if (!driverData.registrationExpiry.trim()) newErrors.registrationExpiry = 'Registration expiry date is required';
      
      // Validate dates
      const today = new Date();
      const licenseExpiry = new Date(driverData.licenseExpiry);
      const registrationExpiry = new Date(driverData.registrationExpiry);
      
      if (licenseExpiry <= today) newErrors.licenseExpiry = 'License must be future dated';
      if (registrationExpiry <= today) newErrors.registrationExpiry = 'Registration must be future dated';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    if (validateStep()) {
      setStep(step + 1);
    }
  };

  const handlePrevStep = () => {
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;

    setLoading(true);
    try {
      const response = await fetch('/api/admin/drivers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...driverData,
          balance: 0,
          isOnline: false,
          lastLocation: null,
          latitude: null,
          longitude: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Driver added successfully:', data);
        
        // Redirect to drivers list page
        router.push('/admin/drivers');
        
        // Optional: Show success notification
        alert('Driver added successfully!');
      } else {
        const errorData = await response.json();
        console.error('Failed to add driver:', errorData);
        setErrors({ submit: errorData.error || 'Failed to add driver' });
      }
    } catch (error) {
      console.error('Error adding driver:', error);
      setErrors({ submit: 'Error adding driver. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (field: string, file: File) => {
    try {
      // In a real app, you would upload to your server
      // For now, we'll simulate a successful upload
      console.log(`Uploading ${field}:`, file.name);
      
      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update the driver data with a mock URL
      setDriverData(prev => ({
        ...prev,
        [field]: `https://example.com/uploads/${file.name}`
      }));
      
      alert(`${field.replace('Url', '')} uploaded successfully!`);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-4 mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center space-x-2 text-purple-400 hover:text-purple-300 transition-colors duration-200"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Drivers</span>
          </button>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-blue-500/20 rounded-xl">
            <UserPlus className="w-8 h-8 text-blue-400" />
          </div>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
              Add New Driver
            </h1>
            <p className="text-purple-300 text-lg">
              Register a new driver to your delivery platform
            </p>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {[1, 2, 3, 4].map((stepNumber) => (
            <div key={stepNumber} className="flex items-center flex-1">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                step >= stepNumber 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-400'
              }`}>
                {step > stepNumber ? <CheckCircle className="w-5 h-5" /> : stepNumber}
              </div>
              {stepNumber < 4 && (
                <div className={`flex-1 h-1 mx-2 ${
                  step > stepNumber ? 'bg-blue-600' : 'bg-gray-700'
                }`} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-sm text-purple-300">
          <span>Personal Info</span>
          <span>Vehicle Info</span>
          <span>Documents</span>
          <span>Review</span>
        </div>
      </div>

      {/* Form Container */}
      <div className="bg-gray-800/50 rounded-2xl border border-purple-500/20 p-8 backdrop-blur-sm">
        {/* Step 1: Personal Information */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Users className="w-5 h-5 text-purple-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">Personal Information</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-purple-300 mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  value={driverData.firstName}
                  onChange={(e) => setDriverData({...driverData, firstName: e.target.value})}
                  className={`w-full px-4 py-3 bg-gray-700 border ${
                    errors.firstName ? 'border-red-500' : 'border-purple-500/30'
                  } rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200`}
                  placeholder="Enter first name"
                />
                {errors.firstName && (
                  <p className="mt-1 text-sm text-red-400 flex items-center space-x-1">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.firstName}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-purple-300 mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  value={driverData.lastName}
                  onChange={(e) => setDriverData({...driverData, lastName: e.target.value})}
                  className={`w-full px-4 py-3 bg-gray-700 border ${
                    errors.lastName ? 'border-red-500' : 'border-purple-500/30'
                  } rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200`}
                  placeholder="Enter last name"
                />
                {errors.lastName && (
                  <p className="mt-1 text-sm text-red-400 flex items-center space-x-1">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.lastName}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-purple-300 mb-2 flex items-center space-x-2">
                  <Mail className="w-4 h-4" />
                  <span>Email Address *</span>
                </label>
                <input
                  type="email"
                  value={driverData.email}
                  onChange={(e) => setDriverData({...driverData, email: e.target.value})}
                  className={`w-full px-4 py-3 bg-gray-700 border ${
                    errors.email ? 'border-red-500' : 'border-purple-500/30'
                  } rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200`}
                  placeholder="driver@example.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-400 flex items-center space-x-1">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.email}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-purple-300 mb-2 flex items-center space-x-2">
                  <Phone className="w-4 h-4" />
                  <span>Phone Number *</span>
                </label>
                <input
                  type="tel"
                  value={driverData.phoneNumber}
                  onChange={(e) => setDriverData({...driverData, phoneNumber: e.target.value})}
                  className={`w-full px-4 py-3 bg-gray-700 border ${
                    errors.phoneNumber ? 'border-red-500' : 'border-purple-500/30'
                  } rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200`}
                  placeholder="+263 77 123 4567"
                />
                {errors.phoneNumber && (
                  <p className="mt-1 text-sm text-red-400 flex items-center space-x-1">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.phoneNumber}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-purple-300 mb-2 flex items-center space-x-2">
                  <Lock className="w-4 h-4" />
                  <span>Password *</span>
                </label>
                <input
                  type="password"
                  value={driverData.password}
                  onChange={(e) => setDriverData({...driverData, password: e.target.value})}
                  className={`w-full px-4 py-3 bg-gray-700 border ${
                    errors.password ? 'border-red-500' : 'border-purple-500/30'
                  } rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200`}
                  placeholder="Enter secure password"
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-400 flex items-center space-x-1">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.password}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-purple-300 mb-2 flex items-center space-x-2">
                  <Shield className="w-4 h-4" />
                  <span>Initial Status</span>
                </label>
                <select
                  value={driverData.status}
                  onChange={(e) => setDriverData({...driverData, status: e.target.value as any})}
                  className="w-full px-4 py-3 bg-gray-700 border border-purple-500/30 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                >
                  <option value="pending">Pending Approval</option>
                  <option value="active">Active (Approve Now)</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Vehicle Information */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <Car className="w-5 h-5 text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">Vehicle Information</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-purple-300 mb-2 flex items-center space-x-2">
                  <Car className="w-4 h-4" />
                  <span>Vehicle Type *</span>
                </label>
                <select
                  value={driverData.vehicleType}
                  onChange={(e) => setDriverData({...driverData, vehicleType: e.target.value})}
                  className={`w-full px-4 py-3 bg-gray-700 border ${
                    errors.vehicleType ? 'border-red-500' : 'border-purple-500/30'
                  } rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200`}
                >
                  <option value="bicycle">Bicycle</option>
                  <option value="motorbike">Motorbike</option>
                  <option value="car">Car</option>
                  <option value="truck">Truck</option>
                  <option value="van">Van</option>
                </select>
                {errors.vehicleType && (
                  <p className="mt-1 text-sm text-red-400 flex items-center space-x-1">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.vehicleType}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-purple-300 mb-2">
                  Car Name / Model *
                </label>
                <input
                  type="text"
                  value={driverData.carName}
                  onChange={(e) => setDriverData({...driverData, carName: e.target.value})}
                  className={`w-full px-4 py-3 bg-gray-700 border ${
                    errors.carName ? 'border-red-500' : 'border-purple-500/30'
                  } rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200`}
                  placeholder="e.g., Toyota Corolla, Honda CR-V"
                />
                {errors.carName && (
                  <p className="mt-1 text-sm text-red-400 flex items-center space-x-1">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.carName}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-purple-300 mb-2">
                  Number Plate *
                </label>
                <input
                  type="text"
                  value={driverData.numberPlate}
                  onChange={(e) => setDriverData({...driverData, numberPlate: e.target.value.toUpperCase()})}
                  className={`w-full px-4 py-3 bg-gray-700 border ${
                    errors.numberPlate ? 'border-red-500' : 'border-purple-500/30'
                  } rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200`}
                  placeholder="e.g., AB 123 CD"
                />
                {errors.numberPlate && (
                  <p className="mt-1 text-sm text-red-400 flex items-center space-x-1">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.numberPlate}</span>
                  </p>
                )}
              </div>

              {/* Vehicle Photos Upload */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-purple-300 mb-3">
                  Vehicle Photos (Optional)
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border-2 border-dashed border-purple-500/30 rounded-xl p-6 text-center hover:border-purple-500/50 transition-all duration-200 cursor-pointer">
                    <Upload className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                    <p className="text-purple-300">Front View</p>
                    <p className="text-purple-400 text-sm">Click or drag to upload</p>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleFileUpload('vehicleFrontUrl', e.target.files[0])}
                    />
                  </div>
                  <div className="border-2 border-dashed border-purple-500/30 rounded-xl p-6 text-center hover:border-purple-500/50 transition-all duration-200 cursor-pointer">
                    <Upload className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                    <p className="text-purple-300">Back View</p>
                    <p className="text-purple-400 text-sm">Click or drag to upload</p>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleFileUpload('vehicleBackUrl', e.target.files[0])}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Document Details */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <FileText className="w-5 h-5 text-amber-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">Document Details</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-purple-300 mb-2 flex items-center space-x-2">
                  <Calendar className="w-4 h-4" />
                  <span>Driver License Expiry *</span>
                </label>
                <input
                  type="date"
                  value={driverData.licenseExpiry}
                  onChange={(e) => setDriverData({...driverData, licenseExpiry: e.target.value})}
                  className={`w-full px-4 py-3 bg-gray-700 border ${
                    errors.licenseExpiry ? 'border-red-500' : 'border-purple-500/30'
                  } rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200`}
                />
                {errors.licenseExpiry && (
                  <p className="mt-1 text-sm text-red-400 flex items-center space-x-1">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.licenseExpiry}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-purple-300 mb-2 flex items-center space-x-2">
                  <Calendar className="w-4 h-4" />
                  <span>Vehicle Registration Expiry *</span>
                </label>
                <input
                  type="date"
                  value={driverData.registrationExpiry}
                  onChange={(e) => setDriverData({...driverData, registrationExpiry: e.target.value})}
                  className={`w-full px-4 py-3 bg-gray-700 border ${
                    errors.registrationExpiry ? 'border-red-500' : 'border-purple-500/30'
                  } rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200`}
                />
                {errors.registrationExpiry && (
                  <p className="mt-1 text-sm text-red-400 flex items-center space-x-1">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.registrationExpiry}</span>
                  </p>
                )}
              </div>

              {/* Document Uploads */}
              <div className="md:col-span-2 space-y-4">
                <label className="block text-sm font-medium text-purple-300">
                  Document Uploads (Optional)
                </label>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border-2 border-dashed border-purple-500/30 rounded-xl p-4 text-center hover:border-purple-500/50 transition-all duration-200 cursor-pointer">
                    <CreditCard className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                    <p className="text-purple-300 text-sm">License Front</p>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleFileUpload('licenseFrontUrl', e.target.files[0])}
                    />
                  </div>
                  
                  <div className="border-2 border-dashed border-purple-500/30 rounded-xl p-4 text-center hover:border-purple-500/50 transition-all duration-200 cursor-pointer">
                    <CreditCard className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                    <p className="text-purple-300 text-sm">License Back</p>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleFileUpload('licenseBackUrl', e.target.files[0])}
                    />
                  </div>
                  
                  <div className="border-2 border-dashed border-purple-500/30 rounded-xl p-4 text-center hover:border-purple-500/50 transition-all duration-200 cursor-pointer">
                    <FileText className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                    <p className="text-purple-300 text-sm">Registration Front</p>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleFileUpload('registrationFrontUrl', e.target.files[0])}
                    />
                  </div>
                  
                  <div className="border-2 border-dashed border-purple-500/30 rounded-xl p-4 text-center hover:border-purple-500/50 transition-all duration-200 cursor-pointer">
                    <FileText className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                    <p className="text-purple-300 text-sm">Registration Back</p>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleFileUpload('registrationBackUrl', e.target.files[0])}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Review and Submit */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <CheckCircle className="w-5 h-5 text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">Review Details</h2>
            </div>

            <div className="space-y-6">
              {/* Personal Info Review */}
              <div className="bg-gray-700/30 rounded-xl p-6 border border-purple-500/20">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                  <Users className="w-5 h-5 text-purple-400" />
                  <span>Personal Information</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-purple-300 text-sm">Full Name</p>
                    <p className="text-white font-medium">{driverData.firstName} {driverData.lastName}</p>
                  </div>
                  <div>
                    <p className="text-purple-300 text-sm">Email</p>
                    <p className="text-white font-medium">{driverData.email}</p>
                  </div>
                  <div>
                    <p className="text-purple-300 text-sm">Phone Number</p>
                    <p className="text-white font-medium">{driverData.phoneNumber}</p>
                  </div>
                  <div>
                    <p className="text-purple-300 text-sm">Status</p>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      driverData.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' :
                      driverData.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {driverData.status.charAt(0).toUpperCase() + driverData.status.slice(1)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Vehicle Info Review */}
              <div className="bg-gray-700/30 rounded-xl p-6 border border-purple-500/20">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                  <Car className="w-5 h-5 text-emerald-400" />
                  <span>Vehicle Information</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-purple-300 text-sm">Vehicle Type</p>
                    <p className="text-white font-medium capitalize">{driverData.vehicleType}</p>
                  </div>
                  <div>
                    <p className="text-purple-300 text-sm">Car Name</p>
                    <p className="text-white font-medium">{driverData.carName}</p>
                  </div>
                  <div>
                    <p className="text-purple-300 text-sm">Number Plate</p>
                    <p className="text-white font-medium">{driverData.numberPlate}</p>
                  </div>
                </div>
              </div>

              {/* Document Review */}
              <div className="bg-gray-700/30 rounded-xl p-6 border border-purple-500/20">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-amber-400" />
                  <span>Document Details</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-purple-300 text-sm">License Expiry</p>
                    <p className="text-white font-medium">{driverData.licenseExpiry || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-purple-300 text-sm">Registration Expiry</p>
                    <p className="text-white font-medium">{driverData.registrationExpiry || 'Not set'}</p>
                  </div>
                </div>
              </div>

              {/* Error Display */}
              {errors.submit && (
                <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4">
                  <p className="text-red-400 flex items-center space-x-2">
                    <AlertCircle className="w-5 h-5" />
                    <span>{errors.submit}</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-700">
          <button
            onClick={handlePrevStep}
            disabled={step === 1}
            className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
              step === 1 
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                : 'bg-gray-700 hover:bg-gray-600 text-white'
            }`}
          >
            Previous
          </button>
          
          <div className="flex items-center space-x-4">
            {step < 4 ? (
              <button
                onClick={handleNextStep}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all duration-200 transform hover:scale-105"
              >
                Next Step
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Adding Driver...</span>
                  </span>
                ) : (
                  'Add Driver'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}