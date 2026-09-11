"use client"

import { useState } from "react"
import type { ResidentialCampNav as CampNavContent } from "@/lib/residentialCamp"
import { resolvePublicAssetUrl } from "@/lib/resolvePublicAssetUrl"

export function ResidentialCampNavBar({
  nav,
  onRegister,
}: {
  nav: CampNavContent
  onRegister?: () => void
}) {
  const [open, setOpen] = useState(false)
  const logo = resolvePublicAssetUrl(nav.logo)
  const brandName = `${nav.brand_prefix} ${nav.brand_accent}`.trim() || "Rock Martial Arts Academy"

  const close = () => setOpen(false)

  return (
    <nav className="nav">
      <div className="container navin">
        <a href="#top" className="brand" aria-label={brandName} onClick={close}>
          {logo ? (
            <img className="brand-logo" src={logo} alt={brandName} />
          ) : (
            <>
              {nav.brand_prefix} <span>{nav.brand_accent}</span>
            </>
          )}
        </a>

        <div className="navlinks">
          <a href="#camp">{nav.link_camp}</a>
          <a href="#training">{nav.link_training}</a>
          <a href="#schedule">{nav.link_schedule}</a>
            <a
              href="#register"
              onClick={(e) => {
                if (!onRegister) return
                e.preventDefault()
                onRegister()
              }}
            >
              {nav.link_register}
            </a>
        </div>

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
            <a href="#camp" onClick={close}>
              {nav.link_camp}
            </a>
            <a href="#training" onClick={close}>
              {nav.link_training}
            </a>
            <a href="#schedule" onClick={close}>
              {nav.link_schedule}
            </a>
            <a
              href="#register"
              onClick={(e) => {
                close()
                if (!onRegister) return
                e.preventDefault()
                onRegister()
              }}
            >
              {nav.link_register}
            </a>
            <a
              className="btn primary"
              href="#register"
              onClick={(e) => {
                close()
                if (!onRegister) return
                e.preventDefault()
                onRegister()
              }}
            >
              {nav.mobile_register_label}
            </a>
          </div>
        </div>
      ) : null}
    </nav>
  )
}
