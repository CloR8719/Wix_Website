# Parent Hub — Page Element Reference

Element IDs required in the Wix Editor for `frontend/members_pages/Parent Hub.js`,
organized by section/state with type, purpose, and required **initial state** in the
editor (before any code runs).

**Initial State key:**
- `Visible` — normal, on-screen, takes up layout space
- `Collapsed` — removed from layout (`.collapse()` in code, `.expand()` to restore)
- `Hidden` — stays in layout but invisible (`.hide()` in code, `.show()` to restore)
- `Collapsed + Hidden` — both applied initially
- `None` — leave as default/visible, code doesn't toggle it on load

## Root / Always Visible

| # | Element ID | Type | Purpose | Initial State |
|---|-----------|------|---------|----------------|
| 1 | `#textWelcome` | Text | "Welcome back,\n[Name]" greeting | None |
| 2 | `#stateboxHub` | State Box | Main container — holds 4 states (`stateDashboard`, `stateRegistration`, `stateProfile`, `statePayment`) | Default state = `stateDashboard` |

## State: stateDashboard

### My Details

Lets the logged-in parent edit their own name/phone, which then syncs to every
linked player record (primary or secondary) via `secureUpdateParentProfile`.

| # | Element ID | Type | Purpose | Initial State |
|---|-----------|------|---------|----------------|
| 1 | `#btnEditMyDetails` | Button | Toggles `#boxMyDetails` open/closed | None |
| 2 | `#boxMyDetails` | Container | Edit panel for name/phone | Collapsed |
| 2a | `#inputMyName` | Text Input | Parent's full name | None |
| 2b | `#inputMyPhone` | Text Input | Parent's phone number | None |
| 3 | `#btnSaveMyDetails` | Button | Saves name/phone, syncs to linked players | None |

### Fan Number / DOB Linking (fallback when email doesn't match a player)

Two-step flow: `#btnLinkByFanDob` calls `findPlayerByFanNumberAndDob` (read-only
preview, server-side rate-limited at 3 attempts via `ParentProfiles.PP_linkAttempts`),
then `#btnConfirmLink` calls `confirmPlayerLink` to actually link. Shown automatically
when a parent has no linked kids; `#btnAddAnotherChild` re-opens it for a parent who
already has one child linked (e.g. to add a sibling on a different email).

| # | Element ID | Type | Purpose | Initial State |
|---|-----------|------|---------|----------------|
| 1 | `#boxFanLookup` | Container | Fan Number/DOB entry form | Collapsed |
| 1a | `#inputFanNumber` | Text/Number Input | Player's Fan Number | None |
| 1b | `#inputDobLookup` | Date Picker | Player's date of birth | None |
| 1c | `#btnLinkByFanDob` | Button | Runs the preview lookup | None |
| 2 | `#txtLinkResult` | Text | Error / status message (no match, locked out, already linked) | Collapsed |
| 3 | `#boxConfirmLink` | Container | "Is this your child?" confirmation step | Collapsed |
| 3a | `#txtConfirmLink` | Text | "We found a player called X (Fan No. Y)..." | None |
| 3b | `#btnConfirmLink` | Button | Confirms and performs the actual link | None |
| 3c | `#btnCancelLink` | Button | Cancels, collapses `#boxConfirmLink` | None |
| 4 | `#btnAddAnotherChild` | Button | Re-opens `#boxFanLookup` for a parent who already has a linked child | Collapsed |

### Kids List

| # | Element ID | Type | Purpose | Initial State |
|---|-----------|------|---------|----------------|
| 1 | `#textNoKids` | Text | Shown if parent has no linked players | Collapsed + Hidden |
| 2 | `#boxAlert` | Container | "⚠️ Action Required" banner | Collapsed |
| 2a | `#textAlertMsg` | Text | Count of outstanding registration forms | None |
| 3 | `#repeaterKids` | Repeater | One card per linked child | Visible |
| 3a | `#textKidName` | Text (in repeater) | Child's full name | None |
| 3b | `#textSquad` | Text (in repeater) | Team name / "Squad Unassigned" | None |
| 3c | `#headshot` | Image (in repeater) | Child's photo, falls back to a placeholder | None |
| 3d | `#textStatus` | Text (in repeater) | Onboarding status label, color-coded (see Status Pipeline below) | None |
| 3e | `#btnAction` | Button (in repeater) | Routes to Registration form (Invited/Renewal/Draft) or read-only Profile (everything else) | None |
| 3f | `#btnPayment` | Button (in repeater) | **NEW.** Its own button, separate from `#btnAction` (paying fees is a different concern from status-driven routing) — only shown once a fee schedule's been saved AND that tier has a matching `F_wixPlanId`. Routes to `statePayment`. Never hidden again once paid - relabels instead ("Set Up Payment" → "Payment ✓ (Manage)" → "⚠️ Payment Failed - Fix" / "⚠️ Plan Changed - See Details"), so it's always reachable to switch plans or fix a problem. Guarded on `.id`. See "Payment Plan" under Data Model Notes. | Collapsed |

## State: stateRegistration

Reached via `#btnAction` when a child's status is Invited, Renewal, Draft, **or Action
Required** (sent back by the club secretary). Editable form for a parent completing/
renewing a registration. `#btnBackToHubReg` returns to `stateDashboard` (refreshing the
dashboard first).

