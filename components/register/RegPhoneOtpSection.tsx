"use client"

import type React from "react"
import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CheckCircle2 } from "lucide-react"

const DIGITS = 6

function formatApiDetail(data: unknown): string {
  if (!data || typeof data !== "object") return "Request failed"
  const d = (data as { detail?: unknown }).detail
  let s: string
  if (typeof d === "string") s = d
  else if (Array.isArray(d)) {
    s = d.map((x) => (typeof x === "object" && x && "msg" in x ? String((x as { msg?: string }).msg) : String(x))).join(", ")
  } else return "Request failed"
  if (/otp expired|expired.*resend/i.test(s)) return "OTP expired. Please resend."
  return s
}

type Props = {
  /** E.164 Indian mobile for OTP APIs: +91XXXXXXXXXX */
  apiPhone: string
  /** 10-digit Indian mobile for masking (national part only) */
  normalizedMobile: string
  /** True when number is valid, not duplicate, and existence check finished */
  readyForOtp: boolean
  isVerified: boolean
  onVerified: (token: string) => void
}

export function RegPhoneOtpSection({
  apiPhone,
  normalizedMobile,
  readyForOtp,
  isVerified,
  onVerified,
}: Props) {
  const [otp, setOtp] = useState<string[]>(() => Array(DIGITS).fill(""))
  const [sendBusy, setSendBusy] = useState(false)
  const [verifyBusy, setVerifyBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const masked =
    normalizedMobile.length >= 4 ? `******${normalizedMobile.slice(-4)}` : normalizedMobile

  const sendOtp = async () => {
    if (!readyForOtp || !apiPhone) return
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
        setErr(formatApiDetail(data))
        return
      }
      setMsg("OTP sent. Check your SMS.")
      setOtp(Array(DIGITS).fill(""))
      inputRefs.current[0]?.focus()
    } catch {
      setErr("Network error sending OTP.")
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

  const verifyOtp = async () => {
    const code = otp.join("")
    if (code.length < DIGITS) {
      setErr(`Enter all ${DIGITS} digits from your SMS.`)
      return
    }
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
        setErr(formatApiDetail(data))
        return
      }
      const token = data?.verification_token as string | undefined
      if (!token) {
        setErr("Invalid server response.")
        return
      }
      setMsg(null)
      onVerified(token)
    } catch {
      setErr("Network error. Try again.")
    } finally {
      setVerifyBusy(false)
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      e.stopPropagation()
      void verifyOtp()
      return
    }
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  if (!readyForOtp) {
    return null
  }

  if (isVerified) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 flex items-center gap-2 text-green-800 text-sm">
        <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
        <span>
          Mobile <span className="font-medium">{masked}</span> verified. You can continue to the next step.
        </span>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-[#F9F8FF] p-2.5 space-y-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-black">Verify mobile number</p>
          <p className="text-xs text-gray-600 mt-0.5">We’ll send a one-time code to {masked}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={sendOtp}
          disabled={sendBusy}
          className="shrink-0 h-9 border-yellow-400 text-black hover:bg-yellow-50"
        >
          {sendBusy ? "Sending…" : "Send OTP"}
        </Button>
      </div>

      {msg && <p className="text-xs text-green-700">{msg}</p>}
      {err && <p className="text-xs text-red-600">{err}</p>}

      <div className="space-y-2">
        <p className="text-xs text-gray-500">Enter the code from SMS</p>
        <div className="flex justify-start gap-1.5 flex-wrap">
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
              className="w-9 h-10 sm:w-10 sm:h-10 text-center text-base font-bold bg-white border-gray-200 rounded-lg focus:border-yellow-400 focus:ring-yellow-400"
              autoComplete="one-time-code"
            />
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <Button
            type="button"
            size="sm"
            disabled={verifyBusy}
            onClick={() => void verifyOtp()}
            className="h-9 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold"
          >
            {verifyBusy ? "Verifying…" : "Verify OTP"}
          </Button>
          <button
            type="button"
            onClick={sendOtp}
            disabled={sendBusy}
            className="text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
          >
            {sendBusy ? "Sending…" : "Resend OTP"}
          </button>
        </div>
      </div>
    </div>
  )
}
