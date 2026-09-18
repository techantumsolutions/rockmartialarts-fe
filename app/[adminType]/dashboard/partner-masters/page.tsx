"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Loader2,
  Plus,
  Save,
  Trash2,
  Upload,
  Users,
  Pencil,
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
  has_masters?: boolean
  masters_count?: number
}

type PartnerMaster = {
  id: string
  branch_id: string
  name: string
  designation?: string | null
  photo_url?: string | null
  biography?: string | null
  experience_years?: number | null
  experience_summary?: string | null
  specializations?: string[]
  achievements?: string[]
  display_order?: number
  is_active?: boolean
}

const EMPTY_FORM = {
  name: "",
  designation: "",
  photo_url: "",
  biography: "",
  experience_years: "",
  experience_summary: "",
  specializations: "",
  achievements: "",
  display_order: "100",
  is_active: true,
}

function str(v: unknown): string {
  return v == null ? "" : String(v)
}

function linesToList(text: string): string[] {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
}

function listToLines(list: unknown): string {
  if (!Array.isArray(list)) return ""
  return list.map((x) => String(x)).join("\n")
}

function resolveMediaUrl(path: string): string {
  if (!path) return ""
  if (path.startsWith("http://") || path.startsWith("https://")) return path
  return path.startsWith("/") ? path : `/${path}`
}

