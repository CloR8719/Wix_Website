// ==========================================
// IMPORTS & GLOBAL VARIABLES
// ==========================================
import { currentMember } from 'wix-members-frontend';
import wixData from 'wix-data';
import wixWindow from 'wix-window';
import wixLocationFrontend from 'wix-location-frontend';
import { createBlogPost } from 'backend/blog.jsw';

// --- CLUB SETTINGS ---
const JOIN_URL = "https://www.signolathleticjfc.co.uk/playerenquiry";

// --- DICTIONARY STATUS IDs ---
const ENQUIRY_STATUS_ID = "e4c79abb-e591-44c3-98a9-e111f276bdd2";
const TRIAL_STATUS_ID = "5f21b19d-878a-4042-a8ec-c1c0a66812b9";
const LEFT_STATUS_ID = "d78cb8b0-3b3b-4439-b889-fd36dc434781";
const INVITED_STATUS_ID = "184b5a98-37c8-41a6-bc58-5a1c17827f04";
const READY_FOR_FA_ID = "95978c83-70fc-4bd7-bd75-12f43216a0d7";
const DRAFT_STATUS_ID = "ad6fe8f3-c82e-45ae-b688-89d53c3f0a9f";
const FA_COMPLETE_ID = "af2bef8c-1caa-4bf8-8dce-321d19723741";
const Active_ID = "705c0b66-d5d5-47b6-b828-98a94c670f1f";
const RENEWAL_STATUS_ID = "4d354c43-c893-4bc8-8415-18cfc32b3236";
// ⚠️ SETUP: paste the ClubDictionary "Action Required" _id here (same GUID as backend).
const ACTION_REQUIRED_ID = "d5bd1c0f-e19e-4318-a8d3-d5d6fe63b274";

const STATUS_SORT_ORDER = {
    [INVITED_STATUS_ID]: 1,
    [ACTION_REQUIRED_ID]: 2,
    [RENEWAL_STATUS_ID]: 3,
    [READY_FOR_FA_ID]: 4,
    [FA_COMPLETE_ID]: 5,
    [Active_ID]: 6
};

// --- STAFF ACCESS LEVELS ---
const ACCESS_ADMIN = "2561a0f5-4625-40f4-a7f2-b87bc1544f88";
const ACCESS_TEAM = "ee493b02-d68b-43ca-9abd-0a691346480d";

// ==========================================
// SHARED MANAGER CONTEXT (loaded once on entry)
// ==========================================
let managerContext = {
    memberId: null,
    staffId: null,
    staffRecord: null,
    teams: [],          // [{_id, T_teamName, AG_ageGroup}, ...]
    primaryTeamId: null,
    primaryAgeGroupId: null,
    accessLevel: null
};

let clubDictionaryMap = {};
let leaveReasonOptions = [];

// --- SQUAD STATE LOCALS ---
let squadActiveTeamId = "";
let squadActiveAgeGroupId = "";

// --- TEAM PROFILE STATE LOCALS ---
let selectedTeamProfileId = "";
let teamProfileEditIndex = 0;

// --- STAFF PROFILE STATE LOCALS ---
let selectedStaffProfileId = "";

// --- STATS STATE LOCALS ---
let statsSelectedTeamId = "";
let statsSelectedSeason = "";
let statsCurrentEditId = "";
let statsAddActiveTab = "teamstats";
let statsSquadPlayerOptions = [];
let editRecordsActiveTab = "Stats";
let bulkStatsRows = [{ _id: "1" }];

// ==========================================
// INITIALIZATION
// ==========================================
$w.onReady(async function () {
    try {
        const member = await currentMember.getMember();
        if (!member) return wixLocationFrontend.to("/");

        managerContext.memberId = member._id;

        const staffRes = await wixData.query("SignolStaff")
            .eq("memberId", member._id)
            .include("SS_team", "accessLevel", "SS_role", "SS_Qualifications")
            .find();

        if (staffRes.items.length === 0) {
            console.error("No SignolStaff record linked to this member.");
            $w("#textWelcome").text = "Welcome";
            return;
        }

        const staff = staffRes.items[0];
        managerContext.staffId = staff._id;
        managerContext.staffRecord = staff;
        managerContext.accessLevel = staff.accessLevel?._id || staff.accessLevel || null;

        const teamsRaw = staff.SS_team;
        managerContext.teams = Array.isArray(teamsRaw) ? teamsRaw : (teamsRaw ? [teamsRaw] : []);

        if (managerContext.teams.length > 0) {
            managerContext.primaryTeamId = managerContext.teams[0]._id;
            managerContext.primaryAgeGroupId = managerContext.teams[0].AG_ageGroup?._id || managerContext.teams[0].AG_ageGroup;
        }

        const rawName = staff.SS_name || "Manager";
        $w("#textWelcome").text = `Welcome back,\n${rawName.charAt(0).toUpperCase() + rawName.slice(1)}`;

        await loadClubDictionary();
        await loadSeasonOptions();
        setupNavigation();

        await loadDashboard();

    } catch (err) {
        console.error("Manager Hub init failed:", err);
    }
});

// ==========================================
// NAVIGATION
// ==========================================
function setupNavigation() {
    const navMap = {
        "#btnNavSquad": { state: "stateSquad", loader: () => loadSquadState() },
        "#btnNavTeamProfile": { state: "stateTeamProfile", loader: loadTeamProfileState },
        "#btnNavStats": { state: "stateStats", loader: loadStatsState },
        "#btnNavStaff": { state: "stateStaffProfile", loader: loadStaffProfileState },
        "#btnNavSponsors": { state: "stateSponsors", loader: loadSponsorsState },
        "#btnNavNews": { state: "stateNews", loader: loadNewsState },
        "#btnNavStatsAdd": { state: "stateStatsAdd", loader: loadStatsAddState },
        "#btnNavStatsEdit": { state: "stateStatEdit", loader: loadStatsEditState }
    };

    Object.entries(navMap).forEach(([btnId, cfg]) => {
        if ($w(btnId)) {
            $w(btnId).onClick(async () => {
                await cfg.loader();
                $w("#stateboxHub").changeState(cfg.state);
            });
        }
    });

    // Back-to-dashboard buttons - one per state, all return via the same handler
    ["#btnBackToHubSquad", "#btnBackToHubTeamProfile", "#btnBackToHubStats",
     "#btnBackToHubStaff", "#btnBackToHubSponsors", "#btnBackToHubNews"].forEach(btnId => {
        if ($w(btnId)) {
            $w(btnId).onClick(async () => {
                await loadDashboard();
                $w("#stateboxHub").changeState("stateDashboard");
            });
        }
    });

    // Back-to-stats buttons - Stats Add / Stats Edit return to the Stats overview
    ["#btnBackToStatsAdd", "#btnBackToStatsEdit"].forEach(btnId => {
        if ($w(btnId)) {
            $w(btnId).onClick(async () => {
                await loadStatsState();
                $w("#stateboxHub").changeState("stateStats");
            });
        }
    });
}

// ==========================================
// SHARED DICTIONARY LOADERS
// ==========================================
async function loadClubDictionary() {
    try {
        const dictResults = await wixData.query("ClubDictionary").limit(1000).find();
        dictResults.items.forEach(item => {
            clubDictionaryMap[item._id] = item.title || item.label;
        });
        leaveReasonOptions = dictResults.items
            .filter(item => item.category === "leave_reason")
            .map(item => ({ label: item.label, value: item.label }));
    } catch (err) {
        console.error("Failed to load club dictionary:", err);
    }
}

