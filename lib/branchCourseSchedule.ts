/** Radix Select value must match a SelectItem — use when no coach is chosen. */
export const BATCH_COACH_UNASSIGNED = "__batch_coach_unassigned__"

export type MasterDuration = {
  id: string
  name?: string
  code?: string
  duration_months?: number
}

/** Resolve a duration-keyed map value (DB may store id, code, or legacy slug). */
export function lookupDurationMapValue<T>(
  map: Record<string, T> | undefined,
  dur: MasterDuration,
  masterDurations: MasterDuration[] = []
): T | undefined {
  if (!map) return undefined
  if (map[dur.id] != null) return map[dur.id]
  if (dur.code && map[dur.code] != null) return map[dur.code]
  for (const [key, value] of Object.entries(map)) {
    if (value == null) continue
    const match = masterDurations.find((d) => d.id === key || d.code === key)
    if (match && match.id === dur.id) return value
  }
  return undefined
}

/** Remap batch fee/pricing maps to master duration ids for edit-form display. */
export function normalizeBatchDurationMaps(
  batch: NormalizedCourseAssignment["batches"][number],
  masterDurations: MasterDuration[]
): NormalizedCourseAssignment["batches"][number] {
  if (!masterDurations.length) return batch

  const feeSrc = batch.fee_per_duration || {}
  const typeSrc = batch.pricing_type_per_duration || {}
  const enabledSrc = batch.enabled_per_duration || {}

  const fee_per_duration: Record<string, string> = {}
  const pricing_type_per_duration: Record<string, string> = {}
  const enabled_per_duration: Record<string, boolean> = {}

  for (const dur of masterDurations) {
    const feeVal = lookupDurationMapValue(feeSrc, dur, masterDurations)
    if (feeVal != null && String(feeVal).trim() !== "") {
      fee_per_duration[dur.id] = String(feeVal)
    }
    const typeVal = lookupDurationMapValue(typeSrc, dur, masterDurations)
    if (typeVal != null && String(typeVal).trim() !== "") {
      pricing_type_per_duration[dur.id] = String(typeVal)
    }
    const enabledVal = lookupDurationMapValue(enabledSrc, dur, masterDurations)
    enabled_per_duration[dur.id] = enabledVal !== false
  }

  return {
    ...batch,
    fee_per_duration: Object.keys(fee_per_duration).length ? fee_per_duration : batch.fee_per_duration,
    pricing_type_per_duration:
      Object.keys(pricing_type_per_duration).length
        ? pricing_type_per_duration
        : batch.pricing_type_per_duration,
    enabled_per_duration:
      Object.keys(enabled_per_duration).length ? enabled_per_duration : batch.enabled_per_duration,
  }
}

export function normalizeAssignmentsCoursesWithDurations(
  courses: NormalizedCourseAssignment[],
  masterDurations: MasterDuration[]
): NormalizedCourseAssignment[] {
  if (!masterDurations.length) return courses
  return courses.map((course) => ({
    ...course,
    batches: course.batches.map((batch) => normalizeBatchDurationMaps(batch, masterDurations)),
  }))
}

export type CoursePricingSource = {
  id: string
  pricing?: {
    fee_per_duration?: Record<string, number | string>
    branch_prices?: Array<{
      branch_id?: string
      fee_per_duration?: Record<string, number | string>
      amount?: number
    }>
  }
}

/** Branch-specific fee_per_duration from course catalog (falls back to course-wide map). */
export function getCourseBranchFeePerDuration(
  course: CoursePricingSource | undefined,
  branchId: string
): Record<string, string> | undefined {
  if (!course?.pricing || !branchId) return undefined
  const branchEntry = course.pricing.branch_prices?.find((bp) => bp.branch_id === branchId)
  const raw = branchEntry?.fee_per_duration ?? course.pricing.fee_per_duration
  if (!raw || typeof raw !== "object") return undefined
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(raw)) {
    if (value != null && String(value).trim() !== "") {
      out[key] = String(value)
    }
  }
  return Object.keys(out).length ? out : undefined
}

