# Manager Hub v2 — Element Reference & Design Review

**Status:** design, nothing built. Companion to `PARENT_HUB_V2_ELEMENTS.md`,
which is the proven pattern this follows.

Build on a **new, hidden page** exactly as Parent Hub v2 was, gated by
`public/betaAccess.js`, and swap URLs at the end. The current Manager Hub keeps
running untouched the whole time.

---

## Why convert

`Manager Hub.js` is **1,706 lines driving 191 unique element IDs**. Every one of
those is laid out twice — Desktop and Mobile View — and that duplicate formatting
is the actual cost of this page. Parent Hub v2 proved the alternative: nine custom
elements, written once, reflowing themselves, with no Mobile View pass at all.

Manager Hub is roughly **three times the element count of Parent Hub**, so the
saving is proportionally larger. It's also the page that most needs new features
(fixtures, messages, recruitment), and bolting those onto 191 hand-placed elements
would make the problem worse.

---

## Logic review of what exists

Findings from reading the current page, worst first. These are carried into the
design below rather than fixed in place — most disappear on conversion anyway.

### 1. 37 top-level `$w()` calls outside `$w.onReady` — one missing element kills the page

`$w("#repeaterEnquiries").onItemReady(...)`, `$w("#btnOpenShare").onClick(...)`
and 35 others sit at module scope. There is **no `safeWire`**, unlike
`Player Admin.js` and Parent Hub v2. A single renamed or deleted element throws
synchronously and every wiring statement after it never runs — the failure looks
like "half the Hub randomly stopped working", which has already cost a debugging
session once on the secretary side.

**v2:** every wire goes through `safeWire()`, per-step try/catch. Non-negotiable
at this element count.

### 2. Enquiries are shared by age group, and two managers can fight over one

```js
.eq("SP_status", ENQUIRY_STATUS_ID)
.eq("ageGroup", squadActiveAgeGroupId)
```

Enquiries are scoped to the **age group**, not the team. Where an age group has
two teams, both managers see the same enquiry and both can press Accept. There's
no claim, no lock, no "taken by" — the second write silently overwrites the first,
moving the player to the other team with no trace.

**v2:** an enquiry is *claimed* before it's actioned. A claimed enquiry shows as
claimed to the other manager, with who and when. Low effort now, effectively
impossible to reconstruct later from a squad list that's silently wrong.

### 3. The registration URL and token generator are duplicated

`Manager Hub.js` builds `https://…/secure-registration?token=` inline;
`Player Admin.js` has the same string as `REG_BASE`. Two token generators exist —
`generateRandomToken()` here, `randomToken()` there.

**v2:** both move to a backend module. The invite is a money-adjacent flow (it's
what starts registration and therefore fees) and shouldn't have two
implementations that can drift.

### 4. Invite/accept logic lives in page code, so nothing else can reuse it

Accepting an enquiry, sending an invite and archiving a player are all inline in
repeater handlers. The secretary's Player Admin does versions of the same things
separately. Nothing is callable from anywhere else, and nothing is testable.

**v2:** `backend/pipeline.jsw` owns the transitions —
`acceptEnquiry`, `sendInvite`, `returnToPool`, `archivePlayer`. Page code
dispatches events; the backend decides. This is also what makes the same actions
available to the secretary without a third copy.

### 5. `cleanItemForUpdate` only strips three system fields

```js
delete clean._owner; delete clean._createdDate; delete clean._updatedDate;
```

Anything else on the object rides into `wixData.update()` and **Wix silently
creates a real CMS column for it**. This is exactly how the stray "Default season"
column appeared during the Lightbox refactor.

**v2:** transitions send explicit field sets, never a spread record.

### 6. Nine states, eight nav buttons, and a back button per state

`stateDashboard, stateSquad, stateTeamProfile, stateStats, stateStaffProfile,
stateSponsors, stateNews, stateStatsAdd, stateStatEdit` — plus
`#btnBackToHubSquad`, `#btnBackToHubTeamProfile`, `#btnBackToHubStats`… one per
state, all doing the same thing.