async function loadSeasonOptions() {
    try {
        const dictResults = await wixData.query("ClubDictionary")
            .eq("category", "season")
            .ascending("order")
            .find();

        if (dictResults.items.length > 0) {
            const seasonOptions = dictResults.items.map(item => ({
                label: item.title || item.label,
                value: item.title || item.label
            }));

            if ($w("#statsSeasonDropdown")) {
                $w("#statsSeasonDropdown").options = seasonOptions;
            }
            if ($w("#editStatsSeasonDropdown")) {
                $w("#editStatsSeasonDropdown").options = seasonOptions;
            }
            if ($w("#potmSeasonDropdown")) {
                $w("#potmSeasonDropdown").options = seasonOptions;
            }
            if ($w("#tsSeasonDropdown")) {
                $w("#tsSeasonDropdown").options = seasonOptions;
            }
            if ($w("#bulkSeasonDropdown")) {
                $w("#bulkSeasonDropdown").options = seasonOptions;
            }

            if (!statsSelectedSeason) {
                statsSelectedSeason = seasonOptions[seasonOptions.length - 1].value;
            }
        }
    } catch (err) {
        console.error("Failed to load season options:", err);
    }
}

// ==========================================
// STATE 1: DASHBOARD (landing / launcher)
// ==========================================
async function loadDashboard() {
    try {
        if (managerContext.teams.length === 0) {
            if ($w("#textNoTeam")) $w("#textNoTeam").expand();
            if ($w("#repeaterMyTeams")) $w("#repeaterMyTeams").collapse();
            return;
        }
        if ($w("#textNoTeam")) $w("#textNoTeam").collapse();

        const teamSummaries = await Promise.all(managerContext.teams.map(async (team) => {
            const teamId = team._id;
            const ageGroupId = team.AG_ageGroup?._id || team.AG_ageGroup;

            const [squadRes, enquiryRes, trialRes] = await Promise.all([
                wixData.query("SignolPlayers").eq("SP_team", teamId).ne("SP_status", LEFT_STATUS_ID).find(),
                ageGroupId
                    ? wixData.query("SignolPlayers").eq("ageGroup", ageGroupId).eq("SP_status", ENQUIRY_STATUS_ID).find()
                    : Promise.resolve({ items: [] }),
                wixData.query("SignolPlayers").eq("SP_team", teamId).eq("SP_status", TRIAL_STATUS_ID).find()
            ]);

            const squad = squadRes.items.filter(p => p.SP_status !== TRIAL_STATUS_ID && p.SP_status !== ENQUIRY_STATUS_ID);
            const invitedCount = squad.filter(p => p.SP_status === INVITED_STATUS_ID).length;
            const renewalCount = squad.filter(p => p.SP_status === RENEWAL_STATUS_ID).length;
            const draftCount = squad.filter(p => p.SP_status === DRAFT_STATUS_ID).length;
            // All three are parent-side actions the manager may need to chase up.
            const actionNeeded = invitedCount + renewalCount + draftCount;

            return {
                _id: teamId,
                teamName: team.T_teamName,
                squadCount: squad.length,
                enquiryCount: enquiryRes.items.length,
                trialCount: trialRes.items.length,
                actionNeeded,
                invitedCount,
                renewalCount,
                draftCount
            };
        }));

        $w("#repeaterMyTeams").data = teamSummaries;
        $w("#repeaterMyTeams").expand();

    } catch (err) {
        console.error("Failed to load manager dashboard:", err);
    }
}

$w("#repeaterMyTeams").onItemReady(($item, itemData) => {
    $item("#txtTeamName").text = itemData.teamName;
    $item("#txtSquadCount").text = `Squad: ${itemData.squadCount}`;
    $item("#txtPipelineCount").text = `Enquiries: ${itemData.enquiryCount}  |  Trials: ${itemData.trialCount}`;

    if (itemData.actionNeeded > 0) {
        const reasons = [];
        if (itemData.invitedCount > 0) reasons.push(`${itemData.invitedCount} registration form${itemData.invitedCount > 1 ? "s" : ""} being completed by parent(s)`);
        if (itemData.draftCount > 0) reasons.push(`${itemData.draftCount} registration${itemData.draftCount > 1 ? "s" : ""} complete but not submitted`);
        if (itemData.renewalCount > 0) reasons.push(`${itemData.renewalCount} renewal${itemData.renewalCount > 1 ? "s" : ""} still with parent(s)`);

        $item("#txtActionAlert").text = `⚠️ ${reasons.join(", ")} - tap to follow up`;
        $item("#txtActionAlert").expand();
        $item("#txtActionAlert").onClick(async () => {
            await loadSquadState(itemData._id);
            $w("#stateboxHub").changeState("stateSquad");
        });
    } else {
        $item("#txtActionAlert").collapse();
    }

    $item("#btnManageSquad").onClick(async () => {
        await loadSquadState(itemData._id);
        $w("#stateboxHub").changeState("stateSquad");
    });
});

