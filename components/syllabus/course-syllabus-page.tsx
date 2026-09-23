"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import {
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Upload,
  CheckCircle2,
  Ban,
  Eye,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { TokenManager } from "@/lib/tokenManager"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"
import { getBackendApiUrl } from "@/lib/config"
import { syllabusAPI, type CourseSyllabus } from "@/lib/syllabusAPI"
import { useDashboardBasePath } from "@/lib/useDashboardBasePath"

type CourseOpt = { id: string; name: string }

function authHeaders(): HeadersInit {
  const token = BranchManagerAuth.getToken() || TokenManager.getToken()
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
}

function fmtBytes(n: number) {
  if (!n) return "—"
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export default function CourseSyllabusPage() {
  const router = useRouter()
  const basePath = useDashboardBasePath()
  const isBranchAdmin = basePath.includes("branch-admin")

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [courses, setCourses] = useState<CourseOpt[]>([])
  const [rows, setRows] = useState<CourseSyllabus[]>([])
  const [filterCourse, setFilterCourse] = useState("all")

  const [dialogOpen, setDialogOpen] = useState(false)
  const [mode, setMode] = useState<"upload" | "replace">("upload")
  const [replaceTarget, setReplaceTarget] = useState<CourseSyllabus | null>(null)
  const [courseId, setCourseId] = useState("")
  const [title, setTitle] = useState("")
  const [notes, setNotes] = useState("")
  const [activate, setActivate] = useState(true)
  const [file, setFile] = useState<File | null>(null)

  const ensureAuth = () => {
    const token = BranchManagerAuth.getToken() || TokenManager.getToken()
    if (!token) {
      router.push(isBranchAdmin ? "/branch-manager/login" : "/superadmin/login")
      return false
    }
    return true
  }

  const load = useCallback(async () => {
    if (!ensureAuth()) return
    setLoading(true)
    try {
      const [syllabusRes, courseRes] = await Promise.all([
        syllabusAPI.list({
          course_id: filterCourse !== "all" ? filterCourse : undefined,
        }),
        fetch(getBackendApiUrl("courses"), { headers: authHeaders(), cache: "no-store" }),
      ])
      setRows(syllabusRes.syllabi || [])
      if (courseRes.ok) {
        const data = await courseRes.json()
        setCourses(
          (data.courses || data || []).map((c: any) => ({
            id: c.id,
            name: c.title || c.name || c.id,
          }))
        )
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load syllabi")
    } finally {
      setLoading(false)
    }
  }, [filterCourse, isBranchAdmin, router])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => rows, [rows])

  const openUpload = () => {
    setMode("upload")
    setReplaceTarget(null)
    setCourseId(filterCourse !== "all" ? filterCourse : "")
    setTitle("")
    setNotes("")
    setActivate(true)
    setFile(null)
    setDialogOpen(true)
  }

  const openReplace = (row: CourseSyllabus) => {
    setMode("replace")
    setReplaceTarget(row)
    setCourseId(row.course_id)
    setTitle("")
    setNotes(row.notes || "")
    setActivate(true)
    setFile(null)
    setDialogOpen(true)
  }

  const submit = async () => {
    if (!file) {
      toast.error("Choose a PDF file")
      return
    }
    if (file.type && file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Only PDF files are allowed")
      return
    }
    if (mode === "upload" && !courseId) {
      toast.error("Select a course")
      return
    }
    try {
      setSaving(true)
      if (mode === "replace" && replaceTarget) {
        await syllabusAPI.replace(replaceTarget.id, {
          file,
          title: title.trim() || undefined,
          notes: notes.trim() || undefined,
          activate,
        })
        toast.success("Syllabus replaced with a new version")
      } else {
        await syllabusAPI.create({
          course_id: courseId,
          file,
          title: title.trim() || undefined,
          notes: notes.trim() || undefined,
          activate,
        })
        toast.success("Syllabus uploaded")
      }
      setDialogOpen(false)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (row: CourseSyllabus) => {
    try {
      if (row.is_active) {
        await syllabusAPI.deactivate(row.id)
        toast.success("Syllabus deactivated")
      } else {
        await syllabusAPI.activate(row.id)
        toast.success("Syllabus activated (others for this course deactivated)")
      }
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Status update failed")
    }
  }

  const openFile = async (row: CourseSyllabus) => {
    try {
      const token = BranchManagerAuth.getToken() || TokenManager.getToken()
      const res = await fetch(syllabusAPI.fileUrl(row.id), {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error("Could not open PDF")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      window.open(url, "_blank", "noopener,noreferrer")
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Open failed")
    }
  }

  if (loading) {
    return (
      <main className="w-full p-8 flex items-center justify-center text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Loading syllabi…
      </main>
    )
  }

  return (
    <main className="w-full p-4 lg:px-8 mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-600" />
            Course Syllabus
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Upload and version PDF syllabi per course. Only one syllabus can be active per course.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void load()}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={openUpload}>
            <Plus className="h-4 w-4 mr-1" />
            Upload syllabus
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filter</CardTitle>
        </CardHeader>
        <CardContent className="max-w-md">
          <Label className="text-xs text-slate-600">Course</Label>
          <Select value={filterCourse} onValueChange={setFilterCourse}>
            <SelectTrigger>
              <SelectValue placeholder="All courses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All courses</SelectItem>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Syllabi{" "}
            <span className="text-slate-500 font-normal text-sm">({filtered.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-center py-12 text-slate-500">
              No syllabi yet. Upload a PDF and assign it to a course.
            </p>
          ) : (
            <div className="space-y-2">
              {filtered.map((row) => (
                <div
                  key={row.id}
                  className="rounded-lg border px-3 py-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-slate-900 truncate">
                        {row.title || row.original_filename}
                      </p>
                      <Badge variant="outline">v{row.version}</Badge>
                      {row.is_active ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                          Active
                        </Badge>
                      ) : (
                        <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-600">
                      {row.course_name ||
                        courses.find((c) => c.id === row.course_id)?.name ||
                        row.course_id}
                    </p>
                    <p className="text-xs text-slate-500">
                      {row.original_filename} · {fmtBytes(row.size_bytes)}
                      {row.uploaded_by_name ? ` · ${row.uploaded_by_name}` : ""}
                      {row.created_at
                        ? ` · ${format(new Date(row.created_at), "dd MMM yyyy")}`
                        : ""}
                      {row.superseded_at ? " · superseded" : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => void openFile(row)}>
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openReplace(row)}>
                      <Upload className="h-4 w-4 mr-1" />
                      Replace
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void toggleActive(row)}
                    >
                      {row.is_active ? (
                        <>
                          <Ban className="h-4 w-4 mr-1" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Activate
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {mode === "replace" ? "Replace syllabus (new version)" : "Upload syllabus"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            {mode === "upload" ? (
              <div className="space-y-1.5">
                <Label>Course</Label>
                <Select value={courseId || "none"} onValueChange={(v) => setCourseId(v === "none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select course" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select course</SelectItem>
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <p className="text-sm text-slate-600">
                Replacing for{" "}
                <span className="font-medium">
                  {replaceTarget?.course_name || replaceTarget?.course_id}
                </span>{" "}
                (current v{replaceTarget?.version}). Previous PDF is kept in history.
              </p>
            )}
            <div className="space-y-1.5">
              <Label>Title (optional)</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Q3 2026 syllabus"
              />
            </div>
            <div className="space-y-1.5">
              <Label>PDF file</Label>
              <Input
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-slate-500">PDF only, max 20 MB. Stored privately.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <Switch checked={activate} onCheckedChange={setActivate} />
              Activate immediately (deactivates other versions for this course)
            </label>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={saving}
              onClick={() => void submit()}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              {mode === "replace" ? "Upload new version" : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
