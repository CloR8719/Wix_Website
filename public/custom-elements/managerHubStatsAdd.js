// =====================================================================
//  <manager-hub-stats-add> — Manager Hub v2, add stats
// =====================================================================
//  Three tabs: a match result, player of the match, and the bulk sheet for
//  entering a whole squad's numbers after a game.
//
//  SETUP:
//    1. Public -> custom-elements -> new file `managerHubStatsAdd.js`.
//    2. On stateStatsAdd: Add -> Embed Code -> Custom Element.
//       Tag name: manager-hub-stats-add   Element ID: #customStatsAdd
//    3. Height ~900px to start; it self-sizes after first paint.
//
//  ⚠️ REPUBLISH *AND* HARD-REFRESH after any change.
//
//  THE BULK SHEET IS THE POINT OF THIS SCREEN. A manager fills it in on a
//  touchline with cold hands, so: rows add one at a time, every field is a
//  number input that opens the numeric keypad, and nothing is required
//  except a name. Blank rows are dropped server-side rather than rejected.
//
//  ROWS SAVE INDIVIDUALLY, not as a transaction. One bad row must not lose
//  the other fourteen - the backend reports which failed and the element
//  keeps them on screen so they can be retried without retyping.
//
//  ⚠️ TeamStats HAS NO OPPONENT OR DATE COLUMN. Don't add fields for them
//  here expecting them to save; Wix would silently create real new columns.
//  Ordering is by _createdDate.
// =====================================================================

