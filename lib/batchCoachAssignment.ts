import { getBackendApiUrl } from "@/lib/config"
import {
  normalizeAssignmentsCourses,
  buildCourseSchedulePayload,
  type NormalizedCourseAssignment,
} from "@/lib/branchCourseSchedule"

export type AssignmentBatch = {
  id: string
  coachId: string
  days: string[]
  startTime: string
  endTime: string
  batchName?: string
  branchName: string
  branchId: string
}

export type AvailabilityWindow = {
  weekday: string
  start_time: string
  end_time: string
  service_location_id?: string | null
}

const DAY_SHORT: Record<string, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
}

function dayKey(value: string) {
  return (value || "").trim().toLowerCase()
}

function toMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})/.exec((value || "").trim())
  if (!match) return null
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour > 23 || minute > 59) return null
  return hour * 60 + minute
}

export function formatClock(value: string) {
  const match = /^(\d{1,2}):(\d{2})/.exec((value || "").trim())
  if (!match) return value
  let hour = Number(match[1])
  const suffix = hour >= 12 ? "PM" : "AM"
  hour = hour % 12 || 12
  return `${hour}:${match[2]} ${suffix}`
}

export function formatDays(days: string[]) {
  return days.map((day) => DAY_SHORT[dayKey(day)] || day).join(", ")
}

export function formatRange(start: string, end: string) {
  return `${formatClock(start)} – ${formatClock(end)}`
}

function slotCovers(
  slot: AvailabilityWindow,
  day: string,
  start: number,
  end: number,
  branchId: string
) {
  if (dayKey(slot.weekday) !== day) return false
  const location = (slot.service_location_id || "").trim()
  if (location && location !== branchId) return false
  const slotStart = toMinutes(slot.start_time)
  const slotEnd = toMinutes(slot.end_time)
  if (slotStart == null || slotEnd == null || slotEnd <= slotStart) return false
  return slotStart <= start && slotEnd >= end
}

function sameBatch(a: AssignmentBatch, b: AssignmentBatch) {
  return a.branchId === b.branchId && a.id === b.id
}

function overlaps(a: AssignmentBatch, b: AssignmentBatch) {
  if (a.coachId !== b.coachId || sameBatch(a, b)) return false
  const days = new Set(a.days.map(dayKey))
  if (!b.days.some((day) => days.has(dayKey(day)))) return false
  const startA = toMinutes(a.startTime)
  const endA = toMinutes(a.endTime)
  const startB = toMinutes(b.startTime)
  const endB = toMinutes(b.endTime)
  if (startA == null || endA == null || startB == null || endB == null) return false
  return startA < endB && startB < endA
}

/** Live message for one batch. `availability` undefined means it is still loading. */
export function batchAssignmentError(
  batch: AssignmentBatch,
  availability: AvailabilityWindow[] | undefined,
  others: AssignmentBatch[]
): string | null {
  const coachId = batch.coachId.trim()
  if (!coachId) return null
  const days = batch.days.map(dayKey).filter(Boolean)
  const start = toMinutes(batch.startTime)
  const end = toMinutes(batch.endTime)
  if (days.length === 0 || start == null || end == null || end <= start) return null

  if (availability) {
    if (availability.length === 0) {
      return "Set this coach's availability before assigning a batch."
    }
    const missing = days.filter(
      (day) => !availability.some((slot) => slotCovers(slot, day, start, end, batch.branchId))
    )
    if (missing.length > 0) {
      return `This coach is not available ${formatDays(missing)}, ${formatRange(batch.startTime, batch.endTime)}.`
    }
  }

  const clash = others.find((other) => overlaps(batch, other))
  if (!clash) return null
  const shared = clash.days.filter((day) => days.includes(dayKey(day)))
  const name = clash.batchName || "Batch"
  return `This coach is already assigned ${formatDays(shared.length ? shared : clash.days)}, ${formatRange(clash.startTime, clash.endTime)} (${name}, ${clash.branchName}).`
}

