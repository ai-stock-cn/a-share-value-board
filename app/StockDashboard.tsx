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

type AnnualReport = {
  year: string;
  reportDate: string;
  noticeDate: string;
  revenue: number | null;
  revenueGrowth: number | null;
  netProfit: number | null;
  netProfitGrowth: number | null;
  eps: number | null;
  roe: number | null;
  bookValuePerShare: number | null;
  debtRatio: number | null;
};

type StockCategory = "金融" | "电力" | "消费" | "电器" | "运营商" | "中药";

type StockSummary = {
  symbol: string;
  name: string;
  code: string;
  market: string;
  category: StockCategory;
  mark: string;
  score: number;
  annualDividend: number;
  dividendBasis: string;
  dividendAsOf: string;
  dividendSources: DividendSource[];
  latestClose: number | null;
  changePercent: number | null;
  currentDividendYield: number | null;
  turnoverRate: number | null;
  annualReports: AnnualReport[];
};

type MarketFilter = "all" | "上交所" | "深交所";
type CategoryFilter = "all" | StockCategory;

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
    annualDividend: 2.7,
    dividendBasis: "2025 年中期 0.95 元 + 末期 1.75 元",
    dividendAsOf: "2025 年度",
    dividendSources: [],
    latestClose: null,
    changePercent: null,
    currentDividendYield: null,
    turnoverRate: null,
    annualReports: [],
  },
  {
    symbol: "000538.SZ",
    name: "云南白药",
    code: "000538",
    market: "深交所",
    category: "中药",
    mark: "云",
    score: 90,
    annualDividend: 2.602,
    dividendBasis: "2025 年特别分红 1.019 元 + 年度分红 1.583 元",
    dividendAsOf: "2025 年度合计",
    dividendSources: [],
    latestClose: null,
    changePercent: null,
    currentDividendYield: null,
    turnoverRate: null,
    annualReports: [],
  },
];

