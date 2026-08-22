// =====================================================================
//  <manager-hub-sponsors> — Manager Hub v2, sponsors
// =====================================================================
//  The sponsors attached to this manager's squads, and a form to add one.
//
//  SETUP:
//    1. Public -> custom-elements -> new file `managerHubSponsors.js`.
//    2. On stateSponsors: Add -> Embed Code -> Custom Element.
//       Tag name: manager-hub-sponsors   Element ID: #customSponsors
//    3. Height ~750px to start; it self-sizes after first paint.
//
//  ⚠️ REPUBLISH *AND* HARD-REFRESH after any change.
//
//  ADD IS BEHIND A BUTTON, not always on screen. A manager comes here to
//  check a sponsor far more often than to add one, and a permanently open
//  form makes the list look like an afterthought.
//
//  A NEW SPONSOR IS ATTACHED TO THE CHOSEN TEAM IMMEDIATELY. Sponsors are
//  club-wide records but this screen lists them by team association - add one
//  without attaching it and it would vanish the moment it saved, which looks
//  exactly like a failure.
//
//  The URL is normalised backend-side: a bare "example.com" in an href
//  resolves relative to the site and 404s.
// =====================================================================

const MAX_DIMENSION = 800;
const JPEG_QUALITY = 0.9;

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

  .label {
    font-size: 10.5px; font-weight: 700; letter-spacing: .07em;
    text-transform: uppercase; color: var(--text-faint); margin-bottom: 14px;
  }

  .card {
    background: var(--surface); border: 1px solid var(--line-soft);
    border-radius: 12px; padding: 14px 15px;
  }
  .card + .card { margin-top: 9px; }

  .srow { display: flex; gap: 13px; align-items: center; }
  .srow img, .srow .none {
    width: 56px; height: 56px; border-radius: 10px; flex-shrink: 0;
    object-fit: contain; background: var(--neutral-bg); padding: 5px;
  }
  .srow .none {
    display: flex; align-items: center; justify-content: center;
    color: var(--text-faint); font-size: 10px; padding: 0; text-align: center;
  }
  .srow .side { flex: 1; min-width: 0; }
  .srow b { display: block; font-size: 14px; font-weight: 700; }
  .srow a { font-size: 12px; color: var(--info); text-decoration: none; overflow-wrap: anywhere; }
  .srow a:hover { text-decoration: underline; }
  .blurb { font-size: 12px; color: var(--text-muted); line-height: 1.55; margin-top: 8px; }

  .field { margin-bottom: 12px; }
  .field:last-child { margin-bottom: 0; }
  .field label {
    display: block; font-size: 11.5px; font-weight: 600;
    color: var(--text-muted); margin-bottom: 5px;
  }
  .field input, .field textarea, .field select {
    width: 100%; font-family: inherit; font-size: 14px;
    padding: 11px 12px; border: 1px solid var(--line); border-radius: 10px;
    background: var(--surface); color: var(--text);
  }
  .field textarea { resize: vertical; min-height: 84px; line-height: 1.6; }
  .field input:focus, .field textarea:focus, .field select:focus {
    outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft);
  }
  .field.bad input { border-color: var(--critical); }
  input[type="file"] { font-size: 12px; color: var(--text-muted); width: 100%; }
  .logopick { display: flex; gap: 12px; align-items: center; }
  .logopick img { width: 56px; height: 56px; object-fit: contain; border-radius: 9px; background: var(--neutral-bg); padding: 5px; }

  .btn {
    font-family: inherit; font-size: 13.5px; font-weight: 700;
    padding: 12px 16px; border-radius: 10px; cursor: pointer;
    border: 1.5px solid transparent; width: 100%;
  }
  .btn.primary { background: var(--accent); color: #fff; }
  .btn.danger { background: transparent; color: var(--critical); border-color: var(--critical); }
  .btn.small { width: auto; font-size: 12.5px; padding: 9px 13px; }
  .rowbtns { display: flex; gap: 7px; flex-wrap: wrap; margin-top: 11px; }
  .confirm {
    margin-top: 11px; padding: 11px 13px; border-radius: 10px;
    background: var(--critical-bg); color: var(--critical);
    font-size: 12px; line-height: 1.55;
  }
  .confirm b { font-weight: 700; }
  /* Only shown when another squad uses the same sponsor - the one thing a
     manager can't otherwise know before deleting club-wide. */
  .alsoused {
    margin-top: 8px; padding-top: 8px; border-top: 1px solid currentColor;
    opacity: .9;
  }
  .hint { font-size: 11.5px; color: var(--text-faint); line-height: 1.55; margin: 9px 0 0; }

  .seg { display: flex; gap: 4px; padding: 3px; background: var(--neutral-bg); border-radius: 11px; margin-bottom: 13px; }
  .seg button {
    flex: 1; padding: 9px 4px; border-radius: 9px; border: none; cursor: pointer;
    font-family: inherit; font-size: 12px; font-weight: 700;
    color: var(--text-muted); background: transparent;
  }
  .seg button[aria-pressed="true"] {
    background: var(--surface); color: var(--accent);
    box-shadow: 0 1px 2px rgba(16,33,47,.08);
  }
  .seg button:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }

  .picklist { display: flex; flex-direction: column; gap: 8px; }
  .pick {
    display: flex; align-items: center; gap: 12px;
    padding: 11px 13px; border-radius: 11px;
    background: var(--surface); border: 1px solid var(--line-soft);
  }
  .pick img, .pick .none {
    width: 44px; height: 44px; border-radius: 9px; flex-shrink: 0;
    object-fit: contain; background: var(--neutral-bg); padding: 4px;
  }
  .pick .none {
    display: flex; align-items: center; justify-content: center;
    color: var(--text-faint); font-size: 9px; padding: 0; text-align: center;
  }
  .pick .side { flex: 1; min-width: 0; }
  .pick .side b { font-size: 13.5px; font-weight: 700; }
  .btn.ghost { background: transparent; color: var(--text-muted); border-color: var(--line); }
  .btn[disabled] { opacity: .55; cursor: default; }
  .btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .actions { display: flex; flex-direction: column; gap: 9px; margin-top: 13px; }

  .empty {
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
  .loading { padding: 40px 18px; text-align: center; font-size: 13px; color: var(--text-muted); }

  @media (prefers-color-scheme: dark) {
    .wrap {
      --accent:#A9B6C4; --accent-soft:#1B222B;
      --surface:#0E1826; --raised:#121F30;
      --line:#223145; --line-soft:#1A2739;
      --text:#E7ECF2; --text-muted:#A6B4C3; --text-faint:#71818F;
      --success:#5FD08B; --success-bg:#103322;
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
                canvas.getContext("2d").drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL("image/jpeg", quality);
                resolve({
                    base64: dataUrl.split(",")[1] || "",
                    preview: dataUrl,
                    name: (file.name || "logo.jpg").replace(/\.[^.]+$/, "") + ".jpg",
                    type: "image/jpeg"
                });
            };
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
    });
}