// --- SHARE RECRUITMENT LINK (moved here from old Player Admin page) ---
$w("#btnOpenShare").onClick(() => {
    $w("#qrCodeImage").src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${JOIN_URL}`;
    $w("#shareModal").show();
    $w("#shareModal").expand();
});

$w("#btnCopyLink").onClick(() => {
    wixWindow.copyToClipboard(JOIN_URL)
        .then(() => {
            $w("#btnCopyLink").label = "COPIED!";
            setTimeout(() => $w("#btnCopyLink").label = "COPY LINK FOR WHATSAPP", 2000);
        })
        .catch((err) => {
            console.error("Failed to copy URL", err);
            $w("#btnCopyLink").label = "Error copying";
        });
});

$w("#btnCloseShare").onClick(() => {
    $w("#shareModal").collapse();
    $w("#shareModal").hide();
});

// ==========================================
// STATE 2: SQUAD (Enquiries -> Trials -> Active Squad pipeline)
// Replaces the old "Player Admin" page's Recruitment/Squad toggle
// with 3 tabs that mirror the actual status pipeline.
// ==========================================
async function loadSquadState(teamId) {
    squadActiveTeamId = teamId || managerContext.primaryTeamId;
    const team = managerContext.teams.find(t => t._id === squadActiveTeamId);
    squadActiveAgeGroupId = team ? (team.AG_ageGroup?._id || team.AG_ageGroup) : managerContext.primaryAgeGroupId;

    if ($w("#txtSquadTeamName")) $w("#txtSquadTeamName").text = team ? team.T_teamName : "Squad";

    // If managing multiple teams, populate a switcher
    if ($w("#squadTeamSwitcher") && managerContext.teams.length > 1) {
        $w("#squadTeamSwitcher").options = managerContext.teams.map(t => ({ label: t.T_teamName, value: t._id }));
        $w("#squadTeamSwitcher").value = squadActiveTeamId;
        $w("#squadTeamSwitcher").expand();
    } else if ($w("#squadTeamSwitcher")) {
        $w("#squadTeamSwitcher").collapse();
    }

    $w("#squadPipelineTabs").value = "enquiries";
    showSquadTab("enquiries");

    await Promise.all([loadEnquiries(), loadTrials(), loadSquadList()]);
}

if ($w("#squadTeamSwitcher")) {
    $w("#squadTeamSwitcher").onChange(() => loadSquadState($w("#squadTeamSwitcher").value));
}

$w("#squadPipelineTabs").onChange((event) => showSquadTab(event.target.value));

function showSquadTab(tab) {
    $w("#boxEnquiries").collapse();
    $w("#boxTrials").collapse();
    $w("#boxSquadList").collapse();

    if (tab === "enquiries") $w("#boxEnquiries").expand();
    else if (tab === "trials") $w("#boxTrials").expand();
    else if (tab === "squad") $w("#boxSquadList").expand();
}

function flashTabMessage(elementId, text) {
    if (!$w(elementId)) return;
    $w(elementId).text = text;
    $w(elementId).show();
    setTimeout(() => $w(elementId).hide(), 3000);
}

// --- PIPELINE 1: ENQUIRIES ---
async function loadEnquiries() {
    try {
        const results = await wixData.query("SignolPlayers")
            .eq("SP_status", ENQUIRY_STATUS_ID)
            .eq("ageGroup", squadActiveAgeGroupId)
            .include("SP_relationship", "ageGroup", "SP_emergContactRelationship")
            .descending("_createdDate")
            .find();

        $w("#repeaterEnquiries").data = results.items;
        if ($w("#tabEnquiriesCount")) $w("#tabEnquiriesCount").text = results.items.length.toString();

        if (results.items.length === 0) $w("#repeaterEnquiries").hide();
        else $w("#repeaterEnquiries").show();
    } catch (err) {
        console.error("Error loading enquiries:", err);
    }
}

$w("#repeaterEnquiries").onItemReady(($item, itemData) => {
    $item("#firstname").text = itemData.SP_firstName || "N/A";
    $item("#lastname").text = itemData.SP_lastName || "N/A";
    $item("#dob").text = itemData.SP_dob || "N/A";
    $item("#agegroup").text = itemData.ageGroup ? itemData.ageGroup.AG_ageGroup : "N/A";
    $item("#experience").text = itemData.footballExperience || "N/A";
    $item("#position").text = itemData.position || "N/A";
    $item("#parentname").text = itemData.parentsName || "N/A";
    $item("#parentemail").text = itemData.parentEmail || "N/A";
    $item("#parentmobile").text = itemData.parentPhone || "N/A";
    $item("#relation").text = itemData.SP_relationship ? itemData.SP_relationship.label : "N/A";

    $item("#accept").onClick(async () => {
        $item("#accept").disable();
        $item("#accept").label = "Accepting...";

        try {
            let updateData = cleanItemForUpdate(itemData);
            updateData.SP_status = TRIAL_STATUS_ID;
            updateData.SP_team = squadActiveTeamId;

            await wixData.update("SignolPlayers", updateData);

            await loadEnquiries();
            await loadTrials();

            // IMPROVED FLOW: jump to Trials so the manager sees the player land there
            $w("#squadPipelineTabs").value = "trials";
            showSquadTab("trials");
            flashTabMessage("#tabTrialsHighlight", `${itemData.SP_firstName} moved to Trials ✓`);

        } catch (err) {
            console.error("Failed to update status:", err);
            $item("#accept").enable();
            $item("#accept").label = "Error";
        }
    });
});

// --- PIPELINE 2: TRIALS & INVITES ---
async function loadTrials() {
    try {
        const results = await wixData.query("SignolPlayers")
            .eq("SP_status", TRIAL_STATUS_ID)
            .eq("SP_team", squadActiveTeamId)
            .include("SP_relationship", "ageGroup", "SP_emergContactRelationship")
            .descending("_updatedDate")
            .find();

        $w("#repeaterTrials").data = results.items;
        if ($w("#tabTrialsCount")) $w("#tabTrialsCount").text = results.items.length.toString();

        if (results.items.length === 0) $w("#repeaterTrials").hide();
        else $w("#repeaterTrials").show();
    } catch (err) {
        console.error("Error loading trials:", err);
    }
}

$w("#repeaterTrials").onItemReady(($item, itemData) => {
    $item("#tfirstname").text = itemData.SP_firstName || "N/A";
    $item("#tlastname").text = itemData.SP_lastName || "N/A";
    $item("#tparentname").text = itemData.parentsName || "N/A";
    $item("#tparentemail").text = itemData.parentEmail || "N/A";
    $item("#tparentmobile").text = itemData.parentPhone || "N/A";

    $item("#leaveReasonDropdown").options = leaveReasonOptions;
    let isConfirmingLeave = false;

    $item("#invite").onClick(async () => {
        const result = await wixWindow.openLightbox("InviteRegistration", {
            firstName: itemData.SP_firstName,
            lastName: itemData.SP_lastName,
            parentName: itemData.parentsName,
            parentEmail: itemData.parentEmail
        });

        if (!result) return;

        $item("#invite").disable();
        $item("#invite").label = "Saving & Sending...";

        try {
            let updateData = cleanItemForUpdate(itemData);

            updateData.firstTasterDate = formatDateStr(result.tasterDate);
            updateData.registrationDate = formatDateStr(result.regDate);
            updateData.SP_status = INVITED_STATUS_ID;
            updateData.SP_trainingOnly = (result.playerType === "true");

            const token = generateRandomToken(16);
            updateData.inviteToken = token;
            updateData.registrationLink = `https://www.signolathleticjfc.co.uk/secure-registration?token=${token}`;

            await wixData.update("SignolPlayers", updateData);

            const queuePayload = {
                parentEmail: updateData.parentEmail,
                parentName: updateData.parentsName,
                childName: updateData.SP_firstName,
                registrationLink: updateData.registrationLink
            };
            await wixData.insert("EmailQueue", queuePayload);

            const sentFirstName = updateData.SP_firstName;

            await loadTrials();
            await loadSquadList();

            // IMPROVED FLOW: invited players move into the Squad (onboarding) list - jump there
            $w("#squadPipelineTabs").value = "squad";
            showSquadTab("squad");
            flashTabMessage("#tabSquadHighlight", `${sentFirstName} sent a registration link ✓`);

        } catch (err) {
            console.error("Failed to process invite:", err);
            $item("#invite").enable();
            $item("#invite").label = "Error - Try Again";
        }
    });

    $item("#return").onClick(async () => {
        $item("#return").disable();
        $item("#return").label = "Returning...";

        try {
            let updateData = cleanItemForUpdate(itemData);
            updateData.SP_status = ENQUIRY_STATUS_ID;
            updateData.SP_team = null;

            await wixData.update("SignolPlayers", updateData);

            await loadTrials();
            await loadEnquiries();
        } catch (err) {
            console.error("Failed to return to pool:", err);
            $item("#return").enable();
        }
    });

    $item("#left").onClick(async () => {
        if (!isConfirmingLeave) {
            isConfirmingLeave = true;
            $item("#leaveReasonDropdown").expand();
            $item("#leaveReasonDropdown").show();
            $item("#left").label = "Confirm Archive";
            return;
        }

        const selectedReason = $item("#leaveReasonDropdown").value;

        if (!selectedReason) {
            $item("#left").label = "Select a Reason!";
            setTimeout(() => $item("#left").label = "Confirm Archive", 2000);
            return;
        }

        $item("#left").disable();
        $item("#left").label = "Archiving...";

        try {
            let updateData = cleanItemForUpdate(itemData);
            updateData.SP_status = LEFT_STATUS_ID;
            updateData.SP_team = null;
            updateData.leaveReason = selectedReason;

            await wixData.update("SignolPlayers", updateData);

            isConfirmingLeave = false;
            $item("#leaveReasonDropdown").collapse();
            $item("#leaveReasonDropdown").hide();

            await loadTrials();
        } catch (err) {
            console.error("Failed to archive:", err);
            $item("#left").enable();
            $item("#left").label = "Error";
        }
    });
});

