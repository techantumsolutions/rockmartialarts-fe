"use client"

import type { CSSProperties } from "react"
import type { ResidentialCampContent } from "@/lib/residentialCamp"
import {
  telHref,
  formatHeroEyebrow,
  masterProfileImage,
  featureBarIconImage,
  DEFAULT_RESIDENTIAL_CAMP,
  buildCampNavLinks,
} from "@/lib/residentialCamp"
import { resolvePublicAssetUrl } from "@/lib/resolvePublicAssetUrl"
import { ResidentialCampNavBar } from "@/components/website/ResidentialCampNavBar"
import { TrainingProgramGrid } from "@/components/website/TrainingProgramGrid"

export function ResidentialCampView({
  content,
  onRegister,
}: {
  content: ResidentialCampContent
  onRegister?: () => void
}) {
  const { nav, hero, camp, training, schedule, register, footer, levels, journey_cta } =
    content
  const journey = {
    ...DEFAULT_RESIDENTIAL_CAMP.journey_cta!,
    ...(journey_cta || {}),
  }
  const journeyEnabled = journey.enabled !== false
  const journeyBg =
    resolvePublicAssetUrl((journey.background_image || "").trim()) || "/campaign/ctabg.png"
  const journeyStyle = {
    ["--journey-cta-bg"]: `url("${journeyBg}")`,
  } as CSSProperties
  const showJourneyPrimary = journey.cta_primary_enabled !== false
  const showJourneySecondary = journey.cta_secondary_enabled !== false
  const journeySecondaryHref =
    (journey.cta_secondary_href || "").trim() ||
    (register.whatsapp_url || "").trim() ||
    "https://wa.me/918179941226"
  const levelsContent = levels?.h2 || levels?.cards?.length
    ? { ...DEFAULT_RESIDENTIAL_CAMP.levels, ...levels }
    : DEFAULT_RESIDENTIAL_CAMP.levels
  const levelsEnabled = levelsContent?.enabled !== false
  const levelsBg =
    resolvePublicAssetUrl((levelsContent?.background_image || "").trim()) ||
    "/campaign/levelbg.png"
  const levelsStyle = {
    ["--levels-bg"]: `url("${levelsBg}")`,
  } as CSSProperties
  const levelCards = (
    levelsContent?.cards?.length
      ? levelsContent.cards
      : DEFAULT_RESIDENTIAL_CAMP.levels?.cards || []
  ).filter((c) => c.enabled !== false)
  const levelPanels = (
    levelsContent?.panels?.length
      ? levelsContent.panels
      : DEFAULT_RESIDENTIAL_CAMP.levels?.panels || []
  ).filter((p) => p.enabled !== false)
  const heroImage = resolvePublicAssetUrl(hero.hero_image)
  const showPrimaryCta = hero.cta_primary_enabled !== false
  const showSecondaryCta = hero.cta_secondary_enabled !== false
  const secondaryUrl =
    (hero.whatsapp_url || "").trim() || "https://wa.me/918179941226"
  const calligraphy = (hero.calligraphy_text || "").trim()
  const quoteText = (hero.quote_text || "").trim()
  const quoteAuthor = (hero.quote_author || "").trim()
  const eyebrowText = formatHeroEyebrow(hero)
  const featureItems = (
    content.feature_bar?.length
      ? content.feature_bar
      : DEFAULT_RESIDENTIAL_CAMP.feature_bar || []
  ).filter((item) => item.enabled !== false && (item.label || "").trim())
  const aboutImage =
    resolvePublicAssetUrl((camp.about_image || "").trim()) ||
    "/campaign/aboutsection.png"
  const aboutParagraph1 =
    (camp.paragraph_1 || "").trim() || (camp.lead || "").trim()
  const aboutParagraph2 = (camp.paragraph_2 || "").trim()
  const aboutCtaHref = (camp.cta_href || "").trim() || "#training"
  const aboutCtaLabel = (camp.cta_label || "").trim() || "LEARN MORE"
  const showAboutCta = camp.cta_enabled !== false
  const trainingEnabled = training.enabled !== false
  const trainingCards = (training.cards || []).filter((card) => card.enabled !== false)
  const masterProfiles = (
    schedule.masters?.length
      ? schedule.masters
      : DEFAULT_RESIDENTIAL_CAMP.schedule.masters || []
  ).filter((m) => m.enabled !== false)
  const footerNavLinks = buildCampNavLinks(nav)
  const footerLogo =
    resolvePublicAssetUrl((footer.logo || "").trim()) ||
    resolvePublicAssetUrl((nav.logo || "").trim())
  const footerDescription = (
    (footer.description || "").trim() ||
    (footer.tagline || "").trim()
  ).slice(0, 60)
  const footerSocials = [
    {
      key: "instagram",
      href: (footer.social_instagram_url || "").trim(),
      icon: resolvePublicAssetUrl((footer.social_instagram_icon || "").trim()),
      label: "Instagram",
    },
    {
      key: "youtube",
      href: (footer.social_youtube_url || "").trim(),
      icon: resolvePublicAssetUrl((footer.social_youtube_icon || "").trim()),
      label: "YouTube",
    },
    {
      key: "facebook",
      href: (footer.social_facebook_url || "").trim(),
      icon: resolvePublicAssetUrl((footer.social_facebook_icon || "").trim()),
      label: "Facebook",
    },
  ]
  const showFooterCta = footer.cta_enabled !== false
  const footerCtaLabel = (footer.cta_label || "").trim() || "ENQUIRE NOW"

  return (
    <div className="rma-camp" id="top">
      <ResidentialCampNavBar nav={nav} onRegister={onRegister} />

      <header className="hero">
        {heroImage ? (
          <img className="hero-bg" src={heroImage} alt="" aria-hidden="true" />
        ) : null}
        <div className="container hero-layout">
          <div className="hero-copy">
            {eyebrowText ? <div className="hero-kicker">{eyebrowText}</div> : null}
            <h1>
              <span className="hero-title-accent">{hero.h1_line1}</span>
              <br />
              {hero.h1_line2}
            </h1>
            {hero.h2 ? <p className="hero-tagline">{hero.h2}</p> : null}
            {hero.paragraph ? <p className="hero-desc">{hero.paragraph}</p> : null}
            {showPrimaryCta || showSecondaryCta ? (
              <div className="hero-buttons">
                {showPrimaryCta ? (
                  <a
                    className="hero-btn hero-btn-primary"
                    href="#register"
                    onClick={(e) => {
                      if (!onRegister) return
                      e.preventDefault()
                      onRegister()
                    }}
                  >
                    {hero.cta_primary_label || "Join Now"}
                  </a>
                ) : null}
                {showSecondaryCta ? (
                  <a
                    className="hero-btn hero-btn-secondary"
                    href={secondaryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {hero.cta_whatsapp_label || "Book a Trial Class"}
                  </a>
                ) : null}
              </div>
            ) : null}
            {calligraphy || quoteText || quoteAuthor ? (
              <div className="hero-quote">
                {calligraphy ? (
                  <div className="hero-calligraphy" aria-hidden="true">
                    {calligraphy}
                  </div>
                ) : null}
                {quoteText || quoteAuthor ? (
                  <p>
                    {quoteText ? (
                      <span className="hero-quote-mark">“{quoteText}”</span>
                    ) : null}
                    {quoteAuthor ? (
                      <span className="hero-quote-author"> — {quoteAuthor}</span>
                    ) : null}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {featureItems.length > 0 ? (
        <section className="feature-bar" aria-label="Camp highlights">
          <div className="feature-bar-inner">
            {featureItems.map((item, i) => {
              const rawIcon = featureBarIconImage(item, i)
              const iconSrc = rawIcon ? resolvePublicAssetUrl(rawIcon) || rawIcon : ""
              return (
                <div className="feature-bar-item" key={`${item.label}-${i}`}>
                  {iconSrc ? (
                    <div className="feature-bar-icon">
                      <img src={iconSrc} alt="" />
                    </div>
                  ) : null}
                  <div className="feature-bar-label">{item.label}</div>
                </div>
              )
            })}
          </div>
        </section>
      ) : null}

      <section id="camp" className="camp-about">
        <div className="camp-about-left">
          {camp.kicker ? <div className="camp-about-kicker">{camp.kicker}</div> : null}
          {camp.h2 ? <h2 className="camp-about-title">{camp.h2}</h2> : null}
          <div className="camp-about-rule" aria-hidden="true" />
          {aboutParagraph1 ? <p className="camp-about-text">{aboutParagraph1}</p> : null}
          {aboutParagraph2 ? <p className="camp-about-text">{aboutParagraph2}</p> : null}
          {showAboutCta && aboutCtaLabel ? (
            <a className="camp-about-cta" href={aboutCtaHref}>
              {aboutCtaLabel}
            </a>
          ) : null}
        </div>
        <div className="camp-about-right">
          <img src={aboutImage} alt="" />
        </div>
      </section>

      {trainingEnabled && trainingCards.length > 0 ? (
        <section id="training" className="training-program">
          <div className="training-program-inner">
            {training.h2 ? <h2 className="training-program-title">{training.h2}</h2> : null}
            <div className="training-program-rule" aria-hidden="true" />
            <TrainingProgramGrid cards={trainingCards} />
          </div>
        </section>
      ) : (
        <div id="training" />
      )}

      {masterProfiles.length > 0 ? (
        <section id="masters" className="masters-section">
          <div className="masters-section-inner">
            {masterProfiles.slice(0, 2).map((master, i) => {
              const img =
                resolvePublicAssetUrl(masterProfileImage(master, i)) ||
                masterProfileImage(master, i)
              const quote = (master.quote || "").trim()
              const side = i === 0 ? "left" : "right"
              const copy = (
                <div className="masters-copy">
                  {master.title ? <h2 className="masters-title">{master.title}</h2> : null}
                  <div className="masters-rule" aria-hidden="true" />
                  {master.name ? <h3 className="masters-name">{master.name}</h3> : null}
                  {master.designation ? (
                    <p className="masters-designation">{master.designation}</p>
                  ) : null}
                  {master.description ? (
                    <p className="masters-description">{master.description}</p>
                  ) : null}
                  {quote ? <p className="masters-quote">&ldquo;{quote}&rdquo;</p> : null}
                </div>
              )
              const photo = (
                <div className="masters-photo">
                  <div className="masters-photo-frame">
                    <img src={img} alt={master.name || ""} />
                  </div>
                  {master.name ? <div className="masters-photo-caption">{master.name}</div> : null}
                </div>
              )
              return (
                <div className={`masters-col masters-col-${side}`} key={`${master.name}-${i}`}>
                  {side === "left" ? (
                    <>
                      {copy}
                      {photo}
                    </>
                  ) : (
                    <>
                      {photo}
                      {copy}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      ) : (
        <div id="masters" />
      )}

      {levelsEnabled ? (
        <section id="levels" className="levels-banner" style={levelsStyle}>
          <div className="levels-banner-inner">
            <div className="levels-left">
              {levelsContent?.h2 ? (
                <h2 className="levels-banner-title">{levelsContent.h2}</h2>
              ) : null}
              {levelCards.length > 0 ? (
                <div className="levels-cards">
                  {levelCards.map((card, i) => (
                    <article
                      className="levels-card"
                      key={`${card.title}-${i}`}
                      style={{ background: card.color || "#8f9a3a" }}
                    >
                      {card.title ? <h3>{card.title}</h3> : null}
                      {card.description ? <p>{card.description}</p> : null}
                    </article>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="levels-center" aria-hidden="true" />

            <div className="levels-right">
              {levelPanels.map((panel, i) => (
                <div className="levels-panel-wrap" key={`${panel.title}-${i}`}>
                  {i > 0 ? <div className="levels-vdivider" aria-hidden="true" /> : null}
                  <div className="levels-panel">
                    {panel.title ? <h3 className="levels-panel-title">{panel.title}</h3> : null}
                    {panel.description ? (
                      <p className="levels-panel-desc">{panel.description}</p>
                    ) : null}
                    {(panel.bullets || []).filter(Boolean).length > 0 ? (
                      <ul className="levels-panel-list">
                        {panel.bullets.filter(Boolean).map((bullet) => (
                          <li key={bullet}>{bullet}</li>
                        ))}
                      </ul>
                    ) : null}
                    {panel.cta_enabled !== false && panel.cta_label ? (
                      panel.cta_opens_register ? (
                        <button
                          type="button"
                          className="levels-panel-cta"
                          onClick={() => onRegister?.()}
                        >
                          {panel.cta_label}
                        </button>
                      ) : (
                        <a className="levels-panel-cta" href={(panel.cta_href || "").trim() || "#camp"}>
                          {panel.cta_label}
                        </a>
                      )
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : (
        <section id="levels" className="cta">
          <div className="container">
            <div className="kicker" style={{ color: "#080808" }}>
              {register.kicker}
            </div>
            <h2>{register.h2}</h2>
            <p>{register.paragraph}</p>
            <div className="buttons">
              <button type="button" className="btn" onClick={() => onRegister?.()}>
                Register Now
              </button>
              <a className="btn" href={telHref(register.phone)}>
                {register.call_label}
              </a>
              <a className="btn" href={register.whatsapp_url} target="_blank" rel="noopener noreferrer">
                {register.whatsapp_register_label}
              </a>
            </div>
          </div>
        </section>
      )}

      {journeyEnabled ? (
        <section id="journey" className="journey-cta" style={journeyStyle}>
          <div className="journey-cta-inner">
            <div className="journey-cta-copy">
              {journey.title_line1 ? (
                <div className="journey-cta-line1">{journey.title_line1}</div>
              ) : null}
              {journey.title_line2 ? (
                <h2 className="journey-cta-line2">{journey.title_line2}</h2>
              ) : null}
              {journey.description ? (
                <p className="journey-cta-desc">{journey.description}</p>
              ) : null}
              {showJourneyPrimary || showJourneySecondary ? (
                <div className="journey-cta-buttons">
                  {showJourneyPrimary && journey.cta_primary_label ? (
                    journey.cta_primary_opens_register !== false ? (
                      <button
                        type="button"
                        className="journey-cta-btn journey-cta-btn-primary"
                        onClick={() => onRegister?.()}
                      >
                        {journey.cta_primary_label}
                      </button>
                    ) : (
                      <a
                        className="journey-cta-btn journey-cta-btn-primary"
                        href={(journey.cta_primary_href || "").trim() || "#register"}
                      >
                        {journey.cta_primary_label}
                      </a>
                    )
                  ) : null}
                  {showJourneySecondary && journey.cta_secondary_label ? (
                    <a
                      className="journey-cta-btn journey-cta-btn-secondary"
                      href={journeySecondaryHref}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {journey.cta_secondary_label}
                    </a>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : (
        <div id="journey" />
      )}

      <footer className="camp-site-footer">
        <div className="camp-site-footer-inner">
          <div className="camp-site-footer-brand">
            <a href="#top" className="camp-site-footer-logo" aria-label="Rock Martial Arts Academy">
              {footerLogo ? (
                <img src={footerLogo} alt="" />
              ) : (
                <span className="camp-site-footer-logo-fallback">
                  <span className="camp-site-footer-logo-rock">
                    {(nav.brand_prefix || "ROCK").trim() || "ROCK"}
                  </span>
                  <span className="camp-site-footer-logo-sub">
                    {(nav.brand_accent || "MARTIAL ARTS ACADEMY").trim() || "MARTIAL ARTS ACADEMY"}
                  </span>
                </span>
              )}
            </a>
            {footerDescription ? (
              <p className="camp-site-footer-desc">{footerDescription}</p>
            ) : null}
          </div>

          {footerNavLinks.length > 0 ? (
            <nav className="camp-site-footer-nav" aria-label="Footer">
              {footerNavLinks.map((link, i) => (
                <span key={link.href} className="camp-site-footer-nav-item">
                  {i > 0 ? <span className="camp-site-footer-nav-sep" aria-hidden="true">|</span> : null}
                  <a href={link.href}>{link.label}</a>
                </span>
              ))}
            </nav>
          ) : null}

          <div className="camp-site-footer-right">
            <div className="camp-site-footer-socials">
              {footerSocials.map((social) => {
                const href = social.href || "#"
                return (
                  <a
                    key={social.key}
                    className="camp-site-footer-social"
                    href={href}
                    target={social.href ? "_blank" : undefined}
                    rel={social.href ? "noopener noreferrer" : undefined}
                    aria-label={social.label}
                  >
                    {social.icon ? (
                      <img src={social.icon} alt="" />
                    ) : social.key === "instagram" ? (
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          fill="currentColor"
                          d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7zm5 3.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 0 1 12 7.5zm0 2A2.5 2.5 0 1 0 14.5 12 2.5 2.5 0 0 0 12 9.5zm5.25-3.75a1 1 0 1 1-1 1 1 1 0 0 1 1-1z"
                        />
                      </svg>
                    ) : social.key === "youtube" ? (
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          fill="currentColor"
                          d="M23.5 7.2a3 3 0 0 0-2.1-2.1C19.5 4.5 12 4.5 12 4.5s-7.5 0-9.4.6A3 3 0 0 0 .5 7.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 4.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-4.8zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"
                        />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          fill="currentColor"
                          d="M14 9h3V6h-3c-2.2 0-4 1.8-4 4v1H8v3h2v7h3v-7h2.6L16 11h-3v-1c0-.6.4-1 1-1z"
                        />
                      </svg>
                    )}
                  </a>
                )
              })}
            </div>
            {showFooterCta ? (
              footer.cta_opens_register !== false ? (
                <button
                  type="button"
                  className="camp-site-footer-cta"
                  onClick={() => onRegister?.()}
                >
                  {footerCtaLabel}
                </button>
              ) : (
                <a
                  className="camp-site-footer-cta"
                  href={(footer.cta_href || "").trim() || "#register"}
                >
                  {footerCtaLabel}
                </a>
              )
            ) : null}
          </div>
        </div>
      </footer>
    </div>
  )
}
