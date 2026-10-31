import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateBollPosition,
  calculateBollPositions,
} from "../scripts/boll.mjs";

test("BOLL position identifies upper and lower rail breaks", () => {
  assert.equal(calculateBollPosition([...Array(19).fill(10), 30]), "上轨以上");
  assert.equal(calculateBollPosition([...Array(19).fill(10), 1]), "下轨以下");
  assert.equal(calculateBollPosition(Array(20).fill(10)), "中上");
  assert.equal(calculateBollPosition(Array(19).fill(10)), "数据不足");
});

test("daily weekly and monthly BOLL use their own closing periods", () => {
  const start = Date.UTC(2024, 0, 1);
  const quotes = Array.from({ length: 730 }, (_, index) => ({
    tradeDate: new Date(start + index * 86_400_000).toISOString().slice(0, 10),
    close: index === 729 ? 30 : 10,
  })).reverse();

  assert.deepEqual(calculateBollPositions(quotes), {
    daily: "上轨以上",
    weekly: "上轨以上",
    monthly: "上轨以上",
  });
});
