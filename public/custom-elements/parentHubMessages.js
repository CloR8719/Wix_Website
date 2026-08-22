// =====================================================================
//  <parent-hub-messages> — Parent Hub v2, Messages
// =====================================================================
//  Club announcements, squad messages and anything addressed to this
//  parent directly. Read-only: composing happens in the Manager Hub.
//
//  SETUP:
//    1. Public -> custom-elements -> `parentHubMessages.js`.
//    2. On stateMessages: Add -> Embed Code -> Custom Element.
//       Tag name: parent-hub-messages   Element ID: #customMessages
//    3. Height ~700px to start; it self-sizes after first paint.
//
//  ⚠️ REPUBLISH *AND* HARD-REFRESH after any change.
//
//  TAPPING A ROW EXPANDS IT IN PLACE rather than opening a detail state or
//  a Lightbox. A message is a paragraph or two - pushing that into its own
//  screen costs a back button, a state, and another thing to lay out
//  twice, to show text that fits under the row it came from.
//
//  READ STATE WORKS AT TWO SPEEDS. Opening the tab marks everything read
//  server-side, so the nav badge clears - but the rows keep their unread
//  styling, because wiping every dot on arrival removes the only signal
//  showing WHICH messages were new. A row loses its own dot the moment it's
//  tapped, which is the per-message feedback: bold to normal, icon fades,
//  dot shrinks away.
// =====================================================================

const ICONS = {
    alert:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    fixture: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    club:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>'
};

