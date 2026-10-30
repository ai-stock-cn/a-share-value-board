export type DailyQuote = {
  tradeDate: string;
  open: number;
  close: number;
  low: number;
  high: number;
  volume: number;
};

export type StockDefinition = {
  symbol: string;
  sourceSymbol: string;
  name: string;
  code: string;
  market: string;
  mark: string;
  annualDividend: number;
  dividendBasis: string;
  dividendAsOf: string;
  dividendSources: Array<{
    label: string;
    url: string;
  }>;
};

type SinaPayload = {
  result?: {
    status?: { code?: number };
    data?: Array<{
      day?: string;
      open?: string;
      close?: string;
      low?: string;
      high?: string;
      volume?: string;
    }>;
  };
};

export const STOCKS: StockDefinition[] = [
  {
    symbol: "601318.SH",
    sourceSymbol: "sh601318",
    name: "中国平安",
    code: "601318",
    market: "上交所",
    mark: "平",
    annualDividend: 2.7,
    dividendBasis: "2025 年中期 0.95 元 + 末期 1.75 元",
    dividendAsOf: "2025 年度",
    dividendSources: [
      {
        label: "中期分红公告",
        url: "https://static.cninfo.com.cn/finalpage/2025-10-17/1224716377.PDF",
      },
      {
        label: "年度业绩公告",
        url: "https://www.pingan.cn/tc/common/news/article/1774528001371.shtml",
      },
    ],
  },
  {
    symbol: "000538.SZ",
    sourceSymbol: "sz000538",
    name: "云南白药",
    code: "000538",
    market: "深交所",
    mark: "云",
    annualDividend: 2.602,
    dividendBasis: "2025 年特别分红 1.019 元 + 年度分红 1.583 元",
    dividendAsOf: "2025 年度合计",
    dividendSources: [
      {
        label: "特别分红公告",
        url: "https://static.cninfo.com.cn/finalpage/2025-08-30/1224622372.PDF",
      },
      {
        label: "年度分红公告",
        url: "https://static.cninfo.com.cn/finalpage/2026-04-28/1225202736.PDF",
      },
    ],
  },
];

const SOURCE_URL =
  "https://quotes.sina.cn/cn/api/openapi.php/CN_MarketDataService.getKLineData";

export function findStock(symbol: string | null) {
  if (!symbol) return STOCKS[0];
  return STOCKS.find((stock) => stock.symbol === symbol);
}

export async function syncAllQuotes(database: D1Database) {
  await ensureSchema(database);
  return Promise.all(STOCKS.map((stock) => syncQuotes(database, stock)));
}

export async function syncQuotes(
  database: D1Database,
  stock: StockDefinition,
): Promise<DailyQuote[]> {
  await ensureSchema(database);
  const quotes = await fetchRecentQuotes(stock);

  if (quotes.length > 0) {
    const syncedAt = new Date().toISOString();
    const statements = quotes.map((quote) =>
      database
        .prepare(
          `INSERT INTO stock_quotes
            (symbol, trade_date, open, close, low, high, volume, synced_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(symbol, trade_date) DO UPDATE SET
             open = excluded.open,
             close = excluded.close,
             low = excluded.low,
             high = excluded.high,
             volume = excluded.volume,
             synced_at = excluded.synced_at`,
        )
        .bind(
          stock.symbol,
          quote.tradeDate,
          quote.open,
          quote.close,
          quote.low,
          quote.high,
          quote.volume,
          syncedAt,
        ),
    );

    await database.batch(statements);
  }

  return quotes;
}

export async function listQuotes(
  database: D1Database,
  symbol: string,
  limit = 40,
): Promise<DailyQuote[]> {
  await ensureSchema(database);

  const result = await database
    .prepare(
      `SELECT
         trade_date AS tradeDate,
         open,
         close,
         low,
         high,
         volume
       FROM stock_quotes
       WHERE symbol = ?
       ORDER BY trade_date DESC
       LIMIT ?`,
    )
    .bind(symbol, limit)
    .all<DailyQuote>();

  return result.results ?? [];
}

async function ensureSchema(database: D1Database) {
  await database
    .prepare(
      `CREATE TABLE IF NOT EXISTS stock_quotes (
         symbol TEXT NOT NULL,
         trade_date TEXT NOT NULL,
         open REAL NOT NULL,
         close REAL NOT NULL,
         low REAL NOT NULL,
         high REAL NOT NULL,
         volume INTEGER NOT NULL,
         synced_at TEXT NOT NULL,
         PRIMARY KEY (symbol, trade_date)
       )`,
    )
    .run();
}

async function fetchRecentQuotes(stock: StockDefinition): Promise<DailyQuote[]> {
  const url = new URL(SOURCE_URL);

  url.search = new URLSearchParams({
    symbol: stock.sourceSymbol,
    scale: "240",
    ma: "no",
    datalen: "120",
  }).toString();

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      Referer: "https://finance.sina.com.cn/",
      "User-Agent": "Mozilla/5.0 A-Share-Daily-Quote-Dashboard/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`行情源返回异常状态：${response.status}`);
  }

  const payload = (await response.json()) as SinaPayload;
  if (payload.result?.status?.code !== 0 || !Array.isArray(payload.result.data)) {
    throw new Error("行情源返回了无法识别的数据");
  }

  return payload.result.data
    .map((item) => ({
      tradeDate: item.day ?? "",
      open: Number(item.open),
      close: Number(item.close),
      low: Number(item.low),
      high: Number(item.high),
      volume: Number(item.volume),
    }))
    .filter(isDailyQuote);
}

function isDailyQuote(value: DailyQuote | null): value is DailyQuote {
  return Boolean(
    value &&
      /^\d{4}-\d{2}-\d{2}$/.test(value.tradeDate) &&
      Number.isFinite(value.open) &&
      Number.isFinite(value.close) &&
      Number.isFinite(value.low) &&
      Number.isFinite(value.high) &&
      Number.isFinite(value.volume),
  );
}
