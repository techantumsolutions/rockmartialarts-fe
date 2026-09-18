"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Cpu, Loader2, Plus, Pencil, Ban, RefreshCw, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { getBackendApiUrl } from "@/lib/config"
import { TokenManager } from "@/lib/tokenManager"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"
import { useDashboardBasePath } from "@/lib/useDashboardBasePath"
import {
  biometricDeviceAPI,
  type BiometricDevice,
  type BiometricDeviceStatus,
} from "@/lib/biometricDeviceAPI"

interface BranchOption {
  id: string
  name: string
  code?: string
}

const emptyForm = {
  name: "",
  vendor: "essl",
  vendor_device_id: "",
  branch_id: "",
  status: "active" as BiometricDeviceStatus,
  location_note: "",
  ip_address: "",
}

function statusBadge(status: string) {
  if (status === "active") return "bg-green-100 text-green-800 hover:bg-green-100"
  if (status === "maintenance") return "bg-amber-100 text-amber-900 hover:bg-amber-100"
  return "bg-slate-100 text-slate-700 hover:bg-slate-100"
}

export default function BiometricDevicesPage() {
  const router = useRouter()
  const basePath = useDashboardBasePath()
  const isBranchAdmin = basePath.includes("branch-admin")

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [devices, setDevices] = useState<BiometricDevice[]>([])
  const [branches, setBranches] = useState<BranchOption[]>([])
  const [statusFilter, setStatusFilter] = useState("all")
  const [branchFilter, setBranchFilter] = useState("all")
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<BiometricDevice | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [ingestStats, setIngestStats] = useState<{
    processed_last_7_days?: number
    unmatched_last_7_days?: number
    unmatched_total?: number
    ingest_key_configured?: boolean
  } | null>(null)
  const [unmatched, setUnmatched] = useState<any[]>([])

  const getToken = () => BranchManagerAuth.getToken() || TokenManager.getToken()

  const loadIngestInfo = useCallback(async () => {
    const token = getToken()
    if (!token) return
    try {
      const [statsRes, unmatchedRes] = await Promise.all([
        fetch(getBackendApiUrl("attendance/ingest/stats"), {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }),
        fetch(getBackendApiUrl("attendance/ingest/unmatched?limit=10"), {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }),
      ])
      if (statsRes.ok) setIngestStats(await statsRes.json())
      if (unmatchedRes.ok) {
        const data = await unmatchedRes.json()
        setUnmatched(data.unmatched || [])
      }
    } catch {
      /* optional */
    }
  }, [])

  const loadBranches = useCallback(async () => {
    const token = getToken()
    if (!token) return
    try {
      const res = await fetch(getBackendApiUrl("branches"), {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      })
      if (!res.ok) return
      const data = await res.json()
      let rows: any[] = data.branches || data || []
      if (isBranchAdmin) {
        const bm = BranchManagerAuth.getCurrentUser()
        const managed = bm?.managed_branches || (bm?.branch_id ? [bm.branch_id] : [])
        if (managed.length) {
          rows = rows.filter((b) => managed.includes(b.id))
        }
      }
      setBranches(
        rows
          .filter((b) => b?.id)
          .map((b) => ({
            id: b.id,
            name: b.branch?.name || b.name || "Branch",
            code: b.branch?.code || b.code,
          }))
      )
    } catch {
      /* optional */
    }
  }, [isBranchAdmin])

  const loadDevices = useCallback(async () => {
    const token = getToken()
    if (!token) {
      router.push(isBranchAdmin ? "/branch-manager-login" : "/login")
      return
    }
    setLoading(true)
    try {
      const data = await biometricDeviceAPI.list({
        status: statusFilter,
        branch_id: branchFilter === "all" ? undefined : branchFilter,
        limit: 200,
      })
      setDevices(data.devices || [])
    } catch (err: any) {
      toast.error(err?.message || "Failed to load biometric devices")
      setDevices([])
    } finally {
      setLoading(false)
    }
  }, [statusFilter, branchFilter, router, isBranchAdmin])

  useEffect(() => {
    loadBranches()
  }, [loadBranches])

  useEffect(() => {
    loadDevices()
  }, [loadDevices])

  useEffect(() => {
    loadIngestInfo()
  }, [loadIngestInfo])

  const openCreate = () => {
    setEditing(null)
    const defaultBranch =
      branchFilter !== "all"
        ? branchFilter
        : branches.length === 1
          ? branches[0].id
          : ""
    setForm({ ...emptyForm, branch_id: defaultBranch })
    setOpen(true)
  }

  const openEdit = (device: BiometricDevice) => {
    setEditing(device)
    setForm({
      name: device.name || "",
      vendor: device.vendor || "essl",
      vendor_device_id: device.vendor_device_id || "",
      branch_id: device.branch_id || "",
      status: (device.status as BiometricDeviceStatus) || "active",
      location_note: device.location_note || "",
      ip_address: device.ip_address || "",
    })
    setOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.vendor_device_id.trim() || !form.branch_id) {
      toast.error("Name, device ID, and branch are required")
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        vendor: form.vendor.trim() || "essl",
        vendor_device_id: form.vendor_device_id.trim(),
        branch_id: form.branch_id,
        status: form.status,
        location_note: form.location_note.trim() || null,
        ip_address: form.ip_address.trim() || null,
      }
      if (editing) {
        await biometricDeviceAPI.update(editing.id, payload)
        toast.success("Device updated")
      } else {
        await biometricDeviceAPI.create(payload)
        toast.success("Device created")
      }
      setOpen(false)
      await loadDevices()
    } catch (err: any) {
      toast.error(err?.message || "Save failed")
    } finally {
      setSaving(false)
    }
  }

  const handleDeactivate = async (device: BiometricDevice) => {
    if (device.status === "inactive") return
    const ok = window.confirm(
      `Deactivate "${device.name}"? It will no longer attribute punches to ${device.branch_name || "its branch"}.`
    )
    if (!ok) return
    try {
      await biometricDeviceAPI.deactivate(device.id)
      toast.success("Device deactivated")
      await loadDevices()
    } catch (err: any) {
      toast.error(err?.message || "Deactivate failed")
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="w-full p-4 lg:px-8 mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Cpu className="h-6 w-6 text-blue-600" />
              Biometric Devices
            </h1>
            <p className="text-gray-600 text-sm mt-1">
              Map each device to an approved branch so attendance punches stay branch-safe.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                loadDevices()
                loadIngestInfo()
              }}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" />
              Add Device
            </Button>
          </div>
        </div>

        {ingestStats ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-slate-500">Processed (7 days)</p>
                <p className="text-2xl font-semibold text-slate-900">
                  {ingestStats.processed_last_7_days ?? 0}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-slate-500">Unmatched (7 days)</p>
                <p className="text-2xl font-semibold text-amber-700">
                  {ingestStats.unmatched_last_7_days ?? 0}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-slate-500">Ingest API key</p>
                <p className="text-sm font-medium mt-1">
                  {ingestStats.ingest_key_configured ? (
                    <span className="text-green-700">Configured</span>
                  ) : (
                    <span className="text-amber-700">Not set — use Admin login to test ingest</span>
                  )}
                </p>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {unmatched.length > 0 ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Recent unmatched punches
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {unmatched.map((u) => (
                <div
                  key={u.id || `${u.external_event_id}-${u.created_at}`}
                  className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2"
                >
                  <p className="font-medium text-slate-800">
                    User ID: <span className="font-mono text-xs">{u.external_user_id}</span>
                    {" · "}
                    Device: <span className="font-mono text-xs">{u.vendor_device_id}</span>
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Reason: {u.reason || "unknown"}
                    {u.occurred_at
                      ? ` · ${new Date(u.occurred_at).toLocaleString()}`
                      : ""}
                  </p>
                </div>
              ))}
              <p className="text-xs text-slate-500">
                Map students under Biometric Mapping and register devices above, then re-send punches.
              </p>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Filters</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {!isBranchAdmin || branches.length > 1 ? (
              <div>
                <Label className="mb-1 block">Branch</Label>
                <Select value={branchFilter} onValueChange={setBranchFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All branches" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Branches</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                        {b.code ? ` (${b.code})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div>
              <Label className="mb-1 block">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Devices {loading ? "" : `(${devices.length})`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-slate-600 py-8 justify-center">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading devices...
              </div>
            ) : devices.length === 0 ? (
              <div className="text-center py-10 text-slate-600">
                <Cpu className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                <p className="font-medium text-slate-800">No devices yet</p>
                <p className="text-sm mt-1">Add a biometric device and link it to a branch.</p>
                <Button className="mt-4" onClick={openCreate}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Device
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50 text-left text-slate-700">
                      <th className="py-3 px-3 font-medium">Device</th>
                      <th className="py-3 px-3 font-medium hidden sm:table-cell">Vendor ID</th>
                      <th className="py-3 px-3 font-medium">Branch</th>
                      <th className="py-3 px-3 font-medium">Status</th>
                      <th className="py-3 px-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {devices.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50">
                        <td className="py-3 px-3">
                          <p className="font-medium text-slate-900">{d.name}</p>
                          <p className="text-xs text-slate-500 capitalize">{d.vendor}</p>
                          {d.location_note ? (
                            <p className="text-xs text-slate-400 mt-0.5">{d.location_note}</p>
                          ) : null}
                        </td>
                        <td className="py-3 px-3 hidden sm:table-cell font-mono text-xs">
                          {d.vendor_device_id}
                        </td>
                        <td className="py-3 px-3">
                          <p className="text-slate-800">{d.branch_name || "—"}</p>
                          {d.branch_code ? (
                            <p className="text-xs text-slate-500">{d.branch_code}</p>
                          ) : null}
                        </td>
                        <td className="py-3 px-3">
                          <Badge className={statusBadge(d.status)}>{d.status}</Badge>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => openEdit(d)}>
                              <Pencil className="h-3.5 w-3.5 mr-1" />
                              Edit
                            </Button>
                            {d.status !== "inactive" ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 border-red-200"
                                onClick={() => handleDeactivate(d)}
                              >
                                <Ban className="h-3.5 w-3.5 mr-1" />
                                Deactivate
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit biometric device" : "Add biometric device"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Device name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Front desk scanner"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Vendor</Label>
                <Input
                  value={form.vendor}
                  onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))}
                  placeholder="essl"
                />
              </div>
              <div>
                <Label>Vendor device ID / serial *</Label>
                <Input
                  value={form.vendor_device_id}
                  onChange={(e) => setForm((f) => ({ ...f, vendor_device_id: e.target.value }))}
                  placeholder="Device serial"
                />
              </div>
            </div>
            <div>
              <Label>Branch *</Label>
              <Select
                value={form.branch_id || undefined}
                onValueChange={(v) => setForm((f) => ({ ...f, branch_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                      {b.code ? ` (${b.code})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, status: v as BiometricDeviceStatus }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Location note</Label>
                <Input
                  value={form.location_note}
                  onChange={(e) => setForm((f) => ({ ...f, location_note: e.target.value }))}
                  placeholder="Reception, Floor 1"
                />
              </div>
              <div>
                <Label>IP address (optional)</Label>
                <Input
                  value={form.ip_address}
                  onChange={(e) => setForm((f) => ({ ...f, ip_address: e.target.value }))}
                  placeholder="192.168.1.10"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Saving...
                </>
              ) : editing ? (
                "Save changes"
              ) : (
                "Create device"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
