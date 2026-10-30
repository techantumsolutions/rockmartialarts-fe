"use client"
import Link from "next/link"
import { FormEvent, useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  academyEventAPI,
  formatEventFee,
  type AcademyEvent,
  type AcademyEventRegistrationField,
} from "@/lib/academyEventAPI"
import {
  academyEventRegistrationAPI,
  registrationStatusLabel,
  type AcademyEventRegistration,
} from "@/lib/academyEventRegistrationAPI"
import { openRazorpayCheckout } from "@/lib/razorpay"

const EMPTY = {
  participant_name: "",
  participant_phone: "",
  participant_email: "",
  participant_age: "",
  notes: "",
}

const getFieldClass = (hasError?: boolean) =>
  hasError
    ? "h-12 px-4 rounded-xl bg-gray-950/70 border border-red-500/80 text-white placeholder:text-gray-500 focus:border-red-500 focus-visible:border-red-500 focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:ring-offset-0 transition-all duration-200 text-sm shadow-inner"
    : "h-12 px-4 rounded-xl bg-gray-950/70 border border-gray-700/80 text-white placeholder:text-gray-500 hover:border-gray-500 focus:border-[#FFB70F] focus-visible:border-[#FFB70F] focus-visible:ring-1 focus-visible:ring-[#FFB70F] focus-visible:ring-offset-0 transition-all duration-200 text-sm shadow-inner"

const getTextareaClass = (hasError?: boolean) =>
  hasError
    ? "p-3.5 rounded-xl bg-gray-950/70 border border-red-500/80 text-white placeholder:text-gray-500 focus:border-red-500 focus-visible:border-red-500 focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:ring-offset-0 transition-all duration-200 text-sm shadow-inner resize-y"
    : "p-3.5 rounded-xl bg-gray-950/70 border border-gray-700/80 text-white placeholder:text-gray-500 hover:border-gray-500 focus:border-[#FFB70F] focus-visible:border-[#FFB70F] focus-visible:ring-1 focus-visible:ring-[#FFB70F] focus-visible:ring-offset-0 transition-all duration-200 text-sm shadow-inner resize-y"

const getFieldPlaceholder = (field: AcademyEventRegistrationField) => {
  switch (field.key) {
    case "participant_name":
      return "Enter full name"
    case "participant_phone":
      return "Enter mobile number"
    case "participant_email":
      return "Enter email address"
    case "participant_age":
      return "Enter age"
    case "notes":
      return "Enter notes or special requests"
    default:
      return `Enter ${field.label.replace(/\s*\*$/, "").trim().toLowerCase()}`
  }
}

function validateEventField(field: AcademyEventRegistrationField, value: string): string | undefined {
  const trimmed = (value || "").trim()
  if (field.required && !trimmed) {
    return `${field.label.replace(/\s*\*$/, "").trim()} is required`
  }
  if (!trimmed) return undefined

  if (field.key === "participant_name") {
    if (trimmed.length < 2) return "Full name must be at least 2 characters"
    if (!/^[a-zA-Z\s.'-]+$/.test(trimmed)) return "Please enter a valid name (letters only)"
  } else if (field.key === "participant_phone" || field.field_type === "phone") {
    if (trimmed.length < 10) return "Please enter a complete 10-digit mobile number"
    if (!/^[6-9]\d{9}$/.test(trimmed)) {
      return "Enter a valid 10-digit mobile number"
    }
  } else if (field.key === "participant_email" || field.field_type === "email") {
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmed)) {
      return "Please enter a valid email address (e.g. name@example.com)"
    }
  } else if (field.key === "participant_age" || field.field_type === "number") {
    const n = Number(trimmed)
    if (!Number.isInteger(n) || n < 3 || n > 120) {
      return "Age must be between 3 and 120"
    }
  } else if (field.key === "notes" || field.field_type === "textarea") {
    if (value.length > 500) {
      return "Notes cannot exceed 500 characters"
    }
  }
  return undefined
}

