"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ElementType,
  type ReactNode,
} from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  Archive,
  ArrowLeft,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Eye,
  GraduationCap,
  ImageIcon,
  Layers,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Users,
  X,
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
import { AdminImageUpload } from "@/components/ui/AdminImageUpload"
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
import { resolvePublicAssetUrl } from "@/lib/resolvePublicAssetUrl"
import { cn } from "@/lib/utils"
import {
  LEARNING_COURSE_STATUSES,
  learningCourseAPI,
  learningStatusLabel,
  type LearningCourse,
} from "@/lib/learningCourseAPI"

type PageMode = "list" | "form" | "view"

const PAGE_SIZE = 20

const EMPTY_FORM = {
  title: "",
  slug: "",
  price: "0",
  short_description: "",
  description: "",
  thumbnail_url: "",
  trailer_url: "",
  difficulty: "Beginner",
  language: "English",
  estimated_hours: "",
  status: "draft",
  sort_order: "100",
  seo_title: "",
  seo_description: "",
}

const STATUS_CLASS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 border-gray-200",
  published: "bg-green-50 text-green-800 border-green-200",
  archived: "bg-red-50 text-red-800 border-red-200",
}

const DIFFICULTY_BADGE: Record<string, string> = {
  beginner: "bg-green-50 text-green-700 border-green-100",
  intermediate: "bg-amber-50 text-amber-800 border-amber-100",
  advanced: "bg-red-50 text-red-700 border-red-100",
}

function difficultyBadgeClass(difficulty?: string | null) {
  if (!difficulty) return "bg-gray-50 text-gray-700 border-gray-200"
  const key = difficulty.trim().toLowerCase()
  return DIFFICULTY_BADGE[key] || "bg-purple-50 text-purple-700 border-purple-100"
}

function CourseThumbnail({ url, title }: { url?: string | null; title: string }) {
  const src = resolvePublicAssetUrl(url)
  if (!src) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
        <ImageIcon className="h-4 w-4" />
      </div>
    )
  }
  return (
    <img
      src={src}
      alt=""
      className="h-10 w-10 shrink-0 rounded-lg border border-[#E8EAF0] object-cover"
      onError={(e) => {
        e.currentTarget.style.display = "none"
      }}
    />
  )
}

function formatCoursePrice(price?: number | null) {
  if (price != null && price > 0) {
    return `₹${price.toLocaleString("en-IN")}`
  }
  return "Free"
}

function formatCurriculumCounts(c: LearningCourse) {
  if (c.levels_count == null && c.lessons_count == null) return "—"
  return `${c.levels_count ?? 0} levels · ${c.lessons_count ?? 0} lessons`
}

