// ==========================================
// PARENT HUB v2 — shell navigation + Home tab
// ==========================================
// Same underlying data/logic as v1 (frontend/members_pages/Parent Hub.js) -
// this is a new VIEW only, nothing about how kids/status/linking work has
// changed. See docs/PARENT_HUB_V2_ELEMENTS.md for the full element map.
//
// stateMessages/stateFixtures/statePayments/stateMore/stateRegistration/
// stateProfile/statePaymentDetail aren't wired yet - nav still switches to
// them (so the shell is fully testable now), they'll just be empty until
// each state's elements are built and this file is extended to match.

import { currentMember, authentication } from 'wix-members-frontend';
import wixData from 'wix-data';
import wixLocationFrontend from 'wix-location-frontend';
import wixWindow from 'wix-window';
import { hubEmailSweep, getKidsForParent, findPlayerByFanNumberAndDob, confirmPlayerLink, getGoCardlessStatus, secureUpdatePlayerRegistration, secureUpdateParentProfile, getFeeSchedule, startGoCardlessSetup, cancelGoCardlessSubscription, getPlayerPaymentTimeline } from 'backend/registration.jsw';
import { getTeamManager, getClubOfficials } from 'backend/staffData.jsw';
import { getParentFixtures, respondToFixture } from 'backend/fixtures.jsw';
import { getParentMessages, markMessagesRead } from 'backend/messages.jsw';
// ⚠️ TEMPORARY - manual rollup trigger for testing. Delete with the admin
// button in parentHubFixtures.js once the nightly job is trusted.
import { isBetaTester } from 'public/betaAccess.js';
// Registration's headshot and birth-certificate uploads run through this.
import { uploadRegistrationFile } from 'backend/mediaUpload.jsw';

const PARENT_ROLE_ID = "de5fbcdb-2777-4dfa-aa43-5475aa87905d";
const LEFT_STATUS_ID = "d78cb8b0-3b3b-4439-b889-fd36dc434781";
const INVITED_STATUS_ID = "184b5a98-37c8-41a6-bc58-5a1c17827f04";
const READY_FOR_FA_ID = "95978c83-70fc-4bd7-bd75-12f43216a0d7";
const DRAFT_STATUS_ID = "ad6fe8f3-c82e-45ae-b688-89d53c3f0a9f";
const FA_COMPLETE_ID = "af2bef8c-1caa-4bf8-8dce-321d19723741";
const Active_ID = "705c0b66-d5d5-47b6-b828-98a94c670f1f";
const RENEWAL_STATUS_ID = "4d354c43-c893-4bc8-8415-18cfc32b3236";
const ACTION_REQUIRED_ID = "d5bd1c0f-e19e-4318-a8d3-d5d6fe63b274";

let currentParentProfileId = null;
// The full ParentProfiles row - More > My Details populates from it.
let currentParentProfile = null;
// The kids currently on screen. #customHome only carries ids, so the event
// handlers look the real record up here rather than the element holding
// player objects - nothing getKidsForParent redacted can leak into it.
let currentVisibleKids = [];
// What #customHome is showing. Held so the slower lookups (payment status,
// fixtures) can patch one field and repaint, instead of each rebuilding the
// whole payload.
let homeModel = null;
// Bumped on every loadDashboard. A late-resolving lookup from a previous
// load checks this before patching, so stale data can't overwrite fresh.
let homeGeneration = 0;
// Guards the openPlayer handler - a double-tap would otherwise fire the
// INVITED -> DRAFT status write twice.
let homeBusy = false;
// Resolved once in onReady from the logged-in member. Gates the in-progress
// in-progress states so they can ship to production without any parent
// seeing them - see public/betaAccess.js. Currently assigned but unread: the
// conversion is done, and the Fixtures rollup test button it last gated was
// removed once the nightly cron was trusted. Kept because Messages is the
// next thing to ship gated. Starts false so a failed
// member lookup hides a beta rather than exposing it.
let showBetaFeatures = false;
let pendingLinkPlayerId = null;
let pendingLinkFanNumber = null;
let pendingLinkDob = null;
// Which of the 5 main tabs was active before drilling into Registration/
// Profile/PaymentDetail - the topbar's back button returns here, not always Home.
let currentTab = "stateHome";

// The child currently open in the registration form / profile. Always a
// shallow COPY of the repeater's item data, never a reference - the submit
// flow mutates this (e.g. SP_status) and that must not leak back into the
// repeater's row data.
let activePlayerContext = null;
// Steps, progress %, step pills and field-highlight colours all moved into
// <parent-hub-registration> on 2026-08-16 - the element holds the values, so
// it can work all of that out without a round trip. The STEPS array, the pill
// colour constants and lastCalculatedPercentage/currentStepIndex went with
// them. `progress` now arrives on the save payload instead.

// Still needed here: sp_emerg_source is written straight to the CMS, and the
// element sends these same three strings back.
const EMERG_SOURCE_PARENT1 = "parent1";
const EMERG_SOURCE_PARENT2 = "parent2";
const EMERG_SOURCE_NEW = "new";

// Status GUID -> what the Home card shows. Lives here, not in the custom
// element: the GUIDs are already constants in this file, and an element that
// can't import them has no business holding copies. The element takes a
// plain label + tone and paints it.
const STATUS_VIEW = {
    [INVITED_STATUS_ID]:  { label: "Registration Required",           tone: "warning",  action: "Register Now" },
    [RENEWAL_STATUS_ID]:  { label: "Annual Renewal Required",         tone: "warning",  action: "Update Forms" },
    [DRAFT_STATUS_ID]:    { label: "Draft In Progress",               tone: "warning",  action: "Resume Form" },
    [ACTION_REQUIRED_ID]: { label: "Action Required - Update Needed", tone: "critical", action: "Fix & Resubmit" },
    [READY_FOR_FA_ID]:    { label: "Pending FA Registration",         tone: "info",     action: "View Profile" },
    [FA_COMPLETE_ID]:     { label: "Pending Club Process",            tone: "violet",   action: "View Profile" },
    [Active_ID]:          { label: "Active",                          tone: "success",  action: "View Profile" }
};
const STATUS_FALLBACK = { label: "Processing", tone: "neutral", action: "View Profile" };

const TAB_TITLES = {
    stateHome: { title: "Home", sub: "Signol Athletic · Parent Hub" },
    stateMessages: { title: "Messages", sub: "" },
    stateFixtures: { title: "Fixtures & Results", sub: "All teams" },
    statePayments: { title: "Payments", sub: "Direct Debit plans" },
    stateMore: { title: "More", sub: "Contacts & documents" }
};

function collapseIfExists(id) { if ($w(id).id) $w(id).collapse(); }
function expandIfExists(id) { if ($w(id).id) $w(id).expand(); }

// Every optional/not-yet-built element gets wired through here so a missing
// element in the Editor can't break wiring registered after it.
function safeWire(id, fn) {
    try {
        if ($w(id).id) fn();
    } catch (err) {
        console.error(`Failed wiring ${id}:`, err);
    }
}

function setTopbar(title, sub, showBack) {
    if (!$w("#customTopbar").id) return;
    $w("#customTopbar").setAttribute("data", JSON.stringify({
        title: title || "", sub: sub || "", showBack: !!showBack
    }));
}

// Unread count for the Messages badge. Set from getParentMessages on load and
// cleared when the tab is opened. The badge hides itself at 0.
let navUnread = 0;

// The drill-downs (Registration / Profile / PaymentDetail) have no nav item.
// They reach their state via changeState directly and never touch currentTab,
// so the nav keeps highlighting whichever section the parent came from - which
// is the behaviour we want, with no code to maintain.
function paintNav(activeState) {
    if (!$w("#customNav").id) return;
    $w("#customNav").setAttribute("data", JSON.stringify({
        active: activeState, unread: navUnread
    }));
}

function switchTab(stateName) {
    currentTab = stateName;
    $w("#stateboxHub2").changeState(stateName);
    const t = TAB_TITLES[stateName];
    if (t) setTopbar(t.title, t.sub, false);
    paintNav(stateName);

    // Loaded on first open rather than with the dashboard: most visits never
    // reach Fixtures, and it costs two queries plus a response lookup.
    if (stateName === "stateFixtures") loadFixturesState();
    if (stateName === "stateMessages") loadMessagesState();
}

$w.onReady(async function () {
    // Synchronous, BEFORE the awaits below. There are three sequential
    // backend round-trips before real kids land (hubEmailSweep -> profile
    // lookup -> getKidsForParent, each depending on the last), and without
    // this the element sits showing its own mock data - another family's
    // children - for that whole window. Safe this early: setAttribute on an
    // unupgraded element is picked up when it upgrades.
    if ($w("#customHome").id) {
        $w("#customHome").setAttribute("data", JSON.stringify({ loading: true }));
    }

    try {
        const member = await currentMember.getMember();
        if (!member) return wixLocationFrontend.to("/");

        // Nothing on this page is gated right now - More was promoted to the
        // real tab on 2026-08-16 and the whole v2 page is still beta-gated at
        // the door by #btnParentHubV2 in masterPage.js, so gating inside it
        // would be belt-and-braces. Kept because the next conversion
        // (stateHome2) wants exactly this: collapse the nav item BEFORE the
        // lookup so errors fail closed, and gate the state's data load too,
        // not just its button - an ungated load makes every parent pay for a
        // tab they can't open.
        showBetaFeatures = isBetaTester(member);

        const memberFirstName = member.contactDetails ? member.contactDetails.firstName : "";
        const memberLastName = member.contactDetails ? member.contactDetails.lastName : "";
        await hubEmailSweep(member._id, member.loginEmail, PARENT_ROLE_ID, memberFirstName, memberLastName);

        const profileResults = await wixData.query("ParentProfiles").eq("memberId", member._id).find();

        if (profileResults.items.length > 0) {
            const profile = profileResults.items[0];
            currentParentProfileId = profile._id;
            // Set BEFORE loadDashboard - loadHomeState reads the name off it
            // for the welcome heading, which #customHome now renders.
            currentParentProfile = profile;
            await loadDashboard(currentParentProfileId);
        } else {
            await loadDashboard(null);
        }
    } catch (err) {
        console.error("Parent Hub v2 init failed:", err);
    }

    setTopbar(TAB_TITLES.stateHome.title, TAB_TITLES.stateHome.sub, false);

    safeWire("#customNav", () => {
        $w("#customNav").on("navigate", (event) => {
            const state = event && event.detail && event.detail.state;
            if (state) switchTab(state);
        });
    });

    // Returns to whichever of the 5 main tabs was active before drilling
    // into Registration/Profile/PaymentDetail - not always Home.
    safeWire("#customTopbar", () => {
        $w("#customTopbar").on("back", () => switchTab(currentTab));
    });

    setupHomeWiring();
    setupFixturesWiring();
    setupRegistrationWiring();
    setupProfileWiring();
    setupPaymentsWiring();
    setupMoreWiring();
    await loadProfileDictionaries();

});

