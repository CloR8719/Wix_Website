// =====================================================================
//  <manager-hub-share> — Manager Hub v2, the join link and QR code
// =====================================================================
//  SETUP:
//    1. Public -> custom-elements -> new file `managerHubShare.js`.
//       ⚠️ FLAT in custom-elements. Subfolders can be created but the
//       Editor's Custom Element picker won't traverse into them.
//    2. Add a new state to #stateboxMgr called `stateShare`.
//    3. On it: Add -> Embed Code -> Custom Element.
//       Tag name: manager-hub-share   Element ID: #customShare
//    4. Height ~620px to start; it self-sizes after first paint.
//
//  ⚠️ REPUBLISH *AND* HARD-REFRESH after any change.
//
//  WHY THIS EXISTS
//  ---------------
//  v1 had a real QR panel. v2's More menu kept the row ("Share the join
//  link — QR code and link for new players") but the handler was a stub:
//
//      el.on("openShare", () => wixLocationFrontend.to("/playerenquiry"));
//
//  which navigated the MANAGER onto the parent's form and out of the Hub
//  entirely. A manager stood in front of a parent had nothing to show them
//  and no way back except the browser's back button.
//
//  THE QR IS A REMOTE IMAGE, and that's fine here in a way it wouldn't be
//  in an Artifact - this is a live Wix page with no CSP restriction. It's
//  api.qrserver.com, same service v1 used, so the codes are identical to
//  the ones already printed on anything physical.
//
//  Generating the QR locally would need a QR library inlined into this
//  file, which is a lot of bytes to avoid one image request. But the
//  onerror path below matters: if that service is ever down, the manager
//  still gets the link and the copy button rather than a broken image and
//  no explanation.
// =====================================================================

const JOIN_URL = "https://www.signolathleticjfc.co.uk/playerenquiry";

const QR_SRC = size =>
    "https://api.qrserver.com/v1/create-qr-code/?margin=8&size=" +
    size + "x" + size + "&data=" + encodeURIComponent(JOIN_URL);

const STYLES = `
  :host { display: block; width: 100%; font-family: 'Work Sans', -apple-system, BlinkMacSystemFont, sans-serif; }
  * { box-sizing: border-box; }

  .wrap {
    --accent:#2C3540; --accent-soft:#E3E6EA;
    --surface:#FFFFFF; --raised:#FFFFFF;
    --line:#E1E4DB; --line-soft:#ECEEE8;
    --text:#16212F; --text-muted:#5C6B7A; --text-faint:#8B98A3;
    --success:#158A45; --success-bg:#E4F5EA;
    padding: 16px 16px 32px;
    color: var(--text);
    display: flex; flex-direction: column;
  }

  /* Gap on #body, not .wrap — #body is .wrap's only child, so a gap up
     there separates nothing. Same bug that flattened 12 elements before. */
  #body { display: flex; flex-direction: column; gap: 18px; }

  /* The bottom nav is pinned OVER the page, so the clearance has to be
     inside this element — growing .wrap is what grows the measured height. */
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
  .intro { font-size: 13px; line-height: 1.6; color: var(--text-muted); }

  .qrbox { display: flex; flex-direction: column; align-items: center; gap: 13px; }
  .qr {
    width: 100%; max-width: 260px; aspect-ratio: 1 / 1;
    border-radius: 12px; border: 1px solid var(--line-soft);
    background: #FFFFFF;
    display: block; object-fit: contain;
  }
  /* White stays white in both themes — a QR inverted by a dark theme will
     not scan on many readers, and this one gets pointed at by strangers. */
  .qrfail {
    width: 100%; max-width: 260px; padding: 22px 16px; text-align: center;
    border: 1px dashed var(--line); border-radius: 12px;
    font-size: 12.5px; line-height: 1.55; color: var(--text-muted);
  }
  .cap { font-size: 12px; color: var(--text-faint); text-align: center; line-height: 1.5; }

  .linkrow {
    display: flex; align-items: center; gap: 9px;
    padding: 12px 13px; border-radius: 10px;
    background: var(--accent-soft);
    font-size: 12.5px; word-break: break-all; line-height: 1.45;
  }

  .btns { display: flex; flex-direction: column; gap: 9px; }
  .btn {
    width: 100%; padding: 13px 15px; border-radius: 10px;
    font-family: inherit; font-size: 14px; font-weight: 700;
    cursor: pointer; border: 1.5px solid transparent;
  }
  .btn.primary { background: var(--accent); color: #fff; }
  .btn.ghost { background: transparent; color: var(--accent); border-color: var(--line); }
  .btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .btn[disabled] { opacity: .55; cursor: default; }

  .done {
    font-size: 12.5px; font-weight: 600; color: var(--success);
    background: var(--success-bg); border-radius: 9px;
    padding: 9px 12px; text-align: center;
  }

  .steps { margin: 0; padding-left: 18px; font-size: 12.5px; line-height: 1.7; color: var(--text-muted); }
  .steps li + li { margin-top: 4px; }
`;

