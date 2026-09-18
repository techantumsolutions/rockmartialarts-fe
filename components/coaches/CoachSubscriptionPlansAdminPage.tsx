"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, Plus, RefreshCw, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import {
  coachSubscriptionAPI,
  type CoachSubscriptionPlan,
} from "@/lib/coachSubscriptionAPI"

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
    <div className="min-h-screen bg-gray-50">
      <main className="w-full p-4 lg:px-8 lg:py-6 space-y-6 max-w-5xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#4F5077]">Coach Subscription Plans</h1>
            <p className="text-sm text-[#6B7A99] mt-1">
              Configure fee, duration, grace period, and deactivation rules.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={load} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
            <Button onClick={startCreate} className="gap-2 bg-[#4F5077] hover:bg-[#3d3e5c]">
              <Plus className="w-4 h-4" />
              New plan
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base text-[#4F5077]">
              {editingId ? "Edit plan" : "Create plan"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
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
                  onChange={(e) =>
                    setForm({ ...form, fee_inr: Number(e.target.value) || 0 })
                  }
                />
              </div>
              <div>
                <Label>Duration (days)</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.duration_days}
                  onChange={(e) =>
                    setForm({ ...form, duration_days: Number(e.target.value) || 1 })
                  }
                />
              </div>
              <div>
                <Label>Grace period (days)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.grace_period_days}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      grace_period_days: Number(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div>
                <Label>Sort order</Label>
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) =>
                    setForm({ ...form, sort_order: Number(e.target.value) || 0 })
                  }
                />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={form.deactivate_on_grace_expiry}
                  onCheckedChange={(v) =>
                    setForm({ ...form, deactivate_on_grace_expiry: v })
                  }
                />
                Deactivate coach when grace ends
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                />
                Active
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={form.is_default}
                  onCheckedChange={(v) => setForm({ ...form, is_default: v })}
                />
                Default plan
              </label>
            </div>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save plan
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base text-[#4F5077]">Plans</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                Loading…
              </p>
            ) : error ? (
              <p className="text-sm text-red-600">{error}</p>
            ) : plans.length === 0 ? (
              <p className="text-sm text-gray-500">No plans yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left py-3 px-3 text-[#6B7A99]">Plan</th>
                      <th className="text-left py-3 px-3 text-[#6B7A99]">Fee</th>
                      <th className="text-left py-3 px-3 text-[#6B7A99]">Duration</th>
                      <th className="text-left py-3 px-3 text-[#6B7A99]">Grace</th>
                      <th className="text-left py-3 px-3 text-[#6B7A99]">Status</th>
                      <th className="text-left py-3 px-3 text-[#6B7A99]" />
                    </tr>
                  </thead>
                  <tbody>
                    {plans.map((p) => (
                      <tr key={p.id} className="border-b">
                        <td className="py-3 px-3">
                          <div className="font-medium text-[#4F5077]">{p.name}</div>
                          <div className="text-xs text-gray-500 line-clamp-1">
                            {p.description}
                          </div>
                        </td>
                        <td className="py-3 px-3">₹{p.fee_inr}</td>
                        <td className="py-3 px-3">{p.duration_days}d</td>
                        <td className="py-3 px-3">{p.grace_period_days}d</td>
                        <td className="py-3 px-3">
                          <div className="flex gap-1 flex-wrap">
                            {p.is_active ? (
                              <Badge variant="outline" className="bg-green-50 text-green-800">
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="outline">Inactive</Badge>
                            )}
                            {p.is_default && (
                              <Badge variant="outline" className="bg-amber-50 text-amber-900">
                                Default
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Button variant="outline" size="sm" onClick={() => startEdit(p)}>
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
