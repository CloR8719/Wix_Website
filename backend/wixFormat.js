// =====================================================================
//  wixFormat.js — turning Wix column formats into things people can read
// =====================================================================
//  Wix's typed columns hand back STORAGE formats, and every one has to be
//  translated in BOTH directions before it touches a form control:
//
//    IMAGE      "wix:image://v1/<id>/<name>#…"   an <img src> can't load it,
//                                                so it renders as a broken
//                                                image icon.
//    RICH_TEXT  "<p class=\"font_8\">…</p>"      dropped into a textarea it
//                                                shows the manager raw markup.
//    TIME       "19:00:00.000"                   <input type="time"> requires
//                                                exactly HH:MM and renders
//                                                BLANK otherwise - so saving
//                                                writes "" back over a real
//                                                value. Silent data loss.
//    DATE       a Date object, never a           see feedback_wix_data_gotchas
//               display-formatted string
//
//  Shared because six RICH_TEXT columns are edited across the Manager Hub
//  (teamIntro, achievements, bio, sponsorBlurb, articleBody, PO_reason) and
//  two modules write them. Two copies of a format converter is two chances to
//  fix a bug in only one of them.
//
//  A plain .js file, NOT .jsw, deliberately: these are pure helpers with no
//  business being callable from a browser, and a .js backend module needs no
//  await when imported.
// =====================================================================

// wix:image://v1/abc~mv2.jpg/photo.jpg#originWidth=… -> a real https URL.
// An https URL passes straight through, so this is safe to call twice.
export function imageToUrl(value) {
    const v = String(value || "").trim();
    if (!v) return "";
    if (/^https?:\/\//i.test(v)) return v;
    const m = v.match(/^wix:image:\/\/v1\/([^/]+)/i);
    return m ? "https://static.wixstatic.com/media/" + m[1] : "";
}

// RICH_TEXT -> plain text for a textarea. Paragraph and line breaks become
// newlines; everything else is dropped.
//
// ⚠️ LOSES inline formatting - bold, italic, links. Accepted deliberately: a
// manager editing a description in a plain textarea is worth more than
// preserving formatting almost nobody applied. Rich editing would need a real
// editor, not a cleverer stripper.
export function richToText(value) {
    const v = String(value || "");
    if (!v) return "";
    if (v.indexOf("<") === -1) return v;
    return v
        .replace(/<\s*br\s*\/?\s*>/gi, "\n")
        .replace(/<\s*\/\s*p\s*>/gi, "\n\n")
        .replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&quot;/gi, '"')
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

// Plain text -> RICH_TEXT. Real paragraphs, so the website's dynamic pages
// render it the way they always have.
//
// Escaped on the way in: this content goes onto PUBLIC pages, so a manager
// typing an angle bracket must not be able to put markup there.
export function textToRich(value) {
    const v = String(value || "").trim();
    if (!v) return "";
    return v.split(/\n{2,}/).map(function (block) {
        const safe = block
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .split("\n").join("<br>");
        return "<p>" + safe + "</p>";
    }).join("");
}

// TIME -> "HH:MM" for <input type="time">. Anything unparseable returns blank
// rather than a guess: an invalid value in that input is indistinguishable
// from an empty one, and the empty one at least can't be mistaken for correct.
export function toTimeInput(value) {
    const v = String(value || "").trim();
    if (!v) return "";
    const m = v.match(/^([0-9]{1,2}):([0-9]{2})/);
    if (!m) return "";
    const h = m[1].length === 1 ? "0" + m[1] : m[1];
    return h + ":" + m[2];
}

// TIME -> something a human reads: "7pm", "7.30pm".
export function timeToWords(value) {
    const v = String(value || "").trim();
    if (!v) return "";
    const m = v.match(/^([0-9]{1,2}):([0-9]{2})/);
    if (!m) return v;
    let h = Number(m[1]);
    const mins = m[2];
    const suffix = h >= 12 ? "pm" : "am";
    h = h % 12;
    if (h === 0) h = 12;
    return mins === "00" ? (h + suffix) : (h + "." + mins + suffix);
}
