import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateStockAlerts,
  formatAlertMessage,
  formatShanghaiDate,
} from "../scripts/alerts.mjs";

test("价格达到建仓起点时触发提醒", () => {
  const alerts = evaluateStockAlerts([
    {
      name: "中国移动",
      symbol: "600941.SH",
      latestClose: 89.5,
      changePercent: -1.2,
      watchPrice: 90,
      dailyDropAlertPercent: -3,
      currentDividendYield: 5.25,
    },
  ]);

  assert.equal(alerts.length, 1);
  assert.match(alerts[0].reasons[0], /达到建仓起点/);
});

test("达到单日跌幅阈值时触发提醒", () => {
  const alerts = evaluateStockAlerts([
    {
      name: "云南白药",
      symbol: "000538.SZ",
      latestClose: 51,
      changePercent: -3.2,
      watchPrice: 50,
      dailyDropAlertPercent: -3,
      currentDividendYield: 5.1,
    },
  ]);

  assert.equal(alerts.length, 1);
  assert.match(alerts[0].reasons[0], /达到 -3\.00% 提醒线/);
});

test("未达到任何阈值时不发送提醒", () => {
  const alerts = evaluateStockAlerts([
    {
      name: "云南白药",
      latestClose: 53.71,
      changePercent: -0.5,
      watchPrice: 50,
      dailyDropAlertPercent: -3,
    },
  ]);

  assert.deepEqual(alerts, []);
});

test("提醒消息包含股票、原因和网站入口", () => {
  const alerts = evaluateStockAlerts([
    {
      name: "中国移动",
      symbol: "600941.SH",
      latestClose: 89.5,
      changePercent: -3.5,
      watchPrice: 90,
      dailyDropAlertPercent: -3,
      currentDividendYield: 5.25,
    },
  ]);
  const message = formatAlertMessage(alerts, "https://example.com/");

  assert.match(message.title, /1 只股票触发/);
  assert.match(message.description, /中国移动/);
  assert.match(message.description, /https:\/\/example\.com\//);
});

test("按上海时区生成检查日期", () => {
  assert.equal(formatShanghaiDate(new Date("2026-10-30T16:30:00Z")), "2026-10-31");
});
