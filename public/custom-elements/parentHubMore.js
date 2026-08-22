// =====================================================================
//  <parent-hub-more> — Parent Hub v2, More tab
// =====================================================================
//  Second custom element in this project, and the one that actually tests
//  the pattern: parentHubMessages.js was read-only mock data with no page
//  code at all. This one reads real CMS data, takes text input, and saves
//  back - so it exercises the whole in-and-out contract.
//
//  SETUP IN THE EDITOR (one time):
//    1. This repo does NOT sync to the site. Create the file in the Editor:
//       Public & Backend -> Public -> custom-elements -> new file
//       `parentHubMore.js`, then paste this in.
//    2. On stateMore2: Add -> Embed Code -> *Custom Element*. Not "Embed
//       HTML" - that's an iframe and asks you to paste code directly.
//    3. Tag name, exactly:  parent-hub-more
//    4. Point its source at the file from step 1.
//    5. Element ID:  #customMore
//    6. Give the element plenty of height - custom elements do NOT auto-size
//       in Wix and overflow silently clips. ~700px is a sane starting point;
//       trim it once you see the real content.
//
//  ACCOUNT ROWS ARE IN HERE (changed 2026-08-16). Log Out and Visit Our
//  Website used to be native Wix buttons underneath, so that a render
//  failure couldn't trap a parent on a page with no header or footer. They
//  now live inside the element, because keeping them outside meant hand-
//  positioning two buttons in the mobile editor on every layout change -
//  which is the exact manual work this approach exists to remove.
//
//  The accepted risk: if this file fails to load, there is no visible way
//  off the page. Two things blunt it -
//    - Visit Our Website is a plain <a href>, so it works even if every
//      other bit of JS in here throws.
//    - build() is wrapped in try/catch and falls back to a bare pair of
//      account links, so a bug in the rich UI can't take the exits with it.
//  Neither helps if Wix fails to serve the file at all. If you want cover
//  for that too, keep a native #btnLogout2 on the page as a backstop - the
//  page code still wires it and simply no-ops when it isn't there.
//
//  Renders fully on its own mock data, so you can build and eyeball it in
//  the Editor before writing a line of page code.
//
//  ⚠️ CHANGES DON'T SHOW UNTIL YOU REPUBLISH *AND* HARD-REFRESH. These
//  styles live inside this .js file, so a cached copy of the file means
//  cached CSS - saving in the Editor is not enough. Desktop and mobile
//  cache separately, so one can look fixed while the other doesn't. If a
//  change appears not to have worked, check for a STRUCTURAL difference
//  first (is the squad name on its own line?) - that tells you whether your
//  code is running at all, which a styling tweak never can. On a phone,
//  private/incognito is faster than fighting the cache.
// =====================================================================

// ---------------------------------------------------------------------
//  CONFIG — the bits with no CMS behind them. Safe to edit by hand.
// ---------------------------------------------------------------------
//  Documents are just links to PDFs you've uploaded to the Media Manager.
//  Right-click the file in Media Manager -> Copy URL. `meta` is the small
//  grey line under the title - use it for "PDF · Updated Jul 2026" so
//  parents can tell at a glance whether they're looking at this season's.
const DOCUMENTS = [
    { label: "Parent Code of Conduct", meta: "PDF · Updated Mar 2026", url: "https://1c00880a-6270-4919-8229-495712cbb5ef.usrfiles.com/ugd/1c0088_51ddc8501b69413e939ceb1786e67202.docx" },
    { label: "Player Code of Conduct", meta: "PDF · Updated Mar 2026", url: "https://1c00880a-6270-4919-8229-495712cbb5ef.usrfiles.com/ugd/1c0088_e56806d042c64866a5cd0c57490d40aa.docx" }
];

// Where "Visit Our Website" goes. A relative path keeps it correct on the
// live site, the test site and any preview domain - an absolute URL would
// bounce testers onto production. Page code can override it by setting the
// `websiteurl` attribute if the hub ever needs to point somewhere else.
const SITE_URL = "/";

// Shown until page code pushes real data in - and in the Editor, where no
// page code runs at all. Not a fallback for live failures: if the CMS
// lookup returns nothing, the real thing renders an empty state instead of
// silently showing a fake secretary.
const MOCK = {
    me: { name: "Sarah Whitfield", phone: "07700 900123", email: "sarah.w@example.com" },
    teamContacts: [
        {
            teamName: "First Team U11",
            managerName: "Michael Turner — Team Manager",
            managerPhone: "07700 900456",
            managerEmail: "m.turner@example.com"
        }
    ],
    officials: [
        { role: "Secretary", fullName: "Club Secretary", mobile: "", emailAddress: "secretary@signolathletic.co.uk" },
        { role: "Chairman", fullName: "David Rowe", mobile: "07700 900789", emailAddress: "chair@signolathletic.co.uk" }
    ]
};

