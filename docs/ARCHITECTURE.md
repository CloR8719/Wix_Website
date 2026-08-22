# System Architecture

## Overview

The Signol Football Club CRM is a comprehensive WIX-based system designed to manage all aspects of a football club operations across three main portals.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    SIGNOL FOOTBALL CLUB CRM                 │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Parent       │    │ Manager      │    │ Admin        │
│ Portal       │    │ Portal       │    │ Portal       │
└──────┬───────┘    └──────┬───────┘    └──────┬───────┘
       │ (Frontend JS)      │                  │
       │                    │                  │
       └────────────────────┼──────────────────┘
                            │
                ┌───────────▼──────────────┐
                │  WIX Backend (JSW)       │
                │  ┌────────────────────┐ │
                │  │ registration.jsw   │ │
                │  │ staffData.jsw      │ │
                │  │ sms.jsw            │ │
                │  │ notifications.jsw  │ │
                │  │ queueMonitor.jsw   │ │
                │  │ exportCsv.jsw      │ │
                │  │ events.js          │ │
                │  │ gocardless.jsw     │ │
                │  │ http-functions.js  │ │
                │  └────────────────────┘ │
                └───────────┬──────────────┘
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
    ┌─────▼─────┐  ┌────────▼────────┐  ┌────▼──────┐
    │ WIX CMS   │  │ External APIs   │  │ Secrets   │
    │ Collections│  │                │  │           │
    │ (Database)│  │ • Twilio SMS    │  │ • API Keys│
    │           │  │ • Email Service │  │ • Tokens  │
    └───────────┘  │ • FA Fixtures   │  │           │
                   │ • GoCardless    │  └───────────┘
                   │   (in progress) │
                   └─────────────────┘
```

---

## Three Portal Architecture

### 1. Parent Portal
**Purpose:** Player registration, payment management, communications

**Key Features:**
- View child's registration status
- Submit registration form
- View team assignments
- Make payments (GoCardless Direct Debit - in progress, see "GoCardless (Payments)" below)
- Receive notifications (email + SMS)

**Frontend Files:** `frontend/members_pages/`
**Backend Functions:** `registration.jsw`, `notifications.jsw`

---

### 2. Manager Portal
**Purpose:** Team management, fixture tracking, player statistics

**Key Features:**
- View team roster
- Record player stats (goals, assists, tackles)
- Update fixtures
- Generate reports for their team
- Track attendance

**Frontend Files:** `frontend/dashboard_pages/`
**Backend Functions:** `staffData.jsw`, `exportCsv.jsw`

---

### 3. Admin Portal
**Purpose:** Full club administration, reporting, system management

**Key Features:**
- Manage all teams & players
- Staff management & qualifications
- Financial reporting
- System alerts & monitoring
- Data exports (CSV)
- Registration queue monitoring

**Frontend Files:** `frontend/dashboard_pages/`, `frontend/main_pages/`
**Backend Functions:** `queueMonitor.jsw`, `exportCsv.jsw`, system monitoring

---

## Core Data Flow: Player Registration

```
┌──────────────────────────────────────────────────────────────┐
│                    REGISTRATION FLOW                         │
└──────────────────────────────────────────────────────────────┘

1. PARENT FILLS FORM
   Parent Portal (frontend)
   └─→ masterPage.js / members_pages/
   
2. SUBMIT DATA
   POST to backend
   └─→ registration.jsw
   
3. VALIDATE & STORE
   registration.jsw
   ├─→ Validate input
   ├─→ Insert into SignolPlayers collection
   └─→ Add to EmailQueue collection
   
4. SEND NOTIFICATIONS
   notifications.jsw
   ├─→ Email service (confirmation)
   ├─→ sms.jsw (SMS via Twilio)
   └─→ Queue monitor logs entry
   
5. ADMIN SEES IN QUEUE
   Admin Portal (dashboard_pages)
   └─→ queueMonitor.jsw fetches pending registrations
   
6. ADMIN APPROVES
   ├─→ Update registrationProgress → "approved"
   ├─→ Assign player to Team
   ├─→ Send confirmation SMS/email
   
