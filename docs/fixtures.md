# Fixtures/Events + RSVP Tracking (Parked Plan)

> Status: Parked — not yet started. Picking up other work first.
> Resumed 2026-08-12 as part of the Parent Hub v2 redesign
> ([[project_parent_hub_v2_redesign]]) — collection identity confirmed below.

## Context

The Manager Hub currently has no way for managers to schedule training sessions,
matches, tournaments, or other events, nor any way to see which players/parents
have confirmed attendance. There's an existing `fixtures` CMS collection
(displayed as "Team Fixtures") that's been used to manually add fixtures, but
it's missing:
- An event/fixture **type** (Training / Match / Tournament / Event)
- A proper **reference to Teams** (currently `signol_team` is a plain TEXT field,
  not a REFERENCE)

**Collection identity confirmed 2026-08-12:** there are actually TWO
fixture-shaped collections in the CMS today — "Team Fixtures" (collection ID
`fixtures`, the one documented in `CMS_SCHEMA.txt` and referenced throughout
this doc) and a second one literally called "Fixtures" with collection ID
`input1` (Wix's auto-generated ID, the telltale sign of one created before Rob
knew to set a proper ID — from earlier FA-import experimentation, same era as
`fixtures`'s existing `homeTeam`/`awayTeam`/`week_commencing`/`parsed_date`
fields). **Build forward on `fixtures` ("Team Fixtures")** — it has the proper
ID. `input1` ("Fixtures") is a cleanup candidate later, not touched by this plan.

**Sourcing plan (clarified 2026-08-12):** the goal isn't just manual entry —
Rob wants to eventually pull real match fixtures from the FA API into this same
collection. Training/Tournament/Event will **always** be manager-entered (the FA
only has official match data), but Match rows will eventually come from two
sources side by side: manager-entered (until FA import exists) and FA-imported
(once it does). Add one field now, `source` (TEXT: `"Manual"` / `"FA Import"`,
defaulting to `"Manual"` for everything until FA import is built), so the two
never get confused or duplicated later — cheap now, a messy migration if left
until FA import actually lands. Building the FA API integration itself is still
out of scope for this plan — this is still the manual-entry + RSVP foundation
it will plug into later, just with the seam already in place.

## CMS Schema Changes (user creates these manually in the Wix CMS editor)

### 1. Rebuild `fixtures` collection's active fields (Collection ID: `fixtures`)

**Decided 2026-08-12:** rather than patching around `signol_team` (TEXT, not a
real reference), rebuild the active field set cleanly. `homeTeam`/`awayTeam`/
`venue` already exist and become genuinely used (not just FA-import legacy) —
manager-entered rows populate them directly, so manager-entered and future
FA-imported rows share the exact same shape with no translation needed later.

**Reuse, but changing `venue`'s type:**
- `date_only` (DATETIME) — the one authoritative event date. `date` (TEXT) and
  `parsed_date` (DATETIME) already existed too, but three date fields was one
  too many — leave those two alone/unused rather than adding a fourth.
- `venue` — **switched from TEXT to ADDRESS** (2026-08-12). A venue is a real
  physical location, same reasoning as `mainAddress` on players — pairs with
  a Wix Address Input component (autocomplete, structured, could support a
  map link later) rather than free text. No production data on this field
  yet, so no migration cost to fixing it now rather than living with TEXT.
- `homeTeam` (TEXT) — for a manager-entered match, one side is the club's own
  team name, the other the opponent
- `awayTeam` (TEXT)

**Add new:**
- `startTime` (TEXT) — e.g. "18:00"
- `stopTime` (TEXT, optional) — e.g. "19:30", useful for training sessions
  especially
- `eventType` (TEXT) — one of `Training`, `Match`, `Tournament`, `Event`
  (populated via a new `ClubDictionary` category `fixture_type`, same pattern as
  `season`/`leave_reason` — see `loadClubDictionary()` /
  `loadSeasonOptions()` in `Manager Hub.js` lines ~171-215)
- `club_team` (REFERENCE → `Teams`) — the new proper reference field.
  `signol_team` (TEXT) is left alone, not migrated — see below.
