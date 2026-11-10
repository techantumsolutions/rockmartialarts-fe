"use client"

import { useCallback, useEffect, useState } from "react"
import { Gift, Loader2, RefreshCw, Search, Layers } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import {
  AdminPageShell,
  AdminPageHeader,
  AdminCard,
  AdminFilterBar,
  AdminTableShell,
  AdminStatusPill,
} from "@/components/dashboard/AdminPageShell"

const subscriptionPillStatus = (
  status: string
): "active" | "pending" | "inactive" | "cancelled" | undefined => {
  if (status === "active") return "active"
  if (status === "pending_payment") return "pending"
  if (status === "grace") return "pending"
  if (status === "expired") return "inactive"
  if (status === "cancelled") return "cancelled"
  return undefined
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
    fetchAllCoaches(token, { activeOnly: false, registrationSource: "self" }).then((list) => {
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
    <AdminPageShell className="admin-stack">
      <AdminPageHeader
        icon={Layers}
        title="Online Coach Subscriptions"
        subtitle="Monitor subscriptions, grant access to online coaches, and refresh expiry/grace states."
        actions={
          <div className="admin-actions">
            <Button
              type="button"
              variant="outline"
              className="btn-admin-outline h-10"
              onClick={() => void handleRefreshStatuses()}
            >
              Refresh statuses
            </Button>
            <Button
              type="button"
              variant="outline"
              className="btn-admin-outline h-10"
              onClick={() => void load()}
              disabled={loading}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Reload
            </Button>
          </div>
        }
      />

      <AdminCard>
        <div className="mb-4 flex items-center gap-2">
          <div className="admin-icon-tile admin-icon-tile--violet h-8 w-8">
            <Gift className="h-4 w-4" />
          </div>
          <h2 className="text-[15px] font-semibold text-[#2F3158]">Grant subscription</h2>
        </div>
        <p className="mb-4 text-sm text-[#6B7A99]">
          Only online-enrolled coaches appear in the coach list.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1 sm:max-w-xs">
            <Label className="text-xs text-[#6B7A99]">Online coach</Label>
            <Select value={grantCoachId} onValueChange={setGrantCoachId}>
              <SelectTrigger className="mt-1 h-11">
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
          <div className="min-w-[200px] flex-1 sm:max-w-xs">
            <Label className="text-xs text-[#6B7A99]">Plan</Label>
            <Select value={grantPlanId} onValueChange={setGrantPlanId}>
              <SelectTrigger className="mt-1 h-11">
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
          <Button
            type="button"
            className="h-11 bg-[#E1BB33] font-semibold text-[#3d3e5c] hover:bg-[#d4ae2a]"
            onClick={() => void handleGrant()}
            disabled={granting || !grantCoachId || !grantPlanId}
          >
            {granting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Grant
          </Button>
        </div>
      </AdminCard>

      <AdminFilterBar>
        <form
          className="flex w-full flex-col flex-wrap gap-2 sm:flex-row sm:items-center"
          onSubmit={(e) => {
            e.preventDefault()
            setSkip(0)
            setSearch(searchInput)
          }}
        >
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Name, email, id…"
              className="h-11 pl-10"
            />
          </div>
          <Select
            value={status}
            onValueChange={(v) => {
              setSkip(0)
              setStatus(v)
            }}
          >
            <SelectTrigger className="h-11 w-full bg-white sm:w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="grace">Grace</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="pending_payment">Pending payment</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button type="submit" className="h-11 bg-[#E1BB33] font-semibold text-[#3d3e5c] hover:bg-[#d4ae2a]">
            Search
          </Button>
        </form>
      </AdminFilterBar>

      <AdminCard padding={false}>
        <div className="border-b border-gray-100 px-5 py-4 sm:px-6">
          <h2 className="text-[15px] font-semibold text-[#2F3158]">Subscriptions</h2>
        </div>
        <AdminTableShell
          className="border-0 shadow-none"
          footer={
            <>
              <span>
                {rows.length ? skip + 1 : 0}–{skip + rows.length} of {total}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={skip <= 0 || loading}
                  onClick={() => setSkip(Math.max(0, skip - limit))}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={skip + limit >= total || loading}
                  onClick={() => setSkip(skip + limit)}
                >
                  Next
                </Button>
              </div>
            </>
          }
        >
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th>Coach</th>
                <th>Plan</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Period</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-[#6B7A99]">
                    <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-[#6B7A99]">
                    No subscriptions found.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div className="font-medium text-[#4F5077]">{r.coach_name || r.coach_id}</div>
                      <div className="text-xs text-[#6B7A99]">{r.coach_email}</div>
                    </td>
                    <td>{r.plan_snapshot?.name || r.plan_id}</td>
                    <td className="font-medium text-[#4F5077]">{formatInrFromPaise(r.amount_paise)}</td>
                    <td>
                      <AdminStatusPill status={subscriptionPillStatus(r.status)}>
                        {subscriptionStatusLabel(r.status)}
                      </AdminStatusPill>
                    </td>
                    <td className="whitespace-nowrap text-xs text-[#6B7A99]">
                      {fmt(r.starts_at)} → {fmt(r.ends_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </AdminTableShell>
      </AdminCard>
    </AdminPageShell>
  )
}
