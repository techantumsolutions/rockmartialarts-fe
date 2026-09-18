"use client"

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react"
import Link from "next/link"
import { CheckCircle2, Loader2, Home } from "lucide-react"
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
  number_of_participants: string
  address_line1: string
  address_line2: string
  city: string
  state: string
  pincode: string
  preferred_date: string
  preferred_time: string
  training_type: string
  training_goals: string
  special_requirements: string
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
  number_of_participants: "1",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  pincode: "",
  preferred_date: "",
  preferred_time: "",
  training_type: "",
  training_goals: "",
  special_requirements: "",
}

function getBranchName(b: Record<string, unknown>): string {
  const nested = b.branch as { name?: string } | undefined
  return nested?.name || (b.name as string) || (b.code as string) || "Branch"
}

export default function HomeTrainingPublicForm() {
  const [form, setForm] = useState<FormState>(INITIAL)
  const [branches, setBranches] = useState<BranchOpt[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submittedId, setSubmittedId] = useState<string | null>(null)

  useEffect(() => {
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
    if (!form.contact_name.trim()) return "Please enter your contact name"
    if (!form.contact_phone.trim() || form.contact_phone.trim().length < 5)
      return "Please enter a valid contact phone"
    if (!form.participant_name.trim()) return "Please enter the participant name"
    if (!form.participant_phone.trim() || form.participant_phone.trim().length < 5)
      return "Please enter a valid participant phone"
    if (!form.address_line1.trim()) return "Please enter the training address"
    if (!form.city.trim()) return "Please enter the city"
    if (!form.state.trim()) return "Please enter the state"
    const n = parseInt(form.number_of_participants || "1", 10)
    if (!Number.isFinite(n) || n < 1 || n > 50) return "Number of participants must be 1–50"
    if (form.participant_age) {
      const age = parseInt(form.participant_age, 10)
      if (!Number.isFinite(age) || age < 1 || age > 120) return "Please enter a valid age"
    }
    return null
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
    setSubmitting(true)
    try {
      const age = form.participant_age ? parseInt(form.participant_age, 10) : undefined
      const result = await trainingRequestAPI.submitHome({
        contact_name: form.contact_name.trim(),
        contact_phone: form.contact_phone.trim(),
        contact_email: form.contact_email.trim() || undefined,
        branch_id: form.branch_id || undefined,
        branch_name: branch?.name,
        source: "website",
        notes: form.notes.trim() || undefined,
        details: {
          participant_name: form.participant_name.trim(),
          participant_age: age,
          participant_phone: form.participant_phone.trim(),
          participant_email: form.participant_email.trim() || undefined,
          number_of_participants: parseInt(form.number_of_participants || "1", 10),
          address_line1: form.address_line1.trim(),
          address_line2: form.address_line2.trim() || undefined,
          city: form.city.trim(),
          state: form.state.trim(),
          pincode: form.pincode.trim() || undefined,
          preferred_date: form.preferred_date || undefined,
          preferred_time: form.preferred_time.trim() || undefined,
          training_type: form.training_type.trim() || undefined,
          training_goals: form.training_goals.trim() || undefined,
          special_requirements: form.special_requirements.trim() || undefined,
        },
      })
      setSubmittedId(result.request?.id || "ok")
      setForm(INITIAL)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit request")
    } finally {
      setSubmitting(false)
    }
  }

  if (submittedId) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-8 md:p-10 text-center max-w-xl mx-auto">
        <CheckCircle2 className="w-14 h-14 text-[#FFB70F] mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Request submitted</h2>
        <p className="text-gray-300 mb-6">
          Thank you. Our team will review your home training request and get back to you soon.
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
    <form onSubmit={onSubmit} className="space-y-8 max-w-3xl mx-auto">
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 md:p-8 space-y-5">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-lg bg-[#FFB70F]/10 flex items-center justify-center">
            <Home className="w-5 h-5 text-[#FFB70F]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Contact details</h2>
            <p className="text-sm text-gray-400">How we can reach you about this request</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-gray-300">
              Your name <span className="text-[#FFB70F]">*</span>
            </Label>
            <Input
              value={form.contact_name}
              onChange={set("contact_name")}
              className={fieldClass}
              placeholder="Full name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300">
              Phone <span className="text-[#FFB70F]">*</span>
            </Label>
            <Input
              value={form.contact_phone}
              onChange={set("contact_phone")}
              className={fieldClass}
              placeholder="Mobile number"
              required
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300">Email</Label>
            <Input
              type="email"
              value={form.contact_email}
              onChange={set("contact_email")}
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
                <SelectValue placeholder="Select branch (optional)" />
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
          <h2 className="text-lg font-semibold text-white">Participant &amp; location</h2>
          <p className="text-sm text-gray-400">Who will train and where</p>
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
              placeholder="Optional"
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
            <Label className="text-gray-300">Number of participants</Label>
            <Input
              type="number"
              min={1}
              max={50}
              value={form.number_of_participants}
              onChange={set("number_of_participants")}
              className={fieldClass}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="text-gray-300">
              Address line 1 <span className="text-[#FFB70F]">*</span>
            </Label>
            <Input
              value={form.address_line1}
              onChange={set("address_line1")}
              className={fieldClass}
              placeholder="House / flat, street"
              required
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="text-gray-300">Address line 2</Label>
            <Input
              value={form.address_line2}
              onChange={set("address_line2")}
              className={fieldClass}
              placeholder="Landmark, area"
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
          <h2 className="text-lg font-semibold text-white">Training preferences</h2>
          <p className="text-sm text-gray-400">Preferred schedule and goals</p>
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
            <Label className="text-gray-300">Preferred time</Label>
            <Input
              value={form.preferred_time}
              onChange={set("preferred_time")}
              className={fieldClass}
              placeholder="e.g. Morning / 10:00 AM"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="text-gray-300">Training type</Label>
            <Input
              value={form.training_type}
              onChange={set("training_type")}
              className={fieldClass}
              placeholder="e.g. Karate, self-defense, fitness"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="text-gray-300">Training goals</Label>
            <Textarea
              value={form.training_goals}
              onChange={set("training_goals")}
              className={`min-h-[80px] ${fieldClass}`}
              placeholder="What would you like to achieve?"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="text-gray-300">Special requirements</Label>
            <Textarea
              value={form.special_requirements}
              onChange={set("special_requirements")}
              className={`min-h-[80px] ${fieldClass}`}
              placeholder="Space, equipment, medical notes, etc."
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
              Submitting…
            </>
          ) : (
            "Submit home training request"
          )}
        </Button>
      </div>
    </form>
  )
}
