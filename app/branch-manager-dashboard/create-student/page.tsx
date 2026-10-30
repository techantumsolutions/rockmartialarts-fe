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
import Header from "@/components/layout/Header"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"
import { getActiveBranch, getActiveBranchId } from "@/lib/activeBranch"
import PaymentSelectionSection from "@/components/registration/PaymentSelectionSection"
import {
  fetchBranchCourseBatches,
  fetchRegistrationPricing,
  createRegistrationOrder,
  submitRegistrationPayment,
  RegistrationBatch,
  RegistrationPricing,
} from "@/lib/studentRegistrationPayment"
import { openRazorpayCheckout } from "@/lib/razorpay"

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
  const { toast } = useToast()

  const branchManager = BranchManagerAuth.getCurrentUser()
  const activeBranch = getActiveBranch()
  const headerBranchId =
    getActiveBranchId() ||
    branchManager?.branch_id ||
    branchManager?.managed_branches?.[0] ||
    ""

  // Loading states
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [courses, setCourses] = useState<Course[]>([])
  const [availableBatches, setAvailableBatches] = useState<RegistrationBatch[]>([])
  const [branchName, setBranchName] = useState(
    (activeBranch?.id === headerBranchId ? activeBranch.name : "") ||
    branchManager?.branch_name ||
    "Assigned Branch"
  )

  // Payment states
  const [paymentMethod, setPaymentMethod] = useState<"razorpay" | "physical_cash">("physical_cash")
  const [cashNotes, setCashNotes] = useState("")
  const [pricing, setPricing] = useState<RegistrationPricing | null>(null)
  const [isLoadingPricing, setIsLoadingPricing] = useState(false)

  // Durations
  const [durations, setDurations] = useState<{ id: string; name: string }[]>([
    { id: "1-month", name: "1 Month" },
    { id: "3-months", name: "3 Months" },
    { id: "6-months", name: "6 Months" },
    { id: "12-months", name: "12 Months" },
  ])

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
    branch: headerBranchId,
    category: "",
    course: "",
    duration: "1-month",
    slot: "",
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)

  // Auth check
  useEffect(() => {
    if (!BranchManagerAuth.isAuthenticated()) {
      router.replace("/branch-manager/login")
      return
    }
  }, [router])

  // Sync branch state if headerBranchId changes
  useEffect(() => {
    if (headerBranchId) {
      setFormData((prev) => ({ ...prev, branch: headerBranchId }))
    }
  }, [headerBranchId])

  // Load branch info and branch courses on mount
  useEffect(() => {
    const loadBranchAndCourses = async () => {
      setIsLoading(true)
      try {
        const branchId = headerBranchId || formData.branch

        // 1. Fetch branch name if missing or needed
        if (branchId) {
          try {
            const bRes = await fetch(getBackendApiUrl(`branches/public/${encodeURIComponent(branchId)}`))
            if (bRes.ok) {
              const bData = await bRes.json()
              const bObj = bData.branch || bData
              if (bObj?.name) {
                setBranchName(bObj.name)
              }
            }
          } catch (bErr) {
            console.error("Error fetching branch details:", bErr)
          }

          // 2. Fetch courses for this branch
          try {
            const cRes = await fetch(getBackendApiUrl(`courses/public/by-branch/${encodeURIComponent(branchId)}`))
            if (cRes.ok) {
              const cData = await cRes.json()
              const list = Array.isArray(cData.courses) ? cData.courses : []
              setCourses(list)
            } else {
              setCourses([])
            }
          } catch (cErr) {
            console.error("Error fetching branch courses:", cErr)
            setCourses([])
          }
        }

        // 3. Fetch active durations
        try {
          const durRes = await fetch(getBackendApiUrl("durations/public/all"))
          if (durRes.ok) {
            const durData = await durRes.json()
            const durList = Array.isArray(durData.durations) ? durData.durations : []
            if (durList.length > 0) {
              const mapped = durList.map((d: any) => ({
                id: d.id,
                name: d.name || d.code || `${d.duration_months} Months`,
              }))
              setDurations(mapped)
              setFormData((prev) => {
                const exists = mapped.some((m: any) => m.id === prev.duration)
                return exists ? prev : { ...prev, duration: mapped[0].id }
              })
            }
          }
        } catch (durErr) {
          console.error("Error fetching durations:", durErr)
        }
      } catch (err) {
        console.error("Error in loadBranchAndCourses:", err)
        toast({
          title: "Warning",
          description: "Could not load branch information.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadBranchAndCourses()
  }, [headerBranchId, toast])

  // When branch or course changes, load available batches
  useEffect(() => {
    const branchId = formData.branch || headerBranchId
    if (!formData.course || !branchId) {
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
        const batches = await fetchBranchCourseBatches(branchId, formData.course)
        if (!isMounted) return
        setAvailableBatches(batches)
        if (batches.length > 0) {
          setFormData((prev) => {
            const currentValid = batches.some((b) => b.batch_id === prev.slot || b.id === prev.slot)
            return currentValid ? prev : { ...prev, slot: batches[0].batch_id || batches[0].id }
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
  }, [formData.course, formData.branch, headerBranchId, courses])

  // Load pricing when course, branch, duration, or slot changes
  useEffect(() => {
    const branchId = formData.branch || headerBranchId
    if (!formData.course || !branchId) {
      setPricing(null)
      return
    }

    let isMounted = true
    const loadPricing = async () => {
      setIsLoadingPricing(true)
      try {
        const dur = formData.duration || (durations.length > 0 ? durations[0].id : "1-month")
        const p = await fetchRegistrationPricing(
          formData.course,
          branchId,
          dur,
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
  }, [formData.course, formData.branch, formData.duration, formData.slot, headerBranchId, durations])

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

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.firstName.trim()) newErrors.firstName = "First name is required"
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required"
    if (!formData.email.trim()) newErrors.email = "Email is required"
    if (!formData.contactNumber.trim()) newErrors.contactNumber = "Contact number is required"
    if (!formData.gender) newErrors.gender = "Gender is required"
    if (!formData.dob) newErrors.dob = "Date of birth is required"
    if (!formData.course) newErrors.course = "Please select a course"
    if (availableBatches.length > 0 && !formData.slot) newErrors.slot = "Please select a batch"

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address"
    }

    if (formData.contactNumber && !/^[0-9]{10}$/.test(formData.contactNumber.replace(/\s+/g, ""))) {
      newErrors.contactNumber = "Please enter a valid 10-digit phone number"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    const token = BranchManagerAuth.getToken()
    const branchId = formData.branch || headerBranchId

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
        branch_id: branchId,
        batch_id: formData.slot || undefined,
        batch_ref: formData.slot || undefined,
        category_id: formData.category || undefined,
        duration: formData.duration || (durations.length > 0 ? durations[0].id : "1-month"),
        created_by: {
          id: branchManager?.id || branchManager?.user_id || "branch_manager",
          name:
            branchManager?.full_name ||
            branchManager?.name ||
            `${branchManager?.first_name || ""} ${branchManager?.last_name || ""}`.trim() ||
            "Branch Manager",
          role: "branch_manager",
          email: branchManager?.email || "",
        },
      }

      if (paymentMethod === "razorpay") {
        const order = await createRegistrationOrder({
          course_id: formData.course,
          branch_id: branchId,
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
      } else {
        // Physical hand cash flow
        await submitRegistrationPayment(
          {
            ...studentPayload,
            payment_method: "physical_cash",
            cash_notes: cashNotes || undefined,
          },
          token
        )
        setShowSuccessPopup(true)
      }
    } catch (error: any) {
      console.error("Error creating student:", error)
      setErrors({ submit: error.message || "Failed to create student. Please try again." })
      toast({
        title: "Error",
        description: error.message || "Failed to create student.",
        variant: "destructive",
      })
    } finally {
      if (paymentMethod !== "razorpay") {
        setIsSubmitting(false)
      }
    }
  }

  const handleSuccessOk = () => {
    setShowSuccessPopup(false)
    router.push("/branch-manager-dashboard/students")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Create Student" role="branch_admin" />

      <main className="w-full mx-auto py-4 sm:py-6 px-4 sm:px-8 lg:px-12">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#4F5077] mb-1">Create New Student</h1>
            <p className="text-sm text-gray-500">
              Register a student under your branch and assigned courses
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push("/branch-manager-dashboard/students")}
            className="mt-4 sm:mt-0 flex items-center space-x-2 px-4 py-2 border-gray-300 hover:bg-gray-50 transition-all duration-200 text-sm"
          >
            <span className="text-[#4F5077]">← Back to Students</span>
          </Button>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="bg-white rounded-2xl shadow-sm border p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading branch information and courses...</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-8">
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
                        Assigned Branch (Locked)
                      </p>
                      <p className="text-base font-bold text-gray-900">
                        {branchName || "Your Assigned Branch"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center text-xs text-yellow-700 bg-white/70 px-3 py-1.5 rounded-lg border border-yellow-200">
                    <LockIcon className="w-3.5 h-3.5 mr-1.5" />
                    Restricted to your branch courses & batches
                  </div>
                </div>

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
                          placeholder="Enter 10-digit mobile number"
                          value={formData.contactNumber}
                          onChange={(e) => handleInputChange("contactNumber", e.target.value)}
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

                {/* Course & Batch Selection (Branch Restricted) */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                    <h3 className="text-lg font-semibold text-[#4F5077]">
                      Course & Batch Allocation
                    </h3>
                    <span className="text-xs text-gray-500">
                      Only courses & batches allocated to your branch are visible
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
                        >
                          <SelectTrigger
                            className={cn(
                              "!w-full !h-14 !pl-12 !pr-4 !py-4 !text-base !bg-gray-50 !border-gray-200 !rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 !min-h-14",
                              errors.course ? "!border-red-500 !bg-red-50" : ""
                            )}
                          >
                            <SelectValue
                              placeholder={
                                courses.length === 0
                                  ? "No courses available for your branch"
                                  : "Select Branch Course"
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
                                No batches scheduled for this course at your branch
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
                      >
                        <SelectTrigger className="!w-full !h-14 !pl-4 !pr-4 !py-4 !text-base !bg-gray-50 !border-gray-200 !rounded-xl !min-h-14">
                          <SelectValue placeholder="Select Duration" className="text-gray-500" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border border-gray-200 bg-white shadow-lg max-h-60">
                          {durations.map((duration) => (
                            <SelectItem key={duration.id} value={duration.id}>
                              {duration.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Payment Selection Section (Online Razorpay vs Hand Cash) */}
                {formData.course && (formData.branch || headerBranchId) && (
                  <PaymentSelectionSection
                    pricing={pricing}
                    isLoadingPricing={isLoadingPricing}
                    paymentMethod={paymentMethod}
                    onPaymentMethodChange={setPaymentMethod}
                    cashNotes={cashNotes}
                    onCashNotesChange={setCashNotes}
                  />
                )}
              </div>

              {/* Form Actions */}
              <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/branch-manager-dashboard/students")}
                  className="flex-1 sm:flex-none px-8 py-3 text-base font-medium border-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-none px-8 py-3 text-base font-medium bg-yellow-400 hover:bg-yellow-500 text-gray-900"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900 mr-2"></div>
                      Processing...
                    </>
                  ) : paymentMethod === "razorpay" ? (
                    "Proceed to Razorpay Payment"
                  ) : (
                    "Record Cash & Create Student"
                  )}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Success Popup */}
        {showSuccessPopup && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
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
