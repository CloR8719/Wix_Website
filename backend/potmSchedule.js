// =====================================================================
//  potmSchedule.js — when a Player of the Match post goes out
// =====================================================================
//  Managers submit POTM over the weekend. The posts go out spread across
//  Monday, overflowing into Tuesday, rather than all at once - so the
//  club's Facebook page isn't a wall of twenty identical posts at 8am.
//
//  THE RULES (Rob, 2026-08-23):
//    Saturday or Sunday   -> the next free slot, Monday then Tuesday
//    Monday before 12:00  -> the next free slot that hasn't already passed
//    anything later       -> NOT SCHEDULED. Tough.
//
//  22 teams, realistically 15-16 submitting. 12 slots a day across two
//  days is 24, which carries that with room to spare.
//
//  ⚠️ THE 12:00 STOP IS THE ONLY DAY RULE LEFT. An earlier version also
//  switched days at 09:00, which is now unnecessary: a submission at 10am
//  simply cannot be given the 8am or 9am slots because they are in the
//  past, so it lands on 11am by itself. One rule instead of two, and the
//  awkward case - submitting during the posting window - falls out
//  correctly rather than needing its own branch.
//
//  ⚠️ SLOT_MINUTES IS 60, NOT THE 45 ROB FIRST ASKED FOR, and that is a
//  platform limit rather than a preference. Wix scheduled jobs run at most
//  once an hour, so a slot at 10:45 cannot fire until 11:00 - the spacing
//  would drift and the stored time would be a lie.
//
//  ⚠️ EVERYTHING HERE IS UK LOCAL TIME, CONVERTED PROPERLY.
//  Wix's backend runs in UTC and the club is on BST for half the year, so
//  "Monday 8am" computed naively is 9am in summer. Every boundary goes
//  through ukLocalToUtc(), which asks Intl what Europe/London's offset
//  actually is on that date rather than assuming one.
//
//  A plain .js file, not .jsw: pure date arithmetic with no business being
//  callable from a browser.
// =====================================================================

export const WINDOW_START_HOUR = 8;    // first slot, UK local
export const WINDOW_END_HOUR = 19;     // last slot, UK local (inclusive)
export const SLOT_MINUTES = 60;        // see the note above before changing
export const LAST_CHANCE_HOUR = 12;    // Monday hard stop

const MONDAY = 1;

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

// 08:00 to 19:00 at 60 minutes is twelve.
export function slotsPerDay() {
    const span = (WINDOW_END_HOUR - WINDOW_START_HOUR) * 60;
    return Math.floor(span / SLOT_MINUTES) + 1;
}

// Which days a submission made NOW may be placed on, soonest first.
//
// Returns an array so the caller can walk Monday and then Tuesday looking
// for room, rather than the schedule having to guess in advance which day
// will have space.
export function candidateDays(now) {
    const t = ukParts(now);

    // The weekend, when matches are played and POTM is decided.
    if (t.weekday === 6 || t.weekday === 0) {
        const mon = addDaysUk(t, daysUntil(t.weekday, MONDAY));
        return [mon, addDaysUk(mon, 1)];
    }

    if (t.weekday === MONDAY && t.hour < LAST_CHANCE_HOUR) {
        const mon = { year: t.year, month: t.month, day: t.day };
        return [mon, addDaysUk(mon, 1)];
    }

    // ⚠️ Past Monday noon, and Tuesday to Friday, get NOTHING - deliberately.
    // The window is a weekly cycle that opens Saturday and shuts Monday noon;
    // rolling a late entry onward would post a POTM further and further from
    // the match it was for.
    return [];
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

// The nth slot on a given UK date, as a UTC instant. Null once the day is
// full - the caller moves to the next day.
export function slotInstant(dayParts, index) {
    if (index < 0 || index >= slotsPerDay()) return null;
    const minutesIn = index * SLOT_MINUTES;
    const hour = WINDOW_START_HOUR + Math.floor(minutesIn / 60);
    const minute = minutesIn % 60;
    return ukLocalToUtc(dayParts.year, dayParts.month, dayParts.day, hour, minute);
}

// Every slot across the candidate days, soonest first. The caller filters
// out the ones already taken.
export function allSlots(now) {
    const out = [];
    candidateDays(now).forEach(function (day) {
        for (let i = 0; i < slotsPerDay(); i++) {
            const inst = slotInstant(day, i);
            if (inst) out.push(inst);
        }
    });
    return out;
}

// ⚠️ MATCHED BY THE HOUR, NOT THE EXACT MILLISECOND. A row whose time was
// edited by hand in the CMS - which is how the whole thing gets tested -
// will not land precisely on a computed slot, and an exact comparison would
// happily book a second award into the same hour as it. The job posts one
// per run regardless, so a double booking only ever shows up as a post
// arriving an hour late, which is exactly the sort of thing nobody
// investigates.
export function sameSlot(a, b) {
    if (!a || !b) return false;
    return Math.floor(new Date(a).getTime() / 3600000) ===
           Math.floor(new Date(b).getTime() / 3600000);
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
