"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, Save, Handshake } from "lucide-react"
import { getBackendApiUrl } from "@/lib/config"
import { TokenManager } from "@/lib/tokenManager"
import { useDashboardBasePath } from "@/lib/useDashboardBasePath"
import { useToast } from "@/hooks/use-toast"
import { PartnerCmsScopeBanner } from "@/components/partner/PartnerCmsScopeBanner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type PartnerBranchRow = {
  branch_id: string
  branch_name?: string
  branch_code?: string
  has_profile?: boolean
  partner_id?: string | null
  agreement_status?: string | null
}

type RegistrationForm = {
  legal_business_name: string
  trade_name: string
  registration_number: string
  gstin: string
  pan: string
  tan: string
  tax_notes: string
}

type ContactForm = {
  primary_contact_name: string
  primary_contact_designation: string
  primary_contact_phone: string
  primary_contact_email: string
  secondary_contact_name: string
  secondary_contact_phone: string
  secondary_contact_email: string
  billing_email: string
  support_phone: string
  address_line1: string
  address_line2: string
  area: string
  city: string
  state: string
  pincode: string
  country: string
}

type AgreementForm = {
  agreement_type: string
  agreement_reference: string
  agreement_status: string
  start_date: string
  end_date: string
  signed_on: string
  signed_by_name: string
  signed_by_designation: string
  revenue_share_percent: string
  notes: string
}

const emptyRegistration = (): RegistrationForm => ({
  legal_business_name: "",
  trade_name: "",
  registration_number: "",
  gstin: "",
  pan: "",
  tan: "",
  tax_notes: "",
})

const emptyContact = (): ContactForm => ({
  primary_contact_name: "",
  primary_contact_designation: "",
  primary_contact_phone: "",
  primary_contact_email: "",
  secondary_contact_name: "",
  secondary_contact_phone: "",
  secondary_contact_email: "",
  billing_email: "",
  support_phone: "",
  address_line1: "",
  address_line2: "",
  area: "",
  city: "",
  state: "",
  pincode: "",
  country: "India",
})

const emptyAgreement = (): AgreementForm => ({
  agreement_type: "",
  agreement_reference: "",
  agreement_status: "draft",
  start_date: "",
  end_date: "",
  signed_on: "",
  signed_by_name: "",
  signed_by_designation: "",
  revenue_share_percent: "",
  notes: "",
})

function str(v: unknown): string {
  return v == null ? "" : String(v)
}

