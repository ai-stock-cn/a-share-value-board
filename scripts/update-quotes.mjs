import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  calculateAnnualDividend,
  calculateDividendYearCount,
  mergeDividendRecords,
} from "./dividends.mjs";
import { calculateFundamentalScore } from "./scoring.mjs";

const STOCKS = [
  {
    symbol: "601318.SH",
    sourceSymbol: "sh601318",
    name: "中国平安",
    code: "601318",
    market: "上交所",
    category: "金融",
    mark: "平",
    score: 100,
    watchPrice: 53,
  },
  {
    symbol: "600941.SH",
    sourceSymbol: "sh600941",
    name: "中国移动",
    code: "600941",
    market: "上交所",
    category: "运营商",
    mark: "移",
    score: 98,
    watchPrice: 90,
    dailyDropAlertPercent: -3,
  },
  {
    symbol: "000333.SZ",
    sourceSymbol: "sz000333",
    name: "美的集团",
    code: "000333",
    market: "深交所",
    category: "电器",
    mark: "美",
    score: 97,
  },
  {
    symbol: "600690.SH",
    sourceSymbol: "sh600690",
    name: "海尔智家",
    code: "600690",
    market: "上交所",
    category: "电器",
    mark: "智",
    score: 96,
  },
  {
    symbol: "000651.SZ",
    sourceSymbol: "sz000651",
    name: "格力电器",
    code: "000651",
    market: "深交所",
    category: "电器",
    mark: "格",
    score: 95,
  },
  {
    symbol: "600900.SH",
    sourceSymbol: "sh600900",
    name: "长江电力",
    code: "600900",
    market: "上交所",
    category: "电力",
    mark: "长",
    score: 94,
  },
  {
    symbol: "600887.SH",
    sourceSymbol: "sh600887",
    name: "伊利股份",
    code: "600887",
    market: "上交所",
    category: "消费",
    mark: "伊",
    score: 93,
  },
  {
    symbol: "600406.SH",
    sourceSymbol: "sh600406",
    name: "国电南瑞",
    code: "600406",
    market: "上交所",
    category: "电力",
    mark: "瑞",
    score: 92,
  },
  {
    symbol: "000423.SZ",
    sourceSymbol: "sz000423",
    name: "东阿阿胶",
    code: "000423",
    market: "深交所",
    category: "中药",
    mark: "胶",
    score: 91,
  },
  {
    symbol: "600886.SH",
    sourceSymbol: "sh600886",
    name: "国投电力",
    code: "600886",
    market: "上交所",
    category: "电力",
    mark: "投",
    score: 90,
  },
  {
    symbol: "000538.SZ",
    sourceSymbol: "sz000538",
    name: "云南白药",
    code: "000538",
    market: "深交所",
    category: "中药",
    mark: "云",
    score: 89,
    watchPrice: 50,
    dailyDropAlertPercent: -3,
  },
  {
    symbol: "601728.SH",
    sourceSymbol: "sh601728",
    name: "中国电信",
    code: "601728",
    market: "上交所",
    category: "运营商",
    mark: "电",
    score: 88,
  },
  {
    symbol: "000895.SZ",
    sourceSymbol: "sz000895",
    name: "双汇发展",
    code: "000895",
    market: "深交所",
    category: "消费",
    mark: "双",
    score: 87,
  },
  {
    symbol: "603288.SH",
    sourceSymbol: "sh603288",
    name: "海天味业",
    code: "603288",
    market: "上交所",
    category: "消费",
    mark: "海",
    score: 86,
  },
  {
    symbol: "601985.SH",
    sourceSymbol: "sh601985",
    name: "中国核电",
    code: "601985",
    market: "上交所",
    category: "电力",
    mark: "核",
    score: 85,
  },
  {
    symbol: "600011.SH",
    sourceSymbol: "sh600011",
    name: "华能国际",
    code: "600011",
    market: "上交所",
    category: "电力",
    mark: "华",
    score: 84,
  },
  {
    symbol: "600795.SH",
    sourceSymbol: "sh600795",
    name: "国电电力",
    code: "600795",
    market: "上交所",
    category: "电力",
    mark: "国",
    score: 83,
  },
  {
    symbol: "600050.SH",
    sourceSymbol: "sh600050",
    name: "中国联通",
    code: "600050",
    market: "上交所",
    category: "运营商",
    mark: "联",
    score: 82,
  },
  {
    symbol: "002508.SZ",
    sourceSymbol: "sz002508",
    name: "老板电器",
    code: "002508",
    market: "深交所",
    category: "电器",
    mark: "老",
    score: 81,
  },
  {
    symbol: "002032.SZ",
    sourceSymbol: "sz002032",
    name: "苏泊尔",
    code: "002032",
    market: "深交所",
    category: "电器",
    mark: "苏",
    score: 80,
  },
  {
    symbol: "600750.SH",
    sourceSymbol: "sh600750",
    name: "华润江中",
    code: "600750",
    market: "上交所",
    category: "中药",
    mark: "江",
    score: 79,
  },
  {
    symbol: "600863.SH",
    sourceSymbol: "sh600863",
    name: "内蒙华电",
    code: "600863",
    market: "上交所",
    category: "电力",
    mark: "蒙",
    score: 78,
  },
  {
    symbol: "600036.SH",
    sourceSymbol: "sh600036",
    name: "招商银行",
    code: "600036",
    market: "上交所",
    category: "银行",
    mark: "招",
    score: 77,
  },
  {
    symbol: "002142.SZ",
    sourceSymbol: "sz002142",
    name: "宁波银行",
    code: "002142",
    market: "深交所",
    category: "银行",
    mark: "宁",
    score: 76,
  },
  {
    symbol: "601838.SH",
    sourceSymbol: "sh601838",
    name: "成都银行",
    code: "601838",
    market: "上交所",
    category: "银行",
    mark: "成",
    score: 75,
  },
  {
    symbol: "600919.SH",
    sourceSymbol: "sh600919",
    name: "江苏银行",
    code: "600919",
    market: "上交所",
    category: "银行",
    mark: "苏",
    score: 74,
  },
  {
    symbol: "000001.SZ",
    sourceSymbol: "sz000001",
    name: "平安银行",
    code: "000001",
    market: "深交所",
    category: "银行",
    mark: "安",
    score: 73,
  },
  {
    symbol: "601166.SH",
    sourceSymbol: "sh601166",
    name: "兴业银行",
    code: "601166",
    market: "上交所",
    category: "银行",
    mark: "兴",
    score: 72,
  },
  {
    symbol: "601328.SH",
    sourceSymbol: "sh601328",
    name: "交通银行",
    code: "601328",
    market: "上交所",
    category: "银行",
    mark: "交",
    score: 71,
  },
  {
    symbol: "601998.SH",
    sourceSymbol: "sh601998",
    name: "中信银行",
    code: "601998",
    market: "上交所",
    category: "银行",
    mark: "信",
    score: 70,
  },
  {
    symbol: "601009.SH",
    sourceSymbol: "sh601009",
    name: "南京银行",
    code: "601009",
    market: "上交所",
    category: "银行",
    mark: "南",
    score: 69,
  },
  {
    symbol: "601939.SH",
    sourceSymbol: "sh601939",
    name: "建设银行",
    code: "601939",
    market: "上交所",
    category: "银行",
    mark: "建",
    score: 68,
  },
  {
    symbol: "601398.SH",
    sourceSymbol: "sh601398",
    name: "工商银行",
    code: "601398",
    market: "上交所",
    category: "银行",
    mark: "工",
    score: 67,
  },
  {
    symbol: "601288.SH",
    sourceSymbol: "sh601288",
    name: "农业银行",
    code: "601288",
    market: "上交所",
    category: "银行",
    mark: "农",
    score: 66,
  },
  {
    symbol: "601988.SH",
    sourceSymbol: "sh601988",
    name: "中国银行",
    code: "601988",
    market: "上交所",
    category: "银行",
    mark: "中",
    score: 65,
  },
  {
    symbol: "600028.SH",
    sourceSymbol: "sh600028",
    name: "中国石化",
    code: "600028",
    market: "上交所",
    category: "资源",
    mark: "化",
    score: 64,
  },
  {
    symbol: "600938.SH",
    sourceSymbol: "sh600938",
    name: "中国海油",
    code: "600938",
    market: "上交所",
    category: "资源",
    mark: "海",
    score: 63,
  },
  {
    symbol: "601088.SH",
    sourceSymbol: "sh601088",
    name: "中国神华",
    code: "601088",
    market: "上交所",
    category: "资源",
    mark: "神",
    score: 62,
  },
  {
    symbol: "601857.SH",
    sourceSymbol: "sh601857",
    name: "中国石油",
    code: "601857",
    market: "上交所",
    category: "资源",
    mark: "油",
    score: 61,
  },
  {
    symbol: "000933.SZ",
    sourceSymbol: "sz000933",
    name: "神火股份",
    code: "000933",
    market: "深交所",
    category: "资源",
    mark: "火",
    score: 60,
  },
  {
    symbol: "000807.SZ",
    sourceSymbol: "sz000807",
    name: "云铝股份",
    code: "000807",
    market: "深交所",
    category: "资源",
    mark: "铝",
    score: 59,
  },
  {
    symbol: "601899.SH",
    sourceSymbol: "sh601899",
    name: "紫金矿业",
    code: "601899",
    market: "上交所",
    category: "资源",
    mark: "紫",
    score: 58,
  },
];

