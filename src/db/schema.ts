//src/db/schema.ts
export type LocationData = {
  longitude: number;
  latitude: number;
} | null;

import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text, real } from 'drizzle-orm/sqlite-core';

export const customersTable = sqliteTable('customers', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }).notNull(),
  username: text('username').unique().notNull(),
  phoneNumber: text('phone_number').unique().notNull(),
  password: text('password').notNull(),
  profilePictureUrl: text('profile_picture_url'),
  
  // Authentication
  isVerified: integer('is_verified', { mode: 'boolean' }).default(false).notNull(),
  lastLogin: text('last_login').default(sql`CURRENT_TIMESTAMP`),
  
  // Location preferences
  homeAddress: text('home_address'),
  workAddress: text('work_address'),
  lastLocation: text('last_location').$type<LocationData>().default(null),
  // Separate columns for spatial queries
  latitude: real('latitude'),
  longitude: real('longitude'),
  
  // Status
  status: text('status').default('active').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const driversTable = sqliteTable('drivers', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }).notNull(),
  phoneNumber: text('phone_number').notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').unique().notNull(),
  password: text('password').notNull(),
  profilePictureUrl: text('profile_picture_url'),
  balance: integer('balance').default(0).notNull(),

  // Vehicle details
  vehicleType: text('vehicle_type').notNull(),
  carName: text('car_name').notNull(),
  numberPlate: text('number_plate').notNull(),

  // License details
  licenseExpiry: text('license_expiry').notNull(),

  // Registration details
  registrationExpiry: text('registration_expiry').notNull(),

  // Online status
  isOnline: integer('is_online', { mode: 'boolean' }).default(false).notNull(),
  lastLocation: text('last_location').$type<LocationData>().default(null),
  // Separate columns for spatial queries
  latitude: real('latitude'),
  longitude: real('longitude'),
  lastOnline: text('last_online').default(sql`CURRENT_TIMESTAMP`).notNull(),

  status: text('status').default('pending').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Delivery requests table
export const deliveryRequestsTable = sqliteTable('delivery_requests', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }).notNull(),
  customerId: integer('customer_id').notNull().references(() => customersTable.id, { onDelete: 'cascade' }),
  customerUsername: text('customer_username').notNull(),
  pickupLocation: text('pickup_location').notNull(),
  dropoffLocation: text('dropoff_location').notNull(),
  fare: real('fare').notNull(),
  distance: real('distance').notNull(),
  packageDetails: text('package_details'),
  recipientPhoneNumber: text('recipient_phone_number'),
  status: text('status').default('pending').notNull(), // pending, accepted, rejected, completed, expired
  assignedDriverId: integer('assigned_driver_id').references(() => driversTable.id), 
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  expiresAt: text('expires_at').notNull(), // 30-second timeout
});

// Driver responses table
export const driverResponsesTable = sqliteTable('driver_responses', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }).notNull(),
  requestId: integer('request_id').notNull().references(() => deliveryRequestsTable.id, { onDelete: 'cascade' }),
  driverId: integer('driver_id').notNull().references(() => driversTable.id, { onDelete: 'cascade' }),
  response: text('response').notNull(), // 'accepted', 'rejected'
  respondedAt: text('responded_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const driverTransactions = sqliteTable('driver_transactions', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }).notNull(),
  driver_id: integer('driver_id').notNull().references(() => driversTable.id, { onDelete: 'cascade' }),
  amount: integer('amount').notNull(),
  payment_intent_id: text('payment_intent_id').notNull(),
  status: text('status').notNull(),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const otpTable = sqliteTable('otps', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }).notNull(),
  phoneNumber: text('phone_number').notNull(),
  code: text('code').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  expiresAt: text('expires_at').notNull(),
});

// Table for driver ratings
export const driverRatingsTable = sqliteTable('driver_ratings', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }).notNull(),
  driverId: integer('driver_id').notNull().references(() => driversTable.id, { onDelete: 'cascade' }),
  customerId: integer('customer_id').notNull().references(() => customersTable.id, { onDelete: 'cascade' }),
  rating: integer('rating').notNull(), // 1-5 stars
  comment: text('comment'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type InsertCustomer = typeof customersTable.$inferInsert;
export type SelectCustomer = typeof customersTable.$inferSelect;
export type InsertDriver = typeof driversTable.$inferInsert;
export type SelectDriver = typeof driversTable.$inferSelect;
export type InsertOTP = typeof otpTable.$inferInsert;
export type SelectOTP = typeof otpTable.$inferSelect;
export type InsertDriverRating = typeof driverRatingsTable.$inferInsert;
export type SelectDriverRating = typeof driverRatingsTable.$inferSelect;
export type InsertDeliveryRequest = typeof deliveryRequestsTable.$inferInsert;
export type SelectDeliveryRequest = typeof deliveryRequestsTable.$inferSelect;
export type InsertDriverResponse = typeof driverResponsesTable.$inferInsert;
export type SelectDriverResponse = typeof driverResponsesTable.$inferSelect;

export interface Customer extends Omit<SelectCustomer, 'isVerified' | 'lastLocation'> {
  isVerified: boolean;
  lastLocation: LocationData;
}

export interface Driver extends Omit<SelectDriver, 'isOnline' | 'lastLocation'> {
  isOnline: boolean;
  lastLocation: { longitude: number; latitude: number } | null;
  profilePictureUrl: string;
}

export interface DeliveryRequest extends SelectDeliveryRequest {
  customerUsername: string;
}

export interface DriverResponse extends SelectDriverResponse {}