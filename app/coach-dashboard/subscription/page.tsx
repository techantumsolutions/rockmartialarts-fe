"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import CoachDashboardHeader from "@/components/coach-dashboard-header"
import { checkCoachAuth } from "@/lib/coachAuth"
import { refreshCoachSubscriptionStatus } from "@/lib/coachSubscriptionGuard"
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
  const [payingPlanId, setPayingPlanId] = useState<string | null>(null)
  const [plans, setPlans] = useState<CoachSubscriptionPlan[]>([])
  const [sub, setSub] = useState<CoachSubscription | null>(null)
  const [history, setHistory] = useState<SubscriptionPayment[]>([])
  const [regSource, setRegSource] = useState<string>("admin")
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
      setRegSource((me.registration_source || "admin").toLowerCase())
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load subscription")
    } finally {
      setLoading(false)
    }
  }, [ready])

  useEffect(() => {
    load()
  }, [load])

  const status = (sub?.status || "").toLowerCase()

  const handlePay = async (plan: CoachSubscriptionPlan) => {
    // Prevent renewal if the current plan is still actively subscribed (not expired)
    const isCurrentPlan = Boolean(
      sub && (sub.plan_id === plan.id || sub.plan_snapshot?.id === plan.id)
    )
    if (isCurrentPlan && status === "active") {
      toast({
        title: "Plan already active",
        description: "Your subscription is currently active and cannot be renewed until it expires or enters grace period.",
      })
      return
    }

    if (regSource !== "self") {
      toast({
        title: "Exempt account",
        description: "Your account is administrator-assigned and does not require a subscription.",
      })
      return
    }

    setPayingPlanId(plan.id)
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
            try {
              const rawCoach = localStorage.getItem("coach")
              if (rawCoach) {
                const coachObj = JSON.parse(rawCoach)
                coachObj.subscription_status = "active"
                coachObj.is_active = true
                localStorage.setItem("coach", JSON.stringify(coachObj))
              }
            } catch {
              // ignore
            }
            await refreshCoachSubscriptionStatus()
            toast({
              title: "Subscription activated",
              description: "Full dashboard access has been restored.",
            })
            await load()
          } catch (err) {
            toast({
              title: "Verification failed",
              description: err instanceof Error ? err.message : "Error",
              variant: "destructive",
            })
          } finally {
            setPayingPlanId(null)
          }
        },
        onDismiss: () => setPayingPlanId(null),
        onPaymentFailure: (failMsg) => {
          toast({
            title: "Payment failed",
            description: failMsg || "Payment was not completed. Please try again.",
            variant: "destructive",
          })
          setPayingPlanId(null)
        },
      })
    } catch (e) {
      toast({
        title: "Checkout failed",
        description: e instanceof Error ? e.message : "Error",
        variant: "destructive",
      })
      setPayingPlanId(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CoachDashboardHeader currentPage="Subscription" coachName={coachName} />
      <main className="px-4 lg:px-8 py-6 max-w-4xl mx-auto space-y-6">
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

        {/* Current status card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-[#4F5077]">Current status</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-gray-500">Loading…</p>
            ) : regSource !== "self" ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-green-50 text-green-800 border-green-200">
                    Exempt from Subscription
                  </Badge>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
                  <p className="font-medium">Administrator Assigned Coach</p>
                  <p className="text-xs text-blue-700 mt-1">
                    As an administrator-assigned coach, your account does not require a subscription and maintains continuous full dashboard access.
                  </p>
                </div>
              </div>
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
                  <span className="text-[#6B7A99] font-medium">
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
                {status === "active" && (
                  <p className="text-emerald-700 text-xs flex items-center gap-1.5 pt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Your subscription is active. All dashboard features are fully accessible.</span>
                  </p>
                )}
                {status === "grace" && (
                  <p className="text-orange-800 text-xs flex items-center gap-1.5 pt-0.5">
                    <Clock className="w-3.5 h-3.5 text-orange-700 shrink-0" />
                    <span>Your paid period ended. Renew before grace ends to avoid deactivation.</span>
                  </p>
                )}
                {status === "expired" && (
                  <p className="text-red-700 text-xs flex items-center gap-1.5 pt-0.5">
                    <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                    <span>Subscription expired. Renew to restore dashboard access.</span>
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Available plans card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-[#4F5077]">Available plans</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {plans.length === 0 ? (
              <p className="text-sm text-gray-500">No active plans configured.</p>
            ) : (
              plans.map((p) => {
                const isCurrentPlan = Boolean(
                  sub && (sub.plan_id === p.id || sub.plan_snapshot?.id === p.id)
                )
                const isCurrentActive = Boolean(isCurrentPlan && status === "active")
                const isCurrentGrace = Boolean(isCurrentPlan && status === "grace")
                const isCurrentExpired = Boolean(isCurrentPlan && status === "expired")
                const isPlanPaying = payingPlanId === p.id
                const isAnyPaying = payingPlanId !== null
                const isExempt = regSource !== "self"

                // A plan's button is disabled if:
                // 1. It is already subscribed and active (cannot renew before expiry)
                // 2. The coach is admin-exempt
                // 3. Any plan is actively in checkout processing
                const isButtonDisabled = isCurrentActive || isExempt || isAnyPaying

                return (
                  <div
                    key={p.id}
                    className={`flex flex-wrap items-center justify-between gap-4 border rounded-xl p-4 md:p-5 transition-all ${
                      isCurrentActive
                        ? "border-emerald-300 bg-emerald-50/30 ring-1 ring-emerald-200"
                        : isCurrentGrace
                          ? "border-amber-300 bg-amber-50/30"
                          : isCurrentExpired
                            ? "border-red-200 bg-red-50/20"
                            : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <div className="space-y-1.5 flex-1 min-w-[240px]">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-base text-[#4F5077]">{p.name}</span>
                        {isCurrentActive && (
                          <Badge
                            variant="outline"
                            className="bg-emerald-100 text-emerald-800 border-emerald-300 gap-1 text-xs font-medium"
                          >
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Current Active Plan
                          </Badge>
                        )}
                        {isCurrentGrace && (
                          <Badge
                            variant="outline"
                            className="bg-amber-100 text-amber-900 border-amber-300 gap-1 text-xs font-medium"
                          >
                            <Clock className="w-3 h-3 text-amber-600" />
                            In Grace Period
                          </Badge>
                        )}
                        {isCurrentExpired && (
                          <Badge
                            variant="outline"
                            className="bg-red-100 text-red-800 border-red-300 gap-1 text-xs font-medium"
                          >
                            <AlertCircle className="w-3 h-3 text-red-600" />
                            Expired
                          </Badge>
                        )}
                        {p.is_default && !isCurrentPlan && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                            Recommended
                          </Badge>
                        )}
                      </div>

                      <div className="text-sm text-[#4F5077]">
                        <span className="text-lg font-bold text-gray-900">
                          ₹{p.fee_inr.toLocaleString("en-IN")}
                        </span>
                        <span className="text-xs text-[#6B7A99] ml-2">
                          · {p.duration_days} days · {p.grace_period_days}-day grace period
                        </span>
                      </div>

                      {p.description && (
                        <p className="text-xs text-gray-600">{p.description}</p>
                      )}

                      {isCurrentActive && (
                        <p className="text-xs text-emerald-700 flex items-center gap-1.5 pt-0.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>
                            Active until <strong>{fmt(sub?.ends_at)}</strong>. Renewal unlocks once expired or in grace period.
                          </span>
                        </p>
                      )}

                      {isCurrentGrace && (
                        <p className="text-xs text-amber-800 flex items-center gap-1.5 pt-0.5">
                          <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                          <span>
                            Grace period ends <strong>{fmt(sub?.grace_ends_at)}</strong>. Renew now to avoid deactivation.
                          </span>
                        </p>
                      )}

                      {isCurrentExpired && (
                        <p className="text-xs text-red-700 flex items-center gap-1.5 pt-0.5">
                          <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                          <span>
                            Expired on <strong>{fmt(sub?.ends_at)}</strong>. Renew to restore full dashboard access.
                          </span>
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Button
                        onClick={() => handlePay(p)}
                        disabled={isButtonDisabled}
                        className={`gap-2 min-w-[130px] font-medium transition-colors ${
                          isCurrentActive
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-50 cursor-not-allowed opacity-90 shadow-none"
                            : isCurrentGrace || isCurrentExpired
                              ? "bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
                              : "bg-[#4F5077] hover:bg-[#3d3e5c] text-white"
                        }`}
                      >
                        {isPlanPaying ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Processing…
                          </>
                        ) : isCurrentActive ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            Active
                          </>
                        ) : isExempt ? (
                          "Exempt"
                        ) : isCurrentGrace || isCurrentExpired ? (
                          <>
                            <CreditCard className="w-4 h-4" />
                            Renew
                          </>
                        ) : sub && ["active", "grace"].includes(status) ? (
                          <>
                            <CreditCard className="w-4 h-4" />
                            Switch Plan
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-4 h-4" />
                            Subscribe
                          </>
                        )}
                      </Button>

                      {isCurrentActive && (
                        <span className="text-[11px] text-gray-500 text-right">
                          Cannot renew while active
                        </span>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        {/* Payment history card */}
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
