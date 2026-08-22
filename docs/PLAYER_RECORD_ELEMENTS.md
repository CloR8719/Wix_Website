# Player Record Lightbox — Element Reference

Element IDs for `frontend/additional_pages/Player Record.js`.

> **2026-08 Player Admin redesign:** still opened from every queue exactly as
> before, and still styled to match the new visual system (see
> `PLAYER_ADMIN_ELEMENTS.md`'s "Visual system" section — navy/gold/pitch palette,
> Barlow Condensed + Work Sans + IBM Plex Mono). Two real additions on top of the
> restyle, both optional/guarded: the flat field list below is now grouped into
> **tabs** (see "Tabs" section below) since there are 40+ fields, and a
> **"Download CSV"** button exports this one player's record - see `#prExportCsvBtn`.

**This is a Wix Lightbox.** In the Editor:
1. Add a Lightbox and **name it exactly `PlayerRecord`** (the string passed to
   `wixWindow.openLightbox("PlayerRecord", { playerId })`).
2. Turn **off** "Open automatically".

Opened from the **All Players** list and from the **Activate / Renewal / Leaver**
queues. Shows the whole record + FA downloads. **Actions area (redesigned 2026-07-25)**
always shows exactly ONE thing to do: a big "next step" button when there's an obvious
one, a plain status line when there isn't (with "Change status" as an opt-in reveal of
the manual override dropdown), or a dedicated "Player is leaving" button — never more
than one control competing for attention at once. Closes with `{ changed: true }` when
anything saves.

