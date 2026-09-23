"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Loader2, RefreshCw, Send, Clock } from "lucide-react"
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
import { usePathname } from "next/navigation"
import {
  NOTIFICATION_CHANNELS,
  notificationTemplateAPI,
  type NotificationTemplate,
} from "@/lib/notificationTemplateAPI"
import {
  NOTIFICATION_LOG_STATUSES,
  notificationSendAPI,
  type NotificationLog,
  type NotificationOutboxItem,
} from "@/lib/notificationSendAPI"

const STATUS_CLASS: Record<string, string> = {
  sent: "bg-green-50 text-green-800 border-green-200",
  delivered: "bg-green-50 text-green-800 border-green-200",
  stubbed: "bg-blue-50 text-blue-800 border-blue-200",
  failed: "bg-red-50 text-red-800 border-red-200",
  queued: "bg-amber-50 text-amber-800 border-amber-200",
  skipped: "bg-gray-100 text-gray-600 border-gray-200",
}

export default function NotificationDeliveryAdminPage() {
  const { toast } = useToast()
  const pathname = usePathname()
  const base = pathname?.includes("/branch-admin/")
    ? "/branch-admin/dashboard"
    : "/super-admin/dashboard"

  const [logs, setLogs] = useState<NotificationLog[]>([])
  const [outbox, setOutbox] = useState<NotificationOutboxItem[]>([])
  const [templates, setTemplates] = useState<NotificationTemplate[]>([])
  const [summary, setSummary] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [channelFilter, setChannelFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [search, setSearch] = useState("")

  const [recipient, setRecipient] = useState("")
  const [channel, setChannel] = useState("sms")
  const [templateId, setTemplateId] = useState("")
  const [rawBody, setRawBody] = useState("")
  const [contextJson, setContextJson] = useState('{"name":"Ravi"}')
  const [scheduleAt, setScheduleAt] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [logData, outData, tplData] = await Promise.all([
        notificationSendAPI.listLogs({
          channel: channelFilter,
          status: statusFilter,
          search: search || undefined,
          limit: 50,
        }),
        notificationSendAPI.listOutbox({ status: "queued", limit: 20 }),
        notificationTemplateAPI.list({ status: "active", limit: 100 }),
      ])
      setLogs(logData.logs || [])
      setSummary(logData.summary?.by_status || {})
      setOutbox(outData.outbox || [])
      setTemplates(tplData.templates || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [channelFilter, statusFilter, search])

  useEffect(() => {
    void load()
  }, [load])

  const parseContext = (): Record<string, string> | undefined => {
    const raw = contextJson.trim()
    if (!raw) return undefined
    try {
      const obj = JSON.parse(raw)
      if (obj && typeof obj === "object") {
        const out: Record<string, string> = {}
        for (const [k, v] of Object.entries(obj)) out[k] = String(v)
        return out
      }
    } catch {
      throw new Error("Context must be valid JSON object")
    }
    return undefined
  }

  const doSend = async (dryRun: boolean) => {
    if (!recipient.trim()) {
      toast({ title: "Recipient phone required", variant: "destructive" })
      return
    }
    if (!templateId && !rawBody.trim()) {
      toast({
        title: "Select a template or enter a body",
        variant: "destructive",
      })
      return
    }
    setBusy(true)
    try {
      const context = parseContext()
      const result = await notificationSendAPI.send({
        recipient: recipient.trim(),
        channel,
        template_id: templateId || undefined,
        body: templateId ? undefined : rawBody.trim() || undefined,
        context,
        dry_run: dryRun,
        source: "admin_send",
      })
      toast({
        title: dryRun ? "Dry run OK" : "Notification processed",
        description: `Status: ${result.log?.status || "—"}`,
      })
      if (!dryRun) await load()
    } catch (e) {
      toast({
        title: "Send failed",
        description: e instanceof Error ? e.message : "Error",
        variant: "destructive",
      })
    } finally {
      setBusy(false)
    }
  }

  const doSchedule = async () => {
    if (!recipient.trim() || !scheduleAt.trim()) {
      toast({
        title: "Recipient and schedule time required",
        variant: "destructive",
      })
      return
    }
    if (!templateId && !rawBody.trim()) {
      toast({
        title: "Select a template or enter a body",
        variant: "destructive",
      })
      return
    }
    setBusy(true)
    try {
      const context = parseContext()
      const local = scheduleAt.trim()
      const scheduled_at =
        local.length === 16 ? `${local}:00` : local
      await notificationSendAPI.schedule({
        recipient: recipient.trim(),
        scheduled_at,
        channel,
        template_id: templateId || undefined,
        body: templateId ? undefined : rawBody.trim() || undefined,
        context,
      })
      toast({ title: "Scheduled" })
      setScheduleAt("")
      await load()
    } catch (e) {
      toast({
        title: "Schedule failed",
        description: e instanceof Error ? e.message : "Error",
        variant: "destructive",
      })
    } finally {
      setBusy(false)
    }
  }

  const doRetry = async (id: string) => {
    setBusy(true)
    try {
      const result = await notificationSendAPI.retry(id)
      toast({
        title: "Retry processed",
        description: `Status: ${result.log?.status}`,
      })
      await load()
    } catch (e) {
      toast({
        title: "Retry failed",
        description: e instanceof Error ? e.message : "Error",
        variant: "destructive",
      })
    } finally {
      setBusy(false)
    }
  }

  const activeTemplates = templates.filter(
    (t) => !channel || channel === "all" || t.channel === channel || t.type === channel
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="w-full p-4 lg:px-8 lg:py-6 space-y-6 max-w-6xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#4F5077]">
              Notification delivery
            </h1>
            <p className="text-sm text-[#6B7A99] mt-1">
              Send, schedule, and track SMS / WhatsApp delivery logs.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Manage templates in{" "}
              <Link
                href={`${base}/settings/notification-templates`}
                className="text-[#4F5077] underline"
              >
                Notification Templates
              </Link>
              .
            </p>
          </div>
          <Button variant="outline" onClick={() => void load()} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>

        {Object.keys(summary).length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {Object.entries(summary).map(([k, v]) => (
              <Badge
                key={k}
                variant="outline"
                className={STATUS_CLASS[k] || "bg-white"}
              >
                {k}: {v}
              </Badge>
            ))}
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
            <Label>Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {NOTIFICATION_LOG_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
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
              placeholder="Phone, message, template…"
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
                Send / schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Recipient phone</Label>
                <Input
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="9876543210"
                />
              </div>
              <div>
                <Label>Channel</Label>
                <Select
                  value={channel}
                  onValueChange={(v) => {
                    setChannel(v)
                    setTemplateId("")
                  }}
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
                <Label>Template (optional)</Label>
                <Select
                  value={templateId || "none"}
                  onValueChange={(v) => setTemplateId(v === "none" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None — use raw body" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None — raw body</SelectItem>
                    {activeTemplates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.display_name || t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {!templateId ? (
                <div>
                  <Label>Message body</Label>
                  <Textarea
                    rows={4}
                    value={rawBody}
                    onChange={(e) => setRawBody(e.target.value)}
                    placeholder="Hi {{name}}, …"
                  />
                </div>
              ) : null}
              <div>
                <Label>Context JSON</Label>
                <Textarea
                  rows={3}
                  value={contextJson}
                  onChange={(e) => setContextJson(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={busy}
                  onClick={() => void doSend(true)}
                  variant="outline"
                >
                  Dry run
                </Button>
                <Button
                  disabled={busy}
                  onClick={() => void doSend(false)}
                  className="gap-2 bg-[#FFB70F] hover:bg-[#e0a00d] text-black"
                >
                  {busy ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Send now
                </Button>
              </div>
              <div className="border-t pt-3 space-y-2">
                <Label>Schedule for later</Label>
                <Input
                  type="datetime-local"
                  value={scheduleAt}
                  onChange={(e) => setScheduleAt(e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  className="gap-2"
                  onClick={() => void doSchedule()}
                >
                  <Clock className="w-4 h-4" />
                  Queue scheduled send
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="lg:col-span-3 space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-[#4F5077]">
                  Delivery logs {loading ? "" : `(${logs.length})`}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-10 text-gray-400">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : logs.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">
                    No delivery logs yet.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[28rem] overflow-y-auto">
                    {logs.map((log) => (
                      <div
                        key={log.id}
                        className="rounded-md border border-gray-100 bg-white px-3 py-2.5"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant="outline"
                            className={
                              STATUS_CLASS[log.status || ""] || STATUS_CLASS.skipped
                            }
                          >
                            {log.status}
                          </Badge>
                          <Badge variant="outline">{log.channel || log.type}</Badge>
                          <span className="text-sm text-gray-700">
                            {log.recipient}
                          </span>
                          <span className="text-xs text-gray-400 ml-auto">
                            {log.created_at
                              ? new Date(log.created_at).toLocaleString()
                              : ""}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {log.message || log.content}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-400">
                          <span>
                            {log.template_name || "raw"} · attempt{" "}
                            {log.attempt}/{log.max_attempts}
                          </span>
                          {log.error ? (
                            <span className="text-red-500">{log.error}</span>
                          ) : null}
                          {log.can_retry || log.status === "failed" ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-[#4F5077]"
                              disabled={busy}
                              onClick={() => void doRetry(log.id)}
                            >
                              Retry
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-[#4F5077]">
                  Scheduled queue ({outbox.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {outbox.length === 0 ? (
                  <p className="text-sm text-gray-500">No queued items.</p>
                ) : (
                  <div className="space-y-2">
                    {outbox.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-wrap justify-between gap-2 text-sm border-b border-gray-50 pb-2"
                      >
                        <span>
                          {item.recipient} · {item.channel} ·{" "}
                          {item.template_name || "raw"}
                        </span>
                        <span className="text-gray-400">
                          {item.scheduled_at
                            ? new Date(item.scheduled_at).toLocaleString()
                            : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-3">
                  Cron: POST /api/notifications/cron/process with secret to
                  process due items and retries.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
