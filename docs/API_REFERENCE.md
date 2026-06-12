# API Reference

## Overview

This document outlines all backend API endpoints and webhooks available in the Signol Football Club CRM system.

---

## Backend Files & Exports

### 1. registration.jsw - Player Registration

#### `registerPlayer(playerData)`
**Purpose:** Register a new player

**Parameters:**
```javascript
{
  firstName: string,
  lastName: string,
  dob: date,
  team: string (Team ID),
  parentEmail: email,
  parentPhone: string,
  parentName: string,
  emergencyContact: string,
  medicalInfo: string (optional),
  position: string,
  shirtSize: string,
  // ... other registration fields
}
```

**Returns:**
```javascript
{
  success: boolean,
  playerId: string,
  message: string,
  registrationLink: string (for parent confirmation)
}
```

**Database Operations:**
- Inserts into `SignolPlayers`
- Creates/links `ParentProfiles`
- Adds entry to `EmailQueue`
- Logs errors to `SystemAlerts`

**Example:**
```javascript
// Frontend call
const result = await registerPlayer({
  firstName: "John",
  lastName: "Smith",
  dob: new Date(2015, 5, 10),
  team: "u12-strikers-id",
  parentEmail: "parent@example.com",
  parentPhone: "+441234567890",
  parentName: "Jane Smith"
});
```

---

#### `approveRegistration(playerId)`
**Purpose:** Approve a pending player registration

**Parameters:**
```javascript
{
  playerId: string (SignolPlayers._id)
}
```

**Returns:**
```javascript
{
  success: boolean,
  message: string,
  playerName: string
}
```

**Database Operations:**
- Updates `registrationProgress` to "approved"
- Sends confirmation email/SMS via notifications.jsw

---

### 2. staffData.jsw - Staff Management

#### `getTeamManager(teamId)`
**Purpose:** Get manager details for a specific team

**Parameters:**
```javascript
{
  teamId: string (Teams._id)
}
```

**Returns:**
```javascript
{
  fullName: string,
  team: string,
  photo: string (image URL),
  email: string,
  phone: string
}
```

**Example:**
```javascript
// Fetching manager for U12 Strikers
const manager = await getTeamManager("team-u12-strikers-id");
// Returns: { fullName: "Mike Johnson", team: "U12 Strikers", photo: "...", ... }
```

---

#### `getStaffByRole(roleId)`
**Purpose:** Get all staff members with a specific role

**Parameters:**
```javascript
{
  roleId: string (ClubRoles._id)
}
```

**Returns:**
```javascript
[
  {
    id: string,
    name: string,
    role: string,
    teams: string[],
    qualifications: string[]
  },
  ...
]
```

---

#### `checkQualificationExpiry(staffId)`
**Purpose:** Check if staff member's qualifications are expiring soon

**Parameters:**
```javascript
{
  staffId: string (SignolStaff._id)
}
```

**Returns:**
```javascript
{
  staffName: string,
  expiringQualifications: [
    {
      type: "DBS" | "FirstAid" | "Safeguarding" | "Coaching",
      expiryDate: date,
      daysUntilExpiry: number,
      alert: boolean (true if < 30 days)
    }
  ]
}
```

---

### 3. notifications.jsw - Email & Notifications

#### `sendRegistrationConfirmation(playerId, parentEmail)`
**Purpose:** Send registration confirmation to parent

**Parameters:**
```javascript
{
  playerId: string,
  parentEmail: email
}
```

**Returns:**
```javascript
{
  success: boolean,
  emailSent: boolean,
  smsSent: boolean,
  message: string
}
```

**Side Effects:**
- Updates `emailSent` flag in `EmailQueue`
- Calls `sms.jsw` if phone number available

---

#### `sendMatchReminder(teamId, fixtureDate)`
**Purpose:** Send match reminder to all players' parents

