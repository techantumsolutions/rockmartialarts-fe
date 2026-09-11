"use client"

import { Children, useCallback, useEffect, useState } from "react"
import useEmblaCarousel from "embla-carousel-react"

export function ResidentialCampCardGrid({ children }: { children: React.ReactNode }) {
  const items = Children.toArray(children)
  if (items.length <= 3) {
    return <div className="grid">{items}</div>
  }
  return <CampCardSlider items={items} />
}

function Chevron({ dir }: { dir: "prev" | "next" }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      {dir === "prev" ? (
        <path d="M11.5 3.5L6 9l5.5 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M6.5 3.5L12 9l-5.5 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  )
}

function CampCardSlider({ items }: { items: ReturnType<typeof Children.toArray> }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    slidesToScroll: 1,
  })
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)
  const [selected, setSelected] = useState(0)
  const [snapCount, setSnapCount] = useState(0)

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setCanPrev(emblaApi.canScrollPrev())
    setCanNext(emblaApi.canScrollNext())
    setSelected(emblaApi.selectedScrollSnap())
    setSnapCount(emblaApi.scrollSnapList().length)
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

  return (
    <div className="card-slider">
      <div className="card-slider-toolbar">
        <span className="card-slider-status">
          {selected + 1} / {snapCount || items.length}
        </span>
        <div className="card-slider-actions">
          <button
            type="button"
            className="card-slider-arrow"
            aria-label="Previous cards"
            disabled={!canPrev}
            onClick={() => emblaApi?.scrollPrev()}
          >
            <Chevron dir="prev" />
          </button>
          <button
            type="button"
            className="card-slider-arrow"
            aria-label="Next cards"
            disabled={!canNext}
            onClick={() => emblaApi?.scrollNext()}
          >
            <Chevron dir="next" />
          </button>
        </div>
      </div>
      <div className="card-slider-viewport" ref={emblaRef}>
        <div className="card-slider-track">
          {items.map((item, i) => (
            <div className="card-slider-slide" key={i}>
              {item}
            </div>
          ))}
        </div>
      </div>
      {snapCount > 1 ? (
        <div className="card-slider-dots" role="tablist" aria-label="Card slides">
          {Array.from({ length: snapCount }, (_, i) => (
            <button
              key={i}
              type="button"
              className={`card-slider-dot${i === selected ? " is-active" : ""}`}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === selected ? "true" : undefined}
              onClick={() => emblaApi?.scrollTo(i)}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
