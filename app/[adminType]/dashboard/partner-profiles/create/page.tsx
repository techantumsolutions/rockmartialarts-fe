"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Building2,
  CreditCard,
  Globe,
  Loader2,
  Mail,
  MapPin,
  Users,
  Banknote,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { useDashboardBasePath } from "@/lib/useDashboardBasePath"
import { useToast } from "@/hooks/use-toast"
import { partnerOrgAPI } from "@/lib/partnerOrgAPI"
import { openRazorpayCheckout } from "@/lib/razorpay"
import { TokenManager } from "@/lib/tokenManager"
import { AdminCard, AdminPageHeader, AdminPageShell } from "@/components/dashboard/AdminPageShell"
import {
  DashboardSectionHeading,
  fieldLabel,
  inputClass,
  outlineButtonClass,
  primaryButtonClass,
} from "@/components/dashboard/dashboardFormStyles"

type PaymentMethod = "online" | "offline"

function FormSection({
  icon,
  title,
  subtitle,
  tone,
  children,
}: {
  icon: React.ElementType
  title: string
  subtitle?: string
  tone?: "violet" | "blue" | "amber"
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-6 border-b border-gray-100 py-6 last:border-0 lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] lg:gap-10">
      <DashboardSectionHeading icon={icon} title={title} subtitle={subtitle} tone={tone} />
      <div className="min-w-0 space-y-4">{children}</div>
    </div>
  )
}

