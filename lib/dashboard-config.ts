/**
 * Role-based dashboard config: menu items and header actions.
 * Super Admin uses a hierarchical sidebar (10 parent groups). Routes/permissions unchanged.
 */

import {
  LayoutDashboard,
  Building,
  Users,
  GraduationCap,
  BookOpen,
  CalendarCheck,
  BarChart,
  CreditCard,
  Settings,
  UserPlus,
  MessageSquare,
  Trophy,
  FileText,
  Cpu,
  Fingerprint,
  ClipboardList,
  CalendarClock,
  UserCheck,
  Clock,
  Phone,
  MonitorPlay,
  Handshake,
  ImageIcon,
  Award,
  UserCog,
  Tags,
  Globe2,
  School,
  Layers,
  Megaphone,
  Wallet,
  TrendingUp,
  type LucideIcon,
} from "lucide-react"

export type DashboardRole = "super_admin" | "branch_admin" | "student" | "partner_super_admin"

const PARTNER_ADMIN_BASE = "/partner-admin/dashboard"

function remapPath(path: string, fromBase: string, toBase: string) {
  return path === fromBase || path.startsWith(`${fromBase}/`)
    ? `${toBase}${path.slice(fromBase.length)}`
    : path
}

function remapNavChildren(children: NavChild[] | undefined, fromBase: string, toBase: string): NavChild[] | undefined {
  if (!children?.length) return children
  return children.map((c) => ({
    ...c,
    path: remapPath(c.path, fromBase, toBase),
    children: remapNavChildren(c.children, fromBase, toBase),
  }))
}

export function remapNavBase(items: NavItem[], fromBase: string, toBase: string): NavItem[] {
  if (!fromBase || !toBase || fromBase === toBase) return items
  return items.map((i) => ({
    ...i,
    path: remapPath(i.path, fromBase, toBase),
    children: remapNavChildren(i.children, fromBase, toBase),
  }))
}

/** Super-admin menu without partner-org creation / CMS partner pages. */
const ROCK_ONLY_NAV_LABELS = new Set([
  "Camp Registrations",
  "Online Learning",
  "Learning Plans",
  "Learning Subscriptions",
  "Learning Subs",
  "Partners",
])

const ROCK_ONLY_PATH_SUFFIXES = [
  "/camp-registrations",
  "/callbacks",
  "/demo-schedules",
  "/demo-bookings",
  "/training-requests",
  "/coach-approvals",
  "/coach-subscription-plans",
  "/coach-subscriptions",
  "/coach-session-bookings",
  "/attendance/devices",
  "/attendance/biometric-mapping",
  "/partner-profiles",
]

function filterPartnerNavChildren(children: NavChild[] | undefined): NavChild[] | undefined {
  if (!children?.length) return children
  const next = children
    .filter((c) => {
      if (ROCK_ONLY_NAV_LABELS.has(c.label)) return false
      if (ROCK_ONLY_PATH_SUFFIXES.some((s) => c.path.endsWith(s))) return false
      return true
    })
    .map((c) => {
      const nested = filterPartnerNavChildren(c.children)
      return nested ? { ...c, children: nested } : { ...c, children: undefined }
    })
    .filter((c) => !(c.expandable && c.children && c.children.length === 0))
  return next
}

