"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getBackendApiUrl } from "@/lib/config"
import { TokenManager } from "@/lib/tokenManager"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, Percent, Plus, Pencil, Eye } from "lucide-react"

type DiscountRule = {
  id: string
  code: string
  name: string
  description?: string
  discount_kind: "percentage" | "fixed"
  discount_value: number
  trigger: string
  apply_scope: string
  min_students: number
  min_cart_items: number
  min_courses_per_student: number
  min_cart_amount: number
  max_discount_amount?: number | null
  stackable: boolean
  priority: number
  is_active: boolean
}

const TRIGGERS = [
  { value: "multi_student", label: "Multiple students in cart" },
  { value: "multi_course_cart", label: "Multiple course lines (whole cart)" },
  { value: "multi_course_student", label: "Multiple courses for one student" },
  { value: "combination", label: "Combination (students + courses)" },
  { value: "cart_min_amount", label: "Minimum cart subtotal" },
]

const emptyForm = {
  code: "",
  name: "",
  description: "",
  discount_kind: "percentage" as const,
  discount_value: "10",
  trigger: "multi_student",
  apply_scope: "cart",
  min_students: "2",
  min_cart_items: "2",
  min_courses_per_student: "2",
  min_cart_amount: "0",
  max_discount_amount: "",
  stackable: false,
  priority: "100",
  is_active: true,
}

