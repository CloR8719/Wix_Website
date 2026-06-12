import wixData from 'wix-data';
import { currentMember } from 'wix-members-frontend';

let myTeamIds = [];

$w.onReady(async function () {
    const member = await currentMember.getMember();
    if (!member) return;

    // 1. Get the Manager's Team IDs to filter the delete list
    const staffRecord = await wixData.query("SignolStaff")
        .eq("memberId", member._id)
        .include("SS_team")
        .find();

    if (staffRecord.items.length > 0) {
        const teams = staffRecord.items[0].SS_team;
        myTeamIds = Array.isArray(teams) ? teams.map(t => t._id || t) : [teams?._id || teams];
        
        // 2. Filter Repeater: Only show sponsors currently linked to THIS manager's teams
        const teamData = await wixData.query("Teams")
            .hasSome("_id", myTeamIds)
            .include("teamSponsors")
            .find();

        let visibleSponsorIds = [];
        teamData.items.forEach(team => {
            if (team.teamSponsors) {
                team.teamSponsors.forEach(s => visibleSponsorIds.push(s._id || s));
            }
        });

        // If they have sponsors, show them. If not, the repeater stays empty.
        if (visibleSponsorIds.length > 0) {
            await $w("#sponsorDataset").setFilter(wixData.filter().hasSome("_id", visibleSponsorIds));
        } else {
            await $w("#sponsorDataset").setFilter(wixData.filter().eq("_id", "none"));
        }
    }

    // 3. Add New Sponsor Logic
  $w("#btnAddSponsor").onClick(async () => {
    if (!$w("#inputSponsorName").value) {
        $w("#btnAddSponsor").label = "Name Required!";
        return;
    }

    $w("#btnAddSponsor").label = "Uploading...";
    
    try {
        // 1. Handle the Logo
        let logoUrl = "";
        if ($w("#uploadSponsorLogo").value.length > 0) {
            const uploaded = await $w("#uploadSponsorLogo").uploadFiles();
            logoUrl = uploaded[0].fileUrl;
        }

        // 2. URL Validation: Force https:// if missing
        let rawUrl = $w("#inputSponsorUrl").value.trim();
        if (rawUrl && !rawUrl.startsWith('http')) {
            rawUrl = "https://" + rawUrl;
        }

        const newSponsor = {
            "sponsorName": $w("#inputSponsorName").value.trim(),
            "sponsorLogo": logoUrl,
            "sponsorUrl": rawUrl,
            // Use .value for Rich Text (with tags) or .text for plain text
            "sponsorBlurb": $w("#richSponsorBlurb").value 
        };

        // Insert into the master list
        await wixData.insert("ClubSponsors", newSponsor);

        $w("#btnAddSponsor").label = "Sponsor Added!";
        $w("#sponsorDataset").refresh();
        resetSponsorForm();

    } catch (err) {
        console.error("Add Sponsor Error", err);
        $w("#btnAddSponsor").label = "Validation Error";
    }
});

    // 4. Hard Delete Logic
    $w("#sponsorRepeater").onItemReady(($item, itemData) => {
		$item("#imgSponsor").fitMode = "fixedWidth";
        $item("#btnDeleteSponsor").onClick(async () => {
            // Using a simple label change as a 'loading' state
            $item("#btnDeleteSponsor").label = "Deleting...";
            
            try {
                // REMOVES PERMANENTLY FROM CMS
                await wixData.remove("ClubSponsors", itemData._id);
                
                // Refresh the list
                await $w("#sponsorDataset").refresh();
            } catch (err) {
                console.error("Hard Delete failed - Check Permissions", err);
                $item("#btnDeleteSponsor").label = "Error";
            }
        });
    });
});

function resetSponsorForm() {
    $w("#inputSponsorName").value = "";
    $w("#inputSponsorUrl").value = "";
    $w("#richSponsorBlurb").value = "";
    $w("#uploadSponsorLogo").reset();
    setTimeout(() => { $w("#btnAddSponsor").label = "Add Sponsor"; }, 2000);
}