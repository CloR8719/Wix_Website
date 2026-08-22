# Staff Record Lightbox — Element Reference

Element IDs for the `StaffRecord` Lightbox, opened from `stateStaff`'s roster in
Player Admin — see `PLAYER_ADMIN_ELEMENTS.md`. Mocked up first as an extension of
the secretary dashboard Artifact before building, same workflow as everything else
in this redesign.

**This is a Wix Lightbox.** In the Editor:
1. Add a Lightbox and name it exactly `StaffRecord` (the string passed to
   `wixWindow.openLightbox("StaffRecord", { staffId })`).
2. Turn **off** "Open automatically".

A companion **`StaffQuickAdd`** Lightbox (documented at the bottom of this file)
collects just the basics for a brand new staff member, then hands off straight into
`StaffRecord` opened already in edit mode.

## CMS check (2026-08) — what's real today vs. proposed

Checked `database/CMS_SCHEMA.txt`'s `SignolStaff` collection before finalizing this
field list. What actually exists today: `fanNumber`, `dob`, `address`, `mobile`,
`emailAddress`, `bio` (rich text, unused so far), `headshot` (image, unused so far),
`SS_name`/`SS_firstName`/`SS_lastName`, `SS_role` (**multi-reference**), `SS_team`
(**multi-reference**), `SS_Qualifications` (multi-reference), `dbsExpiry`,
`firstAidExpiry`, `safeGuardingExpiry`, `coachingExpiry`. Compliance is genuinely
just those 4 expiry dates — no certificate number/type/provider/awarding-body
fields exist, and Rob confirmed he doesn't want them added (keep it to name +
expiry, nothing more).

`SS_role`/`SS_team` being multi-reference is why they're pill-list + Dropdown
pairs below, not a single Dropdown — a staff member can genuinely hold more than
one role/team at once (e.g. a coach for two age groups). Full name is read/written
as the single `SS_name` field, matching how the old repeater already worked —
`SS_firstName`/`SS_lastName` exist on the collection but aren't used here.

**Status, Start Date, Notes, and Emergency Contact are now real columns**
(added 2026-08) — `status`, `startDate`, `emergencyContactName`,
`emergencyContactRelation`, `emergencyContactPhone`, `notes`, all Text except
`startDate` (Date). Fully wired in `getStaffRecord`/`saveStaffRecord`/
`Staff Record.js` same as everything else — no longer flagged "NEW FIELD"
below. `bio` stays untouched/unused — Notes is its own separate field, not
folded into it, per Rob's call. Volunteer/Paid was dropped after review, not
worth tracking. `#srEmergRelation` ended up built as a **Dropdown** rather
than an Input Box (Rob's call, since relationship is naturally a fixed set of
choices) — no code difference, both expose `.value` as a string the same way.

## Field pattern — one input per field, not a duplicate view/edit pair

Every plain field below (Input Box / Dropdown / Date Picker) is a **single** real
Wix element — not a separate read-only Text plus a hidden input. Every one of them
is `.disable()`'d by default so it reads like plain text and can't be typed into
by accident. `#srEditToggleBtn` is one button the whole time — clicking it calls
`.enable()` on every field and flips its own `.label` to "Save Changes"; clicking
it again reads every input's `.value`, writes back via `wixData.update()`, flips
the label back to "Edit Details", and `.disable()`s everything again.

**Exception: the 3 multi-reference fields (Role/Team/Qualifications).** A real
Wix Tags element shows every available option when interactive — fine for a
handful of choices, unusable for Teams (22+ of them) when a staff member only
ever has 1-2. Instead of Tags, each of these is a **pill list + plain
Dropdown**: pills show what's assigned (each with its own small × to remove),
and the Dropdown only ever lists the options NOT already assigned — picking one
turns it into a pill and drops out of the dropdown; removing a pill puts it
back in the dropdown. A native Dropdown scales fine to a long list (it just
scrolls) without ever dumping everything on screen at once.

**The pill list is a Repeater.** Wix requires page-wide unique IDs, so each of
the 3 repeaters needs its OWN pair of item-template element IDs (not a shared
`#pillLabel`/`#pillRemoveBtn` reused across all three — Wix doesn't scope IDs
per-repeater the way some other frameworks do):

