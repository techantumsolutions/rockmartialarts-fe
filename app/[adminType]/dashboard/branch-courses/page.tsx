"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { BookOpen, Loader2, Plus, RefreshCw, Save } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getBackendApiUrl } from "@/lib/config"
import { TokenManager } from "@/lib/tokenManager"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"
import { useDashboardBasePath } from "@/lib/useDashboardBasePath"

type BranchOption = {
  id: string
  name: string
  code?: string
}

type CourseOption = {
  id: string
  title?: string
  name?: string
  code?: string
}

type BranchCourseMapping = {
  branch_id: string
  course_id: string
  is_available?: boolean
  fee_per_duration?: Record<string, number> | null
  course_title?: string
  course_code?: string
}

function authHeaders(): HeadersInit {
  const token = TokenManager.getToken() || BranchManagerAuth.getToken()
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "Cache-Control": "no-cache",
  }
}

function courseDisplayName(course?: CourseOption | null, fallbackTitle?: string) {
  const title = (fallbackTitle || course?.title || course?.name || "").trim()
  if (title) return title
  const code = (course?.code || "").trim()
  if (code) return code
  return "Untitled course"
}

export default function BranchCourseAssignmentsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const basePath = useDashboardBasePath()

  const [branches, setBranches] = useState<BranchOption[]>([])
  const [courses, setCourses] = useState<CourseOption[]>([])
  const [branchId, setBranchId] = useState("")
  const [mappings, setMappings] = useState<BranchCourseMapping[]>([])
  const [loadingBranches, setLoadingBranches] = useState(true)
  const [loadingMappings, setLoadingMappings] = useState(false)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [addCourseId, setAddCourseId] = useState("")

  const courseById = useMemo(() => {
    const map = new Map<string, CourseOption>()
    courses.forEach((c) => {
      if (c.id) map.set(c.id, c)
    })
    return map
  }, [courses])

  const assignedCourseIds = useMemo(
    () => new Set(mappings.map((m) => m.course_id)),
    [mappings]
  )

  const unassignedCourses = useMemo(
    () => courses.filter((c) => c.id && !assignedCourseIds.has(c.id)),
    [courses, assignedCourseIds]
  )

  const loadBranches = useCallback(async () => {
    setLoadingBranches(true)
    try {
      const res = await fetch(getBackendApiUrl("branches?active_only=true&limit=200"), {
        headers: authHeaders(),
        cache: "no-store",
      })
      if (!res.ok) throw new Error("Failed to load academies")
      const data = await res.json()
      const list = (data.branches || data.data || []) as any[]
      setBranches(
        list
          .map((b) => ({
            id: b.id,
            name: b.branch?.name || b.name || "Academy",
            code: b.branch?.code,
          }))
          .filter((b) => b.id)
      )
    } catch (err: any) {
      toast.error(err?.message || "Could not load academies")
    } finally {
      setLoadingBranches(false)
    }
  }, [])

  const loadCourses = useCallback(async () => {
    try {
      const res = await fetch(getBackendApiUrl("courses?active_only=true&limit=300"), {
        headers: authHeaders(),
        cache: "no-store",
      })
      if (!res.ok) throw new Error("Failed to load courses")
      const data = await res.json()
      const list = (data.courses || []) as CourseOption[]
      setCourses(list.filter((c) => c.id))
    } catch (err: any) {
      toast.error(err?.message || "Could not load courses")
    }
  }, [])

  const loadMappings = useCallback(async (selectedBranchId: string) => {
    if (!selectedBranchId) {
      setMappings([])
      return
    }
    setLoadingMappings(true)
    try {
      const res = await fetch(
        getBackendApiUrl(`branch-courses/by-branch/${encodeURIComponent(selectedBranchId)}`),
        { headers: authHeaders(), cache: "no-store" }
      )
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail || "Failed to load academy-course mappings")
      }
      const data = await res.json()
      const rows = (data.mappings || []) as BranchCourseMapping[]
      const enriched = rows.map((row) => {
        const course = courseById.get(row.course_id)
        return {
          ...row,
          course_title: course?.title || course?.name,
          course_code: course?.code,
        }
      })
      setMappings(enriched)
    } catch (err: any) {
      toast.error(err?.message || "Could not load mappings")
      setMappings([])
    } finally {
      setLoadingMappings(false)
    }
  }, [courseById])

  useEffect(() => {
  if (!TokenManager.isAuthenticated() && !BranchManagerAuth.getToken()) {
      router.push("/login")
      return
    }
    void loadBranches()
    void loadCourses()
  }, [loadBranches, loadCourses, router])

  useEffect(() => {
    const fromQuery = searchParams.get("branch_id") || ""
    if (fromQuery && !branchId) {
      setBranchId(fromQuery)
    }
  }, [searchParams, branchId])

  useEffect(() => {
    if (branchId) {
      void loadMappings(branchId)
    }
  }, [branchId, loadMappings])

  const saveMapping = async (mapping: BranchCourseMapping) => {
    const key = `${mapping.branch_id}:${mapping.course_id}`
    setSavingKey(key)
    try {
      const res = await fetch(getBackendApiUrl("branch-courses"), {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          branch_id: mapping.branch_id,
          course_id: mapping.course_id,
          is_available: mapping.is_available !== false,
          fee_per_duration: mapping.fee_per_duration ?? undefined,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail || "Save failed")
      }
      toast.success("Academy–course assignment saved")
      await loadMappings(mapping.branch_id)
    } catch (err: any) {
      toast.error(err?.message || "Could not save mapping")
    } finally {
      setSavingKey(null)
    }
  }

  const addCourseToBranch = async () => {
    if (!branchId || !addCourseId) {
      toast.error("Select an academy and course")
      return
    }
    await saveMapping({
      branch_id: branchId,
      course_id: addCourseId,
      is_available: true,
      fee_per_duration: null,
    })
    setAddCourseId("")
  }

  const updateLocal = (courseId: string, patch: Partial<BranchCourseMapping>) => {
    setMappings((prev) =>
      prev.map((row) => (row.course_id === courseId ? { ...row, ...patch } : row))
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:px-8">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Academy–Course Assignments</h1>
          <p className="text-gray-600 text-sm">
            Manage which courses are offered at each academy. Batch fees are set under Edit Academy → Course Assignments.
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push(`${basePath}/branches`)}>
          Back to Academies
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Select academy</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-700">Academy</label>
            <Select value={branchId || "none"} onValueChange={(v) => setBranchId(v === "none" ? "" : v)} disabled={loadingBranches}>
              <SelectTrigger>
                <SelectValue placeholder={loadingBranches ? "Loading…" : "Choose academy"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select academy…</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                    {b.code ? ` (${b.code})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            disabled={!branchId || loadingMappings}
            onClick={() => branchId && loadMappings(branchId)}
          >
            {loadingMappings ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </CardContent>
      </Card>

      {branchId && (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Assign course to academy
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700">Course</label>
                <Select value={addCourseId || "none"} onValueChange={(v) => setAddCourseId(v === "none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select course to assign" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select course…</SelectItem>
                    {unassignedCourses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {courseDisplayName(c)}
                        {c.code && (c.title || c.name) ? ` (${c.code})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button disabled={!addCourseId} onClick={addCourseToBranch}>
                Assign
              </Button>
            </CardContent>
          </Card>

          <Card className="relative z-0 flex h-[calc(100vh-5.5rem)] max-h-[calc(100vh-5.5rem)] flex-col overflow-hidden">
            <CardHeader className="shrink-0">
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Assigned courses
              </CardTitle>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 overflow-y-auto overscroll-y-auto">
              {loadingMappings ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                </div>
              ) : mappings.length === 0 ? (
                <p className="text-sm text-gray-500 py-6 text-center">No courses assigned yet for this academy.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Course</TableHead>
                      <TableHead>Available</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mappings.map((row) => {
                      const course = courseById.get(row.course_id)
                      const title = courseDisplayName(course, row.course_title)
                      const code = (row.course_code || course?.code || "").trim()
                      const saveKey = `${row.branch_id}:${row.course_id}`
                      return (
                        <TableRow key={row.course_id}>
                          <TableCell>
                            <div className="font-medium">{title}</div>
                            {code ? <div className="text-xs text-gray-500">{code}</div> : null}
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={row.is_available !== false}
                              onCheckedChange={(checked) => updateLocal(row.course_id, { is_available: checked })}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={savingKey === saveKey}
                              onClick={() => {
                                const current = mappings.find((m) => m.course_id === row.course_id)
                                if (!current) return
                                void saveMapping({
                                  ...current,
                                  branch_id: branchId,
                                })
                              }}
                            >
                              {savingKey === saveKey ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Save className="h-4 w-4 mr-1" />
                                  Save
                                </>
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
