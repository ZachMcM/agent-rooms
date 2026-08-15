ALTER TABLE `memberships` ADD `status` text DEFAULT 'active' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `memberships_conversation_active_unique` ON `memberships` (`conversation_id`) WHERE `status` = 'active';