| # | Element ID | Type | Purpose | Initial State |
|---|-----------|------|---------|----------------|
| 1 | `#prName` | Text | Player full name | None |
| 1a | `#prAvatar` | Text, optional | Initials circle, e.g. "OB" — code-computed from name, same treatment as every other queue/list in this tool | None |
| 2 | `#prStatusBadge` | Text/Box | Current status (green/amber/grey) | None |
| 3 | `#prDob` | Text | Date of birth | None |
| 4 | `#prFan` | Text | FAN number / "Pending" | None |
| 5 | `#prTeam` | Text | Team / "No team" | None |
| 6 | `#prAge` | Text | Age group | None |
| 7 | `#prType` | Text | "Training Only" / "Playing" | None |
| 8 | `#prParentName` | Text | Parent name | None |
| 9 | `#prParentPhone` | Text | Parent phone | None |
| 10 | `#prParentEmail` | Text | Parent email | None |
| 11 | `#prCopyEmailBtn` | Button | "Copy email" — copies parent email to clipboard | None |
| 12 | `#prEmergName` | Text | Emergency contact name | None |
| 13 | `#prEmergPhone` | Text | Emergency contact number | None |
| 14 | `#prEmergRelation` | Text | Emergency contact relationship | None |
| 15 | `#prMedical` | Text | Medical info / "No conditions declared" | None |
| 16 | `#prPhoto` | Image | Headshot/ID photo preview (`SP_idPhoto`) | None |
| 16a | `#prDocPreview` | Image, optional | **NEW 2026-08.** ID document preview (`SP_idDocument`) — both are Image-type fields, so she can actually look at both before deciding whether to send it back, not just download them. Same show/hide pattern as `#prPhoto`. | None |
| 17 | `#prIdStatus` | Text | "✓ ready to download" / "⚠️ Missing…" | None |
| 18 | `#prDownloadPhoto` | Button | Downloads `SP_idPhoto` (link wired in code) | None |
| 19 | `#prDownloadDoc` | Button | Downloads `SP_idDocument` (link wired in code) | None |
| 19a | `#prExportCsvBtn` | Button | **NEW 2026-08.** "Download CSV" — exports just this player's full record, reusing `getPlayersExportUrl("all", playerId)` from `backend/exportCsv.jsw` (same field list as the Reports state's bulk exports, so they always match). Guards on `.id`. | None |
| 20-box | `#prActionsBox` | Multi-State Box | **NEW 2026-08.** See "Actions area" section below for the 4 states and what lives in each. Optional — everything below still works flat/guarded without it. | `stateActionStep` or `stateActionNone` |
| 20 | `#prPrimaryBtn` | Button | The big "next step" — label set by code; **Collapsed** when there's no obvious next step. Lives in `stateActionStep`. | Collapsed |
| 20a | `#prNoActionText` | Text | **NEW.** Shown instead of `#prPrimaryBtn` when there's nothing to do (e.g. "Waiting on parent to complete the form"). Lives in `stateActionNone`. Guards on `.id`. | Collapsed (code expands) |
| 20b | `#prChangeStatusBtn` | Button | **NEW.** Small "Change status" link — reveals `#prStatusDropdown` + `#prUpdateBtn`, then hides itself. Lives in `stateActionNone`. Guards on `.id` — build this or the dropdown can't be reached. | None |
| 21 | `#prStatusDropdown` | Dropdown | Manual override — any status EXCEPT Left Club (code fills options; leaving now has its own flow, see below). Lives in `stateActionChangeStatus`. | **Collapsed** (revealed by `#prChangeStatusBtn`) |
| 24 | `#prUpdateBtn` | Button | "Save status" — saves the dropdown choice. Lives in `stateActionChangeStatus`. | **Collapsed** (revealed by `#prChangeStatusBtn`) |
| 24a | `#prCancelStatusBtn` | Button | **NEW 2026-08, optional.** "Cancel" — backs out of `stateActionChangeStatus` without saving. Guards on `.id`. | None |
| 20c | `#prMarkLeftBtn` | Button | **NEW.** "Player is leaving" — reveals `#prLeaveReason` + `#prLeaveDate` + `#prConfirmLeaveBtn`. Hidden entirely once the player is already Left. Sits **outside** `#prActionsBox` (it's the trigger into `stateActionLeaving`, not part of a state). Guards on `.id` — build this or leaving can't be started. | Expanded (code hides if already Left) |
| 22 | `#prLeaveReason` | Dropdown | Leave reason — revealed only by `#prMarkLeftBtn`. Lives in `stateActionLeaving`. | Collapsed |
| 23 | `#prLeaveDate` | Date Picker | Leaving date — revealed only by `#prMarkLeftBtn`. Lives in `stateActionLeaving`. | Collapsed |
| 20d | `#prConfirmLeaveBtn` | Button | **NEW.** "Confirm Leave" — saves the leave (separate from `#prUpdateBtn` so it reads as a distinct, final action). Lives in `stateActionLeaving`. Guards on `.id`. | Collapsed |
| 20e | `#prCancelLeaveBtn` | Button | **NEW 2026-08, optional.** "Cancel" — backs out of `stateActionLeaving` without saving. Guards on `.id`. | None |
| 25 | `#prClose` | Button, optional | Not needed — Wix's own Lightbox popup chrome already provides a close (X). Only build/wire this if you want a custom one too. | None |
| 26 | `#prRegDate` | Text | Registration date (read-only) | None |
| 27 | `#prTasterDate` | Text | First taster date (read-only) | None |
| 27a | `#prProgress` | Text | Form completion — "Form: N% complete" for invite/renewal/draft; "—" for Active. (Guards on `.id`.) | None |
| 28 | `#prReturnNote` | Text Input (multiline) | Secretary types *why* she's sending it back | None |
| 29 | `#prSendBackBtn` | Button | "Send back to parent" → status **Action Required**, saves the note, notifies, closes | None |
| 29a | `#prPaymentActiveSummary` | Container, optional | **NEW 2026-08.** "Current payment status" safeguard — shown *instead of* the fee-picker form (29c) whenever this player already has an active/pending GoCardless plan, so she can't accidentally re-save a tier without realising one's already running. Saving a new tier here only changes what `sp_fee_category` points at — it does **not** touch the running subscription; only the parent cancelling + resetting via their own Parent Hub actually changes what's being collected. Reuses `getGoCardlessStatus()`, same function Parent Hub uses. | Collapsed (code expands if a plan's live) |
| 29b | `#prPaymentActiveText` | Text (inside 29a) | "✅ Active Direct Debit - N payment(s) collected so far." / "⏳ Payment setup in progress..." / "⚠️ ...last payment failed." | None |
| 29b-ticks | `#prPayTickStrip` | Text, optional | **NEW 2026-08, months corrected 2026-08-11.** This player's own real instalment months as coloured dots with month labels — NOT always Jul-Apr, a late-starting/one-off schedule shows its actual span (e.g. Aug-May), from `getPlayerPaymentTimeline()`'s `monthlyTicks` — green tick paid, red cross failed, amber not-yet-charged "due" dot, grey dashed future — so she's looking at evidence, not just the status line. Set via **`.html`**, one rich-text block (`tickStripHtml()` in Player Record.js), not one element per month. Collapses when there's no live plan (nothing to show yet). | Collapsed (code expands if a plan's live) |
| 29b-ledger | `#prPayLedger` | Text, optional | **NEW 2026-08.** Last 3 actual `GoCardlessPayments` rows — date, Collected/Failed, amount — real charge events, not a derived status. Also set via `.html`. Collapses alongside 29b-ticks when there's no live plan. | Collapsed (code expands if a plan's live) |
| 29c | `#prAmendPaymentBtn` | Button (inside 29a) | "Amend Payment" — hides 29a, reveals the fee form (30-33b, see `#prFeeFormBox` below) for when she genuinely needs to change something | None |
| 29d | `#prFeeFormBox` | Container, optional | **NEW 2026-08.** Wraps the existing fee-picker form (30-33b below) — collapsed by default whenever there's an active/pending plan (29a shows instead), expanded by default otherwise (first-time setup, nothing to protect against yet) | Expanded (code collapses if a plan's live) |
| 30 | `#prFeeCategory` | Dropdown | Fee tier (code fills from `FeeCategories`) | None |
| 31 | `#prFeeAnnual` | Text | Shows the selected tier's annual amount | None |
| 32 | `#prSchedulePreview` | Text (multiline) | Pro-rata schedule preview (payments × amount, first date) | None |
| 33 | `#prSaveFeeBtn` | Button | "Save fee tier" — saves the tier AND flips `sp_paymentschedulesentdate`, which is what makes the parent's payment button appear on their Dashboard (see Payment Plan flow in `PARENT_HUB_ELEMENTS.md`). One action, no separate silent-save step. | None |
| 33a | `#prPaymentStartOverride` | Date Picker | **NEW 2026-07-31.** Optional manual schedule anchor - overrides `registrationDate` for both the preview and the saved schedule (`sp_paymentStartOverride`). For the 2026-27 GoCardless rollout: migrating an existing player onto GoCardless mid-season shouldn't auto-reduce their instalment count the way a genuine new joiner's `registrationDate` would. Leave blank for normal auto pro-rata behaviour. Guards on `.id`. | None (blank = use `registrationDate`) |
| 33b | `#prPaymentCountOverride` | Number Input | **NEW 2026-08-01.** Optional manual instalment count - pairs with 33a. Setting only a start date still auto-reduces the count (e.g. an August anchor → 9); this forces a specific count instead (e.g. 10, running into May the following year, not constrained to the fixed Jul-Apr season window). Saved to `sp_paymentCountOverride`. Guards on `.id`. | None (blank = auto pro-rata count) |

