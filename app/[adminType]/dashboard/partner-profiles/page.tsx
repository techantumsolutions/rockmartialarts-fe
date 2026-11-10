"use client"

import { Fragment, useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ChevronDown,
  ExternalLink,
  Handshake,
  Link2,
  Loader2,
  Mail,
  Plus,
  Search,
} from "lucide-react"
import { TokenManager } from "@/lib/tokenManager"
import { useDashboardBasePath } from "@/lib/useDashboardBasePath"
import { useToast } from "@/hooks/use-toast"
import { partnerOrgAPI, type PartnerOrg } from "@/lib/partnerOrgAPI"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AdminCard,
  AdminFilterBar,
  AdminKpiCard,
  AdminKpiGrid,
  AdminPageHeader,
  AdminPageShell,
  AdminStatusPill,
  AdminTableShell,
} from "@/components/dashboard/AdminPageShell"
import {
  PartnerProfileAdminControls,
  formatPartnerValidityRange,
} from "@/components/dashboard/PartnerProfileAdminControls"
import { cn } from "@/lib/utils"

type StatusFilter = "all" | "active" | "invited" | "disabled"

export default function PartnerProfilesPage() {
  const router = useRouter()
  const basePath = useDashboardBasePath()
  const { toast } = useToast()
  const [partners, setPartners] = useState<PartnerOrg[]>([])
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [resendingId, setResendingId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!TokenManager.isAuthenticated()) {
      router.push("/superadmin/login")
      return
    }
    setLoading(true)
    try {
      const data = await partnerOrgAPI.list({ limit: 200, include_inactive: true })
      setPartners(Array.isArray(data.partners) ? data.partners : [])
    } catch (e: any) {
      toast({
        title: "Could not load partners",
        description: e?.message || "Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [router, toast])

  useEffect(() => {
    void load()
  }, [load])

  const kpi = useMemo(() => {
    let active = 0
    let invited = 0
    let disabled = 0
    for (const p of partners) {
      const isDisabled = p.is_active === false || p.status === "disabled"
      if (isDisabled) disabled++
      else if (p.status === "invited") invited++
      else active++
    }
    return { total: partners.length, active, invited, disabled }
  }, [partners])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return partners.filter((p) => {
      const isDisabled = p.is_active === false || p.status === "disabled"
      const isInvited = p.status === "invited"
      if (statusFilter === "active" && (isDisabled || isInvited)) return false
      if (statusFilter === "invited" && !isInvited) return false
      if (statusFilter === "disabled" && !isDisabled) return false
      if (!q) return true
      const hay = `${p.name || ""} ${p.email || ""} ${p.phone || ""} ${p.slug || ""}`.toLowerCase()
      return hay.includes(q)
    })
  }, [partners, search, statusFilter])

  function patchPartner(next: PartnerOrg) {
    setPartners((prev) => prev.map((row) => (row.id === next.id ? { ...row, ...next } : row)))
  }

  async function resendInvite(p: PartnerOrg) {
    setResendingId(p.id)
    try {
      const res = await partnerOrgAPI.resendInvite(p.id)
      setPartners((prev) =>
        prev.map((row) =>
          row.id === p.id
            ? {
                ...row,
                ...(res.partner || {}),
                invite_email_sent: true,
                status: res.partner?.status || "invited",
              }
            : row
        )
      )
      toast({
        title: "Invitation resent",
        description: res.message || `Set-password email sent to ${p.email}.`,
      })
    } catch (e: any) {
      toast({
        title: "Could not resend invite",
        description: e?.message || "Please try again.",
        variant: "destructive",
      })
    } finally {
      setResendingId(null)
    }
  }

  async function toggleActive(p: PartnerOrg, next: boolean) {
    setTogglingId(p.id)
    try {
      const res = await partnerOrgAPI.setActive(p.id, next)
      const updated = res?.partner
      setPartners((prev) =>
        prev.map((row) => {
          if (row.id !== p.id) return row
          if (updated) {
            return {
              ...row,
              ...updated,
              is_active: updated.is_active !== false,
              status: updated.status ?? (next ? "active" : "disabled"),
            }
          }
          return {
            ...row,
            is_active: next,
            status: next ? (row.status === "disabled" ? "active" : row.status) : "disabled",
          }
        })
      )
      toast({
        title: next ? "Partner enabled" : "Partner disabled",
        description: next
          ? "This partner can log in to their white-label dashboard."
          : "This partner cannot log in to their dashboard.",
      })
    } catch (e: any) {
      toast({
        title: "Status update failed",
        description: e?.message || "Please try again.",
        variant: "destructive",
      })
    } finally {
      setTogglingId(null)
    }
  }

  function partnerStatusTone(p: PartnerOrg): "active" | "pending" | "inactive" {
    if (p.is_active === false || p.status === "disabled") return "inactive"
    if (p.status === "invited") return "pending"
    return "active"
  }

  function partnerInitial(name: string) {
    return (name?.trim()?.[0] || "P").toUpperCase()
  }

  return (
    <AdminPageShell>
      <AdminPageHeader
        icon={Handshake}
        title="Partner Organizations"
        subtitle="Create white-label partners. Each partner gets an invite email, own login URL, and an isolated admin dashboard."
        actions={
          <Button type="button" onClick={() => router.push(`${basePath}/partner-profiles/create`)}>
            <Plus className="h-4 w-4" />
            Create Partner
          </Button>
        }
      />

      <AdminKpiGrid cols={4}>
        <AdminKpiCard icon={Handshake} label="Total Partners" value={kpi.total} tone="blue" />
        <AdminKpiCard icon={Handshake} label="Active Partners" value={kpi.active} tone="green" />
        <AdminKpiCard icon={Mail} label="Invited" value={kpi.invited} tone="purple" />
        <AdminKpiCard icon={Handshake} label="Disabled" value={kpi.disabled} tone="amber" />
      </AdminKpiGrid>

      <AdminCard padding={false}>
        <div className="flex flex-col gap-3 border-b border-[#E2E8F0] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-[15px] font-semibold text-[#171A26]">
            Partners ({filtered.length})
          </h2>
          <AdminFilterBar className="w-full sm:w-auto sm:justify-end">
            <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by partner name, email or mobile..."
                className="h-10 pl-9"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as StatusFilter)}
            >
              <SelectTrigger className="h-10 w-[150px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="invited">Invited</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>
          </AdminFilterBar>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-[#64748B]">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading partners…
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#E2E8F0] bg-[#F8FAFC] px-4 py-10 text-center text-sm text-[#64748B]">
              {partners.length === 0 ? (
                <>
                  No partners yet. Use{" "}
                  <span className="font-medium text-[#171A26]">Create Partner</span> to add one.
                  <div className="mt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.push(`${basePath}/partner-profiles/create`)}
                    >
                      <Plus className="h-4 w-4" />
                      Create Partner
                    </Button>
                  </div>
                </>
              ) : (
                "No partners match your search or filter."
              )}
            </div>
          ) : (
            <AdminTableShell
              footer={
                <span>
                  Showing {filtered.length} of {partners.length} partners
                </span>
              }
            >
              <table>
                <thead>
                  <tr>
                    <th className="w-8" />
                    <th>Partner</th>
                    <th>Email</th>
                    <th>Mobile</th>
                    <th>Payment</th>
                    <th>Status</th>
                    <th>Validity</th>
                    <th>Login URL</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => {
                    const enabled = p.is_active !== false && p.status !== "disabled"
                    const loginPath = p.login_path || (p.slug ? `/partners/${p.slug}/login` : "")
                    const isOpen = expandedId === p.id
                    return (
                      <Fragment key={p.id}>
                        <tr
                          className={cn(enabled ? "" : "opacity-80", isOpen && "bg-[#FFFCF5]")}
                        >
                          <td>
                            <button
                              type="button"
                              aria-expanded={isOpen}
                              aria-label={isOpen ? "Collapse partner details" : "Expand partner details"}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#171A26]"
                              onClick={() => setExpandedId(isOpen ? null : p.id)}
                            >
                              <ChevronDown
                                className={cn(
                                  "h-4 w-4 transition-transform",
                                  isOpen && "rotate-180"
                                )}
                              />
                            </button>
                          </td>
                          <td>
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F1EBFF] text-sm font-semibold text-[#6D28D9]">
                                {partnerInitial(p.name)}
                              </div>
                              <div>
                                <div className="font-medium text-[#171A26]">{p.name}</div>
                                <div className="font-mono text-xs text-[#64748B]">{p.slug}</div>
                              </div>
                            </div>
                          </td>
                          <td className="text-[#64748B]">{p.email}</td>
                          <td className="text-[#64748B]">{p.phone}</td>
                          <td className="capitalize text-[#64748B]">
                            {(p.payment_method || "—").replace("_", " ")}
                            {p.payment_status ? (
                              <span className="mt-0.5 block text-xs text-[#9593A8]">
                                {p.payment_status}
                              </span>
                            ) : null}
                          </td>
                          <td>
                            <AdminStatusPill status={partnerStatusTone(p)} className="capitalize">
                              {p.status || "—"}
                            </AdminStatusPill>
                          </td>
                          <td className="whitespace-nowrap text-xs text-[#64748B]">
                            {formatPartnerValidityRange(p)}
                          </td>
                          <td>
                            {loginPath ? (
                              <a
                                href={loginPath}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex max-w-[200px] items-center gap-1 truncate font-mono text-xs text-[#2563EB] hover:underline"
                                title={loginPath}
                              >
                                {loginPath}
                                <ExternalLink className="h-3 w-3 shrink-0" />
                              </a>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td>
                            <div className="flex flex-wrap items-center justify-end gap-2">
                              {(p.status === "invited" || p.invite_email_sent === false) &&
                              enabled ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={resendingId === p.id}
                                  onClick={() => void resendInvite(p)}
                                >
                                  {resendingId === p.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Mail className="h-3.5 w-3.5" />
                                  )}
                                  Resend Invite
                                </Button>
                              ) : null}
                              {loginPath ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-9 w-9"
                                  title="Open login URL"
                                  onClick={() => window.open(loginPath, "_blank", "noopener,noreferrer")}
                                >
                                  <Link2 className="h-4 w-4" />
                                </Button>
                              ) : null}
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-[#64748B]">
                                  {enabled ? "Enable" : "Disable"}
                                </span>
                                <Switch
                                  checked={enabled}
                                  disabled={togglingId === p.id}
                                  onCheckedChange={(checked) => void toggleActive(p, checked)}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                        {isOpen ? (
                          <tr className="bg-[#FFFCF5]">
                            <td colSpan={9} className="!p-4">
                              <PartnerProfileAdminControls
                                partner={p}
                                open={isOpen}
                                onUpdated={patchPartner}
                              />
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </AdminTableShell>
          )}
        </div>
      </AdminCard>
    </AdminPageShell>
  )
}
