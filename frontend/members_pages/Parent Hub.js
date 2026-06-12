    // ==========================================
    // IMPORTS & GLOBAL VARIABLES
    // ==========================================
    import { currentMember } from 'wix-members-frontend';
    import wixData from 'wix-data';
    import wixLocationFrontend from 'wix-location-frontend';
    import { hubEmailSweep, secureUpdatePlayerRegistration } from 'backend/registration.jsw';
    import { getTeamManager } from 'backend/staffData.jsw';
    let currentPlayerId = "";

    const PARENT_ROLE_ID = "de5fbcdb-2777-4dfa-aa43-5475aa87905d";
    const ENQUIRY_STATUS_ID = "e4c79abb-e591-44c3-98a9-e111f276bdd2";
    const TRIAL_STATUS_ID = "5f21b19d-878a-4042-a8ec-c1c0a66812b9";
    const LEFT_STATUS_ID = "d78cb8b0-3b3b-4439-b889-fd36dc434781";
    const INVITED_STATUS_ID = "184b5a98-37c8-41a6-bc58-5a1c17827f04";
    const READY_FOR_FA_ID = "95978c83-70fc-4bd7-bd75-12f43216a0d7";
    const DRAFT_STATUS_ID = "ad6fe8f3-c82e-45ae-b688-89d53c3f0a9f";
    const FA_COMPLETE_ID = "af2bef8c-1caa-4bf8-8dce-321d19723741";
    const Active_ID = "705c0b66-d5d5-47b6-b828-98a94c670f1f";
    const RENEWAL_STATUS_ID = "4d354c43-c893-4bc8-8415-18cfc32b3236";

    let activePlayerContext = null;
    let currentParentProfileId = null;

    // ==========================================
    // INITIALIZATION & EVENT LISTENERS
    // ==========================================
    $w.onReady(async function () {
        try {
            const member = await currentMember.getMember();
            if (!member) return wixLocationFrontend.to("/");

            await hubEmailSweep(member._id, member.loginEmail, PARENT_ROLE_ID);
            const profileResults = await wixData.query("ParentProfiles").eq("memberId", member._id).find();

            if (profileResults.items.length > 0) {
                const profile = profileResults.items[0];
                currentParentProfileId = profile._id;
                const formattedName = profile.PP_fullName.charAt(0).toUpperCase() + profile.PP_fullName.slice(1);
                $w("#textWelcome").text = `Welcome back,\n${formattedName}`;

                await loadDashboard(currentParentProfileId);
            }

            // BACK BUTTONS
            $w("#btnBackToHubReg").onClick(async () => {
                // Give visual feedback that it's thinking
                $w("#btnBackToHubReg").disable();
                $w("#btnBackToHubReg").label = "Loading Dashboard...";

                // Fetch the fresh data (including any new photos) from the database!
                await loadDashboard(currentParentProfileId);

                activePlayerContext = null;
                $w("#stateboxHub").changeState("stateDashboard");

                // Reset the back button for next time
                $w("#btnBackToHubReg").label = "< Back to Dashboard";
                $w("#btnBackToHubReg").enable();
            });

            $w("#btnBackToHubProfile").onClick(async () => {
                await loadDashboard(currentParentProfileId);
                activePlayerContext = null;
                $w("#stateboxHub").changeState("stateDashboard");
            });

            // UI Toggles
            $w("#regadd2parents").onChange(() => {
                if ($w("#regadd2parents").value === "Yes") {
                    $w("#regsecparentname, #regsecparentmobile, #regsecparentemail, #regsecparentrelation, #b1, #b2, #b3, #b4").expand();
                } else {
                    $w("#regsecparentname, #regsecparentmobile, #regsecparentemail, #regsecparentrelation, #b1, #b2, #b3, #b4").collapse();
                    $w("#regsecparentname, #regsecparentmobile, #regsecparentemail, #regsecparentrelation").value = null;
                }
                calculateProgress();
            });

            $w("#medicalyn").onChange(() => {
                if ($w("#medicalyn").value === "true") {
                    $w("#regmedical, #b5").expand();
                } else {
                    $w("#regmedical, #b5").collapse();
                    $w("#regmedical").value = null;
                }
                calculateProgress();
            });

            $w("#chkConfirm").onChange(() => {
                if ($w("#chkConfirm").checked) {
                    $w("#inputSignature").expand();
                } else {
                    $w("#inputSignature").collapse();
                    $w("#inputSignature").value = "";
                    $w("#btnSubmitFinal").collapse();
                }
            });

            $w("#inputSignature").onChange(() => {
                if ($w("#inputSignature").value.length > 2) {
                    $w("#btnSubmitFinal").expand();
                } else {
                    $w("#btnSubmitFinal").collapse();
                }
            });

            $w("TextInput, Dropdown, RadioGroup, Checkbox, DatePicker, RichTextBox, UploadButton").onChange(() => {
                calculateProgress();
            });

        } catch (err) {
            console.error("Hub init failed:", err);
        }
    });

    // ==========================================
    // STATE 1: DASHBOARD LOGIC
    // ==========================================
   async function loadDashboard(parentProfileId) {
    try {
        // 1. Create two separate queries
        const primaryQuery = wixData.query("SignolPlayers").eq("primaryParentId", parentProfileId);
        const secondaryQuery = wixData.query("SignolPlayers").eq("secondaryParentId", parentProfileId);

        // 2. Use .or() to combine them
        const kidsResults = await primaryQuery.or(secondaryQuery)
            .include("SP_team", "ageGroup")
            .find();

        const visibleKids = kidsResults.items.filter(kid => kid.SP_status !== LEFT_STATUS_ID);

        // Clear repeater
        $w("#repeaterKids").data = [];

        if (visibleKids.length === 0) {
            $w("#repeaterKids").collapse();
            $w("#boxAlert").collapse();
            $w("#textNoKids").expand();
            return;
        } else {
            $w("#textNoKids").collapse();
            $w("#repeaterKids").expand();
        }

        const actionRequiredKids = visibleKids.filter(kid =>
            kid.SP_status === INVITED_STATUS_ID ||
            kid.SP_status === RENEWAL_STATUS_ID ||
            kid.SP_status === DRAFT_STATUS_ID
        );

        if (actionRequiredKids.length > 0) {
            $w("#textAlertMsg").text = `⚠️ Action Required: You have ${actionRequiredKids.length} outstanding registration form(s) to complete.`;
            $w("#boxAlert").expand();
        } else {
            $w("#boxAlert").collapse();
        }

        $w("#repeaterKids").data = visibleKids;
    } catch (err) {
        console.error("Failed to load dashboard data:", err);
    }
}

    $w("#repeaterKids").onItemReady(($item, itemData) => {
        $item("#textKidName").text = `${itemData.SP_firstName} ${itemData.SP_lastName}`;
        $item("#textSquad").text = (itemData.SP_team && itemData.SP_team.T_teamName) ? itemData.SP_team.T_teamName : "Squad Unassigned";

        // Headshot Mapping Logic
        if (itemData.SP_idPhoto) {
            $item("#headshot").src = itemData.SP_idPhoto;
            $item("#headshot").expand();
        } else {
            $item("#headshot").src = "https://static.wixstatic.com/media/c837a6_ba0353c713b1456da871eb329a4358d3~mv2.png";
        }

        // UPDATED: Precise Status & Button Routing
        switch (itemData.SP_status) {
        case INVITED_STATUS_ID:
            $item("#textStatus").text = "Registration Required";
            $item("#textStatus").style.color = "#F59E0B";
            $item("#btnAction").label = "Register Now";
            break;

        case RENEWAL_STATUS_ID:
            $item("#textStatus").text = "Annual Renewal Required";
            $item("#textStatus").style.color = "#F59E0B";
            $item("#btnAction").label = "Update Forms";
            break;

        case DRAFT_STATUS_ID: // NEW: Draft UI
            $item("#textStatus").text = "Draft In Progress";
            $item("#textStatus").style.color = "#F59E0B";
            $item("#btnAction").label = "Resume Form";
            break;

        case READY_FOR_FA_ID: // "95978c83-70fc-4bd7-bd75-12f43216a0d7"
            $item("#textStatus").text = "Pending FA Registration";
            $item("#textStatus").style.color = "#3B82F6"; // Blue
            $item("#btnAction").label = "View Profile";
            break;

        case FA_COMPLETE_ID: // "af2bef8c-1caa-4bf8-8dce-321d19723741"
            $item("#textStatus").text = "Pending Club Process";
            $item("#textStatus").style.color = "#8B5CF6"; // Purple
            $item("#btnAction").label = "View Profile";
            break;

        case Active_ID: // "705c0b66-d5d5-47b6-b828-98a94c670f1f"
            $item("#textStatus").text = "Active";
            $item("#textStatus").style.color = "#22C55E"; // Green
            $item("#btnAction").label = "View Profile";
            break;

        default:
            $item("#textStatus").text = "Processing";
            $item("#textStatus").style.color = "#9CA3AF"; // Grey
            $item("#btnAction").label = "View Profile";
            break;
        }

        // Button Click Logic
        $item("#btnAction").onClick(async () => {
            try {
                // 1. Capture the original text (e.g., "Resume Form", "Register Now")
                const originalLabel = $item("#btnAction").label;

                // Disable button briefly to prevent double-clicks while it saves
                $item("#btnAction").disable();
                $item("#btnAction").label = "Loading...";

                activePlayerContext = itemData;

                // Allow New, Renewals, AND Drafts to access the editable form
                if (itemData.SP_status === INVITED_STATUS_ID ||
                    itemData.SP_status === RENEWAL_STATUS_ID ||
                    itemData.SP_status === DRAFT_STATUS_ID) {

                    // NEW: Change to Draft immediately upon opening the form!
                    if (activePlayerContext.SP_status === INVITED_STATUS_ID || activePlayerContext.SP_status === RENEWAL_STATUS_ID) {
                        activePlayerContext.SP_status = DRAFT_STATUS_ID;
                        // Securely push this status change to the database right now
                        await secureUpdatePlayerRegistration(activePlayerContext, currentParentProfileId);
                    }

                    await loadRegistrationForm(activePlayerContext);
                    $w("#stateboxHub").changeState("stateRegistration");
                } else {
                    // Every other status opens the Read-Only Profile View
                    loadProfileForm(activePlayerContext);
                    $w("#stateboxHub").changeState("stateProfile");
                }

                // 2. Put the original text back and re-enable!
                $item("#btnAction").label = originalLabel;
                $item("#btnAction").enable();

            } catch (error) {
                console.error("Failed to load state. Reason:", error);
                $item("#btnAction").label = "Error";
                $item("#btnAction").enable();
            }
        });

    });

    // ==========================================
    // STATE 2: REGISTRATION FORM LOGIC
    // ==========================================
    async function loadRegistrationForm(player) {
        await loadDictionaryDropdowns();

        $w("#regfullname").text = `${player.SP_firstName} ${player.SP_lastName}`;
        $w("#regfirstName").text = player.SP_firstName;
        $w("#reglastName").text = player.SP_lastName;
        $w("#regfan").text = player.SP_fanNumber ? player.SP_fanNumber : "(In Progress)";

        if (player.ageGroup && player.ageGroup.AG_ageGroup) {
            $w("#regagegroup").text = player.ageGroup.AG_ageGroup;
        } else {
            $w("#regagegroup").text = "Unassigned";
        }

        if (player.SP_team) {
            $w("#regteamname").text = player.SP_team.T_teamName || "Unassigned";
            let teamId = typeof player.SP_team === 'string' ? player.SP_team : player.SP_team._id;

            getTeamManager(teamId).then((managerData) => {
                if (managerData && managerData.fullName) {
                    $w("#regmanagername").text = managerData.fullName;
                } else {
                    $w("#regmanagername").text = "TBD";
                }
            }).catch(err => {
                console.error("Backend Manager Lookup Error:", err);
                $w("#regmanagername").text = "TBD (Error)";
            });
        } else {
            $w("#regteamname").text = "Squad Unassigned";
            $w("#regmanagername").text = "TBD";
        }

        $w("#regparentname").text = player.parentsName || "Parent Name Missing";
        $w("#regparentmobile").text = player.parentPhone || "Phone Missing";
        $w("#regparentemail").text = player.parentEmail || "Email Missing";

        if (player.SP_dob) {
            $w("#regDOB").value = new Date(player.SP_dob);
        }

        if (player.mainAddress) $w("#regAddress").value = player.mainAddress;
        if (player.SP_initials) $w("#reginitials").value = player.SP_initials;
        if (player.SP_emergContactName) $w("#regemergencycontact").value = player.SP_emergContactName;
        if (player.SP_emergContactNumber) $w("#regemergencycontactmobile").value = player.SP_emergContactNumber;

        if (player.SP_shirtSize) $w("#regshirtsize").value = player.SP_shirtSize;
        if (player.SP_shortSize) $w("#regshortsize").value = player.SP_shortSize;
        if (player.SP_coatSize) $w("#regcoatsize").value = player.SP_coatSize;
        if (player.SP_hoodieSize) $w("#reghoodiesize").value = player.SP_hoodieSize;
        if (player.SP_socksize) $w("#regsocksize").value = player.SP_socksize;
        if (player.SP_relationship) $w("#regparentrelation").value = player.SP_relationship;
        if (player.SP_emergContactRelationship) $w("#regemergencycontactrelatoin").value = player.SP_emergContactRelationship;

        $w("#regsocialmedia").value = player.socialMedia ? "true" : "false";
        $w("#regbothparents").value = player.livesWithBothParents ? "true" : "false";
        $w("#regplayertype").value = player.SP_trainingOnly ? "true" : "false";

        if (player.SP_hasMedical === true) {
            $w("#medicalyn").value = "true";
            $w("#regmedical").value = player.SP_medicalInfo;
            $w("#regmedical").expand();
        } else if (player.SP_hasMedical === false) {
            $w("#medicalyn").value = "false";
            $w("#regmedical").collapse();
        }

        if (player.secondaryParentName) {
            $w("#regadd2parents").value = "Yes";
            $w("#regsecparentname").value = player.secondaryParentName;
            $w("#regsecparentmobile").value = player.secondaryParentMobile;
            $w("#regsecparentemail").value = player.secondaryParentEmail;
            if (player.secondaryParentRelation) $w("#regsecparentrelation").value = player.secondaryParentRelation;
            $w("#regsecparentname, #regsecparentmobile, #regsecparentemail, #regsecparentrelation").expand();
        } else {
            $w("#regadd2parents").value = "No";
            $w("#regsecparentname, #regsecparentmobile, #regsecparentemail, #regsecparentrelation").collapse();
        }

        if (player.SP_idPhoto) {
            $w("#regheadshot").buttonLabel = "Photo Saved ✓";
        } else {
            $w("#regheadshot").buttonLabel = "Upload Headshot";
        }

        if (player.SP_idDocument) {
            $w("#regpaperid").buttonLabel = "ID Saved ✓";
        } else {
            $w("#regpaperid").buttonLabel = "Upload ID Document";
        }

        $w("#chkParentConduct").checked = player.registrationConductParent || false;
        $w("#chkPlayerConduct").checked = player.registrationConductPlayer || false;

        $w("#chkConfirm").collapse();
        $w("#inputSignature").collapse();
        $w("#btnSubmitFinal").collapse();

        calculateProgress();
    }

    async function loadDictionaryDropdowns() {
        try {
            const dictResults = await wixData.query("ClubDictionary").limit(1000).find();
            const items = dictResults.items;
            const buildOptions = (categoryName) => {
                return items.filter(item => item.category === categoryName).map(item => ({ label: item.title || item.label, value: item._id }));
            };
            $w("#regshirtsize").options = buildOptions("shirt_size");
            $w("#regshortsize").options = buildOptions("shorts_size");
            $w("#regcoatsize").options = buildOptions("coat_size");
            $w("#reghoodiesize").options = buildOptions("hoodie_size");
            $w("#regsocksize").options = buildOptions("sock_size");
            $w("#regparentrelation").options = buildOptions("relationship");
            $w("#regsecparentrelation").options = buildOptions("relationship");
            $w("#regemergencycontactrelatoin").options = buildOptions("relationship");
        } catch (err) {
            console.error("Failed to load dictionary:", err);
        }
    }

    function calculateProgress() {
        let baseTotalFields = 17;
        let completedFields = 0;

        if ($w("#regDOB").value) completedFields++;
        if ($w("#regAddress").value) completedFields++;
        if ($w("#regshirtsize").value) completedFields++;
        if ($w("#regshortsize").value) completedFields++;
        if ($w("#regcoatsize").value) completedFields++;
        if ($w("#reghoodiesize").value) completedFields++;
        if ($w("#regsocksize").value) completedFields++;
        if ($w("#regemergencycontact").value) completedFields++;
        if ($w("#regemergencycontactmobile").value) completedFields++;
        if ($w("#regemergencycontactrelatoin").value) completedFields++;
        if ($w("#regparentrelation").value) completedFields++;

        if ($w("#medicalyn").value === "true" && $w("#regmedical").value) {
            completedFields++;
        } else if ($w("#medicalyn").value === "false") {
            completedFields++;
        }

        if ($w("#regsocialmedia").value) completedFields++;
        if ($w("#chkParentConduct").checked) completedFields++;
        if ($w("#chkPlayerConduct").checked) completedFields++;

        if ($w("#regheadshot").value.length > 0 || (activePlayerContext && activePlayerContext.SP_idPhoto)) {
            completedFields++;
        }
        if ($w("#regpaperid").value.length > 0 || (activePlayerContext && activePlayerContext.SP_idDocument)) {
            completedFields++;
        }

        if ($w("#regadd2parents").value === "Yes") {
            baseTotalFields += 4;
            if ($w("#regsecparentname").value) completedFields++;
            if ($w("#regsecparentmobile").value) completedFields++;
            if ($w("#regsecparentemail").value) completedFields++;
            if ($w("#regsecparentrelation").value) completedFields++;
        }

        let percentage = Math.round((completedFields / baseTotalFields) * 100);
        if (percentage > 100) percentage = 100;

        $w("#textProgress").text = `Registration: ${percentage}% Complete`;

        if (percentage === 100) {
            $w("#chkConfirm").expand();
        } else {
            $w("#chkConfirm").collapse();
            $w("#chkConfirm").checked = false;
            $w("#inputSignature").collapse();
            $w("#inputSignature").value = "";
            $w("#btnSubmitFinal").collapse();
        }
    }

    async function handleFileUploads(playerData) {
        if ($w("#regheadshot").value.length > 0) {
            const headshotUpload = await $w("#regheadshot").uploadFiles();
            playerData.SP_idPhoto = headshotUpload[0].fileUrl;
        }
        if ($w("#regpaperid").value.length > 0) {
            const idUpload = await $w("#regpaperid").uploadFiles();
            playerData.SP_idDocument = idUpload[0].fileUrl;
        }
        return playerData;
    }

    function mapUItoPlayer(playerData) {
        if ($w("#regDOB").value) {
            const pickerDate = $w("#regDOB").value;
            const dobStr = `${pickerDate.getFullYear()}-${String(pickerDate.getMonth() + 1).padStart(2, '0')}-${String(pickerDate.getDate()).padStart(2, '0')}`;
            playerData.SP_dob = dobStr;
        }

        playerData.mainAddress = $w("#regAddress").value;
        playerData.SP_initials = $w("#reginitials").value;
        playerData.SP_emergContactName = $w("#regemergencycontact").value;
        playerData.SP_emergContactNumber = $w("#regemergencycontactmobile").value;

        playerData.SP_shirtSize = $w("#regshirtsize").value;
        playerData.SP_shortSize = $w("#regshortsize").value;
        playerData.SP_coatSize = $w("#regcoatsize").value;
        playerData.SP_hoodieSize = $w("#reghoodiesize").value;
        playerData.SP_socksize = $w("#regsocksize").value;
        playerData.SP_relationship = $w("#regparentrelation").value;
        playerData.SP_emergContactRelationship = $w("#regemergencycontactrelatoin").value;

        playerData.socialMedia = $w("#regsocialmedia").value === "true";
        playerData.livesWithBothParents = $w("#regbothparents").value === "true";
        playerData.SP_trainingOnly = $w("#regplayertype").value === "true";

        playerData.SP_hasMedical = $w("#medicalyn").value === "true";
        if (playerData.SP_hasMedical) {
            playerData.SP_medicalInfo = $w("#regmedical").value;
        } else {
            playerData.SP_medicalInfo = null;
        }

        if ($w("#regadd2parents").value === "Yes") {
            playerData.secondaryParentName = $w("#regsecparentname").value;
            playerData.secondaryParentMobile = $w("#regsecparentmobile").value;
            playerData.secondaryParentEmail = $w("#regsecparentemail").value;
            playerData.secondaryParentRelation = $w("#regsecparentrelation").value;
        } else {
            playerData.secondaryParentName = null;
            playerData.secondaryParentMobile = null;
            playerData.secondaryParentEmail = null;
            playerData.secondaryParentRelation = null;
        }

        playerData.registrationConductParent = $w("#chkParentConduct").checked;
        playerData.registrationConductPlayer = $w("#chkPlayerConduct").checked;
        playerData.registrationConfirmCorrect = $w("#chkConfirm").checked;
        playerData.registrationPrintNameSignature = $w("#inputSignature").value;

        const progressText = $w("#textProgress").text || "0";
        let currentPercentStr = progressText.replace(/\D/g, '');
        playerData.registrationProgress = Number(currentPercentStr);

        return playerData;
    }

    // SECURE SAVE DRAFT
    $w("#btnSaveDraft").onClick(async () => {
        $w("#btnSaveDraft").label = "Saving Draft securely...";
        $w("#btnSaveDraft").disable();

        let playerToUpdate = mapUItoPlayer(activePlayerContext);
        playerToUpdate = await handleFileUploads(playerToUpdate);

        const response = await secureUpdatePlayerRegistration(playerToUpdate, currentParentProfileId);

        if (response.success) {
            $w("#btnSaveDraft").label = "Saved Successfully";
        } else {
            $w("#btnSaveDraft").label = "Error Saving";
            console.error(response.error);
        }

        setTimeout(() => {
            $w("#btnSaveDraft").label = "Save Draft";
            $w("#btnSaveDraft").enable();
        }, 2000);
    });

    // SECURE FINAL SUBMIT
    $w("#btnSubmitFinal").onClick(async () => {
        $w("#btnSubmitFinal").label = "Encrypting & Submitting...";
        $w("#btnSubmitFinal").disable();

        let playerToUpdate = mapUItoPlayer(activePlayerContext);
        playerToUpdate = await handleFileUploads(playerToUpdate);

        playerToUpdate.registrationDateTimeStampSigned = new Date();
        playerToUpdate.SP_status = READY_FOR_FA_ID;

        const response = await secureUpdatePlayerRegistration(playerToUpdate, currentParentProfileId);

        if (response.success) {
            await loadDashboard(currentParentProfileId);
            activePlayerContext = null;
            $w("#stateboxHub").changeState("stateDashboard");
            $w("#btnSubmitFinal").label = "Submit Form";
            $w("#btnSubmitFinal").enable();
        } else {
            console.error("Secure backend update failed", response.error);
            $w("#btnSubmitFinal").label = "Security Error. Try Again.";
            $w("#btnSubmitFinal").enable();
        }
    });

   // Global variable to hold our dictionary translations
    let clubDictionaryMap = {}; 
  

    $w.onReady(async function () {
        // 1. Load the Dictionary into memory & populate Dropdowns
        await loadDictionaries();

        // 2. Setup Conditional UI Listeners for user clicks
        $w("#radioaddparent").onChange((event) => handleSecondaryParentUI(event.target.value));
        $w("#radioMedical").onChange((event) => handleMedicalUI(event.target.value));
        
        $w("#season").onChange((event) => {
            if (currentPlayerId) {
                loadPlayerStats(currentPlayerId, event.target.value);
            }
        });
    });

    // ==========================================
    // DICTIONARY & DROPDOWN LOADER
    // ==========================================
    async function loadDictionaries() {
        try {
            const dictResults = await wixData.query("ClubDictionary").limit(1000).find();
            
            // Build a Map to translate raw IDs into Text Labels for our Read-Only fields
            dictResults.items.forEach(item => {
                clubDictionaryMap[item._id] = item.title || item.label;
            });

            // Build Options for the actual Dropdowns
            const buildOptions = (categoryName) => {
                return dictResults.items
                    .filter(item => item.category === categoryName)
                    .map(item => ({ label: item.title || item.label, value: item._id }));
            };

            $w("#season").options = buildOptions("season");
            $w("#emergeRelation").options = buildOptions("relationship");
        } catch (err) {
            console.error("Failed to load dictionary:", err);
        }
    }

    // ==========================================
    // STATE 3: PROFILE & EDIT VIEW LOGIC
    // ==========================================
    function loadProfileForm(player, currentUserEmail) {
        currentPlayerId = player._id;

        // --- 1. DYNAMIC MANAGER FETCH ---
        if (player.SP_team) {
            // Check if SP_team is an object (included) or a string ID
            const teamId = player.SP_team._id || player.SP_team;
            getTeamManager(teamId).then((managerData) => {
                if (managerData && managerData.fullName) {
                    $w("#profileManager").text = managerData.fullName;
                } else {
                    $w("#profileManager").text = "TBD";
                }
            }).catch(() => $w("#profileManager").text = "TBD");
        } else {
            $w("#profileManager").text = "Squad Unassigned";
        }

        // --- 2. READ-ONLY PROFILE TEXT & MEDIA ---
        $w("#txtProfTeam").text = (player.SP_team && player.SP_team.T_teamName) ? player.SP_team.T_teamName : "Squad Unassigned";
        $w("#txtProfFullName").text = `${player.SP_firstName} ${player.SP_lastName}`;
        $w("#txtProfFan").text = player.SP_fanNumber ? player.SP_fanNumber.toString() : "Pending FA Reg";
        
        if (player.SP_idPhoto) {
            $w("#profileHeadshot").src = player.SP_idPhoto;
        }

        if (player.SP_dob) {
            const dobDate = new Date(player.SP_dob);
            $w("#txtProfDOB").text = dobDate.toLocaleDateString('en-GB'); 
        } else {
            $w("#txtProfDOB").text = "Not Provided";
        }

        // --- 3. SHIRT GRAPHIC / TRAINING STATUS LOGIC ---
        const lastNameUpper = player.SP_lastName ? player.SP_lastName.toUpperCase() : "";

        if (player.SP_trainingOnly === true) {
            $w("#grpTrain").expand();
            $w("#grpPlay").collapse();
            $w("#trainLastname").text = lastNameUpper;
        } else {
            $w("#grpPlay").expand();
            $w("#grpTrain").collapse();
            $w("#txtProfLastName").text = lastNameUpper;
            $w("#txtProfNum").text = player.kitNumber ? player.kitNumber.toString() : "0";
        }

        // --- 4. KIT SIZES & RELATIONSHIPS (Translated via Dictionary Map) ---
        // This looks up the raw ID in our dictionary and returns the Text Label
        $w("#txtShirtSize").text = clubDictionaryMap[player.SP_shirtSize] || "Not Provided";
        $w("#txtShortSize").text = clubDictionaryMap[player.SP_shortSize] || "Not Provided";
        $w("#txtSockSize").text = clubDictionaryMap[player.SP_socksize] || "Not Provided";
        $w("#txtHoodieSize").text = clubDictionaryMap[player.SP_hoodieSize] || "Not Provided"; 
        $w("#txtCoatSize").text = clubDictionaryMap[player.SP_coatSize] || "Not Provided";    
        $w("#txtParentrelation").text = clubDictionaryMap[player.SP_relationship] || "Not Provided";

        // --- 5. PARENT CONTACT (Editable & Locked) ---
        $w("#txtLockedParentName").text = player.parentsName || "Not Provided";
        $w("#txtLockedParentMobile").text = player.parentPhone || "Not Provided";
        $w("#txtLockedParentEmail").value = player.parentEmail || ""; 

        // --- 6. SECONDARY PARENT LOGIC (UI-Only Toggle) ---
        const hasSecondary = player.secondaryParentName ? "Yes" : "No";
        $w("#radioaddparent").value = hasSecondary;
        handleSecondaryParentUI(hasSecondary); 

        $w("#secondparentName").value = player.secondaryParentName || "";
        $w("#secondparentMobile").value = player.secondaryParentMobile || "";
        $w("#secondparentEmail").value = player.secondaryParentEmail || "";
        
        if (player.secondaryParentRelation) {
            $w("#secondparentRelation").value = player.secondaryParentRelation._id || player.secondaryParentRelation;
        }

        // --- 7. EMERGENCY & LOGISTICS (Editable Inputs) ---
        $w("#inputEmergName").value = player.SP_emergContactName || "";
        $w("#inputEmergNumber").value = player.SP_emergContactNumber || "";
        
        if (player.SP_emergContactRelationship) {
            $w("#emergeRelation").value = player.SP_emergContactRelationship._id || player.SP_emergContactRelationship;
        }
        
        // Corrected Address mapping!
        $w("#inputAddress").value = player.mainAddress || ""; 

        // --- 8. BOOLEANS & MEDICAL LOGIC ("true"/"false" values) ---
        $w("#radioBothParents").value = player.livesWithBothParents ? "true" : "false";
        $w("#radioSocialMedia").value = player.socialMedia ? "true" : "false"; 
        
        const hasMedical = player.SP_hasMedical ? "true" : "false";
        $w("#radioMedical").value = hasMedical;
        handleMedicalUI(hasMedical);
        
        if (player.SP_hasMedical) {
            $w("#inputMedicalDetails").value = player.SP_medicalInfo || "";
        } else {
            $w("#inputMedicalDetails").value = "";
        }

        // --- 9. TRIGGER STATS ENGINE ---
        if ($w("#season").value) {
            loadPlayerStats(player._id, $w("#season").value);
        } else {
            $w("#goals").text = "0"; $w("#assist").text = "0"; $w("#tackle").text = "0"; $w("#save").text = "0"; $w("#potm").text = "0";
        }

        console.log("Profile & Edit State successfully mapped for:", player.SP_firstName);

// ==========================================
        // 10. ROLE-BASED ACCESS CONTROL
        // ==========================================
        // Safely extract the ID whether it was populated via .include() or is just a raw string
        const primaryId = player.primaryParentId ? (player.primaryParentId._id || player.primaryParentId) : "";
        
        // Check against your existing global variable
        const isPrimary = (primaryId === currentParentProfileId);

        if (isPrimary) {
            // Unlock Everything (Primary Parent)
            $w("#btnSaveProfileEdits").enable();
            $w("#btnSaveProfileEdits").label = "Save Changes >";
            
            $w("#inputEmergName").enable();
            $w("#inputEmergNumber").enable();
            $w("#emergeRelation").enable();
            $w("#inputAddress").enable();
            $w("#txtLockedParentEmail").enable();
            
            $w("#radioaddparent").enable();
            $w("#secondparentName").enable();
            $w("#secondparentMobile").enable();
            $w("#secondparentEmail").enable();
            $w("#secondparentRelation").enable();
            
            $w("#radioBothParents").enable();
            $w("#radioSocialMedia").enable();
            $w("#radioMedical").enable();
            $w("#inputMedicalDetails").enable();
        } else {
            // Lock Down Everything (Secondary Parent)
            $w("#btnSaveProfileEdits").disable();
            $w("#btnSaveProfileEdits").label = "Secondary Parent - Read Only";
            
            $w("#inputEmergName").disable();
            $w("#inputEmergNumber").disable();
            $w("#emergeRelation").disable();
            $w("#inputAddress").disable();
            $w("#txtLockedParentEmail").disable();
            
            $w("#radioaddparent").disable();
            $w("#secondparentName").disable();
            $w("#secondparentMobile").disable();
            $w("#secondparentEmail").disable();
            $w("#secondparentRelation").disable();
            
            $w("#radioBothParents").disable();
            $w("#radioSocialMedia").disable();
            $w("#radioMedical").disable();
            $w("#inputMedicalDetails").disable();
        }

        console.log("Profile & Edit State successfully mapped for:", player.SP_firstName);
    }
    

    // ==========================================
    // UI STATE HANDLERS
    // ==========================================
    function handleSecondaryParentUI(value) {
        if (value === "Yes") {
            // Expand the outer containers
            $w("#secondparentbox").expand();
            $w("#secondparentmobbox").expand();
            $w("#secondparentEmbox").expand();
            $w("#secondparentrelbox").expand();
            
            // Forcibly expand the inner inputs
            $w("#secondparentName").expand();
            $w("#secondparentMobile").expand();
            $w("#secondparentEmail").expand();
            $w("#secondparentRelation").expand();
        } else {
            // Collapse the outer containers
            $w("#secondparentbox").collapse();
            $w("#secondparentmobbox").collapse();
            $w("#secondparentEmbox").collapse();
            $w("#secondparentrelbox").collapse();
            
            // Forcibly collapse the inner inputs
            $w("#secondparentName").collapse();
            $w("#secondparentMobile").collapse();
            $w("#secondparentEmail").collapse();
            $w("#secondparentRelation").collapse();
        }
    }

    function handleMedicalUI(value) {
        if (value === "true") {
            $w("#box68").expand();                    // Expand the container
            $w("#inputMedicalDetails").expand();      // Expand the input
        } else {
            $w("#box68").collapse();
            $w("#inputMedicalDetails").collapse();
        }
    }

    // ==========================================
    // SECURE SAVE PROFILE EDITS
    // ==========================================
    $w("#btnSaveProfileEdits").onClick(async () => {
        $w("#btnSaveProfileEdits").label = "Saving Changes...";
        $w("#btnSaveProfileEdits").disable();

        // 1. Map editable fields to context
 // --- 6. EMERGENCY & LOGISTICS (Editable Inputs) ---
        activePlayerContext.SP_emergContactName = $w("#inputEmergName").value;
        activePlayerContext.SP_emergContactNumber = $w("#inputEmergNumber").value;
        activePlayerContext.SP_emergContactRelationship = $w("#emergeRelation").value; 
        
        // Map to the correct field
        activePlayerContext.mainAddress = $w("#inputAddress").value;

        // 🚨 THE GHOST BUSTER 🚨
        // This permanently deletes the rogue keys from the payload so Wix stops recreating the column
        delete activePlayerContext.SP_address;
        delete activePlayerContext.SP_Address;

        // Map Secondary Parent Fields
        const hasSecondaryParent = $w("#radioaddparent").value === "Yes";
        if (hasSecondaryParent) {
            activePlayerContext.secondaryParentName = $w("#secondparentName").value;
            activePlayerContext.secondaryParentMobile = $w("#secondparentMobile").value;
            activePlayerContext.secondaryParentEmail = $w("#secondparentEmail").value;
            activePlayerContext.secondaryParentRelation = $w("#secondparentRelation").value;
        } else {
            activePlayerContext.secondaryParentName = null;
            activePlayerContext.secondaryParentMobile = null;
            activePlayerContext.secondaryParentEmail = null;
            activePlayerContext.secondaryParentRelation = null;
        }

        // Map Booleans
        activePlayerContext.livesWithBothParents = $w("#radioBothParents").value === "true";
        activePlayerContext.socialMedia = $w("#radioSocialMedia").value === "true";
        
        // Map Medical
        activePlayerContext.SP_hasMedical = $w("#radioMedical").value === "true";
        if (activePlayerContext.SP_hasMedical) {
            activePlayerContext.SP_medicalInfo = $w("#inputMedicalDetails").value;
        } else {
            activePlayerContext.SP_medicalInfo = null;
        }

        // 2. Push to backend
        const response = await secureUpdatePlayerRegistration(activePlayerContext, currentParentProfileId);

// 3. Handle UI feedback
        if (response.success) {
            $w("#btnSaveProfileEdits").label = "Saved Successfully ✓";
            
            // ⏳ EVENTUAL CONSISTENCY FIX: 
            // Give the Wix database 1.5 seconds to sync the new data before we fetch it again
            setTimeout(() => {
                loadDashboard(currentParentProfileId);
            }, 1500);

        } else {
            console.error("Profile Edit Save Error:", response.error);
            $w("#btnSaveProfileEdits").label = "Error Saving";
        }

        // 4. Reset button
        setTimeout(() => {
            $w("#btnSaveProfileEdits").label = "Save Changes >";
            $w("#btnSaveProfileEdits").enable();
        }, 2000);
    });
    // ==========================================
