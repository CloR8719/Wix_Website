// =====================================================================
//  <parent-hub-profile> — Parent Hub v2, Profile
// =====================================================================
//  68 native elements into one: a persistent header, three tabs
//  (Overview / Stats / Edit Details), and the edit form behind them.
//
//  SETUP IN THE EDITOR:
//    1. Public -> custom-elements -> new file `parentHubProfile.js`.
//    2. On stateProfile: Add -> Embed Code -> Custom Element.
//       Tag name: parent-hub-profile   Element ID: #customProfile
//    3. Height ~1000px to start; it self-sizes after first paint.
//
//  ⚠️ REPUBLISH *AND* HARD-REFRESH after any change - the styles live
//  inside this .js file, so a cached copy means cached CSS.
//
//  ⚠️ RBAC IS PRESENTATION ONLY, NOT SECURITY.
//  `player.isPrimary` decides what this element draws. It is NOT what
//  protects the primary parent's details - getKidsForParent STRIPS those
//  fields server-side before they ever reach the browser, so a secondary
//  parent's payload simply doesn't contain them. This element hiding them
//  is the courtesy layer on top. Never move that check in here, and never
//  send a secondary parent data on the assumption the element will hide it.
//
//  ADDRESSES are the reason Profile needed converting as much as the
//  layout was: the native version read ADDRESS objects straight into text
//  inputs and wrote the coerced string back, flattening structured
//  addresses on every save. Here they go through the same Find-address
//  Lightbox as Registration, and an untouched address is never rewritten.
// =====================================================================

const TABS = [
    { key: "overview", title: "Overview" },
    { key: "stats",    title: "Stats" },
    { key: "details",  title: "Edit Details" }
];

// ---------------------------------------------------------------------
//  KIT IMAGES — paste Media Manager URLs here
// ---------------------------------------------------------------------
//  Media Manager -> right-click the file -> Copy URL. You want the
//  `https://static.wixstatic.com/media/...` one.
//
//  ⚠️ A `wix:image://v1/...` URI will NOT work as an <img> src. That's the
//  internal reference the CMS stores, not a fetchable URL - paste it here
//  and you get a broken image. Copy URL gives you the right one.
//
//  Leave either blank and that variant falls back to the drawn shirt below,
//  which also catches a URL that 404s - so a wrong paste degrades to the
//  simple graphic rather than a broken-image icon.
//
//  Club-wide rather than per-team, because there's no kit field on the Teams
//  collection. If kits ever differ by team, add one and have page code send
//  `player.kitImageUrl` - that overrides these without any change here.
const KIT_IMAGES = {
    playing: "",
    training: ""
};

