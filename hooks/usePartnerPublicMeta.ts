"use client"

import { useEffect, useState } from "react"
import { partnerOrgAPI } from "@/lib/partnerOrgAPI"
import { useToast } from "@/hooks/use-toast"

export function usePartnerPublicMeta(slug: string) {
  const { toast } = useToast()
  const [partnerName, setPartnerName] = useState("")
  const [loadingMeta, setLoadingMeta] = useState(true)
  const [disabled, setDisabled] = useState(false)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!slug) return
      setLoadingMeta(true)
      setNotFound(false)
      try {
        const meta = await partnerOrgAPI.publicBySlug(slug)
        if (cancelled) return
        setPartnerName(meta.name || slug)
        setDisabled(
          meta.is_active === false ||
            meta.status === "disabled" ||
            meta.effective_status === "expired" ||
            meta.effective_status === "deactivated"
        )
      } catch {
        if (!cancelled) {
          setPartnerName("")
          setNotFound(true)
          toast({
            title: "Partner not found",
            description: "Check the login link and try again.",
            variant: "destructive",
          })
        }
      } finally {
        if (!cancelled) setLoadingMeta(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [slug, toast])

  return { partnerName, loadingMeta, disabled, notFound }
}
