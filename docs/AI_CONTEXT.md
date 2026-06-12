# AI Development Context Guide

This guide explains how to ask AI (like Claude or ChatGPT) to help you build new features for the Signol Football Club CRM system.

---

## How to Ask for Help

### Example 1: Adding Stripe Payments

```
I need to add Stripe payment processing to my Signol Football Club CRM.

Here's what I need:
1. Create a backend endpoint (JSW file) that accepts payment info
2. Process payment via Stripe API
3. On success: create entry in Payments collection, send confirmation email
4. On failure: log error to SystemAlerts, return error message

The system has players with parentEmail addresses in the SignolPlayers collection.
Parents pay team fees (stored in a Teams collection with payment amount).

Can you provide:
- The JSW backend code for the payment endpoint
- How to structure the Payments collection fields
- How to handle Stripe webhook confirmations
- Error handling for failed payments
```

### Example 2: FA Fixture Import

```
I need to import fixtures from the FA website automatically.

Current setup:
- I have a TeamFixtures collection (CMS ID: fixtures)
- It has fields: date, homeTeam, awayTeam, venue, signol_team
- I have a Teams collection where each team has:
  - T_teamName (e.g., "U12 Strikers")
  - AG_ageGroup (age group reference)
  - leagueDivision (which league they're in)

I need help:
1. Finding the FA API endpoint for fixtures (by league division)
2. Creating a backend JSW file that fetches fixtures
3. Matching FA fixtures to my Teams collection
4. Handling schedule runs (daily? weekly?)
5. Avoiding duplicate imports

Can you help me build this?
```

### Example 3: Admin Reports

```
I need to create admin reports for the club.

Required reports:
1. Attendance report - show which players attended each fixture
2. Financial report - show payments received vs outstanding
3. Player statistics - goals, assists per player per season
4. Team performance - wins, losses, goals for/against

My collections:
- SignolPlayers (has player info, team, DOB)
- ParentProfiles (parent contact info)
- PlayerStats (goals, assists, tackles, saves)
- Payments (future - stripe integration)
- Fixtures (matches with date, teams, venue)

I want these reports in:
- PDF format for download
- Dashboard summary view
- Email delivery to admin

Can you help me design and build this?
```

---

## Code Style & Patterns to Follow

### Backend (JSW Files)

**Pattern 1: API Endpoint**
```javascript
// Always export named functions
export async function createPayment(paymentData) {
  // 1. Validate input
  if (!paymentData.playerId || !paymentData.amount) {
    throw new Error("Missing required fields");
  }
  
  // 2. Process logic
  const result = await stripeAPI.processPayment(paymentData);
  
  // 3. Save to database
  await wixData.insert("Payments", {
    playerReference: paymentData.playerId,
    amount: paymentData.amount,
    stripeId: result.id,
    status: "completed"
  });
  
  // 4. Return consistent format
  return {
    success: true,
    paymentId: result.id,
    message: "Payment processed"
  };
}
```

**Pattern 2: Error Handling**
```javascript
// All errors should be logged and tracked
try {
  // attempt operation
} catch (error) {
  // Log to SystemAlerts collection
  await wixData.insert("SystemAlerts", {
    errorMessage: error.message,
    failedCount: 1,
    timestamp: new Date()
  });
  
  // Return error in consistent format
  return {
    success: false,
    message: "Operation failed",
    error: error.message
  };
}
```

### Frontend (JS Files)

**Pattern 1: Data Display**
```javascript
$w.onReady(async () => {
  // 1. Load data
  const teams = await getAllTeams();
  
  // 2. Set dataset
  $w("#teamsDataset").setData(teams);
  
  // 3. Setup item templates
  $w("#teamsRepeater").onItemReady(($item, itemData) => {
    $item("#teamName").text = itemData.T_teamName;
    $item("#manager").text = itemData.managerName;
  });
});
```

**Pattern 2: Form Submission**
```javascript
export function submitForm_click() {
  // Validate
  if (!$w("#input").valid) return;
  
  // Get values
  const data = {
    name: $w("#nameInput").value,
    email: $w("#emailInput").value
  };
  
  // Call backend
  saveToDatabase(data).then(result => {
    if (result.success) {
      $w("#successMessage").show();
    }
  });
}
```

---

## Database & Collection Rules

### When Adding Fields

1. **Always make new fields nullable** (allow empty values initially)
2. **Use consistent naming**: `Collection_fieldName` pattern
   - Example: `SP_firstName` (SignolPlayers_firstName)
3. **Document field purpose** in your request to AI
4. **Consider data relationships** - does this field reference another collection?

### When Creating New Collections

Provide this structure:
```
Collection Name: [Name]
Collection ID: [camelCase]
Purpose: [What is this for?]

Fields:
- _id (TEXT) - system field
- _createdDate (DATETIME) - system field
- _updatedDate (DATETIME) - system field
- _owner (TEXT) - system field
- [your fields]
```

### Reference Fields

When a field references another collection:
- Use `REFERENCE` (single item) or `MULTI_REFERENCE` (multiple items)
- Example: `SP_team (REFERENCE)` → points to Teams collection

---

## Twilio SMS Integration (Already Implemented)

When asking for SMS features:

