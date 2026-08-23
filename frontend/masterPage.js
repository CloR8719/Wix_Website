import { authentication, currentMember } from 'wix-members-frontend';
import { linkMemberToStaff } from 'backend/staffData';

// Secretary dashboard shortcut (2026-08) - #btnSecretaryDashboard is a header
// button that lives on every page (built once here in masterPage, not per-page).
// Its LINK is set directly in the Editor (Link > paste the Dashboard Page's URL >
// Open in new tab) - no code needed for the navigation itself. Code here only
// controls VISIBILITY: shown only when the logged-in member's email is in this
// list, so nobody else ever sees it. Add/remove emails here as needed (e.g. your
// own, for testing) - no other code changes needed.
// ⚠️ PLACEHOLDERS - THE LIVE SITE HAS THE REAL ONES.
// Pasting this file as-is HIDES the secretary button from everyone, including
// whoever pasted it. Copy the real addresses out of the live copy first, or
// the shortcut simply disappears and looks like a permissions fault.
//
// Lowercase, because the check lowercases the member's email before comparing.
//
// This is CONVENIENCE, NOT SECURITY: hiding the button does not protect the
// dashboard, and anyone with the URL can still open it. The real gate is
// getManagerContext/assertTeamAccess on the backend, which reads the staff
// record rather than a list of addresses.
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

$w.onReady(async function () {
    // Both collapse first and expand only on a passing check - so a logged-out
    // visitor, or a thrown error below, leaves them hidden. Fail closed.
    if ($w("#btnSecretaryDashboard").id) $w("#btnSecretaryDashboard").collapse();

    // 1. Initial check when page loads
    const isLoggedIn = authentication.loggedIn();

    if (isLoggedIn) {
        runSecureSync();
        updateSecretaryButton();
    }

    // 2. Listener for the exact moment they log in
    authentication.onLogin(() => {
        console.log("Login event detected.");
        runSecureSync();
        updateSecretaryButton();
    });

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