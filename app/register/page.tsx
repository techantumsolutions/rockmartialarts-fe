"use client"

import type React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRegistration, emptyFamilyStudent } from "@/contexts/RegistrationContext"
import { useCMS } from "@/contexts/CMSContext"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { submitLead } from "@/lib/submitLead"
import { RegPhoneOtpSection } from "@/components/register/RegPhoneOtpSection"
import { RegistrationStepIndicator } from "@/components/register/RegistrationStepIndicator"
import {
  extractIndianMobileDigits,
  isValidIndianMobileNational,
  toIndianE164FromNational,
} from "@/lib/indianMobile"

export default function RegisterPage() {
  const router = useRouter()
  const { registrationData, updateRegistrationData, registrationStorageReady } = useRegistration()
  const { cms } = useCMS()
  
  const [formData, setFormData] = useState({
    firstName: registrationData.firstName || "",
    lastName: registrationData.lastName || "",
    email: registrationData.email || "",
    mobile: registrationData.mobile || "",
    gender: registrationData.gender || "",
    dob: registrationData.dob || "",
    password: registrationData.password || "",
    accountType: (registrationData.accountType || "single") as "single" | "family",
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [checkingEmail, setCheckingEmail] = useState(false)
  const [emailExists, setEmailExists] = useState(false)
  const [checkingPhone, setCheckingPhone] = useState(false)
  const [phoneExists, setPhoneExists] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [dobFocused, setDobFocused] = useState(false)
  const emailCheckSeq = useRef(0)
  const phoneCheckSeq = useRef(0)
  const registrationHydrated = useRef(false)

  const normalizedEmail = useMemo(() => formData.email.trim().toLowerCase(), [formData.email])
  /** National 10 digits only (input is capped at 10; paste may normalize via extract). */
  const normalizedMobile = formData.mobile

  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const validateMobile = (digits10: string): boolean => isValidIndianMobileNational(digits10)

  // One-time hydrate from persisted registration (localStorage loads after first paint).
  useEffect(() => {
    if (!registrationStorageReady || registrationHydrated.current) return
    registrationHydrated.current = true
    const d = extractIndianMobileDigits(registrationData.mobile)
    setFormData({
      firstName: registrationData.firstName || "",
      lastName: registrationData.lastName || "",
      email: registrationData.email || "",
      mobile: d.length === 10 ? d : "",
      gender: registrationData.gender || "",
      dob: registrationData.dob || "",
      password: registrationData.password || "",
      accountType: registrationData.accountType || "single",
    })
  }, [registrationStorageReady])

  const apiPhone =
    normalizedMobile.length === 10 && isValidIndianMobileNational(normalizedMobile)
      ? toIndianE164FromNational(normalizedMobile)
      : ""

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required"
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required"
    }
    if (!formData.email.trim()) {
      newErrors.email = "Email is required"
    } else if (!validateEmail(formData.email)) {
      newErrors.email = "Please enter a valid email address"
    }
    if (!formData.mobile.trim()) {
      newErrors.mobile = "Mobile number is required"
    } else if (!validateMobile(formData.mobile)) {
      newErrors.mobile = "Please enter a valid 10-digit mobile number"
    }
    if (!formData.password) {
      newErrors.password = "Password is required"
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters"
    }
    if (!formData.gender) {
      newErrors.gender = "Please select a gender"
    }
    if (!formData.dob) {
      newErrors.dob = "Date of birth is required"
    }
    const mobileNorm = formData.mobile
    const ctxNorm = extractIndianMobileDigits(registrationData.mobile)
    const tokenOk =
      !!registrationData.phoneVerificationToken?.trim() &&
      mobileNorm.length === 10 &&
      mobileNorm === ctxNorm
    if (!tokenOk) {
      newErrors.phoneOtp = "Verify your mobile number with the OTP sent to your phone."
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Immediate (debounced) email existence validation
  useEffect(() => {
    if (!normalizedEmail) {
      setEmailExists(false)
      setCheckingEmail(false)
      return
    }
    if (!validateEmail(normalizedEmail)) {
      setEmailExists(false)
      setCheckingEmail(false)
      return
    }

    const seq = ++emailCheckSeq.current
    setCheckingEmail(true)

    const t = window.setTimeout(async () => {
      try {
        const checkRes = await fetch("/api/students/check-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: normalizedEmail }),
        })
        const checkData = await checkRes.json().catch(() => ({}))
        if (emailCheckSeq.current !== seq) return
        const exists = !!checkData.exists
        setEmailExists(exists)
        setErrors((prev) => ({
          ...prev,
          email: exists ? "Email already exists. Please login or use a different email." : (prev.email?.includes("Email already exists") ? "" : prev.email),
        }))
      } catch {
        if (emailCheckSeq.current !== seq) return
        setEmailExists(false)
      } finally {
        if (emailCheckSeq.current === seq) setCheckingEmail(false)
      }
    }, 350)

    return () => window.clearTimeout(t)
  }, [normalizedEmail])

  // Immediate (debounced) phone existence validation
  useEffect(() => {
    if (!normalizedMobile || normalizedMobile.length !== 10) {
      setPhoneExists(false)
      setCheckingPhone(false)
      return
    }
    if (!/^[6-9]/.test(normalizedMobile)) {
      setPhoneExists(false)
      setCheckingPhone(false)
      return
    }

    const seq = ++phoneCheckSeq.current
    setCheckingPhone(true)

    const t = window.setTimeout(async () => {
      try {
        const checkRes = await fetch("/api/students/check-phone", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: normalizedMobile }),
        })
        const checkData = await checkRes.json().catch(() => ({}))
        if (phoneCheckSeq.current !== seq) return
        const exists = !!checkData.exists
        setPhoneExists(exists)
        setErrors((prev) => ({
          ...prev,
          mobile: exists ? "Phone number already registered. Please login or use a different number." : (prev.mobile?.includes("already registered") ? "" : prev.mobile),
        }))
      } catch {
        if (phoneCheckSeq.current !== seq) return
        setPhoneExists(false)
      } finally {
        if (phoneCheckSeq.current === seq) setCheckingPhone(false)
      }
    }, 350)

    return () => window.clearTimeout(t)
  }, [normalizedMobile])

  const handleNextStep = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) {
      console.error("[Register] Validation failed — check field errors above", formData)
      return
    }
    if (submitting) return

    // Always re-validate email and phone on submit so "already exists" shows before proceeding (not after payment)
    setSubmitting(true)
    setErrors((prev) => ({ ...prev, email: "", mobile: "" }))

    try {
      const [emailCheckRes, phoneCheckRes] = await Promise.all([
        fetch("/api/students/check-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: normalizedEmail }),
        }),
        fetch("/api/students/check-phone", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: normalizedMobile }),
        }),
      ])

      const emailData = await emailCheckRes.json().catch(() => ({}))
      const phoneData = await phoneCheckRes.json().catch(() => ({}))
      const emailAlreadyExists = !!emailData.exists
      const phoneAlreadyExists = !!phoneData.exists

      setEmailExists(emailAlreadyExists)
      setPhoneExists(phoneAlreadyExists)

      if (emailAlreadyExists) {
        setErrors((prev) => ({ ...prev, email: "Email already exists. Please login or use a different email." }))
        return
      }
      if (phoneAlreadyExists) {
        setErrors((prev) => ({ ...prev, mobile: "Phone number already registered. Please login or use a different number." }))
        return
      }

      const leadName = `${formData.firstName} ${formData.lastName}`.trim()
      await submitLead({
        name: leadName || "Prospect",
        email: normalizedEmail,
        phone: toIndianE164FromNational(normalizedMobile),
        course: "",
        source: "registration_step1",
      })

      updateRegistrationData({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: normalizedEmail,
        mobile: toIndianE164FromNational(normalizedMobile),
        gender: formData.gender,
        dob: formData.dob,
        password: formData.password,
        accountType: formData.accountType,
        familyStudents:
          formData.accountType === "family"
            ? (registrationData.familyStudents?.length
                ? registrationData.familyStudents
                : [
                    emptyFamilyStudent({
                      firstName: formData.firstName,
                      lastName: formData.lastName,
                      dob: formData.dob,
                      gender: formData.gender,
                      relationship: "self",
                    }),
                  ])
            : [],
      })
      router.push(formData.accountType === "family" ? "/register/family-students" : "/register/select-branch")
    } catch (err) {
      console.error("[Register] Submit error:", err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    if (field === "accountType") {
      setFormData((prev) => ({ ...prev, accountType: value as "single" | "family" }))
      return
    }
    if (field === "mobile") {
      const v = extractIndianMobileDigits(value).slice(0, 10)
      if (registrationData.phoneVerificationToken) {
        const storedDigits = extractIndianMobileDigits(registrationData.mobile)
        if (v !== storedDigits) {
          updateRegistrationData({ phoneVerificationToken: "" })
        }
      }
      value = v
    }
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
    if (field === "mobile" && errors.phoneOtp) {
      setErrors((prev) => ({ ...prev, phoneOtp: "" }))
    }
  }

  const handlePhoneOtpVerified = (token: string) => {
    updateRegistrationData({
      phoneVerificationToken: token,
      mobile: toIndianE164FromNational(normalizedMobile),
    })
    setErrors((prev) => ({ ...prev, phoneOtp: "" }))
  }

  const readyForPhoneOtp =
    normalizedMobile.length === 10 &&
    /^[6-9]/.test(normalizedMobile) &&
    !phoneExists &&
    !checkingPhone &&
    !errors.mobile

  const storedMobileDigits = extractIndianMobileDigits(registrationData.mobile)
  const phoneOtpVerified =
    !!registrationData.phoneVerificationToken?.trim() &&
    normalizedMobile.length === 10 &&
    normalizedMobile === storedMobileDigits

  const registrationMediaUrl = cms?.homepage?.registration_media_url
  const registrationMediaType = cms?.homepage?.registration_media_type || "auto"

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Illustration */}
      <div className="hidden lg:flex lg:w-1/2 bg-gray-200 items-center justify-center relative overflow-hidden">
        <div className="w-[550px] h-[550px] bg-cover bg-center bg-no-repeat overflow-hidden rounded-xl">
          {registrationMediaUrl ? (
            registrationMediaType === "video" || /\.(mp4|webm)$/i.test(registrationMediaUrl) ? (
              <video
                src={registrationMediaUrl}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                src={registrationMediaUrl}
                alt="Registration"
                className="w-full h-full object-cover"
              />
            )
          ) : (
            <div
              className="w-full h-full bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: "url('/images/registration-left.png')" }}
            />
          )}
        </div>
      </div>

      {/* Right Side - Registration Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md space-y-6">
          <div className="flex justify-start">
            <Button
              type="button"
              variant="ghost"
              className="gap-2 pl-0 text-gray-700 hover:text-gray-900 -ml-2"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-black">Registration</h1>
            <p className="text-gray-500 text-sm">Enter your details to create your account and continue registration.</p>
          </div>

          {/* Registration Form */}
          <form onSubmit={handleNextStep} className="space-y-3">
            {(checkingEmail || checkingPhone || submitting) && (
              <p className="text-sm text-gray-500">
                {submitting ? "Verifying email & phone..." : checkingEmail && checkingPhone ? "Checking email & phone..." : checkingEmail ? "Checking email..." : "Checking phone..."}
              </p>
            )}
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input
                  type="text"
                  placeholder="Enter first name"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange("firstName", e.target.value)}
                  className={`pl-5 py-4 text-[14px] bg-[#F9F8FF] border-0 rounded-xl h-14 placeholder:text-[#000] ${errors.firstName ? '!border !border-red-500' : ''}`}
                />
                {errors.firstName && <p className="text-red-500 text-xs mt-1 ml-1">{errors.firstName}</p>}
              </div>
              <div>
                <Input
                  type="text"
                  placeholder="Enter last name"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange("lastName", e.target.value)}
                  className={`pl-5 py-4 text-[14px] bg-[#F9F8FF] border-0 rounded-xl h-14 placeholder:text-[#000] ${errors.lastName ? '!border !border-red-500' : ''}`}
                />
                {errors.lastName && <p className="text-red-500 text-xs mt-1 ml-1">{errors.lastName}</p>}
              </div>
            </div>

            {/* Email and Mobile Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Input
                  type="email"
                  placeholder="Enter your email address"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className={`pl-5 py-4 text-[14px] bg-[#F9F8FF] border-0 rounded-xl h-14 placeholder:text-[#000] ${errors.email ? '!border !border-red-500' : ''}`}
                />
                {errors.email && <p className="text-red-500 text-xs mt-1 ml-1">{errors.email}</p>}
                {!errors.email && checkingEmail && (
                  <p className="text-gray-500 text-xs mt-1 ml-1">Checking email...</p>
                )}
              </div>
              <div>
                <div
                  className={`flex items-stretch rounded-xl h-14 overflow-hidden bg-[#F9F8FF] ${errors.mobile ? "ring-2 ring-red-500 ring-inset" : ""}`}
                >
                  <span
                    className="flex items-center pl-5 pr-2 text-[14px] text-gray-600 shrink-0 select-none border-0"
                    aria-hidden
                  >
                    +91
                  </span>
                  <Input
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    maxLength={10}
                    placeholder="Enter 10-digit mobile number"
                    value={formData.mobile}
                    onChange={(e) => handleInputChange("mobile", e.target.value)}
                    className="flex-1 min-w-0 border-0 rounded-none h-14 bg-transparent shadow-none focus-visible:ring-0 pr-5 py-4 text-[14px] placeholder:text-[#000]/70"
                  />
                </div>
                {errors.mobile && <p className="text-red-500 text-xs mt-1 ml-1">{errors.mobile}</p>}
                {!errors.mobile && checkingPhone && (
                  <p className="text-gray-500 text-xs mt-1 ml-1">Checking phone...</p>
                )}
              </div>
            </div>

            <RegPhoneOtpSection
              apiPhone={apiPhone}
              normalizedMobile={normalizedMobile}
              readyForOtp={readyForPhoneOtp}
              isVerified={phoneOtpVerified}
              onVerified={handlePhoneOtpVerified}
            />
            {errors.phoneOtp && (
              <p className="text-red-500 text-xs ml-1">{errors.phoneOtp}</p>
            )}

            {/* Password Field */}
            <div>
              <PasswordInput
                placeholder="Enter password"
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                className={`pl-5 py-4 text-[14px] bg-[#F9F8FF] border-0 rounded-xl h-14 placeholder:text-[#000] ${errors.password ? '!border !border-red-500' : ''}`}
              />
              {errors.password && <p className="text-red-500 text-xs mt-1 ml-1">{errors.password}</p>}
            </div>

            <div className="space-y-2 rounded-xl bg-[#F9F8FF] p-4">
              <p className="text-sm font-semibold text-gray-800">Who is this registration for?</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleInputChange("accountType", "single")}
                  className={`text-left rounded-lg border px-3 py-3 text-sm ${
                    formData.accountType === "single"
                      ? "border-yellow-400 bg-yellow-50 font-semibold text-gray-900"
                      : "border-transparent bg-white text-gray-700"
                  }`}
                >
                  Just me
                  <span className="block text-xs font-normal text-gray-500 mt-1">Single account — one student, one login</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleInputChange("accountType", "family")}
                  className={`text-left rounded-lg border px-3 py-3 text-sm ${
                    formData.accountType === "family"
                      ? "border-yellow-400 bg-yellow-50 font-semibold text-gray-900"
                      : "border-transparent bg-white text-gray-700"
                  }`}
                >
                  Family account
                  <span className="block text-xs font-normal text-gray-500 mt-1">Multiple students, one login</span>
                </button>
              </div>
            </div>

            {/* Gender and DOB Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Select value={formData.gender} onValueChange={(value) => handleInputChange("gender", value)} >
                  <SelectTrigger className={`!w-full !h-14 !pl-5 !pr-4 !py-4 !text-base !bg-[#F9F8FF] !border-0 !rounded-xl focus:outline-none focus:ring-2 !min-h-14 ${errors.gender ? '!border !border-red-500' : ''}`}>
                    <SelectValue placeholder="Select Gender" className="text-gray-500 placeholder:text-[#000]" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border border-gray-200 bg-white shadow-lg max-h-60">
                    <SelectItem value="male" className="!py-3 !pl-3 pr-8 text-base hover:bg-gray-50 rounded-lg cursor-pointer">Male</SelectItem>
                    <SelectItem value="female" className="!py-3 !pl-3 pr-8 text-base hover:bg-gray-50 rounded-lg cursor-pointer">Female</SelectItem>
                    <SelectItem value="other" className="!py-3 !pl-3 pr-8 text-base hover:bg-gray-50 rounded-lg cursor-pointer">Other</SelectItem>
                  </SelectContent>
                </Select>
                {errors.gender && <p className="text-red-500 text-xs mt-1 ml-1">{errors.gender}</p>}
              </div>

              <div className="relative">
                <label htmlFor="register-dob" className="sr-only">
                  Date of birth
                </label>
                <Input
                  id="register-dob"
                  type="date"
                  placeholder="Date of birth"
                  value={formData.dob}
                  onChange={(e) => handleInputChange("dob", e.target.value)}
                  onFocus={() => setDobFocused(true)}
                  onBlur={() => setDobFocused(false)}
                  className={`pl-5 py-4 text-[14px] bg-[#F9F8FF] border-0 rounded-xl h-14 placeholder:text-[#000] ${!formData.dob && !dobFocused ? "text-transparent" : ""} ${errors.dob ? '!border !border-red-500' : ''}`}
                />
                {!formData.dob && !dobFocused && (
                  <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-[14px] text-[#000]/80">
                    Date of birth
                  </span>
                )}
                {errors.dob && <p className="text-red-500 text-xs mt-1 ml-1">{errors.dob}</p>}
              </div>
            </div>

            {/* Next Step Button */}
            <Button
              type="submit"
              disabled={submitting || emailExists || phoneExists || !phoneOtpVerified}
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-[#ffffff] font-bold py-4 px-6 rounded-xl text-[12px] h-14 transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl mt-8 disabled:opacity-70"
            >
              {submitting ? "Verifying email & phone..." : "NEXT STEP"}
            </Button>
          </form>

          {/* Login Link */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-yellow-500 hover:text-yellow-600">
                Login
              </Link>
            </p>
          </div>

          {/* Step Indicator — updates when Single vs Family is selected */}
          <RegistrationStepIndicator
            accountType={formData.accountType === "family" ? "family" : "single"}
            currentStep={1}
          />

        </div>
      </div>
    </div>
  )
}
