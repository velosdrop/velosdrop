// context/UserContext.tsx
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Customer {
  id: number;
  username: string;
  phoneNumber: string;
  profilePictureUrl?: string;
}

interface UserContextType {
  customer: Customer | null;
  setCustomer: (customer: Customer | null) => void;
  clearUser: () => void;
  updateProfilePicture: (url: string) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [customer, setCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    // Check if user data exists in localStorage on component mount
    const storedCustomer = localStorage.getItem('customerData');
    if (storedCustomer) {
      setCustomer(JSON.parse(storedCustomer));
    }
  }, []);

  const updateCustomer = (newCustomer: Customer | null) => {
    setCustomer(newCustomer);
    if (newCustomer) {
      localStorage.setItem('customerData', JSON.stringify(newCustomer));
    } else {
      localStorage.removeItem('customerData');
    }
  };

  const clearUser = () => {
    setCustomer(null);
    localStorage.removeItem('customerData');
  };

  const updateProfilePicture = async (url: string) => {
    if (!customer) return;
    
    try {
      // Update in database
      const response = await fetch('/api/customer/update-profile-picture', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: customer.id,
          profilePictureUrl: url
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Update local state and storage
        const updatedCustomer = { ...customer, profilePictureUrl: url };
        updateCustomer(updatedCustomer);
      } else {
        console.error('Failed to update profile picture in database');
      }
    } catch (error) {
      console.error('Error updating profile picture:', error);
    }
  };

  return (
    <UserContext.Provider value={{ 
      customer, 
      setCustomer: updateCustomer, 
      clearUser,
      updateProfilePicture 
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};