// =====================================================================
//  <parent-hub-registration> — Parent Hub v2, Registration form
// =====================================================================
//  The big one: an 8-step wizard, ~23 required fields, conditional
//  sections, two file uploads and a completion gate, replacing roughly 60
//  native elements that each had to be positioned twice.
//
//  SETUP IN THE EDITOR:
//    1. Public -> custom-elements -> new file `parentHubRegistration.js`.
//    2. On stateRegistration: Add -> Embed Code -> Custom Element.
//       Tag name: parent-hub-registration   Element ID: #customRegistration
//    3. Height ~1100px to start. It self-sizes after first paint, but the
//       Editor value is what shows until then.
//
//  ⚠️ REPUBLISH *AND* HARD-REFRESH after any change - these styles live
//  inside this .js file, so a cached copy means cached CSS. Desktop and
//  mobile cache separately.
//
//  WHAT THE ELEMENT OWNS vs WHAT PAGE CODE OWNS
//  --------------------------------------------
//  Element: every input value, step navigation, progress %, per-step
//  completion, required-field highlighting, and the 100% submit gate. It
//  can compute all of that because it holds all the values - none of it
//  needs a round trip.
//
//  Page code: persistence only. It sends the player's saved values in once,
//  and receives saveDraft / submitForm / uploadFile events back.
//
//  PREFILL IS APPLIED ONCE PER PLAYER, keyed on player.id. Repaints happen
//  whenever a save resolves or an upload lands, and re-applying prefill on
//  every repaint would wipe whatever the parent had half-typed. Same lesson
//  as the Find My Child panel on Home.
//
//  UPLOADS fire the moment a file is chosen, not at submit. The element
//  shrinks images through a canvas first (a raw phone photo is 3-8MB and
//  base64 adds ~33%), sends the payload out, and holds the returned URL for
//  the final payload. Proven working 2026-08-16 - see backend/mediaUpload.jsw.
// =====================================================================

const MAX_IMAGE_DIMENSION = 1200;
const JPEG_QUALITY = 0.85;
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

// Order fixed 2026-08-11: Family before Emergency, because Emergency's
// "use Parent 2's details" option needs Parent 2 to already exist.
const STEPS = [
    { key: "player",      title: "Player" },
    { key: "yourDetails", title: "Your Details" },
    { key: "family",      title: "Family" },
    { key: "emergency",   title: "Emergency" },
    { key: "medicalKit",  title: "Medical & Kit" },
    { key: "documents",   title: "Documents" },
    { key: "consent",     title: "Consent" },
    { key: "confirm",     title: "Confirm" }
];

const EMERG_SOURCE_PARENT1 = "parent1";
const EMERG_SOURCE_PARENT2 = "parent2";
const EMERG_SOURCE_NEW = "new";

// ⚠️ DUPLICATED from parentHubMore.js - custom elements are loaded in
// isolation and can't import from one another. If either document is
// re-uploaded, change the URL in BOTH files.
const CONDUCT_DOCS = {
    parent: "https://1c00880a-6270-4919-8229-495712cbb5ef.usrfiles.com/ugd/1c0088_51ddc8501b69413e939ceb1786e67202.docx",
    player: "https://1c00880a-6270-4919-8229-495712cbb5ef.usrfiles.com/ugd/1c0088_e56806d042c64866a5cd0c57490d40aa.docx"
};

