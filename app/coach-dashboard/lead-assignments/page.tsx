"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import CoachDashboardHeader from "@/components/coach-dashboard-header"
import { checkCoachAuth } from "@/lib/coachAuth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
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
  type LeadCoachAssignment,
} from "@/lib/leadCoachAssignmentAPI"

export default function CoachLeadAssignmentsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [coachName, setCoachName] = useState("Coach")
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<LeadCoachAssignment[]>([])
  const [statusFilter, setStatusFilter] = useState("pending")
  const [actingId, setActingId] = useState<string | null>(null)
  const [declineReason, setDeclineReason] = useState<Record<string, string>>({})

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

  const accept = async (id: string) => {
    setActingId(id)
    try {
      await leadCoachAssignmentAPI.accept(id)
      toast({ title: "Assignment accepted" })
      await load()
    } catch (e) {
      toast({
        title: "Could not accept",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setActingId(null)
    }
  }

  const decline = async (id: string) => {
    setActingId(id)
    try {
      await leadCoachAssignmentAPI.decline(id, declineReason[id]?.trim() || undefined)
      toast({ title: "Assignment declined" })
      await load()
    } catch (e) {
      toast({
        title: "Could not decline",
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
        <main className="pt-20 px-4 lg:px-8 py-6 text-center text-gray-500">Loading…</main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CoachDashboardHeader currentPage="Lead Assignments" coachName={coachName} />
      <main className="pt-20 px-4 lg:px-8 py-6 max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Lead assignments</h1>
            <p className="text-sm text-gray-600">
              Accept or decline leads assigned to you by admin.
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
                    <div className="space-y-2 pt-1">
                      <Input
                        placeholder="Decline reason (optional)"
                        value={declineReason[row.id] || ""}
                        onChange={(e) =>
                          setDeclineReason((prev) => ({
                            ...prev,
                            [row.id]: e.target.value,
                          }))
                        }
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          className="bg-yellow-400 hover:bg-yellow-500 text-black"
                          disabled={actingId === row.id}
                          onClick={() => void accept(row.id)}
                        >
                          Accept
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={actingId === row.id}
                          onClick={() => void decline(row.id)}
                        >
                          Decline
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  {row.status === "declined" && row.decline_reason ? (
                    <p className="text-sm text-red-700">Reason: {row.decline_reason}</p>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
