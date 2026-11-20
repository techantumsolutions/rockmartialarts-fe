"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import useEmblaCarousel from "embla-carousel-react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { SafeImage } from "@/components/ui/safe-image"
import { useEmblaAutoplay } from "@/lib/emblaAutoplay"

type ClassCard = { id?: string; name: string; img: string; href: string }
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

function Card({ c }: { c: ClassCard }) {
  const router = useRouter()
  const href = (c.href || "/courses").trim() || "/courses"

  return (
    <a
      href={href}
      onClick={(e) => {
        // Force client navigation so Embla drag / overlay never swallows Explore More.
        e.preventDefault()
        router.push(href)
      }}
      className="group flex h-full flex-col rounded-2xl border border-[#383D4D] bg-[#292E40] p-4 shadow-[0_8px_24px_rgba(0,0,0,0.25)] transition-all duration-300 ease-out hover:-translate-y-2 hover:border-[#FFB70F]/50 hover:shadow-[0_18px_40px_rgba(255,183,15,0.18)]"
    >
      <div className="relative mb-4 aspect-[4/3] overflow-hidden rounded-xl border border-[#383D4D]/70 bg-[#222635]">
        <SafeImage
          src={c.img}
          alt={c.name}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
          wrapperClassName="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-110"
        />
      </div>
      <h3 className="mb-4 text-lg font-bold text-white transition-colors duration-300 group-hover:text-[#FFB70F] sm:text-xl">
        {c.name}
      </h3>
      <span className="mt-auto inline-flex items-center justify-center rounded-lg bg-[#FFB70F] px-5 py-2.5 text-sm font-semibold text-[#171A26] transition-all duration-300 ease-out hover:brightness-110 hover:shadow-[0_10px_28px_rgba(255,183,15,0.35)]">
        Explore More
      </span>
    </a>
  )
}

/**
 * Our Training Program / Our Classes — show 4; carousel + arrows + autoscroll when more.
 */
export function ClassCardsCarousel({ cards }: { cards: ClassCard[] }) {
  const slots = useVisibleSlots()
  const autoplay = useEmblaAutoplay({ delay: 4200 })
  const useCarousel = cards.length > slots
  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      align: "start",
      loop: useCarousel,
      containScroll: "trimSnaps",
      slidesToScroll: 1,
    },
    useCarousel ? [autoplay] : []
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
  }, [emblaApi, slots, cards.length])

  if (!cards.length) return null

  const gap = 24
  const slideBasis =
    slots === 4
      ? `calc((100% - ${gap * 3}px) / 4)`
      : slots === 2
        ? `calc((100% - ${gap}px) / 2)`
        : "100%"

  if (!useCarousel) {
    return (
      <div
        className={
          slots === 4
            ? "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 md:gap-8"
            : slots === 2
              ? "grid grid-cols-1 gap-6 sm:grid-cols-2 md:gap-8"
              : "grid grid-cols-1 gap-6"
        }
      >
        {cards.map((c) => (
          <Card key={c.id ?? c.name} c={c} />
        ))}
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="mb-4 flex items-center justify-end gap-2">
        <button
          type="button"
          data-no-overlay
          aria-label="Previous programs"
          disabled={!canPrev}
          onClick={() => emblaApi?.scrollPrev()}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#FFB70F] text-[#FFB70F] transition hover:bg-[#FFB70F] hover:text-[#171A26] disabled:cursor-not-allowed disabled:opacity-35"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          data-no-overlay
          aria-label="Next programs"
          disabled={!canNext}
          onClick={() => emblaApi?.scrollNext()}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#FFB70F] text-[#FFB70F] transition hover:bg-[#FFB70F] hover:text-[#171A26] disabled:cursor-not-allowed disabled:opacity-35"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex" style={{ gap }}>
          {cards.map((c) => (
            <div
              key={c.id ?? c.name}
              className="min-w-0"
              style={{ flex: `0 0 ${slideBasis}` }}
            >
              <Card c={c} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
