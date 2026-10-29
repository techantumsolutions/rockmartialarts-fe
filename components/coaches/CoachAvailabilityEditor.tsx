"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2, Plus, Save, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
    setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)))
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

  const removeSlot = (index: number) => {
    setSlots((prev) => prev.filter((_, i) => i !== index))
  }

  const confirmDeleteSlot = () => {
    if (slotToDelete !== null) {
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
          {slots.length === 0 ? (
            <p className="text-sm text-gray-500">
              No weekly slots yet. Add slots for the days you are available.
            </p>
          ) : (
            slots.map((slot, index) => (
              <div
                key={slot.id || index}
                className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end border rounded-lg p-3"
              >
                <div className="md:col-span-2">
                  <Label className="text-xs text-[#6B7A99]">Day</Label>
                  <Select
                    value={slot.weekday}
                    onValueChange={(v) => updateSlot(index, { weekday: v })}
                  >
                    <SelectTrigger>
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
                <div className="md:col-span-2">
                  <Label className="text-xs text-[#6B7A99]">Start</Label>
                  <WeeklySlotTimePicker
                    value={slot.start_time}
                    onChange={(val) => updateSlot(index, { start_time: val })}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs text-[#6B7A99]">End</Label>
                  <WeeklySlotTimePicker
                    value={slot.end_time}
                    onChange={(val) => updateSlot(index, { end_time: val })}
                  />
                </div>
                <div className="md:col-span-4">
                  <Label className="text-xs text-[#6B7A99]">Location</Label>
                  <div className="h-9 flex items-center rounded-md border bg-gray-50 px-3 text-sm text-[#4F5077] truncate">
                    {allocatedBranchName || "No branch allocated"}
                  </div>
                </div>
                <div className="md:col-span-2 flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSlotToDelete({ index, slot })}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    title="Remove slot"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}

          {/* Week overview */}
          <div className="pt-2 border-t">
            <p className="text-xs font-medium text-[#6B7A99] mb-2">Week overview</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
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
    </div>
  )
}
