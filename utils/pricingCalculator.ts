// Comprehensive pricing calculator with vehicle-specific rates
export interface PricingFactors {
  distance: number; // in km
  vehicleType: 'motorcycle' | 'car' | 'truck';
  packageSize?: string; // 'small', 'medium', 'large'
  packageWeight?: number; // in kg
  urgency?: string; // 'standard', 'express', 'priority'
}

// Vehicle-specific pricing rates (per km in USD)
export const VEHICLE_RATES = {
  motorcycle: 0.60,
  car: 0.80,
  truck: 1.20
} as const;

// Additional factors multipliers
export const SIZE_MULTIPLIERS = {
  small: 1.0,
  medium: 1.2,
  large: 1.5
};

export const URGENCY_MULTIPLIERS = {
  standard: 1.0,
  express: 1.3,
  priority: 1.5
};

export const calculateFare = (factors: PricingFactors): number => {
  const baseRate = VEHICLE_RATES[factors.vehicleType];
  let total = factors.distance * baseRate;
  
  // Apply size multiplier if provided
  if (factors.packageSize) {
    total *= SIZE_MULTIPLIERS[factors.packageSize as keyof typeof SIZE_MULTIPLIERS] || 1;
  }
  
  // Apply weight surcharge (if over 10kg)
  if (factors.packageWeight && factors.packageWeight > 10) {
    total += (factors.packageWeight - 10) * 0.10; // $0.10 per extra kg
  }
  
  // Apply urgency multiplier if provided
  if (factors.urgency) {
    total *= URGENCY_MULTIPLIERS[factors.urgency as keyof typeof URGENCY_MULTIPLIERS] || 1;
  }
  
  // Apply minimum and maximum bounds
  const minFare = 2.00;
  const maxFare = 200.00;
  
  return Math.max(minFare, Math.min(maxFare, total));
};

// Helper to calculate fares for all vehicle types
export const calculateAllVehicleFares = (distance: number): Record<keyof typeof VEHICLE_RATES, number> => {
  return {
    motorcycle: calculateFare({ distance, vehicleType: 'motorcycle' }),
    car: calculateFare({ distance, vehicleType: 'car' }),
    truck: calculateFare({ distance, vehicleType: 'truck' })
  };
};

// Helper function to calculate distance between coordinates (Haversine formula)
export const calculateDistance = (
  coord1: [number, number], 
  coord2: [number, number]
): number => {
  const [lng1, lat1] = coord1;
  const [lng2, lat2] = coord2;
  
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in km
  
  return distance;
};

// Format currency
export const formatCurrency = (amount: number): string => {
  return `$${amount.toFixed(2)}`;
};

// Get vehicle icon
export const getVehicleIcon = (vehicleType: keyof typeof VEHICLE_RATES): string => {
  const icons = {
    motorcycle: '🏍️',
    car: '🚗',
    truck: '🚚'
  };
  return icons[vehicleType] || '🚗';
};

// Get vehicle display name
export const getVehicleDisplayName = (vehicleType: keyof typeof VEHICLE_RATES): string => {
  const names = {
    motorcycle: 'Motorcycle',
    car: 'Car',
    truck: 'Truck'
  };
  return names[vehicleType];
};