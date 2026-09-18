import { getBackendApiUrl } from "./config"
import { TokenManager } from "./tokenManager"

export const NOTIFICATION_CHANNELS = [
  { value: "sms", label: "SMS" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
] as const

export const NOTIFICATION_TEMPLATE_CATEGORIES = [
  { value: "otp", label: "OTP" },
  { value: "welcome", label: "Welcome" },
  { value: "payment", label: "Payment" },
  { value: "reminder", label: "Reminder" },
  { value: "invoice", label: "Invoice" },
  { value: "event", label: "Event" },
  { value: "marketing", label: "Marketing" },
  { value: "transactional", label: "Transactional" },
  { value: "system", label: "System" },
  { value: "custom", label: "Custom" },
] as const

export const NOTIFICATION_TEMPLATE_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "archived", label: "Archived" },
] as const

export type NotificationTemplatePlaceholder = {
  key: string
  label?: string
  required?: boolean
  sample?: string
}

export type NotificationTemplate = {
  id: string
  name: string
  display_name?: string
  channel?: string
  type?: string
  category?: string
  status?: string
  is_active?: boolean
  subject?: string | null
  body: string
  placeholders?: NotificationTemplatePlaceholder[]
  placeholder_keys?: string[]
  dlt_template_id?: string | null
  provider_template_name?: string | null
  provider_reference?: string | null
  description?: string | null
  branch_id?: string | null
  branch_name?: string | null
  is_global?: boolean
  scope?: string
  editable?: boolean
  is_default?: boolean
  created_at?: string
  updated_at?: string
}

export type NotificationTemplatePayload = {
  name: string
  display_name?: string
  channel?: string
  category?: string
  status?: string
  subject?: string
  body: string
  placeholders?: NotificationTemplatePlaceholder[]
  dlt_template_id?: string
  provider_template_name?: string
  provider_reference?: string
  description?: string
  branch_id?: string
  clear_branch_id?: boolean
  is_default?: boolean
}

function authHeaders(json = false): HeadersInit {
  const token = TokenManager.getToken()
  const h: Record<string, string> = { "Cache-Control": "no-cache" }
  if (token) h.Authorization = `Bearer ${token}`
  else h.Authorization = "Bearer "
  if (json) h["Content-Type"] = "application/json"
  return h
}

async function parseError(res: Response): Promise<string> {
  try {
    const data = await res.json()
    if (typeof data?.detail === "string") return data.detail
    if (Array.isArray(data?.detail)) {
      return data.detail
        .map((d: { msg?: string }) => d.msg || JSON.stringify(d))
        .join("; ")
    }
    return data?.message || res.statusText || "Request failed"
  } catch {
    return res.statusText || "Request failed"
  }
}

class NotificationTemplateAPI {
  async meta() {
    const res = await fetch(getBackendApiUrl("notification-templates/meta"), {
      headers: authHeaders(),
      cache: "no-store",
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{
      placeholders: NotificationTemplatePlaceholder[]
      channels: string[]
      categories: string[]
      statuses: string[]
    }>
  }

  async list(
    params: {
      channel?: string
      category?: string
      status?: string
      branch_id?: string
      scope?: string
      search?: string
      skip?: number
      limit?: number
      include_archived?: boolean
    } = {}
  ) {
    const qs = new URLSearchParams()
    if (params.channel && params.channel !== "all") qs.set("channel", params.channel)
    if (params.category && params.category !== "all")
      qs.set("category", params.category)
    if (params.status && params.status !== "all") qs.set("status", params.status)
    if (params.branch_id && params.branch_id !== "all")
      qs.set("branch_id", params.branch_id)
    if (params.scope && params.scope !== "all") qs.set("scope", params.scope)
    if (params.search?.trim()) qs.set("search", params.search.trim())
    if (params.include_archived) qs.set("include_archived", "true")
    qs.set("skip", String(params.skip ?? 0))
    qs.set("limit", String(params.limit ?? 50))
    const res = await fetch(
      getBackendApiUrl(`notification-templates?${qs.toString()}`),
      { headers: authHeaders(), cache: "no-store" }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{
      templates: NotificationTemplate[]
      total: number
      managed_branch_ids?: string[]
    }>
  }

  async resolve(params: {
    name: string
    channel?: string
    branch_id?: string
  }) {
    const qs = new URLSearchParams()
    qs.set("name", params.name)
    if (params.channel) qs.set("channel", params.channel)
    if (params.branch_id) qs.set("branch_id", params.branch_id)
    const res = await fetch(
      getBackendApiUrl(`notification-templates/resolve?${qs.toString()}`),
      { headers: authHeaders(), cache: "no-store" }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{
      template: NotificationTemplate | null
      resolution: "branch" | "global" | "none"
      fallback_used?: boolean
    }>
  }

  async cloneToBranch(body: {
    name: string
    branch_id: string
    channel?: string
  }) {
    const res = await fetch(
      getBackendApiUrl("notification-templates/clone-to-branch"),
      {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify(body),
      }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{
      message: string
      template: NotificationTemplate
      created?: boolean
    }>
  }

  async get(id: string) {
    const res = await fetch(
      getBackendApiUrl(`notification-templates/${encodeURIComponent(id)}`),
      { headers: authHeaders(), cache: "no-store" }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ template: NotificationTemplate }>
  }

  async create(body: NotificationTemplatePayload) {
    const res = await fetch(getBackendApiUrl("notification-templates"), {
      method: "POST",
      headers: authHeaders(true),
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ message: string; template: NotificationTemplate }>
  }

  async update(id: string, body: Partial<NotificationTemplatePayload>) {
    const res = await fetch(
      getBackendApiUrl(`notification-templates/${encodeURIComponent(id)}`),
      {
        method: "PATCH",
        headers: authHeaders(true),
        body: JSON.stringify(body),
      }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ message: string; template: NotificationTemplate }>
  }

  async archive(id: string) {
    const res = await fetch(
      getBackendApiUrl(`notification-templates/${encodeURIComponent(id)}`),
      { method: "DELETE", headers: authHeaders() }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json()
  }

  async preview(id: string, context: Record<string, string> = {}) {
    const res = await fetch(
      getBackendApiUrl(
        `notification-templates/${encodeURIComponent(id)}/preview`
      ),
      {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({ context }),
      }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{
      rendered_body: string
      rendered_subject?: string | null
      missing_placeholders: string[]
    }>
  }
}

export const notificationTemplateAPI = new NotificationTemplateAPI()

export function channelLabel(v?: string | null) {
  return NOTIFICATION_CHANNELS.find((c) => c.value === v)?.label || v || "—"
}

export function categoryLabel(v?: string | null) {
  return (
    NOTIFICATION_TEMPLATE_CATEGORIES.find((c) => c.value === v)?.label ||
    v ||
    "—"
  )
}

export function statusLabel(v?: string | null) {
  return (
    NOTIFICATION_TEMPLATE_STATUSES.find((c) => c.value === v)?.label || v || "—"
  )
}
