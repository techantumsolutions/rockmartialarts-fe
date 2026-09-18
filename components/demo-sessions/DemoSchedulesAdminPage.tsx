"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, Plus, RefreshCw, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { TokenManager } from "@/lib/tokenManager"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"
import { getBackendApiUrl } from "@/lib/config"
import {
  DEFAULT_DEMO_FEE_INR,
  DEMO_WEEKDAYS,
  demoScheduleAPI,
  weekdayLabels,
  type DemoRecurrence,
  type DemoSchedule,
} from "@/lib/demoScheduleAPI"

type Opt = { id: string; name: string }

type FormState = {
  title: string
  branch_id: string
  course_id: string
  recurrence: DemoRecurrence
  weekdays: string[]
  start_time: string
  end_time: string
  capacity: string
  fee_inr: string
  effective_from: string
  effective_until: string
  is_active: boolean
  notes: string
}

const emptyForm = (): FormState => ({
  title: "",
  branch_id: "",
  course_id: "",
  recurrence: "weekly",
  weekdays: ["saturday"],
  start_time: "10:00",
  end_time: "11:00",
  capacity: "10",
  fee_inr: String(DEFAULT_DEMO_FEE_INR),
  effective_from: "",
  effective_until: "",
  is_active: true,
  notes: "",
})

function formFromSchedule(s: DemoSchedule): FormState {
  return {
    title: s.title || "",
    branch_id: s.branch_id,
    course_id: s.course_id,
    recurrence: s.recurrence || "weekly",
    weekdays: s.weekdays?.length ? [...s.weekdays] : ["saturday"],
    start_time: s.start_time || "10:00",
    end_time: s.end_time || "11:00",
    capacity: s.capacity != null ? String(s.capacity) : "",
    fee_inr: String(s.fee_inr ?? DEFAULT_DEMO_FEE_INR),
    effective_from: s.effective_from || "",
    effective_until: s.effective_until || "",
    is_active: !!s.is_active,
    notes: s.notes || "",
  }
}

