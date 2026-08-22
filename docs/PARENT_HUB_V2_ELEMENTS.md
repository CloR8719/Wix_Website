# Parent Hub v2 — Element Reference (build on a new, hidden page)

Blueprint for the redesigned Parent Hub — mobile-first, persistent nav (bottom
tabs on mobile / mini rail on web via Wix's own Mobile View, **not** a second
set of elements), a stepped Registration wizard, and a tabbed Profile.
Matches the artifact mockup at `https://claude.ai/code/artifact/782886ae-1740-48a5-87b1-54aaeee3c3b8`.

**Build this on a new page** (e.g. "Parent Hub v2") — Members Only permissions,
not in the site menu, noindex. Leave `frontend/members_pages/Parent Hub.js`
and its page untouched until cutover. New page code file lives alongside it,
e.g. `frontend/members_pages/Parent Hub v2.js`.

**Architecture change from v1:** the old page's progress bar / Save Draft
button live in the site's shared **masterPage header**, which is why
`public/parentHubProgressBar.js` needs the wix-storage-frontend polling
bridge (`public/*.js` vars aren't shared between masterPage.js and page code).
v2's topbar (title/back button/progress bar/save draft) is a **self-contained
app shell unique to this page** — build it as page-level elements here, pinned
to the top, not in masterPage. That removes the bridge/polling pattern
entirely for v2; `handleSaveDraftFromHeader`-equivalent logic can just be a
normal `$w("#vhSaveDraftBtn").onClick()` in this page's own code.

**Dropped from v1 (2026-08-13):**
- `#regfirstName` / `#reglastName` — both were write-only display Text
  elements showing the same data as `#regfullname` (which is just
  `SP_firstName + " " + SP_lastName`). Nothing in v1 ever read them back, so
  showing all three on one step was pure duplication. v2 builds
  `#regfullname` only.
- `#regagegroup` — `Teams` has its own `AG_ageGroup` reference, so the age
  group is derivable from the team, and Rob's team names carry it anyway.
  Note the one case where they genuinely differ: `SignolPlayers.ageGroup` is
  the player's DOB-derived bracket (AgeGroup has `dobStart`/`dobEnd`) while
  `Teams.AG_ageGroup` is the team's — a kid playing up (DOB-U10 in a U11
  side) has two different values. Deliberately not surfaced to parents here;
  Profile's Overview tab is the better home if it's ever needed.

**Reuse note:** most Registration and Profile field element IDs below are
copy-pasted unchanged from the current `PARENT_HUB_ELEMENTS.md` — same names,
same types, same CMS fields. `mapUItoPlayer`, `calculateProgress`,
`validateRequiredFields`, and `loadProfileForm`'s field population carry over
almost line-for-line; only the navigation shell and step/tab wiring are new
code. Element IDs are scoped per-page in Wix, so reusing identical names on
this new page doesn't collide with the live page.

