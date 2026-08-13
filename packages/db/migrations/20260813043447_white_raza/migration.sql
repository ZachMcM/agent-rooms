CREATE TABLE `memberships` (
	`id` text PRIMARY KEY,
	`room_id` text NOT NULL,
	`conversation_id` text NOT NULL,
	`cursor` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_memberships_room_id_rooms_id_fk` FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
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
CREATE TABLE `rooms` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `memberships_room_conversation_unique` ON `memberships` (`room_id`,`conversation_id`);--> statement-breakpoint
CREATE INDEX `memberships_conversation_idx` ON `memberships` (`conversation_id`);--> statement-breakpoint
CREATE INDEX `messages_room_id_idx` ON `messages` (`room_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `rooms_name_unique` ON `rooms` (`name`);