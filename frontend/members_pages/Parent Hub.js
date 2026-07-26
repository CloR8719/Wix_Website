    // ==========================================
    // IMPORTS & GLOBAL VARIABLES
    // ==========================================
    import { currentMember } from 'wix-members-frontend';
    import wixData from 'wix-data';
    import wixLocationFrontend from 'wix-location-frontend';
    import { hubEmailSweep, secureUpdatePlayerRegistration, secureUpdateParentProfile, findPlayerByFanNumberAndDob, confirmPlayerLink, getKidsForParent } from 'backend/registration.jsw';
    import { getTeamManager } from 'backend/staffData.jsw';
    import wixWindow from 'wix-window';
    import { setProgressBarVisible, setProgressBarText, getSaveDraftRequestId, setSaveDraftResult } from 'public/parentHubProgressBar.js';
    let currentPlayerId = "";
    let currentTeamId = "";

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
    // ⚠️ SETUP: paste the ClubDictionary "Action Required" _id here (same GUID as backend).
    const ACTION_REQUIRED_ID = "d5bd1c0f-e19e-4318-a8d3-d5d6fe63b274";

    // Emergency contact source (#regemergencysource) — "new" is the default so an
    // existing draft's independently-entered contact is never silently overwritten.
    const EMERG_SOURCE_PARENT1 = "parent1";
    const EMERG_SOURCE_PARENT2 = "parent2";
    const EMERG_SOURCE_NEW = "new";

    // Mandatory-field highlight colors for the always-visible submit button flow.
    const FIELD_BORDER_INVALID = "#FF4D4D";
    const FIELD_BORDER_DEFAULT = "#E0E0E0";

    let activePlayerContext = null;
    let currentParentProfileId = null;
    // Mirrors calculateProgress()'s last result - mapUItoPlayer reads this instead of
    // #textProgress's on-page text, since that element now lives in the header and
    // can't be $w-selected from this file (see public/parentHubProgressBar.js).
    let lastCalculatedPercentage = 0;

    // ==========================================
    // INITIALIZATION & EVENT LISTENERS
    // ==========================================
    $w.onReady(async function () {
        try {
            const member = await currentMember.getMember();
            if (!member) return wixLocationFrontend.to("/");

            const memberFirstName = member.contactDetails ? member.contactDetails.firstName : "";
            const memberLastName = member.contactDetails ? member.contactDetails.lastName : "";
            await hubEmailSweep(member._id, member.loginEmail, PARENT_ROLE_ID, memberFirstName, memberLastName);
            const profileResults = await wixData.query("ParentProfiles").eq("memberId", member._id).find();

            if (profileResults.items.length > 0) {
                const profile = profileResults.items[0];
                currentParentProfileId = profile._id;
                const rawName = profile.PP_fullName || profile.PP_email || "Parent";
                const formattedName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
                $w("#textWelcome").text = `Welcome back,\n${formattedName}`;

                // MY DETAILS
                $w("#inputMyName").value = profile.PP_fullName || "";
                $w("#inputMyPhone").value = profile.PP_phoneNumber || "";

                await loadDashboard(currentParentProfileId);
            }

            // MY DETAILS - toggle the edit section open/closed
            $w("#btnEditMyDetails").onClick(() => {
                if ($w("#boxMyDetails").collapsed) {
                    $w("#boxMyDetails").expand();
                } else {
                    $w("#boxMyDetails").collapse();
                }
            });

            $w("#btnSaveMyDetails").onClick(async () => {
                $w("#btnSaveMyDetails").disable();
                $w("#btnSaveMyDetails").label = "Saving...";

                const result = await secureUpdateParentProfile(
                    $w("#inputMyName").value,
                    $w("#inputMyPhone").value
                );

                if (result.success) {
                    $w("#btnSaveMyDetails").label = "Saved ✓";
                    const formattedName = $w("#inputMyName").value;
                    $w("#textWelcome").text = `Welcome back,\n${formattedName}`;
                } else {
                    console.error("Save My Details failed:", result.error);
                    $w("#btnSaveMyDetails").label = "Error Saving";
                }

                setTimeout(() => {
                    $w("#btnSaveMyDetails").label = "Save My Details";
                    $w("#btnSaveMyDetails").enable();
                }, 2000);
            });

            // FAN NUMBER / DOB FALLBACK LINKING (two-step: find, then confirm)
            let pendingLinkPlayerId = null;
            let pendingLinkFanNumber = null;
            let pendingLinkDob = null;

            $w("#btnLinkByFanDob").onClick(async () => {
                const fanNumber = $w("#inputFanNumber").value;
                const dobValue = $w("#inputDobLookup").value;

                if (!fanNumber || !dobValue) {
                    $w("#txtLinkResult").text = "Please enter both the Fan Number and Date of Birth.";
                    $w("#txtLinkResult").expand();
                    return;
                }

                // Build a "YYYY-MM-DD" string from local date parts (same
                // pattern as the registration form's SP_dob save) so the
                // date sent to the server isn't shifted by serializing a
                // Date object across timezones.
                const dob = `${dobValue.getFullYear()}-${String(dobValue.getMonth() + 1).padStart(2, '0')}-${String(dobValue.getDate()).padStart(2, '0')}`;

                $w("#btnLinkByFanDob").disable();
                $w("#btnLinkByFanDob").label = "Checking...";

                const result = await findPlayerByFanNumberAndDob(fanNumber, dob, PARENT_ROLE_ID);

                if (result.success && result.alreadyLinked) {
                    $w("#txtLinkResult").text = "This player is already linked to your account.";
                    $w("#txtLinkResult").expand();
                    $w("#boxConfirmLink").collapse();
                    await loadDashboard(currentParentProfileId);
                } else if (result.success && result.player) {
                    // Show the confirmation step - don't link anything yet
                    pendingLinkPlayerId = result.player._id;
                    pendingLinkFanNumber = fanNumber;
                    pendingLinkDob = dob;
                    $w("#txtConfirmLink").text = `We found a player called ${result.player.name} (Fan No. ${result.player.fanNumber}). If this is your child, click Confirm to link them to your account.`;
                    $w("#txtLinkResult").collapse();
                    $w("#boxConfirmLink").expand();
                } else {
                    pendingLinkPlayerId = null;
                    pendingLinkFanNumber = null;
                    pendingLinkDob = null;
                    $w("#boxConfirmLink").collapse();
                    $w("#txtLinkResult").text = result.error || "Something went wrong - please try again.";
                    $w("#txtLinkResult").expand();
                }

                $w("#btnLinkByFanDob").label = "Find My Child";
                $w("#btnLinkByFanDob").enable();
            });

            $w("#btnConfirmLink").onClick(async () => {
                if (!pendingLinkPlayerId) return;

                $w("#btnConfirmLink").disable();
                $w("#btnConfirmLink").label = "Linking...";

                const result = await confirmPlayerLink(pendingLinkPlayerId, pendingLinkFanNumber, pendingLinkDob, PARENT_ROLE_ID);

                if (result.success) {
                    $w("#boxConfirmLink").collapse();
                    $w("#txtLinkResult").text = "Linked! Loading your dashboard...";
                    $w("#txtLinkResult").expand();
                    $w("#inputFanNumber").value = "";
                    $w("#inputDobLookup").value = undefined;
                    pendingLinkPlayerId = null;
                    pendingLinkFanNumber = null;
                    pendingLinkDob = null;
                    await loadDashboard(currentParentProfileId);
                } else {
                    $w("#txtLinkResult").text = result.error || "Something went wrong - please try again.";
                    $w("#txtLinkResult").expand();
                }

                $w("#btnConfirmLink").label = "Confirm";
                $w("#btnConfirmLink").enable();
            });

            $w("#btnCancelLink").onClick(() => {
                pendingLinkPlayerId = null;
                pendingLinkFanNumber = null;
                pendingLinkDob = null;
                $w("#boxConfirmLink").collapse();
            });

            // Lets a parent who already has at least one child linked open the
            // Fan Number/DOB box to link another (e.g. a sibling on a different email)
            $w("#btnAddAnotherChild").onClick(() => {
                $w("#btnAddAnotherChild").collapse();
                $w("#txtLinkResult").collapse();
                $w("#boxConfirmLink").collapse();
                $w("#boxFanLookup").expand();
            });

            // BACK BUTTONS
            $w("#btnBackToHubReg").onClick(async () => {
                // Give visual feedback that it's thinking
                $w("#btnBackToHubReg").disable();
                $w("#btnBackToHubReg").label = "Loading Dashboard...";

                // Fetch the fresh data (including any new photos) from the database!
                await loadDashboard(currentParentProfileId);

                activePlayerContext = null;
                $w("#stateboxHub").changeState("stateDashboard");
                setProgressBarVisible(false);

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
                    $w("#regsecparentname, #regsecparentmobile, #regsecparentemail, #regsecparentrelation, #regsecparentdob, #regsecparentaddress, #b1, #b2, #b3, #b4, #b6, #b7").expand();
                } else {
                    $w("#regsecparentname, #regsecparentmobile, #regsecparentemail, #regsecparentrelation, #regsecparentdob, #regsecparentaddress, #b1, #b2, #b3, #b4, #b6, #b7").collapse();
                    $w("#regsecparentname, #regsecparentmobile, #regsecparentemail, #regsecparentrelation, #regsecparentdob, #regsecparentaddress").value = null;

                    // Parent 2 just disappeared - if that was the selected emergency
                    // contact source, fall back to "New" rather than leaving stale
                    // Parent 2 details sitting in the (now hidden) contact fields.
                    if ($w("#regemergencysource").value === EMERG_SOURCE_PARENT2) {
                        $w("#regemergencysource").value = EMERG_SOURCE_NEW;
                        applyEmergencySource(EMERG_SOURCE_NEW);
                    }
                }
                refreshEmergencySourceOptions();
                calculateProgress();
            });

            $w("#regemergencysource").onChange(() => {
                applyEmergencySource($w("#regemergencysource").value);
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

            $w("#regsibling").onChange(() => {
                if ($w("#regsibling").value === "true") {
                    $w("#regsiblingteam, #b8").expand();
                } else {
                    $w("#regsiblingteam, #b8").collapse();
                    $w("#regsiblingteam").value = null;
                }
            });

            $w("#chkConfirm").onChange(() => {
                if ($w("#chkConfirm").checked) {
                    $w("#inputSignature").expand();
                } else {
                    $w("#inputSignature").collapse();
                    $w("#inputSignature").value = "";
                }
            });

            // #btnSubmitFinal is always visible (see validateRequiredFields/its
            // onClick handler) — this no longer needs to expand/collapse it, the
            // signature length check is enforced there instead.

            $w("TextInput, Dropdown, RadioGroup, Checkbox, DatePicker, RichTextBox, UploadButton").onChange((event) => {
                calculateProgress();
                clearFieldHighlight(event.target);
            });

            // AddressInput isn't covered by the type selector above, so its changes
            // wouldn't recount progress — the form would stall one field short (e.g.
            // 95%) until another field fired a recalc. Wire it explicitly.
            $w("#regAddress").onChange(() => {
                calculateProgress();
                clearFieldHighlight($w("#regAddress"));
            });

            // Consent Lightbox — #regconsent* radios are read-only mirrors, only
            // ever set from this Lightbox's close data. Programmatic .value sets
            // don't fire onChange in Velo, so calculateProgress() is called
            // explicitly after applying the returned answers.
            $w("#txtConsent").onClick(async () => {
                const result = await wixWindow.openLightbox("ConsentRegistration", {
                    photo: radioValueToTriState($w("#regconsentphoto").value),
                    social: radioValueToTriState($w("#regconsentsocial").value),
                    fa: radioValueToTriState($w("#regconsentfa").value),
                    medical: radioValueToTriState($w("#regconsentmedical").value)
                });

                // #btnConfirmConsent only enables once all 4 are genuinely
                // answered, so result's values are always real booleans here.
                if (result) {
                    $w("#regconsentphoto").value = result.photo ? "true" : "false";
                    $w("#regconsentsocial").value = result.social ? "true" : "false";
                    $w("#regconsentfa").value = result.fa ? "true" : "false";
                    $w("#regconsentmedical").value = result.medical ? "true" : "false";
                    updateConsentButtonLabel();
                    calculateProgress();
                }
            });

            // Same Lightbox, reused on stateProfile — #btnReviewConsent lets the
            // primary parent revisit/change consent after registration, still
            // gated behind reading the statement again rather than a bare toggle.
            $w("#btnReviewConsent").onClick(async () => {
                const result = await wixWindow.openLightbox("ConsentRegistration", {
                    photo: radioValueToTriState($w("#radioPhotoConsent").value),
                    social: radioValueToTriState($w("#radioSocialMedia").value),
                    fa: radioValueToTriState($w("#radioFAConsent").value),
                    medical: radioValueToTriState($w("#radioMedicalConsent").value)
                });

                if (result) {
                    $w("#radioPhotoConsent").value = result.photo ? "true" : "false";
                    $w("#radioSocialMedia").value = result.social ? "true" : "false";
                    $w("#radioFAConsent").value = result.fa ? "true" : "false";
                    $w("#radioMedicalConsent").value = result.medical ? "true" : "false";
                }
            });

        } catch (err) {
            console.error("Hub init failed:", err);
        }
    });

    // ==========================================
    // STATE 1: DASHBOARD LOGIC
    // ==========================================
   async function loadDashboard(parentProfileId) {
    if (!parentProfileId) {
        console.error("loadDashboard called without a parentProfileId - aborting.");
        $w("#repeaterKids").data = [];
        $w("#repeaterKids").collapse();
        $w("#boxAlert").collapse();
        $w("#textNoKids").show();
        $w("#textNoKids").expand();
        $w("#boxFanLookup").expand();
        $w("#boxConfirmLink").collapse();
        $w("#btnAddAnotherChild").collapse();
        return;
    }
    try {
        // Fetched server-side (not a direct client wixData.query) so a secondary
        // parent's own DOB/address privacy redaction can be enforced before the
        // data ever reaches the browser — see getKidsForParent in registration.jsw.
        const kidsResponse = await getKidsForParent(parentProfileId);
        if (!kidsResponse.success) throw new Error(kidsResponse.error);

        const visibleKids = kidsResponse.data.filter(kid => kid.SP_status !== LEFT_STATUS_ID);

        // Clear repeater
        $w("#repeaterKids").data = [];

        if (visibleKids.length === 0) {
            $w("#repeaterKids").collapse();
            $w("#boxAlert").collapse();
            $w("#textNoKids").show();
            $w("#textNoKids").expand();
            $w("#boxFanLookup").expand();
            $w("#boxConfirmLink").collapse();
            $w("#btnAddAnotherChild").collapse();
            return;
        } else {
            $w("#textNoKids").collapse();
            $w("#boxFanLookup").collapse();
            $w("#boxConfirmLink").collapse();
            $w("#repeaterKids").expand();
            $w("#btnAddAnotherChild").expand();
        }

        const actionRequiredKids = visibleKids.filter(kid =>
            kid.SP_status === INVITED_STATUS_ID ||
            kid.SP_status === RENEWAL_STATUS_ID ||
            kid.SP_status === DRAFT_STATUS_ID ||
            kid.SP_status === ACTION_REQUIRED_ID
        );

        // A form the club actively sent back is more urgent than a merely
        // unfinished one — call it out specifically so the parent knows the
        // difference (per-child rows/buttons still show each one individually).
        const sentBackCount = actionRequiredKids.filter(kid => kid.SP_status === ACTION_REQUIRED_ID).length;

        if (actionRequiredKids.length > 0) {
            $w("#textAlertMsg").text = sentBackCount > 0
                ? `⚠️ The club sent ${sentBackCount} registration form(s) back to you for changes — please review and resubmit.`
                : `⚠️ Action Required: You have ${actionRequiredKids.length} outstanding registration form(s) to complete.`;
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

        case ACTION_REQUIRED_ID: // Sent back by the club secretary with a note
            $item("#textStatus").text = "Action Required - Update Needed";
            $item("#textStatus").style.color = "#FF4D4D"; // Red
            $item("#btnAction").label = "Fix & Resubmit";
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

                // Shallow copy, not a reference to the repeater's own item object —
                // mapUItoPlayer/the submit flow mutate this in place (e.g. SP_status),
                // and that must never leak back into the repeater's row data or a
                // stale closure from a prior render.
                activePlayerContext = { ...itemData };

                // Allow New, Renewals, Drafts, AND Action-Required to access the editable form
                if (itemData.SP_status === INVITED_STATUS_ID ||
                    itemData.SP_status === RENEWAL_STATUS_ID ||
                    itemData.SP_status === DRAFT_STATUS_ID ||
                    itemData.SP_status === ACTION_REQUIRED_ID) {

                    // New invites flip to Draft immediately so the manager/secretary
                    // can see the parent has started. Renewals (and Action Required)
                    // deliberately STAY put: renewals remain "Renewal Due" so the
                    // secretary's Renewal queue can track their form progress %, and
                    // both only leave on final submit → Ready for FA.
                    if (activePlayerContext.SP_status === INVITED_STATUS_ID) {
                        activePlayerContext.SP_status = DRAFT_STATUS_ID;
                        // Securely push this status change to the database right now
                        await secureUpdatePlayerRegistration(activePlayerContext, currentParentProfileId);
                    }

                    await loadRegistrationForm(activePlayerContext);
                    $w("#stateboxHub").changeState("stateRegistration");
                    setProgressBarVisible(true);
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
        $w("#regfan").text = player.SP_fanNumber ? player.SP_fanNumber.toString() : "(In Progress)";

        // If the club secretary sent this back, show her note at the top of the form.
        if (player.SP_status === ACTION_REQUIRED_ID && player.sp_return_note) {
            $w("#regReturnNote").text = `⚠️ The club needs an update: ${player.sp_return_note}`;
            $w("#boxReturnNote").expand();
        } else {
            $w("#boxReturnNote").collapse();
        }

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
        $w("#regparentmobile").value = player.parentPhone || "";
        $w("#regparentemail").text = player.parentEmail || "Email Missing";

        if (player.SP_dob) {
            $w("#regDOB").value = new Date(player.SP_dob);
        }

        if (player.mainAddress) $w("#regAddress").value = player.mainAddress;

        if (player.sp_parent_dob) $w("#regparentdob").value = new Date(player.sp_parent_dob);
        if (player.sp_parent_address) $w("#regparentaddress").value = player.sp_parent_address;
        $w("#regmembership").text = player.sp_membership_no || "(Assigned on first save)";

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
        if (player.sp_gender) $w("#reggender").value = player.sp_gender;

        // Consent radios are read-only mirrors — only ever set here or from the
        // ConsentRegistration Lightbox's close data, never edited directly.
        // Tri-state: true/false only when the parent has actually answered via the
        // Consent Lightbox (a real boolean in the CMS); left unset (no selection)
        // when the field has never been touched, so "never answered" is visibly
        // different from a genuine "No" and doesn't get miscounted as complete.
        $w("#regconsentsocial").value = consentRadioValue(player.socialMedia);
        $w("#regconsentphoto").value = consentRadioValue(player.sp_consent_photo);
        $w("#regconsentfa").value = consentRadioValue(player.sp_consent_fa);
        $w("#regconsentmedical").value = consentRadioValue(player.sp_consent_medical);
        updateConsentButtonLabel();
        $w("#regconsentphoto, #regconsentsocial, #regconsentfa, #regconsentmedical").disable();

        $w("#regbothparents").value = player.livesWithBothParents ? "true" : "false";
        $w("#regplayertype").value = player.SP_trainingOnly ? "true" : "false";

        $w("#regsibling").value = player.sp_has_sibling ? "true" : "false";
        if (player.sp_has_sibling) {
            if (player.sp_sibling_team) $w("#regsiblingteam").value = player.sp_sibling_team._id || player.sp_sibling_team;
            $w("#regsiblingteam, #b8").expand();
        } else {
            $w("#regsiblingteam, #b8").collapse();
        }

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
            if (player.sp_secparent_dob) $w("#regsecparentdob").value = new Date(player.sp_secparent_dob);
            if (player.sp_secparent_address) $w("#regsecparentaddress").value = player.sp_secparent_address;
            $w("#regsecparentname, #regsecparentmobile, #regsecparentemail, #regsecparentrelation, #regsecparentdob, #regsecparentaddress").expand();
        } else {
            $w("#regadd2parents").value = "No";
            $w("#regsecparentname, #regsecparentmobile, #regsecparentemail, #regsecparentrelation, #regsecparentdob, #regsecparentaddress").collapse();
        }

        // Emergency contact source - rebuild Parent 1/2 options against whichever
        // parents are on the form now, then re-apply so Parent 1/2 auto-fill always
        // reflects their CURRENT details rather than what was saved last time.
        // Defaults to "New" for any draft saved before this feature existed, so an
        // already-typed independent contact is never silently overwritten.
        refreshEmergencySourceOptions();
        $w("#regemergencysource").value = player.sp_emerg_source || EMERG_SOURCE_NEW;
        applyEmergencySource($w("#regemergencysource").value);

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
        $w("#btnSubmitFinal").expand();
        $w("#txtValidationMsg").collapse();

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
            $w("#reggender").options = buildOptions("gender");
        } catch (err) {
            console.error("Failed to load dictionary:", err);
        }

        try {
            const teamsResults = await wixData.query("Teams").ascending("T_teamName").limit(1000).find();
            $w("#regsiblingteam").options = teamsResults.items.map(team => ({ label: team.T_teamName, value: team._id }));
        } catch (err) {
            console.error("Failed to load teams for sibling dropdown:", err);
        }
    }

    // #txtConsent (Button) — flips its label once all 4 consent items have been
    // answered, so it's visually obvious the parent has already been through the
    // Lightbox rather than looking clickable-but-untouched. Module-level (not
    // nested in $w.onReady's try block) so both loadRegistrationForm and the
    // Lightbox close handler can call it.
    function updateConsentButtonLabel() {
        const allAnswered = $w("#regconsentphoto").value
            && $w("#regconsentsocial").value
            && $w("#regconsentfa").value
            && $w("#regconsentmedical").value;

        if (allAnswered) {
            $w("#txtConsent").label = "Already Confirmed ✓";
        }
    }

    // Shared by loadRegistrationForm and loadProfileForm — true/false only when
    // the underlying CMS field is a real boolean (i.e. actually answered via the
    // Consent Lightbox at some point); null (no radio selection) when it's never
    // been touched, so "never answered" reads differently from a genuine "No".
    function consentRadioValue(fieldValue) {
        if (fieldValue === true) return "true";
        if (fieldValue === false) return "false";
        return null;
    }

    // Inverse of consentRadioValue — radio's "true"/"false"/null string back to a
    // true/false/null tri-state, for passing current answers into the Lightbox's
    // context without forcing an unanswered item to look like a "No".
    function radioValueToTriState(radioValue) {
        if (radioValue === "true") return true;
        if (radioValue === "false") return false;
        return null;
    }

    // Shared by mapUItoPlayer (Save Draft/Submit) and the profile Save Changes
    // handler — only writes a consent field when the radio has actually been
    // answered ("true"/"false"), so saving before ever opening the Consent
    // Lightbox can't silently write "No" for something never actually asked.
    function setConsentFieldIfAnswered(targetObj, key, elementId) {
        const val = $w(elementId).value;
        if (val === "true" || val === "false") {
            targetObj[key] = (val === "true");
        }
    }

    // Rebuilds #regemergencysource's options from the parents currently on the
    // form. Parent 1 is always an option (a primary parent always exists); Parent 2
    // only appears while #regadd2parents is "Yes", so it can never be picked for a
    // family that doesn't have one.
    function refreshEmergencySourceOptions() {
        const options = [
            { label: `Parent 1 (${$w("#regparentname").text || "Parent 1"})`, value: EMERG_SOURCE_PARENT1 }
        ];

        if ($w("#regadd2parents").value === "Yes") {
            options.push({ label: `Parent 2 (${$w("#regsecparentname").value || "Parent 2"})`, value: EMERG_SOURCE_PARENT2 });
        }

        options.push({ label: "New / someone else", value: EMERG_SOURCE_NEW });
        $w("#regemergencysource").options = options;
    }

    // Auto-fills (and hides) the 3 manual emergency contact fields when Parent 1/2
    // is selected, so the form always mirrors that parent's current details rather
    // than a separately-typed copy that could go stale. "New" reveals the manual
    // fields untouched for hand entry.
    function applyEmergencySource(source) {
        if (source === EMERG_SOURCE_PARENT1) {
            $w("#regemergencycontact").value = $w("#regparentname").text || "";
            $w("#regemergencycontactmobile").value = $w("#regparentmobile").value || "";
            $w("#regemergencycontactrelatoin").value = $w("#regparentrelation").value || null;
            $w("#boxEmergencyManual").collapse();
        } else if (source === EMERG_SOURCE_PARENT2) {
            $w("#regemergencycontact").value = $w("#regsecparentname").value || "";
            $w("#regemergencycontactmobile").value = $w("#regsecparentmobile").value || "";
            $w("#regemergencycontactrelatoin").value = $w("#regsecparentrelation").value || null;
            $w("#boxEmergencyManual").collapse();
        } else {
            $w("#boxEmergencyManual").expand();
        }
    }

    // Clears a field's invalid-highlight border once it's actually been filled in -
    // called from the shared onChange handlers below so a red border doesn't linger
    // after the parent fixes it, without waiting for another submit click.
    function clearFieldHighlight(element) {
        if (!element || !element.value) return;
        try {
            element.style.borderColor = FIELD_BORDER_DEFAULT;
        } catch (err) {
            // Element type doesn't support border styling (e.g. some radio/upload
            // controls) - nothing to clear, safe to ignore.
        }
    }

    // Mirrors the same required-field list calculateProgress() counts (so "100%
    // complete" and "nothing left to highlight" always agree), but returns which
    // elements are still empty instead of a percentage - lets the always-visible
    // submit button highlight exactly what's missing instead of just staying hidden.
    function validateRequiredFields() {
        const requiredIds = [
            "#regDOB", "#regAddress", "#regshirtsize", "#regshortsize", "#regcoatsize",
            "#reghoodiesize", "#regsocksize", "#regemergencycontact", "#regemergencycontactmobile",
            "#regemergencycontactrelatoin", "#regparentrelation", "#regparentdob", "#reggender"
        ];

        if ($w("#regsibling").value === "true") {
            requiredIds.push("#regsiblingteam");
        }

        if ($w("#regadd2parents").value === "Yes") {
            requiredIds.push("#regsecparentname", "#regsecparentmobile", "#regsecparentemail", "#regsecparentrelation", "#regsecparentdob");
        }

        const missingIds = [];

        requiredIds.forEach((id) => {
            const el = $w(id);
            const isEmpty = !el.value;
            try {
                el.style.borderColor = isEmpty ? FIELD_BORDER_INVALID : FIELD_BORDER_DEFAULT;
            } catch (err) {
                // Not every element type supports border styling - still tracked
                // in missingIds below so the summary message/count stays accurate.
            }
            if (isEmpty) missingIds.push(id);
        });

        // Medical details only required when "Yes" was chosen; "No" is a complete
        // answer on its own (mirrors calculateProgress's medicalyn/regmedical pair).
        if ($w("#medicalyn").value === "true" && !$w("#regmedical").value) {
            missingIds.push("#regmedical");
            try { $w("#regmedical").style.borderColor = FIELD_BORDER_INVALID; } catch (err) { /* not styleable */ }
        } else if ($w("#medicalyn").value !== "true" && $w("#medicalyn").value !== "false") {
            missingIds.push("#medicalyn");
        }

        if (!$w("#regconsentphoto").value) missingIds.push("#regconsentphoto");
        if (!$w("#regconsentsocial").value) missingIds.push("#regconsentsocial");
        if (!$w("#regconsentfa").value) missingIds.push("#regconsentfa");
        if (!$w("#regconsentmedical").value) missingIds.push("#regconsentmedical");
        if (!$w("#regsibling").value) missingIds.push("#regsibling");
        if (!$w("#chkParentConduct").checked) missingIds.push("#chkParentConduct");
        if (!$w("#chkPlayerConduct").checked) missingIds.push("#chkPlayerConduct");

        if ($w("#regheadshot").value.length === 0 && !(activePlayerContext && activePlayerContext.SP_idPhoto)) {
            missingIds.push("#regheadshot");
        }
        if ($w("#regpaperid").value.length === 0 && !(activePlayerContext && activePlayerContext.SP_idDocument)) {
            missingIds.push("#regpaperid");
        }

        return { missingIds };
    }

    function calculateProgress() {
        // 17 original fields + parent DOB + gender + the 3 consent items that are
        // new here (photo/FA/medical — social media's slot is unchanged, it just
        // now reads from #regconsentsocial instead of the old #regsocialmedia) +
        // sibling.
        let baseTotalFields = 23;
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
        if ($w("#regparentdob").value) completedFields++;
        if ($w("#reggender").value) completedFields++;

        if ($w("#medicalyn").value === "true" && $w("#regmedical").value) {
            completedFields++;
        } else if ($w("#medicalyn").value === "false") {
            completedFields++;
        }

        // Consent radios only count once answered via the Lightbox (either Yes or
        // No sets a "true"/"false" string, so this mirrors the pre-existing
        // #regsocialmedia pattern of "has a value" rather than "value is true").
        // The FA/medical "No blocks submit" rule is enforced separately at
        // #btnSubmitFinal, not here.
        if ($w("#regconsentphoto").value) completedFields++;
        if ($w("#regconsentsocial").value) completedFields++;
        if ($w("#regconsentfa").value) completedFields++;
        if ($w("#regconsentmedical").value) completedFields++;

        if ($w("#regsibling").value) completedFields++;
        if ($w("#regsibling").value === "true") {
            baseTotalFields += 1;
            if ($w("#regsiblingteam").value) completedFields++;
        }

        if ($w("#chkParentConduct").checked) completedFields++;
        if ($w("#chkPlayerConduct").checked) completedFields++;

        if ($w("#regheadshot").value.length > 0 || (activePlayerContext && activePlayerContext.SP_idPhoto)) {
            completedFields++;
        }
        if ($w("#regpaperid").value.length > 0 || (activePlayerContext && activePlayerContext.SP_idDocument)) {
            completedFields++;
        }

        if ($w("#regadd2parents").value === "Yes") {
            baseTotalFields += 5; // +1 here for #regsecparentdob (address stays excluded, same as the primary one)
            if ($w("#regsecparentname").value) completedFields++;
            if ($w("#regsecparentmobile").value) completedFields++;
            if ($w("#regsecparentemail").value) completedFields++;
            if ($w("#regsecparentrelation").value) completedFields++;
            if ($w("#regsecparentdob").value) completedFields++;
        }

        let percentage = Math.round((completedFields / baseTotalFields) * 100);
        if (percentage > 100) percentage = 100;

        // #textProgress now lives in the header (sticky bar) - only masterPage.js can
        // $w-select it, so route the text through the bridge instead of setting it here.
        // lastCalculatedPercentage is the read-back copy mapUItoPlayer saves into
        // registrationProgress, since it can no longer read the percentage back out
        // of #textProgress's on-page text either.
        lastCalculatedPercentage = percentage;
        setProgressBarText(`Registration: ${percentage}% Complete`);

        if (percentage === 100) {
            $w("#chkConfirm").expand();
        } else {
            $w("#chkConfirm").collapse();
            $w("#chkConfirm").checked = false;
            $w("#inputSignature").collapse();
            $w("#inputSignature").value = "";
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
        playerData.parentPhone = $w("#regparentmobile").value;
        playerData.SP_initials = $w("#reginitials").value;
        playerData.SP_emergContactName = $w("#regemergencycontact").value;
        playerData.SP_emergContactNumber = $w("#regemergencycontactmobile").value;
        playerData.sp_emerg_source = $w("#regemergencysource").value || EMERG_SOURCE_NEW;

        playerData.SP_shirtSize = $w("#regshirtsize").value;
        playerData.SP_shortSize = $w("#regshortsize").value;
        playerData.SP_coatSize = $w("#regcoatsize").value;
        playerData.SP_hoodieSize = $w("#reghoodiesize").value;
        playerData.SP_socksize = $w("#regsocksize").value;
        playerData.SP_relationship = $w("#regparentrelation").value;
        playerData.SP_emergContactRelationship = $w("#regemergencycontactrelatoin").value;
        playerData.sp_gender = $w("#reggender").value;

        if ($w("#regparentdob").value) {
            const parentDobDate = $w("#regparentdob").value;
            playerData.sp_parent_dob = `${parentDobDate.getFullYear()}-${String(parentDobDate.getMonth() + 1).padStart(2, '0')}-${String(parentDobDate.getDate()).padStart(2, '0')}`;
        }
        playerData.sp_parent_address = $w("#regparentaddress").value;

        // sp_membership_no is deliberately never set here — it's server-generated
        // (registration.jsw, secureUpdatePlayerRegistration) and read-only on this form.

        // Only write a consent field if the parent has actually answered it (radio
        // value is exactly "true"/"false") — otherwise a Save Draft before the
        // parent has ever opened the Consent Lightbox would permanently write
        // "No" into the CMS for something they were never actually asked.
        setConsentFieldIfAnswered(playerData, "socialMedia", "#regconsentsocial");
        setConsentFieldIfAnswered(playerData, "sp_consent_photo", "#regconsentphoto");
        setConsentFieldIfAnswered(playerData, "sp_consent_fa", "#regconsentfa");
        setConsentFieldIfAnswered(playerData, "sp_consent_medical", "#regconsentmedical");

        playerData.livesWithBothParents = $w("#regbothparents").value === "true";
        playerData.SP_trainingOnly = $w("#regplayertype").value === "true";

        playerData.sp_has_sibling = $w("#regsibling").value === "true";
        playerData.sp_sibling_team = playerData.sp_has_sibling ? $w("#regsiblingteam").value : null;

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
            if ($w("#regsecparentdob").value) {
                const secDobDate = $w("#regsecparentdob").value;
                playerData.sp_secparent_dob = `${secDobDate.getFullYear()}-${String(secDobDate.getMonth() + 1).padStart(2, '0')}-${String(secDobDate.getDate()).padStart(2, '0')}`;
            }
            playerData.sp_secparent_address = $w("#regsecparentaddress").value;
        } else {
            playerData.secondaryParentName = null;
            playerData.secondaryParentMobile = null;
            playerData.secondaryParentEmail = null;
            playerData.secondaryParentRelation = null;
            playerData.sp_secparent_dob = null;
            playerData.sp_secparent_address = null;
        }

        playerData.registrationConductParent = $w("#chkParentConduct").checked;
        playerData.registrationConductPlayer = $w("#chkPlayerConduct").checked;
        playerData.registrationConfirmCorrect = $w("#chkConfirm").checked;
        playerData.registrationPrintNameSignature = $w("#inputSignature").value;

        playerData.registrationProgress = lastCalculatedPercentage;

        return playerData;
    }

    // SECURE SAVE DRAFT - #btnSaveDraft now lives in the header (sticky bar), so
    // masterPage.js owns the actual button/label. This is what runs when it's
    // clicked - detected by polling getSaveDraftRequestId() (session storage, see
    // public/parentHubProgressBar.js) since only this file knows activePlayerContext,
    // and a public file's plain functions/variables aren't actually shared between
    // masterPage.js and page code in Velo.
    async function handleSaveDraftFromHeader() {
        let playerToUpdate = mapUItoPlayer(activePlayerContext);
        playerToUpdate = await handleFileUploads(playerToUpdate);

        // A renewal that's been opened but never saved stays "Renewal Due" (nothing
        // started). The moment the parent saves progress, flip it to Draft/"Form In
        // Progress" so the secretary can tell started-from-not-started, and so the
        // huge post-rollover Renewal queue only holds the ones nobody's touched yet.
        if (playerToUpdate.SP_status === RENEWAL_STATUS_ID) {
            playerToUpdate.SP_status = DRAFT_STATUS_ID;
            activePlayerContext.SP_status = DRAFT_STATUS_ID;
        }

        return await secureUpdatePlayerRegistration(playerToUpdate, currentParentProfileId);
    }

    // Baseline to whatever's already sitting in storage at load time - otherwise a
    // browser refresh mid-session would see an old, already-handled requestId as
    // "new" and fire an unwanted save the instant the page loads.
    let lastHandledSaveDraftRequestId = getSaveDraftRequestId();

    setInterval(async () => {
        const requestId = getSaveDraftRequestId();
        if (!requestId || requestId === lastHandledSaveDraftRequestId) return;
        lastHandledSaveDraftRequestId = requestId;

        if (activePlayerContext) {
            const result = await handleSaveDraftFromHeader();
            setSaveDraftResult(requestId, result);
        } else {
            // Header button shouldn't be clickable outside stateRegistration (the bar
            // stays collapsed), but guard anyway so masterPage.js's button doesn't
            // hang waiting on a result that would otherwise never arrive.
            setSaveDraftResult(requestId, { success: false, error: "Not currently in the registration form." });
        }
    }, 400);

    // SECURE FINAL SUBMIT
    $w("#btnSubmitFinal").onClick(async () => {
        // Submit is always visible now (feedback: parents had no way to tell which
        // fields were mandatory until the button silently appeared at 100%). A click
        // while incomplete highlights exactly what's missing instead of doing nothing.
        const validation = validateRequiredFields();
        if (validation.missingIds.length > 0) {
            const count = validation.missingIds.length;
            $w("#txtValidationMsg").text = `Please complete the ${count} highlighted field${count > 1 ? "s" : ""} above before submitting.`;
            $w("#txtValidationMsg").expand();
            $w(validation.missingIds[0]).scrollTo();
            return;
        }
        $w("#txtValidationMsg").collapse();

        // FA and medical consent are mandatory — "answered" (checked above via
        // regconsentfa/medical having a value) isn't the same as answered "Yes".
        // This is the actual hard gate.
        if ($w("#regconsentfa").value !== "true" || $w("#regconsentmedical").value !== "true") {
            $w("#btnSubmitFinal").label = "Consent required — see above";
            $w("#txtConsent").scrollTo();
            setTimeout(() => { $w("#btnSubmitFinal").label = "Submit Form"; }, 2500);
            return;
        }

        if (!$w("#chkConfirm").checked) {
            $w("#txtValidationMsg").text = "Please tick the confirmation box below before submitting.";
            $w("#txtValidationMsg").expand();
            $w("#chkConfirm").scrollTo();
            return;
        }

        if (!$w("#inputSignature").value || $w("#inputSignature").value.length <= 2) {
            $w("#txtValidationMsg").text = "Please type your name as a signature before submitting.";
            $w("#txtValidationMsg").expand();
            try { $w("#inputSignature").style.borderColor = FIELD_BORDER_INVALID; } catch (err) { /* not styleable */ }
            $w("#inputSignature").scrollTo();
            return;
        }

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
            setProgressBarVisible(false);
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
            loadTeamStats(currentTeamId, event.target.value);
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
            $w("#secondparentRelation").options = buildOptions("relationship");
        } catch (err) {
            console.error("Failed to load dictionary:", err);
        }
    }

    // ==========================================
    // STATE 3: PROFILE & EDIT VIEW LOGIC
    // ==========================================
    function loadProfileForm(player, currentUserEmail) {
        currentPlayerId = player._id;
        currentTeamId = player.SP_team ? (player.SP_team._id || player.SP_team) : "";

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
        $w("#txtMembershipNo").text = player.sp_membership_no || "Not yet assigned";

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
        $w("#txtProfGender").text = clubDictionaryMap[player.sp_gender] || "Not Provided";

        // --- 5. PARENT CONTACT (Editable & Locked) ---
        $w("#txtLockedParentName").text = player.parentsName || "Not Provided";
        $w("#txtLockedParentMobile").value = player.parentPhone || "";
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

        if (player.sp_secparent_dob) $w("#secondparentDob").value = new Date(player.sp_secparent_dob);
        if (player.sp_secparent_address) $w("#secondparentAddress").value = player.sp_secparent_address;

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

        // Consent radios are read-only mirrors here too — always locked, changed
        // only via #btnReviewConsent reopening the ConsentRegistration Lightbox, so
        // a parent can't flip one without re-reading the statement first.
        $w("#radioSocialMedia").value = consentRadioValue(player.socialMedia);
        $w("#radioPhotoConsent").value = consentRadioValue(player.sp_consent_photo);
        $w("#radioFAConsent").value = consentRadioValue(player.sp_consent_fa);
        $w("#radioMedicalConsent").value = consentRadioValue(player.sp_consent_medical);
        $w("#radioSocialMedia, #radioPhotoConsent, #radioFAConsent, #radioMedicalConsent").disable();

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
            loadTeamStats(currentTeamId, $w("#season").value);
        } else {
            $w("#goals").text = "0"; $w("#assist").text = "0"; $w("#tackle").text = "0"; $w("#save").text = "0"; $w("#potm").text = "0";
            loadTeamStats(currentTeamId, null);
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
            $w("#txtLockedParentMobile").enable();
            
            $w("#radioaddparent").enable();
            $w("#secondparentName").enable();
            $w("#secondparentMobile").enable();
            $w("#secondparentEmail").enable();
            $w("#secondparentRelation").enable();
            
            $w("#radioBothParents").enable();
            // Consent radios stay permanently disabled (see population above) —
            // only #btnReviewConsent, which reopens the Lightbox, is gated here.
            $w("#btnReviewConsent").enable();
            $w("#radioMedical").enable();
            $w("#inputMedicalDetails").enable();

            // Primary parent's own DOB/address — visible + editable only here.
            // getKidsForParent (registration.jsw) already stripped these two fields
            // out of the payload for a secondary-parent viewer, so this is belt-and-
            // braces UI tidiness on top of a real backend boundary, not the boundary
            // itself.
            if (player.sp_parent_dob) $w("#datePrimaryParentDob").value = new Date(player.sp_parent_dob);
            if (player.sp_parent_address) $w("#inputParentAddress").value = player.sp_parent_address;
            $w("#datePrimaryParentDob, #inputParentAddress").expand();
            $w("#datePrimaryParentDob, #inputParentAddress").enable();
        } else {
            // Lock Down Everything (Secondary Parent)
            $w("#btnSaveProfileEdits").disable();
            $w("#btnSaveProfileEdits").label = "Secondary Parent - Read Only";
            
            $w("#inputEmergName").disable();
            $w("#inputEmergNumber").disable();
            $w("#emergeRelation").disable();
            $w("#inputAddress").disable();
            $w("#txtLockedParentEmail").disable();
            $w("#txtLockedParentMobile").disable();
            
            $w("#radioaddparent").disable();
            $w("#secondparentName").disable();
            $w("#secondparentMobile").disable();
            $w("#secondparentEmail").disable();
            $w("#secondparentRelation").disable();
            
            $w("#radioBothParents").disable();
            $w("#btnReviewConsent").disable();
            $w("#radioMedical").disable();
            $w("#inputMedicalDetails").disable();

            // Secondary parent: primary parent's own DOB/address are hidden
            // entirely, not just disabled — the underlying values are already
            // absent from `player` (redacted server-side by getKidsForParent), so
            // there's nothing to bind here even if this collapse were skipped.
            $w("#datePrimaryParentDob, #inputParentAddress").collapse();
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
            $w("#secondparentDob").expand();
            $w("#secondparentAddress").expand();
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
            $w("#secondparentDob").collapse();
            $w("#secondparentAddress").collapse();
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
        activePlayerContext.parentPhone = $w("#txtLockedParentMobile").value;

        // Primary parent's own DOB/address — this button is only ever enabled/
        // reachable for the primary parent (see RBAC block above), so these
        // elements are always populated when this handler actually runs.
        if ($w("#datePrimaryParentDob").value) {
            const primaryDobDate = $w("#datePrimaryParentDob").value;
            activePlayerContext.sp_parent_dob = `${primaryDobDate.getFullYear()}-${String(primaryDobDate.getMonth() + 1).padStart(2, '0')}-${String(primaryDobDate.getDate()).padStart(2, '0')}`;
        }
        activePlayerContext.sp_parent_address = $w("#inputParentAddress").value;

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
            if ($w("#secondparentDob").value) {
                const secDobDate = $w("#secondparentDob").value;
                activePlayerContext.sp_secparent_dob = `${secDobDate.getFullYear()}-${String(secDobDate.getMonth() + 1).padStart(2, '0')}-${String(secDobDate.getDate()).padStart(2, '0')}`;
            }
            activePlayerContext.sp_secparent_address = $w("#secondparentAddress").value;
        } else {
            activePlayerContext.secondaryParentName = null;
            activePlayerContext.secondaryParentMobile = null;
            activePlayerContext.secondaryParentEmail = null;
            activePlayerContext.secondaryParentRelation = null;
            activePlayerContext.sp_secparent_dob = null;
            activePlayerContext.sp_secparent_address = null;
        }

        // Map Booleans
        activePlayerContext.livesWithBothParents = $w("#radioBothParents").value === "true";
        // Read-only mirrors — only ever changed via #btnReviewConsent's Lightbox,
        // so only write a consent field if it's actually been answered ("true"/
        // "false"), same reasoning as the registration form's Save Draft.
        setConsentFieldIfAnswered(activePlayerContext, "socialMedia", "#radioSocialMedia");
        setConsentFieldIfAnswered(activePlayerContext, "sp_consent_photo", "#radioPhotoConsent");
        setConsentFieldIfAnswered(activePlayerContext, "sp_consent_fa", "#radioFAConsent");
        setConsentFieldIfAnswered(activePlayerContext, "sp_consent_medical", "#radioMedicalConsent");

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

async function loadTeamStats(teamId, seasonId) {
    const seasonLabel = seasonId ? clubDictionaryMap[seasonId] : null;

    if (!teamId || !seasonLabel) {
        $w("#txtWins").text = "0";
        $w("#txtLosses").text = "0";
        $w("#txtDraws").text = "0";
        $w("#txtGF").text = "0";
        $w("#txtGA").text = "0";
        $w("#txtGD").text = "0";
        if ($w("#formRepeater")) $w("#formRepeater").data = [];
        return;
    }

    try {
        const matchesRes = await wixData.query("TeamStats")
            .eq("TS_teamName", teamId)
            .eq("seasonLabel", seasonLabel)
            .descending("_createdDate")
            .limit(1000)
            .find();

        let gf = 0, ga = 0, w = 0, l = 0, d = 0;
        matchesRes.items.forEach(m => {
            gf += (Number(m.TS_goalsFor) || 0);
            ga += (Number(m.TS_goalsAgainst) || 0);
            if (m.result === "Win") w++;
            else if (m.result === "Lose") l++;
            else if (m.result === "Draw") d++;
        });

        $w("#txtWins").text = w.toString();
        $w("#txtLosses").text = l.toString();
        $w("#txtDraws").text = d.toString();
        $w("#txtGF").text = gf.toString();
        $w("#txtGA").text = ga.toString();
        $w("#txtGD").text = (gf - ga).toString();

        loadFormGuide(matchesRes.items);
    } catch (error) {
        console.error("Error loading team stats:", error);
        $w("#txtWins").text = "0";
        $w("#txtLosses").text = "0";
        $w("#txtDraws").text = "0";
        $w("#txtGF").text = "0";
        $w("#txtGA").text = "0";
        $w("#txtGD").text = "0";
        if ($w("#formRepeater")) $w("#formRepeater").data = [];
    }
}

function loadFormGuide(matches) {
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
