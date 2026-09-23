"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import StudentDashboardLayout from "@/components/student-dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, CalendarRange, ArrowLeft, RefreshCw } from "lucide-react"
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

export default function StudentBillingPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [cycles, setCycles] = useState<BillingCycle[]>([])

  async function load() {
    setLoading(true)
    try {
      if (!TokenManager.isAuthenticated()) {
        router.replace("/login?returnUrl=/student-dashboard/billing")
        return
      }
      const data = await billingAPI.list({ limit: 100 })
      setCycles(data.billing_cycles)
    } catch (err) {
      toast({
        title: "Could not load billing",
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

  return (
    <StudentDashboardLayout>
      <div className="container mx-auto max-w-5xl p-4 md:p-6 space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Billing cycles</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Current validity and next renewal dates based on your payment date.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/student-dashboard/payments">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Payments
              </Link>
            </Button>
            <Button variant="outline" onClick={() => void load()} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarRange className="h-5 w-5" />
              Your cycles
            </CardTitle>
            <CardDescription>
              Each paid enrollment has its own billing cycle. Month-end payment dates are handled safely
              (e.g. 31st → last day of the next month).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
              </div>
            ) : cycles.length === 0 ? (
              <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
                <p className="font-medium text-gray-800">No billing cycles yet</p>
                <p className="text-sm mt-1">
                  After a successful payment, your next due date will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {cycles.map((c) => (
                  <div key={c.id} className="rounded-lg border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-900">{c.course_name || "Course"}</p>
                        <p className="text-sm text-muted-foreground">{c.branch_name || "—"}</p>
                      </div>
                      <Badge className={statusClass(c.status)}>
                        {(c.status || "active").replace("_", " ")}
                      </Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-xs uppercase text-muted-foreground">Period start</p>
                        <p className="font-medium">{fmt(c.period_start)}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase text-muted-foreground">Period end</p>
                        <p className="font-medium">{fmt(c.period_end || c.validity_end_date)}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase text-muted-foreground">Next due</p>
                        <p className="font-medium text-amber-700">{fmt(c.next_due_date)}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {c.duration_months || 1} month cycle
                      {c.anchor_day ? ` · billed on day ${c.anchor_day}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </StudentDashboardLayout>
  )
}
