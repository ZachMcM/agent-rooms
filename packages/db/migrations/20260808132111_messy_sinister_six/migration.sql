CREATE TABLE `decisions` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`room_id` text NOT NULL,
	`membership_id` text NOT NULL,
	`agent_label` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_decisions_room_id_rooms_id_fk` FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_decisions_membership_id_memberships_id_fk` FOREIGN KEY (`membership_id`) REFERENCES `memberships`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `memberships` (
	`id` text PRIMARY KEY,
	`room_id` text NOT NULL,
	`session_id` text NOT NULL,
	`agent_label` text NOT NULL,
	`cursor` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_memberships_room_id_rooms_id_fk` FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `rooms` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`owner_user_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `decisions_room_id_idx` ON `decisions` (`room_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `memberships_room_session_unique` ON `memberships` (`room_id`,`session_id`);--> statement-breakpoint
CREATE INDEX `memberships_session_idx` ON `memberships` (`session_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `rooms_owner_name_unique` ON `rooms` (`owner_user_id`,`name`);