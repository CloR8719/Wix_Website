// =====================================================================
//  <parent-hub-home> — Parent Hub v2, Home tab
// =====================================================================
//  Third custom element, and the biggest so far: ~35 of stateHome's native
//  elements collapse into this one. It's also the real test of self-sizing,
//  because the height genuinely varies per parent - one child or four,
//  teasers or none - so there is no correct fixed Editor value.
//
//  SETUP IN THE EDITOR (one time):
//    1. This repo does NOT sync to the site. Create the file in the Editor:
//       Public & Backend -> Public -> custom-elements -> new file
//       `parentHubHome.js`, then paste this in.
//    2. On stateHome: Add -> Embed Code -> *Custom Element*.
//    3. Tag name, exactly:  parent-hub-home
//    4. Element ID:  #customHome
//    5. Give it generous height to start (~900px) and trim once you see it.
//
//  ⚠️ CHANGES DON'T SHOW UNTIL YOU REPUBLISH *AND* HARD-REFRESH. These
//  styles live inside this .js file, so a cached copy of the file means
//  cached CSS. Desktop and mobile cache separately. If a change looks like
//  it didn't work, check for a STRUCTURAL difference first - that tells you
//  whether your code is running at all, which a styling tweak never can.
//
//  EVERYTHING on stateHome is in here, including the Find My Child flow -
//  Fan Number / DOB lookup, the confirm step, and the Can't-Find-My-Child
//  request form. Nothing on the state is native.
//
//  The Wix Date Picker was the reason to hold the lookup back, and it turned
//  out to be a non-reason: <input type="date"> opens the OS date wheel on a
//  phone and returns a local "YYYY-MM-DD" string, which is exactly what
//  findPlayerByFanNumberAndDob takes. The native path had to hand-format a
//  Date to dodge toISOString()'s timezone shift; that hazard is gone.
//  It does need the sizing rules further down, though - see the note on
//  .field input[type="date"].
//
//  THE LOOKUP PANEL IS BUILT ONCE and only ever has classes and text
//  swapped (paintLookup). Repaints fire whenever a payment status or fixture
//  lookup lands, and rebuilding that markup would wipe a half-typed Fan
//  Number every time.
//
//  STATUS MAPPING LIVES IN PAGE CODE, not here. The status GUIDs are
//  already constants in Parent Hub v2.js and have no business being
//  duplicated into a file that can't import them. Page code sends a plain
//  label + tone; this element just paints it.
//
//  Renders on its own mock data, so you can build and eyeball it in the
//  Editor before writing a line of page code.
// =====================================================================

// Shown until page code pushes real data in - and in the Editor, where no
// page code runs at all.
const MOCK = {
    parentName: "Sarah",
    subline: "Everything for Freya & Oscar in one place",
    banner: {
        tone: "warning",
        message: "⚠️ Action Required: You have 1 outstanding registration form to complete."
    },
    kids: [
        {
            id: "k1", name: "Freya Whitfield", initials: "FW", squad: "First Team U11",
            statusLabel: "Registration Required", statusTone: "warning",
            actionLabel: "Register Now", paymentLabel: "Set Up Payment"
        },
        {
            id: "k2", name: "Oscar Whitfield", initials: "OW", squad: "Junior Development U8",
            statusLabel: "Active", statusTone: "success",
            actionLabel: "View Profile", paymentLabel: "Manage Plan"
        }
    ],
    teasers: [
        {
            id: "t1",
            title: "Next up for Freya: Signol Athletic vs Hale Barns Juniors",
            meta: "Sat 16 Aug · 10:00 · Signol Playing Fields",
            rsvpLabel: "Confirmation Required", rsvpTone: "warning",
            ctaLabel: "Confirm Attendance"
        }
    ],
    canAddChild: true
};

