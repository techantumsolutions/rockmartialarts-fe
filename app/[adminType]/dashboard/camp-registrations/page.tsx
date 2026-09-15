"use client"

import { useCallback, useEffect, useState } from "react"
import { getBackendApiUrl } from "@/lib/config"
import { TokenManager } from "@/lib/tokenManager"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RefreshCw, Search } from "lucide-react"
import { resolvePublicAssetUrl } from "@/lib/resolvePublicAssetUrl"

type EventOption = { event_id: string; event_name: string; event_dates?: string }

type Row = {
  id: string
  status?: string
  event_id?: string
  event_name?: string
  event_dates?: string
  event_location?: string
  full_name?: string
  parent_guardian_mobile?: string
  email?: string
  payment_mode?: string
  transaction_id?: string
  created_at?: string
}

type Detail = {
  id: string
  status?: string
  event?: {
    event_id?: string
    event_name?: string
    event_dates?: string
    event_location?: string
    fee_total?: string
    fee_pay_now?: string
    fee_balance?: string
    refund_text?: string
  }
  participant?: Record<string, string>
  training?: Record<string, string>
  medical?: Record<string, string>
  food?: Record<string, string>
  emergency?: Record<string, string>
  residential?: Record<string, string>
  payment?: Record<string, string | boolean>
  rules?: Record<string, boolean>
  photo?: { consent?: boolean }
  parent_consent?: Record<string, string | boolean>
  hear_about?: { sources?: string[]; other_source?: string; referred_by?: string }
  final?: Record<string, string | boolean>
  created_at?: string
}

