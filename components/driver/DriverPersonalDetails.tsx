'use client';
import { useState, useRef, ChangeEvent } from 'react';
import { FaUser, FaEnvelope, FaLock, FaCamera, FaUpload, FaArrowRight, FaPhone } from 'react-icons/fa';
import { useDriverForm } from '@/app/context/DriverFormContext';
import Link from 'next/link';

interface FileWithPreview {
  file: File;
  preview: string;
}

export default function DriverPersonalDetails() {
  const { formData, setPersonalData } = useDriverForm();
  const [previewImage, setPreviewImage] = useState<FileWithPreview | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPersonalData({
      ...formData.personal,
      [name]: value
    });
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onloadend = () => {
        const fileWithPreview: FileWithPreview = {
          file,
          preview: reader.result as string
        };
        setPreviewImage(fileWithPreview);
        setPersonalData({
          ...formData.personal,
          profilePicture: fileWithPreview
        });
      };
      
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-gray-900 rounded-xl shadow-lg overflow-hidden md:max-w-2xl border border-gray-800">
      <h2 className="text-2xl font-bold text-white mb-6">Driver Personal Details</h2>
      
      <form className="space-y-6">
        {/* Profile Picture Upload */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative mb-4">
            <div className="w-32 h-32 rounded-full bg-gray-800 flex items-center justify-center overflow-hidden border-4 border-gray-700 shadow-lg">
              {previewImage ? (
                <img src={previewImage.preview} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <FaUser className="text-gray-400 text-5xl" />
              )}
            </div>
            <button
              type="button"
              onClick={triggerFileInput}
              className="absolute bottom-0 right-0 bg-purple-600 text-white p-2 rounded-full hover:bg-purple-700 transition duration-200 shadow-lg"
            >
              <FaCamera />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageChange}
              accept="image/*"
              className="hidden"
            />
          </div>
          <button
            type="button"
            onClick={triggerFileInput}
            className="flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition duration-200 shadow-md"
          >
            <FaUpload className="mr-2" />
            Upload Profile Picture
          </button>
        </div>

        {/* Phone Number (read-only) */}
        <div className="relative">
          <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-300 mb-1">
            Phone Number (Verified)
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-purple-400">
              <FaPhone className="text-purple-400" />
            </div>
            <input
              type="tel"
              id="phoneNumber"
              name="phoneNumber"
              value={formData.personal.phoneNumber || ''}
              readOnly
              className="pl-10 w-full px-4 py-2 border border-gray-700 rounded-lg bg-gray-800 text-gray-300"
              placeholder="Phone number"
            />
          </div>
        </div>

        {/* First Name */}
        <div className="relative">
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-300 mb-1">
            First Name
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-purple-400">
              <FaUser className="text-purple-400" />
            </div>
            <input
              type="text"
              id="firstName"
              name="firstName"
              value={formData.personal.firstName}
              onChange={handleChange}
              className="pl-10 w-full px-4 py-2 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200 text-white bg-gray-800"
              placeholder="Enter your first name"
              required
            />
          </div>
        </div>

        {/* Last Name */}
        <div className="relative">
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-300 mb-1">
            Last Name
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-purple-400">
              <FaUser className="text-purple-400" />
            </div>
            <input
              type="text"
              id="lastName"
              name="lastName"
              value={formData.personal.lastName}
              onChange={handleChange}
              className="pl-10 w-full px-4 py-2 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200 text-white bg-gray-800"
              placeholder="Enter your last name"
              required
            />
          </div>
        </div>

        {/* Email */}
        <div className="relative">
          <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
            Email Address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-purple-400">
              <FaEnvelope className="text-purple-400" />
            </div>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.personal.email}
              onChange={handleChange}
              className="pl-10 w-full px-4 py-2 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200 text-white bg-gray-800"
              placeholder="Enter your email address"
              required
            />
          </div>
        </div>

        {/* Password */}
        <div className="relative">
          <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
            Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-purple-400">
              <FaLock className="text-purple-400" />
            </div>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.personal.password}
              onChange={handleChange}
              className="pl-10 w-full px-4 py-2 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200 text-white bg-gray-800"
              placeholder="Create a password"
              required
              minLength={8}
            />
          </div>
          <p className="mt-1 text-xs text-gray-400">
            Password must be at least 8 characters long
          </p>
        </div>

        {/* Next Button */}
        <div className="flex justify-end">
          <Link 
            href="/driver/vehicle"
            className="flex items-center justify-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition duration-200 shadow-lg hover:shadow-xl"
          >
            Next <FaArrowRight className="ml-2" />
          </Link>
        </div>
      </form>
    </div>
  );
}