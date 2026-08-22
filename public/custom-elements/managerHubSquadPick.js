// =====================================================================
//  <manager-hub-squad-pick> — Manager Hub v2, pick the matchday squad
// =====================================================================
//  SETUP:
//    1. Public -> custom-elements -> new file `managerHubSquadPick.js`.
//       ⚠️ FLAT in custom-elements — the Editor's picker won't look inside
//       a subfolder.
//    2. Add a state to #stateboxMgr called `stateSquadPick`.
//    3. On it: Add -> Embed Code -> Custom Element.
//       Tag name: manager-hub-squad-pick   Element ID: #customSquadPick
//    4. Height ~900px to start; it self-sizes after first paint.
//
//  ⚠️ REPUBLISH *AND* HARD-REFRESH after any change.
//
//  THE PITCH IS DRAWN, NOT AN IMAGE. Stripes are a repeating gradient,
//  markings are borders. Nothing to upload, nothing to load, and it
//  recolours itself in dark mode. An uploaded pitch would need two
//  versions and would still be the wrong aspect ratio on some phone.
//
//  ⚠️ THE NAME SITS BELOW THE SHIRT, NOT INSIDE IT. Inside a 41px circle
//  on an iPhone SE there is room for about eight characters at 9px, and
//  plenty of real names are longer — they clipped. Below the circle the
//  label gets the full column width, which is ten or eleven characters on
//  the smallest phone. The shirt number goes in the circle instead, which
//  is what a manager reads on a touchline anyway.
//
//  A FORMATION IS JUST A LIST OF ROW SIZES. "4-4-2" is rows of 4, 4 and 2,
//  valid at 11-a-side because they sum to 10 and the keeper is the 11th.
//  That one rule covers every format and shape, so the presets below are
//  convenience only — a manager can type anything that adds up. The
//  backend re-checks it; this is the courtesy copy.
//
//  A PARENT WHO SAID NO CANNOT BE PICKED. Blocked on tap here AND refused
//  by saveSquad — a disabled look that still works on tap is worse than no
//  block at all. "No reply" is silence, not a no, so those ARE selectable
//  and carry an amber marker onto the pitch.
// =====================================================================

const PRESETS = {
    3:  ["1-1-1", "2-1", "1-2"],
    5:  ["1-2-1", "2-1-1", "2-2", "1-1-2"],
    7:  ["2-3-1", "3-2-1", "2-2-2", "3-1-2"],
    9:  ["3-2-3", "3-4-1", "2-4-2", "3-3-2"],
    11: ["4-4-2", "4-3-3", "3-5-2", "4-2-3-1", "5-3-2"]
};

const FORMATS = [3, 5, 7, 9, 11];

// Keeperless football is real at 3v3 and 4v4 and nowhere above it. Must
// match NO_KEEPER_MAX in fixtures.jsw — two answers to "does this shape
// need a keeper" is how the pitch and the save disagree.
const NO_KEEPER_MAX = 4;

