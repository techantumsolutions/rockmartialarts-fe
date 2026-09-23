"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Loader2, Plus, Pencil, Trash2, Target, AlertTriangle, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { TokenManager } from "@/lib/tokenManager"
import {
  kpiDefinitionAPI,
  type KpiDefinition,
  type KpiWeightSummary,
  type KpiWeightUnit,
} from "@/lib/kpiAPI"

const emptyForm = {
  code: "",
  name: "",
  description: "",
  weight: "10",
  weight_unit: "percent" as KpiWeightUnit,
  max_score: "100",
  min_score: "0",
  sort_order: "100",
  is_active: true,
}

export default function KpiSettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [kpis, setKpis] = useState<KpiDefinition[]>([])
  const [summary, setSummary] = useState<KpiWeightSummary | null>(null)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<KpiDefinition | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [activeOnly, setActiveOnly] = useState(false)

  const load = useCallback(async () => {
    if (!TokenManager.isAuthenticated()) {
      router.push("/superadmin/login")
      return
    }
    try {
      setLoading(true)
      const data = await kpiDefinitionAPI.list({
        active_only: activeOnly,
        limit: 200,
      })
      setKpis(data.kpis || [])
      setSummary(data.weight_summary || null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load KPIs")
    } finally {
      setLoading(false)
    }
  }, [activeOnly, router])

  useEffect(() => {
    void load()
  }, [load])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setOpen(true)
  }

  const openEdit = (kpi: KpiDefinition) => {
    setEditing(kpi)
    setForm({
      code: kpi.code,
      name: kpi.name,
      description: kpi.description || "",
      weight: String(kpi.weight),
      weight_unit: kpi.weight_unit || "percent",
      max_score: String(kpi.max_score ?? 100),
      min_score: String(kpi.min_score ?? 0),
      sort_order: String(kpi.sort_order ?? 100),
      is_active: Boolean(kpi.is_active),
    })
    setOpen(true)
  }

  const buildPayload = () => ({
    code: form.code.trim(),
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    weight: parseFloat(form.weight),
    weight_unit: form.weight_unit,
    max_score: parseFloat(form.max_score),
    min_score: parseFloat(form.min_score),
    sort_order: parseInt(form.sort_order, 10) || 100,
    is_active: form.is_active,
  })

  const handleSave = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      toast.error("Code and name are required")
      return
    }
    const weight = parseFloat(form.weight)
    const maxScore = parseFloat(form.max_score)
    const minScore = parseFloat(form.min_score)
    if (!(weight > 0)) {
      toast.error("Weight must be greater than 0")
      return
    }
    if (form.weight_unit === "percent" && weight > 100) {
      toast.error("Percent weight cannot exceed 100")
      return
    }
    if (!(maxScore > 0)) {
      toast.error("Maximum score must be greater than 0")
      return
    }
    if (minScore < 0 || minScore > maxScore) {
      toast.error("Min score must be between 0 and max score")
      return
    }

    try {
      setSaving(true)
      const payload = buildPayload()
      const result = editing
        ? await kpiDefinitionAPI.update(editing.id, payload)
        : await kpiDefinitionAPI.create(payload)
      if (result.weight_summary) setSummary(result.weight_summary)
      toast.success(editing ? "KPI updated" : "KPI created")
      setOpen(false)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (kpi: KpiDefinition) => {
    try {
      const result = await kpiDefinitionAPI.setActive(kpi.id, !kpi.is_active)
      if (result.weight_summary) setSummary(result.weight_summary)
      toast.success(kpi.is_active ? "KPI deactivated" : "KPI activated")
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Status update failed")
    }
  }

  const handleDelete = async (kpi: KpiDefinition) => {
    if (!confirm(`Delete KPI “${kpi.name}”? Prefer deactivating if it may be used later.`)) {
      return
    }
    try {
      await kpiDefinitionAPI.remove(kpi.id)
      toast.success("KPI deleted")
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed")
    }
  }

  return (
    <main className="w-full p-4 lg:px-8 mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Target className="h-6 w-6 text-blue-600" />
            KPI Master
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Configure performance KPIs, weightage, and maximum scores used for student ratings.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" />
            Add KPI
          </Button>
        </div>
      </div>

      {summary ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-slate-500">Active KPIs</p>
              <p className="text-2xl font-semibold">{summary.active_count}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-slate-500">Active percent weight sum</p>
              <p
                className={`text-2xl font-semibold ${
                  summary.percent_sum_ok ? "text-green-700" : "text-amber-700"
                }`}
              >
                {summary.percent_weight_sum}
                <span className="text-sm font-normal text-slate-500">
                  {" "}
                  / {summary.target_percent_sum}
                </span>
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-slate-500">Active points weight sum</p>
              <p className="text-2xl font-semibold text-slate-900">
                {summary.points_weight_sum}
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {summary && !summary.percent_sum_ok && summary.percent_count > 0 ? (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-700" />
          <AlertDescription className="text-amber-900">
            {summary.percent_message ||
              "Active percent weights should total 100 before rating calculation."}
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base">KPI definitions</CardTitle>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-600">Active only</span>
            <Switch checked={activeOnly} onCheckedChange={setActiveOnly} />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-500">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Loading…
            </div>
          ) : kpis.length === 0 ? (
            <p className="text-center py-12 text-slate-500">
              No KPIs yet. Add strength, technique, attendance, or other parameters.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead>Score range</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kpis.map((kpi) => (
                    <tr key={kpi.id} className="border-b">
                      <TableCell className="font-mono text-xs">{kpi.code}</TableCell>
                      <TableCell>
                        <div className="font-medium">{kpi.name}</div>
                        {kpi.description ? (
                          <div className="text-xs text-slate-500 line-clamp-1">
                            {kpi.description}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        {kpi.weight}
                        {kpi.weight_unit === "percent" ? "%" : " pts"}
                      </TableCell>
                      <TableCell>
                        {kpi.min_score} – {kpi.max_score}
                      </TableCell>
                      <TableCell>{kpi.sort_order}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            kpi.is_active
                              ? "bg-green-100 text-green-800 hover:bg-green-100"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-100"
                          }
                        >
                          {kpi.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(kpi)}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void toggleActive(kpi)}
                          title={kpi.is_active ? "Deactivate" : "Activate"}
                        >
                          {kpi.is_active ? "Off" : "On"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600"
                          onClick={() => void handleDelete(kpi)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit KPI" : "Add KPI"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Code</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                  placeholder="TECHNIQUE"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Sort order</Label>
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Technique"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Optional guidance for evaluators"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Weight</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.weight}
                  onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Weight unit</Label>
                <Select
                  value={form.weight_unit}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, weight_unit: v as KpiWeightUnit }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percent (%)</SelectItem>
                    <SelectItem value="points">Points</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Min score</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.min_score}
                  onChange={(e) => setForm((f) => ({ ...f, min_score: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Max score</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.max_score}
                  onChange={(e) => setForm((f) => ({ ...f, max_score: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <div>
                <p className="text-sm font-medium">Active</p>
                <p className="text-xs text-slate-500">
                  Inactive KPIs are excluded from rating weight totals.
                </p>
              </div>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => void handleSave()}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              {editing ? "Save changes" : "Create KPI"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
