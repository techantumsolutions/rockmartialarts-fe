"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { Menu, X } from "lucide-react"
import { resolvePublicAssetUrl } from "@/lib/resolvePublicAssetUrl"

type Props = {
  slug: string
  name: string
  logoUrl?: string | null
  logoAlt?: string | null
}

export function PartnerOrgHeader({ slug, name, logoUrl, logoAlt }: Props) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const base = `/partner-orgs/${encodeURIComponent(slug)}`
  const logo = resolvePublicAssetUrl(logoUrl || "") || null

  const links = [
    { label: "Courses", href: `${base}/courses` },
    { label: "Branches", href: `${base}/branches` },
    { label: "Contact", href: `${base}/contact` },
  ]

  const isActive = (href: string) =>
    pathname === href || (href !== base && pathname?.startsWith(href))

  return (
    <header className="fixed top-0 inset-x-0 z-50 border-b border-white/10 bg-[#171A26]/95 backdrop-blur">
      <div className="container mx-auto max-w-7xl px-4 h-16 md:h-18 flex items-center justify-between gap-4">
        <Link href={base} className="flex items-center gap-3 min-w-0">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logo}
              alt={logoAlt || name}
              className="h-10 w-auto max-w-[140px] object-contain"
            />
          ) : (
            <span className="text-[#FFB70F] font-bold text-lg truncate">{name}</span>
          )}
          {logo ? (
            <span className="hidden sm:inline text-white font-semibold truncate">{name}</span>
          ) : null}
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`text-sm font-medium uppercase tracking-wide transition-colors ${
                isActive(l.href) ? "text-[#FFB70F]" : "text-white hover:text-[#FFB70F]"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          className="md:hidden text-white p-2"
          aria-label="Menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {open ? (
        <div className="md:hidden border-t border-white/10 bg-[#171A26] px-4 py-4 space-y-3">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={`block text-base font-medium uppercase tracking-wide ${
                isActive(l.href) ? "text-[#FFB70F]" : "text-white"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>
      ) : null}
    </header>
  )
}
