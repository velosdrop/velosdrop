// /app/context/DriverFormContext.tsx
'use client';

import { createContext, useState, useContext } from 'react';

interface FileWithPreview {
  file: File;
  preview: string;
}

interface DriverFormData {
  personal: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phoneNumber: string; 
    profilePicture: FileWithPreview | null;
  };
  vehicle: {
    vehicleType: string;
    carName: string;
    numberPlate: string;
    frontImage: FileWithPreview | null;
    backImage: FileWithPreview | null;
  };
  documents: {
    license: {
      front: FileWithPreview | null;
      back: FileWithPreview | null;
      expiry: string;
    };
    registration: {
      front: FileWithPreview | null;
      back: FileWithPreview | null;
      expiry: string;
    };
    nationalId: {
      front: FileWithPreview | null;
      back: FileWithPreview | null;
    };
  };
}

interface DriverFormContextType {
  formData: DriverFormData;
  setPersonalData: (data: Partial<DriverFormData['personal']>) => void;
  setVehicleData: (data: Partial<DriverFormData['vehicle']>) => void;
  setDocumentsData: (data: Partial<DriverFormData['documents']>) => void;
  submitAllData: () => Promise<string>;
  isLoading: boolean;
  error: string | null;
  resetForm: () => void;
}

const DriverFormContext = createContext<DriverFormContextType | undefined>(undefined);

