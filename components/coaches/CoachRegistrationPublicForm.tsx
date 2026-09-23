"use client"

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react"
import Link from "next/link"
import { CheckCircle2, Loader2, Upload, UserPlus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
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

type BranchOpt = { id: string; name: string }

type FormState = {
  first_name: string
  last_name: string
  gender: string
  date_of_birth: string
  email: string
  country_code: string
  phone: string
  password: string
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
  password: "",
  address: "",
  area: "",
  city: "",
  state: "",
  zip_code: "",
  country: "India",
  professional_experience: "",
  education_qualification: "",
  designation: "Coach",
  specializations: [],
  service_location_ids: [],
  profile_image_url: "",
  about_short: "",
}

export default function CoachRegistrationPublicForm() {
  const [form, setForm] = useState<FormState>(INITIAL)
  const [branches, setBranches] = useState<BranchOpt[]>([])
  const [specializations, setSpecializations] = useState<CoachRegisterOption[]>([])
  const [experienceRanges, setExperienceRanges] = useState<CoachRegisterOption[]>([])
  const [genders, setGenders] = useState<CoachRegisterOption[]>([])
  const [designations, setDesignations] = useState<CoachRegisterOption[]>([])
  const [countries, setCountries] = useState<CoachRegisterOption[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<{ coach_id: string; message: string } | null>(null)

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
  }, [])

  const toggleSpec = (value: string) => {
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

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (form.specializations.length === 0) {
      setError("Select at least one specialization")
      return
    }
    if (form.service_location_ids.length === 0) {
      setError("Select at least one service location (branch)")
      return
    }
    if (!form.professional_experience.trim()) {
      setError("Experience is required")
      return
    }
    setSubmitting(true)
    try {
      const result = await coachRegistrationAPI.register({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        gender: form.gender,
        date_of_birth: form.date_of_birth,
        email: form.email.trim(),
        country_code: form.country_code.trim() || "+91",
        phone: form.phone.trim(),
        password: form.password,
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
      })
      setDone({ coach_id: result.coach_id, message: result.message })
      setForm(INITIAL)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed")
    } finally {
      setSubmitting(false)
    }
  }

  const fieldClass =
    "bg-gray-950/60 border-gray-700 text-white placeholder:text-gray-500 focus-visible:ring-[#FFB70F]"

  if (done) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-8 md:p-10 text-center max-w-xl mx-auto space-y-4">
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
              required
              value={form.first_name}
              onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-gray-300">Last name *</Label>
            <Input
              className={fieldClass}
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
              className={fieldClass}
              required
              value={form.date_of_birth}
              onChange={(e) => setForm((f) => ({ ...f, date_of_birth: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-gray-300">Email *</Label>
            <Input
              type="email"
              className={fieldClass}
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-gray-300">Phone *</Label>
            <div className="flex gap-2">
              <Input
                className={`${fieldClass} w-24`}
                value={form.country_code}
                onChange={(e) => setForm((f) => ({ ...f, country_code: e.target.value }))}
              />
              <Input
                className={fieldClass}
                required
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
          </div>
          <div className="sm:col-span-2 space-y-1">
            <Label className="text-gray-300">Password *</Label>
            <PasswordInput
              className={fieldClass}
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            />
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
              required
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-gray-300">Area</Label>
            <Input
              className={fieldClass}
              value={form.area}
              onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-gray-300">City *</Label>
            <Input
              className={fieldClass}
              required
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-gray-300">State *</Label>
            <Input
              className={fieldClass}
              required
              value={form.state}
              onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-gray-300">Pincode</Label>
            <Input
              className={fieldClass}
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
              onValueChange={(v) => setForm((f) => ({ ...f, professional_experience: v }))}
            >
              <SelectTrigger className={fieldClass}>
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
          </div>
          <div className="space-y-1">
            <Label className="text-gray-300">Designation</Label>
            <Select
              value={form.designation || undefined}
              onValueChange={(v) => setForm((f) => ({ ...f, designation: v }))}
            >
              <SelectTrigger className={fieldClass}>
                <SelectValue placeholder="Designation" />
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
              value={form.education_qualification}
              onChange={(e) =>
                setForm((f) => ({ ...f, education_qualification: e.target.value }))
              }
            />
          </div>
          <div className="sm:col-span-2 space-y-2">
            <Label className="text-gray-300">Specializations *</Label>
            <div className="flex flex-wrap gap-3">
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
                  <label key={v} className="flex items-center gap-2 text-sm text-gray-200">
                    <Checkbox
                      checked={form.specializations.includes(v)}
                      onCheckedChange={() => toggleSpec(v)}
                    />
                    {optionLabel(s)}
                  </label>
                )
              })}
            </div>
          </div>
          <div className="sm:col-span-2 space-y-2">
            <Label className="text-gray-300">Service locations (branches) *</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {branches.length === 0 ? (
                <p className="text-sm text-gray-500">No branches available.</p>
              ) : (
                branches.map((b) => (
                  <label key={b.id} className="flex items-center gap-2 text-sm text-gray-200">
                    <Checkbox
                      checked={form.service_location_ids.includes(b.id)}
                      onCheckedChange={() => toggleLocation(b.id)}
                    />
                    {b.name}
                  </label>
                ))
              )}
            </div>
          </div>
          <div className="sm:col-span-2 space-y-1">
            <Label className="text-gray-300">About you</Label>
            <Textarea
              className={fieldClass}
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

      <Button
        type="submit"
        className="w-full bg-[#FFB70F] hover:bg-[#e0a00d] text-black"
        disabled={submitting || uploading}
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Submitting…
          </>
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
