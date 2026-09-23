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
import { Fingerprint, Loader2, Pencil, RefreshCw, Search, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { getBackendApiUrl } from "@/lib/config"
import { TokenManager } from "@/lib/tokenManager"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"
import { useDashboardBasePath } from "@/lib/useDashboardBasePath"
import {
  studentBiometricMappingAPI,
  type BiometricMappingRow,
} from "@/lib/studentBiometricMappingAPI"

interface BranchOption {
  id: string
  name: string
  code?: string
}

export default function BiometricMappingPage() {
  const router = useRouter()
  const basePath = useDashboardBasePath()
  const isBranchAdmin = basePath.includes("branch-admin")

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [rows, setRows] = useState<BiometricMappingRow[]>([])
  const [total, setTotal] = useState(0)
  const [branches, setBranches] = useState<BranchOption[]>([])
  const [q, setQ] = useState("")
  const [mappedFilter, setMappedFilter] = useState("all")
  const [branchFilter, setBranchFilter] = useState("all")
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<BiometricMappingRow | null>(null)
  const [biometricId, setBiometricId] = useState("")

  const getToken = () => BranchManagerAuth.getToken() || TokenManager.getToken()

  const loadBranches = useCallback(async () => {
    const token = getToken()
    if (!token) return
    try {
      const res = await fetch(getBackendApiUrl("branches"), {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        cache: "no-store",
      })
      if (!res.ok) return
      const data = await res.json()
      let list: any[] = data.branches || data || []
      if (isBranchAdmin) {
        const bm = BranchManagerAuth.getCurrentUser()
        const managed = bm?.managed_branches || (bm?.branch_id ? [bm.branch_id] : [])
        if (managed.length) list = list.filter((b) => managed.includes(b.id))
      }
      setBranches(
        list
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

  const loadRows = useCallback(async () => {
    const token = getToken()
    if (!token) {
      router.push(isBranchAdmin ? "/branch-manager-login" : "/login")
      return
    }
    setLoading(true)
    try {
      const data = await studentBiometricMappingAPI.list({
        q: q.trim().length >= 2 ? q.trim() : undefined,
        mapped: mappedFilter,
        branch_id: branchFilter === "all" ? undefined : branchFilter,
        limit: 200,
      })
      setRows(data.students || [])
      setTotal(typeof data.total === "number" ? data.total : (data.students || []).length)
    } catch (err: any) {
      toast.error(err?.message || "Failed to load mappings")
      setRows([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [q, mappedFilter, branchFilter, router, isBranchAdmin])

  useEffect(() => {
    loadBranches()
  }, [loadBranches])

  useEffect(() => {
    loadRows()
  }, [loadRows])

  const openMap = (row: BiometricMappingRow) => {
    setSelected(row)
    setBiometricId(row.biometric_id || row.essl_user_id || "")
    setOpen(true)
  }

  const handleSave = async () => {
    if (!selected?.student_id) return
    if (!biometricId.trim()) {
      toast.error("Enter a biometric / device user ID")
      return
    }
    setSaving(true)
    try {
      await studentBiometricMappingAPI.set(selected.student_id, {
        biometric_id: biometricId.trim(),
      })
      toast.success("Biometric mapping saved")
      setOpen(false)
      await loadRows()
    } catch (err: any) {
      toast.error(err?.message || "Save failed")
    } finally {
      setSaving(false)
    }
  }

  const handleClear = async (row: BiometricMappingRow) => {
    if (!row.is_mapped) return
    const ok = window.confirm(
      `Clear biometric mapping for ${row.full_name || "this student"}?`
    )
    if (!ok) return
    try {
      await studentBiometricMappingAPI.clear(row.student_id)
      toast.success("Mapping cleared")
      await loadRows()
    } catch (err: any) {
      toast.error(err?.message || "Clear failed")
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="w-full p-4 lg:px-8 mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Fingerprint className="h-6 w-6 text-blue-600" />
              Student Biometric Mapping
            </h1>
            <p className="text-gray-600 text-sm mt-1">
              Link each student to their vendor/device user ID. Duplicate IDs are blocked.
            </p>
          </div>
          <Button variant="outline" onClick={loadRows} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Filters</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="mb-1 block">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  className="pl-9"
                  placeholder="Name, email, phone, or biometric ID"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") loadRows()
                  }}
                />
              </div>
            </div>
            {(!isBranchAdmin || branches.length > 1) && (
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
            )}
            <div>
              <Label className="mb-1 block">Mapping status</Label>
              <Select value={mappedFilter} onValueChange={setMappedFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All students</SelectItem>
                  <SelectItem value="yes">Mapped</SelectItem>
                  <SelectItem value="no">Unmapped</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Students {loading ? "" : `(${total})`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-600">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading...
              </div>
            ) : rows.length === 0 ? (
              <div className="text-center py-10 text-slate-600">
                <Fingerprint className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                <p className="font-medium text-slate-800">No students found</p>
                <p className="text-sm mt-1">Try adjusting filters or search.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50 text-left text-slate-700">
                      <th className="py-3 px-3 font-medium">Student</th>
                      <th className="py-3 px-3 font-medium hidden md:table-cell">Branch</th>
                      <th className="py-3 px-3 font-medium">Biometric ID</th>
                      <th className="py-3 px-3 font-medium">Status</th>
                      <th className="py-3 px-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {rows.map((row) => (
                      <tr key={row.student_id} className="hover:bg-slate-50">
                        <td className="py-3 px-3">
                          <p className="font-medium text-slate-900">{row.full_name || "—"}</p>
                          <p className="text-xs text-slate-500 truncate">{row.email || row.phone}</p>
                        </td>
                        <td className="py-3 px-3 hidden md:table-cell text-slate-700">
                          {row.branch_name || "—"}
                        </td>
                        <td className="py-3 px-3 font-mono text-xs">
                          {row.biometric_id || row.essl_user_id || (
                            <span className="text-slate-400 font-sans">Not mapped</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <Badge
                            className={
                              row.is_mapped
                                ? "bg-green-100 text-green-800 hover:bg-green-100"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-100"
                            }
                          >
                            {row.is_mapped ? "Mapped" : "Unmapped"}
                          </Badge>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => openMap(row)}>
                              <Pencil className="h-3.5 w-3.5 mr-1" />
                              {row.is_mapped ? "Edit" : "Map"}
                            </Button>
                            {row.is_mapped ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 border-red-200"
                                onClick={() => handleClear(row)}
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-1" />
                                Clear
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selected?.is_mapped ? "Update" : "Set"} biometric mapping
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-slate-600">
              Student: <span className="font-medium text-slate-900">{selected?.full_name}</span>
            </p>
            <div>
              <Label>Vendor / device user ID *</Label>
              <Input
                value={biometricId}
                onChange={(e) => setBiometricId(e.target.value)}
                placeholder="e.g. STU0001"
                autoFocus
              />
              <p className="text-xs text-slate-500 mt-1">
                Must be unique across students. Same value is stored for ESSL compatibility.
              </p>
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
              ) : (
                "Save mapping"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