export default function PartnerProfilesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const basePath = useDashboardBasePath()
  const { toast } = useToast()

  const [partners, setPartners] = useState<PartnerBranchRow[]>([])
  const [branchId, setBranchId] = useState("")
  const [partnerId, setPartnerId] = useState<string | null>(null)
  const [hasProfile, setHasProfile] = useState(false)
  const [branchName, setBranchName] = useState("")
  const [registration, setRegistration] = useState<RegistrationForm>(emptyRegistration)
  const [contact, setContact] = useState<ContactForm>(emptyContact)
  const [agreement, setAgreement] = useState<AgreementForm>(emptyAgreement)
  const [loadingList, setLoadingList] = useState(true)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [saving, setSaving] = useState(false)

  function authHeaders(): HeadersInit {
    const token = TokenManager.getToken()
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }
  }

  const loadPartners = useCallback(async () => {
    const token = TokenManager.getToken()
    if (!token) {
      router.push("/login")
      return
    }
    try {
      setLoadingList(true)
      const res = await fetch(
        getBackendApiUrl("collaboration-partners/partner-branches?limit=200"),
        { headers: authHeaders() }
      )
      if (!res.ok) {
        throw new Error("Failed to load partner branches")
      }
      const data = await res.json()
      const list: PartnerBranchRow[] = data.partners || []
      setPartners(list)
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message || "Could not load partner branches",
        variant: "destructive",
      })
    } finally {
      setLoadingList(false)
    }
  }, [router, toast])

  const loadProfile = useCallback(
    async (id: string) => {
      if (!id) return
      try {
        setLoadingProfile(true)
        const res = await fetch(
          getBackendApiUrl(`collaboration-partners/branches/${id}/profile`),
          { headers: authHeaders() }
        )
        if (res.status === 403) {
          toast({
            title: "Not a collaboration partner",
            description: "Enable Is Collaboration Partner on the branch first.",
            variant: "destructive",
          })
          setBranchId("")
          return
        }
        if (!res.ok) {
          throw new Error("Failed to load partner profile")
        }
        const data = await res.json()
        setPartnerId(data.partner_id || null)
        setHasProfile(!!data.has_profile)
        setBranchName(data.branch_snapshot?.name || "")
        const reg = data.registration || {}
        setRegistration({
          legal_business_name: str(reg.legal_business_name),
          trade_name: str(reg.trade_name),
          registration_number: str(reg.registration_number),
          gstin: str(reg.gstin),
          pan: str(reg.pan),
          tan: str(reg.tan),
          tax_notes: str(reg.tax_notes),
        })
        const c = data.contact || {}
        setContact({
          primary_contact_name: str(c.primary_contact_name),
          primary_contact_designation: str(c.primary_contact_designation),
          primary_contact_phone: str(c.primary_contact_phone),
          primary_contact_email: str(c.primary_contact_email),
          secondary_contact_name: str(c.secondary_contact_name),
          secondary_contact_phone: str(c.secondary_contact_phone),
          secondary_contact_email: str(c.secondary_contact_email),
          billing_email: str(c.billing_email),
          support_phone: str(c.support_phone),
          address_line1: str(c.address_line1),
          address_line2: str(c.address_line2),
          area: str(c.area),
          city: str(c.city),
          state: str(c.state),
          pincode: str(c.pincode),
          country: str(c.country) || "India",
        })
        const a = data.agreement || {}
        setAgreement({
          agreement_type: str(a.agreement_type),
          agreement_reference: str(a.agreement_reference),
          agreement_status: str(a.agreement_status) || "draft",
          start_date: str(a.start_date),
          end_date: str(a.end_date),
          signed_on: str(a.signed_on),
          signed_by_name: str(a.signed_by_name),
          signed_by_designation: str(a.signed_by_designation),
          revenue_share_percent:
            a.revenue_share_percent == null ? "" : String(a.revenue_share_percent),
          notes: str(a.notes),
        })
      } catch (e: any) {
        toast({
          title: "Error",
          description: e?.message || "Could not load profile",
          variant: "destructive",
        })
      } finally {
        setLoadingProfile(false)
      }
    },
    [toast]
  )

  useEffect(() => {
    loadPartners()
  }, [loadPartners])

  useEffect(() => {
    const fromQuery = searchParams?.get("branchId") || ""
    if (fromQuery && !branchId) {
      setBranchId(fromQuery)
    }
  }, [searchParams, branchId])

  useEffect(() => {
    if (branchId) {
      loadProfile(branchId)
    } else {
      setPartnerId(null)
      setHasProfile(false)
      setBranchName("")
      setRegistration(emptyRegistration())
      setContact(emptyContact())
      setAgreement(emptyAgreement())
    }
  }, [branchId, loadProfile])

  async function handleSave() {
    if (!branchId) {
      toast({
        title: "Select a partner branch",
        description: "Choose a collaboration partner branch to save the profile.",
        variant: "destructive",
      })
      return
    }
    try {
      setSaving(true)
      const revenue =
        agreement.revenue_share_percent.trim() === ""
          ? null
          : Number(agreement.revenue_share_percent)
      const body = {
        registration: {
          ...registration,
          legal_business_name: registration.legal_business_name || null,
          trade_name: registration.trade_name || null,
          registration_number: registration.registration_number || null,
          gstin: registration.gstin || null,
          pan: registration.pan || null,
          tan: registration.tan || null,
          tax_notes: registration.tax_notes || null,
        },
        contact: {
          ...contact,
          primary_contact_name: contact.primary_contact_name || null,
          primary_contact_designation: contact.primary_contact_designation || null,
          primary_contact_phone: contact.primary_contact_phone || null,
          primary_contact_email: contact.primary_contact_email || null,
          secondary_contact_name: contact.secondary_contact_name || null,
          secondary_contact_phone: contact.secondary_contact_phone || null,
          secondary_contact_email: contact.secondary_contact_email || null,
          billing_email: contact.billing_email || null,
          support_phone: contact.support_phone || null,
          address_line1: contact.address_line1 || null,
          address_line2: contact.address_line2 || null,
          area: contact.area || null,
          city: contact.city || null,
          state: contact.state || null,
          pincode: contact.pincode || null,
          country: contact.country || "India",
        },
        agreement: {
          agreement_type: agreement.agreement_type || null,
          agreement_reference: agreement.agreement_reference || null,
          agreement_status: agreement.agreement_status || "draft",
          start_date: agreement.start_date || null,
          end_date: agreement.end_date || null,
          signed_on: agreement.signed_on || null,
          signed_by_name: agreement.signed_by_name || null,
          signed_by_designation: agreement.signed_by_designation || null,
          revenue_share_percent:
            revenue == null || Number.isNaN(revenue) ? null : revenue,
          notes: agreement.notes || null,
        },
      }
      const res = await fetch(
        getBackendApiUrl(`collaboration-partners/branches/${branchId}/profile`),
        {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify(body),
        }
      )
      if (res.status === 403) {
        toast({
          title: "Partner features disabled",
          description: "This branch is not marked as a collaboration partner.",
          variant: "destructive",
        })
        return
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || "Save failed")
      }
      const data = await res.json()
      const profile = data.profile || {}
      setPartnerId(profile.partner_id || null)
      setHasProfile(true)
      toast({
        title: "Saved",
        description: data.message || "Partner profile saved successfully.",
      })
      await loadPartners()
    } catch (e: any) {
      toast({
        title: "Save failed",
        description: e?.message || "Could not save partner profile",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-1 rounded-md bg-amber-50 border border-amber-200 p-2">
            <Handshake className="w-5 h-5 text-amber-800" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[#1a2332]">
              Partner Business & Contact Profile
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Registration, tax, contacts, and agreement details for collaboration
              partner branches only.
            </p>
          </div>
        </div>
        <Button
          onClick={handleSave}
          disabled={!branchId || saving || loadingProfile}
          className="bg-[#FFC403] text-[#1a2332] hover:bg-[#e6b003]"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save profile
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Partner branch</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingList ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading partner branches…
            </div>
          ) : partners.length === 0 ? (
            <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-600">
              No collaboration partner branches yet. Open a branch, set{" "}
              <span className="font-medium">Is Collaboration Partner</span> to Yes,
              then return here.
              <div className="mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`${basePath}/branches`)}
                >
                  Go to Branches
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Select partner branch</Label>
                <Select value={branchId || undefined} onValueChange={setBranchId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a partner branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {partners.map((p) => (
                      <SelectItem key={p.branch_id} value={p.branch_id}>
                        {p.branch_name || "Branch"}
                        {p.branch_code ? ` (${p.branch_code})` : ""}
                        {p.has_profile ? "" : " — profile pending"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Partner ID</Label>
                <Input
                  value={partnerId || (branchId ? "Assigned on first save" : "—")}
                  readOnly
                  className="bg-gray-50 font-mono text-sm"
                />
                <p className="text-xs text-gray-500">
                  Auto-generated and read-only. Format: CP-YYYYMMDD-000001
                </p>
              </div>
            </div>
          )}
          {branchId && branchName && (
            <p className="text-xs text-gray-500">
              Editing profile for <span className="font-medium">{branchName}</span>
              {hasProfile ? "" : " (new profile — Partner ID will be created on save)"}
            </p>
          )}
        </CardContent>
      </Card>

      {branchId && (
        <>
          {loadingProfile ? (
            <div className="flex items-center justify-center py-16 text-sm text-gray-500">
              <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading profile…
            </div>
          ) : (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Registration & tax</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Legal business name</Label>
                    <Input
                      value={registration.legal_business_name}
                      onChange={(e) =>
                        setRegistration({
                          ...registration,
                          legal_business_name: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Trade name</Label>
                    <Input
                      value={registration.trade_name}
                      onChange={(e) =>
                        setRegistration({ ...registration, trade_name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Business registration number</Label>
                    <Input
                      value={registration.registration_number}
                      onChange={(e) =>
                        setRegistration({
                          ...registration,
                          registration_number: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>GSTIN</Label>
                    <Input
                      value={registration.gstin}
                      onChange={(e) =>
                        setRegistration({ ...registration, gstin: e.target.value })
                      }
                      placeholder="22AAAAA0000A1Z5"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>PAN</Label>
                    <Input
                      value={registration.pan}
                      onChange={(e) =>
                        setRegistration({ ...registration, pan: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>TAN</Label>
                    <Input
                      value={registration.tan}
                      onChange={(e) =>
                        setRegistration({ ...registration, tan: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Tax notes</Label>
                    <Textarea
                      value={registration.tax_notes}
                      onChange={(e) =>
                        setRegistration({ ...registration, tax_notes: e.target.value })
                      }
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Contact information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Primary contact name</Label>
                    <Input
                      value={contact.primary_contact_name}
                      onChange={(e) =>
                        setContact({ ...contact, primary_contact_name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Designation</Label>
                    <Input
                      value={contact.primary_contact_designation}
                      onChange={(e) =>
                        setContact({
                          ...contact,
                          primary_contact_designation: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Primary phone</Label>
                    <Input
                      value={contact.primary_contact_phone}
                      onChange={(e) =>
                        setContact({ ...contact, primary_contact_phone: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Primary email</Label>
                    <Input
                      type="email"
                      value={contact.primary_contact_email}
                      onChange={(e) =>
                        setContact({ ...contact, primary_contact_email: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Secondary contact name</Label>
                    <Input
                      value={contact.secondary_contact_name}
                      onChange={(e) =>
                        setContact({
                          ...contact,
                          secondary_contact_name: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Secondary phone</Label>
                    <Input
                      value={contact.secondary_contact_phone}
                      onChange={(e) =>
                        setContact({
                          ...contact,
                          secondary_contact_phone: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Secondary email</Label>
                    <Input
                      type="email"
                      value={contact.secondary_contact_email}
                      onChange={(e) =>
                        setContact({
                          ...contact,
                          secondary_contact_email: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Billing email</Label>
                    <Input
                      type="email"
                      value={contact.billing_email}
                      onChange={(e) =>
                        setContact({ ...contact, billing_email: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Support phone</Label>
                    <Input
                      value={contact.support_phone}
                      onChange={(e) =>
                        setContact({ ...contact, support_phone: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Address line 1</Label>
                    <Input
                      value={contact.address_line1}
                      onChange={(e) =>
                        setContact({ ...contact, address_line1: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Address line 2</Label>
                    <Input
                      value={contact.address_line2}
                      onChange={(e) =>
                        setContact({ ...contact, address_line2: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Area</Label>
                    <Input
                      value={contact.area}
                      onChange={(e) => setContact({ ...contact, area: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input
                      value={contact.city}
                      onChange={(e) => setContact({ ...contact, city: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>State</Label>
                    <Input
                      value={contact.state}
                      onChange={(e) =>
                        setContact({ ...contact, state: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Pincode</Label>
                    <Input
                      value={contact.pincode}
                      onChange={(e) =>
                        setContact({ ...contact, pincode: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Country</Label>
                    <Input
                      value={contact.country}
                      onChange={(e) =>
                        setContact({ ...contact, country: e.target.value })
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Collaboration agreement</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Agreement type</Label>
                    <Select
                      value={agreement.agreement_type || undefined}
                      onValueChange={(v) =>
                        setAgreement({ ...agreement, agreement_type: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="franchise">Franchise</SelectItem>
                        <SelectItem value="affiliation">Affiliation</SelectItem>
                        <SelectItem value="co_branding">Co-branding</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={agreement.agreement_status || "draft"}
                      onValueChange={(v) =>
                        setAgreement({ ...agreement, agreement_status: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                        <SelectItem value="terminated">Terminated</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Agreement reference</Label>
                    <Input
                      value={agreement.agreement_reference}
                      onChange={(e) =>
                        setAgreement({
                          ...agreement,
                          agreement_reference: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Revenue share %</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.01}
                      value={agreement.revenue_share_percent}
                      onChange={(e) =>
                        setAgreement({
                          ...agreement,
                          revenue_share_percent: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Start date</Label>
                    <Input
                      type="date"
                      value={agreement.start_date}
                      onChange={(e) =>
                        setAgreement({ ...agreement, start_date: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End date</Label>
                    <Input
                      type="date"
                      value={agreement.end_date}
                      onChange={(e) =>
                        setAgreement({ ...agreement, end_date: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Signed on</Label>
                    <Input
                      type="date"
                      value={agreement.signed_on}
                      onChange={(e) =>
                        setAgreement({ ...agreement, signed_on: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Signed by (name)</Label>
                    <Input
                      value={agreement.signed_by_name}
                      onChange={(e) =>
                        setAgreement({ ...agreement, signed_by_name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Signed by (designation)</Label>
                    <Input
                      value={agreement.signed_by_designation}
                      onChange={(e) =>
                        setAgreement({
                          ...agreement,
                          signed_by_designation: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Agreement notes</Label>
                    <Textarea
                      value={agreement.notes}
                      onChange={(e) =>
                        setAgreement({ ...agreement, notes: e.target.value })
                      }
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  )
}
