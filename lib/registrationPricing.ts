/**
 * Derive display / estimate amounts from academy course payload
 * (GET /api/courses/public/by-branch/:id shape).
 */

export type BranchCoursePricing = {
  currency?: string
  amount?: number | string | null
  fee_1_month?: number | string | null
  fee_3_months?: number | string | null
  fee_6_months?: number | string | null
  fee_1_year?: number | string | null
  fee_per_duration?: Record<string, number | string> | null
  pricing_type_per_duration?: Record<string, string> | null
}

function toNum(v: unknown): number | null {
  if (v == null) return null
  if (typeof v === "number" && !Number.isNaN(v)) return v
  if (typeof v === "string") {
    const n = parseFloat(v.replace(/[^\d.-]/g, ""))
    return Number.isNaN(n) ? null : n
  }
  return null
}

/**
 * Fee for a specific duration id/code from fee_per_duration map.
 */
export function getFeeForDurationKeys(
  pricing: BranchCoursePricing | undefined,
  durationId: string,
  durationCode?: string,
  durationMonths?: number
): number | null {
  const fpd = pricing?.fee_per_duration
  if (!fpd || typeof fpd !== "object") return null
  const ptd = pricing?.pricing_type_per_duration
  const keys = [durationId, durationCode].filter(Boolean) as string[]
  for (const k of keys) {
    const n = toNum(fpd[k])
    if (n != null) {
      /* If pricing type is "monthly", multiply by duration months to get total */
      const pType = ptd?.[k] || ""
      const months = durationMonths ?? 1
      if (pType === "monthly" && months > 1) {
        return n * months
      }
      return n
    }
  }
  return null
}

/**
 * Lowest positive fee in fee_per_duration (for "From ₹…" labels).
 */
export function getLowestFeePerDuration(pricing: BranchCoursePricing | undefined): number | null {
  const fpd = pricing?.fee_per_duration
  if (!fpd || typeof fpd !== "object") return null
  let min: number | null = null
  for (const v of Object.values(fpd)) {
    const n = toNum(v)
    if (n != null && n >= 0 && (min == null || n < min)) min = n
  }
  return min
}

/**
 * Display line for a course row: uses duration-specific fee when keys provided,
 * else lowest fee_per_duration, else flat amount / fee_1_month.
 */
export function formatCoursePriceLabel(
  pricing: BranchCoursePricing | undefined,
  opts?: { durationId?: string; durationCode?: string; multiplier?: number; durationMonths?: number }
): string {
  const currency = pricing?.currency?.trim() || "INR"
  const sym = currency === "INR" ? "₹" : `${currency} `

  let amount: number | null = null
  if (opts?.durationId) {
    amount = getFeeForDurationKeys(pricing, opts.durationId, opts.durationCode, opts?.durationMonths)
    const mult = opts.multiplier && opts.multiplier > 0 ? opts.multiplier : 1
    if (amount != null && mult !== 1) amount = Math.round(amount * mult * 100) / 100
  }
  if (amount == null) {
    amount = getLowestFeePerDuration(pricing)
  }
  if (amount == null) {
    amount =
      toNum(pricing?.amount) ??
      toNum(pricing?.fee_1_month) ??
      toNum(pricing?.fee_3_months) ??
      toNum(pricing?.fee_6_months) ??
      toNum(pricing?.fee_1_year)
  }
  if (amount == null) {
    return "Price on request"
  }
  const formatted = amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })
  const prefix = opts?.durationId ? "" : "From "
  return `${prefix}${sym}${formatted}`
}
