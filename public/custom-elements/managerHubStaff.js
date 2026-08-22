// =====================================================================
//  <manager-hub-staff> — Manager Hub v2, my staff record
// =====================================================================
//  A manager's own profile: photo, bio, contact number and qualifications.
//
//  SETUP:
//    1. Public -> custom-elements -> new file `managerHubStaff.js`.
//    2. On stateStaff: Add -> Embed Code -> Custom Element.
//       Tag name: manager-hub-staff   Element ID: #customStaff
//    3. Height ~800px to start; it self-sizes after first paint.
//
//  ⚠️ REPUBLISH *AND* HARD-REFRESH after any change.
//
//  YOUR OWN RECORD ONLY. The backend takes no id - it resolves the caller
//  and edits their row. Managing other people's records is the secretary's
//  Staff Admin screen, which already exists and isn't being duplicated here.
//
//  COMPLIANCE DATES ARE READ-ONLY and shown because an expiring DBS is the
//  manager's problem to act on even though only the secretary can record the
//  new one. Showing them greyed with a warning beats hiding them and having
//  someone find out at a fixture.
//
//  The mobile number IS editable here, unlike most of the record, because it
//  prints on recruitment posters. A wrong number on a poster is worse than
//  no poster.
// =====================================================================

const MAX_DIMENSION = 900;      // headshots are shown small; 900px is generous
const JPEG_QUALITY = 0.85;

// Anything inside this window is worth flagging before it lapses.
const EXPIRY_WARN_DAYS = 60;

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

  .label {
    font-size: 10.5px; font-weight: 700; letter-spacing: .07em;
    text-transform: uppercase; color: var(--text-faint); margin-bottom: 14px;
  }

  .card {
    background: var(--surface); border: 1px solid var(--line-soft);
    border-radius: 12px; padding: 15px;
  }

  .field { margin-bottom: 12px; }
  .field:last-child { margin-bottom: 0; }
  .field label {
    display: block; font-size: 11.5px; font-weight: 600;
    color: var(--text-muted); margin-bottom: 5px;
  }
  .field input, .field textarea {
    width: 100%; font-family: inherit; font-size: 14px;
    padding: 11px 12px; border: 1px solid var(--line); border-radius: 10px;
    background: var(--surface); color: var(--text);
  }
  .field textarea { resize: vertical; min-height: 110px; line-height: 1.6; }
  .field input:focus, .field textarea:focus {
    outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft);
  }
  .hint { font-size: 11px; color: var(--text-faint); margin-top: 5px; line-height: 1.5; }

  .head { display: flex; gap: 14px; align-items: flex-start; }
  .head img, .head .none {
    width: 84px; height: 84px; border-radius: 50%; flex-shrink: 0;
    object-fit: cover; background: var(--neutral-bg);
  }
  .head .none {
    display: flex; align-items: center; justify-content: center;
    color: var(--text-faint); font-size: 22px; font-weight: 700;
  }
  .head .side { flex: 1; min-width: 0; }
  .head h3 { margin: 0 0 3px; font-size: 17px; font-weight: 700; }
  .head p { margin: 0 0 9px; font-size: 12px; color: var(--text-muted); }
  /* An email address is ONE unbroken token, so min-width:0 on the flex parent
     is not enough on its own - there is no space for the browser to wrap at.
     It has to be told it may break mid-word. */
  .head .side p {
    overflow-wrap: anywhere; word-break: break-word;
    font-size: 12.5px; color: var(--text-muted); margin: 2px 0 0;
  }

  /* ⚠️ THE NATIVE FILE INPUT IS HIDDEN, NOT RESTYLED. Browsers render it as
     "Choose File" followed by "No file chosen", and that trailing text cannot
     be removed with CSS in every engine. The input stays in the DOM with its
     id so the existing change handler is untouched; the label drives it. */
  input[type="file"] {
    position: absolute; width: 1px; height: 1px;
    opacity: 0; overflow: hidden; white-space: nowrap;
  }
  .filebtn {
    display: inline-block; margin-top: 9px;
    padding: 8px 13px; border-radius: 9px; cursor: pointer;
    font-size: 12.5px; font-weight: 700;
    border: 1.5px solid var(--line); color: var(--accent); background: transparent;
  }
  .filebtn:hover { border-color: var(--accent); }
  /* The hidden input still takes focus, so the visible control must show it. */
  input[type="file"]:focus-visible + .filebtn { outline: 2px solid var(--accent); outline-offset: 2px; }

  .chips { display: flex; flex-wrap: wrap; gap: 7px; }
  .chip {
    font-family: inherit; font-size: 12px; font-weight: 600; cursor: pointer;
    padding: 8px 12px; border-radius: 999px;
    border: 1.5px solid var(--line); background: transparent; color: var(--text-muted);
  }
  .chip[aria-pressed="true"] { border-color: var(--accent); background: var(--accent-soft); color: var(--accent); }
  .chip:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

  .compliance { display: flex; flex-direction: column; gap: 8px; }
  .crow {
    display: flex; align-items: center; justify-content: space-between; gap: 10px;
    font-size: 12.5px;
  }
  .crow .nm { color: var(--text-muted); }
  .pill {
    display: inline-block; padding: 3px 9px; border-radius: 999px;
    font-size: 10.5px; font-weight: 700; white-space: nowrap;
  }
  .p-ok   { background: var(--success-bg);  color: var(--success); }
  .p-soon { background: var(--warning-bg);  color: var(--warning); }
  .p-out  { background: var(--critical-bg); color: var(--critical); }
  .p-none { background: var(--neutral-bg);  color: var(--neutral); }

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
                    name: (file.name || "headshot.jpg").replace(/\.[^.]+$/, "") + ".jpg",
                    type: "image/jpeg"
                });
            };
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
    });
}

