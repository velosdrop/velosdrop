// context/UserContext.tsx
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Customer {
  username: string;
  phoneNumber: string;
  profilePictureUrl?: string;
}

interface UserContextType {
  customer: Customer | null;
  setCustomer: (customer: Customer | null) => void;
  clearUser: () => void; // Add this
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

  // Add clearUser function
  const clearUser = () => {
    setCustomer(null);
    localStorage.removeItem('customerData');
  };

  return (
    <UserContext.Provider value={{ customer, setCustomer, clearUser }}>
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