// ==========================================
// DASHBOARD (stateHome)
// ==========================================
async function loadDashboard(parentProfileId) {
    homeGeneration++;

    if (!parentProfileId) {
        currentVisibleKids = [];
        // Lookup box opens on its own for a parent with nothing linked, so
        // the element's "Add another child" prompt is suppressed - two ways
        // to open the same box reads as a bug.
        loadHomeState([], NO_KIDS_BANNER, false);
        return;
    }

    try {
        // Fetched server-side, not a direct client wixData.query - same
        // privacy-redaction reasoning as v1 (getKidsForParent).
        const kidsResponse = await getKidsForParent(parentProfileId);
        if (!kidsResponse.success) throw new Error(kidsResponse.error);

        const visibleKids = kidsResponse.data.filter(kid => kid.SP_status !== LEFT_STATUS_ID);
        currentVisibleKids = visibleKids;

        if (visibleKids.length === 0) {
            loadHomeState([], NO_KIDS_BANNER, false);
            return;
        }

        loadPaymentsHub(visibleKids);
        // Not awaited - each custom element renders its own shell immediately
        // and fills in when the data lands, so nothing downstream waits.
        loadMoreState(visibleKids, currentParentProfile);

        const actionRequiredKids = visibleKids.filter(kid =>
            kid.SP_status === INVITED_STATUS_ID ||
            kid.SP_status === RENEWAL_STATUS_ID ||
            kid.SP_status === DRAFT_STATUS_ID ||
            kid.SP_status === ACTION_REQUIRED_ID
        );
        const sentBackCount = actionRequiredKids.filter(kid => kid.SP_status === ACTION_REQUIRED_ID).length;

        let banner = null;
        if (actionRequiredKids.length > 0) {
            banner = sentBackCount > 0
                ? {
                    tone: "critical",
                    message: `⚠️ The club sent ${sentBackCount} registration form(s) back to you for changes — please review and resubmit.`
                }
                : {
                    tone: "warning",
                    message: `⚠️ Action Required: You have ${actionRequiredKids.length} outstanding registration form(s) to complete.`
                };
        }

        loadHomeState(visibleKids, banner, true);

        // After loadHomeState, so homeModel exists for the teaser to attach
        // to. Not awaited - the badge filling in a moment late is fine.
        loadUnreadBadge();
    } catch (err) {
        console.error("Failed to load dashboard data:", err);
        // Don't strand the parent on "Loading…" forever. Only on a FIRST
        // load though - homeModel being null is what says nothing has
        // rendered yet. On a reload (after a save) keep the kids already on
        // screen rather than replacing good data with an error.
        if (!homeModel) {
            loadHomeState([], {
                tone: "critical",
                message: "We couldn't load your children just now. Please refresh the page and try again."
            }, false);
        }
    }
}

// ==========================================
// HOME — one custom element (#customHome)
// ==========================================
// Replaced the native #repeaterKids / #repeaterFixtureTeaser / #boxHomeBanner
// block on 2026-08-16. Find My Child below it is still native - see the
// header of public/custom-elements/parentHubHome.js for why.

const NO_KIDS_BANNER = {
    tone: "warning",
    message: "Welcome! Let's get your first child linked using their Fan Number and date of birth below."
};

// Every write to the element goes through here, so there's one place that
// knows the attribute name and one JSON.stringify.
function pushHome() {
    if (!homeModel || !$w("#customHome").id) return;
    $w("#customHome").setAttribute("data", JSON.stringify(homeModel));
}

function toHomeKid(kid) {
    const view = STATUS_VIEW[kid.SP_status] || STATUS_FALLBACK;

    // The STATUS label is about the CHILD and is true for either parent -
    // "Registration Required" is a fact. The ACTION label is about what THIS
    // viewer can do, and registration is primary-parent only. The native
    // version derived the button label from status alone, so a secondary
    // parent saw "Register Now", tapped it, and landed on Profile. Confusing
    // enough that it fooled Rob while testing 2026-08-16.
    const canRegister = isViewerPrimaryParent(kid) && (
        kid.SP_status === INVITED_STATUS_ID ||
        kid.SP_status === RENEWAL_STATUS_ID ||
        kid.SP_status === DRAFT_STATUS_ID ||
        kid.SP_status === ACTION_REQUIRED_ID);
    const actionLabel = (view.action !== STATUS_FALLBACK.action && !canRegister)
        ? "View Profile"
        : view.action;
    const initials = `${(kid.SP_firstName || "").charAt(0)}${(kid.SP_lastName || "").charAt(0)}`.toUpperCase();
    return {
        id: kid._id,
        name: `${kid.SP_firstName || ""} ${kid.SP_lastName || ""}`.trim() || "Player",
        initials: initials || "?",
        squad: (kid.SP_team && kid.SP_team.T_teamName) ? kid.SP_team.T_teamName : "Squad Unassigned",
        statusLabel: view.label,
        statusTone: view.tone,
        actionLabel,
        // Only once the secretary has saved a fee tier. Starts generic and is
        // replaced below when getGoCardlessStatus resolves - same two-pass
        // approach the native repeater used, just repainting instead of
        // relabelling a button.
        paymentLabel: resolveFeeCategoryId(kid) ? "Set Up Payment" : null
    };
}

// Keeps the Home teaser honest after an answer given on stateFixtures.
// Patches rather than re-running loadFixtureTeasers: we already know what was
// saved, and Wix Data's read-after-write lag means an immediate re-query can
// hand back the pre-write value and undo the very thing we're fixing.
function patchHomeTeaser(fixtureId, playerId, response) {
    if (!homeModel || !Array.isArray(homeModel.teasers)) return;
    const row = homeModel.teasers.find(t => t.fixtureId === fixtureId && t.playerId === playerId);
    if (!row) return;

    if (response === "Accepted") {
        row.rsvpLabel = "Going"; row.rsvpTone = "success"; row.ctaLabel = "Change reply";
    } else if (response === "Declined") {
        row.rsvpLabel = "Can't make it"; row.rsvpTone = "neutral"; row.ctaLabel = "Change reply";
    } else {
        row.rsvpLabel = "Confirmation Required"; row.rsvpTone = "warning"; row.ctaLabel = "Confirm Attendance";
    }
    pushHome();
}

function loadHomeState(visibleKids, banner, canAddChild) {
    if (!$w("#customHome").id) return;

    const gen = homeGeneration;
    const rawName = (currentParentProfile && (currentParentProfile.PP_fullName || currentParentProfile.PP_email)) || "";
    const parentName = rawName ? rawName.charAt(0).toUpperCase() + rawName.slice(1) : "";

    // Any in-flight lookup message is deliberately carried across a reload -
    // "Linked! Loading your children…" is set immediately before the
    // loadDashboard that lands here, and would otherwise vanish instantly.
    const carriedLookup = (homeModel && homeModel.lookup) || {};

    homeModel = {
        parentName,
        subline: visibleKids.length
            ? `Everything for ${joinNames(visibleKids)} in one place`
            : "Let's get your first child linked below.",
        banner: banner || null,
        kids: visibleKids.map(toHomeKid),
        teasers: [],
        canAddChild: !!canAddChild,
        lookup: {
            // Forced open only when there's nothing linked - otherwise the
            // element decides, and remembers across repaints.
            open: !canAddChild && visibleKids.length === 0,
            busy: false,
            linking: false,
            message: carriedLookup.message || "",
            messageTone: carriedLookup.messageTone || "error",
            matchText: "",
            requestSent: !!carriedLookup.requestSent,
            clearInputs: false
        }
    };
    pushHome();

    // Both of the below are slower than the cards and deliberately do NOT
    // hold them back - the parent sees their children immediately and the
    // extra detail fills in. Each checks `gen` first: a lookup from a
    // previous loadDashboard must not patch the current model.

    visibleKids.forEach(kid => {
        const feeCategoryId = resolveFeeCategoryId(kid);
        if (!feeCategoryId) return;
        getGoCardlessStatus(kid._id).then(result => {
            if (gen !== homeGeneration || !homeModel) return;
            const row = homeModel.kids.find(k => k.id === kid._id);
            if (!row) return;
            row.paymentLabel = describePaymentButtonLabel(result, feeCategoryId);
            pushHome();
        }).catch(err => console.error("getGoCardlessStatus error:", err));
    });

    if (visibleKids.length) {
        loadFixtureTeasers(visibleKids).then(teasers => {
            if (gen !== homeGeneration || !homeModel) return;
            homeModel.teasers = teasers;
            pushHome();
        }).catch(err => console.error("Fixture teasers failed:", err));
    }
}

function findVisibleKid(id) {
    if (!id) return null;
    return currentVisibleKids.find(k => k._id === id) || null;
}

// Patches just the lookup slice and repaints. Everything else in the model
// (cards, teasers, banner) is left alone, so a search in flight can't be
// clobbered by - or clobber - a payment status landing at the same moment.
function patchLookup(patch) {
    if (!homeModel) return;
    homeModel.lookup = Object.assign({}, homeModel.lookup, patch);
    // One-shot: if it stayed true, every later repaint would wipe the fields
    // again the moment the parent started retyping.
    pushHome();
    if (homeModel.lookup.clearInputs) homeModel.lookup.clearInputs = false;
}

function clearPendingLink() {
    pendingLinkPlayerId = null;
    pendingLinkFanNumber = null;
    pendingLinkDob = null;
}

function setupHomeWiring() {
    // Must be wired in onReady or later - the element may not have upgraded
    // at module scope. setAttribute is safe early; .on() is not.
    safeWire("#customHome", () => {
        $w("#customHome").on("openPlayer", async (event) => {
            const kid = findVisibleKid(event && event.detail && event.detail.id);
            if (!kid || homeBusy) return;
            homeBusy = true;
            try {
                // Shallow copy, never a reference to the cached record - the
                // submit flow mutates this and it must not leak back.
                activePlayerContext = { ...kid };

                // Registration is PRIMARY PARENT ONLY - it exposes and edits
                // the other parent's personal details, and getKidsForParent
                // redacts those for a secondary viewer, so a secondary parent
                // saving the form would write blanks over the primary's real
                // contact info.
                const needsForm = isViewerPrimaryParent(kid) && (
                    kid.SP_status === INVITED_STATUS_ID ||
                    kid.SP_status === RENEWAL_STATUS_ID ||
                    kid.SP_status === DRAFT_STATUS_ID ||
                    kid.SP_status === ACTION_REQUIRED_ID);

                if (needsForm) {
                    // New invites flip to Draft immediately so the secretary
                    // can see the parent has started. Renewals and Action
                    // Required deliberately STAY put - renewals only leave on
                    // final submit.
                    if (activePlayerContext.SP_status === INVITED_STATUS_ID) {
                        activePlayerContext.SP_status = DRAFT_STATUS_ID;
                        await secureUpdatePlayerRegistration(activePlayerContext, currentParentProfileId);
                    }
                    await loadRegistrationForm(activePlayerContext);
                    $w("#stateboxHub2").changeState("stateRegistration");
                    setTopbar("Registration Form", `${kid.SP_firstName} ${kid.SP_lastName}`, true);
                } else {
                    await loadProfileForm(activePlayerContext);
                    $w("#stateboxHub2").changeState("stateProfile");
                    setTopbar(`${kid.SP_firstName}'s Profile`, "View & update details", true);
                }
            } catch (error) {
                // Everything above is awaited BEFORE changeState, so a throw
                // means the tab never switches and the parent sees a button
                // that simply does nothing. Surface it: an error they can
                // report beats silence they'll assume is their fault.
                console.error("Failed to open state:", error);
                if (homeModel) {
                    homeModel.banner = {
                        tone: "critical",
                        message: `We couldn't open ${kid.SP_firstName}'s form just now. Please refresh and try again — if it keeps happening, let the club know.`
                    };
                    pushHome();
                }
            } finally {
                homeBusy = false;
            }
        });

        $w("#customHome").on("openPayment", (event) => {
            const kid = findVisibleKid(event && event.detail && event.detail.id);
            if (!kid) return;
            activePlayerContext = { ...kid };
            // changeState FIRST, then load - the detail state's elements must
            // be mounted before loadPaymentState writes to them. The other way
            // round races an unawaited async load against the state switch
            // (confirmed live on v1: "mounted but not found in the DOM").
            $w("#stateboxHub2").changeState("statePaymentDetail");
            setTopbar(`${kid.SP_firstName}'s Payment Plan`, "Direct Debit via GoCardless", true);
            loadPaymentState(activePlayerContext);
        });

        $w("#customHome").on("openFixtures", () => switchTab("stateFixtures"));
        $w("#customHome").on("openMessages", () => switchTab("stateMessages"));

        // The element opens its own panel and hides its own prompt - this
        // only clears any message left over from a previous attempt.
        $w("#customHome").on("addChild", () => {
            patchLookup({ message: "", matchText: "" });
        });

        // ---- FIND MY CHILD ----------------------------------------------
        // Same two-step flow as v1: preview lookup, then a SEPARATE confirm
        // step. Nothing is linked until Confirm is tapped.

        $w("#customHome").on("lookupChild", async (event) => {
            const detail = (event && event.detail) || {};
            const fanNumber = detail.fanNumber;
            // Already a local "YYYY-MM-DD" string from <input type="date">,
            // which is exactly what the backend takes. The native path had
            // to hand-format a Date to dodge toISOString()'s timezone shift;
            // that whole hazard is gone.
            const dob = detail.dob;
            if (!fanNumber || !dob) return;

            patchLookup({ busy: true, message: "", matchText: "" });
            try {
                const result = await findPlayerByFanNumberAndDob(fanNumber, dob, PARENT_ROLE_ID);

                if (result.success && result.alreadyLinked) {
                    clearPendingLink();
                    patchLookup({
                        busy: false,
                        matchText: "",
                        message: "This player is already linked to your account.",
                        messageTone: "error"
                    });
                    await loadDashboard(currentParentProfileId);
                } else if (result.success && result.player) {
                    pendingLinkPlayerId = result.player._id;
                    pendingLinkFanNumber = fanNumber;
                    pendingLinkDob = dob;
                    patchLookup({
                        busy: false,
                        message: "",
                        matchText: `We found a player called ${result.player.name} (Fan No. ${result.player.fanNumber}). If this is your child, tap Confirm to link them to your account.`
                    });
                } else {
                    clearPendingLink();
                    patchLookup({
                        busy: false,
                        matchText: "",
                        message: result.error || "Something went wrong - please try again.",
                        messageTone: "error"
                    });
                }
            } catch (err) {
                console.error("Find My Child lookup failed:", err);
                clearPendingLink();
                patchLookup({
                    busy: false,
                    matchText: "",
                    message: "Something went wrong - please try again.",
                    messageTone: "error"
                });
            }
        });

        $w("#customHome").on("confirmLink", async () => {
            if (!pendingLinkPlayerId) return;
            patchLookup({ linking: true, message: "" });
            try {
                const result = await confirmPlayerLink(
                    pendingLinkPlayerId, pendingLinkFanNumber, pendingLinkDob, PARENT_ROLE_ID);

                if (result.success) {
                    clearPendingLink();
                    // clearInputs wipes the fan/dob fields - the only point
                    // at which the element is allowed to touch what was
                    // typed, because the flow is finished.
                    patchLookup({
                        linking: false, matchText: "", clearInputs: true,
                        message: "Linked! Loading your children…", messageTone: "ok"
                    });
                    await loadDashboard(currentParentProfileId);
                } else {
                    patchLookup({
                        linking: false,
                        message: result.error || "Something went wrong - please try again.",
                        messageTone: "error"
                    });
                }
            } catch (err) {
                console.error("Confirm link failed:", err);
                patchLookup({
                    linking: false,
                    message: "Something went wrong - please try again.",
                    messageTone: "error"
                });
            }
        });

        $w("#customHome").on("cancelLink", () => {
            clearPendingLink();
            patchLookup({ matchText: "", message: "" });
        });

        // CAN'T FIND MY CHILD - no backend queue exists yet (see the
        // project_secretary_link_queue memory), so this only confirms in the
        // UI. Swap in a real submitPlayerLinkRequest() once the Secretary /
        // Player Admin side is built; the payload it needs is already here.
        $w("#customHome").on("submitLinkRequest", (event) => {
            const detail = (event && event.detail) || {};
            console.log("Link request (not yet sent - no backend queue):", detail);
            patchLookup({ requestSent: true });
        });
    });
}