function formFromCourse(c: LearningCourse) {
  return {
    title: c.title || "",
    slug: c.slug || "",
    price: c.price != null ? String(c.price) : "0",
    short_description: c.short_description || "",
    description: c.description || "",
    thumbnail_url: c.thumbnail_url || "",
    trailer_url: c.trailer_url || "",
    difficulty: c.difficulty || "Beginner",
    language: c.language || "English",
    estimated_hours:
      c.estimated_hours != null && c.estimated_hours !== undefined
        ? String(c.estimated_hours)
        : "",
    status: c.status || "draft",
    sort_order: String(c.sort_order ?? 100),
    seo_title: c.seo_title || "",
    seo_description: c.seo_description || "",
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
          <Icon className="h-4.5 w-4.5 h-[18px] w-[18px]" strokeWidth={2.2} />
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

export default function LearningCoursesAdminPage() {
  const params = useParams()
  const adminType = String(params?.adminType || "superadmin")
  const { toast } = useToast()

  const [mode, setMode] = useState<PageMode>("list")
  const [courses, setCourses] = useState<LearningCourse[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [viewingCourse, setViewingCourse] = useState<LearningCourse | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })

  const totalPages = Math.max(1, Math.ceil(courses.length / PAGE_SIZE))
  const pageStart = (currentPage - 1) * PAGE_SIZE
  const pageEnd = Math.min(pageStart + PAGE_SIZE, courses.length)
  const paginatedCourses = useMemo(
    () => courses.slice(pageStart, pageEnd),
    [courses, pageStart, pageEnd]
  )

  const viewThumb = resolvePublicAssetUrl(viewingCourse?.thumbnail_url)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await learningCourseAPI.listAdmin({
        status: statusFilter,
        search: search || undefined,
      })
      setCourses(data.courses || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load courses")
    } finally {
      setLoading(false)
    }
  }, [statusFilter, search])

  useEffect(() => {
    if (mode === "list") void load()
  }, [load, mode])

  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, search])

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  const goToList = () => {
    setMode("list")
    setViewingCourse(null)
    setEditingId(null)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const startCreate = () => {
    setEditingId(null)
    setForm({ ...EMPTY_FORM })
    setMode("form")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const startEdit = (c: LearningCourse) => {
    setEditingId(c.id)
    setForm(formFromCourse(c))
    setMode("form")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const openView = async (c: LearningCourse) => {
    setViewingCourse(c)
    setMode("view")
    try {
      const { course } = await learningCourseAPI.getAdmin(c.id)
      setViewingCourse(course)
    } catch {
      /* keep list row */
    }
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const exportCsv = () => {
    const headers = [
      "Title",
      "Slug",
      "Status",
      "Difficulty",
      "Language",
      "Price INR",
      "Est. Hours",
      "Levels",
      "Lessons",
      "Sort Order",
    ]
    const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
    const rows = courses.map((c) =>
      [
        c.title,
        c.slug,
        c.status || "",
        c.difficulty || "",
        c.language || "",
        c.price ?? 0,
        c.estimated_hours ?? "",
        c.levels_count ?? "",
        c.lessons_count ?? "",
        c.sort_order ?? 100,
      ].map(escape).join(",")
    )
    const csv = [headers.map(escape).join(","), ...rows].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = `online-learning-courses-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const handleSave = async (overrideStatus?: string) => {
    if (!form.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const statusToSave = overrideStatus ?? form.status
      const payload = {
        title: form.title.trim(),
        slug: form.slug.trim() || undefined,
        price: form.price ? parseFloat(form.price) : 0,
        short_description: form.short_description.trim() || undefined,
        description: form.description.trim() || undefined,
        thumbnail_url: form.thumbnail_url.trim() || undefined,
        trailer_url: form.trailer_url.trim() || undefined,
        difficulty: form.difficulty.trim() || undefined,
        language: form.language.trim() || undefined,
        estimated_hours: form.estimated_hours ? parseFloat(form.estimated_hours) : null,
        status: statusToSave,
        sort_order: parseInt(form.sort_order || "100", 10) || 100,
        seo_title: form.seo_title.trim() || undefined,
        seo_description: form.seo_description.trim() || undefined,
      }
      if (editingId) {
        await learningCourseAPI.update(editingId, payload)
        toast({ title: "Course updated" })
      } else {
        await learningCourseAPI.create(payload)
        toast({ title: "Course created" })
      }
      setEditingId(null)
      setForm({ ...EMPTY_FORM })
      setMode("list")
      await load()
    } catch (e) {
      toast({
        title: "Save failed",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const archive = async (id: string) => {
    if (!confirm("Archive this course? It will no longer appear as active.")) return
    setSaving(true)
    try {
      await learningCourseAPI.archive(id)
      toast({ title: "Course archived" })
      if (editingId === id) {
        setEditingId(null)
        setForm({ ...EMPTY_FORM })
        goToList()
      } else if (viewingCourse?.id === id) {
        goToList()
      }
      await load()
    } catch (e) {
      toast({
        title: "Archive failed",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const toggleListStatus = async (c: LearningCourse, publish: boolean) => {
    if (c.status === "archived") return
    const next = publish ? "published" : "draft"
    setSaving(true)
    try {
      await learningCourseAPI.update(c.id, { status: next })
      toast({ title: publish ? "Course published" : "Moved to draft" })
      await load()
      if (viewingCourse?.id === c.id) {
        setViewingCourse((prev) => (prev ? { ...prev, status: next } : prev))
      }
    } catch (e) {
      toast({
        title: "Status update failed",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const curriculumHref = (id: string) =>
    `/${adminType}/dashboard/online-learning/courses/${id}/curriculum`
  const submissionsHref = (id: string) =>
    `/${adminType}/dashboard/online-learning/courses/${id}/submissions`

  const listView = (
    <>
      <AdminPageHeader
        icon={GraduationCap}
        title="Online Learning – Courses"
        subtitle="Manage courses, pricing, curriculums, and student submissions."
        actions={
          <>
            <Button type="button" variant="outline" className={adminOutlineBtnClass} onClick={exportCsv}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
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
              Add Course
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
            {LEARNING_COURSE_STATUSES.map((s) => (
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
            placeholder="Search courses by title or slug..."
            className="pl-10"
          />
        </div>
      </AdminFilterBar>

      {error ? (
        <AdminCard className="mb-4 border-red-200 bg-red-50 text-sm text-red-700">{error}</AdminCard>
      ) : null}

      <AdminTableShell
        footer={
          courses.length > 0 ? (
            <>
              <span>
                Showing {courses.length === 0 ? 0 : pageStart + 1}–{pageEnd} of {courses.length} courses
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
        <table className="min-w-[1100px] w-full text-sm">
          <thead>
            <tr className="border-b border-[#E8EAF0] text-left text-xs font-medium uppercase tracking-wide text-[#6B7280]">
              <th className="px-4 py-3">Course Title</th>
              <th className="px-4 py-3">Difficulty</th>
              <th className="px-4 py-3">Language</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Curriculum</th>
              <th className="px-4 py-3">Est. hours</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-16 text-center text-[#6B7280]">
                  <Loader2 className="mr-2 inline h-5 w-5 animate-spin" />
                  Loading courses…
                </td>
              </tr>
            ) : courses.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-16 text-center text-[#6B7280]">
                  No courses yet. Add your first online learning course.
                </td>
              </tr>
            ) : (
              paginatedCourses.map((c) => (
                <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-3">
                      <CourseThumbnail url={c.thumbnail_url} title={c.title} />
                      <div className="min-w-0">
                        <div className="font-medium text-[#2F3153]">{c.title}</div>
                        {c.short_description ? (
                          <div className="line-clamp-2 text-xs text-[#6B7280]">{c.short_description}</div>
                        ) : null}
                        {c.slug ? (
                          <div className="text-xs text-[#6B7280]">/online-learning/{c.slug}</div>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {c.difficulty ? (
                      <Badge
                        variant="outline"
                        className={cn("text-xs font-medium", difficultyBadgeClass(c.difficulty))}
                      >
                        {c.difficulty}
                      </Badge>
                    ) : (
                      <span className="text-[#6B7280]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[#4F5077]">{c.language || "—"}</td>
                  <td className="px-4 py-3 font-medium text-[#2F3153]">{formatCoursePrice(c.price)}</td>
                  <td className="px-4 py-3 text-xs text-[#4F5077]">{formatCurriculumCounts(c)}</td>
                  <td className="px-4 py-3 text-[#4F5077]">
                    {c.estimated_hours != null ? (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-[#6B7280]" />
                        {c.estimated_hours}h
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className={cn("text-xs", STATUS_CLASS[c.status || ""] || "")}
                    >
                      {learningStatusLabel(c.status)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 rounded-lg"
                        onClick={() => void openView(c)}
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 rounded-lg"
                        onClick={() => startEdit(c)}
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 rounded-lg"
                        asChild
                        title="Curriculum"
                      >
                        <Link href={curriculumHref(c.id)}>
                          <BookOpen className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 rounded-lg border-blue-200 text-blue-700 hover:bg-blue-50"
                        asChild
                        title="Submissions"
                      >
                        <Link href={submissionsHref(c.id)}>
                          <Users className="h-4 w-4" />
                        </Link>
                      </Button>
                      {c.status !== "archived" ? (
                        <Switch
                          checked={c.status === "published"}
                          disabled={saving}
                          onCheckedChange={(checked) => void toggleListStatus(c, checked)}
                          title={c.status === "published" ? "Unpublish" : "Publish"}
                        />
                      ) : null}
                      {c.status !== "archived" ? (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-[#6B7280]"
                          disabled={saving}
                          onClick={() => void archive(c.id)}
                          title="Archive"
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                      ) : null}
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
            { label: "Courses" },
            { label: editingId ? "Edit Course" : "Add Course" },
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
          {editingId ? "Edit Course" : "Add Course"}
        </h1>
      </div>

      <div className="admin-page-with-sticky-actions admin-stack space-y-4">
        <SectionCard
          icon={GraduationCap}
          title="Course Details"
          subtitle="Basic information about the course."
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-1.5 md:col-span-2 xl:col-span-1">
              <Label>
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Karate Fundamentals Online"
                className="rounded-xl border-gray-200"
              />
            </div>
            <div className="space-y-1.5 md:col-span-2 xl:col-span-2">
              <Label>Slug (optional)</Label>
              <div className="flex overflow-hidden rounded-xl border border-gray-200">
                <span className="flex items-center border-r border-gray-200 bg-gray-50 px-3 text-sm text-[#6B7280]">
                  /online-learning/
                </span>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="auto from title"
                  className="rounded-none border-0 focus-visible:ring-0"
                />
              </div>
            </div>
            <div className="space-y-1.5 md:col-span-2 xl:col-span-3">
              <Label>Short description</Label>
              <Input
                value={form.short_description}
                onChange={(e) => setForm({ ...form, short_description: e.target.value })}
                placeholder="One-line summary"
                className="rounded-xl border-gray-200"
              />
            </div>
            <div className="space-y-1.5 md:col-span-2 xl:col-span-3">
              <Label>Description</Label>
              <div className="overflow-hidden rounded-xl border border-gray-200">
                <div className="flex gap-1 border-b border-gray-100 bg-gray-50 px-2 py-1.5 text-[10px] text-[#6B7280]">
                  Plain text · line breaks preserved
                </div>
                <Textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="min-h-[100px] resize-y rounded-none border-0 focus-visible:ring-0"
                />
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard icon={Layers} title="Course Meta" subtitle="Difficulty, language, pricing, and order.">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Difficulty</Label>
              <Input
                value={form.difficulty}
                onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                className="rounded-xl border-gray-200"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Language</Label>
              <Input
                value={form.language}
                onChange={(e) => setForm({ ...form, language: e.target.value })}
                className="rounded-xl border-gray-200"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Est. hours</Label>
              <Input
                type="number"
                min={0}
                value={form.estimated_hours}
                onChange={(e) => setForm({ ...form, estimated_hours: e.target.value })}
                className="rounded-xl border-gray-200"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Price (INR)</Label>
              <div className="flex overflow-hidden rounded-xl border border-gray-200">
                <span className="flex items-center border-r border-gray-200 bg-gray-50 px-3 text-sm text-[#6B7280]">
                  ₹
                </span>
                <Input
                  type="number"
                  min={0}
                  step="any"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="0 for free"
                  className="rounded-none border-0"
                />
              </div>
              <p className="mt-1 text-xs text-gray-400">0 = free</p>
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
          </div>
        </SectionCard>

        <SectionCard icon={ImageIcon} title="Course Media">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <AdminImageUpload
              label="Course thumbnail"
              shape="wide"
              value={form.thumbnail_url}
              onChange={(url) => setForm({ ...form, thumbnail_url: url })}
              onClear={() => setForm({ ...form, thumbnail_url: "" })}
              helperText="Recommended: 1280 x 720 px (JPG, PNG)"
            />
            <div className="space-y-1.5">
              <Label>Video / trailer URL (optional)</Label>
              <Input
                value={form.trailer_url}
                onChange={(e) => setForm({ ...form, trailer_url: e.target.value })}
                placeholder="YouTube or hosted trailer link"
                className="rounded-xl border-gray-200"
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard icon={Search} title="SEO" subtitle="Search engine metadata.">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>SEO title</Label>
              <Input
                value={form.seo_title}
                onChange={(e) => setForm({ ...form, seo_title: e.target.value })}
                className="rounded-xl border-gray-200"
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>SEO description</Label>
              <Textarea
                rows={2}
                value={form.seo_description}
                onChange={(e) => setForm({ ...form, seo_description: e.target.value })}
                className="rounded-xl border-gray-200"
              />
            </div>
          </div>
        </SectionCard>
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
              {LEARNING_COURSE_STATUSES.filter((s) => s.value !== "archived").map((s) => (
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
          disabled={saving}
          onClick={() => void handleSave("draft")}
        >
          Save as Draft
        </Button>
        <Button
          type="button"
          className={adminPrimaryBtnClass}
          disabled={saving}
          onClick={() => void handleSave()}
        >
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Check className="mr-2 h-4 w-4" />
          )}
          Save Course
        </Button>
      </AdminStickyFormActions>
    </>
  )

  const detailCourse = viewingCourse

  const detailView = detailCourse ? (
    <>
      <div>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <AdminBreadcrumb
              items={[
                { label: "Online Learning" },
                { label: "Courses" },
                { label: "View Course" },
              ]}
            />
            <button
              type="button"
              onClick={goToList}
              className="inline-flex items-center gap-2 text-sm font-medium text-[#4F5077] hover:text-[#2F3153]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to List
            </button>
            <h1 className="text-xl font-bold text-[#2F3153]">View Course</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className={adminOutlineBtnClass}
              onClick={() => startEdit(detailCourse)}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit Course
            </Button>
            <Button type="button" variant="outline" className={adminOutlineBtnClass} asChild>
              <Link href={curriculumHref(detailCourse.id)}>
                <BookOpen className="mr-2 h-4 w-4" />
                Curriculum
              </Link>
            </Button>
            <Button type="button" variant="outline" className={adminOutlineBtnClass} asChild>
              <Link href={submissionsHref(detailCourse.id)}>
                <Users className="mr-2 h-4 w-4" />
                Submissions
              </Link>
            </Button>
            {detailCourse.status !== "archived" ? (
              <Button
                type="button"
                className={adminPrimaryBtnClass}
                disabled={saving}
                onClick={() => void archive(detailCourse.id)}
              >
                <Archive className="mr-2 h-4 w-4" />
                Archive
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <AdminDetailLayout
        main={
          <div className="space-y-5">
            <AdminCard className="border-[#E8EAF0]">
              <div className="flex flex-col gap-4 sm:flex-row">
                {viewThumb ? (
                  <img
                    src={viewThumb}
                    alt=""
                    className="h-28 w-40 shrink-0 rounded-xl border border-[#E8EAF0] object-cover"
                  />
                ) : (
                  <div className="flex h-28 w-40 shrink-0 items-center justify-center rounded-xl bg-gray-100">
                    <ImageIcon className="h-8 w-8 text-gray-400" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold text-[#2F3153]">{detailCourse.title}</h2>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge
                      variant="outline"
                      className={STATUS_CLASS[detailCourse.status || ""] || ""}
                    >
                      {learningStatusLabel(detailCourse.status)}
                    </Badge>
                    {detailCourse.difficulty ? (
                      <Badge
                        variant="outline"
                        className={difficultyBadgeClass(detailCourse.difficulty)}
                      >
                        {detailCourse.difficulty}
                      </Badge>
                    ) : null}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-4 text-sm text-[#4F5077]">
                    <span className="font-medium text-[#2F3153]">
                      {formatCoursePrice(detailCourse.price)}
                    </span>
                    <span>{detailCourse.language || "—"}</span>
                    {detailCourse.estimated_hours != null ? (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-4 w-4 text-[#6B7280]" />
                        {detailCourse.estimated_hours}h estimated
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </AdminCard>

            <SectionCard icon={GraduationCap} title="Course Details">
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-xs font-medium uppercase text-[#6B7280]">Title</dt>
                  <dd className="text-[#2F3153]">{detailCourse.title}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase text-[#6B7280]">Slug</dt>
                  <dd>
                    {detailCourse.status === "published" && detailCourse.slug ? (
                      <a
                        href={`/online-learning/${detailCourse.slug}`}
                        className="text-[#C9971A] hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        /online-learning/{detailCourse.slug}
                      </a>
                    ) : (
                      <span className="text-[#4F5077]">
                        {detailCourse.slug ? `/online-learning/${detailCourse.slug}` : "—"}
                      </span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase text-[#6B7280]">Short description</dt>
                  <dd className="text-[#4F5077]">{detailCourse.short_description || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase text-[#6B7280]">Description</dt>
                  <dd className="whitespace-pre-wrap text-[#4F5077]">
                    {detailCourse.description || "—"}
                  </dd>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-medium uppercase text-[#6B7280]">Difficulty</dt>
                    <dd className="text-[#2F3153]">{detailCourse.difficulty || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase text-[#6B7280]">Language</dt>
                    <dd className="text-[#2F3153]">{detailCourse.language || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase text-[#6B7280]">Price</dt>
                    <dd className="text-[#2F3153]">{formatCoursePrice(detailCourse.price)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase text-[#6B7280]">Est. hours</dt>
                    <dd className="text-[#2F3153]">
                      {detailCourse.estimated_hours != null ? `${detailCourse.estimated_hours}h` : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase text-[#6B7280]">Sort order</dt>
                    <dd className="text-[#2F3153]">{detailCourse.sort_order ?? 100}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase text-[#6B7280]">Status</dt>
                    <dd>
                      <Badge
                        variant="outline"
                        className={STATUS_CLASS[detailCourse.status || ""] || ""}
                      >
                        {learningStatusLabel(detailCourse.status)}
                      </Badge>
                    </dd>
                  </div>
                </div>
              </dl>
            </SectionCard>
          </div>
        }
        side={
          <div className="space-y-5">
            <SectionCard icon={ImageIcon} title="Media">
              {viewThumb ? (
                <img
                  src={viewThumb}
                  alt=""
                  className="w-full rounded-xl border border-[#E8EAF0] object-cover"
                />
              ) : (
                <p className="text-sm text-[#6B7280]">No thumbnail</p>
              )}
              {detailCourse.thumbnail_url ? (
                <p className="mt-2 truncate text-xs text-[#6B7280]">{detailCourse.thumbnail_url}</p>
              ) : null}
              <div className="mt-3 border-t border-[#E8EAF0] pt-3">
                <p className="text-xs font-medium uppercase text-[#6B7280]">Trailer URL</p>
                {detailCourse.trailer_url ? (
                  <a
                    href={detailCourse.trailer_url}
                    className="mt-1 block truncate text-sm text-[#C9971A] hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {detailCourse.trailer_url}
                  </a>
                ) : (
                  <p className="mt-1 text-sm text-[#6B7280]">—</p>
                )}
              </div>
            </SectionCard>

            <SectionCard icon={Search} title="SEO">
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-xs text-[#6B7280]">SEO title</dt>
                  <dd className="text-[#2F3153]">{detailCourse.seo_title || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[#6B7280]">SEO description</dt>
                  <dd className="text-[#4F5077]">{detailCourse.seo_description || "—"}</dd>
                </div>
              </dl>
            </SectionCard>

            <SectionCard icon={Layers} title="Curriculum stats">
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-[#6B7280]">Levels</dt>
                  <dd className="font-semibold text-[#2F3153]">{detailCourse.levels_count ?? 0}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[#6B7280]">Lessons</dt>
                  <dd className="font-semibold text-[#2F3153]">{detailCourse.lessons_count ?? 0}</dd>
                </div>
              </dl>
              <div className="mt-4">
                <Button type="button" variant="outline" size="sm" className={adminOutlineBtnClass} asChild>
                  <Link href={curriculumHref(detailCourse.id)}>Manage curriculum</Link>
                </Button>
              </div>
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