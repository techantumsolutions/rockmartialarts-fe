"use client"

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react"
import Link from "next/link"
import { all as getAllCountries } from "country-codes-list"
import { CheckCircle2, Loader2, Upload, UserPlus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { resolvePublicAssetUrl } from "@/lib/resolvePublicAssetUrl"
import {
  coachRegistrationAPI,
  optionLabel,
  optionValue,
  type CoachRegisterOption,
} from "@/lib/coachRegistrationAPI"
import { settingsAPI } from "@/lib/settingsAPI"
import { openRazorpayCheckout } from "@/lib/razorpay"

type BranchOpt = { id: string; name: string }

const COUNTRY_CALLING_CODES = getAllCountries().sort((a, b) =>
  a.countryNameEn.localeCompare(b.countryNameEn)
)

type FormState = {
  first_name: string
  last_name: string
  gender: string
  date_of_birth: string
  email: string
  country_code: string
  phone: string
  address: string
  area: string
  city: string
  state: string
  zip_code: string
  country: string
  professional_experience: string
  education_qualification: string
  designation: string
  specializations: string[]
  service_location_ids: string[]
  profile_image_url: string
  about_short: string
}

const INITIAL: FormState = {
  first_name: "",
  last_name: "",
  gender: "",
  date_of_birth: "",
  email: "",
  country_code: "+91",
  phone: "",
  address: "",
  area: "",
  city: "",
  state: "",
  zip_code: "",
  country: "India",
  professional_experience: "",
  education_qualification: "",
  designation: "",
  specializations: [],
  service_location_ids: [],
  profile_image_url: "",
  about_short: "",
}

export default function CoachRegistrationPublicForm() {
  const [form, setForm] = useState<FormState>(INITIAL)
  const [phoneCountry, setPhoneCountry] = useState("IN")
  const [branches, setBranches] = useState<BranchOpt[]>([])
  const [specializations, setSpecializations] = useState<CoachRegisterOption[]>([])
  const [experienceRanges, setExperienceRanges] = useState<CoachRegisterOption[]>([])
  const [genders, setGenders] = useState<CoachRegisterOption[]>([])
  const [designations, setDesignations] = useState<CoachRegisterOption[]>([])
  const [countries, setCountries] = useState<CoachRegisterOption[]>([])
  const [coachFee, setCoachFee] = useState<number>(0)
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{
    experience?: string
    specializations?: string
    email?: string
    phone?: string
  }>({})
  const [done, setDone] = useState<{ coach_id: string; message: string } | null>(null)
  const successRef = useRef<HTMLDivElement>(null)
  const emailFieldRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!done) return
    successRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [done])

  useEffect(() => {
    coachRegistrationAPI
      .options()
      .then((data) => {
        setBranches(data.branches || [])
        setSpecializations(data.specializations || [])
        setExperienceRanges(data.experience_ranges || [])
        setGenders(data.genders || [])
        setDesignations(data.designations || [])
        setCountries(data.countries || [])
      })
      .catch(() => {
        setBranches([])
        setSpecializations([])
      })

    settingsAPI
      .getPublicSettings()
      .then((data) => {
        const fee = Number(data.coachRegistrationFee ?? data.coach_registration_fee ?? 0)
        setCoachFee(Number.isFinite(fee) && fee > 0 ? fee : 0)
      })
      .catch(() => {
        setCoachFee(0)
      })
  }, [])

  const toggleSpec = (value: string) => {
    setFieldErrors((prev) =>
      prev.specializations ? { ...prev, specializations: undefined } : prev
    )
    setForm((prev) => ({
      ...prev,
      specializations: prev.specializations.includes(value)
        ? prev.specializations.filter((s) => s !== value)
        : [...prev.specializations, value],
    }))
  }

  const toggleLocation = (id: string) => {
    setForm((prev) => ({
      ...prev,
      service_location_ids: prev.service_location_ids.includes(id)
        ? prev.service_location_ids.filter((s) => s !== id)
        : [...prev.service_location_ids, id],
    }))
  }

  const onPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const data = await coachRegistrationAPI.uploadPhoto(file)
      setForm((prev) => ({ ...prev, profile_image_url: data.file_url }))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Photo upload failed")
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }

  const submitRegistration = async (paymentDetails?: {
    razorpay_payment_id?: string
    razorpay_order_id?: string
    razorpay_signature?: string
  }) => {
    try {
      const result = await coachRegistrationAPI.register({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        gender: form.gender,
        date_of_birth: form.date_of_birth,
        email: form.email.trim(),
        country_code: form.country_code.trim() || "+91",
        phone: form.phone.trim(),
        address: form.address.trim(),
        area: form.area.trim() || undefined,
        city: form.city.trim(),
        state: form.state.trim(),
        zip_code: form.zip_code.trim() || undefined,
        country: form.country.trim() || "India",
        professional_experience: form.professional_experience.trim(),
        education_qualification: form.education_qualification.trim() || undefined,
        designation: form.designation.trim() || "Coach",
        specializations: form.specializations,
        service_location_ids: form.service_location_ids,
        profile_image_url: form.profile_image_url || undefined,
        about_short: form.about_short.trim() || undefined,
        razorpay_payment_id: paymentDetails?.razorpay_payment_id,
        razorpay_order_id: paymentDetails?.razorpay_order_id,
        razorpay_signature: paymentDetails?.razorpay_signature,
      })
      setDone({ coach_id: result.coach_id, message: result.message })
      setForm(INITIAL)
      setPhoneCountry("IN")
      setFieldErrors({})
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Registration failed"
      const lower = msg.toLowerCase()
      if (lower.includes("email")) {
        setFieldErrors((prev) => ({
          ...prev,
          email: lower.includes("already exists")
            ? "A coach with this email already exists"
            : msg,
        }))
        requestAnimationFrame(() => {
          emailFieldRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
        })
      } else {
        setError(msg)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    const nextFieldErrors: {
      experience?: string
      specializations?: string
      email?: string
      phone?: string
    } = {}
    if (!form.first_name.trim()) {
      setError("First name is required")
      return
    }
    if (!form.last_name.trim()) {
      setError("Last name is required")
      return
    }
    if (!form.gender) {
      setError("Gender is required")
      return
    }
    if (!form.date_of_birth) {
      setError("Date of birth is required")
      return
    }
    const cleanEmail = form.email.trim()
    if (!cleanEmail) {
      nextFieldErrors.email = "Email is required"
    } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(cleanEmail)) {
      nextFieldErrors.email = "Please enter a valid email address (e.g. name@example.com)"
    }
    const cleanPhone = form.phone.trim()
    if (!cleanPhone) {
      nextFieldErrors.phone = "Phone number is required"
    } else if (form.country_code === "+91") {
      if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
        nextFieldErrors.phone = "Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9"
      }
    } else {
      if (!/^\d{7,15}$/.test(cleanPhone)) {
        nextFieldErrors.phone = "Please enter a valid phone number (7 to 15 digits)"
      }
    }
    if (!form.address.trim() || !form.city.trim() || !form.state.trim()) {
      setError("Address, city and state are required")
      return
    }
    if (!form.professional_experience.trim()) {
      nextFieldErrors.experience = "Experience is required"
    }
    if (form.specializations.length === 0) {
      nextFieldErrors.specializations = "Select at least one specialization"
    }
    setFieldErrors(nextFieldErrors)
    if (nextFieldErrors.experience || nextFieldErrors.specializations || nextFieldErrors.email || nextFieldErrors.phone) {
      return
    }
    if (form.service_location_ids.length === 0) {
      setError("Select at least one service location (branch)")
      return
    }

    setSubmitting(true)

    // Verify with backend whether registration fee is required and create Razorpay order
    try {
      const orderData = await coachRegistrationAPI.createOrder({
        name: `${form.first_name.trim()} ${form.last_name.trim()}`,
        email: form.email.trim(),
        phone: `${form.country_code.trim() || "+91"}${form.phone.trim()}`,
      })

      if (orderData.fee_required && orderData.order_id) {
        if (orderData.amount_inr && orderData.amount_inr !== coachFee) {
          setCoachFee(orderData.amount_inr)
        }
        await openRazorpayCheckout({
          amountPaise: orderData.amount_paise,
          razorpayKeyId: orderData.key_id,
          currency: orderData.currency || "INR",
          name: "Rock Martial Arts",
          description: "Coach Registration Fee",
          customerName: `${form.first_name.trim()} ${form.last_name.trim()}`,
          customerEmail: form.email.trim(),
          customerContact: `${form.country_code.trim() || "+91"}${form.phone.trim()}`,
          orderId: orderData.order_id,
          onSuccess: async (rpResponse) => {
            await submitRegistration({
              razorpay_payment_id: rpResponse.razorpay_payment_id,
              razorpay_order_id: rpResponse.razorpay_order_id,
              razorpay_signature: rpResponse.razorpay_signature,
            })
          },
          onDismiss: () => {
            setSubmitting(false)
            setError("Payment was cancelled. Complete the payment to submit your registration.")
          },
          onPaymentFailure: (failMsg) => {
            setSubmitting(false)
            setError(failMsg || "Payment failed. Please try again.")
          },
        })
        return
      }
    } catch (err) {
      setSubmitting(false)
      setError(err instanceof Error ? err.message : "Failed to initiate payment")
      return
    }

    // Direct registration (no fee required or fee is 0)
    await submitRegistration()
  }

  const fieldClass =
    "bg-gray-950/60 border-gray-700 text-white placeholder:text-gray-500 focus-visible:ring-[#FFB70F]"

  if (done) {
    return (
      <div
        ref={successRef}
        className="rounded-xl border border-gray-800 bg-gray-900/50 p-8 md:p-10 text-center max-w-xl mx-auto space-y-4"
      >
        <CheckCircle2 className="w-14 h-14 text-[#FFB70F] mx-auto" />
        <h2 className="text-2xl font-bold text-white">Application submitted</h2>
        <p className="text-gray-300">{done.message}</p>
        <p className="text-sm text-gray-400">
          Reference ID: <span className="text-white font-mono text-xs">{done.coach_id}</span>
        </p>
        <p className="text-sm text-gray-400">
          You will be able to sign in after an administrator approves your profile.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button
            type="button"
            className="bg-[#FFB70F] hover:bg-[#e0a00d] text-black"
            onClick={() => setDone(null)}
          >
            Submit another
          </Button>
          <Button asChild variant="outline" className="border-gray-600 text-white hover:bg-gray-800">
            <Link href="/coach/login">Coach login</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8 max-w-3xl mx-auto">
      {error ? (
        <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-4 py-3">
          {error}
        </p>
      ) : null}

      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 md:p-8 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#FFB70F]/10 flex items-center justify-center">
            <UserPlus className="w-5 h-5 text-[#FFB70F]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Personal details</h2>
            <p className="text-sm text-gray-400">Basic identity and contact information</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-gray-300">First name *</Label>
            <Input
              className={fieldClass}
              placeholder="e.g. Rahul"
              required
              value={form.first_name}
              onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-gray-300">Last name *</Label>
            <Input
              className={fieldClass}
              placeholder="e.g. Sharma"
              required
              value={form.last_name}
              onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-gray-300">Gender *</Label>
            <Select
              value={form.gender || undefined}
              onValueChange={(v) => setForm((f) => ({ ...f, gender: v }))}
            >
              <SelectTrigger className={fieldClass}>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                {(genders.length
                  ? genders
                  : [
                      { value: "male", label: "Male" },
                      { value: "female", label: "Female" },
                      { value: "other", label: "Other" },
                    ]
                ).map((g) => (
                  <SelectItem key={optionValue(g)} value={optionValue(g)}>
                    {optionLabel(g)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-gray-300">Date of birth *</Label>
            <Input
              type="date"
              placeholder="YYYY-MM-DD"
              min="1900-01-01"
              max="9999-12-31"
              className={`${fieldClass} coach-register-dob`}
              required
              value={form.date_of_birth}
              onChange={(e) => {
                let v = e.target.value
                const m = /^(\d+)-(\d{2})-(\d{2})$/.exec(v)
                if (m && m[1].length > 4) {
                  v = `${m[1].slice(0, 4)}-${m[2]}-${m[3]}`
                }
                setForm((f) => ({ ...f, date_of_birth: v }))
              }}
            />
          </div>
          <div className="space-y-1" ref={emailFieldRef}>
            <Label className="text-gray-300">Email *</Label>
            <Input
              type="email"
              placeholder="e.g. coach@example.com"
              className={`${fieldClass}${fieldErrors.email ? " border-red-500" : ""}`}
              required
              value={form.email}
              onChange={(e) => {
                if (fieldErrors.email) {
                  setFieldErrors((prev) => ({ ...prev, email: undefined }))
                }
                setForm((f) => ({ ...f, email: e.target.value }))
              }}
            />
            {fieldErrors.email ? (
              <p className="text-xs text-red-400">{fieldErrors.email}</p>
            ) : null}
          </div>
          <div className="space-y-1">
            <Label className="text-gray-300">Phone *</Label>
            <div className="flex gap-2">
              <Select
                value={phoneCountry}
                onValueChange={(countryCode) => {
                  const country = COUNTRY_CALLING_CODES.find(
                    (item) => item.countryCode === countryCode
                  )
                  if (!country) return
                  setPhoneCountry(country.countryCode)
                  setForm((f) => ({
                    ...f,
                    country_code: `+${country.countryCallingCode}`,
                  }))
                }}
              >
                <SelectTrigger
                  aria-label="Country calling code"
                  className={`${fieldClass} w-28 shrink-0`}
                >
                  <SelectValue>{form.country_code}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {COUNTRY_CALLING_CODES.map((country) => (
                    <SelectItem
                      key={country.countryCode}
                      value={country.countryCode}
                      textValue={`${country.countryNameEn} +${country.countryCallingCode}`}
                    >
                      {country.flag} {country.countryNameEn} (+{country.countryCallingCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="tel"
                placeholder={form.country_code === "+91" ? "e.g. 9876543210" : "Mobile / phone number"}
                className={`${fieldClass} min-w-0 flex-1${fieldErrors.phone ? " border-red-500" : ""}`}
                required
                value={form.phone}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, "")
                  if (fieldErrors.phone) {
                    setFieldErrors((prev) => ({ ...prev, phone: undefined }))
                  }
                  setForm((f) => ({ ...f, phone: val }))
                }}
              />
            </div>
            {fieldErrors.phone ? (
              <p className="text-xs text-red-400 mt-1">{fieldErrors.phone}</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 md:p-8 space-y-5">
        <h2 className="text-lg font-semibold text-white">Address</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2 space-y-1">
            <Label className="text-gray-300">Address *</Label>
            <Input
              className={fieldClass}
              placeholder="House / Flat no., building, street address"
              required
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-gray-300">Area</Label>
            <Input
              className={fieldClass}
              placeholder="Locality, sector, or landmark"
              value={form.area}
              onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-gray-300">City *</Label>
            <Input
              className={fieldClass}
              placeholder="e.g. Hyderabad"
              required
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-gray-300">State *</Label>
            <Input
              className={fieldClass}
              placeholder="e.g. Telangana"
              required
              value={form.state}
              onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-gray-300">Pincode</Label>
            <Input
              className={fieldClass}
              placeholder="e.g. 500081"
              value={form.zip_code}
              onChange={(e) => setForm((f) => ({ ...f, zip_code: e.target.value }))}
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-gray-300">Country</Label>
            <Select
              value={form.country || undefined}
              onValueChange={(v) => setForm((f) => ({ ...f, country: v }))}
            >
              <SelectTrigger className={fieldClass}>
                <SelectValue placeholder="Country" />
              </SelectTrigger>
              <SelectContent>
                {(countries.length ? countries : [{ value: "India", label: "India" }]).map(
                  (c) => (
                    <SelectItem key={optionValue(c)} value={optionValue(c)}>
                      {optionLabel(c)}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 md:p-8 space-y-5">
        <h2 className="text-lg font-semibold text-white">Experience & specialization</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-gray-300">Experience *</Label>
            <Select
              value={form.professional_experience || undefined}
              onValueChange={(v) => {
                setFieldErrors((prev) =>
                  prev.experience ? { ...prev, experience: undefined } : prev
                )
                setForm((f) => ({ ...f, professional_experience: v }))
              }}
            >
              <SelectTrigger
                className={`${fieldClass}${fieldErrors.experience ? " border-red-500" : ""}`}
              >
                <SelectValue placeholder="Select experience" />
              </SelectTrigger>
              <SelectContent>
                {(experienceRanges.length
                  ? experienceRanges
                  : [
                      { value: "0-1 years", label: "0-1 years" },
                      { value: "1-3 years", label: "1-3 years" },
                      { value: "3-5 years", label: "3-5 years" },
                      { value: "5-10 years", label: "5-10 years" },
                      { value: "10+ years", label: "10+ years" },
                    ]
                ).map((x) => (
                  <SelectItem key={optionValue(x)} value={optionValue(x)}>
                    {optionLabel(x)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.experience ? (
              <p className="text-xs text-red-400">{fieldErrors.experience}</p>
            ) : null}
          </div>
          <div className="space-y-1">
            <Label className="text-gray-300">Designation</Label>
            <Select
              value={form.designation || undefined}
              onValueChange={(v) => setForm((f) => ({ ...f, designation: v }))}
            >
              <SelectTrigger className={fieldClass}>
                <SelectValue placeholder="Select designation" />
              </SelectTrigger>
              <SelectContent>
                {(designations.length
                  ? designations
                  : [{ value: "Coach", label: "Coach" }]
                ).map((d) => (
                  <SelectItem key={optionValue(d)} value={optionValue(d)}>
                    {optionLabel(d)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2 space-y-1">
            <Label className="text-gray-300">Education / qualification</Label>
            <Input
              className={fieldClass}
              placeholder="e.g. B.P.Ed, Sports Science Degree, Certified Martial Arts Trainer"
              value={form.education_qualification}
              onChange={(e) =>
                setForm((f) => ({ ...f, education_qualification: e.target.value }))
              }
            />
          </div>
          <div className="sm:col-span-2 space-y-2">
            <Label className="text-gray-300">Specializations *</Label>
            <div
              className={`grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-4 rounded-md ${
                fieldErrors.specializations ? "ring-1 ring-red-500 p-2" : ""
              }`}
            >
              {(specializations.length
                ? specializations
                : [
                    { value: "Taekwondo", label: "Taekwondo" },
                    { value: "Karate", label: "Karate" },
                    { value: "Self Defense", label: "Self Defense" },
                  ]
              ).map((s) => {
                const v = optionValue(s)
                return (
                  <label
                    key={v}
                    className="flex min-w-0 items-start gap-2 text-sm text-gray-200"
                  >
                    <Checkbox
                      checked={form.specializations.includes(v)}
                      onCheckedChange={() => toggleSpec(v)}
                    />
                    <span className="min-w-0">{optionLabel(s)}</span>
                  </label>
                )
              })}
            </div>
            {fieldErrors.specializations ? (
              <p className="text-xs text-red-400">{fieldErrors.specializations}</p>
            ) : null}
          </div>
          <div className="sm:col-span-2 space-y-2">
            <Label className="text-gray-300">Service locations (branches) *</Label>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-4 max-h-48 overflow-y-auto pr-1">
              {branches.length === 0 ? (
                <p className="text-sm text-gray-500">No branches available.</p>
              ) : (
                branches.map((b) => (
                  <label
                    key={b.id}
                    className="flex min-w-0 items-start gap-2 text-sm text-gray-200"
                  >
                    <Checkbox
                      checked={form.service_location_ids.includes(b.id)}
                      onCheckedChange={() => toggleLocation(b.id)}
                    />
                    <span className="min-w-0">{b.name}</span>
                  </label>
                ))
              )}
            </div>
          </div>
          <div className="sm:col-span-2 space-y-1">
            <Label className="text-gray-300">About you</Label>
            <Textarea
              className={fieldClass}
              placeholder="Brief overview of coaching experience, achievements, and training philosophy..."
              rows={3}
              value={form.about_short}
              onChange={(e) => setForm((f) => ({ ...f, about_short: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2 space-y-2">
            <Label className="text-gray-300">Profile photo</Label>
            <div className="flex items-center gap-4">
              {form.profile_image_url ? (
                <div className="relative">
                  <img
                    src={resolvePublicAssetUrl(form.profile_image_url)}
                    alt="Preview"
                    className="h-20 w-20 rounded-full object-cover border border-gray-700"
                  />
                  <button
                    type="button"
                    className="absolute -top-1 -right-1 rounded-full bg-black/80 p-1 text-white"
                    onClick={() => setForm((f) => ({ ...f, profile_image_url: "" }))}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="h-20 w-20 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-500 text-xs">
                  No photo
                </div>
              )}
              <label className="inline-flex">
                <input type="file" accept="image/*" className="hidden" onChange={onPhoto} />
                <Button
                  type="button"
                  variant="outline"
                  className="border-gray-600 text-white"
                  disabled={uploading}
                  onClick={(e) => {
                    const input = (e.currentTarget.parentElement as HTMLElement)?.querySelector(
                      "input"
                    )
                    input?.click()
                  }}
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  Upload photo
                </Button>
              </label>
            </div>
          </div>
        </div>
      </div>

      {coachFee > 0 && (
        <div className="rounded-lg border border-[#FFB70F]/40 bg-[#FFB70F]/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white text-sm">Coach Registration Fee:</span>
              <span className="text-base font-bold text-[#FFB70F]">₹{coachFee.toLocaleString("en-IN")}</span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              One-time non-refundable fee required to process your application via Razorpay.
            </p>
          </div>
        </div>
      )}

      <Button
        type="submit"
        className="w-full bg-[#FFB70F] hover:bg-[#e0a00d] text-black font-semibold"
        disabled={submitting || uploading}
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {coachFee > 0 ? "Processing payment..." : "Submitting…"}
          </>
        ) : coachFee > 0 ? (
          `Pay ₹${coachFee.toLocaleString("en-IN")} & Submit Application`
        ) : (
          "Submit coach registration"
        )}
      </Button>
      <p className="text-xs text-center text-gray-500">
        Already registered?{" "}
        <Link href="/coach/login" className="text-[#FFB70F] hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  )
}
