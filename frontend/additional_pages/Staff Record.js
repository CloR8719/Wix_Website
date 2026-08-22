import wixWindow from 'wix-window';
import wixData from 'wix-data';
import { getStaffRecord, saveStaffRecord, removeStaffMember, getStaffFormOptions } from 'backend/staffData';

// =====================================================================
//  STAFF RECORD LIGHTBOX
//  Opened from stateStaff's roster (Player Admin.js):
//    wixWindow.openLightbox("StaffRecord", { staffId, startEditing })
//
//  Every field is ONE real Wix element, disabled by default so it reads like
//  plain text - #srEditToggleBtn is a single button whose label toggles
//  between "Edit Details" and "Save Changes", enabling/disabling every field
//  at once rather than a separate read-only Text + hidden input per field.
//
//  Role/Team/Qualifications are multi-reference (SS_role/SS_team/
//  SS_Qualifications) - showing every available option at once (a real Wix
//  Tags element's normal behaviour) was unusable for something like Teams
//  (22+ of them) when a staff member only ever has 1-2. Instead each is a
//  small Repeater of removable pills + a Dropdown listing only the NOT-yet-
//  assigned options - see setupMultiField() below.
//
//  See docs/STAFF_RECORD_ELEMENTS.md for the full element list. status/
//  startDate/emergencyContactName/emergencyContactRelation/
//  emergencyContactPhone/notes columns were added to SignolStaff 2026-08 and
//  are wired the same as every other field.
//
//  Closes with { changed: true } when anything was saved or removed.
// =====================================================================

const GREEN = "#22C55E", AMBER = "#F59E0B", RED = "#FF4D4D";

// #srStatus is a fixed 3-value dropdown (per docs/STAFF_RECORD_ELEMENTS.md), not
// CMS-driven. emergencyContactRelation is plain Text on SignolStaff (not a
// Reference), so #srEmergRelation reuses Parent Hub's ClubDictionary
// "relationship" category (same list she already sees on the registration
// form) but stores the LABEL as the value, not the dictionary _id - see
// loadFixedDropdownOptions() in $w.onReady.
const STATUS_OPTIONS = ["Active", "Inactive", "Left the Club"];

// Same shape as Player Admin.js's copy of this - kept duplicated rather than a
// shared public/ module since it's tiny, matching this project's existing
// convention of a self-contained copy per page (e.g. Player Record.js and
// Player Admin.js both keep their own STATUS_LABEL consts rather than sharing).
function complianceStatus(expiry, redMonths, amberMonths) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const addMonths = (date, months) => { const d = new Date(date); d.setMonth(d.getMonth() + months); return d; };
    const exp = expiry ? new Date(expiry) : null;
    if (!exp || exp < today) return { color: RED, label: "EXPIRED" };
    if (exp < addMonths(today, redMonths)) return { color: RED, label: "EXPIRING SOON" };
    if (exp < addMonths(today, amberMonths)) return { color: AMBER, label: "EXPIRING SOON" };
    return { color: GREEN, label: "COMPLIANT" };
}

// Real Wix input elements this record can enable/disable as a block. status/
// startDate/emergencyContact*/notes columns now exist in SignolStaff (2026-08)
// so their elements are wired the same as everything else.
const SIMPLE_FIELD_IDS = [
    "#srFullName", "#srDob", "#srFan", "#srEmail", "#srMobile", "#srAddress",
    "#srDbsExpiry", "#srFaExpiry", "#srSgExpiry", "#srCoachExpiry",
    "#srStatus", "#srStartDate", "#srEmergName", "#srEmergRelation", "#srEmergPhone", "#srNotes"
];

let staffId = null;
let editing = false;
let removeConfirming = false;
let recordChanged = false;
const multiFields = []; // { getSelectedIds, setEnabled } - see setupMultiField()