function joinNames(kids) {
    const names = kids.map(k => k.SP_firstName).filter(Boolean);
    if (names.length === 0) return "your children";
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} & ${names[1]}`;
    return `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
}

// One "next up" teaser card per child, not one global card - a static single
// card would silently bury a second kid's upcoming fixture if it's later
// than the first kid's. Doesn't try to guess "which side is us" from
// homeTeam/awayTeam text matching (fragile if a name doesn't match exactly)
// - just shows both team names plainly, the parent already knows their own
// kid's team.
// The Home teaser only shows fixtures in the CURRENT week (Mon-Sun) - it's
// a "what's on this week" glance, not a rolling look-ahead. Anything further
// out lives on stateFixtures, which is NOT limited by this.
function currentWeekBounds() {
    const monday = new Date();
    monday.setHours(0, 0, 0, 0);
    // getDay(): 0=Sun, 1=Mon ... 6=Sat. Sunday counts as the END of the
    // current week here, not the start of the next one.
    const day = monday.getDay();
    monday.setDate(monday.getDate() + (day === 0 ? -6 : 1 - day));

    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return { monday, sunday };
}

// `date_only` is Wix's date-only field type, which returns a plain
// "YYYY-MM-DD" string (unlike "Date and Time", which returns a real Date) -
// this is correct/expected, not a misconfigured field. Normalises either
// shape to a Date so comparisons and sorting work.
function toEventDate(value) {
    if (!value) return null;
    const d = (value instanceof Date) ? value : new Date(value);
    return isNaN(d.getTime()) ? null : d;
}

// Returns the teaser rows for #customHome rather than driving a repeater.
// Resolves to [] rather than throwing on a bad lookup - a missing fixture
// must not take the whole Home tab down with it.
async function loadFixtureTeasers(visibleKids) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { sunday } = currentWeekBounds();

    // One query per kid, but run in PARALLEL - these were sequential awaits
    // in a for-loop, so every extra child added a whole round-trip before any
    // teaser appeared.
    const kidsWithTeams = visibleKids.filter(kid =>
        !!(kid.SP_team && (typeof kid.SP_team === 'string' ? kid.SP_team : kid.SP_team._id))
    );

    const perKid = await Promise.all(kidsWithTeams.map(async (kid) => {
        const teamId = typeof kid.SP_team === 'string' ? kid.SP_team : kid.SP_team._id;
        try {
            // Date filtering deliberately happens in JS below, NOT via
            // .ge("date_only", ...) in the query - date_only comes back as a
            // plain string ("2026-08-15"), and comparing a string-typed field
            // against a JS Date in a wixData query silently matches nothing.
            // toEventDate() handles both shapes so this keeps working if the
            // field type is ever switched to a real Date.
            const results = await wixData.query("fixtures")
                .eq("club_team", teamId)
                .limit(50)
                .find();

            const upcoming = results.items
                .filter(f => {
                    const d = toEventDate(f.date_only);
                    // Lower bound is today, not Monday - a fixture earlier
                    // this week has already happened, no point teasing it.
                    return d && d >= today && d <= sunday;
                })
                // .getTime() rather than subtracting the Dates directly -
                // Date arithmetic trips the editor's type checker.
                .sort((a, b) => toEventDate(a.date_only).getTime() - toEventDate(b.date_only).getTime());

            // Playing Only fixtures are hidden from training-only kids - see
            // the visibility rule in docs/fixtures.md.
            const visibleFixtures = upcoming.filter(f =>
                f.audience === "All" || (f.audience === "Playing Only" && kid.SP_trainingOnly !== true)
            );

            if (visibleFixtures.length === 0) return null;

            return {
                _id: `${kid._id}-${visibleFixtures[0]._id}`,
                kidId: kid._id,
                kidFirstName: kid.SP_firstName,
                fixture: visibleFixtures[0]
            };
        } catch (err) {
            console.error(`Failed to load fixtures for ${kid.SP_firstName}:`, err);
            return null;
        }
    }));

    const rows = perKid.filter(Boolean);
    if (rows.length === 0) return [];

    // One query for every teaser's answer. The teaser is current-week only,
    // so this is a handful of rows however many children are linked.
    let responses = [];
    try {
        const resRes = await wixData.query("FixtureResponses")
            .hasSome("fixtureReference", rows.map(r => r.fixture._id))
            .hasSome("playerReference", rows.map(r => r.kidId))
            .limit(100)
            .find();
        responses = resRes.items;
    } catch (err) {
        // Everything falls back to "needs an answer", which is the safe way
        // round: it nags someone who already replied rather than quietly
        // telling someone who hasn't that they're done.
        console.error("[teasers] FixtureResponses unavailable:", err.message);
    }

    const refId = (v) => !v ? "" : (typeof v === "string" ? v : (v._id || ""));
    const answerFor = (fixtureId, playerId) => {
        const row = responses.find(r =>
            refId(r.fixtureReference) === fixtureId && refId(r.playerReference) === playerId);
        return row ? row.response : "Pending";
    };

    return rows.map(item => {
        const f = item.fixture;

        const title = (f.homeTeam && f.awayTeam)
            ? `Next up for ${item.kidFirstName}: ${f.homeTeam} vs ${f.awayTeam}`
            : `Next up for ${item.kidFirstName}: ${f.eventType || "Event"}`;

        const eventDate = toEventDate(f.date_only);
        const dateStr = eventDate
            ? eventDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
            : "";
        const timeStr = f.startTime ? ` · ${f.startTime}` : "";
        // venue is an ADDRESS-type field - .formatted holds the display
        // string, but fall back to the raw value in case it was saved as
        // plain text before the field type was switched.
        let venueStr = "";
        if (f.venue) {
            const venueLabel = (typeof f.venue === "string") ? f.venue : f.venue.formatted;
            if (venueLabel) venueStr = ` · ${venueLabel}`;
        }

        // An answered fixture still shows - the teaser is "what's on this
        // week", not a to-do list - but it stops asking, and the button
        // becomes a way back in rather than a demand.
        const answer = answerFor(f._id, item.kidId);
        const rsvp = answer === "Accepted"
            ? { rsvpLabel: "Going", rsvpTone: "success", ctaLabel: "Change reply" }
            : answer === "Declined"
                ? { rsvpLabel: "Can't make it", rsvpTone: "neutral", ctaLabel: "Change reply" }
                : { rsvpLabel: "Confirmation Required", rsvpTone: "warning", ctaLabel: "Confirm Attendance" };

        return Object.assign({
            id: item._id,
            title,
            meta: `${dateStr}${timeStr}${venueStr}`,
            // Carried so answering on stateFixtures can patch this row
            // directly instead of re-querying - see setupFixturesWiring.
            fixtureId: f._id,
            playerId: item.kidId
        }, rsvp);
    });
}


// Prefers the server-set flag from getKidsForParent (one authoritative
// answer, decided backend-side) and only falls back to comparing ids for
// safety. A player with no primaryParentId at all resolves to false -
// nobody gets primary rights on an unassigned record.
function isViewerPrimaryParent(player) {
    if (typeof player.viewerIsPrimaryParent === "boolean") return player.viewerIsPrimaryParent;
    const primaryId = player.primaryParentId ? (player.primaryParentId._id || player.primaryParentId) : "";
    return !!primaryId && primaryId === currentParentProfileId;
}

// Shared with v1's exact reasoning - GoCardless doesn't need a pre-existing
// "plan" object to check for, any assigned fee category is enough.
function resolveFeeCategoryId(player) {
    const cat = player.sp_fee_category;
    const feeCategoryId = cat && typeof cat === "object" ? cat._id : cat;
    return (player.sp_paymentschedulesentdate && feeCategoryId) ? feeCategoryId : null;
}

function describePaymentButtonLabel(result, currentFeeCategoryId) {
    if (!result.success || !result.found) return "Set Up Payment";
    if (result.status === "CANCELED" || result.status === "ENDED") return "Set Up Payment";
    if (result.status === "PENDING") return "Payment Setup In Progress...";
    if (result.lastPaymentStatus === "FAILED") return "⚠️ Payment Failed - Fix";
    if (result.status === "ACTIVE" && currentFeeCategoryId && result.feeCategoryId && result.feeCategoryId !== currentFeeCategoryId) {
        return "⚠️ Plan Changed - See Details";
    }
    return "Payment ✓ (Manage)";
}

// ==========================================
// REGISTRATION — one custom element (#customRegistration)
// ==========================================
// Replaced ~60 native elements on 2026-08-16. The element owns every input
// value, step navigation, the progress %, the green step ticks, required-field
// highlighting and the 100% submit gate - it holds all the values, so none of
// that needs a round trip. Page code below does persistence only.
//
// Gone with the natives: requiredFieldsForStep, isFieldFilled, isStepComplete,
// goToStep, refreshStepPills, calculateProgress, clearFieldHighlight,
// validateRequiredFields, mapUItoPlayer's $w reads, handleFileUploads,
// applyEmergencySource and the consent radio mirrors. See
// public/custom-elements/parentHubRegistration.js.

// Dropdown options the element renders as <select>s. Same ClubDictionary
// query as before - the CMS lookup never enters the element, it just receives
// the finished {label, value} arrays.
let registrationOptions = null;

