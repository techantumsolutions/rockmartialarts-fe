"use client"

import { getBackendApiUrl } from "@/lib/config"
import { useState, useEffect, useRef } from "react"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { TimePicker24 } from "@/components/ui/time-picker-24"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Building, MapPin, Clock, Users, CreditCard, X, Plus, Trash2, Calendar } from "lucide-react"
import { useRouter } from "next/navigation"
import { useDashboardBasePath } from "@/lib/useDashboardBasePath"
import { TokenManager } from "@/lib/tokenManager"
import { useToast } from "@/hooks/use-toast"
import { dropdownAPI, DropdownOption } from "@/lib/dropdownAPI"
import { useGeographyDropdowns } from "@/hooks/use-geography-dropdowns"
import { WEEKDAY_CHECKLIST_ORDER, formatWeekdayRanges } from "@/lib/formatWeekdayRanges"
import { buildCourseSchedulePayload, BATCH_COACH_UNASSIGNED } from "@/lib/branchCourseSchedule"
import {
  DashboardFormPageHeader,
  DashboardSectionHeading,
  cardContentClass,
  dashboardFormCardClass,
  primaryButtonClass,
} from "@/components/dashboard/dashboardFormStyles"

// Interfaces for form data
interface Course {
  id: string
  title: string
  code: string
  description: string
  difficulty_level: string
  category_id: string
  pricing: {
    currency: string
    amount: number
  }
  student_requirements: {
    max_students: number
    min_age: number
    max_age: number
    prerequisites: string[]
  }
  offers_certification: boolean
  media_resources: {
    course_image_url: string
    promo_video_url: string
  }
  created_at: string
}

interface Category {
  id: string
  name: string
  code: string
  parent_category_id?: string
  subcategories?: Category[]
}

/** Courses belong to a top-level category; include legacy rows where category_id is a sub-category id. */
function filterCoursesForParentCategory(
  allCourses: Course[],
  parentCategoryId: string,
  allCategories: Category[]
): Course[] {
  if (!parentCategoryId) return allCourses
  const parent = allCategories.find((c) => c.id === parentCategoryId)
  const subIds = new Set((parent?.subcategories || []).map((s) => s.id))
  return allCourses.filter(
    (course) =>
      course.category_id === parentCategoryId ||
      (!!course.category_id && subIds.has(course.category_id))
  )
}

/** Only categories that have at least one assignable course (keeps Rock masters out of empty partner orgs). */
function categoriesForAssignableCourses(
  allCategories: Category[],
  assignableCourses: Course[]
): Category[] {
  if (!assignableCourses.length) return []
  const courseCatIds = new Set(
    assignableCourses.map((c) => c.category_id).filter(Boolean)
  )
  return allCategories.filter((parent) => {
    if (parent.parent_category_id) return false
    if (courseCatIds.has(parent.id)) return true
    const subIds = parent.subcategories || []
    return subIds.some((s) => courseCatIds.has(s.id))
  })
}

interface CourseBatch {
  id: string
  start_time: string
  end_time: string
  coach_id: string
  days: string[]
  batch_name?: string
  batch_fee?: string
  fee_per_duration?: Record<string, string>
  pricing_type_per_duration?: Record<string, string>
  max_students?: string | number
}

interface SelectedCourse {
  course_id: string
  is_available?: boolean
  batches: CourseBatch[]
}

interface Address {
  line1: string
  area: string
  city: string
  state: string
  pincode: string
  country: string
}

interface BranchInfo {
  name: string
  code: string
  email: string
  phone: string
  address: Address
}

interface Timing {
  day: string
  open: string
  close: string
}

interface OperationalDetails {
  timings: Timing[]
  holidays: string[]
}

interface Assignments {
  accessories_available: boolean
  courses: SelectedCourse[]
  branch_admins: string[]
}

interface BankDetails {
  bank_name: string
  account_number: string
  upi_id: string
}

interface FormData {
  branch: BranchInfo
  location_id: string
  manager_id: string
  operational_details: OperationalDetails
  assignments: Assignments
  bank_details: BankDetails
  admission_fee: number
  /** M21 — collaboration partner branch (default No) */
  is_collaboration_partner?: boolean
}

type CreateBranchPageProps = {
  /** When true, creates a collaboration partner branch and returns to Partner Profiles. */
  asPartner?: boolean
}

type OperatingTimePickerProps = {
  label: string
  value: string
  onChange: (value: string) => void
}

