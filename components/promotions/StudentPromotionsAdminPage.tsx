"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ElementType,
  type ReactNode,
  type SetStateAction,
} from "react"
import {
  Archive,
  ArrowLeft,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  ExternalLink,
  ImageIcon,
  Loader2,
  Megaphone,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { AppModal } from "@/components/ui/AppModal"
import { StudentPromoPopupCard } from "@/components/promotions/StudentPromoPopupCard"
import {
  AdminBreadcrumb,
  AdminCard,
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
import { resolvePublicAssetUrl } from "@/lib/resolvePublicAssetUrl"
import { cn } from "@/lib/utils"
import {
  EMPTY_PROMOTION_TARGET,
  PROMOTION_CTA_TYPES,
  PROMOTION_STATUSES,
  fromDatetimeLocalValue,
  promotionStatusLabel,
  studentPromotionAPI,
  toDatetimeLocalValue,
  type PromotionTarget,
  type StudentPromotion,
  type StudentPromotionPayload,
  type TargetingOptions,
} from "@/lib/studentPromotionAPI"

type PageMode = "list" | "form" | "view"

const EMPTY_FORM = {
  title: "",
  slug: "",
  short_description: "",
  description: "",
  banner_url: "",
  banner_media_type: "none",
  cta_label: "",
  cta_type: "none",
  cta_url: "",
  start_at: "",
  end_at: "",
  status: "draft",
  priority: "100",
}

const STATUS_CLASS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 border-gray-200",
  active: "bg-green-50 text-green-800 border-green-200",
  inactive: "bg-amber-50 text-amber-800 border-amber-200",
  archived: "bg-red-50 text-red-800 border-red-200",
}

function cloneTarget(t?: PromotionTarget | null): PromotionTarget {
  const src = t || EMPTY_PROMOTION_TARGET
  return {
    mode: src.mode === "targeted" ? "targeted" : "all",
    student_ids: [...(src.student_ids || [])],
    branch_ids: [...(src.branch_ids || [])],
    course_ids: [...(src.course_ids || [])],
    group_ids: [...(src.group_ids || [])],
  }
}

function toggleId(list: string[], id: string, on: boolean) {
  if (on) return list.includes(id) ? list : [...list, id]
  return list.filter((x) => x !== id)
}

function targetLabel(p: StudentPromotion) {
  if (!p.target && !p.target_summary) return "All students"
  if ((p.target?.mode || p.target_summary?.mode) === "all") {
    return "All students"
  }
  const parts: string[] = []
  const s = p.target_summary
  if ((s?.student_count || p.target?.student_ids?.length || 0) > 0) {
    parts.push(`${s?.student_count ?? p.target?.student_ids?.length} students`)
  }
  if ((s?.branch_count || p.target?.branch_ids?.length || 0) > 0) {
    parts.push(`${s?.branch_count ?? p.target?.branch_ids?.length} branches`)
  }
  if ((s?.course_count || p.target?.course_ids?.length || 0) > 0) {
    parts.push(`${s?.course_count ?? p.target?.course_ids?.length} courses`)
  }
  if ((s?.group_count || p.target?.group_ids?.length || 0) > 0) {
    parts.push(`${s?.group_count ?? p.target?.group_ids?.length} groups`)
  }
  return parts.length ? `Targeted · ${parts.join(", ")}` : "Targeted (no filters)"
}

function formFromPromotion(p: StudentPromotion) {
  return {
    title: p.title || "",
    slug: p.slug || "",
    short_description: p.short_description || "",
    description: p.description || "",
    banner_url: p.banner_url || "",
    banner_media_type: p.banner_media_type || "none",
    cta_label: p.cta_label || "",
    cta_type: p.cta_type || "none",
    cta_url: p.cta_url || "",
    start_at: toDatetimeLocalValue(p.start_at),
    end_at: toDatetimeLocalValue(p.end_at),
    status: p.status || "draft",
    priority: String(p.priority ?? 100),
  }
}

function formatPromotionSchedule(p: StudentPromotion) {
  const start = p.start_at
    ? new Date(p.start_at).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null
  const end = p.end_at
    ? new Date(p.end_at).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null
  if (!start && !end) return { line: "No schedule", sub: "—" }
  if (start && end) return { line: `${start} – ${end}`, sub: "Start → end" }
  if (start) return { line: `From ${start}`, sub: "Open-ended" }
  return { line: `Until ${end}`, sub: "Ends" }
}

function PromotionThumbnail({
  url,
  mediaType,
}: {
  url?: string | null
  mediaType?: string
}) {
  const src = resolvePublicAssetUrl(url)
  if (!src) {
    return (
      <div className="flex h-10 w-16 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
        <ImageIcon className="h-4 w-4" />
      </div>
    )
  }
  if (mediaType === "video") {
    return (
      <div className="relative h-10 w-16 shrink-0 overflow-hidden rounded-lg border border-[#E8EAF0] bg-black">
        <video src={src} className="h-full w-full object-cover" muted />
      </div>
    )
  }
  return (
    <img
      src={src}
      alt=""
      className="h-10 w-16 shrink-0 rounded-lg border border-[#E8EAF0] object-cover"
      onError={(e) => {
        e.currentTarget.style.display = "none"
      }}
    />
  )
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

type PopupPreviewProps = {
  title: string
  short_description?: string
  description?: string
  banner_url?: string
  banner_media_type?: string
  cta_type?: string
  cta_label?: string
  cta_url?: string
}

function PromotionPopupPreview(props: PopupPreviewProps) {
  return <StudentPromoPopupCard {...props} preview />
}

export default function StudentPromotionsAdminPage() {
  const { toast } = useToast()
  const [mode, setMode] = useState<PageMode>("list")
  const [promotions, setPromotions] = useState<StudentPromotion[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [viewingPromotion, setViewingPromotion] = useState<StudentPromotion | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [target, setTarget] = useState<PromotionTarget>(cloneTarget())
  const [options, setOptions] = useState<TargetingOptions | null>(null)
  const [studentSearch, setStudentSearch] = useState("")
  const [previewCount, setPreviewCount] = useState<number | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [popupPreviewOpen, setPopupPreviewOpen] = useState(false)
  const [selectedStudentLabels, setSelectedStudentLabels] = useState<
    Record<string, string>
  >({})

  const totalPages = Math.max(1, Math.ceil(promotions.length / ADMIN_LIST_PAGE_SIZE))
  const pageStart = (currentPage - 1) * ADMIN_LIST_PAGE_SIZE
  const pageEnd = Math.min(pageStart + ADMIN_LIST_PAGE_SIZE, promotions.length)
  const paginatedPromotions = useMemo(
    () => promotions.slice(pageStart, pageEnd),
    [promotions, pageStart, pageEnd]
  )

  const loadOptions = useCallback(async (q?: string) => {
    try {
      const data = await studentPromotionAPI.targetingOptions({
        student_search: q || undefined,
        student_limit: 40,
      })
      setOptions(data)
    } catch {
      /* non-blocking */
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await studentPromotionAPI.list({
        status: statusFilter,
        search: search || undefined,
        include_archived: statusFilter === "archived" || statusFilter === "all",
      })
      setPromotions(data.promotions || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load promotions")
    } finally {
      setLoading(false)
    }
  }, [statusFilter, search])

  useEffect(() => {
    void loadOptions()
  }, [loadOptions])

  useEffect(() => {
    if (mode === "list") void load()
  }, [load, mode])

  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, search])

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  useEffect(() => {
    const t = setTimeout(() => {
      void loadOptions(studentSearch)
    }, 300)
    return () => clearTimeout(t)
  }, [studentSearch, loadOptions])

  const goToList = () => {
    setMode("list")
    setViewingPromotion(null)
    setEditingId(null)
    setPopupPreviewOpen(false)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const startCreate = () => {
    setEditingId(null)
    setForm({ ...EMPTY_FORM })
    setTarget(cloneTarget())
    setPreviewCount(null)
    setSelectedStudentLabels({})
    setMode("form")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const startEdit = (p: StudentPromotion) => {
    setEditingId(p.id)
    setForm(formFromPromotion(p))
    const next = cloneTarget(p.target)
    setTarget(next)
    setPreviewCount(null)
    const labels: Record<string, string> = {}
    for (const id of next.student_ids) {
      labels[id] = id
    }
    setSelectedStudentLabels(labels)
    setViewingPromotion(null)
    setMode("form")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const openView = async (p: StudentPromotion) => {
    setViewingPromotion(p)
    setMode("view")
    try {
      const { promotion } = await studentPromotionAPI.get(p.id)
      setViewingPromotion(promotion)
    } catch {
      /* keep list row */
    }
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleUpload = async (file: File) => {
    setUploading(true)
    try {
      const url = await studentPromotionAPI.uploadBanner(file)
      if (!url) throw new Error("No file URL returned")
      const isVideo = file.type.startsWith("video/")
      setForm((prev) => ({
        ...prev,
        banner_url: url,
        banner_media_type: isVideo ? "video" : "image",
      }))
      toast({ title: "Banner uploaded" })
    } catch (e) {
      toast({
        title: "Upload failed",
        description: e instanceof Error ? e.message : "Error",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const clearBanner = () => {
    setForm((prev) => ({
      ...prev,
      banner_url: "",
      banner_media_type: "none",
    }))
  }

  const handlePreviewEligibility = async () => {
    setPreviewing(true)
    try {
      const payloadTarget: PromotionTarget =
        target.mode === "all"
          ? { ...EMPTY_PROMOTION_TARGET }
          : {
              mode: "targeted",
              student_ids: target.student_ids,
              branch_ids: target.branch_ids,
              course_ids: target.course_ids,
              group_ids: target.group_ids,
            }
      const data = await studentPromotionAPI.previewEligibility({
        target: payloadTarget,
        sample_limit: 5,
      })
      setPreviewCount(data.eligible_count ?? 0)
      toast({
        title: "Audience preview",
        description: `${data.eligible_count ?? 0} eligible student(s)`,
      })
    } catch (e) {
      toast({
        title: "Preview failed",
        description: e instanceof Error ? e.message : "Error",
        variant: "destructive",
      })
    } finally {
      setPreviewing(false)
    }
  }

  const handleSave = async (overrideStatus?: string) => {
    if (!form.title.trim()) {
      toast({ title: "Title required", variant: "destructive" })
      return
    }
    if (
      (form.cta_type === "url" || form.cta_type === "path") &&
      !form.cta_url.trim()
    ) {
      toast({ title: "CTA link required", variant: "destructive" })
      return
    }
    if (
      target.mode === "targeted" &&
      !target.student_ids.length &&
      !target.branch_ids.length &&
      !target.course_ids.length &&
      !target.group_ids.length
    ) {
      toast({
        title: "Add at least one target filter",
        description: "Or switch audience to All students.",
        variant: "destructive",
      })
      return
    }
    setSaving(true)
    try {
      const payloadTarget: PromotionTarget =
        target.mode === "all"
          ? { ...EMPTY_PROMOTION_TARGET }
          : {
              mode: "targeted",
              student_ids: target.student_ids,
              branch_ids: target.branch_ids,
              course_ids: target.course_ids,
              group_ids: target.group_ids,
            }
      const statusToSave = overrideStatus ?? form.status
      const base: StudentPromotionPayload = {
        title: form.title.trim(),
        slug: form.slug.trim() || undefined,
        short_description: form.short_description.trim() || undefined,
        description: form.description.trim() || undefined,
        banner_url: form.banner_url.trim() || undefined,
        banner_media_type: form.banner_url.trim()
          ? form.banner_media_type
          : "none",
        cta_label: form.cta_label.trim() || undefined,
        cta_type: form.cta_type,
        cta_url:
          form.cta_type === "none" ? undefined : form.cta_url.trim() || undefined,
        start_at: form.start_at
          ? fromDatetimeLocalValue(form.start_at)
          : undefined,
        end_at: form.end_at ? fromDatetimeLocalValue(form.end_at) : undefined,
        status: statusToSave,
        priority: Number(form.priority) || 100,
        target: payloadTarget,
        ...(statusToSave === "active"
          ? { is_active: true }
          : statusToSave === "inactive"
            ? { is_active: false }
            : {}),
      }

      if (editingId) {
        const updateBody: Partial<StudentPromotionPayload> = { ...base }
        if (!form.banner_url.trim()) updateBody.clear_banner = true
        if (form.cta_type === "none") updateBody.clear_cta = true
        if (!form.start_at && !form.end_at) updateBody.clear_dates = true
        await studentPromotionAPI.update(editingId, updateBody)
        toast({ title: "Promotion updated" })
      } else {
        await studentPromotionAPI.create(base)
        toast({
          title: statusToSave === "active" ? "Promotion published" : "Promotion created",
        })
      }
      setEditingId(null)
      setForm({ ...EMPTY_FORM })
      setTarget(cloneTarget())
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

  const archive = async (id: string) => {
    if (!confirm("Archive this promotion? It will no longer be shown as active."))
      return
    setSaving(true)
    try {
      await studentPromotionAPI.archive(id)
      toast({ title: "Promotion archived" })
      if (editingId === id) goToList()
      else if (viewingPromotion?.id === id) goToList()
      await load()
    } catch (e) {
      toast({
        title: "Archive failed",
        description: e instanceof Error ? e.message : "Error",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const toggleListActive = async (p: StudentPromotion, activate: boolean) => {
    if (p.status === "archived") return
    setSaving(true)
    try {
      await studentPromotionAPI.update(p.id, {
        status: activate ? "active" : "inactive",
        is_active: activate,
      })
      toast({ title: activate ? "Promotion activated" : "Promotion deactivated" })
      await load()
      if (viewingPromotion?.id === p.id) {
        setViewingPromotion((prev) =>
          prev
            ? {
                ...prev,
                status: activate ? "active" : "inactive",
                is_active: activate,
              }
            : prev
        )
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

  const bannerPreviewSrc = resolvePublicAssetUrl(form.banner_url)
  const viewBannerSrc = resolvePublicAssetUrl(viewingPromotion?.banner_url)

  const popupPreviewSource: PopupPreviewProps =
    mode === "view" && viewingPromotion
      ? {
          title: viewingPromotion.title,
          short_description: viewingPromotion.short_description || undefined,
          description: viewingPromotion.description || undefined,
          banner_url: viewingPromotion.banner_url || undefined,
          banner_media_type: viewingPromotion.banner_media_type,
          cta_type: viewingPromotion.cta_type,
          cta_label: viewingPromotion.cta_label || undefined,
          cta_url: viewingPromotion.cta_url || undefined,
        }
      : {
          title: form.title,
          short_description: form.short_description,
          description: form.description,
          banner_url: form.banner_url,
          banner_media_type: form.banner_media_type,
          cta_type: form.cta_type,
          cta_label: form.cta_label,
          cta_url: form.cta_url,
        }

  const targetingEditor = (
    <TargetingSection
      target={target}
      setTarget={setTarget}
      options={options}
      studentSearch={studentSearch}
      setStudentSearch={setStudentSearch}
      selectedStudentLabels={selectedStudentLabels}
      setSelectedStudentLabels={setSelectedStudentLabels}
      setPreviewCount={setPreviewCount}
      previewCount={previewCount}
      previewing={previewing}
      onPreviewEligibility={() => void handlePreviewEligibility()}
    />
  )

  const listView = (
    <>
      <AdminPageHeader
        icon={Megaphone}
        title="Student promotions"
        subtitle="Manage offers and campaign banners for the student dashboard."
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              className={adminOutlineBtnClass}
              onClick={() => void load()}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button type="button" className={adminPrimaryBtnClass} onClick={startCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add Promotion
            </Button>
          </>
        }
      />

      <AdminFilterBar className="mb-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            {PROMOTION_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative min-w-0 w-full">
          <Search className="pointer-events-none absolute left-3 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, slug, or CTA…"
            className="pl-10"
          />
        </div>
      </AdminFilterBar>

      {error ? (
        <AdminCard className="mb-4 border-red-200 bg-red-50 text-sm text-red-700">{error}</AdminCard>
      ) : null}

      <AdminTableShell
        footer={
          promotions.length > 0 ? (
            <>
              <span>
                Showing {promotions.length === 0 ? 0 : pageStart + 1}–{pageEnd} of{" "}
                {promotions.length} promotions
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
        <table className="min-w-[1180px] w-full text-sm">
          <thead>
            <tr className="border-b border-[#E8EAF0] text-left text-xs font-medium uppercase tracking-wide text-[#6B7280]">
              <th className="px-4 py-3">Promotion</th>
              <th className="px-4 py-3">Posted by</th>
              <th className="px-4 py-3">Audience</th>
              <th className="px-4 py-3">Schedule</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center text-[#6B7280]">
                  <Loader2 className="mr-2 inline h-5 w-5 animate-spin" />
                  Loading promotions…
                </td>
              </tr>
            ) : promotions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center text-[#6B7280]">
                  No promotions yet. Add a promotion with a banner and optional CTA.
                </td>
              </tr>
            ) : (
              paginatedPromotions.map((p) => {
                const sched = formatPromotionSchedule(p)
                return (
                  <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-3">
                        <PromotionThumbnail
                          url={p.banner_url}
                          mediaType={p.banner_media_type}
                        />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-[#2F3153]">{p.title}</span>
                            {p.is_live ? (
                              <Badge
                                variant="outline"
                                className="border-emerald-200 bg-emerald-50 text-xs text-emerald-800"
                              >
                                Live
                              </Badge>
                            ) : null}
                          </div>
                          {p.short_description ? (
                            <p className="mt-0.5 line-clamp-2 text-xs text-[#6B7280]">
                              {p.short_description}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-[#4F5077]">
                        {p.posted_by_academy || p.partner_org_name || "Platform"}
                      </div>
                      {p.owner_type && p.owner_type !== "rock" ? (
                        <div className="mt-0.5 text-[11px] uppercase tracking-wide text-[#6B7280]">
                          {p.owner_type === "partner" ? "Partner" : "Academy"}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#4F5077]">{targetLabel(p)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-[#4F5077]">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-[#6B7280]" />
                        {sched.line}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1 text-[#6B7280]">
                        <Clock className="h-3.5 w-3.5" />
                        {sched.sub}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#2F3153]">{p.priority ?? 100}</td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={cn("text-xs", STATUS_CLASS[p.status || "draft"] || "")}
                      >
                        {promotionStatusLabel(p.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="h-8 w-8 rounded-lg"
                          onClick={() => void openView(p)}
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
                        {p.status !== "archived" ? (
                          <Switch
                            checked={p.status === "active"}
                            disabled={saving}
                            onCheckedChange={(checked) => void toggleListActive(p, checked)}
                            title={p.status === "active" ? "Deactivate" : "Activate"}
                          />
                        ) : null}
                        {p.status !== "archived" ? (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-[#6B7280]"
                            disabled={saving}
                            onClick={() => void archive(p.id)}
                            title="Archive"
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                )
              })
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
            { label: "Engagement" },
            { label: "Promotions" },
            { label: editingId ? "Edit Promotion" : "Add Promotion" },
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
          {editingId ? "Edit Promotion" : "Add Promotion"}
        </h1>
      </div>

      <div className="admin-page-with-sticky-actions admin-stack">
        <SectionCard
          icon={Megaphone}
          title="Promotion details"
          subtitle="Title, slug, and copy shown in the student popup."
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-1.5 md:col-span-2">
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Summer belt exam offer"
                className="rounded-xl border-gray-200"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Slug (optional)</Label>
              <Input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="auto from title"
                className="rounded-xl border-gray-200"
              />
            </div>
            <div className="space-y-1.5 md:col-span-2 xl:col-span-3">
              <Label>Short description</Label>
              <Input
                value={form.short_description}
                onChange={(e) => setForm({ ...form, short_description: e.target.value })}
                placeholder="Shown under the title"
                className="rounded-xl border-gray-200"
              />
            </div>
            <div className="space-y-1.5 md:col-span-2 xl:col-span-3">
              <Label>Full description</Label>
              <Textarea
                rows={4}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="min-h-[100px] resize-y rounded-xl border-gray-200"
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard icon={ImageIcon} title="Media" subtitle="Upload-only banner (image or video).">
          <div className="space-y-3">
            <p className="text-xs text-[#6B7280]">
              JPG, PNG, WEBP or MP4/WebM. Upload only — URL paste is not allowed.
            </p>
            <div className="flex flex-wrap gap-2">
              <label className="cursor-pointer">
                <span className="sr-only">Upload banner</span>
                <input
                  type="file"
                  accept="image/*,video/mp4,video/webm"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) void handleUpload(f)
                    e.target.value = ""
                  }}
                />
                <span
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl border border-[#E8EAF0] bg-white px-4 py-2 text-sm font-medium text-[#2F3153] hover:bg-gray-50",
                    uploading && "opacity-60"
                  )}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  Upload banner
                </span>
              </label>
              {form.banner_url ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={adminOutlineBtnClass}
                  onClick={clearBanner}
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" />
                  Remove
                </Button>
              ) : null}
            </div>
            {bannerPreviewSrc ? (
              <div className="max-w-md overflow-hidden rounded-xl border border-[#E8EAF0]">
                {form.banner_media_type === "video" ? (
                  <video
                    src={bannerPreviewSrc}
                    className="aspect-video w-full bg-black object-cover"
                    controls
                  />
                ) : (
                  <img
                    src={bannerPreviewSrc}
                    alt="Banner preview"
                    className="aspect-video w-full object-cover"
                  />
                )}
              </div>
            ) : (
              <div className="flex aspect-video max-w-md items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-400">
                No banner yet
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard icon={ExternalLink} title="Call to action">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-1.5">
              <Label>CTA type</Label>
              <Select value={form.cta_type} onValueChange={(v) => setForm({ ...form, cta_type: v })}>
                <SelectTrigger className="rounded-xl border-gray-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROMOTION_CTA_TYPES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.cta_type !== "none" ? (
              <>
                <div className="space-y-1.5">
                  <Label>Button label</Label>
                  <Input
                    value={form.cta_label}
                    onChange={(e) => setForm({ ...form, cta_label: e.target.value })}
                    placeholder="Learn more"
                    className="rounded-xl border-gray-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{form.cta_type === "path" ? "In-app path" : "External URL"}</Label>
                  <Input
                    value={form.cta_url}
                    onChange={(e) => setForm({ ...form, cta_url: e.target.value })}
                    placeholder={
                      form.cta_type === "path" ? "/student-dashboard/payments" : "https://…"
                    }
                    className="rounded-xl border-gray-200"
                  />
                </div>
              </>
            ) : null}
          </div>
        </SectionCard>

        <SectionCard icon={Calendar} title="Schedule">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Start</Label>
              <Input
                type="datetime-local"
                value={form.start_at}
                onChange={(e) => setForm({ ...form, start_at: e.target.value })}
                className="rounded-xl border-gray-200 [color-scheme:light]"
              />
            </div>
            <div className="space-y-1.5">
              <Label>End</Label>
              <Input
                type="datetime-local"
                value={form.end_at}
                onChange={(e) => setForm({ ...form, end_at: e.target.value })}
                className="rounded-xl border-gray-200 [color-scheme:light]"
              />
            </div>
          </div>
          <p className="mt-2 text-xs text-[#6B7280]">
            Leave blank for no schedule limit. Active + in-window = live.
          </p>
        </SectionCard>

        <SectionCard
          icon={Users}
          title="Audience targeting"
          subtitle="All students or targeted filters (AND)."
        >
          {targetingEditor}
        </SectionCard>

        <AdminCard className="border-[#E8EAF0]">
          <div className="space-y-1.5 max-w-xs">
            <Label>Priority</Label>
            <Input
              type="number"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
              className="rounded-xl border-gray-200"
            />
            <p className="text-xs text-gray-400">Lower number = higher priority</p>
          </div>
        </AdminCard>
      </div>

      <AdminStickyFormActions>
        <div className="mr-auto flex min-w-[10rem] max-w-[14rem] flex-1 items-center gap-2 sm:flex-none">
          <Label className="shrink-0 text-xs font-medium uppercase tracking-wide text-[#6B7280]">
            Status
          </Label>
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
            <SelectTrigger className="h-10 w-full rounded-xl border-gray-200 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROMOTION_STATUSES.filter((s) => s.value !== "archived").map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="button" variant="outline" className={adminOutlineBtnClass} onClick={goToList}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={saving || uploading}
          onClick={() => void handleSave("draft")}
        >
          Save as Draft
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={saving || uploading}
          onClick={() => setPopupPreviewOpen(true)}
        >
          <Eye className="mr-2 h-4 w-4" />
          Preview popup
        </Button>
        <Button
          type="button"
          className={adminPrimaryBtnClass}
          disabled={saving || uploading}
          onClick={() => void handleSave("active")}
        >
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Check className="mr-2 h-4 w-4" />
          )}
          Publish
        </Button>
      </AdminStickyFormActions>
    </>
  )

  const detail = viewingPromotion

  const detailView = detail ? (
    <>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <AdminBreadcrumb
            items={[
              { label: "Engagement" },
              { label: "Promotions" },
              { label: "View Promotion" },
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
          <h1 className="text-xl font-bold text-[#2F3153]">View Promotion</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className={adminOutlineBtnClass}
            onClick={() => setPopupPreviewOpen(true)}
          >
            <Eye className="mr-2 h-4 w-4" />
            Preview
          </Button>
          <Button
            type="button"
            variant="outline"
            className={adminOutlineBtnClass}
            onClick={() => startEdit(detail)}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
          {detail.status !== "archived" ? (
            <Button
              type="button"
              className={adminPrimaryBtnClass}
              disabled={saving}
              onClick={() => void archive(detail.id)}
            >
              <Archive className="mr-2 h-4 w-4" />
              Archive
            </Button>
          ) : null}
        </div>
      </div>

      <div className="admin-stack">
        <AdminCard className="border-[#E8EAF0]">
          <div className="flex flex-col gap-4 sm:flex-row">
            {viewBannerSrc ? (
              detail.banner_media_type === "video" ? (
                <video
                  src={viewBannerSrc}
                  className="h-28 w-40 shrink-0 rounded-xl border border-[#E8EAF0] object-cover"
                  controls
                />
              ) : (
                <img
                  src={viewBannerSrc}
                  alt=""
                  className="h-28 w-40 shrink-0 rounded-xl border border-[#E8EAF0] object-cover"
                />
              )
            ) : (
              <div className="flex h-28 w-40 shrink-0 items-center justify-center rounded-xl bg-gray-100">
                <ImageIcon className="h-8 w-8 text-gray-400" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold text-[#2F3153]">{detail.title}</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge
                  variant="outline"
                  className={cn("text-xs", STATUS_CLASS[detail.status || "draft"] || "")}
                >
                  {promotionStatusLabel(detail.status)}
                </Badge>
                {detail.is_live ? (
                  <Badge
                    variant="outline"
                    className="border-emerald-200 bg-emerald-50 text-xs text-emerald-800"
                  >
                    Live
                  </Badge>
                ) : null}
              </div>
              <p className="mt-2 text-sm text-[#6B7280]">{targetLabel(detail)}</p>
              <p className="mt-1 text-xs text-gray-400">Priority {detail.priority ?? 100}</p>
            </div>
          </div>
        </AdminCard>

        <SectionCard icon={Megaphone} title="Promotion details">
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-xs font-medium uppercase text-[#6B7280]">Posted by</dt>
              <dd className="text-[#4F5077]">
                {detail.posted_by_academy || detail.partner_org_name || "Platform"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-[#6B7280]">Slug</dt>
              <dd className="text-[#4F5077]">{detail.slug || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-[#6B7280]">Short description</dt>
              <dd className="text-[#4F5077]">{detail.short_description || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-[#6B7280]">Description</dt>
              <dd className="whitespace-pre-wrap text-[#4F5077]">{detail.description || "—"}</dd>
            </div>
          </dl>
        </SectionCard>

        <SectionCard icon={Calendar} title="Schedule">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-[#6B7280]">Start</dt>
              <dd className="text-[#2F3153]">
                {detail.start_at ? new Date(detail.start_at).toLocaleString() : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[#6B7280]">End</dt>
              <dd className="text-[#2F3153]">
                {detail.end_at ? new Date(detail.end_at).toLocaleString() : "—"}
              </dd>
            </div>
          </dl>
        </SectionCard>

        <SectionCard icon={ExternalLink} title="Call to action">
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-xs text-[#6B7280]">Type</dt>
              <dd className="text-[#2F3153]">{detail.cta_type || "none"}</dd>
            </div>
            {detail.cta_type && detail.cta_type !== "none" ? (
              <>
                <div>
                  <dt className="text-xs text-[#6B7280]">Label</dt>
                  <dd className="text-[#2F3153]">{detail.cta_label || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[#6B7280]">URL / path</dt>
                  <dd className="break-all text-[#2F3153]">{detail.cta_url || "—"}</dd>
                </div>
              </>
            ) : null}
          </dl>
        </SectionCard>

        <SectionCard icon={Users} title="Audience">
          <p className="text-sm text-[#4F5077]">{targetLabel(detail)}</p>
          {detail.target?.mode === "targeted" ? (
            <ul className="mt-2 list-inside list-disc text-xs text-[#6B7280]">
              {detail.target.branch_ids?.length ? (
                <li>{detail.target.branch_ids.length} branch filter(s)</li>
              ) : null}
              {detail.target.course_ids?.length ? (
                <li>{detail.target.course_ids.length} course filter(s)</li>
              ) : null}
              {detail.target.group_ids?.length ? (
                <li>{detail.target.group_ids.length} group filter(s)</li>
              ) : null}
              {detail.target.student_ids?.length ? (
                <li>{detail.target.student_ids.length} student(s)</li>
              ) : null}
            </ul>
          ) : null}
        </SectionCard>
      </div>
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

        <AppModal
          open={popupPreviewOpen}
          onClose={() => setPopupPreviewOpen(false)}
          bare
          hideClose={false}
          scrollable={false}
          size="full"
          className="!h-auto !w-auto max-h-[80vh] max-w-[80vw] !max-w-[80vw] rounded-[1.25rem] border-0"
          bodyClassName="flex flex-col overflow-hidden !p-0"
        >
          <PromotionPopupPreview {...popupPreviewSource} />
        </AppModal>
      </main>
    </div>
  )
}

function TargetingSection({
  target,
  setTarget,
  options,
  studentSearch,
  setStudentSearch,
  selectedStudentLabels,
  setSelectedStudentLabels,
  setPreviewCount,
  previewCount,
  previewing,
  onPreviewEligibility,
}: {
  target: PromotionTarget
  setTarget: Dispatch<SetStateAction<PromotionTarget>>
  options: TargetingOptions | null
  studentSearch: string
  setStudentSearch: (v: string) => void
  selectedStudentLabels: Record<string, string>
  setSelectedStudentLabels: Dispatch<SetStateAction<Record<string, string>>>
  setPreviewCount: (n: number | null) => void
  previewCount: number | null
  previewing: boolean
  onPreviewEligibility: () => void
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Audience</Label>
        <Select
          value={target.mode}
          onValueChange={(v) => {
            setPreviewCount(null)
            setTarget((prev) => ({
              ...prev,
              mode: v === "targeted" ? "targeted" : "all",
            }))
          }}
        >
          <SelectTrigger className="rounded-xl border-gray-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All students</SelectItem>
            <SelectItem value="targeted">Targeted (filters AND)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {target.mode === "targeted" ? (
        <>
          <p className="text-xs text-[#6B7280]">
            Non-empty filters are combined with AND. Leave a filter empty to ignore it.
          </p>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label className="text-xs">Academies ({target.branch_ids.length})</Label>
              <div className="mt-1 max-h-28 overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 space-y-1">
                {(options?.branches || []).length === 0 ? (
                  <p className="text-xs text-gray-400">No branches</p>
                ) : (
                  (options?.branches || []).map((b) => (
                    <label
                      key={b.id}
                      className="flex cursor-pointer items-center gap-2 text-sm"
                    >
                      <Checkbox
                        checked={target.branch_ids.includes(b.id)}
                        onCheckedChange={(c) => {
                          setPreviewCount(null)
                          setTarget((prev) => ({
                            ...prev,
                            branch_ids: toggleId(prev.branch_ids, b.id, !!c),
                          }))
                        }}
                      />
                      <span className="truncate">{b.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div>
              <Label className="text-xs">Courses ({target.course_ids.length})</Label>
              <div className="mt-1 max-h-28 overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 space-y-1">
                {(options?.courses || []).length === 0 ? (
                  <p className="text-xs text-gray-400">No courses</p>
                ) : (
                  (options?.courses || []).map((c) => (
                    <label
                      key={c.id}
                      className="flex cursor-pointer items-center gap-2 text-sm"
                    >
                      <Checkbox
                        checked={target.course_ids.includes(c.id)}
                        onCheckedChange={(on) => {
                          setPreviewCount(null)
                          setTarget((prev) => ({
                            ...prev,
                            course_ids: toggleId(prev.course_ids, c.id, !!on),
                          }))
                        }}
                      />
                      <span className="truncate">{c.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div>
              <Label className="text-xs">Groups / batches ({target.group_ids.length})</Label>
              <div className="mt-1 max-h-24 overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 space-y-1">
                {(options?.groups || []).length === 0 ? (
                  <p className="text-xs text-gray-400">No batch groups found</p>
                ) : (
                  (options?.groups || []).map((g) => (
                    <label
                      key={g.id}
                      className="flex cursor-pointer items-center gap-2 text-sm"
                    >
                      <Checkbox
                        checked={target.group_ids.includes(g.id)}
                        onCheckedChange={(on) => {
                          setPreviewCount(null)
                          setTarget((prev) => ({
                            ...prev,
                            group_ids: toggleId(prev.group_ids, g.id, !!on),
                          }))
                        }}
                      />
                      <span className="truncate font-mono text-xs">{g.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div>
              <Label className="text-xs">Specific students ({target.student_ids.length})</Label>
              <Input
                className="mt-1 mb-1 rounded-xl border-gray-200"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Search name, phone, email…"
              />
              {target.student_ids.length > 0 ? (
                <div className="mb-1 flex flex-wrap gap-1">
                  {target.student_ids.map((id) => (
                    <Badge
                      key={id}
                      variant="outline"
                      className="cursor-pointer text-xs"
                      onClick={() => {
                        setPreviewCount(null)
                        setTarget((prev) => ({
                          ...prev,
                          student_ids: prev.student_ids.filter((x) => x !== id),
                        }))
                      }}
                      title="Click to remove"
                    >
                      {selectedStudentLabels[id] || id.slice(0, 8)} ×
                    </Badge>
                  ))}
                </div>
              ) : null}
              <div className="max-h-28 overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 space-y-1">
                {(options?.students || []).length === 0 ? (
                  <p className="text-xs text-gray-400">No students</p>
                ) : (
                  (options?.students || []).map((s) => (
                    <label
                      key={s.id}
                      className="flex cursor-pointer items-center gap-2 text-sm"
                    >
                      <Checkbox
                        checked={target.student_ids.includes(s.id)}
                        onCheckedChange={(on) => {
                          setPreviewCount(null)
                          setTarget((prev) => ({
                            ...prev,
                            student_ids: toggleId(prev.student_ids, s.id, !!on),
                          }))
                          if (on) {
                            setSelectedStudentLabels((prev) => ({
                              ...prev,
                              [s.id]: s.name || s.id,
                            }))
                          }
                        }}
                      />
                      <span className="truncate">
                        {s.name}
                        {s.phone ? (
                          <span className="ml-1 text-xs text-gray-400">{s.phone}</span>
                        ) : null}
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <p className="text-xs text-[#6B7280]">
          Every student can see this promotion when it is live.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-[#E8EAF0] pt-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={adminOutlineBtnClass}
          disabled={previewing}
          onClick={onPreviewEligibility}
        >
          {previewing ? (
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          ) : (
            <Users className="mr-1 h-3 w-3" />
          )}
          Preview audience
        </Button>
        {previewCount !== null ? (
          <span className="text-xs font-medium text-[#4F5077]">{previewCount} eligible</span>
        ) : null}
      </div>
    </div>
  )
}