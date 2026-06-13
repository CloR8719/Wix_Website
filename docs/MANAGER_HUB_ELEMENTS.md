# Manager Hub — Page Element Reference

Element IDs required in the Wix Editor for `frontend/dashboard_pages/Manager Hub.js`,
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
| 1 | `#textWelcome` | Text | "Welcome back, [Name]" greeting | None |
| 2 | `#stateboxHub` | State Box | Main container — holds all 7 states | Default state = `stateDashboard` |
| 3 | `#shareModal` | Container/Lightbox | Recruitment link share popup | Collapsed + Hidden |
| 4 | `#qrCodeImage` | Image | QR code for join link | None |
| 5 | `#btnOpenShare` | Button | Opens share modal | None |
| 6 | `#btnCopyLink` | Button | Copies join link to clipboard | None |
| 7 | `#btnCloseShare` | Button | Closes share modal | None |

## State: stateDashboard

| # | Element ID | Type | Purpose | Initial State |
|---|-----------|------|---------|----------------|
| 1 | `#textNoTeam` | Text | Shown if manager has no assigned team | Collapsed |
| 2 | `#repeaterMyTeams` | Repeater | One card per managed team | Visible |
| 2a | `#txtTeamName` | Text (in repeater) | Team name | None |
| 2b | `#txtSquadCount` | Text (in repeater) | "Squad: X" | None |
| 2c | `#txtPipelineCount` | Text (in repeater) | "Enquiries: X \| Trials: X" | None |
| 2d | `#txtActionAlert` | Text (in repeater) | "⚠️ X player(s) need action - tap to review onboarding" — clickable, opens `stateSquad` for that team | Collapsed |
| 2e | `#btnManageSquad` | Button (in repeater) | Opens Squad state for that team | None |
| 3 | `#btnNavSquad` | Button | Nav → Squad state | None |
| 4 | `#btnNavTeamProfile` | Button | Nav → Team Profile state | None |
| 5 | `#btnNavStats` | Button | Nav → Stats state | None |
| 6 | `#btnNavStaff` | Button | Nav → Staff Profile state | None |
| 7 | `#btnNavSponsors` | Button | Nav → Sponsors state | None |
| 8 | `#btnNavNews` | Button | Nav → News state | None |

## State: stateSquad

| # | Element ID | Type | Purpose | Initial State |
|---|-----------|------|---------|----------------|
| 1 | `#btnBackToHubSquad` | Button | Back to Dashboard | None |
| 2 | `#txtSquadTeamName` | Text | Active team name | None |
| 3 | `#squadTeamSwitcher` | Dropdown | Switch team (multi-team managers) | Collapsed |
| 4 | `#squadPipelineTabs` | Tabs | `enquiries` / `trials` / `squad` | Default value = `enquiries` |
| 5 | `#tabEnquiriesCount` | Text | Badge count on Enquiries tab | None |
| 6 | `#tabTrialsCount` | Text | Badge count on Trials tab | None |
| 7 | `#tabSquadCount` | Text | Badge count on Squad tab | None |
| 8 | `#tabTrialsHighlight` | Text | Flash message on Trials tab | Hidden |
| 9 | `#tabSquadHighlight` | Text | Flash message on Squad tab | Hidden |
| 10 | `#boxEnquiries` | Container | Enquiries pipeline view | Visible |
| 11 | `#boxTrials` | Container | Trials pipeline view | Collapsed |
| 12 | `#boxSquadList` | Container | Active squad view | Collapsed |

### Enquiries (`#boxEnquiries` → `#repeaterEnquiries`)

