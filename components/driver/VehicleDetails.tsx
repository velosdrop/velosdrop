'use client';
import { useState, useRef, ChangeEvent } from 'react';
import { FaCar, FaMotorcycle, FaTruck, FaShuttleVan, FaCamera, FaUpload, FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import { useDriverForm } from '@/app/context/DriverFormContext';
import Link from 'next/link';

interface FileWithPreview {
  file: File;
  preview: string;
}

const vehicleTypes = [
  { value: 'motorcycle', label: 'Motorcycle', icon: <FaMotorcycle /> },
  { value: 'car', label: 'Car', icon: <FaCar /> },
  { value: 'van', label: 'Van', icon: <FaShuttleVan /> },
  { value: 'truck', label: 'Truck', icon: <FaTruck /> },
];

export default function VehicleDetails() {
  const { formData, setVehicleData } = useDriverForm();
  const [frontPreview, setFrontPreview] = useState<FileWithPreview | null>(null);
  const [backPreview, setBackPreview] = useState<FileWithPreview | null>(null);
  const frontFileInputRef = useRef<HTMLInputElement>(null);
  const backFileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setVehicleData({
      ...formData.vehicle,
      [name]: value
    });
  };

  const handleVehicleTypeSelect = (vehicleType: string) => {
    setVehicleData({
      ...formData.vehicle,
      vehicleType
    });
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>, type: 'front' | 'back') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();

      reader.onloadend = () => {
        const fileWithPreview: FileWithPreview = {
          file,
          preview: reader.result as string
        };

        if (type === 'front') {
          setFrontPreview(fileWithPreview);
          setVehicleData({
            ...formData.vehicle,
            frontImage: fileWithPreview
          });
        } else {
          setBackPreview(fileWithPreview);
          setVehicleData({
            ...formData.vehicle,
            backImage: fileWithPreview
          });
        }
      };

      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = (type: 'front' | 'back') => {
    if (type === 'front') {
      frontFileInputRef.current?.click();
    } else {
      backFileInputRef.current?.click();
    }
  };

  const isFormComplete = formData.vehicle.vehicleType && 
                       formData.vehicle.carName && 
                       formData.vehicle.numberPlate && 
                       frontPreview && 
                       backPreview;

  return (
    <div className="max-w-md mx-auto p-6 bg-gray-50 rounded-xl shadow-lg overflow-hidden md:max-w-2xl border border-purple-100">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Vehicle Details</h2>

      <form className="space-y-6">
        {/* Vehicle Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Type</label>
          <div className="grid grid-cols-2 gap-4">
            {vehicleTypes.map((vehicle) => (
              <button
                key={vehicle.value}
                type="button"
                onClick={() => handleVehicleTypeSelect(vehicle.value)}
                className={`flex flex-col items-center justify-center p-4 border-2 rounded-lg transition-all duration-200 ${
                  formData.vehicle.vehicleType === vehicle.value
                    ? 'border-purple-600 bg-purple-50 text-purple-700 shadow-md'
                    : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                }`}
              >
                <span className="text-2xl mb-2 text-purple-500">{vehicle.icon}</span>
                <span className="text-sm font-medium">{vehicle.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Car Name */}
        <div>
          <label htmlFor="carName" className="block text-sm font-medium text-gray-700 mb-1">
            Vehicle Name/Model
          </label>
          <input
            type="text"
            id="carName"
            name="carName"
            value={formData.vehicle.carName}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-300 transition duration-200 text-gray-800 bg-white"
            placeholder="e.g. Toyota Corolla, Honda CB500X"
            required
          />
        </div>

        {/* Number Plate */}
        <div>
          <label htmlFor="numberPlate" className="block text-sm font-medium text-gray-700 mb-1">
            License Plate Number
          </label>
          <input
            type="text"
            id="numberPlate"
            name="numberPlate"
            value={formData.vehicle.numberPlate}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-300 transition duration-200 uppercase text-gray-800 bg-white"
            placeholder="e.g. ABC 1234"
            required
          />
        </div>

        {/* Vehicle Images */}
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">Vehicle Photos</label>

          {/* Front Image */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Front View (Required)</label>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-24 h-24 bg-purple-50 rounded-lg flex items-center justify-center overflow-hidden border border-purple-200">
                  {frontPreview ? (
                    <img src={frontPreview.preview} alt="Vehicle front" className="w-full h-full object-cover" />
                  ) : (
                    <FaCar className="text-purple-300 text-2xl" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => triggerFileInput('front')}
                  className="absolute -bottom-2 -right-2 bg-purple-600 text-white p-1.5 rounded-full hover:bg-purple-700 transition duration-200 shadow-md"
                >
                  <FaCamera size={12} />
                </button>
                <input
                  type="file"
                  ref={frontFileInputRef}
                  onChange={(e) => handleImageUpload(e, 'front')}
                  accept="image/*"
                  className="hidden"
                  required={!frontPreview}
                />
              </div>
              <button
                type="button"
                onClick={() => triggerFileInput('front')}
                className="flex items-center justify-center px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition duration-200 text-sm shadow-md"
              >
                <FaUpload className="mr-2" size={14} />
                Upload Front View
              </button>
            </div>
          </div>

          {/* Back Image */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Back View (Required)</label>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-24 h-24 bg-purple-50 rounded-lg flex items-center justify-center overflow-hidden border border-purple-200">
                  {backPreview ? (
                    <img src={backPreview.preview} alt="Vehicle back" className="w-full h-full object-cover" />
                  ) : (
                    <FaCar className="text-purple-300 text-2xl" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => triggerFileInput('back')}
                  className="absolute -bottom-2 -right-2 bg-purple-600 text-white p-1.5 rounded-full hover:bg-purple-700 transition duration-200 shadow-md"
                >
                  <FaCamera size={12} />
                </button>
                <input
                  type="file"
                  ref={backFileInputRef}
                  onChange={(e) => handleImageUpload(e, 'back')}
                  accept="image/*"
                  className="hidden"
                  required={!backPreview}
                />
              </div>
              <button
                type="button"
                onClick={() => triggerFileInput('back')}
                className="flex items-center justify-center px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition duration-200 text-sm shadow-md"
              >
                <FaUpload className="mr-2" size={14} />
                Upload Back View
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <Link
            href="/driver/personal"
            className="flex items-center justify-center px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition duration-200 shadow-lg hover:shadow-xl"
          >
            <FaArrowLeft className="mr-2" /> Previous
          </Link>
          <Link
            href="/driver/documents"
            className={`flex items-center justify-center px-6 py-3 rounded-lg transition duration-200 shadow-lg hover:shadow-xl ${
              isFormComplete
                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            aria-disabled={!isFormComplete}
          >
            Next <FaArrowRight className="ml-2" />
          </Link>
        </div>
      </form>
    </div>
  );
}