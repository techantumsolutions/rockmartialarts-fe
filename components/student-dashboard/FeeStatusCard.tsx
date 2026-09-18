"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { PerformanceFeeStatus } from "@/lib/student-performance-types"
import { CreditCard } from "lucide-react"

function fmtDue(d?: string | null) {
  if (!d) return "—"
  try {
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
  } catch {
    return String(d)
  }
}

export function FeeStatusCard({ data }: { data: PerformanceFeeStatus }) {
  const st = (data.status || "").toLowerCase()
  const billing = (data.billing_status || "").toLowerCase()
  const variant =
    st === "paid" && billing !== "grace" && billing !== "overdue"
      ? "bg-emerald-100 text-emerald-900"
      : st.includes("grace") || billing === "grace"
        ? "bg-orange-100 text-orange-900"
        : st.includes("renewal") || st === "overdue" || st.includes("due") || billing === "overdue"
          ? "bg-orange-100 text-orange-900"
          : st.includes("pend") || st === "processing"
            ? "bg-amber-100 text-amber-900"
            : "bg-slate-100 text-slate-800"
  const showGrace =
    data.is_within_grace || billing === "grace" || st.includes("grace")
  const overdueDays = typeof data.overdue_days === "number" ? data.overdue_days : null
  const graceLeft =
    typeof data.grace_days_remaining === "number" ? data.grace_days_remaining : null
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg text-slate-800">
          <CreditCard className="h-5 w-5 text-slate-700" />
          Fee status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-slate-600">Status</span>
          <Badge className={variant}>{data.status || "—"}</Badge>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Billing period</p>
            <p className="font-medium text-slate-900">
              {data.period_start || data.period_end
                ? `${fmtDue(data.period_start)} → ${fmtDue(data.period_end)}`
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Next due date</p>
            <p className="font-medium text-slate-900">{fmtDue(data.next_due_date)}</p>
          </div>
        </div>
        {showGrace && graceLeft != null ? (
          <p className="text-xs text-orange-800">
            Grace window: {graceLeft} day{graceLeft === 1 ? "" : "s"} remaining
            {data.grace_days_total ? ` of ${data.grace_days_total}` : ""}.
          </p>
        ) : null}
        {!showGrace && overdueDays != null && overdueDays > 0 ? (
          <p className="text-xs text-orange-800">
            Overdue by {overdueDays} day{overdueDays === 1 ? "" : "s"}.
          </p>
        ) : null}
        {data.duration_months ? (
          <p className="text-xs text-slate-500">
            Cycle length: {data.duration_months} month{data.duration_months === 1 ? "" : "s"}
            {data.billing_status ? ` · ${String(data.billing_status).replace("_", " ")}` : ""}
          </p>
        ) : null}
        {(showGrace || (overdueDays != null && overdueDays > 0)) && (
          <a
            href="/student-dashboard/payments"
            className="inline-flex text-sm font-medium text-orange-800 hover:underline"
          >
            View renewal options
          </a>
        )}
      </CardContent>
    </Card>
  )
}
