"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { learningCourseAPI, type LearningCourse } from "@/lib/learningCourseAPI"
import {
  formatInr,
  learningSubscriptionAPI,
  type LearningSubscription,
  type LearningSubscriptionPlan,
} from "@/lib/learningSubscriptionAPI"

const STATUS_CLASS: Record<string, string> = {
  active: "bg-green-50 text-green-800 border-green-200",
  grace: "bg-amber-50 text-amber-800 border-amber-200",
  pending_payment: "bg-blue-50 text-blue-800 border-blue-200",
  expired: "bg-red-50 text-red-800 border-red-200",
  cancelled: "bg-gray-100 text-gray-600 border-gray-200",
}

export default function LearningSubscriptionsAdminPage() {
  const { toast } = useToast()
  const [rows, setRows] = useState<LearningSubscription[]>([])
  const [plans, setPlans] = useState<LearningSubscriptionPlan[]>([])
  const [courses, setCourses] = useState<LearningCourse[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState("all")
  const [courseFilter, setCourseFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [grantUserId, setGrantUserId] = useState("")
  const [grantPlanId, setGrantPlanId] = useState("")
  const [grantNote, setGrantNote] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await learningSubscriptionAPI.listSubscriptions({
        status: statusFilter,
        course_id: courseFilter === "all" ? undefined : courseFilter,
        search: search || undefined,
      })
      setRows(data.subscriptions || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load subscriptions")
    } finally {
      setLoading(false)
    }
  }, [statusFilter, courseFilter, search])

  useEffect(() => {
    learningCourseAPI.listAdmin({ limit: 200 }).then((d) => setCourses(d.courses || [])).catch(() => {})
    learningSubscriptionAPI.listPlans({ active_only: false }).then((d) => {
      setPlans(d.plans || [])
      if (d.plans?.[0]) setGrantPlanId(d.plans[0].id)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const grant = async () => {
    if (!grantUserId.trim() || !grantPlanId) {
      toast({ title: "User ID and plan required", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      await learningSubscriptionAPI.grant({
        user_id: grantUserId.trim(),
        plan_id: grantPlanId,
        note: grantNote.trim() || undefined,
      })
      toast({ title: "Access granted" })
      setGrantUserId("")
      setGrantNote("")
      await load()
    } catch (e) {
      toast({
        title: "Grant failed",
        description: e instanceof Error ? e.message : "Error",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const refresh = async () => {
    setSaving(true)
    try {
      const r = await learningSubscriptionAPI.refreshStatuses()
      toast({
        title: "Statuses refreshed",
        description: `Checked ${r.checked}, changed ${r.changed}`,
      })
      await load()
    } catch (e) {
      toast({
        title: "Refresh failed",
        description: e instanceof Error ? e.message : "Error",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="w-full p-4 lg:px-8 lg:py-6 space-y-6 max-w-6xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#4F5077]">
              Learning Subscriptions
            </h1>
            <p className="text-sm text-[#6B7A99] mt-1">
              Student entitlements for online courses (admin grant / paid).
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void load()} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
            <Button
              variant="outline"
              disabled={saving}
              onClick={() => void refresh()}
            >
              Sync expiries
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base text-[#4F5077]">
              Complimentary grant
            </CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-4 gap-3 items-end">
            <div>
              <Label>Student user ID</Label>
              <Input
                value={grantUserId}
                onChange={(e) => setGrantUserId(e.target.value)}
                placeholder="student id"
              />
            </div>
            <div>
              <Label>Plan</Label>
              <Select value={grantPlanId} onValueChange={setGrantPlanId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({formatInr(p.fee_inr)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Note</Label>
              <Input
                value={grantNote}
                onChange={(e) => setGrantNote(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <Button
              disabled={saving}
              onClick={() => void grant()}
              className="bg-[#FFB70F] hover:bg-[#e0a00d] text-black"
            >
              Grant access
            </Button>
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-3">
          <div className="w-40">
            <Label>Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="grace">Grace</SelectItem>
                <SelectItem value="pending_payment">Pending</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-56">
            <Label>Course</Label>
            <Select value={courseFilter} onValueChange={setCourseFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[180px]">
            <Label>Search</Label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="User id / email / name"
            />
          </div>
        </div>

        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
            {error}
          </div>
        ) : null}

        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : rows.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">
                No subscriptions found.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="py-2 pr-3">User</th>
                      <th className="py-2 pr-3">Course</th>
                      <th className="py-2 pr-3">Plan</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2 pr-3">Ends</th>
                      <th className="py-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id} className="border-b border-gray-100">
                        <td className="py-2.5 pr-3">
                          <div className="font-medium truncate max-w-[160px]">
                            {r.user_name || r.user_email || r.user_id}
                          </div>
                          <div className="text-xs text-gray-400 truncate max-w-[160px]">
                            {r.user_id}
                          </div>
                        </td>
                        <td className="py-2.5 pr-3 max-w-[140px] truncate">
                          {r.course_title || r.course_id}
                        </td>
                        <td className="py-2.5 pr-3">
                          {r.plan_snapshot?.name || r.plan_id || "—"}
                          {r.is_lifetime ? (
                            <span className="text-xs text-amber-700 ml-1">
                              Lifetime
                            </span>
                          ) : null}
                        </td>
                        <td className="py-2.5 pr-3">
                          <Badge
                            variant="outline"
                            className={STATUS_CLASS[r.status || ""] || ""}
                          >
                            {r.status || "—"}
                          </Badge>
                        </td>
                        <td className="py-2.5 pr-3 text-xs text-gray-600">
                          {r.is_lifetime
                            ? "Never"
                            : r.ends_at
                              ? new Date(r.ends_at).toLocaleDateString()
                              : "—"}
                        </td>
                        <td className="py-2.5">
                          {r.amount_paise != null
                            ? formatInr(r.amount_paise / 100)
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
