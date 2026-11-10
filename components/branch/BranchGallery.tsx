"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { BranchData } from "./types"

interface BranchGalleryProps {
  branch: BranchData
}

/**
 * Image gallery with responsive grid and lightbox on click.
 */
export function BranchGallery({ branch }: BranchGalleryProps) {
  const gallery =
    (branch as BranchData & { gallery_images?: string[] }).gallery_images ?? []
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  if (gallery.length === 0) {
    return (
      <section className="py-16 md:py-20 relative z-10">
        <div className="container mx-auto px-4 max-w-7xl">
          <h2 className="text-3xl md:text-4xl font-bold text-[#FFB70F] mb-8 text-center">
            Gallery
          </h2>
          <p className="text-gray-400 text-center">No gallery images yet.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="py-16 md:py-20 relative z-10">
      <div className="container mx-auto px-4 max-w-7xl">
        <h2
          className="text-3xl md:text-4xl font-bold text-[#FFB70F] mb-10 text-center"
          data-aos="fade-up"
          data-aos-duration="600"
          data-aos-once="true"
        >
          Gallery
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {gallery.map((src, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setLightboxIndex(i)}
              className="aspect-square rounded-lg overflow-hidden border border-gray-800 hover:border-[#FFB70F] transition-all duration-300 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-[#FFB70F]"
              data-aos="zoom-in"
              data-aos-duration="500"
              data-aos-once="true"
              data-aos-delay={i * 80}
            >
              <img
                src={src}
                alt={`Gallery ${i + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxIndex(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Image gallery"
        >
          <button
            type="button"
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 p-2 text-white hover:bg-white/10 rounded-full transition-colors"
            aria-label="Close"
          >
            <X className="w-8 h-8" />
          </button>
          <img
            src={gallery[lightboxIndex]}
            alt={`Gallery ${lightboxIndex + 1}`}
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </section>
  )
}