| # | Element ID | Type | Purpose | Initial State |
|---|-----------|------|---------|----------------|
| 1 | `#firstname` | Text | Player first name | None |
| 2 | `#lastname` | Text | Player last name | None |
| 3 | `#dob` | Text | Date of birth | None |
| 4 | `#agegroup` | Text | Age group | None |
| 5 | `#experience` | Text | Football experience | None |
| 6 | `#position` | Text | Preferred position | None |
| 7 | `#parentname` | Text | Parent name | None |
| 8 | `#parentemail` | Text | Parent email | None |
| 9 | `#parentmobile` | Text | Parent mobile | None |
| 10 | `#relation` | Text | Parent relationship | None |
| 11 | `#accept` | Button | Accept → moves to Trials | None |

### Trials (`#boxTrials` → `#repeaterTrials`)

| # | Element ID | Type | Purpose | Initial State |
|---|-----------|------|---------|----------------|
| 1 | `#tfirstname` | Text | Player first name | None |
| 2 | `#tlastname` | Text | Player last name | None |
| 3 | `#tparentname` | Text | Parent name | None |
| 4 | `#tparentemail` | Text | Parent email | None |
| 5 | `#tparentmobile` | Text | Parent mobile | None |
| 6 | `#leaveReasonDropdown` | Dropdown | Reason (shown on Archive confirm) | Collapsed + Hidden |
| 7 | `#invite` | Button | Opens Invite modal | None |
| 8 | `#return` | Button | Return to enquiry pool | None |
| 9 | `#left` | Button | Archive (2-step confirm) | None |

### Invite Modal (`#inviteModal`)

| # | Element ID | Type | Purpose | Initial State |
|---|-----------|------|---------|----------------|
| 1 | `#reviewPlayerName` | Text | Player name being invited | None |
| 2 | `#reviewParentName` | Text | Parent name | None |
| 3 | `#reviewParentEmail` | Text | Parent email | None |
| 4 | `#tasterDate` | Date Picker | First taster session date | None |
| 5 | `#regDate` | Date Picker | Registration date | None |
| 6 | `#regPlayertype` | Dropdown | Playing vs Training-only | None |
| 7 | `#btnCancelInvite` | Button | Cancel/close modal | None |
| 8 | `#btnSendInvite` | Button | Save + send registration link | None |

### Active Squad (`#boxSquadList`)

| # | Element ID | Type | Purpose | Initial State |
|---|-----------|------|---------|----------------|
| 1 | `#filterAssigned` | Text | "Assigned: X" count | None |
| 2 | `#filterPlaying` | Text | "Playing: X" count | None |
| 3 | `#filterTraining` | Text | "Training Only: X" count | None |
| 4 | `#filterOnboarding` | Text | "Onboarding: X" count | None |
| 5 | `#repeaterSquad` | Repeater | One row per squad player | Visible |
| 5a | `#rowFirstName` | Text (in repeater) | Player first name | None |
| 5b | `#rowParentName` | Text (in repeater) | Parent name | None |
| 5c | `#rowParentMobile` | Text (in repeater) | Parent mobile | None |
| 5c-1 | `#kitnumDisplay` | Text (in repeater) | Kit number, "#X" or "-" if unset | None |
| 5d | `#rowMedicalBadge` | Text/Badge | "Clear" / "ALERT" | None |
| 5e | `#rowTrainingBadge` | Text/Badge | "Playing" / "Training Only" | None |
| 5f | `#rowStatusBadge` | Text/Badge | Onboarding/Active status | None |
| 5f-1 | `#rowNextStep` | Text (in repeater) | Onboarding "Action: ..." guidance for this player | Collapsed |
| 5g | `#btnOpenProfile` | Button (in repeater) | Opens player profile modal | None |

### Player Profile Modal (`#playerProfileModal`)