export function DriverFormProvider({ children }: { children: React.ReactNode }) {
  const initialFormState: DriverFormData = {
    personal: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      phoneNumber: '',
      profilePicture: null,
    },
    vehicle: {
      vehicleType: '',
      carName: '',
      numberPlate: '',
      frontImage: null,
      backImage: null,
    },
    documents: {
      license: {
        front: null,
        back: null,
        expiry: '',
      },
      registration: {
        front: null,
        back: null,
        expiry: '',
      },
      nationalId: {
        front: null,
        back: null,
      },
    },
  };

  const [formData, setFormData] = useState<DriverFormData>(initialFormState);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setPersonalData = (data: Partial<DriverFormData['personal']>) => {
    setFormData(prev => ({
      ...prev,
      personal: {
        ...prev.personal,
        ...data
      }
    }));
  };

  const setVehicleData = (data: Partial<DriverFormData['vehicle']>) => {
    setFormData(prev => ({
      ...prev,
      vehicle: {
        ...prev.vehicle,
        ...data
      }
    }));
  };

  const setDocumentsData = (data: Partial<DriverFormData['documents']>) => {
    setFormData(prev => ({
      ...prev,
      documents: {
        ...prev.documents,
        ...data
      }
    }));
  };

  const resetForm = () => {
    setFormData(initialFormState);
    setError(null);
  };

  // File upload function
  const uploadFile = async (file: File, documentType: string): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', documentType);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Upload failed');
      }

      return data.url;
    } catch (error) {
      console.error(`Upload error for ${documentType}:`, error);
      throw new Error(`Failed to upload ${documentType}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Hash password function (you should use a proper hashing library in production)
  const hashPassword = async (password: string): Promise<string> => {
    // In a real application, use bcrypt or similar
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  };

  const submitAllData = async (): Promise<string> => {
    setIsLoading(true);
    setError(null);

    try {
      // Validate required fields
      const requiredFields = [
        { path: 'personal.firstName', value: formData.personal.firstName },
        { path: 'personal.lastName', value: formData.personal.lastName },
        { path: 'personal.email', value: formData.personal.email },
        { path: 'personal.password', value: formData.personal.password },
        { path: 'personal.phoneNumber', value: formData.personal.phoneNumber },
        { path: 'vehicle.vehicleType', value: formData.vehicle.vehicleType },
        { path: 'vehicle.carName', value: formData.vehicle.carName },
        { path: 'vehicle.numberPlate', value: formData.vehicle.numberPlate },
        { path: 'documents.license.expiry', value: formData.documents.license.expiry },
        { path: 'documents.registration.expiry', value: formData.documents.registration.expiry },
      ];

      const missingFields = requiredFields
        .filter(field => !field.value)
        .map(field => field.path.split('.').pop());

      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      // Validate document files
      const requiredDocuments = [
        { type: 'license front', file: formData.documents.license.front },
        { type: 'license back', file: formData.documents.license.back },
        { type: 'registration front', file: formData.documents.registration.front },
        { type: 'registration back', file: formData.documents.registration.back },
        { type: 'national ID front', file: formData.documents.nationalId.front },
        { type: 'national ID back', file: formData.documents.nationalId.back },
      ];

      const missingDocuments = requiredDocuments
        .filter(doc => !doc.file)
        .map(doc => doc.type);

      if (missingDocuments.length > 0) {
        throw new Error(`Missing required documents: ${missingDocuments.join(', ')}`);
      }

      // Upload all files in sequence to avoid overwhelming the server
      const uploadResults: { [key: string]: string } = {};

      // Upload profile picture if exists
      if (formData.personal.profilePicture) {
        try {
          uploadResults.profilePicture = await uploadFile(
            formData.personal.profilePicture.file, 
            'profile_picture'
          );
        } catch (error) {
          console.warn('Profile picture upload failed, continuing without it:', error);
        }
      }

      // Upload vehicle images if exist
      if (formData.vehicle.frontImage) {
        try {
          uploadResults.vehicleFront = await uploadFile(
            formData.vehicle.frontImage.file,
            'vehicle_front'
          );
        } catch (error) {
          console.warn('Vehicle front image upload failed:', error);
        }
      }

      if (formData.vehicle.backImage) {
        try {
          uploadResults.vehicleBack = await uploadFile(
            formData.vehicle.backImage.file,
            'vehicle_back'
          );
        } catch (error) {
          console.warn('Vehicle back image upload failed:', error);
        }
      }

      // Upload required documents
      try {
        uploadResults.licenseFront = await uploadFile(
          formData.documents.license.front!.file,
          'license_front'
        );
      } catch (error) {
        throw new Error(`License front upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      try {
        uploadResults.licenseBack = await uploadFile(
          formData.documents.license.back!.file,
          'license_back'
        );
      } catch (error) {
        throw new Error(`License back upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      try {
        uploadResults.registrationFront = await uploadFile(
          formData.documents.registration.front!.file,
          'registration_front'
        );
      } catch (error) {
        throw new Error(`Registration front upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      try {
        uploadResults.registrationBack = await uploadFile(
          formData.documents.registration.back!.file,
          'registration_back'
        );
      } catch (error) {
        throw new Error(`Registration back upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      try {
        uploadResults.nationalIdFront = await uploadFile(
          formData.documents.nationalId.front!.file,
          'national_id_front'
        );
      } catch (error) {
        throw new Error(`National ID front upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      try {
        uploadResults.nationalIdBack = await uploadFile(
          formData.documents.nationalId.back!.file,
          'national_id_back'
        );
      } catch (error) {
        throw new Error(`National ID back upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Hash password
      const hashedPassword = await hashPassword(formData.personal.password);

      // Prepare data for database
      const driverData = {
        personal: {
          firstName: formData.personal.firstName,
          lastName: formData.personal.lastName,
          email: formData.personal.email,
          password: hashedPassword,
          phoneNumber: formData.personal.phoneNumber,
          profilePictureUrl: uploadResults.profilePicture || null,
        },
        vehicle: {
          vehicleType: formData.vehicle.vehicleType,
          carName: formData.vehicle.carName,
          numberPlate: formData.vehicle.numberPlate,
          vehicleFrontUrl: uploadResults.vehicleFront || null,
          vehicleBackUrl: uploadResults.vehicleBack || null,
        },
        documents: {
          license: {
            expiry: formData.documents.license.expiry,
            frontUrl: uploadResults.licenseFront,
            backUrl: uploadResults.licenseBack,
          },
          registration: {
            expiry: formData.documents.registration.expiry,
            frontUrl: uploadResults.registrationFront,
            backUrl: uploadResults.registrationBack,
          },
          nationalId: {
            frontUrl: uploadResults.nationalIdFront,
            backUrl: uploadResults.nationalIdBack,
          },
        },
      };

      // Submit to registration API
      const response = await fetch('/api/drivers/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(driverData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Registration failed: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Registration failed');
      }

      // Reset form on successful submission
      resetForm();
      
      return result.driverId || result.id || 'success';
      
    } catch (err) {
      console.error('Submission error:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during registration';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DriverFormContext.Provider
      value={{
        formData,
        setPersonalData,
        setVehicleData,
        setDocumentsData,
        submitAllData,
        isLoading,
        error,
        resetForm,
      }}
    >
      {children}
    </DriverFormContext.Provider>
  );
}

export function useDriverForm() {
  const context = useContext(DriverFormContext);
  if (context === undefined) {
    throw new Error('useDriverForm must be used within a DriverFormProvider');
  }
  return context;
}