// A small Repeater of removable pills + a Dropdown listing only the options
// NOT already assigned. Picking a dropdown option adds a pill and removes
// that option from the dropdown; removing a pill puts it back.
//
// labelId/removeBtnId are the item-template element IDs INSIDE this specific
// repeater - Wix requires page-wide unique IDs, so each of the 3 repeaters
// (Role/Team/Qualifications) needs its OWN pair, not a shared #pillLabel/
// #pillRemoveBtn reused across all three (that was wrong in an earlier version
// of this file - Wix doesn't scope IDs per-repeater the way some other
// frameworks do).
function setupMultiField(pillsId, dropdownId, labelId, removeBtnId, placeholderLabel, initiallyAssigned, allOptions) {
    const pills = $w(pillsId);
    const dropdown = $w(dropdownId);
    if (!pills.id || !dropdown.id) return { getSelectedIds: () => initiallyAssigned.map(a => a._id), setEnabled: () => {} };

    let assigned = initiallyAssigned.slice();

    function render() {
        pills.data = assigned;
        const remaining = allOptions.filter(o => !assigned.some(a => a._id === o._id));
        dropdown.options = [{ label: placeholderLabel, value: "" }, ...remaining.map(o => ({ label: o.label, value: o._id }))];
        dropdown.value = "";
    }

    pills.onItemReady(($item, item) => {
        if ($item(labelId).id) $item(labelId).text = item.label;
        if ($item(removeBtnId).id) {
            setElementEnabled($item(removeBtnId), editing);
            $item(removeBtnId).onClick(() => {
                assigned = assigned.filter(a => a._id !== item._id);
                render();
            });
        }
    });

    dropdown.onChange(() => {
        const id = dropdown.value;
        if (!id) return;
        const opt = allOptions.find(o => o._id === id);
        if (opt) assigned.push(opt);
        render();
    });

    render();
    return {
        getSelectedIds: () => assigned.map(a => a._id),
        setEnabled: (on) => {
            setElementEnabled(dropdown, on);
            pills.forEachItem(($item) => { if ($item(removeBtnId).id) setElementEnabled($item(removeBtnId), on); });
        }
    };
}

// Velo elements use .enable()/.disable() methods, not a settable .disabled
// property - this just saves repeating the ternary everywhere below.
function setElementEnabled(el, on) { on ? el.enable() : el.disable(); }

function setEditing(on) {
    editing = on;
    SIMPLE_FIELD_IDS.forEach(id => { if ($w(id).id) setElementEnabled($w(id), on); });
    multiFields.forEach(f => f.setEnabled(on));
    if ($w("#srChangePhotoBtn").id) setElementEnabled($w("#srChangePhotoBtn"), on);
    if ($w("#srEditToggleBtn").id) $w("#srEditToggleBtn").label = on ? "Save Changes" : "Edit Details";
}

function refreshComplianceLights(fields) {
    const CHECKS = [
        { exp: fields.dbsExpiry, thresholds: [3, 4], dot: "#srDbsDot", label: "#srDbsLabel" },
        { exp: fields.firstAidExpiry, thresholds: [1, 2], dot: "#srFaDot", label: "#srFaLabel" },
        { exp: fields.safeGuardingExpiry, thresholds: [1, 2], dot: "#srSgDot", label: "#srSgLabel" },
        { exp: fields.coachingExpiry, thresholds: [1, 2], dot: "#srCoachDot", label: "#srCoachLabel" }
    ];
    CHECKS.forEach(c => {
        const status = complianceStatus(c.exp, c.thresholds[0], c.thresholds[1]);
        if ($w(c.dot).id) $w(c.dot).style.backgroundColor = status.color;
        if ($w(c.label).id) { $w(c.label).text = status.label; $w(c.label).style.color = status.color; }
    });
}

function refreshHeader(name, roleLabels, teamLabels) {
    if ($w("#srName").id) $w("#srName").text = name;
    if ($w("#srRolePill").id) $w("#srRolePill").text = [roleLabels.join(", ") || "No role", teamLabels.join(", ") || "No team"].join(" · ");
}

function populateRecord(record) {
    refreshHeader(record.name, record.roles.map(r => r.label), record.teams.map(t => t.label));
    if ($w("#srHeadshot").id && record.headshot) $w("#srHeadshot").src = record.headshot;

    if ($w("#srFullName").id) $w("#srFullName").value = record.name || "";
    if ($w("#srDob").id) $w("#srDob").value = record.dob ? new Date(record.dob) : null;
    if ($w("#srFan").id) $w("#srFan").value = record.fanNumber ? String(record.fanNumber) : "";
    if ($w("#srEmail").id) $w("#srEmail").value = record.email || "";
    if ($w("#srMobile").id) $w("#srMobile").value = record.mobile || "";
    if ($w("#srAddress").id) $w("#srAddress").value = record.address || "";

    if ($w("#srDbsExpiry").id) $w("#srDbsExpiry").value = record.dbsExpiry ? new Date(record.dbsExpiry) : null;
    if ($w("#srFaExpiry").id) $w("#srFaExpiry").value = record.firstAidExpiry ? new Date(record.firstAidExpiry) : null;
    if ($w("#srSgExpiry").id) $w("#srSgExpiry").value = record.safeGuardingExpiry ? new Date(record.safeGuardingExpiry) : null;
    if ($w("#srCoachExpiry").id) $w("#srCoachExpiry").value = record.coachingExpiry ? new Date(record.coachingExpiry) : null;
    refreshComplianceLights(record);

    if ($w("#srStatus").id) $w("#srStatus").value = record.status || "";
    if ($w("#srStartDate").id) $w("#srStartDate").value = record.startDate ? new Date(record.startDate) : null;
    if ($w("#srEmergName").id) $w("#srEmergName").value = record.emergencyContactName || "";
    if ($w("#srEmergRelation").id) $w("#srEmergRelation").value = record.emergencyContactRelation || "";
    if ($w("#srEmergPhone").id) $w("#srEmergPhone").value = record.emergencyContactPhone || "";
    if ($w("#srNotes").id) $w("#srNotes").value = record.notes || "";
}

