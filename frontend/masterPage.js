import { authentication, currentMember } from 'wix-members-frontend';
import { linkMemberToStaff } from 'backend/staffData';
import { getProgressBarVisible, getProgressBarText, requestSaveDraft, getSaveDraftResult } from 'public/parentHubProgressBar.js';
// Safe to import here even though public-file state is NOT shared between
// masterPage and page code (see the progress-bar note further down). That
// gotcha is about *mutable* values - this module only exports a constant list
// and a pure function, so both contexts read identical values.
import { isBetaTester } from 'public/betaAccess.js';

// Tracks what's already been applied to the header so the poll below only touches
// $w elements when something actually changed, and so a stale/older save result
// (from a previous click) can't be mistaken for the current one.
let lastAppliedVisible = null;
let lastAppliedText = null;
let pendingSaveRequestId = null;

// Secretary dashboard shortcut (2026-08) - #btnSecretaryDashboard is a header
// button that lives on every page (built once here in masterPage, not per-page).
// Its LINK is set directly in the Editor (Link > paste the Dashboard Page's URL >
// Open in new tab) - no code needed for the navigation itself. Code here only
// controls VISIBILITY: shown only when the logged-in member's email is in this
// list, so nobody else ever sees it. Add/remove emails here as needed (e.g. your
// own, for testing) - no other code changes needed.
// ⚠️ SETUP: replace with real emails, all lowercase.
const SECRETARY_EMAILS = [
    "rob@example.com",
    "secretary@example.com"
];

async function updateSecretaryButton() {
    if (!$w("#btnSecretaryDashboard").id) return;
    try {
        if (!authentication.loggedIn()) { $w("#btnSecretaryDashboard").collapse(); return; }
        const member = await currentMember.getMember();
        const email = (member && member.loginEmail || "").toLowerCase();
        if (SECRETARY_EMAILS.includes(email)) {
            $w("#btnSecretaryDashboard").expand();
        } else {
            $w("#btnSecretaryDashboard").collapse();
        }
    } catch (err) {
        console.error("Secretary button visibility check failed:", err);
        $w("#btnSecretaryDashboard").collapse();
    }
}

// Beta shortcut (2026-08-16) - #btnParentHubV2 is a header button, same build
// as #btnSecretaryDashboard above: LINK set in the Editor, code here controls
// only VISIBILITY. It exists because Parent Hub v2 is hidden from the site
// menu while it's being built, so there's otherwise no way to reach it on a
// real phone - and a custom element can't be tested any other way (they don't
// render in the Editor or in Preview).
//
// Gated on public/betaAccess.js, the SAME list that hides the stateMore2 tab
// inside the hub. One list, so there's no way to end up able to reach the page
// but not see the thing you came to test.
//
// Delete this function, its two call sites, and the button once v2 goes live
// and joins the normal menu.
async function updateBetaHubButton() {
    if (!$w("#btnParentHubV2").id) return;
    try {
        if (!authentication.loggedIn()) { $w("#btnParentHubV2").collapse(); return; }
        const member = await currentMember.getMember();
        if (isBetaTester(member)) {
            $w("#btnParentHubV2").expand();
        } else {
            $w("#btnParentHubV2").collapse();
        }
    } catch (err) {
        console.error("Beta hub button visibility check failed:", err);
        $w("#btnParentHubV2").collapse();
    }
}

$w.onReady(async function () {
    // Both collapse first and expand only on a passing check - so a logged-out
    // visitor, or a thrown error below, leaves them hidden. Fail closed.
    if ($w("#btnSecretaryDashboard").id) $w("#btnSecretaryDashboard").collapse();
    if ($w("#btnParentHubV2").id) $w("#btnParentHubV2").collapse();

    // 1. Initial check when page loads
    const isLoggedIn = authentication.loggedIn();

    if (isLoggedIn) {
        runSecureSync();
        updateSecretaryButton();
        updateBetaHubButton();
    }

    // 2. Listener for the exact moment they log in
    authentication.onLogin(() => {
        console.log("Login event detected.");
        runSecureSync();
        updateSecretaryButton();
        updateBetaHubButton();
    });

    // Parent Hub's sticky registration progress bar - lives in the header (with a
    // sticky/"always fixed" scroll effect set in the Editor) because Classic Editor
    // has no Fixed Position option for regular elements in mobile view. Collapsed by
    // default so it's invisible on every other page.
    //
    // Communication with Parent Hub.js goes through wix-storage-frontend session
    // storage (see public/parentHubProgressBar.js) rather than shared in-memory
    // callbacks - plain variables/functions in a public file do NOT stay shared
    // between masterPage.js and page code in Velo, so this polls the stored values
    // on an interval instead of expecting a live push.
    $w("#stickyProgressBar").collapse();

    $w("#btnSaveDraft").onClick(() => {
        $w("#btnSaveDraft").disable();
        $w("#btnSaveDraft").label = "Saving Draft securely...";
        pendingSaveRequestId = requestSaveDraft();
    });

    setInterval(() => {
        const visible = getProgressBarVisible();
        if (visible !== lastAppliedVisible) {
            lastAppliedVisible = visible;
            if (visible) {
                $w("#stickyProgressBar").expand();
            } else {
                $w("#stickyProgressBar").collapse();
            }
        }

        const text = getProgressBarText();
        if (text !== lastAppliedText) {
            lastAppliedText = text;
            $w("#textProgress").text = text;
        }

        if (pendingSaveRequestId) {
            const result = getSaveDraftResult();
            if (result && result.requestId === pendingSaveRequestId) {
                pendingSaveRequestId = null;
                $w("#btnSaveDraft").label = result.success ? "Saved Successfully" : "Error Saving";
                if (!result.success) console.error("Header Save Draft failed:", result.error);

                setTimeout(() => {
                    $w("#btnSaveDraft").label = "Save Draft";
                    $w("#btnSaveDraft").enable();
                }, 2000);
            }
        }
    }, 400);
});

async function runSecureSync() {
    try {
        // We use currentMember here instead of authentication
        const member = await currentMember.getMember();
        
        if (member) {
            const mId = member._id;
            // The email is stored under loginEmail in the member object
            const mEmail = member.loginEmail;
            
            console.log("Frontend: Sending data to Vault for " + mEmail);
            const result = await linkMemberToStaff(mId, mEmail);
            console.log("Frontend: Result ->", result.status);
        } else {
            console.log("Frontend: No member data found even though logged in.");
        }
    } catch (err) {
        console.error("Frontend: Sync Failed", err);
    }
}