| Repeater | Item template Text | Item template Button ("×") |
|---|---|---|
| `#srRolePills` | `#rolePillLabel` | `#rolePillRemoveBtn` |
| `#srTeamPills` | `#teamPillLabel` | `#teamPillRemoveBtn` |
| `#srQualPills` | `#qualPillLabel` | `#qualPillRemoveBtn` |

Each remove button starts disabled, same as everything else in this lightbox.
See the Overview/Compliance tables below for which Repeater/Dropdown pair is which.

## Header (outside the tabs, always visible)

| # | Element ID | Type | Purpose | Initial State |
|---|-----------|------|---------|----------------|
| 1 | `#srHeadshot` | Image | Staff photo (`headshot` field). **View-only, and only ever shown here** — the roster repeater (`#stfAvatar`) stays initials-only everywhere, per Rob's call. | None |
| 1a | `#srChangePhotoBtn` | Upload Button | Replaces `#srHeadshot` — disabled until Edit Details, same as every other field. **Must be a real Upload Button element, not a plain Button** (only Upload Button can open a file picker/upload to Wix Media in Velo). Wix's Upload Button has no icon-only/no-label mode, so this sits as a normal small text button in the header's action row (next to `#srEditToggleBtn`/`#srCloseBtn`) rather than attached to `#srHeadshot` itself — keeps it from pushing the header layout around. | Disabled |
| 2 | `#srName` | Text | Heading — full name | None |
| 3 | `#srRolePill` | Text | "Role · Team" summary | None |
| 4 | `#srEditToggleBtn` | Button | "Edit Details" ⇄ "Save Changes" toggle — see field pattern above | None |
| 5 | `#srCloseBtn` | Button | Closes the lightbox | None |

## Tabs

Same Multi-State Box pattern as `PlayerRecord`'s `#prTabsBox`.

| Element ID | Type | Purpose |
|---|---|---|
| `#srTabsBox` | Multi-State Box | Holds the 2 tabs as states |
| `#srTabOverview` | Button | → `stateOverview` |
| `#srTabCompliance` | Button | → `stateCompliance` |

| Tab button | State name | Contains |
|---|---|---|
| `#srTabOverview` | `stateOverview` | Contact, Role, Emergency Contact, Notes, Remove Staff Member |
| `#srTabCompliance` | `stateCompliance` | DBS / First Aid / Safeguarding / Coaching, Qualifications & Badges |

Code lands on `stateOverview` whenever the lightbox opens, same as `PlayerRecord`.

## Tab: Overview

