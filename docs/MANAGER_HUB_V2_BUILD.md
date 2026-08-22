# Manager Hub v2 — Build Sheet

Everything to set up in the Wix Editor and CMS. Companion to
`MANAGER_HUB_V2_ELEMENTS.md` (the design) — this one is the checklist.

Build on a **new, hidden page**. The current Manager Hub keeps running
untouched until the swap at the very end.

---

## 1 · CMS

Three additions. **Check every generated field key** — Wix builds the key from
the display name and doesn't always give what you'd expect. A mismatch reads
back `undefined` silently, and a mismatched key on *write* auto-creates a
phantom column. Send me any key that comes out different and I'll code to it
rather than have you rename a populated column.

### Everything at a glance

**Field Type** is the exact option to pick from Wix's dropdown when you add
the field. Where a type is a Reference, the target collection matters as much
as the type — point it at the wrong one and the write fails silently.

| Collection | Display name | **Field key** | **Wix Field Type** | Points at | Written by | Read by |
|---|---|---|---|---|---|---|
| `SignolPlayers` | Claimed By | `claimedBy` | Text | — | `pipeline.jsw` | `managerData.jsw` |
| `SignolPlayers` | Claimed By Name | `claimedByName` | Text | — | `pipeline.jsw` | `managerData.jsw` |
| `SignolPlayers` | Claimed Date | `claimedDate` | Date and Time | — | `pipeline.jsw` | `pipeline.jsw` (expiry) |
| `Teams` | Training Day | `T_trainingDay` | Text | — | `teamAdmin.jsw` | `recruitment.jsw` |
| `RecruitmentPosts` | Team | `team` | Reference | **Teams** | `recruitment.jsw` | `recruitment.jsw` |
| `RecruitmentPosts` | Position | `position` | Text | — | `recruitment.jsw` | `recruitment.jsw` |
| `RecruitmentPosts` | Extra Line | `extraLine` | Text | — | `recruitment.jsw` | — |
| `RecruitmentPosts` | Poster URL | `posterUrl` | Text | — | `recruitment.jsw` | future Facebook step |
| `RecruitmentPosts` | To Website | `toWebsite` | Boolean | — | `recruitment.jsw` | `recruitment.jsw` |
| `RecruitmentPosts` | To Facebook | `toFacebook` | Boolean | — | `recruitment.jsw` | `recruitment.jsw` |
| `RecruitmentPosts` | Status | `status` | Text | — | `recruitment.jsw` | `recruitment.jsw` |
| `RecruitmentPosts` | Created By Staff | `createdByStaff` | Reference | **SignolStaff** | `recruitment.jsw` | — |
| `RecruitmentPosts` | Published Date | `publishedDate` | Date and Time | — | `recruitment.jsw` | `recruitment.jsw` |

**Poster URL is Text, not Image**, deliberately. It holds a `wix:image://`
URI written by `mediaManager.upload()`, not a file picked in the CMS — an
Image column would fight that.

**Date and Time, not Date**, on all three date fields. `claimedDate` needs the
time for the 5-day expiry to mean anything, and a Date-only column would round
a claim made at 9pm to the wrong day.

---

### 1a · `SignolPlayers` — three new columns

For the enquiry claim. Blank on every existing row is correct.

| Display name | **Field key** | Type |
|---|---|---|
| Claimed By | `claimedBy` | Text |
| Claimed By Name | `claimedByName` | Text |
| Claimed Date | `claimedDate` | Date and Time |

`claimedByName` is stored rather than looked up on purpose: a manager who
later leaves the club shouldn't turn every claim they made into a blank.

### 1b · `Teams` — one new column

| Display name | **Field key** | Type |
|---|---|---|
| Training Day | `T_trainingDay` | Text |

Edited on the Team Profile screen, read by the recruitment poster. Plain text,
not a dropdown — the element offers Mon–Sun chips and writes the day name.

### 1c · `RecruitmentPosts` — new collection

**Set the Collection ID explicitly to `RecruitmentPosts`.** Let Wix
auto-generate it and you get `input2` or similar — the same thing that left
you with `fixtures` vs `input1`.

**Permissions: Admin only.** Every read goes through backend with
`suppressAuth`, so nothing needs public access.

| Display name | **Field key** | Type |
|---|---|---|
| Team | `team` | Reference → **Teams** |
| Position | `position` | Text |
| Extra Line | `extraLine` | Text |
| Poster URL | `posterUrl` | Text |
| To Website | `toWebsite` | Boolean |
| To Facebook | `toFacebook` | Boolean |
| Status | `status` | Text |
| Created By Staff | `createdByStaff` | Reference → **SignolStaff** |
| Published Date | `publishedDate` | Date and Time |

`status` is `published` for website-only, `pending` when Facebook is ticked —
Facebook posts wait for approval because that's the club's public voice.

### 1d · Already exists — nothing to do

- **`ClubDictionary` category `position`** — drives the poster's dropdown.
- **`SiteAccess`** — `Team` / `Limited` (and `Admin` if present) drive
  permissions. Read by **label**, not by GUID, so recreating a row is safe.
- **`ParentMessages`** — the manager compose screen writes to it.
- **`fixtures`** — the fixture form finally sets `audience` at source.

---

## 2 · The page

**Add a new page**, hidden from the menu and from search. Any URL for now —
it takes the live Manager Hub's URL at the swap.

Then add a **Multi-State Box**:

