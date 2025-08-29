"use client";

import React, { createContext, useState, useContext, ReactNode } from 'react';

interface DeliveryLocation {
  address: string;
  coordinates: [number, number];
}

interface DeliveryData {
  pickup: DeliveryLocation;
  delivery: DeliveryLocation;
  distance?: number | null;
}

interface DeliveryContextType {
  deliveryData: DeliveryData | null;
  setDeliveryData: (data: DeliveryData | null) => void;
}

// Export the context
export const DeliveryContext = createContext<DeliveryContextType | undefined>(undefined);

export const DeliveryProvider = ({ children }: { children: ReactNode }) => {
  const [deliveryData, setDeliveryData] = useState<DeliveryData | null>(null);

  return (
    <DeliveryContext.Provider value={{ deliveryData, setDeliveryData }}>
      {children}
    </DeliveryContext.Provider>
  );
};

export const useDelivery = () => {
  const context = useContext(DeliveryContext);
  if (context === undefined) {
    throw new Error('useDelivery must be used within a DeliveryProvider');
  }
  return context;
};