// =====================================================================
//  <manager-hub-home> — Manager Hub v2, Home
// =====================================================================
//  One card per team the manager is on: squad size, what's in the pipeline,
//  and anything waiting on a parent.
//
//  SETUP:
//    1. Public -> custom-elements -> new file `managerHubHome.js`.
//    2. On stateHome: Add -> Embed Code -> Custom Element.
//       Tag name: manager-hub-home   Element ID: #customMgrHome
//    3. Height ~600px to start; it self-sizes after first paint.
//
//  ⚠️ REPUBLISH *AND* HARD-REFRESH after any change.
//
//  THE CHASE LINE IS SPELLED OUT, not counted. "3 need attention" isn't
//  actionable; "2 registration forms with parents, 1 sent back for changes"
//  tells a manager who to ring and why. The backend builds that sentence
//  (getManagerDashboard) so the same wording can be reused elsewhere.
//
//  Recruitment sits on Home rather than only under More because it's the
//  thing managers currently ask Rob to do by hand - it should be the easiest
//  thing on the screen to find, not buried three taps down.
// =====================================================================

const STYLES = `
  :host { display: block; width: 100%; font-family: 'Work Sans', -apple-system, BlinkMacSystemFont, sans-serif; }
  * { box-sizing: border-box; }

  .wrap {
    /* Charcoal accent - the Manager Hub's marker against the Parent Hub's
       club green. Semantic colours below are IDENTICAL to the Parent Hub on
       purpose: green means good and red means wrong in both. */
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

  .greet h2 { margin: 0; font-size: 19px; font-weight: 700; line-height: 1.25; }
  .greet p { margin: 3px 0 0; font-size: 13px; color: var(--text-muted); line-height: 1.5; }

  .cards { display: flex; flex-direction: column; gap: 12px; }
  @media (min-width: 750px) {
    .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); }
  }

  .card {
    background: var(--surface); border: 1px solid var(--line-soft);
    border-radius: 13px; padding: 15px 16px;
  }

  .head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .team { font-size: 16px; font-weight: 700; }

  .pill {
    display: inline-block; padding: 3px 10px; border-radius: 999px;
    font-size: 11px; font-weight: 700; white-space: nowrap;
    background: var(--accent-soft); color: var(--accent);
  }

  .counts { margin-top: 9px; font-size: 12.5px; color: var(--text-muted); }

  /* Amber rather than red: a form sitting with a parent is normal club
     admin, not a failure. Red is reserved for something actually wrong. */
  .chase {
    margin-top: 11px; padding: 10px 12px; border-radius: 10px;
    background: var(--warning-bg); color: var(--warning);
    font-size: 12px; font-weight: 600; line-height: 1.5;
    cursor: pointer; border: 1px solid transparent;
  }
  .chase:hover { border-color: currentColor; }

  /* Two actions per card: the squad (daily) and stats (weekly, after a
     match). Stats used to be three taps deep under More, which is the wrong
     depth for the thing managers do most often. */
  .btns { display: flex; gap: 8px; margin-top: 12px; }
  .btn {
    font-family: inherit; font-size: 13px; font-weight: 700;
    padding: 10px 14px; border-radius: 10px; cursor: pointer;
    border: 1.5px solid transparent; flex: 1; min-width: 0;
    white-space: nowrap;
    /* Centred explicitly. A button's default centring is only default - it
       inherits text-align from an ancestor in some engines, and "Manage squad"
       is the longest label here so it shows first. */
    text-align: center;
    display: flex; align-items: center; justify-content: center;
    overflow: hidden; text-overflow: ellipsis;
  }

  /* Below this the two labels genuinely cannot sit side by side without
     clipping, and a half-word button is worse than a stacked pair. */
  @media (max-width: 400px) {
    .btns { flex-direction: column; }
    .btn { flex: none; width: 100%; }
  }
  .btn.primary { background: var(--accent); color: #fff; }
  .btn.ghost { background: transparent; color: var(--text-muted); border-color: var(--line); }
  .btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

  /* ---------- compliance ---------- */
  .comply {
    border-radius: 12px; padding: 13px 14px; margin-bottom: 18px;
    font-size: 12.5px; line-height: 1.55;
    border: 1px solid transparent;
  }
  .comply.expired { background: var(--critical-bg); color: var(--critical); border-color: var(--critical); }
  .comply.soon    { background: var(--warning-bg);  color: var(--warning); }
  .comply b { font-weight: 700; }
  .comply ul { margin: 7px 0 0; padding-left: 18px; }
  .comply li + li { margin-top: 3px; }
  .comply .go {
    margin-top: 10px; background: none; border: none; padding: 0;
    font-family: inherit; font-size: 12.5px; font-weight: 700;
    color: inherit; text-decoration: underline; cursor: pointer;
  }
  .comply .go:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }

  /* ---------- this week ---------- */
  .weeklabel {
    font-size: 10.5px; font-weight: 700; letter-spacing: .07em;
    text-transform: uppercase; color: var(--text-faint); margin-bottom: 10px;
  }
  .week { display: flex; flex-direction: column; gap: 9px; margin-bottom: 18px; }
  .fx {
    display: block; width: 100%; text-align: left;
    background: var(--surface); border: 1px solid var(--line-soft);
    border-radius: 12px; padding: 13px 14px;
    font-family: inherit; color: inherit; cursor: pointer;
  }
  .fx:hover { border-color: var(--line); }
  .fx:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

  .fx-top { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
  .fx-when { font-size: 13.5px; font-weight: 700; }
  .fx-time { font-size: 12.5px; color: var(--text-muted); font-variant-numeric: tabular-nums; white-space: nowrap; }
  .fx-what { font-size: 12.5px; color: var(--text-muted); margin-top: 3px; line-height: 1.5; }

  /* The RSVP split. Tabular figures so three rows of counts line up rather
     than jittering as the numbers change width. */
  .fx-rsvp {
    display: flex; flex-wrap: wrap; gap: 5px 9px; margin-top: 9px;
    font-size: 12px; font-variant-numeric: tabular-nums;
  }
  .fx-rsvp b { font-weight: 700; }
  .rs-yes { color: var(--success); }
  .rs-no  { color: var(--text-muted); }
  /* Amber, not red - nobody has done anything WRONG, it just needs chasing. */
  .rs-wait { color: var(--warning); font-weight: 600; }
  .fx-quiet { font-size: 12px; color: var(--text-faint); margin-top: 8px; }

  .fx-team {
    display: inline-block; margin-top: 8px;
    font-size: 10.5px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase;
    color: var(--accent); background: var(--accent-soft);
    border-radius: 999px; padding: 3px 9px;
  }

  .nextup {
    border: 1px dashed var(--line); border-radius: 12px;
    padding: 14px; font-size: 12.5px; color: var(--text-muted); line-height: 1.55;
  }
  .nextup b { color: var(--text); }

  .recruit {
    border: 1px dashed var(--line); border-radius: 13px;
    padding: 16px; text-align: center;
  }
  .recruit p { margin: 0 0 11px; font-size: 12.5px; color: var(--text-muted); line-height: 1.55; }
  .recruit .btn { width: 100%; flex: none; }

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

  /* Clearance for the bottom nav bar, which is pinned over the content on
     mobile. Without this the last card sits under it and can't be scrolled
     into view - the page rubber-bands back the moment you let go. */
  @media (max-width: 749px) {
    .wrap { padding-bottom: calc(84px + env(safe-area-inset-bottom, 0px)); }
  }
`;

