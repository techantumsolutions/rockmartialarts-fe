"use client"

import { forwardRef, useEffect, useRef, useState } from "react"
import { campRegistrationDisplayCode } from "@/lib/campRegistration"
import { campFactValue, type ResidentialCampContent } from "@/lib/residentialCamp"

export const CAMP_TICKET_WIDTH = 1600
export const CAMP_TICKET_HEIGHT = 900

export type CampPaymentSuccess = {
  id?: string
  registration_id?: string
  event_name: string
  event_dates: string
  event_location: string
  participant_name: string
  fee_total: string
  fee_pay_now: string
  fee_balance: string
  refund_text: string
  razorpay_payment_id: string
}

const FOOTER_ITEMS = [
  { src: "/campaign/01_basic_stances.png", label: "Basic Stances" },
  { src: "/campaign/02_kungfu_forms.png", label: "Kungfu Forms" },
  { src: "/campaign/03_self_defense.png", label: "Self Defense" },
  { src: "/campaign/04_strength_fitness.png", label: "Strength & Fitness" },
  { src: "/campaign/05_discipline_focus.png", label: "Discipline & Focus" },
] as const

function formatPhone(raw: string) {
  const digits = (raw || "").replace(/\D/g, "")
  if (digits.length === 10) return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`
  if (digits.length === 12 && digits.startsWith("91")) return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`
  return raw || ""
}

function displayFee(text: string) {
  const amount = Number(String(text || "").replace(/[^\d.]/g, ""))
  if (!Number.isFinite(amount) || amount <= 0) return text || "—"
  return `₹${Math.round(amount).toLocaleString("en-IN")}`
}

function locationLines(location: string) {
  const idx = location.indexOf(",")
  if (idx === -1) return [location]
  return [location.slice(0, idx + 1), location.slice(idx + 1).trim()].filter(Boolean)
}

function campaignTitleParts(eventName?: string, content?: ResidentialCampContent) {
  const fallback = { line1: "Shaolin", line2: "Kungfu" }
  const raw = (eventName || content?.event_name || "").trim()
  const cleaned = raw
    .replace(/dussehra\s+special/gi, "")
    .replace(/residential\s+camp/gi, "")
    .replace(/[–—]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  const words = cleaned.split(" ").filter(Boolean)
  if (words.length >= 2) return { line1: words[0], line2: words.slice(1).join(" ") }
  if (words.length === 1) return { line1: words[0], line2: "" }
  const a = (content?.hero?.h1_line1 || "").trim()
  const b = (content?.hero?.h1_line2 || "").trim()
  if (a || b) return { line1: a || fallback.line1, line2: b || fallback.line2 }
  return fallback
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"
      />
    </svg>
  )
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.4 11.4 0 0 0 .57 3.6 1 1 0 0 1-.25 1z"
      />
    </svg>
  )
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 12a4.2 4.2 0 1 0-4.2-4.2A4.2 4.2 0 0 0 12 12zm0 1.8c-3.7 0-7 1.7-7 4.2V20h14v-2c0-2.5-3.3-4.2-7-4.2z"
      />
    </svg>
  )
}

function IdIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M4 5h16a1.5 1.5 0 0 1 1.5 1.5v11A1.5 1.5 0 0 1 20 19H4a1.5 1.5 0 0 1-1.5-1.5v-11A1.5 1.5 0 0 1 4 5zm1.5 3.2v1.6h7.5V8.2zm0 3.4v1.6h5.5v-1.6zM17 11.2a2 2 0 1 0 2 2 2 2 0 0 0-2-2z"
      />
    </svg>
  )
}

type TicketFaceProps = {
  data: CampPaymentSuccess
  academy: string
  locLines: string[]
  phone: string
  registrationId: string
  titleParts: { line1: string; line2: string }
}

