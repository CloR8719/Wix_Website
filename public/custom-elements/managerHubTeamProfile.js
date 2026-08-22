// =====================================================================
//  <manager-hub-team-profile> — Manager Hub v2, team profile
// =====================================================================
//  SETUP:
//    1. Public -> custom-elements -> new file `managerHubTeamProfile.js`.
//    2. On stateTeamProfile: Add -> Embed Code -> Custom Element.
//       Tag name: manager-hub-team-profile   Element ID: #customTeamProfile
//    3. Height ~900px to start; it self-sizes after first paint.
//
//  ⚠️ REPUBLISH *AND* HARD-REFRESH after any change.
//
//  ⚠️ THIS IS PUBLISHING, NOT NOTE-KEEPING. Everything on this screen feeds
//  the team's DYNAMIC PUBLIC PAGE on the club website. That's why it's gated
//  on the `editTeam` permission and why the save button says what it does.
//  A manager should never be surprised that something they typed here is now
//  on the internet.
//
//  ⚠️ NO WIX UPLOAD BUTTON. Custom elements are isolated from $w, so the
//  team photo goes: <input type="file"> -> FileReader -> canvas downscale ->
//  base64 -> backend. The downscale isn't optional - a modern phone photo is
//  4-8MB and would be refused, and nothing on a web page needs 4000px.
//
//  T_trainingDay is NEW and lives here because it's team information a
//  manager owns. The recruitment poster reads it, which is what it's for -
//  "Training Wednesdays, 6pm" on a poster shouldn't be typed twice.
// =====================================================================

// 1600px wide is plenty for a full-bleed header image on the website and
// brings a phone photo down to a few hundred KB.
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.85;

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

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
    display: flex; flex-direction: column; gap: 16px;
  }

  /* ⚠️ THE GAP HAS TO BE HERE, NOT ON .wrap. Every section is rendered into
     #body, so #body is .wrap's only child - a gap on .wrap has nothing to
     separate. Without this the sections stack with zero space and each
     heading sits directly on the card above it. Same bug as Parent Hub's
     .wrap/#detail gap. */
  #body { display: flex; flex-direction: column; gap: 18px; }

  .note {
    font-size: 12px; line-height: 1.55; padding: 11px 13px; border-radius: 10px;
    background: var(--info-bg); color: var(--info);
  }

  .label {
    font-size: 10.5px; font-weight: 700; letter-spacing: .07em;
    text-transform: uppercase; color: var(--text-faint); margin-bottom: 14px;
  }

  .field { margin-bottom: 12px; }
  .field label {
    display: block; font-size: 11.5px; font-weight: 600;
    color: var(--text-muted); margin-bottom: 5px;
  }
  .field input, .field textarea, .field select {
    width: 100%; font-family: inherit; font-size: 14px;
    padding: 11px 12px; border: 1px solid var(--line); border-radius: 10px;
    background: var(--surface); color: var(--text);
  }
  .field textarea { resize: vertical; min-height: 96px; line-height: 1.6; }
  .field input:focus, .field textarea:focus, .field select:focus {
    outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft);
  }
  /* Same grid trap as the fixture form: a native time input will not shrink
     below its intrinsic width unless the track is told it may. */
  .two { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .two > * { min-width: 0; }
  .field input, .field select, .field textarea { max-width: 100%; }

  /* ⚠️ 749px, NOT a narrower guess. A native picker next to another field
     fits in theory and overflows in practice - the intrinsic minimum differs
     per browser, so any threshold picked to "just fit" is wrong on something.
     One field per row on every phone. 749px is the project's mobile
     breakpoint everywhere else. */
  @media (max-width: 749px) {
    .two { grid-template-columns: 1fr; }
  }

  .card {
    background: var(--surface); border: 1px solid var(--line-soft);
    border-radius: 12px; padding: 15px;
  }

  .photo { display: flex; gap: 13px; align-items: flex-start; }
  .photo img {
    width: 108px; height: 76px; object-fit: cover; border-radius: 9px;
    background: var(--neutral-bg); flex-shrink: 0;
  }
  .photo .none {
    width: 108px; height: 76px; border-radius: 9px; flex-shrink: 0;
    background: var(--neutral-bg); color: var(--text-faint);
    display: flex; align-items: center; justify-content: center; font-size: 11px;
  }
  .photo .side { flex: 1; min-width: 0; }
  .photo p { margin: 0 0 8px; font-size: 11.5px; color: var(--text-faint); line-height: 1.5; }
  /* Hidden rather than restyled - see managerHubStaff.js for why. */
  input[type="file"] {
    position: absolute; width: 1px; height: 1px;
    opacity: 0; overflow: hidden; white-space: nowrap;
  }
  /* ⚠️ inline-block ALONE ISN'T ENOUGH. If an ancestor is ever a flex or grid
     container, the label becomes an item and gets stretched by the default
     align-items:stretch - at which point the text sits at the left of a
     full-width box instead of centred in a snug one. align-self and an
     explicit text-align make it independent of what its parent turns out to
     be. Same reason the Home buttons got explicit centring. */
  .filebtn {
    display: inline-flex; align-items: center; justify-content: center;
    align-self: flex-start; width: auto;
    margin-top: 9px;
    padding: 8px 13px; border-radius: 9px; cursor: pointer;
    font-size: 12.5px; font-weight: 700; text-align: center;
    border: 1.5px solid var(--line); color: var(--accent); background: transparent;
  }
  .filebtn:hover { border-color: var(--accent); }
  input[type="file"]:focus-visible + .filebtn { outline: 2px solid var(--accent); outline-offset: 2px; }
  .photo .side p { overflow-wrap: anywhere; word-break: break-word; }

  .chips { display: flex; flex-wrap: wrap; gap: 7px; }
  .chip {
    font-family: inherit; font-size: 12px; font-weight: 600; cursor: pointer;
    padding: 8px 12px; border-radius: 999px;
    border: 1.5px solid var(--line); background: transparent; color: var(--text-muted);
  }
  .chip[aria-pressed="true"] { border-color: var(--accent); background: var(--accent-soft); color: var(--accent); }
  .chip:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

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

// Wix TIME columns come back as "19:00:00.000", not "19:00".
//
// ⚠️ THIS IS A DATA-LOSS BUG, not a cosmetic one. <input type="time"> requires
// exactly HH:MM - given the raw value it renders BLANK, so a manager opening
// this screen sees no training time, and saving without touching the field
// writes an empty string back and wipes it from the CMS.
function toTimeInput(raw) {
    const t = String(raw || "").trim();
    if (!t) return "";
    const m = t.match(/^([0-9]{1,2}):([0-9]{2})/);
    if (!m) return "";
    const h = m[1].length === 1 ? "0" + m[1] : m[1];
    return h + ":" + m[2];
}

function esc(value) {
    return String(value == null ? "" : value)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;")
        .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Shared by every image field in the Manager Hub. Reads the file, draws it
// onto a canvas no bigger than MAX_DIMENSION, and hands back base64 JPEG.
// Resolves to null on any failure rather than throwing - a photo that won't
// process shouldn't take the whole save down with it.
function downscaleToBase64(file, maxDim, quality) {
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
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, width, height);

                const dataUrl = canvas.toDataURL("image/jpeg", quality);
                resolve({
                    base64: dataUrl.split(",")[1] || "",
                    preview: dataUrl,
                    name: (file.name || "photo.jpg").replace(/\.[^.]+$/, "") + ".jpg",
                    type: "image/jpeg"
                });
            };
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
    });
}

