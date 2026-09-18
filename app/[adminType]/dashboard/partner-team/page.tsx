"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
  Upload,
  UserCog,
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
  team_count?: number
}

type TeamMember = {
  id: string
  branch_id: string
  name: string
  designation?: string | null
  role?: string | null
  photo_url?: string | null
  contact_email?: string | null
  contact_phone?: string | null
  contact_approved?: boolean
  bio?: string | null
  display_order?: number
  is_active?: boolean
}

const EMPTY_FORM = {
  name: "",
  designation: "",
  role: "",
  photo_url: "",
  contact_email: "",
  contact_phone: "",
  contact_approved: false,
  bio: "",
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

export default function PartnerTeamPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const basePath = useDashboardBasePath()
  const { toast } = useToast()

  const [partners, setPartners] = useState<PartnerBranchRow[]>([])
  const [branchId, setBranchId] = useState("")
  const [branchName, setBranchName] = useState("")
  const [members, setMembers] = useState<TeamMember[]>([])
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

  const loadMembers = useCallback(
    async (id: string) => {
      if (!id) return
      try {
        setLoading(true)
        const q = includeInactive ? "?include_inactive=true" : ""
        const res = await fetch(
          getBackendApiUrl(`collaboration-partners/branches/${id}/team${q}`),
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
        if (!res.ok) throw new Error("Failed to load team")
        const data = await res.json()
        setMembers(data.members || [])
        setBranchName(data.branch_snapshot?.name || "")
      } catch (e: any) {
        toast({
          title: "Error",
          description: e?.message || "Could not load team",
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
    if (branchId) loadMembers(branchId)
    else {
      setMembers([])
      setBranchName("")
    }
  }, [branchId, loadMembers])

  function openCreate() {
    setEditingId(null)
    setForm({ ...EMPTY_FORM })
    setDialogOpen(true)
  }

  function openEdit(m: TeamMember) {
    setEditingId(m.id)
    setForm({
      name: str(m.name),
      designation: str(m.designation),
      role: str(m.role),
      photo_url: str(m.photo_url),
      contact_email: str(m.contact_email),
      contact_phone: str(m.contact_phone),
      contact_approved: !!m.contact_approved,
      bio: str(m.bio),
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
        description: "Enter the team member name.",
        variant: "destructive",
      })
      return
    }
    try {
      setSaving(true)
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        designation: form.designation.trim() || null,
        role: form.role.trim() || null,
        photo_url: form.photo_url || null,
        contact_email: form.contact_email.trim() || null,
        contact_phone: form.contact_phone.trim() || null,
        contact_approved: form.contact_approved,
        bio: form.bio.trim() || null,
        display_order: Number(form.display_order) || 100,
        is_active: form.is_active,
      }
      if (editingId) {
        body.clear_photo = !form.photo_url
        body.clear_contact_email = !form.contact_email.trim()
        body.clear_contact_phone = !form.contact_phone.trim()
      }

      const url = editingId
        ? getBackendApiUrl(
            `collaboration-partners/branches/${branchId}/team/${editingId}`
          )
        : getBackendApiUrl(`collaboration-partners/branches/${branchId}/team`)
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
          ? "Team member updated for this partner branch only."
          : "Team member added for this partner branch only.",
      })
      setDialogOpen(false)
      await loadMembers(branchId)
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

  async function handleDeactivate(m: TeamMember) {
    if (!branchId) return
    if (!confirm(`Deactivate ${m.name}?`)) return
    try {
      const res = await fetch(
        getBackendApiUrl(
          `collaboration-partners/branches/${branchId}/team/${m.id}`
        ),
        { method: "DELETE", headers: authHeaders() }
      )
      if (!res.ok) throw new Error("Deactivate failed")
      toast({ title: "Deactivated", description: `${m.name} is now inactive.` })
      await loadMembers(branchId)
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
            <UserCog className="w-5 h-5 text-amber-800" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[#1a2332]">
              Partner Team
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Staff directory for a collaboration partner branch only. Separate
              from Coaches and Masters/Experts. Contact shows publicly only when
              approved.
            </p>
          </div>
        </div>
        <Button
          onClick={openCreate}
          disabled={!branchId}
          className="bg-[#FFC403] text-[#1a2332] hover:bg-[#e6b003]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add member
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
                        {typeof p.team_count === "number"
                          ? ` — ${p.team_count} member${p.team_count === 1 ? "" : "s"}`
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
              Showing team for <span className="font-medium">{branchName}</span> only
            </p>
          )}
        </CardContent>
      </Card>

      {branchId && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Team members ({members.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12 text-sm text-gray-500">
                <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading…
              </div>
            ) : members.length === 0 ? (
              <div className="rounded-md border border-dashed bg-gray-50 px-4 py-10 text-center text-sm text-gray-600">
                No team members yet for this partner branch.
                <div className="mt-3">
                  <Button variant="outline" size="sm" onClick={openCreate}>
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Add first member
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {members.map((m) => (
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
                          <UserCog className="w-5 h-5 text-gray-400" />
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
                          {m.contact_approved && (
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-green-50 text-green-800 border-green-200"
                            >
                              Contact approved
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {[m.designation, m.role].filter(Boolean).join(" · ") ||
                            "—"}
                        </p>
                        {(m.contact_email || m.contact_phone) && (
                          <p className="text-xs text-gray-500 mt-1">
                            {[m.contact_phone, m.contact_email]
                              .filter(Boolean)
                              .join(" · ")}
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
              {editingId ? "Edit team member" : "Add team member"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-2">
              <Label>Photo</Label>
              {form.photo_url ? (
                <div className="w-20 h-20 rounded-md border overflow-hidden bg-gray-50">
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Designation</Label>
                <Input
                  value={form.designation}
                  onChange={(e) =>
                    setForm({ ...form, designation: e.target.value })
                  }
                  placeholder="e.g. Branch Manager"
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Input
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  placeholder="e.g. Front desk"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Short bio</Label>
              <Textarea
                rows={2}
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Contact phone</Label>
                <Input
                  value={form.contact_phone}
                  onChange={(e) =>
                    setForm({ ...form, contact_phone: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Contact email</Label>
                <Input
                  type="email"
                  value={form.contact_email}
                  onChange={(e) =>
                    setForm({ ...form, contact_email: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md border bg-amber-50/50 px-3 py-2">
              <div>
                <p className="text-sm font-medium">Approve contact for public</p>
                <p className="text-xs text-gray-500">
                  Only approved contact details appear on public partner pages.
                </p>
              </div>
              <Switch
                checked={form.contact_approved}
                onCheckedChange={(c) =>
                  setForm({ ...form, contact_approved: !!c })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
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
              <div className="flex items-center justify-between rounded-md border bg-gray-50 px-3 py-2 mt-6">
                <span className="text-sm">Active</span>
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(c) => setForm({ ...form, is_active: !!c })}
                />
              </div>
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
