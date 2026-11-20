"use client"

import type React from "react"
import { useState, useRef, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { useRegistration } from "@/contexts/RegistrationContext"
import { normalizeToIndianE164 } from "@/lib/indianMobile"

const DIGITS = 6
const RESEND_COOLDOWN_SEC = 30

function OtpVerificationInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = searchParams.get("next") || "/register/payment"
  const { registrationData, updateRegistrationData } = useRegistration()

  const [otp, setOtp] = useState<string[]>(() => Array(DIGITS).fill(""))
  const [busy, setBusy] = useState(false)
  const [sendBusy, setSendBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [resendCooldown, setResendCooldown] = useState(0)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const phone = normalizeToIndianE164(registrationData.mobile?.trim() || "") || ""
  const masked =
    phone.length >= 4 ? `xxxxxx${phone.slice(-4)}` : phone || "your number"

  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setInterval(() => {
      setResendCooldown((s) => (s <= 1 ? 0 : s - 1))
    }, 1000)
    return () => clearInterval(t)
  }, [resendCooldown])

  const startResendCooldown = () => setResendCooldown(RESEND_COOLDOWN_SEC)

  useEffect(() => {
    if (!phone) {
      setErr("No phone number on file. Go back and complete registration details.")
      return
    }
    let cancelled = false
    ;(async () => {
      setSendBusy(true)
      setErr(null)
      try {
        const res = await fetch("/api/backend/reg-checkout/send-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          const d =
            typeof data?.detail === "string"
              ? data.detail
              : Array.isArray(data?.detail)
                ? data.detail.map((x: { msg?: string }) => x.msg).join(", ")
                : "Could not send OTP"
          if (!cancelled) setErr(d)
          return
        }
        if (!cancelled) {
          setMsg("OTP sent. Check your SMS.")
          startResendCooldown()
        }
      } catch {
        if (!cancelled) setErr("Network error sending OTP.")
      } finally {
        if (!cancelled) setSendBusy(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [phone])

  const handleOtpChange = (index: number, value: string) => {
    const v = value.replace(/\D/g, "").slice(-1)
    const newOtp = [...otp]
    newOtp[index] = v
    setOtp(newOtp)
    if (v && index < DIGITS - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    const otpCode = otp.join("")
    if (otpCode.length < DIGITS) {
      setErr(`Enter the ${DIGITS}-digit code.`)
      return
    }
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch("/api/backend/reg-checkout/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp: otpCode }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        let d =
          typeof data?.detail === "string"
            ? data.detail
            : "Verification failed"
        if (/otp expired|expired.*resend/i.test(d)) {
          d = "OTP expired. Please resend."
        }
        setErr(d)
        return
      }
      const token = data?.verification_token as string | undefined
      if (!token) {
        setErr("Invalid server response.")
        return
      }
      updateRegistrationData({ phoneVerificationToken: token, mobile: phone })
      router.push(nextPath.startsWith("/") ? nextPath : "/register/payment")
    } catch {
      setErr("Network error. Try again.")
    } finally {
      setBusy(false)
    }
  }

  const handleResendOTP = async () => {
    if (!phone || sendBusy || resendCooldown > 0) return
    setSendBusy(true)
    setErr(null)
    try {
      const res = await fetch("/api/backend/reg-checkout/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const d =
          typeof data?.detail === "string"
            ? data.detail
            : "Could not resend OTP"
        setErr(d)
        return
      }
      setMsg("A new OTP has been sent.")
      startResendCooldown()
    } catch {
      setErr("Network error.")
    } finally {
      setSendBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gray-200 items-center justify-center relative overflow-hidden">
        <div
          className="w-full h-full bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/images/otp-left.png')",
          }}
        />
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white relative">
        <Link
          href="/login"
          className="absolute top-8 right-8 text-gray-500 hover:text-gray-700 text-sm flex items-center gap-1"
        >
          <span>←</span> Back to login
        </Link>

        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-3">
            <h1 className="text-3xl font-bold text-black">OTP VERIFICATION</h1>
            <p className="text-gray-600 text-sm">
              We sent a code to <span className="font-medium">{masked}</span>
            </p>
            {msg && <p className="text-sm text-green-600">{msg}</p>}
            {err && <p className="text-sm text-red-600">{err}</p>}
          </div>

          <form onSubmit={handleVerifyOTP} className="space-y-8">
            <div className="text-center">
              <p className="text-gray-500 text-sm mb-4">Code from SMS</p>
            </div>

            <div className="flex justify-center gap-2 sm:gap-3 flex-wrap">
              {otp.map((digit, index) => (
                <Input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-14 sm:w-14 sm:h-16 text-center text-xl font-bold bg-gray-50 border-gray-200 rounded-lg focus:border-yellow-400 focus:ring-yellow-400"
                  autoComplete="one-time-code"
                />
              ))}
            </div>

            <Button
              type="submit"
              disabled={busy || !phone}
              className="w-full  font-bold py-3 rounded-lg text-lg"
            >
              {busy ? "Verifying…" : "Verify & continue"}
            </Button>

            <div className="text-center">
              <p className="text-gray-600 text-sm">
                Didn&apos;t receive it?{" "}
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={sendBusy || !phone || resendCooldown > 0}
                  className="text-red-500 hover:text-red-600 font-medium disabled:opacity-50"
                >
                  {sendBusy
                    ? "Sending…"
                    : resendCooldown > 0
                      ? `Resend OTP (${resendCooldown}s)`
                      : "Resend OTP"}
                </button>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function OTPVerificationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-gray-600">Loading…</p>
        </div>
      }
    >
      <OtpVerificationInner />
    </Suspense>
  )
}
