"use client"

import { useState, type ChangeEvent, type FormEvent } from "react"
import Link from "next/link"
import { CheckCircle2, CreditCard, GraduationCap, Loader2, Sparkles } from "lucide-react"
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
import { learningCourseAPI, type LearningCourse } from "@/lib/learningCourseAPI"
import { openRazorpayCheckout } from "@/lib/razorpay"

type FormState = {
  student_name: string
  email: string
  phone: string
  city: string
  state: string
  address: string
  pincode: string
  skill_level: string
  learning_goals: string
  notes: string
}

const INITIAL: FormState = {
  student_name: "",
  email: "",
  phone: "",
  city: "",
  state: "",
  address: "",
  pincode: "",
  skill_level: "Beginner",
  learning_goals: "",
  notes: "",
}

function formatInr(n?: number | null) {
  if (n == null) return "—"
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n)
}

export default function OnlineCourseEnrollmentForm({
  course,
}: {
  course: LearningCourse
}) {
  const [form, setForm] = useState<FormState>(INITIAL)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submittedData, setSubmittedData] = useState<{
    id: string
    payment_id?: string
  } | null>(null)

  const price = typeof course.price === "number" && course.price > 0 ? course.price : 0

  const set =
    (key: keyof FormState) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }))
    }

  const validate = (): string | null => {
    if (!form.student_name.trim()) return "Please enter your full name"
    if (!form.email.trim() || !form.email.includes("@"))
      return "Please enter a valid email address"
    if (!form.phone.trim() || form.phone.trim().length < 8)
      return "Please enter a valid phone number"
    if (!form.city.trim()) return "Please enter your city"
    if (!form.state.trim()) return "Please enter your state"
    return null
  }

  const sendSubmission = async (paymentDetails?: {
    razorpay_order_id?: string
    razorpay_payment_id?: string
    razorpay_signature?: string
  }) => {
    const result = await learningCourseAPI.submitEnrollment({
      course_id: course.id,
      student_name: form.student_name.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      address: form.address.trim() || undefined,
      pincode: form.pincode.trim() || undefined,
      skill_level: form.skill_level || undefined,
      learning_goals: form.learning_goals.trim() || undefined,
      notes: form.notes.trim() || undefined,
      razorpay_order_id: paymentDetails?.razorpay_order_id,
      razorpay_payment_id: paymentDetails?.razorpay_payment_id,
      razorpay_signature: paymentDetails?.razorpay_signature,
    })
    setSubmittedData({
      id: result.enrollment?.id || "ok",
      payment_id: paymentDetails?.razorpay_payment_id,
    })
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
      if (price > 0) {
        const orderData = await learningCourseAPI.createEnrollmentOrder({
          course_id: course.id,
          student_name: form.student_name.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim(),
        })

        if (orderData.fee_required && orderData.order_id) {
          await openRazorpayCheckout({
            amountPaise: orderData.amount_paise || Math.round(price * 100),
            razorpayKeyId: orderData.key_id || "",
            currency: orderData.currency || "INR",
            name: "Rock Martial Arts",
            description: `Enrollment: ${course.title}`,
            customerName: form.student_name.trim(),
            customerEmail: form.email.trim().toLowerCase(),
            customerContact: form.phone.trim(),
            orderId: orderData.order_id,
            onSuccess: async (rpResponse) => {
              try {
                await sendSubmission({
                  razorpay_order_id: rpResponse.razorpay_order_id,
                  razorpay_payment_id: rpResponse.razorpay_payment_id,
                  razorpay_signature: rpResponse.razorpay_signature,
                })
              } catch (err) {
                setError(
                  err instanceof Error
                    ? err.message
                    : "Payment succeeded but enrollment submission failed. Contact support."
                )
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
      } else {
        await sendSubmission()
        setSubmitting(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process enrollment")
      setSubmitting(false)
    }
  }

  if (submittedData) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-8 md:p-10 text-center max-w-xl mx-auto shadow-xl">
        <CheckCircle2 className="w-14 h-14 text-[#FFB70F] mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Enrollment Confirmed!</h2>
        <p className="text-gray-300 mb-2">
          You are enrolled in <span className="font-semibold text-white">{course.title}</span>.
        </p>
        {submittedData.payment_id ? (
          <p className="text-xs text-gray-400 font-mono mb-6">
            Payment Ref: {submittedData.payment_id}
          </p>
        ) : (
          <p className="text-xs text-green-400 font-medium mb-6">
            Free enrollment successfully processed.
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild className="bg-[#FFB70F] hover:bg-[#e0a00d] text-black font-semibold">
            <Link href={`/online-learning/${course.slug}/learn`}>
              Start Learning Now
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-gray-600 text-white hover:bg-gray-800"
            onClick={() => setSubmittedData(null)}
          >
            Enroll Another Student
          </Button>
        </div>
      </div>
    )
  }

  const fieldClass =
    "bg-gray-950/60 border-gray-700 text-white placeholder:text-gray-500 focus-visible:ring-[#FFB70F]"

  return (
    <form onSubmit={onSubmit} className="w-full space-y-6">
      {/* Price Summary Card */}
      <div className="rounded-xl border border-[#FFB70F]/30 bg-[#FFB70F]/10 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <CreditCard className="w-7 h-7 text-[#FFB70F] shrink-0" />
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-400 font-medium">
              Course Enrollment Fee
            </p>
            <p className="text-2xl font-bold text-[#FFB70F]">
              {price > 0 ? formatInr(price) : "Free"}
            </p>
          </div>
        </div>
        <div className="text-xs text-gray-400">
          {price > 0 ? (
            <span className="flex items-center gap-1.5 text-gray-300">
              <Sparkles className="w-3.5 h-3.5 text-[#FFB70F]" />
              Secure checkout via Razorpay
            </span>
          ) : (
            <span className="text-green-400 font-medium">Instant free access</span>
          )}
        </div>
      </div>

      {/* Student Details Card */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 md:p-8 space-y-5">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-lg bg-[#FFB70F]/10 flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5 text-[#FFB70F]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Student Enrollment Form</h3>
            <p className="text-sm text-gray-400">
              Please enter your details to enroll in this course
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-800/80 bg-red-950/40 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label className="text-gray-300">
              Student Full Name <span className="text-[#FFB70F]">*</span>
            </Label>
            <Input
              value={form.student_name}
              onChange={set("student_name")}
              className={fieldClass}
              placeholder="e.g. John Doe"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300">
              Email Address <span className="text-[#FFB70F]">*</span>
            </Label>
            <Input
              type="email"
              value={form.email}
              onChange={set("email")}
              className={fieldClass}
              placeholder="student@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300">
              Mobile Number <span className="text-[#FFB70F]">*</span>
            </Label>
            <Input
              value={form.phone}
              onChange={set("phone")}
              className={fieldClass}
              placeholder="10-digit mobile number"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300">Skill Level</Label>
            <Select
              value={form.skill_level}
              onValueChange={(v) => setForm((prev) => ({ ...prev, skill_level: v }))}
            >
              <SelectTrigger className={`h-10 ${fieldClass}`}>
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Beginner">Beginner</SelectItem>
                <SelectItem value="Intermediate">Intermediate</SelectItem>
                <SelectItem value="Advanced">Advanced</SelectItem>
                <SelectItem value="All Levels">All Levels</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300">
              City <span className="text-[#FFB70F]">*</span>
            </Label>
            <Input
              value={form.city}
              onChange={set("city")}
              className={fieldClass}
              placeholder="e.g. Hyderabad"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300">
              State <span className="text-[#FFB70F]">*</span>
            </Label>
            <Input
              value={form.state}
              onChange={set("state")}
              className={fieldClass}
              placeholder="e.g. Telangana"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300">Pincode</Label>
            <Input
              value={form.pincode}
              onChange={set("pincode")}
              className={fieldClass}
              placeholder="e.g. 500001"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label className="text-gray-300">Address (Optional)</Label>
            <Input
              value={form.address}
              onChange={set("address")}
              className={fieldClass}
              placeholder="House/Flat, Street name"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label className="text-gray-300">Learning Goals / Notes (Optional)</Label>
            <Textarea
              value={form.learning_goals}
              onChange={set("learning_goals")}
              className={fieldClass}
              placeholder="Tell us what you hope to achieve with this course…"
              rows={3}
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={submitting}
          className="w-full h-12 bg-[#FFB70F] hover:bg-[#e0a00d] text-black font-semibold text-base mt-2"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Processing…
            </>
          ) : price > 0 ? (
            <>
              Pay {formatInr(price)} &amp; Complete Enrollment
            </>
          ) : (
            "Complete Free Enrollment"
          )}
        </Button>
      </div>
    </form>
  )
}

