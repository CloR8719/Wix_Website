// =====================================================================
//  <manager-hub-compose> — Manager Hub v2, write a message
// =====================================================================
//  SETUP:
//    1. Public -> custom-elements -> new file `managerHubCompose.js`.
//    2. On stateMessageCompose: Add -> Embed Code -> Custom Element.
//       Tag name: manager-hub-compose   Element ID: #customCompose
//    3. Height ~700px to start; it self-sizes after first paint.
//
//  ⚠️ REPUBLISH *AND* HARD-REFRESH after any change.
//
//  TWO SCOPES ONLY: the manager's own squad, or one family in it. Club-wide
//  is a secretary's job and isn't offered here. The backend enforces that
//  independently - this element choosing not to show a third option is
//  convenience, not security.
//
//  THE SEND BUTTON STATES THE REACH ("Send to 14 parents") rather than just
//  "Send". These messages have no recall and no delivery receipt, so the
//  count is the last moment a manager can notice they're about to write to
//  the whole squad when they meant one family.
//
//  senderName is displayed but NOT editable, and the backend takes it from
//  the staff record regardless of what arrives. A parent seeing
//  "Michael Turner" needs that to be true.
// =====================================================================

const STYLES = `
  :host { display: block; width: 100%; font-family: 'Work Sans', -apple-system, BlinkMacSystemFont, sans-serif; }
  * { box-sizing: border-box; }

  .wrap {
    --accent:#2C3540; --accent-soft:#E3E6EA;
    --surface:#FFFFFF; --raised:#FFFFFF;
    --line:#E1E4DB; --line-soft:#ECEEE8;
    --text:#16212F; --text-muted:#5C6B7A; --text-faint:#8B98A3;
    --success:#158A45; --success-bg:#E4F5EA;
    --warning:#9A6200; --warning-bg:#FEF3DE;
    --critical:#C23B3B; --critical-bg:#FCEAEA;
    --info:#1F5FA8; --info-bg:#E0EDFB;
    --neutral:#5A6472; --neutral-bg:#E8EAED;
    padding: 16px 16px 32px;
    color: var(--text);
    display: flex; flex-direction: column; gap: 15px;
  }

  /* ⚠️ THE GAP HAS TO BE HERE, NOT ON .wrap. Every section is rendered into
     #body, so #body is .wrap's only child - a gap on .wrap has nothing to
     separate. Without this the sections stack with zero space and each
     heading sits directly on the card above it. Same bug as Parent Hub's
     .wrap/#detail gap. */
  #body { display: flex; flex-direction: column; gap: 18px; }

  .from { font-size: 12.5px; color: var(--text-muted); }
  .from b { color: var(--text); }

  .label {
    font-size: 10.5px; font-weight: 700; letter-spacing: .07em;
    text-transform: uppercase; color: var(--text-faint); margin-bottom: 14px;
  }

  .radio {
    display: flex; align-items: flex-start; gap: 10px;
    padding: 12px 13px; border: 1.5px solid var(--line); border-radius: 11px;
    cursor: pointer; background: var(--surface); width: 100%; text-align: left;
    font-family: inherit; color: inherit;
  }
  .radio + .radio { margin-top: 8px; }
  .radio[aria-pressed="true"] { border-color: var(--accent); background: var(--accent-soft); }
  .radio .dot {
    width: 16px; height: 16px; border-radius: 50%; flex-shrink: 0; margin-top: 1px;
    border: 2px solid var(--line);
  }
  .radio[aria-pressed="true"] .dot {
    border-color: var(--accent); background: var(--accent);
    box-shadow: inset 0 0 0 3px var(--accent-soft);
  }
  .radio b { display: block; font-size: 13.5px; font-weight: 700; }
  .radio span { font-size: 11.5px; color: var(--text-muted); line-height: 1.5; }
  .radio:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

  .field label {
    display: block; font-size: 11.5px; font-weight: 600;
    color: var(--text-muted); margin-bottom: 5px;
  }
  .field input, .field textarea, .field select {
    width: 100%; font-family: inherit; font-size: 14px;
    padding: 11px 12px; border: 1px solid var(--line); border-radius: 10px;
    background: var(--surface); color: var(--text);
  }
  .field textarea { resize: vertical; min-height: 130px; line-height: 1.6; }
  .field input:focus, .field textarea:focus, .field select:focus {
    outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft);
  }
  .field.bad input, .field.bad textarea { border-color: var(--critical); }
  .count { font-size: 11px; color: var(--text-faint); margin-top: 5px; text-align: right; }

  .warn {
    font-size: 12px; line-height: 1.55; padding: 11px 13px; border-radius: 10px;
    background: var(--warning-bg); color: var(--warning);
  }

  .btn {
    font-family: inherit; font-size: 13.5px; font-weight: 700;
    padding: 12px 16px; border-radius: 10px; cursor: pointer;
    border: 1.5px solid transparent; width: 100%;
  }
  .btn.primary { background: var(--accent); color: #fff; }
  .btn.ghost { background: transparent; color: var(--text-muted); border-color: var(--line); }
  .btn[disabled] { opacity: .55; cursor: default; }
  .btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .actions { display: flex; flex-direction: column; gap: 9px; }

  .err {
    padding: 12px 14px; border-radius: 10px; line-height: 1.55;
    background: var(--critical-bg); color: var(--critical);
    font-size: 12.5px; font-weight: 600;
  }
  .ok {
    padding: 12px 14px; border-radius: 10px; line-height: 1.55;
    background: var(--success-bg); color: var(--success);
    font-size: 12.5px; font-weight: 600;
  }
  .loading { padding: 40px 18px; text-align: center; font-size: 13px; color: var(--text-muted); }

  @media (prefers-color-scheme: dark) {
    .wrap {
      --accent:#A9B6C4; --accent-soft:#1B222B;
      --surface:#0E1826; --raised:#121F30;
      --line:#223145; --line-soft:#1A2739;
      --text:#E7ECF2; --text-muted:#A6B4C3; --text-faint:#71818F;
      --success:#5FD08B; --success-bg:#103322;
      --warning:#E5B567; --warning-bg:#3A2C10;
      --critical:#F08A8A; --critical-bg:#3A1414;
      --info:#7FB2EC;    --info-bg:#132A42;
      --neutral:#9AA6B4; --neutral-bg:#1E2733;
    }
    .btn.primary { color: #101820; }
  }

  @media (max-width: 749px) {
    .wrap { padding-bottom: calc(84px + env(safe-area-inset-bottom, 0px)); }
  }

  /* iOS Safari zooms the page in when an input under 16px takes focus, and
     never zooms back out - leaving the manager stuck on a magnified page
     mid-form. On a phone correctness beats matching the mockup. Same rule
     as parentHubHome.js. */
  @media (max-width: 749px) {
    input, select, textarea { font-size: 16px; }
  }
`;

