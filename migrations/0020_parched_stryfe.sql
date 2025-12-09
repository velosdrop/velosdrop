ALTER TABLE `delivery_requests` ADD `pickup_address` text NOT NULL;--> statement-breakpoint
ALTER TABLE `delivery_requests` ADD `pickup_latitude` real NOT NULL;--> statement-breakpoint
ALTER TABLE `delivery_requests` ADD `pickup_longitude` real NOT NULL;--> statement-breakpoint
ALTER TABLE `delivery_requests` ADD `dropoff_address` text NOT NULL;--> statement-breakpoint
ALTER TABLE `delivery_requests` ADD `dropoff_latitude` real NOT NULL;--> statement-breakpoint
ALTER TABLE `delivery_requests` ADD `dropoff_longitude` real NOT NULL;--> statement-breakpoint
ALTER TABLE `delivery_requests` DROP COLUMN `pickup_location`;--> statement-breakpoint
ALTER TABLE `delivery_requests` DROP COLUMN `dropoff_location`;