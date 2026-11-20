"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { X } from "lucide-react"
import {
  studentPromotionAPI,
  type StudentPromotion,
} from "@/lib/studentPromotionAPI"
import { TokenManager } from "@/lib/tokenManager"
import { StudentPromoPopupCard } from "@/components/promotions/StudentPromoPopupCard"
import {
  STUDENT_PROMO_LOGIN_QUERY,
  clearStudentPromoPendingAfterLogin,
  peekStudentPromoPendingAfterLogin,
} from "@/lib/studentPromoLoginFlag"

/**
 * Shows eligible promotion only right after a successful student login.
 * Detects sessionStorage flag and/or ?login_promo=1. Refresh without those will not re-open.
 */
export default function StudentPromotionPopup() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [promo, setPromo] = useState<StudentPromotion | null>(null)
  const [open, setOpen] = useState(false)
  const viewedRef = useRef<string | null>(null)
  const loadingRef = useRef(false)
  const doneRef = useRef(false)

  const stripLoginPromoQuery = useCallback(() => {
    if (typeof window === "undefined") return
    const url = new URL(window.location.href)
    if (!url.searchParams.has(STUDENT_PROMO_LOGIN_QUERY)) return
    url.searchParams.delete(STUDENT_PROMO_LOGIN_QUERY)
    const next = `${url.pathname}${url.search}${url.hash}`
    router.replace(next, { scroll: false })
  }, [router])

  const loadAfterLogin = useCallback(async () => {
    if (loadingRef.current || doneRef.current) return
    if (typeof window === "undefined") return

    const fromQuery = searchParams?.get(STUDENT_PROMO_LOGIN_QUERY) === "1"
    const fromFlag = peekStudentPromoPendingAfterLogin()
    if (!fromQuery && !fromFlag) return

    // Wait briefly for token to be readable after soft navigations
    if (!TokenManager.isAuthenticated()) return

    const role = String(TokenManager.getUser()?.role || "")
      .toLowerCase()
      .replace(/-/g, "_")
    if (role && role !== "student") {
      clearStudentPromoPendingAfterLogin()
      doneRef.current = true
      stripLoginPromoQuery()
      return
    }

    if (
      pathname?.includes("/payment-success") ||
      (pathname?.includes("/syllabus/") && pathname?.includes("/view"))
    ) {
      return
    }

    loadingRef.current = true
    clearStudentPromoPendingAfterLogin()
    stripLoginPromoQuery()

    try {
      // Every login should surface a live promo; Close/Skip only ends this login's display
      const data = await studentPromotionAPI.myEligible({
        exclude_dismissed: false,
        limit: 5,
      })
      const next = (data.promotions || []).find((p) => p.id) || null
      doneRef.current = true
      if (!next?.id) {
        setPromo(null)
        setOpen(false)
        return
      }
      setPromo(next)
      setOpen(true)
    } catch (err) {
      console.warn("[StudentPromotionPopup] eligible fetch failed", err)
      // Allow one more retry on next effect if query/flag somehow remains
    } finally {
      loadingRef.current = false
    }
  }, [pathname, searchParams, stripLoginPromoQuery])

  useEffect(() => {
    let cancelled = false
    let attempts = 0
    const maxAttempts = 8

    const tick = () => {
      if (cancelled || doneRef.current) return
      attempts += 1
      void loadAfterLogin().then(() => {
        if (cancelled || doneRef.current) return
        const stillPending =
          peekStudentPromoPendingAfterLogin() ||
          searchParams?.get(STUDENT_PROMO_LOGIN_QUERY) === "1"
        if (stillPending && attempts < maxAttempts) {
          window.setTimeout(tick, 350)
        }
      })
    }

    const t = window.setTimeout(tick, 250)
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [loadAfterLogin, searchParams])

  useEffect(() => {
    if (!open || !promo?.id) return
    if (viewedRef.current === promo.id) return
    viewedRef.current = promo.id
    void studentPromotionAPI
      .recordMyEvent({
        promotion_id: promo.id,
        event_type: "view",
        meta: { path: pathname || "/student-dashboard" },
      })
      .catch(() => {})
  }, [open, promo?.id, pathname])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    document.documentElement.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
      document.documentElement.style.overflow = ""
    }
  }, [open])

  const handleSkip = () => {
    setOpen(false)
    setPromo(null)
  }

  const handleClose = async () => {
    setOpen(false)
    const id = promo?.id
    setPromo(null)
    if (!id) return
    try {
      await studentPromotionAPI.recordMyEvent({
        promotion_id: id,
        event_type: "dismiss",
      })
    } catch {
      /* ignore */
    }
  }

  const handleCta = async () => {
    if (!promo?.id) return
    const ctaType = promo.cta_type || "none"
    const ctaUrl = (promo.cta_url || "").trim()
    const id = promo.id
    try {
      await studentPromotionAPI.recordMyEvent({
        promotion_id: id,
        event_type: "cta",
        meta: { cta_type: ctaType, cta_url: ctaUrl },
      })
    } catch {
      /* still navigate */
    }
    setOpen(false)
    setPromo(null)
    try {
      await studentPromotionAPI.recordMyEvent({
        promotion_id: id,
        event_type: "dismiss",
      })
    } catch {
      /* ignore */
    }
    if (ctaType === "path" && ctaUrl) {
      router.push(ctaUrl.startsWith("/") ? ctaUrl : `/${ctaUrl}`)
    } else if (ctaType === "url" && ctaUrl) {
      window.open(ctaUrl, "_blank", "noopener,noreferrer")
    }
  }

  if (!promo || !open) return null

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={promo.title || "Promotion"}
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-[#0f172a]/55 backdrop-blur-[3px]"
        aria-label="Close overlay"
        onClick={handleSkip}
      />

      <div
        className="relative z-[1] flex max-h-[80vh] max-w-[80vw] flex-col overflow-hidden rounded-[1.25rem] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.32)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-white transition hover:bg-black/50 sm:right-4 sm:top-4"
          onClick={() => void handleClose()}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <StudentPromoPopupCard
          title={promo.title}
          short_description={promo.short_description}
          description={promo.description}
          banner_url={promo.banner_url}
          banner_media_type={promo.banner_media_type}
          cta_type={promo.cta_type}
          cta_label={promo.cta_label}
          cta_url={promo.cta_url}
          onCta={() => void handleCta()}
          onMaybeLater={handleSkip}
        />
      </div>
    </div>
  )
}
