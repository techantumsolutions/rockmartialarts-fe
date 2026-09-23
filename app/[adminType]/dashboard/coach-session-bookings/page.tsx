"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, Search } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  SESSION_STATUSES,
  coachSessionBookingAPI,
  sessionStatusLabel,
  type SessionBooking,
} from "@/lib/coachSessionBookingAPI"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"
import { TokenManager } from "@/lib/tokenManager"

const STATUS_CLASS: Record<string, string> = {
  scheduled: "bg-blue-50 text-blue-800 border-blue-200",
  confirmed: "bg-green-50 text-green-800 border-green-200",
  completed: "bg-gray-100 text-gray-700 border-gray-200",
  cancelled: "bg-red-50 text-red-800 border-red-200",
}

export default function CoachSessionBookingsAdminPage() {
  const { toast } = useToast()
  const [rows, setRows] = useState<SessionBooking[]>([])
  const [total, setTotal] = useState(0)
  const [skip, setSkip] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [savingId, setSavingId] = useState<string | null>(null)
  const [summary, setSummary] = useState({ total: 0, upcoming: 0 })
  const limit = 25

  const hasAuth = () => !!(BranchManagerAuth.getToken() || TokenManager.getToken())

  const loadSummary = useCallback(async () => {
    if (!hasAuth()) return
    try {
      const data = await coachSessionBookingAPI.summary()
      setSummary({ total: data.total || 0, upcoming: data.upcoming || 0 })
    } catch {
      /* non-blocking */
    }
  }, [])

  const load = useCallback(async () => {
    if (!hasAuth()) {
      setError("Not authenticated")
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await coachSessionBookingAPI.list({
        status: statusFilter,
        search,
        skip,
        limit,
      })
      setRows(Array.isArray(data.bookings) ? data.bookings : [])
      setTotal(typeof data.total === "number" ? data.total : 0)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load bookings")
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [skip, search, statusFilter])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    loadSummary()
  }, [loadSummary])

  const updateStatus = async (id: string, status: string) => {
    setSavingId(id)
    try {
      await coachSessionBookingAPI.updateStatus(id, status)
      toast({ title: "Status updated" })
      await Promise.all([load(), loadSummary()])
    } catch (e) {
      toast({
        title: "Could not update",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Coach sessions</h1>
            <p className="text-gray-600 text-sm">
              Lead consultation bookings with assigned coaches.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={() => void Promise.all([load(), loadSummary()])} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs uppercase tracking-wide text-gray-500">Total</p>
              <p className="text-2xl font-semibold">{summary.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs uppercase tracking-wide text-gray-500">Upcoming</p>
              <p className="text-2xl font-semibold text-blue-700">{summary.upcoming}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Bookings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              className="flex flex-col sm:flex-row gap-2 flex-wrap"
              onSubmit={(e) => {
                e.preventDefault()
                setSkip(0)
                setSearch(searchInput)
              }}
            >
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search name, phone, coach…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setSkip(0)
                  setStatusFilter(v)
                }}
              >
                <SelectTrigger className="h-10 w-full sm:w-[160px] bg-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {SESSION_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="submit" className="bg-yellow-400 hover:bg-yellow-500 text-white">
                Search
              </Button>
            </form>

            {error && <p className="text-sm text-red-600">{error}</p>}

            {loading ? (
              <p className="text-gray-500 text-sm py-8 text-center">Loading…</p>
            ) : rows.length === 0 ? (
              <p className="text-gray-500 text-sm py-8 text-center">No bookings found.</p>
            ) : (
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-100 text-gray-700">
                    <tr>
                      <th className="px-3 py-2 font-semibold">When</th>
                      <th className="px-3 py-2 font-semibold">Participant</th>
                      <th className="px-3 py-2 font-semibold">Coach</th>
                      <th className="px-3 py-2 font-semibold">Branch</th>
                      <th className="px-3 py-2 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id} className="border-t hover:bg-gray-50/80">
                        <td className="px-3 py-2 whitespace-nowrap">
                          {row.session_date}
                          <div className="text-xs text-gray-500">
                            {row.start_time}–{row.end_time}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div>{row.participant_name || "—"}</div>
                          <div className="text-xs text-gray-500">{row.participant_phone}</div>
                        </td>
                        <td className="px-3 py-2">{row.coach_name || "—"}</td>
                        <td className="px-3 py-2">{row.branch_name || "—"}</td>
                        <td className="px-3 py-2 min-w-[150px]">
                          <Select
                            value={row.status}
                            disabled={savingId === row.id || row.status === "completed" || row.status === "cancelled"}
                            onValueChange={(v) => void updateStatus(row.id, v)}
                          >
                            <SelectTrigger
                              className={`h-8 text-xs border ${STATUS_CLASS[row.status] || ""}`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {SESSION_STATUSES.map((s) => (
                                <SelectItem key={s.value} value={s.value}>
                                  {s.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {total > limit && (
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>
                  Showing {skip + 1}–{Math.min(skip + limit, total)} of {total}
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={skip === 0 || loading}
                    onClick={() => setSkip((s) => Math.max(0, s - limit))}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={skip + limit >= total || loading}
                    onClick={() => setSkip((s) => s + limit)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
