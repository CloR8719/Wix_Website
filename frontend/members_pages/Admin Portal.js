import wixData from 'wix-data';
import { currentMember } from 'wix-members-frontend';

// Your Verified Access IDs (Verified IDs from SiteAccess CMS)
const ACCESS_ADMIN = "2561a0f5-4625-40f4-a7f2-b87bc1544f88";
const ACCESS_TEAM = "ee493b02-d68b-43ca-9abd-0a691346480d";
const ACCESS_LIMITED = "fa8f8d97-52cc-4465-a4f6-cb96c10edce2";

$w.onReady(async function () {
    // 1. Get the current member
    const member = await currentMember.getMember();
    
    if (!member) {
        $w("#teamadmin").collapse();
        return;
    }

    // 2. Look up the staff record
    // .include("accessLevel") tells Wix to fetch the referenced SiteAccess data
    const results = await wixData.query("SignolStaff")
        .eq("memberId", member._id)
        .include("accessLevel") 
        .find();

    if (results.items.length > 0) {
        const staffMember = results.items[0];
        
        // 3. Extract the ID from the reference field
        // This handles cases where Wix returns an object OR just the ID string
        let levelId = "";
        if (staffMember.accessLevel && staffMember.accessLevel._id) {
            levelId = staffMember.accessLevel._id;
        } else {
            levelId = staffMember.accessLevel;
        }

        console.log("Current Member Level ID:", levelId);

        // 4. Apply the Button Logic
        if (levelId === ACCESS_LIMITED) {
            $w("#teamadmin").collapse();
            console.log("Status: Limited Staff. Team Admin button hidden.");
        } else {
            // This covers both Admin and Team managers
            $w("#teamadmin").expand();
            console.log("Status: Admin/Manager. All buttons visible.");
        }
    } else {
        $w("#teamadmin").collapse();
        console.log("Member ID not found in SignolStaff CMS.");
    }
});