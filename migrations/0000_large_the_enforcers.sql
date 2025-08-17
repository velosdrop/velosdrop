CREATE TABLE `drivers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`email` text NOT NULL,
	`password` text NOT NULL,
	`profile_picture_url` text,
	`vehicle_type` text NOT NULL,
	`car_name` text NOT NULL,
	`number_plate` text NOT NULL,
	`vehicle_front_image_url` text,
	`vehicle_back_image_url` text,
	`license_front_image_url` text,
	`license_back_image_url` text,
	`license_expiry` text NOT NULL,
	`registration_front_image_url` text,
	`registration_back_image_url` text,
	`registration_expiry` text NOT NULL,
	`national_id_front_image_url` text,
	`national_id_back_image_url` text,
	`status` text DEFAULT 'pending',
	`created_at` text DEFAULT (CURRENT_TIMESTAMP),
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `drivers_email_unique` ON `drivers` (`email`);