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
import { useDashboardBasePath, useDashboardRole } from "@/lib/useDashboardBasePath"
import { useToast } from "@/hooks/use-toast"
import { TokenManager } from "@/lib/tokenManager"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"
import { getActiveBranch, getActiveBranchId } from "@/lib/activeBranch"
import PaymentSelectionSection from "@/components/registration/PaymentSelectionSection"
import { CreateStudentPaymentActions } from "@/components/registration/CreateStudentPaymentActions"
import {
  fetchBranchCourseBatches,
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
import {
  DashboardFormPageHeader,
  dashboardFormCardClass,
  primaryButtonClass,
} from "@/components/dashboard/dashboardFormStyles"
import { AdminStickyFormActions } from "@/components/dashboard/AdminStickyFormActions"

interface Branch {
  id: string
  name: string
  code?: string
  branch?: {
    name?: string
    code?: string
  }
  address?: {
    state?: string
    city?: string
    street?: string
  }
}

interface Course {
  id: string
  title: string
  code: string
  description?: string
  difficulty_level?: string
  category_id?: string
  pricing?: {
    amount: number
    currency: string
  }
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
  branch: string
  category: string
  course: string
  duration: string
  slot: string
}

export default function CreateStudent() {
  const router = useRouter()
  const basePath = useDashboardBasePath()
  const role = useDashboardRole()
  const isSuperAdmin = role === "super_admin"
  const isPartnerAdmin = role === "partner_super_admin"
  const isBranchAdmin = role === "branch_admin"
  const canSelectBranch = isSuperAdmin || isPartnerAdmin
  const { toast } = useToast()

  const branchManager = BranchManagerAuth.getCurrentUser()
  const activeBranch = getActiveBranch()
  const headerBranchId =
    getActiveBranchId() ||
    branchManager?.branch_id ||
    branchManager?.managed_branches?.[0] ||
    activeBranch?.id ||
    ""

  // Loading states
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [branches, setBranches] = useState<Branch[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [availableBatches, setAvailableBatches] = useState<RegistrationBatch[]>([])
  const [branchName, setBranchName] = useState(
    (activeBranch?.id === headerBranchId ? activeBranch.name : "") ||
    branchManager?.branch_name ||
    activeBranch?.name ||
    "Assigned Academy"
  )

  // Payment states
  const [paymentMethod, setPaymentMethod] = useState<"razorpay" | "physical_cash">("physical_cash")
  const [cashNotes, setCashNotes] = useState("")
  const [cashAmount, setCashAmount] = useState("")
  const [pricing, setPricing] = useState<RegistrationPricing | null>(null)
  const [isLoadingPricing, setIsLoadingPricing] = useState(false)

  // Durations — loaded dynamically from academy course/batch tenure setup
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
    branch: isBranchAdmin ? headerBranchId : "",
    category: "",
    course: "",
    duration: "1-month",
    slot: "",
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


  // Load initial academies & durations
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true)
      try {
        // 1. Load active academies
        try {
          const token = TokenManager.getToken()
          const bUrl = isPartnerAdmin
            ? getBackendApiUrl("branches?active_only=true&limit=100")
            : getBackendApiUrl("branches/public/all?active_only=true")
          const bRes = await fetch(bUrl, {
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
              "Content-Type": "application/json",
            },
          })
          if (bRes.ok) {
            const bData = await bRes.json()
            const rawList: any[] = Array.isArray(bData.branches) ? bData.branches : []
            const branchList: Branch[] = rawList.map((b: any) => ({
              ...b,
              name: b.name || b.branch?.name || b.branch_name || "Academy",
              code: b.code || b.branch?.code || "",
            }))
            setBranches(branchList)

            if (isBranchAdmin) {
              const currentId = headerBranchId || branchList[0]?.id || ""
              const matched = branchList.find((b) => b.id === currentId)
              if (matched) {
                setBranchName(matched.name)
              }
              setFormData((prev) => ({ ...prev, branch: currentId }))
            } else if (canSelectBranch) {
              // Super admin & Partner admin can default to first academy or let user select
              if (branchList.length > 0) {
                setFormData((prev) => {
                  const selectedId = prev.branch && branchList.some((b) => b.id === prev.branch)
                    ? prev.branch
                    : branchList[0].id
                  const matched = branchList.find((b) => b.id === selectedId)
                  if (matched) {
                    setBranchName(matched.name)
                  }
                  return { ...prev, branch: selectedId }
                })
              }
            }
          }
        } catch (bErr) {
          console.error("Error loading academies in admin create student:", bErr)
        }

      } catch (err) {
        console.error("Error in loadInitialData:", err)
        toast({
          title: "Warning",
          description: "Failed to initialize academies and options.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadInitialData()
  }, [isBranchAdmin, isSuperAdmin, isPartnerAdmin, canSelectBranch, headerBranchId, toast])

  // When academy changes, load courses for that academy
  useEffect(() => {
    if (!formData.branch) {
      setCourses([])
      return
    }

    const loadCoursesForBranch = async () => {
      try {
        // Prefer public by-branch: includes batches + fees and omits courses without them.
        let fetchedCourses: any[] = []
        const cRes = await fetch(
          getBackendApiUrl(`courses/public/by-branch/${encodeURIComponent(formData.branch)}`)
        )
        if (cRes.ok) {
          const cData = await cRes.json()
          if (Array.isArray(cData.courses)) {
            fetchedCourses = cData.courses
          }
        }

        const list: Course[] = filterEnrollableCourses(
          fetchedCourses.map((c: any) => ({
            ...c,
            title: c.title || c.name || "Untitled Course",
            code: c.code || "",
          }))
        )
        setCourses(list)

        // If current selected course not in this academy's courses, reset it
        setFormData((prev) => {
          if (prev.course && !list.some((c) => c.id === prev.course)) {
            return { ...prev, course: "", slot: "", category: "" }
          }
          return prev
        })
      } catch (err) {
        console.error("Error loading courses for academy:", err)
        setCourses([])
      }
    }

    loadCoursesForBranch()
  }, [formData.branch])

  // When academy or course changes, load available batches
  useEffect(() => {
    if (!formData.course || !formData.branch) {
      setAvailableBatches([])
      return
    }

    const matchedCourse = courses.find((c) => c.id === formData.course)
    if (matchedCourse?.category_id) {
      setFormData((prev) => ({ ...prev, category: matchedCourse.category_id || "" }))
    }

    let isMounted = true
    const loadBatches = async () => {
      try {
        const batches = await fetchBranchCourseBatches(formData.branch, formData.course)
        if (!isMounted) return
        setAvailableBatches(batches)
        if (batches.length > 0) {
          setFormData((prev) => {
            const currentValid = batches.find((b) => (b.batch_id === prev.slot || b.id === prev.slot) && !b.is_full)
            if (currentValid) return prev
            const firstAvailable = batches.find((b) => !b.is_full)
            return { ...prev, slot: firstAvailable ? (firstAvailable.batch_id || firstAvailable.id) : "" }
          })
        } else {
          setFormData((prev) => ({ ...prev, slot: "" }))
        }
      } catch (err) {
        console.error("Error loading batches:", err)
        if (isMounted) {
          setAvailableBatches([])
        }
      }
    }

    loadBatches()

    return () => {
      isMounted = false
    }
  }, [formData.course, formData.branch, courses])

  // Durations follow the selected academy course + batch (Course Assignments tenure setup)
  useEffect(() => {
    if (!formData.course || !formData.branch) {
      setDurations([])
      return
    }

    let isMounted = true
    const loadDurations = async () => {
      setIsLoadingDurations(true)
      try {
        const list = await fetchRegistrationDurations(
          formData.course,
          formData.branch,
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
        console.error("Error loading durations:", err)
        if (isMounted) setDurations([])
      } finally {
        if (isMounted) setIsLoadingDurations(false)
      }
    }

    void loadDurations()
    return () => {
      isMounted = false
    }
  }, [formData.course, formData.branch, formData.slot])

  // Load pricing when course, academy, duration, or slot changes
  useEffect(() => {
    if (!formData.course || !formData.branch || !formData.duration) {
      setPricing(null)
      return
    }

    let isMounted = true
    const loadPricing = async () => {
      setIsLoadingPricing(true)
      try {
        const p = await fetchRegistrationPricing(
          formData.course,
          formData.branch,
          formData.duration,
          formData.slot || undefined
        )
        if (isMounted) {
          setPricing(p)
        }
      } catch (err) {
        console.error("Error loading pricing:", err)
      } finally {
        if (isMounted) {
          setIsLoadingPricing(false)
        }
      }
    }

    loadPricing()

    return () => {
      isMounted = false
    }
  }, [formData.course, formData.branch, formData.duration, formData.slot])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => {
      if (field === "course" && prev.course !== value) {
        return { ...prev, [field]: value, slot: "" }
      }
      return { ...prev, [field]: value }
    })
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  const handleBranchChange = (newBranchId: string) => {
    const selectedBranch = branches.find((b) => b.id === newBranchId)
    if (selectedBranch) {
      setBranchName(selectedBranch.name || (selectedBranch as any).branch?.name || "Assigned Academy")
    }
    setFormData((prev) => ({
      ...prev,
      branch: newBranchId,
      course: "",
      slot: "",
      category: "",
    }))
    if (errors.branch) {
      setErrors((prev) => ({ ...prev, branch: "" }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.branch) newErrors.branch = "Academy is required"
    if (!formData.firstName.trim()) newErrors.firstName = "First name is required"
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required"
    if (!formData.email.trim()) newErrors.email = "Email is required"
    if (!formData.gender) newErrors.gender = "Gender is required"
    if (!formData.dob) newErrors.dob = "Date of birth is required"
    if (!formData.course) newErrors.course = "Please select a course"
    if (availableBatches.length > 0) {
      if (!formData.slot) {
        newErrors.slot = "Please select a batch"
      } else {
        const chosen = availableBatches.find((b) => b.batch_id === formData.slot || b.id === formData.slot)
        if (chosen?.is_full) {
          newErrors.slot = "Selected batch is full. Please choose another batch."
        }
      }
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
    return Object.keys(newErrors).length === 0
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
    const token =
      TokenManager.getToken() ||
      (typeof window !== "undefined"
        ? localStorage.getItem("token") || localStorage.getItem("access_token")
        : null)

    const rawUser =
      typeof window !== "undefined"
        ? JSON.parse(localStorage.getItem("user") || "null")
        : null

    const createdBy = {
      id: rawUser?.id || rawUser?.user_id || (isSuperAdmin ? "super_admin" : isPartnerAdmin ? "partner_super_admin" : "branch_manager"),
      name:
        rawUser?.full_name ||
        rawUser?.name ||
        `${rawUser?.first_name || ""} ${rawUser?.last_name || ""}`.trim() ||
        (isSuperAdmin ? "Super Admin" : isPartnerAdmin ? "Partner Admin" : "Academy Admin"),
      role: isSuperAdmin ? "super_admin" : isPartnerAdmin ? "partner_super_admin" : "branch_manager",
      email: rawUser?.email || "",
      ...(rawUser?.partner_org_id ? { partner_org_id: rawUser.partner_org_id } : {}),
    }

    try {
      const studentPayload = {
        student_data: {
          email: formData.email.trim(),
          phone: `${formData.countryCode}${formData.contactNumber.trim()}`,
          first_name: formData.firstName.trim(),
          last_name: formData.lastName.trim(),
          full_name: `${formData.firstName} ${formData.lastName}`.trim(),
          role: "student",
          password: formData.password || "TempPassword123!",
          date_of_birth: formData.dob || undefined,
          gender: formData.gender || undefined,
          biometric_id: formData.biometricId?.trim() || undefined,
          is_active: true,
        },
        course_id: formData.course,
        branch_id: formData.branch,
        batch_id: formData.slot || undefined,
        batch_ref: formData.slot || undefined,
        category_id: formData.category || undefined,
        duration: formData.duration || (durations.length > 0 ? durations[0].id : "1-month"),
        created_by: createdBy,
      }

      if (method === "razorpay") {
        const order = await createRegistrationOrder({
          course_id: formData.course,
          branch_id: formData.branch,
          duration: formData.duration || (durations.length > 0 ? durations[0].id : "1-month"),
          batch_ref: formData.slot || undefined,
          student_email: formData.email.trim(),
          student_phone: `${formData.countryCode}${formData.contactNumber.trim()}`,
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
          customerEmail: formData.email.trim(),
          customerContact: `${formData.countryCode}${formData.contactNumber.trim()}`,
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
    // Sticky dual actions open confirmation; keep form submit from bypassing summary.
  }

  const selectedCourseTitle =
    courses.find((c) => c.id === formData.course)?.title || "Selected course"
  const selectedDurationName =
    durations.find((d) => d.id === formData.duration)?.name || formData.duration || "—"
  const selectedBatchName =
    availableBatches.find((b) => b.id === formData.slot || b.batch_id === formData.slot)?.batch_name ||
    "—"

  const handleSuccessOk = () => {
    setShowSuccessPopup(false)
    router.push(`${basePath}/students`)
  }

  return (
    <div className="min-h-screen bg-[#F5F6FA]">
      <main className="w-full py-6 px-4 lg:px-8 xl:px-10">
        <DashboardFormPageHeader
          title="Create New Student"
          subtitle={
            canSelectBranch
              ? isPartnerAdmin
                ? "Register a student under your partner academies, courses, and batches"
                : "Register a student under any academy, course, and batch"
              : "Register a student under your assigned academy and courses"
          }
          backLabel="Back to Students"
          onBack={() => router.push(`${basePath}/students`)}
        />

        {/* Loading State */}
        {isLoading ? (
          <div className="relative z-[1] bg-white rounded-2xl border border-[#E8EAF0] shadow-[0_24px_80px_rgba(15,23,42,0.28)] shadow-sm border p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading branches and form options...</p>
          </div>
        ) : (
          <div className={dashboardFormCardClass}>
            <form
              id="create-student-form"
              onSubmit={handleSubmit}
              className="admin-page-with-sticky-actions p-6 sm:p-8 space-y-8 [&_input]:rounded-lg [&_input]:border-gray-200"
            >
              {errors.submit && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-red-600 font-medium">{errors.submit}</p>
                </div>
              )}

              <div className="space-y-8">
                {/* Branch Section: Super Admin / Partner Admin (Select Academy) vs Academy Admin (Locked) */}
                {canSelectBranch ? (
                  <div className="p-5 bg-gradient-to-r from-amber-50/80 to-yellow-50/60 border border-amber-200 rounded-xl space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center space-x-3">
                        <Building2Icon className="w-6 h-6 text-yellow-600 flex-shrink-0" />
                        <div>
                          <p className="text-xs uppercase font-semibold text-yellow-800 tracking-wide">
                            Branch Allocation
                          </p>
                          <p className="text-sm text-gray-700">
                            {isPartnerAdmin
                              ? "Select a partner academy to load its allocated courses & batches"
                              : "Select any academy to load its allocated courses & batches"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center text-xs text-green-700 bg-white/80 px-3 py-1.5 rounded-lg border border-green-200 self-start sm:self-auto font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-green-600" />
                        {isPartnerAdmin ? "Partner Access: Partner Academies Available" : "Super Admin Access: All Academies Available"}
                      </div>
                    </div>

                    <div className="pt-2">
                      <Select value={formData.branch} onValueChange={handleBranchChange}>
                        <SelectTrigger
                          className={cn(
                            "!w-full !h-14 !pl-4 !pr-4 !py-4 !text-base !bg-white !border-gray-300 !rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 !min-h-14 shadow-sm",
                            errors.branch ? "!border-red-500 !bg-red-50" : ""
                          )}
                        >
                          <SelectValue placeholder="Select an Academy" className="text-gray-500" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border border-gray-200 bg-white shadow-lg max-h-60">
                          {branches.map((b) => (
                            <SelectItem
                              key={b.id}
                              value={b.id}
                              className="!py-3 !pl-3 pr-8 text-base hover:bg-gray-50 rounded-lg cursor-pointer"
                            >
                              <div className="flex flex-col">
                                <span className="font-medium text-gray-900">{b.name || (b as any).branch?.name || "Academy"}</span>
                                {(b.code || (b as any).branch?.code) && (
                                  <span className="text-xs text-gray-500">Code: {b.code || (b as any).branch?.code}</span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.branch && <p className="text-red-500 text-sm mt-1">{errors.branch}</p>}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <Building2Icon className="w-6 h-6 text-yellow-600 flex-shrink-0" />
                      <div>
                        <p className="text-xs uppercase font-semibold text-yellow-800 tracking-wide">
                          Assigned Branch (Locked)
                        </p>
                        <p className="text-base font-bold text-gray-900">
                          {branchName || "Your Academy"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center text-xs text-yellow-700 bg-white/70 px-3 py-1.5 rounded-lg border border-yellow-200">
                      <LockIcon className="w-3.5 h-3.5 mr-1.5" />
                      Restricted to your branch courses & batches
                    </div>
                  </div>
                )}

                {/* Personal Information Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[#4F5077] border-b border-gray-200 pb-2">
                    Personal Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 text-[#7D8592]">
                    {/* First Name */}
                    <div>
                      <Label className="block text-sm font-medium mb-2">
                        First Name <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <UserIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
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
                    <div>
                      <Label className="block text-sm font-medium mb-2">
                        Last Name <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <UserIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
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
                    <div>
                      <Label className="block text-sm font-medium mb-2">
                        Email Address <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <MailIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
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
                    <div>
                      <Label className="block text-sm font-medium mb-2">
                        Mobile Number <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <PhoneIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
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
                    <div>
                      <Label className="block text-sm font-medium mb-2">
                        Gender <span className="text-red-500">*</span>
                      </Label>
                      <Select value={formData.gender} onValueChange={(value) => handleInputChange("gender", value)}>
                        <SelectTrigger
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
                    <div>
                      <Label className="block text-sm font-medium mb-2">
                        Date of Birth <span className="text-red-500">*</span>
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
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

                {/* Course & Batch Selection */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                    <h3 className="text-lg font-semibold text-[#4F5077]">
                      Course & Batch Allocation
                    </h3>
                    <span className="text-xs text-gray-500">
                      {canSelectBranch
                        ? "Select any course and batch available for the chosen academy"
                        : "Only courses & batches allocated to your academy are visible"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 text-[#7D8592]">
                    {/* Course */}
                    <div>
                      <Label className="block text-sm font-medium mb-2">
                        Assigned Course <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <BookOpenIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 z-10 pointer-events-none" />
                        <Select
                          value={formData.course}
                          onValueChange={(value) => handleInputChange("course", value)}
                          disabled={!formData.branch}
                        >
                          <SelectTrigger
                            className={cn(
                              "!w-full !h-14 !pl-12 !pr-4 !py-4 !text-base !bg-gray-50 !border-gray-200 !rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 !min-h-14",
                              errors.course ? "!border-red-500 !bg-red-50" : ""
                            )}
                          >
                            <SelectValue
                              placeholder={
                                !formData.branch
                                  ? "Select an academy first"
                                  : courses.length === 0
                                  ? "No courses found for this academy"
                                  : "Select Course"
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
                                    <span className="font-medium text-gray-900">{course.title || (course as any).name || "Untitled Course"}</span>
                                    {course.code && (
                                      <span className="text-xs text-gray-500">{course.code}</span>
                                    )}
                                  </div>
                                </SelectItem>
                              ))
                            ) : (
                              <div className="p-4 text-center text-gray-500">
                                <p className="text-sm">No courses assigned to this branch</p>
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                        {errors.course && <p className="text-red-500 text-sm mt-1">{errors.course}</p>}
                      </div>
                    </div>

                    {/* Batch Selection */}
                    <div>
                      <Label className="block text-sm font-medium mb-2">
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
                                  ? "No batches scheduled for this course"
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
                                  disabled={batch.is_full}
                                  className={`!py-3 !pl-3 pr-8 text-base rounded-lg ${
                                    batch.is_full
                                      ? "opacity-50 cursor-not-allowed bg-gray-50"
                                      : "hover:bg-gray-50 cursor-pointer"
                                  }`}
                                >
                                  <div className="flex flex-col">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="font-medium text-gray-900">{batch.batch_name}</span>
                                      {batch.is_full ? (
                                        <span className="text-[10px] font-bold uppercase tracking-wide text-red-700 bg-red-100 px-1.5 py-0.5 rounded">
                                          Full {batch.enrolled_students != null && batch.max_students ? `(${batch.enrolled_students}/${batch.max_students})` : ""}
                                        </span>
                                      ) : batch.max_students ? (
                                        <span className="text-[10px] font-medium text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                                          {batch.enrolled_students ?? 0}/{batch.max_students} spots
                                        </span>
                                      ) : null}
                                    </div>
                                    <span className="text-xs text-gray-500">
                                      {batch.start_time && batch.end_time ? `${batch.start_time} - ${batch.end_time}` : ""}
                                      {batch.days && batch.days.length > 0 ? ` • ${batch.days.join(", ")}` : ""}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))
                            ) : (
                              <div className="p-3 text-sm text-gray-500">
                                No batches scheduled for this course at this branch
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                        {errors.slot && <p className="text-red-500 text-sm mt-1">{errors.slot}</p>}
                      </div>
                    </div>

                    {/* Duration — only tenures enabled/priced for the selected batch */}
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
                              Configure duration pricing for this batch under Academy → Course Assignments
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
                onCancel={() => router.push(`${basePath}/students`)}
                primaryButtonClassName={primaryButtonClass}
                summary={{
                  studentName: `${formData.firstName} ${formData.lastName}`.trim(),
                  academyName:
                    branches.find((b) => b.id === formData.branch)?.branch?.name ||
                    branches.find((b) => b.id === formData.branch)?.name ||
                    branchName ||
                    "—",
                  courseName: selectedCourseTitle,
                  batchName: selectedBatchName,
                  durationName: selectedDurationName,
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
                  The student has been created successfully and assigned to the course.
                </p>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-left text-xs text-amber-900 mb-6 space-y-1">
                  <p className="font-semibold">Activation Details:</p>
                  <p>• A 24-hour password setup link was dispatched to <b>{formData.email}</b>.</p>
                  <p>
                    • {paymentMethod === "razorpay" ? "Online Razorpay payment recorded & invoice generated." : "Physical Hand Cash recorded in registry & invoice generated."}
                  </p>
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