| # | Element ID | Type | Purpose | Initial State |
|---|-----------|------|---------|----------------|
| 0 | `#playerProfileModal` | Container/Lightbox | The modal itself | Collapsed |
| 1 | `#detailFirstName` | Text | First name | None |
| 2 | `#detailLastName` | Text | Last name | None |
| 3 | `#detailFAN` | Text | FA number / "Pending" | None |
| 4 | `#detailDOB` | Text | Date of birth | None |
| 5 | `#detailParentName` | Text | Parent name | None |
| 6 | `#detailParentMobile` | Text | Parent mobile | None |
| 7 | `#detailParentEmail` | Text | Parent email | None |
| 8 | `#detailParentRelation` | Text | Relationship to player | None |
| 9 | `#detailEmergencyName` | Text | Emergency contact name | None |
| 10 | `#detailEmergencyMobile` | Text | Emergency contact mobile | None |
| 11 | `#detailEmergencyRelation` | Text | Emergency contact relation | None |
| 12 | `#detailMedicalBox` | Text | Medical info (HTML stripped) | None |
| 13 | `#detailSocialMedia` | Text | Consent given/declined | None |
| 14 | `#detailPlayertype` | Text | Playing / Training Only | None |
| 15 | `#detailStatusDisplay` | Text | Current status label | None |
| 15a | `#detailRegProgress` | Text | "Registration: X% complete" — hidden once player is Active | Collapsed |
| 15b | `#inputKitNumber` | Number Input | Squad kit number (`kitNumber` field) | None |
| 15c | `#btnSaveKit` | Button | Save kit number | None |
| 16 | `#dropdownLeaveReason` | Dropdown | Leave reason (on archive) | Collapsed |
| 17 | `#datePickerLeave` | Date Picker | Leaving date (on archive) | Collapsed |
| 18 | `#btnMakeLeaver` | Button | 2-step archive confirm | None |
| 19 | `#btnCloseProfile` | Button | Close modal | None |

## State: stateTeamProfile

| # | Element ID | Type | Purpose | Initial State |
|---|-----------|------|---------|----------------|
| 1 | `#btnBackToHubTeamProfile` | Button | Back to Dashboard | None |
| 2 | `#teamProfileDataset` | Dataset | Filtered to manager's teams | None |
| 3 | `#teamProfileRepeater` | Repeater | List of teams | None |
| 3a | `#btnEditTeam` | Button (in repeater) | Opens editor for that team | None |
| 4 | `#teamEditorSection` | Container | Edit form | Collapsed |
| 4a | `#txtTeamTitle` | Text | Team name being edited | None |
| 4b | `#richTeamIntro` | Rich Text Editor | Team intro/description | None |
| 4c | `#inputLeague` | Text Input | League/division | None |
| 4d | `#imgTeamPreview` | Image | Team photo preview | None |
| 4e | `#uploadTeamPhoto` | Upload Button | New team photo | None |
| 4f | `#inputTrainingTime` | Time Input | Training start time | None |
| 4g | `#inputPitch` | Text Input | Training pitch name | None |
| 4h | `#addressLocation` | Address Input | Training location | None |
| 4i | `#richAchievements` | Rich Text Editor | Achievements | None |
| 4j | `#tagsSponsors` | Tags Input | Linked sponsors | None |
| 4k | `#btnSaveTeam` | Button | Save changes | None |

## State: stateStaffProfile

| # | Element ID | Type | Purpose | Initial State |
|---|-----------|------|---------|----------------|
| 1 | `#btnBackToHubStaff` | Button | Back to Dashboard | None |
| 2 | `#staffProfileDataset` | Dataset | Filtered by access level | None |
| 3 | `#staffProfileRepeater` | Repeater | List of staff | None |
| 3a | `#btnEdit` | Button (in repeater) | Opens editor for that staff member | None |
| 4 | `#staffEditorSection` | Container | Edit form | Collapsed |
| 4a | `#txtName` | Text | Staff member's name | None |
| 4b | `#imgPreview` | Image | Headshot preview | None |
| 4c | `#uploadPhoto` | Upload Button | New headshot | None |
| 4d | `#inputBio` | Text Input | Bio | None |
| 4e | `#tagsQuals` | Tags Input | Qualifications | None |
| 4f | `#btnSaveStaff` | Button | Save changes | None |

