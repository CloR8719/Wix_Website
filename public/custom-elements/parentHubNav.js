// =====================================================================
//  <parent-hub-nav> — Parent Hub v2, main navigation
// =====================================================================
//  Five nav items plus the Messages unread badge, replacing six native
//  elements.
//
//  SETUP:
//    1. Public -> custom-elements -> new file `parentHubNav.js`.
//    2. Add -> Embed Code -> Custom Element, OUTSIDE #stateboxHub2 so it
//       stays visible on every state.
//       Tag name: parent-hub-nav   Element ID: #customNav
//    3. Mobile: full width, pinned to the bottom of the screen, ~68px tall.
//       Desktop: down the left, ~92px wide, tall enough for five items.
//
//  ⚠️ WHERE IT SITS IS STILL A WIX DECISION. This element renders itself as
//  a row on narrow widths and a column on wide ones, but pinning it to the
//  bottom on mobile and placing it as a left rail on desktop is done in the
//  Editor, per breakpoint - Velo has no runtime positioning. So this turns
//  six elements into one; it doesn't remove the placement work.
//
//  Deliberately NOT using position:fixed inside the element to self-pin -
//  Wix wraps custom elements in containers that sometimes carry transforms,
//  and a transformed ancestor makes position:fixed resolve against that
//  ancestor instead of the viewport. Wix's own "Pin to screen" is reliable;
//  this isn't.
// =====================================================================

//  Club crest, shown at the top of the desktop rail only - on mobile the
//  bottom bar has no room and the topbar already carries it.
//  Media Manager -> right-click -> Copy URL (the https://static.wixstatic.com
//  one). A `wix:image://` URI will NOT work as an <img> src. Blank hides it.
const CREST_URL = "";

// ⚠️ OFF by default - try Wix's "Pin to Screen" first. Flip to true only if
// Wix won't let you pin on mobile alone. See the note in the styles below for
// why this is the fallback rather than the default.
const SELF_PIN_ON_MOBILE = false;

const ITEMS = [
    { state: "stateHome",     label: "Home",     icon: "home" },
    { state: "stateMessages", label: "Messages", icon: "mail", badge: true },
    { state: "stateFixtures", label: "Fixtures", icon: "calendar" },
    { state: "statePayments", label: "Payments", icon: "card" },
    { state: "stateMore",     label: "More",     icon: "more" }
];

const ICONS = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
    card: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>',
    more: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>'
};

const STYLES = `
  :host { display: block; width: 100%; height: 100%; font-family: 'Work Sans', -apple-system, BlinkMacSystemFont, sans-serif; }
  * { box-sizing: border-box; }

  .wrap {
    --rail-bg:#2D2E2D;      /* the dark ground */
    --rail-active:#2D2E2D;  /* same as the ground on purpose - see note above */
    --rail-text:#C7D0DA;    /* hover / awake */
    --rail-dim:#7C8CA6;     /* resting */
    --gold-soft:#E9C77E;    /* active */
    --critical:#C23B3B;
    height: 100%; background: var(--rail-bg);
    display: flex; align-items: stretch;
    border-top: 1px solid var(--rail-active);
  }

  /* Wide: a vertical rail. The breakpoint matches every other element so a
     parent never sees one component switch layout while another doesn't. */
  @media (min-width: 750px) {
    .wrap {
      flex-direction: column; align-items: stretch;
      border-top: none; border-right: none;
      padding: 14px 0;
    }
  }

  /* Only applied when SELF_PIN_ON_MOBILE is on, and only under 750px. */
  :host(.selfpin) { position: fixed; left: 0; right: 0; bottom: 0; z-index: 999; height: 68px; }
  @media (min-width: 750px) {
    :host(.selfpin) { position: static; height: 100%; }
  }

  .crest { display: none; }
  @media (min-width: 750px) {
    .crest { display: block; padding: 0 12px 16px; text-align: center; }
    .crest img { max-width: 46px; height: auto; }
  }

  .item {
    flex: 1 1 0; min-width: 0; position: relative;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 3px; padding: 8px 4px; cursor: pointer;
    background: none; border: none; font-family: inherit;
    color: var(--rail-dim);
  }
  @media (min-width: 750px) {
    .item { flex: 0 0 auto; padding: 12px 4px; gap: 4px; }
  }
  .item svg { width: 21px; height: 21px; }
  .item span {
    font-size: 10px; font-weight: 600; letter-spacing: 0.1px;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;
  }
  .item:hover { color: var(--rail-text); }
  /* Gold rather than the pitch green used everywhere else - on a navy ground
     the green sits too close to the background to read as a focus ring. */
  .item:focus-visible { outline: 2px solid var(--gold-soft); outline-offset: -3px; border-radius: 8px; }
  /* Active state is a filled pill, not colour alone - it survives greyscale
     and reads at a glance on a small bar. Drawn as the item's own background
     rather than a ::before at z-index:-1, which sat behind .wrap's background
     and was effectively invisible. */
  .item[aria-current="true"] {
    color: var(--gold-soft);
    background: var(--rail-active);
    border-radius: 10px;
    font-weight: 700;
  }
  .item[aria-current="true"] svg { stroke-width: 2.4; }
  /* Breathing room so the pill doesn't touch the bar's edges. */
  .wrap { padding: 5px 6px; }
  @media (min-width: 750px) { .wrap { padding: 14px 8px; } }

  .badge {
    position: absolute; top: 4px; left: 50%; margin-left: 4px;
    min-width: 16px; height: 16px; padding: 0 4px;
    border-radius: 999px; background: var(--critical); color: #fff;
    font-size: 9.5px; font-weight: 700; line-height: 16px; text-align: center;
    display: none;
  }
  .badge.show { display: block; }

  /* Already a dark surface, so dark mode holds the same grey rather than
     shifting hue when a phone switches theme. Only the badge needs adjusting. */
  @media (prefers-color-scheme: dark) {
    .wrap { --critical:#F08A8A; }
    .badge { color: #2A0B0B; }
  }
`;

