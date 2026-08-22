// =====================================================================
//  <manager-hub-recruit> — Manager Hub v2, recruitment poster
// =====================================================================
//  A manager picks the positions they need, the poster redraws live, and it
//  publishes. Replaces the current process, which is a manager asking Rob to
//  make a graphic and post it for them.
//
//  SETUP:
//    1. Public -> custom-elements -> `managerHubRecruit.js`.
//    2. On stateRecruitment: Add -> Embed Code -> Custom Element.
//       Tag name: manager-hub-recruit   Element ID: #customRecruit
//    3. Height ~1100px to start; it self-sizes after first paint.
//
//  ⚠️ REPUBLISH *AND* HARD-REFRESH after any change.
//
//  THE ARTWORK IS AN IMAGE, THE TEXT IS DRAWN. The paint strokes, texture,
//  ball, icons and rules all live in the template - the code never draws
//  them, it only puts words in the gaps they leave. Recreating that artwork
//  in code would take days and look worse.
//
//  ⚠️ IMAGES CAN BREAK PUBLISHING, NOT JUST LOOKS. Drawing a cross-origin
//  image onto a canvas TAINTS it, and toDataURL() then THROWS. So both images
//  load with crossOrigin="anonymous", and the export is wrapped - a tainted
//  canvas produces a clear message rather than a silent failure. If the CORS
//  check ever fails, the fallback is embedding the template as a base64 data
//  URI in this file: bigger, but immune.
//
//  ⚠️ EVERY POSITION IS A FRACTION of the canvas, never a pixel. The artwork
//  is AI-generated and will be re-exported at some point; fractions survive
//  that, pixel values silently drift. Measured by Rob in the layout editor.
// =====================================================================

// Set 2026-08-22. Media Manager -> right-click -> Copy URL, the
// https://static.wixstatic.com one. A wix:image:// URI will NOT load here.
//
// ⚠️ DON'T LET THESE GO BLANK. The poster still renders without them - on a
// plain dark ground, so the layout stays checkable - which means an empty
// value degrades quietly instead of erroring. That is exactly how they sat
// empty in the repo while the live copy had them, and any paste of this file
// would have silently wiped the real poster. Values live here now so the
// repo and the live element agree.
//
// Both are loaded with crossOrigin="anonymous" because they are drawn onto a
// canvas - a tainted canvas makes toDataURL() throw, so publishing would fail
// rather than just look wrong.
const TEMPLATE_URL = "https://static.wixstatic.com/media/1c0088_2bfd4b74e3c24a4ba5f92d647e6428b6~mv2.jpg";
const CREST_URL = "https://static.wixstatic.com/media/1c0088_cee7211f27184a17a5b42fc2c20d8571~mv2.png";

// ⚠️ TEMPORARY LAYOUT TOOL. Flip to true, republish, and the poster becomes
// draggable with a coordinate panel underneath it. Position everything, copy
// the block it prints into P below, then flip this back to false.
//
// It exists because positioning in a mockup and positioning in a Wix custom
// element are not the same thing: the element runs in an iframe with its own
// font availability, so a face that resolved in the mockup may fall back here
// and every measurement drifts. Doing it in situ removes that whole class of
// doubt.
//
// Delete this and everything under "LAYOUT MODE" once the poster is settled.
const LAYOUT_MODE = false;

// Matches the cropped artwork: 1080 x 1578, ratio 0.684.
const CANVAS_W = 1080;
const CANVAS_H = 1578;

const YELLOW = "#FFC629";
const WHITE  = "#F2F4F6";
const INK    = "#101010";

// Impact and Haettenschweiler are the heavy condensed faces that ship with
// Windows and macOS. Not the distressed face in the original artwork, but the
// same weight and width - which is what carries a poster at arm's length.
const DISPLAY = "Impact, Haettenschweiler, 'Arial Narrow Bold', 'Arial Narrow', sans-serif";

// Everything below the positions block is meant to be READ, not shouted. A
// condensed display face is built to carry a headline at distance and is a
// poor choice for an address - the counters close up and the letters run
// together. Work Sans is already loaded by Wix on this site, so it resolves
// reliably here, and at 700 it still holds its own on a dark poster.
const BODY = "'Work Sans', -apple-system, 'Segoe UI', Arial, sans-serif";

// Measured in the layout editor, 2026-08-19. Pixel equivalents in comments.
const P = {
    crest:   { x: 0.7537, y: 0.1635, size: 380, rot: 0 },
    club:    { x: 0.0204, y: 0.1394, size: 70,  rot: -14 },
    age:     { x: 0.1759, y: 0.2313, size: 65,  rot: -3 },
    team:    { x: 0.1944, y: 0.3042, size: 75,  rot: -5 },
    looking: { x: 0.4907, y: 0.3707, size: 40,  rot: 0 },
    posLine: { x: 0.4907, y: 0.4499, size: 100, rot: 0 },
    season:  { x: 0.5000, y: 0.5608, size: 40,  rot: 0 },
    rowHead: { x: 0.2000, y: 0.6020, size: 30,  rot: 0 },
    row1:    { x: 0.2000, y: 0.6274, size: 25,  rot: 0 },
    row2:    { x: 0.2000, y: 0.6781, size: 25,  rot: 0 },
    row3:    { x: 0.2000, y: 0.7446, size: 30,  rot: 0 },
    phone:   { x: 0.1491, y: 0.8175, size: 70,  rot: 0 },
    contact: { x: 0.2315, y: 0.8080, size: 34,  rot: 0 },
    tel:     { x: 0.2315, y: 0.8397, size: 40,  rot: 0 }
};