```javascript
// Pattern for SMS (already in use)
import { sendTwilio } from 'backend/twilioService';

await sendTwilio({
  phoneNumber: parentPhone,
  message: "Match reminder: Tomorrow 10am at Main Pitch"
});
```

Tell AI:
- "I'm using Twilio for SMS (keys stored in secrets)"
- "Send SMS when registrations complete"
- "Send match day reminders"
- "Use this format: sendTwilio({ phoneNumber, message })"

---

## Email Integration (Already Implemented)

When asking for email features:

```javascript
// Pattern for emails (already in use)
import { sendEmail } from 'backend/emailService';

await sendEmail({
  to: parentEmail,
  subject: "Registration Confirmation",
  body: "Your child has been registered"
});
```

Tell AI:
- "I'm using automated emails for notifications"
- "Email templates are stored in [location]"
- "Use this format: sendEmail({ to, subject, body })"

---

## Secret/Environment Variables

When you need API keys or secrets, tell AI:

```
I store these in WIX secrets:
- STRIPE_API_KEY (for payments)
- TWILIO_ACCOUNT_SID (for SMS)
- TWILIO_AUTH_TOKEN
- TWILIO_PHONE_NUMBER
- FA_API_KEY (for fixture import)
- EMAIL_SERVICE_KEY

In code, access like:
const stripeKey = process.env.STRIPE_API_KEY;
```

---

## Features in Development

### Stripe Payment Processing

```
When asking AI:
"I need to integrate Stripe payments. 
- Players pay team fees (amount per team)
- Parents make payments via portal
- Store payment records with status
- Send confirmation email on success
- Use these WIX secrets: STRIPE_API_KEY, STRIPE_SECRET"
```

### FA Fixture Import

```
When asking AI:
"I need to import fixtures from the FA website.
- Fetch from FA API by league division
- Match to my Teams collection by name & division
- Update fixtures weekly
- Avoid duplicates
- Handle API errors gracefully"
```

### Admin Reports

```
When asking AI:
"I need these admin reports:
1. Attendance: Who attended which match
2. Financial: Payments in/out, outstanding fees
3. Player Stats: Goals, assists per season
4. Team Performance: W/L record, goal differences

Can you design the collections needed and the backend queries?"
```

---

## How to Share Your Code with AI

### For Bug Fixes or Enhancements

```
My registration email isn't sending. Here's the code:

[PASTE YOUR JSW FILE]

The error is: [PASTE ERROR MESSAGE]

Can you:
1. Identify the issue
2. Suggest a fix
3. Explain why it happened
```

### For Architecture Questions

```
I want to redesign how fixtures are stored and imported.
Current setup:
- Fixtures collection has: date, homeTeam, awayTeam, venue, signol_team
- Teams collection has: T_teamName, AG_ageGroup, leagueDivision

I'm planning to:
[EXPLAIN YOUR PLAN]

Is this a good approach? Any issues?
```

---

## Common Feature Requests (Templates)

### Template: New Portal Feature
```
I need to add a [feature name] to the [admin/manager/parent] portal.

Requirements:
1. [What it should do]
2. [What data it needs]
3. [Who can access it]

Collections involved:
- [Collection 1]: [fields used]
- [Collection 2]: [fields used]

Can you help me build this?
```

### Template: New Integration
```
I need to integrate with [service name].

Why: [What problem does this solve]

My current setup:
- [Relevant collections]
- [Relevant fields]
- [Current related code]

Can you help me:
1. Design the integration
2. Create the JSW backend code
3. Add error handling
4. Store results in my database
```

### Template: Report or Analytics
```
I need to build a [report type] report.

What it should show:
- [Data point 1]
- [Data point 2]
- [Data point 3]

Data sources:
- [Collection 1]
- [Collection 2]

Output format: [PDF / Dashboard / Email / etc]

Can you help me query and format this data?
```

---

## Tips for Getting Better Results

1. **Be specific about goals** - "Add login system" vs "Add WIX OAuth authentication for parents"
2. **Share your data structure** - Copy relevant parts of CMS_SCHEMA.txt
3. **Show existing code** - AI learns your patterns better
4. **List constraints** - "Must work with WIX backend", "Must send SMS via Twilio"
5. **Ask for step-by-step** - "First, help me design the database structure"
6. **Reference this file** - "I'm following the patterns in AI_CONTEXT.md"

---

## Questions to Ask AI Directly

Here are good starting prompts:

1. **"Looking at my database schema (in CMS_SCHEMA.txt), how should I structure payments to handle [specific requirement]?"**

2. **"Given that I use WIX JSW for backend and have Twilio for SMS, how would I implement [feature]?"**

3. **"I want to add [feature] but I'm not sure if I should create a new collection or add fields to existing ones. What's the best approach?"**

4. **"Can you explain the data flow for [process] in my system and identify bottlenecks?"**

5. **"I'm getting [error]. Here's my JSW code. What's causing this and how do I fix it?"**

---

## What NOT to Ask AI to Do

- ❌ Rewrite your entire system
- ❌ Build something that duplicates existing functionality
- ❌ Create security vulnerabilities
- ❌ Build features without understanding your data structure
- ✅ **Instead:** Ask for specific features with clear requirements and context

---

**Ready to ask AI for help?** Pick a feature from "In Development" above and follow the format in the examples!
