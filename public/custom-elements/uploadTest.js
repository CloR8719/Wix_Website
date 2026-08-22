// =====================================================================
//  <upload-test> — proving file upload works from a custom element
// =====================================================================
//  THROWAWAY TEST HARNESS. Its job is to answer one question before the
//  8-step registration wizard gets built around it: can a custom element
//  put a file in the Media Manager? If yes, stateRegistration converts
//  whole. If no, #regheadshot and #regpaperid stay native and everything
//  else still converts.
//
//  Deliberately shows its working - original size, shrunk size, the
//  returned fileUrl - because "it uploaded" isn't the answer. The answer
//  is whether it uploads a real phone photo without the payload being too
//  big, which is the part that could fail.
//
//  SETUP:
//    1. Public -> custom-elements -> new file `uploadTest.js`, paste this.
//    2. Add -> Embed Code -> Custom Element on any page you can reach.
//       Tag name: upload-test   Element ID: #customUploadTest
//    3. Height ~520px.
//    4. Add the page code from the contract at the bottom of this file.
//    5. Test with a photo taken on your phone, NOT a screenshot - phone
//       camera files are 3-8MB and screenshots are ~200KB, so a screenshot
//       would pass without testing anything.
//
//  If it works, the useful parts (shrinkImage, toBase64, the event shape)
//  lift straight into the registration element and this file is deleted.
// =====================================================================

// Longest edge, in pixels, an image is downscaled to before encoding.
// A headshot is displayed small; 1200px is generous for that and lands a
// typical phone photo around 150-400KB instead of 3-8MB.
const MAX_IMAGE_DIMENSION = 1200;
const JPEG_QUALITY = 0.85;

// Rejected in the browser so a doomed 12MB PDF never gets encoded and sent
// only to be refused. Matches MAX_BYTES in mediaUpload.jsw - the backend
// still enforces it, this is just a faster, kinder failure.
const MAX_BYTES = 4 * 1024 * 1024;

const STYLES = `
  :host { display: block; width: 100%; font-family: 'Work Sans', -apple-system, BlinkMacSystemFont, sans-serif; }
  * { box-sizing: border-box; }
  .wrap {
    --surface:#FFFFFF; --pitch:#1F5136; --pitch-soft:#DCE9E0;
    --line:#E1E4DB; --text:#16212F; --text-muted:#5C6B7A;
    --success:#158A45; --success-bg:#E4F5EA;
    --critical:#C23B3B; --critical-bg:#FCEAEA;
    padding: 18px; color: var(--text);
  }
  h2 { margin: 0 0 4px; font-size: 16px; font-weight: 700; }
  .sub { margin: 0 0 16px; font-size: 12.5px; color: var(--text-muted); line-height: 1.5; }

  .drop {
    border: 1.5px dashed var(--line); border-radius: 12px;
    padding: 20px; text-align: center; background: var(--surface);
  }
  .drop label {
    display: inline-block; cursor: pointer;
    font-size: 13px; font-weight: 600; padding: 10px 18px;
    border: 1.5px solid var(--pitch); border-radius: 999px; color: var(--pitch);
  }
  .drop label:hover { background: var(--pitch-soft); }
  input[type="file"] { position: absolute; width: 1px; height: 1px; opacity: 0; }
  input[type="file"]:focus-visible + label { outline: 2px solid var(--pitch); outline-offset: 2px; }
  .hint { margin-top: 10px; font-size: 11.5px; color: var(--text-muted); }

  .btn {
    width: 100%; margin-top: 14px; font-family: inherit;
    font-size: 14px; font-weight: 600; padding: 12px; border: none;
    border-radius: 10px; background: var(--pitch); color: #fff; cursor: pointer;
  }
  .btn[disabled] { opacity: 0.55; cursor: default; }

  .readout {
    margin-top: 14px; font-size: 12px; line-height: 1.6;
    border-top: 1px solid var(--line); padding-top: 12px;
  }
  .row { display: flex; justify-content: space-between; gap: 12px; padding: 2px 0; }
  .row span:first-child { color: var(--text-muted); }
  .row span:last-child { font-weight: 600; text-align: right; overflow-wrap: anywhere; }

  .result { margin-top: 12px; padding: 11px 12px; border-radius: 9px; font-size: 12px; line-height: 1.5; display: none; }
  .result.show { display: block; }
  .result.ok { background: var(--success-bg); color: var(--success); }
  .result.bad { background: var(--critical-bg); color: var(--critical); }
  .result code { font-family: ui-monospace, Menlo, monospace; font-size: 11px; overflow-wrap: anywhere; }

  img.preview { display: none; max-width: 160px; border-radius: 8px; margin-top: 12px; }
  img.preview.show { display: block; }

  @media (prefers-color-scheme: dark) {
    .wrap {
      --surface:#121F30; --line:#223145; --text:#E7ECF2; --text-muted:#A6B4C3;
      --pitch:#5FBF8B; --pitch-soft:#17301F;
      --success:#5FD08B; --success-bg:#103322;
      --critical:#F08A8A; --critical-bg:#3A1414;
    }
    .btn { color: #06120C; }
  }
`;