function esc(value) {
    return String(value == null ? "" : value)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;")
        .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

class ManagerHubHome extends HTMLElement {
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
            console.error("manager-hub-home: couldn't parse data attribute", err);
        }
    }

    build() {
        if (this._built) return;
        this._built = true;

        this.shadowRoot.innerHTML = `<style>${STYLES}</style>
          <div class="wrap">
            <div class="greet">
              <h2 id="greeting"></h2>
              <p id="subline"></p>
            </div>
            <div id="body"></div>
          </div>`;

        // Delegated - paint() replaces the cards wholesale on every refresh.
        this.shadowRoot.getElementById("body").addEventListener("click", (event) => {
            const el = event.target.closest("[data-act]");
            if (!el) return;
            this.dispatchEvent(new CustomEvent(el.getAttribute("data-act"), {
                detail: { teamId: el.getAttribute("data-team") || "" }
            }));
        });

        this.paint();
    }

    paint() {
        const d = this._data;
        const body = this.shadowRoot.getElementById("body");

        this.shadowRoot.getElementById("greeting").textContent =
            d.name ? `Hi ${String(d.name).split(" ")[0]}` : "Your teams";

        if (d.loading) {
            this.shadowRoot.getElementById("subline").textContent = "";
            body.innerHTML = `<div class="loading">Loading your teams…</div>`;
            return;
        }

        if (d.error) {
            this.shadowRoot.getElementById("subline").textContent = "";
            body.innerHTML = `<div class="err">${esc(d.error)}</div>`;
            return;
        }

        const teams = Array.isArray(d.teams) ? d.teams : [];

        this.shadowRoot.getElementById("subline").textContent = teams.length
            ? (teams.length === 1 ? "Everything for your squad in one place"
                                  : `Everything for your ${teams.length} squads in one place`)
            : "";

        if (teams.length === 0) {
            body.innerHTML = `<div class="empty">
                You're not assigned to a team yet.<br>
                Ask the club secretary to add you to one and it'll appear here.
              </div>`;
            return;
        }

        body.innerHTML = `
          ${this.complyHtml()}
          ${this.weekHtml()}
          <div class="cards">${teams.map(t => this.cardHtml(t)).join("")}</div>
          <div class="recruit" style="margin-top:16px">
            <p>Short of players? Make a recruitment poster for the club website.</p>
            <button type="button" class="btn ghost" data-act="openRecruit">Create recruitment post</button>
          </div>`;
    }

    // ⚠️ ABOVE EVERYTHING, INCLUDING THIS WEEK'S FIXTURES. An expired DBS or
    // safeguarding certificate stops a person coaching at all, so it outranks
    // knowing who's available for a match they may not be allowed to take.
    //
    // The staff record has shown these dates all along - but that screen is
    // More -> My staff record, which nobody opens unprompted. The first anyone
    // heard about an expiry was being pulled off the touchline.
    //
    // Only WRONG things are ever in this list (see complianceWarnings): a
    // block listing four valid certificates every week teaches a manager to
    // scroll past it, which is precisely when the expired one turns up in it.
    complyHtml() {
        const rows = (this._data && this._data.compliance) || [];
        if (!rows.length) return "";

        const expired = rows.filter(r => r.state === "expired");
        const worst = expired.length ? "expired" : "soon";

        const line = (r) => {
            if (r.state === "expired") {
                const d = Math.abs(Number(r.days) || 0);
                return esc(r.label) + " — expired " + (d === 0 ? "today" : d + (d === 1 ? " day ago" : " days ago"));
            }
            const d = Number(r.days) || 0;
            return esc(r.label) + " — expires in " + (d === 0 ? "today" : d + (d === 1 ? " day" : " days"));
        };

        return `
          <div class="comply ${worst}">
            <b>${expired.length
                  ? (expired.length === 1 ? "A certificate has expired" : expired.length + " certificates have expired")
                  : "Renewal due"}</b>
            <ul>${rows.map(r => "<li>" + line(r) + "</li>").join("")}</ul>
            <button type="button" class="go" data-act="openStaff">Open my staff record</button>
          </div>`;
    }

    // Sits ABOVE the team cards because it's the only thing here that expires.
    // A squad count is the same on Tuesday as it was on Monday; "Saturday, 3
    // still haven't replied" stops being useful the moment Saturday arrives.
    //
    // Fixtures are pushed in SEPARATELY from the dashboard payload and arrive
    // a moment later, so an undefined week means "still loading" and an empty
    // array means "genuinely nothing". Rendering nothing while it is undefined
    // avoids flashing "nothing on this week" at a manager who has a match on
    // Saturday.
    weekHtml() {
        const d = this._data || {};
        if (!Array.isArray(d.week)) return "";

        if (d.week.length === 0) {
            if (!d.weekNext) return "";
            const nx = d.weekNext;
            return `
              <div class="weeklabel">Coming up</div>
              <div class="week">
                <div class="nextup">
                  Nothing in the next ${Number(d.weekDays) || 7} days.
                  Next is <b>${esc(nx.eventType)}</b> on
                  <b>${esc(nx.dateLabel)}</b>${nx.startTime ? " at " + esc(nx.startTime) : ""}${
                    nx.multiTeam && nx.teamName ? " — " + esc(nx.teamName) : ""}.
                </div>
              </div>`;
        }

        return `
          <div class="weeklabel">This week</div>
          <div class="week">${d.week.map(f => this.fixtureHtml(f)).join("")}</div>`;
    }

    // One fixture. Reads as a sentence, not a table - a manager glancing at
    // this on a phone wants "Saturday, 3 haven't replied", not four labelled
    // figures they have to assemble themselves.
    fixtureHtml(f) {
        const line = [f.homeTeam, f.awayTeam].filter(Boolean).join(" v ");
        const what = line || f.eventType || "Event";
        const where = f.venue ? " · " + f.venue : "";

        // Before anyone has been asked there is nothing to report. Saying
        // "0 going" about a fixture created ten seconds ago is technically
        // true and completely useless.
        const rsvp = !f.asked
            ? `<div class="fx-quiet">No replies yet — parents haven't been asked.</div>`
            : `<div class="fx-rsvp">
                 <span class="rs-yes"><b>${Number(f.accepted) || 0}</b> going</span>
                 ${f.declined ? `<span class="rs-no"><b>${Number(f.declined)}</b> can't</span>` : ""}
                 ${f.noReply ? `<span class="rs-wait"><b>${Number(f.noReply)}</b> no reply</span>` : ""}
               </div>`;

        return `
          <button type="button" class="fx" data-act="openFixtures" data-team="${esc(f.teamId)}">
            <div class="fx-top">
              <span class="fx-when">${esc(f.dateLabel)}</span>
              ${f.startTime ? `<span class="fx-time">${esc(f.startTime)}</span>` : ""}
            </div>
            <div class="fx-what">${esc(what)}${esc(where)}</div>
            ${rsvp}
            ${f.multiTeam && f.teamName ? `<span class="fx-team">${esc(f.teamName)}</span>` : ""}
          </button>`;
    }

    cardHtml(t) {
        // Reads as a sentence rather than three labelled numbers - a manager
        // scanning this wants "is there anything new", not a report.
        const bits = [];
        if (t.enquiryCount) bits.push(`${t.enquiryCount} ${t.enquiryCount === 1 ? "enquiry" : "enquiries"}`);
        if (t.trialCount) bits.push(`${t.trialCount} on trial`);
        const counts = bits.length ? bits.join(" · ") : "Nothing new in the pipeline";

        return `
          <div class="card">
            <div class="head">
              <span class="team">${esc(t.name)}</span>
              <span class="pill">${Number(t.squadCount) || 0} squad</span>
            </div>
            <div class="counts">${esc(counts)}</div>
            ${t.chaseText
                ? `<div class="chase" role="button" tabindex="0"
                        data-act="openSquad" data-team="${esc(t.id)}">${esc(t.chaseText)} — tap to follow up</div>`
                : ""}
            <div class="btns">
              <button type="button" class="btn primary" data-act="openSquad" data-team="${esc(t.id)}">Manage squad</button>
              <button type="button" class="btn ghost" data-act="openStatsAdd" data-team="${esc(t.id)}">Add stats</button>
            </div>
          </div>`;
    }
}

if (!customElements.get("manager-hub-home")) {
    customElements.define("manager-hub-home", ManagerHubHome);
}

// =====================================================================
//  PAGE CODE CONTRACT
// =====================================================================
//  IN — {loading:true} first, then getManagerDashboard()'s payload:
//    {
//      name: "Michael Turner",
//      teams: [{ id, name, squadCount, trialCount, enquiryCount,
//                chaseCount, chaseText }]
//    }
//    or { error: "…" } if the load failed.
//
//  OUT:
//    on("openSquad",    e => …)   // { teamId }
//    on("openStatsAdd", e => …)   // { teamId }
//    on("openRecruit",  () => …)
// =====================================================================
