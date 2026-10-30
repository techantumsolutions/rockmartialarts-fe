"use client"

import Link from "next/link"
import { FormEvent, useCallback, useEffect, useRef, useState } from "react"
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  LogOut,
  Ticket,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatEventFee } from "@/lib/academyEventAPI"
import {
  academyEventRegistrationAPI,
  clearEventRegOtpToken,
  getEventRegOtpToken,
  isEventRegAuthError,
  registrationStatusLabel,
  toEventRegApiPhone,
  type AcademyEventRegistration,
} from "@/lib/academyEventRegistrationAPI"
import { openRazorpayCheckout } from "@/lib/razorpay"
import { TokenManager } from "@/lib/tokenManager"

const DIGITS = 6
const fieldClass =
  "h-12 px-4 rounded-xl bg-gray-950/70 border border-gray-700/80 text-white placeholder:text-gray-500 hover:border-gray-500 focus:border-[#FFB70F] focus-visible:border-[#FFB70F] focus-visible:ring-1 focus-visible:ring-[#FFB70F] focus-visible:ring-offset-0 transition-all duration-200 text-sm shadow-inner"

const otpFieldClass =
  "h-12 w-11 rounded-xl bg-gray-950/70 border border-gray-700/80 text-white text-center px-0 hover:border-gray-500 focus:border-[#FFB70F] focus-visible:border-[#FFB70F] focus-visible:ring-1 focus-visible:ring-[#FFB70F] focus-visible:ring-offset-0 transition-all duration-200 text-base font-semibold shadow-inner"