async function loadRegistrationOptions() {
    if (registrationOptions) return registrationOptions;

    const options = {};
    try {
        const dictResults = await wixData.query("ClubDictionary").limit(1000).find();
        const items = dictResults.items;
        const build = (categoryName) =>
            items.filter(item => item.category === categoryName)
                .map(item => ({ label: item.title || item.label, value: item._id }));

        options.gender = build("gender");
        options.relationship = build("relationship");
        options.shirt_size = build("shirt_size");
        options.shorts_size = build("shorts_size");
        options.coat_size = build("coat_size");
        options.hoodie_size = build("hoodie_size");
        options.sock_size = build("sock_size");
    } catch (err) {
        console.error("Failed to load dictionary:", err);
    }

    try {
        const teamsResults = await wixData.query("Teams").ascending("T_teamName").limit(1000).find();
        options.teams = teamsResults.items.map(t => ({ label: t.T_teamName, value: t._id }));
    } catch (err) {
        console.error("Failed to load teams for sibling dropdown:", err);
        options.teams = [];
    }

    registrationOptions = options;
    return options;
}

// What the element is currently showing. Held so a save result or an upload
// reply can patch one field and repaint, rather than rebuilding the payload.
let registrationModel = null;

function pushRegistration() {
    if (!registrationModel || !$w("#customRegistration").id) return;
    $w("#customRegistration").setAttribute("data", JSON.stringify(registrationModel));
}

// SP_dob and the parent DOBs are date-only fields, which come back as plain
// "YYYY-MM-DD" strings - exactly what <input type="date"> wants. Anything
// stored as a real Date gets formatted from LOCAL parts, never toISOString(),
// which would shift the date across the timezone boundary.
// mainAddress / sp_parent_address / sp_secparent_address are ADDRESS-type
// fields, so they come back as OBJECTS when entered through the CMS picker
// and as plain STRINGS when written by this form. Both shapes are in the
// data. Assigning the object straight to an input renders "[object Object]" -
// which v1 has always done too (Parent Hub.js:846), it just went unnoticed
// because most records were last written by the form, as strings.
//
// Same logic as fmtAddr in exportCsv.jsw and fmtAddress in Player Record.js.
// Three copies now; backend can't import from public/, so a shared module
// would only unify the two frontend ones. Worth doing if a fourth appears.
// Literally the characters "[object Object]", stored in the CMS by v1's
// read/write loop: it assigned the ADDRESS object straight to a text input
// (Parent Hub.js:846), the input coerced it to that string, and the next save
// wrote the string back (Parent Hub.js:1231). The structured address was
// overwritten and is not recoverable from the field. Treat it as empty so the
// parent gets a blank box to fill rather than garbage they'd save again.
const CORRUPT_ADDRESS = "[object Object]";

// Only an object with a formatted string counts as structured. A plain string -
// hand-typed, or flattened by v1 - is text we can display but can't vouch for.
function structuredAddress(addr) {
    if (!addr || typeof addr !== "object") return null;
    const formatted = formatAddress(addr);
    if (!formatted) return null;
    return {
        formatted,
        line1: addr.line1 || (addr.streetAddress
            ? [addr.streetAddress.number, addr.streetAddress.name].filter(Boolean).join(" ")
            : ""),
        line2: addr.line2 || "",
        city: addr.city || "",
        subdivision: addr.subdivision || "",
        postalCode: addr.postalCode || "",
        country: addr.country || "GB"
    };
}

function formatAddress(addr) {
    if (!addr) return "";
    if (typeof addr === "string") return addr.trim() === CORRUPT_ADDRESS ? "" : addr;
    if (addr.formatted) {
        return String(addr.formatted).trim() === CORRUPT_ADDRESS ? "" : addr.formatted;
    }
    const parts = [];
    if (addr.streetAddress) parts.push([addr.streetAddress.number, addr.streetAddress.name].filter(Boolean).join(" "));
    if (addr.city) parts.push(addr.city);
    if (addr.subdivision) parts.push(addr.subdivision);
    if (addr.postalCode) parts.push(addr.postalCode);
    return parts.filter(Boolean).join(", ");
}

