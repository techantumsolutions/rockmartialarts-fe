"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ElementType,
  type ReactNode,
} from "react"
import { usePathname } from "next/navigation"
import {
  Archive,
  ArrowLeft,
  Calendar,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Eye,
  ImageIcon,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Users,
  X,
} from "lucide-react"
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
import { Switch } from "@/components/ui/switch"
import { AdminImageUpload } from "@/components/ui/AdminImageUpload"
import WeeklySlotTimePicker from "@/components/coaches/WeeklySlotTimePicker"
import {
  AdminBreadcrumb,
  AdminCard,
  AdminFilterBar,
  AdminPageHeader,
  AdminPageShell,
  AdminTableShell,
  adminOutlineBtnClass,
  adminPrimaryBtnClass,
} from "@/components/dashboard/AdminPageShell"
import { AdminStickyFormActions } from "@/components/dashboard/AdminStickyFormActions"
import { useToast } from "@/hooks/use-toast"
import { TokenManager } from "@/lib/tokenManager"
import { getBackendApiUrl } from "@/lib/config"
import { getActiveBranchId, useActiveBranch } from "@/lib/activeBranch"
import { resolvePublicAssetUrl } from "@/lib/resolvePublicAssetUrl"
import { cn } from "@/lib/utils"
import {
  ACADEMY_EVENT_REMINDER_OFFSETS,
  ACADEMY_EVENT_STATUSES,
  ACADEMY_EVENT_TYPES,
  academyEventAPI,
  academyEventStatusLabel,
  academyEventTypeLabel,
  batchesFromLegacyEvent,
  boundsFromAcademyEventBatches,
  formatAcademyEventBatchWhen,
  formatEventFee,
  newAcademyEventBatchId,
  type AcademyEvent,
  type AcademyEventBatch,
  type AcademyEventRegistrationField,
  type AcademyEventReminderLog,
} from "@/lib/academyEventAPI"

type PageMode = "list" | "form" | "view"
type BranchOpt = { id: string; name: string }

const PAGE_SIZE = 20

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

function emptyBatchRow(): AcademyEventBatch {
  return {
    id: newAcademyEventBatchId(),
    label: "",
    date: "",
    start_time: "",
    end_time: "",
  }
}

const EMPTY_FORM = {
  title: "",
  slug: "",
  event_type: "event",
  short_description: "",
  description: "",
  venue: "",
  venue_address: "",
  batches: [emptyBatchRow()] as AcademyEventBatch[],
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

const TYPE_BADGE: Record<string, string> = {
  workshop: "bg-purple-50 text-purple-700 border-purple-100",
  seminar: "bg-blue-50 text-blue-700 border-blue-100",
  event: "bg-amber-50 text-amber-800 border-amber-100",
}

function EventThumbnail({ url, title }: { url?: string | null; title: string }) {
  const src = resolvePublicAssetUrl(url)
  if (!src) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
        <ImageIcon className="h-4 w-4" />
      </div>
    )
  }
  return (
    <img
      src={src}
      alt=""
      className="h-10 w-10 shrink-0 rounded-lg border border-[#E8EAF0] object-cover"
      onError={(e) => {
        e.currentTarget.style.display = "none"
      }}
    />
  )
}

function formatEventSchedule(ev: AcademyEvent) {
  const slots = ev.batches?.length ? ev.batches : batchesFromLegacyEvent(ev)
  if (slots.length > 1) {
    const first = formatAcademyEventBatchWhen(slots[0])
    return {
      dateLine: `${slots.length} time slots`,
      timeLine: `${first}${slots.length > 1 ? " · …" : ""}`,
    }
  }
  if (slots.length === 1) {
    const line = formatAcademyEventBatchWhen(slots[0])
    const [datePart, timePart] = line.includes(", ")
      ? [line.split(", ")[0], line.split(", ").slice(1).join(", ")]
      : [line, line]
    return { dateLine: datePart, timeLine: timePart }
  }
  const start = ev.start_at
    ? new Date(ev.start_at).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—"
  if (!ev.end_at) return { dateLine: start.split(",")[0] || start, timeLine: start }
  const end = new Date(ev.end_at).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
  return {
    dateLine: start.split(",")[0] || start,
    timeLine: `${start} – ${end}`,
  }
}

function registrationDisplay(ev: AcademyEvent) {
  const count = ev.registrations_count ?? 0
  const cap = ev.capacity
  if (cap == null || cap < 1) {
    return { text: String(count), pct: null as number | null, color: "text-[#6B7280]" }
  }
  const pct = Math.round((count / cap) * 100)
  const color = pct >= 80 ? "text-orange-600" : "text-green-600"
  return { text: `${count} (${pct}%)`, pct, color }
}

function SectionCard({
  icon: Icon,
  title,
  subtitle,
  children,
  className,
}: {
  icon: ElementType
  title: string
  subtitle?: string
  children: ReactNode
  className?: string
}) {
  return (
    <AdminCard className={cn("border-[#E8EAF0]", className)}>
      <div className="mb-4 flex items-start gap-3 border-b border-[#E8EAF0] pb-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF8E1] text-[#C9971A]">
          <Icon className="h-5 w-5" strokeWidth={2.2} />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-[#2F3153]">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-sm text-[#6B7280]">{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </AdminCard>
  )
}

function formFromEvent(ev: AcademyEvent) {
  const batches = batchesFromLegacyEvent(ev)
  return {
    title: ev.title || "",
    slug: ev.slug || "",
    event_type: ev.event_type || "event",
    short_description: ev.short_description || "",
    description: ev.description || "",
    venue: ev.venue || "",
    venue_address: ev.venue_address || "",
    batches: batches.length ? batches : [emptyBatchRow()],
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
                    d.key === "participant_name" || d.key === "participant_phone"
                      ? true
                      : Boolean(found.required),
                }
              : { ...d }
          })
        : DEFAULT_REG_FIELDS.map((f) => ({ ...f })),
    reminders_enabled: ev.reminders_enabled !== false,
    reminder_offsets_hours:
      Array.isArray(ev.reminder_offsets_hours) && ev.reminder_offsets_hours.length
        ? [...ev.reminder_offsets_hours]
        : [24],
  }
}

