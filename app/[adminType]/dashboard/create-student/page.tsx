"use client"

import type React from "react"

import { getBackendApiUrl } from "@/lib/config"
import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, MapPinIcon, Building2Icon, FolderIcon, BookOpenIcon, ClockIcon, UserIcon, MailIcon, PhoneIcon, Users2Icon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { useDashboardBasePath, useDashboardRole } from "@/lib/useDashboardBasePath"
import { useAuth } from "@/contexts/AuthContext"
import { branchAPI } from "@/lib/branchAPI"
import { courseAPI } from "@/lib/courseAPI"
import { useToast } from "@/hooks/use-toast"
import { TokenManager } from "@/lib/tokenManager"
import { dropdownAPI } from "@/lib/dropdownAPI"
import { useGeographyDropdowns } from "@/hooks/use-geography-dropdowns"

interface Branch {
  id: string
  name: string
  code?: string
  address?: string
  phone?: string
  email?: string
  location?: string
  location_id?: string
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

interface Coach {
  id: string
  first_name: string
  last_name: string
  full_name: string
  email: string
  phone: string
  areas_of_expertise: string[]
  is_active: boolean
}

interface FormErrors {
  [key: string]: string
}

export default function CreateStudent() {
  const router = useRouter()
  const basePath = useDashboardBasePath()
  const isSuperAdmin = useDashboardRole() === "super_admin"
  const { toast } = useToast()
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [branches, setBranches] = useState<Branch[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const geography = useGeographyDropdowns()
  const [categories, setCategories] = useState<any[]>([])
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([])
  const [filteredCoaches, setFilteredCoaches] = useState<Coach[]>([])
  const [studentLevelOptions, setStudentLevelOptions] = useState<{ value: string; label: string }[]>([])

  // API Loading states
  const [isLoadingLocations, setIsLoadingLocations] = useState(true)
  const [isLoadingBranches, setIsLoadingBranches] = useState(true)
  const [isLoadingCourses, setIsLoadingCourses] = useState(true)
  const [isLoadingCategories, setIsLoadingCategories] = useState(true)
  const [isLoadingCoaches, setIsLoadingCoaches] = useState(true)

  // Form state
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [joiningDate, setJoiningDate] = useState<Date>()
  
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
    assignedCoach: "",
    experienceLevel: "",
    healthNotes: "",
    beltRank: "",
    slot: "",
    joiningDate: "",
    
    // Emergency Contact
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContactRelation: "",
    studentLevel: "",
    
    // Payment Plan
    paymentPlan: "full",
  })

  // Dynamic locations will be loaded from API

  // Dynamic branches will be loaded from API

  // Dynamic courses and categories will be loaded from API

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

  // Duration options
  const durations = [
    { id: "1-month", name: "1 Month" },
    { id: "3-months", name: "3 Months" },
    { id: "6-months", name: "6 Months" },
    { id: "12-months", name: "12 Months" },
    { id: "lifetime", name: "Lifetime" }
  ]

  // Experience levels
  const experienceLevels = [
    { id: "beginner", name: "Beginner" },
    { id: "intermediate", name: "Intermediate" },
    { id: "advanced", name: "Advanced" },
    { id: "expert", name: "Expert" }
  ]

  // Belt ranks
  const beltRanks = [
    { id: "none", name: "None" },
    { id: "white", name: "White Belt" },
    { id: "yellow", name: "Yellow Belt" },
    { id: "orange", name: "Orange Belt" },
    { id: "green", name: "Green Belt" },
    { id: "blue", name: "Blue Belt" },
    { id: "brown", name: "Brown Belt" },
    { id: "black", name: "Black Belt" }
  ]

  // Time slots
  const timeSlots = [
    { id: "morning-6-8", name: "Morning (6:00 AM - 8:00 AM)" },
    { id: "morning-8-10", name: "Morning (8:00 AM - 10:00 AM)" },
    { id: "evening-4-6", name: "Evening (4:00 PM - 6:00 PM)" },
    { id: "evening-6-8", name: "Evening (6:00 PM - 8:00 PM)" },
    { id: "evening-8-10", name: "Evening (8:00 PM - 10:00 PM)" },
    { id: "weekend-morning", name: "Weekend Morning" },
    { id: "weekend-evening", name: "Weekend Evening" }
  ]

