import wixData from 'wix-data';
import wixWindow from 'wix-window';

const INVITED_STATUS_ID = "184b5a98-37c8-41a6-bc58-5a1c17827f04";
const RENEWAL_STATUS_ID = "4d354c43-c893-4bc8-8415-18cfc32b3236";
const DRAFT_STATUS_ID = "ad6fe8f3-c82e-45ae-b688-89d53c3f0a9f";
const READY_FOR_FA_ID = "95978c83-70fc-4bd7-bd75-12f43216a0d7";
const FA_COMPLETE_ID = "af2bef8c-1caa-4bf8-8dce-321d19723741";
const Active_ID = "705c0b66-d5d5-47b6-b828-98a94c670f1f";
const LEFT_STATUS_ID = "d78cb8b0-3b3b-4439-b889-fd36dc434781";

let profileItem = null;
let isConfirmingLeave = false;

$w.onReady(async function () {
    const context = wixWindow.lightbox.getContext();
    if (!context || !context.player) return;

    // Kept separate from profileItem so it never gets written back to
    // SignolPlayers - mixing it into the same object caused wixData.update
    // to silently create a "defaultSeason" column on every kit/archive save.
    profileItem = context.player;
    const defaultSeason = context.defaultSeason;

    populateDetails(profileItem);

    isConfirmingLeave = false;
    $w("#dropdownLeaveReason").collapse();
    $w("#dropdownLeaveReason").value = null;
    $w("#datePickerLeave").collapse();
    $w("#datePickerLeave").value = null;
    $w("#btnMakeLeaver").label = "MAKE A LEAVER >";
    $w("#btnMakeLeaver").enable();

    await loadLeaveReasonOptions();
    const initialSeason = await loadSeasonOptions(defaultSeason);
    await loadPlayerStats(profileItem._id, initialSeason);

    $w("#DDSquadSeason").onChange(() => {
        loadPlayerStats(profileItem._id, $w("#DDSquadSeason").value);
    });

    $w("#btnSaveKit").onClick(saveKitNumber);
    $w("#btnMakeLeaver").onClick(makeLeaver);
    $w("#btnCloseProfile").onClick(() => wixWindow.lightbox.close({ kitNumber: profileItem.kitNumber }));
});

function populateDetails(item) {
    $w("#DDHeadshot").src = resolveImageSrc(item.SP_idPhoto, "https://static.wixstatic.com/media/c837a6_ba0353c713b1456da871eb329a4358d3~mv2.png");
    $w("#DDHeadshot").alt = item.SP_firstName || "";

    $w("#detailFirstName").text = item.SP_firstName || "N/A";
    $w("#detailLastName").text = item.SP_lastName || "N/A";
    // FA number lives on SignolPlayers as SP_fanNumber (item.fanNumber is a
    // different collection's field, so it read undefined → always "Pending").
    // Returning players keep their number through renewal; brand-new players
    // have none yet and correctly show "Pending".
    $w("#detailFAN").text = item.SP_fanNumber || "Pending";
    $w("#detailDOB").text = item.SP_dob || "N/A";

    $w("#detailParentName").text = item.parentsName || "N/A";
    $w("#detailParentMobile").text = item.parentPhone || "N/A";
    $w("#detailParentEmail").text = item.parentEmail || "N/A";
    $w("#detailParentRelation").text = item.SP_relationship ? item.SP_relationship.label || "N/A" : "N/A";

    $w("#detailEmergencyName").text = item.SP_emergContactName || "N/A";
    $w("#detailEmergencyMobile").text = item.SP_emergContactNumber || "N/A";
    $w("#detailEmergencyRelation").text = item.SP_emergContactRelationship ? item.SP_emergContactRelationship.label || "N/A" : "N/A";

    const cleanMedical = item.SP_medicalInfo ? item.SP_medicalInfo.replace(/<[^>]*>?/gm, '').trim() : "";
    $w("#detailMedicalBox").text = cleanMedical || "No medical conditions declared.";

    // Tri-state, not a straight boolean check — an unanswered consent (parent
    // hasn't opened the Consent Lightbox yet) must read differently from a
    // genuine "Declined", same fix as Parent Hub's registration/profile pages.
    $w("#detailSocialMedia").text = consentStatusText(item.socialMedia);
    $w("#detailWebsiteConsent").text = consentStatusText(item.sp_consent_photo);
    $w("#detailMedicalConsent").text = consentStatusText(item.sp_consent_medical);
    $w("#detailMembershipNo").text = item.sp_membership_no || "Not yet assigned";

    $w("#detailPlayertype").text = item.SP_trainingOnly === true ? "Training Only" : "Playing";
    $w("#detailStatusDisplay").text = getStatusLabel(item.SP_status);

    // Active players have no in-progress registration; show a dash rather than
    // collapsing, which left the surrounding box looking broken.
    if (item.SP_status === Active_ID) {
        $w("#detailRegProgress").text = "-";
    } else {
        $w("#detailRegProgress").text = `Registration: ${item.registrationProgress || 0}% complete`;
    }
    $w("#detailRegProgress").expand();

    $w("#inputKitNumber").value = item.kitNumber || null;
}

