CREATE TABLE `api_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`name` text NOT NULL,
	`key_prefix` text NOT NULL,
	`key_hash` text NOT NULL,
	`scopes` text NOT NULL,
	`rate_limit` integer,
	`last_used_at` integer,
	`expires_at` integer,
	`is_active` integer DEFAULT true NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_keys_key_hash_unique` ON `api_keys` (`key_hash`);--> statement-breakpoint
CREATE INDEX `api_keys_organization_id_idx` ON `api_keys` (`organization_id`);--> statement-breakpoint
CREATE INDEX `api_keys_key_hash_idx` ON `api_keys` (`key_hash`);--> statement-breakpoint
CREATE INDEX `api_keys_key_prefix_idx` ON `api_keys` (`key_prefix`);--> statement-breakpoint
CREATE INDEX `api_keys_is_active_idx` ON `api_keys` (`is_active`);--> statement-breakpoint
CREATE INDEX `api_keys_expires_at_idx` ON `api_keys` (`expires_at`);--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`actor_id` text,
	`actor_type` text NOT NULL,
	`actor_email` text,
	`action` text NOT NULL,
	`resource_type` text NOT NULL,
	`resource_id` text,
	`old_values` text,
	`new_values` text,
	`ip_address` text,
	`user_agent` text,
	`metadata` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `audit_logs_organization_id_idx` ON `audit_logs` (`organization_id`);--> statement-breakpoint
CREATE INDEX `audit_logs_actor_id_idx` ON `audit_logs` (`actor_id`);--> statement-breakpoint
CREATE INDEX `audit_logs_actor_type_idx` ON `audit_logs` (`actor_type`);--> statement-breakpoint
CREATE INDEX `audit_logs_action_idx` ON `audit_logs` (`action`);--> statement-breakpoint
CREATE INDEX `audit_logs_resource_type_idx` ON `audit_logs` (`resource_type`);--> statement-breakpoint
CREATE INDEX `audit_logs_resource_id_idx` ON `audit_logs` (`resource_id`);--> statement-breakpoint
CREATE INDEX `audit_logs_created_at_idx` ON `audit_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `audit_logs_org_created_at_idx` ON `audit_logs` (`organization_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `backup_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`code_hash` text NOT NULL,
	`used_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `backup_codes_user_id_idx` ON `backup_codes` (`user_id`);--> statement-breakpoint
