"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2, Plus, RefreshCw, Save, Eye, Copy } from "lucide-react"
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
import { useToast } from "@/hooks/use-toast"
import { TokenManager } from "@/lib/tokenManager"
import { getBackendApiUrl } from "@/lib/config"
import {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_TEMPLATE_CATEGORIES,
  NOTIFICATION_TEMPLATE_STATUSES,
  notificationTemplateAPI,
  channelLabel,
  categoryLabel,
  statusLabel,
  type NotificationTemplate,
  type NotificationTemplatePlaceholder,
} from "@/lib/notificationTemplateAPI"

type BranchOpt = { id: string; name: string }

const EMPTY_FORM = {
  name: "",
  display_name: "",
  channel: "sms",
  category: "custom",
  status: "draft",
  subject: "",
  body: "",
  dlt_template_id: "",
  provider_template_name: "",
  provider_reference: "",
  description: "",
  branch_id: "",
  placeholders: [] as NotificationTemplatePlaceholder[],
}

const STATUS_CLASS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 border-gray-200",
  active: "bg-green-50 text-green-800 border-green-200",
  inactive: "bg-amber-50 text-amber-800 border-amber-200",
  archived: "bg-red-50 text-red-800 border-red-200",
}

function extractKeysFromBody(body: string): string[] {
  const keys: string[] = []
  const re = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(body))) {
    if (!keys.includes(m[1])) keys.push(m[1])
  }
  return keys
}