class ManagerHubSponsors extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._built = false;
        this._data = { loading: true };
        this._resizeObserver = null;
        this._lastHeight = 0;
        this._adding = false;
        // Which sponsor is mid-confirm. Removing one is not destructive to the
        // sponsor record, but it does take them off the website, so it gets a
        // second tap rather than happening on the first.
        this._confirmRemove = "";
        // "existing" or "new". Defaults to existing when there's anything on
        // the club list to pick, because re-using is the common case and
        // retyping a sponsor creates a duplicate record.
        this._addMode = "existing";
        this._form = { name: "", url: "", blurb: "", teamId: "" };
        this._logo = null;
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
            // Added successfully - close the form and clear it, so a second
            // tap on a stale screen can't add the same sponsor twice.
            if (parsed.removed) this._confirmRemove = "";
            if (parsed.added) {
                this._adding = false;
                this._addMode = "existing";
        // Which sponsor is mid-confirm. Removing one is not destructive to the
        // sponsor record, but it does take them off the website, so it gets a
        // second tap rather than happening on the first.
        this._confirmRemove = "";
        // "existing" or "new". Defaults to existing when there's anything on
        // the club list to pick, because re-using is the common case and
        // retyping a sponsor creates a duplicate record.
        this._addMode = "existing";
                this._form = { name: "", url: "", blurb: "", teamId: this._form.teamId };
                this._logo = null;
            }
            // Default the team to the first one, so a single-team manager
            // never has to make a choice they don't have.
            if (!this._form.teamId && Array.isArray(parsed.teams) && parsed.teams.length) {
                this._form.teamId = parsed.teams[0].id;
            }
            this.paint();
        } catch (err) {
            console.error("manager-hub-sponsors: couldn't parse data attribute", err);
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

            if (act === "openAdd") {
                this._adding = true;
                this._confirmRemove = "";
                const any = ((this._data && this._data.available) || []).length > 0;
                this._addMode = any ? "existing" : "new";
                this.paint();
                return;
            }
            if (act === "addMode") { this._addMode = el.getAttribute("data-val"); this.paint(); return; }
            if (act === "attach") {
                this.dispatchEvent(new CustomEvent("attachSponsor", {
                    detail: { sponsorId: el.getAttribute("data-id") }
                }));
                return;
            }

            // First tap only opens the choice - it never removes anything.
            // The two outcomes are genuinely different (one is reversible by
            // re-adding, the other destroys a club record), so they get
            // separate buttons rather than one button and a mode.
            if (act === "remove") {
                this._confirmRemove = el.getAttribute("data-id");
                this.paint();
                return;
            }
            if (act === "cancelRemove") { this._confirmRemove = ""; this.paint(); return; }

            if (act === "removeTeam") {
                const id = el.getAttribute("data-id");
                this._confirmRemove = "";
        // "existing" or "new". Defaults to existing when there's anything on
        // the club list to pick, because re-using is the common case and
        // retyping a sponsor creates a duplicate record.
        this._addMode = "existing";
                this.dispatchEvent(new CustomEvent("removeSponsor", { detail: { sponsorId: id } }));
                return;
            }
            if (act === "removeClub") {
                const id = el.getAttribute("data-id");
                this._confirmRemove = "";
        // "existing" or "new". Defaults to existing when there's anything on
        // the club list to pick, because re-using is the common case and
        // retyping a sponsor creates a duplicate record.
        this._addMode = "existing";
                this.dispatchEvent(new CustomEvent("deleteSponsor", { detail: { sponsorId: id } }));
                return;
            }
            if (act === "closeAdd") { this._adding = false; this.paint(); return; }
            if (act === "add") {
                const payload = Object.assign({}, this._form);
                if (this._logo) {
                    payload.logoBase64 = this._logo.base64;
                    payload.logoName = this._logo.name;
                    payload.logoType = this._logo.type;
                }
                this.dispatchEvent(new CustomEvent("addSponsor", { detail: payload }));
                return;
            }
            if (act === "back") {
                this.dispatchEvent(new CustomEvent("cancelSponsors", { detail: {} }));
                return;
            }
        });

        body.addEventListener("input", (event) => {
            const f = event.target.getAttribute("data-field");
            if (f) this._form[f] = event.target.value;
        });

        body.addEventListener("change", async (event) => {
            if (event.target.id === "logoFile") {
                const file = event.target.files && event.target.files[0];
                const result = await downscaleToBase64(file, MAX_DIMENSION, JPEG_QUALITY);
                if (!result) {
                    this.dispatchEvent(new CustomEvent("photoError", {
                        detail: { message: "That logo couldn't be read — try a different file." }
                    }));
                    return;
                }
                this._logo = result;
                this.paint();
                return;
            }
            const f = event.target.getAttribute("data-field");
            if (f) this._form[f] = event.target.value;
        });

        this.paint();
    }

    paint() {
        const d = this._data;
        const body = this.shadowRoot.getElementById("body");

        if (d.loading) { body.innerHTML = `<div class="loading">Loading…</div>`; return; }
        if (d.fatal) { body.innerHTML = `<div class="err">${esc(d.fatal)}</div>`; return; }

        const sponsors = Array.isArray(d.sponsors) ? d.sponsors : [];
        const teams = Array.isArray(d.teams) ? d.teams : [];

        body.innerHTML = `
          ${d.added ? `<div class="ok">${esc(d.added)}</div>` : ""}
          ${d.error ? `<div class="err">${esc(d.error)}</div>` : ""}

          ${this._adding ? this.addHtml(teams, d) : `
            <button type="button" class="btn primary" data-act="openAdd">＋ Add a sponsor</button>`}

          <div>
            <div class="label">Sponsoring your teams</div>
            ${sponsors.length === 0
                ? `<div class="empty">
                     No sponsors on your teams yet.<br>
                     Add one and it shows on the club website.
                   </div>`
                : sponsors.map(s => `
                    <div class="card">
                      <div class="srow">
                        ${s.logo
                            ? `<img src="${esc(s.logo)}" alt="" />`
                            : `<div class="none">No logo</div>`}
                        <div class="side">
                          <b>${esc(s.name)}</b>
                          ${s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.url)}</a>` : ""}
                        </div>
                      </div>
                      ${s.blurb ? `<div class="blurb">${esc(s.blurb)}</div>` : ""}

                      ${this._confirmRemove === s.id
                          ? this.removeChoices(s, d)
                          : `<div class="rowbtns">
                               <button type="button" class="btn ghost small" data-act="remove" data-id="${esc(s.id)}">Remove</button>
                             </div>`}
                    </div>`).join("")}
          </div>`;
    }

    // Two outcomes, spelled out. "Remove" alone could reasonably mean either,
    // and one of them destroys a record for the whole club.
    removeChoices(s, d) {
        const mine = (s.teams || []).map(t => t.name).filter(Boolean);
        const others = (s.otherTeams || []).map(t => t.name).filter(Boolean);
        const busy = d.removing === s.id;

        const whereMine = mine.length > 1 ? mine.join(" and ") : (mine[0] || "your team");

        return `
          <div class="confirm">
            <b>${esc(s.name)}</b> — what do you want to do?
            ${others.length
                ? `<div class="alsoused">Also sponsoring <b>${esc(others.join(", "))}</b>.
                     Deleting them from the club removes them there too.</div>`
                : ""}
          </div>
          <div class="rowbtns">
            <button type="button" class="btn ghost small" data-act="removeTeam" data-id="${esc(s.id)}" ${busy ? "disabled" : ""}>
              ${busy ? "Working…" : "Take off " + esc(whereMine)}
            </button>
            <button type="button" class="btn danger small" data-act="removeClub" data-id="${esc(s.id)}" ${busy ? "disabled" : ""}>
              Delete from the club
            </button>
            <button type="button" class="btn ghost small" data-act="cancelRemove">Cancel</button>
          </div>
          <p class="hint">
            Taking them off a team leaves the sponsor on the club list, so they can be
            added back. Deleting removes them everywhere and can't be undone.
          </p>`;
    }

    // Two ways in: pick one the club already has, or create one. The picker
    // comes first because a local business sponsoring a second squad is far
    // more common than a genuinely new sponsor, and the wrong default here is
    // what fills the collection with near-duplicates.
    addHtml(teams, d) {
        const available = Array.isArray(d.available) ? d.available : [];
        const mode = this._addMode;

        const chooser = available.length ? `
          <div class="seg">
            <button type="button" data-act="addMode" data-val="existing"
                    aria-pressed="${mode === "existing"}">Already on the club list</button>
            <button type="button" data-act="addMode" data-val="new"
                    aria-pressed="${mode === "new"}">Someone new</button>
          </div>` : "";

        if (mode === "existing" && available.length) {
            return `
              <div>
                <div class="label">Add a sponsor</div>
                ${chooser}
                <div class="picklist">
                  ${available.map(a => `
                    <div class="pick">
                      ${a.logo ? `<img src="${esc(a.logo)}" alt="" />` : `<div class="none">No logo</div>`}
                      <div class="side"><b>${esc(a.name)}</b></div>
                      <button type="button" class="btn ghost small" data-act="attach" data-id="${esc(a.id)}"
                              ${d.attaching === a.id ? "disabled" : ""}>
                        ${d.attaching === a.id ? "Adding…" : "Add"}
                      </button>
                    </div>`).join("")}
                </div>
                <div class="actions">
                  <button type="button" class="btn ghost" data-act="closeAdd">Cancel</button>
                </div>
              </div>`;
        }

        return this.formHtml(teams, d, chooser);
    }

    formHtml(teams, d, chooser) {
        const f = this._form;
        return `
          <div>
            <div class="label">New sponsor</div>
            ${chooser || ""}
            <div class="card">
              <div class="field ${d.badField === "name" ? "bad" : ""}">
                <label for="fName">Sponsor name</label>
                <input id="fName" type="text" data-field="name" value="${esc(f.name)}" />
              </div>
              <div class="field">
                <label for="fUrl">Website <span style="font-weight:400;color:var(--text-faint)">(optional)</span></label>
                <input id="fUrl" type="text" data-field="url" value="${esc(f.url)}" placeholder="example.co.uk" />
              </div>
              <div class="field">
                <label for="fBlurb">About them <span style="font-weight:400;color:var(--text-faint)">(optional)</span></label>
                <textarea id="fBlurb" data-field="blurb" rows="3">${esc(f.blurb)}</textarea>
              </div>
              ${teams.length > 1 ? `
                <div class="field">
                  <label for="fTeam">Sponsoring which team?</label>
                  <select id="fTeam" data-field="teamId">
                    ${teams.map(t => `
                      <option value="${esc(t.id)}" ${f.teamId === t.id ? "selected" : ""}>${esc(t.name)}</option>`).join("")}
                  </select>
                </div>` : ""}
              <div class="field">
                <label>Logo</label>
                <div class="logopick">
                  ${this._logo ? `<img src="${esc(this._logo.preview)}" alt="" />` : ""}
                  <input type="file" id="logoFile" accept="image/*" />
                </div>
              </div>
              <div class="actions">
                <button type="button" class="btn primary" data-act="add" ${d.adding ? "disabled" : ""}>
                  ${d.adding ? "Adding…" : "Add sponsor"}
                </button>
                <button type="button" class="btn ghost" data-act="closeAdd">Cancel</button>
              </div>
            </div>
          </div>`;
    }
}

if (!customElements.get("manager-hub-sponsors")) {
    customElements.define("manager-hub-sponsors", ManagerHubSponsors);
}

// =====================================================================
//  PAGE CODE CONTRACT
// =====================================================================
//  IN — {loading:true} first, then getSponsors()'s payload plus:
//    {
//      sponsors: [{ id, name, logo, url, blurb }],
//      teams: [{ id, name }],       // from the manager context
//      adding: bool, error: "", badField: "name",
//      added: "Sponsor added ✓",    // closes and clears the form
//      fatal: ""
//    }
//
//  OUT:
//    on("addSponsor", e => …)
//        // { name, url, blurb, teamId, logoBase64?, logoName?, logoType? }
//    on("cancelSponsors", () => …)
//    on("photoError", e => …)   // { message }
// =====================================================================
