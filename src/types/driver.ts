// src/types/driver.ts
import { SelectDriver } from '@/src/db/schema';

export interface DriverWithStats extends SelectDriver {
  totalDeliveries?: number;
  averageRating?: number;
  totalEarnings?: number;
  completedDeliveries?: number;
  onTimeRate?: number;
}