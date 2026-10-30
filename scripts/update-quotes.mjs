import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const STOCKS = [
  {
    symbol: "601318.SH",
    sourceSymbol: "sh601318",
    name: "中国平安",
    code: "601318",
    market: "上交所",
    mark: "平",
    score: 100,
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
    score: 90,
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
const EASTMONEY_FINANCE_URL =
  "https://datacenter-web.eastmoney.com/api/data/v1/get";
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = resolve(projectRoot, "public/data/quotes.json");

const stockDataEntries = [];
for (const stock of STOCKS) {
  const quotes = await fetchRecentQuotes(stock);
  const { annualReports, freeFloatShares } = await fetchFinancialData(stock);
  const turnoverRate = calculateTurnoverRate(quotes[0], freeFloatShares);
  stockDataEntries.push([
    stock.symbol,
    { quotes, turnoverRate, annualReports },
  ]);
}
const stockDataBySymbol = Object.fromEntries(stockDataEntries);
const quotesBySymbol = Object.fromEntries(
  Object.entries(stockDataBySymbol).map(([symbol, stockData]) => [
    symbol,
    stockData.quotes,
  ]),
);
const syncedAt = new Date().toISOString();

const stocks = STOCKS.map(({ sourceSymbol, ...stock }) => {
  const { quotes, turnoverRate, annualReports } = stockDataBySymbol[stock.symbol];
  const latestQuote = quotes[0];
  const previousQuote = quotes[1];
  const changePercent =
    latestQuote && previousQuote
      ? ((latestQuote.close - previousQuote.close) / previousQuote.close) * 100
      : null;

  return {
    ...stock,
    latestClose: latestQuote?.close ?? null,
    changePercent,
    currentDividendYield: latestQuote
      ? (stock.annualDividend / latestQuote.close) * 100
      : null,
    turnoverRate,
    annualReports,
  };
}).sort((left, right) => right.score - left.score);

const payload = {
  currency: "CNY",
  source: "新浪财经公开行情 · 东方财富公开财务数据 · GitHub 每日更新",
  sourceStatus: "fresh",
  sourceMessage: null,
  syncedAt,
  stocks,
  quotesBySymbol,
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(`Updated ${stocks.length} stocks at ${syncedAt}`);

async function fetchRecentQuotes(stock) {
  const url = new URL(SOURCE_URL);
  url.search = new URLSearchParams({
    symbol: stock.sourceSymbol,
    scale: "240",
    ma: "no",
    datalen: "120",
  }).toString();

  const response = await fetchWithRetry(url, {
    headers: {
      Accept: "application/json",
      Referer: "https://finance.sina.com.cn/",
      "User-Agent": "Mozilla/5.0 A-Share-Daily-Quote-Dashboard/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`${stock.name}行情源返回异常状态：${response.status}`);
  }

  const payload = await response.json();
  if (payload.result?.status?.code !== 0 || !Array.isArray(payload.result.data)) {
    throw new Error(`${stock.name}行情源返回了无法识别的数据`);
  }

  const quotes = payload.result.data
    .map((item) => ({
      tradeDate: item.day ?? "",
      open: Number(item.open),
      close: Number(item.close),
      low: Number(item.low),
      high: Number(item.high),
      volume: Number(item.volume),
    }))
    .filter(isDailyQuote)
    .sort((left, right) => right.tradeDate.localeCompare(left.tradeDate));

  if (quotes.length === 0) {
    throw new Error(`${stock.name}没有可用行情数据`);
  }

  return quotes;
}

async function fetchFinancialData(stock) {
  const url = new URL(EASTMONEY_FINANCE_URL);
  url.search = new URLSearchParams({
    reportName: "RPT_F10_FINANCE_MAINFINADATA",
    columns: "ALL",
    filter: `(SECUCODE="${stock.symbol}")`,
    pageNumber: "1",
    pageSize: "20",
    sortTypes: "-1",
    sortColumns: "REPORT_DATE",
  }).toString();

  const response = await fetchWithRetry(url, {
    headers: {
      Accept: "application/json",
      Referer: "https://emweb.securities.eastmoney.com/",
      "User-Agent": "Mozilla/5.0 A-Share-Daily-Quote-Dashboard/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`${stock.name}财务数据源返回异常状态：${response.status}`);
  }

  const payload = await response.json();
  const reports = payload.result?.data;

  if (!Array.isArray(reports) || reports.length === 0) {
    throw new Error(`${stock.name}没有可用年报数据`);
  }

  const annualReports = reports
    .filter((report) => report.REPORT_TYPE === "年报")
    .slice(0, 3)
    .map((report) => ({
      year: String(report.REPORT_YEAR ?? ""),
      reportDate: String(report.REPORT_DATE ?? "").split(" ")[0],
      noticeDate: String(report.NOTICE_DATE ?? "").split(" ")[0],
      revenue: toFiniteNumber(report.TOTALOPERATEREVE),
      revenueGrowth: toFiniteNumber(report.TOTALOPERATEREVETZ),
      netProfit: toFiniteNumber(report.PARENTNETPROFIT),
      netProfitGrowth: toFiniteNumber(report.PARENTNETPROFITTZ),
      eps: toFiniteNumber(report.EPSJB),
      roe: toFiniteNumber(report.ROEJQ),
      bookValuePerShare: toFiniteNumber(report.BPS),
      debtRatio: toFiniteNumber(report.ZCFZL),
    }));

  if (annualReports.length === 0) {
    throw new Error(`${stock.name}没有可用年报数据`);
  }

  return {
    annualReports,
    freeFloatShares: toFiniteNumber(reports[0]?.A_FREE_SHARE),
  };
}

function toFiniteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function calculateTurnoverRate(latestQuote, freeFloatShares) {
  if (!latestQuote || !freeFloatShares || freeFloatShares <= 0) return null;
  return (latestQuote.volume / freeFloatShares) * 100;
}

async function fetchWithRetry(url, options, attempts = 3) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fetch(url, options);
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolveDelay) =>
          setTimeout(resolveDelay, attempt * 800),
        );
      }
    }
  }

  throw lastError;
}

function isDailyQuote(value) {
  return Boolean(
    /^\d{4}-\d{2}-\d{2}$/.test(value.tradeDate) &&
      Number.isFinite(value.open) &&
      Number.isFinite(value.close) &&
      Number.isFinite(value.low) &&
      Number.isFinite(value.high) &&
      Number.isFinite(value.volume),
  );
}
