"use client"

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react"
import Link from "next/link"
import { CheckCircle2, GraduationCap, Loader2 } from "lucide-react"
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

function getBranchName(b: Record<string, unknown>): string {
  const nested = b.branch as { name?: string } | undefined
  return nested?.name || (b.name as string) || (b.code as string) || "Branch"
}

export default function CollegeTrainingPublicForm() {
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
      const result = await trainingRequestAPI.submitCollege({
        contact_name: form.contact_name.trim(),
        contact_phone: form.contact_phone.trim(),
        contact_email: form.contact_email.trim() || undefined,
        branch_id: form.branch_id || undefined,
        branch_name: branch?.name,
        source: "website",
        notes: form.notes.trim() || undefined,
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
    <form onSubmit={onSubmit} className="space-y-8 max-w-3xl mx-auto">
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 md:p-8 space-y-5">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-lg bg-[#FFB70F]/10 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-[#FFB70F]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">College &amp; contact</h2>
            <p className="text-sm text-gray-400">Institution details and who we should reach</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label className="text-gray-300">
              College name <span className="text-[#FFB70F]">*</span>
            </Label>
            <Input
              value={form.college_name}
              onChange={set("college_name")}
              className={fieldClass}
              placeholder="Full college / university name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300">College type</Label>
            <Input
              value={form.college_type}
              onChange={set("college_type")}
              className={fieldClass}
              placeholder="e.g. Engineering, Arts, University"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300">Department</Label>
            <Input
              value={form.department}
              onChange={set("department")}
              className={fieldClass}
              placeholder="e.g. Sports, NSS, Student Affairs"
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
          <div className="space-y-2">
            <Label className="text-gray-300">
              Contact name <span className="text-[#FFB70F]">*</span>
            </Label>
            <Input
              value={form.contact_name}
              onChange={set("contact_name")}
              className={fieldClass}
              placeholder="Dean / coordinator / faculty"
              required
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300">Designation</Label>
            <Input
              value={form.contact_designation}
              onChange={set("contact_designation")}
              className={fieldClass}
              placeholder="e.g. Dean, Coordinator"
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
        </div>
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 md:p-8 space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-white">Participants &amp; location</h2>
          <p className="text-sm text-gray-400">Student group and campus address</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-gray-300">Number of participants</Label>
            <Input
              type="number"
              min={1}
              max={5000}
              value={form.number_of_participants}
              onChange={set("number_of_participants")}
              className={fieldClass}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300">Year of study</Label>
            <Input
              value={form.year_of_study}
              onChange={set("year_of_study")}
              className={fieldClass}
              placeholder="e.g. 1st–3rd year"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="text-gray-300">Participant group</Label>
            <Input
              value={form.participant_group}
              onChange={set("participant_group")}
              className={fieldClass}
              placeholder="e.g. Mixed batch / Girls only / Club members"
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
              placeholder="Campus / building"
              required
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="text-gray-300">Address line 2</Label>
            <Input
              value={form.address_line2}
              onChange={set("address_line2")}
              className={fieldClass}
              placeholder="Area / landmark"
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
          <h2 className="text-lg font-semibold text-white">Schedule &amp; training</h2>
          <p className="text-sm text-gray-400">Preferred timing and program goals</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-gray-300">Preferred start date</Label>
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
              placeholder="e.g. Evening / 5:00 PM"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="text-gray-300">Schedule notes</Label>
            <Textarea
              value={form.schedule_notes}
              onChange={set("schedule_notes")}
              className={`min-h-[60px] ${fieldClass}`}
              placeholder="Weekly days, free periods, semester breaks…"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="text-gray-300">Training type</Label>
            <Input
              value={form.training_type}
              onChange={set("training_type")}
              className={fieldClass}
              placeholder="e.g. Self-defense, fitness, martial arts"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="text-gray-300">Training goals</Label>
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
              Submitting…
            </>
          ) : (
            "Submit college training request"
          )}
        </Button>
      </div>
    </form>
  )
}
