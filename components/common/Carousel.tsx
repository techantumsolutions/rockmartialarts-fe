"use client"

import useEmblaCarousel from "embla-carousel-react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useCallback } from "react"

type CarouselProps = {
  children: React.ReactNode[]
  className?: string
  /** Extra vertical padding for shadow / scale */
  slideClassName?: string
}

/**
 * Simple responsive slider (Embla). Use for testimonial strips on home.
 */
export function Carousel({ children, className = "", slideClassName = "" }: CarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    loop: children.length > 1,
    skipSnaps: false,
    dragFree: false,
  })

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi])
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi])

  if (children.length === 0) return null

  return (
    <div className={`relative ${className}`}>
      <div className="relative px-10">
        {children.length > 1 ? (
          <>
            <button
              type="button"
              onClick={scrollPrev}
              className="absolute left-0 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[#FFB70F]/50 bg-[#171A26] text-[#FFB70F] shadow-lg transition-colors hover:bg-[#FFB70F] hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB70F] focus-visible:ring-offset-2 focus-visible:ring-offset-[#171A26]"
              aria-label="Previous slide"
              title="Previous slide"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={scrollNext}
              className="absolute right-0 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[#FFB70F]/50 bg-[#171A26] text-[#FFB70F] shadow-lg transition-colors hover:bg-[#FFB70F] hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB70F] focus-visible:ring-offset-2 focus-visible:ring-offset-[#171A26]"
              aria-label="Next slide"
              title="Next slide"
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </>
        ) : null}
        <div className="overflow-hidden py-2" ref={emblaRef}>
          <div className="flex touch-pan-y">
            {children.map((child, i) => (
              <div
                key={i}
                className={`min-w-0 shrink-0 grow-0 flex-[0_0_100%] sm:flex-[0_0_50%] lg:flex-[0_0_33.333%] pl-2 pr-4 box-border ${slideClassName}`}
              >
                {child}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
