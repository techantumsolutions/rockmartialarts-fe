"use client"

import { SafeImage } from "@/components/ui/safe-image"
import { resolvePublicAssetUrl } from "@/lib/resolvePublicAssetUrl"
import { sanitizeRichHtmlClient } from "@/lib/sanitizeClientHtml"
import { resolveCmsText } from "@/lib/cmsContentFallback"

export type AboutFounderSectionProps = {
  /** Small gold eyebrow, e.g. ABOUT OUR FOUNDER */
  eyebrow?: string
  title?: string
  subtitle?: string
  /** Plain text or HTML body from CMS */
  contentHtml?: string
  imageUrl?: string
  founderName?: string
  founderTitle?: string
  /** Extra benefit lists when rich HTML is empty (homepage Discover fallback) */
  physicalBenefits?: string[]
  mentalBenefits?: string[]
  className?: string
}

/**
 * Two-column founder / about story — same visual language as the former
 * Home Page Discover section (image left, copy right on desktop).
 */
export function AboutFounderSection({
  eyebrow,
  title,
  subtitle,
  contentHtml = "",
  imageUrl = "",
  founderName,
  founderTitle,
  physicalBenefits = [],
  mentalBenefits = [],
  className = "",
}: AboutFounderSectionProps) {
  const resolvedEyebrow = resolveCmsText(eyebrow, "About Our Founder")
  const resolvedTitle = resolveCmsText(
    title,
    "The Vision Behind Rock Martial Arts Academy"
  )
  const founderLine = [founderName, founderTitle].filter(Boolean).join(" — ")
  const resolvedSubtitle = resolveCmsText(subtitle, founderLine || "")
  const safeHtml = contentHtml.trim()
    ? sanitizeRichHtmlClient(contentHtml)
    : ""
  const img =
    (imageUrl && (resolvePublicAssetUrl(imageUrl) || imageUrl)) ||
    "/assets/img/about-img.png"

  const hasBody =
    Boolean(safeHtml) || physicalBenefits.length > 0 || mentalBenefits.length > 0

  if (!hasBody && !imageUrl && !founderName && !title?.trim()) {
    return (
      <section
        className={`py-14 md:py-20 relative z-10 border-y border-[#383D4D] bg-[#222635]/40 ${className}`}
      >
        <div className="site-content px-0 sm:px-1 max-w-3xl mx-auto text-center">
          <p className="text-[#FFB70F] font-semibold uppercase tracking-[0.2em] text-xs mb-2">
            {resolvedEyebrow}
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-4">
            {resolvedTitle}
          </h2>
          <p className="text-[#AEB4C2] text-sm md:text-base leading-relaxed">
            Learn about the vision and philosophy behind Rock Martial Arts Academy.
            Founder details will appear here when published in CMS.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section
      className={`py-14 md:py-20 relative z-10 border-y border-[#383D4D] bg-[#222635]/40 ${className}`}
    >
      <div className="site-content px-0 sm:px-1">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 items-start lg:items-center">
          <div className="order-1 group overflow-hidden rounded-2xl border border-[#383D4D] bg-[#292E40] shadow-[0_0_24px_2px_rgba(255,183,15,0.16)] transition-all duration-500 ease-out hover:-translate-y-1.5 hover:border-[#FFB70F]/50 hover:shadow-[0_18px_40px_rgba(255,183,15,0.22)]">
            <SafeImage
              src={img}
              alt={founderName || resolvedTitle || "Founder"}
              resolveUrl={false}
              className="w-full h-auto object-cover"
              wrapperClassName="block w-full transition-transform duration-700 ease-out group-hover:scale-105"
            />
          </div>
          <div className="order-2">
            <p className="text-[#FFB70F] font-semibold uppercase tracking-[0.2em] text-xs mb-2">
              {resolvedEyebrow}
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-3">
              {resolvedTitle}
            </h2>
            {resolvedSubtitle ? (
              <p className="text-[#FFB70F] font-semibold text-sm md:text-base mb-5">
                {resolvedSubtitle}
              </p>
            ) : null}
            {safeHtml ? (
              <div
                className="max-w-none text-[#AEB4C2] space-y-4 leading-relaxed [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-[#FFB70F] [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-[#FFB70F] [&_h3]:text-lg [&_h3]:text-[#FFB70F] [&_p]:text-[#AEB4C2] [&_a]:text-[#FFB70F] [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_strong]:text-white"
                dangerouslySetInnerHTML={{ __html: safeHtml }}
              />
            ) : physicalBenefits.length || mentalBenefits.length ? (
              <div className="space-y-6">
                {physicalBenefits.length > 0 ? (
                  <ul className="list-disc list-inside text-[#AEB4C2] space-y-2">
                    {physicalBenefits.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                ) : null}
                {mentalBenefits.length > 0 ? (
                  <div>
                    <h3 className="text-lg font-bold text-[#FFB70F] mb-2">Mental Benefits</h3>
                    <ul className="list-disc list-inside text-[#AEB4C2] space-y-2">
                      {mentalBenefits.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-[#AEB4C2] text-sm md:text-base leading-relaxed">
                Discover our approach to martial arts training, fitness, discipline, and personal
                development.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