// --- PIPELINE 3: ACTIVE SQUAD & PROFILE MODAL ---
async function loadSquadList() {
    try {
        const results = await wixData.query("SignolPlayers")
            .eq("SP_team", squadActiveTeamId)
            .ne("SP_status", LEFT_STATUS_ID)
            .include("SP_relationship", "ageGroup", "SP_emergContactRelationship")
            .descending("_updatedDate")
            .find();

        const players = results.items.filter(p =>
            p.SP_status !== TRIAL_STATUS_ID &&
            p.SP_status !== ENQUIRY_STATUS_ID
        );

        players.sort((a, b) => (STATUS_SORT_ORDER[a.SP_status] || 99) - (STATUS_SORT_ORDER[b.SP_status] || 99));

        $w("#repeaterSquad").data = players;
        if ($w("#tabSquadCount")) $w("#tabSquadCount").text = players.length.toString();

        $w("#filterAssigned").text = `Assigned: ${players.length}`;
        $w("#filterPlaying").text = `Playing: ${players.filter(p => p.SP_status === Active_ID && p.SP_trainingOnly !== true).length}`;
        $w("#filterTraining").text = `Training Only: ${players.filter(p => p.SP_status === Active_ID && p.SP_trainingOnly === true).length}`;
        $w("#filterOnboarding").text = `Onboarding: ${players.filter(p => p.SP_status !== Active_ID).length}`;

        if (players.length === 0) $w("#repeaterSquad").hide();
        else $w("#repeaterSquad").show();

    } catch (err) {
        console.error("Error loading squad list:", err);
    }
}

$w("#repeaterSquad").onItemReady(($item, itemData) => {
    $item("#rowFirstName").text = itemData.SP_firstName || "N/A";
    $item("#rowLastName").text = itemData.SP_lastName || "N/A";
    $item("#kitnumDisplay").text = itemData.kitNumber ? `#${itemData.kitNumber}` : "-";

    // Medical badge
    const medicalBadge = $item("#rowMedicalBadge");
    let cleanMedical = itemData.SP_medicalInfo ? itemData.SP_medicalInfo.replace(/<[^>]*>?/gm, '').trim() : "";

    if (!cleanMedical) {
        medicalBadge.text = "Clear";
        medicalBadge.style.backgroundColor = "#22C55E";
        medicalBadge.style.color = "#22C55E";
    } else {
        medicalBadge.text = "ALERT";
        medicalBadge.style.backgroundColor = "#F59E0B";
        medicalBadge.style.color = "#F59E0B";
    }

    // Playing type badge
    const trainingBadge = $item("#rowTrainingBadge");
    if (itemData.SP_trainingOnly === true) {
        trainingBadge.text = "Training Only";
        trainingBadge.style.backgroundColor = "#3B82F6";
        trainingBadge.style.color = "#3B82F6";
    } else {
        trainingBadge.text = "Playing";
        trainingBadge.style.backgroundColor = "#7c8ca6";
        trainingBadge.style.color = "#7c8ca6";
    }
    trainingBadge.show();

    // Status badge
    const statusBadge = $item("#rowStatusBadge");
    if (itemData.SP_status === Active_ID) {
        statusBadge.text = "Active Squad";
        statusBadge.style.backgroundColor = "#22C55E";
        statusBadge.style.color = "#22C55E";
    } else {
        if (itemData.SP_status === INVITED_STATUS_ID) statusBadge.text = "Registration With Parent";
        else if (itemData.SP_status === ACTION_REQUIRED_ID) statusBadge.text = "Sent Back to Parent";
        else if (itemData.SP_status === RENEWAL_STATUS_ID) statusBadge.text = "Renewal With Parent";
        else if (itemData.SP_status === DRAFT_STATUS_ID) statusBadge.text = "Form Ready - Not Submitted";
        else if (itemData.SP_status === READY_FOR_FA_ID) statusBadge.text = "With Club Secretary (FA Reg)";
        else if (itemData.SP_status === FA_COMPLETE_ID) statusBadge.text = "FA Cleared - Final Checks";
        else statusBadge.text = "ONBOARDING";

        // Action Required is the one onboarding state that's stuck pending a parent fix — flag it red.
        const onboardColor = itemData.SP_status === ACTION_REQUIRED_ID ? "#FF4D4D" : "#F59E0B";
        statusBadge.style.backgroundColor = onboardColor;
        statusBadge.style.color = onboardColor;
    }

    // Next-step guidance for onboarding statuses - action-first, consistent icon
    // so "needs you" vs "just FYI" rows are scannable without reading every word.
    const nextStep = $item("#rowNextStep");
    if (nextStep) {
        if (itemData.SP_status === INVITED_STATUS_ID) {
            nextStep.text = `⚠️ Follow up - registration form with parent (${itemData.registrationProgress || 0}% complete)`;
            nextStep.expand();
        } else if (itemData.SP_status === RENEWAL_STATUS_ID) {
            nextStep.text = `⚠️ Follow up - renewal form with parent (${itemData.registrationProgress || 0}% complete)`;
            nextStep.expand();
        } else if (itemData.SP_status === DRAFT_STATUS_ID) {
            nextStep.text = "⚠️ Nudge parent - form complete but not submitted yet";
            nextStep.expand();
        } else if (itemData.SP_status === ACTION_REQUIRED_ID) {
            nextStep.text = "⚠️ With parent - club secretary returned the form for a fix";
            nextStep.expand();
        } else if (itemData.SP_status === READY_FOR_FA_ID) {
            nextStep.text = "ℹ️ No action - with club secretary for FA registration";
            nextStep.expand();
        } else if (itemData.SP_status === FA_COMPLETE_ID) {
            nextStep.text = "ℹ️ No action - final club checks before going Active";
            nextStep.expand();
        } else {
            nextStep.collapse();
        }
    }

    $item("#btnOpenProfile").onClick(async () => {
        const result = await wixWindow.openLightbox("PlayerProfile", { player: itemData, defaultSeason: statsSelectedSeason });

        if (result && result.archived) {
            // Player left the squad entirely - needs a full re-fetch.
            await loadSquadList();
        } else if (result && typeof result.kitNumber !== "undefined") {
            // Patch the known-good value directly rather than re-querying,
            // which can race Wix's eventual consistency right after a write.
            itemData.kitNumber = result.kitNumber;
            $item("#kitnumDisplay").text = result.kitNumber ? `#${result.kitNumber}` : "-";
        }
    });
});

