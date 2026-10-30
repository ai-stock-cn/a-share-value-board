import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;
const templateRoot = new URL("../", import.meta.url);

test("defines the stock dashboard product content", async () => {
  const [dashboard, page] = await Promise.all([
    readFile(new URL("../app/StockDashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(page, /A股价值看板/);
  assert.doesNotMatch(page, developmentPreviewMeta);
  assert.match(dashboard, /中国平安/);
  assert.match(dashboard, /云南白药/);
  assert.match(dashboard, /按分类筛选股票/);
  assert.match(dashboard, /CATEGORY_FILTERS/);
  assert.match(dashboard, /银行/);
  assert.match(dashboard, /电力/);
  assert.match(dashboard, /消费/);
  assert.match(dashboard, /电器/);
  assert.match(dashboard, /运营商/);
  assert.match(dashboard, /中药/);
  assert.match(dashboard, /K 线走势/);
  assert.match(dashboard, /candle-price-label/);
  assert.match(dashboard, /隔日标注收盘价/);
  assert.match(dashboard, /showCloseLabel/);
  assert.match(dashboard, /kline-close-line/);
  assert.match(dashboard, /candle-close-point/);
  assert.match(dashboard, /收盘连线/);
  assert.doesNotMatch(dashboard, /kline-extreme-marker/);
  assert.match(dashboard, /目标股息率对应价格/);
  assert.match(dashboard, /当前股息率/);
  assert.match(dashboard, /换手率/);
  assert.match(dashboard, /基本面分析/);
  assert.match(dashboard, /2026 最新报告/);
  assert.match(dashboard, /近三年年报/);
  assert.match(dashboard, /不良贷款率/);
  assert.match(dashboard, /拨备覆盖率/);
  assert.match(dashboard, /基本面综合评分/);
  assert.match(dashboard, /SCORE_DIMENSIONS/);
  assert.match(dashboard, /分红回报/);
  assert.match(dashboard, /fundamental-insights/);
  assert.match(dashboard, /quote-metrics-table/);
  assert.match(dashboard, /价格与股息摘要/);
  assert.match(dashboard, /stock-selector/);
  assert.match(dashboard, /按评分选择股票/);
  assert.match(dashboard, /按市场筛选股票/);
  assert.match(dashboard, /market-select/);
  assert.match(dashboard, /<select/);
  assert.doesNotMatch(dashboard, /className="market-filter"/);
  assert.match(dashboard, /沪市A股/);
  assert.match(dashboard, /深市A股/);
  assert.match(dashboard, /当日四价/);
  assert.match(dashboard, /quote-session/);
  assert.doesNotMatch(dashboard, /今日区间/);
  assert.match(dashboard, /收盘后更新/);
  assert.match(dashboard, /开盘→最低/);
  assert.match(dashboard, /开盘→最高/);
  assert.match(dashboard, /收盘涨跌幅/);
  assert.match(dashboard, /日内价差/);
  assert.ok(
    dashboard.indexOf("<th>收盘</th>") < dashboard.indexOf("<th>开盘</th>"),
  );
  assert.ok(
    dashboard.indexOf("<th>收盘涨跌幅</th>") < dashboard.indexOf("<th>开盘</th>"),
  );
  assert.ok(
    dashboard.indexOf("<th>日内价差</th>") < dashboard.indexOf("<th>开盘</th>"),
  );
  assert.match(dashboard, /quote\.high - quote\.low/);
  assert.match(dashboard, /calculateCloseChangePercent/);
  assert.match(dashboard, /formatSignedDifference/);
  assert.match(dashboard, /DIVIDEND_YIELD_TIERS/);
  assert.match(dashboard, /最近 7 天/);
  assert.match(dashboard, /近期行情对比/);
  assert.match(dashboard, /comparisonRows/);
  assert.match(dashboard, /market-closed-label/);
  assert.doesNotMatch(dashboard, /className="week-section"/);
  assert.match(dashboard, /601318/);
  assert.match(dashboard, /react-loading-skeleton/);
  assert.match(dashboard, /data\/quotes\.json/);
  assert.ok(
    dashboard.indexOf('className="dividend-section"') >
      dashboard.indexOf('className="history-section"'),
  );
});

test("includes the GitHub Pages update workflow", async () => {
  const [workflow, updater, nextConfig] = await Promise.all([
    readFile(new URL("../.github/workflows/pages.yml", import.meta.url), "utf8"),
    readFile(new URL("../scripts/update-quotes.mjs", import.meta.url), "utf8"),
    readFile(new URL("../next.config.ts", import.meta.url), "utf8"),
  ]);

  assert.match(workflow, /schedule:/);
  assert.match(workflow, /actions\/deploy-pages@v4/);
  assert.match(updater, /中国平安/);
  assert.match(updater, /云南白药/);
  assert.match(updater, /中国核电/);
  assert.match(updater, /双汇发展/);
  assert.match(updater, /格力电器/);
  assert.match(updater, /中国移动/);
  assert.match(updater, /东阿阿胶/);
  assert.match(updater, /招商银行/);
  assert.match(updater, /工商银行/);
  assert.match(updater, /建设银行/);
  assert.match(updater, /RPT_SHAREBONUS_DET/);
  assert.match(updater, /calculateTrailingDividend/);
  assert.match(updater, /calculateFundamentalScore/);
  assert.match(updater, /calculateDividendYearCount/);
  assert.match(updater, /NONPERLOAN/);
  assert.match(updater, /BLDKBBL/);
  assert.match(updater, /right\.score - left\.score/);
  assert.match(updater, /RPT_F10_FINANCE_MAINFINADATA/);
  assert.match(updater, /A_FREE_SHARE/);
  assert.match(updater, /calculateTurnoverRate/);
  assert.match(updater, /TOTALOPERATEREVE/);
  assert.match(updater, /PARENTNETPROFIT/);
  assert.match(nextConfig, /output:\s*"export"/);
});

test("removes starter preview metadata and files", async () => {
  const [css, page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(packageJson, /"react-loading-skeleton": "3\.5\.0"/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(page, /export const metadata:\s*Metadata/);
  assert.doesNotMatch(page, /codex-preview|SkeletonPreview/);
  assert.match(page, /<StockDashboard \/>/);
  assert.match(layout, /A股价值看板/);
  assert.doesNotMatch(layout, /codex-preview|_sites-preview|themeColor|\bViewport\b/);

  await assert.rejects(
    access(new URL("app/_sites-preview/SkeletonPreview.tsx", templateRoot)),
  );
});