const STYLES = `
  :host { display: block; width: 100%; font-family: 'Work Sans', -apple-system, BlinkMacSystemFont, sans-serif; }
  * { box-sizing: border-box; }

  .wrap {
    --surface:#FFFFFF; --raised:#FFFFFF; --pitch:#1F5136; --pitch-soft:#DCE9E0;
    --line:#E1E4DB; --line-soft:#ECEEE8;
    --text:#16212F; --text-muted:#5C6B7A; --text-faint:#8B98A3;
    --success:#158A45; --success-bg:#E4F5EA;
    --warning:#9A6200; --warning-bg:#FEF3DE;
    --critical:#C23B3B; --critical-bg:#FCEAEA;
    --gold:#C8A24B;
    color: var(--text);
    display: flex; flex-direction: column;
  }

  /* ---------- step pills ---------- */
  /* Horizontally scrollable on a phone rather than wrapping to three rows -
     the bar stays one line tall so the form below it doesn't jump around as
     the active pill changes. */
  .pills {
    display: flex; gap: 6px; overflow-x: auto; padding: 14px 16px 12px;
    scrollbar-width: none; -ms-overflow-style: none;
  }
  .pills::-webkit-scrollbar { display: none; }
  @media (min-width: 750px) { .pills { flex-wrap: wrap; overflow-x: visible; padding: 18px 24px 14px; } }

  .pill {
    flex: 0 0 auto; font-family: inherit; font-size: 11.5px; font-weight: 600;
    padding: 7px 12px; border-radius: 999px; cursor: pointer; white-space: nowrap;
    background: var(--surface); color: var(--text-muted);
    border: 1px solid var(--line);
  }
  .pill:hover { border-color: var(--text-faint); color: var(--text); }
  .pill:focus-visible { outline: 2px solid var(--pitch); outline-offset: 2px; }
  .pill[aria-current="true"] { background: var(--pitch); border-color: var(--pitch); color: #fff; }
  /* A tick means "every required field on that step is filled" - it is NOT
     "you have visited this step". Visiting tells the parent nothing. */
  .pill.done::before { content: "✓ "; color: var(--success); font-weight: 700; }
  .pill[aria-current="true"].done::before { color: #BFE8CE; }

  /* ---------- step body ---------- */
  .body { padding: 4px 16px 20px; }
  @media (min-width: 750px) { .body { padding: 6px 24px 24px; } }

  .step { display: none; }
  .step.active { display: block; }

  .step-head { margin: 0 0 4px; font-size: 18px; font-weight: 700; letter-spacing: -0.2px; }
  .step-intro { margin: 0 0 16px; font-size: 12.5px; color: var(--text-muted); line-height: 1.55; }

  /* ---------- fields ---------- */
  .field { margin-bottom: 14px; }
  .field > label, .group > .glabel {
    display: block; font-size: 11.5px; font-weight: 600;
    color: var(--text-muted); margin-bottom: 5px;
  }
  .req::after { content: " *"; color: var(--critical); }

  .field input, .field select, .field textarea {
    width: 100%; font-family: inherit; font-size: 14.5px; padding: 11px 12px;
    border: 1.5px solid var(--line); border-radius: 8px;
    background: var(--surface); color: var(--text);
  }
  .field textarea { resize: vertical; min-height: 84px; }
  .field input:focus, .field select:focus, .field textarea:focus {
    outline: none; border-color: var(--pitch);
  }
  .field input[disabled], .field select[disabled] {
    background: var(--line-soft); color: var(--text-muted); cursor: not-allowed;
  }
  .field input[readonly] { background: var(--line-soft); }

  /* iOS Safari zooms the page when an input under 16px takes focus and never
     zooms back out. On a phone, correctness beats matching the mockup. */
  @media (max-width: 749px) {
    .field input, .field select, .field textarea { font-size: 16px; }
  }

  /* Mobile Safari gives a date input an intrinsic width from the date format
     plus the calendar indicator, and it BEATS width:100% - so it grows past
     the card padding and sits across the border. min-width:0 is what lets it
     shrink. Looked fine on desktop; only reproduced on a real phone. */
  .field input[type="date"] {
    -webkit-appearance: none; appearance: none;
    min-width: 0; max-width: 100%; display: block;
  }
  .field input[type="date"]::-webkit-date-and-time-value { text-align: left; margin: 0; }
  .field input[type="date"]::-webkit-calendar-picker-indicator { margin-left: 0; margin-right: 0; }

  .field.bad input, .field.bad select, .field.bad textarea {
    border-color: var(--critical); background: var(--critical-bg);
  }
  .hint { font-size: 11px; color: var(--text-faint); margin-top: 5px; line-height: 1.45; }

  /* Read-only facts the club supplies - shown, never edited. A disabled
     input would imply it might become editable; this is plainly not a field. */
  .readonly-row {
    display: flex; justify-content: space-between; gap: 14px;
    padding: 9px 0; border-bottom: 1px solid var(--line-soft); font-size: 13px;
  }
  .readonly-row:last-of-type { border-bottom: none; }
  .readonly-row span:first-child { color: var(--text-muted); }
  .readonly-row span:last-child { font-weight: 600; text-align: right; overflow-wrap: anywhere; }

  /* ---------- radios ---------- */
  .group { margin-bottom: 14px; }
  .radios { display: flex; gap: 8px; flex-wrap: wrap; }
  .radio {
    flex: 1 1 auto; min-width: 96px; position: relative;
  }
  .radio input { position: absolute; opacity: 0; width: 1px; height: 1px; }
  .radio span {
    display: block; text-align: center; cursor: pointer;
    font-size: 13px; font-weight: 600; padding: 10px 12px;
    border: 1.5px solid var(--line); border-radius: 9px;
    background: var(--surface); color: var(--text-muted);
  }
  .radio input:checked + span {
    border-color: var(--pitch); background: var(--pitch-soft); color: var(--pitch);
  }
  .radio input:focus-visible + span { outline: 2px solid var(--pitch); outline-offset: 2px; }
  .group.bad .radio span { border-color: var(--critical); }

  /* ---------- conditional blocks ---------- */
  .cond { display: none; padding: 14px; margin-bottom: 14px; border-radius: 11px; background: var(--line-soft); }
  .cond.show { display: block; }
  .cond > .clabel { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: var(--text-faint); margin-bottom: 10px; }

  /* ---------- checkboxes ---------- */
  .check { display: flex; gap: 10px; align-items: flex-start; margin-bottom: 12px; cursor: pointer; }
  .check input { flex-shrink: 0; width: 19px; height: 19px; margin: 1px 0 0; accent-color: var(--pitch); }
  .check span { font-size: 13px; line-height: 1.5; }

  /* Groups a checkbox with its document link so the two read as one item,
     and the link doesn't drift toward the next question. */
  .conduct { margin-bottom: 14px; }
  .conduct .check { margin-bottom: 0; }

  /* Deliberately OUTSIDE the <label>. Inside it, tapping the link would also
     toggle the checkbox - so a parent opening the document to read it would
     silently be recorded as having agreed to it. */
  .doc-link {
    display: inline-block; margin: 5px 0 0 29px;
    font-size: 12.5px; font-weight: 600; color: var(--pitch);
    text-decoration: underline; text-underline-offset: 2px;
  }
  .doc-link:hover { opacity: .8; }
  .check.bad span { color: var(--critical); }

  /* ---------- uploads ---------- */
  .upload { border: 1.5px dashed var(--line); border-radius: 11px; padding: 16px; text-align: center; margin-bottom: 14px; }
  .upload.bad { border-color: var(--critical); background: var(--critical-bg); }
  .upload .utitle { font-size: 13px; font-weight: 700; margin-bottom: 3px; }
  .upload .usub { font-size: 11.5px; color: var(--text-muted); margin-bottom: 11px; line-height: 1.45; }
  .upload input[type="file"] { position: absolute; width: 1px; height: 1px; opacity: 0; }
  .upload label {
    display: inline-block; cursor: pointer; font-size: 13px; font-weight: 600;
    padding: 9px 18px; border: 1.5px solid var(--pitch); border-radius: 999px; color: var(--pitch);
  }
  .upload label:hover { background: var(--pitch-soft); }
  .upload input[type="file"]:focus-visible + label { outline: 2px solid var(--pitch); outline-offset: 2px; }
  .upload img { display: none; max-width: 150px; border-radius: 8px; margin: 12px auto 0; }
  .upload img.show { display: block; }
  .ustatus { font-size: 11.5px; margin-top: 9px; line-height: 1.45; }
  .ustatus.ok { color: var(--success); font-weight: 600; }
  .ustatus.bad { color: var(--critical); font-weight: 600; }

  /* ---------- address lookup ---------- */
  .addr-search { display: flex; gap: 8px; align-items: stretch; }
  .addr-search input { flex: 1 1 auto; min-width: 0; text-transform: uppercase; }
  .addr-search button {
    flex: 0 0 auto; font-family: inherit; font-size: 13px; font-weight: 600;
    padding: 0 16px; border-radius: 8px; cursor: pointer;
    background: var(--pitch); color: #fff; border: none;
  }
  .addr-search button[disabled] { opacity: 0.55; cursor: default; }
  .addr-pick { display: none; margin-top: 8px; }
  .addr-pick.show { display: block; }
  /* The manual box is always reachable - a provider outage or a new-build
     address missing from the database must never stop a registration. */
  .addr-manual { display: none; margin-top: 8px; }
  .addr-manual.show { display: block; }
  .addr-chosen {
    display: none; margin-top: 8px; padding: 10px 12px; border-radius: 8px;
    background: var(--pitch-soft); font-size: 13px; line-height: 1.5;
  }
  .addr-chosen.show { display: block; }
  .addr-chosen .change {
    display: block; margin-top: 6px; background: none; border: none; padding: 0;
    font-family: inherit; font-size: 11.5px; font-weight: 600;
    color: var(--pitch); text-decoration: underline; cursor: pointer;
  }

  /* ---------- consent ---------- */
  .consent-box { border: 1px solid var(--line); border-radius: 12px; padding: 16px; }
  .consent-state { font-size: 13px; font-weight: 700; margin-bottom: 10px; }
  .consent-state.done { color: var(--success); }
  .consent-state.partial { color: var(--warning); }
  .consent-list { list-style: none; margin: 0 0 14px; padding: 0; }
  .consent-list li {
    display: flex; justify-content: space-between; gap: 12px;
    padding: 8px 0; border-bottom: 1px solid var(--line-soft);
    font-size: 12.5px; line-height: 1.4;
  }
  .consent-list li:last-child { border-bottom: none; }
  .consent-list .ans { flex-shrink: 0; font-weight: 700; }
  .consent-list .ans.yes { color: var(--success); }
  /* "No" to photos or social is a genuine preference, not an error - it must
     not read as a problem to be fixed. */
  .consent-list .ans.no { color: var(--text-muted); }
  .consent-list .ans.none { color: var(--critical); }
  .group.bad .consent-box, .consent-box.bad { border-color: var(--critical); }

  /* ---------- return note ---------- */
  .return-note {
    display: none; padding: 13px 14px; border-radius: 11px; margin-bottom: 16px;
    background: var(--critical-bg); border: 1px solid #E88; color: #8E2C2C;
    font-size: 13px; line-height: 1.5;
  }
  .return-note.show { display: block; }
  .return-note strong { display: block; margin-bottom: 4px; }

  /* ---------- confirm gate ---------- */
  .gate {
    display: none; margin-top: 14px; padding: 14px;
    border-radius: 11px; background: var(--success-bg);
  }
  .gate.show { display: block; }
  .locked {
    display: none; padding: 13px 14px; border-radius: 11px; margin-top: 14px;
    background: var(--warning-bg); color: var(--warning);
    font-size: 12.5px; line-height: 1.5;
  }
  .locked.show { display: block; }

  /* ---------- bottom step bar ---------- */
  /* Sits under the step body, NOT fixed to the viewport - the topbar and
     this bar are both page-level in v2, which is what removed v1's
     masterPage/session-storage bridge. */
  .stepbar {
    border-top: 1px solid var(--line); padding: 12px 16px 4px;
    display: flex; flex-direction: column; gap: 10px;
  }
  @media (min-width: 750px) { .stepbar { padding: 14px 24px 6px; } }

  .progress-mini .prow { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 5px; }
  .progress-mini .lbl { font-size: 11px; color: var(--text-muted); }
  .progress-mini .pct { font-size: 11px; font-weight: 700; color: var(--text-muted); }
  .progress-mini .pct.full { color: var(--success); }
  .progress-track { height: 5px; border-radius: 3px; background: var(--line-soft); overflow: hidden; }
  .progress-fill { height: 100%; background: var(--gold); border-radius: 3px; transition: width 0.3s ease; }
  .progress-fill.full { background: var(--success); }

  .navrow { display: flex; gap: 8px; }
  .btn {
    flex: 1 1 auto; font-family: inherit; font-size: 13.5px; font-weight: 600;
    padding: 12px 14px; border-radius: 9px; border: 1px solid transparent;
    cursor: pointer; text-align: center;
  }
  .btn.primary { background: var(--pitch); color: #fff; }
  .btn.secondary { background: var(--surface); color: var(--pitch); border-color: var(--line); }
  .btn.ghost { background: none; color: var(--text-muted); border-color: var(--line); flex: 0 1 auto; }
  .btn[disabled] { opacity: 0.55; cursor: default; }
  .btn:focus-visible { outline: 2px solid var(--pitch); outline-offset: 2px; }
  .btn[hidden] { display: none; }

  .savemsg { font-size: 12px; text-align: center; min-height: 16px; padding-bottom: 6px; }
  .savemsg.ok { color: var(--success); font-weight: 600; }
  .savemsg.bad { color: var(--critical); font-weight: 600; }

  .loading { padding: 40px 16px; text-align: center; font-size: 13px; color: var(--text-muted); }

  @media (prefers-color-scheme: dark) {
    .wrap {
      --surface:#0E1826; --raised:#121F30;
      --line:#223145; --line-soft:#1A2739;
      --text:#E7ECF2; --text-muted:#A6B4C3; --text-faint:#71818F;
      --pitch:#5FBF8B; --pitch-soft:#17301F;
      --success:#5FD08B; --success-bg:#103322;
      --warning:#E5B567; --warning-bg:#3A2C10;
      --critical:#F08A8A; --critical-bg:#3A1414;
      --gold:#D8B968;
    }
    .btn.primary { color: #06120C; }
    .pill[aria-current="true"] { color: #06120C; }
    .return-note { border-color: #6E2E2E; color: #F2A6A6; }
  }

  /* Clearance for the bottom nav bar, which is pinned over the content on
     mobile. Without this the last item sits under it and can't be scrolled
     into view - the page rubber-bands back the moment you let go. Desktop
     puts the nav in a left rail, so nothing is covering the bottom there. */
  @media (max-width: 749px) {
    .wrap { padding-bottom: calc(84px + env(safe-area-inset-bottom, 0px)); }
  }
`;

