// =====================================================================
//  <parent-hub-payment-detail> — Parent Hub v2, one child's payment plan
// =====================================================================
//  SETUP:
//    1. Public -> custom-elements -> new file `parentHubPaymentDetail.js`.
//    2. On statePaymentDetail: Add -> Embed Code -> Custom Element.
//       Tag name: parent-hub-payment-detail   ID: #customPaymentDetail
//    3. Height ~700px to start; it self-sizes after first paint.
//
//  ⚠️ REPUBLISH *AND* HARD-REFRESH after any change.
//
//  WHAT THIS TOUCHES: nothing. It displays, and it raises two intents.
//  Every decision about what state a plan is in - and both money
//  operations - stay in page code and the backend:
//    - startGoCardlessSetup returns a URL; the parent's bank details are
//      entered on GoCardless's own hosted page, never here.
//    - cancelGoCardlessSubscription is the only destructive action in the
//      whole hub, and it now takes TWO taps (see the confirm step below).
//
//  EXACTLY ONE ACTION IS EVER OFFERED, or none. Showing checkout while an
//  active mandate exists would create a SECOND GoCardless subscription
//  rather than fixing anything - so page code sends a single `action` and
//  this element renders that and nothing else.
//
//  The tick strip and ledger used to be HTML strings pushed into a Wix
//  rich-text element, with a warning that its renderer ignores flexbox.
//  They're real DOM here, so that workaround is retired.
// =====================================================================

