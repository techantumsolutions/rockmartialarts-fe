/**
 * Shared renewal eligibility: renew actions open only within 7 calendar days
 * of the renewal due date (or after it has passed). Used by student + admin UIs.
 */

export const RENEWAL_EARLY_WINDOW_DAYS = 7

export type RenewalDueSource = {
  next_due_date?: string | null
  end_date?: string | null
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/** Prefer next_due_date, fall back to enrollment end_date. */
export function getRenewalDueDate(source: RenewalDueSource): Date | null {
  const raw = source.next_due_date || source.end_date
  if (!raw) return null
  const due = new Date(raw)
  if (Number.isNaN(due.getTime())) return null
  return due
}

/**
 * True when renew is allowed:
 * - due date already passed (overdue / grace / expired), or
 * - due within the next {@link RENEWAL_EARLY_WINDOW_DAYS} calendar days (inclusive).
 */
export function isRenewalWindowOpen(
  source: RenewalDueSource,
  now: Date = new Date()
): boolean {
  const due = getRenewalDueDate(source)
  if (!due) return false
  const dueDay = startOfLocalDay(due)
  const today = startOfLocalDay(now)
  const msPerDay = 24 * 60 * 60 * 1000
  const daysUntilDue = Math.round((dueDay.getTime() - today.getTime()) / msPerDay)
  return daysUntilDue <= RENEWAL_EARLY_WINDOW_DAYS
}

export function renewalWindowMessage(source: RenewalDueSource): string {
  const due = getRenewalDueDate(source)
  if (!due) {
    return `Renewal opens ${RENEWAL_EARLY_WINDOW_DAYS} days before the renewal due date.`
  }
  const dueDay = startOfLocalDay(due)
  const opens = new Date(dueDay)
  opens.setDate(opens.getDate() - RENEWAL_EARLY_WINDOW_DAYS)
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
  return `Renewal opens on ${fmt(opens)} (one week before ${fmt(dueDay)}).`
}