function esc(value) {
    return String(value == null ? "" : value)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;")
        .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function kb(bytes) {
    if (!bytes && bytes !== 0) return "—";
    return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

// Downscale through a canvas before encoding. This is what makes uploading
// from a custom element viable at all: it turns an 8MB camera photo into a
// few hundred KB, before base64 adds another third.
async function shrinkImage(file) {
    if (!/^image\//.test(file.type) || typeof createImageBitmap !== "function") return null;
    try {
        const bitmap = await createImageBitmap(file);
        const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        if (bitmap.close) bitmap.close();
        const blob = await new Promise(res => canvas.toBlob(res, "image/jpeg", JPEG_QUALITY));
        // A small PNG can come out bigger as a JPEG - keep whichever wins.
        return (blob && blob.size < file.size) ? blob : null;
    } catch (err) {
        console.error("parent-hub-registration: image shrink failed, sending original", err);
        return null;
    }
}

function toBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
        reader.onerror = () => reject(new Error("Could not read that file."));
        reader.readAsDataURL(blob);
    });
}

// One address field: postcode search, a picker of real addresses, a chosen
// summary, and a manual box that is ALWAYS available.
//
// The chosen address fills the manual textarea as its formatted string, which
// is what makes this a small change rather than a large one: `in${key}` stays
// the single source of "is this field filled", so requiredFor(), isFilled(),
// the progress % and collect() all keep working untouched. The structured
// object is held alongside it for the CMS.
function addressFieldHtml(key, label, required, hint) {
    return `
      <div class="field" id="f${key}">
        <label class="${required ? "req" : ""}">${esc(label)}</label>

        <div class="addr-chosen" id="chosen${key}">
          <span id="chosenText${key}"></span>
          <button type="button" class="change" id="change${key}">Change address</button>
        </div>

        <button type="button" class="btn secondary" id="find${key}" style="width:100%">Find address</button>
        <button type="button" class="btn-text" id="manual${key}">Enter it manually instead</button>

        <div class="addr-manual" id="man${key}">
          <textarea id="in${key}" rows="3" placeholder="House number and street&#10;Town&#10;Postcode"></textarea>
        </div>

        ${hint ? `<div class="hint">${esc(hint)}</div>` : ""}
      </div>`;
}

function optionsHtml(list, placeholder) {
    const opts = Array.isArray(list) ? list : [];
    return `<option value="">${esc(placeholder || "Please choose…")}</option>` +
        opts.map(o => `<option value="${esc(o.value)}">${esc(o.label)}</option>`).join("");
}

function yesNo(name, yesLabel, noLabel) {
    return `
      <div class="radios">
        <label class="radio"><input type="radio" name="${name}" value="true"><span>${esc(yesLabel || "Yes")}</span></label>
        <label class="radio"><input type="radio" name="${name}" value="false"><span>${esc(noLabel || "No")}</span></label>
      </div>`;
}

