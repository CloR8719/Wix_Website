import wixData from 'wix-data';
import { currentMember } from 'wix-members-frontend';

let selectedTeamId = ""; 

$w.onReady(async function () {
    const defaultSeason = getAutoSeason();
    if ($w("#ddnSeason")) $w("#ddnSeason").value = defaultSeason;

    // --- RADIO BUTTON TOGGLE LOGIC ---
    $w("#statsselect").onChange((event) => {
        const selectedValue = event.target.value;

        // First, collapse everything to "reset" the view
        $w("#teamstats").collapse();
        $w("#golden").collapse();
        $w("#wall").collapse();
        $w("#potm").collapse();

        // Then, expand only the selected one
        if (selectedValue === "teamstats") {
            $w("#teamstats").expand();
        } else if (selectedValue === "golden") {
            $w("#golden").expand();
        } else if (selectedValue === "wall") {
            $w("#wall").expand();
        } else if (selectedValue === "potm") {
            $w("#potm").expand();
        }
    });

    const member = await currentMember.getMember();
    if (!member) return;

    try {
        const staffRecord = await wixData.query("SignolStaff")
            .eq("memberId", member._id)
            .include("SS_team") 
            .find();

        if (staffRecord.items.length > 0) {
            const myTeams = staffRecord.items[0].SS_team;
            let teamOptions = [];
            
            if (Array.isArray(myTeams)) {
                teamOptions = myTeams.map(t => ({ "label": t.T_teamName, "value": t._id }));
            } else if (myTeams) {
                teamOptions = [{ "label": myTeams.T_teamName, "value": myTeams._id }];
            }

            $w("#ddnTeam").options = teamOptions;

            if (teamOptions.length > 0) {
                selectedTeamId = teamOptions[0].value;
                $w("#ddnTeam").value = selectedTeamId;
                loadDashboard(selectedTeamId, defaultSeason);
            }
        }
    } catch (err) {
        console.error("Dashboard Init Error:", err);
    }

    $w("#ddnTeam").onChange(() => {
        selectedTeamId = $w("#ddnTeam").value;
        loadDashboard(selectedTeamId, $w("#ddnSeason").value);
    });

    $w("#ddnSeason").onChange(() => {
        loadDashboard(selectedTeamId, $w("#ddnSeason").value);
    });
});

async function loadDashboard(teamId, season) {
    if (!teamId || !season) return;

    try {
        const [teamRes, playerRes, potmRes] = await Promise.all([
            wixData.query("TeamStats")
                .eq("TS_teamName", teamId)
                .eq("seasonLabel", season)
                .descending("_createdDate")
                .limit(1000)
                .find(),
            wixData.query("PlayerStats")
                .eq("PS_teamName", teamId)
                .eq("seasonLabel", season)
                .limit(1000)
                .find(),
            wixData.query("Playerofthematch")
                .eq("PO_teamName", teamId)
                .eq("seasonLabel", season)
                .include("PO_teamName")
                .limit(1000)
                .find()
        ]);

        processTeamScorecard(teamRes.items);
        processLeaderboards(playerRes.items);
        processPotmAwards(potmRes.items, teamId);
        processFormGuide(teamRes.items); 

    } catch (err) {
        console.error("Data Fetch Error:", err);
    }
}

function processTeamScorecard(matches) {
    let gf = 0, ga = 0, w = 0, l = 0, d = 0;
    matches.forEach(m => {
        gf += (Number(m.TS_goalsFor) || 0);
        ga += (Number(m.TS_goalsAgainst) || 0);
        if (m.result === "Win") w++;
        else if (m.result === "Lose") l++; 
        else if (m.result === "Draw") d++;
    });

    if ($w("#txtWins")) $w("#txtWins").text = w.toString();
    if ($w("#txtLosses")) $w("#txtLosses").text = l.toString();
    if ($w("#txtDraws")) $w("#txtDraws").text = d.toString();
    if ($w("#txtGF")) $w("#txtGF").text = gf.toString();
    if ($w("#txtGA")) $w("#txtGA").text = ga.toString();
    if ($w("#txtGD")) $w("#txtGD").text = (gf - ga).toString();
}