function defaultPricingTypeForDuration(dur: MasterDuration): string {
  return (dur.duration_months ?? 1) <= 1 ? "flat" : "monthly"
}

function batchHasExplicitDurationFees(
  batch: NormalizedCourseAssignment["batches"][number]
): boolean {
  const fpd = batch.fee_per_duration
  if (!fpd) return false
  return Object.values(fpd).some((v) => v != null && String(v).trim() !== "")
}

/** Fill fee_per_duration from legacy batch_fee or course branch pricing when missing. */
export function hydrateBatchDurationPricing(
  batch: NormalizedCourseAssignment["batches"][number],
  masterDurations: MasterDuration[],
  courseFeePerDuration?: Record<string, string>
): NormalizedCourseAssignment["batches"][number] {
  const normalized = normalizeBatchDurationMaps(batch, masterDurations)
  if (batchHasExplicitDurationFees(normalized) || !masterDurations.length) {
    return normalized
  }

  const fee_per_duration: Record<string, string> = { ...(normalized.fee_per_duration || {}) }
  const pricing_type_per_duration: Record<string, string> = {
    ...(normalized.pricing_type_per_duration || {}),
  }
  const enabled_per_duration: Record<string, boolean> = {
    ...(normalized.enabled_per_duration || {}),
  }

  const legacyBatchFee =
    normalized.batch_fee != null && String(normalized.batch_fee).trim() !== ""
      ? String(normalized.batch_fee).trim()
      : ""

  const applyFee = (dur: MasterDuration, fee: string) => {
    fee_per_duration[dur.id] = fee
    if (!pricing_type_per_duration[dur.id]) {
      pricing_type_per_duration[dur.id] = defaultPricingTypeForDuration(dur)
    }
    if (enabled_per_duration[dur.id] === undefined) {
      enabled_per_duration[dur.id] = true
    }
  }

  if (legacyBatchFee) {
    for (const dur of masterDurations) {
      applyFee(dur, legacyBatchFee)
    }
  } else if (courseFeePerDuration) {
    for (const dur of masterDurations) {
      const feeVal = lookupDurationMapValue(courseFeePerDuration, dur, masterDurations)
      if (feeVal != null && String(feeVal).trim() !== "") {
        applyFee(dur, String(feeVal))
      }
    }
  }

  if (!Object.keys(fee_per_duration).length) {
    return normalized
  }

  return {
    ...normalized,
    fee_per_duration,
    pricing_type_per_duration: Object.keys(pricing_type_per_duration).length
      ? pricing_type_per_duration
      : normalized.pricing_type_per_duration,
    enabled_per_duration: Object.keys(enabled_per_duration).length
      ? enabled_per_duration
      : normalized.enabled_per_duration,
  }
}

/** Normalize duration keys and hydrate pricing from DB (batch_fee / course branch fees). */
export function enrichAssignmentsCoursesWithDurationPricing(
  courses: NormalizedCourseAssignment[],
  masterDurations: MasterDuration[],
  courseCatalog: CoursePricingSource[],
  branchId: string
): NormalizedCourseAssignment[] {
  if (!masterDurations.length) return courses
  const catalogById = new Map(courseCatalog.map((c) => [c.id, c]))
  return courses.map((assignment) => {
    const courseDef = catalogById.get(assignment.course_id)
    const branchFpd = getCourseBranchFeePerDuration(courseDef, branchId)
    return {
      ...assignment,
      batches: assignment.batches.map((batch) =>
        hydrateBatchDurationPricing(batch, masterDurations, branchFpd)
      ),
    }
  })
}

