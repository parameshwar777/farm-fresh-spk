/**
 * Delivery slot generator based on order placement time.
 *
 * Rules (provided by business):
 *  - Order between yesterday 6pm and today 9am  -> today 10am-12pm, 3pm-5pm, 7pm-8:30pm
 *  - Order between today 9am and 2pm            -> today 3pm-5pm, 7pm-8:30pm, next day 10am-12pm
 *  - Order between today 2pm and 6pm            -> today 7pm-8:30pm, next day 10am-12pm, next day 3pm-5pm
 *  - Order after today 6pm (until next 9am)     -> next day 10am-12pm, 3pm-5pm, 7pm-8:30pm
 *
 * We generate slots client-side so the UI always matches the order time
 * regardless of whether admins seeded any rows in the DB.
 */

export type GeneratedSlot = {
  /** Stable id we generate from date + window */
  id: string;
  label: string;
  date: string; // yyyy-mm-dd
  startsAtIso: string; // ISO timestamp for the slot start
};

type Window = "morning" | "afternoon" | "evening";

const WINDOWS: Record<Window, { label: string; startHour: number; startMin: number }> = {
  morning: { label: "10:00 AM – 12:00 PM", startHour: 10, startMin: 0 },
  afternoon: { label: "3:00 PM – 5:00 PM", startHour: 15, startMin: 0 },
  evening: { label: "7:00 PM – 8:30 PM", startHour: 19, startMin: 0 },
};

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function pretty(d: Date, todayKey: string, tomorrowKey: string): string {
  const k = dateKey(d);
  if (k === todayKey) return "Today";
  if (k === tomorrowKey) return "Tomorrow";
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

function makeSlot(day: Date, w: Window, todayKey: string, tomorrowKey: string): GeneratedSlot {
  const win = WINDOWS[w];
  const start = new Date(day);
  start.setHours(win.startHour, win.startMin, 0, 0);
  const date = dateKey(start);
  return {
    id: `${date}__${w}`,
    label: `${pretty(day, todayKey, tomorrowKey)} · ${win.label}`,
    date,
    startsAtIso: start.toISOString(),
  };
}

export function getAvailableSlots(now: Date = new Date()): GeneratedSlot[] {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(today);
  dayAfter.setDate(dayAfter.getDate() + 2);

  const todayKey = dateKey(today);
  const tomorrowKey = dateKey(tomorrow);

  const hour = now.getHours();
  const minutes = now.getMinutes();
  const hm = hour + minutes / 60;

  let plan: Array<{ day: Date; w: Window }>;
  if (hm < 9) {
    // before 9am — count as "yesterday 6pm to today 9am" window
    plan = [
      { day: today, w: "morning" },
      { day: today, w: "afternoon" },
      { day: today, w: "evening" },
    ];
  } else if (hm < 14) {
    // 9am – 2pm
    plan = [
      { day: today, w: "afternoon" },
      { day: today, w: "evening" },
      { day: tomorrow, w: "morning" },
    ];
  } else if (hm < 18) {
    // 2pm – 6pm
    plan = [
      { day: today, w: "evening" },
      { day: tomorrow, w: "morning" },
      { day: tomorrow, w: "afternoon" },
    ];
  } else {
    // after 6pm
    plan = [
      { day: tomorrow, w: "morning" },
      { day: tomorrow, w: "afternoon" },
      { day: tomorrow, w: "evening" },
    ];
  }

  return plan.map((p) => makeSlot(p.day, p.w, todayKey, tomorrowKey));
}