// ---------------------------------------------------------------------
//  STYLES
// ---------------------------------------------------------------------
//  Token block is duplicated from parentHubMore.js. That's a known smell -
//  Messages' palette had already drifted out of step before the second
//  element was finished. Worth testing whether a Wix custom element file
//  can import from another public file; if it can, these move to one
//  shared tokens module and every element picks up a change at once.
//
//  FONTS: a custom element is real page DOM, not an iframe, so fonts Wix
//  has already loaded work in here - but Wix only loads a font something on
//  the page actually uses. If no native element on this page is set in Work
//  Sans you'll silently get the fallback.
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
    --info:#1F5FA8; --info-bg:#E0EDFB;
    --violet:#6D3FBF; --violet-bg:#EFE7FB;
    --neutral:#5A6472; --neutral-bg:#E8EAED;
    padding: 16px 16px 32px;
    color: var(--text);
    display: flex; flex-direction: column; gap: 18px;
  }
  @media (min-width: 750px) { .wrap { padding: 22px 28px 32px; gap: 22px; } }

  /* ---------- welcome ---------- */
  .hello h1 {
    margin: 0; font-size: 21px; font-weight: 700; line-height: 1.2;
    letter-spacing: -0.2px; text-wrap: balance;
  }
  .hello p { margin: 5px 0 0; font-size: 13px; color: var(--text-muted); line-height: 1.45; }
  @media (min-width: 750px) { .hello h1 { font-size: 25px; } }

  /* ---------- banner ---------- */
  /* Never both the no-kids welcome and the action alert - they're mutually
     exclusive in loadDashboard, so this is one element whose tone changes
     rather than two stacked boxes. */
  .banner {
    display: none; gap: 11px; align-items: flex-start;
    padding: 13px 14px; border-radius: 11px;
    border: 1px solid; font-size: 13px; line-height: 1.5;
  }
  .banner.show { display: flex; }
  .banner.warning { background: var(--warning-bg); border-color: #E9B949; color: #6E4600; }
  .banner.critical { background: var(--critical-bg); border-color: #E88; color: #8E2C2C; }

  /* ---------- unread messages ---------- */
  /* Messages never leave the hub - no email, no push yet - so a parent only
     ever sees one by opening the tab. This is what makes that likely: Home is
     the screen everyone lands on. Distinct from .banner because a banner is
     something wrong, and new post isn't. */
  .msgs {
    display: none; width: 100%; text-align: left; gap: 11px; align-items: center;
    padding: 12px 14px; border-radius: 11px; cursor: pointer;
    background: var(--pitch-soft); border: 1px solid transparent;
    font-family: inherit; font-size: 13px; color: var(--pitch); font-weight: 600;
    transition: border-color .15s ease;
  }
  .msgs.show { display: flex; }
  .msgs:hover { border-color: var(--pitch); }
  .msgs:focus-visible { outline: 2px solid var(--pitch); outline-offset: 2px; }
  .msgs svg { width: 17px; height: 17px; flex-shrink: 0; }
  .msgs .go { margin-left: auto; font-size: 12px; font-weight: 700; opacity: .75; }

  /* ---------- section headings ---------- */
  .section-title {
    font-size: 11px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.6px; color: var(--text-faint);
    margin: 0 0 10px;
  }

  /* ---------- kid cards ---------- */
  .cards { display: flex; flex-direction: column; gap: 11px; }
  /* Two across once there's room. auto-fit rather than a fixed 2 columns so
     a single child doesn't render as a half-width card next to a hole. */
  @media (min-width: 750px) {
    .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
  }

  .card {
    background: var(--raised); border: 1px solid var(--line);
    border-radius: 13px; padding: 14px;
    display: flex; flex-direction: column; gap: 12px;
  }

  .card-head { display: flex; align-items: center; gap: 11px; }
  /* Initials, not a photo - deliberate. The real headshot only appears on
     the Profile state. */
  .avatar {
    width: 42px; height: 42px; border-radius: 50%; flex-shrink: 0;
    background: var(--pitch-soft); color: var(--pitch);
    display: flex; align-items: center; justify-content: center;
    font-size: 14px; font-weight: 700; letter-spacing: 0.3px;
  }
  .who { min-width: 0; flex: 1; }
  .who strong {
    display: block; font-size: 14.5px; font-weight: 700; line-height: 1.25;
    overflow-wrap: anywhere;
  }
  .who span { display: block; font-size: 11.5px; color: var(--text-muted); margin-top: 1px; }

  /* Status is a pill, not coloured text as in the native version. Shape
     carries the state as well as hue, so it still reads at a glance in
     greyscale or to anyone who can't separate the amber from the red. */
  .pill {
    display: inline-flex; align-items: center; align-self: flex-start;
    padding: 4px 10px; border-radius: 999px;
    font-size: 11px; font-weight: 700; letter-spacing: 0.2px;
    line-height: 1.35;
  }
  .pill.success  { background: var(--success-bg);  color: var(--success); }
  .pill.warning  { background: var(--warning-bg);  color: var(--warning); }
  .pill.critical { background: var(--critical-bg); color: var(--critical); }
  .pill.info     { background: var(--info-bg);     color: var(--info); }
  .pill.violet   { background: var(--violet-bg);   color: var(--violet); }
  .pill.neutral  { background: var(--neutral-bg);  color: var(--neutral); }

  /* ---------- buttons ---------- */
  .actions { display: flex; gap: 8px; flex-wrap: wrap; }
  .btn {
    flex: 1 1 auto; min-width: 130px;
    font-family: inherit; font-size: 13px; font-weight: 600;
    padding: 11px 14px; border-radius: 9px; border: 1px solid transparent;
    cursor: pointer; text-align: center; line-height: 1.3;
  }
  .btn.primary { background: var(--pitch); color: #fff; }
  .btn.secondary { background: var(--surface); color: var(--pitch); border-color: var(--line); }
  .btn:focus-visible { outline: 2px solid var(--pitch); outline-offset: 2px; }
  .btn[disabled] { opacity: 0.6; cursor: default; }

  /* ---------- add another child ---------- */
  /* Lifted from the approved mockup: a dashed box with a line of copy and a
     small pill button. Deliberately NOT a big full-width control - it's a
     rare action (once per child, ever) sitting under the cards a parent
     actually came for, so it shouldn't outweigh them. */
  .link-child-box {
    background: var(--surface); border: 1px dashed var(--line);
    border-radius: 12px; padding: 16px; text-align: center;
  }
  .link-child-box p {
    margin: 0 0 12px; font-size: 13px; color: var(--text-muted); line-height: 1.5;
  }
  .btn-outline {
    font-family: inherit; font-size: 13px; font-weight: 600;
    background: var(--surface); border: 1.5px solid var(--pitch);
    color: var(--pitch); border-radius: 999px;
    padding: 9px 18px; cursor: pointer;
  }
  .btn-outline:hover { background: var(--pitch-soft); }
  .btn-outline:focus-visible { outline: 2px solid var(--pitch); outline-offset: 2px; }

  .btn-text {
    display: block; margin: 12px auto 0; background: none; border: none;
    font-family: inherit; font-size: 12px; font-weight: 600;
    color: var(--text-muted); text-decoration: underline; cursor: pointer;
  }
  .btn-text:focus-visible { outline: 2px solid var(--pitch); outline-offset: 2px; }

  /* ---------- find my child ---------- */
  .link-box {
    background: var(--raised); border: 1px solid var(--line);
    border-radius: 13px; padding: 16px;
  }
  .lookup { display: none; }
  .lookup.open { display: block; }

  .field { margin-bottom: 12px; }
  .field label {
    display: block; font-size: 11.5px; font-weight: 600;
    color: var(--text-muted); margin-bottom: 5px;
  }
  .field input, .field textarea {
    width: 100%; font-family: inherit; font-size: 14.5px; padding: 11px 12px;
    border: 1.5px solid var(--line); border-radius: 8px;
    background: var(--surface); color: var(--text);
  }
  .field textarea { resize: vertical; min-height: 68px; }
  .field input:focus, .field textarea:focus { outline: none; border-color: var(--pitch); }

  /* A date input is NOT just a text input with a picker. Mobile Safari gives
     it an intrinsic width derived from the date format plus the calendar
     indicator, and that intrinsic width beats width:100% - so it grows
     past the card's padding and sits across the border. min-width:0 is
     what actually lets it shrink to its container; appearance:none drops the
     native chrome that was adding to the width in the first place.
     Fixed 2026-08-16 - looked fine on desktop, overlapped on a phone. */
  .field input[type="date"] {
    -webkit-appearance: none; appearance: none;
    min-width: 0; max-width: 100%;
    /* Inputs are inline-block by default, which leaves a baseline gap under
       them inside a flex/block container. */
    display: block;
  }
  /* iOS centres the value inside the field and adds its own margins; without
     these the text sits off-centre from every other input in the form. */
  .field input[type="date"]::-webkit-date-and-time-value {
    text-align: left; margin: 0;
  }
  .field input[type="date"]::-webkit-calendar-picker-indicator {
    margin-left: 0; margin-right: 0;
  }
  .field.bad input { border-color: var(--critical); background: var(--critical-bg); }
  /* iOS Safari zooms the page when an input under 16px takes focus, and
     never zooms back out. On a phone correctness beats matching the mockup.
     A date input is especially bad for this - it opens the OS picker. */
  @media (max-width: 749px) { .field input, .field textarea { font-size: 16px; } }

  .status { font-size: 12.5px; margin-top: 4px; line-height: 1.5; min-height: 1px; }
  .status.error { color: var(--critical); }
  .status.ok { color: var(--success); font-weight: 600; }

  /* Confirm step - deliberately a separate box, not an inline yes/no. This
     is the moment a child gets attached to an account, so it reads as its
     own decision rather than a side effect of searching. */
  .confirm {
    display: none; margin-top: 12px; padding: 13px 14px;
    background: var(--pitch-soft); border-radius: 10px;
  }
  .confirm.show { display: block; }
  .confirm p { margin: 0 0 12px; font-size: 13px; line-height: 1.5; }

  .request { display: none; margin-top: 12px; padding-top: 14px; border-top: 1px solid var(--line-soft); }
  .request.show { display: block; }
  .request > p { margin: 0 0 12px; font-size: 12.5px; color: var(--text-muted); line-height: 1.5; }
  .request-done {
    display: none; margin-top: 4px; padding: 10px 12px; border-radius: 8px;
    background: var(--success-bg); color: var(--success);
    font-size: 12.5px; font-weight: 600; text-align: center; line-height: 1.45;
  }
  .request-done.show { display: block; }

  /* ---------- fixture teasers ---------- */
  .teaser {
    background: var(--raised); border: 1px solid var(--line);
    border-radius: 13px; padding: 13px 14px;
    display: flex; flex-direction: column; gap: 10px;
  }
  .teaser + .teaser { margin-top: 10px; }
  .teaser-top { display: flex; gap: 11px; align-items: flex-start; }
  .teaser-icon {
    width: 34px; height: 34px; border-radius: 9px; flex-shrink: 0;
    background: var(--pitch-soft); color: var(--pitch);
    display: flex; align-items: center; justify-content: center;
  }
  .teaser-icon svg { width: 16px; height: 16px; }
  .teaser-txt { min-width: 0; flex: 1; }
  /* Wrap, don't truncate - same rule as the contact rows in More. A team
     name cut mid-word tells the parent nothing. */
  .teaser-txt strong {
    display: block; font-size: 13.5px; font-weight: 700; line-height: 1.35;
    overflow-wrap: anywhere;
  }
  .teaser-txt span {
    display: block; font-size: 11.5px; color: var(--text-muted);
    margin-top: 3px; line-height: 1.45; overflow-wrap: anywhere;
  }
  .teaser-foot { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .teaser-foot .btn { flex: 0 1 auto; }

  /* ---------- empty / loading ---------- */
  .empty {
    padding: 22px 16px; text-align: center;
    font-size: 13px; color: var(--text-muted); line-height: 1.5;
    border: 1px dashed var(--line); border-radius: 12px;
  }

  @media (prefers-color-scheme: dark) {
    .wrap {
      --surface:#0E1826; --raised:#121F30;
      --line:#223145; --line-soft:#1A2739;
      --text:#E7ECF2; --text-muted:#A6B4C3; --text-faint:#71818F;
      --pitch:#5FBF8B; --pitch-soft:#17301F;
      --success:#5FD08B; --success-bg:#103322;
      --warning:#E5B567; --warning-bg:#3A2C10;
      --critical:#F08A8A; --critical-bg:#3A1414;
      --info:#7FB2EC;    --info-bg:#132A42;
      --violet:#B294E8;  --violet-bg:#251A3D;
      --neutral:#9AA6B4; --neutral-bg:#1E2733;
    }
    .banner.warning { border-color: #6A5220; color: #E9C583; }
    .banner.critical { border-color: #6E2E2E; color: #F2A6A6; }
    .btn.primary { color: #06120C; }
  }

  /* Clearance for the bottom nav bar, which is pinned over the content on
     mobile. Without this the last item sits under it and can't be scrolled
     into view - the page rubber-bands back the moment you let go. Desktop
     puts the nav in a left rail, so nothing is covering the bottom there. */
  @media (max-width: 749px) {
    .wrap { padding-bottom: calc(84px + env(safe-area-inset-bottom, 0px)); }
  }
`;

// Inline SVG needs an explicit size from its container in EVERY place it's
// used - an <svg> with only a viewBox expands to fill whatever box it's in.
// A plus icon in a full-width button is how you get a plus sign the size of
// a phone screen. Each icon here has a matching `.x svg { width; height }`
// rule; add one alongside any icon you add.
const ICONS = {
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>'
};

// Everything below is CMS content typed by a person, so it all goes through
// this before touching innerHTML.
function esc(value) {
    return String(value == null ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

// Page code sends a tone name; anything unrecognised falls back to neutral
// rather than rendering an unstyled pill.
const TONES = ["success", "warning", "critical", "info", "violet", "neutral"];
function tone(value) {
    return TONES.includes(value) ? value : "neutral";
}

class ParentHubHome extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._data = MOCK;
        this._built = false;
        this._resizeObserver = null;
        this._lastHeight = 0;
        // Local UI state for the Find My Child panel. Deliberately NOT in
        // _data: a parent opening the panel is a local reveal, and it must
        // survive the repaints that fire when payment/fixture lookups land.
        this._lookupOpen = false;
        this._requestOpen = false;
    }

    static get observedAttributes() { return ["data"]; }

    connectedCallback() {
        this.build();
        this.watchHeight();
    }

    disconnectedCallback() {
        if (this._resizeObserver) {
            this._resizeObserver.disconnect();
            this._resizeObserver = null;
        }
    }

    // -----------------------------------------------------------------
    //  Self-sizing
    // -----------------------------------------------------------------
    //  Wix stores height per breakpoint and doesn't auto-size, so content
    //  taller than the Editor value clips silently. This matters more here
    //  than on any previous element: the height depends on how many children
    //  the parent has, so there IS no correct fixed value.
    //
    //  Set a roughly-right height in the Editor anyway - this can only
    //  correct AFTER first paint.
    watchHeight() {
        if (this._resizeObserver || typeof ResizeObserver === "undefined") return;

        const wrap = this.shadowRoot.querySelector(".wrap");
        if (!wrap) return;

        this._resizeObserver = new ResizeObserver(() => {
            const height = Math.ceil(wrap.getBoundingClientRect().height);
            // .wrap is content-sized, so setting the host's height doesn't
            // feed back into it. The guard stops sub-pixel jitter looping.
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
                // REPLACED, not merged over MOCK. Merging would leak the mock
                // family's children into a payload that legitimately has none
                // - a parent with no kids linked would see Freya and Oscar.
                // Once page code speaks, MOCK is irrelevant.
                this._data = parsed;
                this.paint();
            }
        } catch (err) {
            // Bad JSON shouldn't blank the dashboard - keep what's showing.
            console.error("parent-hub-home: couldn't parse data attribute", err);
        }
    }

    build() {
        if (this._built) return;
        this._built = true;

        this.shadowRoot.innerHTML = `
          <style>${STYLES}</style>
          <div class="wrap">
            <div class="hello">
              <h1 id="hello"></h1>
              <p id="subline"></p>
            </div>

            <div class="banner" id="banner"><span id="bannerText"></span></div>

            <button type="button" class="msgs" id="msgs" data-messages>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                   stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 4h16v12H5.17L4 17.17V4z"/>
              </svg>
              <span id="msgsText"></span>
              <span class="go">View</span>
            </button>

            <div>
              <div class="section-title" id="kidsTitle">Your Children</div>
              <div class="cards" id="cards"></div>
            </div>

            <!-- Own section rather than tacked under the cards, so the
                 wrap's flex gap spaces it and it reads as a separate thing
                 to do, not a sixth child card. -->
            <div id="addWrap"></div>

            <!-- FIND MY CHILD.
                 Built ONCE, here, and never rebuilt - paintLookup() below
                 only ever toggles classes and sets text. A repaint that
                 replaced this markup would wipe whatever the parent had
                 half-typed, and repaints happen every time a payment status
                 or fixture lookup lands. -->
            <div class="lookup" id="lookupPanel">
              <div class="section-title">Find your child</div>
              <div class="link-box">
                <div class="field" id="fFan">
                  <label for="inFan">Fan Number</label>
                  <input id="inFan" type="text" inputmode="numeric" autocomplete="off" />
                </div>
                <div class="field" id="fDob">
                  <label for="inDob">Their date of birth</label>
                  <!-- A real date input, not a Wix Date Picker: on a phone
                       this opens the OS date wheel, and it hands back a
                       local "YYYY-MM-DD" string - exactly what the backend
                       wants, with none of the timezone-shift risk that
                       formatting a JS Date by hand carries. -->
                  <input id="inDob" type="date" />
                </div>
                <button type="button" class="btn primary" id="btnLookup" style="width:100%">Find My Child</button>
                <div class="status" id="lookupMsg"></div>

                <div class="confirm" id="confirmBox">
                  <p id="confirmText"></p>
                  <div class="actions">
                    <button type="button" class="btn primary" id="btnConfirmLink">Confirm</button>
                    <button type="button" class="btn secondary" id="btnCancelLink">Cancel</button>
                  </div>
                </div>

                <button type="button" class="btn-text" id="btnCantFind">Still can't find your child?</button>

                <div class="request" id="requestBox">
                  <p>Tell us what you know and the club will link them for you.</p>
                  <div class="field" id="fReqName">
                    <label for="inReqName">Child's name</label>
                    <input id="inReqName" type="text" autocomplete="off" />
                  </div>
                  <div class="field">
                    <label for="inReqDob">Their date of birth</label>
                    <input id="inReqDob" type="date" />
                  </div>
                  <div class="field">
                    <label for="inReqNotes">Anything else that helps (team, previous club)</label>
                    <textarea id="inReqNotes" rows="3"></textarea>
                  </div>
                  <button type="button" class="btn primary" id="btnSubmitRequest" style="width:100%">Send to the club</button>
                  <div class="request-done" id="requestDone">Thanks — the club will be in touch to help link your child.</div>
                </div>
              </div>
            </div>

            <div id="teaserSection">
              <div class="section-title">This Week</div>
              <div id="teasers"></div>
            </div>
          </div>`;

        // Delegated - paint() replaces these nodes wholesale on every data
        // refresh, so a listener bound per card would be lost.
        this.shadowRoot.getElementById("cards").addEventListener("click", (event) => {
            const btn = event.target.closest("[data-act]");
            if (!btn) return;
            this.dispatchEvent(new CustomEvent(btn.getAttribute("data-act"), {
                detail: { id: btn.getAttribute("data-id") }
            }));
        });

        this.shadowRoot.getElementById("teasers").addEventListener("click", (event) => {
            if (!event.target.closest("[data-fixtures]")) return;
            this.dispatchEvent(new CustomEvent("openFixtures", { detail: {} }));
        });

        // Bound directly, not delegated: #msgs is built once and only ever has
        // its class and text changed by paint(), so the node survives repaints.
        this.shadowRoot.getElementById("msgs").addEventListener("click", () => {
            this.dispatchEvent(new CustomEvent("openMessages", { detail: {} }));
        });

        this.shadowRoot.getElementById("addWrap").addEventListener("click", (event) => {
            if (!event.target.closest("[data-add]")) return;
            // Opened locally as well as announced. Waiting for page code to
            // send back {open:true} would put a visible delay on a purely
            // local reveal.
            this._lookupOpen = true;
            this.paint();
            this.dispatchEvent(new CustomEvent("addChild", { detail: {} }));
        });

        this.wireLookup();
        this.paint();
    }

    wireLookup() {
        const $ = (id) => this.shadowRoot.getElementById(id);

        $("btnLookup").addEventListener("click", () => {
            const fanNumber = $("inFan").value.trim();
            const dob = $("inDob").value;   // already local "YYYY-MM-DD"

            // Validated here so an empty submit costs no round-trip, but the
            // backend is still the real gate.
            $("fFan").classList.toggle("bad", !fanNumber);
            $("fDob").classList.toggle("bad", !dob);
            if (!fanNumber || !dob) {
                this.setStatus("Please enter both the Fan Number and date of birth.", "error");
                return;
            }
            this.dispatchEvent(new CustomEvent("lookupChild", { detail: { fanNumber, dob } }));
        });

        ["fFan", "fDob"].forEach(fieldId => {
            const input = $(fieldId).querySelector("input");
            input.addEventListener("input", () => $(fieldId).classList.remove("bad"));
        });

        $("btnConfirmLink").addEventListener("click", () => {
            this.dispatchEvent(new CustomEvent("confirmLink", { detail: {} }));
        });

        $("btnCancelLink").addEventListener("click", () => {
            this.dispatchEvent(new CustomEvent("cancelLink", { detail: {} }));
        });

        // Purely local reveal - no page code involved, so no event.
        $("btnCantFind").addEventListener("click", () => {
            this._requestOpen = true;
            this.paintLookup();
        });

        $("btnSubmitRequest").addEventListener("click", () => {
            const childName = $("inReqName").value.trim();
            if (!childName) {
                $("fReqName").classList.add("bad");
                return;
            }
            this.dispatchEvent(new CustomEvent("submitLinkRequest", {
                detail: {
                    childName,
                    childDob: $("inReqDob").value || "",
                    notes: $("inReqNotes").value.trim()
                }
            }));
        });

        $("inReqName").addEventListener("input", () => $("fReqName").classList.remove("bad"));
    }

    setStatus(text, tone) {
        const el = this.shadowRoot.getElementById("lookupMsg");
        el.textContent = text || "";
        el.className = "status" + (text && tone ? " " + tone : "");
    }

    // Targeted repaint. Never touches the inputs' values except to clear
    // them after a successful link, so a background refresh can't yank text
    // out from under someone mid-type.
    paintLookup() {
        const $ = (id) => this.shadowRoot.getElementById(id);
        const L = (this._data && this._data.lookup) || {};

        // Page code can force it open (a parent with no children linked gets
        // it expanded on load); the local flag covers the parent who tapped
        // Find My Child themselves.
        const open = this._lookupOpen || !!L.open;
        $("lookupPanel").classList.toggle("open", open);

        // Two separate in-flight flags: searching and linking are different
        // calls on different buttons and can't be collapsed into one.
        $("btnLookup").disabled = !!L.busy;
        $("btnLookup").textContent = L.busy ? "Checking…" : "Find My Child";
        $("btnConfirmLink").disabled = !!L.linking;
        $("btnConfirmLink").textContent = L.linking ? "Linking…" : "Confirm";

        this.setStatus(L.message || "", L.messageTone || "error");

        const hasMatch = !!L.matchText;
        $("confirmBox").classList.toggle("show", hasMatch);
        if (hasMatch) $("confirmText").textContent = L.matchText;

        // One visible action at a time: while a match is waiting to be
        // confirmed, "still can't find your child" is noise.
        $("btnCantFind").style.display = (hasMatch || this._requestOpen) ? "none" : "";
        $("requestBox").classList.toggle("show", !!this._requestOpen);

        const sent = !!L.requestSent;
        $("requestDone").classList.toggle("show", sent);
        $("btnSubmitRequest").style.display = sent ? "none" : "";

        // Cleared only on the way out, once the child is actually linked.
        if (L.clearInputs) {
            $("inFan").value = "";
            $("inDob").value = "";
            $("fFan").classList.remove("bad");
            $("fDob").classList.remove("bad");
        }
    }

    paint() {
        const $ = (id) => this.shadowRoot.getElementById(id);
        const d = this._data;

        // Loading is an explicit state, not the absence of data. Page code
        // sets {loading:true} synchronously before its first await, because
        // there are three sequential backend round-trips before real kids
        // land and the element would otherwise sit showing MOCK - another
        // family's children - for that whole window.
        if (d.loading) {
            $("hello").textContent = "Welcome back";
            $("subline").textContent = "";
            $("banner").className = "banner";
            $("kidsTitle").style.display = "";
            $("cards").innerHTML = `<div class="empty">Loading your children…</div>`;
            $("addWrap").innerHTML = "";
            $("teaserSection").style.display = "none";
            $("lookupPanel").classList.remove("open");
            return;
        }

        const kids = Array.isArray(d.kids) ? d.kids : [];
        const teasers = Array.isArray(d.teasers) ? d.teasers : [];

        $("hello").textContent = d.parentName ? `Welcome back, ${d.parentName}` : "Welcome back";
        $("subline").textContent = d.subline || "";

        // Banner
        const banner = $("banner");
        if (d.banner && d.banner.message) {
            banner.className = "banner show " + (d.banner.tone === "critical" ? "critical" : "warning");
            $("bannerText").textContent = d.banner.message;
        } else {
            banner.className = "banner";
        }

        // Unread messages. Page code clears messagesTeaser once the tab has
        // been opened, so this disappears on its own.
        const msgs = $("msgs");
        if (d.messagesTeaser && d.messagesTeaser.count > 0) {
            msgs.className = "msgs show";
            $("msgsText").textContent = d.messagesTeaser.label || "New messages";
        } else {
            msgs.className = "msgs";
        }

        // Kid cards
        $("kidsTitle").style.display = kids.length ? "" : "none";
        $("cards").innerHTML = kids.length
            ? kids.map(k => this.cardHtml(k)).join("")
            : `<div class="empty">No children linked to your account yet.<br>Use the form below to find your child.</div>`;

        // Hidden once the panel it opens is showing - two ways to open the
        // same thing reads as a bug. A parent with no kids linked gets the
        // panel expanded on load, so they never see this prompt at all.
        const lookupShowing = this._lookupOpen || !!(d.lookup && d.lookup.open);
        $("addWrap").innerHTML = (d.canAddChild && !lookupShowing)
            ? `<div class="section-title">Add another child</div>
               <div class="link-child-box">
                 <p>Got another child at the club on a different email? Link them here using their Fan Number and date of birth.</p>
                 <button type="button" class="btn-outline" data-add>Find My Child</button>
               </div>`
            : "";

        // Teasers - the whole section goes if nobody has a fixture this week,
        // rather than leaving a heading over an empty box.
        $("teaserSection").style.display = teasers.length ? "" : "none";
        $("teasers").innerHTML = teasers.map(t => this.teaserHtml(t)).join("");

        this.paintLookup();
    }

    cardHtml(k) {
        const payment = k.paymentLabel
            ? `<button type="button" class="btn secondary" data-act="openPayment" data-id="${esc(k.id)}">${esc(k.paymentLabel)}</button>`
            : "";
        return `
          <div class="card">
            <div class="card-head">
              <div class="avatar">${esc(k.initials || "?")}</div>
              <div class="who">
                <strong>${esc(k.name)}</strong>
                <span>${esc(k.squad || "Squad Unassigned")}</span>
              </div>
            </div>
            <span class="pill ${tone(k.statusTone)}">${esc(k.statusLabel || "Processing")}</span>
            <div class="actions">
              <button type="button" class="btn primary" data-act="openPlayer" data-id="${esc(k.id)}">${esc(k.actionLabel || "View Profile")}</button>
              ${payment}
            </div>
          </div>`;
    }

    teaserHtml(t) {
        return `
          <div class="teaser">
            <div class="teaser-top">
              <div class="teaser-icon">${ICONS.calendar}</div>
              <div class="teaser-txt">
                <strong>${esc(t.title)}</strong>
                <span>${esc(t.meta || "")}</span>
              </div>
            </div>
            <div class="teaser-foot">
              <span class="pill ${tone(t.rsvpTone)}">${esc(t.rsvpLabel || "Confirmation Required")}</span>
              <button type="button" class="btn secondary" data-fixtures>${esc(t.ctaLabel || "View Fixtures")}</button>
            </div>
          </div>`;
    }
}

if (!customElements.get("parent-hub-home")) {
    customElements.define("parent-hub-home", ParentHubHome);
}

// =====================================================================
//  PAGE CODE CONTRACT — what Parent Hub v2.js needs to do
// =====================================================================
//  FIRST, synchronously in onReady before any await:
//
//    $w("#customHome").setAttribute("data", JSON.stringify({ loading: true }));
//
//  Without it the element shows MOCK - a different family's children -
//  until the third backend round-trip lands.
//
//  IN (one attribute, everything at once):
//
//    $w("#customHome").setAttribute("data", JSON.stringify({
//        parentName: "Sarah",
//        subline:    "Everything for Freya & Oscar in one place",
//        banner:     { tone: "warning"|"critical", message: "..." } || null,
//        kids: [{
//            id, name, initials, squad,
//            statusLabel, statusTone,      // tone: success|warning|critical|info|violet|neutral
//            actionLabel,                  // "Register Now" / "View Profile" / ...
//            paymentLabel                  // omit or null to hide the payment button
//        }],
//        teasers: [{ id, title, meta, rsvpLabel, rsvpTone, ctaLabel }],
//        canAddChild: true,
//        lookup: {
//            open:        false,   // force the panel open (no kids linked)
//            busy:        false,   // search in flight
//            linking:     false,   // confirm in flight
//            message:     "",      // error / status under the search button
//            messageTone: "error", // "error" | "ok"
//            matchText:   "",      // non-empty shows the confirm step
//            requestSent: false,   // swaps the request form for a thank-you
//            clearInputs: false    // one-shot: wipe fan/dob after a link
//        }
//    }));
//
//  The status GUID -> label/tone/actionLabel mapping stays in page code,
//  where the GUID constants already live. This element never sees a GUID.
//
//  OUT:
//    $w("#customHome").on("openPlayer",   (e) => { /* e.detail.id */ });
//    $w("#customHome").on("openPayment",  (e) => { /* e.detail.id */ });
//    $w("#customHome").on("openFixtures", ()  => switchTab("stateFixtures"));
//    $w("#customHome").on("addChild",     ()  => { /* panel opens itself */ });
//    $w("#customHome").on("lookupChild",  (e) => { /* e.detail.fanNumber, e.detail.dob */ });
//    $w("#customHome").on("confirmLink",  ()  => { /* page code holds the pending id */ });
//    $w("#customHome").on("cancelLink",   ()  => { /* clear pending + matchText */ });
//    $w("#customHome").on("submitLinkRequest", (e) => { /* childName, childDob, notes */ });
//
//  `dob` arrives as a local "YYYY-MM-DD" string straight from
//  <input type="date"> - the exact shape findPlayerByFanNumberAndDob wants.
//  No Date object, no hand-formatting, so none of the timezone-shift risk
//  the Wix Date Picker path had.
//
//  The element owns two bits of UI state page code can't see: whether the
//  panel is open, and whether the request form is revealed. Both survive
//  repaints. Page code can only FORCE the panel open (lookup.open), which
//  is what a parent with no children linked needs.
//
//  Page code keeps the visibleKids array it already has, and looks the child
//  up by id on the way back out - the element carries no player objects, so
//  nothing can leak into it that getKidsForParent meant to redact.
//
//  TIMING: setAttribute is safe at any point (attributeChangedCallback fires
//  on upgrade), but `.on(...)` must be wired in $w.onReady or later.
//
//  The payment button label is async on the native version
//  (getGoCardlessStatus resolves after the card renders). Simplest approach:
//  send "Set Up Payment" in the first payload, then re-send the whole data
//  attribute once the statuses land. One attribute, one repaint.
// =====================================================================
