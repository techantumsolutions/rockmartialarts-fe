"use client"

import { useEffect, useMemo, useState, type MouseEvent } from "react"
import type { ResidentialCampNav as CampNavContent } from "@/lib/residentialCamp"
import { buildCampNavLinks } from "@/lib/residentialCamp"
import { resolvePublicAssetUrl } from "@/lib/resolvePublicAssetUrl"

const NAV_OFFSET_PX = 80

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

  // Scroll-spy: highlight nav item for the section currently under the fixed navbar
  useEffect(() => {
    const targets = links
      .map((link) => {
        if (!link.href.startsWith("#") || link.href.length < 2) return null
        const el = document.getElementById(link.href.slice(1))
        return el ? { href: link.href, el } : null
      })
      .filter((t): t is { href: string; el: HTMLElement } => Boolean(t))

    if (!targets.length) return

    const readNavOffset = () => {
      const camp = document.querySelector(".rma-camp")
      if (camp) {
        const raw = getComputedStyle(camp).getPropertyValue("--nav-height").trim()
        const n = Number.parseFloat(raw)
        if (Number.isFinite(n) && n > 0) return n
      }
      return NAV_OFFSET_PX
    }

    const pickActive = () => {
      const navOffset = readNavOffset()

      if (window.scrollY < 24) {
        const home = targets.find((t) => t.href === "#top")
        setActiveHref(home?.href || targets[0].href)
        return
      }

      // Last section whose top has crossed under the fixed nav (industry-standard scroll-spy)
      let current = targets[0].href
      for (const { href, el } of targets) {
        const top = el.getBoundingClientRect().top
        if (top - navOffset <= 1) current = href
      }
      setActiveHref(current)
    }

    const navOffset = readNavOffset()
    const observer = new IntersectionObserver(pickActive, {
      root: null,
      rootMargin: `-${navOffset}px 0px -40% 0px`,
      threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
    })

    for (const { el } of targets) observer.observe(el)

    pickActive()
    window.addEventListener("scroll", pickActive, { passive: true })
    window.addEventListener("resize", pickActive)

    return () => {
      observer.disconnect()
      window.removeEventListener("scroll", pickActive)
      window.removeEventListener("resize", pickActive)
    }
  }, [links])

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
              aria-current={activeHref === link.href ? "true" : undefined}
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
                aria-current={activeHref === link.href ? "true" : undefined}
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
