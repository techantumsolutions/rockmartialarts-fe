"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CheckCircle2 } from "lucide-react"
import { formatApiErrorPayload } from "@/lib/formatApiError"
import { getLeadOtpExpirySeconds } from "@/lib/popupForm"

function otpRequestError(status: number, data: unknown): string {
  if (status === 405 || status === 404) {
    return "OTP service is not available yet. Please try again later."
  }
  return formatApiErrorPayload(data)
}

const DIGITS = 6

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

type Props = {
  apiPhone: string
  normalizedMobile: string
  readyForOtp: boolean
  isVerified: boolean
  onVerified: (token: string) => void
}

export function LeadPhoneOtpSection({
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
  const [expiresIn, setExpiresIn] = useState(0)
  const [otpSent, setOtpSent] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const masked =
    normalizedMobile.length >= 4 ? `******${normalizedMobile.slice(-4)}` : normalizedMobile

  useEffect(() => {
    setOtp(Array(DIGITS).fill(""))
    setMsg(null)
    setErr(null)
    setExpiresIn(0)
    setOtpSent(false)
  }, [apiPhone])

  useEffect(() => {
    if (expiresIn <= 0) return
    const t = setTimeout(() => setExpiresIn((s) => (s <= 1 ? 0 : s - 1)), 1000)
    return () => clearTimeout(t)
  }, [expiresIn])

  useEffect(() => {
    if (isVerified || sendBusy) return
    if (otpSent && expiresIn === 0) {
      setErr("OTP expired. Please resend.")
    }
  }, [otpSent, expiresIn, isVerified, sendBusy])

  const sendOtp = async () => {
    if (!readyForOtp || !apiPhone) return
    setSendBusy(true)
    setErr(null)
    setMsg(null)
    try {
      const res = await fetch("/api/backend/leads/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: apiPhone }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErr(otpRequestError(res.status, data))
        return
      }
      setMsg("OTP sent. Check your SMS.")
      setOtp(Array(DIGITS).fill(""))
      setOtpSent(true)
      setExpiresIn(getLeadOtpExpirySeconds())
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
      const res = await fetch("/api/backend/leads/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: apiPhone, otp: code }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErr(otpRequestError(res.status, data))
        return
      }
      const token = data?.verification_token as string | undefined
      if (!token) {
        setErr("Invalid server response.")
        return
      }
      setMsg(null)
      setExpiresIn(0)
      setOtpSent(false)
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
      <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 flex items-center gap-2 text-green-800 text-sm">
        <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
        <span>
          Mobile <span className="font-medium">{masked}</span> verified.
        </span>
      </div>
    )
  }

  return (
    <div className="rounded-md border border-gray-200 bg-gray-50 p-3 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-gray-900">Verify mobile number</p>
          <p className="text-xs text-gray-600 mt-0.5">We’ll send a one-time code to {masked}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void sendOtp()}
          disabled={sendBusy}
          className="shrink-0"
        >
          {sendBusy ? "Sending…" : expiresIn > 0 ? "Resend OTP" : "Send OTP"}
        </Button>
      </div>

      {expiresIn > 0 ? (
        <p className="text-xs text-gray-600">
          OTP expires in <span className="font-medium tabular-nums">{formatCountdown(expiresIn)}</span>
        </p>
      ) : null}
      {msg ? <p className="text-sm text-green-700">{msg}</p> : null}
      {err ? <p className="text-sm text-red-600">{err}</p> : null}

      <div className="space-y-2">
        <p className="text-xs text-gray-500">Enter the code from SMS</p>
        <div className="flex justify-start gap-2 flex-wrap">
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
              className="w-10 h-11 text-center text-lg font-bold bg-white"
              autoComplete="one-time-code"
            />
          ))}
        </div>
        <Button
          type="button"
          size="sm"
          disabled={verifyBusy || expiresIn <= 0}
          onClick={() => void verifyOtp()}
          className="bg-amber-500 hover:bg-amber-600 text-white"
        >
          {verifyBusy ? "Verifying…" : "Verify OTP"}
        </Button>
      </div>
    </div>
  )
}
