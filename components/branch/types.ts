/**
 * Branch data shape returned by API (from backend branch model).
 */

export interface BranchAddress {
  line1?: string
  area?: string
  city?: string
  state?: string
  pincode?: string
  country?: string
}

export interface BranchInfo {
  name?: string
  code?: string
  email?: string
  phone?: string
  address?: BranchAddress
}

export interface OperationalTiming {
  day: string
  open: string
  close: string
}

/** Normalize timing rows from API (supports alternate keys) for public display. */
export function formatOperationalTimingsForDisplay(
  timings: Array<Partial<OperationalTiming> & Record<string, unknown>> | undefined | null
): string {
  if (!timings?.length) return ""
  const pick = (t: Record<string, unknown>, keys: string[]): string => {
    for (const k of keys) {
      const v = t[k]
      if (v == null) continue
      const s = String(v).trim()
      if (s) return s
    }
    return ""
  }
  const parts: string[] = []
  for (const raw of timings) {
    if (!raw || typeof raw !== "object") continue
    const t = raw as Record<string, unknown>
    const open = pick(t, ["open", "open_time", "start", "from"])
    const close = pick(t, ["close", "close_time", "end", "to"])
    const day = pick(t, ["day", "weekday"])
    if (open && close) {
      parts.push(day ? `${day}: ${open} – ${close}` : `${open} – ${close}`)
    } else if (open || close) {
      const slot = open && close ? `${open} – ${close}` : open || close
      parts.push(day ? `${day}: ${slot}` : slot)
    }
  }
  return parts.join(" • ")
}

export interface OperationalDetails {
  timings?: OperationalTiming[]
  holidays?: string[]
  courses_offered?: string[]
}

/** Saved from branch edit: per-course batches (days, times, coach). */
export interface BranchCourseScheduleBatch {
  days?: string[]
  start_time?: string
  end_time?: string
  coach_id?: string
  /** Resolved on public branch payloads for display */
  trainer_name?: string
  name?: string
  batch_name?: string
  /** Per-batch course fee for registration (optional) */
  batch_fee?: number
  batchFee?: number
}

export interface BranchCourseScheduleEntry {
  course_id: string
  batches?: BranchCourseScheduleBatch[]
}

export interface BranchAssignments {
  accessories_available?: boolean
  courses?: string[]
  branch_admins?: string[]
  course_schedule?: BranchCourseScheduleEntry[]
}

export interface BranchData {
  id: string
  branch?: BranchInfo
  location_id?: string
  manager_id?: string
  operational_details?: OperationalDetails
  assignments?: BranchAssignments
  is_active?: boolean
  slug?: string
  courses?: Array<{
    id: string
    title?: string
    name?: string
    code?: string
    slug?: string
    description?: string
    difficulty_level?: string
    media_resources?: { course_image_url?: string }
    pricing?: Record<string, unknown>
    available_durations?: Array<{ id?: string; code?: string; name?: string; duration_months?: number }>
  }>
  /** Optional: if backend adds later */
  description?: string
  gallery_images?: string[]
  map_link?: string
  coordinates?: { lat: number; lng: number }
  facilities?: string[]
}

export function getBranchName(b: BranchData): string {
  return b.branch?.name || b.branch?.code || "Branch"
}

export function getBranchEmail(b: BranchData): string | undefined {
  return b.branch?.email
}

export function getBranchPhone(b: BranchData): string | undefined {
  return b.branch?.phone
}

export function getBranchAddress(b: BranchData): BranchAddress | undefined {
  return b.branch?.address
}

export function formatAddress(addr: BranchAddress | undefined): string {
  if (!addr) return ""
  const parts = [addr.line1, addr.area, addr.city, addr.state, addr.pincode, addr.country].filter(Boolean)
  return parts.join(", ")
}

export function formatLocation(addr: BranchAddress | undefined): string {
  if (!addr) return ""
  return [addr.city, addr.state].filter(Boolean).join(", ")
}
