import wixData from 'wix-data';
import wixWindow from 'wix-window';
import { currentMember } from 'wix-members-frontend';

// --- CLUB SETTINGS ---
const JOIN_URL = "https://www.signolathleticjfc.co.uk/playerenquiry";

// --- DICTIONARY STATUS IDs ---
const ENQUIRY_STATUS_ID = "e4c79abb-e591-44c3-98a9-e111f276bdd2";
const TRIAL_STATUS_ID = "5f21b19d-878a-4042-a8ec-c1c0a66812b9";
const LEFT_STATUS_ID = "d78cb8b0-3b3b-4439-b889-fd36dc434781";
const INVITED_STATUS_ID = "184b5a98-37c8-41a6-bc58-5a1c17827f04"; 
const RENEWAL_STATUS_ID = "4d354c43-c893-4bc8-8415-18cfc32b3236"; 
const READY_FOR_FA_ID = "95978c83-70fc-4bd7-bd75-12f43216a0d7"; 
const FA_COMPLETE_ID = "af2bef8c-1caa-4bf8-8dce-321d19723741";
const Active_ID = "705c0b66-d5d5-47b6-b828-98a94c670f1f";

// --- JAVASCRIPT SORTING WEIGHTS ---
const STATUS_SORT_ORDER = {
    [INVITED_STATUS_ID]: 1,  
    [RENEWAL_STATUS_ID]: 2,  
    [READY_FOR_FA_ID]: 3,    
    [FA_COMPLETE_ID]: 4,     
    [Active_ID]: 5           
};

// --- GLOBAL STATE ---
let managerTeamId = "";
let managerAgeGroupId = "";
let leaveReasonOptions = [];
let pendingInviteItem = null;
let selectedProfileItem = null; 
let isConfirmingProfileLeave = false;

