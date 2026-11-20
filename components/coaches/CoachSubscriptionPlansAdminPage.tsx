"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ElementType,
  type ReactNode,
} from "react"
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  IndianRupee,
  Layers,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Square,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  AdminBreadcrumb,
  AdminCard,
  AdminDetailLayout,
  AdminFilterBar,
  AdminPageHeader,
  AdminPageShell,
  AdminTableShell,
  adminOutlineBtnClass,
  adminPrimaryBtnClass,
} from "@/components/dashboard/AdminPageShell"
import { AdminStickyFormActions } from "@/components/dashboard/AdminStickyFormActions"
import { useToast } from "@/hooks/use-toast"
import { ADMIN_LIST_PAGE_SIZE } from "@/lib/adminListConfig"
import {
  coachSubscriptionAPI,
  type CoachSubscriptionPlan,
} from "@/lib/coachSubscriptionAPI"
import { cn } from "@/lib/utils"

type PageMode = "list" | "form" | "view"

const SWITCH_ON = "data-[state=checked]:bg-[#E1BB33]"

const EMPTY_FORM = {
  name: "",
  description: "",
  fee_inr: 999,
  duration_days: 30,
  grace_period_days: 10,
  deactivate_on_grace_expiry: true,
  is_active: true,
  is_default: false,
  sort_order: 100,
}

function formFromPlan(p: CoachSubscriptionPlan) {
  return {
    name: p.name,
    description: p.description || "",
    fee_inr: p.fee_inr,
    duration_days: p.duration_days,
    grace_period_days: p.grace_period_days,
    deactivate_on_grace_expiry: p.deactivate_on_grace_expiry,
    is_active: p.is_active,
    is_default: Boolean(p.is_default),
    sort_order: p.sort_order ?? 100,
  }
}