**Initial State key:** `Visible` / `Collapsed` (`.collapse()`/`.expand()`) /
`Hidden` (`.hide()`/`.show()`) / `None` (leave default, code doesn't toggle on load).

---

## Root / Always Visible

| # | Element ID | Type | Purpose | Initial State |
|---|-----------|------|---------|----------------|
| 1 | `#stateboxHub2` | Multi-State Box | Holds all 8 states below | Default = `stateHome` |
| 2 | `#vhBackBtn` | Button | Back arrow — visible only on drill-down states (Registration/Profile/PaymentDetail) | Collapsed |
| 3 | `#vhTitle` | Text | Current section title (code-set per state) | None |
| 4 | `#vhSubtitle` | Text | Current section subtitle | None |
| 5 | `#vhCrest` | Vector Art/Image | Club crest in the topbar — clickable, links to the main site's home page. Header/footer are removed on this page (deliberate, keeps the app-like feel), so this is the one subtle "way back" — no prominent website-home button. | None |

**Save Draft moved 2026-08-11:** it now lives in the Registration step
bar (`#regSaveDraftBtn`, see `stateRegistration` below), not the topbar —
the topbar can scroll out of reach while filling in a step, but the step
bar is sticky-bottom, so Save Draft stays reachable without scrolling up.

### Nav (5 buttons — same elements repositioned bottom↔rail via Wix's Mobile View, not rebuilt)

Same as your Secretary sidebar — a **Button** with a built-in icon + label
covers each nav item on its own, no separate circle or text needed. The only
exception is Messages, which needs one extra small element for the unread
count badge (a completely different thing from the icon — it's a number
bubble that shows/hides independently, not part of "the icon" at all).

| # | Element ID | Type | Purpose | Initial State |
|---|-----------|------|---------|----------------|
| 1 | `#navHomeBtn` | Button (icon + label built in) | → `stateHome` | Active by default |
| 2 | `#navMessagesBtn` | Button (icon + label built in) | → `stateMessages` | None |
| 2a | `#navMessagesBadge` | Text | Unread count bubble, layered on/near `#navMessagesBtn` | Collapsed (code shows if >0) |
| 3 | `#navFixturesBtn` | Button (icon + label built in) | → `stateFixtures` | None |
| 4 | `#navPaymentsBtn` | Button (icon + label built in) | → `statePayments` | None |
| 5 | `#navMoreBtn` | Button (icon + label built in) | → `stateMore` | None |

In the Editor: build these on Desktop as a vertical rail — matches the final
desktop layout directly — then switch to **Mobile View** and reposition the
group into a bottom row. Same buttons, same click handlers, no duplicates.

---

## State: stateHome *(Custom Element — converted 2026-08-16)*

**Built as one custom element**, `#customHome` / `<parent-hub-home>`, source
`public/custom-elements/parentHubHome.js`. Second state converted, after
`stateMore`. The element tables below are kept as a record of what it
replaced — **those elements are deleted**; don't rebuild them.

| Setting | Value |
|---------|-------|
| Tag name | `parent-hub-home` |
| Element ID | `#customHome` |
| Source | `public/custom-elements/parentHubHome.js` |

**Nothing on this state is native any more** — the Find My Child flow (Fan
Number / DOB lookup, confirm step, and the "can't find my child" request form)
is inside the element too.

**The date field got better in the process.** A real `<input type="date">`
opens the OS date wheel on a phone and hands back a local `YYYY-MM-DD` string —
exactly what `findPlayerByFanNumberAndDob` takes. The Wix Date Picker returned
a `Date` that had to be hand-formatted to avoid `toISOString()`'s timezone
shift; that hazard is gone.

**The lookup panel is built once and never rebuilt.** `paintLookup()` only
toggles classes and sets text. Repaints fire whenever a payment status or
fixture lookup lands, and rebuilding the markup would wipe a half-typed Fan
Number each time. The element also owns two pieces of UI state page code can't
see — whether the panel is open, and whether the request form is revealed — so
they survive those repaints. Page code can only *force* the panel open
(`lookup.open`), which is what a parent with nothing linked needs.

The request form still has **no backend** (see the `project_secretary_link_queue`
memory); `submitLinkRequest` currently just logs its payload and shows the
thank-you. The payload it needs is already assembled.

**Deliberate differences from the native version:**

- **Status is a pill, not coloured text.** The native version relied on colour
  alone (amber/red/green), which disappears in greyscale and for anyone who
  can't separate amber from red. Same six states, same hues, shape as well.
- **Cards go two-across above 750px** via `auto-fit`, so one child gets a
  full-width card rather than a half-width one beside a hole.
- **"This Week" disappears entirely** when nobody has a fixture, rather than
  leaving a heading over an empty repeater.

**`{ loading: true }` must be set synchronously in `onReady`, before the
awaits.** There are three sequential round-trips before real kids land, and
without it the element shows its own mock data — *another family's children* —
for that whole window. The element replaces its data wholesale rather than
merging over the mock, for the same reason.

**Two-pass rendering.** Cards render immediately; payment labels
(`getGoCardlessStatus`, one call per child) and fixture teasers land after and
patch `homeModel`, then repaint. Each checks a `homeGeneration` counter first
so a late reply from a previous `loadDashboard` can't overwrite fresh data.

---

### What it replaced *(historical — these elements are gone)*

Reuses the current dashboard's kids list wholesale — same repeater, same fields.

**Two separate layers of heading text here — don't confuse them:**
`#vhTitle`/`#vhSubtitle` (topbar, Root section above) are generic nav-bar
labels that change with every state switch ("Home", "Registration Form",
etc.). These two are a second, page-body heading specific to `stateHome`,
personalized rather than generic — same idea as v1's `#textWelcome`, kept
rather than replaced with static text.

| # | Element ID | Type | Purpose | Initial State |
|---|-----------|------|---------|----------------|
| 0 | `#textWelcome` | Text | "Welcome back, [Parent Name]" — reused unchanged from v1 | None |
| 0a | `#textWelcomeSub` | Text | "Everything for [Kid1] & [Kid2] in one place" — new, code-built from the linked kids' first names once `#repeaterKids` loads | None |

**`#boxAlert` and `#textNoKids` merged 2026-08-12** — in the real code
(`loadDashboard`) these are already mutually exclusive: zero linked kids
collapses `#boxAlert` and shows the no-kids message; having kids collapses
the no-kids message and shows `#boxAlert` only if one needs action. They
never appear together, so one Container covers both — code just swaps its
text/colour depending which case applies (no-kids reads as a neutral welcome
message, action-required as a genuine amber/red alert, not the same styling
forced onto both).

**Icon elements dropped 2026-08-14.** An earlier draft had two stacked Vector
Art icons (`#iconAlertTriangle` / `#iconAlertCircle`) toggled per case — but
the action-required message text already opens with a ⚠️ emoji, so they
duplicated it. The red-vs-amber container colour carries the distinction on
its own, and the no-kids welcome message deliberately has no emoji since it
isn't a warning. Code still guards both IDs, so re-adding them later works
without a code change. Colour convention matches the existing statuses
(`INVITED`/`RENEWAL`/`DRAFT` = amber "get started", `ACTION_REQUIRED` = red
"fix this").

| # | Element ID | Type | Purpose | Initial State |
|---|-----------|------|---------|----------------|
| 1 | `#boxHomeBanner` | Container | Either the Action Required alert or the no-kids welcome message — never both. Border/background colour set by code (red or amber) to match whichever is showing. | Collapsed |
| 1a | `#textHomeBanner` | Text (inside `#boxHomeBanner`) | The message itself — count of outstanding forms, or the no-kids welcome text | None |
| 1d | `#textKidsLoading` | Text | "Loading your children…" — shown while the dashboard fetches, hidden once `#repeaterKids` has data (or on error/no-kids, so nobody is stranded on it). Optional/guarded. Exists because there are three *sequential* backend round-trips before real data lands (`hubEmailSweep` → profile lookup → `getKidsForParent`, each depending on the last), and Wix shows the repeater's Editor placeholder rows for that entire window. Same pattern as Player Admin's staff list. | Visible |
| 2 | `#repeaterKids` | Repeater | One card per linked child. Code collapses it on load and expands it once data arrives — see `#textKidsLoading` above. | Visible |
| 2a | `#textKidName` | Text (in repeater) | Child's full name | None |
| 2b | `#textSquad` | Text (in repeater) | Team name / "Squad Unassigned" | None |
| 2c | `#kidAvatarCircle` | Container (in repeater) | Coloured circle — initials avatar, same pattern as `#prAvatar` in Player Record. Photo intentionally NOT shown here; the real headshot only appears on `#profileHeadshot` in `stateProfile`. | None |
| 2c-i | `#kidAvatarInitials` | Text (inside `#kidAvatarCircle`) | Initials, code-computed from `SP_firstName`/`SP_lastName` (e.g. "OB") | None |
| 2d | `#textStatus` | Text (in repeater) | Status label, colour-coded | None |
| 2e | `#btnAction` | Button (in repeater) | → `stateRegistration` or `stateProfile` | None |
| 2f | `#btnPayment` | Button (in repeater) | → `statePaymentDetail`. Guard on `.id`. | Collapsed |
**Repeater, not a single card (fixed 2026-08-12)** — a static card can only ever
show one fixture, so a parent with kids on different teams would have one
kid's upcoming fixture silently never surface. One teaser card per kid (or per
distinct team, if two kids share one, to avoid showing the same fixture twice).

| # | Element ID | Type | Purpose | Initial State |
|---|-----------|------|---------|----------------|
| 3 | `#repeaterFixtureTeaser` | Repeater | One "next up" card per kid/team with an upcoming fixture. Whole repeater collapses if nobody has one. | Collapsed |
| 3a | `#teaserIcon` | Vector Art (in repeater) | Small calendar icon on the left | None |
| 3b | `#teaserFixtureTitle` | Text (in repeater) | Bold line — "Next up: Freya vs Hale Barns Juniors" | None |
| 3c | `#teaserFixtureMeta` | Text (in repeater) | Smaller line below the title — date, time, AND Home/Away combined in one line (e.g. "Sat 16 Aug · 10:00 KO · Home") — **not** the same layout as the Fixtures tab's own cards, which split these out separately | None |
| 3d | `#teaserRsvpStatus` | Container (in repeater) | Pill background — colour set by code | None |
| 3d-i | `#teaserRsvpStatusText` | Text (inside `#teaserRsvpStatus`) | "Confirmed" / "Declined" / "Confirmation Required" — code can only set `.text` on the Text element, not the Container, so this needs its own ID | None |
| 3e | `#teaserCtaBtn` | Button (in repeater) | The one actionable control — label/action depends on RSVP state: **"Confirm Attendance"** → `stateFixtures` if `#teaserRsvpStatus` is pending, otherwise just a plain "View Fixtures" link. Only tap target on the card — keeps it to one clear action, not "the whole card is vaguely clickable". | None |

