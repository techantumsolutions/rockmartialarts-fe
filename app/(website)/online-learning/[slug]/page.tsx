"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { useParams } from "next/navigation"
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Globe,
  Loader2,
  Layers,
  PlayCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { SafeImage } from "@/components/ui/safe-image"
import {
  formatDuration,
  learningCourseAPI,
  type LearningCourse,
  type LearningLevel,
} from "@/lib/learningCourseAPI"
import {
  formatInr,
  learningPlanKindLabel,
  learningSubscriptionAPI,
  type LearningSubscriptionPlan,
} from "@/lib/learningSubscriptionAPI"
import { openRazorpayCheckout } from "@/lib/razorpay"
import { TokenManager } from "@/lib/tokenManager"

function CurriculumOutline({
  curriculum,
  slug,
  entitled,
}: {
  curriculum: LearningLevel[]
  slug: string
  entitled: boolean
}) {
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    curriculum.forEach((lv, i) => {
      init[lv.id] = i === 0
    })
    return init
  })

  if (!curriculum.length) {
    return (
      <p className="text-sm text-gray-400">
        Curriculum outline will appear once levels and lessons are published.
      </p>
    )
  }

  return (
    <ul className="space-y-2">
      {curriculum.map((lv, i) => {
        const lessons = lv.lessons || []
        const isOpen = open[lv.id] !== false
        return (
          <li
            key={lv.id}
            className="rounded-lg border border-gray-800 bg-gray-950/40 overflow-hidden"
          >
            <button
              type="button"
              className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-gray-900/60 transition-colors"
              onClick={() =>
                setOpen((p) => ({ ...p, [lv.id]: !isOpen }))
              }
            >
              {isOpen ? (
                <ChevronDown className="w-4 h-4 text-[#FFB70F] shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500 shrink-0" />
              )}
              <span className="flex-1 font-medium text-white">
                <span className="text-gray-500 mr-2">Level {i + 1}.</span>
                {lv.title}
              </span>
              <span className="text-xs text-gray-500 shrink-0">
                {lessons.length} lesson{lessons.length === 1 ? "" : "s"}
              </span>
            </button>
            {isOpen ? (
              <ul className="border-t border-gray-800 divide-y divide-gray-800/80">
                {lessons.length === 0 ? (
                  <li className="px-4 py-2.5 pl-10 text-sm text-gray-500">
                    No published lessons yet.
                  </li>
                ) : (
                  lessons.map((les, li) => {
                    const canOpen = entitled || Boolean(les.is_preview)
                    const inner = (
                      <>
                        <PlayCircle className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                        <span className="flex-1 text-gray-300">
                          <span className="text-gray-600 mr-1.5">{li + 1}.</span>
                          {les.title}
                          {les.is_preview ? (
                            <span className="ml-2 text-xs text-[#FFB70F]">
                              Preview
                            </span>
                          ) : null}
                        </span>
                        {formatDuration(les.duration_seconds) ? (
                          <span className="text-xs text-gray-500 shrink-0">
                            {formatDuration(les.duration_seconds)}
                          </span>
                        ) : null}
                        {les.has_video ? (
                          <span className="text-xs text-gray-600 shrink-0">
                            Video
                          </span>
                        ) : null}
                      </>
                    )
                    return (
                      <li key={les.id}>
                        {canOpen ? (
                          <Link
                            href={`/online-learning/${slug}/learn?lesson=${les.id}`}
                            className="flex items-center gap-3 px-4 py-2.5 pl-10 text-sm hover:bg-gray-900/60 transition-colors"
                          >
                            {inner}
                          </Link>
                        ) : (
                          <div className="flex items-center gap-3 px-4 py-2.5 pl-10 text-sm opacity-70">
                            {inner}
                          </div>
                        )}
                      </li>
                    )
                  })
                )}
              </ul>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}

export default function OnlineLearningDetailPage() {
  const params = useParams()
  const slug = String(params?.slug || "")
  const [course, setCourse] = useState<LearningCourse | null>(null)
  const [plans, setPlans] = useState<LearningSubscriptionPlan[]>([])
  const [entitled, setEntitled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [payMsg, setPayMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refreshEntitlement = useCallback(async (courseId: string) => {
    if (!TokenManager.getToken() || !TokenManager.isAuthenticated()) {
      setEntitled(false)
      return
    }
    try {
      const me = await learningSubscriptionAPI.getMine(courseId)
      setEntitled(Boolean(me.entitled))
    } catch {
      setEntitled(false)
    }
  }, [])

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    setError(null)
    learningCourseAPI
      .getPublic(slug)
      .then(async (data) => {
        setCourse(data.course)
        if (data.course?.id) {
          try {
            const pl = await learningSubscriptionAPI.listPublicPlans(data.course.id)
            setPlans(pl.plans || [])
          } catch {
            setPlans([])
          }
          await refreshEntitlement(data.course.id)
        }
      })
      .catch((e) => {
        setCourse(null)
        setError(e instanceof Error ? e.message : "Course not found")
      })
      .finally(() => setLoading(false))
  }, [slug, refreshEntitlement])

  const startSubscribe = async (plan: LearningSubscriptionPlan) => {
    setPayMsg(null)
    if (!TokenManager.getToken() || !TokenManager.isAuthenticated()) {
      const next = encodeURIComponent(`/online-learning/${slug}`)
      window.location.href = `/login?next=${next}`
      return
    }
    const user = TokenManager.getUser()
    const role = String(user?.role || "").toLowerCase()
    if (role && role !== "student") {
      setPayMsg("Please sign in with a student account to subscribe.")
      return
    }

    setPaying(true)
    try {
      const checkoutRes = await learningSubscriptionAPI.checkout(plan.id)
      if (checkoutRes.activated) {
        setPayMsg("Access activated.")
        setEntitled(true)
        setPaying(false)
        return
      }
      if (!checkoutRes.order?.id) {
        throw new Error("Could not create payment order")
      }
      await openRazorpayCheckout({
        amountPaise: checkoutRes.order.amount,
        razorpayKeyId: checkoutRes.key || undefined,
        orderId: checkoutRes.order.id,
        currency: checkoutRes.order.currency || "INR",
        name: "Rock Martial Arts",
        description: `${plan.name} — ${course?.title || "Online course"}`,
        customerName: user?.full_name,
        customerEmail: user?.email,
        onSuccess: async (response) => {
          try {
            await learningSubscriptionAPI.verifyPayment({
              subscription_id: checkoutRes.subscription_id,
              razorpay_order_id:
                response.razorpay_order_id || checkoutRes.order!.id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature || "",
            })
            setEntitled(true)
            setPayMsg("Payment successful — you now have access.")
          } catch (err) {
            setPayMsg(
              err instanceof Error ? err.message : "Payment verification failed"
            )
          } finally {
            setPaying(false)
          }
        },
        onDismiss: () => {
          setPaying(false)
          setPayMsg("Payment cancelled. You can try again anytime.")
        },
        onPaymentFailure: (message) => {
          setPaying(false)
          setPayMsg(message || "Payment failed. Please try again.")
        },
      })
    } catch (e) {
      setPaying(false)
      setPayMsg(e instanceof Error ? e.message : "Could not start checkout")
    }
  }

  return (
    <main className="min-h-screen bg-[#171A26]">
      <section
        className="relative py-16 md:py-24 bg-cover bg-center"
        style={{ backgroundImage: "url(/assets/img/banner.jpg)" }}
      >
        <div className="absolute inset-0 bg-black/60" />
        <div className="container relative z-10 mx-auto px-4 max-w-7xl">
          <Link
            href="/online-learning"
            className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-[#FFB70F] mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            All online courses
          </Link>
          {loading ? (
            <Loader2 className="w-8 h-8 animate-spin text-[#FFB70F]" />
          ) : course ? (
            <div className="max-w-3xl">
              <h1 className="text-3xl md:text-5xl font-bold text-white uppercase mb-3">
                {course.title}
              </h1>
              {course.short_description ? (
                <p className="text-gray-200 text-lg">{course.short_description}</p>
              ) : null}
            </div>
          ) : (
            <p className="text-red-300">{error || "Course not found"}</p>
          )}
        </div>
      </section>

      <section className="py-12 md:py-16 bg-[#171A26]">
        <div className="container mx-auto px-4 max-w-7xl">
          {loading ? null : !course ? (
            <div className="text-center text-gray-400">
              <Button asChild className="bg-[#FFB70F] text-black hover:bg-[#e0a00d]">
                <Link href="/online-learning">Back to catalogue</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              <div className="lg:col-span-2 space-y-6">
                <div className="aspect-video rounded-xl overflow-hidden border border-gray-800 bg-gray-900">
                  {course.trailer_url ? (
                    <iframe
                      src={course.trailer_url}
                      title={`${course.title} trailer`}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <SafeImage
                      src={course.thumbnail_url || undefined}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white mb-3">About this course</h2>
                  <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {course.description ||
                      course.short_description ||
                      "Course details will be added soon."}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-5">
                  <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#FFB70F]" />
                    Curriculum
                  </h3>
                  <CurriculumOutline
                    curriculum={course.curriculum || []}
                    slug={course.slug || slug}
                    entitled={entitled}
                  />
                </div>
              </div>

              <aside className="space-y-4">
                <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5 space-y-3">
                  {course.difficulty ? (
                    <p className="text-sm text-gray-300">
                      <span className="text-gray-500">Level: </span>
                      {course.difficulty}
                    </p>
                  ) : null}
                  {course.language ? (
                    <p className="text-sm text-gray-300 flex items-center gap-2">
                      <Globe className="w-4 h-4 text-gray-500" />
                      {course.language}
                    </p>
                  ) : null}
                  {course.estimated_hours != null ? (
                    <p className="text-sm text-gray-300 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      ~{course.estimated_hours} hours
                    </p>
                  ) : null}
                  {course.levels_count || course.lessons_count ? (
                    <p className="text-sm text-gray-400">
                      {course.levels_count || 0} levels · {course.lessons_count || 0}{" "}
                      lessons
                    </p>
                  ) : null}

                  {entitled ? (
                    <div className="rounded-lg border border-green-800/60 bg-green-950/40 px-3 py-3 space-y-3">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm text-green-200 font-medium">
                            You have access
                          </p>
                          <p className="text-xs text-green-300/80 mt-0.5">
                            Watch lessons in the secure player (downloads disabled).
                          </p>
                        </div>
                      </div>
                      <Button
                        asChild
                        className="w-full bg-[#FFB70F] hover:bg-[#e0a00d] text-black"
                      >
                        <Link href={`/online-learning/${course.slug || slug}/learn`}>
                          Open lesson player
                        </Link>
                      </Button>
                    </div>
                  ) : plans.length === 0 ? (
                    <p className="text-xs text-gray-500 text-center">
                      Subscription plans will appear here when published by admin.
                    </p>
                  ) : (
                    <div className="space-y-3 pt-1">
                      <p className="text-sm font-medium text-white">Choose a plan</p>
                      {plans.map((p) => (
                        <div
                          key={p.id}
                          className="rounded-lg border border-gray-700 bg-gray-950/50 p-3 space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-white">
                                {p.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {learningPlanKindLabel(p.plan_kind)}
                                {p.is_lifetime
                                  ? " · Lifetime"
                                  : ` · ${p.duration_days} days`}
                              </p>
                            </div>
                            <p className="text-[#FFB70F] font-bold shrink-0">
                              {formatInr(p.fee_inr)}
                            </p>
                          </div>
                          {p.description ? (
                            <p className="text-xs text-gray-400 line-clamp-2">
                              {p.description}
                            </p>
                          ) : null}
                          <Button
                            type="button"
                            disabled={paying}
                            className="w-full bg-[#FFB70F] hover:bg-[#e0a00d] text-black"
                            onClick={() => void startSubscribe(p)}
                          >
                            {paying ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : null}
                            {p.fee_inr <= 0 ? "Get free access" : "Subscribe"}
                          </Button>
                        </div>
                      ))}
                      <p className="text-xs text-gray-500 text-center">
                        Student login required. Secure payment via Razorpay.
                      </p>
                    </div>
                  )}

                  {payMsg ? (
                    <p className="text-xs text-center text-gray-300">{payMsg}</p>
                  ) : null}
                </div>
              </aside>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
