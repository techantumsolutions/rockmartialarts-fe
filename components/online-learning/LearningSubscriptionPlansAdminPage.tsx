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
  CreditCard,
  Eye,
  IndianRupee,
  Layers,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
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
import { learningCourseAPI, type LearningCourse } from "@/lib/learningCourseAPI"
import {
  LEARNING_PLAN_KINDS,
  formatInr,
  learningPlanKindLabel,
  learningSubscriptionAPI,
  type LearningSubscriptionPlan,
} from "@/lib/learningSubscriptionAPI"
import { cn } from "@/lib/utils"

type PageMode = "list" | "form" | "view"

const SWITCH_ON = "data-[state=checked]:bg-[#E1BB33]"

const EMPTY_FORM = {
  course_id: "",
  name: "",
  description: "",
  plan_kind: "3_month",
  fee_inr: "2999",
  duration_days: "90",
  grace_period_days: "7",
  is_lifetime: false,
  is_active: true,
  sort_order: "10",
}

function formFromPlan(p: LearningSubscriptionPlan) {
  return {
    course_id: p.course_id,
    name: p.name || "",
    description: p.description || "",
    plan_kind: p.plan_kind || "custom",
    fee_inr: String(p.fee_inr ?? 0),
    duration_days: String(p.duration_days ?? 90),
    grace_period_days: String(p.grace_period_days ?? 0),
    is_lifetime: Boolean(p.is_lifetime),
    is_active: p.is_active !== false,
    sort_order: String(p.sort_order ?? 100),
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

export default function LearningSubscriptionPlansAdminPage() {
  const { toast } = useToast()
  const [mode, setMode] = useState<PageMode>("list")
  const [courses, setCourses] = useState<LearningCourse[]>([])
  const [plans, setPlans] = useState<LearningSubscriptionPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [courseFilter, setCourseFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [viewingPlan, setViewingPlan] = useState<LearningSubscriptionPlan | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })

  const courseTitle = useCallback(
    (id: string) => courses.find((c) => c.id === id)?.title || id.slice(0, 8),
    [courses]
  )

  const filteredPlans = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return plans
    return plans.filter(
      (p) =>
        (p.name || "").toLowerCase().includes(q) ||
        courseTitle(p.course_id).toLowerCase().includes(q) ||
        learningPlanKindLabel(p.plan_kind).toLowerCase().includes(q)
    )
  }, [plans, search, courseTitle])

  const totalPages = Math.max(1, Math.ceil(filteredPlans.length / ADMIN_LIST_PAGE_SIZE))
  const pageStart = (currentPage - 1) * ADMIN_LIST_PAGE_SIZE
  const pageEnd = Math.min(pageStart + ADMIN_LIST_PAGE_SIZE, filteredPlans.length)
  const paginatedPlans = useMemo(
    () => filteredPlans.slice(pageStart, pageEnd),
    [filteredPlans, pageStart, pageEnd]
  )

  const loadCourses = useCallback(async () => {
    try {
      const data = await learningCourseAPI.listAdmin({ status: "all", limit: 200 })
      setCourses(data.courses || [])
    } catch {
      /* optional */
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await learningSubscriptionAPI.listPlans({
        course_id: courseFilter === "all" ? undefined : courseFilter,
        active_only: false,
      })
      setPlans(data.plans || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load plans")
    } finally {
      setLoading(false)
    }
  }, [courseFilter])

  useEffect(() => {
    loadCourses()
  }, [loadCourses])

  useEffect(() => {
    if (mode === "list") void load()
  }, [load, mode])

  useEffect(() => {
    setCurrentPage(1)
  }, [courseFilter, search])

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
    setForm({
      ...EMPTY_FORM,
      course_id: courseFilter !== "all" ? courseFilter : "",
    })
    setMode("form")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const startEdit = (p: LearningSubscriptionPlan) => {
    setEditingId(p.id)
    setForm(formFromPlan(p))
    setMode("form")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const openView = (p: LearningSubscriptionPlan) => {
    setViewingPlan(p)
    setMode("view")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const applyKindDefaults = (kind: string) => {
    if (kind === "3_month") {
      setForm((f) => ({
        ...f,
        plan_kind: kind,
        name: f.name || "3-Month Access",
        duration_days: "90",
        grace_period_days: "7",
        is_lifetime: false,
        fee_inr: f.fee_inr || "2999",
        sort_order: "10",
      }))
    } else if (kind === "lifetime") {
      setForm((f) => ({
        ...f,
        plan_kind: kind,
        name: f.name || "Lifetime Access",
        duration_days: "36500",
        grace_period_days: "0",
        is_lifetime: true,
        fee_inr: f.fee_inr || "9999",
        sort_order: "20",
      }))
    } else {
      setForm((f) => ({ ...f, plan_kind: kind }))
    }
  }

  const handleSave = async (forceActive?: boolean) => {
    if (!form.course_id.trim()) {
      toast({ title: "Select a course", variant: "destructive" })
      return
    }
    if (!form.name.trim()) {
      toast({ title: "Name required", variant: "destructive" })
      return
    }
    const fee = Number(form.fee_inr)
    if (!Number.isFinite(fee) || fee < 0) {
      toast({ title: "Invalid fee", variant: "destructive" })
      return
    }
    const isActive = forceActive !== undefined ? forceActive : form.is_active
    setSaving(true)
    try {
      const payload = {
        course_id: form.course_id,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        plan_kind: form.plan_kind,
        fee_inr: fee,
        duration_days: Number(form.duration_days) || 90,
        grace_period_days: Number(form.grace_period_days) || 0,
        is_lifetime: form.is_lifetime,
        is_active: isActive,
        sort_order: Number(form.sort_order) || 100,
      }
      if (editingId) {
        const { course_id: _c, ...update } = payload
        await learningSubscriptionAPI.updatePlan(editingId, update)
        toast({ title: "Plan updated" })
      } else {
        await learningSubscriptionAPI.createPlan(payload)
        toast({ title: "Plan created" })
      }
      setEditingId(null)
      setForm({ ...EMPTY_FORM, course_id: form.course_id })
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

  const toggleListActive = async (p: LearningSubscriptionPlan, activate: boolean) => {
    setSaving(true)
    try {
      await learningSubscriptionAPI.updatePlan(p.id, { is_active: activate })
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

  const seedDefaults = async () => {
    const cid = courseFilter !== "all" ? courseFilter : form.course_id
    if (!cid) {
      toast({
        title: "Select a course first",
        description: "Filter by course or pick one in the form.",
        variant: "destructive",
      })
      return
    }
    setSaving(true)
    try {
      const res = await learningSubscriptionAPI.seedDefaults(cid)
      toast({ title: res.message || "Default plans ready" })
      setCourseFilter(cid)
      await load()
    } catch (e) {
      toast({
        title: "Seed failed",
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
        icon={CreditCard}
        title="Learning Subscription Plans"
        subtitle="3-month and lifetime plans per online course. Separate from coach subscriptions."
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
            <Button
              type="button"
              variant="outline"
              className={adminOutlineBtnClass}
              onClick={() => void seedDefaults()}
              disabled={saving}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Seed 3‑mo + Lifetime
            </Button>
            <Button type="button" className={adminPrimaryBtnClass} onClick={startCreate}>
              <Plus className="mr-2 h-4 w-4" />
              New Plan
            </Button>
          </>
        }
      />

      <AdminFilterBar className="mb-4">
        <Select value={courseFilter} onValueChange={setCourseFilter}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="All courses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All courses</SelectItem>
            {courses.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative min-w-0 w-full admin-filter-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search plans by name or course…"
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
        <table className="min-w-[960px] w-full text-sm">
          <thead>
            <tr className="border-b border-[#E8EAF0] text-left text-xs font-medium uppercase tracking-wide text-[#6B7280]">
              <th className="px-4 py-3">Course</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Fee</th>
              <th className="px-4 py-3">Duration</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center text-[#6B7280]">
                  <Loader2 className="mr-2 inline h-5 w-5 animate-spin" />
                  Loading plans…
                </td>
              </tr>
            ) : filteredPlans.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center text-[#6B7280]">
                  No plans yet. Create one or seed 3‑month + Lifetime for a course.
                </td>
              </tr>
            ) : (
              paginatedPlans.map((p) => (
                <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                  <td className="px-4 py-3 max-w-[160px] truncate text-[#4F5077]">
                    {courseTitle(p.course_id)}
                  </td>
                  <td className="px-4 py-3 font-medium text-[#2F3153]">{p.name}</td>
                  <td className="px-4 py-3 text-[#4F5077]">
                    {learningPlanKindLabel(p.plan_kind)}
                    {p.is_lifetime ? " · Life" : ""}
                  </td>
                  <td className="px-4 py-3 font-medium">{formatInr(p.fee_inr)}</td>
                  <td className="px-4 py-3 text-[#4F5077]">
                    {p.is_lifetime ? "Lifetime" : `${p.duration_days}d`}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        p.is_active
                          ? "bg-green-50 text-green-800 border-green-200"
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
                        checked={p.is_active !== false}
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
            { label: "Online Learning" },
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
          {editingId ? "Edit Subscription Plan" : "New Subscription Plan"}
        </h1>
      </div>

      <div className="admin-page-with-sticky-actions">
        <AdminDetailLayout
          main={
            <div className="space-y-5">
              <SectionCard
                icon={Layers}
                title="Plan details"
                subtitle="Course, name, description, and plan type."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>
                      Course <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={form.course_id || undefined}
                      onValueChange={(v) => setForm((f) => ({ ...f, course_id: v }))}
                      disabled={Boolean(editingId)}
                    >
                      <SelectTrigger className="rounded-xl border-gray-200">
                        <SelectValue placeholder="Select course" />
                      </SelectTrigger>
                      <SelectContent>
                        {courses.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Plan type</Label>
                    <Select value={form.plan_kind} onValueChange={applyKindDefaults}>
                      <SelectTrigger className="rounded-xl border-gray-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LEARNING_PLAN_KINDS.map((k) => (
                          <SelectItem key={k.value} value={k.value}>
                            {k.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>
                      Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="rounded-xl border-gray-200"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Description</Label>
                    <Textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      rows={3}
                      className="rounded-xl border-gray-200"
                    />
                  </div>
                </div>
              </SectionCard>

              <SectionCard icon={IndianRupee} title="Pricing & duration" subtitle="Fee, access period, and ordering.">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Fee (INR)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.fee_inr}
                      onChange={(e) => setForm({ ...form, fee_inr: e.target.value })}
                      className="rounded-xl border-gray-200"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Sort order</Label>
                    <Input
                      type="number"
                      value={form.sort_order}
                      onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
                      className="rounded-xl border-gray-200"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Duration (days)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={form.duration_days}
                      disabled={form.plan_kind === "lifetime" || form.is_lifetime}
                      onChange={(e) => setForm({ ...form, duration_days: e.target.value })}
                      className="rounded-xl border-gray-200"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Grace period (days)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.grace_period_days}
                      disabled={form.plan_kind === "lifetime" || form.is_lifetime}
                      onChange={(e) => setForm({ ...form, grace_period_days: e.target.value })}
                      className="rounded-xl border-gray-200"
                    />
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-6">
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
                      checked={form.is_lifetime}
                      disabled={form.plan_kind === "lifetime"}
                      onCheckedChange={(v) =>
                        setForm({
                          ...form,
                          is_lifetime: v,
                          grace_period_days: v ? "0" : form.grace_period_days,
                        })
                      }
                    />
                    Lifetime access
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
              { label: "Online Learning" },
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
          <h1 className="text-xl font-bold text-[#2F3153]">View Subscription Plan</h1>
        </div>
        <Button
          type="button"
          className={adminPrimaryBtnClass}
          onClick={() => startEdit(detailPlan)}
        >
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
                      ? "bg-green-50 text-green-800 border-green-200"
                      : "bg-gray-100 text-gray-600"
                  }
                >
                  {detailPlan.is_active ? "Active" : "Inactive"}
                </Badge>
                <Badge variant="outline" className="bg-[#FFF8E1] text-amber-900 border-[#E1BB33]/40">
                  {learningPlanKindLabel(detailPlan.plan_kind)}
                </Badge>
              </div>
              <p className="mt-3 text-sm text-[#4F5077]">
                Course: <span className="font-medium">{courseTitle(detailPlan.course_id)}</span>
              </p>
            </AdminCard>

            <SectionCard icon={CreditCard} title="Plan summary">
              <dl className="grid gap-4 sm:grid-cols-2 text-sm">
                <div>
                  <dt className="text-xs font-medium uppercase text-[#6B7280]">Fee</dt>
                  <dd className="font-semibold text-[#2F3153]">{formatInr(detailPlan.fee_inr)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase text-[#6B7280]">Duration</dt>
                  <dd className="text-[#2F3153]">
                    {detailPlan.is_lifetime ? "Lifetime" : `${detailPlan.duration_days} days`}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase text-[#6B7280]">Grace period</dt>
                  <dd className="text-[#2F3153]">{detailPlan.grace_period_days ?? 0} days</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase text-[#6B7280]">Sort order</dt>
                  <dd className="text-[#2F3153]">{detailPlan.sort_order ?? "—"}</dd>
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