import wixData from 'wix-data';
import wixWindow from 'wix-window';

$w.onReady(function () {
    // 1. Get the context (teamId and teamName) from the main page
    const context = wixWindow.lightbox.getContext(); 
    
    if (context) {
        $w("#team").text = context.teamName;
        loadSquad(context.teamId);
    }
});

async function loadSquad(teamId) {
    try {
        const res = await wixData.query("SignolPlayers")
            .eq("SP_team", teamId)
            .include("SP_status") // Needed to check for 'Active' players
            .ascending("SP_lastName") 
            .find();

        // 2. Filter for Active players only based on your ClubDictionary logic
        const activeSquad = res.items.filter(p => p.SP_status && p.SP_status.label === "Active");

        // 3. Bind the data to the repeater
        $w("#squadRepeater").data = activeSquad;

        $w("#squadRepeater").onItemReady(($item, itemData) => {
            
            // --- THE NAME MAPPING ---
            const firstName = itemData.SP_firstName || "";
            const lastName = itemData.SP_lastName || "";
            $item("#playerName").text = `${firstName} ${lastName}`.trim();

            // --- THE FAN MAPPING ---
            $item("#playerFAN").text = itemData.SP_fanNumber ? String(itemData.SP_fanNumber) : "No FAN";
            
            // --- THE TRAINING LOGIC (Text only, no color change) ---
            if (itemData.SP_trainingOnly === true) {
                $item("#playerTrain").text = "Training Only";
            } else {
                $item("#playerTrain").text = "Training and Playing";
            }
        });

    } catch (err) {
        console.error("Squad load error:", err);
    }
}