"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Plus, Pencil, Upload } from "lucide-react"
import { TokenManager } from "@/lib/tokenManager"
import { getBackendApiUrl } from "@/lib/config"
import { resolvePublicAssetUrl } from "@/lib/resolvePublicAssetUrl"
import {
  type CampaignPopup,
  type CampaignPopupInput,
  listCampaignPopups,
  createCampaignPopup,
  updateCampaignPopup,
  setCampaignPopupEnabled,
} from "@/lib/campaignPopupAPI"

const emptyForm = (): CampaignPopupInput => ({
  event_title: "",
  description: "",
  image_url: "",
  start_date: "",
  end_date: "",
  location: "",
  cta_label: "Learn more",
  cta_url: "",
  delay_minutes: 1,
  priority: 0,
  enabled: true,
})

/** Local calendar today as YYYY-MM-DD for date input min / validation. */
function todayYmd(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function CampaignPopupsAdmin() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<CampaignPopup[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<CampaignPopupInput>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const list = await listCampaignPopups()
      setItems(list)
    } catch (e: unknown) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to load campaign popups",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void load()
  }, [load])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm())
    setDialogOpen(true)
  }

  const openEdit = (row: CampaignPopup) => {
    setEditingId(row.id)
    setForm({
      event_title: row.event_title || "",
      description: row.description || "",
      image_url: row.image_url || "",
      start_date: (row.start_date || "").slice(0, 10),
      end_date: (row.end_date || "").slice(0, 10),
      location: row.location || "",
      cta_label: row.cta_label || "Learn more",
      cta_url: row.cta_url || "",
      delay_minutes: typeof row.delay_minutes === "number" ? row.delay_minutes : 1,
      priority: typeof row.priority === "number" ? row.priority : 0,
      enabled: row.enabled !== false,
    })
    setDialogOpen(true)
  }

  const patchForm = (partial: Partial<CampaignPopupInput>) => {
    setForm((prev) => ({ ...prev, ...partial }))
  }

  const handleUploadImage = async (file: File) => {
    try {
      setUploading(true)
      const token = TokenManager.getToken()
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch(getBackendApiUrl("uploads"), {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      })
      if (!res.ok) throw new Error("Upload failed")
      const data = await res.json()
      const url = data.file_url || data.url || data.image_url || ""
      if (!url) throw new Error("No URL returned")
      patchForm({ image_url: url })
      toast({ title: "Uploaded", description: "Image uploaded" })
    } catch (e: unknown) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Upload failed",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    if (!form.event_title.trim()) {
      toast({ title: "Validation", description: "Event title is required", variant: "destructive" })
      return
    }
    if (!form.start_date || !form.end_date) {
      toast({ title: "Validation", description: "Start and end dates are required", variant: "destructive" })
      return
    }
    const today = todayYmd()
    if (form.start_date < today || form.end_date < today) {
      toast({
        title: "Validation",
        description: "Start and end dates must be today or a future date",
        variant: "destructive",
      })
      return
    }
    if (form.start_date > form.end_date) {
      toast({
        title: "Validation",
        description: "Start date must be on or before end date",
        variant: "destructive",
      })
      return
    }
    try {
      setSaving(true)
      const payload: CampaignPopupInput = {
        ...form,
        event_title: form.event_title.trim(),
        delay_minutes: Number.isFinite(form.delay_minutes) ? Math.max(0, form.delay_minutes) : 1,
        priority: Number.isFinite(form.priority) ? form.priority : 0,
      }
      if (editingId) {
        await updateCampaignPopup(editingId, payload)
        toast({ title: "Saved", description: "Campaign popup updated" })
      } else {
        await createCampaignPopup(payload)
        toast({ title: "Created", description: "Campaign popup created" })
      }
      setDialogOpen(false)
      await load()
    } catch (e: unknown) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Save failed",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (row: CampaignPopup, enabled: boolean) => {
    try {
      await setCampaignPopupEnabled(row.id, enabled)
      setItems((prev) => prev.map((p) => (p.id === row.id ? { ...p, enabled } : p)))
      toast({ title: enabled ? "Enabled" : "Disabled", description: row.event_title })
    } catch (e: unknown) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to update",
        variant: "destructive",
      })
    }
  }

  const imageSrc = form.image_url ? resolvePublicAssetUrl(form.image_url) : ""
  const minStart = todayYmd()
  const minEnd =
    form.start_date && form.start_date > minStart ? form.start_date : minStart

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-[#4F5077]">Popup Creation</CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Campaign popups appear on the public site after the lead form is done (or disabled), with
              an admin delay. Only enabled popups within their start–end dates are shown.
            </p>
          </div>
          <Button type="button" onClick={openCreate} className="bg-yellow-400 hover:bg-yellow-500 text-white shrink-0">
            <Plus className="w-4 h-4 mr-1" />
            Create popup
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500 py-8 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading…
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-gray-500 py-6 text-center">
              No campaign popups yet. Create one to promote summer camps or events.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-600">
                  <tr>
                    <th className="px-3 py-2 font-medium">Title</th>
                    <th className="px-3 py-2 font-medium">Dates</th>
                    <th className="px-3 py-2 font-medium">Location</th>
                    <th className="px-3 py-2 font-medium">Delay</th>
                    <th className="px-3 py-2 font-medium">Priority</th>
                    <th className="px-3 py-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr key={row.id} className="border-t">
                      <td className="px-3 py-2 font-medium text-[#4F5077]">{row.event_title}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                        {(row.start_date || "").slice(0, 10)} → {(row.end_date || "").slice(0, 10)}
                      </td>
                      <td className="px-3 py-2 text-gray-600 max-w-[10rem] truncate">
                        {row.location || "—"}
                      </td>
                      <td className="px-3 py-2 text-gray-600">{row.delay_minutes ?? 1} min</td>
                      <td className="px-3 py-2 text-gray-600">{row.priority ?? 0}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-2">
                          <Switch
                            checked={row.enabled !== false}
                            onCheckedChange={(v) => void handleToggle(row, v)}
                            aria-label={row.enabled !== false ? "Disable popup" : "Enable popup"}
                          />
                          <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(row)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#4F5077]">
              {editingId ? "Edit campaign popup" : "Create campaign popup"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Event title *</Label>
              <Input
                value={form.event_title}
                onChange={(e) => patchForm({ event_title: e.target.value })}
                placeholder="Summer Camp 2026"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.description || ""}
                onChange={(e) => patchForm({ description: e.target.value })}
                rows={3}
                placeholder="Short promo copy"
              />
            </div>
            <div className="space-y-2">
              <Label>Image</Label>
              {imageSrc ? (
                <img
                  src={imageSrc}
                  alt=""
                  className="w-full max-h-40 object-cover rounded border"
                />
              ) : null}
              <div className="flex flex-wrap gap-2">
                <label className={`cursor-pointer inline-flex ${uploading ? "opacity-60 pointer-events-none" : ""}`}>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      e.target.value = ""
                      if (f) void handleUploadImage(f)
                    }}
                  />
                  <span className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-sm hover:bg-gray-100">
                    <Upload className="w-4 h-4" />
                    {uploading ? "Uploading…" : "Upload"}
                  </span>
                </label>
                {form.image_url ? (
                  <Button type="button" variant="outline" size="sm" onClick={() => patchForm({ image_url: "" })}>
                    Remove
                  </Button>
                ) : null}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Start date *</Label>
                <Input
                  type="date"
                  min={minStart}
                  value={form.start_date}
                  onChange={(e) => {
                    const start_date = e.target.value
                    const patch: Partial<CampaignPopupInput> = { start_date }
                    if (form.end_date && start_date && form.end_date < start_date) {
                      patch.end_date = start_date
                    }
                    patchForm(patch)
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>End date *</Label>
                <Input
                  type="date"
                  min={minEnd}
                  value={form.end_date}
                  onChange={(e) => patchForm({ end_date: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input
                value={form.location || ""}
                onChange={(e) => patchForm({ location: e.target.value })}
                placeholder="Branch / venue"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>CTA button label</Label>
                <Input
                  value={form.cta_label || ""}
                  onChange={(e) => patchForm({ cta_label: e.target.value })}
                  placeholder="Learn more"
                />
              </div>
              <div className="space-y-2">
                <Label>CTA URL</Label>
                <Input
                  value={form.cta_url || ""}
                  onChange={(e) => patchForm({ cta_url: e.target.value })}
                  placeholder="https://… or /residential-camp"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Delay (minutes)</Label>
                <Input
                  type="number"
                  min={0}
                  max={1440}
                  value={form.delay_minutes}
                  onChange={(e) =>
                    patchForm({ delay_minutes: Number.parseInt(e.target.value, 10) || 0 })
                  }
                />
                <p className="text-xs text-gray-500">Wait after lead popup is done before showing.</p>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Input
                  type="number"
                  value={form.priority}
                  onChange={(e) =>
                    patchForm({ priority: Number.parseInt(e.target.value, 10) || 0 })
                  }
                />
                <p className="text-xs text-gray-500">Higher wins if several overlap.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.enabled}
                onCheckedChange={(v) => patchForm({ enabled: v })}
              />
              <Label>Enabled</Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="bg-yellow-400 hover:bg-yellow-500 text-white"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {editingId ? "Save changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
