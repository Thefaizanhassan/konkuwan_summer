// Indian financial year: 1 April to 31 March.
//
// FY 2026-27 runs 2026-04-01 .. 2027-03-31 and is identified everywhere by its
// START year (2026). Quarters follow the same calendar:
//   Q1 Apr-Jun · Q2 Jul-Sep · Q3 Oct-Dec · Q4 Jan-Mar (of the following year)
//
// Shared by the dashboard and every report so the three views cannot disagree
// about what "this year" means.
 
const FY_START_MONTH = 3; // April, zero-based
 
const pad = (n) => String(n).padStart(2, '0');
const ymd = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
 
/** The FY start year that a date belongs to. Jan-Mar belong to the previous. */
function fyOf(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  return d.getMonth() >= FY_START_MONTH ? d.getFullYear() : d.getFullYear() - 1;
}
 
/** "2026-27" */
function fyLabel(fy) {
  return `${fy}-${pad((fy + 1) % 100)}`;
}
 
/** Inclusive date bounds of a whole financial year. */
function fyBounds(fy) {
  return { start: ymd(fy, FY_START_MONTH, 1), end: ymd(fy + 1, FY_START_MONTH - 1, 31) };
}
 
// Quarter n (1-4) as an offset from April, and the calendar months it covers.
function quarterMonths(fy, quarter) {
  const startOffset = (quarter - 1) * 3;
  return [0, 1, 2].map((i) => {
    const abs = FY_START_MONTH + startOffset + i;
    return { year: fy + Math.floor(abs / 12), month: abs % 12 };
  });
}
 
function quarterBounds(fy, quarter) {
  const months = quarterMonths(fy, quarter);
  const first = months[0];
  const last = months[2];
  return {
    start: ymd(first.year, first.month, 1),
    end: ymd(last.year, last.month, daysInMonth(last.year, last.month)),
  };
}
 
/**
 * Bounds of one month within a financial year.
 * `fyMonth` is 1-12 counting from April, so 1 = April and 12 = March.
 */
function fyMonthBounds(fy, fyMonth) {
  const abs = FY_START_MONTH + (fyMonth - 1);
  const year = fy + Math.floor(abs / 12);
  const month = abs % 12;
  return { start: ymd(year, month, 1), end: ymd(year, month, daysInMonth(year, month)), year, month };
}
 
/** Which FY month (1-12) a calendar date falls in. */
function fyMonthOf(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  return ((d.getMonth() - FY_START_MONTH + 12) % 12) + 1;
}
 
function quarterOf(date = new Date()) {
  return Math.floor((fyMonthOf(date) - 1) / 3) + 1;
}
 
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
 
/**
 * Resolve a requested period into concrete bounds plus the equivalent previous
 * period, which is what the trend arrows compare against. Comparing a quarter
 * to last month would be meaningless, so the baseline always matches the
 * granularity being displayed.
 *
 * @param {object} q  { period, fy, quarter, month }  — all optional strings
 * @returns {{period, fy, quarter, month, label, start, end, previous, grain}}
 */
function resolvePeriod(q = {}, now = new Date()) {
  const period = ['year', 'quarter', 'month'].includes(q.period) ? q.period : 'month';
  const fy = Number.isInteger(Number(q.fy)) && q.fy !== '' && q.fy != null ? Number(q.fy) : fyOf(now);
 
  if (period === 'year') {
    const { start, end } = fyBounds(fy);
    const prev = fyBounds(fy - 1);
    return {
      period, fy, quarter: null, month: null,
      label: `FY ${fyLabel(fy)}`,
      start, end,
      previous: { ...prev, label: `FY ${fyLabel(fy - 1)}` },
      grain: 'month', // an annual chart is plotted month by month
    };
  }
 
  if (period === 'quarter') {
    const raw = Number(q.quarter);
    const quarter = raw >= 1 && raw <= 4 ? raw : quarterOf(now);
    const { start, end } = quarterBounds(fy, quarter);
    // Q1's predecessor is Q4 of the previous financial year.
    const prevFy = quarter === 1 ? fy - 1 : fy;
    const prevQ = quarter === 1 ? 4 : quarter - 1;
    const prev = quarterBounds(prevFy, prevQ);
    return {
      period, fy, quarter, month: null,
      label: `Q${quarter} FY ${fyLabel(fy)}`,
      start, end,
      previous: { ...prev, label: `Q${prevQ} FY ${fyLabel(prevFy)}` },
      grain: 'month',
    };
  }
 
  const raw = Number(q.month);
  // `month` is 1-12 from April. Default to the current month, but only when the
  // requested FY is the one we are actually in — asking for a past FY without
  // naming a month means April, not "today's month in that year".
  const fyMonth = raw >= 1 && raw <= 12 ? raw : fy === fyOf(now) ? fyMonthOf(now) : 1;
  const b = fyMonthBounds(fy, fyMonth);
  const prevFyMonth = fyMonth === 1 ? 12 : fyMonth - 1;
  const prevFy = fyMonth === 1 ? fy - 1 : fy;
  const prevB = fyMonthBounds(prevFy, prevFyMonth);
  return {
    period, fy, quarter: null, month: fyMonth,
    label: `${MONTH_NAMES[b.month]} ${b.year}`,
    start: b.start, end: b.end,
    previous: {
      start: prevB.start, end: prevB.end,
      label: `${MONTH_NAMES[prevB.month]} ${prevB.year}`,
    },
    grain: 'day', // a single month is plotted day by day
  };
}
 
/** Financial years to offer in the picker: this one and the few before it. */
function selectableFinancialYears(now = new Date(), back = 4) {
  const current = fyOf(now);
  return Array.from({ length: back + 1 }, (_, i) => {
    const fy = current - i;
    return { fy, label: fyLabel(fy) };
  });
}
 
module.exports = {
  FY_START_MONTH,
  fyOf,
  fyLabel,
  fyBounds,
  quarterBounds,
  quarterMonths,
  fyMonthBounds,
  fyMonthOf,
  quarterOf,
  resolvePeriod,
  selectableFinancialYears,
};