export default function NotificationTemplatesAdminPage() {
  const { toast } = useToast()
  const [templates, setTemplates] = useState<NotificationTemplate[]>([])
  const [branches, setBranches] = useState<BranchOpt[]>([])
  const [managedBranchIds, setManagedBranchIds] = useState<string[]>([])
  const [catalog, setCatalog] = useState<NotificationTemplatePlaceholder[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [channelFilter, setChannelFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [scopeFilter, setScopeFilter] = useState("all")
  const [branchFilter, setBranchFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [previewText, setPreviewText] = useState<string | null>(null)
  const [formReadOnly, setFormReadOnly] = useState(false)

  const isBranchManagerOnly = managedBranchIds.length > 0

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
        (Array.isArray(list) ? list : []).map(
          (b: { id: string; name?: string }) => ({
            id: b.id,
            name: b.name || b.id,
          })
        )
      )
    } catch {
      /* optional */
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await notificationTemplateAPI.list({
        channel: channelFilter,
        category: categoryFilter,
        status: statusFilter,
        scope: scopeFilter !== "all" ? scopeFilter : undefined,
        branch_id:
          branchFilter !== "all" && branchFilter !== "global"
            ? branchFilter
            : branchFilter === "global"
              ? "__global__"
              : undefined,
        search: search || undefined,
        include_archived: statusFilter === "archived" || statusFilter === "all",
      })
      setTemplates(data.templates || [])
      if (Array.isArray(data.managed_branch_ids)) {
        setManagedBranchIds(data.managed_branch_ids)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load templates")
    } finally {
      setLoading(false)
    }
  }, [channelFilter, categoryFilter, statusFilter, scopeFilter, branchFilter, search])

  useEffect(() => {
    void loadBranches()
  }, [loadBranches])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    notificationTemplateAPI
      .meta()
      .then((m) => setCatalog(m.placeholders || []))
      .catch(() => setCatalog([]))
  }, [])

  const startCreate = () => {
    setEditingId(null)
    setFormReadOnly(false)
    setForm({
      ...EMPTY_FORM,
      placeholders: [],
      branch_id: isBranchManagerOnly ? managedBranchIds[0] || "" : "",
    })
    setPreviewText(null)
  }

  const startEdit = (t: NotificationTemplate) => {
    // SA can edit global; BM cannot
    const canEdit =
      t.editable !== false &&
      !(isBranchManagerOnly && (t.is_global || !t.branch_id))
    setFormReadOnly(!canEdit)
    setEditingId(t.id)
    setForm({
      name: t.name || "",
      display_name: t.display_name || "",
      channel: t.channel || t.type || "sms",
      category: t.category || "custom",
      status: t.status || "draft",
      subject: t.subject || "",
      body: t.body || "",
      dlt_template_id: t.dlt_template_id || "",
      provider_template_name: t.provider_template_name || "",
      provider_reference: t.provider_reference || "",
      description: t.description || "",
      branch_id: t.branch_id || "",
      placeholders: Array.isArray(t.placeholders)
        ? t.placeholders.map((p) => ({ ...p }))
        : [],
    })
    setPreviewText(null)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const syncPlaceholdersFromBody = () => {
    const keys = extractKeysFromBody(form.body)
    setForm((prev) => {
      const byKey = new Map(prev.placeholders.map((p) => [p.key, p]))
      const next = keys.map((key) => {
        const existing = byKey.get(key)
        const hint = catalog.find((c) => c.key === key)
        return (
          existing || {
            key,
            label: hint?.label || key.replace(/_/g, " "),
            required: false,
            sample: hint?.sample || "",
          }
        )
      })
      return { ...prev, placeholders: next }
    })
    toast({ title: "Placeholders synced from body" })
  }

  const handleSave = async () => {
    if (formReadOnly) {
      toast({ title: "This Rock default is read-only", variant: "destructive" })
      return
    }
    if (!form.name.trim() && !editingId) {
      toast({ title: "Name required", variant: "destructive" })
      return
    }
    if (!form.body.trim()) {
      toast({ title: "Body required", variant: "destructive" })
      return
    }
    if (isBranchManagerOnly && !form.branch_id) {
      toast({ title: "Branch required", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        display_name: form.display_name.trim() || undefined,
        channel: form.channel,
        category: form.category,
        status: form.status,
        subject: form.subject.trim() || undefined,
        body: form.body.trim(),
        dlt_template_id: form.dlt_template_id.trim() || undefined,
        provider_template_name: form.provider_template_name.trim() || undefined,
        provider_reference: form.provider_reference.trim() || undefined,
        description: form.description.trim() || undefined,
        placeholders: form.placeholders,
        branch_id: form.branch_id || undefined,
      }
      if (editingId) {
        const { name: _n, ...updateBody } = payload
        const patch: Record<string, unknown> = { ...updateBody }
        if (!form.branch_id && !isBranchManagerOnly) {
          patch.clear_branch_id = true
        }
        await notificationTemplateAPI.update(editingId, patch)
        toast({ title: "Template updated" })
      } else {
        await notificationTemplateAPI.create(payload)
        toast({ title: "Template created" })
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

  const cloneRockDefault = async (t: NotificationTemplate) => {
    const branchId =
      form.branch_id ||
      (branchFilter !== "all" && branchFilter !== "global"
        ? branchFilter
        : "") ||
      managedBranchIds[0] ||
      ""
    if (!branchId) {
      toast({
        title: "Select a branch first",
        description: "Pick a branch to create the override under.",
        variant: "destructive",
      })
      return
    }
    setSaving(true)
    try {
      const res = await notificationTemplateAPI.cloneToBranch({
        name: t.name,
        branch_id: branchId,
        channel: t.channel || "sms",
      })
      toast({
        title: res.created === false ? "Already exists" : "Cloned to branch",
        description: res.message,
      })
      await load()
      if (res.template?.id) startEdit(res.template)
    } catch (e) {
      toast({
        title: "Clone failed",
        description: e instanceof Error ? e.message : "Error",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const archive = async (id: string) => {
    if (!confirm("Archive this template? It will be deactivated but not deleted."))
      return
    setSaving(true)
    try {
      await notificationTemplateAPI.archive(id)
      toast({ title: "Template archived" })
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

  const runPreview = async () => {
    if (!editingId) {
      // Local preview for create
      let body = form.body
      for (const p of form.placeholders) {
        body = body.split(`{{${p.key}}}`).join(p.sample || `[${p.key}]`)
      }
      setPreviewText(body)
      return
    }
    try {
      const ctx: Record<string, string> = {}
      for (const p of form.placeholders) {
        if (p.sample) ctx[p.key] = p.sample
      }
      const res = await notificationTemplateAPI.preview(editingId, ctx)
      setPreviewText(res.rendered_body)
      if (res.missing_placeholders?.length) {
        toast({
          title: "Some placeholders missing samples",
          description: res.missing_placeholders.join(", "),
        })
      }
    } catch (e) {
      toast({
        title: "Preview failed",
        description: e instanceof Error ? e.message : "Error",
        variant: "destructive",
      })
    }
  }

  const detectedKeys = useMemo(
    () => extractKeysFromBody(form.body),
    [form.body]
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="w-full p-4 lg:px-8 lg:py-6 space-y-6 max-w-6xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#4F5077]">
              Notification templates
            </h1>
            <p className="text-sm text-[#6B7A99] mt-1">
              SMS and WhatsApp templates with placeholders and provider
              references. Branch overrides fall back to Rock Martial Arts
              defaults when missing.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Send and track deliveries in Settings → Notification Delivery.
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
              New template
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <Label>Channel</Label>
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {NOTIFICATION_CHANNELS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Category</Label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {NOTIFICATION_TEMPLATE_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {NOTIFICATION_TEMPLATE_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Scope</Label>
            <Select value={scopeFilter} onValueChange={setScopeFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="global">Rock defaults</SelectItem>
                <SelectItem value="branch">Branch only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Branch</Label>
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="global">Rock default</SelectItem>
                {(isBranchManagerOnly
                  ? branches.filter((b) => managedBranchIds.includes(b.id))
                  : branches
                ).map((b) => (
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
              placeholder="Name, body, DLT id…"
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
                {editingId
                  ? formReadOnly
                    ? "View Rock default"
                    : "Edit template"
                  : "Create template"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {formReadOnly ? (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded px-2 py-1.5">
                  Rock Martial Arts default — read-only. Clone to your branch to
                  customize.
                </p>
              ) : null}
              <div>
                <Label>Branch</Label>
                <Select
                  value={form.branch_id || "global"}
                  onValueChange={(v) =>
                    setForm({ ...form, branch_id: v === "global" ? "" : v })
                  }
                  disabled={!!editingId || formReadOnly || isBranchManagerOnly}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {!isBranchManagerOnly ? (
                      <SelectItem value="global">
                        Rock Martial Arts (default)
                      </SelectItem>
                    ) : null}
                    {(isBranchManagerOnly
                      ? branches.filter((b) => managedBranchIds.includes(b.id))
                      : branches
                    ).map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {!editingId ? (
                <div>
                  <Label>Name (key)</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. invoice_paid_sms"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Lowercase key used by the system (saved as slug).
                  </p>
                </div>
              ) : (
                <div>
                  <Label>Name</Label>
                  <Input value={form.name} disabled className="bg-gray-50" />
                </div>
              )}
              <div>
                <Label>Display name</Label>
                <Input
                  value={form.display_name}
                  onChange={(e) =>
                    setForm({ ...form, display_name: e.target.value })
                  }
                  placeholder="Friendly label"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Channel</Label>
                  <Select
                    value={form.channel}
                    onValueChange={(v) => setForm({ ...form, channel: v })}
                    disabled={!!editingId}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {NOTIFICATION_CHANNELS.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Category</Label>
                  <Select
                    value={form.category}
                    onValueChange={(v) => setForm({ ...form, category: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {NOTIFICATION_TEMPLATE_CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
                    {NOTIFICATION_TEMPLATE_STATUSES.filter(
                      (s) => s.value !== "archived"
                    ).map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {form.channel === "email" ? (
                <div>
                  <Label>Subject</Label>
                  <Input
                    value={form.subject}
                    onChange={(e) =>
                      setForm({ ...form, subject: e.target.value })
                    }
                  />
                </div>
              ) : null}
              <div>
                <Label>Body</Label>
                <Textarea
                  rows={6}
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  placeholder="Hi {{customer_name}}, your invoice {{invoice_number}}…"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Use {"{{placeholder}}"} tokens. Detected:{" "}
                  {detectedKeys.length ? detectedKeys.join(", ") : "none"}
                </p>
              </div>
              <div className="rounded-md border border-gray-100 bg-gray-50 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-xs text-gray-500 uppercase tracking-wide">
                    Placeholders
                  </Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={syncPlaceholdersFromBody}
                  >
                    Sync from body
                  </Button>
                </div>
                {form.placeholders.length === 0 ? (
                  <p className="text-xs text-gray-400">
                    No placeholders yet. Add {"{{keys}}"} in the body, then sync.
                  </p>
                ) : (
                  form.placeholders.map((p, idx) => (
                    <div
                      key={p.key}
                      className="grid grid-cols-2 gap-2 text-sm items-end"
                    >
                      <div>
                        <Label className="text-xs">{p.key}</Label>
                        <Input
                          value={p.label || ""}
                          onChange={(e) => {
                            const next = [...form.placeholders]
                            next[idx] = { ...p, label: e.target.value }
                            setForm({ ...form, placeholders: next })
                          }}
                          placeholder="Label"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Sample</Label>
                        <Input
                          value={p.sample || ""}
                          onChange={(e) => {
                            const next = [...form.placeholders]
                            next[idx] = { ...p, sample: e.target.value }
                            setForm({ ...form, placeholders: next })
                          }}
                          placeholder="Preview value"
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="grid grid-cols-1 gap-3">
                {form.channel === "sms" ? (
                  <div>
                    <Label>DLT template ID</Label>
                    <Input
                      value={form.dlt_template_id}
                      onChange={(e) =>
                        setForm({ ...form, dlt_template_id: e.target.value })
                      }
                      placeholder="Provider / DLT template id"
                    />
                  </div>
                ) : null}
                {form.channel === "whatsapp" ? (
                  <div>
                    <Label>WhatsApp provider template</Label>
                    <Input
                      value={form.provider_template_name}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          provider_template_name: e.target.value,
                        })
                      }
                      placeholder="Approved Meta/BSP template name"
                    />
                  </div>
                ) : null}
                <div>
                  <Label>Provider reference</Label>
                  <Input
                    value={form.provider_reference}
                    onChange={(e) =>
                      setForm({ ...form, provider_reference: e.target.value })
                    }
                    placeholder="Optional external / vendor reference"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    rows={2}
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                  />
                </div>
              </div>
              {previewText != null ? (
                <div className="rounded-md border border-[#4F5077]/20 bg-white p-3 text-sm whitespace-pre-wrap text-gray-700">
                  <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide">
                    Preview
                  </p>
                  {previewText}
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2 pt-1">
                {!formReadOnly ? (
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
                ) : editingId && form.name ? (
                  <Button
                    type="button"
                    disabled={saving}
                    className="gap-2 bg-[#4F5077] hover:bg-[#3d3e5c]"
                    onClick={() =>
                      void cloneRockDefault({
                        id: editingId,
                        name: form.name,
                        channel: form.channel,
                        body: form.body,
                      } as NotificationTemplate)
                    }
                  >
                    <Copy className="w-4 h-4" />
                    Clone to my branch
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={() => void runPreview()}
                >
                  <Eye className="w-4 h-4" />
                  Preview
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
                Templates {loading ? "" : `(${templates.length})`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-12 text-gray-400">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : templates.length === 0 ? (
                <p className="text-sm text-gray-500 py-8 text-center">
                  No templates yet. Create an SMS or WhatsApp template to get
                  started.
                </p>
              ) : (
                <div className="space-y-2">
                  {templates.map((t) => (
                    <div
                      key={t.id}
                      className="rounded-md border border-gray-100 bg-white px-3 py-3 flex flex-wrap items-start justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-[#4F5077]">
                            {t.display_name || t.name}
                          </span>
                          <Badge
                            variant="outline"
                            className={
                              STATUS_CLASS[t.status || "draft"] ||
                              STATUS_CLASS.draft
                            }
                          >
                            {statusLabel(t.status)}
                          </Badge>
                          <Badge variant="outline">
                            {channelLabel(t.channel || t.type)}
                          </Badge>
                          <Badge variant="outline" className="text-gray-500">
                            {t.is_global || !t.branch_id
                              ? "Rock default"
                              : t.branch_name || "Branch"}
                          </Badge>
                          <Badge variant="outline" className="text-gray-500">
                            {categoryLabel(t.category)}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 font-mono">
                          {t.name}
                        </p>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {t.body}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {[
                            t.dlt_template_id
                              ? `DLT: ${t.dlt_template_id}`
                              : null,
                            t.provider_template_name
                              ? `WA: ${t.provider_template_name}`
                              : null,
                            (t.placeholder_keys || []).length
                              ? `{{${(t.placeholder_keys || []).join("}}, {{")}}}`
                              : null,
                          ]
                            .filter(Boolean)
                            .join(" · ") || "No provider ref"}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEdit(t)}
                        >
                          {t.editable === false ||
                          (isBranchManagerOnly &&
                            (t.is_global || !t.branch_id))
                            ? "View"
                            : "Edit"}
                        </Button>
                        {(t.is_global || !t.branch_id) &&
                        (isBranchManagerOnly || managedBranchIds.length > 0 || branches.length > 0) ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={saving}
                            className="gap-1"
                            onClick={() => void cloneRockDefault(t)}
                          >
                            <Copy className="w-3.5 h-3.5" />
                            Clone
                          </Button>
                        ) : null}
                        {t.status !== "archived" &&
                        t.editable !== false &&
                        !(
                          isBranchManagerOnly &&
                          (t.is_global || !t.branch_id)
                        ) ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600"
                            disabled={saving}
                            onClick={() => void archive(t.id)}
                          >
                            Archive
                          </Button>
                        ) : null}
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