- `notes` (TEXT) — free text details (e.g. "Bring boots + shin pads")
- `source` (TEXT) — `"Manual"` / `"FA Import"`, default `"Manual"`. Every row
  is Manual until FA import exists; keeps the two sources distinguishable once
  it does, so a manager can't accidentally duplicate an FA-imported match.
- `audience` (TEXT) — `"All"` / `"Playing Only"`. Controls whether
  training-only players (`SP_trainingOnly` on `SignolPlayers`) see this
  fixture on their Parent Hub. Default by `eventType` — Match/Tournament
  default to `"Playing Only"` (training-only kids aren't selected for
  matches), Training/Event default to `"All"` — manager can override either
  way before saving. Deliberately a plain 2-value field, not a ClubDictionary
  category — it's fixed business logic, not something that needs to be
  admin-configurable.

**Leave alone, unused going forward (legacy, don't delete):** `date` (TEXT),
`parsed_date` (DATETIME), `week_commencing` (TEXT), `signol_team` (TEXT) — all
from earlier FA-import experimentation, not touched by the rebuild.

### Visibility rule (Parent Hub side)

A fixture is shown to a given child if: `fixture.club_team` matches the
child's `SP_team`, **and** (`fixture.audience === "All"` **or**
(`fixture.audience === "Playing Only"` **and** the child's `SP_trainingOnly`
is not `true`)). One boolean check, no need to enumerate every player-status
case.

### 2. New `ClubDictionary` entries, category = `fixture_type`
Rows: `Training`, `Match`, `Tournament`, `Event` (with `order` 1-4), following the
exact same `title`/`label`/`order` shape as the existing `season` rows.

### 3. New collection: `FixtureResponses`
- `_id` (auto)
- `fixtureReference` (REFERENCE → `fixtures`)
- `playerReference` (REFERENCE → `SignolPlayers`)
- `response` (TEXT) — `"Accepted"` / `"Declined"` / `"Pending"` (default Pending,
  row only created once a parent responds — absence of a row = Pending)
- `responseDate` (DATETIME)

