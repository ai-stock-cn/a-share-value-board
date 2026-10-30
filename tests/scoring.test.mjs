import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateFundamentalScore,
  calculateQualityScore,
} from "../scripts/scoring.mjs";

const baseReports = [
  {
    reportType: "三季报",
    reportDate: "2026-09-30",
    revenue: 100,
    revenueGrowth: -12.58,
    netProfit: 13.27,
    netProfitGrowth: -27.26,
    roe: 9.4,
    bookValuePerShare: 57.67,
    bookValueGrowth: 5.88,
    debtRatio: 89.8,
    nonPerformingLoanRatio: null,
    provisionCoverageRatio: null,
  },
  {
    reportType: "年报",
    reportDate: "2025-12-31",
    revenue: 100,
    revenueGrowth: 2.1,
    netProfit: 12.83,
    netProfitGrowth: 6.45,
    roe: 14,
    bookValuePerShare: 55.25,
    bookValueGrowth: 8.35,
    debtRatio: 89.8,
    nonPerformingLoanRatio: null,
    provisionCoverageRatio: null,
  },
  {
    reportType: "年报",
    reportDate: "2024-12-31",
    revenue: 100,
    revenueGrowth: 12.6,
    netProfit: 12.3,
    netProfitGrowth: 47.79,
    roe: 13.8,
    bookValuePerShare: 50.99,
    bookValueGrowth: 3.28,
    debtRatio: 89.9,
    nonPerformingLoanRatio: null,
    provisionCoverageRatio: null,
  },
  {
    reportType: "年报",
    reportDate: "2023-12-31",
    revenue: 100,
    revenueGrowth: 3.8,
    netProfit: 9.37,
    netProfitGrowth: -22.83,
    roe: 9.7,
    bookValuePerShare: 49.37,
    bookValueGrowth: 9.2,
    debtRatio: 89.4,
    nonPerformingLoanRatio: null,
    provisionCoverageRatio: null,
  },
];

test("insurance quality does not penalize normal insurance liabilities", () => {
  const highDebtScore = calculateQualityScore("金融", baseReports);
  const lowDebtScore = calculateQualityScore(
    "金融",
    baseReports.map((report) => ({ ...report, debtRatio: 35 })),
  );

  assert.equal(highDebtScore, lowDebtScore);
  assert.ok(highDebtScore > 10);
});

test("bank quality rewards lower NPL and stronger provision coverage", () => {
  const strongerBank = calculateQualityScore("银行", [
    {
      ...baseReports[0],
      nonPerformingLoanRatio: 0.9,
      provisionCoverageRatio: 280,
    },
  ]);
  const weakerBank = calculateQualityScore("银行", [
    {
      ...baseReports[0],
      nonPerformingLoanRatio: 1.8,
      provisionCoverageRatio: 130,
    },
  ]);

  assert.ok(strongerBank > weakerBank);
});

test("capital-intensive sectors receive an industry-adjusted debt range", () => {
  const reports = baseReports.map((report) => ({
    ...report,
    revenue: 100,
    netProfit: 0,
    debtRatio: 70,
  }));

  assert.ok(
    calculateQualityScore("电力", reports) >
      calculateQualityScore("消费", reports),
  );
});

test("fundamental score stays bounded and keeps all five dimensions", () => {
  const score = calculateFundamentalScore({
    category: "金融",
    reports: baseReports,
    currentDividendYield: 5.17,
    dividendYearCount: 3,
  });

  assert.ok(score.total >= 0 && score.total <= 100);
  assert.deepEqual(Object.keys(score.breakdown), [
    "profitability",
    "growth",
    "dividend",
    "quality",
    "stability",
  ]);
  assert.ok(score.total > 49);
});