export default function DiscountRulesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [rules, setRules] = useState<DiscountRule[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<DiscountRule | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [viewing, setViewing] = useState<DiscountRule | null>(null)

  function authHeaders(): HeadersInit {
    const token = TokenManager.getToken()
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }
  }

    async function loadRules() {
    const token = TokenManager.getToken()
    if (!token) {
      router.push("/superadmin/login")
      return
    }
    const res = await fetch(getBackendApiUrl("discount-rules?limit=200"), { headers: authHeaders() })
    if (res.status === 401 || res.status === 403) {
      router.push("/superadmin/login")
      return
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      const detail = typeof err.detail === "string" ? err.detail : "Could not load rules"
      toast({ title: "Could not load rules", description: detail, variant: "destructive" })
      return
    }
    const data = await res.json()
    setRules(data.rules || [])
  }

  useEffect(() => {
    if (!TokenManager.isAuthenticated()) {
      router.push("/superadmin/login")
      return
    }
    const user = TokenManager.getUser()
    if (!user || user.role !== "superadmin") {
      router.push("/superadmin/login")
      return
    }
    loadRules().finally(() => setLoading(false))
  }, [])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setOpen(true)
  }

  function openEdit(rule: DiscountRule) {
    setEditing(rule)
    setForm({
      code: rule.code,
      name: rule.name,
      description: rule.description || "",
      discount_kind: rule.discount_kind,
      discount_value: String(rule.discount_value),
      trigger: rule.trigger,
      apply_scope: rule.apply_scope,
      min_students: String(rule.min_students),
      min_cart_items: String(rule.min_cart_items),
      min_courses_per_student: String(rule.min_courses_per_student),
      min_cart_amount: String(rule.min_cart_amount),
      max_discount_amount: rule.max_discount_amount != null ? String(rule.max_discount_amount) : "",
      stackable: rule.stackable,
      priority: String(rule.priority),
      is_active: rule.is_active,
    })
    setOpen(true)
  }

  function buildPayload() {
    return {
      code: form.code.trim(),
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      discount_kind: form.discount_kind,
      discount_value: parseFloat(form.discount_value),
      trigger: form.trigger,
      apply_scope: form.apply_scope,
      min_students: parseInt(form.min_students, 10) || 2,
      min_cart_items: parseInt(form.min_cart_items, 10) || 2,
      min_courses_per_student: parseInt(form.min_courses_per_student, 10) || 2,
      min_cart_amount: parseFloat(form.min_cart_amount) || 0,
      max_discount_amount: form.max_discount_amount.trim()
        ? parseFloat(form.max_discount_amount)
        : undefined,
      stackable: form.stackable,
      priority: parseInt(form.priority, 10) || 100,
      is_active: form.is_active,
      branch_ids: [],
      course_ids: [],
    }
  }

  async function handleSave() {
    if (!form.code.trim() || !form.name.trim()) {
      toast({ title: "Code and name are required", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const payload = buildPayload()
      const url = editing
        ? getBackendApiUrl(`discount-rules/${editing.id}`)
        : getBackendApiUrl("discount-rules")
      const res = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(typeof err.detail === "string" ? err.detail : "Save failed")
      }
      toast({ title: editing ? "Rule updated" : "Rule created" })
      setOpen(false)
      await loadRules()
    } catch (e) {
      toast({
        title: "Save failed",
        description: e instanceof Error ? e.message : "Try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive(rule: DiscountRule, nextActive: boolean) {
    setTogglingId(rule.id)
    // Optimistic update so the switch feels instant
    setRules((prev) =>
      prev.map((r) => (r.id === rule.id ? { ...r, is_active: nextActive } : r))
    )
    try {
      const res = await fetch(getBackendApiUrl(`discount-rules/${rule.id}`), {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ is_active: nextActive }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(typeof err.detail === "string" ? err.detail : "Could not update status")
      }
      toast({
        title: nextActive ? "Rule activated" : "Rule deactivated",
        description: `${rule.code} is now ${nextActive ? "active" : "inactive"}.`,
      })
      await loadRules()
    } catch (e) {
      setRules((prev) =>
        prev.map((r) => (r.id === rule.id ? { ...r, is_active: rule.is_active } : r))
      )
      toast({
        title: "Status update failed",
        description: e instanceof Error ? e.message : "Try again.",
        variant: "destructive",
      })
    } finally {
      setTogglingId(null)
    }
  }

  function triggerLabel(value: string) {
    return TRIGGERS.find((t) => t.value === value)?.label || value
  }

  function triggerHelp(value: string) {
    switch (value) {
      case "multi_student":
        return "Applies when the cart has enough students enrolled together."
      case "multi_course_cart":
        return "Applies when the whole cart has enough course lines."
      case "multi_course_student":
        return "Applies when one student has enough courses in the cart."
      case "combination":
        return "Applies when both student and course minimums are met."
      case "cart_min_amount":
        return "Applies when the cart subtotal reaches the minimum amount."
      default:
        return "Server calculates this promotion when the cart is viewed or validated."
    }
  }

  function formatDiscountValue(rule: DiscountRule) {
    return rule.discount_kind === "percentage"
      ? `${rule.discount_value}% off`
      : `₹${Number(rule.discount_value).toLocaleString("en-IN")} off`
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-10 w-10 animate-spin text-[#E1BB33]" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Percent className="h-8 w-8 text-[#E1BB33]" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Enrollment discount rules</h1>
            <p className="text-sm text-gray-500">
              Cart promotions are calculated on the server when customers view or validate their cart.
            </p>
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#E1BB33] text-black hover:bg-[#E1BB33]/90" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add rule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit discount rule" : "New discount rule"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Code</Label>
                  <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Priority (lower runs first)</Label>
                  <Input value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Discount type</Label>
                  <Select
                    value={form.discount_kind}
                    onValueChange={(v) => setForm({ ...form, discount_kind: v as "percentage" | "fixed" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="fixed">Fixed amount (₹)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Value</Label>
                  <Input
                    value={form.discount_value}
                    onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>When to apply (trigger)</Label>
                <Select value={form.trigger} onValueChange={(v) => setForm({ ...form, trigger: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRIGGERS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Apply scope</Label>
                <Select value={form.apply_scope} onValueChange={(v) => setForm({ ...form, apply_scope: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cart">Whole cart (eligible items)</SelectItem>
                    <SelectItem value="per_student_line">Per qualifying student</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="space-y-2">
                  <Label>Min students</Label>
                  <Input
                    value={form.min_students}
                    onChange={(e) => setForm({ ...form, min_students: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Min cart items</Label>
                  <Input
                    value={form.min_cart_items}
                    onChange={(e) => setForm({ ...form, min_cart_items: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Min courses / student</Label>
                  <Input
                    value={form.min_courses_per_student}
                    onChange={(e) => setForm({ ...form, min_courses_per_student: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Min cart amount (₹)</Label>
                  <Input
                    value={form.min_cart_amount}
                    onChange={(e) => setForm({ ...form, min_cart_amount: e.target.value })}
                  />
                </div>
              </div>
              {form.discount_kind === "percentage" ? (
                <div className="space-y-2">
                  <Label>Max discount cap (₹, optional)</Label>
                  <Input
                    value={form.max_discount_amount}
                    onChange={(e) => setForm({ ...form, max_discount_amount: e.target.value })}
                  />
                </div>
              ) : null}
              <div className="flex items-center justify-between">
                <Label>Stackable with other rules</Label>
                <Switch checked={form.stackable} onCheckedChange={(v) => setForm({ ...form, stackable: v })} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              </div>
              <Button
                className="w-full bg-[#E1BB33] text-black"
                disabled={saving}
                onClick={() => void handleSave()}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? "Update rule" : "Create rule"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Active & inactive rules ({rules.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <p className="text-gray-500 text-sm py-8 text-center">
              No discount rules yet. Create one to offer multi-student or multi-course savings in the enrollment cart.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-mono text-xs">{rule.code}</TableCell>
                    <TableCell>{rule.name}</TableCell>
                    <TableCell className="text-xs text-gray-600">{rule.trigger}</TableCell>
                    <TableCell>
                      {rule.discount_kind === "percentage"
                        ? `${rule.discount_value}%`
                        : `₹${rule.discount_value}`}
                    </TableCell>
                    <TableCell>{rule.priority}</TableCell>
                    <TableCell>
                      <Badge variant={rule.is_active ? "default" : "secondary"}>
                        {rule.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center justify-end gap-2">
                        <Switch
                          checked={!!rule.is_active}
                          disabled={togglingId === rule.id}
                          onCheckedChange={(v) => void handleToggleActive(rule, v)}
                          aria-label={`Toggle ${rule.code} active status`}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setViewing(rule)}
                          aria-label={`View ${rule.code}`}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEdit(rule)}
                          aria-label={`Edit ${rule.code}`}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!viewing}
        onOpenChange={(next) => {
          if (!next) setViewing(null)
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0 gap-0">
          {viewing ? (
            <>
              <div className="border-b bg-gradient-to-br from-[#E1BB33]/15 via-amber-50 to-white px-6 pt-6 pb-5">
                <DialogHeader className="space-y-3 text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-md bg-white/80 border border-[#E1BB33]/40 px-2 py-0.5 font-mono text-xs text-gray-800">
                      {viewing.code}
                    </span>
                    <Badge
                      variant={viewing.is_active ? "default" : "secondary"}
                      className={
                        viewing.is_active
                          ? "bg-emerald-600 hover:bg-emerald-600"
                          : "bg-gray-200 text-gray-700"
                      }
                    >
                      {viewing.is_active ? "Active" : "Inactive"}
                    </Badge>
                    {viewing.stackable ? (
                      <Badge variant="outline" className="border-[#E1BB33]/50 text-[#8a6d00]">
                        Stackable
                      </Badge>
                    ) : null}
                  </div>
                  <DialogTitle className="text-xl text-gray-900 leading-snug pr-6">
                    {viewing.name}
                  </DialogTitle>
                  <DialogDescription className="text-sm text-gray-600">
                    {viewing.description?.trim() ||
                      "Read-only summary of this enrollment cart promotion rule."}
                  </DialogDescription>
                </DialogHeader>

                <div className="mt-4 rounded-xl border border-[#E1BB33]/30 bg-white/90 px-4 py-3 flex items-center justify-between gap-3 shadow-sm">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">Discount</p>
                    <p className="text-2xl font-bold text-gray-900 tabular-nums">
                      {formatDiscountValue(viewing)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Priority</p>
                    <p className="text-lg font-semibold text-gray-800">{viewing.priority}</p>
                    <p className="text-[11px] text-gray-400">Lower runs first</p>
                  </div>
                </div>
              </div>

              <div className="px-6 py-5 space-y-5">
                <section className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    When it applies
                  </h3>
                  <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-3 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-sm text-gray-500 shrink-0">Trigger</span>
                      <span className="text-sm font-medium text-gray-900 text-right">
                        {triggerLabel(viewing.trigger)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">{triggerHelp(viewing.trigger)}</p>
                    <div className="flex items-center justify-between gap-3 pt-1 border-t border-gray-200/80">
                      <span className="text-sm text-gray-500">Apply to</span>
                      <span className="text-sm font-medium text-gray-900">
                        {viewing.apply_scope === "per_student_line"
                          ? "Each qualifying student"
                          : "Whole cart (eligible items)"}
                      </span>
                    </div>
                  </div>
                </section>

                <section className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Thresholds
                  </h3>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5">
                      <p className="text-[11px] text-gray-500">Min students</p>
                      <p className="text-lg font-semibold text-gray-900 tabular-nums">
                        {viewing.min_students}
                      </p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5">
                      <p className="text-[11px] text-gray-500">Min cart items</p>
                      <p className="text-lg font-semibold text-gray-900 tabular-nums">
                        {viewing.min_cart_items}
                      </p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5">
                      <p className="text-[11px] text-gray-500">Min courses / student</p>
                      <p className="text-lg font-semibold text-gray-900 tabular-nums">
                        {viewing.min_courses_per_student}
                      </p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5">
                      <p className="text-[11px] text-gray-500">Min cart amount</p>
                      <p className="text-lg font-semibold text-gray-900 tabular-nums">
                        ₹{Number(viewing.min_cart_amount || 0).toLocaleString("en-IN")}
                      </p>
                    </div>
                    {viewing.discount_kind === "percentage" && viewing.max_discount_amount != null ? (
                      <div className="col-span-2 rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2.5">
                        <p className="text-[11px] text-amber-800/80">Max discount cap</p>
                        <p className="text-lg font-semibold text-amber-950 tabular-nums">
                          ₹{Number(viewing.max_discount_amount).toLocaleString("en-IN")}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </section>

                <section className="rounded-lg border border-dashed border-gray-200 px-3 py-2.5 text-xs text-gray-500">
                  {viewing.stackable
                    ? "This rule can stack with other stackable promotions when eligible."
                    : "Only the best matching non-stackable rule is applied to the cart."}{" "}
                  Customers see the savings on the enrollment cart after the server calculates promotions.
                </section>

                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
                  <Button type="button" variant="outline" onClick={() => setViewing(null)}>
                    Close
                  </Button>
                  <Button
                    type="button"
                    className="bg-[#E1BB33] text-black hover:bg-[#E1BB33]/90"
                    onClick={() => {
                      const rule = viewing
                      setViewing(null)
                      if (rule) openEdit(rule)
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-2" />
                    Edit rule
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
