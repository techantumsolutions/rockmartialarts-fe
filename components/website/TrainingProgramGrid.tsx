"use client"

import { useCallback, useEffect, useState } from "react"
import useEmblaCarousel from "embla-carousel-react"
import type { CampTrainingCard } from "@/lib/residentialCamp"
import { trainingCardDescription, trainingCardImage } from "@/lib/residentialCamp"
import { resolvePublicAssetUrl } from "@/lib/resolvePublicAssetUrl"

type VisibleSlots = 1 | 2 | 6

function useTrainingVisibleSlots(): VisibleSlots {
  const [slots, setSlots] = useState<VisibleSlots>(6)

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth
      if (w < 640) setSlots(1)
      else if (w < 1100) setSlots(2)
      else setSlots(6)
    }
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  return slots
}

function Chevron({ dir }: { dir: "prev" | "next" }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      {dir === "prev" ? (
        <path
          d="M11.5 3.5L6 9l5.5 5.5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <path
          d="M6.5 3.5L12 9l-5.5 5.5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  )
}

function TrainingCard({ card, index }: { card: CampTrainingCard; index: number }) {
  const raw = trainingCardImage(card, index)
  const src = raw ? resolvePublicAssetUrl(raw) || raw : ""
  const description = trainingCardDescription(card)
  return (
    <article className="training-program-card">
      {src ? (
        <div className="training-program-card-media">
          <img src={src} alt="" />
        </div>
      ) : null}
      {card.title ? <h3 className="training-program-card-title">{card.title}</h3> : null}
      {description ? <p className="training-program-card-desc">{description}</p> : null}
    </article>
  )
}

function TrainingCarousel({
  cards,
  slots,
}: {
  cards: CampTrainingCard[]
  slots: VisibleSlots
}) {
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

  useEffect(() => {
    emblaApi?.reInit()
  }, [emblaApi, slots, cards.length])

  const slideBasis =
    slots === 6 ? "calc((100% - 60px) / 6)" : slots === 2 ? "calc((100% - 18px) / 2)" : "100%"

  return (
    <div className="training-program-slider">
      <div className="training-program-slider-toolbar">
        <span className="training-program-slider-status">
          {selected + 1} / {snapCount || cards.length}
        </span>
        <div className="training-program-slider-actions">
          <button
            type="button"
            className="training-program-slider-arrow"
            aria-label="Previous training cards"
            disabled={!canPrev}
            onClick={() => emblaApi?.scrollPrev()}
          >
            <Chevron dir="prev" />
          </button>
          <button
            type="button"
            className="training-program-slider-arrow"
            aria-label="Next training cards"
            disabled={!canNext}
            onClick={() => emblaApi?.scrollNext()}
          >
            <Chevron dir="next" />
          </button>
        </div>
      </div>
      <div className="training-program-slider-viewport" ref={emblaRef}>
        <div className="training-program-slider-track">
          {cards.map((card, i) => (
            <div
              className="training-program-slider-slide"
              key={`${card.title}-${i}`}
              style={{ flex: `0 0 ${slideBasis}` }}
            >
              <TrainingCard card={card} index={i} />
            </div>
          ))}
        </div>
      </div>
      {snapCount > 1 ? (
        <div className="training-program-slider-dots" role="tablist" aria-label="Training slides">
          {Array.from({ length: snapCount }, (_, i) => (
            <button
              key={i}
              type="button"
              className={`training-program-slider-dot${i === selected ? " is-active" : ""}`}
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

export function TrainingProgramGrid({ cards }: { cards: CampTrainingCard[] }) {
  const slots = useTrainingVisibleSlots()
  if (!cards.length) return null

  if (cards.length <= slots) {
    return (
      <div
        className={`training-program-grid training-program-grid-${slots}`}
      >
        {cards.map((card, i) => (
          <TrainingCard card={card} index={i} key={`${card.title}-${i}`} />
        ))}
      </div>
    )
  }

  return <TrainingCarousel cards={cards} slots={slots} />
}
