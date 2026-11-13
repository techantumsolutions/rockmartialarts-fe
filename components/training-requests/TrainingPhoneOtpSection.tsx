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
  label?: string
  placeholder?: string
  className?: string
  fieldClass?: string
}

export function TrainingPhoneOtpSection({
  phone,
  onPhoneChange,
  isVerified,
  onVerified,
  disabled = false,
  required = true,
  label = "Phone number",
  placeholder = "Enter 10-digit mobile number",
  className = "",
  fieldClass = "bg-gray-950/60 border-gray-700 text-white placeholder:text-gray-500 focus-visible:ring-[#FFB70F]",
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
      setMsg("Mobile number successfully verified!")
      setErr(null)
    } catch {
      setErr("Network error while verifying OTP.")
    } finally {
      setVerifyBusy(false)
    }
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <Label htmlFor="contact_phone" className="text-gray-300 text-sm font-medium">
          {label} {required && <span className="text-[#FFB70F]">*</span>}
        </Label>
        {isVerified && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-950/70 px-2.5 py-0.5 rounded-full border border-emerald-700/60 shadow-sm">
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
            placeholder={placeholder}
            value={phone}
            onChange={handlePhoneInputChange}
            disabled={disabled || isVerified}
            className={`h-10 ${fieldClass} ${
              isVerified ? "border-emerald-600/80 bg-emerald-950/20 text-emerald-200" : ""
            }`}
            style={{
              color: isVerified ? "#a7f3d0" : "#ffffff",
              backgroundColor: isVerified ? "rgba(6, 78, 59, 0.2)" : "rgba(3, 7, 18, 0.6)",
            }}
          />
        </div>

        {!isVerified && (
          <Button
            type="button"
            variant="outline"
            onClick={sendOtp}
            disabled={!isValidPhone || sendBusy || countdown > 0 || disabled}
            className="border-[#FFB70F] text-[#FFB70F] hover:bg-[#FFB70F] hover:text-black shrink-0 font-semibold text-xs px-3.5 h-10 transition-colors"
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
        <div className="mt-3 p-4 rounded-xl border border-gray-700 bg-gray-900/90 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-200 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-[#FFB70F]" />
              Enter 6-digit OTP sent to <span className="font-semibold text-white">{phone}</span>
            </span>
          </div>

          <div className="flex items-center gap-2 justify-between max-w-sm">
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
                className="w-11 h-12 text-center font-bold text-xl rounded-lg border-2 border-gray-600 bg-gray-950 text-white focus:border-[#FFB70F] focus:ring-2 focus:ring-[#FFB70F]/50 outline-none transition-all placeholder:text-gray-600 shadow-inner"
                style={{
                  color: "#ffffff",
                  backgroundColor: "#030712",
                  caretColor: "#FFB70F",
                }}
              />
            ))}
            <Button
              type="button"
              onClick={verifyOtp}
              disabled={otp.join("").length < DIGITS || verifyBusy || disabled}
              className="bg-[#FFB70F] hover:bg-[#E5A40E] text-black font-bold text-xs px-4 h-12 rounded-lg shrink-0 shadow-md"
            >
              {verifyBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
            </Button>
          </div>
        </div>
      )}

      {msg && <p className="text-xs text-emerald-400 font-medium mt-1">{msg}</p>}
      {err && <p className="text-xs text-red-400 font-medium mt-1">{err}</p>}
    </div>
  )
}
