"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, Plus, RefreshCw, Save, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { learningCourseAPI, type LearningCourse } from "@/lib/learningCourseAPI"
import {
  LEARNING_PLAN_KINDS,
  formatInr,
  learningPlanKindLabel,
  learningSubscriptionAPI,
  type LearningSubscriptionPlan,
} from "@/lib/learningSubscriptionAPI"

const EMPTY_FORM = {
  course_id: "",
  name: "",
  description: "",
  plan_kind: "3_month",
  fee_inr: "2999",
  duration_days: "90",
  grace_period_days: "7",
  is_lifetime: false,
  is_active: true,
  sort_order: "10",
}

export default function LearningSubscriptionPlansAdminPage() {
  const { toast } = useToast()
  const [courses, setCourses] = useState<LearningCourse[]>([])
  const [plans, setPlans] = useState<LearningSubscriptionPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [courseFilter, setCourseFilter] = useState("all")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })

  const loadCourses = useCallback(async () => {
    try {
      const data = await learningCourseAPI.listAdmin({ status: "all", limit: 200 })
      setCourses(data.courses || [])
    } catch {
      /* ignore — plan page still usable with course id */
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await learningSubscriptionAPI.listPlans({
        course_id: courseFilter === "all" ? undefined : courseFilter,
        active_only: false,
      })
      setPlans(data.plans || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load plans")
    } finally {
      setLoading(false)
    }
  }, [courseFilter])

  useEffect(() => {
    loadCourses()
  }, [loadCourses])

  useEffect(() => {
    load()
  }, [load])

  const courseTitle = (id: string) =>
    courses.find((c) => c.id === id)?.title || id.slice(0, 8)

  const applyKindDefaults = (kind: string) => {
    if (kind === "3_month") {
      setForm((f) => ({
        ...f,
        plan_kind: kind,
        name: f.name || "3-Month Access",
        duration_days: "90",
        grace_period_days: "7",
        is_lifetime: false,
        fee_inr: f.fee_inr || "2999",
        sort_order: "10",
      }))
    } else if (kind === "lifetime") {
      setForm((f) => ({
        ...f,
        plan_kind: kind,
        name: f.name || "Lifetime Access",
        duration_days: "36500",
        grace_period_days: "0",
        is_lifetime: true,
        fee_inr: f.fee_inr || "9999",
        sort_order: "20",
      }))
    } else {
      setForm((f) => ({ ...f, plan_kind: kind }))
    }
  }

  const startCreate = () => {
    setEditingId(null)
    setForm({
      ...EMPTY_FORM,
      course_id: courseFilter !== "all" ? courseFilter : "",
    })
  }

  const startEdit = (p: LearningSubscriptionPlan) => {
    setEditingId(p.id)
    setForm({
      course_id: p.course_id,
      name: p.name || "",
      description: p.description || "",
      plan_kind: p.plan_kind || "custom",
      fee_inr: String(p.fee_inr ?? 0),
      duration_days: String(p.duration_days ?? 90),
      grace_period_days: String(p.grace_period_days ?? 0),
      is_lifetime: Boolean(p.is_lifetime),
      is_active: p.is_active !== false,
      sort_order: String(p.sort_order ?? 100),
    })
  }

  const handleSave = async () => {
    if (!form.course_id.trim()) {
      toast({ title: "Select a course", variant: "destructive" })
      return
    }
    if (!form.name.trim()) {
      toast({ title: "Name required", variant: "destructive" })
      return
    }
    const fee = Number(form.fee_inr)
    if (!Number.isFinite(fee) || fee < 0) {
      toast({ title: "Invalid fee", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const payload = {
        course_id: form.course_id,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        plan_kind: form.plan_kind,
        fee_inr: fee,
        duration_days: Number(form.duration_days) || 90,
        grace_period_days: Number(form.grace_period_days) || 0,
        is_lifetime: form.is_lifetime,
        is_active: form.is_active,
        sort_order: Number(form.sort_order) || 100,
      }
      if (editingId) {
        const { course_id: _c, ...update } = payload
        await learningSubscriptionAPI.updatePlan(editingId, update)
        toast({ title: "Plan updated" })
      } else {
        await learningSubscriptionAPI.createPlan(payload)
        toast({ title: "Plan created" })
      }
      setEditingId(null)
      setForm({ ...EMPTY_FORM, course_id: form.course_id })
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

  const seedDefaults = async () => {
    const cid = courseFilter !== "all" ? courseFilter : form.course_id
    if (!cid) {
      toast({
        title: "Select a course first",
        description: "Filter by course or pick one in the form.",
        variant: "destructive",
      })
      return
    }
    setSaving(true)
    try {
      const res = await learningSubscriptionAPI.seedDefaults(cid)
      toast({ title: res.message || "Default plans ready" })
      setCourseFilter(cid)
      await load()
    } catch (e) {
      toast({
        title: "Seed failed",
        description: e instanceof Error ? e.message : "Error",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="w-full p-4 lg:px-8 lg:py-6 space-y-6 max-w-5xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#4F5077]">
              Learning Subscription Plans
            </h1>
            <p className="text-sm text-[#6B7A99] mt-1">
              3-month and Lifetime plans per online course. Separate from coach
              subscriptions.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void load()} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
            <Button
              variant="outline"
              onClick={() => void seedDefaults()}
              disabled={saving}
              className="gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Seed 3‑mo + Lifetime
            </Button>
            <Button
              onClick={startCreate}
              className="gap-2 bg-[#4F5077] hover:bg-[#3d3e5c]"
            >
              <Plus className="w-4 h-4" />
              New plan
            </Button>
          </div>
        </div>

        <div className="max-w-xs">
          <Label>Filter by course</Label>
          <Select value={courseFilter} onValueChange={setCourseFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All courses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All courses</SelectItem>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
            {error}
          </div>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="text-base text-[#4F5077]">
              {editingId ? "Edit plan" : "Create plan"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Course</Label>
                <Select
                  value={form.course_id || undefined}
                  onValueChange={(v) => setForm((f) => ({ ...f, course_id: v }))}
                  disabled={Boolean(editingId)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Plan type</Label>
                <Select
                  value={form.plan_kind}
                  onValueChange={applyKindDefaults}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEARNING_PLAN_KINDS.map((k) => (
                      <SelectItem key={k.value} value={k.value}>
                        {k.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Fee (INR)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.fee_inr}
                  onChange={(e) => setForm({ ...form, fee_inr: e.target.value })}
                />
              </div>
              <div>
                <Label>Duration (days)</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.duration_days}
                  disabled={form.plan_kind === "lifetime" || form.is_lifetime}
                  onChange={(e) =>
                    setForm({ ...form, duration_days: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Grace period (days)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.grace_period_days}
                  disabled={form.plan_kind === "lifetime" || form.is_lifetime}
                  onChange={(e) =>
                    setForm({ ...form, grace_period_days: e.target.value })
                  }
                />
              </div>
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
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={2}
              />
            </div>
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                />
                Active
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={form.is_lifetime}
                  disabled={form.plan_kind === "lifetime"}
                  onCheckedChange={(v) =>
                    setForm({
                      ...form,
                      is_lifetime: v,
                      grace_period_days: v ? "0" : form.grace_period_days,
                    })
                  }
                />
                Lifetime access
              </label>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => void handleSave()}
                disabled={saving}
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base text-[#4F5077]">Plans</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : plans.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">
                No plans yet. Create one or seed 3‑month + Lifetime for a course.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="py-2 pr-3">Course</th>
                      <th className="py-2 pr-3">Plan</th>
                      <th className="py-2 pr-3">Type</th>
                      <th className="py-2 pr-3">Fee</th>
                      <th className="py-2 pr-3">Duration</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plans.map((p) => (
                      <tr key={p.id} className="border-b border-gray-100">
                        <td className="py-2.5 pr-3 max-w-[140px] truncate">
                          {courseTitle(p.course_id)}
                        </td>
                        <td className="py-2.5 pr-3 font-medium">{p.name}</td>
                        <td className="py-2.5 pr-3">
                          {learningPlanKindLabel(p.plan_kind)}
                          {p.is_lifetime ? " · Life" : ""}
                        </td>
                        <td className="py-2.5 pr-3">{formatInr(p.fee_inr)}</td>
                        <td className="py-2.5 pr-3">
                          {p.is_lifetime ? "Lifetime" : `${p.duration_days}d`}
                        </td>
                        <td className="py-2.5 pr-3">
                          <Badge
                            variant="outline"
                            className={
                              p.is_active
                                ? "bg-green-50 text-green-800 border-green-200"
                                : "bg-gray-100 text-gray-600"
                            }
                          >
                            {p.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="py-2.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startEdit(p)}
                          >
                            Edit
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