function toDateInput(value) {
    if (!value) return "";
    if (typeof value === "string") return value.slice(0, 10);
    const d = new Date(value);
    if (isNaN(d.getTime())) return "";
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function loadRegistrationForm(player) {
    if (!$w("#customRegistration").id) return;

    $w("#customRegistration").setAttribute("data", JSON.stringify({ loading: true }));
    const options = await loadRegistrationOptions();

    let managerName = "";
    const teamId = player.SP_team ? (typeof player.SP_team === "string" ? player.SP_team : player.SP_team._id) : null;
    if (teamId) {
        try {
            const manager = await getTeamManager(teamId);
            if (manager && manager.fullName) managerName = manager.fullName;
        } catch (err) {
            console.error("Manager lookup failed:", err);
        }
    }

    registrationModel = {
        options,
        saveState: "idle",
        saveMessage: "",
        uploads: {},
        player: {
            // id is what triggers prefill in the element. Same id on a repaint
            // means "leave what's typed alone".
            id: player._id,
            fullName: `${player.SP_firstName || ""} ${player.SP_lastName || ""}`.trim(),
            fanNumber: player.SP_fanNumber ? String(player.SP_fanNumber) : "",
            membershipNo: player.sp_membership_no || "",
            teamName: (player.SP_team && player.SP_team.T_teamName) ? player.SP_team.T_teamName : "Squad Unassigned",
            managerName,
            // Only shown when the secretary actually sent the form back.
            returnNote: player.SP_status === ACTION_REQUIRED_ID ? (player.sp_return_note || "") : "",

            dob: toDateInput(player.SP_dob),
            gender: player.sp_gender || "",
            initials: player.SP_initials || "",
            trainingOnly: player.SP_trainingOnly === true,

            parentName: player.parentsName || "",
            parentMobile: player.parentPhone || "",
            parentEmail: player.parentEmail || "",
            parentRelation: player.SP_relationship || "",
            parentDob: toDateInput(player.sp_parent_dob),
            address: formatAddress(player.mainAddress),
            addressStructured: structuredAddress(player.mainAddress),
            parentAddress: formatAddress(player.sp_parent_address),
            parentAddressStructured: structuredAddress(player.sp_parent_address),

            // No CMS boolean for this - it's derived from whether the
            // secondaryParent* columns hold anything.
            hasSecondParent: !!(player.secondaryParentName || player.secondaryParentEmail),
            secName: player.secondaryParentName || "",
            secMobile: player.secondaryParentMobile || "",
            secEmail: player.secondaryParentEmail || "",
            secRelation: player.secondaryParentRelation || "",
            secDob: toDateInput(player.sp_secparent_dob),
            secAddress: formatAddress(player.sp_secparent_address),
            secAddressStructured: structuredAddress(player.sp_secparent_address),

            bothParents: player.livesWithBothParents === true,
            hasSibling: player.sp_has_sibling === true,
            siblingTeam: player.sp_sibling_team || "",

            emergSource: player.sp_emerg_source || EMERG_SOURCE_NEW,
            emergName: player.SP_emergContactName || "",
            emergMobile: player.SP_emergContactNumber || "",
            emergRelation: player.SP_emergContactRelationship || "",

            hasMedical: player.SP_hasMedical === true,
            medicalInfo: player.SP_medicalInfo || "",
            shirt: player.SP_shirtSize || "",
            shorts: player.SP_shortSize || "",
            coat: player.SP_coatSize || "",
            hoodie: player.SP_hoodieSize || "",
            socks: player.SP_socksize || "",

            headshotUrl: player.SP_idPhoto || "",
            idDocUrl: player.SP_idDocument || "",

            // Tri-state, straight through - null means never answered.
            consentPhoto: player.sp_consent_photo,
            consentSocial: player.socialMedia,
            consentFa: player.sp_consent_fa,
            consentMedical: player.sp_consent_medical,

            conductParent: player.registrationConductParent === true,
            conductPlayer: player.registrationConductPlayer === true,
            confirmCorrect: player.registrationConfirmCorrect === true,
            signature: player.registrationPrintNameSignature || ""
        }
    };

    pushRegistration();
}

// Writes an address field. A picked address goes in as a structured OBJECT -
// that's the whole point of the lookup, and it makes the ADDRESS column honest
// for the first time. A hand-typed one goes in as text, which every reader
// already handles.
//
// Either way, nothing is written when the value matches what was loaded: an
// untouched address must survive a save it wasn't part of. That's what stopped
// the Next-button autosave flattening three addresses on 2026-08-16.
function writeAddress(playerData, key, text, structured) {
    const current = formatAddress(playerData[key]);
    const incoming = structured && structured.formatted ? structured.formatted : (text || "");
    if (incoming === current) return;
    playerData[key] = (structured && structured.formatted) ? structured : text;
}

// Strings that can only ever be a bug - no parent types these. Writing one
// means a shape mismatch somewhere upstream has stringified an object, a
// missing value or a bad number, and it is about to overwrite a good CMS
// value with garbage.
const GARBAGE_VALUES = new Set([
    "[object Object]", "[object Undefined]", "[object Null]",
    "undefined", "null", "NaN"
]);

function isGarbageValue(value) {
    return typeof value === "string" && GARBAGE_VALUES.has(value.trim());
}

// Maps the element's flat payload onto the CMS record. Same field mapping as
// the old mapUItoPlayer, reading from the event detail instead of ~40 $w calls.
//
// ⚠️ THIS FUNCTION WRITES EVERY FIELD ON EVERY SAVE, touched or not. That's
// fine while every read is correct - you write back what you read - but it
// makes any read-side bug into silent data loss, and the Next-button autosave
// removes the human moment where someone might have noticed. It destroyed
// three ADDRESS fields on 2026-08-16 exactly this way.
//
// It matters most at RENEWAL: the form loads last season's details as the
// starting point, so a field nobody edited still gets rewritten every year.
// One bad read compounds annually. Hence the sweep at the bottom.
function mapFormToPlayer(playerData, form) {
    // Snapshot BEFORE any assignment, so the sweep can put originals back
    // rather than merely skipping a bad write.
    const before = Object.assign({}, playerData);
    if (form.dob) playerData.SP_dob = form.dob;

    // ADDRESS fields, written back as plain strings - which is what v1 has
    // always done and what every reader already tolerates (fmtAddr /
    // fmtAddress both branch on typeof).
    //
    // But writing a string FLATTENS a structured address: a postcode-looked-up
    // entry the secretary made in the CMS loses its city/postcode/coordinates
    // the first time a parent saves this form, even without touching the
    // field. So only write when the parent has ACTUALLY changed it - compare
    // against the same formatted string they were shown. Untouched structured
    // addresses then survive untouched.
    writeAddress(playerData, "mainAddress", form.address, form.addressStructured);
    playerData.parentPhone = form.parentMobile;
    // Only write when non-empty, so a parent leaving the (editable-because-
    // blank) email field alone doesn't wipe anything.
    if (form.parentEmail) playerData.parentEmail = form.parentEmail;

    playerData.SP_initials = form.initials;
    playerData.SP_emergContactName = form.emergName;
    playerData.SP_emergContactNumber = form.emergMobile;
    playerData.SP_emergContactRelationship = form.emergRelation;
    playerData.sp_emerg_source = form.emergSource || EMERG_SOURCE_NEW;

    playerData.SP_shirtSize = form.shirt;
    playerData.SP_shortSize = form.shorts;
    playerData.SP_coatSize = form.coat;
    playerData.SP_hoodieSize = form.hoodie;
    playerData.SP_socksize = form.socks;
    playerData.SP_relationship = form.parentRelation;
    playerData.sp_gender = form.gender;

    if (form.parentDob) playerData.sp_parent_dob = form.parentDob;
    writeAddress(playerData, "sp_parent_address", form.parentAddress, form.parentAddressStructured);

    // sp_membership_no is deliberately never set here - server-generated.

    // Consent writes only when actually answered. A Save Draft before the
    // parent has opened the Lightbox must not silently record "No".
    if (form.consentPhoto !== null && form.consentPhoto !== undefined) playerData.sp_consent_photo = form.consentPhoto;
    if (form.consentSocial !== null && form.consentSocial !== undefined) playerData.socialMedia = form.consentSocial;
    if (form.consentFa !== null && form.consentFa !== undefined) playerData.sp_consent_fa = form.consentFa;
    if (form.consentMedical !== null && form.consentMedical !== undefined) playerData.sp_consent_medical = form.consentMedical;

    playerData.livesWithBothParents = form.bothParents === true;
    playerData.SP_trainingOnly = form.trainingOnly === true;

    playerData.sp_has_sibling = form.hasSibling === true;
    playerData.sp_sibling_team = playerData.sp_has_sibling ? form.siblingTeam : null;

    playerData.SP_hasMedical = form.hasMedical === true;
    playerData.SP_medicalInfo = playerData.SP_hasMedical ? form.medicalInfo : null;

    if (form.hasSecondParent === true) {
        playerData.secondaryParentName = form.secName;
        playerData.secondaryParentMobile = form.secMobile;
        playerData.secondaryParentEmail = form.secEmail;
        playerData.secondaryParentRelation = form.secRelation;
        if (form.secDob) playerData.sp_secparent_dob = form.secDob;
        writeAddress(playerData, "sp_secparent_address", form.secAddress, form.secAddressStructured);
    } else {
        playerData.secondaryParentName = null;
        playerData.secondaryParentMobile = null;
        playerData.secondaryParentEmail = null;
        playerData.secondaryParentRelation = null;
        playerData.sp_secparent_dob = null;
        playerData.sp_secparent_address = null;
    }

    // Uploads already happened when the file was chosen - these are the URLs
    // the element is holding, so there's nothing left to do at save time.
    if (form.headshotUrl) playerData.SP_idPhoto = form.headshotUrl;
    if (form.idDocUrl) playerData.SP_idDocument = form.idDocUrl;

    playerData.registrationConductParent = form.conductParent;
    playerData.registrationConductPlayer = form.conductPlayer;
    playerData.registrationConfirmCorrect = form.confirmCorrect;
    playerData.registrationPrintNameSignature = form.signature;
    playerData.registrationProgress = form.progress || 0;

    // Last line of defence. Any field that came out of the mapping as a
    // garbage sentinel is restored to what was loaded, and shouted about.
    // Deliberately a sweep over the whole record rather than a check per
    // field: it covers fields added later without anyone remembering to
    // guard them, which is the failure mode that actually happens.
    Object.keys(playerData).forEach(key => {
        if (!isGarbageValue(playerData[key])) return;
        console.error(
            `mapFormToPlayer: REFUSED to write ${key} = "${playerData[key]}". ` +
            `This is a bug upstream - something stringified a non-string. ` +
            `The previously stored value has been kept.`,
            { restored: before[key] }
        );
        playerData[key] = before[key];
    });

    return playerData;
}

function setRegistrationSaveState(state, message) {
    if (!registrationModel) return;
    registrationModel.saveState = state;
    registrationModel.saveMessage = message || "";
    pushRegistration();
}

function setupRegistrationWiring() {
    safeWire("#customRegistration", () => {
        // ---- Save Draft, and the Next-button autosave ----
        $w("#customRegistration").on("saveDraft", async (event) => {
            const form = (event && event.detail) || {};
            if (!activePlayerContext) return;

            // detail.auto means it came from Next, not the button. Quieter
            // messaging, and it must never look like it blocked navigation.
            const auto = form.auto === true;
            setRegistrationSaveState("saving", auto ? "Saving…" : "");

            try {
                const playerToUpdate = mapFormToPlayer(activePlayerContext, form);
                const result = await secureUpdatePlayerRegistration(playerToUpdate, currentParentProfileId);

                if (result && result.success) {
                    setRegistrationSaveState("saved", auto ? "Progress saved" : "Draft saved ✓");
                    // Clear the message after a moment so it doesn't sit there
                    // implying the form is still mid-save.
                    setTimeout(() => {
                        if (registrationModel && registrationModel.saveState === "saved") {
                            setRegistrationSaveState("idle", "");
                        }
                    }, 2500);
                } else {
                    console.error("Save draft failed:", result && result.error);
                    setRegistrationSaveState("error", "Couldn't save — please try again.");
                }
            } catch (err) {
                console.error("Save draft error:", err);
                setRegistrationSaveState("error", "Couldn't save — please try again.");
            }
        });

        // ---- Final submit ----
        // The element only fires this at 100% with the confirmation ticked and
        // signed, so there's no validation left to repeat here.
        $w("#customRegistration").on("submitForm", async (event) => {
            const form = (event && event.detail) || {};
            if (!activePlayerContext) return;

            setRegistrationSaveState("submitting", "");
            try {
                const playerToUpdate = mapFormToPlayer(activePlayerContext, form);
                playerToUpdate.SP_status = READY_FOR_FA_ID;

                const result = await secureUpdatePlayerRegistration(playerToUpdate, currentParentProfileId);

                if (result && result.success) {
                    setRegistrationSaveState("saved", "Submitted ✓ — the club will review it shortly.");
                    activePlayerContext.SP_status = READY_FOR_FA_ID;
                    // Back to Home so they see the status change land, rather
                    // than sitting on a form that's no longer editable.
                    setTimeout(async () => {
                        await loadDashboard(currentParentProfileId);
                        switchTab("stateHome");
                    }, 1500);
                } else {
                    console.error("Submit failed:", result && result.error);
                    setRegistrationSaveState("error", "Couldn't submit — please try again.");
                }
            } catch (err) {
                console.error("Submit error:", err);
                setRegistrationSaveState("error", "Couldn't submit — please try again.");
            }
        });

        // ---- Uploads ----
        // Fire on file selection, not at submit, so a failure never costs the
        // whole submission attempt. The element has already shrunk images.
        $w("#customRegistration").on("uploadFile", async (event) => {
            const detail = (event && event.detail) || {};
            const field = detail.field;
            if (!field || !registrationModel) return;

            try {
                const result = await uploadRegistrationFile(detail.base64, detail.fileName, detail.mimeType);

                registrationModel.uploads = registrationModel.uploads || {};
                if (result && result.success) {
                    registrationModel.uploads[field] = { state: "ok", url: result.fileUrl };
                    // Persist immediately. A parent who uploads and then closes
                    // the tab should not have to do it again.
                    if (activePlayerContext) {
                        if (field === "headshot") activePlayerContext.SP_idPhoto = result.fileUrl;
                        else activePlayerContext.SP_idDocument = result.fileUrl;
                        secureUpdatePlayerRegistration(activePlayerContext, currentParentProfileId)
                            .catch(err => console.error("Upload persist failed:", err));
                    }
                } else {
                    registrationModel.uploads[field] = {
                        state: "error",
                        error: (result && result.error) || "Upload failed."
                    };
                }
                pushRegistration();
            } catch (err) {
                console.error("Upload call failed:", err);
                registrationModel.uploads = registrationModel.uploads || {};
                registrationModel.uploads[field] = { state: "error", error: "Upload failed — please try again." };
                pushRegistration();
            }
        });

        // ---- Address lookup ----
        // ONE Lightbox ("AddressLookup") serves every address field in the
        // whole site - the three here, Profile's, and Manager Hub's. It takes
        // an optional current value and hands back an address; which field it
        // belongs to is tracked HERE, by the caller, so the Lightbox itself
        // stays completely caller-agnostic. Exactly how ConsentRegistration
        // already works across four callers.
        //
        // Why a Lightbox rather than inline: Wix's native Address Input has
        // Google Places autocomplete included, and a custom element can't
        // contain a native element (Velo can't position elements at runtime).
        // A Lightbox is an overlay page, not something laid out inside the
        // state, so it costs nothing per breakpoint. The free inline
        // alternative (OpenStreetMap) has no house-level UK data - postcode
        // centroids and street names only - and house-level data is licensed,
        // so every provider that has it charges.
        $w("#customRegistration").on("openAddressLookup", async (event) => {
            const detail = (event && event.detail) || {};
            const field = detail.field;
            if (!field || !registrationModel) return;

            try {
                const result = await wixWindow.openLightbox("AddressLookup", {
                    current: detail.current || null
                });
                if (!result || !result.address) return;

                registrationModel.addressResult = { field, address: result.address };
                pushRegistration();
            } catch (err) {
                console.error("Address lookup lightbox failed:", err);
            }
        });

        // ---- Consent Lightbox ----
        // Stays a Wix Lightbox: it's an overlay, not part of this state's
        // layout, so it costs nothing per-breakpoint - and the same one is
        // opened from stateProfile and both v1 flows. Inlining the wording
        // would make a fifth copy free to drift.
        $w("#customRegistration").on("openConsent", async (event) => {
            const current = (event && event.detail) || {};
            try {
                const result = await wixWindow.openLightbox("ConsentRegistration", {
                    photo: current.photo,
                    social: current.social,
                    fa: current.fa,
                    medical: current.medical
                });
                if (!result || !registrationModel) return;

                registrationModel.consent = {
                    photo: result.photo,
                    social: result.social,
                    fa: result.fa,
                    medical: result.medical
                };
                pushRegistration();
            } catch (err) {
                console.error("Consent lightbox failed:", err);
            }
        });
    });
}


// isYesValue / setYesNoRadio and the STEP_PILL_* colours were deleted with the
// Profile conversion (2026-08-16) - they existed only for native radio groups
// and tab pills, and every remaining state renders its own. Both custom
// elements use real radio inputs, where "checked" is unambiguous and there's
// no option-value convention to guess at.

// ==========================================
// MORE — my details, contacts, account
// ==========================================
// One custom element (#customMore, <parent-hub-more>). The native repeater
// version this replaced was deleted 2026-08-16 after the A/B; see
// public/custom-elements/parentHubMore.js.
//
// The element is isolated from $w, so everything it shows goes IN as one JSON
// attribute and both the save and the logout come BACK as events.
async function loadMoreState(visibleKids, profile) {
    if (!$w("#customMore").id) return;

    const me = profile ? {
        name: profile.PP_fullName || "",
        phone: profile.PP_phoneNumber || "",
        email: profile.PP_email || ""
    } : { name: "", phone: "", email: "" };

    // One row per DISTINCT team - two kids in the same squad shouldn't list
    // the same manager twice.
    const seen = new Set();
    const teams = [];
    visibleKids.forEach(kid => {
        if (!kid.SP_team) return;
        const teamId = typeof kid.SP_team === "string" ? kid.SP_team : kid.SP_team._id;
        if (!teamId || seen.has(teamId)) return;
        seen.add(teamId);
        teams.push({
            _id: teamId,
            teamName: (kid.SP_team && kid.SP_team.T_teamName) ? kid.SP_team.T_teamName : "Squad Unassigned"
        });
    });

    // The deleted repeater version fired one getTeamManager per row as it
    // rendered. There's no repeater here, so the whole payload has to be
    // assembled up front - hence Promise.all rather than fire-and-forget.
    let teamContacts = [];
    let officials = [];
    try {
        const [managers, clubOfficials] = await Promise.all([
            Promise.all(teams.map(t => getTeamManager(t._id).catch(() => null))),
            getClubOfficials().catch(() => [])
        ]);

        teamContacts = teams.map((t, i) => {
            const m = managers[i];
            return {
                teamName: t.teamName,
                managerName: (m && m.fullName) ? `${m.fullName} — Team Manager` : "Manager TBC",
                managerPhone: (m && m.mobile) ? m.mobile : "",
                managerEmail: (m && m.emailAddress) ? m.emailAddress : ""
            };
        });

        officials = Array.isArray(clubOfficials) ? clubOfficials : [];
    } catch (err) {
        console.error("loadMoreState: contact lookup failed", err);
    }

    // One setAttribute for all of it - no partial-update ordering to get wrong.
    $w("#customMore").setAttribute("data", JSON.stringify({ me, teamContacts, officials }));
}

function setupMoreWiring() {
    // Log Out and Visit Our Website moved INSIDE the element on 2026-08-16 -
    // keeping them native meant repositioning two buttons in the mobile
    // editor every time the layout moved. See the header of parentHubMore.js
    // for the risk that was accepted.
    //
    // This stays purely as a backstop: if a native #btnLogout2 is still on
    // the page it keeps working, and safeWire no-ops once it's deleted. It
    // costs nothing to leave in and is the only cover for the element's
    // source file failing to load at all.
    const doLogout = async () => {
        try {
            await authentication.logout();
            wixLocationFrontend.to("/");
        } catch (err) {
            console.error("Logout failed:", err);
        }
    };
    safeWire("#btnLogout2", () => $w("#btnLogout2").onClick(doLogout));

    // Must be wired in onReady or later: the element may not have upgraded
    // yet at module scope. setAttribute is safe early (the callback fires on
    // upgrade), but .on() is not.
    safeWire("#customMore", () => {
        // The element's only exit off a header-less page. If this listener is
        // ever lost the element falls back to a manual escape link after 5s,
        // but that's a bad experience - treat it as required wiring.
        $w("#customMore").on("logout", doLogout);

        $w("#customMore").on("saveMyDetails", async (event) => {
            const detail = (event && event.detail) ? event.detail : {};
            try {
                // Email syncs to EVERY linked child, same as the native path -
                // which is why Profile's per-child email field is read-only.
                const result = await secureUpdateParentProfile(detail.name, detail.phone, detail.email);

                if (result && result.success) {
                    $w("#customMore").setAttribute("savestate", "saved");

                    // currentParentProfile is read ONCE in onReady and never
                    // re-queried, so without this patch the loadDashboard call
                    // below pushes the pre-save values straight back into the
                    // element and the change appears to vanish until a full
                    // page refresh. Patch the known values rather than
                    // re-querying - we already know what was saved.
                    if (currentParentProfile) {
                        currentParentProfile.PP_fullName = detail.name;
                        currentParentProfile.PP_phoneNumber = detail.phone;
                        if (detail.email) currentParentProfile.PP_email = detail.email;
                    }

                    // Home renders the welcome heading now, so patch its
                    // model rather than a native text element. Without this
                    // the name on Home stays stale until the loadDashboard
                    // below lands 1.5s later.
                    if (homeModel && detail.name) {
                        homeModel.parentName = detail.name;
                        pushHome();
                    }
                    // Name/phone/email are denormalised onto every player row,
                    // so the dashboard needs re-reading to stay in step.
                    setTimeout(() => loadDashboard(currentParentProfileId), 1500);
                } else {
                    console.error("Save My Details (v2) failed:", result && result.error);
                    $w("#customMore").setAttribute("savestate", "error");
                }
            } catch (err) {
                console.error("Save My Details (v2) error:", err);
                $w("#customMore").setAttribute("savestate", "error");
            }
        });
    });
}

// ==========================================
// MESSAGES — #customMessages (stateMessages)
// ==========================================
// Read-only. Composing lives in the Manager Hub; this only ever displays.
//
// Read state is a high-water mark on the parent (PP_messagesReadUpTo), not a
// row per message - see backend/messages.jsw for why. Opening the tab moves
// the mark, so the badge clears, but the rows keep their unread styling for
// the rest of the visit: wiping the dots the instant the tab opens removes
// the only thing showing WHICH messages were new.
let messagesModel = null;

function pushMessages() {
    if (!messagesModel || !$w("#customMessages").id) return;
    $w("#customMessages").setAttribute("data", JSON.stringify(messagesModel));
}

async function loadMessagesState() {
    if (!$w("#customMessages").id || !currentParentProfileId) return;

    // The badge load already fetched these, so on a first open there's
    // usually a full list to show immediately. Only fall back to the spinner
    // when there genuinely isn't anything yet - a blank loading state in
    // front of data we're already holding is a flash for no reason.
    messagesModel = messagesModel && Array.isArray(messagesModel.messages)
        ? messagesModel
        : { loading: true };
    pushMessages();

    try {
        const result = await getParentMessages(currentParentProfileId);
        messagesModel = { messages: (result && result.success) ? result.messages : [] };
        if (result && !result.success) {
            console.error("getParentMessages failed:", result.error);
        }
    } catch (err) {
        console.error("Messages load error:", err);
        messagesModel = { messages: [] };
    }
    pushMessages();

    // Not awaited - the parent has already seen the list by now, and a slow
    // or failed write must never hold up the tab. Worst case the badge is
    // stale until the next load.
    markMessagesRead(currentParentProfileId)
        .then(() => {
            navUnread = 0;
            paintNav(currentTab);
            if (homeModel && homeModel.messagesTeaser) {
                homeModel.messagesTeaser = null;
                pushHome();
            }
        })
        .catch(err => console.error("markMessagesRead error:", err));
}

// Called from loadDashboard. Only the count - the messages themselves aren't
// fetched until the tab is actually opened.
async function loadUnreadBadge() {
    if (!currentParentProfileId) return;
    try {
        const result = await getParentMessages(currentParentProfileId);
        if (!result || !result.success) return;
        navUnread = result.unreadCount || 0;
        paintNav(currentTab);

        // Held so opening the tab renders instantly - see loadMessagesState.
        messagesModel = { messages: result.messages || [] };

        // Unread messages also surface on Home. An in-hub message is only seen
        // when someone opens the hub, and Home is the screen everyone lands
        // on - without this a parent could sit on it and never know.
        if (homeModel && navUnread > 0) {
            homeModel.messagesTeaser = {
                count: navUnread,
                label: navUnread === 1 ? "1 new message" : navUnread + " new messages"
            };
            pushHome();
        }
    } catch (err) {
        console.error("loadUnreadBadge error:", err);
    }
}

// ==========================================
// FIXTURES — one custom element (#customFixtures)
// ==========================================
// Everything the element shows comes from getParentFixtures(), which applies
// the audience rule server-side - a training-only child never receives a
// Playing Only fixture, rather than receiving it and being shown less.

let fixturesModel = null;

function pushFixtures() {
    if (!fixturesModel || !$w("#customFixtures").id) return;
    $w("#customFixtures").setAttribute("data", JSON.stringify(fixturesModel));
}

async function loadFixturesState() {
    if (!$w("#customFixtures").id || !currentParentProfileId) return;

    fixturesModel = { loading: true };
    pushFixtures();

    try {
        const result = await getParentFixtures(currentParentProfileId);
        fixturesModel = {
            fixtures: (result && result.success) ? result.fixtures : [],
            busy: {},
            errors: {}
        };
        if (result && !result.success) {
            console.error("getParentFixtures failed:", result.error);
        }
    } catch (err) {
        console.error("Fixtures load error:", err);
        fixturesModel = { fixtures: [], busy: {}, errors: {} };
    }
    pushFixtures();
}

function setupFixturesWiring() {
    safeWire("#customFixtures", () => {
        $w("#customFixtures").on("respond", async (event) => {
            const d = (event && event.detail) || {};
            if (!d.fixtureId || !d.playerId || !fixturesModel) return;
            const key = `${d.fixtureId}:${d.playerId}`;

            fixturesModel.busy = Object.assign({}, fixturesModel.busy, { [key]: true });
            fixturesModel.errors = Object.assign({}, fixturesModel.errors, { [key]: "" });
            pushFixtures();

            try {
                const result = await respondToFixture(d.playerId, d.fixtureId, d.response);

                if (result && result.success) {
                    // Patch the one child's answer rather than re-fetching the
                    // whole list - answering for one child shouldn't cost a
                    // round trip for every other fixture on screen.
                    const fixture = fixturesModel.fixtures.find(f => f.id === d.fixtureId);
                    const kid = fixture && fixture.kids.find(k => k.id === d.playerId);
                    if (kid) kid.response = result.response;

                    // Home holds its own copy of this answer in the teaser.
                    // Nothing reloads Home on nav - switchTab only calls
                    // changeState - so without this the parent answers here,
                    // taps Home, and is still told a reply is required.
                    patchHomeTeaser(d.fixtureId, d.playerId, result.response);
                } else {
                    fixturesModel.errors[key] = (result && result.error) || "Couldn't save that.";
                }
            } catch (err) {
                console.error("respondToFixture error:", err);
                fixturesModel.errors[key] = "Couldn't save — please try again.";
            }

            delete fixturesModel.busy[key];
            pushFixtures();
        });
    });
}

// ==========================================
// PAYMENTS — two custom elements
// ==========================================
// #customPayments (statePayments) and #customPaymentDetail
// (statePaymentDetail), converted 2026-08-16.
//
// The UI was always display + two actions; converting it doesn't go near
// either of the GoCardless incidents, which were both backend (a date-logic
// bug and a missing await in registration.jsw).
//
// ⚠️ EVERY DECISION ABOUT MONEY STATE STAYS HERE. resolvePayPill() and
// resolvePaymentAction() below work out what a plan is doing and hand the
// elements a finished label, colour and single action. Neither element ever
// sees a GoCardless status, and neither can call a backend function.

const PENDING_STALE_AFTER_MS = 60 * 60 * 1000; // matches startGoCardlessSetup's window

// ONE mapping from "what's the plan doing" to pill text + colours, shared by
// the hub rows and the detail view. Keeping them separate would let the same
// plan read "Active" green in the list and something else on the detail page.
const PAY_PILL = {
    awaiting: { text: "Awaiting club", bg: "#E8EAED", fg: "#5A6472" },
    notSetUp: { text: "Not Set Up",    bg: "#FEF3DE", fg: "#9A6200" },
    pending:  { text: "In Progress",   bg: "#E0EDFB", fg: "#1F5FA8" },
    failed:   { text: "Failed",        bg: "#FCEAEA", fg: "#C23B3B" },
    changed:  { text: "Plan Changed",  bg: "#FEF3DE", fg: "#9A6200" },
    active:   { text: "Active",        bg: "#E4F5EA", fg: "#158A45" },
    unknown:  { text: "Unknown",       bg: "#E8EAED", fg: "#5A6472" }
};

function resolvePayPill(result, feeCategoryId) {
    if (!feeCategoryId) return PAY_PILL.awaiting;
    const found = result && result.success && result.found;
    if (!found || result.status === "CANCELED" || result.status === "ENDED") return PAY_PILL.notSetUp;
    if (result.status === "PENDING") return PAY_PILL.pending;
    if (result.lastPaymentStatus === "FAILED") return PAY_PILL.failed;
    if (result.status === "ACTIVE" && feeCategoryId && result.feeCategoryId
        && result.feeCategoryId !== feeCategoryId) return PAY_PILL.changed;
    if (result.status === "ACTIVE") return PAY_PILL.active;
    return PAY_PILL.unknown;
}

function describeSubscriptionStatus(sub) {
    if (sub.status === "CANCELED") return "This payment plan was canceled.";
    if (sub.status === "ENDED") return "This payment plan has ended.";
    if (sub.status === "PENDING") return "Payment setup in progress — you'll be notified once it's confirmed.";
    if (sub.lastPaymentStatus === "FAILED") {
        return "This month's payment failed. Please contact the club, or check your Direct Debit is still set up correctly with your bank.";
    }
    const PAID_LABELS = { PAID: "paid", UNPAID: "not yet taken", PENDING: "processing" };
    const label = PAID_LABELS[sub.lastPaymentStatus] || sub.lastPaymentStatus || "unknown";
    return `Payment plan active — this month's payment: ${label}.`;
}

// ---- Hub -------------------------------------------------------------
let paymentsModel = null;
let paymentsGeneration = 0;

function pushPayments() {
    if (!paymentsModel || !$w("#customPayments").id) return;
    $w("#customPayments").setAttribute("data", JSON.stringify(paymentsModel));
}

function loadPaymentsHub(visibleKids) {
    if (!$w("#customPayments").id) return;
    const gen = ++paymentsGeneration;

    paymentsModel = {
        kids: visibleKids.map(kid => {
            const initials = `${(kid.SP_firstName || "").charAt(0)}${(kid.SP_lastName || "").charAt(0)}`.toUpperCase();
            const pill = resolvePayPill({}, resolveFeeCategoryId(kid));
            return {
                id: kid._id,
                name: `${kid.SP_firstName || ""} ${kid.SP_lastName || ""}`.trim() || "Player",
                initials: initials || "?",
                // Filled in below once the fee schedule lands.
                subText: resolveFeeCategoryId(kid) ? "Checking…" : "Fee not yet set by the club",
                pillText: pill.text, pillBg: pill.bg, pillFg: pill.fg
            };
        })
    };
    pushPayments();

    // Status and fee are separate calls per child - they resolve into the
    // rows as they land rather than holding the whole list back.
    visibleKids.forEach(kid => {
        const feeCategoryId = resolveFeeCategoryId(kid);
        if (!feeCategoryId) return;

        getGoCardlessStatus(kid._id).then(result => {
            if (gen !== paymentsGeneration || !paymentsModel) return;
            const row = paymentsModel.kids.find(r => r.id === kid._id);
            if (!row) return;
            const pill = resolvePayPill(result, feeCategoryId);
            row.pillText = pill.text; row.pillBg = pill.bg; row.pillFg = pill.fg;
            pushPayments();
        }).catch(err => console.error("getGoCardlessStatus error:", err));

        getFeeSchedule(kid._id, feeCategoryId).then(sched => {
            if (gen !== paymentsGeneration || !paymentsModel) return;
            const row = paymentsModel.kids.find(r => r.id === kid._id);
            if (!row) return;
            const team = (kid.SP_team && kid.SP_team.T_teamName) ? kid.SP_team.T_teamName : "Squad Unassigned";
            row.subText = (sched && sched.success && sched.annualAmount > 0)
                ? `${team} · £${sched.perPayment.toFixed(2)}/month`
                : `${team} · No fee`;
            pushPayments();
        }).catch(err => console.error("getFeeSchedule error:", err));
    });
}

// ---- Detail ----------------------------------------------------------
let paymentDetailModel = null;
let paymentDetailPlayer = null;

function pushPaymentDetail() {
    if (!paymentDetailModel || !$w("#customPaymentDetail").id) return;
    $w("#customPaymentDetail").setAttribute("data", JSON.stringify(paymentDetailModel));
}

async function loadPaymentState(player) {
    if (!$w("#customPaymentDetail").id) return;
    paymentDetailPlayer = player;

    const cat = player.sp_fee_category;
    const feeCategoryId = resolveFeeCategoryId(player);

    $w("#customPaymentDetail").setAttribute("data", JSON.stringify({ loading: true }));

    // Same getFeeSchedule the secretary's PlayerRecord preview uses, so the
    // numbers a parent sees always match what she quoted them.
    let schedule = "";
    // A free tier never reaches GoCardless - no mandate, no payments, no
    // webhooks. Everything downstream keys off this so the parent isn't shown
    // a payment tracker that can never move.
    let isFree = false;
    let newPlanLabel = (cat && cat.F_label) ? cat.F_label : "the club's current fee";
    if (feeCategoryId) {
        try {
            const sched = await getFeeSchedule(player._id, feeCategoryId);
            if (sched && sched.success) {
                schedule = sched.annualAmount > 0
                    ? `${sched.count} payment(s) of £${sched.perPayment.toFixed(2)} (total £${sched.total.toFixed(2)}) — first payment ${new Date(sched.firstDate).toLocaleDateString('en-GB')}, then monthly.`
                    : "No fee — this is a free membership.";
                isFree = !(sched.annualAmount > 0);
                if (!isFree) {
                    newPlanLabel = `${newPlanLabel} (£${sched.perPayment.toFixed(2)}/month)`;
                }
            }
        } catch (err) {
            console.error("getFeeSchedule error:", err);
        }
    }

    let result;
    try {
        result = await getGoCardlessStatus(player._id);
    } catch (err) {
        console.error("getGoCardlessStatus error:", err);
        result = { success: false };
    }

    const pill = resolvePayPill(result, feeCategoryId);

    const confirmed = !!(result && result.success && result.found);
    paymentDetailModel = {
        kidName: `${player.SP_firstName || ""} ${player.SP_lastName || ""}`.trim(),
        planLabel: (cat && cat.F_label) ? cat.F_label : "Club fees",
        free: isFree,
        pill,
        // describeSubscriptionStatus talks about "this month's payment", which
        // is meaningless with no subscription behind it - it was leaking a raw
        // "N/A" to parents on a free tier.
        statusText: isFree
            ? (confirmed
                ? "This membership is free — there's nothing to pay and nothing further to do."
                : "This membership is free — just confirm it below.")
            : (confirmed
                ? describeSubscriptionStatus(result)
                : (feeCategoryId ? "No payment plan set up yet." : "The club hasn't set a fee for this player yet.")),
        schedule,
        ticks: [],
        ledger: [],
        action: resolvePaymentAction(result, feeCategoryId, newPlanLabel)
    };
    pushPaymentDetail();

    // The tick strip is EVIDENCE of payments, so it only makes sense once
    // there's a plan behind it. getPlayerPaymentTimeline returns a full ten
    // months regardless, so calling this unconditionally drew a complete
    // payment schedule underneath "The club hasn't set a fee for this player
    // yet" - a parent mid-registration was being shown a plan that doesn't
    // exist and that they'd never agreed to.
    //
    // Free memberships are excluded too: the element already hides the strip
    // when free, but there's no reason to make the round trip.
    if (feeCategoryId && confirmed && !isFree) {
        loadPaymentHistory(player._id);
    }
}

// Exactly ONE action is ever offered, or none. Never offers checkout while an
// active subscription exists (right tier or wrong) - doing so would create a
// SECOND GoCardless subscription rather than fixing anything.
function resolvePaymentAction(result, feeCategoryId, newPlanLabel) {
    if (!feeCategoryId) {
        return {
            kind: "none",
            note: "Nothing to do yet — the club will set the fee and you'll be able to set up payment here."
        };
    }

    const found = result && result.success && result.found;
    const isActive = found && result.status === "ACTIVE";
    const isMismatched = isActive && result.feeCategoryId && result.feeCategoryId !== feeCategoryId;

    if (isMismatched) {
        // Live GoCardless scenario, NOT a leftover from the old Wix Payments
        // integration: the parent's mandate is on the tier they set up on, and
        // the club has since assigned a different one. GoCardless won't
        // auto-cancel, so the old plan has to go first or they'd pay both.
        return {
            kind: "cancelOld",
            currentPlanLabel: result.feeCategoryLabel || "your current plan",
            newPlanLabel
        };
    }

    if (isActive) return { kind: "none" };
    if (found && result.status === "PENDING") return { kind: "none" };

    return { kind: "setup" };
}

// The evidence view - what's actually been collected, rather than just a
// status line. Same data the secretary sees on PlayerRecord.
async function loadPaymentHistory(playerId) {
    if (!paymentDetailModel) return;
    try {
        const timeline = await getPlayerPaymentTimeline(playerId);
        if (!timeline || !timeline.success || !paymentDetailModel) return;

        paymentDetailModel.ticks = Array.isArray(timeline.monthlyTicks) ? timeline.monthlyTicks : [];
        paymentDetailModel.ledger = (Array.isArray(timeline.recent) ? timeline.recent : []).map(p => ({
            date: p.chargeDate ? new Date(p.chargeDate).toLocaleDateString('en-GB') : "",
            status: p.status,
            amount: typeof p.amount === "number" ? `£${p.amount.toFixed(2)}` : ""
        }));
        pushPaymentDetail();
    } catch (err) {
        console.error("loadPaymentHistory error:", err);
    }
}

function setPaymentAction(patch) {
    if (!paymentDetailModel) return;
    paymentDetailModel.action = Object.assign({}, paymentDetailModel.action, patch);
    pushPaymentDetail();
}

function setupPaymentsWiring() {
    safeWire("#customPayments", () => {
        $w("#customPayments").on("openPayment", (event) => {
            const kid = findVisibleKid(event && event.detail && event.detail.id);
            if (!kid) return;
            activePlayerContext = { ...kid };
            // changeState FIRST, then load - the detail state's element must be
            // mounted before loadPaymentState writes to it.
            $w("#stateboxHub2").changeState("statePaymentDetail");
            setTopbar(`${kid.SP_firstName}'s Payment Plan`, "Direct Debit via GoCardless", true);
            loadPaymentState(activePlayerContext);
        });
    });

    safeWire("#customPaymentDetail", () => {
        $w("#customPaymentDetail").on("startSetup", async () => {
            const player = paymentDetailPlayer;
            if (!player) return;
            const feeCategoryId = resolveFeeCategoryId(player);
            if (!feeCategoryId) return;

            setPaymentAction({ busy: true, error: "" });
            try {
                const result = await startGoCardlessSetup(player._id, feeCategoryId, wixLocationFrontend.url);
                if (!result || !result.success) throw new Error((result && result.error) || "Could not start payment setup");

                // Free tier (e.g. a manager's own child) - the backend already
                // marked it done, nothing to authorise, just re-render.
                if (result.free) {
                    await loadPaymentState(player);
                    return;
                }
                // Leaves the site. No need to clear busy - the page is going.
                wixLocationFrontend.to(result.authorisationUrl);
            } catch (err) {
                console.error("startGoCardlessSetup error:", err);
                setPaymentAction({ busy: false, error: err.message || "Couldn't start setup — please try again." });
            }
        });

        // Only reachable after the element's two-step confirm.
        $w("#customPaymentDetail").on("cancelPlan", async () => {
            const player = paymentDetailPlayer;
            if (!player) return;

            setPaymentAction({ busy: true, error: "" });
            try {
                const status = await getGoCardlessStatus(player._id);
                if (!status || !status.success || !status.found || !status.recordId) {
                    throw new Error("Couldn't find that plan to cancel — please refresh and try again.");
                }
                const cancelResult = await cancelGoCardlessSubscription(status.recordId);
                if (!cancelResult || !cancelResult.success) {
                    throw new Error((cancelResult && cancelResult.error) || "Cancel failed");
                }
                // Re-read rather than assuming - the parent needs to see the
                // real post-cancel state before being offered the new plan.
                await loadPaymentState(player);
            } catch (err) {
                console.error("cancelGoCardlessSubscription error:", err);
                setPaymentAction({ busy: false, error: err.message || "Couldn't cancel — please try again or contact the club." });
            }
        });
    });
}


// ==========================================
// PROFILE — one custom element (#customProfile)
// ==========================================
// Replaced ~68 native elements on 2026-08-16. The element owns the tabs, the
// header, the RBAC presentation and the edit form; page code does data only.
//
// Gone with the natives: PROFILE_TABS, showProfileTab, applyProfileRbac,
// updateConsentSummary, clearPlayerStats, loadFormGuide, the #formRepeater
// onItemReady block, and every $w read/write in loadProfileForm.
//
// ⚠️ The RBAC in the element is PRESENTATION. getKidsForParent strips the
// primary parent's details server-side, so a secondary parent's payload never
// contains them. Never send data on the assumption the element will hide it.

// label lookups for ClubDictionary ids (gender, sizes, relationship, seasons)
let clubDictionaryMap = {};
let profileOptions = null;
let currentPlayerId = "";
let currentTeamId = "";
let currentSeasonId = "";

// What #customProfile is showing. Held so a save result, a Lightbox reply or a
// season change can patch one part and repaint rather than rebuilding it all.
let profileModel = null;

function pushProfile() {
    if (!profileModel || !$w("#customProfile").id) return;
    $w("#customProfile").setAttribute("data", JSON.stringify(profileModel));
}

async function loadProfileDictionaries() {
    if (profileOptions) return profileOptions;
    const options = { relationship: [], seasons: [] };
    try {
        const dictResults = await wixData.query("ClubDictionary").limit(1000).find();
        dictResults.items.forEach(item => {
            clubDictionaryMap[item._id] = item.title || item.label;
        });
        const build = (category) => dictResults.items
            .filter(i => i.category === category)
            .map(i => ({ label: i.title || i.label, value: i._id }));

        options.relationship = build("relationship");
        // Newest season first - a parent almost always wants the current one.
        options.seasons = build("season").reverse();
    } catch (err) {
        console.error("Failed to load profile dictionaries:", err);
    }
    profileOptions = options;
    return options;
}

async function loadProfileForm(player) {
    if (!$w("#customProfile").id) return;

    currentPlayerId = player._id;
    currentTeamId = player.SP_team ? (player.SP_team._id || player.SP_team) : "";

    $w("#customProfile").setAttribute("data", JSON.stringify({ loading: true }));
    const options = await loadProfileDictionaries();

    // Default to the newest season rather than making the parent choose before
    // seeing anything.
    currentSeasonId = (options.seasons[0] && options.seasons[0].value) || "";

    let managerName = "Squad Unassigned";
    if (currentTeamId) {
        try {
            const manager = await getTeamManager(currentTeamId);
            managerName = (manager && manager.fullName) ? manager.fullName : "TBD";
        } catch (err) {
            console.error("Manager lookup failed:", err);
            managerName = "TBD";
        }
    }

    const isPrimary = isViewerPrimaryParent(player);
    const dict = (id) => clubDictionaryMap[id && (id._id || id)] || "";

    profileModel = {
        options,
        season: currentSeasonId,
        saveState: "idle",
        saveMessage: "",
        stats: {},
        teamStats: {},
        player: {
            id: player._id,
            firstName: player.SP_firstName || "",
            lastName: player.SP_lastName || "",
            initials: `${(player.SP_firstName || "").charAt(0)}${(player.SP_lastName || "").charAt(0)}`.toUpperCase() || "?",
            teamName: (player.SP_team && player.SP_team.T_teamName) ? player.SP_team.T_teamName : "Squad Unassigned",
            trainingOnly: player.SP_trainingOnly === true,
            kitNumber: player.kitNumber != null ? player.kitNumber : null,

            managerName,
            fanNumber: player.SP_fanNumber ? String(player.SP_fanNumber) : "",
            membershipNo: player.sp_membership_no || "",
            dob: player.SP_dob ? new Date(player.SP_dob).toLocaleDateString('en-GB') : "",
            gender: dict(player.sp_gender),
            shirt: dict(player.SP_shirtSize),
            shorts: dict(player.SP_shortSize),
            socks: dict(player.SP_socksize),
            hoodie: dict(player.SP_hoodieSize),
            coat: dict(player.SP_coatSize),

            // Presentation only - see the warning above.
            isPrimary,

            parentName: player.parentsName || "",
            parentRelation: dict(player.SP_relationship),
            parentEmail: player.parentEmail || "",
            parentMobile: player.parentPhone || "",
            parentDob: toDateInput(player.sp_parent_dob),
            address: formatAddress(player.mainAddress),
            addressStructured: structuredAddress(player.mainAddress),
            parentAddress: formatAddress(player.sp_parent_address),
            parentAddressStructured: structuredAddress(player.sp_parent_address),

            emergName: player.SP_emergContactName || "",
            emergNumber: player.SP_emergContactNumber || "",
            emergRelation: player.SP_emergContactRelationship
                ? (player.SP_emergContactRelationship._id || player.SP_emergContactRelationship) : "",

            // No CMS boolean - derived from whether the columns hold anything,
            // same as Registration.
            hasSecondParent: !!player.secondaryParentName,
            secName: player.secondaryParentName || "",
            secMobile: player.secondaryParentMobile || "",
            secEmail: player.secondaryParentEmail || "",
            secRelation: player.secondaryParentRelation
                ? (player.secondaryParentRelation._id || player.secondaryParentRelation) : "",
            secDob: toDateInput(player.sp_secparent_dob),
            secAddress: formatAddress(player.sp_secparent_address),
            secAddressStructured: structuredAddress(player.sp_secparent_address),

            bothParents: player.livesWithBothParents === true,
            hasMedical: player.SP_hasMedical === true,
            medicalInfo: player.SP_medicalInfo || "",

            consent: {
                photo: player.sp_consent_photo,
                social: player.socialMedia,
                fa: player.sp_consent_fa,
                medical: player.sp_consent_medical
            }
        }
    };
    pushProfile();

    // Stats are separate queries and deliberately don't hold the profile back -
    // the parent sees the child immediately and the numbers fill in.
    refreshProfileStats();
}

async function refreshProfileStats() {
    if (!profileModel || !currentPlayerId) return;
    const seasonId = currentSeasonId;

    try {
        const [stats, teamStats] = await Promise.all([
            loadPlayerStats(currentPlayerId, seasonId),
            loadTeamStats(currentTeamId, seasonId)
        ]);
        // A season change while these were in flight must not be overwritten
        // by the older reply.
        if (seasonId !== currentSeasonId || !profileModel) return;
        profileModel.stats = stats;
        profileModel.teamStats = teamStats;
        pushProfile();
    } catch (err) {
        console.error("Failed to load stats:", err);
    }
}

// Returns totals rather than writing to elements.
async function loadPlayerStats(playerId, seasonId) {
    const empty = { goals: 0, assists: 0, tackles: 0, saves: 0, potm: 0 };
    if (!playerId || !seasonId) return empty;
    try {
        const statsRes = await wixData.query("PlayerStats")
            .eq("playerReference", playerId).eq("season", seasonId).find();

        const totals = { goals: 0, assists: 0, tackles: 0, saves: 0, potm: 0 };
        statsRes.items.forEach(s => {
            totals.goals += (Number(s.goals) || 0);
            totals.assists += (Number(s.assists) || 0);
            totals.tackles += (Number(s.tackles) || 0);
            totals.saves += (Number(s.saves) || 0);
        });

        const potmRes = await wixData.query("Playerofthematch")
            .eq("playerReference", playerId).eq("season", seasonId).find();
        totals.potm = potmRes.items.length;
        return totals;
    } catch (error) {
        console.error("Error loading player stats:", error);
        return empty;
    }
}

async function loadTeamStats(teamId, seasonId) {
    const empty = { wins: 0, losses: 0, draws: 0, gf: 0, ga: 0, gd: 0, form: [] };
    const seasonLabel = seasonId ? clubDictionaryMap[seasonId] : null;
    if (!teamId || !seasonLabel) return empty;

    try {
        const matchesRes = await wixData.query("TeamStats")
            .eq("TS_teamName", teamId).eq("seasonLabel", seasonLabel)
            .descending("_createdDate").limit(1000).find();

        let gf = 0, ga = 0, w = 0, l = 0, d = 0;
        matchesRes.items.forEach(m => {
            gf += (Number(m.TS_goalsFor) || 0);
            ga += (Number(m.TS_goalsAgainst) || 0);
            if (m.result === "Win") w++;
            else if (m.result === "Lose") l++;
            else if (m.result === "Draw") d++;
        });

        // Query is newest-first, so reverse for left-to-right chronology.
        const form = matchesRes.items.slice(0, 5).reverse().map(m =>
            m.result === "Win" ? "W" : m.result === "Lose" ? "L" : "D");

        return { wins: w, losses: l, draws: d, gf, ga, gd: gf - ga, form };
    } catch (error) {
        console.error("Error loading team stats:", error);
        return empty;
    }
}

// Maps the element's edit payload onto the CMS record. Only the fields the
// Edit Details tab actually exposes - everything else on the record is left
// exactly as it was.
function mapProfileToPlayer(playerData, form) {
    const before = Object.assign({}, playerData);

    playerData.parentPhone = form.parentMobile;
    if (form.parentDob) playerData.sp_parent_dob = form.parentDob;

    writeAddress(playerData, "mainAddress", form.address, form.addressStructured);
    writeAddress(playerData, "sp_parent_address", form.parentAddress, form.parentAddressStructured);

    playerData.SP_emergContactName = form.emergName;
    playerData.SP_emergContactNumber = form.emergNumber;
    playerData.SP_emergContactRelationship = form.emergRelation;

    playerData.livesWithBothParents = form.bothParents === true;
    playerData.SP_hasMedical = form.hasMedical === true;
    playerData.SP_medicalInfo = playerData.SP_hasMedical ? form.medicalInfo : null;

    if (form.hasSecondParent === true) {
        playerData.secondaryParentName = form.secName;
        playerData.secondaryParentMobile = form.secMobile;
        playerData.secondaryParentEmail = form.secEmail;
        playerData.secondaryParentRelation = form.secRelation;
        if (form.secDob) playerData.sp_secparent_dob = form.secDob;
        writeAddress(playerData, "sp_secparent_address", form.secAddress, form.secAddressStructured);
    } else {
        playerData.secondaryParentName = null;
        playerData.secondaryParentMobile = null;
        playerData.secondaryParentEmail = null;
        playerData.secondaryParentRelation = null;
        playerData.sp_secparent_dob = null;
        playerData.sp_secparent_address = null;
    }

    // Same last-line-of-defence sweep as the registration save: a field that
    // came out as a garbage sentinel is restored to what was loaded and
    // shouted about, rather than silently overwriting good data.
    Object.keys(playerData).forEach(key => {
        if (!isGarbageValue(playerData[key])) return;
        console.error(
            `mapProfileToPlayer: REFUSED to write ${key} = "${playerData[key]}". ` +
            `This is a bug upstream. The previously stored value has been kept.`,
            { restored: before[key] }
        );
        playerData[key] = before[key];
    });

    return playerData;
}

function setProfileSaveState(state, message) {
    if (!profileModel) return;
    profileModel.saveState = state;
    profileModel.saveMessage = message || "";
    pushProfile();
}

function setupProfileWiring() {
    safeWire("#customProfile", () => {
        $w("#customProfile").on("saveProfile", async (event) => {
            const form = (event && event.detail) || {};
            if (!activePlayerContext) return;

            // The element disables Save for a secondary parent, but the check
            // that matters is this one - and the real one is in
            // secureUpdatePlayerRegistration, which verifies ownership
            // server-side before writing anything.
            if (!isViewerPrimaryParent(activePlayerContext)) {
                setProfileSaveState("error", "Only the primary parent can change these details.");
                return;
            }

            setProfileSaveState("saving", "");
            try {
                const playerToUpdate = mapProfileToPlayer(activePlayerContext, form);
                const result = await secureUpdatePlayerRegistration(playerToUpdate, currentParentProfileId);

                if (result && result.success) {
                    setProfileSaveState("saved", "Saved ✓");
                    setTimeout(() => {
                        if (profileModel && profileModel.saveState === "saved") setProfileSaveState("idle", "");
                    }, 2500);
                    // Details are denormalised onto the dashboard rows.
                    setTimeout(() => loadDashboard(currentParentProfileId), 1500);
                } else {
                    console.error("Profile save failed:", result && result.error);
                    setProfileSaveState("error", "Couldn't save — please try again.");
                }
            } catch (err) {
                console.error("Profile save error:", err);
                setProfileSaveState("error", "Couldn't save — please try again.");
            }
        });

        $w("#customProfile").on("seasonChange", async (event) => {
            currentSeasonId = (event && event.detail && event.detail.season) || "";
            if (profileModel) {
                profileModel.season = currentSeasonId;
                pushProfile();
            }
            await refreshProfileStats();
        });

        // The SAME shared Lightbox Registration uses.
        $w("#customProfile").on("openAddressLookup", async (event) => {
            const detail = (event && event.detail) || {};
            const field = detail.field;
            if (!field || !profileModel) return;
            try {
                const result = await wixWindow.openLightbox("AddressLookup", {
                    current: detail.current || null
                });
                if (!result || !result.address) return;
                profileModel.addressResult = { field, address: result.address };
                pushProfile();
            } catch (err) {
                console.error("Address lookup lightbox failed:", err);
            }
        });

        // Consent saves IMMEDIATELY rather than waiting on Save Changes - the
        // Lightbox's own "Confirm & Close" already reads as a commitment, so
        // silently losing the answer would be the wrong behaviour.
        $w("#customProfile").on("openConsent", async (event) => {
            const current = (event && event.detail) || {};
            if (!activePlayerContext) return;
            try {
                const result = await wixWindow.openLightbox("ConsentRegistration", {
                    photo: current.photo, social: current.social,
                    fa: current.fa, medical: current.medical
                });
                if (!result || !profileModel) return;

                activePlayerContext.sp_consent_photo = result.photo;
                activePlayerContext.socialMedia = result.social;
                activePlayerContext.sp_consent_fa = result.fa;
                activePlayerContext.sp_consent_medical = result.medical;

                profileModel.consent = {
                    photo: result.photo, social: result.social,
                    fa: result.fa, medical: result.medical
                };
                pushProfile();

                const response = await secureUpdatePlayerRegistration(activePlayerContext, currentParentProfileId);
                if (!response || !response.success) {
                    console.error("Consent save failed:", response && response.error);
                }
            } catch (err) {
                console.error("Consent lightbox failed:", err);
            }
        });
    });
}