// SignolPlayers' image fields come back as either a plain "wix:image://..."
// string or a {uri, name, width, height} object depending on how the data was
// entered - same defensive handling Manager Hub.js already uses for POTM photos.
function resolveImageSrc(photoData, fallbackUrl) {
    if (photoData && typeof photoData === 'object' && photoData.uri) {
        return `wix:image://v1/${photoData.uri}/${photoData.name || 'image'}#originWidth=${photoData.width || 100}&originHeight=${photoData.height || 100}`;
    }
    if (typeof photoData === 'string' && photoData) {
        return photoData;
    }
    return fallbackUrl;
}

function consentStatusText(value) {
    if (value === true) return "Consent Given";
    if (value === false) return "Declined";
    return "Not Yet Provided";
}

function getStatusLabel(status) {
    if (status === Active_ID) return "Active Squad";
    if (status === INVITED_STATUS_ID) return "Registration With Parent";
    if (status === RENEWAL_STATUS_ID) return "Renewal With Parent";
    if (status === DRAFT_STATUS_ID) return "Form Ready - Not Submitted";
    if (status === READY_FOR_FA_ID) return "With Club Secretary (FA Reg)";
    if (status === FA_COMPLETE_ID) return "FA Cleared - Final Checks";
    return "ONBOARDING";
}

function cleanItemForUpdate(item) {
    const clean = { ...item };
    delete clean._owner;
    delete clean._createdDate;
    delete clean._updatedDate;
    return clean;
}

// ==========================================
// KIT NUMBER
// ==========================================
async function saveKitNumber() {
    if (!profileItem) return;
    $w("#btnSaveKit").label = "Saving...";

    try {
        let updateData = cleanItemForUpdate(profileItem);
        updateData.kitNumber = Number($w("#inputKitNumber").value) || null;

        await wixData.update("SignolPlayers", updateData);
        profileItem.kitNumber = updateData.kitNumber;

        $w("#btnSaveKit").label = "Saved! ✓";
    } catch (err) {
        console.error("Kit Number Save Error:", err);
        $w("#btnSaveKit").label = "Error!";
    } finally {
        setTimeout(() => { $w("#btnSaveKit").label = "Save Kit Number"; }, 2000);
    }
}

// ==========================================
// MAKE A LEAVER (2-step confirm)
// ==========================================
async function loadLeaveReasonOptions() {
    try {
        const dictResults = await wixData.query("ClubDictionary").eq("category", "leave_reason").find();
        const leaveReasonOptions = dictResults.items.map(item => ({ label: item.label, value: item.label }));
        $w("#dropdownLeaveReason").options = leaveReasonOptions;
    } catch (err) {
        console.error("Failed to load leave reasons:", err);
    }
}

