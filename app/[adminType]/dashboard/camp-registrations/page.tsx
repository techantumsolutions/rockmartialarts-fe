"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  Coins,
  Droplets,
  GraduationCap,
  HeartPulse,
  Home,
  Mail,
  MapPin,
  Phone,
  Pill,
  RefreshCw,
  Search,
  Shield,
  User,
  UserRound,
  Utensils,
} from "lucide-react"
import { getBackendApiUrl } from "@/lib/config"
import { TokenManager } from "@/lib/tokenManager"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { resolvePublicAssetUrl } from "@/lib/resolvePublicAssetUrl"
import {
  BeautifiedField,
  BeautifiedFooterNote,
  BeautifiedHero,
  BeautifiedModal,
  BeautifiedSection,
} from "@/components/ui/beautified-modal"

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

function pick(data: Record<string, unknown> | undefined, keys: string[]): string {
  if (!data) return ""
  for (const k of keys) {
    const v = data[k]
    if (v !== null && v !== undefined && String(v).trim() !== "") return String(v)
  }
  return ""
}

function statusLabel(status?: string) {
  if (status === "paid") return "Paid"
  if (status === "pending_payment") return "Pending payment"
  if (status === "received") return "Received"
  if (status === "registered") return "Registered"
  return status ? status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—"
}

function statusTone(status?: string): "success" | "warning" | "danger" | "info" | "neutral" {
  if (status === "paid" || status === "received" || status === "registered") return "success"
  if (status === "pending_payment") return "warning"
  if (status === "cancelled" || status === "rejected") return "danger"
  return "info"
}

