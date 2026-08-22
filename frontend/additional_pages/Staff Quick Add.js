import wixWindow from 'wix-window';
import { createStaffMember, getStaffFormOptions } from 'backend/staffData';

// =====================================================================
//  STAFF QUICK ADD LIGHTBOX
//  Opened from stateStaff's "+ Add Staff" button (Player Admin.js):
//    wixWindow.openLightbox("StaffQuickAdd")
//  Collects just enough to create the row (name/email/mobile + one team/role),
//  then closes with { staffId } so Player Admin.js can open StaffRecord
//  straight into edit mode for everything else - mirrors the old #staffAddBtn
//  behaviour ("inserts a blank row and selects it") with one lightweight step
//  in front of it so she isn't filling in compliance dates before she's even
//  saved a name. Closes with nothing on Cancel.
// =====================================================================

$w.onReady(async function () {
    try {
        const options = await getStaffFormOptions();
        if ($w("#saTeam").id) $w("#saTeam").options = options.teams.map(t => ({ label: t.label, value: t._id }));
        if ($w("#saRole").id) $w("#saRole").options = options.roles.map(r => ({ label: r.label, value: r._id }));
    } catch (err) {
        console.error("Staff quick-add options load error:", err);
    }

    if ($w("#saCloseBtn").id) $w("#saCloseBtn").onClick(() => wixWindow.lightbox.close());

    if ($w("#saCreateBtn").id) {
        $w("#saCreateBtn").onClick(async () => {
            const name = ($w("#saName").value || "").trim();
            if (!name) {
                $w("#saCreateBtn").label = "Enter a name first";
                setTimeout(() => { $w("#saCreateBtn").label = "Create & Add Compliance Details"; }, 2000);
                return;
            }
            $w("#saCreateBtn").disable();
            $w("#saCreateBtn").label = "Creating...";
            try {
                const res = await createStaffMember({
                    name,
                    email: $w("#saEmail").id ? $w("#saEmail").value : "",
                    mobile: $w("#saMobile").id ? $w("#saMobile").value : "",
                    teamId: $w("#saTeam").id ? $w("#saTeam").value : "",
                    roleId: $w("#saRole").id ? $w("#saRole").value : ""
                });
                wixWindow.lightbox.close({ staffId: res._id });
            } catch (err) {
                console.error("Create staff failed:", err);
                $w("#saCreateBtn").label = "Something went wrong - try again";
                $w("#saCreateBtn").enable();
            }
        });
    }
});