**Parameters:**
```javascript
{
  teamId: string (Teams._id),
  fixtureDate: date
}
```

**Returns:**
```javascript
{
  success: boolean,
  emailsSent: number,
  smsSent: number,
  failedNotifications: number
}
```

---

#### `sendCustomNotification(recipients, subject, message)`
**Purpose:** Send custom email/SMS to selected recipients

**Parameters:**
```javascript
{
  recipients: [
    {
      email: string,
      phone: string,
      name: string
    }
  ],
  subject: string,
  message: string,
  type: "email" | "sms" | "both"
}
```

**Returns:**
```javascript
{
  success: boolean,
  sent: number,
  failed: number
}
```

---

### 4. sms.jsw - Twilio SMS Integration

#### `sendSMS(phoneNumber, message)`
**Purpose:** Send SMS message via Twilio

**Parameters:**
```javascript
{
  phoneNumber: string (E.164 format: +441234567890),
  message: string (max 160 characters)
}
```

**Returns:**
```javascript
{
  success: boolean,
  messageId: string,
  timestamp: date
}
```

**Required Secrets:**
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`

**Example:**
```javascript
const result = await sendSMS(
  "+441234567890",
  "Match tomorrow at 10am. Meet at Main Pitch."
);
```

---

### 5. queueMonitor.jsw - Registration Queue Monitoring

#### `getPendingRegistrations()`
**Purpose:** Get all pending player registrations

**Parameters:** None

**Returns:**
```javascript
[
  {
    playerId: string,
    playerName: string,
    parentName: string,
    parentEmail: string,
    registeredDate: date,
    status: "pending" | "approved" | "rejected",
    emailSent: boolean
  },
  ...
]
```

---

#### `monitorEmailQueue()`
**Purpose:** Check email queue status and retry failed emails

**Parameters:** None

**Returns:**
```javascript
{
  totalInQueue: number,
  sent: number,
  failed: number,
  retriedCount: number,
  errors: string[]
}
```

**Side Effects:**
- Retries failed email notifications
- Logs issues to `SystemAlerts`

---

### 6. exportCsv.jsw - Data Export

#### `exportPlayerRoster(teamId)`
**Purpose:** Export team roster to CSV format

**Parameters:**
```javascript
{
  teamId: string (Teams._id)
}
```

**Returns:**
```javascript
{
  success: boolean,
  csvData: string (CSV format),
  filename: string,
  recordCount: number
}
```

**CSV Columns:**
- PlayerID, FirstName, LastName, DOB, Position, ShirtSize, Email, Phone, Status

---

#### `exportAttendanceReport(teamId, fixtureId)`
**Purpose:** Export attendance report for a specific fixture

**Parameters:**
```javascript
{
  teamId: string,
  fixtureId: string
}
```

**Returns:**
```javascript
{
  success: boolean,
  csvData: string,
  filename: string,
  presentCount: number,
  absentCount: number
}
```

**CSV Columns:**
- PlayerName, Status (Present/Absent/Injured), Notes

---

#### `exportPlayerStats(teamId, season)`
**Purpose:** Export player statistics for a season

**Parameters:**
```javascript
{
  teamId: string,
  season: string (e.g., "2025/26")
}
```

**Returns:**
```javascript
{
  success: boolean,
  csvData: string,
  filename: string,
  season: string
}
```

**CSV Columns:**
- PlayerName, Goals, Assists, Tackles, Saves, Total Appearances

---

## Frontend-to-Backend Integration Points

### Registration Flow
```
Frontend: masterPage.js → registration page
  ↓
Backend: registerPlayer() in registration.jsw
  ↓
Database: SignolPlayers, ParentProfiles, EmailQueue
  ↓
Backend: sendRegistrationConfirmation() in notifications.jsw
  ↓
External: Email + SMS sent
```

### Dashboard Data
```
Frontend: dashboard_pages/
  ↓
Backend: getTeamManager(), getPendingRegistrations(), etc.
  ↓