const SOURCE_URL =
  "https://quotes.sina.cn/cn/api/openapi.php/CN_MarketDataService.getKLineData";
const EASTMONEY_FINANCE_URL =
  "https://datacenter-web.eastmoney.com/api/data/v1/get";
const SINA_DIVIDEND_URL =
  "https://money.finance.sina.com.cn/corp/go.php/vISSUE_ShareBonus/stockid";
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = resolve(projectRoot, "public/data/quotes.json");

const stockDataEntries = [];
for (let index = 0; index < STOCKS.length; index += 3) {
  const entries = await Promise.all(
    STOCKS.slice(index, index + 3).map((stock) => fetchStockData(stock)),
  );
  stockDataEntries.push(...entries);
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
  const {
    quotes,
    turnoverRate,
    financialReports,
    annualDividend,
    dividendCount,
    dividendFiscalYear,
    score,
    scoreBreakdown,
  } = stockDataBySymbol[stock.symbol];
  const latestQuote = quotes[0];
  const previousQuote = quotes[1];
  const changePercent =
    latestQuote && previousQuote
      ? ((latestQuote.close - previousQuote.close) / previousQuote.close) * 100
      : null;

  return {
    ...stock,
    watchPrice: stock.watchPrice ?? null,
    dailyDropAlertPercent: stock.dailyDropAlertPercent ?? null,
    score,
    scoreBreakdown,
    annualDividend,
    dividendBasis:
      dividendCount > 0 && dividendFiscalYear
        ? `${dividendFiscalYear} 完整年度已实施现金分红 ${dividendCount} 次，税前合计`
        : "暂无完整年度已实施现金分红",
    dividendAsOf:
      latestQuote && dividendFiscalYear
        ? `采用 ${dividendFiscalYear} 完整年度，截至 ${latestQuote.tradeDate}`
        : "等待完整年度分红数据",
    dividendSources: [
      {
        label: "新浪分红记录",
        url: `${SINA_DIVIDEND_URL}/${stock.code}.phtml`,
      },
      {
        label: "东方财富分红记录",
        url: `https://data.eastmoney.com/yjfp/detail/${stock.code}.html`,
      },
    ],
    latestClose: latestQuote?.close ?? null,
    changePercent,
    currentDividendYield: latestQuote
      ? (annualDividend / latestQuote.close) * 100
      : null,
    turnoverRate,
    financialReports,
  };
}).sort((left, right) => right.score - left.score);

