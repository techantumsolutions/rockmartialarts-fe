"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ArrowDown,
  ArrowUp,
  Images,
  Loader2,
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
  gallery_count?: number
}

type GalleryItem = {
  id: string
  branch_id: string
  media_type?: string
  media_url?: string | null
  thumbnail_url?: string | null
  video_url?: string | null
  caption?: string | null
  display_order?: number
  is_active?: boolean
}

const EMPTY_FORM = {
  media_type: "image" as "image" | "video",
  media_url: "",
  thumbnail_url: "",
  video_url: "",
  caption: "",
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

export default function PartnerGalleryPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const basePath = useDashboardBasePath()
  const { toast } = useToast()

  const [partners, setPartners] = useState<PartnerBranchRow[]>([])
  const [branchId, setBranchId] = useState("")
  const [branchName, setBranchName] = useState("")
  const [items, setItems] = useState<GalleryItem[]>([])
  const [includeInactive, setIncludeInactive] = useState(false)
  const [loadingList, setLoadingList] = useState(true)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<"media" | "thumb" | null>(null)
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

  const loadItems = useCallback(
    async (id: string) => {
      if (!id) return
      try {
        setLoading(true)
        const q = includeInactive ? "?include_inactive=true" : ""
        const res = await fetch(
          getBackendApiUrl(`collaboration-partners/branches/${id}/gallery${q}`),
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
        if (!res.ok) throw new Error("Failed to load gallery")
        const data = await res.json()
        setItems(data.items || [])
        setBranchName(data.branch_snapshot?.name || "")
      } catch (e: any) {
        toast({
          title: "Error",
          description: e?.message || "Could not load gallery",
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
    if (branchId) loadItems(branchId)
    else {
      setItems([])
      setBranchName("")
    }
  }, [branchId, loadItems])

  function openCreate() {
    setEditingId(null)
    setForm({ ...EMPTY_FORM })
    setDialogOpen(true)
  }

  function openEdit(item: GalleryItem) {
    setEditingId(item.id)
    setForm({
      media_type: (item.media_type === "video" ? "video" : "image") as
        | "image"
        | "video",
      media_url: str(item.media_url),
      thumbnail_url: str(item.thumbnail_url),
      video_url: str(item.video_url),
      caption: str(item.caption),
      display_order: String(item.display_order ?? 100),
      is_active: item.is_active !== false,
    })
    setDialogOpen(true)
  }

  async function handleUpload(kind: "media" | "thumb", file: File | undefined) {
    if (!file) return
    try {
      setUploading(kind)
      const result = await uploadFile(file)
      if (kind === "media") {
        setForm((prev) => ({ ...prev, media_url: result.file_url }))
      } else {
        setForm((prev) => ({ ...prev, thumbnail_url: result.file_url }))
      }
      toast({ title: "Uploaded", description: "File uploaded." })
    } catch (e: any) {
      toast({
        title: "Upload failed",
        description: e?.message || "Could not upload",
        variant: "destructive",
      })
    } finally {
      setUploading(null)
    }
  }

  async function handleSave() {
    if (!branchId) return
    if (form.media_type === "image" && !form.media_url) {
      toast({
        title: "Image required",
        description: "Upload an image or provide a media URL.",
        variant: "destructive",
      })
      return
    }
    if (
      form.media_type === "video" &&
      !form.media_url &&
      !form.video_url.trim()
    ) {
      toast({
        title: "Video required",
        description: "Upload a video file or paste a YouTube/Vimeo URL.",
        variant: "destructive",
      })
      return
    }
    try {
      setSaving(true)
      const body: Record<string, unknown> = {
        media_type: form.media_type,
        media_url: form.media_url || null,
        thumbnail_url: form.thumbnail_url || null,
        video_url: form.video_url.trim() || null,
        caption: form.caption.trim() || null,
        display_order: Number(form.display_order) || 100,
        is_active: form.is_active,
      }
      if (editingId) {
        body.clear_media = !form.media_url
        body.clear_thumbnail = !form.thumbnail_url
        body.clear_video_url = !form.video_url.trim()
      }

      const url = editingId
        ? getBackendApiUrl(
            `collaboration-partners/branches/${branchId}/gallery/${editingId}`
          )
        : getBackendApiUrl(
            `collaboration-partners/branches/${branchId}/gallery`
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
        const detail =
          typeof err.detail === "string"
            ? err.detail
            : Array.isArray(err.detail)
              ? err.detail.map((d: any) => d.msg || d).join(", ")
              : "Save failed"
        throw new Error(detail)
      }
      toast({
        title: "Saved",
        description: editingId
          ? "Gallery item updated for this branch only."
          : "Gallery item added for this branch only.",
      })
      setDialogOpen(false)
      await loadItems(branchId)
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

  async function handleDeactivate(item: GalleryItem) {
    if (!branchId) return
    if (!confirm("Deactivate this gallery item?")) return
    try {
      const res = await fetch(
        getBackendApiUrl(
          `collaboration-partners/branches/${branchId}/gallery/${item.id}`
        ),
        { method: "DELETE", headers: authHeaders() }
      )
      if (!res.ok) throw new Error("Deactivate failed")
      toast({ title: "Deactivated", description: "Item is now inactive." })
      await loadItems(branchId)
      await loadPartners()
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message || "Could not deactivate",
        variant: "destructive",
      })
    }
  }

  async function moveItem(item: GalleryItem, direction: "up" | "down") {
    if (!branchId) return
    const sorted = [...items].sort(
      (a, b) => (a.display_order ?? 100) - (b.display_order ?? 100)
    )
    const idx = sorted.findIndex((x) => x.id === item.id)
    if (idx < 0) return
    const swapIdx = direction === "up" ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sorted.length) return

    const a = sorted[idx]
    const b = sorted[swapIdx]
    const orderA = a.display_order ?? idx * 10
    const orderB = b.display_order ?? swapIdx * 10

    try {
      const res = await fetch(
        getBackendApiUrl(
          `collaboration-partners/branches/${branchId}/gallery/reorder`
        ),
        {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify({
            items: [
              { id: a.id, display_order: orderB },
              { id: b.id, display_order: orderA },
            ],
          }),
        }
      )
      if (!res.ok) throw new Error("Reorder failed")
      await loadItems(branchId)
    } catch (e: any) {
      toast({
        title: "Reorder failed",
        description: e?.message || "Could not update order",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-1 rounded-md bg-amber-50 border border-amber-200 p-2">
            <Images className="w-5 h-5 text-amber-800" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[#1a2332]">
              Partner Gallery
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Images and videos for the selected collaboration partner branch
              only. Does not change normal branch gallery data.
            </p>
          </div>
        </div>
        <Button
          onClick={openCreate}
          disabled={!branchId}
          className="bg-[#FFC403] text-[#1a2332] hover:bg-[#e6b003]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add item
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
                        {typeof p.gallery_count === "number"
                          ? ` — ${p.gallery_count} item${p.gallery_count === 1 ? "" : "s"}`
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
              Showing gallery for <span className="font-medium">{branchName}</span>{" "}
              only
            </p>
          )}
        </CardContent>
      </Card>

      {branchId && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Gallery items ({items.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12 text-sm text-gray-500">
                <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading…
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-md border border-dashed bg-gray-50 px-4 py-10 text-center text-sm text-gray-600">
                No gallery items yet for this partner branch.
                <div className="mt-3">
                  <Button variant="outline" size="sm" onClick={openCreate}>
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Add first item
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {items.map((item, index) => (
                  <div
                    key={item.id}
                    className="rounded-md border border-gray-100 overflow-hidden bg-white"
                  >
                    <div className="aspect-video bg-gray-100 relative flex items-center justify-center">
                      {item.media_type === "video" ? (
                        item.thumbnail_url || item.media_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={resolveMediaUrl(
                              item.thumbnail_url || item.media_url || ""
                            )}
                            alt={item.caption || "Video"}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-xs text-gray-500">Video</span>
                        )
                      ) : item.media_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={resolveMediaUrl(item.media_url)}
                          alt={item.caption || "Gallery"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Images className="w-6 h-6 text-gray-400" />
                      )}
                      <div className="absolute top-2 left-2 flex gap-1">
                        <Badge
                          variant="outline"
                          className="bg-white/90 text-[10px]"
                        >
                          {item.media_type === "video" ? "Video" : "Image"}
                        </Badge>
                        {item.is_active === false && (
                          <Badge
                            variant="outline"
                            className="bg-white/90 text-[10px]"
                          >
                            Inactive
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="p-3 space-y-2">
                      <p className="text-sm text-[#1a2332] line-clamp-2">
                        {item.caption || (
                          <span className="text-gray-400">No caption</span>
                        )}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        Order: {item.display_order ?? "—"}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={index === 0}
                          onClick={() => moveItem(item, "up")}
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={index === items.length - 1}
                          onClick={() => moveItem(item, "down")}
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(item)}
                        >
                          <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                        </Button>
                        {item.is_active !== false && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDeactivate(item)}
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1" /> Deactivate
                          </Button>
                        )}
                      </div>
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
              {editingId ? "Edit gallery item" : "Add gallery item"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-2">
              <Label>Media type</Label>
              <Select
                value={form.media_type}
                onValueChange={(v) =>
                  setForm({
                    ...form,
                    media_type: v as "image" | "video",
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>
                {form.media_type === "video"
                  ? "Uploaded video / preview file"
                  : "Image"}
              </Label>
              {form.media_url ? (
                <div className="rounded-md border bg-gray-50 overflow-hidden max-h-40 flex items-center justify-center">
                  {form.media_type === "image" ||
                  /\.(jpg|jpeg|png|webp|gif)$/i.test(form.media_url) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={resolveMediaUrl(form.media_url)}
                      alt=""
                      className="max-h-40 object-contain"
                    />
                  ) : (
                    <span className="text-xs text-gray-500 p-4 break-all">
                      {form.media_url}
                    </span>
                  )}
                </div>
              ) : null}
              <div className="flex gap-2">
                <label className="inline-flex">
                  <input
                    type="file"
                    accept={
                      form.media_type === "video"
                        ? "video/*,image/*"
                        : "image/*"
                    }
                    className="hidden"
                    onChange={(e) => handleUpload("media", e.target.files?.[0])}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    asChild
                    disabled={!!uploading}
                  >
                    <span>
                      {uploading === "media" ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5 mr-1.5" />
                      )}
                      Upload
                    </span>
                  </Button>
                </label>
                {form.media_url && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setForm({ ...form, media_url: "" })}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {form.media_type === "video" && (
              <>
                <div className="space-y-2">
                  <Label>External video URL (YouTube / Vimeo)</Label>
                  <Input
                    value={form.video_url}
                    onChange={(e) =>
                      setForm({ ...form, video_url: e.target.value })
                    }
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Thumbnail (optional)</Label>
                  <div className="flex gap-2">
                    <label className="inline-flex">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          handleUpload("thumb", e.target.files?.[0])
                        }
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        asChild
                        disabled={!!uploading}
                      >
                        <span>
                          {uploading === "thumb" ? (
                            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          ) : (
                            <Upload className="w-3.5 h-3.5 mr-1.5" />
                          )}
                          Upload thumbnail
                        </span>
                      </Button>
                    </label>
                    {form.thumbnail_url && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setForm({ ...form, thumbnail_url: "" })
                        }
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Caption</Label>
              <Textarea
                rows={2}
                value={form.caption}
                onChange={(e) => setForm({ ...form, caption: e.target.value })}
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
