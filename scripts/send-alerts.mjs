import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  evaluateStockAlerts,
  formatAlertMessage,
  formatShanghaiDate,
} from "./alerts.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dataPath = resolve(projectRoot, "public/data/quotes.json");
const siteUrl =
  process.env.ALERT_SITE_URL ??
  "https://ai-stock-cn.github.io/a-share-value-board/";
const sendKey = process.env.SERVERCHAN_SENDKEY;
const data = JSON.parse(await readFile(dataPath, "utf8"));
const watchedStocks = data.stocks.filter(
  (stock) => stock.watchPrice !== null || stock.dailyDropAlertPercent !== null,
);
const latestTradeDate = watchedStocks
  .map((stock) => data.quotesBySymbol[stock.symbol]?.[0]?.tradeDate)
  .filter(Boolean)
  .sort()
  .at(-1);
const today = formatShanghaiDate();

if (latestTradeDate !== today) {
  console.log(`Latest trade date is ${latestTradeDate ?? "unknown"}; no alert for ${today}.`);
  process.exit(0);
}

const alerts = evaluateStockAlerts(watchedStocks);
if (alerts.length === 0) {
  console.log("No stock alert was triggered.");
  process.exit(0);
}

if (!sendKey) {
  console.log("SERVERCHAN_SENDKEY is not configured; alert delivery was skipped.");
  process.exit(0);
}

const message = formatAlertMessage(alerts, siteUrl);
const response = await fetch(
  `https://sctapi.ftqq.com/${encodeURIComponent(sendKey)}.send`,
  {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      title: message.title,
      desp: message.description,
    }),
  },
);
const result = await response.json().catch(() => null);

if (!response.ok || (result?.code !== undefined && result.code !== 0)) {
  throw new Error(`ServerChan delivery failed with status ${response.status}.`);
}

console.log(`Sent ${alerts.length} stock alert(s) through ServerChan.`);
