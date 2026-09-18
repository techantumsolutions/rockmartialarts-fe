"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { fetchAllCoaches, coachDisplayInfo } from "@/lib/coachFetch"
import { TokenManager } from "@/lib/tokenManager"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"
import {
  coachSubscriptionAPI,
  formatInrFromPaise,
  subscriptionStatusLabel,
  type CoachSubscription,
  type CoachSubscriptionPlan,
} from "@/lib/coachSubscriptionAPI"

const STATUS_BADGE: Record<string, string> = {
  pending_payment: "bg-amber-50 text-amber-900 border-amber-200",
  active: "bg-green-50 text-green-800 border-green-200",
  grace: "bg-orange-50 text-orange-900 border-orange-200",
  expired: "bg-red-50 text-red-800 border-red-200",
  cancelled: "bg-slate-100 text-slate-600 border-slate-200",
}

function fmt(iso?: string | null) {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

export default function CoachSubscriptionsAdminPage() {
  const { toast } = useToast()
  const [rows, setRows] = useState<CoachSubscription[]>([])
  const [total, setTotal] = useState(0)
  const [skip, setSkip] = useState(0)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState("all")
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [plans, setPlans] = useState<CoachSubscriptionPlan[]>([])
  const [coaches, setCoaches] = useState<{ id: string; name: string }[]>([])
  const [grantCoachId, setGrantCoachId] = useState("")
  const [grantPlanId, setGrantPlanId] = useState("")
  const [granting, setGranting] = useState(false)
  const limit = 25

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await coachSubscriptionAPI.listSubscriptions({
        status,
        search,
        skip,
        limit,
      })
      setRows(data.subscriptions || [])
      setTotal(data.total || 0)
    } catch (e) {
      toast({
        title: "Load failed",
        description: e instanceof Error ? e.message : "Error",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [status, search, skip, toast])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    coachSubscriptionAPI.listPlans(false).then((d) => {
      setPlans(d.plans || [])
      if (d.plans?.[0]) setGrantPlanId(d.plans[0].id)
    })
    const token = BranchManagerAuth.getToken() || TokenManager.getToken()
    if (!token) return
    fetchAllCoaches(token, { activeOnly: false }).then((list) => {
      const opts = (list || []).map((c: any) => ({
        id: c.id,
        name: coachDisplayInfo(c).full_name || c.id,
      }))
      setCoaches(opts)
      if (opts[0]) setGrantCoachId(opts[0].id)
    })
  }, [])

  const handleGrant = async () => {
    if (!grantCoachId || !grantPlanId) return
    setGranting(true)
    try {
      await coachSubscriptionAPI.grant(grantCoachId, grantPlanId, "Admin grant")
      toast({ title: "Subscription granted" })
      await load()
    } catch (e) {
      toast({
        title: "Grant failed",
        description: e instanceof Error ? e.message : "Error",
        variant: "destructive",
      })
    } finally {
      setGranting(false)
    }
  }

  const handleRefreshStatuses = async () => {
    try {
      const r = await coachSubscriptionAPI.refreshStatuses()
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
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="w-full p-4 lg:px-8 lg:py-6 space-y-6 max-w-6xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#4F5077]">Coach Subscriptions</h1>
            <p className="text-sm text-[#6B7A99] mt-1">
              Monitor subscriptions, grant access, and refresh expiry/grace states.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefreshStatuses}>
              Refresh statuses
            </Button>
            <Button variant="outline" onClick={load} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Reload
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base text-[#4F5077]">Grant subscription</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3 items-end">
            <div className="min-w-[200px]">
              <Label className="text-xs">Coach</Label>
              <Select value={grantCoachId} onValueChange={setGrantCoachId}>
                <SelectTrigger>
                  <SelectValue placeholder="Coach" />
                </SelectTrigger>
                <SelectContent>
                  {coaches.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[200px]">
              <Label className="text-xs">Plan</Label>
              <Select value={grantPlanId} onValueChange={setGrantPlanId}>
                <SelectTrigger>
                  <SelectValue placeholder="Plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} (₹{p.fee_inr})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleGrant} disabled={granting}>
              {granting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Grant"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[200px]">
                <Label className="text-xs">Search</Label>
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setSkip(0)
                      setSearch(searchInput)
                    }
                  }}
                  placeholder="Name, email, id…"
                />
              </div>
              <Button
                variant="secondary"
                onClick={() => {
                  setSkip(0)
                  setSearch(searchInput)
                }}
              >
                Search
              </Button>
              <div className="w-44">
                <Label className="text-xs">Status</Label>
                <Select
                  value={status}
                  onValueChange={(v) => {
                    setSkip(0)
                    setStatus(v)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="grace">Grace</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="pending_payment">Pending payment</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left py-3 px-3 text-[#6B7A99]">Coach</th>
                    <th className="text-left py-3 px-3 text-[#6B7A99]">Plan</th>
                    <th className="text-left py-3 px-3 text-[#6B7A99]">Amount</th>
                    <th className="text-left py-3 px-3 text-[#6B7A99]">Status</th>
                    <th className="text-left py-3 px-3 text-[#6B7A99]">Period</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-500">
                        <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                        Loading…
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-500">
                        No subscriptions found.
                      </td>
                    </tr>
                  ) : (
                    rows.map((r) => (
                      <tr key={r.id} className="border-b">
                        <td className="py-3 px-3">
                          <div className="font-medium text-[#4F5077]">
                            {r.coach_name || r.coach_id}
                          </div>
                          <div className="text-xs text-gray-500">{r.coach_email}</div>
                        </td>
                        <td className="py-3 px-3">
                          {r.plan_snapshot?.name || r.plan_id}
                        </td>
                        <td className="py-3 px-3">
                          {formatInrFromPaise(r.amount_paise)}
                        </td>
                        <td className="py-3 px-3">
                          <Badge
                            variant="outline"
                            className={STATUS_BADGE[r.status] || ""}
                          >
                            {subscriptionStatusLabel(r.status)}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-xs text-[#6B7A99]">
                          {fmt(r.starts_at)} → {fmt(r.ends_at)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between text-sm text-[#6B7A99]">
              <span>
                {rows.length ? skip + 1 : 0}–{skip + rows.length} of {total}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={skip <= 0}
                  onClick={() => setSkip(Math.max(0, skip - limit))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={skip + limit >= total}
                  onClick={() => setSkip(skip + limit)}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