function shortId(id?: string) {
  if (!id) return "—"
  const clean = id.replace(/-/g, "").toUpperCase()
  return `CR-${clean.slice(-5)}`
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

  const participantName = useMemo(
    () => pick(detail?.participant, ["full_name", "name", "participant_name"]) || "Participant",
    [detail]
  )

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:px-8">
      <div className="w-full max-w-none space-y-6">
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
              <Button type="submit">Search</Button>
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

      <BeautifiedModal
        open={!!detail}
        onClose={() => setDetail(null)}
        title="Camp Registration – Participant Details"
        subtitle="Complete registration information, training, and medical details."
        icon={CalendarDays}
        tone="violet"
        size="lg"
        footer={
          <BeautifiedFooterNote
            icon={Coins}
            balance={
              <>
                Balance ₹ {detail?.event?.fee_balance || pick(detail?.payment as Record<string, unknown>, ["balance", "fee_balance"]) || "—"}
              </>
            }
            note={
              detail?.event?.refund_text ||
              "Registration/payment is non-refundable once confirmed."
            }
          />
        }
      >
        {detail ? (
          <>
            <BeautifiedHero
              name={participantName}
              idLabel={shortId(detail.id)}
              statusLabel={statusLabel(detail.status)}
              statusTone={statusTone(detail.status)}
              subtitle={[
                detail.event?.event_name,
                detail.event?.event_dates,
                detail.event?.event_location,
              ]
                .filter(Boolean)
                .join(" • ")}
            />

            <BeautifiedSection title="Participant Information" icon={User} tone="blue">
              <BeautifiedField
                label="Full Name"
                value={pick(detail.participant, ["full_name", "name"])}
                icon={User}
                tone="blue"
              />
              <BeautifiedField
                label="DOB"
                value={pick(detail.participant, ["dob", "date_of_birth", "birth_date"])}
                icon={CalendarDays}
                tone="blue"
              />
              <BeautifiedField
                label="Age"
                value={pick(detail.participant, ["age"])}
                icon={Activity}
                tone="blue"
              />
              <BeautifiedField
                label="Gender"
                value={pick(detail.participant, ["gender"])}
                icon={UserRound}
                tone="blue"
              />
              <BeautifiedField
                label="Guardian Name"
                value={pick(detail.participant, [
                  "guardian_name",
                  "parent_guardian_name",
                  "parent_name",
                ])}
                icon={Shield}
                tone="blue"
              />
              <BeautifiedField
                label="Guardian Relation"
                value={pick(detail.participant, [
                  "guardian_relation",
                  "parent_guardian_relation",
                  "relation",
                ])}
                icon={UserRound}
                tone="blue"
              />
              <BeautifiedField
                label="Contact"
                value={pick(detail.participant, [
                  "parent_guardian_mobile",
                  "mobile",
                  "phone",
                  "contact",
                ])}
                icon={Phone}
                tone="blue"
              />
              <BeautifiedField
                label="Email"
                value={pick(detail.participant, ["email"])}
                icon={Mail}
                tone="blue"
              />
              <BeautifiedField
                label="Address"
                value={pick(detail.participant, ["address", "full_address", "residential_address"])}
                icon={MapPin}
                tone="blue"
              />
            </BeautifiedSection>

            <BeautifiedSection title="Training Information" icon={GraduationCap} tone="green">
              <BeautifiedField
                label="Level"
                value={pick(detail.training, ["level", "belt_level", "current_level", "course_level"])}
                icon={GraduationCap}
                tone="green"
              />
              <BeautifiedField
                label="Trained Before"
                value={pick(detail.training, ["trained_before", "prior_training", "previous_training"])}
                icon={Activity}
                tone="green"
              />
              <BeautifiedField
                label="Current Sports"
                value={pick(detail.training, ["current_sports", "sports", "other_sports"])}
                icon={Activity}
                tone="green"
              />
              <BeautifiedField
                label="Fitness Level"
                value={pick(detail.training, ["fitness_level", "fitness"])}
                icon={HeartPulse}
                tone="green"
              />
            </BeautifiedSection>

            <BeautifiedSection title="Medical Information" icon={HeartPulse} tone="rose">
              <BeautifiedField
                label="Injury"
                value={pick(detail.medical, ["injury", "injuries", "recent_injury"])}
                icon={AlertTriangle}
                tone="rose"
              />
              <BeautifiedField
                label="Medical Condition"
                value={pick(detail.medical, ["medical_condition", "condition", "conditions"])}
                icon={HeartPulse}
                tone="rose"
              />
              <BeautifiedField
                label="Allergies"
                value={pick(detail.medical, ["allergies", "allergy"])}
                icon={AlertTriangle}
                tone="rose"
              />
              <BeautifiedField
                label="Medication"
                value={pick(detail.medical, ["medication", "medications", "current_medication"])}
                icon={Pill}
                tone="rose"
              />
              <BeautifiedField
                label="Blood Group"
                value={pick(detail.medical, ["blood_group", "blood_type"])}
                icon={Droplets}
                tone="rose"
              />
            </BeautifiedSection>

            {(detail.food || detail.emergency || detail.residential) && (
              <BeautifiedSection title="Camp & Emergency" icon={Home} tone="teal">
                {detail.food ? (
                  <>
                    <BeautifiedField
                      label="Food Preference"
                      value={pick(detail.food, ["preference", "food_preference", "diet"])}
                      icon={Utensils}
                      tone="teal"
                    />
                    <BeautifiedField
                      label="Food Notes"
                      value={pick(detail.food, ["notes", "special_requests", "other"])}
                      icon={Utensils}
                      tone="teal"
                    />
                  </>
                ) : null}
                {detail.emergency ? (
                  <>
                    <BeautifiedField
                      label="Emergency Contact"
                      value={pick(detail.emergency, ["name", "contact_name", "emergency_name"])}
                      icon={Shield}
                      tone="teal"
                    />
                    <BeautifiedField
                      label="Emergency Phone"
                      value={pick(detail.emergency, ["phone", "mobile", "contact_phone"])}
                      icon={Phone}
                      tone="teal"
                    />
                  </>
                ) : null}
                {detail.residential ? (
                  <BeautifiedField
                    label="Accommodation"
                    value={pick(detail.residential, ["accommodation", "room_type", "stay"])}
                    icon={Home}
                    tone="teal"
                  />
                ) : null}
              </BeautifiedSection>
            )}

            <BeautifiedSection title="Payment & Fees" icon={Coins} tone="amber">
              <BeautifiedField label="Fee Total" value={detail.event?.fee_total} icon={Coins} tone="amber" />
              <BeautifiedField label="Pay Now" value={detail.event?.fee_pay_now} icon={Coins} tone="amber" />
              <BeautifiedField label="Balance" value={detail.event?.fee_balance} icon={Coins} tone="amber" />
              <BeautifiedField
                label="Payment Mode"
                value={String(detail.payment?.payment_mode || "")}
                icon={Coins}
                tone="amber"
              />
              <BeautifiedField
                label="Transaction"
                value={String(detail.payment?.transaction_id || "")}
                icon={Coins}
                tone="amber"
              />
              {typeof detail.payment?.screenshot_url === "string" && detail.payment.screenshot_url ? (
                <BeautifiedField
                  label="Screenshot"
                  value={
                    <a
                      className="text-[#B45309] underline"
                      href={resolvePublicAssetUrl(detail.payment.screenshot_url)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View screenshot
                    </a>
                  }
                  tone="amber"
                />
              ) : null}
            </BeautifiedSection>

            {(detail.hear_about?.sources?.length ||
              detail.hear_about?.other_source ||
              detail.hear_about?.referred_by) && (
              <BeautifiedSection title="Hear About Us" icon={User} tone="slate">
                <BeautifiedField
                  label="Sources"
                  value={(detail.hear_about?.sources || []).join(", ")}
                  tone="slate"
                />
                <BeautifiedField label="Other" value={detail.hear_about?.other_source} tone="slate" />
                <BeautifiedField label="Referred By" value={detail.hear_about?.referred_by} tone="slate" />
              </BeautifiedSection>
            )}

            {(typeof detail.parent_consent?.signature === "string" && detail.parent_consent.signature) ||
            (typeof detail.final?.signature === "string" && detail.final.signature) ? (
              <BeautifiedSection title="Signatures" icon={Shield} tone="violet">
                {typeof detail.parent_consent?.signature === "string" && detail.parent_consent.signature ? (
                  <div className="px-4 py-3">
                    <p className="mb-2 text-xs text-[#64748B]">Parent signature</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={detail.parent_consent.signature}
                      alt="Parent signature"
                      className="max-h-24 rounded-lg border border-[#E2E8F0] bg-white"
                    />
                  </div>
                ) : null}
                {typeof detail.final?.signature === "string" && detail.final.signature ? (
                  <div className="px-4 py-3">
                    <p className="mb-2 text-xs text-[#64748B]">Final signature</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={detail.final.signature}
                      alt="Final signature"
                      className="max-h-24 rounded-lg border border-[#E2E8F0] bg-white"
                    />
                  </div>
                ) : null}
              </BeautifiedSection>
            ) : null}
          </>
        ) : null}
      </BeautifiedModal>
    </div>
  )
}
