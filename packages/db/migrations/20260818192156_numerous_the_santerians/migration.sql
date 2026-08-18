CREATE TABLE `membership_lifecycle_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`membership_id` text NOT NULL,
	`kind` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_membership_lifecycle_events_membership_id_memberships_id_fk` FOREIGN KEY (`membership_id`) REFERENCES `memberships`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `membership_lifecycle_events_membership_idx` ON `membership_lifecycle_events` (`membership_id`);
--> statement-breakpoint
INSERT INTO `membership_lifecycle_events` (`membership_id`, `kind`, `created_at`)
SELECT `id`, 'join', `created_at` FROM `memberships`;
