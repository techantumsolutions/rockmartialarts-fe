"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import { Loader2, Plus, Pencil, Trash2, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { TokenManager } from "@/lib/tokenManager"
import { getBackendApiUrl } from "@/lib/config"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"
import { uploadFile } from "@/lib/upload"

type AvailabilityType = "global" | "branch" | "course" | "branch_course"

type BranchCoursePair = {
  branch_id: string
  course_id: string
}

type Row = {
  id: string
  name: string
  description?: string | null
  file_url?: string | null
  status: string
  display_order: number
  availability_type: AvailabilityType
  branch_ids: string[]
  course_ids: string[]
  branch_course_pairs: BranchCoursePair[]
}

type BranchOption = { id: string; name: string }
type CourseOption = { id: string; name: string }

const emptyForm = {
  name: "",
  description: "",
  file_url: "",
  status: "inactive" as const,
  display_order: 0,
  availability_type: "global" as AvailabilityType,
  branch_ids: [] as string[],
  course_ids: [] as string[],
  branch_course_pairs: [] as BranchCoursePair[],
}

function availabilityLabel(row: Row, branches: BranchOption[], courses: CourseOption[]): string {
  switch (row.availability_type) {
    case "global":
      return "Global"
    case "branch":
      return row.branch_ids
        .map((id) => branches.find((b) => b.id === id)?.name || id)
        .join(", ") || "Branch"
    case "course":
      return row.course_ids
        .map((id) => courses.find((c) => c.id === id)?.name || id)
        .join(", ") || "Course"
    case "branch_course":
      return row.branch_course_pairs
        .map((p) => {
          const b = branches.find((x) => x.id === p.branch_id)?.name || p.branch_id
          const c = courses.find((x) => x.id === p.course_id)?.name || p.course_id
          return `${b} → ${c}`
        })
        .join("; ") || "Branch + Course"
    default:
      return "—"
  }
}

