type EnrollmentStatusInput = {
  isActive?: boolean
  paymentStatus?: string
  endDate?: string
  completionDate?: string
}

/** Days before period end (inclusive) to show "Expiring Soon" for paid active rows */
export const ENROLLMENT_EXPIRING_SOON_DAYS = 5

/** M07-S03: post-expiry renewal grace window (days after expiry day) */
export const ENROLLMENT_GRACE_DAYS = 10

export type EnrollmentBillingState = "active" | "grace" | "overdue" | "unknown"

function getEnrollmentEndDate(input: Pick<EnrollmentStatusInput, "endDate" | "completionDate">): string | undefined {
  return input.endDate || input.completionDate
}

/**
 * Last instant of the subscription period: end of the UTC calendar day that contains the end timestamp.
 * Expiry uses instant comparison so we never mix string order or local/UTC day parts incorrectly.
 */
export function getSubscriptionPeriodEndUtc(endDateInput?: string): Date | null {
  if (!endDateInput) return null
  const s = String(endDateInput).trim()
  const dm = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (dm) {
    const y = Number(dm[1])
    const mo = Number(dm[2]) - 1
    const d = Number(dm[3])
    if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null
    return new Date(Date.UTC(y, mo, d, 23, 59, 59, 999))
  }
  const dt = new Date(s)
  if (Number.isNaN(dt.getTime())) return null
  return new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate(), 23, 59, 59, 999))
}

export function isEnrollmentExpiredByDate(
  endDateOrInput?: string | Pick<EnrollmentStatusInput, "endDate" | "completionDate">,
  now: Date = new Date()
): boolean {
  const endDate =
    typeof endDateOrInput === "string"
      ? endDateOrInput
      : getEnrollmentEndDate(endDateOrInput || {})
  const endEod = getSubscriptionPeriodEndUtc(endDate)
  if (!endEod) return false
  return now.getTime() > endEod.getTime()
}

/**
 * Subscription is "expired" only when the current time is after the end of the last valid day.
 * We do not treat payment_status === "expired" alone as calendar expiry (DB can be out of sync with end_date).
 */
export function isEnrollmentExpired(
  input: Pick<EnrollmentStatusInput, "paymentStatus" | "endDate" | "completionDate">,
  now: Date = new Date()
): boolean {
  return isEnrollmentExpiredByDate(input, now)
}

export function getGraceEndsAtUtc(
  endDate?: string,
  graceDays: number = ENROLLMENT_GRACE_DAYS
): Date | null {
  const endEod = getSubscriptionPeriodEndUtc(endDate)
  if (!endEod) return null
  return new Date(endEod.getTime() + graceDays * 86400000)
}

export function isWithinGracePeriod(
  endDate?: string,
  now: Date = new Date(),
  graceDays: number = ENROLLMENT_GRACE_DAYS
): boolean {
  if (!isEnrollmentExpiredByDate(endDate, now)) return false
  const graceEnds = getGraceEndsAtUtc(endDate, graceDays)
  if (!graceEnds) return false
  return now.getTime() <= graceEnds.getTime()
}

/** Whole days after expiry calendar day. */
export function overdueDaysAfterExpiry(endDate?: string, now: Date = new Date()): number {
  const endEod = getSubscriptionPeriodEndUtc(endDate)
  if (!endEod || now.getTime() <= endEod.getTime()) return 0
  const d0 = Date.UTC(endEod.getUTCFullYear(), endEod.getUTCMonth(), endEod.getUTCDate())
  const d1 = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  return Math.max(0, Math.round((d1 - d0) / 86400000))
}

export function graceDaysRemaining(
  endDate?: string,
  now: Date = new Date(),
  graceDays: number = ENROLLMENT_GRACE_DAYS
): number | null {
  if (!isWithinGracePeriod(endDate, now, graceDays)) {
    if (!isEnrollmentExpiredByDate(endDate, now)) return null
    return 0
  }
  const graceEnds = getGraceEndsAtUtc(endDate, graceDays)
  if (!graceEnds) return null
  const d0 = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const d1 = Date.UTC(graceEnds.getUTCFullYear(), graceEnds.getUTCMonth(), graceEnds.getUTCDate())
  return Math.max(0, Math.round((d1 - d0) / 86400000))
}

export function getEnrollmentBillingState(
  endDate?: string,
  now: Date = new Date(),
  graceDays: number = ENROLLMENT_GRACE_DAYS
): EnrollmentBillingState {
  if (!endDate) return "unknown"
  if (!isEnrollmentExpiredByDate(endDate, now)) return "active"
  if (isWithinGracePeriod(endDate, now, graceDays)) return "grace"
  return "overdue"
}

export function isEnrollmentActivePaid(
  input: EnrollmentStatusInput,
  now: Date = new Date()
): boolean {
  const normalizedStatus = (input.paymentStatus || "").toLowerCase()
  return (
    !!input.isActive && normalizedStatus === "paid" && !isEnrollmentExpiredByDate(input, now)
  )
}

/** Whole UTC calendar days from start of today (UTC) to subscription end day (inclusive of end day). */
export function calendarDaysUntilSubscriptionEnd(
  endDate?: string,
  now: Date = new Date()
): number | null {
  const endEod = getSubscriptionPeriodEndUtc(endDate)
  if (!endEod) return null
  const d0 = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const d1 = Date.UTC(endEod.getUTCFullYear(), endEod.getUTCMonth(), endEod.getUTCDate())
  return Math.round((d1 - d0) / 86400000)
}

export function isExpiringSoon(
  input: Pick<EnrollmentStatusInput, "endDate" | "completionDate">,
  now: Date = new Date(),
  withinDays: number = ENROLLMENT_EXPIRING_SOON_DAYS
): boolean {
  if (isEnrollmentExpiredByDate(input, now)) return false
  const days = calendarDaysUntilSubscriptionEnd(getEnrollmentEndDate(input), now)
  if (days === null) return false
  return days >= 0 && days <= withinDays
}

export type EnrollmentUiStatus =
  | "active"
  | "expiring_soon"
  | "grace"
  | "expired"
  | "pending"
  | "inactive"

export function getEnrollmentUiStatus(input: EnrollmentStatusInput, now: Date = new Date()): EnrollmentUiStatus {
  const normalizedStatus = (input.paymentStatus || "").toLowerCase()
  const end = getEnrollmentEndDate(input)

  if (isEnrollmentExpiredByDate(input, now)) {
    if (isWithinGracePeriod(end, now)) return "grace"
    return "expired"
  }

  if (isEnrollmentActivePaid(input, now)) {
    if (isExpiringSoon(input, now, ENROLLMENT_EXPIRING_SOON_DAYS)) {
      return "expiring_soon"
    }
    return "active"
  }

  if (normalizedStatus === "pending" || normalizedStatus === "overdue") {
    return "pending"
  }

  if (input.isActive === false && normalizedStatus === "paid") {
    return "inactive"
  }

  return "inactive"
}

export function formatEnrollmentUiStatusLabel(status: EnrollmentUiStatus): string {
  switch (status) {
    case "expiring_soon":
      return "Expiring Soon"
    case "grace":
      return "Grace Period"
    case "expired":
      return "Expired"
    case "active":
      return "Active"
    case "pending":
      return "Pending"
    case "inactive":
      return "Inactive"
    default:
      return status
  }
}