export default function PartnerMastersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const basePath = useDashboardBasePath()
  const { toast } = useToast()

  const [partners, setPartners] = useState<PartnerBranchRow[]>([])
  const [branchId, setBranchId] = useState("")
  const [branchName, setBranchName] = useState("")
  const [masters, setMasters] = useState<PartnerMaster[]>([])
  const [includeInactive, setIncludeInactive] = useState(false)
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

  const loadMasters = useCallback(
    async (id: string) => {
      if (!id) return
      try {
        setLoading(true)
        const q = includeInactive ? "?include_inactive=true" : ""
        const res = await fetch(
          getBackendApiUrl(`collaboration-partners/branches/${id}/masters${q}`),
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
        if (!res.ok) throw new Error("Failed to load masters")
        const data = await res.json()
        setMasters(data.masters || [])
        setBranchName(data.branch_snapshot?.name || "")
      } catch (e: any) {
        toast({
          title: "Error",
          description: e?.message || "Could not load masters",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    },
    [includeInactive, toast]
  )

  useEffect(() => {
    loadPartners()
  }, [loadPartners])

  useEffect(() => {
    const fromQuery = searchParams?.get("branchId") || ""
    if (fromQuery && !branchId) setBranchId(fromQuery)
  }, [searchParams, branchId])

  useEffect(() => {
    if (branchId) loadMasters(branchId)
    else {
      setMasters([])
      setBranchName("")
    }
  }, [branchId, loadMasters])

  function openCreate() {
    setEditingId(null)
    setForm({ ...EMPTY_FORM })
    setDialogOpen(true)
  }

  function openEdit(m: PartnerMaster) {
    setEditingId(m.id)
    setForm({
      name: str(m.name),
      designation: str(m.designation),
      photo_url: str(m.photo_url),
      biography: str(m.biography),
      experience_years:
        m.experience_years == null ? "" : String(m.experience_years),
      experience_summary: str(m.experience_summary),
      specializations: listToLines(m.specializations),
      achievements: listToLines(m.achievements),
      display_order: String(m.display_order ?? 100),
      is_active: m.is_active !== false,
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
    if (!form.name.trim()) {
      toast({
        title: "Name required",
        description: "Enter the master/expert name.",
        variant: "destructive",
      })
      return
    }
    try {
      setSaving(true)
      const years =
        form.experience_years.trim() === ""
          ? null
          : Number(form.experience_years)
      const body = {
        name: form.name.trim(),
        designation: form.designation.trim() || null,
        photo_url: form.photo_url || null,
        clear_photo: editingId ? !form.photo_url : undefined,
        biography: form.biography.trim() || null,
        experience_years:
          years == null || Number.isNaN(years) ? null : years,
        experience_summary: form.experience_summary.trim() || null,
        specializations: linesToList(form.specializations),
        achievements: linesToList(form.achievements),
        display_order: Number(form.display_order) || 100,
        is_active: form.is_active,
      }

      const url = editingId
        ? getBackendApiUrl(
            `collaboration-partners/branches/${branchId}/masters/${editingId}`
          )
        : getBackendApiUrl(
            `collaboration-partners/branches/${branchId}/masters`
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
          ? "Master/expert updated for this branch only."
          : "Master/expert created for this branch only.",
      })
      setDialogOpen(false)
      await loadMasters(branchId)
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

  async function handleDeactivate(m: PartnerMaster) {
    if (!branchId) return
    if (!confirm(`Deactivate ${m.name}? They can be shown again via Include inactive.`)) {
      return
    }
    try {
      const res = await fetch(
        getBackendApiUrl(
          `collaboration-partners/branches/${branchId}/masters/${m.id}`
        ),
        { method: "DELETE", headers: authHeaders() }
      )
      if (!res.ok) throw new Error("Deactivate failed")
      toast({ title: "Deactivated", description: `${m.name} is now inactive.` })
      await loadMasters(branchId)
      await loadPartners()
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message || "Could not deactivate",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-1 rounded-md bg-amber-50 border border-amber-200 p-2">
            <Users className="w-5 h-5 text-amber-800" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[#1a2332]">
              Partner Masters / Experts
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Manage masters and experts for a collaboration partner branch only.
              Separate from global Champions.
            </p>
          </div>
        </div>
        <Button
          onClick={openCreate}
          disabled={!branchId}
          className="bg-[#FFC403] text-[#1a2332] hover:bg-[#e6b003]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add master
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
            <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
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
                        {typeof p.masters_count === "number"
                          ? ` — ${p.masters_count} master${p.masters_count === 1 ? "" : "s"}`
                          : ""}
                      </SelectItem>
                    ))}
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
              Showing masters for <span className="font-medium">{branchName}</span>{" "}
              only
            </p>
          )}
        </CardContent>
      </Card>

      {branchId && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Masters ({masters.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12 text-sm text-gray-500">
                <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading…
              </div>
            ) : masters.length === 0 ? (
              <div className="rounded-md border border-dashed bg-gray-50 px-4 py-10 text-center text-sm text-gray-600">
                No masters yet for this partner branch.
                <div className="mt-3">
                  <Button variant="outline" size="sm" onClick={openCreate}>
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Add first master
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {masters.map((m) => (
                  <div
                    key={m.id}
                    className="flex flex-col sm:flex-row gap-3 sm:items-start justify-between rounded-md border border-gray-100 bg-white p-3"
                  >
                    <div className="flex gap-3 min-w-0">
                      <div className="w-14 h-14 rounded-md bg-gray-100 border overflow-hidden shrink-0 flex items-center justify-center">
                        {m.photo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={resolveMediaUrl(m.photo_url)}
                            alt={m.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Users className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-sm text-[#1a2332]">
                            {m.name}
                          </span>
                          {m.is_active === false && (
                            <Badge variant="outline" className="text-[10px]">
                              Inactive
                            </Badge>
                          )}
                          {m.designation && (
                            <span className="text-xs text-gray-500">
                              {m.designation}
                            </span>
                          )}
                        </div>
                        {m.experience_years != null && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {m.experience_years} years experience
                            {m.experience_summary
                              ? ` — ${m.experience_summary}`
                              : ""}
                          </p>
                        )}
                        {(m.specializations || []).length > 0 && (
                          <p className="text-xs text-gray-500 mt-1 truncate">
                            {(m.specializations || []).join(" · ")}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(m)}
                      >
                        <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                      </Button>
                      {m.is_active !== false && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDeactivate(m)}
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
              {editingId ? "Edit master / expert" : "Add master / expert"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-2">
              <Label>Photo</Label>
              {form.photo_url ? (
                <div className="w-24 h-24 rounded-md border overflow-hidden bg-gray-50">
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
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Designation</Label>
              <Input
                value={form.designation}
                onChange={(e) =>
                  setForm({ ...form, designation: e.target.value })
                }
                placeholder="e.g. Head Coach, Master Instructor"
              />
            </div>
            <div className="space-y-2">
              <Label>Biography</Label>
              <Textarea
                rows={4}
                value={form.biography}
                onChange={(e) => setForm({ ...form, biography: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Experience (years)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  value={form.experience_years}
                  onChange={(e) =>
                    setForm({ ...form, experience_years: e.target.value })
                  }
                />
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
            <div className="space-y-2">
              <Label>Experience summary</Label>
              <Input
                value={form.experience_summary}
                onChange={(e) =>
                  setForm({ ...form, experience_summary: e.target.value })
                }
                placeholder="Short experience highlight"
              />
            </div>
            <div className="space-y-2">
              <Label>Specializations (one per line)</Label>
              <Textarea
                rows={3}
                value={form.specializations}
                onChange={(e) =>
                  setForm({ ...form, specializations: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Achievements (one per line)</Label>
              <Textarea
                rows={3}
                value={form.achievements}
                onChange={(e) =>
                  setForm({ ...form, achievements: e.target.value })
                }
              />
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
