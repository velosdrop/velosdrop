// types/paynow.d.ts
declare module 'paynow' {
    export class Paynow {
      constructor(integrationId: string, integrationKey: string, resultUrl?: string, returnUrl?: string);
      resultUrl: string;
      returnUrl: string;
      createPayment(reference: string, authEmail?: string): Payment;
      send(payment: Payment): Promise<InitResponse>;
      sendMobile(payment: Payment, phone: string, method: string): Promise<InitResponse>;
      pollTransaction(pollUrl: string): Promise<StatusResponse>;
    }
  
    export class Payment {
      add(item: string, amount: number): void;
      mobile(phone: string, method: string): void;
    }
  
    export interface InitResponse {
      success: boolean;
      redirectUrl?: string;
      pollUrl: string;
      instructions?: string;
      error?: string;
    }
  
    export interface StatusResponse {
      paid(): boolean;
      // Add other properties that might exist
      status?: string;
      amount?: number;
      reference?: string;
      [key: string]: any; // Allow any additional properties
    }
  }