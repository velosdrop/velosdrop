/**
 * Commission-related utility functions for driver wallet operations
 * Handles balance checks, commission calculations, and formatting
 */

export interface BalanceCheckResult {
    hasSufficientBalance: boolean;
    currentBalance: number;          // In dollars
    requiredCommission: number;      // In dollars
    shortfall?: number;             // In dollars (if insufficient)
    message?: string;
  }
  
  export interface CommissionCalculation {
    fare: number;                    // Original fare amount in dollars
    commissionPercentage: number;    // e.g., 0.135 for 13.5%
    commissionAmount: number;        // Calculated commission in dollars
    netEarnings: number;             // Fare minus commission in dollars
  }
  
  export interface DriverCommissionDeduction {
    driverId: number;
    deliveryId: number;
    fareAmount: number;
    commissionPercentage: number;
    commissionAmount: number;
    balanceBefore: number;           // In cents (for database)
    balanceAfter: number;            // In cents (for database)
    timestamp: string;
  }
  
  /**
   * Check if driver has sufficient balance for commission deduction
   * Makes an API call to validate balance before proceeding
   */
  export async function checkDriverBalanceForCommission(
    driverId: number, 
    fare: number, 
    commissionPercentage: number = 0.09 //now at 9% commision
  ): Promise<BalanceCheckResult> {
    try {
      // Validate inputs
      if (!driverId || driverId <= 0) {
        throw new Error('Invalid driver ID');
      }
      
      if (fare <= 0) {
        throw new Error('Invalid fare amount');
      }
      
      if (commissionPercentage <= 0 || commissionPercentage > 1) {
        throw new Error('Invalid commission percentage');
      }
      
      console.log('🔍 Checking driver balance for commission:', {
        driverId,
        fare,
        commissionPercentage: `${commissionPercentage * 100}%`
      });
      
      const response = await fetch(`/api/driver/${driverId}/balance-check`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({ 
          fare, 
          commissionPercentage,
          timestamp: new Date().toISOString()
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Balance check failed: ${response.status} ${errorText}`);
      }
      
      const result: BalanceCheckResult = await response.json();
      
      // Validate API response structure
      if (!result.hasSufficientBalance && result.shortfall === undefined) {
        result.shortfall = result.requiredCommission - result.currentBalance;
      }
      
      // Add user-friendly message
      if (result.hasSufficientBalance) {
        result.message = `✅ Sufficient balance: $${result.currentBalance.toFixed(2)} available for $${result.requiredCommission.toFixed(2)} commission`;
      } else {
        result.message = `❌ Insufficient balance: Need $${result.requiredCommission.toFixed(2)} but only have $${result.currentBalance.toFixed(2)}`;
      }
      
      console.log('💰 Balance check result:', result);
      
      return result;
      
    } catch (error) {
      console.error('❌ Error checking driver balance:', error);
      
      // Calculate required commission as fallback
      const calculation = calculateCommission(fare, commissionPercentage);
      const requiredCommission = calculation.commissionAmount; // FIXED: Use commissionAmount instead of whole object
      
      return {
        hasSufficientBalance: false,
        currentBalance: 0,
        requiredCommission,
        shortfall: requiredCommission,
        message: `Error checking balance: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  /**
   * Calculate commission amount from fare
   */
  export function calculateCommission(
    fare: number, 
    commissionPercentage: number = 0.135
  ): CommissionCalculation {
    if (fare <= 0) {
      throw new Error('Fare must be greater than 0');
    }
    
    if (commissionPercentage <= 0 || commissionPercentage > 1) {
      throw new Error('Commission percentage must be between 0 and 1');
    }
    
    const commissionAmount = fare * commissionPercentage;
    const netEarnings = fare - commissionAmount;
    
    return {
      fare,
      commissionPercentage,
      commissionAmount,
      netEarnings
    };
  }
  
  /**
   * Format commission message for display
   */
  export function formatCommissionMessage(
    fare: number, 
    commission: number, 
    newBalance: number
  ): string {
    if (fare <= 0) {
      return 'Invalid fare amount';
    }
    
    const commissionPercentage = (commission / fare * 100).toFixed(1);
    const commissionFormatted = commission.toFixed(2);
    const newBalanceFormatted = newBalance.toFixed(2);
    
    return `Commission: $${commissionFormatted} (${commissionPercentage}%) deducted. New balance: $${newBalanceFormatted}`;
  }
  
  /**
   * Format commission breakdown for detailed display
   */
  export function formatCommissionBreakdown(
    fare: number,
    commissionPercentage: number = 0.135
  ): string {
    const calculation = calculateCommission(fare, commissionPercentage);
    
    return `Fare: $${calculation.fare.toFixed(2)}
  Commission (${(calculation.commissionPercentage * 100).toFixed(1)}%): $${calculation.commissionAmount.toFixed(2)}
  Driver Earnings: $${calculation.netEarnings.toFixed(2)}`;
  }
  
  /**
   * Check if commission has already been taken for a delivery
   */
  export async function checkCommissionAlreadyTaken(
    deliveryId: number
  ): Promise<boolean> {
    try {
      const response = await fetch(`/api/delivery/${deliveryId}/commission-status`);
      
      if (!response.ok) {
        throw new Error(`Failed to check commission status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.commissionTaken === true;
      
    } catch (error) {
      console.error('Error checking commission status:', error);
      return false;
    }
  }
  
  /**
   * Get driver's current balance directly from database
   * (Useful for real-time updates without API call)
   */
  export async function getDriverBalanceDirect(
    driverId: number
  ): Promise<number> {
    try {
      // This would typically use your database client
      // For now, we'll use the API endpoint
      const response = await fetch(`/api/driver/${driverId}/balance`);
      
      if (!response.ok) {
        throw new Error(`Failed to get driver balance: ${response.status}`);
      }
      
      const data = await response.json();
      return data.balance; // Assuming API returns { balance: number }
      
    } catch (error) {
      console.error('Error getting driver balance:', error);
      return 0;
    }
  }
  
  /**
   * Validate if driver can complete delivery (balance + status check)
   */
  export async function validateDeliveryCompletion(
    driverId: number,
    deliveryId: number,
    fare: number
  ): Promise<{
    canComplete: boolean;
    reasons: string[];
    balanceCheck?: BalanceCheckResult;
    commissionAlreadyTaken?: boolean;
  }> {
    const reasons: string[] = [];
    
    try {
      // Check if commission already taken
      const commissionTaken = await checkCommissionAlreadyTaken(deliveryId);
      
      if (commissionTaken) {
        reasons.push('Commission already deducted for this delivery');
        return {
          canComplete: false,
          reasons,
          commissionAlreadyTaken: true
        };
      }
      
      // Check driver balance
      const balanceCheck = await checkDriverBalanceForCommission(driverId, fare);
      
      if (!balanceCheck.hasSufficientBalance) {
        reasons.push(`Insufficient balance: Shortfall of $${balanceCheck.shortfall?.toFixed(2) || 'unknown'}`);
      }
      
      // Add any additional validation checks here
      // e.g., delivery status, driver status, etc.
      
      const canComplete = balanceCheck.hasSufficientBalance && !commissionTaken;
      
      if (canComplete) {
        reasons.push('✅ All checks passed. Ready to complete delivery.');
      }
      
      return {
        canComplete,
        reasons,
        balanceCheck,
        commissionAlreadyTaken: commissionTaken
      };
      
    } catch (error) {
      console.error('Error validating delivery completion:', error);
      reasons.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return {
        canComplete: false,
        reasons
      };
    }
  }
  
  /**
   * Create a commission deduction record
   */
  export function createCommissionDeductionRecord(
    driverId: number,
    deliveryId: number,
    fare: number,
    currentBalanceCents: number,
    commissionPercentage: number = 0.135
  ): DriverCommissionDeduction {
    const commissionAmount = fare * commissionPercentage;
    const commissionCents = Math.round(commissionAmount * 100);
    const newBalanceCents = currentBalanceCents - commissionCents;
    
    return {
      driverId,
      deliveryId,
      fareAmount: fare,
      commissionPercentage,
      commissionAmount,
      balanceBefore: currentBalanceCents,
      balanceAfter: newBalanceCents,
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Generate a unique commission transaction ID
   */
  export function generateCommissionTransactionId(
    deliveryId: number,
    driverId: number
  ): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `commission_${deliveryId}_${driverId}_${timestamp}_${random}`;
  }
  
  /**
   * Parse commission transaction ID to extract details
   */
  export function parseCommissionTransactionId(
    transactionId: string
  ): { deliveryId?: number; driverId?: number; timestamp?: number } {
    try {
      const parts = transactionId.split('_');
      if (parts[0] !== 'commission' || parts.length < 4) {
        return {};
      }
      
      return {
        deliveryId: parseInt(parts[1]),
        driverId: parseInt(parts[2]),
        timestamp: parseInt(parts[3])
      };
    } catch (error) {
      console.error('Error parsing transaction ID:', error);
      return {};
    }
  }