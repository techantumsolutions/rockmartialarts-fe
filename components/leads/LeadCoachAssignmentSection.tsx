"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
  type EligibleCoach,
  type LeadCoachAssignment,
} from "@/lib/leadCoachAssignmentAPI"
import type { LeadRow } from "@/lib/leadAPI"

type Props = {
  lead: LeadRow
  onLeadUpdated?: (lead: LeadRow) => void
}

const STATUS_CLASS: Record<string, string> = {
  pending: "bg-amber-50 text-amber-900 border-amber-200",
  accepted: "bg-green-50 text-green-800 border-green-200",
  declined: "bg-red-50 text-red-800 border-red-200",
  cancelled: "bg-gray-100 text-gray-700 border-gray-200",
  superseded: "bg-slate-50 text-slate-600 border-slate-200",
}

export default function LeadCoachAssignmentSection({ lead, onLeadUpdated }: Props) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [assignment, setAssignment] = useState<LeadCoachAssignment | null>(null)
  const [history, setHistory] = useState<LeadCoachAssignment[]>([])
  const [coaches, setCoaches] = useState<EligibleCoach[]>([])
  const [coachId, setCoachId] = useState("")
  const [note, setNote] = useState("")

  const load = async () => {
    setLoading(true)
    try {
      const [detail, eligible] = await Promise.all([
        leadCoachAssignmentAPI.get(lead.id),
        leadCoachAssignmentAPI.eligibleCoaches(lead.id),
      ])
      setAssignment(detail.assignment)
      setHistory(Array.isArray(detail.history) ? detail.history : [])
      setCoaches(Array.isArray(eligible.coaches) ? eligible.coaches : [])
      if (detail.lead && onLeadUpdated) onLeadUpdated(detail.lead)
    } catch (e) {
      toast({
        title: "Could not load coach assignment",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.id])

  const assign = async () => {
    if (!coachId) {
      toast({ title: "Select a coach", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const res = await leadCoachAssignmentAPI.assign(lead.id, coachId, note.trim() || undefined)
      setAssignment(res.assignment)
      setHistory((prev) => [res.assignment, ...prev.filter((h) => h.id !== res.assignment.id)])
      setNote("")
      if (res.lead && onLeadUpdated) onLeadUpdated(res.lead)
      toast({ title: "Coach assigned", description: "Waiting for coach to accept." })
      await load()
    } catch (e) {
      toast({
        title: "Could not assign coach",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const cancel = async () => {
    setSaving(true)
    try {
      await leadCoachAssignmentAPI.cancel(lead.id, assignment?.id)
      toast({ title: "Assignment cancelled" })
      setCoachId("")
      await load()
    } catch (e) {
      toast({
        title: "Could not cancel",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const status = assignment?.status || lead.coach_assignment_status || ""

  return (
    <div className="space-y-3 border rounded-lg p-4 bg-gray-50">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-900">Coach assignment</h3>
        {status ? (
          <Badge
            variant="outline"
            className={`text-xs ${STATUS_CLASS[status] || ""}`}
          >
            {assignmentStatusLabel(status)}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-xs">
            Unassigned
          </Badge>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <>
          {assignment && (assignment.status === "pending" || assignment.status === "accepted") ? (
            <div className="text-sm space-y-1">
              <p>
                <span className="text-gray-500">Coach: </span>
                <span className="font-medium">{assignment.coach_name || "—"}</span>
              </p>
              {assignment.note ? (
                <p className="text-gray-600 text-xs">Note: {assignment.note}</p>
              ) : null}
              {assignment.status === "pending" ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={saving}
                  onClick={() => void cancel()}
                >
                  Cancel pending
                </Button>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label className="text-xs">
              {assignment?.status === "pending" || assignment?.status === "accepted"
                ? "Reassign coach"
                : "Assign coach"}
            </Label>
            <Select value={coachId || "none"} onValueChange={(v) => setCoachId(v === "none" ? "" : v)}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Select coach" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select coach…</SelectItem>
                {coaches.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.full_name}
                    {c.preferred ? " · preferred" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note for the coach"
              className="bg-white"
            />
            <Button
              type="button"
              size="sm"
              className="bg-yellow-400 hover:bg-yellow-500 text-white"
              disabled={saving || !coachId}
              onClick={() => void assign()}
            >
              {saving ? "Saving…" : "Assign coach"}
            </Button>
          </div>

          {history.length > 0 ? (
            <div className="pt-2 border-t space-y-2">
              <p className="text-xs font-medium text-gray-600">Assignment history</p>
              <ul className="space-y-1.5 max-h-40 overflow-y-auto">
                {history.slice(0, 8).map((h) => (
                  <li key={h.id} className="text-xs text-gray-600 flex justify-between gap-2">
                    <span>
                      {h.coach_name || "Coach"} · {assignmentStatusLabel(h.status)}
                    </span>
                    <span className="text-gray-400 whitespace-nowrap">
                      {h.assigned_at
                        ? new Date(h.assigned_at).toLocaleDateString()
                        : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
