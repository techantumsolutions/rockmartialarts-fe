import { getBackendApiUrl } from "./config"
import { TokenManager } from "./tokenManager"

export type NotificationLog = {
  id: string
  channel?: string
  type?: string
  template_id?: string | null
  template_name?: string | null
  recipient?: string
  status?: string
  message?: string
  content?: string
  subject?: string | null
  error?: string | null
  provider?: string | null
  provider_message_id?: string | null
  attempt?: number
  max_attempts?: number
  can_retry?: boolean
  source?: string
  created_at?: string
  sent_at?: string | null
  next_retry_at?: string | null
  dry_run?: boolean
}

export type NotificationOutboxItem = {
  id: string
  recipient?: string
  channel?: string
  template_name?: string | null
  scheduled_at?: string
  status?: string
  attempt?: number
  last_error?: string | null
  created_at?: string
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

class NotificationSendAPI {
  async provider() {
    const res = await fetch(getBackendApiUrl("notifications/provider"), {
      headers: authHeaders(),
      cache: "no-store",
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ provider: Record<string, unknown> }>
  }

  async listLogs(params: {
    channel?: string
    status?: string
    template_id?: string
    recipient?: string
    source?: string
    search?: string
    skip?: number
    limit?: number
  } = {}) {
    const qs = new URLSearchParams()
    if (params.channel && params.channel !== "all") qs.set("channel", params.channel)
    if (params.status && params.status !== "all") qs.set("status", params.status)
    if (params.template_id) qs.set("template_id", params.template_id)
    if (params.recipient?.trim()) qs.set("recipient", params.recipient.trim())
    if (params.source && params.source !== "all") qs.set("source", params.source)
    if (params.search?.trim()) qs.set("search", params.search.trim())
    qs.set("skip", String(params.skip ?? 0))
    qs.set("limit", String(params.limit ?? 50))
    const res = await fetch(
      getBackendApiUrl(`notifications/logs?${qs.toString()}`),
      { headers: authHeaders(), cache: "no-store" }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{
      logs: NotificationLog[]
      total: number
      summary?: { by_status?: Record<string, number> }
    }>
  }

  async send(body: {
    recipient: string
    channel?: string
    template_id?: string
    template_name?: string
    body?: string
    subject?: string
    context?: Record<string, string>
    dry_run?: boolean
    source?: string
  }) {
    const res = await fetch(getBackendApiUrl("notifications/send"), {
      method: "POST",
      headers: authHeaders(true),
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ message: string; log: NotificationLog }>
  }

  async schedule(body: {
    recipient: string
    scheduled_at: string
    channel?: string
    template_id?: string
    template_name?: string
    body?: string
    context?: Record<string, string>
  }) {
    const res = await fetch(getBackendApiUrl("notifications/schedule"), {
      method: "POST",
      headers: authHeaders(true),
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ message: string; outbox: NotificationOutboxItem }>
  }

  async retry(logId: string, force = false) {
    const res = await fetch(
      getBackendApiUrl(`notifications/logs/${encodeURIComponent(logId)}/retry`),
      {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({ force }),
      }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ message: string; log: NotificationLog }>
  }

  async listOutbox(params: { status?: string; skip?: number; limit?: number } = {}) {
    const qs = new URLSearchParams()
    if (params.status && params.status !== "all") qs.set("status", params.status)
    qs.set("skip", String(params.skip ?? 0))
    qs.set("limit", String(params.limit ?? 50))
    const res = await fetch(
      getBackendApiUrl(`notifications/outbox?${qs.toString()}`),
      { headers: authHeaders(), cache: "no-store" }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ outbox: NotificationOutboxItem[]; total: number }>
  }
}

export const notificationSendAPI = new NotificationSendAPI()

export const NOTIFICATION_LOG_STATUSES = [
  { value: "queued", label: "Queued" },
  { value: "sent", label: "Sent" },
  { value: "stubbed", label: "Stubbed" },
  { value: "failed", label: "Failed" },
  { value: "delivered", label: "Delivered" },
  { value: "skipped", label: "Skipped" },
] as const