7. COMPLETE
   Parent sees registration approved
   Manager sees new player on roster
   Player data ready for stats tracking
```

---

## Backend Files & Responsibilities

### `registration.jsw` (7.0 KB)
**Purpose:** Handle player registration flow

**Key Functions:**
- Validate registration form data
- Insert into SignolPlayers collection
- Handle parent profile linking
- Create EmailQueue entries
- Error logging to SystemAlerts

**Collections Used:**
- SignolPlayers (write)
- ParentProfiles (read/write)
- EmailQueue (write)
- SystemAlerts (write)

---

### `staffData.jsw` (4.5 KB)
**Purpose:** Fetch and manage staff information

**Key Functions:**
- Get team manager details (`getTeamManager`)
- Fetch staff by role
- Update staff qualifications
- Check expiry dates (DBS, First Aid, etc.)

**Collections Used:**
- SignolStaff (read/write)
- Teams (read)
- Qualifications (read)

---

### `sms.jsw` (595 bytes)
**Purpose:** Send SMS notifications via Twilio

**Key Functions:**
- Send SMS messages
- Use Twilio secrets from WIX

**Collections Used:** None (external API only)

**Secrets Required:**
- TWILIO_ACCOUNT_SID
- TWILIO_AUTH_TOKEN
- TWILIO_PHONE_NUMBER

---

### `notifications.jsw` (2.2 KB)
**Purpose:** Send email & SMS notifications

**Key Functions:**
- Send registration confirmations
- Send match reminders
- Send payment confirmations (future)
- Coordinate with sms.jsw for multi-channel

**Collections Used:**
- EmailQueue (read/write)
- SignolPlayers (read)
- ParentProfiles (read)

---

### `queueMonitor.jsw` (1.2 KB)
**Purpose:** Monitor registration queue

**Key Functions:**
- Get pending registrations
- Track email sent status
- Alert admins of issues
- Clean up old queue entries

**Collections Used:**
- EmailQueue (read)
- SignolPlayers (read)
- SystemAlerts (write)

---

### `exportCsv.jsw` (4.0 KB)
**Purpose:** Export data to CSV for reports

**Key Functions:**
- Export player roster
- Export attendance records
- Export financial data (future)
- Export team statistics

**Collections Used:**
- SignolPlayers (read)
- PlayerStats (read)
- Teams (read)
- All others as needed for reports

---

### `jobs.config`
**Purpose:** Configure scheduled jobs

**Current Jobs:**
- Queue monitoring
- Daily/weekly routine tasks
- Automatic data cleanup

---

## Frontend Architecture

### Master Page (`masterPage.js`)
- Main layout & navigation
- Portal routing logic
- User authentication state

### Portal-Specific Pages

**Members Pages** (`frontend/members_pages/`)
- Player registration form
- Parent profile management
- Payment setup/status (Parent Hub's `statePayment`, GoCardless-backed - see "GoCardless (Payments)" below)

**Dashboard Pages** (`frontend/dashboard_pages/`)
- Manager dashboard
- Admin dashboard
- Team views
- Statistics displays

**Main Pages** (`frontend/main_pages/`)
- Public pages (about, contact, etc.)
- Team pages
- News & announcements

**Additional Pages** (`frontend/additional_pages/`)
- Custom pages (help, FAQs, policies, etc.)

---

## Database Architecture

### Collection Relationships

```
SignolPlayers ─┬─→ ParentProfiles (primary & secondary)
               ├─→ Teams
               ├─→ AgeGroup
               └─→ (tracked in PlayerStats)

Teams ─┬─→ AgeGroup
       ├─→ SignolStaff (as manager)
       ├─→ ClubSponsors
       └─→ (linked from Fixtures)

SignolStaff ─┬─→ Teams (coaches multiple)
             ├─→ ClubRoles
             └─→ Qualifications