function formatWhen(iso?: string | null) {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

export default function MyEventRegistrationsPage() {
  const [phoneInput, setPhoneInput] = useState("")
  const [otp, setOtp] = useState<string[]>(() => Array(DIGITS).fill(""))
  const [otpSent, setOtpSent] = useState(false)
  const [verified, setVerified] = useState(false)
  const [authVia, setAuthVia] = useState<string | null>(null)
  const [maskedPhone, setMaskedPhone] = useState<string | null>(null)
  const [regs, setRegs] = useState<AcademyEventRegistration[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [payingId, setPayingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [temporaryError, setTemporaryError] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const apiPhone = toEventRegApiPhone(phoneInput)
  const national = apiPhone.startsWith("+91") ? apiPhone.slice(3) : phoneInput.replace(/\D/g, "").slice(-10)
  const readyForOtp = /^[6-9]\d{9}$/.test(national)

  const loadInitial = useCallback(async () => {
    setLoading(true)
    setError(null)
    setTemporaryError(false)

    const isUserAuthenticated = TokenManager.isAuthenticated()

    // 1. If signed in, try account authentication first as today
    if (isUserAuthenticated) {
      try {
        const accountData = await academyEventRegistrationAPI.listMine(null)
        const accountRegs = accountData.registrations || []

        if (accountRegs.length > 0) {
          setRegs(accountRegs)
          setVerified(true)
          setAuthVia(accountData.auth_via || "account")
          if (accountData.phone) {
            const n = accountData.phone.replace(/\D/g, "").slice(-10)
            setMaskedPhone(n.length >= 4 ? `******${n.slice(-4)}` : accountData.phone)
          }
          setLoading(false)
          return
        }

        // Account request succeeded with no registrations (0 registrations):
        // Requirement 4: try the saved OTP token before showing the empty state.
        const stored = getEventRegOtpToken()
        if (stored) {
          try {
            const otpData = await academyEventRegistrationAPI.listMine(stored)
            const otpRegs = otpData.registrations || []

            if (otpRegs.length > 0) {
              setRegs(otpRegs)
              setVerified(true)
              setAuthVia(otpData.auth_via || "otp")
              if (otpData.phone) {
                const n = otpData.phone.replace(/\D/g, "").slice(-10)
                setMaskedPhone(n.length >= 4 ? `******${n.slice(-4)}` : otpData.phone)
              }
              setLoading(false)
              return
            }
          } catch (otpErr) {
            if (isEventRegAuthError(otpErr)) {
              // Server confirmed token is invalid or expired
              clearEventRegOtpToken()
            } else {
              // Temporary failure: retain token, show clear retryable error
              setError(
                otpErr instanceof Error
                  ? otpErr.message
                  : "Unable to load saved event registrations. Please check your connection and try again."
              )
              setTemporaryError(true)
              setLoading(false)
              return
            }
          }
        }

        // Account succeeded with 0 registrations, and either no stored OTP token
        // or stored OTP token also had 0 registrations / was invalid:
        setRegs([])
        setVerified(true)
        setAuthVia(accountData.auth_via || "account")
        if (accountData.phone) {
          const n = accountData.phone.replace(/\D/g, "").slice(-10)
          setMaskedPhone(n.length >= 4 ? `******${n.slice(-4)}` : accountData.phone)
        }
        setLoading(false)
        return
      } catch (accountErr) {
        if (!isEventRegAuthError(accountErr)) {
          // Temporary network or server error on account check
          const stored = getEventRegOtpToken()
          if (!stored) {
            setError(
              accountErr instanceof Error
                ? accountErr.message
                : "Unable to load registrations. Please check your connection and try again."
            )
            setTemporaryError(true)
            setLoading(false)
            return
          }
        }
        // If account auth returned 401/403 (e.g. no phone on account), proceed to stored OTP token below
      }
    }

    // 2. Try stored OTP token
    const stored = getEventRegOtpToken()
    if (stored) {
      try {
        const otpData = await academyEventRegistrationAPI.listMine(stored)
        setRegs(otpData.registrations || [])
        setVerified(true)
        setAuthVia(otpData.auth_via || "otp")
        if (otpData.phone) {
          const n = otpData.phone.replace(/\D/g, "").slice(-10)
          setMaskedPhone(n.length >= 4 ? `******${n.slice(-4)}` : otpData.phone)
        }
      } catch (err) {
        if (isEventRegAuthError(err)) {
          // Server confirmed token is invalid or expired
          clearEventRegOtpToken()
          setVerified(false)
          setRegs([])
        } else {
          // Temporary failure (network error, 500, etc.)
          // Requirement 3: retain token, show clear retryable error, do not silently log out
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load registrations. Please check your connection and try again."
          )
          setTemporaryError(true)
        }
      } finally {
        setLoading(false)
      }
      return
    }

    // 3. No account registrations and no stored OTP token
    setVerified(false)
    setRegs([])
    setLoading(false)
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      await loadInitial()
    })()
    return () => {
      cancelled = true
    }
  }, [loadInitial])

  const sendOtp = async () => {
    if (!readyForOtp) {
      setError("Enter a valid 10-digit Indian mobile number.")
      return
    }
    setBusy(true)
    setError(null)
    setTemporaryError(false)
    setMsg(null)
    try {
      await academyEventRegistrationAPI.sendOtp(apiPhone)
      setOtpSent(true)
      setMsg("OTP sent. Check your SMS.")
      setOtp(Array(DIGITS).fill(""))
      inputRefs.current[0]?.focus()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send OTP")
    } finally {
      setBusy(false)
    }
  }

  const verifyOtp = async () => {
    const code = otp.join("")
    if (code.length < DIGITS) {
      setError(`Enter all ${DIGITS} digits from your SMS.`)
      return
    }
    setBusy(true)
    setError(null)
    setTemporaryError(false)
    try {
      const data = await academyEventRegistrationAPI.verifyOtp(apiPhone, code)
      setMsg(null)
      const mineData = await academyEventRegistrationAPI.listMine(data.verification_token)
      setRegs(mineData.registrations || [])
      setVerified(true)
      setAuthVia(mineData.auth_via || "otp")
      if (mineData.phone) {
        const n = mineData.phone.replace(/\D/g, "").slice(-10)
        setMaskedPhone(n.length >= 4 ? `******${n.slice(-4)}` : mineData.phone)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid OTP")
    } finally {
      setBusy(false)
    }
  }

  const onVerifySubmit = (e: FormEvent) => {
    e.preventDefault()
    void verifyOtp()
  }

  const signOutLookup = () => {
    clearEventRegOtpToken()
    setVerified(false)
    setRegs([])
    setAuthVia(null)
    setMaskedPhone(null)
    setOtpSent(false)
    setOtp(Array(DIGITS).fill(""))
    setMsg(null)
    setError(null)
    setTemporaryError(false)
  }

  const resumePayment = async (reg: AcademyEventRegistration) => {
    setPayingId(reg.id)
    setError(null)
    try {
      const orderRes = await academyEventRegistrationAPI.createOrder(reg.id)
      await openRazorpayCheckout({
        amountPaise: orderRes.order.amount,
        razorpayKeyId: orderRes.key || undefined,
        orderId: orderRes.order.id,
        currency: orderRes.order.currency || "INR",
        name: "Rock Martial Arts",
        description: reg.event_title || "Event registration",
        customerName: reg.participant_name,
        customerEmail: reg.participant_email || undefined,
        customerContact: reg.participant_phone,
        onSuccess: async (response) => {
          try {
            await academyEventRegistrationAPI.verifyPayment(reg.id, {
              razorpay_order_id:
                response.razorpay_order_id || orderRes.order.id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature || "",
            })
            await loadInitial()
          } catch (err) {
            setError(
              err instanceof Error ? err.message : "Payment verification failed"
            )
          } finally {
            setPayingId(null)
          }
        },
        onDismiss: () => {
          setPayingId(null)
          setError("Payment cancelled. You can try again anytime.")
        },
        onPaymentFailure: async (message) => {
          try {
            await academyEventRegistrationAPI.markPaymentFailed(reg.id)
          } catch {
            /* ignore */
          }
          setPayingId(null)
          setError(message || "Payment failed. Please try again.")
        },
      })
    } catch (e) {
      setPayingId(null)
      setError(e instanceof Error ? e.message : "Could not start payment")
    }
  }

  return (
    <main className="min-h-screen bg-[#171A26]">
      <section
        className="relative py-16 md:py-20 bg-cover bg-center"
        style={{ backgroundImage: "url(/assets/img/banner.jpg)" }}
      >
        <div className="absolute inset-0 bg-black/60" />
        <div className="container relative z-10 mx-auto px-4 max-w-3xl">
          <Link
            href="/events"
            className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-[#FFB70F] mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            All events
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold text-white uppercase mb-2">
            My Event Registrations
          </h1>
          <p className="text-gray-200">
            Verify your mobile number to view and manage your event, seminar, and
            workshop registrations.
          </p>
        </div>
      </section>

      <section className="py-10 md:py-14">
        <div className="container mx-auto px-4 max-w-3xl space-y-6">
          {error && !temporaryError ? (
            <div className="rounded-md border border-red-800/60 bg-red-950/40 text-red-200 px-3 py-2 text-sm">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-[#FFB70F]" />
            </div>
          ) : temporaryError ? (
            <div className="rounded-2xl border border-gray-800/80 bg-gray-900/60 p-6 sm:p-8 space-y-4 text-center shadow-xl backdrop-blur-sm">
              <div className="rounded-md border border-red-800/60 bg-red-950/40 text-red-200 px-4 py-3 text-sm text-left">
                {error || "Unable to load registrations due to a connection or server error."}
              </div>
              <p className="text-sm text-gray-300">
                Your session is saved. Please check your connection and try again.
              </p>
              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <Button
                  type="button"
                  onClick={() => void loadInitial()}
                  className="bg-[#FFB70F] hover:bg-[#e0a00d] text-black font-semibold"
                >
                  Try again
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={signOutLookup}
                  className="border-gray-600 text-white"
                >
                  Verify a different number
                </Button>
              </div>
            </div>
          ) : !verified ? (
            <div className="rounded-2xl border border-gray-800/80 bg-gray-900/60 p-6 sm:p-8 space-y-5 shadow-xl backdrop-blur-sm">
              <h2 className="text-lg font-semibold text-white">
                Verify with OTP
              </h2>
              <p className="text-sm text-gray-400">
                Use the same mobile number you registered with.{" "}
                {TokenManager.isAuthenticated()
                  ? "If your student account has that number, we can also match it after sign-in."
                  : null}
              </p>
              <div className="space-y-2">
                <Label className="block text-sm font-semibold text-gray-200 tracking-wide">
                  Mobile number
                </Label>
                <Input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  pattern="[0-9]*"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="Enter 10-digit mobile number"
                  className={fieldClass}
                />
              </div>
              <Button
                type="button"
                disabled={busy || !readyForOtp}
                onClick={() => void sendOtp()}
                className="bg-[#FFB70F] hover:bg-[#e0a00d] text-black"
              >
                {busy && !otpSent ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                {otpSent ? "Resend OTP" : "Send OTP"}
              </Button>
              {msg ? <p className="text-sm text-green-400">{msg}</p> : null}

              {otpSent ? (
                <form onSubmit={onVerifySubmit} className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label className="block text-sm font-semibold text-gray-200 tracking-wide">
                      Enter OTP
                    </Label>
                    <div className="flex gap-2">
                      {otp.map((d, i) => (
                        <Input
                          key={i}
                          ref={(el) => {
                            inputRefs.current[i] = el
                          }}
                          inputMode="numeric"
                          maxLength={1}
                          value={d}
                          onChange={(e) => {
                            const v = e.target.value.replace(/\D/g, "").slice(-1)
                            const next = [...otp]
                            next[i] = v
                            setOtp(next)
                            if (v && i < DIGITS - 1) inputRefs.current[i + 1]?.focus()
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Backspace" && !otp[i] && i > 0) {
                              inputRefs.current[i - 1]?.focus()
                            }
                          }}
                          className={otpFieldClass}
                        />
                      ))}
                    </div>
                  </div>
                  <Button
                    type="submit"
                    disabled={busy}
                    className="bg-[#FFB70F] hover:bg-[#e0a00d] text-black"
                  >
                    {busy ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : null}
                    Verify &amp; view registrations
                  </Button>
                </form>
              ) : null}
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <CheckCircle2 className="w-4 h-4 text-[#FFB70F]" />
                  {maskedPhone ? (
                    <span>
                      Showing registrations for {maskedPhone}
                      {authVia === "account" ? " (account)" : " (OTP)"}
                    </span>
                  ) : (
                    <span>Verified</span>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-gray-600 text-white gap-1.5"
                  onClick={signOutLookup}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Switch number
                </Button>
              </div>

              {regs.length === 0 ? (
                <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-8 text-center space-y-3">
                  <Ticket className="w-10 h-10 text-gray-600 mx-auto" />
                  <p className="text-gray-400">
                    No event registrations found for this number.
                  </p>
                  <Button
                    asChild
                    className="bg-[#FFB70F] text-black font-semibold hover:bg-black hover:text-white transition-colors"
                  >
                    <Link href="/events">Browse events</Link>
                  </Button>
                </div>
              ) : (
                <ul className="space-y-4">
                  {regs.map((r) => (
                    <li
                      key={r.id}
                      className="rounded-xl border border-gray-800 bg-gray-900/50 p-5 space-y-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3 className="text-lg font-semibold text-white">
                            {r.event_title || "Event"}
                          </h3>
                          <p className="text-sm text-gray-400">
                            {formatWhen(r.event_start_at) || "Date TBA"}
                            {r.event_venue ? ` · ${r.event_venue}` : ""}
                          </p>
                        </div>
                        <span className="text-xs uppercase tracking-wide text-[#FFB70F]">
                          {registrationStatusLabel(r.status)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-300 space-y-1">
                        <p>Participant: {r.participant_name}</p>
                        <p>Fee: {formatEventFee(r.fee_inr)}</p>
                        {r.razorpay_payment_id ? (
                          <p className="text-xs text-gray-500 break-all">
                            Payment: {r.razorpay_payment_id}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {r.event_slug ? (
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="border-gray-600 text-white"
                          >
                            <Link href={`/events/${r.event_slug}`}>
                              Event details
                            </Link>
                          </Button>
                        ) : null}
                        {r.status === "pending_payment" ? (
                          <Button
                            size="sm"
                            disabled={payingId === r.id}
                            className="bg-[#FFB70F] hover:bg-[#e0a00d] text-black"
                            onClick={() => void resumePayment(r)}
                          >
                            {payingId === r.id ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-1" />
                            ) : null}
                            Complete payment
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  )
}
