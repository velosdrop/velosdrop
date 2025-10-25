//components/driver/Documents.tsx
'use client';

import { useState, useRef, ChangeEvent } from 'react';
import { FaIdCard, FaFileAlt, FaCar, FaCamera, FaUpload, FaArrowLeft, FaCheck } from 'react-icons/fa';
import { useDriverForm } from '@/app/context/DriverFormContext';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

interface FileWithPreview {
  file: File;
  preview: string;
}

export default function Documents() {
  const { formData, setDocumentsData, submitAllData, isLoading, error } = useDriverForm();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Example usage of useSearchParams (customize as needed)
  // const someParam = searchParams.get('someParam');

  // Initialize state with FileWithPreview or null
  const [licenseFront, setLicenseFront] = useState<FileWithPreview | null>(null);
  const [licenseBack, setLicenseBack] = useState<FileWithPreview | null>(null);
  const [licenseExpiry, setLicenseExpiry] = useState(formData.documents.license.expiry);
  const [regFront, setRegFront] = useState<FileWithPreview | null>(null);
  const [regBack, setRegBack] = useState<FileWithPreview | null>(null);
  const [regExpiry, setRegExpiry] = useState(formData.documents.registration.expiry);
  const [idFront, setIdFront] = useState<FileWithPreview | null>(null);
  const [idBack, setIdBack] = useState<FileWithPreview | null>(null);

  const licenseFrontRef = useRef<HTMLInputElement>(null);
  const licenseBackRef = useRef<HTMLInputElement>(null);
  const regFrontRef = useRef<HTMLInputElement>(null);
  const regBackRef = useRef<HTMLInputElement>(null);
  const idFrontRef = useRef<HTMLInputElement>(null);
  const idBackRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (
    e: ChangeEvent<HTMLInputElement>,
    type: 'licenseFront' | 'licenseBack' | 'regFront' | 'regBack' | 'idFront' | 'idBack'
  ) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();

      reader.onloadend = () => {
        const preview = reader.result as string;
        const fileWithPreview: FileWithPreview = {
          file,
          preview,
        };

        switch (type) {
          case 'licenseFront':
            setLicenseFront(fileWithPreview);
            updateDocumentsData('license', { front: fileWithPreview });
            break;
          case 'licenseBack':
            setLicenseBack(fileWithPreview);
            updateDocumentsData('license', { back: fileWithPreview });
            break;
          case 'regFront':
            setRegFront(fileWithPreview);
            updateDocumentsData('registration', { front: fileWithPreview });
            break;
          case 'regBack':
            setRegBack(fileWithPreview);
            updateDocumentsData('registration', { back: fileWithPreview });
            break;
          case 'idFront':
            setIdFront(fileWithPreview);
            updateDocumentsData('nationalId', { front: fileWithPreview });
            break;
          case 'idBack':
            setIdBack(fileWithPreview);
            updateDocumentsData('nationalId', { back: fileWithPreview });
            break;
        }
      };

      reader.readAsDataURL(file);
    }
  };

  const updateDocumentsData = (
    section: 'license' | 'registration' | 'nationalId',
    data: any
  ) => {
    setDocumentsData({
      ...formData.documents,
      [section]: {
        ...formData.documents[section],
        ...data,
      },
    });
  };

  const handleExpiryChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    section: 'license' | 'registration'
  ) => {
    const value = e.target.value;
    if (section === 'license') {
      setLicenseExpiry(value);
      updateDocumentsData('license', { expiry: value });
    } else {
      setRegExpiry(value);
      updateDocumentsData('registration', { expiry: value });
    }
  };

  const triggerFileInput = (ref: React.RefObject<HTMLInputElement>) => {
    ref.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await submitAllData();
      router.push('/driver/registration-success');
    } catch (error) {
      console.error('Submission error:', error);
    }
  };

  const isFormComplete =
    licenseFront &&
    licenseBack &&
    licenseExpiry &&
    regFront &&
    regBack &&
    regExpiry &&
    idFront &&
    idBack;

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-xl shadow-lg overflow-hidden md:max-w-2xl border border-gray-200">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Upload Documents</h2>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Driver's License Section */}
        <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-2">
            <FaIdCard className="text-purple-600 text-xl" />
            <h3 className="text-lg font-semibold text-gray-800">Driver's License</h3>
          </div>

          {/* Front Image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Front Side</label>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-24 h-16 bg-gray-100 rounded-md flex items-center justify-center overflow-hidden border border-gray-300">
                  {licenseFront ? (
                    <img
                      src={licenseFront.preview}
                      alt="License front"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <FaIdCard className="text-gray-400 text-xl" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => triggerFileInput(licenseFrontRef)}
                  className="absolute -bottom-2 -right-2 bg-purple-600 text-white p-1.5 rounded-full hover:bg-purple-700 transition duration-200 shadow-md"
                >
                  <FaCamera size={12} />
                </button>
                <input
                  type="file"
                  ref={licenseFrontRef}
                  onChange={(e) => handleImageUpload(e, 'licenseFront')}
                  accept="image/*"
                  className="hidden"
                  required
                />
              </div>
              <button
                type="button"
                onClick={() => triggerFileInput(licenseFrontRef)}
                className="flex items-center justify-center px-3 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition duration-200 text-sm border border-gray-300"
              >
                <FaUpload className="mr-2" size={14} />
                Upload Front
              </button>
            </div>
          </div>

          {/* Back Image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Back Side</label>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-24 h-16 bg-gray-100 rounded-md flex items-center justify-center overflow-hidden border border-gray-300">
                  {licenseBack ? (
                    <img
                      src={licenseBack.preview}
                      alt="License back"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <FaIdCard className="text-gray-400 text-xl" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => triggerFileInput(licenseBackRef)}
                  className="absolute -bottom-2 -right-2 bg-purple-600 text-white p-1.5 rounded-full hover:bg-purple-700 transition duration-200 shadow-md"
                >
                  <FaCamera size={12} />
                </button>
                <input
                  type="file"
                  ref={licenseBackRef}
                  onChange={(e) => handleImageUpload(e, 'licenseBack')}
                  accept="image/*"
                  className="hidden"
                  required
                />
              </div>
              <button
                type="button"
                onClick={() => triggerFileInput(licenseBackRef)}
                className="flex items-center justify-center px-3 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition duration-200 text-sm border border-gray-300"
              >
                <FaUpload className="mr-2" size={14} />
                Upload Back
              </button>
            </div>
          </div>

          {/* Expiry Date */}
          <div>
            <label
              htmlFor="licenseExpiry"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Expiry Date (MM/YYYY)
            </label>
            <input
              type="text"
              id="licenseExpiry"
              value={licenseExpiry}
              onChange={(e) => handleExpiryChange(e, 'license')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition duration-200 text-gray-800"
              placeholder="MM/YYYY"
              required
            />
          </div>
        </div>

        {/* Vehicle Registration Section */}
        <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-2">
            <FaCar className="text-purple-600 text-xl" />
            <h3 className="text-lg font-semibold text-gray-800">Vehicle Registration Certificate</h3>
          </div>

          {/* Front Image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Front Side</label>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-24 h-16 bg-gray-100 rounded-md flex items-center justify-center overflow-hidden border border-gray-300">
                  {regFront ? (
                    <img
                      src={regFront.preview}
                      alt="Registration front"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <FaFileAlt className="text-gray-400 text-xl" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => triggerFileInput(regFrontRef)}
                  className="absolute -bottom-2 -right-2 bg-purple-600 text-white p-1.5 rounded-full hover:bg-purple-700 transition duration-200 shadow-md"
                >
                  <FaCamera size={12} />
                </button>
                <input
                  type="file"
                  ref={regFrontRef}
                  onChange={(e) => handleImageUpload(e, 'regFront')}
                  accept="image/*"
                  className="hidden"
                  required
                />
              </div>
              <button
                type="button"
                onClick={() => triggerFileInput(regFrontRef)}
                className="flex items-center justify-center px-3 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition duration-200 text-sm border border-gray-300"
              >
                <FaUpload className="mr-2" size={14} />
                Upload Front
              </button>
            </div>
          </div>

          {/* Back Image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Back Side</label>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-24 h-16 bg-gray-100 rounded-md flex items-center justify-center overflow-hidden border border-gray-300">
                  {regBack ? (
                    <img
                      src={regBack.preview}
                      alt="Registration back"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <FaFileAlt className="text-gray-400 text-xl" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => triggerFileInput(regBackRef)}
                  className="absolute -bottom-2 -right-2 bg-purple-600 text-white p-1.5 rounded-full hover:bg-purple-700 transition duration-200 shadow-md"
                >
                  <FaCamera size={12} />
                </button>
                <input
                  type="file"
                  ref={regBackRef}
                  onChange={(e) => handleImageUpload(e, 'regBack')}
                  accept="image/*"
                  className="hidden"
                  required
                />
              </div>
              <button
                type="button"
                onClick={() => triggerFileInput(regBackRef)}
                className="flex items-center justify-center px-3 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition duration-200 text-sm border border-gray-300"
              >
                <FaUpload className="mr-2" size={14} />
                Upload Back
              </button>
            </div>
          </div>

          {/* Expiry Date */}
          <div>
            <label
              htmlFor="regExpiry"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Expiry Date (MM/YYYY)
            </label>
            <input
              type="text"
              id="regExpiry"
              value={regExpiry}
              onChange={(e) => handleExpiryChange(e, 'registration')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition duration-200 text-gray-800"
              placeholder="MM/YYYY"
              required
            />
          </div>
        </div>

        {/* National ID Section */}
        <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-2">
            <FaIdCard className="text-purple-600 text-xl" />
            <h3 className="text-lg font-semibold text-gray-800">National ID</h3>
          </div>

          {/* Front Image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Front Side</label>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-24 h-16 bg-gray-100 rounded-md flex items-center justify-center overflow-hidden border border-gray-300">
                  {idFront ? (
                    <img
                      src={idFront.preview}
                      alt="ID front"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <FaIdCard className="text-gray-400 text-xl" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => triggerFileInput(idFrontRef)}
                  className="absolute -bottom-2 -right-2 bg-purple-600 text-white p-1.5 rounded-full hover:bg-purple-700 transition duration-200 shadow-md"
                >
                  <FaCamera size={12} />
                </button>
                <input
                  type="file"
                  ref={idFrontRef}
                  onChange={(e) => handleImageUpload(e, 'idFront')}
                  accept="image/*"
                  className="hidden"
                  required
                />
              </div>
              <button
                type="button"
                onClick={() => triggerFileInput(idFrontRef)}
                className="flex items-center justify-center px-3 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition duration-200 text-sm border border-gray-300"
              >
                <FaUpload className="mr-2" size={14} />
                Upload Front
              </button>
            </div>
          </div>

          {/* Back Image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Back Side</label>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-24 h-16 bg-gray-100 rounded-md flex items-center justify-center overflow-hidden border border-gray-300">
                  {idBack ? (
                    <img
                      src={idBack.preview}
                      alt="ID back"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <FaIdCard className="text-gray-400 text-xl" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => triggerFileInput(idBackRef)}
                  className="absolute -bottom-2 -right-2 bg-purple-600 text-white p-1.5 rounded-full hover:bg-purple-700 transition duration-200 shadow-md"
                >
                  <FaCamera size={12} />
                </button>
                <input
                  type="file"
                  ref={idBackRef}
                  onChange={(e) => handleImageUpload(e, 'idBack')}
                  accept="image/*"
                  className="hidden"
                  required
                />
              </div>
              <button
                type="button"
                onClick={() => triggerFileInput(idBackRef)}
                className="flex items-center justify-center px-3 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition duration-200 text-sm border border-gray-300"
              >
                <FaUpload className="mr-2" size={14} />
                Upload Back
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <Link
            href="/driver/vehicle"
            className="flex items-center justify-center px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition duration-200 shadow-lg hover:shadow-xl"
          >
            <FaArrowLeft className="mr-2" /> Previous
          </Link>
          <button
            type="submit"
            disabled={!isFormComplete || isLoading}
            className={`flex items-center justify-center px-6 py-3 rounded-lg transition duration-200 shadow-lg hover:shadow-xl ${
              isFormComplete && !isLoading
                ? 'bg-black hover:bg-gray-900 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isLoading ? 'Submitting...' : 'Submit All'} <FaCheck className="ml-2" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg border border-red-100">
            <p className="font-medium">Error:</p>
            <p>{error}</p>
            <p className="text-sm mt-1">Please complete all required fields</p>
          </div>
        )}
      </form>
    </div>
  );
}