## State: stateSponsors

| # | Element ID | Type | Purpose | Initial State |
|---|-----------|------|---------|----------------|
| 1 | `#btnBackToHubSponsors` | Button | Back to Dashboard | None |
| 2 | `#sponsorDataset` | Dataset | Filtered to teams' sponsors | None |
| 3 | `#inputSponsorName` | Text Input | New sponsor name | None |
| 4 | `#inputSponsorUrl` | Text Input | New sponsor URL | None |
| 5 | `#richSponsorBlurb` | Rich Text Editor | New sponsor blurb | None |
| 6 | `#uploadSponsorLogo` | Upload Button | New sponsor logo | None |
| 7 | `#btnAddSponsor` | Button | Add sponsor | None |
| 8 | `#sponsorRepeater` | Repeater | Existing sponsors | None |
| 8a | `#imgSponsor` | Image (in repeater) | Sponsor logo | None |
| 8b | `#btnDeleteSponsor` | Button (in repeater) | Remove sponsor | None |

## State: stateNews

| # | Element ID | Type | Purpose | Initial State |
|---|-----------|------|---------|----------------|
| 1 | `#btnBackToHubNews` | Button | Back to Dashboard | None |
| 2 | `#typeDropdown` | Dropdown | News type | None |
| 3 | `#teamDropdown` | Dropdown | Related team | None |
| 4 | `#headlineInput` | Text Input | Headline | None |
| 5 | `#articleBodyInput` | Text Input/Rich Text | Article body | None |
| 6 | `#btnAddNews` | Button | Submit news item | None |

## State: stateStats

Overview only — Add Results and Edit Records have moved to their own states
(`stateStatsAdd` and `stateStatEdit`), reached via buttons on this state.

| # | Element ID | Type | Purpose | Initial State |
|---|-----------|------|---------|----------------|
| 1 | `#btnBackToHubStats` | Button | Back to Dashboard | None |
| 2 | `#statsTeamDropdown` | Dropdown | Select team | None |
| 3 | `#statsSeasonDropdown` | Dropdown | Select season | None |
| 4 | `#btnNavStatsAdd` | Button | Go to Add Stats state (`stateStatsAdd`) | None |
| 5 | `#btnNavStatsEdit` | Button | Go to Edit Stats state (`stateStatEdit`) | None |

### Stats Overview (`#boxStatsOverview`)

| # | Element ID | Type | Purpose | Initial State |
|---|-----------|------|---------|----------------|
| 1 | `#txtWins` | Text | Wins count | None |
| 2 | `#txtLosses` | Text | Losses count | None |
| 3 | `#txtDraws` | Text | Draws count | None |
| 4 | `#txtGF` | Text | Goals for | None |
| 5 | `#txtGA` | Text | Goals against | None |
| 6 | `#txtGD` | Text | Goal difference | None |
| 7 | `#formRepeater` | Repeater | Last 5 results form guide | None |
| 7a | `#formCircle` | Shape (in repeater) | Color-coded W/L/D circle | None |
| 7b | `#txtFormLetter` | Text (in repeater) | "W"/"L"/"D" | None |
| 8 | `#goalsRepeater` | Repeater | Top scorers/assists leaderboard | None |
| 8a | `#gName` | Text (in repeater) | Player name | None |
| 8b | `#goals` | Text (in repeater) | Goals | None |
| 8c | `#assist` | Text (in repeater) | Assists | None |
| 9 | `#defensiveRepeater` | Repeater | Defensive leaderboard | None |
| 9a | `#dName` | Text (in repeater) | Player name | None |
| 9b | `#tackle` | Text (in repeater) | Tackles | None |
| 9c | `#save` | Text (in repeater) | Saves | None |
| 10 | `#potmRepeater` | Repeater | Player of the Match tally | None |
| 10a | `#potmName` | Text (in repeater) | Player name | None |
| 10b | `#potmCount` | Text (in repeater) | POTM count | None |

