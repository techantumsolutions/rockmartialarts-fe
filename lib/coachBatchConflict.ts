import { getBackendApiUrl } from "@/lib/config"

export interface AssignedBatchInfo {
  id: string
  batch_name: string
  course_name: string
  branch_name: string
  days: string[] // e.g. ["Sunday", "Monday", "Tuesday"]
  start_time: string // e.g. "12:39"
  end_time: string // e.g. "14:41"
}

export interface SlotLike {
  weekday?: string
  start_time?: string
  end_time?: string
}

const WEEKDAY_CANONICAL: Record<string, string> = {
  monday: "monday",
  mon: "monday",
  tuesday: "tuesday",
  tue: "tuesday",
  tues: "tuesday",
  wednesday: "wednesday",
  wed: "wednesday",
  thursday: "thursday",
  thu: "thursday",
  thur: "thursday",
  thurs: "thursday",
  friday: "friday",
  fri: "friday",
  saturday: "saturday",
  sat: "saturday",
  sunday: "sunday",
  sun: "sunday",
}

export function normalizeWeekday(dayStr?: string): string {
  if (!dayStr) return ""
  const clean = dayStr.trim().toLowerCase()
  return WEEKDAY_CANONICAL[clean] || clean
}

export function timeToMinutes(timeStr?: string): number | null {
  if (!timeStr) return null
  const str = timeStr.trim().toLowerCase()
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?$/.exec(str)
  if (!match) return null

  let hours = parseInt(match[1], 10)
  const minutes = parseInt(match[2], 10)
  const ampm = match[3]

  if (ampm === "pm" && hours < 12) hours += 12
  if (ampm === "am" && hours === 12) hours = 0

  return hours * 60 + minutes
}

/**
 * Checks whether a single assigned batch is fully covered by a set of availability slots.
 * For every day in batch.days, there must be at least one slot covering the batch's time range.
 */
export function isBatchCoveredBySlots(batch: AssignedBatchInfo, slots: SlotLike[]): boolean {
  const bStart = timeToMinutes(batch.start_time)
  const bEnd = timeToMinutes(batch.end_time)

  if (bStart === null || bEnd === null || bEnd <= bStart) {
    // Incomplete batch times do not trigger strict blocking
    return true
  }

  const batchDays = (batch.days || []).map(normalizeWeekday).filter(Boolean)
  if (batchDays.length === 0) return true

  for (const day of batchDays) {
    const coversDay = slots.some((slot) => {
      const slotDay = normalizeWeekday(slot.weekday)
      if (slotDay !== day) return false

      const sStart = timeToMinutes(slot.start_time)
      const sEnd = timeToMinutes(slot.end_time)
      if (sStart === null || sEnd === null) return false

      return sStart <= bStart && sEnd >= bEnd
    })

    if (!coversDay) {
      return false
    }
  }

  return true
}

/**
 * Returns the first assigned batch that is NOT covered by the given slots, or null if all are covered.
 */
export function getBatchConflictForSlots(
  batches: AssignedBatchInfo[],
  slots: SlotLike[]
): AssignedBatchInfo | null {
  for (const batch of batches) {
    if (!isBatchCoveredBySlots(batch, slots)) {
      return batch
    }
  }
  return null
}

/**
 * Verifies if removing a slot at slotIndex would leave any assigned batch uncovered.
 */
export function checkSlotDeletionConflict(
  slotIndex: number,
  currentSlots: SlotLike[],
  assignedBatches: AssignedBatchInfo[]
): { canDelete: boolean; conflictingBatch?: AssignedBatchInfo } {
  if (!assignedBatches || assignedBatches.length === 0) {
    return { canDelete: true }
  }

  const remainingSlots = currentSlots.filter((_, idx) => idx !== slotIndex)
  const conflict = getBatchConflictForSlots(assignedBatches, remainingSlots)

  if (conflict) {
    return {
      canDelete: false,
      conflictingBatch: conflict,
    }
  }

  return { canDelete: true }
}

/**
 * Returns all assigned batches that this specific slot is actively covering.
 */
export function getBatchesCoveredBySlot(
  slot: SlotLike,
  assignedBatches: AssignedBatchInfo[]
): AssignedBatchInfo[] {
  if (!assignedBatches || assignedBatches.length === 0) return []

  const slotDay = normalizeWeekday(slot.weekday)
  const sStart = timeToMinutes(slot.start_time)
  const sEnd = timeToMinutes(slot.end_time)
  if (!slotDay || sStart === null || sEnd === null) return []

  return assignedBatches.filter((b) => {
    const bStart = timeToMinutes(b.start_time)
    const bEnd = timeToMinutes(b.end_time)
    if (bStart === null || bEnd === null) return false

    const hasDay = (b.days || []).map(normalizeWeekday).includes(slotDay)
    if (!hasDay) return false

    return sStart <= bStart && sEnd >= bEnd
  })
}

/**
 * Fetches all courses and assigned batches for a given coach from the API.
 */
export async function fetchCoachAssignedBatches(
  coachId: string | undefined,
  token: string
): Promise<AssignedBatchInfo[]> {
  const endpoint = coachId ? `coaches/${encodeURIComponent(coachId)}/courses` : `coaches/me/courses`
  try {
    const res = await fetch(getBackendApiUrl(endpoint), {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    })

    if (!res.ok) {
      console.warn("Could not fetch coach assigned batches:", res.status)
      return []
    }

    const data = await res.json()
    const courses = Array.isArray(data.courses) ? data.courses : []
    const batches: AssignedBatchInfo[] = []

    courses.forEach((c: any) => {
      const courseName = c.name || c.title || "Course"
      const courseBatches = Array.isArray(c.batches) ? c.batches : []

      courseBatches.forEach((b: any, index: number) => {
        // If coachId specified, ensure batch coach_id matches or was returned under coach's courses
        const batchDays = Array.isArray(b.days) ? b.days : []
        const startTime = String(b.start_time || "").trim()
        const endTime = String(b.end_time || "").trim()

        batches.push({
          id: String(b.id || b.batch_id || `${c.id || 'c'}_batch_${index}`).trim(),
          batch_name: String(b.batch_name || b.name || `Batch ${index + 1}`).trim(),
          course_name: courseName,
          branch_name: String(b.branch_name || c.branch_assignments?.[0]?.branch_name || "Assigned Branch").trim(),
          days: batchDays,
          start_time: startTime,
          end_time: endTime,
        })
      })
    })

    return batches
  } catch (err) {
    console.warn("Error fetching coach assigned batches:", err)
    return []
  }
}
