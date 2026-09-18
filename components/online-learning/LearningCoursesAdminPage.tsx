"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Loader2, Plus, RefreshCw, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import {
  LEARNING_COURSE_STATUSES,
  learningCourseAPI,
  learningStatusLabel,
  type LearningCourse,
} from "@/lib/learningCourseAPI"

const EMPTY_FORM = {
  title: "",
  slug: "",
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

export default function LearningCoursesAdminPage() {
  const params = useParams()
  const adminType = String(params?.adminType || "superadmin")
  const { toast } = useToast()
  const [courses, setCourses] = useState<LearningCourse[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })

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
    load()
  }, [load])

  const startCreate = () => {
    setEditingId(null)
    setForm({ ...EMPTY_FORM })
  }

  const startEdit = (c: LearningCourse) => {
    setEditingId(c.id)
    setForm({
      title: c.title || "",
      slug: c.slug || "",
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
    })
  }

  const save = async () => {
    if (!form.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        slug: form.slug.trim() || undefined,
        short_description: form.short_description.trim() || undefined,
        description: form.description.trim() || undefined,
        thumbnail_url: form.thumbnail_url.trim() || undefined,
        trailer_url: form.trailer_url.trim() || undefined,
        difficulty: form.difficulty.trim() || undefined,
        language: form.language.trim() || undefined,
        estimated_hours: form.estimated_hours
          ? parseFloat(form.estimated_hours)
          : null,
        status: form.status,
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
        startCreate()
      }
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
    setSaving(true)
    try {
      await learningCourseAPI.archive(id)
      toast({ title: "Course archived" })
      if (editingId === id) startCreate()
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

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Online learning courses</h1>
            <p className="text-sm text-gray-600">
              Catalogue for online courses (separate from branch academy classes).
            </p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => void load()} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              type="button"
              className="bg-yellow-400 hover:bg-yellow-500 text-white"
              onClick={startCreate}
            >
              <Plus className="w-4 h-4 mr-2" />
              New course
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">
                {editingId ? "Edit course" : "Create course"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label>Title *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Karate Fundamentals Online"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Slug</Label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  placeholder="auto from title if empty"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Short description</Label>
                <Input
                  value={form.short_description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, short_description: e.target.value }))
                  }
                  placeholder="One-line summary"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Full description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label>Difficulty</Label>
                  <Input
                    value={form.difficulty}
                    onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Language</Label>
                  <Input
                    value={form.language}
                    onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label>Est. hours</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.estimated_hours}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, estimated_hours: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Sort order</Label>
                  <Input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEARNING_COURSE_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Thumbnail URL</Label>
                <Input
                  value={form.thumbnail_url}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, thumbnail_url: e.target.value }))
                  }
                  placeholder="https://…"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Trailer URL (marketing)</Label>
                <Input
                  value={form.trailer_url}
                  onChange={(e) => setForm((f) => ({ ...f, trailer_url: e.target.value }))}
                  placeholder="Optional public trailer"
                />
              </div>
              <div className="space-y-1.5">
                <Label>SEO title</Label>
                <Input
                  value={form.seo_title}
                  onChange={(e) => setForm((f) => ({ ...f, seo_title: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>SEO description</Label>
                <Textarea
                  value={form.seo_description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, seo_description: e.target.value }))
                  }
                  rows={2}
                />
              </div>
              <Button
                type="button"
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-white"
                disabled={saving}
                onClick={() => void save()}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {editingId ? "Update course" : "Create course"}
              </Button>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardHeader className="pb-2 space-y-3">
              <CardTitle className="text-lg">Courses</CardTitle>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  placeholder="Search…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1"
                />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {LEARNING_COURSE_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
              {loading ? (
                <p className="text-sm text-gray-500 py-8 text-center">Loading…</p>
              ) : courses.length === 0 ? (
                <p className="text-sm text-gray-500 py-8 text-center">No courses yet.</p>
              ) : (
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-100 text-gray-700">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Title</th>
                        <th className="px-3 py-2 font-semibold">Status</th>
                        <th className="px-3 py-2 font-semibold">Order</th>
                        <th className="px-3 py-2 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courses.map((c) => (
                        <tr key={c.id} className="border-t hover:bg-gray-50/80">
                          <td className="px-3 py-2">
                            <div className="font-medium">{c.title}</div>
                            <div className="text-xs text-gray-500">/{c.slug}</div>
                            {c.difficulty ? (
                              <div className="text-xs text-gray-400">{c.difficulty}</div>
                            ) : null}
                          </td>
                          <td className="px-3 py-2">
                            <Badge
                              variant="outline"
                              className={`text-xs ${STATUS_CLASS[c.status || ""] || ""}`}
                            >
                              {learningStatusLabel(c.status)}
                            </Badge>
                          </td>
                          <td className="px-3 py-2">{c.sort_order ?? "—"}</td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => startEdit(c)}
                              >
                                Edit
                              </Button>
                              <Button type="button" size="sm" variant="outline" asChild>
                                <Link
                                  href={`/${adminType}/dashboard/online-learning/courses/${c.id}/curriculum`}
                                >
                                  Curriculum
                                </Link>
                              </Button>
                              {c.status !== "archived" ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={saving}
                                  onClick={() => void archive(c.id)}
                                >
                                  Archive
                                </Button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
