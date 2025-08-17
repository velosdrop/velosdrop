DROP INDEX "drivers_email_unique";--> statement-breakpoint
ALTER TABLE `drivers` ALTER COLUMN "status" TO "status" text NOT NULL DEFAULT 'pending';--> statement-breakpoint
CREATE UNIQUE INDEX `drivers_email_unique` ON `drivers` (`email`);--> statement-breakpoint
ALTER TABLE `drivers` ALTER COLUMN "created_at" TO "created_at" text NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `drivers` ALTER COLUMN "updated_at" TO "updated_at" text NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `drivers` ADD `is_online` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `drivers` ADD `last_location` text DEFAULT 'null';--> statement-breakpoint
ALTER TABLE `drivers` ADD `last_online` text DEFAULT CURRENT_TIMESTAMP NOT NULL;--> statement-breakpoint
ALTER TABLE `drivers` DROP COLUMN `vehicle_front_image_url`;--> statement-breakpoint
ALTER TABLE `drivers` DROP COLUMN `vehicle_back_image_url`;--> statement-breakpoint
ALTER TABLE `drivers` DROP COLUMN `license_front_image_url`;--> statement-breakpoint
ALTER TABLE `drivers` DROP COLUMN `license_back_image_url`;--> statement-breakpoint
ALTER TABLE `drivers` DROP COLUMN `registration_front_image_url`;--> statement-breakpoint
ALTER TABLE `drivers` DROP COLUMN `registration_back_image_url`;--> statement-breakpoint
ALTER TABLE `drivers` DROP COLUMN `national_id_front_image_url`;--> statement-breakpoint
ALTER TABLE `drivers` DROP COLUMN `national_id_back_image_url`;