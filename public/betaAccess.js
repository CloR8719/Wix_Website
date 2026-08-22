// =====================================================================
//  betaAccess.js — who sees half-finished features on the LIVE site
// =====================================================================
//  Lets an in-progress state ship to production hidden from everyone but
//  the people listed here. That matters because some things genuinely
//  can't be tested any other way: custom elements don't render in the Wix
//  Editor or in Preview at all, and `tel:`/`mailto:` taps and real CMS
//  data volumes only behave honestly on a real handset against the real
//  site. The alternative is publishing a half-built tab to every parent.
//
//  DELIBERATELY SEPARATE from SECRETARY_EMAILS in masterPage.js. That
//  list controls who reaches the admin dashboard - a permanent, role-based
//  thing. This one is "who's testing right now", which changes constantly
//  and should be emptied once a feature ships. Merging them would mean
//  the club secretary silently starts seeing every half-built tab.
//
//  ⚠️ THIS IS COSMETIC, NOT SECURITY. It collapses a button; it does not
//  protect data. Fine for what it's used for - the beta states show the
//  same data the parent can already see elsewhere in the hub. Never use
//  it to gate something a parent shouldn't be able to read: anyone who
//  knows the state name could still reach it. Real restrictions belong in
//  backend code, where the caller can't tamper with them.
// =====================================================================

//  ⚠️ MUST be the WIX MEMBER LOGIN EMAIL for the club site - the address
//  you sign into the Parent Hub with. Not necessarily your everyday email.
//  If the gated feature doesn't appear for you, check this first: a wrong
//  address here fails silently and looks exactly like the feature being
//  broken. Lowercase only; the check lowercases the member's address but
//  not this list.
export const BETA_EMAILS = [
    "robclowes1987@icloud.com"
];

// Takes the member object from currentMember.getMember(). Returns false for
// anything unexpected - null member, missing email, empty list - so the
// failure mode is "nobody sees the beta", never "everybody does".
export function isBetaTester(member) {
    const email = (member && member.loginEmail ? member.loginEmail : "").toLowerCase().trim();
    if (!email) return false;
    return BETA_EMAILS.includes(email);
}
