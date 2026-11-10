"use client"

import { useEffect, useState, type FormEvent } from "react"
import { usePathname } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { isPartnerOrgSitePath } from "@/lib/partnerOrgSitePath"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { formatApiErrorPayload } from "@/lib/formatApiError"
import { useCMS } from "@/contexts/CMSContext"
import { resolvePopupForm } from "@/lib/popupForm"
import {
  extractIndianMobileDigits,
  isValidIndianMobileNational,
  toIndianE164FromNational,
} from "@/lib/indianMobile"
import { LeadPhoneOtpSection } from "@/components/website/LeadPhoneOtpSection"

interface BranchOption {
  id: string
  name: string
}

/** Only set after OTP-verified lead submit. Legacy "1" / skip markers are ignored. */
const STORAGE_KEY = "rock_visitor_otp_verified_v2"
const SKIP_STORAGE_KEY = "rock_visitor_otp_skipped_v1"
const LEGACY_SKIP_KEYS = ["rock_lead_captured"]

function readVerifiedVisitorMarker(): string | null {
  if (typeof window === "undefined") return null
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  // Expect verified|<phoneDigits>|<isoTimestamp>
  const parts = raw.split("|")
  if (parts.length < 3 || parts[0] !== "verified") return null
  if (!/^\d{10}$/.test(parts[1] || "")) return null
  return raw
}

function readSkipMarker(): boolean {
  if (typeof window === "undefined") return false
  const raw = window.localStorage.getItem(SKIP_STORAGE_KEY)
  if (!raw) return false
  return raw.startsWith("skipped|")
}

