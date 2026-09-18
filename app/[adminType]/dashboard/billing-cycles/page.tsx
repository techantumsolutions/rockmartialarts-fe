"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Loader2, CalendarRange, Search, RefreshCw } from "lucide-react"
import { billingAPI, type BillingCycle } from "@/lib/billingAPI"
import { TokenManager } from "@/lib/tokenManager"
import { useToast } from "@/hooks/use-toast"

function fmt(d?: string | null) {
  if (!d) return "—"
  try {
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
  } catch {
    return "—"
  }
}

function statusClass(status?: string) {
  const s = (status || "").toLowerCase()
  if (s === "active") return "bg-emerald-100 text-emerald-900"
  if (s === "due_soon") return "bg-amber-100 text-amber-900"
  if (s === "overdue") return "bg-orange-100 text-orange-900"
  return "bg-slate-100 text-slate-800"
}

export default function AdminBillingCyclesPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const adminType = String(params?.adminType || "super-admin")
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [cycles, setCycles] = useState<BillingCycle[]>([])

  async function load() {
    setLoading(true)
    try {
      if (!TokenManager.isAuthenticated()) {
        router.push(adminType.includes("branch") ? "/branch-manager/login" : "/superadmin/login")
        return
      }
      const data = await billingAPI.list({ limit: 100 })
      setCycles(data.billing_cycles)
    } catch (err) {
      toast({
        title: "Could not load billing cycles",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const filtered = cycles.filter((c) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      (c.course_name || "").toLowerCase().includes(q) ||
      (c.branch_name || "").toLowerCase().includes(q) ||
      (c.student_id || "").toLowerCase().includes(q) ||
      (c.enrollment_id || "").toLowerCase().includes(q)
    )
  })

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing cycles</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Paid-date based renewal schedules linked to enrollments.
          </p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarRange className="h-5 w-5" />
            Cycle register
          </CardTitle>
          <CardDescription>{filtered.length} cycle(s)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Filter by course, branch, student or enrollment id"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
              No billing cycles yet. They are created automatically after successful payments.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Course / Branch</th>
                    <th className="px-4 py-3">Period</th>
                    <th className="px-4 py-3">Next due</th>
                    <th className="px-4 py-3">Months</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id} className="border-t">
                      <td className="px-4 py-3">
                        <div className="font-medium">{c.course_name || "Course"}</div>
                        <div className="text-xs text-muted-foreground">{c.branch_name || "—"}</div>
                        <div className="text-xs text-muted-foreground">Enr: {c.enrollment_id}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {fmt(c.period_start)} → {fmt(c.period_end || c.validity_end_date)}
                      </td>
                      <td className="px-4 py-3 font-medium text-amber-700 whitespace-nowrap">
                        {fmt(c.next_due_date)}
                      </td>
                      <td className="px-4 py-3">{c.duration_months || 1}</td>
                      <td className="px-4 py-3">
                        <Badge className={statusClass(c.status)}>
                          {(c.status || "active").replace("_", " ")}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
