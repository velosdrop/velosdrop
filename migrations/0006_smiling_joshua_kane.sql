CREATE TABLE `driver_ratings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`driver_id` integer NOT NULL,
	`customer_id` integer NOT NULL,
	`rating` integer NOT NULL,
	`comment` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`driver_id`) REFERENCES `drivers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `customers` ADD `latitude` real;--> statement-breakpoint
ALTER TABLE `customers` ADD `longitude` real;--> statement-breakpoint
ALTER TABLE `drivers` ADD `latitude` real;--> statement-breakpoint
ALTER TABLE `drivers` ADD `longitude` real;