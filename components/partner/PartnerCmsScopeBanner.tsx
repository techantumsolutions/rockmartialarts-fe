"use client"

import { useEffect, useState } from "react"
import { ShieldCheck, Info } from "lucide-react"
import { getBackendApiUrl } from "@/lib/config"
import { TokenManager } from "@/lib/tokenManager"
import { useDashboardRole } from "@/lib/useDashboardBasePath"

export type PartnerCmsPermissions = {
  role?: string
  is_branch_manager?: boolean
  is_platform_admin?: boolean
  managed_branch_ids?: string[]
  partner_cms_branch_ids?: string[]
  can_use_partner_cms?: boolean
  can_toggle_collaboration_flag?: boolean
  can_access_platform_settings?: boolean
  can_manage_roles?: boolean
  can_view_other_branch_financials?: boolean
  notes?: string
}

/**
 * M21-S10: Friendly scope notice for Branch Managers on Partner CMS pages.
 * Super Admin sees nothing (no UI noise).
 */
export function PartnerCmsScopeBanner() {
  const role = useDashboardRole()
  const [perms, setPerms] = useState<PartnerCmsPermissions | null>(null)

  useEffect(() => {
    if (role !== "branch_admin") return
    const token = TokenManager.getToken()
    if (!token) return
    let cancelled = false
    fetch(getBackendApiUrl("collaboration-partners/me/permissions"), {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setPerms(data)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [role])

  if (role !== "branch_admin") return null

  const partnerCount = perms?.partner_cms_branch_ids?.length ?? 0
  const canUse = perms?.can_use_partner_cms

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 flex gap-3">
      <ShieldCheck className="h-5 w-5 text-amber-700 flex-shrink-0 mt-0.5" />
      <div className="space-y-1">
        <p className="font-medium">Assigned-branch Partner CMS</p>
        <p className="text-amber-900/90">
          {canUse === false
            ? "Your assigned branch is not a collaboration partner yet. Ask Super Admin to enable the partner flag, then you can manage Partner CMS here."
            : partnerCount === 1
              ? "You can manage Partner content for your assigned collaboration partner branch only."
              : partnerCount > 1
                ? `You can manage Partner CMS for ${partnerCount} assigned collaboration partner branches only.`
                : "Partner tools are limited to your assigned collaboration partner branch."}
        </p>
        <p className="text-xs text-amber-800/80 flex items-start gap-1.5">
          <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          Platform settings, role management, and other branches’ financial data stay restricted.
        </p>
      </div>
    </div>
  )
}
