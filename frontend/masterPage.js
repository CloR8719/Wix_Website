import { authentication, currentMember } from 'wix-members-frontend';
import { linkMemberToStaff } from 'backend/staffData';

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