$w.onReady(async function () {
    
    // --- SET DEFAULT VIEW ON LOAD ---
    $w("#viewToggle").value = "Recruitment"; 
    $w("#boxSquad").collapse();
    $w("#boxRecruitment").expand();

    await getManagerContext();
    
    try {
        const dictResults = await wixData.query("ClubDictionary")
            .eq("category", "leave_reason") 
            .find();
       
        leaveReasonOptions = dictResults.items.map(item => {
            return { label: item.label, value: item.label };
        });
    } catch (err) {
        console.error("Failed to load dictionary reasons", err);
    }

    // --- INITIAL DATA LOAD ---
    if (managerAgeGroupId && managerTeamId) {
        loadEnquiries();
        loadTrials();
        loadSquad(); 
    } else {
        console.error("Manager profile not found or missing assignments.");
        $w("#enquiry").hide();
        $w("#trialRepeater").hide();
        $w("#squadRepeater").hide();
    }

    // --- VIEW TOGGLE LOGIC ---
    $w("#viewToggle").onChange((event) => {
        const selectedView = event.target.value;

        // Force close any open modals when switching tabs
        $w("#playerProfileModal").collapse();
        selectedProfileItem = null;

        $w("#inviteModal").collapse();
        pendingInviteItem = null; 
        
        $w("#shareModal").hide(); 
        $w("#shareModal").collapse();

        // Switch the main background boxes
        if (selectedView === "Recruitment") {
            $w("#boxSquad").collapse();
            $w("#boxRecruitment").expand();
        } else if (selectedView === "Squad") {
            $w("#boxRecruitment").collapse();
            $w("#boxSquad").expand();
        }
    });

    // ==========================================
    // SHARE RECRUITMENT LINK LOGIC
    // ==========================================
    
    // 1. Open the Share Modal & Generate QR
    $w("#btnOpenShare").onClick(() => {
        $w("#qrCodeImage").src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${JOIN_URL}`;
        $w("#shareModal").show(); 
        $w("#shareModal").expand();
    });

    // 2. Copy Link to Clipboard
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

    // 3. Close the Share Modal
    $w("#btnCloseShare").onClick(() => {
        $w("#shareModal").collapse();
        $w("#shareModal").hide();
    });

    // --- INVITE MODAL LOGIC: CANCEL ---
    $w("#btnCancelInvite").onClick(() => {
        pendingInviteItem = null; 
        $w("#inviteModal").collapse(); 
        wixWindow.scrollTo(0, 0); 
    });

    // --- INVITE MODAL LOGIC: SEND (EMAIL QUEUE VERSION) ---
    $w("#btnSendInvite").onClick(async () => {
        const tasterPicker = $w("#tasterDate").value;
        const regPicker = $w("#regDate").value;
        const playerType = $w("#regPlayertype").value;

        // Validate all three fields
        if (!tasterPicker || !regPicker || !playerType) {
            $w("#btnSendInvite").label = "Fill all fields!";
            setTimeout(() => $w("#btnSendInvite").label = "Send Registration Link", 2000);
            return;
        }

        $w("#btnSendInvite").disable();
        $w("#btnSendInvite").label = "Saving & Sending...";

        try {
            let updateData = cleanItemForUpdate(pendingInviteItem);
            
            const tasterStr = `${tasterPicker.getFullYear()}-${String(tasterPicker.getMonth() + 1).padStart(2, '0')}-${String(tasterPicker.getDate()).padStart(2, '0')}`;
            const regStr = `${regPicker.getFullYear()}-${String(regPicker.getMonth() + 1).padStart(2, '0')}-${String(regPicker.getDate()).padStart(2, '0')}`;
            
            updateData.firstTasterDate = tasterStr;
            updateData.registrationDate = regStr;
            updateData.SP_status = INVITED_STATUS_ID; 
            updateData.SP_trainingOnly = (playerType === "true");

            // --- GENERATE TOKEN & BUILD LINK ---
            const token = generateRandomToken(16);
            updateData.inviteToken = token; 
            updateData.registrationLink = `https://www.signolathleticjfc.co.uk/secure-registration?token=${token}`;

            // 1. Update the Main Player Database (This updates your UI)
            await wixData.update("SignolPlayers", updateData);

            // 2. THE NEW QUEUE: Send the exact data to the EmailQueue
            const queuePayload = { 
                parentEmail: updateData.parentEmail,
                parentName: updateData.parentsName,
                childName: updateData.SP_firstName,
                registrationLink: updateData.registrationLink
            };
            
            // 3. THIS insert safely triggers the Wix Automation!
            await wixData.insert("EmailQueue", queuePayload);

            // 4. Reset UI
            pendingInviteItem = null;
            $w("#inviteModal").collapse(); 
            $w("#btnSendInvite").enable();
            $w("#btnSendInvite").label = "Send Registration Link";
            
            await loadTrials(); 
            await loadSquad(); 
            wixWindow.scrollTo(0, 0);

        } catch (err) {
            console.error("Failed to process invite:", err);
            $w("#btnSendInvite").enable();
            $w("#btnSendInvite").label = "Error. Try Again.";
        }
    });

    // --- PROFILE MODAL: CLOSE BUTTON ('X' BUTTON) ---
    $w("#btnCloseProfile").onClick(() => {
        selectedProfileItem = null;
        $w("#playerProfileModal").collapse();
        wixWindow.scrollTo(0, 0);
    });

    // --- PROFILE MODAL: MAKE A LEAVER LOGIC ---
    $w("#btnMakeLeaver").onClick(async () => {
        if (!isConfirmingProfileLeave) {
            isConfirmingProfileLeave = true;
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
            let updateData = cleanItemForUpdate(selectedProfileItem);
            
            const leaveDateStr = `${leaveDatePicker.getFullYear()}-${String(leaveDatePicker.getMonth() + 1).padStart(2, '0')}-${String(leaveDatePicker.getDate()).padStart(2, '0')}`;
            
            updateData.SP_status = LEFT_STATUS_ID;
            updateData.SP_team = null; 
            updateData.leaveReason = reason;
            updateData.SPleavingDate = leaveDateStr; 
            
            await wixData.update("SignolPlayers", updateData);
            
            isConfirmingProfileLeave = false;
            $w("#dropdownLeaveReason").collapse();
            $w("#datePickerLeave").collapse();
            
            $w("#btnMakeLeaver").enable();
            $w("#btnMakeLeaver").label = "MAKE A LEAVER >";
            
            selectedProfileItem = null;
            $w("#playerProfileModal").collapse();
            
            await loadSquad(); 
            wixWindow.scrollTo(0, 0);
            
        } catch (err) {
            console.error("Failed to archive player from profile:", err);
            $w("#btnMakeLeaver").enable();
            $w("#btnMakeLeaver").label = "Error. Try Again.";
        }
    });
});

