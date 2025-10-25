CREATE TABLE `ecocash_transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`driver_id` integer NOT NULL,
	`amount` integer NOT NULL,
	`phone_number` text NOT NULL,
	`reference` text NOT NULL,
	`poll_url` text NOT NULL,
	`status` text NOT NULL,
	`instructions` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`driver_id`) REFERENCES `drivers`(`id`) ON UPDATE no action ON DELETE cascade
);
