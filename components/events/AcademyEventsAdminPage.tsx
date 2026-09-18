"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, Plus, RefreshCw, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { TokenManager } from "@/lib/tokenManager"
import { getBackendApiUrl } from "@/lib/config"
import {
  ACADEMY_EVENT_REMINDER_OFFSETS,
  ACADEMY_EVENT_STATUSES,
  ACADEMY_EVENT_TYPES,
  academyEventAPI,
  academyEventStatusLabel,
  academyEventTypeLabel,
  formatEventFee,
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
  type AcademyEvent,
  type AcademyEventRegistrationField,
  type AcademyEventReminderLog,
} from "@/lib/academyEventAPI"

type BranchOpt = { id: string; name: string }

const DEFAULT_REG_FIELDS: AcademyEventRegistrationField[] = [
  {
    key: "participant_name",
    label: "Full name",
    field_type: "text",
    required: true,
    enabled: true,
  },
  {
    key: "participant_phone",
    label: "Mobile number",
    field_type: "phone",
    required: true,
    enabled: true,
  },
  {
    key: "participant_email",
    label: "Email",
    field_type: "email",
    required: false,
    enabled: true,
  },
  {
    key: "participant_age",
    label: "Age",
    field_type: "number",
    required: false,
    enabled: true,
  },
  {
    key: "notes",
    label: "Notes / special requests",
    field_type: "textarea",
    required: false,
    enabled: true,
  },
]

const EMPTY_FORM = {
  title: "",
  slug: "",
  event_type: "event",
  short_description: "",
  description: "",
  venue: "",
  venue_address: "",
  start_at: "",
  end_at: "",
  branch_id: "",
  fee_inr: "0",
  capacity: "",
  thumbnail_url: "",
  status: "draft",
  sort_order: "100",
  seo_title: "",
  seo_description: "",
  registration_enabled: true,
  registration_fields: DEFAULT_REG_FIELDS.map((f) => ({ ...f })),
  reminders_enabled: true,
  reminder_offsets_hours: [24] as number[],
}

const STATUS_CLASS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 border-gray-200",
  published: "bg-green-50 text-green-800 border-green-200",
  archived: "bg-red-50 text-red-800 border-red-200",
}

