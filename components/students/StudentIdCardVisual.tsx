"use client"

import { forwardRef } from "react"
import { resolvePublicAssetUrl } from "@/lib/resolvePublicAssetUrl"

export const STUDENT_ID_CARD_WIDTH = 1024
export const STUDENT_ID_CARD_HEIGHT = 682

export type StudentIdCardVisualProps = {
  fullName: string
  cardNumber: string
  branchName: string
  courseName: string
  beltRank?: string
  batchName?: string
  dateOfJoining?: string
  validUntil?: string
  accountStatus?: string
  photoUrl?: string | null
  /** data URL or absolute URL for QR PNG */
  qrImageSrc?: string | null
  className?: string
}

const SEAL = "/assets/img/rmaa-seal.png"
const PHOTO_FALLBACK = "/assets/img/glry_img3.jpg"
const WEBSITE = "WWW.ROCKMARTIALARTSACADEMY.COM"

/**
 * Print-ready Student ID card — black / gold warrior design matching approved mock.
 * Fixed 1024×682 canvas for crisp PNG/PDF export.
 */
export const StudentIdCardVisual = forwardRef<HTMLDivElement, StudentIdCardVisualProps>(
  function StudentIdCardVisual(
    {
      fullName,
      cardNumber,
      branchName,
      courseName,
      beltRank = "—",
      batchName = "—",
      dateOfJoining = "—",
      validUntil = "—",
      photoUrl,
      qrImageSrc,
      className = "",
    },
    ref
  ) {
    const photo =
      (photoUrl && (resolvePublicAssetUrl(photoUrl) || photoUrl)) || PHOTO_FALLBACK

    const fields: { icon: FieldIcon; label: string; value: string; belt?: boolean }[] = [
      { icon: "user", label: "STUDENT NAME", value: fullName || "—" },
      { icon: "id", label: "STUDENT ID", value: cardNumber || "—" },
      { icon: "course", label: "COURSE", value: courseName || "—" },
      { icon: "belt", label: "BELT RANK", value: beltRank || "—", belt: true },
      { icon: "pin", label: "BRANCH", value: branchName || "—" },
      { icon: "batch", label: "BATCH", value: batchName || "—" },
      { icon: "join", label: "DATE OF JOINING", value: dateOfJoining || "—" },
      { icon: "valid", label: "VALID UNTIL", value: validUntil || "—" },
    ]

    return (
      <div
        ref={ref}
        className={`student-id-card-root relative overflow-hidden text-white ${className}`}
        style={{
          width: STUDENT_ID_CARD_WIDTH,
          height: STUDENT_ID_CARD_HEIGHT,
          borderRadius: 28,
          background:
            "radial-gradient(ellipse at 20% 0%, #2a2a2a 0%, #0c0c0c 42%, #050505 100%)",
          boxShadow: "0 22px 60px rgba(0,0,0,0.55)",
          fontFamily:
            "var(--font-oswald), 'Oswald', 'Montserrat', 'Segoe UI', system-ui, sans-serif",
        }}
        data-id-card="true"
      >
        {/* Grunge / brush texture overlays */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 12% 18%, rgba(255,183,15,0.35), transparent 28%), radial-gradient(circle at 88% 12%, rgba(255,183,15,0.22), transparent 24%), radial-gradient(circle at 70% 80%, rgba(255,255,255,0.06), transparent 30%)",
          }}
          aria-hidden
        />
        <svg
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          width="100%"
          height="100%"
          aria-hidden
        >
          <filter id="idCardNoise">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#idCardNoise)" />
        </svg>

        {/* Lanyard punch hole */}
        <div
          className="absolute left-1/2 z-20 -translate-x-1/2 rounded-full border-2 border-[#FFB70F]/70 bg-[#111]"
          style={{ top: 10, width: 54, height: 14, boxShadow: "inset 0 0 0 3px #050505" }}
          aria-hidden
        />

        {/* ===== HEADER ===== */}
        <div className="relative z-10 flex items-start gap-4 px-7 pt-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={SEAL}
            alt=""
            width={92}
            height={92}
            className="h-[92px] w-[92px] shrink-0 rounded-full border-[3px] border-[#FFB70F] object-cover bg-black"
            crossOrigin="anonymous"
            draggable={false}
          />

          <div className="min-w-0 flex-1 pt-1">
            <p
              className="text-[54px] font-black uppercase leading-[0.9] tracking-[0.02em] text-white"
              style={{
                fontFamily: "'Oswald', Impact, 'Arial Black', sans-serif",
                textShadow: "0 2px 0 rgba(0,0,0,0.45)",
              }}
            >
              ROCK
            </p>
            <p
              className="mt-0.5 text-[26px] font-extrabold uppercase leading-none tracking-[0.08em] text-[#FFB70F]"
              style={{ fontFamily: "'Oswald', Impact, sans-serif" }}
            >
              MARTIAL ARTS ACADEMY
            </p>
            <p className="mt-2 text-[12px] font-semibold italic tracking-[0.18em] text-white/85">
              BECOME THE STRONGEST VERSION OF YOURSELF
            </p>
          </div>

          {/* Kick silhouette on gold brush */}
          <div className="relative mt-1 h-[108px] w-[118px] shrink-0">
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background:
                  "radial-gradient(circle, #FFB70F 0%, #FFB70F 55%, rgba(255,183,15,0.15) 70%, transparent 78%)",
                transform: "scale(1.05)",
              }}
            />
            <KickSilhouette className="absolute inset-0 m-auto h-[96px] w-[96px] text-black" />
          </div>
        </div>

        {/* ===== BODY ===== */}
        <div className="relative z-10 mt-3 flex gap-5 px-7">
          {/* Photo + motto */}
          <div className="w-[168px] shrink-0">
            <div
              className="overflow-hidden rounded-[14px] border-[3px] border-[#FFB70F] bg-[#1a1a1a]"
              style={{ width: 168, height: 188 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo}
                alt={fullName}
                className="h-full w-full object-cover object-top"
                crossOrigin="anonymous"
                draggable={false}
                onError={(e) => {
                  const el = e.currentTarget
                  if (el.src !== PHOTO_FALLBACK) el.src = PHOTO_FALLBACK
                }}
              />
            </div>
            <p
              className="mt-2 text-center text-[11px] font-bold italic tracking-[0.12em] text-[#FFB70F]"
              style={{ fontFamily: "'Oswald', sans-serif" }}
            >
              WARRIOR. DISCIPLINE. RESPECT.
            </p>
          </div>

          {/* Fields */}
          <div className="min-w-0 flex-1 space-y-[5px] pt-0.5">
            {fields.map((f) => (
              <InfoRow
                key={f.label}
                icon={f.icon}
                label={f.label}
                value={f.value}
                showBelt={Boolean(f.belt)}
              />
            ))}
          </div>

          {/* QR */}
          <div className="flex w-[168px] shrink-0 flex-col items-center pt-1">
            <div
              className="flex items-center justify-center rounded-xl border border-[#FFB70F]/35 bg-white p-2.5"
              style={{ width: 156, height: 156 }}
            >
              {qrImageSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrImageSrc}
                  alt="Verification QR"
                  className="h-full w-full object-contain"
                  crossOrigin="anonymous"
                  draggable={false}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-center text-[11px] text-[#9CA3AF]">
                  QR pending
                </div>
              )}
            </div>
            <div
              className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-black"
              style={{ background: "#FFB70F" }}
            >
              <PhoneScanIcon className="h-3.5 w-3.5 shrink-0" />
              <span>SCAN TO VIEW PROFILE</span>
            </div>
          </div>
        </div>

        {/* ===== FOOTER ===== */}
        <div className="absolute inset-x-0 bottom-0 z-10 px-6 pb-3 pt-2">
          <div className="mb-2 flex items-end justify-between gap-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {[
                { label: "TRAIN HARD", icon: "fist" as const },
                { label: "STAY FOCUSED", icon: "eye" as const },
                { label: "ACHIEVE GREATNESS", icon: "trophy" as const },
                { label: "BE A WARRIOR", icon: "shield" as const },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FFB70F] text-black">
                    <ValueIcon kind={item.icon} />
                  </span>
                  <span className="text-[9px] font-extrabold uppercase tracking-[0.06em] text-[#FFB70F]">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Silhouette strip */}
            <div
              className="relative h-[54px] w-[280px] shrink-0 overflow-hidden"
              style={{
                background: "#FFB70F",
                clipPath: "polygon(4% 0, 100% 8%, 98% 100%, 0 92%)",
              }}
            >
              <div className="flex h-full items-end justify-around px-2 pb-1">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <PoseSilhouette key={i} variant={i} className="h-10 w-7 text-black" />
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-[11px] font-bold tracking-[0.22em] text-white/90">
            <GlobeIcon className="h-3.5 w-3.5 text-[#FFB70F]" />
            <span>{WEBSITE}</span>
          </div>
        </div>
      </div>
    )
  }
)