**Structure: one outer container, two inner containers.** `#boxFanLookup` is
the big wrapper — it's the thing that's collapsed/expanded (auto-open if zero
kids linked, or via `#btnAddAnotherChild` if they already have 1+). Inside it,
two smaller containers:
- `#boxLookupFields` (5a-5c) — Fan Number, DOB, search button. **Doesn't need
  its own collapse toggle** — stays Visible the whole time the outer box is
  open, even after a match is found (the real v1 code never hides these).
- `#boxConfirmLink` (7-7c) — "Is this your child?" step. **This one does**
  toggle — Collapsed until `#btnLinkByFanDob` actually finds a match.

| # | Element ID | Type | Purpose | Initial State |
|---|-----------|------|---------|----------------|
| 5 | `#boxFanLookup` | Container | Outer wrapper for the whole Find My Child flow | Collapsed |
| 5-inner | `#boxLookupFields` | Container (inside `#boxFanLookup`) | Wraps 5a-5c below | Visible |
| 5a | `#inputFanNumber` | Text/Number Input | Fan Number | None |
| 5b | `#inputDobLookup` | Date Picker | Player DOB | None |
| 5c | `#btnLinkByFanDob` | Button | Runs preview lookup | None |
| 6 | `#txtLinkResult` | Text | Error / status message | Collapsed |
| 7 | `#boxConfirmLink` | Container (inside `#boxFanLookup`) | "Is this your child?" confirm step | Collapsed |
| 7a | `#txtConfirmLink` | Text | Match summary | None |
| 7b | `#btnConfirmLink` | Button | Confirms link | None |
| 7c | `#btnCancelLink` | Button | Cancels | None |
| 8 | `#btnAddAnotherChild` | Button | Re-opens `#boxFanLookup` | Collapsed |

### Can't Find My Child — manual link request (new 2026-08-11)

FAN Number/DOB (and Membership Number, once assigned) covers self-serve
linking, but a child invited under a mismatched parent email has **neither**
until the parent's own first form save — no safe secret left to search by.
Below that threshold, the safe answer is routing to the secretary for manual
identity verification, not a weaker (guessable) self-serve lookup. This just
writes a request row for the secretary to action — see
`project_secretary_link_queue` memory for the Player Admin side, not started yet.

| # | Element ID | Type | Purpose | Initial State |
|---|-----------|------|---------|----------------|
| 1 | `#btnCantFindChild` | Button/Link | "Still can't find your child?" — reveals `#boxLinkRequest`. Sits below `#boxFanLookup`. | None |
| 2 | `#boxLinkRequest` | Container | The request form | Collapsed |
| 2a | `#inputRequestChildName` | Text Input | Child's name (best guess) | None |
| 2b | `#inputRequestChildDob` | Date Picker | DOB they tried — prefill from `#inputDobLookup` if already entered | None |
| 2c | `#inputRequestNotes` | Text Input (multiline) | Optional context — team, previous club, anything that helps identify them | None |
| 3 | `#btnSubmitLinkRequest` | Button | Submits — writes to the new request queue (backend function TBD, Player Admin side not built yet) | None |
| 4 | `#txtLinkRequestConfirm` | Text | "Thanks — the club will be in touch to help link your child." | Collapsed |

---

## State: stateMessages *(Custom Element — no backend yet)*

No CMS collection for messages exists. Runs on mock data inside the element
until one does.

**This state is the Custom Element experiment** (2026-08-15) — the whole tab
is one element rendered from code, instead of a repeater plus five hand-placed
inner elements. Compare the effort here against a native state before deciding
whether to convert any others.

| # | Element ID | Type | Purpose | Initial State |
|---|-----------|------|---------|----------------|
| 1 | `#customMessages` | Custom Element | Renders the entire message list | Visible |

**Custom Element settings in the Editor:**

| Setting | Value |
|---------|-------|
| Tag name | `parent-hub-messages` |
| Source file | `public/custom-elements/parentHubMessages.js` |

The source file must be created **inside the Wix Editor's Public folder** —
this repo is a manual mirror and doesn't sync to the site, so a file that
only exists locally won't appear in the source picker.

**Wiring (page code):** the element is isolated from `$w`, so data goes in as
an attribute and interactions come back as events:

```js
$w("#customMessages").setAttribute("messages", JSON.stringify(rows));
$w("#customMessages").on("messageSelected", (event) => { /* event.detail.message */ });
```

Neither call is in `Parent Hub v2.js` yet — the element self-renders from its
own mock data, so the tab works without page code until there's real data.

---

## State: stateFixtures *(placeholder — no backend yet, matches parked Fixtures/RSVP feature)*

Depends on the Manager Hub fixture-entry work and a CMS schema that don't
exist yet. Build the shell now with mock/static rows; connect real data once
that's built.

| # | Element ID | Type | Purpose | Initial State |
|---|-----------|------|---------|----------------|
| 1 | `#fixtureFilterDropdown` | Dropdown | Filter by child/team ("All" + one per kid) | None |
| 2 | `#repeaterFixtures` | Repeater | Upcoming + recent fixtures | Visible |
| 2a-i | `#fixtureKidTag` | Text (in repeater) | Which child this fixture is for, e.g. "Freya" — small pill next to the competition line. Needed because the repeater can show fixtures for every linked child together (unfiltered/"All"), so "League · U9 Colts" alone doesn't say whose match it is. | None |
| 2a | `#fixtureTeams` | Text (in repeater) | "[Team] vs [Opponent]" | None |
| 2b | `#fixtureMeta` | Text (in repeater) | Date/time/venue | None |
| 2c | `#fixtureHomeAway` | Text (in repeater) | Home/Away tag | None |
| 2g | `#fixtureRsvpStatus` | Container (in repeater) | Pill background — colour set by code. Sits next to the Home/Away tag | None (upcoming fixtures only) |
| 2g-i | `#fixtureRsvpStatusText` | Text (inside `#fixtureRsvpStatus`) | "Confirmed" / "Declined" / "Confirmation Required" — separate ID from the container, same reasoning as `#teaserRsvpStatusText`. Updates the instant Yes/No below is tapped | None |
| 2d | `#btnRsvpYes` | Button (in repeater) | Sets `#fixtureRsvpStatus` to Confirmed | None |
| 2e | `#btnRsvpNo` | Button (in repeater) | Sets `#fixtureRsvpStatus` to Declined | None |
| 2f | `#fixtureResult` | Text (in repeater) | Result, for past fixtures — RSVP row/status collapse here instead | Collapsed |

---

## State: statePayments (hub — new)

One row per kid, reusing the same fee/GoCardless lookups the old dashboard
card used per-item.

| # | Element ID | Type | Purpose | Initial State |
|---|-----------|------|---------|----------------|
| 1 | `#repeaterPaymentsHub` | Repeater | One row per linked child | Visible |
| 1a | `#payHubName` | Text (in repeater) | Child's name | None |
| 1b | `#payHubStatusPill` | Container (in repeater) | Pill background — colour set by code | None |
| 1b-i | `#payHubStatusPillText` | Text (inside `#payHubStatusPill`) | "Active" / "Not Set Up" / "Failed" etc. — separate ID from the container, same reasoning as the RSVP status pills above | None |
| 1c | `#payHubNext` | Text (in repeater) | "Next payment [date] · £X" or setup prompt | None |
| 1d | `#payHubRow` | Container (in repeater) | Whole-row click target → `statePaymentDetail` | None |

