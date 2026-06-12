import wixData from 'wix-data';
import wixWindow from 'wix-window';
import wixLocation from 'wix-location'; 
import { getTeamsExportUrl } from 'backend/exportCsv';

let staffOptions = [];
let ageGroupOptions = [];

$w.onReady(async function () {
    // 1. Initial Data Prep
    await Promise.all([
        loadStaffOptions(),
        loadAgeGroupOptions(),
        loadTeamOptions() 
    ]);
    loadTeamHub();

    // 2. Filter Handlers
    $w("#teamSearch").onChange(() => loadTeamHub());
    $w("#ageGroupFilter").onChange(() => loadTeamHub());

    // 3. Add Team Button (Opens Lightbox)
    $w("#addTeamBtn").onClick(async () => {
        const result = await wixWindow.openLightbox("AddTeamPopup");
        if (result && result.name) {
            const toInsert = { T_teamName: result.name, AG_ageGroup: result.ageGroup };
            try {
                await wixData.insert("Teams", toInsert);
                await loadTeamOptions(); 
                $w("#teamSearch").value = ""; 
                $w("#ageGroupFilter").value = "";
                loadTeamHub(); // Refresh list (Newest appears at top)
            } catch (err) { console.error("Creation failed", err); }
        }
    });

    // 4. Export Button Handler
    $w("#exportTeamsBtn").onClick(async () => {
        $w("#exportTeamsBtn").label = "Generating...";
        try {
            const fileUrl = await getTeamsExportUrl();
            if (fileUrl) {
                // This triggers the download via the Media Manager link
                wixLocation.to(fileUrl);
                $w("#exportTeamsBtn").label = "Export Report";
            } else {
                $w("#exportTeamsBtn").label = "No Data Found";
            }
        } catch (err) {
            console.error("Export Button Error:", err);
            $w("#exportTeamsBtn").label = "Export Failed";
        }
    });
});

// --- DATA FETCHING ---

async function loadStaffOptions() {
    const res = await wixData.query("SignolStaff").ascending("SS_name").limit(1000).find();
    staffOptions = res.items.map(s => ({ label: s.SS_name, value: s._id }));
}

async function loadAgeGroupOptions() {
    const res = await wixData.query("AgeGroup").ascending("AG_ageGroup").find();
    ageGroupOptions = res.items.map(a => ({ label: a.AG_ageGroup, value: a._id }));
    $w("#ageGroupFilter").options = [{ label: "All Age Groups", value: "" }, ...ageGroupOptions];
}

async function loadTeamOptions() {
    const res = await wixData.query("Teams").ascending("T_teamName").limit(1000).find();
    const uniqueTeams = res.items.map(t => ({ label: t.T_teamName, value: t.T_teamName }));
    $w("#teamSearch").options = [{ label: "All Teams", value: "" }, ...uniqueTeams];
}

async function loadTeamHub() {
    const teamFilter = $w("#teamSearch").value;
    const ageFilter = $w("#ageGroupFilter").value;
    let query = wixData.query("Teams");
    if (teamFilter) query = query.eq("T_teamName", teamFilter);
    if (ageFilter) query = query.eq("AG_ageGroup", ageFilter);

    try {
        const results = await query
            .include("T_teamManager", "AG_ageGroup")
            .descending("_createdDate")
            .find();
        $w("#teamRepeater").data = results.items;
    } catch (err) { console.error(err); }
}

// --- REPEATER ITEM LOGIC ---

