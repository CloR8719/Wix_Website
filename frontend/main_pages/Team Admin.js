import wixData from 'wix-data';
import { currentMember } from 'wix-members-frontend';

let selectedTeamId = ""; 
let currentTeamIndex = 0; 

$w.onReady(async function () {
    const member = await currentMember.getMember();
    if (!member) return;

    // 1. Load Sponsor Options (Using sponsorName for labels)
    try {
        const sponsorData = await wixData.query("ClubSponsors").ascending("sponsorName").find();
        $w("#tagsSponsors").options = sponsorData.items.map(s => ({ 
            "label": s.sponsorName, // This fixes the 'empty bubbles' issue
            "value": s._id          // The ID is used for the database link
        }));
    } catch (err) {
        console.error("Failed to load sponsor options from ClubSponsors", err);
    }

    // 2. Security: Find teams linked to this Staff Member (using SS_team field)
    const staffRecord = await wixData.query("SignolStaff")
        .eq("memberId", member._id)
        .include("SS_team") 
        .find();

    if (staffRecord.items.length > 0) {
        const myTeams = staffRecord.items[0].SS_team;
        // Handle single or multiple team assignments
        const teamIds = Array.isArray(myTeams) ? myTeams.map(t => t._id || t) : [myTeams?._id || myTeams];
        
        // Filter the Teams Dataset to only show their assigned teams
        await $w("#teamDataset").setFilter(wixData.filter().hasSome("_id", teamIds.filter(id => id)));
    }

    // 3. Repeater Setup
    $w("#teamRepeater").onItemReady(($item, itemData, index) => {
        $item("#btnEditTeam").onClick(() => {
            currentTeamIndex = index;
            loadTeamToEditor(itemData);
        });
    });

    // 4. Save Button Action
    $w("#btnSaveTeam").onClick(() => handleTeamSave());
});

async function loadTeamToEditor(item) {
    selectedTeamId = item._id;
    $w("#uploadTeamPhoto").reset();
    
    // Display and Text Inputs
    $w("#txtTeamTitle").text = item.T_teamName; 
    $w("#richTeamIntro").value = item.teamIntro || "";
    $w("#inputLeague").value = item.leagueDivision || "";
    $w("#imgTeamPreview").src = item.T_teamPhoto;
    
    // Time and Address Special Inputs
    $w("#inputTrainingTime").value = item.T_trainingStartTime || "18:00"; 
    $w("#inputPitch").value = item.trainingPitch || "";
    $w("#addressLocation").value = item.trainingLocation || null; 
    
    $w("#richAchievements").value = item.achievements || "";

    // Load Multi-Ref Sponsors (ensure 'teamSponsors' is the correct field key in Teams CMS)
    try {
        const res = await wixData.queryReferenced("Teams", item._id, "teamSponsors");
        $w("#tagsSponsors").value = res.items.map(s => s._id);
    } catch (err) {
        console.error("Sponsor reference loading error", err);
    }

    // Open the editor
    $w("#teamEditorSection").expand();
    $w("#teamEditorSection").scrollTo();
}

async function handleTeamSave() {
    if (!selectedTeamId) return;
    $w("#btnSaveTeam").label = "Saving...";

    try {
        // A. Handle Image Upload
        let photoUrl = $w("#imgTeamPreview").src;
        if ($w("#uploadTeamPhoto").value.length > 0) {
            const uploaded = await $w("#uploadTeamPhoto").uploadFiles();
            photoUrl = uploaded[0].fileUrl;
            $w("#imgTeamPreview").src = photoUrl;
        }

        // B. Get and Update the Teams Record
        const teamUpdate = await wixData.get("Teams", selectedTeamId);
        
        teamUpdate.teamIntro = $w("#richTeamIntro").value;
        teamUpdate.leagueDivision = $w("#inputLeague").value;
        teamUpdate.T_teamPhoto = photoUrl;
        teamUpdate.T_trainingStartTime = $w("#inputTrainingTime").value;
        teamUpdate.trainingPitch = $w("#inputPitch").value;
        teamUpdate.trainingLocation = $w("#addressLocation").value;
        teamUpdate.achievements = $w("#richAchievements").value;

        await wixData.update("Teams", teamUpdate);

        // C. Update Multi-Ref Sponsors
        const selectedSponsorIds = $w("#tagsSponsors").value;
        await wixData.replaceReferences("Teams", "teamSponsors", selectedTeamId, selectedSponsorIds);

        // D. Sync Dataset Display
        await $w("#teamDataset").setCurrentItemIndex(currentTeamIndex);
        await $w("#teamDataset").setFieldValues({
            "teamIntro": teamUpdate.teamIntro,
            "T_teamPhoto": photoUrl,
            "leagueDivision": teamUpdate.leagueDivision
        });
        
        await $w("#teamDataset").refresh();

        $w("#btnSaveTeam").label = "Team Updated!";
        
        // E. Collapse Section and Reset
        setTimeout(() => {
            $w("#teamEditorSection").collapse();
            $w("#btnSaveTeam").label = "Save Changes";
            selectedTeamId = "";
        }, 1500);

    } catch (err) {
        console.error("Team Save Error", err);
        $w("#btnSaveTeam").label = "Error - Try Again";
    }
}