| # | Element ID | Type | Purpose | Initial State |
|---|-----------|------|---------|----------------|
| 0a | `#boxReturnNote` | Container | Shown only when status = Action Required — holds the secretary's note | Collapsed |
| 0b | `#regReturnNote` | Text | "⚠️ The club needs an update: …" (`SP_returnNote`) | None |
| 1 | `#btnBackToHubReg` | Button | Back to Dashboard (refreshes data first) | None |
| 2 | `#regfullname` | Text | Full name (display) | None |
| 3 | `#regfirstName` | Text | First name (display) | None |
| 4 | `#reglastName` | Text | Last name (display) | None |
| 5 | `#regfan` | Text | Fan Number, or "(In Progress)" | None |
| 6 | `#regagegroup` | Text | Age group / "Unassigned" | None |
| 7 | `#regteamname` | Text | Team name / "Squad Unassigned" | None |
| 8 | `#regmanagername` | Text | Team manager's name (async lookup) / "TBD" | None |
| 9 | `#regparentname` | Text | Primary parent name (display) | None |
| 10 | `#regparentmobile` | Text Input | Primary parent phone (editable) | None |
| 11 | `#regparentemail` | Text | Primary parent email (display) | None |
| 12 | `#regDOB` | Date Picker | Player date of birth | None |
| 13 | `#regAddress` | Text Input | Home address | None |
| 13a | `#regparentdob` | Date Picker | Primary parent DOB (WGS requirement) | None |
| 13b | `#regparentaddress` | Address Input | Primary parent address, only if different from player's (blank = same) | None |
| 13c | `#regmembership` | Text (display, read-only) | Club membership number / Standing Order payment reference — server-generated | None |
| 14 | `#reginitials` | Text Input | Player initials | None |
| 14a | `#regemergencysource` | Dropdown | Emergency contact source — options built at runtime: "Parent 1 (name)", "Parent 2 (name)" (only if `#regadd2parents`=Yes), "New / someone else". Picking Parent 1/2 auto-fills + collapses `#boxEmergencyManual`; "New" expands it for manual entry. See "Emergency contact source" under Data Model Notes | None |
| 15 | `#boxEmergencyManual` | Container | Wraps the 3 fields below (+ their labels) — collapsed entirely when Parent 1/2 is selected above, so nothing shows twice | None (expanded by default; code will collapse it on load if a parent source was previously saved) |
| 15a | `#regemergencycontact` | Text Input (in `#boxEmergencyManual`) | Emergency contact name | None |
| 16 | `#regemergencycontactmobile` | Text Input (in `#boxEmergencyManual`) | Emergency contact number | None |
| 17 | `#regemergencycontactrelatoin` | Dropdown (in `#boxEmergencyManual`) | Emergency contact relationship (`ClubDictionary` category=`relationship`) | None |
| 17a | `#reggender` | Dropdown | Player gender (`ClubDictionary` category=`gender`) — WGS requirement, counted in `#textProgress` | None |
| 18 | `#regshirtsize` | Dropdown | Shirt size (`ClubDictionary` category=`shirt_size`) | None |
| 19 | `#regshortsize` | Dropdown | Shorts size (`ClubDictionary` category=`shorts_size`) | None |
| 20 | `#regcoatsize` | Dropdown | Coat size (`ClubDictionary` category=`coat_size`) | None |
| 21 | `#reghoodiesize` | Dropdown | Hoodie size (`ClubDictionary` category=`hoodie_size`) | None |
| 22 | `#regsocksize` | Dropdown | Sock size (`ClubDictionary` category=`sock_size`) | None |
| 23 | `#regparentrelation` | Dropdown | Primary parent relationship (`ClubDictionary` category=`relationship`) | None |
| 24 | `#txtConsent` | Text (clickable link) | Opens the Consent Lightbox (see below) | None |
| 24a | `#regconsentphoto` | Radio (`true`/`false`), **read-only** | Website photo consent — mirrors Consent Lightbox answer | None |
| 24b | `#regconsentsocial` | Radio (`true`/`false`), **read-only** | Social media photo consent — mirrors Consent Lightbox answer. Writes to the existing `socialMedia` field. **Replaces the old directly-editable `#regsocialmedia` element — delete `#regsocialmedia` from the Editor if it's still present, to avoid two competing controls for the same field.** | None |
| 24c | `#regconsentfa` | Radio (`true`/`false`), **read-only** | FA/Whole Game System data-sharing consent — mirrors Consent Lightbox answer. Mandatory: a "No" or blank blocks `#btnSubmitFinal` | None |
| 24d | `#regconsentmedical` | Radio (`true`/`false`), **read-only** | Emergency medical treatment consent — mirrors Consent Lightbox answer. Mandatory: a "No" or blank blocks `#btnSubmitFinal` | None |
| 25 | `#regbothparents` | Radio Group (`true`/`false`) | Lives with both parents | None |
| 25a | `#regsibling` | Radio Group (`true`/`false`) | Has a sibling already registered at the club? Feeds sibling-discount fee category — counted in `#textProgress` (unlike `#regbothparents`/`#regplayertype`, which aren't) | None |
| 25b | `#regsiblingteam` | Dropdown | Sibling's team (`Teams` collection, by `T_teamName`) | Collapsed (expands if `#regsibling` = true) |
| 25c | `#b8` | Label (paired with `#regsiblingteam`) | Field label that expands/collapses alongside the sibling team dropdown | Collapsed |
| 26 | `#regplayertype` | Radio Group (`true`/`false`) | Playing vs Training-only | None |
| 27 | `#medicalyn` | Radio Group (`true`/`false`) | Has medical conditions? | None |
| 28 | `#regmedical` | Text Input/Rich Text | Medical details | Collapsed (shown if `#medicalyn` = true) |
| 29 | `#regadd2parents` | Radio Group (`Yes`/`No`) | Add a second parent/guardian? | None |
| 30 | `#regsecparentname` | Text Input | Secondary parent name | Collapsed |
| 31 | `#regsecparentmobile` | Text Input | Secondary parent phone | Collapsed |
| 32 | `#regsecparentemail` | Text Input | Secondary parent email | Collapsed |
| 33 | `#regsecparentrelation` | Dropdown | Secondary parent relationship (`ClubDictionary` category=`relationship`) | Collapsed |
| 33a | `#regsecparentdob` | Date Picker | Secondary parent DOB | Collapsed |
| 33b | `#regsecparentaddress` | Address Input | Secondary parent address, if different (blank = same) | Collapsed |
| 34 | `#b1`–`#b4` | Label (paired with elements 30–33) | Field labels that expand/collapse alongside the secondary parent inputs | Collapsed |
| 34a | `#b6`–`#b7` | Label (paired with `#regsecparentdob`/`#regsecparentaddress`) | Field labels that expand/collapse alongside the secondary parent DOB/address | Collapsed |
| 35 | `#b5` | Label (paired with `#regmedical`) | Field label that expands/collapses alongside the medical details input | Collapsed |
| 36 | `#regheadshot` | Upload Button | Player headshot — label flips to "Photo Saved ✓" once uploaded | None |
| 37 | `#regpaperid` | Upload Button | ID document — label flips to "ID Saved ✓" once uploaded | None |
| 38 | `#chkParentConduct` | Checkbox | Parent code of conduct agreed | None |
| 39 | `#chkPlayerConduct` | Checkbox | Player code of conduct agreed | None |
| 40 | `#textProgress` | Text | "Registration: X% Complete" — **lives in the Site Header** inside `#stickyProgressBar`, not on this page at all; set via `masterPage.js`/the bridge module, see "Sticky Progress Bar" below | None |
| 41 | `#chkConfirm` | Checkbox | "I confirm the above is correct" — only reachable at 100% complete | Collapsed |
| 42 | `#inputSignature` | Text Input | Typed signature (must be >2 chars) | Collapsed |
| 43 | `#btnSaveDraft` | Button | Saves progress without submitting — **lives in the Site Header** inside `#stickyProgressBar`, not on this page at all; click is wired in `masterPage.js`, actual save logic in `Parent Hub.js` via the bridge, see "Sticky Progress Bar" below | None |
| 44 | `#btnSubmitFinal` | Button | Final submit — **always visible now** (was gated to 100% complete; changed 2026-07-26 per parent feedback that they had no way to tell which fields were mandatory). A click while required fields are still empty highlights them red and shows `#txtValidationMsg` instead of submitting — see "Mandatory-field highlighting" below | None (was Collapsed) |
| 44a | `#txtValidationMsg` | Text | "Please complete the N highlighted field(s) above…" / confirm-checkbox / signature prompts, shown on an incomplete submit attempt | Collapsed |

### Sticky Progress Bar (mobile) — now lives in the Header, added/revised 2026-07-26

Feedback: the progress bar + Save Draft could be pinned in **desktop** view but not
**mobile**. First attempt moved them into a page-level container and tried to pin that
— didn't work, because **Classic Editor has no Fixed Position option for regular
elements in mobile view at all**, regardless of nesting (confirmed: still missing even
after moving out of the `stateRegistration` State Box). The only thing that reliably
sticks on mobile is a Header/Footer with a sticky scroll effect, which is a native,
first-party Wix feature rather than per-element pinning — so that's where these two
elements now live.

**Editor setup:**

1. **Delete** the existing `#textProgress` and `#btnSaveDraft` from `stateRegistration`
   first — an element ID must be unique across the page + header together, so the old
   ones have to go before the new ones (same IDs) can be added in the header.
2. In the **Site Header**, add a Container named `#stickyProgressBar` holding
   `#textProgress` (Text) and `#btnSaveDraft` (Button) — same element IDs, same purpose,
   just relocated from `stateRegistration`.
3. On the Header itself, set its Scroll Effect to **"Always fixed"** (or your theme's
   equivalent sticky option) — check this applies on **both** desktop and mobile; some
   themes have a separate mobile toggle for this.
4. Leave `#stickyProgressBar`'s Initial State as **Collapsed** — `masterPage.js` also
   collapses it defensively on load, and it only expands when Parent Hub.js says so.

**Why this needed a bridge, not just moving the elements:** header/footer elements can
only be `$w`-selected from `masterPage.js` — a page's own code (`Parent Hub.js`) can't
reach them, and can't import `masterPage.js` directly either (re-runs its `$w.onReady`).

**First version of this bridge was wrong** — it used an in-memory callback registry in
`public/parentHubProgressBar.js` (`registerHeaderHandlers`/`registerSaveDraftHandler`).
Deployed with no console errors, but silently did nothing: plain variables/functions in
a Velo `public/*.js` file are **not** actually shared between `masterPage.js` and page
code — each gets its own separate copy, so `masterPage.js`'s registered handlers were
never the same object `Parent Hub.js` was calling. Corrected version routes everything
through `wix-storage-frontend` session storage instead (Wix's own documented pattern for
masterPage↔page communication), which genuinely is shared. Storage has no same-tab
change event, so each side polls it every 400ms rather than getting a live push:

- `Parent Hub.js` calls `setProgressBarVisible(true/false)` right after entering/leaving
  `stateRegistration` (`#btnAction`'s click handler, `#btnBackToHubReg`, and the
  successful-submit branch of `#btnSubmitFinal`), and `setProgressBarText(...)` from
  inside `calculateProgress()` — both just write to session storage.
- `masterPage.js` polls `getProgressBarVisible()`/`getProgressBarText()` every 400ms and
  only touches `$w("#stickyProgressBar")`/`#textProgress` when a value actually changed
  since the last poll.
- `masterPage.js`'s `#btnSaveDraft` click calls `requestSaveDraft()` (writes a
  timestamp-based request ID to storage) and remembers it as `pendingSaveRequestId`.
  `Parent Hub.js` polls `getSaveDraftRequestId()` every 400ms; on a new ID it runs the
  actual save (needs `activePlayerContext`, which only this file knows) and writes the
  result back via `setSaveDraftResult(requestId, result)`. `masterPage.js`'s poll picks
  up the matching result and updates the button label ("Saved Successfully"/"Error
  Saving") — matched by request ID so a stale result can't be mistaken for the current
  click.
- `Parent Hub.js` seeds its "last handled" request ID from whatever's already in storage
  at load time, so a mid-session browser refresh doesn't replay an old, already-handled
  save request the instant the page reloads.
- No "which page is this" logic anywhere — the bar defaults to collapsed and only shows
  when Parent Hub.js's own code says so, so it's invisible on every other page.
- `mapUItoPlayer`'s `registrationProgress` field now reads a module-level
  `lastCalculatedPercentage` (set inside `calculateProgress`) instead of reading
  `#textProgress`'s on-page text back out, for the same reason — that element isn't on
  this page anymore.

### Mandatory-field highlighting, added 2026-07-26

Feedback: parents had no way to tell which fields were required until `#btnSubmitFinal`
either silently appeared (at 100%) or didn't. `#btnSubmitFinal` is now always visible;
clicking it while required fields are empty calls `validateRequiredFields()` (mirrors
the exact field list `calculateProgress()` counts, so "100%" and "nothing left to
highlight" can never disagree), sets a red border (`FIELD_BORDER_INVALID`) on every
empty one, shows `#txtValidationMsg` with a count, and scrolls to the first one. The
border resets to `FIELD_BORDER_DEFAULT` either on the next submit click or as soon as
that specific field is filled in (via `clearFieldHighlight`, hooked into the existing
shared `onChange` handlers). Not every element type supports `.style.borderColor` in
Velo (e.g. some Checkbox/UploadButton/RadioGroup controls) — for those, the field still
counts toward the "N highlighted fields" message even if no visible border appears; test
each one in the Editor and swap in `.style.backgroundColor` instead if a given control
doesn't visibly respond.

If `FIELD_BORDER_DEFAULT` (`#E0E0E0`) doesn't match your actual field styling, adjust
the constant in `Parent Hub.js` — Velo's Style API can set border color but can't read
back what the Editor originally set, so this is a hardcoded "reset" value rather than a
true restore of the original.

### Consent Lightbox

Lightbox page ID `ConsentRegistration` (`frontend/additional_pages/Consent
Registration.js`), opened from **both** `stateRegistration` (via `#txtConsent`, a
Button styled as a text link) and `stateProfile` (via `#btnReviewConsent`) —
`wixWindow.openLightbox("ConsentRegistration", {...})`. On both pages the 4 consent
radios (`#regconsent*` / `#radioPhotoConsent`+`#radioSocialMedia`+`#radioFAConsent`+
`#radioMedicalConsent`) are **permanently read-only mirrors**, only ever set from this
Lightbox's close data — never directly clickable, on either page, so a parent can't
flip a consent without re-reading the statement first. `#txtConsent`'s label flips to
"Already Confirmed ✓" once all 4 have been answered (`updateConsentButtonLabel`).

Values passed into/out of the Lightbox are tri-state (`true`/`false`/`null`), not a
forced boolean — `null` means "never answered", so an unopened Lightbox doesn't
default every radio to a misleading "No" (see `consentRadioValue`/
`radioValueToTriState`/`setConsentFieldIfAnswered` in `Parent Hub.js`, shared by both
pages). This also means a Save Draft/Save Changes before the parent has ever opened
the Lightbox leaves the consent fields untouched in the CMS rather than writing "No".

| Element ID | Type | Purpose | Initial State |
|---|---|---|---|
| `#radioConsentPhoto` | Radio (Yes/No) | Parent's actual input — website photo use | None |
| `#radioConsentSocial` | Radio (Yes/No) | Parent's actual input — social media photo use | None |
| `#radioConsentFA` | Radio (Yes/No) | Parent's actual input — FA/Whole Game System data-sharing | None |
| `#radioConsentMedical` | Radio (Yes/No) | Parent's actual input — emergency medical treatment | None |
| `#txtWarningFA` | Text | Consequence warning, shown only when `#radioConsentFA` = No | Hidden |
| `#btnConfirmConsent` | Button | Enabled once all 4 radios are answered; closes Lightbox and passes the 4 values back | Disabled |

No warning text on the medical consent (Rob's call — kept the UI simpler there; FA
keeps its warning since it's the training→playing transition case that needs
explaining).

Statement text (as agreed, final):

> **Photos, Social Media & Data Sharing**
>
> Signol Athletic J.F.C. regularly takes photographs at training and matches, both of
> the team as a group and of individual players. We'd like your permission to use
> these on our club website and social media pages. Please note our website can be
> viewed anywhere in the world, not only the UK, and we never publish a player's full
> name alongside their photograph.
>
> Separately, to register your child to play and to ensure they're covered by
> insurance, we are required to share the information on this registration form with
> the County FA, The FA and any applicable leagues via the Whole Game System. This
> isn't optional — a club cannot register or insure a player without it, so if this
> information isn't shared your child will not be able to play. This applies whether
> you're registering your child to play matches now, or just for training — the same
> information sharing will still be required if they move from training to playing
> later.
>
> Finally, we ask for your permission to allow club officials or first aiders to seek
> and arrange emergency medical treatment for your child if we're unable to contact
> you at the time. This is required for your child to take part in any club activity,
> including training.
>
> Completing this registration confirms you understand and accept the above. Full
> details of our policies are available on our website.

`#txtWarningFA` copy (shown only if `#radioConsentFA` = No):

> Without this, your child cannot be registered or insured to play matches for any
> team. This won't affect training-only sessions now, but if they move from training
> to playing later, you'll need to come back and change this answer before they can
> be registered.

## State: stateProfile

Read-only profile + limited self-service edits for a child who is past the
registration stage (Ready for FA, FA Complete, Active, etc). `#btnBackToHubProfile`
returns to `stateDashboard`. Edits via `#btnSaveProfileEdits` are locked out entirely
for a secondary parent (see Role-Based Access Control below).

| # | Element ID | Type | Purpose | Initial State |
|---|-----------|------|---------|----------------|
| 1 | `#btnBackToHubProfile` | Button | Back to Dashboard | None |
| 2 | `#profileManager` | Text | Team manager's name (async lookup) | None |
| 3 | `#txtProfTeam` | Text | Team name / "Squad Unassigned" | None |
| 4 | `#txtProfFullName` | Text | Player's full name | None |
| 5 | `#txtProfFan` | Text | Fan Number / "Pending FA Reg" | None |
| 6 | `#profileHeadshot` | Image | Player headshot | None |
| 7 | `#txtProfDOB` | Text | Date of birth (en-GB format) / "Not Provided" | None |
| 8 | `#grpPlay` | Container | Playing-squad shirt graphic (name + number) | None |
| 8a | `#txtProfLastName` | Text (in `#grpPlay`) | Last name, uppercase | None |
| 8b | `#txtProfNum` | Text (in `#grpPlay`) | Kit number / "0" | None |
| 9 | `#grpTrain` | Container | Training-only shirt graphic | Collapsed |
| 9a | `#trainLastname` | Text (in `#grpTrain`) | Last name, uppercase | None |
| 10 | `#txtShirtSize` | Text | Shirt size, translated via dictionary map | None |
| 11 | `#txtShortSize` | Text | Shorts size, translated via dictionary map | None |
| 12 | `#txtSockSize` | Text | Sock size, translated via dictionary map | None |
| 13 | `#txtHoodieSize` | Text | Hoodie size, translated via dictionary map | None |
| 14 | `#txtCoatSize` | Text | Coat size, translated via dictionary map | None |
| 15 | `#txtParentrelation` | Text | Primary parent relationship, translated via dictionary map | None |
| 15a | `#txtProfGender` | Text, read-only | Player gender, translated via dictionary map — not editable here, same reasoning as `#txtProfDOB` | None |
| 16 | `#txtLockedParentName` | Text | Primary parent name (display only) | None |
| 17 | `#txtLockedParentMobile` | Text Input | Primary parent phone (editable by primary parent only) | None |
| 18 | `#txtLockedParentEmail` | Text Input | Primary parent email (editable by primary parent only) | None |
| 18a | `#datePrimaryParentDob` | Date Picker | Primary parent DOB. **Shown/editable only when the viewer IS the primary parent — see RBAC note below** | None |
| 18b | `#inputParentAddress` | Address Input | Primary parent address, blank = same as player's. **Shown/editable only when the viewer IS the primary parent — see RBAC note below** | None |
| 18c | `#txtMembershipNo` | Text, read-only display | Club membership number | None |
| 19 | `#radioaddparent` | Radio Group (`Yes`/`No`) | Has a secondary parent? | None |
| 20 | `#secondparentbox` / `#secondparentmobbox` / `#secondparentEmbox` / `#secondparentrelbox` | Container | Outer containers for the 4 secondary-parent fields below | Collapsed |
| 20a | `#secondparentName` | Text Input | Secondary parent name | Collapsed |
| 20b | `#secondparentMobile` | Text Input | Secondary parent phone | Collapsed |
| 20c | `#secondparentEmail` | Text Input | Secondary parent email | Collapsed |
| 20d | `#secondparentRelation` | Dropdown | Secondary parent relationship (`ClubDictionary` category=`relationship`) | Collapsed |
| 20e | `#secondparentDob` | Date Picker | Secondary parent DOB — editable by primary parent only, same as the rest of the secondary-parent block | Collapsed |
| 20f | `#secondparentAddress` | Address Input | Secondary parent address, blank = same — editable by primary parent only | Collapsed |
| 21 | `#inputEmergName` | Text Input | Emergency contact name | None |
| 22 | `#inputEmergNumber` | Text Input | Emergency contact number | None |
| 23 | `#emergeRelation` | Dropdown | Emergency contact relationship (`ClubDictionary` category=`relationship`) | None |
| 24 | `#inputAddress` | Text Input | Home address | None |
| 25 | `#radioBothParents` | Radio Group (`true`/`false`) | Lives with both parents | None |
| 26 | `#btnReviewConsent` | Button | Opens the shared `ConsentRegistration` Lightbox to review/change any of the 4 consents | None |
| 26a | `#radioSocialMedia` | Radio Group (`true`/`false`), **read-only** | Social media consent — mirrors Lightbox answer | None |
| 26b | `#radioPhotoConsent` | Radio Group (`true`/`false`), **read-only** | Website photo consent — mirrors Lightbox answer | None |
| 26c | `#radioFAConsent` | Radio Group (`true`/`false`), **read-only** | FA/Whole Game System data-sharing consent — mirrors Lightbox answer | None |
| 26d | `#radioMedicalConsent` | Radio Group (`true`/`false`), **read-only** | Emergency medical treatment consent — mirrors Lightbox answer. Distinct from `#radioMedical` below (that one flags medical *conditions*, this one is the treatment *authorization*) | None |
| 27 | `#radioMedical` | Radio Group (`true`/`false`) | Has medical conditions? | None |
| 28 | `#box68` | Container | Wraps `#inputMedicalDetails` | Collapsed |
| 28a | `#inputMedicalDetails` | Text Input | Medical details | Collapsed |
| 29 | `#btnSaveProfileEdits` | Button | Saves the editable fields above | None |

### Stats Engine (shared `#season` dropdown, on `stateProfile`)

| # | Element ID | Type | Purpose | Initial State |
|---|-----------|------|---------|----------------|
| 1 | `#season` | Dropdown | Season filter (`ClubDictionary` category=`season`) — drives both player and team stats below | None |
| 2 | `#goals` | Text | Player's total goals for the selected season | None |
| 3 | `#assist` | Text | Player's total assists | None |
| 4 | `#tackle` | Text | Player's total tackles | None |
| 5 | `#save` | Text | Player's total saves | None |
| 6 | `#potm` | Text | Player's POTM award count | None |
| 7 | `#txtWins` | Text | Player's team wins for the selected season | None |
| 8 | `#txtLosses` | Text | Team losses | None |
| 9 | `#txtDraws` | Text | Team draws | None |
| 10 | `#txtGF` | Text | Team goals for | None |
| 11 | `#txtGA` | Text | Team goals against | None |
| 12 | `#txtGD` | Text | Team goal difference | None |
| 13 | `#formRepeater` | Repeater | Last 5 team results form guide | None |
| 13a | `#formCircle` | Shape (in repeater) | Color-coded W/L/D circle | None |
| 13b | `#txtFormLetter` | Text (in repeater) | "W"/"L"/"D" | None |

## State: statePayment (added 2026-07-28, backend switched to GoCardless 2026-07-30)

**NEW state.** Reached only via `#btnPayment` on a kid's dashboard card (Kids List,
above) — that button is itself hidden until a fee schedule's been saved+sent for that
child. Not reachable from `#btnAction`; paying fees is a separate concern from the
status-driven registration/profile routing. See "Payment tracking — GoCardless Direct
Debit" under Data Model Notes for the full mechanism (the older Wix Pricing
Plans/Stripe section further down is superseded but kept for history).