type FieldIcon = "user" | "id" | "course" | "belt" | "pin" | "batch" | "join" | "valid"

function InfoRow({
  icon,
  label,
  value,
  showBelt,
}: {
  icon: FieldIcon
  label: string
  value: string
  showBelt?: boolean
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center text-[#FFB70F]">
        <FieldGlyph kind={icon} />
      </span>
      <span className="w-[138px] shrink-0 text-[11px] font-bold uppercase tracking-[0.08em] text-[#FFB70F]/95">
        {label}
      </span>
      <span className="text-[11px] font-bold text-[#FFB70F]/80" aria-hidden>
        :
      </span>
      <span
        className="min-w-0 truncate text-[13px] font-extrabold uppercase tracking-wide text-white"
        title={value}
      >
        {value}
      </span>
      {showBelt && value && value !== "—" ? (
        <span
          className="ml-1 inline-block h-2.5 w-10 shrink-0 rounded-sm"
          style={{
            background: "linear-gradient(90deg, #F5C134 0%, #FFE08A 45%, #F5C134 100%)",
            boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.25)",
          }}
          aria-hidden
        />
      ) : null}
    </div>
  )
}

function FieldGlyph({ kind }: { kind: FieldIcon }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  }
  switch (kind) {
    case "user":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 19c1.8-3.2 4-4.8 7-4.8S17.2 15.8 19 19" />
        </svg>
      )
    case "id":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <circle cx="9" cy="12" r="2" fill="currentColor" stroke="none" />
          <path d="M13 10h5M13 14h4" />
        </svg>
      )
    case "course":
      return (
        <svg {...common}>
          <path d="M4 8l8-3 8 3-8 3-8-3z" />
          <path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5" />
        </svg>
      )
    case "belt":
      return (
        <svg {...common}>
          <path d="M3 12h18" />
          <path d="M7 9v6M17 9v6" />
          <path d="M10 11h4v2h-4z" fill="currentColor" stroke="none" />
        </svg>
      )
    case "pin":
      return (
        <svg {...common}>
          <path d="M12 21s7-5.2 7-11a7 7 0 10-14 0c0 5.8 7 11 7 11z" />
          <circle cx="12" cy="10" r="2.2" />
        </svg>
      )
    case "batch":
      return (
        <svg {...common}>
          <circle cx="9" cy="9" r="2.5" />
          <circle cx="16" cy="9" r="2.5" />
          <path d="M4 19c1.2-2.4 2.8-3.6 5-3.6s3.8 1.2 5 3.6" />
          <path d="M12 19c1-2 2.4-3 4-3s3 1 4 3" />
        </svg>
      )
    case "join":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
      )
    case "valid":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v5l3 2" />
        </svg>
      )
  }
}

