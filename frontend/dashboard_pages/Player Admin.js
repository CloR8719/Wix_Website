import wixData from 'wix-data';
import wixLocation from 'wix-location';
import wixWindow from 'wix-window';
import { currentMember } from 'wix-members-frontend';
import { getPlayersExportUrl, getStaffExportUrl, getTeamsExportUrl } from 'backend/exportCsv';
import { notifyParent, bulkSetRenewal, countRenewalTargets, getSecretaryPaymentsOverview, getStaffComplianceOverview, getCurrentSeasonLabel } from 'backend/registration';
import { getStaffFormOptions, getStaffRoster } from 'backend/staffData';

// =====================================================================
//  CLUB SECRETARY — PLAYER ADMIN (club-wide)
//  Six views in a Multi-State Box (#stateMain), switched via a sidebar nav
//  (2026-08 redesign - see docs/PLAYER_ADMIN_ELEMENTS.md):
//    Dashboard (KPI strip + widgets, the landing view) / Registrations (the old
//    "To Do" pipeline queues, minus Renewals) / Renewals (split out, + bulk
//    season-rollover) / Players (find-a-player) / Payments (GoCardless overview,
//    new) / Reports (CSV exports).
//  Lists just SHOW players; clicking one opens a Lightbox where she acts.
//  "Teams" and "Fixtures" are separate pages, linked to via wixLocation, not
//  states here.
// =====================================================================

// --- ClubDictionary status IDs (shared with Player Admin / Manager Hub) ---
const ENQUIRY_STATUS_ID   = "e4c79abb-e591-44c3-98a9-e111f276bdd2";
const TRIAL_STATUS_ID     = "5f21b19d-878a-4042-a8ec-c1c0a66812b9";
const INVITED_STATUS_ID   = "184b5a98-37c8-41a6-bc58-5a1c17827f04";
const READY_FOR_FA_ID     = "95978c83-70fc-4bd7-bd75-12f43216a0d7";
const FA_COMPLETE_ID      = "af2bef8c-1caa-4bf8-8dce-321d19723741";
const Active_ID           = "705c0b66-d5d5-47b6-b828-98a94c670f1f";
const RENEWAL_STATUS_ID   = "4d354c43-c893-4bc8-8415-18cfc32b3236";
const DRAFT_STATUS_ID     = "ad6fe8f3-c82e-45ae-b688-89d53c3f0a9f";
const LEFT_STATUS_ID      = "d78cb8b0-3b3b-4439-b889-fd36dc434781";
// ⚠️ SETUP: paste the ClubDictionary "Action Required" _id here (same GUID as backend).
const ACTION_REQUIRED_ID  = "d5bd1c0f-e19e-4318-a8d3-d5d6fe63b274";

const REG_BASE = "https://www.signolathleticjfc.co.uk/secure-registration?token=";

const STATUS_LABEL = {
    [ENQUIRY_STATUS_ID]: "Enquiry",
    [TRIAL_STATUS_ID]: "On Trial",
    [INVITED_STATUS_ID]: "Awaiting Parent",
    [READY_FOR_FA_ID]: "Ready for FA",
    [FA_COMPLETE_ID]: "FA Registered",
    [Active_ID]: "Active",
    [RENEWAL_STATUS_ID]: "Renewal Due",
    [DRAFT_STATUS_ID]: "Form In Progress",
    [ACTION_REQUIRED_ID]: "Action Required",
    [LEFT_STATUS_ID]: "Left Club"
};

// Colours reused from the existing dashboards for a familiar look
const GREEN = "#22C55E", AMBER = "#F59E0B", BLUE = "#3B82F6", RED = "#FF4D4D", GREY = "#7c8ca6";

// --- GLOBAL STATE ---
let allPlayers = [];          // full roster cache, loaded lazily on first Players view
let rosterLoaded = false;     // roster isn't pulled until she opens the Players view
let paymentsData = null;      // GoCardless overview - loaded eagerly (cheap, single call),
                               // the Dashboard KPI needs it immediately on landing
let paymentsFilter = null;    // null = show all; "ACTIVE" | "PENDING" | "FAILED" - set by
                               // clicking a statePayments pill, filters the already-loaded
                               // paymentsData.items client-side, no re-query
let teamCount = 0;            // for the Dashboard "Teams" widget summary

// Staff state (2026-08 redesign - list + StaffRecord/StaffQuickAdd lightboxes,
// see docs/STAFF_RECORD_ELEMENTS.md). allStaffItems now holds the flat roster
// shape from getStaffRoster() (name/teams/roles/expiry dates), not raw
// SignolStaff CMS records.
let staffLoaded = false;      // lazy-loaded on first visit to the Staff view, like the roster
let staffTeamOptions = [];
let staffRoleOptions = [];
let allStaffItems = [];

// Teams state (ported from the old separate Team Admin.js page into stateTeams here)
let teamsLoaded = false;      // lazy-loaded on first visit to the Teams view, like the roster
let teamStaffOptions = [];
let teamAgeGroupOptions = [];

let incomeChartRendered = false; // lazy-rendered on first visit to Reports (see showView())

// --- SIDEBAR NAV (2026-08 redesign) ---
// Replaces the old #viewToggle 3-way radio. Local state-switching only - see
// docs/PLAYER_ADMIN_ELEMENTS.md for why this isn't a shared cross-page component.
// Nav button look (default/hover/pressed) is handled entirely by Wix's own button
// states in the Editor now, not code - code only decides WHICH state to switch to.
const NAV_STATE = {
    Dashboard: "stateDashboard",
    Registrations: "statePipeline",
    Renewals: "stateRenewals",
    Players: "statePlayers",
    Staff: "stateStaff",
    Teams: "stateTeams",
    Payments: "statePayments",
    Reports: "stateReports",
    Fixtures: "stateFixtures" // placeholder state - empty until the Fixtures feature itself is built (docs/fixtures.md, parked)
};

function setupNav() {
    // Every nav item is a local state now - Team Admin and Staff Admin were both
    // separate pages originally, both ported in (stateTeams/stateStaff); Fixtures
    // is a local placeholder state too. No external links left in the sidebar.
    // One single shared nav group, pinned outside #stateMain - see the sidebar-rail
    // note below for how the navy background behind it still matches each state's
    // content height without duplicating these buttons per state.
    Object.keys(NAV_STATE).forEach((view) => {
        const btn = $w("#nav" + view);
        if (!btn.id) return;
        btn.onClick(() => showView(view));
    });
}

// Top bar subtitle - "Welcome back, <name>" - reads whoever's actually logged in
// rather than a hardcoded name, so it stays correct if anyone else ever covers
// this role. Guards on .id so the top bar works before this element's built.
async function loadTopBarGreeting() {
    if (!$w("#pageSubtitle").id) return;
    try {
        const member = await currentMember.getMember();
        const firstName = member && member.contactDetails ? member.contactDetails.firstName : "";
        $w("#pageSubtitle").text = firstName
            ? `Welcome back, ${firstName} — here's what needs you today.`
            : "Welcome back — here's what needs you today.";
    } catch (err) {
        console.error("Top bar greeting load error:", err);
    }
}

// Top bar season pill - reads the real current season ("2026-27") instead of
// being hardcoded, so it doesn't need updating by hand every year. Still a
// backend call (crosses the client-server boundary like any other web module
// function), even though the backend side does no DB query - so still async.
async function loadSeasonLabel() {
    if (!$w("#seasonLabel").id) return;
    try {
        const label = await getCurrentSeasonLabel();
        $w("#seasonLabel").text = "Season " + label;
    } catch (err) {
        console.error("Season label load error:", err);
    }
}

// Sidebar nav badges (Registrations/Renewals/Payments only - the items with
// something that actually needs attention). Hides itself at 0 rather than
// showing an empty "0", same pattern as every queue section in this tool.
// A Text element can't be shaped into a circle on its own, so the badge is a
// small Container (the circle) with a separate Text nested inside it for the
// number - containerId/numId are what shows/hides and gets the digit. One
// shared badge group, same as the nav buttons - guards on .id.
function updateNavBadge(containerId, numId, count) {
    const container = $w(containerId);
    if (!container.id) return;
    if (count > 0) {
        const numEl = $w(numId);
        if (numEl.id) numEl.text = String(count);
        container.expand();
    } else {
        container.collapse();
    }
}

// Sidebar rail height (2026-08) - the navy background behind the nav buttons
// needs to visually reach down to match whichever state's content is showing.
// A code-driven approach (reading a wrapper element's .height at runtime and
// resizing #sideBar to match) was tried and abandoned: several element
// types/approaches were tested live, and Velo never returned usable layout
// geometry (.height/.width/.x/.y all read back undefined) on any wrapper
// element built for it.
//
// What works instead: #sideBarRail is its OWN small Multi-State Box, separate
// from #stateMain, with one state per view (same 9 names). Each state is just a
// plain colored rectangle, no buttons inside it, sized by eye in the Editor to
// match that view's actual content height - no runtime measuring needed at all.
// Switched in lockstep with #stateMain every time showView() runs. The actual
// nav buttons (#navDashboard etc.) stay as ONE single shared, pinned group that
// sits on top of the rail and never needs to resize - only the rail underneath
// changes per state. Guards on .id, same as everything else - safe to build one
// rail state at a time.
const RAIL_STATE = {
    Dashboard: "railDashboard",
    Registrations: "railPipeline",
    Renewals: "railRenewals",
    Players: "railPlayers",
    Staff: "railStaff",
    Teams: "railTeams",
    Payments: "railPayments",
    Reports: "railReports",
    Fixtures: "railFixtures"
};

