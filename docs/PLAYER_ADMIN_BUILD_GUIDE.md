# Player Admin (Club Secretary) — Editor Build Guide

One-stop checklist for building the redesigned secretary Player Admin tool in the Wix
Editor. **Existing functionality (queues, roster, reports, bulk renewal) is already
live and tested — this guide covers the 2026-08 visual/structural redesign on top of
it**: a sidebar nav, a new Dashboard landing view, and a new Payments view. Detailed
per-element tables live in the companion docs:
- `PLAYER_ADMIN_ELEMENTS.md` — the dashboard page (full reference)
- `PLAYER_RECORD_ELEMENTS.md` — the PlayerRecord lightbox (the only lightbox, visual
  restyle only for this pass — no element/logic changes)

## Architecture in one line
One page, nine states (was three), switched by a sidebar nav instead of a radio
group. Lists just *show* players; acting on one opens **one lightbox** —
`PlayerRecord` — which does everything (register, activate, renew, confirm-left,
send back to parent, set/send fees). Team Admin and Staff Admin were **both**
originally separate pages and **both** got folded straight in as states
(`stateTeams` / `stateStaff` — Rob's call in both cases) — their old pages are now
redundant, and there are no external page links left in the sidebar at all.
Fixtures is a local placeholder state too (empty until that feature's actually
built). Sidebar button look (default/hover/pressed) is handled entirely by Wix's
own native button states in the Editor, not code.

| Lightbox | Opened from |
|----------|-------------|
| **PlayerRecord** | **Ready for FA** + **Activate** + **Renewal** + **Leavers** + **Payments** queues **and** the All Players list |
| *(none)* | **Awaiting Parents** + **Sent back** queues — buttons act inline (copy email / resend / nudge) |

---

## What's changing vs. what's staying

**Staying exactly as-is (just restyle + reposition):** every existing repeater, count
text, button, and its wiring function. `loadQueues`, `fillQueue`, `fillRenewalQueue`,
`loadRoster`, `renderRoster`, `wireExport`, `previewRenewCount`, `bulkRenew`,
`openTaskLightbox` are all unchanged in the code — nothing to rebuild there, only
restyle the elements they already talk to.

**New elements needed:**
1. The sidebar nav — 9 buttons, **all** local state switches now
2. `stateDashboard` — 4 KPI cards + 3 widget cards (new state)
3. `stateRenewals` — new state, but its contents (`#secRenewal`… and the bulk-renewal
   controls) already exist, just need moving into this new state
4. `statePayments` — new state, new repeater, one new backend function
5. `stateStaff` — new state, but the *logic* is a straight port from the old
   separate Staff Admin.js page (just renamed element IDs) — see
   `PLAYER_ADMIN_ELEMENTS.md` for the full field list, it's a big one (compliance
   traffic lights, inline autosave, a badges drawer)
6. `stateTeams` — same story, straight port from the old separate Team Admin.js
   page (renamed IDs, same logic) — also a big one (manager + up to 5 assistants,
   per-person compliance lights, autosave)

---

## Page level (outside the state box)
- `#stateMain` — Multi-State Box, 9 states named exactly `stateDashboard` /
  `statePipeline` / `stateRenewals` / `statePlayers` / `stateStaff` / `stateTeams` /
  `statePayments` / `stateReports` / `stateFixtures`. Default state `stateDashboard`.
- Sidebar nav buttons — all 9 are local state switches now: `#navDashboard`
  `#navRegistrations` `#navRenewals` `#navPlayers` `#navStaff` `#navTeams`
  `#navPayments` `#navReports` `#navFixtures`.

## State `stateDashboard` (NEW)
- KPI strip: 4 Containers, all clickable now — `#kpiTotalPlayers` (+ nested
  `#kpiTotalPlayersNum` / `#kpiTotalPlayersSub`), `#kpiActionRequired` (+ nested
  `#kpiActionRequiredNum`), `#kpiRenewalsDue` (+ nested `#kpiRenewalsDueNum`),
  `#kpiPaymentIssues` (+ nested `#kpiPaymentIssuesNum`) — see
  `PLAYER_ADMIN_ELEMENTS.md` for why these are Containers, not plain Text
