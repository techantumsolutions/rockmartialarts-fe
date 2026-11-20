"use client"

import { useEffect } from "react"
import { portalLabel, type PortalShell } from "@/lib/portalIdentity"

/** Sets document.title for client-only shells (e.g. training dashboard). */
export function DocumentTitle({ shell }: { shell: PortalShell }) {
  useEffect(() => {
    document.title = portalLabel(shell)
  }, [shell])
  return null
}