class ParentHubRegistration extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._built = false;
        this._data = { loading: true };
        this._step = 0;
        this._loadedPlayerId = null;
        this._uploads = { headshot: { url: "", busy: false }, idDoc: { url: "", busy: false } };
        // Tri-state, set only by the ConsentRegistration Lightbox. null means
        // never answered, which must read differently from a real "No".
        this._consent = { photo: null, social: null, fa: null, medical: null };
        // Structured address per field, when one was picked from the Lightbox.
        // null means "typed by hand" - we then save the text only, because we
        // can't vouch for a postcode nobody verified.
        this._addressData = { Address: null, ParentAddress: null, SecAddress: null };
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
            const height = Math.ceil(wrap.getBoundingClientRect().height);
            if (height && height !== this._lastHeight) {
                this._lastHeight = height;
                this.style.height = height + "px";
            }
        });
        this._resizeObserver.observe(wrap);
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (!this._built) this.build();
        if (name !== "data" || !newValue) return;
        try {
            const parsed = JSON.parse(newValue);
            if (parsed && typeof parsed === "object") {
                this._data = parsed;
                this.applyData();
            }
        } catch (err) {
            console.error("parent-hub-registration: couldn't parse data attribute", err);
        }
    }

    $(id) { return this.shadowRoot.getElementById(id); }

    // -----------------------------------------------------------------
    //  BUILD — once. Everything after this is targeted updates, because
    //  a rebuild would wipe every value the parent has typed.
    // -----------------------------------------------------------------
    build() {
        if (this._built) return;
        this._built = true;

        this.shadowRoot.innerHTML = `
          <style>${STYLES}</style>
          <div class="wrap">
            <div class="loading" id="loading">Loading the registration form…</div>

            <div id="form" style="display:none">
              <div class="pills" id="pills" role="tablist"></div>
              <div class="body">
                ${this.stepPlayerHtml()}
                ${this.stepYourDetailsHtml()}
                ${this.stepFamilyHtml()}
                ${this.stepEmergencyHtml()}
                ${this.stepMedicalKitHtml()}
                ${this.stepDocumentsHtml()}
                ${this.stepConsentHtml()}
                ${this.stepConfirmHtml()}
              </div>

              <div class="stepbar">
                <div class="progress-mini">
                  <div class="prow">
                    <span class="lbl" id="stepLabel">Step 1 of 8</span>
                    <span class="pct" id="pctLabel">0% complete</span>
                  </div>
                  <div class="progress-track"><div class="progress-fill" id="progressFill" style="width:0%"></div></div>
                </div>
                <div class="savemsg" id="saveMsg"></div>
                <div class="navrow">
                  <button type="button" class="btn secondary" id="btnBack">Back</button>
                  <button type="button" class="btn ghost" id="btnSaveDraft">Save Draft</button>
                  <button type="button" class="btn primary" id="btnNext">Next</button>
                </div>
              </div>
            </div>
          </div>`;

        this.buildPills();
        this.wire();
        this.showStep(0);
    }

    buildPills() {
        const pills = this.$("pills");
        pills.innerHTML = STEPS.map((s, i) =>
            `<button type="button" class="pill" role="tab" data-step="${i}" id="pill${i}">${esc(s.title)}</button>`
        ).join("");
        pills.addEventListener("click", (event) => {
            const btn = event.target.closest("[data-step]");
            if (btn) this.showStep(Number(btn.getAttribute("data-step")));
        });
    }

    // ---------- step markup ----------
    stepPlayerHtml() {
        return `
        <section class="step" id="step0">
          <h3 class="step-head">Player details</h3>
          <p class="step-intro">The club has filled in what it already knows. Add the missing details below.</p>

          <div class="return-note" id="returnNote">
            <strong>The club sent this form back</strong>
            <span id="returnNoteText"></span>
          </div>

          <div class="readonly-row"><span>Name</span><span id="roName">—</span></div>
          <div class="readonly-row"><span>FAN Number</span><span id="roFan">—</span></div>
          <div class="readonly-row"><span>Membership No.</span><span id="roMembership">—</span></div>
          <div class="readonly-row"><span>Team</span><span id="roTeam">—</span></div>
          <div class="readonly-row"><span>Manager</span><span id="roManager">—</span></div>

          <div style="height:16px"></div>

          <div class="field" id="fDob">
            <label class="req" for="inDob">Date of birth</label>
            <input id="inDob" type="date" />
          </div>
          <div class="field" id="fGender">
            <label class="req" for="inGender">Gender</label>
            <select id="inGender"></select>
          </div>
          <div class="field" id="fInitials">
            <label for="inInitials">Initials</label>
            <input id="inInitials" type="text" maxlength="5" autocomplete="off" />
            <div class="hint">As they should appear on kit, if applicable.</div>
          </div>
          <div class="group" id="gPlayerType">
            <span class="glabel">Will they be playing matches, or training only?</span>
            ${yesNo("playerType", "Training only", "Playing matches")}
          </div>
        </section>`;
    }

    stepYourDetailsHtml() {
        return `
        <section class="step" id="step1">
          <h3 class="step-head">Your details</h3>
          <p class="step-intro">You are the main contact for this player. These details are used by the club and your child's team manager.</p>

          <div class="field" id="fParentName">
            <label for="inParentName">Your full name</label>
            <input id="inParentName" type="text" autocomplete="name" />
          </div>
          <div class="field" id="fParentMobile">
            <label for="inParentMobile">Your mobile number</label>
            <input id="inParentMobile" type="tel" autocomplete="tel" />
          </div>
          <div class="field" id="fParentEmail">
            <label for="inParentEmail">Your email address</label>
            <input id="inParentEmail" type="email" autocomplete="email" />
            <div class="hint" id="parentEmailHint"></div>
          </div>
          <div class="field" id="fParentRelation">
            <label class="req" for="inParentRelation">Your relationship to the player</label>
            <select id="inParentRelation"></select>
          </div>
          <div class="field" id="fParentDob">
            <label class="req" for="inParentDob">Your date of birth</label>
            <input id="inParentDob" type="date" />
            <div class="hint">Required by the FA for the adult responsible for the player.</div>
          </div>
          ${addressFieldHtml("Address", "Player's home address", true, "")}
          ${addressFieldHtml("ParentAddress", "Your address, if different", false, "Leave blank if it's the same as the player's.")}
        </section>`;
    }

    stepFamilyHtml() {
        return `
        <section class="step" id="step2">
          <h3 class="step-head">Family</h3>
          <p class="step-intro">A second parent or guardian can be given their own login to see this player in their Parent Hub.</p>

          <div class="group" id="gAddSecond">
            <span class="glabel">Add a second parent or guardian?</span>
            ${yesNo("addSecond")}
          </div>

          <div class="cond" id="condSecond">
            <div class="clabel">Second parent / guardian</div>
            <div class="field" id="fSecName">
              <label class="req" for="inSecName">Full name</label>
              <input id="inSecName" type="text" autocomplete="off" />
            </div>
            <div class="field" id="fSecMobile">
              <label class="req" for="inSecMobile">Mobile number</label>
              <input id="inSecMobile" type="tel" autocomplete="off" />
            </div>
            <div class="field" id="fSecEmail">
              <label class="req" for="inSecEmail">Email address</label>
              <input id="inSecEmail" type="email" autocomplete="off" />
              <div class="hint">They'll use this address to sign in and see this player.</div>
            </div>
            <div class="field" id="fSecRelation">
              <label class="req" for="inSecRelation">Relationship to the player</label>
              <select id="inSecRelation"></select>
            </div>
            <div class="field" id="fSecDob">
              <label class="req" for="inSecDob">Date of birth</label>
              <input id="inSecDob" type="date" />
            </div>
            ${addressFieldHtml("SecAddress", "Address, if different", false, "Leave blank if it's the same as the player's.")}
          </div>

          <div class="group" id="gBothParents">
            <span class="glabel">Does the player live with both parents?</span>
            ${yesNo("bothParents")}
          </div>

          <div class="group" id="gSibling">
            <span class="glabel req">Does the player have a sibling at the club?</span>
            ${yesNo("sibling")}
          </div>

          <div class="cond" id="condSibling">
            <div class="field" id="fSiblingTeam">
              <label class="req" for="inSiblingTeam">Which team is their sibling in?</label>
              <select id="inSiblingTeam"></select>
            </div>
          </div>
        </section>`;
    }

    stepEmergencyHtml() {
        return `
        <section class="step" id="step3">
          <h3 class="step-head">Emergency contact</h3>
          <p class="step-intro">Who should the club call if there's a problem at a match or training and you can't be reached?</p>

          <div class="field" id="fEmergSource">
            <label for="inEmergSource">Use details from</label>
            <select id="inEmergSource">
              <option value="${EMERG_SOURCE_NEW}">Someone else</option>
              <option value="${EMERG_SOURCE_PARENT1}">You (parent 1)</option>
              <option value="${EMERG_SOURCE_PARENT2}">Second parent</option>
            </select>
          </div>

          <!-- Stays VISIBLE when a parent is selected, with the fields
               disabled rather than hidden. v1 collapsed this box, which meant
               a stale mobile number could silently become the emergency
               contact with nobody seeing it. -->
          <div class="field" id="fEmergName">
            <label class="req" for="inEmergName">Contact name</label>
            <input id="inEmergName" type="text" autocomplete="off" />
          </div>
          <div class="field" id="fEmergMobile">
            <label class="req" for="inEmergMobile">Contact mobile</label>
            <input id="inEmergMobile" type="tel" autocomplete="off" />
          </div>
          <div class="field" id="fEmergRelation">
            <label class="req" for="inEmergRelation">Relationship to the player</label>
            <select id="inEmergRelation"></select>
          </div>
        </section>`;
    }

    stepMedicalKitHtml() {
        return `
        <section class="step" id="step4">
          <h3 class="step-head">Medical &amp; kit</h3>
          <p class="step-intro">Anything the coaches need to know, and the sizes we'll order kit in.</p>

          <div class="group" id="gMedical">
            <span class="glabel req">Does the player have any medical conditions or allergies?</span>
            ${yesNo("medical")}
          </div>

          <div class="cond" id="condMedical">
            <div class="field" id="fMedicalInfo">
              <label class="req" for="inMedicalInfo">Please give details</label>
              <textarea id="inMedicalInfo" rows="4"></textarea>
              <div class="hint">Include anything a coach would need to act on, and any medication carried.</div>
            </div>
          </div>

          <div class="field" id="fShirt"><label class="req" for="inShirt">Shirt size</label><select id="inShirt"></select></div>
          <div class="field" id="fShorts"><label class="req" for="inShorts">Shorts size</label><select id="inShorts"></select></div>
          <div class="field" id="fCoat"><label class="req" for="inCoat">Coat size</label><select id="inCoat"></select></div>
          <div class="field" id="fHoodie"><label class="req" for="inHoodie">Hoodie size</label><select id="inHoodie"></select></div>
          <div class="field" id="fSocks"><label class="req" for="inSocks">Sock size</label><select id="inSocks"></select></div>
        </section>`;
    }

    stepDocumentsHtml() {
        return `
        <section class="step" id="step5">
          <h3 class="step-head">Documents</h3>
          <p class="step-intro">The FA requires a photo of the player and their birth certificate. You can take a photo now or choose a file.</p>

          <div class="upload" id="upHeadshot">
            <div class="utitle">Player headshot</div>
            <div class="usub">Head and shoulders, facing the camera, clear and on a white background. No hat or sunglasses.</div>
            <input type="file" id="fileHeadshot" accept="image/jpeg,image/png,image/webp" />
            <label for="fileHeadshot" id="labelHeadshot">Choose or take a photo</label>
            <img id="previewHeadshot" alt="Current headshot" />
            <div class="ustatus" id="statusHeadshot"></div>
          </div>

          <div class="upload" id="upIdDoc">
            <div class="utitle">Birth certificate</div>
            <div class="usub">A clear photo of the certificate is fine — it just needs the date of birth to be readable.</div>
            <input type="file" id="fileIdDoc" accept="image/jpeg,image/png,image/webp,application/pdf" />
            <label for="fileIdDoc" id="labelIdDoc">Choose or take a photo</label>
            <img id="previewIdDoc" alt="Current document" />
            <div class="ustatus" id="statusIdDoc"></div>
          </div>
        </section>`;
    }

    // Consent stays in the shared ConsentRegistration Lightbox rather than
    // being inlined here. A Lightbox is a separate overlay page, not part of
    // this state's layout, so keeping it costs nothing in per-breakpoint
    // positioning - and the same Lightbox is opened from four places (v2
    // registration, v2 profile, and v1 twice). Inlining the wording would
    // make a fifth copy of near-legal text, free to drift from the others.
    stepConsentHtml() {
        return `
        <section class="step" id="step6">
          <h3 class="step-head">Consent</h3>
          <p class="step-intro">
            Four permissions the club needs from you. You can change your answers at any
            time from the player's profile.
          </p>

          <div class="consent-box" id="consentBox">
            <div class="consent-state" id="consentState">Not yet answered</div>
            <ul class="consent-list" id="consentList"></ul>
            <button type="button" class="btn primary" id="btnConsent" style="width:100%">
              Review &amp; Confirm Consent
            </button>
          </div>
        </section>`;
    }

    stepConfirmHtml() {
        return `
        <section class="step" id="step7">
          <h3 class="step-head">Confirm and submit</h3>
          <p class="step-intro">Almost there. Please read and agree to the two codes of conduct.
             Opening one won't lose anything you've filled in.</p>

          <div class="conduct">
            <label class="check" id="chkParentWrap">
              <input type="checkbox" id="chkParent" />
              <span>I have read and agree to the <strong>Parent / Guardian Code of Conduct</strong>.</span>
            </label>
            <a class="doc-link" href="${CONDUCT_DOCS.parent}" target="_blank" rel="noopener">
              Read the Parent Code of Conduct ↗
            </a>
          </div>

          <div class="conduct">
            <label class="check" id="chkPlayerWrap">
              <input type="checkbox" id="chkPlayer" />
              <span>I have read the <strong>Player Code of Conduct</strong> with my child and they agree to it.</span>
            </label>
            <a class="doc-link" href="${CONDUCT_DOCS.player}" target="_blank" rel="noopener">
              Read the Player Code of Conduct ↗
            </a>
          </div>

          <div class="locked" id="gateLocked">
            The final confirmation unlocks once the form is 100% complete. Any step
            without a tick still has something missing.
          </div>

          <div class="gate" id="gateOpen">
            <label class="check" id="chkConfirmWrap">
              <input type="checkbox" id="chkConfirm" />
              <span>I confirm the information in this form is correct to the best of my knowledge.</span>
            </label>
            <div class="field" id="fSignature">
              <label for="inSignature">Type your full name to sign</label>
              <input id="inSignature" type="text" autocomplete="name" />
            </div>
            <button type="button" class="btn primary" id="btnSubmit" style="width:100%">Submit Registration</button>
          </div>
        </section>`;
    }

    // -----------------------------------------------------------------
    //  WIRING
    // -----------------------------------------------------------------
    wire() {
        const $ = (id) => this.$(id);

        // Any change anywhere recalculates progress and clears the field's
        // red state - one delegated listener rather than ~40 individual ones.
        this.shadowRoot.addEventListener("input", (e) => this.onFieldChange(e));
        this.shadowRoot.addEventListener("change", (e) => this.onFieldChange(e));

        $("btnBack").addEventListener("click", () => this.showStep(this._step - 1));

        // Next ALSO saves a draft - a safety net, so a parent who fills three
        // steps and then closes the tab hasn't lost them. Navigation happens
        // first and never waits on the save: a failed autosave must not trap
        // someone on a step. `auto: true` lets page code report it quietly
        // rather than taking over the button.
        $("btnNext").addEventListener("click", () => {
            this.showStep(this._step + 1);
            const payload = this.collect();
            payload.auto = true;
            this.dispatchEvent(new CustomEvent("saveDraft", { detail: payload }));
        });

        $("btnSaveDraft").addEventListener("click", () => {
            const payload = this.collect();
            payload.auto = false;
            this.dispatchEvent(new CustomEvent("saveDraft", { detail: payload }));
        });

        // One handler set per address field. All three behave identically -
        // Find opens the Lightbox, Change reopens it, Manual reveals the
        // textarea. The textarea stays the source of truth for "is this
        // filled", so validation and progress need no special cases.
        ["Address", "ParentAddress", "SecAddress"].forEach(key => {
            // Both buttons do the same thing: open the ONE shared address
            // Lightbox. The element only says "this field wants an address" -
            // it neither knows nor cares which page the Lightbox lives on.
            const openLookup = () => {
                this.dispatchEvent(new CustomEvent("openAddressLookup", {
                    detail: { field: key, current: this._addressData[key] || null }
                }));
            };
            $("find" + key).addEventListener("click", openLookup);
            $("change" + key).addEventListener("click", openLookup);
            $("manual" + key).addEventListener("click", () => {
                $("man" + key).classList.add("show");
                $("manual" + key).style.display = "none";
                $("in" + key).focus();
                // Typing by hand means we no longer have a verified address -
                // drop the structured copy so we never save a postcode that
                // doesn't match the text the parent actually wrote.
                this._addressData[key] = null;
                this.paintAddress(key);
            });
        });

        $("btnConsent").addEventListener("click", () => {
            this.dispatchEvent(new CustomEvent("openConsent", {
                detail: Object.assign({}, this._consent)
            }));
        });
        $("btnSubmit").addEventListener("click", () => this.trySubmit());

        $("fileHeadshot").addEventListener("change", (e) => this.handleFile("headshot", e));
        $("fileIdDoc").addEventListener("change", (e) => this.handleFile("idDoc", e));

        $("inEmergSource").addEventListener("change", () => this.applyEmergencySource(true));
    }

    onFieldChange(event) {
        const el = event.target;
        if (!el) return;

        const field = el.closest(".field, .group, .check, .upload");
        if (field) field.classList.remove("bad");

        // Conditional sections open/close off the radio that controls them.
        if (el.name === "addSecond" || el.name === "sibling" || el.name === "medical") {
            this.applyConditionals();
        }
        this.refreshProgress();
    }

    applyConditionals() {
        const show = (id, on) => this.$(id).classList.toggle("show", !!on);
        show("condSecond", this.radioValue("addSecond") === "true");
        show("condSibling", this.radioValue("sibling") === "true");
        show("condMedical", this.radioValue("medical") === "true");
    }

    // Parent 1 / Parent 2 fill the three fields and DISABLE them - visible
    // but not editable, so a stale number can be seen and questioned rather
    // than silently becoming the emergency contact.
    applyEmergencySource(isUserChange) {
        const $ = (id) => this.$(id);
        const source = $("inEmergSource").value || EMERG_SOURCE_NEW;
        const lock = source !== EMERG_SOURCE_NEW;

        if (source === EMERG_SOURCE_PARENT1) {
            $("inEmergName").value = $("inParentName").value;
            $("inEmergMobile").value = $("inParentMobile").value;
            $("inEmergRelation").value = $("inParentRelation").value;
        } else if (source === EMERG_SOURCE_PARENT2) {
            $("inEmergName").value = $("inSecName").value;
            $("inEmergMobile").value = $("inSecMobile").value;
            $("inEmergRelation").value = $("inSecRelation").value;
        } else if (isUserChange) {
            // Only clear on a real user change - genuinely saved "someone
            // else" details must survive a reload.
            $("inEmergName").value = "";
            $("inEmergMobile").value = "";
            $("inEmergRelation").value = "";
        }

        ["inEmergName", "inEmergMobile", "inEmergRelation"].forEach(id => { $(id).disabled = lock; });
        this.refreshProgress();
    }

    radioValue(name) {
        const checked = this.shadowRoot.querySelector(`input[name="${name}"]:checked`);
        return checked ? checked.value : null;
    }

    setRadio(name, value) {
        const target = (value === true || value === "true") ? "true"
            : (value === false || value === "false") ? "false" : null;
        this.shadowRoot.querySelectorAll(`input[name="${name}"]`).forEach(r => {
            r.checked = target !== null && r.value === target;
        });
    }

    // -----------------------------------------------------------------
    //  DATA IN
    // -----------------------------------------------------------------
    applyData() {
        const d = this._data;
        const $ = (id) => this.$(id);

        $("loading").style.display = d.loading ? "" : "none";
        $("form").style.display = d.loading ? "none" : "";
        if (d.loading) return;

        if (d.options) this.applyOptions(d.options);

        const player = d.player || {};
        // Prefill applies ONCE per player. Repaints happen on every save and
        // upload; re-applying would wipe whatever is half-typed.
        if (player.id && player.id !== this._loadedPlayerId) {
            this._loadedPlayerId = player.id;
            this.applyPlayer(player);
        }

        // Consent is the exception to the once-per-player rule: it arrives
        // AFTER the Lightbox closes, which is always mid-session.
        if (d.consent) {
            const c = d.consent;
            this._consent = {
                photo: c.photo == null ? null : !!c.photo,
                social: c.social == null ? null : !!c.social,
                fa: c.fa == null ? null : !!c.fa,
                medical: c.medical == null ? null : !!c.medical
            };
        }

        // A Lightbox result, like consent, arrives mid-session and so sits
        // outside the once-per-player prefill rule.
        if (d.addressResult && d.addressResult.field) {
            const key = d.addressResult.field;
            const addr = d.addressResult.address;
            if (addr && addr.formatted) {
                this._addressData[key] = addr;
                this.$("in" + key).value = addr.formatted;
                this.$("man" + key).classList.remove("show");
                this.$("f" + key).classList.remove("bad");
            }
        }

        this.paintSaveState();
        this.paintUploads();
        this.paintConsent();
        ["Address", "ParentAddress", "SecAddress"].forEach(k => this.paintAddress(k));
        this.refreshProgress();
    }

    // Shows either the chosen-address summary or the search box, never both.
    paintAddress(key) {
        const $ = (id) => this.$(id);
        const structured = this._addressData[key];
        const typed = String($("in" + key).value || "").trim();
        const manualOpen = $("man" + key).classList.contains("show");

        $("chosen" + key).classList.toggle("show", !!structured);
        if (structured) $("chosenText" + key).textContent = structured.formatted || typed;

        // The search box goes once an address is chosen (Change brings it
        // back) and while the manual box is open - one way forward at a time.
        const hideSearch = !!structured || manualOpen;
        $("find" + key).style.display = hideSearch ? "none" : "";
        $("manual" + key).style.display = hideSearch ? "none" : "";
        // A hand-typed address keeps its box open so it stays editable.
        if (typed && !structured) $("man" + key).classList.add("show");
    }

    paintConsent() {
        const rows = [
            ["Photography at club events", this._consent.photo],
            ["Photos on club social media", this._consent.social],
            ["Registration with the FA", this._consent.fa],
            ["Emergency medical treatment", this._consent.medical]
        ];
        const answered = rows.filter(r => r[1] !== null).length;
        const agreed = rows.filter(r => r[1] === true).length;

        this.$("consentList").innerHTML = rows.map(([label, value]) => {
            const cls = value === true ? "yes" : value === false ? "no" : "none";
            const text = value === true ? "Agreed" : value === false ? "Declined" : "Not answered";
            return `<li><span>${esc(label)}</span><span class="ans ${cls}">${text}</span></li>`;
        }).join("");

        const state = this.$("consentState");
        if (answered < 4) {
            state.className = "consent-state partial";
            state.textContent = `${answered} of 4 answered — review needed`;
        } else {
            state.className = "consent-state done";
            // Declining photos or social media is a genuine preference, so
            // "4 of 4 answered" is a complete state, not a partial one.
            state.textContent = agreed === 4 ? "All 4 answered ✓" : `All 4 answered ✓ (${agreed} agreed)`;
        }
        this.$("btnConsent").textContent = answered === 4
            ? "Review or change your answers"
            : "Review & Confirm Consent";
    }

    applyOptions(options) {
        const set = (id, list, placeholder) => {
            const el = this.$(id);
            const keep = el.value;
            el.innerHTML = optionsHtml(list, placeholder);
            if (keep) el.value = keep;
        };
        set("inGender", options.gender);
        set("inParentRelation", options.relationship);
        set("inSecRelation", options.relationship);
        set("inEmergRelation", options.relationship);
        set("inShirt", options.shirt_size);
        set("inShorts", options.shorts_size);
        set("inCoat", options.coat_size);
        set("inHoodie", options.hoodie_size);
        set("inSocks", options.sock_size);
        set("inSiblingTeam", options.teams, "Choose a team…");
    }

    applyPlayer(p) {
        const $ = (id) => this.$(id);
        const text = (id, v) => { $(id).textContent = v || "—"; };
        const val = (id, v) => { $(id).value = v == null ? "" : v; };

        text("roName", p.fullName);
        text("roFan", p.fanNumber || "(In Progress)");
        text("roMembership", p.membershipNo || "(Assigned on first save)");
        text("roTeam", p.teamName);
        text("roManager", p.managerName);

        $("returnNote").classList.toggle("show", !!p.returnNote);
        $("returnNoteText").textContent = p.returnNote || "";

        val("inDob", p.dob);
        val("inGender", p.gender);
        val("inInitials", p.initials);
        this.setRadio("playerType", p.trainingOnly);

        val("inParentName", p.parentName);
        val("inParentMobile", p.parentMobile);
        val("inParentEmail", p.parentEmail);
        // Editable when blank so a parent with no address on file can supply
        // one; readOnly (not disabled) when set, so it stays legible.
        $("inParentEmail").readOnly = !!p.parentEmail;
        $("parentEmailHint").textContent = p.parentEmail
            ? "To change this, use More → My Details."
            : "We don't have an email for you yet — please add one.";
        val("inParentRelation", p.parentRelation);
        val("inParentDob", p.parentDob);
        val("inAddress", p.address);
        val("inParentAddress", p.parentAddress);

        this.setRadio("addSecond", p.hasSecondParent);
        val("inSecName", p.secName);
        val("inSecMobile", p.secMobile);
        val("inSecEmail", p.secEmail);
        val("inSecRelation", p.secRelation);
        val("inSecDob", p.secDob);
        val("inSecAddress", p.secAddress);

        this.setRadio("bothParents", p.bothParents);
        this.setRadio("sibling", p.hasSibling);
        val("inSiblingTeam", p.siblingTeam);

        val("inEmergSource", p.emergSource || EMERG_SOURCE_NEW);
        val("inEmergName", p.emergName);
        val("inEmergMobile", p.emergMobile);
        val("inEmergRelation", p.emergRelation);

        this.setRadio("medical", p.hasMedical);
        val("inMedicalInfo", p.medicalInfo);
        val("inShirt", p.shirt);
        val("inShorts", p.shorts);
        val("inCoat", p.coat);
        val("inHoodie", p.hoodie);
        val("inSocks", p.socks);

        this._uploads.headshot.url = p.headshotUrl || "";
        this._uploads.idDoc.url = p.idDocUrl || "";

        this._consent = {
            photo: p.consentPhoto == null ? null : !!p.consentPhoto,
            social: p.consentSocial == null ? null : !!p.consentSocial,
            fa: p.consentFa == null ? null : !!p.consentFa,
            medical: p.consentMedical == null ? null : !!p.consentMedical
        };

        $("chkParent").checked = !!p.conductParent;
        $("chkPlayer").checked = !!p.conductPlayer;
        $("chkConfirm").checked = !!p.confirmCorrect;
        val("inSignature", p.signature);

        // A hand-typed address comes back from the CMS as a plain string; a
        // picked one arrives as an object. Seed accordingly.
        [["Address", p.addressStructured], ["ParentAddress", p.parentAddressStructured],
         ["SecAddress", p.secAddressStructured]].forEach(([key, val]) => {
            this._addressData[key] = (val && val.formatted) ? val : null;
        });

        this.applyConditionals();
        this.applyEmergencySource(false);
    }

    // -----------------------------------------------------------------
    //  PROGRESS & VALIDATION
    // -----------------------------------------------------------------
    //  Required fields per step, mirroring requiredFieldsForStep() in the
    //  native version. Returns element ids so the same list drives the
    //  progress count, the step ticks and the red highlighting.
    requiredFor(stepIndex) {
        switch (STEPS[stepIndex].key) {
            case "player": return ["inDob", "inGender"];
            // inParentAddress is deliberately NOT required - blank means
            // "same as the player's".
            case "yourDetails": return ["inAddress", "inParentRelation", "inParentDob"];
            case "family": {
                const ids = ["radio:sibling"];
                if (this.radioValue("addSecond") === "true") {
                    ids.push("inSecName", "inSecMobile", "inSecEmail", "inSecRelation", "inSecDob");
                }
                if (this.radioValue("sibling") === "true") ids.push("inSiblingTeam");
                return ids;
            }
            case "emergency": return ["inEmergName", "inEmergMobile", "inEmergRelation"];
            case "medicalKit": {
                const ids = ["radio:medical", "inShirt", "inShorts", "inCoat", "inHoodie", "inSocks"];
                if (this.radioValue("medical") === "true") ids.push("inMedicalInfo");
                return ids;
            }
            case "documents": return ["upload:headshot", "upload:idDoc"];
            case "consent": return ["consent:photo", "consent:social", "consent:fa", "consent:medical"];
            case "confirm": return ["check:chkParent", "check:chkPlayer"];
        }
        return [];
    }

    isFilled(ref) {
        if (ref.startsWith("radio:")) return this.radioValue(ref.slice(6)) !== null;
        if (ref.startsWith("check:")) return this.$(ref.slice(6)).checked === true;
        if (ref.startsWith("upload:")) return !!this._uploads[ref.slice(7)].url;
        if (ref.startsWith("consent:")) return this._consent[ref.slice(8)] !== null;
        const el = this.$(ref);
        return !!(el && String(el.value || "").trim());
    }

    refreshProgress() {
        let total = 0, done = 0;
        STEPS.forEach((s, i) => {
            const refs = this.requiredFor(i);
            const complete = refs.every(r => this.isFilled(r));
            refs.forEach(r => { total++; if (this.isFilled(r)) done++; });
            this.$("pill" + i).classList.toggle("done", complete && refs.length > 0);
        });

        const pct = total === 0 ? 0 : Math.min(100, Math.round((done / total) * 100));
        this.$("progressFill").style.width = pct + "%";
        this.$("progressFill").classList.toggle("full", pct === 100);
        // The exact number matters because submission is gated at 100% - a
        // bar sitting at 94% looks "basically full", leaving the parent with
        // no idea why the confirmation box hasn't appeared.
        this.$("pctLabel").textContent = pct === 100 ? "100% — ready to submit" : `${pct}% complete`;
        this.$("pctLabel").classList.toggle("full", pct === 100);

        this.$("gateOpen").classList.toggle("show", pct === 100);
        this.$("gateLocked").classList.toggle("show", pct !== 100);
        if (pct !== 100) {
            this.$("chkConfirm").checked = false;
            this.$("inSignature").value = "";
        }
        this._progress = pct;
        return pct;
    }

    showStep(index) {
        const next = Math.max(0, Math.min(STEPS.length - 1, index));
        this._step = next;
        STEPS.forEach((s, i) => {
            this.$("step" + i).classList.toggle("active", i === next);
            this.$("pill" + i).setAttribute("aria-current", String(i === next));
        });
        this.$("stepLabel").textContent = `Step ${next + 1} of ${STEPS.length}`;
        this.$("btnBack").hidden = next === 0;
        this.$("btnNext").hidden = next === STEPS.length - 1;
        this.refreshProgress();
        // Scroll the element itself into view, not the inner step - the page
        // is what scrolls, and a parent tapping Next on a long step would
        // otherwise land halfway down the next one.
        this.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    // Marks every missing required field red and jumps to the first step
    // that has one - a red field on a hidden step is invisible.
    highlightMissing() {
        let firstStep = -1;
        STEPS.forEach((s, i) => {
            this.requiredFor(i).forEach(ref => {
                if (this.isFilled(ref)) return;
                if (firstStep === -1) firstStep = i;
                let el = null;
                if (ref.startsWith("radio:")) el = this.shadowRoot.querySelector(`input[name="${ref.slice(6)}"]`);
                else if (ref.startsWith("check:")) el = this.$(ref.slice(6));
                else if (ref.startsWith("upload:")) el = this.$(ref.slice(7) === "headshot" ? "upHeadshot" : "upIdDoc");
                else if (ref.startsWith("consent:")) el = this.$("consentBox");
                else el = this.$(ref);
                const box = el && (el.closest(".field, .group, .check, .upload") || el);
                if (box && box.classList) box.classList.add("bad");
            });
        });
        if (firstStep >= 0) this.showStep(firstStep);
        return firstStep;
    }

    trySubmit() {
        if (this.refreshProgress() !== 100) {
            this.highlightMissing();
            return;
        }
        if (!this.$("chkConfirm").checked) {
            this.$("chkConfirmWrap").classList.add("bad");
            return;
        }
        if (!this.$("inSignature").value.trim()) {
            this.$("fSignature").classList.add("bad");
            return;
        }
        this.dispatchEvent(new CustomEvent("submitForm", { detail: this.collect() }));
    }

    // -----------------------------------------------------------------
    //  UPLOADS — fire on selection, not at submit, so the URL is already
    //  in hand by the time the parent reaches step 8.
    // -----------------------------------------------------------------
    async handleFile(field, event) {
        const file = event.target.files && event.target.files[0];
        if (!file) return;

        const statusId = field === "headshot" ? "statusHeadshot" : "statusIdDoc";
        const status = this.$(statusId);
        status.className = "ustatus";
        status.textContent = "Preparing…";

        try {
            const shrunk = await shrinkImage(file);
            const blob = shrunk || file;
            const mimeType = shrunk ? "image/jpeg" : (file.type || "application/octet-stream");

            if (blob.size > MAX_UPLOAD_BYTES) {
                status.className = "ustatus bad";
                status.textContent = `That file is ${kb(blob.size)}, over the 4MB limit. Please use a smaller file.`;
                return;
            }

            const base64 = await toBase64(blob);
            const fileName = shrunk ? file.name.replace(/\.[^.]+$/, "") + ".jpg" : file.name;

            this._uploads[field].busy = true;
            status.className = "ustatus";
            status.textContent = `Uploading ${kb(blob.size)}…`;

            this.dispatchEvent(new CustomEvent("uploadFile", {
                detail: { field, base64, fileName, mimeType }
            }));
        } catch (err) {
            status.className = "ustatus bad";
            status.textContent = err.message || "Could not read that file.";
        }
    }

    paintUploads() {
        const results = (this._data && this._data.uploads) || {};
        ["headshot", "idDoc"].forEach(field => {
            const reply = results[field];
            if (reply && reply.state) {
                this._uploads[field].busy = false;
                if (reply.state === "ok" && reply.url) this._uploads[field].url = reply.url;
            }

            const status = this.$(field === "headshot" ? "statusHeadshot" : "statusIdDoc");
            const preview = this.$(field === "headshot" ? "previewHeadshot" : "previewIdDoc");
            const url = this._uploads[field].url;

            if (reply && reply.state === "error") {
                status.className = "ustatus bad";
                status.textContent = reply.error || "Upload failed. Please try again.";
            } else if (url) {
                status.className = "ustatus ok";
                status.textContent = "Saved ✓";
            }

            // A wix:image:// URI can't be used as an <img> src directly, so
            // page code sends a displayable URL alongside it when it has one.
            const displayUrl = (reply && reply.displayUrl) || "";
            if (displayUrl) {
                preview.src = displayUrl;
                preview.classList.add("show");
            } else if (!url) {
                preview.classList.remove("show");
            }
        });
    }

    paintSaveState() {
        const state = (this._data.saveState || "idle").toLowerCase();
        const msg = this.$("saveMsg");
        const draft = this.$("btnSaveDraft");
        const submit = this.$("btnSubmit");

        const busy = state === "saving" || state === "submitting";
        draft.disabled = busy;
        draft.textContent = state === "saving" ? "Saving…" : "Save Draft";
        submit.disabled = busy;
        submit.textContent = state === "submitting" ? "Submitting…" : "Submit Registration";

        msg.className = "savemsg" + (state === "saved" ? " ok" : state === "error" ? " bad" : "");
        msg.textContent = this._data.saveMessage || "";
    }

    // -----------------------------------------------------------------
    //  DATA OUT — one flat object, names chosen to map cleanly onto the
    //  CMS fields in page code. The element never sees a CMS key.
    // -----------------------------------------------------------------
    collect() {
        const $ = (id) => this.$(id);
        const v = (id) => $(id).value;
        const tri = (name) => {
            const val = this.radioValue(name);
            return val === null ? null : val === "true";
        };

        return {
            playerId: this._loadedPlayerId,
            dob: v("inDob"),
            gender: v("inGender"),
            initials: v("inInitials"),
            trainingOnly: tri("playerType"),

            parentName: v("inParentName"),
            parentMobile: v("inParentMobile"),
            parentEmail: v("inParentEmail"),
            parentRelation: v("inParentRelation"),
            parentDob: v("inParentDob"),
            address: v("inAddress"),
            addressStructured: this._addressData.Address,
            parentAddressStructured: this._addressData.ParentAddress,
            secAddressStructured: this._addressData.SecAddress,
            parentAddress: v("inParentAddress"),

            hasSecondParent: tri("addSecond"),
            secName: v("inSecName"),
            secMobile: v("inSecMobile"),
            secEmail: v("inSecEmail"),
            secRelation: v("inSecRelation"),
            secDob: v("inSecDob"),
            secAddress: v("inSecAddress"),

            bothParents: tri("bothParents"),
            hasSibling: tri("sibling"),
            siblingTeam: v("inSiblingTeam"),

            emergSource: v("inEmergSource"),
            emergName: v("inEmergName"),
            emergMobile: v("inEmergMobile"),
            emergRelation: v("inEmergRelation"),

            hasMedical: tri("medical"),
            medicalInfo: v("inMedicalInfo"),
            shirt: v("inShirt"),
            shorts: v("inShorts"),
            coat: v("inCoat"),
            hoodie: v("inHoodie"),
            socks: v("inSocks"),

            headshotUrl: this._uploads.headshot.url,
            idDocUrl: this._uploads.idDoc.url,

            // null when never answered - a Save Draft before the parent has
            // reached this step must not silently record "No".
            consentPhoto: this._consent.photo,
            consentSocial: this._consent.social,
            consentFa: this._consent.fa,
            consentMedical: this._consent.medical,

            conductParent: $("chkParent").checked,
            conductPlayer: $("chkPlayer").checked,
            confirmCorrect: $("chkConfirm").checked,
            signature: v("inSignature"),
            progress: this._progress || 0
        };
    }
}

