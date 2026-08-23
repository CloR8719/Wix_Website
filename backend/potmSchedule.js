// =====================================================================
//  potmSchedule.js — when a Player of the Match post goes out
// =====================================================================
//  Managers submit POTM over the weekend. The posts go out spread across
//  Monday rather than all at once, so the club's Facebook page isn't a
//  wall of twelve identical posts at 10am.
//
//  THE RULES (Rob, 2026-08-23):
//    Saturday or Sunday          -> posts Monday
//    Monday before 09:00         -> posts Monday
//    Monday 09:00 - 12:00        -> posts Tuesday
//    anything later              -> NOT SCHEDULED. Tough.
//
//  So the window opens Saturday and shuts at Monday noon. A submission on
//  Wednesday gets nothing rather than rolling to the following Monday - a
//  POTM for last weekend's match appearing eight days later reads as a
//  mistake, and a manager told "scheduled" would reasonably stop chasing it.
//
//  Window is 10:00 to 19:00 UK time.
//
//  ⚠️ SLOT_MINUTES IS 60, NOT THE 45 ROB ASKED FOR, and that is a platform
//  limit rather than a preference. Wix scheduled jobs run at most once an
//  hour, so a slot at 10:45 cannot fire until 11:00 - the spacing would
//  silently drift and the stored time would be a lie. 60 gives ten honest
//  slots (10:00-19:00), which is what the cron can actually honour.
//  If Wix ever allows a sub-hourly job, change this to 45 and the cron to
//  match; nothing else needs touching.
//
//  ⚠️ EVERYTHING HERE IS UK LOCAL TIME, CONVERTED PROPERLY.
//  Wix's backend runs in UTC and the club is on BST for half the year, so
//  "Monday 10am" computed naively is 11am in summer. Every boundary below
//  goes through ukLocalToUtc(), which asks Intl what Europe/London's offset
//  actually is on that date rather than assuming one.
//
//  A plain .js file, not .jsw: pure date arithmetic with no business being
//  callable from a browser.
// =====================================================================

export const WINDOW_START_HOUR = 10;   // first slot, UK local
export const WINDOW_END_HOUR = 19;     // last slot, UK local (inclusive)
export const CUTOFF_HOUR = 9;          // submissions after this move to the next day
export const SLOT_MINUTES = 60;        // see the note above before changing

const MONDAY = 1;

// Submissions between the cutoff and this move to Tuesday; after it, nothing.
export const LAST_CHANCE_HOUR = 12;

// What Europe/London's offset from UTC is at a given instant, in ms.
// Asked rather than assumed - the answer changes twice a year, and on the
// changeover weekends it changes mid-Sunday.
function ukOffsetMs(instant) {
    const dtf = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/London", hour12: false,
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit"
    });
    const p = {};
    dtf.formatToParts(instant).forEach(function (x) { p[x.type] = x.value; });
    // Hour 24 appears at midnight in some ICU versions.
    const hour = p.hour === "24" ? 0 : Number(p.hour);
    const asIfUtc = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day),
                             hour, Number(p.minute), Number(p.second));
    return asIfUtc - instant.getTime();
}

// The UTC instant for a given UK wall-clock time.
//
// Two passes on purpose: the first guess uses the offset at the wrong
// instant, which is off by an hour on the two changeover days a year. Taking
// the offset again at the corrected instant settles it.
export function ukLocalToUtc(year, month, day, hour, minute) {
    const guess = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
    const firstPass = new Date(guess - ukOffsetMs(new Date(guess)));
    return new Date(guess - ukOffsetMs(firstPass));
}

// The UK calendar date and time at a given instant.
export function ukParts(instant) {
    const dtf = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/London", hour12: false, weekday: "short",
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit"
    });
    const p = {};
    dtf.formatToParts(instant).forEach(function (x) { p[x.type] = x.value; });
    const names = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0 };
    return {
        year: Number(p.year), month: Number(p.month), day: Number(p.day),
        hour: p.hour === "24" ? 0 : Number(p.hour), minute: Number(p.minute),
        weekday: names[p.weekday]
    };
}

// How many slots a day holds. 10:00-19:00 at 60 minutes is ten.
export function slotsPerDay() {
    const span = (WINDOW_END_HOUR - WINDOW_START_HOUR) * 60;
    return Math.floor(span / SLOT_MINUTES) + 1;
}

// Which day a submission made NOW belongs to, as a UK calendar date - or
// null when it has missed the boat entirely.
//
// Returns the date parts rather than an instant, because the slot time is
// applied afterwards and doing both at once made the DST handling harder to
// follow than it needed to be.
export function targetDayFor(now) {
    const t = ukParts(now);

    // The weekend, when matches are played and POTM is decided.
    if (t.weekday === 6 || t.weekday === 0) {
        return addDaysUk(t, daysUntil(t.weekday, MONDAY));
    }

    if (t.weekday === MONDAY) {
        // Before the cutoff - goes out today.
        if (t.hour < CUTOFF_HOUR) return { year: t.year, month: t.month, day: t.day };
        // Late, but not too late - tomorrow.
        if (t.hour < LAST_CHANCE_HOUR) return addDaysUk(t, 1);
        return null;
    }

    // ⚠️ Tuesday to Friday get NOTHING, deliberately. The window is a weekly
    // cycle that opens Saturday and shuts Monday noon; rolling a late entry to
    // the following Monday would post a POTM eight days after the match.
    return null;
}

function daysUntil(fromWeekday, toWeekday) {
    const d = (toWeekday - fromWeekday + 7) % 7;
    return d === 0 ? 7 : d;
}

// Adding days to a UK calendar date. Done in UTC at midday so a DST change
// in between cannot push it onto the wrong date - at 00:00 it could.
function addDaysUk(parts, days) {
    const noon = Date.UTC(parts.year, parts.month - 1, parts.day, 12, 0, 0);
    const moved = new Date(noon + days * 86400000);
    return {
        year: moved.getUTCFullYear(),
        month: moved.getUTCMonth() + 1,
        day: moved.getUTCDate()
    };
}

// The nth slot on a given UK date, as a UTC instant. Returns null once the
// day is full - the caller decides what that means.
export function slotInstant(dayParts, index) {
    if (index < 0 || index >= slotsPerDay()) return null;
    const minutesIn = index * SLOT_MINUTES;
    const hour = WINDOW_START_HOUR + Math.floor(minutesIn / 60);
    const minute = minutesIn % 60;
    return ukLocalToUtc(dayParts.year, dayParts.month, dayParts.day, hour, minute);
}

// "Monday at 11am" - what a manager is told when they submit.
export function describeSlot(instant) {
    if (!instant) return "";
    const p = ukParts(instant);
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const h12 = p.hour % 12 === 0 ? 12 : p.hour % 12;
    const suffix = p.hour >= 12 ? "pm" : "am";
    const time = p.minute === 0 ? (h12 + suffix) : (h12 + "." + String(p.minute).padStart(2, "0") + suffix);
    return days[p.weekday] + " at " + time;
}
