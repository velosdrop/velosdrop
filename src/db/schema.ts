//src/db/schema.ts
export type LocationData = {
  longitude: number;
  latitude: number;
} | null;

import { sql, type InferInsertModel, type InferSelectModel } from 'drizzle-orm';
import { integer, sqliteTable, text, real } from 'drizzle-orm/sqlite-core';

export const adminsTable = sqliteTable('admins', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }).notNull(),
  username: text('username').unique().notNull(),
  password: text('password').notNull(), // This will store the hashed password
  role: text('role').default('admin').notNull(), // 'super_admin', 'admin', 'support'
  isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
  lastLogin: text('last_login'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});


export const customersTable = sqliteTable('customers', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }).notNull(),
  username: text('username').unique().notNull(),
  email: text('email'),
  googleId: text('google_id'),
  phoneNumber: text('phone_number'),
  authProvider: text('auth_provider').default('phone'),// Changed: Made optional (remove .notNull())
  password: text('password'), // Changed: Made optional (remove .notNull())
  profilePictureUrl: text('profile_picture_url'),
  isVerified: integer('is_verified', { mode: 'boolean' }).default(false).notNull(),
  lastLogin: text('last_login').default(sql`CURRENT_TIMESTAMP`),
  homeAddress: text('home_address'),
  workAddress: text('work_address'),
  lastLocation: text('last_location').$type<LocationData>().default(null),
  latitude: real('latitude'),
  longitude: real('longitude'),
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

  licenseFrontUrl: text('license_front_url'),
  licenseBackUrl: text('license_back_url'),
  registrationFrontUrl: text('registration_front_url'),
  registrationBackUrl: text('registration_back_url'),
  nationalIdFrontUrl: text('national_id_front_url'),
  nationalIdBackUrl: text('national_id_back_url'),
  vehicleFrontUrl: text('vehicle_front_url'),
  vehicleBackUrl: text('vehicle_back_url'),

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

//Delivery requests table
export const deliveryRequestsTable = sqliteTable('delivery_requests', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }).notNull(),
  customerId: integer('customer_id').notNull().references(() => customersTable.id, { onDelete: 'cascade' }),
  customerUsername: text('customer_username').notNull(),

  // OLD COLUMNS (keep for now - will be migrated and deleted later)
  pickupLocation: text('pickup_location'),
  dropoffLocation: text('dropoff_location'),

  // NEW COLUMNS (optional for backward compatibility with existing data)
  pickupAddress: text('pickup_address'), // REMOVED .notNull()
  pickupLatitude: real('pickup_latitude'), // REMOVED .notNull()
  pickupLongitude: real('pickup_longitude'), // REMOVED .notNull()

  dropoffAddress: text('dropoff_address'), // REMOVED .notNull()
  dropoffLatitude: real('dropoff_latitude'), // REMOVED .notNull()
  dropoffLongitude: real('dropoff_longitude'), // REMOVED .notNull()

  fare: real('fare').notNull(),
  distance: real('distance').notNull(),
  vehicleType: text('vehicle_type').notNull().default('car'),
  packageDetails: text('package_details'),
  recipientPhoneNumber: text('recipient_phone_number'),
  status: text('status').default('pending').notNull(),
  assignedDriverId: integer('assigned_driver_id').references(() => driversTable.id),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  expiresAt: text('expires_at').notNull(),

  // NEW FIELDS FOR DELIVERY COMPLETION FLOW
  driverArrivedAt: text('driver_arrived_at'), // When driver enters geofence
  deliveryCompletedAt: text('delivery_completed_at'), // When driver marks completed
  deliveryPhotoUrl: text('delivery_photo_url'), // Photo proof
  commissionTaken: integer('commission_taken', { mode: 'boolean' }).default(false),
  commissionAmount: real('commission_amount').default(0), // Store 13.5% of fare
  customerConfirmedAt: text('customer_confirmed_at'), // When customer confirms
  autoConfirmedAt: text('auto_confirmed_at'), // If auto-confirmed after timeout
  deliveryStatus: text('delivery_status').default('pending').notNull(),
  // Values: 'pending', 'en_route', 'arrived', 'awaiting_confirmation', 'completed', 'paid'

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

// Payment references table for tracking payments
export const paymentReferencesTable = sqliteTable('payment_references', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }).notNull(),
  driverId: integer('driver_id').notNull().references(() => driversTable.id, { onDelete: 'cascade' }),
  reference: text('reference').unique().notNull(),
  amount: integer('amount').notNull(), // in cents
  status: text('status').default('pending').notNull(), // pending, completed, failed
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),

  //for mastercard and visa
  paymentMethod: text('payment_method').default('ecocash'), // 'ecocash', 'card'
  gatewayReference: text('gateway_reference'), // PesaPay's reference number
  pollUrl: text('poll_url'), // For mobile money
  redirectUrl: text('redirect_url'), // For card payments
  currency: text('currency').default('USD'), // Currency code
  paymentReason: text('payment_reason'), // Payment description
});