export default function RegistrationFormsPage() {
  const params = useParams()
  const adminType = ((params?.adminType as string) || "super-admin").toLowerCase().replace(/_/g, "-")
  const isSuperAdmin = adminType === "super-admin"
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<Row[]>([])
  const [branches, setBranches] = useState<BranchOption[]>([])
  const [courses, setCourses] = useState<CourseOption[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const bmManaged = BranchManagerAuth.getCurrentUser()?.managed_branches || []
  const branchOptions = isSuperAdmin
    ? branches
    : branches.filter((b) => bmManaged.includes(b.id))

  const load = useCallback(async () => {
    const token = TokenManager.getToken()
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch(getBackendApiUrl("registration-forms/manage"), {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      })
      if (!res.ok) throw new Error("Failed to load")
      const data = await res.json()
      setRows(Array.isArray(data.registration_forms) ? data.registration_forms : [])
    } catch {
      toast({ title: "Error", description: "Could not load registration forms", variant: "destructive" })
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const token = TokenManager.getToken()
    if (!token) return
    ;(async () => {
      try {
        const [branchRes, courseRes] = await Promise.all([
          fetch(getBackendApiUrl("branches?skip=0&limit=200"), {
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          }),
          fetch(getBackendApiUrl("courses?skip=0&limit=200"), {
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          }),
        ])
        if (branchRes.ok) {
          const data = await branchRes.json()
          const list = data.branches || []
          setBranches(
            list.map((b: { id: string; branch?: { name?: string; code?: string } }) => ({
              id: b.id,
              name: b.branch?.name || b.branch?.code || b.id,
            }))
          )
        }
        if (courseRes.ok) {
          const data = await courseRes.json()
          const list = data.courses || []
          setCourses(
            list.map((c: { id: string; title?: string; code?: string }) => ({
              id: c.id,
              name: c.title || c.code || c.id,
            }))
          )
        }
      } catch {
        /* ignore */
      }
    })()
  }, [])

  const openCreate = () => {
    setEditingId(null)
    setForm({
      ...emptyForm,
      availability_type: isSuperAdmin ? "global" : "branch",
      branch_ids: !isSuperAdmin && bmManaged[0] ? [bmManaged[0]] : [],
      branch_course_pairs: !isSuperAdmin && bmManaged[0]
        ? [{ branch_id: bmManaged[0], course_id: "" }]
        : [{ branch_id: "", course_id: "" }],
    })
    setDialogOpen(true)
  }

  const openEdit = (r: Row) => {
    setEditingId(r.id)
    setForm({
      name: r.name,
      description: r.description || "",
      file_url: r.file_url || "",
      status: r.status === "active" ? "active" : "inactive",
      display_order: r.display_order ?? 0,
      availability_type: r.availability_type,
      branch_ids: [...(r.branch_ids || [])],
      course_ids: [...(r.course_ids || [])],
      branch_course_pairs:
        r.branch_course_pairs?.length > 0
          ? r.branch_course_pairs.map((p) => ({ ...p }))
          : [{ branch_id: "", course_id: "" }],
    })
    setDialogOpen(true)
  }

  const toggleBranchId = (branchId: string, checked: boolean) => {
    setForm((f) => ({
      ...f,
      branch_ids: checked
        ? [...f.branch_ids, branchId]
        : f.branch_ids.filter((id) => id !== branchId),
    }))
  }

  const toggleCourseId = (courseId: string, checked: boolean) => {
    setForm((f) => ({
      ...f,
      course_ids: checked
        ? [...f.course_ids, courseId]
        : f.course_ids.filter((id) => id !== courseId),
    }))
  }

  const updatePair = (index: number, field: "branch_id" | "course_id", value: string) => {
    setForm((f) => {
      const pairs = [...f.branch_course_pairs]
      pairs[index] = { ...pairs[index], [field]: value }
      return { ...f, branch_course_pairs: pairs }
    })
  }

  const addPair = () => {
    setForm((f) => ({
      ...f,
      branch_course_pairs: [
        ...f.branch_course_pairs,
        { branch_id: !isSuperAdmin && bmManaged[0] ? bmManaged[0] : "", course_id: "" },
      ],
    }))
  }

  const removePair = (index: number) => {
    setForm((f) => ({
      ...f,
      branch_course_pairs: f.branch_course_pairs.filter((_, i) => i !== index),
    }))
  }

  const handlePdfUpload = async (file: File) => {
    if (file.type !== "application/pdf") {
      toast({ title: "Invalid file", description: "Please upload a PDF file", variant: "destructive" })
      return
    }
    setUploading(true)
    try {
      const result = await uploadFile(file)
      setForm((f) => ({ ...f, file_url: result.file_url }))
      toast({ title: "PDF uploaded" })
    } catch {
      toast({ title: "Upload failed", variant: "destructive" })
    } finally {
      setUploading(false)
    }
  }

  const save = async () => {
    const token = TokenManager.getToken()
    if (!token) return
    if (!form.name.trim()) {
      toast({ title: "Validation", description: "Form name is required", variant: "destructive" })
      return
    }
    if (form.status === "active" && !form.file_url.trim()) {
      toast({
        title: "Validation",
        description: "Upload a PDF before activating the form",
        variant: "destructive",
      })
      return
    }

    const pairs = form.branch_course_pairs.filter((p) => p.branch_id && p.course_id)

    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        file_url: form.file_url.trim() || null,
        status: form.status,
        display_order: Number(form.display_order) || 0,
        availability_type: isSuperAdmin ? form.availability_type : form.availability_type === "global" ? "branch" : form.availability_type,
        branch_ids: form.availability_type === "branch" ? form.branch_ids : [],
        course_ids: form.availability_type === "course" ? form.course_ids : [],
        branch_course_pairs: form.availability_type === "branch_course" ? pairs : [],
      }

      if (!isSuperAdmin) {
        body.availability_type = form.availability_type === "global" ? "branch" : form.availability_type
        if (body.availability_type === "branch") {
          body.branch_ids = form.branch_ids.filter((id) => bmManaged.includes(id))
        }
      }

      const url = editingId
        ? getBackendApiUrl(`registration-forms/${encodeURIComponent(editingId)}`)
        : getBackendApiUrl("registration-forms")
      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || "Save failed")
      }
      toast({ title: "Saved", description: editingId ? "Form updated" : "Form created" })
      setDialogOpen(false)
      load()
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Save failed",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm("Delete this registration form?")) return
    const token = TokenManager.getToken()
    if (!token) return
    try {
      const res = await fetch(getBackendApiUrl(`registration-forms/${encodeURIComponent(id)}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error("Delete failed")
      toast({ title: "Deleted" })
      load()
    } catch {
      toast({ title: "Error", description: "Delete failed", variant: "destructive" })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-10 h-10 animate-spin text-[#E1BB33]" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Registration forms</h1>
          <p className="text-gray-600 text-sm mt-1">
            Upload PDF registration forms and configure availability for students to download from their portal.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" /> Add form
        </Button>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left">
              <th className="p-3 font-medium">Name</th>
              <th className="p-3 font-medium">Availability</th>
              <th className="p-3 font-medium">PDF</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium w-24">Order</th>
              <th className="p-3 w-28" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50/80">
                <td className="p-3">
                  <p className="font-medium text-gray-900">{r.name}</p>
                  {r.description ? (
                    <p className="text-xs text-gray-500 truncate max-w-xs">{r.description}</p>
                  ) : null}
                </td>
                <td className="p-3 text-gray-600 max-w-xs">{availabilityLabel(r, branches, courses)}</td>
                <td className="p-3">
                  {r.file_url ? (
                    <span className="inline-flex items-center gap-1 text-green-700">
                      <FileText className="w-4 h-4" /> PDF
                    </span>
                  ) : (
                    <span className="text-amber-600">Missing</span>
                  )}
                </td>
                <td className="p-3 capitalize">{r.status}</td>
                <td className="p-3">{r.display_order}</td>
                <td className="p-3 flex gap-1">
                  <Button type="button" variant="ghost" size="icon" onClick={() => openEdit(r)} aria-label="Edit">
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" onClick={() => remove(r.id)} aria-label="Delete">
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-500">
                  No registration forms yet
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit registration form" : "New registration form"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Form name</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Registration form PDF</Label>
              <Input
                type="file"
                accept="application/pdf,.pdf"
                className="max-w-xs"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void handlePdfUpload(file)
                }}
              />
              {uploading ? (
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Uploading…
                </p>
              ) : form.file_url ? (
                <p className="text-xs text-green-700 flex items-center gap-1">
                  <FileText className="w-3 h-3" /> PDF uploaded
                </p>
              ) : (
                <p className="text-xs text-gray-500">Required before activation</p>
              )}
            </div>

            <div>
              <Label>Availability</Label>
              <Select
                value={form.availability_type}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    availability_type: v as AvailabilityType,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {isSuperAdmin ? <SelectItem value="global">Global (all students)</SelectItem> : null}
                  <SelectItem value="branch">Branch-wise</SelectItem>
                  {isSuperAdmin ? <SelectItem value="course">Course-wise</SelectItem> : null}
                  <SelectItem value="branch_course">Branch + course combination</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.availability_type === "branch" ? (
              <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-3">
                <Label>Select branches</Label>
                {branchOptions.map((b) => (
                  <label key={b.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={form.branch_ids.includes(b.id)}
                      onCheckedChange={(checked) => toggleBranchId(b.id, !!checked)}
                    />
                    {b.name}
                  </label>
                ))}
              </div>
            ) : null}

            {form.availability_type === "course" ? (
              <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-3">
                <Label>Select courses</Label>
                {courses.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={form.course_ids.includes(c.id)}
                      onCheckedChange={(checked) => toggleCourseId(c.id, !!checked)}
                    />
                    {c.name}
                  </label>
                ))}
              </div>
            ) : null}

            {form.availability_type === "branch_course" ? (
              <div className="space-y-3">
                <Label>Branch + course combinations</Label>
                {form.branch_course_pairs.map((pair, index) => (
                  <div key={index} className="flex flex-wrap gap-2 items-end">
                    <div className="flex-1 min-w-[120px]">
                      <Select
                        value={pair.branch_id}
                        onValueChange={(v) => updatePair(index, "branch_id", v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Branch" />
                        </SelectTrigger>
                        <SelectContent>
                          {branchOptions.map((b) => (
                            <SelectItem key={b.id} value={b.id}>
                              {b.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1 min-w-[120px]">
                      <Select
                        value={pair.course_id}
                        onValueChange={(v) => updatePair(index, "course_id", v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Course" />
                        </SelectTrigger>
                        <SelectContent>
                          {courses.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {form.branch_course_pairs.length > 1 ? (
                      <Button type="button" variant="ghost" size="sm" onClick={() => removePair(index)}>
                        Remove
                      </Button>
                    ) : null}
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addPair}>
                  Add combination
                </Button>
              </div>
            ) : null}

            <div className="flex items-center gap-3">
              <Label className="shrink-0">Active</Label>
              <Switch
                checked={form.status === "active"}
                onCheckedChange={(v) => setForm((f) => ({ ...f, status: v ? "active" : "inactive" }))}
                disabled={!form.file_url.trim()}
              />
              {!form.file_url.trim() ? (
                <span className="text-xs text-gray-500">Upload PDF to activate</span>
              ) : null}
            </div>
            <div>
              <Label>Display order</Label>
              <Input
                type="number"
                value={form.display_order}
                onChange={(e) =>
                  setForm((f) => ({ ...f, display_order: parseInt(e.target.value, 10) || 0 }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={save} disabled={saving || uploading}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