| # | Element ID | Type | Purpose | Initial State |
|---|-----------|------|---------|----------------|
| 1 | `#btnBackToHubPayment` | Button | Back to Dashboard (refreshes data first, same pattern as `#btnBackToHubProfile`) | None |
| 2 | `#textPaymentKidName` | Text | Which child this plan is for | None |
| 3 | `#textPaymentPlanLabel` | Text | Fee tier label (`FeeCategories.F_label`) - name only, not the amount | None |
| 3a | `#textPaymentSchedule` | Text, optional | **NEW 2026-08.** "N payment(s) of £X (total £Y) - first payment DD/MM/YYYY, then monthly." - the actual amount/frequency, which `#textPaymentPlanLabel` never showed. Reuses `getFeeSchedule()` from `backend/registration.jsw`, same numbers the secretary's PlayerRecord preview (`#prSchedulePreview`) shows, so they always match. Shows "No fee - this is a free membership." for a £0 tier. | None |
| 4 | `#btnSetupPayment` | Button | "Set up your payment plan" — calls `startGoCardlessSetup(playerId, feeCategoryId, returnUrl)` then redirects to the returned `authorisationUrl` (GoCardless's hosted mandate-setup flow). Only ever shown when there's genuinely nothing active (never started, or a previous plan ended/canceled) — see "Payment tracking — GoCardless Direct Debit" under Data Model Notes for why. | Collapsed (code reveals) |
| 5 | `#textPaymentStatus` | Text | Reports the real subscription status (paid this month / failed / canceled / ended / setup pending / mismatched-tier), or "No payment plan started yet." / "Checking payment status..." | None |
| 6 | `#btnCancelOldPlan` | Button | Only shown when there's an active subscription on a DIFFERENT fee tier than the one now assigned (secretary changed tier) — calls `cancelGoCardlessSubscription(recordId)`, then refreshes the state. `#btnSetupPayment` for the new plan only appears once this succeeds. | Collapsed (code reveals) |

## Status Pipeline (Parent-facing, `SP_status`)

`#repeaterKids`'s `#textStatus`/`#btnAction` map the same `SP_status` IDs documented
in `MANAGER_HUB_ELEMENTS.md`'s Onboarding Status Pipeline table, but with parent-facing
copy and color rather than the manager-facing one:

| Status | `#textStatus` text | Color | `#btnAction` label | Routes to |
|---|---|---|---|---|
| Invited | "Registration Required" | `#F59E0B` amber | "Register Now" | `stateRegistration` (status flipped to Draft on open) |
| Renewal | "Annual Renewal Required" | `#F59E0B` amber | "Update Forms" | `stateRegistration` (status flipped to Draft on open) |
| Draft | "Draft In Progress" | `#F59E0B` amber | "Resume Form" | `stateRegistration` |
| Action Required | "Action Required - Update Needed" | `#FF4D4D` red | "Fix & Resubmit" | `stateRegistration` (stays Action Required until resubmit → Ready for FA; shows `#boxReturnNote`) |
| Ready for FA | "Pending FA Registration" | `#3B82F6` blue | "View Profile" | `stateProfile` |
| FA Complete | "Pending Club Process" | `#8B5CF6` purple | "View Profile" | `stateProfile` |
| Active | "Active" | `#22C55E` green | "View Profile" | `stateProfile` |
| (any other) | "Processing" | `#9CA3AF` grey | "View Profile" | `stateProfile` |

Players with status Left are excluded entirely from `#repeaterKids` (filtered out in
`loadDashboard`).

## Data Model Notes

### Payment plan — GoCardless Direct Debit (backend replaced 2026-07-30)

`resolveFeeCategoryId(player)` in `Parent Hub.js` (renamed from `resolvePlanId`) returns
the kid's fee category id once `player.sp_paymentschedulesentdate` is set — unlike the
old Wix Pricing Plans version, GoCardless doesn't need a pre-existing "plan" object to
check for (the schedule is computed dynamically per player via `buildFeeSchedule()`), so
`FeeCategories.F_wixPlanId` is no longer required for `#btnPayment` to appear. That field
is left in the CMS, unused, rather than removed (see `database/CMS_SCHEMA.txt`).

`loadPaymentState(player)` still populates `statePayment`'s text fields the same way;
`#btnSetupPayment` now calls `startGoCardlessSetup` (see "Payment tracking — GoCardless
Direct Debit" below) instead of Wix's `customPurchaseFlow.navigateToCheckout`. Same
principle as before still holds: `statePayment` doesn't rebuild a payment/checkout page
itself — GoCardless's own hosted Billing Request Flow is the PCI-compliant collection
step, same reasoning that previously applied to Wix's built-in Checkout.

**Free (£0) fee categories skip GoCardless entirely (added 2026-08).** GoCardless
requires a minimum £1 transaction and never activates a £0 subscription — confirmed
live when a real test (a free tier for managers' own kids) got stuck PENDING forever.
`startGoCardlessSetup` now detects `annual <= 0` and, instead of creating a Billing
Request, inserts a `GoCardlessSubscriptions` row straight as `status: "ACTIVE"` /
`confirmed: true` with no real mandate involved, and returns `{ success: true, free:
true }`. The frontend's `#btnSetupPayment` click handler checks for `result.free` and
re-renders `statePayment` instead of redirecting to GoCardless's hosted flow — the
parent never sees a bank-details step for a free tier.

### Payment plan — OLDER Wix Pricing Plans/Stripe mechanism (superseded 2026-07-30)

**Superseded.** Code (`backend/events.js`, `markPendingPayment`/
`getChildSubscriptionStatus` in `registration.jsw`, the `wix-pricing-plans-frontend`
import) is left in place, dormant, until GoCardless has been live and collected at
least one real monthly cycle — see the GoCardless section above/below for what's
actually running now. Kept here for history:

Replaces the earlier email-notification idea (`ParentNotifications` + Wix Automation,
which required manual Automation setup and had no in-app fallback if the email never
sent) with a simple in-Hub flow instead — same trigger, no email dependency. First cut
was an inline banner on the registration/profile screens; moved to a dedicated
`statePayment` (see above) reached via its own `#btnPayment` per kid, since paying
fees is a distinct action from viewing/editing a registration, not a footnote on it.

- **`resolvePlanId(player)`** in `Parent Hub.js` — returns the kid's Wix Pricing Plan
  id only when `player.sp_paymentschedulesentdate` is set AND the linked fee tier has
  a `F_wixPlanId`; else `null`. Drives both `#btnPayment`'s visibility on the
  dashboard card (`#repeaterKids.onItemReady`) and the actual checkout call.
- **`loadPaymentState(player)`** populates `statePayment`'s 2 text fields and wires
  `#btnSetupPayment`. All guarded on `.id`.
- **`#btnSetupPayment`** calls `customPurchaseFlow.navigateToCheckout({ planId })`
  from `wix-pricing-plans-frontend` (Wix's real Pricing Plans checkout API) — hands
  off to Wix's own hosted checkout for that exact plan. `statePayment` deliberately
  does NOT rebuild a payment/checkout page itself or re-show the schedule breakdown —
  Wix's checkout page displays the real price/interval once the parent lands there,
  so the numbers aren't computed a third time (already duplicated once between
  `registration.jsw` and `Player Record.js` for the secretary's preview). The **Plans
  & Pricing listing page CAN be fully custom** (that's what this state is), but the
  actual checkout/payment-collection step should stay on Wix's built-in Checkout —
  it's the PCI-compliant hosted flow; there's no reason to rebuild it.
- **⚠️ CMS SETUP needed:** new field `FeeCategories.F_wixPlanId` (Text) — for each fee
  tier, paste in the matching Wix Pricing Plan's ID (Wix Dashboard → Pricing Plans →
  that plan's settings). Without this, `#btnPayment` never appears even if a schedule
  was sent, since there'd be nothing to check out to.
- **Backend:** `getKidsForParent` now `.include("sp_fee_category")` so the linked
  `FeeCategories` row (label + `F_wixPlanId`) travels with each kid's record.

### Payment tracking — per-child subscription status, OLDER mechanism (superseded 2026-07-30)

**The core problem:** a Wix Pricing Plans order only ever records *which member*
bought *which plan* — never which of their children it was for. Two kids on the
same fee tier, bought back-to-back, look identical from Wix's side. Solved with a
"mark before checkout, confirm after" pattern (same shape Wix's own build assistant
suggested when Rob asked it independently):

1. **`markPendingPayment(playerId, planId)`** (`registration.jsw`) — called the
   instant the parent taps `#btnSetupPayment`, *before* `navigateToCheckout()`.
   Writes an unconfirmed row to a new **`ChildSubscriptions`** CMS collection:
   `player` (ref), `memberId`, `wixPlanId`, `status: "pending"`, `confirmed: false`.
2. **`wixPricingPlans_onOrderPurchased`** (`backend/events.js` — new file, new kind
   of backend file for this project) fires when Wix confirms the real order/first
   payment. Matches it to the **oldest unconfirmed** `ChildSubscriptions` row for
   the same `memberId` + `planId` (FIFO — correct even if a parent buys two kids on
   the same tier within seconds of each other), then fills in `subscriptionId`,
   `orderId`, `status`, `lastPaymentStatus`, `currentCycleIndex/Start/End`, and sets
   `confirmed: true`.
3. **`wixPricingPlans_onOrderCycleStarted`**, **`wixPricingPlans_onOrderCanceled`**,
   **`wixPricingPlans_onOrderEnded`** (same file, all sharing one
   `syncSubscriptionFromOrder(order)` helper) fire at the start of every payment
   cycle, on cancellation, and on natural expiry respectively — each writes the
   order's current `status`/`lastPaymentStatus`/`currentCycle...` onto the matching
   `ChildSubscriptions` row by `subscriptionId`. Critically, **this is keyed on the
   event, not on which page triggered it** — `onOrderCanceled` fires the same way
   whether the parent cancelled via our own `#btnCancelOldPlan` or via Wix's own
   built-in Subscriptions/My Account page, so `ChildSubscriptions` never drifts out
   of sync just because a cancellation happened somewhere outside our custom flow.
   (Bug caught 2026-07-28: the first version of `events.js` only had
   `onOrderPurchased`/`onOrderCycleStarted` — no cancellation handler at all, so
   *any* cancellation, ours or Wix's own page, silently never updated the CMS.)
4. **`getChildSubscriptionStatus(playerId)`** reads the latest confirmed record back
   for display — used by `statePayment`'s `#textPaymentStatus` and the dashboard
   card's `#btnPayment` label (see below).

**CONFIRMED WORKING END-TO-END (2026-07-28)** — `ChildSubscriptions` collection
built, `events.js` created as a real `.js` file (not `.jsw` — see the gotcha note
below), published, and tested live by Rob.

**⚠️ `.js` vs `.jsw` gotcha:** `events.js` must be an actual `.js` file, NOT a `.jsw`
Web Module — Wix only wires up backend event handlers (`wixPricingPlans_onOrder...`)
from a plain `.js` file with that exact name. Saved as `.jsw`, the functions just sit
there unused and nothing ever fires. Caught and fixed during testing.

**Once paid, `#btnPayment` relabels rather than disappearing** (`describePaymentButtonLabel`
in `Parent Hub.js`, mirrored by `describeSubscriptionStatus` for the fuller text on
`statePayment`) — so it's always there to reopen, never a dead end:
- No subscription yet → **"Set Up Payment"**
- Confirmed + active, payment going through → **"Payment ✓ (Manage)"**
- `lastPaymentStatus: FAILED` → **"⚠️ Payment Failed - Fix"**
- Subscription `CANCELED`/`ENDED` → back to **"Set Up Payment"**

**Switching fee tiers — a real Wix limitation, worked around with a real fix (2026-07-28):**
Wix's Pricing Plans app has no "replace my plan" for site members — buying a new
plan does NOT cancel an old one, so a parent could end up on two concurrent
subscriptions, billed for both, if the secretary changes their tier while they're
already on an active one. `getChildSubscriptionStatus` returns `wixPlanId` +
`orderId`; `renderPaymentAction` in `Parent Hub.js` compares the confirmed
subscription's plan against whatever tier is currently assigned:
- Match, payment fine → no button, just status text (nothing to click, can't
  accidentally duplicate).
- Mismatch → **`#btnSetupPayment` is hidden entirely**, only `#btnCancelOldPlan`
  shows, calling `orders.requestCurrentMemberOrderCancellation(orderId,
  "IMMEDIATELY")` (from `wix-pricing-plans-frontend`'s Orders API — cancels that
  ONE specific order, confirmed via Wix docs it doesn't touch any other
  subscriptions the member holds). Once that succeeds, the state refreshes and
  `#btnSetupPayment` for the new plan appears.
- `lastPaymentStatus: FAILED` on an otherwise-matching plan → status text only,
  pointing them to fix their payment method via their own Wix account -
  deliberately NOT a checkout button, since retrying checkout would create a
  second subscription rather than fixing the existing one's payment method.

So: **`#btnSetupPayment` and `#btnCancelOldPlan` are never both visible, and
checkout is never offered while any subscription is still active** — the only way
back to "Set up your payment plan" is via a genuinely absent/canceled/ended
subscription.

**⚠️ CMS reference:** `ChildSubscriptions` fields: `player` (Reference →
SignolPlayers), `memberId` (Text), `wixPlanId` (Text), `subscriptionId` (Text),
`orderId` (Text), `status` (Text), `lastPaymentStatus` (Text), `currentCycleIndex`
(Number), `currentCycleStart` (Date), `currentCycleEnd` (Date), `confirmed`
(Boolean).

**Not yet built:** any secretary-facing view of `ChildSubscriptions` (e.g. on Player
Record, so she can see who's behind without checking Wix's own Pricing Plans
dashboard). Superseded by the GoCardless mechanism below — not worth building further
for the old path.

### Payment tracking — GoCardless Direct Debit (added 2026-07-30)

Replaces the mechanism above. Rob found GoCardless meaningfully cheaper than Wix/Stripe
for this use case (1% + 20p vs 1.5% + 20p, plus a discount GoCardless offers football
clubs) and wanted a full replacement, not a parallel option. GoCardless's API is more
cooperative than Wix's here — it supports custom `metadata` on the resources we create —
so this avoids the FIFO-matching hack the old mechanism needed entirely.

1. **`startGoCardlessSetup(playerId, feeCategoryId, returnUrl)`** (`registration.jsw`) —
   called the instant the parent taps `#btnSetupPayment`. Computes the fee schedule
   (same `buildFeeSchedule()` the secretary's preview uses), inserts a new
   **`GoCardlessSubscriptions`** row snapshotting it (`perPayment`, `scheduleCount`,
   `firstDate`, `status: "PENDING"`), then calls `backend/gocardless.jsw`'s
   `createBillingRequestFlow(recordId, returnUrl)` — creates a GoCardless Billing
   Request tagged with `metadata.internalRef = recordId`, wraps it in a Billing Request
   Flow, and returns the hosted `authorisationUrl`. The frontend redirects the parent
   there via `wixLocationFrontend.to(...)`.
2. **`post_gocardlessWebhook`** (`backend/http-functions.js` — first file of this kind
   in the codebase; Wix's reserved `http-functions.js` filename for exposing an inbound
   endpoint) verifies the `Webhook-Signature` header (HMAC-SHA256 over the raw body),
   checks/logs each event's id into **`GoCardlessWebhookEvents`** first (GoCardless
   webhooks retry/duplicate), then dispatches by `resource_type`/`action`:
   - `billing_requests: fulfilled` — matches the `GoCardlessSubscriptions` row by
     `gcBillingRequestId`, reads back the newly-created mandate's id, and (via
     `ensureSubscriptionCreated`) immediately calls `backend/gocardless.jsw`'s
     `createSubscription(mandateId, schedule, recordId)` — the parent doesn't take a
     second action for this step.
   - `mandates: active/cancelled/failed/expired` — kept as a backup path to the same
     `ensureSubscriptionCreated` trigger, and to sync `status` if a mandate is
     cancelled/expires outside the `billing_requests` event.
   - `subscriptions: created/cancelled/finished` — syncs `subscriptionStatus`/`status`.
   - `payments: confirmed/paid_out/failed/charged_back/...` — inserts a new row into
     **`GoCardlessPayments`** (the per-payment ledger — foundation for a possible future
     per-player/per-month "paid" tick-box view, itself not yet built) AND updates the
     matching `GoCardlessSubscriptions` row's `lastPaymentStatus`/`lastPaymentId`/
     `paymentsCollectedCount`.
3. **`getGoCardlessStatus(playerId)`** (`registration.jsw`) reads the latest
   `GoCardlessSubscriptions` row back for display — used by `statePayment`'s
   `#textPaymentStatus` and the dashboard card's `#btnPayment` label. Field names
   deliberately mirror the old `getChildSubscriptionStatus`'s shape (`status`,
   `lastPaymentStatus`, plus `feeCategoryId` in place of `wixPlanId`), so
   `describePaymentButtonLabel`/`describeSubscriptionStatus`/`renderPaymentAction` in
   `Parent Hub.js` needed only field-name edits, not new logic — including a new
   `"PENDING"` status case (mandate/billing request in flight, not yet active) that the
   old Wix/Stripe flow never really needed, since GoCardless's hosted-flow round trip
   via webhook isn't as instant as Wix's checkout confirmation.
4. **`cancelGoCardlessSubscription(recordId)`** (`registration.jsw`) — same
   tier-mismatch guard as before (`renderPaymentAction` compares the confirmed
   subscription's fee category against whatever's currently assigned; `#btnSetupPayment`
   and `#btnCancelOldPlan` are never both visible), but now a real backend call rather
   than a direct frontend Wix API call — GoCardless's secret API key can't be used from
   the frontend the way Wix's member-authenticated order-cancellation API could.
   Verifies the caller's `memberId` owns the record before cancelling.

**⚠️ GoCardless API details flagged as unverified until Rob has sandbox access to test
against real payloads** (see the implementation plan for the full list): the exact
advance-notice floor for a Bacs subscription's `start_date`, the exact link key GoCardless
uses for a fulfilled billing request's new mandate id (code tries
`mandate_request_mandate` then falls back to `mandate`, then falls back to re-fetching
the billing request directly), and whether webhook payloads carry `metadata` inline.

**⚠️ CMS SETUP needed:** three new collections — `GoCardlessSubscriptions`,
`GoCardlessPayments`, `GoCardlessWebhookEvents` — plus two new Wix secrets
(`_GOCARDLESS_ACCESS_TOKEN`, `_GOCARDLESS_WEBHOOK_SECRET`) and the `gocardless-nodejs`
npm package installed via Velo's package manager. Full field lists in
`database/CMS_SCHEMA.txt`.

**Not yet built:** the per-player/per-month "paid" tick-box view (secretary/manager/
parent-visible) and a secretary-facing dashboard count of successful/failed/missing
payments — deliberately deferred until the core payment swap is confirmed working;
the `GoCardlessPayments` ledger above is the foundation for it whenever that's picked
back up.

### Role-based access (primary vs secondary parent)

`loadProfileForm` compares `player.primaryParentId` against the logged-in parent's
`currentParentProfileId`. If they match, all editable fields on `stateProfile` are
enabled and `#btnSaveProfileEdits` is active; otherwise every editable field is
disabled and the button is relabeled "Secondary Parent - Read Only". This is a
UI-only lock — `secureUpdatePlayerRegistration` (`backend/registration.jsw`) is the
actual security boundary.

**Exception — `#datePrimaryParentDob` / `#inputParentAddress` (primary parent's own
DOB/address):** these are hidden from a secondary-parent viewer entirely, not just
disabled, since the primary parent's personal details shouldn't be visible to the
other guardian. This is a real privacy boundary, not just a UI nicety, so it can't be
a client-side hide alone — the backend function that loads the profile data must omit
`sp_parent_dob` and `sp_parent_address` from the payload when the caller isn't the
primary parent, otherwise a secondary parent could still read the values out of the
network response via dev tools even with the fields unbound in the UI. One-directional
only: the secondary parent's own DOB/address (`#secondparentDob`/`#secondparentAddress`)
stays visible to the primary parent, same as the rest of the secondary-parent block —
the primary parent enters and owns that data as part of managing the registration, so
there's nothing to protect there.

### Emergency contact source, added 2026-07-26

New `SignolPlayers` field: **`sp_emerg_source`** (TEXT) — stores `"parent1"`,
`"parent2"`, or `"new"`, whichever `#regemergencysource` was set to at last save.
Doesn't exist in the CMS yet; add it manually (or let the first `secureUpdatePlayerRegistration`
write auto-create it — Wix Data silently adds a column for any new key in an
update payload, so either works, but adding it explicitly up front avoids it looking
like an accidental stray column later).

Selecting Parent 1/2 re-derives `SP_emergContactName`/`SP_emergContactNumber`/
`SP_emergContactRelationship` from that parent's CURRENT on-form values every time
`loadRegistrationForm` runs or the dropdown changes — it's a live mirror, not a
one-time copy, so editing Parent 2's phone number elsewhere on the same form updates
the emergency contact too. `sp_emerg_source` defaults to `"new"` for any player record
saved before this feature existed, so an already-typed independent emergency contact on
an old draft is never silently overwritten by this change.

### `TeamStats` collection

Used by `loadTeamStats()` for the team stats panel — not the same collection as
`PlayerStats`/`Playerofthematch`. Fields used: `TS_teamName` (REFERENCE → `Teams`),
`TS_goalsFor`, `TS_goalsAgainst`, `result` (`"Win"`/`"Lose"`/`"Draw"`), `seasonLabel`
(TEXT — a season's display label, not a `ClubDictionary` reference ID, hence
`loadTeamStats` resolves `seasonId` to a label via `clubDictionaryMap` before
querying).

### Fan Number / DOB linking security

`findPlayerByFanNumberAndDob` is read-only and only returns a name/Fan Number
preview — it never links anything. `confirmPlayerLink` independently re-verifies
the Fan Number + DOB match server-side rather than trusting the `playerId` returned
by the preview step, so a caller can't bypass verification by calling it directly
with an arbitrary player ID. A player that already has a primary parent linked
cannot be self-service linked as a secondary parent via this flow — see
`PRIMARY_ALREADY_LINKED_ERROR` in `registration.jsw`. See `docs/fixtures.md` for
the parked plan that will add an upcoming-fixtures/RSVP section to this page.

## Official-form gap closure — implemented 2026-07-22

The parent DOB, parent address, membership number, and granular-consent additions
(originally scoped as a "Planned Additions" gap audit against the club's paper forms)
are now folded directly into the `stateRegistration`, Consent Lightbox, and
`stateProfile` sections above — this is no longer a TODO. Final design differs from
the original scoping in two ways worth knowing if you're comparing against old notes:
consent ended up as **one combined Lightbox** with 4 Yes/No radios (not three separate
per-item policy Lightboxes), and the medical consent has no consequence warning text
(FA does; medical was a deliberate simplification, Rob's call).

Resolved without action: proof-of-ID already covered by `#regheadshot` + `#regpaperid`;
single guardian signature (`#inputSignature`) is correct for an under-18 form; the
Covid-19 protocol question was dropped as obsolete.
