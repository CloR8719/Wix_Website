// =====================================================================
//  <manager-hub-enquiry-add> — Manager Hub v2, take an enquiry by hand
// =====================================================================
//  SETUP:
//    1. Public -> custom-elements -> new file `managerHubEnquiryAdd.js`.
//    2. Add a new state to #stateboxMgr called `stateEnquiryAdd`.
//    3. On it: Add -> Embed Code -> Custom Element.
//       Tag name: manager-hub-enquiry-add   Element ID: #customEnquiryAdd
//    4. Height ~800px to start; it self-sizes after first paint.
//
//  ⚠️ REPUBLISH *AND* HARD-REFRESH after any change.
//
//  WHY THIS EXISTS
//  ---------------
//  A parent at the side of a pitch who says "just take my number" had no
//  route into the system. There is a `Manual Enquiry` page in main_pages,
//  but it's a native Wix page — laid out twice, outside the Hub, and not
//  linked from anywhere a manager would find it.
//
//  ⚠️ NO SMS IS SENT, BY DESIGN. The public form texts the age group's
//  managers because nobody yet knows the enquiry exists. Here the manager
//  IS that person. addManualEnquiry auto-claims the row to them, which is
//  the honest version of "I've got this one" and stops a second manager
//  ringing a family that's already been spoken to.
//
//  WHAT'S REQUIRED IS DELIBERATELY SHORT: a name, a birthday, a parent, and
//  ONE way to contact them. Position and experience are nice to have, and a
//  manager stood in a car park in the rain should not be blocked because a
//  parent doesn't know whether their child prefers left back.
//
//  THE AGE GROUP IS NOT A FIELD. It's derived from the date of birth on the
//  server, the same way the public form does it. Two ways of answering
//  "which cohort is this child in" is how one ends up invisible to the
//  manager who should see them.
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
    --critical:#C23B3B; --critical-bg:#FCEAEA;
    padding: 16px 16px 32px;
    color: var(--text);
    display: flex; flex-direction: column;
  }

  /* Gap belongs on the node whose children are the sections. */
  #body { display: flex; flex-direction: column; gap: 18px; }

  @media (max-width: 749px) {
    .wrap { padding-bottom: calc(84px + env(safe-area-inset-bottom, 0px)); }
  }

  .label {
    font-size: 10.5px; font-weight: 700; letter-spacing: .07em;
    text-transform: uppercase; color: var(--text-faint); margin-bottom: 10px;
  }
  .card {
    background: var(--surface); border: 1px solid var(--line-soft);
    border-radius: 12px; padding: 16px;
    display: flex; flex-direction: column; gap: 13px;
  }
  .intro { font-size: 12.5px; line-height: 1.6; color: var(--text-muted); margin: 0; }

  .field { display: flex; flex-direction: column; gap: 6px; }
  .field label { font-size: 12px; font-weight: 600; color: var(--text-muted); }
  .field .opt { font-weight: 500; color: var(--text-faint); }
  select, input, textarea {
    width: 100%; padding: 11px 12px; border-radius: 9px;
    border: 1.5px solid var(--line); background: var(--surface);
    font-family: inherit; font-size: 14px; color: var(--text);
  }
  select:focus, input:focus, textarea:focus {
    outline: none; border-color: var(--accent);
  }
  /* Marks the field, not just the summary — a manager scrolling back up
     needs to see WHICH box is the problem. */
  .field.bad input, .field.bad select { border-color: var(--critical); background: var(--critical-bg); }

  .two { display: grid; grid-template-columns: 1fr 1fr; gap: 11px; }
  @media (max-width: 420px) { .two { grid-template-columns: 1fr; } }

  .hint { font-size: 11.5px; color: var(--text-faint); line-height: 1.5; }

  .btns { display: flex; flex-direction: column; gap: 9px; }
  .btn {
    width: 100%; padding: 13px 15px; border-radius: 10px;
    font-family: inherit; font-size: 14px; font-weight: 700;
    cursor: pointer; border: 1.5px solid transparent;
  }
  .btn.primary { background: var(--accent); color: #fff; }
  .btn.ghost { background: transparent; color: var(--accent); border-color: var(--line); }
  .btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .btn[disabled] { opacity: .55; cursor: default; }

  .msg { font-size: 12.5px; font-weight: 600; border-radius: 9px; padding: 10px 12px; line-height: 1.5; }
  .msg.bad  { color: var(--critical); background: var(--critical-bg); }
  .msg.good { color: var(--success); background: var(--success-bg); }

  .loading, .empty {
    padding: 26px 16px; text-align: center;
    font-size: 13px; line-height: 1.6; color: var(--text-muted);
  }

  .saved { display: flex; flex-direction: column; gap: 13px; align-items: center; text-align: center; }
  .tick {
    width: 46px; height: 46px; border-radius: 50%;
    background: var(--success-bg); color: var(--success);
    display: flex; align-items: center; justify-content: center; font-size: 22px;
  }
  .saved h3 { margin: 0; font-size: 16px; }
  .saved p { margin: 0; font-size: 13px; line-height: 1.6; color: var(--text-muted); }

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

function esc(v) {
    return String(v === undefined || v === null ? "" : v)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const BLANK = {
    firstName: "", lastName: "", dob: "",
    parentsName: "", parentPhone: "", parentEmail: "",
    relationshipId: "", experienceId: "", positionId: ""
};

class ManagerHubEnquiryAdd extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._data = {};
        this._form = Object.assign({}, BLANK);
        // Which fields have been flagged. Populated only on a failed save —
        // marking boxes red before anyone has tried to submit reads as
        // telling someone off for not having typed yet.
        this._bad = {};
    }

    static get observedAttributes() { return ["data"]; }

    connectedCallback() {
        this.shadowRoot.innerHTML =
            "<style>" + STYLES + "</style><div class=\"wrap\"><div id=\"body\"></div></div>";
        this.paint();
        this.wire();

        const wrap = this.shadowRoot.querySelector(".wrap");
        if (wrap && typeof ResizeObserver !== "undefined") {
            this._ro = new ResizeObserver(() => {
                this.style.height = Math.ceil(wrap.getBoundingClientRect().height) + "px";
            });
            this._ro.observe(wrap);
        }
    }

    disconnectedCallback() { if (this._ro) this._ro.disconnect(); }

    attributeChangedCallback(_n, _o, value) {
        let parsed = {};
        try { parsed = value ? JSON.parse(value) : {}; }
        catch (err) { console.error("manager-hub-enquiry-add: bad data", err); }

        // A fresh visit clears the form. Without this, coming back to add a
        // second child shows the first child's details still typed in — and
        // the fastest way to create a wrong record is to edit half of one.
        if (parsed.reset) { this._form = Object.assign({}, BLANK); this._bad = {}; }

        this._data = parsed;
        this.paint();
    }

    wire() {
        this.shadowRoot.addEventListener("input", (ev) => {
            const t = ev.target.closest("[data-field]");
            if (!t) return;
            const f = t.getAttribute("data-field");
            this._form[f] = t.value;

            // Clear this field's flag as soon as it's touched, but DON'T
            // repaint — a repaint mid-typing pulls focus out of the box.
            if (this._bad[f]) {
                delete this._bad[f];
                const wrapEl = t.closest(".field");
                if (wrapEl) wrapEl.classList.remove("bad");
            }
        });

        this.shadowRoot.addEventListener("change", (ev) => {
            const t = ev.target.closest("[data-field]");
            if (t) this._form[t.getAttribute("data-field")] = t.value;
        });

        this.shadowRoot.addEventListener("click", (ev) => {
            const el = ev.target.closest("[data-act]");
            if (!el) return;
            const act = el.getAttribute("data-act");

            if (act === "cancel") {
                this.dispatchEvent(new CustomEvent("cancelEnquiryAdd", { detail: {} }));
                return;
            }

            if (act === "another") {
                this._form = Object.assign({}, BLANK);
                this._bad = {};
                this.dispatchEvent(new CustomEvent("resetEnquiryAdd", { detail: {} }));
                return;
            }

            if (act === "viewSquad") {
                this.dispatchEvent(new CustomEvent("openSquadEnquiries", { detail: {} }));
                return;
            }

            if (act === "save") {
                // Checked here as well as on the server so the manager gets
                // told without a round trip. The server repeats all of it —
                // this is a courtesy, not the gate.
                const f = this._form;
                const bad = {};
                if (!String(f.firstName).trim()) bad.firstName = 1;
                if (!String(f.lastName).trim()) bad.lastName = 1;
                if (!String(f.dob).trim()) bad.dob = 1;
                if (!String(f.parentsName).trim()) bad.parentsName = 1;
                if (!String(f.parentPhone).trim() && !String(f.parentEmail).trim()) {
                    bad.parentPhone = 1; bad.parentEmail = 1;
                }

                this._bad = bad;
                if (Object.keys(bad).length) {
                    this._localError = Object.keys(bad).length > 2
                        ? "Fill in the highlighted boxes."
                        : (bad.parentPhone && bad.parentEmail
                            ? "Add a phone number or an email — there has to be a way to reply."
                            : "Fill in the highlighted boxes.");
                    this.paint();
                    return;
                }

                this._localError = "";
                this.dispatchEvent(new CustomEvent("saveEnquiry", {
                    detail: { form: Object.assign({}, this._form) }
                }));
            }
        });
    }

    options(list, selected, placeholder) {
        const opts = (list || []).map(o =>
            '<option value="' + esc(o.value) + '"' +
            (o.value === selected ? " selected" : "") + ">" + esc(o.label) + "</option>");
        opts.unshift('<option value="">' + esc(placeholder) + "</option>");
        return opts.join("");
    }

    paint() {
        const body = this.shadowRoot && this.shadowRoot.getElementById("body");
        if (!body) return;

        const d = this._data || {};

        if (d.loading) {
            body.innerHTML = '<div class="loading">Loading…</div>';
            return;
        }

        if (d.saved) {
            body.innerHTML = `
              <div class="card saved">
                <div class="tick">✓</div>
                <h3>${esc(d.savedName || "Enquiry")} added</h3>
                <p>
                  ${d.savedAgeGroup ? "Filed under <b>" + esc(d.savedAgeGroup) + "</b>, worked out from their date of birth. " : ""}
                  It's claimed to you, so no other manager will ring them.
                </p>
                <div class="btns" style="width:100%">
                  <button type="button" class="btn primary" data-act="viewSquad">See it in Enquiries</button>
                  <button type="button" class="btn ghost" data-act="another">Add another</button>
                </div>
              </div>`;
            return;
        }

        if (d.error && !d.experience) {
            body.innerHTML = `<div class="empty">${esc(d.error)}</div>`;
            return;
        }

        const f = this._form;
        const busy = !!d.saving;
        const cls = k => "field" + (this._bad[k] ? " bad" : "");
        const err = this._localError || d.error || "";

        body.innerHTML = `
          <div>
            <div class="label">The child</div>
            <div class="card">
              <p class="intro">
                For a parent who'd rather just tell you. No text goes out —
                it's claimed to you the moment you save it.
              </p>

              <div class="two">
                <div class="${cls('firstName')}">
                  <label for="fn">First name</label>
                  <input id="fn" type="text" data-field="firstName"
                         autocomplete="off" value="${esc(f.firstName)}" />
                </div>
                <div class="${cls('lastName')}">
                  <label for="ln">Last name</label>
                  <input id="ln" type="text" data-field="lastName"
                         autocomplete="off" value="${esc(f.lastName)}" />
                </div>
              </div>

              <div class="${cls('dob')}">
                <label for="dob">Date of birth</label>
                <input id="dob" type="date" data-field="dob" value="${esc(f.dob)}"
                       ${d.dobMin ? 'min="' + esc(d.dobMin) + '"' : ""}
                       ${d.dobMax ? 'max="' + esc(d.dobMax) + '"' : ""} />
                <div class="hint">The age group is worked out from this.</div>
              </div>
            </div>
          </div>

          <div>
            <div class="label">Who to contact</div>
            <div class="card">
              <div class="${cls('parentsName')}">
                <label for="pn">Parent or guardian's name</label>
                <input id="pn" type="text" data-field="parentsName"
                       autocomplete="off" value="${esc(f.parentsName)}" />
              </div>

              <div class="${cls('parentPhone')}">
                <label for="pp">Phone</label>
                <input id="pp" type="tel" inputmode="tel" data-field="parentPhone"
                       autocomplete="off" value="${esc(f.parentPhone)}" />
              </div>

              <div class="${cls('parentEmail')}">
                <label for="pe">Email</label>
                <input id="pe" type="email" inputmode="email" data-field="parentEmail"
                       autocomplete="off" value="${esc(f.parentEmail)}" />
                <div class="hint">A phone number or an email — either is enough.</div>
              </div>

              <div class="field">
                <label for="rel">Relationship to the child <span class="opt">(optional)</span></label>
                <select id="rel" data-field="relationshipId">
                  ${this.options(d.relationships, f.relationshipId, "Not said")}
                </select>
              </div>
            </div>
          </div>

          <div>
            <div class="label">Football <span class="opt">— optional</span></div>
            <div class="card">
              <div class="field">
                <label for="exp">Experience</label>
                <select id="exp" data-field="experienceId">
                  ${this.options(d.experience, f.experienceId, "Not said")}
                </select>
              </div>
              <div class="field">
                <label for="pos">Preferred position</label>
                <select id="pos" data-field="positionId">
                  ${this.options(d.positions, f.positionId, "Not said")}
                </select>
              </div>
              <div class="hint">
                Leave these if the parent doesn't know — they can be filled in later.
              </div>
            </div>
          </div>

          ${err ? `<div class="msg bad">${esc(err)}</div>` : ""}

          <div class="btns">
            <button type="button" class="btn primary" data-act="save" ${busy ? "disabled" : ""}>
              ${busy ? "Saving…" : "Add enquiry"}
            </button>
            <button type="button" class="btn ghost" data-act="cancel" ${busy ? "disabled" : ""}>Cancel</button>
          </div>`;
    }
}

if (!customElements.get("manager-hub-enquiry-add")) {
    customElements.define("manager-hub-enquiry-add", ManagerHubEnquiryAdd);
}

// =====================================================================
//  CONTRACT
// =====================================================================
//  IN:  { loading: bool, reset: bool,
//         experience: [{value,label}], positions: [...], relationships: [...],
//         dobMin: "YYYY-MM-DD", dobMax: "YYYY-MM-DD",
//         saving: bool, error: "",
//         saved: bool, savedName: "", savedAgeGroup: "" }
//
//       `reset: true` clears the typed form — send it when the screen is
//       opened fresh, or the previous child's details are still sitting there.
//
//  OUT: on("saveEnquiry", e => …)      // { form: {...} }
//       on("cancelEnquiryAdd", …)
//       on("resetEnquiryAdd", …)       // "Add another" — clear `saved`
//       on("openSquadEnquiries", …)
// =====================================================================