function esc(v) {
    return String(v === undefined || v === null ? "" : v)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

class ManagerHubShare extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._note = "";
        this._noteTimer = 0;
        this._qrFailed = false;
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

    disconnectedCallback() {
        if (this._ro) this._ro.disconnect();
        if (this._noteTimer) clearTimeout(this._noteTimer);
    }

    attributeChangedCallback() { this.paint(); }

    // Shown for a few seconds then cleared. A "Copied" that never goes away
    // stops meaning "just now", which is the only thing it's telling you.
    flash(msg) {
        this._note = msg;
        this.paint();
        if (this._noteTimer) clearTimeout(this._noteTimer);
        this._noteTimer = setTimeout(() => { this._note = ""; this.paint(); }, 3000);
    }

    wire() {
        this.shadowRoot.addEventListener("click", async (ev) => {
            const el = ev.target.closest("[data-act]");
            if (!el) return;
            const act = el.getAttribute("data-act");

            if (act === "copy") {
                try {
                    await navigator.clipboard.writeText(JOIN_URL);
                    this.flash("Link copied");
                } catch (err) {
                    // Clipboard access is refused in some in-app browsers.
                    // Selecting the text is the fallback that always works.
                    console.warn("manager-hub-share: clipboard refused", err);
                    this.flash("Press and hold the link above to copy it");
                }
                return;
            }

            if (act === "share") {
                // The native sheet — WhatsApp, Messages, wherever the parent
                // actually is. Absent on desktop, so the button only renders
                // when it exists.
                try {
                    await navigator.share({
                        title: "Join Signol Athletic JFC",
                        text: "Register your child's interest with Signol Athletic JFC:",
                        url: JOIN_URL
                    });
                } catch (err) {
                    // Includes the user simply dismissing the sheet, which is
                    // not an error worth showing them.
                    if (err && err.name !== "AbortError") {
                        console.warn("manager-hub-share: share failed", err);
                    }
                }
                return;
            }

            if (act === "manual") {
                this.dispatchEvent(new CustomEvent("openManualEnquiry", { detail: {} }));
                return;
            }

            if (act === "preview") {
                this.dispatchEvent(new CustomEvent("openJoinPage", { detail: { url: JOIN_URL } }));
            }
        });
    }

    paint() {
        const body = this.shadowRoot && this.shadowRoot.getElementById("body");
        if (!body) return;

        const canShare = typeof navigator !== "undefined" && !!navigator.share;

        body.innerHTML = `
          <div>
            <div class="label">Point a phone at this</div>
            <div class="card qrbox">
              ${this._qrFailed
                  ? `<div class="qrfail">
                       The QR image couldn't load just now.<br>
                       The link below still works — copy it and send it over.
                     </div>`
                  : `<img class="qr" id="qrImg" alt="QR code linking to the Signol Athletic join form"
                          src="${esc(QR_SRC(480))}" />`}
              <div class="cap">
                Opens the enquiry form. The age group is worked out<br>
                from the child's date of birth.
              </div>
            </div>
          </div>

          <div>
            <div class="label">Or send the link</div>
            <div class="card">
              <div class="linkrow" id="linkRow">${esc(JOIN_URL)}</div>
              <div class="btns" style="margin-top:13px">
                ${canShare
                    ? `<button type="button" class="btn primary" data-act="share">Share link…</button>
                       <button type="button" class="btn ghost" data-act="copy">Copy link</button>`
                    : `<button type="button" class="btn primary" data-act="copy">Copy link</button>`}
              </div>
              ${this._note ? `<div class="done" style="margin-top:11px">${esc(this._note)}</div>` : ""}
            </div>
          </div>

          <div>
            <div class="label">Taking details yourself</div>
            <div class="card">
              <p class="intro" style="margin:0 0 13px">
                If a parent would rather just tell you, add the enquiry here and
                it lands in your Enquiries list claimed to you — so nobody else
                rings the same family.
              </p>
              <div class="btns">
                <button type="button" class="btn ghost" data-act="manual">Add an enquiry manually</button>
                <button type="button" class="btn ghost" data-act="preview">See the parent&#39;s form</button>
              </div>
              <p class="hint" style="margin:11px 0 0">
                Viewing the form leaves the Hub — use your browser&#39;s back button to return.
              </p>
            </div>
          </div>

          <div>
            <div class="label">Using the QR code</div>
            <div class="card">
              <ol class="steps">
                <li>Hold it up on your phone — most cameras read it without an app.</li>
                <li>Screenshot it for a team WhatsApp group.</li>
                <li>It's the same code as anything already printed, so old posters still work.</li>
              </ol>
            </div>
          </div>`;

        // Bound after each paint, since the node is replaced every time.
        const img = this.shadowRoot.getElementById("qrImg");
        if (img) {
            img.addEventListener("error", () => {
                console.error("manager-hub-share: QR service unreachable —", QR_SRC(480));
                this._qrFailed = true;
                this.paint();
            });
        }
    }
}

if (!customElements.get("manager-hub-share")) {
    customElements.define("manager-hub-share", ManagerHubShare);
}

// =====================================================================
//  CONTRACT
// =====================================================================
//  IN:  no data needed — the join link is a constant. The `data` attribute
//       is observed only so a push from the page triggers a repaint.
//
//  OUT: on("openManualEnquiry", …)   // manager wants to type one in
//       on("openJoinPage", …)        // { url } — show the parent's form
// =====================================================================
