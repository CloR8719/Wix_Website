// =====================================================================
//  <manager-hub-messages> — Manager Hub v2, messages sent
// =====================================================================
//  What this team has been sent, newest first, and the way in to writing
//  another one.
//
//  SETUP:
//    1. Public -> custom-elements -> new file `managerHubMessages.js`.
//    2. On stateMessages: Add -> Embed Code -> Custom Element.
//       Tag name: manager-hub-messages   Element ID: #customMgrMessages
//    3. Height ~650px to start; it self-sizes after first paint.
//
//  ⚠️ REPUBLISH *AND* HARD-REFRESH after any change.
//
//  REACH IS SHOWN ON EVERY ROW because in-hub messages have no delivery
//  receipt - nothing emails, nothing pushes. "Reached 14 parents" is the
//  only feedback a manager gets that the thing went anywhere, and it's the
//  honest version: it's how many parents CAN see it, not how many did.
// =====================================================================

const STYLES = `
  :host { display: block; width: 100%; font-family: 'Work Sans', -apple-system, BlinkMacSystemFont, sans-serif; }
  * { box-sizing: border-box; }

  .wrap {
    --accent:#2C3540; --accent-soft:#E3E6EA;
    --surface:#FFFFFF; --raised:#FFFFFF;
    --line:#E1E4DB; --line-soft:#ECEEE8;
    --text:#16212F; --text-muted:#5C6B7A; --text-faint:#8B98A3;
    --critical:#C23B3B; --critical-bg:#FCEAEA;
    --info:#1F5FA8; --info-bg:#E0EDFB;
    --neutral:#5A6472; --neutral-bg:#E8EAED;
    padding: 14px 16px 32px;
    color: var(--text);
    display: flex; flex-direction: column; gap: 14px;
  }

  .btn {
    font-family: inherit; font-size: 13px; font-weight: 700;
    padding: 11px 15px; border-radius: 10px; cursor: pointer;
    border: 1.5px solid transparent; width: 100%;
  }
  .btn.primary { background: var(--accent); color: #fff; }
  .btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

  .note {
    font-size: 12px; color: var(--text-muted); line-height: 1.55;
    background: var(--neutral-bg); padding: 11px 13px; border-radius: 10px;
  }

  .list { display: flex; flex-direction: column; gap: 10px; }
  .row {
    background: var(--surface); border: 1px solid var(--line-soft);
    border-radius: 12px; padding: 14px 15px;
    width: 100%; text-align: left; font-family: inherit; color: inherit;
    cursor: pointer;
  }
  .row:hover { border-color: var(--line); }
  .row:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

  .head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
  .title { font-size: 14px; font-weight: 700; line-height: 1.35; }
  .time { font-size: 11.5px; color: var(--text-faint); white-space: nowrap; }
  .snippet { font-size: 12.5px; color: var(--text-muted); line-height: 1.55; margin-top: 4px; }
  .body {
    display: none; font-size: 13px; line-height: 1.65; margin-top: 6px;
    padding-top: 9px; border-top: 1px solid var(--line-soft);
    white-space: pre-wrap; overflow-wrap: anywhere;
  }
  .row.open .body { display: block; }
  .row.open .snippet { display: none; }

  .reach { margin-top: 9px; font-size: 11.5px; color: var(--text-faint); }
  /* "Seen", not "read" - it means the parent opened their messages after this
     was sent, which isn't the same as reading this one. The tooltip says so,
     because a manager acting on the number should know what it measures. */
  .seen { color: var(--text-muted); font-weight: 600; cursor: help; }
  .pill {
    display: inline-block; padding: 2px 8px; border-radius: 999px;
    font-size: 10px; font-weight: 700; margin-right: 6px;
    background: var(--neutral-bg); color: var(--neutral);
  }

  .empty, .loading {
    padding: 40px 18px; text-align: center; font-size: 13px;
    color: var(--text-muted); line-height: 1.6;
    border: 1px dashed var(--line); border-radius: 12px;
  }
  .err {
    padding: 14px 15px; border-radius: 11px; line-height: 1.55;
    background: var(--critical-bg); color: var(--critical);
    font-size: 12.5px; font-weight: 600;
  }

  @media (prefers-color-scheme: dark) {
    .wrap {
      --accent:#A9B6C4; --accent-soft:#1B222B;
      --surface:#0E1826; --raised:#121F30;
      --line:#223145; --line-soft:#1A2739;
      --text:#E7ECF2; --text-muted:#A6B4C3; --text-faint:#71818F;
      --critical:#F08A8A; --critical-bg:#3A1414;
      --info:#7FB2EC;    --info-bg:#132A42;
      --neutral:#9AA6B4; --neutral-bg:#1E2733;
    }
    .btn.primary { color: #101820; }
  }

  @media (max-width: 749px) {
    .wrap { padding-bottom: calc(84px + env(safe-area-inset-bottom, 0px)); }
  }
`;