/** Fetches active batches across all branches (optionally excluding one branch). */
export async function fetchExternalBatches(
  token: string,
  excludeBranchId?: string
): Promise<AssignmentBatch[]> {
  try {
    const res = await fetch(
      getBackendApiUrl("branches?skip=0&limit=100&active_only=true&include_stats=false"),
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    )
    if (!res.ok) return []
    const data = await res.json()
    const rows: AssignmentBatch[] = []
    for (const b of data.branches || []) {
      if (!b?.id || (excludeBranchId && String(b.id) === String(excludeBranchId))) continue
      const branchName = b.branch?.name || b.name || "Branch"
      const schedule = b.assignments?.course_schedule || []
      for (const entry of schedule) {
        if (entry?.is_available === false) continue
        const batches = Array.isArray(entry?.batches) ? entry.batches : []
        batches.forEach((saved: any, idx: number) => {
          const coachId = String(saved?.coach_id || saved?.coachId || "").trim()
          if (!coachId) return
          rows.push({
            id: String(saved.batch_id || saved.id || `${entry.course_id || "course"}-${idx}`),
            coachId,
            days: Array.isArray(saved.days) ? saved.days.map(String) : [],
            startTime: String(saved.start_time || saved.startTime || ""),
            endTime: String(saved.end_time || saved.endTime || ""),
            batchName: saved.batch_name || saved.name || "",
            branchName,
            branchId: String(b.id),
          })
        })
      }
    }
    return rows
  } catch (err) {
    console.error("Failed to fetch external batches:", err)
    return []
  }
}

/**
 * Updates the branch's batches so that batches in `assignedBatchIds` have `coach_id = coachId`,
 * and batches previously assigned to this coach are cleared if unchecked.
 */
export async function syncBranchBatchAssignments(
  branchId: string,
  coachId: string,
  assignedBatchIds: string[],
  token: string
): Promise<boolean> {
  if (!branchId || !coachId) return false
  try {
    const getRes = await fetch(getBackendApiUrl(`branches/${branchId}`), {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!getRes.ok) return false
    const branchData = await getRes.json()
    const normalized = normalizeAssignmentsCourses(branchData.assignments ?? null)

    for (const course of normalized) {
      for (const batch of course.batches) {
        if (assignedBatchIds.includes(batch.id)) {
          batch.coach_id = coachId
        } else if (batch.coach_id === coachId) {
          batch.coach_id = ""
        }
      }
    }

    const updatedAssignments = {
      accessories_available: branchData.assignments?.accessories_available || false,
      courses: normalized.map((c) => c.course_id).filter(Boolean),
      branch_admins: branchData.assignments?.branch_admins || [],
      course_schedule: buildCourseSchedulePayload(normalized),
    }

    const submitData = {
      branch: branchData.branch,
      location_id: branchData.location_id,
      manager_id: branchData.manager_id,
      operational_details: branchData.operational_details,
      assignments: updatedAssignments,
      bank_details: branchData.bank_details,
      admission_fee: branchData.admission_fee,
      is_collaboration_partner: !!(branchData.is_collaboration_partner ?? branchData.allows_collaboration),
      allows_collaboration: !!(branchData.is_collaboration_partner ?? branchData.allows_collaboration),
    }

    const putRes = await fetch(getBackendApiUrl(`branches/${branchId}`), {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(submitData),
    })

    return putRes.ok
  } catch (err) {
    console.error("Failed to sync branch batch assignments:", err)
    return false
  }
}

/** Removes coach_id from any batches in a branch (used when a coach leaves a branch). */
export async function cleanUpCoachBatchesInBranch(
  branchId: string,
  coachId: string,
  token: string
): Promise<boolean> {
  if (!branchId || !coachId) return false
  try {
    const getRes = await fetch(getBackendApiUrl(`branches/${branchId}`), {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!getRes.ok) return false
    const branchData = await getRes.json()
    const normalized = normalizeAssignmentsCourses(branchData.assignments ?? null)
    let changed = false
    for (const course of normalized) {
      for (const batch of course.batches) {
        if (batch.coach_id === coachId) {
          batch.coach_id = ""
          changed = true
        }
      }
    }
    if (!changed) return true

    const updatedAssignments = {
      accessories_available: branchData.assignments?.accessories_available || false,
      courses: normalized.map((c) => c.course_id).filter(Boolean),
      branch_admins: branchData.assignments?.branch_admins || [],
      course_schedule: buildCourseSchedulePayload(normalized),
    }

    const submitData = {
      branch: branchData.branch,
      location_id: branchData.location_id,
      manager_id: branchData.manager_id,
      operational_details: branchData.operational_details,
      assignments: updatedAssignments,
      bank_details: branchData.bank_details,
      admission_fee: branchData.admission_fee,
      is_collaboration_partner: !!(branchData.is_collaboration_partner ?? branchData.allows_collaboration),
      allows_collaboration: !!(branchData.is_collaboration_partner ?? branchData.allows_collaboration),
    }

    const putRes = await fetch(getBackendApiUrl(`branches/${branchId}`), {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(submitData),
    })

    return putRes.ok
  } catch (err) {
    console.error("Failed to clean up coach batches in branch:", err)
    return false
  }
}

