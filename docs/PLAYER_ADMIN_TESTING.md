# Player Admin — Testing Checklist

Sign-off list for the Club Secretary Player Admin tool before it goes live.
Work top-to-bottom: each phase assumes the one above passed. Test on the
**published/preview site while logged in as the secretary**, not just the Editor,
because permissions and Automations only fire on the live data.

Legend: ☐ = to test · ✅ = passed · ❌ = failed (note what happened)

> **The Player Admin tool is the back half of a longer pipeline.** A player only
> reaches the secretary's "Ready for FA" queue *after* passing through the enquiry
> form, Manager Hub and the parent registration form. If any of those upstream
> handoffs is broken, the secretary's queues stay empty or show bad data — so the
> real test follows **one player through the whole chain** (Phase 1) before drilling
> into each screen (Phases 2+).

## The lifecycle (what moves a player from one queue to the next)
| # | Status | Set by | Where |
|---|--------|--------|-------|
| 1 | **Enquiry** | Parent submits the public enquiry form (or staff via Manual Enquiry) | `Player Enquiry.js` / `Manual Enquiry.js` |
| 2 | **On Trial** | Manager pulls the enquiry into their squad | Manager Hub |
| 3 | **Awaiting Parent** | Manager clicks *Invite* → sets taster/reg dates, mints token+link, queues the email | `InviteRegistration` lightbox → `EmailQueue` |
| 4 | *(Draft)* | Parent opens the form and starts filling it (progress %) | Parent Hub / secure-registration |
| 5 | **Ready for FA** | Parent completes + signs the form | Parent Hub → **secretary's queue** |
| 6 | **FA Registered** | Secretary: *Mark FA Registered* | PlayerRecord |
| 7 | **Active** | Secretary: *Make Active* | PlayerRecord |
| 8 | **Renewal Due** | Annual renewal → back to parent → Ready for FA again | (renewal cycle) |
| — | **Action Required** | Secretary *sends back* → parent fixes → Ready for FA | PlayerRecord ↔ Parent Hub |
| — | **Left Club** | Manager (Player Profile) or secretary marks left → Leavers queue | PlayerRecord / Player Profile |

---

## Phase 0 — Pre-flight (nothing works until these are done)
These are the "breaks everything" items. Do them first and confirm each.

- ☐ **Action Required GUID replaced** — `REPLACE_WITH_ACTION_REQUIRED_GUID` is gone
  from all 5 files (`Player Admin.js`, `Player Record.js`, `registration.jsw`,
  `Parent Hub.js`, `Manager Hub.js`) and replaced with the real ClubDictionary `_id`.
  *Quick check:* search the site code for `REPLACE_WITH` — should be **0 hits**.
- ☐ `FeeCategories` collection exists with 6 seeded tiers (label + `F_annual_amount`).
- ☐ `ParentNotifications` collection exists with the fields from `CMS_SCHEMA.txt`.
- ☐ `SignolPlayers` has the 3 new fields (lowercase keys): `sp_return_note`, `sp_fee_category`
  (Reference → FeeCategories), `sp_paymentschedulesentdate`.
- ☐ Wix Automation is set up on `ParentNotifications` — one email template per
  `notifyType` (`sent_back`, `fee_schedule`).
- ☐ Page-level IDs exact (2026-08 redesign): sidebar buttons `#navDashboard`/
  `#navRegistrations`/`#navRenewals`/`#navPlayers`/`#navPayments`/`#navReports`;
  `#stateMain` states `stateDashboard`/`statePipeline`/`stateRenewals`/`statePlayers`/
  `statePayments`/`stateReports` — see `PLAYER_ADMIN_BUILD_GUIDE.md` for the full spec.
- ☐ Lightbox named exactly `PlayerRecord`, "open automatically" **OFF**.

---

## Phase 1 — The golden thread (one player, enquiry → active → left)
Do this **first, in order**, once Phase 0 passes, with a single throwaway player named
e.g. "TEST Alfie". This is the master test; if it passes, the plumbing between all five
systems works.