// Admin wallet adjustments table
export const adminWalletAdjustments = sqliteTable('admin_wallet_adjustments', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }).notNull(),
  adminId: integer('admin_id').notNull().references(() => adminsTable.id, { onDelete: 'cascade' }),
  driverId: integer('driver_id').notNull().references(() => driversTable.id, { onDelete: 'cascade' }),
  amount: integer('amount').notNull(), // in cents (positive for add, negative for deduct)
  type: text('type').notNull(), // 'add_funds', 'deduct_funds', 'set_balance'
  reason: text('reason').notNull(), // 'reward', 'refund', 'correction', 'penalty', 'other'
  note: text('note'), // Optional detailed explanation
  previousBalance: integer('previous_balance').notNull(), // Balance before adjustment
  newBalance: integer('new_balance').notNull(), // Balance after adjustment
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

//The messages table
export const messagesTable = sqliteTable('messages', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }).notNull(),
  deliveryId: integer('delivery_id').notNull().references(() => deliveryRequestsTable.id, { onDelete: 'cascade' }),
  senderType: text('sender_type').notNull(), // 'driver', 'customer', 'system'
  senderId: integer('sender_id').notNull(), // driverId or customerId
  messageType: text('message_type').default('text').notNull(), // 'text', 'image', 'status_update', 'location'
  content: text('content').notNull(), // Text message or image URL
  imageUrl: text('image_url'), // Optional: for image messages
  metadata: text('metadata').$type<Record<string, any>>(), // Additional data like location coords
  isRead: integer('is_read', { mode: 'boolean' }).default(false).notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Driver commission deductions table
export const driverCommissionDeductions = sqliteTable('driver_commission_deductions', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }).notNull(),
  driver_id: integer('driver_id').notNull().references(() => driversTable.id, { onDelete: 'cascade' }),
  delivery_id: integer('delivery_id').notNull().references(() => deliveryRequestsTable.id, { onDelete: 'cascade' }),
  fare_amount: real('fare_amount').notNull(),
  commission_percentage: real('commission_percentage').default(0.09).notNull(),
  commission_amount: real('commission_amount').notNull(),
  driver_balance_before: integer('driver_balance_before').notNull(),
  driver_balance_after: integer('driver_balance_after').notNull(),
  status: text('status').default('completed').notNull(),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Platform earnings table (to track commission earnings)
