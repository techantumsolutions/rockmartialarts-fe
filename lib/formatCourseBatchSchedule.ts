import { formatWeekdayRanges } from "@/lib/formatWeekdayRanges"
import { getFeeForDurationKeys } from "@/lib/registrationPricing"
import type { BranchCoursePricing } from "@/lib/registrationPricing"

export type BatchDurationRef = {
  id?: string
  code?: string
  name?: string
  duration_months?: number
}

export type PublicCourseScheduleEntry = {
  course_id?: string
  courseId?: string
  batches?: Array<Record<string, unknown>>
}

/**
 * Human-readable lines for course batches at an academy (from assignments.course_schedule).
 */
export function formatCourseBatchesForModal(
  courseSchedule: PublicCourseScheduleEntry[] | undefined | null,
  courseId: string
): string {
  if (!courseSchedule?.length || !courseId) return ""
  const entry = courseSchedule.find((c) => {
    const id = String(c.course_id ?? c.courseId ?? "").trim()
    return id === courseId
  })
  const batches = entry?.batches
  if (!Array.isArray(batches) || batches.length === 0) return ""

  const lines: string[] = []
  for (const raw of batches) {
    if (!raw || typeof raw !== "object") continue
    const b = raw as Record<string, unknown>
    const days = Array.isArray(b.days)
      ? b.days.map((d) => String(d))
      : []
    const st = String(
      b.start_time ?? (b.startTime as string | undefined) ?? ""
    ).trim()
    const en = String(
      b.end_time ?? (b.endTime as string | undefined) ?? ""
    ).trim()
    const dayPart = formatWeekdayRanges(days)
    const timePart =
      st && en ? `${st} – ${en}` : st || en
    if (dayPart && timePart) lines.push(`${dayPart}\n${timePart}`)
    else if (dayPart) lines.push(dayPart)
    else if (timePart) lines.push(timePart)
  }
  return lines.join("\n\n")
}

export type ScheduleBatchCard = {
  title: string
  daysLine: string
  timeLine: string
  trainer?: string
  feeLabel: string
  /** Heuristic: batch name/label contains "popular". */
  isPopular?: boolean
}

function _batchFeeFromRaw(raw: Record<string, unknown>): number | null {
  const keys = ["batch_fee", "batchFee", "fee", "price"] as const
  for (const k of keys) {
    const v = raw[k]
    if (v == null) continue
    const n =
      typeof v === "number"
        ? v
        : parseFloat(String(v).replace(/[^\d.-]/g, ""))
    if (!Number.isNaN(n)) return n
  }
  return null
}

function _normalizeFeeMap(raw: unknown): Record<string, string | number | null> | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined
  const out: Record<string, string | number | null> = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (v != null) out[String(k)] = v as string | number
  }
  return Object.keys(out).length ? out : undefined
}

/** Display fee for a batch using fee_per_duration (admin) or legacy batch_fee. */
export function formatBatchFeeLabel(
  raw: Record<string, unknown>,
  availableDurations?: BatchDurationRef[]
): string {
  const fpd = _normalizeFeeMap(raw.fee_per_duration ?? raw.feePerDuration)
  const ptd = _normalizeFeeMap(raw.pricing_type_per_duration ?? raw.pricingTypePerDuration)
  const enabled = raw.enabled_per_duration ?? raw.enabledPerDuration

  if (fpd && Object.keys(fpd).length > 0) {
    const pricing: BranchCoursePricing = {
      fee_per_duration: fpd,
      pricing_type_per_duration: ptd as Record<string, string> | undefined,
    }
    const durs =
      availableDurations?.length
        ? availableDurations
        : Object.keys(fpd).map((k) => ({ id: k, code: k, name: k }))
    const parts: string[] = []
    for (const d of durs) {
      const id = String(d.id || d.code || "").trim()
      if (!id) continue
      if (
        enabled &&
        typeof enabled === "object" &&
        !Array.isArray(enabled) &&
        (enabled as Record<string, boolean>)[id] === false
      ) {
        continue
      }
      const amount = getFeeForDurationKeys(
        pricing,
        id,
        d.code,
        d.duration_months
      )
      if (amount == null) continue
      const label = (d.name || d.code || id).trim()
      parts.push(`₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })} (${label})`)
    }
    if (parts.length) return parts.join(" · ")
  }

  const feeN = _batchFeeFromRaw(raw)
  if (feeN != null) {
    return `₹${feeN.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
  }
  return "Fee on enrollment"
}

/**
 * Structured batch rows for academy course popup / cards (from assignments.course_schedule).
 */
export function courseScheduleBatchCards(
  courseSchedule: PublicCourseScheduleEntry[] | undefined | null,
  courseId: string,
  availableDurations?: BatchDurationRef[]
): ScheduleBatchCard[] {
  if (!courseSchedule?.length || !courseId) return []
  const entry = courseSchedule.find((c) => {
    const id = String(c.course_id ?? c.courseId ?? "").trim()
    return id === courseId
  })
  const batches = entry?.batches
  if (!Array.isArray(batches) || batches.length === 0) return []

  const padStartTime = (t?: string) => {
    const s = (t || "").trim()
    if (!s) return "99:99"
    const [h, m] = s.split(":")
    return `${(h || "99").padStart(2, "0")}:${(m || "99").padStart(2, "0")}`
  }
  const sortedRaw = [...batches].sort((a, b) => {
    if (!a || typeof a !== "object") return 1
    if (!b || typeof b !== "object") return -1
    const ra = a as Record<string, unknown>
    const rb = b as Record<string, unknown>
    const sta = String(ra.start_time ?? ra.startTime ?? "").trim()
    const stb = String(rb.start_time ?? rb.startTime ?? "").trim()
    return padStartTime(sta).localeCompare(padStartTime(stb))
  })

  const cards: ScheduleBatchCard[] = []
  for (const raw of sortedRaw) {
    if (!raw || typeof raw !== "object") continue
    const b = raw as Record<string, unknown>
    const days = Array.isArray(b.days) ? b.days.map((d) => String(d)) : []
    const st = String(
      b.start_time ?? (b.startTime as string | undefined) ?? ""
    ).trim()
    const en = String(
      b.end_time ?? (b.endTime as string | undefined) ?? ""
    ).trim()
    const dayPart = formatWeekdayRanges(days)
    const timePart = st && en ? `${st}–${en}` : st || en
    const bname = String(
      b.batch_name ?? b.name ?? ""
    ).trim()
    const title = bname || "Batch"
    const trainer = String(b.trainer_name ?? b.trainerName ?? "").trim() || undefined
    const feeLabel = formatBatchFeeLabel(b, availableDurations)
    const popular =
      title.toLowerCase().includes("popular") ||
      bname.toLowerCase().includes("popular")
    cards.push({
      title,
      daysLine: dayPart || "Days TBA",
      timeLine: timePart || "Time TBA",
      trainer,
      feeLabel,
      isPopular: popular,
    })
  }
  return cards
}
