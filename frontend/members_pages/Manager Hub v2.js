// =====================================================================
//  Manager Hub v2 — page code
// =====================================================================
//  18 custom elements, 7 backend modules, one Multi-State Box.
//
//  WHAT THIS FILE DOES, AND WHAT IT DELIBERATELY DOESN'T
//  ----------------------------------------------------
//  It routes and it plumbs. Data in via one `data` attribute per element,
//  interactions back via CustomEvents. It contains no business rules: which
//  players a manager can see, what a coach may edit, whether a claim has
//  expired - all of that lives in backend/ where the browser can't reach it.
//
//  ⚠️ EVERY WIRE GOES THROUGH safeWire(). The old Manager Hub had 37
//  top-level $w() calls at module scope with no guards, so one renamed
//  element threw synchronously and every wiring statement after it silently
//  never ran. The symptom was "half the Hub randomly stopped working" and it
//  cost a debugging session. At 18 elements that is not a risk worth taking.
//
//  ⚠️ NO BUSINESS LOGIC IN HERE. If something needs deciding, it gets decided
//  in a .jsw. Anything decided here is decided in the browser, where it can
//  be edited.
//
//  Setup, element IDs and state names: docs/MANAGER_HUB_V2_BUILD.md
// =====================================================================

import wixWindow from 'wix-window';
import wixLocationFrontend from 'wix-location-frontend';
import { authentication } from 'wix-members-frontend';

import {
    getManagerContext, getManagerDashboard, getSquadBoard,
    getDictionary, getPlayerRecord
} from 'backend/managerData.jsw';

import {
    claimEnquiry, releaseEnquiry, acceptEnquiry,
    sendInvite, returnToPool, archivePlayer, setKitNumber,
    getEnquiryFormOptions, addManualEnquiry
} from 'backend/pipeline.jsw';

import {
    getTeamFixtures, createFixture, updateFixture,
    deleteFixture, getTeamFixtureResponses, getManagerWeekFixtures,
    getSquadPicker, saveSquad, publishSquad, nudgeNoReplies
} from 'backend/fixtures.jsw';

import { getComposeContext, sendManagerMessage, getSentMessages } from 'backend/messages.jsw';
import { getRecruitContext, publishRecruitmentPost } from 'backend/recruitment.jsw';

import {
    getTeamProfile, saveTeamProfile, getMyStaffRecord,
    saveMyStaffRecord, getSponsors, addSponsor, removeSponsorFromMyTeams,
    attachSponsor, deleteSponsor, postNews
} from 'backend/teamAdmin.jsw';

import {
    getStatsOverview, getStatsOptions, addTeamResult, addPlayerOfTheMatch,
    addPlayerStats, getStatsRecords, updateStatRecord, deleteStatRecord
} from 'backend/statsData.jsw';

// ==========================================
// STATE
// ==========================================

const TAB_TITLES = {
    stateHome:           { title: "Your teams",      sub: "" },
    stateSquad:          { title: "Squad",           sub: "" },
    stateFixtures:       { title: "Fixtures",        sub: "" },
    stateMessages:       { title: "Messages",        sub: "" },
    stateMore:           { title: "More",            sub: "Club admin" },
    statePlayerRecord:   { title: "Player",          sub: "" },
    stateFixtureForm:    { title: "Fixture",         sub: "" },
    stateMessageCompose: { title: "Write a message", sub: "" },
    stateRecruitment:    { title: "Recruitment",     sub: "" },
    stateTeamProfile:    { title: "Team profile",    sub: "Shown on the website" },
    stateStaff:          { title: "My record",       sub: "" },
    stateSponsors:       { title: "Sponsors",        sub: "" },
    stateNews:           { title: "Post news",       sub: "" },
    stateStats:          { title: "Stats",           sub: "" },
    stateStatsAdd:       { title: "Add stats",       sub: "" },
    stateStatsEdit:      { title: "Edit records",    sub: "" },
    stateShare:          { title: "Join link",       sub: "QR code and link" },
    stateEnquiryAdd:     { title: "Add an enquiry",  sub: "Taken by hand" },
    stateSquadPick:      { title: "Pick the squad",  sub: "" }
};

// The five with a nav item. Everything else is a drill-down and keeps the
// nav highlighting whichever section the manager came from.
const MAIN_TABS = ["stateHome", "stateSquad", "stateFixtures", "stateMessages", "stateMore"];

let mgr = null;              // getManagerContext() payload
let currentTeamId = "";      // whichever squad is being worked on
let currentTab = "stateHome";
let leaveReasons = [];       // ClubDictionary, fetched once

// One model per element. Held so a handler can patch a single field and
// repaint, rather than each rebuilding the whole payload.
// Bumped every time the squad board reloads. A pending flash timeout checks
// it before firing, so a timer from a previous load can't wipe a fresher
// message - or worse, fire against a model that's since been replaced.
let squadGeneration = 0;

let homeModel = null, squadModel = null, playerModel = null;
let fixturesModel = null, fixtureFormModel = null;
let messagesModel = null, composeModel = null;
let moreModel = null, recruitModel = null;
let teamProfileModel = null, staffModel = null, sponsorsModel = null, newsModel = null;
let statsModel = null, statsAddModel = null, statsEditModel = null;
let shareModel = null, enquiryAddModel = null, squadPickModel = null;
// Cached for the session - the dictionary and age-group bounds don't change
// between one enquiry and the next, and a manager taking two families' details
// in a row shouldn't wait twice.
let enquiryOptions = null;

// ==========================================
// HELPERS
// ==========================================

// One bad element must never take the rest of the page down with it. `.id`
// existing only proves an element was FOUND, not that it's the right type -
// calling .on() on something unexpected throws synchronously.
function safeWire(id, fn) {
    try {
        if (!$w(id).id) {
            console.warn("[ManagerHub] element not on page, skipped:", id);
            return;
        }
        fn();
    } catch (err) {
        console.error("[ManagerHub] wiring failed for", id, err);
    }
}

function push(id, model) {
    try {
        if (!model || !$w(id).id) return;
        $w(id).setAttribute("data", JSON.stringify(model));
    } catch (err) {
        console.error("[ManagerHub] push failed for", id, err);
    }
}

const pushHome        = () => push("#customMgrHome", homeModel);
const pushSquad       = () => push("#customSquad", squadModel);
const pushPlayer      = () => push("#customPlayer", playerModel);
const pushFixtures    = () => push("#customMgrFixtures", fixturesModel);
const pushFixtureForm = () => push("#customFixtureForm", fixtureFormModel);
const pushMessages    = () => push("#customMgrMessages", messagesModel);
const pushCompose     = () => push("#customCompose", composeModel);
const pushMore        = () => push("#customMgrMore", moreModel);
const pushRecruit     = () => push("#customRecruit", recruitModel);
const pushTeamProfile = () => push("#customTeamProfile", teamProfileModel);
const pushStaff       = () => push("#customStaff", staffModel);
const pushSponsors    = () => push("#customSponsors", sponsorsModel);
const pushNews        = () => push("#customNews", newsModel);
const pushStats       = () => push("#customStats", statsModel);
const pushStatsAdd    = () => push("#customStatsAdd", statsAddModel);
const pushStatsEdit   = () => push("#customStatsEdit", statsEditModel);
const pushShare       = () => push("#customShare", shareModel);
const pushEnquiryAdd  = () => push("#customEnquiryAdd", enquiryAddModel);
const pushSquadPick   = () => push("#customSquadPick", squadPickModel);

function paintNav() {
    // The nav highlights the last MAIN tab, so drilling into a player keeps
    // Squad lit rather than lighting nothing.
    const active = MAIN_TABS.indexOf(currentTab) !== -1 ? currentTab : lastMainTab;
    push("#customNav", { active, unread: 0 });
}

