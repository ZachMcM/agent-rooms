CREATE TABLE `messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`room_id` text NOT NULL,
	`membership_id` text NOT NULL,
	`kind` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_messages_room_id_rooms_id_fk` FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_messages_membership_id_memberships_id_fk` FOREIGN KEY (`membership_id`) REFERENCES `memberships`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
DROP INDEX IF EXISTS `decisions_room_id_idx`;--> statement-breakpoint
CREATE INDEX `messages_room_id_idx` ON `messages` (`room_id`,`id`);--> statement-breakpoint
DROP TABLE `decisions`;--> statement-breakpoint
ALTER TABLE `memberships` DROP COLUMN `agent_label`;