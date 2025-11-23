CREATE TABLE `admin_wallet_adjustments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`admin_id` integer NOT NULL,
	`driver_id` integer NOT NULL,
	`amount` integer NOT NULL,
	`type` text NOT NULL,
	`reason` text NOT NULL,
	`note` text,
	`previous_balance` integer NOT NULL,
	`new_balance` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`admin_id`) REFERENCES `admins`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`driver_id`) REFERENCES `drivers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `delivery_requests` DROP COLUMN `updated_at`;