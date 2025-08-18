CREATE TABLE `otps` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`phone_number` text NOT NULL,
	`code` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`expires_at` text NOT NULL
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_customers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`phone_number` text NOT NULL,
	`password` text NOT NULL,
	`profile_picture_url` text,
	`is_verified` integer DEFAULT false NOT NULL,
	`last_login` text DEFAULT CURRENT_TIMESTAMP,
	`home_address` text,
	`work_address` text,
	`last_location` text DEFAULT 'null',
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_customers`("id", "username", "phone_number", "password", "profile_picture_url", "is_verified", "last_login", "home_address", "work_address", "last_location", "status", "created_at", "updated_at") SELECT "id", "username", "phone_number", "password", "profile_picture_url", "is_verified", "last_login", "home_address", "work_address", "last_location", "status", "created_at", "updated_at" FROM `customers`;--> statement-breakpoint
DROP TABLE `customers`;--> statement-breakpoint
ALTER TABLE `__new_customers` RENAME TO `customers`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `customers_username_unique` ON `customers` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `customers_phone_number_unique` ON `customers` (`phone_number`);