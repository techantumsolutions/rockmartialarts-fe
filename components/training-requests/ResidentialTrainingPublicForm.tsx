"use client"

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react"
import Link from "next/link"
import { CheckCircle2, Loader2, Tent, CreditCard } from "lucide-react"
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
import { trainingRequestAPI, type TrainingRequest } from "@/lib/trainingRequestAPI"
import { settingsAPI } from "@/lib/settingsAPI"
import { openRazorpayCheckout } from "@/lib/razorpay"
import { TrainingPhoneOtpSection } from "./TrainingPhoneOtpSection"
import { TrainingPasswordSection } from "./TrainingPasswordSection"
import { TrainingRequestSuccessModal } from "./TrainingRequestSuccessModal"

type BranchOpt = { id: string; name: string }

type FormState = {
  contact_name: string
  contact_phone: string
  contact_email: string
  branch_id: string
  notes: string
  participant_name: string
  participant_age: string
  participant_phone: string
  participant_email: string
  gender: string
  emergency_contact_name: string
  emergency_contact_phone: string
  accommodation: string
  food_preference: string
  medical_notes: string
  training_goals: string
  special_requirements: string
  city: string
  state: string
}

const INITIAL: FormState = {
  contact_name: "",
  contact_phone: "",
  contact_email: "",
  branch_id: "",
  notes: "",
  participant_name: "",
  participant_age: "",
  participant_phone: "",
  participant_email: "",
  gender: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  accommodation: "shared_dorm",
  food_preference: "veg",
  medical_notes: "",
  training_goals: "",
  special_requirements: "",
  city: "",
  state: "",
}

function getBranchName(b: Record<string, unknown>): string {
  const nested = b.branch as { name?: string } | undefined
  return nested?.name || (b.name as string) || (b.code as string) || "Branch"
}

function formatInr(n?: number | null) {
  if (n == null) return "—"
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n)
}

