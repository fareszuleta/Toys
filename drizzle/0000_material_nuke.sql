CREATE TABLE `cart_items` (
	`user_id` text NOT NULL,
	`sku` text NOT NULL,
	`quantity` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `sku`)
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`user_id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`stripe_customer_id` text,
	`demo_card` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `favorites` (
	`user_id` text NOT NULL,
	`sku` text NOT NULL,
	PRIMARY KEY(`user_id`, `sku`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`status` text NOT NULL,
	`mode` text NOT NULL,
	`items_json` text NOT NULL,
	`total` integer NOT NULL,
	`shipping` integer NOT NULL,
	`stripe_session_id` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_stripe_session_id_unique` ON `orders` (`stripe_session_id`);