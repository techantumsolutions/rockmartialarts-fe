"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Loader2,
  Lock,
  PlayCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  formatDuration,
  learningCourseAPI,
  type LearningCourse,
} from "@/lib/learningCourseAPI"
import {
  learningAccessAPI,
  type LearningLessonPlaybackResponse,
  type LearningPlaybackLesson,
  type LearningPlayerCurriculum,
} from "@/lib/learningAccessAPI"
import { learningProgressAPI } from "@/lib/learningProgressAPI"
import { TokenManager } from "@/lib/tokenManager"

function ProtectedVideo({
  src,
  title,
  startAt,
  onProgress,
  onEnded,
}: {
  src: string
  title: string
  startAt?: number
  onProgress?: (position: number, duration: number) => void
  onEnded?: () => void
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const seekApplied = useRef(false)

  useEffect(() => {
    seekApplied.current = false
  }, [src, startAt])

  return (
    <div className="relative aspect-video w-full bg-black rounded-xl overflow-hidden border border-gray-800">
      <video
        ref={videoRef}
        key={src}
        src={src}
        controls
        controlsList="nodownload noplaybackrate"
        disablePictureInPicture
        playsInline
        className="w-full h-full"
        onContextMenu={(e) => e.preventDefault()}
        title={title}
        onLoadedMetadata={() => {
          const el = videoRef.current
          if (!el || seekApplied.current) return
          if (startAt && startAt > 3 && Number.isFinite(startAt)) {
            try {
              el.currentTime = Math.min(startAt, Math.max(0, el.duration - 1))
            } catch {
              /* ignore seek errors */
            }
          }
          seekApplied.current = true
        }}
        onTimeUpdate={() => {
          const el = videoRef.current
          if (!el || !onProgress) return
          onProgress(el.currentTime || 0, el.duration || 0)
        }}
        onEnded={() => onEnded?.()}
      >
        Your browser does not support video playback.
      </video>
      <p className="sr-only">Downloads are disabled for this lesson.</p>
    </div>
  )
}

function EmbedPlayer({
  url,
  title,
  onOpened,
}: {
  url: string
  title: string
  onOpened?: () => void
}) {
  useEffect(() => {
    onOpened?.()
  }, [url, onOpened])

  return (
    <div className="relative aspect-video w-full bg-black rounded-xl overflow-hidden border border-gray-800">
      <iframe
        src={url}
        title={title}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  )
}

export default function LearningPlayerPage() {
  const params = useParams()
  const search = useSearchParams()
  const slug = String(params?.slug || "")
  const lessonFromQuery = search?.get("lesson") || ""

  const [course, setCourse] = useState<LearningCourse | null>(null)
  const [player, setPlayer] = useState<LearningPlayerCurriculum | null>(null)
  const [activeLessonId, setActiveLessonId] = useState<string>("")
  const [playback, setPlayback] =
    useState<LearningLessonPlaybackResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [playLoading, setPlayLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [playError, setPlayError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [progressPercent, setProgressPercent] = useState(0)
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())
  const [resumeAt, setResumeAt] = useState(0)
  const lastHeartbeat = useRef(0)

  const loadShell = useCallback(async () => {
    if (!slug) return
    setLoading(true)
    setError(null)
    try {
      const pub = await learningCourseAPI.getPublic(slug)
      setCourse(pub.course)
      if (!pub.course?.id) throw new Error("Course not found")
      const curr = await learningAccessAPI.getPlayerCurriculum(pub.course.id)
      setPlayer(curr)
      const init: Record<string, boolean> = {}
      ;(curr.curriculum || []).forEach((lv, i) => {
        init[lv.id] = i === 0
      })
      setExpanded(init)

      let resumeLesson = ""
      let resumePos = 0
      if (TokenManager.isAuthenticated()) {
        try {
          const prog = await learningProgressAPI.getCourse(pub.course.id)
          setProgressPercent(Number(prog.progress_percent) || 0)
          setCompletedIds(new Set(prog.completed_lesson_ids || []))
          if (!lessonFromQuery && prog.resume?.available && prog.resume.lesson_id) {
            resumeLesson = prog.resume.lesson_id
            resumePos = Number(prog.resume.position_seconds) || 0
          }
        } catch {
          /* progress optional for anonymous preview */
        }
      }

      const firstPlayable =
        lessonFromQuery ||
        resumeLesson ||
        curr.curriculum
          ?.flatMap((l) => l.lessons || [])
          .find((x) => x.can_play)?.id ||
        curr.curriculum?.[0]?.lessons?.[0]?.id ||
        ""
      setResumeAt(resumeLesson && firstPlayable === resumeLesson ? resumePos : 0)
      setActiveLessonId(firstPlayable)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load player")
    } finally {
      setLoading(false)
    }
  }, [slug, lessonFromQuery])

  useEffect(() => {
    loadShell()
  }, [loadShell])

  const loadPlayback = useCallback(async (lessonId: string) => {
    if (!lessonId) {
      setPlayback(null)
      return
    }
    setPlayLoading(true)
    setPlayError(null)
    setPlayback(null)
    try {
      const data = await learningAccessAPI.getLessonPlayback(lessonId)
      const blob = JSON.stringify(data)
      if (blob.includes("video_url") || blob.includes("video_storage_key")) {
        throw new Error("Invalid playback payload")
      }
      setPlayback(data)
      // Record open as last-viewed
      if (TokenManager.isAuthenticated() && data.course?.id) {
        learningProgressAPI
          .heartbeat(data.course.id, { lesson_id: lessonId, position_seconds: 0 })
          .then((r) => {
            setProgressPercent(Number(r.progress?.progress_percent) || 0)
            setCompletedIds(new Set(r.progress?.completed_lesson_ids || []))
          })
          .catch(() => {})
      }
    } catch (e) {
      const err = e as Error & { status?: number }
      if (err.status === 401) {
        setPlayError("Sign in with a student account to watch this lesson.")
      } else if (err.status === 403) {
        setPlayError(
          "An active subscription is required. Subscribe from the course page."
        )
      } else {
        setPlayError(err.message || "Could not load lesson")
      }
    } finally {
      setPlayLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeLessonId) void loadPlayback(activeLessonId)
  }, [activeLessonId, loadPlayback])

  const sendHeartbeat = useCallback(
    (
      position: number,
      duration: number,
      completed?: boolean,
      force = false
    ) => {
      if (!TokenManager.isAuthenticated()) return
      const courseId = playback?.course?.id || course?.id
      const lessonId = playback?.lesson?.id || activeLessonId
      if (!courseId || !lessonId) return
      const now = Date.now()
      if (!force && !completed && now - lastHeartbeat.current < 8000) return
      lastHeartbeat.current = now
      learningProgressAPI
        .heartbeat(courseId, {
          lesson_id: lessonId,
          position_seconds: Math.floor(position),
          duration_seconds:
            duration && Number.isFinite(duration) ? Math.floor(duration) : undefined,
          completed: completed || undefined,
        })
        .then((r) => {
          setProgressPercent(Number(r.progress?.progress_percent) || 0)
          setCompletedIds(new Set(r.progress?.completed_lesson_ids || []))
        })
        .catch(() => {})
    },
    [playback, course?.id, activeLessonId]
  )

  const flatLessons = useMemo(() => {
    const out: LearningPlaybackLesson[] = []
    for (const lv of player?.curriculum || []) {
      out.push(...(lv.lessons || []))
    }
    return out
  }, [player])

  const selectLesson = (les: LearningPlaybackLesson) => {
    if (!les.can_play) {
      if (!TokenManager.isAuthenticated()) {
        const next = encodeURIComponent(
          `/online-learning/${slug}/learn?lesson=${les.id}`
        )
        window.location.href = `/login?next=${next}`
        return
      }
      setPlayError("Subscribe to unlock this lesson.")
      setActiveLessonId(les.id)
      return
    }
    setResumeAt(0)
    setActiveLessonId(les.id)
  }

  const streamSrc =
    playback?.playback?.mode === "stream" && playback.playback.stream_path
      ? learningAccessAPI.streamUrl(playback.playback.stream_path)
      : null

  return (
    <main className="min-h-screen bg-[#171A26]">
      <div className="border-b border-gray-800 bg-[#12141c]">
        <div className="container mx-auto px-4 max-w-7xl py-4 flex flex-wrap items-center gap-3">
          <Link
            href={course?.slug ? `/online-learning/${course.slug}` : "/online-learning"}
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#FFB70F]"
          >
            <ArrowLeft className="w-4 h-4" />
            Course details
          </Link>
          <span className="text-gray-700">/</span>
          <h1 className="text-white font-semibold truncate">
            {course?.title || "Lesson player"}
          </h1>
          {player?.entitled ? (
            <span className="text-xs text-green-400 border border-green-800/50 rounded px-2 py-0.5">
              Subscribed
            </span>
          ) : (
            <span className="text-xs text-amber-400/90 border border-amber-800/40 rounded px-2 py-0.5">
              Preview / locked
            </span>
          )}
          {TokenManager.isAuthenticated() ? (
            <span className="text-xs text-gray-400 ml-auto">
              Progress {progressPercent}%
            </span>
          ) : null}
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-7xl py-6 md:py-8">
        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-[#FFB70F]" />
          </div>
        ) : error ? (
          <div className="text-center space-y-4 py-16">
            <p className="text-red-300">{error}</p>
            <Button asChild className="bg-[#FFB70F] text-black hover:bg-[#e0a00d]">
              <Link href="/online-learning">Back to catalogue</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {playLoading ? (
                <div className="aspect-video rounded-xl border border-gray-800 bg-gray-900 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-[#FFB70F]" />
                </div>
              ) : playError && !playback ? (
                <div className="aspect-video rounded-xl border border-gray-800 bg-gray-900 flex flex-col items-center justify-center gap-3 px-6 text-center">
                  <Lock className="w-10 h-10 text-gray-600" />
                  <p className="text-gray-300 text-sm max-w-md">{playError}</p>
                  {course?.slug ? (
                    <Button
                      asChild
                      className="bg-[#FFB70F] text-black hover:bg-[#e0a00d]"
                    >
                      <Link href={`/online-learning/${course.slug}`}>
                        View plans
                      </Link>
                    </Button>
                  ) : null}
                </div>
              ) : playback?.playback?.mode === "stream" && streamSrc ? (
                <ProtectedVideo
                  src={streamSrc}
                  title={playback.lesson.title}
                  startAt={resumeAt}
                  onProgress={(pos, dur) => sendHeartbeat(pos, dur)}
                  onEnded={() => sendHeartbeat(0, 0, true, true)}
                />
              ) : playback?.playback?.mode?.startsWith("embed_") &&
                playback.playback.embed_url ? (
                <EmbedPlayer
                  url={playback.playback.embed_url}
                  title={playback.lesson.title}
                  onOpened={() => sendHeartbeat(0, 0, false, true)}
                />
              ) : (
                <div className="aspect-video rounded-xl border border-gray-800 bg-gray-900 flex items-center justify-center px-6 text-center">
                  <p className="text-gray-400 text-sm">
                    {playback?.playback?.message ||
                      "Select a lesson to start watching."}
                  </p>
                </div>
              )}

              <div>
                <h2 className="text-xl font-bold text-white">
                  {playback?.lesson?.title ||
                    flatLessons.find((l) => l.id === activeLessonId)?.title ||
                    "Lesson"}
                </h2>
                {playback?.level?.title ? (
                  <p className="text-sm text-gray-500 mt-1">
                    {playback.level.title}
                  </p>
                ) : null}
                {playback?.lesson?.description ? (
                  <p className="text-gray-300 text-sm mt-3 whitespace-pre-wrap">
                    {playback.lesson.description}
                  </p>
                ) : null}
                <p className="text-xs text-gray-600 mt-3">
                  Downloads are disabled. Your place is saved so you can resume
                  later.
                </p>
                {playError && playback ? (
                  <p className="text-xs text-amber-400 mt-2">{playError}</p>
                ) : null}
              </div>
            </div>

            <aside className="rounded-xl border border-gray-800 bg-gray-900/40 overflow-hidden max-h-[70vh] flex flex-col">
              <div className="px-4 py-3 border-b border-gray-800">
                <h3 className="text-white font-semibold text-sm">Curriculum</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {progressPercent}% complete ·{" "}
                  {completedIds.size}/{flatLessons.length} lessons
                </p>
                <div className="mt-2 h-1.5 rounded-full bg-gray-800 overflow-hidden">
                  <div
                    className="h-full bg-[#FFB70F] transition-all"
                    style={{ width: `${Math.min(100, progressPercent)}%` }}
                  />
                </div>
              </div>
              <ul className="overflow-y-auto flex-1 divide-y divide-gray-800/80">
                {(player?.curriculum || []).map((lv) => {
                  const open = expanded[lv.id] !== false
                  return (
                    <li key={lv.id}>
                      <button
                        type="button"
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-gray-800/50"
                        onClick={() =>
                          setExpanded((p) => ({ ...p, [lv.id]: !open }))
                        }
                      >
                        {open ? (
                          <ChevronDown className="w-3.5 h-3.5 text-[#FFB70F]" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
                        )}
                        <span className="text-sm text-white font-medium truncate flex-1">
                          {lv.title}
                        </span>
                      </button>
                      {open ? (
                        <ul className="pb-1">
                          {(lv.lessons || []).map((les) => {
                            const active = les.id === activeLessonId
                            const done = completedIds.has(les.id)
                            return (
                              <li key={les.id}>
                                <button
                                  type="button"
                                  onClick={() => selectLesson(les)}
                                  className={`w-full flex items-center gap-2 pl-8 pr-3 py-2 text-left text-sm ${
                                    active
                                      ? "bg-[#FFB70F]/10 text-[#FFB70F]"
                                      : "text-gray-300 hover:bg-gray-800/40"
                                  }`}
                                >
                                  {done ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-green-500" />
                                  ) : les.can_play ? (
                                    <PlayCircle className="w-3.5 h-3.5 shrink-0 opacity-70" />
                                  ) : (
                                    <Lock className="w-3.5 h-3.5 shrink-0 text-gray-600" />
                                  )}
                                  <span className="flex-1 truncate">
                                    {les.title}
                                    {les.is_preview ? (
                                      <span className="ml-1 text-[10px] text-[#FFB70F]">
                                        Preview
                                      </span>
                                    ) : null}
                                  </span>
                                  {formatDuration(les.duration_seconds) ? (
                                    <span className="text-[10px] text-gray-500 shrink-0">
                                      {formatDuration(les.duration_seconds)}
                                    </span>
                                  ) : null}
                                </button>
                              </li>
                            )
                          })}
                        </ul>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
              {!player?.entitled ? (
                <div className="p-3 border-t border-gray-800">
                  <Button
                    asChild
                    className="w-full bg-[#FFB70F] text-black hover:bg-[#e0a00d] text-sm"
                  >
                    <Link href={`/online-learning/${slug}`}>
                      Unlock full course
                    </Link>
                  </Button>
                </div>
              ) : null}
            </aside>
          </div>
        )}
      </div>
    </main>
  )
}
