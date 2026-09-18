"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, Plus, RefreshCw, Save, Upload, Link2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import {
  CHAMPION_STATUSES,
  championAPI,
  championStatusLabel,
  type Champion,
  type ChampionStudentOption,
} from "@/lib/championAPI"
import ChampionAchievementsPanel from "@/components/champions/ChampionAchievementsPanel"

const EMPTY_FORM = {
  name: "",
  slug: "",
  headline: "",
  short_bio: "",
  success_story: "",
  photo_url: "",
  student_id: "",
  display_order: "100",
  status: "draft",
}

const STATUS_CLASS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 border-gray-200",
  published: "bg-green-50 text-green-800 border-green-200",
  unpublished: "bg-amber-50 text-amber-800 border-amber-200",
  archived: "bg-red-50 text-red-800 border-red-200",
}

export default function ChampionsAdminPage() {
  const { toast } = useToast()
  const [champions, setChampions] = useState<Champion[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [studentSearch, setStudentSearch] = useState("")
  const [studentOptions, setStudentOptions] = useState<ChampionStudentOption[]>(
    []
  )
  const [linkedLabel, setLinkedLabel] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await championAPI.list({
        status: statusFilter,
        search: search || undefined,
        include_archived: statusFilter === "archived" || statusFilter === "all",
      })
      setChampions(data.champions || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load champions")
    } finally {
      setLoading(false)
    }
  }, [statusFilter, search])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const t = setTimeout(() => {
      void (async () => {
        try {
          const data = await championAPI.studentOptions({
            search: studentSearch || undefined,
            limit: 25,
          })
          setStudentOptions(data.students || [])
        } catch {
          /* non-blocking */
        }
      })()
    }, 300)
    return () => clearTimeout(t)
  }, [studentSearch])

  const startCreate = () => {
    setEditingId(null)
    setForm({ ...EMPTY_FORM })
    setLinkedLabel("")
    setStudentSearch("")
  }

  const startEdit = (c: Champion) => {
    setEditingId(c.id)
    setForm({
      name: c.name || "",
      slug: c.slug || "",
      headline: c.headline || "",
      short_bio: c.short_bio || "",
      success_story: c.success_story || "",
      photo_url: c.photo_url || "",
      student_id: c.student_id || "",
      display_order: String(c.display_order ?? 100),
      status: c.status || "draft",
    })
    setLinkedLabel(c.student_name || c.student_id || "")
    setStudentSearch("")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleUpload = async (file: File) => {
    setUploading(true)
    try {
      const url = await championAPI.uploadPhoto(file)
      if (!url) throw new Error("No file URL returned")
      setForm((prev) => ({ ...prev, photo_url: url }))
      toast({ title: "Photo uploaded" })
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
    if (!form.name.trim()) {
      toast({ title: "Name required", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim() || undefined,
        headline: form.headline.trim() || undefined,
        short_bio: form.short_bio.trim() || undefined,
        success_story: form.success_story.trim() || undefined,
        photo_url: form.photo_url.trim() || undefined,
        student_id: form.student_id.trim() || undefined,
        display_order: Number(form.display_order) || 100,
        status: form.status,
      }
      if (editingId) {
        const updateBody: Record<string, unknown> = { ...payload }
        if (!form.photo_url.trim()) updateBody.clear_photo = true
        if (!form.student_id.trim()) updateBody.clear_student = true
        await championAPI.update(editingId, updateBody)
        toast({ title: "Champion updated" })
      } else {
        await championAPI.create(payload)
        toast({ title: "Champion created" })
      }
      startCreate()
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

  const togglePublish = async (c: Champion) => {
    setSaving(true)
    try {
      if (c.status === "published") {
        await championAPI.unpublish(c.id)
        toast({ title: "Champion unpublished" })
      } else {
        await championAPI.publish(c.id)
        toast({ title: "Champion published" })
      }
      await load()
      if (editingId === c.id) {
        const { champion } = await championAPI.get(c.id)
        startEdit(champion)
      }
    } catch (e) {
      toast({
        title: "Update failed",
        description: e instanceof Error ? e.message : "Error",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const archive = async (id: string) => {
    if (!confirm("Archive this champion profile? It will no longer be listed as active."))
      return
    setSaving(true)
    try {
      await championAPI.archive(id)
      toast({ title: "Champion archived" })
      if (editingId === id) startCreate()
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
    <div className="min-h-screen bg-gray-50">
      <main className="w-full p-4 lg:px-8 lg:py-6 space-y-6 max-w-6xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#4F5077]">Champions</h1>
            <p className="text-sm text-[#6B7A99] mt-1">
              Manage champion profiles, success stories, and publish status
              (separate from showcase achievements).
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void load()} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
            <Button
              onClick={startCreate}
              className="gap-2 bg-[#4F5077] hover:bg-[#3d3e5c]"
            >
              <Plus className="w-4 h-4" />
              New champion
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {CHAMPION_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Search</Label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, headline, student…"
            />
          </div>
        </div>

        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-[#4F5077]">
                {editingId ? "Edit champion" : "Create champion"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Priya Sharma"
                />
              </div>
              <div>
                <Label>Slug (optional)</Label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="auto from name"
                />
              </div>
              <div>
                <Label>Headline</Label>
                <Input
                  value={form.headline}
                  onChange={(e) =>
                    setForm({ ...form, headline: e.target.value })
                  }
                  placeholder="e.g. National Gold Medalist 2024"
                />
              </div>
              <div>
                <Label>Short bio</Label>
                <Textarea
                  rows={2}
                  value={form.short_bio}
                  onChange={(e) =>
                    setForm({ ...form, short_bio: e.target.value })
                  }
                  placeholder="One or two lines for cards"
                />
              </div>
              <div>
                <Label>Success story / content</Label>
                <Textarea
                  rows={6}
                  value={form.success_story}
                  onChange={(e) =>
                    setForm({ ...form, success_story: e.target.value })
                  }
                  placeholder="Full story shown on the champion detail page"
                />
              </div>

              <div className="rounded-md border border-gray-100 bg-gray-50 p-3 space-y-2">
                <Label className="text-xs text-gray-500 uppercase tracking-wide">
                  Photo
                </Label>
                <div className="flex gap-2">
                  <label className="cursor-pointer shrink-0">
                    <span className="sr-only">Upload photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) void handleUpload(f)
                        e.target.value = ""
                      }}
                    />
                    <span className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent">
                      {uploading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                      Upload
                    </span>
                  </label>
                  <Input
                    value={form.photo_url}
                    onChange={(e) =>
                      setForm({ ...form, photo_url: e.target.value })
                    }
                    placeholder="Or paste image URL"
                  />
                </div>
                {form.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.photo_url}
                    alt="Champion preview"
                    className="w-full max-h-40 rounded object-cover"
                  />
                ) : null}
              </div>

              <div className="rounded-md border border-gray-100 bg-gray-50 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-gray-500 uppercase tracking-wide">
                    Student linkage (optional)
                  </Label>
                  <Link2 className="w-4 h-4 text-gray-400" />
                </div>
                {form.student_id ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {linkedLabel || form.student_id}
                    </Badge>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => {
                        setForm({ ...form, student_id: "" })
                        setLinkedLabel("")
                      }}
                    >
                      Unlink
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">
                    Link to an enrolled student when this champion is also in
                    the system.
                  </p>
                )}
                <Input
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Search students by name, phone, email…"
                />
                <div className="max-h-28 overflow-y-auto rounded border border-gray-200 bg-white p-2 space-y-1">
                  {studentOptions.length === 0 ? (
                    <p className="text-xs text-gray-400">No students found</p>
                  ) : (
                    studentOptions.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className="w-full text-left text-sm px-2 py-1 rounded hover:bg-gray-50 truncate"
                        onClick={() => {
                          setForm({ ...form, student_id: s.id })
                          setLinkedLabel(s.name)
                          setStudentSearch("")
                        }}
                      >
                        {s.name}
                        {s.phone ? (
                          <span className="text-xs text-gray-400 ml-1">
                            {s.phone}
                          </span>
                        ) : null}
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                      {CHAMPION_STATUSES.filter(
                        (s) => s.value !== "archived"
                      ).map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Display order</Label>
                  <Input
                    type="number"
                    value={form.display_order}
                    onChange={(e) =>
                      setForm({ ...form, display_order: e.target.value })
                    }
                  />
                  <p className="text-xs text-gray-400 mt-1">Lower = higher</p>
                </div>
              </div>

              {editingId ? (
                <ChampionAchievementsPanel
                  championId={editingId}
                  championName={form.name || undefined}
                />
              ) : (
                <p className="text-xs text-gray-400">
                  Save the champion profile first to add achievements and media.
                </p>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
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
                  {editingId ? "Update" : "Create"}
                </Button>
                {editingId ? (
                  <Button type="button" variant="ghost" onClick={startCreate}>
                    Cancel
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-[#4F5077]">
                Champions {loading ? "" : `(${champions.length})`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-12 text-gray-400">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : champions.length === 0 ? (
                <p className="text-sm text-gray-500 py-8 text-center">
                  No champions yet. Create a profile with a photo and success
                  story.
                </p>
              ) : (
                <div className="space-y-2">
                  {champions.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-md border border-gray-100 bg-white px-3 py-3 flex flex-wrap gap-3"
                    >
                      {c.photo_url ? (
                        <div className="w-16 h-16 shrink-0 overflow-hidden rounded-full bg-gray-100">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={c.photo_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 shrink-0 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
                          No photo
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-[#4F5077]">
                            {c.name}
                          </span>
                          <Badge
                            variant="outline"
                            className={
                              STATUS_CLASS[c.status || "draft"] ||
                              STATUS_CLASS.draft
                            }
                          >
                            {championStatusLabel(c.status)}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-400 font-mono mt-0.5">
                          {c.slug}
                        </p>
                        {c.headline ? (
                          <p className="text-sm text-gray-600 mt-1">
                            {c.headline}
                          </p>
                        ) : null}
                        <p className="text-xs text-gray-400 mt-1">
                          {[
                            c.student_id
                              ? `Linked: ${c.student_name || c.student_id}`
                              : "No student link",
                            c.success_story
                              ? "Has success story"
                              : "No story yet",
                            `Order ${c.display_order ?? 100}`,
                          ].join(" · ")}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0 items-end">
                        {c.status !== "archived" ? (
                          <label className="flex items-center gap-2 text-xs text-gray-600">
                            <Switch
                              checked={c.status === "published"}
                              disabled={saving}
                              onCheckedChange={() => void togglePublish(c)}
                            />
                            Published
                          </label>
                        ) : null}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startEdit(c)}
                          >
                            Edit
                          </Button>
                          {c.status !== "archived" ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600"
                              disabled={saving}
                              onClick={() => void archive(c.id)}
                            >
                              Archive
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