function CampTicketFace({ data, academy, locLines, phone, registrationId, titleParts }: TicketFaceProps) {
  return (
    <>
            <section className="camp-ticket-hero">
              <header className="camp-ticket-header">
                <img className="camp-ticket-logo" src="/campaign/logo.png" alt="" />
                <div className="camp-ticket-brand">
                  <p className="camp-ticket-academy">{academy}</p>
                  <p className="camp-ticket-tagline">Discipline today&nbsp;&nbsp;a stronger tomorrow</p>
                </div>
                <span className="camp-ticket-header-rule" aria-hidden="true" />
                <div className="camp-ticket-champion-wrap">
                  <img className="camp-ticket-pagoda" src="/campaign/header1.png" alt="" />
                  <p className="camp-ticket-champion">
                    <span>Train like</span>
                    <span>a warrior.</span>
                    <span>Live like</span>
                    <span>a champion.</span>
                  </p>
                </div>
              </header>
              <div className="camp-ticket-hero-body">
                <div className="camp-ticket-banner-wrap">
                  <img className="camp-ticket-banner" src="/campaign/bannerleft.png" alt="" />
                </div>
                <div className="camp-ticket-copy">
                  <p className="camp-ticket-kicker">Dussehra Special</p>
                  <h3 className="camp-ticket-lockup">
                    <span className="is-shaolin italic">{titleParts.line1}</span>
                    {titleParts.line2 ? <span className="is-kungfu italic">{titleParts.line2}</span> : null}
                    <span className="camp-ticket-subtitle">Residential Camp</span>
                  </h3>
                  <div className="camp-ticket-days">
                    <img className="camp-ticket-days-brush" src="/campaign/bg.png" alt="" />
                    <span>6 Days Residential Camp</span>
                  </div>
                  <p className="camp-ticket-level">Level 1 — Beginner Training</p>
                  <p className="camp-ticket-audience">For all beginners | Kids to adults | All age groups</p>
                  <div className="camp-ticket-meta">
                    <p className="camp-ticket-place">
                      <PinIcon />
                      <span>
                        {locLines.map((line) => (
                          <span key={line}>{line}</span>
                        ))}
                      </span>
                    </p>
                    {phone ? (
                      <p className="camp-ticket-phone">
                        <PhoneIcon />
                        <span>{phone}</span>
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </section>

            <section className="camp-ticket-mid">
              <div className="camp-ticket-person">
                <div className="camp-ticket-field">
                  <span className="camp-ticket-icon">
                    <UserIcon />
                  </span>
                  <div className="camp-ticket-field-body">
                    <p className="camp-ticket-label">Participant name</p>
                    <p className="camp-ticket-value">{data.participant_name || "—"}</p>
                  </div>
                </div>
                <div className="camp-ticket-field">
                  <span className="camp-ticket-icon">
                    <IdIcon />
                  </span>
                  <div className="camp-ticket-field-body">
                    <p className="camp-ticket-label">Registration ID</p>
                    <p className="camp-ticket-value">{registrationId}</p>
                  </div>
                </div>
              </div>
              <div className="camp-ticket-pay">
                <div className="camp-ticket-pay-title">
                  <img
                    className="camp-ticket-pay-brush-img"
                    src="/campaign/payment-summary-brush.png"
                    alt="Payment summary"
                  />
                </div>
                <div className="camp-ticket-pay-box">
                  <div className="camp-ticket-pay-row">
                    <span>Total Fee</span>
                    <span>:</span>
                    <span>{displayFee(data.fee_total)}</span>
                  </div>
                  <div className="camp-ticket-pay-row">
                    <span>Paid</span>
                    <span>:</span>
                    <span>{displayFee(data.fee_pay_now)}</span>
                  </div>
                  <div className="camp-ticket-pay-row is-balance">
                    <span>Balance</span>
                    <span>:</span>
                    <span>{displayFee(data.fee_balance)}</span>
                  </div>
                  <p className="camp-ticket-pay-note">Balance Payable at Venue</p>
                </div>
              </div>
              <div className="camp-ticket-art">
                <img src="/campaign/secondsection.png" alt="" />
              </div>
            </section>

            <footer className="camp-ticket-footer">
              {FOOTER_ITEMS.map((item) => (
                <div key={item.label} className="camp-ticket-foot-item">
                  <img src={item.src} alt="" />
                  <span>{item.label}</span>
                </div>
              ))}
            </footer>
    </>
  )
}

type Props = {
  data: CampPaymentSuccess
  content?: ResidentialCampContent
}

export const CampRegistrationConfirmation = forwardRef<HTMLDivElement, Props>(
  function CampRegistrationConfirmation({ data, content }, ref) {
    const frameRef = useRef<HTMLDivElement | null>(null)
    const [scale, setScale] = useState(1)
    const registrationId = campRegistrationDisplayCode(data.registration_id, data.id)
    const academy = content?.footer?.academy_name || "ROCK MARTIAL ARTS ACADEMY"
    const location =
      data.event_location ||
      content?.event_location ||
      (content ? campFactValue(content, "Location") : "") ||
      academy
    const phone = formatPhone(content?.register?.phone || "")
    const locLines = locationLines(location)
    const titleParts = campaignTitleParts(data.event_name, content)
    const faceProps = {
      data,
      academy,
      locLines,
      phone,
      registrationId,
      titleParts,
    }

    useEffect(() => {
      const el = frameRef.current
      if (!el) return
      const update = () => setScale(Math.min(1, el.clientWidth / CAMP_TICKET_WIDTH))
      update()
      const ro = new ResizeObserver(update)
      ro.observe(el)
      return () => ro.disconnect()
    }, [])

    return (
      <>
      <div
        ref={frameRef}
        className="camp-ticket-frame"
        style={{ height: CAMP_TICKET_HEIGHT * scale }}
      >
        <div className="camp-ticket-scale" style={{ transform: `scale(${scale})` }}>
          <div className="camp-ticket">
            <CampTicketFace {...faceProps} />
          </div>
        </div>
      </div>
      <div className="camp-ticket-capture" aria-hidden="true">
        <div ref={ref} className="camp-ticket">
          <CampTicketFace {...faceProps} />
        </div>
      </div>
      </>
    )
  }
)

CampRegistrationConfirmation.displayName = "CampRegistrationConfirmation"
