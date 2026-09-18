/**
 * Role-based dashboard config: menu items and header actions.
 * Super Admin UI is the master; Branch Admin and Student use same UI, different menu + data.
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
  CreditCard,
  Phone,
  MonitorPlay,
  Handshake,
  ImageIcon,
  Award,
  Images,
  MessageSquareQuote,
  UserCog,
  Search,
  type LucideIcon
} from "lucide-react"

export type DashboardRole = "super_admin" | "branch_admin" | "student"

export interface NavItem {
  label: string
  path: string
  icon?: LucideIcon
  children?: { label: string; path: string; icon?: LucideIcon }[]
  /** When true, item is shown only under the header ⋮ menu and the sidebar “More” block */
  overflowOnly?: boolean
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
  { label: "Dashboard", path: SUPER_ADMIN_BASE, icon: LayoutDashboard },
  { label: "Branches", path: `${SUPER_ADMIN_BASE}/branches`, icon: Building },
  { label: "Partner Profiles", path: `${SUPER_ADMIN_BASE}/partner-profiles`, icon: Handshake, overflowOnly: true },
  { label: "Partner Branding", path: `${SUPER_ADMIN_BASE}/partner-branding`, icon: ImageIcon, overflowOnly: true },
  { label: "Partner Masters", path: `${SUPER_ADMIN_BASE}/partner-masters`, icon: Award, overflowOnly: true },
  { label: "Partner Gallery", path: `${SUPER_ADMIN_BASE}/partner-gallery`, icon: Images, overflowOnly: true },
  { label: "Partner Testimonials", path: `${SUPER_ADMIN_BASE}/partner-testimonials`, icon: MessageSquareQuote, overflowOnly: true },
  { label: "Partner Team", path: `${SUPER_ADMIN_BASE}/partner-team`, icon: UserCog, overflowOnly: true },
  { label: "Partner SEO", path: `${SUPER_ADMIN_BASE}/partner-seo`, icon: Search, overflowOnly: true },
  { label: "Coaches", path: `${SUPER_ADMIN_BASE}/coaches`, icon: Users },
  { label: "Coach Approvals", path: `${SUPER_ADMIN_BASE}/coach-approvals`, icon: UserCheck, overflowOnly: true },
  { label: "Coach Availability", path: `${SUPER_ADMIN_BASE}/coach-availability`, icon: Clock, overflowOnly: true },
  { label: "Coach Sub. Plans", path: `${SUPER_ADMIN_BASE}/coach-subscription-plans`, icon: CreditCard, overflowOnly: true },
  { label: "Coach Subscriptions", path: `${SUPER_ADMIN_BASE}/coach-subscriptions`, icon: CreditCard, overflowOnly: true },
  {
    label: "Students",
    path: `${SUPER_ADMIN_BASE}/students`,
    icon: GraduationCap,
    children: [
      { label: "All Students", path: `${SUPER_ADMIN_BASE}/students`, icon: GraduationCap },
      { label: "Bulk Import", path: `${SUPER_ADMIN_BASE}/students/import`, icon: GraduationCap },
    ],
  },
  { label: "Courses", path: `${SUPER_ADMIN_BASE}/courses`, icon: BookOpen },
  {
    label: "Attendance",
    path: `${SUPER_ADMIN_BASE}/attendance`,
    icon: CalendarCheck,
    children: [
      { label: "Overview", path: `${SUPER_ADMIN_BASE}/attendance`, icon: CalendarCheck },
      { label: "Student Attendance", path: `${SUPER_ADMIN_BASE}/attendance/students`, icon: GraduationCap },
      { label: "Coach Attendance", path: `${SUPER_ADMIN_BASE}/attendance/coaches`, icon: Users },
      { label: "Attendance Reports", path: `${SUPER_ADMIN_BASE}/attendance/reports`, icon: BarChart },
      { label: "Biometric Devices", path: `${SUPER_ADMIN_BASE}/attendance/devices`, icon: Cpu },
      { label: "Biometric Mapping", path: `${SUPER_ADMIN_BASE}/attendance/biometric-mapping`, icon: Fingerprint },
    ],
  },
  { label: "Reports", path: `${SUPER_ADMIN_BASE}/reports`, icon: BarChart },
  { label: "Payment Tracking", path: `${SUPER_ADMIN_BASE}/payment-tracking`, icon: CreditCard },
  { label: "Invoices", path: `${SUPER_ADMIN_BASE}/invoices`, icon: FileText, overflowOnly: true },
  { label: "Billing Cycles", path: `${SUPER_ADMIN_BASE}/billing-cycles`, icon: CalendarCheck, overflowOnly: true },
  { label: "Leads", path: `${SUPER_ADMIN_BASE}/leads`, icon: UserPlus, overflowOnly: true },
  { label: "Callbacks", path: `${SUPER_ADMIN_BASE}/callbacks`, icon: Phone, overflowOnly: true },
  { label: "Camp Registrations", path: `${SUPER_ADMIN_BASE}/camp-registrations`, icon: Trophy, overflowOnly: true },
  { label: "Training Requests", path: `${SUPER_ADMIN_BASE}/training-requests`, icon: ClipboardList, overflowOnly: true },
  { label: "Demo Schedules", path: `${SUPER_ADMIN_BASE}/demo-schedules`, icon: CalendarClock, overflowOnly: true },
  { label: "Demo Bookings", path: `${SUPER_ADMIN_BASE}/demo-bookings`, icon: CalendarCheck, overflowOnly: true },
  { label: "Events", path: `${SUPER_ADMIN_BASE}/events`, icon: CalendarClock, overflowOnly: true },
  { label: "Event Registrations", path: `${SUPER_ADMIN_BASE}/event-registrations`, icon: ClipboardList, overflowOnly: true },
  { label: "Promotions", path: `${SUPER_ADMIN_BASE}/promotions`, icon: Trophy, overflowOnly: true },
  { label: "Champions", path: `${SUPER_ADMIN_BASE}/champions`, icon: Trophy, overflowOnly: true },
  { label: "Coach Sessions", path: `${SUPER_ADMIN_BASE}/coach-session-bookings`, icon: CalendarClock, overflowOnly: true },
  { label: "Testimonials", path: `${SUPER_ADMIN_BASE}/testimonials`, icon: MessageSquare, overflowOnly: true },
  { label: "Registration Forms", path: `${SUPER_ADMIN_BASE}/registration-forms`, icon: FileText, overflowOnly: true },
  { label: "Course Syllabus", path: `${SUPER_ADMIN_BASE}/course-syllabus`, icon: BookOpen, overflowOnly: true },
  {
    label: "Online Learning",
    path: `${SUPER_ADMIN_BASE}/online-learning/courses`,
    icon: MonitorPlay,
    overflowOnly: true,
  },
  {
    label: "Learning Plans",
    path: `${SUPER_ADMIN_BASE}/online-learning/plans`,
    icon: CreditCard,
    overflowOnly: true,
  },
  {
    label: "Learning Subs",
    path: `${SUPER_ADMIN_BASE}/online-learning/subscriptions`,
    icon: CreditCard,
    overflowOnly: true,
  },
  {
    label: "Settings",
    path: `${SUPER_ADMIN_BASE}/settings`,
    icon: Settings,
    children: [
      { label: "General Settings", path: `${SUPER_ADMIN_BASE}/settings` },
      { label: "Dropdown Settings", path: `${SUPER_ADMIN_BASE}/settings/dropdown-settings` },
      { label: "Notification Templates", path: `${SUPER_ADMIN_BASE}/settings/notification-templates` },
      { label: "Notification Delivery", path: `${SUPER_ADMIN_BASE}/settings/notification-delivery` },
      { label: "Discount Rules", path: `${SUPER_ADMIN_BASE}/discount-rules` },
      { label: "KPI Master", path: `${SUPER_ADMIN_BASE}/settings/kpi` },
      { label: "KPI Assessments", path: `${SUPER_ADMIN_BASE}/settings/kpi-assessments` },
      { label: "State & City", path: `${SUPER_ADMIN_BASE}/settings/geography` },
    ],
  },
]