function kb(bytes) {
    if (!bytes && bytes !== 0) return "—";
    return bytes < 1024 * 1024
        ? `${Math.round(bytes / 1024)} KB`
        : `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

// Downscale an image through a canvas and re-encode as JPEG. This is the
// whole reason the approach is viable: it turns an 8MB camera photo into a
// few hundred KB before base64 inflates it by a third.
// Returns null when the file isn't an image or can't be decoded, in which
// case the caller sends the original bytes.
async function shrinkImage(file) {
    if (!/^image\//.test(file.type)) return null;
    if (typeof createImageBitmap !== "function") return null;

    try {
        const bitmap = await createImageBitmap(file);
        const longest = Math.max(bitmap.width, bitmap.height);
        const scale = Math.min(1, MAX_IMAGE_DIMENSION / longest);

        const canvas = document.createElement("canvas");
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close && bitmap.close();

        const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
        if (!blob) return null;

        // A small PNG can come out BIGGER as a JPEG. Keep whichever wins.
        if (blob.size >= file.size) return null;
        return { blob, width: canvas.width, height: canvas.height };
    } catch (err) {
        console.error("upload-test: couldn't shrink image, sending original", err);
        return null;
    }
}

function toBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        // readAsDataURL gives "data:<mime>;base64,<payload>" - split off the
        // prefix here so the backend receives bare base64. (It strips a
        // prefix defensively too, but one place should be right.)
        reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
        reader.onerror = () => reject(new Error("Could not read that file."));
        reader.readAsDataURL(blob);
    });
}

class UploadTest extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this._file = null;
        this._prepared = null;
        this._built = false;
    }

    static get observedAttributes() { return ["uploadstate", "uploadresult"]; }

    connectedCallback() { this.build(); }

    attributeChangedCallback() {
        if (!this._built) this.build();
        this.paintResult();
    }

    build() {
        if (this._built) return;
        this._built = true;

        this.shadowRoot.innerHTML = `
          <style>${STYLES}</style>
          <div class="wrap">
            <h2>Upload test</h2>
            <p class="sub">
              Pick a photo taken on your phone (not a screenshot). It gets shrunk in the
              browser, base64-encoded, sent to a backend function, and uploaded to the
              Media Manager.
            </p>

            <div class="drop">
              <input type="file" id="file" accept="image/jpeg,image/png,image/webp,application/pdf" />
              <label for="file">Choose a file</label>
              <div class="hint">JPG, PNG, WEBP or PDF · max 4MB after shrinking</div>
              <img class="preview" id="preview" alt="" />
            </div>

            <div class="readout" id="readout" style="display:none">
              <div class="row"><span>File</span><span id="rName">—</span></div>
              <div class="row"><span>Type</span><span id="rType">—</span></div>
              <div class="row"><span>Original size</span><span id="rOrig">—</span></div>
              <div class="row"><span>After shrinking</span><span id="rShrunk">—</span></div>
              <div class="row"><span>Base64 payload</span><span id="rPayload">—</span></div>
            </div>

            <button type="button" class="btn" id="btnUpload" disabled>Upload to Media Manager</button>
            <div class="result" id="result"></div>
          </div>`;

        const $ = (id) => this.shadowRoot.getElementById(id);

        $("file").addEventListener("change", (event) => {
            const file = event.target.files && event.target.files[0];
            if (file) this.prepare(file);
        });

        $("btnUpload").addEventListener("click", () => this.send());
    }

    async prepare(file) {
        const $ = (id) => this.shadowRoot.getElementById(id);
        this._file = file;
        this._prepared = null;

        $("readout").style.display = "";
        $("result").className = "result";
        $("rName").textContent = file.name;
        $("rType").textContent = file.type || "(unknown)";
        $("rOrig").textContent = kb(file.size);
        $("rShrunk").textContent = "working…";
        $("rPayload").textContent = "—";
        $("btnUpload").disabled = true;

        const shrunk = await shrinkImage(file);
        const blob = shrunk ? shrunk.blob : file;
        const mimeType = shrunk ? "image/jpeg" : (file.type || "application/octet-stream");

        $("rShrunk").textContent = shrunk
            ? `${kb(blob.size)}  (${shrunk.width}×${shrunk.height})`
            : "not an image — sent as-is";

        if (blob.size > MAX_BYTES) {
            $("rPayload").textContent = "—";
            this.showResult("bad", `That file is ${kb(blob.size)} after shrinking, over the 4MB limit. A PDF this size needs compressing before upload.`);
            return;
        }

        try {
            const base64 = await toBase64(blob);
            // The number that actually matters - this is what crosses the
            // web module boundary, and it's ~33% bigger than the file.
            $("rPayload").textContent = `${kb(base64.length)} of base64`;

            const name = shrunk ? file.name.replace(/\.[^.]+$/, "") + ".jpg" : file.name;
            this._prepared = { base64, fileName: name, mimeType };

            if (/^image\//.test(file.type)) {
                const preview = $("preview");
                preview.src = URL.createObjectURL(blob);
                preview.classList.add("show");
            }

            $("btnUpload").disabled = false;
        } catch (err) {
            this.showResult("bad", err.message || "Could not read that file.");
        }
    }

    send() {
        if (!this._prepared) return;
        const $ = (id) => this.shadowRoot.getElementById(id);
        $("btnUpload").disabled = true;
        $("btnUpload").textContent = "Uploading…";
        $("result").className = "result";
        this.dispatchEvent(new CustomEvent("uploadFile", { detail: this._prepared }));
    }

    showResult(kind, html) {
        const el = this.shadowRoot.getElementById("result");
        el.className = "result show " + kind;
        el.innerHTML = html;
    }

    paintResult() {
        const $ = (id) => this.shadowRoot.getElementById(id);
        const state = (this.getAttribute("uploadstate") || "").toLowerCase();
        if (!state) return;

        $("btnUpload").textContent = "Upload to Media Manager";
        $("btnUpload").disabled = !this._prepared;

        const raw = this.getAttribute("uploadresult") || "";
        if (state === "ok") {
            this.showResult("ok", `Uploaded.<br><code>${raw.replace(/</g, "&lt;")}</code>`);
        } else if (state === "error") {
            this.showResult("bad", raw.replace(/</g, "&lt;") || "Upload failed.");
        }
    }
}

if (!customElements.get("upload-test")) {
    customElements.define("upload-test", UploadTest);
}

// =====================================================================
//  PAGE CODE — add to whichever page holds the element
// =====================================================================
//  import { uploadRegistrationFile } from 'backend/mediaUpload.jsw';
//
//  $w.onReady(() => {
//      if (!$w("#customUploadTest").id) return;
//      $w("#customUploadTest").on("uploadFile", async (event) => {
//          const { base64, fileName, mimeType } = event.detail;
//          try {
//              const result = await uploadRegistrationFile(base64, fileName, mimeType);
//              $w("#customUploadTest").setAttribute(
//                  "uploadresult", result.success ? result.fileUrl : (result.error || "Failed"));
//              $w("#customUploadTest").setAttribute("uploadstate", result.success ? "ok" : "error");
//          } catch (err) {
//              console.error("Upload test failed:", err);
//              $w("#customUploadTest").setAttribute("uploadresult", err.message || "Call failed");
//              $w("#customUploadTest").setAttribute("uploadstate", "error");
//          }
//      });
//  });
//
//  WHAT A PASS LOOKS LIKE: a wix:image://... URL comes back for a photo
//  taken on your phone, and the base64 payload line reads a few hundred KB
//  rather than several MB.
//
//  IF IT FAILS, the readout says which part broke - a payload of several MB
//  means shrinking didn't run (check the console), while a small payload
//  that still errors means the web module or mediaManager is the problem,
//  and the error text will say which.
// =====================================================================