export default function CampRegistrationsPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [events, setEvents] = useState<EventOption[]>([])
  const [total, setTotal] = useState(0)
  const [skip, setSkip] = useState(0)
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [eventId, setEventId] = useState("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [detail, setDetail] = useState<Detail | null>(null)
  const limit = 25

  const load = useCallback(async () => {
    const token = TokenManager.getToken()
    if (!token) {
      setError("Not authenticated")
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const q = new URLSearchParams({ skip: String(skip), limit: String(limit) })
      if (search.trim()) q.set("search", search.trim())
      if (eventId !== "all") q.set("event_id", eventId)
      const res = await fetch(getBackendApiUrl(`camp-registrations?${q.toString()}`), {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        cache: "no-store",
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Failed to load")
      setRows(Array.isArray(data.items) ? data.items : [])
      setTotal(typeof data.total === "number" ? data.total : 0)
      setEvents(Array.isArray(data.events) ? data.events : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load")
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [skip, search, eventId])

  useEffect(() => {
    load()
  }, [load])

  const openDetail = async (id: string) => {
    const token = TokenManager.getToken()
    if (!token) return
    const res = await fetch(getBackendApiUrl(`camp-registrations/${encodeURIComponent(id)}`), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
    if (!res.ok) return
    setDetail(await res.json())
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Camp registrations</h1>
            <p className="text-gray-600 text-sm">Residential camp form submissions, grouped by event</p>
          </div>
          <Button type="button" variant="outline" onClick={() => load()} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Submissions ({total})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              className="flex flex-col sm:flex-row gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                setSkip(0)
                setSearch(searchInput)
              }}
            >
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search name, phone, email, event…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select
                value={eventId}
                onValueChange={(v) => {
                  setSkip(0)
                  setEventId(v)
                }}
              >
                <SelectTrigger className="h-10 w-full sm:w-[280px] bg-white">
                  <SelectValue placeholder="All events" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All events</SelectItem>
                  {events.map((ev) => (
                    <SelectItem key={ev.event_id} value={ev.event_id}>
                      {ev.event_name}
                      {ev.event_dates ? ` • ${ev.event_dates}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="submit" className="bg-yellow-400 hover:bg-yellow-500 text-white">
                Search
              </Button>
            </form>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {loading ? (
              <p className="text-gray-500 text-sm py-8 text-center">Loading…</p>
            ) : rows.length === 0 ? (
              <p className="text-gray-500 text-sm py-8 text-center">No camp registrations found.</p>
            ) : (
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-100 text-gray-700">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Event</th>
                      <th className="px-3 py-2 font-semibold">Participant</th>
                      <th className="px-3 py-2 font-semibold">Parent mobile</th>
                      <th className="px-3 py-2 font-semibold">Email</th>
                      <th className="px-3 py-2 font-semibold">Status</th>
                      <th className="px-3 py-2 font-semibold">Payment</th>
                      <th className="px-3 py-2 font-semibold">Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr
                        key={row.id}
                        className="border-t hover:bg-yellow-50 cursor-pointer"
                        onClick={() => openDetail(row.id)}
                      >
                        <td className="px-3 py-2">
                          <div className="font-medium">{row.event_name || "—"}</div>
                          <div className="text-xs text-gray-500">{row.event_dates}</div>
                        </td>
                        <td className="px-3 py-2">{row.full_name}</td>
                        <td className="px-3 py-2">{row.parent_guardian_mobile}</td>
                        <td className="px-3 py-2">{row.email}</td>
                        <td className="px-3 py-2">{statusLabel(row.status)}</td>
                        <td className="px-3 py-2">{row.payment_mode || "—"}</td>
                        <td className="px-3 py-2">
                          {row.created_at ? new Date(row.created_at).toLocaleString() : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {total > limit ? (
              <div className="flex justify-end gap-2">
                <Button variant="outline" disabled={skip === 0} onClick={() => setSkip(Math.max(0, skip - limit))}>
                  Previous
                </Button>
                <Button variant="outline" disabled={skip + limit >= total} onClick={() => setSkip(skip + limit)}>
                  Next
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {detail ? (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setDetail(null)}>
          <div
            className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-auto p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">{detail.participant?.full_name || "Registration"}</h2>
                <p className="text-sm text-gray-600">
                  {statusLabel(detail.status)} {detail.event?.event_name} {detail.event?.event_dates ? `• ${detail.event.event_dates}` : ""}{" "}
                  {detail.event?.event_location ? `• ${detail.event.event_location}` : ""}
                </p>
              </div>
              <Button variant="outline" onClick={() => setDetail(null)}>
                Close
              </Button>
            </div>
            <Section title="Fees at registration">
              <p>Total: {detail.event?.fee_total}</p>
              <p>Pay now: {detail.event?.fee_pay_now}</p>
              <p>Balance: {detail.event?.fee_balance}</p>
              <p>{detail.event?.refund_text}</p>
            </Section>
            <Kv title="Participant" data={detail.participant} />
            <Kv title="Training" data={detail.training} />
            <Kv title="Medical" data={detail.medical} />
            <Kv title="Food" data={detail.food} />
            <Kv title="Emergency" data={detail.emergency} />
            <Kv title="Residential" data={detail.residential} />
            <Section title="Payment">
              <p>Mode: {String(detail.payment?.payment_mode || "")}</p>
              <p>Other: {String(detail.payment?.other_mode || "")}</p>
              <p>Txn: {String(detail.payment?.transaction_id || "")}</p>
              {typeof detail.payment?.screenshot_url === "string" && detail.payment.screenshot_url ? (
                <a
                  className="text-yellow-700 underline"
                  href={resolvePublicAssetUrl(detail.payment.screenshot_url)}
                  target="_blank"
                  rel="noreferrer"
                >
                  View screenshot
                </a>
              ) : null}
            </Section>
            <Section title="Hear about us">
              <p>{(detail.hear_about?.sources || []).join(", ")}</p>
              <p>Other: {detail.hear_about?.other_source}</p>
              <p>Referred by: {detail.hear_about?.referred_by}</p>
            </Section>
            {typeof detail.parent_consent?.signature === "string" && detail.parent_consent.signature ? (
              <Section title="Parent signature">
                <img src={detail.parent_consent.signature} alt="Parent signature" className="max-h-24 border" />
              </Section>
            ) : null}
            {typeof detail.final?.signature === "string" && detail.final.signature ? (
              <Section title="Final signature">
                <img src={detail.final.signature} alt="Final signature" className="max-h-24 border" />
              </Section>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function statusLabel(status?: string) {
  if (status === "paid") return "Paid"
  if (status === "pending_payment") return "Pending payment"
  if (status === "received") return "Received"
  return status || "—"
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-semibold text-[#4F5077] mb-1">{title}</h3>
      <div className="text-sm text-gray-800 space-y-1">{children}</div>
    </div>
  )
}

function Kv({ title, data }: { title: string; data?: Record<string, unknown> }) {
  if (!data) return null
  return (
    <Section title={title}>
      {Object.entries(data).map(([k, v]) => (
        <p key={k}>
          <span className="text-gray-500">{k.replace(/_/g, " ")}: </span>
          {String(v ?? "")}
        </p>
      ))}
    </Section>
  )
}
