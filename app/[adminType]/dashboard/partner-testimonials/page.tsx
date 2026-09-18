"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Loader2,
  MessageSquareQuote,
  Pencil,
  Plus,
  Save,
  Trash2,
  Upload,
} from "lucide-react"
import { getBackendApiUrl } from "@/lib/config"
import { TokenManager } from "@/lib/tokenManager"
import { uploadFile } from "@/lib/upload"
import { useDashboardBasePath } from "@/lib/useDashboardBasePath"
import { useToast } from "@/hooks/use-toast"
import { PartnerCmsScopeBanner } from "@/components/partner/PartnerCmsScopeBanner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type PartnerBranchRow = {
  branch_id: string
  branch_name?: string
  branch_code?: string
  testimonials_count?: number
}

type PartnerTestimonial = {
  id: string
  branch_id: string
  person_name: string
  person_role?: string
  related_student_name?: string | null
  photo_url?: string | null
  testimonial_text: string
  rating?: number | null
  status?: string
  display_order?: number
  is_active?: boolean
}

const EMPTY_FORM = {
  person_name: "",
  person_role: "student",
  related_student_name: "",
  photo_url: "",
  testimonial_text: "",
  rating: "5",
  status: "draft",
  display_order: "100",
  is_active: true,
}

function str(v: unknown): string {
  return v == null ? "" : String(v)
}

function resolveMediaUrl(path: string): string {
  if (!path) return ""
  if (path.startsWith("http://") || path.startsWith("https://")) return path
  return path.startsWith("/") ? path : `/${path}`
}

const STATUS_CLASS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 border-gray-200",
  published: "bg-green-50 text-green-800 border-green-200",
  unpublished: "bg-amber-50 text-amber-800 border-amber-200",
}