// ==========================================
// STATE 3: TEAM PROFILE (formerly "Team Admin" main page)
// ==========================================
async function loadTeamProfileState() {
    try {
        const sponsorData = await wixData.query("ClubSponsors").ascending("sponsorName").find();
        $w("#tagsSponsors").options = sponsorData.items.map(s => ({ label: s.sponsorName, value: s._id }));
    } catch (err) {
        console.error("Failed to load sponsor options", err);
    }

    const teamIds = managerContext.teams.map(t => t._id);
    await $w("#teamProfileDataset").setFilter(wixData.filter().hasSome("_id", teamIds));

    $w("#teamEditorSection").collapse();
}

$w("#teamProfileRepeater").onItemReady(($item, itemData, index) => {
    $item("#btnEditTeam").onClick(() => {
        teamProfileEditIndex = index;
        loadTeamToEditor(itemData);
    });
});

async function loadTeamToEditor(item) {
    selectedTeamProfileId = item._id;
    $w("#uploadTeamPhoto").reset();

    $w("#txtTeamTitle").text = item.T_teamName;
    $w("#richTeamIntro").value = item.teamIntro || "";
    $w("#inputLeague").value = item.leagueDivision || "";
    $w("#imgTeamPreview").src = item.T_teamPhoto;

    $w("#inputTrainingTime").value = item.T_trainingStartTime || "18:00";
    $w("#inputPitch").value = item.trainingPitch || "";
    $w("#addressLocation").value = item.trainingLocation || null;

    $w("#richAchievements").value = item.achievements || "";

    try {
        const res = await wixData.queryReferenced("Teams", item._id, "teamSponsors");
        $w("#tagsSponsors").value = res.items.map(s => s._id);
    } catch (err) {
        console.error("Sponsor reference loading error", err);
    }

    $w("#teamEditorSection").expand();
    $w("#teamEditorSection").scrollTo();
}

$w("#btnSaveTeam").onClick(() => handleTeamSave());

async function handleTeamSave() {
    if (!selectedTeamProfileId) return;
    $w("#btnSaveTeam").label = "Saving...";

    try {
        let photoUrl = $w("#imgTeamPreview").src;
        if ($w("#uploadTeamPhoto").value.length > 0) {
            const uploaded = await $w("#uploadTeamPhoto").uploadFiles();
            photoUrl = uploaded[0].fileUrl;
            $w("#imgTeamPreview").src = photoUrl;
        }

        const teamUpdate = await wixData.get("Teams", selectedTeamProfileId);

        teamUpdate.teamIntro = $w("#richTeamIntro").value;
        teamUpdate.leagueDivision = $w("#inputLeague").value;
        teamUpdate.T_teamPhoto = photoUrl;
        teamUpdate.T_trainingStartTime = $w("#inputTrainingTime").value;
        teamUpdate.trainingPitch = $w("#inputPitch").value;
        teamUpdate.trainingLocation = $w("#addressLocation").value;
        teamUpdate.achievements = $w("#richAchievements").value;

        await wixData.update("Teams", teamUpdate);

        const selectedSponsorIds = $w("#tagsSponsors").value;
        await wixData.replaceReferences("Teams", "teamSponsors", selectedTeamProfileId, selectedSponsorIds);

        await $w("#teamProfileDataset").setCurrentItemIndex(teamProfileEditIndex);
        await $w("#teamProfileDataset").setFieldValues({
            "teamIntro": teamUpdate.teamIntro,
            "T_teamPhoto": photoUrl,
            "leagueDivision": teamUpdate.leagueDivision
        });

        await $w("#teamProfileDataset").refresh();

        $w("#btnSaveTeam").label = "Team Updated!";

        setTimeout(() => {
            $w("#teamEditorSection").collapse();
            $w("#btnSaveTeam").label = "Save Changes";
            selectedTeamProfileId = "";
        }, 1500);

    } catch (err) {
        console.error("Team Save Error", err);
        $w("#btnSaveTeam").label = "Error - Try Again";
    }
}

// ==========================================
// STATE 4: STAFF PROFILE (formerly "Staff Admin" main page)
// ==========================================
async function loadStaffProfileState() {
    try {
        const qualsData = await wixData.query("Qualifications").ascending("shortName").find();
        $w("#tagsQuals").options = qualsData.items.map(q => ({ label: q.shortName, value: q._id }));
    } catch (err) {
        console.error("Failed to load qualification options", err);
    }

    let filter = wixData.filter();
    if (managerContext.accessLevel === ACCESS_ADMIN) {
        // Admin: no filter, full staff list
    } else if (managerContext.accessLevel === ACCESS_TEAM) {
        const teamIds = managerContext.teams.map(t => t._id);
        filter = filter.hasSome("SS_team", teamIds);
    } else {
        filter = filter.eq("memberId", managerContext.memberId);
    }
    await $w("#staffProfileDataset").setFilter(filter);

    $w("#staffEditorSection").collapse();
}

$w("#staffProfileRepeater").onItemReady(($item, itemData) => {
    $item("#btnEdit").onClick(() => {
        loadStaffMemberToEditor(itemData);
    });
});

async function loadStaffMemberToEditor(item) {
    selectedStaffProfileId = item._id;
    $w("#uploadPhoto").reset();

    $w("#txtName").text = item.SS_name;
    $w("#imgPreview").src = item.headshot;
    $w("#inputBio").value = item.bio || "";

    try {
        const res = await wixData.queryReferenced("SignolStaff", item._id, "SS_Qualifications");
        $w("#tagsQuals").value = res.items.map(q => q._id);
    } catch (err) {
        console.error("Qual load error", err);
    }

    $w("#staffEditorSection").expand();
    $w("#staffEditorSection").scrollTo();
}

$w("#btnSaveStaff").onClick(() => handleStaffSave());

async function handleStaffSave() {
    if (!selectedStaffProfileId) return;
    $w("#btnSaveStaff").label = "Saving...";

    try {
        let headshotUrl = $w("#imgPreview").src;
        if ($w("#uploadPhoto").value.length > 0) {
            const uploadedFiles = await $w("#uploadPhoto").uploadFiles();
            if (uploadedFiles.length > 0) headshotUrl = uploadedFiles[0].fileUrl;
        }

        const itemToUpdate = await wixData.get("SignolStaff", selectedStaffProfileId);
        itemToUpdate.headshot = headshotUrl;
        itemToUpdate.bio = $w("#inputBio").value;
        await wixData.update("SignolStaff", itemToUpdate);

        const selectedQualIds = $w("#tagsQuals").value;
        await wixData.replaceReferences("SignolStaff", "SS_Qualifications", selectedStaffProfileId, selectedQualIds);

        await $w("#staffProfileDataset").refresh();

        $w("#btnSaveStaff").label = "Changes Saved!";

        setTimeout(() => {
            $w("#staffEditorSection").collapse();
            $w("#btnSaveStaff").label = "Save Changes";
            selectedStaffProfileId = "";
        }, 1500);

    } catch (err) {
        console.error("Save Error:", err);
        $w("#btnSaveStaff").label = "Error - Try Again";
    }
}