export interface NormalizedCourseAssignment {
  course_id: string
  batches: {
    id: string
    start_time: string
    end_time: string
    coach_id: string
    days: string[]
    /** Optional per-batch course fee (legacy single fee) */
    batch_fee?: string
    /** Optional label e.g. Morning batch */
    batch_name?: string
    /** Per-duration pricing: { duration_id: fee_amount_string } */
    fee_per_duration?: Record<string, string>
    /** Per-duration pricing type: { duration_id: "monthly" | "flat" } */
    pricing_type_per_duration?: Record<string, string>
    /** Per-duration availability: { duration_id: boolean } */
    enabled_per_duration?: Record<string, boolean>
  }[]
}

/**
 * Build edit-form course rows from API assignments (supports course_schedule + legacy courses: string[]).
 */
export function normalizeAssignmentsCourses(
  assignments: { courses?: unknown; course_schedule?: unknown } | null | undefined
): NormalizedCourseAssignment[] {
  const sched = assignments?.course_schedule
  if (Array.isArray(sched) && sched.length > 0) {
    return sched
      .map((c: Record<string, unknown> & { course_id?: string; batches?: unknown[] }) => {
        const course_id = String(
          c.course_id ?? (c as { courseId?: unknown }).courseId ?? ""
        )
        return {
          course_id,
          batches: (Array.isArray(c.batches) ? c.batches : []).map(
            (b: Record<string, unknown>, i: number) => {
              const start =
                b.start_time ?? (b as { startTime?: unknown }).startTime
              const end = b.end_time ?? (b as { endTime?: unknown }).endTime
              const coach = b.coach_id ?? (b as { coachId?: unknown }).coachId
              const rawFee =
                b.batch_fee ??
                (b as { batchFee?: unknown }).batchFee ??
                (b as { fee?: unknown }).fee ??
                (b as { price?: unknown }).price
              let batch_fee: string | undefined
              if (rawFee != null && String(rawFee).trim() !== "") {
                batch_fee = String(rawFee)
              }
              const nm = b.batch_name ?? (b as { name?: unknown }).name
              const batch_name =
                nm != null && String(nm).trim() !== "" ? String(nm).trim() : undefined
              // Parse per-duration fees
              const rawFpd = b.fee_per_duration ?? (b as { feePerDuration?: unknown }).feePerDuration
              let fee_per_duration: Record<string, string> | undefined
              if (rawFpd && typeof rawFpd === "object" && !Array.isArray(rawFpd)) {
                fee_per_duration = {}
                for (const [k, v] of Object.entries(rawFpd as Record<string, unknown>)) {
                  if (v != null) fee_per_duration[k] = String(v)
                }
              }
              // Parse pricing type per duration
              const rawPt = b.pricing_type_per_duration ?? (b as { pricingTypePerDuration?: unknown }).pricingTypePerDuration
              let pricing_type_per_duration: Record<string, string> | undefined
              if (rawPt && typeof rawPt === "object" && !Array.isArray(rawPt)) {
                pricing_type_per_duration = {}
                for (const [k, v] of Object.entries(rawPt as Record<string, unknown>)) {
                  if (v != null) pricing_type_per_duration[k] = String(v)
                }
              }
              // Parse enabled map per duration
              const rawEnabled =
                b.enabled_per_duration ??
                (b as { enabledPerDuration?: unknown }).enabledPerDuration
              let enabled_per_duration: Record<string, boolean> | undefined
              if (rawEnabled && typeof rawEnabled === "object" && !Array.isArray(rawEnabled)) {
                enabled_per_duration = {}
                for (const [k, v] of Object.entries(rawEnabled as Record<string, unknown>)) {
                  enabled_per_duration[k] = v !== false
                }
              }
              return {
                id:
                  typeof b.id === "string" && b.id
                    ? b.id
                    : (typeof b.batch_id === "string" && b.batch_id
                        ? b.batch_id
                        : `batch-${course_id || "c"}-${i}`),
                start_time: String(start ?? ""),
                end_time: String(end ?? ""),
                coach_id: String(coach ?? ""),
                days: Array.isArray(b.days)
                  ? b.days.map((d) => String(d))
                  : [],
                batch_fee,
                batch_name,
                fee_per_duration,
                pricing_type_per_duration,
                enabled_per_duration,
              }
            }
          ),
        }
      })
      .filter((row) => row.course_id.length > 0)
  }

  const raw = assignments?.courses
  if (!Array.isArray(raw)) return []

  const fromStrings = raw
    .filter((id): id is string => typeof id === "string" && id.length > 0)
    .map((course_id) => ({
      course_id,
      batches: [
        {
          id: `batch-${course_id}-0`,
          start_time: "",
          end_time: "",
          coach_id: "",
          days: [] as string[],
          batch_fee: "",
          batch_name: "",
          fee_per_duration: undefined as Record<string, string> | undefined,
          pricing_type_per_duration: undefined as Record<string, string> | undefined,
          enabled_per_duration: undefined as Record<string, boolean> | undefined,
        },
      ],
    }))

  if (fromStrings.length > 0) return fromStrings

  return (raw as { course_id?: string }[])
    .filter((x) => x && typeof x.course_id === "string")
    .map((x) => ({
      course_id: x.course_id!,
      batches: [
        {
          id: `batch-${x.course_id}-0`,
          start_time: "",
          end_time: "",
          coach_id: "",
          days: [] as string[],
          batch_fee: "",
          batch_name: "",
        },
      ],
    }))
}