  useEffect(() => {
    setLocations(geography.hasStates && geography.selectedStateId ? geography.cities : geography.allCities)
    setIsLoadingLocations(geography.isLoading)
  }, [geography.hasStates, geography.selectedStateId, geography.cities, geography.allCities, geography.isLoading])

  // Load locations, branches and courses on component mount
  useEffect(() => {
    const loadData = async () => {
      // Using public APIs - no authentication required

      // Branches will be loaded dynamically when location is selected
      setIsLoadingBranches(false)

      try {
        // Load categories
        setIsLoadingCategories(true)
        const categoriesResponse = await fetch(getBackendApiUrl('categories/public/details?active_only=true'))
        if (categoriesResponse.ok) {
          const categoriesData = await categoriesResponse.json()
          setCategories(categoriesData.categories || [])
        }
      } catch (error) {
        console.error('Error loading categories:', error)
        toast({
          title: "Error",
          description: "Failed to load categories. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoadingCategories(false)
      }

      try {
        // Load coaches - Note: This endpoint may require authentication in the future
        setIsLoadingCoaches(true)

        // Coaches will be loaded dynamically when course is selected
        setCoaches([])
        setFilteredCoaches([])

        // Uncomment this when you have a public coaches endpoint:
        // const coachesResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/coaches/public/all?active_only=true`)
        // if (coachesResponse.ok) {
        //   const coachesData = await coachesResponse.json()
        //   setCoaches(coachesData.coaches || [])
        //   setFilteredCoaches(coachesData.coaches || [])
        // }
      } catch (error) {
        console.error('Error loading coaches:', error)
        // Don't show error toast for coaches since it's not critical for student creation
        // toast({
        //   title: "Error",
        //   description: "Failed to load coaches. Please try again.",
        //   variant: "destructive",
        // })
      } finally {
        setIsLoadingCoaches(false)
      }
    }

    loadData()
  }, []) // Using public APIs - no dependencies needed

  // Use dynamic data loaded from APIs

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

  // Load coaches when course is selected
  useEffect(() => {
    const loadCoachesForCourse = async () => {
      if (!formData.course) {
        setCoaches([])
        setFilteredCoaches([])
        return
      }

      try {
        setIsLoadingCoaches(true)
        console.log('📡 Loading coaches for course:', formData.course)

        const response = await fetch(getBackendApiUrl(`coaches/public/by-course/${formData.course}`))

        if (response.ok) {
          const data = await response.json()
          console.log('✅ Coaches loaded:', data.coaches?.length || 0, 'coaches')
          setCoaches(data.coaches || [])
          setFilteredCoaches(data.coaches || [])
        } else {
          console.error('❌ Failed to load coaches for course:', response.status)
          setCoaches([])
          setFilteredCoaches([])
          toast({
            title: "Warning",
            description: "Failed to load coaches for selected course.",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error('Error loading coaches for course:', error)
        setCoaches([])
        setFilteredCoaches([])
        toast({
          title: "Error",
          description: "Failed to load coaches. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoadingCoaches(false)
      }
    }

    loadCoachesForCourse()
  }, [formData.course, toast])

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

  // Load only courses available at the selected branch
  useEffect(() => {
    const loadCoursesForBranch = async () => {
      if (!formData.branch) {
        setCourses([])
        setFilteredCourses([])
        setFormData((prev) => (prev.course ? { ...prev, course: "" } : prev))
        setIsLoadingCourses(false)
        return
      }
      try {
        setIsLoadingCourses(true)
        const coursesResponse = await fetch(
          getBackendApiUrl(`courses/public/by-branch/${encodeURIComponent(formData.branch)}`)
        )
        if (coursesResponse.ok) {
          const coursesData = await coursesResponse.json()
          const list = coursesData.courses || []
          setCourses(list)
          setFilteredCourses(list)
          setFormData((prev) => {
            if (prev.course && !list.some((c: Course) => c.id === prev.course)) {
              return { ...prev, course: "" }
            }
            return prev
          })
        } else {
          setCourses([])
          setFilteredCourses([])
        }
      } catch (error) {
        console.error("Error loading courses for branch:", error)
        setCourses([])
        setFilteredCourses([])
      } finally {
        setIsLoadingCourses(false)
      }
    }
    loadCoursesForBranch()
  }, [formData.branch])

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

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }))
    }
  }

  const handleDateChange = (field: string, date: Date | undefined) => {
    if (date) {
      const formattedDate = format(date, "yyyy-MM-dd")
      handleInputChange(field, formattedDate)
      
      if (field === "dob") {
        setSelectedDate(date)
      } else if (field === "joiningDate") {
        setJoiningDate(date)
      }
    }
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    // Required fields validation - only for fields in the design
    if (!formData.firstName.trim()) newErrors.firstName = "First name is required"
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required"
    if (!formData.email.trim()) newErrors.email = "Email is required"
    if (!formData.contactNumber.trim()) newErrors.contactNumber = "Contact number is required"
    if (!formData.gender) newErrors.gender = "Gender is required"
    if (!formData.dob) newErrors.dob = "Date of birth is required"
    if (!formData.password.trim()) newErrors.password = "Password is required"
    if (!formData.location) newErrors.location = "Location is required"
    if (!formData.branch) newErrors.branch = "Branch is required"
    if (!formData.course) newErrors.course = "Course is required"

    // Email validation
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address"
    }

    // Password validation
    if (formData.password && formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters long"
    }

    // Phone number validation
    if (formData.contactNumber && !/^[0-9]{10}$/.test(formData.contactNumber.replace(/\s+/g, ''))) {
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

    try {
      // Check if payment processing is required
      const requiresPayment = formData.course && formData.branch && formData.category

      if (requiresPayment) {
        // Use payment processing endpoint for complete registration with payment
        const paymentData = {
          student_data: {
            email: formData.email,
            phone: `${formData.countryCode}${formData.contactNumber}`,
            first_name: formData.firstName,
            last_name: formData.lastName,
            full_name: `${formData.firstName} ${formData.lastName}`,
            role: "student",
            password: formData.password || "TempPassword123!",
            date_of_birth: formData.dob || undefined,
            gender: formData.gender || undefined,
            biometric_id: formData.biometricId || undefined,
            is_active: true,
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
            ...(isSuperAdmin && formData.studentLevel ? { student_level: formData.studentLevel } : {}),
          },
          course_id: formData.course,
          branch_id: formData.branch,
          category_id: formData.category,
          duration: formData.duration || "3-months",
          payment_method: "cash" // Default to cash for manual registrations
        }

        console.log("Creating student with payment processing:", paymentData)

        // Use payment processing endpoint
        const response = await fetch(getBackendApiUrl('payments/process-registration'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(paymentData),
        })

        if (response.ok) {
          const result = await response.json()
          console.log('Student created with payment processing:', result)
          setShowSuccessPopup(true)
        } else {
          const errorData = await response.json()
          setErrors({ submit: errorData.detail || 'Failed to create student with payment. Please try again.' })
          console.error('Student creation with payment failed:', errorData)
        }
      } else {
        // Use regular registration endpoint for students without course/branch
        // Separate user data from course enrollment data
        const apiPayload = {
          email: formData.email,
          phone: `${formData.countryCode}${formData.contactNumber}`,
          first_name: formData.firstName,
          last_name: formData.lastName,
          role: "student",
          password: formData.password || "TempPassword123!",
          date_of_birth: formData.dob || undefined,
          gender: formData.gender || undefined,
          biometric_id: formData.biometricId || undefined,
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
          ...(isSuperAdmin && formData.studentLevel ? { student_level: formData.studentLevel } : {}),
          course: formData.course ? {
            category_id: formData.category,
            course_id: formData.course,
            duration: formData.duration || "3-months"
          } : undefined,
          branch: formData.branch ? {
            location_id: formData.location,
            branch_id: formData.branch
          } : undefined
        }

        console.log("Creating student without payment:", apiPayload)

        // Make API call using public registration endpoint (no auth required)
        const response = await fetch(getBackendApiUrl('auth/register'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(apiPayload),
        })

        if (response.ok) {
          const result = await response.json()
          console.log('Student created successfully:', result)
          setShowSuccessPopup(true)
        } else {
          const errorData = await response.json()
          setErrors({ submit: errorData.message || 'Failed to create student. Please try again.' })
          console.error('Student creation failed:', errorData)
        }
      }
    } catch (error) {
      console.error('Error creating student:', error)
      setErrors({ submit: 'Network error. Please check your connection and try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSuccessOk = () => {
    setShowSuccessPopup(false)
    router.push(`${basePath}/students`)
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Main Content */}
      <main className="w-full mx-auto py-4 sm:py-6 px-4 lg:px-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8">
          <div className="mb-4 sm:mb-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#4F5077] mb-2">Create New Student</h1>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push(`${basePath}/students`)}
            className="flex items-center space-x-2 px-4 py-2 border-gray-300 hover:bg-gray-50 transition-all duration-200 text-sm"
          >
            <span className="text-[#4F5077]">← Back to Students</span>
          </Button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="bg-white rounded-2xl shadow-sm border p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading form data...</p>
          </div>
        )}

        {/* Main Form Card */}
        {!isLoading && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            
            {/* Form Header */}
            {/* <div className="bg-gradient-to-r from-yellow-50 to-orange-50 px-6 sm:px-8 py-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-1">Student Information</h2>
              <p className="text-gray-600 text-sm">Please fill in all required fields marked with *</p>
            </div> */}

            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-8">
              {/* Error Display */}
              {errors.submit && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-red-600 font-medium">{errors.submit}</p>
                </div>
              )}

              {/* Form Fields Grid */}
              <div className="space-y-8">
                
                {/* Personal Information Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[#4F5077] border-b border-gray-200 pb-2">Personal Information</h3>
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
                          placeholder="Enter mobile number"
                          value={formData.contactNumber}
                          onChange={(e) => handleInputChange("contactNumber", e.target.value)}
                          className={cn(
                            "pl-12 py-4 text-base bg-gray-50 border-gray-200 rounded-xl h-14",
                            errors.contactNumber ? "border-red-500 bg-red-50" : ""
                          )}
                        />
                        {errors.contactNumber && <p className="text-red-500 text-sm mt-1">{errors.contactNumber}</p>}
                      </div>
                    </div>

                    {/* Gender */}
                    <div>
                      <Label className="block text-sm font-medium mb-2">
                        Gender <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 pointer-events-none">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                          </svg>
                        </div>
                        <Select value={formData.gender} onValueChange={(value) => handleInputChange("gender", value)}>
                          <SelectTrigger className={cn(
                            "!w-full !h-14 !pl-12 !pr-4 !py-4 !text-base !bg-gray-50 !border-gray-200 !rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent !min-h-14",
                            errors.gender ? "!border-red-500 !bg-red-50" : ""
                          )}>
                            <SelectValue placeholder="Select Gender" className="text-gray-500" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border border-gray-200 bg-white shadow-lg max-h-60">
                            <SelectItem value="male" className="!py-3 !pl-3 pr-8 text-base hover:bg-gray-50 rounded-lg cursor-pointer">Male</SelectItem>
                            <SelectItem value="female" className="!py-3 !pl-3 pr-8 text-base hover:bg-gray-50 rounded-lg cursor-pointer">Female</SelectItem>
                            <SelectItem value="other" className="!py-3 !pl-3 pr-8 text-base hover:bg-gray-50 rounded-lg cursor-pointer">Other</SelectItem>
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
                              "!w-full !h-14 !pl-12 !pr-4 !py-4 !text-base !bg-gray-50 !border-gray-200 !rounded-xl !min-h-14"
                            )}
                          >
                            <SelectValue placeholder="Select student level" className="text-gray-500" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border border-gray-200 bg-white shadow-lg max-h-60">
                            {studentLevelOptions.map((opt) => (
                              <SelectItem
                                key={opt.value}
                                value={opt.value}
                                className="!py-3 !pl-3 pr-8 text-base hover:bg-gray-50 rounded-lg cursor-pointer"
                              >
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Date of Birth */}
                    <div>
                      <Label className="block text-sm font-medium mb-2">
                        Date of Birth <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full h-14 justify-start text-left font-normal pl-12 py-4 text-base bg-gray-50 border-gray-200 rounded-xl",
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
                              onSelect={(date) => handleDateChange("dob", date)}
                              initialFocus
                              disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                              className="rounded-xl"
                            />
                          </PopoverContent>
                        </Popover>
                        {errors.dob && <p className="text-red-500 text-sm mt-1">{errors.dob}</p>}
                      </div>
                    </div>

                    {/* Password */}
                    <div>
                      <Label className="block text-sm font-medium mb-2">
                        Password <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <PasswordInput
                          placeholder="Enter password"
                          value={formData.password}
                          onChange={(e) => handleInputChange("password", e.target.value)}
                          className={cn(
                            "pl-12 py-4 text-base bg-gray-50 border-gray-200 rounded-xl h-14",
                            errors.password ? "border-red-500 bg-red-50" : ""
                          )}
                        />
                        {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
                      </div>
                    </div>

                    {/* Biometric ID */}
                    <div>
                      <Label className="block text-sm font-medium mb-2">
                        Biometric ID
                      </Label>
                      <div className="relative">
                        <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2m-3 8V9a3 3 0 00-6 0v3m6 0a3 3 0 11-6 0" />
                        </svg>
                        <Input
                          type="text"
                          placeholder="Enter biometric ID (optional)"
                          value={formData.biometricId}
                          onChange={(e) => handleInputChange("biometricId", e.target.value)}
                          className="pl-12 py-4 text-base bg-gray-50 border-gray-200 rounded-xl h-14"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Course Information Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[#4F5077] border-b border-gray-200 pb-2">Course Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 text-[#7D8592]">
                    
                    {/* Category */}
                    <div>
                      <Label className="block text-sm font-medium mb-2">Category</Label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 pointer-events-none">
                          <FolderIcon className="w-5 h-5 text-gray-400" />
                        </div>
                        <Select
                          value={formData.category}
                          onValueChange={(value) => handleInputChange("category", value)}
                          disabled={isLoadingCategories}
                        >
                          <SelectTrigger className="!w-full !h-14 !pl-12 !pr-4 !py-4 !text-base !bg-gray-50 !border-gray-200 !rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent !min-h-14">
                            <SelectValue placeholder={isLoadingCategories ? "Loading categories..." : "Select Category"} className="text-gray-500" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border border-gray-200 bg-white shadow-lg max-h-60">
                            {categories.length > 0 ? (
                              categories.map((category) => (
                                <SelectItem key={category.id} value={category.id} className="!py-3 !pl-3 pr-8 text-base hover:bg-gray-50 rounded-lg cursor-pointer">
                                  {category.name}
                                </SelectItem>
                              ))
                            ) : (
                              <div className="p-4 text-center text-gray-500">
                                <p className="text-sm">No categories available</p>
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Course */}
                    <div>
                      <Label className="block text-sm font-medium mb-2">
                        Course <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 pointer-events-none">
                          <BookOpenIcon className="w-5 h-5 text-gray-400" />
                        </div>
                        <Select
                          value={formData.course}
                          onValueChange={(value) => handleInputChange("course", value)}
                          disabled={isLoadingCourses || !formData.branch}
                        >
                          <SelectTrigger className={cn(
                            "!w-full !h-14 !pl-12 !pr-4 !py-4 !text-base !bg-gray-50 !border-gray-200 !rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent !min-h-14",
                            errors.course ? "!border-red-500 !bg-red-50" : ""
                          )}>
                            <SelectValue placeholder={!formData.branch ? "Select a branch first" : isLoadingCourses ? "Loading courses..." : "Choose Course"} className="text-gray-500" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border border-gray-200 bg-white shadow-lg max-h-60">
                            {filteredCourses.length > 0 ? (
                              filteredCourses
                                .filter((course) => course && course.id && course.id.trim() !== '')
                                .map((course) => (
                                  <SelectItem key={course.id} value={course.id} className="!py-3 !pl-3 pr-8 text-base hover:bg-gray-50 rounded-lg cursor-pointer">
                                  <div className="flex flex-col">
                                    <span className="font-medium">{course.title}</span>
                                    <span className="text-xs text-gray-500">
                                      {course.code} • {course.difficulty_level} • {course.pricing?.currency} {course.pricing?.amount}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))
                            ) : (
                              <div className="p-4 text-center text-gray-500">
                                <p className="text-sm">No courses available</p>
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                        {errors.course && <p className="text-red-500 text-sm mt-1">{errors.course}</p>}
                      </div>
                    </div>

                    {/* Duration */}
                    <div>
                      <Label className="block text-sm font-medium mb-2">Duration</Label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 pointer-events-none">
                          <ClockIcon className="w-5 h-5 text-gray-400" />
                        </div>
                        <Select value={formData.duration} onValueChange={(value) => handleInputChange("duration", value)}>
                          <SelectTrigger className="!w-full !h-14 !pl-12 !pr-4 !py-4 !text-base !bg-gray-50 !border-gray-200 !rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent !min-h-14">
                            <SelectValue placeholder="Select Duration" className="text-gray-500" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border border-gray-200 bg-white shadow-lg max-h-60">
                            {durations.map((duration) => (
                              <SelectItem key={duration.id} value={duration.id} className="!py-3 !pl-3 pr-8 text-base hover:bg-gray-50 rounded-lg cursor-pointer">
                                {duration.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Course & Staff Assignments Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[#4F5077] border-b border-gray-200 pb-2">Course & Staff Assignments</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-[#7D8592]">

                    {/* Selected Course Display */}
                    <div>
                      <Label className="block text-sm font-medium mb-2">Selected Course</Label>
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                        {formData.course ? (
                          (() => {
                            const selectedCourse = filteredCourses.find(course => course.id === formData.course)
                            return selectedCourse ? (
                              <div className="flex flex-col space-y-2">
                                <div className="flex items-center space-x-2">
                                  <BookOpenIcon className="w-5 h-5 text-blue-500" />
                                  <span className="font-medium text-gray-900">{selectedCourse.title}</span>
                                </div>
                                <div className="text-sm text-gray-600">
                                  <p><span className="font-medium">Code:</span> {selectedCourse.code}</p>
                                  <p><span className="font-medium">Level:</span> {selectedCourse.difficulty_level}</p>
                                  <p><span className="font-medium">Duration:</span> {formData.duration || 'Not selected'}</p>
                                  <p><span className="font-medium">Price:</span> {selectedCourse.pricing?.currency} {selectedCourse.pricing?.amount}</p>
                                </div>
                              </div>
                            ) : (
                              <div className="text-center text-gray-500">
                                <BookOpenIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                <p className="text-sm">Course details not found</p>
                              </div>
                            )
                          })()
                        ) : (
                          <div className="text-center text-gray-500">
                            <BookOpenIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                            <p className="text-sm">No course selected</p>
                            <p className="text-xs">Please select a course from the Course Information section</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Assign Coach */}
                    <div>
                      <Label className="block text-sm font-medium mb-2">
                        Assign Coach/Instructor
                      </Label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 pointer-events-none">
                          <UserIcon className="w-5 h-5 text-gray-400" />
                        </div>
                        <Select
                          value={formData.assignedCoach}
                          onValueChange={(value) => handleInputChange("assignedCoach", value)}
                          disabled={isLoadingCoaches || !formData.course}
                        >
                          <SelectTrigger className="!w-full !h-14 !pl-12 !pr-4 !py-4 !text-base !bg-gray-50 !border-gray-200 !rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent !min-h-14">
                            <SelectValue
                              placeholder={
                                isLoadingCoaches ? "Loading coaches..." :
                                !formData.course ? "Select a course first" :
                                filteredCoaches.length === 0 ? "No coaches available" :
                                "Select Coach/Instructor"
                              }
                              className="text-gray-500"
                            />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border border-gray-200 bg-white shadow-lg max-h-60">
                            {filteredCoaches.length > 0 ? (
                              filteredCoaches.map((coach) => (
                                <SelectItem key={coach.id} value={coach.id} className="!py-3 !pl-3 pr-8 text-base hover:bg-gray-50 rounded-lg cursor-pointer">
                                  <div className="flex flex-col">
                                    <span className="font-medium">{coach.full_name || `${coach.first_name} ${coach.last_name}`}</span>
                                    <span className="text-xs text-gray-500">
                                      {coach.areas_of_expertise.slice(0, 2).join(', ')}
                                      {coach.areas_of_expertise.length > 2 && ` +${coach.areas_of_expertise.length - 2} more`}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))
                            ) : (
                              <div className="p-4 text-center text-gray-500">
                                <p className="text-sm">
                                  {!formData.course ? "Please select a course first" : "No coaches available for this course"}
                                </p>
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      {formData.assignedCoach && (
                        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          {(() => {
                            const selectedCoach = filteredCoaches.find(coach => coach.id === formData.assignedCoach)
                            return selectedCoach ? (
                              <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0">
                                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                                    <UserIcon className="w-4 h-4 text-white" />
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-blue-900">
                                    {selectedCoach.full_name || `${selectedCoach.first_name} ${selectedCoach.last_name}`}
                                  </p>
                                  <p className="text-xs text-blue-700">{selectedCoach.email}</p>
                                  <div className="mt-1">
                                    <p className="text-xs text-blue-600">
                                      <span className="font-medium">Expertise:</span> {selectedCoach.areas_of_expertise.join(', ')}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ) : null
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Payment Information Section */}
                {formData.course && formData.branch && formData.category && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">Payment Information</h3>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-yellow-800 mb-1">Payment Processing Enabled</h4>
                          <p className="text-sm text-yellow-700 mb-2">
                            Since you've selected a course and branch, this registration will include automatic payment processing.
                          </p>
                          <div className="text-xs text-yellow-600 space-y-1">
                            <p>• Payment method: Cash (default for manual registrations)</p>
                            <p>• Payment status: Will be marked as paid upon successful registration</p>
                            <p>• Student will receive payment confirmation via SMS</p>
                            <p>• Superadmin will be notified of the new registration and payment</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Location Information Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[#4F5077] border-b border-gray-200 pb-2">Location Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-[#7D8592]">

                    {geography.hasStates && (
                    <div>
                      <Label className="block text-sm font-medium mb-2">
                        State <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={geography.selectedStateId}
                        onValueChange={(value) => {
                          geography.setSelectedStateId(value)
                          handleInputChange("location", "")
                          handleInputChange("branch", "")
                        }}
                        disabled={isLoadingLocations}
                      >
                        <SelectTrigger className={cn(
                          "!w-full !h-14 !pl-4 !pr-4 !py-4 !text-base !bg-gray-50 !border-gray-200 !rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent !min-h-14"
                        )}>
                          <SelectValue placeholder={isLoadingLocations ? "Loading locations..." : "Select State"} className="text-gray-500" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border border-gray-200 bg-white shadow-lg max-h-60">
                          {geography.states.map((state) => (
                            <SelectItem key={state.id} value={state.id} className="!py-3 !pl-3 pr-8 text-base hover:bg-gray-50 rounded-lg cursor-pointer">
                              {state.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    )}
                    
                    {/* Location */}
                    <div>
                      <Label className="block text-sm font-medium mb-2">
                        Location <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 pointer-events-none">
                          <MapPinIcon className="w-5 h-5 text-gray-400" />
                        </div>
                        <Select
                          value={formData.location}
                          onValueChange={(value) => {
                            geography.setSelectedCityId(value)
                            handleInputChange("location", value)
                          }}
                          disabled={isLoadingLocations || (geography.hasStates && !geography.selectedStateId)}
                        >
                          <SelectTrigger className={cn(
                            "!w-full !h-14 !pl-12 !pr-4 !py-4 !text-base !bg-gray-50 !border-gray-200 !rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent !min-h-14",
                            errors.location ? "!border-red-500 !bg-red-50" : ""
                          )}>
                            <SelectValue placeholder={isLoadingLocations ? "Loading locations..." : "Select Location"} className="text-gray-500" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border border-gray-200 bg-white shadow-lg max-h-60">
                            {locations.length > 0 ? (
                              locations.map((location) => (
                                <SelectItem key={location.id} value={location.id} className="!py-3 !pl-3 pr-8 text-base hover:bg-gray-50 rounded-lg cursor-pointer">
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
                    </div>

                    {/* Branch */}
                    <div>
                      <Label className="block text-sm font-medium mb-2">
                        Branch <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 pointer-events-none">
                          <Building2Icon className="w-5 h-5 text-gray-400" />
                        </div>
                        <Select
                          value={formData.branch}
                          onValueChange={(value) => handleInputChange("branch", value)}
                          disabled={!formData.location || isLoadingBranches}
                        >
                          <SelectTrigger className={cn(
                            "!w-full !h-14 !pl-12 !pr-4 !py-4 !text-base !bg-gray-50 !border-gray-200 !rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent !min-h-14",
                            errors.branch ? "!border-red-500 !bg-red-50" : "",
                            (!formData.location || isLoadingBranches) ? "opacity-50 cursor-not-allowed !bg-gray-200" : ""
                          )}>
                            <SelectValue placeholder={
                              isLoadingBranches
                                ? "Loading branches..."
                                : !formData.location
                                  ? "Select location first"
                                  : "Select Branch"
                            } className="text-gray-500" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border border-gray-200 bg-white shadow-lg max-h-60">
                            {branches.length > 0 ? (
                              branches
                                .filter((branch) => branch && branch.id && branch.id.trim() !== '')
                                .map((branch) => (
                                  <SelectItem key={branch.id} value={branch.id} className="!py-3 !pl-3 pr-8 text-base hover:bg-gray-50 rounded-lg cursor-pointer">
                                  <div className="flex flex-col">
                                    <span className="font-medium">{branch.name}</span>
                                    <span className="text-xs text-gray-500">
                                      {branch.address?.city}, {branch.address?.state}
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
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-6 border-t border-gray-200">
                <div className="flex flex-col sm:flex-row gap-4 justify-center sm:justify-start">
                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full sm:w-auto h-12 bg-yellow-400 hover:bg-yellow-500 text-white font-semibold px-8 rounded-xl text-base transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black mr-3"></div>
                        Creating Student...
                      </div>
                    ) : (
                      "Save & Register Student"
                    )}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => router.push(`${basePath}/students`)}
                    disabled={isSubmitting}
                    className="w-full sm:w-auto h-12 px-8 rounded-xl text-base font-medium border-gray-300 hover:bg-gray-50 transition-all duration-200"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* Success Popup */}
      {showSuccessPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 transform animate-in slide-in-from-bottom-5">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Student Created Successfully!</h3>
              <p className="text-gray-600 mb-8 text-lg">The student has been added to the system successfully.</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={handleSuccessOk} 
                  className="bg-yellow-400 hover:bg-yellow-500 text-black font-semibold px-8 py-3 rounded-xl transition-all duration-200"
                >
                  View Students
                </Button>
                <Button 
                  onClick={handleSuccessOk} 
                  variant="outline"
                  className="px-8 py-3 rounded-xl font-semibold border-gray-300 hover:bg-gray-50 transition-all duration-200"
                >
                  Create Another
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
