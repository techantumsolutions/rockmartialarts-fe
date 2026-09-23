"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { format, addDays, startOfWeek, endOfWeek } from "date-fns"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import CoachDashboardHeader from "@/components/coach-dashboard-header"
import { checkCoachAuth } from "@/lib/coachAuth"
import {
  coachSessionBookingAPI,
  sessionStatusLabel,
  type SessionBooking,
} from "@/lib/coachSessionBookingAPI"
import { useToast } from "@/hooks/use-toast"

const STATUS_CLASS: Record<string, string> = {
  scheduled: "bg-blue-50 text-blue-800 border-blue-200",
  confirmed: "bg-green-50 text-green-800 border-green-200",
  completed: "bg-gray-100 text-gray-700 border-gray-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
}

export default function CoachSchedulePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [coachName, setCoachName] = useState("Coach")
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [bookings, setBookings] = useState<SessionBooking[]>([])
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [actingId, setActingId] = useState<string | null>(null)

  useEffect(() => {
    const auth = checkCoachAuth()
    if (!auth.isAuthenticated) {
      router.push("/coach/login")
      return
    }
    setCoachName(auth.coach?.full_name || "Coach")
    setReady(true)
  }, [router])

  const range = useMemo(() => {
    const from = format(weekStart, "yyyy-MM-dd")
    const to = format(endOfWeek(weekStart, { weekStartsOn: 1 }), "yyyy-MM-dd")
    return { from, to }
  }, [weekStart])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await coachSessionBookingAPI.mySchedule(range.from, range.to)
      setBookings(Array.isArray(data.bookings) ? data.bookings : [])
    } catch (e) {
      toast({
        title: "Could not load schedule",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      })
      setBookings([])
    } finally {
      setLoading(false)
    }
  }, [range.from, range.to, toast])

  useEffect(() => {
    if (ready) void load()
  }, [ready, load])

  const byDate = useMemo(() => {
    const map: Record<string, SessionBooking[]> = {}
    for (const b of bookings) {
      const d = b.session_date
      if (!map[d]) map[d] = []
      map[d].push(b)
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => a.start_time.localeCompare(b.start_time))
    }
    return map
  }, [bookings])

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  }, [weekStart])

  const setStatus = async (id: string, status: string) => {
    setActingId(id)
    try {
      await coachSessionBookingAPI.coachUpdateStatus(id, status)
      toast({ title: `Marked ${sessionStatusLabel(status).toLowerCase()}` })
      await load()
    } catch (e) {
      toast({
        title: "Update failed",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setActingId(null)
    }
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-gray-50">
        <CoachDashboardHeader currentPage="Schedule" coachName={coachName} />
        <main className="pt-20 px-4 text-center text-gray-500">Loading…</main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CoachDashboardHeader currentPage="Schedule" coachName={coachName} />
      <main className="pt-20 px-4 lg:px-8 py-6 max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My schedule</h1>
            <p className="text-sm text-gray-600">
              Lead consultation sessions booked for you.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setWeekStart((d) => addDays(d, -7))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium text-gray-700 min-w-[180px] text-center">
              {format(weekStart, "MMM d")} –{" "}
              {format(endOfWeek(weekStart, { weekStartsOn: 1 }), "MMM d, yyyy")}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setWeekStart((d) => addDays(d, 7))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16 text-gray-500">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd")
              const items = byDate[key] || []
              return (
                <Card key={key}>
                  <CardHeader className="py-3">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>{format(day, "EEEE, MMM d")}</span>
                      <span className="text-xs font-normal text-gray-500">
                        {items.length} session{items.length === 1 ? "" : "s"}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    {items.length === 0 ? (
                      <p className="text-sm text-gray-400 py-2">No sessions</p>
                    ) : (
                      items.map((b) => (
                        <div
                          key={b.id}
                          className="border rounded-lg p-3 bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                        >
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-gray-900">
                                {b.start_time} – {b.end_time}
                              </span>
                              <Badge
                                variant="outline"
                                className={`text-xs ${STATUS_CLASS[b.status] || ""}`}
                              >
                                {sessionStatusLabel(b.status)}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-700 mt-1">
                              {b.participant_name || "Lead"}
                              {b.participant_phone ? ` · ${b.participant_phone}` : ""}
                            </p>
                            {b.branch_name ? (
                              <p className="text-xs text-gray-500">{b.branch_name}</p>
                            ) : null}
                            {b.notes ? (
                              <p className="text-xs text-gray-500 mt-1">{b.notes}</p>
                            ) : null}
                          </div>
                          {(b.status === "scheduled" || b.status === "confirmed") && (
                            <div className="flex flex-wrap gap-2">
                              {b.status === "scheduled" ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  className="bg-yellow-400 hover:bg-yellow-500 text-black"
                                  disabled={actingId === b.id}
                                  onClick={() => void setStatus(b.id, "confirmed")}
                                >
                                  Confirm
                                </Button>
                              ) : null}
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={actingId === b.id}
                                onClick={() => void setStatus(b.id, "completed")}
                              >
                                Complete
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={actingId === b.id}
                                onClick={() => void setStatus(b.id, "cancelled")}
                              >
                                Cancel
                              </Button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
