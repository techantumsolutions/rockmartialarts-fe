"use client"

import { useEffect, useMemo, useState, type MouseEvent } from "react"
import type { ResidentialCampNav as CampNavContent } from "@/lib/residentialCamp"
import { buildCampNavLinks } from "@/lib/residentialCamp"
import { resolvePublicAssetUrl } from "@/lib/resolvePublicAssetUrl"

export function ResidentialCampNavBar({
  nav,
  onRegister,
}: {
  nav: CampNavContent
  onRegister?: () => void
}) {
  const [open, setOpen] = useState(false)
  const [logoFailed, setLogoFailed] = useState(false)
  const [activeHref, setActiveHref] = useState("#top")
  const logo = resolvePublicAssetUrl(nav.logo)
  const showLogo = Boolean(logo) && !logoFailed
  const brandName = `${nav.brand_prefix} ${nav.brand_accent}`.trim() || "Rock Martial Arts Academy"
  const links = useMemo(() => buildCampNavLinks(nav), [nav])
  const registerLabel =
    (nav.mobile_register_label || nav.link_register || "Register Now").trim() || "Register Now"

  useEffect(() => {
    setLogoFailed(false)
  }, [logo])

  useEffect(() => {
    if (links.length && !links.some((l) => l.href === activeHref)) {
      setActiveHref(links[0].href)
    }
  }, [links, activeHref])

  const close = () => setOpen(false)

  const openRegister = (e: MouseEvent) => {
    if (!onRegister) return
    e.preventDefault()
    onRegister()
  }

  return (
    <nav className="nav">
      <div className="container navin">
        <a href="#top" className="brand" aria-label={brandName} onClick={close}>
          {showLogo ? (
            <img
              className="brand-logo"
              src={logo}
              alt={brandName}
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <>
              {nav.brand_prefix} <span>{nav.brand_accent}</span>
            </>
          )}
        </a>

        <div className="navlinks">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={activeHref === link.href ? "is-active" : undefined}
              onClick={() => {
                setActiveHref(link.href)
                close()
              }}
            >
              {link.label}
            </a>
          ))}
        </div>

        <a
          className="nav-cta"
          href="#register"
          onClick={(e) => {
            close()
            openRegister(e)
          }}
        >
          {registerLabel}
        </a>

        <button
          type="button"
          className={`hamburger${open ? " is-open" : ""}`}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="rma-camp-mobile-menu"
          onClick={() => setOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {open ? (
        <div id="rma-camp-mobile-menu" className="mobile-menu">
          <div className="container">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={activeHref === link.href ? "is-active" : undefined}
                onClick={() => {
                  setActiveHref(link.href)
                  close()
                }}
              >
                {link.label}
              </a>
            ))}
            <a
              className="btn primary nav-cta-mobile"
              href="#register"
              onClick={(e) => {
                close()
                openRegister(e)
              }}
            >
              {registerLabel}
            </a>
          </div>
        </div>
      ) : null}
    </nav>
  )
}
