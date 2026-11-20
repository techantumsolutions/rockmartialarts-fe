"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { BellRing, Eye, Sparkles, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  notificationAPI,
  type LeadNotification,
} from "@/lib/notificationAPI"
import {
  getNotificationTargetPath,
  isLeadNotification,
} from "@/lib/notificationNavigation"
import { TokenManager } from "@/lib/tokenManager"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"

const DISMISSED_KEY = "rma_dismissed_lead_alerts"

function readDismissed(): Set<string> {
  try {
    const raw = sessionStorage.getItem(DISMISSED_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as string[]
    return new Set(Array.isArray(arr) ? arr : [])
  } catch {
    return new Set()
  }
}

function writeDismissed(ids: Set<string>) {
  try {
    sessionStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]))
  } catch {
    /* ignore */
  }
}

function canSeeLeadAlerts(): boolean {
  if (BranchManagerAuth.getCurrentUser()?.role === "branch_manager") return true
  const role = (TokenManager.getUser()?.role || "").toLowerCase()
  return (
    role === "super_admin" ||
    role === "superadmin" ||
    role === "coach_admin" ||
    role === "coachadmin" ||
    role === "partner_super_admin" ||
    role === "partnersuperadmin" ||
    role === "branch_manager"
  )
}

/**
 * Fixed stack of unread lead alerts on admin dashboards.
 * Sits above the footer with a clear close control.
 */
export default function NewLeadAlerts() {
  const router = useRouter()
  const pathname = usePathname() ?? ""
  const [alerts, setAlerts] = useState<LeadNotification[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    setDismissed(readDismissed())
  }, [])

  const poll = useCallback(async () => {
    if (!TokenManager.isAuthenticated() && !BranchManagerAuth.getToken()) return
    if (!canSeeLeadAlerts()) return
    try {
      const data = await notificationAPI.getLeadNotifications(0, 20)
      const unread = (data.notifications || []).filter(
        (n) => isLeadNotification(n) && !n.is_read
      )
      setAlerts(unread)
    } catch {
      /* silent */
    }
  }, [])

  useEffect(() => {
    void poll()
    const id = window.setInterval(() => void poll(), 20000)
    return () => window.clearInterval(id)
  }, [poll])

  const visible = useMemo(
    () => alerts.filter((a) => a.id && !dismissed.has(a.id)),
    [alerts, dismissed]
  )

  if (!visible.length) return null

  const dismiss = (id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev)
      next.add(id)
      writeDismissed(next)
      return next
    })
  }

  const viewLead = async (n: LeadNotification) => {
    try {
      await notificationAPI.markNotificationAsRead(
        n.id,
        n.notification_type || "new_lead"
      )
    } catch {
      /* still navigate */
    }
    dismiss(n.id)
    router.push(getNotificationTargetPath(n, pathname))
  }

  return (
    <div
      className="pointer-events-none fixed bottom-20 right-4 z-[250] flex w-[min(100vw-1.5rem,23rem)] flex-col gap-3 sm:bottom-24"
      aria-live="polite"
      role="region"
      aria-label="New lead alerts"
    >
      {visible.slice(0, 4).map((n) => (
        <div
          key={n.id}
          className="pointer-events-auto relative overflow-hidden rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50 via-white to-sky-50 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.18)] ring-1 ring-amber-300/40 animate-in slide-in-from-right-4 fade-in-0 duration-300"
        >
          <div
            className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-amber-300/30 blur-2xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-8 left-8 h-20 w-20 rounded-full bg-sky-300/25 blur-2xl"
            aria-hidden
          />

          <button
            type="button"
            onClick={() => dismiss(n.id)}
            className="absolute right-2.5 top-2.5 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-sm ring-1 ring-slate-200 transition hover:bg-rose-50 hover:text-rose-600 hover:ring-rose-200"
            aria-label="Close new lead alert"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="relative flex items-start gap-3 pr-8">
            <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md shadow-amber-500/30">
              <BellRing className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-800">
                <Sparkles className="h-3 w-3" />
                New lead
              </div>
              <p className="truncate text-sm font-bold text-slate-900">
                {n.lead_name || n.title || "Incoming lead"}
              </p>
              <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-600">
                {n.message || "A new lead was submitted. Open it to follow up."}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <Button
                  size="sm"
                  className="h-8 gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 px-3.5 text-white shadow-sm hover:from-amber-600 hover:to-orange-600"
                  onClick={() => void viewLead(n)}
                >
                  <Eye className="h-3.5 w-3.5" />
                  View lead
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2.5 text-slate-500 hover:bg-white/80 hover:text-slate-800"
                  onClick={() => dismiss(n.id)}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
