"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

const categories = [
  { id: "all", label: "All" },
  { id: "uniforms", label: "Uniforms" },
  { id: "sparring-gear", label: "Sparring Gear" },
  { id: "boxing", label: "Boxing" },
  { id: "belts", label: "Belts" },
  { id: "weapons", label: "Training Weapons" },
  { id: "accessories", label: "Accessories" },
]

const products = [
  { name: "Karate uniform", price: "₹ 2500", category: "uniforms", img: "/assets/img/store/img1.png" },
  { name: "Square Blade Kama", price: "₹ 2500", category: "weapons", img: "/assets/img/store/img7.png" },
  { name: "Power Tilt Free Standing Bag", price: "₹ 2500", category: "accessories", img: "/assets/img/store/img10.png" },
  { name: "TKD uniform", price: "₹ 2500", category: "uniforms", img: "/assets/img/store/img3.png" },
  { name: "Kung fu uniform", price: "₹ 2500", category: "uniforms", img: "/assets/img/store/img4.png" },
  { name: "Rattan Bo II Tiger", price: "₹ 2500", category: "weapons", img: "/assets/img/store/img5.png" },
  { name: "Ultra Lite Chest Guard", price: "₹ 2500", category: "accessories", img: "/assets/img/store/img13.png" },
  { name: "Determination Kickboxing Punches", price: "₹ 2500", category: "weapons", img: "/assets/img/store/img6.png" },
  { name: "Course Available Locations", price: "₹ 2500", category: "uniforms", img: "/assets/img/store/img2.png" },
  { name: "Square Blade Kama", price: "₹ 2500", category: "accessories", img: "/assets/img/store/img11.png" },
  { name: "Determination Kickboxing Punches", price: "₹ 2500", category: "boxing", img: "/assets/img/store/img14.png" },
  { name: "Double Wrap Solid Karate Belt", price: "₹ 2500", category: "accessories", img: "/assets/img/store/img15.png" },
  { name: "Uppercut Heavy Bag", price: "₹ 2500", category: "accessories", img: "/assets/img/store/img12.png" },
  { name: "Kick-short", price: "₹ 2500", category: "sparring-gear", img: "/assets/img/store/img16.png" },
  { name: "Practice Speedchuck", price: "₹ 2500", category: "weapons", img: "/assets/img/store/img8.png" },
  { name: "Dragon Samurai Sword", price: "₹ 2500", category: "weapons", img: "/assets/img/store/img9.png" },
]