## State: statePaymentDetail

Unchanged from v1's `statePayment` — same fields, same `loadPaymentState`/
`renderPaymentAction` logic. Back button returns to whichever tab launched it
(Home or Payments hub), not always Home — track that the way the mockup does
(remember `currentTab` before drilling in).

| # | Element ID | Type | Purpose | Initial State |
|---|-----------|------|---------|----------------|
| 1 | `#textPaymentKidName` | Text | Child's name | None |
| 2 | `#textPaymentPlanLabel` | Text | Fee tier name | None |
| 3 | `#textPaymentSchedule` | Text | "N payments of £X..." | None |
| 4 | `#boxPaymentStatus` | Container | The status card wrapping `#textPaymentStatus`. Background + border colour set by code from the plan's state: green Active / blue In Progress / red Failed / amber Not Set Up or Plan Changed / grey Awaiting club. Same `resolvePayPill()` mapping that colours the hub row pills, so a plan can't read one state in the list and another on its own page. | None |
| 4a | `#textPaymentStatus` | Text (inside `#boxPaymentStatus`) | The message itself — stays dark for legibility against the tinted card. No separate status *word* here: the sentence already says what's happening, so a pill beside it would just repeat itself. | None |
| 5 | `#btnSetupPayment` | Button | Starts GoCardless setup | Collapsed |
| 6 | `#btnCancelOldPlan` | Button | Cancels a mismatched-tier plan | Collapsed |

---

## State: stateMore *(Custom Element — the A/B winner, 2026-08-16)*

Catch-all for account-level things that aren't about any one child — this is
also where **My Details** belongs (v1 had it on the dashboard; it's not
child-specific so it never fit the new tab/drill-down structure otherwise).

**Built as a single custom element.** It was first added alongside the native
version as `stateMore2` and run as an A/B; the custom element won and the
native one was deleted on 2026-08-16, along with `#repeaterTeamContacts`,
`#contactTeamName`, `#contactManagerName`, `#contactManagerDetail`,
`#moreSecretaryContact`, `#btnEditMyDetails`, `#boxMyDetails`, `#inputMyName`,
`#inputMyPhone`, `#inputMyEmail`, `#btnSaveMyDetails`, `#btnLogout`,
`#btnVisitWebsite` and `#navMoreBtn2`. **This is the first state fully
converted** — the template for every conversion that follows.

Behaviour carried over from the native version unchanged: My Details still
saves through `secureUpdateParentProfile`, which syncs name/phone/email to
*every* linked child.

**Email is edited HERE and nowhere else (2026-08-15).** Profile → Edit
Details' `#txtLockedParentEmail` is permanently read-only and no longer saved.
Reason: this call syncs to every linked child, whereas the Profile field only
changed one — so a parent could have ended up with a different contact email
on each of their kids.

**Documents** are configured in the `DOCUMENTS` const at the top of
`parentHubMore.js` (label / meta / Media Manager URL), not as Editor buttons.
There's no CMS collection behind them.

| # | Element ID | Type | Purpose | Initial State |
|---|-----------|------|---------|----------------|
| 1 | `#customMore` | Custom Element | My Details (inputs + save), Club Contacts, Documents, **Account (Log Out + Visit Our Website)** | Visible |
| 2 | `#btnLogout2` | Button | *Optional backstop only.* Superseded by the element's own Log Out row — delete it unless you want cover for the element's source file failing to load. Page code wires it if present and no-ops if not. | None |

**Reaching an unfinished page to test it (2026-08-16).** Custom elements don't
render in the Editor or in Preview, and `tel:`/`mailto:` taps and real data
volumes only behave honestly on a real handset against the live site — so the
only way to properly test one is to publish it. `public/betaAccess.js`
(`BETA_EMAILS` + `isBetaTester(member)`) controls `#btnParentHubV2`, a header
button built in `masterPage.js` alongside `#btnSecretaryDashboard` (link set in
the Editor, code controls visibility only). Parent Hub v2 is hidden from the
site menu while it's being built, so without it there'd be no way in on a
phone.

`showBetaFeatures` in the page code is currently unused — More was promoted to
the real tab — but is kept ready for the next conversion. **The pattern worth
repeating:** collapse the nav item *before* the member lookup so errors fail
closed, and gate the state's **data load** as well as its button. Ungated,
`stateMore2` made every parent pay for a second round of
`getTeamManager`/`getClubOfficials` to fill a tab they couldn't open.