// ---------------------------------------------------------------------
//  STYLES — lifted from the mockup's token set so this matches the rest
//  of the hub. Change a --token once and everything using it follows.
//  The dark block at the bottom overrides some of these; if a colour looks
//  right in the Editor and wrong on a phone at night, that's why.
// ---------------------------------------------------------------------
//  FONTS: a custom element is real page DOM, not an iframe, so fonts Wix
//  has already loaded for the site work in here. But Wix only loads a font
//  if something on the page uses it - if no native element on Parent Hub v2
//  is set in Work Sans / Barlow Condensed, you'll silently get the fallback.
//  Either drop one hidden text element on the page in each font to force
//  the load, or swap these for fonts the page already uses.
const STYLES = `
  :host { display: block; width: 100%; font-family: 'Work Sans', -apple-system, BlinkMacSystemFont, sans-serif; }
  * { box-sizing: border-box; }

  .wrap {
    --surface:#FFFFFF; --pitch:#1F5136; --pitch-soft:#DCE9E0;
    --line:#E1E4DB; --line-soft:#ECEEE8;
    --text:#16212F; --text-muted:#5C6B7A; --text-faint:#8B98A3;
    --success:#22C55E; --success-bg:#E8F8EE;
    --critical:#EF4444; --critical-bg:#FCEAEA;
    padding: 16px 16px 32px;
    color: var(--text);
  }
  @media (min-width: 750px) { .wrap { padding: 22px 28px 32px; } }

  .section-title {
    font-size: 11px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.6px; color: var(--text-faint); margin: 22px 0 10px;
  }
  .section-title:first-child { margin-top: 0; }

  /* ---------- rows (contacts, documents) ---------- */
  /* Rows are <a>, <button> or <div> depending on what they do, so the button
     defaults (background, border, font, centred text) all need resetting -
     otherwise a copy row renders as a grey system button. */
  .row {
    display: flex; align-items: center; gap: 12px; padding: 13px 0;
    border: none; border-top: 1px solid var(--line-soft);
    text-decoration: none; color: inherit;
    width: 100%; text-align: left; background: none;
    font-family: inherit; font-size: inherit;
  }
  .row.first { border-top: none; }
  /* Not scoped to .row - contact rows put the tap action on an inner
     .row-main instead, and both need the same affordance. */
  .tappable { cursor: pointer; }
  .tappable:hover .txt strong { color: var(--pitch); }
  .tappable:focus-visible { outline: 2px solid var(--pitch); outline-offset: 2px; border-radius: 6px; }
  /* Scoped to .contact so the copy flash greens the value line only - the
     context line above it (squad name) should stay put. */
  .row.copied .txt .detail.contact { color: var(--success); font-weight: 600; }

  /* ---------- split contact rows ---------- */
  /* A contact row is two independent controls: tap the body to call/email,
     tap the button to copy. That can't be one element - a <button> nested
     inside an <a> is invalid and behaves unpredictably - so the row becomes
     a plain container and the padding moves onto the halves. */
  .row.split { padding: 0; gap: 4px; }
  .row-main {
    display: flex; align-items: center; gap: 12px;
    flex: 1; min-width: 0; padding: 13px 0;
    border: none; background: none; text-align: left;
    text-decoration: none; color: inherit;
    font-family: inherit; font-size: inherit;
  }
  .copy-btn {
    flex-shrink: 0; width: 40px; align-self: stretch;
    display: flex; align-items: center; justify-content: center;
    border: none; background: none; padding: 0; cursor: pointer;
    color: var(--text-faint);
  }
  .copy-btn:hover { color: var(--pitch); }
  .copy-btn:focus-visible { outline: 2px solid var(--pitch); outline-offset: -2px; border-radius: 6px; }
  .copy-btn svg { width: 15px; height: 15px; }
  .row.copied .copy-btn { color: var(--success); }

  .edit-label {
    font-size: 11.5px; font-weight: 600; color: var(--text-muted);
    flex-shrink: 0; letter-spacing: 0.2px;
  }
  .caret svg { transition: transform 0.18s ease; }
  .row.open .caret svg { transform: rotate(180deg); }

  .icon {
    width: 36px; height: 36px; border-radius: 9px; flex-shrink: 0;
    background: var(--line-soft); color: var(--text-muted);
    display: flex; align-items: center; justify-content: center;
  }
  .icon svg { width: 17px; height: 17px; }

  .txt { min-width: 0; flex: 1; }
  .txt strong { display: block; font-size: 13.5px; color: var(--text); font-weight: 700; line-height: 1.3; }
  .txt span {
    display: block; font-size: 11.5px; color: var(--text-muted); line-height: 1.4;
  }
  /* GENERAL RULE for these rows: wrap, don't truncate. A clamped email reads
     "m.turne…", which is worse than showing nothing - you can't tell whose it
     is, can't read it, can't copy it by eye. Clamping is only acceptable for
     text where the first few words carry the meaning.

     Was previously clamped to ONE line above 750px on the assumption desktop
     had room. It doesn't: this element sits in a column, not the full window,
     and the row spends ~110px of its width on the icon, gaps and copy button
     before any text is laid out. Fixed 2026-08-16.

     3 lines, not 2, and only as a backstop against one pathological value
     blowing the row height out - normal content wraps well inside it.
     overflow-wrap:anywhere is what lets a long unbroken address break at
     all; without it an email just overflows its box. */
  .txt .detail {
    display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;
    overflow: hidden; overflow-wrap: anywhere;
  }
  /* Multi-line details: context ("First Team U11") on its own line above the
     contact values, so the email starts at the left margin with a full line
     to itself instead of picking up whatever space is left after the phone. */
  .txt .detail + .detail { margin-top: 2px; }
  .txt .detail.context { color: var(--text-faint); }
  .chev { color: var(--text-faint); flex-shrink: 0; display: flex; }
  .chev svg { width: 15px; height: 15px; }

  .empty { padding: 10px 0 4px; font-size: 12.5px; color: var(--text-muted); }

  /* ---------- account rows ---------- */
  /* Log Out gets the red icon treatment - not because it's destructive, but
     because it's the one row here a parent must never hit by accident while
     aiming for the row above it. */
  .row.warn .icon { background: var(--critical-bg); color: var(--critical); }
  .row[aria-busy="true"] { opacity: 0.6; pointer-events: none; }

  /* Shown only if the logout event goes unanswered - see armLogoutWatchdog. */
  .escape { display: none; padding: 10px 0 2px; font-size: 12px; color: var(--critical); line-height: 1.5; }
  .escape.show { display: block; }
  .escape a { color: var(--pitch); font-weight: 600; }

  /* ---------- my details edit panel ---------- */
  .panel { display: none; padding: 4px 0 2px; }
  .panel.open { display: block; }

  .field { margin-bottom: 12px; }
  .field label {
    display: block; font-size: 11.5px; font-weight: 600;
    color: var(--text-muted); margin-bottom: 5px;
  }
  .field input {
    width: 100%; font-family: inherit; font-size: 14.5px; padding: 11px 12px;
    border: 1.5px solid var(--line); border-radius: 8px;
    background: var(--surface); color: var(--text);
  }
  .field input:focus { outline: none; border-color: var(--pitch); }
  /* iOS Safari zooms the whole page when you focus an input under 16px, and
     never zooms back out. 14.5px matches the mockup on desktop; on a phone
     correctness beats matching. */
  @media (max-width: 749px) { .field input { font-size: 16px; } }
  .field.bad input { border-color: var(--critical); background: var(--critical-bg); }

  /* The club-contact vs login distinction genuinely confuses parents -
     this hint is load-bearing, not decoration. See the note in
     PARENT_HUB_V2_ELEMENTS.md under stateMore. */
  .hint { font-size: 11px; color: var(--text-faint); margin-top: 5px; line-height: 1.45; }
  .err { font-size: 11px; color: var(--critical); margin-top: 5px; display: none; }
  .field.bad .err { display: block; }

  .btn-block {
    width: 100%; font-family: inherit; font-size: 14px; font-weight: 600;
    padding: 13px; border-radius: 10px; border: none; cursor: pointer;
    margin-top: 2px; background: var(--pitch); color: #fff;
  }
  .btn-block[disabled] { opacity: 0.6; cursor: default; }

  .status { font-size: 12px; margin-top: 9px; text-align: center; min-height: 16px; }
  .status.ok { color: var(--success); }
  .status.bad { color: var(--critical); }

  @media (prefers-color-scheme: dark) {
    .wrap {
      --surface:#121F30; --line:#223145; --line-soft:#1A2739;
      --text:#E7ECF2; --text-muted:#A6B4C3; --text-faint:#71818F;
      --pitch-soft:#17301F; --success-bg:#103322; --critical-bg:#3A1414;
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

const ICONS = {
    person: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .3 2 .6 2.9a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.9.5 2.9.6a2 2 0 0 1 1.7 2Z"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>',
    doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
    // Points DOWN, and rotates 180deg when open - an accordion affordance
    // rather than the right-chevron, which reads as "go to another page".
    caret: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>',
    logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></svg>',
    external: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z"/></svg>'
};

// Everything below is CMS content typed by a person, so it all goes through
// this before touching innerHTML. Custom elements give us real HTML, which
// also means real injection risk if we're sloppy.
function esc(value) {
    return String(value == null ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

// Copy is offered on EVERY device (changed 2026-08-16). It used to be
// desktop-only, on the reasoning that a phone user always wants to dial or
// email rather than copy - which is usually true but not always, and being
// wrong about it left phone users with no way to get an address out at all.
//
// The tap-to-call/email half still is device-dependent, and has to be:
//   Touch   - tel:/mailto: are exactly right. Tap to call, tap to email.
//   Desktop - both hand off to whatever app Windows thinks should handle
//             them, so you get an "open an app?" chooser you never asked for.
//
// NOTE: read once, at script load. Switching device emulation in DevTools
// won't change it until you reload - and an emulated phone on a desktop OS
// still resolves mailto: to the desktop app chooser, which looks like a bug
// and isn't one. Test the tap actions on a real handset.
const IS_TOUCH = typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia("(pointer: coarse)").matches
    : false;

// Returns what a row offers: an optional tap target, plus a copy value.
function pickAction(phone, email) {
    const phoneValue = phone ? String(phone).trim() : "";
    const emailValue = email ? String(email).trim() : "";
    if (!phoneValue && !emailValue) return null;

    // Email wins when a row has both - it's the one you actually need on a
    // clipboard. A phone number you'd just dial.
    const copyValue = emailValue || phoneValue;
    const copyLabel = emailValue ? "Copy email address" : "Copy phone number";

    // Prefer calling over emailing on touch, for the same reason copy
    // prefers the email: it's what the device is best at.
    const href = !IS_TOUCH ? "" : (phoneValue
        ? "tel:" + phoneValue.replace(/\s+/g, "")
        : "mailto:" + emailValue);

    return { href, copyValue, copyLabel };
}

// Two controls in one row: the body calls/emails (touch only), the button
// copies (everywhere). Falls back to a flat div with neither when there's no
// contact detail at all.
// `details` is one string or an array of lines. Splitting context away from
// contact values is what stops a long email being squeezed into the tail of
// a line it has to share - see the CSS note on .detail.
function contactRow(title, details, action, iconKey, isFirst) {
    const lines = (Array.isArray(details) ? details : [details]).filter(Boolean);
    const detailHtml = lines.map((line, i) => {
        // Last line is the contact value - the one the "Copied ✓" flash
        // swaps, and the one that must never be the truncated one.
        const cls = i === lines.length - 1 ? "detail contact" : "detail context";
        return `<span class="${cls}">${esc(line)}</span>`;
    }).join("");

    const inner = `
        <div class="icon">${ICONS[iconKey]}</div>
        <div class="txt">
          <strong>${esc(title)}</strong>
          ${detailHtml}
        </div>`;

    if (!action) return `<div class="row${isFirst ? " first" : ""}">${inner}</div>`;

    const main = action.href
        ? `<a class="row-main tappable" href="${esc(action.href)}">${inner}<div class="chev">${ICONS.chevron}</div></a>`
        : `<div class="row-main">${inner}</div>`;

    // A real <button>, so it's keyboard-reachable rather than a div that
    // only answers to a mouse. Labelled, because the icon alone tells a
    // screen reader nothing about what gets copied.
    const copyBtn = `<button type="button" class="copy-btn" data-copy="${esc(action.copyValue)}"
        aria-label="${esc(action.copyLabel)}" title="${esc(action.copyLabel)}">${ICONS.copy}</button>`;

    return `<div class="row split${isFirst ? " first" : ""}">${main}${copyBtn}</div>`;
}

// Document rows always open the PDF - that IS the expected behaviour, and
// unlike tel:/mailto: it opens a tab, not an app chooser.
function documentRow(label, meta, url, isFirst) {
    return `
      <a class="row tappable${isFirst ? " first" : ""}" href="${esc(url)}" target="_blank" rel="noopener">
        <div class="icon">${ICONS.doc}</div>
        <div class="txt">
          <strong>${esc(label)}</strong>
          ${meta ? `<span class="detail">${esc(meta)}</span>` : ""}
        </div>
        <div class="chev">${ICONS.chevron}</div>
      </a>`;
}

function isValidEmail(value) {
    // Deliberately loose - just enough to catch a typo'd address, not a
    // spec-accurate RFC check. The backend is the real gate.
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
}

class ParentHubMore extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._data = MOCK;
        this._built = false;
        this._editing = false;
        this._pending = null;
        this._resizeObserver = null;
        this._lastHeight = 0;
        this._logoutTimer = null;
        this._saveTimer = null;
    }

    static get observedAttributes() { return ["data", "savestate", "savemessage", "websiteurl"]; }

    connectedCallback() {
        this.build();
        this.watchHeight();
    }

    disconnectedCallback() {
        if (this._resizeObserver) {
            this._resizeObserver.disconnect();
            this._resizeObserver = null;
        }
        clearTimeout(this._logoutTimer);
        clearTimeout(this._saveTimer);
    }

    // -----------------------------------------------------------------
    //  Self-sizing — EXPERIMENTAL
    // -----------------------------------------------------------------
    //  Wix stores a custom element's height per breakpoint and doesn't
    //  auto-size it, so content taller than the Editor value clips silently
    //  and you end up hand-tuning a number for every breakpoint - exactly
    //  the manual work this whole approach is meant to remove.
    //
    //  This measures the real rendered content and pushes that height onto
    //  the host. Whether it sticks depends on Wix's layout engine not
    //  overriding it; if it does, nothing breaks - you're back to setting
    //  the height by hand, which is where you already were.
    //
    //  Set a roughly-right height in the Editor regardless: this can only
    //  correct the height AFTER first paint.
    watchHeight() {
        if (this._resizeObserver || typeof ResizeObserver === "undefined") return;

        const wrap = this.shadowRoot.querySelector(".wrap");
        if (!wrap) return;

        this._resizeObserver = new ResizeObserver(() => {
            const height = Math.ceil(wrap.getBoundingClientRect().height);
            // .wrap is content-sized so changing the host's height doesn't
            // change it back - no feedback loop. The guard is belt-and-braces
            // against sub-pixel jitter retriggering the observer.
            if (height && height !== this._lastHeight) {
                this._lastHeight = height;
                this.style.height = height + "px";
            }
        });
        this._resizeObserver.observe(wrap);
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (!this._built) this.build();

        if (name === "data") {
            if (!newValue) return;
            try {
                const parsed = JSON.parse(newValue);
                if (parsed && typeof parsed === "object") {
                    this._data = Object.assign({}, MOCK, parsed);
                    this.paintLists();
                    this.paintMe();
                }
            } catch (err) {
                // Bad JSON shouldn't blank the tab - keep what's showing.
                console.error("parent-hub-more: couldn't parse data attribute", err);
            }
            return;
        }

        if (name === "websiteurl") {
            this.paintWebsiteUrl();
            return;
        }

        if (name === "savestate" || name === "savemessage") this.paintSaveState();
    }

    paintWebsiteUrl() {
        const url = this.getAttribute("websiteurl") || SITE_URL;
        // Both may be absent - the fallback render has neither by these IDs.
        ["linkWebsite", "escapeLink"].forEach(id => {
            const el = this.shadowRoot.getElementById(id);
            if (el) el.setAttribute("href", url);
        });
    }

    // -----------------------------------------------------------------
    //  Built ONCE. Everything after this is targeted repainting - a full
    //  innerHTML rebuild would wipe whatever the parent had half-typed.
    // -----------------------------------------------------------------
    build() {
        if (this._built) return;
        this._built = true;

        // The account rows are now the only way off this page, so a thrown
        // error anywhere in the rich UI must not take them down with it.
        // Costs nothing when everything works.
        try {
            this.buildInner();
        } catch (err) {
            console.error("parent-hub-more: build failed — falling back to account links", err);
            this.buildFallback();
        }
    }

    // Last resort: no data, no editing, just the two exits. Deliberately
    // uses no shared helpers beyond esc() so there's very little left that
    // can fail a second time.
    buildFallback() {
        const url = esc(this.getAttribute("websiteurl") || SITE_URL);
        this.shadowRoot.innerHTML = `
          <style>${STYLES}</style>
          <div class="wrap">
            <div class="section-title">Account</div>
            <div class="empty">
              Something went wrong loading this tab. Please refresh the page.
            </div>
            <a class="row tappable first" href="${url}">
              <div class="txt"><strong>Visit Our Website</strong></div>
            </a>
          </div>`;
    }

    buildInner() {
        this.shadowRoot.innerHTML = `
          <style>${STYLES}</style>
          <div class="wrap">

            <div class="section-title">My Details</div>
            <button type="button" class="row tappable first" id="meSummary" aria-expanded="false" aria-controls="mePanel">
              <div class="icon">${ICONS.person}</div>
              <div class="txt"><strong id="meName"></strong><span class="detail" id="meSub"></span></div>
              <span class="edit-label" id="meEditLabel">Edit</span>
              <div class="chev caret" id="meCaret">${ICONS.caret}</div>
            </button>

            <div class="panel" id="mePanel">
              <div class="field" id="fName">
                <label for="inName">Your full name</label>
                <input id="inName" type="text" autocomplete="name" />
                <div class="err">Please enter your name.</div>
              </div>
              <div class="field" id="fPhone">
                <label for="inPhone">Phone number</label>
                <input id="inPhone" type="tel" autocomplete="tel" />
                <div class="err">Please enter a phone number.</div>
              </div>
              <div class="field" id="fEmail">
                <label for="inEmail">Club contact email</label>
                <input id="inEmail" type="email" autocomplete="email" />
                <div class="hint">
                  This is the address the club uses to contact you. It is
                  <strong>not</strong> your login email &mdash; changing it here
                  won't change how you sign in.
                </div>
                <div class="err">That doesn't look like a valid email address.</div>
              </div>
              <button class="btn-block" id="btnSave" type="button">Save My Details</button>
              <div class="status" id="saveStatus"></div>
            </div>

            <div class="section-title">Club Contacts</div>
            <div id="contacts"></div>

            <div class="section-title">Documents</div>
            <div id="documents"></div>

            <div class="section-title">Account</div>

            <!-- Log Out can't be a link: signing out is a Velo API call, so
                 this only raises the intent and page code does the work. -->
            <button type="button" class="row tappable warn first" id="btnLogout">
              <div class="icon">${ICONS.logout}</div>
              <div class="txt">
                <strong id="logoutLabel">Log Out</strong>
                <span class="detail">Sign out of the Parent Hub</span>
              </div>
              <div class="chev">${ICONS.chevron}</div>
            </button>

            <!-- A real anchor, on purpose. No listener, no page code, no
                 event round-trip - if every other line of JS in this file
                 throws, this row still gets a parent off the page. -->
            <a class="row tappable" id="linkWebsite" href="${esc(SITE_URL)}">
              <div class="icon">${ICONS.external}</div>
              <div class="txt">
                <strong>Visit Our Website</strong>
                <span class="detail">Fixtures, news and club information</span>
              </div>
              <div class="chev">${ICONS.chevron}</div>
            </a>

            <div class="escape" id="logoutEscape">
              Couldn't sign you out — the page didn't respond.
              <a id="escapeLink" href="${esc(SITE_URL)}">Go to the main site</a>
              and use Log Out from the site menu.
            </div>

          </div>`;

        const $ = (id) => this.shadowRoot.getElementById(id);

        $("meSummary").addEventListener("click", () => {
            this._editing = !this._editing;
            $("mePanel").classList.toggle("open", this._editing);
            $("meSummary").classList.toggle("open", this._editing);
            $("meSummary").setAttribute("aria-expanded", String(this._editing));
            $("meEditLabel").textContent = this._editing ? "Close" : "Edit";
            // Opening pulls fresh values in; closing discards anything typed
            // but unsaved, same as the native version collapsing the box.
            this.paintMe();
            if (this._editing) $("inName").focus();
        });

        // Delegated, because paintLists() replaces these rows wholesale on
        // every data refresh - a listener bound per row would be lost.
        $("contacts").addEventListener("click", (event) => {
            const btn = event.target.closest("[data-copy]");
            if (!btn) return;
            this.copyToClipboard(btn);
        });

        $("btnSave").addEventListener("click", () => this.submit());
        $("btnLogout").addEventListener("click", () => this.requestLogout());

        // Clear the red state as soon as they start fixing it.
        ["fName", "fPhone", "fEmail"].forEach(fieldId => {
            const input = $(fieldId).querySelector("input");
            input.addEventListener("input", () => $(fieldId).classList.remove("bad"));
        });

        this.paintMe();
        this.paintLists();
    }

    // -----------------------------------------------------------------
    //  Repaints
    // -----------------------------------------------------------------
    paintMe() {
        const $ = (id) => this.shadowRoot.getElementById(id);
        const me = this._data.me || {};

        $("meName").textContent = me.name || "Your details";
        $("meSub").textContent = [me.phone, me.email].filter(Boolean).join(" · ") || "Tap to add your contact details";

        // Only push values into the inputs while the panel is shut. If it's
        // open the parent may be mid-edit, and a background data refresh
        // shouldn't yank the text out from under them.
        if (!this._editing) {
            $("inName").value = me.name || "";
            $("inPhone").value = me.phone || "";
            $("inEmail").value = me.email || "";
            ["fName", "fPhone", "fEmail"].forEach(f => $(f).classList.remove("bad"));
            $("saveStatus").textContent = "";
            $("saveStatus").className = "status";
        }
    }

    paintLists() {
        const teams = Array.isArray(this._data.teamContacts) ? this._data.teamContacts : [];
        const officials = Array.isArray(this._data.officials) ? this._data.officials : [];

        const rows = [];

        teams.forEach(t => {
            rows.push({
                title: t.managerName || "Manager TBC",
                // Two lines, not one joined string: squad name is context and
                // can be dimmed, phone/email are the values that must stay
                // readable in full.
                details: [
                    t.teamName,
                    [t.managerPhone, t.managerEmail].filter(Boolean).join(" · ")
                ],
                action: pickAction(t.managerPhone, t.managerEmail),
                icon: "phone"
            });
        });

        // Officials are EMAIL ONLY, deliberately - no phone number, on any
        // device. These are volunteers' personal mobiles and every parent in
        // the club can see this tab. Team managers keep their number because
        // a parent needs to reach them about a specific match at short notice.
        officials.forEach(o => {
            if (!o.emailAddress) return;
            rows.push({
                title: o.fullName ? `${o.fullName} — ${o.role}` : (o.role || "Club Official"),
                details: [o.emailAddress],
                action: pickAction("", o.emailAddress),
                icon: "mail"
            });
        });

        this.shadowRoot.getElementById("contacts").innerHTML = rows.length
            ? rows.map((r, i) => contactRow(r.title, r.details, r.action, r.icon, i === 0)).join("")
            : `<div class="empty">No club contacts to show yet.</div>`;

        const docs = Array.isArray(this._data.documents) ? this._data.documents : DOCUMENTS;
        const withUrls = docs.filter(d => d && d.url);

        this.shadowRoot.getElementById("documents").innerHTML = withUrls.length
            ? withUrls.map((d, i) => documentRow(d.label, d.meta, d.url, i === 0)).join("")
            : `<div class="empty">No documents available yet.</div>`;
    }

    // Desktop rows copy rather than navigate. Feedback swaps the detail line
    // for a moment - there's no room for a toast and no page code to ask.
    copyToClipboard(btn) {
        const value = btn.getAttribute("data-copy") || "";
        // The detail line is in the sibling half of the row now, not inside
        // the button - go up to the row and back down.
        const row = btn.closest(".row");
        // .contact specifically, not the first .detail - on a manager row the
        // first one is the squad name, and flashing "Copied ✓" over that would
        // be both wrong and briefly destroy the only bit of context on the row.
        const line = row ? row.querySelector(".detail.contact") : null;
        if (!value || !line || row.classList.contains("copied")) return;

        const restore = line.textContent;
        const done = (text) => {
            row.classList.add("copied");
            line.textContent = text;
            setTimeout(() => {
                row.classList.remove("copied");
                line.textContent = restore;
            }, 1600);
        };

        // Wix serves over https so the clipboard API is available, but a
        // browser can still refuse it - say so rather than silently no-op.
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(value)
                .then(() => done("Copied ✓"))
                .catch(() => done(value));
        } else {
            done(value);
        }
    }

    paintSaveState() {
        const $ = (id) => this.shadowRoot.getElementById(id);
        const state = (this.getAttribute("savestate") || "idle").toLowerCase();
        const message = this.getAttribute("savemessage") || "";

        // Page code has replied, so the watchdog armed in submit() has done
        // its job - cancel it before it fires a spurious timeout error over
        // a save that actually succeeded.
        if (state !== "saving") clearTimeout(this._saveTimer);
        const btn = $("btnSave");
        const status = $("saveStatus");

        if (state === "saving") {
            btn.disabled = true;
            btn.textContent = "Saving…";
            status.textContent = "";
            status.className = "status";
            return;
        }

        btn.disabled = false;
        btn.textContent = "Save My Details";

        if (state === "saved") {
            // Adopt what was just saved as the new truth. Without this the
            // summary row repaints from the pre-save `data` and shows the old
            // details until something pushes fresh data in - which, if page
            // code is holding a cached profile object, may be never.
            if (this._pending) {
                this._data = Object.assign({}, this._data, {
                    me: Object.assign({}, this._data.me, this._pending)
                });
                this._pending = null;
            }
            status.textContent = message || "Saved ✓";
            status.className = "status ok";
            // Collapse back to the summary so the tab returns to its resting
            // state - one visible action at a time.
            this._editing = false;
            $("mePanel").classList.remove("open");
            this.paintMe();
        } else if (state === "error") {
            status.textContent = message || "Couldn't save — please try again.";
            status.className = "status bad";
        } else {
            status.textContent = "";
            status.className = "status";
        }
    }

    // -----------------------------------------------------------------
    //  Logout — raise the intent, page code calls authentication.logout()
    // -----------------------------------------------------------------
    //  Same hand-off shape as save: the element can't touch Velo APIs, so
    //  all it does is ask. Unlike save there's no "success" to report back,
    //  because a successful logout navigates the page away - the element is
    //  gone before it could paint anything.
    //
    //  Which is exactly why the watchdog exists. If page code never wired
    //  the listener (or it threw), the row would otherwise sit on
    //  "Signing out…" forever and the parent is stuck on a page with no
    //  header, no footer and no working exit. After 5s we assume nobody
    //  answered, put the row back, and surface a manual way out.
    requestLogout() {
        const $ = (id) => this.shadowRoot.getElementById(id);
        const btn = $("btnLogout");
        if (!btn || btn.getAttribute("aria-busy") === "true") return;

        btn.setAttribute("aria-busy", "true");
        $("logoutLabel").textContent = "Signing out…";
        $("logoutEscape").classList.remove("show");

        this.dispatchEvent(new CustomEvent("logout", { detail: {} }));

        clearTimeout(this._logoutTimer);
        this._logoutTimer = setTimeout(() => {
            const label = $("logoutLabel");
            if (!label) return;
            btn.removeAttribute("aria-busy");
            label.textContent = "Log Out";
            $("logoutEscape").classList.add("show");
        }, 5000);
    }

    // -----------------------------------------------------------------
    //  Save — validate here, then hand off. This element can't call
    //  backend modules, so page code does the actual work and reports
    //  back via the savestate attribute.
    // -----------------------------------------------------------------
    submit() {
        const $ = (id) => this.shadowRoot.getElementById(id);
        const name = $("inName").value.trim();
        const phone = $("inPhone").value.trim();
        const email = $("inEmail").value.trim();

        let ok = true;
        if (!name) { $("fName").classList.add("bad"); ok = false; }
        if (!phone) { $("fPhone").classList.add("bad"); ok = false; }
        if (email && !isValidEmail(email)) { $("fEmail").classList.add("bad"); ok = false; }

        if (!ok) {
            $("saveStatus").textContent = "Please check the highlighted fields.";
            $("saveStatus").className = "status bad";
            return;
        }

        // Held so a successful save can adopt these immediately, rather than
        // waiting for page code to push a refreshed `data` attribute back.
        this._pending = { name, phone, email };

        this.setAttribute("savestate", "saving");
        this.dispatchEvent(new CustomEvent("saveMyDetails", {
            detail: { name, phone, email }
        }));

        // WATCHDOG (2026-08-16). "Saving…" is a state only page code can end,
        // by setting savestate. If its handler never replies - a backend call
        // that hangs, a listener that was never wired, a throw before the
        // first setAttribute - the button sits disabled forever and the only
        // way out is a page refresh.
        //
        // This is a SAFETY NET, not a fix: if it fires, something upstream is
        // genuinely broken and the console will say so. It just makes the
        // failure recoverable and legible instead of a dead button.
        clearTimeout(this._saveTimer);
        this._saveTimer = setTimeout(() => {
            if ((this.getAttribute("savestate") || "") !== "saving") return;
            this.setAttribute("savemessage", "No response from the server — please check your connection and try again.");
            this.setAttribute("savestate", "error");
        }, 15000);
    }
}

if (!customElements.get("parent-hub-more")) {
    customElements.define("parent-hub-more", ParentHubMore);
}

// =====================================================================
//  PAGE CODE CONTRACT — what Parent Hub v2.js needs to do
// =====================================================================
//  IN (one attribute, all three sources at once - one setAttribute per
//  refresh, one parse, no partial-update ordering bugs):
//
//    $w("#customMore").setAttribute("data", JSON.stringify({
//        me: { name, phone, email },
//        teamContacts: [{ teamName, managerName, managerPhone, managerEmail }],
//        officials:    [{ role, fullName, mobile, emailAddress }],
//        documents:    [{ label, meta, url }]   // optional, omit to use DOCUMENTS above
//    }));
//
//    Optional: setAttribute("websiteurl", "/") to point Visit Our Website
//    somewhere other than the site root. Defaults to SITE_URL above.
//
//  OUT (two events):
//    $w("#customMore").on("saveMyDetails", async (event) => {
//        const { name, phone, email } = event.detail;
//        const result = await secureUpdateParentProfile(name, phone, email);
//        $w("#customMore").setAttribute("savestate", result.success ? "saved" : "error");
//    });
//
//    $w("#customMore").on("logout", async () => {
//        await authentication.logout();
//        wixLocationFrontend.to("/");
//    });
//
//  The element sets savestate="saving" itself on submit, so page code only
//  reports the outcome. Optionally set `savemessage` for custom text.
//
//  Logout has no reply attribute - success navigates away, so there'd be
//  nothing left to tell. If page code doesn't respond within 5s the element
//  assumes the listener is missing and shows a manual escape link. That
//  makes the `logout` listener the one piece of wiring you must not forget.
//
//  TIMING: the element may upgrade AFTER page code runs, in which case an
//  early setAttribute lands on a plain unupgraded element. That's fine here
//  - attributeChangedCallback fires on upgrade and picks the value up. But
//  `.on("saveMyDetails", ...)` must be wired in $w.onReady or later.
//
//  officials comes from getClubOfficials() in backend/staffData.jsw, which
//  returns exactly the shape above.
// =====================================================================