const STYLES = `
  :host { display: block; width: 100%; font-family: 'Work Sans', -apple-system, BlinkMacSystemFont, sans-serif; }
  * { box-sizing: border-box; }

  .wrap {
    --accent:#2C3540; --accent-soft:#E3E6EA;
    --surface:#FFFFFF; --raised:#FFFFFF; --ground:#F4F5F2;
    --line:#E1E4DB; --line-soft:#ECEEE8;
    --text:#16212F; --text-muted:#5C6B7A; --text-faint:#8B98A3;
    --success:#158A45; --success-bg:#E4F5EA;
    --warning:#9A6200; --warning-bg:#FEF3DE;
    --critical:#C23B3B; --critical-bg:#FCEAEA;
    --pitch:#4A8A5C; --pitch-dark:#3F7D4E; --pitch-line:rgba(255,255,255,.34);
    --slot:#FFFFFF; --slot-text:#16212F;
    padding: 16px 16px 32px;
    color: var(--text);
    display: flex; flex-direction: column;
  }

  @media (prefers-color-scheme: dark) {
    .wrap {
      --accent:#A9B6C4; --accent-soft:#1B222B;
      --surface:#0E1826; --raised:#121F30; --ground:#080F1A;
      --line:#223145; --line-soft:#1A2739;
      --text:#E7ECF2; --text-muted:#A6B4C3; --text-faint:#71818F;
      --success:#5FD08B; --success-bg:#103322;
      --warning:#E5B567; --warning-bg:#3A2C10;
      --critical:#F08A8A; --critical-bg:#3A1414;
      --pitch:#2C5638; --pitch-dark:#24472E; --pitch-line:rgba(255,255,255,.22);
      --slot:#E7ECF2; --slot-text:#0E1826;
    }
  }

  /* Gap belongs on the node whose children are the sections. */
  #body { display: flex; flex-direction: column; gap: 18px; }

  /* The bottom nav is pinned OVER the page; clearance has to grow .wrap. */
  @media (max-width: 749px) {
    .wrap { padding-bottom: calc(84px + env(safe-area-inset-bottom, 0px)); }
  }

  .label {
    font-size: 10.5px; font-weight: 700; letter-spacing: .07em;
    text-transform: uppercase; color: var(--text-faint); margin-bottom: 10px;
  }
  .card {
    background: var(--surface); border: 1px solid var(--line-soft);
    border-radius: 12px; padding: 16px;
  }

  .fix { font-size: 14px; font-weight: 700; line-height: 1.35; }
  .fixmeta { font-size: 12.5px; color: var(--text-muted); margin-top: 3px; }

  .segs { display: flex; flex-wrap: wrap; gap: 6px; }
  .seg {
    padding: 8px 13px; border-radius: 8px; cursor: pointer;
    font-family: inherit; font-size: 12.5px; font-weight: 700;
    border: 1.5px solid var(--line); background: transparent; color: var(--text-muted);
  }
  .seg[aria-pressed="true"] { border-color: var(--accent); background: var(--accent-soft); color: var(--accent); }
  .seg:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

  .custom { display: flex; gap: 8px; margin-top: 11px; align-items: center; }
  .custom input {
    flex: 1; min-width: 0; padding: 9px 11px; border-radius: 8px;
    border: 1.5px solid var(--line); background: var(--surface);
    font-family: inherit; font-size: 13px; color: var(--text);
  }
  .custom input:focus { outline: none; border-color: var(--accent); }
  .verdict { font-size: 12px; font-weight: 700; white-space: nowrap; }
  .verdict.ok { color: var(--success); }
  .verdict.no { color: var(--critical); }
  .hint { font-size: 11.5px; color: var(--text-faint); line-height: 1.55; margin-top: 9px; }

  .pitch {
    position: relative; width: 100%; aspect-ratio: 68 / 100;
    max-height: 620px; margin: 0 auto;
    border-radius: 12px; overflow: hidden;
    background: repeating-linear-gradient(to top, var(--pitch) 0 8%, var(--pitch-dark) 8% 16%);
    border: 2px solid var(--pitch-line);
    display: grid; padding: 12px 6px;
  }
  .pitch::before {
    content: ""; position: absolute; left: 0; right: 0; top: 50%;
    border-top: 2px solid var(--pitch-line);
  }
  .pitch::after {
    content: ""; position: absolute; left: 50%; top: 50%;
    width: 22%; aspect-ratio: 1; transform: translate(-50%, -50%);
    border: 2px solid var(--pitch-line); border-radius: 50%;
  }
  .box {
    position: absolute; left: 50%; transform: translateX(-50%);
    width: 54%; height: 12%; border: 2px solid var(--pitch-line);
  }
  .box.btm { bottom: 0; border-bottom: none; }
  .box.top { top: 0; border-top: none; }

  .prow { display: flex; align-items: center; justify-content: space-evenly; gap: 2px; position: relative; z-index: 2; }

  .slot {
    width: clamp(48px, 13.5vw, 70px);
    background: none; border: none; padding: 0; cursor: pointer;
    display: flex; flex-direction: column; align-items: center; gap: 3px;
    font-family: inherit;
  }
  .shirt {
    position: relative;
    width: clamp(34px, 9.5vw, 46px); aspect-ratio: 1; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: clamp(14px, 3.8vw, 18px); line-height: 1;
    border: 2px dashed var(--pitch-line); background: rgba(255,255,255,.12); color: #fff;
  }
  .slot.filled .shirt { border: 2px solid transparent; background: var(--slot); color: var(--slot-text); }
  .slot.armed .shirt { border-color: #fff; border-style: solid; }
  .slot:focus-visible { outline: 3px solid #fff; outline-offset: 3px; border-radius: 10px; }
  .slot .nm {
    max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    font-size: clamp(8.5px, 2.4vw, 10px); font-weight: 600; color: #fff;
    text-shadow: 0 1px 2px rgba(0,0,0,.45);
  }
  .slot .pos {
    font-size: 8px; font-weight: 800; letter-spacing: .06em;
    color: rgba(255,255,255,.72); text-transform: uppercase;
  }
  .badshape {
    grid-row: 1 / -1; align-self: center; text-align: center;
    color: #fff; font-size: 13px; padding: 0 24px; line-height: 1.5;
  }

  .dot {
    position: absolute; top: -2px; right: -2px;
    width: 13px; height: 13px; border-radius: 50%; border: 2px solid var(--slot);
  }
  .dot.yes { background: var(--success); }
  .dot.wait { background: #E5A33C; }

  .subs { margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--line-soft); }
  .subhead { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin-bottom: 10px; }
  .subrow { display: flex; flex-wrap: wrap; gap: 7px; }
  .sub {
    display: flex; align-items: center; gap: 7px;
    padding: 7px 11px 7px 9px; border-radius: 999px; cursor: pointer;
    border: 1.5px solid var(--line); background: var(--surface);
    font-family: inherit; font-size: 12.5px; font-weight: 600; color: inherit;
  }
  .sub:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .sub .x { color: var(--text-faint); font-weight: 700; }
  .addsub {
    padding: 7px 13px; border-radius: 999px; cursor: pointer;
    border: 1.5px dashed var(--line); background: transparent;
    font-family: inherit; font-size: 12.5px; font-weight: 700; color: var(--accent);
  }
  .addsub[aria-pressed="true"] { border-style: solid; border-color: var(--accent); background: var(--accent-soft); }
  .addsub:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .subnone { font-size: 12px; color: var(--text-faint); }

  .plist { display: flex; flex-direction: column; gap: 6px; }
  .p {
    display: flex; align-items: center; gap: 10px; width: 100%;
    padding: 9px 11px; border-radius: 9px; cursor: pointer;
    border: 1.5px solid var(--line-soft); background: var(--surface);
    font-family: inherit; text-align: left; color: inherit; font-size: 13px;
  }
  .p:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .p.picked { opacity: .5; }
  .p.armed { border-color: var(--accent); background: var(--accent-soft); }
  .p.out { opacity: .55; cursor: not-allowed; background: var(--ground); }
  .p.out .who b { text-decoration: line-through; }
  .chip { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
  .chip.yes { background: var(--success); }
  .chip.wait { background: #E5A33C; }
  .chip.no { background: var(--critical); }
  .p .who { flex: 1; min-width: 0; }
  .p .who b { display: block; font-weight: 600; }
  .p .who span { font-size: 11.5px; color: var(--text-faint); }
  .p .at { font-size: 10.5px; font-weight: 800; color: var(--text-faint); letter-spacing: .05em; }

  .key { display: flex; flex-wrap: wrap; gap: 4px 14px; margin-top: 12px; font-size: 11.5px; color: var(--text-muted); }
  .key span { display: flex; align-items: center; gap: 6px; }

  .counter { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
  .counter b { font-size: 20px; font-variant-numeric: tabular-nums; }
  .counter .of { font-size: 12.5px; color: var(--text-muted); }

  /* Holds the meet-TIME input, so it needs the same guard as the fixture
     form: a grid item defaults to min-width:auto and a native time picker
     will not shrink below its intrinsic width, pushing the second column
     out of the element. */
  .two { display: grid; grid-template-columns: 1fr 1fr; gap: 11px; }
  .two > * { min-width: 0; }
  .field input { max-width: 100%; }

  @media (max-width: 430px) {
    .two { grid-template-columns: 1fr; }
  }
  .field { display: flex; flex-direction: column; gap: 6px; }
  .field label { font-size: 12px; font-weight: 600; color: var(--text-muted); }
  .field input {
    width: 100%; padding: 10px 11px; border-radius: 9px;
    border: 1.5px solid var(--line); background: var(--surface);
    font-family: inherit; font-size: 14px; color: var(--text);
  }
  .field input:focus { outline: none; border-color: var(--accent); }

  .msg { font-size: 12.5px; font-weight: 600; border-radius: 9px; padding: 10px 12px; line-height: 1.5; }
  .msg.bad { color: var(--critical); background: var(--critical-bg); }
  .msg.good { color: var(--success); background: var(--success-bg); }
  .msg.warn { color: var(--warning); background: var(--warning-bg); }

  .btns { display: flex; flex-direction: column; gap: 9px; }
  .btn {
    width: 100%; padding: 13px 15px; border-radius: 10px; cursor: pointer;
    font-family: inherit; font-size: 14px; font-weight: 700;
    border: 1.5px solid transparent;
  }
  .btn.primary { background: var(--accent); color: var(--surface); }
  .btn.ghost { background: transparent; border-color: var(--line); color: var(--accent); }
  .btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .btn[disabled] { opacity: .55; cursor: default; }

  .loading, .empty {
    padding: 34px 18px; text-align: center; font-size: 13px;
    color: var(--text-muted); line-height: 1.6;
    border: 1px dashed var(--line); border-radius: 12px;
  }

  /* ⚠️ NATIVE DATE/TIME INPUTS OVERFLOW THEIR CONTAINER without this.
     min-width BEATS width:100%, and browsers give these a wide intrinsic
     minimum from the picker chrome - so the field runs outside the state
     box on a phone while looking fine on desktop. appearance:none drops
     the native chrome that was adding the width in the first place.
     Same fix as parentHubHome.js, proven live since 2026-08-16. */
  input[type="date"], input[type="time"] {
    -webkit-appearance: none; appearance: none;
    min-width: 0; max-width: 100%; width: 100%;
    /* Inline-block by default, which leaves a baseline gap underneath. */
    display: block;
  }
  input[type="date"]::-webkit-date-and-time-value,
  input[type="time"]::-webkit-date-and-time-value {
    text-align: left; margin: 0;
  }
  input[type="date"]::-webkit-calendar-picker-indicator,
  input[type="time"]::-webkit-calendar-picker-indicator {
    margin-left: 0; margin-right: 0;
  }

  /* iOS Safari zooms the page in when an input under 16px takes focus, and
     never zooms back out - leaving the manager stuck on a magnified page
     mid-form. On a phone correctness beats matching the mockup. Same rule
     as parentHubHome.js. */
  @media (max-width: 749px) {
    input, select, textarea { font-size: 16px; }
  }
`;