// --- HELPER FUNCTION ---
function cleanItemForUpdate(item) {
    if (item.SP_relationship && item.SP_relationship._id) item.SP_relationship = item.SP_relationship._id;
    if (item.ageGroup && item.ageGroup._id) item.ageGroup = item.ageGroup._id;
    if (item.SP_emergContactRelationship && item.SP_emergContactRelationship._id) item.SP_emergContactRelationship = item.SP_emergContactRelationship._id; 
    return item;
}

// --- CONTEXT LOADING ---
async function getManagerContext() {
    try {
        const member = await currentMember.getMember();
        if (!member) return;

        const staffRecord = await wixData.query("SignolStaff")
            .eq("memberId", member._id)
            .include("SS_team") 
            .find();
            
        if (staffRecord.items.length > 0 && staffRecord.items[0].SS_team) {
            const myTeams = staffRecord.items[0].SS_team;
            const assignedTeam = Array.isArray(myTeams) ? myTeams[0] : myTeams;
            
            if (assignedTeam) {
                managerTeamId = assignedTeam._id;
                managerAgeGroupId = assignedTeam.AG_ageGroup; 
            }
        }
    } catch (err) {
        console.error("Error fetching manager context:", err);
    }
}

// --- REPEATER 1: ENQUIRIES ---
async function loadEnquiries() {
    try {
        const results = await wixData.query("SignolPlayers")
            .eq("SP_status", ENQUIRY_STATUS_ID)
            .eq("ageGroup", managerAgeGroupId) 
            .include("SP_relationship", "ageGroup", "SP_emergContactRelationship") 
            .descending("_createdDate")
            .find();
            
        $w("#enquiry").data = results.items;
        
        if (results.items.length === 0) {
            $w("#enquiry").hide();
        } else {
            $w("#enquiry").show();
        }
    } catch (err) {
        console.error("Error loading enquiries:", err);
    }
}

$w("#enquiry").onItemReady(($item, itemData, index) => {
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
            updateData.SP_team = managerTeamId; 
            
            await wixData.update("SignolPlayers", updateData);
            
            await loadEnquiries(); 
            await loadTrials();
        } catch (err) {
            console.error("Failed to update status:", err);
            $item("#accept").enable();
            $item("#accept").label = "Error";
        }
    });
});

// --- REPEATER 2: TRIALS ---
async function loadTrials() {
    try {
        const results = await wixData.query("SignolPlayers")
            .eq("SP_status", TRIAL_STATUS_ID)
            .eq("SP_team", managerTeamId) 
            .include("SP_relationship", "ageGroup", "SP_emergContactRelationship")
            .descending("_updatedDate")
            .find();
            
        $w("#trialRepeater").data = results.items;
        
        if (results.items.length === 0) {
            $w("#trialRepeater").hide();
        } else {
            $w("#trialRepeater").show();
        }
    } catch (err) {
        console.error("Error loading trials:", err);
    }
}

