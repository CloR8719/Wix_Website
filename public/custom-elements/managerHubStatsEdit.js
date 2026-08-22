// =====================================================================
//  <manager-hub-stats-edit> — Manager Hub v2, edit stats records
// =====================================================================
//  Fixing a typo in a stat, or removing a record that shouldn't be there.
//
//  SETUP:
//    1. Public -> custom-elements -> new file `managerHubStatsEdit.js`.
//    2. On stateStatsEdit: Add -> Embed Code -> Custom Element.
//       Tag name: manager-hub-stats-edit   Element ID: #customStatsEdit
//    3. Height ~850px to start; it self-sizes after first paint.
//
//  ⚠️ REPUBLISH *AND* HARD-REFRESH after any change.
//
//  ONE ROW EXPANDS AT A TIME. The old screen used a Wix Table plus a
//  separate edit panel below, which meant scrolling away from the row you
//  picked to change it. Editing in place keeps the row and its fields
//  together, and closes any other open row so there's never a question about
//  which one the Save button belongs to.
//
//  DELETE IS TWO-STEP and never bundled with save. These are the only
//  records in the Hub with no audit trail behind them, so an accidental tap
//  is unrecoverable.
// =====================================================================

const TABS = [
    { key: "stats",  label: "Player stats" },
    { key: "result", label: "Results" },
    { key: "potm",   label: "POTM" }
];

