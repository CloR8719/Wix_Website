// =====================================================================
//  <manager-hub-fixture-form> — Manager Hub v2, add/edit a fixture
// =====================================================================
//  SETUP:
//    1. Public -> custom-elements -> new file `managerHubFixtureForm.js`.
//    2. On stateFixtureForm: Add -> Embed Code -> Custom Element.
//       Tag name: manager-hub-fixture-form   Element ID: #customFixtureForm
//    3. Height ~800px to start; it self-sizes after first paint.
//
//  ⚠️ REPUBLISH *AND* HARD-REFRESH after any change.
//
//  THIS FORM IS WHY `audience` EXISTS. Managers have been adding fixtures
//  straight into the CMS, so the column is blank on every existing row and
//  matches were counting training-only children until effectiveAudience()
//  was added to compensate. Setting it here at source turns that fallback
//  back into what it was meant to be - cover for legacy rows, not the thing
//  holding it together.
//
//  The audience choice DEFAULTS FROM THE EVENT TYPE and visibly re-defaults
//  when the type changes, unless the manager has touched it. A silent
//  default would be worse than none: they'd never learn the rule exists.
//
//  <input type="date"> and <input type="time"> on purpose. Native pickers
//  are better than anything we'd build, they're already localised, and on a
//  phone they open the OS wheel a manager already knows.
// =====================================================================

const EVENT_TYPES = ["Match", "Training", "Tournament", "Event"];