function setTopbar(title, sub, showBack) {
    push("#customTopbar", { title: title || "", sub: sub || "", showBack: !!showBack });
}

let lastMainTab = "stateHome";

function goTo(stateName, opts = {}) {
    try {
        currentTab = stateName;
        if (MAIN_TABS.indexOf(stateName) !== -1) lastMainTab = stateName;

        $w("#stateboxMgr").changeState(stateName);

        const t = TAB_TITLES[stateName] || { title: "", sub: "" };
        // Drill-downs get a Back button; the five main tabs don't.
        setTopbar(opts.title || t.title, opts.sub || t.sub, MAIN_TABS.indexOf(stateName) === -1);
        paintNav();
    } catch (err) {
        console.error("[ManagerHub] goTo failed:", stateName, err);
    }
}

// The team a screen should act on. Falls back to the manager's first team so
// nothing has to handle "no team chosen yet" separately.
function teamId() {
    if (currentTeamId) return currentTeamId;
    if (mgr && mgr.teams && mgr.teams.length) return mgr.teams[0].id;
    return "";
}

function teamName(id) {
    const t = (mgr && mgr.teams || []).find(x => x.id === id);
    return t ? t.name : "";
}

// ==========================================
// BOOT
// ==========================================

$w.onReady(async function () {
    // Painted before any await. There are two backend round trips before real
    // data lands and without this every element sits showing its own mock or
    // loading state for that whole window.
    setTopbar("Manager Hub", "", false);
    paintNav();

    wireEverything();

    try {
        if (!authentication.loggedIn()) {
            homeModel = { error: "Please sign in to use the Manager Hub." };
            pushHome();
            return;
        }

        const ctx = await getManagerContext();
        if (!ctx || !ctx.success) {
            homeModel = { error: (ctx && ctx.error) || "Couldn't load your details." };
            pushHome();
            return;
        }

        mgr = ctx;
        currentTeamId = (ctx.teams && ctx.teams.length) ? ctx.teams[0].id : "";
        setTopbar("Your teams", ctx.name || "", false);

        // Not awaited - the More menu and the leave-reason list are both
        // needed later, not now, and neither should hold up Home.
        loadMoreState();
        getDictionary("leave_reason")
            .then(r => { leaveReasons = (r && r.options) || []; })
            .catch(err => console.error("[ManagerHub] leave reasons:", err));

        await loadHome();
    } catch (err) {
        console.error("[ManagerHub] init failed:", err);
        homeModel = { error: "Something went wrong loading the Hub. Please refresh." };
        pushHome();
    }
});

// ==========================================
// HOME
// ==========================================

async function loadHome() {
    homeModel = { loading: true };
    pushHome();
    try {
        const res = await getManagerDashboard();
        homeModel = (res && res.success)
            ? { name: res.name, teams: res.teams, compliance: res.compliance || [] }
            : { error: (res && res.error) || "Couldn't load your teams." };
    } catch (err) {
        console.error("[ManagerHub] loadHome:", err);
        homeModel = { error: "Couldn't load your teams just now." };
    }
    pushHome();

    // SECOND, NOT AWAITED WITH THE FIRST. The team cards are what the manager
    // came for, so they paint as soon as the dashboard lands; the week teaser
    // fills in a moment later. Chaining them would hold the whole screen
    // blank for two round trips instead of one.
    //
    // A separate call rather than part of getManagerDashboard() because
    // fixtures.jsw imports managerData.jsw - putting a fixtures query in the
    // dashboard would make that circular.
    loadWeekTeaser();
}

async function loadWeekTeaser() {
    try {
        const res = await getManagerWeekFixtures();
        if (!homeModel || homeModel.error) return;

        // An ARRAY means answered - the element renders nothing at all while
        // this is undefined, so a manager with a match on Saturday never sees
        // "nothing on this week" flash up before the real answer arrives.
        homeModel.week = (res && res.success) ? res.fixtures : [];
        homeModel.weekNext = (res && res.success) ? res.next : null;
        homeModel.weekDays = (res && res.days) || 7;
        pushHome();
    } catch (err) {
        // Never fatal. The teaser is a convenience on top of a screen that
        // works without it, so a fixtures problem must not take Home down.
        console.error("[ManagerHub] loadWeekTeaser:", err);
    }
}

// ==========================================
// SQUAD BOARD
// ==========================================

// The optional tab argument lands the board on a specific tab. Used when
// returning from a player record: a player can only be opened FROM the Squad
// tab, so coming back to Trials - whichever tab the element happened to be
// showing last - is always wrong.
async function loadSquad(id, tab) {
    if (id) currentTeamId = id;
    const tid = teamId();
    if (!tid) return;

    squadGeneration += 1;
    squadModel = { loading: true };
    pushSquad();
    goTo("stateSquad", { title: teamName(tid) || "Squad", sub: "Squad & pipeline" });

    try {
        const res = await getSquadBoard(tid);
        squadModel = (res && res.success)
            ? {
                teamName: res.teamName,
                enquiries: res.enquiries,
                trials: res.trials,
                squad: res.squad,
                leaveReasons,
                busy: {},
                flash: "",
                jumpTo: tab || ""
              }
            : { error: (res && res.error) || "Couldn't load the squad." };
    } catch (err) {
        console.error("[ManagerHub] loadSquad:", err);
        squadModel = { error: "Couldn't load the squad just now." };
    }
    pushSquad();
}

// Shared by every pipeline action: mark the card busy, run it, then reload.
// Reloading rather than patching is deliberate here - these actions MOVE a
// player between tabs, so there's no single field to patch.
async function pipelineAction(playerId, run, jumpTo, flash) {
    if (!squadModel) return;
    squadModel.busy = Object.assign({}, squadModel.busy, { [playerId]: true });
    squadModel.flash = "";
    pushSquad();

    let result = null;
    try {
        result = await run();
    } catch (err) {
        console.error("[ManagerHub] pipeline action failed:", err);
        result = { success: false, error: "Something went wrong — please try again." };
    }

    if (result && result.success) {
        await loadSquad();
        if (squadModel && !squadModel.error) {
            if (jumpTo) squadModel.jumpTo = jumpTo;
            if (flash) {
                squadModel.flash = flash(result);
                pushSquad();
                // Clears itself. A confirmation that never leaves stops being a
                // confirmation and becomes furniture - and worse, it still says
                // "moved to Trials" long after the next thing has happened.
                const gen = squadGeneration;
                setTimeout(() => {
                    if (gen !== squadGeneration || !squadModel) return;
                    squadModel.flash = "";
                    pushSquad();
                }, 5000);
            } else {
                pushSquad();
            }
        }
        // Counts on Home are now stale. Not awaited - the manager is looking
        // at the board, not at Home.
        loadHome();
    } else {
        delete squadModel.busy[playerId];
        squadModel.flash = "";
        squadModel.error = "";
        pushSquad();
        // Surfaced through the element's own error line rather than a banner,
        // so it stays attached to the card it came from.
        if (result && result.error) {
            squadModel.errors = { [playerId]: result.error };
            pushSquad();
        }
    }
}

// ==========================================
// PLAYER RECORD
// ==========================================

async function loadPlayer(playerId) {
    const tid = teamId();
    if (!tid || !playerId) return;

    playerModel = { loading: true };
    pushPlayer();
    goTo("statePlayerRecord");

    try {
        const res = await getPlayerRecord(tid, playerId);
        playerModel = (res && res.success) ? res : { error: (res && res.error) || "Couldn't load that player." };
        if (res && res.success) setTopbar(res.name, teamName(tid), true);
    } catch (err) {
        console.error("[ManagerHub] loadPlayer:", err);
        playerModel = { error: "Couldn't load that player just now." };
    }
    pushPlayer();
}

