"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { CreditCard, Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import CoachDashboardHeader from "@/components/coach-dashboard-header"
import { checkCoachAuth } from "@/lib/coachAuth"
import { openRazorpayCheckout } from "@/lib/razorpay"
import {
  coachSubscriptionAPI,
  formatInrFromPaise,
  subscriptionStatusLabel,
  type CoachSubscription,
  type CoachSubscriptionPlan,
  type SubscriptionPayment,
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

export default function CoachSubscriptionPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [coachName, setCoachName] = useState("Coach")
  const [coachEmail, setCoachEmail] = useState("")
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [plans, setPlans] = useState<CoachSubscriptionPlan[]>([])
  const [sub, setSub] = useState<CoachSubscription | null>(null)
  const [history, setHistory] = useState<SubscriptionPayment[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const auth = checkCoachAuth()
    if (!auth.isAuthenticated) {
      router.push("/coach/login")
      return
    }
    setCoachName(auth.coach?.full_name || "Coach")
    setCoachEmail(
      auth.coach?.contact_info?.email || auth.coach?.email || ""
    )
    setReady(true)
  }, [router])

  const load = useCallback(async () => {
    if (!ready) return
    setLoading(true)
    setError(null)
    try {
      const [planData, me, hist] = await Promise.all([
        coachSubscriptionAPI.listPlans(true),
        coachSubscriptionAPI.mySubscription(),
        coachSubscriptionAPI.myHistory(),
      ])
      setPlans(planData.plans || [])
      setSub(me.subscription)
      setHistory(hist.payments || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load subscription")
    } finally {
      setLoading(false)
    }
  }, [ready])

  useEffect(() => {
    load()
  }, [load])

  const handlePay = async (plan: CoachSubscriptionPlan) => {
    setPaying(true)
    try {
      const checkout = await coachSubscriptionAPI.checkout(plan.id)
      await openRazorpayCheckout({
        amountPaise: checkout.order.amount,
        razorpayKeyId: checkout.key,
        currency: checkout.order.currency || "INR",
        name: "Rock Martial Arts",
        description: plan.name,
        customerName: coachName,
        customerEmail: coachEmail,
        orderId: checkout.order.id,
        onSuccess: async (response) => {
          try {
            if (
              !response.razorpay_order_id ||
              !response.razorpay_payment_id ||
              !response.razorpay_signature
            ) {
              throw new Error("Incomplete payment response")
            }
            await coachSubscriptionAPI.verifyPayment({
              subscription_id: checkout.subscription_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            })
            toast({ title: "Subscription activated" })
            await load()
          } catch (err) {
            toast({
              title: "Verification failed",
              description: err instanceof Error ? err.message : "Error",
              variant: "destructive",
            })
          } finally {
            setPaying(false)
          }
        },
        onDismiss: () => setPaying(false),
      })
    } catch (e) {
      toast({
        title: "Checkout failed",
        description: e instanceof Error ? e.message : "Error",
        variant: "destructive",
      })
      setPaying(false)
    }
  }

  const status = (sub?.status || "").toLowerCase()

  return (
    <div className="min-h-screen bg-gray-50">
      <CoachDashboardHeader currentPage="Subscription" coachName={coachName} />
      <main className="pt-20 px-4 lg:px-8 py-6 max-w-4xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#4F5077]">My subscription</h1>
            <p className="text-sm text-[#6B7A99] mt-1">
              View status, renew access, and payment history.
            </p>
          </div>
          <Button variant="outline" onClick={load} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </Button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Card>
          <CardHeader>
            <CardTitle className="text-base text-[#4F5077]">Current status</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-gray-500">Loading…</p>
            ) : !sub ? (
              <p className="text-sm text-[#6B7A99]">
                No subscription yet. Choose a plan below to get started.
              </p>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={STATUS_BADGE[status] || ""}>
                    {subscriptionStatusLabel(status)}
                  </Badge>
                  <span className="text-[#6B7A99]">
                    {sub.plan_snapshot?.name || "Plan"}
                  </span>
                </div>
                <p>
                  <span className="text-[#6B7A99]">Period: </span>
                  {fmt(sub.starts_at)} → {fmt(sub.ends_at)}
                </p>
                <p>
                  <span className="text-[#6B7A99]">Grace ends: </span>
                  {fmt(sub.grace_ends_at)}
                </p>
                {status === "grace" && (
                  <p className="text-orange-800 text-xs">
                    Your paid period ended. Renew before grace ends to avoid deactivation.
                  </p>
                )}
                {status === "expired" && (
                  <p className="text-red-700 text-xs">
                    Subscription expired. Renew to restore dashboard access.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base text-[#4F5077]">Available plans</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {plans.length === 0 ? (
              <p className="text-sm text-gray-500">No active plans configured.</p>
            ) : (
              plans.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-3 border rounded-lg p-4"
                >
                  <div>
                    <div className="font-medium text-[#4F5077]">{p.name}</div>
                    <div className="text-sm text-[#6B7A99]">
                      ₹{p.fee_inr} · {p.duration_days} days · {p.grace_period_days}-day grace
                    </div>
                    {p.description && (
                      <p className="text-xs text-gray-500 mt-1">{p.description}</p>
                    )}
                  </div>
                  <Button
                    onClick={() => handlePay(p)}
                    disabled={paying}
                    className="gap-2 bg-[#4F5077] hover:bg-[#3d3e5c]"
                  >
                    {paying ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CreditCard className="w-4 h-4" />
                    )}
                    {sub && ["active", "grace"].includes(status) ? "Renew" : "Subscribe"}
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base text-[#4F5077]">Payment history</CardTitle>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="text-sm text-gray-500">No payments yet.</p>
            ) : (
              <ul className="space-y-3">
                {history.map((h) => (
                  <li key={h.id} className="text-sm border-b pb-2">
                    <div className="font-medium text-[#4F5077]">
                      {h.plan_name || "Plan"} · {formatInrFromPaise(h.amount_paise)}
                    </div>
                    <div className="text-xs text-[#6B7A99]">
                      {fmt(h.paid_at)} · {h.payment_status} · {h.action}
                      {h.period_end ? ` · until ${fmt(h.period_end)}` : ""}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