function partnerSuperAdminMenu(basePath: string = PARTNER_ADMIN_BASE): NavItem[] {
  const menu = remapNavBase(SUPER_ADMIN_MENU, SUPER_ADMIN_BASE, basePath)

  const academy = menu.find((i) => i.label === "Academy Management")
  if (academy?.children?.length) {
    academy.children = academy.children.filter((c) => c.label !== "Partners")
    const coachesIdx = academy.children.findIndex((c) => c.label === "Coaches")
    const branchManagersItem: NavChild = {
      id: "branch-managers",
      label: "Branch Managers",
      path: `${basePath}/branch-managers`,
      icon: UserCog,
      permissionId: "branches",
    }
    if (coachesIdx >= 0) academy.children.splice(coachesIdx, 0, branchManagersItem)
    else academy.children.push(branchManagersItem)
  }

  const courses = menu.find((i) => i.label === "Courses & Learning")
  if (courses?.children?.length) {
    const coursesIdx = courses.children.findIndex((c) => c.label === "Courses")
    const categoriesItem: NavChild = {
      id: "categories",
      label: "Categories",
      path: `${basePath}/categories`,
      icon: Tags,
      permissionId: "courses",
    }
    if (coursesIdx >= 0) courses.children.splice(coursesIdx + 1, 0, categoriesItem)
    else courses.children.unshift(categoriesItem)
  }

  menu.push({
    id: "org-branding",
    label: "Organization Branding",
    path: `${basePath}/org-branding`,
    icon: ImageIcon,
    permissionId: "org-branding",
  })

  const achievementsIdx = menu.findIndex((i) => i.path.endsWith("/achievements-showcase"))
  if (achievementsIdx >= 0) {
    menu[achievementsIdx] = {
      ...menu[achievementsIdx],
      label: "Organization Achievements",
      overflowOnly: true,
    }
  }

  return menu
    .map((i) => {
      if (ROCK_ONLY_NAV_LABELS.has(i.label)) return null
      if (ROCK_ONLY_PATH_SUFFIXES.some((s) => i.path.endsWith(s)) && !i.children?.length) return null
      const children = filterPartnerNavChildren(i.children)
      if (i.expandable && children && children.length === 0) return null
      return children ? { ...i, children } : { ...i, children: undefined }
    })
    .filter((i): i is NavItem => Boolean(i))
}

export interface NavChild {
  id?: string
  label: string
  path: string
  icon?: LucideIcon
  children?: NavChild[]
  /** Expandable nest — click toggles children; does not navigate. */
  expandable?: boolean
  permissionId?: string
  enabled?: boolean
}

export interface NavItem {
  id?: string
  label: string
  path: string
  icon?: LucideIcon
  children?: NavChild[]
  /** Expandable nest — click toggles children; does not navigate. */
  expandable?: boolean
  /** When true, item is shown only under the header ⋮ menu and the sidebar “More” block */
  overflowOnly?: boolean
  /** Maps to usePermissions permission id; omitted = always allowed (subject to enabled) */
  permissionId?: string
  /** When false, hide from nav (default true) */
  enabled?: boolean
}

export interface HeaderAction {
  label: string
  shortLabel?: string
  path: string
  icon?: string
}

const SUPER_ADMIN_BASE = "/super-admin/dashboard"
const BRANCH_ADMIN_BASE = "/branch-admin/dashboard"

