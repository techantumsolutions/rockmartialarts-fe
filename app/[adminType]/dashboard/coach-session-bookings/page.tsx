"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RefreshCw, Search, CalendarClock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  SESSION_STATUSES,
  coachSessionBookingAPI,
  type SessionBooking,
} from "@/lib/coachSessionBookingAPI"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"
import { TokenManager } from "@/lib/tokenManager"
import {
  AdminPageShell,
  AdminPageHeader,
  AdminCard,
  AdminKpiGrid,
  AdminKpiCard,
  AdminFilterBar,
  AdminTableShell,
} from "@/components/dashboard/AdminPageShell"

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
    <AdminPageShell>
      <AdminPageHeader
        icon={CalendarClock}
        title="Online Coach Sessions"
        subtitle="Lead consultation bookings with online-enrolled coaches."
        actions={
          <Button
            type="button"
            variant="outline"
            className="btn-admin-outline h-10"
            onClick={() => void Promise.all([load(), loadSummary()])}
            disabled={loading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      <AdminKpiGrid cols={4}>
        <AdminKpiCard label="Total" value={summary.total} tone="blue" icon={CalendarClock} />
        <AdminKpiCard label="Upcoming" value={summary.upcoming} tone="purple" icon={CalendarClock} />
      </AdminKpiGrid>

      <AdminCard padding={false}>
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-[15px] font-semibold text-[#2F3158]">Bookings</h2>
        </div>
        <div className="space-y-4 p-5">
          <AdminFilterBar className="border-0 bg-transparent p-0 shadow-none">
            <form
              className="flex w-full flex-col flex-wrap gap-2 sm:flex-row"
              onSubmit={(e) => {
                e.preventDefault()
                setSkip(0)
                setSearch(searchInput)
              }}
            >
              <div className="relative min-w-[180px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
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
                <SelectTrigger className="h-11 w-full bg-white sm:w-[160px]">
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
              <Button type="submit" className="h-11 bg-[#E1BB33] font-semibold text-[#3d3e5c] hover:bg-[#d4ae2a]">
                Search
              </Button>
            </form>
          </AdminFilterBar>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          {loading ? (
            <p className="py-10 text-center text-sm text-[#6B7A99]">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-[#6B7A99]">No bookings found.</p>
          ) : (
            <AdminTableShell
              footer={
                total > limit ? (
                  <>
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
                  </>
                ) : undefined
              }
            >
              <table>
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Participant</th>
                    <th>Coach</th>
                    <th>Branch</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td className="whitespace-nowrap">
                        {row.session_date}
                        <div className="text-xs text-[#9593A8]">
                          {row.start_time}–{row.end_time}
                        </div>
                      </td>
                      <td>
                        <div className="font-medium">{row.participant_name || "—"}</div>
                        <div className="text-xs text-[#9593A8]">{row.participant_phone}</div>
                      </td>
                      <td>{row.coach_name || "—"}</td>
                      <td>{row.branch_name || "—"}</td>
                      <td className="min-w-[150px]">
                        <Select
                          value={row.status}
                          disabled={
                            savingId === row.id ||
                            row.status === "completed" ||
                            row.status === "cancelled"
                          }
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
            </AdminTableShell>
          )}
        </div>
      </AdminCard>
    </AdminPageShell>
  )
}
