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

/** Monday-first index for grouping consecutive ranges (e.g. Mon - Sat). */
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
 * e.g. [0,1,2,3,4,5] -> "Mon - Sat"
 * e.g. [0,2,4] -> "Mon, Wed, Fri"
 * e.g. [0,1,2,4,5] -> "Mon - Wed, Fri - Sat"
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
          : `${SHORT_DAYS[runStart]!} - ${SHORT_DAYS[runEnd]!}`
      )
      runStart = runEnd = cur
    }
  }

  parts.push(
    runStart === runEnd
      ? SHORT_DAYS[runStart]!
      : `${SHORT_DAYS[runStart]!} - ${SHORT_DAYS[runEnd]!}`
  )

  return parts.join(", ")
}

/**
 * Collapse selected weekdays into readable ranges with abbreviated day names:
 * e.g. ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] -> "Mon - Sat"
 * e.g. ["Monday", "Wednesday", "Friday"] -> "Mon, Wed, Fri"
 * e.g. ["Monday", "Tuesday", "Wednesday", "Friday", "Saturday"] -> "Mon - Wed, Fri - Sat"
 */
export function formatWeekdayRanges(selectedDays: string[]): string {
  if (!Array.isArray(selectedDays) || selectedDays.length === 0) return ""
  const indices = selectedDays.map(dayToMonFirstIndex).filter((i) => i >= 0)
  if (indices.length === 0) {
    return selectedDays.filter(Boolean).join(", ")
  }
  return formatWeekdayIndices(indices)
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

  // Case 1: Dot separator, e.g. "Monday, Tuesday, Wednesday, Thursday, Friday, Saturday · 6:00 AM - 7:00 AM"
  if (trimmed.includes("·")) {
    const [daysPart, ...rest] = trimmed.split(/\s*·\s*/)
    if (hasAnyDayWord(daysPart)) {
      const formattedDays = formatDaysChunk(daysPart)
      return `${formattedDays} · ${rest.join(" · ").trim()}`
    }
    return trimmed
  }

  // Case 2: Colon separator, e.g. "Monday: 6:00 AM - 8:00 PM"
  const colonMatch = trimmed.match(/^([^:0-9]+):\s*(.*)$/)
  if (colonMatch && hasAnyDayWord(colonMatch[1])) {
    const formattedDays = formatDaysChunk(colonMatch[1])
    return `${formattedDays}: ${colonMatch[2].trim()}`
  }

  // Case 3: Days followed by a time range, e.g. "Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, 6:00 AM - 7:00 AM"
  const timeMatch = trimmed.match(
    /^(.*?)[\s,]+(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)?\s*(?:-|–|—|to)\s*\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)?.*)$/i
  )
  if (timeMatch && hasAnyDayWord(timeMatch[1])) {
    const formattedDays = formatDaysChunk(timeMatch[1])
    return `${formattedDays} · ${timeMatch[2].trim()}`
  }

  // Case 4: Segment is solely day names or contains day names without time
  if (hasAnyDayWord(trimmed)) {
    return formatDaysChunk(trimmed)
  }

  return trimmed
}

/**
 * Formats any timing string across all screens:
 * - Abbreviations: Monday -> Mon, Tuesday -> Tue, ...
 * - Consecutive day sequences collapse: "Mon - Sat", "Mon - Fri"
 * - Breakers preserved: "Mon, Wed, Fri", "Mon - Wed, Fri - Sat"
 * - Retains time suffixes, pipe separators (|), and bullet separators.
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