const payload = {
  currency: "CNY",
  source: "新浪财经公开行情及分红 · 东方财富公开财务及分红数据 · GitHub 每日更新",
  sourceStatus: "fresh",
  sourceMessage: null,
  syncedAt,
  stocks,
  quotesBySymbol,
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(`Updated ${stocks.length} stocks at ${syncedAt}`);

async function fetchStockData(stock) {
  const quotes = await fetchRecentQuotes(stock);
  const [{ financialReports, freeFloatShares }, dividendRecords] =
    await Promise.all([
      fetchFinancialData(stock),
      fetchDividendRecords(stock),
    ]);
  const turnoverRate = calculateTurnoverRate(quotes[0], freeFloatShares);
  const { annualDividend, dividendCount, dividendFiscalYear } =
    calculateAnnualDividend(
    dividendRecords,
    quotes[0].tradeDate,
  );
  const dividendYearCount = calculateDividendYearCount(
    dividendRecords,
    dividendFiscalYear,
    quotes[0].tradeDate,
  );
  const currentDividendYield = (annualDividend / quotes[0].close) * 100;
  const fundamentalScore = calculateFundamentalScore({
    category: stock.category,
    reports: financialReports,
    currentDividendYield,
    dividendYearCount,
  });

  return [
    stock.symbol,
    {
      quotes,
      turnoverRate,
      financialReports,
      annualDividend,
      dividendCount,
      dividendFiscalYear,
      score: fundamentalScore.total,
      scoreBreakdown: fundamentalScore.breakdown,
    },
  ];
}

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
    throw new Error(`${stock.name}没有可用财报数据`);
  }

  const latestReport = reports[0];
  const annualReports = reports
    .filter((report) => report.REPORT_TYPE === "年报")
    .slice(0, 3);
  const selectedReports = [latestReport, ...annualReports].filter(
    (report, index, allReports) =>
      allReports.findIndex(
        (candidate) => candidate.REPORT_DATE === report.REPORT_DATE,
      ) === index,
  );
  const financialReports = selectedReports
    .map((report) => ({
      year: String(report.REPORT_YEAR ?? ""),
      reportType: String(report.REPORT_TYPE ?? "财报"),
      reportDate: String(report.REPORT_DATE ?? "").split(" ")[0],
      noticeDate: String(report.NOTICE_DATE ?? "").split(" ")[0],
      revenue: toFiniteNumber(report.TOTALOPERATEREVE),
      revenueGrowth: toFiniteNumber(report.TOTALOPERATEREVETZ),
      netProfit: toFiniteNumber(report.PARENTNETPROFIT),
      netProfitGrowth: toFiniteNumber(report.PARENTNETPROFITTZ),
      eps: toFiniteNumber(report.EPSJB),
      roe: toFiniteNumber(report.ROEJQ),
      bookValuePerShare: toFiniteNumber(report.BPS),
      bookValueGrowth: toFiniteNumber(report.BPSTZ),
      debtRatio: toFiniteNumber(report.ZCFZL),
      nonPerformingLoanRatio: toFiniteNumber(report.NONPERLOAN),
      provisionCoverageRatio: toFiniteNumber(report.BLDKBBL),
    }));

  if (financialReports.length === 0) {
    throw new Error(`${stock.name}没有可用财报数据`);
  }

  return {
    financialReports,
    freeFloatShares: toFiniteNumber(reports[0]?.A_FREE_SHARE),
  };
}

