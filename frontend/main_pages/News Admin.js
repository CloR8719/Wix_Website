import wixData from 'wix-data';
import { currentMember } from 'wix-members-frontend';

$w.onReady(async function () {

    // 1. SETUP DROPDOWNS
    $w("#typeDropdown").options = [
        { "label": "Match Report", "value": "Match Report" },
        { "label": "Team News", "value": "Team News" },
        { "label": "Social Event", "value": "Social Event" },
        { "label": "Club Notice", "value": "Club Notice" },
        { "label": "Charity Event", "value": "Charity Event" },
    ];

    // 2. LOAD ALL TEAMS & AUTO-SELECT MANAGER'S TEAM
    try {
        const teamsResult = await wixData.query("Teams").ascending("T_teamName").find();
        const teamOptions = teamsResult.items.map(t => ({ "label": t.T_teamName, "value": t._id }));
        $w("#teamDropdown").options = teamOptions;

        const member = await currentMember.getMember();
        if (member) {
            // Using SS_team to match your staff collection
            const staffRecord = await wixData.query("SignolStaff")
                .eq("memberId", member._id)
                .include("SS_team") 
                .find();

            if (staffRecord.items.length > 0) {
                const staff = staffRecord.items[0];
                // Checks SS_team first, then falls back to 'team' field
                const myTeamId = staff.SS_team ? staff.SS_team._id : staff.team;
                if (myTeamId) $w("#teamDropdown").value = myTeamId;
            }
        }
    } catch (err) { console.error("Initialization Error:", err); }

    // 3. THE SUBMIT BUTTON (Direct-to-CMS Method)
    $w("#btnAddNews").onClick(async () => {
        $w("#btnAddNews").label = "Uploading...";
        $w("#btnAddNews").disable();

        // Prepare the 60-day Expiry Date Object
        let dateObj = new Date();
        dateObj.setDate(dateObj.getDate() + 60);
        dateObj.setHours(0, 0, 0, 0); 

        // Construct the record manually based on your exact Field Keys
        const newsData = {
            "headline": $w("#headlineInput").value,
            "articleBody": $w("#articleBodyInput").value,
            "type": $w("#typeDropdown").value,
            "team": $w("#teamDropdown").value,
            "posted": false,
            "expire": dateObj // Pure Date object to kill the yellow triangle
        };

        try {
            // Speak directly to the database to bypass Dataset formatting
            await wixData.insert("ClubNews", newsData);
            
            $w("#btnAddNews").label = "Submitted!";
            
            // Clear the text inputs
            $w("#headlineInput").value = "";
            $w("#articleBodyInput").value = "";

            setTimeout(() => {
                $w("#btnAddNews").label = "Submit News";
                $w("#btnAddNews").enable();
            }, 2000);

        } catch (err) {
            $w("#btnAddNews").label = "Error - Try again";
            $w("#btnAddNews").enable();
            console.error("Direct Insert Failed:", err);
        }
    });
});