// ==========================================
// STATE 5: SPONSORS (formerly "Sponsor Admin")
// ==========================================
async function loadSponsorsState() {
    try {
        const teamIds = managerContext.teams.map(t => t._id);
        const teamData = await wixData.query("Teams")
            .hasSome("_id", teamIds)
            .include("teamSponsors")
            .find();

        let visibleSponsorIds = [];
        teamData.items.forEach(team => {
            if (team.teamSponsors) {
                team.teamSponsors.forEach(s => visibleSponsorIds.push(s._id || s));
            }
        });

        if (visibleSponsorIds.length > 0) {
            await $w("#sponsorDataset").setFilter(wixData.filter().hasSome("_id", visibleSponsorIds));
        } else {
            await $w("#sponsorDataset").setFilter(wixData.filter().eq("_id", "none"));
        }
    } catch (err) {
        console.error("Failed to load sponsors", err);
    }
}

$w("#btnAddSponsor").onClick(async () => {
    if (!$w("#inputSponsorName").value) {
        $w("#btnAddSponsor").label = "Name Required!";
        return;
    }

    $w("#btnAddSponsor").label = "Uploading...";

    try {
        let logoUrl = "";
        if ($w("#uploadSponsorLogo").value.length > 0) {
            const uploaded = await $w("#uploadSponsorLogo").uploadFiles();
            logoUrl = uploaded[0].fileUrl;
        }

        let rawUrl = $w("#inputSponsorUrl").value.trim();
        if (rawUrl && !rawUrl.startsWith('http')) {
            rawUrl = "https://" + rawUrl;
        }

        const newSponsor = {
            sponsorName: $w("#inputSponsorName").value.trim(),
            sponsorLogo: logoUrl,
            sponsorUrl: rawUrl,
            sponsorBlurb: $w("#richSponsorBlurb").value
        };

        await wixData.insert("ClubSponsors", newSponsor);

        $w("#btnAddSponsor").label = "Sponsor Added!";
        $w("#sponsorDataset").refresh();
        resetSponsorForm();

    } catch (err) {
        console.error("Add Sponsor Error", err);
        $w("#btnAddSponsor").label = "Validation Error";
    }
});

$w("#sponsorRepeater").onItemReady(($item, itemData) => {
    $item("#imgSponsor").fitMode = "fixedWidth";
    $item("#btnDeleteSponsor").onClick(async () => {
        $item("#btnDeleteSponsor").label = "Deleting...";

        try {
            await wixData.remove("ClubSponsors", itemData._id);
            await $w("#sponsorDataset").refresh();
        } catch (err) {
            console.error("Hard Delete failed - Check Permissions", err);
            $item("#btnDeleteSponsor").label = "Error";
        }
    });
});

function resetSponsorForm() {
    $w("#inputSponsorName").value = "";
    $w("#inputSponsorUrl").value = "";
    $w("#richSponsorBlurb").value = "";
    $w("#uploadSponsorLogo").reset();
    setTimeout(() => { $w("#btnAddSponsor").label = "Add Sponsor"; }, 2000);
}

// ==========================================
// STATE 6: NEWS (formerly "News Admin")
// ==========================================
async function loadNewsState() {
    $w("#typeDropdown").options = [
        { label: "Match Report", value: "Match Report" },
        { label: "Team News", value: "Team News" },
        { label: "Social Event", value: "Social Event" },
        { label: "Club Notice", value: "Club Notice" },
        { label: "Charity Event", value: "Charity Event" }
    ];

    try {
        const teamsResult = await wixData.query("Teams").ascending("T_teamName").find();
        $w("#teamDropdown").options = teamsResult.items.map(t => ({ label: t.T_teamName, value: t._id }));

        if (managerContext.primaryTeamId) {
            $w("#teamDropdown").value = managerContext.primaryTeamId;
        }
    } catch (err) {
        console.error("News team load error:", err);
    }
}

$w("#btnAddNews").onClick(async () => {
    $w("#btnAddNews").label = "Uploading...";
    $w("#btnAddNews").disable();

    let dateObj = new Date();
    dateObj.setDate(dateObj.getDate() + 60);
    dateObj.setHours(0, 0, 0, 0);

    try {
        // 1. Upload the featured image (if the manager chose one).
        let featuredImage = "";
        if ($w("#uploadNewsImage").value.length > 0) {
            const uploaded = await $w("#uploadNewsImage").uploadFiles();
            if (uploaded.length > 0) featuredImage = uploaded[0].fileUrl;
        }

        const headline = $w("#headlineInput").value;
        const articleBody = $w("#articleBodyInput").value;

        const newsData = {
            headline,
            articleBody,
            type: $w("#typeDropdown").value,
            team: $w("#teamDropdown").value,
            featuredImage,
            posted: false,
            expire: dateObj
        };

        // 2. Save the CMS row first (source of record).
        const inserted = await wixData.insert("ClubNews", newsData);

        // 3. Auto-publish a live blog post from it.
        $w("#btnAddNews").label = "Publishing...";
        const { blogPostId } = await createBlogPost({
            title: headline,
            bodyHtml: articleBody,
            featuredImage,
            memberId: managerContext.memberId
        });

        // 4. Flag the row as posted and store the blog link (patch known fields only).
        inserted.posted = true;
        inserted.blogPostId = blogPostId;
        await wixData.update("ClubNews", inserted);

        $w("#btnAddNews").label = "Published!";
        $w("#headlineInput").value = "";
        $w("#articleBodyInput").value = "";
        $w("#uploadNewsImage").reset();

        setTimeout(() => {
            $w("#btnAddNews").label = "Submit News";
            $w("#btnAddNews").enable();
        }, 2000);

    } catch (err) {
        $w("#btnAddNews").label = "Error - Try again";
        $w("#btnAddNews").enable();
        console.error("News publish failed:", err);
    }
});

// ==========================================
// STATE 7: STATS (Overview)
// ==========================================
async function loadStatsState() {
    $w("#statsTeamDropdown").options = managerContext.teams.map(t => ({
        label: t.T_teamName,
        value: t._id
    }));

    if (!statsSelectedTeamId) {
        statsSelectedTeamId = managerContext.primaryTeamId;
    }
    $w("#statsTeamDropdown").value = statsSelectedTeamId;

    if (!statsSelectedSeason) {
        statsSelectedSeason = $w("#statsSeasonDropdown").value;
    }
    $w("#statsSeasonDropdown").value = statsSelectedSeason;

    refreshStatsOverview();
}

$w("#statsTeamDropdown").onChange(() => {
    statsSelectedTeamId = $w("#statsTeamDropdown").value;
    refreshStatsOverview();
});

$w("#statsSeasonDropdown").onChange(() => {
    statsSelectedSeason = $w("#statsSeasonDropdown").value;
    refreshStatsOverview();
});

