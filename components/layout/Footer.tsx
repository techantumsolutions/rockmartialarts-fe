"use client"

import { usePlatformBranding } from "@/contexts/PlatformBrandingContext"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"
import { formatAcademyPoweredBy } from "@/lib/portalIdentity"
import { useEffect, useState } from "react"

export default function Footer() {
  const currentYear = new Date().getFullYear()
  const { platformShortName, logoUrl, showAcademyPoweredBy } = usePlatformBranding()
  const [academyName, setAcademyName] = useState<string>("")

  useEffect(() => {
    try {
      const user = BranchManagerAuth.getCurrentUser?.()
      const name = user?.branch_name || ""
      if (name) setAcademyName(name)
    } catch {
      /* ignore */
    }
  }, [])

  const rightLabel =
    showAcademyPoweredBy && academyName
      ? formatAcademyPoweredBy(academyName)
      : `Powered by ${platformShortName}`

  return (
    <footer className="w-full border-t border-gray-200 bg-white py-4 px-4 sm:px-6 lg:px-8 mt-auto">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <img src={logoUrl} alt={platformShortName} className="h-6 w-auto" />
          <span>
            &copy; {currentYear} {platformShortName}. All rights reserved.
          </span>
        </div>
        <span>{rightLabel}</span>
      </div>
    </footer>
  )
}
