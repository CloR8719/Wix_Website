import { ok, badRequest } from 'wix-http-functions';
import wixData from 'wix-data';
import { getSecret } from 'wix-secrets-backend';
import crypto from 'crypto';
import { getBillingRequest, getPayment } from 'backend/gocardless.jsw';
import { ensureSubscriptionCreated, normalizeSubscriptionStatus } from 'backend/registration.jsw';

// =====================================================================
//  GOCARDLESS WEBHOOK RECEIVER — keeps GoCardlessSubscriptions/GoCardlessPayments
//  in sync with the real mandate/subscription/payment state, the same role
//  backend/events.js plays for the old Wix Pricing Plans flow. First file of
//  this kind (Wix's reserved "http-functions.js" filename) in this codebase -
//  confirm it's actually being called (log liberally at first) before relying
//  on it, same lesson events.js already taught this project once (must be a
//  plain .js file, not .jsw, or Wix never wires the handler up).
// =====================================================================

function normalizePaymentStatus(gcStatus) {
    if (gcStatus === "confirmed" || gcStatus === "paid_out") return "PAID";
    if (gcStatus === "failed" || gcStatus === "charged_back" || gcStatus === "cancelled" || gcStatus === "customer_approval_denied") return "FAILED";
    return "PENDING";
}

