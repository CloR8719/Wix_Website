// =====================================================================
//  <manager-hub-news> — Manager Hub v2, post news
// =====================================================================
//  Write a story, attach a photo, publish it to the club website. The
//  backend also pushes it to the Wix Blog, which is what the old news form
//  already did.
//
//  SETUP:
//    1. Public -> custom-elements -> new file `managerHubNews.js`.
//    2. On stateNews: Add -> Embed Code -> Custom Element.
//       Tag name: manager-hub-news   Element ID: #customNews
//    3. Height ~800px to start; it self-sizes after first paint.
//
//  ⚠️ REPUBLISH *AND* HARD-REFRESH after any change.
//
//  ⚠️ THIS PUBLISHES PUBLICLY, IMMEDIATELY, AND CAN'T BE UNPOSTED from here.
//  The button says so. A manager writing a match report shouldn't discover
//  that only afterwards, and there's no draft state to fall back on.
//
//  The blog copy is a bonus, not a requirement: if the Blog API fails the
//  news item is still saved and still shows on the website. Backend handles
//  that; this element just reports what happened.
// =====================================================================

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.85;

// Matches the old form's dropdown. Plain values rather than a ClubDictionary
// category because there isn't one, and three fixed options don't need to be
// admin-configurable.
const TYPES = ["News", "Match Report", "Announcement"];

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
    font-family: inherit; font-size: 12px; font-weight: 700;
    color: var(--text-muted); background: transparent;
  }
  .seg button[aria-pressed="true"] {
    background: var(--surface); color: var(--accent);
    box-shadow: 0 1px 2px rgba(16,33,47,.08);
  }
  .seg button:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }

  .field { margin-bottom: 0; }
  .field label {
    display: block; font-size: 11.5px; font-weight: 600;
    color: var(--text-muted); margin-bottom: 5px;
  }
  .field input, .field textarea, .field select {
    width: 100%; font-family: inherit; font-size: 14px;
    padding: 11px 12px; border: 1px solid var(--line); border-radius: 10px;
    background: var(--surface); color: var(--text);
  }
  .field textarea { resize: vertical; min-height: 190px; line-height: 1.65; }
  .field input:focus, .field textarea:focus, .field select:focus {
    outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft);
  }
  .field.bad input, .field.bad textarea { border-color: var(--critical); }
  .count { font-size: 11px; color: var(--text-faint); margin-top: 5px; text-align: right; }

  .imgpick { display: flex; gap: 13px; align-items: flex-start; }
  .imgpick img {
    width: 108px; height: 76px; object-fit: cover; border-radius: 9px;
    background: var(--neutral-bg); flex-shrink: 0;
  }
  .imgpick .side { flex: 1; min-width: 0; }
  .imgpick p { margin: 0 0 8px; font-size: 11.5px; color: var(--text-faint); line-height: 1.5; }
  input[type="file"] { font-size: 12px; color: var(--text-muted); width: 100%; }

  .card {
    background: var(--surface); border: 1px solid var(--line-soft);
    border-radius: 12px; padding: 15px;
  }

  .warn {
    font-size: 12px; line-height: 1.55; padding: 11px 13px; border-radius: 10px;
    background: var(--warning-bg); color: var(--warning);
  }

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
                    name: (file.name || "news.jpg").replace(/\.[^.]+$/, "") + ".jpg",
                    type: "image/jpeg"
                });
            };
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
    });
}