function wireTabs() {
    if (!$w("#srTabsBox").id) return;
    // Each piece guarded separately - if the box's states aren't actually named
    // stateOverview/stateCompliance yet, changeState() throws (a real SDK error,
    // not just a missing element) but that shouldn't stop the tab BUTTONS from
    // still getting wired below.
    try { $w("#srTabsBox").changeState("stateOverview"); } catch (err) { console.error("srTabsBox state name mismatch - check the Multi-State Box's own state names match stateOverview/stateCompliance exactly:", err); }
    if ($w("#srTabOverview").id) $w("#srTabOverview").onClick(() => $w("#srTabsBox").changeState("stateOverview"));
    if ($w("#srTabCompliance").id) $w("#srTabCompliance").onClick(() => $w("#srTabsBox").changeState("stateCompliance"));
}

// Date Pickers give back a JS Date object at LOCAL midnight for whatever day
// was picked. Passing that straight to wixData.update() serializes the full
// UTC timestamp (e.g. "1987-11-05T00:00:00.000Z"), and worse - .toISOString()
// converts to UTC first, which can silently shift the date by a day depending
// on timezone (UK is UTC+1 in summer, so local midnight becomes 23:00 the
// PREVIOUS day in UTC). Building the string from the Date's own local
// year/month/day avoids that shift entirely - this is what the old code did
// too (`value.toISOString().split('T')[0]`), just done in a timezone-safe way.
function toDateOnlyString(date) {
    if (!(date instanceof Date)) return date;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function wireEditToggle(getFormOptions) {
    if (!$w("#srEditToggleBtn").id) return;
    $w("#srEditToggleBtn").onClick(async () => {
        if (!editing) { setEditing(true); return; }

        $w("#srEditToggleBtn").disable();
        $w("#srEditToggleBtn").label = "Saving...";
        try {
            const fields = {
                SS_name: $w("#srFullName").id ? $w("#srFullName").value : undefined,
                dob: $w("#srDob").id ? toDateOnlyString($w("#srDob").value) : undefined,
                fanNumber: $w("#srFan").id ? (($w("#srFan").value && Number($w("#srFan").value)) || null) : undefined,
                emailAddress: $w("#srEmail").id ? $w("#srEmail").value : undefined,
                mobile: $w("#srMobile").id ? $w("#srMobile").value : undefined,
                address: $w("#srAddress").id ? $w("#srAddress").value : undefined,
                dbsExpiry: $w("#srDbsExpiry").id ? toDateOnlyString($w("#srDbsExpiry").value) : undefined,
                firstAidExpiry: $w("#srFaExpiry").id ? toDateOnlyString($w("#srFaExpiry").value) : undefined,
                safeGuardingExpiry: $w("#srSgExpiry").id ? toDateOnlyString($w("#srSgExpiry").value) : undefined,
                coachingExpiry: $w("#srCoachExpiry").id ? toDateOnlyString($w("#srCoachExpiry").value) : undefined,
                status: $w("#srStatus").id ? $w("#srStatus").value : undefined,
                startDate: $w("#srStartDate").id ? toDateOnlyString($w("#srStartDate").value) : undefined,
                emergencyContactName: $w("#srEmergName").id ? $w("#srEmergName").value : undefined,
                emergencyContactRelation: $w("#srEmergRelation").id ? $w("#srEmergRelation").value : undefined,
                emergencyContactPhone: $w("#srEmergPhone").id ? $w("#srEmergPhone").value : undefined,
                notes: $w("#srNotes").id ? $w("#srNotes").value : undefined,
                teamIds: multiFields[0].getSelectedIds(),
                roleIds: multiFields[1].getSelectedIds(),
                qualificationIds: multiFields[2].getSelectedIds()
            };
            await saveStaffRecord(staffId, fields);
            recordChanged = true;

            refreshHeader(
                fields.SS_name,
                getFormOptions().roles.filter(r => fields.roleIds.includes(r._id)).map(r => r.label),
                getFormOptions().teams.filter(t => fields.teamIds.includes(t._id)).map(t => t.label)
            );
            refreshComplianceLights(fields);
            setEditing(false);
        } catch (err) {
            console.error("Staff record save failed:", err);
            $w("#srEditToggleBtn").label = "Save failed - try again";
        } finally {
            $w("#srEditToggleBtn").enable();
        }
    });
}

// Two-tap confirm, same pattern as the old #stfDeleteBtn / every other
// delete-style action in this tool. Still a hard delete today - now that
// "status" is a real field this could switch to setting it to "Left the
// Club" instead, but that's a behaviour change Rob hasn't asked for (see
// docs/STAFF_RECORD_ELEMENTS.md).
function wireRemove() {
    if (!$w("#srRemoveBtn").id) return;
    $w("#srRemoveBtn").onClick(async () => {
        if (!removeConfirming) {
            removeConfirming = true;
            $w("#srRemoveBtn").label = "Click again to confirm removal";
            return;
        }
        $w("#srRemoveBtn").label = "Removing...";
        try {
            await removeStaffMember(staffId);
            wixWindow.lightbox.close({ changed: true });
        } catch (err) {
            console.error("Staff remove failed:", err);
            removeConfirming = false;
            $w("#srRemoveBtn").label = "Remove Staff Member";
        }
    });
}

function wireClose() {
    if ($w("#srCloseBtn").id) $w("#srCloseBtn").onClick(() => wixWindow.lightbox.close({ changed: recordChanged }));
}

function wirePhotoUpload() {
    if (!$w("#srChangePhotoBtn").id) return;
    $w("#srChangePhotoBtn").onChange(() => {
        $w("#srChangePhotoBtn").startUpload()
            .then((uploadedFile) => {
                if ($w("#srHeadshot").id) $w("#srHeadshot").src = uploadedFile.url;
                recordChanged = true;
                return saveStaffRecord(staffId, { headshot: uploadedFile.url });
            })
            .catch((err) => console.error("Photo upload failed:", err));
    });
}

$w.onReady(async function () {
    const ctx = wixWindow.lightbox.getContext() || {};
    staffId = ctx.staffId;
    if (!staffId) { wixWindow.lightbox.close(); return; }

    setEditing(false);

    let formOptions = { teams: [], roles: [], qualifications: [] };
    let record;
    let relationOptions = [];
    try {
        const [recordRes, formOptionsRes, relationRes] = await Promise.all([
            getStaffRecord(staffId),
            getStaffFormOptions(),
            wixData.query("ClubDictionary").eq("category", "relationship").limit(100).find().catch(err => {
                console.error("Staff Record: relationship dictionary load failed:", err);
                return { items: [] };
            })
        ]);
        record = recordRes;
        formOptions = formOptionsRes;
        relationOptions = relationRes.items.map(item => item.title || item.label).filter(Boolean);
    } catch (err) {
        console.error("Staff record load error:", err);
        wixWindow.lightbox.close();
        return;
    }
    if (!record) { wixWindow.lightbox.close(); return; }

    // safeStep is a function declaration further down this same scope - hoisted,
    // so it's already callable here, before populateRecord sets .value on these
    // same dropdowns.
    safeStep("loadFixedDropdownOptions", () => {
        if ($w("#srStatus").id) $w("#srStatus").options = STATUS_OPTIONS.map(s => ({ label: s, value: s }));
        if ($w("#srEmergRelation").id) $w("#srEmergRelation").options = relationOptions.map(r => ({ label: r, value: r }));
    });

    // Each setup step below is wrapped separately - a wrong-type element (e.g.
    // #srTabsBox's states not actually named stateOverview/stateCompliance, or
    // #srTabOverview built as Text instead of Button) used to throw and abort
    // every wiring step after it in this list, which is why Remove/Close/Save
    // could all silently stop working from one unrelated tabs bug. Now each
    // step failing just logs and the rest still runs.
    function safeStep(label, fn) {
        try { fn(); } catch (err) { console.error(`Staff Record: ${label} failed - check its element type/state names in the Editor:`, err); }
    }

    safeStep("populateRecord", () => populateRecord(record));

    safeStep("multiFields", () => {
        multiFields.push(setupMultiField("#srTeamPills", "#srTeamAddDropdown", "#teamPillLabel", "#teamPillRemoveBtn", "+ Add a team…", record.teams, formOptions.teams));
        multiFields.push(setupMultiField("#srRolePills", "#srRoleAddDropdown", "#rolePillLabel", "#rolePillRemoveBtn", "+ Add a role…", record.roles, formOptions.roles));
        multiFields.push(setupMultiField("#srQualPills", "#srQualAddDropdown", "#qualPillLabel", "#qualPillRemoveBtn", "+ Add a badge…", record.qualifications, formOptions.qualifications));
        // NOTE: push order above (team, role, qual) matches the getSelectedIds()
        // indexing used in wireEditToggle()'s Save handler - keep in sync if reordered.
    });

    safeStep("wireTabs", wireTabs);
    safeStep("wireEditToggle", () => wireEditToggle(() => formOptions));
    safeStep("wireRemove", wireRemove);
    safeStep("wireClose", wireClose);
    safeStep("wirePhotoUpload", wirePhotoUpload);

    if (ctx.startEditing) setEditing(true);
});
