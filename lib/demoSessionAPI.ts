import { getBackendApiUrl } from "./config"

export type DemoSlot = {
  schedule_id: string
  slot_date: string
  weekday: string
  start_time: string
  end_time: string
  branch_id: string
  branch_name?: string | null
  course_id: string
  course_name?: string | null
  title?: string | null
  fee_inr: number
  capacity?: number | null
  booked_count: number
  remaining?: number | null
  is_full: boolean
  recurrence?: string | null
}

export type DemoAvailabilityOption = { id: string; name: string }

export type DemoBooking = {
  id: string
  schedule_id: string
  slot_date: string
  start_time: string
  end_time: string
  branch_id?: string
  branch_name?: string | null
  course_id?: string
  course_name?: string | null
  schedule_title?: string | null
  participant_name: string
  participant_phone: string
  participant_email?: string | null
  participant_age?: number | null
  fee_inr: number
  amount_paise?: number
  status: string
  payment_status: string
  razorpay_order_id?: string | null
  razorpay_payment_id?: string | null
  confirmed_at?: string | null
}

export type DemoBookingCreatePayload = {
  schedule_id: string
  slot_date: string
  start_time: string
  end_time?: string
  participant_name: string
  participant_phone: string
  participant_email?: string
  participant_age?: number
  notes?: string
  source?: string
}

async function parseError(res: Response): Promise<string> {
  try {
    const data = await res.json()
    if (typeof data?.detail === "string") return data.detail
    if (Array.isArray(data?.detail)) {
      return data.detail
        .map((d: { msg?: string }) => d.msg || JSON.stringify(d))
        .join("; ")
    }
    return data?.message || res.statusText || "Request failed"
  } catch {
    return res.statusText || "Request failed"
  }
}

class DemoSessionAPI {
  async options() {
    const res = await fetch(getBackendApiUrl("demo-sessions/options"), {
      cache: "no-store",
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{
      branches: DemoAvailabilityOption[]
      courses: DemoAvailabilityOption[]
    }>
  }

  async availability(params: {
    branch_id?: string
    course_id?: string
    from?: string
    to?: string
    include_full?: boolean
  } = {}) {
    const qs = new URLSearchParams()
    if (params.branch_id) qs.set("branch_id", params.branch_id)
    if (params.course_id) qs.set("course_id", params.course_id)
    if (params.from) qs.set("from", params.from)
    if (params.to) qs.set("to", params.to)
    if (params.include_full) qs.set("include_full", "true")
    const suffix = qs.toString() ? `?${qs.toString()}` : ""
    const res = await fetch(getBackendApiUrl(`demo-sessions/availability${suffix}`), {
      cache: "no-store",
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{
      from: string
      to: string
      timezone: string
      count: number
      slots: DemoSlot[]
    }>
  }

  async createBooking(payload: DemoBookingCreatePayload) {
    const res = await fetch(getBackendApiUrl("demo-sessions/bookings"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{
      message: string
      booking: DemoBooking
      payment_required: boolean
    }>
  }

  async getBooking(id: string) {
    const res = await fetch(
      getBackendApiUrl(`demo-sessions/bookings/${encodeURIComponent(id)}`),
      { cache: "no-store" }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ booking: DemoBooking }>
  }

  async createOrder(bookingId: string) {
    const res = await fetch(
      getBackendApiUrl(
        `demo-sessions/bookings/${encodeURIComponent(bookingId)}/create-order`
      ),
      { method: "POST", headers: { "Content-Type": "application/json" } }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{
      order: { id: string; amount: number; currency: string }
      key: string
      booking_id: string
    }>
  }

  async verifyPayment(
    bookingId: string,
    payload: {
      razorpay_order_id: string
      razorpay_payment_id: string
      razorpay_signature: string
    }
  ) {
    const res = await fetch(
      getBackendApiUrl(
        `demo-sessions/bookings/${encodeURIComponent(bookingId)}/verify-payment`
      ),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ message: string; booking: DemoBooking }>
  }

  async markPaymentFailed(bookingId: string) {
    const res = await fetch(
      getBackendApiUrl(
        `demo-sessions/bookings/${encodeURIComponent(bookingId)}/payment-failed`
      ),
      { method: "POST" }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ message: string; booking: DemoBooking }>
  }
}

export const demoSessionAPI = new DemoSessionAPI()

export function formatSlotDate(iso: string) {
  try {
    const d = new Date(`${iso}T12:00:00`)
    return d.toLocaleDateString(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  } catch {
    return iso
  }
}

export function seatsLabel(slot: DemoSlot) {
  if (slot.capacity == null) return "Open seats"
  if (slot.is_full || (slot.remaining ?? 0) <= 0) return "Full"
  return `${slot.remaining} of ${slot.capacity} left`
}

export function bookingStatusLabel(status?: string | null) {
  const map: Record<string, string> = {
    pending_payment: "Awaiting payment",
    confirmed: "Confirmed",
    cancelled: "Cancelled",
    expired: "Expired",
    failed: "Failed",
  }
  return map[String(status || "")] || status || "—"
}
