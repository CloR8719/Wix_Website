import wixData from 'wix-data';
import { currentMember } from 'wix-members-frontend';

const ACCESS_ADMIN = "2561a0f5-4625-40f4-a7f2-b87bc1544f88";
const ACCESS_TEAM = "ee493b02-d68b-43ca-9abd-0a691346480d";

let selectedStaffId = ""; 
let currentItemIndex = 0; 

$w.onReady(async function () {
    const member = await currentMember.getMember();
    if (!member) return;

    // 1. Load Qualification Options
    try {
        const qualsData = await wixData.query("Qualifications").ascending("shortName").find();
        $w("#tagsQuals").options = qualsData.items.map(q => ({ "label": q.shortName, "value": q._id }));
    } catch (err) {
        console.error("Failed to load qualification options", err);
    }

    // 2. Set Permissions Filter
    const result = await wixData.query("SignolStaff")
        .eq("memberId", member._id)
        .include("accessLevel", "SS_team") 
        .find();

    if (result.items.length > 0) {
        const currentUser = result.items[0];
        const levelId = currentUser.accessLevel?._id || currentUser.accessLevel;
        let filter = wixData.filter();
        
        if (levelId === ACCESS_ADMIN) { 
            console.log("Admin: Full List");
        } else if (levelId === ACCESS_TEAM) { 
            let myTeams = currentUser.SS_team;
            let teamIds = Array.isArray(myTeams) ? myTeams.map(t => t._id || t) : [myTeams?._id || myTeams];
            filter = filter.hasSome("SS_team", teamIds.filter(id => id));
        } else { 
            filter = filter.eq("memberId", member._id); 
        }
        await $w("#staffDataset").setFilter(filter);
    }

    // 3. Repeater Setup
    $w("#staffRepeater").onItemReady(($item, itemData, index) => {
        $item("#btnEdit").onClick(() => {
            currentItemIndex = index; 
            loadMemberToEditor(itemData);
        });
    });

    // 4. Save Button
    $w("#btnSave").onClick(() => {
        handleSave();
    });
});

async function loadMemberToEditor(item) {
    selectedStaffId = item._id; 
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

    // SHOW THE EDITOR ONLY NOW
    $w("#editorSection").expand();
    $w("#editorSection").scrollTo();
}

async function handleSave() {
    if (!selectedStaffId) return;
    $w("#btnSave").label = "Saving...";

    try {
        let headshotUrl = $w("#imgPreview").src;
        if ($w("#uploadPhoto").value.length > 0) {
            const uploadedFiles = await $w("#uploadPhoto").uploadFiles();
            if (uploadedFiles.length > 0) {
                headshotUrl = uploadedFiles[0].fileUrl;
            }
        }

        const itemToUpdate = await wixData.get("SignolStaff", selectedStaffId);
        itemToUpdate.headshot = headshotUrl;
        itemToUpdate.bio = $w("#inputBio").value;
        await wixData.update("SignolStaff", itemToUpdate);

        const selectedQualIds = $w("#tagsQuals").value;
        await wixData.replaceReferences("SignolStaff", "SS_Qualifications", selectedStaffId, selectedQualIds);

        // Sync Dataset display
        await $w("#staffDataset").setCurrentItemIndex(currentItemIndex);
        await $w("#staffDataset").setFieldValues({
            "bio": itemToUpdate.bio,
            "headshot": headshotUrl
        });
        
        await $w("#staffDataset").refresh();

        $w("#btnSave").label = "Changes Saved!";

        // HIDE THE EDITOR AFTER A SHORT DELAY
        setTimeout(() => { 
            $w("#editorSection").collapse();
            $w("#btnSave").label = "Save Changes"; 
            selectedStaffId = ""; // Reset for safety
        }, 1500);

    } catch (err) {
        console.error("Save Error:", err);
        $w("#btnSave").label = "Error - Try Again";
    }
}