// =====================================================================
//  <manager-hub-squad> — Manager Hub v2, the squad board
// =====================================================================
//  Three tabs moving a child from enquiry, to trial, to invited, and out
//  into the parent registration flow. The most-used screen in the Hub.
//
//  SETUP:
//    1. Public -> custom-elements -> new file `managerHubSquad.js`.
//    2. On stateSquad: Add -> Embed Code -> Custom Element.
//       Tag name: manager-hub-squad   Element ID: #customSquad
//    3. Height ~800px to start; it self-sizes after first paint.
//
//  ⚠️ REPUBLISH *AND* HARD-REFRESH after any change.
//
//  CLAIMED ENQUIRIES ARE GENUINELY REDACTED. When another manager holds the
//  claim, the parent's name, email, phone and the child's DOB are not in the
//  payload at all - the backend never sends them. This element could not
//  reveal them if it tried, which is the point: the whole reason claiming
//  exists is that two managers mustn't both ring the same family, and CSS
//  hiding would be theatre.
//
//  THE TAB JUMP AFTER AN ACTION IS DELIBERATE. Accept a player and the board
//  switches to Trials with a confirmation strip; invite them and it switches
//  to Squad. Carried over from the old Hub, where it was five $w calls and a
//  timeout - here it's a class change and one field on the model. A manager
//  should see where the player went, not have to go looking.
// =====================================================================

