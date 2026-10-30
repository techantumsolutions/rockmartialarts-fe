/** Checkbox order (Sunday first). Values stored are full English names. */
export const WEEKDAY_CHECKLIST_ORDER = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const

/** Monday-first index for grouping consecutive ranges (e.g. Mon–Sat). */
export const MON_FIRST = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const

/** 3-letter abbreviated day names starting Monday. */
export const SHORT_DAYS = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
] as const

const DAY_ALIAS_MAP: Record<string, number> = {
  mon: 0,
  monday: 0,
  mondays: 0,
  tue: 1,
  tues: 1,
  tuesday: 1,
  tuesdays: 1,
  wed: 2,
  wednesday: 2,
  wednesdays: 2,
  thu: 3,
  thur: 3,
  thurs: 3,
  thursday: 3,
  thursdays: 3,
  fri: 4,
  friday: 4,
  fridays: 4,
  sat: 5,
  saturday: 5,
  saturdays: 5,
  sun: 6,
  sunday: 6,
  sundays: 6,
}

export function dayToMonFirstIndex(day: string): number {
  if (!day || typeof day !== "string") return -1
  const n = day.trim().toLowerCase()
  if (n in DAY_ALIAS_MAP) {
    return DAY_ALIAS_MAP[n]
  }
  return MON_FIRST.findIndex((d) => d.toLowerCase() === n)
}

export function abbreviateDayName(day: string): string {
  const idx = dayToMonFirstIndex(day)
  return idx >= 0 ? SHORT_DAYS[idx] : day.trim()
}

/**
 * Format an array of Monday-first day indices (0=Mon .. 6=Sun) into collapsed ranges:
 * e.g. [0,1,2,3,4] -> "Mon–Fri"
 * e.g. [1,5] -> "Tue, Sat"
 * e.g. [0,1,2,3,4,5] -> "Mon–Sat"
 * e.g. [0,2,4] -> "Mon, Wed, Fri"
 * e.g. [0,1,2,4,5] -> "Mon–Wed, Fri–Sat"
 */
export function formatWeekdayIndices(indices: number[]): string {
  const unique = Array.from(
    new Set(indices.filter((i) => typeof i === "number" && i >= 0 && i <= 6))
  ).sort((a, b) => a - b)

  if (unique.length === 0) return ""

  const parts: string[] = []
  let runStart = unique[0]
  let runEnd = unique[0]

  for (let i = 1; i < unique.length; i++) {
    const cur = unique[i]
    if (cur === runEnd + 1) {
      runEnd = cur
    } else {
      parts.push(
        runStart === runEnd
          ? SHORT_DAYS[runStart]!
          : `${SHORT_DAYS[runStart]!}–${SHORT_DAYS[runEnd]!}`
      )
      runStart = runEnd = cur
    }
  }

  parts.push(
    runStart === runEnd
      ? SHORT_DAYS[runStart]!
      : `${SHORT_DAYS[runStart]!}–${SHORT_DAYS[runEnd]!}`
  )

  return parts.join(", ")
}

/**
 * Collapse selected weekdays into readable ranges with abbreviated day names:
 * e.g. ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] -> "Mon–Fri"
 * e.g. ["Tuesday", "Saturday"] -> "Tue, Sat"
 */
export function formatWeekdayRanges(selectedDays: string[]): string {
  if (!Array.isArray(selectedDays) || selectedDays.length === 0) return ""
  const indices = selectedDays.map(dayToMonFirstIndex).filter((i) => i >= 0)
  if (indices.length === 0) {
    return selectedDays.filter(Boolean).join(", ")
  }
  return formatWeekdayIndices(indices)
}

/**
 * Format single time token into "HH:MM AM/PM" (2-digit hour with uppercase AM/PM)
 * e.g. "06:00" -> "06:00 AM", "6:00" -> "06:00 AM", "18:30" -> "06:30 PM", "6:00 AM" -> "06:00 AM"
 */
export function formatTimeWithAmPm(timeStr: string): string {
  if (!timeStr || typeof timeStr !== "string") return ""
  const trimmed = timeStr.trim()
  if (!trimmed) return ""

  // Case 1: Already has AM/PM, e.g. "6:00 AM", "06:00 AM", "6:00am", "6 AM"
  const match12h = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM|am|pm)$/i)
  if (match12h) {
    const h = parseInt(match12h[1], 10)
    const m = match12h[2] || "00"
    const p = match12h[3].toUpperCase()
    return `${h.toString().padStart(2, "0")}:${m} ${p}`
  }

  // Case 2: 24h format, e.g. "06:00", "6:00", "18:30", "18:00:00"
  const match24h = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/)
  if (match24h) {
    const h = parseInt(match24h[1], 10)
    const m = match24h[2]
    const p = h < 12 ? "AM" : "PM"
    let h12 = h % 12
    if (h12 === 0) h12 = 12
    return `${h12.toString().padStart(2, "0")}:${m} ${p}`
  }

  return trimmed
}

/**
 * Format time range into "06:00 AM–07:00 AM"
 */
export function formatTimeRangeWithAmPm(rangeStr: string): string {
  if (!rangeStr || typeof rangeStr !== "string") return ""
  const trimmed = rangeStr.trim()
  if (!trimmed) return ""

  // Match: <time1> [-–— to] <time2>
  const match = trimmed.match(/^(.+?)\s*(?:[-–—]|to)\s*(.+?)$/i)
  if (match) {
    const startFormatted = formatTimeWithAmPm(match[1])
    const endFormatted = formatTimeWithAmPm(match[2])
    if (startFormatted && endFormatted) {
      return `${startFormatted}–${endFormatted}`
    }
  }

  const single = formatTimeWithAmPm(trimmed)
  return single || trimmed
}