const SUPER_ADMIN_MENU: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    path: SUPER_ADMIN_BASE,
    icon: LayoutDashboard,
    permissionId: "dashboard",
  },
  {
    id: "academy-management",
    label: "Academy Management",
    path: `${SUPER_ADMIN_BASE}/branches`,
    icon: School,
    expandable: true,
    children: [
      {
        id: "branches",
        label: "Branches",
        path: `${SUPER_ADMIN_BASE}/branches`,
        icon: Building,
        expandable: true,
        permissionId: "branches",
        children: [
          {
            id: "all-branches",
            label: "All Branches",
            path: `${SUPER_ADMIN_BASE}/branches`,
            icon: Building,
            permissionId: "branches",
          },
          {
            id: "branch-courses",
            label: "Branch–Course Assignment",
            path: `${SUPER_ADMIN_BASE}/branch-courses`,
            icon: BookOpen,
            permissionId: "branches",
          },
        ],
      },
      {
        id: "students",
        label: "Students",
        path: `${SUPER_ADMIN_BASE}/students`,
        icon: GraduationCap,
        expandable: true,
        permissionId: "students",
        children: [
          {
            id: "all-students",
            label: "All Students",
            path: `${SUPER_ADMIN_BASE}/students`,
            icon: GraduationCap,
            permissionId: "students",
          },
          {
            id: "students-import",
            label: "Bulk Import",
            path: `${SUPER_ADMIN_BASE}/students/import`,
            icon: GraduationCap,
            permissionId: "students",
          },
        ],
      },
      {
        id: "coaches",
        label: "Coaches",
        path: `${SUPER_ADMIN_BASE}/coaches`,
        icon: Users,
        permissionId: "coaches",
      },
      {
        id: "partners",
        label: "Partners",
        path: `${SUPER_ADMIN_BASE}/partner-profiles`,
        icon: Handshake,
        expandable: true,
        permissionId: "partners",
        children: [
          {
            id: "partner-profiles",
            label: "Partner Profiles",
            path: `${SUPER_ADMIN_BASE}/partner-profiles`,
            icon: Handshake,
            permissionId: "partners",
          },
        ],
      },
    ],
  },
  {
    id: "courses-learning",
    label: "Courses & Learning",
    path: `${SUPER_ADMIN_BASE}/courses`,
    icon: Layers,
    expandable: true,
    permissionId: "courses",
    children: [
      {
        id: "courses",
        label: "Courses",
        path: `${SUPER_ADMIN_BASE}/courses`,
        icon: BookOpen,
        permissionId: "courses",
      },
      {
        id: "course-syllabus",
        label: "Course Syllabus",
        path: `${SUPER_ADMIN_BASE}/course-syllabus`,
        icon: BookOpen,
        permissionId: "courses",
      },
      {
        id: "online-learning",
        label: "Online Learning",
        path: `${SUPER_ADMIN_BASE}/online-learning/courses`,
        icon: MonitorPlay,
        permissionId: "courses",
      },
      {
        id: "learning-plans",
        label: "Learning Plans",
        path: `${SUPER_ADMIN_BASE}/online-learning/plans`,
        icon: CreditCard,
        permissionId: "courses",
      },
      {
        id: "learning-subscriptions",
        label: "Learning Subscriptions",
        path: `${SUPER_ADMIN_BASE}/online-learning/subscriptions`,
        icon: CreditCard,
        permissionId: "courses",
      },
    ],
  },
  {
    id: "online-coaching",
    label: "Online Coaching",
    path: `${SUPER_ADMIN_BASE}/coach-approvals`,
    icon: Globe2,
    expandable: true,
    permissionId: "coaches",
    children: [
      {
        id: "coach-approvals",
        label: "Coach Approvals",
        path: `${SUPER_ADMIN_BASE}/coach-approvals`,
        icon: UserCheck,
        permissionId: "coaches",
      },
      {
        id: "coach-availability",
        label: "Coach Availability",
        path: `${SUPER_ADMIN_BASE}/coach-availability`,
        icon: Clock,
        permissionId: "coaches",
      },
      {
        id: "coach-subscription-plans",
        label: "Subscription Plans",
        path: `${SUPER_ADMIN_BASE}/coach-subscription-plans`,
        icon: CreditCard,
        permissionId: "coaches",
      },
      {
        id: "coach-subscriptions",
        label: "Coach Subscriptions",
        path: `${SUPER_ADMIN_BASE}/coach-subscriptions`,
        icon: CreditCard,
        permissionId: "coaches",
      },
      {
        id: "coach-session-bookings",
        label: "Session Bookings",
        path: `${SUPER_ADMIN_BASE}/coach-session-bookings`,
        icon: CalendarClock,
        permissionId: "coaches",
      },
    ],
  },
  {
    id: "attendance-biometrics",
    label: "Attendance & Biometrics",
    path: `${SUPER_ADMIN_BASE}/attendance`,
    icon: CalendarCheck,
    expandable: true,
    permissionId: "attendance",
    children: [
      {
        id: "attendance-overview",
        label: "Attendance Overview",
        path: `${SUPER_ADMIN_BASE}/attendance`,
        icon: CalendarCheck,
        permissionId: "attendance",
      },
      {
        id: "attendance-students",
        label: "Student Attendance",
        path: `${SUPER_ADMIN_BASE}/attendance/students`,
        icon: GraduationCap,
        permissionId: "attendance",
      },
      {
        id: "attendance-coaches",
        label: "Coach Attendance",
        path: `${SUPER_ADMIN_BASE}/attendance/coaches`,
        icon: Users,
        permissionId: "attendance",
      },
      {
        id: "attendance-reports",
        label: "Attendance Reports",
        path: `${SUPER_ADMIN_BASE}/attendance/reports`,
        icon: BarChart,
        permissionId: "attendance",
      },
      {
        id: "biometric-devices",
        label: "Biometric Devices",
        path: `${SUPER_ADMIN_BASE}/attendance/devices`,
        icon: Cpu,
        permissionId: "attendance",
      },
      {
        id: "biometric-mapping",
        label: "Biometric Mapping",
        path: `${SUPER_ADMIN_BASE}/attendance/biometric-mapping`,
        icon: Fingerprint,
        permissionId: "attendance",
      },
    ],
  },
  {
    id: "admissions-crm",
    label: "Admissions & CRM",
    path: `${SUPER_ADMIN_BASE}/leads`,
    icon: UserPlus,
    expandable: true,
    permissionId: "crm",
    children: [
      {
        id: "leads",
        label: "Leads",
        path: `${SUPER_ADMIN_BASE}/leads`,
        icon: UserPlus,
        permissionId: "crm",
      },
      {
        id: "callbacks",
        label: "Callbacks",
        path: `${SUPER_ADMIN_BASE}/callbacks`,
        icon: Phone,
        permissionId: "crm",
      },
      {
        id: "demo-schedules",
        label: "Demo Schedules",
        path: `${SUPER_ADMIN_BASE}/demo-schedules`,
        icon: CalendarClock,
        permissionId: "crm",
      },
      {
        id: "demo-bookings",
        label: "Demo Bookings",
        path: `${SUPER_ADMIN_BASE}/demo-bookings`,
        icon: CalendarCheck,
        permissionId: "crm",
      },
      {
        id: "training-requests",
        label: "Training Requests",
        path: `${SUPER_ADMIN_BASE}/training-requests`,
        icon: ClipboardList,
        permissionId: "crm",
      },
      {
        id: "registration-forms",
        label: "Registration Forms",
        path: `${SUPER_ADMIN_BASE}/registration-forms`,
        icon: FileText,
      },
    ],
  },
  {
    id: "events-camps",
    label: "Events & Camps",
    path: `${SUPER_ADMIN_BASE}/events`,
    icon: Trophy,
    expandable: true,
    permissionId: "events",
    children: [
      {
        id: "events",
        label: "Events",
        path: `${SUPER_ADMIN_BASE}/events`,
        icon: CalendarClock,
        permissionId: "events",
      },
      {
        id: "event-registrations",
        label: "Event Registrations",
        path: `${SUPER_ADMIN_BASE}/event-registrations`,
        icon: ClipboardList,
        permissionId: "events",
      },
      {
        id: "camp-registrations",
        label: "Camp Registrations",
        path: `${SUPER_ADMIN_BASE}/camp-registrations`,
        icon: Trophy,
        permissionId: "events",
      },
    ],
  },
  {
    id: "finance-billing",
    label: "Finance & Billing",
    path: `${SUPER_ADMIN_BASE}/payment-tracking`,
    icon: Wallet,
    expandable: true,
    permissionId: "payments",
    children: [
      {
        id: "payment-tracking",
        label: "Payment Tracking",
        path: `${SUPER_ADMIN_BASE}/payment-tracking`,
        icon: CreditCard,
        permissionId: "payments",
      },
      {
        id: "invoices",
        label: "Invoices",
        path: `${SUPER_ADMIN_BASE}/invoices`,
        icon: FileText,
        permissionId: "payments",
      },
      {
        id: "billing-cycles",
        label: "Billing Cycles",
        path: `${SUPER_ADMIN_BASE}/billing-cycles`,
        icon: CalendarCheck,
        permissionId: "payments",
      },
    ],
  },
  {
    id: "marketing-content",
    label: "Marketing & Content",
    path: `${SUPER_ADMIN_BASE}/promotions`,
    icon: Megaphone,
    expandable: true,
    children: [
      {
        id: "promotions",
        label: "Promotions",
        path: `${SUPER_ADMIN_BASE}/promotions`,
        icon: Trophy,
      },
      {
        id: "champions",
        label: "Champions",
        path: `${SUPER_ADMIN_BASE}/champions`,
        icon: Award,
      },
      {
        id: "testimonials",
        label: "Testimonials",
        path: `${SUPER_ADMIN_BASE}/testimonials`,
        icon: MessageSquare,
      },
    ],
  },
  {
    id: "reports-analytics",
    label: "Reports & Analytics",
    path: `${SUPER_ADMIN_BASE}/reports`,
    icon: BarChart,
    permissionId: "reports",
  },
  {
    id: "settings",
    label: "Settings",
    path: `${SUPER_ADMIN_BASE}/settings`,
    icon: Settings,
    permissionId: "settings",
    overflowOnly: true,
    children: [
      { label: "General Settings", path: `${SUPER_ADMIN_BASE}/settings`, permissionId: "settings" },
      {
        label: "Dropdown Settings",
        path: `${SUPER_ADMIN_BASE}/settings/dropdown-settings`,
        permissionId: "settings",
      },
      {
        label: "Notification Templates",
        path: `${SUPER_ADMIN_BASE}/settings/notification-templates`,
        permissionId: "settings",
      },
      {
        label: "Notification Delivery",
        path: `${SUPER_ADMIN_BASE}/settings/notification-delivery`,
        permissionId: "settings",
      },
      { label: "Discount Rules", path: `${SUPER_ADMIN_BASE}/discount-rules`, permissionId: "settings" },
      { label: "KPI Master", path: `${SUPER_ADMIN_BASE}/settings/kpi`, permissionId: "settings" },
      {
        label: "KPI Assessments",
        path: `${SUPER_ADMIN_BASE}/settings/kpi-assessments`,
        permissionId: "settings",
      },
    ],
  },
]

