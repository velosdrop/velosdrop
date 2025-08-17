'use client';

import { createContext, useState, useContext } from 'react';
import { db } from "@/src/db";
import { driversTable } from '@/src/db/schema';
import { eq } from 'drizzle-orm';

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

interface DriverDBData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phoneNumber: string;
  vehicleType: string;
  carName: string;
  numberPlate: string;
  licenseExpiry: string;
  registrationExpiry: string;
  status: string;
  profilePictureUrl?: string;
}

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

  const uploadFile = async (file: File, path: string): Promise<string> => {
    // In a real app, implement actual file upload logic here
    console.log(`Uploading file to ${path}`);
    await new Promise(resolve => setTimeout(resolve, 500));
    return `https://example.com/${path}/${file.name}`;
  };

  const submitAllData = async (): Promise<string> => {
    setIsLoading(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.personal.phoneNumber) {
        throw new Error('Phone number is required');
      }

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

      // Upload files (if they exist)
      const uploadPromises = [];
      
      if (formData.personal.profilePicture) {
        uploadPromises.push(
          uploadFile(formData.personal.profilePicture.file, `drivers/${formData.personal.email}/profilePicture`)
            .then(url => ({ field: 'personal.profilePicture', url }))
        );
      }

      // Add other file uploads as needed...
      const uploadResults = await Promise.all(uploadPromises);

      // Prepare data for database with proper typing
      const driverData: DriverDBData = {
        firstName: formData.personal.firstName,
        lastName: formData.personal.lastName,
        email: formData.personal.email,
        password: formData.personal.password,
        phoneNumber: formData.personal.phoneNumber,
        vehicleType: formData.vehicle.vehicleType,
        carName: formData.vehicle.carName,
        numberPlate: formData.vehicle.numberPlate,
        licenseExpiry: formData.documents.license.expiry,
        registrationExpiry: formData.documents.registration.expiry,
        status: 'pending',
      };

      // Add profile picture URL if available
      if (uploadResults.length > 0 && uploadResults[0].url) {
        driverData.profilePictureUrl = uploadResults[0].url;
      }

      // Insert into database
      const result = await db.insert(driversTable)
        .values(driverData)
        .returning({ id: driversTable.id });

      if (!result[0]?.id) {
        throw new Error('Failed to create driver record');
      }

      resetForm();
      return result[0].id.toString();
    } catch (err) {
      console.error('Submission error:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
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