CREATE TABLE `files` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`uploaded_by` text NOT NULL,
	`name` text NOT NULL,
	`key` text NOT NULL,
	`bucket` text NOT NULL,
	`size` integer NOT NULL,
	`mime_type` text NOT NULL,
	`metadata` text,
	`is_public` integer DEFAULT false NOT NULL,
	`expires_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `files_organization_id_idx` ON `files` (`organization_id`);--> statement-breakpoint
CREATE INDEX `files_uploaded_by_idx` ON `files` (`uploaded_by`);--> statement-breakpoint
CREATE UNIQUE INDEX `files_bucket_key_idx` ON `files` (`bucket`,`key`);--> statement-breakpoint
CREATE INDEX `files_expires_at_idx` ON `files` (`expires_at`);--> statement-breakpoint
CREATE INDEX `files_deleted_at_idx` ON `files` (`deleted_at`);--> statement-breakpoint
CREATE INDEX `files_created_at_idx` ON `files` (`created_at`);--> statement-breakpoint
CREATE TABLE `invitations` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`token_hash` text NOT NULL,
	`invited_by` text NOT NULL,
	`expires_at` integer NOT NULL,
	`accepted_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`invited_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invitations_token_hash_unique` ON `invitations` (`token_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `invitations_token_hash_idx` ON `invitations` (`token_hash`);--> statement-breakpoint
CREATE INDEX `invitations_organization_id_idx` ON `invitations` (`organization_id`);--> statement-breakpoint
CREATE INDEX `invitations_email_idx` ON `invitations` (`email`);--> statement-breakpoint
CREATE INDEX `invitations_expires_at_idx` ON `invitations` (`expires_at`);--> statement-breakpoint
CREATE INDEX `invitations_accepted_at_idx` ON `invitations` (`accepted_at`);--> statement-breakpoint
CREATE TABLE `memberships` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`organization_id` text NOT NULL,
	`role` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `memberships_user_org_idx` ON `memberships` (`user_id`,`organization_id`);--> statement-breakpoint
CREATE INDEX `memberships_user_id_idx` ON `memberships` (`user_id`);--> statement-breakpoint
CREATE INDEX `memberships_organization_id_idx` ON `memberships` (`organization_id`);--> statement-breakpoint
CREATE INDEX `memberships_role_idx` ON `memberships` (`role`);--> statement-breakpoint
CREATE INDEX `memberships_user_role_idx` ON `memberships` (`user_id`,`role`);--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`logo_url` text,
	`settings` text,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `organizations_slug_unique` ON `organizations` (`slug`);--> statement-breakpoint
CREATE INDEX `organizations_slug_idx` ON `organizations` (`slug`);--> statement-breakpoint
CREATE INDEX `organizations_created_by_idx` ON `organizations` (`created_by`);--> statement-breakpoint
CREATE INDEX `organizations_deleted_at_idx` ON `organizations` (`deleted_at`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`settings` text,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `projects_org_slug_idx` ON `projects` (`organization_id`,`slug`);--> statement-breakpoint
CREATE INDEX `projects_organization_id_idx` ON `projects` (`organization_id`);--> statement-breakpoint
CREATE INDEX `projects_created_by_idx` ON `projects` (`created_by`);--> statement-breakpoint
CREATE INDEX `projects_deleted_at_idx` ON `projects` (`deleted_at`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`refresh_token_hash` text NOT NULL,
	`user_agent` text,
	`ip_address` text,
	`expires_at` integer NOT NULL,
	`last_used_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_refresh_token_hash_unique` ON `sessions` (`refresh_token_hash`);--> statement-breakpoint
CREATE INDEX `sessions_user_id_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_expires_at_idx` ON `sessions` (`expires_at`);--> statement-breakpoint
CREATE INDEX `sessions_last_used_at_idx` ON `sessions` (`last_used_at`);--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`stripe_customer_id` text NOT NULL,
	`stripe_subscription_id` text,
	`stripe_price_id` text,
	`status` text NOT NULL,
	`plan_id` text,
	`current_period_start` integer NOT NULL,
	`current_period_end` integer NOT NULL,
	`cancel_at_period_end` integer DEFAULT false NOT NULL,
	`trial_start` integer,
	`trial_end` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subscriptions_organization_id_unique` ON `subscriptions` (`organization_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `subscriptions_stripe_customer_id_unique` ON `subscriptions` (`stripe_customer_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `subscriptions_stripe_subscription_id_unique` ON `subscriptions` (`stripe_subscription_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `subscriptions_organization_id_idx` ON `subscriptions` (`organization_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `subscriptions_stripe_customer_id_idx` ON `subscriptions` (`stripe_customer_id`);--> statement-breakpoint
CREATE INDEX `subscriptions_stripe_subscription_id_idx` ON `subscriptions` (`stripe_subscription_id`);--> statement-breakpoint
CREATE INDEX `subscriptions_status_idx` ON `subscriptions` (`status`);--> statement-breakpoint
CREATE INDEX `subscriptions_current_period_end_idx` ON `subscriptions` (`current_period_end`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer,
	`password_hash` text,
	`full_name` text,
	`avatar_url` text,
	`preferences` text,
	`two_factor_enabled` integer DEFAULT false NOT NULL,
	`two_factor_secret` text,
	`is_admin` integer DEFAULT false NOT NULL,
	`failed_login_attempts` integer DEFAULT 0 NOT NULL,
	`locked_until` integer,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_is_admin_idx` ON `users` (`is_admin`);--> statement-breakpoint
CREATE INDEX `users_is_active_idx` ON `users` (`is_active`);--> statement-breakpoint
CREATE INDEX `users_deleted_at_idx` ON `users` (`deleted_at`);--> statement-breakpoint
CREATE TABLE `verification_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`type` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `verification_tokens_token_hash_unique` ON `verification_tokens` (`token_hash`);--> statement-breakpoint
CREATE INDEX `verification_tokens_user_id_idx` ON `verification_tokens` (`user_id`);--> statement-breakpoint
CREATE INDEX `verification_tokens_token_hash_idx` ON `verification_tokens` (`token_hash`);--> statement-breakpoint
CREATE INDEX `verification_tokens_type_idx` ON `verification_tokens` (`type`);--> statement-breakpoint
CREATE INDEX `verification_tokens_expires_at_idx` ON `verification_tokens` (`expires_at`);--> statement-breakpoint
CREATE TABLE `webhook_deliveries` (
	`id` text PRIMARY KEY NOT NULL,
	`webhook_id` text NOT NULL,
	`event` text NOT NULL,
	`payload` text NOT NULL,
	`response` text,
	`status_code` integer,
	`attempts` integer DEFAULT 0 NOT NULL,
	`next_retry_at` integer,
	`delivered_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`webhook_id`) REFERENCES `webhooks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `webhook_deliveries_webhook_id_idx` ON `webhook_deliveries` (`webhook_id`);--> statement-breakpoint
CREATE INDEX `webhook_deliveries_event_idx` ON `webhook_deliveries` (`event`);--> statement-breakpoint
CREATE INDEX `webhook_deliveries_next_retry_at_idx` ON `webhook_deliveries` (`next_retry_at`);--> statement-breakpoint
CREATE INDEX `webhook_deliveries_delivered_at_idx` ON `webhook_deliveries` (`delivered_at`);--> statement-breakpoint
CREATE INDEX `webhook_deliveries_created_at_idx` ON `webhook_deliveries` (`created_at`);--> statement-breakpoint
CREATE INDEX `webhook_deliveries_pending_retry_idx` ON `webhook_deliveries` (`delivered_at`,`next_retry_at`);--> statement-breakpoint
CREATE TABLE `webhooks` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`url` text NOT NULL,
	`description` text,
	`secret` text NOT NULL,
	`events` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `webhooks_organization_id_idx` ON `webhooks` (`organization_id`);--> statement-breakpoint
CREATE INDEX `webhooks_is_active_idx` ON `webhooks` (`is_active`);