const BRANCH_ADMIN_MENU: NavItem[] = [
  { label: "Dashboard", path: BRANCH_ADMIN_BASE, icon: LayoutDashboard, permissionId: "dashboard" },
  {
    label: "Coaches",
    path: `${BRANCH_ADMIN_BASE}/coaches`,
    icon: Users,
    permissionId: "coaches",
  },
  {
    label: "Online Coaches",
    path: `${BRANCH_ADMIN_BASE}/coach-availability`,
    icon: Globe2,
    permissionId: "coaches",
    children: [
      { label: "Availability", path: `${BRANCH_ADMIN_BASE}/coach-availability`, icon: Clock, permissionId: "coaches" },
    ],
  },
  { label: "Students", path: `${BRANCH_ADMIN_BASE}/students`, icon: GraduationCap, permissionId: "students" },
  {
    label: "Courses",
    path: `${BRANCH_ADMIN_BASE}/courses`,
    icon: BookOpen,
    permissionId: "courses",
    children: [
      { label: "Course Catalog", path: `${BRANCH_ADMIN_BASE}/courses`, icon: BookOpen, permissionId: "courses" },
      {
        label: "Branch–Course Assignments",
        path: `${BRANCH_ADMIN_BASE}/branch-courses`,
        icon: BookOpen,
        permissionId: "courses",
      },
    ],
  },
  {
    label: "Attendance",
    path: `${BRANCH_ADMIN_BASE}/attendance`,
    icon: CalendarCheck,
    permissionId: "attendance",
    children: [
      { label: "Overview", path: `${BRANCH_ADMIN_BASE}/attendance`, icon: CalendarCheck, permissionId: "attendance" },
      { label: "Student Attendance", path: `${BRANCH_ADMIN_BASE}/attendance/students`, icon: GraduationCap, permissionId: "attendance" },
      { label: "Coach Attendance", path: `${BRANCH_ADMIN_BASE}/attendance/coaches`, icon: Users, permissionId: "attendance" },
      { label: "Attendance Reports", path: `${BRANCH_ADMIN_BASE}/attendance/reports`, icon: BarChart, permissionId: "attendance" },
      { label: "Biometric Mapping", path: `${BRANCH_ADMIN_BASE}/attendance/biometric-mapping`, icon: Fingerprint, permissionId: "attendance" },
    ],
  },
  { label: "Reports", path: `${BRANCH_ADMIN_BASE}/reports`, icon: BarChart, permissionId: "reports" },
  { label: "Leads", path: `${BRANCH_ADMIN_BASE}/leads`, icon: UserPlus, overflowOnly: true, permissionId: "crm" },
  { label: "Demo Bookings", path: `${BRANCH_ADMIN_BASE}/demo-bookings`, icon: CalendarCheck, overflowOnly: true, permissionId: "crm" },
  { label: "Invoices", path: `${BRANCH_ADMIN_BASE}/invoices`, icon: FileText, overflowOnly: true, permissionId: "payments" },
  { label: "Testimonials", path: `${BRANCH_ADMIN_BASE}/testimonials`, icon: MessageSquare, overflowOnly: true },
  { label: "Champions", path: `${BRANCH_ADMIN_BASE}/champions`, icon: Trophy, overflowOnly: true },
  { label: "Events", path: `${BRANCH_ADMIN_BASE}/events`, icon: CalendarClock, overflowOnly: true, permissionId: "events" },
]