$w("#trialRepeater").onItemReady(($item, itemData, index) => {
    $item("#tfirstname").text = itemData.SP_firstName || "N/A";
    $item("#tlastname").text = itemData.SP_lastName || "N/A";
    $item("#tparentname").text = itemData.parentsName || "N/A";
    $item("#tparentemail").text = itemData.parentEmail || "N/A";
    $item("#tparentmobile").text = itemData.parentPhone || "N/A";

    $item("#leaveReasonDropdown").options = leaveReasonOptions;
    let isConfirmingLeave = false; 

    $item("#invite").onClick(() => {
        pendingInviteItem = itemData; 
        
        $w("#reviewPlayerName").text = `${itemData.SP_firstName || ""} ${itemData.SP_lastName || ""}`;
        $w("#reviewParentName").text = itemData.parentsName || "No Parent Name Found";
        $w("#reviewParentEmail").text = itemData.parentEmail || "No Email Found";

        $w("#tasterDate").value = null;
        $w("#regDate").value = null;
        
        // Reset the radio button so it's fresh for the next invite!
        $w("#regPlayertype").value = null; 
        
        $w("#inviteModal").expand(); 
        wixWindow.scrollTo(0, 0); 
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

// --- REPEATER 3: SQUAD LIST & METRICS ---
async function loadSquad() {
    try {
        const results = await wixData.query("SignolPlayers")
            .eq("SP_team", managerTeamId) 
            .ne("SP_status", LEFT_STATUS_ID) 
            .include("SP_relationship", "ageGroup", "SP_emergContactRelationship")
            .descending("_updatedDate")
            .find();
            
        const players = results.items.filter(p => 
            p.SP_status !== TRIAL_STATUS_ID && 
            p.SP_status !== ENQUIRY_STATUS_ID
        );

        // --- SORT BY STATUS HIERARCHY ---
        players.sort((a, b) => {
            const orderA = STATUS_SORT_ORDER[a.SP_status] || 99;
            const orderB = STATUS_SORT_ORDER[b.SP_status] || 99;
            return orderA - orderB;
        });

        $w("#squadRepeater").data = players;
        
        // --- DYNAMIC COUNTS ---
        const totalAssigned = players.length;
        $w("#filterAssigned").text = `Assigned: ${totalAssigned}`;

        const totalPlaying = players.filter(p => p.SP_status === Active_ID && p.SP_trainingOnly !== true).length;
        $w("#filterPlaying").text = `Playing: ${totalPlaying}`;
        
        const totalTrainingOnly = players.filter(p => p.SP_status === Active_ID && p.SP_trainingOnly === true).length;
        $w("#filterTraining").text = `Training Only: ${totalTrainingOnly}`;
        
        const totalOnboarding = players.filter(p => p.SP_status !== Active_ID).length;
        $w("#filterOnboarding").text = `Onboarding: ${totalOnboarding}`;
        
        if (players.length === 0) {
            $w("#squadRepeater").hide();
        } else {
            $w("#squadRepeater").show();
        }
        
    } catch (err) {
        console.error("Error loading squad data and calculating metrics:", err);
    }
}

// --- SQUAD REPEATER UI MAPPING ---
$w("#squadRepeater").onItemReady(($item, itemData, index) => {
    
    $item("#rowFirstName").text = itemData.SP_firstName || "N/A";
    $item("#rowParentName").text = itemData.parentsName || "N/A";
    $item("#rowParentMobile").text = itemData.parentPhone || "N/A";

    // 1. The Medical Badge Logic 
    const medicalBadge = $item("#rowMedicalBadge");
    let cleanMedical = itemData.SP_medicalInfo ? itemData.SP_medicalInfo.replace(/<[^>]*>?/gm, '').trim() : "";

    if (!cleanMedical || cleanMedical === "") {
        medicalBadge.text = "Clear";
        medicalBadge.style.backgroundColor = "#22C55E"; // Green
        medicalBadge.style.color = "#22C55E";
    } else {
        medicalBadge.text = "ALERT";
        medicalBadge.style.backgroundColor = "#F59E0B"; // Amber
        medicalBadge.style.color = "#F59E0B"; 
    }

    // 2. The Playing Type Badge Logic
    const trainingBadge = $item("#rowTrainingBadge");
    if (itemData.SP_trainingOnly === true) {
        trainingBadge.text = "Training Only";
        trainingBadge.style.backgroundColor = "#3B82F6"; 
        trainingBadge.style.color = "#3B82F6"; 
        trainingBadge.show(); 
    } else {
        trainingBadge.text = "Playing";
        trainingBadge.style.backgroundColor = "#7c8ca6"; 
        trainingBadge.style.color = "#7c8ca6"; 
        trainingBadge.show(); 
    }

    // 3. The Status Badge Logic 
    const statusBadge = $item("#rowStatusBadge");
    if (itemData.SP_status === Active_ID) {
        statusBadge.text = "Active Squad";
        statusBadge.style.backgroundColor = "#22C55E"; // Green
        statusBadge.style.color = "#22C55E";
    } else {
        // Handle the different onboarding/renewal states
        if (itemData.SP_status === INVITED_STATUS_ID) {
            statusBadge.text = "Awaiting Parent (New)";
        } else if (itemData.SP_status === RENEWAL_STATUS_ID) {
            statusBadge.text = "Renewal Required";
        } else if (itemData.SP_status === READY_FOR_FA_ID) {
            statusBadge.text = "Pending FA Reg";
        } else {
            statusBadge.text = "ONBOARDING";
        }
        
        // Apply Amber alert styling to all non-active states
        statusBadge.style.backgroundColor = "#F59E0B";
        statusBadge.style.color = "#F59E0B";
    }

    // 4. Open Detail Modal & Map Data
    $item("#btnOpenProfile").onClick(() => {
        selectedProfileItem = itemData; 
        
        // --- CORE INFO ---
        $w("#detailFirstName").text = itemData.SP_firstName || "N/A";
        $w("#detailLastName").text = itemData.SP_lastName || "N/A";
        $w("#detailFAN").text = itemData.fanNumber || "Pending";
        $w("#detailDOB").text = itemData.SP_dob || "N/A";

        // --- PARENT INFO ---
        $w("#detailParentName").text = itemData.parentsName || "N/A";
        $w("#detailParentMobile").text = itemData.parentPhone || "N/A";
        $w("#detailParentEmail").text = itemData.parentEmail || "N/A";
        $w("#detailParentRelation").text = itemData.SP_relationship ? itemData.SP_relationship.label || "N/A" : "N/A";

        // --- EMERGENCY INFO ---
        $w("#detailEmergencyName").text = itemData.emergencyContact || "N/A";
        $w("#detailEmergencyMobile").text = itemData.emergencyNumber || "N/A";
        $w("#detailEmergencyRelation").text = itemData.SP_emergContactRelationship ? itemData.SP_emergContactRelationship.label || "N/A" : "N/A";

        // --- MEDICAL, MISC & PLAYING TYPE ---
        $w("#detailMedicalBox").text = cleanMedical === "" ? "No medical conditions declared." : cleanMedical;
        
        $w("#detailSocialMedia").text = itemData.socialMediaConsent === true ? "Consent Given" : "Declined";
        $w("#detailPlayertype").text = itemData.SP_trainingOnly === true ? "Training Only" : "Playing";

        $w("#detailStatusDisplay").text = statusBadge.text;

        // --- RESET LEAVER UI ---
        isConfirmingProfileLeave = false;
        $w("#dropdownLeaveReason").collapse();
        $w("#dropdownLeaveReason").value = null;
        $w("#datePickerLeave").collapse();
        $w("#datePickerLeave").value = null;
        
        $w("#btnMakeLeaver").label = "MAKE A LEAVER >";
        $w("#btnMakeLeaver").enable();
        
        $w("#dropdownLeaveReason").options = leaveReasonOptions;

        $w("#playerProfileModal").expand();
        wixWindow.scrollTo(0, 0); 
    });
});

// --- HELPER FUNCTION: GENERATE TOKEN ---
function generateRandomToken(length) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}