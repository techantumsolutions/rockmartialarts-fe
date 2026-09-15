"use client"

import { useEffect, useState, useCallback } from "react"
import { getBackendApiUrl } from "@/lib/config"
import { TokenManager } from "@/lib/tokenManager"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RefreshCw, Search } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const LEAD_STATUSES = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "converted", label: "Converted" },
  { value: "lost", label: "Lost" },
] as const

type LeadStatus = (typeof LEAD_STATUSES)[number]["value"]

type LeadRow = {
  id: string
  name: string
  phone: string
  course?: string
  branch_name?: string | null
  branch_id?: string | null
  status?: string | null
  created_at?: string
}

const STATUS_BADGE: Record<LeadStatus, string> = {
  new: "bg-gray-100 text-gray-800 border-gray-200",
  contacted: "bg-blue-50 text-blue-800 border-blue-200",
  qualified: "bg-amber-50 text-amber-900 border-amber-200",
  converted: "bg-green-50 text-green-800 border-green-200",
  lost: "bg-red-50 text-red-800 border-red-200",
}

function normalizeStatus(raw?: string | null): LeadStatus {
  const s = (raw || "").trim().toLowerCase()
  if (LEAD_STATUSES.some((x) => x.value === s)) return s as LeadStatus
  return "new"
}

export default function LeadsPage() {
  const { toast } = useToast()
  const [leads, setLeads] = useState<LeadRow[]>([])
  const [total, setTotal] = useState(0)
  const [skip, setSkip] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [savingId, setSavingId] = useState<string | null>(null)
  const limit = 25

  const load = useCallback(async () => {
    const token = TokenManager.getToken()
    if (!token) {
      setError("Not authenticated")
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const q = new URLSearchParams({
        skip: String(skip),
        limit: String(limit),
      })
      if (search.trim()) q.set("search", search.trim())
      if (statusFilter && statusFilter !== "all") q.set("status", statusFilter)
      const url = getBackendApiUrl(`leads?${q.toString()}`)
      const res = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        console.error("[Leads] GET failed", res.status, data)
        setError(typeof data?.detail === "string" ? data.detail : "Failed to load leads")
        setLeads([])
        return
      }
      const list = Array.isArray(data.leads) ? data.leads : []
      setLeads(list)
      setTotal(typeof data.total === "number" ? data.total : list.length)
    } catch (e) {
      console.error("[Leads] Network error", e)
      setError("Network error loading leads")
      setLeads([])
    } finally {
      setLoading(false)
    }
  }, [skip, search, statusFilter])

  useEffect(() => {
    load()
  }, [load])

  const fmtDate = (iso?: string) => {
    if (!iso) return "—"
    try {
      return new Date(iso).toLocaleString()
    } catch {
      return iso
    }
  }

  const updateStatus = async (id: string, previous: LeadStatus, next: LeadStatus) => {
    if (previous === next) return
    const token = TokenManager.getToken()
    if (!token) {
      toast({ title: "Not authenticated", variant: "destructive" })
      return
    }
    setLeads((rows) => rows.map((r) => (r.id === id ? { ...r, status: next } : r)))
    setSavingId(id)
    try {
      const res = await fetch(getBackendApiUrl(`leads/${encodeURIComponent(id)}`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: next }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setLeads((rows) => rows.map((r) => (r.id === id ? { ...r, status: previous } : r)))
        toast({
          title: "Could not update status",
          description: typeof data?.detail === "string" ? data.detail : "Please try again.",
          variant: "destructive",
        })
        return
      }
      if (data?.status) {
        setLeads((rows) => rows.map((r) => (r.id === id ? { ...r, status: data.status } : r)))
      }
    } catch {
      setLeads((rows) => rows.map((r) => (r.id === id ? { ...r, status: previous } : r)))
      toast({ title: "Network error", description: "Could not update status.", variant: "destructive" })
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Lead management</h1>
            <p className="text-gray-600 text-sm">Registration leads from the public website</p>
          </div>
          <Button type="button" variant="outline" onClick={() => load()} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Leads</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              className="flex flex-col sm:flex-row gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                setSkip(0)
                setSearch(searchInput)
              }}
            >
              <div className="relative flex-1">
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
                <SelectTrigger className="h-10 w-full sm:w-[180px] bg-white">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {LEAD_STATUSES.map((s) => (
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
            ) : leads.length === 0 ? (
              <p className="text-gray-500 text-sm py-8 text-center">No leads found.</p>
            ) : (
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-100 text-gray-700">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Name</th>
                      <th className="px-3 py-2 font-semibold">Phone</th>
                      <th className="px-3 py-2 font-semibold">Branch</th>
                      <th className="px-3 py-2 font-semibold">Status</th>
                      <th className="px-3 py-2 font-semibold">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((row) => {
                      const status = normalizeStatus(row.status)
                      return (
                        <tr key={row.id} className="border-t border-gray-200 hover:bg-gray-50/80">
                          <td className="px-3 py-2">{row.name}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{row.phone}</td>
                          <td className="px-3 py-2">{row.branch_name?.trim() ? row.branch_name : "—"}</td>
                          <td className="px-3 py-2 min-w-[160px]">
                            <Select
                              value={status}
                              disabled={savingId === row.id}
                              onValueChange={(v) => void updateStatus(row.id, status, v as LeadStatus)}
                            >
                              <SelectTrigger className={`h-8 text-xs border ${STATUS_BADGE[status]}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {LEAD_STATUSES.map((s) => (
                                  <SelectItem key={s.value} value={s.value}>
                                    {s.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-gray-600">{fmtDate(row.created_at)}</td>
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