async function verifySignature(rawBody, signatureHeader) {
    const secret = await getSecret('_GOCARDLESS_WEBHOOK_SECRET');
    const computed = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    const a = Buffer.from(computed, 'utf8');
    const b = Buffer.from(signatureHeader || '', 'utf8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
}

async function alreadyProcessed(eventId) {
    const existing = await wixData.query("GoCardlessWebhookEvents")
        .eq("eventId", eventId)
        .limit(1)
        .find({ suppressAuth: true });
    return existing.items.length > 0;
}

async function markProcessed(event) {
    await wixData.insert("GoCardlessWebhookEvents", {
        eventId: event.id,
        resourceType: event.resource_type,
        action: event.action
    }, { suppressAuth: true });
}

async function findSubscriptionRecord(field, value) {
    if (!value) return null;
    const res = await wixData.query("GoCardlessSubscriptions")
        .eq(field, value)
        .limit(1)
        .find({ suppressAuth: true });
    return res.items[0] || null;
}

// ensureSubscriptionCreated now lives in backend/registration.jsw (2026-08) -
// moved so retryStuckSubscriptions() there can also call it, not just a live
// webhook (see the comment above that function for why: this exact call can
// fail silently mid-webhook and never get retried by GoCardless).
// Re-fetch a record fresh by _id right before writing to it - real incident,
// 2026-08-10: every handler below used to write back whatever copy of the
// record it fetched at the top of the function. When multiple webhook events
// land for the same row within seconds of each other (normal during rapid
// testing - a real signup's events are naturally spaced out over minutes to
// days, so this never bites in practice), a handler can finish and save AFTER
// another handler already fetched its own now-stale copy - the second handler
// then overwrites the first one's change when it saves. Every write path here
// now re-fetches immediately before saving and only touches the field(s) it's
// actually responsible for, so two handlers landing close together can never
// stomp on each other regardless of order.
async function refetch(recordId) {
    return wixData.get("GoCardlessSubscriptions", recordId, { suppressAuth: true });
}

async function handleBillingRequestEvent(event) {
    const billingRequestId = event.links && event.links.billing_request;
    const record = await findSubscriptionRecord("gcBillingRequestId", billingRequestId);
    if (!record) {
        console.warn("gocardlessWebhook: no GoCardlessSubscriptions row for billing request", billingRequestId);
        return;
    }

    if (event.action === "fulfilled") {
        // ⚠️ Exact link key for the mandate a fulfilled billing request produces needs
        // confirming against a real sandbox payload - try the documented name first,
        // fall back to fetching the billing request directly if it's missing. Confirmed
        // working against a real sandbox payload 2026-07-31.
        let mandateId = event.links && (event.links.mandate_request_mandate || event.links.mandate);
        let customerId = event.links && event.links.customer;
        if (!mandateId || !customerId) {
            const fullRequest = await getBillingRequest(billingRequestId);
            if (!mandateId) mandateId = fullRequest.links && (fullRequest.links.mandate_request_mandate || fullRequest.links.mandate);
            if (!customerId) customerId = fullRequest.links && fullRequest.links.customer;
        }
        if (mandateId) {
            const fresh = await refetch(record._id);
            if (!fresh) return;
            fresh.gcMandateId = mandateId;
            fresh.mandateStatus = "active";
            if (customerId) fresh.gcCustomerId = customerId;
            await wixData.update("GoCardlessSubscriptions", fresh, { suppressAuth: true });
            await ensureSubscriptionCreated(fresh);
        }
    }
}

async function handleMandateEvent(event) {
    const mandateId = event.links && event.links.mandate;
    const record = await findSubscriptionRecord("gcMandateId", mandateId);
    if (!record) return; // likely already handled via the billing_request path above

    const fresh = await refetch(record._id);
    if (!fresh) return;
    fresh.mandateStatus = event.action;
    if (event.action === "cancelled") fresh.status = "CANCELED";
    else if (event.action === "failed" || event.action === "expired") fresh.status = "ENDED";
    await wixData.update("GoCardlessSubscriptions", fresh, { suppressAuth: true });
    if (event.action === "active") await ensureSubscriptionCreated(fresh);
}

async function handleSubscriptionEvent(event) {
    const subscriptionId = event.links && event.links.subscription;
    const record = await findSubscriptionRecord("gcSubscriptionId", subscriptionId);
    if (!record) return;

    const fresh = await refetch(record._id);
    if (!fresh) return;
    fresh.subscriptionStatus = event.action;
    // ROOT CAUSE, found 2026-08-11: normalizeSubscriptionStatus lives in
    // backend/registration.jsw, a .jsw web module - Wix Velo wraps every .jsw
    // export to be called asynchronously, even a plain non-async function like
    // this one. Calling it across the module boundary (this file imports it)
    // without awaiting returns the pending Promise object itself, not the
    // resolved string - typeof "object", JSON.stringify gives exactly "{}".
    // That's the actual mechanism behind every "{}" status seen since this
    // function moved into registration.jsw (2026-08-10) - same-file calls (as
    // in ensureSubscriptionCreated) were never affected, only this cross-file
    // import was.
    const intendedStatus = await normalizeSubscriptionStatus(event.action === "created" ? "active" : event.action);
    fresh.status = intendedStatus;
    await wixData.update("GoCardlessSubscriptions", fresh, { suppressAuth: true });

    // Verify-after-write safety net, 2026-08-11 - see the matching note in
    // ensureSubscriptionCreated (registration.jsw) for why: `status` has been
    // observed landing as a bare `{}` on live signups even though this function
    // only ever assigns one of 4 fixed strings. This is the other function most
    // implicated (subscriptions.created can fire while ensureSubscriptionCreated
    // is still mid-flight for the same record) - same safety net here.
    const VALID_STATUSES = ["PENDING", "ACTIVE", "CANCELED", "ENDED"];
    const verify = await refetch(record._id);
    if (verify && !VALID_STATUSES.includes(verify.status)) {
        console.error("handleSubscriptionEvent: status wrote back invalid - raw:", JSON.stringify(verify.status), "typeof:", typeof verify.status, "recordId:", record._id, "intended:", intendedStatus);
        verify.status = intendedStatus;
        await wixData.update("GoCardlessSubscriptions", verify, { suppressAuth: true });
    }
}

async function handlePaymentEvent(event) {
    const paymentId = event.links && event.links.payment;

    // Real bug found 2026-08-11: the thin webhook event's own `links` doesn't
    // reliably carry `mandate` (sometimes just `payment`, nothing else) - only
    // the FULL Payment resource is guaranteed to have both `subscription` (if
    // any) and `mandate`. Fetch it first and match off ITS links, not the
    // event's - this used to silently drop one-off payment confirmations
    // whenever the event's links were this thin.
    let payment = null;
    let chargeDate = null;
    let amount = null;
    try {
        payment = await getPayment(paymentId);
        chargeDate = payment.charge_date ? new Date(payment.charge_date) : null;
        amount = payment.amount ? payment.amount / 100 : amount;
    } catch (err) {
        console.error("gocardlessWebhook: could not fetch payment details for", paymentId, err);
    }

    const subscriptionId = (payment && payment.links && payment.links.subscription) || (event.links && event.links.subscription);
    const mandateId = (payment && payment.links && payment.links.mandate) || (event.links && event.links.mandate);
    const record = (subscriptionId && await findSubscriptionRecord("gcSubscriptionId", subscriptionId))
        || await findSubscriptionRecord("gcMandateId", mandateId);
    if (!record) {
        console.warn("gocardlessWebhook: no GoCardlessSubscriptions row for payment's subscription/mandate", subscriptionId, mandateId, paymentId);
        return;
    }
    if (amount === null) amount = record.perPayment;

    const normalizedStatus = normalizePaymentStatus(event.action);

    // UPSERT, not insert (fixed 2026-08-15). GoCardless sends SEVERAL events
    // across one payment's life - created, submitted, confirmed, paid_out -
    // and this used to insert a new row for each, so a single real payment
    // ended up as multiple CMS rows dated whenever each event landed.
    // Confirmed live: one child had two rows (11th and 15th) for one payment
    // that GoCardless itself showed correctly as a single charge.
    const existingRows = await wixData.query("GoCardlessPayments")
        .eq("gcPaymentId", paymentId)
        .limit(1)
        .find({ suppressAuth: true });
    const existingRow = existingRows.items[0];
    const wasAlreadyPaid = !!existingRow && existingRow.status === "PAID";

    if (existingRow) {
        existingRow.chargeDate = chargeDate;
        existingRow.amount = amount;
        existingRow.status = normalizedStatus;
        await wixData.update("GoCardlessPayments", existingRow, { suppressAuth: true });
    } else {
        await wixData.insert("GoCardlessPayments", {
            subscriptionRecord: record._id,
            player: record.player,
            season: record.season,
            gcPaymentId: paymentId,
            chargeDate,
            amount,
            status: normalizedStatus
        }, { suppressAuth: true });
    }

    const fresh = await refetch(record._id);
    if (!fresh) return; // record was deleted between fetch and write - nothing to update
    fresh.lastPaymentId = paymentId;
    fresh.lastPaymentChargeDate = chargeDate;
    fresh.lastPaymentStatus = normalizedStatus;
    // Only on the TRANSITION to paid. Incrementing on every PAID-normalising
    // event would over-count the same payment once per webhook delivery -
    // and GoCardless legitimately retries deliveries too.
    if (normalizedStatus === "PAID" && !wasAlreadyPaid) {
        fresh.paymentsCollectedCount = (fresh.paymentsCollectedCount || 0) + 1;
    }
    await wixData.update("GoCardlessSubscriptions", fresh, { suppressAuth: true });
}

export async function post_gocardlessWebhook(request) {
    const rawBody = await request.body.text();
    const signature = request.headers["webhook-signature"] || request.headers["Webhook-Signature"];

    const valid = await verifySignature(rawBody, signature);
    if (!valid) {
        console.error("gocardlessWebhook: signature verification failed");
        return badRequest({ body: { error: "invalid signature" } });
    }

    const payload = JSON.parse(rawBody);
    const events = payload.events || [];

    for (const event of events) {
        try {
            if (await alreadyProcessed(event.id)) continue;

            if (event.resource_type === "billing_requests") await handleBillingRequestEvent(event);
            else if (event.resource_type === "mandates") await handleMandateEvent(event);
            else if (event.resource_type === "subscriptions") await handleSubscriptionEvent(event);
            else if (event.resource_type === "payments") await handlePaymentEvent(event);
            // other resource types (creditors, refunds, payouts...) aren't tracked

            await markProcessed(event);
        } catch (err) {
            // One bad event shouldn't fail the whole delivery - log and move on so
            // GoCardless doesn't end up retrying the entire batch over a single case.
            console.error("gocardlessWebhook: error processing event", event.id, err);
        }
    }

    return ok({ body: { received: true } });
}
