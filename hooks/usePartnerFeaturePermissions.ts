import { useCallback, useEffect, useState } from "react"
import { PARTNER_FEATURE_STORAGE_KEY } from "@/lib/partnerFeaturePermissions"
import { partnerOrgAPI } from "@/lib/partnerOrgAPI"
import type { DashboardRole } from "@/lib/dashboard-config"

const COURSE_PERMS_KEY = "rmaa_partner_course_permissions"

export type PartnerCoursePermissions = {
  can_create_courses: boolean
  can_edit_courses: boolean
}

const DEFAULT_COURSE_PERMS: PartnerCoursePermissions = {
  can_create_courses: false,
  can_edit_courses: false,
}

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
  const [coursePermissions, setCoursePermissions] = useState<PartnerCoursePermissions>(() => {
    if (typeof window === "undefined" || role !== "partner_super_admin") {
      return DEFAULT_COURSE_PERMS
    }
    try {
      const raw = localStorage.getItem(COURSE_PERMS_KEY)
      if (!raw) return DEFAULT_COURSE_PERMS
      const parsed = JSON.parse(raw) as PartnerCoursePermissions
      return {
        can_create_courses: !!parsed.can_create_courses,
        can_edit_courses: !!parsed.can_edit_courses,
      }
    } catch {
      return DEFAULT_COURSE_PERMS
    }
  })
  const [loading, setLoading] = useState(role === "partner_super_admin")

  const refresh = useCallback(async () => {
    if (role !== "partner_super_admin") {
      setPermissions({})
      setCoursePermissions(DEFAULT_COURSE_PERMS)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const data = await partnerOrgAPI.getMyFeaturePermissions()
      const perms = data.feature_permissions || {}
      const course = {
        can_create_courses: !!data.course_permissions?.can_create_courses,
        can_edit_courses: !!data.course_permissions?.can_edit_courses,
      }
      setPermissions(perms)
      setCoursePermissions(course)
      if (typeof window !== "undefined") {
        localStorage.setItem(PARTNER_FEATURE_STORAGE_KEY, JSON.stringify(perms))
        localStorage.setItem(COURSE_PERMS_KEY, JSON.stringify(course))
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

  return {
    permissions,
    coursePermissions,
    loading,
    refresh,
    hasPartnerFeature,
  }
}
