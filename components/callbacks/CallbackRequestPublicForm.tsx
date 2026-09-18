"use client"

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react"
import Link from "next/link"
import { CheckCircle2, Loader2, Phone } from "lucide-react"
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
import { CALLBACK_PRIORITIES, callbackAPI } from "@/lib/callbackAPI"

type BranchOpt = { id: string; name: string }

type FormState = {
  name: string
  phone: string
  email: string
  branch_id: string
  preferred_time: string
  preferred_date: string
  course_interest: string
  message: string
  priority: string
}

const INITIAL: FormState = {
  name: "",
  phone: "",
  email: "",
  branch_id: "",
  preferred_time: "",
  preferred_date: "",
  course_interest: "",
  message: "",
  priority: "normal",
}

const TIME_WINDOWS = [
  "Morning (9 AM – 12 PM)",
  "Afternoon (12 PM – 4 PM)",
  "Evening (4 PM – 8 PM)",
  "Anytime",
]

function getBranchName(b: Record<string, unknown>): string {
  const nested = b.branch as { name?: string } | undefined
  return nested?.name || (b.name as string) || (b.code as string) || "Branch"
}

export default function CallbackRequestPublicForm() {
  const [form, setForm] = useState<FormState>(INITIAL)
  const [branches, setBranches] = useState<BranchOpt[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

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
    if (!form.name.trim()) return "Please enter your name"
    if (!form.phone.trim() || form.phone.trim().length < 5)
      return "Please enter a valid phone number"
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
      await callbackAPI.create({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        branch_id: form.branch_id || undefined,
        branch_name: branch?.name,
        preferred_time: form.preferred_time.trim() || undefined,
        preferred_date: form.preferred_date || undefined,
        course_interest: form.course_interest.trim() || undefined,
        message: form.message.trim() || undefined,
        priority: form.priority || "normal",
      })
      setSubmitted(true)
      setForm(INITIAL)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit callback request")
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-8 md:p-10 text-center max-w-xl mx-auto">
        <CheckCircle2 className="w-14 h-14 text-[#FFB70F] mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Request received</h2>
        <p className="text-gray-300 mb-6">
          Thank you. Our team will call you back soon at the number you provided.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            type="button"
            className="bg-[#FFB70F] hover:bg-[#e0a00d] text-black"
            onClick={() => setSubmitted(false)}
          >
            Submit another
          </Button>
          <Button
            asChild
            type="button"
            variant="outline"
            className="border-gray-600 text-white hover:bg-gray-800"
          >
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 md:p-8 max-w-2xl mx-auto space-y-5"
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-lg bg-[#FFB70F]/10 flex items-center justify-center">
          <Phone className="w-5 h-5 text-[#FFB70F]" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Request a callback</h2>
          <p className="text-gray-400 text-sm">We’ll call you at a time that works for you.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="cb-name" className="text-gray-200">
            Full name <span className="text-red-400">*</span>
          </Label>
          <Input
            id="cb-name"
            value={form.name}
            onChange={set("name")}
            placeholder="Your name"
            className="bg-gray-950 border-gray-700 text-white"
            autoComplete="name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cb-phone" className="text-gray-200">
            Phone <span className="text-red-400">*</span>
          </Label>
          <Input
            id="cb-phone"
            type="tel"
            value={form.phone}
            onChange={set("phone")}
            placeholder="+91 98XXXXXXXX"
            className="bg-gray-950 border-gray-700 text-white"
            autoComplete="tel"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cb-email" className="text-gray-200">
            Email
          </Label>
          <Input
            id="cb-email"
            type="email"
            value={form.email}
            onChange={set("email")}
            placeholder="you@example.com"
            className="bg-gray-950 border-gray-700 text-white"
            autoComplete="email"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-gray-200">Preferred branch</Label>
          <Select
            value={form.branch_id || "none"}
            onValueChange={(v) =>
              setForm((prev) => ({ ...prev, branch_id: v === "none" ? "" : v }))
            }
          >
            <SelectTrigger className="bg-gray-950 border-gray-700 text-white">
              <SelectValue placeholder="Any branch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Any branch</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-gray-200">Preferred time</Label>
          <Select
            value={form.preferred_time || "none"}
            onValueChange={(v) =>
              setForm((prev) => ({
                ...prev,
                preferred_time: v === "none" ? "" : v,
              }))
            }
          >
            <SelectTrigger className="bg-gray-950 border-gray-700 text-white">
              <SelectValue placeholder="Anytime" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Anytime</SelectItem>
              {TIME_WINDOWS.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="cb-date" className="text-gray-200">
            Preferred date
          </Label>
          <Input
            id="cb-date"
            type="date"
            value={form.preferred_date}
            onChange={set("preferred_date")}
            className="bg-gray-950 border-gray-700 text-white"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-gray-200">Urgency</Label>
          <Select
            value={form.priority}
            onValueChange={(v) => setForm((prev) => ({ ...prev, priority: v }))}
          >
            <SelectTrigger className="bg-gray-950 border-gray-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CALLBACK_PRIORITIES.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="cb-course" className="text-gray-200">
            Course interest
          </Label>
          <Input
            id="cb-course"
            value={form.course_interest}
            onChange={set("course_interest")}
            placeholder="e.g. Karate, Taekwondo, Kids program"
            className="bg-gray-950 border-gray-700 text-white"
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="cb-message" className="text-gray-200">
            Message
          </Label>
          <Textarea
            id="cb-message"
            value={form.message}
            onChange={set("message")}
            placeholder="Anything we should know before we call?"
            rows={4}
            className="bg-gray-950 border-gray-700 text-white resize-y"
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-400 bg-red-950/40 border border-red-900/50 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <Button
        type="submit"
        disabled={submitting}
        className="w-full sm:w-auto bg-[#FFB70F] hover:bg-[#e0a00d] text-black font-medium"
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Submitting…
          </>
        ) : (
          "Request callback"
        )}
      </Button>
    </form>
  )
}
