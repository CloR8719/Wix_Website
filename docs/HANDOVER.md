# Handover

Written 23 August 2026, before moving to Wix Git Integration.

**Why this file exists:** the Wix-generated repo starts empty of history. It
gets the live code and nothing else — no commits, no `docs/`, no context. The
code itself carries about 160 `⚠️` comments explaining *why* things are the
way they are, and those travel with the files. This is everything that
doesn't.

**First job in the new repo:** copy this whole `docs/` folder across.

---

## Where things are

| Area | Files |
|---|---|
| Parent Hub v2 | `parentHub*.js` elements + `Parent Hub v2.js` |
| Manager Hub v2 | `managerHub*.js` (20 elements) + `Manager Hub v2.js` |
| Secretary | `Player Admin.js`, `Player Record.js`, `Staff Record.js` |
| Backends | `managerData`, `pipeline`, `fixtures`, `messages`, `statsData`, `recruitment`, `teamAdmin`, `registration`, `gocardless`, `facebook`, `potmPoster` |
| Shared | `wixFormat.js`, `squadRules.js`, `potmSchedule.js` |
| Cron | `jobs.config` |

⚠️ **Custom element files must sit FLAT in `public/custom-elements`.** The
Editor's Custom Element picker does not traverse subfolders — the file simply
can't be selected. Group by filename prefix instead.

---

## Setup values that live outside the code

| What | Where | Value |
|---|---|---|
| Facebook Page id | constant in `facebook.jsw` | `1719682841640246` |
| Facebook token | Wix Secrets | `_FB_PAGE_TOKEN` |
| GoCardless | Wix Secrets | `_GOCARDLESS_ACCESS_TOKEN`, `_GOCARDLESS_WEBHOOK_SECRET` |
| Twilio (dead) | Wix Secrets | `_TWILIOSID`, `_Auth`, `_phone` |
| Secretary access | `masterPage.js` | `SECRETARY_EMAILS` |
| Beta testers | `public/betaAccess.js` | still used by Parent Hub v2 |

---

## Outstanding

### Needs a real-world moment to check

- **Today's fixture may drop off the Home teaser.** Wix's backend runs UTC,
  the club is on BST. A date stored as local midnight lands at 23:00 the
  previous day. Proven *not* to leak past fixtures; today's own could vanish.
  Check on a matchday. Two-line fix if real.
- **Facebook token, around November.** Meta expires *data access* 90 days
  after the app last interacted with the granting user, separately from token
  expiry. If it stops, the error message contains the full fix.
- **First real POTM Monday.** Everything is proven individually and in a dry
  run; a live weekend with 15 managers is the last unknown.

### Known gaps, no fix planned yet

- **`TeamStats` ↔ `PlayerStats` have no link** — no match reference or date,
  so stats are per-season not per-match. A published squad line-up *is* a
  match reference, so that is now the obvious route in.
- **`ClubNews.expire` is written but never read.** Nothing hides an expired
  news item.
- **`isPrivate: false` on children's ID uploads** in `mediaUpload.jsw` —
  deliberate for posters, an open question for ID documents. Not the same
  decision and shouldn't inherit it.
- **Secretary link-request queue** — parents can ask to be linked to a player;
  no queue exists for the secretary to action it.
- **Fixture notifications** — rolling teaser and unanswered surfacing. Design
  is that fixtures write into `ParentMessages` so push is wired once.

### Housekeeping

- **`database/CMS_SCHEMA.txt` is stale.** Missing `eventType`, `startTime`,
  `audience`, every `rsvp*` column, and everything added for squads and POTM.
  Worth regenerating.
- **Four files carry `⚠️ SETUP: paste the ClubDictionary "Action Required" _id`**
  — `Player Record.js`, `Player Admin.js`, `Manager Hub.js`, `Parent Hub.js`.
  The live copies have the real GUID (`d5bd1c0f-…`); the repo copies may not.
