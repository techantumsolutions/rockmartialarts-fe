"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Video,
} from "lucide-react"
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
  formatDuration,
  learningCourseAPI,
  learningStatusLabel,
  type LearningCourse,
  type LearningLesson,
  type LearningLevel,
} from "@/lib/learningCourseAPI"

const STATUS_CLASS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 border-gray-200",
  published: "bg-green-50 text-green-800 border-green-200",
  archived: "bg-red-50 text-red-800 border-red-200",
}

type LevelForm = {
  title: string
  description: string
  status: string
}

type LessonForm = {
  title: string
  description: string
  status: string
  video_url: string
  duration_seconds: string
  is_preview: boolean
}

const EMPTY_LEVEL: LevelForm = {
  title: "",
  description: "",
  status: "published",
}

const EMPTY_LESSON: LessonForm = {
  title: "",
  description: "",
  status: "published",
  video_url: "",
  duration_seconds: "",
  is_preview: false,
}

export default function LearningCurriculumAdminPage() {
  const params = useParams()
  const courseId = String(params?.courseId || "")
  const adminType = String(params?.adminType || "superadmin")
  const { toast } = useToast()

  const [course, setCourse] = useState<LearningCourse | null>(null)
  const [levels, setLevels] = useState<LearningLevel[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const [levelForm, setLevelForm] = useState<LevelForm>({ ...EMPTY_LEVEL })
  const [editingLevelId, setEditingLevelId] = useState<string | null>(null)

  const [lessonForm, setLessonForm] = useState<LessonForm>({ ...EMPTY_LESSON })
  const [lessonLevelId, setLessonLevelId] = useState<string | null>(null)
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null)

  const backHref = `/${adminType}/dashboard/online-learning/courses`

  const load = useCallback(async () => {
    if (!courseId) return
    setLoading(true)
    setError(null)
    try {
      const [courseRes, levelsRes] = await Promise.all([
        learningCourseAPI.getAdmin(courseId),
        learningCourseAPI.listLevels(courseId),
      ])
      setCourse(courseRes.course)
      setLevels(levelsRes.levels || [])
      setExpanded((prev) => {
        const next = { ...prev }
        for (const lv of levelsRes.levels || []) {
          if (next[lv.id] === undefined) next[lv.id] = true
        }
        return next
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load curriculum")
    } finally {
      setLoading(false)
    }
  }, [courseId])

  useEffect(() => {
    load()
  }, [load])

  const resetLevelForm = () => {
    setEditingLevelId(null)
    setLevelForm({ ...EMPTY_LEVEL })
  }

  const resetLessonForm = () => {
    setEditingLessonId(null)
    setLessonLevelId(null)
    setLessonForm({ ...EMPTY_LESSON })
  }

  const startEditLevel = (lv: LearningLevel) => {
    setEditingLevelId(lv.id)
    setLevelForm({
      title: lv.title || "",
      description: lv.description || "",
      status: lv.status || "published",
    })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const startAddLesson = (levelId: string) => {
    setLessonLevelId(levelId)
    setEditingLessonId(null)
    setLessonForm({ ...EMPTY_LESSON })
    setExpanded((p) => ({ ...p, [levelId]: true }))
  }

  const startEditLesson = (levelId: string, les: LearningLesson) => {
    setLessonLevelId(levelId)
    setEditingLessonId(les.id)
    setLessonForm({
      title: les.title || "",
      description: les.description || "",
      status: les.status || "published",
      video_url: les.video_url || "",
      duration_seconds:
        les.duration_seconds != null ? String(les.duration_seconds) : "",
      is_preview: Boolean(les.is_preview),
    })
    setExpanded((p) => ({ ...p, [levelId]: true }))
  }

  const saveLevel = async () => {
    if (!levelForm.title.trim()) {
      toast({ title: "Title required", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      if (editingLevelId) {
        await learningCourseAPI.updateLevel(courseId, editingLevelId, {
          title: levelForm.title.trim(),
          description: levelForm.description.trim() || undefined,
          status: levelForm.status,
        })
        toast({ title: "Level updated" })
      } else {
        await learningCourseAPI.createLevel(courseId, {
          title: levelForm.title.trim(),
          description: levelForm.description.trim() || undefined,
          status: levelForm.status,
        })
        toast({ title: "Level created" })
      }
      resetLevelForm()
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

  const archiveLevel = async (levelId: string) => {
    if (!confirm("Archive this level and all its lessons?")) return
    setSaving(true)
    try {
      await learningCourseAPI.archiveLevel(courseId, levelId)
      toast({ title: "Level archived" })
      if (editingLevelId === levelId) resetLevelForm()
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

  const moveLevel = async (index: number, dir: -1 | 1) => {
    const active = levels.filter((l) => l.status !== "archived")
    const next = index + dir
    if (next < 0 || next >= active.length) return
    const ordered = active.map((l) => l.id)
    ;[ordered[index], ordered[next]] = [ordered[next], ordered[index]]
    setSaving(true)
    try {
      const res = await learningCourseAPI.reorderLevels(courseId, ordered)
      setLevels(res.levels || [])
      toast({ title: "Level order updated" })
    } catch (e) {
      toast({
        title: "Reorder failed",
        description: e instanceof Error ? e.message : "Error",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const saveLesson = async () => {
    if (!lessonLevelId) return
    if (!lessonForm.title.trim()) {
      toast({ title: "Lesson title required", variant: "destructive" })
      return
    }
    const duration =
      lessonForm.duration_seconds.trim() === ""
        ? null
        : Number(lessonForm.duration_seconds)
    if (
      duration != null &&
      (!Number.isFinite(duration) || duration < 0)
    ) {
      toast({ title: "Invalid duration", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const payload = {
        title: lessonForm.title.trim(),
        description: lessonForm.description.trim() || undefined,
        status: lessonForm.status,
        video_url: lessonForm.video_url.trim() || undefined,
        duration_seconds: duration,
        is_preview: lessonForm.is_preview,
      }
      if (editingLessonId) {
        await learningCourseAPI.updateLesson(
          courseId,
          lessonLevelId,
          editingLessonId,
          payload
        )
        toast({ title: "Lesson updated" })
      } else {
        await learningCourseAPI.createLesson(courseId, lessonLevelId, payload)
        toast({ title: "Lesson created" })
      }
      resetLessonForm()
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

  const archiveLesson = async (levelId: string, lessonId: string) => {
    if (!confirm("Archive this lesson?")) return
    setSaving(true)
    try {
      await learningCourseAPI.archiveLesson(courseId, levelId, lessonId)
      toast({ title: "Lesson archived" })
      if (editingLessonId === lessonId) resetLessonForm()
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

  const moveLesson = async (
    levelId: string,
    lessons: LearningLesson[],
    index: number,
    dir: -1 | 1
  ) => {
    const next = index + dir
    if (next < 0 || next >= lessons.length) return
    const ordered = lessons.map((l) => l.id)
    ;[ordered[index], ordered[next]] = [ordered[next], ordered[index]]
    setSaving(true)
    try {
      await learningCourseAPI.reorderLessons(courseId, levelId, ordered)
      toast({ title: "Lesson order updated" })
      await load()
    } catch (e) {
      toast({
        title: "Reorder failed",
        description: e instanceof Error ? e.message : "Error",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const activeLevels = levels.filter((l) => l.status !== "archived")
  const archivedLevels = levels.filter((l) => l.status === "archived")

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to courses
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Curriculum</h1>
          <p className="text-sm text-gray-500 mt-1">
            {course
              ? `${course.title} — manage levels, lessons, and video sources`
              : "Load course curriculum"}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void load()}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin mr-1" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-1" />
          )}
          Refresh
        </Button>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
          {error}
        </div>
      ) : null}

      {loading && !course ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {editingLevelId ? "Edit level" : "Add level"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label htmlFor="lv-title">Title</Label>
                  <Input
                    id="lv-title"
                    value={levelForm.title}
                    onChange={(e) =>
                      setLevelForm((f) => ({ ...f, title: e.target.value }))
                    }
                    placeholder="e.g. Foundations"
                  />
                </div>
                <div>
                  <Label htmlFor="lv-desc">Description</Label>
                  <Textarea
                    id="lv-desc"
                    rows={3}
                    value={levelForm.description}
                    onChange={(e) =>
                      setLevelForm((f) => ({
                        ...f,
                        description: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select
                    value={levelForm.status}
                    onValueChange={(v) =>
                      setLevelForm((f) => ({ ...f, status: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LEARNING_COURSE_STATUSES.filter(
                        (s) => s.value !== "archived"
                      ).map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    type="button"
                    disabled={saving}
                    onClick={() => void saveLevel()}
                    className="bg-[#FFB70F] hover:bg-[#e0a00d] text-black"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    ) : (
                      <Save className="w-4 h-4 mr-1" />
                    )}
                    {editingLevelId ? "Update level" : "Add level"}
                  </Button>
                  {editingLevelId ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={resetLevelForm}
                    >
                      Cancel
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            {lessonLevelId ? (
              <Card className="border-[#FFB70F]/40">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Video className="w-4 h-4 text-[#FFB70F]" />
                    {editingLessonId ? "Edit lesson" : "Add lesson"}
                  </CardTitle>
                  <p className="text-xs text-gray-500">
                    Level:{" "}
                    {levels.find((l) => l.id === lessonLevelId)?.title || "—"}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label htmlFor="les-title">Title</Label>
                    <Input
                      id="les-title"
                      value={lessonForm.title}
                      onChange={(e) =>
                        setLessonForm((f) => ({ ...f, title: e.target.value }))
                      }
                      placeholder="e.g. Stance basics"
                    />
                  </div>
                  <div>
                    <Label htmlFor="les-desc">Description</Label>
                    <Textarea
                      id="les-desc"
                      rows={2}
                      value={lessonForm.description}
                      onChange={(e) =>
                        setLessonForm((f) => ({
                          ...f,
                          description: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="les-video">Video URL (admin only)</Label>
                    <Input
                      id="les-video"
                      value={lessonForm.video_url}
                      onChange={(e) =>
                        setLessonForm((f) => ({
                          ...f,
                          video_url: e.target.value,
                        }))
                      }
                      placeholder="https://… (not shown publicly yet)"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Stored for admins; public stream unlocks with entitlement
                      later.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="les-dur">Duration (seconds)</Label>
                      <Input
                        id="les-dur"
                        type="number"
                        min={0}
                        value={lessonForm.duration_seconds}
                        onChange={(e) =>
                          setLessonForm((f) => ({
                            ...f,
                            duration_seconds: e.target.value,
                          }))
                        }
                        placeholder="e.g. 600"
                      />
                    </div>
                    <div>
                      <Label>Status</Label>
                      <Select
                        value={lessonForm.status}
                        onValueChange={(v) =>
                          setLessonForm((f) => ({ ...f, status: v }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LEARNING_COURSE_STATUSES.filter(
                            (s) => s.value !== "archived"
                          ).map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={lessonForm.is_preview}
                      onChange={(e) =>
                        setLessonForm((f) => ({
                          ...f,
                          is_preview: e.target.checked,
                        }))
                      }
                      className="rounded border-gray-300"
                    />
                    Free preview lesson
                  </label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      type="button"
                      disabled={saving}
                      onClick={() => void saveLesson()}
                      className="bg-[#FFB70F] hover:bg-[#e0a00d] text-black"
                    >
                      {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-1" />
                      ) : (
                        <Save className="w-4 h-4 mr-1" />
                      )}
                      {editingLessonId ? "Update lesson" : "Add lesson"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={resetLessonForm}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </div>

          <div className="lg:col-span-3 space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Levels & lessons
                  <span className="ml-2 text-sm font-normal text-gray-400">
                    {activeLevels.length} levels ·{" "}
                    {activeLevels.reduce(
                      (n, l) =>
                        n +
                        (l.lessons || []).filter((x) => x.status !== "archived")
                          .length,
                      0
                    )}{" "}
                    lessons
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activeLevels.length === 0 ? (
                  <p className="text-sm text-gray-500 py-8 text-center">
                    No levels yet. Add a level to start building the curriculum.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {activeLevels.map((lv, idx) => {
                      const lessons = (lv.lessons || []).filter(
                        (x) => x.status !== "archived"
                      )
                      const isOpen = expanded[lv.id] !== false
                      return (
                        <li
                          key={lv.id}
                          className="rounded-lg border border-gray-200 bg-white overflow-hidden"
                        >
                          <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 border-b border-gray-100">
                            <button
                              type="button"
                              className="p-0.5 text-gray-500 hover:text-gray-800"
                              onClick={() =>
                                setExpanded((p) => ({
                                  ...p,
                                  [lv.id]: !isOpen,
                                }))
                              }
                              aria-label={isOpen ? "Collapse" : "Expand"}
                            >
                              {isOpen ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium text-gray-900 truncate">
                                  {lv.title}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${STATUS_CLASS[lv.status || ""] || ""}`}
                                >
                                  {learningStatusLabel(lv.status)}
                                </Badge>
                                <span className="text-xs text-gray-400">
                                  {lessons.length} lesson
                                  {lessons.length === 1 ? "" : "s"}
                                </span>
                              </div>
                              {lv.description ? (
                                <p className="text-xs text-gray-500 truncate mt-0.5">
                                  {lv.description}
                                </p>
                              ) : null}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                disabled={saving || idx === 0}
                                onClick={() => void moveLevel(idx, -1)}
                                title="Move up"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                disabled={
                                  saving || idx === activeLevels.length - 1
                                }
                                onClick={() => void moveLevel(idx, 1)}
                                title="Move down"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => startEditLevel(lv)}
                              >
                                Edit
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => startAddLesson(lv.id)}
                              >
                                <Plus className="w-3.5 h-3.5 mr-1" />
                                Lesson
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={saving}
                                onClick={() => void archiveLevel(lv.id)}
                              >
                                Archive
                              </Button>
                            </div>
                          </div>
                          {isOpen ? (
                            <ul className="divide-y divide-gray-100">
                              {lessons.length === 0 ? (
                                <li className="px-4 py-3 text-sm text-gray-400">
                                  No lessons in this level.
                                </li>
                              ) : (
                                lessons.map((les, li) => (
                                  <li
                                    key={les.id}
                                    className="flex items-start gap-2 px-4 py-2.5 hover:bg-gray-50/80"
                                  >
                                    <div className="flex-1 min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-sm font-medium text-gray-800">
                                          {les.title}
                                        </span>
                                        <Badge
                                          variant="outline"
                                          className={`text-xs ${STATUS_CLASS[les.status || ""] || ""}`}
                                        >
                                          {learningStatusLabel(les.status)}
                                        </Badge>
                                        {les.is_preview ? (
                                          <Badge
                                            variant="outline"
                                            className="text-xs bg-amber-50 text-amber-800 border-amber-200"
                                          >
                                            Preview
                                          </Badge>
                                        ) : null}
                                        {les.video_url || les.has_video ? (
                                          <span className="text-xs text-green-700 flex items-center gap-0.5">
                                            <Video className="w-3 h-3" />
                                            Video
                                          </span>
                                        ) : (
                                          <span className="text-xs text-gray-400">
                                            No video
                                          </span>
                                        )}
                                        {formatDuration(les.duration_seconds) ? (
                                          <span className="text-xs text-gray-400">
                                            {formatDuration(les.duration_seconds)}
                                          </span>
                                        ) : null}
                                      </div>
                                      {les.description ? (
                                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                                          {les.description}
                                        </p>
                                      ) : null}
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7"
                                        disabled={saving || li === 0}
                                        onClick={() =>
                                          void moveLesson(
                                            lv.id,
                                            lessons,
                                            li,
                                            -1
                                          )
                                        }
                                      >
                                        <ArrowUp className="w-3 h-3" />
                                      </Button>
                                      <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7"
                                        disabled={
                                          saving || li === lessons.length - 1
                                        }
                                        onClick={() =>
                                          void moveLesson(
                                            lv.id,
                                            lessons,
                                            li,
                                            1
                                          )
                                        }
                                      >
                                        <ArrowDown className="w-3 h-3" />
                                      </Button>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 text-xs"
                                        onClick={() =>
                                          startEditLesson(lv.id, les)
                                        }
                                      >
                                        Edit
                                      </Button>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 text-xs"
                                        disabled={saving}
                                        onClick={() =>
                                          void archiveLesson(lv.id, les.id)
                                        }
                                      >
                                        Archive
                                      </Button>
                                    </div>
                                  </li>
                                ))
                              )}
                            </ul>
                          ) : null}
                        </li>
                      )
                    })}
                  </ul>
                )}

                {archivedLevels.length > 0 ? (
                  <p className="text-xs text-gray-400 mt-4">
                    {archivedLevels.length} archived level
                    {archivedLevels.length === 1 ? "" : "s"} hidden from active
                    list.
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
