import { getBackendApiUrl } from "./config"
import { TokenManager } from "./tokenManager"

export type AcademyEventRegistration = {
  id: string
  event_id: string
  event_slug?: string | null
  event_title?: string | null
  event_type?: string | null
  event_start_at?: string | null
  event_venue?: string | null
  branch_id?: string | null
  participant_name: string
  participant_phone: string
  participant_email?: string | null
  participant_age?: number | null
  notes?: string | null
  fee_inr: number
  amount_paise?: number
  status: string
  payment_status: string
  razorpay_order_id?: string | null
  razorpay_payment_id?: string | null
  confirmed_at?: string | null
  created_at?: string
}

export type AcademyEventRegistrationCreatePayload = {
  event_id?: string
  event_slug?: string
  participant_name: string
  participant_phone: string
  participant_email?: string
  participant_age?: number
  notes?: string
  source?: string
}

const OTP_TOKEN_KEY = "academy_event_reg_otp_token"

export function getEventRegOtpToken(): string | null {
  if (typeof window === "undefined") return null
  try {
    return sessionStorage.getItem(OTP_TOKEN_KEY)
  } catch {
    return null
  }
}

export function setEventRegOtpToken(token: string) {
  if (typeof window === "undefined") return
  try {
    sessionStorage.setItem(OTP_TOKEN_KEY, token)
  } catch {
    /* ignore */
  }
}

export function clearEventRegOtpToken() {
  if (typeof window === "undefined") return
  try {
    sessionStorage.removeItem(OTP_TOKEN_KEY)
  } catch {
    /* ignore */
  }
}

/** Normalize to +91XXXXXXXXXX for OTP APIs when possible */
export function toEventRegApiPhone(raw: string): string {
  const digits = (raw || "").replace(/\D/g, "")
  let national = digits
  if (national.startsWith("91") && national.length === 12) national = national.slice(2)
  if (national.length > 10) national = national.slice(-10)
  if (/^[6-9]\d{9}$/.test(national)) return `+91${national}`
  return (raw || "").trim()
}

export class AcademyEventRegistrationApiError extends Error {
  status: number
  detail?: unknown

  constructor(message: string, status: number, detail?: unknown) {
    super(message)
    this.name = "AcademyEventRegistrationApiError"
    this.status = status
    this.detail = detail
    Object.setPrototypeOf(this, AcademyEventRegistrationApiError.prototype)
  }
}

export function isEventRegAuthError(error: unknown): boolean {
  if (error instanceof AcademyEventRegistrationApiError) {
    return error.status === 401 || error.status === 403
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as { status?: unknown }).status === "number"
  ) {
    const s = (error as { status: number }).status
    return s === 401 || s === 403
  }
  return false
}

export function getEventRegApiErrorStatus(error: unknown): number | null {
  if (error instanceof AcademyEventRegistrationApiError) {
    return error.status
  }
  if (
    typeof error === "object" &&
    error !== null &&
    typeof (error as { status?: unknown }).status === "number"
  ) {
    return (error as { status: number }).status
  }
  return null
}

async function parseError(res: Response): Promise<{ message: string; detail?: unknown }> {
  try {
    const data = await res.json()
    if (typeof data?.detail === "string") return { message: data.detail, detail: data.detail }
    if (Array.isArray(data?.detail)) {
      return {
        message: data.detail
          .map((d: { msg?: string }) => d.msg || JSON.stringify(d))
          .join("; "),
        detail: data.detail,
      }
    }
    return {
      message: data?.message || res.statusText || `Request failed (${res.status})`,
      detail: data,
    }
  } catch {
    return {
      message: res.statusText || `Request failed with status ${res.status}`,
    }
  }
}

async function throwApiError(res: Response): Promise<never> {
  const { message, detail } = await parseError(res)
  throw new AcademyEventRegistrationApiError(message, res.status, detail)
}

