"use client"

import Link from "next/link"
import { Mail, MapPin, Phone } from "lucide-react"
import { resolvePublicAssetUrl } from "@/lib/resolvePublicAssetUrl"

type Props = {
  slug: string
  name: string
  footerLogoUrl?: string | null
  footerLogoAlt?: string | null
  description?: string | null
  address?: string | null
  phone?: string | null
  email?: string | null
  socialLinks?: Record<string, string | null | undefined> | null
}

export function PartnerOrgFooter({
  slug,
  name,
  footerLogoUrl,
  footerLogoAlt,
  description,
  address,
  phone,
  email,
  socialLinks,
}: Props) {
  const base = `/partner-orgs/${encodeURIComponent(slug)}`
  const logo = resolvePublicAssetUrl(footerLogoUrl || "") || null
  const quickLinks = [
    { label: "Courses", href: `${base}/courses` },
    { label: "Branches", href: `${base}/branches` },
    { label: "Contact", href: `${base}/contact` },
  ]
  const social = Object.entries(socialLinks || {}).filter(([, v]) => !!v)

  return (
    <footer className="bg-black text-gray-300 pt-12 pb-0 mt-auto">
      <div className="container mx-auto px-4 pt-4 pb-10 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 text-left">
          <div className="md:col-span-2 lg:col-span-4">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logo}
                alt={footerLogoAlt || name}
                className="mb-4 w-[150px] h-auto object-contain"
                width={150}
                height={60}
              />
            ) : (
              <div className="mb-4 text-[#FFB70F] font-bold text-xl">{name}</div>
            )}
            {description ? (
              <p className="text-sm leading-relaxed text-gray-400">{description}</p>
            ) : null}
          </div>

          <div className="lg:col-span-3">
            <h6 className="text-[#FFB70F] font-semibold uppercase tracking-wide mb-4">
              Quick Links
            </h6>
            <ul className="list-none space-y-2">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-gray-300 hover:text-[#FFB70F] transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-5">
            <h6 className="text-[#FFB70F] font-semibold uppercase tracking-wide mb-4">
              Contact
            </h6>
            <div className="space-y-3 text-sm">
              {address ? (
                <p className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-[#FFB70F] shrink-0 mt-0.5" />
                  <span>{address}</span>
                </p>
              ) : null}
              {phone ? (
                <p className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[#FFB70F] shrink-0" />
                  <a href={`tel:${phone}`} className="hover:text-[#FFB70F]">
                    {phone}
                  </a>
                </p>
              ) : null}
              {email ? (
                <p className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#FFB70F] shrink-0" />
                  <a href={`mailto:${email}`} className="hover:text-[#FFB70F]">
                    {email}
                  </a>
                </p>
              ) : null}
              {social.length ? (
                <div className="flex flex-wrap gap-2 pt-2">
                  {social.map(([key, url]) => (
                    <a
                      key={key}
                      href={String(url)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs capitalize px-3 py-1.5 rounded-full border border-gray-700 hover:border-[#FFB70F] hover:text-[#FFB70F]"
                    >
                      {key}
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-10 pt-6 text-xs text-gray-500">
          © {new Date().getFullYear()} {name}. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