- Widget grid: `#widgetRegistrations` (+ `#regWidgetSummary`), `#widgetPayments`
  (+ `#paymentsWidgetSummary`), `#widgetTeams` (+ `#teamsWidgetSummary`),
  `#widgetQualifications` (+ 12 nested count Texts — the Staff Qualifications grid,
  replaces "Recent Activity", Rob's call). Full 12-cell spec is in
  `PLAYER_ADMIN_ELEMENTS.md` — new backend function `getStaffComplianceOverview()`.

## State `statePipeline` (was `stateToDo`, minus Renewals)
- Optional KPI texts: `#kpiActive`, `#kpiOnboarding`, `#kpiLeft`
- `#emptyToDo` (Text, **Collapsed**)
- 5 queues — each = Container (**Collapsed**) + count Text + Repeater:

| Queue | Container / Count / Repeater | Repeater-item elements |
|-------|------------------------------|------------------------|
| Ready for FA | `#secFA` / `#faCount` / `#faRepeater` | `#faName` `#faTeam` `#faDob` `#faParent` `#faType` `#faIdBadge` `#faProcessBtn` → **PlayerRecord** |
| Activate | `#secActivate` / `#activateCount` / `#activateRepeater` | `#actName` `#actTeam` `#activateBtn` → **PlayerRecord** |
| Leavers | `#secLeft` / `#leftCount` / `#leftRepeater` | `#leftName` `#leftAge` `#leftReason` `#leftDate` `#leftConfirmBtn` → **PlayerRecord** |
| Awaiting | `#secInvited` / `#invitedCount` / `#invitedRepeater` | `#invName` `#invTeam` `#invSentDate` `#invProgress` `#invCopyEmailBtn` `#invResendBtn` |
| Sent back | `#secActionReq` / `#actionReqCount` / `#actionReqRepeater` | `#arName` `#arTeam` `#arNote` `#arSentDate` `#arCopyEmailBtn` `#arNudgeBtn` |

## State `stateRenewals` (NEW — split out of `stateToDo` + moved from Reports)
- Renewal queue: `#secRenewal` / `#renewalCount` / `#renewalRepeater` (items:
  `#renName` `#renTeam` `#renProgress` `#renDoneBtn` → **PlayerRecord**),
  `#renSummary`, `#renViewAllBtn`
- Bulk season-rollover (moved here from Reports): `#renewTeam` `#renewAgeGroup`
  `#renewStatus` `#renewBtn`

## State `statePlayers` (unchanged)
- `#playerSearch` (input); `#filterTeam` `#filterAgeGroup` `#filterStatus`
  (dropdowns); `#filterShowLeft` (switch, off)
- `#rosterCount` (Text); `#emptyRoster` (Text, **Visible** — default prompt)
- `#playerRepeater` → item: `#pName` `#pTeam` `#pAge` `#pStatusBadge`
  `#pMedicalBadge` `#pTypeBadge` `#pViewBtn` → **PlayerRecord**

## State `stateStaff` (NEW — ported from the old separate Staff Admin.js page)
Straight port, not a rewrite — same logic, renamed IDs (`stf`/`staff` prefixes) to
avoid collisions with `statePlayers`'s `#filterTeam` etc. Full field list (24 items:
inline-editable name/email/mobile/address/FAN/DOB/team/role, 4 compliance date
pickers + traffic lights, a qualifications/badges drawer, delete) is in
`PLAYER_ADMIN_ELEMENTS.md` — don't retype it here, just build from that table.
Lazy-loaded on first visit, same as the roster. The old separate page/file is
redundant once this works — safe to delete then, not urgent.

## State `stateTeams` (NEW — ported from the old separate Team Admin.js page)
Straight port, not a rewrite — same logic, renamed IDs (`team`/`tm` prefixes) for
consistency with the rest of this file (nothing here actually collided). Full field
list (manager + up to 5 assistant coach rows, each with 4 compliance lights,
autosave, delete, plus the two existing `AddTeamPopup`/`SquadViewer` lightboxes) is
in `PLAYER_ADMIN_ELEMENTS.md` — build from that table. Lazy-loaded on first visit,
same as the roster. The old separate page/file is redundant once this works — safe
to delete then, not urgent.

## State `statePayments` (NEW)
- Optional header stats: `#paymentsCountActive` `#paymentsCountPending`
  `#paymentsCountFailed`
