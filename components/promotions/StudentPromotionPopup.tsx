"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { ExternalLink } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  studentPromotionAPI,
  type StudentPromotion,
} from "@/lib/studentPromotionAPI"
import { TokenManager } from "@/lib/tokenManager"

const SESSION_KEY = "rma_promo_popup_session_shown"

function sessionAlreadyShown(promotionId: string) {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return false
    const map = JSON.parse(raw) as Record<string, boolean>
    return !!map[promotionId]
  } catch {
    return false
  }
}

function markSessionShown(promotionId: string) {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    const map = raw ? (JSON.parse(raw) as Record<string, boolean>) : {}
    map[promotionId] = true
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(map))
  } catch {
    /* ignore */
  }
}

/**
 * M19-S03 — shows the highest-priority live eligible promotion once per session
 * (until dismissed server-side). Mounted from student-dashboard layout only.
 */
export default function StudentPromotionPopup() {
  const router = useRouter()
  const pathname = usePathname()
  const [promo, setPromo] = useState<StudentPromotion | null>(null)
  const [open, setOpen] = useState(false)
  const viewedRef = useRef<string | null>(null)
  const loadingRef = useRef(false)

  const load = useCallback(async () => {
    if (loadingRef.current) return
    if (!TokenManager.isAuthenticated()) return
    // Avoid competing with payment success / fullscreen flows
    if (
      pathname?.includes("/payment-success") ||
      (pathname?.includes("/syllabus/") && pathname?.includes("/view"))
    ) {
      return
    }
    loadingRef.current = true
    try {
      const data = await studentPromotionAPI.myEligible({
        exclude_dismissed: true,
        limit: 5,
      })
      const list = data.promotions || []
      const next =
        list.find((p) => p.id && !sessionAlreadyShown(p.id)) || null
      if (!next?.id) {
        setPromo(null)
        setOpen(false)
        return
      }
      setPromo(next)
      setOpen(true)
      markSessionShown(next.id)
    } catch {
      /* silent — never block dashboard */
    } finally {
      loadingRef.current = false
    }
  }, [pathname])

  useEffect(() => {
    const t = setTimeout(() => {
      void load()
    }, 800)
    return () => clearTimeout(t)
  }, [load])

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
      .catch(() => {
        /* non-blocking */
      })
  }, [open, promo?.id, pathname])

  const handleDismiss = async () => {
    setOpen(false)
    if (!promo?.id) return
    try {
      await studentPromotionAPI.recordMyEvent({
        promotion_id: promo.id,
        event_type: "dismiss",
      })
    } catch {
      /* ignore */
    }
    setPromo(null)
  }

  const handleCta = async () => {
    if (!promo?.id) return
    const ctaType = promo.cta_type || "none"
    const ctaUrl = (promo.cta_url || "").trim()
    try {
      await studentPromotionAPI.recordMyEvent({
        promotion_id: promo.id,
        event_type: "cta",
        meta: { cta_type: ctaType, cta_url: ctaUrl },
      })
    } catch {
      /* still navigate */
    }
    setOpen(false)
    // Also dismiss so it does not reappear after CTA
    try {
      await studentPromotionAPI.recordMyEvent({
        promotion_id: promo.id,
        event_type: "dismiss",
      })
    } catch {
      /* ignore */
    }
    if (ctaType === "path" && ctaUrl) {
      const path = ctaUrl.startsWith("/") ? ctaUrl : `/${ctaUrl}`
      router.push(path)
    } else if (ctaType === "url" && ctaUrl) {
      window.open(ctaUrl, "_blank", "noopener,noreferrer")
    }
    setPromo(null)
  }

  if (!promo) return null

  const hasCta =
    (promo.cta_type === "url" || promo.cta_type === "path") &&
    !!(promo.cta_url || "").trim()

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) void handleDismiss()
      }}
    >
      <DialogContent
        className="sm:max-w-md p-0 overflow-hidden gap-0"
        showCloseButton
        aria-describedby="student-promo-desc"
      >
        {promo.banner_url ? (
          <div className="w-full bg-gray-100 max-h-52 overflow-hidden">
            {promo.banner_media_type === "video" ? (
              <video
                src={promo.banner_url}
                className="w-full max-h-52 object-cover"
                controls
                playsInline
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={promo.banner_url}
                alt=""
                className="w-full max-h-52 object-cover"
              />
            )}
          </div>
        ) : null}

        <div className="p-6 space-y-3">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="text-xl text-[#4F5077] pr-6">
              {promo.title}
            </DialogTitle>
            {(promo.short_description || promo.description) && (
              <DialogDescription
                id="student-promo-desc"
                className="text-sm text-gray-600 whitespace-pre-line"
              >
                {promo.short_description || promo.description}
              </DialogDescription>
            )}
          </DialogHeader>

          {promo.short_description && promo.description ? (
            <p className="text-sm text-gray-500 whitespace-pre-line line-clamp-4">
              {promo.description}
            </p>
          ) : null}

          <DialogFooter className="flex-col sm:flex-col gap-2 pt-2">
            {hasCta ? (
              <Button
                className="w-full gap-2 bg-[#FFB70F] hover:bg-[#e0a00d] text-black"
                onClick={() => void handleCta()}
              >
                {promo.cta_label || "Learn more"}
                {promo.cta_type === "url" ? (
                  <ExternalLink className="w-4 h-4" />
                ) : null}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              className="w-full text-gray-600"
              onClick={() => void handleDismiss()}
            >
              Maybe later
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