## State: stateStatsAdd (8th state)

Formerly the "Add Results" sub-tab. Reached via `#btnNavStatsAdd` on `stateStats`.

| # | Element ID | Type | Purpose | Initial State |
|---|-----------|------|---------|----------------|
| 1 | `#btnBackToStatsAdd` | Button | Back to `stateStats` | None |
| 2 | `#statsAddTabs` | Tabs | `potm` / `player` / `teamstats` | Set a default value |
| 3 | `#POTM` | Container | POTM entry form | Collapsed (unless default tab) |
| 3a | `#potmplayername` | Dropdown | Player (from squad of selected team, value = SignolPlayers `_id`) | None |
| 3a-1 | `#potmTeam` | Dropdown | Team for this POTM entry (options from `managerContext.teams`, value = Teams `_id`) | Defaults to manager's assigned team |
| 3b | `#potmSeasonDropdown` | Dropdown | Season for this POTM entry (options from `ClubDictionary` category="season") | None |
| 3c | `#potmReason` | Text Input/Rich Text | Reason | None |
| 3d | `#potmimage` | Upload Button | Player photo | None |
| 3e | `#potmSubmit` | Button | Save POTM | None |
| 4 | `#team` | Container | Team result entry form | Collapsed (unless default tab) |
| 4a | `#result` | Dropdown | Win/Lose/Draw | None |
| 4a-1 | `#tsTeam` | Dropdown | Team for this result (options from `managerContext.teams`, value = Teams `_id`) | Defaults to manager's assigned team |
| 4b | `#goalsfor` | Number Input | Goals for | None |
| 4c | `#goesagainst` | Number Input | Goals against | None |
| 4d | `#tsSeasonDropdown` | Dropdown | Season for this result (options from `ClubDictionary` category="season") | None |
| 4e | `#tsSubmit` | Button | Save team result | None |
| 5 | `#player` | Container | Bulk player stats form | Collapsed (unless default tab) |
| 5a | `#bulkSeasonDropdown` | Dropdown | Season for these bulk stats (options from `ClubDictionary` category="season") | None |
| 5a-1 | `#ddnTeam` | Dropdown | Team for these bulk stats (options from `managerContext.teams`, value = Teams `_id`) | Defaults to manager's assigned team |
| 5b | `#statRepeater` | Repeater | Editable rows | None |
| 5b-1 | `#inputName` | Dropdown (in repeater) | Player (from squad of selected team, value = SignolPlayers `_id`) | None |
| 5b-2 | `#inputGoals` | Number Input (in repeater) | Goals | None |
| 5b-3 | `#inputAssists` | Number Input (in repeater) | Assists | None |
| 5b-4 | `#inputTackles` | Number Input (in repeater) | Tackles | None |
| 5b-5 | `#inputSaves` | Number Input (in repeater) | Saves | None |
| 5b-6 | `#btnRemoveRow` | Button (in repeater) | Remove row | None |
| 5c | `#btnAddRow` | Button | Add new row | None |
| 5d | `#btnSubmitStats` | Button | Submit all rows | None |

> Note: only one of `#POTM` / `#team` / `#player` should be Visible by default, matching `#statsAddTabs`'s default selected value — the other two should be Collapsed.

## State: stateStatEdit (9th state)

Formerly the "Edit Records" sub-tab. Reached via `#btnNavStatsEdit` on `stateStats`.