const CLUB_NAME = "SIGNOL ATHLETIC";

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

  /* ⚠️ THE GAP HAS TO BE HERE, NOT ON .wrap. Every section renders into
     #body, so #body is .wrap's only child - a gap on .wrap has nothing to
     separate. */
  #body { display: flex; flex-direction: column; gap: 18px; }

  /* The canvas is 1080px wide internally and scaled to fit. Scaling in CSS
     rather than shrinking the canvas keeps the export at full resolution. */
  .preview {
    width: 100%; max-width: 340px; margin: 0 auto;
    border-radius: 12px; overflow: hidden;
    box-shadow: 0 2px 16px rgba(16,33,47,.18);
  }
  .preview canvas { display: block; width: 100%; height: auto; }

  .label {
    font-size: 10.5px; font-weight: 700; letter-spacing: .07em;
    text-transform: uppercase; color: var(--text-faint); margin-bottom: 14px;
  }

  .field label {
    display: block; font-size: 11.5px; font-weight: 600;
    color: var(--text-muted); margin-bottom: 6px;
  }
  .field input, .field select {
    width: 100%; font-family: inherit; font-size: 14px;
    padding: 11px 12px; border: 1px solid var(--line); border-radius: 10px;
    background: var(--surface); color: var(--text);
  }
  .field input:focus, .field select:focus {
    outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft);
  }

  .two { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .field { margin-bottom: 12px; }
  .field:last-child { margin-bottom: 0; }

  .chips { display: flex; flex-wrap: wrap; gap: 7px; }
  .chip {
    font-family: inherit; font-size: 12.5px; font-weight: 600; cursor: pointer;
    padding: 9px 14px; border-radius: 999px;
    border: 1.5px solid var(--line); background: transparent; color: var(--text-muted);
  }
  .chip[aria-pressed="true"] { border-color: var(--accent); background: var(--accent-soft); color: var(--accent); }
  .chip:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

  .check {
    display: flex; align-items: flex-start; gap: 10px;
    padding: 12px 13px; border: 1.5px solid var(--line); border-radius: 11px;
    cursor: pointer; background: var(--surface); width: 100%; text-align: left;
    font-family: inherit; color: inherit;
  }
  .check + .check { margin-top: 8px; }
  .check[aria-pressed="true"] { border-color: var(--accent); background: var(--accent-soft); }
  .check .box {
    width: 17px; height: 17px; border-radius: 5px; flex-shrink: 0; margin-top: 1px;
    border: 2px solid var(--line);
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 700; color: transparent;
  }
  .check[aria-pressed="true"] .box { border-color: var(--accent); background: var(--accent); color: #fff; }
  .check b { display: block; font-size: 13.5px; font-weight: 700; }
  .check span { font-size: 11.5px; color: var(--text-muted); line-height: 1.5; }
  .check:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

  .fromrec {
    font-size: 12px; color: var(--text-muted); line-height: 1.55;
    background: var(--neutral-bg); padding: 11px 13px; border-radius: 10px;
  }
  .fromrec b { color: var(--text); }

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
  .warn {
    font-size: 12px; line-height: 1.55; padding: 11px 13px; border-radius: 10px;
    background: var(--warning-bg); color: var(--warning);
  }
  .loading { padding: 40px 18px; text-align: center; font-size: 13px; color: var(--text-muted); }

  /* Layout mode only. Deliberately plain - it should never be mistaken for
     something a manager is meant to use. */
  .layout { border: 1px dashed var(--line); border-radius: 10px; padding: 13px; }
  .layout table.lt { width: 100%; border-collapse: collapse; font-size: 12px; }
  .layout th { font-size: 9.5px; text-transform: uppercase; letter-spacing: .06em;
               color: var(--text-faint); text-align: left; padding: 0 4px 6px; }
  .layout td { padding: 3px 4px; border-top: 1px solid var(--line-soft); }
  .layout tr.sel td { background: var(--accent-soft); }
  .layout input {
    width: 56px; font-family: ui-monospace, Menlo, Consolas, monospace;
    font-size: 11.5px; padding: 4px 5px; text-align: right;
    border: 1px solid var(--line); border-radius: 5px;
    background: var(--surface); color: var(--text);
  }
  .layout pre {
    margin: 11px 0 0; padding: 11px; border-radius: 8px; max-height: 220px; overflow: auto;
    background: var(--neutral-bg); font-family: ui-monospace, Menlo, Consolas, monospace;
    font-size: 11px; line-height: 1.5; color: var(--text-muted); white-space: pre;
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

  /* iOS Safari zooms the page in when an input under 16px takes focus, and
     never zooms back out - leaving the manager stuck on a magnified page
     mid-form. On a phone correctness beats matching the mockup. Same rule
     as parentHubHome.js. */
  @media (max-width: 749px) {
    input, select, textarea { font-size: 16px; }
  }
`;

// "U12" / "U12s" / "Under 12" all become "UNDER 12s". The CMS stores the short
// form because that's what a squad list wants; a poster wants it spelled out.
//
// Written without backslash escapes on purpose - [0-9] rather than \d, a
// literal space rather than \s. These strings pass through several layers of
// tooling to get here and the escapes kept getting eaten, which produced a
// regex that silently matched nothing.
function expandAge(raw) {
    const t = String(raw || "").trim();
    if (!t) return "";
    const m = t.toLowerCase().split(" ").join("").match(/^(?:u|under)([0-9]{1,2})s?$/);
    return m ? ("UNDER " + m[1] + "s") : t;
}

// Team names are stored with the age group on the front ("U12 Eagles"), which
// on a poster reads "UNDER 12s / U12 EAGLES" - the same thing twice. Strips a
// leading age token. If that leaves NOTHING, the squad has no name beyond its
// age group - plenty of older teams are recorded simply as "U16". Returns blank
// in that case rather than the original: the line above already reads
// "UNDER 16s", and repeating it underneath looks like a mistake. The team line
// is skipped entirely when empty.
function stripAge(team, age) {
    const t = String(team || "").trim();
    const found = String(age || "").match(/([0-9]{1,2})/);
    if (!t || !found) return t;
    const cleaned = t.replace(new RegExp("^(?:u|under) ?" + found[1] + "s? *[,-]* *", "i"), "").trim();
    return cleaned;
}

// Wix TIME columns come back as "19:00:00.000". On a poster that reads as a
// database field, not a training session - so it becomes "7pm" / "7.30pm".
//
// The team profile only records a START time, but a poster wants a range
// ("8pm to 9pm"). The field is editable, so a manager types the range in and
// this is only ever the starting point.
function tidyTime(raw) {
    const t = String(raw || "").trim();
    if (!t) return "";
    const m = t.match(/^([0-9]{1,2}):([0-9]{2})/);
    if (!m) return t;

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

class ManagerHubRecruit extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._built = false;
        this._data = { loading: true };
        this._resizeObserver = null;
        this._lastHeight = 0;

    // EVERY LINE ON THE POSTER IS EDITABLE, seeded from the CMS.
    //
    // The first version locked the name and number to the staff record, on the
    // reasoning that a wrong number is worse than no poster. Rob's call
    // (2026-08-19) is that managers need to be able to override - a squad might
    // want "U15s Wolverines" phrased differently, or a different person taking
    // the calls for one intake. Prefilling still means the common case is right
    // without anyone typing anything.
        this._form = {
            positions: [], season: "", extraLine: "",
            clubName: "", teamName: "", ageGroup: "",
            trainingDay: "", trainingTime: "", location: "",
            contactName: "", contactPhone: "",
            toWebsite: true, toFacebook: false
        };
        this._seeded = false;
        this._template = null;
        this._crest = null;
        this._imagesTried = false;

        // Only used by LAYOUT_MODE, but recorded always - a couple of numbers
        // per draw is cheaper than a second code path that could drift.
        this._boxes = {};
        this._sel = "club";
        this._drag = null;
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
            // Seeded ONCE. Reseeding on every payload would overwrite whatever
            // the manager had just typed the moment anything else repainted.
            if (!this._seeded && !parsed.loading) {
                this._seeded = true;
                const f = this._form;
                f.season       = f.season       || parsed.season || "";
                f.clubName     = f.clubName     || CLUB_NAME;
                f.ageGroup     = f.ageGroup     || expandAge(parsed.ageGroup);
                f.teamName     = f.teamName     || stripAge(parsed.teamName, parsed.ageGroup);
                f.trainingDay  = f.trainingDay  || parsed.trainingDay || "";
                f.trainingTime = f.trainingTime || tidyTime(parsed.trainingTime);
                f.location     = f.location     || parsed.trainingLocation || parsed.trainingPitch || "";
                f.contactName  = f.contactName  || String(parsed.managerName || "").split(" ")[0] || "";
                f.contactPhone = f.contactPhone || parsed.managerPhone || "";
            }
            this.loadImages();
            this.paint();
        } catch (err) {
            console.error("manager-hub-recruit: couldn't parse data attribute", err);
        }
    }

    // crossOrigin is set BEFORE src on purpose - set it after and the browser
    // has already started the request without CORS, and the canvas ends up
    // tainted anyway.
    loadImages() {
        if (this._imagesTried) return;
        this._imagesTried = true;

        const load = (url, onto) => {
            if (!url) return;
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => { this[onto] = img; this.draw(); };
            img.onerror = () => {
                console.error("manager-hub-recruit: couldn't load", url,
                    "- check it's the https://static.wixstatic.com URL, not wix:image://");
                this.draw();
            };
            img.src = url;
        };

        load(TEMPLATE_URL, "_template");
        load(CREST_URL, "_crest");
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

            if (act === "pos") {
                const v = el.getAttribute("data-val");
                const i = this._form.positions.indexOf(v);
                if (i === -1) this._form.positions.push(v); else this._form.positions.splice(i, 1);
                this.paint();
                return;
            }
            if (act === "toggle") {
                const key = el.getAttribute("data-key");
                this._form[key] = !this._form[key];
                this.paint();
                return;
            }
            if (act === "publish") { this.publish(); return; }
            if (act === "cancel") {
                this.dispatchEvent(new CustomEvent("cancelRecruit", { detail: {} }));
                return;
            }
        });

        // Redraws on every keystroke. The canvas is small enough that this is
        // imperceptible, and a live preview is the point - a manager should
        // never have to publish to find out what it looks like.
        const onEdit = (event) => {
            const f = event.target.getAttribute("data-field");
            if (!f) return;
            this._form[f] = event.target.value;
            this.draw();
        };
        body.addEventListener("input", onEdit);
        body.addEventListener("change", onEdit);

        if (LAYOUT_MODE) {
            body.addEventListener("input", (event) => {
                const el = event.target;
                if (!el.dataset || !el.dataset.lk) return;
                const v = Number(el.value);
                if (isNaN(v)) return;
                const it = P[el.dataset.lk];
                const f = el.dataset.lf;
                if (f === "x") it.x = v / CANVAS_W;
                else if (f === "y") it.y = v / CANVAS_H;
                else it[f] = v;
                this._sel = el.dataset.lk;
                this.draw();
                this.updateLayoutCode();
            });
        }

        this.paint();
        if (LAYOUT_MODE) this.wireLayout();
    }

    publish() {
        const canvas = this.shadowRoot.getElementById("poster");
        if (!canvas) return;

        let base64 = "";
        try {
            base64 = (canvas.toDataURL("image/jpeg", 0.92).split(",")[1]) || "";
        } catch (err) {
            // A tainted canvas throws here. It means an image was drawn from a
            // host that didn't allow it - the poster looks perfect on screen and
            // simply cannot be exported, which is baffling without this message.
            console.error("manager-hub-recruit: canvas is tainted, can't export", err);
            this.dispatchEvent(new CustomEvent("posterError", {
                detail: { message: "The poster can't be saved because of how the artwork is hosted — it's the CORS problem." }
            }));
            return;
        }

        this.dispatchEvent(new CustomEvent("publishPoster", {
            detail: {
                positions: this._form.positions.slice(),
                position: this._form.positions.join(", "),
                season: this._form.season,
                extraLine: this._form.extraLine,
                teamName: this._form.teamName,
                toWebsite: !!this._form.toWebsite,
                toFacebook: !!this._form.toFacebook,
                imageBase64: base64
            }
        }));
    }

    paint() {
        const d = this._data;
        const f = this._form;
        const body = this.shadowRoot.getElementById("body");

        if (d.loading) { body.innerHTML = `<div class="loading">Loading…</div>`; return; }
        if (d.fatal) { body.innerHTML = `<div class="err">${esc(d.fatal)}</div>`; return; }

        const positions = Array.isArray(d.positions) ? d.positions : [];
        const seasons = Array.isArray(d.seasons) ? d.seasons : [];

        body.innerHTML = `
          ${d.sent ? `<div class="ok">${esc(d.sent)}</div>` : ""}
          ${d.error ? `<div class="err">${esc(d.error)}</div>` : ""}

          <div class="preview">
            <canvas id="poster" width="${CANVAS_W}" height="${CANVAS_H}" tabindex="0"></canvas>
          </div>
          ${LAYOUT_MODE ? `<div id="layout" class="layout"></div>` : ""}

          <div>
            <div class="label">Positions wanted</div>
            <div class="chips">
              ${positions.map(p => `
                <button type="button" class="chip" data-act="pos" data-val="${esc(p.value)}"
                        aria-pressed="${f.positions.indexOf(p.value) !== -1}">${esc(p.label)}</button>`).join("")}
            </div>
            ${f.positions.length === 0
                ? `<p class="fromrec" style="margin-top:10px">Nothing picked — the poster says <b>NEW PLAYERS</b>, which is right for general recruitment.</p>`
                : ""}
          </div>

          <div class="field">
            <label for="fSeason">Season</label>
            ${seasons.length
                ? `<select id="fSeason" data-field="season">
                     ${seasons.map(sn => `
                       <option value="${esc(sn)}" ${f.season === sn ? "selected" : ""}>${esc(sn)}</option>`).join("")}
                   </select>`
                : `<input id="fSeason" type="text" data-field="season" value="${esc(f.season)}" placeholder="2026/27" />`}
          </div>

          <div class="field">
            <label for="fExtra">Bottom line <span style="font-weight:400;color:var(--text-faint)">(optional)</span></label>
            <input id="fExtra" type="text" data-field="extraLine" maxlength="52"
                   value="${esc(f.extraLine)}" placeholder="Preferably previous experience of playing" />
          </div>

          <div>
            <div class="label">Wording on the poster</div>
            <div class="fromrec" style="margin-bottom:12px">
              Filled in from the club records — change anything that reads better on a poster.
            </div>

            <div class="field">
              <label for="fClub">Club name</label>
              <input id="fClub" type="text" data-field="clubName" value="${esc(f.clubName)}" />
            </div>
            <div class="two">
              <div class="field">
                <label for="fAge">Age group</label>
                <input id="fAge" type="text" data-field="ageGroup" value="${esc(f.ageGroup)}" placeholder="U15s" />
              </div>
              <div class="field">
                <label for="fTeam">Team name</label>
                <input id="fTeam" type="text" data-field="teamName" value="${esc(f.teamName)}" placeholder="Wolverines" />
              </div>
            </div>
            <div class="two">
              <div class="field">
                <label for="fDay">Training day</label>
                <input id="fDay" type="text" data-field="trainingDay" value="${esc(f.trainingDay)}" placeholder="Thursday" />
              </div>
              <div class="field">
                <label for="fTime">Time</label>
                <input id="fTime" type="text" data-field="trainingTime" value="${esc(f.trainingTime)}" placeholder="8pm to 9pm" />
              </div>
            </div>
            <div class="field">
              <label for="fWhere">Where</label>
              <input id="fWhere" type="text" data-field="location" value="${esc(f.location)}" />
            </div>
            <div class="two">
              <div class="field">
                <label for="fWho">Contact name</label>
                <input id="fWho" type="text" data-field="contactName" value="${esc(f.contactName)}" />
              </div>
              <div class="field">
                <label for="fTel">Number</label>
                <input id="fTel" type="tel" data-field="contactPhone" value="${esc(f.contactPhone)}" />
              </div>
            </div>
            ${!f.contactPhone ? `<div class="warn">No number yet — parents won't be able to reach anyone.</div>` : ""}
          </div>

          <div>
            <div class="label">Where should it go?</div>
            <button type="button" class="check" data-act="toggle" data-key="toWebsite"
                    aria-pressed="${!!f.toWebsite}">
              <span class="box">✓</span>
              <span><b>Club website</b><span>Publishes as a news post</span></span>
            </button>
            <button type="button" class="check" data-act="toggle" data-key="toFacebook"
                    aria-pressed="${!!f.toFacebook}">
              <span class="box">✓</span>
              <span><b>Facebook page</b><span>Held for approval before it goes live</span></span>
            </button>
          </div>

          ${f.toFacebook ? `<div class="warn">
              Facebook posts are checked before they go out — it's the club's public page.
            </div>` : ""}

          <div class="actions">
            <button type="button" class="btn primary" data-act="publish"
                    ${d.publishing || (!f.toWebsite && !f.toFacebook) ? "disabled" : ""}>
              ${d.publishing ? "Publishing…" : "Publish"}
            </button>
            <button type="button" class="btn ghost" data-act="cancel">Cancel</button>
          </div>`;

        this.draw();
        if (LAYOUT_MODE) this.renderLayoutPanel();
    }

    // =====================================================================
    //  LAYOUT MODE — temporary, see LAYOUT_MODE at the top of this file
    // =====================================================================
    wireLayout() {
        const canvas = this.shadowRoot.getElementById("poster");
        if (!canvas) return;
        canvas.style.cursor = "grab";
        canvas.style.touchAction = "none";

        const toCanvas = (e) => {
            const r = canvas.getBoundingClientRect();
            return { x: (e.clientX - r.left) * (CANVAS_W / r.width),
                     y: (e.clientY - r.top) * (CANVAS_H / r.height) };
        };

        canvas.addEventListener("pointerdown", (e) => {
            const pt = toCanvas(e);
            const keys = Object.keys(this._boxes).reverse();
            for (const k of keys) {
                const b = this._boxes[k];
                if (!b || !P[k]) continue;
                if (pt.x >= b.x - 10 && pt.x <= b.x + b.w + 10 &&
                    pt.y >= b.y - 10 && pt.y <= b.y + b.h + 10) {
                    this._sel = k;
                    this._drag = { key: k, dx: pt.x - CANVAS_W * P[k].x, dy: pt.y - CANVAS_H * P[k].y };
                    canvas.setPointerCapture(e.pointerId);
                    this.draw(); this.renderLayoutPanel();
                    return;
                }
            }
        });

        canvas.addEventListener("pointermove", (e) => {
            if (!this._drag) return;
            const pt = toCanvas(e);
            P[this._drag.key].x = (pt.x - this._drag.dx) / CANVAS_W;
            P[this._drag.key].y = (pt.y - this._drag.dy) / CANVAS_H;
            this.draw(); this.renderLayoutPanel();
        });

        canvas.addEventListener("pointerup", (e) => {
            this._drag = null;
            try { canvas.releasePointerCapture(e.pointerId); } catch (err) {}
        });

        this.shadowRoot.addEventListener("keydown", (e) => {
            if (!LAYOUT_MODE) return;
            if (e.target && e.target.tagName === "INPUT") return;
            const it = P[this._sel];
            if (!it) return;
            const step = (e.shiftKey ? 10 : 1);
            if (e.key === "ArrowLeft")  { it.x -= step / CANVAS_W; e.preventDefault(); }
            else if (e.key === "ArrowRight") { it.x += step / CANVAS_W; e.preventDefault(); }
            else if (e.key === "ArrowUp")    { it.y -= step / CANVAS_H; e.preventDefault(); }
            else if (e.key === "ArrowDown")  { it.y += step / CANVAS_H; e.preventDefault(); }
            else if (e.key === "[") { it.rot = (it.rot || 0) - (e.shiftKey ? 5 : 1); e.preventDefault(); }
            else if (e.key === "]") { it.rot = (it.rot || 0) + (e.shiftKey ? 5 : 1); e.preventDefault(); }
            else return;
            this.draw(); this.renderLayoutPanel();
        });
    }

    layoutCode() {
        const NL = String.fromCharCode(10);
        return "const P = {" + NL + Object.keys(P).map(function (k) {
            const it = P[k];
            return "    " + (k + ":").padEnd(9) + " { x: " + it.x.toFixed(4) +
                   ", y: " + it.y.toFixed(4) + ", size: " + Math.round(it.size) +
                   ", rot: " + (it.rot || 0) + " },";
        }).join(NL) + NL + "};";
    }

    // ⚠️ Rewrites ONLY the code block, never the table.
    //
    // Re-rendering the whole panel while someone is typing in it destroys the
    // input they're in and drops focus mid-keystroke - which is why the typing
    // path deliberately skipped renderLayoutPanel(). The consequence was worse:
    // the poster updated, the code block underneath kept the OLD numbers, and
    // the values that got copied out were stale.
    updateLayoutCode() {
        const out = this.shadowRoot.getElementById("layoutOut");
        if (out) out.textContent = this.layoutCode();
    }

    renderLayoutPanel() {
        const host = this.shadowRoot.getElementById("layout");
        if (!host) return;

        const rows = Object.keys(P).map((k) => {
            const it = P[k];
            return '<tr class="' + (k === this._sel ? "sel" : "") + '" data-row="' + k + '">' +
              '<td>' + k + '</td>' +
              '<td><input data-lk="' + k + '" data-lf="x" value="' + Math.round(CANVAS_W * it.x) + '"></td>' +
              '<td><input data-lk="' + k + '" data-lf="y" value="' + Math.round(CANVAS_H * it.y) + '"></td>' +
              '<td><input data-lk="' + k + '" data-lf="size" value="' + Math.round(it.size) + '"></td>' +
              '<td><input data-lk="' + k + '" data-lf="rot" value="' + (it.rot || 0) + '"></td>' +
            '</tr>';
        }).join("");

        const code = this.layoutCode();

        host.innerHTML =
          '<div class="label">Layout mode — drag the poster, arrows nudge, [ ] rotate</div>' +
          '<table class="lt"><thead><tr><th>Item</th><th>X</th><th>Y</th><th>Size</th><th>Rot</th></tr></thead>' +
          '<tbody>' + rows + '</tbody></table>' +
          '<pre id="layoutOut">' + esc(code) + '</pre>';
    }

    // ---------------------------------------------------------------
    //  The poster
    // ---------------------------------------------------------------
    // Positions come from P as fractions; nothing here knows a pixel.
    //
    // opts.font picks the face: DISPLAY for headlines, BODY for anything meant
    // to be READ. opts.lines > 1 wraps on whole words instead of shrinking.
    text(ctx, key, str, colour, opts) {
        const o = opts || {};
        const p = P[key];
        if (!p || !str) return;

        const x = CANVAS_W * p.x;
        const y = o.y !== undefined ? o.y : CANVAS_H * p.y;
        const rad = (p.rot || 0) * Math.PI / 180;
        const family = o.font || DISPLAY;
        const weight = o.weight || (family === BODY ? "700 " : "");

        // The only bound is the canvas edge unless a caller says otherwise.
        // An earlier version capped each line at an arbitrary fraction of the
        // width; anything over it quietly dropped a few points, and a smaller
        // line at the same anchor reads as having MOVED - which made a measured
        // layout look wrong for no visible reason.
        const margin = CANVAS_W * 0.03;
        const toEdge = (o.align === "center")
            ? (Math.min(x, CANVAS_W - x) - margin) * 2
            : CANVAS_W - x - margin;
        const maxW = o.maxWidth || Math.max(80, toEdge);

        let size = o.size || p.size;
        const setFont = () => { ctx.font = weight + size + "px " + family; };
        setFont();

        // Wrapping beats shrinking for anything long. An address squeezed onto
        // one line ends up unreadable at poster distance; two lines at full
        // size stay legible.
        let lines = [str];
        if (o.lines && o.lines > 1) {
            lines = this.wrap(ctx, str, maxW, o.lines);
            // Still too wide even wrapped - shrink as a last resort.
            while (lines.some(l => ctx.measureText(l).width > maxW) && size > 12) {
                size -= 2; setFont();
                lines = this.wrap(ctx, str, maxW, o.lines);
            }
        } else {
            while (ctx.measureText(str).width > maxW && size > 12) {
                size -= 2; setFont();
            }
        }

        const lead = size * (o.leading || 1.06);

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rad);
        ctx.textAlign = o.align || "left";
        ctx.textBaseline = "alphabetic";
        ctx.fillStyle = colour;
        lines.forEach((line, i) => ctx.fillText(line, 0, i * lead));
        const w = Math.max.apply(null, lines.map(l => ctx.measureText(l).width));
        ctx.restore();

        // Axis-aligned box around the rotated text, for dragging in layout mode.
        if (!o.skipBox) {
            const h = size * 0.78 + lead * (lines.length - 1);
            const x0 = (o.align === "center") ? -w / 2 : 0;
            const pts = [[x0, -size * 0.78], [x0 + w, -size * 0.78],
                         [x0 + w, h * 0.25 + lead * (lines.length - 1)], [x0, h * 0.25 + lead * (lines.length - 1)]]
                .map(function (c) {
                    return [x + c[0] * Math.cos(rad) - c[1] * Math.sin(rad),
                            y + c[0] * Math.sin(rad) + c[1] * Math.cos(rad)];
                });
            const xs = pts.map(function (c) { return c[0]; });
            const ys = pts.map(function (c) { return c[1]; });
            this._boxes[key] = {
                x: Math.min.apply(null, xs), y: Math.min.apply(null, ys),
                w: Math.max.apply(null, xs) - Math.min.apply(null, xs),
                h: Math.max.apply(null, ys) - Math.min.apply(null, ys)
            };
        }
    }

    // Greedy word wrap, capped at `max` lines. Once the last permitted line is
    // reached everything remaining goes onto it, and the shrink pass in text()
    // deals with the overflow - silently truncating an address would be worse
    // than a slightly small one.
    wrap(ctx, str, maxW, max) {
        const words = String(str).split(" ").filter(Boolean);
        if (words.length === 0) return [""];

        const lines = [];
        let line = words[0];

        for (let i = 1; i < words.length; i++) {
            if (lines.length === max - 1) {
                line = line + " " + words.slice(i).join(" ");
                break;
            }
            const test = line + " " + words[i];
            if (ctx.measureText(test).width <= maxW) {
                line = test;
            } else {
                lines.push(line);
                line = words[i];
            }
        }

        lines.push(line);
        return lines;
    }

    positionLines() {
        const picked = (this._form.positions || []).filter(Boolean);
        if (picked.length === 0) return ["NEW PLAYERS"];
        if (picked.length === 1) return [picked[0].toUpperCase()];
        return [
            picked.slice(0, -1).join(", ").toUpperCase(),
            "AND " + picked[picked.length - 1].toUpperCase()
        ];
    }

    draw() {
        const canvas = this.shadowRoot.getElementById("poster");
        if (!canvas || !canvas.getContext) return;
        const ctx = canvas.getContext("2d");
        // Everything drawn comes from the FORM now, not the payload - the payload
        // only seeds it. Reading d here would quietly ignore an override.
        const f = this._form;

        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

        if (this._template) {
            ctx.drawImage(this._template, 0, 0, CANVAS_W, CANVAS_H);
        } else {
            // No artwork yet - a plain dark ground so the layout is still
            // checkable rather than the whole thing being blank.
            ctx.fillStyle = "#141414";
            ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        }

        // ---- badge ----
        {
            const cp = P.crest, cw = cp.size, ch = cw * 1.18;
            this._boxes.crest = { x: CANVAS_W * cp.x - cw / 2, y: CANVAS_H * cp.y - ch / 2, w: cw, h: ch };
        }
        if (this._crest) {
            const p = P.crest;
            const w = p.size;
            const ratio = (this._crest.height && this._crest.width)
                ? this._crest.height / this._crest.width : 1.18;
            const h = w * ratio;
            ctx.drawImage(this._crest, CANVAS_W * p.x - w / 2, CANVAS_H * p.y - h / 2, w, h);
        }

        this.text(ctx, "club", String(f.clubName || CLUB_NAME).toUpperCase(), INK);
        this.text(ctx, "age", String(f.ageGroup || "").toUpperCase(), INK);
        this.text(ctx, "team", String(f.teamName || "").toUpperCase(), WHITE);
        this.text(ctx, "looking", "LOOKING FOR", WHITE, { align: "center" });

        // ---- the positions: the whole reason the poster exists ----
        const lines = this.positionLines();
        const pl = P.posLine;
        lines.forEach((line, i) => {
            this.text(ctx, "posLine", line, i % 2 === 0 ? YELLOW : WHITE, {
                align: "center",
                y: CANVAS_H * pl.y + i * pl.size * 0.94,
                skipBox: i > 0
            });
        });

        if (f.season) {
            this.text(ctx, "season", "FOR " + String(f.season).toUpperCase() + " SEASON", INK, {
                align: "center"
            });
        }

        // ---- the three detail rows, beside the icons already in the artwork ----
        // ⚠️ rowMax is a WIDTH, not a right-hand edge - and getting those two
        // confused is exactly what put the address over the football. The rows
        // start at x = 0.20, so a "width" of 0.55 wrapped at 0.75 of the
        // canvas, well inside the ball.
        //
        // BALL_LEFT was measured off the artwork: scanning the template for the
        // first sustained bright pixel across the rows' vertical band puts the
        // ball's edge at about 0.65. Backed off to 0.62 so a descender or a
        // wide glyph doesn't graze it.
        //
        // Computed per row from that row's own x, so moving a row in layout
        // mode adjusts its wrap point automatically rather than needing this
        // number changed again.
        const BALL_LEFT = 0.62;
        const widthFor = (key) => Math.max(120, CANVAS_W * (BALL_LEFT - P[key].x));

        const training = [f.trainingDay, f.trainingTime].filter(Boolean).join(" ");
        if (training) {
            this.text(ctx, "rowHead", "TRAINING", YELLOW, { font: BODY });
            this.text(ctx, "row1", training.toUpperCase(), WHITE, { font: BODY, maxWidth: widthFor("row1") });
        }
        // Two lines rather than one shrunk one - an address is the longest
        // thing on the poster and the least forgiving when it gets small.
        if (f.location) {
            this.text(ctx, "row2", String(f.location).toUpperCase(), WHITE,
                { font: BODY, maxWidth: widthFor("row2"), lines: 2, leading: 1.15 });
        }
        if (f.extraLine) {
            this.text(ctx, "row3", f.extraLine.toUpperCase(), WHITE,
                { font: BODY, maxWidth: widthFor("row3"), lines: 2, leading: 1.15 });
        }

        // ---- phone icon on the bottom swoosh ----
        const ph = P.phone;
        const r = ph.size / 2;
        this._boxes.phone = { x: CANVAS_W * ph.x - r, y: CANVAS_H * ph.y - r, w: r * 2, h: r * 2 };
        ctx.save();
        ctx.translate(CANVAS_W * ph.x, CANVAS_H * ph.y);
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = INK;
        ctx.fill();
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = Math.max(2, r * 0.14);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(-r * 0.32, -r * 0.40);
        ctx.lineTo(-r * 0.06, -r * 0.14);
        ctx.quadraticCurveTo(0, r * 0.02, r * 0.12, r * 0.10);
        ctx.lineTo(r * 0.40, r * 0.36);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-r * 0.32, -r * 0.40);
        ctx.lineTo(-r * 0.02, -r * 0.52);
        ctx.moveTo(r * 0.40, r * 0.36);
        ctx.lineTo(r * 0.52, r * 0.06);
        ctx.stroke();
        ctx.restore();

        // ---- contact ----
        if (f.contactName) {
            this.text(ctx, "contact", "CONTACT " + String(f.contactName).toUpperCase() + " ON", INK,
                { font: BODY });
        }
        if (f.contactPhone) {
            this.text(ctx, "tel", String(f.contactPhone), INK, { font: BODY });
        }
    }
}

if (!customElements.get("manager-hub-recruit")) {
    customElements.define("manager-hub-recruit", ManagerHubRecruit);
}

// =====================================================================
//  PAGE CODE CONTRACT
// =====================================================================
//  IN — {loading:true} first, then getRecruitContext()'s payload plus:
//    {
//      teamName, ageGroup, trainingDay, trainingTime, trainingLocation,
//      trainingPitch, managerName, managerPhone,
//      positions: [{ value, label }],   // ClubDictionary "position"
//      seasons: ["2026/27", …],         // ClubDictionary "season"
//      season: "2026/27",               // the current one, preselected
//      publishing: bool, error: "", sent: "", fatal: ""
//    }
//
//  OUT:
//    on("publishPoster", e => …)
//        // { positions[], position, season, extraLine,
//        //   toWebsite, toFacebook, imageBase64 }
//        // imageBase64 is a raw JPEG, no data: prefix.
//    on("posterError", e => …)   // { message } - canvas tainted, see header
//    on("cancelRecruit", () => …)
//
//  ⚠️ TEMPLATE_URL and CREST_URL at the top of this file must be the
//  https://static.wixstatic.com URLs. Blank is safe - the poster draws on a
//  plain ground so the layout still works - but it won't look right.
// =====================================================================
