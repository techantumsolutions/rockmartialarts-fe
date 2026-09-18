"use client"

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react"
import Link from "next/link"
import { CheckCircle2, Loader2, Tent } from "lucide-react"
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
import {
  paymentStatusLabel,
  trainingRequestAPI,
  type ResidentialPackage,
  type TrainingRequest,
} from "@/lib/trainingRequestAPI"
import { loadRazorpayScript } from "@/lib/razorpay"

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
  package_id: string
  preferred_start_date: string
  preferred_end_date: string
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
  package_id: "",
  preferred_start_date: "",
  preferred_end_date: "",
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
  const [packages, setPackages] = useState<ResidentialPackage[]>([])
  const [branches, setBranches] = useState<BranchOpt[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState<TrainingRequest | null>(null)

  useEffect(() => {
    trainingRequestAPI
      .listResidentialPackages()
      .then((data) => {
        const list = data.packages || []
        setPackages(list)
        if (list.length && !form.package_id) {
          setForm((prev) => ({ ...prev, package_id: list[0].id }))
        }
      })
      .catch(() => setPackages([]))

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectedPkg = packages.find((p) => p.id === form.package_id)

  const set =
    (key: keyof FormState) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }))
    }

  const validate = (): string | null => {
    if (!form.contact_name.trim()) return "Please enter the contact name"
    if (!form.contact_phone.trim() || form.contact_phone.trim().length < 5)
      return "Please enter a valid contact phone"
    if (!form.participant_name.trim()) return "Please enter the participant name"
    if (!form.participant_phone.trim() || form.participant_phone.trim().length < 5)
      return "Please enter a valid participant phone"
    if (!form.package_id) return "Please select a residential package"
    if (form.participant_age) {
      const age = parseInt(form.participant_age, 10)
      if (!Number.isFinite(age) || age < 1 || age > 120) return "Please enter a valid age"
    }
    return null
  }

  const startPayment = async (request: TrainingRequest) => {
    if (request.payment_status === "paid" || request.payment_status === "not_required") return
    setPaying(true)
    setError(null)
    try {
      const okScript = await loadRazorpayScript()
      if (!okScript) throw new Error("Could not load payment gateway")
      const orderRes = await trainingRequestAPI.createResidentialOrder(request.id)
      if (!orderRes.key) throw new Error("Payment gateway is not configured")
      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: orderRes.key,
          amount: orderRes.order.amount,
          currency: orderRes.order.currency || "INR",
          name: "Rock Martial Arts",
          description: "Residential training deposit",
          order_id: orderRes.order.id,
          prefill: {
            name: request.contact_name,
            email: request.contact_email || undefined,
            contact: request.contact_phone,
          },
          theme: { color: "#FFB70F" },
          handler: async (response) => {
            try {
              const verified = await trainingRequestAPI.verifyResidentialPayment(request.id, {
                razorpay_order_id: response.razorpay_order_id || orderRes.order.id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature || "",
              })
              setSubmitted(verified.request)
              resolve()
            } catch (err) {
              reject(err)
            }
          },
          modal: {
            ondismiss: () => resolve(),
          },
        })
        rzp.open()
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed")
    } finally {
      setPaying(false)
    }
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    const v = validate()
    if (v) {
      setError(v)
      return
    }
    const branch = branches.find((b) => b.id === form.branch_id)
    const age = form.participant_age ? parseInt(form.participant_age, 10) : undefined
    setSubmitting(true)
    try {
      const result = await trainingRequestAPI.submitResidential({
        contact_name: form.contact_name.trim(),
        contact_phone: form.contact_phone.trim(),
        contact_email: form.contact_email.trim() || undefined,
        branch_id: form.branch_id || undefined,
        branch_name: branch?.name,
        source: "website",
        notes: form.notes.trim() || undefined,
        pay_now: Boolean(selectedPkg?.payment_required && (selectedPkg?.fee_pay_now_inr || 0) > 0),
        details: {
          participant_name: form.participant_name.trim(),
          participant_age: age,
          participant_phone: form.participant_phone.trim(),
          participant_email: form.participant_email.trim() || undefined,
          gender: form.gender.trim() || undefined,
          emergency_contact_name: form.emergency_contact_name.trim() || undefined,
          emergency_contact_phone: form.emergency_contact_phone.trim() || undefined,
          package_id: form.package_id,
          preferred_start_date: form.preferred_start_date || undefined,
          preferred_end_date: form.preferred_end_date || undefined,
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
      setForm((prev) => ({ ...INITIAL, package_id: prev.package_id || packages[0]?.id || "" }))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit request")
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    const needsPay =
      submitted.payment_status === "pending" && (submitted.fee_pay_now_inr || 0) > 0
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-8 md:p-10 text-center max-w-xl mx-auto space-y-4">
        <CheckCircle2 className="w-14 h-14 text-[#FFB70F] mx-auto" />
        <h2 className="text-2xl font-bold text-white">Request submitted</h2>
        <p className="text-gray-300">
          Thank you. Our team will review your residential training request.
        </p>
        <div className="text-sm text-gray-400 space-y-1">
          <p>Package: {String((submitted.details as ResidentialTrainingDetailsSafe)?.package_name || "—")}</p>
          <p>Total fee: {formatInr(submitted.fee_total_inr)}</p>
          <p>Pay now: {formatInr(submitted.fee_pay_now_inr)}</p>
          <p>Payment: {paymentStatusLabel(submitted.payment_status)}</p>
        </div>
        {error && (
          <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-4 py-3">
            {error}
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          {needsPay ? (
            <Button
              type="button"
              className="bg-[#FFB70F] hover:bg-[#e0a00d] text-black"
              disabled={paying}
              onClick={() => startPayment(submitted)}
            >
              {paying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Opening payment…
                </>
              ) : (
                `Pay ${formatInr(submitted.fee_pay_now_inr)} now`
              )}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            className="border-gray-600 text-white hover:bg-gray-800"
            onClick={() => {
              setSubmitted(null)
              setError(null)
            }}
          >
            Submit another
          </Button>
          <Button asChild variant="outline" className="border-gray-600 text-white hover:bg-gray-800">
            <Link href="/">Back to home</Link>
          </Button>
        </div>
        {needsPay ? (
          <p className="text-xs text-gray-500">
            You can also pay later — our team will follow up with payment instructions.
          </p>
        ) : null}
      </div>
    )
  }

  const fieldClass =
    "bg-gray-950/60 border-gray-700 text-white placeholder:text-gray-500 focus-visible:ring-[#FFB70F]"

  return (
    <form onSubmit={onSubmit} className="space-y-8 max-w-3xl mx-auto">
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 md:p-8 space-y-5">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-lg bg-[#FFB70F]/10 flex items-center justify-center">
            <Tent className="w-5 h-5 text-[#FFB70F]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Package &amp; schedule</h2>
            <p className="text-sm text-gray-400">Choose duration and preferred dates</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3">
          {packages.map((pkg) => {
            const active = form.package_id === pkg.id
            return (
              <button
                key={pkg.id}
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, package_id: pkg.id }))}
                className={`text-left rounded-lg border p-4 transition-colors ${
                  active
                    ? "border-[#FFB70F] bg-[#FFB70F]/10"
                    : "border-gray-700 bg-gray-950/40 hover:border-gray-500"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <div className="font-semibold text-white">{pkg.name}</div>
                    <div className="text-sm text-gray-400">{pkg.duration_label}</div>
                    {pkg.description ? (
                      <div className="text-xs text-gray-500 mt-1">{pkg.description}</div>
                    ) : null}
                  </div>
                  <div className="text-sm text-[#FFB70F] whitespace-nowrap">
                    {pkg.fee_total_inr > 0 ? (
                      <>
                        {formatInr(pkg.fee_total_inr)}
                        <span className="text-gray-400">
                          {" "}
                          · pay now {formatInr(pkg.fee_pay_now_inr)}
                        </span>
                      </>
                    ) : (
                      "Enquiry — fees confirmed later"
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="space-y-2">
            <Label className="text-gray-300">Preferred start date</Label>
            <Input
              type="date"
              value={form.preferred_start_date}
              onChange={set("preferred_start_date")}
              className={fieldClass}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300">Preferred end date</Label>
            <Input
              type="date"
              value={form.preferred_end_date}
              onChange={set("preferred_end_date")}
              className={fieldClass}
            />
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
        </div>
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 md:p-8 space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-white">Participant &amp; contact</h2>
          <p className="text-sm text-gray-400">Admission and emergency details</p>
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
              required
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300">
              Contact phone <span className="text-[#FFB70F]">*</span>
            </Label>
            <Input
              value={form.contact_phone}
              onChange={set("contact_phone")}
              className={fieldClass}
              required
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300">Contact email</Label>
            <Input
              type="email"
              value={form.contact_email}
              onChange={set("contact_email")}
              className={fieldClass}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300">Emergency contact name</Label>
            <Input
              value={form.emergency_contact_name}
              onChange={set("emergency_contact_name")}
              className={fieldClass}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300">Emergency contact phone</Label>
            <Input
              value={form.emergency_contact_phone}
              onChange={set("emergency_contact_phone")}
              className={fieldClass}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300">City</Label>
            <Input value={form.city} onChange={set("city")} className={fieldClass} />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300">State</Label>
            <Input value={form.state} onChange={set("state")} className={fieldClass} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="text-gray-300">Medical notes</Label>
            <Textarea
              value={form.medical_notes}
              onChange={set("medical_notes")}
              className={`min-h-[60px] ${fieldClass}`}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="text-gray-300">Training goals</Label>
            <Textarea
              value={form.training_goals}
              onChange={set("training_goals")}
              className={`min-h-[60px] ${fieldClass}`}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="text-gray-300">Special requirements</Label>
            <Textarea
              value={form.special_requirements}
              onChange={set("special_requirements")}
              className={`min-h-[60px] ${fieldClass}`}
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

      {selectedPkg ? (
        <p className="text-center text-sm text-gray-400">
          Selected: <span className="text-[#FFB70F]">{selectedPkg.name}</span>
          {selectedPkg.fee_total_inr > 0
            ? ` · Total ${formatInr(selectedPkg.fee_total_inr)} · Deposit ${formatInr(selectedPkg.fee_pay_now_inr)}`
            : " · Enquiry only (no online payment)"}
        </p>
      ) : null}

      {error && (
        <p className="text-sm text-red-400 text-center bg-red-950/40 border border-red-900 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      <div className="flex justify-center">
        <Button
          type="submit"
          disabled={submitting || !form.package_id}
          className="bg-[#FFB70F] hover:bg-[#e0a00d] text-black font-semibold px-10 py-6 text-base"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting…
            </>
          ) : (
            "Submit residential training request"
          )}
        </Button>
      </div>
    </form>
  )
}

type ResidentialTrainingDetailsSafe = {
  package_name?: string | null
}