- `#emptyPayments` (Text, **Collapsed**)
- `#paymentsRepeater` → item: `#payName` `#payTeam` `#payStatusBadge`
  `#payViewBtn` → **PlayerRecord**

## State `stateReports` (bulk renewal removed, income chart added)
- `#exportAllBtn` `#exportFaBtn` `#exportLeaversBtn`
- Collected by Month chart (moved here from the Dashboard, Rob's call): 10 bars
  `#barJul`...`#barApr`. Lazy-rendered on first visit (reuses data already fetched
  on page load, no new query). Same "build every bar at the same starting
  height/Y" rule as everywhere else bars are used — see `PLAYER_ADMIN_ELEMENTS.md`.

## State `stateFixtures` (NEW — empty placeholder, no content yet)
Just needs to exist so `#navFixtures` has somewhere to go. The actual Fixtures
feature is a separate, already-written parked plan (`docs/fixtures.md`) — build its
content into this state when that work starts, don't create a new one.

## Lightbox `PlayerRecord` ("open automatically" OFF)
All `#pr…` elements — see `PLAYER_RECORD_ELEMENTS.md`. **No changes for this pass**
beyond restyling to match the new visual system (colors/fonts) if you want visual
consistency — no new elements, no logic changes.

---

## Things that break it if wrong
1. `#stateMain` state names exactly `stateDashboard` / `statePipeline` /
   `stateRenewals` / `statePlayers` / `stateStaff` / `stateTeams` / `statePayments` /
   `stateReports` / `stateFixtures`
2. Sidebar button IDs exactly `#nav` + the state's short name (see table above) —
   the code does `$w("#nav" + view)`, so a typo means that nav item silently does
   nothing
3. Lightbox name exactly `PlayerRecord` ("open automatically" OFF) — `AddTeamPopup`
   and `SquadViewer` (used by `stateTeams`) also need to keep their exact names
4. Repeater-item IDs go *inside* the repeater item, not on the page
5. `#renewTeam`/`#renewAgeGroup`/`#renewStatus`/`#renewBtn` must physically move
   into `stateRenewals` — the code wires them the same either way, but they'll be
   invisible/inert if left behind in `stateReports`
6. `stateStaff`'s and `stateTeams`'s field IDs must use the renamed prefixes exactly
   as listed in `PLAYER_ADMIN_ELEMENTS.md` (`stf`/`staff` and `team`/`tm`) — reusing
   the *original* pages' names will silently collide with elements already used
   elsewhere on this page

## Code files (this redesign)
- `frontend/dashboard_pages/Player Admin.js` — reworked, existing logic reused,
  plus Staff Admin's and Team Admin's logic both ported straight in
- `backend/registration.jsw` — new `getSecretaryPaymentsOverview()` (now also
  returns `monthlyIncome`) and `getStaffComplianceOverview()`
- `frontend/additional_pages/Player Record.js` — untouched (visual restyle only,
  done in the Editor, no code changes)
- `frontend/dashboard_pages/Staff Admin.js` — now redundant, safe to delete (and
  its Editor page) once `stateStaff` is confirmed working
- `frontend/dashboard_pages/Team Admin.js` — same, redundant once `stateTeams` is
  confirmed working

## Verify after building
- Everything in `PLAYER_ADMIN_TESTING.md`'s existing checklist still passes,
  just against the new layout/states.
- `stateStaff` behaves identically to how the old Staff Admin page did — search,
  filters, add, inline autosave, compliance traffic lights, badges drawer, delete.
- `stateTeams` behaves identically to how the old Team Admin page did — search,
  filters, add (via `AddTeamPopup`), manager/assistant compliance lights, player
  counts, view squad (via `SquadViewer`), autosave, delete.
- Dashboard KPI numbers match what `statePipeline`/`stateRenewals`/`statePayments`
  show individually when you drill into each; the Teams widget's summary matches
  `stateTeams`'s actual team/player counts.
- Every KPI card and widget click lands on the correct state — every nav button
  switches states locally now, no navigation to a separate page happens anywhere.
- `statePayments` shows the right counts — spot-check against manually counting
  `GoCardlessSubscriptions` statuses in Content Manager.
- Sidebar buttons look right on hover/click using Wix's own native button states —
  if they still misbehave (e.g. turning blue together), check whether they're
  still design-linked from being duplicated rather than fully independent copies.