Database: Read from collections
  ↓
Frontend: Display in UI
```

### Data Export
```
Frontend: Admin portal download button
  ↓
Backend: exportPlayerRoster(), exportCsv.jsw
  ↓
Frontend: Download CSV file
```

---

## Error Handling

### Standard Error Response
All endpoints follow this error format:

```javascript
{
  success: false,
  message: "Error description",
  error: "ERROR_CODE",
  details: {} // Additional context
}
```

### Common Error Codes
- `INVALID_INPUT` - Missing or invalid parameters
- `PLAYER_NOT_FOUND` - Player ID doesn't exist
- `TEAM_NOT_FOUND` - Team ID doesn't exist
- `DUPLICATE_EMAIL` - Parent email already registered
- `SMS_FAILED` - Twilio SMS delivery failed
- `DATABASE_ERROR` - Collection write failed
- `EXTERNAL_API_ERROR` - Third-party service error

### Error Logging
All errors logged to `SystemAlerts` collection for admin review.

---

## Authentication & Authorization

### Portal Access Control
- **Parent Portal:** Can access own child's data only
- **Manager Portal:** Can access own team's data only
- **Admin Portal:** Can access all data

Enforced at:
1. Frontend (UI hides unauthorized options)
2. Backend (JSW validates user role before returning data)

---

## Rate Limiting

### SMS Limits (Twilio)
- Max 1 SMS per phone per 60 seconds
- Batch sends: max 100 per minute

### Email Limits
- Max 1000 emails per day
- Batch sends: max 50 per minute

### Database Queries
- Standard WIX CMS limitations apply
- Use indexing on frequently queried fields

---

## Future API Endpoints (In Development)

### Stripe Payments
```javascript
// payments.jsw (coming soon)
processPayment(playerId, amount, stripeToken)
  → Creates Payment record
  → Sends confirmation email/SMS
  → Updates player payment status

getOutstandingPayments(teamId)
  → Returns list of unpaid players
```

### FA Fixture Import
```javascript
// fixture-importer.jsw (coming soon)
importFixturesFromFA(leagueDivision, season)
  → Fetches from FA API
  → Matches to Teams
  → Updates Fixtures collection
  → Sends notifications
```

### Advanced Reporting
```javascript
// reporting.jsw (coming soon)
generateAttendanceReport(teamId, dateRange)
generateFinancialReport(teamId, period)
generatePlayerAnalytics(playerId, season)
```

---

## Testing Endpoints

### Postman Collection
Save as `Signol_CRM.postman_collection.json`:

```json
{
  "info": {
    "name": "Signol Football Club CRM API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Register Player",
      "request": {
        "method": "POST",
        "url": "wix-api-endpoint/registerPlayer"
      }
    },
    {
      "name": "Get Pending Registrations",
      "request": {
        "method": "GET",
        "url": "wix-api-endpoint/getPendingRegistrations"
      }
    }
  ]
}
```

---

## Backend Function Signature Reference

```javascript
// registration.jsw
export async function registerPlayer(playerData) { }
export async function approveRegistration(playerId) { }

// staffData.jsw
export async function getTeamManager(teamId) { }
export async function getStaffByRole(roleId) { }
export async function checkQualificationExpiry(staffId) { }

// notifications.jsw
export async function sendRegistrationConfirmation(playerId, parentEmail) { }
export async function sendMatchReminder(teamId, fixtureDate) { }
export async function sendCustomNotification(recipients, subject, message) { }

// sms.jsw
export async function sendSMS(phoneNumber, message) { }

// queueMonitor.jsw
export async function getPendingRegistrations() { }
export async function monitorEmailQueue() { }

// exportCsv.jsw
export async function exportPlayerRoster(teamId) { }
export async function exportAttendanceReport(teamId, fixtureId) { }
export async function exportPlayerStats(teamId, season) { }
```