const TABS = [
    { key: "result", label: "Match result" },
    { key: "potm",   label: "Player of the match" },
    { key: "bulk",   label: "Squad stats" }
];

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
    padding: 14px 16px 32px;
    color: var(--text);
    display: flex; flex-direction: column; gap: 15px;
  }

  /* ⚠️ THE GAP HAS TO BE HERE, NOT ON .wrap. Every section is rendered into
     #body, so #body is .wrap's only child - a gap on .wrap has nothing to
     separate. Without this the sections stack with zero space and each
     heading sits directly on the card above it. Same bug as Parent Hub's
     .wrap/#detail gap. */
  #body { display: flex; flex-direction: column; gap: 18px; }

  .pickers { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  select, input {
    width: 100%; font-family: inherit; font-size: 13.5px;
    padding: 10px 11px; border: 1px solid var(--line); border-radius: 10px;
    background: var(--surface); color: var(--text);
  }
  select:focus, input:focus, textarea:focus {
    outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft);
  }
  textarea {
    width: 100%; font-family: inherit; font-size: 13.5px; line-height: 1.6;
    padding: 10px 11px; border: 1px solid var(--line); border-radius: 10px;
    background: var(--surface); color: var(--text); resize: vertical; min-height: 72px;
  }

  .tabs { display: flex; gap: 4px; padding: 3px; background: var(--neutral-bg); border-radius: 11px; }
  .tab {
    flex: 1; padding: 9px 4px; border-radius: 9px; border: none; cursor: pointer;
    font-family: inherit; font-size: 12px; font-weight: 700;
    color: var(--text-muted); background: transparent;
  }
  .tab[aria-selected="true"] {
    background: var(--surface); color: var(--accent);
    box-shadow: 0 1px 2px rgba(16,33,47,.08);
  }
  .tab:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }

  .label {
    font-size: 10.5px; font-weight: 700; letter-spacing: .07em;
    text-transform: uppercase; color: var(--text-faint); margin-bottom: 14px;
  }
  .field { margin-bottom: 12px; }
  .field:last-child { margin-bottom: 0; }
  .field label { display: block; font-size: 11.5px; font-weight: 600; color: var(--text-muted); margin-bottom: 5px; }
  .two { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

  .card {
    background: var(--surface); border: 1px solid var(--line-soft);
    border-radius: 12px; padding: 15px;
  }

  .seg { display: flex; gap: 6px; }
  .seg button {
    flex: 1; padding: 12px 4px; border-radius: 10px; cursor: pointer;
    font-family: inherit; font-size: 13px; font-weight: 700;
    border: 1.5px solid var(--line); background: transparent; color: var(--text-muted);
  }
  .seg button[aria-pressed="true"] { border-color: var(--accent); background: var(--accent-soft); color: var(--accent); }
  .seg button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

  .chips { display: flex; flex-wrap: wrap; gap: 7px; }
  .chip {
    font-family: inherit; font-size: 12.5px; font-weight: 600; cursor: pointer;
    padding: 9px 13px; border-radius: 999px;
    border: 1.5px solid var(--line); background: transparent; color: var(--text-muted);
  }
  .chip[aria-pressed="true"] { border-color: var(--accent); background: var(--accent-soft); color: var(--accent); }
  .chip:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .chip.whole { width: 100%; }

  /* A child with no photo consent is marked on the chip ITSELF, before anyone
     picks them - not in a message afterwards that can be scrolled past. */
  .chip.noconsent { border-style: dashed; }
  .chip .flag {
    font-size: 10px; font-weight: 700; text-transform: uppercase;
    letter-spacing: .04em; color: var(--critical); margin-left: 4px;
  }

  .consent {
    padding: 12px 14px; border-radius: 10px; margin-top: 4px;
    background: var(--critical-bg); color: var(--critical);
    font-size: 12px; line-height: 1.6;
  }
  .consent b { font-weight: 700; }

  /* The override. Styled like every other checkbox in the Hub rather than
     being made scary - it's a legitimate action, it just has to be a
     deliberate one that leaves a trace. */
  .check {
    display: flex; align-items: flex-start; gap: 10px; margin-top: 9px;
    padding: 12px 13px; border: 1.5px solid var(--line); border-radius: 11px;
    cursor: pointer; background: var(--surface); width: 100%; text-align: left;
    font-family: inherit; color: inherit;
  }
  .check[aria-pressed="true"] { border-color: var(--accent); background: var(--accent-soft); }
  .check .box {
    width: 17px; height: 17px; border-radius: 5px; flex-shrink: 0; margin-top: 1px;
    border: 2px solid var(--line);
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 700; color: transparent;
  }
  .check[aria-pressed="true"] .box { border-color: var(--accent); background: var(--accent); color: #fff; }
  .check b { display: block; font-size: 13.5px; font-weight: 700; }
  .check span { font-size: 11.5px; color: var(--text-muted); line-height: 1.5; }
  .check:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

  .photopick { display: flex; gap: 12px; align-items: center; }
  .photopick img { width: 74px; height: 74px; object-fit: cover; border-radius: 9px; background: var(--neutral-bg); }
  input[type="file"] { font-size: 12px; color: var(--text-muted); width: 100%; }
  .hint { font-size: 11.5px; color: var(--text-faint); line-height: 1.55; margin: 9px 0 0; }


  /* Bulk sheet. Grid rather than a table so it reflows on a phone instead of
     forcing a sideways scroll while someone is typing into it. */
  .brow {
    display: grid; grid-template-columns: 1fr repeat(4, 52px) 32px;
    gap: 6px; align-items: center; margin-bottom: 8px;
  }
  .bhead {
    display: grid; grid-template-columns: 1fr repeat(4, 52px) 32px;
    gap: 6px; margin-bottom: 6px;
    font-size: 10px; font-weight: 700; letter-spacing: .05em;
    text-transform: uppercase; color: var(--text-faint); text-align: center;
  }
  .bhead span:first-child { text-align: left; }
  .brow input[type="number"] { text-align: center; padding: 10px 4px; font-variant-numeric: tabular-nums; }
  .brow .del {
    border: none; background: transparent; cursor: pointer;
    color: var(--text-faint); font-size: 17px; padding: 6px;
  }
  .brow .del:hover { color: var(--critical); }
  @media (max-width: 420px) {
    .brow, .bhead { grid-template-columns: 1fr repeat(4, 44px) 28px; }
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

// Same pipeline as every other image in the Hub: read, downscale on a canvas,
// hand back base64. A custom element can't use a Wix upload button.
function downscale(file, maxDim, quality) {
    return new Promise(resolve => {
        if (!file) { resolve(null); return; }
        const reader = new FileReader();
        reader.onerror = () => resolve(null);
        reader.onload = () => {
            const img = new Image();
            img.onerror = () => resolve(null);
            img.onload = () => {
                let { width, height } = img;
                const scale = Math.min(1, maxDim / Math.max(width, height));
                width = Math.round(width * scale);
                height = Math.round(height * scale);
                const canvas = document.createElement("canvas");
                canvas.width = width; canvas.height = height;
                canvas.getContext("2d").drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL("image/jpeg", quality);
                resolve({
                    base64: dataUrl.split(",")[1] || "",
                    preview: dataUrl,
                    name: (file.name || "potm.jpg").replace(/\.[^.]+$/, "") + ".jpg"
                });
            };
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
    });
}

function esc(value) {
    return String(value == null ? "" : value)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;")
        .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

let rowSeq = 0;
function blankRow() {
    rowSeq += 1;
    return { key: "r" + rowSeq, playerName: "", playerId: "", goals: "", assists: "", tackles: "", saves: "" };
}

class ManagerHubStatsAdd extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._built = false;
        this._data = { loading: true };
        this._resizeObserver = null;
        this._lastHeight = 0;

        this._tab = "result";
        this._result = { result: "", goalsFor: "", goalsAgainst: "" };
        this._potm = { winners: [], wholeTeam: false, reason: "", override: false, overrideNote: "" };
        this._potmPhoto = null;
        this._rows = [blankRow(), blankRow(), blankRow()];
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

            // Cleared only on a clean save. A partial bulk save keeps its rows
            // so the failures can be retried without retyping the lot.
            if (parsed.savedResult) this._result = { result: "", goalsFor: "", goalsAgainst: "" };
            if (parsed.savedPotm) { this._potm = { winners: [], wholeTeam: false, reason: "", override: false, overrideNote: "" }; this._potmPhoto = null; }
            if (parsed.savedBulk) this._rows = [blankRow(), blankRow(), blankRow()];

            this.paint();
        } catch (err) {
            console.error("manager-hub-stats-add: couldn't parse data attribute", err);
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

            if (act === "tab") { this._tab = el.getAttribute("data-val"); this.paint(); return; }
            if (act === "result") { this._result.result = el.getAttribute("data-val"); this.paint(); return; }
            if (act === "winner") {
                const v = el.getAttribute("data-val");
                const i = this._potm.winners.indexOf(v);
                if (i === -1) this._potm.winners.push(v); else this._potm.winners.splice(i, 1);
                // Picking a name and "whole squad" at once is contradictory.
                if (this._potm.winners.length) this._potm.wholeTeam = false;
                this.paint();
                return;
            }
            if (act === "override") {
                this._potm.override = !this._potm.override;
                if (!this._potm.override) { this._potm.overrideNote = ""; this._potmPhoto = null; }
                this.paint();
                return;
            }
            if (act === "wholeTeam") {
                this._potm.wholeTeam = !this._potm.wholeTeam;
                // Clears the named winners - the two are alternatives - but
                // KEEPS the photo, which used to be discarded here.
                if (this._potm.wholeTeam) this._potm.winners = [];
                this.paint();
                return;
            }
            if (act === "addRow") { this._rows.push(blankRow()); this.paint(); return; }
            if (act === "delRow") {
                const key = el.getAttribute("data-key");
                this._rows = this._rows.filter(r => r.key !== key);
                if (this._rows.length === 0) this._rows = [blankRow()];
                this.paint();
                return;
            }
            if (act === "saveResult") {
                this.dispatchEvent(new CustomEvent("saveResult", { detail: Object.assign({}, this._result) }));
                return;
            }
            if (act === "savePotm") {
                const picked = this.pickedWinners();
                const detail = {
                    playerNames: this._potm.winners.slice(),
                    playerIds: picked.map(p => p.id || ""),
                    wholeTeam: !!this._potm.wholeTeam,
                    reason: this._potm.reason,
                    // Sent so the backend can refuse the photo independently.
                    // The element hides the upload without consent; this tells
                    // the server it was allowed, and the server checks anyway.
                    consentOk: this.consentOk()
                };
                detail.consentOverride = !!this._potm.override;
                detail.overrideNote = this._potm.overrideNote;
                if (this._potmPhoto && this.photoAllowed()) {
                    detail.photoBase64 = this._potmPhoto.base64;
                    detail.photoName = this._potmPhoto.name;
                }
                this.dispatchEvent(new CustomEvent("savePotm", { detail }));
                return;
            }
            if (act === "saveBulk") {
                this.dispatchEvent(new CustomEvent("saveBulk", {
                    detail: { rows: this._rows.filter(r => String(r.playerName).trim()) }
                }));
                return;
            }
            if (act === "cancel") {
                this.dispatchEvent(new CustomEvent("cancelStatsAdd", { detail: {} }));
                return;
            }
        });

        body.addEventListener("change", async (event) => {
            if (event.target.id !== "potmPhoto") return;
            const file = event.target.files && event.target.files[0];
            const result = await downscale(file, 1400, 0.85);
            if (!result) {
                this.dispatchEvent(new CustomEvent("photoError", {
                    detail: { message: "That photo couldn't be read — try a different one." }
                }));
                return;
            }
            this._potmPhoto = result;
            this.paint();
        });

        const onEdit = (event) => {
            const t = event.target;
            const f = t.getAttribute("data-field");
            if (!f) return;

            const key = t.getAttribute("data-key");
            if (key) {
                const row = this._rows.find(r => r.key === key);
                if (!row) return;
                row[f] = t.value;
                // Carry the id alongside the name so the row can populate
                // playerReference - the start of moving off name keying.
                if (f === "playerName") {
                    const opt = (this._data.players || []).find(p => p.value === t.value);
                    row.playerId = opt ? (opt.id || "") : "";
                }
                return;
            }

            if (f === "season" || f === "teamId") {
                this.dispatchEvent(new CustomEvent("statsAddFilter", {
                    detail: {
                        teamId: f === "teamId" ? t.value : (this._data.teamId || ""),
                        season: f === "season" ? t.value : (this._data.season || "")
                    }
                }));
                return;
            }

            if (this._tab === "result") this._result[f] = t.value;
            else if (this._tab === "potm") {
                this._potm[f] = t.value;
                // The override note GATES the save button. Typing updates the
                // model but a full repaint would destroy the input being typed
                // into, so the button is refreshed on its own.
                //
                // Without this the button stayed greyed out until something
                // else forced a repaint - re-picking a player - which reads as
                // the override simply not working.
                if (f === "overrideNote") this.refreshPotmSave();
            }
        };
        body.addEventListener("input", onEdit);
        body.addEventListener("change", onEdit);

        this.paint();
    }

    // The player objects behind the picked names.
    pickedWinners() {
        const players = (this._data && this._data.players) || [];
        return this._potm.winners
            .map(n => players.find(p => p.value === n))
            .filter(Boolean);
    }

    // Recomputes ONLY the save button and its hint, leaving the rest of the
    // DOM - and the focused input - alone. Mirrors the logic in potmHtml; if
    // one changes the other has to.
    refreshPotmSave() {
        const btn = this.shadowRoot.querySelector('[data-act="savePotm"]');
        if (!btn) return;

        const gaps = this.consentGaps();
        const overrideDone = this._potm.override &&
            String(this._potm.overrideNote || "").trim().length > 0;
        const blocked = !!this._potmPhoto && gaps.length > 0 && !overrideDone;

        btn.disabled = !!(this._data && this._data.saving) || blocked;

        const hint = btn.parentNode && btn.parentNode.querySelector(".hint");
        if (hint) hint.style.display = blocked ? "" : "none";
    }

    // Who a photo would actually contain. For a named award that's the
    // winners; for a whole-squad award it's everyone in the squad, which is
    // why that case needs its own answer rather than a blanket refusal.
    photoSubjects() {
        if (this._potm.wholeTeam) return (this._data && this._data.players) || [];
        return this.pickedWinners();
    }

    // ⚠️ Consent must be an explicit yes from EVERYONE in the photo, for BOTH
    // website and social - a player of the match photo goes to both. One person
    // missing either blocks it, because there's no way to publish a group shot
    // containing only some of the children in it.
    consentOk() {
        const subjects = this.photoSubjects();
        if (subjects.length === 0) return false;
        return subjects.every(p => p.photoOk === true && p.socialOk === true);
    }

    // Named, so a manager can go and ask rather than guess. A whole squad can
    // easily be a dozen names, so past three it becomes a count - a wall of
    // names reads as noise and gets skipped, which defeats the point of saying
    // it at all.
    consentGaps() {
        const missing = this.photoSubjects()
            .filter(p => p.photoOk !== true || p.socialOk !== true);

        if (missing.length > 3) {
            return [missing.length + " players in the squad"];
        }
        return missing.map(p => {
            const gaps = [];
            if (p.photoOk !== true) gaps.push("website");
            if (p.socialOk !== true) gaps.push("social media");
            return p.label + " (" + gaps.join(" and ") + ")";
        });
    }

    // Consent on file, OR a deliberate override with a reason written down.
    // The whole squad can never be photographed here regardless - see
    // consentOk() - because a squad shot contains children nobody has asked.
    photoAllowed() {
        if (this.consentOk()) return true;
        return this._potm.override && String(this._potm.overrideNote || "").trim().length > 0;
    }

    // What's missing, named, so a manager can go and ask rather than guess.
    consentGaps() {
        return this.pickedWinners()
            .filter(p => p.photoOk !== true || p.socialOk !== true)
            .map(p => {
                const missing = [];
                if (p.photoOk !== true) missing.push("website");
                if (p.socialOk !== true) missing.push("social media");
                return p.label + " (" + missing.join(" and ") + ")";
            });
    }

    paint() {
        const d = this._data;
        const body = this.shadowRoot.getElementById("body");

        if (d.loading) { body.innerHTML = `<div class="loading">Loading…</div>`; return; }
        if (d.fatal) { body.innerHTML = `<div class="err">${esc(d.fatal)}</div>`; return; }

        const teams = Array.isArray(d.teams) ? d.teams : [];
        const seasons = Array.isArray(d.seasons) ? d.seasons : [];

        body.innerHTML = `
          ${d.saved ? `<div class="ok">${esc(d.saved)}</div>` : ""}
          ${d.error ? `<div class="err">${esc(d.error)}</div>` : ""}

          <div class="pickers">
            <select data-field="teamId" aria-label="Team">
              ${teams.map(t => `
                <option value="${esc(t.id)}" ${d.teamId === t.id ? "selected" : ""}>${esc(t.name)}</option>`).join("")}
            </select>
            <select data-field="season" aria-label="Season">
              ${seasons.map(s => `
                <option value="${esc(s.value)}" ${d.season === s.value ? "selected" : ""}>${esc(s.label)}</option>`).join("")}
            </select>
          </div>

          <div class="tabs" role="tablist">
            ${TABS.map(t => `
              <button type="button" class="tab" role="tab" data-act="tab" data-val="${t.key}"
                      aria-selected="${this._tab === t.key}">${t.label}</button>`).join("")}
          </div>

          ${this._tab === "result" ? this.resultHtml(d)
            : this._tab === "potm" ? this.potmHtml(d)
            : this.bulkHtml(d)}

          <button type="button" class="btn ghost" data-act="cancel">Back to stats</button>`;
    }

    resultHtml(d) {
        const r = this._result;
        return `
          <div class="card">
            <div class="field">
              <label>How did it go?</label>
              <div class="seg">
                ${["Win", "Draw", "Lose"].map(v => `
                  <button type="button" data-act="result" data-val="${v}"
                          aria-pressed="${r.result === v}">${v}</button>`).join("")}
              </div>
            </div>
            <div class="two">
              <div class="field">
                <label for="gf">Goals scored</label>
                <input id="gf" type="number" inputmode="numeric" min="0" data-field="goalsFor" value="${esc(r.goalsFor)}" />
              </div>
              <div class="field">
                <label for="ga">Goals conceded</label>
                <input id="ga" type="number" inputmode="numeric" min="0" data-field="goalsAgainst" value="${esc(r.goalsAgainst)}" />
              </div>
            </div>
            <div class="actions" style="margin-top:13px">
              <button type="button" class="btn primary" data-act="saveResult" ${d.saving ? "disabled" : ""}>
                ${d.saving ? "Saving…" : "Save result"}
              </button>
            </div>
          </div>`;
    }

    // THE PHOTO FIELD IS ALWAYS THERE. An earlier version hid it until consent
    // was proven, which meant a manager whose squad has no consent recorded
    // never saw it at all and couldn't tell whether the feature existed.
    //
    // Consent is raised at the point it MATTERS instead: once a photo is
    // actually attached. Nothing is blocked until there's something to block.
    potmHtml(d) {
        const p = this._potm;
        const players = Array.isArray(d.players) ? d.players : [];
        const gaps = this.consentGaps();
        const hasPhoto = !!this._potmPhoto;

        // ⚠️ SHOWN AS SOON AS WINNERS ARE PICKED, not when a photo is attached.
        //
        // An earlier version deferred it to the moment a photo went on, on the
        // reasoning that nothing should be raised until there's something to
        // raise. In practice a manager picks the winners, sees nothing, and
        // concludes the consent check isn't working - the absence of a warning
        // is indistinguishable from a broken feature.
        //
        // Knowing up front is also just more useful: it's a prompt to go and
        // ask the parent, not only a barrier to a file upload.
        const someone = this.photoSubjects().length > 0;
        const needsOverride = someone && gaps.length > 0;
        const overrideDone = p.override && String(p.overrideNote || "").trim().length > 0;
        // The warning shows early; the BLOCK only bites when a photo is
        // actually attached. Picking a player with no consent on file is not
        // itself a problem - publishing their photo is.
        const blocked = hasPhoto && gaps.length > 0 && !overrideDone;

        return `
          <div class="card">
            <div class="field">
              <label>Who won it?</label>
              <div class="chips">
                ${players.map(o => {
                    const noConsent = o.photoOk !== true || o.socialOk !== true;
                    return `
                      <button type="button" class="chip ${noConsent ? "noconsent" : ""}"
                              data-act="winner" data-val="${esc(o.value)}"
                              aria-pressed="${p.winners.indexOf(o.value) !== -1}">
                        ${esc(o.label)}${noConsent ? ` <span class="flag" title="No photo consent on file">no photos</span>` : ""}
                      </button>`;
                }).join("")}
              </div>
              <button type="button" class="chip whole" data-act="wholeTeam"
                      aria-pressed="${!!p.wholeTeam}" style="margin-top:9px">
                The whole squad
              </button>
              ${p.winners.length > 1
                  ? `<p class="hint">${p.winners.length} winners — each gets their own award on the leaderboard.</p>`
                  : ""}
            </div>

            <div class="field">
              <label for="pWhy">Why <span style="font-weight:400;color:var(--text-faint)">(optional)</span></label>
              <textarea id="pWhy" data-field="reason" rows="3"
                        placeholder="Ran the midfield all game">${esc(p.reason)}</textarea>
            </div>

            <div class="field">
              <label>Photo <span style="font-weight:400;color:var(--text-faint)">(optional)</span></label>
              <div class="photopick">
                ${this._potmPhoto ? `<img src="${esc(this._potmPhoto.preview)}" alt="" />` : ""}
                <input type="file" id="potmPhoto" accept="image/*" />
              </div>
            </div>

            ${needsOverride ? `
              <div class="consent">
                <b>Consent isn't on file for ${esc(gaps.join(", "))}.</b>
                ${p.wholeTeam
                    ? "A squad photo shows all of them."
                    : "The award saves either way — this only matters if you add a photo."}
              </div>
              <button type="button" class="check" data-act="override"
                      aria-pressed="${!!p.override}">
                <span class="box">✓</span>
                <span><b>Publish the photo anyway</b>
                  <span>Only if you've checked with the parent, or the child can't be
                  identified. Your name and reason are recorded against the award.</span></span>
              </button>
              ${p.override ? `
                <div class="field" style="margin-top:10px">
                  <label for="ovNote">Why is it OK to publish?</label>
                  <input id="ovNote" type="text" data-field="overrideNote"
                         value="${esc(p.overrideNote)}"
                         placeholder="Face blurred / spoke to mum at training" />
                </div>` : ""}` : ""}

            <div class="actions" style="margin-top:13px">
              <button type="button" class="btn primary" data-act="savePotm"
                      ${d.saving || blocked ? "disabled" : ""}>
                ${d.saving ? "Saving…" : (p.winners.length > 1 ? "Save awards" : "Save award")}
              </button>
              <p class="hint" style="display:${blocked ? "" : "none"}">
                Tick the box and give a reason, or remove the photo, to save.
              </p>
            </div>
          </div>`;
    }

    bulkHtml(d) {
        const players = Array.isArray(d.players) ? d.players : [];
        return `
          <div class="card">
            <div class="bhead">
              <span>Player</span><span>G</span><span>A</span><span>T</span><span>S</span><span></span>
            </div>
            ${this._rows.map(row => `
              <div class="brow">
                <select data-field="playerName" data-key="${esc(row.key)}">
                  <option value="">Player…</option>
                  ${players.map(o => `
                    <option value="${esc(o.value)}" ${row.playerName === o.value ? "selected" : ""}>${esc(o.label)}</option>`).join("")}
                </select>
                <input type="number" inputmode="numeric" min="0" data-field="goals"   data-key="${esc(row.key)}" value="${esc(row.goals)}" aria-label="Goals" />
                <input type="number" inputmode="numeric" min="0" data-field="assists" data-key="${esc(row.key)}" value="${esc(row.assists)}" aria-label="Assists" />
                <input type="number" inputmode="numeric" min="0" data-field="tackles" data-key="${esc(row.key)}" value="${esc(row.tackles)}" aria-label="Tackles" />
                <input type="number" inputmode="numeric" min="0" data-field="saves"   data-key="${esc(row.key)}" value="${esc(row.saves)}" aria-label="Saves" />
                <button type="button" class="del" data-act="delRow" data-key="${esc(row.key)}" aria-label="Remove row">×</button>
              </div>`).join("")}

            <div class="actions" style="margin-top:11px">
              <button type="button" class="btn ghost" data-act="addRow">＋ Add another player</button>
              <button type="button" class="btn primary" data-act="saveBulk" ${d.saving ? "disabled" : ""}>
                ${d.saving ? "Saving…" : "Save squad stats"}
              </button>
            </div>
          </div>`;
    }
}

if (!customElements.get("manager-hub-stats-add")) {
    customElements.define("manager-hub-stats-add", ManagerHubStatsAdd);
}

// =====================================================================
//  PAGE CODE CONTRACT
// =====================================================================
//  IN — {loading:true} first, then getStatsOptions()'s payload plus:
//    {
//      teams, seasons, players: [{ value, label, id }],
//      teamId, season,
//      saving: bool, error: "", saved: "Saved ✓",
//      savedResult: bool, savedPotm: bool, savedBulk: bool,   // clear a form
//      fatal: ""
//    }
//
//  OUT:
//    on("statsAddFilter", e => …)  // { teamId, season } - reload players
//    on("saveResult", e => …)      // { result, goalsFor, goalsAgainst }
//    on("savePotm",   e => …)      // { playerName, reason }
//    on("saveBulk",   e => …)      // { rows: [{ playerName, playerId, goals,
//                                  //            assists, tackles, saves }] }
//    on("cancelStatsAdd", () => …)
//
//  On a PARTIAL bulk save don't set savedBulk - leaving the rows on screen
//  is what lets a manager retry the failures without retyping.
// =====================================================================
