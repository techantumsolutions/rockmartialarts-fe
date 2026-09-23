"use client"

import type { ReactNode } from "react"

const ICON_COLOR = "#E8C547"

function SvgWrap({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 48 48"
      width="36"
      height="36"
      fill="none"
      stroke={ICON_COLOR}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export function CampFeatureBarIcon({ iconKey }: { iconKey?: string }) {
  const key = (iconKey || "").trim().toLowerCase()

  if (key === "fitness") {
    return (
      <SvgWrap>
        <path d="M8 24h6M34 24h6" />
        <rect x="14" y="18" width="4" height="12" rx="1" />
        <rect x="30" y="18" width="4" height="12" rx="1" />
        <path d="M18 24h12" />
        <rect x="6" y="16" width="3" height="16" rx="1" />
        <rect x="39" y="16" width="3" height="16" rx="1" />
      </SvgWrap>
    )
  }

  if (key === "discipline") {
    return (
      <SvgWrap>
        <path d="M24 8c-6 4-10 10-10 16 0 8 4.5 14 10 16 5.5-2 10-8 10-16 0-6-4-12-10-16z" />
        <path d="M24 12v24" />
        <path d="M16 22c2 1 4 2 8 2s6-1 8-2" />
      </SvgWrap>
    )
  }

  if (key === "confidence") {
    return (
      <SvgWrap>
        <path d="M24 6l12 4v10c0 9-5.5 15.5-12 18-6.5-2.5-12-9-12-18V10l12-4z" />
        <path d="M24 16v12" />
        <path d="M24 16l4 8H20l4-8z" />
      </SvgWrap>
    )
  }

  if (key === "training") {
    return (
      <SvgWrap>
        <path d="M10 36h28" />
        <path d="M14 36V24l10-8 10 8v12" />
        <path d="M20 36V28h8v8" />
        <path d="M18 20l6-5 6 5" />
        <path d="M24 10v5" />
      </SvgWrap>
    )
  }

  if (key === "lifestyle") {
    return (
      <SvgWrap>
        <path d="M24 38c0-8 4-12 4-18a4 4 0 10-8 0c0 6 4 10 4 18" />
        <path d="M24 20c-4-4-10-4-12 0 2 4 8 4 12 0z" />
        <path d="M24 20c4-4 10-4 12 0-2 4-8 0-12 0z" />
        <path d="M24 16c-2-5-8-6-10-2 3 3 7 0 10 2z" />
        <path d="M24 16c2-5 8-6 10-2-3 3-7 0-10 2z" />
      </SvgWrap>
    )
  }

  return (
    <SvgWrap>
      <circle cx="24" cy="24" r="10" />
    </SvgWrap>
  )
}
