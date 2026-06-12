import { getTeamManager } from 'backend/staffData';

$w.onReady(function () {
    // 1. Dataset is ready
    $w("#teamDataset").onReady(async () => {
        
        // 2. Setup how each item should look
        $w("#teamRepeater").onItemReady(async ($item, itemData) => {
            try {
                const teamId = itemData._id;
                const managerData = await getTeamManager(teamId);
                const teamPageLink = itemData['link-teams-T_teamName'] || itemData['link-teams-title_fld'] || "#";

                if (managerData) {
                    $item("#staffName").text = managerData.fullName;
                    $item("#staffTeam").text = managerData.team;
                    $item("#staffImage").src = managerData.photo;
                    $item("#staffImage").link = teamPageLink;
                    $item("#staffImage").show();
                } else {
                    $item("#staffName").text = "Manager TBC";
                    $item("#staffTeam").text = itemData.T_teamName;
                    $item("#staffImage").hide();
                }

                // Show the internal elements
                $item("#staffName").show();
                $item("#staffTeam").show();

            } catch (err) {
                console.error("Item Error:", err);
                $item("#staffTeam").text = itemData.T_teamName;
                $item("#staffTeam").show();
            }
        });

        // 3. THE "UNHIDE" COMMAND
        // Now that the 'instructions' for the repeater are set, we show it.
        // We use .expand() as well just in case you 'collapsed' it to save space.
        $w("#teamRepeater").show();
        $w("#teamRepeater").expand();
        
        console.log("Repeater revealed!");
    });
});