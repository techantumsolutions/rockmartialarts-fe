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

function formatClock(value: string) {
  const match = /^(\d{1,2}):(\d{2})/.exec((value || "").trim())
  if (!match) return value
  let hour = Number(match[1])
  const suffix = hour >= 12 ? "PM" : "AM"
  hour = hour % 12 || 12
  return `${hour}:${match[2]} ${suffix}`
}

function formatDays(days: string[]) {
  return days.map((day) => DAY_SHORT[dayKey(day)] || day).join(", ")
}

function formatRange(start: string, end: string) {
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
