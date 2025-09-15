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
	FOREIGN KEY (`assigned_driver_id`) REFERENCES `drivers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_delivery_requests`("id", "customer_id", "customer_username", "pickup_location", "dropoff_location", "fare", "distance", "package_details", "status", "assigned_driver_id", "created_at", "expires_at") SELECT "id", "customer_id", "customer_username", "pickup_location", "dropoff_location", "fare", "distance", "package_details", "status", "assigned_driver_id", "created_at", "expires_at" FROM `delivery_requests`;--> statement-breakpoint
DROP TABLE `delivery_requests`;--> statement-breakpoint
ALTER TABLE `__new_delivery_requests` RENAME TO `delivery_requests`;--> statement-breakpoint
PRAGMA foreign_keys=ON;