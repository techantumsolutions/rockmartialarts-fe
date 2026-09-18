"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, Plus, Save, Trash2, Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import {
  RECOGNITION_LEVELS,
  championAPI,
  recognitionLevelLabel,
  type ChampionAchievement,
} from "@/lib/championAPI"

const EMPTY = {
  title: "",
  description: "",
  recognition_level: "other",
  competition_name: "",
  award_title: "",
  place: "",
  event_year: "",
  event_date: "",
  display_order: "100",
  status: "active",
}

type Props = {
  championId: string
  championName?: string
}

export default function ChampionAchievementsPanel({
  championId,
  championName,
}: Props) {
  const { toast } = useToast()
  const [items, setItems] = useState<ChampionAchievement[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...EMPTY })
  const [images, setImages] = useState<string[]>([])
  const [videos, setVideos] = useState<string[]>([])
  const [documents, setDocuments] = useState<string[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await championAPI.listAchievements(championId)
      setItems(data.achievements || [])
    } catch (e) {
      toast({
        title: "Could not load achievements",
        description: e instanceof Error ? e.message : "Error",
        variant: "destructive",
      })
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [championId, toast])

  useEffect(() => {
    void load()
  }, [load])

  const openCreate = () => {
    setEditingId(null)
    setForm({ ...EMPTY })
    setImages([])
    setVideos([])
    setDocuments([])
    setDialogOpen(true)
  }

  const openEdit = (a: ChampionAchievement) => {
    setEditingId(a.id)
    setForm({
      title: a.title || "",
      description: a.description || "",
      recognition_level: a.recognition_level || "other",
      competition_name: a.competition_name || "",
      award_title: a.award_title || "",
      place: a.place || "",
      event_year: a.event_year != null ? String(a.event_year) : "",
      event_date: a.event_date || "",
      display_order: String(a.display_order ?? 100),
      status: a.status || "active",
    })
    setImages([...(a.images || [])])
    setVideos([...(a.videos || [])])
    setDocuments([...(a.documents || [])])
    setDialogOpen(true)
  }

  const uploadTo = async (
    file: File,
    kind: "images" | "videos" | "documents"
  ) => {
    setUploading(true)
    try {
      const url = await championAPI.uploadMedia(file)
      if (!url) throw new Error("No URL returned")
      if (kind === "images") setImages((prev) => [...prev, url])
      if (kind === "videos") setVideos((prev) => [...prev, url])
      if (kind === "documents") setDocuments((prev) => [...prev, url])
      toast({ title: "File uploaded" })
    } catch (e) {
      toast({
        title: "Upload failed",
        description: e instanceof Error ? e.message : "Error",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast({ title: "Title required", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const yearNum = form.event_year.trim()
        ? Number(form.event_year)
        : undefined
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        recognition_level: form.recognition_level,
        competition_name: form.competition_name.trim() || undefined,
        award_title: form.award_title.trim() || undefined,
        place: form.place.trim() || undefined,
        event_year: yearNum && !Number.isNaN(yearNum) ? yearNum : undefined,
        event_date: form.event_date.trim() || undefined,
        images,
        videos,
        documents,
        display_order: Number(form.display_order) || 100,
        status: form.status,
      }
      if (editingId) {
        const body: Record<string, unknown> = { ...payload }
        if (!form.event_year.trim()) body.clear_event_year = true
        await championAPI.updateAchievement(championId, editingId, body)
        toast({ title: "Achievement updated" })
      } else {
        await championAPI.createAchievement(championId, payload)
        toast({ title: "Achievement created" })
      }
      setDialogOpen(false)
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

  const archive = async (id: string) => {
    if (!confirm("Archive this achievement?")) return
    setSaving(true)
    try {
      await championAPI.archiveAchievement(championId, id)
      toast({ title: "Achievement archived" })
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

  return (
    <div className="rounded-md border border-gray-100 bg-gray-50 p-3 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Label className="text-xs text-gray-500 uppercase tracking-wide">
            Achievements & media
          </Label>
          <p className="text-xs text-gray-500 mt-0.5">
            {championName
              ? `For ${championName}`
              : "Recognition, competition, awards, media"}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          className="gap-1 bg-[#4F5077] hover:bg-[#3d3e5c]"
          onClick={openCreate}
        >
          <Plus className="w-3.5 h-3.5" />
          Add
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-6 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-xs text-gray-500 py-3 text-center">
          No achievements yet. Add medals, awards, or competition results.
        </p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {items.map((a) => (
            <div
              key={a.id}
              className="rounded border border-gray-200 bg-white px-3 py-2 flex flex-wrap gap-2 items-start"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm font-medium text-[#4F5077]">
                    {a.title}
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {recognitionLevelLabel(a.recognition_level)}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {[
                    a.competition_name,
                    a.award_title,
                    a.place,
                    a.event_year ? String(a.event_year) : null,
                    a.media_count ? `${a.media_count} media` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "No competition details"}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => openEdit(a)}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-red-600"
                  disabled={saving}
                  onClick={() => void archive(a.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit achievement" : "Add achievement"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div>
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. National Championship Gold"
              />
            </div>
            <div>
              <Label>Recognition level</Label>
              <Select
                value={form.recognition_level}
                onValueChange={(v) =>
                  setForm({ ...form, recognition_level: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECOGNITION_LEVELS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Competition</Label>
                <Input
                  value={form.competition_name}
                  onChange={(e) =>
                    setForm({ ...form, competition_name: e.target.value })
                  }
                  placeholder="Event / meet name"
                />
              </div>
              <div>
                <Label>Award</Label>
                <Input
                  value={form.award_title}
                  onChange={(e) =>
                    setForm({ ...form, award_title: e.target.value })
                  }
                  placeholder="Gold medal, Best kata…"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label>Place</Label>
                <Input
                  value={form.place}
                  onChange={(e) =>
                    setForm({ ...form, place: e.target.value })
                  }
                  placeholder="1st"
                />
              </div>
              <div>
                <Label>Year</Label>
                <Input
                  type="number"
                  value={form.event_year}
                  onChange={(e) =>
                    setForm({ ...form, event_year: e.target.value })
                  }
                  placeholder="2024"
                />
              </div>
              <div>
                <Label>Date</Label>
                <Input
                  value={form.event_date}
                  onChange={(e) =>
                    setForm({ ...form, event_date: e.target.value })
                  }
                  placeholder="2024-06-15"
                />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </div>

            {(
              [
                ["images", images, setImages, "image/*"],
                ["videos", videos, setVideos, "video/*"],
                ["documents", documents, setDocuments, ".pdf,image/*"],
              ] as const
            ).map(([kind, list, setList, accept]) => (
              <div key={kind} className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="capitalize">{kind}</Label>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept={accept}
                      className="hidden"
                      disabled={uploading}
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) void uploadTo(f, kind)
                        e.target.value = ""
                      }}
                    />
                    <span className="inline-flex items-center gap-1 text-xs text-[#4F5077] hover:underline">
                      {uploading ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Upload className="w-3 h-3" />
                      )}
                      Upload
                    </span>
                  </label>
                </div>
                {list.length === 0 ? (
                  <p className="text-xs text-gray-400">None</p>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {list.map((url) => (
                      <Badge
                        key={url}
                        variant="outline"
                        className="text-[10px] max-w-[140px] truncate gap-1 pr-1"
                      >
                        <span className="truncate">{url.split("/").pop()}</span>
                        <button
                          type="button"
                          className="shrink-0"
                          onClick={() =>
                            setList(list.filter((u) => u !== url))
                          }
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Display order</Label>
                <Input
                  type="number"
                  value={form.display_order}
                  onChange={(e) =>
                    setForm({ ...form, display_order: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={saving || uploading}
              onClick={() => void handleSave()}
              className="gap-2 bg-[#FFB70F] hover:bg-[#e0a00d] text-black"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