// ==========================================
// FIXTURES
// ==========================================

async function loadFixtures() {
    const tid = teamId();
    if (!tid) return;

    fixturesModel = { loading: true };
    pushFixtures();

    try {
        const res = await getTeamFixtures(tid);
        fixturesModel = (res && res.success)
            ? { fixtures: res.fixtures, replies: {} }
            : { error: (res && res.error) || "Couldn't load fixtures." };
    } catch (err) {
        console.error("[ManagerHub] loadFixtures:", err);
        fixturesModel = { error: "Couldn't load fixtures just now." };
    }
    pushFixtures();
}

function openFixtureForm(fixture) {
    fixtureFormModel = { fixture: fixture || null };
    pushFixtureForm();
    goTo("stateFixtureForm", { title: fixture ? "Edit fixture" : "Add fixture", sub: teamName(teamId()) });
}

// ==========================================
// MESSAGES
// ==========================================

async function loadMessages() {
    const tid = teamId();
    if (!tid) return;

    messagesModel = { loading: true };
    pushMessages();

    try {
        const res = await getSentMessages(tid);
        messagesModel = (res && res.success)
            ? { messages: res.messages }
            : { error: (res && res.error) || "Couldn't load messages." };
    } catch (err) {
        console.error("[ManagerHub] loadMessages:", err);
        messagesModel = { error: "Couldn't load messages just now." };
    }
    pushMessages();
}

async function loadCompose(presetPlayerId) {
    const tid = teamId();
    if (!tid) return;

    composeModel = { loading: true };
    pushCompose();
    goTo("stateMessageCompose", { sub: teamName(tid) });

    try {
        const res = await getComposeContext(tid);
        // ⚠️ Spread the whole payload rather than hand-picking fields. Picking
        // them individually meant senderOptions was silently dropped here after
        // the backend started returning it - the element never saw it, so the
        // sender dropdown never appeared and it looked like a backend bug.
        // Anything the backend adds now reaches the element by default.
        composeModel = (res && res.success)
            ? Object.assign({}, res, { presetPlayerId: presetPlayerId || "" })
            : { fatal: (res && res.error) || "Couldn't open the compose screen." };
    } catch (err) {
        console.error("[ManagerHub] loadCompose:", err);
        composeModel = { fatal: "Couldn't open the compose screen." };
    }
    pushCompose();
}

// ==========================================
// MORE
// ==========================================

function loadMoreState() {
    if (!mgr) return;
    moreModel = { name: mgr.name, accessLevel: mgr.accessLevel, perms: mgr.perms };
    pushMore();
}

// ==========================================
// RECRUITMENT
// ==========================================

async function loadRecruit() {
    const tid = teamId();
    if (!tid) return;

    recruitModel = { loading: true };
    pushRecruit();
    goTo("stateRecruitment", { sub: teamName(tid) });

    try {
        const res = await getRecruitContext(tid);
        recruitModel = (res && res.success) ? res : { fatal: (res && res.error) || "Couldn't load the poster details." };
    } catch (err) {
        console.error("[ManagerHub] loadRecruit:", err);
        recruitModel = { fatal: "Couldn't load the poster details." };
    }
    pushRecruit();
}

// ==========================================
// SQUAD SELECTION
// ==========================================

async function loadSquadPick(fixtureId) {
    const tid = teamId();
    if (!tid || !fixtureId) return;

    squadPickModel = { loading: true };
    pushSquadPick();
    goTo("stateSquadPick");

    try {
        const res = await getSquadPicker(tid, fixtureId);
        squadPickModel = (res && res.success)
            ? res
            : { error: (res && res.error) || "Couldn't load that squad." };
    } catch (err) {
        console.error("[ManagerHub] loadSquadPick:", err);
        squadPickModel = { error: "Couldn't load that squad just now." };
    }
    pushSquadPick();
}

// Save, publish and nudge differ only in which backend call runs and what the
// success line says, so they share everything else - including the rule that a
// failure must leave the manager's typed selection exactly where it was.
async function runSquadAction(e, run, describe) {
    const d = (e && e.detail) || {};
    const tid = teamId();
    // ⚠️ EVERY squad backend function takes (teamId, fixtureId, ...) - passing
    // the fixture id first made assertTeamAccess check a FIXTURE id against
    // the manager's teams, which failed with "That isn't one of your teams."
    // Anything that takes fewer arguments simply ignores the extra one.
    if (!tid || !d.fixtureId || !squadPickModel) return;

    squadPickModel = Object.assign({}, squadPickModel, { busy: true, error: "", done: "" });
    pushSquadPick();

    try {
        const res = await run(tid, d.fixtureId, d.form);

        // ⚠️ PATCHED, NOT RELOADED. getSquadPicker would come back with the
        // saved selection and the element seeds from the model - so a reload
        // here would be fine after a save, and would silently DISCARD the
        // manager's work after a failure. Patching keeps both cases honest.
        squadPickModel = Object.assign({}, squadPickModel, {
            busy: false,
            done: (res && res.success) ? describe(res) : "",
            error: (res && res.success) ? "" : ((res && res.error) || "That didn't work."),
            published: (res && res.success && res.reach !== undefined) ? true : squadPickModel.published
        });
    } catch (err) {
        console.error("[ManagerHub] runSquadAction:", err);
        squadPickModel = Object.assign({}, squadPickModel, {
            busy: false, error: "That didn't work just now."
        });
    }
    pushSquadPick();
}

// ==========================================
// JOIN LINK / MANUAL ENQUIRY
// ==========================================

// No fetch needed - the join link is a constant. It still gets a model push
// so the element repaints on entry rather than showing whatever it last drew.
function loadShare() {
    shareModel = { open: Date.now() };
    pushShare();
    goTo("stateShare");
}

async function loadEnquiryAdd() {
    enquiryAddModel = { loading: true };
    pushEnquiryAdd();
    goTo("stateEnquiryAdd");

    try {
        if (!enquiryOptions) {
            const res = await getEnquiryFormOptions();
            if (res && res.success) enquiryOptions = res;
            else {
                enquiryAddModel = { error: (res && res.error) || "Couldn't load the form." };
                pushEnquiryAdd();
                return;
            }
        }
        // `reset` clears anything typed on a previous visit - see the element's
        // contract. Without it the last child's details are still sitting there.
        enquiryAddModel = Object.assign({}, enquiryOptions, { reset: true });
    } catch (err) {
        console.error("[ManagerHub] loadEnquiryAdd:", err);
        enquiryAddModel = { error: "Couldn't load the form just now." };
    }
    pushEnquiryAdd();
}

// ==========================================
// TEAM PROFILE / STAFF / SPONSORS / NEWS
// ==========================================

async function loadTeamProfile() {
    const tid = teamId();
    if (!tid) return;

    teamProfileModel = { loading: true };
    pushTeamProfile();
    goTo("stateTeamProfile");

    try {
        const res = await getTeamProfile(tid);
        teamProfileModel = (res && res.success) ? res : { fatal: (res && res.error) || "Couldn't load the team profile." };
    } catch (err) {
        console.error("[ManagerHub] loadTeamProfile:", err);
        teamProfileModel = { fatal: "Couldn't load the team profile." };
    }
    pushTeamProfile();
}

async function loadStaff() {
    staffModel = { loading: true };
    pushStaff();
    goTo("stateStaff");

    try {
        const res = await getMyStaffRecord();
        staffModel = (res && res.success) ? res : { fatal: (res && res.error) || "Couldn't load your record." };
    } catch (err) {
        console.error("[ManagerHub] loadStaff:", err);
        staffModel = { fatal: "Couldn't load your record." };
    }
    pushStaff();
}

