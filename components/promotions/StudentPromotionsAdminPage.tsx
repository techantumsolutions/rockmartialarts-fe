"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, Plus, RefreshCw, Save, Upload, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { useToast } from "@/hooks/use-toast"
import {
  EMPTY_PROMOTION_TARGET,
  PROMOTION_CTA_TYPES,
  PROMOTION_MEDIA_TYPES,
  PROMOTION_STATUSES,
  fromDatetimeLocalValue,
  promotionStatusLabel,
  studentPromotionAPI,
  toDatetimeLocalValue,
  type PromotionTarget,
  type StudentPromotion,
  type TargetingOptions,
} from "@/lib/studentPromotionAPI"

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

export default function StudentPromotionsAdminPage() {
  const { toast } = useToast()
  const [promotions, setPromotions] = useState<StudentPromotion[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [target, setTarget] = useState<PromotionTarget>(cloneTarget())
  const [options, setOptions] = useState<TargetingOptions | null>(null)
  const [studentSearch, setStudentSearch] = useState("")
  const [previewCount, setPreviewCount] = useState<number | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [selectedStudentLabels, setSelectedStudentLabels] = useState<
    Record<string, string>
  >({})

  const loadOptions = useCallback(async (q?: string) => {
    try {
      const data = await studentPromotionAPI.targetingOptions({
        student_search: q || undefined,
        student_limit: 40,
      })
      setOptions(data)
    } catch {
      /* non-blocking for list view */
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
    void load()
  }, [load])

  useEffect(() => {
    void loadOptions()
  }, [loadOptions])

  useEffect(() => {
    const t = setTimeout(() => {
      void loadOptions(studentSearch)
    }, 300)
    return () => clearTimeout(t)
  }, [studentSearch, loadOptions])

  const startCreate = () => {
    setEditingId(null)
    setForm({ ...EMPTY_FORM })
    setTarget(cloneTarget())
    setPreviewCount(null)
    setSelectedStudentLabels({})
  }

  const startEdit = (p: StudentPromotion) => {
    setEditingId(p.id)
    setForm({
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
    })
    const next = cloneTarget(p.target)
    setTarget(next)
    setPreviewCount(null)
    const labels: Record<string, string> = {}
    for (const id of next.student_ids) {
      labels[id] = id
    }
    setSelectedStudentLabels(labels)
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

  const handlePreview = async () => {
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

  const handleSave = async () => {
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
      const payload = {
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
        status: form.status,
        priority: Number(form.priority) || 100,
        target: payloadTarget,
      }
      if (editingId) {
        const updateBody: Record<string, unknown> = { ...payload }
        if (!form.banner_url.trim()) updateBody.clear_banner = true
        if (form.cta_type === "none") updateBody.clear_cta = true
        if (!form.start_at && !form.end_at) updateBody.clear_dates = true
        await studentPromotionAPI.update(editingId, updateBody)
        toast({ title: "Promotion updated" })
      } else {
        await studentPromotionAPI.create(payload)
        toast({ title: "Promotion created" })
      }
      startCreate()
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
      if (editingId === id) startCreate()
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

  const toggleActive = async (p: StudentPromotion) => {
    const nextActive = p.status !== "active"
    setSaving(true)
    try {
      await studentPromotionAPI.update(p.id, {
        status: nextActive ? "active" : "inactive",
        is_active: nextActive,
      })
      toast({ title: nextActive ? "Promotion activated" : "Promotion deactivated" })
      await load()
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

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="w-full p-4 lg:px-8 lg:py-6 space-y-6 max-w-6xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#4F5077]">
              Student promotions
            </h1>
            <p className="text-sm text-[#6B7A99] mt-1">
              Manage offers and campaign banners for the student dashboard
              (separate from cart discount rules).
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void load()} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
            <Button
              onClick={startCreate}
              className="gap-2 bg-[#4F5077] hover:bg-[#3d3e5c]"
            >
              <Plus className="w-4 h-4" />
              New promotion
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {PROMOTION_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Search</Label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Title, slug, CTA…"
            />
          </div>
        </div>

        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-[#4F5077]">
                {editingId ? "Edit promotion" : "Create promotion"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Summer belt exam offer"
                />
              </div>
              <div>
                <Label>Slug (optional)</Label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="auto from title"
                />
              </div>
              <div>
                <Label>Short description</Label>
                <Input
                  value={form.short_description}
                  onChange={(e) =>
                    setForm({ ...form, short_description: e.target.value })
                  }
                  placeholder="Shown under the title"
                />
              </div>
              <div>
                <Label>Full description</Label>
                <Textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </div>

              <div className="rounded-md border border-gray-100 bg-gray-50 p-3 space-y-2">
                <Label className="text-xs text-gray-500 uppercase tracking-wide">
                  Banner / media
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Media type</Label>
                    <Select
                      value={form.banner_media_type}
                      onValueChange={(v) =>
                        setForm({ ...form, banner_media_type: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PROMOTION_MEDIA_TYPES.map((m) => (
                          <SelectItem key={m.value} value={m.value}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <label className="w-full cursor-pointer">
                      <span className="sr-only">Upload banner</span>
                      <input
                        type="file"
                        accept="image/*,video/mp4,video/webm"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          if (f) void handleUpload(f)
                          e.target.value = ""
                        }}
                      />
                      <span className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent">
                        {uploading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4" />
                        )}
                        Upload
                      </span>
                    </label>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Banner URL</Label>
                  <Input
                    value={form.banner_url}
                    onChange={(e) =>
                      setForm({ ...form, banner_url: e.target.value })
                    }
                    placeholder="Or paste image/video URL"
                  />
                </div>
                {form.banner_url ? (
                  form.banner_media_type === "video" ? (
                    <video
                      src={form.banner_url}
                      className="w-full max-h-36 rounded object-cover bg-black"
                      controls
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={form.banner_url}
                      alt="Banner preview"
                      className="w-full max-h-36 rounded object-cover"
                    />
                  )
                ) : null}
              </div>

              <div className="rounded-md border border-gray-100 bg-gray-50 p-3 space-y-2">
                <Label className="text-xs text-gray-500 uppercase tracking-wide">
                  Call to action
                </Label>
                <div>
                  <Label className="text-xs">CTA type</Label>
                  <Select
                    value={form.cta_type}
                    onValueChange={(v) => setForm({ ...form, cta_type: v })}
                  >
                    <SelectTrigger>
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
                    <div>
                      <Label className="text-xs">Button label</Label>
                      <Input
                        value={form.cta_label}
                        onChange={(e) =>
                          setForm({ ...form, cta_label: e.target.value })
                        }
                        placeholder="Learn more"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">
                        {form.cta_type === "path"
                          ? "In-app path"
                          : "External URL"}
                      </Label>
                      <Input
                        value={form.cta_url}
                        onChange={(e) =>
                          setForm({ ...form, cta_url: e.target.value })
                        }
                        placeholder={
                          form.cta_type === "path"
                            ? "/student-dashboard/payments"
                            : "https://…"
                        }
                      />
                    </div>
                  </>
                ) : null}
              </div>

              <div className="rounded-md border border-gray-100 bg-gray-50 p-3 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-xs text-gray-500 uppercase tracking-wide">
                    Audience targeting
                  </Label>
                  <Users className="w-4 h-4 text-gray-400" />
                </div>
                <div>
                  <Label className="text-xs">Audience</Label>
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
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All students</SelectItem>
                      <SelectItem value="targeted">
                        Targeted (filters AND)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {target.mode === "targeted" ? (
                  <>
                    <p className="text-xs text-gray-500">
                      Non-empty filters are combined with AND. Leave a filter
                      empty to ignore it.
                    </p>

                    <div>
                      <Label className="text-xs">
                        Branches ({target.branch_ids.length})
                      </Label>
                      <div className="mt-1 max-h-28 overflow-y-auto rounded border border-gray-200 bg-white p-2 space-y-1">
                        {(options?.branches || []).length === 0 ? (
                          <p className="text-xs text-gray-400">No branches</p>
                        ) : (
                          (options?.branches || []).map((b) => (
                            <label
                              key={b.id}
                              className="flex items-center gap-2 text-sm cursor-pointer"
                            >
                              <Checkbox
                                checked={target.branch_ids.includes(b.id)}
                                onCheckedChange={(c) => {
                                  setPreviewCount(null)
                                  setTarget((prev) => ({
                                    ...prev,
                                    branch_ids: toggleId(
                                      prev.branch_ids,
                                      b.id,
                                      !!c
                                    ),
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
                      <Label className="text-xs">
                        Courses ({target.course_ids.length})
                      </Label>
                      <div className="mt-1 max-h-28 overflow-y-auto rounded border border-gray-200 bg-white p-2 space-y-1">
                        {(options?.courses || []).length === 0 ? (
                          <p className="text-xs text-gray-400">No courses</p>
                        ) : (
                          (options?.courses || []).map((c) => (
                            <label
                              key={c.id}
                              className="flex items-center gap-2 text-sm cursor-pointer"
                            >
                              <Checkbox
                                checked={target.course_ids.includes(c.id)}
                                onCheckedChange={(on) => {
                                  setPreviewCount(null)
                                  setTarget((prev) => ({
                                    ...prev,
                                    course_ids: toggleId(
                                      prev.course_ids,
                                      c.id,
                                      !!on
                                    ),
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
                      <Label className="text-xs">
                        Groups / batches ({target.group_ids.length})
                      </Label>
                      <div className="mt-1 max-h-24 overflow-y-auto rounded border border-gray-200 bg-white p-2 space-y-1">
                        {(options?.groups || []).length === 0 ? (
                          <p className="text-xs text-gray-400">
                            No batch groups found on students
                          </p>
                        ) : (
                          (options?.groups || []).map((g) => (
                            <label
                              key={g.id}
                              className="flex items-center gap-2 text-sm cursor-pointer"
                            >
                              <Checkbox
                                checked={target.group_ids.includes(g.id)}
                                onCheckedChange={(on) => {
                                  setPreviewCount(null)
                                  setTarget((prev) => ({
                                    ...prev,
                                    group_ids: toggleId(
                                      prev.group_ids,
                                      g.id,
                                      !!on
                                    ),
                                  }))
                                }}
                              />
                              <span className="truncate font-mono text-xs">
                                {g.name}
                              </span>
                            </label>
                          ))
                        )}
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs">
                        Specific students ({target.student_ids.length})
                      </Label>
                      <Input
                        className="mt-1 mb-1"
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        placeholder="Search name, phone, email…"
                      />
                      {target.student_ids.length > 0 ? (
                        <div className="flex flex-wrap gap-1 mb-1">
                          {target.student_ids.map((id) => (
                            <Badge
                              key={id}
                              variant="outline"
                              className="text-xs cursor-pointer"
                              onClick={() => {
                                setPreviewCount(null)
                                setTarget((prev) => ({
                                  ...prev,
                                  student_ids: prev.student_ids.filter(
                                    (x) => x !== id
                                  ),
                                }))
                              }}
                              title="Click to remove"
                            >
                              {selectedStudentLabels[id] || id.slice(0, 8)} ×
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                      <div className="max-h-28 overflow-y-auto rounded border border-gray-200 bg-white p-2 space-y-1">
                        {(options?.students || []).length === 0 ? (
                          <p className="text-xs text-gray-400">No students</p>
                        ) : (
                          (options?.students || []).map((s) => (
                            <label
                              key={s.id}
                              className="flex items-center gap-2 text-sm cursor-pointer"
                            >
                              <Checkbox
                                checked={target.student_ids.includes(s.id)}
                                onCheckedChange={(on) => {
                                  setPreviewCount(null)
                                  setTarget((prev) => ({
                                    ...prev,
                                    student_ids: toggleId(
                                      prev.student_ids,
                                      s.id,
                                      !!on
                                    ),
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
                                  <span className="text-xs text-gray-400 ml-1">
                                    {s.phone}
                                  </span>
                                ) : null}
                              </span>
                            </label>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-gray-500">
                    Every student can see this promotion when it is live.
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={previewing}
                    onClick={() => void handlePreview()}
                    className="gap-1"
                  >
                    {previewing ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Users className="w-3 h-3" />
                    )}
                    Preview audience
                  </Button>
                  {previewCount !== null ? (
                    <span className="text-xs text-[#4F5077] font-medium">
                      {previewCount} eligible
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Start</Label>
                  <Input
                    type="datetime-local"
                    value={form.start_at}
                    onChange={(e) =>
                      setForm({ ...form, start_at: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>End</Label>
                  <Input
                    type="datetime-local"
                    value={form.end_at}
                    onChange={(e) =>
                      setForm({ ...form, end_at: e.target.value })
                    }
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400 -mt-1">
                Leave blank for no schedule limit. Active + in-window = live.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => setForm({ ...form, status: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROMOTION_STATUSES.filter(
                        (s) => s.value !== "archived"
                      ).map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <Input
                    type="number"
                    value={form.priority}
                    onChange={(e) =>
                      setForm({ ...form, priority: e.target.value })
                    }
                  />
                  <p className="text-xs text-gray-400 mt-1">Lower = higher</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  disabled={saving || uploading}
                  onClick={() => void handleSave()}
                  className="gap-2 bg-[#FFB70F] hover:bg-[#e0a00d] text-black"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {editingId ? "Update" : "Create"}
                </Button>
                {editingId ? (
                  <Button type="button" variant="ghost" onClick={startCreate}>
                    Cancel
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-[#4F5077]">
                Promotions {loading ? "" : `(${promotions.length})`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-12 text-gray-400">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : promotions.length === 0 ? (
                <p className="text-sm text-gray-500 py-8 text-center">
                  No promotions yet. Create one with a banner and optional CTA.
                </p>
              ) : (
                <div className="space-y-2">
                  {promotions.map((p) => (
                    <div
                      key={p.id}
                      className="rounded-md border border-gray-100 bg-white px-3 py-3 flex flex-wrap gap-3"
                    >
                      {p.banner_url ? (
                        <div className="w-24 h-16 shrink-0 overflow-hidden rounded bg-gray-100">
                          {p.banner_media_type === "video" ? (
                            <video
                              src={p.banner_url}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={p.banner_url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-[#4F5077]">
                            {p.title}
                          </span>
                          <Badge
                            variant="outline"
                            className={
                              STATUS_CLASS[p.status || "draft"] ||
                              STATUS_CLASS.draft
                            }
                          >
                            {promotionStatusLabel(p.status)}
                          </Badge>
                          {p.is_live ? (
                            <Badge
                              variant="outline"
                              className="bg-emerald-50 text-emerald-800 border-emerald-200"
                            >
                              Live
                            </Badge>
                          ) : null}
                        </div>
                        <p className="text-xs text-gray-400 font-mono mt-0.5">
                          {p.slug}
                        </p>
                        {p.short_description ? (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {p.short_description}
                          </p>
                        ) : null}
                        <p className="text-xs text-gray-400 mt-1">
                          {[
                            p.cta_type && p.cta_type !== "none"
                              ? `CTA: ${p.cta_label || p.cta_type}`
                              : "No CTA",
                            p.start_at || p.end_at
                              ? `Schedule: ${p.start_at ? new Date(p.start_at).toLocaleDateString() : "…"} → ${p.end_at ? new Date(p.end_at).toLocaleDateString() : "…"}`
                              : "No date limit",
                            `Priority ${p.priority ?? 100}`,
                            targetLabel(p),
                          ].join(" · ")}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0 items-end">
                        {p.status !== "archived" ? (
                          <label className="flex items-center gap-2 text-xs text-gray-600">
                            <Switch
                              checked={p.status === "active"}
                              disabled={saving}
                              onCheckedChange={() => void toggleActive(p)}
                            />
                            Active
                          </label>
                        ) : null}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startEdit(p)}
                          >
                            Edit
                          </Button>
                          {p.status !== "archived" ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600"
                              disabled={saving}
                              onClick={() => void archive(p.id)}
                            >
                              Archive
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
