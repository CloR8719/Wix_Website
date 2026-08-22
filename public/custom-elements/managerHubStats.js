// =====================================================================
//  <manager-hub-stats> — Manager Hub v2, stats overview
// =====================================================================
//  Season scorecard, recent form, leaderboards and player of the match.
//
//  SETUP:
//    1. Public -> custom-elements -> new file `managerHubStats.js`.
//    2. On stateStats: Add -> Embed Code -> Custom Element.
//       Tag name: manager-hub-stats   Element ID: #customStats
//    3. Height ~900px to start; it self-sizes after first paint.
//
//  ⚠️ REPUBLISH *AND* HARD-REFRESH after any change.
//
//  ALL FOUR SECTIONS COME FROM ONE BACKEND CALL. The old version ran four
//  repeaters and registered onItemReady INSIDE the refresh function, so
//  handlers stacked with every team or season change - a real bug that got
//  slower the longer someone stayed on the page. Aggregating server-side
//  removes both the repeaters and that whole class of problem.
//
//  ⚠️ LEADERBOARDS ARE KEYED BY PLAYER NAME, not id, because that's what the
//  stats collections store. Two spellings of the same child are two rows.
//  The backend groups case-insensitively to take the easy half off, but the
//  real fix is the playerReference column, which new rows now populate.
// =====================================================================

