import wixData from 'wix-data';
import wixWindow from 'wix-window';
import wixLocation from 'wix-location';
import { getPlayerFaFiles, getPlayersExportUrl } from 'backend/exportCsv';
import { secretarySendBackToParent, secretarySetFeeCategory, getGoCardlessStatus, getPlayerPaymentTimeline } from 'backend/registration';

// =====================================================================
//  PLAYER RECORD LIGHTBOX
//  Opened from the All Players list AND the Activate / Renewal / Leaver
//  queues:  wixWindow.openLightbox("PlayerRecord", { playerId })
//
//  ACTIONS AREA (2026-07-25 redesign) — always shows exactly ONE thing to do:
//    - a green "next step" button when there's an obvious one (worked out
//      from the player's current status), OR
//    - a plain "#prNoActionText" line explaining why there isn't one, with
//      "Change status" (#prChangeStatusBtn) as an opt-in reveal of the manual
//      override dropdown — kept hidden by default so it never competes with
//      the primary button, OR
//    - "#prMarkLeftBtn" ("Player is leaving") — its own dedicated flow, NOT a
//      dropdown pick, since leaving is a deliberate one-way action.
//  Closes with { changed: true } when anything is saved.
// =====================================================================

const INVITED_STATUS_ID = "184b5a98-37c8-41a6-bc58-5a1c17827f04";
const READY_FOR_FA_ID   = "95978c83-70fc-4bd7-bd75-12f43216a0d7";
const FA_COMPLETE_ID    = "af2bef8c-1caa-4bf8-8dce-321d19723741";
const Active_ID         = "705c0b66-d5d5-47b6-b828-98a94c670f1f";
const RENEWAL_STATUS_ID = "4d354c43-c893-4bc8-8415-18cfc32b3236";
const DRAFT_STATUS_ID   = "ad6fe8f3-c82e-45ae-b688-89d53c3f0a9f";
const ENQUIRY_STATUS_ID = "e4c79abb-e591-44c3-98a9-e111f276bdd2";
const TRIAL_STATUS_ID   = "5f21b19d-878a-4042-a8ec-c1c0a66812b9";
const LEFT_STATUS_ID    = "d78cb8b0-3b3b-4439-b889-fd36dc434781";
// ⚠️ SETUP: paste the ClubDictionary "Action Required" _id here (same GUID as backend).
const ACTION_REQUIRED_ID = "d5bd1c0f-e19e-4318-a8d3-d5d6fe63b274";

const STATUS_LABEL = {
    [ENQUIRY_STATUS_ID]: "Enquiry",
    [TRIAL_STATUS_ID]: "On Trial",
    [INVITED_STATUS_ID]: "Awaiting Parent",
    [READY_FOR_FA_ID]: "Ready for FA",
    [FA_COMPLETE_ID]: "FA Registered",
    [Active_ID]: "Active",
    [RENEWAL_STATUS_ID]: "Renewal Due",
    [DRAFT_STATUS_ID]: "Form In Progress",
    [ACTION_REQUIRED_ID]: "Action Required",
    [LEFT_STATUS_ID]: "Left Club"
};
const GREEN = "#22C55E", AMBER = "#F59E0B", RED = "#FF4D4D", GREY = "#7c8ca6";

