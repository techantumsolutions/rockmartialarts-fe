"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { addCartItemsMulti, type CartItem, type EnrollmentCart } from "@/lib/enrollmentCart"

type BranchOption = { id: string; name: string }

type BranchCourse = {
  id: string
  title?: string
  code?: string
  available_durations?: Array<{ id?: string; code?: string; name?: string }>
}

type MultiCoursePickerModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  studentLineId: string
  studentLabel: string
  existingItems: CartItem[]
  onCartUpdated: (cart: EnrollmentCart) => void
}

export function MultiCoursePickerModal({
  open,
  onOpenChange,
  studentLineId,
  studentLabel,
  existingItems,
  onCartUpdated,
}: MultiCoursePickerModalProps) {
  const initialBranch = existingItems[0]?.branch_id || ""
  const [branchId, setBranchId] = useState(initialBranch)
  const [branches, setBranches] = useState<BranchOption[]>([])
  const [courses, setCourses] = useState<BranchCourse[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [durations, setDurations] = useState<Record<string, string>>({})

  const inCartCourseIds = useMemo(() => {
    const set = new Set<string>()
    for (const item of existingItems) {
      if (item.branch_id === branchId) set.add(item.course_id)
    }
    return set
  }, [existingItems, branchId])

  useEffect(() => {
    if (!open) return
    setBranchId(initialBranch)
    setSelected({})
    setDurations({})
  }, [open, initialBranch])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    fetch("/api/backend/branches/public/search?active_only=true", {
      headers: { Accept: "application/json" },
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : { branches: [] }))
      .then((data) => {
        if (cancelled) return
        const list = (data.branches || []).map((b: Record<string, unknown>) => ({
          id: String(b.id || ""),
          name: String(b.name || (b.branch as { name?: string })?.name || b.code || "Branch"),
        }))
        setBranches(list.filter((b: BranchOption) => b.id))
        if (!branchId && list[0]?.id) setBranchId(list[0].id)
      })
      .catch(() => {
        if (!cancelled) setBranches([])
      })
    return () => {
      cancelled = true
    }
  }, [open, branchId])

  useEffect(() => {
    if (!open || !branchId) return
    let cancelled = false
    setLoading(true)
    fetch(`/api/backend/courses/public/by-branch/${encodeURIComponent(branchId)}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : { courses: [] }))
      .then((data) => {
        if (cancelled) return
        const list = Array.isArray(data.courses) ? data.courses : []
        setCourses(list)
        const durMap: Record<string, string> = {}
        for (const c of list) {
          const d0 = c.available_durations?.[0]
          const id = (d0?.id || d0?.code || "").trim()
          if (id) durMap[c.id] = id
        }
        setDurations((prev) => ({ ...durMap, ...prev }))
      })
      .catch(() => {
        if (!cancelled) setCourses([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, branchId])

  const selectedCount = useMemo(
    () => Object.entries(selected).filter(([id, on]) => on && !inCartCourseIds.has(id)).length,
    [selected, inCartCourseIds]
  )

  function toggleCourse(courseId: string, checked: boolean) {
    if (inCartCourseIds.has(courseId)) return
    setSelected((prev) => ({ ...prev, [courseId]: checked }))
  }

  async function handleAddSelected() {
    if (!branchId) {
      toast({ title: "Select a branch", variant: "destructive" })
      return
    }
    const selections = courses
      .filter((c) => selected[c.id] && !inCartCourseIds.has(c.id))
      .map((c) => ({
        course_id: c.id,
        duration_id: durations[c.id] || c.available_durations?.[0]?.id || c.available_durations?.[0]?.code || "",
      }))
      .filter((s) => s.duration_id)

    if (selections.length === 0) {
      toast({ title: "Select at least one course", variant: "destructive" })
      return
    }

    setSubmitting(true)
    try {
      const { cart, bulk_summary } = await addCartItemsMulti({
        student_line_id: studentLineId,
        branch_id: branchId,
        selections,
      })
      onCartUpdated(cart)
      const added = bulk_summary?.added ?? selections.length
      const skipped = bulk_summary?.skipped?.length ?? 0
      toast({
        title: `${added} course${added === 1 ? "" : "s"} added`,
        description:
          skipped > 0
            ? `${skipped} could not be added (already in cart or unavailable).`
            : `Added for ${studentLabel}.`,
      })
      onOpenChange(false)
    } catch (e) {
      toast({
        title: "Could not add courses",
        description: e instanceof Error ? e.message : "Try again.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const branchName = branches.find((b) => b.id === branchId)?.name || "Branch"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col bg-[#171A26] border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-[#FFB70F]">Add multiple courses</DialogTitle>
          <DialogDescription className="text-gray-400">
            Select several courses for <span className="text-white font-medium">{studentLabel}</span> at one
            branch. Courses already in the cart are shown as added.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 flex-1 overflow-y-auto min-h-0">
          <div className="space-y-1">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Branch</p>
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger className="bg-gray-900 border-gray-700">
                <SelectValue placeholder="Choose branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-8 h-8 animate-spin text-[#FFB70F]" />
            </div>
          ) : courses.length === 0 ? (
            <p className="text-gray-500 text-sm py-6 text-center">No courses available at {branchName}.</p>
          ) : (
            <ul className="space-y-2">
              {courses.map((course) => {
                const inCart = inCartCourseIds.has(course.id)
                const title = course.title || course.code || "Course"
                const durs = course.available_durations || []
                return (
                  <li
                    key={course.id}
                    className={`rounded-lg border px-3 py-3 ${
                      inCart ? "border-[#FFB70F]/40 bg-[#FFB70F]/5" : "border-gray-800 bg-gray-900/50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={inCart || !!selected[course.id]}
                        disabled={inCart}
                        onCheckedChange={(v) => toggleCourse(course.id, v === true)}
                        className="mt-1 border-gray-600 data-[state=checked]:bg-[#FFB70F] data-[state=checked]:border-[#FFB70F]"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate">{title}</p>
                        {inCart ? (
                          <p className="text-xs text-[#FFB70F] mt-1">Already in cart</p>
                        ) : durs.length > 0 ? (
                          <div className="mt-2">
                            <Select
                              value={durations[course.id] || ""}
                              onValueChange={(v) => setDurations((prev) => ({ ...prev, [course.id]: v }))}
                            >
                              <SelectTrigger className="h-9 bg-gray-950 border-gray-700 text-sm">
                                <SelectValue placeholder="Duration" />
                              </SelectTrigger>
                              <SelectContent>
                                {durs.map((d) => {
                                  const val = (d.id || d.code || "").trim()
                                  if (!val) return null
                                  return (
                                    <SelectItem key={val} value={val}>
                                      {d.name || d.code || val}
                                    </SelectItem>
                                  )
                                })}
                              </SelectContent>
                            </Select>
                          </div>
                        ) : (
                          <p className="text-xs text-gray-500 mt-1">No durations configured</p>
                        )}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <DialogFooter className="border-t border-gray-800 pt-4">
          <Button
            type="button"
            disabled={submitting || selectedCount === 0}
            className="w-full bg-[#FFB70F] text-black hover:bg-[#FFB70F]/90"
            onClick={handleAddSelected}
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              `Add ${selectedCount} course${selectedCount === 1 ? "" : "s"}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