const RESULT_COLOR = {
    Win: "var(--success)", Lose: "var(--critical)", Draw: "var(--warning)"
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
    --neutral:#5A6472; --neutral-bg:#E8EAED;
    padding: 14px 16px 32px;
    color: var(--text);
    display: flex; flex-direction: column; gap: 16px;
  }

  /* ⚠️ THE GAP HAS TO BE HERE, NOT ON .wrap. Every section is rendered into
     #body, so #body is .wrap's only child - a gap on .wrap has nothing to
     separate. Without this the sections stack with zero space and each
     heading sits directly on the card above it. Same bug as Parent Hub's
     .wrap/#detail gap. */
  #body { display: flex; flex-direction: column; gap: 18px; }

  .pickers { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .pickers select {
    width: 100%; font-family: inherit; font-size: 13.5px;
    padding: 10px 11px; border: 1px solid var(--line); border-radius: 10px;
    background: var(--surface); color: var(--text);
  }
  .pickers select:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }

  .label {
    font-size: 10.5px; font-weight: 700; letter-spacing: .07em;
    text-transform: uppercase; color: var(--text-faint); margin-bottom: 14px;
  }

  .card {
    background: var(--surface); border: 1px solid var(--line-soft);
    border-radius: 12px; padding: 15px;
  }

  /* Scorecard: numbers first, labels under. It's read at a glance, so the
     figure has to be the biggest thing in the cell. */
  .score { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  /* ⚠️ BOTH GRIDS. The rule used to be ".score .cell" only, so the goals row
     underneath - identical markup, same 3-column grid - was left-aligned while
     the row above it was centred. They line up now. */
  .score .cell, .goals .cell { text-align: center; }
  .score .n { font-size: 26px; font-weight: 700; line-height: 1.1; font-variant-numeric: tabular-nums; }
  .score .t { font-size: 10.5px; font-weight: 600; color: var(--text-faint); text-transform: uppercase; letter-spacing: .05em; margin-top: 3px; }
  .score .won .n { color: var(--success); }
  .score .lost .n { color: var(--critical); }
  .score .drawn .n { color: var(--warning); }

  /* Scored / conceded / difference used to inherit a smaller size than the
     W-D-L row above them, which made the season's goal record read as a
     footnote to it. They're the same kind of fact and get the same weight. */
  .goals { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--line-soft); }
  .goals .n { font-size: 26px; }
  .goals .t { font-size: 10.5px; }

  /* Form guide, oldest on the left - the direction it's read. */
  .form { display: flex; gap: 8px; }
  .fdot {
    width: 34px; height: 34px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; font-weight: 700; color: #fff;
  }
  .fdot small { display: block; }
  .fscore { font-size: 10.5px; color: var(--text-faint); text-align: center; margin-top: 4px; font-variant-numeric: tabular-nums; }
  .fcol { text-align: center; }

  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { text-align: left; padding: 9px 6px; border-bottom: 1px solid var(--line-soft); }
  th {
    font-size: 10px; text-transform: uppercase; letter-spacing: .06em;
    color: var(--text-faint); font-weight: 700;
  }
  td.n, th.n { text-align: right; font-variant-numeric: tabular-nums; width: 46px; }
  tr:last-child td { border-bottom: none; }
  .rank { color: var(--text-faint); width: 22px; font-variant-numeric: tabular-nums; }
  .scroller { overflow-x: auto; }

  .btn {
    font-family: inherit; font-size: 13px; font-weight: 700;
    padding: 11px 15px; border-radius: 10px; cursor: pointer;
    border: 1.5px solid transparent; flex: 1;
  }
  .btn.primary { background: var(--accent); color: #fff; }
  .btn.ghost { background: transparent; color: var(--text-muted); border-color: var(--line); }
  .btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .btns { display: flex; gap: 9px; }

  .note {
    padding: 13px 15px; border-radius: 11px;
    background: var(--accent-soft); color: var(--text-muted);
    font-size: 13px; line-height: 1.5;
  }

  .empty, .loading {
    padding: 32px 18px; text-align: center; font-size: 13px;
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
      --neutral:#9AA6B4; --neutral-bg:#1E2733;
    }
    .btn.primary { color: #101820; }
    .fdot { color: #101820; }
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

class ManagerHubStats extends HTMLElement {
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
            console.error("manager-hub-stats: couldn't parse data attribute", err);
        }
    }

    build() {
        if (this._built) return;
        this._built = true;

        this.shadowRoot.innerHTML = `<style>${STYLES}</style>
          <div class="wrap"><div id="body"></div></div>`;

        const body = this.shadowRoot.getElementById("body");

        body.addEventListener("change", (event) => {
            const f = event.target.getAttribute("data-field");
            if (!f) return;
            this.dispatchEvent(new CustomEvent("statsFilter", {
                detail: {
                    teamId: f === "teamId" ? event.target.value : (this._data.teamId || ""),
                    season: f === "season" ? event.target.value : (this._data.season || "")
                }
            }));
        });

        body.addEventListener("click", (event) => {
            const el = event.target.closest("[data-act]");
            if (!el) return;
            this.dispatchEvent(new CustomEvent(el.getAttribute("data-act"), { detail: {} }));
        });

        this.paint();
    }

    paint() {
        const d = this._data;
        const body = this.shadowRoot.getElementById("body");

        if (d.loading) { body.innerHTML = `<div class="loading">Loading stats…</div>`; return; }

        const teams = Array.isArray(d.teams) ? d.teams : [];
        const seasons = Array.isArray(d.seasons) ? d.seasons : [];

        const pickers = `
          <div class="pickers">
            <select data-field="teamId" aria-label="Team">
              ${teams.map(t => `
                <option value="${esc(t.id)}" ${d.teamId === t.id ? "selected" : ""}>${esc(t.name)}</option>`).join("")}
            </select>
            <select data-field="season" aria-label="Season">
              ${seasons.map(s => `
                <option value="${esc(s.value)}" ${d.season === s.value ? "selected" : ""}>${esc(s.label)}</option>`).join("")}
            </select>
          </div>`;

        if (d.error) {
            body.innerHTML = pickers + `<div class="err">${esc(d.error)}</div>`;
            return;
        }

        const sc = d.scorecard || { won: 0, lost: 0, drawn: 0, goalsFor: 0, goalsAgainst: 0, goalDiff: 0 };
        const played = Number(d.played) || 0;

        // ⚠️ NOT "played === 0". The three collections are independent - a
        // manager can enter a full sheet of player stats without ever recording
        // the match result, and gating the whole screen on TeamStats hid their
        // leaderboards AND the Edit button, so the only way to reach the data
        // was to invent a result first.
        const hasAny = played > 0 ||
            (d.attack || []).length ||
            (d.defence || []).length ||
            (d.potm || []).length;

        if (!hasAny) {
            body.innerHTML = pickers + `
              <div class="empty">
                Nothing recorded for this season yet.<br>
                Add a result or a sheet of player stats and this fills in.
              </div>
              <div class="btns">
                <button type="button" class="btn primary" data-act="openStatsAdd">Add stats</button>
              </div>`;
            return;
        }

        body.innerHTML = pickers + `
          ${played === 0 ? `
            <div class="note">
              No match results recorded yet, so there's no table or form guide.
              The player numbers below are all here.
            </div>` : `
          <div>
            <div class="label">Season — ${played} ${played === 1 ? "match" : "matches"}</div>
            <div class="card">
              <div class="score">
                <div class="cell won"><div class="n">${sc.won}</div><div class="t">Won</div></div>
                <div class="cell drawn"><div class="n">${sc.drawn}</div><div class="t">Drawn</div></div>
                <div class="cell lost"><div class="n">${sc.lost}</div><div class="t">Lost</div></div>
              </div>
              <div class="goals">
                <div class="cell"><div class="n">${sc.goalsFor}</div><div class="t">Scored</div></div>
                <div class="cell"><div class="n">${sc.goalsAgainst}</div><div class="t">Conceded</div></div>
                <div class="cell"><div class="n">${sc.goalDiff > 0 ? "+" : ""}${sc.goalDiff}</div><div class="t">Difference</div></div>
              </div>
            </div>
          </div>`}

          ${(d.form || []).length ? `
            <div>
              <div class="label">Recent form</div>
              <div class="card">
                <div class="form">
                  ${d.form.map(m => `
                    <div class="fcol">
                      <div class="fdot" style="background:${RESULT_COLOR[m.result] || "var(--neutral)"}">${esc(m.letter)}</div>
                      <div class="fscore">${esc(m.score)}</div>
                    </div>`).join("")}
                </div>
              </div>
            </div>` : ""}

          ${this.tableHtml("Goals and assists", d.attack, [["goals", "G"], ["assists", "A"]])}
          ${this.tableHtml("Tackles and saves", d.defence, [["tackles", "T"], ["saves", "S"]])}

          ${(d.potm || []).length ? `
            <div>
              <div class="label">Player of the match</div>
              <div class="card scroller">
                <table>
                  <thead><tr><th class="rank"></th><th>Player</th><th class="n">Awards</th></tr></thead>
                  <tbody>
                    ${d.potm.map((p, i) => `
                      <tr>
                        <td class="rank">${i + 1}</td>
                        <td>${esc(p.name)}</td>
                        <td class="n">${p.count}</td>
                      </tr>`).join("")}
                  </tbody>
                </table>
              </div>
            </div>` : ""}

          <div class="btns">
            <button type="button" class="btn primary" data-act="openStatsAdd">Add stats</button>
            <button type="button" class="btn ghost" data-act="openStatsEdit">Edit records</button>
          </div>`;
    }

    tableHtml(title, rows, cols) {
        if (!Array.isArray(rows) || rows.length === 0) return "";
        return `
          <div>
            <div class="label">${esc(title)}</div>
            <div class="card scroller">
              <table>
                <thead>
                  <tr>
                    <th class="rank"></th><th>Player</th>
                    ${cols.map(c => `<th class="n">${esc(c[1])}</th>`).join("")}
                  </tr>
                </thead>
                <tbody>
                  ${rows.map((p, i) => `
                    <tr>
                      <td class="rank">${i + 1}</td>
                      <td>${esc(p.name)}</td>
                      ${cols.map(c => `<td class="n">${Number(p[c[0]]) || 0}</td>`).join("")}
                    </tr>`).join("")}
                </tbody>
              </table>
            </div>
          </div>`;
    }
}

if (!customElements.get("manager-hub-stats")) {
    customElements.define("manager-hub-stats", ManagerHubStats);
}

// =====================================================================
//  PAGE CODE CONTRACT
// =====================================================================
//  IN — {loading:true} first, then getStatsOverview()'s payload plus the
//  pickers' options:
//    {
//      teams: [{ id, name }], seasons: [{ value, label }],
//      teamId, season, played,
//      scorecard: { won, lost, drawn, goalsFor, goalsAgainst, goalDiff },
//      form: [{ result, letter, score }],
//      attack: [{ name, goals, assists }],
//      defence: [{ name, tackles, saves }],
//      potm: [{ name, count }],
//      error: ""
//    }
//
//  OUT:
//    on("statsFilter", e => …)   // { teamId, season } - refetch and push back
//    on("openStatsAdd", () => …)
//    on("openStatsEdit", () => …)
// =====================================================================