export default function AcademyEventsAdminPage() {
  const { toast } = useToast()
  const [events, setEvents] = useState<AcademyEvent[]>([])
  const [branches, setBranches] = useState<BranchOpt[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [branchFilter, setBranchFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [reminderLogs, setReminderLogs] = useState<AcademyEventReminderLog[]>([])
  const [reminderBusy, setReminderBusy] = useState(false)

  const loadBranches = useCallback(async () => {
    try {
      const token = TokenManager.getToken()
      const res = await fetch(getBackendApiUrl("branches?skip=0&limit=200"), {
        headers: {
          Authorization: token ? `Bearer ${token}` : "Bearer ",
          "Cache-Control": "no-cache",
        },
        cache: "no-store",
      })
      if (!res.ok) return
      const data = await res.json()
      const list = data.branches || data || []
      setBranches(
        (Array.isArray(list) ? list : []).map((b: { id: string; name?: string }) => ({
          id: b.id,
          name: b.name || b.id,
        }))
      )
    } catch {
      /* optional */
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await academyEventAPI.list({
        status: statusFilter,
        event_type: typeFilter,
        branch_id: branchFilter,
        search: search || undefined,
      })
      setEvents(data.events || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load events")
    } finally {
      setLoading(false)
    }
  }, [statusFilter, typeFilter, branchFilter, search])

  useEffect(() => {
    loadBranches()
  }, [loadBranches])

  useEffect(() => {
    load()
  }, [load])

  const startCreate = () => {
    setEditingId(null)
    setForm({ ...EMPTY_FORM })
    setReminderLogs([])
  }

  const loadReminderLogs = useCallback(async (eventId: string) => {
    try {
      const data = await academyEventAPI.listReminderLogs({
        event_id: eventId,
        limit: 20,
      })
      setReminderLogs(data.logs || [])
    } catch {
      setReminderLogs([])
    }
  }, [])

  const startEdit = (ev: AcademyEvent) => {
    setEditingId(ev.id)
    setForm({
      title: ev.title || "",
      slug: ev.slug || "",
      event_type: ev.event_type || "event",
      short_description: ev.short_description || "",
      description: ev.description || "",
      venue: ev.venue || "",
      venue_address: ev.venue_address || "",
      start_at: toDatetimeLocalValue(ev.start_at),
      end_at: toDatetimeLocalValue(ev.end_at),
      branch_id: ev.branch_id || "",
      fee_inr: String(ev.fee_inr ?? 0),
      capacity: ev.capacity != null ? String(ev.capacity) : "",
      thumbnail_url: ev.thumbnail_url || "",
      status: ev.status || "draft",
      sort_order: String(ev.sort_order ?? 100),
      seo_title: ev.seo_title || "",
      seo_description: ev.seo_description || "",
      registration_enabled: ev.registration_enabled !== false,
      registration_fields:
        Array.isArray(ev.registration_fields) && ev.registration_fields.length
          ? DEFAULT_REG_FIELDS.map((d) => {
              const found = ev.registration_fields!.find((f) => f.key === d.key)
              return found
                ? {
                    ...d,
                    ...found,
                    enabled: found.enabled !== false,
                    required:
                      d.key === "participant_name" ||
                      d.key === "participant_phone"
                        ? true
                        : Boolean(found.required),
                  }
                : { ...d }
            })
          : DEFAULT_REG_FIELDS.map((f) => ({ ...f })),
      reminders_enabled: ev.reminders_enabled !== false,
      reminder_offsets_hours:
        Array.isArray(ev.reminder_offsets_hours) &&
        ev.reminder_offsets_hours.length
          ? [...ev.reminder_offsets_hours]
          : [24],
    })
    void loadReminderLogs(ev.id)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast({ title: "Title required", variant: "destructive" })
      return
    }
    if (!form.start_at.trim()) {
      toast({ title: "Start date/time required", variant: "destructive" })
      return
    }
    const fee = Number(form.fee_inr)
    if (!Number.isFinite(fee) || fee < 0) {
      toast({ title: "Invalid fee", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const capacityTrim = form.capacity.trim()
      const capacity =
        capacityTrim === "" ? null : Number(capacityTrim)
      if (capacity != null && (!Number.isFinite(capacity) || capacity < 1)) {
        toast({ title: "Invalid capacity", variant: "destructive" })
        setSaving(false)
        return
      }
      const payload = {
        title: form.title.trim(),
        slug: form.slug.trim() || undefined,
        event_type: form.event_type,
        short_description: form.short_description.trim() || undefined,
        description: form.description.trim() || undefined,
        venue: form.venue.trim() || undefined,
        venue_address: form.venue_address.trim() || undefined,
        start_at: fromDatetimeLocalValue(form.start_at),
        end_at: form.end_at
          ? fromDatetimeLocalValue(form.end_at)
          : undefined,
        branch_id: form.branch_id || undefined,
        fee_inr: fee,
        capacity,
        thumbnail_url: form.thumbnail_url.trim() || undefined,
        status: form.status,
        sort_order: Number(form.sort_order) || 100,
        seo_title: form.seo_title.trim() || undefined,
        seo_description: form.seo_description.trim() || undefined,
        registration_enabled: form.registration_enabled,
        registration_fields: form.registration_fields,
        reminders_enabled: form.reminders_enabled,
        reminder_offsets_hours:
          form.reminder_offsets_hours.length > 0
            ? form.reminder_offsets_hours
            : [24],
      }
      if (editingId) {
        const updateBody: Record<string, unknown> = { ...payload }
        if (capacity == null) updateBody.clear_capacity = true
        await academyEventAPI.update(editingId, updateBody)
        toast({ title: "Event updated" })
      } else {
        await academyEventAPI.create(payload)
        toast({ title: "Event created" })
      }
      setEditingId(null)
      setForm({ ...EMPTY_FORM })
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
    if (!confirm("Archive this event? It will no longer appear as active.")) return
    setSaving(true)
    try {
      await academyEventAPI.archive(id)
      toast({ title: "Event archived" })
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

  const toggleOffset = (hours: number) => {
    setForm((prev) => {
      const has = prev.reminder_offsets_hours.includes(hours)
      const next = has
        ? prev.reminder_offsets_hours.filter((h) => h !== hours)
        : [...prev.reminder_offsets_hours, hours].sort((a, b) => b - a)
      return { ...prev, reminder_offsets_hours: next.length ? next : [24] }
    })
  }

  const sendRemindersNow = async (dryRun: boolean) => {
    if (!editingId) return
    setReminderBusy(true)
    try {
      const result = await academyEventAPI.triggerReminders(editingId, {
        offset_hours: form.reminder_offsets_hours,
        dry_run: dryRun,
      })
      toast({
        title: dryRun ? "Reminder dry run" : "Reminders processed",
        description: `Sent ${result.sent}, stubbed ${result.stubbed}, failed ${result.failed}, skipped ${result.skipped}`,
      })
      if (!dryRun) await loadReminderLogs(editingId)
    } catch (e) {
      toast({
        title: "Reminder send failed",
        description: e instanceof Error ? e.message : "Error",
        variant: "destructive",
      })
    } finally {
      setReminderBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="w-full p-4 lg:px-8 lg:py-6 space-y-6 max-w-6xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#4F5077]">
              Events, Seminars & Workshops
            </h1>
            <p className="text-sm text-[#6B7A99] mt-1">
              Manage academy events (separate from camps and demos).
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
              New event
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Label>Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {ACADEMY_EVENT_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Type</Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {ACADEMY_EVENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Branch</Label>
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All branches</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
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
              placeholder="Title, slug, venue…"
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
                {editingId ? "Edit event" : "Create event"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Summer Sparring Seminar"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Type</Label>
                  <Select
                    value={form.event_type}
                    onValueChange={(v) => setForm({ ...form, event_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACADEMY_EVENT_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                      {ACADEMY_EVENT_STATUSES.filter(
                        (s) => s.value !== "archived"
                      ).map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Slug (optional)</Label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="auto from title"
                />
              </div>
              <div>
                <Label>Short description</Label>
                <Input
                  value={form.short_description}
                  onChange={(e) =>
                    setForm({ ...form, short_description: e.target.value })
                  }
                />
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Start</Label>
                  <Input
                    type="datetime-local"
                    value={form.start_at}
                    onChange={(e) =>
                      setForm({ ...form, start_at: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>End</Label>
                  <Input
                    type="datetime-local"
                    value={form.end_at}
                    onChange={(e) =>
                      setForm({ ...form, end_at: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <Label>Venue</Label>
                <Input
                  value={form.venue}
                  onChange={(e) => setForm({ ...form, venue: e.target.value })}
                  placeholder="Hall / dojo name"
                />
              </div>
              <div>
                <Label>Venue address</Label>
                <Input
                  value={form.venue_address}
                  onChange={(e) =>
                    setForm({ ...form, venue_address: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Branch</Label>
                <Select
                  value={form.branch_id || "none"}
                  onValueChange={(v) =>
                    setForm({ ...form, branch_id: v === "none" ? "" : v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Optional branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No branch</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Fee (INR)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.fee_inr}
                    onChange={(e) =>
                      setForm({ ...form, fee_inr: e.target.value })
                    }
                  />
                  <p className="text-xs text-gray-400 mt-1">0 = free</p>
                </div>
                <div>
                  <Label>Capacity</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.capacity}
                    onChange={(e) =>
                      setForm({ ...form, capacity: e.target.value })
                    }
                    placeholder="Unlimited"
                  />
                </div>
              </div>
              <div>
                <Label>Thumbnail URL</Label>
                <Input
                  value={form.thumbnail_url}
                  onChange={(e) =>
                    setForm({ ...form, thumbnail_url: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Sort order</Label>
                  <Input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) =>
                      setForm({ ...form, sort_order: e.target.value })
                    }
                  />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={form.registration_enabled}
                      onCheckedChange={(v) =>
                        setForm({ ...form, registration_enabled: v })
                      }
                    />
                    Registration open
                  </label>
                </div>
              </div>
              <div className="rounded-md border border-gray-100 bg-gray-50 p-3 space-y-2">
                <Label className="text-xs text-gray-500 uppercase tracking-wide">
                  Registration form fields
                </Label>
                {form.registration_fields.map((f) => {
                  const locked =
                    f.key === "participant_name" || f.key === "participant_phone"
                  return (
                    <div
                      key={f.key}
                      className="flex flex-wrap items-center justify-between gap-2 text-sm"
                    >
                      <span className="text-gray-700">{f.label}</span>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 text-xs text-gray-500">
                          <input
                            type="checkbox"
                            checked={f.enabled}
                            disabled={locked}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                registration_fields: form.registration_fields.map(
                                  (x) =>
                                    x.key === f.key
                                      ? { ...x, enabled: e.target.checked }
                                      : x
                                ),
                              })
                            }
                          />
                          Show
                        </label>
                        <label className="flex items-center gap-1.5 text-xs text-gray-500">
                          <input
                            type="checkbox"
                            checked={f.required}
                            disabled={locked || !f.enabled}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                registration_fields: form.registration_fields.map(
                                  (x) =>
                                    x.key === f.key
                                      ? { ...x, required: e.target.checked }
                                      : x
                                ),
                              })
                            }
                          />
                          Required
                        </label>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="rounded-md border border-gray-100 bg-gray-50 p-3 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-xs text-gray-500 uppercase tracking-wide">
                    SMS event reminders
                  </Label>
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={form.reminders_enabled}
                      onCheckedChange={(v) =>
                        setForm({ ...form, reminders_enabled: v })
                      }
                    />
                    Enabled
                  </label>
                </div>
                <p className="text-xs text-gray-500">
                  Confirmed registrants with a phone receive SMS before the
                  event start (hours selected below).
                </p>
                <div className="flex flex-wrap gap-2">
                  {ACADEMY_EVENT_REMINDER_OFFSETS.map((h) => {
                    const checked = form.reminder_offsets_hours.includes(h)
                    return (
                      <label
                        key={h}
                        className={`inline-flex items-center gap-1.5 rounded border px-2 py-1 text-xs cursor-pointer ${
                          checked
                            ? "border-[#4F5077] bg-white text-[#4F5077]"
                            : "border-gray-200 text-gray-500"
                        } ${!form.reminders_enabled ? "opacity-50" : ""}`}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          disabled={!form.reminders_enabled}
                          checked={checked}
                          onChange={() => toggleOffset(h)}
                        />
                        {h}h before
                      </label>
                    )
                  })}
                </div>
                {editingId ? (
                  <div className="space-y-2 pt-1 border-t border-gray-200">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={reminderBusy || !form.reminders_enabled}
                        onClick={() => void sendRemindersNow(true)}
                      >
                        Dry run
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={reminderBusy || !form.reminders_enabled}
                        className="bg-[#4F5077] hover:bg-[#3d3e5c]"
                        onClick={() => {
                          if (
                            confirm(
                              "Send SMS reminders now to all confirmed registrants for the selected offsets? Already-sent offsets are skipped."
                            )
                          ) {
                            void sendRemindersNow(false)
                          }
                        }}
                      >
                        {reminderBusy ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                        ) : null}
                        Send reminders now
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={reminderBusy}
                        onClick={() => void loadReminderLogs(editingId)}
                      >
                        Refresh logs
                      </Button>
                    </div>
                    {reminderLogs.length > 0 ? (
                      <div className="max-h-40 overflow-y-auto text-xs space-y-1">
                        {reminderLogs.map((log) => (
                          <div
                            key={log.id}
                            className="flex flex-wrap justify-between gap-1 text-gray-600 border-b border-gray-100 pb-1"
                          >
                            <span>
                              {log.participant_name || "—"} · {log.offset_hours}
                              h · {log.status}
                            </span>
                            <span className="text-gray-400">
                              {log.created_at
                                ? new Date(log.created_at).toLocaleString()
                                : ""}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400">No reminder logs yet.</p>
                    )}
                  </div>
                ) : null}
              </div>
              <div>
                <Label>SEO title</Label>
                <Input
                  value={form.seo_title}
                  onChange={(e) =>
                    setForm({ ...form, seo_title: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>SEO description</Label>
                <Textarea
                  rows={2}
                  value={form.seo_description}
                  onChange={(e) =>
                    setForm({ ...form, seo_description: e.target.value })
                  }
                />
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  disabled={saving}
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
                  <Button type="button" variant="outline" onClick={startCreate}>
                    Cancel
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-[#4F5077]">
                Events ({events.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : events.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-10">
                  No events yet. Create an Event, Seminar, or Workshop.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 border-b">
                        <th className="py-2 pr-2">Title</th>
                        <th className="py-2 pr-2">Type</th>
                        <th className="py-2 pr-2">When</th>
                        <th className="py-2 pr-2">Fee</th>
                        <th className="py-2 pr-2">Status</th>
                        <th className="py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {events.map((ev) => (
                        <tr key={ev.id} className="border-b border-gray-100">
                          <td className="py-2.5 pr-2">
                            <div className="font-medium text-gray-900">
                              {ev.title}
                            </div>
                            <div className="text-xs text-gray-400 truncate max-w-[180px]">
                              {ev.venue || ev.branch_name || ev.slug}
                            </div>
                          </td>
                          <td className="py-2.5 pr-2">
                            {academyEventTypeLabel(ev.event_type)}
                          </td>
                          <td className="py-2.5 pr-2 text-xs text-gray-600 whitespace-nowrap">
                            {ev.start_at
                              ? new Date(ev.start_at).toLocaleString(undefined, {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                })
                              : "—"}
                            {ev.capacity != null ? (
                              <div className="text-gray-400">
                                Cap {ev.capacity}
                              </div>
                            ) : null}
                          </td>
                          <td className="py-2.5 pr-2">
                            {formatEventFee(ev.fee_inr)}
                          </td>
                          <td className="py-2.5 pr-2">
                            <Badge
                              variant="outline"
                              className={`text-xs ${STATUS_CLASS[ev.status || ""] || ""}`}
                            >
                              {academyEventStatusLabel(ev.status)}
                            </Badge>
                          </td>
                          <td className="py-2.5">
                            <div className="flex flex-wrap gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startEdit(ev)}
                              >
                                Edit
                              </Button>
                              {ev.status !== "archived" ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={saving}
                                  onClick={() => void archive(ev.id)}
                                >
                                  Archive
                                </Button>
                              ) : null}
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
        </div>
      </main>
    </div>
  )
}
