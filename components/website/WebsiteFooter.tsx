"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { toCourseSlug } from "@/lib/course-slug"
import { useCMS } from "@/contexts/CMSContext"
import { resolvePublicAssetUrl } from "@/lib/resolvePublicAssetUrl"

const quickLinks = [
  { label: "Courses", href: "/courses" },
  { label: "Branches", href: "/branches" },
  { label: "Enrollment cart", href: "/cart" },
  { label: "Store", href: "/store" },
  { label: "Privacy Policy", href: "/privacy-policy" },
]

type CourseItem = { id: string; title: string; name?: string }

export function WebsiteFooter() {
  const [courses, setCourses] = useState<CourseItem[]>([])
  const { cms } = useCMS()

  const footer = cms?.footer
  const branding = cms?.branding

  useEffect(() => {
    let cancelled = false
    fetch("/api/backend/courses/public/all", { headers: { "Content-Type": "application/json" } })
      .then((res) => (res.ok ? res.json() : Promise.resolve({ courses: [] })))
      .then((data) => {
        if (cancelled) return
        const list = data.courses ?? data ?? []
        setCourses(Array.isArray(list) ? list : [])
      })
      .catch(() => {
        if (!cancelled) setCourses([])
      })
    return () => { cancelled = true }
  }, [])

  // Build social links from CMS or fallback to defaults
  const socialLinks = [
    { href: footer?.social_facebook || "#", img: "/assets/img/fb.png", alt: "facebook" },
    { href: footer?.social_twitter || "#", img: "/assets/img/x.png", alt: "twitter" },
    { href: footer?.social_instagram || "#", img: "/assets/img/insta.png", alt: "instagram" },
    { href: footer?.social_youtube || "#", img: "/assets/img/yt.png", alt: "youtube" },
  ]

  const footerLogo = resolvePublicAssetUrl(branding?.footer_logo) || "/logo.png"
  const footerText = footer?.footer_text || "Kungfu @ ROCK has improved my physical and mental strength, stamina, and focus. Self-defense skills have given me confidence to travel alone fearlessly. It\u2019s a life skill that I highly recommend for discipline, self-esteem, and fitness. Thank you ROCK team for the support."
  const copyrightText = footer?.copyright_text || "\u00A9 Copyright 2025 | ROCK | All Rights Reserved."
  const address = footer?.address || "KJS Plaza, 4-39, Balaji Nagar Main Rd, Santoshi Nagar, Secunderabad, Telangana 500087"
  const phone = footer?.phone || "+91 8179041226, +91 8977933876"
  const email = footer?.email || "info@rockmartialarts.com"

  return (
    <footer className="bg-black text-gray-300 pt-12 pb-0">
      <div className="container mx-auto px-4 pt-8 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 text-left">
          <div className="lg:col-span-3">
            <img
              src={footerLogo}
              alt="Rock Martial Arts Academy"
              className="mb-4 w-[150px] h-auto"
              width={150}
              height={60}
            />
            <p className="text-sm leading-relaxed">{footerText}</p>
          </div>

          <div className="lg:col-span-3">
            <h6 className="text-[#FFB70F] font-semibold uppercase tracking-wide mb-4">Quick Links</h6>
            <ul className="list-none space-y-2">
              {quickLinks.map((link) => (
                <li key={link.href + link.label}>
                  <Link href={link.href} className="text-gray-300 hover:text-[#FFB70F] transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-3">
            <h6 className="text-[#FFB70F] font-semibold uppercase tracking-wide mb-4">Our Service</h6>
            <ul className="list-none space-y-2">
              {courses.length > 0
                ? courses.map((c) => (
                    <li key={c.id}>
                      <Link href={`/courses/${toCourseSlug(c)}`} className="text-gray-300 hover:text-[#FFB70F] transition-colors">
                        {c.title || c.name || c.id}
                      </Link>
                    </li>
                  ))
                : <li className="text-gray-500 text-sm">No courses yet</li>
              }
            </ul>
          </div>

          <div className="lg:col-span-3">
            <h6 className="text-[#FFB70F] font-semibold uppercase tracking-wide mb-4">Contact</h6>
            <p className="text-sm mb-2">{address}</p>
            <p className="flex items-center gap-2 mb-1 text-sm">
              <img src="/assets/img/phone_icon.png" alt="" className="w-4 h-4" />
              {phone}
            </p>
            <p className="flex items-center gap-2 mb-4 text-sm">
              <img src="/assets/img/mail-icon.png" alt="" className="w-4 h-4" />
              {email}
            </p>
            <h6 className="text-[#FFB70F] font-semibold uppercase tracking-wide mb-3">Connect us on</h6>
            <div className="flex gap-3">
              {socialLinks.map((s) => (
                <Link key={s.alt} href={s.href} aria-label={s.alt} target={s.href !== "#" ? "_blank" : undefined} rel={s.href !== "#" ? "noopener noreferrer" : undefined}>
                  <img src={s.img} alt={s.alt} className="w-6 h-6 object-contain" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="text-center text-gray-500 mt-10 py-4 bg-gray-900/50">
        {copyrightText}
      </div>
    </footer>
  )
}
