"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
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
import { formatOperationalTimingsForDisplay } from "@/components/branch/types"
import { formatTimingString } from "@/lib/formatWeekdayRanges"
import type { BranchCourseScheduleEntry } from "@/components/branch/types"
import { toCourseSlug } from "@/lib/course-slug"
import {
  courseScheduleBatchCards,
  formatCourseBatchesForModal,
  type BatchDurationRef,
} from "@/lib/formatCourseBatchSchedule"

export type CourseInfoModalCourse = {
  id: string
  title?: string
  name?: string
  code?: string
  slug?: string
  description?: string
  difficulty_level?: string
}

type BranchInfoPayload = {
  branch_id?: string
  branch_name?: string
  duration?: string
  price_display?: string
  timings?: string
  fee_per_duration?: Record<string, number | string> | null
}

function courseTitle(c: CourseInfoModalCourse | null): string {
  if (!c) return "Course"
  return (c.title ?? c.name ?? c.code ?? "Course").trim() || "Course"
}

export function CourseInfoModal({
  open,
  onOpenChange,
  course,
  branchId,
  branchDisplayName,
  branchTimings,
  courseSchedule,
  availableDurations,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  course: CourseInfoModalCourse | null
  branchId: string
  branchDisplayName: string
  /** From branch page `operational_details.timings` when API omits timings string. */
  branchTimings?: Parameters<typeof formatOperationalTimingsForDisplay>[0]
  /** From `assignments.course_schedule` (per-course batch days & times). */
  courseSchedule?: BranchCourseScheduleEntry[] | null
  /** Active tenure options for batch fee_per_duration labels. */
  availableDurations?: BatchDurationRef[]
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [branchInfo, setBranchInfo] = useState<BranchInfoPayload | null>(null)

  const courseId = course?.id ?? ""

  useEffect(() => {
    if (!open || !courseId || !branchId) {
      setBranchInfo(null)
      setError(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    setBranchInfo(null)

    const infoUrl = `/api/backend/courses/public/detail/${encodeURIComponent(courseId)}/branch-info?branch_id=${encodeURIComponent(branchId)}`

    fetch(infoUrl, { headers: { "Content-Type": "application/json" }, cache: "no-store" })
      .then(async (infoRes) => {
        const data = await infoRes.json().catch(() => ({}))
        if (!infoRes.ok) {
          const msg =
            typeof data?.detail === "string"
              ? data.detail
              : "Could not load details for this course at this branch."
          if (!cancelled) {
            setError(msg)
            setBranchInfo(null)
          }
          return
        }
        if (!cancelled) setBranchInfo(data as BranchInfoPayload)
      })
      .catch(() => {
        if (!cancelled) {
          setError("Something went wrong. Please try again.")
          setBranchInfo(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, courseId, branchId])

  const batchCards = useMemo(
    () => courseScheduleBatchCards(courseSchedule ?? null, courseId, availableDurations),
    [courseSchedule, courseId, availableDurations]
  )

  const batchScheduleTextFallback = useMemo(
    () => formatCourseBatchesForModal(courseSchedule ?? null, courseId).trim(),
    [courseSchedule, courseId]
  )

  const apiTimings = (branchInfo?.timings ?? "").trim()
  const fromBranch = formatOperationalTimingsForDisplay(branchTimings ?? null).trim()

  const timingsText = useMemo(() => {
    if (batchScheduleTextFallback && batchCards.length === 0)
      return batchScheduleTextFallback
    if (apiTimings && apiTimings !== "—") return formatTimingString(apiTimings)
    return fromBranch.replace(/\s*•\s*/g, "\n")
  }, [batchScheduleTextFallback, batchCards.length, apiTimings, fromBranch])

  const showTimingsPlaceholder =
    !loading && !error && (!timingsText || timingsText === "—") && batchCards.length === 0

  const branchNameResolved =
    (branchInfo?.branch_name?.trim() || branchDisplayName || "This branch").trim()
  const durationLine = (branchInfo?.duration ?? "").trim()
  const showDuration = durationLine && durationLine !== "—"

  const enrollHref = course
    ? `/courses/${encodeURIComponent(toCourseSlug(course))}`
    : "/courses"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="max-h-[min(92vh,880px)] w-full max-w-[min(92vw,760px)] overflow-y-auto border border-gray-200 bg-white p-6 text-gray-800 shadow-xl sm:max-w-[min(92vw,760px)] data-[state=open]:duration-200"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="space-y-1 pr-8 text-left">
          <DialogTitle className="sr-only">
            {courseTitle(course)} — {branchNameResolved}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Course details, batches, and fees at {branchNameResolved}.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 sm:p-6 shadow-md shadow-gray-200/50 space-y-5">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">
              {courseTitle(course)}
            </h2>
            <p className="text-sm text-gray-500">{branchNameResolved}</p>
          </div>

          {course?.description ? (
            <p className="text-sm text-gray-600 leading-relaxed line-clamp-6">{course.description}</p>
          ) : null}

          {course?.difficulty_level ? (
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
              Level: {course.difficulty_level}
            </p>
          ) : null}

        <div className="space-y-5 border-t border-gray-100 pt-5">
          {loading && (
            <div className="flex items-center gap-2 text-gray-600 text-sm py-4">
              <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
              <span>Loading branch details…</span>
            </div>
          )}

          {error && !loading && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          {!loading && !error && (
            <>
              <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4 shadow-sm">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                  Branch
                </h4>
                <p className="text-sm font-medium text-gray-900">{branchNameResolved}</p>
              </div>

              {batchCards.length > 0 ? (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
                    Batches at this branch
                  </h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {batchCards.map((card, i) => (
                      <div
                        key={i}
                        className="rounded-2xl border border-gray-100 bg-white p-4 shadow-md shadow-gray-200/60"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-gray-900">{card.title}</p>
                          {card.isPopular ? (
                            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                              Popular
                            </span>
                          ) : null}
                        </div>
                        <p className="text-sm text-gray-700 mt-1">{card.daysLine}</p>
                        <p className="text-sm text-gray-800 font-medium mt-0.5">{card.timeLine}</p>
                        {showDuration ? (
                          <p className="text-sm text-gray-600 mt-2">
                            <span className="text-gray-500">Duration:</span>{" "}
                            <span className="text-gray-800">{durationLine}</span>
                          </p>
                        ) : null}
                        {card.trainer ? (
                          <p className="text-sm text-gray-600 mt-2">
                            <span className="text-gray-500">Trainer:</span> {card.trainer}
                          </p>
                        ) : null}
                        <p className="text-base font-semibold text-amber-700 mt-3 tabular-nums">
                          {card.feeLabel}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                    Timings
                  </h4>
                  {showTimingsPlaceholder ? (
                    <p className="text-sm text-gray-500">Timings will be updated soon.</p>
                  ) : (
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{timingsText}</p>
                  )}
                  {showDuration ? (
                    <p className="text-sm text-gray-600 mt-3">
                      <span className="text-gray-500">Duration:</span>{" "}
                      <span className="text-gray-800">{durationLine}</span>
                    </p>
                  ) : null}
                </div>
              )}
            </>
          )}
        </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col border-t border-gray-100 pt-4">
          <Button
            asChild
            className="w-full bg-amber-500 text-white hover:bg-amber-600 font-semibold shadow-md"
          >
            <Link href={enrollHref} onClick={() => onOpenChange(false)}>
              Enroll Now
            </Link>
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
