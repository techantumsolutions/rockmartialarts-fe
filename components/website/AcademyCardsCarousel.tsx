"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import useEmblaCarousel from "embla-carousel-react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useEmblaAutoplay } from "@/lib/emblaAutoplay"
import {
  NearbyAcademyCard,
  type NearbyAcademyCardData,
} from "@/components/website/NearbyAcademyCard"
import type { BranchDistanceResult } from "@/lib/branchDistance"

type VisibleSlots = 1 | 2 | 4

function useVisibleSlots(): VisibleSlots {
  const [slots, setSlots] = useState<VisibleSlots>(4)
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth
      if (w < 640) setSlots(1)
      else if (w < 1024) setSlots(2)
      else setSlots(4)
    }
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])
  return slots
}

type DistanceMap = Record<string, BranchDistanceResult | undefined>

type Props = {
  academies: NearbyAcademyCardData[]
  distances?: DistanceMap
  distanceLoading?: boolean
  nearestBranchId?: string | null
  viewAllHref?: string
  viewAllLabel?: string
  /** When false, hide the bottom CTA (header link may still show). Default true. */
  showViewAllButton?: boolean
}

/**
 * Shows up to 4 academy cards. Extra cards scroll in an autoplaying carousel with arrows.
 */
export function AcademyCardsCarousel({
  academies,
  distances = {},
  distanceLoading = false,
  nearestBranchId = null,
  viewAllHref = "/branches",
  viewAllLabel = "Show All Academies",
  showViewAllButton = true,
}: Props) {
  const slots = useVisibleSlots()
  const autoplay = useEmblaAutoplay({ delay: 4500 })
  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      align: "start",
      loop: academies.length > slots,
      containScroll: "trimSnaps",
      slidesToScroll: 1,
    },
    academies.length > slots ? [autoplay] : []
  )
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setCanPrev(emblaApi.canScrollPrev())
    setCanNext(emblaApi.canScrollNext())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    onSelect()
    emblaApi.on("select", onSelect)
    emblaApi.on("reInit", onSelect)
    return () => {
      emblaApi.off("select", onSelect)
      emblaApi.off("reInit", onSelect)
    }
  }, [emblaApi, onSelect])

  useEffect(() => {
    emblaApi?.reInit()
  }, [emblaApi, slots, academies.length])

  if (!academies.length) return null

  const useCarousel = academies.length > slots
  const gap = 20
  const slideBasis =
    slots === 4
      ? `calc((100% - ${gap * 3}px) / 4)`
      : slots === 2
        ? `calc((100% - ${gap}px) / 2)`
        : "100%"

  const cards = academies.map((b) => (
    <NearbyAcademyCard
      key={b.id}
      branch={b}
      distance={distances[b.id]}
      distanceLoading={distanceLoading && !distances[b.id]?.distance_label}
      isNearest={nearestBranchId === b.id}
    />
  ))

  return (
    <div className="space-y-8">
      {useCarousel ? (
        <div className="relative">
          <div className="mb-4 flex items-center justify-end gap-2">
            <button
              type="button"
              data-no-overlay
              aria-label="Previous academies"
              disabled={!canPrev && !emblaApi?.canScrollPrev()}
              onClick={() => emblaApi?.scrollPrev()}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#FFB70F] text-[#FFB70F] transition hover:bg-[#FFB70F] hover:text-[#171A26] disabled:cursor-not-allowed disabled:opacity-35"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              data-no-overlay
              aria-label="Next academies"
              disabled={!canNext && !emblaApi?.canScrollNext()}
              onClick={() => emblaApi?.scrollNext()}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#FFB70F] text-[#FFB70F] transition hover:bg-[#FFB70F] hover:text-[#171A26] disabled:cursor-not-allowed disabled:opacity-35"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex" style={{ gap }}>
              {academies.map((b) => (
                <div
                  key={b.id}
                  className="min-w-0"
                  style={{ flex: `0 0 ${slideBasis}` }}
                >
                  <NearbyAcademyCard
                    branch={b}
                    distance={distances[b.id]}
                    distanceLoading={
                      distanceLoading && !distances[b.id]?.distance_label
                    }
                    isNearest={nearestBranchId === b.id}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div
          className={
            slots === 4
              ? "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 md:gap-6"
              : slots === 2
                ? "grid grid-cols-1 gap-5 sm:grid-cols-2 md:gap-6"
                : "grid grid-cols-1 gap-5"
          }
        >
          {cards}
        </div>
      )}

      {showViewAllButton && viewAllHref ? (
        <div className="flex justify-center pt-1">
          <Link
            href={viewAllHref}
            className="inline-flex items-center justify-center rounded-xl border-2 border-[#FFB70F] bg-transparent px-7 py-3 text-sm font-bold uppercase tracking-wide text-[#FFB70F] transition hover:bg-[#FFB70F] hover:text-[#171A26]"
          >
            {viewAllLabel}
          </Link>
        </div>
      ) : null}
    </div>
  )
}
