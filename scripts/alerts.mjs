export function evaluateStockAlerts(stocks) {
  return stocks.flatMap((stock) => {
    const reasons = [];
    const latestClose = Number(stock.latestClose);
    const changePercent = Number(stock.changePercent);
    const watchPrice = Number(stock.watchPrice);
    const dailyDropAlertPercent = Number(stock.dailyDropAlertPercent);

    if (
      Number.isFinite(latestClose) &&
      Number.isFinite(watchPrice) &&
      watchPrice > 0 &&
      latestClose <= watchPrice
    ) {
      reasons.push(`收盘价 ¥${latestClose.toFixed(2)} 已达到建仓起点 ¥${watchPrice.toFixed(2)}`);
    }

    if (
      Number.isFinite(changePercent) &&
      Number.isFinite(dailyDropAlertPercent) &&
      dailyDropAlertPercent < 0 &&
      changePercent <= dailyDropAlertPercent
    ) {
      reasons.push(
        `当日跌幅 ${changePercent.toFixed(2)}%，达到 ${dailyDropAlertPercent.toFixed(2)}% 提醒线`,
      );
    }

    return reasons.length > 0 ? [{ stock, reasons }] : [];
  });
}

export function formatAlertMessage(alerts, siteUrl) {
  const body = alerts.flatMap(({ stock, reasons }) => [
    `### ${stock.name}（${stock.symbol}）`,
    ...reasons.map((reason) => `- ${reason}`),
    `- 当前股息率：${Number(stock.currentDividendYield).toFixed(2)}%`,
    "",
  ]);

  return {
    title: `A股建仓提醒：${alerts.length} 只股票触发`,
    description: [
      ...body,
      `[打开 A股价值看板](${siteUrl})`,
      "",
      "> 按收盘数据自动检查，仅作信息提醒，不构成投资建议。",
    ].join("\n"),
  };
}

export function formatShanghaiDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}
