# Database Relationships

## Main Tables & How They Connect

### Players (SignolPlayers) → Teams
- Field: `SP_team` (REFERENCE) 
- Points to: `Teams` table
- One player belongs to ONE team

### Players (SignolPlayers) → ClubDictionary
- Field: `SP_status` (REFERENCE) 
- Points to: `ClubDictionary` table
- category column equals status and label column used

### Players (SignolPlayers) → ParentProfiles
- Field: `primaryParentId` (REFERENCE) 
- Points to: `ParentProfiles` table
- Multiple players can belong to one parent

### Players (SignolPlayers) → ClubDictionary
- Field: `SP_emergContactRelationship` (REFERENCE) 
- Points to: `ClubDictionary` table
- category column equals relationship and label column used

### Players (SignolPlayers) → ClubDictionary
- Field: `SP_relationship` (REFERENCE) 
- Points to: `ClubDictionary` table
- category column equals relationship and label column used

### Players (SignolPlayers) → ClubDictionary
- Field: `SP_shirtSize` (REFERENCE) 
- Points to: `ClubDictionary` table
- category column equals shirt_size and label column used

### Players (SignolPlayers) → ClubDictionary
- Field: `SP_shortSize` (REFERENCE) 
- Points to: `ClubDictionary` table
- category column equals shorts_size and label column used

### Players (SignolPlayers) → ClubDictionary
- Field: `SP_socksize` (REFERENCE) 
- Points to: `ClubDictionary` table
- category column equals sock_size and label column used

### Players (SignolPlayers) → ClubDictionary
- Field: `SP_hoodieSize` (REFERENCE) 
- Points to: `ClubDictionary` table
- category column equals hoodie_size and label column used

### Players (SignolPlayers) → ClubDictionary
- Field: `SP_coatSize` (REFERENCE) 
- Points to: `ClubDictionary` table
- category column equals coat_size and label column used

### Players (SignolPlayers) → ParentProfiles
- Field: `secondaryParentId` (REFERENCE) 
- Points to: `ParentProfiles` table
- Multiple players can belong to one secondary parent

### Players (SignolPlayers) → ClubDictionary
- Field: `secondaryParentRelation` (REFERENCE) 
- Points to: `ClubDictionary` table
- category column equals relationship and label column used

### Parents (ParentProfiles) → ClubRoles
- Field: `PP_role` (REFERENCE) 
- Points to: `ClubRoles` table
- each parent is assigned the parent role

### Signol Staff (SignolStaff) → ClubRoles
- Field: `SS_role` (MULTI_REFERENCE)
- Points to: `ClubRoles` table
- each staff can have mulitple roles assigned

### Signol Staff  (SignolStaff) → Teams
- Field: `SS_team` (MULTI_REFERENCE)
- Points to: `Teams` table
- each staff can have mulitple teams assigned

### Signol Staff  (SignolStaff) → Qualifications
- Field: `SS_Qualifications` (MULTI_REFERENCE)
- Points to: `Qualifications` table
- each staff can have mulitple qualifications assigned and the collection includes images as badges

### Teams (Teams) → ClubSponsors
- Field: `teamSponsors` (MULTI_REFERENCE)
- Points to: `ClubSponsors` table
- each team can have multiple sponsors

### Teams (Teams) → AgeGroup
- Field: `AG_ageGroup` (REFERENCE)
- Points to: `AgeGroup` table
- each team is assigned one age group

### Teams (Teams) → SignolStaff
- Field: `T_teamManager` (REFERENCE)
- Points to: `SignolStaff` table
- each team is assigned one team manager

### Player of the match (Playerofthematch) → SignolPlayers
- Field: `playerReference` (REFERENCE)
- Points to: `SignolPlayers` table
- each player of the match is assigned one player

### Player of the match (Playerofthematch) → ClubDictionary
- Field: `season` (REFERENCE)
- Points to: `ClubDictionary` table
- each player of the match is assigned one season

### Player Stats (PlayerStats) → Teams
- Field: `PS_teamName` (REFERENCE)
- Points to: `Teams` table
- each player stats is assigned one team

### Player Stats (PlayerStats) → SignolPlayers
- Field: `playerReference` (REFERENCE)
- Points to: `SignolPlayers` table
- each player stats is assigned one player

### Player Stats (PlayerStats) → ClubDictionary
- Field: `season` (REFERENCE)
- Points to: `ClubDictionary` table
- each player stats is assigned one season

### Team Stats (TeamStats) → Teams
- Field: `TS_teamName` (REFERENCE)
- Points to: `Teams` table
- each team stats is assigned one team