| # | Element ID | Type | Purpose | Initial State |
|---|-----------|------|---------|----------------|
| 1 | `#btnBackToStatsEdit` | Button | Back to `stateStats` | None |
| 1a | `#editStatsTeamDropdown` | Dropdown | Select team to edit (a manager may have more than one) | None |
| 1b | `#editStatsSeasonDropdown` | Dropdown | Select season to edit (options from `ClubDictionary` category="season") | None |
| 2 | `#editRecordsTabSwitch` | Switch | "Stats" vs "POTM" | Default = "Stats" |
| 3 | `#statsGroup` | Container | Player stats table view | Visible |
| 3a | `#statsTable` | Table | Player stats rows (click to edit) | None |
| 3b | `#editPanel` | Container | Edit form | Collapsed |
| 3b-1 | `#inputEditName` | Dropdown | Player (from squad of selected team, value = SignolPlayers `_id`) | None |
| 3b-2 | `#inputEditGoals` | Number Input | Goals | None |
| 3b-3 | `#inputEditAssists` | Number Input | Assists | None |
| 3b-4 | `#inputEditTackles` | Number Input | Tackles | None |
| 3b-5 | `#inputEditSaves` | Number Input | Saves | None |
| 3b-6 | `#btnSaveEdit` | Button | Save edits | None |
| 4 | `#potmGroup` | Container | POTM table view | Collapsed |
| 4a | `#potmTable` | Table | POTM rows (click to edit) | None |
| 4b | `#poEdit` | Container | Edit form | Collapsed |
| 4b-1 | `#poeditname` | Dropdown | Player (from squad of selected team, value = SignolPlayers `_id`) | None |
| 4b-2 | `#poeditReason` | Text Input/Rich Text | Reason | None |
| 4b-3 | `#poeditphoto` | Upload Button | New photo | None |
| 4b-4 | `#imgPrev` | Image | Photo preview | None |
| 4b-5 | `#poeditSave` | Button | Save edits | None |

## Data Model Notes

`PlayerStats` and `Playerofthematch` both have a `playerReference` field (REFERENCE →
`SignolPlayers`). The four player-name elements above (`#potmplayername`, `#inputName`,
`#inputEditName`, `#poeditname`) are dropdowns sourced from the squad of the team
selected (`statsSelectedTeamId`), with `value` = the player's `_id`.
On save, both `playerReference` (the link) and `PS_playerName`/`PO_playerName`
(derived display name) are written.

### Season selection

`#statsSeasonDropdown` (on `stateStats`), `#editStatsSeasonDropdown` (on
`stateStatEdit`), and `#potmSeasonDropdown`/`#tsSeasonDropdown`/`#bulkSeasonDropdown`
(on `stateStatsAdd`, one per container) are all populated from `ClubDictionary` where
`category` = "season" (via `loadSeasonOptions()`), so adding a new season to the
dictionary automatically makes it available everywhere. Each defaults to the shared
`statsSelectedSeason` value when its state loads, but on `stateStatsAdd` the
`seasonLabel` actually written on save is read directly from that container's own
dropdown (`#potmSeasonDropdown`, `#tsSeasonDropdown`, or `#bulkSeasonDropdown`) — this
lets a manager record results for a different season than the one currently selected
on the Overview. There is no longer an automatic/calculated fallback (the old
`getAutoSeason()` has been removed), so a season must be selected before saving.

### Team selection on stateStatsAdd

`#potmTeam`, `#tsTeam`, and `#ddnTeam` (one per container) are all populated from
`managerContext.teams` and default to `statsSelectedTeamId` (falling back to the
manager's `primaryTeamId`) when `stateStatsAdd` loads, so a manager with only one
team never has to touch them. Changing any one of the three updates the shared
`statsSelectedTeamId`, keeps the other two dropdowns in sync, and reloads the squad
player options used by `#potmplayername` and `#statRepeater`'s `#inputName`.

### Team/season scope for stateStatEdit

`#editStatsTeamDropdown` and `#editStatsSeasonDropdown` let a manager who covers more
than one team/season filter `#statsTable`/`#potmTable` (via `refreshEditRecordsTables()`)
independently of the selection on `stateStats`. Changing either updates the shared
`statsSelectedTeamId`/`statsSelectedSeason` and, for the team dropdown, also reloads
the squad player options for `#inputEditName`/`#poeditname`.
