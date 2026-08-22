// =====================================================================
//  <manager-hub-player> — Manager Hub v2, one player's record
// =====================================================================
//  Replaces the PlayerProfile Lightbox. Everything a manager needs about a
//  child on one screen: what's happening with their registration, who to
//  ring, medical, kit number, and fees.
//
//  SETUP:
//    1. Public -> custom-elements -> new file `managerHubPlayer.js`.
//    2. On statePlayerRecord: Add -> Embed Code -> Custom Element.
//       Tag name: manager-hub-player   Element ID: #customPlayer
//    3. Height ~700px to start; it self-sizes after first paint.
//
//  ⚠️ REPUBLISH *AND* HARD-REFRESH after any change.
//
//  A state, not a Lightbox. The Lightbox version had to be laid out twice
//  like everything else, and a Lightbox on a phone is a full screen wearing
//  a costume. This gets a real back button from the topbar and costs nothing
//  extra per breakpoint.
//
//  THE FEE BLOCK IS ABSENT, NOT HIDDEN, for a Limited coach - the server
//  omits `fee` from the payload entirely (see getPlayerRecord). This element
//  simply has nothing to draw. Never reintroduce it as a CSS rule.
//
//  ONE VISIBLE ACTION AT A TIME. Editing the kit number replaces the button
//  with the field and its own save/cancel, rather than showing an
//  always-editable input among read-only text. Admin screens get misread
//  when several things look equally actionable.
// =====================================================================

