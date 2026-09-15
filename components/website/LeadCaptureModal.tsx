"use client"

import { useEffect, useState, type FormEvent } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
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

const STORAGE_KEY = "rock_lead_captured"

export function LeadCaptureModal() {
  const { toast } = useToast()
  const { cms, loading: cmsLoading } = useCMS()
  const popup = resolvePopupForm(cms?.homepage?.popup_form)

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
    if (cmsLoading) return
    if (!popup.enabled) {
      setOpen(false)
      return
    }
    const alreadyCaptured = window.localStorage.getItem(STORAGE_KEY)
    if (!alreadyCaptured) {
      setOpen(true)
      if (popup.branch_enabled) fetchBranches()
    }
  }, [cmsLoading, popup.enabled, popup.branch_enabled])

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
        window.localStorage.setItem(STORAGE_KEY, "1")
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

  function handleSkip() {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, "1")
    }
    setOpen(false)
  }

  if (!open) return null

  const submitDisabled =
    submitting || (popup.phone_enabled && (!phoneValid || !verificationToken))

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-md border-gray-200 bg-white text-gray-900 shadow-xl" showCloseButton={false}>
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
            className="w-full bg-amber-500 text-white hover:bg-amber-600"
            disabled={submitDisabled}
          >
            {submitting ? "Submitting..." : "Submit"}
          </Button>
        </form>
        {popup.skip_enabled ? (
          <button
            type="button"
            onClick={handleSkip}
            className="mt-3 w-full text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            Skip for now
          </button>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
