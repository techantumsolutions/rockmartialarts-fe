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

const fieldClass =
  "bg-[#0f121c] border-white/15 text-white placeholder:text-gray-500 focus-visible:ring-[#FFB70F]"

export default function EventRegisterPage() {
  const params = useParams()
  const slug = String(params?.slug || "")
  const [event, setEvent] = useState<AcademyEvent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ ...EMPTY })
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

    for (const f of fields) {
      if (!f.required) continue
      const val = (form as Record<string, string>)[f.key]
      if (!val?.trim()) {
        setError(`${f.label} is required`)
        return
      }
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
              <p className="text-gray-300 text-sm">
                You are registered for{" "}
                <span className="text-white font-medium">
                  {confirmed.event_title || event?.title}
                </span>
                . We look forward to seeing you.
              </p>
              <div className="text-sm text-gray-400 space-y-1 text-left bg-black/20 rounded-lg p-4">
                <p>Participant: {confirmed.participant_name}</p>
                <p>Phone: {confirmed.participant_phone}</p>
                {confirmed.participant_email ? (
                  <p>Email: {confirmed.participant_email}</p>
                ) : null}
                <p>Fee: {formatEventFee(confirmed.fee_inr)}</p>
                <p>Status: {registrationStatusLabel(confirmed.status)}</p>
                {confirmed.razorpay_payment_id ? (
                  <p className="text-xs break-all">
                    Payment: {confirmed.razorpay_payment_id}
                  </p>
                ) : null}
                <p className="text-xs text-gray-500 break-all">
                  Ref: {confirmed.id}
                </p>
              </div>
                <div className="flex flex-wrap gap-3 justify-center pt-2">
                <Button
                  asChild
                  className="bg-[#FFB70F] hover:bg-[#e0a00d] text-black"
                >
                  <Link href={`/events/${event?.slug || slug}`}>
                    Back to event
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="border-gray-600 text-white"
                >
                  <Link href="/events/my-registrations">My registrations</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="border-gray-600 text-white"
                >
                  <Link href="/events">Browse events</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#171A26]">
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-xl">
          <Link
            href={event ? `/events/${event.slug || slug}` : "/events"}
            className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-[#FFB70F] mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to event
          </Link>

          {loading ? (
            <Loader2 className="w-8 h-8 animate-spin text-[#FFB70F]" />
          ) : !event ? (
            <div className="space-y-4">
              <p className="text-red-300">{error || "Event not found"}</p>
              <Button asChild className="bg-[#FFB70F] text-black">
                <Link href="/events">Browse events</Link>
              </Button>
            </div>
          ) : !event.registration_open ? (
            <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 space-y-4">
              <h1 className="text-2xl font-bold text-white">
                Registration unavailable
              </h1>
              <p className="text-gray-400 text-sm">
                {event.is_full
                  ? "This event is at full capacity."
                  : "Registration is closed for this event."}
              </p>
              <Button
                asChild
                variant="outline"
                className="border-gray-600 text-white"
              >
                <Link href={`/events/${event.slug || slug}`}>
                  View event details
                </Link>
              </Button>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 space-y-5">
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Register — {event.title}
                </h1>
                <p className="text-gray-300 text-sm mt-2">
                  Fee:{" "}
                  <span className="text-white font-medium">
                    {formatEventFee(event.fee_inr)}
                  </span>
                  {event.seats_remaining != null
                    ? ` · ${event.seats_remaining} seats left`
                    : ""}
                </p>
              </div>

              {error ? (
                <div className="rounded-md border border-red-800/60 bg-red-950/40 text-red-200 px-3 py-2 text-sm">
                  {error}
                </div>
              ) : null}

              {pending ? (
                <div className="rounded-md border border-amber-800/50 bg-amber-950/30 text-amber-100 px-3 py-3 text-sm space-y-2">
                  <p>
                    Seat held pending payment for {pending.participant_name}.
                  </p>
                  <Button
                    type="button"
                    disabled={paying}
                    className="bg-[#FFB70F] hover:bg-[#e0a00d] text-black"
                    onClick={() => void startPayment(pending)}
                  >
                    {paying ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : null}
                    Resume payment
                  </Button>
                </div>
              ) : null}

              <form onSubmit={onSubmit} className="space-y-4">
                {fields.map((f) => {
                  const value = (form as Record<string, string>)[f.key] || ""
                  const setVal = (v: string) =>
                    setForm((prev) => ({ ...prev, [f.key]: v }))
                  if (f.field_type === "textarea") {
                    return (
                      <div key={f.key}>
                        <Label className="text-gray-300">
                          {f.label}
                          {f.required ? " *" : ""}
                        </Label>
                        <Textarea
                          rows={3}
                          value={value}
                          onChange={(e) => setVal(e.target.value)}
                          className={fieldClass}
                        />
                      </div>
                    )
                  }
                  return (
                    <div key={f.key}>
                      <Label className="text-gray-300">
                        {f.label}
                        {f.required ? " *" : ""}
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
                        min={f.field_type === "number" ? 1 : undefined}
                        value={value}
                        onChange={(e) => setVal(e.target.value)}
                        className={fieldClass}
                        required={f.required}
                      />
                    </div>
                  )
                })}

                <Button
                  type="submit"
                  disabled={submitting || paying}
                  className="w-full bg-[#FFB70F] hover:bg-[#e0a00d] text-black"
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
