"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

type DailyQuote = {
  tradeDate: string;
  open: number;
  close: number;
  low: number;
  high: number;
  volume: number;
};

type DividendSource = {
  label: string;
  url: string;
};

type FinancialReport = {
  year: string;
  reportType: string;
  reportDate: string;
  noticeDate: string;
  revenue: number | null;
  revenueGrowth: number | null;
  netProfit: number | null;
  netProfitGrowth: number | null;
  eps: number | null;
  roe: number | null;
  bookValuePerShare: number | null;
  bookValueGrowth: number | null;
  debtRatio: number | null;
  nonPerformingLoanRatio: number | null;
  provisionCoverageRatio: number | null;
};

type ScoreBreakdown = {
  profitability: number;
  growth: number;
  dividend: number;
  quality: number;
  stability: number;
};

type BollPosition = "上轨以上" | "中上" | "中下" | "下轨以下" | "数据不足";

type BollPositions = {
  daily: BollPosition;
  weekly: BollPosition;
  monthly: BollPosition;
};

type StockCategory =
  | "金融"
  | "银行"
  | "电力"
  | "消费"
  | "电器"
  | "运营商"
  | "中药"
  | "资源";

type StockSummary = {
  symbol: string;
  name: string;
  code: string;
  market: string;
  category: StockCategory;
  mark: string;
  score: number;
  scoreBreakdown: ScoreBreakdown;
  annualDividend: number;
  dividendBasis: string;
  dividendAsOf: string;
  dividendSources: DividendSource[];
  latestClose: number | null;
  changePercent: number | null;
  currentDividendYield: number | null;
  bollPositions: BollPositions;
  watchPrice: number | null;
  dailyDropAlertPercent: number | null;
  turnoverRate: number | null;
  financialReports: FinancialReport[];
};

type MarketFilter = "all" | "上交所" | "深交所";
type CategoryFilter = "all" | StockCategory;
type BollPeriod = keyof BollPositions;
type BollFilter = "all" | BollPosition;
type BollFilterState = Record<BollPeriod, BollFilter>;
type StockPageSize = 5 | 10 | 20;
type StockSort = "score" | "dividend";

type QuoteResponse = StockSummary & {
  currency: string;
  source: string;
  sourceStatus: "fresh" | "cached";
  sourceMessage: string | null;
  syncedAt: string;
  stocks: StockSummary[];
  quotes: DailyQuote[];
};

type QuoteDataset = {
  currency: string;
  source: string;
  sourceStatus: "fresh" | "cached";
  sourceMessage: string | null;
  syncedAt: string;
  stocks: StockSummary[];
  quotesBySymbol: Record<string, DailyQuote[]>;
};

const FALLBACK_STOCKS: StockSummary[] = [
  {
    symbol: "601318.SH",
    name: "中国平安",
    code: "601318",
    market: "上交所",
    category: "金融",
    mark: "平",
    score: 100,
    scoreBreakdown: {
      profitability: 0,
      growth: 0,
      dividend: 0,
      quality: 0,
      stability: 0,
    },
    annualDividend: 2.7,
    dividendBasis: "2025 年中期 0.95 元 + 末期 1.75 元",
    dividendAsOf: "2025 年度",
    dividendSources: [],
    latestClose: null,
    changePercent: null,
    currentDividendYield: null,
    bollPositions: {
      daily: "数据不足",
      weekly: "数据不足",
      monthly: "数据不足",
    },
    watchPrice: 53,
    dailyDropAlertPercent: null,
    turnoverRate: null,
    financialReports: [],
  },
  {
    symbol: "000538.SZ",
    name: "云南白药",
    code: "000538",
    market: "深交所",
    category: "中药",
    mark: "云",
    score: 90,
    scoreBreakdown: {
      profitability: 0,
      growth: 0,
      dividend: 0,
      quality: 0,
      stability: 0,
    },
    annualDividend: 2.602,
    dividendBasis: "2025 年特别分红 1.019 元 + 年度分红 1.583 元",
    dividendAsOf: "2025 年度合计",
    dividendSources: [],
    latestClose: null,
    changePercent: null,
    currentDividendYield: null,
    bollPositions: {
      daily: "数据不足",
      weekly: "数据不足",
      monthly: "数据不足",
    },
    watchPrice: 50,
    dailyDropAlertPercent: -3,
    turnoverRate: null,
    financialReports: [],
  },
];