**v2:** one nav element and one topbar element, exactly as Parent Hub. The back
button is a single element that knows where it came from. Stats Add / Stats Edit
become drill-downs of Stats rather than peers of it.

### 7. Dashboard fires 3 queries per team

Acceptable at two teams, wasteful at six, and it recomputes counts the Squad state
immediately recomputes again.

**v2:** one backend call returns the dashboard for all of a manager's teams.

---

## Proposed structure

Five nav items, matching the Parent Hub pattern. Everything else is a drill-down
and has no nav entry.

| Nav | State | Replaces |
|---|---|---|
| Home | `stateHome` | `stateDashboard` |
| Squad | `stateSquad` | `stateSquad` (3 pipeline tabs) |
| Fixtures | `stateFixtures` | *new* |
| Messages | `stateMessages` | *new* |
| More | `stateMore` | Team Profile, Staff, Sponsors, News, Stats |

Drill-downs (reached from a state, no nav item, topbar Back returns to wherever
you came from): `statePlayerRecord`, `stateFixtureForm`, `stateMessageCompose`,
`stateTeamProfile`, `stateStaff`, `stateSponsors`, `stateNews`, `stateStats`,
`stateStatsAdd`, `stateStatsEdit`, `stateRecruitment`.

### More is a MENU, not a container

Important structural point. More does **not** hold Team Profile, Staff, Sponsors,
News and Stats inside itself — it's a short list of tappable rows, each of which
drills into its own state with its own element. More stays about the size of
Parent Hub's version; each admin area stays a focused element of its own.

This works because **a state containing one custom element costs almost nothing to
set up**: drop the element in, set an ID, done — no layout, no Mobile View pass.
It's states containing thirty native elements that are expensive. So there is no
reason to economise on states, and every reason to keep elements small enough to
reason about.

The rule of thumb: **one element per screen a manager can be looking at.** If two
things are never on screen together, they're two elements.

---

## Custom elements

| Element | Tag | State | Notes |
|---|---|---|---|
| `managerHubNav.js` | `manager-hub-nav` | shell | 5 items, badge on Messages. Port of `parentHubNav.js` |
| `managerHubTopbar.js` | `manager-hub-topbar` | shell | title/sub/back. Port of `parentHubTopbar.js` |
| `managerHubHome.js` | `manager-hub-home` | Home | one card per team: squad count, enquiries, trials, action-needed |
| `managerHubSquad.js` | `manager-hub-squad` | Squad | **the board** — 3 tabs, see below |
| `managerHubPlayer.js` | `manager-hub-player` | PlayerRecord | replaces the `PlayerProfile` Lightbox |
| `managerHubFixtures.js` | `manager-hub-fixtures` | Fixtures | list + RSVP counts |
| `managerHubFixtureForm.js` | `manager-hub-fixture-form` | FixtureForm | create/edit a fixture |
| `managerHubMessages.js` | `manager-hub-messages` | Messages | sent list + compose entry |
| `managerHubCompose.js` | `manager-hub-compose` | MessageCompose | write to squad or a parent |
| `managerHubMore.js` | `manager-hub-more` | More | **menu only** — rows that drill down. Port of `parentHubMore.js` |
| `managerHubTeamProfile.js` | `manager-hub-team-profile` | TeamProfile | team details editor |
| `managerHubStaff.js` | `manager-hub-staff` | Staff | staff record editor |
| `managerHubSponsors.js` | `manager-hub-sponsors` | Sponsors | list + add form |
| `managerHubNews.js` | `manager-hub-news` | News | post form, publishes via `blog.jsw` |
| `managerHubStats.js` | `manager-hub-stats` | Stats | overview: scorecard, form guide, leaderboards, POTM |
| `managerHubStatsAdd.js` | `manager-hub-stats-add` | StatsAdd | 3 tabs — POTM / team stats / bulk sheet |
| `managerHubStatsEdit.js` | `manager-hub-stats-edit` | StatsEdit | tables + edit forms, 2 tabs |
| `managerHubRecruit.js` | `manager-hub-recruit` | Recruitment | poster designer, see below |
| `managerHubShare.js` | `manager-hub-share` | **Share** | QR code + join link. Added 2026-08-22 |
| `managerHubEnquiryAdd.js` | `manager-hub-enquiry-add` | **EnquiryAdd** | take an enquiry by hand. Added 2026-08-22 |