export default function AcademyEventsAdminPage() {
  const { toast } = useToast()
  const pathname = usePathname()
  const { active: activeBranch } = useActiveBranch()
  const isBranchAdmin = pathname?.includes("/branch-admin") ?? false
  const isPartnerAdmin =
    (pathname?.includes("/partner-admin") || pathname?.startsWith("/partners/")) ?? false
  const fieldSpacingClass = isBranchAdmin || isPartnerAdmin ? "space-y-2" : "space-y-1.5"

  const sanitizeDateValue = (rawVal: string) => {
    if (!rawVal) return ""
    const cleaned = rawVal.replace(/^\+/, "")
    const match = cleaned.match(/^(\d{5,})-(\d{2}-\d{2})$/)
    if (match) {
      return `${match[1].slice(0, 4)}-${match[2]}`
    }
    return cleaned
  }

  const defaultBranchId = isBranchAdmin
    ? activeBranch?.id || getActiveBranchId() || ""
    : ""

  const [mode, setMode] = useState<PageMode>("list")
  const [events, setEvents] = useState<AcademyEvent[]>([])
  const [branches, setBranches] = useState<BranchOpt[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [branchFilter, setBranchFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [viewingEvent, setViewingEvent] = useState<AcademyEvent | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM, branch_id: defaultBranchId })
  const [reminderLogs, setReminderLogs] = useState<AcademyEventReminderLog[]>([])
  const [reminderBusy, setReminderBusy] = useState(false)
  const [regFieldsOpen, setRegFieldsOpen] = useState(true)

  const branchOptions =
    activeBranch && !branches.some((branch) => branch.id === activeBranch.id)
      ? [{ id: activeBranch.id, name: activeBranch.name }, ...branches]
      : branches
  const formBranchName =
    branchOptions.find((branch) => branch.id === form.branch_id)?.name ||
    (form.branch_id ? form.branch_id : activeBranch?.name || "No academy selected")

  const totalPages = Math.max(1, Math.ceil(events.length / PAGE_SIZE))
  const pageStart = (currentPage - 1) * PAGE_SIZE
  const pageEnd = Math.min(pageStart + PAGE_SIZE, events.length)
  const paginatedEvents = useMemo(
    () => events.slice(pageStart, pageEnd),
    [events, pageStart, pageEnd]
  )

  const viewThumb = resolvePublicAssetUrl(viewingEvent?.thumbnail_url)

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
        (Array.isArray(list) ? list : []).map((b: { id: string; name?: string; branch?: { name?: string } }) => ({
          id: b.id,
          name: b.branch?.name || b.name || b.id,
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
    if (!isBranchAdmin) return
    if (!defaultBranchId) return
    setBranchFilter(defaultBranchId)
    if (!editingId && mode === "form") {
      setForm((prev) => ({ ...prev, branch_id: defaultBranchId }))
    }
  }, [defaultBranchId, editingId, isBranchAdmin, mode])

  useEffect(() => {
    if (mode === "list") void load()
  }, [load, mode])

  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, typeFilter, branchFilter, search])

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

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

  const goToList = () => {
    setMode("list")
    setViewingEvent(null)
    setEditingId(null)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const startCreate = () => {
    setEditingId(null)
    setForm({ ...EMPTY_FORM, branch_id: defaultBranchId })
    setReminderLogs([])
    setMode("form")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const startEdit = (ev: AcademyEvent) => {
    setEditingId(ev.id)
    setForm(formFromEvent(ev))
    void loadReminderLogs(ev.id)
    setMode("form")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const openView = async (ev: AcademyEvent) => {
    setViewingEvent(ev)
    setMode("view")
    void loadReminderLogs(ev.id)
    try {
      const { event } = await academyEventAPI.get(ev.id)
      setViewingEvent(event)
    } catch {
      /* keep list row */
    }
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const exportCsv = () => {
    const headers = [
      "Title",
      "Slug",
      "Type",
      "Status",
      "Posted by",
      "Academy",
      "Partner org",
      "Venue",
      "Start",
      "End",
      "Fee INR",
      "Capacity",
      "Registrations",
    ]
    const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
    const rows = events.map((ev) =>
      [
        ev.title,
        ev.slug,
        ev.event_type || "",
        ev.status || "",
        ev.posted_by_academy || ev.branch_name || "",
        ev.branch_name || "",
        ev.partner_org_name || "",
        ev.venue || "",
        ev.start_at || "",
        ev.end_at || "",
        ev.fee_inr ?? 0,
        ev.capacity ?? "",
        ev.registrations_count ?? 0,
      ].map(escape).join(",")
    )
    const csv = [headers.map(escape).join(","), ...rows].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = `academy-events-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const handleSave = async (overrideStatus?: string) => {
    if (!form.title.trim()) {
      toast({ title: "Title required", variant: "destructive" })
      return
    }
    const normalizedBatches = form.batches.map((b) => ({
      id: b.id || newAcademyEventBatchId(),
      label: (b.label || "").trim() || undefined,
      date: (b.date || "").trim(),
      start_time: (b.start_time || "").trim().slice(0, 5),
      end_time: (b.end_time || "").trim().slice(0, 5),
    }))
    if (!normalizedBatches.length) {
      toast({ title: "Add at least one time slot", variant: "destructive" })
      return
    }
    for (let i = 0; i < normalizedBatches.length; i++) {
      const b = normalizedBatches[i]
      if (!b.date) {
        toast({
          title: "Date required",
          description: `Time slot ${i + 1} needs a date.`,
          variant: "destructive",
        })
        return
      }
      if (!b.start_time || !b.end_time) {
        toast({
          title: "Times required",
          description: `Time slot ${i + 1} needs start and end times.`,
          variant: "destructive",
        })
        return
      }
      if (b.end_time <= b.start_time) {
        toast({
          title: "Invalid time slot",
          description: `End time must be after start time for slot ${i + 1}.`,
          variant: "destructive",
        })
        return
      }
    }
    const { start_at, end_at } = boundsFromAcademyEventBatches(normalizedBatches)
    const fee = Number(form.fee_inr)
    if (!Number.isFinite(fee) || fee < 0) {
      toast({ title: "Invalid fee", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const capacityTrim = form.capacity.trim()
      const capacity = capacityTrim === "" ? null : Number(capacityTrim)
      if (capacity != null && (!Number.isFinite(capacity) || capacity < 1)) {
        toast({ title: "Invalid capacity", variant: "destructive" })
        setSaving(false)
        return
      }
      const statusToSave = overrideStatus ?? form.status
      const payload = {
        title: form.title.trim(),
        slug: form.slug.trim() || undefined,
        event_type: form.event_type,
        short_description: form.short_description.trim() || undefined,
        description: form.description.trim() || undefined,
        venue: form.venue.trim() || undefined,
        venue_address: form.venue_address.trim() || undefined,
        batches: normalizedBatches,
        start_at,
        end_at,
        branch_id: form.branch_id || undefined,
        fee_inr: fee,
        capacity,
        thumbnail_url: form.thumbnail_url.trim() || undefined,
        status: statusToSave,
        sort_order: Number(form.sort_order) || 100,
        seo_title: form.seo_title.trim() || undefined,
        seo_description: form.seo_description.trim() || undefined,
        registration_enabled: form.registration_enabled,
        registration_fields: form.registration_fields,
        reminders_enabled: form.reminders_enabled,
        reminder_offsets_hours:
          form.reminder_offsets_hours.length > 0 ? form.reminder_offsets_hours : [24],
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
      setForm({ ...EMPTY_FORM, branch_id: defaultBranchId })
      setMode("list")
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
      if (editingId === id) {
        setEditingId(null)
        setForm({ ...EMPTY_FORM, branch_id: defaultBranchId })
        goToList()
      } else if (viewingEvent?.id === id) {
        goToList()
      }
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

  const toggleListStatus = async (ev: AcademyEvent, publish: boolean) => {
    if (ev.status === "archived") return
    const next = publish ? "published" : "draft"
    setSaving(true)
    try {
      await academyEventAPI.update(ev.id, { status: next })
      toast({ title: publish ? "Event published" : "Moved to draft" })
      await load()
      if (viewingEvent?.id === ev.id) {
        setViewingEvent((prev) => (prev ? { ...prev, status: next } : prev))
      }
    } catch (e) {
      toast({
        title: "Status update failed",
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

  const registrationFieldsEditor = (
    <div className="space-y-2">
      <button
        type="button"
        className="flex w-full items-center justify-between text-left text-xs font-medium uppercase tracking-wide text-[#6B7280]"
        onClick={() => setRegFieldsOpen((v) => !v)}
      >
        Registration form fields
        <span className="text-[10px] normal-case">{regFieldsOpen ? "Hide" : "Show"}</span>
      </button>
      {regFieldsOpen ? (
        <div className="space-y-2 rounded-xl border border-[#E8EAF0] bg-gray-50/80 p-3">
          {form.registration_fields.map((f) => {
            const locked = f.key === "participant_name" || f.key === "participant_phone"
            return (
              <div
                key={f.key}
                className="flex flex-wrap items-center justify-between gap-2 text-sm"
              >
                <span className="text-[#4F5077]">{f.label}</span>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-[#6B7280]">
                    <input
                      type="checkbox"
                      checked={f.enabled}
                      disabled={locked}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          registration_fields: form.registration_fields.map((x) =>
                            x.key === f.key ? { ...x, enabled: e.target.checked } : x
                          ),
                        })
                      }
                    />
                    Show
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-[#6B7280]">
                    <input
                      type="checkbox"
                      checked={f.required}
                      disabled={locked || !f.enabled}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          registration_fields: form.registration_fields.map((x) =>
                            x.key === f.key ? { ...x, required: e.target.checked } : x
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
      ) : null}
    </div>
  )

  const reminderOffsetsEditor = (
    <div className="flex flex-wrap gap-2">
      {ACADEMY_EVENT_REMINDER_OFFSETS.map((h) => {
        const checked = form.reminder_offsets_hours.includes(h)
        return (
          <label
            key={h}
            className={cn(
              "inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs",
              checked
                ? "border-[#E1BB33] bg-amber-50/80 text-[#2F3153]"
                : "border-gray-200 text-[#6B7280]",
              !form.reminders_enabled && "opacity-50"
            )}
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
  )

  const reminderActionsEditor = editingId ? (
    <div className="space-y-2 border-t border-[#E8EAF0] pt-3">
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
          className={adminPrimaryBtnClass}
          disabled={reminderBusy || !form.reminders_enabled}
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
          {reminderBusy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
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
        <div className="max-h-40 space-y-1 overflow-y-auto text-xs">
          {reminderLogs.map((log) => (
            <div
              key={log.id}
              className="flex flex-wrap justify-between gap-1 border-b border-gray-100 pb-1 text-[#6B7280]"
            >
              <span>
                {log.participant_name || "—"} · {log.offset_hours}h · {log.status}
              </span>
              <span className="text-gray-400">
                {log.created_at ? new Date(log.created_at).toLocaleString() : ""}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-400">No reminder logs yet.</p>
      )}
    </div>
  ) : null

  const listView = (
    <>
      <AdminPageHeader
        icon={CalendarDays}
        title="Events, Seminars & Workshops – Events"
        subtitle="Manage all your events, seminars and workshops in one place."
        actions={
          <>
            <Button type="button" variant="outline" className={adminOutlineBtnClass} onClick={exportCsv}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button type="button" variant="outline" className={adminOutlineBtnClass} onClick={() => void load()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button type="button" className={adminPrimaryBtnClass} onClick={startCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add Event
            </Button>
          </>
        }
      />

      <AdminFilterBar className="mb-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            {ACADEMY_EVENT_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {ACADEMY_EVENT_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isBranchAdmin ? (
          <Input
            value={activeBranch?.name || "No academy selected"}
            readOnly
            aria-readonly="true"
            className="bg-[#F1F5F9]"
          />
        ) : (
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All academies" />
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
        )}
        <div className="relative min-w-0 w-full">
          <Search className="pointer-events-none absolute left-3 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 text-[#6B7280]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events by title, slug or venue..."
            className="pl-10"
          />
        </div>
      </AdminFilterBar>

      {error ? (
        <AdminCard className="mb-4 border-red-200 bg-red-50 text-sm text-red-700">{error}</AdminCard>
      ) : null}

      <AdminTableShell
        footer={
          events.length > 0 ? (
            <>
              <span>
                Showing {events.length === 0 ? 0 : pageStart + 1}–{pageEnd} of {events.length} events
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    size="sm"
                    variant={currentPage === page ? "default" : "outline"}
                    className={currentPage === page ? adminPrimaryBtnClass : undefined}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : undefined
        }
      >
        <table className="min-w-[1100px] w-full text-sm">
          <thead>
            <tr className="border-b border-[#E8EAF0] text-left text-xs font-medium uppercase tracking-wide text-[#6B7280]">
              <th className="px-4 py-3">Event Title</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Academy</th>
              <th className="px-4 py-3">Schedule</th>
              <th className="px-4 py-3">Fee</th>
              <th className="px-4 py-3">Capacity</th>
              <th className="px-4 py-3">Registrations</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-16 text-center text-[#6B7280]">
                  <Loader2 className="mr-2 inline h-5 w-5 animate-spin" />
                  Loading events…
                </td>
              </tr>
            ) : events.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-16 text-center text-[#6B7280]">
                  No events yet. Create an Event, Seminar, or Workshop.
                </td>
              </tr>
            ) : (
              paginatedEvents.map((ev) => {
                const sched = formatEventSchedule(ev)
                const reg = registrationDisplay(ev)
                const typeKey = ev.event_type || "event"
                return (
                  <tr key={ev.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-3">
                        <EventThumbnail url={ev.thumbnail_url} title={ev.title} />
                        <div className="min-w-0">
                          <div className="font-medium text-[#2F3153]">{ev.title}</div>
                          {ev.short_description ? (
                            <div className="line-clamp-2 text-xs text-[#6B7280]">{ev.short_description}</div>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={cn("text-xs font-medium", TYPE_BADGE[typeKey] || TYPE_BADGE.event)}
                      >
                        {academyEventTypeLabel(ev.event_type)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="inline-flex items-start gap-1 text-[#4F5077]">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#6B7280]" />
                        <div className="min-w-0">
                          <div className="font-medium">
                            {ev.posted_by_academy || ev.branch_name || "—"}
                          </div>
                          {ev.partner_org_name &&
                          ev.branch_name &&
                          ev.posted_by_academy !== ev.branch_name ? (
                            <div className="text-[11px] text-[#6B7280]">{ev.branch_name}</div>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-[#4F5077]">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-[#6B7280]" />
                        {sched.dateLine}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1 text-[#6B7280]">
                        <Clock className="h-3.5 w-3.5" />
                        {sched.timeLine}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#2F3153]">{formatEventFee(ev.fee_inr)}</td>
                    <td className="px-4 py-3 text-[#4F5077]">{ev.capacity ?? "—"}</td>
                    <td className={cn("px-4 py-3 font-medium", reg.color)}>{reg.text}</td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={cn("text-xs", STATUS_CLASS[ev.status || ""] || "")}
                      >
                        {academyEventStatusLabel(ev.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="h-8 w-8 rounded-lg"
                          onClick={() => void openView(ev)}
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="h-8 w-8 rounded-lg"
                          onClick={() => startEdit(ev)}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {ev.status !== "archived" ? (
                          <Switch
                            checked={ev.status === "published"}
                            disabled={saving}
                            onCheckedChange={(checked) => void toggleListStatus(ev, checked)}
                            title={ev.status === "published" ? "Unpublish" : "Publish"}
                          />
                        ) : null}
                        {ev.status !== "archived" ? (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-[#6B7280]"
                            disabled={saving}
                            onClick={() => void archive(ev.id)}
                            title="Archive"
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </AdminTableShell>
    </>
  )

  const formView = (
    <>
      <div className="mb-4 space-y-2">
        <AdminBreadcrumb
          items={[
            { label: "Events & Camps" },
            { label: "Events" },
            { label: editingId ? "Edit Event" : "Add Event" },
          ]}
        />
        <button
          type="button"
          onClick={goToList}
          className="inline-flex items-center gap-2 text-sm font-medium text-[#4F5077] hover:text-[#2F3153]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to list
        </button>
        <h1 className="text-xl font-bold text-[#2F3153]">{editingId ? "Edit Event" : "Add Event"}</h1>
      </div>

      <div className="admin-page-with-sticky-actions admin-stack">
        <SectionCard
          icon={CalendarDays}
          title="Event Details"
          subtitle="Basic information about the event."
        >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div className={fieldSpacingClass}>
                  <Label>Event Title</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Summer Sparring Seminar"
                    className="rounded-xl border-gray-200"
                  />
                </div>
                <div className={fieldSpacingClass}>
                  <Label>Event Type</Label>
                  <Select value={form.event_type} onValueChange={(v) => setForm({ ...form, event_type: v })}>
                    <SelectTrigger className="rounded-xl border-gray-200">
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
                <div className={fieldSpacingClass}>
                  <Label>Slug (optional)</Label>
                  <div className="flex overflow-hidden rounded-xl border border-gray-200">
                    <span className="flex items-center border-r border-gray-200 bg-gray-50 px-3 text-sm text-[#6B7280]">
                      /events/
                    </span>
                    <Input
                      value={form.slug}
                      onChange={(e) => setForm({ ...form, slug: e.target.value })}
                      placeholder="auto from title"
                      className="border-0 rounded-none focus-visible:ring-0"
                    />
                  </div>
                </div>
                <div className={cn(fieldSpacingClass, "md:col-span-2 xl:col-span-3")}>
                  <Label>Short description</Label>
                  <Input
                    value={form.short_description}
                    onChange={(e) => setForm({ ...form, short_description: e.target.value })}
                    className="rounded-xl border-gray-200"
                  />
                </div>
                <div className={cn(fieldSpacingClass, "md:col-span-2 xl:col-span-3")}>
                  <Label>Description</Label>
                  <div className="overflow-hidden rounded-xl border border-gray-200">
                    <div className="flex gap-1 border-b border-gray-100 bg-gray-50 px-2 py-1.5 text-[10px] text-[#6B7280]">
                      Plain text · line breaks preserved
                    </div>
                    <Textarea
                      rows={4}
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      className="min-h-[100px] resize-y border-0 rounded-none focus-visible:ring-0"
                    />
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              icon={CalendarDays}
              title="Event Batches / Time Slots"
              subtitle="Add one or more dates and times. Multiple slots can share the same day."
            >
              <div className="mb-4 space-y-3">
                {form.batches.map((batch, index) => (
                  <div
                    key={batch.id}
                    className="rounded-xl border border-[#E8EAF0] bg-[#FAFAFC] p-4"
                  >
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-[#2F3153]">
                        Time slot {index + 1}
                      </p>
                      {form.batches.length > 1 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 text-red-600 hover:text-red-700"
                          onClick={() =>
                            setForm({
                              ...form,
                              batches: form.batches.filter((b) => b.id !== batch.id),
                            })
                          }
                        >
                          <X className="mr-1 h-3.5 w-3.5" />
                          Remove
                        </Button>
                      ) : null}
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <div className={cn(fieldSpacingClass, "md:col-span-2 xl:col-span-4")}>
                        <Label className="text-xs font-medium text-[#4F5077]">
                          Label <span className="font-normal text-gray-400">(optional)</span>
                        </Label>
                        <Input
                          value={batch.label || ""}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              batches: form.batches.map((b) =>
                                b.id === batch.id ? { ...b, label: e.target.value } : b
                              ),
                            })
                          }
                          placeholder="e.g. Morning batch, Kids session"
                          className="rounded-xl border-gray-200 bg-white"
                        />
                      </div>
                      <div className={fieldSpacingClass}>
                        <Label className="text-xs font-medium text-[#4F5077]">
                          Date <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          type="date"
                          min="1900-01-01"
                          max="2099-12-31"
                          value={batch.date}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              batches: form.batches.map((b) =>
                                b.id === batch.id
                                  ? { ...b, date: sanitizeDateValue(e.target.value) }
                                  : b
                              ),
                            })
                          }
                          className="w-full rounded-xl border-gray-200 bg-white [color-scheme:light]"
                        />
                      </div>
                      <div className={fieldSpacingClass}>
                        <Label className="text-xs font-medium text-[#4F5077]">
                          Start time <span className="text-red-500">*</span>
                        </Label>
                        <WeeklySlotTimePicker
                          value={batch.start_time}
                          onChange={(value) =>
                            setForm({
                              ...form,
                              batches: form.batches.map((b) =>
                                b.id === batch.id ? { ...b, start_time: value } : b
                              ),
                            })
                          }
                          placeholder="--:-- --"
                          className="bg-white"
                        />
                      </div>
                      <div className={fieldSpacingClass}>
                        <Label className="text-xs font-medium text-[#4F5077]">
                          End time <span className="text-red-500">*</span>
                        </Label>
                        <WeeklySlotTimePicker
                          value={batch.end_time}
                          onChange={(value) =>
                            setForm({
                              ...form,
                              batches: form.batches.map((b) =>
                                b.id === batch.id ? { ...b, end_time: value } : b
                              ),
                            })
                          }
                          placeholder="--:-- --"
                          className="bg-white"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl border-[#E1BB33] bg-[#FFF8E1] text-[#2F3153] hover:bg-[#E1BB33]/20"
                  onClick={() =>
                    setForm({
                      ...form,
                      batches: [...form.batches, emptyBatchRow()],
                    })
                  }
                >
                  <Plus className="mr-2 h-4 w-4 text-[#C9971A]" />
                  Add time slot
                </Button>
              </div>
            </SectionCard>

            <SectionCard
              icon={MapPin}
              title="Venue"
              subtitle="Where the event will take place."
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div className={fieldSpacingClass}>
                  <Label>Venue</Label>
                  <Input
                    value={form.venue}
                    onChange={(e) => setForm({ ...form, venue: e.target.value })}
                    placeholder="Hall / dojo name"
                    className="rounded-xl border-gray-200"
                  />
                </div>
                <div className={cn(fieldSpacingClass, "md:col-span-2 xl:col-span-1")}>
                  <Label>Academy</Label>
                  {isBranchAdmin ? (
                    <Input value={formBranchName} readOnly aria-readonly="true" className="rounded-xl bg-gray-50" />
                  ) : (
                    <Select
                      value={form.branch_id || "none"}
                      onValueChange={(v) => setForm({ ...form, branch_id: v === "none" ? "" : v })}
                    >
                      <SelectTrigger className="rounded-xl border-gray-200">
                        <SelectValue placeholder="Optional academy" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No branch</SelectItem>
                        {branchOptions.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className={cn(fieldSpacingClass, "md:col-span-2 xl:col-span-3")}>
                  <Label>Venue address</Label>
                  <Input
                    value={form.venue_address}
                    onChange={(e) => setForm({ ...form, venue_address: e.target.value })}
                    className="rounded-xl border-gray-200"
                  />
                </div>
                  <div className={fieldSpacingClass}>
                    <Label>Fee (INR)</Label>
                    <div className="flex overflow-hidden rounded-xl border border-gray-200">
                      <span className="flex items-center border-r border-gray-200 bg-gray-50 px-3 text-sm text-[#6B7280]">
                        ₹
                      </span>
                      <Input
                        type="number"
                        min={0}
                        value={form.fee_inr}
                        onChange={(e) => setForm({ ...form, fee_inr: e.target.value })}
                        className="border-0 rounded-none"
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-400">0 = free</p>
                  </div>
                  <div className={fieldSpacingClass}>
                    <Label>Capacity</Label>
                    <Input
                      type="number"
                      min={1}
                      value={form.capacity}
                      onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                      placeholder="Unlimited"
                      className="rounded-xl border-gray-200"
                    />
                  </div>
              </div>
            </SectionCard>

            <SectionCard icon={Search} title="SEO & Ordering">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div className={fieldSpacingClass}>
                  <Label>Sort order</Label>
                  <Input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
                    className="rounded-xl border-gray-200"
                  />
                </div>
                <div className={cn(fieldSpacingClass, "md:col-span-1 xl:col-span-2")}>
                  <Label>SEO title</Label>
                  <Input
                    value={form.seo_title}
                    onChange={(e) => setForm({ ...form, seo_title: e.target.value })}
                    className="rounded-xl border-gray-200"
                  />
                </div>
                <div className={cn(fieldSpacingClass, "md:col-span-2 xl:col-span-3")}>
                  <Label>SEO description</Label>
                  <Textarea
                    rows={2}
                    value={form.seo_description}
                    onChange={(e) => setForm({ ...form, seo_description: e.target.value })}
                    className="rounded-xl border-gray-200"
                  />
                </div>
              </div>
            </SectionCard>

        <SectionCard icon={ImageIcon} title="Event Image">
          <AdminImageUpload
            label="Event thumbnail"
            shape="wide"
            value={form.thumbnail_url}
            onChange={(url) => setForm({ ...form, thumbnail_url: url })}
            onClear={() => setForm({ ...form, thumbnail_url: "" })}
            helperText="Recommended: 1280 x 720 px (JPG, PNG)"
          />
        </SectionCard>

        <SectionCard icon={Users} title="Registration Settings">
          <div className="space-y-4">
            <label className="flex items-center justify-between gap-2 text-sm text-[#2F3153]">
              Registration open
              <Switch
                checked={form.registration_enabled}
                onCheckedChange={(v) => setForm({ ...form, registration_enabled: v })}
              />
            </label>
            {registrationFieldsEditor}
            <div className="space-y-3 border-t border-[#E8EAF0] pt-3">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs uppercase tracking-wide text-[#6B7280]">
                  SMS event reminders
                </Label>
                <Switch
                  checked={form.reminders_enabled}
                  onCheckedChange={(v) => setForm({ ...form, reminders_enabled: v })}
                />
              </div>
              <p className="text-xs text-[#6B7280]">
                Confirmed registrants with a phone receive SMS before the event start (hours selected
                below).
              </p>
              {reminderOffsetsEditor}
              {reminderActionsEditor}
            </div>
          </div>
        </SectionCard>

        <AdminCard className="border-[#E8EAF0]">
          <div className={fieldSpacingClass}>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger className="rounded-xl border-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACADEMY_EVENT_STATUSES.filter((s) => s.value !== "archived").map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </AdminCard>
      </div>

      <AdminStickyFormActions>
        <Button type="button" variant="outline" className={adminOutlineBtnClass} onClick={goToList}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={saving}
          onClick={() => void handleSave("draft")}
        >
          Save as Draft
        </Button>
        <Button type="button" className={adminPrimaryBtnClass} disabled={saving} onClick={() => void handleSave()}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
          Save Event
        </Button>
      </AdminStickyFormActions>
    </>
  )

  const detailEvent = viewingEvent

  const viewOccupancy =
    detailEvent?.capacity != null && detailEvent.capacity > 0
      ? Math.min(100, Math.round(((detailEvent.registrations_count ?? 0) / detailEvent.capacity) * 100))
      : null

  const detailView = detailEvent ? (
    <>
      <div>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <AdminBreadcrumb
              items={[{ label: "Events & Camps" }, { label: "Events" }, { label: "View Event" }]}
            />
            <button
              type="button"
              onClick={goToList}
              className="inline-flex items-center gap-2 text-sm font-medium text-[#4F5077] hover:text-[#2F3153]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to List
            </button>
            <h1 className="text-xl font-bold text-[#2F3153]">View Event</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className={adminOutlineBtnClass} onClick={() => startEdit(detailEvent)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit Event
            </Button>
            {detailEvent.status !== "archived" ? (
              <Button
                type="button"
                className={adminPrimaryBtnClass}
                disabled={saving}
                onClick={() => void archive(detailEvent.id)}
              >
                <Archive className="mr-2 h-4 w-4" />
                Archive
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="admin-stack">
        <AdminCard className="border-[#E8EAF0]">
              <div className="flex flex-col gap-4 sm:flex-row">
                {viewThumb ? (
                  <img
                    src={viewThumb}
                    alt=""
                    className="h-28 w-40 shrink-0 rounded-xl border border-[#E8EAF0] object-cover"
                  />
                ) : (
                  <div className="flex h-28 w-40 shrink-0 items-center justify-center rounded-xl bg-gray-100">
                    <ImageIcon className="h-8 w-8 text-gray-400" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold text-[#2F3153]">{detailEvent.title}</h2>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="outline" className={TYPE_BADGE[detailEvent.event_type || "event"]}>
                      {academyEventTypeLabel(detailEvent.event_type)}
                    </Badge>
                    <Badge variant="outline" className={STATUS_CLASS[detailEvent.status || ""] || ""}>
                      {academyEventStatusLabel(detailEvent.status)}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-4 text-sm text-[#4F5077]">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-4 w-4 text-[#6B7280]" />
                      {detailEvent.venue || detailEvent.branch_name || "—"}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-[#6B7280]" />
                      {detailEvent.start_at
                        ? new Date(detailEvent.start_at).toLocaleDateString()
                        : "—"}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-4 w-4 text-[#6B7280]" />
                      {detailEvent.start_at
                        ? new Date(detailEvent.start_at).toLocaleTimeString(undefined, {
                            timeStyle: "short",
                          })
                        : "—"}
                    </span>
                    <span>{formatEventFee(detailEvent.fee_inr)}</span>
                    <span>Cap: {detailEvent.capacity ?? "∞"}</span>
                  </div>
                </div>
              </div>
            </AdminCard>

            <SectionCard icon={CalendarDays} title="Event Details">
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-xs font-medium uppercase text-[#6B7280]">Title</dt>
                  <dd className="text-[#2F3153]">{detailEvent.title}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase text-[#6B7280]">Slug</dt>
                  <dd>
                    {detailEvent.status === "published" && detailEvent.slug ? (
                      <a href={`/events/${detailEvent.slug}`} className="text-[#C9971A] hover:underline">
                        /events/{detailEvent.slug}
                      </a>
                    ) : (
                      <span className="text-[#4F5077]">{detailEvent.slug || "—"}</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase text-[#6B7280]">Short description</dt>
                  <dd className="text-[#4F5077]">{detailEvent.short_description || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase text-[#6B7280]">Description</dt>
                  <dd className="whitespace-pre-wrap text-[#4F5077]">{detailEvent.description || "—"}</dd>
                </div>
              </dl>
            </SectionCard>

            <SectionCard icon={CalendarDays} title="Event Batches / Time Slots">
              {(detailEvent.batches?.length
                ? detailEvent.batches
                : batchesFromLegacyEvent(detailEvent)
              ).length ? (
                <ul className="space-y-2 text-sm text-[#2F3153]">
                  {(detailEvent.batches?.length
                    ? detailEvent.batches
                    : batchesFromLegacyEvent(detailEvent)
                  ).map((batch) => (
                    <li
                      key={batch.id}
                      className="flex items-start gap-2 rounded-lg border border-[#E8EAF0] bg-[#FAFAFC] px-3 py-2"
                    >
                      <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[#C9971A]" />
                      <span>{formatAcademyEventBatchWhen(batch)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[#6B7280]">—</p>
              )}
              <dl className="mt-4 grid gap-3 border-t border-[#E8EAF0] pt-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-[#6B7280]">Earliest start</dt>
                  <dd className="text-[#2F3153]">
                    {detailEvent.start_at ? new Date(detailEvent.start_at).toLocaleString() : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[#6B7280]">Latest end</dt>
                  <dd className="text-[#2F3153]">
                    {detailEvent.end_at ? new Date(detailEvent.end_at).toLocaleString() : "—"}
                  </dd>
                </div>
              </dl>
            </SectionCard>

            <SectionCard icon={MapPin} title="Venue">
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-[#6B7280]">Venue</dt>
                  <dd className="text-[#2F3153]">{detailEvent.venue || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[#6B7280]">Address</dt>
                  <dd className="text-[#2F3153]">{detailEvent.venue_address || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[#6B7280]">Posted by</dt>
                  <dd className="text-[#2F3153]">
                    {detailEvent.posted_by_academy || detailEvent.branch_name || "—"}
                  </dd>
                  {detailEvent.partner_org_name ? (
                    <>
                      <dt className="text-xs text-[#6B7280]">Partner org</dt>
                      <dd className="text-[#2F3153]">{detailEvent.partner_org_name}</dd>
                    </>
                  ) : null}
                  {detailEvent.branch_name ? (
                    <>
                      <dt className="text-xs text-[#6B7280]">Academy</dt>
                      <dd className="text-[#2F3153]">{detailEvent.branch_name}</dd>
                    </>
                  ) : null}
                </div>
              </dl>
            </SectionCard>

            <SectionCard icon={Users} title="Pricing & Capacity">
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-[#6B7280]">Fee</dt>
                  <dd className="text-[#2F3153]">{formatEventFee(detailEvent.fee_inr)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[#6B7280]">Capacity</dt>
                  <dd className="text-[#2F3153]">{detailEvent.capacity ?? "Unlimited"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[#6B7280]">Registration</dt>
                  <dd className="text-[#2F3153]">
                    {detailEvent.registration_enabled !== false ? "Open" : "Closed"}
                  </dd>
                </div>
              </dl>
            </SectionCard>

            <SectionCard icon={Search} title="SEO & Ordering">
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-xs text-[#6B7280]">Sort order</dt>
                  <dd className="text-[#2F3153]">{detailEvent.sort_order ?? 100}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[#6B7280]">SEO title</dt>
                  <dd className="text-[#2F3153]">{detailEvent.seo_title || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[#6B7280]">SEO description</dt>
                  <dd className="text-[#4F5077]">{detailEvent.seo_description || "—"}</dd>
                </div>
              </dl>
            </SectionCard>

        <SectionCard icon={ImageIcon} title="Event Image">
              {viewThumb ? (
                <img src={viewThumb} alt="" className="w-full rounded-xl border border-[#E8EAF0] object-cover" />
              ) : (
                <p className="text-sm text-[#6B7280]">No thumbnail</p>
              )}
              {detailEvent.thumbnail_url ? (
                <p className="mt-2 truncate text-xs text-[#6B7280]">{detailEvent.thumbnail_url}</p>
              ) : null}
            </SectionCard>

            <SectionCard icon={Users} title="Registration & Settings">
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[#4F5077]">Registration open</span>
                  <Switch checked={detailEvent.registration_enabled !== false} disabled />
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium uppercase text-[#6B7280]">Form fields</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(detailEvent.registration_fields || DEFAULT_REG_FIELDS)
                      .filter((f) => f.enabled !== false)
                      .map((f) => (
                        <Badge key={f.key} variant="outline" className="text-xs">
                          {f.label}
                          {f.required ? " *" : ""}
                        </Badge>
                      ))}
                  </div>
                </div>
                <div>
                  <p className="text-[#4F5077]">SMS reminders</p>
                  <p className="text-xs text-[#6B7280]">
                    {detailEvent.reminders_enabled !== false ? "Enabled" : "Disabled"}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {(detailEvent.reminder_offsets_hours || [24]).map((h) => (
                      <Badge key={h} variant="outline" className="border-amber-200 bg-amber-50 text-xs">
                        {h}h
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-[#6B7280]">Status</p>
                  <Badge variant="outline" className={STATUS_CLASS[detailEvent.status || ""] || ""}>
                    {academyEventStatusLabel(detailEvent.status)}
                  </Badge>
                </div>
              </div>
            </SectionCard>

            <SectionCard icon={Users} title="Performance">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-[#6B7280]">Registered</span>
                  <span className="font-semibold text-[#2F3153]">
                    {detailEvent.registrations_count ?? 0}
                    {detailEvent.capacity != null ? ` / ${detailEvent.capacity}` : ""}
                  </span>
                </div>
                {viewOccupancy != null ? (
                  <div>
                    <div className="mb-1 flex justify-between text-xs text-[#6B7280]">
                      <span>Occupancy</span>
                      <span>{viewOccupancy}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          viewOccupancy >= 80 ? "bg-orange-500" : "bg-green-500"
                        )}
                        style={{ width: `${viewOccupancy}%` }}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </SectionCard>

            <SectionCard icon={Clock} title="Reminder logs">
              <div className="mb-2 flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => detailEvent && void loadReminderLogs(detailEvent.id)}
                >
                  Refresh logs
                </Button>
              </div>
              {reminderLogs.length > 0 ? (
                <div className="max-h-48 space-y-2 overflow-y-auto text-xs text-[#6B7280]">
                  {reminderLogs.map((log) => (
                    <p key={log.id}>
                      {log.participant_name || "—"} · {log.offset_hours}h · {log.status}
                      {log.created_at ? ` · ${new Date(log.created_at).toLocaleString()}` : ""}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400">No reminder logs yet.</p>
              )}
            </SectionCard>
      </div>
    </>
  ) : null

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="w-full max-w-none p-4 lg:px-8 lg:py-6">
        <AdminPageShell>
          {mode === "list" && listView}
          {mode === "form" && formView}
          {mode === "view" && (detailView || listView)}
        </AdminPageShell>
      </main>
    </div>
  )
}