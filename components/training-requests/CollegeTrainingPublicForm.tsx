"use client"

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react"
import Link from "next/link"
import { CheckCircle2, GraduationCap, Loader2, CreditCard } from "lucide-react"
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
import { trainingRequestAPI } from "@/lib/trainingRequestAPI"
import { settingsAPI } from "@/lib/settingsAPI"
import { openRazorpayCheckout } from "@/lib/razorpay"

type BranchOpt = { id: string; name: string }

type FormState = {
  contact_name: string
  contact_phone: string
  contact_email: string
  contact_designation: string
  branch_id: string
  notes: string
  college_name: string
  college_type: string
  department: string
  number_of_participants: string
  year_of_study: string
  participant_group: string
  address_line1: string
  address_line2: string
  city: string
  state: string
  pincode: string
  preferred_date: string
  preferred_time: string
  schedule_notes: string
  training_type: string
  training_goals: string
  special_requirements: string
}

const INITIAL: FormState = {
  contact_name: "",
  contact_phone: "",
  contact_email: "",
  contact_designation: "",
  branch_id: "",
  notes: "",
  college_name: "",
  college_type: "",
  department: "",
  number_of_participants: "40",
  year_of_study: "",
  participant_group: "",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  pincode: "",
  preferred_date: "",
  preferred_time: "",
  schedule_notes: "",
  training_type: "",
  training_goals: "",
  special_requirements: "",
}

function formatInr(n?: number | null) {
  if (n == null) return "—"
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n)
}

function getBranchName(b: Record<string, unknown>): string {
  const nested = b.branch as { name?: string } | undefined
  return nested?.name || (b.name as string) || (b.code as string) || "Branch"
}