const STYLES = `
  :host { display: block; width: 100%; font-family: 'Work Sans', -apple-system, BlinkMacSystemFont, sans-serif; }
  * { box-sizing: border-box; }
  .wrap {
    --surface:#FFFFFF; --raised:#FFFFFF; --pitch:#1F5136; --pitch-soft:#DCE9E0;
    --line:#E1E4DB; --line-soft:#ECEEE8;
    --text:#16212F; --text-muted:#5C6B7A; --text-faint:#8B98A3;
    --success:#158A45; --success-bg:#E4F5EA;
    --warning:#9A6200; --warning-bg:#FEF3DE;
    --critical:#C23B3B; --critical-bg:#FCEAEA;
    padding: 16px; color: var(--text);
  }
  @media (min-width: 750px) { .wrap { padding: 22px 28px; } }

  /* The sections all sit inside #detail, so the gap belongs here. It was on
     .wrap, whose only children are #loading and #detail - never both visible,
     so it separated nothing and every section ran into the next. */
  #detail { display: flex; flex-direction: column; gap: 20px; }
  @media (min-width: 750px) { #detail { gap: 24px; } }

  .head h2 { margin: 0; font-size: 19px; font-weight: 700; letter-spacing: -0.3px; }
  .head p { margin: 3px 0 0; font-size: 12.5px; color: var(--text-muted); }

  .card { background: var(--raised); border: 1px solid var(--line); border-radius: 12px; padding: 15px 16px; }
  .section-title {
    font-size: 11px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.6px; color: var(--text-faint); margin: 0 0 13px;
  }

  .status-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 9px; }
  .pill {
    display: inline-flex; align-items: center; padding: 4px 11px; border-radius: 999px;
    font-size: 11.5px; font-weight: 700; line-height: 1.35;
  }
  .status-text { margin: 0; font-size: 13px; line-height: 1.55; color: var(--text-muted); }
  .schedule { margin: 10px 0 0; font-size: 12.5px; line-height: 1.55; color: var(--text); }

  /* ---------- tick strip ---------- */
  /* Real DOM, so this is a plain flex row - the old version was an HTML
     string in a Wix rich-text element, which ignores flex and forced a
     display:inline-block workaround. */
  .ticks { display: flex; flex-wrap: wrap; gap: 3px; }
  .tick { width: 26px; text-align: center; }
  .tick .m { display: block; font-size: 9.5px; line-height: 1.2; color: var(--text-faint); }
  .tick .d {
    display: block; width: 13px; height: 13px; border-radius: 50%; margin: 2px auto 0;
  }
  .tick .d.paid { background: #22C55E; }
  .tick .d.failed { background: #EF4444; }
  .tick .d.due { background: #F59E0B; }
  .tick .d.future { background: transparent; border: 1.5px dashed var(--line); }

  .legend { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 10px; font-size: 10.5px; color: var(--text-muted); }
  .legend span { display: inline-flex; align-items: center; gap: 5px; }
  .legend i { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }

  /* ---------- ledger ---------- */
  .ledger { display: flex; flex-direction: column; }
  .lrow {
    display: flex; justify-content: space-between; gap: 12px; align-items: baseline;
    padding: 8px 0; border-bottom: 1px solid var(--line-soft); font-size: 12.5px;
  }
  .lrow:last-child { border-bottom: none; }
  .lrow .when { color: var(--text-muted); }
  .lrow .what { font-weight: 600; }
  .lrow .what.paid { color: var(--success); }
  .lrow .what.failed { color: var(--critical); }
  .lrow .what.pending { color: var(--text-muted); }
  .lrow .amt { font-variant-numeric: tabular-nums; font-weight: 600; }

  /* ---------- actions ---------- */
  .btn {
    width: 100%; font-family: inherit; font-size: 14px; font-weight: 600;
    padding: 13px; border-radius: 10px; border: 1px solid transparent; cursor: pointer;
  }
  .btn.primary { background: var(--pitch); color: #fff; }
  .btn.danger { background: var(--critical); color: #fff; }
  .btn.quiet { background: var(--surface); color: var(--text-muted); border-color: var(--line); }
  .btn[disabled] { opacity: 0.55; cursor: default; }
  .btn + .btn { margin-top: 8px; }
  .btn:focus-visible { outline: 2px solid var(--pitch); outline-offset: 2px; }

  /* A warning, not a status. Only ever rendered when the mismatch is real -
     see the note in renderAction. */
  .warn {
    background: var(--warning-bg); border: 1px solid #E9B949; color: #6E4600;
    border-radius: 11px; padding: 13px 14px; font-size: 13px; line-height: 1.55;
  }
  .warn strong { display: block; margin-bottom: 5px; }
  .warn p { margin: 0 0 10px; }

  .confirm {
    background: var(--critical-bg); border: 1px solid #E88; color: #8E2C2C;
    border-radius: 11px; padding: 13px 14px; font-size: 13px; line-height: 1.55;
  }
  .confirm strong { display: block; margin-bottom: 5px; }
  .confirm p { margin: 0 0 10px; }

  .actionmsg { font-size: 12.5px; margin-top: 9px; line-height: 1.5; }
  .actionmsg.bad { color: var(--critical); font-weight: 600; }

  .empty { font-size: 12.5px; color: var(--text-muted); line-height: 1.5; }
  .loading { padding: 36px 16px; text-align: center; font-size: 13px; color: var(--text-muted); }

  @media (prefers-color-scheme: dark) {
    .wrap {
      --surface:#0E1826; --raised:#121F30; --line:#223145; --line-soft:#1A2739;
      --text:#E7ECF2; --text-muted:#A6B4C3; --text-faint:#71818F;
      --pitch:#5FBF8B; --pitch-soft:#17301F;
      --success:#5FD08B; --success-bg:#103322;
      --warning:#E5B567; --warning-bg:#3A2C10;
      --critical:#F08A8A; --critical-bg:#3A1414;
    }
    .btn.primary, .btn.danger { color: #06120C; }
    .warn { border-color: #6A5220; color: #E9C583; }
    .confirm { border-color: #6E2E2E; color: #F2A6A6; }
  }

  /* Clearance for the bottom nav bar, which is pinned over the content on
     mobile. Without this the last item sits under it and can't be scrolled
     into view - the page rubber-bands back the moment you let go. Desktop
     puts the nav in a left rail, so nothing is covering the bottom there. */
  @media (max-width: 749px) {
    .wrap { padding-bottom: calc(84px + env(safe-area-inset-bottom, 0px)); }
  }
`;

