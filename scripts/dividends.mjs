function toDate(value) {
  const dateText = String(value ?? "").slice(0, 10);
  const date = new Date(`${dateText}T12:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toFiscalYear(record) {
  const explicitYear =
    record.FISCAL_YEAR === null || record.FISCAL_YEAR === undefined
      ? Number.NaN
      : Number(record.FISCAL_YEAR);
  if (Number.isInteger(explicitYear)) return explicitYear;

  const reportDate = String(record.REPORT_DATE ?? "").slice(0, 10);
  const reportYear = Number(reportDate.slice(0, 4));
  return Number.isInteger(reportYear) ? reportYear : null;
}

function isAnnualRecord(record) {
  if (typeof record.IS_ANNUAL === "boolean") return record.IS_ANNUAL;
  return String(record.REPORT_DATE ?? "").slice(5, 10) === "12-31";
}

function normalizeImplementedRecords(records, tradeDate) {
  const endDate = toDate(tradeDate);
  if (!endDate) return [];

  return records.flatMap((record) => {
    const exDividendDate = toDate(record.EX_DIVIDEND_DATE);
    const pretaxBonus = Number(record.PRETAX_BONUS_RMB);
    const fiscalYear = toFiscalYear(record);

    if (
      !String(record.ASSIGN_PROGRESS ?? "").includes("实施") ||
      !Number.isFinite(pretaxBonus) ||
      pretaxBonus <= 0 ||
      !exDividendDate ||
      exDividendDate > endDate ||
      !Number.isInteger(fiscalYear)
    ) {
      return [];
    }

    return [
      {
        ...record,
        exDividendDate,
        fiscalYear,
        isAnnual: isAnnualRecord(record),
        pretaxBonus,
      },
    ];
  });
}

export function mergeDividendRecords(...recordGroups) {
  const seen = new Set();

  return recordGroups
    .flat()
    .filter((record) => {
      const exDividendDate = String(record.EX_DIVIDEND_DATE ?? "").slice(0, 10);
      const pretaxBonus = Number(record.PRETAX_BONUS_RMB);

      if (!exDividendDate || !Number.isFinite(pretaxBonus)) return false;

      const key = `${exDividendDate}|${pretaxBonus.toFixed(4)}`;
      if (seen.has(key)) return false;

      seen.add(key);
      return true;
    })
    .sort((left, right) =>
      String(right.EX_DIVIDEND_DATE).localeCompare(
        String(left.EX_DIVIDEND_DATE),
      ),
    );
}

export function calculateAnnualDividend(records, tradeDate) {
  const implementedRecords = normalizeImplementedRecords(records, tradeDate);
  const completedFiscalYears = implementedRecords
    .filter((record) => record.isAnnual)
    .map((record) => record.fiscalYear);
  const fallbackFiscalYears = implementedRecords
    .map((record) => record.fiscalYear)
    .filter((year) => year < Number(String(tradeDate).slice(0, 4)));
  const dividendFiscalYear = Math.max(
    ...completedFiscalYears,
    ...(!completedFiscalYears.length ? fallbackFiscalYears : []),
  );

  if (!Number.isFinite(dividendFiscalYear)) {
    return {
      annualDividend: 0,
      dividendCount: 0,
      dividendFiscalYear: null,
    };
  }

  const selectedRecords = implementedRecords.filter(
    (record) => record.fiscalYear === dividendFiscalYear,
  );

  return {
    annualDividend: Number(
      selectedRecords
        .reduce((total, record) => total + record.pretaxBonus / 10, 0)
        .toFixed(6),
    ),
    dividendCount: selectedRecords.length,
    dividendFiscalYear,
  };
}

export function calculateDividendYearCount(
  records,
  dividendFiscalYear,
  tradeDate,
) {
  if (!Number.isInteger(dividendFiscalYear)) return 0;

  const firstFiscalYear = dividendFiscalYear - 2;
  return new Set(
    normalizeImplementedRecords(records, tradeDate)
      .map((record) => record.fiscalYear)
      .filter(
        (year) => year >= firstFiscalYear && year <= dividendFiscalYear,
      ),
  ).size;
}
