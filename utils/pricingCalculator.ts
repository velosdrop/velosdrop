// utils/pricingCalculator.ts
export interface PricingFactors {
    distance: number; // in km
    packageSize?: string; // 'small', 'medium', 'large'
    packageWeight?: number; // in kg
    urgency?: string; // 'standard', 'express', 'priority'
    routeComplexity?: number; // 1-5 scale
  }
  
  export const calculateRecommendedFare = (factors: PricingFactors): number => {
    // Charge only 95 cents per km as requested
    const distanceRate = factors.distance * 0.95;
    
    // Calculate total fare (only distance-based)
    const totalFare = distanceRate;
    
    // Apply minimum and maximum bounds
    return Math.max(2.00, Math.min(100.00, totalFare));
  };
  
  // Helper function to calculate distance between coordinates (keep this unchanged)
  export const calculateDistance = (
    coord1: [number, number], 
    coord2: [number, number]
  ): number => {
    const [lng1, lat1] = coord1;
    const [lng2, lat2] = coord2;
    
    // Haversine formula for accurate distance calculation
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