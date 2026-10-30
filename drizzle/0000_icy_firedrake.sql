CREATE TABLE `daily_quotes` (
	`trade_date` text PRIMARY KEY NOT NULL,
	`open` real NOT NULL,
	`close` real NOT NULL,
	`low` real NOT NULL,
	`high` real NOT NULL,
	`volume` integer NOT NULL,
	`synced_at` text NOT NULL
);
