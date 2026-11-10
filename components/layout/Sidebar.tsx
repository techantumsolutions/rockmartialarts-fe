"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown, PanelLeftClose, PanelLeftOpen, Search, X } from "lucide-react"
import {
  filterNavItemsByPermission,
  getBasePath,
  getMenuForRole,
  isPartnerBranchManagerNav,
  remapNavBase,
  type DashboardRole,
  type NavChild,
  type NavItem,
} from "@/lib/dashboard-config"
import { usePermissions } from "@/hooks/use-permissions"
import { usePartnerFeaturePermissions } from "@/hooks/usePartnerFeaturePermissions"
import { filterPartnerNavByFeatures } from "@/lib/partnerFeaturePermissions"
import { useCMS } from "@/contexts/CMSContext"
import { resolvePublicAssetUrl } from "@/lib/resolvePublicAssetUrl"
import { useDashboardBasePath } from "@/lib/useDashboardBasePath"

const SIDEBAR_COLLAPSED_KEY = "skillora-admin-sidebar-collapsed"
export const SIDEBAR_WIDTH_EXPANDED = 248
export const SIDEBAR_WIDTH_COLLAPSED = 72

interface SidebarProps {
  role: DashboardRole
  /** Side-effect only (e.g. close mobile sheet). Must NOT call router.push — Links handle navigation. */
  onNavigate?: (path: string) => void
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
  /** Hide brand/collapse chrome when embedded in mobile drawer */
  compactChrome?: boolean
}

function navKey(item: { id?: string; path: string; label: string }) {
  return item.id || `${item.path}::${item.label}`
}

function pathMatches(pathname: string, path: string, basePath: string) {
  if (path === basePath) return pathname === path || pathname === `${path}/`
  return pathname === path || pathname.startsWith(`${path}/`)
}

function collectLeaves(
  nodes: Array<NavItem | NavChild>,
  out: Array<{ path: string; label: string; ancestors: string[] }> = [],
  ancestors: string[] = []
) {
  for (const node of nodes) {
    const key = navKey(node)
    if (node.children?.length) {
      collectLeaves(node.children, out, [...ancestors, key])
    } else if (!node.expandable) {
      out.push({ path: node.path, label: node.label, ancestors })
    }
  }
  return out
}

function nodeContainsPath(
  node: NavItem | NavChild,
  pathname: string,
  basePath: string
): boolean {
  if (node.children?.length) {
    return node.children.some((c) => nodeContainsPath(c, pathname, basePath))
  }
  return pathMatches(pathname, node.path, basePath)
}

function bestLeafPath(
  leaves: Array<{ path: string }>,
  pathname: string,
  basePath: string
): string | null {
  let best: string | null = null
  for (const leaf of leaves) {
    if (!pathMatches(pathname, leaf.path, basePath)) continue
    if (!best || leaf.path.length > best.length) best = leaf.path
  }
  return best
}

function filterMenuByQuery(items: NavItem[], query: string): NavItem[] {
  const q = query.trim().toLowerCase()
  if (!q) return items

  const filterChildren = (children: NavChild[]): NavChild[] =>
    children
      .map((c) => {
        const nested = c.children?.length ? filterChildren(c.children) : undefined
        const selfMatch = c.label.toLowerCase().includes(q)
        if (selfMatch) return { ...c }
        if (nested?.length) return { ...c, children: nested, expandable: true }
        return null
      })
      .filter((c): c is NavChild => Boolean(c))

  return items
    .map((item) => {
      const selfMatch = item.label.toLowerCase().includes(q)
      const children = item.children?.length ? filterChildren(item.children) : undefined
      if (selfMatch) return { ...item }
      if (children?.length) return { ...item, children, expandable: true }
      return null
    })
    .filter((i): i is NavItem => Boolean(i))
}