$w.onReady(async function () {
    setupNav();
    // Default to the Dashboard view
    showView("Dashboard");
    loadTopBarGreeting(); // fire-and-forget, doesn't block anything else loading
    loadSeasonLabel();    // same - fire-and-forget

    await loadLookups();

    // Every wiring call below is guarded on .id — this page is being built one
    // state at a time in the Editor, so most of these elements won't exist yet on
    // any given day. An unguarded $w("#missing").onX() throws immediately, which
    // (since this all runs inside $w.onReady) would abort the REST of onReady too
    // — including the loadQueues/loadKpis/loadPayments calls at the very end that
    // the Dashboard actually needs. Guarding here means "wire whatever's built,
    // skip what isn't" instead of "crash on the first thing that isn't built yet".
    //
    // Also wrapped in try/catch (2026-08) - .id existing only proves the element
    // was FOUND, not that it's the right TYPE (e.g. an Address Input built where
    // a plain Input Box was expected throws on .value, a Text built where a
    // Button was expected throws on .onClick). One wrong-type element used to be
    // able to take down the whole Dashboard this same way - now it just logs and
    // the rest of the wiring continues.
    function safeWire(id, wire) {
        const el = $w(id);
        if (!el.id) return;
        try { wire(el); } catch (err) { console.error(`safeWire(${id}) failed - check its element type in the Editor:`, err); }
    }

    // Players view: search + filters
    safeWire("#playerSearch", el => el.onInput(() => renderRoster()));
    safeWire("#filterTeam", el => el.onChange(() => renderRoster()));
    safeWire("#filterAgeGroup", el => el.onChange(() => renderRoster()));
    safeWire("#filterStatus", el => el.onChange(() => renderRoster()));
    safeWire("#filterShowLeft", el => el.onChange(() => renderRoster()));

    // Staff view: search + filters + add + export (2026-08 redesign - list +
    // StaffRecord lightbox, not inline-editable; button wiring happens now
    // regardless of state, same as Players - the actual data fetch is lazy,
    // see showView()'s Staff branch)
    safeWire("#staffSearch", el => el.onInput(() => renderStaffRoster()));
    safeWire("#staffFilterTeam", el => el.onChange(() => renderStaffRoster()));
    safeWire("#staffFilterRole", el => el.onChange(() => renderStaffRoster()));
    safeWire("#staffShowFormer", el => el.onChange(() => renderStaffRoster()));
    safeWire("#staffAddBtn", el => el.onClick(openStaffQuickAdd));
    safeWire("#staffExportBtn", el => el.onClick(exportStaffList));

    // Teams view: search + filter + add + export (ported from the old separate
    // Team Admin.js page - same lazy-data pattern as Players/Staff)
    safeWire("#teamSearch", el => el.onChange(() => loadTeamHub()));
    safeWire("#teamFilterAgeGroup", el => el.onChange(() => loadTeamHub()));
    safeWire("#teamAddBtn", el => el.onClick(addNewTeam));
    safeWire("#teamExportBtn", el => el.onClick(exportTeamsList));

    // Reports: exports (wireExport itself is guarded internally too)
    wireExport("#exportAllBtn", "all", "Export Full Register");
    wireExport("#exportFaBtn", "fa", "Export FA To-Do");
    wireExport("#exportLeaversBtn", "leavers", "Export Leavers");

    // Season rollover: bulk-send a team/age group into renewal (lives in stateRenewals now)
    safeWire("#renewTeam", el => el.onChange(previewRenewCount));
    safeWire("#renewAgeGroup", el => el.onChange(previewRenewCount));
    safeWire("#renewBtn", el => el.onClick(bulkRenew));

    // Payments: click a top pill to filter the list to that status, click it again
    // to clear (see togglePaymentsFilter). Each is a Container wrapping its count
    // Text, same pattern as the KPI cards - the container is what's clickable.
    safeWire("#paymentsFilterActive", el => el.onClick(() => togglePaymentsFilter("ACTIVE")));
    safeWire("#paymentsFilterPending", el => el.onClick(() => togglePaymentsFilter("PENDING")));
    safeWire("#paymentsFilterFailed", el => el.onClick(() => togglePaymentsFilter("FAILED")));

    // Renewal queue "View list" shortcut → Find-a-Player filtered to Renewal Due
    // (only shown when the queue is too big to scroll — see fillRenewalQueue).
    if ($w("#renViewAllBtn").id) {
        $w("#renViewAllBtn").onClick(() => openPlayersFilteredByStatus(RENEWAL_STATUS_ID));
    }

    // Dashboard widget/KPI click-throughs - every card just jumps straight to its
    // full state (no separate drawer/overlay - Wix Classic Editor has no clean
    // native equivalent, so "click a widget, it opens things" means "opens its view").
    // Total Players goes to statePlayers (the roster) rather than a quick-list -
    // it's a 100+ item list, and statePlayers already has search/filter/lazy-load
    // built for exactly that scale.
    wireDashboardCard("#kpiTotalPlayers", "Players");
    wireDashboardCard("#kpiActionRequired", "Registrations");
    wireDashboardCard("#kpiRenewalsDue", "Renewals");
    wireDashboardCard("#kpiPaymentIssues", "Payments");
    wireDashboardCard("#widgetRegistrations", "Registrations");
    wireDashboardCard("#widgetPayments", "Payments");
    wireDashboardCard("#widgetTeams", "Teams");
    wireDashboardCard("#widgetQualifications", "Staff");

    // Landing view (Dashboard) + headline counts + payments overview, all eagerly -
    // these are the numbers the Dashboard KPI strip needs immediately. The 300-player
    // roster is NOT loaded here — it's pulled lazily the first time she opens Players.
    await Promise.all([loadQueues(), loadKpis(), loadPayments(), loadStaffCompliance(), loadTeamsWidgetList()]);
});

// ---------------------------------------------------------------------
//  VIEW SWITCHING
// ---------------------------------------------------------------------
function showView(view) {
    const state = NAV_STATE[view] || "stateDashboard";
    $w("#stateMain").changeState(state);

    // Sidebar rail (see the note above RAIL_STATE) - switched in lockstep with
    // #stateMain so the navy background matches whichever view is now showing.
    // Guarded so this page still works fine before #sideBarRail is built at all.
    if ($w("#sideBarRail").id) {
        $w("#sideBarRail").changeState(RAIL_STATE[view] || "railDashboard");
    }

    // Persistent top-bar title (lives outside #stateMain, so one element covers
    // every state). Guards on .id.
    if ($w("#pageTitle").id) $w("#pageTitle").text = view;

    // Everything below is state-specific lazy-load logic that reaches into elements
    // belonging to whichever view was clicked. This page is being built one state
    // at a time, and Dashboard's own KPI/widget cards jump straight into these views
    // (see wireDashboardCard) - so clicking e.g. "Total Players" before statePlayers
    // is built must NOT throw, or it'd break that click without touching Dashboard's
    // own (already-working) bindings. try/catch here is the blanket safety net;
    // the Players branch also guards its specific elements directly since it runs
    // synchronously and would otherwise throw before ever reaching loadRoster().
    try {
        // Lazy-load the roster the first time she opens the Players view. Show a
        // loading line immediately so the default "pick a team" prompt doesn't flash
        // before the data lands.
        if (view === "Players" && !rosterLoaded) {
            if ($w("#emptyRoster").id) {
                $w("#emptyRoster").text = "Loading players…";
                $w("#emptyRoster").expand();
            }
            if ($w("#playerRepeater").id) $w("#playerRepeater").collapse();
            loadRoster();
        }

        // Lazy-load staff the first time she opens the Staff view - same reasoning as
        // the roster (no need to pull it on every page load). Same "show a loading
        // line, collapse the repeater" fix as Players above (2026-08-11, Rob's ask) -
        // without this the repeater sat visible showing its Editor placeholder/sample
        // content for the couple of seconds before data.length. No new element
        // needed - reuses #staffMeta, which renderStaffRoster() overwrites with the
        // real count as soon as the data lands anyway.
        if (view === "Staff" && !staffLoaded) {
            if ($w("#staffMeta").id) $w("#staffMeta").text = "Loading staff…";
            if ($w("#staffRepeater").id) $w("#staffRepeater").collapse();
            loadStaffRoster();
            staffLoaded = true;
        }

        // Lazy-load teams the first time she opens the Teams view - same reasoning.
        if (view === "Teams" && !teamsLoaded) {
            Promise.all([loadTeamStaffOptions(), loadTeamAgeGroupOptions(), loadTeamNameOptions()])
                .then(loadTeamHub)
                .catch(err => console.error("Teams lazy-load error:", err));
            teamsLoaded = true;
        }
    } catch (err) {
        console.error("showView lazy-load error:", err);
    }

    // Lazy-render the Collected-by-Month chart the first time she opens Reports -
    // reuses paymentsData (already fetched eagerly on page load), no new query.
    if (view === "Reports" && !incomeChartRendered && paymentsData && paymentsData.monthlyIncome) {
        renderIncomeChart(paymentsData.monthlyIncome);
        incomeChartRendered = true;
    }
}

// Dashboard KPI/widget cards just jump to their full state on click - guarded so
// the Dashboard still works before each card's built.
function wireDashboardCard(elementId, view) {
    const el = $w(elementId);
    if (el.id) el.onClick(() => showView(view));
}

// Staff Qualifications widget (replaces the "Recent Activity" gap, 2026-08) - a
// 4x3 grid of counts (DBS/First Aid/Safeguarding/Coaching x expired-or-missing/
// expires within 1 month/expires within 3 months). Club-wide legal/safeguarding
// compliance at a glance; clicking the widget (wired separately) goes to stateStaff.
async function loadStaffCompliance() {
    try {
        const res = await getStaffComplianceOverview();
        if (!res.success) throw new Error(res.error || "staff compliance overview failed");
        renderQualificationsGrid(res.counts);
    } catch (err) {
        console.error("Staff compliance load error:", err);
    }
}

function renderQualificationsGrid(counts) {
    const cells = {
        qualDbsExpired: counts.dbs.expired, qualDbsOneMonth: counts.dbs.oneMonth, qualDbsThreeMonth: counts.dbs.threeMonths,
        qualFaExpired: counts.firstAid.expired, qualFaOneMonth: counts.firstAid.oneMonth, qualFaThreeMonth: counts.firstAid.threeMonths,
        qualSgExpired: counts.safeguarding.expired, qualSgOneMonth: counts.safeguarding.oneMonth, qualSgThreeMonth: counts.safeguarding.threeMonths,
        qualCoachExpired: counts.coaching.expired, qualCoachOneMonth: counts.coaching.oneMonth, qualCoachThreeMonth: counts.coaching.threeMonths
    };
    Object.entries(cells).forEach(([id, val]) => {
        const el = $w("#" + id);
        if (el.id) el.text = String(val);
    });
}

