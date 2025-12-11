// /types/commission.ts
export interface CommissionConfig {
    percentage: number;
    minimumCommission?: number;
    maximumCommission?: number;
    currency: string;
  }
  
  export interface DriverWallet {
    driverId: number;
    currentBalance: number; // in cents
    pendingBalance: number; // in cents
    lastUpdated: string;
    currency: string;
  }
  
  export interface CommissionTransaction {
    id: string;
    driverId: number;
    deliveryId: number;
    amount: number; // in cents (negative for deduction)
    type: 'commission' | 'topup' | 'refund' | 'payout';
    status: 'pending' | 'completed' | 'failed' | 'reversed';
    description: string;
    metadata?: Record<string, any>;
    createdAt: string;
    updatedAt: string;
  }
  
  export interface CommissionReport {
    period: {
      start: string;
      end: string;
    };
    totalCommission: number;
    totalDeliveries: number;
    averageCommission: number;
    driverBreakdown: Array<{
      driverId: number;
      driverName: string;
      totalCommission: number;
      deliveryCount: number;
    }>;
  }