function OperatingTimePicker({ label, value, onChange }: OperatingTimePickerProps) {
  const [open, setOpen] = useState(false)
  const selectedHourRef = useRef<HTMLButtonElement>(null)
  const selectedMinuteRef = useRef<HTMLButtonElement>(null)
  const [hour = "00", minute = "00"] = value.split(":")
  const hours = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"))
  const minutes = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0"))

  useEffect(() => {
    if (open) {
      selectedHourRef.current?.scrollIntoView({ block: "center" })
      selectedMinuteRef.current?.scrollIntoView({ block: "center" })
    }
  }, [open])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${label}: ${hour}:${minute}`}
          aria-haspopup="dialog"
          aria-expanded={open}
          className="flex h-9 min-w-0 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-left text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <span>{hour}:{minute}</span>
          <Clock className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={2}
        className="w-[9.5rem] p-1"
        aria-label={`${label} time`}
      >
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1">
          <div className="max-h-52 overflow-y-auto overscroll-contain">
            {hours.map((option) => (
              <button
                key={option}
                ref={option === hour ? selectedHourRef : undefined}
                type="button"
                aria-pressed={option === hour}
                onClick={() => onChange(`${option}:${minute}`)}
                className={`flex h-9 w-full items-center justify-center rounded-sm text-sm ${option === hour ? "bg-blue-600 font-medium text-white" : "hover:bg-accent"
                  }`}
              >
                {option}
              </button>
            ))}
          </div>
          <span aria-hidden="true" className="text-muted-foreground">:</span>
          <div className="max-h-52 overflow-y-auto overscroll-contain">
            {minutes.map((option) => (
              <button
                key={option}
                ref={option === minute ? selectedMinuteRef : undefined}
                type="button"
                aria-pressed={option === minute}
                onClick={() => onChange(`${hour}:${option}`)}
                className={`flex h-9 w-full items-center justify-center rounded-sm text-sm ${option === minute ? "bg-blue-600 font-medium text-white" : "hover:bg-accent"
                  }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default function CreateBranchPage({ asPartner = false }: CreateBranchPageProps) {
  const router = useRouter()
  const basePath = useDashboardBasePath()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const listPath = asPartner ? `${basePath}/partner-profiles` : `${basePath}/branches`

  // API data state
  const [courses, setCourses] = useState<Course[]>([])
  const [isLoadingCourses, setIsLoadingCourses] = useState(true)
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(true)
  const [branchManagers, setBranchManagers] = useState<{ id: string; name: string }[]>([])
  const [masterDurations, setMasterDurations] = useState<{ id: string; name: string; code: string; duration_months: number }[]>([])
  const [isLoadingBranchManagers, setIsLoadingBranchManagers] = useState(true)
  const [trainers, setTrainers] = useState<{ id: string; name: string }[]>([])
  const [isLoadingTrainers, setIsLoadingTrainers] = useState(true)
  const geography = useGeographyDropdowns()
  const [countries, setCountries] = useState<DropdownOption[]>([])
  const [isLoadingCountries, setIsLoadingCountries] = useState(true)
  const [banks, setBanks] = useState<DropdownOption[]>([])
  const [isLoadingBanks, setIsLoadingBanks] = useState(true)

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("")
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([])

  // State for new timing form
  const [newTiming, setNewTiming] = useState({
    day: "",
    open: "07:00",
    close: "19:00"
  })

  const [formData, setFormData] = useState<FormData>({
    branch: {
      name: "",
      code: "",
      email: "",
      phone: "",
      address: {
        line1: "",
        area: "",
        city: "",
        state: "",
        pincode: "",
        country: "India"
      }
    },
    location_id: "",
    manager_id: "",
    operational_details: {
      timings: [],
      holidays: []
    },
    assignments: {
      accessories_available: false,
      courses: [],
      branch_admins: []
    },
    bank_details: {
      bank_name: "",
      account_number: "",
      upi_id: ""
    },
    admission_fee: 0,
    is_collaboration_partner: false,
  })

  // Auto-generate branch code without wiping other form fields (courses/fees).
  const generateBranchCode = (branchName?: string, force = false) => {
    setFormData((prev) => {
      const trimmed = (branchName ?? prev.branch.name).trim()
      if (trimmed.length < 2) return prev
      if (prev.branch.code && !force) return prev
      const firstTwoLetters = trimmed.substring(0, 2).toUpperCase()
      const randomNumbers = Math.floor(Math.random() * 90 + 10)
      const code = `${firstTwoLetters}${randomNumbers}`
      return {
        ...prev,
        branch: { ...prev.branch, code },
      }
    })
  }

  // Branch admin cannot create branches — redirect to dashboard
  useEffect(() => {
    if (BranchManagerAuth.isAuthenticated()) {
      router.replace("/dashboard")
    }
  }, [router])

  // Auto-generate code when branch name changes
  useEffect(() => {
    if (formData.branch.name && !formData.branch.code) {
      generateBranchCode(formData.branch.name)
    }
  }, [formData.branch.name, formData.branch.code])

  // Load data from APIs
  useEffect(() => {
    const loadBranchManagers = async () => {
      try {
        setIsLoadingBranchManagers(true)
        const token = TokenManager.getToken()

        if (!token) {
          toast({
            title: "Authentication Required",
            description: "Please login to access this page.",
            variant: "destructive",
          })
          router.push("/login")
          setIsLoadingBranchManagers(false)
          return
        }

        const response = await fetch(
          getBackendApiUrl('branch-managers?active_only=true&limit=100'),
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        )

        if (response.ok) {
          const data = await response.json()
          const branchManagerOptions = (data.branch_managers || []).map((manager: any) => ({
            id: manager.id,
            name: manager.full_name || `${manager.personal_info?.first_name || ''} ${manager.personal_info?.last_name || ''}`.trim() || `${manager.first_name || ''} ${manager.last_name || ''}`.trim(),
            email: manager.email || manager.contact_info?.email || ''
          }))

          setBranchManagers(branchManagerOptions)
        } else {
          toast({
            title: "Error",
            description: "Failed to load branch managers.",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error('Error loading branch managers:', error)
      } finally {
        setIsLoadingBranchManagers(false)
      }
    }

    const loadTrainers = async () => {
      try {
        setIsLoadingTrainers(true)
        const token = TokenManager.getToken()
        const trainerRows: { id: string; name: string }[] = []
        let skip = 0
        while (skip < 1000) {
          const coachResponse = await fetch(
            getBackendApiUrl(`coaches?active_only=true&limit=100&skip=${skip}`),
            {
              headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                "Content-Type": "application/json",
              },
            }
          )
          if (!coachResponse.ok) break
          const coachData = await coachResponse.json()
          const page = Array.isArray(coachData.coaches) ? coachData.coaches : []
          for (const coach of page) {
            const name =
              coach.full_name ||
              `${coach.personal_info?.first_name || ""} ${coach.personal_info?.last_name || ""}`.trim() ||
              coach.contact_info?.email ||
              "Coach"
            if (coach.id) trainerRows.push({ id: String(coach.id), name })
          }
          if (page.length < 100) break
          skip += 100
        }
        setTrainers(trainerRows)
      } catch (error) {
        console.error("Error loading trainers:", error)
      } finally {
        setIsLoadingTrainers(false)
      }
    }


    const loadData = async () => {
      const token = TokenManager.getToken()
      const authHeaders = {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'Content-Type': 'application/json',
      }

      let loadedCourses: Course[] = []
      // Load courses via authenticated API so partner orgs only see their own courses
      try {
        setIsLoadingCourses(true)
        const coursesResponse = await fetch(
          getBackendApiUrl('courses?active_only=true&limit=500'),
          { headers: authHeaders }
        )
        if (coursesResponse.ok) {
          const coursesData = await coursesResponse.json()
          loadedCourses = coursesData.courses || []
          setCourses(loadedCourses)
          setFilteredCourses(loadedCourses)
        }
      } catch (error) {
        console.error('Error loading courses:', error)
      } finally {
        setIsLoadingCourses(false)
      }

      // Categories are Rock masters; for assignments only show ones that have assignable courses
      try {
        setIsLoadingCategories(true)
        const categoriesResponse = await fetch(
          getBackendApiUrl('categories?active_only=true&include_subcategories=true&limit=200'),
          { headers: authHeaders }
        )
        if (categoriesResponse.ok) {
          const categoriesData = await categoriesResponse.json()
          const allCats: Category[] = categoriesData.categories || []
          setCategories(categoriesForAssignableCourses(allCats, loadedCourses))
        }
      } catch (error) {
        console.error('Error loading categories:', error)
      } finally {
        setIsLoadingCategories(false)
      }

      await loadBranchManagers()
      await loadTrainers()
      await loadCountries()
      await loadBanks()
    }

    loadData()
  }, [])

  // Fetch master durations for per-duration pricing
  useEffect(() => {
    fetch(getBackendApiUrl("durations/public/all"))
      .then((res) => res.ok ? res.json() : { durations: [] })
      .then((data) => {
        setMasterDurations((data.durations || []).map((d: any) => ({
          id: d.id, name: d.name, code: d.code, duration_months: d.duration_months
        })))
      })
      .catch(() => { })
  }, [])

  const loadCountries = async () => {
    try {
      setIsLoadingCountries(true)
      const token = TokenManager.getToken()
      const countryOptions = await dropdownAPI.getCategoryOptions('countries', token || undefined)
      setCountries(countryOptions.filter(opt => opt.is_active))
    } catch (error) {
      console.error('Error loading countries:', error)
    } finally {
      setIsLoadingCountries(false)
    }
  }

  const loadBanks = async () => {
    try {
      setIsLoadingBanks(true)
      const token = TokenManager.getToken()
      const bankOptions = await dropdownAPI.getCategoryOptions('banks', token || undefined)
      setBanks(bankOptions.filter(opt => opt.is_active))
    } catch (error) {
      console.error('Error loading banks:', error)
    } finally {
      setIsLoadingBanks(false)
    }
  }

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategoryId(categoryId)
    setFilteredCourses(filterCoursesForParentCategory(courses, categoryId, categories))
  }

  /** Patch one batch from latest state so fee/pricing updates are not wiped by other fields. */
  const patchBatch = (
    courseId: string,
    batchId: string,
    patch: Partial<CourseBatch> | ((batch: CourseBatch) => CourseBatch)
  ) => {
    setFormData((prev) => ({
      ...prev,
      assignments: {
        ...prev.assignments,
        courses: prev.assignments.courses.map((c) =>
          c.course_id !== courseId
            ? c
            : {
              ...c,
              batches: c.batches.map((b) => {
                if (b.id !== batchId) return b
                return typeof patch === "function" ? patch(b) : { ...b, ...patch }
              }),
            }
        ),
      },
    }))
  }

  // Handle course selection
  const handleCourseToggle = (courseId: string) => {
    setFormData((prev) => {
      const existingCourse = prev.assignments.courses.find((c) => c.course_id === courseId)
      if (existingCourse) {
        return {
          ...prev,
          assignments: {
            ...prev.assignments,
            courses: prev.assignments.courses.filter((c) => c.course_id !== courseId),
          },
        }
      }
      return {
        ...prev,
        assignments: {
          ...prev.assignments,
          courses: [
            ...prev.assignments.courses,
            {
              course_id: courseId,
              is_available: true,
              batches: [
                {
                  id: `batch-${Date.now()}`,
                  start_time: "",
                  end_time: "",
                  coach_id: "",
                  days: [],
                  batch_name: "",
                  batch_fee: "",
                  fee_per_duration: {},
                  pricing_type_per_duration: {},
                  max_students: "",
                },
              ],
            },
          ],
        },
      }
    })
  }

  // Add batch to a course
  const addBatchToCourse = (courseId: string) => {
    setFormData((prev) => ({
      ...prev,
      assignments: {
        ...prev.assignments,
        courses: prev.assignments.courses.map((c) =>
          c.course_id === courseId
            ? {
              ...c,
              batches: [
                ...c.batches,
                {
                  id: `batch-${Date.now()}`,
                  start_time: "",
                  end_time: "",
                  coach_id: "",
                  days: [],
                  batch_name: "",
                  batch_fee: "",
                  fee_per_duration: {},
                  pricing_type_per_duration: {},
                  max_students: "",
                },
              ],
            }
            : c
        ),
      },
    }))
  }

  // Remove batch from a course
  const removeBatchFromCourse = (courseId: string, batchId: string) => {
    const targetCourse = formData.assignments.courses.find((c) => c.course_id === courseId)
    if (targetCourse && targetCourse.batches.length <= 1) {
      const courseDef = courses.find((c) => c.id === courseId)
      const courseName = courseDef?.title || courseDef?.code || "This course"
      toast({
        title: "Batch Required",
        description: `"${courseName}" must have at least one batch to be assigned to this branch. To remove this course, uncheck it from the list.`,
        variant: "destructive",
      })
      return
    }

    setFormData((prev) => ({
      ...prev,
      assignments: {
        ...prev.assignments,
        courses: prev.assignments.courses.map((c) =>
          c.course_id === courseId
            ? {
              ...c,
              batches: c.batches.filter((b) => b.id !== batchId),
            }
            : c
        ),
      },
    }))
  }

  // Update batch details
  const updateBatch = (courseId: string, batchId: string, field: string, value: string) => {
    patchBatch(courseId, batchId, { [field]: value } as Partial<CourseBatch>)
  }

  const toggleBatchDay = (courseId: string, batchId: string, day: string) => {
    patchBatch(courseId, batchId, (b) => {
      const current = b.days || []
      const has = current.includes(day)
      return {
        ...b,
        days: has ? current.filter((d) => d !== day) : [...current, day],
      }
    })
  }

  // Days of week for timings
  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

  // Add timing
  const addTiming = () => {
    if (!newTiming.day) {
      toast({
        title: "Validation Error",
        description: "Please select a day for the timing.",
        variant: "destructive",
      })
      return
    }

    const existingTiming = formData.operational_details.timings.find(t => t.day === newTiming.day)
    if (existingTiming) {
      toast({
        title: "Validation Error",
        description: "Timing for this day already exists.",
        variant: "destructive",
      })
      return
    }

    setFormData({
      ...formData,
      operational_details: {
        ...formData.operational_details,
        timings: [...formData.operational_details.timings, newTiming]
      }
    })

    setNewTiming({ day: "", open: "07:00", close: "19:00" })
  }

  // Remove timing
  const removeTiming = (day: string) => {
    setFormData({
      ...formData,
      operational_details: {
        ...formData.operational_details,
        timings: formData.operational_details.timings.filter(t => t.day !== day)
      }
    })
  }

  // Add holiday
  const addHoliday = (date: string) => {
    if (!date) return
    if (formData.operational_details.holidays.includes(date)) {
      toast({
        title: "Duplicate Holiday",
        description: "This date is already added.",
        variant: "destructive",
      })
      return
    }

    setFormData({
      ...formData,
      operational_details: {
        ...formData.operational_details,
        holidays: [...formData.operational_details.holidays, date]
      }
    })
  }

  // Remove holiday
  const removeHoliday = (date: string) => {
    setFormData({
      ...formData,
      operational_details: {
        ...formData.operational_details,
        holidays: formData.operational_details.holidays.filter(h => h !== date)
      }
    })
  }

  // Validation
  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    if (!formData.branch.name) newErrors.branchName = "Branch name is required"
    if (!formData.branch.code) newErrors.branchCode = "Branch code is required"
    if (!formData.location_id) newErrors.location = "Location is required"
    if (!formData.manager_id) newErrors.manager = "Manager is required"
    if (!formData.branch.address.line1) newErrors.addressLine1 = "Address is required"
    if (!formData.branch.address.area?.trim()) newErrors.area = "Area is required"
    if (!formData.branch.address.pincode) newErrors.pincode = "Pincode is required"

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const showSubmitError = (title: string, description: string) => {
    window.scrollTo({ top: 0, behavior: "smooth" })
    toast({ title, description, variant: "destructive" })
  }

  // Submit form
  const handleSubmit = async () => {
    if (!validateForm()) {
      showSubmitError("Validation Error", "Please fill in all required fields.")
      return
    }

    // Validate that every assigned course has at least one batch
    for (const courseAssignment of formData.assignments.courses) {
      if (!courseAssignment.batches || courseAssignment.batches.length === 0) {
        const courseDef = courses.find(c => c.id === courseAssignment.course_id)
        const courseTitle = courseDef?.title || courseDef?.code || "Assigned course"
        showSubmitError(
          "Batch Required",
          `"${courseTitle}" must have at least one batch before it can be assigned to this branch. Please add a batch or uncheck the course.`
        )
        return
      }
    }

    // Duration pricing is required so student enroll can show plans/amounts
    for (const courseAssignment of formData.assignments.courses) {
      if (courseAssignment.is_available === false) continue
      const courseDef = courses.find((c) => c.id === courseAssignment.course_id)
      const courseTitle = courseDef?.title || courseDef?.code || "Assigned course"
      for (const batch of courseAssignment.batches) {
        const batchLabel = (batch.batch_name || "").trim() || "Untitled batch"
        const maxStudentsNum = parseInt(String(batch.max_students ?? "").trim(), 10)
        if (!Number.isFinite(maxStudentsNum) || maxStudentsNum <= 0) {
          showSubmitError(
            "Batch capacity required",
            `"${courseTitle}" → ${batchLabel}: please enter maximum student capacity (min 1).`
          )
          return
        }
        const fpd = batch.fee_per_duration || {}
        const parseFee = (v: unknown) => {
          const n = parseFloat(String(v ?? "").replace(/,/g, "").trim())
          return Number.isFinite(n) ? n : NaN
        }
        const hasFee = Object.values(fpd).some((v) => {
          const n = parseFee(v)
          return n > 0
        })
        const batchFee = parseFee(batch.batch_fee)
        if (!hasFee && !(batchFee > 0)) {
          showSubmitError(
            "Batch pricing required",
            `"${courseTitle}" → ${batchLabel}: enter at least one duration fee greater than 0.`
          )
          return
        }
        if (masterDurations.length > 0) {
          const missing = masterDurations.filter((dur) => {
            const raw = fpd[dur.id] ?? (dur.code ? fpd[dur.code] : undefined)
            if (raw === undefined || String(raw).trim() === "") return false
            const n = parseFee(raw)
            return !(n > 0)
          })
          // If they typed any fee for a duration, it must be > 0 (already covered by hasFee check for empty).
          // Require every listed duration that has a value to be valid — and overall at least one fee (hasFee).
          if (missing.length > 0) {
            showSubmitError(
              "Batch pricing required",
              `"${courseTitle}" → ${batchLabel}: duration fees must be greater than 0.`
            )
            return
          }
        }
      }
    }

    setIsSubmitting(true)

    try {
      const token = TokenManager.getToken()
      if (!token) {
        showSubmitError("Authentication Error", "Please login again.")
        return
      }

      // Transform data before sending - remove client-side batch IDs
      // Get course names for operational_details.courses_offered
      const selectedCourseNames = formData.assignments.courses
        .map(c => {
          const course = courses.find(course => course.id === c.course_id)
          return course?.title || course?.code || c.course_id
        })

      const submitData: any = {
        branch: formData.branch,
        location_id: formData.location_id,
        manager_id: formData.manager_id,
        operational_details: {
          courses_offered: selectedCourseNames,
          timings: formData.operational_details.timings,
          holidays: formData.operational_details.holidays
        },
        assignments: {
          accessories_available: formData.assignments.accessories_available,
          courses: formData.assignments.courses.map(course => course.course_id),
          branch_admins: formData.assignments.branch_admins,
          course_schedule: buildCourseSchedulePayload(formData.assignments.courses),
        },
        bank_details: formData.bank_details,
        admission_fee: formData.admission_fee,
        // Own-branch create defaults to false; partner create page forces true.
        is_collaboration_partner: !!asPartner,
        allows_collaboration: !!asPartner,
      }

      console.log("Submitting branch data:", JSON.stringify(submitData, null, 2))

      const response = await fetch(getBackendApiUrl('branches'), {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      })

      if (response.ok) {
        setShowSuccessPopup(true)
        setTimeout(() => {
          router.push(listPath)
        }, 2000)
      } else {
        const errorData = await response.json()
        console.error("Branch creation failed:", errorData)

        // Handle error message properly (could be string, object, or array)
        let errorMessage = asPartner
          ? "Failed to create partner."
          : "Failed to create branch."
        if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail
        } else if (typeof errorData.message === 'string') {
          errorMessage = errorData.message
        } else if (Array.isArray(errorData.detail)) {
          errorMessage = errorData.detail.map((err: any) => err.msg || JSON.stringify(err)).join(', ')
        } else if (typeof errorData.detail === 'object') {
          errorMessage = JSON.stringify(errorData.detail)
        }

        showSubmitError("Error", errorMessage)
      }
    } catch (error) {
      console.error("Error creating branch:", error)
      showSubmitError("Error", "An unexpected error occurred.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <div className="min-h-screen bg-[#F5F6FA]">
        <main className="w-full py-6 px-4 lg:px-8 xl:px-10">
          <DashboardFormPageHeader
            title={asPartner ? "Create Partner" : "Create Branch"}
            subtitle={
              asPartner
                ? "Add a new collaboration partner branch"
                : "Add a new branch to your organization"
            }
            backLabel="Back"
            onBack={() => router.push(listPath)}
          />

        <div className="space-y-6">
          {/* Branch Information — full width */}
          <Card className={dashboardFormCardClass}>
            <CardHeader className="pb-2">
              <DashboardSectionHeading icon={Building} title="Branch Information" tone="rose" />
            </CardHeader>
            <CardContent className={cardContentClass}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="branchName">Branch Name *</Label>
                  <Input
                    id="branchName"
                    value={formData.branch.name}
                    onChange={(e) => setFormData({
                      ...formData,
                      branch: { ...formData.branch, name: e.target.value }
                    })}
                    placeholder="Enter branch name"
                  />
                  {errors.branchName && <p className="text-xs text-red-500">{errors.branchName}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="branchCode">Branch Code *</Label>
                  <div className="flex flex-col gap-2 md:flex-row">
                    <Input
                      id="branchCode"
                      value={formData.branch.code}
                      onChange={(e) => setFormData({
                        ...formData,
                        branch: { ...formData.branch, code: e.target.value }
                      })}
                      placeholder="Auto-generated"
                      className="min-w-0 flex-1"
                    />
                    <Button
                      size="sm"
                      type="button"
                      onClick={() => generateBranchCode(undefined, true)}
                      className="w-full md:w-auto shrink-0"
                    >
                      Regenerate
                    </Button>
                  </div>
                  {errors.branchCode && <p className="text-xs text-red-500">{errors.branchCode}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.branch.email}
                    onChange={(e) => setFormData({
                      ...formData,
                      branch: { ...formData.branch, email: e.target.value }
                    })}
                    placeholder="Optional"
                  />
                  {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.branch.phone}
                    onChange={(e) => setFormData({
                      ...formData,
                      branch: { ...formData.branch, phone: e.target.value }
                    })}
                    placeholder="Optional"
                  />
                  {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
                </div>
              </div>

              {geography.hasStates && (
                <div className="space-y-2">
                  <Label htmlFor="state">State *</Label>
                  <Select
                    value={geography.selectedStateId}
                    onValueChange={(value) => {
                      geography.setSelectedStateId(value)
                      setFormData({
                        ...formData,
                        location_id: "",
                        branch: {
                          ...formData.branch,
                          address: { ...formData.branch.address, city: "", state: geography.states.find((s) => s.id === value)?.name || "" }
                        }
                      })
                    }}
                    disabled={geography.isLoadingStates}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={geography.isLoadingStates ? "Loading..." : "Select state"} />
                    </SelectTrigger>
                    <SelectContent>
                      {geography.states.map((state) => (
                        <SelectItem key={state.id} value={state.id}>
                          {state.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="location">Location *</Label>
                <Select
                  value={formData.location_id}
                  onValueChange={(value) => {
                    geography.setSelectedCityId(value)
                    const selectedLocation = geography.allCities.find(l => l.id === value)
                    setFormData({
                      ...formData,
                      location_id: value,
                      branch: {
                        ...formData.branch,
                        address: {
                          ...formData.branch.address,
                          city: selectedLocation?.name || '',
                          state: selectedLocation?.state_name || selectedLocation?.state || formData.branch.address.state
                        }
                      }
                    })
                  }}
                  disabled={geography.isLoadingCities || (geography.hasStates && !geography.selectedStateId)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={geography.isLoadingCities ? "Loading..." : geography.hasStates && !geography.selectedStateId ? "Select state first" : "Select location"} />
                  </SelectTrigger>
                  <SelectContent>
                    {geography.cities.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}{location.state || location.state_name ? `, ${location.state_name || location.state}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.location && <p className="text-xs text-red-500">{errors.location}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="manager">Branch Manager *</Label>
                <Select
                  value={formData.manager_id}
                  onValueChange={(value) => setFormData({ ...formData, manager_id: value })}
                  disabled={isLoadingBranchManagers}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingBranchManagers ? "Loading..." : "Select manager"} />
                  </SelectTrigger>
                  <SelectContent>
                    {branchManagers.map((manager) => (
                      <SelectItem key={manager.id} value={manager.id}>
                        {manager.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.manager && <p className="text-xs text-red-500">{errors.manager}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="addressLine1">Address Line 1 *</Label>
                <Input
                  id="addressLine1"
                  value={formData.branch.address.line1}
                  onChange={(e) => setFormData({
                    ...formData,
                    branch: {
                      ...formData.branch,
                      address: { ...formData.branch.address, line1: e.target.value }
                    }
                  })}
                  placeholder="Street address"
                />
                {errors.addressLine1 && <p className="text-xs text-red-500">{errors.addressLine1}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="area">Area / Locality <span className="text-red-500">*</span></Label>
                <Input
                  id="area"
                  value={formData.branch.address.area}
                  onChange={(e) => setFormData({
                    ...formData,
                    branch: {
                      ...formData.branch,
                      address: { ...formData.branch.address, area: e.target.value }
                    }
                  })}
                  placeholder="Area or locality"
                  className={errors.area ? "border-red-500" : ""}
                />
                {errors.area && <p className="text-xs text-red-500">{errors.area}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.branch.address.city}
                    onChange={(e) => setFormData({
                      ...formData,
                      branch: {
                        ...formData.branch,
                        address: { ...formData.branch.address, city: e.target.value }
                      }
                    })}
                    placeholder="City"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.branch.address.state}
                    onChange={(e) => setFormData({
                      ...formData,
                      branch: {
                        ...formData.branch,
                        address: { ...formData.branch.address, state: e.target.value }
                      }
                    })}
                    placeholder="State"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pincode">Pincode *</Label>
                  <Input
                    id="pincode"
                    value={formData.branch.address.pincode}
                    onChange={(e) => setFormData({
                      ...formData,
                      branch: {
                        ...formData.branch,
                        address: { ...formData.branch.address, pincode: e.target.value }
                      }
                    })}
                    placeholder="Pincode"
                  />
                  {errors.pincode && <p className="text-xs text-red-500">{errors.pincode}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Select
                  value={formData.branch.address.country}
                  onValueChange={(value) => setFormData({
                    ...formData,
                    branch: {
                      ...formData.branch,
                      address: { ...formData.branch.address, country: value }
                    }
                  })}
                  disabled={isLoadingCountries}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((country) => (
                      <SelectItem key={country.value} value={country.value}>
                        {country.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Course Assignments — full width */}
          <Card className={dashboardFormCardClass}>
            <CardHeader className="pb-2">
              <DashboardSectionHeading icon={Users} title="Course Assignments" tone="indigo" />
            </CardHeader>
            <CardContent className={cardContentClass}>
              {/* Category Selection */}
              <div className="space-y-2">
                <Label>Select Category</Label>
                <Select
                  value={selectedCategoryId}
                  onValueChange={handleCategoryChange}
                  disabled={isLoadingCategories}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingCategories ? "Loading..." : "Select category"} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.filter(c => !c.parent_category_id).map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Course List — include already-selected courses even if category filter hides them */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {(() => {
                  const filteredIds = new Set(filteredCourses.map((c) => c.id))
                  const selectedOutsideFilter = courses.filter(
                    (c) =>
                      formData.assignments.courses.some((sc) => sc.course_id === c.id) &&
                      !filteredIds.has(c.id)
                  )
                  const visibleCourses = [...selectedOutsideFilter, ...filteredCourses]
                  if (visibleCourses.length === 0) {
                    return (
                      <p className="text-sm text-gray-500 text-center py-4">
                        {selectedCategoryId ? "No courses found for this category" : "Please select a category to view courses"}
                      </p>
                    )
                  }
                  return visibleCourses.map((course) => {
                    const selectedCourse = formData.assignments.courses.find(c => c.course_id === course.id)
                    const isSelected = !!selectedCourse

                    return (
                      <div key={course.id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                          <div className="flex items-start space-x-2 min-w-0">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleCourseToggle(course.id)}
                              className="mt-0.5 shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="font-medium break-words">{course.title}</p>
                              <p className="text-xs text-gray-500">{course.code}</p>
                            </div>
                          </div>
                          {isSelected && selectedCourse && (
                            <label className="flex items-center gap-1.5 text-xs text-gray-600 shrink-0 self-start md:self-auto pl-6 md:pl-0">
                              <Checkbox
                                checked={selectedCourse.is_available !== false}
                                onCheckedChange={(checked) => {
                                  setFormData((prev) => ({
                                    ...prev,
                                    assignments: {
                                      ...prev.assignments,
                                      courses: prev.assignments.courses.map((c) =>
                                        c.course_id === course.id
                                          ? { ...c, is_available: checked === true }
                                          : c
                                      ),
                                    },
                                  }))
                                }}
                              />
                              Available
                            </label>
                          )}
                        </div>

                        {/* Batches for selected course */}
                        {isSelected && selectedCourse && (
                          <div className="ml-0 md:ml-6 space-y-2">
                            <Label className="text-sm">Batches</Label>
                            {selectedCourse.batches.length === 0 && (
                              <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                                This course does not have any batches. At least one batch is required to assign this course to this branch.
                              </p>
                            )}
                            {selectedCourse.batches.map((batch) => (
                              <div
                                key={batch.id}
                                className="space-y-2 bg-gray-50 p-3 rounded border border-gray-200"
                              >
                                <div className="space-y-1">
                                  <Label className="text-xs text-gray-600">Available days</Label>
                                  <div className="flex flex-wrap gap-x-3 gap-y-2">
                                    {WEEKDAY_CHECKLIST_ORDER.map((day) => (
                                      <label
                                        key={day}
                                        className="flex items-center gap-1.5 text-xs cursor-pointer text-gray-800"
                                      >
                                        <Checkbox
                                          checked={(batch.days || []).includes(day)}
                                          onCheckedChange={() => toggleBatchDay(course.id, batch.id, day)}
                                        />
                                        <span>{day}</span>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                                {(batch.days || []).length > 0 && (
                                  <p className="text-xs font-medium text-[#4F5077]">
                                    {formatWeekdayRanges(batch.days || [])}
                                    {batch.start_time || batch.end_time
                                      ? ` · ${batch.start_time || "—"} – ${batch.end_time || "—"}`
                                      : ""}
                                  </p>
                                )}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <Label className="text-xs text-gray-600">Batch name (optional)</Label>
                                    <Input
                                      type="text"
                                      placeholder="e.g. Morning batch"
                                      value={batch.batch_name ?? ""}
                                      onChange={(e) =>
                                        updateBatch(course.id, batch.id, "batch_name", e.target.value)
                                      }
                                      className="h-9"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs text-gray-600">
                                      Max Students <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                      type="number"
                                      min="1"
                                      placeholder="e.g. 20"
                                      value={batch.max_students ?? ""}
                                      onChange={(e) =>
                                        updateBatch(course.id, batch.id, "max_students", e.target.value)
                                      }
                                      className="h-9"
                                      required
                                    />
                                  </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
                                  <div className="space-y-1">
                                    <Label className="text-xs text-gray-600">Start time</Label>
                                    <Input
                                      type="time"
                                      value={batch.start_time}
                                      onChange={(e) =>
                                        updateBatch(course.id, batch.id, "start_time", e.target.value)
                                      }
                                      className="h-9"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs text-gray-600">End time</Label>
                                    <Input
                                      type="time"
                                      value={batch.end_time}
                                      onChange={(e) =>
                                        updateBatch(course.id, batch.id, "end_time", e.target.value)
                                      }
                                      className="h-9"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs text-gray-600">Trainer</Label>
                                    <Select
                                      value={
                                        (batch.coach_id || "").trim()
                                          ? batch.coach_id
                                          : BATCH_COACH_UNASSIGNED
                                      }
                                      onValueChange={(value) =>
                                        updateBatch(
                                          course.id,
                                          batch.id,
                                          "coach_id",
                                          value === BATCH_COACH_UNASSIGNED ? "" : value
                                        )
                                      }
                                    >
                                      <SelectTrigger className="h-9">
                                        <SelectValue placeholder={isLoadingTrainers ? "Loading trainers..." : "Trainer"} />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value={BATCH_COACH_UNASSIGNED}>
                                          No trainer assigned
                                        </SelectItem>
                                        {trainers.map((trainer) => (
                                          <SelectItem key={trainer.id} value={trainer.id}>
                                            {trainer.name}
                                          </SelectItem>
                                        ))}
                                        {(batch.coach_id || "").trim() &&
                                          !trainers.some((trainer) => trainer.id === batch.coach_id) && (
                                            <SelectItem value={batch.coach_id}>
                                              Current assignment ({batch.coach_id})
                                            </SelectItem>
                                          )}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2 col-span-full">
                                    <Label className="text-xs text-gray-600 font-medium">
                                      Duration Pricing (₹) <span className="text-red-500">*</span>
                                    </Label>
                                    <div className="space-y-2">
                                      {masterDurations.map((dur) => {
                                        const fpd = batch.fee_per_duration || {}
                                        const ptd = batch.pricing_type_per_duration || {}
                                        const pricingType = ptd[dur.id] || "monthly"
                                        return (
                                          <div key={dur.id} className="flex flex-col gap-2 py-2 border-b border-gray-100 last:border-0 md:flex-row md:items-center md:gap-2 md:py-1">
                                            <span className="text-xs text-gray-700 md:w-24 shrink-0 font-medium">{dur.name}</span>
                                            <div className="flex flex-wrap items-center gap-2 min-w-0">
                                              <Input
                                                type="text"
                                                inputMode="decimal"
                                                placeholder={pricingType === "flat" ? "Flat price" : "Monthly fee"}
                                                value={fpd[dur.id] ?? ""}
                                                onChange={(e) => {
                                                  const nextFee = e.target.value
                                                  patchBatch(course.id, batch.id, (b) => ({
                                                    ...b,
                                                    fee_per_duration: {
                                                      ...(b.fee_per_duration || {}),
                                                      [dur.id]: nextFee,
                                                    },
                                                  }))
                                                }}
                                                className="h-7 w-full max-w-[11rem] md:w-28 text-sm"
                                              />
                                              <div className="flex items-center gap-1 shrink-0">
                                                <button
                                                  type="button"
                                                  className={`px-2 py-0.5 text-xs rounded-l border ${pricingType === "monthly" ? "bg-blue-100 text-blue-800 border-blue-300" : "bg-gray-50 text-gray-500 border-gray-200"}`}
                                                  onClick={() => {
                                                    patchBatch(course.id, batch.id, (b) => ({
                                                      ...b,
                                                      pricing_type_per_duration: {
                                                        ...(b.pricing_type_per_duration || {}),
                                                        [dur.id]: "monthly",
                                                      },
                                                    }))
                                                  }}
                                                >
                                                  Monthly
                                                </button>
                                                <button
                                                  type="button"
                                                  className={`px-2 py-0.5 text-xs rounded-r border ${pricingType === "flat" ? "bg-green-100 text-green-800 border-green-300" : "bg-gray-50 text-gray-500 border-gray-200"}`}
                                                  onClick={() => {
                                                    patchBatch(course.id, batch.id, (b) => ({
                                                      ...b,
                                                      pricing_type_per_duration: {
                                                        ...(b.pricing_type_per_duration || {}),
                                                        [dur.id]: "flat",
                                                      },
                                                    }))
                                                  }}
                                                >
                                                  Flat
                                                </button>
                                              </div>
                                              {fpd[dur.id] && pricingType === "monthly" && dur.duration_months > 1 && (
                                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                  = ₹{(parseFloat(fpd[dur.id]) * dur.duration_months).toLocaleString("en-IN")} total
                                                </span>
                                              )}
                                              {fpd[dur.id] && pricingType === "flat" && (
                                                <span className="text-xs text-green-600 whitespace-nowrap">Fixed price</span>
                                              )}
                                            </div>
                                          </div>
                                        )
                                      })}
                                      {masterDurations.length === 0 && (
                                        <p className="text-xs text-muted-foreground">No durations configured. Add them in Settings → Master Data.</p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex justify-end">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    type="button"
                                    onClick={() => removeBatchFromCourse(course.id, batch.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => addBatchToCourse(course.id)}
                              className="w-full"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Batch
                            </Button>
                          </div>
                        )}
                      </div>
                    )
                  })
                })()}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Operational Details — 50% on large screens */}
            <Card className={dashboardFormCardClass}>
              <CardHeader className="pb-2">
                <DashboardSectionHeading icon={Clock} title="Operational Details" tone="amber" />
              </CardHeader>
              <CardContent className={cardContentClass}>
                {/* Timings */}
                <div className="space-y-2">
                  <Label>Operating Hours</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div className="col-span-2 md:col-span-1 min-w-0">
                      <Select
                        value={newTiming.day}
                        onValueChange={(value) => setNewTiming({ ...newTiming, day: value })}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Day" />
                        </SelectTrigger>
                        <SelectContent>
                          {daysOfWeek.map((day) => (
                            <SelectItem key={day} value={day}>{day}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <OperatingTimePicker
                      label="Opening time"
                      value={newTiming.open}
                      onChange={(open) => setNewTiming({ ...newTiming, open })}
                    />

                    <OperatingTimePicker
                      label="Closing time"
                      value={newTiming.close}
                      onChange={(close) => setNewTiming({ ...newTiming, close })}
                    />

                    <Button onClick={addTiming} size="sm" className="col-span-2 md:col-span-1 w-full">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {formData.operational_details.timings.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.operational_details.timings.map((timing) => (
                        <Badge key={timing.day} variant="secondary" className="flex items-center gap-1">
                          {timing.day}: {timing.open} - {timing.close}
                          <X
                            className="h-3 w-3 cursor-pointer"
                            onClick={() => removeTiming(timing.day)}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Holidays */}
                <div className="space-y-2">
                  <Label>Holidays</Label>
                  <div className="relative w-full max-w-sm">
                    <Input
                      type="date"
                      id="holidayDate"
                      className="w-full pl-3 pr-9 py-1.5 h-9 text-xs sm:text-sm bg-white border-gray-200 rounded-md cursor-pointer [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:top-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-9 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-datetime-edit]:p-0"
                      onClick={(e) => e.currentTarget.showPicker?.()}
                      onChange={(e) => {
                        if (e.target.value) {
                          addHoliday(e.target.value)
                          e.target.value = ""
                        }
                      }}
                    />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                  </div>

                  {formData.operational_details.holidays.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.operational_details.holidays.map((holiday) => (
                        <Badge key={holiday} variant="secondary" className="flex items-center gap-1">
                          {new Date(holiday).toLocaleDateString()}
                          <button
                            type="button"
                            aria-label="Remove holiday"
                            className="inline-flex items-center justify-center rounded-sm text-red-500 hover:text-red-600"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              removeHoliday(holiday)
                            }}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Accessories */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="accessories"
                    checked={formData.assignments.accessories_available}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      assignments: {
                        ...formData.assignments,
                        accessories_available: checked as boolean
                      }
                    })}
                  />
                  <Label htmlFor="accessories" className="cursor-pointer">
                    Accessories Available
                  </Label>
                </div>
              </CardContent>
            </Card>

            {/* Bank Details — 50% on large screens */}
            <Card className={dashboardFormCardClass}>
              <CardHeader className="pb-2">
                <DashboardSectionHeading icon={CreditCard} title="Bank Details" tone="emerald" />
              </CardHeader>
              <CardContent className={cardContentClass}>
                <div className="space-y-2">
                  <Label htmlFor="bankName">Bank Name</Label>
                  <Select
                    value={formData.bank_details.bank_name}
                    onValueChange={(value) => setFormData({
                      ...formData,
                      bank_details: { ...formData.bank_details, bank_name: value }
                    })}
                    disabled={isLoadingBanks}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingBanks ? "Loading banks..." : "Select bank"} />
                    </SelectTrigger>
                    <SelectContent>
                      {banks.map((bank) => (
                        <SelectItem key={bank.value} value={bank.value}>
                          {bank.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accountNumber">Account Number</Label>
                  <Input
                    id="accountNumber"
                    value={formData.bank_details.account_number}
                    onChange={(e) => setFormData({
                      ...formData,
                      bank_details: { ...formData.bank_details, account_number: e.target.value }
                    })}
                    placeholder="Enter account number"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="upiId">UPI ID</Label>
                  <Input
                    id="upiId"
                    value={formData.bank_details.upi_id}
                    onChange={(e) => setFormData({
                      ...formData,
                      bank_details: { ...formData.bank_details, upi_id: e.target.value }
                    })}
                    placeholder="Enter UPI ID (e.g., name@ybl)"
                  />
                </div>

                <div className="pt-4 border-t">
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><span className="font-medium">Note:</span> Bank details are optional.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Form Actions */}
        <div className="mt-6 flex flex-col-reverse gap-3 md:flex-row md:justify-end md:space-x-4 md:gap-0">
          <Button
            variant="outline"
            onClick={() => router.push(listPath)}
            className="w-full md:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`w-full md:w-auto ${primaryButtonClass}`}
          >
            {isSubmitting
              ? "Creating..."
              : asPartner
                ? "Create Partner"
                : "Create Branch"}
          </Button>
        </div>
        </main>
      </div>

      {/* Success Popup */}
      {showSuccessPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 backdrop-blur-[2px] p-4">
          <Card className="w-full max-w-96">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="text-green-500 text-6xl">✓</div>
                <h3 className="text-xl font-bold">
                  {asPartner
                    ? "Partner Created Successfully!"
                    : "Branch Created Successfully!"}
                </h3>
                <p className="text-gray-500">
                  {asPartner
                    ? "Redirecting to partner profiles..."
                    : "Redirecting to branches list..."}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}