let player = null;
let primary = null; // { label, fields } worked out from current status

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB') : "—";
const cleanMedical = (html) => html ? String(html).replace(/<[^>]*>?/gm, '').trim() : "";
const toDateStr = (d) => {
    const x = new Date(d);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

// Tri-state consent text — an unanswered consent (parent hasn't reached that
// part of the form yet) must read differently from a genuine "Declined".
// Same pattern as Player Profile.js's consentStatusText.
const consentText = (v) => v === true ? "Consent Given" : v === false ? "Declined" : "Not Yet Provided";
const boolMark = (v) => v === true ? "✓" : v === false ? "✗" : "—";

// Two-letter initials for the header avatar circle, e.g. "Oscar Bennett" → "OB".
// Same helper as Player Admin.js's version (separate file, so duplicated here
// rather than shared - kept in sync manually if the logic ever changes).
function initials(p) {
    const f = (p.SP_firstName || "").trim()[0] || "";
    const l = (p.SP_lastName || "").trim()[0] || "";
    return (f + l).toUpperCase();
}

// AddressInput values come back as {formatted, streetAddress, city, ...} — prefer
// the ready-made "formatted" string, fall back to assembling the parts.
function fmtAddress(addr) {
    if (!addr) return "—";
    if (typeof addr === "string") return addr || "—";
    if (addr.formatted) return addr.formatted;
    const parts = [];
    if (addr.streetAddress) parts.push([addr.streetAddress.number, addr.streetAddress.name].filter(Boolean).join(" "));
    if (addr.city) parts.push(addr.city);
    if (addr.subdivision) parts.push(addr.subdivision);
    if (addr.postalCode) parts.push(addr.postalCode);
    return parts.filter(Boolean).join(", ") || "—";
}

// Fee instalment calendar: 10 monthly payments, July → April (JS month indexes).
const FEE_PAYMENT_MONTHS = [6, 7, 8, 9, 10, 11, 0, 1, 2, 3];

// Client-side pro-rata schedule (mirror of buildFeeSchedule in registration.jsw)
// so the live preview is instant — no server round-trip. Everyone pays annual/10
// per month; late joiners simply get fewer instalments. The backend stays the
// source of truth when the tier is actually saved/sent.
//
// anchorDate defaults to registrationDate, but the secretary can override it via
// #prPaymentStartOverride (see previewFee/commitFee below) - needed for the 2026-27
// GoCardless rollout, where migrating an existing player onto GoCardless mid-season
// should NOT auto-reduce their instalment count the way a genuine new joiner should.
// countOverride (via #prPaymentCountOverride) additionally forces a specific instalment
// count instead of the auto reduction - e.g. 10 payments from an August anchor, running
// into May the following year, NOT constrained to the fixed Jul-Apr season window.
function buildFeeSchedule(anchorDate, annualAmount, countOverride) {
    const reg = anchorDate ? new Date(anchorDate) : new Date();
    const perPayment = Math.round((Number(annualAmount) / FEE_PAYMENT_MONTHS.length) * 100) / 100;

    if (countOverride) {
        return {
            perPayment,
            count: countOverride,
            total: Math.round(perPayment * countOverride * 100) / 100,
            firstDate: new Date(reg.getFullYear(), reg.getMonth(), 15)
        };
    }

    let startIdx = FEE_PAYMENT_MONTHS.indexOf(reg.getMonth());
    if (startIdx === -1) startIdx = 0; // off-season (May/Jun) joiner → full season from July
    const months = FEE_PAYMENT_MONTHS.slice(startIdx);
    const m = reg.getMonth();
    // Jul-Dec: this calendar year starts the season. Jan-Apr: still inside the season
    // that started last July. May/Jun (off-season gap): belongs to the UPCOMING July
    // season, not the one that just finished - matches getSeasonInfo in registration.jsw.
    const firstYear = m >= 6 ? reg.getFullYear() : (m <= 3 ? reg.getFullYear() - 1 : reg.getFullYear());
    const firstMonth = months[0];
    return {
        perPayment,
        count: months.length,
        total: Math.round(perPayment * months.length * 100) / 100,
        firstDate: new Date(firstMonth >= 6 ? firstYear : firstYear + 1, firstMonth, 15)
    };
}

// Tabs (2026-08 restyle) - a Multi-State Box (#prTabsBox) living inside this
// lightbox, separate from Player Admin's own #stateMain. Same pattern as that
// page's sidebar - a plain button per tab, wired to changeState(). Guarded
// throughout so the lightbox still works before the tabs box is built (every
// field just shows in one flat view, same as before this restyle).
const PR_TAB_STATE = {
    Overview: "stateOverview",
    Family: "stateFamily",
    Consents: "stateConsents",
    Fees: "stateFees"
};
function showPrTab(tab) {
    if (!$w("#prTabsBox").id) return;
    $w("#prTabsBox").changeState(PR_TAB_STATE[tab] || "stateOverview");
}

// Actions area as its own Multi-State Box (#prActionsBox, 2026-08) - Rob's idea,
// extended: rather than one crowded area with several fields shown/hidden via
// expand/collapse, each "mode" gets its own state so only ever ONE thing is on
// screen at a time, guaranteed, with zero risk of crowding regardless of how
// many fields any one mode needs. #prMarkLeftBtn stays OUTSIDE this box (in the
// persistent row next to it) since it's the trigger into stateActionLeaving,
// not itself part of any one state.
// Fully backward compatible: if #prActionsBox isn't built yet, this is a no-op
// and the original expand()/collapse() calls (still present below) keep
// working exactly as before - build the box whenever you're ready, nothing
// breaks in the meantime.
const PR_ACTION_STATE = {
    Step: "stateActionStep",
    None: "stateActionNone",
    ChangeStatus: "stateActionChangeStatus",
    Leaving: "stateActionLeaving"
};
function showPrAction(state) {
    if (!$w("#prActionsBox").id) return;
    $w("#prActionsBox").changeState(PR_ACTION_STATE[state] || "stateActionStep");
}

$w.onReady(async function () {
    const ctx = wixWindow.lightbox.getContext() || {};
    const playerId = ctx.playerId;
    if (!playerId) { wixWindow.lightbox.close(); return; }

    if ($w("#prTabOverview").id) $w("#prTabOverview").onClick(() => showPrTab("Overview"));
    if ($w("#prTabFamily").id) $w("#prTabFamily").onClick(() => showPrTab("Family"));
    if ($w("#prTabConsents").id) $w("#prTabConsents").onClick(() => showPrTab("Consents"));
    if ($w("#prTabFees").id) $w("#prTabFees").onClick(() => showPrTab("Fees"));

    // Optional - Wix's own Lightbox popup chrome provides a close (X) already,
    // so this custom button isn't required. Only wire it if you've built one.
    if ($w("#prClose").id) $w("#prClose").onClick(() => wixWindow.lightbox.close());
    $w("#prDownloadPhoto").disable(); $w("#prDownloadPhoto").target = "_blank";
    $w("#prDownloadDoc").disable();   $w("#prDownloadDoc").target = "_blank";

    // Download this one player's full record as CSV - reuses the same
    // getPlayersExportUrl() the Reports state's bulk exports use, just scoped
    // to this player's _id, so the fields always match the bulk export exactly.
    if ($w("#prExportCsvBtn").id) {
        $w("#prExportCsvBtn").onClick(async () => {
            const $btn = $w("#prExportCsvBtn");
            const rest = $btn.label;
            $btn.disable();
            $btn.label = "Generating...";
            try {
                const url = await getPlayersExportUrl("all", player && player._id);
                if (url) {
                    wixLocation.to(url);
                    $btn.label = rest;
                } else {
                    $btn.label = "No data found";
                    setTimeout(() => { $btn.label = rest; }, 2500);
                }
            } catch (err) {
                console.error("Player CSV export error:", err);
                $btn.label = "Export failed";
                setTimeout(() => { $btn.label = rest; }, 2500);
            } finally {
                $btn.enable();
            }
        });
    }
    $w("#prPrimaryBtn").onClick(runPrimary);
    $w("#prUpdateBtn").onClick(saveManualStatus);
    $w("#prCopyEmailBtn").onClick(() => {
        wixWindow.copyToClipboard(player && player.parentEmail || "").then(() => {
            $w("#prCopyEmailBtn").label = "Copied!";
            setTimeout(() => { $w("#prCopyEmailBtn").label = "Copy email"; }, 1500);
        });
    });

    // Actions area: "Change status" opt-in reveals the manual override dropdown;
    // "Player is leaving" opt-in reveals its own dedicated leave flow. Both
    // guarded — build #prChangeStatusBtn / #prMarkLeftBtn / #prConfirmLeaveBtn
    // in the Editor to activate. Until then the dropdown/leave inputs stay
    // hidden (they default to collapsed in loadPlayer below).
    if ($w("#prChangeStatusBtn").id) {
        $w("#prChangeStatusBtn").onClick(() => {
            $w("#prStatusDropdown").expand();
            $w("#prUpdateBtn").expand();
            $w("#prChangeStatusBtn").collapse();
            showPrAction("ChangeStatus");
        });
    }
    if ($w("#prMarkLeftBtn").id) {
        $w("#prMarkLeftBtn").onClick(() => {
            $w("#prLeaveReason").expand();
            $w("#prLeaveDate").expand();
            if ($w("#prConfirmLeaveBtn").id) $w("#prConfirmLeaveBtn").expand();
            $w("#prMarkLeftBtn").collapse();
            showPrAction("Leaving");
        });
    }
    if ($w("#prConfirmLeaveBtn").id) $w("#prConfirmLeaveBtn").onClick(confirmLeave);

    // Optional "back out without saving" links for the two sub-states - not
    // required, but nice with the new state-box layout. Both guarded.
    if ($w("#prCancelStatusBtn").id) {
        $w("#prCancelStatusBtn").onClick(() => {
            $w("#prStatusDropdown").collapse();
            $w("#prUpdateBtn").collapse();
            if ($w("#prChangeStatusBtn").id) $w("#prChangeStatusBtn").expand();
            showPrAction(primary ? "Step" : "None");
        });
    }
    if ($w("#prCancelLeaveBtn").id) {
        $w("#prCancelLeaveBtn").onClick(() => {
            $w("#prLeaveReason").collapse();
            $w("#prLeaveDate").collapse();
            if ($w("#prConfirmLeaveBtn").id) $w("#prConfirmLeaveBtn").collapse();
            if ($w("#prMarkLeftBtn").id) $w("#prMarkLeftBtn").expand();
            showPrAction(primary ? "Step" : "None");
        });
    }

    // Send-back (bounce a bad photo/doc back to the parent with a note)
    $w("#prSendBackBtn").onClick(sendBackToParent);

    // Fees: tier dropdown previews a pro-rata schedule; one button saves the tier
    // AND enables payment for the parent (see commitFee).
    $w("#prFeeCategory").onChange(previewFee);
    if ($w("#prPaymentStartOverride").id) $w("#prPaymentStartOverride").onChange(previewFee);
    if ($w("#prPaymentCountOverride").id) $w("#prPaymentCountOverride").onChange(previewFee);
    $w("#prSaveFeeBtn").onClick(commitFee);

    // "Amend Payment" - reveals the fee form when there's already an active/pending
    // plan showing instead (see loadPaymentSummary). Optional/guarded.
    if ($w("#prAmendPaymentBtn").id) {
        $w("#prAmendPaymentBtn").onClick(() => {
            if ($w("#prPaymentActiveSummary").id) $w("#prPaymentActiveSummary").collapse();
            if ($w("#prFeeFormBox").id) $w("#prFeeFormBox").expand();
        });
    }

    // Run independently instead of one after another — each is a separate
    // round trip, so awaiting them in sequence made the lightbox visibly slow
    // to open. loadPlayer still needs the dropdown/fee options to exist first,
    // so it stays last, but the two lookups fire together.
    await Promise.all([loadStatusOptions(), loadFeeCategories()]);
    await loadPlayer(playerId);
});

async function loadStatusOptions() {
    // "Left Club" is deliberately NOT an option here — leaving has its own
    // dedicated "Player is leaving" button/flow (see #prMarkLeftBtn below), so
    // it can never be confused with a routine status correction in this list.
    $w("#prStatusDropdown").options = [
        { label: "Active", value: Active_ID },
        { label: "Awaiting Parent", value: INVITED_STATUS_ID },
        { label: "Ready for FA", value: READY_FOR_FA_ID },
        { label: "FA Registered", value: FA_COMPLETE_ID },
        { label: "Renewal Due", value: RENEWAL_STATUS_ID },
        { label: "Form In Progress", value: DRAFT_STATUS_ID },
        { label: "Action Required", value: ACTION_REQUIRED_ID },
        { label: "On Trial", value: TRIAL_STATUS_ID },
        { label: "Enquiry", value: ENQUIRY_STATUS_ID }
    ];
    try {
        const res = await wixData.query("ClubDictionary").eq("category", "leave_reason").find();
        $w("#prLeaveReason").options = res.items.map(r => ({ label: r.label, value: r.label }));
    } catch (err) {
        console.error("Leave reason load error:", err);
    }
}

let feeCategories = [];
async function loadFeeCategories() {
    try {
        const res = await wixData.query("FeeCategories").ascending("F_label").limit(50).find();
        feeCategories = res.items;
        $w("#prFeeCategory").options = [
            { label: "— select fee type —", value: "" },
            ...feeCategories.map(c => ({ label: `${c.F_label} (£${Number(c.F_annual_amount).toFixed(2)})`, value: c._id }))
        ];
    } catch (err) {
        console.error("Fee categories load error:", err);
    }
}

async function loadPlayer(playerId) {
    try {
        const res = await wixData.query("SignolPlayers")
            .eq("_id", playerId)
            .include("SP_team", "ageGroup", "SP_emergContactRelationship", "SP_relationship",
                      "secondaryParentRelation", "sp_gender", "sp_sibling_team")
            .find();
        player = res.items[0];
        if (!player) { wixWindow.lightbox.close(); return; }

        $w("#prName").text = `${player.SP_firstName || ""} ${player.SP_lastName || ""}`.trim();
        if ($w("#prAvatar").id) $w("#prAvatar").text = initials(player);
        paintStatusBadge(player.SP_status);

        $w("#prDob").text = fmtDate(player.SP_dob);
        $w("#prFan").text = player.SP_fanNumber ? String(player.SP_fanNumber) : "Pending";
        $w("#prTeam").text = player.SP_team ? player.SP_team.T_teamName : "No team";
        $w("#prAge").text = player.ageGroup ? player.ageGroup.AG_ageGroup : "—";
        $w("#prType").text = player.SP_trainingOnly ? "Training Only" : "Playing & Training";

        $w("#prParentName").text = player.parentsName || "—";
        $w("#prParentPhone").text = player.parentPhone || "—";
        $w("#prParentEmail").text = player.parentEmail || "—";
        $w("#prEmergName").text = player.SP_emergContactName || "—";
        $w("#prEmergPhone").text = player.SP_emergContactNumber || "—";
        $w("#prEmergRelation").text = player.SP_emergContactRelationship ? player.SP_emergContactRelationship.label || "—" : "—";

        const med = cleanMedical(player.SP_medicalInfo);
        $w("#prMedical").text = med === "" ? "No medical conditions declared." : med;

        if (player.SP_idPhoto) { $w("#prPhoto").src = player.SP_idPhoto; $w("#prPhoto").show(); }
        else { $w("#prPhoto").hide(); }

        // ID document preview (2026-08) - both SP_idPhoto and SP_idDocument are
        // Image fields, so she can actually look at both before deciding whether
        // to send it back, rather than only being able to download and open them
        // separately. Same show/hide pattern as #prPhoto above. Guarded/optional.
        if ($w("#prDocPreview").id) {
            if (player.SP_idDocument) { $w("#prDocPreview").src = player.SP_idDocument; $w("#prDocPreview").show(); }
            else { $w("#prDocPreview").hide(); }
        }

        $w("#prRegDate").text = fmtDate(player.registrationDate);
        $w("#prTasterDate").text = fmtDate(player.firstTasterDate);

        // --- Extended fields (2026-07-25 batch) — player, parents, sibling,
        // consents, and the signature/confirmations from the registration
        // form. Guarded so the lightbox still works before each is built.
        if ($w("#prGender").id) $w("#prGender").text = player.sp_gender ? player.sp_gender.label || "—" : "—";
        if ($w("#prAddress").id) $w("#prAddress").text = fmtAddress(player.mainAddress);
        if ($w("#prParentRelation").id) $w("#prParentRelation").text = player.SP_relationship ? player.SP_relationship.label || "—" : "—";
        if ($w("#prParentDob").id) $w("#prParentDob").text = fmtDate(player.sp_parent_dob);
        if ($w("#prParentAddress").id) $w("#prParentAddress").text = player.sp_parent_address ? fmtAddress(player.sp_parent_address) : "Same as player's";
        if ($w("#prLivesWithBoth").id) $w("#prLivesWithBoth").text = player.livesWithBothParents === true ? "Yes" : "No";

        if ($w("#prSecParentName").id) $w("#prSecParentName").text = player.secondaryParentName || "—";
        if ($w("#prSecParentRelation").id) $w("#prSecParentRelation").text = player.secondaryParentRelation ? player.secondaryParentRelation.label || "—" : "—";
        if ($w("#prSecParentPhone").id) $w("#prSecParentPhone").text = player.secondaryParentMobile || "—";
        if ($w("#prSecParentEmail").id) $w("#prSecParentEmail").text = player.secondaryParentEmail || "—";
        if ($w("#prSecParentDob").id) $w("#prSecParentDob").text = fmtDate(player.sp_secparent_dob);
        if ($w("#prSecParentAddress").id) $w("#prSecParentAddress").text = player.sp_secparent_address ? fmtAddress(player.sp_secparent_address) : "Same as player's";

        if ($w("#prMembershipNo").id) $w("#prMembershipNo").text = player.sp_membership_no || "Not yet assigned";
        if ($w("#prSibling").id) {
            $w("#prSibling").text = player.sp_has_sibling === true
                ? `Yes — ${player.sp_sibling_team ? player.sp_sibling_team.T_teamName : "team not set"}`
                : "No";
        }

        if ($w("#prConsentPhoto").id) $w("#prConsentPhoto").text = consentText(player.sp_consent_photo);
        if ($w("#prConsentSocial").id) $w("#prConsentSocial").text = consentText(player.socialMedia);
        if ($w("#prConsentMedical").id) $w("#prConsentMedical").text = consentText(player.sp_consent_medical);
        if ($w("#prConsentFA").id) $w("#prConsentFA").text = consentText(player.sp_consent_fa);

        if ($w("#prSignedBy").id) $w("#prSignedBy").text = player.registrationPrintNameSignature || "—";
        if ($w("#prSignedDate").id) $w("#prSignedDate").text = fmtDate(player.registrationDateTimeStampSigned);
        if ($w("#prConfirmParent").id) $w("#prConfirmParent").text = boolMark(player.registrationConductParent);
        if ($w("#prConfirmPlayer").id) $w("#prConfirmPlayer").text = boolMark(player.registrationConductPlayer);
        if ($w("#prConfirmCorrect").id) $w("#prConfirmCorrect").text = boolMark(player.registrationConfirmCorrect);
        if ($w("#prScheduleSentDate").id) $w("#prScheduleSentDate").text = fmtDate(player.sp_paymentschedulesentdate);

        // Form completion — so she can see how far a parent has got on an
        // invite/renewal/draft. Active players have no live form, so show a dash.
        // Guarded so the lightbox still works before #prProgress is built.
        if ($w("#prProgress").id) {
            $w("#prProgress").text = player.SP_status === Active_ID
                ? "—"
                : `Form: ${player.registrationProgress || 0}% complete`;
        }

        // Send-back note input starts blank each open
        $w("#prReturnNote").value = "";

        // Fees: default the tier to whatever's saved, and preview its schedule
        const feeId = player.sp_fee_category && (player.sp_fee_category._id || player.sp_fee_category) || "";
        $w("#prFeeCategory").value = feeId;
        if ($w("#prPaymentStartOverride").id) {
            $w("#prPaymentStartOverride").value = player.sp_paymentStartOverride ? new Date(player.sp_paymentStartOverride) : undefined;
        }
        if ($w("#prPaymentCountOverride").id) {
            $w("#prPaymentCountOverride").value = player.sp_paymentCountOverride || undefined;
        }
        await previewFee();
        await loadPaymentSummary(playerId);

        // --- Actions area reset (see header comment for the overall design) ---
        // Manual-override dropdown: hidden behind "Change status" until asked for.
        // #prChangeStatusBtn itself is toggled below in setupPrimary() - only
        // shown when there's no primary button, never alongside it.
        $w("#prStatusDropdown").value = player.SP_status;
        $w("#prStatusDropdown").collapse();
        $w("#prUpdateBtn").label = "Save status";
        $w("#prUpdateBtn").enable();
        $w("#prUpdateBtn").collapse();

        // Leaving: its own button, hidden once a player has already left (their
        // exit is then handled by the primary button's FA-confirm step instead).
        $w("#prLeaveReason").collapse(); $w("#prLeaveReason").value = null;
        $w("#prLeaveDate").collapse(); $w("#prLeaveDate").value = null;
        if ($w("#prConfirmLeaveBtn").id) {
            $w("#prConfirmLeaveBtn").collapse();
            $w("#prConfirmLeaveBtn").label = "Confirm Leave";
            $w("#prConfirmLeaveBtn").enable();
        }
        if ($w("#prMarkLeftBtn").id) {
            if (player.SP_status === LEFT_STATUS_ID) $w("#prMarkLeftBtn").collapse();
            else $w("#prMarkLeftBtn").expand();
        }

        showPrTab("Overview"); // always land on Overview, regardless of which tab was open last time
        setupPrimary();
        await wireDownloads(playerId);
    } catch (err) {
        console.error("Player Record load error:", err);
        wixWindow.lightbox.close();
    }
}

function paintStatusBadge(statusId) {
    let color = AMBER;
    if (statusId === Active_ID) color = GREEN;
    else if (statusId === LEFT_STATUS_ID) color = GREY;
    else if (statusId === ACTION_REQUIRED_ID) color = RED;
    $w("#prStatusBadge").text = STATUS_LABEL[statusId] || "Unknown";
    $w("#prStatusBadge").style.backgroundColor = color;
    $w("#prStatusBadge").style.color = color;
}

// Work out the obvious next step from the current status (the big green
// button). Renewal Due deliberately has NO shortcut here — the parent has to
// submit their renewal form first (it routes to Ready for FA, same review as
// a brand-new registration), so a one-click secretary shortcut straight to
// Active would skip that check entirely. When there's no obvious step,
// #prNoActionText explains why, so a blank gap doesn't read as "unbuilt."
function setupPrimary() {
    primary = null;
    const s = player.SP_status;
    // Collapsed to a single step (2026-08, Rob's call): pressing this at Ready
    // for FA jumps straight to Active instead of landing on the intermediate
    // FA Registered status first. FA Registered still exists as a manual
    // #prStatusDropdown option and the Activate queue (#secActivate) still
    // exists in Player Admin.js, but neither gets reached via this button
    // anymore - only if she manually sets FA Registered herself.
    if (s === READY_FOR_FA_ID) primary = { label: "Mark FA Registered & Active", fields: { SP_status: Active_ID } };
    else if (s === FA_COMPLETE_ID) primary = { label: "Make Active", fields: { SP_status: Active_ID } };
    else if (s === LEFT_STATUS_ID && player.leftClubCheck !== true) primary = { label: "Confirm removed from FA", fields: { leftClubCheck: true } };

    if (primary) {
        $w("#prPrimaryBtn").label = primary.label;
        $w("#prPrimaryBtn").expand();
        if ($w("#prNoActionText").id) $w("#prNoActionText").collapse();
        // Change status is a fallback for when there's nothing obvious to do -
        // it must never sit next to the primary button as a second path to the
        // same result.
        if ($w("#prChangeStatusBtn").id) $w("#prChangeStatusBtn").collapse();
        showPrAction("Step");
    } else {
        $w("#prPrimaryBtn").collapse();
        if ($w("#prNoActionText").id) {
            $w("#prNoActionText").text = noActionMessage(s);
            $w("#prNoActionText").expand();
        }
        if ($w("#prChangeStatusBtn").id) $w("#prChangeStatusBtn").expand();
        showPrAction("None");
    }
}

function noActionMessage(s) {
    if (s === Active_ID) return "No action needed — player is active.";
    if (s === INVITED_STATUS_ID || s === DRAFT_STATUS_ID) return "Waiting on parent to complete the form.";
    if (s === RENEWAL_STATUS_ID) return "Waiting on parent to complete their renewal.";
    if (s === ACTION_REQUIRED_ID) return "Waiting on parent to fix and resubmit.";
    if (s === LEFT_STATUS_ID) return "Player has left — FA removal confirmed.";
    return "No action needed right now.";
}

async function wireDownloads(playerId) {
    const missing = [];
    try {
        const files = await getPlayerFaFiles(playerId);
        if (files && files.photoUrl) { $w("#prDownloadPhoto").link = files.photoUrl; $w("#prDownloadPhoto").enable(); }
        else missing.push("photo");
        if (files && files.documentUrl) { $w("#prDownloadDoc").link = files.documentUrl; $w("#prDownloadDoc").enable(); }
        else missing.push("ID document");
    } catch (err) {
        console.error("Download link error:", err);
        missing.push("files (error)");
    }
    $w("#prIdStatus").text = missing.length
        ? `⚠️ Missing ${missing.join(" & ")}`
        : "✓ Photo and ID document ready to download.";
}

async function runPrimary() {
    if (!primary) return;
    $w("#prPrimaryBtn").disable();
    $w("#prPrimaryBtn").label = "Saving...";
    try {
        await patchPlayer(player._id, primary.fields);
        wixWindow.lightbox.close({ changed: true, playerId: player._id, patch: primary.fields });
    } catch (err) {
        console.error("Primary action failed:", err);
        $w("#prPrimaryBtn").enable();
        $w("#prPrimaryBtn").label = "Error — try again";
    }
}

// Manual override — anything OTHER than leaving (that has its own dedicated
// flow below). Deliberately simple: just writes the picked status.
async function saveManualStatus() {
    const newStatus = $w("#prStatusDropdown").value;
    if (!newStatus) return;

    $w("#prUpdateBtn").disable();
    $w("#prUpdateBtn").label = "Saving...";
    try {
        await patchPlayer(player._id, { SP_status: newStatus });
        wixWindow.lightbox.close({ changed: true, playerId: player._id, patch: { SP_status: newStatus } });
    } catch (err) {
        console.error("Manual status save failed:", err);
        $w("#prUpdateBtn").enable();
        $w("#prUpdateBtn").label = "Error — try again";
    }
}

// --- Player is leaving: its own dedicated flow (triggered by #prMarkLeftBtn),
// separate from the manual status dropdown, since leaving is a deliberate
// one-way action (clears their team, drops them into the "confirm removed
// from FA" queue) rather than a routine correction.
async function confirmLeave() {
    const reason = $w("#prLeaveReason").value;
    const date = $w("#prLeaveDate").value;
    if (!reason || !date) {
        $w("#prConfirmLeaveBtn").label = "Pick reason & date";
        setTimeout(() => { $w("#prConfirmLeaveBtn").label = "Confirm Leave"; }, 2500);
        return;
    }

    const fields = {
        SP_status: LEFT_STATUS_ID,
        leaveReason: reason,
        SPleavingDate: toDateStr(date),
        SP_team: null,        // free up the squad slot
        leftClubCheck: false  // surfaces them in the "confirm removed from FA" queue
    };

    $w("#prConfirmLeaveBtn").disable();
    $w("#prConfirmLeaveBtn").label = "Saving...";
    try {
        await patchPlayer(player._id, fields);
        wixWindow.lightbox.close({ changed: true, playerId: player._id, patch: fields });
    } catch (err) {
        console.error("Confirm leave failed:", err);
        $w("#prConfirmLeaveBtn").enable();
        $w("#prConfirmLeaveBtn").label = "Error — try again";
    }
}

// --- Send back to parent: bounce a bad photo/doc with a note ---
async function sendBackToParent() {
    const note = ($w("#prReturnNote").value || "").trim();
    if (!note) {
        $w("#prSendBackBtn").label = "Add a note first";
        setTimeout(() => { $w("#prSendBackBtn").label = "Send back to parent"; }, 2500);
        return;
    }
    $w("#prSendBackBtn").disable();
    $w("#prSendBackBtn").label = "Sending...";
    try {
        const res = await secretarySendBackToParent(player._id, note);
        if (!res || !res.success) throw new Error(res && res.error || "send-back failed");
        wixWindow.lightbox.close({ changed: true, playerId: player._id, patch: { SP_status: ACTION_REQUIRED_ID, sp_return_note: note } });
    } catch (err) {
        console.error("Send back failed:", err);
        $w("#prSendBackBtn").enable();
        $w("#prSendBackBtn").label = "Error — try again";
    }
}

// Optional manual anchor date/count (#prPaymentStartOverride Date Picker,
// #prPaymentCountOverride Number Input) - when the secretary sets either, it overrides
// player.registrationDate/the auto-reduced count for BOTH this preview and the actual
// save. Both guarded on .id so this works before the elements are built (falls back to
// ordinary registrationDate-driven behaviour).
function currentStartOverride() {
    return ($w("#prPaymentStartOverride").id && $w("#prPaymentStartOverride").value) || null;
}
function currentCountOverride() {
    return ($w("#prPaymentCountOverride").id && $w("#prPaymentCountOverride").value) || null;
}

// Current payment status summary (2026-08) - shown INSTEAD of the fee-picker
// form whenever this player already has an active/pending GoCardless plan, so
// she can't accidentally re-save a different tier without realising one's
// already running. Important: saving a new tier here only changes what
// player.sp_fee_category points at - it does NOT touch the actual running
// GoCardlessSubscriptions record. That only changes once the PARENT cancels +
// resets it via their own Parent Hub (the existing tier-mismatch flow there).
// So this summary is purely a "heads up, here's what's actually happening"
// safeguard - "Amend Payment" reveals the existing form for when she genuinely
// does need to change something (e.g. correcting a mistaken tier assignment).
// Fully optional/guarded per-element - #prPayTickStrip/#prPayLedger below work
// even if #prPaymentActiveSummary itself isn't built; if NONE of the three
// exist, loadPaymentSummary() below is a no-op and the fee form just always
// shows, same as before any of this was added.
// Renders getPlayerPaymentTimeline()'s monthlyTicks/recent as rich text into
// #prPayTickStrip/#prPayLedger (Text elements, set via .html) - same technique
// as the Teams.js page already uses elsewhere in this project. Two new
// elements instead of building 10+ separate dot elements for a fixed 10-month
// grid, or a repeater for a 3-row ledger.
const TICK_DOT_COLOR = { paid: GREEN, failed: RED, due: AMBER, future: "transparent" };
function tickStripHtml(monthlyTicks) {
    return `<div style="display:flex;gap:8px;font-family:sans-serif;">` + (monthlyTicks || []).map(t => {
        const c = TICK_DOT_COLOR[t.status] || GREY;
        const border = t.status === "future" ? `border:1.5px dashed ${GREY};` : "";
        const mark = t.status === "paid" ? "✓" : t.status === "failed" ? "✕" : "";
        return `<div style="text-align:center;font-size:10px;color:${GREY};">${t.month}<br/>` +
            `<span style="display:inline-block;width:18px;height:18px;line-height:18px;border-radius:50%;margin-top:3px;background:${c};color:#fff;font-size:10px;${border}">${mark}</span></div>`;
    }).join("") + `</div>`;
}
const PAYMENT_STATUS_TEXT = { PAID: "Collected", FAILED: "Failed", PENDING: "Pending" };
const PAYMENT_STATUS_COLOR = { PAID: GREEN, FAILED: RED, PENDING: AMBER };
function ledgerHtml(recent) {
    if (!recent || !recent.length) return `<span style="color:${GREY}; font-size:12px;">No payments recorded yet this season.</span>`;
    return recent.map(p => {
        const date = p.chargeDate ? new Date(p.chargeDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : "—";
        const color = PAYMENT_STATUS_COLOR[p.status] || GREY;
        const label = PAYMENT_STATUS_TEXT[p.status] || p.status;
        return `<div style="display:flex; justify-content:space-between; font-size:12px; padding:4px 0;">` +
            `<span>${date}</span><span style="color:${color}; font-weight:600;">${label}</span><span>£${(p.amount || 0).toFixed(2)}</span></div>`;
    }).join("");
}

// Guarded per-element throughout, not on #prPaymentActiveSummary alone (2026-08
// fix) - #prPayTickStrip/#prPayLedger need to work even before #prPaymentActiveSummary
// itself has been built in the Editor, since they're independently useful.
async function loadPaymentSummary(playerId) {
    if (!$w("#prPaymentActiveSummary").id && !$w("#prPayTickStrip").id && !$w("#prPayLedger").id) return;
    try {
        const [res, timeline] = await Promise.all([
            getGoCardlessStatus(playerId),
            getPlayerPaymentTimeline(playerId)
        ]);
        const isLive = res.success && res.found && (res.status === "ACTIVE" || res.status === "PENDING");
        if (isLive) {
            let text;
            if (res.status === "PENDING") {
                text = "⏳ Payment setup in progress - the parent hasn't finished setting up their bank details yet.";
            } else if (res.lastPaymentStatus === "FAILED") {
                text = `⚠️ Active Direct Debit - last payment failed. ${res.paymentsCollectedCount || 0} payment(s) collected so far.`;
            } else {
                text = `✅ Active Direct Debit - ${res.paymentsCollectedCount || 0} payment(s) collected so far.`;
            }
            if ($w("#prPaymentActiveText").id) $w("#prPaymentActiveText").text = text;
            if ($w("#prPaymentActiveSummary").id) $w("#prPaymentActiveSummary").expand();
            if ($w("#prFeeFormBox").id) $w("#prFeeFormBox").collapse();

            if ($w("#prPayTickStrip").id) {
                $w("#prPayTickStrip").html = timeline.success ? tickStripHtml(timeline.monthlyTicks) : "";
                $w("#prPayTickStrip").expand();
            }
            if ($w("#prPayLedger").id) {
                $w("#prPayLedger").html = timeline.success ? ledgerHtml(timeline.recent) : "";
                $w("#prPayLedger").expand();
            }
        } else {
            if ($w("#prPaymentActiveSummary").id) $w("#prPaymentActiveSummary").collapse();
            if ($w("#prFeeFormBox").id) $w("#prFeeFormBox").expand();
            // Nothing to prove yet - no mandate at all - so the strip/ledger stay
            // collapsed rather than showing an all-grey grid with no context.
            if ($w("#prPayTickStrip").id) $w("#prPayTickStrip").collapse();
            if ($w("#prPayLedger").id) $w("#prPayLedger").collapse();
        }
    } catch (err) {
        console.error("loadPaymentSummary error:", err);
        if ($w("#prPaymentActiveSummary").id) $w("#prPaymentActiveSummary").collapse();
        if ($w("#prFeeFormBox").id) $w("#prFeeFormBox").expand();
        if ($w("#prPayTickStrip").id) $w("#prPayTickStrip").collapse();
        if ($w("#prPayLedger").id) $w("#prPayLedger").collapse();
    }
}

// --- Fees: preview the pro-rata schedule for the selected tier (client-side) ---
function previewFee() {
    const catId = $w("#prFeeCategory").value;
    if (!catId) {
        $w("#prFeeAnnual").text = "—";
        $w("#prSchedulePreview").text = "Select a fee type to see the payment schedule.";
        return;
    }
    const cat = feeCategories.find(c => c._id === catId);
    if (!cat) { $w("#prSchedulePreview").text = "Couldn't work out a schedule."; return; }

    const overrideDate = currentStartOverride();
    const overrideCount = currentCountOverride();
    const annual = Number(cat.F_annual_amount) || 0;
    const anchor = overrideDate || player.sp_paymentStartOverride || player.registrationDate;
    const s = buildFeeSchedule(anchor, annual, overrideCount || player.sp_paymentCountOverride);

    $w("#prFeeAnnual").text = `Annual: £${annual.toFixed(2)}`;
    $w("#prSchedulePreview").text =
        `${s.count} payment(s) of £${s.perPayment.toFixed(2)} (total £${s.total.toFixed(2)})\n` +
        `First payment ${s.firstDate.toLocaleDateString('en-GB')}, then monthly. Collected by Direct Debit.` +
        (overrideDate || overrideCount ? `\n(Using manual override)` : "");
}

// Saves the tier AND enables payment for the parent in one step - see
// secretarySetFeeCategory (registration.jsw), which always sets
// sp_paymentschedulesentdate now, no separate silent-save option.
async function commitFee() {
    const catId = $w("#prFeeCategory").value;
    const $btn = $w("#prSaveFeeBtn");
    const rest = $btn.label;
    if (!catId) {
        $btn.label = "Pick a fee type";
        setTimeout(() => { $btn.label = rest; }, 2500);
        return;
    }
    $btn.disable();
    $btn.label = "Saving...";
    try {
        const overrideDate = currentStartOverride();
        const overrideCount = currentCountOverride();
        const r = await secretarySetFeeCategory(
            player._id, catId,
            overrideDate ? toDateStr(overrideDate) : undefined,
            overrideCount || undefined
        );
        if (!r || !r.success) throw new Error(r && r.error || "fee save failed");
        $btn.label = "Saved ✓";
        setTimeout(() => { $btn.label = rest; $btn.enable(); }, 2000);
    } catch (err) {
        console.error("Fee commit failed:", err);
        $btn.label = "Error — try again";
        setTimeout(() => { $btn.label = rest; $btn.enable(); }, 2500);
    }
}

// Patch a freshly-fetched record, only the known keys (no phantom columns).
async function patchPlayer(playerId, fields) {
    const rec = await wixData.get("SignolPlayers", playerId);
    Object.keys(fields).forEach(k => { rec[k] = fields[k]; });
    await wixData.update("SignolPlayers", rec);
}