const DIVIDEND_YIELD_TIERS = [6.5, 6, 5.5, 5, 4.5, 4];
const MARKET_FILTERS: Array<{ value: MarketFilter; label: string }> = [
  { value: "all", label: "全部" },
  { value: "上交所", label: "沪市" },
  { value: "深交所", label: "深市" },
];
const CATEGORY_FILTERS: Array<{ value: CategoryFilter; label: string }> = [
  { value: "all", label: "全部分类" },
  { value: "金融", label: "金融" },
  { value: "电力", label: "电力" },
  { value: "消费", label: "消费" },
  { value: "电器", label: "电器" },
  { value: "运营商", label: "运营商" },
  { value: "中药", label: "中药" },
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
  const stockSelectorRef = useRef<HTMLDetailsElement>(null);

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

      const selectedStock = payload.stocks.find(
        (stock) => stock.symbol === selectedSymbol,
      );
      const quotes = payload.quotesBySymbol[selectedSymbol] ?? [];

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
    () =>
      [...stocks].sort(
        (left, right) =>
          right.score - left.score || left.name.localeCompare(right.name, "zh-CN"),
      ),
    [stocks],
  );
  const selectedStock =
    rankedStocks.find((stock) => stock.symbol === selectedSymbol) ??
    rankedStocks[0];
  const filteredStocks = useMemo(
    () =>
      rankedStocks.filter(
        (stock) =>
          (marketFilter === "all" || stock.market === marketFilter) &&
          (categoryFilter === "all" || stock.category === categoryFilter),
      ),
    [categoryFilter, marketFilter, rankedStocks],
  );
  const latest = data?.quotes[0];
  const previous = data?.quotes[1];
  const change = latest && previous ? latest.close - previous.close : 0;
  const changePercent = previous ? (change / previous.close) * 100 : 0;
  const direction = change > 0 ? "up" : change < 0 ? "down" : "flat";
  const annualDividend = data?.annualDividend ?? selectedStock.annualDividend;
  const annualReports = data?.annualReports ?? selectedStock.annualReports;
  const latestAnnualReport = annualReports[0];
  const fundamentalInsights = buildFundamentalInsights(annualReports);
  const currentDividendYield = latest
    ? (annualDividend / latest.close) * 100
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
                    let firstMatch = rankedStocks.find(
                      (stock) =>
                        (nextFilter === "all" || stock.market === nextFilter) &&
                        (categoryFilter === "all" || stock.category === categoryFilter),
                    );

                    setMarketFilter(nextFilter);
                    if (!firstMatch && categoryFilter !== "all") {
                      setCategoryFilter("all");
                      firstMatch = rankedStocks.find(
                        (stock) => nextFilter === "all" || stock.market === nextFilter,
                      );
                    }
                    if (firstMatch) setSelectedSymbol(firstMatch.symbol);
                    if (stockSelectorRef.current) stockSelectorRef.current.open = false;
                  }}
                >
                  {MARKET_FILTERS.map((filter) => {
                    const count = rankedStocks.filter(
                      (stock) =>
                        (filter.value === "all" || stock.market === filter.value) &&
                        (categoryFilter === "all" || stock.category === categoryFilter),
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
                    let firstMatch = rankedStocks.find(
                      (stock) =>
                        (nextFilter === "all" || stock.category === nextFilter) &&
                        (marketFilter === "all" || stock.market === marketFilter),
                    );

                    setCategoryFilter(nextFilter);
                    if (!firstMatch && marketFilter !== "all") {
                      setMarketFilter("all");
                      firstMatch = rankedStocks.find(
                        (stock) => nextFilter === "all" || stock.category === nextFilter,
                      );
                    }
                    if (firstMatch) setSelectedSymbol(firstMatch.symbol);
                    if (stockSelectorRef.current) stockSelectorRef.current.open = false;
                  }}
                >
                  {CATEGORY_FILTERS.map((filter) => {
                    const count = rankedStocks.filter(
                      (stock) =>
                        (filter.value === "all" || stock.category === filter.value) &&
                        (marketFilter === "all" || stock.market === marketFilter),
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
          </div>
          <details className="stock-selector" ref={stockSelectorRef}>
            <summary className="stock-selector-current">
              <span className="stock-mark">{selectedStock.mark}</span>
              <span className="stock-identity">
                <strong>{selectedStock.name}</strong>
                <small>
                  {selectedStock.category} · {formatMarketName(selectedStock.market)} ·{" "}
                  {selectedStock.symbol}
                </small>
              </span>
              <span className="stock-list-price">
                <strong>
                  {selectedStock.latestClose === null
                    ? "—"
                    : `¥${numberFormatter.format(selectedStock.latestClose)}`}
                </strong>
                <small>
                  {selectedStock.currentDividendYield === null
                    ? "股息率 —"
                    : `股息率 ${selectedStock.currentDividendYield.toFixed(2)}%`}
                </small>
              </span>
              <span className="stock-score">
                <small>评分</small>
                <strong>{selectedStock.score}</strong>
                <i className="selector-chevron" aria-hidden="true">
                  ⌄
                </i>
              </span>
            </summary>
            <div className="stock-options">
              <div
                className="stock-option-list"
                role="listbox"
                aria-label="按评分选择股票"
              >
                {filteredStocks.map((stock) => {
                  const rank = rankedStocks.indexOf(stock) + 1;

                  return (
                    <button
                      type="button"
                      role="option"
                      aria-selected={selectedSymbol === stock.symbol}
                      className={`stock-option ${
                        selectedSymbol === stock.symbol ? "is-active" : ""
                      }`}
                      onClick={() => {
                        setSelectedSymbol(stock.symbol);
                        if (stockSelectorRef.current) {
                          stockSelectorRef.current.open = false;
                        }
                      }}
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
                    </button>
                  );
                })}
              </div>
            </div>
          </details>
          <p className="stock-rail-note">
            可按市场和分类筛选；评分越高越靠前。
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
                  <div className="quote-metrics">
                    <div className={`change-summary ${direction}`}>
                      <span>较前收</span>
                      <strong>
                        {change >= 0 ? "+" : ""}
                        {numberFormatter.format(change)}
                      </strong>
                      <small>
                        {changePercent >= 0 ? "+" : ""}
                        {changePercent.toFixed(2)}%
                      </small>
                    </div>
                    <div className="dividend-highlight">
                      <span>当前股息率</span>
                      <strong>
                        {currentDividendYield?.toFixed(2) ?? "—"}%
                      </strong>
                      <small>
                        每股股息 ¥{dividendFormatter.format(annualDividend)}
                      </small>
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
                    <span className="section-kicker">最近三年年报</span>
                    <h2>基本面分析</h2>
                  </div>
                  <div className="fundamentals-source">
                    <span>公开财务数据</span>
                    <strong>{annualReports.length ? `${annualReports.at(-1)?.year}—${annualReports[0]?.year}` : "等待数据"}</strong>
                  </div>
                </div>

                {latestAnnualReport ? (
                  <>
                    <div className="fundamental-summary">
                      <FinancialMetric
                        label="营业总收入"
                        value={formatFinancialAmount(latestAnnualReport.revenue)}
                        change={latestAnnualReport.revenueGrowth}
                        year={latestAnnualReport.year}
                      />
                      <FinancialMetric
                        label="归母净利润"
                        value={formatFinancialAmount(latestAnnualReport.netProfit)}
                        change={latestAnnualReport.netProfitGrowth}
                        year={latestAnnualReport.year}
                      />
                      <FinancialMetric
                        label="净资产收益率"
                        value={formatFinancialPercent(latestAnnualReport.roe)}
                        year={latestAnnualReport.year}
                      />
                      <FinancialMetric
                        label="基本每股收益"
                        value={latestAnnualReport.eps === null ? "—" : `¥${latestAnnualReport.eps.toFixed(2)}`}
                        year={latestAnnualReport.year}
                      />
                    </div>

                    <div className="fundamental-insights" aria-label="三年基本面观察">
                      {fundamentalInsights.map((insight, index) => (
                        <article className={`fundamental-insight ${insight.tone}`} key={insight.label}>
                          <span>{String(index + 1).padStart(2, "0")} · {insight.label}</span>
                          <strong>{insight.title}</strong>
                          <p>{insight.description}</p>
                        </article>
                      ))}
                    </div>

                    <div className="fundamental-table-heading">
                      <strong>近三年核心财务指标</strong>
                      <span>金额单位：人民币</span>
                    </div>
                    <div className="table-wrap fundamental-table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>年度</th>
                            <th>营业总收入</th>
                            <th>营收同比</th>
                            <th>归母净利润</th>
                            <th>净利润同比</th>
                            <th>基本EPS</th>
                            <th>ROE</th>
                            <th>每股净资产</th>
                            <th>资产负债率</th>
                          </tr>
                        </thead>
                        <tbody>
                          {annualReports.map((report) => (
                            <tr key={report.year}>
                              <td><strong>{report.year}</strong></td>
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
                              <td>{report.bookValuePerShare === null ? "—" : `¥${report.bookValuePerShare.toFixed(2)}`}</td>
                              <td>{formatFinancialPercent(report.debtRatio)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="fundamentals-note">
                      数据为年度报告口径，来源于东方财富公开财务数据。同比和趋势仅用于快速比较，不构成投资建议。
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
                    <span>{data?.dividendBasis ?? selectedStock.dividendBasis}</span>
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
  year,
}: {
  label: string;
  value: string;
  change?: number | null;
  year: string;
}) {
  return (
    <article className="financial-metric">
      <div>
        <span>{label}</span>
        <small>{year} 年</small>
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

function buildFundamentalInsights(reports: AnnualReport[]) {
  const latestReport = reports[0];
  const oldestReport = reports.at(-1);

  if (!latestReport || !oldestReport) return [];

  const periods = Math.max(reports.length - 1, 1);
  const revenueCagr = calculateCompoundGrowth(
    latestReport.revenue,
    oldestReport.revenue,
    periods,
  );
  const profitCagr = calculateCompoundGrowth(
    latestReport.netProfit,
    oldestReport.netProfit,
    periods,
  );
  const roeChange =
    latestReport.roe === null || oldestReport.roe === null
      ? null
      : latestReport.roe - oldestReport.roe;

  return [
    {
      label: "营收趋势",
      title: formatCompoundTrend(revenueCagr),
      description: `${oldestReport.year}—${latestReport.year} 年，营业总收入由 ${formatFinancialAmount(oldestReport.revenue)} 变为 ${formatFinancialAmount(latestReport.revenue)}。`,
      tone: trendTone(revenueCagr),
    },
    {
      label: "利润趋势",
      title: formatCompoundTrend(profitCagr),
      description: `${oldestReport.year}—${latestReport.year} 年，归母净利润由 ${formatFinancialAmount(oldestReport.netProfit)} 变为 ${formatFinancialAmount(latestReport.netProfit)}。`,
      tone: trendTone(profitCagr),
    },
    {
      label: "盈利能力",
      title: latestReport.roe === null ? "ROE 数据不足" : `ROE ${latestReport.roe.toFixed(2)}%`,
      description:
        roeChange === null
          ? "暂时无法比较三年前后的净资产收益率。"
          : `较 ${oldestReport.year} 年${roeChange >= 0 ? "提升" : "下降"} ${Math.abs(roeChange).toFixed(2)} 个百分点。`,
      tone: trendTone(roeChange),
    },
    {
      label: "财务结构",
      title: latestReport.debtRatio === null ? "负债率数据不足" : `资产负债率 ${latestReport.debtRatio.toFixed(2)}%`,
      description: `最新每股净资产 ${latestReport.bookValuePerShare === null ? "—" : `¥${latestReport.bookValuePerShare.toFixed(2)}`}，资产负债率需结合行业经营模式解读。`,
      tone: "neutral",
    },
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