function KickSilhouette({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 140" fill="currentColor" aria-hidden>
      <circle cx="62" cy="18" r="12" />
      <path d="M54 34c8 1 16 4 26 14 6 6 12 9 20 10l-3 10c-8-1-14-5-20-11-5-5-9-8-14-9v24c9 3 15 11 17 22 1 6-1 12-3 17l-12-3c2-4 3-8 2-11-2-7-7-12-14-14-2 9-5 19-5 30v18H36V90c0-14 2-28 6-40-7 1-13 5-18 12l-8-8c8-10 18-17 30-17 3 0 5 0 8 1z" />
    </svg>
  )
}

function PoseSilhouette({
  variant,
  className = "",
}: {
  variant: number
  className?: string
}) {
  const paths = [
    "M12 6a3 3 0 110 6 3 3 0 010-6zm-1 8h2l1 4 3 2-1 2-3-1-1 5H10l-1-5-3 1-1-2 3-2 1-4z",
    "M12 5a3 3 0 110 6 3 3 0 010-6zM9 13h6l1 5 4-1 1 2-5 2-1 5H9l-1-5-5-2 1-2 4 1 1-5z",
    "M12 6a3 3 0 110 6 3 3 0 010-6zm-2 8h4l2 4 4 6-2 1-4-5-1 7H9l-1-7-4 5-2-1 4-6 2-4z",
    "M12 5a3 3 0 110 6 3 3 0 010-6zM8 13h8v3l3 8h-3l-2-5-1 7H9l-1-7-2 5H3l3-8v-3z",
    "M12 6a3 3 0 110 6 3 3 0 010-6zm0 8c3 0 5 1 7 3l-2 2c-1-1-3-2-5-2s-4 1-5 2l-2-2c2-2 4-3 7-3zm-1 6h2v8h-2z",
    "M12 5a3 3 0 110 6 3 3 0 010-6zM7 14l5-1 5 1 1 4-3 1v7h-2v-6h-2v6H9v-7l-3-1 1-4z",
  ]
  return (
    <svg className={className} viewBox="0 0 24 32" fill="currentColor" aria-hidden>
      <path d={paths[variant % paths.length]} />
    </svg>
  )
}

function ValueIcon({ kind }: { kind: "fist" | "eye" | "trophy" | "shield" }) {
  const common = {
    width: 12,
    height: 12,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  }
  if (kind === "fist") {
    return (
      <svg {...common}>
        <path d="M8 11V7a2 2 0 114 0v4M12 11V6a2 2 0 114 0v5M16 11V8a2 2 0 114 0v7c0 3-2.5 6-8 6s-8-3-8-6v-3a2 2 0 114 0" />
      </svg>
    )
  }
  if (kind === "eye") {
    return (
      <svg {...common}>
        <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    )
  }
  if (kind === "trophy") {
    return (
      <svg {...common}>
        <path d="M8 4h8v5a4 4 0 01-8 0V4zM6 5H4a2 2 0 002 4M18 5h2a2 2 0 01-2 4M12 13v3M9 20h6" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <path d="M12 3l8 3v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3z" />
    </svg>
  )
}

function PhoneScanIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="7" y="2" width="10" height="20" rx="2" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="18" r="1" fill="currentColor" />
    </svg>
  )
}

function GlobeIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}
