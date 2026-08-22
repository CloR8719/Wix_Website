// =====================================================================
//  <manager-hub-fixtures> — Manager Hub v2, fixtures & replies
// =====================================================================
//  Upcoming fixtures for this team with their live reply counts, plus the
//  last four weeks so a manager can check who actually said they'd come.
//
//  SETUP:
//    1. Public -> custom-elements -> new file `managerHubFixtures.js`.
//    2. On stateFixtures: Add -> Embed Code -> Custom Element.
//       Tag name: manager-hub-fixtures   Element ID: #customMgrFixtures
//    3. Height ~700px to start; it self-sizes after first paint.
//
//  ⚠️ REPUBLISH *AND* HARD-REFRESH after any change.
//
//  THE COUNTS ARE WHY THE WHOLE FIXTURES FEATURE EXISTS. Everything else on
//  this screen is in service of a manager knowing how many are coming, so
//  the bar and the three numbers sit above the fold on every card rather
//  than behind a tap.
//
//  ⚠️ THESE ARE REPLIES, NOT ATTENDANCE. rsvpAccepted is who SAID they were
//  coming. Never relabel this as an attendance register - that's a manager
//  marking who turned up, a different field and a different screen. Conflate
//  them and the number starts rewarding whoever taps yes most reliably.
// =====================================================================

