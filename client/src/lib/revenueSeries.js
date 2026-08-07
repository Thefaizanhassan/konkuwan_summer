// Turns a dashboard payload into the two series the revenue chart can show.
//
// Kept out of the component because the rule that decides *which* series is
// shown is where the drill-down bug lived: the chart always bucketed by month,
// so a monthly period produced a single point, and clicking it "opened" the
// month already on screen.
//
// The rule is one line — the server's `grain` decides:
//   grain 'month' (annual / quarterly) → months, and a month can be opened.
//   grain 'day'   (a single month)     → days; there is nothing to open.
 
/** Months, labelled with the year when the period spans two calendar years. */
export function monthSeries(revenueChart = []) {
  const years = new Set(revenueChart.map((d) => String(d.month).slice(0, 4)));
  return revenueChart.map((d) => ({
    key: String(d.month).slice(0, 7),
    label:
      new Date(d.month).toLocaleString('default', { month: 'short' })
      + (years.size > 1 ? ` ’${String(d.month).slice(2, 4)}` : ''),
    revenue: Number(d.revenue) || 0,
  }));
}
 
/**
 * Every day of `ym`, including days with no sales, so a quiet month renders a
 * full axis rather than one floating point. Stops at `asOf` when the month is
 * still running — a part-month should end, not trail along zero.
 */
export function daySeries(revenueDaily = [], ym, asOf) {
  if (!ym) return [];
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return [];
  const byDate = Object.fromEntries(revenueDaily.map((d) => [d.date, Number(d.revenue) || 0]));
  const lastDay = asOf && asOf.slice(0, 7) === ym
    ? Number(asOf.slice(8, 10))
    : new Date(y, m, 0).getDate();
  return Array.from({ length: Math.max(0, lastDay) }, (_, i) => {
    const date = `${ym}-${String(i + 1).padStart(2, '0')}`;
    return { key: date, label: String(i + 1), revenue: byDate[date] || 0 };
  });
}
 
/**
 * @param {object} payload   data.data from /admin/analytics/dashboard
 * @param {string|null} drillMonth  'YYYY-MM' the user clicked, or null
 * @returns {{canDrill, isDayView, isDrilled, shownMonth, data, xTickInterval}}
 */
export function revenueSeries(payload, drillMonth) {
  const period = payload?.period;
  const grain = period?.grain || 'month';
  const canDrill = grain === 'month';
 
  const months = monthSeries(payload?.revenue_chart);
  const shownMonth = canDrill ? drillMonth : String(period?.start || '').slice(0, 7);
  const isDayView = !canDrill || Boolean(drillMonth);
  const days = isDayView ? daySeries(payload?.revenue_daily, shownMonth, period?.as_of) : [];
 
  return {
    canDrill,
    isDayView,
    isDrilled: canDrill && Boolean(drillMonth),
    shownMonth,
    months,
    data: isDayView ? days : months,
    // 31 day-ticks do not fit on a phone; up to 12 months always do.
    xTickInterval: isDayView ? 'preserveStartEnd' : 0,
  };
}