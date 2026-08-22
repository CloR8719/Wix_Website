// =====================================================================
//  squadRules.js — one definition of "who is this fixture for"
// =====================================================================
//  Two places need to answer that question and they MUST agree:
//
//    fixtures.jsw       decides which fixtures a parent is shown and can
//                       answer for.
//    fixturesRollup.jsw decides who counts as "no reply" once it's over.
//
//  When those two rules differ you get the worst kind of wrong number: a
//  child appears on a manager's chase list for a fixture their parent was
//  never shown. The rollup used to filter on team + audience only, with no
//  status filter at all, so every player who had ever been on the team -
//  including ones who left last season - inflated rsvpNoReplyCount.
//
//  A plain .js file, NOT .jsw, on purpose. .jsw exports are wrapped as
//  callable web methods, which is why even a non-async .jsw function has to
//  be awaited from another file. A .js backend module is an ordinary ES
//  module: shared constants and helpers behave normally and there's no
//  web-callable surface for something that should never be reachable from a
//  browser.
// =====================================================================

// From ClubDictionary player_status. Confirmed against the live CMS.
export const PLAYER_STATUS = {
    ENQUIRY:         "e4c79abb-e591-44c3-98a9-e111f276bdd2", // 1
    TRIAL:           "5f21b19d-878a-4042-a8ec-c1c0a66812b9", // 2
    INVITED:         "184b5a98-37c8-41a6-bc58-5a1c17827f04", // 3
    READY_FOR_FA:    "95978c83-70fc-4bd7-bd75-12f43216a0d7", // 4
    FA_COMPLETE:     "af2bef8c-1caa-4bf8-8dce-321d19723741", // 5
    ACTIVE:          "705c0b66-d5d5-47b6-b828-98a94c670f1f", // 6
    LEFT:            "d78cb8b0-3b3b-4439-b889-fd36dc434781", // 7
    RENEWAL:         "4d354c43-c893-4bc8-8415-18cfc32b3236", // 8
    IN_PROGRESS:     "ad6fe8f3-c82e-45ae-b688-89d53c3f0a9f", // 9
    ACTION_REQUIRED: "d5bd1c0f-e19e-4318-a8d3-d5d6fe63b274"  // 10
};

// Reverse lookup, for logging only. A bare GUID in a console line is
// unreadable, and "why is this child on the list" is the question these
// logs exist to answer.
export const STATUS_NAMES = {
    [PLAYER_STATUS.ENQUIRY]:         "Enquiry",
    [PLAYER_STATUS.TRIAL]:           "Trial",
    [PLAYER_STATUS.INVITED]:         "Invited",
    [PLAYER_STATUS.READY_FOR_FA]:    "Ready for FA",
    [PLAYER_STATUS.FA_COMPLETE]:     "FA Complete",
    [PLAYER_STATUS.ACTIVE]:          "Active",
    [PLAYER_STATUS.LEFT]:            "Left",
    [PLAYER_STATUS.RENEWAL]:         "Renewal",
    [PLAYER_STATUS.IN_PROGRESS]:     "In Progress",
    [PLAYER_STATUS.ACTION_REQUIRED]: "Action Required"
};

// The question is "would a manager expect this child at a session", NOT
// "is their paperwork finished". Those come apart constantly - a returning
// player sitting in Renewal or Action Required trains all the same, and a
// manager who isn't told they're unaccounted for will plan without them.
//
// So this is defined as an EXCLUDE list of the few that clearly aren't
// attending, rather than an include list. A status added to ClubDictionary
// later then defaults to counting, which fails in the safe direction: a
// manager sees a name they weren't expecting and can ask, where a silently
// missing child is invisible.
//
//   Enquiry - made contact, hasn't started.
//   Trial   - trialling, not a squad member yet (Rob, 2026-08-18).
//   Invited - sent a registration link, hasn't opened it.
//   Left    - gone.
//
// Trial was counted in the first version of this file on the reasoning that a
// trialist turns up to training, so a manager planning numbers wants them in.
// That's wrong for how this club runs: a trial is an assessment, not
// membership, and their attendance is the manager's business to arrange
// directly rather than something to chase an RSVP for.
//
// Note this is ONE rule for both sides - excluding a status here also stops
// that child's parent seeing the fixture at all, which is the intended
// behaviour here but is the thing to check before adding to this list.
export const NOT_ATTENDING_STATUSES = [
    PLAYER_STATUS.ENQUIRY,
    PLAYER_STATUS.TRIAL,
    PLAYER_STATUS.INVITED,
    PLAYER_STATUS.LEFT
];

export function isAttendingSquadMember(player) {
    if (!player) return false;
    const status = (typeof player.SP_status === "string")
        ? player.SP_status
        : (player.SP_status && player.SP_status._id) || "";
    // An unset status counts, deliberately - see the "fails safe" note above.
    if (!status) return true;
    return !NOT_ATTENDING_STATUSES.includes(status);
}

// Event types where a training-only child isn't involved by default. A child
// flagged SP_trainingOnly doesn't get picked for a match - that's what the
// flag means - so a match shouldn't sit on their fixture list asking whether
// they're coming, and shouldn't count them as unaccounted for.
export const PLAYING_EVENT_TYPES = ["Match", "Tournament"];

// The audience half of the same question.
//
// audience is meant to be set per fixture ("All" / "Playing Only") by the
// manager's fixture form, which defaults it from eventType. That form doesn't
// exist yet - fixtures are being added straight in the CMS - so the field is
// routinely blank, and a blank was being read as "everyone", which made a
// Match behave exactly like a Training session.
//
// So: an explicit value always wins (a manager marking a friendly "All" means
// it), and only a MISSING value falls back to the documented default in
// docs/fixtures.md. That keeps this correct now and harmless once the form
// starts setting the field itself.
export function effectiveAudience(fixture) {
    if (!fixture) return "All";
    const set = String(fixture.audience || "").trim();
    if (set === "All" || set === "Playing Only") return set;
    return PLAYING_EVENT_TYPES.includes(String(fixture.eventType || "").trim())
        ? "Playing Only"
        : "All";
}

export function matchesAudience(fixture, player) {
    if (effectiveAudience(fixture) !== "Playing Only") return true;
    return player && player.SP_trainingOnly !== true;
}

// The whole rule. Both callers should use THIS, not the parts.
export function isExpectedAtFixture(fixture, player) {
    return isAttendingSquadMember(player) && matchesAudience(fixture, player);
}

// Names a player for a list a human reads. Kept here so the rollup's
// archived lists and any future manager screen agree on the format.
export function playerName(player) {
    if (!player) return "";
    return `${player.SP_firstName || ""} ${player.SP_lastName || ""}`.trim();
}
