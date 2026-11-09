const months = "January February March April May June July August September October November December".split(" ");

function englishDay(value) {
  const match = /^(\d{1,2}) ([A-Za-z]+) (\d{4})$/.exec(value);
  if (!match) return null;
  const month = months.indexOf(match[2]) + 1;
  if (!month) return null;
  const day = `${match[3]}-${String(month).padStart(2, "0")}-${match[1].padStart(2, "0")}`;
  const parsed = new Date(`${day}T00:00:00Z`);
  return Number.isFinite(+parsed) && parsed.toISOString().slice(0, 10) === day ? day : null;
}

// Only read the curated interval marker, never infer a collapse window from other dates in a note.
export function rainfallChronology(event) {
  const note = event.documentary_notes_en || "";
  const interval = /Documented interval: ([^.–—]+)\s+[–—-]\s+([^\.]+)\./i.exec(note);
  if (interval) {
    const start = englishDay(interval[1].trim());
    const end = englishDay(interval[2].trim());
    if (start && start === event.date && end > start) return { kind: "interval", start, end };
  }
  if (interval || /documented interval:|chronological reference|day-level precision|recorded period:/i.test(`${note} ${event.description || ""}`)) {
    return { kind: "reference", start: event.date, end: event.date };
  }
  return { kind: "day", start: event.date, end: event.date };
}

export function calendarOffset(value, days) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