class ManagerHubTeamProfile extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._built = false;
        this._data = { loading: true };
        this._resizeObserver = null;
        this._lastHeight = 0;
        this._form = null;
        this._photo = null;      // pending upload, if one was picked
        this._seededFor = null;
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

            // Only reseed when a different team arrives, so an error or a
            // "saved" message landing mid-edit doesn't wipe the form.
            if (parsed.id && this._seededFor !== parsed.id) {
                this._seededFor = parsed.id;
                this._photo = null;
                this._form = {
                    intro: parsed.intro || "",
                    achievements: parsed.achievements || "",
                    league: parsed.league || "",
                    trainingDay: parsed.trainingDay || "",
                    trainingTime: toTimeInput(parsed.trainingTime),
                    trainingPitch: parsed.trainingPitch || "",
                    trainingLocation: parsed.trainingLocation || "",
                    sponsorIds: Array.isArray(parsed.sponsorIds) ? parsed.sponsorIds.slice() : []
                };
            }
            if (parsed.saved) this._photo = null;
            this.paint();
        } catch (err) {
            console.error("manager-hub-team-profile: couldn't parse data attribute", err);
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

            if (act === "day") {
                const val = el.getAttribute("data-val");
                // Tapping the selected day clears it - some squads don't have
                // a fixed night and shouldn't be forced to claim one.
                this._form.trainingDay = (this._form.trainingDay === val) ? "" : val;
                this.paint();
                return;
            }
            if (act === "sponsor") {
                const id = el.getAttribute("data-val");
                const i = this._form.sponsorIds.indexOf(id);
                if (i === -1) this._form.sponsorIds.push(id); else this._form.sponsorIds.splice(i, 1);
                this.paint();
                return;
            }
            if (act === "save") { this.save(); return; }
            if (act === "cancel") {
                this.dispatchEvent(new CustomEvent("cancelTeamProfile", { detail: {} }));
                return;
            }
        });

        body.addEventListener("input", (event) => {
            const f = event.target.getAttribute("data-field");
            if (f && this._form) this._form[f] = event.target.value;
        });

        body.addEventListener("change", async (event) => {
            if (event.target.id === "photoFile") {
                const file = event.target.files && event.target.files[0];
                const result = await downscaleToBase64(file, MAX_DIMENSION, JPEG_QUALITY);
                if (!result) {
                    this.dispatchEvent(new CustomEvent("photoError", {
                        detail: { message: "That image couldn't be read — try a different one." }
                    }));
                    return;
                }
                this._photo = result;
                this.paint();
                return;
            }
            const f = event.target.getAttribute("data-field");
            if (f && this._form) this._form[f] = event.target.value;
        });

        this.paint();
    }

    save() {
        if (!this._form) return;
        const payload = Object.assign({}, this._form);
        if (this._photo) {
            payload.photoBase64 = this._photo.base64;
            payload.photoName = this._photo.name;
            payload.photoType = this._photo.type;
        }
        this.dispatchEvent(new CustomEvent("saveTeamProfile", { detail: payload }));
    }

    paint() {
        const d = this._data;
        const body = this.shadowRoot.getElementById("body");

        if (d.loading) { body.innerHTML = `<div class="loading">Loading…</div>`; return; }
        if (d.fatal) { body.innerHTML = `<div class="err">${esc(d.fatal)}</div>`; return; }
        if (!this._form) { body.innerHTML = `<div class="loading">Loading…</div>`; return; }

        const f = this._form;
        const preview = this._photo ? this._photo.preview : (d.photo || "");
        const sponsors = Array.isArray(d.sponsorOptions) ? d.sponsorOptions : [];

        body.innerHTML = `
          ${d.saved ? `<div class="ok">${esc(d.saved)}</div>` : ""}
          ${d.error ? `<div class="err">${esc(d.error)}</div>` : ""}

          <div class="note">
            Everything here shows on <b>${esc(d.teamName || "your team")}</b>'s page on the club website.
          </div>

          <div>
            <div class="label">Team photo</div>
            <div class="card">
              <div class="photo">
                ${preview
                    ? `<img src="${esc(preview)}" alt="Team photo" />`
                    : `<div class="none">No photo</div>`}
                <div class="side">
                  <p>Landscape works best. Large photos are shrunk automatically.</p>
                  <input type="file" id="photoFile" accept="image/*" />
                  <label class="filebtn" for="photoFile">Change photo</label>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div class="label">About the team</div>
            <div class="card">
              <div class="field">
                <label for="fIntro">Introduction</label>
                <textarea id="fIntro" data-field="intro" rows="4"
                          placeholder="Who the squad is and what they're about">${esc(f.intro)}</textarea>
              </div>
              <div class="field">
                <label for="fAch">Achievements</label>
                <textarea id="fAch" data-field="achievements" rows="3"
                          placeholder="Cups, league finishes, anything worth shouting about">${esc(f.achievements)}</textarea>
              </div>
              <div class="field" style="margin-bottom:0">
                <label for="fLeague">League / division</label>
                <input id="fLeague" type="text" data-field="league" value="${esc(f.league)}" />
              </div>
            </div>
          </div>

          <div>
            <div class="label">Training</div>
            <div class="card">
              <div class="field">
                <label>Which night?</label>
                <div class="chips">
                  ${DAYS.map(day => `
                    <button type="button" class="chip" data-act="day" data-val="${day}"
                            aria-pressed="${f.trainingDay === day}">${day.slice(0, 3)}</button>`).join("")}
                </div>
              </div>
              <div class="two">
                <div class="field">
                  <label for="fTime">Start time</label>
                  <input id="fTime" type="time" data-field="trainingTime" value="${esc(f.trainingTime)}" />
                </div>
                <div class="field">
                  <label for="fPitch">Pitch</label>
                  <input id="fPitch" type="text" data-field="trainingPitch" value="${esc(f.trainingPitch)}" />
                </div>
              </div>
              <div class="field" style="margin-bottom:0">
                <label for="fLoc">Where</label>
                <input id="fLoc" type="text" data-field="trainingLocation" value="${esc(f.trainingLocation)}" />
              </div>
            </div>
          </div>

          ${sponsors.length ? `
            <div>
              <div class="label">Sponsors on this team</div>
              <div class="card">
                <div class="chips">
                  ${sponsors.map(s => `
                    <button type="button" class="chip" data-act="sponsor" data-val="${esc(s.value)}"
                            aria-pressed="${f.sponsorIds.indexOf(s.value) !== -1}">${esc(s.label)}</button>`).join("")}
                </div>
              </div>
            </div>` : ""}

          <div class="actions">
            <button type="button" class="btn primary" data-act="save" ${d.saving ? "disabled" : ""}>
              ${d.saving ? "Saving…" : "Save and publish to the website"}
            </button>
            <button type="button" class="btn ghost" data-act="cancel">Cancel</button>
          </div>`;
    }
}

if (!customElements.get("manager-hub-team-profile")) {
    customElements.define("manager-hub-team-profile", ManagerHubTeamProfile);
}

// =====================================================================
//  PAGE CODE CONTRACT
// =====================================================================
//  IN — {loading:true} first, then getTeamProfile()'s payload plus:
//    { saving: bool, error: "", saved: "Saved ✓", fatal: "" }
//
//  OUT:
//    on("saveTeamProfile", e => …)
//        // { intro, achievements, league, trainingDay, trainingTime,
//        //   trainingPitch, trainingLocation, sponsorIds,
//        //   photoBase64?, photoName?, photoType? }
//    on("cancelTeamProfile", () => …)
//    on("photoError", e => …)   // { message } - show it, nothing else needed
//
//  photoBase64 is only present when a new photo was picked; leaving it out
//  keeps the existing one. Set `saved` on success so the pending photo
//  clears.
// =====================================================================
