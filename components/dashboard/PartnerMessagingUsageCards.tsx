"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, Loader2, MessageSquare, MessageCircle } from "lucide-react"
import {
  partnerOrgAPI,
  type PartnerMessagingChannelQuota,
  type PartnerMessagingQuotaSummary,
} from "@/lib/partnerOrgAPI"
import { cn } from "@/lib/utils"

function usagePercent(ch?: PartnerMessagingChannelQuota) {
  const allocated = ch?.allocated ?? 0
  if (allocated <= 0) return 100
  const used = (ch?.utilized ?? 0) + (ch?.reserved ?? 0)
  return Math.min(100, Math.round((used / allocated) * 100))
}

function ChannelCard({
  title,
  icon: Icon,
  channel,
}: {
  title: string
  icon: typeof MessageSquare
  channel?: PartnerMessagingChannelQuota
}) {
  const pct = usagePercent(channel)
  const state = channel?.state || (channel?.disabled ? "disabled" : "ok")
  const barColor =
    state === "exhausted" || state === "disabled"
      ? "bg-red-500"
      : state === "low"
        ? "bg-amber-500"
        : "bg-[#E1BB33]"

  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFF8E1] text-[#B45309]">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-semibold text-[#171A26]">{title}</p>
          <p className="text-[11px] uppercase tracking-wide text-[#64748B]">
            {state === "disabled"
              ? "Disabled"
              : state === "exhausted"
                ? "Limit reached"
                : state === "low"
                  ? "Low balance"
                  : "Active"}
          </p>
        </div>
      </div>

      <dl className="mb-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-[#F8FAFC] px-2 py-2">
          <dt className="text-[10px] uppercase text-[#64748B]">Allocated</dt>
          <dd className="text-sm font-bold tabular-nums text-[#171A26]">
            {(channel?.allocated ?? 0).toLocaleString()}
          </dd>
        </div>
        <div className="rounded-lg bg-[#F8FAFC] px-2 py-2">
          <dt className="text-[10px] uppercase text-[#64748B]">Utilized</dt>
          <dd className="text-sm font-bold tabular-nums text-[#171A26]">
            {(channel?.utilized ?? 0).toLocaleString()}
          </dd>
        </div>
        <div className="rounded-lg bg-[#F8FAFC] px-2 py-2">
          <dt className="text-[10px] uppercase text-[#64748B]">Remaining</dt>
          <dd className="text-sm font-bold tabular-nums text-[#171A26]">
            {(channel?.remaining ?? 0).toLocaleString()}
          </dd>
        </div>
      </dl>

      <div className="mb-1 flex items-center justify-between text-xs text-[#64748B]">
        <span>Usage</span>
        <span className="font-semibold tabular-nums">{pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#F1F5F9]">
        <div className={cn("h-full rounded-full transition-all", barColor)} style={{ width: `${pct}%` }} />
      </div>

      {(state === "exhausted" || state === "disabled") && (
        <p className="mt-3 flex items-start gap-1.5 text-xs text-red-700">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Message limit reached. Please contact the administrator to increase your messaging quota.
        </p>
      )}
      {state === "low" && (
        <p className="mt-3 flex items-start gap-1.5 text-xs text-amber-700">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Low remaining balance — request a quota increase soon.
        </p>
      )}
    </div>
  )
}

/**
 * Partner dashboard messaging usage (SMS + WhatsApp).
 * Renders nothing for non-partner contexts if the API rejects.
 */
export default function PartnerMessagingUsageCards() {
  const [quota, setQuota] = useState<PartnerMessagingQuotaSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await partnerOrgAPI.getMyMessagingQuota()
        if (!cancelled) setQuota(data.messaging_quota)
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Unable to load messaging usage")
          setQuota(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-[#E2E8F0] bg-white px-4 py-6 text-sm text-[#64748B]">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading messaging usage…
      </div>
    )
  }

  if (error || !quota) return null

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-[#171A26]">Messaging Usage</h2>
        <p className="text-sm text-[#64748B]">
          Allocated SMS and WhatsApp quotas for your organization
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ChannelCard title="SMS Messages" icon={MessageSquare} channel={quota.sms} />
        <ChannelCard title="WhatsApp Messages" icon={MessageCircle} channel={quota.whatsapp} />
      </div>
    </section>
  )
}
