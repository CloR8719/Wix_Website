// =====================================================================
//  <manager-hub-more> — Manager Hub v2, More
// =====================================================================
//  A MENU, NOT A CONTAINER. This element holds nothing except rows that
//  navigate elsewhere. Team Profile, Staff, Sponsors, News and Stats each
//  live in their own state with their own element.
//
//  That works because a state containing one custom element costs almost
//  nothing to set up - drop it in, set an ID, done, no layout and no Mobile
//  View pass. It's states containing thirty native elements that are
//  expensive. So there's no reason to economise on states, and every reason
//  to keep each element small enough to reason about.
//
//  SETUP:
//    1. Public -> custom-elements -> new file `managerHubMore.js`.
//    2. On stateMore: Add -> Embed Code -> Custom Element.
//       Tag name: manager-hub-more   Element ID: #customMgrMore
//    3. Height ~700px to start; it self-sizes after first paint.
//
//  ⚠️ REPUBLISH *AND* HARD-REFRESH after any change.
//
//  ROWS APPEAR OR DISAPPEAR BY PERMISSION, and the payload decides - a coach
//  on Limited access doesn't receive the team-profile row at all. As always
//  that's convenience; the backend refuses the action independently.
// =====================================================================

const ICONS = {
    megaphone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/></svg>',
    person: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    news: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9h4"/><path d="M18 14h-8M15 18h-5M10 6h8v4h-8V6Z"/></svg>',
    handshake: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 17 9.5 15.5a2.1 2.1 0 0 1 3-3l1 1 3.5-3.5a2.1 2.1 0 0 1 3 3L16 18"/><path d="m8 13-4-4 4-4 3 3"/></svg>',
    power: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>',
    globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>'
};

// Where "Back to the website" goes. A RELATIVE path on purpose: an absolute
// URL would bounce anyone testing on a preview or staging domain onto the
// live site. Page code can override it with the websiteurl attribute.
const SITE_URL = "/";

// `perm` gates the row: undefined = always shown, otherwise the named
// permission must be true in the payload.
const SECTIONS = [
    {
        title: "Recruitment",
        rows: [
            { act: "openRecruit", icon: "megaphone", label: "Create a recruitment post",
              sub: "Poster for the club website" },
            { act: "openShare", icon: "link", label: "Share the join link",
              sub: "QR code and link for new players" }
        ]
    },
    {
        title: "Team",
        rows: [
            { act: "openTeamProfile", icon: "shield", label: "Team profile",
              sub: "Shown on the club website", perm: "editTeam" },
            { act: "openStats", icon: "chart", label: "Stats",
              sub: "Results, form, leaderboards and POTM" }
        ]
    },
    {
        title: "Club",
        rows: [
            { act: "openStaff", icon: "person", label: "My staff record",
              sub: "Your details and qualifications" },
            { act: "openNews", icon: "news", label: "Post news",
              sub: "Publishes to the club website" },
            { act: "openSponsors", icon: "handshake", label: "Sponsors",
              sub: "Add and manage" }
        ]
    }
];

