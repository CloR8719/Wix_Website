// Bridge between Parent Hub.js (page code - owns the registration data/logic) and
// masterPage.js (the only file that can $w-select header elements).
//
// IMPORTANT: a plain in-memory variable/callback registry in a public file does NOT
// stay shared between masterPage.js and page code in Velo - each gets its own
// separate copy silently (no error, it just never connects). Confirmed the hard way:
// an earlier version of this bridge used exported callback registration functions and
// registerHeaderHandlers()/registerSaveDraftHandler() never actually reached across.
// wix-storage-frontend's session storage IS shared across that boundary (it's Wix's
// own documented pattern for masterPage<->page communication), so everything here
// goes through it instead - each side polls on an interval since storage has no
// same-tab change event to push updates.
import { session } from 'wix-storage-frontend';

const KEY_VISIBLE = "parentHub_progressBar_visible";
const KEY_TEXT = "parentHub_progressBar_text";
const KEY_SAVE_REQUEST_ID = "parentHub_progressBar_saveRequestId";
const KEY_SAVE_RESULT = "parentHub_progressBar_saveResult";

export function setProgressBarVisible(visible) {
    session.setItem(KEY_VISIBLE, visible ? "true" : "false");
}

export function getProgressBarVisible() {
    return session.getItem(KEY_VISIBLE) === "true";
}

export function setProgressBarText(text) {
    session.setItem(KEY_TEXT, text);
}

export function getProgressBarText() {
    return session.getItem(KEY_TEXT) || "";
}

// Called from masterPage.js when the header's Save Draft button is clicked. Returns
// a requestId so masterPage.js can match up the eventual result to THIS click (in
// case of a rapid double-click) rather than an older stale result.
export function requestSaveDraft() {
    const requestId = Date.now().toString();
    session.setItem(KEY_SAVE_REQUEST_ID, requestId);
    return requestId;
}

export function getSaveDraftRequestId() {
    return session.getItem(KEY_SAVE_REQUEST_ID) || "";
}

// Called from Parent Hub.js once it's actually run the save for a given requestId.
export function setSaveDraftResult(requestId, result) {
    session.setItem(KEY_SAVE_RESULT, JSON.stringify({ requestId, ...result }));
}

export function getSaveDraftResult() {
    const raw = session.getItem(KEY_SAVE_RESULT);
    return raw ? JSON.parse(raw) : null;
}