// --- Bar chart helpers (Collected by Month, now in stateReports - 2026-08) ---
// Vertical bars grow UPWARD from a fixed baseline instead of just stretching down
// from a fixed top - achieved by setting height AND y together every time, not
// height alone. The chart's "100%" ceiling is whatever height/position the FIRST
// bar is built at in the Editor - build every bar at the SAME starting height/Y
// (duplicate one bar sideways for the rest, don't resize the copies) and the code
// reads that as the max, scaling the others down from there.
function captureBarBaseline(elementId) {
    const bar = $w(elementId);
    if (!bar.id) return null;
    return { fullHeight: bar.height, baselineY: bar.y + bar.height };
}

function setBarValue(elementId, value, maxValue, fullHeight, baselineY) {
    const bar = $w(elementId);
    if (!bar.id) return;
    const h = maxValue > 0 ? Math.max(2, Math.round((value / maxValue) * fullHeight)) : 2;
    bar.height = h;
    bar.y = baselineY - h;
}

const MONTH_BAR_IDS = ["#barJul", "#barAug", "#barSep", "#barOct", "#barNov", "#barDec", "#barJan", "#barFeb", "#barMar", "#barApr"];
function renderIncomeChart(monthlyIncome) {
    const base = captureBarBaseline(MONTH_BAR_IDS[0]);
    if (!base) return; // chart not built yet - safe no-op
    const values = monthlyIncome.map(m => m.amount);
    const maxValue = Math.max(1, ...values);
    MONTH_BAR_IDS.forEach((id, i) => setBarValue(id, values[i] || 0, maxValue, base.fullHeight, base.baselineY));
}

// Open a player lightbox and refresh the affected lists if anything changed.
async function openTaskLightbox(name, playerId) {
    const result = await wixWindow.openLightbox(name, { playerId });
    if (result && result.changed) await refreshAfterChange(result);
}

// Refresh the affected lists after a change.
// The roster is a cache, so we patch the changed row IN PLACE with the fields we know
// were saved and re-render — re-querying it here would race Wix Data's eventual
// consistency and show the old status until a full page refresh. We only re-query the
// roster as a fallback when the lightbox didn't hand back a patch.
async function refreshAfterChange(result) {
    const patch = result && result.patch;
    const patchedRoster = rosterLoaded && patch && result.playerId &&
        (() => {
            const p = allPlayers.find(x => x._id === result.playerId);
            if (p) { Object.assign(p, patch); renderRoster(); return true; }
            return false;
        })();

    const jobs = [loadQueues(), loadKpis()];
    if (rosterLoaded && !patchedRoster) jobs.push(loadRoster());
    await Promise.all(jobs);
}

// ---------------------------------------------------------------------
//  LOOKUPS (teams, age groups for the filters)
// ---------------------------------------------------------------------
async function loadLookups() {
    try {
        const [teams, ages] = await Promise.all([
            wixData.query("Teams").ascending("T_teamName").limit(1000).find(),
            wixData.query("AgeGroup").ascending("AG_ageGroup").limit(1000).find()
        ]);

        const teamOptions = teams.items.map(t => ({ label: t.T_teamName, value: t._id }));
        const ageGroupOptions = ages.items.map(a => ({ label: a.AG_ageGroup, value: a._id }));
        teamCount = teams.items.length; // Dashboard "Teams" widget summary, set once loadKpis' player total is in too

        $w("#filterTeam").options = [{ label: "All Teams", value: "" }, ...teamOptions];
        $w("#filterAgeGroup").options = [{ label: "All Age Groups", value: "" }, ...ageGroupOptions];

        // Same lookups feed the season-rollover (bulk renewal) selectors
        $w("#renewTeam").options = [{ label: "— select team —", value: "" }, ...teamOptions];
        $w("#renewAgeGroup").options = [{ label: "— select age group —", value: "" }, ...ageGroupOptions];
        $w("#filterStatus").options = [
            { label: "All Statuses", value: "" },
            { label: "Active", value: Active_ID },
            { label: "Awaiting Parent", value: INVITED_STATUS_ID },
            { label: "Ready for FA", value: READY_FOR_FA_ID },
            { label: "FA Registered", value: FA_COMPLETE_ID },
            { label: "Renewal Due", value: RENEWAL_STATUS_ID },
            { label: "Form In Progress", value: DRAFT_STATUS_ID },
            { label: "Action Required", value: ACTION_REQUIRED_ID },
            { label: "On Trial", value: TRIAL_STATUS_ID },
            { label: "Enquiry", value: ENQUIRY_STATUS_ID }
        ];
    } catch (err) {
        console.error("Lookup load error:", err);
    }
}

// ---------------------------------------------------------------------
//  SHARED HELPERS
// ---------------------------------------------------------------------
async function queryAll(query) {
    let items = [];
    let res = await query.limit(1000).find();
    items = items.concat(res.items);
    while (res.hasNext()) {
        res = await res.next();
        items = items.concat(res.items);
    }
    return items;
}

// Patch a freshly-fetched record (never spread the included/expanded item back in —
// that auto-creates phantom CMS columns). Only known keys are written.
async function patchPlayer(playerId, fields) {
    const rec = await wixData.get("SignolPlayers", playerId);
    Object.keys(fields).forEach(k => { rec[k] = fields[k]; });
    await wixData.update("SignolPlayers", rec);
}

function randomToken(length) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let out = '';
    for (let i = 0; i < length; i++) out += chars.charAt(Math.floor(Math.random() * chars.length));
    return out;
}

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB') : "—";
// "N days ago" style label. Uses _updatedDate as a proxy for "when the status
// changed" - same assumption already made for Action Required's "Sent back" date
// elsewhere on this page. Not exact if a record was touched for an unrelated
// reason after the status changed, but close enough for an at-a-glance queue.
const daysAgoLabel = (dateVal) => {
    if (!dateVal) return "";
    const start = new Date(dateVal); start.setHours(0, 0, 0, 0);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const days = Math.round((today.getTime() - start.getTime()) / 86400000);
    if (days <= 0) return "today";
    if (days === 1) return "yesterday";
    return `${days} days ago`;
};
const cleanMedical = (html) => html ? String(html).replace(/<[^>]*>?/gm, '').trim() : "";
const teamName = (item) => item.SP_team ? item.SP_team.T_teamName : "—";
const ageName = (item) => item.ageGroup ? item.ageGroup.AG_ageGroup : "—";
const fullName = (d) => `${d.SP_firstName || ""} ${d.SP_lastName || ""}`.trim();

// Two-letter initials for a queue row's avatar circle (e.g. "Oscar Bennett" → "OB").
// Optional — every queue's #xxAvatar binding below guards on .id so it's skippable.
function initials(d) {
    const f = (d.SP_firstName || "").trim()[0] || "";
    const l = (d.SP_lastName || "").trim()[0] || "";
    if (f || l) return (f + l).toUpperCase();
    // getSecretaryPaymentsOverview()'s items only have a combined "playerName"
    // string, not separate first/last fields like a raw SignolPlayers record -
    // fall back to splitting it so the Payments repeater can use this too.
    const parts = (d.playerName || "").trim().split(/\s+/).filter(Boolean);
    const first = parts[0] ? parts[0][0] : "";
    const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (first + last).toUpperCase();
}

