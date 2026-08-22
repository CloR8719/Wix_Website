// =====================================================================
//  <parent-hub-fixtures> — Parent Hub v2, Fixtures & Results
// =====================================================================
//  Every upcoming fixture for this parent's children, grouped by date,
//  with a Going / Can't make it answer per child.
//
//  SETUP:
//    1. Public -> custom-elements -> new file `parentHubFixtures.js`.
//    2. On stateFixtures: Add -> Embed Code -> Custom Element.
//       Tag name: parent-hub-fixtures   Element ID: #customFixtures
//    3. Height ~800px to start; it self-sizes after first paint.
//
//  ⚠️ REPUBLISH *AND* HARD-REFRESH after any change.
//
//  ONE CARD PER FIXTURE, NOT PER CHILD. Two children in the same squad
//  share one fixture, so the card lists both with their own buttons rather
//  than showing the same match twice. A parent with children in different
//  squads sees each squad's fixtures under the same dates.
//
//  The visibility rule (Playing Only fixtures hidden from training-only
//  children) is applied SERVER-SIDE in fixtures.jsw - by the time a
//  fixture reaches this element, it's already been decided that this child
//  should see it.
// =====================================================================

const TYPE_TONE = {
    Match: "match",
    Tournament: "tournament",
    Training: "training",
    Event: "event"
};