function esc(value) {
    return String(value == null ? "" : value)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;")
        .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

class ManagerHubMessages extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._built = false;
        this._data = { loading: true };
        this._resizeObserver = null;
        this._lastHeight = 0;
        this._open = {};
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
            console.error("manager-hub-messages: couldn't parse data attribute", err);
        }
    }

    build() {
        if (this._built) return;
        this._built = true;

        this.shadowRoot.innerHTML = `<style>${STYLES}</style>
          <div class="wrap">
            <button type="button" class="btn primary" id="compose">＋ Write a message</button>
            <div class="note">
              Messages appear in each parent's hub. They don't email or text —
              parents see them next time they open it.
            </div>
            <div id="body"></div>
          </div>`;

        this.shadowRoot.getElementById("compose").addEventListener("click", () => {
            this.dispatchEvent(new CustomEvent("compose", { detail: {} }));
        });

        this.shadowRoot.getElementById("body").addEventListener("click", (event) => {
            const row = event.target.closest(".row");
            if (!row) return;
            const key = row.getAttribute("data-key");
            this._open[key] = !this._open[key];
            // Toggled on the node rather than repainted, so the list doesn't
            // jump while a manager is reading.
            row.classList.toggle("open", this._open[key]);
        });

        this.paint();
    }

    paint() {
        const d = this._data;
        const body = this.shadowRoot.getElementById("body");

        if (d.loading) { body.innerHTML = `<div class="loading">Loading…</div>`; return; }
        if (d.error) { body.innerHTML = `<div class="err">${esc(d.error)}</div>`; return; }

        const rows = Array.isArray(d.messages) ? d.messages : [];
        if (rows.length === 0) {
            body.innerHTML = `<div class="empty">
                Nothing sent yet.<br>
                Anything you write appears here and in every parent's hub.
              </div>`;
            return;
        }

        body.innerHTML = `<div class="list">${rows.map(m => `
          <div class="row ${this._open[m.key] ? "open" : ""}" data-key="${esc(m.key)}"
               role="button" tabindex="0">
            <div class="head">
              <span class="title">${esc(m.title)}</span>
              <span class="time">${esc(m.time)}</span>
            </div>
            <div class="snippet">${esc(m.snippet || m.body)}</div>
            <div class="body">${esc(m.body)}</div>
            <div class="reach">
              ${m.scope === "Parent" ? `<span class="pill">One family</span>` : `<span class="pill">Squad</span>`}
              Sent to ${Number(m.reach) || 0} ${Number(m.reach) === 1 ? "parent" : "parents"}
              · <span class="seen" title="Opened their messages after this was sent. Not proof they read this one.">seen by ${Number(m.seenBy) || 0}</span>
            </div>
          </div>`).join("")}</div>`;
    }
}

if (!customElements.get("manager-hub-messages")) {
    customElements.define("manager-hub-messages", ManagerHubMessages);
}

// =====================================================================
//  PAGE CODE CONTRACT
// =====================================================================
//  IN — {loading:true} first, then getSentMessages()'s payload:
//    { messages: [{ key, id, title, body, snippet, time, scope, reach }] }
//
//  OUT:
//    on("compose", () => …)
// =====================================================================