export default function PartnerTestimonialsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const basePath = useDashboardBasePath()
  const { toast } = useToast()

  const [partners, setPartners] = useState<PartnerBranchRow[]>([])
  const [branchId, setBranchId] = useState("")
  const [branchName, setBranchName] = useState("")
  const [rows, setRows] = useState<PartnerTestimonial[]>([])
  const [includeInactive, setIncludeInactive] = useState(false)
  const [statusFilter, setStatusFilter] = useState("all")
  const [loadingList, setLoadingList] = useState(true)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })

  function authHeaders(): HeadersInit {
    const token = TokenManager.getToken()
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }
  }

  const loadPartners = useCallback(async () => {
    const token = TokenManager.getToken()
    if (!token) {
      router.push("/login")
      return
    }
    try {
      setLoadingList(true)
      const res = await fetch(
        getBackendApiUrl("collaboration-partners/partner-branches?limit=200"),
        { headers: authHeaders() }
      )
      if (!res.ok) throw new Error("Failed to load partner branches")
      const data = await res.json()
      setPartners(data.partners || [])
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message || "Could not load partners",
        variant: "destructive",
      })
    } finally {
      setLoadingList(false)
    }
  }, [router, toast])

  const loadRows = useCallback(
    async (id: string) => {
      if (!id) return
      try {
        setLoading(true)
        const params = new URLSearchParams()
        if (includeInactive) params.set("include_inactive", "true")
        if (statusFilter !== "all") params.set("status", statusFilter)
        const q = params.toString() ? `?${params}` : ""
        const res = await fetch(
          getBackendApiUrl(
            `collaboration-partners/branches/${id}/testimonials${q}`
          ),
          { headers: authHeaders() }
        )
        if (res.status === 403) {
          toast({
            title: "Not a collaboration partner",
            description: "Enable Is Collaboration Partner on the branch first.",
            variant: "destructive",
          })
          setBranchId("")
          return
        }
        if (!res.ok) throw new Error("Failed to load testimonials")
        const data = await res.json()
        setRows(data.testimonials || [])
        setBranchName(data.branch_snapshot?.name || "")
      } catch (e: any) {
        toast({
          title: "Error",
          description: e?.message || "Could not load testimonials",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    },
    [includeInactive, statusFilter, toast]
  )

  useEffect(() => {
    loadPartners()
  }, [loadPartners])

  useEffect(() => {
    const fromQuery = searchParams?.get("branchId") || ""
    if (fromQuery && !branchId) setBranchId(fromQuery)
  }, [searchParams, branchId])

  useEffect(() => {
    if (branchId) loadRows(branchId)
    else {
      setRows([])
      setBranchName("")
    }
  }, [branchId, loadRows])

  function openCreate() {
    setEditingId(null)
    setForm({ ...EMPTY_FORM })
    setDialogOpen(true)
  }

  function openEdit(row: PartnerTestimonial) {
    setEditingId(row.id)
    setForm({
      person_name: str(row.person_name),
      person_role: str(row.person_role) || "student",
      related_student_name: str(row.related_student_name),
      photo_url: str(row.photo_url),
      testimonial_text: str(row.testimonial_text),
      rating: row.rating == null ? "" : String(row.rating),
      status: str(row.status) || "draft",
      display_order: String(row.display_order ?? 100),
      is_active: row.is_active !== false,
    })
    setDialogOpen(true)
  }

  async function handleUpload(file: File | undefined) {
    if (!file) return
    try {
      setUploading(true)
      const result = await uploadFile(file)
      setForm((prev) => ({ ...prev, photo_url: result.file_url }))
      toast({ title: "Uploaded", description: "Photo uploaded." })
    } catch (e: any) {
      toast({
        title: "Upload failed",
        description: e?.message || "Could not upload photo",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  async function handleSave() {
    if (!branchId) return
    if (!form.person_name.trim() || !form.testimonial_text.trim()) {
      toast({
        title: "Required fields",
        description: "Name and testimonial text are required.",
        variant: "destructive",
      })
      return
    }
    try {
      setSaving(true)
      const rating =
        form.rating.trim() === "" ? null : Number(form.rating)
      const body: Record<string, unknown> = {
        person_name: form.person_name.trim(),
        person_role: form.person_role,
        related_student_name: form.related_student_name.trim() || null,
        photo_url: form.photo_url || null,
        testimonial_text: form.testimonial_text.trim(),
        rating: rating == null || Number.isNaN(rating) ? null : rating,
        status: form.status,
        display_order: Number(form.display_order) || 100,
        is_active: form.is_active,
      }
      if (editingId) {
        body.clear_photo = !form.photo_url
        body.clear_rating = form.rating.trim() === ""
      }

      const url = editingId
        ? getBackendApiUrl(
            `collaboration-partners/branches/${branchId}/testimonials/${editingId}`
          )
        : getBackendApiUrl(
            `collaboration-partners/branches/${branchId}/testimonials`
          )
      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: authHeaders(),
        body: JSON.stringify(body),
      })
      if (res.status === 403) {
        toast({
          title: "Partner features disabled",
          description: "This branch is not marked as a collaboration partner.",
          variant: "destructive",
        })
        return
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(
          typeof err.detail === "string" ? err.detail : "Save failed"
        )
      }
      toast({
        title: "Saved",
        description: editingId
          ? "Testimonial updated for this partner branch only."
          : "Testimonial created for this partner branch only.",
      })
      setDialogOpen(false)
      await loadRows(branchId)
      await loadPartners()
    } catch (e: any) {
      toast({
        title: "Save failed",
        description: e?.message || "Could not save",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleDeactivate(row: PartnerTestimonial) {
    if (!branchId) return
    if (!confirm(`Deactivate testimonial from ${row.person_name}?`)) return
    try {
      const res = await fetch(
        getBackendApiUrl(
          `collaboration-partners/branches/${branchId}/testimonials/${row.id}`
        ),
        { method: "DELETE", headers: authHeaders() }
      )
      if (!res.ok) throw new Error("Deactivate failed")
      toast({ title: "Deactivated", description: "Testimonial is now inactive." })
      await loadRows(branchId)
      await loadPartners()
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message || "Could not deactivate",
        variant: "destructive",
      })
    }
  }

  async function quickPublish(row: PartnerTestimonial, publish: boolean) {
    if (!branchId) return
    try {
      const res = await fetch(
        getBackendApiUrl(
          `collaboration-partners/branches/${branchId}/testimonials/${row.id}`
        ),
        {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify({ publish }),
        }
      )
      if (!res.ok) throw new Error("Update failed")
      toast({
        title: publish ? "Published" : "Unpublished",
        description: publish
          ? "Visible on the partner public page."
          : "Hidden from the public page.",
      })
      await loadRows(branchId)
      await loadPartners()
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message || "Could not update status",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-1 rounded-md bg-amber-50 border border-amber-200 p-2">
            <MessageSquareQuote className="w-5 h-5 text-amber-800" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[#1a2332]">
              Partner Testimonials
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Student and parent testimonials for a collaboration partner branch
              only. Separate from global Student Testimonials.
            </p>
          </div>
        </div>
        <Button
          onClick={openCreate}
          disabled={!branchId}
          className="bg-[#FFC403] text-[#1a2332] hover:bg-[#e6b003]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add testimonial
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Partner branch</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loadingList ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading partner branches…
            </div>
          ) : partners.length === 0 ? (
            <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-600">
              No collaboration partner branches yet. Set{" "}
              <span className="font-medium">Is Collaboration Partner</span> to Yes
              first.
              <div className="mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`${basePath}/branches`)}
                >
                  Go to Branches
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4 sm:items-end flex-wrap">
              <div className="space-y-2 flex-1 max-w-md">
                <Label>Select partner branch</Label>
                <Select value={branchId || undefined} onValueChange={setBranchId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a partner branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {partners.map((p) => (
                      <SelectItem key={p.branch_id} value={p.branch_id}>
                        {p.branch_name || "Branch"}
                        {p.branch_code ? ` (${p.branch_code})` : ""}
                        {typeof p.testimonials_count === "number"
                          ? ` — ${p.testimonials_count} published`
                          : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 w-40">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="unpublished">Unpublished</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pb-1">
                <Switch
                  checked={includeInactive}
                  onCheckedChange={(c) => setIncludeInactive(!!c)}
                />
                <span className="text-xs text-gray-600">Include inactive</span>
              </div>
            </div>
          )}
          {branchId && branchName && (
            <p className="text-xs text-gray-500">
              Showing testimonials for{" "}
              <span className="font-medium">{branchName}</span> only
            </p>
          )}
        </CardContent>
      </Card>

      {branchId && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Testimonials ({rows.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12 text-sm text-gray-500">
                <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading…
              </div>
            ) : rows.length === 0 ? (
              <div className="rounded-md border border-dashed bg-gray-50 px-4 py-10 text-center text-sm text-gray-600">
                No testimonials yet for this partner branch.
                <div className="mt-3">
                  <Button variant="outline" size="sm" onClick={openCreate}>
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Add first testimonial
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {rows.map((row) => (
                  <div
                    key={row.id}
                    className="flex flex-col sm:flex-row gap-3 sm:items-start justify-between rounded-md border border-gray-100 bg-white p-3"
                  >
                    <div className="flex gap-3 min-w-0">
                      <div className="w-14 h-14 rounded-full bg-gray-100 border overflow-hidden shrink-0 flex items-center justify-center">
                        {row.photo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={resolveMediaUrl(row.photo_url)}
                            alt={row.person_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <MessageSquareQuote className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-sm text-[#1a2332]">
                            {row.person_name}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${STATUS_CLASS[row.status || "draft"] || ""}`}
                          >
                            {row.status || "draft"}
                          </Badge>
                          {row.is_active === false && (
                            <Badge variant="outline" className="text-[10px]">
                              Inactive
                            </Badge>
                          )}
                          <span className="text-xs text-gray-500 capitalize">
                            {(row.person_role || "student").replace("_", " ")}
                            {row.related_student_name
                              ? ` · of ${row.related_student_name}`
                              : ""}
                          </span>
                          {row.rating != null && (
                            <span className="text-xs text-amber-700">
                              ★ {row.rating}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {row.testimonial_text}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 flex-wrap">
                      {row.status !== "published" ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => quickPublish(row, true)}
                        >
                          Publish
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => quickPublish(row, false)}
                        >
                          Unpublish
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(row)}
                      >
                        <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                      </Button>
                      {row.is_active !== false && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDeactivate(row)}
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" /> Deactivate
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit testimonial" : "Add testimonial"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-2">
              <Label>Photo</Label>
              {form.photo_url ? (
                <div className="w-20 h-20 rounded-full border overflow-hidden bg-gray-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolveMediaUrl(form.photo_url)}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : null}
              <div className="flex gap-2">
                <label className="inline-flex">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleUpload(e.target.files?.[0])}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    asChild
                    disabled={uploading}
                  >
                    <span>
                      {uploading ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5 mr-1.5" />
                      )}
                      Upload photo
                    </span>
                  </Button>
                </label>
                {form.photo_url && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setForm({ ...form, photo_url: "" })}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={form.person_name}
                onChange={(e) =>
                  setForm({ ...form, person_name: e.target.value })
                }
                placeholder="Student or parent name"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={form.person_role}
                  onValueChange={(v) => setForm({ ...form, person_role: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="parent">Parent</SelectItem>
                    <SelectItem value="guardian">Guardian</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Rating (0–5)</Label>
                <Input
                  type="number"
                  min={0}
                  max={5}
                  step={0.5}
                  value={form.rating}
                  onChange={(e) => setForm({ ...form, rating: e.target.value })}
                />
              </div>
            </div>
            {(form.person_role === "parent" ||
              form.person_role === "guardian") && (
              <div className="space-y-2">
                <Label>Related student name</Label>
                <Input
                  value={form.related_student_name}
                  onChange={(e) =>
                    setForm({ ...form, related_student_name: e.target.value })
                  }
                  placeholder="Child / student name"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Testimonial *</Label>
              <Textarea
                rows={4}
                value={form.testimonial_text}
                onChange={(e) =>
                  setForm({ ...form, testimonial_text: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="unpublished">Unpublished</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Display order</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.display_order}
                  onChange={(e) =>
                    setForm({ ...form, display_order: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md border bg-gray-50 px-3 py-2">
              <span className="text-sm">Active</span>
              <Switch
                checked={form.is_active}
                onCheckedChange={(c) => setForm({ ...form, is_active: !!c })}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-[#FFC403] text-[#1a2332] hover:bg-[#e6b003]"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
