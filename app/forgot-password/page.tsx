"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import {
  extractIndianMobileDigits,
  isValidIndianMobileNational,
  toIndianE164FromNational,
  normalizeToIndianE164,
} from "@/lib/indianMobile"

const OTP_DIGITS = 6
const RESEND_COOLDOWN_SEC = 30
const PASSWORD_MIN = 8

type Step = 1 | 2 | 3

function formatApiDetail(data: unknown): string {
  if (!data || typeof data !== "object") return "Something went wrong"
  const d = (data as { detail?: unknown }).detail
  if (typeof d === "string") return d
  if (Array.isArray(d)) {
    return d
      .map((x) =>
        typeof x === "object" && x && "msg" in x ? String((x as { msg?: string }).msg) : String(x),
      )
      .join(", ")
  }
  return "Something went wrong"
}

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)

  const [mobile10, setMobile10] = useState("")
  const [apiPhone, setApiPhone] = useState("")

  const [otp, setOtp] = useState<string[]>(() => Array(OTP_DIGITS).fill(""))
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [resetToken, setResetToken] = useState("")

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [sendBusy, setSendBusy] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  const masked =
    mobile10.length >= 4 ? `******${mobile10.slice(-4)}` : mobile10 || "your number"

  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setInterval(() => setResendCooldown((s) => (s <= 1 ? 0 : s - 1)), 1000)
    return () => clearInterval(t)
  }, [resendCooldown])

  const startResendCooldown = () => setResendCooldown(RESEND_COOLDOWN_SEC)

  const handleMobileChange = (value: string) => {
    setError("")
    setMobile10(extractIndianMobileDigits(value).slice(0, 10))
  }

  const canSubmitMobile =
    mobile10.length === 10 && isValidIndianMobileNational(mobile10) && !sendBusy && !loading

  const sendOtpRequest = async () => {
    const e164 = toIndianE164FromNational(mobile10)
    setSendBusy(true)
    setError("")
    try {
      const res = await fetch("/api/backend/auth/password-reset/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: e164 }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(formatApiDetail(data))
        return false
      }
      setApiPhone(e164)
      setStep(2)
      setOtp(Array(OTP_DIGITS).fill(""))
      startResendCooldown()
      setTimeout(() => otpRefs.current[0]?.focus(), 100)
      return true
    } catch {
      setError("Network error. Try again.")
      return false
    } finally {
      setSendBusy(false)
    }
  }

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmitMobile) return
    setLoading(true)
    try {
      await sendOtpRequest()
    } finally {
      setLoading(false)
    }
  }

  const handleOtpChange = (index: number, value: string) => {
    const v = value.replace(/\D/g, "").slice(-1)
    const next = [...otp]
    next[index] = v
    setOtp(next)
    setError("")
    if (v && index < OTP_DIGITS - 1) otpRefs.current[index + 1]?.focus()
  }

  const handleOtpKeyDown = (index: number, ev: React.KeyboardEvent) => {
    if (ev.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  const verifyOtp = async () => {
    const code = otp.join("")
    if (code.length < OTP_DIGITS) {
      setError(`Enter all ${OTP_DIGITS} digits from your SMS.`)
      return
    }
    const phone = apiPhone || normalizeToIndianE164(mobile10) || ""
    if (!phone) {
      setError("Invalid mobile. Go back to step 1.")
      return
    }
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/backend/auth/password-reset/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp: code }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(formatApiDetail(data))
        return
      }
      const token = data?.reset_token as string | undefined
      if (!token) {
        setError("Invalid server response.")
        return
      }
      setResetToken(token)
      setStep(3)
    } catch {
      setError("Network error. Try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (!mobile10 || resendCooldown > 0 || sendBusy) return
    setSendBusy(true)
    setError("")
    try {
      const res = await fetch("/api/backend/auth/password-reset/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: toIndianE164FromNational(mobile10) }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(formatApiDetail(data))
        return
      }
      startResendCooldown()
      setOtp(Array(OTP_DIGITS).fill(""))
      otpRefs.current[0]?.focus()
    } catch {
      setError("Network error.")
    } finally {
      setSendBusy(false)
    }
  }

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (password.length < PASSWORD_MIN) {
      setError(`Password must be at least ${PASSWORD_MIN} characters.`)
      return
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }
    if (!resetToken) {
      setError("Session expired. Start again.")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/backend/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetToken, new_password: password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(formatApiDetail(data))
        return
      }
      router.push("/login?reset=success")
    } catch {
      setError("Network error. Try again.")
    } finally {
      setLoading(false)
    }
  }

  const progressTitle = (s: Step) =>
    s === 1 ? "Mobile" : s === 2 ? "OTP" : "New password"

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-[#E0E0E0] items-center justify-center relative overflow-hidden">
        <div
          className="w-[550px] h-[550px] bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/images/forgot-password-left.png')" }}
        />
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white relative">
        <div className="w-full max-w-md space-y-6">
          <Link
            href="/login"
            className="text-sm text-[#000] hover:text-gray-600 flex items-center justify-center space-x-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to login</span>
          </Link>

          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-black">FORGOT PASSWORD</h1>
            <p className="text-gray-500 text-sm">
              {step === 1 && "Enter your registered mobile — we’ll text you a code."}
              {step === 2 && "Enter the OTP we sent to your phone."}
              {step === 3 && "Choose a new password for your account."}
            </p>
          </div>

          {/* Progress */}
          <div className="flex items-center justify-center gap-2 text-xs font-medium text-gray-600">
            {([1, 2, 3] as const).map((n) => (
              <div key={n} className="flex items-center gap-2">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    step >= n ? "bg-yellow-400 text-black" : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {n}
                </span>
                <span className={step === n ? "text-black font-semibold" : ""}>{progressTitle(n)}</span>
                {n < 3 && <span className="text-gray-300 px-1">→</span>}
              </div>
            ))}
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {step === 1 && (
            <form onSubmit={handleStep1Submit} className="space-y-6">
              <div>
                <div className="flex items-stretch rounded-xl h-14 overflow-hidden bg-[#F9F8FF]">
                  <span
                    className="flex items-center pl-5 pr-2 text-[14px] text-gray-600 shrink-0 select-none"
                    aria-hidden
                  >
                    +91
                  </span>
                  <Input
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    maxLength={10}
                    placeholder="Enter 10-digit mobile number"
                    value={mobile10}
                    onChange={(e) => handleMobileChange(e.target.value)}
                    className="flex-1 min-w-0 border-0 rounded-none h-14 bg-transparent shadow-none focus-visible:ring-0 pr-5 text-[14px]"
                  />
                </div>
              </div>
              <Button
                type="submit"
                loading={loading || sendBusy}
                loadingText="Sending…"
                disabled={!canSubmitMobile}
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-4 h-14 rounded-xl"
              >
                Send OTP
              </Button>
            </form>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <p className="text-sm text-gray-600 text-center">
                OTP sent to your registered mobile number{" "}
                <span className="font-medium text-black">{masked}</span>
              </p>
              <div className="flex justify-center gap-2 flex-wrap">
                {otp.map((digit, index) => (
                  <Input
                    key={index}
                    ref={(el) => {
                      otpRefs.current[index] = el
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className="w-10 h-12 sm:w-11 text-center text-lg font-bold bg-[#F9F8FF] border-0 rounded-lg"
                    autoComplete="one-time-code"
                  />
                ))}
              </div>
              <Button
                type="button"
                disabled={loading || otp.join("").length < OTP_DIGITS}
                onClick={() => void verifyOtp()}
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold h-14 rounded-xl"
              >
                {loading ? "Verifying…" : "Verify OTP"}
              </Button>
              <div className="flex flex-col sm:flex-row gap-3 justify-between items-center text-sm">
                <button
                  type="button"
                  className="text-gray-600 hover:text-black"
                  onClick={() => {
                    setStep(1)
                    setError("")
                  }}
                >
                  ← Change number
                </button>
                <button
                  type="button"
                  disabled={resendCooldown > 0 || sendBusy}
                  className="text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                  onClick={() => void handleResend()}
                >
                  {resendCooldown > 0 ? `Resend OTP (${resendCooldown}s)` : "Resend OTP"}
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <form onSubmit={handleResetSubmit} className="space-y-4">
              <PasswordInput
                autoComplete="new-password"
                placeholder={`New password (min ${PASSWORD_MIN} characters)`}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError("")
                }}
                className="h-14 pl-5 bg-[#F9F8FF] border-0 rounded-xl"
              />
              <PasswordInput
                autoComplete="new-password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  setError("")
                }}
                className="h-14 pl-5 bg-[#F9F8FF] border-0 rounded-xl"
              />
              <Button
                type="submit"
                loading={loading}
                loadingText="Saving…"
                disabled={
                  password.length < PASSWORD_MIN ||
                  password !== confirmPassword
                }
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold h-14 rounded-xl"
              >
                Save new password
              </Button>
              <button
                type="button"
                className="text-sm text-gray-600 hover:text-black w-full text-center"
                onClick={() => {
                  setStep(2)
                  setResetToken("")
                  setPassword("")
                  setConfirmPassword("")
                  setError("")
                }}
              >
                ← Back to OTP
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