// Where the name and number sit on the shirt image, and how big they are.
// Positions are percentages FROM THE TOP of the image, so they hold at any
// size - bigger number moves it down. Defaults assume a front-on shirt
// filling most of the frame; tune to your own photo.
//
// FASTEST WAY TO TUNE: don't edit-republish-refresh for each nudge. Open the
// profile on the live site, right-click the name -> Inspect, find .kname /
// .knum in the shadow DOM, and drag the `top` and `font-size` values in
// DevTools until it sits right. Then paste those final numbers here once.
// Tuned against the real kit photos 2026-08-16. Both variants share these -
// the training top takes the same 22% for the name and simply has no number.
// If the training kit ever needs its own position, this splits into a
// playing/training pair rather than growing conditionals at the call site.
const KIT_TEXT_POSITION = {
    nameTop: "22%",
    nameSize: "8px",
    numberTop: "40%",
    numberSize: "15px"
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
    --info:#1F5FA8; --info-bg:#E0EDFB;
    color: var(--text);
  }

  /* ---------- persistent header ---------- */
  /* Outside the tabs on purpose: whose profile you're on stays visible on
     all three, and Overview's grid doesn't have to repeat name and team. */
  .phead {
    display: flex; align-items: center; gap: 14px;
    padding: 16px; border-bottom: 1px solid var(--line);
  }
  @media (min-width: 750px) { .phead { padding: 20px 24px; gap: 18px; } }

  .avatar {
    width: 54px; height: 54px; border-radius: 50%; flex-shrink: 0;
    background: var(--pitch-soft); color: var(--pitch);
    display: flex; align-items: center; justify-content: center;
    font-size: 18px; font-weight: 700; letter-spacing: 0.5px;
  }
  .who { flex: 1; min-width: 0; }
  .who h2 { margin: 0; font-size: 19px; font-weight: 700; letter-spacing: -0.3px; line-height: 1.2; overflow-wrap: anywhere; }
  .who p { margin: 3px 0 0; font-size: 12.5px; color: var(--text-muted); }

  /* Shirt: drawn rather than an image, so it scales and themes with
     everything else. Playing shows a squad number, training-only doesn't -
     mutually exclusive, same rule as the two native graphics it replaces. */
  .shirt { flex-shrink: 0; width: 62px; text-align: center; }
  .shirt svg { width: 100%; height: auto; display: block; }
  .shirt .sname {
    font-size: 8px; font-weight: 700; letter-spacing: 0.4px;
    text-transform: uppercase; fill: #fff;
  }
  .shirt .snum { font-size: 15px; font-weight: 800; fill: #fff; }

  /* Kit photo variant. The image sets the size; the name and number are
     absolutely placed over it, so they hold position at any width. */
  .kit { position: relative; line-height: 0; }
  .kit img { width: 100%; height: auto; display: block; border-radius: 4px; }
  .kit .kname, .kit .knum {
    position: absolute; left: 0; right: 0; text-align: center;
    color: #fff; line-height: 1; pointer-events: none;
    /* The shirt behind is a photo, so contrast can't be guaranteed - a soft
       shadow keeps the text readable on a light kit as well as a dark one. */
    text-shadow: 0 1px 3px rgba(0,0,0,0.55);
  }
  /* font-size is set inline from KIT_TEXT_POSITION - see the top of the file. */
  .kit .kname { font-weight: 700; letter-spacing: 0.4px; text-transform: uppercase; }
  .kit .knum { font-weight: 800; }

  /* ---------- tabs ---------- */
  .tabs { display: flex; gap: 6px; padding: 12px 16px; border-bottom: 1px solid var(--line); }
  @media (min-width: 750px) { .tabs { padding: 14px 24px; } }
  .tab {
    flex: 1 1 0; font-family: inherit; font-size: 12.5px; font-weight: 600;
    padding: 9px 8px; border-radius: 999px; cursor: pointer; white-space: nowrap;
    background: var(--surface); color: var(--text-muted); border: 1px solid var(--line);
  }
  .tab:hover { border-color: var(--text-faint); color: var(--text); }
  .tab:focus-visible { outline: 2px solid var(--pitch); outline-offset: 2px; }
  .tab[aria-current="true"] { background: var(--pitch); border-color: var(--pitch); color: #fff; }

  .body { padding: 16px; }
  @media (min-width: 750px) { .body { padding: 20px 24px; } }
  .panel { display: none; }
  .panel.active { display: block; }

  .section-title {
    font-size: 11px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.6px; color: var(--text-faint); margin: 0 0 13px;
  }
  /* Any section title that FOLLOWS something gets air above it; the first one
     in a panel has no preceding sibling and so gets none. Replaces both the
     never-matching adjacent-sibling rule and the inline margin hacks. */
  * + .section-title { margin-top: 26px; }
  .block + .block { margin-top: 26px; }
  .block { display: block; }

  /* ---------- read-only fact rows ---------- */
  .facts { display: grid; grid-template-columns: 1fr; gap: 0; }
  @media (min-width: 620px) { .facts { grid-template-columns: 1fr 1fr; column-gap: 24px; } }
  .fact {
    display: flex; justify-content: space-between; gap: 14px;
    padding: 10px 0; border-bottom: 1px solid var(--line-soft); font-size: 13px;
  }
  .fact dt { color: var(--text-muted); margin: 0; }
  .fact dd { margin: 0; font-weight: 600; text-align: right; overflow-wrap: anywhere; }

  /* ---------- consent card ---------- */
  .consent-card { margin-top: 22px; border: 1px solid var(--line); border-radius: 12px; padding: 15px 16px; }
  .consent-card .cstate { font-size: 13.5px; font-weight: 700; margin-bottom: 4px; }
  .consent-card .cstate.done { color: var(--success); }
  .consent-card .cstate.partial { color: var(--warning); }
  .consent-card p { margin: 0 0 12px; font-size: 12px; color: var(--text-muted); line-height: 1.5; }

  /* ---------- stats ---------- */
  .tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(88px, 1fr)); gap: 9px; }
  .tile {
    background: var(--raised); border: 1px solid var(--line);
    border-radius: 11px; padding: 12px 10px; text-align: center;
  }
  .tile .n {
    display: block; font-size: 22px; font-weight: 800; line-height: 1.1;
    font-variant-numeric: tabular-nums;
  }
  .tile .l {
    display: block; font-size: 10.5px; font-weight: 600; margin-top: 3px;
    color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.4px;
  }

  .form-guide { display: flex; gap: 6px; flex-wrap: wrap; }
  .form-guide .r {
    width: 27px; height: 27px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 11.5px; font-weight: 700; color: #fff;
  }
  .form-guide .r.W { background: var(--success); }
  .form-guide .r.L { background: var(--critical); }
  .form-guide .r.D { background: var(--text-faint); }

  /* ---------- form fields ---------- */
  .field { margin-bottom: 14px; }
  .field > label { display: block; font-size: 11.5px; font-weight: 600; color: var(--text-muted); margin-bottom: 5px; }
  .field input, .field select, .field textarea {
    width: 100%; font-family: inherit; font-size: 14.5px; padding: 11px 12px;
    border: 1.5px solid var(--line); border-radius: 8px;
    background: var(--surface); color: var(--text);
  }
  .field textarea { resize: vertical; min-height: 76px; }
  .field input:focus, .field select:focus, .field textarea:focus { outline: none; border-color: var(--pitch); }
  .field input[disabled], .field select[disabled], .field textarea[disabled] {
    background: var(--line-soft); color: var(--text-muted); cursor: not-allowed;
  }
  /* iOS Safari zooms the page when an input under 16px takes focus and never
     zooms back out. */
  @media (max-width: 749px) { .field input, .field select, .field textarea { font-size: 16px; } }
  .field input[type="date"] {
    -webkit-appearance: none; appearance: none; min-width: 0; max-width: 100%; display: block;
  }
  .field input[type="date"]::-webkit-date-and-time-value { text-align: left; margin: 0; }
  .hint { font-size: 11px; color: var(--text-faint); margin-top: 5px; line-height: 1.45; }

  .group { margin-bottom: 14px; }
  .group > .glabel { display: block; font-size: 11.5px; font-weight: 600; color: var(--text-muted); margin-bottom: 5px; }
  .radios { display: flex; gap: 8px; flex-wrap: wrap; }
  .radio { flex: 1 1 auto; min-width: 96px; position: relative; }
  .radio input { position: absolute; opacity: 0; width: 1px; height: 1px; }
  .radio span {
    display: block; text-align: center; cursor: pointer;
    font-size: 13px; font-weight: 600; padding: 10px 12px;
    border: 1.5px solid var(--line); border-radius: 9px;
    background: var(--surface); color: var(--text-muted);
  }
  .radio input:checked + span { border-color: var(--pitch); background: var(--pitch-soft); color: var(--pitch); }
  .radio input:disabled + span { opacity: 0.55; cursor: not-allowed; }

  .cond { display: none; padding: 14px; margin-bottom: 14px; border-radius: 11px; background: var(--line-soft); }
  .cond.show { display: block; }
  .cond > .clabel { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: var(--text-faint); margin-bottom: 10px; }

  /* ---------- address ---------- */
  .addr-chosen { display: none; margin-top: 4px; padding: 10px 12px; border-radius: 8px; background: var(--pitch-soft); font-size: 13px; line-height: 1.5; }
  .addr-chosen.show { display: block; }
  .addr-chosen .change {
    display: block; margin-top: 6px; background: none; border: none; padding: 0;
    font-family: inherit; font-size: 11.5px; font-weight: 600;
    color: var(--pitch); text-decoration: underline; cursor: pointer;
  }
  .addr-manual { display: none; margin-top: 8px; }
  .addr-manual.show { display: block; }

  /* ---------- buttons ---------- */
  .btn {
    font-family: inherit; font-size: 13.5px; font-weight: 600;
    padding: 12px 16px; border-radius: 9px; border: 1px solid transparent;
    cursor: pointer; text-align: center;
  }
  .btn.primary { background: var(--pitch); color: #fff; }
  .btn.secondary { background: var(--surface); color: var(--pitch); border-color: var(--line); }
  .btn[disabled] { opacity: 0.55; cursor: default; }
  .btn:focus-visible { outline: 2px solid var(--pitch); outline-offset: 2px; }
  .btn-text {
    display: block; margin: 10px auto 0; background: none; border: none;
    font-family: inherit; font-size: 12px; font-weight: 600;
    color: var(--text-muted); text-decoration: underline; cursor: pointer;
  }

  /* ---------- notices ---------- */
  .notice {
    display: none; padding: 12px 14px; border-radius: 11px; margin-bottom: 16px;
    font-size: 12.5px; line-height: 1.5;
    background: var(--info-bg); color: var(--info);
  }
  .notice.show { display: block; }

  .savemsg { font-size: 12px; text-align: center; min-height: 16px; margin-top: 10px; }
  .savemsg.ok { color: var(--success); font-weight: 600; }
  .savemsg.bad { color: var(--critical); font-weight: 600; }

  .empty { padding: 18px 0; font-size: 12.5px; color: var(--text-muted); }
  .loading { padding: 40px 16px; text-align: center; font-size: 13px; color: var(--text-muted); }

  @media (prefers-color-scheme: dark) {
    .wrap {
      --surface:#0E1826; --raised:#121F30; --line:#223145; --line-soft:#1A2739;
      --text:#E7ECF2; --text-muted:#A6B4C3; --text-faint:#71818F;
      --pitch:#5FBF8B; --pitch-soft:#17301F;
      --success:#5FD08B; --success-bg:#103322;
      --warning:#E5B567; --warning-bg:#3A2C10;
      --critical:#F08A8A; --critical-bg:#3A1414;
      --info:#7FB2EC; --info-bg:#132A42;
    }
    .btn.primary, .tab[aria-current="true"] { color: #06120C; }
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

function factRow(label, value) {
    return `<div class="fact"><dt>${esc(label)}</dt><dd>${esc(value || "Not Provided")}</dd></div>`;
}

function tile(n, label) {
    return `<div class="tile"><span class="n">${esc(n)}</span><span class="l">${esc(label)}</span></div>`;
}

function optionsHtml(list, placeholder) {
    const opts = Array.isArray(list) ? list : [];
    return `<option value="">${esc(placeholder || "Please choose…")}</option>` +
        opts.map(o => `<option value="${esc(o.value)}">${esc(o.label)}</option>`).join("");
}

function yesNo(name) {
    return `
      <div class="radios">
        <label class="radio"><input type="radio" name="${name}" value="true"><span>Yes</span></label>
        <label class="radio"><input type="radio" name="${name}" value="false"><span>No</span></label>
      </div>`;
}

// The same Find-address / manual-entry pair used on Registration.
function addressFieldHtml(key, label, hint) {
    return `
      <div class="field" id="f${key}">
        <label>${esc(label)}</label>
        <div class="addr-chosen" id="chosen${key}">
          <span id="chosenText${key}"></span>
          <button type="button" class="change" id="change${key}">Change address</button>
        </div>
        <button type="button" class="btn secondary" id="find${key}" style="width:100%">Find address</button>
        <button type="button" class="btn-text" id="manual${key}">Enter it manually instead</button>
        <div class="addr-manual" id="man${key}">
          <textarea id="in${key}" rows="3"></textarea>
        </div>
        ${hint ? `<div class="hint">${esc(hint)}</div>` : ""}
      </div>`;
}

const SHIRT_SVG = (lastName, number) => `
  <svg viewBox="0 0 64 62" aria-hidden="true">
    <path d="M22 4 8 10l3 13 6-2v33h30V21l6 2 3-13L42 4l-10 6z" fill="currentColor"/>
    <text class="sname" x="32" y="34" text-anchor="middle">${esc(lastName)}</text>
    ${number !== null ? `<text class="snum" x="32" y="50" text-anchor="middle">${esc(number)}</text>` : ""}
  </svg>`;

// Real kit photo with the child's name and number laid over it. onerror swaps
// in the drawn shirt, so a bad URL degrades to the simple graphic instead of a
// broken-image icon on a parent's screen.
const SHIRT_IMG = (url, lastName, number) => `
  <div class="kit">
    <img src="${esc(url)}" alt="" onerror="this.closest('.shirt').innerHTML = this.getAttribute('data-fallback');"
         data-fallback="${esc(SHIRT_SVG(lastName, number))}" />
    <span class="kname" style="top:${esc(KIT_TEXT_POSITION.nameTop)};font-size:${esc(KIT_TEXT_POSITION.nameSize)}">${esc(lastName)}</span>
    ${number !== null ? `<span class="knum" style="top:${esc(KIT_TEXT_POSITION.numberTop)};font-size:${esc(KIT_TEXT_POSITION.numberSize)}">${esc(number)}</span>` : ""}
  </div>`;

class ParentHubProfile extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._built = false;
        this._data = { loading: true };
        this._tab = 0;
        this._loadedPlayerId = null;
        this._isPrimary = false;
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
            if (parsed && typeof parsed === "object") { this._data = parsed; this.applyData(); }
        } catch (err) {
            console.error("parent-hub-profile: couldn't parse data attribute", err);
        }
    }

    $(id) { return this.shadowRoot.getElementById(id); }

    build() {
        if (this._built) return;
        this._built = true;

        this.shadowRoot.innerHTML = `
          <style>${STYLES}</style>
          <div class="wrap">
            <div class="loading" id="loading">Loading profile…</div>

            <div id="profile" style="display:none">
              <div class="phead">
                <div class="avatar" id="initials">?</div>
                <div class="who">
                  <h2 id="fullName"></h2>
                  <p id="teamName"></p>
                </div>
                <div class="shirt" id="shirt"></div>
              </div>

              <div class="tabs" id="tabs" role="tablist"></div>

              <div class="body">
                <section class="panel" id="panel0">
                  <div class="section-title">Player</div>
                  <dl class="facts" id="factsPlayer"></dl>
                  <div class="section-title">Kit sizes</div>
                  <dl class="facts" id="factsKit"></dl>

                  <div class="consent-card">
                    <div class="cstate" id="consentState"></div>
                    <p>Photography, social media, FA registration and emergency medical treatment.</p>
                    <button type="button" class="btn secondary" id="btnConsent" style="width:100%">Review consent</button>
                  </div>
                </section>

                <section class="panel" id="panel1">
                  <div class="field" id="fSeason">
                    <label for="inSeason">Season</label>
                    <select id="inSeason"></select>
                  </div>
                  <div class="section-title">${esc("Player")}</div>
                  <div class="tiles" id="playerTiles"></div>
                  <div class="section-title">Team</div>
                  <div class="tiles" id="teamTiles"></div>
                  <div class="section-title">Recent form</div>
                  <div class="form-guide" id="formGuide"></div>
                </section>

                <section class="panel" id="panel2">
                  <!-- Shown to a secondary parent. The primary's details aren't
                       merely hidden here - they were stripped server-side and
                       never reached the browser. -->
                  <div class="notice" id="secondaryNote">
                    You're viewing as a secondary parent — the primary parent's contact
                    details and the emergency contact are managed by them.
                  </div>

                  <div class="block" id="blockPrimary">
                    <div class="section-title">Your details</div>
                    <dl class="facts" id="factsParent"></dl>
                    <div class="field">
                      <label for="inParentMobile">Your mobile</label>
                      <input id="inParentMobile" type="tel" autocomplete="tel" />
                    </div>
                    ${addressFieldHtml("Address", "Player's home address", "")}
                    ${addressFieldHtml("ParentAddress", "Your address, if different", "Leave blank if it's the same as the player's.")}
                    <div class="field">
                      <label for="inParentDob">Your date of birth</label>
                      <input id="inParentDob" type="date" />
                    </div>
                  </div>

                  <div class="block" id="blockEmergency">
                    <div class="section-title">Emergency contact</div>
                    <div class="field"><label for="inEmergName">Name</label><input id="inEmergName" type="text" /></div>
                    <div class="field"><label for="inEmergNumber">Mobile</label><input id="inEmergNumber" type="tel" /></div>
                    <div class="field"><label for="inEmergRelation">Relationship</label><select id="inEmergRelation"></select></div>
                  </div>

                  <div class="block">
                    <div class="section-title">Family</div>
                    <div class="group" id="gSecond">
                      <span class="glabel">Second parent or guardian</span>
                      ${yesNo("addSecond")}
                    </div>
                    <div class="cond" id="condSecond">
                      <div class="clabel">Second parent / guardian</div>
                      <div class="field"><label for="inSecName">Full name</label><input id="inSecName" type="text" /></div>
                      <div class="field"><label for="inSecMobile">Mobile</label><input id="inSecMobile" type="tel" /></div>
                      <div class="field"><label for="inSecEmail">Email</label><input id="inSecEmail" type="email" /></div>
                      <div class="field"><label for="inSecRelation">Relationship</label><select id="inSecRelation"></select></div>
                      <div class="field"><label for="inSecDob">Date of birth</label><input id="inSecDob" type="date" /></div>
                      ${addressFieldHtml("SecAddress", "Address, if different", "")}
                    </div>
                    <div class="group" id="gBoth">
                      <span class="glabel">Lives with both parents</span>
                      ${yesNo("bothParents")}
                    </div>
                  </div>

                  <div class="block">
                    <div class="section-title">Medical</div>
                    <div class="group" id="gMedical">
                      <span class="glabel">Any medical conditions or allergies</span>
                      ${yesNo("medical")}
                    </div>
                    <div class="cond" id="condMedical">
                      <div class="field">
                        <label for="inMedicalInfo">Details</label>
                        <textarea id="inMedicalInfo" rows="4"></textarea>
                      </div>
                    </div>
                  </div>

                  <button type="button" class="btn primary" id="btnSave" style="width:100%;margin-top:6px">Save Changes</button>
                  <div class="savemsg" id="saveMsg"></div>
                </section>
              </div>
            </div>
          </div>`;

        this.buildTabs();
        this.wire();
        this.showTab(0);
    }

    buildTabs() {
        const tabs = this.$("tabs");
        tabs.innerHTML = TABS.map((t, i) =>
            `<button type="button" class="tab" role="tab" data-tab="${i}" id="tab${i}">${esc(t.title)}</button>`).join("");
        tabs.addEventListener("click", (e) => {
            const btn = e.target.closest("[data-tab]");
            if (btn) this.showTab(Number(btn.getAttribute("data-tab")));
        });
    }

    wire() {
        const $ = (id) => this.$(id);

        this.shadowRoot.addEventListener("change", (e) => {
            const el = e.target;
            if (!el) return;
            if (el.name === "addSecond" || el.name === "medical") this.applyConditionals();
            if (el.id === "inSeason") {
                this.dispatchEvent(new CustomEvent("seasonChange", { detail: { season: el.value } }));
            }
        });

        $("btnSave").addEventListener("click", () => {
            this.dispatchEvent(new CustomEvent("saveProfile", { detail: this.collect() }));
        });

        $("btnConsent").addEventListener("click", () => {
            const c = (this._data.player && this._data.player.consent) || {};
            this.dispatchEvent(new CustomEvent("openConsent", { detail: Object.assign({}, c) }));
        });

        ["Address", "ParentAddress", "SecAddress"].forEach(key => {
            const open = () => this.dispatchEvent(new CustomEvent("openAddressLookup", {
                detail: { field: key, current: this._addressData[key] || null }
            }));
            $("find" + key).addEventListener("click", open);
            $("change" + key).addEventListener("click", open);
            $("manual" + key).addEventListener("click", () => {
                $("man" + key).classList.add("show");
                $("manual" + key).style.display = "none";
                $("in" + key).focus();
                this._addressData[key] = null;
                this.paintAddress(key);
            });
        });
    }

    showTab(index) {
        const next = Math.max(0, Math.min(TABS.length - 1, index));
        this._tab = next;
        TABS.forEach((t, i) => {
            this.$("panel" + i).classList.toggle("active", i === next);
            this.$("tab" + i).setAttribute("aria-current", String(i === next));
        });
    }

    applyConditionals() {
        this.$("condSecond").classList.toggle("show", this.radioValue("addSecond") === "true");
        this.$("condMedical").classList.toggle("show", this.radioValue("medical") === "true");
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

    applyData() {
        const d = this._data;
        this.$("loading").style.display = d.loading ? "" : "none";
        this.$("profile").style.display = d.loading ? "none" : "";
        if (d.loading) return;

        if (d.options) this.applyOptions(d.options);

        const p = d.player || {};
        if (p.id && p.id !== this._loadedPlayerId) {
            this._loadedPlayerId = p.id;
            this.applyPlayer(p);
            // Always land on Overview - never leave it on whichever tab was
            // open for the previously-viewed child.
            this.showTab(0);
        }

        // Arrives after a Lightbox closes, so outside the once-per-player rule.
        if (d.addressResult && d.addressResult.field) {
            const key = d.addressResult.field;
            const addr = d.addressResult.address;
            if (addr && addr.formatted) {
                this._addressData[key] = addr;
                this.$("in" + key).value = addr.formatted;
                this.$("man" + key).classList.remove("show");
            }
        }
        if (d.consent) {
            this._data.player = Object.assign({}, this._data.player, { consent: d.consent });
        }

        this.paintConsent();
        this.paintStats();
        this.paintSaveState();
        ["Address", "ParentAddress", "SecAddress"].forEach(k => this.paintAddress(k));
    }

    applyOptions(options) {
        const set = (id, list) => {
            const el = this.$(id);
            const keep = el.value;
            el.innerHTML = optionsHtml(list);
            if (keep) el.value = keep;
        };
        set("inEmergRelation", options.relationship);
        set("inSecRelation", options.relationship);

        const season = this.$("inSeason");
        const keepSeason = season.value;
        season.innerHTML = optionsHtml(options.seasons, "Choose a season…");
        if (keepSeason) season.value = keepSeason;
    }

    applyPlayer(p) {
        const $ = (id) => this.$(id);
        const val = (id, v) => { $(id).value = v == null ? "" : v; };
        this._isPrimary = p.isPrimary === true;

        // Header
        $("initials").textContent = p.initials || "?";
        $("fullName").textContent = `${p.firstName || ""} ${p.lastName || ""}`.trim() || "Player";
        $("teamName").textContent = p.teamName || "Squad Unassigned";
        const lastNameUpper = (p.lastName || "").toUpperCase();
        const shirtNumber = p.trainingOnly ? null : (p.kitNumber != null ? String(p.kitNumber) : "0");
        // player.kitImageUrl wins if page code sends one (per-team kits);
        // otherwise the club-wide constant; otherwise the drawn shirt.
        const kitUrl = p.kitImageUrl || (p.trainingOnly ? KIT_IMAGES.training : KIT_IMAGES.playing);
        $("shirt").innerHTML = kitUrl
            ? SHIRT_IMG(kitUrl, lastNameUpper, shirtNumber)
            : SHIRT_SVG(lastNameUpper, shirtNumber);
        $("shirt").style.color = "var(--pitch)";

        // Overview
        $("factsPlayer").innerHTML = [
            factRow("Team manager", p.managerName),
            factRow("FAN number", p.fanNumber || "Pending FA Reg"),
            factRow("Membership no.", p.membershipNo || "Not yet assigned"),
            factRow("Date of birth", p.dob),
            factRow("Gender", p.gender),
            factRow("Player type", p.trainingOnly ? "Training Only" : "Playing")
        ].join("");
        $("factsKit").innerHTML = [
            factRow("Shirt", p.shirt), factRow("Shorts", p.shorts),
            factRow("Socks", p.socks), factRow("Hoodie", p.hoodie),
            factRow("Coat", p.coat)
        ].join("");

        // Edit Details — read-only facts first
        $("factsParent").innerHTML = [
            factRow("Name", p.parentName),
            factRow("Relationship", p.parentRelation),
            factRow("Email", p.parentEmail)
        ].join("");

        val("inParentMobile", p.parentMobile);
        val("inParentDob", p.parentDob);
        val("inAddress", p.address);
        val("inParentAddress", p.parentAddress);
        val("inEmergName", p.emergName);
        val("inEmergNumber", p.emergNumber);
        val("inEmergRelation", p.emergRelation);

        this.setRadio("addSecond", p.hasSecondParent);
        val("inSecName", p.secName);
        val("inSecMobile", p.secMobile);
        val("inSecEmail", p.secEmail);
        val("inSecRelation", p.secRelation);
        val("inSecDob", p.secDob);
        val("inSecAddress", p.secAddress);

        this.setRadio("bothParents", p.bothParents);
        this.setRadio("medical", p.hasMedical);
        val("inMedicalInfo", p.medicalInfo);

        [["Address", p.addressStructured], ["ParentAddress", p.parentAddressStructured],
         ["SecAddress", p.secAddressStructured]].forEach(([key, v]) => {
            this._addressData[key] = (v && v.formatted) ? v : null;
        });

        this.applyConditionals();
        this.applyRbac();
    }

    // Presentation only - see the warning at the top of this file. A secondary
    // parent's payload doesn't contain the primary's details at all.
    applyRbac() {
        const primary = this._isPrimary;
        this.$("secondaryNote").classList.toggle("show", !primary);
        this.$("blockPrimary").style.display = primary ? "" : "none";
        this.$("blockEmergency").style.display = primary ? "" : "none";

        // Everything still on screen for a secondary parent is view-only.
        this.shadowRoot.querySelectorAll("#panel2 input, #panel2 select, #panel2 textarea")
            .forEach(el => { el.disabled = !primary; });

        const save = this.$("btnSave");
        save.disabled = !primary;
        save.textContent = primary ? "Save Changes" : "Secondary Parent — Read Only";
    }

    paintAddress(key) {
        const $ = (id) => this.$(id);
        const structured = this._addressData[key];
        const typed = String($("in" + key).value || "").trim();
        const manualOpen = $("man" + key).classList.contains("show");

        $("chosen" + key).classList.toggle("show", !!structured);
        if (structured) $("chosenText" + key).textContent = structured.formatted || typed;

        const hide = !!structured || manualOpen;
        $("find" + key).style.display = hide ? "none" : "";
        $("manual" + key).style.display = hide ? "none" : "";
        if (typed && !structured) $("man" + key).classList.add("show");
    }

    paintConsent() {
        const c = (this._data.player && this._data.player.consent) || {};
        const values = [c.photo, c.social, c.fa, c.medical];
        const answered = values.filter(v => v === true || v === false).length;
        const agreed = values.filter(v => v === true).length;

        const el = this.$("consentState");
        if (answered < 4) {
            el.className = "cstate partial";
            el.textContent = `${answered} of 4 answered — review needed`;
        } else if (agreed === 4) {
            el.className = "cstate done";
            el.textContent = "All 4 agreed ✓";
        } else {
            // Declining photos or social media is a genuine preference, not an
            // error - this reports what was AGREED so a Yes→No change visibly
            // moves, which counting "answered" alone did not.
            el.className = "cstate done";
            el.textContent = `${agreed} of 4 agreed`;
        }
    }

    paintStats() {
        const s = this._data.stats || {};
        const t = this._data.teamStats || {};

        this.$("playerTiles").innerHTML = [
            tile(s.goals || 0, "Goals"), tile(s.assists || 0, "Assists"),
            tile(s.tackles || 0, "Tackles"), tile(s.saves || 0, "Saves"),
            tile(s.potm || 0, "POTM")
        ].join("");

        this.$("teamTiles").innerHTML = [
            tile(t.wins || 0, "Won"), tile(t.losses || 0, "Lost"), tile(t.draws || 0, "Drawn"),
            tile(t.gf || 0, "For"), tile(t.ga || 0, "Against"), tile(t.gd || 0, "GD")
        ].join("");

        const form = Array.isArray(t.form) ? t.form : [];
        this.$("formGuide").innerHTML = form.length
            ? form.map(r => `<span class="r ${esc(r)}">${esc(r)}</span>`).join("")
            : `<div class="empty">No results recorded for this season yet.</div>`;
    }

    paintSaveState() {
        const state = (this._data.saveState || "idle").toLowerCase();
        const msg = this.$("saveMsg");
        const btn = this.$("btnSave");

        if (this._isPrimary) {
            btn.disabled = state === "saving";
            btn.textContent = state === "saving" ? "Saving…" : "Save Changes";
        }
        msg.className = "savemsg" + (state === "saved" ? " ok" : state === "error" ? " bad" : "");
        msg.textContent = this._data.saveMessage || "";
    }

    collect() {
        const $ = (id) => this.$(id);
        const v = (id) => $(id).value;
        const tri = (name) => {
            const val = this.radioValue(name);
            return val === null ? null : val === "true";
        };
        return {
            playerId: this._loadedPlayerId,
            parentMobile: v("inParentMobile"),
            parentDob: v("inParentDob"),
            address: v("inAddress"),
            addressStructured: this._addressData.Address,
            parentAddress: v("inParentAddress"),
            parentAddressStructured: this._addressData.ParentAddress,
            emergName: v("inEmergName"),
            emergNumber: v("inEmergNumber"),
            emergRelation: v("inEmergRelation"),
            hasSecondParent: tri("addSecond"),
            secName: v("inSecName"),
            secMobile: v("inSecMobile"),
            secEmail: v("inSecEmail"),
            secRelation: v("inSecRelation"),
            secDob: v("inSecDob"),
            secAddress: v("inSecAddress"),
            secAddressStructured: this._addressData.SecAddress,
            bothParents: tri("bothParents"),
            hasMedical: tri("medical"),
            medicalInfo: v("inMedicalInfo")
        };
    }
}

if (!customElements.get("parent-hub-profile")) {
    customElements.define("parent-hub-profile", ParentHubProfile);
}

// =====================================================================
//  PAGE CODE CONTRACT
// =====================================================================
//  IN — {loading:true} first, then:
//    player: { id, firstName, lastName, initials, teamName, trainingOnly,
//              kitNumber, managerName, fanNumber, membershipNo, dob, gender,
//              shirt, shorts, socks, hoodie, coat,
//              isPrimary,                         // presentation only
//              parentName, parentRelation, parentEmail, parentMobile,
//              parentDob, address, addressStructured,
//              parentAddress, parentAddressStructured,
//              emergName, emergNumber, emergRelation,
//              hasSecondParent, secName, secMobile, secEmail, secRelation,
//              secDob, secAddress, secAddressStructured,
//              bothParents, hasMedical, medicalInfo,
//              consent: { photo, social, fa, medical } }
//    options: { relationship: [], seasons: [] }
//    stats:     { goals, assists, tackles, saves, potm }
//    teamStats: { wins, losses, draws, gf, ga, gd, form: ["W","L","D"] }
//    saveState / saveMessage, plus `consent` and `addressResult` after a
//    Lightbox closes.
//
//  OUT:
//    on("saveProfile",        e => …)   // the editable fields only
//    on("openConsent",        e => …)   // shared ConsentRegistration lightbox
//    on("openAddressLookup",  e => …)   // shared AddressLookup lightbox
//    on("seasonChange",       e => …)   // reload stats for e.detail.season
//
//  ⚠️ Send a secondary parent NOTHING you don't want them to have.
//  getKidsForParent already strips the primary parent's details server-side;
//  `isPrimary` here only decides what gets drawn.
// =====================================================================