**20 elements replacing 191 hand-placed ones**, each written once instead of laid
out twice. Stats is the largest single chunk of the current page (roughly 630 of
the 1,706 lines) and converts last, but it does convert — leaving it native would
mean keeping a Mobile View pass alive for the one area nobody wants to maintain.

---

## The board (`stateSquad`)

Three tabs, one element. This is the piece Rob describes as a board, and it's the
heart of the Hub.

**Enquiries** — everyone at this age group with `SP_status = Enquiry`.
Per card: name, DOB, age group, position, experience, parent name/email/phone,
relationship. Actions: **Accept to trial**, **Claim** (see finding 2), **Archive**.

**Trials** — `SP_status = Trial` on this team.
Actions: **Send invite** (opens the invite drill-down), **Return to pool**,
**Archive** (with leave reason).

**Squad** — everyone else on the team, sorted by `STATUS_SORT_ORDER`.
Per card: name, status pill, kit number, and a chase indicator for Invited /
Renewal / In Progress. Tapping opens `statePlayerRecord`.

The current version does the tab-jump-and-flash trick after an action
(`flashTabMessage`, `$w("#squadPipelineTabs").value = "trials"`). Keep that
behaviour — it's genuinely good, it shows the manager where the player went — but
it becomes a class change inside one element instead of five `$w` calls.

---

## Fixtures (manager side)

The parent side is live and working. Managers currently add fixtures **directly in
the CMS**, which is why `audience` is blank on every row and matches were counting
training-only children until `effectiveAudience()` was added to compensate.

**`stateFixtures`** — upcoming fixtures for the manager's teams, each with its live
RSVP counts. Data from `getFixtureResponses()` in `backend/fixtures.jsw`, which
already returns the right shape for both upcoming (live rows) and past
(rolled-up JSON) fixtures. Tapping shows who's replied, by name, in three lists.

**`stateFixtureForm`** — create/edit. Fields per `docs/fixtures.md`:
`eventType`, `club_team`, `date_only`, `startTime`, `stopTime`, `venue`, `notes`,
`homeTeam`, `awayTeam`, `audience`.

**Set `audience` from `eventType` in the form**, as originally specced —
Match/Tournament default to `Playing Only`, Training/Event to `All`, manager can
override. `effectiveAudience()` in `backend/squadRules.js` then becomes a fallback
for legacy rows rather than the thing holding it all together.

---

## Messages (manager side)

`ParentMessages` and the parent-side reader are built. Nothing writes to it.

**`stateMessages`** — what this manager has sent, newest first, with reach
("sent to 14 parents").

**`stateMessageCompose`** — title, body, and a scope choice:
**my squad** (`scope: Team`) or **one parent** (`scope: Parent`).
Club-wide is secretary-only and doesn't belong here.

`senderName` should be the manager's name from their staff record, not free text —
a parent seeing "Michael Turner (Manager)" needs it to be true.

**Backend must re-check the manager owns that team.** Scope and team id arrive
from the browser, and an exported `.jsw` function is callable from any console.
Reuse the `managerContext.teams` resolution server-side; don't trust the payload.

---

## Recruitment poster (`stateRecruitment`)

Manager fills in a short form, a poster renders live beside it, and it publishes.

**Fields:** team (from their teams), position (dropdown, or blank for general
recruitment), age group, training night/time, a short free-text line. Manager name
and contact number come **from the staff record**, not typed.

**Render:** draw directly on `<canvas>` with the Canvas API — crest, background,
team name, position, contact. **Not html2canvas**: the element runs in a sandboxed
iframe where external libraries are a fight, and a templated poster doesn't need
DOM rasterising. Canvas also gives exact output dimensions, which Facebook cares
about.

