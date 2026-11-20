import DashboardRedirectOnly from "@/components/layout/DashboardRedirectOnly"

/**
 * /dashboard and /dashboard/* never render content here.
 * Always redirect to role-specific path so Super Admin and Academy Admin never share /dashboard.
 */
export default function Layout({ children }: { children: React.ReactNode }) {
  return <DashboardRedirectOnly>{children}</DashboardRedirectOnly>
}