const STUDENT_MENU: NavItem[] = [
  { id: "dashboard", label: "Dashboard", path: "/student-dashboard", icon: LayoutDashboard, permissionId: "dashboard" },
  { id: "courses", label: "My Courses", path: "/student-dashboard/courses", icon: BookOpen, permissionId: "courses" },
  { id: "attendance", label: "Attendance", path: "/student-dashboard/attendance", icon: CalendarCheck, permissionId: "attendance" },
  { id: "performance", label: "Performance", path: "/student-dashboard/performance", icon: Trophy, permissionId: "performance" },
  { id: "progress", label: "Progress", path: "/student-dashboard/progress", icon: TrendingUp },
  { id: "syllabus", label: "Syllabus", path: "/student-dashboard/syllabus", icon: FileText, permissionId: "syllabus" },
  { id: "payments", label: "Payments", path: "/student-dashboard/payments", icon: CreditCard, permissionId: "payments" },
  { id: "invoices", label: "Invoices", path: "/student-dashboard/invoices", icon: FileText, permissionId: "payments" },
  { id: "billing", label: "Billing", path: "/student-dashboard/billing", icon: Wallet, permissionId: "payments" },
  { id: "registration-forms", label: "Registration Forms", path: "/student-dashboard/registration-forms", icon: ClipboardList, permissionId: "registration_forms" },
]

