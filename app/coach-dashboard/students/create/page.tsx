"use client"

import { getBackendApiUrl } from "@/lib/config"
import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  CalendarIcon,
  Building2Icon,
  BookOpenIcon,
  ClockIcon,
  UserIcon,
  MailIcon,
  PhoneIcon,
  LockIcon,
  CheckCircle2,
} from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import CoachDashboardHeader from "@/components/coach-dashboard-header"
import { checkCoachAuth } from "@/lib/coachAuth"
import { fetchCoachAssignments } from "@/lib/coachStudentFilter"
import PaymentSelectionSection from "@/components/registration/PaymentSelectionSection"
import { CreateStudentPaymentActions } from "@/components/registration/CreateStudentPaymentActions"
import {
  fetchRegistrationDurations,
  fetchRegistrationPricing,
  createRegistrationOrder,
  submitRegistrationPayment,
  checkStudentAvailability,
  filterEnrollableCourses,
  RegistrationBatch,
  RegistrationPricing,
} from "@/lib/studentRegistrationPayment"
import { openRazorpayCheckout } from "@/lib/razorpay"
import { AdminStickyFormActions } from "@/components/dashboard/AdminStickyFormActions"

interface Course {
  id: string
  title: string
  code: string
  description?: string
  difficulty_level?: string
  category_id?: string
  category_name?: string
  duration?: string
  pricing?: {
    amount: number
    currency: string
  }
  batches?: any[]
}

interface FormErrors {
  [key: string]: string
}

interface FormData {
  firstName: string
  lastName: string
  email: string
  contactNumber: string
  countryCode: string
  gender: string
  dob: string
  password: string
  biometricId: string
  address: string
  area: string
  city: string
  state: string
  zipCode: string
  country: string
  location: string
  branch: string
  category: string
  course: string
  duration: string
  assignedCoach: string
  experienceLevel: string
  healthNotes: string
  beltRank: string
  slot: string
  joiningDate: string
  emergencyContactName: string
  emergencyContactPhone: string
  emergencyContactRelation: string
  paymentPlan: string
}

