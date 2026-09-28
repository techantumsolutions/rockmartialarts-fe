/**
 * Role-based dashboard config: menu items and header actions.
 * Super Admin UI is the master; Branch Admin and Student use same UI, different menu + data.
 * M23-S01: grouped Partners / Coach ops / CRM; optional permissionId + enabled.
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
  User,
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
  Images,
  MessageSquareQuote,
  UserCog,
  Search,
  type LucideIcon,
} from "lucide-react"

export type DashboardRole = "super_admin" | "branch_admin" | "student"

export interface NavChild {
  label: string
  path: string
  icon?: LucideIcon
  permissionId?: string
  enabled?: boolean
}

export interface NavItem {
  label: string
  path: string
  icon?: LucideIcon
  children?: NavChild[]
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
  { label: "Dashboard", path: SUPER_ADMIN_BASE, icon: LayoutDashboard, permissionId: "dashboard" },
  { label: "Branches", path: `${SUPER_ADMIN_BASE}/branches`, icon: Building, permissionId: "branches" },
  {
    label: "Partners",
    path: `${SUPER_ADMIN_BASE}/partner-profiles`,
    icon: Handshake,
    overflowOnly: true,
    permissionId: "partners",
    children: [
      { label: "Partner Profiles", path: `${SUPER_ADMIN_BASE}/partner-profiles`, icon: Handshake, permissionId: "partners" },
      { label: "Partner Branding", path: `${SUPER_ADMIN_BASE}/partner-branding`, icon: ImageIcon, permissionId: "partners" },
      { label: "Partner Masters", path: `${SUPER_ADMIN_BASE}/partner-masters`, icon: Award, permissionId: "partners" },
      { label: "Partner Gallery", path: `${SUPER_ADMIN_BASE}/partner-gallery`, icon: Images, permissionId: "partners" },
      { label: "Partner Testimonials", path: `${SUPER_ADMIN_BASE}/partner-testimonials`, icon: MessageSquareQuote, permissionId: "partners" },
      { label: "Partner Team", path: `${SUPER_ADMIN_BASE}/partner-team`, icon: UserCog, permissionId: "partners" },
      { label: "Partner SEO", path: `${SUPER_ADMIN_BASE}/partner-seo`, icon: Search, permissionId: "partners" },
    ],
  },
  { label: "Coaches", path: `${SUPER_ADMIN_BASE}/coaches`, icon: Users, permissionId: "coaches" },
  {
    label: "Coach ops",
    path: `${SUPER_ADMIN_BASE}/coach-approvals`,
    icon: UserCheck,
    overflowOnly: true,
    permissionId: "coaches",
    children: [
      { label: "Coach Approvals", path: `${SUPER_ADMIN_BASE}/coach-approvals`, icon: UserCheck, permissionId: "coaches" },
      { label: "Coach Availability", path: `${SUPER_ADMIN_BASE}/coach-availability`, icon: Clock, permissionId: "coaches" },
      { label: "Coach Sub. Plans", path: `${SUPER_ADMIN_BASE}/coach-subscription-plans`, icon: CreditCard, permissionId: "coaches" },
      { label: "Coach Subscriptions", path: `${SUPER_ADMIN_BASE}/coach-subscriptions`, icon: CreditCard, permissionId: "coaches" },
    ],
  },
  {
    label: "Students",
    path: `${SUPER_ADMIN_BASE}/students`,
    icon: GraduationCap,
    permissionId: "students",
    children: [
      { label: "All Students", path: `${SUPER_ADMIN_BASE}/students`, icon: GraduationCap, permissionId: "students" },
      { label: "Bulk Import", path: `${SUPER_ADMIN_BASE}/students/import`, icon: GraduationCap, permissionId: "students" },
    ],
  },
  { label: "Courses", path: `${SUPER_ADMIN_BASE}/courses`, icon: BookOpen, permissionId: "courses" },
  {
    label: "Attendance",
    path: `${SUPER_ADMIN_BASE}/attendance`,
    icon: CalendarCheck,
    permissionId: "attendance",
    children: [
      { label: "Overview", path: `${SUPER_ADMIN_BASE}/attendance`, icon: CalendarCheck, permissionId: "attendance" },
      { label: "Student Attendance", path: `${SUPER_ADMIN_BASE}/attendance/students`, icon: GraduationCap, permissionId: "attendance" },
      { label: "Coach Attendance", path: `${SUPER_ADMIN_BASE}/attendance/coaches`, icon: Users, permissionId: "attendance" },
      { label: "Attendance Reports", path: `${SUPER_ADMIN_BASE}/attendance/reports`, icon: BarChart, permissionId: "attendance" },
      { label: "Biometric Devices", path: `${SUPER_ADMIN_BASE}/attendance/devices`, icon: Cpu, permissionId: "attendance" },
      { label: "Biometric Mapping", path: `${SUPER_ADMIN_BASE}/attendance/biometric-mapping`, icon: Fingerprint, permissionId: "attendance" },
    ],
  },
  { label: "Reports", path: `${SUPER_ADMIN_BASE}/reports`, icon: BarChart, permissionId: "reports" },
  { label: "Payment Tracking", path: `${SUPER_ADMIN_BASE}/payment-tracking`, icon: CreditCard, permissionId: "payments" },
  { label: "Invoices", path: `${SUPER_ADMIN_BASE}/invoices`, icon: FileText, overflowOnly: true, permissionId: "payments" },
  { label: "Billing Cycles", path: `${SUPER_ADMIN_BASE}/billing-cycles`, icon: CalendarCheck, overflowOnly: true, permissionId: "payments" },
  {
    label: "CRM",
    path: `${SUPER_ADMIN_BASE}/leads`,
    icon: UserPlus,
    overflowOnly: true,
    permissionId: "crm",
    children: [
      { label: "Leads", path: `${SUPER_ADMIN_BASE}/leads`, icon: UserPlus, permissionId: "crm" },
      { label: "Callbacks", path: `${SUPER_ADMIN_BASE}/callbacks`, icon: Phone, permissionId: "crm" },
      { label: "Demo Schedules", path: `${SUPER_ADMIN_BASE}/demo-schedules`, icon: CalendarClock, permissionId: "crm" },
      { label: "Demo Bookings", path: `${SUPER_ADMIN_BASE}/demo-bookings`, icon: CalendarCheck, permissionId: "crm" },
      { label: "Training Requests", path: `${SUPER_ADMIN_BASE}/training-requests`, icon: ClipboardList, permissionId: "crm" },
    ],
  },
  { label: "Camp Registrations", path: `${SUPER_ADMIN_BASE}/camp-registrations`, icon: Trophy, overflowOnly: true, permissionId: "events" },
  { label: "Events", path: `${SUPER_ADMIN_BASE}/events`, icon: CalendarClock, overflowOnly: true, permissionId: "events" },
  { label: "Event Registrations", path: `${SUPER_ADMIN_BASE}/event-registrations`, icon: ClipboardList, overflowOnly: true, permissionId: "events" },
  { label: "Promotions", path: `${SUPER_ADMIN_BASE}/promotions`, icon: Trophy, overflowOnly: true },
  { label: "Champions", path: `${SUPER_ADMIN_BASE}/champions`, icon: Trophy, overflowOnly: true },
  { label: "Coach Sessions", path: `${SUPER_ADMIN_BASE}/coach-session-bookings`, icon: CalendarClock, overflowOnly: true, permissionId: "coaches" },
  { label: "Testimonials", path: `${SUPER_ADMIN_BASE}/testimonials`, icon: MessageSquare, overflowOnly: true },
  { label: "Registration Forms", path: `${SUPER_ADMIN_BASE}/registration-forms`, icon: FileText, overflowOnly: true },
  { label: "Course Syllabus", path: `${SUPER_ADMIN_BASE}/course-syllabus`, icon: BookOpen, overflowOnly: true, permissionId: "courses" },
  {
    label: "Online Learning",
    path: `${SUPER_ADMIN_BASE}/online-learning/courses`,
    icon: MonitorPlay,
    overflowOnly: true,
    permissionId: "courses",
  },
  {
    label: "Learning Plans",
    path: `${SUPER_ADMIN_BASE}/online-learning/plans`,
    icon: CreditCard,
    overflowOnly: true,
    permissionId: "courses",
  },
  {
    label: "Learning Subs",
    path: `${SUPER_ADMIN_BASE}/online-learning/subscriptions`,
    icon: CreditCard,
    overflowOnly: true,
    permissionId: "courses",
  },
  {
    label: "Settings",
    path: `${SUPER_ADMIN_BASE}/settings`,
    icon: Settings,
    permissionId: "settings",
    children: [
      { label: "General Settings", path: `${SUPER_ADMIN_BASE}/settings`, permissionId: "settings" },
      { label: "Dropdown Settings", path: `${SUPER_ADMIN_BASE}/settings/dropdown-settings`, permissionId: "settings" },
      { label: "Notification Templates", path: `${SUPER_ADMIN_BASE}/settings/notification-templates`, permissionId: "settings" },
      { label: "Notification Delivery", path: `${SUPER_ADMIN_BASE}/settings/notification-delivery`, permissionId: "settings" },
      { label: "Discount Rules", path: `${SUPER_ADMIN_BASE}/discount-rules`, permissionId: "settings" },
      { label: "KPI Master", path: `${SUPER_ADMIN_BASE}/settings/kpi`, permissionId: "settings" },
      { label: "KPI Assessments", path: `${SUPER_ADMIN_BASE}/settings/kpi-assessments`, permissionId: "settings" },
      { label: "State & City", path: `${SUPER_ADMIN_BASE}/settings/geography`, permissionId: "settings" },
    ],
  },
]

const BRANCH_ADMIN_MENU: NavItem[] = [
  { label: "Dashboard", path: BRANCH_ADMIN_BASE, icon: LayoutDashboard, permissionId: "dashboard" },
  {
    label: "Partners",
    path: `${BRANCH_ADMIN_BASE}/partner-profiles`,
    icon: Handshake,
    overflowOnly: true,
    permissionId: "partners",
    children: [
      { label: "Partner Profiles", path: `${BRANCH_ADMIN_BASE}/partner-profiles`, icon: Handshake, permissionId: "partners" },
      { label: "Partner Branding", path: `${BRANCH_ADMIN_BASE}/partner-branding`, icon: ImageIcon, permissionId: "partners" },
      { label: "Partner Masters", path: `${BRANCH_ADMIN_BASE}/partner-masters`, icon: Award, permissionId: "partners" },
      { label: "Partner Gallery", path: `${BRANCH_ADMIN_BASE}/partner-gallery`, icon: Images, permissionId: "partners" },
      { label: "Partner Testimonials", path: `${BRANCH_ADMIN_BASE}/partner-testimonials`, icon: MessageSquareQuote, permissionId: "partners" },
      { label: "Partner Team", path: `${BRANCH_ADMIN_BASE}/partner-team`, icon: UserCog, permissionId: "partners" },
      { label: "Partner SEO", path: `${BRANCH_ADMIN_BASE}/partner-seo`, icon: Search, permissionId: "partners" },
    ],
  },
  { label: "Coaches", path: `${BRANCH_ADMIN_BASE}/coaches`, icon: Users, permissionId: "coaches" },
  {
    label: "Coach ops",
    path: `${BRANCH_ADMIN_BASE}/coach-approvals`,
    icon: UserCheck,
    overflowOnly: true,
    permissionId: "coaches",
    children: [
      { label: "Coach Approvals", path: `${BRANCH_ADMIN_BASE}/coach-approvals`, icon: UserCheck, permissionId: "coaches" },
      { label: "Coach Availability", path: `${BRANCH_ADMIN_BASE}/coach-availability`, icon: Clock, permissionId: "coaches" },
      { label: "Coach Subscriptions", path: `${BRANCH_ADMIN_BASE}/coach-subscriptions`, icon: CreditCard, permissionId: "coaches" },
    ],
  },
  {
    label: "CRM",
    path: `${BRANCH_ADMIN_BASE}/leads`,
    icon: UserPlus,
    overflowOnly: true,
    permissionId: "crm",
    children: [
      { label: "Leads", path: `${BRANCH_ADMIN_BASE}/leads`, icon: UserPlus, permissionId: "crm" },
      { label: "Callbacks", path: `${BRANCH_ADMIN_BASE}/callbacks`, icon: Phone, permissionId: "crm" },
      { label: "Demo Schedules", path: `${BRANCH_ADMIN_BASE}/demo-schedules`, icon: CalendarClock, permissionId: "crm" },
      { label: "Demo Bookings", path: `${BRANCH_ADMIN_BASE}/demo-bookings`, icon: CalendarCheck, permissionId: "crm" },
      { label: "Training Requests", path: `${BRANCH_ADMIN_BASE}/training-requests`, icon: ClipboardList, permissionId: "crm" },
    ],
  },
  { label: "Students", path: `${BRANCH_ADMIN_BASE}/students`, icon: GraduationCap, permissionId: "students" },
  { label: "Courses", path: `${BRANCH_ADMIN_BASE}/courses`, icon: BookOpen, permissionId: "courses" },
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
      { label: "Biometric Devices", path: `${BRANCH_ADMIN_BASE}/attendance/devices`, icon: Cpu, permissionId: "attendance" },
      { label: "Biometric Mapping", path: `${BRANCH_ADMIN_BASE}/attendance/biometric-mapping`, icon: Fingerprint, permissionId: "attendance" },
    ],
  },
  { label: "Reports", path: `${BRANCH_ADMIN_BASE}/reports`, icon: BarChart, permissionId: "reports" },
  { label: "KPI Assessments", path: `${BRANCH_ADMIN_BASE}/kpi-assessments`, icon: ClipboardList },
  { label: "Invoices", path: `${BRANCH_ADMIN_BASE}/invoices`, icon: FileText, overflowOnly: true, permissionId: "payments" },
  { label: "Billing Cycles", path: `${BRANCH_ADMIN_BASE}/billing-cycles`, icon: CalendarCheck, overflowOnly: true, permissionId: "payments" },
  { label: "Testimonials", path: `${BRANCH_ADMIN_BASE}/testimonials`, icon: MessageSquare, overflowOnly: true },
  { label: "Champions", path: `${BRANCH_ADMIN_BASE}/champions`, icon: Trophy, overflowOnly: true },
  { label: "Registration Forms", path: `${BRANCH_ADMIN_BASE}/registration-forms`, icon: FileText, overflowOnly: true },
  { label: "Events", path: `${BRANCH_ADMIN_BASE}/events`, icon: CalendarClock, overflowOnly: true, permissionId: "events" },
  { label: "Event Registrations", path: `${BRANCH_ADMIN_BASE}/event-registrations`, icon: ClipboardList, overflowOnly: true, permissionId: "events" },
  { label: "Coach Sessions", path: `${BRANCH_ADMIN_BASE}/coach-session-bookings`, icon: CalendarClock, overflowOnly: true, permissionId: "coaches" },
  { label: "Course Syllabus", path: `${BRANCH_ADMIN_BASE}/course-syllabus`, icon: BookOpen, overflowOnly: true, permissionId: "courses" },
  {
    label: "Settings",
    path: `${BRANCH_ADMIN_BASE}/settings`,
    icon: Settings,
    overflowOnly: true,
    permissionId: "settings",
    children: [
      { label: "Notification Templates", path: `${BRANCH_ADMIN_BASE}/settings/notification-templates`, permissionId: "settings" },
      { label: "Notification Delivery", path: `${BRANCH_ADMIN_BASE}/settings/notification-delivery`, permissionId: "settings" },
    ],
  },
]

const STUDENT_MENU: NavItem[] = [
  { label: "Dashboard", path: "/student-dashboard", icon: LayoutDashboard, permissionId: "dashboard" },
  { label: "Courses", path: "/student-dashboard/courses", icon: BookOpen, permissionId: "courses" },
  { label: "Online Learning", path: "/student-dashboard/online-learning", icon: MonitorPlay, permissionId: "courses" },
  { label: "Event Registrations", path: "/events/my-registrations", icon: CalendarClock },
  { label: "Syllabus", path: "/student-dashboard/syllabus", icon: FileText, permissionId: "syllabus" },
  { label: "Attendance", path: "/student-dashboard/attendance", icon: CalendarCheck, permissionId: "attendance" },
  { label: "Payments", path: "/student-dashboard/payments", icon: CreditCard, permissionId: "payments" },
  { label: "Invoices", path: "/student-dashboard/invoices", icon: FileText, permissionId: "payments" },
  { label: "Billing", path: "/student-dashboard/billing", icon: CalendarCheck, permissionId: "payments" },
  { label: "Profile", path: "/student-dashboard/profile", icon: User, permissionId: "profile" },
]

/** Super admin sees all; other roles need enabled + permission when permissionId set. */
export function filterNavItemsByPermission(
  items: NavItem[],
  opts: { role: DashboardRole; hasPermission: (id: string) => boolean }
): NavItem[] {
  if (opts.role === "super_admin") {
    return items.filter((i) => i.enabled !== false).map((i) => ({
      ...i,
      children: i.children?.filter((c) => c.enabled !== false),
    }))
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
      const children = i.children.filter((c) => allowed(c.permissionId ?? i.permissionId, c.enabled))
      if (children.length === 0 && i.children.length > 0) {
        // Parent was only a group — hide if no visible children
        return { ...i, children: [], enabled: false }
      }
      return { ...i, children }
    })
    .filter((i) => {
      if (i.enabled === false) return false
      if (i.children && i.children.length === 0 && !i.path) return false
      // Keep parents that still have children or are leaf links
      if (i.children && i.children.length === 0) {
        // Group with all children filtered out
        const wasGroup = ["Partners", "Coach ops", "CRM", "Attendance", "Students", "Settings"].includes(i.label)
        return !wasGroup
      }
      return true
    })
}

