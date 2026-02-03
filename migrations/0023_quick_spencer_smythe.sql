ALTER TABLE `payment_references` ADD `payment_method` text DEFAULT 'ecocash';--> statement-breakpoint
ALTER TABLE `payment_references` ADD `gateway_reference` text;--> statement-breakpoint
ALTER TABLE `payment_references` ADD `poll_url` text;--> statement-breakpoint
ALTER TABLE `payment_references` ADD `redirect_url` text;--> statement-breakpoint
ALTER TABLE `payment_references` ADD `currency` text DEFAULT 'USD';--> statement-breakpoint
ALTER TABLE `payment_references` ADD `payment_reason` text;