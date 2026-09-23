"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { BookOpen, Loader2, PlayCircle, RefreshCw } from "lucide-react"
import StudentDashboardLayout from "@/components/student-dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { requireStudentSession } from "@/lib/sessionAuth"
import {
  learningProgressAPI,
  type LearningCourseProgress,
} from "@/lib/learningProgressAPI"

export default function StudentOnlineLearningPage() {
  const router = useRouter()
  const [rows, setRows] = useState<LearningCourseProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const token = requireStudentSession(router, "/student-dashboard/online-learning")
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const data = await learningProgressAPI.listMine()
      setRows(data.progress || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load progress")
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    load()
  }, [load])

  return (
    <StudentDashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#4F5077]">Online Learning</h1>
            <p className="text-sm text-[#6B7A99] mt-1">
              Resume where you left off and track course completion.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => void load()} className="gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </Button>
            <Button asChild size="sm" className="bg-[#FFB70F] hover:bg-[#e0a00d] text-black">
              <Link href="/online-learning">Browse catalogue</Link>
            </Button>
          </div>
        </div>

        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-7 h-7 animate-spin text-gray-400" />
          </div>
        ) : rows.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center space-y-3">
              <BookOpen className="w-10 h-10 text-gray-300 mx-auto" />
              <p className="text-sm text-gray-600">
                No online learning progress yet. Start a course to track lessons here.
              </p>
              <Button asChild className="bg-[#FFB70F] hover:bg-[#e0a00d] text-black">
                <Link href="/online-learning">Explore online courses</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {rows.map((row) => {
              const slug = row.course?.slug
              const title = row.course?.title || "Online course"
              const pct = Number(row.progress_percent) || 0
              const resumeLesson = row.resume?.lesson_id
              const learnHref = slug
                ? resumeLesson
                  ? `/online-learning/${slug}/learn?lesson=${resumeLesson}`
                  : `/online-learning/${slug}/learn`
                : "/online-learning"
              return (
                <Card key={row.course_id || row.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base text-[#4F5077] flex flex-wrap items-center gap-2">
                      <span className="truncate">{title}</span>
                      {row.entitled ? (
                        <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-green-50 text-green-700 border border-green-200">
                          Subscribed
                        </span>
                      ) : (
                        <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                          Preview
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>
                          {row.completed_count ?? 0} / {row.total_lessons ?? 0}{" "}
                          lessons
                        </span>
                        <span>{pct}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full bg-[#FFB70F] transition-all"
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                    </div>
                    {row.last_lesson?.title ? (
                      <p className="text-sm text-gray-600">
                        Last watched:{" "}
                        <span className="font-medium text-gray-800">
                          {row.last_lesson.title}
                        </span>
                      </p>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        asChild
                        size="sm"
                        className="gap-1.5 bg-[#4F5077] hover:bg-[#3d3e5c]"
                      >
                        <Link href={learnHref}>
                          <PlayCircle className="w-3.5 h-3.5" />
                          {row.resume?.available ? "Resume" : "Continue"}
                        </Link>
                      </Button>
                      {slug ? (
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/online-learning/${slug}`}>Course page</Link>
                        </Button>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </StudentDashboardLayout>
  )
}