- **Old Parent Hub retirement.** The page is retired but still exists.
  `public/parentHubProgressBar.js` exists only for it and goes when it does.
- **Twilio is unfunded and dead.** ⚠️ **Do not delete the npm package or the
  secrets.** `sms.jsw` imports `twilio` at module load, `notifications.jsw`
  imports that, and `Player Enquiry.js` imports that — removing the package
  kills the public enquiry page. Cut the call first, then the imports, then
  the package.

---

## Lessons that cost real time

Each of these was a live bug, not a theory.

### A UI that reports success it hasn't verified hides every bug behind it

`toWebsite` did nothing for weeks: nothing on the public site read
`RecruitmentPosts`, and the message said "saved and ready for the website"
regardless. Every destination now reports its own *checked* outcome.

### Feedback must appear where the button is

Hit three times in one day — the fixtures nudge, the fixtures flash, and the
recruitment publish. A result rendered at the top of a long element is
off-screen for anyone who scrolled, and the action reads as a dead button.

### Wix Data: `.ne(true)` does not match an unset field

A boolean column added to a collection with existing rows leaves those rows
*unset*, not false. `.ne("x", true)` silently returns nothing. Use
`.eq(false).or(...isEmpty())`. This silently stopped the fixtures rollup once
and would have stopped the POTM poster.

### Writing a row the reader's query can't match fails silently

`ParentMessages` rows written with `kind` but no `scope` were invisible in the
Parent Hub — inserted fine, reach counted, never seen. **Read the reader's
query before writing into a collection**, and copy the field list from the
existing writer rather than composing one from the schema.

### A method defined twice in a class body silently discards the first

`consentGaps()` existed twice in `managerHubStatsAdd.js`; the later, stale one
won, so the consent override never rendered and a squad photo could not be
published at all. `node --check` and ESLint both pass. **After rewriting a
method, grep the file for its name.**

### Timezones: the backend is UTC, the club is not

"Monday 10am" computed naively is 11am for half the year. Everything
time-of-day goes through `Europe/London` conversion in `potmSchedule.js` —
never assume an offset, ask `Intl` what it is on that date.

### Dates stored as strings can't be filtered in a query

`fixtures.date_only` comes back as a string. A `.ge()` comparing it to a JS
Date **matches nothing, with no error**. Filter in JS instead.

### Allocating by counting breaks the moment anything is deleted

The POTM slot allocator used "how many are booked" as the index. Delete one
and every later submission collides. Find the gap; don't count.

### Native date/time inputs overflow their container

`min-width` beats `width: 100%`, and the picker chrome has a wide intrinsic
minimum. Needs `appearance: none; min-width: 0` — and on mobile, one field per
row regardless. Looks fine on desktop, escapes the box on a phone.

### iOS zooms on inputs under 16px and never zooms back

Every form input goes to 16px under 750px.

### The pinned nav sits over self-sizing elements

These elements set their own height from a `ResizeObserver`, which overrides
anything the Editor sets — dragging them taller does nothing. Clearance has to
live *inside* each element:
`padding-bottom: calc(84px + env(safe-area-inset-bottom, 0px))`.

### Flex `gap` belongs on the node whose children are the sections

`.wrap` usually has one child (`#body`), so a gap there separates nothing. It
presents as "headings sitting on the boxes", which reads like a margin problem
and isn't.

---

## The problem this move solves

Every "mystery" today came from **the repo and the live site being two
separate things that drift**: blank crest URLs that would have wiped the real
ones, `example.com` secretary emails, a stale `managerHubRecruit.js` showing
wording we'd already changed, a `.comm` typo nobody could see.

Once the site tracks the repo, that whole class of problem disappears.

⚠️ **But the risk moves.** A push goes to the live site with no paste step and
no review. Find out on day one whether it auto-publishes or lands as
unpublished code — and if it does auto-publish, work on a branch and merge
deliberately rather than committing straight to the default.
