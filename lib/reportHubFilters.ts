/** Shared hub → report-page filter handoff for academy + duration. */

import { branchNameToSlug, isBranchId } from "@/lib/branch-slug"

export const REPORT_HUB_FILTERS_KEY = "rma_report_hub_filters"

export type ReportHubFilters = {
  /** Internal academy id used by report APIs */
  branch_id: string
  /** Public academy slug/name for URLs (never the UUID) */
  academy: string
  date_range: string
}

export const REPORT_DURATION_OPTIONS: Array<{ id: string; name: string }> = [
  { id: "last-30-days", name: "Last 30 Days" },
  { id: "current-month", name: "Current Month" },
  { id: "last-month", name: "Last Month" },
  { id: "current-quarter", name: "Current Quarter" },
  { id: "last-quarter", name: "Last Quarter" },
  { id: "current-year", name: "Current Year" },
  { id: "last-year", name: "Last Year" },
  { id: "all", name: "All Time" },
]

export function academySlugFromBranch(branch: {
  id?: string
  name?: string
  slug?: string
}): string {
  const slug = String(branch.slug || "").trim()
  if (slug) return slug.toLowerCase()
  const fromName = branchNameToSlug(String(branch.name || ""))
  if (fromName) return fromName
  return String(branch.id || "").trim()
}

export function readReportHubFilters(): ReportHubFilters {
  if (typeof window === "undefined") {
    return { branch_id: "all", academy: "all", date_range: "last-30-days" }
  }
  try {
    const raw = sessionStorage.getItem(REPORT_HUB_FILTERS_KEY)
    if (!raw) return { branch_id: "all", academy: "all", date_range: "last-30-days" }
    const parsed = JSON.parse(raw) as Partial<ReportHubFilters>
    const branch_id = String(parsed.branch_id || "all")
    const academy = String(
      parsed.academy || (branch_id !== "all" && !isBranchId(branch_id) ? branch_id : "all")
    )
    return {
      branch_id,
      academy: academy || "all",
      date_range: String(parsed.date_range || "last-30-days"),
    }
  } catch {
    return { branch_id: "all", academy: "all", date_range: "last-30-days" }
  }
}

export function writeReportHubFilters(filters: ReportHubFilters) {
  if (typeof window === "undefined") return
  try {
    sessionStorage.setItem(
      REPORT_HUB_FILTERS_KEY,
      JSON.stringify({
        branch_id: filters.branch_id || "all",
        academy: filters.academy || "all",
        date_range: filters.date_range || "last-30-days",
      })
    )
  } catch {
    /* ignore */
  }
}

/** Pretty query string: academy=<slug>&duration=<range> — never exposes UUIDs. */
export function reportHubQueryString(filters: ReportHubFilters): string {
  const params = new URLSearchParams()
  const academy =
    filters.academy && filters.academy !== "all"
      ? filters.academy
      : filters.branch_id && filters.branch_id !== "all" && !isBranchId(filters.branch_id)
        ? filters.branch_id
        : ""
  if (academy) params.set("academy", academy)
  if (filters.date_range && filters.date_range !== "all") {
    params.set("duration", filters.date_range)
  }
  const qs = params.toString()
  return qs ? `?${qs}` : ""
}

export function filtersFromSearchParams(
  searchParams: URLSearchParams | null | undefined
): Partial<ReportHubFilters> {
  if (!searchParams) return {}
  // Prefer pretty params; keep legacy branch_id / date_range for old links.
  const academy =
    searchParams.get("academy") ||
    searchParams.get("branch") ||
    searchParams.get("branch_id") ||
    undefined
  const date_range =
    searchParams.get("duration") || searchParams.get("date_range") || undefined

  const out: Partial<ReportHubFilters> = {}
  if (academy) {
    out.academy = academy
    // If legacy UUID link, keep as branch_id until resolved.
    if (isBranchId(academy)) out.branch_id = academy
  }
  if (date_range) out.date_range = date_range
  return out
}

/** Resolve academy slug/name/id to a branch id using a loaded academy list. */
export function resolveBranchIdFromAcademyParam(
  academyOrId: string | undefined | null,
  branches: Array<{ id: string; name?: string; slug?: string }>
): string {
  const key = String(academyOrId || "").trim()
  if (!key || key === "all") return "all"
  if (isBranchId(key) && branches.some((b) => b.id === key)) return key
  if (isBranchId(key)) return key

  const needle = key.toLowerCase()
  const bySlug = branches.find((b) => academySlugFromBranch(b) === needle)
  if (bySlug) return bySlug.id

  const byName = branches.find(
    (b) => branchNameToSlug(String(b.name || "")) === needle || String(b.name || "").toLowerCase() === needle
  )
  if (byName) return byName.id

  return key
}