export function getMenuForRole(role: DashboardRole): NavItem[] {
  switch (role) {
    case "super_admin":
      return SUPER_ADMIN_MENU
    case "branch_admin":
      return BRANCH_ADMIN_MENU
    case "student":
      return STUDENT_MENU
    default:
      return SUPER_ADMIN_MENU
  }
}

export function getMainNavItems(role: DashboardRole): NavItem[] {
  return getMenuForRole(role).filter((i) => !i.overflowOnly)
}

export function getOverflowNavItems(role: DashboardRole): NavItem[] {
  return getMenuForRole(role).filter((i) => i.overflowOnly)
}

/** Header action buttons (Add Course, Add Coach, etc.) - super_admin only gets Add Branch Manager / Add New Branch */
export function getHeaderActionsForRole(role: DashboardRole): HeaderAction[] {
  const base = role === "super_admin" ? SUPER_ADMIN_BASE : role === "branch_admin" ? BRANCH_ADMIN_BASE : ""
  switch (role) {
    case "super_admin":
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
    default:
      return SUPER_ADMIN_BASE
  }
}

/** Paths used by QA / role matrix checks (BM must not include Partner* as top-level flat — grouped under Partners). */
export function getSuperAdminPartnerChildPaths(): string[] {
  return (
    SUPER_ADMIN_MENU.find((i) => i.label === "Partners")?.children?.map((c) => c.path) || []
  )
}

export function getBranchAdminMenuPathsFlat(): string[] {
  const out: string[] = []
  for (const i of BRANCH_ADMIN_MENU) {
    out.push(i.path)
    i.children?.forEach((c) => out.push(c.path))
  }
  return out
}
