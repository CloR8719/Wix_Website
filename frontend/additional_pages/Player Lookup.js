import wixData from 'wix-data';
import wixWindow from 'wix-window';

// =====================================================================
//  PLAYER LOOKUP — lightweight standalone quick-search page (2026-08)
//  Lets the secretary jump straight to one player's record without opening
//  the full Player Admin dashboard first. Search by name only, opens the
//  same PlayerRecord lightbox every queue in Player Admin already uses -
//  no new lightbox, no duplicate record-editing logic, just a faster way
//  in when she already knows who she's looking for.
//
//  ⚠️ Restrict this page to secretary/staff members via Wix's own Page
//  Permissions (Members Area role) in the Editor - this file does no auth
//  check of its own, same as Player Admin's page-level restriction.
// =====================================================================

const RESULTS_CAP = 20; // plenty for a name search - never dump the whole club

const fullName = (d) => `${d.SP_firstName || ""} ${d.SP_lastName || ""}`.trim();
const teamName = (d) => d.SP_team ? d.SP_team.T_teamName : "—";
function initials(d) {
    const f = (d.SP_firstName || "").trim()[0] || "";
    const l = (d.SP_lastName || "").trim()[0] || "";
    return (f + l).toUpperCase();
}

let allPlayers = [];

$w.onReady(async function () {
    if ($w("#lookupEmpty").id) {
        $w("#lookupEmpty").text = "Loading players…";
        $w("#lookupEmpty").expand();
    }
    if ($w("#lookupResults").id) $w("#lookupResults").collapse();

    try {
        let items = [];
        let res = await wixData.query("SignolPlayers").include("SP_team").ascending("SP_lastName").limit(1000).find();
        items = items.concat(res.items);
        while (res.hasNext()) {
            res = await res.next();
            items = items.concat(res.items);
        }
        allPlayers = items;
    } catch (err) {
        console.error("Player Lookup load error:", err);
    }

    if ($w("#lookupEmpty").id) $w("#lookupEmpty").text = "Type a name to search.";

    if ($w("#lookupSearch").id) $w("#lookupSearch").onInput(() => renderResults());

    if ($w("#lookupResults").id) $w("#lookupResults").onItemReady(($item, d) => {
        if ($item("#lkAvatar").id) $item("#lkAvatar").text = initials(d);
        $item("#lkName").text = fullName(d);
        if ($item("#lkTeam").id) $item("#lkTeam").text = teamName(d);
        $item("#lkViewBtn").onClick(() => wixWindow.openLightbox("PlayerRecord", { playerId: d._id }));
    });
});

function renderResults() {
    const kw = ($w("#lookupSearch").value || "").toLowerCase().trim();
    if (!kw) {
        $w("#lookupResults").collapse();
        if ($w("#lookupEmpty").id) {
            $w("#lookupEmpty").text = "Type a name to search.";
            $w("#lookupEmpty").expand();
        }
        return;
    }

    const matches = allPlayers.filter((p) => fullName(p).toLowerCase().includes(kw));

    if (matches.length === 0) {
        $w("#lookupResults").collapse();
        if ($w("#lookupEmpty").id) {
            $w("#lookupEmpty").text = "No players match.";
            $w("#lookupEmpty").expand();
        }
        return;
    }

    if ($w("#lookupEmpty").id) $w("#lookupEmpty").collapse();
    $w("#lookupResults").expand();
    $w("#lookupResults").data = matches.slice(0, RESULTS_CAP);
}