// DYNAMIC STATS ENGINE
// ==========================================
async function loadPlayerStats(playerId, seasonId) {
    try {
        // 1. Fetch Performance Stats
        const statsRes = await wixData.query("PlayerStats")
            .eq("playerReference", playerId)
            .eq("season", seasonId)
            .find();

        let totalGoals = 0, totalAssists = 0, totalTackles = 0, totalSaves = 0;

        statsRes.items.forEach(stat => {
            totalGoals += (Number(stat.goals) || 0);
            totalAssists += (Number(stat.assists) || 0);
            totalTackles += (Number(stat.tackles) || 0);
            totalSaves += (Number(stat.saves) || 0);
        });

        // Map Aggregations to UI
        $w("#goals").text = totalGoals.toString();
        $w("#assist").text = totalAssists.toString();
        $w("#tackle").text = totalTackles.toString();
        $w("#save").text = totalSaves.toString();

        // 2. Fetch & Count POTM Awards
        const potmRes = await wixData.query("Playerofthematch")
            .eq("playerReference", playerId)
            .eq("season", seasonId)
            .find();

        $w("#potm").text = potmRes.items.length.toString();

    } catch (error) {
        console.error("Error loading player stats:", error);
        $w("#goals").text = "0";
        $w("#assist").text = "0";
        $w("#tackle").text = "0";
        $w("#save").text = "0";
        $w("#potm").text = "0";
    }
} 
