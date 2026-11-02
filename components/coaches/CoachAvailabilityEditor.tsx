"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2, Plus, Save, Trash2, Lock, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import WeeklySlotTimePicker from "@/components/coaches/WeeklySlotTimePicker"
import { useToast } from "@/hooks/use-toast"
import {
  WEEKDAYS,
  coachAvailabilityAPI,
  type AvailabilityOptions,
  type CoachAvailability,
  type WeeklySlot,
} from "@/lib/coachAvailabilityAPI"
import { getBackendApiUrl } from "@/lib/config"
import { TokenManager } from "@/lib/tokenManager"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"
import {
  AssignedBatchInfo,
  fetchCoachAssignedBatches,
  checkSlotDeletionConflict,
  getBatchConflictForSlots,
  getBatchesCoveredBySlot,
} from "@/lib/coachBatchConflict"

type Props = {
  /** When omitted, uses /me endpoints (coach self-service). */
  coachId?: string
  title?: string
  subtitle?: string
}

function emptySlot(): WeeklySlot {
  return {
    weekday: "monday",
    start_time: "09:00",
    end_time: "12:00",
    service_location_id: null,
    notes: "",
  }
}

export default function CoachAvailabilityEditor({
  coachId,
  title = "Weekly availability",
  subtitle = "Set the days, times, and service locations when you are available.",
}: Props) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [options, setOptions] = useState<AvailabilityOptions | null>(null)
  const [locationIds, setLocationIds] = useState<string[]>([])
  const [slots, setSlots] = useState<WeeklySlot[]>([])
  const [notes, setNotes] = useState("")
  const [timezone, setTimezone] = useState("Asia/Kolkata")
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [slotToDelete, setSlotToDelete] = useState<{ index: number; slot: WeeklySlot } | null>(null)
  const [coachProfile, setCoachProfile] = useState<{ branch_id?: string | null; branch_name?: string } | null>(null)
  const [branchMap, setBranchMap] = useState<Record<string, { name: string; code?: string }>>({})
  const [assignedBatches, setAssignedBatches] = useState<AssignedBatchInfo[]>([])
  const [blockedSlotDelete, setBlockedSlotDelete] = useState<{
    slot: WeeklySlot
    batch: AssignedBatchInfo
  } | null>(null)
  const [conflictWarning, setConflictWarning] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [opts, avail, profileRes, branchesRes] = await Promise.all([
        coachId
          ? coachAvailabilityAPI.optionsForCoach(coachId)
          : coachAvailabilityAPI.optionsMine(),
        coachId
          ? coachAvailabilityAPI.getForCoach(coachId)
          : coachAvailabilityAPI.getMine(),
        // Also fetch profile to get authoritative assigned branch
        (async () => {
          try {
            const token = BranchManagerAuth.getToken() || TokenManager.getToken()
            const endpoint = coachId ? `coaches/${coachId}` : `coaches/me`
            const res = await fetch(getBackendApiUrl(endpoint), {
              headers: token ? { Authorization: `Bearer ${token}` } : undefined,
              cache: "no-store",
            })
            if (res.ok) return await res.json()
          } catch {
            // ignore
          }
          if (typeof window !== "undefined" && !coachId) {
            try {
              const raw = localStorage.getItem("coach")
              if (raw) return JSON.parse(raw)
            } catch {
              // ignore
            }
          }
          return null
        })(),
        // Also fetch public branches for reliable name resolution
        (async () => {
          try {
            const res = await fetch(getBackendApiUrl("branches/public/all"), { cache: "no-store" })
            if (res.ok) {
              const data = await res.json()
              const list = Array.isArray(data?.branches) ? data.branches : (Array.isArray(data) ? data : [])
              const map: Record<string, { name: string; code?: string }> = {}
              list.forEach((b: any) => {
                const id = b.id || b._id
                const name = b.name || b.branch?.name
                const code = b.code || b.branch?.code || ""
                if (id && name) map[id] = { name, code }
              })
              return map
            }
          } catch {
            // ignore
          }
          return {}
        })(),
      ])

      setOptions(opts)
      if (profileRes) setCoachProfile(profileRes)
      if (branchesRes) setBranchMap(branchesRes)

      // Use the branch already allocated on the coach profile (authoritative)
      const allocatedId =
        profileRes?.branch_id ||
        opts.allocated_branch_id ||
        opts.coach_service_location_ids?.[0] ||
        avail.service_location_ids?.[0] ||
        ""

      setLocationIds(allocatedId ? [allocatedId] : [])
      const loadedSlots = avail.weekly_slots?.length ? avail.weekly_slots : []
      setSlots(
        allocatedId
          ? loadedSlots.map((s) => ({ ...s, service_location_id: allocatedId }))
          : loadedSlots
      )
      setNotes(avail.notes || "")
      setTimezone(avail.timezone || opts.timezone_default || "Asia/Kolkata")
      setUpdatedAt(avail.updated_at || null)

      // Fetch assigned batches for this coach to cross-verify availability changes
      try {
        const token =
          BranchManagerAuth.getToken() ||
          TokenManager.getToken() ||
          (typeof window !== "undefined"
            ? localStorage.getItem("access_token") || localStorage.getItem("token") || ""
            : "")
        const batches = await fetchCoachAssignedBatches(coachId, token)
        setAssignedBatches(batches)
      } catch (bErr) {
        console.warn("Failed to load coach assigned batches for conflict check:", bErr)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load availability")
    } finally {
      setLoading(false)
    }
  }, [coachId])

  useEffect(() => {
    load()
  }, [load])

  const locations = options?.locations || []
  const allocatedBranchId = locationIds[0] || ""
  const allocatedBranchName = useMemo(() => {
    if (!allocatedBranchId) return null
    if (branchMap[allocatedBranchId]?.name) {
      const b = branchMap[allocatedBranchId]
      return b.code ? `${b.name} (${b.code})` : b.name
    }
    const fromOpts = locations.find((l) => l.id === allocatedBranchId)
    if (fromOpts?.name) return fromOpts.name
    if (coachProfile?.branch_name) return coachProfile.branch_name
    return allocatedBranchId
  }, [allocatedBranchId, branchMap, locations, coachProfile])

  const slotsByDay = useMemo(() => {
    const map: Record<string, WeeklySlot[]> = {}
    for (const d of WEEKDAYS) map[d.value] = []
    for (const s of slots) {
      const key = (s.weekday || "").toLowerCase()
      if (!map[key]) map[key] = []
      map[key].push(s)
    }
    return map
  }, [slots])

  const addSlot = () => {
    const defaultLoc = allocatedBranchId || null
    setSlots((prev) => [...prev, { ...emptySlot(), service_location_id: defaultLoc }])
  }

  const updateSlot = (index: number, patch: Partial<WeeklySlot>) => {
    const newSlots = slots.map((s, i) => (i === index ? { ...s, ...patch } : s))
    setSlots(newSlots)

    // Check if new slots uncover any assigned batch
    const conflict = getBatchConflictForSlots(assignedBatches, newSlots)
    if (conflict) {
      const daysStr = (conflict.days || []).join(", ")
      setConflictWarning(
        `This modification leaves batch "${conflict.batch_name}" in "${conflict.course_name}" (${daysStr} ${conflict.start_time} – ${conflict.end_time} at ${conflict.branch_name}) uncovered. Adjust slot hours to cover the batch, or change the coach for that batch first.`
      )
    } else {
      setConflictWarning(null)
    }
  }

  const formatSlotTime = (timeStr?: string): string => {
    if (!timeStr) return ""
    const match = /^(\d{1,2}):(\d{2})/.exec(timeStr.trim())
    if (!match) return timeStr
    let h = Number(match[1])
    const m = match[2]
    const suffix = h >= 12 ? "PM" : "AM"
    h = h % 12 || 12
    return `${String(h).padStart(2, "0")}:${m} ${suffix}`
  }

  const handleDeleteSlotClick = (index: number, slot: WeeklySlot) => {
    const conflictCheck = checkSlotDeletionConflict(index, slots, assignedBatches)
    if (!conflictCheck.canDelete && conflictCheck.conflictingBatch) {
      setBlockedSlotDelete({
        slot,
        batch: conflictCheck.conflictingBatch,
      })
      const b = conflictCheck.conflictingBatch
      const daysStr = (b.days || []).join(", ")
      toast({
        title: "Cannot delete time slot",
        description: `This coach is currently assigned to batch "${b.batch_name}" in "${b.course_name}" (${daysStr} ${b.start_time} – ${b.end_time} at ${b.branch_name}). Reassign the coach for that batch first.`,
        variant: "destructive",
      })
      return
    }
    setSlotToDelete({ index, slot })
  }

  const removeSlot = (index: number) => {
    setSlots((prev) => {
      const nextSlots = prev.filter((_, i) => i !== index)
      const conflict = getBatchConflictForSlots(assignedBatches, nextSlots)
      if (conflict) {
        const daysStr = (conflict.days || []).join(", ")
        setConflictWarning(
          `Changes leave batch "${conflict.batch_name}" in "${conflict.course_name}" (${daysStr} ${conflict.start_time} – ${conflict.end_time} at ${conflict.branch_name}) uncovered.`
        )
      } else {
        setConflictWarning(null)
      }
      return nextSlots
    })
  }

  const confirmDeleteSlot = () => {
    if (slotToDelete !== null) {
      const conflictCheck = checkSlotDeletionConflict(slotToDelete.index, slots, assignedBatches)
      if (!conflictCheck.canDelete && conflictCheck.conflictingBatch) {
        setBlockedSlotDelete({
          slot: slotToDelete.slot,
          batch: conflictCheck.conflictingBatch,
        })
        setSlotToDelete(null)
        return
      }
      removeSlot(slotToDelete.index)
      setSlotToDelete(null)
    }
  }

  const handleSave = async () => {
    setSaveError(null)
    if (!allocatedBranchId) {
      toast({
        title: "No branch assigned",
        description: "This coach has no allocated branch. Assign a branch on the coach profile first.",
        variant: "destructive",
      })
      return
    }
    for (const s of slots) {
      if (!s.weekday || !s.start_time || !s.end_time) {
        toast({
          title: "Incomplete slot",
          description: "Each slot needs a day, start time, and end time.",
          variant: "destructive",
        })
        return
      }
    }

    // Cross-verify all slots cover all assigned batches
    const conflict = getBatchConflictForSlots(assignedBatches, slots)
    if (conflict) {
      const daysStr = (conflict.days || []).join(", ")
      const msg = `Cannot save availability: The coach is currently assigned to batch "${conflict.batch_name}" in "${conflict.course_name}" (${daysStr} ${conflict.start_time} – ${conflict.end_time} at ${conflict.branch_name}). You must first change the coach for that batch before removing or modifying this availability slot.`
      setSaveError(msg)
      toast({
        title: "Assigned Batch Conflict",
        description: msg,
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      const payload = {
        timezone,
        service_location_ids: [allocatedBranchId],
        weekly_slots: slots.map((s) => ({
          id: s.id,
          weekday: s.weekday,
          start_time: s.start_time,
          end_time: s.end_time,
          service_location_id: allocatedBranchId,
          notes: s.notes || null,
        })),
        notes: notes.trim() || null,
      }
      const result = coachId
        ? await coachAvailabilityAPI.updateForCoach(coachId, payload)
        : await coachAvailabilityAPI.updateMine(payload)
      const avail = result.availability
      setLocationIds([allocatedBranchId])
      setSlots(
        (avail.weekly_slots || []).map((s) => ({
          ...s,
          service_location_id: allocatedBranchId,
        }))
      )
      setNotes(avail.notes || "")
      setUpdatedAt(avail.updated_at || null)
      toast({ title: "Availability saved" })
    } catch (e) {
      const message = e instanceof Error ? e.message : "Error"
      setSaveError(message)
      toast({
        title: "Save failed",
        description: message,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="py-16 text-center text-gray-500">
        <Loader2 className="w-6 h-6 animate-spin inline mr-2" />
        Loading availability…
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 space-y-3">
          <p className="text-red-600 text-sm">{error}</p>
          <Button variant="outline" onClick={load}>
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-[#4F5077]">{title}</h2>
          <p className="text-sm text-[#6B7A99] mt-1">{subtitle}</p>
          {updatedAt && (
            <p className="text-xs text-gray-400 mt-1">
              Last updated {new Date(updatedAt).toLocaleString()}
            </p>
          )}
          {saveError && <p className="text-sm text-red-600 mt-2">{saveError}</p>}
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2 bg-[#4F5077] hover:bg-[#3d3e5c]">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save availability
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-[#4F5077]">Service location</CardTitle>
        </CardHeader>
        <CardContent>
          {allocatedBranchId ? (
            <div className="max-w-md space-y-1">
              <Label className="text-xs text-[#6B7A99]">Allocated branch</Label>
              <div className="rounded-md border bg-gray-50 px-3 py-2 text-sm font-medium text-[#4F5077]">
                {allocatedBranchName}
              </div>
              <p className="text-xs text-gray-500">
                Branch is set on the coach profile and cannot be changed here.
              </p>
            </div>
          ) : (
            <p className="text-sm text-amber-700">
              No branch is allocated to this coach. Assign a branch on the coach profile first.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base text-[#4F5077]">Weekly time slots</CardTitle>
          <Button variant="outline" size="sm" onClick={addSlot} className="gap-1">
            <Plus className="w-4 h-4" />
            Add slot
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {conflictWarning && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <div>{conflictWarning}</div>
            </div>
          )}

          {slots.length === 0 ? (
            <p className="text-sm text-gray-500">
              No weekly slots yet. Add slots for the days you are available.
            </p>
          ) : (
            slots.map((slot, index) => {
              const activeBatches = getBatchesCoveredBySlot(slot, assignedBatches)
              const hasActiveBatch = activeBatches.length > 0

              return (
                <div
                  key={slot.id || index}
                  className="grid grid-cols-1 sm:grid-cols-6 lg:grid-cols-[130px_minmax(120px,1fr)_minmax(120px,1fr)_minmax(140px,1.5fr)_auto] gap-3 items-end border rounded-lg p-3 sm:p-4"
                >
                  <div className="col-span-1 sm:col-span-2 lg:col-span-1">
                    <Label className="text-xs text-[#6B7A99] mb-1 block">Day</Label>
                    <Select
                      value={slot.weekday}
                      onValueChange={(v) => updateSlot(index, { weekday: v })}
                    >
                      <SelectTrigger className="w-full h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {WEEKDAYS.map((d) => (
                          <SelectItem key={d.value} value={d.value}>
                            {d.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-1 sm:col-span-2 lg:col-span-1">
                    <Label className="text-xs text-[#6B7A99] mb-1 block">Start</Label>
                    <WeeklySlotTimePicker
                      value={slot.start_time}
                      onChange={(val) => updateSlot(index, { start_time: val })}
                    />
                  </div>
                  <div className="col-span-1 sm:col-span-2 lg:col-span-1">
                    <Label className="text-xs text-[#6B7A99] mb-1 block">End</Label>
                    <WeeklySlotTimePicker
                      value={slot.end_time}
                      onChange={(val) => updateSlot(index, { end_time: val })}
                    />
                  </div>
                  <div className="col-span-1 sm:col-span-5 lg:col-span-1">
                    <Label className="text-xs text-[#6B7A99] mb-1 block">Location</Label>
                    <div
                      className="h-9 w-full flex items-center rounded-md border bg-gray-50 px-3 text-sm text-[#4F5077] truncate"
                      title={allocatedBranchName || "No branch allocated"}
                    >
                      {allocatedBranchName || "No branch allocated"}
                    </div>
                  </div>
                  <div className="col-span-1 sm:col-span-1 lg:col-span-1 flex justify-end items-center h-9">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteSlotClick(index, slot)}
                      className="h-9 w-9 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0"
                      title={hasActiveBatch ? "Slot required by assigned batch" : "Remove slot"}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {hasActiveBatch && (
                    <div className="col-span-1 sm:col-span-6 lg:col-span-5 pt-1">
                      <Badge variant="outline" className="text-amber-800 bg-amber-50 border-amber-300 text-xs font-normal gap-1">
                        <Lock className="w-3 h-3 text-amber-600 inline mr-0.5" />
                        Assigned to: {activeBatches.map(b => b.batch_name).join(", ")} ({activeBatches[0].course_name})
                      </Badge>
                    </div>
                  )}
                </div>
              )
            })
          )}

          {/* Week overview */}
          <div className="pt-2 border-t">
            <p className="text-xs font-medium text-[#6B7A99] mb-2">Week overview</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-xs">
              {WEEKDAYS.map((d) => (
                <div key={d.value} className="rounded border bg-gray-50 px-2 py-2">
                  <div className="font-medium text-[#4F5077] mb-1">{d.label}</div>
                  {(slotsByDay[d.value] || []).length === 0 ? (
                    <span className="text-gray-400">—</span>
                  ) : (
                    (slotsByDay[d.value] || []).map((s, i) => (
                      <div key={i} className="text-[#6B7A99]">
                        {s.start_time}–{s.end_time}
                      </div>
                    ))
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-[#4F5077]">Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes about your availability…"
            rows={3}
          />
        </CardContent>
      </Card>

      <AlertDialog
        open={slotToDelete !== null}
        onOpenChange={(open) => !open && setSlotToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete time slot?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this weekly time slot
              {slotToDelete?.slot
                ? ` (${(slotToDelete.slot.weekday || "").charAt(0).toUpperCase() + (slotToDelete.slot.weekday || "").slice(1)}: ${formatSlotTime(slotToDelete.slot.start_time)} – ${formatSlotTime(slotToDelete.slot.end_time)})`
                : ""}
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteSlot}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog shown when deletion is blocked by assigned batch */}
      <AlertDialog
        open={blockedSlotDelete !== null}
        onOpenChange={(open) => !open && setBlockedSlotDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <Lock className="w-5 h-5 text-red-600" />
              Cannot Delete Time Slot
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 pt-2 text-gray-700 text-sm">
                <p>
                  This coach is currently assigned to an active course batch during this time:
                </p>
                {blockedSlotDelete && (
                  <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm">
                    <p className="font-semibold text-red-900">
                      {blockedSlotDelete.batch.batch_name} ({blockedSlotDelete.batch.course_name})
                    </p>
                    <p className="text-red-700 text-xs mt-1">
                      Days: {(blockedSlotDelete.batch.days || []).join(", ")} | Time: {blockedSlotDelete.batch.start_time} – {blockedSlotDelete.batch.end_time}
                    </p>
                    <p className="text-red-700 text-xs">
                      Branch: {blockedSlotDelete.batch.branch_name}
                    </p>
                  </div>
                )}
                <p className="text-xs text-gray-600 font-medium">
                  You must first reassign or change the coach for this batch in the branch/course schedule before removing this availability slot.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setBlockedSlotDelete(null)} className="bg-[#4F5077] hover:bg-[#3d3e5c]">
              Understood
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
