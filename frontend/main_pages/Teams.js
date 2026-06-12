import { getFullTeamStaff } from 'backend/staffData';

// HELPER: Ensures private image URIs work for guests
function wixImageToUrl(wixUri) {
    if (!wixUri || typeof wixUri !== 'string') return wixUri;
    if (wixUri.startsWith('http')) return wixUri;
    const parts = wixUri.split('/');
    const mediaId = parts[3]; 
    if (mediaId) {
        const cleanId = mediaId.split('#')[0];
        return `https://static.wixstatic.com/media/${cleanId}`;
    }
    return wixUri;
}

$w.onReady(function () {

    // 1. DYNAMIC TEAM DATASET
    $w("#teamDataset").onReady(async () => {
        const item = $w("#teamDataset").getCurrentItem();
        
        if (item) {
            // Intro & Achievements (These load fast as they are public)
            if (item.teamIntro) {
                $w("#intro").html = `<div style="text-align:center; color:#FFF; font-family:Avenir, sans-serif; font-size:20px;">${item.teamIntro.replace(/<[^>]*>?/gm, '')}</div>`;
                $w("#intro").show();
            }

            if (item.achievements) {
                $w("#achievements").html = `<div style="text-align:center; color:#000; font-family:Avenir, sans-serif; font-size:15px;">${item.achievements.replace(/<[^>]*>?/gm, '')}</div>`;
                $w("#achievements").show();
            }

            // --- FETCH SECURE & SORTED STAFF ---
            // The page stays quiet here while the backend works
            const staffList = await getFullTeamStaff(item._id);
            
            if (staffList && staffList.length > 0) {
                $w("#staffRepeater").data = staffList;
                
                // REVEAL: Only show the repeater once data is injected
                // We use expand() first to snap the layout into place, then show()
                $w("#staffRepeater").expand();
                $w("#staffRepeater").show("fade", { duration: 400 }); 
            }
        }
    });

    // 2. STAFF REPEATER LOGIC
    $w("#staffRepeater").onItemReady(($item, itemData) => {
        
        // Populate Name
        $item("#staffName").text = itemData.fullName;
        
        // Populate Bio
        if (itemData.bio) {
            const cleanBio = itemData.bio.replace(/<[^>]*>?/gm, '');
            $item("#bioText").html = `<div style="color:#FFF; font-family:Avenir, sans-serif; font-size:15px; line-height:1.5em;">${cleanBio}</div>`;
        }

        // Image Logic
        if (itemData.photo) {
            const finalImageUrl = wixImageToUrl(itemData.photo);
            $item("#staffImage").src = finalImageUrl;
            $item("#staffImage").alt = itemData.fullName;
            $item("#staffImage").show();
        } else {
            $item("#staffImage").hide();
        }

        // Roles
        $item("#roleText").html = `<div style="color:#FFF; font-family:Avenir, sans-serif; font-size:20px; font-weight:bold;">${itemData.rolesDisplay}</div>`;

        // Badges
        const badgeIds = ["#badge1","#badge2","#badge3","#badge4","#badge5","#badge6","#badge7","#badge8"];
        badgeIds.forEach(id => { if ($item(id)) $item(id).hide(); });

        if (itemData.badgesDisplay) {
            itemData.badgesDisplay.slice(0, badgeIds.length).forEach((b, i) => {
                const img = $item(badgeIds[i]);
                if (img) {
                    img.src = wixImageToUrl(b.src);
                    img.tooltip = b.title;
                    img.show();
                }
            });
        }
    });

    // 3. SPONSORS
    $w("#sponsors").onItemReady(($item) => {
        $item("#sponsorImage").fitMode = "fit"; 
    });
});