"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
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

type Row = {
  id: string
  student_name: string
  student_photo?: string | null
  achievement_title: string
  description?: string | null
  image?: string | null
  branch_id?: string | null
  course_id?: string | null
  is_global: boolean
  status: string
  display_order: number
}

const emptyForm: Omit<Row, "id"> = {
  student_name: "",
  student_photo: "",
  achievement_title: "",
  description: "",
  image: "",
  branch_id: "",
  course_id: "",
  is_global: false,
  status: "active",
  display_order: 0,
}

export default function ManageShowcaseAchievementsPage() {
  const params = useParams()
  const adminType = ((params?.adminType as string) || "super-admin").toLowerCase().replace(/_/g, "-")
  const isSuperAdmin = adminType === "super-admin"
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<Row[]>([])
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([])
  const [courses, setCourses] = useState<{ id: string; name: string }[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const bmManaged = BranchManagerAuth.getCurrentUser()?.managed_branches || []

  const branchNameById = (id?: string | null) => {
    if (!id) return "—"
    return branches.find((b) => b.id === id)?.name || id
  }

  const courseNameById = (id?: string | null) => {
    if (!id) return "—"
    return courses.find((c) => c.id === id)?.name || id
  }

  const load = useCallback(async () => {
    const token = TokenManager.getToken()
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch(getBackendApiUrl("showcase-achievements/manage"), {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      })
      if (!res.ok) throw new Error("Failed to load")
      const data = await res.json()
      setRows(Array.isArray(data.achievements) ? data.achievements : [])
    } catch {
      toast({ title: "Error", description: "Could not load achievements", variant: "destructive" })
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch(getBackendApiUrl("courses/public/all"), { cache: "no-store" })
        if (!res.ok) return
        const data = await res.json()
        const list = data.courses || []
        setCourses(
          list.map((c: { id: string; title?: string; name?: string; code?: string }) => ({
            id: c.id,
            name: (c.title || c.name || c.code || c.id) as string,
          }))
        )
      } catch {
        /* ignore */
      }
    })()
  }, [])

  useEffect(() => {
    if (!isSuperAdmin) return
    const token = TokenManager.getToken()
    if (!token) return
    ;(async () => {
      try {
        const res = await fetch(getBackendApiUrl("branches?skip=0&limit=200"), {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        })
        if (!res.ok) return
        const data = await res.json()
        const list = data.branches || []
        setBranches(
          list.map((b: { id: string; branch?: { name?: string; code?: string } }) => ({
            id: b.id,
            name: b.branch?.name || b.branch?.code || b.id,
          }))
        )
      } catch {
        /* ignore */
      }
    })()
  }, [isSuperAdmin])

  const openCreate = () => {
    setEditingId(null)
    setForm({
      ...emptyForm,
      branch_id: !isSuperAdmin && bmManaged[0] ? bmManaged[0] : "",
      is_global: false,
    })
    setDialogOpen(true)
  }

  const openEdit = (r: Row) => {
    setEditingId(r.id)
    setForm({
      student_name: r.student_name,
      student_photo: r.student_photo || "",
      achievement_title: r.achievement_title,
      description: r.description || "",
      image: r.image || "",
      branch_id: r.branch_id || "",
      course_id: r.course_id || "",
      is_global: r.is_global,
      status: r.status,
      display_order: r.display_order ?? 0,
    })
    setDialogOpen(true)
  }

  const save = async () => {
    const token = TokenManager.getToken()
    if (!token) return
    if (!form.student_name.trim() || !form.achievement_title.trim()) {
      toast({ title: "Validation", description: "Student name and title are required", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        student_name: form.student_name.trim(),
        student_photo: form.student_photo?.trim() || null,
        achievement_title: form.achievement_title.trim(),
        description: form.description?.trim() || null,
        image: form.image?.trim() || null,
        branch_id: form.branch_id?.trim() || null,
        course_id: form.course_id?.trim() || null,
        is_global: isSuperAdmin ? form.is_global : false,
        status: form.status,
        display_order: Number(form.display_order) || 0,
      }
      if (!isSuperAdmin) {
        body.branch_id = bmManaged[0] || form.branch_id
        body.is_global = false
      }
      if (editingId) {
        const res = await fetch(getBackendApiUrl(`showcase-achievements/${encodeURIComponent(editingId)}`), {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error("Update failed")
      } else {
        const res = await fetch(getBackendApiUrl("showcase-achievements"), {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error("Create failed")
      }
      toast({ title: "Saved", description: editingId ? "Achievement updated" : "Achievement created" })
      setDialogOpen(false)
      load()
    } catch {
      toast({ title: "Error", description: "Save failed", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm("Delete this achievement?")) return
    const token = TokenManager.getToken()
    if (!token) return
    try {
      const res = await fetch(getBackendApiUrl(`showcase-achievements/${encodeURIComponent(id)}`), {
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
          <h1 className="text-2xl font-bold text-gray-900">Student achievements (showcase)</h1>
          <p className="text-gray-600 text-sm mt-1">
            Marketing highlights in MongoDB — home, branch, and course pages (separate from per-student records).
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" /> Add
        </Button>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left">
              <th className="p-3 font-medium">Student</th>
              <th className="p-3 font-medium">Title</th>
              <th className="p-3 font-medium">Scope</th>
              <th className="p-3 font-medium">Course</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 w-28" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50/80">
                <td className="p-3 font-medium text-gray-900">{r.student_name}</td>
                <td className="p-3 text-gray-700 max-w-[200px] truncate">{r.achievement_title}</td>
                <td className="p-3">{r.is_global ? "Global" : branchNameById(r.branch_id)}</td>
                <td className="p-3 text-gray-700 max-w-[160px] truncate" title={courseNameById(r.course_id)}>
                  {courseNameById(r.course_id)}
                </td>
                <td className="p-3 capitalize">{r.status}</td>
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
                  No showcase achievements yet
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit achievement" : "New achievement"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <Label>Student name</Label>
              <Input
                value={form.student_name}
                onChange={(e) => setForm((f) => ({ ...f, student_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Student photo URL</Label>
              <Input
                value={form.student_photo || ""}
                onChange={(e) => setForm((f) => ({ ...f, student_photo: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Achievement title</Label>
              <Input
                value={form.achievement_title}
                onChange={(e) => setForm((f) => ({ ...f, achievement_title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                rows={3}
                value={form.description || ""}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Image URL</Label>
              <Input value={form.image || ""} onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Course (optional — course detail page)</Label>
              <Select
                value={form.course_id || "__none__"}
                onValueChange={(v) => setForm((f) => ({ ...f, course_id: v === "__none__" ? "" : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isSuperAdmin ? (
              <>
                <div className="flex items-center gap-3">
                  <Switch checked={form.is_global} onCheckedChange={(v) => setForm((f) => ({ ...f, is_global: v }))} />
                  <Label>Global</Label>
                </div>
                {!form.is_global ? (
                  <div className="space-y-2">
                    <Label>Branch</Label>
                    <Select
                      value={form.branch_id || ""}
                      onValueChange={(v) => setForm((f) => ({ ...f, branch_id: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select branch" />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-gray-500">Branch: {bmManaged[0] || "—"}</p>
            )}
            <div className="flex items-center gap-3">
              <Label className="shrink-0">Active</Label>
              <Switch
                checked={form.status === "active"}
                onCheckedChange={(v) => setForm((f) => ({ ...f, status: v ? "active" : "inactive" }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Display order</Label>
              <Input
                type="number"
                value={form.display_order}
                onChange={(e) => setForm((f) => ({ ...f, display_order: parseInt(e.target.value, 10) || 0 }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
