import wixData from 'wix-data';
import wixLocation from 'wix-location'; 
import { getStaffExportUrl } from 'backend/exportCsv';

let teamOptions = [];
let roleOptions = [];
let qualOptions = [];
let allStaffItems = []; 

$w.onReady(async function () {
    await loadOptions();
    // loadStaff is called here after loadOptions has set the first ID
    loadStaff();

    // --- NEW: EXPORT BUTTON LOGIC ---
    $w("#exportSatffBtn").onClick(async () => {
        $w("#exportSatffBtn").label = "Generating...";
        try {
            const fileUrl = await getStaffExportUrl();
            if (fileUrl) {
                wixLocation.to(fileUrl);
                $w("#exportSatffBtn").label = "Export Staff List";
            } else {
                $w("#exportSatffBtn").label = "Export Failed";
            }
        } catch (err) {
            console.error(err);
            $w("#exportSatffBtn").label = "Error";
        }
    });

    // --- 1. SEARCH-AS-YOU-TYPE FOR THE DROPDOWN ---
    $w("#staffSearch").onInput(() => {
        const keyword = $w("#staffSearch").value.toLowerCase();
        
        const filtered = allStaffItems.filter(item => 
            item.SS_name.toLowerCase().includes(keyword)
        );

        $w("#staffSelect").options = [
            { label: "Show All Staff", value: "all" },
            ...filtered.map(s => ({ label: s.SS_name, value: s._id }))
        ];
        
        $w("#staffSelect").expand(); 
    });

    // --- 2. FILTERS ---
    $w("#staffSelect").onChange(() => {
        loadStaff();
        $w("#staffSearch").value = ""; 
    });
    $w("#filterTeam").onChange(() => loadStaff());
    $w("#filterRole").onChange(() => loadStaff());

    // --- 3. ADD NEW STAFF ---
    $w("#addnew").onClick(async () => {
        $w("#addnew").label = "Creating...";
        try {
            const newItem = { "SS_name": "New Staff Member" };
            const res = await wixData.insert("SignolStaff", newItem);
            await loadOptions(); 
            $w("#staffSelect").value = res._id;
            await loadStaff(); 
            $w("#addnew").label = "+ Add Staff";
        } catch (err) {
            $w("#addnew").label = "+ Add Staff";
        }
    });
});

async function loadOptions() {
    try {
        const [teams, roles, quals, staffRes] = await Promise.all([
            wixData.query("Teams").ascending("T_teamName").find(),
            wixData.query("ClubRoles").ascending("CR_role").find(),
            wixData.query("Qualifications").ascending("Q_badgeName").find(),
            wixData.query("SignolStaff").ascending("SS_name").find() 
        ]);

        allStaffItems = staffRes.items; 

        teamOptions = teams.items.map(t => ({ label: t.T_teamName, value: t._id }));
        roleOptions = roles.items.map(r => ({ label: r.CR_role, value: r._id }));
        qualOptions = quals.items.map(q => ({ label: q.Q_badgeName, value: q._id }));

        $w("#filterTeam").options = [{ label: "All Teams", value: "" }, ...teamOptions];
        $w("#filterRole").options = [{ label: "All Roles", value: "" }, ...roleOptions];
        
        $w("#staffSelect").options = [
            { label: "Show All Staff", value: "all" }, 
            ...allStaffItems.map(s => ({ label: s.SS_name, value: s._id }))
        ];

        if (allStaffItems.length > 0) {
            $w("#staffSelect").value = allStaffItems[0]._id;
        } else {
            $w("#staffSelect").value = "all";
        }

    } catch (err) { console.error("Load Error", err); }
}

async function loadStaff() {
    let query = wixData.query("SignolStaff");
    const selection = $w("#staffSelect").value;

    if (selection !== "all" && selection) {
        query = query.eq("_id", selection);
    }

    if ($w("#filterTeam").value) query = query.hasSome("SS_team", [$w("#filterTeam").value]);
    if ($w("#filterRole").value) query = query.hasSome("SS_role", [$w("#filterRole").value]);

    const results = await query.descending("_createdDate").find();
    $w("#staffRepeater").data = results.items;
}