1. ☐ **Enquiry** — submit the public **Player Enquiry** form with a valid child DOB.
   Confirm: a `SignolPlayers` row is created with status **Enquiry**, age group
   auto-matched from DOB, and (if Twilio is live) the manager SMS fired. *(Note:
   `Manual Enquiry.js` has the SMS commented out — that's expected for staff entry.)*
2. ☐ **DOB guard** — try a DOB outside all age-group ranges → form blocks with
   "Date of Birth falls outside of active club age groups." (nothing saved).
3. ☐ **On Trial** — in **Manager Hub**, pull that enquiry into the squad → status
   **On Trial**, team assigned.
4. ☐ **Invite** — click **Invite**, fill the InviteRegistration lightbox (taster date,
   reg date, player type). Confirm: status → **Awaiting Parent**, `inviteToken` +
   `registrationLink` populated, an `EmailQueue` row created, parent gets the link email.
   → *the player now appears in Player Admin's Awaiting Parent queue.*
5. ☐ **Parent starts the form** — open the emailed link (or Parent Hub) → status flips
   to **Draft**, `registrationProgress` climbs as fields are filled.
6. ☐ **Parent completes + signs** → status → **Ready for FA**,
   `registrationDateTimeStampSigned` set. → *player now appears in the secretary's
   **Ready for FA** queue.* **(This is the handoff into Player Admin — verify it lands.)**
7. ☐ **Secretary processes FA** — open PlayerRecord from the FA queue, download the
   photo + ID doc, *Mark FA Registered* → moves to **Activate** queue.
8. ☐ **Activate** → *Make Active* → status **Active**, KPI "Active" count goes up.
9. ☐ **Fees** — set a fee tier and send the schedule (detail in Phase 7).
10. ☐ **Leaver** — mark the player **Left** (manual status in PlayerRecord, with reason
    + date) → team cleared → appears in **Leavers** queue → *Confirm removed from FA* →
    `leftClubCheck` set → drops out of the queue.

If every step above lands the player in the next screen with the right status, the
end-to-end system works. Phases 2–10 below drill into each screen's detail and edge cases.

---

## Phase 2 — Player Admin loads clean
- ☐ Open Player Admin → lands on **To Do** view, no console errors.
- ☐ `#viewToggle` shows To Do / Players / Reports and switches the box between them.
- ☐ KPI texts (`#kpiActive`/`#kpiOnboarding`/`#kpiLeft`) show numbers *if you built them*
  (they're optional — but if present they must not throw).

## Phase 3 — "To Do" queues (each queue = one real test player)
Set up one player in each status, then confirm the queue behaves. Empty queues
should be **collapsed**; the count text matches the number of rows.

- ☐ **Ready for FA** — player appears in `#faRepeater` with name/team/DOB/parent/type;
  ID badge reads `ID ✓` only when *both* photo and ID doc exist, else `ID missing` (red).
  Process button opens **PlayerRecord**.
- ☐ **Activate** (status FA Registered) — shows in Activate queue, opens PlayerRecord.
- ☐ **Renewal** (status Renewal Due) — shows in Renewal queue, opens PlayerRecord.
- ☐ **Leavers** (status Left **and** `leftClubCheck` not true) — shows reason + leaving
  date, opens PlayerRecord. A Left player *with* `leftClubCheck = true` must **not** appear.
- ☐ **Awaiting Parent** (status Awaiting Parent) — Copy email copies the parent address
  (button flips to "Copied!"); Resend link sends and flips to "Sent ✓".
- ☐ **Sent back** (status Action Required) — shows the return note in quotes + "Sent back
  {date}"; Copy email works; Nudge flips to "Nudged ✓".
- ☐ **All queues empty** → `#emptyToDo` shows; every queue container collapsed.

## Phase 4 — "Find a Player" roster
- ☐ First open shows the prompt "Pick a team, or search a name…" and **no** list
  (nothing renders until a filter/search is active — this is deliberate for 300+ players).
- ☐ Search by name filters live as you type.
- ☐ Team / Age Group / Status dropdowns each filter correctly, and combine.
- ☐ "Show left players" switch (off by default) — left players hidden until it's on.
- ☐ A filter with many matches caps at 100 and shows "Showing first 100 of N — narrow
  it down by team".
- ☐ No matches → "No players match — try a different team or spelling." + "0 players".
- ☐ Row badges correct: status colour (green Active / grey Left / amber otherwise),
  MEDICAL vs Clear, Training Only vs Playing. View button opens PlayerRecord.

## Phase 5 — Reports
- ☐ Export Full Register downloads a CSV of all players.
- ☐ Export FA To-Do downloads only the FA-relevant players.
- ☐ Export Leavers downloads only leavers.
- ☐ A scope with no data → button shows "No data found" and resets (doesn't hang).

## Phase 6 — PlayerRecord lightbox (the workhorse)
Open from any queue and confirm the record renders + each action.

- ☐ Header: name, status badge (Action Required = red), DOB, FAN (or "Pending"),
  team, age, type all populate. Parent + emergency contact + medical show correctly
  ("No medical conditions declared." when clear).
- ☐ FA downloads: buttons stay disabled until links load; `#prIdStatus` reads
  "✓ Photo and ID document ready…" or "⚠️ Missing photo & ID document". Both links
  open the real files in a new tab.
- ☐ **Primary button** is status-aware and only shows when there's a next step:
  - Ready for FA → "Mark FA Registered" → moves player to Activate queue.
  - FA Registered → "Make Active".
  - Renewal Due → "Mark Renewed (Active)".
  - Left (not yet confirmed) → "Confirm removed from FA" (sets `leftClubCheck`).
  - Active/other → button is **collapsed** (no primary action).
  After any primary action the lightbox closes and the dashboard lists refresh.
- ☐ **Manual status override** dropdown defaults to current status; changing to any
  status and Update saves + closes + refreshes.
- ☐ Manual → **Left Club**: reason + leaving-date fields appear; saving with either
  blank shows "Pick reason & date"; saving with both clears the team, sets
  `leftClubCheck` false, and the player then appears in the Leavers queue.

## Phase 7 — Send-back + Fees (the flows that must be perfect)
### Send-back round trip
- ☐ In PlayerRecord, empty note + Send back → "Add a note first" (no send).
- ☐ Type a note → Send back → player moves to **Sent back** queue with that note;
  status = Action Required; parent gets the email (check ParentNotifications got a
  `sent_back` row **and** the Automation delivered it).
- ☐ Parent logs into **Parent Hub** → the registration form reopens (Action Required is
  editable) and shows the secretary's note.
- ☐ Parent resubmits → status returns to **Ready for FA** → player reappears in the
  secretary's FA queue. *(This is the full loop — test it once end to end.)*

### Fees
- ☐ Pick a tier → `#prFeeAnnual` shows the annual amount and `#prSchedulePreview` shows
  N payments of £X, first date + monthly.
- ☐ **Pro-rata sanity:** a player registered in **July** gets 10 payments; a player
  registered in **January** gets fewer (4); an off-season (May/June) player gets the
  full 10 from July. Confirm the maths (annual ÷ 10 per payment).
- ☐ Save fee tier (no send) → `SP_feeCategory` stored; reopening the record shows that
  tier pre-selected. No ParentNotifications row created.
- ☐ Send schedule → `SP_paymentScheduleSentDate` set, a `fee_schedule` ParentNotifications
  row created, parent receives the schedule email.

## Phase 8 — Cross-hub knock-on
- ☐ **Manager Hub**: a player set to Action Required shows the Action Required badge there.
- ☐ **Parent Hub**: only Action Required (not other statuses) reopens the editable form.

## Phase 9 — Error handling / edge cases
- ☐ Player with **no parent email**: Resend shows "No email on file"; send-back/nudge/fee
  email degrade gracefully (backend returns an error, button shows "Error" not a crash).
- ☐ Player with **no registrationDate**: fee schedule still previews (falls back to today).
- ☐ Opening PlayerRecord with a bad/missing playerId just closes cleanly.
- ☐ Rapid double-click on a save button doesn't double-write (buttons disable while saving).
- ☐ Slow network: "Saving…/Sending…" labels appear and resolve; nothing gets stuck.

## Phase 10 — Secretary usability (the "simple to use" bar)
- ☐ Every button has a title/label a non-technical secretary understands (you flagged
  titles are still to add — check each queue and the lightbox).
- ☐ It's obvious from the To Do view what needs doing today (counts + only non-empty
  queues showing).
- ☐ The one big primary button in PlayerRecord is the obvious next step — she shouldn't
  need the manual dropdown for normal work.
- ☐ Nothing requires knowing a status GUID, collection name, or anything technical.

---

### Fastest way to run this
Run **Phase 1 (the golden thread)** end to end with one "TEST" player — that alone
exercises every system's handoff. Then, to cover the detail phases quickly, create
~8 players, one per status (Ready for FA, FA Registered, Active, Renewal Due, Left,
Awaiting Parent, Action Required, On Trial): that single set lights up every queue,
the roster filters, and all the lightbox branches. Keep them named "TEST …" so they're
easy to delete afterwards.