function esc(value) {
    return String(value == null ? "" : value)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;")
        .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

class ManagerHubCompose extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._built = false;
        this._data = { loading: true };
        this._resizeObserver = null;
        this._lastHeight = 0;
        // Sender defaults from the SCOPE: a squad message is the team
        // speaking, a message to one family is a person speaking. Once the
        // manager picks a sender themselves, changing scope stops overriding
        // it - same rule the fixture form uses for audience.
        this._form = { scope: "Team", playerId: "", title: "", body: "", senderAs: "team" };
        this._senderTouched = false;
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
            if (!parsed || typeof parsed !== "object") return;
            this._data = parsed;
            // Sent successfully - clear the form so a second tap on a stale
            // screen can't send the same thing twice.
            if (parsed.sent) this._form = { scope: "Team", playerId: "", title: "", body: "", senderAs: this._form.senderAs };
            // Opened from a player record, pre-aimed at that family.
            if (parsed.presetPlayerId && !this._form.playerId) {
                this._form.scope = "Parent";
                this._form.playerId = parsed.presetPlayerId;
            }
            // senderOptions only arrive with the payload, so the constructor
            // couldn't know whether a team option exists.
            if (!this._senderTouched) this._form.senderAs = this.defaultSender();
            this.paint();
        } catch (err) {
            console.error("manager-hub-compose: couldn't parse data attribute", err);
        }
    }

    build() {
        if (this._built) return;
        this._built = true;

        this.shadowRoot.innerHTML = `<style>${STYLES}</style>
          <div class="wrap"><div id="body"></div></div>`;

        const body = this.shadowRoot.getElementById("body");

        body.addEventListener("click", (event) => {
            const el = event.target.closest("[data-act]");
            if (!el || el.disabled) return;
            const act = el.getAttribute("data-act");
            if (act === "scope") {
                this._form.scope = el.getAttribute("data-val");
                if (!this._senderTouched) this._form.senderAs = this.defaultSender();
                this.paint();
                return;
            }
            if (act === "send") {
                this.dispatchEvent(new CustomEvent("send", { detail: Object.assign({}, this._form) }));
                return;
            }
            if (act === "cancel") {
                this.dispatchEvent(new CustomEvent("cancelCompose", { detail: {} }));
                return;
            }
        });

        // Held on every keystroke so an error arriving mid-write doesn't
        // discard a message someone has just spent five minutes on.
        body.addEventListener("input", (event) => {
            const f = event.target.getAttribute("data-field");
            if (!f) return;
            this._form[f] = event.target.value;
            if (f === "body") {
                const c = this.shadowRoot.getElementById("count");
                if (c) c.textContent = `${event.target.value.length} characters`;
            }
        });

        body.addEventListener("change", (event) => {
            const f = event.target.getAttribute("data-field");
            if (!f) return;
            this._form[f] = event.target.value;
            if (f === "senderAs") this._senderTouched = true;
        });

        this.paint();
    }

    // Team messages read as being from the squad; a message to one family
    // reads as being from the person who sent it. Falls back to the person if
    // there's no team option to use.
    defaultSender() {
        if (this._form.scope !== "Team") return "me";
        const opts = (this._data && this._data.senderOptions) || [];
        return opts.some(o => o.value === "team") ? "team" : "me";
    }

    paint() {
        const d = this._data;
        const f = this._form;
        const body = this.shadowRoot.getElementById("body");

        if (d.loading) { body.innerHTML = `<div class="loading">Loading…</div>`; return; }
        if (d.fatal) { body.innerHTML = `<div class="err">${esc(d.fatal)}</div>`; return; }

        const players = Array.isArray(d.players) ? d.players : [];
        const toSquad = f.scope === "Team";
        const reach = toSquad ? (Number(d.reach) || 0) : 1;

        const sendLabel = d.sending
            ? "Sending…"
            : toSquad
                ? `Send to ${reach} ${reach === 1 ? "parent" : "parents"}`
                : "Send to this family";

        body.innerHTML = `
          ${d.sent ? `<div class="ok">${esc(d.sent)}</div>` : ""}
          ${d.error ? `<div class="err">${esc(d.error)}</div>` : ""}

          ${(Array.isArray(d.senderOptions) && d.senderOptions.length > 1) ? `
            <div class="field">
              <label for="fSender">Send it as</label>
              <select id="fSender" data-field="senderAs">
                ${d.senderOptions.map(o => `
                  <option value="${esc(o.value)}" ${f.senderAs === o.value ? "selected" : ""}>${esc(o.label)}</option>`).join("")}
              </select>
              <p class="from" style="margin-top:6px">This is the name parents see on the message.</p>
            </div>`
            : `<p class="from">From <b>${esc(d.senderName || "you")}</b> — parents see this name.</p>`}

          <div>
            <div class="label">Who's it for?</div>
            <button type="button" class="radio" data-act="scope" data-val="Team"
                    aria-pressed="${toSquad}">
              <span class="dot"></span>
              <span><b>My squad</b>
                <span>All ${reach} ${reach === 1 ? "parent" : "parents"} in this team</span></span>
            </button>
            <button type="button" class="radio" data-act="scope" data-val="Parent"
                    aria-pressed="${!toSquad}">
              <span class="dot"></span>
              <span><b>One family</b>
                <span>Pick a player and message their parents</span></span>
            </button>
          </div>

          ${!toSquad ? `
            <div class="field">
              <label for="fPlayer">Which player?</label>
              <select id="fPlayer" data-field="playerId">
                <option value="">Choose a player…</option>
                ${players.map(p => `
                  <option value="${esc(p.id)}" ${f.playerId === p.id ? "selected" : ""}>
                    ${esc(p.name)}${p.parentName ? " — " + esc(p.parentName) : ""}
                  </option>`).join("")}
              </select>
            </div>` : ""}

          <div class="field ${d.badField === "title" ? "bad" : ""}">
            <label for="fTitle">Subject</label>
            <input id="fTitle" type="text" data-field="title" value="${esc(f.title)}"
                   placeholder="Training moved to Thursday" />
          </div>

          <div class="field ${d.badField === "body" ? "bad" : ""}">
            <label for="fBody">Message</label>
            <textarea id="fBody" data-field="body" rows="6"
                      placeholder="The pitch is booked out on Wednesday…">${esc(f.body)}</textarea>
            <div class="count" id="count">${f.body.length} characters</div>
          </div>

          <div class="warn">
            Parents read this in their hub — it doesn't email or text them, and
            it can't be unsent.
          </div>

          <div class="actions">
            <button type="button" class="btn primary" data-act="send" ${d.sending ? "disabled" : ""}>
              ${esc(sendLabel)}
            </button>
            <button type="button" class="btn ghost" data-act="cancel">Cancel</button>
          </div>`;
    }
}

if (!customElements.get("manager-hub-compose")) {
    customElements.define("manager-hub-compose", ManagerHubCompose);
}

// =====================================================================
//  PAGE CODE CONTRACT
// =====================================================================
//  IN — {loading:true} first, then getComposeContext()'s payload plus:
//    {
//      senderName, reach, players: [{ id, name, parentName }],
//      sending: bool, error: "", badField: "title"|"body",
//      sent: "Sent to 14 parents ✓",     // clears the form
//      presetPlayerId: ""                // arriving from a player record
//    }
//
//  OUT:
//    on("send", e => …)   // { scope, playerId, title, body }
//    on("cancelCompose", () => …)
//
//  scope is only ever "Team" or "Parent" - the backend rejects anything
//  else regardless of what's sent.
// =====================================================================