class ManagerHubNews extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._built = false;
        this._data = { loading: true };
        this._resizeObserver = null;
        this._lastHeight = 0;
        this._form = { headline: "", body: "", type: "News", teamId: "" };
        this._image = null;
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
            // Published - clear everything so a second tap can't post a
            // duplicate story to a public website.
            if (parsed.posted) {
                this._form = { headline: "", body: "", type: "News", teamId: this._form.teamId };
                this._image = null;
            }
            if (!this._form.teamId && Array.isArray(parsed.teams) && parsed.teams.length) {
                this._form.teamId = parsed.teams[0].id;
            }
            this.paint();
        } catch (err) {
            console.error("manager-hub-news: couldn't parse data attribute", err);
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

            if (act === "type") { this._form.type = el.getAttribute("data-val"); this.paint(); return; }
            if (act === "post") {
                const payload = Object.assign({}, this._form);
                if (this._image) {
                    payload.imageBase64 = this._image.base64;
                    payload.imageName = this._image.name;
                    payload.imageType = this._image.type;
                }
                this.dispatchEvent(new CustomEvent("postNews", { detail: payload }));
                return;
            }
            if (act === "cancel") {
                this.dispatchEvent(new CustomEvent("cancelNews", { detail: {} }));
                return;
            }
        });

        body.addEventListener("input", (event) => {
            const f = event.target.getAttribute("data-field");
            if (!f) return;
            this._form[f] = event.target.value;
            if (f === "body") {
                const c = this.shadowRoot.getElementById("count");
                if (c) c.textContent = `${event.target.value.length} characters`;
            }
        });

        body.addEventListener("change", async (event) => {
            if (event.target.id === "imgFile") {
                const file = event.target.files && event.target.files[0];
                const result = await downscaleToBase64(file, MAX_DIMENSION, JPEG_QUALITY);
                if (!result) {
                    this.dispatchEvent(new CustomEvent("photoError", {
                        detail: { message: "That image couldn't be read — try a different one." }
                    }));
                    return;
                }
                this._image = result;
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
        const f = this._form;
        const body = this.shadowRoot.getElementById("body");

        if (d.loading) { body.innerHTML = `<div class="loading">Loading…</div>`; return; }
        if (d.fatal) { body.innerHTML = `<div class="err">${esc(d.fatal)}</div>`; return; }

        const teams = Array.isArray(d.teams) ? d.teams : [];

        body.innerHTML = `
          ${d.posted ? `<div class="ok">${esc(d.posted)}</div>` : ""}
          ${d.error ? `<div class="err">${esc(d.error)}</div>` : ""}

          <div class="field">
            <label>What kind of story?</label>
            <div class="seg">
              ${TYPES.map(t => `
                <button type="button" data-act="type" data-val="${esc(t)}"
                        aria-pressed="${f.type === t}">${esc(t)}</button>`).join("")}
            </div>
          </div>

          <div class="field ${d.badField === "headline" ? "bad" : ""}">
            <label for="fHead">Headline</label>
            <input id="fHead" type="text" data-field="headline" value="${esc(f.headline)}"
                   placeholder="Reds edge a five-goal thriller" />
          </div>

          <div class="field ${d.badField === "body" ? "bad" : ""}">
            <label for="fBody">The story</label>
            <textarea id="fBody" data-field="body" rows="10">${esc(f.body)}</textarea>
            <div class="count" id="count">${f.body.length} characters</div>
          </div>

          ${teams.length > 1 ? `
            <div class="field">
              <label for="fTeam">Which team is it about?</label>
              <select id="fTeam" data-field="teamId">
                ${teams.map(t => `
                  <option value="${esc(t.id)}" ${f.teamId === t.id ? "selected" : ""}>${esc(t.name)}</option>`).join("")}
              </select>
            </div>` : ""}

          <div>
            <div class="field"><label>Photo</label></div>
            <div class="card">
              <div class="imgpick">
                ${this._image ? `<img src="${esc(this._image.preview)}" alt="" />` : ""}
                <div class="side">
                  <p>Used as the story's main image. Large photos are shrunk automatically.</p>
                  <input type="file" id="imgFile" accept="image/*" />
                </div>
              </div>
            </div>
          </div>

          <div class="warn">
            This goes straight onto the club website and the blog — it can't be
            unposted from here.
          </div>

          <div class="actions">
            <button type="button" class="btn primary" data-act="post" ${d.posting ? "disabled" : ""}>
              ${d.posting ? "Publishing…" : "Publish to the website"}
            </button>
            <button type="button" class="btn ghost" data-act="cancel">Cancel</button>
          </div>`;
    }
}

if (!customElements.get("manager-hub-news")) {
    customElements.define("manager-hub-news", ManagerHubNews);
}

// =====================================================================
//  PAGE CODE CONTRACT
// =====================================================================
//  IN:
//    { teams: [{ id, name }], posting: bool, error: "",
//      badField: "headline"|"body", posted: "Posted ✓", fatal: "" }
//
//  OUT:
//    on("postNews", e => …)
//        // { headline, body, type, teamId,
//        //   imageBase64?, imageName?, imageType? }
//    on("cancelNews", () => …)
//    on("photoError", e => …)   // { message }
//
//  Set `posted` on success - the element clears itself so the same story
//  can't be published twice.
// =====================================================================