## Tabs (2026-08 — optional, everything works flat/untabbed until built)

40+ fields is too many for one flat view, so they're grouped into a **Multi-State
Box** living inside this lightbox (`#prTabsBox`) — separate from Player Admin's
own `#stateMain`, same pattern (a plain button per tab, wired to `.changeState()`).
The header and actions area (`#prPrimaryBtn`/`#prNoActionText`/etc.) stay **outside**
the tabs box so they're visible no matter which tab is active.

| Tab button | State name | Fields inside |
|---|---|---|
| `#prTabOverview` | `stateOverview` | Rows 3-19a above (player summary, medical, ID docs, CSV export) + `#prReturnNote`/`#prSendBackBtn` |
| `#prTabFamily` | `stateFamily` | `#prGender`, `#prAddress`, `#prLivesWithBoth`, `#prParentName` through `#prParentAddress`, `#prSecParent*`, `#prEmerg*`, `#prSibling` |
| `#prTabConsents` | `stateConsents` | `#prConsent*` (4), `#prSigned*`, `#prConfirm*`, `#prScheduleSentDate` |
| `#prTabFees` | `stateFees` | `#prPaymentActiveSummary` (+ `#prPaymentActiveText`, `#prAmendPaymentBtn`, `#prPayTickStrip`, `#prPayLedger`), `#prFeeFormBox` wrapping `#prFeeCategory`, `#prFeeAnnual`, `#prSchedulePreview`, `#prSaveFeeBtn`, `#prPaymentStartOverride`, `#prPaymentCountOverride` |