export default function EventRegisterPage() {
  const params = useParams()
  const slug = String(params?.slug || "")
  const [event, setEvent] = useState<AcademyEvent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ ...EMPTY })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [submitting, setSubmitting] = useState(false)
  const [paying, setPaying] = useState(false)
  const [confirmed, setConfirmed] = useState<AcademyEventRegistration | null>(
    null
  )
  const [pending, setPending] = useState<AcademyEventRegistration | null>(null)

  const fields: AcademyEventRegistrationField[] = useMemo(() => {
    const raw = event?.registration_fields
    if (Array.isArray(raw) && raw.length) {
      return raw.filter((f) => f.enabled !== false)
    }
    return [
      {
        key: "participant_name",
        label: "Full name",
        field_type: "text",
        required: true,
        enabled: true,
      },
      {
        key: "participant_phone",
        label: "Mobile number",
        field_type: "phone",
        required: true,
        enabled: true,
      },
      {
        key: "participant_email",
        label: "Email",
        field_type: "email",
        required: false,
        enabled: true,
      },
      {
        key: "participant_age",
        label: "Age",
        field_type: "number",
        required: false,
        enabled: true,
      },
      {
        key: "notes",
        label: "Notes / special requests",
        field_type: "textarea",
        required: false,
        enabled: true,
      },
    ]
  }, [event])

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    setError(null)
    academyEventAPI
      .getPublic(slug)
      .then((data) => setEvent(data.event))
      .catch((e) => {
        setEvent(null)
        setError(e instanceof Error ? e.message : "Event not found")
      })
      .finally(() => setLoading(false))
  }, [slug])

  const handleFieldChange = (key: string, value: string, fieldObj?: AcademyEventRegistrationField) => {
    let sanitized = value
    if (key === "participant_phone" || fieldObj?.field_type === "phone") {
      sanitized = value.replace(/\D/g, "").slice(0, 10)
    } else if (key === "participant_email" || fieldObj?.field_type === "email") {
      sanitized = value.replace(/\s/g, "")
    }
    setForm((prev) => ({ ...prev, [key]: sanitized }))
    if (touched[key] && fieldObj) {
      const err = validateEventField(fieldObj, sanitized)
      setFieldErrors((prev) => {
        const next = { ...prev }
        if (err) next[key] = err
        else delete next[key]
        return next
      })
    }
  }

  const handleFieldBlur = (key: string, fieldObj: AcademyEventRegistrationField) => {
    const currentVal = (form as Record<string, string>)[key] || ""
    setTouched((prev) => ({ ...prev, [key]: true }))
    const err = validateEventField(fieldObj, currentVal)
    setFieldErrors((prev) => {
      const next = { ...prev }
      if (err) next[key] = err
      else delete next[key]
      return next
    })
  }

  const startPayment = async (registration: AcademyEventRegistration) => {
    setPaying(true)
    setError(null)
    try {
      const orderRes = await academyEventRegistrationAPI.createOrder(
        registration.id
      )
      await openRazorpayCheckout({
        amountPaise: orderRes.order.amount,
        razorpayKeyId: orderRes.key || undefined,
        orderId: orderRes.order.id,
        currency: orderRes.order.currency || "INR",
        name: "Rock Martial Arts",
        description: event?.title || "Event registration",
        customerName: registration.participant_name,
        customerEmail: registration.participant_email || undefined,
        customerContact: registration.participant_phone,
        onSuccess: async (response) => {
          try {
            const verified = await academyEventRegistrationAPI.verifyPayment(
              registration.id,
              {
                razorpay_order_id:
                  response.razorpay_order_id || orderRes.order.id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature || "",
              }
            )
            setConfirmed(verified.registration)
            setPending(null)
            setForm({ ...EMPTY })
            setFieldErrors({})
            setTouched({})
          } catch (err) {
            setError(
              err instanceof Error ? err.message : "Payment verification failed"
            )
            setPending(registration)
          } finally {
            setPaying(false)
          }
        },
        onDismiss: () => {
          setPaying(false)
          setPending(registration)
          setError(
            "Payment was cancelled. You can try again while the seat is held briefly."
          )
        },
        onPaymentFailure: async (message) => {
          try {
            await academyEventRegistrationAPI.markPaymentFailed(registration.id)
          } catch {
            /* ignore */
          }
          setPaying(false)
          setPending(registration)
          setError(message || "Payment failed. Please try again.")
        },
      })
    } catch (e) {
      setPaying(false)
      setError(e instanceof Error ? e.message : "Could not start payment")
      setPending(registration)
    }
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!event) return
    setError(null)

    const allTouched: Record<string, boolean> = {}
    const errors: Record<string, string> = {}

    for (const f of fields) {
      allTouched[f.key] = true
      const val = (form as Record<string, string>)[f.key] || ""
      const err = validateEventField(f, val)
      if (err) errors[f.key] = err
    }

    setTouched(allTouched)
    setFieldErrors(errors)

    if (Object.keys(errors).length > 0) {
      const firstError = Object.values(errors)[0]
      setError(firstError || "Please fill in the required fields correctly.")
      return
    }

    setSubmitting(true)
    try {
      const ageRaw = form.participant_age.trim()
      const age = ageRaw ? parseInt(ageRaw, 10) : undefined
      const result = await academyEventRegistrationAPI.create({
        event_slug: event.slug || slug,
        event_id: event.id,
        participant_name: form.participant_name.trim(),
        participant_phone: form.participant_phone.trim(),
        participant_email: form.participant_email.trim() || undefined,
        participant_age: age && !Number.isNaN(age) ? age : undefined,
        notes: form.notes.trim() || undefined,
        source: "website",
      })
      if (result.payment_required) {
        setPending(result.registration)
        await startPayment(result.registration)
      } else {
        setConfirmed(result.registration)
        setPending(null)
        setForm({ ...EMPTY })
        setFieldErrors({})
        setTouched({})
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed")
    } finally {
      setSubmitting(false)
    }
  }

  if (confirmed) {
    return (
      <main className="min-h-screen bg-[#171A26]">
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4 max-w-xl">
            <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center space-y-4">
              <CheckCircle2 className="w-14 h-14 text-[#FFB70F] mx-auto" />
              <h1 className="text-2xl font-bold text-white">
                Registration confirmed
              </h1>
              <p className="text-gray-300">
                You are registered for{" "}
                <span className="text-white font-medium">
                  {confirmed.event_title || event?.title || "the event"}
                </span>
                .
              </p>
              <div className="text-sm text-gray-400 space-y-1 text-left bg-black/20 rounded-lg p-4">
                <p>Participant: {confirmed.participant_name}</p>
                <p>Status: {registrationStatusLabel(confirmed.status)}</p>
                {confirmed.razorpay_payment_id ? (
                  <p className="text-xs break-all">
                    Payment ID: {confirmed.razorpay_payment_id}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <Button
                  asChild
                  className="bg-[#FFB70F] hover:bg-[#e0a00d] text-black"
                >
                  <Link href="/events/my-registrations">
                    View my registrations
                  </Link>
                </Button>
                {event?.slug ? (
                  <Button
                    asChild
                    variant="outline"
                    className="border-gray-600 text-white"
                  >
                    <Link href={`/events/${event.slug}`}>Back to event</Link>
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#171A26]">
      <section className="py-10 md:py-16">
        <div className="container mx-auto px-4 max-w-xl space-y-6">
          <Link
            href={event?.slug ? `/events/${event.slug}` : "/events"}
            className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-[#FFB70F]"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to event
          </Link>
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-[#FFB70F]" />
            </div>
          ) : !event ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-gray-300">
              Event not found.
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-800/80 bg-gray-900/60 p-6 sm:p-8 space-y-6 shadow-xl backdrop-blur-sm">
              <div>
                <h1 className="text-2xl font-bold text-white mb-2">
                  Register — {event.title}
                </h1>
                <p className="text-sm text-gray-300">
                  Fee:{" "}
                  <span className="text-[#FFB70F] font-semibold">
                    {formatEventFee(event.fee_inr)}
                  </span>
                  {typeof event.capacity === "number" ? (
                    <span className="text-gray-400 ml-2">
                      ·{" "}
                      {Math.max(
                        0,
                        event.capacity - (event.registrations_count || 0)
                      )}{" "}
                      seats left
                    </span>
                  ) : null}
                </p>
              </div>
              {error ? (
                <div className="rounded-md border border-red-800/60 bg-red-950/40 text-red-200 px-3 py-2 text-sm">
                  {error}
                </div>
              ) : null}
              {pending ? (
                <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200 space-y-2">
                  <p>
                    Seat held pending payment for {pending.participant_name}.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    className="bg-[#FFB70F] hover:bg-[#e0a00d] text-black"
                    disabled={paying}
                    onClick={() => void startPayment(pending)}
                  >
                    {paying ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : null}
                    Resume payment
                  </Button>
                </div>
              ) : null}
              <form onSubmit={onSubmit} noValidate className="space-y-5">
                {fields.map((f) => {
                  const value = (form as Record<string, string>)[f.key] || ""
                  const hasErr = !!(touched[f.key] && fieldErrors[f.key])

                  if (f.field_type === "textarea") {
                    return (
                      <div key={f.key} className="space-y-2">
                        <Label className="block text-sm font-semibold text-gray-200 tracking-wide">
                          {f.label}
                          {f.required ? (
                            <span className="text-[#FFB70F] ml-1 font-bold" title="Required">*</span>
                          ) : null}
                        </Label>
                        <Textarea
                          rows={3}
                          value={value}
                          onChange={(e) => handleFieldChange(f.key, e.target.value, f)}
                          onBlur={() => handleFieldBlur(f.key, f)}
                          placeholder={getFieldPlaceholder(f)}
                          className={getTextareaClass(hasErr)}
                        />
                        {hasErr ? (
                          <p className="text-xs text-red-400 mt-1">{fieldErrors[f.key]}</p>
                        ) : null}
                      </div>
                    )
                  }
                  return (
                    <div key={f.key} className="space-y-2">
                      <Label className="block text-sm font-semibold text-gray-200 tracking-wide">
                        {f.label}
                        {f.required ? (
                          <span className="text-[#FFB70F] ml-1 font-bold" title="Required">*</span>
                        ) : null}
                      </Label>
                      <Input
                        type={
                          f.field_type === "number"
                            ? "number"
                            : f.field_type === "email"
                              ? "email"
                              : f.field_type === "phone"
                                ? "tel"
                                : "text"
                        }
                        inputMode={
                          f.field_type === "phone" || f.key === "participant_phone"
                            ? "numeric"
                            : f.field_type === "email" || f.key === "participant_email"
                              ? "email"
                              : undefined
                        }
                        maxLength={
                          f.field_type === "phone" || f.key === "participant_phone"
                            ? 10
                            : undefined
                        }
                        pattern={
                          f.field_type === "phone" || f.key === "participant_phone"
                            ? "[0-9]*"
                            : undefined
                        }
                        min={f.field_type === "number" ? 1 : undefined}
                        value={value}
                        onChange={(e) => handleFieldChange(f.key, e.target.value, f)}
                        onBlur={() => handleFieldBlur(f.key, f)}
                        placeholder={getFieldPlaceholder(f)}
                        className={getFieldClass(hasErr)}
                      />
                      {hasErr ? (
                        <p className="text-xs text-red-400 mt-1">{fieldErrors[f.key]}</p>
                      ) : null}
                    </div>
                  )
                })}
                <Button
                  type="submit"
                  disabled={submitting || paying}
                  className="w-full h-12 rounded-xl bg-[#FFB70F] hover:bg-[#e0a00d] text-black font-bold text-base shadow-md hover:shadow-lg transition-all active:scale-[0.99] mt-2"
                >
                  {submitting || paying ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  {Number(event.fee_inr || 0) > 0
                    ? `Continue to pay ${formatEventFee(event.fee_inr)}`
                    : "Confirm free registration"}
                </Button>
              </form>
              <p className="text-xs text-gray-500 text-center">
                Need help?{" "}
                <Link
                  href="/request-callback"
                  className="text-[#FFB70F] hover:underline"
                >
                  Request a callback
                </Link>
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
