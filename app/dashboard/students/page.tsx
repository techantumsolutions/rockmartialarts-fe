"use client"

/**
 * /dashboard/* never renders this page in the browser: app/dashboard/layout.tsx wraps
 * all /dashboard routes with DashboardRedirectOnly, which redirects to:
 *   /super-admin/dashboard/...  or  /branch-admin/dashboard/...
 *
 * The real Super Admin / Academy Admin student list UI is:
 *   app/[adminType]/dashboard/students/page.tsx
 *
 * This file exists only so the /dashboard/students route exists during the redirect flow.
 */
export default function DashboardStudentsRedirectStub() {
  return null
}