Code always lands on `stateOverview` when a player's record is opened
(`showPrTab("Overview")` in `loadPlayer()`), regardless of which tab was left
open last time. All guarded — build `#prTabsBox` whenever you're ready; until
then every field just renders in one flat view, same as before this addition.

## Extended fields — parents, sibling, consents, signature (built 2026-07-25)

All plain **Text** elements, all guard on `.id` so the lightbox works before each is
built. Suggested grouping (matches Rob's sectioned layout): Player details already
above; these split into **Parents**, **Sibling**, **Consents & Signature**.

| Element ID | CMS field | Notes |
|---|---|---|
| `#prGender` | `sp_gender` | Reference → ClubDictionary `.label` |
| `#prAddress` | `mainAddress` | Formatted via `fmtAddress()` |
| `#prParentRelation` | `SP_relationship` | Reference `.label` |
| `#prParentDob` | `sp_parent_dob` | `fmtDate()` |
| `#prParentAddress` | `sp_parent_address` | "Same as player's" if blank |
| `#prLivesWithBoth` | `livesWithBothParents` | "Yes" / "No" |
| `#prSecParentName` | `secondaryParentName` | "—" if blank |
| `#prSecParentRelation` | `secondaryParentRelation` | Reference `.label` |
| `#prSecParentPhone` | `secondaryParentMobile` | |
| `#prSecParentEmail` | `secondaryParentEmail` | |
| `#prSecParentDob` | `sp_secparent_dob` | `fmtDate()` |
| `#prSecParentAddress` | `sp_secparent_address` | "Same as player's" if blank |
| `#prMembershipNo` | `sp_membership_no` | "Not yet assigned" if blank |
| `#prSibling` | `sp_has_sibling` + `sp_sibling_team` | "Yes — [team]" / "No" |
| `#prConsentPhoto` | `sp_consent_photo` | Tri-state consent text |
| `#prConsentSocial` | `socialMedia` | Tri-state consent text |
| `#prConsentMedical` | `sp_consent_medical` | Tri-state consent text |
| `#prConsentFA` | `sp_consent_fa` | Tri-state consent text |
| `#prSignedBy` | `registrationPrintNameSignature` | |
| `#prSignedDate` | `registrationDateTimeStampSigned` | `fmtDate()` |
| `#prConfirmParent` | `registrationConductParent` | "✓" / "✗" / "—" |
| `#prConfirmPlayer` | `registrationConductPlayer` | "✓" / "✗" / "—" |
| `#prConfirmCorrect` | `registrationConfirmCorrect` | "✓" / "✗" / "—" |
| `#prScheduleSentDate` | `sp_paymentschedulesentdate` | `fmtDate()` |

`backend/exportCsv.jsw`'s `getPlayersExportUrl` now exports all 25 of these as matching
CSV columns too (same tri-state consent wording, "Same as player's" / "Not yet assigned"
fallbacks), so the Reports exports stay in sync with the lightbox.

## Send-back + Fees (added 2026-06-30)
- **Send back** (`#prSendBackBtn`) calls `secretarySendBackToParent` — sets status to
  **Action Required**, saves `SP_returnNote`, and queues a parent notification. The
  parent's Parent Hub reopens the form (Action Required is editable) and shows the note;
  on resubmit they return to **Ready for FA**.
- **Fees**: picking a tier in `#prFeeCategory` previews a **pro-rata** schedule
  client-side (`buildFeeSchedule`, mirrored from the backend version of the same
  name) — everyone pays `annual / 10` monthly; late joiners get fewer instalments,
  anchored to `registrationDate` unless `#prPaymentStartOverride` is set (see row 33a).
  `#prSaveFeeBtn` ("Save fee tier") is the one action: saves the tier and enables
  payment for the parent in a single step (see "Payment plan" under Data Model
  Notes in `PARENT_HUB_ELEMENTS.md` for the full flow). Actual collection is via
  **GoCardless Direct Debit** (`backend/gocardless.jsw`) as of 2026-07-30 — replaced
  Wix Pricing Plans entirely, so `FeeCategories.F_wixPlanId` is dead/unused now.

## Actions area (redesigned 2026-07-25, restructured as a state box 2026-08)

Now its own **Multi-State Box** (`#prActionsBox`), separate from `#prTabsBox` -
only one state is ever visible, so there's no crowding no matter how many
fields a given mode needs. `#prMarkLeftBtn` sits **outside** this box (in the
row next to it) since it's the trigger *into* `stateActionLeaving`, not part of
any one state. Fully backward compatible: if `#prActionsBox` isn't built, the
original `.expand()`/`.collapse()` calls (still in the code) keep working
exactly as before - build the box whenever you're ready.

(Building tip that turned out to be the actual fix for the "box keeps
shrinking" issue: select the box - and elements inside it - via the **Layers**
panel rather than clicking on canvas. Once elements overlap, a canvas click
can grab the wrong one, and resizing that is what was causing the fight.)

| State | Contains | Reached via |
|---|---|---|
| `stateActionStep` | `#prPrimaryBtn` | default, when there's an obvious next step |
| `stateActionNone` | `#prNoActionText` + `#prChangeStatusBtn` | default, when there isn't |
| `stateActionChangeStatus` | `#prStatusDropdown` + `#prUpdateBtn` + `#prCancelStatusBtn` (optional) | clicking `#prChangeStatusBtn` |
| `stateActionLeaving` | `#prLeaveReason` + `#prLeaveDate` + `#prConfirmLeaveBtn` + `#prCancelLeaveBtn` (optional) | clicking `#prMarkLeftBtn` |

`#prCancelStatusBtn`/`#prCancelLeaveBtn` are new, optional "back out without
saving" links - both guarded, return to whichever of `stateActionStep`/
`stateActionNone` is correct for the player's current status.

Only one control is ever "the thing to do" at a time:

| Player is… | What shows | Result |
|------------|--------------|--------|
| Ready for FA | `#prPrimaryBtn` "Mark FA Registered" | → FA Registered |
| FA Registered | `#prPrimaryBtn` "Make Active" | → Active |
| Left (not yet confirmed) | `#prPrimaryBtn` "Confirm removed from FA" | sets `leftClubCheck = true` |
| Active / Awaiting Parent / Draft / Renewal Due / Action Required / left-confirmed | `#prNoActionText` (context message) + `#prChangeStatusBtn` link | opens the dropdown if she needs to override |
| any status except Left | `#prMarkLeftBtn` "Player is leaving" always available | reveals reason + date + `#prConfirmLeaveBtn` |

**Renewal Due deliberately has NO primary-button shortcut to Active anymore** — the
2026-07-05 design decided the parent must submit their renewal form (which always
routes to Ready for FA, same review as a brand-new registration); a one-click "Mark
Renewed" bypassed that entirely, so it's been removed. Renewal Due now behaves like
Awaiting Parent: a status message + the manual override if she genuinely needs it.

**Leaving is no longer a dropdown option.** `#prStatusDropdown`'s options list no
longer includes "Left Club" — starting a leave is only reachable via the dedicated
`#prMarkLeftBtn` → reason/date → `#prConfirmLeaveBtn` flow, so it can't be confused
with a routine status correction.

**Notes**
- Download buttons start **disabled**; code enables + sets `.link` once files load.
- Uses `getPlayerFaFiles(playerId)` in `backend/exportCsv.jsw`.
- `#prChangeStatusBtn`, `#prMarkLeftBtn`, `#prConfirmLeaveBtn`, `#prNoActionText` are
  all new and guarded on `.id` — until they're built in the Editor, the manual status
  dropdown and the leave flow are **not reachable** from this lightbox (the primary
  button and everything else still works).