const TYPE_TONE = {
    Match: "t-info", Tournament: "t-violet",
    Training: "t-accent", Event: "t-neutral"
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

  .btn {
    font-family: inherit; font-size: 13px; font-weight: 700;
    padding: 10px 14px; border-radius: 10px; cursor: pointer;
    border: 1.5px solid transparent;
  }
  .btn.primary { background: var(--accent); color: #fff; width: 100%; }
  .btn.ghost { background: transparent; color: var(--text-muted); border-color: var(--line); }
  .btn.small { font-size: 12px; padding: 8px 12px; }
  .btn[disabled] { opacity: .55; cursor: default; }
  .btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .btns { display: flex; gap: 7px; flex-wrap: wrap; margin-top: 11px; }

  .day { margin-top: 4px; }
  .day-label {
    font-size: 10.5px; font-weight: 700; letter-spacing: .07em;
    text-transform: uppercase; color: var(--text-faint); margin-bottom: 7px;
  }

  .card {
    background: var(--surface); border: 1px solid var(--line-soft);
    border-radius: 12px; padding: 14px 15px;
  }
  .card + .card { margin-top: 9px; }
  /* Past fixtures live below their own heading now, so they no longer need
     to be dimmed to the point of looking broken - the heading does that job,
     and RSVP numbers on a played game still need to be readable. */
  .card.past { opacity: .92; }

  .pastwrap { margin-top: 26px; padding-top: 20px; border-top: 1px solid var(--line-soft); }
  .pastlabel {
    font-size: 10.5px; font-weight: 700; letter-spacing: .07em;
    text-transform: uppercase; color: var(--text-faint); margin-bottom: 14px;
  }
  .nothing {
    padding: 22px 16px; text-align: center;
    border: 1px dashed var(--line); border-radius: 12px;
    font-size: 13px; line-height: 1.6; color: var(--text-muted);
  }

  .head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
  .title { font-size: 14.5px; font-weight: 700; line-height: 1.35; }
  .meta { font-size: 12px; color: var(--text-muted); margin-top: 3px; line-height: 1.5; }
  .notes {
    margin-top: 9px; padding: 9px 11px; border-radius: 9px;
    background: var(--neutral-bg); color: var(--text-muted);
    font-size: 12px; line-height: 1.5;
  }

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

  /* One bar, three segments. A manager reads the shape before the numbers -
     mostly green is fine, mostly grey means nobody's answered yet. */
  .bar { display: flex; gap: 4px; margin-top: 11px; height: 7px; }
  .bar span { border-radius: 4px; min-width: 3px; }
  .bar .yes { background: var(--success); }
  .bar .no  { background: var(--critical); }
  .bar .non { background: var(--neutral-bg); }
  .key { display: flex; gap: 14px; margin-top: 8px; font-size: 11.5px; color: var(--text-muted); }
  .key b { color: var(--text); font-weight: 700; }

  /* Nobody has been asked yet - drawing an empty bar would imply everyone
     said no. */
  .noone { margin-top: 10px; font-size: 12px; color: var(--text-faint); }

  .who { margin-top: 11px; padding-top: 11px; border-top: 1px solid var(--line-soft); }
  .who h4 {
    margin: 0 0 5px; font-size: 10.5px; font-weight: 700; letter-spacing: .06em;
    text-transform: uppercase; color: var(--text-faint);
  }
  .who ul { margin: 0 0 11px; padding-left: 17px; font-size: 12.5px; line-height: 1.65; }
  .who li { color: var(--text); }
  .who .none { font-size: 12px; color: var(--text-faint); margin: 0 0 11px; }

  .audwarn {
    margin-top: 9px; font-size: 11.5px; color: var(--warning);
    background: var(--warning-bg); padding: 8px 10px; border-radius: 8px; line-height: 1.5;
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

class ManagerHubFixtures extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._built = false;
        this._data = { loading: true };
        this._resizeObserver = null;
        this._lastHeight = 0;
        // Which cards have their name lists open. Local, so a background
        // refresh doesn't collapse a list a manager is reading off.
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
            console.error("manager-hub-fixtures: couldn't parse data attribute", err);
        }
    }

    build() {
        if (this._built) return;
        this._built = true;

        this.shadowRoot.innerHTML = `<style>${STYLES}</style>
          <div class="wrap">
            <button type="button" class="btn primary" data-act="addFixture">＋ Add a fixture</button>
            <div id="body"></div>
          </div>`;

        this.shadowRoot.querySelector(".wrap").addEventListener("click", (event) => {
            const el = event.target.closest("[data-act]");
            if (!el || el.disabled) return;
            const act = el.getAttribute("data-act");
            const id = el.getAttribute("data-id") || "";

            if (act === "toggleWho") {
                this._open[id] = !this._open[id];
                this.paint();
                // Names are fetched on demand - a manager rarely opens more
                // than one, and loading every list up front would be a query
                // per fixture for data mostly nobody looks at.
                if (this._open[id]) {
                    this.dispatchEvent(new CustomEvent("loadReplies", { detail: { fixtureId: id } }));
                }
                return;
            }

            this.dispatchEvent(new CustomEvent(act, { detail: { fixtureId: id } }));
        });

        this.paint();
    }

    paint() {
        const d = this._data;
        const body = this.shadowRoot.getElementById("body");

        if (d.loading) { body.innerHTML = `<div class="loading">Loading fixtures…</div>`; return; }
        if (d.error) { body.innerHTML = `<div class="err">${esc(d.error)}</div>`; return; }

        const fixtures = Array.isArray(d.fixtures) ? d.fixtures : [];
        if (fixtures.length === 0) {
            body.innerHTML = `<div class="empty">
                Nothing on the calendar for this team.<br>
                Add a fixture and it appears in every parent's hub straight away.
              </div>`;
            return;
        }

        // ⚠️ UPCOMING FIRST, PAST UNDERNEATH ITS OWN HEADING.
        //
        // getTeamFixtures deliberately returns 28 days of history so a manager
        // can still check who turned up to a recent game. But the whole lot
        // used to be ONE ascending list, so opening Fixtures on a Saturday
        // showed Monday's and Wednesday's finished games first, and this
        // weekend's match was below them. The only thing marking the old ones
        // was opacity .78, which reads as a rendering quirk, not as "this
        // already happened".
        //
        // Sorted DESCENDING in the past group - most recent first. Ascending
        // is right for the future (what's next) and wrong for the past, where
        // the thing you want is the game you just played.
        const upcoming = fixtures.filter(f => !f.past);
        const past = fixtures.filter(f => f.past).reverse();

        const group = (rows) => {
            const days = [];
            rows.forEach(f => {
                let day = days.find(x => x.iso === f.dateIso);
                if (!day) { day = { iso: f.dateIso, label: f.dateLabel, items: [] }; days.push(day); }
                day.items.push(f);
            });
            return days.map(day => `
              <div class="day">
                <div class="day-label">${esc(day.label)}</div>
                ${day.items.map(f => this.cardHtml(f)).join("")}
              </div>`).join("");
        };

        body.innerHTML = `
          ${upcoming.length
              ? group(upcoming)
              : `<div class="nothing">
                   Nothing coming up. Add a fixture and it'll appear here.
                 </div>`}

          ${past.length
              ? `<div class="pastwrap">
                   <div class="pastlabel">Already played</div>
                   ${group(past)}
                 </div>`
              : ""}`;
    }

    cardHtml(f) {
        const title = (f.homeTeam && f.awayTeam)
            ? `${f.homeTeam} vs ${f.awayTeam}`
            : f.eventType;
        const time = f.stopTime ? `${f.startTime}–${f.stopTime}` : f.startTime;
        const meta = [time, f.venue].filter(Boolean).join(" · ");

        const total = f.accepted + f.declined + f.noReply;
        const counts = total > 0
            ? `<div class="bar">
                 ${f.accepted ? `<span class="yes" style="flex:${f.accepted}"></span>` : ""}
                 ${f.declined ? `<span class="no" style="flex:${f.declined}"></span>` : ""}
                 ${f.noReply ? `<span class="non" style="flex:${f.noReply}"></span>` : ""}
               </div>
               <div class="key">
                 <span><b>${f.accepted}</b> going</span>
                 <span><b>${f.declined}</b> can't</span>
                 <span><b>${f.noReply}</b> no reply</span>
               </div>`
            : `<div class="noone">No replies yet.</div>`;

        return `
          <div class="card ${f.past ? "past" : ""}">
            <div class="head">
              <div>
                <div class="title">${esc(title)}</div>
                ${meta ? `<div class="meta">${esc(meta)}</div>` : ""}
              </div>
              <span class="pill ${TYPE_TONE[f.eventType] || "t-neutral"}">${esc(f.eventType)}</span>
            </div>
            ${f.notes ? `<div class="notes">${esc(f.notes)}</div>` : ""}
            ${!f.audienceSet && f.audience === "Playing Only"
                ? `<div class="audwarn">Training-only players aren't being asked about this one — that's the default for a ${esc(f.eventType.toLowerCase())}. Edit it if that's wrong.</div>`
                : ""}
            ${counts}
            ${this.whoHtml(f)}
            <div class="btns">
              <button type="button" class="btn ghost small" data-act="toggleWho" data-id="${esc(f.id)}">
                ${this._open[f.id] ? "Hide replies" : "See who's replied"}
              </button>
              ${!f.rolledUp
                  ? `<button type="button" class="btn ghost small" data-act="editFixture" data-id="${esc(f.id)}">Edit</button>`
                  : ""}
            </div>
          </div>`;
    }

    whoHtml(f) {
        if (!this._open[f.id]) return "";
        const replies = (this._data.replies || {})[f.id];
        if (!replies) return `<div class="who"><p class="none">Loading replies…</p></div>`;

        const list = (title, rows) => `
          <h4>${title}</h4>
          ${rows && rows.length
              ? `<ul>${rows.map(r => `<li>${esc(r.name)}</li>`).join("")}</ul>`
              : `<p class="none">Nobody</p>`}`;

        return `
          <div class="who">
            ${list("Going", replies.accepted)}
            ${list("Can't make it", replies.declined)}
            ${list("No reply", replies.noReply)}
          </div>`;
    }
}

if (!customElements.get("manager-hub-fixtures")) {
    customElements.define("manager-hub-fixtures", ManagerHubFixtures);
}

// =====================================================================
//  PAGE CODE CONTRACT
// =====================================================================
//  IN — {loading:true} first, then getTeamFixtures()'s payload plus:
//    {
//      fixtures: [{ id, eventType, dateIso, dateLabel, past, startTime,
//                   stopTime, homeTeam, awayTeam, venue, notes, audience,
//                   audienceSet, accepted, declined, noReply, rolledUp }],
//      replies: { [fixtureId]: { accepted:[{name}], declined:[], noReply:[] } }
//    }
//
//  `replies` fills in per fixture as they're requested - see loadReplies.
//
//  OUT:
//    on("addFixture",  () => …)
//    on("editFixture", e => …)   // { fixtureId }
//    on("loadReplies", e => …)   // { fixtureId } - fetch, then patch `replies`
// =====================================================================