const STYLES = `
  :host { display: block; width: 100%; font-family: 'Work Sans', -apple-system, BlinkMacSystemFont, sans-serif; }
  * { box-sizing: border-box; }

  .wrap {
    --accent:#2C3540; --accent-soft:#E3E6EA;
    --surface:#FFFFFF; --raised:#FFFFFF;
    --line:#E1E4DB; --line-soft:#ECEEE8;
    --text:#16212F; --text-muted:#5C6B7A; --text-faint:#8B98A3;
    --critical:#C23B3B; --critical-bg:#FCEAEA;
    padding: 16px 16px 32px;
    color: var(--text);
    display: flex; flex-direction: column; gap: 20px;
  }

  /* ⚠️ THE GAP HAS TO BE HERE, NOT ON .wrap. Every section is rendered into
     #body, so #body is .wrap's only child - a gap on .wrap has nothing to
     separate. Without this the sections stack with zero space and each
     heading sits directly on the card above it. Same bug as Parent Hub's
     .wrap/#detail gap. */
  #body { display: flex; flex-direction: column; gap: 18px; }

  .who { font-size: 12.5px; color: var(--text-muted); line-height: 1.55; }
  .who b { color: var(--text); }

  .label {
    font-size: 10.5px; font-weight: 700; letter-spacing: .07em;
    text-transform: uppercase; color: var(--text-faint); margin-bottom: 14px;
  }

  .menu { border: 1px solid var(--line-soft); border-radius: 12px; overflow: hidden; }
  /* .row is used by both <button> and <a> now, so the anchor needs the
     text-decoration and colour resets a button gets for free. */
  a.row { text-decoration: none; color: inherit; }

  .row {
    display: flex; align-items: center; gap: 12px; width: 100%;
    padding: 14px 15px; background: var(--surface);
    border: none; border-bottom: 1px solid var(--line-soft);
    font-family: inherit; text-align: left; cursor: pointer; color: inherit;
  }
  .row:last-child { border-bottom: none; }
  .row:hover { background: var(--accent-soft); }
  .row:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }

  .ico {
    width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0;
    background: var(--accent-soft); color: var(--accent);
    display: flex; align-items: center; justify-content: center;
  }
  .ico svg { width: 17px; height: 17px; }
  .ico.danger { background: var(--critical-bg); color: var(--critical); }

  .tx { flex: 1; min-width: 0; }
  .tx b { display: block; font-size: 13.5px; font-weight: 700; }
  .tx span { font-size: 11.5px; color: var(--text-faint); }
  .chev { color: var(--text-faint); font-size: 17px; line-height: 1; }

  @media (prefers-color-scheme: dark) {
    .wrap {
      --accent:#A9B6C4; --accent-soft:#1B222B;
      --surface:#0E1826; --raised:#121F30;
      --line:#223145; --line-soft:#1A2739;
      --text:#E7ECF2; --text-muted:#A6B4C3; --text-faint:#71818F;
      --critical:#F08A8A; --critical-bg:#3A1414;
    }
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

class ManagerHubMore extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._built = false;
        this._data = {};
        this._resizeObserver = null;
        this._lastHeight = 0;
    }

    static get observedAttributes() { return ["data", "websiteurl"]; }
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

        // Handled BEFORE the data guard below, which returns early on any
        // other attribute name.
        if (name === "websiteurl") {
            this._siteUrl = newValue || SITE_URL;
            this.paint();
            return;
        }

        if (name !== "data" || !newValue) return;
        try {
            const parsed = JSON.parse(newValue);
            if (parsed && typeof parsed === "object") { this._data = parsed; this.paint(); }
        } catch (err) {
            console.error("manager-hub-more: couldn't parse data attribute", err);
        }
    }

    build() {
        if (this._built) return;
        this._built = true;

        this.shadowRoot.innerHTML = `<style>${STYLES}</style>
          <div class="wrap"><div id="body"></div></div>`;

        this.shadowRoot.getElementById("body").addEventListener("click", (event) => {
            const el = event.target.closest("[data-act]");
            if (!el) return;
            this.dispatchEvent(new CustomEvent(el.getAttribute("data-act"), { detail: {} }));
        });

        this.paint();
    }

    paint() {
        const d = this._data;
        const perms = d.perms || {};

        const sections = SECTIONS.map(sec => {
            const rows = sec.rows.filter(r => !r.perm || perms[r.perm] === true);
            if (rows.length === 0) return "";
            return `
              <div>
                <div class="label">${esc(sec.title)}</div>
                <div class="menu">${rows.map(r => this.rowHtml(r)).join("")}</div>
              </div>`;
        }).join("");

        this.shadowRoot.getElementById("body").innerHTML = `
          <p class="who">
            Signed in as <b>${esc(d.name || "you")}</b>${d.accessLevel ? ` — ${esc(d.accessLevel)} access` : ""}.
          </p>
          ${sections}
          <div class="menu">
            <!-- A REAL ANCHOR, on purpose. No listener, no page-code round
                 trip - if every other line of JS in this file throws, this row
                 still gets a manager off the page. Same reasoning as the
                 Parent Hub's "Visit Our Website" row. -->
            <a class="row" href="${esc(this._siteUrl || SITE_URL)}">
              <span class="ico">${ICONS.globe}</span>
              <span class="tx"><b>Back to the website</b><span>Fixtures, news and club information</span></span>
              <span class="chev">›</span>
            </a>
            <button type="button" class="row" data-act="logout">
              <span class="ico danger">${ICONS.power}</span>
              <span class="tx"><b>Log out</b></span>
            </button>
          </div>`;
    }

    rowHtml(r) {
        return `
          <button type="button" class="row" data-act="${esc(r.act)}">
            <span class="ico">${ICONS[r.icon] || ""}</span>
            <span class="tx"><b>${esc(r.label)}</b><span>${esc(r.sub || "")}</span></span>
            <span class="chev">›</span>
          </button>`;
    }
}

if (!customElements.get("manager-hub-more")) {
    customElements.define("manager-hub-more", ManagerHubMore);
}

// =====================================================================
//  PAGE CODE CONTRACT
// =====================================================================
//  IN:
//    { name, accessLevel, perms: { payments, editTeam, allStaff, allTeams } }
//
//  A row whose `perm` isn't true in `perms` is not rendered. The Team
//  Profile row is gated on editTeam because that content feeds a DYNAMIC
//  PUBLIC PAGE - editing it is publishing, not note-keeping.
//
//  OUT — one event per row, no detail:
//    openRecruit · openShare · openTeamProfile · openStats
//    openStaff · openNews · openSponsors · logout
// =====================================================================
