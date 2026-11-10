import type { NavChild, NavItem } from "@/lib/dashboard-config"

export const PARTNER_FEATURE_DEFS: { key: string; label: string }[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "branches", label: "Branches" },
  { key: "branch-managers", label: "Branch Managers" },
  { key: "coaches", label: "Coaches" },
  { key: "students", label: "Students" },
  { key: "courses", label: "Courses" },
  { key: "categories", label: "Categories" },
  { key: "attendance", label: "Attendance" },
  { key: "payments", label: "Payments" },
  { key: "reports", label: "Reports" },
  { key: "leads", label: "Leads / CRM" },
  { key: "org-branding", label: "Organization Branding" },
  { key: "achievements-showcase", label: "Achievements" },
  { key: "settings", label: "Settings" },
]

export const PARTNER_FEATURE_STORAGE_KEY = "partner_feature_permissions"

export function navItemFeatureKey(item: NavItem | NavChild): string | null {
  const path = item.path || ""
  if (path.includes("/org-branding")) return "org-branding"
  if (path.includes("/achievements-showcase")) return "achievements-showcase"
  if (path.includes("/branch-managers")) return "branch-managers"
  if (path.includes("/categories")) return "categories"
  if (item.permissionId) return item.permissionId
  const slug = path.split("/").filter(Boolean).pop()
  return slug && slug !== "dashboard" ? slug : "dashboard"
}

export function isPartnerFeatureEnabled(
  permissions: Record<string, boolean> | null | undefined,
  featureKey: string | null
): boolean {
  if (!featureKey) return true
  if (!permissions) return true
  return permissions[featureKey] !== false
}

function filterPartnerNavChildren(
  children: NavChild[] | undefined,
  permissions: Record<string, boolean>
): NavChild[] | undefined {
  if (!children?.length) return undefined
  const next = children
    .map((c) => {
      if (c.children?.length) {
        const nested = filterPartnerNavChildren(c.children, permissions)
        if (!nested?.length) return null
        return { ...c, children: nested }
      }
      return isPartnerFeatureEnabled(permissions, navItemFeatureKey(c)) ? c : null
    })
    .filter(Boolean) as NavChild[]
  return next.length ? next : undefined
}

export function filterPartnerNavByFeatures(
  items: NavItem[],
  permissions: Record<string, boolean> | null | undefined
): NavItem[] {
  if (!permissions) return items
  return items
    .map((item) => {
      if (item.children?.length) {
        const children = filterPartnerNavChildren(item.children, permissions)
        if (!children?.length) return null
        return { ...item, children }
      }
      const selfAllowed = isPartnerFeatureEnabled(permissions, navItemFeatureKey(item))
      return selfAllowed ? item : null
    })
    .filter(Boolean) as NavItem[]
}

export function partnerDashboardPathFeatureKey(pathname: string): string | null {
  const normalized = pathname || ""
  if (!normalized.includes("/dashboard")) return null
  if (normalized.includes("/org-branding")) return "org-branding"
  if (normalized.includes("/achievements-showcase")) return "achievements-showcase"
  if (normalized.includes("/branch-managers")) return "branch-managers"
  if (normalized.includes("/create-course") || normalized.includes("/courses")) return "courses"
  if (normalized.includes("/categories")) return "categories"
  if (normalized.includes("/students")) return "students"
  if (normalized.includes("/coaches") || normalized.includes("/add-coach")) return "coaches"
  if (normalized.includes("/attendance")) return "attendance"
  if (normalized.includes("/payments")) return "payments"
  if (normalized.includes("/branches") || normalized.includes("/create-branch")) return "branches"
  if (normalized.includes("/reports")) return "reports"
  if (normalized.includes("/leads") || normalized.includes("/callbacks")) return "leads"
  if (normalized.includes("/settings")) return "settings"
  if (normalized.endsWith("/dashboard") || normalized.endsWith("/dashboard/")) return "dashboard"
  return null
}
