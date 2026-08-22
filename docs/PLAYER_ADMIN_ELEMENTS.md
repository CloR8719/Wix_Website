# Player Admin (Club Secretary) — Page Element Reference

Element IDs required in the Wix Editor for `frontend/dashboard_pages/Player Admin.js`.
This is the **club-wide** player dashboard for the secretary — built around action
queues ("what needs doing") plus a full roster, GoCardless payment visibility, and
CSV reports.

**Initial State key:**
- `Visible` — normal, on-screen, takes up layout space
- `Collapsed` — removed from layout (`.collapse()` in code, `.expand()` to restore)
- `Hidden` — stays in layout but invisible
- `None` — leave as default/visible, code doesn't toggle it on load

> **No CMS changes needed for this redesign.** All data already exists
> (`SignolPlayers`, `GoCardlessSubscriptions`, `Teams`). This is a visual and
> structural redesign of an already-working page, not a new build.

> **Design intent (secretary is not tech-confident):** big, plain-English cards;
> queues only appear when they have items; forward actions are one tap; the only
> irreversible-feeling action (clearing a leaver) is two-tap. There is **no hard
> delete** — players who leave are archived (status `Left`), never destroyed.

---

## Visual system (2026-08 redesign)

Validated via an interactive prototype (see the project's design conversation) and
applied here. **Colors:** `--ink` #0E1A2B (navy — sidebar + text), `--canvas` #F5F6F2
(warm off-white — content ground), `--surface` #FFFFFF (cards), `--gold` #B8892B
(accent, used sparingly — active nav state, key numerals), `--pitch` #1F5136
(secondary accent), `--line` #E1E4DB (hairlines). The existing semantic status colors
(`GREEN` #22C55E / `AMBER` #F59E0B / `BLUE` #3B82F6 / `RED` #FF4D4D / `GREY` #7c8ca6,
already constants at the top of `Player Admin.js`) are **unchanged** — this redesign
doesn't touch them. **Type:** Barlow Condensed 700/800 for headings and KPI numerals,
Work Sans for body text, IBM Plex Mono for money figures/counts. **Before relying on
these fonts:** confirm Wix's Editor font upload ("Add Font" in text settings) accepts
the 3 required font files; if not, fall back to the closest Wix-provided fonts keeping
the same pairing logic (condensed display + humanist body + mono for figures).

**Status badges (2026-08):** every colored pill (`#faIdBadge`, `#pStatusBadge`,
`#payStatusBadge`, etc.) is built as a Text element **plus** a Container sitting
behind it (`...Box` suffix), not a single element. Confirmed on this build that a
Text element's own background doesn't reliably render via code even though its
text colour does (see the Ready for FA "ID ✓" pill, which showed green text on an
unrelated static pink background before this was caught) - so the fill needs its
own element. `paintBadge(el, text, color, boxEl, bgAlpha = 0.5)` in
`Player Admin.js` sets the text element's `.text`/`.style.color` solid, and (if
a `boxEl` is passed) the box's `.style.backgroundColor` to the same hue converted
to `rgba(...)` at `bgAlpha` (50% by default) via the `hexToRgba()` helper - so the
badge reads as solid-coloured text on a faded tint of the same colour. The `...Box`
container is optional/guarded - a badge still works as text-only until its box is
built.

---

## Root / Always Visible

**Page structure:** the sidebar is **one single shared nav group** (buttons +
badges), pinned outside `#stateMain`, same as the top bar. Its navy background,
though, is a **separate small Multi-State Box** (`#sideBarRail`) with one state per
view — this is what makes the rail visually reach down to match whichever state's
content is showing, without duplicating the buttons themselves anywhere.

