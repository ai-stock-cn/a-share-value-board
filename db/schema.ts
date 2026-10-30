import {
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

export const dailyQuotes = sqliteTable("daily_quotes", {
  tradeDate: text("trade_date").primaryKey(),
  open: real("open").notNull(),
  close: real("close").notNull(),
  low: real("low").notNull(),
  high: real("high").notNull(),
  volume: integer("volume").notNull(),
  syncedAt: text("synced_at").notNull(),
});

export const stockQuotes = sqliteTable(
  "stock_quotes",
  {
    symbol: text("symbol").notNull(),
    tradeDate: text("trade_date").notNull(),
    open: real("open").notNull(),
    close: real("close").notNull(),
    low: real("low").notNull(),
    high: real("high").notNull(),
    volume: integer("volume").notNull(),
    syncedAt: text("synced_at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.symbol, table.tradeDate] })],
);
