// =====================================================================
//  <parent-hub-payments> — Parent Hub v2, Payments hub
// =====================================================================
//  One row per child with a status pill, tapping through to the detail.
//  Pure display and navigation - nothing here touches money.
//
//  SETUP:
//    1. Public -> custom-elements -> new file `parentHubPayments.js`.
//    2. On statePayments: Add -> Embed Code -> Custom Element.
//       Tag name: parent-hub-payments   Element ID: #customPayments
//    3. Height ~500px to start; it self-sizes after first paint.
//
//  ⚠️ REPUBLISH *AND* HARD-REFRESH after any change - the styles live
//  inside this .js file, so a cached copy means cached CSS.
//
//  THE PILL LOGIC STAYS IN PAGE CODE. resolvePayPill() decides what state a
//  child is in from the GoCardless reply; this element is handed a finished
//  label and tone. Money-state logic has one home and it isn't here.
// =====================================================================

const STYLES = `
  :host { display: block; width: 100%; font-family: 'Work Sans', -apple-system, BlinkMacSystemFont, sans-serif; }
  * { box-sizing: border-box; }
  .wrap {
    --surface:#FFFFFF; --raised:#FFFFFF; --pitch:#1F5136; --pitch-soft:#DCE9E0;
    --line:#E1E4DB; --line-soft:#ECEEE8;
    --text:#16212F; --text-muted:#5C6B7A; --text-faint:#8B98A3;
    padding: 16px; color: var(--text);
  }
  @media (min-width: 750px) { .wrap { padding: 22px 28px; } }

  .intro { margin: 0 0 18px; font-size: 12.5px; color: var(--text-muted); line-height: 1.55; }

  .rows { display: flex; flex-direction: column; gap: 10px; }
  .row {
    display: flex; align-items: center; gap: 12px; width: 100%;
    background: var(--raised); border: 1px solid var(--line);
    border-radius: 12px; padding: 13px 14px; cursor: pointer;
    font-family: inherit; font-size: inherit; text-align: left; color: inherit;
  }
  .row:hover { border-color: var(--text-faint); }
  .row:focus-visible { outline: 2px solid var(--pitch); outline-offset: 2px; }

  .avatar {
    width: 38px; height: 38px; border-radius: 50%; flex-shrink: 0;
    background: var(--pitch-soft); color: var(--pitch);
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; font-weight: 700;
  }
  .txt { flex: 1; min-width: 0; }
  .txt strong { display: block; font-size: 14px; font-weight: 700; line-height: 1.25; overflow-wrap: anywhere; }
  .txt span { display: block; font-size: 11.5px; color: var(--text-muted); margin-top: 2px; line-height: 1.4; }

  .pill {
    flex-shrink: 0; display: inline-flex; align-items: center;
    padding: 4px 10px; border-radius: 999px;
    font-size: 11px; font-weight: 700; line-height: 1.35;
  }
  .chev { flex-shrink: 0; color: var(--text-faint); display: flex; }
  .chev svg { width: 15px; height: 15px; }

  .empty {
    padding: 22px 16px; text-align: center; font-size: 13px;
    color: var(--text-muted); line-height: 1.5;
    border: 1px dashed var(--line); border-radius: 12px;
  }
  .loading { padding: 36px 16px; text-align: center; font-size: 13px; color: var(--text-muted); }

  @media (prefers-color-scheme: dark) {
    .wrap {
      --surface:#0E1826; --raised:#121F30; --line:#223145; --line-soft:#1A2739;
      --text:#E7ECF2; --text-muted:#A6B4C3; --text-faint:#71818F;
      --pitch:#5FBF8B; --pitch-soft:#17301F;
    }
  }

  /* Clearance for the bottom nav bar, which is pinned over the content on
     mobile. Without this the last item sits under it and can't be scrolled
     into view - the page rubber-bands back the moment you let go. Desktop
     puts the nav in a left rail, so nothing is covering the bottom there. */
  @media (max-width: 749px) {
    .wrap { padding-bottom: calc(84px + env(safe-area-inset-bottom, 0px)); }
  }
`;

const CHEVRON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>';

function esc(value) {
    return String(value == null ? "" : value)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;")
        .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

class ParentHubPayments extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._built = false;
        this._data = { loading: true };
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
            if (parsed && typeof parsed === "object") { this._data = parsed; this.paint(); }
        } catch (err) {
            console.error("parent-hub-payments: couldn't parse data attribute", err);
        }
    }

    build() {
        if (this._built) return;
        this._built = true;
        this.shadowRoot.innerHTML = `
          <style>${STYLES}</style>
          <div class="wrap">
            <p class="intro">Club fees are collected by Direct Debit through GoCardless. Tap a child to see their plan.</p>
            <div id="rows"></div>
          </div>`;

        this.shadowRoot.getElementById("rows").addEventListener("click", (event) => {
            const btn = event.target.closest("[data-id]");
            if (!btn) return;
            this.dispatchEvent(new CustomEvent("openPayment", {
                detail: { id: btn.getAttribute("data-id") }
            }));
        });
        this.paint();
    }

    paint() {
        const d = this._data;
        const rows = this.shadowRoot.getElementById("rows");

        if (d.loading) {
            rows.innerHTML = `<div class="loading">Loading payment plans…</div>`;
            return;
        }

        const kids = Array.isArray(d.kids) ? d.kids : [];
        if (kids.length === 0) {
            rows.innerHTML = `<div class="empty">No children linked to your account yet.</div>`;
            return;
        }

        rows.innerHTML = `<div class="rows">${kids.map(k => `
          <button type="button" class="row" data-id="${esc(k.id)}">
            <div class="avatar">${esc(k.initials || "?")}</div>
            <div class="txt">
              <strong>${esc(k.name)}</strong>
              <span>${esc(k.subText || "")}</span>
            </div>
            <span class="pill" style="background:${esc(k.pillBg)};color:${esc(k.pillFg)}">${esc(k.pillText)}</span>
            <div class="chev">${CHEVRON}</div>
          </button>`).join("")}</div>`;
    }
}

if (!customElements.get("parent-hub-payments")) {
    customElements.define("parent-hub-payments", ParentHubPayments);
}

// =====================================================================
//  PAGE CODE CONTRACT
// =====================================================================
//  IN — {loading:true} first, then:
//    kids: [{ id, name, initials, subText, pillText, pillBg, pillFg }]
//
//  The pill's text AND colours are decided by resolvePayPill() in page code
//  and passed through finished. The element never sees a GoCardless status.
//
//  OUT:
//    on("openPayment", e => …)   // e.detail.id -> switch to statePaymentDetail
// =====================================================================