**Publish:** canvas → base64 → `mediaUpload.jsw` (the pipeline already proven by
registration uploads) → public URL → post.

Destination is a radio: **website**, **Facebook**, or both. Website reuses
`backend/blog.jsw`, which already publishes to Wix Blog with a cover image.

### Facebook — unresolved, test before designing further

Two candidate routes:

**A. Wix Automations "Publish a social post"**, triggered by a row insert —
the same pattern `EmailQueue` and `ParentNotifications` already use successfully.
No Meta developer app, no App Review, no token management. **Unproven:** whether
the action accepts a *dynamic* image and body from the triggering item rather than
content composed in the dashboard. **This single question decides the design and
takes about twenty minutes to answer.** Make one row with an image URL and look at
what comes out.

**B. Graph API direct** from `backend/facebook.jsw` — `POST /{page-id}/photos`
with a long-lived Page token in Wix Secrets. Full control. Costs a Meta app,
probably App Review for `pages_manage_posts`, and token upkeep.

Do the A test first. B is the fallback and nothing else in the plan depends on it.

**Governance, decide before shipping either:** this is the club's public voice and
twenty managers would have one-tap access with no undo. A `pending` status on the
post row — approved by Rob or the secretary — costs almost nothing to build in now
and is awkward to retrofit once people are used to instant posting.

Note this also settles `isPrivate` from the other direction: posters **must** be
public for Facebook to fetch them. That's fine for a poster and leaves children's
ID documents as a separate decision.

---

## Backend modules

| Module | Purpose | Status |
|---|---|---|
| `backend/pipeline.jsw` | `acceptEnquiry`, `claimEnquiry`, `sendInvite`, `returnToPool`, `archivePlayer` | **new** — extracted from page code |
| `backend/managerData.jsw` | manager context, team resolution, dashboard summary in one call | **new** |
| `backend/fixtures.jsw` | add `createFixture`, `updateFixture`, `getTeamFixtures` | extend |
| `backend/messages.jsw` | add `sendTeamMessage`, `sendParentMessage`, `getSentMessages` | extend |
| `backend/recruitment.jsw` | poster record, publish orchestration | **new** |
| `backend/facebook.jsw` | Graph API posting | **only if route B** |
| `backend/squadRules.js` | already shared with fixtures | reuse |

Every one of these must verify the caller manages the team, server-side.

---

## Build order

1. **Shell** — page, statebox, nav, topbar. Proves the pattern end to end.
2. **Home** — team cards. Small, and confirms `managerData.jsw`.
3. **Squad board** — the biggest single win, and the most-used screen.
4. **Player record** — replaces the `PlayerProfile` Lightbox.
5. **Fixtures + form** — unblocks the audience problem and gives managers the RSVP
   view the whole Fixtures feature was built for.
6. **Messages + compose** — completes a feature that's currently half-built.
7. **More** — moves Team Profile / Staff / Sponsors / News behind one tab.
8. **Recruitment poster**, website output only.
9. **Facebook**, once route A or B is proven.
10. **Team Profile, Staff, Sponsors, News** — four small, independent elements
    behind More. Any order; each is a self-contained afternoon.
11. **Stats, Stats Add, Stats Edit** — last, and deliberately so. It's the biggest
    single area (~630 lines), the least frequently used, and the one whose current
    behaviour is most worth preserving exactly. Convert it when the pattern is
    completely routine.

Nothing is left native at the end. A half-converted page keeps the Mobile View
problem alive for whatever's left, which defeats the point.

---

## Rules carried over from Parent Hub v2

- Data in via **one `data` attribute** as JSON; interactions out via `CustomEvent`.
- Content elements **self-size** with a `ResizeObserver` on `.wrap`; chrome
  elements (nav, topbar) fill with `height: 100%`.
- Mobile breakpoint is **750px** everywhere.
- Bottom nav overlays content on mobile — every content element needs
  `padding-bottom: calc(84px + env(safe-area-inset-bottom, 0px))` under 750px.
