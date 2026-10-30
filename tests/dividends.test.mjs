import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateAnnualDividend,
  calculateDividendYearCount,
  mergeDividendRecords,
} from "../scripts/dividends.mjs";

const implemented = (fiscalYear, pretaxBonus, exDividendDate, isAnnual) => ({
  FISCAL_YEAR: fiscalYear,
  IS_ANNUAL: isAnnual,
  PRETAX_BONUS_RMB: pretaxBonus,
  ASSIGN_PROGRESS: "实施分配",
  EX_DIVIDEND_DATE: exDividendDate,
});

test("成都银行忽略未完成年度的中期分红", () => {
  const result = calculateAnnualDividend([
    implemented(2026, 4.89, "2026-09-18", false),
    implemented(2025, 9.21, "2026-07-13", true),
  ], "2026-10-30");

  assert.deepEqual(result, {
    annualDividend: 0.921,
    dividendCount: 1,
    dividendFiscalYear: 2025,
  });
});

test("中国平安合并同一完整年度的中期和末期分红", () => {
  const records = [
    implemented(2026, 9.8, "2026-10-24", false),
    implemented(2025, 17.5, "2026-06-30", true),
    implemented(2025, 9.5, "2025-10-24", false),
    implemented(2024, 16.2, "2025-06-27", true),
  ];
  const result = calculateAnnualDividend(records, "2026-10-30");

  assert.equal(result.annualDividend, 2.7);
  assert.equal(result.dividendCount, 2);
  assert.equal(result.dividendFiscalYear, 2025);
  assert.equal(calculateDividendYearCount(records, 2025, "2026-10-30"), 2);
});

test("云南白药不会把两个财年的特别分红混加", () => {
  const result = calculateAnnualDividend([
    implemented(2026, 10.38, "2026-09-24", false),
    implemented(2025, 15.83, "2026-04-30", true),
    implemented(2025, 10.19, "2025-09-24", false),
  ], "2026-10-30");

  assert.equal(result.annualDividend, 2.602);
  assert.equal(result.dividendCount, 2);
  assert.equal(result.dividendFiscalYear, 2025);
});

test("美的集团使用已完成年度并排除尚未实施方案", () => {
  const result = calculateAnnualDividend([
    {
      ...implemented(2026, 5, "2026-12-01", false),
      ASSIGN_PROGRESS: "预案",
    },
    implemented(2025, 38, "2026-05-15", true),
    implemented(2025, 5, "2025-10-17", false),
  ], "2026-10-30");

  assert.deepEqual(result, {
    annualDividend: 4.3,
    dividendCount: 2,
    dividendFiscalYear: 2025,
  });
});

test("当本年度完整年报分红已经实施时采用本年度", () => {
  const result = calculateAnnualDividend([
    implemented(2026, 12, "2027-06-01", true),
    implemented(2026, 6, "2026-10-01", false),
    implemented(2025, 10, "2026-06-01", true),
  ], "2027-06-02");

  assert.deepEqual(result, {
    annualDividend: 1.8,
    dividendCount: 2,
    dividendFiscalYear: 2026,
  });
});

test("合并两个数据源时忽略仅有小数精度差异的重复记录", () => {
  const records = mergeDividendRecords(
    [implemented(2025, 14.354904, "2026-05-25", true)],
    [implemented(2025, 14.3549, "2026-05-25", true)],
  );

  assert.equal(records.length, 1);
  assert.equal(records[0].PRETAX_BONUS_RMB, 14.354904);
});