function filterNavChildrenByPermission(
  children: NavChild[] | undefined,
  allowed: (permissionId?: string, enabled?: boolean) => boolean,
  parentPermissionId?: string
): NavChild[] | undefined {
  if (!children?.length) return children
  const next = children
    .filter((c) => allowed(c.permissionId ?? parentPermissionId, c.enabled))
    .map((c) => {
      const nested = filterNavChildrenByPermission(
        c.children,
        allowed,
        c.permissionId ?? parentPermissionId
      )
      return nested ? { ...c, children: nested } : { ...c, children: undefined }
    })
    .filter((c) => !(c.expandable && (!c.children || c.children.length === 0)))
  return next
}

/** Super admin sees all; other roles need enabled + permission when permissionId set. */
export function filterNavItemsByPermission(
  items: NavItem[],
  opts: { role: DashboardRole; hasPermission: (id: string) => boolean }
): NavItem[] {
  if (opts.role === "super_admin" || opts.role === "partner_super_admin") {
    const keepEnabled = (children: NavChild[] | undefined): NavChild[] | undefined => {
      if (!children?.length) return children
      return children
        .filter((c) => c.enabled !== false)
        .map((c) => ({ ...c, children: keepEnabled(c.children) }))
    }
    return items
      .filter((i) => i.enabled !== false)
      .map((i) => ({ ...i, children: keepEnabled(i.children) }))
  }

  const allowed = (permissionId?: string, enabled?: boolean) => {
    if (enabled === false) return false
    if (!permissionId) return true
    return opts.hasPermission(permissionId)
  }

  return items
    .filter((i) => allowed(i.permissionId, i.enabled))
    .map((i) => {
      if (!i.children?.length) return i
      const children = filterNavChildrenByPermission(i.children, allowed, i.permissionId)
      return { ...i, children }
    })
    .filter((i) => {
      if (i.enabled === false) return false
      if (i.expandable && (!i.children || i.children.length === 0)) return false
      return true
    })
}

const PARTNER_BRANCH_MANAGER_HIDDEN_LABELS = new Set([
  "Demo Bookings",
  "Training Requests",
])

/** True when the signed-in branch manager belongs to a white-label partner. */
export function isPartnerBranchManagerNav(): boolean {
  if (typeof window === "undefined") return false
  if (localStorage.getItem("partner_bm_session") === "1") return true
  try {
    const raw = localStorage.getItem("branch_manager")
    if (!raw) return false
    const user = JSON.parse(raw) as { role?: string; partner_org_id?: string }
    const role = String(user.role || "").toLowerCase()
    if (role !== "branch_manager" && role !== "branch_admin") return false
    if (String(user.partner_org_id || "").trim()) return true
    // Partner branch-manager login stores this; Rock login clears it.
    return !!localStorage.getItem("partner_slug")
  } catch {
    return false
  }
}

type MenuOptions = { partnerBranchManager?: boolean }

export function getMenuForRole(
  role: DashboardRole,
  basePathOverride?: string,
  options?: MenuOptions
): NavItem[] {
  switch (role) {
    case "super_admin":
      return SUPER_ADMIN_MENU
    case "branch_admin":
      return options?.partnerBranchManager
        ? BRANCH_ADMIN_MENU.filter((item) => !PARTNER_BRANCH_MANAGER_HIDDEN_LABELS.has(item.label))
        : BRANCH_ADMIN_MENU
    case "student":
      return STUDENT_MENU
    case "partner_super_admin":
      return partnerSuperAdminMenu(basePathOverride || PARTNER_ADMIN_BASE)
    default:
      return SUPER_ADMIN_MENU
  }
}