export default function CreateStudent() {
  const router = useRouter()
  const { toast } = useToast()

  // Coach authentication state
  const [coachData, setCoachData] = useState<any>(null)
  const [coachToken, setCoachToken] = useState<string | null>(null)
  const [isAuthLoading, setIsAuthLoading] = useState(true)

  // Loading states
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [courses, setCourses] = useState<Course[]>([])
  const [availableBatches, setAvailableBatches] = useState<any[]>([])
  const [coachBranchName, setCoachBranchName] = useState("")
  const [isPartnerCoach, setIsPartnerCoach] = useState(false)
  const [coachAssignedCourses, setCoachAssignedCourses] = useState<any[]>([])

  // Payment states
  const [paymentMethod, setPaymentMethod] = useState<"razorpay" | "physical_cash">("physical_cash")
  const [cashNotes, setCashNotes] = useState("")
  const [cashAmount, setCashAmount] = useState("")
  const [pricing, setPricing] = useState<RegistrationPricing | null>(null)
  const [isLoadingPricing, setIsLoadingPricing] = useState(false)

  // Durations (loaded from academy course + batch tenure setup)
  const [durations, setDurations] = useState<{ id: string; name: string }[]>([])
  const [isLoadingDurations, setIsLoadingDurations] = useState(false)

  // Form state
  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    contactNumber: "",
    countryCode: "+91",
    gender: "",
    dob: "",
    password: "",
    biometricId: "",
    address: "",
    area: "",
    city: "",
    state: "",
    zipCode: "",
    country: "India",
    location: "",
    branch: "",
    category: "",
    course: "",
    duration: "1-month",
    assignedCoach: "",
    experienceLevel: "",
    healthNotes: "",
    beltRank: "",
    slot: "",
    joiningDate: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContactRelation: "",
    paymentPlan: "full",
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  useEffect(() => {
    if (!showSuccessPopup) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [showSuccessPopup])


  // Coach authentication check
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authResult = checkCoachAuth()
        if (authResult.isAuthenticated && authResult.coach) {
          setCoachData(authResult.coach)
          setCoachToken(authResult.token)
          if (
            authResult.coach?.partner_org_id ||
            (typeof window !== "undefined" && Boolean(localStorage.getItem("partner_slug")?.trim()))
          ) {
            setIsPartnerCoach(true)
          }
        } else {
          router.push("/coach/login")
        }
      } catch (error) {
        console.error("Coach auth error:", error)
        router.push("/coach/login")
      } finally {
        setIsAuthLoading(false)
      }
    }
    checkAuth()
  }, [router])

  // Load coach assignments & academy
  useEffect(() => {
    if (isAuthLoading) return

    const loadCoachData = async () => {
      setIsLoading(true)
      try {
        const token = coachToken || localStorage.getItem("access_token") || localStorage.getItem("token")
        const coach = coachData || JSON.parse(localStorage.getItem("coach") || "null")

        if (token && coach) {
          const assignments = await fetchCoachAssignments(token, coach)
          const assignedList = assignments.courses || []
          setCoachAssignedCourses(assignedList)

          // Prepopulate coach's academy
          const bId = coach.branch_id || assignments.branch_id
          let enrollableIds: Set<string> | null = null
          if (bId) {
            setFormData((prev) => ({
              ...prev,
              branch: bId,
              assignedCoach: coach.id,
            }))
            // Fetch academy name + enrollable courses (batches + fees)
            try {
              const [bRes, cRes] = await Promise.all([
                fetch(getBackendApiUrl(`branches/public/${encodeURIComponent(bId)}`)),
                fetch(getBackendApiUrl(`courses/public/by-branch/${encodeURIComponent(bId)}`)),
              ])
              if (bRes.ok) {
                const bData = await bRes.json()
                const bObj = bData.branch || bData
                setCoachBranchName(bObj.name || "Assigned Academy")
                if (
                  coach?.partner_org_id ||
                  bObj?.partner_org_id ||
                  bObj?.is_collaboration_partner ||
                  bObj?.allows_collaboration ||
                  (typeof window !== "undefined" && Boolean(localStorage.getItem("partner_slug")?.trim()))
                ) {
                  setIsPartnerCoach(true)
                }
                setFormData((prev) => ({
                  ...prev,
                  location: bObj.location_id || bObj.location || "Academy Location",
                }))
              }
              if (cRes.ok) {
                const cData = await cRes.json()
                enrollableIds = new Set(
                  filterEnrollableCourses(Array.isArray(cData.courses) ? cData.courses : []).map(
                    (c: any) => String(c.id)
                  )
                )
              }
            } catch (err) {
              console.error("Error fetching academy details:", err)
              setCoachBranchName("Assigned Academy")
            }
          }

          const mappedCourses: Course[] = assignedList
            .map((c: any) => ({
              id: c.course_id || c.id,
              title: c.name || "Assigned Course",
              code: c.course_id || "",
              description: "",
              difficulty_level: "All Levels",
              category_id: c.category_id || "",
              pricing: { amount: 0, currency: "INR" },
              batches: c.batches || [],
            }))
            .filter((c) => Array.isArray(c.batches) && c.batches.length > 0)
            .filter((c) => (enrollableIds ? enrollableIds.has(String(c.id)) : true))
          setCourses(mappedCourses)
        }
      } catch (error) {
        console.error("Error loading coach assignments:", error)
        toast({
          title: "Warning",
          description: "Could not load your assigned courses.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadCoachData()
  }, [isAuthLoading, coachData, coachToken, toast])

  // When course changes, update available batches
  useEffect(() => {
    if (!formData.course) {
      setAvailableBatches([])
      setPricing(null)
      return
    }

    const matchedCourse = coachAssignedCourses.find(
      (c: any) => (c.course_id || c.id) === formData.course
    )
    const batches = matchedCourse?.batches || []
    setAvailableBatches(batches)

    // Pre-select first batch if current slot is empty or not among this course's batches
    if (batches.length > 0) {
      const currentValid = batches.some((b: any) => (b.batch_id || b.id) === formData.slot)
      if (!currentValid) {
        setFormData((prev) => ({ ...prev, slot: batches[0].batch_id || batches[0].id }))
        setErrors((prev) => (prev.slot ? { ...prev, slot: "" } : prev))
      }
    }

    if (matchedCourse?.category_id) {
      setFormData((prev) => ({ ...prev, category: matchedCourse.category_id }))
    }
  }, [formData.course, formData.slot, coachAssignedCourses])

  // Durations follow the selected academy course + batch
  useEffect(() => {
    const branchId = formData.branch || coachData?.branch_id
    if (!formData.course || !branchId) {
      setDurations([])
      return
    }

    let isMounted = true
    const loadDurations = async () => {
      setIsLoadingDurations(true)
      try {
        const list = await fetchRegistrationDurations(
          formData.course,
          branchId,
          formData.slot || undefined
        )
        if (!isMounted) return
        const mapped = list.map((d) => ({
          id: d.id,
          name: d.name || d.code || "Duration",
        }))
        setDurations(mapped)
        setFormData((prev) => {
          const stillValid = mapped.some((m) => m.id === prev.duration)
          if (stillValid) return prev
          return { ...prev, duration: mapped[0]?.id || "" }
        })
      } catch (err) {
        console.error("Error loading durations in coach create-student:", err)
        if (isMounted) setDurations([])
      } finally {
        if (isMounted) setIsLoadingDurations(false)
      }
    }

    void loadDurations()
    return () => {
      isMounted = false
    }
  }, [formData.course, formData.branch, formData.slot, coachData?.branch_id])

  // Load pricing dynamically based on course, academy, duration and batch
  useEffect(() => {
    const branchId = formData.branch || coachData?.branch_id
    if (!branchId || !formData.course || !formData.duration) {
      setPricing(null)
      return
    }

    let isMounted = true
    const loadPricing = async () => {
      setIsLoadingPricing(true)
      try {
        const p = await fetchRegistrationPricing(
          formData.course,
          branchId,
          formData.duration,
          formData.slot || undefined
        )
        if (isMounted) setPricing(p)
      } catch (e) {
        console.error("Error loading pricing for coach registration:", e)
      } finally {
        if (isMounted) setIsLoadingPricing(false)
      }
    }

    void loadPricing()
    return () => {
      isMounted = false
    }
  }, [formData.course, formData.branch, formData.duration, formData.slot, coachData?.branch_id])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  const FIELD_ORDER = [
    "firstName",
    "lastName",
    "email",
    "contactNumber",
    "gender",
    "dob",
    "course",
    "slot",
  ]

  const scrollToFirstError = (validationErrors: FormErrors) => {
    const partnerCoachActive =
      isPartnerCoach ||
      Boolean(coachData?.partner_org_id) ||
      (typeof window !== "undefined" && Boolean(localStorage.getItem("partner_slug")?.trim()))
    if (!partnerCoachActive) return

    const firstErrorKey =
      FIELD_ORDER.find((key) => Boolean(validationErrors[key])) ||
      Object.keys(validationErrors)[0]
    if (!firstErrorKey) return

    requestAnimationFrame(() => {
      window.setTimeout(() => {
        const inputElement =
          document.getElementById(firstErrorKey) ||
          document.querySelector<HTMLElement>(`[name="${firstErrorKey}"]`)

        const labelElement =
          document.querySelector<HTMLElement>(`label[for="${firstErrorKey}"]`) ||
          document.querySelector<HTMLElement>(`[data-label-for="${firstErrorKey}"]`)

        const fieldContainer = document.getElementById(`field-${firstErrorKey}`)

        const scrollTarget =
          labelElement ||
          fieldContainer ||
          inputElement?.parentElement ||
          inputElement

        if (scrollTarget) {
          const navOffset = 130
          const elementPosition = scrollTarget.getBoundingClientRect().top
          const offsetPosition = elementPosition + window.pageYOffset - navOffset

          window.scrollTo({
            top: Math.max(0, offsetPosition),
            behavior: "smooth",
          })

          window.setTimeout(() => {
            const focusable = inputElement?.matches("input, select, textarea, button, [role='combobox']")
              ? inputElement
              : (inputElement?.querySelector<HTMLElement>("input, select, textarea, button, [role='combobox']") ||
                 fieldContainer?.querySelector<HTMLElement>("input, select, textarea, button, [role='combobox']"))

            if (focusable && typeof focusable.focus === "function") {
              try {
                focusable.focus({ preventScroll: true })
              } catch {
                focusable.focus()
              }
            }
          }, 350)
        }
      }, 50)
    })
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.firstName.trim()) newErrors.firstName = "First name is required"
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required"
    if (!formData.email.trim()) newErrors.email = "Email is required"
    if (!formData.gender) newErrors.gender = "Gender is required"
    if (!formData.dob) newErrors.dob = "Date of birth is required"
    if (!formData.course) newErrors.course = "Please select an assigned course"
    if ((!formData.course || availableBatches.length > 0) && !formData.slot) {
      newErrors.slot = "Please select an assigned batch"
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address"
    }

    {
      const mobileDigits = (formData.contactNumber || "").replace(/\D/g, "")
      if (!mobileDigits) {
        newErrors.contactNumber = "Mobile number is required"
      } else if (mobileDigits.length !== 10) {
        newErrors.contactNumber = "Mobile number must be exactly 10 digits"
      } else if (!/^[6-9]\d{9}$/.test(mobileDigits)) {
        newErrors.contactNumber = "Please enter a valid 10-digit phone number"
      }
    }

    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) {
      scrollToFirstError(newErrors)
      return false
    }
    return true
  }

  const beforePaymentConfirm = (method: "razorpay" | "physical_cash") => {
    if (!validateForm()) return false
    if (!formData.course || !formData.branch) {
      toast({
        title: "Course & academy required",
        description: "Select academy, course, batch, and duration before payment.",
        variant: "destructive",
      })
      return false
    }
    if (method === "physical_cash") {
      const cashNum = Number(cashAmount)
      if (!cashAmount.trim() || !Number.isFinite(cashNum) || cashNum <= 0) {
        setErrors({ submit: "Cash Payment Amount is required and must be a positive amount." })
        setPaymentMethod("physical_cash")
        toast({
          title: "Cash amount required",
          description: "Enter the cash amount received before recording payment.",
          variant: "destructive",
        })
        return false
      }
    }
    setPaymentMethod(method)
    return true
  }

  const executeRegistrationPayment = async (method: "razorpay" | "physical_cash") => {
    setIsSubmitting(true)

    // Pre-payment database verification: Ensure email and phone do not already exist
    try {
      const email = formData.email.trim()
      const phone = `${formData.countryCode}${formData.contactNumber.trim()}`
      const availability = await checkStudentAvailability(email, phone)

      if (!availability.available) {
        setIsSubmitting(false)
        const dupErrors: FormErrors = {}
        if (availability.email_exists) {
          dupErrors.email = "This email address is already registered."
        }
        if (availability.phone_exists) {
          dupErrors.contactNumber = "This mobile number is already registered."
        }
        setErrors((prev) => ({ ...prev, ...dupErrors }))
        scrollToFirstError(dupErrors)
        toast({
          title: "Student Already Exists",
          description: availability.message || "A student with this email address or mobile number already exists.",
          variant: "destructive",
        })
        return
      }
    } catch (checkErr) {
      console.warn("Pre-payment availability check warning:", checkErr)
    }
    const token = coachToken || localStorage.getItem("access_token") || localStorage.getItem("token")

    try {
      const studentPayload = {
        student_data: {
          email: formData.email,
          phone: `${formData.countryCode}${formData.contactNumber}`,
          first_name: formData.firstName,
          last_name: formData.lastName,
          full_name: `${formData.firstName} ${formData.lastName}`.trim(),
          role: "student",
          password: formData.password || "TempPassword123!",
          date_of_birth: formData.dob || undefined,
          gender: formData.gender || undefined,
          biometric_id: formData.biometricId || undefined,
          is_active: true,
        },
        course_id: formData.course,
        branch_id: formData.branch,
        batch_id: formData.slot || undefined,
        batch_ref: formData.slot || undefined,
        category_id: formData.category || undefined,
        duration: formData.duration || (durations.length > 0 ? durations[0].id : "1-month"),
        created_by: {
          id: coachData?.id,
          name: coachData?.full_name || `${coachData?.first_name || ""} ${coachData?.last_name || ""}`.trim() || "Coach",
          role: "coach",
        },
      }

      if (method === "razorpay") {
        const order = await createRegistrationOrder({
          course_id: formData.course,
          branch_id: formData.branch,
          duration: formData.duration || (durations.length > 0 ? durations[0].id : "1-month"),
          batch_ref: formData.slot || undefined,
          student_email: formData.email,
          student_phone: `${formData.countryCode}${formData.contactNumber}`,
          student_name: `${formData.firstName} ${formData.lastName}`.trim(),
        })

        openRazorpayCheckout({
          orderId: order.order_id,
          amount: order.amount_inr,
          amountPaise: order.amount_paise,
          currency: order.currency || "INR",
          razorpayKeyId: order.key_id,
          name: "Rock Martial Arts Academy",
          description: `Registration for ${order.course_name || "Course"}`,
          customerName: `${formData.firstName} ${formData.lastName}`.trim(),
          customerEmail: formData.email,
          customerContact: `${formData.countryCode}${formData.contactNumber}`,
          onSuccess: async (rzResp) => {
            try {
              await submitRegistrationPayment(
                {
                  ...studentPayload,
                  payment_method: "razorpay",
                  razorpay_payment_id: rzResp.razorpay_payment_id,
                  razorpay_order_id: rzResp.razorpay_order_id,
                  razorpay_signature: rzResp.razorpay_signature,
                },
                token
              )
              setShowSuccessPopup(true)
            } catch (err: any) {
              setErrors({ submit: err.message || "Failed to complete registration" })
            } finally {
              setIsSubmitting(false)
            }
          },
          onError: (err) => {
            setErrors({ submit: err?.message || "Payment cancelled or failed." })
            setIsSubmitting(false)
          },
          onDismiss: () => {
            setIsSubmitting(false)
          },
        })
        return
      }

      const cashNum = Number(cashAmount)
      if (!cashAmount.trim() || !Number.isFinite(cashNum) || cashNum <= 0) {
        setErrors({ submit: "Cash Payment Amount is required and must be a positive amount." })
        setIsSubmitting(false)
        return
      }
      await submitRegistrationPayment(
        {
          ...studentPayload,
          payment_method: "physical_cash",
          cash_notes: cashNotes || undefined,
          cash_amount: cashNum,
        },
        token
      )
      setShowSuccessPopup(true)
    } catch (error: any) {
      console.error("Error creating student:", error)
      setErrors({ submit: error.message || "Failed to create student. Please try again." })
      toast({
        title: "Error",
        description: error.message || "Failed to create student.",
        variant: "destructive",
      })
    } finally {
      if (method !== "razorpay") {
        setIsSubmitting(false)
      }
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
  }

  const handleSuccessOk = () => {
    setShowSuccessPopup(false)
    router.push("/coach-dashboard/students")
  }

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CoachDashboardHeader
        currentPage="Create Student"
        coachName={coachData?.full_name || "Coach"}
      />

      <main className="w-full mx-auto py-4 sm:py-6 px-4 sm:px-8 lg:px-12">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#4F5077] mb-1">Create New Student</h1>
            <p className="text-sm text-gray-500">
              Register a student under your assigned branch and courses
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push("/coach-dashboard/students")}
            className="mt-4 sm:mt-0 flex items-center space-x-2 px-4 py-2 border-gray-300 hover:bg-gray-50 transition-all duration-200 text-sm"
          >
            <span className="text-[#4F5077]">← Back to Students</span>
          </Button>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="relative z-[1] bg-white rounded-2xl border border-[#E8EAF0] shadow-[0_24px_80px_rgba(15,23,42,0.28)] shadow-sm border p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading your assigned courses and branch...</p>
          </div>
        ) : (
          <div className="relative z-[1] bg-white rounded-2xl border border-[#E8EAF0] shadow-[0_24px_80px_rgba(15,23,42,0.28)] shadow-sm border border-gray-200 overflow-hidden">
            <form
              id="coach-create-student-form"
              onSubmit={handleSubmit}
              noValidate
              className="admin-page-with-sticky-actions p-6 sm:p-8 space-y-8"
            >
              {errors.submit && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-red-600 font-medium">{errors.submit}</p>
                </div>
              )}

              <div className="space-y-8">
                {/* Branch Assignment (Locked) */}
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <Building2Icon className="w-6 h-6 text-yellow-600 flex-shrink-0" />
                    <div>
                      <p className="text-xs uppercase font-semibold text-yellow-800 tracking-wide">
                        Assigned Coach Branch (Locked)
                      </p>
                      <p className="text-base font-bold text-gray-900">
                        {coachBranchName || "Your Academy"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center text-xs text-yellow-700 bg-white/70 px-3 py-1.5 rounded-lg border border-yellow-200">
                    <LockIcon className="w-3.5 h-3.5 mr-1.5" />
                    Restricted to your branch & assigned batches
                  </div>
                </div>

                {/* Personal Information Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[#4F5077] border-b border-gray-200 pb-2">
                    Personal Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 text-[#7D8592]">
                    {/* First Name */}
                    <div id="field-firstName">
                      <Label htmlFor="firstName" data-label-for="firstName" className="block text-sm font-medium mb-2">
                        First Name <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <UserIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                          id="firstName"
                          placeholder="Enter first name"
                          value={formData.firstName}
                          onChange={(e) => handleInputChange("firstName", e.target.value)}
                          className={cn(
                            "pl-12 py-4 text-base bg-gray-50 border-gray-200 rounded-xl h-14",
                            errors.firstName ? "border-red-500 bg-red-50" : ""
                          )}
                        />
                        {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
                      </div>
                    </div>

                    {/* Last Name */}
                    <div id="field-lastName">
                      <Label htmlFor="lastName" data-label-for="lastName" className="block text-sm font-medium mb-2">
                        Last Name <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <UserIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                          id="lastName"
                          placeholder="Enter last name"
                          value={formData.lastName}
                          onChange={(e) => handleInputChange("lastName", e.target.value)}
                          className={cn(
                            "pl-12 py-4 text-base bg-gray-50 border-gray-200 rounded-xl h-14",
                            errors.lastName ? "border-red-500 bg-red-50" : ""
                          )}
                        />
                        {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
                      </div>
                    </div>

                    {/* Email */}
                    <div id="field-email">
                      <Label htmlFor="email" data-label-for="email" className="block text-sm font-medium mb-2">
                        Email Address <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <MailIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="Enter email address"
                          value={formData.email}
                          onChange={(e) => handleInputChange("email", e.target.value)}
                          className={cn(
                            "pl-12 py-4 text-base bg-gray-50 border-gray-200 rounded-xl h-14",
                            errors.email ? "border-red-500 bg-red-50" : ""
                          )}
                        />
                        {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                      </div>
                    </div>

                    {/* Mobile Number */}
                    <div id="field-contactNumber">
                      <Label htmlFor="contactNumber" data-label-for="contactNumber" className="block text-sm font-medium mb-2">
                        Mobile Number <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <PhoneIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                          id="contactNumber"
                          type="tel"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={10}
                          placeholder="Enter 10-digit mobile number"
                          value={formData.contactNumber}
                          onChange={(e) => {
                            let val = e.target.value.replace(/\D/g, "")
                            if (val.length > 10 && val.startsWith("91")) {
                              val = val.slice(2)
                            }
                            handleInputChange("contactNumber", val.slice(0, 10))
                          }}
                          onKeyDown={(e) => {
                            if (
                              !/^\d$/.test(e.key) &&
                              !["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab", "Enter"].includes(e.key) &&
                              !e.ctrlKey &&
                              !e.metaKey
                            ) {
                              e.preventDefault()
                            }
                          }}
                          className={cn(
                            "pl-12 py-4 text-base bg-gray-50 border-gray-200 rounded-xl h-14",
                            errors.contactNumber ? "border-red-500 bg-red-50" : ""
                          )}
                        />
                        {errors.contactNumber && (
                          <p className="text-red-500 text-sm mt-1">{errors.contactNumber}</p>
                        )}
                      </div>
                    </div>

                    {/* Gender */}
                    <div id="field-gender">
                      <Label htmlFor="gender" data-label-for="gender" className="block text-sm font-medium mb-2">
                        Gender <span className="text-red-500">*</span>
                      </Label>
                      <Select value={formData.gender} onValueChange={(value) => handleInputChange("gender", value)}>
                        <SelectTrigger
                          id="gender"
                          className={cn(
                            "!w-full !h-14 !pl-4 !pr-4 !py-4 !text-base !bg-gray-50 !border-gray-200 !rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 !min-h-14",
                            errors.gender ? "!border-red-500 !bg-red-50" : ""
                          )}
                        >
                          <SelectValue placeholder="Select Gender" className="text-gray-500" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border border-gray-200 bg-white shadow-lg">
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.gender && <p className="text-red-500 text-sm mt-1">{errors.gender}</p>}
                    </div>

                    {/* Date of Birth */}
                    <div id="field-dob">
                      <Label htmlFor="dob" data-label-for="dob" className="block text-sm font-medium mb-2">
                        Date of Birth <span className="text-red-500">*</span>
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            id="dob"
                            type="button"
                            variant="outline"
                            className={cn(
                              "w-full h-14 justify-start text-left font-normal pl-12 py-4 text-base bg-gray-50 border-gray-200 rounded-xl relative",
                              !selectedDate && "text-gray-500",
                              selectedDate && "text-gray-900",
                              errors.dob ? "border-red-500 bg-red-50" : ""
                            )}
                          >
                            <CalendarIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            {selectedDate ? format(selectedDate, "MMM dd, yyyy") : "Select date of birth"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-white border border-gray-200 rounded-xl shadow-lg">
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={(date) => {
                              setSelectedDate(date)
                              if (date) {
                                handleInputChange("dob", format(date, "yyyy-MM-dd"))
                              }
                            }}
                            captionLayout="dropdown"
                            startMonth={new Date(1920, 0)}
                            endMonth={new Date()}
                            defaultMonth={selectedDate || new Date(2010, 0)}
                            initialFocus
                            disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                            className="rounded-xl"
                          />
                        </PopoverContent>
                      </Popover>
                      {errors.dob && <p className="text-red-500 text-sm mt-1">{errors.dob}</p>}
                    </div>

                    {/* Password (Optional) */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="block text-sm font-medium">Password</Label>
                        <span className="text-xs text-yellow-600 font-medium">
                          Optional (24h link sent)
                        </span>
                      </div>
                      <PasswordInput
                        placeholder="Leave blank to send setup link"
                        value={formData.password}
                        onChange={(e) => handleInputChange("password", e.target.value)}
                        className="py-4 text-base bg-gray-50 border-gray-200 rounded-xl h-14"
                      />
                    </div>

                    {/* Biometric ID */}
                    <div>
                      <Label className="block text-sm font-medium mb-2">Biometric ID (Optional)</Label>
                      <Input
                        type="text"
                        placeholder="Enter biometric ID"
                        value={formData.biometricId}
                        onChange={(e) => handleInputChange("biometricId", e.target.value)}
                        className="py-4 text-base bg-gray-50 border-gray-200 rounded-xl h-14"
                      />
                    </div>
                  </div>
                </div>

                {/* Course & Batch Selection (Coach Restricted) */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                    <h3 className="text-lg font-semibold text-[#4F5077]">
                      Course & Batch Allocation
                    </h3>
                    <span className="text-xs text-gray-500">
                      Only courses & batches allocated to you are visible
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 text-[#7D8592]">
                    {/* Course */}
                    <div id="field-course">
                      <Label htmlFor="course" data-label-for="course" className="block text-sm font-medium mb-2">
                        Assigned Course <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <BookOpenIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 z-10 pointer-events-none" />
                        <Select
                          value={formData.course}
                          onValueChange={(value) => handleInputChange("course", value)}
                        >
                          <SelectTrigger
                            id="course"
                            className={cn(
                              "!w-full !h-14 !pl-12 !pr-4 !py-4 !text-base !bg-gray-50 !border-gray-200 !rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 !min-h-14",
                              errors.course ? "!border-red-500 !bg-red-50" : ""
                            )}
                          >
                            <SelectValue
                              placeholder={
                                courses.length === 0
                                  ? "No courses assigned to you"
                                  : "Select Assigned Course"
                              }
                              className="text-gray-500"
                            />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border border-gray-200 bg-white shadow-lg max-h-60">
                            {courses.length > 0 ? (
                              courses.map((course) => (
                                <SelectItem
                                  key={course.id}
                                  value={course.id}
                                  className="!py-3 !pl-3 pr-8 text-base hover:bg-gray-50 rounded-lg cursor-pointer"
                                >
                                  <div className="flex flex-col">
                                    <span className="font-medium text-gray-900">{course.title}</span>
                                    <span className="text-xs text-gray-500">
                                      {course.code || "Course"} • {course.batches?.length || 0} batches assigned to you
                                    </span>
                                  </div>
                                </SelectItem>
                              ))
                            ) : (
                              <div className="p-4 text-center text-gray-500">
                                <p className="text-sm">No courses assigned to you</p>
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                        {errors.course && <p className="text-red-500 text-sm mt-1">{errors.course}</p>}
                      </div>
                    </div>

                    {/* Batch Selection */}
                    <div id="field-slot">
                      <Label htmlFor="slot" data-label-for="slot" className="block text-sm font-medium mb-2">
                        Assigned Batch <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <ClockIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 z-10 pointer-events-none" />
                        <Select
                          value={formData.slot}
                          onValueChange={(value) => handleInputChange("slot", value)}
                          disabled={!formData.course}
                        >
                          <SelectTrigger
                            id="slot"
                            className={cn(
                              "!w-full !h-14 !pl-12 !pr-4 !py-4 !text-base !bg-gray-50 !border-gray-200 !rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 !min-h-14",
                              errors.slot ? "!border-red-500 !bg-red-50" : ""
                            )}
                          >
                            <SelectValue
                              placeholder={
                                !formData.course
                                  ? "Select course first"
                                  : availableBatches.length === 0
                                  ? "No batches allocated for this course"
                                  : "Select Your Batch"
                              }
                              className="text-gray-500"
                            />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border border-gray-200 bg-white shadow-lg max-h-60">
                            {availableBatches.length > 0 ? (
                              availableBatches.map((batch: any) => (
                                <SelectItem
                                  key={batch.batch_id || batch.id}
                                  value={batch.batch_id || batch.id}
                                  className="!py-3 !pl-3 pr-8 text-base hover:bg-gray-50 rounded-lg cursor-pointer"
                                >
                                  <div className="flex flex-col">
                                    <span className="font-medium text-gray-900">{batch.batch_name}</span>
                                    <span className="text-xs text-gray-500">
                                      {batch.start_time && batch.end_time ? `${batch.start_time} - ${batch.end_time}` : ""}
                                      {batch.days && batch.days.length > 0 ? ` • ${batch.days.join(", ")}` : ""}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))
                            ) : (
                              <div className="p-3 text-sm text-gray-500">
                                No batches assigned to you for this course
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                        {errors.slot && <p className="text-red-500 text-sm mt-1">{errors.slot}</p>}
                      </div>
                    </div>

                    {/* Duration */}
                    <div>
                      <Label className="block text-sm font-medium mb-2">Duration</Label>
                      <Select
                        value={formData.duration}
                        onValueChange={(value) => handleInputChange("duration", value)}
                        disabled={isLoadingDurations || durations.length === 0}
                      >
                        <SelectTrigger className="!w-full !h-14 !pl-4 !pr-4 !py-4 !text-base !bg-gray-50 !border-gray-200 !rounded-xl !min-h-14">
                          <SelectValue
                            placeholder={
                              isLoadingDurations
                                ? "Loading durations…"
                                : durations.length === 0
                                  ? "No durations for this batch"
                                  : "Select Duration"
                            }
                            className="text-gray-500"
                          />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border border-gray-200 bg-white shadow-lg max-h-60">
                          {durations.length > 0 ? (
                            durations.map((duration) => (
                              <SelectItem key={duration.id} value={duration.id}>
                                {duration.name}
                              </SelectItem>
                            ))
                          ) : (
                            <div className="p-3 text-sm text-gray-500">
                              Configure duration pricing under Academy → Course Assignments
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Payment Selection Section (Online Razorpay vs Hand Cash) */}
                {formData.course && formData.branch && (
                  <PaymentSelectionSection
                    pricing={pricing}
                    isLoadingPricing={isLoadingPricing}
                    paymentMethod={paymentMethod}
                    onPaymentMethodChange={setPaymentMethod}
                    cashNotes={cashNotes}
                    onCashNotesChange={setCashNotes}
                    cashAmount={cashAmount}
                    onCashAmountChange={setCashAmount}
                  />
                )}
              </div>

            </form>

            <AdminStickyFormActions>
              <CreateStudentPaymentActions
                isSubmitting={isSubmitting}
                disabled={isLoadingPricing || !formData.course || !formData.branch}
                paymentMethod={paymentMethod}
                onCancel={() => router.push("/coach-dashboard/students")}
                primaryButtonClassName="px-8 py-3 text-base font-medium bg-yellow-400 hover:bg-yellow-500 text-gray-900 rounded-xl"
                cancelButtonClassName="px-8 py-3 text-base font-medium border-gray-300 rounded-xl"
                summary={{
                  studentName: `${formData.firstName} ${formData.lastName}`.trim(),
                  academyName: coachData?.branch_name || "Academy",
                  courseName: courses.find((c) => c.id === formData.course)?.title || "Selected course",
                  batchName:
                    availableBatches.find((b: any) => b.id === formData.slot || b.batch_id === formData.slot)
                      ?.batch_name || "—",
                  durationName:
                    durations.find((d) => d.id === formData.duration)?.name || formData.duration || "—",
                  courseFee: pricing?.course_fee,
                  admissionFee: pricing?.admission_fee,
                  quotedTotal: pricing?.total_amount,
                  cashAmount,
                }}
                onBeforeConfirm={beforePaymentConfirm}
                onConfirmPayment={(method) => void executeRegistrationPayment(method)}
              />
            </AdminStickyFormActions>
          </div>
        )}

        {/* Success Popup */}
        {showSuccessPopup && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden p-4 sm:p-6">
        <div className="absolute inset-0 bg-[#0f172a]/55 backdrop-blur-[2px]" aria-hidden />
            <div className="relative z-[1] bg-white rounded-2xl border border-[#E8EAF0] shadow-[0_24px_80px_rgba(15,23,42,0.28)] p-8 max-w-md w-full mx-4 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Student Registered!</h3>
                <p className="text-gray-600 mb-4">
                  The student has been created successfully and assigned to your course.
                </p>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-left text-xs text-amber-900 mb-6 space-y-1">
                  <p className="font-semibold">Activation Details:</p>
                  <p>• A 24-hour password setup link was dispatched to <b>{formData.email}</b>.</p>
                  <p>• {paymentMethod === "razorpay" ? "Online Razorpay payment recorded & invoice generated." : "Physical Hand Cash recorded in registry & invoice generated."}</p>
                </div>
                <Button
                  onClick={handleSuccessOk}
                  className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold py-3 rounded-xl"
                >
                  Back to Students
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
