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
| 2 | `#stateboxHub` | State Box | Main container — holds 3 states (`stateDashboard`, `stateRegistration`, `stateProfile`) | Default state = `stateDashboard` |

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
| 15 | `#regemergencycontact` | Text Input | Emergency contact name | None |
| 16 | `#regemergencycontactmobile` | Text Input | Emergency contact number | None |
| 17 | `#regemergencycontactrelatoin` | Dropdown | Emergency contact relationship (`ClubDictionary` category=`relationship`) | None |
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
| 40 | `#textProgress` | Text | "Registration: X% Complete" | None |
| 41 | `#chkConfirm` | Checkbox | "I confirm the above is correct" — only reachable at 100% complete | Collapsed |
| 42 | `#inputSignature` | Text Input | Typed signature (must be >2 chars) | Collapsed |
| 43 | `#btnSaveDraft` | Button | Saves progress without submitting | None |
| 44 | `#btnSubmitFinal` | Button | Final submit — sets status to Ready for FA | Collapsed |

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
