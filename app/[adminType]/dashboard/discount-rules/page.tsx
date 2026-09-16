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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, Percent, Plus, Pencil, Trash2 } from "lucide-react"

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
      toast({ title: "Could not load rules", variant: "destructive" })
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

  async function handleDelete(rule: DiscountRule) {
    if (!confirm(`Delete rule ${rule.code}?`)) return
    const res = await fetch(getBackendApiUrl(`discount-rules/${rule.id}`), {
      method: "DELETE",
      headers: authHeaders(),
    })
    if (!res.ok) {
      toast({ title: "Delete failed", variant: "destructive" })
      return
    }
    toast({ title: "Rule deleted" })
    await loadRules()
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
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(rule)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => void handleDelete(rule)}>
                        <Trash2 className="h-3 w-3 text-red-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
