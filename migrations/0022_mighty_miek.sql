CREATE TABLE `driver_commission_deductions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`driver_id` integer NOT NULL,
	`delivery_id` integer NOT NULL,
	`fare_amount` real NOT NULL,
	`commission_percentage` real DEFAULT 0.135 NOT NULL,
	`commission_amount` real NOT NULL,
	`driver_balance_before` integer NOT NULL,
	`driver_balance_after` integer NOT NULL,
	`status` text DEFAULT 'completed' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`driver_id`) REFERENCES `drivers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`delivery_id`) REFERENCES `delivery_requests`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `platform_earnings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`delivery_id` integer NOT NULL,
	`commission_amount` real NOT NULL,
	`driver_id` integer NOT NULL,
	`customer_id` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`delivery_id`) REFERENCES `delivery_requests`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`driver_id`) REFERENCES `drivers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE cascade
);
