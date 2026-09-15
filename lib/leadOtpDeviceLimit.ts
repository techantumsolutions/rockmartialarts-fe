import { getLeadOtpLimitResetMinutes, getLeadOtpMaxSendsPerDevice } from "@/lib/popupForm"

export const LEAD_OTP_DEVICE_LIMIT_MESSAGE = "Maximum OTP requests reached. Please try again later."

const STORAGE_KEY = "rock_lead_popup_otp_device_limit"

type LeadOtpDeviceLimitState = {
  count: number
  lockedUntil?: number
}

function readRaw(): LeadOtpDeviceLimitState {
  if (typeof window === "undefined") return { count: 0 }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { count: 0 }
    const parsed = JSON.parse(raw) as { count?: unknown; lockedUntil?: unknown }
    const count = Number(parsed?.count)
    const lockedUntil = Number(parsed?.lockedUntil)
    return {
      count: Number.isFinite(count) && count > 0 ? count : 0,
      lockedUntil: Number.isFinite(lockedUntil) && lockedUntil > 0 ? lockedUntil : undefined,
    }
  } catch {
    return { count: 0 }
  }
}

function write(state: LeadOtpDeviceLimitState): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function getLeadOtpDeviceLimitState(): LeadOtpDeviceLimitState {
  const state = readRaw()
  if (state.lockedUntil && Date.now() >= state.lockedUntil) {
    write({ count: 0 })
    return { count: 0 }
  }
  return state
}

export function isLeadOtpDeviceBlocked(): boolean {
  const state = getLeadOtpDeviceLimitState()
  if (state.lockedUntil && Date.now() < state.lockedUntil) return true
  return state.count >= getLeadOtpMaxSendsPerDevice()
}

export function incrementLeadOtpDeviceSend(): void {
  const max = getLeadOtpMaxSendsPerDevice()
  const resetMs = getLeadOtpLimitResetMinutes() * 60 * 1000
  const nextCount = getLeadOtpDeviceLimitState().count + 1
  if (nextCount >= max) {
    write({ count: nextCount, lockedUntil: Date.now() + resetMs })
    return
  }
  write({ count: nextCount })
}
