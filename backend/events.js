import wixData from 'wix-data';

// A raw new Date(isoString) shows in the Content Manager as the full
// "2027-05-28T22:59:59.999Z" timestamp - clean "YYYY-MM-DD" strings display as
// tidy dates instead (same fix already used for sp_paymentschedulesentdate in
// registration.jsw). Cycle boundaries only ever need the date, not the time.
function toDateOnlyString(isoString) {
    if (!isoString) return null;
    return new Date(isoString).toISOString().slice(0, 10);
}

// =====================================================================
//  PRICING PLANS EVENTS — child payment tracking
//  Wix's own order data only ever knows the buying member + plan, never
//  which of their kids a subscription is for. markPendingPayment() in
//  registration.jsw writes an unconfirmed marker just before the parent is
//  sent to checkout; these handlers confirm it once the real order exists,
//  then keep it in sync every payment cycle, cancellation, or natural expiry -
//  regardless of whether that happened via our own Parent Hub or Wix's own
//  built-in Subscriptions/My Account page. See "Payment tracking" under Data
//  Model Notes in docs/PARENT_HUB_ELEMENTS.md.
// =====================================================================

// Fires once an order is purchased (first payment made, or - for offline/free
// orders - just created). Matches it to the OLDEST unconfirmed "pending"
// ChildSubscriptions marker for the same buyer + plan (FIFO), so two kids on
// the same fee tier bought back-to-back still resolve to the right child.
export async function wixPricingPlans_onOrderPurchased(event) {
    try {
        const order = event.data.order;
        const memberId = order.buyer && order.buyer.memberId;
        if (!memberId) return;

        const pending = await wixData.query("ChildSubscriptions")
            .eq("memberId", memberId)
            .eq("wixPlanId", order.planId)
            .eq("confirmed", false)
            .ascending("_createdDate")
            .limit(1)
            .find({ suppressAuth: true });

        if (!pending.items.length) {
            console.warn("onOrderPurchased: no pending marker found for", { memberId, planId: order.planId, orderId: order._id });
            return;
        }

        const marker = pending.items[0];
        marker.confirmed = true;
        marker.subscriptionId = order.subscriptionId;
        marker.orderId = order._id;
        marker.status = order.status;
        marker.lastPaymentStatus = order.lastPaymentStatus;
        if (order.currentCycle) {
            marker.currentCycleIndex = order.currentCycle.index;
            marker.currentCycleStart = toDateOnlyString(order.currentCycle.startedDate);
            marker.currentCycleEnd = toDateOnlyString(order.currentCycle.endedDate);
        }
        await wixData.update("ChildSubscriptions", marker, { suppressAuth: true });
    } catch (err) {
        console.error("wixPricingPlans_onOrderPurchased error:", err);
    }
}

// Shared by every event below that just needs to write the order's current
// state onto its matching ChildSubscriptions row - finds it by subscriptionId
// (set once, at confirm time) so it doesn't matter which event fired or which
// page/flow triggered it (our own #btnCancelOldPlan, Wix's own built-in
// Subscriptions/My Account page, auto-expiry, anything).
async function syncSubscriptionFromOrder(order, sourceLabel) {
    const match = await wixData.query("ChildSubscriptions")
        .eq("subscriptionId", order.subscriptionId)
        .limit(1)
        .find({ suppressAuth: true });

    if (!match.items.length) {
        console.warn(`${sourceLabel}: no ChildSubscriptions record for subscription`, order.subscriptionId);
        return;
    }

    const sub = match.items[0];
    sub.status = order.status;
    sub.lastPaymentStatus = order.lastPaymentStatus;
    if (order.currentCycle) {
        sub.currentCycleIndex = order.currentCycle.index;
        sub.currentCycleStart = toDateOnlyString(order.currentCycle.startedDate);
        sub.currentCycleEnd = toDateOnlyString(order.currentCycle.endedDate);
    }
    await wixData.update("ChildSubscriptions", sub, { suppressAuth: true });
}

// Fires at the start of every payment cycle (i.e. every month) for an
// already-confirmed subscription. Keeps lastPaymentStatus/currentCycle current
// so "did this month's payment actually go through" is answerable without the
// secretary manually checking Wix's own Pricing Plans dashboard.
export async function wixPricingPlans_onOrderCycleStarted(event) {
    try {
        await syncSubscriptionFromOrder(event.data.order, "onOrderCycleStarted");
    } catch (err) {
        console.error("wixPricingPlans_onOrderCycleStarted error:", err);
    }
}

// Fires whenever an order is canceled - IMMEDIATELY (our #btnCancelOldPlan
// button) or at the next payment date, and regardless of whether cancellation
// happened via our custom Parent Hub or Wix's own built-in Subscriptions/My
// Account page. This is what keeps ChildSubscriptions accurate no matter which
// route the parent used to cancel.
export async function wixPricingPlans_onOrderCanceled(event) {
    try {
        await syncSubscriptionFromOrder(event.data.order, "onOrderCanceled");
    } catch (err) {
        console.error("wixPricingPlans_onOrderCanceled error:", err);
    }
}

// Fires when an order naturally expires (reaches its end date without being
// renewed) - the other way a subscription can stop besides explicit cancellation.
export async function wixPricingPlans_onOrderEnded(event) {
    try {
        await syncSubscriptionFromOrder(event.data.order, "onOrderEnded");
    } catch (err) {
        console.error("wixPricingPlans_onOrderEnded error:", err);
    }
}
