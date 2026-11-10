"use client"

import { useCallback, useEffect, useState, type ComponentProps, type ComponentType } from "react"
import {
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Layers,
  Square,
  IndianRupee,
  Calendar,
  ArrowUpDown,
  FileText,
  Pencil,
  MoreVertical,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  AdminPageShell,
  AdminPageHeader,
  AdminCard,
  AdminTableShell,
} from "@/components/dashboard/AdminPageShell"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import {
  coachSubscriptionAPI,
  type CoachSubscriptionPlan,
} from "@/lib/coachSubscriptionAPI"

const BRAND_YELLOW = "bg-[#E1BB33] hover:bg-[#c9a82e] text-gray-900"
const SWITCH_ON = "data-[state=checked]:bg-[#E1BB33]"

const EMPTY_FORM = {
  name: "",
  description: "",
  fee_inr: 999,
  duration_days: 30,
  grace_period_days: 10,
  deactivate_on_grace_expiry: true,
  is_active: true,
  is_default: false,
  sort_order: 100,
}

function FieldIconInput({
  icon: Icon,
  label,
  id,
  ...inputProps
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  id: string
} & ComponentProps<typeof Input>) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-medium text-[#4F5077]">
        {label}
      </Label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
        <Input id={id} className="h-11 rounded-xl border-gray-200 pl-10" {...inputProps} />
      </div>
    </div>
  )
}

