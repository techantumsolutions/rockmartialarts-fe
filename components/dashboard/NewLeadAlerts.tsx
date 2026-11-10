"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Bell, Eye, X } from "lucide-react"
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
 * Stays until the user closes each card; View opens the leads page.
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
      className="pointer-events-none fixed bottom-4 right-4 z-[90] flex w-[min(100vw-1.5rem,22rem)] flex-col gap-2"
      aria-live="polite"
    >
      {visible.slice(0, 4).map((n) => (
        <div
          key={n.id}
          className="pointer-events-auto animate-in slide-in-from-right-4 fade-in-0 duration-300 rounded-2xl border border-[#E1BB33]/50 bg-white p-3.5 shadow-xl shadow-black/10 ring-1 ring-black/5"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E1BB33]/20 text-[#8a6d0a]">
              <Bell className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#E1BB33]">
                New lead
              </p>
              <p className="truncate text-sm font-semibold text-[#171A26]">
                {n.lead_name || n.title || "Incoming lead"}
              </p>
              <p className="mt-0.5 line-clamp-2 text-xs text-gray-600">
                {n.message || "A new lead was submitted. Open it to follow up."}
              </p>
              <div className="mt-2.5 flex items-center gap-2">
                <Button
                  size="sm"
                  className="h-8 gap-1.5 px-3"
                  onClick={() => void viewLead(n)}
                >
                  <Eye className="h-3.5 w-3.5" />
                  View
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2 text-gray-500"
                  onClick={() => dismiss(n.id)}
                  aria-label="Dismiss lead alert"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