async function makeLeaver() {
    if (!isConfirmingLeave) {
        isConfirmingLeave = true;
        $w("#dropdownLeaveReason").expand();
        $w("#datePickerLeave").expand();
        $w("#btnMakeLeaver").label = "CONFIRM ARCHIVE";
        return;
    }

    const reason = $w("#dropdownLeaveReason").value;
    const leaveDatePicker = $w("#datePickerLeave").value;

    if (!reason || !leaveDatePicker) {
        $w("#btnMakeLeaver").label = "Select Reason & Date!";
        setTimeout(() => $w("#btnMakeLeaver").label = "CONFIRM ARCHIVE", 2000);
        return;
    }

    $w("#btnMakeLeaver").disable();
    $w("#btnMakeLeaver").label = "Archiving Player...";

    try {
        let updateData = cleanItemForUpdate(profileItem);

        updateData.SP_status = LEFT_STATUS_ID;
        updateData.SP_team = null;
        updateData.leaveReason = reason;
        updateData.SPleavingDate = formatDateStr(leaveDatePicker);

        await wixData.update("SignolPlayers", updateData);

        wixWindow.lightbox.close({ archived: true });
    } catch (err) {
        console.error("Failed to archive player from profile:", err);
        $w("#btnMakeLeaver").enable();
        $w("#btnMakeLeaver").label = "Error. Try Again.";
    }
}

function formatDateStr(d) {
    if (!d) return "";
    const date = new Date(d);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// ==========================================
// PLAYER STATS PANEL
// ==========================================
async function loadSeasonOptions(defaultSeason) {
    try {
        const dictResults = await wixData.query("ClubDictionary")
            .eq("category", "season")
            .ascending("order")
            .find();

        if (dictResults.items.length === 0) return null;

        const seasonOptions = dictResults.items.map(item => ({
            label: item.title || item.label,
            value: item.title || item.label
        }));

        $w("#DDSquadSeason").options = seasonOptions;

        const initialSeason = defaultSeason || seasonOptions[seasonOptions.length - 1].value;
        $w("#DDSquadSeason").value = initialSeason;
        return initialSeason;
    } catch (err) {
        console.error("Failed to load season options:", err);
        return null;
    }
}

async function loadPlayerStats(playerId, seasonLabel) {
    if (!playerId || !seasonLabel) {
        $w("#SquadGoals").text = "0";
        $w("#SquadAssist").text = "0";
        $w("#SquadTackle").text = "0";
        $w("#SquadSave").text = "0";
        $w("#SquadPotm").text = "0";
        return;
    }

    try {
        const statsRes = await wixData.query("PlayerStats")
            .eq("playerReference", playerId)
            .eq("seasonLabel", seasonLabel)
            .find();

        let totalGoals = 0, totalAssists = 0, totalTackles = 0, totalSaves = 0;
        statsRes.items.forEach(stat => {
            totalGoals += (Number(stat.goals) || 0);
            totalAssists += (Number(stat.assists) || 0);
            totalTackles += (Number(stat.tackles) || 0);
            totalSaves += (Number(stat.saves) || 0);
        });

        $w("#SquadGoals").text = totalGoals.toString();
        $w("#SquadAssist").text = totalAssists.toString();
        $w("#SquadTackle").text = totalTackles.toString();
        $w("#SquadSave").text = totalSaves.toString();

        const potmRes = await wixData.query("Playerofthematch")
            .eq("playerReference", playerId)
            .eq("seasonLabel", seasonLabel)
            .find();

        $w("#SquadPotm").text = potmRes.items.length.toString();
    } catch (err) {
        console.error("Error loading player stats:", err);
        $w("#SquadGoals").text = "0";
        $w("#SquadAssist").text = "0";
        $w("#SquadTackle").text = "0";
        $w("#SquadSave").text = "0";
        $w("#SquadPotm").text = "0";
    }
}
