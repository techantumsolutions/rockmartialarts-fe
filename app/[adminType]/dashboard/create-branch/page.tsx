"use client"

import { getBackendApiUrl } from "@/lib/config"
import { useState, useEffect } from "react"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Building, MapPin, Clock, Users, CreditCard, X, Plus, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import Header from "@/components/layout/Header"
import { useDashboardRole, useDashboardBasePath } from "@/lib/useDashboardBasePath"
import { TokenManager } from "@/lib/tokenManager"
import { useToast } from "@/hooks/use-toast"
import { dropdownAPI, DropdownOption } from "@/lib/dropdownAPI"
import { useGeographyDropdowns } from "@/hooks/use-geography-dropdowns"
import { WEEKDAY_CHECKLIST_ORDER, formatWeekdayRanges } from "@/lib/formatWeekdayRanges"
import { buildCourseSchedulePayload, BATCH_COACH_UNASSIGNED } from "@/lib/branchCourseSchedule"

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

interface CourseBatch {
  id: string
  start_time: string
  end_time: string
  coach_id: string
  days: string[]
  batch_name?: string
  batch_fee?: string
  fee_per_duration?: Record<string, string>
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
}

export default function CreateBranchPage() {
  const router = useRouter()
  const basePath = useDashboardBasePath()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  // API data state
  const [courses, setCourses] = useState<Course[]>([])
  const [isLoadingCourses, setIsLoadingCourses] = useState(true)
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(true)
  const [coaches, setCoaches] = useState<{ id: string; name: string }[]>([])
  const [masterDurations, setMasterDurations] = useState<{ id: string; name: string; code: string; duration_months: number }[]>([])
  const [isLoadingCoaches, setIsLoadingCoaches] = useState(true)
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
    admission_fee: 0
  })

  // Auto-generate branch code
  const generateBranchCode = () => {
    const branchName = formData.branch.name.trim()
    if (branchName.length >= 2) {
      const firstTwoLetters = branchName.substring(0, 2).toUpperCase()
      const randomNumbers = Math.floor(Math.random() * 90 + 10)
      const code = `${firstTwoLetters}${randomNumbers}`
      setFormData({
        ...formData,
        branch: { ...formData.branch, code }
      })
    }
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
      generateBranchCode()
    }
  }, [formData.branch.name])

  // Load data from APIs
  useEffect(() => {
    const loadBranchManagers = async () => {
      try {
        setIsLoadingCoaches(true)
        let token = TokenManager.getToken()

        if (!token) {
          console.log("No token found, attempting superadmin login...")
          try {
            const loginResponse = await fetch(getBackendApiUrl('login'), {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                email: "pittisunilkumar3@gmail.com",
                password: "StrongPassword@123"
              })
            })

            if (loginResponse.ok) {
              const loginData = await loginResponse.json()
              if (loginData.token) {
                TokenManager.setToken(loginData.token)
                token = loginData.token
                console.log("✅ Auto-login successful")
              }
            }
          } catch (loginError) {
            console.error("Auto-login failed:", loginError)
          }
        }

        if (!token) {
          toast({
            title: "Authentication Required",
            description: "Please login to access this page.",
            variant: "destructive",
          })
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

          setCoaches(branchManagerOptions)
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
        setIsLoadingCoaches(false)
      }
    }

    const loadData = async () => {
      // Load courses
      try {
        setIsLoadingCourses(true)
        const coursesResponse = await fetch(getBackendApiUrl('courses/public/all'))
        if (coursesResponse.ok) {
          const coursesData = await coursesResponse.json()
          setCourses(coursesData.courses || [])
          setFilteredCourses(coursesData.courses || [])
        }
      } catch (error) {
        console.error('Error loading courses:', error)
      } finally {
        setIsLoadingCourses(false)
      }

      // Load categories
      try {
        setIsLoadingCategories(true)
        const categoriesResponse = await fetch(getBackendApiUrl('categories/public/all'))
        if (categoriesResponse.ok) {
          const categoriesData = await categoriesResponse.json()
          setCategories(categoriesData.categories || [])
        }
      } catch (error) {
        console.error('Error loading categories:', error)
      } finally {
        setIsLoadingCategories(false)
      }

      await loadBranchManagers()
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
      .catch(() => {})
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

  // Handle course selection
  const handleCourseToggle = (courseId: string) => {
    const existingCourse = formData.assignments.courses.find(c => c.course_id === courseId)
    
    if (existingCourse) {
      // Remove course
      setFormData({
        ...formData,
        assignments: {
          ...formData.assignments,
          courses: formData.assignments.courses.filter(c => c.course_id !== courseId)
        }
      })
    } else {
      // Add course with one empty batch
      setFormData({
        ...formData,
        assignments: {
          ...formData.assignments,
          courses: [
            ...formData.assignments.courses,
            {
              course_id: courseId,
              is_available: true,
              batches: [{
                id: `batch-${Date.now()}`,
                start_time: "",
                end_time: "",
                coach_id: "",
                days: [],
                batch_name: "",
                batch_fee: "",
                fee_per_duration: {},
              }]
            }
          ]
        }
      })
    }
  }

  // Add batch to a course
  const addBatchToCourse = (courseId: string) => {
    setFormData({
      ...formData,
      assignments: {
        ...formData.assignments,
        courses: formData.assignments.courses.map(c => 
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
                  }
                ]
              }
            : c
        )
      }
    })
  }

  // Remove batch from a course
  const removeBatchFromCourse = (courseId: string, batchId: string) => {
    setFormData({
      ...formData,
      assignments: {
        ...formData.assignments,
        courses: formData.assignments.courses.map(c => 
          c.course_id === courseId
            ? {
                ...c,
                batches: c.batches.filter(b => b.id !== batchId)
              }
            : c
        )
      }
    })
  }

  // Update batch details
  const updateBatch = (courseId: string, batchId: string, field: string, value: string) => {
    setFormData({
      ...formData,
      assignments: {
        ...formData.assignments,
        courses: formData.assignments.courses.map(c => 
          c.course_id === courseId
            ? {
                ...c,
                batches: c.batches.map(b => 
                  b.id === batchId ? { ...b, [field]: value } : b
                )
              }
            : c
        )
      }
    })
  }

  const toggleBatchDay = (courseId: string, batchId: string, day: string) => {
    setFormData({
      ...formData,
      assignments: {
        ...formData.assignments,
        courses: formData.assignments.courses.map((c) =>
          c.course_id === courseId
            ? {
                ...c,
                batches: c.batches.map((b) => {
                  if (b.id !== batchId) return b
                  const current = b.days || []
                  const has = current.includes(day)
                  return {
                    ...b,
                    days: has ? current.filter((d) => d !== day) : [...current, day],
                  }
                }),
              }
            : c
        ),
      },
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
    if (!formData.branch.email) newErrors.email = "Email is required"
    if (!formData.branch.phone) newErrors.phone = "Phone is required"
    if (!formData.location_id) newErrors.location = "Location is required"
    if (!formData.manager_id) newErrors.manager = "Manager is required"
    if (!formData.branch.address.line1) newErrors.addressLine1 = "Address is required"
    if (!formData.branch.address.area?.trim()) newErrors.area = "Area is required"
    if (!formData.branch.address.pincode) newErrors.pincode = "Pincode is required"

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Submit form
  const handleSubmit = async () => {
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const token = TokenManager.getToken()
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "Please login again.",
          variant: "destructive",
        })
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
        admission_fee: formData.admission_fee
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
          router.push(`${basePath}/branches`)
        }, 2000)
      } else {
        const errorData = await response.json()
        console.error("Branch creation failed:", errorData)
        
        // Handle error message properly (could be string, object, or array)
        let errorMessage = "Failed to create branch."
        if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail
        } else if (typeof errorData.message === 'string') {
          errorMessage = errorData.message
        } else if (Array.isArray(errorData.detail)) {
          errorMessage = errorData.detail.map((err: any) => err.msg || JSON.stringify(err)).join(', ')
        } else if (typeof errorData.detail === 'object') {
          errorMessage = JSON.stringify(errorData.detail)
        }
        
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error creating branch:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Header title="Create Branch" role={useDashboardRole()} />
      <div className="p-8 pt-4">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => router.push(`${basePath}/branches`)}
              className="flex items-center"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-[#4F5077]">Create Branch</h1>
              <p className="text-gray-500">Add a new branch to your organization</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Branch Information — full width */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building className="h-5 w-5 text-[#FA6669]" />
                <span className="text-[#4F5077]">Branch Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
                  <div className="flex gap-2">
                    <Input
                      id="branchCode"
                      value={formData.branch.code}
                      onChange={(e) => setFormData({
                        ...formData,
                        branch: { ...formData.branch, code: e.target.value }
                      })}
                      placeholder="Auto-generated"
                    />
                    <Button size="sm" onClick={generateBranchCode}>
                      Regenerate
                    </Button>
                  </div>
                  {errors.branchCode && <p className="text-xs text-red-500">{errors.branchCode}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.branch.email}
                    onChange={(e) => setFormData({
                      ...formData,
                      branch: { ...formData.branch, email: e.target.value }
                    })}
                    placeholder="branch@example.com"
                  />
                  {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    value={formData.branch.phone}
                    onChange={(e) => setFormData({
                      ...formData,
                      branch: { ...formData.branch, phone: e.target.value }
                    })}
                    placeholder="+91 XXXXXXXXXX"
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
                  disabled={isLoadingCoaches}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingCoaches ? "Loading..." : "Select manager"} />
                  </SelectTrigger>
                  <SelectContent>
                    {coaches.map((coach) => (
                      <SelectItem key={coach.id} value={coach.id}>
                        {coach.name}
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

              <div className="grid grid-cols-3 gap-4">
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-[#FA6669]" />
                <span className="text-[#4F5077]">Course Assignments</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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

              {/* Course List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredCourses.length > 0 ? (
                  filteredCourses.map((course) => {
                    const selectedCourse = formData.assignments.courses.find(c => c.course_id === course.id)
                    const isSelected = !!selectedCourse

                    return (
                      <div key={course.id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleCourseToggle(course.id)}
                            />
                            <div>
                              <p className="font-medium">{course.title}</p>
                              <p className="text-xs text-gray-500">{course.code}</p>
                            </div>
                          </div>
                          {isSelected && selectedCourse && (
                            <label className="flex items-center gap-1.5 text-xs text-gray-600 shrink-0">
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
                          <div className="ml-6 space-y-2">
                            <Label className="text-sm">Batches</Label>
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
                                        <SelectValue placeholder="Trainer" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value={BATCH_COACH_UNASSIGNED}>
                                          No trainer assigned
                                        </SelectItem>
                                        {coaches.map((coach) => (
                                          <SelectItem key={coach.id} value={coach.id}>
                                            {coach.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2 col-span-full">
                                    <Label className="text-xs text-gray-600 font-medium">Duration Pricing (₹)</Label>
                                    <div className="space-y-2">
                                      {masterDurations.map((dur) => {
                                        const fpd = batch.fee_per_duration || {}
                                        const ptd = batch.pricing_type_per_duration || {}
                                        const pricingType = ptd[dur.id] || "monthly"
                                        const updateBatchField = (field: string, value: any) => {
                                          const newCourses = formData.assignments.courses.map((c: any) => {
                                            if (c.course_id !== course.id) return c
                                            return {
                                              ...c,
                                              batches: c.batches.map((b: any) => {
                                                if (b.id !== batch.id) return b
                                                return { ...b, [field]: value }
                                              })
                                            }
                                          })
                                          setFormData((prev: any) => ({
                                            ...prev,
                                            assignments: { ...prev.assignments, courses: newCourses }
                                          }))
                                        }
                                        return (
                                          <div key={dur.id} className="flex items-center gap-2 py-1 border-b border-gray-100 last:border-0">
                                            <span className="text-xs text-gray-700 w-24 shrink-0 font-medium">{dur.name}</span>
                                            <Input
                                              type="text"
                                              inputMode="decimal"
                                              placeholder={pricingType === "flat" ? "Flat price" : "Monthly fee"}
                                              value={fpd[dur.id] ?? ""}
                                              onChange={(e) => {
                                                updateBatchField("fee_per_duration", {
                                                  ...(batch.fee_per_duration || {}),
                                                  [dur.id]: e.target.value
                                                })
                                              }}
                                              className="h-7 w-28 text-sm"
                                            />
                                            <div className="flex items-center gap-1 shrink-0">
                                              <button
                                                type="button"
                                                className={`px-2 py-0.5 text-xs rounded-l border ${pricingType === "monthly" ? "bg-blue-100 text-blue-800 border-blue-300" : "bg-gray-50 text-gray-500 border-gray-200"}`}
                                                onClick={() => {
                                                  updateBatchField("pricing_type_per_duration", {
                                                    ...(batch.pricing_type_per_duration || {}),
                                                    [dur.id]: "monthly"
                                                  })
                                                }}
                                              >
                                                Monthly
                                              </button>
                                              <button
                                                type="button"
                                                className={`px-2 py-0.5 text-xs rounded-r border ${pricingType === "flat" ? "bg-green-100 text-green-800 border-green-300" : "bg-gray-50 text-gray-500 border-gray-200"}`}
                                                onClick={() => {
                                                  updateBatchField("pricing_type_per_duration", {
                                                    ...(batch.pricing_type_per_duration || {}),
                                                    [dur.id]: "flat"
                                                  })
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
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">
                    {selectedCategoryId ? "No courses found for this category" : "Please select a category to view courses"}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Operational Details — 50% on large screens */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-[#FA6669]" />
                <span className="text-[#4F5077]">Operational Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Timings */}
              <div className="space-y-2">
                <Label>Operating Hours</Label>
                <div className="grid grid-cols-4 gap-2">
                  <Select
                    value={newTiming.day}
                    onValueChange={(value) => setNewTiming({ ...newTiming, day: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Day" />
                    </SelectTrigger>
                    <SelectContent>
                      {daysOfWeek.map((day) => (
                        <SelectItem key={day} value={day}>{day}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    type="time"
                    value={newTiming.open}
                    onChange={(e) => setNewTiming({ ...newTiming, open: e.target.value })}
                  />

                  <Input
                    type="time"
                    value={newTiming.close}
                    onChange={(e) => setNewTiming({ ...newTiming, close: e.target.value })}
                  />

                  <Button onClick={addTiming} size="sm">
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
                <div className="flex gap-2">
                  <Input
                    type="date"
                    id="holidayDate"
                    onChange={(e) => {
                      if (e.target.value) {
                        addHoliday(e.target.value)
                        e.target.value = ""
                      }
                    }}
                  />
                </div>

                {formData.operational_details.holidays.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.operational_details.holidays.map((holiday) => (
                      <Badge key={holiday} variant="secondary" className="flex items-center gap-1">
                        {new Date(holiday).toLocaleDateString()}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => removeHoliday(holiday)}
                        />
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5 text-[#FA6669]" />
                <span className="text-[#4F5077]">Bank Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
        <div className="mt-6 flex justify-end space-x-4">
          <Button
            variant="outline"
            onClick={() => router.push(`${basePath}/branches`)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-[#FA6669] hover:bg-[#e55557]"
          >
            {isSubmitting ? "Creating..." : "Create Branch"}
          </Button>
        </div>
      </div>

      {/* Success Popup */}
      {showSuccessPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-96">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="text-green-500 text-6xl">✓</div>
                <h3 className="text-xl font-bold">Branch Created Successfully!</h3>
                <p className="text-gray-500">Redirecting to branches list...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}
