"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useDashboardBasePath } from "@/lib/useDashboardBasePath"
import { useToast } from "@/hooks/use-toast"
import { partnerOrgAPI } from "@/lib/partnerOrgAPI"
import { openRazorpayCheckout } from "@/lib/razorpay"
import { TokenManager } from "@/lib/tokenManager"

type PaymentMethod = "online" | "offline"

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
    <div className="w-full p-4 lg:px-8 lg:py-4 lg:overflow-hidden">
      <div className="flex items-center gap-3 mb-4 lg:mb-3">
        <Button
          type="button"
          variant="ghost"
          className="px-2 shrink-0"
          onClick={() => router.push(`${basePath}/partner-profiles`)}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <div className="min-w-0">
          <h1 className="text-xl lg:text-2xl font-bold text-[#4F5077]">Create Partner</h1>
          <p className="text-sm text-muted-foreground truncate lg:whitespace-normal">
            White-label partner admin — invite email, set password, isolated dashboard.
          </p>
        </div>
      </div>

      <Card className="lg:max-h-[calc(100dvh-11rem)]">
        <CardHeader className="pb-2 pt-4 lg:py-3">
          <CardTitle className="text-base">Partner details</CardTitle>
        </CardHeader>
        <CardContent className="pb-4 lg:pb-3">
          <form className="space-y-3 lg:space-y-3" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="partnerName">Partner Name *</Label>
                <Input
                  id="partnerName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Academy / partner display name"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="partnerEmail">Email *</Label>
                <Input
                  id="partnerEmail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="partner@example.com"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="partnerPhone">Mobile no *</Label>
                <Input
                  id="partnerPhone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="10-digit mobile"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="partnerAddress">Address *</Label>
              <Textarea
                id="partnerAddress"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Full address"
                rows={2}
                className="min-h-[64px] lg:min-h-[56px] resize-none"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>Payment *</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 lg:gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("online")}
                  className={`rounded-lg border px-3 py-2.5 lg:py-2 text-left text-sm transition ${
                    paymentMethod === "online"
                      ? "border-amber-400 bg-amber-50"
                      : "border-gray-200 bg-white hover:bg-gray-50"
                  }`}
                >
                  <div className="font-medium text-gray-900">Online</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Razorpay checkout, then create partner
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("offline")}
                  className={`rounded-lg border px-3 py-2.5 lg:py-2 text-left text-sm transition ${
                    paymentMethod === "offline"
                      ? "border-amber-400 bg-amber-50"
                      : "border-gray-200 bg-white hover:bg-gray-50"
                  }`}
                >
                  <div className="font-medium text-gray-900">Offline (Hand Cash)</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Create immediately and send invite email
                  </div>
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => router.push(`${basePath}/partner-profiles`)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-[#FFC403] text-[#1a2332] hover:bg-[#e6b003]"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
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
        </CardContent>
      </Card>
    </div>
  )
}
