"use client"

import type { CSSProperties } from "react"
import type { ResidentialCampContent } from "@/lib/residentialCamp"
import { telHref, campCardIconImage } from "@/lib/residentialCamp"
import { resolvePublicAssetUrl } from "@/lib/resolvePublicAssetUrl"
import { ResidentialCampNavBar } from "@/components/website/ResidentialCampNavBar"
import { ResidentialCampCardGrid } from "@/components/website/ResidentialCampCardGrid"

export function ResidentialCampView({
  content,
  onRegister,
}: {
  content: ResidentialCampContent
  onRegister?: () => void
}) {
  const { nav, hero, facts, camp, training, schedule, rules, register, footer } = content
  const heroImage = resolvePublicAssetUrl(hero.hero_image)
  const heroStyle: CSSProperties | undefined = heroImage
    ? ({ ["--hero-image"]: `url("${heroImage}")` } as CSSProperties)
    : undefined

  return (
    <div className="rma-camp" id="top">
      <div className="topbar">{content.topbar_text}</div>

      <ResidentialCampNavBar nav={nav} onRegister={onRegister} />

      <header className="hero" style={heroStyle}>
        <div className="container">
          <div className="hero-copy">
            <div className="eyebrow">{hero.eyebrow}</div>
            <h1>
              {hero.h1_line1}
              <br />
              <em>{hero.h1_line2}</em>
            </h1>
            <h2>{hero.h2}</h2>
            <p>{hero.paragraph}</p>
            <div className="buttons">
              <a
                className="btn primary"
                href="#register"
                onClick={(e) => {
                  if (!onRegister) return
                  e.preventDefault()
                  onRegister()
                }}
              >
                {hero.cta_primary_label}
              </a>
              <a className="btn secondary" href={hero.whatsapp_url} target="_blank" rel="noopener noreferrer">
                {hero.cta_whatsapp_label}
              </a>
            </div>
          </div>
        </div>
      </header>

      <section className="container" style={{ marginTop: -1 }}>
        <div className="facts">
          {facts.map((fact) => (
            <div className="fact" key={`${fact.label}-${fact.value}`}>
              <b>{fact.label}</b>
              <strong>{fact.value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section id="camp" className="section">
        <div className="container">
          <div className="kicker">{camp.kicker}</div>
          <h2>{camp.h2}</h2>
          <p className="lead">{camp.lead}</p>
          <ResidentialCampCardGrid>
            {camp.cards.map((card) => {
              const iconSrc = resolvePublicAssetUrl(campCardIconImage(card))
              return (
              <article className="card" key={card.title}>
                <div className="icon">
                  {iconSrc ? <img src={iconSrc} alt="" /> : card.icon}
                </div>
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </article>
              )
            })}
          </ResidentialCampCardGrid>
        </div>
      </section>

      <section id="training" className="section alt">
        <div className="container">
          <div className="kicker">{training.kicker}</div>
          <h2>{training.h2}</h2>
          <ResidentialCampCardGrid>
            {training.cards.map((card) => (
              <article className="card" key={card.title}>
                <h3>{card.title}</h3>
                <ul>
                  {card.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </article>
            ))}
          </ResidentialCampCardGrid>
        </div>
      </section>

      <section id="schedule" className="section">
        <div className="container">
          <div className="kicker">{schedule.kicker}</div>
          <h2>{schedule.h2}</h2>
          <div className="schedule">
            <div className="timeline">
              {schedule.timeline.map((item) => (
                <div className="timeitem" key={`${item.time_label}-${item.title}`}>
                  <strong>{item.time_label}</strong>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              ))}
            </div>
            <aside className="price">
              <small>{schedule.price.label}</small>
              <div className="amount">{schedule.price.amount}</div>
              <small>{schedule.price.includes_text}</small>
              <div className="pay">
                <b>{schedule.price.pay_now_title}</b>
                <span>{schedule.price.pay_now_subtitle}</span>
              </div>
              <p>
                <strong>{schedule.price.refund_label}</strong> {schedule.price.refund_text}
              </p>
              <a
                className="btn primary"
                href="#register"
                onClick={(e) => {
                  if (!onRegister) return
                  e.preventDefault()
                  onRegister()
                }}
              >
                {schedule.price.cta_label}
              </a>
            </aside>
          </div>
        </div>
      </section>

      <section className="section alt">
        <div className="container">
          <div className="kicker">{rules.kicker}</div>
          <h2>{rules.h2}</h2>
          <div className="rules">
            {rules.rules.map((rule) => (
              <div className="rule" key={rule}>
                {rule}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="register" className="cta">
        <div className="container">
          <div className="kicker" style={{ color: "#080808" }}>
            {register.kicker}
          </div>
          <h2>{register.h2}</h2>
          <p>{register.paragraph}</p>
          <div className="buttons">
            <button
              type="button"
              className="btn"
              onClick={() => onRegister?.()}
            >
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

      <footer className="footer">
        <div className="container">
          <strong>{footer.academy_name}</strong>
          <br />
          {footer.tagline}
          <br />
          <span>{footer.camp_line}</span>
        </div>
      </footer>
    </div>
  )
}