export default function CollegeTrainingPublicForm() {
  const [form, setForm] = useState<FormState>(INITIAL)
  const [branches, setBranches] = useState<BranchOpt[]>([])
  const [trainingFee, setTrainingFee] = useState<number>(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submittedId, setSubmittedId] = useState<string | null>(null)

  useEffect(() => {
    settingsAPI
      .getPublicSettings()
      .then((s) => {
        const fee = Number(s.college_training_fee ?? s.collegeTrainingFee ?? 0)
        if (!Number.isNaN(fee)) setTrainingFee(fee)
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
    if (!form.contact_name.trim()) return "Please enter the contact person name"
    if (!form.contact_phone.trim() || form.contact_phone.trim().length < 5)
      return "Please enter a valid contact phone"
    if (!form.college_name.trim()) return "Please enter the college name"
    if (!form.address_line1.trim()) return "Please enter the campus address"
    if (!form.city.trim()) return "Please enter the city"
    if (!form.state.trim()) return "Please enter the state"
    const n = parseInt(form.number_of_participants || "1", 10)
    if (!Number.isFinite(n) || n < 1 || n > 5000)
      return "Number of participants must be between 1 and 5000"
    return null
  }

  const sendSubmission = async (paymentDetails?: {
    razorpay_order_id?: string
    razorpay_payment_id?: string
    razorpay_signature?: string
  }) => {
    const branch = branches.find((b) => b.id === form.branch_id)
    const result = await trainingRequestAPI.submitCollege({
      contact_name: form.contact_name.trim(),
      contact_phone: form.contact_phone.trim(),
      contact_email: form.contact_email.trim() || undefined,
      branch_id: form.branch_id || undefined,
      branch_name: branch?.name,
      source: "website",
      notes: form.notes.trim() || undefined,
      razorpay_order_id: paymentDetails?.razorpay_order_id,
      razorpay_payment_id: paymentDetails?.razorpay_payment_id,
      razorpay_signature: paymentDetails?.razorpay_signature,
      details: {
        college_name: form.college_name.trim(),
        college_type: form.college_type.trim() || undefined,
        department: form.department.trim() || undefined,
        contact_designation: form.contact_designation.trim() || undefined,
        number_of_participants: parseInt(form.number_of_participants || "1", 10),
        year_of_study: form.year_of_study.trim() || undefined,
        participant_group: form.participant_group.trim() || undefined,
        address_line1: form.address_line1.trim(),
        address_line2: form.address_line2.trim() || undefined,
        city: form.city.trim(),
        state: form.state.trim(),
        pincode: form.pincode.trim() || undefined,
        preferred_date: form.preferred_date || undefined,
        preferred_time: form.preferred_time.trim() || undefined,
        schedule_notes: form.schedule_notes.trim() || undefined,
        training_type: form.training_type.trim() || undefined,
        training_goals: form.training_goals.trim() || undefined,
        special_requirements: form.special_requirements.trim() || undefined,
      },
    })
    setSubmittedId(result.request?.id || "ok")
    setForm(INITIAL)
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
        type: "college",
        contact_name: form.contact_name.trim(),
        contact_email: form.contact_email.trim() || undefined,
        contact_phone: form.contact_phone.trim(),
      })

      if (orderData.fee_required && orderData.order_id) {
        if (orderData.amount_inr && orderData.amount_inr !== trainingFee) {
          setTrainingFee(orderData.amount_inr)
        }
        await openRazorpayCheckout({
          amountPaise: orderData.amount_paise || 0,
          razorpayKeyId: orderData.key_id || "",
          currency: orderData.currency || "INR",
          name: "Rock Martial Arts",
          description: "College Training Request Fee",
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
          onPaymentFailure: (err) => {
            setError(err?.description || "Payment failed. Please try again.")
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

  if (submittedId) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-8 md:p-10 text-center max-w-xl mx-auto">
        <CheckCircle2 className="w-14 h-14 text-[#FFB70F] mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Request submitted</h2>
        <p className="text-gray-300 mb-6">
          Thank you. Our team will review your college training request and get back to you soon.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            type="button"
            className="bg-[#FFB70F] hover:bg-[#e0a00d] text-black"
            onClick={() => setSubmittedId(null)}
          >
            Submit another
          </Button>
          <Button asChild variant="outline" className="border-gray-600 text-white hover:bg-gray-800">
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </div>
    )
  }

  const fieldClass =
    "bg-gray-950/60 border-gray-700 text-white placeholder:text-gray-500 focus-visible:ring-[#FFB70F]"

  return (
    <form onSubmit={onSubmit} className="w-full space-y-8">
      {trainingFee > 0 && (
        <div className="rounded-xl border border-[#FFB70F]/30 bg-[#FFB70F]/10 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CreditCard className="w-6 h-6 text-[#FFB70F]" />
            <div>
              <p className="text-sm text-gray-300">College Training Program Fee</p>
              <p className="text-2xl font-bold text-[#FFB70F]">{formatInr(trainingFee)}</p>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 md:p-8 space-y-5">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-lg bg-[#FFB70F]/10 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-[#FFB70F]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">College &amp; contact</h2>
            <p className="text-sm text-gray-400">Institution details and primary coordinator</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label className="text-gray-300">
              College / University name <span className="text-[#FFB70F]">*</span>
            </Label>
            <Input
              value={form.college_name}
              onChange={set("college_name")}
              className={fieldClass}
              placeholder="e.g. National Institute of Technology"
              required
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300">Institution type</Label>
            <Input
              value={form.college_type}
              onChange={set("college_type")}
              className={fieldClass}
              placeholder="e.g. Engineering, Arts & Science, Medical, Autonomous"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300">Department / club (optional)</Label>
            <Input
              value={form.department}
              onChange={set("department")}
              className={fieldClass}
              placeholder="e.g. Sports Committee / NSS / Women's Cell"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300">
              Contact person name <span className="text-[#FFB70F]">*</span>
            </Label>
            <Input
              value={form.contact_name}
              onChange={set("contact_name")}
              className={fieldClass}
              placeholder="Faculty coordinator / Dean / Student lead"
              required
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300">Designation</Label>
            <Input
              value={form.contact_designation}
              onChange={set("contact_designation")}
              className={fieldClass}
              placeholder="e.g. Physical Director / Student President"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300">
              Phone number <span className="text-[#FFB70F]">*</span>
            </Label>
            <Input
              value={form.contact_phone}
              onChange={set("contact_phone")}
              className={fieldClass}
              placeholder="10-digit mobile number"
              required
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300">Email address</Label>
            <Input
              type="email"
              value={form.contact_email}
              onChange={set("contact_email")}
              className={fieldClass}
              placeholder="college@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300">Nearest branch (optional)</Label>
            <Select
              value={form.branch_id || "none"}
              onValueChange={(v) =>
                setForm((prev) => ({ ...prev, branch_id: v === "none" ? "" : v }))
              }
            >
              <SelectTrigger className={`h-10 ${fieldClass}`}>
                <SelectValue placeholder="Select branch" />
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
        </div>
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 md:p-8 space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-white">Cohort &amp; campus</h2>
          <p className="text-sm text-gray-400">Target students and location</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-gray-300">
              Expected participants <span className="text-[#FFB70F]">*</span>
            </Label>
            <Input
              type="number"
              min={1}
              max={5000}
              value={form.number_of_participants}
              onChange={set("number_of_participants")}
              className={fieldClass}
              required
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300">Year / batch</Label>
            <Input
              value={form.year_of_study}
              onChange={set("year_of_study")}
              className={fieldClass}
              placeholder="e.g. 1st & 2nd year / All batches"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="text-gray-300">Group composition</Label>
            <Input
              value={form.participant_group}
              onChange={set("participant_group")}
              className={fieldClass}
              placeholder="e.g. Mixed, Women-only self-defense, Sports team"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="text-gray-300">
              Campus address line 1 <span className="text-[#FFB70F]">*</span>
            </Label>
            <Input
              value={form.address_line1}
              onChange={set("address_line1")}
              className={fieldClass}
              placeholder="College campus, building, landmark"
              required
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="text-gray-300">Address line 2</Label>
            <Input
              value={form.address_line2}
              onChange={set("address_line2")}
              className={fieldClass}
              placeholder="Area / zone"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300">
              City <span className="text-[#FFB70F]">*</span>
            </Label>
            <Input value={form.city} onChange={set("city")} className={fieldClass} required />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300">
              State <span className="text-[#FFB70F]">*</span>
            </Label>
            <Input value={form.state} onChange={set("state")} className={fieldClass} required />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300">Pincode</Label>
            <Input value={form.pincode} onChange={set("pincode")} className={fieldClass} />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 md:p-8 space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-white">Workshop &amp; schedule</h2>
          <p className="text-sm text-gray-400">Dates, focus areas, and goals</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-gray-300">Preferred date</Label>
            <Input
              type="date"
              value={form.preferred_date}
              onChange={set("preferred_date")}
              className={fieldClass}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300">Preferred time slot</Label>
            <Input
              value={form.preferred_time}
              onChange={set("preferred_time")}
              className={fieldClass}
              placeholder="e.g. Afternoon 2:00 PM / Weekend boot camp"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="text-gray-300">Schedule notes</Label>
            <Input
              value={form.schedule_notes}
              onChange={set("schedule_notes")}
              className={fieldClass}
              placeholder="e.g. 1-day workshop, 3-day boot camp, semester elective"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="text-gray-300">Training focus / discipline</Label>
            <Input
              value={form.training_type}
              onChange={set("training_type")}
              className={fieldClass}
              placeholder="e.g. Women's Self-Defense, Krav Maga, Fitness & Conditioning"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="text-gray-300">Goals &amp; outcomes</Label>
            <Textarea
              value={form.training_goals}
              onChange={set("training_goals")}
              className={`min-h-[80px] ${fieldClass}`}
              placeholder="What should participants gain from the program?"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="text-gray-300">Special requirements</Label>
            <Textarea
              value={form.special_requirements}
              onChange={set("special_requirements")}
              className={`min-h-[80px] ${fieldClass}`}
              placeholder="Space, equipment, permissions, medical notes…"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="text-gray-300">Additional notes</Label>
            <Textarea
              value={form.notes}
              onChange={set("notes")}
              className={`min-h-[60px] ${fieldClass}`}
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
          ) : trainingFee > 0 ? (
            `Pay ${formatInr(trainingFee)} & Submit Request`
          ) : (
            "Submit college training request"
          )}
        </Button>
      </div>
    </form>
  )
}
