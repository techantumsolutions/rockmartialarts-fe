import type { Metadata } from "next"
import DashboardLayoutClient from "@/components/layout/DashboardLayoutClient"
import { portalMetadata } from "@/lib/portalIdentity"

export const metadata: Metadata = portalMetadata("branch_admin")

export default function Layout({ children }: { children: React.ReactNode }) {
  return <DashboardLayoutClient role="branch_admin">{children}</DashboardLayoutClient>
}