# Signol Football Club - Full CRM System

A comprehensive football club management system built on WIX, featuring player registration, team management, staff administration, and upcoming payment processing.

## 🎯 What This System Does

**Three Main Portals:**
- 🏆 **Admin Portal** - Full club management (teams, staff, players, reports)
- 👨‍💼 **Manager Portal** - Team management, fixtures, player stats
- 👪 **Parent Portal** - Player registration, payment, communication

**Core Features:**
- ✅ Player registration & onboarding
- ✅ Team management by age group
- ✅ Staff management with qualifications tracking
- ✅ Fixture management (importing from FA website)
- ✅ Automated emails & SMS via Twilio
- ⏳ Payment processing (Stripe - in development)
- ⏳ Admin reports (attendance, finances - in development)

## 📂 Repository Structure

```
Wix_Website/
├── README.md                    # This file
├── backend/                     # WIX backend (JSW files)
│   └── *.jsw                   # Server-side API endpoints & webhooks
├── frontend/                    # WIX frontend pages
│   ├── masterPage.js           # Main page layout
│   ├── Members pages/          # Player registration & profiles
│   ├── Main pages/             # Public-facing pages
│   ├── Dashboard pages/        # Portal dashboards
│   └── Additional pages/       # Extra functionality
├── public/                      # Static assets & custom elements
│   └── custom-elements/        # Custom JS components
├── database/                    # Database schema & structure
│   ├── CMS_SCHEMA.txt          # All tables & fields
│   └── DATABASE_RELATIONSHIPS.md # How tables connect
└── docs/                        # Documentation
    ├── ARCHITECTURE.md         # System design & data flow
    ├── API_REFERENCE.md        # All backend endpoints
    ├── SETUP.md                # Getting started
    └── AI_CONTEXT.md           # For AI development help
```

## 🚀 Getting Started

1. **Understand the Database** → See `database/CMS_SCHEMA.txt`
2. **See the Architecture** → Read `docs/ARCHITECTURE.md`
3. **View API Endpoints** → Check `docs/API_REFERENCE.md`
4. **Ask AI for Help** → Follow `docs/AI_CONTEXT.md`

## 📋 Key Collections (Database Tables)

| Collection | Purpose | Key Fields |
|---|---|---|
| **SignolPlayers** | Player profiles & registration | firstName, lastName, team, DOB, medicalInfo |
| **ParentProfiles** | Parent/guardian information | fullName, email, phone, role |
| **SignolStaff** | Staff members & qualifications | name, role, team, qualifications, DBS expiry |
| **Teams** | Team information by age group | teamName, ageGroup, manager, training location |
| **Fixtures** | Match information | date, homeTeam, awayTeam, venue |
| **PlayerStats** | Season statistics | playerName, team, goals, assists, tackles |
| **PlayerOfTheMatch** | Achievement tracking | playerName, team, reason, season |
| **EmailQueue** | Automated email tracking | parentEmail, registrationLink, sent status |

## 🔄 Data Flow Example: Player Registration

1. Parent fills registration form on **Parent Portal**
2. Data saved to **SignolPlayers** collection
3. Entry added to **EmailQueue** collection
4. Backend sends registration confirmation **email + SMS** (Twilio)
5. Admin sees pending registration in **Admin Portal**
6. Staff assigns player to **Team**
7. Player profile now visible in **Manager Portal**

## 🔐 Security & Configuration

### Environment Variables (Stored in Secrets)
- WIX API keys
- Twilio API keys & phone number
- Stripe keys (in development)
- Email service credentials
- FA website API access (for fixture import)

See `.env.example` for required variables.

## 📝 In Development

- ⏳ **Stripe Payment Processing** - Player fees, kit orders
- ⏳ **FA Fixture Import** - Automated fixture updates from FA website
- ⏳ **Admin Reports** - Attendance tracking, financial reports, player analytics
- ⏳ **SMS Reminders** - Match day notifications via Twilio

## 🤖 Using AI to Extend This System

This repo is structured so AI models can understand your entire system and help you build features.

**To add a new feature:**
1. Read `docs/AI_CONTEXT.md` for how to ask
2. Share what you want to build
3. AI will understand your database, code patterns, and structure
4. AI can suggest implementation with your coding style

**Example requests:**
- "Add Stripe payment endpoint for team fees"
- "Create fixture import from FA website"
- "Build attendance report for coaches"
- "Add player transfer between teams"

## 📚 Documentation

- `docs/ARCHITECTURE.md` - System design and data relationships
- `docs/API_REFERENCE.md` - All backend endpoints and webhooks
- `docs/AI_CONTEXT.md` - Guide for AI-assisted development
- `database/DATABASE_RELATIONSHIPS.md` - How collections connect
- `database/CMS_SCHEMA.txt` - Complete database structure

## 👥 Main Tables & Relationships

```
SignolPlayers ──→ ParentProfiles (primaryParentId, secondaryParentId)
     ↓
   Teams ←── SignolStaff (as manager)
     ↓
  AgeGroup
  
Fixtures → Teams (signol_team)
PlayerStats → SignolPlayers (playerReference)
PlayerOfTheMatch → SignolPlayers (playerReference)
```

## 🛠 Tech Stack

- **Frontend:** WIX (JavaScript)
- **Backend:** WIX Backend (JSW files)
- **Database:** WIX CMS Collections
- **Communication:** Twilio (SMS), Email service
- **Payments:** Stripe (coming soon)
- **Fixtures:** FA Website integration (coming soon)

---

**Ready to build?** Check out `docs/AI_CONTEXT.md` to start asking AI to help expand this system!