export default function StorePage() {
  const [filter, setFilter] = useState("all")
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const pillRefs = useRef<(HTMLButtonElement | null)[]>([])

  const currentIndex = categories.findIndex((c) => c.id === filter)

  const centerPill = useCallback((idx: number, smooth = true) => {
    // Feature only active for mobile and tablet screens (< lg / 1024px)
    if (typeof window !== "undefined" && window.innerWidth >= 1024) return

    const container = scrollContainerRef.current
    const pill = pillRefs.current[idx]
    if (!container || !pill) return

    // Most left category: align to the start (left)
    if (idx === 0) {
      container.scrollTo({
        left: 0,
        behavior: smooth ? "smooth" : "auto",
      })
      return
    }

    // Most right category: align to the end (right)
    if (idx === categories.length - 1) {
      container.scrollTo({
        left: container.scrollWidth,
        behavior: smooth ? "smooth" : "auto",
      })
      return
    }

    // All categories in between: center in the middle of the horizontal bar
    const containerRect = container.getBoundingClientRect()
    const pillRect = pill.getBoundingClientRect()
    const containerCenter = containerRect.left + containerRect.width / 2
    const pillCenter = pillRect.left + pillRect.width / 2
    const diff = pillCenter - containerCenter

    if (Math.abs(diff) > 1) {
      container.scrollBy({
        left: diff,
        behavior: smooth ? "smooth" : "auto",
      })
    }
  }, [])

  const handleSelect = (id: string, smooth = true) => {
    setFilter(id)
    const idx = categories.findIndex((c) => c.id === id)
    if (idx !== -1) {
      centerPill(idx, smooth)
    }
  }

  useEffect(() => {
    const idx = categories.findIndex((c) => c.id === filter)
    if (idx !== -1) {
      centerPill(idx, false)
      const timer = setTimeout(() => {
        centerPill(idx, false)
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [filter, centerPill])

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) return
      const idx = categories.findIndex((c) => c.id === filter)
      if (idx !== -1) centerPill(idx, false)
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [filter, centerPill])

  const goToPrev = () => {
    if (currentIndex > 0) {
      handleSelect(categories[currentIndex - 1].id, true)
    }
  }

  const goToNext = () => {
    if (currentIndex < categories.length - 1) {
      handleSelect(categories[currentIndex + 1].id, true)
    }
  }

  const filteredProducts =
    filter === "all"
      ? products
      : products.filter((p) => p.category === filter)

  return (
    <main className="min-h-screen bg-[#171A26]">
      {/* Hero */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        <img
          src="/assets/img/store/slider_img.png"
          alt="Store"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="container relative z-10 mx-auto px-4 max-w-7xl">
          <div className="max-w-xl">
            <h1 className="text-4xl md:text-5xl font-bold text-white uppercase mb-2">Store</h1>
            <h2 className="text-3xl md:text-4xl font-bold text-[#F73322] mb-4">Gear for the Way.</h2>
            <p className="text-gray-200 text-lg">
              Quality training gear and equipment hand-picked by Rock Martial Arts
            </p>
          </div>
        </div>
      </section>

      {/* Filters & Products */}
      <section className="py-16 md:py-20 bg-[#171A26]">
        <div className="container mx-auto px-4 max-w-7xl">
          {/* Desktop View (lg and xl screens): Standard flex-wrap pills without arrows or scrolling */}
          <div className="hidden lg:flex flex-wrap gap-3 mb-10">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setFilter(cat.id)}
                className={`rounded-lg px-5 py-2.5 text-sm font-medium transition-colors ${
                  filter === cat.id
                    ? "bg-[#FFB70F] text-black font-semibold shadow-md shadow-[#FFB70F]/20"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white border border-gray-700/40"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Mobile & Tablet View (below lg: sm and md screens): Arrow navigation with auto-centering */}
          <div className="lg:hidden relative mb-10 max-w-2xl mx-auto">
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Left Arrow Button */}
              <button
                type="button"
                onClick={goToPrev}
                disabled={currentIndex <= 0}
                className="w-10 h-10 shrink-0 flex items-center justify-center rounded-full bg-gray-800 text-gray-200 hover:bg-[#FFB70F] hover:text-black disabled:opacity-20 disabled:pointer-events-none transition-all duration-200 border border-gray-700/60 shadow-md active:scale-95"
                aria-label="Previous category"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              {/* Horizontally Scrollable Pills for sm and md screens */}
              <div
                ref={scrollContainerRef}
                className="flex-1 flex items-center gap-2.5 overflow-x-auto py-2 scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              >
                {categories.map((cat, idx) => {
                  const isSelected = filter === cat.id
                  return (
                    <button
                      key={cat.id}
                      ref={(el) => {
                        pillRefs.current[idx] = el
                      }}
                      onClick={() => handleSelect(cat.id, true)}
                      className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-200 whitespace-nowrap active:scale-95 ${
                        isSelected
                          ? "bg-[#FFB70F] text-black font-semibold shadow-md shadow-[#FFB70F]/20"
                          : "bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white border border-gray-700/40"
                      }`}
                    >
                      {cat.label}
                    </button>
                  )
                })}
              </div>

              {/* Right Arrow Button */}
              <button
                type="button"
                onClick={goToNext}
                disabled={currentIndex >= categories.length - 1}
                className="w-10 h-10 shrink-0 flex items-center justify-center rounded-full bg-gray-800 text-gray-200 hover:bg-[#FFB70F] hover:text-black disabled:opacity-20 disabled:pointer-events-none transition-all duration-200 border border-gray-700/60 shadow-md active:scale-95"
                aria-label="Next category"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {filteredProducts.map((product, i) => (
              <div
                key={`${product.name}-${i}`}
                className="bg-gray-900/50 rounded-xl overflow-hidden border border-gray-800 hover:border-[#FFB70F]/50 transition-colors"
              >
                <div className="aspect-square flex items-center justify-center p-4 bg-gray-900">
                  <img
                    src={product.img}
                    alt={product.name}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                <div className="p-4">
                  <h4 className="font-semibold text-white capitalize mb-1">{product.name}</h4>
                  <p className="text-[#FFB70F] font-medium">{product.price}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
