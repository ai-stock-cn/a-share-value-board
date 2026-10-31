export const BOLL_PERIOD = 20;
export const BOLL_MULTIPLIER = 2;

export function calculateBollPositions(quotes) {
  return {
    daily: calculateBollPosition(
      aggregatePeriodCloses(quotes, (quote) => quote.tradeDate),
    ),
    weekly: calculateBollPosition(
      aggregatePeriodCloses(quotes, (quote) => getWeekKey(quote.tradeDate)),
    ),
    monthly: calculateBollPosition(
      aggregatePeriodCloses(quotes, (quote) => quote.tradeDate.slice(0, 7)),
    ),
  };
}

export function calculateBollPosition(closes) {
  const bands = calculateBollBands(closes);
  if (!bands) return "数据不足";

  const { latest, upper, middle, lower } = bands;

  if (latest > upper) return "上轨以上";
  if (latest >= middle) return "中上";
  if (latest >= lower) return "中下";
  return "下轨以下";
}

export function calculateBollBands(closes) {
  const finiteCloses = closes.filter(Number.isFinite);
  if (finiteCloses.length < BOLL_PERIOD) return null;

  const window = finiteCloses.slice(-BOLL_PERIOD);
  const middle = window.reduce((sum, value) => sum + value, 0) / BOLL_PERIOD;
  const variance =
    window.reduce((sum, value) => sum + (value - middle) ** 2, 0) /
    (BOLL_PERIOD - 1);
  const standardDeviation = Math.sqrt(variance);

  return {
    latest: window.at(-1),
    upper: middle + BOLL_MULTIPLIER * standardDeviation,
    middle,
    lower: middle - BOLL_MULTIPLIER * standardDeviation,
  };
}

function aggregatePeriodCloses(quotes, getPeriodKey) {
  const periodCloses = new Map();

  [...quotes]
    .filter(
      (quote) =>
        /^\d{4}-\d{2}-\d{2}$/.test(quote.tradeDate) &&
        Number.isFinite(quote.close),
    )
    .sort((left, right) => left.tradeDate.localeCompare(right.tradeDate))
    .forEach((quote) => {
      periodCloses.set(getPeriodKey(quote), quote.close);
    });

  return [...periodCloses.values()];
}

function getWeekKey(tradeDate) {
  const date = new Date(`${tradeDate}T00:00:00Z`);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  return date.toISOString().slice(0, 10);
}
