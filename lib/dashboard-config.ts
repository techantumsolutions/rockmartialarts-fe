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
  { label: "Coaches", path: `${SUPER_ADMIN_BASE}/coaches`, icon: Users },
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
    ],
  },
  { label: "Reports", path: `${SUPER_ADMIN_BASE}/reports`, icon: BarChart },
  { label: "Payment Tracking", path: `${SUPER_ADMIN_BASE}/payment-tracking`, icon: CreditCard },
  { label: "Leads", path: `${SUPER_ADMIN_BASE}/leads`, icon: UserPlus, overflowOnly: true },
  { label: "Testimonials", path: `${SUPER_ADMIN_BASE}/testimonials`, icon: MessageSquare, overflowOnly: true },
  { label: "Registration Forms", path: `${SUPER_ADMIN_BASE}/registration-forms`, icon: FileText, overflowOnly: true },
  {
    label: "Settings",
    path: `${SUPER_ADMIN_BASE}/settings`,
    icon: Settings,
    children: [
      { label: "General Settings", path: `${SUPER_ADMIN_BASE}/settings` },
      { label: "Dropdown Settings", path: `${SUPER_ADMIN_BASE}/settings/dropdown-settings` },
    ],
  },
]

// Branch admin: no Branches menu, no Add Branch Manager / Add New Branch
const BRANCH_ADMIN_MENU: NavItem[] = [
  { label: "Dashboard", path: BRANCH_ADMIN_BASE, icon: LayoutDashboard },
  { label: "Coaches", path: `${BRANCH_ADMIN_BASE}/coaches`, icon: Users },
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
    ],
  },
  { label: "Reports", path: `${BRANCH_ADMIN_BASE}/reports`, icon: BarChart },
  { label: "Testimonials", path: `${BRANCH_ADMIN_BASE}/testimonials`, icon: MessageSquare, overflowOnly: true },
  { label: "Registration Forms", path: `${BRANCH_ADMIN_BASE}/registration-forms`, icon: FileText, overflowOnly: true },
]

const STUDENT_MENU: NavItem[] = [
  { label: "Dashboard", path: "/student-dashboard", icon: LayoutDashboard },
  { label: "Courses", path: "/student-dashboard/courses", icon: BookOpen },
  { label: "Attendance", path: "/student-dashboard/attendance", icon: CalendarCheck },
  { label: "Payments", path: "/student-dashboard/payments", icon: CreditCard },
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
