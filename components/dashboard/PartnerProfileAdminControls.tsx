"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Award,
  BarChart3,
  Building2,
  Calendar,
  CreditCard,
  GraduationCap,
  ImageIcon,
  LayoutDashboard,
  Loader2,
  Settings,
  Shield,
  Tags,
  UserCog,
  Users,
  UserPlus,
  BookOpen,
  CalendarCheck,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { partnerOrgAPI, type PartnerOrg } from "@/lib/partnerOrgAPI"
import { PARTNER_FEATURE_DEFS } from "@/lib/partnerFeaturePermissions"
import { AdminStatusPill } from "@/components/dashboard/AdminPageShell"
import type { LucideIcon } from "lucide-react"

function formatValidity(v?: string | null) {
  if (!v) return "—"
  return v.length >= 10 ? v.slice(0, 10) : v
}

function effectiveLabel(p: PartnerOrg) {
  const effective = p.effective_status
  if (effective === "expired") return "Expired"
  if (effective === "deactivated") return "Deactivated"
  if (p.is_active === false || p.status === "disabled") return "Deactivated"
  return "Active"
}

function effectiveTone(p: PartnerOrg): "active" | "pending" | "inactive" {
  const label = effectiveLabel(p)
  if (label === "Active") return "active"
  if (label === "Expired") return "pending"
  return "inactive"
}

export function PartnerProfileValidityBadge({ partner }: { partner: PartnerOrg }) {
  return (
    <AdminStatusPill status={effectiveTone(partner)} className="capitalize">
      {effectiveLabel(partner)}
    </AdminStatusPill>
  )
}

const FEATURE_ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  branches: Building2,
  "branch-managers": UserCog,
  coaches: Users,
  students: GraduationCap,
  courses: BookOpen,
  categories: Tags,
  attendance: CalendarCheck,
  payments: CreditCard,
  reports: BarChart3,
  leads: UserPlus,
  "org-branding": ImageIcon,
  "achievements-showcase": Award,
  settings: Settings,
}

type Props = {
  partner: PartnerOrg
  open: boolean
  onUpdated: (next: PartnerOrg) => void
}

export function PartnerProfileAdminControls({ partner, open, onUpdated }: Props) {
  const { toast } = useToast()
  const [validFrom, setValidFrom] = useState(formatValidity(partner.valid_from))
  const [validUntil, setValidUntil] = useState(formatValidity(partner.valid_until))
  const [featurePerms, setFeaturePerms] = useState<Record<string, boolean>>({})
  const [loadingFeatures, setLoadingFeatures] = useState(false)
  const [savingValidity, setSavingValidity] = useState(false)
  const [savingFeatures, setSavingFeatures] = useState(false)

  const loadFeatures = useCallback(async () => {
    setLoadingFeatures(true)
    try {
      const data = await partnerOrgAPI.getFeaturePermissions(partner.id)
      setFeaturePerms(data.feature_permissions || {})
    } catch (e: unknown) {
      toast({
        title: "Could not load feature permissions",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoadingFeatures(false)
    }
  }, [partner.id, toast])

  useEffect(() => {
    setValidFrom(formatValidity(partner.valid_from))
    setValidUntil(formatValidity(partner.valid_until))
  }, [partner.valid_from, partner.valid_until])

  useEffect(() => {
    if (open) void loadFeatures()
  }, [open, loadFeatures])

  async function saveValidity() {
    setSavingValidity(true)
    try {
      const res = await partnerOrgAPI.updateValidity(partner.id, {
        valid_from: validFrom === "—" || !validFrom ? null : validFrom,
        valid_until: validUntil === "—" || !validUntil ? null : validUntil,
      })
      if (res.partner) onUpdated(res.partner)
      toast({ title: "Validity updated", description: res.message || "Saved." })
    } catch (e: unknown) {
      toast({
        title: "Save failed",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setSavingValidity(false)
    }
  }

  async function saveFeatures() {
    setSavingFeatures(true)
    try {
      const res = await partnerOrgAPI.patchFeaturePermissions(partner.id, featurePerms)
      if (res.partner) onUpdated(res.partner)
      setFeaturePerms(res.feature_permissions || featurePerms)
      toast({ title: "Features updated", description: res.message || "Saved." })
    } catch (e: unknown) {
      toast({
        title: "Save failed",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setSavingFeatures(false)
    }
  }

  if (!open) return null

  const locked =
    partner.effective_status === "expired" ||
    partner.effective_status === "deactivated" ||
    partner.is_active === false ||
    partner.status === "disabled"

  return (
    <div className="rounded-2xl border border-[#F5E6B8] bg-[#FFF9EB] p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Shield className="h-4 w-4 text-[#C9971A]" />
        <span className="text-sm font-semibold text-[#4F5077]">Partner access controls</span>
        <span className="text-xs text-[#6B7A99]">Effective status:</span>
        <PartnerProfileValidityBadge partner={partner} />
        {locked ? (
          <span className="text-xs text-amber-800">
            Feature toggles are locked while disabled or expired.
          </span>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Validity Settings */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 sm:p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 border-b border-[#F1F5F9] pb-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFF8E1] text-[#C9971A]">
              <Calendar className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-[#171A26]">Validity Settings</p>
              <p className="text-xs text-[#64748B]">Partner access window</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs text-[#64748B]">Valid from</Label>
              <Input
                type="date"
                value={validFrom === "—" ? "" : validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-[#64748B]">Valid until</Label>
              <Input
                type="date"
                value={validUntil === "—" ? "" : validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <Button
            type="button"
            size="sm"
            className="mt-4"
            loading={savingValidity}
            loadingText="Saving…"
            onClick={() => void saveValidity()}
          >
            Save validity
          </Button>
        </div>

        {/* Dashboard Features */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 sm:p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 border-b border-[#F1F5F9] pb-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F1EBFF] text-[#6D28D9]">
              <Settings className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-[#171A26]">Dashboard Features</p>
              <p className="text-xs text-[#64748B]">Access controls for this partner</p>
            </div>
          </div>

          {loadingFeatures ? (
            <div className="flex items-center gap-2 py-6 text-sm text-[#64748B]">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading features…
            </div>
          ) : (
            <div className="grid max-h-[280px] grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
              {PARTNER_FEATURE_DEFS.map((def) => {
                const Icon = FEATURE_ICONS[def.key] || Settings
                return (
                  <label
                    key={def.key}
                    className="flex cursor-pointer items-center justify-between gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <Icon className="h-3.5 w-3.5 shrink-0 text-[#64748B]" aria-hidden />
                      <span className="truncate text-[13px] font-medium text-[#171A26]">
                        {def.label}
                      </span>
                    </span>
                    <Switch
                      checked={featurePerms[def.key] !== false}
                      disabled={locked}
                      onCheckedChange={(checked) =>
                        setFeaturePerms((prev) => ({ ...prev, [def.key]: checked }))
                      }
                    />
                  </label>
                )
              })}
            </div>
          )}

          <Button
            type="button"
            size="sm"
            className="mt-4"
            loading={savingFeatures}
            loadingText="Saving…"
            disabled={locked || loadingFeatures}
            onClick={() => void saveFeatures()}
          >
            Save features
          </Button>
        </div>
      </div>
    </div>
  )
}

export function formatPartnerValidityRange(p: PartnerOrg) {
  const from = formatValidity(p.valid_from)
  const until = formatValidity(p.valid_until)
  if (from === "—" && until === "—") return "—"
  return `${from} → ${until}`
}