| | |
|---|---|
| Element ID | `#stateboxMgr` |
| States | 16, named exactly as below |

**Two elements go OUTSIDE the statebox** so they stay visible on every state.

---

## 3 · Elements

Each is **Add → Embed Code → Custom Element**. Set the tag name and the
element ID exactly — page code addresses them by these strings.

### Shell — outside `#stateboxMgr`

| Tag name | Element ID | Placement |
|---|---|---|
| `manager-hub-topbar` | `#customTopbar` | Full width, ~72px tall, pinned to top |
| `manager-hub-nav` | `#customNav` | Mobile: full width, ~68px, **pinned to bottom**. Desktop: left rail ~92px wide |

The nav renders itself as a row on narrow widths and a column on wide ones,
but **where it sits is still an Editor decision, per breakpoint** — Velo has
no runtime positioning. That's the one bit of layout work custom elements
don't remove.

### Main tabs — one per nav item

| State name | Tag name | Element ID | Start height |
|---|---|---|---|
| `stateHome` | `manager-hub-home` | `#customMgrHome` | 600 |
| `stateSquad` | `manager-hub-squad` | `#customSquad` | 800 |
| `stateFixtures` | `manager-hub-fixtures` | `#customMgrFixtures` | 700 |
| `stateMessages` | `manager-hub-messages` | `#customMgrMessages` | 650 |
| `stateMore` | `manager-hub-more` | `#customMgrMore` | 700 |

### Drill-downs — no nav item, reached from a screen

| State name | Tag name | Element ID | Start height |
|---|---|---|---|
| `statePlayerRecord` | `manager-hub-player` | `#customPlayer` | 700 |
| `stateFixtureForm` | `manager-hub-fixture-form` | `#customFixtureForm` | 800 |
| `stateMessageCompose` | `manager-hub-compose` | `#customCompose` | 700 |
| `stateRecruitment` | `manager-hub-recruit` | `#customRecruit` | 900 |
| `stateTeamProfile` | `manager-hub-team-profile` | `#customTeamProfile` | 900 |
| `stateStaff` | `manager-hub-staff` | `#customStaff` | 800 |
| `stateSponsors` | `manager-hub-sponsors` | `#customSponsors` | 750 |
| `stateNews` | `manager-hub-news` | `#customNews` | 800 |
| `stateStats` | `manager-hub-stats` | `#customStats` | 900 |
| `stateStatsAdd` | `manager-hub-stats-add` | `#customStatsAdd` | 900 |
| `stateStatsEdit` | `manager-hub-stats-edit` | `#customStatsEdit` | 850 |

Heights are starting values only — every element self-sizes after first paint.
Set the state's own height to match so nothing is clipped before the first
render.

**No other elements on this page.** No buttons, no text, no repeaters, no
datasets. If you find yourself adding one, something's wrong.

---

## 4 · Code files

### Public → `custom-elements` (18)

```
managerHubNav.js            managerHubTopbar.js
managerHubHome.js           managerHubSquad.js
managerHubPlayer.js         managerHubFixtures.js
managerHubFixtureForm.js    managerHubMessages.js
managerHubCompose.js        managerHubMore.js
managerHubRecruit.js        managerHubTeamProfile.js
managerHubStaff.js          managerHubSponsors.js
managerHubNews.js           managerHubStats.js
managerHubStatsAdd.js       managerHubStatsEdit.js
```

### Backend (7)

**Order matters** — `managerData.jsw` first, everything else imports it. A
module with an unresolved import doesn't deploy at all.

```
1. managerData.jsw      ← first
2. pipeline.jsw
3. recruitment.jsw
4. teamAdmin.jsw
5. statsData.jsw
6. fixtures.jsw         ← updated (manager section appended)
7. messages.jsw         ← updated (manager section appended)
```

All `.jsw`, not `.js` — page code calls them, and a plain `.js` backend file
can't be imported from the browser side.

### Page code

`Manager Hub v2.js` — **not written yet.** That's the remaining piece.

---

## 5 · Build order

Each step leaves something that works, so a problem is always in what you
just did.

1. **CMS** (section 1). Nothing in code depends on it existing yet.
2. **Backend files**, in the order above. Publish — a deploy error here names
   the module and is loud.
3. **Page + statebox + 16 states**, empty.
4. **Shell**: topbar and nav, outside the statebox.
5. **Home and Squad** elements. These two prove the pattern end to end.
6. **The rest**, any order.
7. **Page code**, once it exists.
8. **Gate it**: add yourself to `BETA_EMAILS` and reach the page by URL until
   the swap.
9. **Swap**: rename the old Manager Hub's URL, give v2 that URL, hide the old
   one.

---

## 6 · Things that bite

**Republish AND hard-refresh after every element edit.** Custom elements cache
harder than page code, and a stale one looks exactly like a broken one.

**Custom elements don't render in the Editor or in Preview.** They only appear
on the published site. That's why the beta gate exists — it's the only way to
test them.

**Element IDs are unique page-wide.** `#customStats`, `#customStatsAdd` and
`#customStatsEdit` are three different elements; don't shorten any of them.

**The bottom nav overlays content on mobile.** Every content element already
reserves `84px + safe-area` under 750px. If a new element is ever added
without that, its last row will be unreachable — the page drags up and
rubber-bands straight back.

**Nothing on this page is a security boundary.** Elements hide rows a coach
shouldn't see, but every restriction is enforced again in the backend, because
any exported `.jsw` function is callable from a browser console.
