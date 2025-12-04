CREATE TABLE `messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`delivery_id` integer NOT NULL,
	`sender_type` text NOT NULL,
	`sender_id` integer NOT NULL,
	`message_type` text DEFAULT 'text' NOT NULL,
	`content` text NOT NULL,
	`image_url` text,
	`metadata` text,
	`is_read` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`delivery_id`) REFERENCES `delivery_requests`(`id`) ON UPDATE no action ON DELETE cascade
);