const DAY_PATTERN =
  "Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tues?|Wed|Thurs?|Fri|Sat|Sun"
const RANGE_REGEX = new RegExp(
  `\\b(${DAY_PATTERN})s?\\s*(?:to|–|—|-)\\s*(${DAY_PATTERN})s?\\b`,
  "gi"
)
const SINGLE_DAY_REGEX = new RegExp(`\\b(${DAY_PATTERN})s?\\b`, "gi")

function hasAnyDayWord(text: string): boolean {
  return new RegExp(`\\b(${DAY_PATTERN})s?\\b`, "i").test(text)
}

/**
 * Extracts day indices from a text chunk and formats them into abbreviated ranges.
 */
function formatDaysChunk(chunk: string): string {
  if (!chunk || typeof chunk !== "string") return ""
  const indices: number[] = []

  let rangeMatch: RegExpExecArray | null
  RANGE_REGEX.lastIndex = 0
  while ((rangeMatch = RANGE_REGEX.exec(chunk)) !== null) {
    const startIdx = dayToMonFirstIndex(rangeMatch[1])
    const endIdx = dayToMonFirstIndex(rangeMatch[2])
    if (startIdx >= 0 && endIdx >= 0) {
      if (startIdx <= endIdx) {
        for (let i = startIdx; i <= endIdx; i++) indices.push(i)
      } else {
        for (let i = startIdx; i <= 6; i++) indices.push(i)
        for (let i = 0; i <= endIdx; i++) indices.push(i)
      }
    }
  }

  const withoutRanges = chunk.replace(RANGE_REGEX, " ")
  let singleMatch: RegExpExecArray | null
  SINGLE_DAY_REGEX.lastIndex = 0
  while ((singleMatch = SINGLE_DAY_REGEX.exec(withoutRanges)) !== null) {
    const idx = dayToMonFirstIndex(singleMatch[1])
    if (idx >= 0) {
      indices.push(idx)
    }
  }

  if (indices.length === 0) return chunk.trim()
  return formatWeekdayIndices(indices)
}

function formatSingleTimingSegment(segment: string): string {
  const trimmed = segment.trim()
  if (!trimmed) return ""

  // Case 1: Dot separator, e.g. "Mon–Fri · 06:00 AM–07:00 AM" or "Monday to Friday · 6:00 - 7:00"
  if (trimmed.includes("·")) {
    const [daysPart, ...rest] = trimmed.split(/\s*·\s*/)
    const timePartRaw = rest.join(" · ").trim()
    const formattedDays = hasAnyDayWord(daysPart) ? formatDaysChunk(daysPart) : daysPart.trim()
    const formattedTime = timePartRaw ? formatTimeRangeWithAmPm(timePartRaw) : ""
    if (formattedDays && formattedTime) return `${formattedDays} · ${formattedTime}`
    return formattedDays || formattedTime || trimmed
  }

  // Case 2: Colon separator, e.g. "Mon: 06:00 - 08:00"
  const colonMatch = trimmed.match(/^([^:0-9]+):\s*(.*)$/)
  if (colonMatch && hasAnyDayWord(colonMatch[1])) {
    const formattedDays = formatDaysChunk(colonMatch[1])
    const formattedTime = formatTimeRangeWithAmPm(colonMatch[2].trim())
    return `${formattedDays}: ${formattedTime}`
  }

  // Case 3: Days followed by a time range, e.g. "Monday to Friday, 6:00 - 7:00"
  const timeMatch = trimmed.match(
    /^(.*?)[\s,]+(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)?\s*(?:-|–|—|to)\s*\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)?.*)$/i
  )
  if (timeMatch && hasAnyDayWord(timeMatch[1])) {
    const formattedDays = formatDaysChunk(timeMatch[1])
    const formattedTime = formatTimeRangeWithAmPm(timeMatch[2].trim())
    return `${formattedDays} · ${formattedTime}`
  }

  // Case 4: Segment is solely day names or contains day names without time
  if (hasAnyDayWord(trimmed)) {
    return formatDaysChunk(trimmed)
  }

  // Case 5: Standalone time range
  return formatTimeRangeWithAmPm(trimmed)
}

/**
 * Formats any timing string across all screens:
 * - Abbreviations: Monday -> Mon, Tuesday -> Tue, ...
 * - Consecutive day sequences collapse: "Mon–Sat", "Mon–Fri"
 * - Breakers preserved: "Mon, Wed, Fri", "Tue, Sat", "Mon–Wed, Fri–Sat"
 * - Every time has AM/PM with 2-digit hours: "06:00 AM–07:00 AM"
 * - Retains multiple batches separated by pipe (|).
 */
export function formatTimingString(timings: string | undefined | null): string {
  if (!timings || typeof timings !== "string") return ""
  const trimmed = timings.trim()
  if (!trimmed || trimmed === "—" || trimmed === "-") return trimmed

  if (trimmed.includes("|")) {
    return trimmed
      .split(/\s*\|\s*/)
      .map(formatSingleTimingSegment)
      .join(" | ")
  }

  return formatSingleTimingSegment(trimmed)
}
