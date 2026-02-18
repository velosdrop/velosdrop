// components/merchant/Profile.tsx
'use client';

import { useState } from 'react';
import { Store, MapPin, Phone, Mail, Clock, Camera, Save, Upload, ToggleLeft, ToggleRight } from 'lucide-react';

interface ProfileProps {
  merchant: any;
  onLogoUpdate?: (logoUrl: string) => void;
  onProfileUpdate?: (updatedMerchant: any) => void;
}

interface BusinessHours {
  monday: { open: string; close: string; isOpen: boolean };
  tuesday: { open: string; close: string; isOpen: boolean };
  wednesday: { open: string; close: string; isOpen: boolean };
  thursday: { open: string; close: string; isOpen: boolean };
  friday: { open: string; close: string; isOpen: boolean };
  saturday: { open: string; close: string; isOpen: boolean };
  sunday: { open: string; close: string; isOpen: boolean };
}

export default function ProfileComponent({ merchant, onLogoUpdate, onProfileUpdate }: ProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [logoPreview, setLogoPreview] = useState(merchant?.logoUrl || '');
  
  // Business open/closed status
  const [isOpen, setIsOpen] = useState(merchant?.isOpen ?? true);

  // Form data state
  const [formData, setFormData] = useState({
    businessName: merchant?.businessName || '',
    ownerName: merchant?.ownerName || '',
    email: merchant?.email || '',
    phoneNumber: merchant?.phoneNumber || '',
    address: merchant?.address || '',
    city: merchant?.city || '',
    description: merchant?.description || '',
  });

  // Business hours state (from merchant data or defaults)
  const defaultHours = {
    monday: { open: '09:00', close: '22:00', isOpen: true },
    tuesday: { open: '09:00', close: '22:00', isOpen: true },
    wednesday: { open: '09:00', close: '22:00', isOpen: true },
    thursday: { open: '09:00', close: '22:00', isOpen: true },
    friday: { open: '09:00', close: '23:00', isOpen: true },
    saturday: { open: '10:00', close: '23:00', isOpen: true },
    sunday: { open: '10:00', close: '21:00', isOpen: true },
  };

  const [businessHours, setBusinessHours] = useState<BusinessHours>(
    merchant?.businessHours || defaultHours
  );

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Logo must be less than 5MB');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!);
      formData.append('quality', 'auto');
      formData.append('fetch_format', 'auto');
      formData.append('width', '200');
      formData.append('height', '200');
      formData.append('crop', 'fill');

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: 'POST', body: formData }
      );

      if (!res.ok) throw new Error('Upload failed');

      const data = await res.json();
      
      const token = localStorage.getItem('merchantToken');
      const saveRes = await fetch('/api/merchant/logo', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ logoUrl: data.secure_url })
      });

      if (!saveRes.ok) throw new Error('Failed to save logo');

      setLogoPreview(data.secure_url);
      setSuccess('Logo uploaded successfully!');
      
      if (onLogoUpdate) {
        onLogoUpdate(data.secure_url);
      }

    } catch (error: any) {
      setError(error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('merchantToken');
      
      const response = await fetch('/api/merchant/profile/update', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          businessHours,
          isOpen
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      setSuccess('Profile updated successfully!');
      
      if (onProfileUpdate) {
        onProfileUpdate(data.merchant);
      }
      
      setIsEditing(false);

    } catch (error: any) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const formatTimeForDisplay = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Business Profile</h1>
        <button
          onClick={() => {
            setIsEditing(!isEditing);
            setError('');
            setSuccess('');
          }}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            isEditing 
              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' 
              : 'bg-purple-600 text-white hover:bg-purple-700'
          }`}
        >
          {isEditing ? 'Cancel' : 'Edit Profile'}
        </button>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-600">{success}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Business Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.businessName}
                      onChange={(e) => setFormData({...formData, businessName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-gray-900"
                      placeholder="Enter business name"
                    />
                  ) : (
                    <p className="text-gray-900 font-medium">{merchant?.businessName}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Owner Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.ownerName}
                      onChange={(e) => setFormData({...formData, ownerName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-gray-900"
                      placeholder="Enter owner name"
                    />
                  ) : (
                    <p className="text-gray-900">{merchant?.ownerName}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    {isEditing ? (
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-gray-900"
                        placeholder="email@example.com"
                      />
                    ) : (
                      <span className="text-gray-600">{merchant?.email}</span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    {isEditing ? (
                      <input
                        type="tel"
                        value={formData.phoneNumber}
                        onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-gray-900"
                        placeholder="+1 234 567 8900"
                      />
                    ) : (
                      <span className="text-gray-600">{merchant?.phoneNumber}</span>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-gray-900"
                      placeholder="Street address"
                    />
                  ) : (
                    <span className="text-gray-600">{merchant?.address}, {merchant?.city}</span>
                  )}
                </div>
              </div>

              {isEditing && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-gray-900"
                    placeholder="City"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                {isEditing ? (
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-gray-900"
                    placeholder="Tell customers about your business..."
                  />
                ) : (
                  <p className="text-gray-600">{merchant?.description || 'No description added yet.'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Business Hours Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Business Hours</h2>
            
            {/* Open/Closed Toggle */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Store Status</p>
                  <p className="text-sm text-gray-500">Customers will see if your business is open or closed</p>
                </div>
                <button
                  onClick={() => setIsOpen(!isOpen)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    isOpen 
                      ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                      : 'bg-red-100 text-red-700 hover:bg-red-200'
                  }`}
                  disabled={!isEditing}
                >
                  {isOpen ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                  <span className="font-medium">{isOpen ? 'Open for Business' : 'Currently Closed'}</span>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {Object.entries(businessHours).map(([day, hours]) => (
                <div key={day} className="flex items-center gap-4 py-2 border-b border-gray-100 last:border-0">
                  <span className="w-24 text-gray-700 capitalize font-medium">{day}</span>
                  
                  {isEditing ? (
                    <>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={hours.isOpen}
                          onChange={(e) => setBusinessHours({
                            ...businessHours,
                            [day]: { ...hours, isOpen: e.target.checked }
                          })}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="text-sm text-gray-600">Open</span>
                      </label>
                      
                      {hours.isOpen && (
                        <div className="flex items-center gap-2 ml-2">
                          <input
                            type="time"
                            value={hours.open}
                            onChange={(e) => setBusinessHours({
                              ...businessHours,
                              [day]: { ...hours, open: e.target.value }
                            })}
                            className="px-2 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-purple-500 text-gray-900"
                          />
                          <span className="text-gray-500">to</span>
                          <input
                            type="time"
                            value={hours.close}
                            onChange={(e) => setBusinessHours({
                              ...businessHours,
                              [day]: { ...hours, close: e.target.value }
                            })}
                            className="px-2 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-purple-500 text-gray-900"
                          />
                        </div>
                      )}
                    </>
                  ) : (
                    <span className="text-gray-600">
                      {hours.isOpen 
                        ? `${formatTimeForDisplay(hours.open)} - ${formatTimeForDisplay(hours.close)}`
                        : 'Closed'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Logo & Status */}
        <div className="space-y-6">
          {/* Logo Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Business Logo</h2>
            <div className="flex flex-col items-center">
              <div className="w-32 h-32 bg-purple-100 rounded-xl flex items-center justify-center mb-4 overflow-hidden">
                {logoPreview ? (
                  <img 
                    src={logoPreview} 
                    alt={merchant?.businessName} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Store className="w-12 h-12 text-purple-600" />
                )}
              </div>
              
              <div className="relative">
                <input
                  type="file"
                  id="logo-upload"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                  disabled={uploading}
                />
                <label
                  htmlFor="logo-upload"
                  className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-600 rounded-lg text-sm font-medium hover:bg-purple-100 cursor-pointer transition-colors"
                >
                  {uploading ? (
                    <>
                      <Upload className="w-4 h-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4" />
                      {logoPreview ? 'Change Logo' : 'Upload Logo'}
                    </>
                  )}
                </label>
              </div>
              <p className="text-xs text-gray-400 mt-2">Recommended: 200x200px, PNG or JPG</p>
            </div>
          </div>

          {/* Status Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Business Status</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Account Status</span>
                <span className={`px-2 py-1 text-xs rounded-full capitalize ${
                  merchant?.status === 'approved' ? 'bg-green-100 text-green-600' : 
                  merchant?.status === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                  'bg-red-100 text-red-600'
                }`}>
                  {merchant?.status || 'Active'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Store Status</span>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  isOpen ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                }`}>
                  {isOpen ? 'Open' : 'Closed'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Member Since</span>
                <span className="text-gray-900 text-sm">
                  {new Date(merchant?.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Last Login</span>
                <span className="text-gray-900 text-sm">
                  {merchant?.lastLogin ? new Date(merchant.lastLogin).toLocaleDateString() : 'Today'}
                </span>
              </div>
            </div>
          </div>

          {/* Save Button (when editing) */}
          {isEditing && (
            <button 
              onClick={handleSaveProfile}
              disabled={saving || uploading}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 disabled:bg-purple-300 transition-colors"
            >
              {saving ? (
                <>
                  <Upload className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}