const TABS = [
    { key: "enquiries", label: "Enquiries" },
    { key: "trials",    label: "Trials" },
    { key: "squad",     label: "Squad" }
];

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
    padding: 14px 16px 32px;
    color: var(--text);
    display: flex; flex-direction: column; gap: 14px;
  }

  /* ---------- tabs ---------- */
  .tabs { display: flex; gap: 4px; padding: 3px; background: var(--neutral-bg); border-radius: 11px; }
  .tab {
    flex: 1; padding: 8px 4px; border-radius: 9px; border: none; cursor: pointer;
    font-family: inherit; font-size: 12.5px; font-weight: 700;
    color: var(--text-muted); background: transparent;
    display: flex; align-items: center; justify-content: center; gap: 5px;
  }
  .tab[aria-selected="true"] {
    background: var(--surface); color: var(--accent);
    box-shadow: 0 1px 2px rgba(16,33,47,.08);
  }
  .tab:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
  .tab .n { font-size: 11px; opacity: .7; font-weight: 600; }

  /* ---------- flash ---------- */
  .flash {
    padding: 10px 13px; border-radius: 10px; font-size: 12.5px; font-weight: 600;
    background: var(--success-bg); color: var(--success);
  }

  /* ---------- cards ---------- */
  .list { display: flex; flex-direction: column; gap: 10px; }
  .card {
    background: var(--surface); border: 1px solid var(--line-soft);
    border-radius: 12px; padding: 14px 15px;
  }
  .card.claimed { opacity: .74; }

  .head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
  .nm { font-size: 15px; font-weight: 700; line-height: 1.3; }
  .meta { font-size: 12px; color: var(--text-muted); margin-top: 3px; line-height: 1.5; }

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

  /* ---------- detail grid ---------- */
  dl.kv { display: grid; grid-template-columns: auto 1fr; gap: 4px 14px; font-size: 12.5px; margin: 10px 0 0; }
  dl.kv dt { color: var(--text-faint); }
  dl.kv dd { margin: 0; color: var(--text); overflow-wrap: anywhere; }

  /* Real links, so a tap dials or opens mail rather than selecting text. */
  dl.kv a { color: var(--info); text-decoration: none; font-weight: 600; }
  dl.kv a:hover { text-decoration: underline; }

  /* ---------- claim notice ---------- */
  .held {
    margin-top: 10px; padding: 10px 12px; border-radius: 10px;
    background: var(--violet-bg); color: var(--violet);
    font-size: 12px; font-weight: 600; line-height: 1.5;
  }

  /* ---------- buttons ---------- */
  .btns { display: flex; gap: 7px; flex-wrap: wrap; margin-top: 12px; }
  .btn {
    font-family: inherit; font-size: 12.5px; font-weight: 700;
    padding: 9px 13px; border-radius: 9px; cursor: pointer;
    border: 1.5px solid transparent; white-space: nowrap;
  }
  .btn.primary { background: var(--accent); color: #fff; }
  .btn.ghost { background: transparent; color: var(--text-muted); border-color: var(--line); }
  .btn.danger { background: transparent; color: var(--critical); border-color: var(--critical); }
  .btn[disabled] { opacity: .55; cursor: default; }
  .btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

  /* ---------- archive reason ---------- */
  .reason { margin-top: 10px; display: none; }
  .reason.show { display: block; }
  .reason label { display: block; font-size: 11.5px; font-weight: 600; color: var(--text-muted); margin-bottom: 4px; }
  .reason select {
    width: 100%; font-family: inherit; font-size: 13px; padding: 9px 11px;
    border: 1px solid var(--line); border-radius: 9px;
    background: var(--surface); color: var(--text);
  }

  .rowmsg { flex-basis: 100%; font-size: 11.5px; font-weight: 600; color: var(--critical); }

  /* ---------- squad rows ---------- */
  .srow {
    display: flex; align-items: center; justify-content: space-between; gap: 10px;
    width: 100%; text-align: left; cursor: pointer; font-family: inherit;
    background: var(--surface); border: 1px solid var(--line-soft);
    border-radius: 12px; padding: 13px 15px; color: inherit;
  }
  .srow:hover { border-color: var(--line); }
  .srow:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .srow .kit { font-size: 12px; color: var(--text-faint); margin-top: 2px; }
  /* Sits with the kit number rather than beside the status pill - it's an
     attribute of the player, not of where their registration has got to. */
  .srow .ptype { font-size: 12px; color: var(--text-faint); }
  .srow .ptype.training { color: var(--info); font-weight: 600; }

  .empty, .loading {
    padding: 36px 18px; text-align: center; font-size: 13px;
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

// "2 days ago" beats a timestamp for judging whether a claim is going stale.
function ago(iso) {
    if (!iso) return "";
    const then = new Date(iso);
    if (isNaN(then.getTime())) return "";
    const mins = Math.floor((Date.now() - then.getTime()) / 60000);
    if (mins < 60) return mins <= 1 ? "just now" : mins + " minutes ago";
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs === 1 ? "an hour ago" : hrs + " hours ago";
    const days = Math.floor(hrs / 24);
    return days === 1 ? "yesterday" : days + " days ago";
}

class ManagerHubSquad extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._built = false;
        this._data = { loading: true };
        this._resizeObserver = null;
        this._lastHeight = 0;
        // Which tab is showing, and which archive confirmations are open.
        // Local UI state on purpose: a background refresh shouldn't throw a
        // manager back to Enquiries or close a dropdown mid-choice.
        this._tab = "enquiries";
        this._confirming = {};
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
            // Page code sets `jumpTo` after an action so the manager sees where
            // the player landed. Consumed once, then cleared, so a later
            // repaint doesn't drag them back to the same tab.
            if (parsed.jumpTo && TABS.some(t => t.key === parsed.jumpTo)) {
                this._tab = parsed.jumpTo;
                delete this._data.jumpTo;
            }
            this.paint();
        } catch (err) {
            console.error("manager-hub-squad: couldn't parse data attribute", err);
        }
    }

    build() {
        if (this._built) return;
        this._built = true;

        this.shadowRoot.innerHTML = `<style>${STYLES}</style>
          <div class="wrap">
            <div class="tabs" role="tablist" id="tabs"></div>
            <div id="flash"></div>
            <div id="body"></div>
          </div>`;

        this.shadowRoot.getElementById("tabs").addEventListener("click", (event) => {
            const btn = event.target.closest("[data-tab]");
            if (!btn) return;
            this._tab = btn.getAttribute("data-tab");
            this.paint();
        });

        this.shadowRoot.getElementById("body").addEventListener("click", (event) => {
            const el = event.target.closest("[data-act]");
            if (!el || el.disabled) return;
            const act = el.getAttribute("data-act");
            const id = el.getAttribute("data-id") || "";

            // Archive is two-step: the first tap reveals the reason dropdown,
            // the second sends. A single-tap archive on a child's record is
            // too easy to hit by accident, and there's no undo.
            if (act === "archive") {
                if (!this._confirming[id]) {
                    this._confirming[id] = true;
                    this.paint();
                    return;
                }
                const sel = this.shadowRoot.getElementById("reason_" + id);
                const reason = sel ? sel.value : "";
                if (!reason) {
                    this.showRowError(id, "Pick a reason first.");
                    return;
                }
                delete this._confirming[id];
                this.dispatchEvent(new CustomEvent("archive", { detail: { playerId: id, reasonId: reason } }));
                return;
            }

            if (act === "cancelArchive") {
                delete this._confirming[id];
                this.paint();
                return;
            }

            this.dispatchEvent(new CustomEvent(act, { detail: { playerId: id } }));
        });

        this.paint();
    }

    // Written straight into the DOM rather than through the model - it's a
    // validation nudge, not state worth a round trip.
    showRowError(id, text) {
        const el = this.shadowRoot.getElementById("msg_" + id);
        if (el) el.textContent = text;
    }

    busy(id) { return !!(this._data.busy && this._data.busy[id]); }

    paint() {
        const d = this._data;
        const tabs = this.shadowRoot.getElementById("tabs");
        const flash = this.shadowRoot.getElementById("flash");
        const body = this.shadowRoot.getElementById("body");

        if (d.loading) {
            tabs.innerHTML = "";
            flash.innerHTML = "";
            body.innerHTML = `<div class="loading">Loading the squad…</div>`;
            return;
        }

        if (d.error) {
            tabs.innerHTML = "";
            flash.innerHTML = "";
            body.innerHTML = `<div class="err">${esc(d.error)}</div>`;
            return;
        }

        const counts = {
            enquiries: (d.enquiries || []).length,
            trials: (d.trials || []).length,
            squad: (d.squad || []).length
        };

        tabs.innerHTML = TABS.map(t => `
          <button type="button" class="tab" role="tab" data-tab="${t.key}"
                  aria-selected="${this._tab === t.key}">
            ${t.label}<span class="n">${counts[t.key]}</span>
          </button>`).join("");

        flash.innerHTML = d.flash ? `<div class="flash">${esc(d.flash)}</div>` : "";

        if (this._tab === "enquiries") body.innerHTML = this.enquiriesHtml(d.enquiries || []);
        else if (this._tab === "trials") body.innerHTML = this.trialsHtml(d.trials || []);
        else body.innerHTML = this.squadHtml(d.squad || []);
    }

    // ---------------- enquiries ----------------
    enquiriesHtml(rows) {
        if (rows.length === 0) {
            return `<div class="empty">
                No open enquiries for this age group.<br>
                New ones from the website appear here automatically.
              </div>`;
        }
        return `<div class="list">${rows.map(r => this.enquiryCard(r)).join("")}</div>`;
    }

    enquiryCard(r) {
        const busy = this.busy(r.id);
        const heldByOther = r.claimed && !r.claimedByMe;

        // Held by someone else: identity and position only. The contact fields
        // aren't in `r` at all - the server withheld them - so there is
        // nothing here to accidentally render.
        if (heldByOther) {
            return `
              <div class="card claimed">
                <div class="head">
                  <div>
                    <div class="nm">${esc(r.name)}</div>
                    <div class="meta">${esc([r.ageGroup, r.position].filter(Boolean).join(" · "))}</div>
                  </div>
                  <span class="pill t-violet">Claimed</span>
                </div>
                <div class="held">
                  Being looked at by ${esc(r.claimedByName)}${r.claimedDate ? " — claimed " + esc(ago(r.claimedDate)) : ""}.
                  Contact details are hidden so two squads don't ring the same family.
                </div>
              </div>`;
        }

        const details = `
          <dl class="kv">
            ${r.dob ? `<dt>DOB</dt><dd>${esc(r.dob)}</dd>` : ""}
            ${r.experience ? `<dt>Experience</dt><dd>${esc(r.experience)}</dd>` : ""}
            ${r.parentName ? `<dt>Parent</dt><dd>${esc(r.parentName)}${r.relationship ? " (" + esc(r.relationship) + ")" : ""}</dd>` : ""}
            ${r.parentPhone ? `<dt>Phone</dt><dd><a href="tel:${esc(r.parentPhone)}">${esc(r.parentPhone)}</a></dd>` : ""}
            ${r.parentEmail ? `<dt>Email</dt><dd><a href="mailto:${esc(r.parentEmail)}">${esc(r.parentEmail)}</a></dd>` : ""}
          </dl>`;

        return `
          <div class="card">
            <div class="head">
              <div>
                <div class="nm">${esc(r.name)}</div>
                <div class="meta">${esc([r.ageGroup, r.position].filter(Boolean).join(" · ")) || "&nbsp;"}</div>
              </div>
              ${r.claimedByMe ? `<span class="pill t-accent">Yours</span>` : ""}
            </div>
            ${r.claimedByMe ? details : ""}
            ${this.archiveHtml(r.id)}
            <div class="btns">
              ${r.claimedByMe
                  ? `<button type="button" class="btn primary" data-act="accept" data-id="${esc(r.id)}" ${busy ? "disabled" : ""}>
                       ${busy ? "Working…" : "Accept to trial"}
                     </button>
                     <button type="button" class="btn ghost" data-act="release" data-id="${esc(r.id)}" ${busy ? "disabled" : ""}>Release</button>`
                  : `<button type="button" class="btn primary" data-act="claim" data-id="${esc(r.id)}" ${busy ? "disabled" : ""}>
                       ${busy ? "Working…" : "Claim to see details"}
                     </button>`}
              <button type="button" class="btn danger" data-act="archive" data-id="${esc(r.id)}" ${busy ? "disabled" : ""}>
                ${this._confirming[r.id] ? "Confirm archive" : "Archive"}
              </button>
              <span class="rowmsg" id="msg_${esc(r.id)}"></span>
            </div>
          </div>`;
    }

    // ---------------- trials ----------------
    trialsHtml(rows) {
        if (rows.length === 0) {
            return `<div class="empty">
                Nobody on trial right now.<br>
                Accept an enquiry and they'll appear here.
              </div>`;
        }
        return `<div class="list">${rows.map(r => this.trialCard(r)).join("")}</div>`;
    }

    trialCard(r) {
        const busy = this.busy(r.id);
        return `
          <div class="card">
            <div class="head">
              <div>
                <div class="nm">${esc(r.name)}</div>
                <div class="meta">${esc(r.parentName)}${r.parentPhone ? " · " + esc(r.parentPhone) : ""}</div>
              </div>
              ${r.trainingOnly ? `<span class="pill t-neutral">Training only</span>` : ""}
            </div>
            ${this.archiveHtml(r.id)}
            <div class="btns">
              <button type="button" class="btn primary" data-act="invite" data-id="${esc(r.id)}" ${busy ? "disabled" : ""}>
                ${busy ? "Sending…" : "Send invite"}
              </button>
              <button type="button" class="btn ghost" data-act="returnToPool" data-id="${esc(r.id)}" ${busy ? "disabled" : ""}>Return to pool</button>
              <button type="button" class="btn danger" data-act="archive" data-id="${esc(r.id)}" ${busy ? "disabled" : ""}>
                ${this._confirming[r.id] ? "Confirm archive" : "Archive"}
              </button>
              <span class="rowmsg" id="msg_${esc(r.id)}"></span>
            </div>
          </div>`;
    }

    // ---------------- squad ----------------
    squadHtml(rows) {
        if (rows.length === 0) {
            return `<div class="empty">
                No registered players in this squad yet.<br>
                Invited players appear here once you send them a registration link.
              </div>`;
        }
        return `<div class="list">${rows.map(r => `
          <button type="button" class="srow" data-act="openPlayer" data-id="${esc(r.id)}">
            <span>
              <span class="nm">${esc(r.name)}</span>
              <span class="kit" style="display:block">
                ${r.kit ? "Kit " + esc(r.kit) : "No kit number"}
                <span class="ptype ${r.trainingOnly ? "training" : ""}">
                  · ${r.trainingOnly ? "Training only" : "Playing"}
                </span>
              </span>
            </span>
            <span class="pill ${TONE_CLASS[r.statusTone] || "t-neutral"}">${esc(r.statusLabel)}</span>
          </button>`).join("")}</div>`;
    }

    // Shared by enquiries and trials - same two-step confirm either side.
    archiveHtml(id) {
        if (!this._confirming[id]) return "";
        const opts = (this._data.leaveReasons || [])
            .map(o => `<option value="${esc(o.value)}">${esc(o.label)}</option>`).join("");
        return `
          <div class="reason show">
            <label for="reason_${esc(id)}">Why are they leaving?</label>
            <select id="reason_${esc(id)}">
              <option value="">Choose a reason…</option>
              ${opts}
            </select>
            <div class="btns">
              <button type="button" class="btn ghost" data-act="cancelArchive" data-id="${esc(id)}">Cancel</button>
            </div>
          </div>`;
    }
}

if (!customElements.get("manager-hub-squad")) {
    customElements.define("manager-hub-squad", ManagerHubSquad);
}

// =====================================================================
//  PAGE CODE CONTRACT
// =====================================================================
//  IN — {loading:true} first, then getSquadBoard()'s payload plus extras:
//    {
//      teamName, enquiries: [], trials: [], squad: [],
//      leaveReasons: [{ value, label }],   // getDictionary("leave_reason")
//      busy: { [playerId]: true },         // disables that card's buttons
//      flash: "Alfie moved to Trials ✓",   // confirmation strip
//      jumpTo: "trials"                    // switch tab once, then cleared
//    }
//
//  A claimed-by-someone-else enquiry arrives WITHOUT parent contact fields.
//  That is the server's doing and must stay that way - see the header.
//
//  OUT (all carry { playerId }):
//    claim · release · accept · invite · returnToPool · openPlayer
//    archive — also carries { reasonId }
//
//  Tab position and the archive confirm are held inside the element, so a
//  background refresh can't reset the tab or close a half-made choice.
// =====================================================================
