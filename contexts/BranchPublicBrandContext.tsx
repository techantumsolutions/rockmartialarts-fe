"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"

/** Partner-org branding overrides Rock CMS chrome on a public branch page. */
export type BranchPublicBrandOverride = {
  partnerOrgId: string
  orgName?: string | null
  logoUrl?: string | null
  logoAlt?: string | null
  footerLogoUrl?: string | null
  footerDescription?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  primaryColor?: string | null
  secondaryColor?: string | null
  /** When true, show WebsiteFooter on partner public pages (SA-controlled). */
  footerEnabled?: boolean
} | null

type Ctx = {
  override: BranchPublicBrandOverride
  setOverride: (next: BranchPublicBrandOverride) => void
  clearOverride: () => void
}

const BranchPublicBrandContext = createContext<Ctx | null>(null)

export function BranchPublicBrandProvider({ children }: { children: ReactNode }) {
  const [override, setOverrideState] = useState<BranchPublicBrandOverride>(null)
  const setOverride = useCallback((next: BranchPublicBrandOverride) => {
    setOverrideState(next)
  }, [])
  const clearOverride = useCallback(() => setOverrideState(null), [])
  const value = useMemo(
    () => ({ override, setOverride, clearOverride }),
    [override, setOverride, clearOverride]
  )
  return (
    <BranchPublicBrandContext.Provider value={value}>
      {children}
    </BranchPublicBrandContext.Provider>
  )
}

export function useBranchPublicBrand() {
  const ctx = useContext(BranchPublicBrandContext)
  if (!ctx) {
    return {
      override: null as BranchPublicBrandOverride,
      setOverride: (_next: BranchPublicBrandOverride) => {},
      clearOverride: () => {},
    }
  }
  return ctx
}
