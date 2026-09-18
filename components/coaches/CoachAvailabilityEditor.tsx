"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2, Plus, Save, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import {
  WEEKDAYS,
  coachAvailabilityAPI,
  type AvailabilityOptions,
  type CoachAvailability,
  type WeeklySlot,
} from "@/lib/coachAvailabilityAPI"

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

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [opts, avail] = await Promise.all([
        coachId
          ? coachAvailabilityAPI.optionsForCoach(coachId)
          : coachAvailabilityAPI.optionsMine(),
        coachId
          ? coachAvailabilityAPI.getForCoach(coachId)
          : coachAvailabilityAPI.getMine(),
      ])
      setOptions(opts)
      setLocationIds(avail.service_location_ids || [])
      setSlots(avail.weekly_slots?.length ? avail.weekly_slots : [])
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

  const toggleLocation = (id: string, checked: boolean) => {
    setLocationIds((prev) => {
      if (checked) return prev.includes(id) ? prev : [...prev, id]
      return prev.filter((x) => x !== id)
    })
    if (!checked) {
      setSlots((prev) =>
        prev.map((s) =>
          s.service_location_id === id ? { ...s, service_location_id: null } : s
        )
      )
    }
  }

  const addSlot = () => {
    const defaultLoc = locationIds[0] || null
    setSlots((prev) => [...prev, { ...emptySlot(), service_location_id: defaultLoc }])
  }

  const updateSlot = (index: number, patch: Partial<WeeklySlot>) => {
    setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  }

  const removeSlot = (index: number) => {
    setSlots((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    if (locationIds.length === 0) {
      toast({
        title: "Select locations",
        description: "Choose at least one service location.",
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
        service_location_ids: locationIds,
        weekly_slots: slots.map((s) => ({
          id: s.id,
          weekday: s.weekday,
          start_time: s.start_time,
          end_time: s.end_time,
          service_location_id: s.service_location_id || null,
          notes: s.notes || null,
        })),
        notes: notes.trim() || null,
      }
      const result = coachId
        ? await coachAvailabilityAPI.updateForCoach(coachId, payload)
        : await coachAvailabilityAPI.updateMine(payload)
      const avail = result.availability
      setLocationIds(avail.service_location_ids || [])
      setSlots(avail.weekly_slots || [])
      setNotes(avail.notes || "")
      setUpdatedAt(avail.updated_at || null)
      toast({ title: "Availability saved" })
    } catch (e) {
      toast({
        title: "Save failed",
        description: e instanceof Error ? e.message : "Error",
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
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2 bg-[#4F5077] hover:bg-[#3d3e5c]">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save availability
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-[#4F5077]">Service locations</CardTitle>
        </CardHeader>
        <CardContent>
          {locations.length === 0 ? (
            <p className="text-sm text-gray-500">No locations available.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {locations.map((loc) => {
                const checked = locationIds.includes(loc.id)
                return (
                  <label
                    key={loc.id}
                    className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer hover:bg-gray-50"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) => toggleLocation(loc.id, Boolean(v))}
                    />
                    <span className="text-[#4F5077]">{loc.name}</span>
                  </label>
                )
              })}
            </div>
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
                  <Input
                    type="time"
                    value={slot.start_time}
                    onChange={(e) => updateSlot(index, { start_time: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs text-[#6B7A99]">End</Label>
                  <Input
                    type="time"
                    value={slot.end_time}
                    onChange={(e) => updateSlot(index, { end_time: e.target.value })}
                  />
                </div>
                <div className="md:col-span-4">
                  <Label className="text-xs text-[#6B7A99]">Location</Label>
                  <Select
                    value={slot.service_location_id || "__any__"}
                    onValueChange={(v) =>
                      updateSlot(index, {
                        service_location_id: v === "__any__" ? null : v,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any selected location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__any__">Any selected location</SelectItem>
                      {locations
                        .filter((l) => locationIds.includes(l.id))
                        .map((l) => (
                          <SelectItem key={l.id} value={l.id}>
                            {l.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSlot(index)}
                    className="text-red-600"
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
    </div>
  )
}