// --- STATS OVERVIEW ---
async function refreshStatsOverview() {
    const teamId = statsSelectedTeamId;
    const season = statsSelectedSeason;
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
        console.error("Stats Overview Fetch Error:", err);
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

// --- PLAYER REFERENCE HELPERS (Stats Add / Stats Edit) ---
async function loadSquadPlayerOptions() {
    if (!statsSelectedTeamId) {
        statsSquadPlayerOptions = [];
        return;
    }

    try {
        const results = await wixData.query("SignolPlayers")
            .eq("SP_team", statsSelectedTeamId)
            .ne("SP_status", LEFT_STATUS_ID)
            .ascending("SP_firstName")
            .limit(1000)
            .find();

        const squad = results.items.filter(p =>
            p.SP_status !== TRIAL_STATUS_ID && p.SP_status !== ENQUIRY_STATUS_ID
        );

        statsSquadPlayerOptions = squad.map(p => ({
            label: `${p.SP_firstName || ""} ${p.SP_lastName || ""}`.trim(),
            value: p._id
        }));
    } catch (err) {
        console.error("Failed to load squad player options:", err);
        statsSquadPlayerOptions = [];
    }
}

function getPlayerNameById(playerId) {
    const match = statsSquadPlayerOptions.find(o => o.value === playerId);
    return match ? match.label : "";
}

// ==========================================
// STATE 8: STATS ADD (formerly "Add Results" sub-tab)
// ==========================================
async function loadStatsAddState() {
    if (!statsSelectedTeamId) {
        statsSelectedTeamId = managerContext.primaryTeamId;
    }

    const teamOptions = managerContext.teams.map(t => ({
        label: t.T_teamName,
        value: t._id
    }));
    $w("#potmTeam").options = teamOptions;
    $w("#tsTeam").options = teamOptions;
    $w("#ddnTeam").options = teamOptions;
    $w("#potmTeam").value = statsSelectedTeamId;
    $w("#tsTeam").value = statsSelectedTeamId;
    $w("#ddnTeam").value = statsSelectedTeamId;

    await loadSquadPlayerOptions();

    $w("#potmplayername").options = statsSquadPlayerOptions;
    $w("#statRepeater").forEachItem(($item) => {
        $item("#inputName").options = statsSquadPlayerOptions;
    });

    $w("#potmSeasonDropdown").value = statsSelectedSeason;
    $w("#tsSeasonDropdown").value = statsSelectedSeason;
    $w("#bulkSeasonDropdown").value = statsSelectedSeason;

    $w("#statsAddTabs").value = statsAddActiveTab;
    showStatsAddTab(statsAddActiveTab);
}

async function onStatsAddTeamChange(newTeamId) {
    statsSelectedTeamId = newTeamId;
    $w("#potmTeam").value = newTeamId;
    $w("#tsTeam").value = newTeamId;
    $w("#ddnTeam").value = newTeamId;

    await loadSquadPlayerOptions();
    $w("#potmplayername").options = statsSquadPlayerOptions;
    $w("#potmplayername").value = null;
    $w("#statRepeater").forEachItem(($item) => {
        $item("#inputName").options = statsSquadPlayerOptions;
        $item("#inputName").value = null;
    });
}

$w("#potmTeam").onChange(() => onStatsAddTeamChange($w("#potmTeam").value));
$w("#tsTeam").onChange(() => onStatsAddTeamChange($w("#tsTeam").value));
$w("#ddnTeam").onChange(() => onStatsAddTeamChange($w("#ddnTeam").value));

$w("#potmSeasonDropdown").onChange(() => {
    statsSelectedSeason = $w("#potmSeasonDropdown").value;
});

$w("#tsSeasonDropdown").onChange(() => {
    statsSelectedSeason = $w("#tsSeasonDropdown").value;
});

$w("#bulkSeasonDropdown").onChange(() => {
    statsSelectedSeason = $w("#bulkSeasonDropdown").value;
});

function showStatsAddTab(tab) {
    statsAddActiveTab = tab;

    $w("#POTM").collapse();
    $w("#player").collapse();
    $w("#team").collapse();

    if (tab === "potm") {
        $w("#POTM").expand();
    } else if (tab === "player") {
        $w("#player").expand();
    } else if (tab === "teamstats") {
        $w("#team").expand();
    }
}

$w("#statsAddTabs").onChange((event) => showStatsAddTab(event.target.value));

$w("#potmSubmit").onClick(async () => {
    const teamId = statsSelectedTeamId;
    if (!teamId) return $w("#potmSubmit").label = "Select Team First!";

    const season = $w("#potmSeasonDropdown").value;
    if (!season) return $w("#potmSubmit").label = "Select Season First!";

    const playerId = $w("#potmplayername").value;
    if (!playerId) return $w("#potmSubmit").label = "Select a Player!";

    $w("#potmSubmit").label = "Saving...";

    try {
        let imageUrl = "";
        if ($w("#potmimage").value.length > 0) {
            const uploadedFiles = await $w("#potmimage").uploadFiles();
            imageUrl = uploadedFiles[0].fileUrl;
        }

        await wixData.insert("Playerofthematch", {
            "PO_teamName": teamId,
            "playerReference": playerId,
            "PO_playerName": getPlayerNameById(playerId),
            "PO_reason": $w("#potmReason").value,
            "PO_playerPhoto": imageUrl,
            "seasonLabel": season
        });

        $w("#potmSubmit").label = "POTM Saved! ✓";
        resetPotmForm();

        refreshStatsOverview();
    } catch (err) {
        console.error("POTM Save Error:", err);
        $w("#potmSubmit").label = "Error!";
    }
});

$w("#tsSubmit").onClick(async () => {
    const teamId = statsSelectedTeamId;
    if (!teamId) return $w("#tsSubmit").label = "Select Team First!";

    const season = $w("#tsSeasonDropdown").value;
    if (!season) return $w("#tsSubmit").label = "Select Season First!";

    $w("#tsSubmit").label = "Saving...";

    try {
        await wixData.insert("TeamStats", {
            "TS_teamName": teamId,
            "result": $w("#result").value,
            "TS_goalsFor": Number($w("#goalsfor").value) || 0,
            "TS_goalsAgainst": Number($w("#goesagainst").value) || 0,
            "seasonLabel": season
        });

        $w("#tsSubmit").label = "Match Saved! ✓";
        resetTeamStatsForm();

        // Improvement: keep the overview numbers in sync immediately
        refreshStatsOverview();
    } catch (err) {
        console.error("TeamStats Error:", err);
        $w("#tsSubmit").label = "Error!";
    }
});

$w("#statRepeater").data = bulkStatsRows;

$w("#btnAddRow").onClick(() => {
    bulkStatsRows.push({ _id: Math.random().toString() });
    $w("#statRepeater").data = bulkStatsRows;
});

$w("#statRepeater").onItemReady(($item, itemData) => {
    $item("#inputName").options = statsSquadPlayerOptions;

    $item("#btnRemoveRow").onClick(() => {
        if (bulkStatsRows.length > 1) {
            bulkStatsRows = bulkStatsRows.filter(item => item._id !== itemData._id);
            $w("#statRepeater").data = bulkStatsRows;
        }
    });
});

$w("#btnSubmitStats").onClick(async () => {
    const teamId = statsSelectedTeamId;
    if (!teamId) return $w("#btnSubmitStats").label = "Select Team First!";

    const season = $w("#bulkSeasonDropdown").value;
    if (!season) return $w("#btnSubmitStats").label = "Select Season First!";

    $w("#btnSubmitStats").label = "Saving...";
    let entries = [];

    $w("#statRepeater").forEachItem(($item) => {
        const playerId = $item("#inputName").value;
        if (playerId) {
            entries.push({
                "playerReference": playerId,
                "PS_playerName": getPlayerNameById(playerId),
                "PS_teamName": teamId,
                "seasonLabel": season,
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

            refreshStatsOverview();
        } catch (err) {
            $w("#btnSubmitStats").label = "Error!";
        }
    }
});

function resetPotmForm() {
    $w("#potmplayername").value = null;
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
        $item("#inputName").value = null;
        $item("#inputGoals").value = null;
        $item("#inputAssists").value = null;
        $item("#inputTackles").value = null;
        $item("#inputSaves").value = null;
    });
    bulkStatsRows = [{ _id: "1" }];
    $w("#statRepeater").data = [];
    setTimeout(() => {
        $w("#statRepeater").data = bulkStatsRows;
        $w("#btnSubmitStats").label = "Submit All Stats";
    }, 50);
}

// ==========================================
// STATE 9: STATS EDIT (formerly "Edit Records" sub-tab)
// ==========================================
async function loadStatsEditState() {
    $w("#editStatsTeamDropdown").options = managerContext.teams.map(t => ({
        label: t.T_teamName,
        value: t._id
    }));

    if (!statsSelectedTeamId) {
        statsSelectedTeamId = managerContext.primaryTeamId;
    }
    $w("#editStatsTeamDropdown").value = statsSelectedTeamId;
    $w("#editStatsSeasonDropdown").value = statsSelectedSeason;

    await loadSquadPlayerOptions();
    $w("#inputEditName").options = statsSquadPlayerOptions;
    $w("#poeditname").options = statsSquadPlayerOptions;

    editRecordsActiveTab = "Stats";
    $w("#editRecordsTabSwitch").value = "Stats";
    $w("#statsGroup").expand();
    $w("#potmGroup").collapse();
    if ($w("#editPanel")) $w("#editPanel").collapse();
    if ($w("#poEdit")) $w("#poEdit").collapse();

    refreshEditRecordsTables();
}

$w("#editStatsTeamDropdown").onChange(async () => {
    statsSelectedTeamId = $w("#editStatsTeamDropdown").value;
    await loadSquadPlayerOptions();
    $w("#inputEditName").options = statsSquadPlayerOptions;
    $w("#poeditname").options = statsSquadPlayerOptions;
    $w("#inputEditName").value = null;
    $w("#poeditname").value = null;
    refreshEditRecordsTables();
});

$w("#editStatsSeasonDropdown").onChange(() => {
    statsSelectedSeason = $w("#editStatsSeasonDropdown").value;
    refreshEditRecordsTables();
});

$w("#editRecordsTabSwitch").onChange(() => {
    if ($w("#editRecordsTabSwitch").value === "Stats") {
        editRecordsActiveTab = "Stats";
        $w("#statsGroup").expand();
        $w("#potmGroup").collapse();
    } else {
        editRecordsActiveTab = "POTM";
        $w("#potmGroup").expand();
        $w("#statsGroup").collapse();
    }
    if ($w("#editPanel")) $w("#editPanel").collapse();
    if ($w("#poEdit")) $w("#poEdit").collapse();
    refreshEditRecordsTables();
});

async function refreshEditRecordsTables() {
    const teamId = statsSelectedTeamId;
    const season = statsSelectedSeason;
    if (!teamId || !season) return;

    try {
        if (editRecordsActiveTab === "Stats") {
            const res = await wixData.query("PlayerStats")
                .eq("PS_teamName", teamId)
                .eq("seasonLabel", season)
                .descending("_createdDate")
                .limit(1000)
                .find();
            $w("#statsTable").rows = res.items;
        } else {
            const res = await wixData.query("Playerofthematch")
                .eq("PO_teamName", teamId)
                .eq("seasonLabel", season)
                .descending("_createdDate")
                .limit(1000)
                .find();

            const cleanedRows = res.items.map(item => {
                return {
                    ...item,
                    PO_reason: item.PO_reason ? item.PO_reason.replace(/<[^>]*>?/gm, '') : ""
                };
            });
            $w("#potmTable").rows = cleanedRows;
        }
    } catch (err) { console.error("Edit Records Refresh Error:", err); }
}

$w("#statsTable").onRowSelect((event) => {
    const data = event.rowData;
    statsCurrentEditId = data._id;

    $w("#inputEditName").value = data.playerReference || null;
    $w("#inputEditGoals").value = (data.goals || 0).toString();
    $w("#inputEditAssists").value = (data.assists || 0).toString();
    $w("#inputEditTackles").value = (data.tackles || 0).toString();
    $w("#inputEditSaves").value = (data.saves || 0).toString();

    $w("#editPanel").expand();
});

$w("#potmTable").onRowSelect((event) => {
    const data = event.rowData;
    statsCurrentEditId = data._id;

    $w("#poeditname").value = data.playerReference || null;
    $w("#poeditReason").value = data.PO_reason || "";

    if ($w("#imgPrev")) {
        let photoData = data.PO_playerPhoto;
        if (photoData && typeof photoData === 'object' && photoData.uri) {
            $w("#imgPrev").src = `wix:image://v1/${photoData.uri}/${photoData.name}#originWidth=${photoData.width}&originHeight=${photoData.height}`;
        } else if (typeof photoData === 'string') {
            $w("#imgPrev").src = photoData;
        } else {
            $w("#imgPrev").src = "https://static.wixstatic.com/media/c837a6_60d3d3c75f1b4021966a34796684784a~mv2.png";
        }
    }

    $w("#poEdit").expand();
});

$w("#btnSaveEdit").onClick(() => saveStatsUpdate());
$w("#poeditSave").onClick(() => savePotmUpdate());

async function saveStatsUpdate() {
    try {
        let item = await wixData.get("PlayerStats", statsCurrentEditId);
        const playerId = $w("#inputEditName").value;
        item.playerReference = playerId;
        item.PS_playerName = getPlayerNameById(playerId);
        item.goals = Number($w("#inputEditGoals").value);
        item.assists = Number($w("#inputEditAssists").value);
        item.tackles = Number($w("#inputEditTackles").value);
        item.saves = Number($w("#inputEditSaves").value);

        await wixData.update("PlayerStats", item);
        $w("#editPanel").collapse();
        refreshEditRecordsTables();

        // Keep the overview leaderboards in sync immediately
        refreshStatsOverview();
    } catch (err) { console.error("Stats Save Error", err); }
}

async function savePotmUpdate() {
    try {
        let item = await wixData.get("Playerofthematch", statsCurrentEditId);
        const playerId = $w("#poeditname").value;
        item.playerReference = playerId;
        item.PO_playerName = getPlayerNameById(playerId);
        item.PO_reason = $w("#poeditReason").value;

        if ($w("#poeditphoto").value.length > 0) {
            const uploadedFile = await $w("#poeditphoto").uploadFiles();
            item.PO_playerPhoto = uploadedFile[0].fileUrl;
        }

        await wixData.update("Playerofthematch", item);
        $w("#poEdit").collapse();
        refreshEditRecordsTables();

        refreshStatsOverview();
    } catch (err) { console.error("POTM Save Error", err); }
}

// ==========================================
// SHARED HELPERS
// ==========================================
// Formats a DatePicker value into a "YYYY-MM-DD" string for a CMS Date field.
// Built from local date parts (not toISOString) so the calendar day can't shift
// by a timezone offset — same approach the DOB handling uses elsewhere. The old
// "05 Jul 2026" style output was a display string that Date fields can't store.
function formatDateStr(d) {
    if (!d) return null;
    const date = new Date(d);
    if (isNaN(date.getTime())) return null;
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function generateRandomToken(length = 24) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let token = "";
    for (let i = 0; i < length; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
}

function cleanItemForUpdate(item) {
    const clean = { ...item };
    delete clean._owner;
    delete clean._createdDate;
    delete clean._updatedDate;
    return clean;
}
