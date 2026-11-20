"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Loader2, CalendarRange, Search, RefreshCw } from "lucide-react"
import { billingAPI, type BillingCycle } from "@/lib/billingAPI"
import { TokenManager } from "@/lib/tokenManager"
import { useToast } from "@/hooks/use-toast"
import { ADMIN_LIST_PAGE_SIZE } from "@/lib/adminListConfig"
import {
  AdminCard,
  AdminFilterBar,
  AdminPageHeader,
  AdminPageShell,
  AdminTableShell,
  adminFilterSearchClass,
} from "@/components/dashboard/AdminPageShell"

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
  const [page, setPage] = useState(1)

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return cycles
    return cycles.filter((c) => {
      return (
        (c.course_name || "").toLowerCase().includes(q) ||
        (c.branch_name || "").toLowerCase().includes(q) ||
        (c.student_id || "").toLowerCase().includes(q) ||
        (c.enrollment_id || "").toLowerCase().includes(q)
      )
    })
  }, [cycles, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / ADMIN_LIST_PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageStart = (safePage - 1) * ADMIN_LIST_PAGE_SIZE
  const pageRows = filtered.slice(pageStart, pageStart + ADMIN_LIST_PAGE_SIZE)
  const rangeFrom = filtered.length === 0 ? 0 : pageStart + 1
  const rangeTo = Math.min(pageStart + ADMIN_LIST_PAGE_SIZE, filtered.length)

  useEffect(() => {
    setPage(1)
  }, [search])

  return (
    <AdminPageShell>
      <AdminPageHeader
        icon={CalendarRange}
        title="Billing cycles"
        subtitle="Paid-date based renewal schedules linked to enrollments."
        actions={
          <Button
            type="button"
            variant="outline"
            className="btn-admin-outline h-10"
            onClick={() => void load()}
            disabled={loading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      <AdminCard padding={false}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-3 sm:px-5">
          <div>
            <h2 className="text-[15px] font-semibold text-[#4F5077]">Cycle register</h2>
            <p className="text-xs text-[#6B7A99]">{filtered.length} cycle(s)</p>
          </div>
        </div>

        <div className="space-y-3 p-4 pt-3 sm:p-5 sm:pt-3">
          <AdminFilterBar flat>
            <div className={adminFilterSearchClass}>
              <Search className="pointer-events-none absolute left-3 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 text-[#6B7A99]" />
              <Input
                className="pl-10"
                placeholder="Filter by course, academy, student or enrollment id"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </AdminFilterBar>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#E1BB33]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center text-sm text-[#6B7A99]">
              No billing cycles yet. They are created automatically after successful payments.
            </div>
          ) : (
            <AdminTableShell
              footer={
                <>
                  <span>
                    Showing {rangeFrom}–{rangeTo} of {filtered.length}
                  </span>
                  <nav className="admin-pagination flex flex-wrap items-center gap-2" aria-label="Pagination">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={safePage <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <span className="text-xs text-[#6B7A99]">
                      Page {safePage} of {totalPages}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={safePage >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      Next
                    </Button>
                  </nav>
                </>
              }
            >
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th>Course / Academy</th>
                    <th>Period</th>
                    <th>Next due</th>
                    <th>Months</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <div className="font-medium">{c.course_name || "Course"}</div>
                        <div className="text-xs text-[#6B7A99]">{c.branch_name || "—"}</div>
                        <div className="text-xs text-[#6B7A99]">Enr: {c.enrollment_id}</div>
                      </td>
                      <td className="whitespace-nowrap">
                        {fmt(c.period_start)} → {fmt(c.period_end || c.validity_end_date)}
                      </td>
                      <td className="whitespace-nowrap font-medium text-[#C9971A]">{fmt(c.next_due_date)}</td>
                      <td>{c.duration_months || 1}</td>
                      <td>
                        <Badge className={statusClass(c.status)}>
                          {(c.status || "active").replace("_", " ")}
                        </Badge>
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