| # | Element ID | Type | Purpose | Initial State |
|---|-----------|------|---------|----------------|
| 1 | `#srFullName` | Input Box | Full name (`SS_name`) | Disabled |
| 2 | `#srDob` | Date Picker | Date of birth (`dob`) | Disabled |
| 3 | `#srFan` | Input Box | FAN number (`fanNumber`) — **exists in the CMS, was missed in the first mockup pass, added here** | Disabled |
| 4 | `#srEmail` | Input Box | Email (`emailAddress`) | Disabled |
| 5 | `#srMobile` | Input Box | Mobile (`mobile`) | Disabled |
| 6 | `#srAddress` | Input Box | Address (`address`) | Disabled |
| 7 | `#srRolePills` | Repeater | Assigned role(s) shown as removable pills, e.g. "Head Coach ×" — item template is `#rolePillLabel`/`#rolePillRemoveBtn`, see above. `SS_role` is multi-reference so there can be more than one. | None |
| 7a | `#srRoleAddDropdown` | Dropdown | Lists only club roles NOT already assigned — "+ Add a role…" placeholder. Picking one adds a pill to `#srRolePills` and removes that option from this dropdown; removing a pill puts it back. | Disabled |
| 8 | `#srTeamPills` | Repeater | Assigned team(s) shown as removable pills — item template is `#teamPillLabel`/`#teamPillRemoveBtn`. `SS_team` is multi-reference — e.g. a coach across two age groups. | None |
| 8a | `#srTeamAddDropdown` | Dropdown | Same "only unassigned options, pick to add" pattern as Role above — lists every team NOT already assigned, however many that is | Disabled |
| 9 | `#srStatus` | Dropdown | `status` (Text) — Active / Inactive / Left the Club. **Options set by code** (`STATUS_OPTIONS` in Staff Record.js) on load, not typed into the Editor's Options panel — leave it empty there. | Disabled |
| 10 | `#srStartDate` | Date Picker | `startDate` (Date) | Disabled |
| 11 | `#srEmergName` | Input Box | `emergencyContactName` (Text) | Disabled |
| 12 | `#srEmergRelation` | Dropdown | `emergencyContactRelation` (Text) — built as a Dropdown, not an Input Box (Rob's call). **Options set by code**, loaded from the same `ClubDictionary` "relationship" category Parent Hub's parent/emergency-contact relation dropdowns use — same choices she already sees on the registration form. Stored as the label text (not a dictionary `_id`), since this field is Text not Reference. Leave the Editor's Options panel empty. | Disabled |
| 13 | `#srEmergPhone` | Input Box | `emergencyContactPhone` (Text) | Disabled |
| 14 | `#srNotes` | Text Box (paragraph input) | `notes` (Text) — free text for anything she needs to jot down. `bio` stays as-is, untouched, not reused for this — Rob wants them kept separate. | Disabled |
| 15 | `#srRemoveBtn` | Button | Two-tap confirm remove, same pattern as the old `#stfDeleteBtn`. **Still a hard delete today** (`wixData.remove`) — now that `status` is a real field, this *could* switch to setting it to "Left the Club" instead of deleting outright, but that's a behaviour change Rob hasn't asked for yet, so left as-is. | None |

## Tab: Compliance

Certificate number/type/provider/awarding-body fields were dropped after Rob's
review — just a status light and an expiry date per check, matching what's
actually in the CMS.

| # | Element ID | Type | Purpose | Initial State |
|---|-----------|------|---------|----------------|
| 1 | `#srDbsDot` / `#srDbsLabel` | Box + Text | DBS traffic light + status text (red EXPIRED/amber EXPIRING SOON/green COMPLIANT, same logic as the old `#stfDbsLight`) | None |
| 2 | `#srDbsExpiry` | Date Picker | `dbsExpiry` | Disabled |
| 3 | `#srFaDot` / `#srFaLabel` | Box + Text | First Aid traffic light + status text | None |
| 4 | `#srFaExpiry` | Date Picker | `firstAidExpiry` | Disabled |
| 5 | `#srSgDot` / `#srSgLabel` | Box + Text | Safeguarding traffic light + status text | None |
| 6 | `#srSgExpiry` | Date Picker | `safeGuardingExpiry` | Disabled |
| 7 | `#srCoachDot` / `#srCoachLabel` | Box + Text | Coaching traffic light + status text | None |
| 8 | `#srCoachExpiry` | Date Picker | `coachingExpiry` | Disabled |
| 9 | `#srQualPills` | Repeater | Assigned qualifications/badges (`SS_Qualifications`, multi-reference) shown as removable pills — item template is `#qualPillLabel`/`#qualPillRemoveBtn`, same pattern as `#srRolePills`/`#srTeamPills` above, replaces the old repeater's `#stfQualTags` | None |
| 9a | `#srQualAddDropdown` | Dropdown | Lists only qualifications NOT already assigned — same "only unassigned options, pick to add" pattern as Role/Team | Disabled |

## `StaffQuickAdd` Lightbox (separate Lightbox, opened by `#staffAddBtn`)

Collects just enough to create the row, then opens `StaffRecord` (pre-filled,
straight into edit mode) for everything else — mirrors the old `#staffAddBtn`
behaviour ("inserts a blank row and selects it") with one lightweight step in
front of it so she isn't filling in compliance dates before she's even saved a name.

**This is also a Wix Lightbox** — name it exactly `StaffQuickAdd`, "Open
automatically" off.

| # | Element ID | Type | Purpose | Initial State |
|---|-----------|------|---------|----------------|
| 1 | `#saName` | Input Box | Full name | None |
| 2 | `#saEmail` | Input Box | Email | None |
| 3 | `#saMobile` | Input Box | Mobile | None |
| 4 | `#saTeam` | Dropdown | Team | None |
| 5 | `#saRole` | Dropdown | Club role | None |
| 6 | `#saCreateBtn` | Button | Inserts the new `SignolStaff` row, closes this lightbox, opens `StaffRecord` with `{ staffId, startEditing: true }` | None |
| 7 | `#saCloseBtn` | Button | Cancels, closes without creating anything | None |