export function getMainNavItems(
  role: DashboardRole,
  basePathOverride?: string,
  options?: MenuOptions
): NavItem[] {
  return getMenuForRole(role, basePathOverride, options).filter((i) => !i.overflowOnly)
}

export function getOverflowNavItems(
  role: DashboardRole,
  basePathOverride?: string,
  options?: MenuOptions
): NavItem[] {
  return getMenuForRole(role, basePathOverride, options).filter((i) => i.overflowOnly)
}

/** Header action buttons (Add Course, Add Coach, etc.) - super_admin only gets Add Branch Manager / Add New Branch */
export function getHeaderActionsForRole(role: DashboardRole, basePathOverride?: string): HeaderAction[] {
  const base =
    basePathOverride ||
    (role === "super_admin"
      ? SUPER_ADMIN_BASE
      : role === "branch_admin"
        ? BRANCH_ADMIN_BASE
        : role === "partner_super_admin"
          ? PARTNER_ADMIN_BASE
          : "")
  switch (role) {
    case "super_admin":
    case "partner_super_admin":
      return [
        { label: "Add Course", shortLabel: "Course", path: `${base}/create-course` },
        { label: "Add Coach", shortLabel: "Coach", path: `${base}/add-coach` },
        { label: "Add Branch Manager", shortLabel: "Manager", path: `${base}/branch-managers/create` },
        { label: "Add New Branch", shortLabel: "Branch", path: `${base}/create-branch` },
      ]
    case "branch_admin":
      return [
        { label: "Add Course", shortLabel: "Course", path: `${base}/create-course` },
        { label: "Add Coach", shortLabel: "Coach", path: `${base}/add-coach` },
      ]
    case "student":
      return []
    default:
      return []
  }
}

export function getRoleLabel(role: DashboardRole): string {
  switch (role) {
    case "super_admin":
      return "Super admin"
    case "branch_admin":
      return "Branch Admin"
    case "student":
      return "Student"
    case "partner_super_admin":
      if (typeof window !== "undefined") {
        const fromStorage = (localStorage.getItem("partner_name") || "").trim()
        if (fromStorage) return fromStorage
        try {
          const raw = localStorage.getItem("user")
          if (raw) {
            const user = JSON.parse(raw) as { partner_name?: string; full_name?: string }
            const fromUser = (user.partner_name || user.full_name || "").trim()
            if (fromUser) return fromUser
          }
        } catch {
          /* ignore */
        }
      }
      return "Partner admin"
    default:
      return "User"
  }
}

export function getBasePath(role: DashboardRole): string {
  switch (role) {
    case "super_admin":
      return SUPER_ADMIN_BASE
    case "branch_admin":
      return BRANCH_ADMIN_BASE
    case "student":
      return "/student-dashboard"
    case "partner_super_admin":
      if (typeof window !== "undefined") {
        const slug = localStorage.getItem("partner_slug")
        if (slug) return `/partners/${slug}/dashboard`
      }
      return PARTNER_ADMIN_BASE
    default:
      return SUPER_ADMIN_BASE
  }
}

function collectLeafPaths(children: NavChild[] | undefined, out: string[]) {
  if (!children?.length) return
  for (const c of children) {
    if (c.children?.length) collectLeafPaths(c.children, out)
    else out.push(c.path)
  }
}

/** Paths used by QA / role matrix checks — Partner Profiles under Academy Management → Partners. */
export function getSuperAdminPartnerChildPaths(): string[] {
  const academy = SUPER_ADMIN_MENU.find((i) => i.label === "Academy Management")
  const partners = academy?.children?.find((c) => c.label === "Partners")
  const out: string[] = []
  if (partners?.children?.length) collectLeafPaths(partners.children, out)
  else if (partners) out.push(partners.path)
  return out
}

export function getBranchAdminMenuPathsFlat(): string[] {
  const out: string[] = []
  for (const i of BRANCH_ADMIN_MENU) {
    out.push(i.path)
    i.children?.forEach((c) => {
      out.push(c.path)
      c.children?.forEach((n) => out.push(n.path))
    })
  }
  return out
}

/** Flatten all navigable leaf routes from a menu tree (for search / QA). */
export function flattenNavLeafPaths(items: NavItem[]): string[] {
  const out: string[] = []
  for (const i of items) {
    if (i.children?.length) collectLeafPaths(i.children, out)
    else if (!i.expandable) out.push(i.path)
  }
  return out
}