// Mirrors defaultAudience() in backend/fixtures.jsw. Duplicated because a
// custom element can't import backend code - if one changes, change both.
function defaultAudience(eventType) {
    return (eventType === "Match" || eventType === "Tournament") ? "Playing Only" : "All";
}

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

  .seg { display: flex; gap: 4px; padding: 3px; background: var(--neutral-bg); border-radius: 11px; }
  .seg button {
    flex: 1; padding: 9px 4px; border-radius: 9px; border: none; cursor: pointer;
    font-family: inherit; font-size: 12.5px; font-weight: 700;
    color: var(--text-muted); background: transparent;
  }
  .seg button[aria-pressed="true"] {
    background: var(--surface); color: var(--accent);
    box-shadow: 0 1px 2px rgba(16,33,47,.08);
  }
  .seg button:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }

  .field label {
    display: block; font-size: 11.5px; font-weight: 600;
    color: var(--text-muted); margin-bottom: 5px;
  }
  .field input, .field textarea {
    width: 100%; font-family: inherit; font-size: 14px;
    padding: 11px 12px; border: 1px solid var(--line); border-radius: 10px;
    background: var(--surface); color: var(--text);
  }
  .field textarea { resize: vertical; min-height: 74px; line-height: 1.55; }
  .field input:focus, .field textarea:focus {
    outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft);
  }
  .field.bad input, .field.bad textarea { border-color: var(--critical); }
  /* ⚠️ min-width:0 IS THE WHOLE FIX. A grid item defaults to min-width:auto,
     meaning it refuses to shrink below its content's intrinsic size - and a
     native <input type="date"> or type="time" has a wide intrinsic minimum
     because of the picker UI. So the columns pushed past the container and the
     second one landed outside the element entirely. */
  .two { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .two > * { min-width: 0; }
  .field input { max-width: 100%; }

  /* Under this a date and a time still will not sit together, whatever the
     min-width says - the native pickers have a floor. */
  /* ⚠️ 749px, NOT a narrower guess. A native picker next to another field
     fits in theory and overflows in practice - the intrinsic minimum differs
     per browser, so any threshold picked to "just fit" is wrong on something.
     One field per row on every phone. 749px is the project's mobile
     breakpoint everywhere else. */
  @media (max-width: 749px) {
    .two { grid-template-columns: 1fr; }
  }

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

  .hint {
    margin-top: 8px; font-size: 11.5px; color: var(--info);
    background: var(--info-bg); padding: 9px 11px; border-radius: 9px; line-height: 1.5;
  }

  .btn {
    font-family: inherit; font-size: 13.5px; font-weight: 700;
    padding: 12px 16px; border-radius: 10px; cursor: pointer;
    border: 1.5px solid transparent; width: 100%;
  }
  .btn.primary { background: var(--accent); color: #fff; }
  .btn.ghost { background: transparent; color: var(--text-muted); border-color: var(--line); }
  .btn.danger { background: transparent; color: var(--critical); border-color: var(--critical); }
  .btn[disabled] { opacity: .55; cursor: default; }
  .btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .actions { display: flex; flex-direction: column; gap: 9px; margin-top: 4px; }

  .err {
    padding: 12px 14px; border-radius: 10px; line-height: 1.55;
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
  }

  @media (max-width: 749px) {
    .wrap { padding-bottom: calc(84px + env(safe-area-inset-bottom, 0px)); }
  }

  /* ⚠️ NATIVE DATE/TIME INPUTS OVERFLOW THEIR CONTAINER without this.
     min-width BEATS width:100%, and browsers give these a wide intrinsic
     minimum from the picker chrome - so the field runs outside the state
     box on a phone while looking fine on desktop. appearance:none drops
     the native chrome that was adding the width in the first place.
     Same fix as parentHubHome.js, proven live since 2026-08-16. */
  input[type="date"], input[type="time"] {
    -webkit-appearance: none; appearance: none;
    min-width: 0; max-width: 100%; width: 100%;
    /* Inline-block by default, which leaves a baseline gap underneath. */
    display: block;
  }
  input[type="date"]::-webkit-date-and-time-value,
  input[type="time"]::-webkit-date-and-time-value {
    text-align: left; margin: 0;
  }
  input[type="date"]::-webkit-calendar-picker-indicator,
  input[type="time"]::-webkit-calendar-picker-indicator {
    margin-left: 0; margin-right: 0;
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

class ManagerHubFixtureForm extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._built = false;
        this._data = {};
        this._resizeObserver = null;
        this._lastHeight = 0;

        this._form = this.blank();
        // Once the manager picks an audience themselves, changing the event
        // type stops overriding it. Without this a deliberate choice would be
        // silently undone by a later edit to a different field.
        this._audienceTouched = false;
        this._confirmDelete = false;
    }

    blank() {
        return {
            eventType: "Match", date: "", startTime: "", stopTime: "",
            homeTeam: "", awayTeam: "", venue: "", notes: "",
            audience: defaultAudience("Match")
        };
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

            // A `fixture` means edit; its absence means a fresh add. Only
            // reseeded when the identity changes, so a repaint mid-typing
            // (an error message arriving, say) doesn't wipe the form.
            const incoming = parsed.fixture || null;
            const incomingId = incoming ? incoming.id : "__new__";
            if (this._seededFor !== incomingId) {
                this._seededFor = incomingId;
                this._confirmDelete = false;
                if (incoming) {
                    this._form = {
                        eventType: incoming.eventType || "Match",
                        date: incoming.dateIso || "",
                        startTime: incoming.startTime || "",
                        stopTime: incoming.stopTime || "",
                        homeTeam: incoming.homeTeam || "",
                        awayTeam: incoming.awayTeam || "",
                        venue: incoming.venue || "",
                        notes: incoming.notes || "",
                        audience: incoming.audience || defaultAudience(incoming.eventType || "Match")
                    };
                    // An existing row that has audience explicitly set counts
                    // as a deliberate choice already made.
                    this._audienceTouched = !!incoming.audienceSet;
                } else {
                    this._form = this.blank();
                    this._audienceTouched = false;
                }
            }
            this.paint();
        } catch (err) {
            console.error("manager-hub-fixture-form: couldn't parse data attribute", err);
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

            if (act === "type") {
                this._form.eventType = el.getAttribute("data-val");
                if (!this._audienceTouched) {
                    this._form.audience = defaultAudience(this._form.eventType);
                }
                this.paint();
                return;
            }
            if (act === "audience") {
                this._form.audience = el.getAttribute("data-val");
                this._audienceTouched = true;
                this.paint();
                return;
            }
            if (act === "save") { this.submit(); return; }
            if (act === "delete") {
                if (!this._confirmDelete) { this._confirmDelete = true; this.paint(); return; }
                this.dispatchEvent(new CustomEvent("deleteFixture", {
                    detail: { fixtureId: this._data.fixture ? this._data.fixture.id : "" }
                }));
                return;
            }
            if (act === "cancelDelete") { this._confirmDelete = false; this.paint(); return; }
            if (act === "cancel") { this.dispatchEvent(new CustomEvent("cancelForm", { detail: {} })); return; }
        });

        // Kept in the model on every keystroke so a repaint never loses what's
        // been typed - the form is long enough that losing it would matter.
        body.addEventListener("input", (event) => {
            const f = event.target.getAttribute("data-field");
            if (f) this._form[f] = event.target.value;
        });

        this.paint();
    }

    submit() {
        this.dispatchEvent(new CustomEvent("saveFixture", {
            detail: {
                fixtureId: this._data.fixture ? this._data.fixture.id : "",
                form: Object.assign({}, this._form)
            }
        }));
    }

    paint() {
        const d = this._data;
        const f = this._form;
        const editing = !!d.fixture;
        const isMatch = f.eventType === "Match" || f.eventType === "Tournament";
        const bad = d.badField || "";

        this.shadowRoot.getElementById("body").innerHTML = `
          ${d.error ? `<div class="err">${esc(d.error)}</div>` : ""}

          <div class="field">
            <label>What kind of event?</label>
            <div class="seg">
              ${EVENT_TYPES.map(t => `
                <button type="button" data-act="type" data-val="${t}"
                        aria-pressed="${f.eventType === t}">${t}</button>`).join("")}
            </div>
          </div>

          <div class="two">
            <div class="field ${bad === "date" ? "bad" : ""}">
              <label for="fDate">Date</label>
              <input id="fDate" type="date" data-field="date" value="${esc(f.date)}" />
            </div>
            <div class="field ${bad === "startTime" ? "bad" : ""}">
              <label for="fStart">${isMatch ? "Kick off" : "Starts"}</label>
              <input id="fStart" type="time" data-field="startTime" value="${esc(f.startTime)}" />
            </div>
          </div>

          <div class="field">
            <label for="fStop">Finishes <span style="font-weight:400;color:var(--text-faint)">(optional)</span></label>
            <input id="fStop" type="time" data-field="stopTime" value="${esc(f.stopTime)}" />
          </div>

          ${isMatch ? `
            <div class="two">
              <div class="field">
                <label for="fHome">Home team</label>
                <input id="fHome" type="text" data-field="homeTeam" value="${esc(f.homeTeam)}" placeholder="Us" />
              </div>
              <div class="field">
                <label for="fAway">Away team</label>
                <input id="fAway" type="text" data-field="awayTeam" value="${esc(f.awayTeam)}" placeholder="Them" />
              </div>
            </div>` : ""}

          <div class="field">
            <label for="fVenue">Where</label>
            <input id="fVenue" type="text" data-field="venue" value="${esc(f.venue)}"
                   placeholder="Signol Park, Pitch 2" />
          </div>

          <div class="field">
            <label for="fNotes">Anything parents should know <span style="font-weight:400;color:var(--text-faint)">(optional)</span></label>
            <textarea id="fNotes" data-field="notes" rows="3"
                      placeholder="Bring boots and shin pads">${esc(f.notes)}</textarea>
          </div>

          <div>
            <div class="label">Who's this for?</div>
            <button type="button" class="radio" data-act="audience" data-val="Playing Only"
                    aria-pressed="${f.audience === "Playing Only"}">
              <span class="dot"></span>
              <span><b>Playing squad only</b>
                <span>Training-only players won't see it or be counted</span></span>
            </button>
            <button type="button" class="radio" data-act="audience" data-val="All"
                    aria-pressed="${f.audience === "All"}">
              <span class="dot"></span>
              <span><b>Everyone</b>
                <span>Including training-only players</span></span>
            </button>
            ${!this._audienceTouched
                ? `<div class="hint">Set automatically for a ${esc(f.eventType.toLowerCase())} — change it if that's not right.</div>`
                : ""}
          </div>

          <div class="actions">
            <button type="button" class="btn primary" data-act="save" ${d.saving ? "disabled" : ""}>
              ${d.saving ? "Saving…" : (editing ? "Save changes" : "Publish to parents")}
            </button>
            <button type="button" class="btn ghost" data-act="cancel">Cancel</button>
            ${editing ? `
              <button type="button" class="btn danger" data-act="${this._confirmDelete ? "delete" : "delete"}">
                ${this._confirmDelete ? "Yes, delete this fixture" : "Delete fixture"}
              </button>
              ${this._confirmDelete
                  ? `<button type="button" class="btn ghost" data-act="cancelDelete">Keep it</button>`
                  : ""}` : ""}
          </div>`;
    }
}

if (!customElements.get("manager-hub-fixture-form")) {
    customElements.define("manager-hub-fixture-form", ManagerHubFixtureForm);
}

// =====================================================================
//  PAGE CODE CONTRACT
// =====================================================================
//  IN:
//    { fixture: null }              // add mode
//    { fixture: {…row from getTeamFixtures…} }   // edit mode
//    plus { saving: bool, error: "", badField: "date"|"startTime" }
//
//  The form is only reseeded when the fixture identity changes, so pushing
//  an error mid-edit won't wipe what's been typed.
//
//  OUT:
//    on("saveFixture",   e => …)  // { fixtureId, form }
//    on("deleteFixture", e => …)  // { fixtureId } - already confirmed
//    on("cancelForm",    () => …)
// =====================================================================
