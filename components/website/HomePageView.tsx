"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { sanitizeRichHtmlClient } from "@/lib/sanitizeClientHtml"
import { ScrollZoomContinuous } from "@/components/ScrollZoomContinuous"
import {
  AnimatedSection,
  AnimatedCard,
  AnimatedStaggerGrid,
  FloatingShapes,
  HeroAnimation,
} from "@/components/animations"
import { Carousel } from "@/components/common/Carousel"
import {
  TestimonialCard,
  type TestimonialCardItem,
  ShowcaseAchievementCard,
  type ShowcaseAchievementItem,
} from "@/components/testimonials"
import { SafeImage, DEFAULT_IMAGE_PLACEHOLDER } from "@/components/ui/safe-image"
import { resolvePublicAssetUrl } from "@/lib/resolvePublicAssetUrl"
/* ---------- Types (mirror server data shape; no API change) ---------- */

export interface HomePageViewProps {
  heroTitle: string
  heroSubtitle: string
  heroDescription: string
  heroVideo: string
  heroImage: string
  /** Primary hero CTA — only rendered when text is set in admin CMS */
  heroPrimaryCtaText?: string
  heroPrimaryCtaLink?: string
  /** Secondary hero CTA — only rendered when text is set in admin CMS */
  heroSecondaryCtaText?: string
  heroSecondaryCtaLink?: string
  ctaTitle: string
  ctaSubtitle: string
  bottomCtaTitle: string
  bottomCtaSubtitle: string
  aboutTitle: string
  aboutSubtitle: string
  /** Rich HTML for homepage about (from homepage_content collection). */
  aboutContentHtml?: string
  /** Right-column image for about section. */
  aboutImage?: string
  coursesTitle: string
  coursesSubtitle: string
  testimonialsTitle: string
  testimonialsSubtitle: string
  classCards: { id?: string; name: string; img: string; href: string }[]
  physicalBenefits: string[]
  mentalBenefits: string[]
  trainers: { name: string; role: string; img: string; about?: string; rating?: number | null }[]
  testimonials: { name: string; role: string; quote?: string; image?: string; achievement?: string }[]
  defaultTestimonialQuote: string
  /** Marketing testimonials from MongoDB (`student_testimonials`) */
  showcaseTestimonials?: TestimonialCardItem[]
  /** Marketing achievements from MongoDB (`student_showcase_achievements`) */
  showcaseAchievements?: ShowcaseAchievementItem[]
}

/* ---------- Homepage with Cult.fit-style animations ---------- */

