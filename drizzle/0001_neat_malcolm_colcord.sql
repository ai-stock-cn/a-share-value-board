CREATE TABLE `stock_quotes` (
	`symbol` text NOT NULL,
	`trade_date` text NOT NULL,
	`open` real NOT NULL,
	`close` real NOT NULL,
	`low` real NOT NULL,
	`high` real NOT NULL,
	`volume` integer NOT NULL,
	`synced_at` text NOT NULL,
	PRIMARY KEY(`symbol`, `trade_date`)
);