function _batchFeeForPayload(raw: string | undefined): number | undefined {
  if (raw == null || !String(raw).trim()) return undefined
  const n = parseFloat(String(raw).replace(/[^\d.-]/g, ""))
  return Number.isNaN(n) ? undefined : n
}

export function buildCourseSchedulePayload(
  courses: NormalizedCourseAssignment[]
): {
  course_id: string
  batches: {
    batch_id: string
    start_time: string
    end_time: string
    coach_id: string
    days: string[]
    batch_fee?: number
    batch_name?: string
    fee_per_duration?: Record<string, number>
    pricing_type_per_duration?: Record<string, string>
    enabled_per_duration?: Record<string, boolean>
  }[]
}[] {
  return courses.map((c) => ({
    course_id: c.course_id,
    batches: c.batches.map((b) => {
      const fee = _batchFeeForPayload(b.batch_fee)
      const row: {
        batch_id: string
        start_time: string
        end_time: string
        coach_id: string
        days: string[]
        batch_fee?: number
        batch_name?: string
        fee_per_duration?: Record<string, number>
        pricing_type_per_duration?: Record<string, string>
        enabled_per_duration?: Record<string, boolean>
      } = {
        batch_id: b.id,
        start_time: b.start_time,
        end_time: b.end_time,
        coach_id: b.coach_id,
        days: [...(b.days || [])],
      }
      if (fee !== undefined) row.batch_fee = fee
      const bn = (b.batch_name || "").trim()
      if (bn) row.batch_name = bn
      // Per-duration fees
      if (b.fee_per_duration && Object.keys(b.fee_per_duration).length > 0) {
        const fpd: Record<string, number> = {}
        for (const [k, v] of Object.entries(b.fee_per_duration)) {
          const n = parseFloat(String(v))
          if (!Number.isNaN(n) && n > 0) fpd[k] = n
        }
        if (Object.keys(fpd).length > 0) row.fee_per_duration = fpd
      }
      // Pricing type per duration
      if (b.pricing_type_per_duration && Object.keys(b.pricing_type_per_duration).length > 0) {
        const pt: Record<string, string> = {}
        for (const [k, v] of Object.entries(b.pricing_type_per_duration)) {
          if (v === "monthly" || v === "flat") pt[k] = v
        }
        if (Object.keys(pt).length > 0) row.pricing_type_per_duration = pt
      }
      // Per-duration enabled flags
      if (b.enabled_per_duration && Object.keys(b.enabled_per_duration).length > 0) {
        const em: Record<string, boolean> = {}
        for (const [k, v] of Object.entries(b.enabled_per_duration)) {
          em[k] = v !== false
        }
        if (Object.keys(em).length > 0) row.enabled_per_duration = em
      }
      return row
    }),
  }))
}
