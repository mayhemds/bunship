CREATE TABLE `app_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `webhook_events` (
	`event_id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`event_type` text NOT NULL,
	`received_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `webhook_events_provider_idx` ON `webhook_events` (`provider`);--> statement-breakpoint
CREATE INDEX `webhook_events_received_at_idx` ON `webhook_events` (`received_at`);