function esc(value) {
    return String(value == null ? "" : value)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;")
        .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

class ParentHubPaymentDetail extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._built = false;
        this._data = { loading: true };
        // Cancelling is two taps. This is the second-tap state, held locally
        // so a background repaint can't leave the confirm showing.
        this._confirmingCancel = false;
        this._resizeObserver = null;
        this._lastHeight = 0;
    }

    static get observedAttributes() { return ["data"]; }
    connectedCallback() { this.build(); this.watchHeight(); }
    disconnectedCallback() {
        if (this._resizeObserver) { this._resizeObserver.disconnect(); this._resizeObserver = null; }
    }

    watchHeight() {
        if (this._resizeObserver || typeof ResizeObserver === "undefined") return;
        const wrap = this.shadowRoot.querySelector(".wrap");
        if (!wrap) return;
        this._resizeObserver = new ResizeObserver(() => {
            const h = Math.ceil(wrap.getBoundingClientRect().height);
            if (h && h !== this._lastHeight) { this._lastHeight = h; this.style.height = h + "px"; }
        });
        this._resizeObserver.observe(wrap);
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (!this._built) this.build();
        if (name !== "data" || !newValue) return;
        try {
            const parsed = JSON.parse(newValue);
            if (parsed && typeof parsed === "object") {
                // Any fresh payload means the situation changed - drop out of
                // the confirm step rather than leaving a destructive button
                // armed over data it no longer describes.
                this._confirmingCancel = false;
                this._data = parsed;
                this.paint();
            }
        } catch (err) {
            console.error("parent-hub-payment-detail: couldn't parse data attribute", err);
        }
    }

    $(id) { return this.shadowRoot.getElementById(id); }

    build() {
        if (this._built) return;
        this._built = true;
        this.shadowRoot.innerHTML = `
          <style>${STYLES}</style>
          <div class="wrap">
            <div class="loading" id="loading">Checking payment status…</div>

            <div id="detail" style="display:none">
              <div class="head">
                <h2 id="kidName"></h2>
                <p id="planLabel"></p>
              </div>

              <div class="card">
                <div class="status-row">
                  <span class="pill" id="pill"></span>
                </div>
                <p class="status-text" id="statusText"></p>
                <p class="schedule" id="schedule"></p>
              </div>

              <div id="ticksCard" style="display:none">
                <div class="section-title">This season</div>
                <div class="card">
                  <div class="ticks" id="ticks"></div>
                  <div class="legend">
                    <span><i style="background:#22C55E"></i>Collected</span>
                    <span><i style="background:#F59E0B"></i>Due</span>
                    <span><i style="background:#EF4444"></i>Failed</span>
                    <span><i style="border:1.5px dashed #C9CED6"></i>Upcoming</span>
                  </div>
                </div>
              </div>

              <div id="ledgerCard" style="display:none">
                <div class="section-title">Recent payments</div>
                <div class="card"><div class="ledger" id="ledger"></div></div>
              </div>

              <div id="action"></div>
            </div>
          </div>`;

        // Delegated - the action area is replaced whenever the plan state
        // changes, so per-button listeners would be lost.
        this.$("action").addEventListener("click", (event) => {
            const btn = event.target.closest("[data-act]");
            if (!btn) return;
            const act = btn.getAttribute("data-act");

            if (act === "setup") {
                this.dispatchEvent(new CustomEvent("startSetup", { detail: {} }));
                return;
            }
            if (act === "askCancel") { this._confirmingCancel = true; this.renderAction(); return; }
            if (act === "abortCancel") { this._confirmingCancel = false; this.renderAction(); return; }
            if (act === "confirmCancel") {
                this.dispatchEvent(new CustomEvent("cancelPlan", { detail: {} }));
            }
        });
        this.paint();
    }

    paint() {
        const d = this._data;
        this.$("loading").style.display = d.loading ? "" : "none";
        this.$("detail").style.display = d.loading ? "none" : "";
        if (d.loading) return;

        this.$("kidName").textContent = d.kidName || "";
        this.$("planLabel").textContent = d.planLabel || "Club fees";

        const pill = d.pill || {};
        this.$("pill").textContent = pill.text || "";
        this.$("pill").style.background = pill.bg || "";
        this.$("pill").style.color = pill.fg || "";

        this.$("statusText").textContent = d.statusText || "";
        this.$("schedule").textContent = d.schedule || "";

        this.paintTicks();
        this.paintLedger();
        this.renderAction();
    }

    paintTicks() {
        const ticks = Array.isArray(this._data.ticks) ? this._data.ticks : [];
        const show = ticks.length && !this._data.free;
        this.$("ticksCard").style.display = show ? "" : "none";
        if (!show) return;
        this.$("ticks").innerHTML = ticks.map(t => {
            const status = ["paid", "failed", "due", "future"].includes(t.status) ? t.status : "future";
            return `<span class="tick" title="${esc(t.month)}: ${esc(status)}">
                      <span class="m">${esc((t.month || "").charAt(0))}</span>
                      <span class="d ${status}"></span>
                    </span>`;
        }).join("");
    }

    paintLedger() {
        const rows = Array.isArray(this._data.ledger) ? this._data.ledger : [];
        const show = rows.length && !this._data.free;
        this.$("ledgerCard").style.display = show ? "" : "none";
        if (!show) return;
        this.$("ledger").innerHTML = rows.map(r => {
            const kind = r.status === "PAID" ? "paid" : r.status === "FAILED" ? "failed" : "pending";
            const label = kind === "paid" ? "Collected" : kind === "failed" ? "Failed" : "Pending";
            return `<div class="lrow">
                      <span class="when">${esc(r.date)}</span>
                      <span class="what ${kind}">${label}</span>
                      <span class="amt">${esc(r.amount || "")}</span>
                    </div>`;
        }).join("");
    }

    // Exactly one action, or none. `action.kind` is decided in page code from
    // the GoCardless reply - this element never works it out for itself.
    renderAction() {
        const a = this._data.action || {};
        const busy = !!a.busy;
        const msg = a.error
            ? `<div class="actionmsg bad">${esc(a.error)}</div>` : "";

        if (a.kind === "setup") {
            this.$("action").innerHTML = `
              <button type="button" class="btn primary" data-act="setup" ${busy ? "disabled" : ""}>
                ${busy ? (this._data.free ? "Confirming…" : "Redirecting…")
                       : (this._data.free ? "Confirm free membership" : "Set up your payment plan")}
              </button>
              <p class="status-text" style="margin-top:9px">
                ${this._data.free
                    ? "There's nothing to pay for this membership — this just confirms it with the club."
                    : "You'll be taken to GoCardless to enter your bank details. The club never sees them."}
              </p>${msg}`;
            return;
        }

        if (a.kind === "cancelOld") {
            // Only reachable when an ACTIVE mandate is on a different fee tier
            // than the club now assigns. Rendered nowhere else, so a parent on
            // the right tier never sees a cancel button at all.
            if (!this._confirmingCancel) {
                this.$("action").innerHTML = `
                  <div class="warn">
                    <strong>Your plan is on the wrong fee</strong>
                    <p>
                      You're paying <b>${esc(a.currentPlanLabel || "a different fee")}</b>, but the club has
                      you down for <b>${esc(a.newPlanLabel || "another fee")}</b>. Cancel this plan first —
                      then you can set up the correct one. Doing it this way means you're never
                      paying for both at once.
                    </p>
                    <button type="button" class="btn danger" data-act="askCancel">Cancel this plan</button>
                  </div>${msg}`;
                return;
            }
            this.$("action").innerHTML = `
              <div class="confirm">
                <strong>Cancel this Direct Debit?</strong>
                <p>
                  This cancels the plan with your bank. Nothing further is collected on it.
                  You'll then need to set up the correct plan — the club will chase you if you don't,
                  but your child isn't covered until it's done.
                </p>
                <button type="button" class="btn danger" data-act="confirmCancel" ${busy ? "disabled" : ""}>
                  ${busy ? "Cancelling…" : "Yes, cancel this plan"}
                </button>
                <button type="button" class="btn quiet" data-act="abortCancel" ${busy ? "disabled" : ""}>
                  No, keep it for now
                </button>
              </div>${msg}`;
            return;
        }

        // "none" - active on the right tier, pending, or awaiting the club.
        // Deliberately no button: there is nothing useful for a parent to do.
        this.$("action").innerHTML = a.note
            ? `<div class="empty">${esc(a.note)}</div>${msg}` : msg;
    }
}