async function loadSponsors() {
    sponsorsModel = { loading: true };
    pushSponsors();
    goTo("stateSponsors");

    try {
        const res = await getSponsors();
        sponsorsModel = (res && res.success)
            ? { sponsors: res.sponsors, available: res.available, teams: (mgr && mgr.teams) || [] }
            : { fatal: (res && res.error) || "Couldn't load sponsors." };
    } catch (err) {
        console.error("[ManagerHub] loadSponsors:", err);
        sponsorsModel = { fatal: "Couldn't load sponsors." };
    }
    pushSponsors();
}

function loadNews() {
    newsModel = { teams: (mgr && mgr.teams) || [] };
    pushNews();
    goTo("stateNews");
}

// ==========================================
// STATS
// ==========================================

let statsSeason = "";
let statsOptions = null;     // teams + seasons + players, fetched once per team

async function ensureStatsOptions(tid) {
    try {
        const res = await getStatsOptions(tid);
        if (res && res.success) {
            statsOptions = res;
            if (!statsSeason && res.seasons.length) statsSeason = res.seasons[0].value;
        }
    } catch (err) {
        console.error("[ManagerHub] getStatsOptions:", err);
    }
}

async function loadStats(tid, season) {
    currentTeamId = tid || teamId();
    if (season) statsSeason = season;

    statsModel = { loading: true };
    pushStats();
    goTo("stateStats", { sub: teamName(currentTeamId) });

    await ensureStatsOptions(currentTeamId);

    try {
        const res = await getStatsOverview(currentTeamId, statsSeason);
        const base = {
            teams: (mgr && mgr.teams) || [],
            seasons: (statsOptions && statsOptions.seasons) || [],
            teamId: currentTeamId,
            season: statsSeason
        };
        statsModel = (res && res.success)
            ? Object.assign(base, res)
            : Object.assign(base, { error: (res && res.error) || "Couldn't load stats." });
    } catch (err) {
        console.error("[ManagerHub] loadStats:", err);
        statsModel = { error: "Couldn't load stats just now." };
    }
    pushStats();
}

async function loadStatsAdd() {
    const tid = teamId();
    statsAddModel = { loading: true };
    pushStatsAdd();
    goTo("stateStatsAdd", { sub: teamName(tid) });

    await ensureStatsOptions(tid);
    statsAddModel = {
        teams: (mgr && mgr.teams) || [],
        seasons: (statsOptions && statsOptions.seasons) || [],
        players: (statsOptions && statsOptions.players) || [],
        teamId: tid,
        season: statsSeason
    };
    pushStatsAdd();
}

let statsEditKind = "stats";

async function loadStatsEdit(kind) {
    const tid = teamId();
    if (kind) statsEditKind = kind;

    statsEditModel = { loading: true };
    pushStatsEdit();
    goTo("stateStatsEdit", { sub: teamName(tid) });

    await ensureStatsOptions(tid);

    try {
        const res = await getStatsRecords(tid, statsSeason, statsEditKind);
        statsEditModel = {
            teams: (mgr && mgr.teams) || [],
            seasons: (statsOptions && statsOptions.seasons) || [],
            // The squad, so a wrong name can be CORRECTED FROM A LIST rather
            // than retyped. PlayerStats keys on the name, so a typo silently
            // invents a second player on the leaderboard.
            players: (statsOptions && statsOptions.players) || [],
            teamId: tid,
            season: statsSeason,
            records: (res && res.success) ? res.records : [],
            error: (res && res.success) ? "" : ((res && res.error) || "Couldn't load records.")
        };
    } catch (err) {
        console.error("[ManagerHub] loadStatsEdit:", err);
        statsEditModel = { error: "Couldn't load records just now." };
    }
    pushStatsEdit();
}

// ==========================================
// WIRING
// ==========================================

