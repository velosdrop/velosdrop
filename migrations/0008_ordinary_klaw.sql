PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_delivery_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`customer_id` integer NOT NULL,
	`customer_username` text NOT NULL,
	`pickup_location` text NOT NULL,
	`dropoff_location` text NOT NULL,
	`fare` real NOT NULL,
	`distance` real NOT NULL,
	`package_details` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`assigned_driver_id` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`expires_at` text NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`assigned_driver_id`) REFERENCES `drivers`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_delivery_requests`("id", "customer_id", "customer_username", "pickup_location", "dropoff_location", "fare", "distance", "package_details", "status", "assigned_driver_id", "created_at", "expires_at") SELECT "id", "customer_id", "customer_username", "pickup_location", "dropoff_location", "fare", "distance", "package_details", "status", "assigned_driver_id", "created_at", "expires_at" FROM `delivery_requests`;--> statement-breakpoint
DROP TABLE `delivery_requests`;--> statement-breakpoint
ALTER TABLE `__new_delivery_requests` RENAME TO `delivery_requests`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_driver_ratings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`driver_id` integer NOT NULL,
	`customer_id` integer NOT NULL,
	`rating` integer NOT NULL,
	`comment` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`driver_id`) REFERENCES `drivers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_driver_ratings`("id", "driver_id", "customer_id", "rating", "comment", "created_at") SELECT "id", "driver_id", "customer_id", "rating", "comment", "created_at" FROM `driver_ratings`;--> statement-breakpoint
DROP TABLE `driver_ratings`;--> statement-breakpoint
ALTER TABLE `__new_driver_ratings` RENAME TO `driver_ratings`;--> statement-breakpoint
CREATE TABLE `__new_driver_responses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`request_id` integer NOT NULL,
	`driver_id` integer NOT NULL,
	`response` text NOT NULL,
	`responded_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`request_id`) REFERENCES `delivery_requests`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`driver_id`) REFERENCES `drivers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_driver_responses`("id", "request_id", "driver_id", "response", "responded_at") SELECT "id", "request_id", "driver_id", "response", "responded_at" FROM `driver_responses`;--> statement-breakpoint
DROP TABLE `driver_responses`;--> statement-breakpoint
ALTER TABLE `__new_driver_responses` RENAME TO `driver_responses`;--> statement-breakpoint
CREATE TABLE `__new_driver_transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`driver_id` integer NOT NULL,
	`amount` integer NOT NULL,
	`payment_intent_id` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`driver_id`) REFERENCES `drivers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_driver_transactions`("id", "driver_id", "amount", "payment_intent_id", "status", "created_at") SELECT "id", "driver_id", "amount", "payment_intent_id", "status", "created_at" FROM `driver_transactions`;--> statement-breakpoint
DROP TABLE `driver_transactions`;--> statement-breakpoint
ALTER TABLE `__new_driver_transactions` RENAME TO `driver_transactions`;