// Compliance dates are the one thing here a manager can't fix themselves, so
// the wording points at who can.
function expiryState(iso) {
    if (!iso) return { cls: "p-none", text: "Not recorded" };
    const d = new Date(iso);
    if (isNaN(d.getTime())) return { cls: "p-none", text: "Not recorded" };
    const days = Math.floor((d.getTime() - Date.now()) / 86400000);
    const shown = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    if (days < 0) return { cls: "p-out", text: "Expired " + shown };
    if (days <= EXPIRY_WARN_DAYS) return { cls: "p-soon", text: "Expires " + shown };
    return { cls: "p-ok", text: shown };
}

class ManagerHubStaff extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._built = false;
        this._data = { loading: true };
        this._resizeObserver = null;
        this._lastHeight = 0;
        this._form = null;
        this._photo = null;
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
            if (parsed.id && this._seededFor !== parsed.id) {
                this._seededFor = parsed.id;
                this._photo = null;
                this._form = {
                    bio: parsed.bio || "",
                    mobile: parsed.mobile || "",
                    qualIds: Array.isArray(parsed.qualIds) ? parsed.qualIds.slice() : []
                };
            }
            if (parsed.saved) this._photo = null;
            this.paint();
        } catch (err) {
            console.error("manager-hub-staff: couldn't parse data attribute", err);
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

            if (act === "qual") {
                const id = el.getAttribute("data-val");
                const i = this._form.qualIds.indexOf(id);
                if (i === -1) this._form.qualIds.push(id); else this._form.qualIds.splice(i, 1);
                this.paint();
                return;
            }
            if (act === "save") {
                const payload = Object.assign({}, this._form);
                if (this._photo) {
                    payload.photoBase64 = this._photo.base64;
                    payload.photoName = this._photo.name;
                    payload.photoType = this._photo.type;
                }
                this.dispatchEvent(new CustomEvent("saveStaff", { detail: payload }));
                return;
            }
            if (act === "cancel") {
                this.dispatchEvent(new CustomEvent("cancelStaff", { detail: {} }));
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
            }
        });

        this.paint();
    }

    paint() {
        const d = this._data;
        const body = this.shadowRoot.getElementById("body");

        if (d.loading) { body.innerHTML = `<div class="loading">Loading…</div>`; return; }
        if (d.fatal) { body.innerHTML = `<div class="err">${esc(d.fatal)}</div>`; return; }
        if (!this._form) { body.innerHTML = `<div class="loading">Loading…</div>`; return; }

        const f = this._form;
        const preview = this._photo ? this._photo.preview : (d.headshot || "");
        const initials = String(d.name || "?").split(" ").map(p => p.charAt(0)).join("").slice(0, 2).toUpperCase();
        const quals = Array.isArray(d.qualOptions) ? d.qualOptions : [];

        const compliance = [
            ["DBS", d.dbsExpiry],
            ["Safeguarding", d.safeGuardingExpiry],
            ["First aid", d.firstAidExpiry],
            ["Coaching badge", d.coachingExpiry]
        ];

        body.innerHTML = `
          ${d.saved ? `<div class="ok">${esc(d.saved)}</div>` : ""}
          ${d.error ? `<div class="err">${esc(d.error)}</div>` : ""}

          <div class="card">
            <div class="head">
              ${preview
                  ? `<img src="${esc(preview)}" alt="" />`
                  : `<div class="none">${esc(initials)}</div>`}
              <div class="side">
                <h3>${esc(d.name || "Your record")}</h3>
                <p>${esc(d.email || "")}</p>
                <input type="file" id="photoFile" accept="image/*" />
                <label class="filebtn" for="photoFile">Change photo</label>
              </div>
            </div>
          </div>

          <div>
            <div class="label">About you</div>
            <div class="card">
              <div class="field">
                <label for="fBio">Bio</label>
                <textarea id="fBio" data-field="bio" rows="5"
                          placeholder="A short introduction shown on the club website">${esc(f.bio)}</textarea>
              </div>
              <div class="field">
                <label for="fMobile">Mobile</label>
                <input id="fMobile" type="tel" data-field="mobile" value="${esc(f.mobile)}" />
                <div class="hint">Used on recruitment posters so parents can reach you.</div>
              </div>
            </div>
          </div>

          ${quals.length ? `
            <div>
              <div class="label">Qualifications</div>
              <div class="card">
                <div class="chips">
                  ${quals.map(q => `
                    <button type="button" class="chip" data-act="qual" data-val="${esc(q.value)}"
                            aria-pressed="${f.qualIds.indexOf(q.value) !== -1}">${esc(q.label)}</button>`).join("")}
                </div>
              </div>
            </div>` : ""}

          <div>
            <div class="label">Compliance</div>
            <div class="card">
              <div class="compliance">
                ${compliance.map(([nm, iso]) => {
                    const st = expiryState(iso);
                    return `<div class="crow">
                        <span class="nm">${esc(nm)}</span>
                        <span class="pill ${st.cls}">${esc(st.text)}</span>
                      </div>`;
                }).join("")}
              </div>
              <div class="hint">
                Only the club secretary can update these — send her the paperwork and she'll record it.
              </div>
            </div>
          </div>

          <div class="actions">
            <button type="button" class="btn primary" data-act="save" ${d.saving ? "disabled" : ""}>
              ${d.saving ? "Saving…" : "Save changes"}
            </button>
            <button type="button" class="btn ghost" data-act="cancel">Cancel</button>
          </div>`;
    }
}

if (!customElements.get("manager-hub-staff")) {
    customElements.define("manager-hub-staff", ManagerHubStaff);
}

// =====================================================================
//  PAGE CODE CONTRACT
// =====================================================================
//  IN — {loading:true} first, then getMyStaffRecord()'s payload plus:
//    { saving: bool, error: "", saved: "Saved ✓", fatal: "" }
//
//  OUT:
//    on("saveStaff", e => …)
//        // { bio, mobile, qualIds, photoBase64?, photoName?, photoType? }
//    on("cancelStaff", () => …)
//    on("photoError", e => …)   // { message }
// =====================================================================
