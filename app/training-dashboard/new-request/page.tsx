"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Building,
  GraduationCap,
  Home,
  Loader2,
  PlusCircle,
  School,
  Tent,
  CheckCircle2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
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
import { trainingRequestAPI, type TrainingRequestType } from "@/lib/trainingRequestAPI"
import { settingsAPI } from "@/lib/settingsAPI"
import { TokenManager } from "@/lib/tokenManager"
import { openRazorpayCheckout } from "@/lib/razorpay"

type BranchOpt = { id: string; name: string }

export default function NewTrainingRequestDashboardPage() {
  const router = useRouter()
  const [trainingType, setTrainingType] = useState<TrainingRequestType>("home")
  const [branches, setBranches] = useState<BranchOpt[]>([])
  const [trainingFee, setTrainingFee] = useState<number>(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Form State
  const [contactName, setContactName] = useState("")
  const [contactPhone, setContactPhone] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [branchId, setBranchId] = useState("")
  const [notes, setNotes] = useState("")

  // Specific details
  const [entityName, setEntityName] = useState("") // Org / College / School / Participant name
  const [participantCount, setParticipantCount] = useState("1")
  const [addressLine1, setAddressLine1] = useState("")
  const [city, setCity] = useState("")
  const [state, setState] = useState("")
  const [pincode, setPincode] = useState("")
  const [preferredDate, setPreferredDate] = useState("")
  const [preferredTime, setPreferredTime] = useState("")
  const [trainingGoals, setTrainingGoals] = useState("")
  const [specialRequirements, setSpecialRequirements] = useState("")

  // Pre-fill user data
  useEffect(() => {
    const user = TokenManager.getUser()
    if (user) {
      if (user.full_name) setContactName(user.full_name)
      if (user.email) setContactEmail(user.email)
      if (user.phone) setContactPhone(user.phone)
    }

    // Load branches
    fetch("/api/branches/public", { headers: { "Content-Type": "application/json" } })
      .then((res) => (res.ok ? res.json() : Promise.resolve({ branches: [] })))
      .then((data) => {
        const list = data.branches ?? data ?? []
        const opts: BranchOpt[] = (Array.isArray(list) ? list : []).map(
          (b: Record<string, any>) => ({
            id: String(b.id),
            name: b.branch?.name || b.name || b.code || "Branch",
          })
        )
        setBranches(opts)
      })
      .catch(() => setBranches([]))
  }, [])

  // Load fee when trainingType changes
  useEffect(() => {
    settingsAPI
      .getPublicSettings()
      .then((s) => {
        let fee = 0
        if (trainingType === "home") fee = Number(s.home_training_fee ?? s.homeTrainingFee ?? 0)
        else if (trainingType === "corporate") fee = Number(s.corporate_training_fee ?? s.corporateTrainingFee ?? 0)
        else if (trainingType === "school") fee = Number(s.school_training_fee ?? s.schoolTrainingFee ?? 0)
        else if (trainingType === "college") fee = Number(s.college_training_fee ?? s.collegeTrainingFee ?? 0)
        else if (trainingType === "residential") fee = Number(s.residential_training_fee ?? s.residentialTrainingFee ?? 0)
        setTrainingFee(Number.isNaN(fee) ? 0 : fee)
      })
      .catch(() => setTrainingFee(0))
  }, [trainingType])

  const validate = (): string | null => {
    if (!contactName.trim()) return "Please enter contact person name"
    if (!contactPhone.trim()) return "Please enter contact phone number"
    if (!entityName.trim()) {
      if (trainingType === "corporate") return "Please enter organization name"
      if (trainingType === "college") return "Please enter college name"
      if (trainingType === "school") return "Please enter school name"
      return "Please enter participant name"
    }
    if (!addressLine1.trim()) return "Please enter address / training location"
    if (!city.trim()) return "Please enter city"
    if (!state.trim()) return "Please enter state"
    return null
  }

  const sendSubmission = async (paymentDetails?: {
    razorpay_order_id?: string
    razorpay_payment_id?: string
    razorpay_signature?: string
  }) => {
    const branch = branches.find((b) => b.id === branchId)
    const basePayload = {
      contact_name: contactName.trim(),
      contact_phone: contactPhone.trim(),
      contact_email: contactEmail.trim() || undefined,
      branch_id: branchId || undefined,
      branch_name: branch?.name,
      source: "training_dashboard",
      notes: notes.trim() || undefined,
      razorpay_order_id: paymentDetails?.razorpay_order_id,
      razorpay_payment_id: paymentDetails?.razorpay_payment_id,
      razorpay_signature: paymentDetails?.razorpay_signature,
    }

    if (trainingType === "home") {
      await trainingRequestAPI.submitHome({
        ...basePayload,
        details: {
          participant_name: entityName.trim(),
          participant_phone: contactPhone.trim(),
          participant_email: contactEmail.trim() || null,
          number_of_participants: parseInt(participantCount || "1", 10),
          address_line1: addressLine1.trim(),
          city: city.trim(),
          state: state.trim(),
          pincode: pincode.trim() || null,
          preferred_date: preferredDate || null,
          preferred_time: preferredTime.trim() || null,
          training_goals: trainingGoals.trim() || null,
          special_requirements: specialRequirements.trim() || null,
        },
      })
    } else if (trainingType === "corporate") {
      await trainingRequestAPI.submitCorporate({
        ...basePayload,
        details: {
          organization_name: entityName.trim(),
          employee_count: parseInt(participantCount || "10", 10),
          address_line1: addressLine1.trim(),
          city: city.trim(),
          state: state.trim(),
          pincode: pincode.trim() || null,
          preferred_date: preferredDate || null,
          preferred_time: preferredTime.trim() || null,
          training_goals: trainingGoals.trim() || null,
          special_requirements: specialRequirements.trim() || null,
        },
      })
    } else if (trainingType === "school") {
      await trainingRequestAPI.submitSchool({
        ...basePayload,
        details: {
          school_name: entityName.trim(),
          number_of_students: parseInt(participantCount || "30", 10),
          address_line1: addressLine1.trim(),
          city: city.trim(),
          state: state.trim(),
          pincode: pincode.trim() || null,
          preferred_date: preferredDate || null,
          preferred_time: preferredTime.trim() || null,
          training_goals: trainingGoals.trim() || null,
          special_requirements: specialRequirements.trim() || null,
        },
      })
    } else if (trainingType === "college") {
      await trainingRequestAPI.submitCollege({
        ...basePayload,
        details: {
          college_name: entityName.trim(),
          number_of_participants: parseInt(participantCount || "30", 10),
          address_line1: addressLine1.trim(),
          city: city.trim(),
          state: state.trim(),
          pincode: pincode.trim() || null,
          preferred_date: preferredDate || null,
          preferred_time: preferredTime.trim() || null,
          training_goals: trainingGoals.trim() || null,
          special_requirements: specialRequirements.trim() || null,
        },
      })
    } else if (trainingType === "residential") {
      await trainingRequestAPI.submitResidential({
        ...basePayload,
        details: {
          participant_name: entityName.trim(),
          participant_phone: contactPhone.trim(),
          participant_email: contactEmail.trim() || null,
          city: city.trim(),
          state: state.trim(),
          preferred_start_date: preferredDate || null,
          training_goals: trainingGoals.trim() || null,
          special_requirements: specialRequirements.trim() || null,
          accommodation: "shared_dorm",
          food_preference: "veg",
        },
      })
    }

    setSuccess(true)
    setTimeout(() => {
      router.push("/training-dashboard")
    }, 1500)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const err = validate()
    if (err) {
      setError(err)
      return
    }

    setSubmitting(true)
    try {
      const orderData = await trainingRequestAPI.createOrder({
        type: trainingType,
        contact_name: contactName.trim(),
        contact_email: contactEmail.trim() || undefined,
        contact_phone: contactPhone.trim(),
      })

      if (orderData.fee_required && orderData.order_id && orderData.amount_paise) {
        await openRazorpayCheckout({
          orderId: orderData.order_id,
          amountPaise: orderData.amount_paise,
          currency: orderData.currency || "INR",
          razorpayKeyId: orderData.key_id || "",
          name: "Rock Martial Arts",
          description: `${trainingType.toUpperCase()} Training Registration Fee`,
          customerName: contactName.trim(),
          customerEmail: contactEmail.trim() || undefined,
          customerContact: contactPhone.trim(),
          onSuccess: async (payRes) => {
            await sendSubmission({
              razorpay_order_id: payRes.razorpay_order_id,
              razorpay_payment_id: payRes.razorpay_payment_id,
              razorpay_signature: payRes.razorpay_signature,
            })
          },
          onDismiss: () => {
            setSubmitting(false)
            setError("Payment was cancelled. You can retry when ready.")
          },
          onPaymentFailure: (msg: string) => {
            setSubmitting(false)
            setError(msg || "Payment failed. Please try again.")
          },
        })
      } else {
        await sendSubmission()
      }
    } catch (submitErr: any) {
      setError(submitErr?.message || "Failed to submit request. Please try again.")
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Request Submitted Successfully!</h2>
        <p className="text-xs text-muted-foreground">
          Redirecting to your training dashboard...
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/training-dashboard">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground">Submit New Training Request</h1>
            <p className="text-xs text-muted-foreground">
              Select program type and fill in requirements. No OTP re-verification needed.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-600 font-medium">
          {error}
        </div>
      )}

      {/* Program Type Selection Cards */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Select Training Program
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {[
            { type: "home", label: "Home Training", icon: Home },
            { type: "corporate", label: "Corporate", icon: Building },
            { type: "school", label: "School", icon: School },
            { type: "college", label: "College", icon: GraduationCap },
            { type: "residential", label: "Residential", icon: Tent },
          ].map((item) => {
            const Icon = item.icon
            const isSelected = trainingType === item.type
            return (
              <button
                key={item.type}
                type="button"
                onClick={() => setTrainingType(item.type as TrainingRequestType)}
                className={`p-3 rounded-xl border text-center flex flex-col items-center gap-2 transition-all ${
                  isSelected
                    ? "border-[#FFB70F] bg-[#FFB70F]/10 text-foreground font-semibold shadow-sm"
                    : "border-border/80 bg-card hover:border-[#FFB70F]/50 text-muted-foreground"
                }`}
              >
                <Icon className={`h-5 w-5 ${isSelected ? "text-[#FFB70F]" : ""}`} />
                <span className="text-xs">{item.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-card border border-border/80 rounded-2xl p-6 space-y-5 shadow-sm">
        {/* Contact Info (Pre-filled) */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Contact Information
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label htmlFor="contactName" className="text-xs font-medium">
                Contact Name *
              </Label>
              <Input
                id="contactName"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="text-xs h-9"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="contactPhone" className="text-xs font-medium">
                Contact Phone *
              </Label>
              <Input
                id="contactPhone"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="text-xs h-9"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="contactEmail" className="text-xs font-medium">
                Email Address
              </Label>
              <Input
                id="contactEmail"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="text-xs h-9"
              />
            </div>
          </div>
        </div>

        {/* Requirements */}
        <div className="space-y-3 pt-3 border-t border-border/60">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {trainingType === "corporate" && "Corporate Requirements"}
            {trainingType === "college" && "College Requirements"}
            {trainingType === "school" && "School Requirements"}
            {trainingType === "residential" && "Residential Camp Requirements"}
            {trainingType === "home" && "Home Training Requirements"}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="entityName" className="text-xs font-medium">
                {trainingType === "corporate" && "Organization / Company Name *"}
                {trainingType === "college" && "College / University Name *"}
                {trainingType === "school" && "School Name *"}
                {(trainingType === "home" || trainingType === "residential") && "Participant Name *"}
              </Label>
              <Input
                id="entityName"
                value={entityName}
                onChange={(e) => setEntityName(e.target.value)}
                placeholder="Name"
                className="text-xs h-9"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="participantCount" className="text-xs font-medium">
                {trainingType === "corporate" ? "Expected Employee Count" : "Number of Participants"}
              </Label>
              <Input
                id="participantCount"
                type="number"
                min="1"
                value={participantCount}
                onChange={(e) => setParticipantCount(e.target.value)}
                className="text-xs h-9"
              />
            </div>

            <div className="sm:col-span-2 space-y-1">
              <Label htmlFor="addressLine1" className="text-xs font-medium">
                Location Address *
              </Label>
              <Input
                id="addressLine1"
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                placeholder="Street address, building name, campus"
                className="text-xs h-9"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="city" className="text-xs font-medium">
                City *
              </Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="text-xs h-9"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="state" className="text-xs font-medium">
                State *
              </Label>
              <Input
                id="state"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="text-xs h-9"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="preferredDate" className="text-xs font-medium">
                Preferred Start Date
              </Label>
              <Input
                id="preferredDate"
                type="date"
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="preferredTime" className="text-xs font-medium">
                Preferred Time
              </Label>
              <Input
                id="preferredTime"
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
                placeholder="e.g. 7:00 AM or Evening"
                className="text-xs h-9"
              />
            </div>

            <div className="sm:col-span-2 space-y-1">
              <Label htmlFor="branch" className="text-xs font-medium">
                Preferred Nearby Branch
              </Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger id="branch" className="text-xs h-9">
                  <SelectValue placeholder="Select Branch (Optional)" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-2 space-y-1">
              <Label htmlFor="goals" className="text-xs font-medium">
                Training Goals & Special Requirements
              </Label>
              <Textarea
                id="goals"
                value={trainingGoals}
                onChange={(e) => setTrainingGoals(e.target.value)}
                placeholder="e.g. Self-defense focus, corporate wellness, tournament prep..."
                rows={3}
                className="text-xs"
              />
            </div>
          </div>
        </div>

        {/* Fee preview if applicable */}
        {trainingFee > 0 && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-[#FFB70F]/40 flex items-center justify-between text-xs">
            <span className="font-medium text-foreground">
              Program Registration Fee:
            </span>
            <span className="font-bold text-base text-foreground">
              ₹{trainingFee.toLocaleString("en-IN")}
            </span>
          </div>
        )}

        {/* Submit */}
        <div className="pt-2 flex justify-end gap-2">
          <Link href="/training-dashboard">
            <Button type="button" variant="outline" className="text-xs h-10">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={submitting}
            className="bg-[#FFB70F] hover:bg-[#E5A40E] text-black font-semibold text-xs h-10 px-5 gap-1.5 shadow"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <PlusCircle className="h-4 w-4" />
                <span>Submit Request {trainingFee > 0 ? `& Pay ₹${trainingFee}` : ""}</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
