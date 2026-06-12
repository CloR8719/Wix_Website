import wixData from 'wix-data';
import { currentMember } from 'wix-members-frontend';

let selectedTeamId = "";
let currentEditId = ""; 
let activeTab = "Stats"; 

$w.onReady(async function () {
    const defaultSeason = getAutoSeason();
    if ($w("#ddnSeason")) $w("#ddnSeason").value = defaultSeason;

    const member = await currentMember.getMember();
    if (!member) return;

    // 1. Initial Load & Team Fetch
    try {
        const staffRecord = await wixData.query("SignolStaff")
            .eq("memberId", member._id)
            .include("SS_team") 
            .find();

        if (staffRecord.items.length > 0) {
            const myTeams = staffRecord.items[0].SS_team;
            let options = Array.isArray(myTeams) ? 
                myTeams.map(t => ({ "label": t.T_teamName, "value": t._id })) : 
                [{ "label": myTeams.T_teamName, "value": myTeams._id }];

            $w("#ddnTeam").options = options;
            selectedTeamId = options[0].value;
            $w("#ddnTeam").value = selectedTeamId;
            refreshTables();
        }
    } catch (err) { console.error("Init Error:", err); }

    // 2. Tab Switching Logic (Radio Group / Tabs)
    $w("#tabSwitch").onChange(() => {
        if ($w("#tabSwitch").value === "Stats") {
            activeTab = "Stats";
            $w("#statsGroup").expand();
            $w("#potmGroup").collapse();
        } else {
            activeTab = "POTM";
            $w("#potmGroup").expand();
            $w("#statsGroup").collapse();
        }
        resetEditors();
        refreshTables();
    });

    // 3. Filter Listeners
    $w("#ddnTeam").onChange(() => { selectedTeamId = $w("#ddnTeam").value; refreshTables(); });
    $w("#ddnSeason").onChange(() => refreshTables());

    // 4. PLAYER STATS SELECTION
    $w("#statsTable").onRowSelect((event) => {
        const data = event.rowData;
        currentEditId = data._id;
        
        $w("#inputEditName").value = data.PS_playerName || "";
        $w("#inputEditGoals").value = (data.goals || 0).toString();
        $w("#inputEditAssists").value = (data.assists || 0).toString();
        $w("#inputEditTackles").value = (data.tackles || 0).toString();
        $w("#inputEditSaves").value = (data.saves || 0).toString();
        
        $w("#editPanel").expand();
    });

    // 5. POTM SELECTION (With Photo Object Fix)
    $w("#potmTable").onRowSelect((event) => {
        const data = event.rowData;
        currentEditId = data._id;
        
        $w("#poeditname").value = data.PO_playerName || "";
        $w("#poeditReason").value = data.PO_reason || ""; 
        
        // Handle Photo Preview (Object to String Fix)
        if ($w("#imgPrev")) {
            let photoData = data.PO_playerPhoto;
            if (photoData && typeof photoData === 'object' && photoData.uri) {
                // Construct the Wix URL from the object
                $w("#imgPrev").src = `wix:image://v1/${photoData.uri}/${photoData.name}#originWidth=${photoData.width}&originHeight=${photoData.height}`;
            } else if (typeof photoData === 'string') {
                $w("#imgPrev").src = photoData;
            } else {
                $w("#imgPrev").src = "https://static.wixstatic.com/media/c837a6_60d3d3c75f1b4021966a34796684784a~mv2.png"; 
            }
        }

        $w("#poEdit").expand();
    });

    // 6. SAVE BUTTON ACTIONS
    $w("#btnSaveEdit").onClick(() => saveStatsUpdate());
    $w("#poeditSave").onClick(() => savePotmUpdate());
});

async function refreshTables() {
    const season = $w("#ddnSeason").value;
    if (!selectedTeamId) return;

    try {
        if (activeTab === "Stats") {
            const res = await wixData.query("PlayerStats")
                .eq("PS_teamName", selectedTeamId)
                .eq("seasonLabel", season)
                .descending("_createdDate")
                .limit(1000) 
                .find();
            $w("#statsTable").rows = res.items;
        } else {
            const res = await wixData.query("Playerofthematch")
                .eq("PO_teamName", selectedTeamId)
                .eq("seasonLabel", season)
                .descending("_createdDate")
                .limit(1000)
                .find();

            // Clean <p> tags for the POTM table view
            const cleanedRows = res.items.map(item => {
                return {
                    ...item,
                    PO_reason: item.PO_reason ? item.PO_reason.replace(/<[^>]*>?/gm, '') : ""
                };
            });
            $w("#potmTable").rows = cleanedRows;
        }
    } catch (err) { console.error("Refresh Error:", err); }
}

async function saveStatsUpdate() {
    try {
        let item = await wixData.get("PlayerStats", currentEditId);
        item.PS_playerName = $w("#inputEditName").value;
        item.goals = Number($w("#inputEditGoals").value);
        item.assists = Number($w("#inputEditAssists").value);
        item.tackles = Number($w("#inputEditTackles").value);
        item.saves = Number($w("#inputEditSaves").value);

        await wixData.update("PlayerStats", item);
        $w("#editPanel").collapse();
        refreshTables();
    } catch (err) { console.error("Stats Save Error", err); }
}

async function savePotmUpdate() {
    try {
        let item = await wixData.get("Playerofthematch", currentEditId);
        item.PO_playerName = $w("#poeditname").value;
        item.PO_reason = $w("#poeditReason").value;

        // Photo Upload handling
        if ($w("#poeditphoto").value.length > 0) { 
            const uploadedFile = await $w("#poeditphoto").uploadFiles();
            item.PO_playerPhoto = uploadedFile[0].fileUrl;
        }

        await wixData.update("Playerofthematch", item);
        $w("#poEdit").collapse();
        refreshTables();
    } catch (err) { console.error("POTM Save Error", err); }
}

function resetEditors() {
    if ($w("#editPanel")) $w("#editPanel").collapse();
    if ($w("#poEdit")) $w("#poEdit").collapse();
}

function getAutoSeason() {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    return (month >= 8) ? `${year}/${(year + 1).toString().slice(-2)}` : `${year - 1}/${year.toString().slice(-2)}`;
}