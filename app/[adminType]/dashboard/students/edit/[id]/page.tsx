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
import { CalendarIcon, MapPinIcon, Building2Icon, FolderIcon, BookOpenIcon, ClockIcon, UserIcon, MailIcon, PhoneIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { TokenManager } from "@/lib/tokenManager"
import { dropdownAPI } from "@/lib/dropdownAPI"
import { useGeographyDropdowns } from "@/hooks/use-geography-dropdowns"
import { useToast } from "@/hooks/use-toast"
import paymentAPI from "@/lib/paymentAPI"

const DEFAULT_DURATION_OPTIONS: Array<{ id: string; name: string; code?: string }> = [
  { id: "1-month", name: "1 Month", code: "1-month" },
  { id: "3-months", name: "3 Months", code: "3-months" },
  { id: "6-months", name: "6 Months", code: "6-months" },
  { id: "12-months", name: "12 Months", code: "12-months" },
  { id: "lifetime", name: "Lifetime", code: "lifetime" },
]

function resolveDurationSelectValue(
  raw: string,
  options: Array<{ id: string; name?: string; code?: string }>
): string {
  if (!raw) return ""
  if (options.some((o) => o.id === raw)) return raw
  const byCode = options.find((o) => o.code === raw)
  if (byCode) return byCode.id
  const lower = raw.toLowerCase()
  const byName = options.find((o) => (o.name || "").toLowerCase() === lower)
  if (byName) return byName.id
  return raw
}

interface Branch {
  id: string
  name: string
  code?: string
  address?: string | { area?: string; city?: string; state?: string }
  phone?: string
  email?: string
  location?: string
  location_id?: string
}

type BatchOption = {
  batch_ref: string
  label: string
  name?: string | null
}

interface Course {
  id: string
  title: string
  code: string
  description: string
  difficulty_level: string
  category_id: string
  category_name?: string
  duration?: string
  pricing: {
    amount: number
    currency: string
  }
}

interface FormErrors {
  [key: string]: string
}

export default function EditStudent() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const studentId = params.id as string
  const basePath = `/${(params?.adminType as string) || "super-admin"}/dashboard`
  const studentsListUrl = searchParams.get("return") || `${basePath}/students`
  const isSuperAdmin = basePath.startsWith("/super-admin")
  const { access_token } = useAuth()
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [branches, setBranches] = useState<Branch[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [locationSeed, setLocationSeed] = useState("")
  const geography = useGeographyDropdowns({ initialCityId: locationSeed })

  useEffect(() => {
    setLocations(geography.hasStates && geography.selectedStateId ? geography.cities : geography.allCities)
    setIsLoadingLocations(geography.isLoading)
    if (geography.selectedCityId) {
      setFormData((prev) => (
        prev.location === geography.selectedCityId ? prev : { ...prev, location: geography.selectedCityId }
      ))
    }
  }, [geography.hasStates, geography.selectedStateId, geography.cities, geography.allCities, geography.isLoading, geography.selectedCityId])
  const [categories, setCategories] = useState<any[]>([])
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([])
  const [durationOptions, setDurationOptions] =
    useState<Array<{ id: string; name: string; code?: string }>>(DEFAULT_DURATION_OPTIONS)
  const [studentLevelOptions, setStudentLevelOptions] = useState<{ value: string; label: string }[]>([])
  const [batchOptions, setBatchOptions] = useState<BatchOption[]>([])
  const [isLoadingBatches, setIsLoadingBatches] = useState(false)
  const [nextRenewalAmount, setNextRenewalAmount] = useState<number | null>(null)
  const [renewalLoading, setRenewalLoading] = useState(false)

  const { toast } = useToast()

  // API Loading states
  const [isLoadingLocations, setIsLoadingLocations] = useState(true)
  const [isLoadingBranches, setIsLoadingBranches] = useState(true)
  const [isLoadingCourses, setIsLoadingCourses] = useState(true)
  const [isLoadingCategories, setIsLoadingCategories] = useState(true)

  // Form state
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [enrollmentStartDate, setEnrollmentStartDate] = useState<Date>()
  const [enrollmentEndDate, setEnrollmentEndDate] = useState<Date>()
  
  const [formData, setFormData] = useState({
    // Personal Information
    firstName: "",
    lastName: "",
    email: "",
    contactNumber: "",
    countryCode: "+91",
    gender: "",
    dob: "",
    password: "",
    biometricId: "",
    
    // Address Information
    address: "",
    area: "",
    city: "",
    state: "",
    zipCode: "",
    country: "India",
    
    // Professional Details
    location: "",
    branch: "",
    category: "",
    course: "",
    duration: "",
    batch: "",
    
    // Emergency Contact
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContactRelation: "",
    studentLevel: "",
  })

  useEffect(() => {
    if (!isSuperAdmin) return
    const run = async () => {
      try {
        const token = TokenManager.getToken()
        const opts = await dropdownAPI.getCategoryOptions("student_levels", token || undefined)
        setStudentLevelOptions(
          (opts || [])
            .filter((o: { is_active?: boolean }) => o.is_active !== false)
            .map((o: { value: string; label: string }) => ({ value: o.value, label: o.label }))
        )
      } catch {
        setStudentLevelOptions(
          dropdownAPI.getDefaultOptions("student_levels").map((o) => ({ value: o.value, label: o.label }))
        )
      }
    }
    run()
  }, [isSuperAdmin])

  // Fetch student, branches and courses data
  useEffect(() => {
    const fetchData = async () => {
      if (!access_token || !studentId) return

      setIsLoading(true)
      try {
        const token = TokenManager.getToken()
        if (!token) throw new Error("Authentication token not found.")

        // Fetch student data
        const studentResponse = await fetch(getBackendApiUrl(`users/${studentId}`), {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (!studentResponse.ok) {
          if (studentResponse.status === 404) {
            throw new Error("Student not found")
          }
          throw new Error(`Failed to fetch student data: ${studentResponse.status}`)
        }
        const studentResponseData = await studentResponse.json()
        const studentData = studentResponseData.user || studentResponseData
        const enrollmentList: any[] = Array.isArray(studentResponseData.enrollments)
          ? studentResponseData.enrollments
          : []
        const primaryEnrollment =
          enrollmentList.find((e) => e && e.is_active !== false) || enrollmentList[0] || null

        // Load courses, categories, durations (locations come from geography master)
        const [coursesData, categoriesData, durationsRaw] = await Promise.all([
          (async () => {
            try {
              setIsLoadingCourses(true)
              const coursesResponse = await fetch(getBackendApiUrl('courses/public/all'))
              if (coursesResponse.ok) {
                const coursesData = await coursesResponse.json()
                const allCourses = coursesData.courses || []
                setCourses(allCourses)
                setFilteredCourses(allCourses)
                return allCourses
              }
              return []
            } catch (error) {
              console.error('Error loading courses:', error)
              return []
            } finally {
              setIsLoadingCourses(false)
            }
          })(),

          (async () => {
            try {
              setIsLoadingCategories(true)
              const categoriesResponse = await fetch(getBackendApiUrl('categories/public/details?active_only=true'))
              if (categoriesResponse.ok) {
                const categoriesData = await categoriesResponse.json()
                const categories = categoriesData.categories || []
                setCategories(categories)
                return categories
              }
              return []
            } catch (error) {
              console.error('Error loading categories:', error)
              return []
            } finally {
              setIsLoadingCategories(false)
            }
          })(),

          (async () => {
            try {
              const durRes = await fetch(getBackendApiUrl('durations/public/all'))
              if (!durRes.ok) return []
              const dj = await durRes.json()
              const list = dj.durations || []
              return list.map((d: { id: string; name: string; code?: string }) => ({
                id: d.id,
                name: d.name,
                code: d.code,
              }))
            } catch {
              return []
            }
          })(),
        ])

        const durationList =
          durationsRaw.length > 0 ? durationsRaw : DEFAULT_DURATION_OPTIONS
        setDurationOptions(durationList)

        const findOptionByIdentifier = (
          options: any[],
          identifier: string,
          searchFields: string[] = ['name', 'code', 'title']
        ) => {
          if (!identifier || !options.length) return ""
          const exactMatch = options.find((option) => option.id === identifier)
          if (exactMatch) return exactMatch.id
          const fieldMatch = options.find((option) =>
            searchFields.some((field) => option[field]?.toLowerCase() === identifier.toLowerCase())
          )
          if (fieldMatch) return fieldMatch.id
          const partialMatch = options.find((option) =>
            searchFields.some(
              (field) =>
                option[field]?.toLowerCase().includes(identifier.toLowerCase()) ||
                identifier.toLowerCase().includes(option[field]?.toLowerCase())
            )
          )
          return partialMatch ? partialMatch.id : ""
        }

        let branchId =
          studentData.branch?.branch_id ||
          studentData.branch_id ||
          primaryEnrollment?.branch_id ||
          ""
        let locationId =
          studentData.branch?.location_id ||
          studentData.location_id ||
          ""

        if (branchId && !locationId) {
          try {
            let brRes = await fetch(getBackendApiUrl(`branches/${encodeURIComponent(branchId)}`), {
              headers: { Authorization: `Bearer ${token}` },
            })
            if (!brRes.ok) {
              brRes = await fetch(getBackendApiUrl(`branches/public/${encodeURIComponent(branchId)}`))
            }
            if (brRes.ok) {
              const bj = await brRes.json()
              locationId = bj.location_id || locationId
            }
          } catch {
            /* ignore */
          }
        }
        setLocationSeed(locationId)

        let branchesForLocation: Branch[] = []
        if (locationId) {
          try {
            setIsLoadingBranches(true)
            const brRes = await fetch(
              getBackendApiUrl(`branches/public/by-location/${encodeURIComponent(locationId)}?active_only=true`)
            )
            if (brRes.ok) {
              const bd = await brRes.json()
              branchesForLocation = bd.branches || []
            }
            if (branchesForLocation.length === 0 && branchId) {
              let oneRes = await fetch(getBackendApiUrl(`branches/${encodeURIComponent(branchId)}`), {
                headers: { Authorization: `Bearer ${token}` },
              })
              if (!oneRes.ok) {
                oneRes = await fetch(getBackendApiUrl(`branches/public/${encodeURIComponent(branchId)}`))
              }
              if (oneRes.ok) {
                const b = await oneRes.json()
                const addr = b.branch?.address || {}
                branchesForLocation = [
                  {
                    id: b.id || branchId,
                    name: b.branch?.name || b.name || "Branch",
                    code: b.branch?.code,
                    address: {
                      area: addr.area,
                      city: addr.city,
                      state: addr.state,
                    },
                  },
                ]
              }
            }
            setBranches(branchesForLocation)
          } catch {
            setBranches([])
          } finally {
            setIsLoadingBranches(false)
          }
        } else {
          setIsLoadingBranches(false)
          setBranches([])
        }

        const courseId =
          studentData.course?.course_id ||
          studentData.course_id ||
          primaryEnrollment?.course_id ||
          ""
        const categoryId =
          studentData.course?.category_id ||
          studentData.course_category_id ||
          primaryEnrollment?.course_details?.category_id ||
          ""
        const durationRaw =
          studentData.course?.duration ||
          studentData.course_duration ||
          primaryEnrollment?.duration_id ||
          ""
        const batchRaw =
          studentData.course?.batch_ref ||
          primaryEnrollment?.batch_ref ||
          ""

        const branchSelectValue =
          branchId && branchesForLocation.some((b) => b.id === branchId)
            ? branchId
            : findOptionByIdentifier(branchesForLocation, branchId, ['name', 'code'])

        const mappedFormData = {
          firstName: studentData.first_name || "",
          lastName: studentData.last_name || "",
          email: studentData.email || "",
          contactNumber: studentData.phone?.replace(studentData.country_code, "") || "",
          countryCode: studentData.country_code || "+91",
          gender: studentData.gender || "",
          dob: studentData.date_of_birth ? format(new Date(studentData.date_of_birth), "yyyy-MM-dd") : "",
          password: "",
          biometricId: studentData.biometric_id || "",
          address: studentData.address?.line1 || "",
          area: studentData.address?.area || "",
          city: studentData.address?.city || "",
          state: studentData.address?.state || "",
          zipCode: studentData.address?.pincode || "",
          country: studentData.address?.country || "India",
          location: locationId,
          branch: branchSelectValue || branchId,
          category: findOptionByIdentifier(categoriesData, categoryId),
          course: findOptionByIdentifier(coursesData, courseId, ['title', 'code', 'name']),
          duration: resolveDurationSelectValue(durationRaw, durationList),
          batch: batchRaw || "",
          emergencyContactName: studentData.emergency_contact?.name || "",
          emergencyContactPhone: studentData.emergency_contact?.phone || "",
          emergencyContactRelation: studentData.emergency_contact?.relationship || "",
          studentLevel: (studentData as { student_level?: string }).student_level || "",
        }

        setFormData(mappedFormData)

        if (studentData.date_of_birth) {
          setSelectedDate(new Date(studentData.date_of_birth))
        }

        if (primaryEnrollment?.start_date) {
          const sd = new Date(primaryEnrollment.start_date)
          if (!isNaN(sd.getTime())) setEnrollmentStartDate(sd)
        }
        if (primaryEnrollment?.end_date) {
          const ed = new Date(primaryEnrollment.end_date)
          if (!isNaN(ed.getTime())) setEnrollmentEndDate(ed)
        }

      } catch (error) {
        console.error('Error loading data:', error)
        setErrors({ submit: error instanceof Error ? error.message : 'Failed to load data.' })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [access_token, studentId])

  // Filter courses based on selected category
  useEffect(() => {
    if (formData.category) {
      const filtered = courses.filter(course => 
        course.category_id === formData.category || 
        course.category_name?.toLowerCase().includes(formData.category.toLowerCase())
      )
      setFilteredCourses(filtered)
    } else {
      setFilteredCourses(courses)
    }
  }, [formData.category, courses])

  // Load branches when location changes
  useEffect(() => {
    const loadBranchesForLocation = async () => {
      if (!formData.location) {
        setBranches([])
        return
      }

      try {
        setIsLoadingBranches(true)
        const response = await fetch(getBackendApiUrl(`branches/public/by-location/${formData.location}?active_only=true`))

        if (response.ok) {
          const data = await response.json()
          setBranches(data.branches || [])
        } else {
          console.error('Failed to load branches for location:', response.statusText)
          setBranches([])
          toast({
            title: "Warning",
            description: "Failed to load branches for selected location.",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error('Error loading branches for location:', error)
        setBranches([])
        toast({
          title: "Error",
          description: "Failed to load branches. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoadingBranches(false)
      }
    }

    loadBranchesForLocation()
  }, [formData.location])

  // Clear branch selection when location changes
  useEffect(() => {
    if (formData.branch && formData.location) {
      // Check if current branch is still valid for the selected location
      const branchExists = branches.find(branch => branch.id === formData.branch)
      if (!branchExists) {
        setFormData(prev => ({ ...prev, branch: "" }))
      }
    }
  }, [branches, formData.branch, formData.location])

  // Load batch options when branch + course are selected
  useEffect(() => {
    const loadBatches = async () => {
      if (!formData.branch || !formData.course) {
        setBatchOptions([])
        return
      }

      setIsLoadingBatches(true)
      try {
        const token = TokenManager.getToken()
        const res = await fetch(getBackendApiUrl(`branches/${encodeURIComponent(formData.branch)}`), {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (!res.ok) {
          setBatchOptions([])
          return
        }
        const branchData = await res.json()
        const schedule = branchData?.assignments?.course_schedule || []
        const entry = schedule.find(
          (row: { course_id?: string }) => String(row?.course_id || "") === String(formData.course)
        )
        const batches = Array.isArray(entry?.batches) ? entry.batches : []
        const options: BatchOption[] = batches.map((b: Record<string, unknown>, i: number) => {
          const batchRef = String(b.batch_id || b.id || `__index:${i}__`).trim()
          const days = Array.isArray(b.days) ? (b.days as string[]).join(", ") : ""
          const st = String(b.start_time || b.startTime || "").trim()
          const et = String(b.end_time || b.endTime || "").trim()
          const bname = String(b.batch_name || b.name || "").trim()
          const timePart = st && et ? `${st} – ${et}` : st || et
          const label = [bname, days, timePart].filter(Boolean).join(" · ") || `Batch ${i + 1}`
          return { batch_ref: batchRef, label, name: bname || null }
        })
        setBatchOptions(options)
        if (options.length === 1 && !formData.batch) {
          setFormData((prev) => ({ ...prev, batch: options[0].batch_ref }))
        } else if (
          formData.batch &&
          options.length > 0 &&
          !options.some((o) => o.batch_ref === formData.batch)
        ) {
          setFormData((prev) => ({ ...prev, batch: "" }))
        }
      } catch {
        setBatchOptions([])
      } finally {
        setIsLoadingBatches(false)
      }
    }

    void loadBatches()
  }, [formData.branch, formData.course])

  // Quote next renewal amount from batch-aware pricing
  useEffect(() => {
    const quoteRenewal = async () => {
      if (!formData.branch || !formData.course || !formData.duration) {
        setNextRenewalAmount(null)
        return
      }
      setRenewalLoading(true)
      try {
        const info = await paymentAPI.getCoursePaymentInfo(
          formData.course,
          formData.branch,
          formData.duration,
          formData.batch || undefined
        )
        const fee = Number(info?.pricing?.course_fee ?? info?.pricing?.total_amount)
        setNextRenewalAmount(Number.isFinite(fee) ? fee : null)
      } catch {
        setNextRenewalAmount(null)
      } finally {
        setRenewalLoading(false)
      }
    }
    void quoteRenewal()
  }, [formData.branch, formData.course, formData.duration, formData.batch])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value }
      if (field === "branch" || field === "course") {
        next.batch = ""
      }
      return next
    })
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }))
    }
  }

  const handleDateChange = (field: string, date: Date | undefined) => {
    if (date) {
      const formattedDate = format(date, "yyyy-MM-dd")
      handleInputChange(field, formattedDate)
      if (field === "dob") setSelectedDate(date)
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
    if (!formData.location) newErrors.location = "Location is required"
    if (!formData.branch) newErrors.branch = "Branch is required"
    if (!formData.course) newErrors.course = "Course is required"
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address"
    }
    if (formData.password && formData.password.length > 0 && formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters long"
    }
    if (formData.contactNumber && !/^[0-9]{10}$/.test(formData.contactNumber.replace(/\s+/g, ''))) {
      newErrors.contactNumber = "Please enter a valid 10-digit phone number"
    }
    if (enrollmentStartDate && enrollmentEndDate && enrollmentEndDate.getTime() < enrollmentStartDate.getTime()) {
      newErrors.enrollmentEnd = "End date must be on or after start date"
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      const token = TokenManager.getToken()
      if (!token) throw new Error("Authentication token not found.")

      const apiPayload = {
        email: formData.email,
        phone: `${formData.countryCode}${formData.contactNumber}`,
        first_name: formData.firstName,
        last_name: formData.lastName,
        date_of_birth: formData.dob || undefined,
        gender: formData.gender || undefined,
        biometric_id: formData.biometricId || undefined,
        ...(formData.password && { password: formData.password }),
        address: {
          line1: formData.address || "",
          area: formData.area || "",
          city: formData.city || "",
          state: formData.state || "",
          pincode: formData.zipCode || "",
          country: formData.country || "India"
        },
        emergency_contact: {
          name: formData.emergencyContactName || "",
          phone: formData.emergencyContactPhone || "",
          relationship: formData.emergencyContactRelation || ""
        },
        course: formData.course ? {
          category_id: formData.category || "martial-arts",
          course_id: formData.course,
          duration: formData.duration || "3-months",
          ...(formData.batch ? { batch_ref: formData.batch } : {}),
        } : undefined,
        branch: formData.branch ? {
          location_id: formData.location || "hyderabad",
          branch_id: formData.branch
        } : undefined,
        ...(isSuperAdmin ? { student_level: formData.studentLevel || null } : {}),
        ...(enrollmentStartDate
          ? { enrollment_start_date: format(enrollmentStartDate, "yyyy-MM-dd") }
          : {}),
        ...(enrollmentEndDate ? { enrollment_end_date: format(enrollmentEndDate, "yyyy-MM-dd") } : {}),
      }

      const response = await fetch(getBackendApiUrl(`users/${studentId}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(apiPayload),
      })
      
      if (response.ok) {
        setShowSuccessPopup(true)
      } else {
        const errorData = await response.json()
        setErrors({ submit: errorData.message || 'Failed to update student.' })
      }
    } catch (error) {
      console.error('Error updating student:', error)
      setErrors({ submit: 'Network error. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSuccessOk = () => {
    setShowSuccessPopup(false)
    router.push(studentsListUrl)
  }

  return (
    <div className="min-h-screen bg-gray-50">

      <main className="w-full mx-auto p-4 sm:p-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 text-[#4F5077]">
          <div className="mb-4 sm:mb-0">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Edit Student</h1>
            <p className="text-[#7D8592] text-sm sm:text-base">Update the details for the student.</p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push(studentsListUrl)}
            className="flex items-center space-x-2 px-4 py-2 border-gray-300 hover:bg-gray-50"
          >
            <span>← Back to Students</span>
          </Button>
        </div>

        {isLoading ? (
          <div className="bg-white rounded-2xl shadow-sm border p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading student data...</p>
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
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[#4D5077] border-b border-gray-200 pb-2">Personal Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 text-[#7F8592]">
                    
                    <div>
                      <Label className="block text-sm font-medium mb-2">First Name <span className="text-red-500">*</span></Label>
                      <div className="relative">
                        <UserIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                          placeholder="Enter first name"
                          value={formData.firstName}
                          onChange={(e) => handleInputChange("firstName", e.target.value)}
                          className={cn("pl-12 py-4 text-base bg-gray-50 border-gray-200 rounded-xl h-14", errors.firstName && "border-red-500 bg-red-50")}
                        />
                        {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
                      </div>
                    </div>

                    <div>
                      <Label className="block text-sm font-medium mb-2">Last Name <span className="text-red-500">*</span></Label>
                      <div className="relative">
                        <UserIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                          placeholder="Enter last name"
                          value={formData.lastName}
                          onChange={(e) => handleInputChange("lastName", e.target.value)}
                          className={cn("pl-12 py-4 text-base bg-gray-50 border-gray-200 rounded-xl h-14", errors.lastName && "border-red-500 bg-red-50")}
                        />
                        {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
                      </div>
                    </div>

                    <div>
                      <Label className="block text-sm font-medium mb-2">Email Address <span className="text-red-500">*</span></Label>
                      <div className="relative">
                        <MailIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                          type="email"
                          placeholder="Enter email address"
                          value={formData.email}
                          onChange={(e) => handleInputChange("email", e.target.value)}
                          className={cn("pl-12 py-4 text-base bg-gray-50 border-gray-200 rounded-xl h-14", errors.email && "border-red-500 bg-red-50")}
                        />
                        {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                      </div>
                    </div>

                    <div>
                      <Label className="block text-sm font-medium mb-2">Mobile Number <span className="text-red-500">*</span></Label>
                      <div className="relative">
                        <PhoneIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                          placeholder="Enter mobile number"
                          value={formData.contactNumber}
                          onChange={(e) => handleInputChange("contactNumber", e.target.value)}
                          className={cn("pl-12 py-4 text-base bg-gray-50 border-gray-200 rounded-xl h-14", errors.contactNumber && "border-red-500 bg-red-50")}
                        />
                        {errors.contactNumber && <p className="text-red-500 text-sm mt-1">{errors.contactNumber}</p>}
                      </div>
                    </div>

                    <div>
                      <Label className="block text-sm font-medium mb-2">Gender <span className="text-red-500">*</span></Label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 pointer-events-none">
                          <UserIcon className="w-5 h-5 text-gray-400" />
                        </div>
                        <Select value={formData.gender} onValueChange={(value) => handleInputChange("gender", value)}>
                          <SelectTrigger className={cn("!w-full !h-14 !pl-12 !text-base !bg-gray-50 !border-gray-200 !rounded-xl", errors.gender && "!border-red-500 !bg-red-50")}>
                            <SelectValue placeholder="Select Gender" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        {errors.gender && <p className="text-red-500 text-sm mt-1">{errors.gender}</p>}
                      </div>
                    </div>

                    {isSuperAdmin && (
                      <div>
                        <Label className="block text-sm font-medium mb-2">Student level</Label>
                        <Select
                          value={formData.studentLevel || undefined}
                          onValueChange={(value) => handleInputChange("studentLevel", value)}
                        >
                          <SelectTrigger
                            className={cn(
                              "!w-full !h-14 !text-base !bg-gray-50 !border-gray-200 !rounded-xl"
                            )}
                          >
                            <SelectValue placeholder="Select student level" />
                          </SelectTrigger>
                          <SelectContent>
                            {studentLevelOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div>
                      <Label className="block text-sm font-medium mb-2">Date of Birth <span className="text-red-500">*</span></Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn("w-full relative h-14 justify-start text-left font-normal pl-12 text-base bg-gray]-50 border-gray-200 rounded-xl", !selectedDate && "text-gray-500", errors.dob && "border-red-500 bg-red-50")}
                          >
                            <CalendarIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            {selectedDate ? format(selectedDate, "MMM dd, yyyy") : "Select date of birth"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={(date) => handleDateChange("dob", date)}
                            initialFocus
                            disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                          />
                        </PopoverContent>
                      </Popover>
                      {errors.dob && <p className="text-red-500 text-sm mt-1">{errors.dob}</p>}
                    </div>

                    <div>
                      <Label className="block text-sm font-medium mb-2">New Password</Label>
                      <div className="relative">
                        <UserIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <PasswordInput
                          placeholder="Leave blank to keep current"
                          value={formData.password}
                          onChange={(e) => handleInputChange("password", e.target.value)}
                          className={cn("pl-12 py-4 text-base bg-gray-50 border-gray-200 rounded-xl h-14", errors.password && "border-red-500 bg-red-50")}
                        />
                        {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
                      </div>
                    </div>

                    <div>
                      <Label className="block text-sm font-medium mb-2">Biometric ID</Label>
                      <div className="relative">
                        <UserIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                          placeholder="Enter biometric ID"
                          value={formData.biometricId}
                          onChange={(e) => handleInputChange("biometricId", e.target.value)}
                          className="pl-12 py-4 text-base bg-gray-50 border-gray-200 rounded-xl h-14"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[#4D5077] border-t border-gray-200 pt-2">Course Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 text-[#7F8592]">
                    <div>
                      <Label className="block text-sm font-medium mb-2">Category</Label>
                      <Select value={formData.category} onValueChange={(value) => handleInputChange("category", value)}>
                        <SelectTrigger className="!w-full !h-14 !pl-12 !text-base !bg-gray-50 !border-gray-200 !rounded-xl">
                          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 pointer-events-none">
                            <FolderIcon className="w-5 h-5 text-gray-400" />
                          </div>
                          <SelectValue placeholder="Select Category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="block text-sm font-medium mb-2">Course <span className="text-red-500">*</span></Label>
                      <Select value={formData.course} onValueChange={(value) => handleInputChange("course", value)}>
                        <SelectTrigger className={cn("!w-full !h-14 !pl-12 !text-base !bg-gray-50 !border-gray-200 !rounded-xl", errors.course && "!border-red-500 !bg-red-50")}>
                          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 pointer-events-none">
                            <BookOpenIcon className="w-5 h-5 text-gray-400" />
                          </div>
                          <SelectValue placeholder="Choose Course" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredCourses.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {errors.course && <p className="text-red-500 text-sm mt-1">{errors.course}</p>}
                    </div>

                    <div>
                      <Label className="block text-sm font-medium mb-2">Duration</Label>
                      <Select value={formData.duration} onValueChange={(value) => handleInputChange("duration", value)}>
                        <SelectTrigger className="!w-full !h-14 !pl-12 !text-base !bg-gray-50 !border-gray-200 !rounded-xl">
                          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 pointer-events-none">
                            <ClockIcon className="w-5 h-5 text-gray-400" />
                          </div>
                          <SelectValue placeholder="Select Duration" />
                        </SelectTrigger>
                        <SelectContent>
                          {durationOptions.map((d) => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="block text-sm font-medium mb-2">Enrollment start</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full relative h-14 justify-start text-left font-normal pl-12 text-base bg-gray-50 border-gray-200 rounded-xl",
                              !enrollmentStartDate && "text-gray-500"
                            )}
                          >
                            <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            {enrollmentStartDate
                              ? format(enrollmentStartDate, "MMM dd, yyyy")
                              : "Select start date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={enrollmentStartDate}
                            onSelect={setEnrollmentStartDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div>
                      <Label className="block text-sm font-medium mb-2">Enrollment end</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full relative h-14 justify-start text-left font-normal pl-12 text-base bg-gray-50 border-gray-200 rounded-xl",
                              !enrollmentEndDate && "text-gray-500",
                              errors.enrollmentEnd && "border-red-500 bg-red-50"
                            )}
                          >
                            <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            {enrollmentEndDate
                              ? format(enrollmentEndDate, "MMM dd, yyyy")
                              : "Select end date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={enrollmentEndDate}
                            onSelect={(d) => {
                              setEnrollmentEndDate(d)
                              if (errors.enrollmentEnd) setErrors((prev) => ({ ...prev, enrollmentEnd: "" }))
                            }}
                            initialFocus
                            disabled={
                              enrollmentStartDate
                                ? (date) => date < enrollmentStartDate
                                : undefined
                            }
                          />
                        </PopoverContent>
                      </Popover>
                      {errors.enrollmentEnd && (
                        <p className="text-red-500 text-sm mt-1">{errors.enrollmentEnd}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[#4D5077] border-b border-gray-200 pb-2">Location Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-[#7F8592]">
                    {geography.hasStates && (
                    <div>
                      <Label className="block text-sm font-medium mb-2">State <span className="text-red-500">*</span></Label>
                      <Select
                        value={geography.selectedStateId}
                        onValueChange={(value) => {
                          geography.setSelectedStateId(value)
                          handleInputChange("location", "")
                          handleInputChange("branch", "")
                        }}
                        disabled={isLoadingLocations}
                      >
                        <SelectTrigger className="!w-full !h-14 !pl-4 !text-base !bg-gray-50 !border-gray-200 !rounded-xl">
                          <SelectValue placeholder={isLoadingLocations ? "Loading locations..." : "Select State"} />
                        </SelectTrigger>
                        <SelectContent>
                          {geography.states.map((state) => (
                            <SelectItem key={state.id} value={state.id}>{state.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    )}
                    <div>
                      <Label className="block text-sm font-medium mb-2">Location <span className="text-red-500">*</span></Label>
                      <Select
                        value={formData.location}
                        onValueChange={(value) => {
                          geography.setSelectedCityId(value)
                          handleInputChange("location", value)
                        }}
                        disabled={isLoadingLocations || (geography.hasStates && !geography.selectedStateId)}
                      >
                        <SelectTrigger className={cn(
                          "!w-full !h-14 !pl-12 !text-base !bg-gray-50 !border-gray-200 !rounded-xl",
                          errors.location && "!border-red-500 !bg-red-50"
                        )}>
                          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 pointer-events-none">
                            <MapPinIcon className="w-5 h-5 text-gray-400" />
                          </div>
                          <SelectValue placeholder={isLoadingLocations ? "Loading locations..." : "Select Location"} />
                        </SelectTrigger>
                        <SelectContent>
                          {locations.length > 0 ? (
                            locations.map((location) => (
                              <SelectItem key={location.id} value={location.id}>
                                {location.name}
                              </SelectItem>
                            ))
                          ) : (
                            <div className="p-4 text-center text-gray-500">
                              <p className="text-sm">No locations available</p>
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                      {errors.location && <p className="text-red-500 text-sm mt-1">{errors.location}</p>}
                    </div>

                    <div>
                      <Label className="block text-sm font-medium mb-2">Branch <span className="text-red-500">*</span></Label>
                      <Select
                        value={formData.branch}
                        onValueChange={(value) => handleInputChange("branch", value)}
                        disabled={!formData.location || isLoadingBranches}
                      >
                        <SelectTrigger className={cn(
                          "!w-full !h-14 !pl-12 !text-base !bg-gray-50 !border-gray-200 !rounded-xl",
                          errors.branch && "!border-red-500 !bg-red-50",
                          (!formData.location || isLoadingBranches) && "opacity-50 cursor-not-allowed"
                        )}>
                          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 pointer-events-none">
                            <Building2Icon className="w-5 h-5 text-gray-400" />
                          </div>
                          <SelectValue placeholder={
                            isLoadingBranches
                              ? "Loading branches..."
                              : !formData.location
                                ? "Select location first"
                                : "Select Branch"
                          } />
                        </SelectTrigger>
                        <SelectContent>
                          {branches.length > 0 ? (
                            branches.map((branch) => (
                              <SelectItem key={branch.id} value={branch.id}>
                                <div className="flex flex-col">
                                  <span className="font-medium">{branch.name}</span>
                                  <span className="text-xs text-gray-500">
                                    {typeof branch.address === "object" && branch.address?.area?.trim()
                                      ? branch.address.area.trim()
                                      : typeof branch.address === "object"
                                        ? [branch.address?.city, branch.address?.state].filter(Boolean).join(", ")
                                        : ""}
                                  </span>
                                </div>
                              </SelectItem>
                            ))
                          ) : (
                            <div className="p-4 text-center text-gray-500">
                              <p className="text-sm">
                                {!formData.location
                                  ? "Please select a location first"
                                  : isLoadingBranches
                                    ? "Loading branches..."
                                    : "No branches available for selected location"
                                }
                              </p>
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                      {errors.branch && <p className="text-red-500 text-sm mt-1">{errors.branch}</p>}
                    </div>

                    {formData.branch && formData.course && (
                      <div>
                        <Label className="block text-sm font-medium mb-2">Batch</Label>
                        <Select
                          value={formData.batch || undefined}
                          onValueChange={(value) => handleInputChange("batch", value)}
                          disabled={isLoadingBatches || batchOptions.length === 0}
                        >
                          <SelectTrigger className="!w-full !h-14 !pl-12 !text-base !bg-gray-50 !border-gray-200 !rounded-xl">
                            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 pointer-events-none">
                              <ClockIcon className="w-5 h-5 text-gray-400" />
                            </div>
                            <SelectValue
                              placeholder={
                                isLoadingBatches
                                  ? "Loading batches..."
                                  : batchOptions.length === 0
                                    ? "No batches at this branch"
                                    : "Select batch"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {batchOptions.map((b) => (
                              <SelectItem key={b.batch_ref} value={b.batch_ref}>
                                {b.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {formData.branch && !formData.course && (
                      <div className="md:col-span-2">
                        <p className="text-sm text-gray-500">
                          Select a course above to see available batches for this branch.
                        </p>
                      </div>
                    )}

                    {(nextRenewalAmount != null || renewalLoading) && formData.branch && (
                      <div className="md:col-span-2">
                        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                          <p className="text-sm font-medium text-blue-900">Next renewal amount</p>
                          <p className="text-lg font-semibold text-blue-800 mt-1">
                            {renewalLoading
                              ? "Calculating..."
                              : paymentAPI.formatCurrency(nextRenewalAmount ?? 0)}
                          </p>
                          <p className="text-xs text-blue-700 mt-1">
                            Based on selected batch and duration (course fee only — no admission on renewal).
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-200">
                <div className="flex flex-col sm:flex-row gap-4 justify-center sm:justify-start">
                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full sm:w-auto h-12 bg-yellow-400 hover:bg-yellow-500 text-white font-semibold px-8 rounded-xl"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black mr-3"></div>
                        Updating Student...
                      </div>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => router.push(studentsListUrl)}
                    disabled={isSubmitting}
                    className="w-full sm:w-auto h-12 px-8 rounded-xl font-medium border-gray-300"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </form>
          </div>
        )}
      </main>

      {showSuccessPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Student Updated!</h3>
              <p className="text-gray-600 mb-8 text-lg">The student details have been successfully updated.</p>
              <Button 
                onClick={handleSuccessOk} 
                className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold px-8 py-3 rounded-xl"
              >
                OK
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
