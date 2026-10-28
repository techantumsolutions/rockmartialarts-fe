"use client"

import { getBackendApiUrl } from "@/lib/config"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, User, Award, MapPin, Phone, X } from "lucide-react"
import { useRouter } from "next/navigation"
import Header from "@/components/layout/Header"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"
import { useToast } from "@/hooks/use-toast"

// Interface definitions for API data
interface Branch {
  id: string
  branch: {
    name: string
    code: string
    email: string
    phone: string
    address: {
      line1: string
      area: string
      city: string
      state: string
      pincode: string
      country: string
    }
  }
  manager_id: string
  operational_details: {
    courses_offered: string[]
    timings: Array<{
      day: string
      open: string
      close: string
    }>
    holidays: string[]
  }
  assignments: {
    accessories_available: boolean
    courses: string[]
    branch_admins: string[]
  }
  bank_details: {
    bank_name: string
    account_number: string
    upi_id: string
  }
  is_active: boolean
  created_at: string
  updated_at: string
}

interface Course {
  id: string
  title: string
  code: string
  description: string
  martial_art_style_id: string
  difficulty_level: string
  category_id: string
  instructor_id: string
  student_requirements: {
    max_students: number
    min_age: number
    max_age: number
    prerequisites: string[]
  }
  course_content: {
    syllabus: string
    equipment_required: string[]
  }
  media_resources: {
    course_image_url?: string
    promo_video_url?: string
  }
  pricing: {
    currency: string
    amount: number
    branch_specific_pricing: boolean
  }
  settings: {
    offers_certification: boolean
    active: boolean
  }
  created_at: string
  updated_at: string
}

