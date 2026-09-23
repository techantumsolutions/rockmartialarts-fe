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
import { RefreshCw, Search, Phone } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  CALLBACK_PRIORITIES,
  CALLBACK_STATUSES,
  callbackAPI,
  type CallbackRow,
} from "@/lib/callbackAPI"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"
import { TokenManager } from "@/lib/tokenManager"

const STATUS_BADGE: Record<string, string> = {
  new: "bg-gray-100 text-gray-800 border-gray-200",
  contacted: "bg-blue-50 text-blue-800 border-blue-200",
  scheduled: "bg-amber-50 text-amber-900 border-amber-200",
  completed: "bg-green-50 text-green-800 border-green-200",
  cancelled: "bg-red-50 text-red-800 border-red-200",
}

const PRIORITY_BADGE: Record<string, string> = {
  normal: "bg-slate-50 text-slate-700 border-slate-200",
  high: "bg-orange-50 text-orange-800 border-orange-200",
  urgent: "bg-red-50 text-red-800 border-red-200",
}

export default function CallbacksAdminPage() {
  const { toast } = useToast()
  const [rows, setRows] = useState<CallbackRow[]>([])
  const [total, setTotal] = useState(0)
  const [skip, setSkip] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [highlightOnly, setHighlightOnly] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [summary, setSummary] = useState({
    total: 0,
    highlighted: 0,
    open: 0,
  })
  const limit = 25

  const hasAuth = () => !!(BranchManagerAuth.getToken() || TokenManager.getToken())

  const loadSummary = useCallback(async () => {
    if (!hasAuth()) return
    try {
      const data = await callbackAPI.summary()
      setSummary({
        total: data.total || 0,
        highlighted: data.highlighted || 0,
        open: data.open || 0,
      })
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
      const data = await callbackAPI.list({
        status: statusFilter,
        priority: priorityFilter,
        highlight_only: highlightOnly,
        search,
        skip,
        limit,
      })
      setRows(Array.isArray(data.callbacks) ? data.callbacks : [])
      setTotal(typeof data.total === "number" ? data.total : 0)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load callbacks")
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [skip, search, statusFilter, priorityFilter, highlightOnly])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    loadSummary()
  }, [loadSummary])

  const fmtDate = (iso?: string | null) => {
    if (!iso) return "—"
    try {
      return new Date(iso).toLocaleString()
    } catch {
      return iso
    }
  }

  const refreshAll = async () => {
    await Promise.all([load(), loadSummary()])
  }

  const updateStatus = async (id: string, previous: string, next: string) => {
    if (previous === next) return
    setRows((list) => list.map((r) => (r.id === id ? { ...r, status: next } : r)))
    setSavingId(id)
    try {
      const res = await callbackAPI.updateStatus(id, next)
      const updated = res?.callback as CallbackRow | undefined
      if (updated) {
        setRows((list) => list.map((r) => (r.id === id ? { ...r, ...updated } : r)))
      }
      await loadSummary()
    } catch (e) {
      setRows((list) => list.map((r) => (r.id === id ? { ...r, status: previous } : r)))
      toast({
        title: "Could not update status",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setSavingId(null)
    }
  }

  const updatePriority = async (id: string, previous: string, next: string) => {
    if (previous === next) return
    const prevHighlight = rows.find((r) => r.id === id)?.highlight
    setRows((list) =>
      list.map((r) =>
        r.id === id
          ? {
              ...r,
              priority: next,
              highlight: next === "high" || next === "urgent",
            }
          : r
      )
    )
    setSavingId(id)
    try {
      const res = await callbackAPI.update(id, { priority: next })
      const updated = res?.callback as CallbackRow | undefined
      if (updated) {
        setRows((list) => list.map((r) => (r.id === id ? { ...r, ...updated } : r)))
      }
      await loadSummary()
    } catch (e) {
      setRows((list) =>
        list.map((r) =>
          r.id === id ? { ...r, priority: previous, highlight: prevHighlight } : r
        )
      )
      toast({
        title: "Could not update priority",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setSavingId(null)
    }
  }

  const toggleHighlight = async (row: CallbackRow) => {
    const next = !row.highlight
    setRows((list) => list.map((r) => (r.id === row.id ? { ...r, highlight: next } : r)))
    setSavingId(row.id)
    try {
      const res = await callbackAPI.update(row.id, { highlight: next })
      const updated = res?.callback as CallbackRow | undefined
      if (updated) {
        setRows((list) => list.map((r) => (r.id === row.id ? { ...r, ...updated } : r)))
      }
      await loadSummary()
    } catch (e) {
      setRows((list) =>
        list.map((r) => (r.id === row.id ? { ...r, highlight: row.highlight } : r))
      )
      toast({
        title: "Could not update highlight",
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
            <h1 className="text-2xl font-bold text-gray-900">Callback requests</h1>
            <p className="text-gray-600 text-sm">
              Manage callback requests. High and urgent items are highlighted for follow-up.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={() => void refreshAll()} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs uppercase tracking-wide text-gray-500">Total</p>
              <p className="text-2xl font-semibold text-gray-900">{summary.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs uppercase tracking-wide text-gray-500">Open</p>
              <p className="text-2xl font-semibold text-gray-900">{summary.open}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs uppercase tracking-wide text-gray-500">Highlighted</p>
              <p className="text-2xl font-semibold text-orange-700">{summary.highlighted}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Phone className="w-5 h-5 text-gray-600" />
              Callbacks
            </CardTitle>
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
                  placeholder="Search name, phone, branch…"
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
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {CALLBACK_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={priorityFilter}
                onValueChange={(v) => {
                  setSkip(0)
                  setPriorityFilter(v)
                }}
              >
                <SelectTrigger className="h-10 w-full sm:w-[150px] bg-white">
                  <SelectValue placeholder="All priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All priorities</SelectItem>
                  {CALLBACK_PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant={highlightOnly ? "default" : "outline"}
                className={
                  highlightOnly
                    ? "bg-orange-500 hover:bg-orange-600 text-white"
                    : undefined
                }
                onClick={() => {
                  setSkip(0)
                  setHighlightOnly((v) => !v)
                }}
              >
                Highlighted only
              </Button>
              <Button type="submit" className="bg-yellow-400 hover:bg-yellow-500 text-white">
                Search
              </Button>
            </form>

            {error && <p className="text-sm text-red-600">{error}</p>}

            {loading ? (
              <p className="text-gray-500 text-sm py-8 text-center">Loading…</p>
            ) : rows.length === 0 ? (
              <p className="text-gray-500 text-sm py-8 text-center">No callback requests found.</p>
            ) : (
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-100 text-gray-700">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Contact</th>
                      <th className="px-3 py-2 font-semibold">Preferred</th>
                      <th className="px-3 py-2 font-semibold">Branch</th>
                      <th className="px-3 py-2 font-semibold">Priority</th>
                      <th className="px-3 py-2 font-semibold">Status</th>
                      <th className="px-3 py-2 font-semibold">Highlight</th>
                      <th className="px-3 py-2 font-semibold">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const status = row.status || "new"
                      const priority = row.priority || "normal"
                      return (
                        <tr
                          key={row.id}
                          className={`border-t border-gray-200 ${
                            row.highlight
                              ? "bg-orange-50/80 hover:bg-orange-50"
                              : "hover:bg-gray-50/80"
                          }`}
                        >
                          <td className="px-3 py-2">
                            <div className="font-medium text-gray-900">{row.name}</div>
                            <div className="text-gray-600 whitespace-nowrap">{row.phone}</div>
                            {row.email ? (
                              <div className="text-xs text-gray-500">{row.email}</div>
                            ) : null}
                            {row.message ? (
                              <div className="text-xs text-gray-500 mt-1 line-clamp-2 max-w-[220px]">
                                {row.message}
                              </div>
                            ) : null}
                          </td>
                          <td className="px-3 py-2 text-gray-700">
                            <div>{row.preferred_time || "Anytime"}</div>
                            {row.preferred_date ? (
                              <div className="text-xs text-gray-500">{row.preferred_date}</div>
                            ) : null}
                            {row.course_interest ? (
                              <div className="text-xs text-gray-500 mt-0.5">
                                {row.course_interest}
                              </div>
                            ) : null}
                          </td>
                          <td className="px-3 py-2">
                            {row.branch_name?.trim() ? row.branch_name : "—"}
                          </td>
                          <td className="px-3 py-2 min-w-[130px]">
                            <Select
                              value={priority}
                              disabled={savingId === row.id}
                              onValueChange={(v) => void updatePriority(row.id, priority, v)}
                            >
                              <SelectTrigger
                                className={`h-8 text-xs border ${PRIORITY_BADGE[priority] || ""}`}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {CALLBACK_PRIORITIES.map((p) => (
                                  <SelectItem key={p.value} value={p.value}>
                                    {p.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-3 py-2 min-w-[150px]">
                            <Select
                              value={status}
                              disabled={savingId === row.id}
                              onValueChange={(v) => void updateStatus(row.id, status, v)}
                            >
                              <SelectTrigger
                                className={`h-8 text-xs border ${STATUS_BADGE[status] || ""}`}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {CALLBACK_STATUSES.map((s) => (
                                  <SelectItem key={s.value} value={s.value}>
                                    {s.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-3 py-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={savingId === row.id}
                              className={
                                row.highlight
                                  ? "border-orange-400 text-orange-800 bg-orange-50"
                                  : ""
                              }
                              onClick={() => void toggleHighlight(row)}
                            >
                              {row.highlight ? "On" : "Off"}
                            </Button>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                            {fmtDate(row.created_at)}
                            {row.lead_id ? (
                              <div className="text-[10px] text-gray-400 mt-0.5">
                                Lead linked
                              </div>
                            ) : null}
                          </td>
                        </tr>
                      )
                    })}
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