CMS permissions: same member read/write pattern as `PlayerStats`/`Playerofthematch`
(parents need write access to create/update their own child's response rows).

## Manager Hub (`frontend/members_pages/Manager Hub.js`)

### New state: `stateFixtures`
Added to `navMap` in `setupNavigation()` (pattern at lines 126-135) via a new
`#btnNavFixtures` → `loadFixturesState`. Back button `#btnBackToHubFixtures` added
to the existing back-button loop (lines 147-155).

**Layout** (mirrors `stateStatsAdd`'s container/tab approach):
- `#fixturesAddForm` (container, collapsed by default, toggled by `#btnAddFixture`)
  - `#fixtureTypeDropdown` (options from `ClubDictionary` category=`fixture_type`)
  - `#fixtureTeamDropdown` (options from `managerContext.teams`, defaults to
    `statsSelectedTeamId`/`primaryTeamId` — same pattern as `#potmTeam` etc.
    — writes to the new `club_team` field)
  - `#fixtureDatePicker`, `#fixtureTimeInput`, `#fixtureStopTimeInput`
    (optional), `#fixtureVenueInput`
  - `#fixtureOpponentInput` (shown/collapsed based on type = Match/Tournament)
  - `#fixtureHomeAwayDropdown` (shown/collapsed alongside `#fixtureOpponentInput`
    — Match/Tournament only). **Simple UI, clean storage**: the manager just
    picks Home/Away and types the opponent — `#btnSaveFixture` computes
    `homeTeam`/`awayTeam` from `club_team`'s own name + this opponent + the
    Home/Away choice before inserting, so the manager never has to think in
    terms of "which text field is which side," but the stored row still
    matches the shape FA import will eventually produce directly.
  - `#fixtureAudienceDropdown` — "All" / "Playing Only", 2 fixed options (not
    from ClubDictionary). Code sets a default when `#fixtureTypeDropdown`
    changes (Match/Tournament → "Playing Only", Training/Event → "All"), but
    the manager can change it before saving.
  - `#fixtureNotesInput`
  - `#btnSaveFixture` — inserts into `fixtures` via `wixData.insert`
    (`source: "Manual"` always, from this form)
- `#repeaterFixtures` — upcoming fixtures for the manager's team(s), sorted by
  `date_only` ascending, filtered `date_only >= today` and `club_team` in
  `managerContext.teams`
  - Per row: type badge, formatted date/time, venue, opponent (derived from
    whichever of `homeTeam`/`awayTeam` isn't `club_team`'s own name)
  - RSVP summary counts: `#fixtureAccepted`, `#fixtureDeclined`, `#fixturePending`
    — computed by querying `FixtureResponses` for that fixture against the full
    squad list (squad size minus responses = pending)
  - `#btnViewRSVP` — opens `#rsvpDetailPanel` (collapsible section within the
    same state, not a separate statebox state) showing one row per squad player
    with their response (text, no edit — managers view only, per the request)
- `#btnDeleteFixture` per row (same confirm-then-delete pattern as
  `Team Admin.js`'s `#deleteBtn`, lines 173-183)

### Squad data reuse
RSVP detail reuses the existing squad-loading query pattern (`SignolPlayers` by
`SP_team`, excluding `LEFT_STATUS_ID`) already used in `loadSquadPlayerOptions()`.

## Parent Hub

**Superseded 2026-08-12 by the v2 redesign** ([[project_parent_hub_v2_redesign]])
— this lands on the new Parent Hub v2 page's `stateFixtures`, not v1's
`stateDashboard`. Full element list already specced in
`docs/PARENT_HUB_V2_ELEMENTS.md` (`#repeaterFixtures`, `#fixtureKidTag`,
`#fixtureRsvpStatus`/`#fixtureRsvpStatusText`, `#btnRsvpYes`/`#btnRsvpNo`, the
Home tab teaser card) — check that file for the current element IDs rather
than this section.

What's still relevant here, not yet in that doc:
- The **visibility rule** above (`club_team` match + `audience`/`SP_trainingOnly`
  check) needs applying when querying `fixtures` for a parent's Fixtures tab —
  filter out anything the child shouldn't see before it ever reaches the repeater.
- `#btnRsvpYes`/`#btnRsvpNo` write/update a `FixtureResponses` row
  (`fixtureReference` + `playerReference`, `response`, `responseDate`) — same
  as originally planned, just via the v2 element IDs now.
- Home tab's `#boxHomeBanner` could eventually also flag pending RSVPs (e.g.
  "X fixture(s) need your RSVP"), same amber-banner treatment as no-kids-yet —
  not decided yet, revisit once fixtures data actually exists to test against.

## Docs

- `docs/MANAGER_HUB_ELEMENTS.md`: add a new `## State: stateFixtures` section
  documenting all new elements, following the existing table format.
- `docs/DATABASE_RELATIONSHIPS.md`: document `fixtures.club_team` → `Teams` and
  the new `FixtureResponses` collection's two references.
- `database/CMS_SCHEMA.txt`: add the new `fixtures` fields and the new
  `FixtureResponses` collection (this file documents what the user creates
  manually — update it to match once fields exist).

## Build Order

1. User creates the CMS schema changes (fields on `fixtures`, `fixture_type`
   ClubDictionary rows, new `FixtureResponses` collection + permissions) —
   needs an exact spec to action in the Wix CMS editor.
2. Manager Hub: `stateFixtures` — add-fixture form + upcoming fixtures list
   (no RSVP yet, just CRUD).
3. Manager Hub: RSVP detail panel per fixture.
4. Parent Hub: upcoming fixtures + Accept/Decline.
5. Update docs (`MANAGER_HUB_ELEMENTS.md`, `DATABASE_RELATIONSHIPS.md`,
   `CMS_SCHEMA.txt`).

Each step 2-5 will need new Editor elements added (dataset/repeater IDs etc.)
before the corresponding code can be wired up, same as previous Manager Hub work.

## Verification

- After CMS changes: confirm `wixData.query("fixtures")` returns the new fields
  and `wixData.query("ClubDictionary").eq("category","fixture_type")` returns 4
  rows.
- After Manager Hub changes: in the live site, add a Training fixture for a team,
  confirm it appears in `#repeaterFixtures`, confirm RSVP counts show
  "0 Accepted / 0 Declined / X Pending" (X = squad size).
- After Parent Hub changes: as a parent, accept/decline a fixture, confirm the
  RSVP counts update on the Manager Hub side and the player's row appears under
  the correct response in the RSVP detail panel.
