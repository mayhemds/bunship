PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text,
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
INSERT INTO `__new_audit_logs`("id", "organization_id", "actor_id", "actor_type", "actor_email", "action", "resource_type", "resource_id", "old_values", "new_values", "ip_address", "user_agent", "metadata", "created_at") SELECT "id", "organization_id", "actor_id", "actor_type", "actor_email", "action", "resource_type", "resource_id", "old_values", "new_values", "ip_address", "user_agent", "metadata", "created_at" FROM `audit_logs`;--> statement-breakpoint
DROP TABLE `audit_logs`;--> statement-breakpoint
ALTER TABLE `__new_audit_logs` RENAME TO `audit_logs`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `audit_logs_organization_id_idx` ON `audit_logs` (`organization_id`);--> statement-breakpoint
CREATE INDEX `audit_logs_actor_id_idx` ON `audit_logs` (`actor_id`);--> statement-breakpoint
CREATE INDEX `audit_logs_actor_type_idx` ON `audit_logs` (`actor_type`);--> statement-breakpoint
CREATE INDEX `audit_logs_action_idx` ON `audit_logs` (`action`);--> statement-breakpoint
CREATE INDEX `audit_logs_resource_type_idx` ON `audit_logs` (`resource_type`);--> statement-breakpoint
CREATE INDEX `audit_logs_resource_id_idx` ON `audit_logs` (`resource_id`);--> statement-breakpoint
CREATE INDEX `audit_logs_created_at_idx` ON `audit_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `audit_logs_org_created_at_idx` ON `audit_logs` (`organization_id`,`created_at`);