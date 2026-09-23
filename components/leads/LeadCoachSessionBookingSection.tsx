"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import {
  coachSessionBookingAPI,
  sessionStatusLabel,
  type SessionBooking,
  type SessionSlot,
} from "@/lib/coachSessionBookingAPI"
import type { LeadRow } from "@/lib/leadAPI"

type Props = {
  lead: LeadRow
  onLeadUpdated?: (lead: LeadRow) => void
}

const STATUS_CLASS: Record<string, string> = {
  scheduled: "bg-blue-50 text-blue-800 border-blue-200",
  confirmed: "bg-green-50 text-green-800 border-green-200",
  completed: "bg-gray-100 text-gray-700 border-gray-200",
  cancelled: "bg-red-50 text-red-800 border-red-200",
}

export default function LeadCoachSessionBookingSection({ lead, onLeadUpdated }: Props) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [bookings, setBookings] = useState<SessionBooking[]>([])
  const [slots, setSlots] = useState<SessionSlot[]>([])
  const [slotKey, setSlotKey] = useState("")
  const [notes, setNotes] = useState("")

  const canBook =
    lead.coach_assignment_status === "accepted" && !!lead.assigned_coach_id

  const load = async () => {
    setLoading(true)
    try {
      const data = await coachSessionBookingAPI.leadBookings(lead.id)
      setBookings(Array.isArray(data.bookings) ? data.bookings : [])
      if (canBook && lead.assigned_coach_id) {
        try {
          const slotData = await coachSessionBookingAPI.leadSlots(
            lead.id,
            lead.assigned_coach_id
          )
          setSlots(Array.isArray(slotData.slots) ? slotData.slots : [])
        } catch {
          setSlots([])
        }
      } else {
        setSlots([])
      }
    } catch (e) {
      toast({
        title: "Could not load sessions",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.id, lead.assigned_coach_id, lead.coach_assignment_status])

  const book = async () => {
    if (!lead.assigned_coach_id || !slotKey) {
      toast({ title: "Select a time slot", variant: "destructive" })
      return
    }
    const slot = slots.find(
      (s) => `${s.session_date}|${s.start_time}|${s.end_time}` === slotKey
    )
    if (!slot) {
      toast({ title: "Invalid slot", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const res = await coachSessionBookingAPI.bookForLead(lead.id, {
        coach_id: lead.assigned_coach_id,
        session_date: slot.session_date,
        start_time: slot.start_time,
        end_time: slot.end_time,
        branch_id: slot.branch_id || lead.branch_id || undefined,
        notes: notes.trim() || undefined,
      })
      setBookings((prev) => [res.booking, ...prev])
      setSlotKey("")
      setNotes("")
      toast({ title: "Session booked" })
      if (onLeadUpdated) {
        onLeadUpdated({
          ...lead,
          next_session_booking_id: res.booking.id,
          next_session_at: `${res.booking.session_date}T${res.booking.start_time}:00`,
          session_booking_status: res.booking.status,
        })
      }
      await load()
    } catch (e) {
      toast({
        title: "Could not book session",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const cancel = async (id: string) => {
    setSaving(true)
    try {
      await coachSessionBookingAPI.updateStatus(id, "cancelled", {
        cancellation_reason: "Cancelled by admin",
      })
      toast({ title: "Session cancelled" })
      await load()
    } catch (e) {
      toast({
        title: "Could not cancel",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3 border rounded-lg p-4 bg-gray-50">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-900">Coach sessions</h3>
        {lead.session_booking_status ? (
          <Badge
            variant="outline"
            className={`text-xs ${STATUS_CLASS[lead.session_booking_status] || ""}`}
          >
            {sessionStatusLabel(lead.session_booking_status)}
          </Badge>
        ) : null}
      </div>

      {!canBook ? (
        <p className="text-xs text-gray-500">
          Assign a coach and wait for acceptance before booking a session.
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <>
          {canBook ? (
            <div className="space-y-2">
              <Label className="text-xs">
                Book with {lead.assigned_coach_name || "assigned coach"}
              </Label>
              <Select
                value={slotKey || "none"}
                onValueChange={(v) => setSlotKey(v === "none" ? "" : v)}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Select available slot" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select slot…</SelectItem>
                  {slots.map((s) => {
                    const key = `${s.session_date}|${s.start_time}|${s.end_time}`
                    return (
                      <SelectItem key={key} value={key}>
                        {s.session_date} · {s.start_time}–{s.end_time}
                        {s.branch_name ? ` · ${s.branch_name}` : ""}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              {slots.length === 0 ? (
                <p className="text-xs text-amber-700">
                  No open slots. Ask the coach to set weekly availability.
                </p>
              ) : null}
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Session notes (optional)"
                className="bg-white"
              />
              <Button
                type="button"
                size="sm"
                className="bg-yellow-400 hover:bg-yellow-500 text-white"
                disabled={saving || !slotKey}
                onClick={() => void book()}
              >
                {saving ? "Booking…" : "Book session"}
              </Button>
            </div>
          ) : null}

          {bookings.length > 0 ? (
            <div className="pt-2 border-t space-y-2">
              <p className="text-xs font-medium text-gray-600">Sessions</p>
              <ul className="space-y-2 max-h-48 overflow-y-auto">
                {bookings.map((b) => (
                  <li
                    key={b.id}
                    className="text-xs bg-white border rounded-md p-2 space-y-1"
                  >
                    <div className="flex justify-between gap-2">
                      <span className="font-medium text-gray-800">
                        {b.session_date} · {b.start_time}–{b.end_time}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${STATUS_CLASS[b.status] || ""}`}
                      >
                        {sessionStatusLabel(b.status)}
                      </Badge>
                    </div>
                    <p className="text-gray-500">{b.coach_name}</p>
                    {b.status === "scheduled" || b.status === "confirmed" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        disabled={saving}
                        onClick={() => void cancel(b.id)}
                      >
                        Cancel
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-xs text-gray-500">No sessions booked yet.</p>
          )}
        </>
      )}
    </div>
  )
}