$w("#staffRepeater").onItemReady(async ($item, itemData) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const addMonths = (date, months) => {
        let d = new Date(date);
        d.setMonth(d.getMonth() + months);
        return d;
    };

    // --- POPULATE UI ---
    $item("#name").value = itemData.SS_name || "";
    $item("#email").value = itemData.emailAddress || "";
    $item("#mobile").value = itemData.mobile || "";
    $item("#address").value = itemData.address || "";
    $item("#fan").value = itemData.fanNumber ? String(itemData.fanNumber) : "";
    
    if (itemData.dob) $item("#dob").value = new Date(itemData.dob);
    $item("#dbsPicker").value = itemData.dbsExpiry ? new Date(itemData.dbsExpiry) : null;
    $item("#faPicker").value = itemData.firstAidExpiry ? new Date(itemData.firstAidExpiry) : null;
    $item("#sgPicker").value = itemData.safeGuardingExpiry ? new Date(itemData.safeGuardingExpiry) : null;
    $item("#coachPicker").value = itemData.coachingExpiry ? new Date(itemData.coachingExpiry) : null;

    $item("#team").options = teamOptions;
    $item("#role").options = roleOptions;
    
    // Set current multi-ref values for dropdowns
    wixData.queryReferenced("SignolStaff", itemData._id, "SS_team").then(res => { if(res.items[0]) $item("#team").value = res.items[0]._id; });
    wixData.queryReferenced("SignolStaff", itemData._id, "SS_role").then(res => { if(res.items[0]) $item("#role").value = res.items[0]._id; });

    // --- TRAFFIC LIGHTS ---
    const refreshLights = () => {
        const dbs = $item("#dbsPicker").value;
        if (!dbs || dbs < today) updateUI($item("#dbsLight"), $item("#dbsLabel"), "#FF4D4D", "EXPIRED");
        else if (dbs < addMonths(today, 3)) updateUI($item("#dbsLight"), $item("#dbsLabel"), "#FF4D4D", "EXPIRING SOON");
        else if (dbs < addMonths(today, 4)) updateUI($item("#dbsLight"), $item("#dbsLabel"), "#FFA500", "EXPIRING SOON");
        else updateUI($item("#dbsLight"), $item("#dbsLabel"), "#4CAF50", "COMPLIANT");

        const others = [
            { p: $item("#faPicker"), lt: $item("#faLight"), lb: $item("#faLabel") },
            { p: $item("#sgPicker"), lt: $item("#sgLight"), lb: $item("#sgLabel") },
            { p: $item("#coachPicker"), lt: $item("#coachLight"), lb: $item("#coachLabel") }
        ];
        others.forEach(o => {
            const exp = o.p.value;
            if (!exp || exp < today) updateUI(o.lt, o.lb, "#FF4D4D", "EXPIRED");
            else if (exp < addMonths(today, 1)) updateUI(o.lt, o.lb, "#FF4D4D", "EXPIRING");
            else if (exp < addMonths(today, 2)) updateUI(o.lt, o.lb, "#FFA500", "EXPIRING SOON");
            else updateUI(o.lt, o.lb, "#4CAF50", "COMPLIANT");
        });
    };

    const updateUI = (light, label, color, text) => {
        light.style.backgroundColor = color;
        label.text = text;
        label.style.color = color;
    };
    refreshLights();

    // --- BADGES DRAWER ---
    $item("#manageBadgesBtn").onClick(async () => {
        const res = await wixData.queryReferenced("SignolStaff", itemData._id, "SS_Qualifications");
        $item("#qualTags").options = qualOptions;
        $item("#qualTags").value = res.items.length > 0 ? res.items.map(q => q._id) : [];
        $item("#badgesContainer").show();
    });
    $item("#closeBtn").onClick(() => $item("#badgesContainer").hide());
    $item("#qualTags").onChange((e) => wixData.replaceReferences("SignolStaff", "SS_Qualifications", itemData._id, e.target.value));

    // --- AUTO-SAVE ---
    const saveField = async (field, value, isRef = false) => {
        try {
            if (isRef) {
                await wixData.replaceReferences("SignolStaff", field, itemData._id, [value]);
            } else {
                const record = await wixData.get("SignolStaff", itemData._id);
                let finalVal = value;
                if (value instanceof Date) finalVal = value.toISOString().split('T')[0];
                record[field] = finalVal;
                await wixData.update("SignolStaff", record);
                refreshLights();
            }
        } catch (err) { console.error("Save failed", err); }
    };

    $item("#name").onBlur((e) => saveField("SS_name", e.target.value));
    $item("#email").onBlur((e) => saveField("emailAddress", e.target.value));
    $item("#mobile").onBlur((e) => saveField("mobile", e.target.value));
    $item("#address").onBlur((e) => saveField("address", e.target.value));
    $item("#fan").onBlur((e) => saveField("fanNumber", Number(e.target.value)));
    $item("#dob").onChange((e) => saveField("dob", e.target.value));
    $item("#team").onChange((e) => saveField("SS_team", e.target.value, true));
    $item("#role").onChange((e) => saveField("SS_role", e.target.value, true));
    $item("#dbsPicker").onChange((e) => saveField("dbsExpiry", e.target.value));
    $item("#faPicker").onChange((e) => saveField("firstAidExpiry", e.target.value));
    $item("#sgPicker").onChange((e) => saveField("safeGuardingExpiry", e.target.value));
    $item("#coachPicker").onChange((e) => saveField("coachingExpiry", e.target.value));

    // --- DELETE ---
    $item("#delete").onClick(async () => {
        if ($item("#delete").label === "Confirm?") {
            $item("#delete").label = "Deleting...";
            await wixData.remove("SignolStaff", itemData._id);
            await loadOptions();
            $w("#staffSelect").value = "all";
            loadStaff(); 
        } else {
            $item("#delete").label = "Confirm?";
            $item("#delete").style.backgroundColor = "#FF4D4D";
            setTimeout(() => {
                $item("#delete").label = "Delete";
                $item("#delete").style.backgroundColor = "";
            }, 4000);
        }
    });
});