const RESULTS = ["Win", "Draw", "Lose"];

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
  select, input, textarea {
    width: 100%; font-family: inherit; font-size: 13.5px;
    padding: 10px 11px; border: 1px solid var(--line); border-radius: 10px;
    background: var(--surface); color: var(--text);
  }
  textarea { resize: vertical; min-height: 66px; line-height: 1.6; }
  select:focus, input:focus, textarea:focus {
    outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft);
  }

  .tabs { display: flex; gap: 4px; padding: 3px; background: var(--neutral-bg); border-radius: 11px; }
  .tab {
    flex: 1; padding: 9px 4px; border-radius: 9px; border: none; cursor: pointer;
    font-family: inherit; font-size: 12.5px; font-weight: 700;
    color: var(--text-muted); background: transparent;
  }
  .tab[aria-selected="true"] {
    background: var(--surface); color: var(--accent);
    box-shadow: 0 1px 2px rgba(16,33,47,.08);
  }
  .tab:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }

  .list { display: flex; flex-direction: column; gap: 9px; }
  .row {
    background: var(--surface); border: 1px solid var(--line-soft);
    border-radius: 12px; padding: 13px 14px;
  }
  .row.open { border-color: var(--accent); }

  .summary {
    display: flex; align-items: center; justify-content: space-between; gap: 10px;
    width: 100%; text-align: left; cursor: pointer;
    background: transparent; border: none; font-family: inherit; color: inherit; padding: 0;
  }
  .summary:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
  .nm { font-size: 14px; font-weight: 700; }
  .sub { font-size: 11.5px; color: var(--text-faint); margin-top: 2px; }
  .nums { font-size: 12.5px; color: var(--text-muted); font-variant-numeric: tabular-nums; white-space: nowrap; }

  /* Grouped by entry session - see groupedHtml for why it isn't by match. */
  .group + .group { margin-top: 18px; }
  .glabel {
    display: flex; align-items: baseline; justify-content: space-between; gap: 10px;
    font-size: 10.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase;
    color: var(--text-faint); margin-bottom: 9px;
  }
  .gcount { font-weight: 600; letter-spacing: 0; text-transform: none; }

  /* A result reads faster with the outcome coloured than with it spelled out
     twice. */
  .nm.res-win  { color: var(--success); }
  .nm.res-lose { color: var(--critical); }
  .nm.res-draw { color: var(--warning); }

  .seg { display: flex; gap: 6px; }
  .seg button {
    flex: 1; padding: 10px 4px; border-radius: 9px; cursor: pointer;
    font-family: inherit; font-size: 12.5px; font-weight: 700;
    border: 1.5px solid var(--line); background: transparent; color: var(--text-muted);
  }
  .seg button[aria-pressed="true"] { border-color: var(--accent); background: var(--accent-soft); color: var(--accent); }
  .seg button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

  .editor { display: none; margin-top: 13px; padding-top: 13px; border-top: 1px solid var(--line-soft); }
  .row.open .editor { display: block; }

  .field { margin-bottom: 10px; }
  .field label { display: block; font-size: 11.5px; font-weight: 600; color: var(--text-muted); margin-bottom: 5px; }
  .four { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  .four input { text-align: center; font-variant-numeric: tabular-nums; }
  .four label { text-align: center; }

  .btn {
    font-family: inherit; font-size: 12.5px; font-weight: 700;
    padding: 10px 14px; border-radius: 9px; cursor: pointer;
    border: 1.5px solid transparent;
  }
  .btn.primary { background: var(--accent); color: #fff; }
  .btn.ghost { background: transparent; color: var(--text-muted); border-color: var(--line); }
  .btn.danger { background: transparent; color: var(--critical); border-color: var(--critical); }
  .btn[disabled] { opacity: .55; cursor: default; }
  .btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .btns { display: flex; gap: 7px; flex-wrap: wrap; margin-top: 11px; }
  .btn.wide { width: 100%; }

  .empty, .loading {
    padding: 34px 18px; text-align: center; font-size: 13px;
    color: var(--text-muted); line-height: 1.6;
    border: 1px dashed var(--line); border-radius: 12px;
  }
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
`;

function esc(value) {
    return String(value == null ? "" : value)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;")
        .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Only worth showing when a record has actually been changed since it was
// entered. Wix sets _updatedDate on insert too, so an untouched row has the
// two within a second of each other - comparing them exactly would mark
// everything as edited.
function wasEdited(created, updated) {
    if (!created || !updated) return false;
    const a = new Date(created).getTime();
    const b = new Date(updated).getTime();
    if (isNaN(a) || isNaN(b)) return false;
    return (b - a) > 5000;
}

function shortDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

class ManagerHubStatsEdit extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._built = false;
        this._data = { loading: true };
        this._resizeObserver = null;
        this._lastHeight = 0;

        this._tab = "stats";
        this._openId = "";       // only ever one
        this._edit = null;       // working copy of the open row
        this._confirmDelete = "";
        // Client-side: the records are already loaded (capped at 400), so
        // filtering here is instant and costs no round trip.
        this._filter = "";
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
            // A completed save or delete closes the editor - leaving it open
            // over a record that's just changed invites a second, stale save.
            if (parsed.done) { this._openId = ""; this._edit = null; this._confirmDelete = ""; }
            this.paint();
        } catch (err) {
            console.error("manager-hub-stats-edit: couldn't parse data attribute", err);
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
            const id = el.getAttribute("data-id") || "";

            if (act === "setResult") {
                if (this._edit) { this._edit.result = el.getAttribute("data-val"); this.paint(); }
                return;
            }
            if (act === "tab") {
                this._tab = el.getAttribute("data-val");
                this._openId = ""; this._edit = null; this._confirmDelete = "";
                // Cleared on a tab change. Results have no player name, so a
                // filter carried over from Player stats would empty that list
                // with no visible box to clear it.
                this._filter = "";
                this.dispatchEvent(new CustomEvent("statsEditFilter", {
                    detail: { teamId: this._data.teamId || "", season: this._data.season || "", kind: this._tab }
                }));
                this.paint();
                return;
            }

            if (act === "open") {
                if (this._openId === id) { this._openId = ""; this._edit = null; }
                else {
                    const rows = this._data.records || [];
                    const row = rows.find(r => r.id === id);
                    // A working copy, so cancelling genuinely discards.
                    this._openId = id;
                    this._edit = row ? Object.assign({}, row) : null;
                }
                this._confirmDelete = "";
                this.paint();
                return;
            }

            if (act === "cancelEdit") {
                this._openId = ""; this._edit = null; this._confirmDelete = "";
                this.paint();
                return;
            }

            if (act === "save") {
                this.dispatchEvent(new CustomEvent("saveRecord", {
                    detail: { kind: this._tab, recordId: id, form: Object.assign({}, this._edit) }
                }));
                return;
            }

            if (act === "delete") {
                if (this._confirmDelete !== id) { this._confirmDelete = id; this.paint(); return; }
                this.dispatchEvent(new CustomEvent("deleteRecord", { detail: { kind: this._tab, recordId: id } }));
                return;
            }
            if (act === "cancelDelete") { this._confirmDelete = ""; this.paint(); return; }

            if (act === "back") {
                this.dispatchEvent(new CustomEvent("cancelStatsEdit", { detail: {} }));
                return;
            }
        });

        const onEdit = (event) => {
            const t = event.target;
            const f = t.getAttribute("data-field");
            if (!f) return;
            if (f === "filter") {
                this._filter = t.value;
                // Repaints the list only - rebuilding the whole panel would
                // pull focus out of the search box on every keystroke.
                const host = this.shadowRoot.getElementById("list");
                if (host) host.innerHTML = this.groupedHtml(this.filtered(this._data.records || []));
                return;
            }
            if (f === "teamId" || f === "season") {
                this.dispatchEvent(new CustomEvent("statsEditFilter", {
                    detail: {
                        teamId: f === "teamId" ? t.value : (this._data.teamId || ""),
                        season: f === "season" ? t.value : (this._data.season || ""),
                        kind: this._tab
                    }
                }));
                return;
            }
            if (this._edit) this._edit[f] = t.value;

            // Corrected to a real squad member, so the row's reference can be
            // repointed too - otherwise the name says one player and the link
            // still says another.
            if (f === "playerName" && this._edit) {
                const hit = ((this._data && this._data.players) || [])
                    .find(p => p.value === t.value);
                this._edit.playerId = hit ? hit.id : "";
            }
        };
        body.addEventListener("input", onEdit);
        body.addEventListener("change", onEdit);

        this.paint();
    }

    paint() {
        const d = this._data;
        const body = this.shadowRoot.getElementById("body");

        if (d.loading) { body.innerHTML = `<div class="loading">Loading records…</div>`; return; }
        if (d.fatal) { body.innerHTML = `<div class="err">${esc(d.fatal)}</div>`; return; }

        const teams = Array.isArray(d.teams) ? d.teams : [];
        const seasons = Array.isArray(d.seasons) ? d.seasons : [];
        const records = Array.isArray(d.records) ? d.records : [];

        body.innerHTML = `
          ${d.done ? `<div class="ok">${esc(d.done)}</div>` : ""}
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

          ${records.length && this._tab !== "result"
              ? `<div class="field" style="margin-bottom:13px">
                   <input id="statsFilter" type="search" data-field="filter"
                          value="${esc(this._filter)}" placeholder="Find a player…" />
                 </div>`
              : ""}

          ${records.length === 0
              ? `<div class="empty">
                   Nothing recorded for this season yet.<br>
                   Anything you add shows here for editing.
                 </div>`
              : `<div id="list">${this.groupedHtml(this.filtered(records))}</div>`}

          <button type="button" class="btn ghost wide" data-act="back">Back to stats</button>`;
    }

    // ⚠️ GROUPED BY WHEN THEY WERE SAVED, not by match - because the data has
    // no idea which match a row belongs to. PlayerStats has no match reference
    // and no match date, so a player with five appearances is five identical
    // rows.
    //
    // A bulk sheet saved in one go lands within the same minute, so grouping on
    // that recovers "one entry session" well enough to edit by. The heading
    // says when it was entered rather than pretending to be a fixture date.
    // ⚠️ A DROPDOWN, NOT FREE TEXT. PlayerStats keys on PS_playerName, so
    // "Jack Whitfeild" becomes a second player on the leaderboard with no way
    // to tell it apart from a real one.
    //
    // But the current value ALWAYS stays selectable even when it isn't in the
    // squad any more - a player who left mid-season still has last October's
    // stats, and a dropdown that silently dropped their name would rewrite
    // history the first time anyone opened the row to fix a typo elsewhere.
    playerPicker(r, e) {
        const squad = (this._data && this._data.players) || [];
        const current = String(e.playerName || "");
        const inSquad = squad.some(p => p.value === current);

        const options = squad.map(p =>
            '<option value="' + esc(p.value) + '"' +
            (p.value === current ? ' selected' : '') + '>' + esc(p.label) + '</option>');

        if (current && !inSquad) {
            options.unshift(
                '<option value="' + esc(current) + '" selected>' +
                esc(current) + ' (no longer in the squad)</option>');
        }
        if (!current) {
            options.unshift('<option value="">Choose a player…</option>');
        }

        return '<select id="nm_' + esc(r.id) + '" data-field="playerName">' +
               options.join("") + '</select>';
    }

    // Substring, case-insensitive, on the name only. Deliberately not a fuzzy
    // match: a manager typing "jack" wants the Jacks, and a clever matcher that
    // also returns "Jackson" and "Zack" makes a list of 300 rows worse.
    filtered(records) {
        const q = String(this._filter || "").trim().toLowerCase();
        if (!q) return records;
        return records.filter(r => String(r.playerName || "").toLowerCase().indexOf(q) !== -1);
    }

    groupedHtml(records) {
        const groups = [];
        records.forEach(r => {
            const key = r.batch || "unknown";
            let g = groups.find(x => x.key === key);
            if (!g) { g = { key, label: r.batchLabel || "Undated", items: [] }; groups.push(g); }
            g.items.push(r);
        });

        return groups.length === 0
            ? `<div class="empty">Nothing matching "${esc(this._filter)}".</div>`
            : groups.map(g => `
          <div class="group">
            <div class="glabel">
              Entered ${esc(g.label)}
              ${g.items.length > 1 ? `<span class="gcount">${g.items.length} records</span>` : ""}
            </div>
            <div class="list">${g.items.map(r => this.rowHtml(r)).join("")}</div>
          </div>`).join("");
    }

    rowHtml(r) {
        const open = this._openId === r.id;
        const kind = this._tab;
        const e = open && this._edit ? this._edit : r;

        const title = kind === "result"
            ? (esc(r.result) || "Result")
            : (esc(r.playerName) || "Unnamed");

        const summaryNums = kind === "result"
            ? `${Number(r.goalsFor) || 0}–${Number(r.goalsAgainst) || 0}`
            : kind === "potm"
                ? ""
                : `${Number(r.goals) || 0}G · ${Number(r.assists) || 0}A · ${Number(r.tackles) || 0}T · ${Number(r.saves) || 0}S`;

        return `
          <div class="row ${open ? "open" : ""}">
            <button type="button" class="summary" data-act="open" data-id="${esc(r.id)}"
                    aria-expanded="${open}">
              <span>
                <span class="nm ${kind === "result" ? "res-" + String(r.result || "").toLowerCase() : ""}">${title}</span>
                <span class="sub" style="display:block">${esc(shortDate(r.date))}${
                    wasEdited(r.date, r.updated) ? ` · edited ${esc(shortDate(r.updated))}` : ""
                }</span>
              </span>
              <span class="nums">${esc(summaryNums)}</span>
            </button>

            <div class="editor">
              ${kind === "result" ? `
                <div class="field">
                  <label>Result</label>
                  <div class="seg">
                    ${RESULTS.map(v => `
                      <button type="button" data-act="setResult" data-val="${v}"
                              aria-pressed="${(e.result || "") === v}">${v}</button>`).join("")}
                  </div>
                </div>
                <div class="four" style="grid-template-columns:1fr 1fr">
                  <div class="field"><label>Scored</label>
                    <input type="number" inputmode="numeric" min="0" data-field="goalsFor" value="${esc(e.goalsFor)}" /></div>
                  <div class="field"><label>Conceded</label>
                    <input type="number" inputmode="numeric" min="0" data-field="goalsAgainst" value="${esc(e.goalsAgainst)}" /></div>
                </div>` : `
                <div class="field">
                  <label for="nm_${esc(r.id)}">Player</label>
                  ${this.playerPicker(r, e)}
                </div>`}

              ${kind === "potm" ? `
                <div class="field">
                  <label for="rsn_${esc(r.id)}">Why they won it</label>
                  <textarea id="rsn_${esc(r.id)}" data-field="reason" rows="3">${esc(e.reason || "")}</textarea>
                </div>` : kind === "result" ? "" : `
                <div class="four">
                  <div class="field"><label>Goals</label>
                    <input type="number" inputmode="numeric" min="0" data-field="goals" value="${esc(e.goals)}" /></div>
                  <div class="field"><label>Assists</label>
                    <input type="number" inputmode="numeric" min="0" data-field="assists" value="${esc(e.assists)}" /></div>
                  <div class="field"><label>Tackles</label>
                    <input type="number" inputmode="numeric" min="0" data-field="tackles" value="${esc(e.tackles)}" /></div>
                  <div class="field"><label>Saves</label>
                    <input type="number" inputmode="numeric" min="0" data-field="saves" value="${esc(e.saves)}" /></div>
                </div>`}

              <div class="btns">
                <button type="button" class="btn primary" data-act="save" data-id="${esc(r.id)}"
                        ${this._data.saving ? "disabled" : ""}>
                  ${this._data.saving ? "Saving…" : "Save changes"}
                </button>
                <button type="button" class="btn ghost" data-act="cancelEdit">Cancel</button>
                <button type="button" class="btn danger" data-act="delete" data-id="${esc(r.id)}">
                  ${this._confirmDelete === r.id ? "Yes, delete it" : "Delete"}
                </button>
                ${this._confirmDelete === r.id
                    ? `<button type="button" class="btn ghost" data-act="cancelDelete">Keep it</button>`
                    : ""}
              </div>
            </div>
          </div>`;
    }
}

if (!customElements.get("manager-hub-stats-edit")) {
    customElements.define("manager-hub-stats-edit", ManagerHubStatsEdit);
}

// =====================================================================
//  PAGE CODE CONTRACT
// =====================================================================
//  IN — {loading:true} first, then getStatsRecords()'s payload plus:
//    {
//      teams, seasons, teamId, season,
//      records: [{ id, playerName, goals, assists, tackles, saves, date }]
//               // or for potm: [{ id, playerName, reason, date }]
//      saving: bool, error: "", done: "Saved ✓", fatal: ""
//    }
//
//  OUT:
//    on("statsEditFilter", e => …)  // { teamId, season, kind } - refetch
//    on("saveRecord",   e => …)     // { kind, recordId, form }
//    on("deleteRecord", e => …)     // { kind, recordId } - already confirmed
//    on("cancelStatsEdit", () => …)
//
//  Set `done` after a save or delete so the open editor closes itself.
// =====================================================================