export default function CoachSubscriptionPlansAdminPage() {
  const { toast } = useToast()
  const [plans, setPlans] = useState<CoachSubscriptionPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await coachSubscriptionAPI.listPlans(false)
      setPlans(data.plans || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load plans")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const startCreate = () => {
    setEditingId(null)
    setForm({ ...EMPTY_FORM })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const startEdit = (p: CoachSubscriptionPlan) => {
    setEditingId(p.id)
    setForm({
      name: p.name,
      description: p.description || "",
      fee_inr: p.fee_inr,
      duration_days: p.duration_days,
      grace_period_days: p.grace_period_days,
      deactivate_on_grace_expiry: p.deactivate_on_grace_expiry,
      is_active: p.is_active,
      is_default: Boolean(p.is_default),
      sort_order: p.sort_order ?? 100,
    })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleCancel = () => {
    setEditingId(null)
    setForm({ ...EMPTY_FORM })
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: "Name required", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      if (editingId) {
        await coachSubscriptionAPI.updatePlan(editingId, form)
        toast({ title: "Plan updated" })
      } else {
        await coachSubscriptionAPI.createPlan(form)
        toast({ title: "Plan created" })
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

  return (
    <AdminPageShell className="admin-stack">
        <AdminPageHeader
          icon={Layers}
          title="Online Coach Subscription Plans"
          subtitle="Configure fee, duration, grace period, and deactivation rules for coach subscriptions."
          actions={
            <div className="admin-actions">
              <Button
                type="button"
                variant="outline"
                className="btn-admin-outline h-10"
                onClick={() => void load()}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              <Button type="button" onClick={startCreate} className={`btn-admin-primary h-10 ${BRAND_YELLOW}`}>
                <Plus className="mr-2 h-4 w-4" />
                New Plan
              </Button>
            </div>
          }
        />

        <AdminCard>
          <div className="mb-5 flex items-center gap-2 border-b border-gray-100 pb-4">
            <div className="admin-icon-tile admin-icon-tile--violet h-8 w-8">
              <Plus className="h-4 w-4" />
            </div>
            <h2 className="text-lg font-semibold text-[#4F5077]">
              {editingId ? "Edit Plan" : "Create Plan"}
            </h2>
          </div>
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <FieldIconInput
                icon={Square}
                id="plan-name"
                label="Plan Name"
                placeholder="e.g., Monthly Coach Access"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <FieldIconInput
                icon={IndianRupee}
                id="plan-fee"
                label="Fee (INR)"
                type="number"
                min={0}
                value={form.fee_inr}
                onChange={(e) => setForm({ ...form, fee_inr: Number(e.target.value) || 0 })}
              />
              <FieldIconInput
                icon={Calendar}
                id="plan-duration"
                label="Duration (Days)"
                type="number"
                min={1}
                value={form.duration_days}
                onChange={(e) => setForm({ ...form, duration_days: Number(e.target.value) || 1 })}
              />
              <FieldIconInput
                icon={Calendar}
                id="plan-grace"
                label="Grace Period (Days)"
                type="number"
                min={0}
                value={form.grace_period_days}
                onChange={(e) =>
                  setForm({ ...form, grace_period_days: Number(e.target.value) || 0 })
                }
              />
              <FieldIconInput
                icon={ArrowUpDown}
                id="plan-sort"
                label="Sort Order"
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan-desc" className="text-sm font-medium text-[#4F5077]">
                Description
              </Label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 h-4 w-4 text-[#9CA3AF]" />
                <Textarea
                  id="plan-desc"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  placeholder="Optional description for this subscription plan…"
                  className="min-h-[88px] rounded-xl border-gray-200 pl-10"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 pt-4">
              <div className="flex flex-wrap gap-6">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-[#4F5077]">
                  <Switch
                    className={SWITCH_ON}
                    checked={form.deactivate_on_grace_expiry}
                    onCheckedChange={(v) => setForm({ ...form, deactivate_on_grace_expiry: v })}
                  />
                  Deactivate coach when grace period ends
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-[#4F5077]">
                  <Switch
                    className={SWITCH_ON}
                    checked={form.is_active}
                    onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                  />
                  Active
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-[#4F5077]">
                  <Switch
                    className={SWITCH_ON}
                    checked={form.is_default}
                    onCheckedChange={(v) => setForm({ ...form, is_default: v })}
                  />
                  Default Plan
                </label>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  className="h-10 rounded-xl border-gray-200 px-5"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className={`h-10 gap-2 rounded-xl px-5 font-semibold ${BRAND_YELLOW}`}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Plan
                </Button>
              </div>
            </div>
          </div>
        </AdminCard>

        <AdminCard padding={false}>
          <div className="border-b border-gray-100 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-2">
              <div className="admin-icon-tile admin-icon-tile--violet h-8 w-8">
                <Layers className="h-4 w-4" />
              </div>
              <h2 className="text-lg font-semibold text-[#4F5077]">Plans</h2>
            </div>
          </div>
            {loading ? (
              <p className="p-6 text-sm text-[#6B7A99]">
                <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                Loading…
              </p>
            ) : error ? (
              <p className="p-6 text-sm text-red-600">{error}</p>
            ) : plans.length === 0 ? (
              <p className="p-6 text-sm text-[#6B7A99]">No plans yet.</p>
            ) : (
              <AdminTableShell className="border-0 shadow-none">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Plan</th>
                      <th>Fee</th>
                      <th>Duration</th>
                      <th>Grace Period</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plans.map((p, index) => (
                      <tr key={p.id} className="border-b last:border-0 hover:bg-[#FAFBFC]">
                        <td className="px-5 py-4 text-gray-500">{index + 1}</td>
                        <td className="px-5 py-4">
                          <div className="font-semibold text-[#4F5077]">{p.name}</div>
                          {p.description ? (
                            <div className="mt-0.5 line-clamp-1 text-xs text-gray-500">{p.description}</div>
                          ) : null}
                        </td>
                        <td className="px-5 py-4 font-medium text-[#4F5077]">₹{p.fee_inr}</td>
                        <td className="px-5 py-4 text-[#4F5077]">{p.duration_days} Days</td>
                        <td className="px-5 py-4 text-[#4F5077]">{p.grace_period_days} Days</td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap items-center gap-2">
                            {p.is_active ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                Active
                              </span>
                            ) : (
                              <Badge variant="outline" className="text-gray-600">
                                Inactive
                              </Badge>
                            )}
                            {p.is_default ? (
                              <Badge
                                variant="outline"
                                className="border-[#E1BB33]/40 bg-[#FFF8E1] text-amber-900"
                              >
                                Default
                              </Badge>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => startEdit(p)}
                              className="h-9 gap-1.5 rounded-lg border-gray-200"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-9 w-9 rounded-lg p-0">
                                  <MoreVertical className="h-4 w-4 text-gray-500" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => startEdit(p)}>Edit plan</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </AdminTableShell>
            )}
        </AdminCard>
    </AdminPageShell>
  )
}