export default function DemoSchedulesAdminPage() {
  const { toast } = useToast()
  const [rows, setRows] = useState<DemoSchedule[]>([])
  const [total, setTotal] = useState(0)
  const [skip, setSkip] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [branchFilter, setBranchFilter] = useState("all")
  const [courseFilter, setCourseFilter] = useState("all")
  const [activeFilter, setActiveFilter] = useState("all")
  const [branches, setBranches] = useState<Opt[]>([])
  const [courses, setCourses] = useState<Opt[]>([])
  const limit = 25

  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<DemoSchedule | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)

  const ensureAuth = () => {
    const token = BranchManagerAuth.getToken() || TokenManager.getToken()
    if (!token) {
      setError("Not authenticated")
      return null
    }
    return token
  }

  const load = useCallback(async () => {
    if (!ensureAuth()) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await demoScheduleAPI.list({
        branch_id: branchFilter !== "all" ? branchFilter : undefined,
        course_id: courseFilter !== "all" ? courseFilter : undefined,
        is_active:
          activeFilter === "all" ? undefined : activeFilter === "active",
        search: search.trim() || undefined,
        skip,
        limit,
      })
      setRows(data.schedules || [])
      setTotal(typeof data.total === "number" ? data.total : data.schedules?.length || 0)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load demo schedules")
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [skip, search, branchFilter, courseFilter, activeFilter])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const token = BranchManagerAuth.getToken() || TokenManager.getToken()
    if (!token) return
    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }

    fetch(getBackendApiUrl("branches?skip=0&limit=200"), { headers, cache: "no-store" })
      .then((res) => (res.ok ? res.json() : Promise.resolve({ branches: [] })))
      .then((data) => {
        const list = data.branches || data || []
        setBranches(
          (Array.isArray(list) ? list : []).map(
            (b: { id: string; name?: string; branch?: { name?: string } }) => ({
              id: b.id,
              name: b.branch?.name || b.name || b.id,
            })
          )
        )
      })
      .catch(() => setBranches([]))

    fetch(getBackendApiUrl("courses?skip=0&limit=200"), { headers, cache: "no-store" })
      .then((res) => (res.ok ? res.json() : Promise.resolve({ courses: [] })))
      .then((data) => {
        const list = data.courses || data || []
        setCourses(
          (Array.isArray(list) ? list : []).map(
            (c: { id: string; name?: string; title?: string }) => ({
              id: c.id,
              name: c.name || c.title || c.id,
            })
          )
        )
      })
      .catch(() => setCourses([]))
  }, [])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm())
    setEditorOpen(true)
  }

  const openEdit = (row: DemoSchedule) => {
    setEditing(row)
    setForm(formFromSchedule(row))
    setEditorOpen(true)
  }

  const toggleWeekday = (day: string) => {
    setForm((prev) => {
      const has = prev.weekdays.includes(day)
      return {
        ...prev,
        weekdays: has ? prev.weekdays.filter((d) => d !== day) : [...prev.weekdays, day],
      }
    })
  }

  const save = async () => {
    if (!form.branch_id || !form.course_id) {
      toast({ title: "Branch and course are required", variant: "destructive" })
      return
    }
    if (!form.start_time || !form.end_time) {
      toast({ title: "Start and end time are required", variant: "destructive" })
      return
    }
    if (form.recurrence === "weekly" && form.weekdays.length === 0) {
      toast({ title: "Select at least one weekday", variant: "destructive" })
      return
    }

    const fee = Number(form.fee_inr)
    if (Number.isNaN(fee) || fee < 0) {
      toast({ title: "Enter a valid fee", variant: "destructive" })
      return
    }

    const capacityRaw = form.capacity.trim()
    const capacity =
      capacityRaw === "" ? null : Number(capacityRaw)
    if (capacityRaw !== "" && (capacity == null || Number.isNaN(capacity) || capacity < 1)) {
      toast({ title: "Capacity must be a positive number or empty", variant: "destructive" })
      return
    }

    setSaving(true)
    try {
      const payload = {
        title: form.title.trim() || null,
        branch_id: form.branch_id,
        course_id: form.course_id,
        recurrence: form.recurrence,
        weekdays: form.recurrence === "weekly" ? form.weekdays : [],
        start_time: form.start_time,
        end_time: form.end_time,
        fee_inr: fee,
        effective_from: form.effective_from || null,
        is_active: form.is_active,
        notes: form.notes.trim() || null,
        ...(form.effective_until
          ? { effective_until: form.effective_until }
          : editing
            ? { clear_effective_until: true }
            : {}),
        ...(capacity == null
          ? editing
            ? { clear_capacity: true }
            : {}
          : { capacity }),
      }

      if (editing) {
        await demoScheduleAPI.update(editing.id, payload)
        toast({ title: "Schedule updated" })
      } else {
        await demoScheduleAPI.create({
          ...payload,
          capacity: capacity ?? undefined,
        })
        toast({ title: "Schedule created" })
      }
      setEditorOpen(false)
      setEditing(null)
      await load()
    } catch (e) {
      toast({
        title: e instanceof Error ? e.message : "Save failed",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const deactivate = async (row: DemoSchedule) => {
    if (!window.confirm(`Deactivate demo schedule for ${row.course_name || "course"}?`)) return
    try {
      await demoScheduleAPI.deactivate(row.id)
      toast({ title: "Schedule deactivated" })
      await load()
    } catch (e) {
      toast({
        title: e instanceof Error ? e.message : "Deactivate failed",
        variant: "destructive",
      })
    }
  }

  const reactivate = async (row: DemoSchedule) => {
    try {
      await demoScheduleAPI.update(row.id, { is_active: true })
      toast({ title: "Schedule activated" })
      await load()
    } catch (e) {
      toast({
        title: e instanceof Error ? e.message : "Activate failed",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Demo schedules</h1>
            <p className="text-gray-600 text-sm">
              Configure recurring demo availability by branch and course (fee default ₹
              {DEFAULT_DEMO_FEE_INR}).{" "}
              <a
                href="/book-demo"
                target="_blank"
                rel="noreferrer"
                className="text-amber-700 hover:underline"
              >
                Preview public slots
              </a>
              {" · "}
              <a href="demo-bookings" className="text-amber-700 hover:underline">
                View bookings
              </a>
            </p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => load()} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              type="button"
              className="bg-yellow-400 hover:bg-yellow-500 text-white"
              onClick={openCreate}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add schedule
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Schedules ({total})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              className="flex flex-col gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                setSkip(0)
                setSearch(searchInput)
              }}
            >
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search title, branch, course…"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button type="submit" className="bg-yellow-400 hover:bg-yellow-500 text-white">
                  Search
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Select
                  value={branchFilter}
                  onValueChange={(v) => {
                    setSkip(0)
                    setBranchFilter(v)
                  }}
                >
                  <SelectTrigger className="h-10 bg-white">
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
                <Select
                  value={courseFilter}
                  onValueChange={(v) => {
                    setSkip(0)
                    setCourseFilter(v)
                  }}
                >
                  <SelectTrigger className="h-10 bg-white">
                    <SelectValue placeholder="All courses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All courses</SelectItem>
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={activeFilter}
                  onValueChange={(v) => {
                    setSkip(0)
                    setActiveFilter(v)
                  }}
                >
                  <SelectTrigger className="h-10 bg-white">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </form>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {loading ? (
              <p className="text-gray-500 text-sm py-8 text-center">Loading…</p>
            ) : rows.length === 0 ? (
              <p className="text-gray-500 text-sm py-8 text-center">No demo schedules found.</p>
            ) : (
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-100 text-gray-700">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Branch</th>
                      <th className="px-3 py-2 font-semibold">Course</th>
                      <th className="px-3 py-2 font-semibold">Recurrence</th>
                      <th className="px-3 py-2 font-semibold">Time</th>
                      <th className="px-3 py-2 font-semibold">Capacity</th>
                      <th className="px-3 py-2 font-semibold">Fee</th>
                      <th className="px-3 py-2 font-semibold">Status</th>
                      <th className="px-3 py-2 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id} className="border-t hover:bg-yellow-50">
                        <td className="px-3 py-2">
                          <div className="font-medium">{row.branch_name || "—"}</div>
                          {row.title ? (
                            <div className="text-xs text-gray-500">{row.title}</div>
                          ) : null}
                        </td>
                        <td className="px-3 py-2">{row.course_name || "—"}</td>
                        <td className="px-3 py-2">
                          <div className="capitalize">{row.recurrence}</div>
                          <div className="text-xs text-gray-500">
                            {row.recurrence === "daily"
                              ? "Every day"
                              : weekdayLabels(row.weekdays)}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          {row.start_time} – {row.end_time}
                        </td>
                        <td className="px-3 py-2">
                          {row.capacity != null ? row.capacity : "Unlimited"}
                        </td>
                        <td className="px-3 py-2">₹{row.fee_inr ?? DEFAULT_DEMO_FEE_INR}</td>
                        <td className="px-3 py-2">
                          <Badge
                            variant="outline"
                            className={
                              row.is_active
                                ? "bg-green-50 text-green-800 border-green-200"
                                : "bg-slate-100 text-slate-600 border-slate-200"
                            }
                          >
                            {row.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => openEdit(row)}
                            >
                              Edit
                            </Button>
                            {row.is_active ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => deactivate(row)}
                              >
                                Deactivate
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => reactivate(row)}
                              >
                                Activate
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {total > limit ? (
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  disabled={skip === 0}
                  onClick={() => setSkip(Math.max(0, skip - limit))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  disabled={skip + limit >= total}
                  onClick={() => setSkip(skip + limit)}
                >
                  Next
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {editorOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => {
            if (!saving) setEditorOpen(false)
          }}
        >
          <div
            className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start gap-4">
              <div>
                <h2 className="text-xl font-bold">
                  {editing ? "Edit demo schedule" : "Add demo schedule"}
                </h2>
                <p className="text-sm text-gray-600">
                  Set branch, course, recurrence, timing, capacity and fee
                </p>
              </div>
              <Button variant="outline" onClick={() => setEditorOpen(false)} disabled={saving}>
                Close
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <Label>Title (optional)</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Weekend intro demo"
                />
              </div>
              <div className="space-y-1">
                <Label>Branch *</Label>
                <Select
                  value={form.branch_id || undefined}
                  onValueChange={(v) => setForm((f) => ({ ...f, branch_id: v }))}
                >
                  <SelectTrigger className="bg-white">
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
              <div className="space-y-1">
                <Label>Course *</Label>
                <Select
                  value={form.course_id || undefined}
                  onValueChange={(v) => setForm((f) => ({ ...f, course_id: v }))}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Recurrence *</Label>
                <Select
                  value={form.recurrence}
                  onValueChange={(v: DemoRecurrence) =>
                    setForm((f) => ({ ...f, recurrence: v }))
                  }
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Fee (₹) *</Label>
                <Input
                  type="number"
                  min={0}
                  step="1"
                  value={form.fee_inr}
                  onChange={(e) => setForm((f) => ({ ...f, fee_inr: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Start time *</Label>
                <Input
                  type="time"
                  value={form.start_time}
                  onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>End time *</Label>
                <Input
                  type="time"
                  value={form.end_time}
                  onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Capacity (optional)</Label>
                <Input
                  type="number"
                  min={1}
                  placeholder="Unlimited if empty"
                  value={form.capacity}
                  onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
                />
              </div>
              <div className="space-y-1 flex items-end pb-2">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={form.is_active}
                    onCheckedChange={(c) =>
                      setForm((f) => ({ ...f, is_active: c === true }))
                    }
                  />
                  Active
                </label>
              </div>
              {form.recurrence === "weekly" ? (
                <div className="sm:col-span-2 space-y-2">
                  <Label>Weekdays *</Label>
                  <div className="flex flex-wrap gap-3">
                    {DEMO_WEEKDAYS.map((d) => (
                      <label key={d.value} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={form.weekdays.includes(d.value)}
                          onCheckedChange={() => toggleWeekday(d.value)}
                        />
                        {d.label}
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="space-y-1">
                <Label>Effective from</Label>
                <Input
                  type="date"
                  value={form.effective_from}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, effective_from: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Effective until</Label>
                <Input
                  type="date"
                  value={form.effective_until}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, effective_until: e.target.value }))
                  }
                />
              </div>
              <div className="sm:col-span-2 space-y-1">
                <Label>Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => setEditorOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-yellow-400 hover:bg-yellow-500 text-white"
                disabled={saving}
                onClick={save}
              >
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {editing ? "Save changes" : "Create schedule"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
