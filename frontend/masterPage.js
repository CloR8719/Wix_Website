import { authentication, currentMember } from 'wix-members-frontend';
import { linkMemberToStaff } from 'backend/staffData';
import { getProgressBarVisible, getProgressBarText, requestSaveDraft, getSaveDraftResult } from 'public/parentHubProgressBar.js';

// Tracks what's already been applied to the header so the poll below only touches
// $w elements when something actually changed, and so a stale/older save result
// (from a previous click) can't be mistaken for the current one.
let lastAppliedVisible = null;
let lastAppliedText = null;
let pendingSaveRequestId = null;

$w.onReady(async function () {

    // 1. Initial check when page loads
    const isLoggedIn = authentication.loggedIn();

    if (isLoggedIn) {
        runSecureSync();
    }

    // 2. Listener for the exact moment they log in
    authentication.onLogin(() => {
        console.log("Login event detected.");
        runSecureSync();
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