const STYLES = `
  :host { display: block; width: 100%; font-family: 'Work Sans', -apple-system, BlinkMacSystemFont, sans-serif; }
  * { box-sizing: border-box; }

  .wrap {
    --surface:#FFFFFF; --raised:#FFFFFF; --pitch:#1F5136; --pitch-soft:#DCE9E0;
    --line:#E1E4DB; --line-soft:#ECEEE8;
    --text:#16212F; --text-muted:#5C6B7A; --text-faint:#8B98A3;
    --critical:#C0392B; --critical-bg:#FCEDEB;
    --info:#2C6E9B; --info-bg:#E8F1F7;
    background: transparent; color: var(--text); padding: 4px 0 8px;
  }

  .intro {
    margin: 0 0 16px; font-size: 13px; line-height: 1.6; color: var(--text-muted);
  }

  .list { display: flex; flex-direction: column; gap: 10px; }

  .row {
    display: grid; grid-template-columns: 38px 1fr 10px; gap: 12px;
    align-items: start; width: 100%; text-align: left;
    padding: 14px 15px; border-radius: 12px; cursor: pointer;
    background: var(--surface); border: 1px solid var(--line-soft);
    font-family: inherit; color: inherit;
    transition: border-color .15s ease;
  }
  .row:hover { border-color: var(--line); }
  .row:focus-visible { outline: 2px solid var(--pitch); outline-offset: 2px; }

  /* READ is the quieter state - faded icon, lighter title, no dot. The
     previous version distinguished them with background: var(--raised)
     against var(--surface), which in light mode are both #FFFFFF, so read
     and unread rendered identically and the dot carried the whole signal. */
  .row .icon { opacity: .55; transition: opacity .25s ease; }
  .row .title { font-weight: 600; color: var(--text-muted); transition: color .25s ease; }

  .row.unread { border-color: var(--line); box-shadow: 0 1px 2px rgba(16,33,47,.05); }
  .row.unread .icon { opacity: 1; }
  .row.unread .title { font-weight: 700; color: var(--text); }
  .row.unread .sender { color: var(--pitch); }

  .icon {
    width: 38px; height: 38px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
  }
  .icon svg { width: 18px; height: 18px; }
  .icon.alert   { background: var(--critical-bg); color: var(--critical); }
  .icon.fixture { background: var(--info-bg); color: var(--info); }
  .icon.club    { background: var(--pitch-soft); color: var(--pitch); }

  .top {
    display: flex; align-items: baseline; justify-content: space-between;
    gap: 10px; margin-bottom: 3px;
  }
  .sender { font-size: 11.5px; font-weight: 700; color: var(--text-muted);
            text-transform: uppercase; letter-spacing: .04em; }
  .time { font-size: 11.5px; color: var(--text-faint); white-space: nowrap; }

  .title { font-size: 14.5px; line-height: 1.4; margin-bottom: 3px; }

  .snippet { font-size: 13px; line-height: 1.55; color: var(--text-muted); }
  .row.open .snippet { display: none; }

  /* The full text, shown in place of the snippet once expanded. Preserves
     the line breaks a manager typed - they use them for lists. */
  .body {
    display: none;
    font-size: 13.5px; line-height: 1.65; color: var(--text);
    white-space: pre-wrap; overflow-wrap: anywhere;
    margin-top: 2px; padding-top: 10px; border-top: 1px solid var(--line-soft);
  }
  .row.open .body { display: block; }

  /* Sits in its own grid column so it never reflows the text beside it.
     Shrinks and fades the moment a message is opened - that transition IS
     the read receipt. Without it the row silently stops being bold and
     nothing confirms the tap registered. */
  .dot {
    width: 9px; height: 9px; border-radius: 50%; margin-top: 6px;
    background: transparent; transform: scale(0);
    transition: background .25s ease, transform .25s ease;
  }
  .row.unread .dot { background: var(--pitch); transform: scale(1); }

  .empty, .loading {
    padding: 40px 18px; text-align: center; font-size: 13px;
    color: var(--text-muted); line-height: 1.6;
    border: 1px dashed var(--line); border-radius: 12px;
  }

  @media (prefers-color-scheme: dark) {
    .wrap {
      --surface:#0E1826; --raised:#121F30; --line:#223145; --line-soft:#1A2739;
      --text:#E7ECF2; --text-muted:#A6B4C3; --text-faint:#71818F;
      --pitch:#5FBF8B; --pitch-soft:#17301F;
      --critical:#F08B7F; --critical-bg:#3A1D19;
      --info:#7FB6DA; --info-bg:#152A38;
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

// Everything here is written by a person - a manager typing a message - so
// it all goes through this before hitting innerHTML. Custom elements give
// us real HTML, which also means real injection risk if we're careless.
function esc(value) {
    return String(value == null ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

class ParentHubMessages extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._built = false;
        this._data = { loading: true };
        this._resizeObserver = null;
        this._lastHeight = 0;
        // Which rows are open. Local UI state, deliberately NOT in the model
        // page code pushes - a repaint from a background refresh shouldn't
        // collapse a message the parent is halfway through reading.
        this._open = {};
        // Messages read during THIS visit. Server-side, opening the tab marks
        // everything read at once, so without this a parent gets no per-message
        // feedback at all - they tap, and nothing happens.
        this._read = {};
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
            if (parsed && typeof parsed === "object") { this._data = parsed; this.paint(); }
        } catch (err) {
            console.error("parent-hub-messages: couldn't parse data attribute", err);
        }
    }

    build() {
        if (this._built) return;
        this._built = true;

        this.shadowRoot.innerHTML = `<style>${STYLES}</style>
          <div class="wrap">
            <p class="intro">Announcements from the club and your child's team.</p>
            <div class="list" id="list"></div>
          </div>`;

        // Delegated - the list is replaced wholesale on every repaint.
        this.shadowRoot.getElementById("list").addEventListener("click", (event) => {
            const row = event.target.closest(".row");
            if (!row) return;
            const id = row.getAttribute("data-id");

            this._open[id] = !this._open[id];
            this._read[id] = true;

            // Toggled on the existing node rather than repainting the list.
            // A repaint would swap in a brand new element, and a CSS
            // transition can't run on a node that didn't exist a frame ago -
            // the dot would vanish instantly instead of fading.
            row.classList.toggle("open", this._open[id]);
            row.classList.remove("unread");
            row.setAttribute("aria-expanded", String(!!this._open[id]));

            this.dispatchEvent(new CustomEvent("messageOpened", { detail: { id } }));
        });

        this.paint();
    }

    paint() {
        const d = this._data;
        const list = this.shadowRoot.getElementById("list");

        if (d.loading) {
            list.innerHTML = `<div class="loading">Loading messages…</div>`;
            return;
        }

        const messages = Array.isArray(d.messages) ? d.messages : [];
        if (messages.length === 0) {
            list.innerHTML = `<div class="empty">
                No messages yet.<br>
                Anything the club or your child's manager sends will appear here.
              </div>`;
            return;
        }

        list.innerHTML = messages.map(m => this.rowHtml(m)).join("");
    }

    rowHtml(m) {
        const kind = ICONS[m.kind] ? m.kind : "club";
        const isOpen = !!this._open[m.id];
        // Unread per the server, unless it's been opened during this visit.
        const isUnread = m.unread && !this._read[m.id];
        // A body identical to its own snippet means nothing was truncated, so
        // expanding would just redraw the same sentence with a line above it.
        const hasMore = m.body && m.body !== m.snippet;

        return `
          <div class="row ${isUnread ? "unread" : ""} ${isOpen ? "open" : ""}" data-id="${esc(m.id)}"
               role="button" tabindex="0" aria-expanded="${isOpen}">
            <div class="icon ${kind}">${ICONS[kind]}</div>
            <div>
              <div class="top">
                <span class="sender">${esc(m.sender)}</span>
                <span class="time">${esc(m.time)}</span>
              </div>
              <div class="title">${esc(m.title)}</div>
              <div class="snippet">${esc(m.snippet || m.body)}</div>
              ${hasMore ? `<div class="body">${esc(m.body)}</div>` : ""}
            </div>
            <div class="dot"></div>
          </div>`;
    }
}

if (!customElements.get("parent-hub-messages")) {
    customElements.define("parent-hub-messages", ParentHubMessages);
}

// =====================================================================
//  PAGE CODE CONTRACT
// =====================================================================
//  IN — {loading:true} first, then:
//    {
//      messages: [{ id, sender, title, body, snippet, time, kind, unread }]
//    }
//    kind is one of "alert" | "fixture" | "club" - anything else falls back
//    to "club". getParentMessages() in backend/messages.jsw returns exactly
//    this shape, newest first, already scoped to this parent.
//
//  OUT:
//    on("messageOpened", e => …)   // { id } - fired on expand AND collapse
//
//  Expansion is tracked inside the element, not in the model, so a repaint
//  can't collapse a message mid-read. Page code doesn't need to respond to
//  messageOpened at all - it's there for future read-tracking per message.
// =====================================================================