// Branch admin: no Branches menu, no Add Branch Manager / Add New Branch
const BRANCH_ADMIN_MENU: NavItem[] = [
  { label: "Dashboard", path: BRANCH_ADMIN_BASE, icon: LayoutDashboard },
  { label: "Partner Profiles", path: `${BRANCH_ADMIN_BASE}/partner-profiles`, icon: Handshake, overflowOnly: true },
  { label: "Partner Branding", path: `${BRANCH_ADMIN_BASE}/partner-branding`, icon: ImageIcon, overflowOnly: true },
  { label: "Partner Masters", path: `${BRANCH_ADMIN_BASE}/partner-masters`, icon: Award, overflowOnly: true },
  { label: "Partner Gallery", path: `${BRANCH_ADMIN_BASE}/partner-gallery`, icon: Images, overflowOnly: true },
  { label: "Partner Testimonials", path: `${BRANCH_ADMIN_BASE}/partner-testimonials`, icon: MessageSquareQuote, overflowOnly: true },
  { label: "Partner Team", path: `${BRANCH_ADMIN_BASE}/partner-team`, icon: UserCog, overflowOnly: true },
  { label: "Partner SEO", path: `${BRANCH_ADMIN_BASE}/partner-seo`, icon: Search, overflowOnly: true },
  { label: "Coaches", path: `${BRANCH_ADMIN_BASE}/coaches`, icon: Users },
  { label: "Coach Approvals", path: `${BRANCH_ADMIN_BASE}/coach-approvals`, icon: UserCheck, overflowOnly: true },
  { label: "Coach Availability", path: `${BRANCH_ADMIN_BASE}/coach-availability`, icon: Clock, overflowOnly: true },
  { label: "Coach Subscriptions", path: `${BRANCH_ADMIN_BASE}/coach-subscriptions`, icon: CreditCard, overflowOnly: true },
  { label: "Leads", path: `${BRANCH_ADMIN_BASE}/leads`, icon: UserPlus, overflowOnly: true },
  { label: "Callbacks", path: `${BRANCH_ADMIN_BASE}/callbacks`, icon: Phone, overflowOnly: true },
  { label: "Students", path: `${BRANCH_ADMIN_BASE}/students`, icon: GraduationCap },
  { label: "Courses", path: `${BRANCH_ADMIN_BASE}/courses`, icon: BookOpen },
  {
    label: "Attendance",
    path: `${BRANCH_ADMIN_BASE}/attendance`,
    icon: CalendarCheck,
    children: [
      { label: "Overview", path: `${BRANCH_ADMIN_BASE}/attendance`, icon: CalendarCheck },
      { label: "Student Attendance", path: `${BRANCH_ADMIN_BASE}/attendance/students`, icon: GraduationCap },
      { label: "Coach Attendance", path: `${BRANCH_ADMIN_BASE}/attendance/coaches`, icon: Users },
      { label: "Attendance Reports", path: `${BRANCH_ADMIN_BASE}/attendance/reports`, icon: BarChart },
      { label: "Biometric Devices", path: `${BRANCH_ADMIN_BASE}/attendance/devices`, icon: Cpu },
      { label: "Biometric Mapping", path: `${BRANCH_ADMIN_BASE}/attendance/biometric-mapping`, icon: Fingerprint },
    ],
  },
  { label: "Reports", path: `${BRANCH_ADMIN_BASE}/reports`, icon: BarChart },
  { label: "KPI Assessments", path: `${BRANCH_ADMIN_BASE}/kpi-assessments`, icon: ClipboardList },
  { label: "Invoices", path: `${BRANCH_ADMIN_BASE}/invoices`, icon: FileText, overflowOnly: true },
  { label: "Billing Cycles", path: `${BRANCH_ADMIN_BASE}/billing-cycles`, icon: CalendarCheck, overflowOnly: true },
  { label: "Testimonials", path: `${BRANCH_ADMIN_BASE}/testimonials`, icon: MessageSquare, overflowOnly: true },
  { label: "Champions", path: `${BRANCH_ADMIN_BASE}/champions`, icon: Trophy, overflowOnly: true },
  { label: "Registration Forms", path: `${BRANCH_ADMIN_BASE}/registration-forms`, icon: FileText, overflowOnly: true },
  { label: "Training Requests", path: `${BRANCH_ADMIN_BASE}/training-requests`, icon: ClipboardList, overflowOnly: true },
  { label: "Demo Schedules", path: `${BRANCH_ADMIN_BASE}/demo-schedules`, icon: CalendarClock, overflowOnly: true },
  { label: "Demo Bookings", path: `${BRANCH_ADMIN_BASE}/demo-bookings`, icon: CalendarCheck, overflowOnly: true },
  { label: "Events", path: `${BRANCH_ADMIN_BASE}/events`, icon: CalendarClock, overflowOnly: true },
  { label: "Event Registrations", path: `${BRANCH_ADMIN_BASE}/event-registrations`, icon: ClipboardList, overflowOnly: true },
  { label: "Coach Sessions", path: `${BRANCH_ADMIN_BASE}/coach-session-bookings`, icon: CalendarClock, overflowOnly: true },
  { label: "Course Syllabus", path: `${BRANCH_ADMIN_BASE}/course-syllabus`, icon: BookOpen, overflowOnly: true },
  {
    label: "Settings",
    path: `${BRANCH_ADMIN_BASE}/settings`,
    icon: Settings,
    overflowOnly: true,
    children: [
      {
        label: "Notification Templates",
        path: `${BRANCH_ADMIN_BASE}/settings/notification-templates`,
      },
      {
        label: "Notification Delivery",
        path: `${BRANCH_ADMIN_BASE}/settings/notification-delivery`,
      },
    ],
  },
]

const STUDENT_MENU: NavItem[] = [
  { label: "Dashboard", path: "/student-dashboard", icon: LayoutDashboard },
  { label: "Courses", path: "/student-dashboard/courses", icon: BookOpen },
  { label: "Online Learning", path: "/student-dashboard/online-learning", icon: MonitorPlay },
  { label: "Event Registrations", path: "/events/my-registrations", icon: CalendarClock },
  { label: "Syllabus", path: "/student-dashboard/syllabus", icon: FileText },
  { label: "Attendance", path: "/student-dashboard/attendance", icon: CalendarCheck },
  { label: "Payments", path: "/student-dashboard/payments", icon: CreditCard },
  { label: "Invoices", path: "/student-dashboard/invoices", icon: FileText },
  { label: "Billing", path: "/student-dashboard/billing", icon: CalendarCheck },
  { label: "Profile", path: "/student-dashboard/profile", icon: User },
]

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
      // Branch admin: no Add Branch Manager, no Add New Branch
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

/** Base path for each role (for redirects and links) */
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