function esc(value) {
    return String(value == null ? "" : value)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;")
        .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

class ParentHubNav extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._built = false;
        this._data = { active: "stateHome", unread: 0 };
    }

    static get observedAttributes() { return ["data"]; }
    connectedCallback() {
        this.build();
        if (SELF_PIN_ON_MOBILE) this.classList.add("selfpin");
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (!this._built) this.build();
        if (name !== "data" || !newValue) return;
        try {
            const parsed = JSON.parse(newValue);
            if (parsed && typeof parsed === "object") { this._data = parsed; this.paint(); }
        } catch (err) {
            console.error("parent-hub-nav: couldn't parse data attribute", err);
        }
    }

    build() {
        if (this._built) return;
        this._built = true;

        this.shadowRoot.innerHTML = `
          <style>${STYLES}</style>
          <nav class="wrap" aria-label="Parent Hub sections">
            ${CREST_URL ? `<div class="crest"><img src="${esc(CREST_URL)}" alt="Club crest" /></div>` : ""}
            ${ITEMS.map(item => `
              <button type="button" class="item" data-state="${esc(item.state)}" id="nav_${esc(item.state)}">
                ${ICONS[item.icon]}
                <span>${esc(item.label)}</span>
                ${item.badge ? `<span class="badge" id="badge"></span>` : ""}
              </button>`).join("")}
          </nav>`;

        this.shadowRoot.querySelector(".wrap").addEventListener("click", (event) => {
            const btn = event.target.closest("[data-state]");
            if (!btn) return;
            this.dispatchEvent(new CustomEvent("navigate", {
                detail: { state: btn.getAttribute("data-state") }
            }));
        });

        this.paint();
    }

    paint() {
        const active = this._data.active || "stateHome";
        ITEMS.forEach(item => {
            const btn = this.shadowRoot.getElementById("nav_" + item.state);
            if (btn) btn.setAttribute("aria-current", String(item.state === active));
        });

        const badge = this.shadowRoot.getElementById("badge");
        if (badge) {
            const unread = Number(this._data.unread) || 0;
            badge.classList.toggle("show", unread > 0);
            // 9+ rather than a three-digit bubble that would blow the item out.
            badge.textContent = unread > 9 ? "9+" : String(unread);
        }
    }
}

if (!customElements.get("parent-hub-nav")) {
    customElements.define("parent-hub-nav", ParentHubNav);
}

// =====================================================================
//  PAGE CODE CONTRACT
// =====================================================================
//  IN:
//    $w("#customNav").setAttribute("data", JSON.stringify({
//        active: "stateHome",   // which item is highlighted
//        unread: 0              // Messages badge; 0 hides it
//    }));
//
//  Push a fresh `active` from switchTab() so the highlight follows the
//  state, including when something OTHER than a nav tap changes it (a card
//  on Home opening Payments, the back button, a submit returning Home).
//
//  OUT:
//    on("navigate", e => switchTab(e.detail.state));
// =====================================================================
