/**
 * Persist homepage popup CMS settings outside FastAPI.
 *
 * FastAPI `HomepageSection` (GET/PUT `/api/cms`, GET `/api/cms/public`) has no
 * `popup_form` property, so those APIs ignore it. This app stores settings via
 * GET/PUT `/api/cms/popup-form` (file + optional Mongo).
 *
 * Lead OTP: FastAPI POST /api/leads/send-otp and /verify-otp (collection lead_popup_otp,
 * JWT scope lead_popup). Expiry: LEAD_OTP_EXPIRY_SECONDS (backend) and
 * NEXT_PUBLIC_LEAD_OTP_EXPIRY_SECONDS (UI countdown).
 * Device send cap: NEXT_PUBLIC_LEAD_OTP_MAX_SENDS_PER_DEVICE and
 * NEXT_PUBLIC_LEAD_OTP_LIMIT_RESET_MINUTES.
 */

export const DEFAULT_LEAD_OTP_EXPIRY_SECONDS = 300
export const DEFAULT_LEAD_OTP_MAX_SENDS_PER_DEVICE = 3
export const DEFAULT_LEAD_OTP_LIMIT_RESET_MINUTES = 30

function positiveIntEnv(raw: string | undefined, fallback: number): number {
  const n = raw ? parseInt(raw, 10) : fallback
  return Number.isFinite(n) && n > 0 ? n : fallback
}

export function getLeadOtpExpirySeconds(): number {
  return positiveIntEnv(process.env.NEXT_PUBLIC_LEAD_OTP_EXPIRY_SECONDS, DEFAULT_LEAD_OTP_EXPIRY_SECONDS)
}

export function getLeadOtpMaxSendsPerDevice(): number {
  return positiveIntEnv(process.env.NEXT_PUBLIC_LEAD_OTP_MAX_SENDS_PER_DEVICE, DEFAULT_LEAD_OTP_MAX_SENDS_PER_DEVICE)
}

export function getLeadOtpLimitResetMinutes(): number {
  return positiveIntEnv(process.env.NEXT_PUBLIC_LEAD_OTP_LIMIT_RESET_MINUTES, DEFAULT_LEAD_OTP_LIMIT_RESET_MINUTES)
}

export type PopupFormSettings = {
  enabled?: boolean
  title?: string
  description?: string
  name_enabled?: boolean
  phone_enabled?: boolean
  branch_enabled?: boolean
  skip_enabled?: boolean
}

export type ResolvedPopupForm = {
  enabled: boolean
  title: string
  description: string
  name_enabled: boolean
  phone_enabled: boolean
  branch_enabled: boolean
  skip_enabled: boolean
}

export const DEFAULT_POPUP_TITLE = "Get a call from our team"
export const DEFAULT_POPUP_DESCRIPTION =
  "Share your details and preferred branch. Our team will contact you with course options and fees."

/** Public site: missing CMS object keeps current behavior (all on + default copy). */
export function resolvePopupForm(raw?: PopupFormSettings | null): ResolvedPopupForm {
  return {
    enabled: raw?.enabled !== false,
    title: (raw?.title ?? "").trim() || DEFAULT_POPUP_TITLE,
    description: (raw?.description ?? "").trim() || DEFAULT_POPUP_DESCRIPTION,
    name_enabled: raw?.name_enabled !== false,
    phone_enabled: raw?.phone_enabled !== false,
    branch_enabled: raw?.branch_enabled !== false,
    skip_enabled: raw?.skip_enabled !== false,
  }
}

/** CMS editor: keep empty title/description so placeholders show. */
export function normalizePopupFormForCms(raw?: PopupFormSettings | null): ResolvedPopupForm {
  return {
    enabled: raw?.enabled !== false,
    title: raw?.title ?? "",
    description: raw?.description ?? "",
    name_enabled: raw?.name_enabled !== false,
    phone_enabled: raw?.phone_enabled !== false,
    branch_enabled: raw?.branch_enabled !== false,
    skip_enabled: raw?.skip_enabled !== false,
  }
}