export default function Sidebar({
  role,
  onNavigate,
  collapsed: collapsedProp,
  onCollapsedChange,
  compactChrome = false,
}: SidebarProps) {
  const pathname = usePathname() || ""
  const { hasPermission } = usePermissions(role)
  const { permissions: partnerFeaturePermissions } = usePartnerFeaturePermissions(role)
  const roleBasePath = getBasePath(role)
  const urlBasePath = useDashboardBasePath()
  const { cms } = useCMS()
  const [partnerBranchManager, setPartnerBranchManager] = useState(false)
  const [openKeys, setOpenKeys] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState("")
  const [internalCollapsed, setInternalCollapsed] = useState(false)

  const collapsed = collapsedProp ?? internalCollapsed
  const setCollapsed = useCallback(
    (next: boolean) => {
      if (onCollapsedChange) onCollapsedChange(next)
      else setInternalCollapsed(next)
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0")
      } catch {
        /* ignore */
      }
    },
    [onCollapsedChange]
  )

  useEffect(() => {
    setPartnerBranchManager(role === "branch_admin" && isPartnerBranchManagerNav())
  }, [role])

  useEffect(() => {
    if (collapsedProp !== undefined) return
    try {
      setInternalCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1")
    } catch {
      /* ignore */
    }
  }, [collapsedProp])

  const menuOptions = useMemo(
    () => ({ partnerBranchManager }),
    [partnerBranchManager]
  )

  // hasPermission is a new function identity every render — do not put it in deps
  // or menuItems churn will infinite-loop setOpenKeys and freeze the UI.
  const menuItems = useMemo(() => {
    const menuBase =
      role === "partner_super_admin" ? urlBasePath || roleBasePath : roleBasePath

    let all = filterNavItemsByPermission(getMenuForRole(role, menuBase, menuOptions), {
      role,
      hasPermission,
    })

    if (urlBasePath && roleBasePath && urlBasePath !== roleBasePath) {
      all = remapNavBase(all, roleBasePath, urlBasePath)
    }

    const filtered =
      role === "partner_super_admin"
        ? filterPartnerNavByFeatures(all, partnerFeaturePermissions)
        : all

    return filtered.filter((i) => i.label !== "Settings" && !i.overflowOnly)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hasPermission intentionally omitted
  }, [role, roleBasePath, urlBasePath, menuOptions, partnerFeaturePermissions])

  const activeBase = urlBasePath || roleBasePath
  const leaves = useMemo(() => collectLeaves(menuItems), [menuItems])
  const activeLeafPath = useMemo(
    () => bestLeafPath(leaves, pathname, activeBase),
    [leaves, pathname, activeBase]
  )

  const displayedItems = useMemo(
    () => filterMenuByQuery(menuItems, search),
    [menuItems, search]
  )

  const searching = search.trim().length > 0

  const syncOpenKeys = useCallback((next: Set<string>) => {
    setOpenKeys((prev) => {
      if (prev.size === next.size) {
        let same = true
        for (const key of next) {
          if (!prev.has(key)) {
            same = false
            break
          }
        }
        if (same) return prev
      }
      return next
    })
  }, [])

  // Route-aware accordion: open ancestors of the active leaf; one top-level group at a time
  useEffect(() => {
    if (searching) {
      const keys = new Set<string>()
      const openAll = (nodes: Array<NavItem | NavChild>) => {
        for (const n of nodes) {
          if (n.children?.length) {
            keys.add(navKey(n))
            openAll(n.children)
          }
        }
      }
      openAll(displayedItems)
      syncOpenKeys(keys)
      return
    }

    const hit = leaves.find((l) => l.path === activeLeafPath)
    syncOpenKeys(new Set<string>(hit?.ancestors ?? []))
  }, [pathname, activeLeafPath, leaves, searching, displayedItems, syncOpenKeys])

  const notify = (path: string) => {
    onNavigate?.(path)
  }

  const toggleKey = (key: string, isTopLevel: boolean) => {
    setOpenKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
        return next
      }
      if (isTopLevel && !searching) {
        // Accordion: close other top-level groups
        for (const item of menuItems) {
          if (item.children?.length) next.delete(navKey(item))
        }
      }
      next.add(key)
      return next
    })
  }

  const logoSrc = resolvePublicAssetUrl(cms?.branding?.navbar_logo) || "/logo.png"

  const parentClass = (active: boolean) =>
    `group relative flex h-11 w-full items-center gap-2.5 rounded-lg px-3 text-[14px] font-medium transition-colors touch-manipulation ${
      active
        ? "bg-[#FFF7DF] text-[#171A26]"
        : "text-[#171A26] hover:bg-[#F8FAFC]"
    }`

  const childClass = (active: boolean, _depth: number) =>
    `relative flex min-h-[36px] w-full items-center gap-2 rounded-md py-2 pl-3 pr-3 text-[13px] transition-colors touch-manipulation ${
      active
        ? "bg-[#FFF7DF] font-semibold text-[#171A26]"
        : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#171A26]"
    }`

  const renderChild = (child: NavChild, depth: number) => {
    const key = navKey(child)
    const Icon = child.icon
    const hasChildren = Boolean(child.children?.length)
    const isOpen = openKeys.has(key)
    const containsActive = nodeContainsPath(child, pathname, activeBase)
    const isLeafActive = !hasChildren && activeLeafPath === child.path

    if (hasChildren || child.expandable) {
      return (
        <div key={key} className="relative">
          {depth >= 2 && (
            <span
              aria-hidden
              className="absolute bottom-1 left-0 top-1 w-px bg-[#E2E8F0]"
            />
          )}
          <button
            type="button"
            aria-expanded={isOpen}
            aria-controls={`nav-sub-${key}`}
            data-no-action-overlay
            onClick={() => toggleKey(key, false)}
            className={`${childClass(containsActive && !isLeafActive, depth)} w-full justify-between text-left font-medium text-[#171A26]`}
          >
            <span className="flex min-w-0 items-center gap-2">
              {Icon && <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />}
              <span className="truncate">{child.label}</span>
            </span>
            <ChevronDown
              className={`h-3.5 w-3.5 shrink-0 text-[#64748B] transition-transform ${
                isOpen ? "rotate-180" : ""
              }`}
              aria-hidden
            />
          </button>
          {isOpen && child.children?.length ? (
            <div
              id={`nav-sub-${key}`}
              role="group"
              aria-label={child.label}
              className={`mt-0.5 space-y-0.5 ${depth >= 1 ? "ml-3 border-l border-[#E2E8F0] pl-2" : "ml-2"}`}
            >
              {child.children.map((nested) => renderChild(nested, depth + 1))}
            </div>
          ) : null}
        </div>
      )
    }

    return (
      <div key={key} className="relative">
        {depth >= 2 && (
          <span
            aria-hidden
            className="absolute bottom-1 left-0 top-1 w-px bg-[#E2E8F0]"
          />
        )}
        <Link
          href={child.path}
          onClick={() => notify(child.path)}
          aria-current={isLeafActive ? "page" : undefined}
          className={childClass(isLeafActive, depth)}
        >
          {isLeafActive && (
            <span
              aria-hidden
              className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-[#FFB70F]"
            />
          )}
          {Icon && <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />}
          <span className="truncate">{child.label}</span>
        </Link>
      </div>
    )
  }

  return (
    <div
      className="flex h-full min-h-0 flex-col bg-white"
      data-no-action-overlay
      data-sidebar-collapsed={collapsed ? "true" : "false"}
    >
      {!compactChrome && (
        <div className="shrink-0 border-b border-[#E2E8F0] px-3 py-3">
          <div className={`flex items-center ${collapsed ? "justify-center" : "gap-2"}`}>
            <Link
              href={activeBase}
              onClick={() => notify(activeBase)}
              className={`flex min-w-0 items-center ${collapsed ? "" : "gap-2.5 flex-1"}`}
              title="Skillora Alpha"
            >
              <img
                src={logoSrc}
                alt="Skillora Alpha"
                className="h-9 w-auto max-w-[40px] shrink-0 object-contain"
              />
              {!collapsed && (
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold tracking-wide text-[#171A26]">
                    SKILLORA ALPHA
                  </p>
                  <p className="truncate text-[10px] uppercase tracking-[0.12em] text-[#64748B]">
                    Learn · Practice · Advance
                  </p>
                </div>
              )}
            </Link>
            {!collapsed && (
              <button
                type="button"
                data-no-action-overlay
                onClick={() => setCollapsed(true)}
                className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-md text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#171A26] lg:inline-flex"
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            )}
            {collapsed && (
              <button
                type="button"
                data-no-action-overlay
                onClick={() => setCollapsed(false)}
                className="mt-2 hidden h-8 w-8 items-center justify-center rounded-md text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#171A26] lg:inline-flex"
                aria-label="Expand sidebar"
                title="Expand sidebar"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {!collapsed && (
        <div className="shrink-0 border-b border-[#E2E8F0] px-3 py-2.5">
          <label className="relative block">
            <span className="sr-only">Search menu</span>
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#64748B]"
              aria-hidden
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search menu..."
              className="h-9 w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] pl-8 pr-8 text-[13px] text-[#171A26] outline-none transition placeholder:text-[#64748B] focus:border-[#FFB70F] focus:bg-white focus:ring-2 focus:ring-[#FFB70F]/30"
            />
            {search && (
              <button
                type="button"
                data-no-action-overlay
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-[#64748B] hover:text-[#171A26]"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </label>
        </div>
      )}

      {collapsed && (
        <div className="flex shrink-0 justify-center border-b border-[#E2E8F0] py-2">
          <button
            type="button"
            data-no-action-overlay
            onClick={() => setCollapsed(false)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#171A26]"
            aria-label="Search menu"
            title="Search menu"
          >
            <Search className="h-4 w-4" />
          </button>
        </div>
      )}

      <nav
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-3 [-webkit-overflow-scrolling:touch]"
        aria-label="Admin navigation"
      >
        <div className="space-y-0.5 pb-4">
          {displayedItems.length === 0 && (
            <p className="px-3 py-6 text-center text-[13px] text-[#64748B]">
              No menu items match “{search.trim()}”.
            </p>
          )}

          {displayedItems.map((item) => {
            const Icon = item.icon
            const key = navKey(item)
            const hasChildren = Boolean(item.children?.length)
            const isOpen = openKeys.has(key)
            const containsActive = nodeContainsPath(item, pathname, activeBase)
            const isLeafActive = !hasChildren && activeLeafPath === item.path

            if (collapsed) {
              const href = hasChildren
                ? item.children?.[0]?.path || item.path
                : item.path
              return (
                <Link
                  key={key}
                  href={href}
                  title={item.label}
                  onClick={() => {
                    if (hasChildren) toggleKey(key, true)
                    notify(href)
                  }}
                  aria-current={containsActive ? "page" : undefined}
                  className={`relative mx-auto flex h-11 w-11 items-center justify-center rounded-lg transition-colors ${
                    containsActive
                      ? "bg-[#FFF7DF] text-[#171A26]"
                      : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#171A26]"
                  }`}
                >
                  {containsActive && (
                    <span
                      aria-hidden
                      className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-[#FFB70F]"
                    />
                  )}
                  {Icon && <Icon className="h-5 w-5" aria-hidden />}
                  <span className="sr-only">{item.label}</span>
                </Link>
              )
            }

            if (hasChildren || item.expandable) {
              return (
                <div key={key}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={`nav-group-${key}`}
                    data-no-action-overlay
                    onClick={() => toggleKey(key, true)}
                    className={`${parentClass(containsActive)} justify-between`}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      {containsActive && (
                        <span
                          aria-hidden
                          className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-[#FFB70F]"
                        />
                      )}
                      {Icon && (
                        <Icon
                          className={`h-4 w-4 shrink-0 ${
                            containsActive ? "text-[#FFB70F]" : "text-[#64748B]"
                          }`}
                          aria-hidden
                        />
                      )}
                      <span className="truncate">{item.label}</span>
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-[#64748B] transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                      aria-hidden
                    />
                  </button>
                  {isOpen && item.children?.length ? (
                    <div
                      id={`nav-group-${key}`}
                      role="group"
                      aria-label={item.label}
                      className="ml-3 mt-0.5 space-y-0.5 border-l border-[#E2E8F0] pl-2"
                    >
                      {item.children.map((child) => renderChild(child, 1))}
                    </div>
                  ) : null}
                </div>
              )
            }

            return (
              <Link
                key={key}
                href={item.path}
                onClick={() => {
                  setOpenKeys(new Set())
                  notify(item.path)
                }}
                aria-current={isLeafActive ? "page" : undefined}
                className={`${parentClass(isLeafActive)} relative`}
              >
                {isLeafActive && (
                  <span
                    aria-hidden
                    className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-[#FFB70F]"
                  />
                )}
                {Icon && (
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      isLeafActive ? "text-[#FFB70F]" : "text-[#64748B]"
                    }`}
                    aria-hidden
                  />
                )}
                <span className="truncate">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