export default function HomePageView({
  heroTitle,
  heroSubtitle,
  heroDescription,
  heroVideo,
  heroImage,
  heroPrimaryCtaText = "",
  heroPrimaryCtaLink = "",
  heroSecondaryCtaText = "",
  heroSecondaryCtaLink = "",
  ctaTitle,
  ctaSubtitle,
  bottomCtaTitle,
  bottomCtaSubtitle,
  aboutTitle,
  aboutSubtitle,
  aboutContentHtml = "",
  aboutImage = "",
  coursesTitle,
  coursesSubtitle,
  testimonialsTitle,
  testimonialsSubtitle,
  classCards,
  physicalBenefits,
  mentalBenefits,
  trainers,
  testimonials,
  defaultTestimonialQuote,
  showcaseTestimonials = [],
  showcaseAchievements = [],
}: HomePageViewProps) {
  const shouldReduceMotion = useReducedMotion()
  const [safeAboutHtml, setSafeAboutHtml] = useState("")

  useEffect(() => {
    setSafeAboutHtml(sanitizeRichHtmlClient(aboutContentHtml || ""))
  }, [aboutContentHtml])

  const resolveUploadUrl = (url?: string): string => resolvePublicAssetUrl(url)

  const resolvedHeroImage = resolveUploadUrl(heroImage)
  const resolvedHeroVideo = resolveUploadUrl(heroVideo)

  const primaryCtaText = heroPrimaryCtaText.trim()
  const secondaryCtaText = heroSecondaryCtaText.trim()
  const primaryHref = heroPrimaryCtaLink.trim() || "#"
  const secondaryHref = heroSecondaryCtaLink.trim() || "#"

  // Hero CTAs: only when created in admin CMS (no hardcoded fallback buttons)
  const heroActions =
    primaryCtaText || secondaryCtaText ? (
      !shouldReduceMotion ? (
        <div className="flex flex-wrap items-center justify-center gap-4">
          {primaryCtaText ? (
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.3, ease: "easeOut" }}>
              <Link
                href={primaryHref}
                className="inline-block rounded-lg bg-[#FFB70F] px-6 py-3.5 text-base font-semibold text-black hover:bg-[#F73322] hover:text-white transition-colors duration-300"
              >
                {primaryCtaText}
              </Link>
            </motion.div>
          ) : null}
          {secondaryCtaText ? (
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.3, ease: "easeOut" }}>
              <Link
                href={secondaryHref}
                className="inline-block rounded-lg border-2 border-white px-6 py-3.5 text-base font-semibold text-white hover:bg-white hover:text-black transition-colors duration-300"
              >
                {secondaryCtaText}
              </Link>
            </motion.div>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-center gap-4 mt-6">
          {primaryCtaText ? (
            <Link href={primaryHref} className="inline-block rounded-lg bg-[#FFB70F] px-6 py-3.5 text-base font-semibold text-black">
              {primaryCtaText}
            </Link>
          ) : null}
          {secondaryCtaText ? (
            <Link href={secondaryHref} className="inline-block rounded-lg border-2 border-white px-6 py-3.5 text-base font-semibold text-white">
              {secondaryCtaText}
            </Link>
          ) : null}
        </div>
      )
    ) : undefined

  return (
    <main className="min-h-screen bg-[#171A26] relative">
      {/* Floating background shapes — slow floating motion */}
      <FloatingShapes className="z-0" />

      {/* Hero: staggered text, media slide-in, CTAs with hover scale */}
      <HeroAnimation
        title={heroTitle.trim() || undefined}
        subtitle={heroSubtitle || undefined}
        description={heroDescription || undefined}
        actions={heroActions}
        media={
          resolvedHeroImage && !heroVideo ? (
            <img
              src={resolvedHeroImage}
              alt="Hero"
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <video
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
              poster={resolvedHeroImage || undefined}
            >
              <source src={resolvedHeroVideo} type="video/mp4" />
            </video>
          )
        }
      />

      {/* Tagline - scroll reveal */}
      <AnimatedSection variant="fadeSlideUp" className="py-16 md:py-20 bg-[#171A26] relative z-10">
        <div className="container mx-auto px-4 max-w-5xl">
          <h1 className="text-center text-white text-xl md:text-2xl lg:text-3xl font-medium">
            {ctaTitle}
          </h1>
          {ctaSubtitle && (
            <p className="text-center text-gray-400 text-lg mt-4">{ctaSubtitle}</p>
          )}
        </div>
      </AnimatedSection>

      {/* Our Classes - Section 3: each card zooms individually (in view = scale 1, scroll past = scale 0) */}
      <section
        id="courses"
        className="py-16 md:py-20 bg-[#171A26] scroll-mt-24 relative z-10"
      >
        <div className="container mx-auto px-4 max-w-7xl">
          <AnimatedSection className="text-center mb-12" variant="fadeSlideUp">
            <div className="w-16 h-1 bg-[#FFB70F] mx-auto mb-4" />
            <p className="text-[#FFB70F] uppercase tracking-widest text-sm mb-2">
              {coursesSubtitle}
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-[#FFB70F]">{coursesTitle}</h2>
          </AnimatedSection>
          <AnimatedStaggerGrid
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8"
            staggerDelay={0.12}
            childClassName="text-center group"
          >
            {classCards.map((c) => (
              <ScrollZoomContinuous key={c.id ?? c.name}>
                <AnimatedCard scrollReveal={false} className="h-full">
                  <div className="mb-4 overflow-hidden rounded-lg aspect-[4/3] bg-gray-800">
                    <img
                      src={c.img}
                      alt={c.name}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <h3 className="text-xl font-bold text-[#FFB70F] mb-4">{c.name}</h3>
                  <Link
                    href={c.href}
                    className="inline-block rounded-lg bg-white px-5 py-3.5 text-base font-medium text-black hover:bg-[#F73322] hover:text-white transition-colors duration-300 hover:scale-105"
                  >
                    Explore More
                  </Link>
                </AnimatedCard>
              </ScrollZoomContinuous>
            ))}
          </AnimatedStaggerGrid>
        </div>
      </section>

      {/* About: image (left); title, subtitle, rich text (right). Mobile: image first. Fallback benefits when no HTML. */}
      <AnimatedSection
        variant="fadeSlideUp"
        className="py-16 md:py-20 bg-[#171A26] relative z-10"
      >
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start lg:items-center">
            <ScrollZoomContinuous>
              <div className="overflow-hidden rounded-lg">
                <img
                  src={
                    aboutImage
                      ? resolveUploadUrl(aboutImage)
                      : "/assets/img/courses/tr_yourself.png"
                  }
                  alt={aboutTitle || "About"}
                  className="w-full h-auto object-cover"
                />
              </div>
            </ScrollZoomContinuous>
            <ScrollZoomContinuous>
              <div>
                <p className="text-[#FFB70F] uppercase tracking-widest text-sm mb-2">Discover</p>
                <h2 className="text-3xl md:text-4xl font-bold text-[#FFB70F] mb-4">{aboutTitle || "About us"}</h2>
                {aboutSubtitle ? <p className="text-gray-300 mb-6">{aboutSubtitle}</p> : null}
                {safeAboutHtml ? (
                  <div
                    className="max-w-none text-gray-300 space-y-4 leading-relaxed [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-[#FFB70F] [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-[#FFB70F] [&_h3]:text-lg [&_h3]:text-[#FFB70F] [&_p]:text-gray-300 [&_a]:text-[#FFB70F] [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_strong]:text-white"
                    dangerouslySetInnerHTML={{ __html: safeAboutHtml }}
                  />
                ) : (
                  <div className="space-y-6">
                    <div className="flex gap-4">
                      <img
                        src="/assets/img/courses/icon1.png"
                        alt=""
                        className="w-12 h-12 flex-shrink-0"
                      />
                      <ul className="list-disc list-inside text-gray-300 space-y-2">
                        {physicalBenefits.map((b) => (
                          <li key={b}>{b}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="flex gap-4 items-center">
                      <img
                        src="/assets/img/courses/icon2.png"
                        alt=""
                        className="w-12 h-12 flex-shrink-0"
                      />
                      <h3 className="text-2xl font-bold text-[#FFB70F]">Mental Benefits</h3>
                    </div>
                    <ul className="list-disc list-inside text-gray-300 space-y-2 ml-16">
                      {mentalBenefits.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </ScrollZoomContinuous>
          </div>
        </div>
      </AnimatedSection>

      {/* Our Expert Masters — up to 8 coaches; desktop 4 / tablet 2 / mobile 1 */}
      <section className="py-16 md:py-20 bg-[#171A26] relative z-10">
        <div className="container mx-auto px-4 max-w-7xl">
          <AnimatedSection className="text-center mb-12" variant="fadeSlideUp">
            <div className="w-16 h-1 bg-[#FFB70F] mx-auto mb-4" />
            <p className="text-[#FFB70F] uppercase tracking-widest text-sm mb-2">Our Members</p>
            <h2 className="text-3xl md:text-4xl font-bold text-[#FFB70F]">Our Expert Masters</h2>
          </AnimatedSection>
          <AnimatedStaggerGrid
            className={
              trainers.length
                ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 md:gap-8 w-full"
                : "grid grid-cols-1 gap-6 w-full"
            }
            staggerDelay={0.12}
            childClassName="h-full w-full"
          >
            {trainers.length === 0 ? (
              <p className="text-center text-gray-500 text-sm col-span-full py-8">
                Coach profiles from admin will appear here. Set display order and photos in Coaches Management.
              </p>
            ) : null}
            {trainers.map((t, idx) => (
              <AnimatedCard key={`${t.name}-${idx}`} scrollReveal={false}>
                <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800 h-full flex flex-col items-center text-center">
                  <div className="w-[180px] h-[340px] max-w-full shrink-0 rounded-lg overflow-hidden border-2 border-[#FFB70F]/40 mb-4 bg-gray-800">
                    <SafeImage
                      src={t.img || DEFAULT_IMAGE_PLACEHOLDER}
                      alt={t.name}
                      loading="lazy"
                      decoding="async"
                      width={180}
                      height={340}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-1 line-clamp-2">{t.name}</h3>
                  <p className="text-[#FFB70F] font-semibold text-sm mb-3 line-clamp-2">{t.role}</p>
                  <p className="text-gray-400 text-sm leading-relaxed line-clamp-4 flex-1 w-full">
                    {t.about?.trim()
                      ? t.about
                      : "Experienced instructor dedicated to helping every student grow with discipline and skill."}
                  </p>
                  {typeof t.rating === "number" && t.rating > 0 ? (
                    <p className="mt-3 text-[#FFB70F] text-sm font-semibold" aria-label={`Rating ${t.rating} out of 5`}>
                      ★ {t.rating.toFixed(1)} / 5
                    </p>
                  ) : (
                    <img
                      src="/assets/img/courses/stars.png"
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="mt-3 w-24 h-auto opacity-90"
                    />
                  )}
                </div>
              </AnimatedCard>
            ))}
          </AnimatedStaggerGrid>
        </div>
      </section>

      {/* Student testimonials (MongoDB marketing) — carousel, max 6 */}
      <section className="py-16 md:py-20 bg-[#171A26] relative z-10">
        <div className="container mx-auto px-4 max-w-7xl">
          <AnimatedSection className="text-center mb-12" variant="fadeSlideUp">
            <div className="w-16 h-1 bg-[#FFB70F] mx-auto mb-4" />
            <p className="text-[#FFB70F] uppercase tracking-widest text-sm mb-2">{testimonialsSubtitle}</p>
            <h2 className="text-3xl md:text-4xl font-bold text-[#FFB70F]">{testimonialsTitle}</h2>
          </AnimatedSection>
          {showcaseTestimonials.length === 0 && testimonials.length === 0 ? (
            <p className="text-center text-gray-500 py-12 text-sm">No testimonials available</p>
          ) : showcaseTestimonials.length > 0 ? (
            <>
              <Carousel className="px-2 md:px-8">
                {showcaseTestimonials.slice(0, 6).map((t, i) => (
                  <TestimonialCard key={t.id || i} item={t} />
                ))}
              </Carousel>
              <AnimatedSection className="text-center mt-10" variant="fadeSlideUp">
                <Link
                  href="/testimonials"
                  className="inline-block rounded-lg bg-[#FFB70F] px-6 py-3 text-base font-semibold text-black hover:bg-[#F73322] hover:text-white transition-colors duration-300"
                >
                  More testimonials
                </Link>
              </AnimatedSection>
            </>
          ) : (
            <>
              <AnimatedStaggerGrid
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
                staggerDelay={0.1}
              >
                {testimonials.slice(0, 4).map((t, i) => (
                  <AnimatedCard key={i} scrollReveal={false}>
                    <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800 h-full flex flex-col items-center text-center">
                      <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-[#FFB70F]/50 mb-4 flex-shrink-0">
                        <SafeImage
                          src={t.image || DEFAULT_IMAGE_PLACEHOLDER}
                          alt={t.name}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <img
                        src="/assets/img/courses/quote.png"
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="w-8 h-8 mb-2 opacity-80"
                      />
                      <p className="text-gray-300 text-sm leading-relaxed mb-4 flex-1">
                        {t.quote || defaultTestimonialQuote}
                      </p>
                      <h3 className="text-[#FFB70F] font-semibold">{t.name}</h3>
                      {t.achievement?.trim() ? (
                        <p className="text-[#FFB70F]/90 text-xs font-medium uppercase tracking-wide mt-1">
                          {t.achievement}
                        </p>
                      ) : null}
                      <p className="text-white/80 text-sm">{t.role}</p>
                    </div>
                  </AnimatedCard>
                ))}
              </AnimatedStaggerGrid>
              <AnimatedSection className="text-center mt-10" variant="fadeSlideUp">
                <Link
                  href="/testimonials"
                  className="inline-block rounded-lg bg-[#FFB70F] px-6 py-3 text-base font-semibold text-black hover:bg-[#F73322] hover:text-white transition-colors duration-300"
                >
                  More testimonials
                </Link>
              </AnimatedSection>
            </>
          )}
        </div>
      </section>

      {/* Student achievements showcase (MongoDB) */}
      <section className="py-16 md:py-20 bg-[#171A26] relative z-10 border-t border-gray-800/80">
        <div className="container mx-auto px-4 max-w-7xl">
          <AnimatedSection className="text-center mb-12" variant="fadeSlideUp">
            <div className="w-16 h-1 bg-[#FFB70F] mx-auto mb-4" />
            <p className="text-[#FFB70F] uppercase tracking-widest text-sm mb-2">Celebrate</p>
            <h2 className="text-3xl md:text-4xl font-bold text-[#FFB70F]">Student Achievements</h2>
          </AnimatedSection>
          {showcaseAchievements.length === 0 ? (
            <p className="text-center text-gray-500 py-12 text-sm">No achievements yet</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {showcaseAchievements.slice(0, 12).map((a, i) => (
                <ShowcaseAchievementCard key={a.id || i} item={a} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA section — scroll reveal, single prominent CTA */}
      <AnimatedSection variant="fadeSlideUp" className="py-16 md:py-24 bg-[#171A26] relative z-10">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            {bottomCtaTitle || "Start your martial arts journey today"}
          </h2>
          <p className="text-gray-400 mb-8">
            {bottomCtaSubtitle || "Join Rock Martial Arts Academy and train with expert masters in a supportive community."}
          </p>
          {!shouldReduceMotion ? (
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <Link
                href="/register"
                className="inline-block rounded-lg bg-[#FFB70F] px-8 py-4 text-lg font-semibold text-black hover:bg-[#F73322] hover:text-white transition-colors duration-300"
              >
                Get Started
              </Link>
            </motion.div>
          ) : (
            <Link
              href="/register"
              className="inline-block rounded-lg bg-[#FFB70F] px-8 py-4 text-lg font-semibold text-black"
            >
              Get Started
            </Link>
          )}
        </div>
      </AnimatedSection>
    </main>
  )
}
