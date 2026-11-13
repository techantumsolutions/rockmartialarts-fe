"use client"

import React, { useRef, useState, useEffect } from "react"
import { CheckCircle2, Loader2, Phone, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const DIGITS = 6

type Props = {
  phone: string
  onPhoneChange: (phone: string) => void
  isVerified: boolean
  onVerified: (verified: boolean, token?: string) => void
  disabled?: boolean
  required?: boolean
}

export function TrainingPhoneOtpSection({
  phone,
  onPhoneChange,
  isVerified,
  onVerified,
  disabled = false,
  required = true,
}: Props) {
  const [otp, setOtp] = useState<string[]>(() => Array(DIGITS).fill(""))
  const [sendBusy, setSendBusy] = useState(false)
  const [verifyBusy, setVerifyBusy] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Format phone to E.164 (+91XXXXXXXXXX)
  const getApiPhone = (raw: string): string => {
    const cleaned = raw.replace(/\D/g, "")
    if (cleaned.length === 10) return `+91${cleaned}`
    if (cleaned.length === 12 && cleaned.startsWith("91")) return `+${cleaned}`
    if (raw.startsWith("+")) return raw.replace(/\s+/g, "")
    return `+91${cleaned}`
  }

  const rawDigits = phone.replace(/\D/g, "")
  const isValidPhone = rawDigits.length >= 10

  // Handle countdown timer
  useEffect(() => {
    if (countdown <= 0) return
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [countdown])

  const handlePhoneInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    onPhoneChange(val)
    if (isVerified) {
      onVerified(false)
      setOtpSent(false)
      setMsg(null)
      setErr(null)
    }
  }

  const sendOtp = async () => {
    if (!isValidPhone || disabled) return
    const apiPhone = getApiPhone(phone)
    setSendBusy(true)
    setErr(null)
    setMsg(null)

    try {
      const res = await fetch("/api/backend/reg-checkout/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: apiPhone }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const detail = typeof data.detail === "string" ? data.detail : "Failed to send OTP"
        setErr(detail)
        return
      }
      setOtpSent(true)
      setCountdown(30)
      setMsg("OTP sent successfully to your mobile via SMS.")
      setOtp(Array(DIGITS).fill(""))
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
    } catch {
      setErr("Network error while sending OTP. Please check your connection.")
    } finally {
      setSendBusy(false)
    }
  }

  const handleOtpChange = (index: number, value: string) => {
    const v = value.replace(/\D/g, "").slice(-1)
    const newOtp = [...otp]
    newOtp[index] = v
    setOtp(newOtp)
    if (v && index < DIGITS - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const verifyOtp = async () => {
    const code = otp.join("")
    if (code.length < DIGITS) {
      setErr(`Please enter all ${DIGITS} digits of the OTP.`)
      return
    }
    const apiPhone = getApiPhone(phone)
    setVerifyBusy(true)
    setErr(null)

    try {
      const res = await fetch("/api/backend/reg-checkout/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: apiPhone, otp: code }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const detail = typeof data.detail === "string" ? data.detail : "Invalid or expired OTP."
        setErr(detail)
        return
      }
      onVerified(true, data.token || "verified")
      setMsg("Phone number successfully verified!")
      setErr(null)
    } catch {
      setErr("Network error while verifying OTP.")
    } finally {
      setVerifyBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="contact_phone" className="text-sm font-medium text-foreground">
          Contact Phone {required && <span className="text-[#FFB70F]">*</span>}
        </Label>
        {isVerified && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Verified
          </span>
        )}
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            id="contact_phone"
            type="tel"
            placeholder="e.g. 9876543210"
            value={phone}
            onChange={handlePhoneInputChange}
            disabled={disabled || isVerified}
            className={`border-input bg-background/50 focus-visible:ring-[#FFB70F] ${
              isVerified ? "border-emerald-500 bg-emerald-50/20" : ""
            }`}
          />
        </div>

        {!isVerified && (
          <Button
            type="button"
            variant="outline"
            onClick={sendOtp}
            disabled={!isValidPhone || sendBusy || countdown > 0 || disabled}
            className="border-[#FFB70F] text-[#B87D00] hover:bg-[#FFB70F]/10 hover:text-[#946400] shrink-0 font-medium text-xs px-3"
          >
            {sendBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : countdown > 0 ? (
              `Resend (${countdown}s)`
            ) : otpSent ? (
              "Resend OTP"
            ) : (
              "Send OTP"
            )}
          </Button>
        )}
      </div>

      {/* OTP verification input section */}
      {!isVerified && otpSent && (
        <div className="mt-3 p-3.5 rounded-lg border border-[#FFB70F]/30 bg-amber-500/5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-[#FFB70F]" />
              Enter 6-digit OTP sent to {phone}
            </span>
          </div>

          <div className="flex items-center gap-2 justify-between max-w-xs">
            {otp.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => {
                  inputRefs.current[idx] = el
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                disabled={disabled || verifyBusy}
                className="w-10 h-11 text-center font-bold text-base rounded-md border border-input bg-background focus:border-[#FFB70F] focus:ring-2 focus:ring-[#FFB70F]/30 outline-none transition-all"
              />
            ))}
            <Button
              type="button"
              onClick={verifyOtp}
              disabled={otp.join("").length < DIGITS || verifyBusy || disabled}
              className="bg-[#FFB70F] hover:bg-[#E5A40E] text-black font-semibold text-xs px-3.5 h-11 shrink-0"
            >
              {verifyBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
            </Button>
          </div>
        </div>
      )}

      {msg && <p className="text-xs text-emerald-600 font-medium mt-1">{msg}</p>}
      {err && <p className="text-xs text-red-500 font-medium mt-1">{err}</p>}
    </div>
  )
}

