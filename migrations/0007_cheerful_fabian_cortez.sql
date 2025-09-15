CREATE TABLE `delivery_requests` (
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
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assigned_driver_id`) REFERENCES `drivers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `driver_responses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`request_id` integer NOT NULL,
	`driver_id` integer NOT NULL,
	`response` text NOT NULL,
	`responded_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`request_id`) REFERENCES `delivery_requests`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`driver_id`) REFERENCES `drivers`(`id`) ON UPDATE no action ON DELETE no action
);
