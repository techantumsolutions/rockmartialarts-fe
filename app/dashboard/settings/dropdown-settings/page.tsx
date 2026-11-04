"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Database, Clock, Plus, Trash2, Pencil } from "lucide-react"
import { DropdownSettingsManager } from "@/components/dropdown-settings-manager"
import { useDashboardBasePath } from "@/lib/useDashboardBasePath"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getBackendApiUrl } from "@/lib/config"
import { TokenManager } from "@/lib/tokenManager"
import { useToast } from "@/hooks/use-toast"
import { useEffect, useState } from "react"

type DurationItem = { id: string; name: string; code: string; duration_months: number; display_order: number }

export default function DropdownSettingsPage() {
  const router = useRouter()
  const basePath = useDashboardBasePath()
  const { toast } = useToast()
  const [durations, setDurations] = useState<DurationItem[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{ name: string; code: string; duration_months: string; display_order: string }>({ name: "", code: "", duration_months: "", display_order: "" })
  const [loadingDurations, setLoadingDurations] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newName, setNewName] = useState("")
  const [newCode, setNewCode] = useState("")
  const [newMonths, setNewMonths] = useState("")
  const [newOrder, setNewOrder] = useState("")

  const loadDurations = () => {
    const token = TokenManager.getToken()
    if (!token) return
    setLoadingDurations(true)
    fetch(getBackendApiUrl("durations"), { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : { durations: [] })
      .then((data) => {
        const list = (data.durations || []).map((d: any) => ({
          id: d.id,
          name: d.name || "",
          code: d.code || "",
          duration_months: typeof d.duration_months === "number" ? d.duration_months : parseInt(String(d.duration_months), 10) || 0,
          display_order: typeof d.display_order === "number" ? d.display_order : parseInt(String(d.display_order), 10) || 0
        }))
        setDurations(list.sort((a: DurationItem, b: DurationItem) => a.display_order - b.display_order))
      })
      .catch(() => setDurations([]))
      .finally(() => setLoadingDurations(false))
  }

  useEffect(() => {
    loadDurations()
  }, [])

  const handleAddDuration = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = newName.trim()
    const code = newCode.trim()
    const months = parseInt(newMonths, 10)
    const order = parseInt(newOrder, 10)
    if (!name || !code) {
      toast({ title: "Validation", description: "Name and Code are required.", variant: "destructive" })
      return
    }
    if (Number.isNaN(months) || months < 1) {
      toast({ title: "Validation", description: "Duration (months) must be at least 1.", variant: "destructive" })
      return
    }
    const token = TokenManager.getToken()
    if (!token) {
      toast({ title: "Error", description: "Please sign in again.", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const res = await fetch(getBackendApiUrl("durations"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name,
          code,
          duration_months: months,
          display_order: Number.isNaN(order) ? 0 : order,
          is_active: true,
          // Per-month scaling: legacy/base fee uses this × monthly rate (same as old 3M/6M/1Y rows).
          pricing_multiplier: months,
        })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({ title: "Error", description: data.detail || data.message || "Failed to add duration", variant: "destructive" })
        setSaving(false)
        return
      }
      toast({ title: "Saved", description: `"${name}" added. It will appear in Course duration and Add tenure dropdowns.` })
      setNewName("")
      setNewCode("")
      setNewMonths("")
      setNewOrder("")
      loadDurations()
    } catch (err) {
      toast({ title: "Error", description: "Failed to add duration", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteDuration = async (id: string) => {
    const token = TokenManager.getToken()
    if (!token) return
    if (!confirm("Remove this duration? It may be in use by courses.")) return
    try {
      const res = await fetch(getBackendApiUrl(`durations/${id}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        toast({ title: "Removed", description: "Duration removed from master data." })
        loadDurations()
      } else {
        const data = await res.json().catch(() => ({}))
        toast({ title: "Error", description: data.detail || data.message || "Could not remove", variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Could not remove duration", variant: "destructive" })
    }
  }

  const startEditing = (d: DurationItem) => {
    setEditingId(d.id)
    setEditForm({ name: d.name, code: d.code, duration_months: String(d.duration_months), display_order: String(d.display_order) })
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditForm({ name: "", code: "", duration_months: "", display_order: "" })
  }

  const handleSaveEdit = async () => {
    if (!editingId) return
    const token = TokenManager.getToken()
    if (!token) return
    const months = parseInt(editForm.duration_months, 10)
    if (!editForm.name.trim() || !editForm.code.trim() || Number.isNaN(months) || months < 1) {
      toast({ title: "Validation", description: "Name, code, and valid months are required.", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const res = await fetch(getBackendApiUrl(`durations/${editingId}`), {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name.trim(),
          code: editForm.code.trim(),
          duration_months: months,
          display_order: parseInt(editForm.display_order, 10) || 0,
        }),
      })
      if (res.ok) {
        toast({ title: "Updated", description: `Duration "${editForm.name}" updated.` })
        cancelEditing()
        loadDurations()
      } else {
        const data = await res.json().catch(() => ({}))
        toast({ title: "Error", description: data.detail || data.message || "Update failed", variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Update failed", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full p-4 lg:px-8">
        <div className="mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => router.push(`${basePath}/settings`)}
                className="flex items-center space-x-2 hover:bg-gray-100"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-[#4F5077]">Back to Settings</span>
              </Button>
              <div className="w-px h-6 bg-gray-300"></div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Database className="w-6 h-6 shrink-0" />
                  Master Data
                </h1>
                <p className="text-gray-600 mt-1">
                  Manage dropdown options used throughout the application
                </p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Database className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-blue-800">About Master Data</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Configure the options available in various dropdown menus across forms like Add Coach, 
                  Add Student, etc. Changes will be reflected immediately across the application.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Course Duration
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  These options appear in the <strong>Course duration</strong> dropdown and in <strong>Add tenure</strong> when setting course fees. Add entries below; the same data is used everywhere.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <form onSubmit={handleAddDuration} className="space-y-4 p-4 border rounded-lg bg-muted/30">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Add course duration
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="duration-name">Name</Label>
                      <Input
                        id="duration-name"
                        placeholder="e.g. 1 month"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="placeholder:text-muted-foreground"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="duration-code">Code</Label>
                      <Input
                        id="duration-code"
                        placeholder="e.g. 1M"
                        value={newCode}
                        onChange={(e) => setNewCode(e.target.value)}
                        className="placeholder:text-muted-foreground"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="duration-months">Duration (months)</Label>
                      <Input
                        id="duration-months"
                        type="number"
                        min={1}
                        placeholder="e.g. 1"
                        value={newMonths}
                        onChange={(e) => setNewMonths(e.target.value)}
                        className="placeholder:text-muted-foreground"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="duration-order">Display order</Label>
                      <Input
                        id="duration-order"
                        type="number"
                        min={0}
                        placeholder="0"
                        value={newOrder}
                        onChange={(e) => setNewOrder(e.target.value)}
                        className="placeholder:text-muted-foreground"
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={saving}>
                    {saving ? "Saving…" : "Save"}
                  </Button>
                </form>

                <div>
                  <h4 className="text-sm font-medium mb-2">Saved durations (used in Course duration & Add tenure)</h4>
                  {loadingDurations ? (
                    <p className="text-sm text-muted-foreground">Loading…</p>
                  ) : durations.length > 0 ? (
                    <ul className="space-y-2">
                      {durations.map((d) => (
                        <li
                          key={d.id}
                          className="py-2 px-3 rounded-md border bg-background text-sm"
                        >
                          {editingId === d.id ? (
                            <div className="space-y-2">
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                <Input
                                  value={editForm.name}
                                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                  placeholder="Name"
                                  className="h-8 text-sm"
                                />
                                <Input
                                  value={editForm.code}
                                  onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
                                  placeholder="Code"
                                  className="h-8 text-sm"
                                />
                                <Input
                                  type="number"
                                  min={1}
                                  value={editForm.duration_months}
                                  onChange={(e) => setEditForm({ ...editForm, duration_months: e.target.value })}
                                  placeholder="Months"
                                  className="h-8 text-sm"
                                />
                                <Input
                                  type="number"
                                  min={0}
                                  value={editForm.display_order}
                                  onChange={(e) => setEditForm({ ...editForm, display_order: e.target.value })}
                                  placeholder="Order"
                                  className="h-8 text-sm"
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button type="button" size="sm" onClick={handleSaveEdit} disabled={saving}>
                                  {saving ? "Saving…" : "Save"}
                                </Button>
                                <Button type="button" size="sm" variant="outline" onClick={cancelEditing}>
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-4">
                              <span>
                                <span className="font-medium">{d.name}</span>
                                <span className="text-muted-foreground ml-2">
                                  ({d.duration_months} month{d.duration_months !== 1 ? "s" : ""}) — {d.code} — order {d.display_order}
                                </span>
                              </span>
                              <div className="flex gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => startEditing(d)}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => handleDeleteDuration(d.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No durations yet. Add one above; it will show in Course duration and Add tenure dropdowns.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <DropdownSettingsManager
              category="countries"
              title="Countries"
              description="Countries available for selection in address forms"
            />

            <DropdownSettingsManager
              category="banks"
              title="Banks"
              description="Bank names available for selection in branch bank details"
            />

            <DropdownSettingsManager
              category="designations"
              title="Coach Designations"
              description="Job titles and designations for coaches"
            />

            <DropdownSettingsManager
              category="specializations"
              title="Specializations"
              description="Martial arts styles and specializations offered"
            />

            <DropdownSettingsManager
              category="experience_ranges"
              title="Experience Ranges"
              description="Experience level options for coaches"
            />

            <DropdownSettingsManager
              category="genders"
              title="Gender Options"
              description="Gender options for personal information"
            />

            <DropdownSettingsManager
              category="student_levels"
              title="Student Level"
              description="Skill levels for students (shown in Super Admin student create/edit and details)"
            />

            <DropdownSettingsManager
              category="locations"
              title="Locations"
              description="Branch location options available for selection"
            />
            <DropdownSettingsManager
              category="emergency_relations"
              title="Emergency Contact Relations"
              description="Relationship types for emergency contacts"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
