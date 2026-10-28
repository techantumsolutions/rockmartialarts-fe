"use client"

import { getBackendApiUrl } from "@/lib/config"
import type React from "react"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, MapPinIcon, FolderIcon, BookOpenIcon, ClockIcon, UserIcon, MailIcon, PhoneIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { useRouter, useParams } from "next/navigation"
import Header from "@/components/layout/Header"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"
import { getActiveBranchId } from "@/lib/activeBranch"
import BranchSelectionField from "@/components/layout/BranchSelectionField"

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

interface FormErrors {
  [key: string]: string
}

export default function BranchManagerEditStudent() {
  const router = useRouter()
  const params = useParams()
  const studentId = params.id as string
  const branchManager = BranchManagerAuth.getCurrentUser()
  const headerBranchId =
    getActiveBranchId() ||
    branchManager?.branch_id ||
    branchManager?.managed_branches?.[0] ||
    ""

  // Loading states
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [branches, setBranches] = useState<Branch[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([])

  // API Loading states
  const [isLoadingLocations, setIsLoadingLocations] = useState(true)
  const [isLoadingCourses, setIsLoadingCourses] = useState(true)
  const [isLoadingCategories, setIsLoadingCategories] = useState(true)

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

    // Emergency Contact
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContactRelation: "",
  })

  const selectedManagerBranch = branches.find((branch) => branch.id === headerBranchId)

  useEffect(() => {
    if (!headerBranchId) return
    setFormData((current) =>
      current.branch === headerBranchId
        ? current
        : { ...current, branch: headerBranchId }
    )
  }, [headerBranchId])

  // Dynamic data will be loaded from APIs
  const durations = [
    { id: "1-month", name: "1 Month" },
    { id: "3-months", name: "3 Months" },
    { id: "6-months", name: "6 Months" },
    { id: "12-months", name: "12 Months" },
    { id: "lifetime", name: "Lifetime" }
  ]

  // Fetch student, branches and courses data
  useEffect(() => {
    const fetchData = async () => {
      if (!studentId) return

      setIsLoading(true)
      try {
        const token = BranchManagerAuth.getToken()
        if (!token) throw new Error("Authentication token not found.")

        // Fetch student data first - this is critical and should not fall back to mock data
        const studentResponse = await fetch(getBackendApiUrl(`users/${studentId}`), {
          headers: { 'Authorization': `Bearer ${token}` }
        })

        if (!studentResponse.ok) {
          if (studentResponse.status === 404) {
            throw new Error("Student not found")
          }
          if (studentResponse.status === 403) {
            throw new Error("You don't have permission to view this student")
          }
          throw new Error(`Failed to fetch student data: ${studentResponse.status}`)
        }

        const studentResponseData = await studentResponse.json()
        const studentData = studentResponseData.user || studentResponseData
        console.log("Successfully loaded student data from API:", studentData)

        // Load dynamic data from APIs in parallel
        const [locationsData, branchesData, coursesData, categoriesData] = await Promise.all([
          // Load locations
          (async () => {
            try {
              setIsLoadingLocations(true)
              const locationsResponse = await fetch(getBackendApiUrl('locations/public/details?active_only=true'))
              if (locationsResponse.ok) {
                const locationsData = await locationsResponse.json()
                const locations = locationsData.locations || []
                setLocations(locations)
                return locations
              }
              return []
            } catch (error) {
              console.error('Error loading locations:', error)
              return []
            } finally {
              setIsLoadingLocations(false)
            }
          })(),

          // Load branches - will be loaded dynamically when location is selected
          (async () => {
            setIsLoadingBranches(false)
            return []
          })(),

          // Load courses
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

          // Load categories
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
          })()
        ])

        // Helper function to find matching option by name/code using the loaded data
        const findOptionByIdentifier = (options: any[], identifier: string, searchFields: string[] = ['name', 'code', 'title']) => {
          if (!identifier || !options.length) return ""

          // First try exact ID match
          const exactMatch = options.find(option => option.id === identifier)
          if (exactMatch) return exactMatch.id

          // Then try matching by name, code, or title (case-insensitive)
          const fieldMatch = options.find(option =>
            searchFields.some(field =>
              option[field]?.toLowerCase() === identifier.toLowerCase()
            )
          )
          if (fieldMatch) return fieldMatch.id

          // Finally try partial matching
          const partialMatch = options.find(option =>
            searchFields.some(field =>
              option[field]?.toLowerCase().includes(identifier.toLowerCase()) ||
              identifier.toLowerCase().includes(option[field]?.toLowerCase())
            )
          )
          return partialMatch ? partialMatch.id : ""
        }

        // Map student data to form data with proper ID resolution using the loaded data
        const mappedFormData = {
          firstName: studentData.first_name || "",
          lastName: studentData.last_name || "",
          email: studentData.email || "",
          contactNumber: studentData.phone?.replace(studentData.country_code || "+91", "") || "",
          countryCode: studentData.country_code || "+91",
          gender: studentData.gender || "",
          dob: studentData.date_of_birth ? format(new Date(studentData.date_of_birth), "yyyy-MM-dd") : "",
          password: "", // Password should not be pre-filled
          biometricId: studentData.biometric_id || "",
          address: studentData.address?.line1 || "",
          area: studentData.address?.area || "",
          city: studentData.address?.city || "",
          state: studentData.address?.state || "",
          zipCode: studentData.address?.pincode || "",
          country: studentData.address?.country || "India",
          location: findOptionByIdentifier(locationsData, studentData.branch?.location_id || ""),
          branch: findOptionByIdentifier(branchesData, studentData.branch?.branch_id || ""),
          category: findOptionByIdentifier(categoriesData, studentData.course?.category_id || ""),
          course: findOptionByIdentifier(coursesData, studentData.course?.course_id || "", ['title', 'code', 'name']),
          duration: studentData.course?.duration || "",
          emergencyContactName: studentData.emergency_contact?.name || "",
          emergencyContactPhone: studentData.emergency_contact?.phone || "",
          emergencyContactRelation: studentData.emergency_contact?.relationship || "",
        }

        console.log("Student data:", studentData)
        console.log("Available locations:", locationsData)
        console.log("Available branches:", branchesData)
        console.log("Available categories:", categoriesData)
        console.log("Available courses:", coursesData)
        console.log("Mapped form data:", mappedFormData)

        setFormData(mappedFormData)

        if (studentData.date_of_birth) {
          setSelectedDate(new Date(studentData.date_of_birth))
        }

      } catch (error) {
        console.error('Error loading data:', error)
        setErrors({ submit: error instanceof Error ? error.message : 'Failed to load data.' })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [studentId])

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
        const response = await fetch(getBackendApiUrl(`branches/public/by-location/${formData.location}?active_only=true`))

        if (response.ok) {
          const data = await response.json()
          setBranches(data.branches || [])
        } else {
          console.error('Failed to load branches for location:', response.statusText)
          setBranches([])
        }
      } catch (error) {
        console.error('Error loading branches for location:', error)
        setBranches([])
      }
    }

    loadBranchesForLocation()
  }, [formData.location])

  // Clear branch selection when location changes
  useEffect(() => {
    if (headerBranchId) return
    if (formData.branch && formData.location) {
      // Check if current branch is still valid for the selected location
      const branchExists = branches.find(branch => branch.id === formData.branch)
      if (!branchExists) {
        setFormData(prev => ({ ...prev, branch: "" }))
      }
    }
  }, [branches, formData.branch, formData.location, headerBranchId])

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}
    if (!formData.firstName.trim()) newErrors.firstName = "First name is required"
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required"
    if (!formData.email.trim()) newErrors.email = "Email is required"
    if (!formData.contactNumber.trim()) newErrors.contactNumber = "Contact number is required"
    if (!formData.gender) newErrors.gender = "Gender is required"
    if (!formData.dob) newErrors.dob = "Date of birth is required"
    if (!formData.location) newErrors.location = "Location is required"
    if (!headerBranchId && !formData.branch) newErrors.branch = "Branch is required"
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
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      const token = BranchManagerAuth.getToken()
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
        course: formData.course ? {
          category_id: formData.category || "martial-arts",
          course_id: formData.course,
          duration: formData.duration || "3-months"
        } : undefined,
        branch: (headerBranchId || formData.branch) ? {
          location_id: formData.location || "hyderabad",
          branch_id: headerBranchId || formData.branch
        } : undefined
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
    router.push("/branch-manager-dashboard/students")
  }

  // Handle input changes
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }))
    }
  }

  // Handle date changes
  const handleDateChange = (field: string, date: Date | undefined) => {
    if (field === "dob") {
      setSelectedDate(date)
      setFormData(prev => ({ ...prev, dob: date ? date.toISOString().split('T')[0] : "" }))
    } else if (field === "joiningDate") {
      setJoiningDate(date)
    }
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }))
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Edit Student" role="branch_admin" />
        <main className="w-full p-4 lg:px-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading student data...</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (errors.submit) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Edit Student" role="branch_admin" />
        <main className="w-full p-4 lg:px-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Student</h2>
              <p className="text-gray-600 mb-4">{errors.submit}</p>
              <div className="space-x-4">
                <Button onClick={() => window.location.reload()} className="bg-yellow-400 hover:bg-yellow-500 text-black">
                  Try Again
                </Button>
                <Button onClick={() => router.push("/branch-manager-dashboard/students")} variant="outline">
                  Back to Students
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Edit Student" role="branch_admin" />

      <main className="w-full mx-auto p-4 sm:p-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 text-[#4F5077]">
          <div className="mb-4 sm:mb-0">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Edit Student</h1>
            <p className="text-[#7D8592] text-sm sm:text-base">Update the details for the student.</p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push("/branch-manager-dashboard/students")}
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

                    <div>
                      <Label className="block text-sm font-medium mb-2">Date of Birth <span className="text-red-500">*</span></Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn("w-full relative h-14 justify-start text-left font-normal pl-12 text-base bg-gray-50 border-gray-200 rounded-xl", !selectedDate && "text-gray-500", errors.dob && "border-red-500 bg-red-50")}
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
                  <h3 className="text-lg font-semibold text-[#4D5077] border-b border-gray-200 pb-2">Course Information</h3>
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
                          {durations.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[#4D5077] border-b border-gray-200 pb-2">Location Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-[#7F8592]">
                    <div>
                      <Label className="block text-sm font-medium mb-2">Location <span className="text-red-500">*</span></Label>
                      <Select
                        value={formData.location}
                        onValueChange={(value) => handleInputChange("location", value)}
                        disabled={isLoadingLocations}
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
                      <BranchSelectionField
                        id="branch"
                        branchName={selectedManagerBranch?.name}
                        className={cn(
                          "!w-full !h-14 !pl-12 !text-base !bg-gray-50 !border-gray-200 !rounded-xl",
                          errors.branch && "!border-red-500 !bg-red-50"
                        )}
                      />
                      {errors.branch && <p className="text-red-500 text-sm mt-1">{errors.branch}</p>}
                    </div>
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
                    onClick={() => router.push("/branch-manager-dashboard/students")}
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
                onClick={() => {
                  setShowSuccessPopup(false)
                  router.push("/branch-manager-dashboard/students")
                }}
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