function processFormGuide(matches) {
    if (!$w("#formRepeater")) return;
    const lastFive = matches.slice(0, 5).reverse();
    $w("#formRepeater").data = lastFive;
    $w("#formRepeater").onItemReady(($item, itemData) => {
        const res = itemData.result; 
        const circle = $item("#formCircle");
        const letter = $item("#txtFormLetter");
        if (letter) letter.text = res ? res.charAt(0) : "-";
        if (circle) {
            if (res === "Win") circle.style.backgroundColor = "#2ecc71";
            else if (res === "Lose") circle.style.backgroundColor = "#e74c3c";
            else if (res === "Draw") circle.style.backgroundColor = "#f1c40f";
            else circle.style.backgroundColor = "#D3D3D3";
        }
    });
}

function processLeaderboards(stats) {
    let playerMap = {};
    stats.forEach(s => {
        const name = s.PS_playerName ? s.PS_playerName.trim() : "Unknown";
        if (!playerMap[name]) {
            const cleanId = name.replace(/[^A-Z0-9]/ig, "-") + "-" + Math.random().toString(36).substr(2, 5);
            playerMap[name] = { _id: cleanId, name: name, goals: 0, assists: 0, tackles: 0, saves: 0 };
        }
        playerMap[name].goals += (Number(s.goals) || 0);
        playerMap[name].assists += (Number(s.assists) || 0);
        playerMap[name].tackles += (Number(s.tackles) || 0);
        playerMap[name].saves += (Number(s.saves) || 0);
    });

    const allPlayers = Object.values(playerMap);

    if ($w("#goalsRepeater")) {
        $w("#goalsRepeater").data = [...allPlayers].sort((a, b) => (b.goals + b.assists) - (a.goals + a.assists));
        $w("#goalsRepeater").onItemReady(($item, itemData) => {
            if ($item("#gName")) $item("#gName").text = itemData.name;
            if ($item("#goals")) $item("#goals").text = itemData.goals.toString();
            if ($item("#assist")) $item("#assist").text = itemData.assists.toString();
        });
    }

    if ($w("#defensiveRepeater")) {
        $w("#defensiveRepeater").data = [...allPlayers].sort((a, b) => (b.tackles + b.saves) - (a.tackles + a.saves));
        $w("#defensiveRepeater").onItemReady(($item, itemData) => {
            if ($item("#dName")) $item("#dName").text = itemData.name;
            if ($item("#tackle")) $item("#tackle").text = itemData.tackles.toString();
            if ($item("#save")) $item("#save").text = itemData.saves.toString();
        });
    }
}

function processPotmAwards(awards, currentTeamId) {
    if (!$w("#potmRepeater")) return;
    let potmMap = {};
    const filteredAwards = awards.filter(a => (a.PO_teamName?._id || a.PO_teamName) === currentTeamId);
    if (filteredAwards.length === 0) {
        $w("#potmRepeater").data = [];
        return;
    }
    filteredAwards.forEach(a => {
        const name = a.PO_playerName ? a.PO_playerName.trim() : "Unknown";
        if (!potmMap[name]) {
            const cleanId = name.replace(/[^A-Z0-9]/ig, "-") + "-potm-" + Math.random().toString(36).substr(2, 5);
            potmMap[name] = { _id: cleanId, name: name, count: 0 };
        }
        potmMap[name].count++;
    });
    const sortedPotm = Object.values(potmMap).sort((a, b) => b.count - a.count);
    $w("#potmRepeater").data = sortedPotm;
    $w("#potmRepeater").onItemReady(($item, itemData) => {
        if ($item("#potmName")) $item("#potmName").text = itemData.name;
        if ($item("#potmCount")) $item("#potmCount").text = itemData.count.toString();
    });
}

function getAutoSeason() {
    const now = new Date();
    const month = now.getMonth(); 
    const year = now.getFullYear();
    return (month >= 8) ? `${year}/${(year + 1).toString().slice(-2)}` : `${year - 1}/${year.toString().slice(-2)}`;
}