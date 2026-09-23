"use client"

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react"
import { CalendarDays, CheckCircle2, Loader2, MapPin, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { openRazorpayCheckout } from "@/lib/razorpay"
import {
  bookingStatusLabel,
  demoSessionAPI,
  formatSlotDate,
  seatsLabel,
  type DemoAvailabilityOption,
  type DemoBooking,
  type DemoSlot,
} from "@/lib/demoSessionAPI"

function todayISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function plusDaysISO(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

type ParticipantForm = {
  participant_name: string
  participant_phone: string
  participant_email: string
  participant_age: string
  notes: string
}

const EMPTY_PARTICIPANT: ParticipantForm = {
  participant_name: "",
  participant_phone: "",
  participant_email: "",
  participant_age: "",
  notes: "",
}

export default function DemoAvailabilityPublicView() {
  const [branches, setBranches] = useState<DemoAvailabilityOption[]>([])
  const [courses, setCourses] = useState<DemoAvailabilityOption[]>([])
  const [branchId, setBranchId] = useState("all")
  const [courseId, setCourseId] = useState("all")
  const [fromDate, setFromDate] = useState(todayISO)
  const [toDate, setToDate] = useState(plusDaysISO(13))
  const [slots, setSlots] = useState<DemoSlot[]>([])
  const [meta, setMeta] = useState<{ from: string; to: string; timezone: string } | null>(
    null
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<DemoSlot | null>(null)
  const [participant, setParticipant] = useState<ParticipantForm>(EMPTY_PARTICIPANT)
  const [submitting, setSubmitting] = useState(false)
  const [paying, setPaying] = useState(false)
  const [confirmed, setConfirmed] = useState<DemoBooking | null>(null)
  const [pendingBooking, setPendingBooking] = useState<DemoBooking | null>(null)

  const loadOptions = useCallback(async () => {
    try {
      const data = await demoSessionAPI.options()
      setBranches(data.branches || [])
      setCourses(data.courses || [])
    } catch {
      setBranches([])
      setCourses([])
    }
  }, [])

  const loadSlots = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await demoSessionAPI.availability({
        branch_id: branchId !== "all" ? branchId : undefined,
        course_id: courseId !== "all" ? courseId : undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
      })
      setSlots(data.slots || [])
      setMeta({ from: data.from, to: data.to, timezone: data.timezone })
      setSelected((prev) => {
        if (!prev) return null
        const still = (data.slots || []).find(
          (s) =>
            s.schedule_id === prev.schedule_id &&
            s.slot_date === prev.slot_date &&
            s.start_time === prev.start_time
        )
        return still || null
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load availability")
      setSlots([])
      setMeta(null)
    } finally {
      setLoading(false)
    }
  }, [branchId, courseId, fromDate, toDate])

  useEffect(() => {
    loadOptions()
  }, [loadOptions])

  useEffect(() => {
    loadSlots()
  }, [loadSlots])

  const grouped = useMemo(() => {
    const map = new Map<string, DemoSlot[]>()
    for (const slot of slots) {
      const key = slot.slot_date
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(slot)
    }
    return Array.from(map.entries())
  }, [slots])

  const startPayment = async (booking: DemoBooking) => {
    setPaying(true)
    setError(null)
    try {
      const order = await demoSessionAPI.createOrder(booking.id)
      await openRazorpayCheckout({
        amountPaise: order.order.amount,
        razorpayKeyId: order.key,
        orderId: order.order.id,
        currency: order.order.currency || "INR",
        name: "Rock Martial Arts",
        description: `Demo session ${booking.slot_date} ${booking.start_time}`,
        customerName: booking.participant_name,
        customerEmail: booking.participant_email || undefined,
        customerContact: booking.participant_phone,
        onSuccess: async (response) => {
          try {
            const verified = await demoSessionAPI.verifyPayment(booking.id, {
              razorpay_order_id: response.razorpay_order_id || order.order.id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature || "",
            })
            setConfirmed(verified.booking)
            setPendingBooking(null)
            setSelected(null)
            setParticipant(EMPTY_PARTICIPANT)
            await loadSlots()
          } catch (err) {
            setError(err instanceof Error ? err.message : "Payment verification failed")
            setPendingBooking(booking)
          } finally {
            setPaying(false)
          }
        },
        onDismiss: async () => {
          try {
            await demoSessionAPI.markPaymentFailed(booking.id)
          } catch {
            /* ignore */
          }
          setPaying(false)
          setPendingBooking(booking)
          setError("Payment was cancelled. You can try again while the seat is held briefly.")
        },
        onPaymentFailure: async (message) => {
          try {
            await demoSessionAPI.markPaymentFailed(booking.id)
          } catch {
            /* ignore */
          }
          setPaying(false)
          setPendingBooking(booking)
          setError(message || "Payment failed. Please try again.")
        },
      })
    } catch (e) {
      setPaying(false)
      setError(e instanceof Error ? e.message : "Could not start payment")
      setPendingBooking(booking)
    }
  }

  const onBook = async (e: FormEvent) => {
    e.preventDefault()
    if (!selected) return
    setError(null)
    if (!participant.participant_name.trim() || !participant.participant_phone.trim()) {
      setError("Participant name and phone are required")
      return
    }
    setSubmitting(true)
    try {
      const age = participant.participant_age
        ? parseInt(participant.participant_age, 10)
        : undefined
      const result = await demoSessionAPI.createBooking({
        schedule_id: selected.schedule_id,
        slot_date: selected.slot_date,
        start_time: selected.start_time,
        end_time: selected.end_time,
        participant_name: participant.participant_name.trim(),
        participant_phone: participant.participant_phone.trim(),
        participant_email: participant.participant_email.trim() || undefined,
        participant_age: age && !Number.isNaN(age) ? age : undefined,
        notes: participant.notes.trim() || undefined,
        source: "website",
      })
      if (result.payment_required) {
        setPendingBooking(result.booking)
        await startPayment(result.booking)
      } else {
        setConfirmed(result.booking)
        setPendingBooking(null)
        setSelected(null)
        setParticipant(EMPTY_PARTICIPANT)
        await loadSlots()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed")
      await loadSlots()
    } finally {
      setSubmitting(false)
    }
  }

  if (confirmed) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-8 md:p-10 text-center max-w-xl mx-auto space-y-4">
        <CheckCircle2 className="w-14 h-14 text-[#FFB70F] mx-auto" />
        <h2 className="text-2xl font-bold text-white">Demo booking confirmed</h2>
        <p className="text-gray-300">
          See you at the academy — we have reserved your demo seat.
        </p>
        <div className="text-sm text-gray-400 space-y-1 text-left bg-black/20 rounded-lg p-4">
          <p>
            {formatSlotDate(confirmed.slot_date)} · {confirmed.start_time} – {confirmed.end_time}
          </p>
          <p>
            {confirmed.branch_name || "Branch"} · {confirmed.course_name || "Course"}
          </p>
          <p>Participant: {confirmed.participant_name}</p>
          <p>Fee: ₹{confirmed.fee_inr}</p>
          <p>Status: {bookingStatusLabel(confirmed.status)}</p>
          {confirmed.razorpay_payment_id ? (
            <p className="text-xs break-all">Payment: {confirmed.razorpay_payment_id}</p>
          ) : null}
        </div>
        <Button
          type="button"
          className="bg-[#FFB70F] hover:bg-[#e0a00d] text-black"
          onClick={() => {
            setConfirmed(null)
            setError(null)
            loadSlots()
          }}
        >
          Book another demo
        </Button>
      </div>
    )
  }

  const fieldClass =
    "bg-[#0f121c] border-white/15 text-white placeholder:text-gray-500 focus-visible:ring-[#FFB70F]"

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 md:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-white">Find a demo slot</h2>
            <p className="text-sm text-gray-300 mt-1">
              Filter by branch and course, then book and pay securely.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10"
            onClick={() => loadSlots()}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label className="text-gray-300">Branch</Label>
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger className={fieldClass}>
                <SelectValue placeholder="All branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All branches</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-gray-300">Course</Label>
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger className={fieldClass}>
                <SelectValue placeholder="All courses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All courses</SelectItem>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-gray-300">From</Label>
            <Input
              type="date"
              value={fromDate}
              min={todayISO()}
              onChange={(e) => setFromDate(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-gray-300">To</Label>
            <Input
              type="date"
              value={toDate}
              min={fromDate || todayISO()}
              onChange={(e) => setToDate(e.target.value)}
              className={fieldClass}
            />
          </div>
        </div>

        {meta ? (
          <p className="text-xs text-gray-400">
            Showing {meta.from} → {meta.to} ({meta.timezone}) · {slots.length} open slot
            {slots.length === 1 ? "" : "s"}
          </p>
        ) : null}
      </div>

      {error ? (
        <p className="text-sm text-red-400 bg-red-950/40 border border-red-800/40 rounded-lg px-4 py-3">
          {error}
        </p>
      ) : null}

      {pendingBooking && pendingBooking.payment_status === "pending" ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm text-amber-100">
            Booking reserved for {pendingBooking.participant_name}. Complete payment to confirm.
          </p>
          <Button
            type="button"
            className="bg-[#FFB70F] hover:bg-[#e0a00d] text-black"
            disabled={paying}
            onClick={() => startPayment(pendingBooking)}
          >
            {paying ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Opening payment…
              </>
            ) : (
              `Pay ₹${pendingBooking.fee_inr}`
            )}
          </Button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-gray-300">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading availability…
            </div>
          ) : grouped.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/15 px-6 py-14 text-center text-gray-400">
              No bookable demo slots in this range. Try another branch, course, or dates.
            </div>
          ) : (
            grouped.map(([day, daySlots]) => (
              <div key={day} className="space-y-2">
                <div className="flex items-center gap-2 text-white font-medium">
                  <CalendarDays className="w-4 h-4 text-[#FFB70F]" />
                  {formatSlotDate(day)}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {daySlots.map((slot) => {
                    const key = `${slot.schedule_id}-${slot.slot_date}-${slot.start_time}`
                    const isSelected =
                      selected?.schedule_id === slot.schedule_id &&
                      selected?.slot_date === slot.slot_date &&
                      selected?.start_time === slot.start_time
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setSelected(slot)
                          setError(null)
                        }}
                        className={`text-left rounded-lg border px-4 py-3 transition-colors ${
                          isSelected
                            ? "border-[#FFB70F] bg-[#FFB70F]/15"
                            : "border-white/10 bg-white/5 hover:border-white/25"
                        }`}
                      >
                        <div className="flex justify-between gap-2">
                          <span className="text-white font-semibold">
                            {slot.start_time} – {slot.end_time}
                          </span>
                          <span className="text-[#FFB70F] text-sm font-medium">
                            ₹{slot.fee_inr}
                          </span>
                        </div>
                        <div className="mt-1 text-sm text-gray-300 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">
                            {slot.branch_name || "Branch"} · {slot.course_name || "Course"}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-gray-400">{seatsLabel(slot)}</div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-5 h-fit sticky top-24">
          <h3 className="text-lg font-semibold text-white">Book this demo</h3>
          {!selected ? (
            <p className="text-sm text-gray-400 mt-3">
              Choose an available time on the left to enter participant details and pay.
            </p>
          ) : (
            <form onSubmit={onBook} className="mt-4 space-y-3">
              <div className="text-sm text-gray-200 space-y-1 pb-2 border-b border-white/10">
                <p className="text-white font-medium">{formatSlotDate(selected.slot_date)}</p>
                <p>
                  {selected.start_time} – {selected.end_time}
                </p>
                <p>
                  {selected.branch_name} · {selected.course_name}
                </p>
                <p className="text-[#FFB70F]">Fee ₹{selected.fee_inr} (set by academy)</p>
                <p className="text-xs text-gray-400">{seatsLabel(selected)}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-gray-300">Participant name *</Label>
                <Input
                  className={fieldClass}
                  value={participant.participant_name}
                  onChange={(e) =>
                    setParticipant((p) => ({ ...p, participant_name: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-gray-300">Phone *</Label>
                <Input
                  className={fieldClass}
                  value={participant.participant_phone}
                  onChange={(e) =>
                    setParticipant((p) => ({ ...p, participant_phone: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-gray-300">Email</Label>
                <Input
                  type="email"
                  className={fieldClass}
                  value={participant.participant_email}
                  onChange={(e) =>
                    setParticipant((p) => ({ ...p, participant_email: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-gray-300">Age</Label>
                <Input
                  type="number"
                  min={1}
                  max={120}
                  className={fieldClass}
                  value={participant.participant_age}
                  onChange={(e) =>
                    setParticipant((p) => ({ ...p, participant_age: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-gray-300">Notes</Label>
                <Textarea
                  className={fieldClass}
                  rows={2}
                  value={participant.notes}
                  onChange={(e) => setParticipant((p) => ({ ...p, notes: e.target.value }))}
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-[#FFB70F] hover:bg-[#e0a00d] text-black"
                disabled={submitting || paying}
              >
                {submitting || paying ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {paying ? "Opening payment…" : "Reserving…"}
                  </>
                ) : selected.fee_inr >= 1 ? (
                  `Reserve & pay ₹${selected.fee_inr}`
                ) : (
                  "Confirm free demo"
                )}
              </Button>
              <p className="text-xs text-gray-500">
                Payment confirms the booking. Fee always comes from the schedule configuration.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