EmailQueue ──→ SignolPlayers (registration link)
```

### Key Collections

| Collection | Purpose | Records |
|---|---|---|
| SignolPlayers | Player profiles | ~100-500 |
| ParentProfiles | Parent contacts | ~100-500 |
| SignolStaff | Staff/coaches | ~20-50 |
| Teams | Age group teams | ~8-15 |
| Fixtures | Match schedule | ~50-200 |
| PlayerStats | Season statistics | ~1000-5000 |
| EmailQueue | Notification tracking | ~500-2000 |
| ClubDictionary | Lookup values | ~100 |

---

## External Integrations

### Twilio (SMS)
- **Status:** ✅ Implemented
- **Purpose:** Send SMS notifications
- **Used by:** notifications.jsw, sms.jsw
- **Secrets:** TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER

### Email Service
- **Status:** ✅ Implemented
- **Purpose:** Send registration & match notifications
- **Used by:** notifications.jsw
- **Secrets:** EMAIL_SERVICE_KEY

### FA Website (Fixtures Import)
- **Status:** ⏳ In Development
- **Purpose:** Auto-import fixtures by league division
- **Planned by:** New backend function
- **Challenge:** Match FA fixtures to club Teams

### GoCardless (Payments)
- **Status:** ⏳ In Development
- **Purpose:** Collect registration fees via Direct Debit, replacing an earlier Wix
  Pricing Plans/Stripe integration (cheaper per-transaction fees, plus a discount
  GoCardless offers football clubs)
- **Built by:** `backend/gocardless.jsw` (API wrapper), `backend/http-functions.js`
  (webhook receiver - Wix's reserved filename for exposing an inbound endpoint),
  new functions in `registration.jsw` (`startGoCardlessSetup`, `getGoCardlessStatus`,
  `cancelGoCardlessSubscription`)
- **Secrets:** `_GOCARDLESS_ACCESS_TOKEN`, `_GOCARDLESS_WEBHOOK_SECRET`
- **Collections:** `GoCardlessSubscriptions`, `GoCardlessWebhookEvents`,
  `GoCardlessPayments` (see `database/CMS_SCHEMA.txt`)
- The older Wix Pricing Plans/Stripe path (`backend/events.js`, `ChildSubscriptions`
  collection) is left in place, dormant, until GoCardless has been live and collected
  at least one real monthly cycle - see `docs/PARENT_HUB_ELEMENTS.md`'s "Payment
  tracking" section for the full mechanism.

---

## Security Considerations

### Data Access Control
- Parent Portal: Can only see own child's data
- Manager Portal: Can see own team's data
- Admin Portal: Can see all data

### Secrets Management
All sensitive credentials stored in WIX Secrets:
- API keys (Twilio, Stripe, etc.)
- Database credentials
- External service tokens

**Never commit secrets to GitHub!**

### Data Protection
- Email addresses encrypted
- Phone numbers validated
- Medical info flagged as sensitive
- DBS/qualification expiry monitored

---

## Error Handling

### SystemAlerts Collection
Used to track and log errors:
```javascript
{
  _id: auto,
  errorMessage: "string - detailed error",
  failedCount: number,
  _createdDate: timestamp
}
```

All JSW files log errors here for admin visibility.

---

## Future Architecture Additions

### 1. Stripe Payment Integration
```
Payment Flow:
Parent Portal → Stripe Checkout → payments.jsw → 
Payments Collection → Confirmation Email/SMS
```

### 2. FA Fixture Import
```
Scheduled Job → FA API → fixture-importer.jsw → 
TeamFixtures Collection → Manager/Admin Portal
```

### 3. Attendance Tracking
```
New Collection: Attendance
├── playerReference
├── fixtureReference
├── status (present/absent/injured)
└── notes
```

### 4. Advanced Reporting
```
New Collection: Reports
├── Generated reports
├── Export formats (PDF, CSV)
└── Scheduled deliveries
```

---

## Deployment Checklist

- [ ] All secrets configured in WIX
- [ ] Twilio account active
- [ ] Email service active
- [ ] Database collections created
- [ ] All JSW files deployed
- [ ] Frontend pages published
- [ ] Admin portal tested
- [ ] Parent portal tested
- [ ] Manager portal tested
- [ ] Error logging verified

---

## Performance Considerations

- **Database Queries:** Indexed on frequently queried fields
- **Frontend Loading:** Lazy load dashboard data
- **Backend Processing:** Queue heavy operations
- **SMS/Email:** Use queueMonitor for batch processing

