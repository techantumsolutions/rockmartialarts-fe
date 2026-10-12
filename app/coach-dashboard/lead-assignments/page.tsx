"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import CoachDashboardHeader from "@/components/coach-dashboard-header"
import { checkCoachAuth } from "@/lib/coachAuth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import {
  assignmentStatusLabel,
  leadCoachAssignmentAPI,
  type LeadCoachAssignment,
} from "@/lib/leadCoachAssignmentAPI"
import {
  LEAD_FOLLOW_UP_ACTIONS,
  LEAD_STATUSES,
  leadPriorityLabel,
  leadStatusLabel,
  type LeadFollowUp,
  type LeadStatus,
} from "@/lib/leadAPI"

function fromDatetimeLocal(value: string): string | undefined {
  if (!value) return undefined
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return undefined
  return d.toISOString()
}

export default function CoachLeadAssignmentsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [coachName, setCoachName] = useState("Coach")
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<LeadCoachAssignment[]>([])
  const [statusFilter, setStatusFilter] = useState("pending")
  const [actingId, setActingId] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<{
    id: string
    action: "accept" | "decline"
    name: string
  } | null>(null)
  const [confirmMessage, setConfirmMessage] = useState("")
  const [confirmError, setConfirmError] = useState("")
  const [historyOpen, setHistoryOpen] = useState<string | null>(null)
  const [history, setHistory] = useState<Record<string, LeadFollowUp[]>>({})
  const [historyLoading, setHistoryLoading] = useState<string | null>(null)
  const [followNote, setFollowNote] = useState<Record<string, string>>({})
  const [followAction, setFollowAction] = useState<Record<string, string>>({})
  const [followNext, setFollowNext] = useState<Record<string, string>>({})

  useEffect(() => {
    const auth = checkCoachAuth()
    if (!auth.isAuthenticated) {
      router.push("/coach/login")
      return
    }
    setCoachName(auth.coach?.full_name || "Coach")
    setReady(true)
  }, [router])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await leadCoachAssignmentAPI.myAssignments(statusFilter, 0, 50)
      setRows(Array.isArray(data.assignments) ? data.assignments : [])
    } catch (e) {
      toast({
        title: "Could not load assignments",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      })
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [statusFilter, toast])

  useEffect(() => {
    if (ready) void load()
  }, [ready, load])

  const openConfirm = (row: LeadCoachAssignment, action: "accept" | "decline") => {
    setConfirm({ id: row.id, action, name: row.lead_name || "this lead" })
    setConfirmMessage("")
    setConfirmError("")
  }

  const submitConfirm = async () => {
    if (!confirm) return
    const message = confirmMessage.trim()
    if (confirm.action === "decline" && !message) {
      setConfirmError("A reason is required to decline.")
      return
    }
    setActingId(confirm.id)
    setConfirmError("")
    try {
      if (confirm.action === "accept") {
        await leadCoachAssignmentAPI.accept(confirm.id, message || undefined)
        toast({ title: "Assignment accepted" })
      } else {
        await leadCoachAssignmentAPI.decline(confirm.id, message)
        toast({ title: "Assignment declined" })
      }
      setConfirm(null)
      setConfirmMessage("")
      await load()
    } catch (e) {
      toast({
        title: confirm.action === "accept" ? "Could not accept" : "Could not decline",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setActingId(null)
    }
  }

  const loadHistory = async (id: string) => {
    setHistoryLoading(id)
    try {
      const data = await leadCoachAssignmentAPI.followUps(id)
      setHistory((prev) => ({ ...prev, [id]: Array.isArray(data.follow_ups) ? data.follow_ups : [] }))
      setHistoryOpen(id)
    } catch (e) {
      toast({
        title: "Could not load follow-up history",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setHistoryLoading(null)
    }
  }

  const changeLeadStatus = async (row: LeadCoachAssignment, next: LeadStatus) => {
    if ((row.lead_status || "new") === next) return
    setActingId(row.id)
    try {
      const res = await leadCoachAssignmentAPI.updateLeadStatus(row.id, next)
      setRows((list) =>
        list.map((item) =>
          item.id === row.id ? { ...item, lead_status: res.lead?.status || next } : item
        )
      )
      toast({ title: "Lead status updated" })
      if (historyOpen === row.id) await loadHistory(row.id)
    } catch (e) {
      toast({
        title: "Could not update status",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setActingId(null)
    }
  }

  const logFollowUp = async (row: LeadCoachAssignment) => {
    const note = followNote[row.id]?.trim() || ""
    const nextIso = fromDatetimeLocal(followNext[row.id] || "")
    if (!note && !nextIso) {
      toast({
        title: "Add a note, status, or next follow-up date",
        variant: "destructive",
      })
      return
    }
    setActingId(row.id)
    try {
      const res = await leadCoachAssignmentAPI.createFollowUp(row.id, {
        note: note || undefined,
        action: followAction[row.id] || "call",
        next_follow_up_at: nextIso,
      })
      setRows((list) =>
        list.map((item) =>
          item.id === row.id ? { ...item, lead_status: res.lead?.status || item.lead_status } : item
        )
      )
      setFollowNote((prev) => ({ ...prev, [row.id]: "" }))
      setHistory((prev) => ({
        ...prev,
        [row.id]: [res.follow_up, ...(prev[row.id] || [])],
      }))
      setHistoryOpen(row.id)
      toast({ title: "Follow-up logged" })
    } catch (e) {
      toast({
        title: "Could not log follow-up",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setActingId(null)
    }
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-gray-50">
        <CoachDashboardHeader currentPage="Lead Assignments" coachName={coachName} />
        <main className="px-4 lg:px-8 py-6 text-center text-gray-500">Loading…</main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CoachDashboardHeader currentPage="Lead Assignments" coachName={coachName} />
      <main className="px-4 lg:px-8 py-6 max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Lead assignments</h1>
            <p className="text-sm text-gray-600">
              Accept or decline leads assigned to you. After you accept, update the status and log follow-ups.
            </p>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[160px] bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="declined">Declined</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <p className="text-center text-gray-500 py-12">Loading…</p>
        ) : rows.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500 text-sm">
              No {statusFilter === "all" ? "" : statusFilter + " "}assignments.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {rows.map((row) => (
              <Card key={row.id}>
                <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg">{row.lead_name || "Lead"}</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      {row.lead_phone || "—"}
                      {row.branch_name ? ` · ${row.branch_name}` : ""}
                    </p>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {assignmentStatusLabel(row.status)}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  {row.note ? (
                    <p className="text-sm text-gray-700 bg-gray-50 rounded-md px-3 py-2">
                      {row.note}
                    </p>
                  ) : null}
                  <p className="text-xs text-gray-500">
                    Assigned{" "}
                    {row.assigned_at
                      ? new Date(row.assigned_at).toLocaleString()
                      : "—"}
                    {row.assigned_by_name ? ` by ${row.assigned_by_name}` : ""}
                  </p>

                  {row.status === "pending" ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button
                        type="button"
                        className="bg-yellow-400 hover:bg-yellow-500 text-black"
                        disabled={actingId === row.id}
                        onClick={() => openConfirm(row, "accept")}
                      >
                        Accept
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={actingId === row.id}
                        onClick={() => openConfirm(row, "decline")}
                      >
                        Decline
                      </Button>
                    </div>
                  ) : null}

                  {row.status === "declined" && row.decline_reason ? (
                    <p className="text-sm text-red-700">Reason: {row.decline_reason}</p>
                  ) : null}

                  {row.status === "accepted" ? (
                    <div className="space-y-3 border-t pt-3">
                      <p className="text-xs text-gray-500">
                        Priority: {leadPriorityLabel(row.lead_priority)}
                      </p>
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-600">Lead status</Label>
                        <Select
                          value={(row.lead_status || "new") as LeadStatus}
                          disabled={actingId === row.id}
                          onValueChange={(v) => void changeLeadStatus(row, v as LeadStatus)}
                        >
                          <SelectTrigger className="h-9 bg-white">
                            <SelectValue placeholder={leadStatusLabel(row.lead_status)} />
                          </SelectTrigger>
                          <SelectContent>
                            {LEAD_STATUSES.map((s) => (
                              <SelectItem key={s.value} value={s.value}>
                                {s.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs text-gray-600">Follow-up action</Label>
                          <Select
                            value={followAction[row.id] || "call"}
                            onValueChange={(v) =>
                              setFollowAction((prev) => ({ ...prev, [row.id]: v }))
                            }
                          >
                            <SelectTrigger className="h-9 bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {LEAD_FOLLOW_UP_ACTIONS.map((a) => (
                                <SelectItem key={a.value} value={a.value}>
                                  {a.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-gray-600">Next follow-up</Label>
                          <Input
                            type="datetime-local"
                            className="h-9 bg-white"
                            value={followNext[row.id] || ""}
                            onChange={(e) =>
                              setFollowNext((prev) => ({ ...prev, [row.id]: e.target.value }))
                            }
                          />
                        </div>
                      </div>
                      <Textarea
                        rows={2}
                        placeholder="Follow-up note"
                        value={followNote[row.id] || ""}
                        onChange={(e) =>
                          setFollowNote((prev) => ({ ...prev, [row.id]: e.target.value }))
                        }
                        className="bg-white"
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          className="bg-yellow-400 hover:bg-yellow-500 text-black"
                          disabled={actingId === row.id}
                          onClick={() => void logFollowUp(row)}
                        >
                          Log follow-up
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={historyLoading === row.id}
                          onClick={() => {
                            if (historyOpen === row.id) setHistoryOpen(null)
                            else void loadHistory(row.id)
                          }}
                        >
                          {historyOpen === row.id ? "Hide history" : "Follow-up history"}
                        </Button>
                      </div>
                      {historyOpen === row.id ? (
                        <div className="space-y-2">
                          {(history[row.id] || []).length === 0 ? (
                            <p className="text-xs text-gray-500">No follow-ups yet.</p>
                          ) : (
                            (history[row.id] || []).map((event) => (
                              <div key={event.id} className="rounded-md bg-gray-50 px-3 py-2 text-sm">
                                <p className="text-gray-800">
                                  {event.note || event.action}
                                  {event.from_status && event.to_status
                                    ? ` (${leadStatusLabel(event.from_status)} → ${leadStatusLabel(event.to_status)})`
                                    : ""}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {event.actor_name || "Coach"}
                                  {event.created_at
                                    ? ` · ${new Date(event.created_at).toLocaleString()}`
                                    : ""}
                                </p>
                              </div>
                            ))
                          )}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Dialog
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!open && actingId === null) {
            setConfirm(null)
            setConfirmMessage("")
            setConfirmError("")
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {confirm?.action === "decline" ? "Decline this lead" : "Accept this lead"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            {confirm?.action === "decline"
              ? `Decline ${confirm?.name}? A reason is required.`
              : `Accept ${confirm?.name}? You can add a message if you want.`}
          </p>
          <div className="space-y-1">
            <Label className="text-sm text-gray-700">
              {confirm?.action === "decline" ? "Reason" : "Message"}
              {confirm?.action === "decline" ? "" : " (optional)"}
            </Label>
            <Textarea
              rows={3}
              value={confirmMessage}
              onChange={(e) => {
                setConfirmMessage(e.target.value)
                if (confirmError) setConfirmError("")
              }}
              placeholder={
                confirm?.action === "decline"
                  ? "Why are you declining this lead?"
                  : "Message for the admin (optional)"
              }
              className="bg-white"
            />
            {confirmError ? <p className="text-xs text-red-600">{confirmError}</p> : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={actingId !== null}
              onClick={() => {
                setConfirm(null)
                setConfirmMessage("")
                setConfirmError("")
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className={
                confirm?.action === "decline"
                  ? ""
                  : "bg-yellow-400 hover:bg-yellow-500 text-black"
              }
              variant={confirm?.action === "decline" ? "outline" : "default"}
              disabled={actingId !== null}
              onClick={() => void submitConfirm()}
            >
              {actingId !== null
                ? "Saving…"
                : confirm?.action === "decline"
                  ? "Decline"
                  : "Accept"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