export default function CreatePartnerPage() {
  const router = useRouter()
  const basePath = useDashboardBasePath()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("offline")
  const [sendInviteEmail, setSendInviteEmail] = useState(true)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!TokenManager.isAuthenticated()) {
      router.push("/superadmin/login")
      return
    }
    const body = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      address: address.trim(),
      payment_method: paymentMethod,
    }
    if (!body.name || !body.email || !body.phone || !body.address) {
      toast({
        title: "Missing fields",
        description: "Partner name, email, mobile, and address are required.",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      if (paymentMethod === "offline") {
        const result = await partnerOrgAPI.createOffline(body)
        const emailSent = result?.invite_email_sent !== false
        toast({
          title: emailSent ? "Partner created" : "Partner created — invite email failed",
          description:
            result?.message ||
            (emailSent
              ? "Invitation email sent to the partner to create their password."
              : "Partner was created, but the invitation email could not be delivered. Use Resend invite on Partner Profiles."),
          variant: emailSent ? "default" : "destructive",
        })
        router.push(`${basePath}/partner-profiles`)
        return
      }

      const orderRes = await partnerOrgAPI.createOnlineOrder(body)
      const partnerId = orderRes.partner?.id
      const orderId = orderRes.order?.id
      const amountPaise = orderRes.order?.amount
      if (!partnerId || !orderId || !amountPaise) {
        throw new Error("Payment order was incomplete. Please try again.")
      }

      await openRazorpayCheckout({
        razorpayKeyId: orderRes.key,
        amountPaise,
        orderId,
        name: "Rock Martial Arts",
        description: `Partner onboarding — ${body.name}`,
        customerName: body.name,
        customerEmail: body.email,
        customerContact: body.phone,
        onSuccess: async (response) => {
          try {
            const verified = await partnerOrgAPI.verifyOnlinePayment({
              partner_org_id: partnerId,
              razorpay_order_id: response.razorpay_order_id || orderId,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature || "",
            })
            const emailSent = verified?.invite_email_sent !== false
            toast({
              title: emailSent ? "Payment successful" : "Payment successful — invite email failed",
              description:
                verified?.message ||
                (emailSent
                  ? "Partner created. Invitation email sent to set password."
                  : "Partner was created, but the invitation email could not be delivered. Use Resend invite on Partner Profiles."),
              variant: emailSent ? "default" : "destructive",
            })
            router.push(`${basePath}/partner-profiles`)
          } catch (err) {
            toast({
              title: "Payment verification failed",
              description: err instanceof Error ? err.message : "Please contact support.",
              variant: "destructive",
            })
          } finally {
            setSaving(false)
          }
        },
        onDismiss: () => {
          setSaving(false)
          toast({
            title: "Payment cancelled",
            description: "Partner was not activated. You can try again.",
            variant: "destructive",
          })
        },
        onPaymentFailure: (message) => {
          setSaving(false)
          toast({
            title: "Payment failed",
            description: message,
            variant: "destructive",
          })
        },
      })
    } catch (err) {
      toast({
        title: "Could not create partner",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
      setSaving(false)
    }
  }

  return (
    <AdminPageShell>
      <Button
        type="button"
        variant="outline"
        className={`${outlineButtonClass} mb-2 h-10 w-fit border-0 bg-transparent px-2 shadow-none hover:bg-white`}
        onClick={() => router.push(`${basePath}/partner-profiles`)}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <AdminPageHeader
        icon={Users}
        title="Create Partner"
        subtitle="White-label partner admin — invite email, set password, isolated dashboard."
      />

      <AdminCard className="p-0 sm:p-0">
        <form onSubmit={handleSubmit} className="px-5 py-2 sm:px-8 sm:py-4">
          <FormSection
            icon={Building2}
            title="Partner Information"
            subtitle="Display name and login contact details"
            tone="violet"
          >
            <div className="space-y-1.5">
              <Label htmlFor="partnerName" className={fieldLabel}>
                Partner Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="partnerName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Academy / partner display name"
                className={inputClass}
                required
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="partnerEmail" className={fieldLabel}>
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="partnerEmail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="partner@example.com"
                  className={inputClass}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="partnerPhone" className={fieldLabel}>
                  Mobile no <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="partnerPhone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="10-digit mobile"
                  className={inputClass}
                  required
                />
              </div>
            </div>
          </FormSection>

          <FormSection
            icon={MapPin}
            title="Contact & Address"
            subtitle="Partner location and mailing address"
            tone="blue"
          >
            <div className="space-y-1.5">
              <Label htmlFor="partnerAddress" className={fieldLabel}>
                Address <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="partnerAddress"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Full address"
                rows={3}
                className="min-h-[88px] resize-none rounded-xl border-gray-200 bg-white shadow-sm"
                required
              />
            </div>
          </FormSection>

          <FormSection
            icon={CreditCard}
            title="Payment & Access"
            subtitle="How onboarding is paid and how the partner is invited"
            tone="amber"
          >
            <div>
              <Label className={fieldLabel}>Payment <span className="text-red-500">*</span></Label>
              <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("online")}
                  className={`rounded-xl border px-4 py-3.5 text-left transition ${
                    paymentMethod === "online"
                      ? "border-[#E1BB33] bg-[#FFF8E1] ring-1 ring-[#E1BB33]/40"
                      : "border-gray-200 bg-white hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-[#C9971A]" />
                    <span className="font-medium text-[#4F5077]">Online</span>
                  </div>
                  <p className="mt-1.5 text-xs text-[#6B7A99]">Razorpay checkout, then create partner</p>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("offline")}
                  className={`rounded-xl border px-4 py-3.5 text-left transition ${
                    paymentMethod === "offline"
                      ? "border-[#E1BB33] bg-[#FFF8E1] ring-1 ring-[#E1BB33]/40"
                      : "border-gray-200 bg-white hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Banknote className="h-4 w-4 text-[#C9971A]" />
                    <span className="font-medium text-[#4F5077]">Offline (Hand Cash)</span>
                  </div>
                  <p className="mt-1.5 text-xs text-[#6B7A99]">Create immediately and send invite email</p>
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-4 rounded-xl border border-[#E1BB33]/25 bg-[#FFFBEB] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-100 bg-white">
                  <Mail className="h-4 w-4 text-[#6D28D9]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#4F5077]">Send invite email</p>
                  <p className="text-xs text-[#6B7A99]">Partner receives a set-password link after creation</p>
                </div>
              </div>
              <Switch checked={sendInviteEmail} onCheckedChange={setSendInviteEmail} />
            </div>
          </FormSection>

          <div className="flex flex-col-reverse gap-2 border-t border-gray-100 py-6 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              className={outlineButtonClass}
              onClick={() => router.push(`${basePath}/partner-profiles`)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className={primaryButtonClass}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Please wait…
                </>
              ) : paymentMethod === "online" ? (
                "Pay & Create Partner"
              ) : (
                "Create Partner"
              )}
            </Button>
          </div>
        </form>
      </AdminCard>
    </AdminPageShell>
  )
}
