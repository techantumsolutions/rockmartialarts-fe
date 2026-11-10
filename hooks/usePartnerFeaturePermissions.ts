import { useCallback, useEffect, useState } from "react"
import { PARTNER_FEATURE_STORAGE_KEY } from "@/lib/partnerFeaturePermissions"
import { partnerOrgAPI } from "@/lib/partnerOrgAPI"
import type { DashboardRole } from "@/lib/dashboard-config"

export function usePartnerFeaturePermissions(role: DashboardRole) {
  const [permissions, setPermissions] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined" || role !== "partner_super_admin") return {}
    try {
      const raw = localStorage.getItem(PARTNER_FEATURE_STORAGE_KEY)
      return raw ? (JSON.parse(raw) as Record<string, boolean>) : {}
    } catch {
      return {}
    }
  })
  const [loading, setLoading] = useState(role === "partner_super_admin")

  const refresh = useCallback(async () => {
    if (role !== "partner_super_admin") {
      setPermissions({})
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const data = await partnerOrgAPI.getMyFeaturePermissions()
      const perms = data.feature_permissions || {}
      setPermissions(perms)
      if (typeof window !== "undefined") {
        localStorage.setItem(PARTNER_FEATURE_STORAGE_KEY, JSON.stringify(perms))
      }
    } catch {
      /* keep cached */
    } finally {
      setLoading(false)
    }
  }, [role])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const hasPartnerFeature = useCallback(
    (key: string) => permissions[key] !== false,
    [permissions]
  )

  return { permissions, loading, refresh, hasPartnerFeature }
}
