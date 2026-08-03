// Which order statuses count as revenue.
//
// The order lifecycle is: draft -> confirmed -> dispatched -> delivered, with
// cancelled as a terminal state.
//
//   draft      a quotation being prepared. Not a sale yet, so no revenue.
//   confirmed  the customer has committed and the order is invoiced. This IS
//              revenue — waiting for delivery does not make it less real.
//   dispatched in transit. Revenue.
//   delivered  complete. Revenue.
//   cancelled  never happened. No revenue.
//
// This list must be shared. Finance (farm.controller.js) already counted
// confirmed/dispatched/delivered while the dashboard (analytics.controller.js)
// counted only delivered, so the two screens reported different revenue for
// the same month and the dashboard showed 0 whenever nothing had been marked
// delivered yet.
const BILLABLE_ORDER_STATUSES = ['confirmed', 'dispatched', 'delivered'];
 
// Orders that still count as "activity" for order-count metrics: everything
// except cancelled. A draft is real pipeline even though it is not revenue.
const ACTIVE_ORDER_STATUSES = ['draft', ...BILLABLE_ORDER_STATUSES];
 
module.exports = { BILLABLE_ORDER_STATUSES, ACTIVE_ORDER_STATUSES };