export const platformEarnings = sqliteTable('platform_earnings', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }).notNull(),
  delivery_id: integer('delivery_id').notNull().references(() => deliveryRequestsTable.id, { onDelete: 'cascade' }),
  commission_amount: real('commission_amount').notNull(),
  driver_id: integer('driver_id').notNull().references(() => driversTable.id, { onDelete: 'cascade' }),
  customer_id: integer('customer_id').notNull().references(() => customersTable.id, { onDelete: 'cascade' }),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const merchantsTable = sqliteTable('merchants', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }).notNull(),

  // Business Details
  businessName: text('business_name').notNull(),
  ownerName: text('owner_name').notNull(),
  city: text('city').notNull(),
  address: text('address').notNull(),
  email: text('email').unique().notNull(),
  phoneNumber: text('phone_number').notNull(),
  password: text('password').notNull(),
  deliveryType: text('delivery_type').default('platform').notNull(), 
  deliveryRequestId: integer('delivery_request_id').references(() => deliveryRequestsTable.id),

  // Optional Fields
  logoUrl: text('logo_url'),
  coverImageUrl: text('cover_image_url'),
  description: text('description'),
  businessType: text('business_type'), // restaurant, retail, grocery, etc.

  // Location
  latitude: real('latitude'),
  longitude: real('longitude'),
  lastLocation: text('last_location').$type<LocationData>().default(null),

  // Business Hours (JSON object) - FIXED HERE
  businessHours: text('business_hours', { mode: 'json' }).$type<{
    monday?: { open: string; close: string };
    tuesday?: { open: string; close: string };
    wednesday?: { open: string; close: string };
    thursday?: { open: string; close: string };
    friday?: { open: string; close: string };
    saturday?: { open: string; close: string };
    sunday?: { open: string; close: string };
  } | null>().default(null),

  // Settings
  isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
  isOpen: integer('is_open', { mode: 'boolean' }).default(true).notNull(),
  status: text('status').default('pending').notNull(), // pending, approved, suspended

  // Delivery Settings
  deliveryRadius: integer('delivery_radius').default(5), // in km
  minimumOrder: real('minimum_order').default(0),
  deliveryFee: real('delivery_fee').default(0),
  commission: real('commission').default(15), // default 15%

  // Payment Details (for payouts)
  bankName: text('bank_name'),
  bankAccountName: text('bank_account_name'),
  bankAccountNumber: text('bank_account_number'),

  // Stats
  totalOrders: integer('total_orders').default(0).notNull(),
  totalRevenue: real('total_revenue').default(0).notNull(),
  averageRating: real('average_rating').default(0),

  // Metadata
  lastLogin: text('last_login'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const merchantProductsTable = sqliteTable('merchant_products', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }).notNull(),
  merchantId: integer('merchant_id').notNull().references(() => merchantsTable.id, { onDelete: 'cascade' }),
  
  // Basic Info
  name: text('name').notNull(),
  description: text('description'),
  price: real('price').notNull(),
  category: text('category'), // e.g. "Burgers", "Pizza", "Drinks"
  
  // Images
  imageUrl: text('image_url'), // Main product image
  additionalImages: text('additional_images', { mode: 'json' }).$type<string[]>().default([]),
  
  // Status
  isAvailable: integer('is_available', { mode: 'boolean' }).default(true).notNull(),
  isPopular: integer('is_popular', { mode: 'boolean' }).default(false),
  
  // Options (for variations like size, extras)
  options: text('options', { mode: 'json' }).$type<Array<{
    name: string;
    price?: number;
    maxChoices?: number;
    choices?: Array<{ name: string; price?: number }>;
  }>>().default([]),
  
  // Inventory
  preparationTime: integer('preparation_time'), // in minutes
  stock: integer('stock').default(-1), // -1 means unlimited
  
  // Metadata
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Merchant Categories Table
export const merchantCategoriesTable = sqliteTable('merchant_categories', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }).notNull(),
  merchantId: integer('merchant_id').notNull().references(() => merchantsTable.id, { onDelete: 'cascade' }),
  
  name: text('name').notNull(),
  description: text('description'),
  imageUrl: text('image_url'),
  displayOrder: integer('display_order').default(0),
  
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Merchant Orders Table
export const merchantOrdersTable = sqliteTable('merchant_orders', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }).notNull(),
  merchantId: integer('merchant_id').notNull().references(() => merchantsTable.id, { onDelete: 'cascade' }),
  customerId: integer('customer_id').references(() => customersTable.id),
  driverId: integer('driver_id').references(() => driversTable.id),
  
  orderNumber: text('order_number').unique().notNull(),
  items: text('items', { mode: 'json' }).$type<Array<{
    productId: number;
    name: string;
    price: number;
    quantity: number;
    notes?: string;
    options?: Array<{ name: string; choice: string; price?: number }>;
  }>>().notNull(),
  
  subtotal: real('subtotal').notNull(),
  deliveryFee: real('delivery_fee').notNull(),
  totalAmount: real('total_amount').notNull(),
  commission: real('commission').notNull(),
  merchantPayout: real('merchant_payout').notNull(),
  
  paymentMethod: text('payment_method').default('online'), // online, cash_on_delivery
  paymentStatus: text('payment_status').default('pending'), // pending, paid, failed
  
  deliveryAddress: text('delivery_address').notNull(),
  deliveryLatitude: real('delivery_latitude'),
  deliveryLongitude: real('delivery_longitude'),
  customerPhone: text('customer_phone'),
  customerName: text('customer_name'),
  
  status: text('status').default('pending').notNull(), // pending, confirmed, preparing, ready, picked_up, delivered, cancelled
  statusHistory: text('status_history', { mode: 'json' }).$type<Array<{
    status: string;
    timestamp: string;
    note?: string;
  }>>().default([]),
  
  customerNotes: text('customer_notes'),
  estimatedPreparationTime: integer('estimated_preparation_time'),
  actualPreparationTime: integer('actual_preparation_time'),
  
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  confirmedAt: text('confirmed_at'),
  readyAt: text('ready_at'),
  pickedUpAt: text('picked_up_at'),
  deliveredAt: text('delivered_at'),
  cancelledAt: text('cancelled_at'),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});


export type InsertAdminWalletAdjustment = typeof adminWalletAdjustments.$inferInsert;
export type SelectAdminWalletAdjustment = typeof adminWalletAdjustments.$inferSelect;
export type InsertAdmin = typeof adminsTable.$inferInsert;
export type SelectAdmin = typeof adminsTable.$inferSelect;
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
export type InsertPaymentReference = typeof paymentReferencesTable.$inferInsert;
export type SelectPaymentReference = typeof paymentReferencesTable.$inferSelect;
export type InsertMessage = typeof messagesTable.$inferInsert;
export type SelectMessage = typeof messagesTable.$inferSelect;
export type Merchant = InferSelectModel<typeof merchantsTable>;
export type NewMerchant = InferInsertModel<typeof merchantsTable>;
export type MerchantProduct = InferSelectModel<typeof merchantProductsTable>;
export type MerchantCategory = InferSelectModel<typeof merchantCategoriesTable>;
export type MerchantOrder = InferSelectModel<typeof merchantOrdersTable>;

export type NewMerchantProduct = InferInsertModel<typeof merchantProductsTable>;
export type NewMerchantCategory = InferInsertModel<typeof merchantCategoriesTable>;
export type NewMerchantOrder = InferInsertModel<typeof merchantOrdersTable>;


export interface Admin extends Omit<SelectAdmin, 'isActive'> {
  isActive: boolean;
}


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

export interface DriverResponse extends SelectDriverResponse { }