⚠️ Cosmetic, not security — it collapses a button, it doesn't protect data.
Fine for this (nothing behind the gate is data a parent can't already see), but
never reuse this pattern to hide something a parent shouldn't be able to read.
Note this hides the *link*, not the page: Parent Hub v2 is reachable by anyone
who knows its URL. It's a members-only page, so a logged-in parent could open
it — acceptable while it shows nothing v1 doesn't, but worth remembering if a
future beta state ever shows something sensitive.

When v2 goes live: empty `BETA_EMAILS`, delete `#btnParentHubV2` and
`updateBetaHubButton()`, and put the page back in the normal menu.

**Custom Element settings in the Editor:**

| Setting | Value |
|---------|-------|
| Tag name | `parent-hub-more` |
| Source file | `public/custom-elements/parentHubMore.js` |

Give it ~700px height to start — custom elements don't auto-size in Wix and
overflow clips silently.

**Account rows moved inside the element (2026-08-16).** They were originally
native buttons underneath, so a render failure couldn't strand a parent on a
page with no header or footer. Keeping them outside meant hand-positioning two
buttons in the mobile editor after every layout change, which is the manual
work this whole approach is meant to remove — so the risk was taken knowingly.
Two mitigations inside the element: *Visit Our Website* is a plain `<a href>`
that survives any JS failure, and `build()` falls back to a bare pair of
account links if the rich UI throws. Neither covers the source file failing to
load at all — keep `#btnLogout2` on the page if you want cover for that.

**Data contract** — one attribute in, two events out:

```js
$w("#customMore").setAttribute("data", JSON.stringify({
    me:           { name, phone, email },
    teamContacts: [{ teamName, managerName, managerPhone, managerEmail }],
    officials:    [{ role, fullName, mobile, emailAddress }],
    documents:    [{ label, meta, url }]   // optional; omit to use the file's own list
}));

$w("#customMore").on("saveMyDetails", async (event) => {
    const { name, phone, email } = event.detail;
    const result = await secureUpdateParentProfile(name, phone, email);
    $w("#customMore").setAttribute("savestate", result.success ? "saved" : "error");
});

// Required wiring — the only exit off a header-less page.
$w("#customMore").on("logout", async () => {
    await authentication.logout();
    wixLocationFrontend.to("/");
});
```

The element sets `savestate="saving"` itself on submit and does its own
required/format validation, so page code only reports the outcome. Optional
`savemessage` attribute overrides the status text.

`logout` has no reply attribute — a successful logout navigates away, so
there's nothing left to paint. If page code doesn't respond within 5 seconds
the element assumes the listener is missing, restores the row and shows a
manual escape link.

Optional `websiteurl` attribute repoints *Visit Our Website*; it defaults to
`/` (relative on purpose, so test and preview domains don't bounce testers
onto production).

`officials` comes from **`getClubOfficials()`** in `backend/staffData.jsw`
(new 2026-08-16), which returns that shape directly. It resolves role names
against `ClubRoles.CR_role` — case-insensitive, but the spelling must exist,
so "Chairman" won't match a row labelled "Chair".

`documents` has no CMS behind it — edit the `DOCUMENTS` array at the top of
the element file, pasting Media Manager URLs. Rows with an empty `url` are
hidden.

Wiring lives in `loadMoreState()` / `setupMoreWiring()` in `Parent Hub v2.js`
(renamed from `loadMore2State`/`setupMore2Wiring` when the native version was
deleted on 2026-08-16).

**Contact rows are two controls side by side** (revised 2026-08-16 — copy used
to be desktop-only):

| Half | Behaviour |
|---|---|
| Row body | Touch: real `tel:` / `mailto:` link — tap to call or email. Desktop: inert, no link. |
| Copy button | **Every device.** Copies to clipboard with a "Copied ✓" flash on the detail line. |

Copy was desktop-only originally, on the reasoning that a phone user always
wants to dial or email rather than copy. Usually true, not always — and being
wrong left phone users with no way to get an address out at all. The tap half
stays pointer-dependent because it has to: `tel:`/`mailto:` on desktop hand off
to whatever app Windows thinks should handle them, producing an "open an app?"
chooser nobody asked for.

Rows with a phone *and* an email dial the phone but copy the email — each
channel gets whichever the device is better at. Document rows are the
exception to all of this: they always open the PDF in a new tab.

**Long text in rows: wrap, don't truncate (rule set 2026-08-16).** Applies to
every custom element with list rows, not just this one. A team manager's email
was rendering as `m.turne…` because the detail line was `-webkit-line-clamp: 1`
above 750px — the assumption being that desktop had room. It doesn't: the
element sits in a column rather than the full window, and each row spends
~110px on its icon, gaps and copy button before any text is laid out.

Two rules that generalise:

1. **Clamp only where the first few words carry the meaning.** A truncated
   email is worse than no email — you can't identify it, read it, or copy it
   by eye. Same goes for addresses, membership numbers, FAN numbers.
2. **Split context from value onto separate lines** rather than joining with
   `·`. `contactRow()` takes an array of detail lines: squad name renders as
   `.detail.context` (dimmed), the contact values as `.detail.contact`. The
   value line then starts at the left margin with a full line to itself,
   instead of inheriting whatever space is left over.

`overflow-wrap: anywhere` is what makes a long unbroken address break at all;
without it the email overflows its box rather than wrapping. The 3-line clamp
that remains is a backstop against one pathological value blowing out the row
height, not the expected case.

⚠️ **`IS_TOUCH` is read once at script load.** Switching device emulation in
DevTools won't change it until you reload, and an emulated phone on a desktop
OS still resolves `mailto:` to the *desktop* app chooser — which looks like a
bug and isn't one. Test tap-to-call/email on a real handset; DevTools is only
good for checking the layout.

**Mobile height is a separate Editor value.** Wix stores custom-element height
per breakpoint, so setting it on Desktop does nothing for Mobile View — and
mobile needs *more*, since contact detail lines wrap to two. Set it in both.
The content itself reflows on its own (flex + percentage widths), so unlike a
native state there's no mobile layout to rebuild.

Inputs jump to 16px under 750px wide: iOS Safari zooms the page when focusing
an input smaller than that and never zooms back out.

**Officials are email-only** (2026-08-16). `getClubOfficials()` doesn't return
`mobile` at all — these are volunteers' personal numbers and every parent sees
this tab, so omitting it from the payload keeps it out of the page source, not
just out of the UI. Team managers keep their number, since parents need them
about a specific match at short notice. An official with no email is skipped.

**Stale-profile gotcha:** `currentParentProfile` is read once in `onReady` and
never re-queried, and `loadDashboard()` doesn't refresh it. After a successful
save the page code must **patch that object in place** or the 1.5s
`loadDashboard` re-run pushes pre-save values back into the element and the
change appears to vanish until a full refresh. The element also adopts its own
submitted values on `savestate="saved"` so the summary row updates instantly.
The native `stateMore` never showed this bug because Wix inputs keep whatever
was typed — nothing repaints them.

Field IDs from `stateMore` (`#inputMyName` etc.) have **no equivalent here** —
they're inputs inside the shadow DOM, unreachable from `$w`. That's the
trade-off being measured.

---

## State: stateRegistration

Same field list as the current live page (`PARENT_HUB_ELEMENTS.md`'s
`stateRegistration` section) — every ID below is identical in name, type, and
CMS mapping. New here is only the step wizard shell.

| # | Element ID | Type | Purpose | Initial State |
|---|-----------|------|---------|----------------|
| 1 | `#regStepsBox` | Multi-State Box | The 8 wizard steps | Default = `stepPlayer` |
| 2 | `#regTabPlayer` … `#regTabConfirm` | Button ×8 | Step pills — click jumps straight to that step | None |
| 3 | `#regStepLabel` | Text | "Step N of 8" | None |
| 4 | `#regNextBtn` | Button | Advances a step (label → "Submit" on step 8, wired to `#btnSubmitFinal`) | None |
| 5 | `#regBackBtn` | Button | Back a step | Hidden on step 1 |
| 6 | `#regSaveDraftBtn` | Button | **Save Draft** — sits in this same sticky-bottom step bar, not the topbar, so it's reachable without scrolling up regardless of how far down a step the parent's scrolled. Same `handleSaveDraftFromHeader`-equivalent logic as v1, just triggered directly (no masterPage bridge needed here). | None |
| 7 | `#regProgressTrack` | **Progress Bar** (Wix's own element, not a container+fill pair) | Sits in the sticky-bottom step bar. **`targetValue` = 100** — it tracks `calculateProgress()`'s completion %, NOT step position (see note below). Code sets `.value` on every recalc. | None |
| 7a | `#regProgressPct` | Text | Sits to the **right** of the bar (with `#regStepLabel` on the left). Shows "N% complete", or "100% — ready to submit" at full. Guarded on `.id`. Added because submission is gated at 100% — a bar at 94% reads as "basically full", so without the number the parent can't tell why the confirmation box hasn't appeared. | None |

**Step position vs. completion % are different things — don't conflate them
(clarified 2026-08-12).** `#regStepLabel` shows where you are in the wizard
("Step 3 of 8"); `#regProgressFill` shows how much of the *form* is actually
filled in (v1's `calculateProgress()`, ~23 required fields). A parent can be
on step 8 with 60% completion, or on step 2 with 90%. This matters because
v1 gates submission on completion — `#chkConfirm` only appears at 100% — and
that rule carries over unchanged, independent of which step is open.

### Step field groupings (order fixed 2026-08-11: Family before Emergency)

| Step | State name | Fields (unchanged IDs from v1) |
|---|---|---|
| 1 Player | `stepPlayer` | `#regfullname`, `#regfan`, `#regteamname`, `#regmanagername`, `#regmembership`, `#boxReturnNote`/`#regReturnNote`, `#regDOB`, `#reggender`, `#reginitials`, `#regplayertype` |
| 2 Your Details | `stepYourDetails` | `#regparentname`, `#regparentmobile`, `#regparentemail`, `#regparentrelation`, `#regparentdob`, `#regparentaddress`, `#regAddress` |

**`#regparentemail` is a Text Input in v2, not a Text element (2026-08-13)** —
v1 displayed it read-only, which left a parent with a missing email no way to
supply one. v2 makes it conditionally editable: **empty → enabled** so they
can fill it in; **already has a value → `.readOnly = true`** so an established
address can't be changed by accident (`.readOnly` rather than `.disable()`, so
it stays legible instead of greying out). Corrections to an existing email go
through Profile's Edit Details tab, which is fully editable. `mapUItoPlayer`
also needs `parentEmail` added — v1 never saved this field — guarded to only
write when non-empty so a skipped blank field doesn't wipe anything.
| 3 Family | `stepFamily` | `#regadd2parents`, `#boxSecondParent` (wrapping `#regsecparentname`, `#regsecparentmobile`, `#regsecparentemail`, `#regsecparentrelation`, `#regsecparentdob`, `#regsecparentaddress`), `#regbothparents`, `#regsibling`, `#boxSiblingTeam` (wrapping `#regsiblingteam`) |

**`#b1`-`#b8` dropped (2026-08-13).** v1 toggled each second-parent field's
label element individually (`#b1`,`#b2`,`#b3`,`#b4`,`#b6`,`#b7` for the six
second-parent fields, `#b5` for medical, `#b8` for sibling team) — seven
elements to keep in sync with every expand/collapse, and generic names that
say nothing. v2 wraps each conditional group in a single container and
toggles that instead: `#boxSecondParent`, `#boxSiblingTeam`, and
`#boxMedicalDetails` (step 5). Same pattern as `#boxFanLookup` on Home.
| 4 Emergency | `stepEmergency` | `#regemergencysource`, `#boxEmergencyManual` (wrapping `#regemergencycontact`, `#regemergencycontactmobile`, `#regemergencycontactrelation`) |
| 5 Medical & Kit | `stepMedicalKit` | `#medicalyn`, `#boxMedicalDetails` (wrapping `#regmedical`), `#regshirtsize`, `#regshortsize`, `#regcoatsize`, `#reghoodiesize`, `#regsocksize` |
| 6 Documents | `stepDocuments` | `#regheadshot`, `#regheadshotPreview`, `#regpaperid`, `#regpaperidPreview` |

**Step 4 — two changes from v1 (2026-08-13/14):**
- **Typo fixed**: v1's element was `#regemergencycontactrelatoin` ("relatoin").
  v2 uses `#regemergencycontactrelation`; the code is written against the
  corrected spelling.
- **`#boxEmergencyManual` stays visible** — v1 *collapsed* it when the source
  was Parent 1/2, hiding the auto-filled details entirely. That meant a stale
  Parent 1 mobile could silently become the emergency number with nobody
  seeing it. v2 keeps the box visible and `.disable()`s the three fields
  instead, so the parent can verify the number before submitting. (First
  attempt used `.readOnly` on the two text inputs for better legibility, but
  it silently had no effect — they stayed fully editable while only the
  dropdown locked. `.disable()` on all three is what actually works.)
  `applyEmergencySource()` expands the box unconditionally, so its Editor
  initial state doesn't matter either way. Switching *to* "New / someone
  else" clears the three fields, but only on a real user change — genuinely
  saved "new" details survive a reload.

**Previews added 2026-08-13.** `#regheadshotPreview` / `#regpaperidPreview`
(Image elements, Collapsed, guarded on `.id`) show whatever's currently on
file (`SP_idPhoto` / `SP_idDocument`). Reason: this is the step a parent lands
on when the secretary sends a form back with something like "the ID photo is
too blurry to read" — without a preview they can't see which image she means,
so they're guessing whether the replacement is any different. Mirrors
`#prPhoto`/`#prDocPreview` on the secretary's own PlayerRecord lightbox.
| 7 Consent | `stepConsent` | `#txtConsent`, `#regconsentphoto`, `#regconsentsocial`, `#regconsentfa`, `#regconsentmedical` |
| 8 Confirm | `stepConfirm` | `#chkParentConduct`, `#chkPlayerConduct`, `#chkConfirm`, `#inputSignature`, `#btnSubmitFinal`, `#txtValidationMsg` |

`calculateProgress()`/`validateRequiredFields()` don't care which step a field
is visually in — they just read `$w("#id").value` same as today, so those two
functions carry over unchanged. `#regNextBtn`'s step-advance is the only new
logic; `validateRequiredFields()`'s existing `.scrollTo()` call on the first
missing field should additionally jump `#regStepsBox` to that field's step
first, or the scroll will happen on a hidden step.

---

## State: stateProfile *(Custom Element — converted 2026-08-16)*

**Built as one custom element**, `#customProfile` / `<parent-hub-profile>`,
source `public/custom-elements/parentHubProfile.js`. ~68 native elements
replaced. The tables below are a record of what it replaced — **those elements
are deleted**; don't rebuild them.

| Setting | Value |
|---------|-------|
| Tag name | `parent-hub-profile` |
| Element ID | `#customProfile` |
| Source | `public/custom-elements/parentHubProfile.js` |

⚠️ **The RBAC in the element is presentation, not security.** `player.isPrimary`
decides what gets drawn. `getKidsForParent` strips the primary parent's details
server-side, so a secondary parent's payload never contains them. Never send
data on the assumption the element will hide it.

**Kit images:** `KIT_IMAGES` at the top of the element takes two Media Manager
URLs (playing / training). Use the `https://static.wixstatic.com/media/…` one —
a `wix:image://v1/…` URI is an internal CMS reference and will **not** work as
an `<img>` src. Blank or broken falls back to a drawn shirt, so a bad paste
degrades rather than showing a broken-image icon. Name and number are overlaid
via `KIT_TEXT_POSITION` percentages; tune those to the real photo. Page code
can send `player.kitImageUrl` to override per player if kits ever differ by
team (there's no kit field on `Teams` today).

**Addresses now go through the shared `AddressLookup` Lightbox.** Profile was
the last place still reading ADDRESS objects into text inputs and writing the
coerced string back, flattening structured addresses on every save.

**Consent saves immediately** from the Lightbox rather than waiting on Save
Changes — unchanged from the native behaviour, and deliberate: the Lightbox's
own "Confirm & Close" already reads as a commitment.

**Also deleted with this conversion:** `isYesValue`, `setYesNoRadio` and the
`STEP_PILL_*` colours in page code. They existed only for native radio groups
and tab pills; every remaining state renders its own.

---

### What it replaced *(historical — these elements are gone)*

Same field list as v1's `stateProfile` — all IDs below unchanged. New here is
only the 3-tab wrapper (fixes the "profile is a long scroll" feedback).

**Persistent profile header (2026-08-14)** — these sit **outside**
`#profileTabsBox`, so they stay visible on all three tabs. Keeps whose
profile you're on always visible, balances the two identity visuals side by
side instead of the headshot dominating one tab, and saves Overview's grid
repeating the name/team.

| # | Element ID | Type | Purpose | Initial State |
|---|-----------|------|---------|----------------|
| 0 | `#profileAvatarBox` | Container | Initials panel sitting beside the shirt graphic | None |
| 0-i | `#profileInitials` | Text (inside `#profileAvatarBox`) | Initials, code-computed from `SP_firstName`/`SP_lastName` — same treatment as `#kidAvatarInitials` on Home | None |
| 0a | `#grpPlay` | Container | Shirt graphic, playing variant → `#txtProfLastName`, `#txtProfNum` | Collapsed (code picks one) |
| 0b | `#grpTrain` | Container | Shirt graphic, training-only variant → `#trainLastname` (no squad number) | Collapsed (code picks one) |
| 0c | `#txtProfFullName` | Text | Player's name | None |
| 0d | `#txtProfTeam` | Text | Team name / "Squad Unassigned" | None |
| 1 | `#profileTabsBox` | Multi-State Box | 3 tabs | Default = `stateOverview2` |
| 2 | `#pTabOverview` | Button | → `stateOverview2` | Active by default |
| 3 | `#pTabStats` | Button | → `stateStats2` | None |
| 4 | `#pTabDetails` | Button | → `stateDetails2` | None |

`#grpPlay`/`#grpTrain` are mutually exclusive — stack them in the same spot
and let the code choose from `SP_trainingOnly`, same approach as the two
banner icons on Home.

**`#profileHeadshot` dropped entirely (2026-08-14).** The photo already has a
home where it's actionable — `#regheadshotPreview` on the registration
Documents step, which is exactly where a parent needs to see it when the
secretary sends a form back over a blurry ID. Profile has no upload control,
so showing it there would invite "how do I change this?" with no answer.
Initials avatar used instead, consistent with Home's kid cards. **Known
trade-off:** an Active player's parent no longer reaches the registration
form, so they have no way to view the photo on file at all — acceptable for
now since photo changes go through the club regardless.

Reset to `stateOverview2` every time a profile is opened (mirrors the mockup —
don't leave it on whichever tab was open for the last child viewed).

| Tab | State name | Fields (unchanged IDs from v1) |
|---|---|---|
| Overview | `stateOverview2` | `#profileManager`, `#txtProfFan`, `#txtMembershipNo`, `#txtProfDOB`, `#txtProfGender`, `#txtProfType`, `#txtShirtSize`, `#txtShortSize`, `#txtSockSize`, `#txtHoodieSize`, `#txtCoatSize`, plus the consent summary card (`#boxConsentSummary`, `#txtConsentCount`, `#btnReviewConsent`) — headshot, shirt graphic, name and team moved to the persistent header above |

**`#txtProfType`** (Text, read-only) — "Playing" / "Training Only" from
`SP_trainingOnly`. The shirt graphic in the header already implies it, but
nothing states it outright, and it's genuinely consequential for a parent:
it's what decides whether match fixtures appear for that child at all (see
the `audience` visibility rule in `docs/fixtures.md`). Mirrors `#prType` on
the secretary's PlayerRecord lightbox.

**`#txtParentrelation` moved to Edit Details (2026-08-14).** Overview is all
*player* facts (team, FAN, DOB, gender, kit sizes); the parent's own
relationship to the player is parent info and belongs with the other parent
fields. Stays read-only Text — it's editable on the registration form and
rarely changes after that.

**Consent summary card on Overview.** The mockup shows a card with a count
and tick, not just a button — worth building, since "4 of 4 ✓" confirms at a
glance that nothing's outstanding:
- `#boxConsentSummary` — Container (the card)
- `#txtConsentCount` — Text, code-set. Reports what was **agreed**, not
  merely answered: "All 4 agreed ✓" / "3 of 4 agreed" / "2 of 4 answered —
  review needed" when something's never been asked. First version counted
  *answered*, which meant flipping a consent from Yes to No left it reading
  "4 of 4" — correct but motionless, so the change looked unsaved.
- `#btnReviewConsent` — Button, reopens the shared `ConsentRegistration`
  lightbox
| Stats | `stateStats2` | `#season`, `#goals`, `#assist`, `#tackle`, `#save`, `#potm`, `#txtWins`, `#txtLosses`, `#txtDraws`, `#txtGF`, `#txtGA`, `#txtGD`, `#formRepeater` (+ `#formCircle`/`#txtFormLetter` inside it) |
| Edit Details | `stateDetails2` | `#boxSecondaryParentNote`, `#boxPrimaryContact` (`#txtLockedParentName`, `#txtParentrelation`, `#txtLockedParentMobile`, `#txtLockedParentEmail`, `#inputAddress`), `#boxEmergencyProfile` (`#inputEmergName`, `#inputEmergNumber`, `#emergeRelation`), `#radioaddparent` + `#boxProfileSecondParent`, `#radioBothParents`, `#radioMedical` + `#boxProfileMedical`, `#boxPrimaryOnly`, `#btnSaveProfileEdits` |

**Consent radios dropped from Profile entirely (2026-08-15).** v1 mirrored all
four consents as disabled RadioGroups on the profile; v2 shows the summary
card on Overview instead (`#txtConsentCount` = "N of 4 ✓") with
`#btnReviewConsent` opening the shared lightbox. Four disabled radios
repeating the same information was noise.

This also simplifies the code: v1 used those radios as *storage* — the
lightbox wrote into them, the save handler read them back out. Without them,
returned answers go straight into `activePlayerContext`, and the save picks
them up from there. One less layer of indirection.

Trade-off: the card shows how many are answered, not which are yes vs no. A
parent wanting that detail taps through to the lightbox, which displays their
current answers.

**Container consolidation on Edit Details (2026-08-14)**, same reasoning as
dropping `#b1`-`#b8` on registration: v1 toggled **four** separate containers
for the second parent (`#secondparentbox`, `#secondparentmobbox`,
`#secondparentEmbox`, `#secondparentrelbox`) *plus* each field individually,
and used `#box68` for medical. v2 uses one container each:
- `#boxProfileSecondParent` (Collapsed) → `#secondparentName`,
  `#secondparentMobile`, `#secondparentEmail`, `#secondparentRelation`,
  `#secondparentDob`, `#secondparentAddress`
- `#boxProfileMedical` (Collapsed) → `#inputMedicalDetails`
- `#boxPrimaryOnly` → `#datePrimaryParentDob`, `#inputParentAddress` —
  collapsed entirely for a secondary parent, since `getKidsForParent` strips
  those two fields server-side before they ever reach the browser

Note: `#txtLockedParentEmail` now actually saves (fix landed in
`Parent Hub.js` 2026-08-11, `activePlayerContext.parentEmail = ...`) — carry
that same line into v2's save handler when it's written.

### RBAC — primary vs secondary parent (rewritten 2026-08-14)

v1 showed a secondary parent *everything* on the profile, merely disabled.
v2 hides the primary parent's personal data outright. Decided by
`viewerIsPrimaryParent`, a flag now set server-side by `getKidsForParent` —
one authoritative answer rather than each page re-deriving it.

**Tab 3 sections, grouped into containers so whole blocks can collapse:**

| Container | Contents | Secondary parent sees |
|---|---|---|
| `#boxPrimaryContact` | `#txtLockedParentName`, `#txtParentrelation`, `#txtLockedParentMobile`, `#txtLockedParentEmail`, `#inputAddress` | **Collapsed** |
| `#boxEmergencyProfile` | `#inputEmergName`, `#inputEmergNumber`, `#emergeRelation` | **Collapsed** |
| `#boxPrimaryOnly` | `#datePrimaryParentDob`, `#inputParentAddress` | **Collapsed** |
| `#boxProfileSecondParent` (+ `#radioaddparent`) | the second parent's own details | Visible, **disabled** |
| `#boxProfileMedical` (+ `#radioMedical`), `#radioBothParents` | the child's medical info | Visible, **disabled** |
| `#btnReviewConsent` (on Overview) | | Disabled |
| `#btnSaveProfileEdits` | | Disabled, label "Secondary Parent — Read Only" |

Medical and consents stay **visible** to a secondary parent deliberately —
they're about the *child*, not the primary parent, and a parent unable to
see their own child's medical details is wrong on welfare grounds
(separated-parents case included).

**`#txtSecondaryParentNote`** (Text, Collapsed — put it in a Container if you
want to style it as a callout) — expands only for a secondary parent:
*"You're viewing as a secondary parent — the primary parent's contact details
and the emergency contact are managed by them."*

**Server-side redaction (backend change, same date).** Collapsing containers
only hides things on screen; without a backend change the values still sit in
the network response, readable from dev tools. `getKidsForParent` now also
strips `parentsName`, `parentPhone`, `parentEmail`, `SP_emergContactName`,
`SP_emergContactNumber` and `SP_emergContactRelationship` for a secondary
viewer — extending the `sp_parent_dob`/`sp_parent_address` redaction that was
already there for exactly this reason.

**Registration is primary-parent-only (both v1 and v2).** Previously
`primaryParentId` was checked in exactly ONE place in v1 — `loadProfileForm` —
so a secondary parent could open the registration form and edit the primary's
details freely. Worse, once the redaction above landed, a secondary parent
saving that form would have written the resulting *blanks* over the primary's
real phone number. Both pages now gate registration on
`viewerIsPrimaryParent`; a secondary parent gets the read-only profile
instead, whatever the child's status.

**Edge case:** a player row with no `primaryParentId` at all resolves to
"not primary" for everyone, so nobody can open its registration form.
`getKidsForParent` logs a warning when it hits one. Worth checking no legacy
rows are missing that field.

Tabs 1 and 2 (Overview, Stats) are **not** locked — read-only for everyone.

---

## Sizing Guide (pulled from the mockup CSS — use as starting px values in the Editor)

**Shell**

| Element | Mobile | Web/Desktop |
|---|---|---|
| Page/app content width | Full width up to ~460px | Capped ~900px, centered with margin |
| Content side padding | 16px | 28px (22px top) |
| Nav (bottom bar / rail) | Full width, ~64px tall | 84px wide, full height |
| Nav icon | 20×20px | 20×20px |
| Nav label text | 10px | 10px |
| Unread badge | 14×14px circle, 9px text | same |

**Topbar** (~56-60px tall total)
| Element | Size |
|---|---|
| Back button | 30×30px circle — **bump to ≥40px hit area**, 30px is under the ~44px minimum tap-target guideline even though the visual circle can stay smaller |
| Crest icon | 22×22px |
| Title text | 19px (Barlow Condensed, 700) |
| Subtitle text | 11px |

**Kid cards (Home)**
| Element | Size |
|---|---|
| Card padding | 14px, 10px corner radius |
| Avatar | 52×52px circle |
| Action buttons | ~40px tall (10px vertical padding), 8px corner radius |

**Payments hub rows / Messages rows**
| Element | Size |
|---|---|
| Row avatar/icon | 40×40px (Payments), 38×38px circle (Messages) |
| Row padding | 13-14px |

**Buttons, general**
| Type | Padding | Corner radius |
|---|---|---|
| Full-width CTA (`btn-block`) | 13px vertical | 10px |
| Card action button | 10px vertical | 8px |
| Pill toggle / chip | 6-8px vertical, 14px horizontal | 999px (fully round) |

**Registration wizard**
| Element | Mobile | Web |
|---|---|---|
| Step pill | 8px/14px padding, 999px radius, horizontal scroll row | Same padding, 8px radius, stacked as a 168px-wide left column |
| Step number badge | 15×15px circle | same |
| Bottom action bar | 10px/16px padding + safe-area | same |
| Progress track height | 5px | 5px |
| Save Draft button | 8px/13px padding, 999px radius | same |

**Profile tabs** — same pill styling as the step wizard, just 3 tabs instead of 8.

**Consent modal** — max-width 460px, 16px corner radius (bottom-sheet: rounded top corners only on mobile), 20px inner padding, capped at 82% viewport height with internal scroll.

**Shirt graphic header** — 26px/16px padding, jersey icon ~76×76px, squad number 30px, name label 15px uppercase.

**Type scale reference**
| Use | Size |
|---|---|
| Page/section heading | 22-24px |
| Card/step heading | 17-18px |
| Body text | 13-14.5px |
| Meta/caption | 11-12.5px |
| Micro labels (section titles, badges) | 9.5-11px |

None of this needs to be pixel-exact — the Editor's own snapping/responsive tools will fight you if you try to match it precisely. Treat it as a starting point per element, then eyeball spacing against the artifact mockup rather than measuring it.

## Build order (suggested)

1. Shell: `#stateboxHub2`, nav (5 buttons), topbar — get basic tab-switching working first.
2. `stateRegistration` + `stateProfile` — carry the real data/logic, highest value to get right early.
3. `stateHome` + `statePayments` + `statePaymentDetail` — reuse existing backend calls.
4. `stateMessages` + `stateFixtures` + `stateMore` — static shells, no backend dependency, lowest priority.