- **No backticks inside the `STYLES` template literal.** Broke the build three
  times on Parent Hub.
- `node --check` only parses. Wix's deploy ESLint (`no-undef`) is the real gate.
- Escape every value through `esc()` before `innerHTML` — managers type free text
  and it renders as real HTML.
- Visibility gating in an element is **cosmetic**. Every restriction is enforced
  in the backend, because any exported `.jsw` function is callable from a console.


---

## Share & manual enquiry (added 2026-08-22)

Two new states, both reached from **More → Recruitment**.

### `stateShare` — `#customShare`

v2 shipped with the More row present but the handler stubbed:

```js
el.on("openShare", () => wixLocationFrontend.to("/playerenquiry"));
```

That navigated the **manager** onto the **parent's** form and out of the Hub. v1
had a real QR panel; the conversion dropped it. Now restored as an element:

- QR image from `api.qrserver.com` — the same service and the same URL v1 used,
  so codes already printed on posters still resolve identically.
- Copy link, with a `navigator.share` sheet where the browser has one.
- The QR has an `onerror` path. If the service is unreachable the manager gets
  an explanation plus the link, not a broken image.
- The QR keeps a **white background in both themes**. An inverted QR fails on
  many readers, and this is the one thing here that strangers point a camera at.

### `stateEnquiryAdd` — `#customEnquiryAdd`

For the parent who says "just take my number".

- **No SMS, by design.** The public form texts the age group's managers because
  nobody yet knows the enquiry exists. Here the manager *is* that person.
- `addManualEnquiry` **auto-claims** the row to whoever typed it. That is the
  honest version of "I've got this one", and it's what stops a second manager
  ringing a family that has already been spoken to.
- **Required is deliberately short**: child's name, DOB, parent's name, and
  *one* of phone or email. Position and experience are optional — a manager in
  a car park in the rain shouldn't be blocked because a parent doesn't know
  whether their child prefers left back.
- **Age group is not a field.** It's derived from the DOB server-side by the
  same rule the public form uses. Two ways of answering "which cohort is this
  child in" is how one becomes invisible to the manager who should see them.
- `SP_dob` is written as a `"YYYY-MM-DD"` **string**, matching the public page
  exactly. `CMS_SCHEMA` lists the column as DATE, so Wix is coercing it — but
  both sources are then identical, which is what `registration.jsw` relies on
  when it matches a parent to a child with `.eq("SP_dob", dob)`.

Backend: `getEnquiryFormOptions()` and `addManualEnquiry(teamId, form)` in
`pipeline.jsw`. Options are cached per session — the dictionary doesn't change
between one family and the next.

---

## Home additions (2026-08-22)

Home was a list of team cards — all of it equally true on Monday as on
Saturday. Two time-sensitive blocks now sit above it, in this order.

### 1. Compliance banner

An expired DBS or safeguarding certificate **stops someone coaching**, so it
outranks everything else on the screen — including knowing who's available for
a match they may not be allowed to take.

These dates were always shown correctly, but only inside **More → My staff
record**, which nobody opens unprompted. The first anyone heard of an expiry
was being pulled off the touchline.

- `complianceWarnings()` in `managerData.jsw`. **No extra query** —
  `resolveContext()` already loads the staff row to work out team membership.
- **Only ever lists things that are wrong.** A block showing four valid
  certificates every week teaches a manager to scroll past it, which is
  exactly when the expired one appears in it.
- **A blank date is not a warning.** Plenty are genuinely unset for volunteers
  who don't need them; "First aid missing" against someone never required to
  have it is noise that makes the real ones ignorable.
- Threshold is 60 days, matching `EXPIRY_WARN_DAYS` in `managerHubStaff.js`.
  Two definitions of "expiring soon" would have Home and the staff record
  disagree about the same certificate.

### 2. This week's fixtures

`getManagerWeekFixtures()` — **in `fixtures.jsw`, not `managerData.jsw`**,
because that module is what `fixtures.jsw` imports `assertTeamAccess` *from*;
a fixtures query in the dashboard would make it circular.

