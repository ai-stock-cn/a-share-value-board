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
  assert.match(dashboard, /K 线走势/);
  assert.match(dashboard, /kline-extreme-marker/);
  assert.match(dashboard, /candle-price-label/);
  assert.match(dashboard, /目标股息率对应价格/);
  assert.match(dashboard, /DIVIDEND_YIELD_TIERS/);
  assert.match(dashboard, /最近 7 天/);
  assert.match(dashboard, /601318/);
  assert.match(dashboard, /react-loading-skeleton/);
  assert.match(dashboard, /data\/quotes\.json/);
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
