"use client"

import { useEffect, useRef, useState } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { MapPin, Calendar } from "lucide-react"
import { useCMS } from "@/contexts/CMSContext"
import { resolvePopupForm } from "@/lib/popupForm"
import { resolvePublicAssetUrl } from "@/lib/resolvePublicAssetUrl"
import {
  type CampaignPopup,
  fetchActiveCampaignPopup,
} from "@/lib/campaignPopupAPI"

const LEAD_STORAGE_KEY = "rock_lead_captured"

function dismissKey(id: string) {
  return `rock_campaign_popup_dismissed_${id}`
}

function isLeadGateClear(leadEnabled: boolean): boolean {
  if (typeof window === "undefined") return false
  if (!leadEnabled) return true
  return Boolean(window.localStorage.getItem(LEAD_STORAGE_KEY))
}

function formatDateRange(start?: string, end?: string): string {
  const s = (start || "").slice(0, 10)
  const e = (end || "").slice(0, 10)
  if (!s && !e) return ""
  if (s && e && s !== e) return `${s} – ${e}`
  return s || e
}

export function CampaignPopupModal() {
  const { cms, loading: cmsLoading } = useCMS()
  const lead = resolvePopupForm(cms?.homepage?.popup_form)

  const [popup, setPopup] = useState<CampaignPopup | null>(null)
  const [open, setOpen] = useState(false)
  const startedRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (cmsLoading) return
    if (startedRef.current) return

    const clearTimers = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }

    const scheduleShow = (item: CampaignPopup) => {
      if (typeof window !== "undefined" && window.localStorage.getItem(dismissKey(item.id))) {
        return
      }
      setPopup(item)
      // Lead disabled → show immediately; lead enabled → honor CMS delay_minutes
      const delayMs = !lead.enabled
        ? 0
        : Math.max(0, (item.delay_minutes ?? 1) * 60 * 1000)
      timerRef.current = setTimeout(() => {
        // Re-check lead gate in case user still somehow has lead open somehow
        if (!isLeadGateClear(lead.enabled)) return
        if (typeof window !== "undefined" && window.localStorage.getItem(dismissKey(item.id))) {
          return
        }
        setOpen(true)
      }, delayMs)
    }

    const beginAfterLead = async () => {
      startedRef.current = true
      clearTimers()
      try {
        const active = await fetchActiveCampaignPopup()
        if (!active?.id) return
        scheduleShow(active)
      } catch {
        // ignore network errors — no campaign popup
      }
    }

    if (isLeadGateClear(lead.enabled)) {
      void beginAfterLead()
      return () => clearTimers()
    }

    // Lead owns the screen — poll until captured/skipped, then start campaign delay.
    pollRef.current = setInterval(() => {
      if (isLeadGateClear(lead.enabled)) {
        if (pollRef.current) {
          clearInterval(pollRef.current)
          pollRef.current = null
        }
        void beginAfterLead()
      }
    }, 1000)

    return () => clearTimers()
  }, [cmsLoading, lead.enabled])

  const handleClose = (next: boolean) => {
    if (next) {
      setOpen(true)
      return
    }
    setOpen(false)
    if (popup?.id && typeof window !== "undefined") {
      window.localStorage.setItem(dismissKey(popup.id), "1")
    }
  }

  const imageSrc = popup?.image_url ? resolvePublicAssetUrl(popup.image_url) : ""
  const ctaLabel = (popup?.cta_label || "").trim() || "Learn more"
  const ctaUrl = (popup?.cta_url || "").trim()
  const dateLabel = formatDateRange(popup?.start_date, popup?.end_date)
  const location = (popup?.location || "").trim()

  const onCta = () => {
    if (!ctaUrl) return
    const external = /^https?:\/\//i.test(ctaUrl)
    if (external) {
      window.open(ctaUrl, "_blank", "noopener,noreferrer")
    } else {
      window.location.href = ctaUrl
    }
    handleClose(false)
  }

  if (!popup) return null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-md p-0 overflow-hidden gap-0 border-0 bg-[#171A26] text-white sm:rounded-xl"
        closeButtonClassName="top-3 right-3 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-yellow-400 text-white opacity-100 shadow-md ring-offset-[#171A26] hover:bg-yellow-500 hover:opacity-100 focus:ring-yellow-400 data-[state=open]:bg-yellow-400 data-[state=open]:text-white [&_svg:not([class*='size-'])]:size-4"
      >
        <DialogTitle className="sr-only">{popup.event_title}</DialogTitle>
        {imageSrc ? (
          <div className="relative w-full aspect-[16/10] bg-black/40">
            <img src={imageSrc} alt="" className="absolute inset-0 w-full h-full object-cover" />
          </div>
        ) : null}
        <div className="p-5 space-y-3">
          <h2 className="text-xl font-bold text-[#FFB70F] leading-snug">{popup.event_title}</h2>
          {(popup.description || "").trim() ? (
            <p className="text-sm text-gray-300 leading-relaxed">{popup.description}</p>
          ) : null}
          <div className="flex flex-col gap-1.5 text-sm text-gray-400">
            {dateLabel ? (
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 shrink-0 text-[#FFB70F]" />
                {dateLabel}
              </span>
            ) : null}
            {location ? (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 shrink-0 text-[#FFB70F]" />
                {location}
              </span>
            ) : null}
          </div>
          {ctaUrl ? (
            <Button
              type="button"
              onClick={onCta}
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-[#4F5077] font-semibold"
            >
              {ctaLabel}
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