function wireEverything() {
    // ---- shell ----
    safeWire("#customNav", () => {
        $w("#customNav").on("navigate", (e) => {
            const state = e && e.detail && e.detail.state;
            if (!state) return;
            if (state === "stateHome") { goTo(state); loadHome(); }
            else if (state === "stateSquad") loadSquad();
            else if (state === "stateFixtures") { goTo(state, { sub: teamName(teamId()) }); loadFixtures(); }
            else if (state === "stateMessages") { goTo(state, { sub: teamName(teamId()) }); loadMessages(); }
            else if (state === "stateMore") { goTo(state); loadMoreState(); }
        });
    });

    safeWire("#customTopbar", () => {
        // Back returns to whichever MAIN tab the manager drilled in from -
        // not always Home.
        $w("#customTopbar").on("back", () => {
            // Returning from a player record always means the Squad tab -
            // that's the only place a player can be opened from.
            if (currentTab === "statePlayerRecord") { loadSquad(null, "squad"); return; }
            if (lastMainTab === "stateSquad") loadSquad();
            else if (lastMainTab === "stateFixtures") { goTo(lastMainTab); loadFixtures(); }
            else if (lastMainTab === "stateMessages") { goTo(lastMainTab); loadMessages(); }
            else if (lastMainTab === "stateMore") { goTo(lastMainTab); loadMoreState(); }
            else { goTo("stateHome"); loadHome(); }
        });
    });

    // ---- home ----
    safeWire("#customMgrHome", () => {
        $w("#customMgrHome").on("openSquad", (e) => loadSquad(e && e.detail && e.detail.teamId));
        // Straight to the stats form with the team already chosen - a manager
        // adding results on a Sunday shouldn't have to pick their own squad.
        $w("#customMgrHome").on("openStatsAdd", (e) => {
            const id = (e && e.detail && e.detail.teamId) || "";
            if (id && id !== currentTeamId) { currentTeamId = id; statsOptions = null; }
            loadStatsAdd();
        });
        $w("#customMgrHome").on("openRecruit", () => loadRecruit());
        // Also on Home, from the compliance banner. The More menu has its own
        // openStaff handler - each element needs its own binding, they are not
        // shared just because the event name matches.
        $w("#customMgrHome").on("openStaff", () => loadStaff());
        // Tapping a teaser opens THAT team's fixtures, not whichever team was
        // last looked at - on a multi-squad manager those are rarely the same.
        $w("#customMgrHome").on("openFixtures", (e) => {
            const id = (e && e.detail && e.detail.teamId) || "";
            if (id && id !== currentTeamId) { currentTeamId = id; }
            goTo("stateFixtures");
            loadFixtures();
        });
    });

    // ---- squad board ----
    safeWire("#customSquad", () => {
        const el = $w("#customSquad");
        const pid = (e) => (e && e.detail && e.detail.playerId) || "";

        el.on("claim", (e) => pipelineAction(pid(e),
            () => claimEnquiry(teamId(), pid(e))));

        el.on("release", (e) => pipelineAction(pid(e),
            () => releaseEnquiry(teamId(), pid(e))));

        el.on("accept", (e) => pipelineAction(pid(e),
            () => acceptEnquiry(teamId(), pid(e)),
            "trials",
            (r) => `${r.firstName || "Player"} moved to Trials ✓`));

        el.on("returnToPool", (e) => pipelineAction(pid(e),
            () => returnToPool(teamId(), pid(e)),
            "enquiries"));

        el.on("archive", (e) => {
            const reasonId = (e && e.detail && e.detail.reasonId) || "";
            pipelineAction(pid(e), () => archivePlayer(teamId(), pid(e), reasonId));
        });

        el.on("openPlayer", (e) => loadPlayer(pid(e)));

        // The invite needs taster and registration dates. Reuses the existing
        // InviteRegistration Lightbox rather than rebuilding the form - a
        // Lightbox is a shared overlay, so it costs nothing per breakpoint,
        // and this one already works.
        el.on("invite", async (e) => {
            const playerId = pid(e);
            const player = squadModel && (squadModel.trials || []).find(t => t.id === playerId);
            if (!player) return;

            let result = null;
            try {
                result = await wixWindow.openLightbox("InviteRegistration", {
                    firstName: player.firstName,
                    lastName: player.name,
                    parentName: player.parentName,
                    parentEmail: player.parentEmail
                });
            } catch (err) {
                console.error("[ManagerHub] invite lightbox:", err);
                return;
            }
            if (!result) return;   // cancelled

            pipelineAction(playerId,
                () => sendInvite(teamId(), playerId, {
                    tasterDate: result.tasterDate,
                    regDate: result.regDate,
                    playerType: result.playerType === "true" || result.playerType === true
                }),
                "squad",
                (r) => `${r.firstName || "Player"} sent a registration link ✓`);
        });
    });

    // ---- player record ----
    safeWire("#customPlayer", () => {
        $w("#customPlayer").on("saveKit", async (e) => {
            const d = (e && e.detail) || {};
            if (!playerModel) return;
            playerModel.savingKit = true;
            playerModel.kitMessage = "";
            pushPlayer();

            try {
                const res = await setKitNumber(teamId(), d.playerId, d.kitNumber);
                playerModel.savingKit = false;
                if (res && res.success) {
                    // Patched from the value we know was saved rather than
                    // re-fetching - a query straight after a write can return
                    // the pre-write value.
                    playerModel.kit = res.kitNumber || "";
                    playerModel.kitSaved = true;
                    playerModel.kitError = false;
                    playerModel.kitMessage = "Kit number saved";
                } else {
                    playerModel.kitError = true;
                    playerModel.kitMessage = (res && res.error) || "Couldn't save that.";
                }
            } catch (err) {
                console.error("[ManagerHub] setKitNumber:", err);
                playerModel.savingKit = false;
                playerModel.kitError = true;
                playerModel.kitMessage = "Couldn't save that.";
            }
            pushPlayer();
        });

        $w("#customPlayer").on("messageParent", (e) => {
            loadCompose((e && e.detail && e.detail.playerId) || "");
        });
    });

    // ---- fixtures ----
    safeWire("#customMgrFixtures", () => {
        $w("#customMgrFixtures").on("addFixture", () => openFixtureForm(null));

        $w("#customMgrFixtures").on("pickSquad", (e) => loadSquadPick((e && e.detail && e.detail.fixtureId) || ""));

        $w("#customMgrFixtures").on("nudgeReplies", async (e) => {
            const fid = (e && e.detail && e.detail.fixtureId) || "";
            // Every outcome below writes a visible line onto the card, so if
            // NOTHING appears the event never arrived - this says which.
            console.log("[ManagerHub] nudge pressed for fixture", fid, "model:", !!fixturesModel);
            if (!fid || !fixturesModel) return;

            // Marked busy BEFORE the round trip. Sending reminders changes no
            // count on the card, so without this the whole action is invisible
            // until it finishes.
            fixturesModel.nudging = Object.assign({}, fixturesModel.nudging, { [fid]: true });
            fixturesModel.nudged = Object.assign({}, fixturesModel.nudged, { [fid]: "" });
            pushFixtures();

            let msg;
            try {
                const res = await nudgeNoReplies(teamId(), fid);
                msg = (res && res.success)
                    ? (res.asked === 0
                        ? "Everyone's already replied."
                        : "Reminder sent to the parents of " + res.asked +
                          (res.asked === 1 ? " player." : " players."))
                    : ((res && res.error) || "Couldn't send those reminders.");
            } catch (err) {
                console.error("[ManagerHub] nudgeReplies:", err);
                msg = "Couldn't send those reminders just now.";
            }

            if (fixturesModel) {
                fixturesModel.nudging = Object.assign({}, fixturesModel.nudging, { [fid]: false });
                fixturesModel.nudged = Object.assign({}, fixturesModel.nudged, { [fid]: msg });
                pushFixtures();
            }
        });

        $w("#customMgrFixtures").on("editFixture", (e) => {
            const id = e && e.detail && e.detail.fixtureId;
            const fixture = fixturesModel && (fixturesModel.fixtures || []).find(f => f.id === id);
            if (fixture) openFixtureForm(fixture);
        });

        // Names are fetched per fixture on demand - loading every list up
        // front would be a query per fixture for data mostly nobody opens.
        $w("#customMgrFixtures").on("loadReplies", async (e) => {
            const id = e && e.detail && e.detail.fixtureId;
            if (!id || !fixturesModel) return;
            try {
                const res = await getTeamFixtureResponses(teamId(), id);
                if (!fixturesModel) return;
                fixturesModel.replies = Object.assign({}, fixturesModel.replies, {
                    [id]: (res && res.success)
                        ? { accepted: res.accepted, declined: res.declined, noReply: res.noReply }
                        : { accepted: [], declined: [], noReply: [] }
                });
                pushFixtures();
            } catch (err) {
                console.error("[ManagerHub] getTeamFixtureResponses:", err);
            }
        });
    });

    safeWire("#customFixtureForm", () => {
        $w("#customFixtureForm").on("saveFixture", async (e) => {
            const d = (e && e.detail) || {};
            fixtureFormModel = Object.assign({}, fixtureFormModel, { saving: true, error: "" });
            pushFixtureForm();

            try {
                const res = d.fixtureId
                    ? await updateFixture(teamId(), d.fixtureId, d.form)
                    : await createFixture(teamId(), d.form);

                if (res && res.success) {
                    goTo("stateFixtures", { sub: teamName(teamId()) });
                    await loadFixtures();
                } else {
                    fixtureFormModel = Object.assign({}, fixtureFormModel, {
                        saving: false,
                        error: (res && res.error) || "Couldn't save that fixture."
                    });
                    pushFixtureForm();
                }
            } catch (err) {
                console.error("[ManagerHub] saveFixture:", err);
                fixtureFormModel = Object.assign({}, fixtureFormModel, {
                    saving: false, error: "Couldn't save that fixture."
                });
                pushFixtureForm();
            }
        });

        $w("#customFixtureForm").on("deleteFixture", async (e) => {
            const id = e && e.detail && e.detail.fixtureId;
            if (!id) return;
            try {
                const res = await deleteFixture(teamId(), id);
                if (res && res.success) {
                    goTo("stateFixtures", { sub: teamName(teamId()) });
                    await loadFixtures();
                } else {
                    fixtureFormModel = Object.assign({}, fixtureFormModel, {
                        error: (res && res.error) || "Couldn't delete that fixture."
                    });
                    pushFixtureForm();
                }
            } catch (err) {
                console.error("[ManagerHub] deleteFixture:", err);
            }
        });

        $w("#customFixtureForm").on("cancelForm", () => {
            goTo("stateFixtures", { sub: teamName(teamId()) });
            loadFixtures();
        });
    });

    // ---- messages ----
    safeWire("#customMgrMessages", () => {
        $w("#customMgrMessages").on("compose", () => loadCompose(""));
    });

    safeWire("#customCompose", () => {
        $w("#customCompose").on("send", async (e) => {
            const d = (e && e.detail) || {};
            composeModel = Object.assign({}, composeModel, { sending: true, error: "", sent: "" });
            pushCompose();

            try {
                const res = await sendManagerMessage(teamId(), d);
                if (res && res.success) {
                    const n = Number(res.reach) || 0;
                    composeModel = Object.assign({}, composeModel, {
                        sending: false,
                        sent: `Sent to ${n} ${n === 1 ? "parent" : "parents"} ✓`
                    });
                } else {
                    composeModel = Object.assign({}, composeModel, {
                        sending: false,
                        error: (res && res.error) || "Couldn't send that message."
                    });
                }
            } catch (err) {
                console.error("[ManagerHub] sendManagerMessage:", err);
                composeModel = Object.assign({}, composeModel, {
                    sending: false, error: "Couldn't send that message."
                });
            }
            pushCompose();
        });

        $w("#customCompose").on("cancelCompose", () => {
            goTo("stateMessages", { sub: teamName(teamId()) });
            loadMessages();
        });
    });

    // ---- more ----
    safeWire("#customMgrMore", () => {
        const el = $w("#customMgrMore");
        el.on("openRecruit", () => loadRecruit());
        el.on("openTeamProfile", () => loadTeamProfile());
        el.on("openStats", () => loadStats(teamId(), statsSeason));
        el.on("openStaff", () => loadStaff());
        el.on("openNews", () => loadNews());
        el.on("openSponsors", () => loadSponsors());
        el.on("openShare", () => loadShare());
        el.on("logout", async () => {
            try {
                await authentication.logout();
                wixLocationFrontend.to("/");
            } catch (err) {
                console.error("[ManagerHub] logout:", err);
            }
        });
    });

    // ---- join link / QR ----
    safeWire("#customShare", () => {
        const el = $w("#customShare");
        el.on("openManualEnquiry", () => loadEnquiryAdd());
        // This DOES leave the Hub - Velo page code runs sandboxed and has no
        // reliable way to open a new tab. The difference from the old stub is
        // that the manager chose it from a button labelled "See the parent's
        // form", rather than it happening behind "Share the join link".
        el.on("openJoinPage", (e) => {
            const url = (e && e.detail && e.detail.url) || "";
            if (url) wixLocationFrontend.to(url);
        });
    });

    // ---- manual enquiry ----
    safeWire("#customEnquiryAdd", () => {
        const el = $w("#customEnquiryAdd");

        el.on("cancelEnquiryAdd", () => loadShare());
        el.on("openSquadEnquiries", () => loadSquad(null, "enquiries"));

        // "Add another" - the element has already blanked its own fields, so
        // this only has to clear the saved banner.
        el.on("resetEnquiryAdd", () => {
            enquiryAddModel = Object.assign({}, enquiryOptions || {}, { reset: true });
            pushEnquiryAdd();
        });

        el.on("saveEnquiry", async (e) => {
            const form = (e && e.detail && e.detail.form) || {};
            enquiryAddModel = Object.assign({}, enquiryAddModel, { saving: true, error: "" });
            pushEnquiryAdd();

            try {
                const res = await addManualEnquiry(teamId(), form);
                if (res && res.success) {
                    enquiryAddModel = Object.assign({}, enquiryOptions || {}, {
                        saved: true,
                        savedName: res.name || "",
                        savedAgeGroup: res.ageGroupLabel || ""
                    });
                } else {
                    enquiryAddModel = Object.assign({}, enquiryAddModel, {
                        saving: false,
                        error: (res && res.error) || "Couldn't save that enquiry."
                    });
                }
            } catch (err) {
                console.error("[ManagerHub] saveEnquiry:", err);
                enquiryAddModel = Object.assign({}, enquiryAddModel, {
                    saving: false, error: "Couldn't save that enquiry just now."
                });
            }
            pushEnquiryAdd();
        });
    });

    // ---- squad picker ----
    safeWire("#customSquadPick", () => {
        const el = $w("#customSquadPick");

        el.on("cancelSquadPick", () => { goTo("stateFixtures"); loadFixtures(); });

        el.on("saveSquad", (e) => runSquadAction(e, saveSquad, (res) =>
            "Saved — " + res.placed + " on the pitch, " + res.subs + " on the bench."));

        el.on("publishSquad", (e) => runSquadAction(e, publishSquad, (res) => {
            // ⚠️ COUNTED IN PLAYERS, NOT PARENTS. The parent figure is bigger
            // than the player figure whenever a child has two accounts linked,
            // which is correct and reads as a fault - a manager thinks in
            // squad members, so that is the number reported.
            const players = res.picked + (res.picked === 1 ? " player" : " players");

            // The exception, because this one is NOT just presentation: these
            // children generated no message at all, and without saying so the
            // manager would believe the whole squad had been told.
            const gap = res.unreachable
                ? " " + res.unreachable + (res.unreachable === 1 ? " player has" : " players have") +
                  " no linked parent account, so nobody was told about them."
                : "";

            return "Squad sent to the parents of " + players + "." + gap;
        }));

        el.on("nudgeReplies", (e) => runSquadAction(e, nudgeNoReplies, (res) =>
            res.asked === 0
                ? "Everyone's already replied."
                : "Reminder sent to " + res.reach + (res.reach === 1 ? " parent" : " parents") +
                  " about " + res.asked + (res.asked === 1 ? " player." : " players.")));
    });

    // ---- recruitment ----
    safeWire("#customRecruit", () => {
        $w("#customRecruit").on("publishPoster", async (e) => {
            const d = (e && e.detail) || {};
            recruitModel = Object.assign({}, recruitModel, { publishing: true, error: "", sent: "" });
            pushRecruit();

            try {
                const res = await publishRecruitmentPost(teamId(), Object.assign({}, d, {
                    teamName: teamName(teamId())
                }));
                recruitModel = Object.assign({}, recruitModel, {
                    publishing: false,
                    sent: (res && res.success) ? (res.message || "Poster published ✓") : "",
                    error: (res && res.success) ? "" : ((res && res.error) || "Couldn't publish that poster.")
                });
            } catch (err) {
                console.error("[ManagerHub] publishRecruitmentPost:", err);
                recruitModel = Object.assign({}, recruitModel, {
                    publishing: false, error: "Couldn't publish that poster."
                });
            }
            pushRecruit();
        });

        $w("#customRecruit").on("cancelRecruit", () => { goTo("stateMore"); loadMoreState(); });
    });

    // ---- team profile ----
    safeWire("#customTeamProfile", () => {
        $w("#customTeamProfile").on("saveTeamProfile", async (e) => {
            const d = (e && e.detail) || {};
            teamProfileModel = Object.assign({}, teamProfileModel, { saving: true, error: "", saved: "" });
            pushTeamProfile();

            try {
                const res = await saveTeamProfile(teamId(), d);
                teamProfileModel = Object.assign({}, teamProfileModel, {
                    saving: false,
                    saved: (res && res.success) ? "Saved and live on the website ✓" : "",
                    error: (res && res.success) ? "" : ((res && res.error) || "Couldn't save."),
                    photo: (res && res.success && res.photo) ? res.photo : teamProfileModel.photo
                });
            } catch (err) {
                console.error("[ManagerHub] saveTeamProfile:", err);
                teamProfileModel = Object.assign({}, teamProfileModel, { saving: false, error: "Couldn't save." });
            }
            pushTeamProfile();
        });

        $w("#customTeamProfile").on("cancelTeamProfile", () => { goTo("stateMore"); loadMoreState(); });
        $w("#customTeamProfile").on("photoError", (e) => {
            teamProfileModel = Object.assign({}, teamProfileModel, {
                error: (e && e.detail && e.detail.message) || "That image couldn't be read."
            });
            pushTeamProfile();
        });
    });

    // ---- staff ----
    safeWire("#customStaff", () => {
        $w("#customStaff").on("saveStaff", async (e) => {
            const d = (e && e.detail) || {};
            staffModel = Object.assign({}, staffModel, { saving: true, error: "", saved: "" });
            pushStaff();

            try {
                const res = await saveMyStaffRecord(d);
                staffModel = Object.assign({}, staffModel, {
                    saving: false,
                    saved: (res && res.success) ? "Saved ✓" : "",
                    error: (res && res.success) ? "" : ((res && res.error) || "Couldn't save."),
                    headshot: (res && res.success && res.headshot) ? res.headshot : staffModel.headshot
                });
                // The poster reads the manager's name and number from here, so
                // a stale context would print an old number on a new poster.
                if (res && res.success) {
                    const fresh = await getManagerContext();
                    if (fresh && fresh.success) mgr = fresh;
                }
            } catch (err) {
                console.error("[ManagerHub] saveMyStaffRecord:", err);
                staffModel = Object.assign({}, staffModel, { saving: false, error: "Couldn't save." });
            }
            pushStaff();
        });

        $w("#customStaff").on("cancelStaff", () => { goTo("stateMore"); loadMoreState(); });
        $w("#customStaff").on("photoError", (e) => {
            staffModel = Object.assign({}, staffModel, {
                error: (e && e.detail && e.detail.message) || "That image couldn't be read."
            });
            pushStaff();
        });
    });

    // ---- sponsors ----
    safeWire("#customSponsors", () => {
        $w("#customSponsors").on("addSponsor", async (e) => {
            const d = (e && e.detail) || {};
            sponsorsModel = Object.assign({}, sponsorsModel, { adding: true, error: "", added: "" });
            pushSponsors();

            try {
                const res = await addSponsor(d);
                if (res && res.success) {
                    const fresh = await getSponsors();
                    sponsorsModel = {
                        sponsors: (fresh && fresh.success) ? fresh.sponsors : (sponsorsModel.sponsors || []),
                        available: (fresh && fresh.success) ? fresh.available : [],
                        teams: (mgr && mgr.teams) || [],
                        added: "Sponsor added ✓"
                    };
                } else {
                    sponsorsModel = Object.assign({}, sponsorsModel, {
                        adding: false,
                        error: (res && res.error) || "Couldn't add that sponsor.",
                        badField: "name"
                    });
                }
            } catch (err) {
                console.error("[ManagerHub] addSponsor:", err);
                sponsorsModel = Object.assign({}, sponsorsModel, { adding: false, error: "Couldn't add that sponsor." });
            }
            pushSponsors();
        });

        $w("#customSponsors").on("removeSponsor", async (e) => {
            const id = (e && e.detail && e.detail.sponsorId) || "";
            if (!id) return;
            sponsorsModel = Object.assign({}, sponsorsModel, { removing: id, error: "" });
            pushSponsors();

            try {
                const res = await removeSponsorFromMyTeams(id);
                if (res && res.success) {
                    // Re-fetched rather than spliced out locally: a sponsor on
                    // two of this manager's teams comes off both, and the list
                    // is grouped by team, so the shape of it changes.
                    const fresh = await getSponsors();
                    const where = (res.removedFrom || []).join(" and ");
                    sponsorsModel = {
                        sponsors: (fresh && fresh.success) ? fresh.sponsors : [],
                        available: (fresh && fresh.success) ? fresh.available : [],
                        teams: (mgr && mgr.teams) || [],
                        removed: true,
                        added: where ? `Removed from ${where} ✓` : "Removed ✓"
                    };
                } else {
                    sponsorsModel = Object.assign({}, sponsorsModel, {
                        removing: "",
                        error: (res && res.error) || "Couldn't remove that sponsor."
                    });
                }
            } catch (err) {
                console.error("[ManagerHub] removeSponsorFromMyTeams:", err);
                sponsorsModel = Object.assign({}, sponsorsModel, {
                    removing: "", error: "Couldn't remove that sponsor."
                });
            }
            pushSponsors();
        });

        $w("#customSponsors").on("deleteSponsor", async (e) => {
            const id = (e && e.detail && e.detail.sponsorId) || "";
            if (!id) return;
            sponsorsModel = Object.assign({}, sponsorsModel, { removing: id, error: "" });
            pushSponsors();

            try {
                const res = await deleteSponsor(id);
                if (res && res.success) {
                    const fresh = await getSponsors();
                    // Names the teams it came off, because a club-wide delete
                    // can quietly affect a squad the manager never sees.
                    const where = (res.detached || []).join(", ");
                    sponsorsModel = {
                        sponsors: (fresh && fresh.success) ? fresh.sponsors : [],
                        available: (fresh && fresh.success) ? fresh.available : [],
                        teams: (mgr && mgr.teams) || [],
                        removed: true,
                        added: where
                            ? (res.name + " deleted — removed from " + where)
                            : (res.name + " deleted")
                    };
                } else {
                    sponsorsModel = Object.assign({}, sponsorsModel, {
                        removing: "",
                        error: (res && res.error) || "Couldn't delete that sponsor."
                    });
                }
            } catch (err) {
                console.error("[ManagerHub] deleteSponsor:", err);
                sponsorsModel = Object.assign({}, sponsorsModel, {
                    removing: "", error: "Couldn't delete that sponsor."
                });
            }
            pushSponsors();
        });

        $w("#customSponsors").on("attachSponsor", async (e) => {
            const id = (e && e.detail && e.detail.sponsorId) || "";
            if (!id) return;
            sponsorsModel = Object.assign({}, sponsorsModel, { attaching: id, error: "" });
            pushSponsors();

            try {
                const res = await attachSponsor(teamId(), id);
                if (res && res.success) {
                    const fresh = await getSponsors();
                    sponsorsModel = {
                        sponsors: (fresh && fresh.success) ? fresh.sponsors : [],
                        available: (fresh && fresh.success) ? fresh.available : [],
                        teams: (mgr && mgr.teams) || [],
                        added: res.name + " added ✓"
                    };
                } else {
                    sponsorsModel = Object.assign({}, sponsorsModel, {
                        attaching: "",
                        error: (res && res.error) || "Couldn't add that sponsor."
                    });
                }
            } catch (err) {
                console.error("[ManagerHub] attachSponsor:", err);
                sponsorsModel = Object.assign({}, sponsorsModel, {
                    attaching: "", error: "Couldn't add that sponsor."
                });
            }
            pushSponsors();
        });

        $w("#customSponsors").on("cancelSponsors", () => { goTo("stateMore"); loadMoreState(); });
        $w("#customSponsors").on("photoError", (e) => {
            sponsorsModel = Object.assign({}, sponsorsModel, {
                error: (e && e.detail && e.detail.message) || "That logo couldn't be read."
            });
            pushSponsors();
        });
    });

    // ---- news ----
    safeWire("#customNews", () => {
        $w("#customNews").on("postNews", async (e) => {
            const d = (e && e.detail) || {};
            newsModel = Object.assign({}, newsModel, { posting: true, error: "", posted: "" });
            pushNews();

            try {
                const res = await postNews(d);
                newsModel = Object.assign({}, newsModel, {
                    posting: false,
                    posted: (res && res.success) ? (res.message || "Posted ✓") : "",
                    error: (res && res.success) ? "" : ((res && res.error) || "Couldn't post that story.")
                });
            } catch (err) {
                console.error("[ManagerHub] postNews:", err);
                newsModel = Object.assign({}, newsModel, { posting: false, error: "Couldn't post that story." });
            }
            pushNews();
        });

        $w("#customNews").on("cancelNews", () => { goTo("stateMore"); loadMoreState(); });
        $w("#customNews").on("photoError", (e) => {
            newsModel = Object.assign({}, newsModel, {
                error: (e && e.detail && e.detail.message) || "That image couldn't be read."
            });
            pushNews();
        });
    });

    // ---- stats ----
    safeWire("#customStats", () => {
        $w("#customStats").on("statsFilter", (e) => {
            const d = (e && e.detail) || {};
            // A different team means a different squad list, so the cached
            // options have to go.
            if (d.teamId && d.teamId !== currentTeamId) statsOptions = null;
            loadStats(d.teamId, d.season);
        });
        $w("#customStats").on("openStatsAdd", () => loadStatsAdd());
        $w("#customStats").on("openStatsEdit", () => loadStatsEdit(statsEditKind));
    });

    safeWire("#customStatsAdd", () => {
        const el = $w("#customStatsAdd");

        el.on("statsAddFilter", (e) => {
            const d = (e && e.detail) || {};
            if (d.teamId && d.teamId !== currentTeamId) { currentTeamId = d.teamId; statsOptions = null; }
            if (d.season) statsSeason = d.season;
            loadStatsAdd();
        });

        const finish = async (res, key) => {
            statsAddModel = Object.assign({}, statsAddModel, {
                saving: false,
                saved: (res && res.success) ? "Saved ✓" : "",
                error: (res && res.success) ? "" : ((res && res.error) || "Couldn't save."),
                [key]: !!(res && res.success)
            });
            pushStatsAdd();
        };

        el.on("saveResult", async (e) => {
            statsAddModel = Object.assign({}, statsAddModel, { saving: true, error: "", saved: "" });
            pushStatsAdd();
            try {
                const d = Object.assign({}, e.detail, { season: statsSeason });
                await finish(await addTeamResult(teamId(), d), "savedResult");
            } catch (err) {
                console.error("[ManagerHub] addTeamResult:", err);
                await finish({ success: false, error: "Couldn't save." }, "savedResult");
            }
        });

        el.on("savePotm", async (e) => {
            statsAddModel = Object.assign({}, statsAddModel, { saving: true, error: "", saved: "" });
            pushStatsAdd();
            try {
                const d = Object.assign({}, e.detail, { season: statsSeason });
                const res = await addPlayerOfTheMatch(teamId(), d);

                let msg = "";
                if (res && res.success) {
                    const n = Number(res.saved) || 1;
                    msg = n > 1 ? (n + " awards saved ✓") : "Award saved ✓";
                    // Said out loud rather than silently dropped - a manager who
                    // attached a photo needs to know it didn't go.
                    if (res.photoBlocked) msg += " (photo not saved — consent missing)";
                    // Says it out loud. An override that scrolls past silently
                    // is the same as no override at all.
                    else if (res.photoOverridden) msg += " — photo published on your say-so, and recorded";
                    else if (res.photoSaved) msg += " with photo";

                    // ⚠️ WHEN IT POSTS, OR WHY IT WON'T. Without this a manager
                    // submits on a Wednesday, sees "Award saved", and reasonably
                    // assumes it is going out - when nothing is scheduled at all.
                    // The backend already worked this out; it was just never
                    // reaching the screen.
                    if (res.scheduledFor) {
                        msg += ". Posting to Facebook " + res.scheduledFor + ".";
                    } else if (res.notScheduled === "late") {
                        msg += ". Too late to be scheduled — post this one yourself.";
                    } else if (res.notScheduled === "full") {
                        msg += ". Every slot is taken — post this one yourself.";
                    } else if (res.notScheduled === "nophoto") {
                        // Said plainly. A manager who meant to attach one gets
                        // told before Monday rather than noticing the absence.
                        msg += ". No photo, so nothing will post to Facebook.";
                    } else if (res.photoSaved || res.photoOverridden) {
                        msg += ". Not scheduled to post.";
                    }
                }

                statsAddModel = Object.assign({}, statsAddModel, {
                    saving: false,
                    saved: msg,
                    error: (res && res.success) ? "" : ((res && res.error) || "Couldn't save."),
                    savedPotm: !!(res && res.success)
                });
                pushStatsAdd();
            } catch (err) {
                console.error("[ManagerHub] addPlayerOfTheMatch:", err);
                await finish({ success: false, error: "Couldn't save." }, "savedPotm");
            }
        });

        el.on("saveBulk", async (e) => {
            statsAddModel = Object.assign({}, statsAddModel, { saving: true, error: "", saved: "" });
            pushStatsAdd();
            try {
                const rows = (e && e.detail && e.detail.rows) || [];
                const res = await addPlayerStats(teamId(), statsSeason, rows);
                // A PARTIAL save deliberately does NOT set savedBulk - leaving
                // the rows on screen is what lets a manager retry the failures
                // without retyping the lot.
                const clean = res && res.success && (!res.failed || res.failed.length === 0);
                statsAddModel = Object.assign({}, statsAddModel, {
                    saving: false,
                    savedBulk: clean,
                    saved: (res && res.saved) ? `Saved ${res.saved} ${res.saved === 1 ? "player" : "players"} ✓` : "",
                    error: (res && res.failed && res.failed.length)
                        ? `Couldn't save: ${res.failed.join(", ")} — try those again.`
                        : ((res && res.error) || "")
                });
            } catch (err) {
                console.error("[ManagerHub] addPlayerStats:", err);
                statsAddModel = Object.assign({}, statsAddModel, { saving: false, error: "Couldn't save those stats." });
            }
            pushStatsAdd();
        });

        el.on("photoError", (e) => {
            statsAddModel = Object.assign({}, statsAddModel, {
                error: (e && e.detail && e.detail.message) || "That photo couldn't be read."
            });
            pushStatsAdd();
        });

        el.on("cancelStatsAdd", () => loadStats(teamId(), statsSeason));
    });

    safeWire("#customStatsEdit", () => {
        const el = $w("#customStatsEdit");

        el.on("statsEditFilter", (e) => {
            const d = (e && e.detail) || {};
            if (d.teamId && d.teamId !== currentTeamId) { currentTeamId = d.teamId; statsOptions = null; }
            if (d.season) statsSeason = d.season;
            loadStatsEdit(d.kind || statsEditKind);
        });

        el.on("saveRecord", async (e) => {
            const d = (e && e.detail) || {};
            statsEditModel = Object.assign({}, statsEditModel, { saving: true, error: "", done: "" });
            pushStatsEdit();
            try {
                const res = await updateStatRecord(teamId(), d.kind, d.recordId, d.form);
                if (res && res.success) await loadStatsEdit(d.kind);
                if (statsEditModel) {
                    statsEditModel.saving = false;
                    statsEditModel.done = (res && res.success) ? "Saved ✓" : "";
                    statsEditModel.error = (res && res.success) ? "" : ((res && res.error) || "Couldn't save.");
                    pushStatsEdit();
                }
            } catch (err) {
                console.error("[ManagerHub] updateStatRecord:", err);
                statsEditModel = Object.assign({}, statsEditModel, { saving: false, error: "Couldn't save." });
                pushStatsEdit();
            }
        });

        el.on("deleteRecord", async (e) => {
            const d = (e && e.detail) || {};
            try {
                const res = await deleteStatRecord(teamId(), d.kind, d.recordId);
                if (res && res.success) {
                    await loadStatsEdit(d.kind);
                    if (statsEditModel) { statsEditModel.done = "Deleted ✓"; pushStatsEdit(); }
                } else {
                    statsEditModel = Object.assign({}, statsEditModel, {
                        error: (res && res.error) || "Couldn't delete that record."
                    });
                    pushStatsEdit();
                }
            } catch (err) {
                console.error("[ManagerHub] deleteStatRecord:", err);
            }
        });

        el.on("cancelStatsEdit", () => loadStats(teamId(), statsSeason));
    });
}