if (!customElements.get("parent-hub-registration")) {
    customElements.define("parent-hub-registration", ParentHubRegistration);
}

// =====================================================================
//  PAGE CODE CONTRACT
// =====================================================================
//  IN — set {loading:true} first, then one payload:
//
//    $w("#customRegistration").setAttribute("data", JSON.stringify({
//        player: { id, fullName, fanNumber, membershipNo, teamName, managerName,
//                  returnNote, dob, gender, initials, trainingOnly,
//                  parentName, parentMobile, parentEmail, parentRelation,
//                  parentDob, address, parentAddress,
//                  hasSecondParent, secName, secMobile, secEmail, secRelation,
//                  secDob, secAddress, bothParents, hasSibling, siblingTeam,
//                  emergSource, emergName, emergMobile, emergRelation,
//                  hasMedical, medicalInfo, shirt, shorts, coat, hoodie, socks,
//                  headshotUrl, idDocUrl,
//                  consentPhoto, consentSocial, consentFa, consentMedical,
//                  conductParent, conductPlayer, confirmCorrect, signature },
//        options: { gender:[], relationship:[], shirt_size:[], shorts_size:[],
//                   coat_size:[], hoodie_size:[], sock_size:[], teams:[] },
//        uploads: { headshot: {state,url,displayUrl,error}, idDoc: {...} },
//        saveState: "idle"|"saving"|"saved"|"submitting"|"error",
//        saveMessage: ""
//    }));
//
//  `player.id` is what triggers prefill. Change it and the form reloads;
//  keep it the same and repaints leave typed values alone.
//
//  Dates are "YYYY-MM-DD" strings both ways - <input type="date"> produces
//  them and mapUItoPlayer already wants them, so no Date objects anywhere.
//
//  Consent also comes in on its own, OUTSIDE the once-per-player rule,
//  because it arrives after the Lightbox closes:
//    consent: { photo, social, fa, medical }   // true | false | null
//
//  OUT:
//    on("saveDraft",   e => …)   // e.detail = the whole form
//    on("submitForm",  e => …)   // only fires at 100% + confirmed + signed
//    on("uploadFile",  e => …)   // { field:"headshot"|"idDoc", base64, fileName, mimeType }
//    on("openConsent", e => …)   // e.detail = current { photo, social, fa, medical }
//
//  saveDraft fires from the Save Draft button AND from Next. `detail.auto`
//  distinguishes them - true means it was the Next autosave, so report it
//  quietly rather than taking over the button. Navigation never waits on it.
//
//  openConsent handler:
//    const result = await wixWindow.openLightbox("ConsentRegistration", e.detail);
//    if (result) { /* merge into the data payload as `consent` and re-send */ }
//  The Lightbox stays shared with stateProfile and both v1 flows - the
//  consent wording lives in one place, not five.
//
//  The element does ALL validation, progress and gating itself. Page code
//  never needs to ask it anything - it persists what it's given and reports
//  back through saveState / uploads.
// =====================================================================