function authHeaders(json = false, otpToken?: string | null): HeadersInit {
  const h: Record<string, string> = {
    Accept: "application/json",
    "Cache-Control": "no-cache",
  }
  if (json) h["Content-Type"] = "application/json"
  const userToken = TokenManager.getToken()
  if (userToken) h.Authorization = `Bearer ${userToken}`
  const otp = otpToken === undefined ? getEventRegOtpToken() : otpToken
  if (otp) h["X-Event-Registration-Token"] = otp
  return h
}

class AcademyEventRegistrationAPI {
  async sendOtp(phone: string) {
    const res = await fetch(
      getBackendApiUrl("academy-event-registrations/send-otp"),
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ phone: toEventRegApiPhone(phone) }),
      }
    )
    if (!res.ok) await throwApiError(res)
    return res.json() as Promise<{ message: string; expires_in_seconds: number }>
  }

  async verifyOtp(phone: string, otp: string) {
    const res = await fetch(
      getBackendApiUrl("academy-event-registrations/verify-otp"),
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ phone: toEventRegApiPhone(phone), otp }),
      }
    )
    if (!res.ok) await throwApiError(res)
    const data = (await res.json()) as {
      verified: boolean
      verification_token: string
      expires_in: number
      phone?: string
    }
    if (data.verification_token) setEventRegOtpToken(data.verification_token)
    return data
  }

  async listMine(otpToken?: string | null) {
    const res = await fetch(
      getBackendApiUrl("academy-event-registrations/mine"),
      { headers: authHeaders(false, otpToken), cache: "no-store" }
    )
    if (!res.ok) await throwApiError(res)
    return res.json() as Promise<{
      registrations: AcademyEventRegistration[]
      total: number
      phone?: string
      auth_via?: string
    }>
  }

  async get(id: string, otpToken?: string | null) {
    const res = await fetch(
      getBackendApiUrl(
        `academy-event-registrations/${encodeURIComponent(id)}`
      ),
      { headers: authHeaders(false, otpToken), cache: "no-store" }
    )
    if (!res.ok) await throwApiError(res)
    return res.json() as Promise<{ registration: AcademyEventRegistration }>
  }

  async create(payload: AcademyEventRegistrationCreatePayload) {
    const res = await fetch(getBackendApiUrl("academy-event-registrations"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    })
    if (!res.ok) await throwApiError(res)
    return res.json() as Promise<{
      message: string
      registration: AcademyEventRegistration
      payment_required: boolean
    }>
  }

  async createOrder(registrationId: string) {
    const res = await fetch(
      getBackendApiUrl(
        `academy-event-registrations/${encodeURIComponent(registrationId)}/create-order`
      ),
      { method: "POST", headers: { Accept: "application/json" } }
    )
    if (!res.ok) await throwApiError(res)
    return res.json() as Promise<{
      order: { id: string; amount: number; currency: string }
      key: string
      registration_id: string
    }>
  }

  async verifyPayment(
    registrationId: string,
    payload: {
      razorpay_order_id: string
      razorpay_payment_id: string
      razorpay_signature: string
    }
  ) {
    const res = await fetch(
      getBackendApiUrl(
        `academy-event-registrations/${encodeURIComponent(registrationId)}/verify-payment`
      ),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      }
    )
    if (!res.ok) await throwApiError(res)
    return res.json() as Promise<{
      message: string
      registration: AcademyEventRegistration
    }>
  }

  async markPaymentFailed(registrationId: string) {
    const res = await fetch(
      getBackendApiUrl(
        `academy-event-registrations/${encodeURIComponent(registrationId)}/payment-failed`
      ),
      { method: "POST", headers: { Accept: "application/json" } }
    )
    if (!res.ok) await throwApiError(res)
    return res.json() as Promise<{
      message: string
      registration: AcademyEventRegistration
    }>
  }
}

export const academyEventRegistrationAPI = new AcademyEventRegistrationAPI()

export function registrationStatusLabel(status?: string | null) {
  const map: Record<string, string> = {
    pending_payment: "Pending payment",
    confirmed: "Confirmed",
    cancelled: "Cancelled",
    expired: "Expired",
    failed: "Failed",
  }
  return map[status || ""] || status || "—"
}
