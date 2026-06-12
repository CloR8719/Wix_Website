import wixData from 'wix-data';
import { currentMember } from 'wix-members-frontend';

// --- GLOBAL SETTINGS (For the Bulk Sheet) ---
let matchData = [{ _id: "1" }]; 

$w.onReady(async function () {

    // --- 0. RADIO TOGGLE LOGIC ---
    $w("#statsselect").onChange((event) => {
        const selectedValue = event.target.value;

        // Collapse all 3 main containers
        $w("#POTM").collapse();
        $w("#player").collapse();
        $w("#team").collapse();

        // Expand the selected one
        if (selectedValue === "potm") {
            $w("#POTM").expand();
        } else if (selectedValue === "player") {
            $w("#player").expand();
        } else if (selectedValue === "teamstats") {
            $w("#team").expand();
        }
    });

    // --- 1. LOAD TEAMS & AUTO-SELECT MEMBER'S TEAM ---
    try {
        // Fetch all teams for the dropdown lists
        const teamData = await wixData.query("Teams").ascending("T_teamName").find();
        const teamOptions = teamData.items.map(team => ({
            "label": team.T_teamName, 
            "value": team._id 
        }));

        $w("#potmTeam").options = teamOptions;
        $w("#ddnTeam").options = teamOptions;
        $w("#tsTeam").options = teamOptions; 

        // Now, check if a member is logged in to pre-populate
        const member = await currentMember.getMember();
        if (member) {
            const staffRecord = await wixData.query("SignolStaff")
                .eq("memberId", member._id)
                .include("SS_team") // Assuming SS_team links to the Teams collection
                .find();

            if (staffRecord.items.length > 0) {
                const myTeamData = staffRecord.items[0].SS_team;
                let myTeamId = "";

                // Handle if SS_team is an array or a single object
                if (Array.isArray(myTeamData) && myTeamData.length > 0) {
                    myTeamId = myTeamData[0]._id;
                } else if (myTeamData) {
                    myTeamId = myTeamData._id;
                }

                // If we found a team ID, pre-select it in all three dropdowns
                if (myTeamId) {
                    $w("#potmTeam").value = myTeamId;
                    $w("#ddnTeam").value = myTeamId;
                    $w("#tsTeam").value = myTeamId;
                }
            }
        }
    } catch (err) {
        console.error("Setup failed", err);
    }

    // --- 2. PLAYER OF THE MATCH FORM ---
    $w("#potmSubmit").onClick(async () => {
        const teamId = $w("#potmTeam").value; 
        if (!teamId) return $w("#potmSubmit").label = "Select Team!";
        $w("#potmSubmit").label = "Saving...";

        try {
            let imageUrl = "";
            if ($w("#potmimage").value.length > 0) {
                const uploadedFiles = await $w("#potmimage").uploadFiles();
                imageUrl = uploadedFiles[0].fileUrl;
            }

            await wixData.insert("Playerofthematch", {
                "PO_teamName": teamId, 
                "PO_playerName": $w("#potmplayername").value,
                "PO_reason": $w("#potmReason").value,
                "PO_playerPhoto": imageUrl,
                "seasonLabel": getAutoSeason()
            });

            $w("#potmSubmit").label = "POTM Saved! ✓";
            resetPotmForm();
        } catch (err) {
            $w("#potmSubmit").label = "Error!";
        }
    });

    // --- 3. TEAM STATS FORM ---
    $w("#tsSubmit").onClick(async () => {
        const teamId = $w("#tsTeam").value;
        if (!teamId) return $w("#tsSubmit").label = "Select Team!";
        
        $w("#tsSubmit").label = "Saving...";

        try {
            await wixData.insert("TeamStats", {
                "TS_teamName": teamId,
                "result": $w("#result").value,
                "TS_goalsFor": Number($w("#goalsfor").value) || 0,
                "TS_goalsAgainst": Number($w("#goesagainst").value) || 0,
                "seasonLabel": getAutoSeason()
            });

            $w("#tsSubmit").label = "Match Saved! ✓";
            resetTeamStatsForm();
        } catch (err) {
            console.error("TeamStats Error:", err);
            $w("#tsSubmit").label = "Error!";
        }
    });

    // --- 4. BULK PLAYER STATS SHEET ---
    $w("#statRepeater").data = matchData;

    $w("#btnAddRow").onClick(() => {
        matchData.push({ _id: Math.random().toString() });
        $w("#statRepeater").data = matchData;
    });

    $w("#statRepeater").onItemReady(($item, itemData) => {
        $item("#btnRemoveRow").onClick(() => {
            if (matchData.length > 1) {
                matchData = matchData.filter(item => item._id !== itemData._id);
                $w("#statRepeater").data = matchData;
            }
        });
    });

    $w("#btnSubmitStats").onClick(async () => {
        const teamId = $w("#ddnTeam").value;
        if (!teamId) return $w("#btnSubmitStats").label = "Select Team!";

        $w("#btnSubmitStats").label = "Saving...";
        let entries = [];

        $w("#statRepeater").forEachItem(($item) => {
            const name = $item("#inputName").value;
            if (name) {
                entries.push({
                    "PS_playerName": name.trim(),
                    "PS_teamName": teamId,
                    "seasonLabel": getAutoSeason(),
                    "goals": Number($item("#inputGoals").value) || 0,
                    "assists": Number($item("#inputAssists").value) || 0,
                    "tackles": Number($item("#inputTackles").value) || 0,
                    "saves": Number($item("#inputSaves").value) || 0
                });
            }
        });

        if (entries.length > 0) {
            try {
                await wixData.bulkInsert("PlayerStats", entries);
                $w("#btnSubmitStats").label = "Stats Saved! ✓";
                resetBulkSheet();
            } catch (err) {
                $w("#btnSubmitStats").label = "Error!";
            }
        }
    });
});

// --- HELPERS ---

function getAutoSeason() {
    const now = new Date();
    const month = now.getMonth(); 
    const year = now.getFullYear();
    return (month >= 8) ? `${year}/${(year + 1).toString().slice(-2)}` : `${year - 1}/${year.toString().slice(-2)}`;
}

function resetPotmForm() {
    $w("#potmplayername").value = "";
    $w("#potmReason").value = "";
    $w("#potmimage").reset();
    setTimeout(() => { $w("#potmSubmit").label = "Submit POTM"; }, 2000);
}

function resetTeamStatsForm() {
    $w("#result").value = "";
    $w("#goalsfor").value = "";
    $w("#goesagainst").value = "";
    setTimeout(() => { $w("#tsSubmit").label = "Submit Team Result"; }, 2000);
}

function resetBulkSheet() {
    $w("#statRepeater").forEachItem(($item) => {
        $item("#inputName").value = "";
        $item("#inputGoals").value = null;
        $item("#inputAssists").value = null;
        $item("#inputTackles").value = null;
        $item("#inputSaves").value = null;
    });
    matchData = [{ _id: "1" }];
    $w("#statRepeater").data = [];
    setTimeout(() => {
        $w("#statRepeater").data = matchData;
        $w("#btnSubmitStats").label = "Submit All Stats";
    }, 50);
}