if (!customElements.get("parent-hub-payment-detail")) {
    customElements.define("parent-hub-payment-detail", ParentHubPaymentDetail);
}

// =====================================================================
//  PAGE CODE CONTRACT
// =====================================================================
//  IN — {loading:true} first, then:
//    kidName, planLabel, schedule, statusText
//    pill:   { text, bg, fg }                       // from resolvePayPill()
//    ticks:  [{ month, status }]                    // paid|failed|due|future
//    ledger: [{ date, status, amount }]             // PAID|FAILED|PENDING
//    action: {
//      kind: "setup" | "cancelOld" | "none",
//      busy: false,
//      error: "",
//      currentPlanLabel, newPlanLabel,              // cancelOld only
//      note                                         // none only
//    }
//
//  ⚠️ `action.kind` is the ONLY thing that decides which control appears,
//  and page code decides it. Exactly one action is ever offered, or none -
//  showing checkout while an active mandate exists would create a SECOND
//  GoCardless subscription instead of fixing anything.
//
//  OUT:
//    on("startSetup", () => …)   // startGoCardlessSetup, then redirect
//    on("cancelPlan", () => …)   // cancelGoCardlessSubscription
//
//  cancelPlan only fires after the parent has confirmed a second time. The
//  element handles that step itself; page code receives one clean intent.
//  Any fresh `data` payload drops the confirm, so a destructive button is
//  never left armed over data it no longer describes.
// =====================================================================