async function fetchDividendRecords(stock) {
  const results = await Promise.allSettled([
    fetchEastmoneyDividendRecords(stock),
    fetchSinaDividendRecords(stock),
  ]);
  const records = mergeDividendRecords(
    ...results
      .filter((result) => result.status === "fulfilled")
      .map((result) => result.value),
  );

  if (records.length === 0) {
    throw new Error(`${stock.name}没有可用分红数据`);
  }

  return records;
}

async function fetchSinaDividendRecords(stock) {
  const response = await fetchWithRetry(
    `${SINA_DIVIDEND_URL}/${stock.code}.phtml`,
    {
      headers: {
        Accept: "text/html",
        Referer: "https://money.finance.sina.com.cn/",
        "User-Agent": "Mozilla/5.0 A-Share-Daily-Quote-Dashboard/1.0",
      },
    },
  );

  if (!response.ok) {
    throw new Error(`${stock.name}新浪分红源返回异常状态：${response.status}`);
  }

  const html = new TextDecoder("gb18030").decode(
    await response.arrayBuffer(),
  );
  const table = html.match(
    /<table[^>]*id=["']sharebonus_1["'][^>]*>([\s\S]*?)<\/table>/i,
  )?.[1];

  if (!table) return [];

  return [...table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
    .map((row) =>
      [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(
        (cell) => stripHtml(cell[1]),
      ),
    )
    .filter((cells) => cells.length >= 7 && /^\d{4}-\d{2}-\d{2}$/.test(cells[0]))
    .map((cells) => {
      const announcementDate = cells[0];
      const announcementYear = Number(announcementDate.slice(0, 4));
      const announcementMonth = Number(announcementDate.slice(5, 7));
      const isAnnual = announcementMonth <= 7;

      return {
        SOURCE: "sina",
        ANNOUNCEMENT_DATE: announcementDate,
        FISCAL_YEAR: isAnnual ? announcementYear - 1 : announcementYear,
        IS_ANNUAL: isAnnual,
        PRETAX_BONUS_RMB: Number(cells[3]),
        ASSIGN_PROGRESS: cells[4],
        EX_DIVIDEND_DATE: cells[5],
      };
    });
}

async function fetchEastmoneyDividendRecords(stock) {
  const url = new URL(EASTMONEY_FINANCE_URL);
  url.search = new URLSearchParams({
    reportName: "RPT_SHAREBONUS_DET",
    columns: "ALL",
    filter: `(SECURITY_CODE="${stock.code}")`,
    pageNumber: "1",
    pageSize: "30",
    sortTypes: "-1",
    sortColumns: "REPORT_DATE",
  }).toString();

  const response = await fetchWithRetry(url, {
    headers: {
      Accept: "application/json",
      Referer: "https://data.eastmoney.com/",
      "User-Agent": "Mozilla/5.0 A-Share-Daily-Quote-Dashboard/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`${stock.name}分红数据源返回异常状态：${response.status}`);
  }

  const payload = await response.json();
  return Array.isArray(payload.result?.data)
    ? payload.result.data.map((record) => {
        const reportDate = String(record.REPORT_DATE ?? "").slice(0, 10);

        return {
          ...record,
          SOURCE: "eastmoney",
          FISCAL_YEAR: Number(reportDate.slice(0, 4)),
          IS_ANNUAL: reportDate.slice(5, 10) === "12-31",
        };
      })
    : [];
}

function stripHtml(value) {
  return value
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .trim();
}

function toFiniteNumber(value) {
  if (value === null || value === undefined || value === "") return null;
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