function SectionCard({
  icon: Icon,
  title,
  subtitle,
  children,
  className,
}: {
  icon: ElementType
  title: string
  subtitle?: string
  children: ReactNode
  className?: string
}) {
  return (
    <AdminCard className={cn("border-[#E8EAF0]", className)}>
      <div className="mb-3 flex items-start gap-2.5 border-b border-[#E8EAF0] pb-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFF8E1] text-[#C9971A]">
          <Icon className="h-[18px] w-[18px]" strokeWidth={2.2} />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-[#2F3153]">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-xs text-[#6B7280]">{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </AdminCard>
  )
}

export default function CoachSubscriptionPlansAdminPage() {
  const { toast } = useToast()
  const [mode, setMode] = useState<PageMode>("list")
  const [plans, setPlans] = useState<CoachSubscriptionPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [viewingPlan, setViewingPlan] = useState<CoachSubscriptionPlan | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })

  const filteredPlans = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return plans
    return plans.filter(
      (p) =>
        (p.name || "").toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q)
    )
  }, [plans, search])

  const totalPages = Math.max(1, Math.ceil(filteredPlans.length / ADMIN_LIST_PAGE_SIZE))
  const pageStart = (currentPage - 1) * ADMIN_LIST_PAGE_SIZE
  const pageEnd = Math.min(pageStart + ADMIN_LIST_PAGE_SIZE, filteredPlans.length)
  const paginatedPlans = useMemo(
    () => filteredPlans.slice(pageStart, pageEnd),
    [filteredPlans, pageStart, pageEnd]
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await coachSubscriptionAPI.listPlans(false)
      setPlans(data.plans || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load plans")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (mode === "list") void load()
  }, [load, mode])

  useEffect(() => {
    setCurrentPage(1)
  }, [search])

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  const goToList = () => {
    setMode("list")
    setViewingPlan(null)
    setEditingId(null)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const startCreate = () => {
    setEditingId(null)
    setForm({ ...EMPTY_FORM })
    setMode("form")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const startEdit = (p: CoachSubscriptionPlan) => {
    setEditingId(p.id)
    setForm(formFromPlan(p))
    setMode("form")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const openView = (p: CoachSubscriptionPlan) => {
    setViewingPlan(p)
    setMode("view")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleSave = async (forceActive?: boolean) => {
    if (!form.name.trim()) {
      toast({ title: "Name required", variant: "destructive" })
      return
    }
    const body = {
      ...form,
      name: form.name.trim(),
      is_active: forceActive !== undefined ? forceActive : form.is_active,
    }
    setSaving(true)
    try {
      if (editingId) {
        await coachSubscriptionAPI.updatePlan(editingId, body)
        toast({ title: "Plan updated" })
      } else {
        await coachSubscriptionAPI.createPlan(body)
        toast({ title: "Plan created" })
      }
      setEditingId(null)
      setForm({ ...EMPTY_FORM })
      setMode("list")
      await load()
    } catch (e) {
      toast({
        title: "Save failed",
        description: e instanceof Error ? e.message : "Error",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const toggleListActive = async (p: CoachSubscriptionPlan, activate: boolean) => {
    setSaving(true)
    try {
      await coachSubscriptionAPI.updatePlan(p.id, { is_active: activate })
      toast({ title: activate ? "Plan activated" : "Plan deactivated" })
      await load()
      if (viewingPlan?.id === p.id) {
        setViewingPlan((prev) => (prev ? { ...prev, is_active: activate } : prev))
      }
    } catch (e) {
      toast({
        title: "Update failed",
        description: e instanceof Error ? e.message : "Error",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const listView = (
    <>
      <AdminPageHeader
        icon={Layers}
        title="Online Coach Subscription Plans"
        subtitle="Configure fee, duration, grace period, and deactivation rules for coach subscriptions."
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              className={adminOutlineBtnClass}
              onClick={() => void load()}
              disabled={loading}
            >
              <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
              Refresh
            </Button>
            <Button type="button" className={adminPrimaryBtnClass} onClick={startCreate}>
              <Plus className="mr-2 h-4 w-4" />
              New Plan
            </Button>
          </>
        }
      />

      <AdminFilterBar className="mb-4">
        <div className="relative min-w-0 w-full admin-filter-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search plans by name or description…"
            className="pl-10"
          />
        </div>
      </AdminFilterBar>

      {error ? (
        <AdminCard className="mb-4 border-red-200 bg-red-50 text-sm text-red-700">{error}</AdminCard>
      ) : null}

      <AdminTableShell
        footer={
          filteredPlans.length > 0 ? (
            <>
              <span>
                Showing {filteredPlans.length === 0 ? 0 : pageStart + 1}–{pageEnd} of{" "}
                {filteredPlans.length} plans
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    size="sm"
                    variant={currentPage === page ? "default" : "outline"}
                    className={currentPage === page ? adminPrimaryBtnClass : undefined}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : undefined
        }
      >
        <table className="min-w-[880px] w-full text-sm">
          <thead>
            <tr className="border-b border-[#E8EAF0] text-left text-xs font-medium uppercase tracking-wide text-[#6B7280]">
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Fee</th>
              <th className="px-4 py-3">Duration</th>
              <th className="px-4 py-3">Grace</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center text-[#6B7280]">
                  <Loader2 className="mr-2 inline h-5 w-5 animate-spin" />
                  Loading plans…
                </td>
              </tr>
            ) : filteredPlans.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center text-[#6B7280]">
                  No plans yet. Create your first coach subscription plan.
                </td>
              </tr>
            ) : (
              paginatedPlans.map((p) => (
                <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-[#2F3153]">{p.name}</div>
                    {p.description ? (
                      <div className="mt-0.5 line-clamp-1 text-xs text-gray-500">{p.description}</div>
                    ) : null}
                    {p.is_default ? (
                      <Badge
                        variant="outline"
                        className="mt-1 border-[#E1BB33]/40 bg-[#FFF8E1] text-amber-900 text-[10px]"
                      >
                        Default
                      </Badge>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 font-medium text-[#2F3153]">₹{p.fee_inr.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-[#4F5077]">{p.duration_days} days</td>
                  <td className="px-4 py-3 text-[#4F5077]">{p.grace_period_days} days</td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        p.is_active
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "bg-gray-100 text-gray-600 border-gray-200"
                      )}
                    >
                      {p.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 rounded-lg"
                        onClick={() => openView(p)}
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 rounded-lg"
                        onClick={() => startEdit(p)}
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Switch
                        className={SWITCH_ON}
                        checked={p.is_active}
                        disabled={saving}
                        onCheckedChange={(checked) => void toggleListActive(p, checked)}
                        title={p.is_active ? "Deactivate" : "Activate"}
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </AdminTableShell>
    </>
  )

  const formView = (
    <>
      <div className="mb-4 space-y-2">
        <AdminBreadcrumb
          items={[
            { label: "Coaches" },
            { label: "Subscription Plans" },
            { label: editingId ? "Edit Plan" : "New Plan" },
          ]}
        />
        <button
          type="button"
          onClick={goToList}
          className="inline-flex items-center gap-2 text-sm font-medium text-[#4F5077] hover:text-[#2F3153]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to list
        </button>
        <h1 className="text-xl font-bold text-[#2F3153]">
          {editingId ? "Edit Coach Subscription Plan" : "New Coach Subscription Plan"}
        </h1>
      </div>

      <div className="admin-page-with-sticky-actions">
        <AdminDetailLayout
          main={
            <div className="space-y-5">
              <SectionCard icon={Square} title="Plan details" subtitle="Name and description shown to admins.">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>
                      Plan name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. Monthly Coach Access"
                      className="rounded-xl border-gray-200"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Description</Label>
                    <Textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      rows={3}
                      placeholder="Optional description…"
                      className="rounded-xl border-gray-200"
                    />
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                icon={IndianRupee}
                title="Pricing & duration"
                subtitle="Fee, billing period, grace window, and list order."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Fee (INR)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.fee_inr}
                      onChange={(e) =>
                        setForm({ ...form, fee_inr: Number(e.target.value) || 0 })
                      }
                      className="rounded-xl border-gray-200"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Sort order</Label>
                    <Input
                      type="number"
                      value={form.sort_order}
                      onChange={(e) =>
                        setForm({ ...form, sort_order: Number(e.target.value) || 0 })
                      }
                      className="rounded-xl border-gray-200"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Duration (days)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={form.duration_days}
                      onChange={(e) =>
                        setForm({ ...form, duration_days: Number(e.target.value) || 1 })
                      }
                      className="rounded-xl border-gray-200"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Grace period (days)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.grace_period_days}
                      onChange={(e) =>
                        setForm({ ...form, grace_period_days: Number(e.target.value) || 0 })
                      }
                      className="rounded-xl border-gray-200"
                    />
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-6">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-[#4F5077]">
                    <Switch
                      className={SWITCH_ON}
                      checked={form.deactivate_on_grace_expiry}
                      onCheckedChange={(v) => setForm({ ...form, deactivate_on_grace_expiry: v })}
                    />
                    Deactivate coach when grace period ends
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-[#4F5077]">
                    <Switch
                      className={SWITCH_ON}
                      checked={form.is_active}
                      onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                    />
                    Active
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-[#4F5077]">
                    <Switch
                      className={SWITCH_ON}
                      checked={form.is_default}
                      onCheckedChange={(v) => setForm({ ...form, is_default: v })}
                    />
                    Default plan
                  </label>
                </div>
              </SectionCard>
            </div>
          }
        />
      </div>

      <AdminStickyFormActions>
        <Button type="button" variant="outline" className={adminOutlineBtnClass} onClick={goToList}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={saving}
          onClick={() => void handleSave(false)}
        >
          Save as Draft
        </Button>
        <Button
          type="button"
          className={adminPrimaryBtnClass}
          disabled={saving}
          onClick={() => void handleSave(true)}
        >
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Check className="mr-2 h-4 w-4" />
          )}
          Save Plan
        </Button>
      </AdminStickyFormActions>
    </>
  )

  const detailPlan = viewingPlan

  const detailView = detailPlan ? (
    <>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <AdminBreadcrumb
            items={[
              { label: "Coaches" },
              { label: "Subscription Plans" },
              { label: "View Plan" },
            ]}
          />
          <button
            type="button"
            onClick={goToList}
            className="inline-flex items-center gap-2 text-sm font-medium text-[#4F5077] hover:text-[#2F3153]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to list
          </button>
          <h1 className="text-xl font-bold text-[#2F3153]">View Coach Subscription Plan</h1>
        </div>
        <Button type="button" className={adminPrimaryBtnClass} onClick={() => startEdit(detailPlan)}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit Plan
        </Button>
      </div>

      <AdminDetailLayout
        main={
          <div className="space-y-5">
            <AdminCard className="border-[#E8EAF0]">
              <h2 className="text-lg font-bold text-[#2F3153]">{detailPlan.name}</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge
                  variant="outline"
                  className={
                    detailPlan.is_active
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "bg-gray-100 text-gray-600"
                  }
                >
                  {detailPlan.is_active ? "Active" : "Inactive"}
                </Badge>
                {detailPlan.is_default ? (
                  <Badge variant="outline" className="border-[#E1BB33]/40 bg-[#FFF8E1] text-amber-900">
                    Default
                  </Badge>
                ) : null}
              </div>
            </AdminCard>

            <SectionCard icon={FileText} title="Plan summary">
              <dl className="grid gap-4 sm:grid-cols-2 text-sm">
                <div>
                  <dt className="text-xs font-medium uppercase text-[#6B7280]">Fee</dt>
                  <dd className="font-semibold text-[#2F3153]">
                    ₹{detailPlan.fee_inr.toLocaleString("en-IN")}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase text-[#6B7280]">Duration</dt>
                  <dd className="text-[#2F3153]">{detailPlan.duration_days} days</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase text-[#6B7280]">Grace period</dt>
                  <dd className="text-[#2F3153]">{detailPlan.grace_period_days} days</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase text-[#6B7280]">Sort order</dt>
                  <dd className="text-[#2F3153]">{detailPlan.sort_order ?? "—"}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium uppercase text-[#6B7280]">
                    Deactivate on grace expiry
                  </dt>
                  <dd className="text-[#2F3153]">
                    {detailPlan.deactivate_on_grace_expiry ? "Yes" : "No"}
                  </dd>
                </div>
                {detailPlan.description ? (
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-medium uppercase text-[#6B7280]">Description</dt>
                    <dd className="mt-1 whitespace-pre-wrap text-[#4F5077]">{detailPlan.description}</dd>
                  </div>
                ) : null}
              </dl>
            </SectionCard>
          </div>
        }
      />
    </>
  ) : null

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="w-full max-w-none p-4 lg:px-8 lg:py-6">
        <AdminPageShell>
          {mode === "list" && listView}
          {mode === "form" && formView}
          {mode === "view" && (detailView || listView)}
        </AdminPageShell>
      </main>
    </div>
  )
}