const DIVIDEND_YIELD_TIERS = [6.5, 6, 5.5, 5, 4.5, 4];
const STOCK_PAGE_SIZES: StockPageSize[] = [5, 10, 20];
const SCORE_DIMENSIONS: Array<{
  key: keyof ScoreBreakdown;
  label: string;
  max: number;
}> = [
  { key: "dividend", label: "分红回报", max: 30 },
  { key: "profitability", label: "盈利能力", max: 25 },
  { key: "stability", label: "经营稳定", max: 20 },
  { key: "quality", label: "财务质量", max: 15 },
  { key: "growth", label: "成长表现", max: 10 },
];
const MARKET_FILTERS: Array<{ value: MarketFilter; label: string }> = [
  { value: "all", label: "全部" },
  { value: "上交所", label: "沪市" },
  { value: "深交所", label: "深市" },
];
const CATEGORY_FILTERS: Array<{ value: CategoryFilter; label: string }> = [
  { value: "all", label: "全部分类" },
  { value: "金融", label: "金融" },
  { value: "银行", label: "银行" },
  { value: "电力", label: "电力" },
  { value: "消费", label: "消费" },
  { value: "电器", label: "电器" },
  { value: "运营商", label: "运营商" },
  { value: "中药", label: "中药" },
  { value: "资源", label: "资源" },
];
const BOLL_PERIOD_FILTERS: Array<{
  period: BollPeriod;
  label: string;
  ariaLabel: string;
}> = [
  { period: "daily", label: "日线", ariaLabel: "按日线BOLL轨道筛选股票" },
  { period: "weekly", label: "周线", ariaLabel: "按周线BOLL轨道筛选股票" },
  { period: "monthly", label: "月线", ariaLabel: "按月线BOLL轨道筛选股票" },
];
const BOLL_FILTERS: Array<{ value: BollFilter; label: string }> = [
  { value: "all", label: "全部" },
  { value: "上轨以上", label: "上轨以上" },
  { value: "中上", label: "中上" },
  { value: "中下", label: "中下" },
  { value: "下轨以下", label: "下轨以下" },
  { value: "数据不足", label: "数据不足" },
];
const DATA_URL = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/data/quotes.json`;

const numberFormatter = new Intl.NumberFormat("zh-CN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dividendFormatter = new Intl.NumberFormat("zh-CN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 3,
});

const compactFormatter = new Intl.NumberFormat("zh-CN", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export default function StockDashboard() {
  const [selectedSymbol, setSelectedSymbol] = useState("601318.SH");
  const [stocks, setStocks] = useState<StockSummary[]>(FALLBACK_STOCKS);
  const [data, setData] = useState<QuoteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [marketFilter, setMarketFilter] = useState<MarketFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [bollFilters, setBollFilters] = useState<BollFilterState>({
    daily: "all",
    weekly: "all",
    monthly: "all",
  });
  const [stockSort, setStockSort] = useState<StockSort>("score");
  const [stockPageSize, setStockPageSize] = useState<StockPageSize>(10);
  const [stockPage, setStockPage] = useState(1);
  const initialRankSelectionRef = useRef(false);

  const loadQuotes = useCallback(async (manual = false) => {
    if (manual) setIsRefreshing(true);

    try {
      const response = await fetch(
        `${DATA_URL}${manual ? `?t=${Date.now()}` : ""}`,
        { cache: "no-store" },
      );
      const payload = (await response.json()) as QuoteDataset & {
        message?: string;
      };

      if (!response.ok) {
        throw new Error(payload.message ?? "行情数据加载失败");
      }

      let effectiveSymbol = selectedSymbol;
      if (!initialRankSelectionRef.current && payload.stocks.length > 0) {
        effectiveSymbol = sortStocks(payload.stocks, "score")[0].symbol;
        initialRankSelectionRef.current = true;
        if (effectiveSymbol !== selectedSymbol) {
          setSelectedSymbol(effectiveSymbol);
        }
      }

      const selectedStock = payload.stocks.find(
        (stock) => stock.symbol === effectiveSymbol,
      );
      const quotes = payload.quotesBySymbol[effectiveSymbol] ?? [];

      if (!selectedStock || quotes.length === 0) {
        throw new Error("暂时没有可展示的行情数据");
      }

      setData({
        ...selectedStock,
        currency: payload.currency,
        source: payload.source,
        sourceStatus: payload.sourceStatus,
        sourceMessage: payload.sourceMessage,
        syncedAt: payload.syncedAt,
        stocks: payload.stocks,
        quotes,
      });
      setStocks(payload.stocks);
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "行情数据加载失败",
      );
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedSymbol]);

  useEffect(() => {
    setData(null);
    setError(null);
    void loadQuotes();
    const timer = window.setInterval(() => void loadQuotes(), 5 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [loadQuotes]);

  const rankedStocks = useMemo(
    () => sortStocks(stocks, stockSort),
    [stockSort, stocks],
  );
  const selectedStock =
    rankedStocks.find((stock) => stock.symbol === selectedSymbol) ??
    rankedStocks[0];
  const filteredStocks = useMemo(
    () =>
      rankedStocks.filter(
        (stock) =>
          stockMatchesFilters(
            stock,
            marketFilter,
            categoryFilter,
            bollFilters,
          ),
      ),
    [bollFilters, categoryFilter, marketFilter, rankedStocks],
  );
  useEffect(() => {
    if (
      filteredStocks.length > 0 &&
      !filteredStocks.some((stock) => stock.symbol === selectedSymbol)
    ) {
      setSelectedSymbol(filteredStocks[0].symbol);
    }
  }, [filteredStocks, selectedSymbol]);
  const stockPageCount = Math.max(
    1,
    Math.ceil(filteredStocks.length / stockPageSize),
  );
  const activeStockPage = Math.min(stockPage, stockPageCount);
  const visibleStocks = useMemo(
    () => {
      const startIndex = (activeStockPage - 1) * stockPageSize;
      return filteredStocks.slice(startIndex, startIndex + stockPageSize);
    },
    [activeStockPage, filteredStocks, stockPageSize],
  );
  const latest = data?.quotes[0];
  const previous = data?.quotes[1];
  const change = latest && previous ? latest.close - previous.close : 0;
  const changePercent = previous ? (change / previous.close) * 100 : 0;
  const direction = change > 0 ? "up" : change < 0 ? "down" : "flat";
  const annualDividend = data?.annualDividend ?? selectedStock.annualDividend;
  const financialReports =
    data?.financialReports ?? selectedStock.financialReports;
  const latestFinancialReport = financialReports[0];
  const scoreBreakdown = data?.scoreBreakdown ?? selectedStock.scoreBreakdown;
  const isBank = selectedStock.category === "银行";
  const isFinancial = selectedStock.category === "金融";
  const fundamentalInsights = buildFundamentalInsights(
    financialReports,
    selectedStock.category,
  );
  const currentDividendYield = latest
    ? (annualDividend / latest.close) * 100
    : null;
  const watchPrice = data?.watchPrice ?? selectedStock.watchPrice;
  const dailyDropAlertPercent =
    data?.dailyDropAlertPercent ?? selectedStock.dailyDropAlertPercent;
  const watchPriceDistancePercent =
    latest && watchPrice
      ? ((latest.close - watchPrice) / latest.close) * 100
      : null;
  const nearestYieldTier = currentDividendYield
    ? DIVIDEND_YIELD_TIERS.reduce((nearest, value) =>
        Math.abs(value - currentDividendYield) <
        Math.abs(nearest - currentDividendYield)
          ? value
          : nearest,
      )
    : null;

  const chartQuotes = useMemo(
    () => data?.quotes.slice(0, 30).reverse() ?? [],
    [data],
  );
  const recentDays = useMemo(
    () => buildRecentDays(data?.quotes ?? []),
    [data],
  );
  const recentQuotes = recentDays
    .map((day) => day.quote)
    .filter((quote): quote is DailyQuote => Boolean(quote));
  const periodStart = recentQuotes.at(-1);
  const periodEnd = recentQuotes[0];
  const periodChange =
    periodStart && periodEnd ? periodEnd.close - periodStart.close : 0;
  const periodChangePercent = periodStart
    ? (periodChange / periodStart.close) * 100
    : 0;
  const comparisonRows = useMemo(() => {
    const recentDates = new Set(recentDays.map((day) => day.date));
    const olderQuotes = (data?.quotes ?? [])
      .filter((quote) => !recentDates.has(quote.tradeDate))
      .slice(0, 5);

    return [
      ...recentDays.map((day) => ({ ...day, isRecent: true })),
      ...olderQuotes.map((quote) => ({
        date: quote.tradeDate,
        isToday: false,
        quote,
        isRecent: false,
      })),
    ];
  }, [data, recentDays]);

  return (
    <main className="site-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <header className="topbar">
        <a className="brand" href="#top" aria-label="返回页面顶部">
          <span className="brand-mark">股</span>
          <span>
            <strong>A股价值看板</strong>
            <small>A-SHARE VALUE BOARD</small>
          </span>
        </a>
        <div className="topbar-meta">
          <span
            className={`live-dot ${data?.sourceStatus === "cached" ? "is-cached" : ""}`}
          />
          {data?.sourceStatus === "cached" ? "缓存数据" : "自动更新中"}
        </div>
      </header>

      <section className="dashboard-layout">
        <aside className="stock-rail" aria-label="股票列表">
          <div className="stock-rail-heading">
            <div>
              <span className="section-kicker">股票清单</span>
              <h2>已收录 {stocks.length} 只</h2>
            </div>
            <span className="stock-count">{String(stocks.length).padStart(2, "0")}</span>
          </div>
          <div className="stock-filter-group">
            <label className="market-select">
              <span>市场</span>
              <span className="market-select-control">
                <select
                  aria-label="按市场筛选股票"
                  value={marketFilter}
                  onChange={(event) => {
                    const nextFilter = event.target.value as MarketFilter;
                    setMarketFilter(nextFilter);
                    setStockPage(1);
                  }}
                >
                  {MARKET_FILTERS.map((filter) => {
                    const count = rankedStocks.filter(
                      (stock) =>
                        stockMatchesFilters(
                          stock,
                          filter.value,
                          categoryFilter,
                          bollFilters,
                        ),
                    ).length;

                    return (
                      <option value={filter.value} key={filter.value}>
                        {filter.label} · {count} 只
                      </option>
                    );
                  })}
                </select>
                <i aria-hidden="true">⌄</i>
              </span>
            </label>
            <label className="market-select category-select">
              <span>分类</span>
              <span className="market-select-control">
                <select
                  aria-label="按分类筛选股票"
                  value={categoryFilter}
                  onChange={(event) => {
                    const nextFilter = event.target.value as CategoryFilter;
                    setCategoryFilter(nextFilter);
                    setStockPage(1);
                  }}
                >
                  {CATEGORY_FILTERS.map((filter) => {
                    const count = rankedStocks.filter(
                      (stock) =>
                        stockMatchesFilters(
                          stock,
                          marketFilter,
                          filter.value,
                          bollFilters,
                        ),
                    ).length;

                    return (
                      <option value={filter.value} key={filter.value}>
                        {filter.label} · {count} 只
                      </option>
                    );
                  })}
                </select>
                <i aria-hidden="true">⌄</i>
              </span>
            </label>
            <div className="boll-filter-panel">
              <div className="boll-filter-heading">
                <span>BOLL 轨道</span>
                <small>日 · 周 · 月</small>
              </div>
              <div className="boll-filter-grid">
                {BOLL_PERIOD_FILTERS.map(({ period, label, ariaLabel }) => (
                  <label className="boll-period-filter" key={period}>
                    <span>{label}</span>
                    <span className="market-select-control">
                      <select
                        aria-label={ariaLabel}
                        value={bollFilters[period]}
                        onChange={(event) => {
                          setBollFilters((current) => ({
                            ...current,
                            [period]: event.target.value as BollFilter,
                          }));
                          setStockPage(1);
                        }}
                      >
                        {BOLL_FILTERS.map((filter) => {
                          const nextBollFilters = {
                            ...bollFilters,
                            [period]: filter.value,
                          };
                          const count = rankedStocks.filter((stock) =>
                            stockMatchesFilters(
                              stock,
                              marketFilter,
                              categoryFilter,
                              nextBollFilters,
                            ),
                          ).length;

                          return (
                            <option value={filter.value} key={filter.value}>
                              {filter.label} · {count}
                            </option>
                          );
                        })}
                      </select>
                      <i aria-hidden="true">⌄</i>
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <label className="market-select stock-sort-select">
              <span>排名</span>
              <span className="market-select-control">
                <select
                  aria-label="选择股票排名方式"
                  value={stockSort}
                  onChange={(event) => {
                    const nextSort = event.target.value as StockSort;
                    const firstMatch = sortStocks(stocks, nextSort).find(
                      (stock) =>
                        stockMatchesFilters(
                          stock,
                          marketFilter,
                          categoryFilter,
                          bollFilters,
                        ),
                    );

                    setStockSort(nextSort);
                    if (firstMatch) setSelectedSymbol(firstMatch.symbol);
                    setStockPage(1);
                  }}
                >
                  <option value="score">评分从高到低</option>
                  <option value="dividend">股息率从高到低</option>
                </select>
                <i aria-hidden="true">⌄</i>
              </span>
            </label>
          </div>
          <div className="stock-selector">
            <div
              className="stock-option-list"
              role="listbox"
              aria-label={
                stockSort === "score" ? "按评分选择股票" : "按股息率选择股票"
              }
            >
              {visibleStocks.map((stock) => {
                const rank = rankedStocks.indexOf(stock) + 1;

                return (
                  <button
                    type="button"
                    role="option"
                    aria-selected={selectedSymbol === stock.symbol}
                    className={`stock-option ${
                      selectedSymbol === stock.symbol ? "is-active" : ""
                    }`}
                    onClick={() => setSelectedSymbol(stock.symbol)}
                    key={stock.symbol}
                  >
                    <span className="stock-mark">{stock.mark}</span>
                    <span className="stock-identity">
                      <strong>{stock.name}</strong>
                      <small>
                        #{String(rank).padStart(2, "0")} · {stock.category} ·{" "}
                        {formatMarketName(stock.market)} · {stock.symbol}
                      </small>
                    </span>
                    <span className="stock-list-price">
                      <strong>
                        {stock.latestClose === null
                          ? "—"
                          : `¥${numberFormatter.format(stock.latestClose)}`}
                      </strong>
                      <small
                        className={
                          stock.changePercent === null
                            ? ""
                            : stock.changePercent >= 0
                              ? "positive"
                              : "negative"
                        }
                      >
                        {stock.currentDividendYield === null
                          ? "股息率 —"
                          : `股息率 ${stock.currentDividendYield.toFixed(2)}%`}
                      </small>
                    </span>
                    <span className="stock-score">
                      <small>评分</small>
                      <strong>{stock.score}</strong>
                    </span>
                    <span className="stock-boll" aria-label={`${stock.name} BOLL位置`}>
                      {([
                        ["日BOLL", stock.bollPositions.daily],
                        ["周BOLL", stock.bollPositions.weekly],
                        ["月BOLL", stock.bollPositions.monthly],
                      ] as const).map(([label, position]) => (
                        <span key={label}>
                          <small>{label}</small>
                          <strong className={`boll-${getBollPositionClass(position)}`}>
                            {position}
                          </strong>
                        </span>
                      ))}
                    </span>
                  </button>
                );
              })}
              {filteredStocks.length === 0 ? (
                <div className="stock-filter-empty">
                  <strong>没有符合条件的股票</strong>
                  <span>可调整日、周、月轨道条件后再试。</span>
                  <button
                    type="button"
                    onClick={() => {
                      setMarketFilter("all");
                      setCategoryFilter("all");
                      setBollFilters({
                        daily: "all",
                        weekly: "all",
                        monthly: "all",
                      });
                      setStockPage(1);
                    }}
                  >
                    清除筛选
                  </button>
                </div>
              ) : null}
            </div>
            <div className="stock-pagination">
              <label className="stock-page-size">
                <span>每页</span>
                <span className="market-select-control">
                  <select
                    aria-label="设置每页股票数量"
                    value={stockPageSize}
                    onChange={(event) => {
                      setStockPageSize(
                        Number(event.target.value) as StockPageSize,
                      );
                      setStockPage(1);
                    }}
                  >
                    {STOCK_PAGE_SIZES.map((pageSize) => (
                      <option value={pageSize} key={pageSize}>
                        {pageSize} 条
                      </option>
                    ))}
                  </select>
                  <i aria-hidden="true">⌄</i>
                </span>
              </label>
              <div className="stock-page-controls" aria-label="股票列表分页">
                <button
                  type="button"
                  aria-label="上一页"
                  disabled={activeStockPage === 1}
                  onClick={() =>
                    setStockPage((current) => Math.max(1, current - 1))
                  }
                >
                  ←
                </button>
                <span aria-live="polite">
                  {activeStockPage} / {stockPageCount}
                </span>
                <button
                  type="button"
                  aria-label="下一页"
                  disabled={activeStockPage === stockPageCount}
                  onClick={() =>
                    setStockPage((current) =>
                      Math.min(stockPageCount, current + 1),
                    )
                  }
                >
                  →
                </button>
              </div>
            </div>
          </div>
          <p className="stock-rail-note">
            {stockSort === "score"
              ? "按评分从高到低排列"
              : "按当前股息率从高到低排列"}
            ；每页最多显示 20 条。
          </p>
        </aside>

        <div className="dashboard-main" id="top">
          <section className="hero">
            <div className="hero-copy">
              <div className="eyebrow">
                <span>{selectedStock.market}</span>
                <span>{selectedStock.category}</span>
                <span>{selectedStock.code}</span>
                <span>A 股</span>
              </div>
              <h1>{data?.name ?? selectedStock.name}</h1>
              <p>行情、K线与股息价，一页看清。</p>
            </div>

            <div className="quote-hero" aria-live="polite">
              <div className="quote-heading">
                <div className="quote-date">
                  <span>
                    {latest ? formatTradeDate(latest.tradeDate) : "正在获取交易日"}
                  </span>
                  <small>
                    {data
                      ? `收盘后更新 · 最近检查 ${formatSyncTime(data.syncedAt)}`
                      : "正在连接行情服务…"}
                  </small>
                </div>
                <button
                  type="button"
                  onClick={() => void loadQuotes(true)}
                  disabled={isRefreshing}
                  className="refresh-button"
                >
                  <span
                    className={
                      isRefreshing ? "refresh-icon spinning" : "refresh-icon"
                    }
                  >
                    ↻
                  </span>
                  {isRefreshing ? "更新中" : "刷新"}
                </button>
              </div>

              {latest ? (
                <div className="quote-overview">
                  <div className="current-quote">
                    <span className="quote-label">最新收盘价</span>
                    <div className="current-price">
                      <span className="currency">¥</span>
                      <strong>{numberFormatter.format(latest.close)}</strong>
                    </div>
                  </div>
                  <div className="quote-metrics" aria-label="价格与股息摘要">
                    <div
                      className={`quote-metric quote-metric-change ${direction}`}
                    >
                      <span className="quote-metric-title">较前收</span>
                      <div className="quote-metric-value">
                        <strong>
                          {change >= 0 ? "+" : ""}
                          {numberFormatter.format(change)}
                        </strong>
                        <small>
                          {changePercent >= 0 ? "+" : ""}
                          {changePercent.toFixed(2)}%
                        </small>
                      </div>
                    </div>
                    <div className="quote-metric quote-metric-dividend">
                      <div>
                        <span className="quote-metric-title">当前股息率</span>
                        <small>
                          每股股息 ¥{dividendFormatter.format(annualDividend)}
                        </small>
                      </div>
                      <strong>
                        {currentDividendYield?.toFixed(2) ?? "—"}%
                      </strong>
                    </div>
                  </div>
                  <div className="quote-session">
                    <div>
                      <span>成交量</span>
                      <strong>{compactFormatter.format(latest.volume)} 股</strong>
                    </div>
                    <div>
                      <span>换手率</span>
                      <strong>
                        {data?.turnoverRate === null || data?.turnoverRate === undefined
                          ? "—"
                          : `${data.turnoverRate.toFixed(2)}%`}
                      </strong>
                    </div>
                  </div>
                  <div
                    className="quote-boll"
                    aria-label={`${selectedStock.name} 行情卡BOLL位置`}
                  >
                    {([
                      ["日BOLL", selectedStock.bollPositions.daily],
                      ["周BOLL", selectedStock.bollPositions.weekly],
                      ["月BOLL", selectedStock.bollPositions.monthly],
                    ] as const).map(([label, position]) => (
                      <div key={label}>
                        <span>{label}</span>
                        <strong className={`boll-${getBollPositionClass(position)}`}>
                          {position}
                        </strong>
                      </div>
                    ))}
                  </div>
                  {(watchPrice !== null || dailyDropAlertPercent !== null) && (
                    <div className="quote-alert-panel">
                      <div className="quote-alert-heading">
                        <span>建仓起点提醒</span>
                        <small>每日收盘后检查</small>
                      </div>
                      <div className="quote-alert-rules">
                        {watchPrice !== null && (
                          <div>
                            <span>建仓起点</span>
                            <strong>≤ ¥{numberFormatter.format(watchPrice)}</strong>
                            <small>
                              {watchPriceDistancePercent === null
                                ? "等待行情"
                                : watchPriceDistancePercent <= 0
                                  ? "已进入建仓观察区间"
                                  : `距建仓起点还需下跌 ${watchPriceDistancePercent.toFixed(2)}%`}
                            </small>
                          </div>
                        )}
                        {dailyDropAlertPercent !== null && (
                          <div>
                            <span>单日跌幅提醒</span>
                            <strong>≤ {dailyDropAlertPercent.toFixed(2)}%</strong>
                            <small>触发后推送微信消息</small>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="hero-skeleton">
                  <Skeleton
                    height={72}
                    borderRadius={16}
                    baseColor="#172139"
                    highlightColor="#24314d"
                  />
                </div>
              )}
            </div>
          </section>

          {error && !data ? (
            <section className="error-panel" role="alert">
              <span>!</span>
              <div>
                <strong>暂时没有拿到行情</strong>
                <p>{error}</p>
              </div>
              <button type="button" onClick={() => void loadQuotes(true)}>
                重新获取
              </button>
            </section>
          ) : (
            <>
              <section className="price-grid" aria-label="当日四价">
                <div className="price-grid-heading">
                  <span className="section-kicker">当日四价</span>
                  <small>
                    {latest ? formatTableDate(latest.tradeDate) : "--.--"} · CNY
                  </small>
                </div>
                <PriceCard
                  label="开盘价"
                  value={latest?.open}
                  accent="amber"
                  index="01"
                />
                <PriceCard
                  label="最高价"
                  value={latest?.high}
                  accent="coral"
                  index="02"
                />
                <PriceCard
                  label="最低价"
                  value={latest?.low}
                  accent="blue"
                  index="03"
                />
                <PriceCard
                  label="收盘价"
                  value={latest?.close}
                  accent="lime"
                  index="04"
                />
              </section>

              <section className="insight-grid">
                <article className="trend-card kline-card">
                  <div className="section-heading">
                    <div>
                      <span className="section-kicker">30 个交易日</span>
                      <h2>K 线走势</h2>
                    </div>
                    {chartQuotes.length > 0 && (
                      <div className="trend-range">
                        <span>收盘区间</span>
                        <strong>
                          {numberFormatter.format(
                            Math.min(...chartQuotes.map((item) => item.close)),
                          )}{" "}
                          —{" "}
                          {numberFormatter.format(
                            Math.max(...chartQuotes.map((item) => item.close)),
                          )}
                        </strong>
                      </div>
                    )}
                  </div>
                  <KLineChart quotes={chartQuotes} />
                  <div className="kline-legend" aria-label="K线颜色说明">
                    <span><i className="up" />红涨</span>
                    <span><i className="down" />绿跌</span>
                    <span><i className="close-line" />收盘连线</span>
                    <small>隔日标注收盘价，最新交易日始终显示</small>
                  </div>
                </article>
              </section>

              <section className="history-section fundamentals-section" aria-label="基本面分析">
                <div className="section-heading fundamentals-heading">
                  <div>
                    <span className="section-kicker">2026 最新报告 · 近三年年报</span>
                    <h2>基本面分析</h2>
                  </div>
                  <div className="fundamentals-meta">
                    <div className="fundamental-score">
                      <span>基本面综合评分</span>
                      <strong>
                        {data?.score ?? selectedStock.score}
                        <small>/100</small>
                      </strong>
                    </div>
                    <div className="fundamentals-source">
                      <span>公开财务数据</span>
                      <strong>{financialReports.length ? `${financialReports.at(-1)?.year}—${financialReports[0]?.year}` : "等待数据"}</strong>
                    </div>
                  </div>
                </div>

                {latestFinancialReport ? (
                  <>
                    <div className="score-breakdown" aria-label="基本面评分构成">
                      {SCORE_DIMENSIONS.map((dimension) => (
                        <div key={dimension.key}>
                          <span>{dimension.label}</span>
                          <strong>{scoreBreakdown[dimension.key].toFixed(1)}</strong>
                          <small>/ {dimension.max}</small>
                        </div>
                      ))}
                    </div>
                    <p className="score-method-note">
                      评分满分 100：分红 30、盈利 25、稳定性 20、财务质量 15、成长 10。
                      盈利和成长采用最新报告与近三年年报加权，降低单季波动；分红按当前股息率（6.5% 为满档）及近三年持续分红；稳定性按各报告期增长为正的比例计算。
                      {isBank
                        ? "银行的财务质量分由不良贷款率与拨备覆盖率共同计算。"
                        : isFinancial
                          ? "保险金融公司的财务质量分由净利率与每股净资产增长共同计算，不再按普通企业资产负债率扣分。"
                          : selectedStock.category === "电力" || selectedStock.category === "运营商"
                            ? "资本密集型行业按行业化净利率与负债率区间计算财务质量。"
                            : "普通企业的财务质量分由净利率与资产负债率共同计算。"}
                    </p>
                    <div className="fundamental-summary">
                      <FinancialMetric
                        label="营业总收入"
                        value={formatFinancialAmount(latestFinancialReport.revenue)}
                        change={latestFinancialReport.revenueGrowth}
                        period={`${latestFinancialReport.year} ${latestFinancialReport.reportType}`}
                      />
                      <FinancialMetric
                        label="归母净利润"
                        value={formatFinancialAmount(latestFinancialReport.netProfit)}
                        change={latestFinancialReport.netProfitGrowth}
                        period={`${latestFinancialReport.year} ${latestFinancialReport.reportType}`}
                      />
                      <FinancialMetric
                        label="净资产收益率"
                        value={formatFinancialPercent(latestFinancialReport.roe)}
                        period={`${latestFinancialReport.year} ${latestFinancialReport.reportType}`}
                      />
                      <FinancialMetric
                        label="基本每股收益"
                        value={latestFinancialReport.eps === null ? "—" : `¥${latestFinancialReport.eps.toFixed(2)}`}
                        period={`${latestFinancialReport.year} ${latestFinancialReport.reportType}`}
                      />
                    </div>

                    {isBank && (
                      <div className="bank-risk-summary" aria-label="银行资产质量指标">
                        <FinancialMetric
                          label="不良贷款率"
                          value={formatFinancialPercent(latestFinancialReport.nonPerformingLoanRatio)}
                          period={`${latestFinancialReport.year} ${latestFinancialReport.reportType}`}
                        />
                        <FinancialMetric
                          label="拨备覆盖率"
                          value={formatFinancialPercent(latestFinancialReport.provisionCoverageRatio)}
                          period={`${latestFinancialReport.year} ${latestFinancialReport.reportType}`}
                        />
                      </div>
                    )}

                    {isFinancial && (
                      <div className="bank-risk-summary" aria-label="保险资本质量指标">
                        <FinancialMetric
                          label="每股净资产同比"
                          value={formatSignedPercent(latestFinancialReport.bookValueGrowth)}
                          period={`${latestFinancialReport.year} ${latestFinancialReport.reportType}`}
                        />
                        <FinancialMetric
                          label="每股净资产"
                          value={latestFinancialReport.bookValuePerShare === null ? "—" : `¥${latestFinancialReport.bookValuePerShare.toFixed(2)}`}
                          period={`${latestFinancialReport.year} ${latestFinancialReport.reportType}`}
                        />
                      </div>
                    )}

                    <div className="fundamental-insights" aria-label="基本面观察">
                      {fundamentalInsights.map((insight, index) => (
                        <article className={`fundamental-insight ${insight.tone}`} key={insight.label}>
                          <span>{String(index + 1).padStart(2, "0")} · {insight.label}</span>
                          <strong>{insight.title}</strong>
                          <p>{insight.description}</p>
                        </article>
                      ))}
                    </div>

                    <div className="fundamental-table-heading">
                      <strong>2026 最新报告与近三年年报</strong>
                      <span>金额单位：人民币</span>
                    </div>
                    <div className="table-wrap fundamental-table-wrap">
                      <table className={isBank ? "bank-financial-table" : undefined}>
                        <thead>
                          <tr>
                            <th>报告期</th>
                            <th>营业总收入</th>
                            <th>营收同比</th>
                            <th>归母净利润</th>
                            <th>净利润同比</th>
                            <th>基本EPS</th>
                            <th>ROE</th>
                            {isBank && <th>不良贷款率</th>}
                            {isBank && <th>拨备覆盖率</th>}
                            <th>每股净资产</th>
                            {isFinancial && <th>每股净资产同比</th>}
                            <th>资产负债率</th>
                          </tr>
                        </thead>
                        <tbody>
                          {financialReports.map((report) => (
                            <tr key={report.reportDate}>
                              <td>
                                <strong>{report.year}</strong>
                                <small>{report.reportType}</small>
                              </td>
                              <td>{formatFinancialAmount(report.revenue)}</td>
                              <td className={financialChangeClass(report.revenueGrowth)}>
                                {formatSignedPercent(report.revenueGrowth)}
                              </td>
                              <td>{formatFinancialAmount(report.netProfit)}</td>
                              <td className={financialChangeClass(report.netProfitGrowth)}>
                                {formatSignedPercent(report.netProfitGrowth)}
                              </td>
                              <td>{report.eps === null ? "—" : `¥${report.eps.toFixed(2)}`}</td>
                              <td>{formatFinancialPercent(report.roe)}</td>
                              {isBank && <td>{formatFinancialPercent(report.nonPerformingLoanRatio)}</td>}
                              {isBank && <td>{formatFinancialPercent(report.provisionCoverageRatio)}</td>}
                              <td>{report.bookValuePerShare === null ? "—" : `¥${report.bookValuePerShare.toFixed(2)}`}</td>
                              {isFinancial && <td className={financialChangeClass(report.bookValueGrowth)}>{formatSignedPercent(report.bookValueGrowth)}</td>}
                              <td>{formatFinancialPercent(report.debtRatio)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="fundamentals-note">
                      2026 数据为最新已披露的季度或中期报告，另列最近三年年报；数据来源于东方财富公开财务数据。评分与趋势仅用于快速比较，不构成投资建议。
                    </p>
                  </>
                ) : (
                  <div className="fundamentals-loading">
                    <Skeleton height={220} borderRadius={18} baseColor="#edf0e8" highlightColor="#ffffff" />
                  </div>
                )}
              </section>

              <section className="history-section comparison-section" aria-label="近期行情对比">
                <div className="section-heading comparison-heading">
                  <div>
                    <span className="section-kicker">最近 7 天统计 · 历史记录</span>
                    <h2>近期行情对比</h2>
                  </div>
                  <span className="table-caption">
                    前 7 行为自然日，非交易日标记为休市
                  </span>
                </div>

                <div className="week-summary">
                  <div>
                    <span>交易日</span>
                    <strong>{recentQuotes.length}<small> / 7 天</small></strong>
                  </div>
                  <div>
                    <span>区间最高</span>
                    <strong>
                      {recentQuotes.length
                        ? `¥${numberFormatter.format(Math.max(...recentQuotes.map((quote) => quote.high)))}`
                        : "—"}
                    </strong>
                  </div>
                  <div>
                    <span>区间最低</span>
                    <strong>
                      {recentQuotes.length
                        ? `¥${numberFormatter.format(Math.min(...recentQuotes.map((quote) => quote.low)))}`
                        : "—"}
                    </strong>
                  </div>
                  <div>
                    <span>首尾收盘变化</span>
                    <strong className={periodChange > 0 ? "positive" : periodChange < 0 ? "negative" : ""}>
                      {periodStart && periodEnd
                        ? `${periodChange >= 0 ? "+" : ""}${numberFormatter.format(periodChange)} · ${periodChangePercent >= 0 ? "+" : ""}${periodChangePercent.toFixed(2)}%`
                        : "—"}
                    </strong>
                  </div>
                </div>

                <div className="comparison-table-heading">
                  <strong>每日价格对比</strong>
                  <span>价格单位：人民币</span>
                </div>
                <p className="comparison-formula">
                  日内价差 = 最高 − 最低；振幅 = 日内价差 ÷ 前一交易日收盘价；收盘涨跌幅 =（当日收盘 − 前一交易日收盘）÷ 前一交易日收盘价
                </p>

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>日期</th>
                        <th>收盘</th>
                        <th>收盘涨跌幅</th>
                        <th>日内价差</th>
                        <th>开盘</th>
                        <th>最高</th>
                        <th>最低</th>
                        <th>开盘→最低</th>
                        <th>开盘→最高</th>
                        <th>日内振幅</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data ?
                        comparisonRows.map((row) => {
                          if (!row.quote) {
                            return (
                              <tr className="comparison-closed-row" key={row.date}>
                                <td>
                                  <span className="date-cell">{formatTableDate(row.date)}</span>
                                  <span className="day-context">{formatWeekday(row.date)}</span>
                                </td>
                                <td colSpan={9}>
                                  <span className="market-closed-label">休市</span>
                                </td>
                              </tr>
                            );
                          }

                          const quote = row.quote;
                          const closeChangePercent = calculateCloseChangePercent(
                            quote,
                            data.quotes,
                          );

                          return (
                            <tr className={row.isRecent ? "is-recent-row" : ""} key={row.date}>
                              <td>
                                <span className="date-cell">{formatTableDate(row.date)}</span>
                                {row.isToday ? (
                                  <small>今天</small>
                                ) : row.isRecent ? (
                                  <span className="day-context">{formatWeekday(row.date)}</span>
                                ) : null}
                              </td>
                              <td><strong>{numberFormatter.format(quote.close)}</strong></td>
                              <td
                                className={
                                  closeChangePercent === null
                                    ? ""
                                    : closeChangePercent > 0
                                      ? "close-change-positive"
                                      : closeChangePercent < 0
                                        ? "close-change-negative"
                                        : ""
                                }
                              >
                                {closeChangePercent === null
                                  ? "—"
                                  : `${closeChangePercent >= 0 ? "+" : ""}${closeChangePercent.toFixed(2)}%`}
                              </td>
                              <td className="range-difference-cell">
                                {numberFormatter.format(quote.high - quote.low)}
                              </td>
                              <td>{numberFormatter.format(quote.open)}</td>
                              <td className="high-cell">{numberFormatter.format(quote.high)}</td>
                              <td className="low-cell">{numberFormatter.format(quote.low)}</td>
                              <td className="open-low-cell">
                                {formatSignedDifference(quote.low - quote.open)}
                              </td>
                              <td className="open-high-cell">
                                {formatSignedDifference(quote.high - quote.open)}
                              </td>
                              <td>{formatAmplitude(quote, data.quotes)}</td>
                            </tr>
                          );
                        }) :
                        Array.from({ length: 6 }).map((_, index) => (
                          <tr key={index}>
                            {Array.from({ length: 10 }).map((__, cell) => (
                              <td key={cell}><Skeleton baseColor="#f0f1eb" highlightColor="#ffffff" /></td>
                            ))}
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="dividend-section" aria-label="股息率参考价格">
                <div className="dividend-heading">
                  <div>
                    <span className="section-kicker">股息估值</span>
                    <h2>目标股息率对应价格</h2>
                    <p>
                      按每股税前现金分红 ¥{dividendFormatter.format(annualDividend)} 计算
                    </p>
                  </div>
                  <div className="dividend-current">
                    <span>现价静态股息率</span>
                    <strong>
                      {currentDividendYield
                        ? `${currentDividendYield.toFixed(2)}%`
                        : "—"}
                    </strong>
                  </div>
                </div>

                <div className="yield-grid">
                  {DIVIDEND_YIELD_TIERS.map((yieldRate) => {
                    const targetPrice = annualDividend / (yieldRate / 100);
                    const priceGap = latest
                      ? ((targetPrice - latest.close) / latest.close) * 100
                      : null;
                    const isNearest = nearestYieldTier === yieldRate;

                    return (
                      <article
                        className={`yield-card ${isNearest ? "is-nearest" : ""}`}
                        key={yieldRate}
                      >
                        <div>
                          <span>目标股息率</span>
                          {isNearest && <small>最接近现价</small>}
                        </div>
                        <strong>{yieldRate.toFixed(1)}%</strong>
                        <p>¥{numberFormatter.format(targetPrice)}</p>
                        <span className="yield-gap">
                          {priceGap === null
                            ? "等待现价"
                            : `较现价 ${priceGap >= 0 ? "+" : ""}${priceGap.toFixed(1)}%`}
                        </span>
                      </article>
                    );
                  })}
                </div>

                <div className="dividend-note">
                  <p>
                    计算公式：参考价格 = 当前采用的每股现金分红 ÷ 目标股息率。分红可能调整，结果仅作静态比较。
                  </p>
                  <div className="dividend-sources">
                    <span>
                      {data?.dividendBasis ?? selectedStock.dividendBasis}
                      {"；"}
                      {data?.dividendAsOf ?? selectedStock.dividendAsOf}
                    </span>
                    {(data?.dividendSources ?? selectedStock.dividendSources).map(
                      (source) => (
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                          key={source.url}
                        >
                          {source.label} ↗
                        </a>
                      ),
                    )}
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      </section>

      <footer>
        <p>行情与股息测算仅供信息展示，不构成任何投资建议。</p>
        <span>{data?.symbol ?? selectedStock.symbol} · A-SHARE MARKET</span>
      </footer>
    </main>
  );
}

function KLineChart({ quotes }: { quotes: DailyQuote[] }) {
  if (quotes.length === 0) {
    return (
      <div className="kline-loading" aria-label="K线数据加载中">
        <Skeleton height={320} borderRadius={14} baseColor="#f0f1eb" highlightColor="#ffffff" />
      </div>
    );
  }

  const width = 1100;
  const height = 460;
  const padding = { top: 34, right: 72, bottom: 48, left: 14 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const rawMin = Math.min(...quotes.map((quote) => quote.low));
  const rawMax = Math.max(...quotes.map((quote) => quote.high));
  const paddingValue = Math.max((rawMax - rawMin) * 0.08, 0.5);
  const chartMin = rawMin - paddingValue;
  const chartMax = rawMax + paddingValue;
  const priceRange = chartMax - chartMin;
  const step = plotWidth / quotes.length;
  const candleWidth = Math.min(22, Math.max(7, step * 0.58));
  const toY = (value: number) =>
    padding.top + ((chartMax - value) / priceRange) * plotHeight;
  const gridLines = Array.from({ length: 5 }, (_, index) => {
    const value = chartMax - (priceRange / 4) * index;
    return { value, y: toY(value) };
  });
  const labelIndexes = Array.from(
    new Set([0, Math.floor((quotes.length - 1) / 2), quotes.length - 1]),
  );
  const closeLinePoints = quotes
    .map((quote, index) => {
      const centerX = padding.left + step * index + step / 2;
      return `${centerX},${toY(quote.close)}`;
    })
    .join(" ");

  return (
    <div className="kline-scroll">
      <svg
        className="kline-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="近30个交易日K线图，红色上涨，绿色下跌"
      >
        {gridLines.map((line) => (
          <g key={line.value}>
            <line
              className="kline-grid-line"
              x1={padding.left}
              y1={line.y}
              x2={padding.left + plotWidth}
              y2={line.y}
            />
            <text
              className="kline-price-label"
              x={padding.left + plotWidth + 10}
              y={line.y + 4}
            >
              {line.value.toFixed(2)}
            </text>
          </g>
        ))}

        <polyline
          className="kline-close-line"
          points={closeLinePoints}
          aria-hidden="true"
        />

        {quotes.map((quote, index) => {
          const centerX = padding.left + step * index + step / 2;
          const openY = toY(quote.open);
          const closeY = toY(quote.close);
          const bodyY = Math.min(openY, closeY);
          const bodyHeight = Math.max(Math.abs(closeY - openY), 2);
          const labelOffset = (index % 3) * 4;
          const closeLabelY =
            quote.close >= quote.open
              ? Math.max(padding.top + 10, closeY - 9 - labelOffset)
              : Math.min(
                  padding.top + plotHeight - 2,
                  closeY + 15 + labelOffset,
                );
          const direction =
            quote.close > quote.open
              ? "candle-up"
              : quote.close < quote.open
                ? "candle-down"
                : "candle-flat";
          const showCloseLabel =
            index % 2 === 0 || index === quotes.length - 1;

          return (
            <g
              className={`kline-candle ${direction}`}
              tabIndex={0}
              aria-label={`${quote.tradeDate}，开盘 ${quote.open}，最高 ${quote.high}，最低 ${quote.low}，收盘 ${quote.close}`}
              key={quote.tradeDate}
            >
              <title>
                {`${quote.tradeDate}  开 ${quote.open.toFixed(2)}  高 ${quote.high.toFixed(2)}  低 ${quote.low.toFixed(2)}  收 ${quote.close.toFixed(2)}`}
              </title>
              <line
                className="candle-wick"
                x1={centerX}
                y1={toY(quote.high)}
                x2={centerX}
                y2={toY(quote.low)}
              />
              <rect
                className="candle-body"
                x={centerX - candleWidth / 2}
                y={bodyY}
                width={candleWidth}
                height={bodyHeight}
                rx={1}
              />
              <circle
                className="candle-close-point"
                cx={centerX}
                cy={closeY}
                r={2.8}
                aria-hidden="true"
              />
              {showCloseLabel && (
                <text
                  className="candle-price-label close"
                  x={centerX}
                  y={closeLabelY}
                  textAnchor="middle"
                  aria-hidden="true"
                >
                  {quote.close.toFixed(2)}
                </text>
              )}
            </g>
          );
        })}

        {labelIndexes.map((index) => {
          const quote = quotes[index];
          const x = padding.left + step * index + step / 2;
          return (
            <text
              className="kline-date-label"
              textAnchor={index === 0 ? "start" : index === quotes.length - 1 ? "end" : "middle"}
              x={x}
              y={height - 10}
              key={quote.tradeDate}
            >
              {quote.tradeDate.slice(5).replace("-", ".")}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function FinancialMetric({
  label,
  value,
  change,
  period,
}: {
  label: string;
  value: string;
  change?: number | null;
  period: string;
}) {
  return (
    <article className="financial-metric">
      <div>
        <span>{label}</span>
        <small>{period}</small>
      </div>
      <strong>{value}</strong>
      {change !== undefined && (
        <p className={financialChangeClass(change)}>
          同比 {formatSignedPercent(change)}
        </p>
      )}
    </article>
  );
}

function PriceCard({
  label,
  value,
  accent,
  index,
}: {
  label: string;
  value?: number;
  accent: "amber" | "coral" | "blue" | "lime";
  index: string;
}) {
  return (
    <article className={`price-card ${accent}`}>
      <div>
        <span className="card-index">{index}</span>
        <span className="card-label">{label}</span>
      </div>
      <p>
        <span>¥</span>
        {value === undefined ? (
          <Skeleton width={108} baseColor="#e9ebe4" highlightColor="#ffffff" />
        ) : (
          <strong>{numberFormatter.format(value)}</strong>
        )}
      </p>
    </article>
  );
}

function formatTradeDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "short",
    timeZone: "Asia/Shanghai",
  }).format(new Date(`${value}T12:00:00+08:00`));
}

function formatMarketName(market: string) {
  if (market === "上交所") return "沪市A股";
  if (market === "深交所") return "深市A股";
  return market;
}

function stockMatchesFilters(
  stock: StockSummary,
  marketFilter: MarketFilter,
  categoryFilter: CategoryFilter,
  bollFilters: BollFilterState,
) {
  return (
    (marketFilter === "all" || stock.market === marketFilter) &&
    (categoryFilter === "all" || stock.category === categoryFilter) &&
    BOLL_PERIOD_FILTERS.every(
      ({ period }) =>
        bollFilters[period] === "all" ||
        stock.bollPositions[period] === bollFilters[period],
    )
  );
}

function sortStocks(stocks: StockSummary[], sortMode: StockSort) {
  return [...stocks].sort((left, right) => {
    if (sortMode === "dividend") {
      const dividendDifference =
        (right.currentDividendYield ?? Number.NEGATIVE_INFINITY) -
        (left.currentDividendYield ?? Number.NEGATIVE_INFINITY);
      if (dividendDifference !== 0) return dividendDifference;
    }

    return (
      right.score - left.score || left.name.localeCompare(right.name, "zh-CN")
    );
  });
}

function getBollPositionClass(position: BollPosition) {
  if (position === "上轨以上") return "above";
  if (position === "中上") return "upper-middle";
  if (position === "中下") return "lower-middle";
  if (position === "下轨以下") return "below";
  return "unavailable";
}

function formatTableDate(value: string) {
  const [, month, day] = value.split("-");
  return `${month}.${day}`;
}

function formatSyncTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Shanghai",
  }).format(new Date(value));
}

function buildRecentDays(quotes: DailyQuote[]) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [year, month, day] = today.split("-").map(Number);
  const quoteMap = new Map(quotes.map((quote) => [quote.tradeDate, quote]));

  return Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(Date.UTC(year, month - 1, day - offset))
      .toISOString()
      .slice(0, 10);

    return {
      date,
      isToday: offset === 0,
      quote: quoteMap.get(date),
    };
  });
}

function formatWeekday(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    weekday: "short",
    timeZone: "Asia/Shanghai",
  }).format(new Date(`${value}T12:00:00+08:00`));
}

function formatAmplitude(quote: DailyQuote, quotes: DailyQuote[]) {
  const quoteIndex = quotes.findIndex(
    (item) => item.tradeDate === quote.tradeDate,
  );
  const previousClose = quotes[quoteIndex + 1]?.close;

  if (!previousClose) return "—";

  return `${(((quote.high - quote.low) / previousClose) * 100).toFixed(2)}%`;
}

function calculateCloseChangePercent(
  quote: DailyQuote,
  quotes: DailyQuote[],
) {
  const quoteIndex = quotes.findIndex(
    (item) => item.tradeDate === quote.tradeDate,
  );
  const previousClose = quotes[quoteIndex + 1]?.close;

  if (!previousClose) return null;

  return ((quote.close - previousClose) / previousClose) * 100;
}

function formatSignedDifference(value: number) {
  return `${value >= 0 ? "+" : ""}${numberFormatter.format(value)}`;
}

function formatFinancialAmount(value: number | null) {
  if (value === null) return "—";

  const absoluteValue = Math.abs(value);
  if (absoluteValue >= 1_000_000_000_000) {
    return `${(value / 1_000_000_000_000).toFixed(2)} 万亿`;
  }
  if (absoluteValue >= 100_000_000) {
    return `${(value / 100_000_000).toFixed(2)} 亿`;
  }
  if (absoluteValue >= 10_000) {
    return `${(value / 10_000).toFixed(2)} 万`;
  }
  return numberFormatter.format(value);
}

function formatFinancialPercent(value: number | null) {
  return value === null ? "—" : `${value.toFixed(2)}%`;
}

function formatSignedPercent(value: number | null) {
  if (value === null) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function financialChangeClass(value: number | null) {
  if (value === null || value === 0) return "";
  return value > 0 ? "financial-positive" : "financial-negative";
}

function buildFundamentalInsights(
  reports: FinancialReport[],
  category: StockCategory,
) {
  const latestReport = reports[0];
  const annualReports = reports.filter(
    (report) => report.reportType === "年报",
  );
  const latestAnnualReport = annualReports[0];
  const oldestAnnualReport = annualReports.at(-1);

  if (!latestReport || !latestAnnualReport || !oldestAnnualReport) return [];

  const periods = Math.max(annualReports.length - 1, 1);
  const revenueCagr = calculateCompoundGrowth(
    latestAnnualReport.revenue,
    oldestAnnualReport.revenue,
    periods,
  );
  const profitCagr = calculateCompoundGrowth(
    latestAnnualReport.netProfit,
    oldestAnnualReport.netProfit,
    periods,
  );
  const roeChange =
    latestAnnualReport.roe === null || oldestAnnualReport.roe === null
      ? null
      : latestAnnualReport.roe - oldestAnnualReport.roe;
  const qualityInsight = category === "银行"
    ? {
        label: "资产质量",
        title:
          latestReport.nonPerformingLoanRatio === null
            ? "不良率数据不足"
            : `不良率 ${latestReport.nonPerformingLoanRatio.toFixed(2)}%`,
        description: `最新拨备覆盖率 ${formatFinancialPercent(latestReport.provisionCoverageRatio)}；不良率越低、拨备覆盖率越高通常代表风险缓冲更充分。`,
        tone:
          latestReport.nonPerformingLoanRatio === null
            ? "neutral"
            : latestReport.nonPerformingLoanRatio <= 1
              ? "positive"
              : latestReport.nonPerformingLoanRatio >= 1.5
                ? "negative"
                : "neutral",
      }
    : category === "金融"
      ? {
          label: "资本积累",
          title:
            latestReport.bookValueGrowth === null
              ? "净资产增速数据不足"
              : `每股净资产同比 ${formatSignedPercent(latestReport.bookValueGrowth)}`,
          description: `最新每股净资产 ${latestReport.bookValuePerShare === null ? "—" : `¥${latestReport.bookValuePerShare.toFixed(2)}`}；保险金融公司不使用普通企业资产负债率直接扣分。`,
          tone: trendTone(latestReport.bookValueGrowth),
        }
      : {
        label: "财务结构",
        title:
          latestReport.debtRatio === null
            ? "负债率数据不足"
            : `资产负债率 ${latestReport.debtRatio.toFixed(2)}%`,
        description: `最新每股净资产 ${latestReport.bookValuePerShare === null ? "—" : `¥${latestReport.bookValuePerShare.toFixed(2)}`}，资产负债率需结合行业经营模式解读。`,
        tone: "neutral",
        };

  return [
    {
      label: "营收趋势",
      title: formatCompoundTrend(revenueCagr),
      description: `${oldestAnnualReport.year}—${latestAnnualReport.year} 年，营业总收入由 ${formatFinancialAmount(oldestAnnualReport.revenue)} 变为 ${formatFinancialAmount(latestAnnualReport.revenue)}。`,
      tone: trendTone(revenueCagr),
    },
    {
      label: "利润趋势",
      title: formatCompoundTrend(profitCagr),
      description: `${oldestAnnualReport.year}—${latestAnnualReport.year} 年，归母净利润由 ${formatFinancialAmount(oldestAnnualReport.netProfit)} 变为 ${formatFinancialAmount(latestAnnualReport.netProfit)}。`,
      tone: trendTone(profitCagr),
    },
    {
      label: "盈利能力",
      title: latestReport.roe === null ? "ROE 数据不足" : `ROE ${latestReport.roe.toFixed(2)}%`,
      description:
        roeChange === null
          ? "暂时无法比较三年前后的净资产收益率。"
          : `${oldestAnnualReport.year}—${latestAnnualReport.year} 年报 ROE ${roeChange >= 0 ? "提升" : "下降"} ${Math.abs(roeChange).toFixed(2)} 个百分点。`,
      tone: trendTone(roeChange),
    },
    qualityInsight,
  ];
}

function calculateCompoundGrowth(
  latestValue: number | null,
  oldestValue: number | null,
  periods: number,
) {
  if (
    latestValue === null ||
    oldestValue === null ||
    latestValue <= 0 ||
    oldestValue <= 0
  ) {
    return null;
  }

  return (Math.pow(latestValue / oldestValue, 1 / periods) - 1) * 100;
}

function formatCompoundTrend(value: number | null) {
  if (value === null) return "趋势数据不足";
  return value >= 0
    ? `年均增长 ${value.toFixed(2)}%`
    : `年均下降 ${Math.abs(value).toFixed(2)}%`;
}

function trendTone(value: number | null) {
  if (value === null || value === 0) return "neutral";
  return value > 0 ? "positive" : "negative";
}