- One query for every team the manager is on. RSVP counts are denormalised
  onto the fixture row by `refreshFixtureCounts()`, so "who's coming" costs
  nothing extra to read.
- ⚠️ **Dates filtered in JS, never in the query.** `date_only` is a plain
  string, and a `.ge()` comparing a string field to a JS Date **silently
  matches nothing** — an empty teaser with no error. Same reasoning as
  `loadFixtureTeasers()` in Parent Hub v2.
- Rolling 7 days. Nothing in that window falls back to a quiet "next is…"
  line, so the card never sits empty and never sends someone to the Fixtures
  tab to discover there was nothing there either.
- **Loaded second and not awaited with the dashboard.** Team cards paint on
  one round trip; the teaser fills in after. An undefined `week` renders
  nothing at all, so "nothing on this week" never flashes at a manager who
  has a match on Saturday. A fixtures failure is logged and swallowed — the
  teaser is a convenience on a screen that works without it.
- A fixture nobody has been asked about reads "No replies yet" rather than
  "0 going", which is true and useless.
- No-reply counts are **amber, not red**. Nobody has done anything wrong.

### Fixtures tab — past fixtures split out (2026-08-22)

`getTeamFixtures` returns **28 days of history** on purpose, so a manager can
still check who turned up to a recent game. But the whole lot rendered as one
ascending list, so opening Fixtures on a Saturday showed Monday's and
Wednesday's finished games *first*, with the weekend's match below them. The
only thing marking them was `opacity: .78`, which reads as a rendering quirk
rather than "this already happened".

