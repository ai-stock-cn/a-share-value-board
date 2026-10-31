const CURRENT_REPORT_WEIGHT = 0.45;

export const SCORE_WEIGHTS = Object.freeze({
  dividend: 30,
  profitability: 25,
  stability: 20,
  quality: 15,
  growth: 10,
});

const SCORE_PROFILES = {
  default: {
    roeHigh: 20,
    revenueGrowth: [-10, 20],
    profitGrowth: [-20, 25],
    marginHigh: 20,
    debtBest: 35,
    debtWorst: 90,
  },
  银行: {
    roeHigh: 16,
    revenueGrowth: [-5, 15],
    profitGrowth: [-10, 20],
  },
  金融: {
    roeHigh: 18,
    revenueGrowth: [-10, 15],
    profitGrowth: [-20, 25],
  },
  电力: {
    roeHigh: 14,
    revenueGrowth: [-10, 15],
    profitGrowth: [-20, 30],
    marginHigh: 25,
    debtBest: 45,
    debtWorst: 85,
  },
  运营商: {
    roeHigh: 14,
    revenueGrowth: [-5, 12],
    profitGrowth: [-10, 20],
    marginHigh: 20,
    debtBest: 35,
    debtWorst: 75,
  },
};

export function calculateFundamentalScore({
  category,
  reports,
  currentDividendYield,
  dividendYearCount,
}) {
  if (!Array.isArray(reports) || reports.length === 0) {
    return emptyScore();
  }

  const profile = { ...SCORE_PROFILES.default, ...SCORE_PROFILES[category] };
  const blendedRoe = blendCurrentWithHistory(reports, (report) =>
    annualizeYearToDate(report.roe, report.reportDate),
  );
  const blendedRevenueGrowth = blendCurrentWithHistory(
    reports,
    (report) => report.revenueGrowth,
  );
  const blendedProfitGrowth = blendCurrentWithHistory(
    reports,
    (report) => report.netProfitGrowth,
  );

  const profitability = scaleScore(
    blendedRoe,
    0,
    profile.roeHigh,
    SCORE_WEIGHTS.profitability,
  );
  const growth =
    scaleScore(
      blendedRevenueGrowth,
      profile.revenueGrowth[0],
      profile.revenueGrowth[1],
      SCORE_WEIGHTS.growth * 0.4,
    ) +
    scaleScore(
      blendedProfitGrowth,
      profile.profitGrowth[0],
      profile.profitGrowth[1],
      SCORE_WEIGHTS.growth * 0.6,
    );
  const dividend =
    scaleScore(currentDividendYield, 0, 6.5, SCORE_WEIGHTS.dividend * 0.8) +
    scaleScore(dividendYearCount, 0, 3, SCORE_WEIGHTS.dividend * 0.2);
  const quality = calculateQualityScore(category, reports, profile);
  const stability = calculateStabilityScore(category, reports);
  const total = Math.round(
    Math.min(
      Math.max(profitability + growth + dividend + quality + stability, 0),
      100,
    ),
  );

  return {
    total,
    breakdown: {
      profitability: roundScore(profitability),
      growth: roundScore(growth),
      dividend: roundScore(dividend),
      quality: roundScore(quality),
      stability: roundScore(stability),
    },
  };
}

export function calculateQualityScore(category, reports, profileOverride) {
  const profile = {
    ...SCORE_PROFILES.default,
    ...SCORE_PROFILES[category],
    ...profileOverride,
  };
  const latestReport = reports[0];

  if (category === "银行") {
    return (
      inverseScaleScore(
        latestReport.nonPerformingLoanRatio,
        0.8,
        2,
        SCORE_WEIGHTS.quality * 0.5,
      ) +
      scaleScore(
        latestReport.provisionCoverageRatio,
        100,
        300,
        SCORE_WEIGHTS.quality * 0.5,
      )
    );
  }

  const blendedNetMargin = blendCurrentWithHistory(
    reports,
    calculateNetProfitMargin,
  );

  if (category === "金融") {
    const blendedBookValueGrowth = blendCurrentWithHistory(
      reports,
      (report, index) => calculateBookValueGrowth(reports, report, index),
    );

    return (
      scaleScore(blendedNetMargin, 0, 15, SCORE_WEIGHTS.quality * 0.4) +
      scaleScore(
        blendedBookValueGrowth,
        -5,
        15,
        SCORE_WEIGHTS.quality * 0.6,
      )
    );
  }

  const blendedDebtRatio = blendCurrentWithHistory(
    reports,
    (report) => report.debtRatio,
  );

  return (
    scaleScore(
      blendedNetMargin,
      0,
      profile.marginHigh,
      SCORE_WEIGHTS.quality * 0.5,
    ) +
    inverseScaleScore(
      blendedDebtRatio,
      profile.debtBest,
      profile.debtWorst,
      SCORE_WEIGHTS.quality * 0.5,
    )
  );
}

