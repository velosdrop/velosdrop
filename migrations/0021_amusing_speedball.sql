DROP INDEX "admins_username_unique";--> statement-breakpoint
DROP INDEX "customers_username_unique";--> statement-breakpoint
DROP INDEX "customers_phone_number_unique";--> statement-breakpoint
DROP INDEX "drivers_email_unique";--> statement-breakpoint
DROP INDEX "payment_references_reference_unique";--> statement-breakpoint
ALTER TABLE `delivery_requests` ALTER COLUMN "pickup_address" TO "pickup_address" text;--> statement-breakpoint
CREATE UNIQUE INDEX `admins_username_unique` ON `admins` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `customers_username_unique` ON `customers` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `customers_phone_number_unique` ON `customers` (`phone_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `drivers_email_unique` ON `drivers` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `payment_references_reference_unique` ON `payment_references` (`reference`);--> statement-breakpoint
ALTER TABLE `delivery_requests` ALTER COLUMN "pickup_latitude" TO "pickup_latitude" real;--> statement-breakpoint
ALTER TABLE `delivery_requests` ALTER COLUMN "pickup_longitude" TO "pickup_longitude" real;--> statement-breakpoint
ALTER TABLE `delivery_requests` ALTER COLUMN "dropoff_address" TO "dropoff_address" text;--> statement-breakpoint
ALTER TABLE `delivery_requests` ALTER COLUMN "dropoff_latitude" TO "dropoff_latitude" real;--> statement-breakpoint
ALTER TABLE `delivery_requests` ALTER COLUMN "dropoff_longitude" TO "dropoff_longitude" real;--> statement-breakpoint
ALTER TABLE `delivery_requests` ADD `pickup_location` text;--> statement-breakpoint
ALTER TABLE `delivery_requests` ADD `dropoff_location` text;--> statement-breakpoint
ALTER TABLE `delivery_requests` ADD `driver_arrived_at` text;--> statement-breakpoint
ALTER TABLE `delivery_requests` ADD `delivery_completed_at` text;--> statement-breakpoint
ALTER TABLE `delivery_requests` ADD `delivery_photo_url` text;--> statement-breakpoint
ALTER TABLE `delivery_requests` ADD `commission_taken` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `delivery_requests` ADD `commission_amount` real DEFAULT 0;--> statement-breakpoint
ALTER TABLE `delivery_requests` ADD `customer_confirmed_at` text;--> statement-breakpoint
ALTER TABLE `delivery_requests` ADD `auto_confirmed_at` text;--> statement-breakpoint
ALTER TABLE `delivery_requests` ADD `delivery_status` text DEFAULT 'pending' NOT NULL;