$w("#teamRepeater").onItemReady(async ($item, itemData) => {
    const today = new Date();

    // Map Inputs
    $item("#teamNameInput").value = itemData.T_teamName || "";
    $item("#divisionInput").value = itemData.leagueDivision || "";
    $item("#leagueSwitch").checked = itemData.leagueRegister || false;
    $item("#managerDrop").options = staffOptions;
    $item("#managerDrop").value = itemData.T_teamManager ? itemData.T_teamManager._id : null;
    $item("#ageGroupDrop").options = ageGroupOptions;
    $item("#ageGroupDrop").value = itemData.AG_ageGroup ? itemData.AG_ageGroup._id : null;

    // Compliance Setup
    const assistRes = await wixData.query("SignolStaff").hasSome("SS_team", [itemData._id]).find();
    let currentManager = itemData.T_teamManager;
    let currentAssistants = assistRes.items.filter(s => s._id !== (currentManager ? currentManager._id : ""));

    const runCompliance = (manager, assistants) => {
        const allStaff = manager ? [manager, ...assistants] : [...assistants];
        const dbsOK = allStaff.every(s => s.dbsExpiry && new Date(s.dbsExpiry) > today);
        const sgOK = allStaff.every(s => s.safeGuardingExpiry && new Date(s.safeGuardingExpiry) > today);
        const coachOK = allStaff.every(s => s.coachingExpiry && new Date(s.coachingExpiry) > today);
        const faOK = allStaff.some(s => s.firstAidExpiry && new Date(s.firstAidExpiry) > today);
        const compliant = dbsOK && sgOK && coachOK && faOK;
        $item("#teamStatusBox").style.backgroundColor = compliant ? "#4CAF50" : "#FF4D4D";
        $item("#teamStatusText").text = compliant ? "FULLY COMPLIANT" : "NON-COMPLIANT";
    };

    runCompliance(currentManager, currentAssistants);
    if (currentManager) updateMemberLights($item, currentManager, "m");

    for (let i = 1; i <= 5; i++) {
        const row = $item(`#assistRow${i}`);
        if (currentAssistants[i - 1]) {
            $item(`#aName${i}`).text = currentAssistants[i - 1].SS_name;
            updateMemberLights($item, currentAssistants[i - 1], "a", i);
            row.show();
        } else { row.hide(); }
    }

    // Player Counts
    const playerRes = await wixData.query("SignolPlayers").eq("SP_team", itemData._id).include("SP_status").find();
    const activePlayers = playerRes.items.filter(p => p.SP_status && p.SP_status.label === "Active");
    const trainOnly = activePlayers.filter(p => p.SP_trainingOnly === true).length;
    $item("#countLabelTrain").text = String(trainOnly);
    $item("#countLabelBoth").text = String(activePlayers.length - trainOnly);

    // Manager Update (Localized)
    $item("#managerDrop").onChange(async (e) => {
        const newId = e.target.value;
        if (!newId) return;
        const teamRec = await wixData.get("Teams", itemData._id);
        teamRec.T_teamManager = newId;
        await wixData.update("Teams", teamRec);
        const freshManager = await wixData.get("SignolStaff", newId);
        updateMemberLights($item, freshManager, "m");
        runCompliance(freshManager, currentAssistants);
    });

    // View Squad
    $item("#viewSquadBtn").onClick(() => {
        wixWindow.openLightbox("SquadViewer", { teamId: itemData._id, teamName: itemData.T_teamName });
    });

    // Auto-Save
    const autoSave = async () => {
        const record = await wixData.get("Teams", itemData._id);
        record.T_teamName = $item("#teamNameInput").value;
        record.leagueDivision = $item("#divisionInput").value;
        record.leagueRegister = $item("#leagueSwitch").checked;
        record.AG_ageGroup = $item("#ageGroupDrop").value;
        await wixData.update("Teams", record);
    };

    $item("#teamNameInput").onBlur(autoSave);
    $item("#divisionInput").onBlur(autoSave);
    $item("#leagueSwitch").onChange(autoSave);
    $item("#ageGroupDrop").onChange(autoSave);

    // Delete
    $item("#deleteBtn").onClick(async () => {
        if ($item("#deleteBtn").label === "Confirm?") {
            await wixData.remove("Teams", itemData._id);
            loadTeamHub(); 
            loadTeamOptions();
        } else {
            $item("#deleteBtn").label = "Confirm?";
            $item("#deleteBtn").style.backgroundColor = "#FF4D4D";
            setTimeout(() => { $item("#deleteBtn").label = "X"; $item("#deleteBtn").style.backgroundColor = ""; }, 4000);
        }
    });
});

function updateMemberLights($scope, member, prefix, num = "") {
    const today = new Date();
    const quals = [{f:"dbsExpiry",s:"Dbs"},{f:"firstAidExpiry",s:"Fa"},{f:"safeGuardingExpiry",s:"Sg"},{f:"coachingExpiry",s:"Coach"}];
    quals.forEach(q => {
        const el = $scope(`#${prefix}${q.s}${num}`);
        if (el && el.style) {
            const exp = member[q.f] ? new Date(member[q.f]) : null;
            el.style.backgroundColor = (exp && exp > today) ? "#4CAF50" : "#FF4D4D";
        }
    });
}