function calculateStabilityScore(category, reports) {
  if (category === "金融") {
    return (
      calculatePositiveShareScore(
        reports,
        (report, index) => calculateBookValueGrowth(reports, report, index),
        SCORE_WEIGHTS.stability * 0.4,
      ) +
      calculatePositiveShareScore(
        reports,
        (report) => report.netProfitGrowth,
        SCORE_WEIGHTS.stability * 0.6,
      )
    );
  }

  return (
    calculatePositiveShareScore(
      reports,
      (report) => report.revenueGrowth,
      SCORE_WEIGHTS.stability * 0.4,
    ) +
    calculatePositiveShareScore(
      reports,
      (report) => report.netProfitGrowth,
      SCORE_WEIGHTS.stability * 0.6,
    )
  );
}

function blendCurrentWithHistory(reports, getValue) {
  const currentValue = toFiniteNumber(getValue(reports[0], 0));
  const historicalValues = reports
    .slice(1)
    .filter((report) => report.reportType === "年报")
    .map((report, index) => toFiniteNumber(getValue(report, index + 1)))
    .filter((value) => value !== null);
  const historicalMedian = median(historicalValues);

  if (currentValue === null) return historicalMedian;
  if (historicalMedian === null) return currentValue;
  return (
    currentValue * CURRENT_REPORT_WEIGHT +
    historicalMedian * (1 - CURRENT_REPORT_WEIGHT)
  );
}

function calculatePositiveShareScore(reports, getValue, maxPoints) {
  const values = reports
    .map((report, index) => toFiniteNumber(getValue(report, index)))
    .filter((value) => value !== null);

  if (values.length === 0) return 0;
  return (
    (values.filter((value) => value >= 0).length / values.length) * maxPoints
  );
}

function calculateNetProfitMargin(report) {
  if (!report.revenue || report.netProfit === null) return null;
  return (report.netProfit / report.revenue) * 100;
}

function calculateBookValueGrowth(reports, report, index) {
  const reportedGrowth = toFiniteNumber(report.bookValueGrowth);
  if (reportedGrowth !== null) return reportedGrowth;

  const previousBookValue = toFiniteNumber(
    reports[index + 1]?.bookValuePerShare,
  );
  const currentBookValue = toFiniteNumber(report.bookValuePerShare);

  if (
    currentBookValue === null ||
    previousBookValue === null ||
    previousBookValue === 0
  ) {
    return null;
  }

  return ((currentBookValue - previousBookValue) / previousBookValue) * 100;
}

function annualizeYearToDate(value, reportDate) {
  if (value === null) return null;
  const month = Number(String(reportDate).slice(5, 7));
  if (![3, 6, 9].includes(month)) return value;
  return value * (12 / month);
}

function scaleScore(value, low, high, maxPoints) {
  if (value === null || high <= low) return 0;
  const ratio = Math.min(Math.max((value - low) / (high - low), 0), 1);
  return ratio * maxPoints;
}

function inverseScaleScore(value, best, worst, maxPoints) {
  if (value === null || worst <= best) return 0;
  const ratio = Math.min(Math.max((worst - value) / (worst - best), 0), 1);
  return ratio * maxPoints;
}

function median(values) {
  if (values.length === 0) return null;
  const sortedValues = [...values].sort((left, right) => left - right);
  const middleIndex = Math.floor(sortedValues.length / 2);
  if (sortedValues.length % 2 === 1) return sortedValues[middleIndex];
  return (sortedValues[middleIndex - 1] + sortedValues[middleIndex]) / 2;
}

function toFiniteNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function roundScore(value) {
  return Math.round(value * 10) / 10;
}

function emptyScore() {
  return {
    total: 0,
    breakdown: {
      profitability: 0,
      growth: 0,
      dividend: 0,
      quality: 0,
      stability: 0,
    },
  };
}