Now: **upcoming first**, then an `Already played` heading with the past ones
below a divider. Past is sorted **descending** — ascending is right for the
future (what's next) and wrong for the past, where what you want is the game
you just played. The dimming is relaxed to `.92`, since the heading now does
that job and RSVP numbers on a played game still need to be readable.

The Home teaser was checked against this and does **not** show past fixtures —
verified against all three storage shapes `date_only` could take (string,
Date at UTC midnight, Date at BST local midnight).

---

## Squad selection (2026-08-22)

Who's actually playing, on top of who said they're available.

### CMS — before this works

`fixtures`: `squadFormat` (Number), `squadShape` (Text), `squadSelected` (Text),
`squadSubs` (Text), `squadPublished` (Boolean), `meetTime` (Text),
`meetPlace` (Text).
`Teams`: `T_matchFormat` (Number) — the team's usual format, copied onto the
fixture the first time a squad is picked so changing it next season doesn't
rewrite last year's line-ups.

Editor: state `stateSquadPick` with `manager-hub-squad-pick` → `#customSquadPick`.

### The formation rule

**A formation is just a list of row sizes.** `4-4-2` is rows of 4, 4 and 2,
valid at 11-a-side because they sum to 10 and the keeper is the 11th.
`sum === format - 1` means a keeper; `sum === format` means none, and that
second reading is **capped at 4-a-side** (`NO_KEEPER_MAX`) — without the cap,
`4-4-2-1` was accepted at 11v11 as "eleven outfield players", which is
arithmetically consistent and nonsense on a pitch.

One rule covers every format and shape, so **there is no table of formations
anywhere**. The presets in the element are convenience buttons; a manager can
type anything that adds up. `NO_KEEPER_MAX` is declared in both
`fixtures.jsw` and `managerHubSquadPick.js` and **must stay equal** — two
answers to "does this shape need a keeper" is how the pitch and the save
disagree.

### Rules enforced on the server, not just the screen

- **A parent who said no cannot be picked.** Refused by `saveSquad`, not merely
  greyed out — a disabled look that still works on tap is worse than no block.
  "No reply" is silence, not a no, so those *are* selectable and carry an amber
  marker onto the pitch.
- No player twice; unknown ids refused; slots that no longer exist dropped.
- Only `Match` and `Tournament`, and only in the future.

### What the parent gets

`squadInfoFor()` sends **only whether this parent's own child is in it** —
never the line-up. Withholding it server-side is the enforcement; hiding it in
CSS would be theatre, since anything delivered to a browser is readable there.

A parent whose child wasn't picked gets **nothing at all** — no message, no
"not selected", no list to count themselves out of. Starters and subs get the
identical message except for the position.

The mini pitch shows **only their own child named**, every other shirt blank.
`SHOW_PARENT_PITCH` at the top of `parentHubFixtures.js` turns it off. Its one
consequence: a starter and a sub become distinguishable. That's a judgement
call, not a bug.

### The nudge

`nudgeNoReplies` writes one ParentMessages row per parent of anyone who hasn't
answered. Separate from selection deliberately — it's useful on any fixture,
picked or not. Because sending reminders changes no count on screen, the
fixtures element gained a `flash` slot; without it a manager presses the button
and can't tell whether anything happened.

### Exit to the website (2026-08-22)

`managerHubMore.js` gained a **"Back to the website"** row above Log out,
matching the Parent Hub's "Visit Our Website".

It is a **real `<a href>`, not a wired button** — no listener, no page-code
round trip. If every other line of JS in the element throws, that row still
gets a manager off a page that has no site header. Same reasoning as the
Parent Hub's.

The target is `SITE_URL = "/"`, **relative on purpose**: an absolute URL
would bounce anyone testing on a preview or staging domain onto the live
site. Page code can override it by setting the `websiteurl` attribute, which
is handled before the `data` guard in `attributeChangedCallback` — that
guard returns early on any other attribute name.

---

## Facebook posting (2026-08-22)

`backend/facebook.jsw`. Replaces Wix's £17/month social tool with the free
Graph API.

### CMS — two fields on `RecruitmentPosts`

`fbPostId` (Text), `fbPostedDate` (Date). Without them the post still goes
out; you just can't tell later which ones did.

### Setup, recorded so it can be redone

Free Meta app, use case "Manage everything on your Page", **left in
Development mode** — publishing triggers App Review, which only exists for
acting on Pages you don't control. Posting to your own club Page never
needs it.

Graph API Explorer → **user** token with `pages_show_list`,
`pages_manage_posts`, `pages_read_engagement` → Access Token Debugger →
**Extend Access Token** → call `/me/accounts` **with that extended token**.

⚠️ **That last step is the whole trick.** A Page token inherits its lifetime
from the user token that fetched it. Fetch it with the short-lived one and it
dies in an hour; fetch it with the extended one and it never expires. Verify
in the Debugger — it should read **Expires: Never**.

Page token → Wix Secrets as `_FB_PAGE_TOKEN`. Page id is a visible constant
in the file, not a secret — it's public, and hiding it just makes it harder
to find.

### Two things that will bite later

**Data access expiry is separate from token expiry.** The token says never
and means it, but Meta expires *data access* 90 days after the app last
interacted with the granting user. A Page token used only for posting often
survives it; Meta guarantees nothing. So token rejections (Graph codes 190 /
200) are caught explicitly and returned as an instruction naming the fix,
rather than surfacing as a generic failure months later.

**`mediaManager.upload()` returns a `wix:image://` URI**, which Facebook
cannot fetch — and `recruitment.jsw`'s `posterUrl` only populates when the
result happens to be https, which it isn't. `postPhotoToPage` normalises
either form itself, so a caller can't get it wrong. Posters are also
`isPrivate: false` on purpose: a private file gives Facebook a 403 and the
error blames the URL.

### Who can post straight out

**Every manager, no approval step** (decided 2026-08-22). The earlier caution
was about giving volunteers a channel for free text — it does not apply here.
`extraLine`, `clubName`, `ageGroup`, `teamName` and the training details are
all typed by the manager and all **drawn onto the poster**, which already goes
public on the club website. Facebook is a second destination for content they
could already publish, not a new way to say something new.

The `pending` status stays in the schema for **POTM**, which is a different
case: those posts carry a child's photograph. Note that **nothing approves a
pending row today** — re-enabling the hold without building that screen would
strand posts.

**The send happens after the row is saved**, so a Facebook outage never loses
a poster somebody just spent ten minutes on.