export function LeadCaptureModal() {
  const pathname = usePathname()
  const { toast } = useToast()
  const { cms, loading: cmsLoading } = useCMS()
  const popup = resolvePopupForm(cms?.homepage?.popup_form)
  const hideForPartnerSite = isPartnerOrgSitePath(pathname)

  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [branchId, setBranchId] = useState("")
  const [branches, setBranches] = useState<BranchOption[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [verificationToken, setVerificationToken] = useState<string | null>(null)

  const phoneDigits = extractIndianMobileDigits(phone).slice(0, 10)
  const phoneValid = isValidIndianMobileNational(phoneDigits)
  const apiPhone = phoneValid ? toIndianE164FromNational(phoneDigits) : ""

  useEffect(() => {
    if (typeof window === "undefined") return
    // Purge legacy skip/bypass markers that granted access without OTP.
    for (const k of LEGACY_SKIP_KEYS) {
      try {
        window.localStorage.removeItem(k)
      } catch {
        /* ignore */
      }
    }
    // If admin disables Skip, clear prior skip so the gate reappears.
    if (!popup.skip_enabled) {
      try {
        window.localStorage.removeItem(SKIP_STORAGE_KEY)
      } catch {
        /* ignore */
      }
    }
    if (hideForPartnerSite) {
      setOpen(false)
      return
    }
    if (cmsLoading) return
    if (!popup.enabled) {
      setOpen(false)
      return
    }
    const alreadyVerified = readVerifiedVisitorMarker()
    const alreadySkipped = popup.skip_enabled && readSkipMarker()
    if (!alreadyVerified && !alreadySkipped) {
      setOpen(true)
      if (popup.branch_enabled) fetchBranches()
    } else {
      setOpen(false)
    }
  }, [cmsLoading, popup.enabled, popup.branch_enabled, popup.skip_enabled, hideForPartnerSite])

  function handleSkip() {
    if (!popup.skip_enabled) return
    try {
      window.localStorage.setItem(SKIP_STORAGE_KEY, `skipped|${new Date().toISOString()}`)
    } catch {
      /* ignore */
    }
    setOpen(false)
  }

  async function fetchBranches() {
    try {
      const res = await fetch("/api/branches/public", {
        headers: { "Content-Type": "application/json" },
      })
      if (!res.ok) return
      const data = await res.json()
      const list = Array.isArray(data.branches) ? data.branches : []
      const options: BranchOption[] = list.map((b: any) => ({
        id: b.id ?? b._id ?? "",
        name: b.branch?.name ?? b.name ?? b.branch?.code ?? "Branch",
      })).filter((b) => b.id && b.name)
      setBranches(options)
    } catch {
      // ignore, modal will still render without branches
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const missing: string[] = []
    if (popup.name_enabled && !name.trim()) missing.push("name")
    if (popup.phone_enabled && !phoneValid) missing.push("a valid 10-digit mobile number")
    if (popup.branch_enabled && !branchId) missing.push("branch")
    if (missing.length) {
      const msg =
        missing.length === 1
          ? `Please enter your ${missing[0]}.`
          : `Please enter your ${missing.slice(0, -1).join(", ")} and ${missing[missing.length - 1]}.`
      setSubmitError(msg)
      toast({ title: "Missing information", description: msg, variant: "destructive" })
      return
    }
    if (popup.phone_enabled && !verificationToken) {
      const msg = "Please verify your mobile number with the OTP."
      setSubmitError(msg)
      toast({ title: "Verify mobile", description: msg, variant: "destructive" })
      return
    }

    const branchName = branches.find((b) => b.id === branchId)?.name ?? ""
    try {
      setSubmitting(true)
      setSubmitError(null)
      const payload: Record<string, string | undefined> = {
        source: "website_popup",
        source_type: "website_popup",
      }
      if (popup.name_enabled) payload.name = name.trim()
      if (popup.phone_enabled) {
        payload.phone = apiPhone || phoneDigits
        payload.verification_token = verificationToken || undefined
      }
      if (popup.branch_enabled) {
        payload.branch_id = branchId
        payload.branch_name = branchName || undefined
      }
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = formatApiErrorPayload(data)
        setSubmitError(msg)
        toast({
          title: "Could not submit",
          description: msg,
          variant: "destructive",
        })
        return
      }
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          STORAGE_KEY,
          `verified|${phoneDigits}|${new Date().toISOString()}`
        )
        for (const k of LEGACY_SKIP_KEYS) {
          window.localStorage.removeItem(k)
        }
      }
      toast({
        title: "Thank you!",
        description: "We've received your details. Our team will contact you soon.",
      })
      setOpen(false)
      setName("")
      setPhone("")
      setBranchId("")
      setVerificationToken(null)
    } catch {
      const msg = "Please try again in a moment."
      setSubmitError(msg)
      toast({
        title: "Network error",
        description: msg,
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  const submitDisabled =
    submitting || !phoneValid || !verificationToken || (popup.name_enabled && !name.trim())

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // When Skip is disabled, ignore dismiss attempts (Esc / outside).
        if (!next && !popup.skip_enabled) return
        if (!next && popup.skip_enabled) {
          handleSkip()
          return
        }
        setOpen(next)
      }}
    >
      <DialogContent
        className="max-w-md border-gray-200 bg-white text-gray-900 shadow-xl"
        showCloseButton={popup.skip_enabled}
        onPointerDownOutside={(e) => {
          if (!popup.skip_enabled) e.preventDefault()
        }}
        onEscapeKeyDown={(e) => {
          if (!popup.skip_enabled) e.preventDefault()
        }}
        onInteractOutside={(e) => {
          if (!popup.skip_enabled) e.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle>{popup.title}</DialogTitle>
          <DialogDescription className="text-gray-600">
            {popup.description}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {submitError ? (
            <div
              role="alert"
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            >
              {submitError}
            </div>
          ) : null}
          {popup.name_enabled ? (
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-800">Name</label>
              <Input
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  setSubmitError(null)
                }}
                placeholder="Your full name"
                required
              />
            </div>
          ) : null}
          {popup.phone_enabled ? (
            <div className="space-y-2">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-800">Mobile number</label>
                <Input
                  value={phoneDigits}
                  onChange={(e) => {
                    const next = extractIndianMobileDigits(e.target.value).slice(0, 10)
                    setPhone(next)
                    setVerificationToken(null)
                    setSubmitError(null)
                  }}
                  placeholder="10-digit mobile number"
                  inputMode="numeric"
                  maxLength={10}
                  required
                />
              </div>
              <LeadPhoneOtpSection
                apiPhone={apiPhone}
                normalizedMobile={phoneDigits}
                readyForOtp={phoneValid}
                isVerified={Boolean(verificationToken)}
                onVerified={(token) => {
                  setVerificationToken(token)
                  setSubmitError(null)
                }}
              />
            </div>
          ) : null}
          {popup.branch_enabled ? (
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-800">Select branch</label>
              <Select
                value={branchId}
                onValueChange={(v) => {
                  setBranchId(v)
                  setSubmitError(null)
                }}
              >
                <SelectTrigger className="border-gray-200 bg-white text-gray-900">
                  <SelectValue placeholder="Choose a branch" />
                </SelectTrigger>
                <SelectContent className="border-gray-200 bg-white text-gray-900">
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <Button
            type="submit"
            className="w-full bg-amber-500 text-white hover:bg-amber-600 disabled:pointer-events-auto disabled:cursor-not-allowed"
            disabled={submitDisabled}
          >
            {submitting ? "Submitting..." : "Submit"}
          </Button>
          {popup.skip_enabled ? (
            <Button
              type="button"
              variant="ghost"
              className="w-full text-gray-600 hover:text-gray-900"
              onClick={handleSkip}
            >
              Skip for now
            </Button>
          ) : (
            <p className="text-center text-xs text-gray-500">
              Mobile verification is required to continue browsing the site.
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}