function esc(v) {
    return String(v === undefined || v === null ? "" : v)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function parseShape(str) {
    const parts = String(str || "").trim().split(/[^0-9]+/).filter(Boolean).map(Number);
    if (!parts.length) return null;
    if (parts.some(x => x < 1 || x > 9)) return null;
    return parts;
}

function shapeFits(shape, format) {
    const rows = parseShape(shape);
    if (!rows) return { ok: false, error: "Numbers only" };
    const sum = rows.reduce((a, b) => a + b, 0);
    if (sum === format - 1) return { ok: true, keeper: true, slots: format, rows };
    if (sum === format && format <= NO_KEEPER_MAX) return { ok: true, keeper: false, slots: format, rows };
    return { ok: false, sum, error: sum + " ≠ " + (format - 1) };
}

function rowNames(count) {
    if (count === 1) return ["MID"];
    if (count === 2) return ["DEF", "ATT"];
    if (count === 3) return ["DEF", "MID", "ATT"];
    if (count === 4) return ["DEF", "MID", "AM", "ATT"];
    const out = [];
    for (let i = 0; i < count; i++) out.push("R" + (i + 1));
    return out;
}

function shortName(n) {
    const bits = String(n || "").trim().split(" ");
    return bits[0] + (bits[1] ? " " + bits[1].charAt(0) : "");
}

class ManagerHubSquadPick extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._data = {};
        this._loadedFor = "";
        this.reset();
    }

    reset() {
        this._format = 7;
        this._shape = "2-3-1";
        this._placed = {};
        this._subs = [];
        this._meetTime = "";
        this._meetPlace = "";
        this._armedSlot = null;
        this._armedPlayer = null;
        this._addingSub = false;
        this._localError = "";
    }

    static get observedAttributes() { return ["data"]; }

    connectedCallback() {
        this.shadowRoot.innerHTML =
            "<style>" + STYLES + "</style><div class=\"wrap\"><div id=\"body\"></div></div>";
        this.paint();
        this.wire();

        const wrap = this.shadowRoot.querySelector(".wrap");
        if (wrap && typeof ResizeObserver !== "undefined") {
            this._ro = new ResizeObserver(() => {
                this.style.height = Math.ceil(wrap.getBoundingClientRect().height) + "px";
            });
            this._ro.observe(wrap);
        }
    }

    disconnectedCallback() { if (this._ro) this._ro.disconnect(); }

    attributeChangedCallback(_n, _o, value) {
        let parsed = {};
        try { parsed = value ? JSON.parse(value) : {}; }
        catch (err) { console.error("manager-hub-squad-pick: bad data", err); }
        this._data = parsed;

        // ⚠️ THE SERVER'S SELECTION IS LOADED ONCE PER FIXTURE, not on every
        // push. A save pushes a fresh model back, and re-seeding from it would
        // throw away anything typed since — including the edit that triggered
        // the save.
        if (parsed.fixtureId && parsed.fixtureId !== this._loadedFor) {
            this.reset();
            this._loadedFor = parsed.fixtureId;
            this._format = Number(parsed.format) || 7;
            this._shape = parsed.shape || (PRESETS[this._format] || ["2-3-1"])[0];
            this._placed = Object.assign({}, parsed.selected || {});
            this._subs = (parsed.subs || []).slice();
            this._meetTime = parsed.meetTime || "";
            this._meetPlace = parsed.meetPlace || "";
        }
        this.paint();
    }

    players() { return (this._data && this._data.players) || []; }

    playerById(id) {
        const list = this.players();
        for (let i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
        return null;
    }

    selectable(p) { return !!p && p.rsvp !== "no"; }

    slotCount() {
        const v = shapeFits(this._shape, this._format);
        return v.ok ? v.slots : 0;
    }

    payload() {
        return {
            format: this._format,
            shape: this._shape,
            selected: this._placed,
            subs: this._subs,
            meetTime: this._meetTime,
            meetPlace: this._meetPlace
        };
    }

    wire() {
        this.shadowRoot.addEventListener("input", (ev) => {
            const t = ev.target.closest("[data-field]");
            if (!t) return;
            const f = t.getAttribute("data-field");

            if (f === "shape") {
                this._shape = t.value;
                this._placed = {}; this._armedSlot = null; this._armedPlayer = null;
                // Only the shape-dependent parts repaint — a full repaint here
                // pulls focus out of the box on every keystroke.
                this.paintShapeBits();
                return;
            }
            if (f === "meetTime") { this._meetTime = t.value; return; }
            if (f === "meetPlace") { this._meetPlace = t.value; return; }
        });

        this.shadowRoot.addEventListener("click", (ev) => {
            const el = ev.target.closest("[data-act]");
            if (!el) return;
            const act = el.getAttribute("data-act");

            if (act === "format") {
                this._format = Number(el.getAttribute("data-val"));
                this._shape = (PRESETS[this._format] || ["2-3-1"])[0];
                // The slots genuinely stop existing, so placements can't survive.
                this._placed = {};
                this._armedSlot = null; this._armedPlayer = null; this._addingSub = false;
                this.paint(); return;
            }

            if (act === "shape") {
                this._shape = el.getAttribute("data-val");
                this._placed = {};
                this._armedSlot = null; this._armedPlayer = null; this._addingSub = false;
                this.paint(); return;
            }

            if (act === "addsub") {
                this._addingSub = !this._addingSub;
                this._armedSlot = null; this._armedPlayer = null;
                this.paint(); return;
            }

            if (act === "unsub") {
                const rm = el.getAttribute("data-val");
                this._subs = this._subs.filter(x => x !== rm);
                this.paint(); return;
            }

            if (act === "slot") {
                const sid = el.getAttribute("data-val");
                this._addingSub = false;
                if (this._placed[sid]) {
                    delete this._placed[sid]; this._armedSlot = null; this.paint(); return;
                }
                if (this._armedPlayer) {
                    this._placed[sid] = this._armedPlayer;
                    this._armedPlayer = null; this._armedSlot = null; this.paint(); return;
                }
                this._armedSlot = (this._armedSlot === sid) ? null : sid;
                this.paint(); return;
            }

            if (act === "player") {
                const pid = el.getAttribute("data-val");
                // Blocked at the point of action, not just in CSS.
                if (!this.selectable(this.playerById(pid))) return;

                for (const k in this._placed) {
                    if (this._placed[k] === pid) { delete this._placed[k]; this.paint(); return; }
                }
                if (this._subs.indexOf(pid) !== -1) {
                    this._subs = this._subs.filter(x => x !== pid); this.paint(); return;
                }
                if (this._addingSub) {
                    this._subs.push(pid); this._addingSub = false; this.paint(); return;
                }
                if (this._armedSlot !== null) {
                    this._placed[this._armedSlot] = pid;
                    this._armedSlot = null; this._armedPlayer = null; this.paint(); return;
                }
                this._armedPlayer = (this._armedPlayer === pid) ? null : pid;
                this.paint(); return;
            }

            if (act === "save" || act === "publish") {
                const v = shapeFits(this._shape, this._format);
                if (!v.ok) {
                    this._localError = "That formation doesn't add up for " + this._format + "-a-side.";
                    this.paint(); return;
                }
                if (act === "publish" && Object.keys(this._placed).length === 0 && this._subs.length === 0) {
                    this._localError = "Pick somebody first.";
                    this.paint(); return;
                }
                this._localError = "";
                this.dispatchEvent(new CustomEvent(act === "save" ? "saveSquad" : "publishSquad", {
                    detail: { fixtureId: this._data.fixtureId, form: this.payload() }
                }));
                return;
            }

            if (act === "nudge") {
                this.dispatchEvent(new CustomEvent("nudgeReplies", {
                    detail: { fixtureId: this._data.fixtureId }
                }));
                return;
            }

            if (act === "back") {
                this.dispatchEvent(new CustomEvent("cancelSquadPick", { detail: {} }));
            }
        });
    }

    // Repaints only what the formation box affects, so typing keeps focus.
    paintShapeBits() {
        const v = shapeFits(this._shape, this._format);
        const verdict = this.shadowRoot.getElementById("verdict");
        const hint = this.shadowRoot.getElementById("shapeHint");
        if (verdict) {
            verdict.className = "verdict " + (v.ok ? "ok" : "no");
            verdict.textContent = v.ok ? "✓ valid" : "✗ " + v.error;
        }
        if (hint) {
            hint.textContent = v.ok
                ? this._shape + " adds up to " + (v.slots - (v.keeper ? 1 : 0)) +
                  (v.keeper ? ", plus a keeper." : " — no keeper at this format.")
                : "For " + this._format + "-a-side the digits need to total " + (this._format - 1) +
                  (this._format <= NO_KEEPER_MAX ? " (with a keeper) or " + this._format + " (without)." : ", leaving one for the keeper.");
        }
        this.paintPitch();
        this.paintList();
    }

    paint() {
        const body = this.shadowRoot && this.shadowRoot.getElementById("body");
        if (!body) return;
        const d = this._data || {};

        if (d.loading) { body.innerHTML = '<div class="loading">Loading the squad…</div>'; return; }
        if (d.error && !d.players) { body.innerHTML = '<div class="empty">' + esc(d.error) + "</div>"; return; }
        if (!d.fixtureId) { body.innerHTML = '<div class="empty">No fixture chosen.</div>'; return; }

        const f = d.fixture || {};
        const presets = PRESETS[this._format] || [];

        body.innerHTML = `
          <div class="card">
            <div class="fix">${esc(f.title || "Match")}</div>
            <div class="fixmeta">${esc(f.dateLabel || "")}${f.startTime ? " · " + esc(f.startTime) : ""}${f.venue ? " · " + esc(f.venue) : ""}</div>
          </div>

          <div class="card">
            <div class="label">Format</div>
            <div class="segs">
              ${FORMATS.map(n => `<button class="seg" type="button" data-act="format" data-val="${n}"
                   aria-pressed="${this._format === n}">${n}v${n}</button>`).join("")}
            </div>

            <div class="label" style="margin-top:16px">Shape</div>
            <div class="segs">
              ${presets.map(s => `<button class="seg" type="button" data-act="shape" data-val="${esc(s)}"
                   aria-pressed="${this._shape === s}">${esc(s)}</button>`).join("")}
            </div>

            <div class="custom">
              <input type="text" inputmode="numeric" data-field="shape"
                     value="${esc(this._shape)}" aria-label="Formation" />
              <span class="verdict" id="verdict"></span>
            </div>
            <div class="hint" id="shapeHint"></div>
          </div>

          <div class="card">
            <div id="pitchHost"></div>
            <div class="subs">
              <div class="subhead">
                <span class="label" style="margin:0">Subs</span>
                <span class="subnone" id="subCount"></span>
              </div>
              <div class="subrow" id="subrow"></div>
            </div>
          </div>

          <div class="card">
            <div class="counter">
              <span><b id="cnt">0</b> <span class="of">of <span id="need">0</span> on the pitch</span></span>
              <span class="of" id="avail"></span>
            </div>
            <div class="label">The squad</div>
            <div class="plist" id="plist"></div>
            <div class="key">
              <span><i class="chip yes"></i> Going</span>
              <span><i class="chip wait"></i> No reply</span>
              <span><i class="chip no"></i> Can't make it</span>
            </div>
            <div id="warnBox"></div>
          </div>

          <div class="card">
            <div class="label">Meeting up</div>
            <div class="two">
              <div class="field">
                <label for="mt">Meet at</label>
                <input id="mt" type="time" data-field="meetTime" value="${esc(this._meetTime)}" />
              </div>
              <div class="field">
                <label for="mp">Where</label>
                <input id="mp" type="text" data-field="meetPlace" value="${esc(this._meetPlace)}" />
              </div>
            </div>
            <div class="hint">This is what goes to the parents of everyone picked.</div>
          </div>

          ${this._localError || d.error ? `<div class="msg bad">${esc(this._localError || d.error)}</div>` : ""}
          ${d.done ? `<div class="msg good">${esc(d.done)}</div>` : ""}

          <div class="btns">
            <button class="btn primary" type="button" data-act="publish" ${d.busy ? "disabled" : ""}>
              ${d.busy ? "Working…" : (d.published ? "Update and resend" : "Publish squad")}
            </button>
            <button class="btn ghost" type="button" data-act="save" ${d.busy ? "disabled" : ""}>Save without sending</button>
            <button class="btn ghost" type="button" data-act="nudge" ${d.busy ? "disabled" : ""}>Nudge anyone who hasn't replied</button>
            <button class="btn ghost" type="button" data-act="back">Back to fixtures</button>
          </div>`;

        this.paintShapeBits();
    }

    paintPitch() {
        const host = this.shadowRoot.getElementById("pitchHost");
        if (!host) return;

        const v = shapeFits(this._shape, this._format);
        if (!v.ok) {
            host.innerHTML = `<div class="pitch"><div class="badshape">
                That shape doesn't add up for ${this._format}-a-side.
              </div></div>`;
            return;
        }

        const names = rowNames(v.rows.length);
        const lines = [];
        if (v.keeper) lines.push({ n: 1, label: "GK" });
        v.rows.forEach((n, i) => lines.push({ n, label: names[i] }));

        // Slot ids run from the KEEPER UP and must match what saveSquad
        // expects — the rows render top-down because CSS grid fills that way,
        // but a pitch is read from your own goal upward.
        const firstId = [];
        let running = 0;
        lines.forEach(l => { firstId.push(running); running += l.n; });

        const rowsHtml = lines.slice().reverse().map((line, ri) => {
            const base = firstId[lines.length - 1 - ri];
            let cells = "";
            for (let s = 0; s < line.n; s++) cells += this.slotHtml(base + s, line.label);
            return '<div class="prow">' + cells + "</div>";
        }).join("");

        host.innerHTML = `
          <div class="pitch" style="grid-template-rows:repeat(${lines.length},1fr)">
            <div class="box btm"></div>
            <div class="box top"></div>
            ${rowsHtml}
          </div>`;
    }

    slotHtml(id, label) {
        const sid = String(id);
        const pid = this._placed[sid];
        const p = pid ? this.playerById(pid) : null;
        const armed = this._armedSlot === sid;

        if (p) {
            return `<button class="slot filled${armed ? " armed" : ""}" type="button"
                        data-act="slot" data-val="${esc(sid)}"
                        aria-label="${esc(p.name)}, ${esc(label)}. Tap to remove.">
                      <span class="shirt">${esc(p.shirt || "–")}<i class="dot ${esc(p.rsvp)}"></i></span>
                      <span class="nm">${esc(shortName(p.name))}</span>
                      <span class="pos">${esc(label)}</span>
                    </button>`;
        }
        return `<button class="slot${armed ? " armed" : ""}" type="button"
                    data-act="slot" data-val="${esc(sid)}"
                    aria-label="Empty ${esc(label)}. Tap to fill.">
                  <span class="shirt">+</span>
                  <span class="pos">${esc(label)}</span>
                </button>`;
    }

    paintList() {
        const host = this.shadowRoot.getElementById("plist");
        if (!host) return;

        const placedIds = Object.keys(this._placed).map(k => this._placed[k]);

        host.innerHTML = this.players().map(p => {
            const onPitch = placedIds.indexOf(p.id) !== -1;
            const isSub = this._subs.indexOf(p.id) !== -1;
            const out = !this.selectable(p);
            const tag = out ? "OUT" : onPitch ? "ON" : isSub ? "SUB" : "";
            const note = p.rsvp === "wait" ? " · no reply yet" : p.rsvp === "no" ? " · can't make it" : "";

            return `<button class="p${onPitch || isSub ? " picked" : ""}${out ? " out" : ""}${this._armedPlayer === p.id ? " armed" : ""}"
                        type="button" data-act="player" data-val="${esc(p.id)}"${out ? ' aria-disabled="true"' : ""}>
                      <i class="chip ${esc(p.rsvp)}"></i>
                      <span class="who"><b>${esc(p.name)}</b><span>${p.shirt ? "Shirt " + esc(p.shirt) : "No shirt number"}${note}</span></span>
                      <span class="at">${tag}</span>
                    </button>`;
        }).join("");

        const need = this.slotCount();
        const cnt = this.shadowRoot.getElementById("cnt");
        const needEl = this.shadowRoot.getElementById("need");
        if (cnt) cnt.textContent = placedIds.length;
        if (needEl) needEl.textContent = need;

        const list = this.players();
        const going = list.filter(p => p.rsvp === "yes").length;
        const waiting = list.filter(p => p.rsvp === "wait").length;
        const outCount = list.filter(p => p.rsvp === "no").length;
        const avail = this.shadowRoot.getElementById("avail");
        if (avail) {
            avail.textContent = going + " going · " + waiting + " no reply" + (outCount ? " · " + outCount + " out" : "");
        }

        // Only the no-replies actually IN the squad. Unanswered parents who
        // aren't picked are not this manager's problem this morning.
        const picked = placedIds.concat(this._subs);
        const risky = picked.filter(id => {
            const p = this.playerById(id);
            return p && p.rsvp === "wait";
        });
        const box = this.shadowRoot.getElementById("warnBox");
        if (box) {
            box.innerHTML = risky.length
                ? '<div class="msg warn" style="margin-top:12px">' + risky.length +
                  (risky.length === 1 ? " player you've picked hasn't" : " players you've picked haven't") +
                  " replied yet. Nudge them before you publish?</div>"
                : "";
        }

        this.paintSubs();
    }

    paintSubs() {
        const row = this.shadowRoot.getElementById("subrow");
        if (!row) return;

        const chips = this._subs.map(id => {
            const p = this.playerById(id);
            if (!p) return "";
            return `<button class="sub" type="button" data-act="unsub" data-val="${esc(p.id)}">
                      <i class="chip ${esc(p.rsvp)}"></i>${esc(shortName(p.name))}
                      <span class="x" aria-hidden="true">×</span>
                    </button>`;
        }).join("");

        row.innerHTML = chips +
            `<button class="addsub" type="button" data-act="addsub" aria-pressed="${this._addingSub}">` +
            (this._addingSub ? "Pick a player…" : "+ Add sub") + "</button>";

        const count = this.shadowRoot.getElementById("subCount");
        if (count) {
            // No cap. Rotation squads run as many subs as they have players,
            // and any limit here would be a number nobody asked for.
            count.textContent = this._subs.length
                ? this._subs.length + " on the bench"
                : "Rolling subs — add as many as you need";
        }
    }
}

if (!customElements.get("manager-hub-squad-pick")) {
    customElements.define("manager-hub-squad-pick", ManagerHubSquadPick);
}

// =====================================================================
//  CONTRACT
// =====================================================================
//  IN — { loading } first, then getSquadPicker()'s payload:
//    { fixtureId, teamId,
//      fixture: { eventType, title, dateLabel, startTime, venue },
//      format, shape, selected: {slot: playerId}, subs: [playerId],
//      meetTime, meetPlace, published,
//      players: [{ id, name, shirt, rsvp: "yes"|"wait"|"no" }],
//      busy, error, done }
//
//    ⚠️ `selected` is read ONLY when fixtureId CHANGES. Pushing a fresh
//    model after a save must not re-seed the form, or it throws away
//    whatever was typed since.
//
//  OUT: on("saveSquad", e => …)     // { fixtureId, form }
//       on("publishSquad", e => …)  // { fixtureId, form }
//       on("nudgeReplies", e => …)  // { fixtureId }
//       on("cancelSquadPick", …)
// =====================================================================
