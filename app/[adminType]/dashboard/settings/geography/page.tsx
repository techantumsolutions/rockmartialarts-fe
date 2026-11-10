"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useDashboardBasePath } from "@/lib/useDashboardBasePath"

/** State & City now lives inside System Settings — keep old URL working. */
export default function GeographySettingsRedirectPage() {
  const router = useRouter()
  const basePath = useDashboardBasePath()

  useEffect(() => {
    router.replace(`${basePath}/settings?section=geography`)
  }, [router, basePath])

  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-[#64748B]">
      Opening State &amp; City in System Settings…
    </div>
  )
}
