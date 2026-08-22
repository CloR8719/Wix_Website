// =====================================================================
//  <manager-hub-topbar> — Manager Hub v2, top bar
// =====================================================================
//  Crest, back button, title and subtitle - four native elements into one.
//
//  Ported from parentHubTopbar.js, structurally identical so a fix in one
//  copies straight into the other. The difference is the accent: CHARCOAL
//  here against the Parent Hub's club green, so the two hubs are
//  distinguishable at a glance for people who use both.
//
//  SETUP:
//    1. Public -> custom-elements -> new file `managerHubTopbar.js`.
//    2. Add -> Embed Code -> Custom Element, OUTSIDE #stateboxMgr so it
//       stays visible on every state.
//       Tag name: manager-hub-topbar   Element ID: #customTopbar
//    3. Full width, ~72px tall. Pin it to the top of the screen if you want
//       it to stay put while a long form scrolls.
//
//  THE CREST IS THE ONLY WAY BACK TO THE MAIN SITE from this page, and
//  deliberately a quiet one: the site header and footer are stripped here to
//  keep the app feel, so a prominent "visit our website" button would fight
//  that. It's a real <a href>, so it works even if every other line of JS in
//  this element throws.
// =====================================================================

//  Media Manager -> right-click -> Copy URL (the https://static.wixstatic.com
//  one). A `wix:image://` URI will NOT work as an <img> src. Leave blank and
//  the club initials show instead, so nothing renders broken.
const CREST_URL = "https://static.wixstatic.com/media/1c0088_cee7211f27184a17a5b42fc2c20d8571~mv2.png";
const CLUB_INITIALS = "SA";

// Relative on purpose - keeps the link correct on the live site, the test
// site and any preview domain. An absolute URL would bounce testers onto
// production.
const SITE_URL = "/";

const STYLES = `
  :host { display: block; width: 100%; height: 100%; font-family: 'Work Sans', -apple-system, BlinkMacSystemFont, sans-serif; }
  * { box-sizing: border-box; }

  .wrap {
    /* Charcoal replaces the Parent Hub's pitch green. Kept under the same
       token names so every other rule in this file is untouched. */
    --surface:#FFFFFF; --pitch:#2C3540; --pitch-soft:#E3E6EA;
    --line:#E1E4DB; --text:#16212F; --text-muted:#5C6B7A;
    height: 100%; background: var(--surface);
    border-bottom: 1px solid var(--line);
    display: flex; align-items: center; gap: 12px;
    padding: 10px 14px;
  }
  @media (min-width: 750px) { .wrap { padding: 12px 24px; gap: 16px; } }

  .crest { flex-shrink: 0; display: flex; align-items: center; text-decoration: none; }
  .crest img { width: 38px; height: 38px; object-fit: contain; display: block; }
  .crest .fallback {
    width: 38px; height: 38px; border-radius: 50%;
    background: var(--pitch-soft); color: var(--pitch);
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; font-weight: 800; letter-spacing: 0.5px;
  }
  .crest:focus-visible { outline: 2px solid var(--pitch); outline-offset: 3px; border-radius: 50%; }

  .back {
    display: none; flex-shrink: 0; width: 34px; height: 34px;
    align-items: center; justify-content: center;
    background: none; border: 1px solid var(--line); border-radius: 9px;
    color: var(--text-muted); cursor: pointer; padding: 0;
  }
  .back.show { display: flex; }
  .back:hover { color: var(--pitch); border-color: var(--pitch); }
  .back:focus-visible { outline: 2px solid var(--pitch); outline-offset: 2px; }
  .back svg { width: 17px; height: 17px; }

  .txt { flex: 1; min-width: 0; }
  .txt h1 {
    margin: 0; font-size: 16px; font-weight: 700; line-height: 1.25;
    letter-spacing: -0.2px; color: var(--text);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  @media (min-width: 750px) { .txt h1 { font-size: 18px; } }
  .txt p {
    margin: 1px 0 0; font-size: 11.5px; color: var(--text-muted); line-height: 1.35;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .txt p:empty { display: none; }

  @media (prefers-color-scheme: dark) {
    .wrap {
      --surface:#0E1826; --line:#223145; --text:#E7ECF2; --text-muted:#A6B4C3;
      /* Charcoal's dark-mode counterpart. On a near-black ground the accent
         has to LIGHTEN to stay legible - the same inversion the green makes
         in the Parent Hub, just along a neutral axis. */
      --pitch:#A9B6C4; --pitch-soft:#1B222B;
    }
  }
`;

const BACK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>';

function esc(value) {
    return String(value == null ? "" : value)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;")
        .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

class ManagerHubTopbar extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._built = false;
        this._data = {};
    }

    static get observedAttributes() { return ["data"]; }
    connectedCallback() { this.build(); }

    attributeChangedCallback(name, oldValue, newValue) {
        if (!this._built) this.build();
        if (name !== "data" || !newValue) return;
        try {
            const parsed = JSON.parse(newValue);
            if (parsed && typeof parsed === "object") { this._data = parsed; this.paint(); }
        } catch (err) {
            console.error("manager-hub-topbar: couldn't parse data attribute", err);
        }
    }

    build() {
        if (this._built) return;
        this._built = true;

        this.shadowRoot.innerHTML = `
          <style>${STYLES}</style>
          <header class="wrap">
            <a class="crest" href="${esc(SITE_URL)}" aria-label="Back to the club website">
              ${CREST_URL
                  ? `<img src="${esc(CREST_URL)}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'fallback',textContent:'${esc(CLUB_INITIALS)}'}))" />`
                  : `<span class="fallback">${esc(CLUB_INITIALS)}</span>`}
            </a>

            <button type="button" class="back" id="back" aria-label="Back">${BACK_ICON}</button>

            <div class="txt">
              <h1 id="title"></h1>
              <p id="sub"></p>
            </div>
          </header>`;

        this.shadowRoot.getElementById("back").addEventListener("click", () => {
            this.dispatchEvent(new CustomEvent("back", { detail: {} }));
        });

        this.paint();
    }

    paint() {
        const d = this._data;
        this.shadowRoot.getElementById("title").textContent = d.title || "";
        this.shadowRoot.getElementById("sub").textContent = d.sub || "";
        // Back only on the drill-down states, same rule as the native version.
        this.shadowRoot.getElementById("back").classList.toggle("show", !!d.showBack);
    }
}

if (!customElements.get("manager-hub-topbar")) {
    customElements.define("manager-hub-topbar", ManagerHubTopbar);
}

// =====================================================================
//  PAGE CODE CONTRACT
// =====================================================================
//  IN:
//    $w("#customTopbar").setAttribute("data", JSON.stringify({
//        title: "Home", sub: "Signol Athletic · Manager Hub", showBack: false
//    }));
//
//  setTopbar() already computes exactly these three - it just sets an
//  attribute now instead of writing to three elements.
//
//  OUT:
//    on("back", () => switchTab(currentTab));
//
//  The crest needs no wiring: it's an <a href> to SITE_URL at the top of
//  this file.
// =====================================================================