This replaced two earlier designs, both abandoned after live testing: (1) a single
shared `#sideBar` Container with its height synced from code every 300ms — Velo
never returned usable layout geometry (`.height`/`.width`/`.x`/`.y` all read back
`undefined`) on any wrapper element tried for measuring content height; (2) a full
copy of the nav duplicated inside every one of the 9 states — technically workable,
but abandoned before building since it meant ~72 uniquely-suffixed button/badge IDs
to manage by hand. The rail approach avoids both problems: no runtime measuring
(Wix just renders each rail state at whatever fixed size you gave it in the Editor,
same as `#stateMain`'s own states already differ from each other), and no ID
sprawl (nav buttons/badges stay as one single copy, just like before any of this
started).

```
PAGE
├── #sideBarRail — Multi-State Box, one state per view, JUST the navy background
│                   (no buttons inside it) — see below
├── #navDashboard, #navRegistrations, ... — ONE shared button group, sits on top
│    of the rail, pinned, never resizes
└── Main content area
      ├── Top bar — persistent, contains #pageTitle
      └── #stateMain — the 9-state box, everything else in this doc lives inside it
```

The nine views live inside the **Multi-State Box** (`#stateMain`), same pattern as
Manager Hub's `#stateboxHub`. A **sidebar nav** (not a radio group — see below)
switches states via code. **Every nav item is a local state now** — both Team Admin
and Staff Admin started this redesign as separate pages, and both ended up ported
straight in rather than linked to (Rob's call in both cases) — there are no external
page links left in the sidebar at all.

| # | Element ID | Type | Purpose | Initial State |
|---|-----------|------|---------|----------------|
| 1 | `#stateMain` | Multi-State Box | Holds the 9 views as states — see table below for exact names | Default state `stateDashboard` |
| 1a | `#sideBarRail` | Multi-State Box | The navy sidebar background ONLY — no buttons inside. One state per view (see table below), each just a plain colored rectangle sized by eye to match that view's content height. Switched via `showView()` in lockstep with `#stateMain`. Guards on `.id` — the page works fine before this is built, the rail just won't resize until it exists. | Recommend default state `railDashboard` |
| 2 | `#pageTitle` | Text | In the persistent top bar (outside `#stateMain`, built as a Container with "pin to screen"). Code sets this to the current view name ("Dashboard", "Registrations", etc.) every time `showView()` runs — one element covers every state. Guards on `.id`. | None |
| 3 | `#pageSubtitle` | Text | Also in the top bar. "Welcome back, `<first name>` — here's what needs you today." — reads the logged-in member's name via `currentMember.getMember()`, not hardcoded, so it stays correct if anyone else ever covers this role. Guards on `.id`. | None |
| 4 | `#seasonLabel` | Text | The season pill, top-right of the top bar. "Season 2026-27" — reads the real current season via `getCurrentSeasonLabel()`, not hardcoded, so it doesn't need updating by hand every year. Guards on `.id`. | None |

### `#sideBarRail` states (background only, per view)

Build each state as a plain rectangle/box (`--ink` navy fill, no buttons or other
content) sized to roughly match that view's real content height — eyeball it against
the corresponding `#stateMain` state while building. A state you haven't built yet
just doesn't get sized (rail keeps showing whatever state it was last on) — build
these incrementally like everything else in this file.

| # | State name | Matches `#stateMain` state |
|---|-----------|---------|
| 1 | `railDashboard` | `stateDashboard` |
| 2 | `railPipeline` | `statePipeline` |
| 3 | `railRenewals` | `stateRenewals` |
| 4 | `railPlayers` | `statePlayers` |
| 5 | `railStaff` | `stateStaff` |
| 6 | `railTeams` | `stateTeams` |
| 7 | `railPayments` | `statePayments` |
| 8 | `railReports` | `stateReports` |
| 9 | `railFixtures` | `stateFixtures` |

### Sidebar nav (one shared group, sits on top of the rail)

A vertical stack of **native Button** elements, dark navy background (`--ink`), each
with a custom icon embedded directly on it. **Look/feel (default, hover, pressed) is
handled entirely by Wix's own button design states in the Editor — not code.** An
earlier version of this had code also setting `backgroundColor`/`color` to show which
item was "active," but that fought with Wix's own native button states (all the
buttons were turning blue together) — removed. Code's only job now is deciding which
state to switch to on click; "where am I" is shown via `#pageTitle` in the top bar,
not a persistent sidebar highlight. Position these pinned on top of `#sideBarRail`
near the top of the page — they never move or resize, regardless of which rail
state is showing underneath.

| # | Element ID | Type | Purpose | Initial State |
|---|-----------|------|---------|----------------|
| 1 | `#navDashboard` | Button | → `stateDashboard` | None |
| 2 | `#navRegistrations` | Button | → `statePipeline` | None |
| 3 | `#navRenewals` | Button | → `stateRenewals` | None |
| 4 | `#navPlayers` | Button | → `statePlayers` | None |
| 5 | `#navStaff` | Button | → `stateStaff` — ported logic from the old separate Staff Admin.js page, see below | None |
| 6 | `#navTeams` | Button | → `stateTeams` — ported logic from the old separate Team Admin.js page, see below | None |
| 7 | `#navPayments` | Button | → `statePayments` | None |
| 8 | `#navReports` | Button | → `stateReports` | None |
| 9 | `#navFixtures` | Button | → `stateFixtures` — **empty placeholder state**, no content yet (Fixtures feature itself is a parked plan, `docs/fixtures.md`) | None |

### Nav badges (optional — small count on 3 of the buttons)

Small pill/circle badges positioned on the corner of their button, showing a count.
**Only these 3 nav items get one** — the others have no natural "needs attention"
number. Auto-hides at 0 rather than showing an empty badge, same pattern as every
queue section in this tool. Purely optional polish — the nav works fully without
them.

**Each badge is 2 elements, not 1** — a Text element can't be shaped into a circle
directly in Classic Editor, so each badge is a small **Container** (styled as the
circle) with a **Text** nested inside it for the digit. The code shows/hides the
*container* and sets the number on the *inner text* separately
(`updateNavBadge(containerId, numId, count)`).

| # | Element ID | Type | Purpose | Initial State |
|---|-----------|------|---------|----------------|
| 1 | `#navBadgeRegistrations` | Container (circle) | Shows/hides based on the pipeline total | Collapsed (code shows/hides) |
| 1a | `#navBadgeRegistrationsNum` | Text (inside 1) | The digit itself (same figure as `#regWidgetSummary`) | None |
| 2 | `#navBadgeRenewals` | Container (circle) | Shows/hides based on renewals due | Collapsed (code shows/hides) |
| 2a | `#navBadgeRenewalsNum` | Text (inside 2) | The digit itself (same figure as `#kpiRenewalsDue`) | None |
| 3 | `#navBadgePayments` | Container (circle) | Shows/hides based on failed payments | Collapsed (code shows/hides) |
| 3a | `#navBadgePaymentsNum` | Text (inside 3) | The digit itself (same figure as `#kpiPaymentIssues`) | None |

---

## State: `stateDashboard` (NEW — default landing view)

The overview: 4 KPI cards + 3 widget cards. Every clickable card jumps straight to
its full state on click (Classic Editor has no native slide-over/drawer component,
so "click a widget, it opens things" = "opens its view", not a floating panel).

### KPI strip

Each KPI is a **Container** (the click target) with a label, a big number, and a
sub-line nested inside it — not a single Text element. The container's ID is what
gets the click handler; the number and sub-line are separate nested Text elements
the code writes to individually (a Container has no `.text` of its own).

| # | Element ID | Type | Purpose | Initial State |
|---|-----------|------|---------|----------------|
| 1 | `#kpiTotalPlayers` | Container | **Clickable → `statePlayers`** (the full roster — not the quick-list lightbox, see below). Guards on `.id`. | None |
| 1a | `#kpiTotalPlayersNum` | Text (inside 1) | Active + onboarding player count | None |
| 1b | `#kpiTotalPlayersSub` | Text (inside 1) | "Across N teams" | None |
| 2 | `#kpiActionRequired` | Container | **Clickable → Registrations quick-list, then `statePipeline`.** Guards on `.id`. | None |
| 2a | `#kpiActionRequiredNum` | Text (inside 2) | Count of sent-back forms | None |
| 3 | `#kpiRenewalsDue` | Container | **Clickable → Renewals quick-list, then `stateRenewals`.** Guards on `.id`. | None |
| 3a | `#kpiRenewalsDueNum` | Text (inside 3) | Count of Renewal Due players | None |
| 4 | `#kpiPaymentIssues` | Container | **Clickable → Payments quick-list, then `statePayments`.** Guards on `.id`. | None |
| 4a | `#kpiPaymentIssuesNum` | Text (inside 4) | Count of failed GoCardless payments | None |

Label text ("Total Players", "Action Required", etc.) and the other 3 cards' static
sub-lines (e.g. "Sent-back forms awaiting a fix") can just be typed directly into
their own Text elements in the Editor — they don't change, so there's no need for
IDs or code to set them.

### Widget grid

| # | Element ID | Type | Purpose | Initial State |
|---|-----------|------|---------|----------------|
| 1 | `#widgetRegistrations` | Container/Box | Clickable card → `statePipeline`. Guards on `.id`. | None |
| 1a | `#regWidgetSummary` | Text (inside widget) | Optional single-line summary, e.g. "23 players moving through registration" — not required if using the per-row breakdown below | None |
| 1b | `#regRowAwaiting` | Text (inside widget) | Awaiting Parent count - **invited + draft combined** (2026-08, changed to match the Pipeline page's merged total - see Queue E) | None |
| 1c | `#regRowDraft` | Text (inside widget) | Draft In Progress count | None |
| 1d | `#regRowReadyFA` | Text (inside widget) | Ready for FA count | None |
| 1e | `#regRowFARegistered` | Text (inside widget) | "FA Registered — pending club process" count | None |
| 2 | `#widgetPayments` | Container/Box | Clickable card → `statePayments`. Guards on `.id`. | None |
| 2a | `#paymentsWidgetSummary` | Text (inside widget) | Optional single-line summary, e.g. "61 active · 9 pending · 2 failed" — not required if using the per-row breakdown below | None |
| 2b | `#payRowActive` | Text (inside widget) | Active Direct Debits count | None |
| 2c | `#payRowPending` | Text (inside widget) | Setup Pending count | None |
| 2d | `#payRowFailed` | Text (inside widget) | Failed Payment count | None |
| 2e | `#payRowCollected` | Text (inside widget) | "Collected This Month" — £ amount, current calendar month only (not the 10-month chart) | None |
| 3 | `#widgetTeams` | Container/Box | Clickable card → `stateTeams` (local, not external anymore — see below). Guards on `.id`. | None |
| 3a | `#teamsWidgetSummary` | Text (inside widget) | e.g. "9 teams · 142 players" | None |
| 3b | `#teamsWidgetRepeater` | Repeater (inside widget) | Top `TEAMS_WIDGET_CAP` (5) teams by active player count, most players first — capped since Classic Editor has no scroll-within-container option, a full 20+ team list would just push the whole page down | None |
| 3c | `#teamsWidgetMore` | Text (inside widget, optional) | "+ N more teams" — shown only when capped; clicking the whole widget still goes to the full `stateTeams` list either way | Collapsed |
| 3b-i | `#twTeamName` | Text (in repeater) | Team name | None |
| 3b-ii | `#twPlayerCount` | Text (in repeater) | Active player count for that team | None |
| 4 | `#widgetQualifications` | Container/Box | Clickable card → `stateStaff`. Guards on `.id`. | None |

**Recent Activity was replaced with a Staff Qualifications compliance grid**
(Rob's call, 2026-08) — more useful than a generic activity feed (which would've
needed a whole new activity-log system nothing in this codebase has), and this is a
genuine legal/safeguarding requirement (DBS, First Aid, Safeguarding, Coaching),
not just an operational nice-to-know. An earlier version of this slot explored two
bar charts (a registration pipeline funnel + a monthly income chart) — the income
chart survived and moved to `stateReports` (see below); the pipeline chart was
dropped entirely in favor of this.

#### Qualifications grid (4 rows × 3 columns = 12 counts)

Club-wide counts, not per-person — complements (doesn't replace) `stateStaff`'s own
per-record traffic lights. Bucket thresholds are simpler/uniform here (exactly 1
month / exactly 3 months) rather than matching each individual light's slightly
different thresholds — deliberately, so this reads as one consistent scale.

| # | Element ID | Type | Purpose | Initial State |
|---|-----------|------|---------|----------------|
| 1 | `#qualDbsExpired` | Text | DBS — expired or missing count | None |
| 2 | `#qualDbsOneMonth` | Text | DBS — expires within 1 month | None |
| 3 | `#qualDbsThreeMonth` | Text | DBS — expires within 3 months | None |
| 4 | `#qualFaExpired` | Text | First Aid — expired or missing count | None |
| 5 | `#qualFaOneMonth` | Text | First Aid — expires within 1 month | None |
| 6 | `#qualFaThreeMonth` | Text | First Aid — expires within 3 months | None |
| 7 | `#qualSgExpired` | Text | Safeguarding — expired or missing count | None |
| 8 | `#qualSgOneMonth` | Text | Safeguarding — expires within 1 month | None |
| 9 | `#qualSgThreeMonth` | Text | Safeguarding — expires within 3 months | None |
| 10 | `#qualCoachExpired` | Text | Coaching — expired or missing count | None |
| 11 | `#qualCoachOneMonth` | Text | Coaching — expires within 1 month | None |
| 12 | `#qualCoachThreeMonth` | Text | Coaching — expires within 3 months | None |

Row labels (DBS/First Aid/Safeguarding/Coaching) and column headers (Expired/None,
≤1 month, ≤3 months) are static text — they never change, no IDs needed. Backend:
`getStaffComplianceOverview()` in `backend/registration.jsw`.

---

## State: `statePipeline` (was `stateToDo` — Registrations)

**Identical to the old `stateToDo` queues below, minus Renewals** (now its own
state — see `stateRenewals`). Same element IDs, same repeaters, same logic —
this is a restyle + one queue moved out, not a rebuild.

### Header KPIs (optional — code guards if absent)

| # | Element ID | Type | Purpose | Initial State |
|---|-----------|------|---------|----------------|
| 1 | `#kpiActive` | Text | Count of Active players | None |
| 2 | `#kpiOnboarding` | Text | Count mid-onboarding (Invited/FA/Renewal) | None |
| 3 | `#kpiLeft` | Text | Count of players who've Left | None |
| 4 | `#emptyToDo` | Text | "All caught up!" message | Collapsed |

### Top summary strip (NEW 2026-08 — bare counts, not the queues' own "N waiting" pill)

| # | Element ID | Type | Purpose | Initial State |
|---|-----------|------|---------|----------------|
| 1 | `#pipeCountFA` | Text | Ready for FA count | None |
| 2 | `#pipeCountActivate` | Text | FA Registered count | None |
| 3 | `#pipeCountAwaiting` | Text | Awaiting Parent count | None |
| 4 | `#pipeCountAction` | Text | Action Required count | None |
| 5 | `#pipeCountLeavers` | Text | Leavers count | None |

### Queue A — Ready to register with FA  (`SP_status = Ready for FA`)

| # | Element ID | Type | Purpose | Initial State |
|---|-----------|------|---------|----------------|
| 1 | `#secFA` | Container | Section wrapper (auto-hides when empty) | Collapsed |
| 2 | `#faCount` | Text | "N waiting" (code appends the suffix) | None |
| 3 | `#faRepeater` | Repeater | One card per player | Visible |
| 3a | `#faAvatar` | Text (in repeater, optional) | Initials circle, e.g. "OB" — code-computed from name | None |
| 3b | `#faName` | Text (in repeater) | Player full name | None |
| 3c | `#faTeam` | Text (in repeater) | Team name | None |
| 3d | `#faDob` | Text (in repeater) | Date of birth | None |
| 3e | `#faParent` | Text (in repeater) | Primary parent name | None |
| 3f | `#faType` | Text (in repeater, optional) | "Training Only" / "Playing & Training" | None |
| 3g | `#faIdBadge` | Text (in repeater) | "ID ✓" (green) / "ID missing" (red) - text colour only, see 3h for the fill | None |
| 3h | `#faIdBadgeBox` | Container (in repeater, optional), behind 3g | Faded background tint (same hue as the text, ~50% opacity) - a plain Text element's own background doesn't reliably render in this build, so the fill needs its own element sitting behind the text | None |
| 3h | `#faProcessBtn` | Button (in repeater) | "Process →" — opens **PlayerRecord** | None |

### Queue B — FA done, ready to activate  (`SP_status = FA Registered`)

| # | Element ID | Type | Purpose | Initial State |
|---|-----------|------|---------|----------------|
| 1 | `#secActivate` | Container | Section wrapper | Collapsed |
| 2 | `#activateCount` | Text | "N waiting" (code appends the suffix) | None |
| 3 | `#activateRepeater` | Repeater | One card per player | Visible |
| 3a | `#actAvatar` | Text (in repeater, optional) | Initials circle | None |
| 3b | `#actName` | Text (in repeater) | Player full name | None |
| 3c | `#actTeam` | Text (in repeater) | "Team · FA registered N days ago" — the relative-date part is computed from `_updatedDate` (proxy for "when the status changed", same assumption as `#arSentDate`) | None |
| 3d | `#activateBtn` | Button (in repeater) | "Review →" — opens **PlayerRecord** | None |

### Queue D — Recently left, confirm removed from FA  (`Left` + `leftClubCheck` not true)

| # | Element ID | Type | Purpose | Initial State |
|---|-----------|------|---------|----------------|
| 1 | `#secLeft` | Container | Section wrapper | Collapsed |
| 2 | `#leftCount` | Text | "N waiting" (code appends the suffix) | None |
| 3 | `#leftRepeater` | Repeater | One card per player | Visible |
| 3a | `#leftAvatar` | Text (in repeater, optional) | Initials circle | None |
| 3b | `#leftName` | Text (in repeater) | Player full name | None |
| 3c | `#leftTeam` | Text (in repeater, optional) | Team name (query now includes `SP_team` — added 2026-08) | None |
| 3d | `#leftAge` | Text (in repeater) | Age group | None |
| 3e | `#leftReason` | Text (in repeater) | Leave reason | None |
| 3f | `#leftDate` | Text (in repeater) | Leaving date | None |
| 3g | `#leftConfirmBtn` | Button (in repeater) | "Review →" — opens **PlayerRecord** | None |

### Queue E — Awaiting parents (chase them)  (`SP_status = Awaiting Parent`, `Form In Progress`, **or** `Renewal Due` — three-way merge 2026-08)

Three statuses all mean "it's with the parent, not her": Invited (not started),
Draft/Form In Progress (started, not submitted), and Renewal Due (a returning
player who hasn't started their renewal form). All three merge into this one
queue so she can see and nudge every one of them at a glance. `#invProgress`/the
progress bar tells them apart (empty bar + "Not started" vs partial bar + "Form:
N%"). "Copy email"/"Resend link" work the same for all three.

Renewal Due players **also** still get their own dedicated queue + bulk season-
rollover tool in `stateRenewals` - this merge doesn't replace that, it's a second,
broader view of the same underlying players for at-a-glance visibility here.

⚠️ Side effect worth knowing: since the Pipeline page's total (`pipelineTotal`,
feeding the sidebar's `#navBadgeRegistrations`) now includes `awaiting` and
`awaiting` includes renewals, the "Registrations" sidebar badge and the separate
"Renewals" sidebar badge (`#navBadgeRenewals`) can both count the same renewal
players. Flag if you'd rather the Registrations total excluded renewals.

**Update (2026-08):** the Dashboard widget's `#regRowAwaiting` now also merges
invited + draft (was invited-only), so it agrees with the Pipeline page's number
instead of looking like it was missing the not-started half. `#regRowDraft`
still shows the draft-only breakdown underneath it. Renewals still aren't shown
as a widget row at all - only the Pipeline page's Queue E merges all three.

| # | Element ID | Type | Purpose | Initial State |
|---|-----------|------|---------|----------------|
| 1 | `#secInvited` | Container | Section wrapper | Collapsed |
| 2 | `#invitedCount` | Text | "N waiting" (code appends the suffix) | None |
| 3 | `#invitedRepeater` | Repeater | One card per player | Visible |
| 3a | `#invAvatar` | Text (in repeater, optional) | Initials circle | None |
| 3b | `#invName` | Text (in repeater) | Player full name | None |
| 3c | `#invTeam` | Text (in repeater) | Team name | None |
| 3d | `#invSentDate` | Text (in repeater) | Date link sent — real date (e.g. "31/07/2026"), not a relative "N days ago" phrase | None |
| 3e | `#invProgress` | Text (in repeater) | "Form: N%" / "Not started" | None |
| 3f | `#invProgressBar` | Progress Bar (in repeater, optional) | Wix's native Progress Bar element (Add panel → search "Progress Bar") - NOT a manually-stacked pair of boxes, that approach kept getting overridden by the Editor's own layout behaviour (element showed "Length"/"Thickness" instead of Width/Height, meaning it wasn't a plain resizable Box). Code sets `.value` (0-100) and `.tooltip` ("N% complete") - no track/fill math needed, Wix handles the visual itself | None |
| 3h | `#invCopyEmailBtn` | Button (in repeater) | "Copy email" | None |
| 3i | `#invResendBtn` | Button (in repeater) | "Resend link" | None |

### Queue F — Sent back, awaiting parent fix  (`SP_status = Action Required`)

| # | Element ID | Type | Purpose | Initial State |
|---|-----------|------|---------|----------------|
| 1 | `#secActionReq` | Container | Section wrapper (auto-hides when empty) | Collapsed |
| 2 | `#actionReqCount` | Text | "N waiting" (code appends the suffix) | None |
| 3 | `#actionReqRepeater` | Repeater | One card per player | Visible |
| 3a | `#arAvatar` | Text (in repeater, optional) | Initials circle | None |
| 3b | `#arName` | Text (in repeater) | Player full name | None |
| 3c | `#arTeam` | Text (in repeater) | Team name | None |
| 3d | `#arNote` | Text (in repeater) | The note she sent back | None |
| 3e | `#arSentDate` | Text (in repeater) | "Sent back <date>" | None |
| 3f | `#arCopyEmailBtn` | Button (in repeater) | "Copy email" | None |
| 3g | `#arNudgeBtn` | Button (in repeater) | "Nudge" | None |

---

## State: `stateRenewals` (NEW — split out of the old `stateToDo`)

Renewal queue + the bulk season-rollover tool (**moved here from Reports** — grouped
together since it's one workflow: see who's due, optionally bulk-trigger more).

### Queue C — Renewals due  (`SP_status = Renewal Due`)

| # | Element ID | Type | Purpose | Initial State |
|---|-----------|------|---------|----------------|
| 1 | `#secRenewal` | Container | Section wrapper | Collapsed |
| 2 | `#renewalCount` | Text | Number in this queue | None |
| 3 | `#renewalRepeater` | Repeater | One card per player | Visible |
| 3a-avatar | `#renAvatar` | Text (in repeater, optional) | Initials circle, e.g. "RS" — code-computed from name, same treatment as every other queue in this tool | None |
| 3a | `#renName` | Text (in repeater) | Player full name | None |
| 3b | `#renTeam` | Text (in repeater) | Team name | None |
| 3c | `#renProgress` | Text (in repeater) | "Form: N% complete" / "Not started" | None |
| 3c-bar | `#renProgressBar` | Progress Bar (in repeater, optional) | Wix's native Progress Bar element — same as Awaiting Parent's `#invProgressBar`, code sets `.value` (0-100) and `.tooltip` | None |
| 3d | `#renDoneBtn` | Button (in repeater) | Opens **PlayerRecord** | None |
| 3e | `#renSummary` | Text (NOT in repeater) | "Showing first 10 of N…" when capped | Collapsed |
| 3f | `#renViewAllBtn` | Button (NOT in repeater) | "View list" → Find-a-Player filtered to Renewal Due | Collapsed |

**Capped Renewal queue:** after a bulk season-rollover this queue can hold ~300
not-started renewals. `#renewalRepeater` always shows up to 10 cards
(`RENEWAL_LIST_CAP`); above that, `#renSummary` + `#renViewAllBtn` also appear.

### Season rollover — bulk renewals (moved here from Reports)

| # | Element ID | Type | Purpose | Initial State |
|---|-----------|------|---------|----------------|
| 1 | `#renewTeam` | Dropdown | Team to renew (code fills options) | None |
| 2 | `#renewAgeGroup` | Dropdown | Age group to renew (code fills options) | None |
| 3 | `#renewStatus` | Text | Live preview + result message | None |
| 4 | `#renewBtn` | Button | "Send to Renewal" | None |

---

## State: `statePlayers` (Find a Player — unchanged, reskinned)

> **Scale note (300+ players, 23 teams):** starts empty with a prompt; she picks a
> team or searches a name first. Roster loaded lazily on first open of this view.

| # | Element ID | Type | Purpose | Initial State |
|---|-----------|------|---------|----------------|
| 1 | `#playerSearch` | Text Input | Search by name (live) | None |
| 2 | `#filterTeam` | Dropdown | Filter by team | None |
| 3 | `#filterAgeGroup` | Dropdown | Filter by age group | None |
| 4 | `#filterStatus` | Dropdown | Filter by status | None |
| 5 | `#filterShowLeft` | Switch | Off = hide players who've left | Unchecked |
| 6 | `#rosterCount` | Text | "N players" / capped message | None |
| 7 | `#emptyRoster` | Text | Default prompt / "No players match" | **Visible** |
| 8 | `#playerRepeater` | Repeater | One row per player | Visible |
| 8a | `#pAvatar` | Text (in repeater, optional) | Initials circle, e.g. "LH" — code-computed from name, same as the Pipeline queues | None |
| 8b | `#pName` | Text (in repeater) | Player full name | None |
| 8c | `#pTeam` | Text (in repeater) | Team / "No team" | None |
| 8d | `#pAge` | Text (in repeater) | Age group | None |
| 8e | `#pStatusBadge` | Text (in repeater) | Status badge - text colour only, see 8e-box | None |
| 8e-box | `#pStatusBadgeBox` | Container (in repeater, optional), behind 8e | Faded background tint (same hue, ~50% opacity) | None |
| 8f | `#pMedicalBadge` | Text (in repeater) | "MEDICAL" / "Clear" - text colour only, see 8f-box | None |
| 8f-box | `#pMedicalBadgeBox` | Container (in repeater, optional), behind 8f | Faded background tint | None |
| 8g | `#pTypeBadge` | Text (in repeater) | "Training Only" / "Playing" - text colour only, see 8g-box | None |
| 8g-box | `#pTypeBadgeBox` | Container (in repeater, optional), behind 8g | Faded background tint | None |
| 8h | `#pViewBtn` | Button (in repeater) | Opens **PlayerRecord** | None |
| 8i | `#pProgress` | Text (in repeater) | Form completion (Renewal/Draft rows only) | Collapsed |

---

## State: `stateStaff` (REDESIGNED 2026-08 — list + lightbox, not inline-editable, code written)

Originally ported straight from the old separate Staff Admin.js page as an
inline-editable repeater (autosaves on blur/change) — same as `stateTeams` still is.
**Redesigned to match this tool's list→lightbox pattern instead** (Rob's call, after
mocking it up): compact roster rows showing compliance as 4 small traffic-light
dots, click "View" to open the full record in its own Lightbox (`StaffRecord`), same
shape as `PlayerRecord`. Code is written (`Player Admin.js` + `backend/staffData.jsw`
+ the two new lightbox files) — see `docs/STAFF_RECORD_ELEMENTS.md` for the lightbox
itself, including the CMS findings behind its field list (which fields are real
today vs. proposed new columns) and the `StaffQuickAdd` companion lightbox for "+
Add Staff". Lazy-loaded on first visit, same pattern as the roster.

| # | Element ID | Type | Purpose | Initial State |
|---|-----------|------|---------|----------------|
| 1 | `#staffSearch` | Text Input | Search-as-you-type by name | None |
| 2 | `#staffFilterTeam` | Dropdown | Filter by team (renamed from `#filterTeam` — collides with `statePlayers`) | None |
| 3 | `#staffFilterRole` | Dropdown | Filter by club role | None |
| 4 | `#staffShowFormer` | Checkbox | "Show former staff" — now fully wired (2026-08, `status` field added). "Former" = `status` is exactly "Left the Club"; Active/Inactive/blank all count as current and show regardless. Off by default hides "Left the Club" staff. | None |
| 5 | `#staffAddBtn` | Button | Opens the `StaffQuickAdd` Lightbox (name/email/mobile/team/role) — on save it opens `StaffRecord` straight into edit mode for everything else | None |
| 6 | `#staffExportBtn` | Button | "Export Staff List" CSV (renamed from the original's `#exportSatffBtn` typo) | None |
| 7 | `#staffMeta` | Text | Summary line, e.g. "14 staff & volunteers · 3 with compliance needing attention" — or "Showing first 15 of 55 — search or filter to narrow it down" once capped (see below) | None |
| 8 | `#staffRepeater` | Repeater | One row per staff member, read-only — click View to open `StaffRecord`. Capped at 15 rows at once (`STAFF_ROSTER_CAP`) — rendering all 55+ was slow; search/filter to narrow down past the cap. | Visible |
| 8a | `#stfAvatar` | Text (in repeater) | Initials circle, same treatment as every other list in this tool — **not** the headshot photo, that only ever shows inside `StaffRecord` | None |
| 8b | `#stfName` | Text (in repeater) | Full name | None |
| 8c | `#stfMeta` | Text (in repeater) | "Role · Team" | None |
| 8d | `#stfNote` | Text (in repeater), optional | Flags what's actually wrong, e.g. "DBS expiring soon" | Collapsed |
| 8e | `#stfDbsDot` / `#stfFaDot` / `#stfSgDot` / `#stfCoachDot` | Box (in repeater) | Compliance traffic-light dots — green/amber/red. The mockup's grey "not applicable to this role" state was dropped in the real code — there's no real data field distinguishing which roles need which check, so all 4 always show a real status for every staff member. | None |
| 8f | `#stfViewBtn` | Button (in repeater) | `wixWindow.openLightbox("StaffRecord", { staffId })` | None |

The old inline-editable repeater fields (`#stfEmail`, `#stfMobile`, `#stfAddress`,
`#stfFan`, `#stfDob`, `#stfTeam`, `#stfRole`, `#stfDbsPicker`, `#stfQualTags`,
`#stfDeleteBtn`, etc.) are retired from this repeater — every one of them now lives
inside the `StaffRecord` Lightbox instead. `#stfFan` (FAN number) didn't make it
into the new record — flag if that was actually still needed, it wasn't carried
over during the redesign.

---

## State: `stateTeams` (NEW state — ported logic from the old separate Team Admin.js page)

Same story as Staff — Rob decided this should be a self-contained state here rather
than stay a separate page. **All logic unchanged from the original**, straight port,
only IDs renamed (`team`/`tm` prefixes) for naming consistency with the rest of this
file — nothing here actually collided with existing IDs, unlike Staff's `#filterTeam`.
Lazy-loaded on first visit, same pattern as the roster. Opens two existing lightboxes
by name (`AddTeamPopup`, `SquadViewer`) — those are independent objects, not page
elements, so nothing to rename there. The old
`frontend/dashboard_pages/Team Admin.js` page and its Editor page are now redundant
— safe to delete once this state is confirmed working, not required immediately.

| # | Element ID | Type | Purpose | Initial State |
|---|-----------|------|---------|----------------|
| 1 | `#teamSearch` | Dropdown | Filter by team name (populated from all team names) | None |
| 2 | `#teamFilterAgeGroup` | Dropdown | Filter by age group (renamed from `#ageGroupFilter` for consistency) | None |
| 3 | `#teamAddBtn` | Button | Opens the existing `AddTeamPopup` lightbox, inserts the new team on confirm | None |
| 4 | `#teamExportBtn` | Button | "Export Report" CSV | None |
| 5 | `#teamRepeater` | Repeater | One card per team (inline-editable, autosaves on blur/change) | Visible |
| 5a | `#tmNameInput` | Text Input (in repeater) | Team name | None |
| 5b | `#tmDivisionInput` | Text Input (in repeater) | League division | None |
| 5c | `#tmLeagueSwitch` | Switch (in repeater) | Registered with the league | None |
| 5d | `#tmManagerDrop` | Dropdown (in repeater) | Team manager (reference → `SignolStaff`) | None |
| 5e | `#tmAgeGroupDrop` | Dropdown (in repeater) | Age group (reference) | None |
| 5f | `#tmStatusBox` / `#tmStatusText` | Box + Text (in repeater) | Overall compliance: green "FULLY COMPLIANT" only if manager + every assistant clear DBS/safeguarding/coaching AND at least one holds a current First Aid cert; red "NON-COMPLIANT" otherwise | None |
| 5g | `#tmMDbs` / `#tmMFa` / `#tmMSg` / `#tmMCoach` | Box (in repeater) | Manager's own 4 compliance lights (green/red only, no label text — simpler than Staff's traffic lights) | None |
| 5h | `#tmAssistRow1`–`5` | Container (in repeater, ×5) | One row per assistant coach, hidden if there's no assistant in that slot | Hidden (`.show()`/`.hide()`) |
| 5i | `#tmAName1`–`5` | Text (in repeater, ×5) | That assistant's name | None |
| 5j | `#tmADbs1`–`5` / `#tmAFa1`–`5` / `#tmASg1`–`5` / `#tmACoach1`–`5` | Box (in repeater, ×5 each) | Each assistant's 4 compliance lights | None |
| 5k | `#tmCountLabelTrain` | Text (in repeater) | Active training-only player count | None |
| 5l | `#tmCountLabelBoth` | Text (in repeater) | Active playing-&-training player count | None |
| 5m | `#tmViewSquadBtn` | Button (in repeater) | Opens the existing `SquadViewer` lightbox for this team | None |
| 5n | `#tmDeleteBtn` | Button (in repeater) | Two-tap confirm delete | None |

---

## State: `statePayments` (NEW — GoCardless overview)

First-ever secretary-wide view of payment status — previously only visible one
player at a time via `PlayerRecord`'s fee tab. **Read-only**: acting on a row opens
`PlayerRecord`, same as every other queue — no new cancel/edit action here.

Clicking one of the top pills filters `#paymentsRepeater` to just that status -
re-slices the already-loaded list client-side (`renderPaymentsList()`), no
re-query. Click the same pill again to clear back to the full list
(`togglePaymentsFilter()`). Each pill is a **Container** (the clickable part)
wrapping its count **Text** inside, same "container behind, text on top"
pattern as the KPI cards.

| # | Element ID | Type | Purpose | Initial State |
|---|-----------|------|---------|----------------|
| 1 | `#paymentsFilterActive` | Container, clickable | Wraps 1a - click filters the list to Active only, click again to clear | None |
| 1a | `#paymentsCountActive` | Text (inside 1) | Active subscriptions count | None |
| 2 | `#paymentsFilterPending` | Container, clickable | Wraps 2a - click filters to Pending only | None |
| 2a | `#paymentsCountPending` | Text (inside 2) | Pending setup count | None |
| 3 | `#paymentsFilterFailed` | Container, clickable | Wraps 3a - click filters to Failed only | None |
| 3a | `#paymentsCountFailed` | Text (inside 3) | Failed-payment count | None |
| 3b | `#paymentsFilterNote` | Text (optional) | "Showing Failed only — tap the pill again to clear" - shown only while a filter's active | Collapsed |
| 4 | `#emptyPayments` | Text | Shown when no subscriptions exist yet (or no rows match the active filter) | Collapsed |
| 5 | `#paymentsRepeater` | Repeater | One row per player with a GoCardless subscription (most recent per player, failed/pending sorted first) | Visible |
| 5a-avatar | `#payAvatar` | Text (in repeater, optional) | Initials circle, e.g. "LH" — code-computed by splitting `playerName` (this data has no separate first/last fields like a raw player record) | None |
| 5a | `#payName` | Text (in repeater) | Player name (from `sub.playerName`) | None |
| 5b | `#payTeam` | Text (in repeater) | Team name | None |
| 5b-amount | `#payAmount` | Text (in repeater, optional) | "£20.00/mo" — the monthly amount, from `sub.perPayment` (already on the same record, no extra query). Full payment history/schedule still lives on PlayerRecord's fee tab, not here - this page stays a quick status overview | None |
| 5b-ticks | `#payRowTicks` | Text (in repeater, optional) | Small coloured dots with a tiny month-initial under each, one per month of THIS PLAYER'S own instalment schedule (2026-08-11: not always Jul-Apr - a late-starting/one-off schedule shows its real months, e.g. Aug-May) - green paid / red failed / amber due now / grey-dashed not due yet. Set via **`.html`**, not `.text` - code renders the whole strip as one rich-text block (`tickStripHtml()` in Player Admin.js), same technique `Teams.js` already uses, so this is ONE element rather than one per month | None |
| 5c | `#payStatusBadge` | Text (in repeater) | "Payment Failed" (red) / "Active" (green) / "Pending Activation" (amber, mandate submitted but not active yet) / "Not Set Up" (amber, fee category saved on the player but no GoCardless subscription started at all - 2026-08) / "Cancelled"/"Ended" (grey) - text colour only, see 5c-box | None |
| 5c-box | `#payStatusBadgeBox` | Container (in repeater, optional), behind 5c | Faded background tint (same hue, ~50% opacity) | None |
| 5d | `#payViewBtn` | Button (in repeater) | "View →" — opens **PlayerRecord** (fee tab) | None |

Backend: `getSecretaryPaymentsOverview()` in `backend/registration.jsw` — reads
`GoCardlessSubscriptions`, keeps only the most recent row per player, joins to
`SignolPlayers`/`Teams` for display names. Also now fetches the season's
`GoCardlessPayments` once (2026-08) and buckets it per player for `#payRowTicks`
above - reuses the same rows already pulled for the Reports "Collected by
Month" chart, no extra query added.

---

## State: `stateReports` (CSV Exports — bulk renewal moved out, income chart moved in)

| # | Element ID | Type | Purpose | Initial State |
|---|-----------|------|---------|----------------|
| 1 | `#exportAllBtn` | Button | "Export Full Register" → all current players CSV | None |
| 2 | `#exportFaBtn` | Button | "Export FA To-Do" → Ready-for-FA players CSV | None |
| 3 | `#exportLeaversBtn` | Button | "Export Leavers" → all Left players CSV | None |
| — | ~~`#retryStuckPaymentsBtn`~~ | — | **Un-wired 2026-08-11** — built for the 10 Aug incident (a live mandate with the subscription-creation step silently failing), but sat as an unexplained bare button with no context for the secretary. The underlying function (`retryStuckSubscriptions()` in `backend/registration.jsw`) is untouched and still callable - re-wire a button to it in minutes if this failure mode ever needs a manual fix again. Not currently reachable from the UI. |

The season-rollover bulk-renewal tool that used to live here has **moved to
`stateRenewals`** (see above) — it fits that workflow better and this season's
priority is renewals specifically.

### Collected by Month chart (10 vertical bars, moved here from the Dashboard)

Real paid amounts from `GoCardlessPayments`, one bar per season month (Jul → Apr).
Was originally going to live on the Dashboard, moved here instead (Rob's call,
2026-08) — fits "reports" better than a daily-glance widget. Will be mostly empty
early in the season — expected, not a bug, fills in as months pass. Not clickable.
**Lazy-rendered on first visit to this state** (reuses `paymentsData` already
fetched on page load — see `loadPayments()`/`showView()` — no second query).

| # | Element ID | Type | Purpose | Initial State |
|---|-----------|------|---------|----------------|
| 1 | `#barJul` | Box | July collected | Build tall (see note below) |
| 2 | `#barAug` | Box | August collected | Same starting height/Y as #1 |
| 3 | `#barSep` | Box | September collected | Same starting height/Y as #1 |
| 4 | `#barOct` | Box | October collected | Same starting height/Y as #1 |
| 5 | `#barNov` | Box | November collected | Same starting height/Y as #1 |
| 6 | `#barDec` | Box | December collected | Same starting height/Y as #1 |
| 7 | `#barJan` | Box | January collected | Same starting height/Y as #1 |
| 8 | `#barFeb` | Box | February collected | Same starting height/Y as #1 |
| 9 | `#barMar` | Box | March collected | Same starting height/Y as #1 |
| 10 | `#barApr` | Box | April collected | Same starting height/Y as #1 |

**How the bars actually move — important to build correctly:** these are plain
Boxes; code sets `height` AND `y` together so each bar grows *upward* from a fixed
bottom edge, not stretches *downward* from a fixed top. The chart reads its **first**
bar's (`#barJul`'s) as-built height + position as the "100%" ceiling, then scales
the rest down from there. So: **build every bar at the exact same starting height
and Y position** — easiest way is to build `#barJul`, then duplicate it sideways
for the other 9, without resizing or repositioning vertically. Month labels
underneath each bar are static text, no ID needed — they never change.

---

## State: `stateFixtures` (NEW — empty placeholder)

Just needs to exist and be reachable via `#navFixtures` for now — **no content
built here yet**. The actual Fixtures feature (managers create Training/Match/
Tournament/Event fixtures, parents RSVP) is a separate, already-written parked plan
in `docs/fixtures.md` that hasn't been started. When that work happens, build its
secretary-facing content into this state rather than creating a new one.

---

## Backend functions (in `backend/exportCsv.jsw` and `backend/registration.jsw`)

| Function | Used by | Returns |
|----------|---------|---------|
| `getPlayersExportUrl(scope)` | the 3 export buttons (`all` / `fa` / `leavers`) | a CSV download URL |
| `getPlayerFaFiles(playerId)` | the FA download buttons (in PlayerRecord) | `{ photoUrl, documentUrl }` |
| `getSecretaryPaymentsOverview()` | `statePayments`, the Dashboard's Payments KPI/widget, and the Collected-by-Month chart | `{ activeCount, pendingCount, failedCount, items[], monthlyIncome[], thisMonthCollected }` — `monthlyIncome` is `[{ month: "Jul", amount: 0 }, ...]`, 10 entries, current season only; `thisMonthCollected` is just the current calendar month's figure, computed server-side to avoid any month-name-format mismatch with the frontend. Each `items[]` row also carries `monthlyTicks` (2026-08, months corrected 2026-08-11) - `[{ month: "Aug", status: "paid" }, ...]`, one entry per instalment in THAT PLAYER'S own schedule (starting month + count come from their `GoCardlessSubscriptions` row's `firstDate`/`scheduleCount`, not a fixed Jul-Apr assumption), `status` is `paid`/`failed`/`due`/`future` - feeds `#payRowTicks` |
| `getStaffExportUrl()` | `stateStaff`'s `#staffExportBtn` | a CSV download URL |
| `getTeamsExportUrl()` | `stateTeams`'s `#teamExportBtn` | a CSV download URL |
| `getStaffComplianceOverview()` | the Dashboard's Qualifications grid | `{ counts: { dbs, firstAid, safeguarding, coaching } }`, each `{ expired, oneMonth, threeMonths, compliant }` |
| `getCurrentSeasonLabel()` | the top bar's `#seasonLabel` | the current season string, e.g. `"2026-27"` |

---

## Status reference (ClubDictionary IDs used by the code)

| Label shown | Constant | Secretary action |
|-------------|----------|------------------|
| Enquiry | `ENQUIRY_STATUS_ID` | (manager handles) |
| On Trial | `TRIAL_STATUS_ID` | (manager handles) |
| Awaiting Parent | `INVITED_STATUS_ID` | FYI — waiting on parent to complete form |
| Ready for FA | `READY_FOR_FA_ID` | Register with FA → Mark FA Registered |
| FA Registered | `FA_COMPLETE_ID` | Make Active |
| Active | `Active_ID` | In the squad |
| Renewal Due | `RENEWAL_STATUS_ID` | Parent re-completes the form (tracked in `stateRenewals`) |
| Action Required | `ACTION_REQUIRED_ID` | Sent back to parent to fix |
| Left Club | `LEFT_STATUS_ID` | Confirm removed from FA |

## Possible future additions (not built)
- Recent Activity widget on `stateDashboard` (needs an activity-log data source).
- Secretary-triggered payment actions (cancel/retry) directly from `statePayments` —
  currently read-only, action still routes through `PlayerRecord`.
- Extending this same visual system to `Team Admin.js` and the (not yet built)
  Fixtures page.
