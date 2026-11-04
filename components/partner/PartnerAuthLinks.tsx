"use client"

import { Fragment } from "react"
import Link from "next/link"

type PartnerAuthRole = "admin" | "branch_manager" | "coach" | "student"

const ROLE_PATHS: Record<PartnerAuthRole, string> = {
  admin: "login",
  branch_manager: "branch-manager/login",
  coach: "coach/login",
  student: "student/login",
}

const ROLE_LABELS: Record<PartnerAuthRole, string> = {
  admin: "Admin Login",
  branch_manager: "Branch Admin",
  coach: "Coach Login",
  student: "Student Login",
}

export function partnerLoginHref(slug: string, role: PartnerAuthRole) {
  const base = `/partners/${slug}`
  const path = ROLE_PATHS[role]
  return path === "login" ? `${base}/login` : `${base}/${path}`
}

export function PartnerAuthLinks({
  slug,
  current,
}: {
  slug: string
  current: PartnerAuthRole
}) {
  const others = (Object.keys(ROLE_PATHS) as PartnerAuthRole[]).filter((r) => r !== current)

  return (
    <div className="pt-2 space-y-2">
      <p className="text-center text-xs text-muted-foreground">Other logins</p>
      <div className="flex flex-wrap justify-center items-center text-sm">
        {others.map((role, i) => (
          <Fragment key={role}>
            {i > 0 ? <span className="mx-2 text-gray-300 select-none" aria-hidden>|</span> : null}
            <Link
              href={partnerLoginHref(slug, role)}
              className="text-gray-500 hover:text-gray-800 transition-colors"
            >
              {ROLE_LABELS[role]}
            </Link>
          </Fragment>
        ))}
      </div>
    </div>
  )
}