const STYLES = `
  :host { display: block; width: 100%; font-family: 'Work Sans', -apple-system, BlinkMacSystemFont, sans-serif; }
  * { box-sizing: border-box; }

  .wrap {
    --surface:#FFFFFF; --raised:#FFFFFF; --pitch:#1F5136; --pitch-soft:#DCE9E0;
    --line:#E1E4DB; --line-soft:#ECEEE8;
    --text:#16212F; --text-muted:#5C6B7A; --text-faint:#8B98A3;
    --success:#158A45; --success-bg:#E4F5EA;
    --critical:#C23B3B; --critical-bg:#FCEAEA;
    --gold:#8A6A18; --gold-bg:#F7ECD2;
    --info:#1F5FA8; --info-bg:#E0EDFB;
    padding: 16px; color: var(--text);
  }
  @media (min-width: 750px) { .wrap { padding: 22px 28px; } }

  .intro { margin: 0 0 18px; font-size: 12.5px; color: var(--text-muted); line-height: 1.55; }

  .day + .day { margin-top: 22px; }
  .day-label {
    font-size: 11px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.6px; color: var(--text-faint); margin: 0 0 10px;
  }

  .card {
    background: var(--raised); border: 1px solid var(--line);
    border-radius: 13px; padding: 14px; margin-bottom: 10px;
  }

  .card-head { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 3px; }
  .type {
    flex-shrink: 0; display: inline-flex; align-items: center;
    padding: 3px 9px; border-radius: 999px;
    font-size: 10.5px; font-weight: 700; letter-spacing: 0.3px;
  }
  .type.match { background: var(--pitch-soft); color: var(--pitch); }
  .type.tournament { background: var(--gold-bg); color: var(--gold); }
  .type.training { background: var(--line-soft); color: var(--text-muted); }
  .type.event { background: var(--info-bg); color: var(--info); }

  .title {
    margin: 0; font-size: 14.5px; font-weight: 700; line-height: 1.3;
    overflow-wrap: anywhere;
  }
  /* Wrap, never truncate - a venue cut mid-postcode is worse than useless
     when someone is trying to find a pitch. */
  .meta {
    margin: 5px 0 0; font-size: 12px; color: var(--text-muted);
    line-height: 1.5; overflow-wrap: anywhere;
  }
  .notes {
    margin: 9px 0 0; padding: 9px 11px; border-radius: 8px;
    background: var(--line-soft); font-size: 12.5px; line-height: 1.5;
  }

  /* ---------- per-child answers ---------- */
  .kids { margin-top: 12px; border-top: 1px solid var(--line-soft); }
  .kid {
    display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
    padding: 11px 0; border-bottom: 1px solid var(--line-soft);
  }
  .kid:last-child { border-bottom: none; }
  .kid-name { flex: 1; min-width: 100px; font-size: 13.5px; font-weight: 600; }

  .answers { display: flex; gap: 7px; flex-shrink: 0; }
  .ans {
    font-family: inherit; font-size: 12.5px; font-weight: 600;
    padding: 8px 13px; border-radius: 8px; cursor: pointer;
    background: var(--surface); color: var(--text-muted);
    border: 1.5px solid var(--line); white-space: nowrap;
  }
  .ans:hover { border-color: var(--text-faint); color: var(--text); }
  .ans:focus-visible { outline: 2px solid var(--pitch); outline-offset: 2px; }
  .ans[disabled] { opacity: 0.55; cursor: default; }
  /* Chosen answers are filled, not merely outlined - on a list of several
     fixtures the parent needs to see at a glance which they've answered. */
  .ans.yes[aria-pressed="true"] {
    background: var(--success-bg); border-color: var(--success); color: var(--success);
  }
  .ans.no[aria-pressed="true"] {
    background: var(--critical-bg); border-color: var(--critical); color: var(--critical);
  }

  /* ---------- squad selection ---------- */
  .squad {
    margin-top: 11px; padding: 11px 12px; border-radius: 10px;
    background: var(--success-bg); border: 1px solid var(--success);
    display: flex; flex-direction: column; gap: 10px;
  }
  .squad-tag {
    font-size: 10px; font-weight: 800; letter-spacing: .07em; text-transform: uppercase;
    color: var(--success);
  }
  .squad .meet { font-size: 12.5px; color: var(--text); line-height: 1.5; }

  /* A small pitch, drawn not loaded. Only THIS child is named; every other
     shirt is deliberately blank, so there is no team sheet here. */
  .mpitch {
    position: relative; width: 100%; max-width: 190px; aspect-ratio: 68 / 100;
    border-radius: 8px; overflow: hidden; align-self: center;
    background: repeating-linear-gradient(to top, #4A8A5C 0 8%, #3F7D4E 8% 16%);
    border: 1.5px solid rgba(255,255,255,.34);
    display: grid; padding: 6px 4px;
  }
  .mpitch::before {
    content: ""; position: absolute; left: 0; right: 0; top: 50%;
    border-top: 1.5px solid rgba(255,255,255,.34);
  }
  .mrow { display: flex; align-items: center; justify-content: space-evenly; gap: 2px; position: relative; z-index: 2; }
  .mshirt {
    width: 15px; height: 15px; border-radius: 50%;
    background: rgba(255,255,255,.34); flex-shrink: 0;
  }
  .mshirt.mine {
    width: auto; min-width: 15px; height: auto; border-radius: 999px;
    background: #FFFFFF; color: #16212F;
    font-size: 8.5px; font-weight: 800; padding: 3px 7px; line-height: 1.1;
    box-shadow: 0 0 0 2px rgba(255,255,255,.45);
    max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }

  .kid-msg { flex-basis: 100%; font-size: 11.5px; color: var(--critical); font-weight: 600; }

  /* The fold. Everything past the reply window lives behind this, because
     16 weeks of training twice a week is ~50 cards and a parent's actual job
     on this screen is answering the next few. <details> rather than a click
     handler: it's keyboard-operable and survives a repaint without us
     tracking open/closed in the model. */
  .later { margin-top: 26px; }
  .later > summary {
    list-style: none; cursor: pointer; padding: 13px 15px;
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    background: var(--surface); border: 1px solid var(--line-soft); border-radius: 12px;
    font-size: 13.5px; font-weight: 700; color: var(--text-muted);
  }
  .later > summary::-webkit-details-marker { display: none; }
  .later > summary:hover { border-color: var(--line); }
  .later > summary::after {
    content: "▾"; font-size: 12px; color: var(--text-faint);
    transition: transform .18s ease;
  }
  .later[open] > summary::after { transform: rotate(180deg); }
  .later[open] > summary { border-bottom-left-radius: 0; border-bottom-right-radius: 0; }
  .later-body { padding-top: 18px; }
  .later-count { font-weight: 600; color: var(--text-faint); }

  /* When nothing at all is answerable yet, the top of the list would
     otherwise be blank above the fold. */
  .all-clear {
    padding: 22px 18px; text-align: center; border-radius: 12px;
    background: var(--surface); border: 1px solid var(--line-soft);
    font-size: 13px; color: var(--text-muted); line-height: 1.6;
  }

  /* Shown instead of the buttons on anything too far out to answer. Phrased
     as "not yet" rather than "you can't" - it's a timing thing, not a refusal,
     and a parent who reads it as a fault will go looking for the fault. */
  .not-yet {
    margin-top: 12px; padding-top: 11px; border-top: 1px solid var(--line-soft);
    font-size: 12px; color: var(--text-faint); line-height: 1.5;
  }
  /* Who it's for still matters without buttons - a parent with children in two
     squads can't tell whose match a far-off "Reds vs Rovers" is otherwise. */
  .not-yet-who { display: block; font-weight: 700; color: var(--text-muted); margin-bottom: 2px; }

  .empty {
    padding: 26px 16px; text-align: center; font-size: 13px;
    color: var(--text-muted); line-height: 1.55;
    border: 1px dashed var(--line); border-radius: 12px;
  }
  .loading { padding: 40px 16px; text-align: center; font-size: 13px; color: var(--text-muted); }

  @media (prefers-color-scheme: dark) {
    .wrap {
      --surface:#0E1826; --raised:#121F30; --line:#223145; --line-soft:#1A2739;
      --text:#E7ECF2; --text-muted:#A6B4C3; --text-faint:#71818F;
      --pitch:#5FBF8B; --pitch-soft:#17301F;
      --success:#5FD08B; --success-bg:#103322;
      --critical:#F08A8A; --critical-bg:#3A1414;
      --gold:#D8B968; --gold-bg:#33280F;
      --info:#7FB2EC; --info-bg:#132A42;
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

// Once an event has finished it's clutter - a parent looking at next week
// shouldn't be scrolling past this morning's training, and the venue stops
// being useful the moment it's over.
//
// Done HERE rather than in the backend on purpose: the browser knows the
// parent's real timezone. The server runs in UTC, so through British Summer
// Time it would be an hour out - and erring early means a fixture vanishing
// BEFORE kick-off, which is far worse than one lingering an hour too long.
//
// The window is deliberately generous. stopTime is the real end when the
// manager set one (training usually has it); otherwise assume a couple of
// hours. Either way an hour's grace on top, because a parent may still be
// driving there, parked outside, or checking the venue for pickup.
const GRACE_MINUTES = 60;
const ASSUMED_DURATION_MINUTES = 120;

function minutesOfDay(hhmm) {
    const m = /^(\d{1,2}):(\d{2})/.exec(String(hhmm || "").trim());
    if (!m) return null;
    return (Number(m[1]) * 60) + Number(m[2]);
}

function isFinished(fixture) {
    if (!fixture.dateIso) return false;

    const now = new Date();
    const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    // Only today's are ever in question - the backend already excludes
    // anything before today, and nothing later can have finished.
    if (fixture.dateIso !== todayIso) return false;

    const start = minutesOfDay(fixture.startTime);
    // No start time means no way to know it's over. Leave it listed all day
    // rather than guessing it away.
    if (start === null) return false;

    const stop = minutesOfDay(fixture.stopTime);
    const endsAt = (stop !== null ? stop : start + ASSUMED_DURATION_MINUTES) + GRACE_MINUTES;

    return ((now.getHours() * 60) + now.getMinutes()) > endsAt;
}

// Set to false for the text-only parent view (no pitch, no position).
const SHOW_PARENT_PITCH = true;

function parseShape(str) {
    const parts = String(str || "").trim().split(/[^0-9]+/).filter(Boolean).map(Number);
    if (!parts.length) return null;
    if (parts.some(function (x) { return x < 1 || x > 9; })) return null;
    return parts;
}

// "09:15" -> "9.15am". Parents read a meet-up time, not a 24-hour clock.
function timeWords(value) {
    const v = String(value || "").trim();
    if (!v) return "";
    const m = v.match(/^([0-9]{1,2}):([0-9]{2})/);
    if (!m) return v;
    let h = Number(m[1]);
    const mins = m[2];
    const suffix = h >= 12 ? "pm" : "am";
    h = h % 12;
    if (h === 0) h = 12;
    return mins === "00" ? (h + suffix) : (h + "." + mins + suffix);
}

function esc(value) {
    return String(value == null ? "" : value)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;")
        .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

class ParentHubFixtures extends HTMLElement {
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
            console.error("parent-hub-fixtures: couldn't parse data attribute", err);
        }
    }

    build() {
        if (this._built) return;
        this._built = true;
        this.shadowRoot.innerHTML = `
          <style>${STYLES}</style>
          <div class="wrap">
            <p class="intro">
              Training, matches and events for the next few weeks. Letting the coaches know
              whether your child can make it helps them plan.
            </p>
            <div id="list"></div>
          </div>`;

        // Delegated - the list is replaced wholesale whenever an answer lands.
        this.shadowRoot.getElementById("list").addEventListener("click", (event) => {
            const btn = event.target.closest("[data-response]");
            if (!btn || btn.disabled) return;
            this.dispatchEvent(new CustomEvent("respond", {
                detail: {
                    fixtureId: btn.getAttribute("data-fixture"),
                    playerId: btn.getAttribute("data-player"),
                    response: btn.getAttribute("data-response")
                }
            }));
        });

        this.paint();
    }

    $(id) { return this.shadowRoot.getElementById(id); }

    paint() {
        const d = this._data;
        const list = this.shadowRoot.getElementById("list");

        if (d.loading) {
            list.innerHTML = `<div class="loading">Loading fixtures…</div>`;
            return;
        }

        const fixtures = (Array.isArray(d.fixtures) ? d.fixtures : []).filter(f => !isFinished(f));
        if (fixtures.length === 0) {
            list.innerHTML = `<div class="empty">
                Nothing's on the calendar yet.<br>
                Anything new your team's manager adds will appear here.
              </div>`;
            return;
        }

        // Two lists, not one: what can be answered now, and what's just on
        // the calendar. Both stay chronological - the server sorted them and
        // this preserves order within each group.
        const now = fixtures.filter(f => f.canRespond !== false);
        const later = fixtures.filter(f => f.canRespond === false);

        const nowHtml = now.length
            ? this.daysHtml(now)
            : `<div class="all-clear">
                 Nothing needs an answer right now.${later.length ? " The rest of the season's below." : ""}
               </div>`;

        // Open by default when there's nothing above it, so the parent isn't
        // looking at a single collapsed bar and nothing else.
        const laterHtml = later.length
            ? `<details class="later" ${now.length ? "" : "open"}>
                 <summary>
                   <span>Later in the season</span>
                   <span class="later-count">${later.length}</span>
                 </summary>
                 <div class="later-body">${this.daysHtml(later)}</div>
               </details>`
            : "";

        list.innerHTML = nowHtml + laterHtml;
    }

    // Groups a set of fixtures under their date headings. Assumes the input is
    // already in date order.
    daysHtml(fixtures) {
        const days = [];
        fixtures.forEach(f => {
            let day = days.find(x => x.iso === f.dateIso);
            if (!day) { day = { iso: f.dateIso, label: f.dateLabel, items: [] }; days.push(day); }
            day.items.push(f);
        });

        return days.map(day => `
          <div class="day">
            <div class="day-label">${esc(day.label)}</div>
            ${day.items.map(f => this.cardHtml(f)).join("")}
          </div>`).join("");
    }

    cardHtml(f) {
        // A match has two named sides; training and events don't, so fall back
        // to the squad name rather than printing an empty "vs".
        const title = (f.homeTeam && f.awayTeam)
            ? `${f.homeTeam} vs ${f.awayTeam}`
            : (f.teamName ? `${f.eventType} — ${f.teamName}` : f.eventType);

        const time = f.stopTime ? `${f.startTime}–${f.stopTime}` : f.startTime;
        const meta = [time, f.venue].filter(Boolean).join(" · ");

        return `
          <div class="card">
            <div class="card-head">
              <span class="type ${esc(TYPE_TONE[f.eventType] || "event")}">${esc(f.eventType)}</span>
            </div>
            <p class="title">${esc(title)}</p>
            ${meta ? `<p class="meta">${esc(meta)}</p>` : ""}
            ${f.notes ? `<div class="notes">${esc(f.notes)}</div>` : ""}
            ${f.canRespond === false
                ? `<div class="not-yet">
                     <span class="not-yet-who">${esc((f.kids || []).map(k => k.firstName || k.name).join(", "))}</span>
                     Replies open nearer the time — this is here so you can plan around it.
                   </div>`
                : `<div class="kids">${(f.kids || []).map(k => this.kidHtml(f, k)).join("")}</div>`}
          </div>`;
    }

    kidHtml(fixture, kid) {
        const busyKey = `${fixture.id}:${kid.id}`;
        const busy = !!(this._data.busy && this._data.busy[busyKey]);
        const error = (this._data.errors && this._data.errors[busyKey]) || "";
        const dis = busy ? "disabled" : "";

        return `
          <div class="kid">
            <span class="kid-name">${esc(kid.name)}</span>
            <div class="answers">
              <button type="button" class="ans yes" ${dis}
                      aria-pressed="${kid.response === "Accepted"}"
                      data-fixture="${esc(fixture.id)}" data-player="${esc(kid.id)}" data-response="Accepted">
                ${busy ? "Saving…" : "Going"}
              </button>
              <button type="button" class="ans no" ${dis}
                      aria-pressed="${kid.response === "Declined"}"
                      data-fixture="${esc(fixture.id)}" data-player="${esc(kid.id)}" data-response="Declined">
                Can't make it
              </button>
            </div>
            ${error ? `<span class="kid-msg">${esc(error)}</span>` : ""}
            ${this.squadHtml(kid)}
          </div>`;
    }

    // ⚠️ ONLY EVER ABOUT THIS CHILD. The backend never sends the rest of the
    // line-up, so there is nothing here to leak - a parent whose child wasn't
    // picked simply gets nothing, with no "not selected" message and no list
    // to count themselves out of.
    //
    // A sub gets the IDENTICAL wording minus the position. The bench is not a
    // tier to hand a parent in writing.
    squadHtml(kid) {
        if (!kid || !kid.squadPublished || !kid.inSquad) return "";

        const meet = kid.meetTime
            ? `<div class="meet"><b>Meet ${esc(timeWords(kid.meetTime))}</b>${
                 kid.meetPlace ? " at " + esc(kid.meetPlace) : ""}</div>`
            : "";

        return `
          <div class="squad">
            <div class="squad-top">
              <span class="squad-tag">In the squad</span>
            </div>
            ${SHOW_PARENT_PITCH ? this.miniPitch(kid) : ""}
            ${meet}
          </div>`;
    }

    // The child's own position on a pitch, every other shirt blank. Gives a
    // kid the "I'm playing right back" moment without publishing a team sheet.
    //
    // Set SHOW_PARENT_PITCH to false at the top of this file to drop back to
    // the text-only version - the one consequence of showing it is that a
    // starter and a sub become distinguishable, which is a judgement call
    // rather than a bug.
    miniPitch(kid) {
        const rows = parseShape(kid.shape);
        const format = Number(kid.format) || 0;
        if (!rows || !format) return "";

        const sum = rows.reduce(function (a, b) { return a + b; }, 0);
        const keeper = sum === format - 1;
        if (!keeper && sum !== format) return "";

        const lines = [];
        if (keeper) lines.push(1);
        rows.forEach(function (r) { lines.push(r); });

        const firstId = [];
        let running = 0;
        lines.forEach(function (l) { firstId.push(running); running += l; });

        const mine = Number(kid.slot);
        const html = lines.slice().reverse().map(function (count, ri) {
            const base = firstId[lines.length - 1 - ri];
            let cells = "";
            for (let i = 0; i < count; i++) {
                const isMine = (base + i) === mine;
                cells += '<span class="mshirt' + (isMine ? " mine" : "") + '">' +
                         (isMine ? esc(kid.firstName || "You") : "") + "</span>";
            }
            return '<div class="mrow">' + cells + "</div>";
        }).join("");

        return '<div class="mpitch" style="grid-template-rows:repeat(' + lines.length + ',1fr)" ' +
               'role="img" aria-label="' + esc(kid.firstName || "Your child") +
               ' is playing in this position">' + html + "</div>";
    }
}

if (!customElements.get("parent-hub-fixtures")) {
    customElements.define("parent-hub-fixtures", ParentHubFixtures);
}

// =====================================================================
//  PAGE CODE CONTRACT
// =====================================================================
//  IN — {loading:true} first, then:
//    fixtures: [{
//      id, eventType, dateIso, dateLabel, startTime, stopTime,
//      homeTeam, awayTeam, venue, notes, teamName,
//      canRespond,                                 // false = too far out
//      kids: [{ id, name, firstName, response }]   // Accepted|Declined|Pending
//    }]
//    busy:   { "fixtureId:playerId": true }   // one answer in flight
//    errors: { "fixtureId:playerId": "..." }  // shown under that child
//
//  getParentFixtures() in backend/fixtures.jsw returns exactly this shape,
//  already sorted and with the audience rule applied.
//
//  OUT:
//    on("respond", e => …)     // { fixtureId, playerId, response }
//
//  Page code patches the one child's response in its held model and
//  repaints, rather than re-fetching the whole list - a parent answering
//  for one child shouldn't cost a round trip for every other fixture.
// =====================================================================