const TONE_CLASS = {
    success: "t-success", warning: "t-warning", critical: "t-critical",
    info: "t-info", violet: "t-violet", neutral: "t-neutral"
};

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
    --violet:#6D3FBF; --violet-bg:#EFE7FB;
    --neutral:#5A6472; --neutral-bg:#E8EAED;
    padding: 16px 16px 32px;
    color: var(--text);
    display: flex; flex-direction: column; gap: 16px;
  }

  /* ⚠️ THE GAP HAS TO BE HERE, NOT ON .wrap. Every section is rendered into
     #body, so #body is .wrap's only child - a gap on .wrap has nothing to
     separate. Without this the sections stack with zero space and each
     heading sits directly on the card above it. Same bug as Parent Hub's
     .wrap/#detail gap. */
  #body { display: flex; flex-direction: column; gap: 18px; }

  .banner {
    padding: 15px 17px; border-radius: 11px;
    font-size: 12.5px; font-weight: 600; line-height: 1.6;
  }
  .banner.needs { background: var(--warning-bg); color: var(--warning); }
  .banner.fyi   { background: var(--info-bg);    color: var(--info); }
  .banner.sent  { background: var(--critical-bg); color: var(--critical); }

  .label {
    font-size: 10.5px; font-weight: 700; letter-spacing: .07em;
    text-transform: uppercase; color: var(--text-faint); margin-bottom: 14px;
  }

  /* Roomier than the first version. Text sitting tight against a card edge
     reads as cramped on a phone, and this screen is mostly labelled values -
     the thing that suffers most from being packed. */
  .card {
    background: var(--surface); border: 1px solid var(--line-soft);
    border-radius: 12px; padding: 17px 18px;
  }
  .card + .card { margin-top: 10px; }

  dl.kv {
    display: grid; grid-template-columns: auto 1fr;
    gap: 10px 18px; font-size: 13px; line-height: 1.5; margin: 0;
  }
  dl.kv dt { color: var(--text-faint); }
  dl.kv dd { margin: 0; color: var(--text); overflow-wrap: anywhere; }

  .pill {
    display: inline-block; padding: 3px 9px; border-radius: 999px;
    font-size: 10.5px; font-weight: 700; white-space: nowrap;
  }
  .t-success  { background: var(--success-bg);  color: var(--success); }
  .t-warning  { background: var(--warning-bg);  color: var(--warning); }
  .t-critical { background: var(--critical-bg); color: var(--critical); }
  .t-info     { background: var(--info-bg);     color: var(--info); }
  .t-violet   { background: var(--violet-bg);   color: var(--violet); }
  .t-neutral  { background: var(--neutral-bg);  color: var(--neutral); }
  .t-accent   { background: var(--accent-soft); color: var(--accent); }

  .parent-nm { font-size: 14px; font-weight: 700; }
  .contact { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
  .contact a {
    font-size: 12.5px; font-weight: 700; text-decoration: none;
    padding: 10px 14px; border-radius: 9px;
    background: var(--accent-soft); color: var(--accent);
  }
  .contact a:hover { text-decoration: underline; }

  /* Payment status carries its tone as a background, so "needs chasing" is
     visible before the sentence is read. */
  .pay { font-size: 13px; font-weight: 600; line-height: 1.6; }
  .pay.success  { background: var(--success-bg);  color: var(--success);  border-color: transparent; }
  .pay.warning  { background: var(--warning-bg);  color: var(--warning);  border-color: transparent; }
  .pay.critical { background: var(--critical-bg); color: var(--critical); border-color: transparent; }
  .pay.neutral  { color: var(--text-muted); }

  /* Medical is the one thing on this screen that must never be missed, so it
     gets its own block rather than a row in a list. */
  .med { background: var(--warning-bg); color: var(--warning); }
  .med .body { font-size: 12.5px; line-height: 1.65; margin-top: 8px; white-space: pre-wrap; }
  .med-clear { font-size: 12.5px; color: var(--text-muted); }

  .btn {
    font-family: inherit; font-size: 12.5px; font-weight: 700;
    padding: 9px 13px; border-radius: 9px; cursor: pointer;
    border: 1.5px solid transparent; white-space: nowrap;
  }
  .btn.primary { background: var(--accent); color: #fff; }
  .btn.ghost { background: transparent; color: var(--text-muted); border-color: var(--line); }
  .btn[disabled] { opacity: .55; cursor: default; }
  .btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .btns { display: flex; gap: 7px; flex-wrap: wrap; margin-top: 12px; }

  .kitedit { display: flex; gap: 7px; align-items: center; margin-top: 11px; }
  .kitedit input {
    width: 90px; font-family: inherit; font-size: 13px; padding: 9px 11px;
    border: 1px solid var(--line); border-radius: 9px;
    background: var(--surface); color: var(--text);
  }
  .msg { font-size: 11.5px; font-weight: 600; margin-top: 8px; }
  .msg.bad { color: var(--critical); }
  .msg.good { color: var(--success); }

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
      --success:#5FD08B; --success-bg:#103322;
      --warning:#E5B567; --warning-bg:#3A2C10;
      --critical:#F08A8A; --critical-bg:#3A1414;
      --info:#7FB2EC;    --info-bg:#132A42;
      --violet:#B294E8;  --violet-bg:#251A3D;
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

class ManagerHubPlayer extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._built = false;
        this._data = { loading: true };
        this._resizeObserver = null;
        this._lastHeight = 0;
        this._editingKit = false;
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
            // A fresh record means the save landed - close the editor rather
            // than leaving it open over a value that's already been written.
            if (parsed.id && this._data.id !== parsed.id) this._editingKit = false;
            if (parsed.kitSaved) this._editingKit = false;
            this._data = parsed;
            this.paint();
        } catch (err) {
            console.error("manager-hub-player: couldn't parse data attribute", err);
        }
    }

    build() {
        if (this._built) return;
        this._built = true;

        this.shadowRoot.innerHTML = `<style>${STYLES}</style>
          <div class="wrap"><div id="body"></div></div>`;

        this.shadowRoot.getElementById("body").addEventListener("click", (event) => {
            const el = event.target.closest("[data-act]");
            if (!el || el.disabled) return;
            const act = el.getAttribute("data-act");

            if (act === "editKit") { this._editingKit = true; this.paint(); return; }
            if (act === "cancelKit") { this._editingKit = false; this.paint(); return; }
            if (act === "saveKit") {
                const input = this.shadowRoot.getElementById("kitInput");
                this.dispatchEvent(new CustomEvent("saveKit", {
                    detail: { playerId: this._data.id, kitNumber: input ? input.value.trim() : "" }
                }));
                return;
            }
            this.dispatchEvent(new CustomEvent(act, { detail: { playerId: this._data.id } }));
        });

        this.paint();
    }

    paint() {
        const d = this._data;
        const body = this.shadowRoot.getElementById("body");

        if (d.loading) { body.innerHTML = `<div class="loading">Loading…</div>`; return; }
        if (d.error) { body.innerHTML = `<div class="err">${esc(d.error)}</div>`; return; }

        body.innerHTML = [
            this.bannerHtml(d),
            this.registrationHtml(d),
            this.medicalHtml(d),
            this.parentsHtml(d),
            this.paymentHtml(d)
        ].filter(Boolean).join("");
    }

    bannerHtml(d) {
        // The secretary's return note outranks the generic next-step line -
        // it's the specific thing that has to be fixed.
        if (d.returnNote) {
            return `<div class="banner sent">
                The secretary sent this registration back: ${esc(d.returnNote)}
              </div>`;
        }
        if (!d.nextStep) return "";
        return `<div class="banner ${d.nextStepNeeds ? "needs" : "fyi"}">${esc(d.nextStep)}</div>`;
    }

    registrationHtml(d) {
        const kitRow = this._editingKit
            ? `<div class="kitedit">
                 <input id="kitInput" type="number" min="0" max="999"
                        value="${esc(d.kit)}" aria-label="Kit number" />
                 <button type="button" class="btn primary" data-act="saveKit"
                         ${d.savingKit ? "disabled" : ""}>${d.savingKit ? "Saving…" : "Save"}</button>
                 <button type="button" class="btn ghost" data-act="cancelKit">Cancel</button>
               </div>`
            : `<div class="btns">
                 <button type="button" class="btn ghost" data-act="editKit">
                   ${d.kit ? "Change kit number" : "Set kit number"}
                 </button>
               </div>`;

        return `
          <div>
            <div class="label">Registration</div>
            <div class="card">
              <dl class="kv">
                <dt>Status</dt><dd><span class="pill ${TONE_CLASS[d.statusTone] || "t-neutral"}">${esc(d.statusLabel)}</span></dd>
                ${d.dob ? `<dt>Date of birth</dt><dd>${esc(d.dob)}</dd>` : ""}
                ${d.membershipNo ? `<dt>Membership</dt><dd>${esc(d.membershipNo)}</dd>` : ""}
                <dt>Plays</dt><dd>${d.trainingOnly ? "Training only" : "Training and matches"}</dd>
                <dt>Kit number</dt><dd>${d.kit ? esc(d.kit) : "Not set"}</dd>
              </dl>
              ${kitRow}
              ${d.kitMessage ? `<div class="msg ${d.kitError ? "bad" : "good"}">${esc(d.kitMessage)}</div>` : ""}
            </div>
          </div>`;
    }

    medicalHtml(d) {
        if (!d.hasMedical) {
            return `
              <div>
                <div class="label">Medical</div>
                <div class="card"><span class="med-clear">Nothing recorded for this player.</span></div>
              </div>`;
        }
        return `
          <div>
            <div class="label">Medical</div>
            <div class="card med">
              <strong>Medical information on file</strong>
              ${d.medical ? `<div class="body">${esc(d.medical)}</div>` : ""}
            </div>
          </div>`;
    }

    parentsHtml(d) {
        const parents = Array.isArray(d.parents) ? d.parents : [];
        if (parents.length === 0) {
            return `<div><div class="label">Parents</div>
                <div class="card"><span class="med-clear">No parent details on this record yet.</span></div></div>`;
        }
        return `
          <div>
            <div class="label">Parents</div>
            ${parents.map(p => `
              <div class="card">
                <div class="parent-nm">
                  ${esc(p.name) || "Unnamed"}
                  ${p.primary ? `<span class="pill t-accent" style="margin-left:5px">Primary</span>` : ""}
                </div>
                <div class="contact">
                  ${p.phone ? `<a href="tel:${esc(p.phone)}">Call ${esc(p.phone)}</a>` : ""}
                  ${p.email ? `<a href="mailto:${esc(p.email)}">Email</a>` : ""}
                </div>
              </div>`).join("")}
            <div class="btns">
              <button type="button" class="btn ghost" data-act="messageParent">Send a message</button>
            </div>
          </div>`;
    }

    paymentHtml(d) {
        // No `payment` key at all means this manager isn't permitted to see it.
        // Renders nothing rather than an empty section, so a Limited coach
        // never sees a gap where money used to be.
        if (!d.payment) return "";

        // One line, no amounts and no tier name - a manager needs to know
        // whether a family needs chasing, not what they pay. The tier would
        // leak a family's finances to a volunteer coach.
        return `
          <div>
            <div class="label">Payments</div>
            <div class="card pay ${esc(d.payment.tone || "neutral")}">
              ${esc(d.payment.label)}
            </div>
          </div>`;
    }
}

if (!customElements.get("manager-hub-player")) {
    customElements.define("manager-hub-player", ManagerHubPlayer);
}

// =====================================================================
//  PAGE CODE CONTRACT
// =====================================================================
//  IN — {loading:true} first, then getPlayerRecord()'s payload plus:
//    { savingKit: bool, kitMessage: "", kitError: bool, kitSaved: bool }
//
//  `fee` is ABSENT for a manager without the payments permission. Don't add
//  it client-side and don't render a placeholder for it.
//
//  OUT:
//    on("saveKit", e => …)          // { playerId, kitNumber }
//    on("messageParent", e => …)    // { playerId }
//
//  Set kitSaved:true on a successful save so the editor closes itself.
// =====================================================================