// Converts a hex colour to an rgba string at the given alpha - used to fade a
// badge's background while its text stays solid, same hue for both.
function hexToRgba(hex, alpha) {
    const clean = hex.replace('#', '');
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// A badge is a Container (background) with a Text nested on top (label) - same
// "container behind, text in front" pattern as the nav badges/KPI cards
// elsewhere on this page. Confirmed a plain Text element's own background
// doesn't reliably render on this build (text colour changes, fill doesn't -
// see the Ready for FA screenshot), so the fill needs its own element. boxEl is
// optional/guarded - a badge still works as text-only (no fill) until its
// container is built.
function paintBadge(el, text, color, boxEl = null, bgAlpha = 0.5) {
    if (!el) return;
    el.text = text;
    el.style.color = color;
    if (boxEl && boxEl.id) boxEl.style.backgroundColor = hexToRgba(color, bgAlpha);
}

// ---------------------------------------------------------------------
//  VIEW 1 — "TO DO" ACTION QUEUES
// ---------------------------------------------------------------------
async function loadQueues() {
    try {
        const [readyFa, faDone, renewals, leftToConfirm, invitedOnly, actionReq, draftFull] = await Promise.all([
            queryAll(wixData.query("SignolPlayers").eq("SP_status", READY_FOR_FA_ID).include("SP_team", "ageGroup")),
            queryAll(wixData.query("SignolPlayers").eq("SP_status", FA_COMPLETE_ID).include("SP_team", "ageGroup")),
            queryAll(wixData.query("SignolPlayers").eq("SP_status", RENEWAL_STATUS_ID).include("SP_team", "ageGroup")),
            queryAll(wixData.query("SignolPlayers").eq("SP_status", LEFT_STATUS_ID).ne("leftClubCheck", true).include("SP_team", "ageGroup")),
            queryAll(wixData.query("SignolPlayers").eq("SP_status", INVITED_STATUS_ID).include("SP_team", "ageGroup")),
            queryAll(wixData.query("SignolPlayers").eq("SP_status", ACTION_REQUIRED_ID).include("SP_team", "ageGroup")),
            // Draft players now show IN the Awaiting Parent queue alongside Invited
            // ones (2026-08) - same row template, #invProgress/the progress bar
            // already tells them apart ("Not started" + empty bar vs "Form: N%" +
            // partial bar), so there's nothing extra to build. Still queried in full
            // (not just .count()) since the Pipeline repeater needs the real records
            // now, not just a number.
            queryAll(wixData.query("SignolPlayers").eq("SP_status", DRAFT_STATUS_ID).include("SP_team", "ageGroup"))
        ]);
        const draftCount = draftFull.length;
        // Three statuses all mean "it's with the parent" (2026-08): Invited (not
        // started), Draft (in progress), and Renewal Due (a returning player who
        // hasn't started their renewal form). All three merge into this one
        // Awaiting Parent section/count so she can see and nudge all of them at a
        // glance. Renewals ALSO still get their own dedicated queue + bulk-renew
        // tool in stateRenewals - this doesn't replace that, it's just a second,
        // broader view of the same underlying players. Reuses the `renewals` array
        // already queried above (for fillRenewalQueue) - no extra query needed.
        // The Dashboard keeps its own separate Awaiting Parent/Draft rows (below),
        // that narrower breakdown is still useful there.
        const awaiting = [...invitedOnly, ...draftFull, ...renewals];

        fillQueue("#faRepeater", "#faCount", "#secFA", readyFa);
        fillQueue("#activateRepeater", "#activateCount", "#secActivate", faDone);
        fillRenewalQueue(renewals);
        fillQueue("#leftRepeater", "#leftCount", "#secLeft", leftToConfirm);
        fillQueue("#invitedRepeater", "#invitedCount", "#secInvited", awaiting);
        fillQueue("#actionReqRepeater", "#actionReqCount", "#secActionReq", actionReq);

        // Top-of-page summary strip on statePipeline (2026-08) - a plain count per
        // queue, separate from each section's own "#faCount"-style "N waiting" pill
        // further down the page. Bare numbers here (no "waiting" suffix) since the
        // queue name sits right next to it as static Editor text. All optional/guarded.
        if ($w("#pipeCountFA").id) $w("#pipeCountFA").text = String(readyFa.length);
        if ($w("#pipeCountActivate").id) $w("#pipeCountActivate").text = String(faDone.length);
        if ($w("#pipeCountAwaiting").id) $w("#pipeCountAwaiting").text = String(awaiting.length);
        if ($w("#pipeCountAction").id) $w("#pipeCountAction").text = String(actionReq.length);
        if ($w("#pipeCountLeavers").id) $w("#pipeCountLeavers").text = String(leftToConfirm.length);

        // Dashboard KPI + widget (2026-08 redesign) - reuses these same queue
        // results, no extra queries. "Registrations" widget shows a per-stage
        // breakdown (matches the design mockup) rather than one summary line -
        // #regWidgetSummary (below) is left in as an optional extra, not required.
        if ($w("#kpiActionRequiredNum").id) $w("#kpiActionRequiredNum").text = String(actionReq.length);
        const pipelineTotal = readyFa.length + faDone.length + leftToConfirm.length + awaiting.length + actionReq.length;
        if ($w("#regWidgetSummary").id) {
            $w("#regWidgetSummary").text = pipelineTotal === 0
                ? "Nothing needs you right now"
                : `${pipelineTotal} player${pipelineTotal === 1 ? "" : "s"} moving through registration`;
        }
        // #regRowAwaiting is the Dashboard's "Awaiting Parent" total - matches the
        // Pipeline's merged awaiting list above (not-started Invited + in-progress
        // Draft), so the two numbers agree. #regRowDraft stays as its own separate
        // "how many of those are in progress" breakdown underneath it.
        if ($w("#regRowAwaiting").id) $w("#regRowAwaiting").text = String(invitedOnly.length + draftCount);
        if ($w("#regRowDraft").id) $w("#regRowDraft").text = String(draftCount);
        if ($w("#regRowReadyFA").id) $w("#regRowReadyFA").text = String(readyFa.length);
        if ($w("#regRowFARegistered").id) $w("#regRowFARegistered").text = String(faDone.length);
        updateNavBadge("#navBadgeRegistrations", "#navBadgeRegistrationsNum", pipelineTotal);

        const nothing = !readyFa.length && !faDone.length && !renewals.length &&
                        !leftToConfirm.length && !awaiting.length && !actionReq.length;
        if ($w("#emptyToDo").id) {
            if (nothing) $w("#emptyToDo").expand(); else $w("#emptyToDo").collapse();
        }
    } catch (err) {
        console.error("Queue load error:", err);
    }
}

function fillQueue(repeaterId, countId, sectionId, items) {
    if ($w(countId).id) $w(countId).text = `${items.length} waiting`;
    // Wrapped per-section - loadQueues() calls this 5 times in a row, then still
    // has the pipeline summary strip + Dashboard KPI/widget updates to do after
    // all of them. One bad section (wrong element type, duplicate ID, whatever)
    // throwing here must not take out everything queued up after it.
    try {
        if (items.length === 0) {
            if ($w(sectionId).id) $w(sectionId).collapse();
        } else {
            if ($w(sectionId).id) $w(sectionId).expand();
            if ($w(repeaterId).id) $w(repeaterId).data = items;
        }
    } catch (err) {
        console.error(`fillQueue error on ${sectionId}:`, err);
    }
}

// Renewals get adaptive treatment: after a season rollover this queue can hold
// ~300 not-started renewals (parents haven't touched their forms yet — the moment
// they save, the player flips to Draft and leaves here). A 300-row repeater is
// useless, so above RENEWAL_LIST_CAP we collapse the list to a summary line + a
// "View list" shortcut into Find-a-Player (filtered to Renewal Due). At or below
// the cap she gets the normal per-player cards.
const RENEWAL_LIST_CAP = 10;
function fillRenewalQueue(items) {
    // Guarded throughout - stateRenewals isn't built yet, but this runs
    // unconditionally every page load from loadQueues(), and loadQueues() still
    // has Leavers/Awaiting Parent/Action Required + the Dashboard widgets to fill
    // AFTER this call. An unguarded throw here used to cut all of that off.
    if ($w("#renewalCount").id) $w("#renewalCount").text = String(items.length);
    if ($w("#kpiRenewalsDueNum").id) $w("#kpiRenewalsDueNum").text = String(items.length);
    updateNavBadge("#navBadgeRenewals", "#navBadgeRenewalsNum", items.length);
    if (!$w("#secRenewal").id) return;
    if (items.length === 0) { $w("#secRenewal").collapse(); return; }
    $w("#secRenewal").expand();

    // Always show up to RENEWAL_LIST_CAP cards here so she has an at-a-glance
    // worklist. When there are more, a "showing first N" note + the "View list"
    // button appear, jumping to Find-a-Player (filtered to Renewal Due) for the full set.
    const capped = items.length > RENEWAL_LIST_CAP;
    if ($w("#renewalRepeater").id) {
        $w("#renewalRepeater").expand();
        $w("#renewalRepeater").data = capped ? items.slice(0, RENEWAL_LIST_CAP) : items;
    }

    if (capped) {
        if ($w("#renSummary").id) {
            $w("#renSummary").text = `Showing first ${RENEWAL_LIST_CAP} of ${items.length} renewals not started — tap View list to see them all.`;
            $w("#renSummary").expand();
        }
        if ($w("#renViewAllBtn").id) $w("#renViewAllBtn").expand();
    } else {
        if ($w("#renSummary").id) $w("#renSummary").collapse();
        if ($w("#renViewAllBtn").id) $w("#renViewAllBtn").collapse();
    }
}

// Jump to the Find-a-Player view pre-filtered to a status (used by the renewal
// "View list" shortcut so the big list lives in the searchable roster).
function openPlayersFilteredByStatus(statusId) {
    $w("#playerSearch").value = "";
    $w("#filterTeam").value = "";
    $w("#filterAgeGroup").value = "";
    $w("#filterStatus").value = statusId;
    showView("Players");   // lazy-loads the roster on first open, then re-renders
    renderRoster();        // harmless no-op if the roster is still loading
}

// --- Queue: Ready for FA → FA Registration lightbox ---
// Each of these module-level bindings is guarded on .id — they run as soon as the
// page module loads (not inside $w.onReady), so a missing repeater throws right
// here and, since JS evaluates the file top-to-bottom, silently skips registering
// every binding written AFTER it in the file too. See the safeWire note in onReady.
if ($w("#faRepeater").id) $w("#faRepeater").onItemReady(($item, d) => {
    if ($item("#faAvatar").id) $item("#faAvatar").text = initials(d);
    $item("#faName").text = fullName(d);
    $item("#faTeam").text = teamName(d);
    $item("#faDob").text = fmtDate(d.SP_dob);
    $item("#faParent").text = d.parentsName || "—";
    if ($item("#faType").id) $item("#faType").text = d.SP_trainingOnly ? "Training Only" : "Playing & Training";

    const docsReady = !!d.SP_idPhoto && !!d.SP_idDocument;
    paintBadge($item("#faIdBadge"), docsReady ? "ID ✓" : "ID missing", docsReady ? GREEN : RED, $item("#faIdBadgeBox"));

    $item("#faProcessBtn").onClick(() => openTaskLightbox("PlayerRecord", d._id));
});

// --- Queue: FA done, ready to activate → Player Record lightbox ---
if ($w("#activateRepeater").id) $w("#activateRepeater").onItemReady(($item, d) => {
    if ($item("#actAvatar").id) $item("#actAvatar").text = initials(d);
    $item("#actName").text = fullName(d);
    const registered = daysAgoLabel(d._updatedDate);
    $item("#actTeam").text = registered ? `${teamName(d)} · FA registered ${registered}` : teamName(d);
    $item("#activateBtn").onClick(() => openTaskLightbox("PlayerRecord", d._id));
});

// --- Queue: Renewals in progress → progress tracker (parent completes the form) ---
// Players stay in "Renewal Due" while the parent re-fills the form, so this shows
// how far each renewal has got. They leave the queue on final submit (→ Ready for FA).
if ($w("#renewalRepeater").id) $w("#renewalRepeater").onItemReady(($item, d) => {
    if ($item("#renAvatar").id) $item("#renAvatar").text = initials(d);
    $item("#renName").text = fullName(d);
    $item("#renTeam").text = teamName(d);
    $item("#renProgress").text = d.registrationProgress ? `Form: ${d.registrationProgress}% complete` : "Not started";
    // Same native Progress Bar element as Awaiting Parent's #invProgressBar -
    // optional, guarded, .value handles the fill itself. .tooltip is a nice-to-
    // have on top - wrapped separately so if this element type doesn't actually
    // support it, the fill (the part that matters) still works regardless.
    if ($item("#renProgressBar").id) {
        const pct = Math.max(0, Math.min(100, Number(d.registrationProgress) || 0));
        $item("#renProgressBar").value = pct;
        try { $item("#renProgressBar").tooltip = `${pct}% complete`; } catch (e) { /* tooltip unsupported - bar fill still shows */ }
    }
    // Open the full record so she can see what's done vs outstanding on the renewal.
    $item("#renDoneBtn").onClick(() => openTaskLightbox("PlayerRecord", d._id));
});

// --- Queue: Recently left → Player Record lightbox (confirm removal there) ---
if ($w("#leftRepeater").id) $w("#leftRepeater").onItemReady(($item, d) => {
    if ($item("#leftAvatar").id) $item("#leftAvatar").text = initials(d);
    $item("#leftName").text = fullName(d);
    if ($item("#leftTeam").id) $item("#leftTeam").text = teamName(d);
    $item("#leftAge").text = ageName(d);
    $item("#leftReason").text = d.leaveReason || "—";
    $item("#leftDate").text = fmtDate(d.SPleavingDate);
    $item("#leftConfirmBtn").onClick(() => openTaskLightbox("PlayerRecord", d._id));
});

// --- Queue: Awaiting parents (chase them: copy email / resend link) ---
if ($w("#invitedRepeater").id) $w("#invitedRepeater").onItemReady(($item, d) => {
    if ($item("#invAvatar").id) $item("#invAvatar").text = initials(d);
    $item("#invName").text = fullName(d);
    $item("#invTeam").text = teamName(d);
    $item("#invSentDate").text = fmtDate(d.registrationDate || d._updatedDate);
    $item("#invProgress").text = d.registrationProgress ? `Form: ${d.registrationProgress}%` : "Not started";

    // Mini progress bar (optional, matches the mockup) - #invProgressBar is Wix's
    // native Progress Bar element (not a manually-stacked pair of shapes - that
    // approach kept fighting the Editor's own layout behaviour). Its built-in
    // .value property (0-100) handles the fill and track itself, no width/height
    // math needed. .tooltip is a nice-to-have on top, wrapped separately so if
    // this element type doesn't actually support it, the fill still works
    // regardless (Wix's own ProgressBar type declaration doesn't list .tooltip,
    // which may just be an incomplete declaration rather than a real runtime
    // limitation - this guards either way without needing to know for sure).
    if ($item("#invProgressBar").id) {
        const pct = Math.max(0, Math.min(100, Number(d.registrationProgress) || 0));
        $item("#invProgressBar").value = pct;
        try { $item("#invProgressBar").tooltip = `${pct}% complete`; } catch (e) { /* tooltip unsupported - bar fill still shows */ }
    }

    $item("#invCopyEmailBtn").onClick(() => {
        wixWindow.copyToClipboard(d.parentEmail || "").then(() => {
            $item("#invCopyEmailBtn").label = "Copied!";
            setTimeout(() => { $item("#invCopyEmailBtn").label = "Copy email"; }, 1500);
        });
    });

    $item("#invResendBtn").onClick(() => resendLink($item("#invResendBtn"), d));
});

// Re-send the registration link to the parent via the existing EmailQueue automation.
async function resendLink($btn, d) {
    const rest = $btn.label;
    $btn.disable();
    $btn.label = "Sending...";
    try {
        if (!d.parentEmail) {
            $btn.label = "No email on file";
            setTimeout(() => { $btn.label = rest; $btn.enable(); }, 2500);
            return;
        }
        // Reuse the existing link if there is one; otherwise mint a token + link.
        let link = d.registrationLink;
        if (!link) {
            const token = d.inviteToken || randomToken(16);
            link = REG_BASE + token;
            await patchPlayer(d._id, { inviteToken: token, registrationLink: link });
        }
        await wixData.insert("EmailQueue", {
            parentEmail: d.parentEmail,
            parentName: d.parentsName,
            childName: d.SP_firstName,
            registrationLink: link
        });
        $btn.label = "Sent ✓";
        setTimeout(() => { $btn.label = rest; $btn.enable(); }, 2000);
    } catch (err) {
        console.error("Resend failed:", err);
        $btn.label = "Error";
        setTimeout(() => { $btn.label = rest; $btn.enable(); }, 2500);
    }
}

// --- Queue: Sent back, awaiting parent fix (chase them: copy email / nudge) ---
if ($w("#actionReqRepeater").id) $w("#actionReqRepeater").onItemReady(($item, d) => {
    if ($item("#arAvatar").id) $item("#arAvatar").text = initials(d);
    $item("#arName").text = fullName(d);
    $item("#arTeam").text = teamName(d);
    $item("#arNote").text = d.sp_return_note ? `“${d.sp_return_note}”` : "—";
    $item("#arSentDate").text = `Sent back ${fmtDate(d._updatedDate)}`;

    $item("#arCopyEmailBtn").onClick(() => {
        wixWindow.copyToClipboard(d.parentEmail || "").then(() => {
            $item("#arCopyEmailBtn").label = "Copied!";
            setTimeout(() => { $item("#arCopyEmailBtn").label = "Copy email"; }, 1500);
        });
    });

    $item("#arNudgeBtn").onClick(() => nudgeParent($item("#arNudgeBtn"), d));
});

// Re-send the "please fix your registration" notification with the stored note.
async function nudgeParent($btn, d) {
    const rest = $btn.label;
    $btn.disable();
    $btn.label = "Sending...";
    try {
        const res = await notifyParent(d._id, "sent_back", {
            message: d.sp_return_note || "Your child's registration still needs a small update — please log in to your Parent Hub."
        });
        if (!res || !res.success) throw new Error(res && res.error || "nudge failed");
        $btn.label = "Nudged ✓";
        setTimeout(() => { $btn.label = rest; $btn.enable(); }, 2000);
    } catch (err) {
        console.error("Nudge failed:", err);
        $btn.label = "Error";
        setTimeout(() => { $btn.label = rest; $btn.enable(); }, 2500);
    }
}

// ---------------------------------------------------------------------
//  VIEW 2 — "FIND A PLAYER" ROSTER
// ---------------------------------------------------------------------
const ROSTER_CAP = 100; // never render more than this many rows at once

async function loadRoster() {
    try {
        allPlayers = await queryAll(
            wixData.query("SignolPlayers")
                .include("SP_team", "ageGroup")
                .ascending("SP_lastName")
        );
        rosterLoaded = true;
        renderRoster();
    } catch (err) {
        console.error("Roster load error:", err);
    }
}

function renderRoster() {
    // Guard against rendering (or showing the prompt) before the roster is in —
    // keeps the "Loading players…" line up until the data has actually loaded.
    if (!rosterLoaded) {
        $w("#playerRepeater").collapse();
        $w("#emptyRoster").text = "Loading players…";
        $w("#emptyRoster").expand();
        $w("#rosterCount").text = "";
        return;
    }

    const kw = ($w("#playerSearch").value || "").toLowerCase().trim();
    const teamF = $w("#filterTeam").value;
    const ageF = $w("#filterAgeGroup").value;
    const statusF = $w("#filterStatus").value;
    const showLeft = $w("#filterShowLeft").checked === true;

    // With 300+ players we never show the full list — she must pick a team or search
    // first. "Show left" is only a MODIFIER on top of that filter (it includes leavers
    // in the results); on its own it doesn't trigger a render, so it can't dump the
    // whole club. Nothing renders until a real filter/search is active.
    const hasFilter = !!kw || !!teamF || !!ageF || !!statusF;
    if (!hasFilter) {
        $w("#playerRepeater").collapse();
        $w("#emptyRoster").text = "Pick a team, or search a name, to see players.";
        $w("#emptyRoster").expand();
        $w("#rosterCount").text = "";
        return;
    }

    let list = allPlayers.filter(p => {
        if (!showLeft && p.SP_status === LEFT_STATUS_ID) return false;
        if (statusF && p.SP_status !== statusF) return false;
        if (teamF && (!p.SP_team || p.SP_team._id !== teamF)) return false;
        if (ageF && (!p.ageGroup || p.ageGroup._id !== ageF)) return false;
        if (kw && !fullName(p).toLowerCase().includes(kw)) return false;
        return true;
    });

    const total = list.length;
    const capped = total > ROSTER_CAP;
    if (capped) list = list.slice(0, ROSTER_CAP);

    if (total === 0) {
        $w("#playerRepeater").collapse();
        $w("#emptyRoster").text = "No players match — try a different team or spelling.";
        $w("#emptyRoster").expand();
        $w("#rosterCount").text = "0 players";
    } else {
        $w("#emptyRoster").collapse();
        $w("#playerRepeater").expand();
        $w("#playerRepeater").data = list;
        $w("#rosterCount").text = capped
            ? `Showing first ${ROSTER_CAP} of ${total} — narrow it down by team`
            : `${total} player${total === 1 ? "" : "s"}`;
    }
}

if ($w("#playerRepeater").id) $w("#playerRepeater").onItemReady(($item, d) => {
    if ($item("#pAvatar").id) $item("#pAvatar").text = initials(d);
    $item("#pName").text = fullName(d);
    $item("#pTeam").text = d.SP_team ? d.SP_team.T_teamName : "No team";
    $item("#pAge").text = d.ageGroup ? d.ageGroup.AG_ageGroup : "—";

    // Status badge (green = active, amber = onboarding/renewal, grey = left).
    // Normalise in case SP_status ever comes back as an expanded object rather
    // than the plain id string, then fall back to showing the raw id so an
    // unmapped status is diagnosable on screen (not a mute "Unknown").
    const statusId = (d.SP_status && d.SP_status._id) ? d.SP_status._id : d.SP_status;
    let color = AMBER;
    if (statusId === Active_ID) color = GREEN;
    else if (statusId === LEFT_STATUS_ID) color = GREY;
    paintBadge($item("#pStatusBadge"), STATUS_LABEL[statusId] || `Unknown (${statusId})`, color, $item("#pStatusBadgeBox"));

    const hasMedical = cleanMedical(d.SP_medicalInfo) !== "";
    paintBadge($item("#pMedicalBadge"), hasMedical ? "MEDICAL" : "Clear", hasMedical ? AMBER : GREEN, $item("#pMedicalBadgeBox"));
    paintBadge($item("#pTypeBadge"), d.SP_trainingOnly ? "Training Only" : "Playing", d.SP_trainingOnly ? BLUE : GREY, $item("#pTypeBadgeBox"));

    // Form completion — only meaningful while a parent is filling in a renewal or a
    // fresh registration, so it shows for Renewal Due / In Progress and collapses for
    // every other status to keep normal rows clean. Guarded so the roster still works
    // before #pProgress is built. This is what makes All Players the full renewal list.
    if ($item("#pProgress").id) {
        if (statusId === RENEWAL_STATUS_ID || statusId === DRAFT_STATUS_ID) {
            $item("#pProgress").text = d.registrationProgress ? `Form: ${d.registrationProgress}%` : "Not started";
            $item("#pProgress").expand();
        } else {
            $item("#pProgress").collapse();
        }
    }

    $item("#pViewBtn").onClick(() => openTaskLightbox("PlayerRecord", d._id));
});

// Headline counts via cheap .count() queries — no need to pull 300 records.
async function loadKpis() {
    try {
        const [active, onboarding, left] = await Promise.all([
            wixData.query("SignolPlayers").eq("SP_status", Active_ID).count(),
            wixData.query("SignolPlayers")
                .hasSome("SP_status", [INVITED_STATUS_ID, DRAFT_STATUS_ID, READY_FOR_FA_ID, FA_COMPLETE_ID, RENEWAL_STATUS_ID, ACTION_REQUIRED_ID])
                .count(),
            wixData.query("SignolPlayers").eq("SP_status", LEFT_STATUS_ID).count()
        ]);
        if ($w("#kpiActive").id) $w("#kpiActive").text = String(active);
        if ($w("#kpiOnboarding").id) $w("#kpiOnboarding").text = String(onboarding);
        if ($w("#kpiLeft").id) $w("#kpiLeft").text = String(left);

        // Dashboard KPI/widget (2026-08 redesign) - "Total Players" = active +
        // onboarding (everyone currently in the system, excluding historical leavers).
        const totalPlayers = active + onboarding;
        if ($w("#kpiTotalPlayersNum").id) $w("#kpiTotalPlayersNum").text = String(totalPlayers);
        if ($w("#kpiTotalPlayersSub").id) {
            $w("#kpiTotalPlayersSub").text = `Across ${teamCount} team${teamCount === 1 ? "" : "s"}`;
        }
        if ($w("#teamsWidgetSummary").id) {
            $w("#teamsWidgetSummary").text = `${teamCount} team${teamCount === 1 ? "" : "s"} · ${totalPlayers} players`;
        }
    } catch (err) {
        console.error("KPI count error:", err);
    }
}

// Teams widget's own mini-repeater (2026-08) - team name + active player count per
// team, separate from teamsWidgetSummary's single "N teams · N players" line above.
// One extra query (all active players + their team ref), grouped client-side rather
// than one query per team.
const TEAMS_WIDGET_CAP = 5; // Classic Editor can't scroll a container - see loadTeamsWidgetList
async function loadTeamsWidgetList() {
    try {
        const [teams, players] = await Promise.all([
            wixData.query("Teams").ascending("T_teamName").limit(1000).find(),
            wixData.query("SignolPlayers").eq("SP_status", Active_ID).include("SP_team").limit(1000).find()
        ]);

        const countByTeam = new Map();
        players.items.forEach(p => {
            const teamId = p.SP_team ? p.SP_team._id : null;
            if (teamId) countByTeam.set(teamId, (countByTeam.get(teamId) || 0) + 1);
        });

        const list = teams.items
            .map(t => ({ _id: t._id, name: t.T_teamName, count: countByTeam.get(t._id) || 0 }))
            .sort((a, b) => b.count - a.count); // most active teams first - more useful at a glance than alphabetical

        // Classic Editor has no scroll-within-container option (that's Studio only),
        // so a full 20+ team list would just push the whole page down. Capping to a
        // handful + a "+N more" line keeps this a compact widget - clicking through
        // to stateTeams (already wired) is where she'd see the full list anyway.
        const capped = list.length > TEAMS_WIDGET_CAP;
        if ($w("#teamsWidgetRepeater").id) $w("#teamsWidgetRepeater").data = capped ? list.slice(0, TEAMS_WIDGET_CAP) : list;
        if ($w("#teamsWidgetMore").id) {
            if (capped) {
                $w("#teamsWidgetMore").text = `+ ${list.length - TEAMS_WIDGET_CAP} more teams`;
                $w("#teamsWidgetMore").expand();
            } else {
                $w("#teamsWidgetMore").collapse();
            }
        }
    } catch (err) {
        console.error("Teams widget list load error:", err);
    }
}

if ($w("#teamsWidgetRepeater").id) $w("#teamsWidgetRepeater").onItemReady(($item, d) => {
    $item("#twTeamName").text = d.name;
    $item("#twPlayerCount").text = String(d.count);
});

// ---------------------------------------------------------------------
//  VIEW — STAFF (2026-08 redesign — list + StaffRecord/StaffQuickAdd
//  lightboxes, replacing the old inline-editable repeater. See
//  docs/STAFF_RECORD_ELEMENTS.md for the full field list and CMS notes.
// ---------------------------------------------------------------------

// Same 2-threshold shape as the old per-record traffic lights: DBS uses wider
// windows (3/4 months) than First Aid/Safeguarding/Coaching (1/2 months), same
// numbers as the original Staff Admin.js this replaced. Returns just a color
// for the roster's compact dots, or {color, label} for the record's full
// traffic lights (Staff Record.js has its own copy of this - see the note
// there on why it's duplicated rather than a shared module).
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

const STAFF_CHECKS = [
    { key: "dbsExpiry", thresholds: [3, 4], label: "DBS" },
    { key: "firstAidExpiry", thresholds: [1, 2], label: "First Aid" },
    { key: "safeGuardingExpiry", thresholds: [1, 2], label: "Safeguarding" },
    { key: "coachingExpiry", thresholds: [1, 2], label: "Coaching" }
];

function staffHasIssue(s) {
    return STAFF_CHECKS.some(c => complianceStatus(s[c.key], c.thresholds[0], c.thresholds[1]).color !== GREEN);
}

// "Name" here is a single field (SS_name) - staff records were never split
// into first/last like SignolPlayers, so this doesn't reuse initials() above.
function staffInitials(name) {
    const parts = (name || "").trim().split(/\s+/).filter(Boolean);
    const first = parts[0] ? parts[0][0] : "";
    const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (first + last).toUpperCase();
}

async function loadStaffRoster() {
    try {
        const [options, roster] = await Promise.all([getStaffFormOptions(), getStaffRoster()]);
        staffTeamOptions = options.teams.map(t => ({ label: t.label, value: t._id }));
        staffRoleOptions = options.roles.map(r => ({ label: r.label, value: r._id }));
        $w("#staffFilterTeam").options = [{ label: "All Teams", value: "" }, ...staffTeamOptions];
        $w("#staffFilterRole").options = [{ label: "All Roles", value: "" }, ...staffRoleOptions];
        allStaffItems = roster;
        renderStaffRoster();
    } catch (err) {
        console.error("Staff roster load error:", err);
    }
}

const STAFF_ROSTER_CAP = 15; // never render more than this many rows at once - 55+ rows in one repeater was slow to paint

function renderStaffRoster() {
    const kw = ($w("#staffSearch").value || "").toLowerCase().trim();
    const teamF = $w("#staffFilterTeam").value;
    const roleF = $w("#staffFilterRole").value;
    // #staffShowFormer now does something real (2026-08) - the "status" field
    // was added to SignolStaff. "Former" = status is exactly "Left the Club";
    // Active/Inactive/blank (existing staff have no status set yet) all count
    // as current and show regardless of this toggle - only an explicit "Left
    // the Club" gets hidden by default.
    const showFormer = $w("#staffShowFormer").id ? $w("#staffShowFormer").checked === true : true;

    let list = allStaffItems.filter(s => {
        if (!showFormer && s.status === "Left the Club") return false;
        if (kw && !s.name.toLowerCase().includes(kw)) return false;
        if (teamF && !s.teamIds.includes(teamF)) return false;
        if (roleF && !s.roleIds.includes(roleF)) return false;
        return true;
    });

    const total = list.length;
    const capped = total > STAFF_ROSTER_CAP;
    if (capped) list = list.slice(0, STAFF_ROSTER_CAP);

    if ($w("#staffMeta").id) {
        const needsAttention = allStaffItems.filter(staffHasIssue).length;
        const countText = capped
            ? `Showing first ${STAFF_ROSTER_CAP} of ${total} — search or filter to narrow it down`
            : `${total} staff & volunteer${total === 1 ? "" : "s"}`;
        $w("#staffMeta").text = countText + (needsAttention ? ` · ${needsAttention} with compliance needing attention` : "");
    }

    $w("#staffRepeater").data = list;
    $w("#staffRepeater").expand(); // undo the "Loading staff…" collapse in showView, if this is the first render
}

async function openStaffRecord(staffId) {
    const result = await wixWindow.openLightbox("StaffRecord", { staffId });
    if (result && result.changed) loadStaffRoster();
}

async function openStaffQuickAdd() {
    const result = await wixWindow.openLightbox("StaffQuickAdd");
    if (result && result.staffId) {
        await loadStaffRoster();
        openStaffRecord(result.staffId);
    }
}

async function exportStaffList() {
    $w("#staffExportBtn").label = "Generating...";
    try {
        const fileUrl = await getStaffExportUrl();
        $w("#staffExportBtn").label = fileUrl ? "Export Staff List" : "No data found";
        if (fileUrl) wixLocation.to(fileUrl);
    } catch (err) {
        console.error("Staff export error:", err);
        $w("#staffExportBtn").label = "Export failed";
    }
}

if ($w("#staffRepeater").id) $w("#staffRepeater").onItemReady(($item, d) => {
    if ($item("#stfAvatar").id) $item("#stfAvatar").text = staffInitials(d.name);
    $item("#stfName").text = d.name;
    if ($item("#stfMeta").id) {
        $item("#stfMeta").text = `${d.roles.join(", ") || "No role set"} · ${d.teams.join(", ") || "No team"}`;
    }

    const DOT_ID = { dbsExpiry: "#stfDbsDot", firstAidExpiry: "#stfFaDot", safeGuardingExpiry: "#stfSgDot", coachingExpiry: "#stfCoachDot" };
    let worstNote = "";
    STAFF_CHECKS.forEach(c => {
        const status = complianceStatus(d[c.key], c.thresholds[0], c.thresholds[1]);
        if ($item(DOT_ID[c.key]).id) $item(DOT_ID[c.key]).style.backgroundColor = status.color;
        if (status.color !== GREEN && !worstNote) worstNote = `${c.label} ${status.label.toLowerCase()}`;
    });
    if ($item("#stfNote").id) {
        if (worstNote) { $item("#stfNote").text = worstNote; $item("#stfNote").expand(); }
        else $item("#stfNote").collapse();
    }

    $item("#stfViewBtn").onClick(() => openStaffRecord(d._id));
});

// ---------------------------------------------------------------------
//  VIEW — TEAMS (ported from the old separate Team Admin.js page, 2026-08)
//  Was its own page; Rob wants it as a self-contained state here instead, same
//  pattern as Staff. Logic is unchanged from the original - only element IDs
//  changed (team/tm prefixes) for naming consistency with the rest of this file,
//  even though nothing here actually collided with existing IDs.
// ---------------------------------------------------------------------
async function loadTeamStaffOptions() {
    const res = await wixData.query("SignolStaff").ascending("SS_name").limit(1000).find();
    teamStaffOptions = res.items.map(s => ({ label: s.SS_name, value: s._id }));
}

async function loadTeamAgeGroupOptions() {
    const res = await wixData.query("AgeGroup").ascending("AG_ageGroup").find();
    teamAgeGroupOptions = res.items.map(a => ({ label: a.AG_ageGroup, value: a._id }));
    $w("#teamFilterAgeGroup").options = [{ label: "All Age Groups", value: "" }, ...teamAgeGroupOptions];
}

async function loadTeamNameOptions() {
    const res = await wixData.query("Teams").ascending("T_teamName").limit(1000).find();
    const uniqueTeams = res.items.map(t => ({ label: t.T_teamName, value: t.T_teamName }));
    $w("#teamSearch").options = [{ label: "All Teams", value: "" }, ...uniqueTeams];
}

async function loadTeamHub() {
    try {
        const teamFilter = $w("#teamSearch").value;
        const ageFilter = $w("#teamFilterAgeGroup").value;
        let query = wixData.query("Teams");
        if (teamFilter) query = query.eq("T_teamName", teamFilter);
        if (ageFilter) query = query.eq("AG_ageGroup", ageFilter);

        const results = await query.include("T_teamManager", "AG_ageGroup").descending("_createdDate").find();
        $w("#teamRepeater").data = results.items;
    } catch (err) {
        console.error("Team hub load error:", err);
    }
}

async function addNewTeam() {
    const result = await wixWindow.openLightbox("AddTeamPopup");
    if (!result || !result.name) return;
    try {
        await wixData.insert("Teams", { T_teamName: result.name, AG_ageGroup: result.ageGroup });
        await loadTeamNameOptions();
        $w("#teamSearch").value = "";
        $w("#teamFilterAgeGroup").value = "";
        loadTeamHub(); // newest appears at top
    } catch (err) {
        console.error("Team creation failed:", err);
    }
}

async function exportTeamsList() {
    $w("#teamExportBtn").label = "Generating...";
    try {
        const fileUrl = await getTeamsExportUrl();
        $w("#teamExportBtn").label = fileUrl ? "Export Report" : "No data found";
        if (fileUrl) wixLocation.to(fileUrl);
    } catch (err) {
        console.error("Team export error:", err);
        $w("#teamExportBtn").label = "Export failed";
    }
}

// Lights a compliance dot for one staff member's one qualification - shared by
// the manager (prefix "tmM") and each of the up-to-5 assistants (prefix "tmA" + row
// number). Guards on the element existing so a missing light doesn't throw.
function updateTeamComplianceLights($scope, member, prefix, num = "") {
    const today = new Date();
    const quals = [{ f: "dbsExpiry", s: "Dbs" }, { f: "firstAidExpiry", s: "Fa" }, { f: "safeGuardingExpiry", s: "Sg" }, { f: "coachingExpiry", s: "Coach" }];
    quals.forEach(q => {
        const el = $scope(`#${prefix}${q.s}${num}`);
        if (el && el.style) {
            const exp = member[q.f] ? new Date(member[q.f]) : null;
            el.style.backgroundColor = (exp && exp > today) ? GREEN : RED;
        }
    });
}

if ($w("#teamRepeater").id) $w("#teamRepeater").onItemReady(async ($item, itemData) => {
    const today = new Date();

    $item("#tmNameInput").value = itemData.T_teamName || "";
    $item("#tmDivisionInput").value = itemData.leagueDivision || "";
    $item("#tmLeagueSwitch").checked = itemData.leagueRegister || false;
    $item("#tmManagerDrop").options = teamStaffOptions;
    $item("#tmManagerDrop").value = itemData.T_teamManager ? itemData.T_teamManager._id : null;
    $item("#tmAgeGroupDrop").options = teamAgeGroupOptions;
    $item("#tmAgeGroupDrop").value = itemData.AG_ageGroup ? itemData.AG_ageGroup._id : null;

    // Compliance: fully compliant only if the manager + every assistant clears
    // DBS/safeguarding/coaching, and at least one of them holds a current First Aid cert.
    const assistRes = await wixData.query("SignolStaff").hasSome("SS_team", [itemData._id]).find();
    let currentManager = itemData.T_teamManager;
    let currentAssistants = assistRes.items.filter(s => s._id !== (currentManager ? currentManager._id : ""));

    const runCompliance = (manager, assistants) => {
        const allStaff = manager ? [manager, ...assistants] : [...assistants];
        const dbsOK = allStaff.every(s => s.dbsExpiry && new Date(s.dbsExpiry) > today);
        const sgOK = allStaff.every(s => s.safeGuardingExpiry && new Date(s.safeGuardingExpiry) > today);
        const coachOK = allStaff.every(s => s.coachingExpiry && new Date(s.coachingExpiry) > today);
        const faOK = allStaff.some(s => s.firstAidExpiry && new Date(s.firstAidExpiry) > today);
        const compliant = dbsOK && sgOK && coachOK && faOK;
        $item("#tmStatusBox").style.backgroundColor = compliant ? GREEN : RED;
        $item("#tmStatusText").text = compliant ? "FULLY COMPLIANT" : "NON-COMPLIANT";
    };

    runCompliance(currentManager, currentAssistants);
    if (currentManager) updateTeamComplianceLights($item, currentManager, "tmM");

    for (let i = 1; i <= 5; i++) {
        const row = $item(`#tmAssistRow${i}`);
        if (currentAssistants[i - 1]) {
            $item(`#tmAName${i}`).text = currentAssistants[i - 1].SS_name;
            updateTeamComplianceLights($item, currentAssistants[i - 1], "tmA", i);
            row.show();
        } else {
            row.hide();
        }
    }

    // Player counts - training-only vs playing & training, active players only.
    const playerRes = await wixData.query("SignolPlayers").eq("SP_team", itemData._id).include("SP_status").find();
    const activePlayers = playerRes.items.filter(p => p.SP_status && p.SP_status.label === "Active");
    const trainOnly = activePlayers.filter(p => p.SP_trainingOnly === true).length;
    $item("#tmCountLabelTrain").text = String(trainOnly);
    $item("#tmCountLabelBoth").text = String(activePlayers.length - trainOnly);

    $item("#tmManagerDrop").onChange(async (e) => {
        const newId = e.target.value;
        if (!newId) return;
        const teamRec = await wixData.get("Teams", itemData._id);
        teamRec.T_teamManager = newId;
        await wixData.update("Teams", teamRec);
        const freshManager = await wixData.get("SignolStaff", newId);
        updateTeamComplianceLights($item, freshManager, "tmM");
        runCompliance(freshManager, currentAssistants);
    });

    $item("#tmViewSquadBtn").onClick(() => {
        wixWindow.openLightbox("SquadViewer", { teamId: itemData._id, teamName: itemData.T_teamName });
    });

    const autoSave = async () => {
        const record = await wixData.get("Teams", itemData._id);
        record.T_teamName = $item("#tmNameInput").value;
        record.leagueDivision = $item("#tmDivisionInput").value;
        record.leagueRegister = $item("#tmLeagueSwitch").checked;
        record.AG_ageGroup = $item("#tmAgeGroupDrop").value;
        await wixData.update("Teams", record);
    };
    $item("#tmNameInput").onBlur(autoSave);
    $item("#tmDivisionInput").onBlur(autoSave);
    $item("#tmLeagueSwitch").onChange(autoSave);
    $item("#tmAgeGroupDrop").onChange(autoSave);

    // Delete (two-tap confirm, same pattern as Staff's delete)
    $item("#tmDeleteBtn").onClick(async () => {
        if ($item("#tmDeleteBtn").label === "Confirm?") {
            await wixData.remove("Teams", itemData._id);
            loadTeamHub();
            loadTeamNameOptions();
        } else {
            $item("#tmDeleteBtn").label = "Confirm?";
            $item("#tmDeleteBtn").style.backgroundColor = RED;
            setTimeout(() => {
                $item("#tmDeleteBtn").label = "X";
                $item("#tmDeleteBtn").style.backgroundColor = "";
            }, 4000);
        }
    });
});

// ---------------------------------------------------------------------
//  VIEW — PAYMENTS (GoCardless overview, new 2026-08)
//  First-ever secretary-wide payment visibility - was previously only visible
//  one player at a time via PlayerRecord's fee tab. Read-only: acting on a row
//  still opens PlayerRecord, same as every other queue.
// ---------------------------------------------------------------------
async function loadPayments() {
    try {
        const res = await getSecretaryPaymentsOverview();
        if (!res.success) throw new Error(res.error || "payments overview failed");
        paymentsData = res;

        if ($w("#kpiPaymentIssuesNum").id) $w("#kpiPaymentIssuesNum").text = String(res.failedCount);
        updateNavBadge("#navBadgePayments", "#navBadgePaymentsNum", res.failedCount);
        if ($w("#paymentsWidgetSummary").id) {
            $w("#paymentsWidgetSummary").text =
                `${res.activeCount} active · ${res.pendingCount} pending · ${res.failedCount} failed`;
        }
        // Per-row breakdown (matches the design mockup) - #paymentsWidgetSummary
        // above is left in as an optional extra, not required.
        if ($w("#payRowActive").id) $w("#payRowActive").text = String(res.activeCount);
        if ($w("#payRowPending").id) $w("#payRowPending").text = String(res.pendingCount);
        if ($w("#payRowFailed").id) $w("#payRowFailed").text = String(res.failedCount);
        if ($w("#payRowCollected").id) $w("#payRowCollected").text = `£${(res.thisMonthCollected || 0).toFixed(2)}`;
        // The "Collected by Month" chart lives in stateReports, not the Dashboard -
        // rendered lazily on first visit there (see showView()), not here, since
        // this function runs eagerly on page load and stateReports may not be
        // "visited" yet at that point. paymentsData.monthlyIncome (set above) is
        // reused when that happens, no second fetch needed.

        if ($w("#paymentsCountActive").id) $w("#paymentsCountActive").text = String(res.activeCount);
        if ($w("#paymentsCountPending").id) $w("#paymentsCountPending").text = String(res.pendingCount);
        if ($w("#paymentsCountFailed").id) $w("#paymentsCountFailed").text = String(res.failedCount);

        renderPaymentsList();
    } catch (err) {
        console.error("Payments overview load error:", err);
    }
}

// Filters the already-loaded payments list by clicking one of the top pills -
// re-slices what getSecretaryPaymentsOverview() already returned client-side,
// no re-query. Clicking the same pill again clears the filter (toggle) - see
// togglePaymentsFilter(). At club-wide scale (~250 kids eventually) this is
// still just filtering an in-memory array of however many have a GoCardless
// subscription (a much smaller set than the full roster), so no pagination
// concern here.
function renderPaymentsList() {
    if (!paymentsData) return;
    let items = paymentsData.items;
    if (paymentsFilter === "FAILED") items = items.filter(i => i.lastPaymentStatus === "FAILED");
    else if (paymentsFilter === "PENDING") items = items.filter(i => i.lastPaymentStatus !== "FAILED" && (i.status === "PENDING" || i.status === "NOT_SETUP"));
    else if (paymentsFilter === "ACTIVE") items = items.filter(i => i.lastPaymentStatus !== "FAILED" && i.status === "ACTIVE");

    if ($w("#paymentsRepeater").id) {
        if (items.length === 0) {
            $w("#paymentsRepeater").collapse();
            if ($w("#emptyPayments").id) {
                $w("#emptyPayments").text = paymentsFilter
                    ? `No ${paymentsFilter.charAt(0) + paymentsFilter.slice(1).toLowerCase()} payments right now.`
                    : "No GoCardless subscriptions set up yet.";
                $w("#emptyPayments").expand();
            }
        } else {
            if ($w("#emptyPayments").id) $w("#emptyPayments").collapse();
            $w("#paymentsRepeater").expand();
            $w("#paymentsRepeater").data = items;
        }
    }

    // Optional "showing X only" hint so it's clear the list is filtered and how
    // to clear it - collapsed when no filter is active.
    if ($w("#paymentsFilterNote").id) {
        if (paymentsFilter) {
            const label = paymentsFilter.charAt(0) + paymentsFilter.slice(1).toLowerCase();
            $w("#paymentsFilterNote").text = `Showing ${label} only — tap the pill again to clear`;
            $w("#paymentsFilterNote").expand();
        } else {
            $w("#paymentsFilterNote").collapse();
        }
    }
}

function togglePaymentsFilter(status) {
    paymentsFilter = paymentsFilter === status ? null : status;
    renderPaymentsList();
}

const PAYMENT_STATUS_LABEL = { ACTIVE: "Active", PENDING: "Pending Activation", NOT_SETUP: "Not Set Up", CANCELED: "Cancelled", ENDED: "Ended" };

// Renders a player's season (monthlyTicks, from getSecretaryPaymentsOverview -
// now that player's OWN real start month/count, not always Jul-Apr, 2026-08-11)
// as a compact row of coloured dots via a Text element's .html - so the roster
// shows the actual paid/failed/due pattern at a glance, not just one status
// word. One new element (#payRowTicks) instead of 10 separate dot elements.
// Each dot gets a tiny month-initial above it (Rob's ask, 2026-08-11) so the
// row is readable without needing to hover the tooltip for which month's which.
// Stacked with plain block layout, not inline-flex/flex-direction - Wix's rich
// text .html renderer doesn't reliably support flexbox, which was rendering
// this as a flat dot-letter-dot-letter sequence instead of stacked pairs.
const TICK_DOT_COLOR = { paid: GREEN, failed: RED, due: AMBER, future: "transparent" };
function tickStripHtml(monthlyTicks) {
    return (monthlyTicks || []).map(t => {
        const c = TICK_DOT_COLOR[t.status] || GREY;
        const border = t.status === "future" ? `border:1.5px dashed ${GREY};` : "";
        const letter = (t.month || "").charAt(0);
        return `<span style="display:inline-block;text-align:center;width:14px;margin-right:2px;vertical-align:top;" title="${t.month}: ${t.status}">` +
            `<span style="display:block;font-size:9.5px;line-height:1.2;color:${GREY};">${letter}</span>` +
            `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;margin-top:1px;background:${c};${border}"></span></span>`;
    }).join("");
}

if ($w("#paymentsRepeater").id) $w("#paymentsRepeater").onItemReady(($item, d) => {
    if ($item("#payAvatar").id) $item("#payAvatar").text = initials(d);
    if ($item("#payName").id) $item("#payName").text = d.playerName;
    if ($item("#payTeam").id) $item("#payTeam").text = d.team;
    if ($item("#payAmount").id) $item("#payAmount").text = `£${(d.perPayment || 0).toFixed(2)}/mo`;

    if ($item("#payStatusBadge").id) {
        if (d.lastPaymentStatus === "FAILED") {
            paintBadge($item("#payStatusBadge"), "Payment Failed", RED, $item("#payStatusBadgeBox"));
        } else {
            const label = PAYMENT_STATUS_LABEL[d.status] || d.status || "—";
            const color = d.status === "ACTIVE" ? GREEN : (d.status === "PENDING" || d.status === "NOT_SETUP") ? AMBER : GREY;
            paintBadge($item("#payStatusBadge"), label, color, $item("#payStatusBadgeBox"));
        }
    }

    if ($item("#payRowTicks").id) $item("#payRowTicks").html = tickStripHtml(d.monthlyTicks);

    if ($item("#payViewBtn").id) $item("#payViewBtn").onClick(() => openTaskLightbox("PlayerRecord", d.playerId));
});

// Un-wired 2026-08-11 (Rob's call) - was a bare, unexplained button on the
// Reports page for the secretary to stumble across with no context. The
// underlying capability (retryStuckSubscriptions in backend/registration.jsw)
// is untouched and still callable - re-wire this to a button again in minutes
// if a mandate-active-but-nothing-else-happened case ever needs a manual fix.

// ---------------------------------------------------------------------
//  VIEW 3 — REPORTS (CSV exports)
// ---------------------------------------------------------------------
function wireExport(btnId, scope, restLabel) {
    if (!$w(btnId).id) return;
    $w(btnId).onClick(async () => {
        $w(btnId).label = "Generating...";
        try {
            const url = await getPlayersExportUrl(scope);
            if (url) {
                wixLocation.to(url);
                $w(btnId).label = restLabel;
            } else {
                $w(btnId).label = "No data found";
                setTimeout(() => { $w(btnId).label = restLabel; }, 2500);
            }
        } catch (err) {
            console.error("Export error:", err);
            $w(btnId).label = "Export failed";
            setTimeout(() => { $w(btnId).label = restLabel; }, 2500);
        }
    });
}

// ---------------------------------------------------------------------
//  SEASON ROLLOVER — bulk send a team / age group into renewal
// ---------------------------------------------------------------------
// Show how many active players a selection will affect, before she commits.
// #renewStatus is genuinely required (not just cosmetic) - it's the only
// feedback for both the live preview and the result message below - but still
// guarded, so a missing element degrades to "no visible feedback" rather than
// throwing and blocking the actual renewal action.
async function previewRenewCount() {
    const teamId = $w("#renewTeam").value;
    const ageGroupId = $w("#renewAgeGroup").value;
    if (!teamId && !ageGroupId) {
        if ($w("#renewStatus").id) $w("#renewStatus").text = "Pick a team or an age group to renew.";
        return;
    }
    try {
        const r = await countRenewalTargets(teamId, ageGroupId);
        if ($w("#renewStatus").id) {
            $w("#renewStatus").text = r.success
                ? `${r.count} active player(s) will be sent to renewal.`
                : "Couldn't count that selection.";
        }
    } catch (err) {
        console.error("Renew count error:", err);
    }
}

async function bulkRenew() {
    const teamId = $w("#renewTeam").value;
    const ageGroupId = $w("#renewAgeGroup").value;
    if (!teamId && !ageGroupId) {
        if ($w("#renewStatus").id) $w("#renewStatus").text = "Pick a team or an age group first.";
        return;
    }
    $w("#renewBtn").disable();
    $w("#renewBtn").label = "Sending to renewal...";
    try {
        const r = await bulkSetRenewal(teamId, ageGroupId);
        if (!r.success) throw new Error(r.error);
        if ($w("#renewStatus").id) {
            $w("#renewStatus").text = r.count === 0
                ? "No active players matched that selection."
                : `${r.count} player(s) sent to renewal — their parents' forms are reopened.`;
        }
        $w("#renewTeam").value = "";
        $w("#renewAgeGroup").value = "";
        await refreshAfterChange();
    } catch (err) {
        console.error("Bulk renew failed:", err);
        if ($w("#renewStatus").id) $w("#renewStatus").text = "Something went wrong — please try again.";
    } finally {
        $w("#renewBtn").label = "Send to Renewal";
        $w("#renewBtn").enable();
    }
}