export default function AddCoachPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [createdCoachId, setCreatedCoachId] = useState<string | null>(null)

  // API data state
  const [branches, setBranches] = useState<Branch[]>([])
  const [isLoadingBranches, setIsLoadingBranches] = useState(true)
  const [courses, setCourses] = useState<Course[]>([])
  const [isLoadingCourses, setIsLoadingCourses] = useState(true)

  const [formData, setFormData] = useState({
    // Personal Information
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    gender: "",
    dateOfBirth: "",
    address: "",
    area: "",
    city: "",
    state: "",
    zipCode: "",
    country: "India",

    // Professional Information
    designation: "",
    experience: "",
    qualifications: "",
    certifications: "",
    specializations: [] as string[],

    // Assignment Details
    branch: "",
    courses: [] as string[],
    salary: "",
    joinDate: "",

    // Emergency Contact
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContactRelation: "",

    // Additional Information
    achievements: "",
    notes: "",
  })

  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  // Available options
  const designations = [
    "Senior Coach",
    "Coach Instructor",
    "Senior Instructor",
    "Instructor",
    "Assistant Instructor",
    "Head Coach",
    "Coach",
    "Assistant Coach"
  ]

  const specializations = [
    "Taekwondo",
    "Karate",
    "Kung Fu",
    "Kick Boxing",
    "Self Defense",
    "Mixed Martial Arts",
    "Judo",
    "Jiu-Jitsu",
    "Muay Thai",
    "Boxing",
    "Kuchipudi Dance",
    "Bharatanatyam",
    "Gymnastics",
    "Yoga"
  ]

  // Load data from APIs
  useEffect(() => {
    const loadBranches = async () => {
      try {
        setIsLoadingBranches(true)

        // Get current branch manager user data
        const currentBranchManager = BranchManagerAuth.getCurrentUser()
        const token = BranchManagerAuth.getToken()

        if (!currentBranchManager || !token) {
          console.log('No authenticated branch manager found')
          toast({
            title: "Authentication Error",
            description: "Please login as a branch manager to access branch data.",
            variant: "destructive",
          })
          setIsLoadingBranches(false)
          return
        }

        console.log('Current branch manager:', currentBranchManager)
        console.log('Branch manager ID:', currentBranchManager.id)

        // Call real backend API to get all branches
        const response = await fetch(getBackendApiUrl('branches?limit=100'), {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        })

        if (response.ok) {
          const data = await response.json()
          console.log('✅ All branches data from backend:', data)

          const allBranches = data.branches || []

          // Filter branches to only show those managed by the current branch manager
          const managedBranches = allBranches.filter((branch: Branch) => {
            const isManaged = branch.manager_id === currentBranchManager.id
            console.log(`Branch ${branch.branch?.name || 'Unknown'} (ID: ${branch.id}) - Manager ID: ${branch.manager_id}, Current Manager ID: ${currentBranchManager.id}, Is Managed: ${isManaged}`)
            return isManaged
          })

          console.log(`✅ Filtered branches for manager ${currentBranchManager.full_name}:`, managedBranches)
          console.log(`Total branches: ${allBranches.length}, Managed branches: ${managedBranches.length}`)

          // Set only the branches managed by this branch manager
          setBranches(managedBranches)

          // Show appropriate feedback to user
          if (managedBranches.length === 0) {
            toast({
              title: "No Branches Assigned",
              description: "You don't have any branches assigned to manage. Please contact your administrator.",
              variant: "destructive",
            })
          } else {
            console.log(`✅ Loaded ${managedBranches.length} managed branch(es) for ${currentBranchManager.full_name}`)
          }
        } else {
          console.error('Failed to load branches:', response.status, response.statusText)
          if (response.status === 401) {
            toast({
              title: "Authentication Error",
              description: "Please login again to access branch data.",
              variant: "destructive",
            })
          } else {
            toast({
              title: "Error",
              description: "Failed to load branches. Please try again.",
              variant: "destructive",
            })
          }
        }
      } catch (error) {
        console.error('Error loading branches:', error)
        toast({
          title: "Error",
          description: "Failed to load branches. Please check your connection.",
          variant: "destructive",
        })
      } finally {
        setIsLoadingBranches(false)
      }
    }

    const loadCourses = async () => {
      try {
        setIsLoadingCourses(true)

        // Use public endpoint for courses (no authentication required)
        const coursesResponse = await fetch(getBackendApiUrl('courses/public/all'), {
          headers: {
            'Content-Type': 'application/json'
          }
        })

        if (coursesResponse.ok) {
          const coursesData = await coursesResponse.json()
          setCourses(coursesData.courses || [])
          console.log('✅ Loaded courses from backend:', coursesData.courses?.length || 0)
        } else {
          console.error('Failed to load courses:', coursesResponse.statusText)
          toast({
            title: "Error",
            description: "Failed to load courses. Please try again.",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error('Error loading courses:', error)
        toast({
          title: "Error",
          description: "Failed to load courses. Please check your connection.",
          variant: "destructive",
        })
      } finally {
        setIsLoadingCourses(false)
      }
    }

    const loadData = async () => {
      await Promise.all([loadBranches(), loadCourses()])
    }

    loadData()
  }, [toast])

  const handleSpecializationToggle = (specialization: string) => {
    setFormData(prev => ({
      ...prev,
      specializations: prev.specializations.includes(specialization)
        ? prev.specializations.filter(s => s !== specialization)
        : [...prev.specializations, specialization]
    }))
  }

  const handleCourseToggle = (courseId: string) => {
    setFormData(prev => ({
      ...prev,
      courses: prev.courses.includes(courseId)
        ? prev.courses.filter(c => c !== courseId)
        : [...prev.courses, courseId]
    }))
  }

  const sendCredentialsEmail = async () => {
    if (!createdCoachId) {
      toast({
        title: "Error",
        description: "No coach ID available for sending credentials",
        variant: "destructive",
      })
      return
    }

    setIsSendingEmail(true)
    try {
      const token = BranchManagerAuth.getToken()
      if (!token) {
        throw new Error("Authentication token not found")
      }

      const response = await fetch(getBackendApiUrl(`coaches/${createdCoachId}/send-credentials`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || errorData.message || 'Failed to send credentials email')
      }

      toast({
        title: "Success",
        description: "Login credentials have been sent to the coach's email address",
      })
    } catch (error) {
      console.error("Error sending credentials email:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send credentials email",
        variant: "destructive",
      })
    } finally {
      setIsSendingEmail(false)
    }
  }

  function formatIndianPhoneNumber(value: string): string {
    let digits = value.replace(/\D/g, "")
    if (digits.length === 12 && digits.startsWith("91")) {
      digits = digits.slice(2)
    } else if (digits.length === 11 && digits.startsWith("0")) {
      digits = digits.slice(1)
    }
    return digits.slice(0, 10)
  }

  function normalizeToYYYYMMDD(dateStr?: string | null): string {
    if (!dateStr || !String(dateStr).trim()) return ""
    const cleaned = String(dateStr).trim()

    // Strip time portion if present (e.g. ISO string or "2024-05-12 00:00:00")
    const datePart = cleaned.split(/[T\s]/)[0].trim()

    // 1. Direct YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
      const [y, m, d] = datePart.split("-").map(Number)
      if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        return datePart
      }
      // Handle swapped month/day (e.g. YYYY-DD-MM)
      if (m > 12 && d <= 12) {
        return `${y}-${String(d).padStart(2, "0")}-${String(m).padStart(2, "0")}`
      }
    }

    // 2. YYYY[-/:.]MM[-/:.]DD
    const ymdMatch = datePart.match(/^(\d{4})\s*[-/:.]\s*(\d{1,2})\s*[-/:.]\s*(\d{1,2})$/)
    if (ymdMatch) {
      const y = Number(ymdMatch[1])
      let m = Number(ymdMatch[2])
      let d = Number(ymdMatch[3])
      if (m > 12 && d <= 12) {
        const temp = m
        m = d
        d = temp
      }
      return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`
    }

    // 3. DD[-/:.]MM[-/:.]YYYY or MM[-/:.]DD[-/:.]YYYY (supports DD:MM:YYYY, DD/MM/YYYY, etc.)
    const dmyMatch = datePart.match(/^(\d{1,2})\s*[-/:.]\s*(\d{1,2})\s*[-/:.]\s*(\d{4})$/)
    if (dmyMatch) {
      const p1 = Number(dmyMatch[1])
      const p2 = Number(dmyMatch[2])
      const y = Number(dmyMatch[3])
      let d = p1
      let m = p2
      // If p2 > 12 and p1 <= 12, it must be MM-DD-YYYY
      if (p2 > 12 && p1 <= 12) {
        m = p1
        d = p2
      }
      return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`
    }

    // 4. Try JS native Date
    const parsed = new Date(cleaned)
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear()
      const m = String(parsed.getMonth() + 1).padStart(2, "0")
      const d = String(parsed.getDate()).padStart(2, "0")
      return `${y}-${m}-${d}`
    }

    return cleaned
  }

  const FIELD_ORDER = [
    "firstName",
    "lastName",
    "email",
    "password",
    "phone",
    "gender",
    "dateOfBirth",
    "designation",
    "experience",
    "specializations",
    "branch",
    "emergencyContactPhone",
  ]

  const scrollToFirstError = (validationErrors: Record<string, string>) => {
    const firstErrorKey = FIELD_ORDER.find((key) => Boolean(validationErrors[key]))
    if (!firstErrorKey) return

    const inputElement =
      document.getElementById(firstErrorKey) ||
      document.querySelector(`[name="${firstErrorKey}"]`)

    // Always prefer the field's label or parent container so the label is fully visible when scrolled
    const labelElement =
      document.querySelector(`label[for="${firstErrorKey}"]`) ||
      document.querySelector(`[data-label-for="${firstErrorKey}"]`)

    const scrollTarget =
      labelElement ||
      inputElement?.closest(".space-y-2") ||
      inputElement?.parentElement ||
      inputElement

    if (scrollTarget) {
      // 130px offset gives ample breathing room below the sticky navbar to display the field label
      const navOffset = 130
      const elementPosition = scrollTarget.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - navOffset

      window.scrollTo({
        top: Math.max(0, offsetPosition),
        behavior: "smooth",
      })

      setTimeout(() => {
        const focusable = inputElement?.matches("input, select, textarea, button")
          ? inputElement
          : inputElement?.querySelector<HTMLElement>("input, select, textarea, button")

        if (focusable && typeof focusable.focus === "function") {
          focusable.focus({ preventScroll: true })
        }
      }, 350)
    }
  }

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    // Basic required fields
    if (!formData.firstName.trim()) newErrors.firstName = "First name is required"
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required"
    if (!formData.email.trim()) newErrors.email = "Email is required"
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required"
    } else if (!/^[6-9]\d{9}$/.test(formData.phone.trim())) {
      newErrors.phone = "Please enter a valid 10-digit Indian phone number (starting with 6, 7, 8, or 9)"
    }
    if (formData.emergencyContactPhone && !/^[6-9]\d{9}$/.test(formData.emergencyContactPhone.trim())) {
      newErrors.emergencyContactPhone = "Please enter a valid 10-digit Indian phone number"
    }
    if (!formData.password.trim()) {
      newErrors.password = "Password is required"
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters long"
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(formData.password)) {
      newErrors.password = "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    }
    if (!formData.gender) newErrors.gender = "Gender is required"
    if (!formData.dateOfBirth.trim()) {
      newErrors.dateOfBirth = "Date of birth is required"
    } else {
      const normalizedDob = normalizeToYYYYMMDD(formData.dateOfBirth)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDob)) {
        newErrors.dateOfBirth = "Please enter a valid date of birth"
      } else {
        const [y, m, d] = normalizedDob.split("-").map(Number)
        const currentYear = new Date().getFullYear()
        if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1920 || y > currentYear) {
          newErrors.dateOfBirth = "Please enter a valid date of birth"
        }
      }
    }
    if (!formData.designation) newErrors.designation = "Designation is required"
    if (!formData.experience) newErrors.experience = "Experience is required"
    if (formData.specializations.length === 0) newErrors.specializations = "At least one specialization is required"

    // Branch assignment validation - only validate if branches are available
    if (branches.length === 0) {
      newErrors.branch = "No branches available for assignment. Please contact your administrator."
      toast({
        title: "Cannot Create Coach",
        description: "You don't have any branches assigned to manage. Please contact your administrator to assign branches to your account before creating coaches.",
        variant: "destructive",
      })
    } else if (!formData.branch) {
      newErrors.branch = "Branch assignment is required"
    }

    setErrors(newErrors)

    const hasErrors = Object.keys(newErrors).length > 0
    if (hasErrors) {
      scrollToFirstError(newErrors)
    }

    return !hasErrors
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      toast({
        title: "Required Fields Missing",
        description: "Please fill out all highlighted fields.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Prepare coach data according to backend API specification
      const coachData = {
        personal_info: {
          first_name: formData.firstName,
          last_name: formData.lastName,
          gender: formData.gender,
          date_of_birth: normalizeToYYYYMMDD(formData.dateOfBirth)
        },
        contact_info: {
          email: formData.email,
          country_code: "+91", // Default for India
          phone: formData.phone,
          password: formData.password
        },
        address_info: {
          address: formData.address,
          area: formData.area || formData.city, // Use area if provided, otherwise city
          city: formData.city,
          state: formData.state,
          zip_code: formData.zipCode,
          country: formData.country
        },
        professional_info: {
          education_qualification: formData.qualifications,
          professional_experience: formData.experience,
          designation_id: formData.designation,
          certifications: formData.certifications ? formData.certifications.split(',').map(cert => cert.trim()) : []
        },
        areas_of_expertise: formData.specializations,
        branch_id: formData.branch || null,  // Include branch assignment
        assignment_details: {
          courses: formData.courses,  // Include course assignments
          salary: formData.salary ? parseFloat(formData.salary) : null,
          join_date: normalizeToYYYYMMDD(formData.joinDate) || null
        },
        emergency_contact: {
          name: formData.emergencyContactName || null,
          phone: formData.emergencyContactPhone || null,
          relationship: formData.emergencyContactRelation || null
        }
      }

      console.log("Creating coach with data:", coachData)

      // Log branch and course assignments for debugging
      if (formData.branch || formData.courses.length > 0) {
        console.log("Branch and course assignments:", {
          selectedBranch: formData.branch,
          selectedCourses: formData.courses,
          assignmentDetails: coachData.assignment_details
        })
      }

      // Get authentication token
      const token = BranchManagerAuth.getToken()
      if (!token) {
        throw new Error("Authentication token not found. Please login again.")
      }

      // Call the backend API
      const response = await fetch(getBackendApiUrl('coaches'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(coachData)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.detail || result.message || `Failed to create coach (${response.status})`)
      }

      console.log("Coach created successfully:", result)

      // Store the created coach ID for sending credentials
      if (result.coach && result.coach.id) {
        setCreatedCoachId(result.coach.id)
      } else if (result.id) {
        setCreatedCoachId(result.id)
      }

      setShowSuccessPopup(true)

      // Reset form after successful submission (removed auto-redirect to allow email sending)
      // User can manually navigate using the buttons in the success popup

    } catch (error) {
      console.error("Error creating coach:", error)
      // You might want to show an error message to the user here
      alert(`Error creating coach: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Add Coach" role="branch_admin" />

      <main className="w-full py-4 px-19 lg:py-6">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => router.push("/branch-manager-dashboard/coaches")}
              className="flex items-center space-x-2 hover:bg-gray-100"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-[#4F5077]">Back to Coaches</span>
            </Button>
            <div className="w-px h-6 bg-gray-300"></div>
            <h1 className="text-2xl font-bold text-[#4F5077]">Add New Coach</h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 ">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">

                <span className="text-[#4F5077]">Personal Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-[#7D8592]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="Enter first name"
                    className={errors.firstName ? "border-red-500" : ""}
                  />
                  {errors.firstName && <p className="text-red-500 text-sm">{errors.firstName}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Enter last name"
                    className={errors.lastName ? "border-red-500" : ""}
                  />
                  {errors.lastName && <p className="text-red-500 text-sm">{errors.lastName}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Enter email address"
                    className={errors.email ? "border-red-500" : ""}
                  />
                  {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <PasswordInput
                    id="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Enter secure password"
                    className={errors.password ? "border-red-500" : ""}
                  />
                  {errors.password && <p className="text-red-500 text-sm">{errors.password}</p>}
                  <p className="text-xs text-gray-500">
                    Password must be at least 8 characters with uppercase, lowercase, number, and special character
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: formatIndianPhoneNumber(e.target.value) })}
                    placeholder="10-digit Indian phone number"
                    className={errors.phone ? "border-red-500" : ""}
                  />
                  {errors.phone && <p className="text-red-500 text-sm">{errors.phone}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender *</Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(value) => setFormData({ ...formData, gender: value })}
                  >
                    <SelectTrigger id="gender" className={errors.gender ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.gender && <p className="text-red-500 text-sm">{errors.gender}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className={errors.dateOfBirth ? "border-red-500" : ""}
                  />
                  {errors.dateOfBirth && <p className="text-red-500 text-sm">{errors.dateOfBirth}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Select
                    value={formData.country}
                    onValueChange={(value) => setFormData({ ...formData, country: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="India">India</SelectItem>
                      <SelectItem value="USA">USA</SelectItem>
                      <SelectItem value="UK">UK</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Enter complete address"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="area">Area/Locality</Label>
                  <Input
                    id="area"
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    placeholder="Enter area or locality"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Enter city"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="State"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zipCode">ZIP Code</Label>
                  <Input
                    id="zipCode"
                    value={formData.zipCode}
                    onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                    placeholder="ZIP Code"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Professional Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Award className="w-5 h-5 text-yellow-600" />
                <span className="text-[#4F5077]">Professional Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-[#7D8592]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="designation">Designation *</Label>
                  <Select
                    value={formData.designation}
                    onValueChange={(value) => setFormData({ ...formData, designation: value })}
                  >
                    <SelectTrigger id="designation" className={errors.designation ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select designation" />
                    </SelectTrigger>
                    <SelectContent>
                      {designations.map((designation) => (
                        <SelectItem key={designation} value={designation}>
                          {designation}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.designation && <p className="text-red-500 text-sm">{errors.designation}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="experience">Experience *</Label>
                  <Select
                    value={formData.experience}
                    onValueChange={(value) => setFormData({ ...formData, experience: value })}
                  >
                    <SelectTrigger id="experience" className={errors.experience ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select experience" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0-1 years">0-1 years</SelectItem>
                      <SelectItem value="1-3 years">1-3 years</SelectItem>
                      <SelectItem value="3-5 years">3-5 years</SelectItem>
                      <SelectItem value="5-10 years">5-10 years</SelectItem>
                      <SelectItem value="10+ years">10+ years</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.experience && <p className="text-red-500 text-sm">{errors.experience}</p>}
                </div>
              </div>

              <div id="specializations" className="space-y-2">
                <Label>Specializations *</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {specializations.map((specialization) => (
                    <div key={specialization} className="flex items-center space-x-2">
                      <Checkbox
                        id={specialization}
                        checked={formData.specializations.includes(specialization)}
                        onCheckedChange={() => handleSpecializationToggle(specialization)}
                      />
                      <Label htmlFor={specialization} className="text-sm cursor-pointer">
                        {specialization}
                      </Label>
                    </div>
                  ))}
                </div>
                {errors.specializations && <p className="text-red-500 text-sm">{errors.specializations}</p>}

                {formData.specializations.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.specializations.map((spec) => (
                      <Badge key={spec} variant="secondary" className="bg-yellow-100 text-yellow-800">
                        {spec}
                        <button
                          type="button"
                          onClick={() => handleSpecializationToggle(spec)}
                          className="ml-2 hover:text-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="qualifications">Qualifications</Label>
                  <Textarea
                    id="qualifications"
                    value={formData.qualifications}
                    onChange={(e) => setFormData({ ...formData, qualifications: e.target.value })}
                    placeholder="Educational qualifications"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="certifications">Certifications</Label>
                  <Textarea
                    id="certifications"
                    value={formData.certifications}
                    onChange={(e) => setFormData({ ...formData, certifications: e.target.value })}
                    placeholder="Professional certifications"
                    rows={3}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assignment Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5 text-yellow-600" />
                <span className="text-[#4F5077]">Assignment Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-[#7D8592]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="branch">Branch Assignment *</Label>
                  <Select
                    value={formData.branch}
                    onValueChange={(value) => setFormData({ ...formData, branch: value })}
                    disabled={isLoadingBranches || branches.length === 0}
                  >
                    <SelectTrigger id="branch" className={errors.branch ? "border-red-500" : branches.length === 0 && !isLoadingBranches ? "border-orange-300 bg-orange-50" : ""}>
                      <SelectValue placeholder={
                        isLoadingBranches
                          ? "Loading your branches..."
                          : branches.length === 0
                            ? "No branches assigned to you"
                            : "Select branch to assign coach"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.length === 0 && !isLoadingBranches ? (
                        <SelectItem value="no-branches" disabled>
                          No branches available for assignment
                        </SelectItem>
                      ) : (
                        branches.map((branch) => (
                          <SelectItem key={branch.id} value={branch.id}>
                            {branch.branch?.name || 'Unnamed Branch'} - {branch.branch?.address?.city || 'Location not specified'}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {errors.branch && <p className="text-red-500 text-sm">{errors.branch}</p>}
                  {branches.length === 0 && !isLoadingBranches && (
                    <p className="text-sm text-orange-600">
                      You don't have any branches assigned to manage. Please contact your administrator to assign branches to your account.
                    </p>
                  )}
                  {branches.length > 0 && (
                    <p className="text-sm text-gray-500">
                      You can assign coaches to {branches.length} branch{branches.length > 1 ? 'es' : ''} that you manage.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="salary">Salary (Optional)</Label>
                  <Input
                    id="salary"
                    type="number"
                    value={formData.salary}
                    onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                    placeholder="Monthly salary amount"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="joinDate">Join Date</Label>
                  <Input
                    id="joinDate"
                    type="date"
                    value={formData.joinDate}
                    onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Course Assignments</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-48 overflow-y-auto border rounded-md p-3">
                  {isLoadingCourses ? (
                    <p className="text-gray-500">Loading courses...</p>
                  ) : courses.length === 0 ? (
                    <p className="text-gray-500">No courses available</p>
                  ) : (
                    courses.map((course) => (
                      <div key={course.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={course.id}
                          checked={formData.courses.includes(course.id)}
                          onCheckedChange={() => handleCourseToggle(course.id)}
                        />
                        <Label htmlFor={course.id} className="text-sm cursor-pointer">
                          {course.title}
                        </Label>
                      </div>
                    ))
                  )}
                </div>

                {formData.courses.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.courses.map((courseId) => {
                      const course = courses.find(c => c.id === courseId)
                      return course ? (
                        <Badge key={courseId} variant="secondary" className="bg-blue-100 text-blue-800">
                          {course.title}
                          <button
                            type="button"
                            onClick={() => handleCourseToggle(courseId)}
                            className="ml-2 hover:text-red-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ) : null
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Phone className="w-5 h-5 text-yellow-600" />
                <span className="text-[#4F5077]">Emergency Contact</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-[#7D8592]">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emergencyContactName">Contact Name</Label>
                  <Input
                    id="emergencyContactName"
                    value={formData.emergencyContactName}
                    onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                    placeholder="Enter contact name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergencyContactPhone">Contact Phone</Label>
                  <Input
                    id="emergencyContactPhone"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={formData.emergencyContactPhone}
                    onChange={(e) => setFormData({ ...formData, emergencyContactPhone: formatIndianPhoneNumber(e.target.value) })}
                    placeholder="10-digit Indian phone number"
                    className={errors.emergencyContactPhone ? "border-red-500" : ""}
                  />
                  {errors.emergencyContactPhone && <p className="text-red-500 text-sm">{errors.emergencyContactPhone}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergencyContactRelation">Relationship</Label>
                  <Select
                    value={formData.emergencyContactRelation}
                    onValueChange={(value) => setFormData({ ...formData, emergencyContactRelation: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select relationship" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Parent">Parent</SelectItem>
                      <SelectItem value="Spouse">Spouse</SelectItem>
                      <SelectItem value="Sibling">Sibling</SelectItem>
                      <SelectItem value="Friend">Friend</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-[#4F5077]">Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-[#7D8592]">
              <div className="space-y-2">
                <Label htmlFor="achievements">Achievements</Label>
                <Textarea
                  id="achievements"
                  value={formData.achievements}
                  onChange={(e) => setFormData({ ...formData, achievements: e.target.value })}
                  placeholder="Notable achievements, awards, or recognitions"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any additional information or special notes"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/branch-manager-dashboard")}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || branches.length === 0}
              className={`${branches.length === 0
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-yellow-400 hover:bg-yellow-500 text-black"
              }`}
              title={branches.length === 0 ? "No branches available for assignment" : ""}
            >
              {isSubmitting
                ? "Creating Coach..."
                : branches.length === 0
                  ? "No Branches Available"
                  : "Create Coach"
              }
            </Button>
          </div>

          {/* No Branches Warning */}
          {branches.length === 0 && !isLoadingBranches && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mt-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-orange-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-orange-800">No Branches Assigned</h3>
                  <p className="text-sm text-orange-700 mt-1">
                    You cannot create coaches because you don't have any branches assigned to manage.
                    Please contact your system administrator to assign branches to your account.
                  </p>
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Success Popup */}
        {showSuccessPopup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Coach Created Successfully!</h3>
                <p className="text-gray-600 mb-4">The coach has been created and added to the system.</p>
                <div className="flex space-x-3">
                  <Button
                    onClick={sendCredentialsEmail}
                    disabled={isSendingEmail}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    {isSendingEmail ? "Sending..." : "Send Credentials via Email"}
                  </Button>
                  <Button
                    onClick={() => router.push("/branch-manager-dashboard")}
                    variant="outline"
                    className="flex-1"
                  >
                    Done
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