export default function ResidentialTrainingPublicForm() {
  const [form, setForm] = useState<FormState>(INITIAL)
  const [branches, setBranches] = useState<BranchOpt[]>([])
  const [residentialFee, setResidentialFee] = useState<number>(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState<TrainingRequest | null>(null)

  // Password & OTP Verification state
  const [phoneVerified, setPhoneVerified] = useState(false)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [successModalOpen, setSuccessModalOpen] = useState(false)
  const [createdRequest, setCreatedRequest] = useState<TrainingRequest | null>(null)

  useEffect(() => {
    // Load residential training fee from super admin settings
    settingsAPI
      .getPublicSettings()
      .then((s) => {
        const fee = Number(s.residential_training_fee ?? s.residentialTrainingFee ?? 0)
        if (!Number.isNaN(fee)) setResidentialFee(fee)
      })
      .catch(() => {})

    fetch("/api/branches/public", { headers: { "Content-Type": "application/json" } })
      .then((res) => (res.ok ? res.json() : Promise.resolve({ branches: [] })))
      .then((data) => {
        const list = data.branches ?? data ?? []
        const opts: BranchOpt[] = (Array.isArray(list) ? list : []).map(
          (b: Record<string, unknown>) => ({
            id: String(b.id),
            name: getBranchName(b),
          })
        )
        setBranches(opts)
      })
      .catch(() => setBranches([]))
  }, [])

  const set =
    (key: keyof FormState) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }))
    }

  const validate = (): string | null => {
    if (!form.contact_name.trim()) return "Please enter the contact name"
    if (!form.contact_phone.trim() || form.contact_phone.trim().length < 5)
      return "Please enter a valid contact phone"
    if (!phoneVerified)
      return "Please verify your mobile number with OTP before submitting"
    if (!password || password.length < 6)
      return "Please set up an account password of at least 6 characters"
    if (password !== confirmPassword)
      return "Passwords do not match"
    if (!form.participant_name.trim()) return "Please enter the participant name"
    if (!form.participant_phone.trim() || form.participant_phone.trim().length < 5)
      return "Please enter a valid participant phone"
    if (form.participant_age) {
      const age = parseInt(form.participant_age, 10)
      if (!Number.isFinite(age) || age < 1 || age > 120) return "Please enter a valid age"
    }
    return null
  }

  const sendSubmission = async (paymentDetails?: {
    razorpay_order_id?: string
    razorpay_payment_id?: string
    razorpay_signature?: string
  }) => {
    const branch = branches.find((b) => b.id === form.branch_id)
    const age = form.participant_age ? parseInt(form.participant_age, 10) : undefined

    const result = await trainingRequestAPI.submitResidential({
      contact_name: form.contact_name.trim(),
      contact_phone: form.contact_phone.trim(),
      contact_email: form.contact_email.trim() || undefined,
      password: password.trim(),
      is_phone_verified: true,
      branch_id: form.branch_id || undefined,
      branch_name: branch?.name,
      source: "website",
      notes: form.notes.trim() || undefined,
      razorpay_order_id: paymentDetails?.razorpay_order_id,
      razorpay_payment_id: paymentDetails?.razorpay_payment_id,
      razorpay_signature: paymentDetails?.razorpay_signature,
      details: {
        participant_name: form.participant_name.trim(),
        participant_age: age,
        participant_phone: form.participant_phone.trim(),
        participant_email: form.participant_email.trim() || undefined,
        gender: form.gender.trim() || undefined,
        emergency_contact_name: form.emergency_contact_name.trim() || undefined,
        emergency_contact_phone: form.emergency_contact_phone.trim() || undefined,
        accommodation: form.accommodation,
        food_preference: form.food_preference,
        medical_notes: form.medical_notes.trim() || undefined,
        training_goals: form.training_goals.trim() || undefined,
        special_requirements: form.special_requirements.trim() || undefined,
        city: form.city.trim() || undefined,
        state: form.state.trim() || undefined,
      },
    })
    setSubmitted(result.request)
    setCreatedRequest(result.request || null)
    setSuccessModalOpen(true)
    setForm(INITIAL)
    setPassword("")
    setConfirmPassword("")
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    const v = validate()
    if (v) {
      setError(v)
      return
    }

    setSubmitting(true)
    try {
      const orderData = await trainingRequestAPI.createOrder({
        type: "residential",
        contact_name: form.contact_name.trim(),
        contact_email: form.contact_email.trim() || undefined,
        contact_phone: form.contact_phone.trim(),
      })

      if (orderData.fee_required && orderData.order_id) {
        if (orderData.amount_inr && orderData.amount_inr !== residentialFee) {
          setResidentialFee(orderData.amount_inr)
        }
        await openRazorpayCheckout({
          amountPaise: orderData.amount_paise || 0,
          razorpayKeyId: orderData.key_id || "",
          currency: orderData.currency || "INR",
          name: "Rock Martial Arts",
          description: "Residential Training Fee",
          customerName: form.contact_name.trim(),
          customerEmail: form.contact_email.trim(),
          customerContact: form.contact_phone.trim(),
          orderId: orderData.order_id,
          onSuccess: async (rpResponse) => {
            try {
              await sendSubmission({
                razorpay_order_id: rpResponse.razorpay_order_id,
                razorpay_payment_id: rpResponse.razorpay_payment_id,
                razorpay_signature: rpResponse.razorpay_signature,
              })
            } catch (err) {
              setError(err instanceof Error ? err.message : "Payment succeeded but submission failed")
            } finally {
              setSubmitting(false)
            }
          },
          onDismiss: () => {
            setSubmitting(false)
          },
          onPaymentFailure: (err: string) => {
            setError(err || "Payment failed. Please try again.")
            setSubmitting(false)
          },
        })
      } else {
        await sendSubmission()
        setSubmitting(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process request")
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <>
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-8 md:p-10 text-center max-w-xl mx-auto space-y-4">
          <CheckCircle2 className="w-14 h-14 text-[#FFB70F] mx-auto" />
          <h2 className="text-2xl font-bold text-white">Request submitted</h2>
          <p className="text-gray-300">
            Thank you. Our team will review your residential training request and contact you soon.
          </p>
          <div className="text-sm text-gray-400 space-y-1">
            {submitted.fee_total_inr && submitted.fee_total_inr > 0 ? (
              <>
                <p>Amount Paid: <span className="text-[#FFB70F] font-semibold">{formatInr(submitted.fee_total_inr)}</span></p>
                <p>Payment Status: <span className="text-emerald-400 font-medium">Paid</span></p>
              </>
            ) : null}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Button asChild className="bg-[#FFB70F] hover:bg-[#e0a00d] text-black font-semibold">
              <Link href="/training-login">Go to Training Login</Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-gray-600 text-white hover:bg-gray-800"
              onClick={() => {
                setSubmitted(null)
                setCreatedRequest(null)
                setError(null)
              }}
            >
              Submit another
            </Button>
            <Button asChild variant="outline" className="border-gray-600 text-white hover:bg-gray-800">
              <Link href="/">Back to home</Link>
            </Button>
          </div>
        </div>

        <TrainingRequestSuccessModal
          isOpen={successModalOpen}
          onClose={() => setSuccessModalOpen(false)}
          requestId={createdRequest?.id || submitted?.id || ""}
          programName="Residential Training Program"
          contactEmail={createdRequest?.contact_email || form.contact_email}
          contactPhone={createdRequest?.contact_phone || form.contact_phone}
          amountPaid={residentialFee}
        />
      </>
    )
  }

  const fieldClass =
    "bg-gray-950/60 border-gray-700 text-white placeholder:text-gray-500 focus-visible:ring-[#FFB70F]"

  return (
    <form onSubmit={onSubmit} className="w-full space-y-8">
      {residentialFee > 0 && (
        <div className="rounded-xl border border-[#FFB70F]/30 bg-[#FFB70F]/10 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CreditCard className="w-6 h-6 text-[#FFB70F]" />
            <div>
              <p className="text-sm text-gray-300">Residential Training Program Fee</p>
              <p className="text-2xl font-bold text-[#FFB70F]">{formatInr(residentialFee)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Participant & Contact */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 md:p-8 space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-white">Participant &amp; Contact Details</h2>
          <p className="text-sm text-gray-400">Admission, emergency contact and location details</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-gray-300">
              Participant name <span className="text-[#FFB70F]">*</span>
            </Label>
            <Input
              value={form.participant_name}
              onChange={set("participant_name")}
              className={fieldClass}
              placeholder="e.g. Rohan Verma"
              required
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300">Age</Label>
            <Input
              type="number"
              min={1}
              max={120}
              value={form.participant_age}
              onChange={set("participant_age")}
              className={fieldClass}
              placeholder="e.g. 21"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300">
              Participant phone <span className="text-[#FFB70F]">*</span>
            </Label>
            <Input
              value={form.participant_phone}
              onChange={set("participant_phone")}
              className={fieldClass}
              placeholder="10-digit mobile number"
              required
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300">Participant email</Label>
            <Input
              type="email"
              value={form.participant_email}
              onChange={set("participant_email")}
              className={fieldClass}
              placeholder="name@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300">Gender</Label>
            <Input
              value={form.gender}
              onChange={set("gender")}
              className={fieldClass}
              placeholder="Optional"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300">Preferred branch</Label>
            <Select
              value={form.branch_id || "none"}
              onValueChange={(v) =>
                setForm((prev) => ({ ...prev, branch_id: v === "none" ? "" : v }))
              }
            >
              <SelectTrigger className={`h-10 ${fieldClass}`}>
                <SelectValue placeholder="Optional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No preference</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300">
              Contact name <span className="text-[#FFB70F]">*</span>
            </Label>
            <Input
              value={form.contact_name}
              onChange={set("contact_name")}
              className={fieldClass}
              placeholder="e.g. Anita Verma (Parent / Self)"
              required
            />
          </div>
          <div className="space-y-2">
            <TrainingPhoneOtpSection
              phone={form.contact_phone}
              onPhoneChange={(p) => setForm((prev) => ({ ...prev, contact_phone: p }))}
              isVerified={phoneVerified}
              onVerified={(verified) => setPhoneVerified(verified)}
              disabled={submitting}
              required={true}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300">Contact email</Label>
            <Input
              type="email"
              value={form.contact_email}
              onChange={set("contact_email")}
              className={fieldClass}
              placeholder="anita@example.com"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <TrainingPasswordSection
              password={password}
              confirmPassword={confirmPassword}
              onPasswordChange={setPassword}
              onConfirmPasswordChange={setConfirmPassword}
              disabled={submitting}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300">Emergency contact name</Label>
            <Input
              value={form.emergency_contact_name}
              onChange={set("emergency_contact_name")}
              className={fieldClass}
              placeholder="e.g. Ramesh Verma (Father / Guardian)"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300">Emergency contact phone</Label>
            <Input
              value={form.emergency_contact_phone}
              onChange={set("emergency_contact_phone")}
              className={fieldClass}
              placeholder="e.g. 9876543210"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300">City</Label>
            <Input value={form.city} onChange={set("city")} className={fieldClass} placeholder="e.g. Hyderabad" />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300">State</Label>
            <Input value={form.state} onChange={set("state")} className={fieldClass} placeholder="e.g. Telangana" />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300">Accommodation</Label>
            <Select
              value={form.accommodation}
              onValueChange={(v) => setForm((prev) => ({ ...prev, accommodation: v }))}
            >
              <SelectTrigger className={`h-10 ${fieldClass}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="shared_dorm">Shared dorm</SelectItem>
                <SelectItem value="twin_sharing">Twin sharing</SelectItem>
                <SelectItem value="private_room">Private room</SelectItem>
                <SelectItem value="none">No accommodation needed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300">Food preference</Label>
            <Select
              value={form.food_preference}
              onValueChange={(v) => setForm((prev) => ({ ...prev, food_preference: v }))}
            >
              <SelectTrigger className={`h-10 ${fieldClass}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="veg">Vegetarian</SelectItem>
                <SelectItem value="non_veg">Non-vegetarian</SelectItem>
                <SelectItem value="both">Both / flexible</SelectItem>
                <SelectItem value="none">No food package</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="text-gray-300">Medical notes</Label>
            <Textarea
              value={form.medical_notes}
              onChange={set("medical_notes")}
              className={`min-h-[60px] ${fieldClass}`}
              placeholder="Any allergies, previous injuries, or medical conditions"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="text-gray-300">Training goals</Label>
            <Textarea
              value={form.training_goals}
              onChange={set("training_goals")}
              className={`min-h-[60px] ${fieldClass}`}
              placeholder="What are your goals for this residential camp/training?"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="text-gray-300">Special requirements</Label>
            <Textarea
              value={form.special_requirements}
              onChange={set("special_requirements")}
              className={`min-h-[60px] ${fieldClass}`}
              placeholder="Special equipment, dietary restrictions, etc."
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="text-gray-300">Additional notes</Label>
            <Textarea
              value={form.notes}
              onChange={set("notes")}
              className={`min-h-[60px] ${fieldClass}`}
              placeholder="Any additional details or special requests..."
            />
          </div>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-400 text-center bg-red-950/40 border border-red-900 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      <div className="flex justify-center">
        <Button
          type="submit"
          disabled={submitting}
          className="bg-[#FFB70F] hover:bg-[#e0a00d] text-black font-semibold px-10 py-6 text-base"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing…
            </>
          ) : residentialFee > 0 ? (
            `Pay ${formatInr(residentialFee)} & Submit Request`
          ) : (
            "Submit Residential Training Request"
          )}
        </Button>
      </div>

      <TrainingRequestSuccessModal
        isOpen={successModalOpen}
        onClose={() => setSuccessModalOpen(false)}
        requestId={createdRequest?.id || ""}
        programName="Residential Training Program"
        contactEmail={createdRequest?.contact_email || form.contact_email}
        contactPhone={createdRequest?.contact_phone || form.contact_phone}
        amountPaid={residentialFee}
      />
    </form>
  )
}
