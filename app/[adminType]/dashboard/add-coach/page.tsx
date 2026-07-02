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
import { ArrowLeft, User, Award, MapPin, Phone, X, Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { useDashboardBasePath } from "@/lib/useDashboardBasePath"
import { TokenManager } from "@/lib/tokenManager"
import { SafeImage } from "@/components/ui/safe-image"
import { extractUploadUrl, uploadFile } from "@/lib/upload"
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
  const basePath = useDashboardBasePath()
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
    qualifications: [] as Array<{name: string, year: string}>,
    certifications: "",
    category: "",
    subCategory: "",
    certificates: [] as Array<{title: string, file: File | null, preview: string}>,
    category: "",
    subCategory: "",
    certificationFiles: [] as File[],

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

    // Profile & public homepage
    profileImageFile: null as File | null,
    profileImagePreview: "",
    profileImageUrl: "",
    aboutShort: "",
    featuredOnHomepage: false,
    homepageRating: "",
    displayOrder: "",
  })

  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [categories, setCategories] = useState<any[]>([])
  const [subCategories, setSubCategories] = useState<any[]>([])
  const [designations, setDesignations] = useState<string[]>([])
  const [qualifications, setQualifications] = useState<string[]>([])
  const [passingYears, setPassingYears] = useState<string[]>([])
  const [genders, setGenders] = useState<string[]>([])
  const [countries, setCountries] = useState<string[]>([])
  const [experienceRanges, setExperienceRanges] = useState<string[]>([])
  const [relations, setRelations] = useState<string[]>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(false)




  // Handle certification file uploads
  const handleCertificationUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files)
      setFormData(prev => ({
        ...prev,
        certificationFiles: [...prev.certificationFiles, ...filesArray]
      }))
    }
  }

  // Qualification handlers
  const addQualification = () => {
    setFormData(prev => ({
      ...prev,
      qualifications: [...prev.qualifications, { name: '', year: '' }]
    }))
  }

  const updateQualification = (index: number, field: 'name' | 'year', value: string) => {
    setFormData(prev => ({
      ...prev,
      qualifications: prev.qualifications.map((q, i) => 
        i === index ? { ...q, [field]: value } : q
      )
    }))
  }

  const removeQualification = (index: number) => {
    setFormData(prev => ({
      ...prev,
      qualifications: prev.qualifications.filter((_, i) => i !== index)
    }))
  }

  // Certificate handlers
  const addCertificate = () => {
    setFormData(prev => ({
      ...prev,
      certificates: [...prev.certificates, { title: '', file: null, preview: '' }]
    }))
  }

  const updateCertificateTitle = (index: number, title: string) => {
    setFormData(prev => ({
      ...prev,
      certificates: prev.certificates.map((c, i) => 
        i === index ? { ...c, title } : c
      )
    }))
  }

  const handleCertificateFileChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      const preview = URL.createObjectURL(file)
      setFormData(prev => ({
        ...prev,
        certificates: prev.certificates.map((c, i) => 
          i === index ? { ...c, file, preview } : c
        )
      }))
    }
  }

  const removeCertificate = (index: number) => {
    const cert = formData.certificates[index]
    if (cert.preview) URL.revokeObjectURL(cert.preview)
    setFormData(prev => ({
      ...prev,
      certificates: prev.certificates.filter((_, i) => i !== index)
    }))
  }

  const removeCertificationFile = (index: number) => {
    setFormData(prev => ({
      ...prev,
      certificationFiles: prev.certificationFiles.filter((_, i) => i !== index)
    }))
  }

  // Load subcategories when category is selected
  const loadSubCategories = async (categoryId: string) => {
    console.log('loadSubCategories called with categoryId:', categoryId)
    if (!categoryId) {
      setSubCategories([])
      return
    }
    
    try {
      const token = TokenManager.getToken()
      const url = getBackendApiUrl(`categories?parent_id=${categoryId}&active_only=true`)
      console.log('Fetching subcategories from:', url)
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      console.log('Subcategories response status:', response.status)
      if (response.ok) {
        const data = await response.json()
        console.log('Subcategories data received:', data)
        const subcats = data.categories || []
        setSubCategories(subcats)
        console.log('SubCategories state set to:', subcats)
      } else {
        console.error('Failed to load subcategories')
        setSubCategories([])
      }
    } catch (error) {
      console.error('Error loading subcategories:', error)
      setSubCategories([])
    }
  }


  // Load designations from dropdown settings
  const loadDesignations = async () => {
    try {
      const token = TokenManager.getToken()
      const response = await fetch(getBackendApiUrl('dropdown-settings/designations'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('Designations data received:', data)
        const values = data.filter((opt: any) => opt.is_active).map((opt: any) => opt.value)
        if (!values.includes("Founder")) {
          values.unshift("Founder")
        }
        setDesignations(values)
      } else {
        console.warn('Failed to load designations, using defaults')
        setDesignations([
          "Founder",
          "Chief Instructor",
          "Senior Instructor",
          "Instructor",
          "Assistant Instructor",
          "Head Coach",
          "Coach",
          "Assistant Coach"
        ])
      }
    } catch (error) {
      console.error('Error loading designations:', error)
      setDesignations([
        "Founder",
        "Chief Instructor",
        "Senior Instructor",
        "Instructor",
        "Assistant Instructor",
        "Head Coach",
        "Coach",
        "Assistant Coach"
      ])
    }
  }

  // Load genders from dropdown settings
  const loadGenders = async () => {
    try {
      const token = TokenManager.getToken()
      const response = await fetch(getBackendApiUrl('dropdown-settings/genders'), {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      })
      if (response.ok) {
        const data = await response.json()
        setGenders(data.filter((opt: any) => opt.is_active).map((opt: any) => opt.value))
      } else {
        setGenders(["Male", "Female", "Other"])
      }
    } catch (error) {
      console.error('Error loading genders:', error)
      setGenders(["Male", "Female", "Other"])
    }
  }

  // Load countries from dropdown settings
  const loadCountries = async () => {
    try {
      const token = TokenManager.getToken()
      const response = await fetch(getBackendApiUrl('dropdown-settings/countries'), {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      })
      if (response.ok) {
        const data = await response.json()
        setCountries(data.filter((opt: any) => opt.is_active).map((opt: any) => opt.value))
      } else {
        setCountries(["India", "USA", "UK", "Canada", "Australia"])
      }
    } catch (error) {
      console.error('Error loading countries:', error)
      setCountries(["India", "USA", "UK", "Canada", "Australia"])
    }
  }

  // Load experience ranges from dropdown settings
  const loadExperienceRanges = async () => {
    try {
      const token = TokenManager.getToken()
      const response = await fetch(getBackendApiUrl('dropdown-settings/experience_ranges'), {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      })
      if (response.ok) {
        const data = await response.json()
        setExperienceRanges(data.filter((opt: any) => opt.is_active).map((opt: any) => opt.value))
      } else {
        setExperienceRanges(["0-1 years", "1-3 years", "3-5 years", "5-10 years", "10+ years"])
      }
    } catch (error) {
      console.error('Error loading experience ranges:', error)
      setExperienceRanges(["0-1 years", "1-3 years", "3-5 years", "5-10 years", "10+ years"])
    }
  }

  // Load relations from dropdown settings
  const loadRelations = async () => {
    try {
      const token = TokenManager.getToken()
      const response = await fetch(getBackendApiUrl('dropdown-settings/emergency_relations'), {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      })
      if (response.ok) {
        const data = await response.json()
        setRelations(data.filter((opt: any) => opt.is_active).map((opt: any) => opt.value))
      } else {
        setRelations(["Parent", "Spouse", "Sibling", "Friend", "Other"])
      }
    } catch (error) {
      console.error('Error loading relations:', error)
      setRelations(["Parent", "Spouse", "Sibling", "Friend", "Other"])
    }
  }

  // Load qualifications from dropdown settings
  const loadQualifications = async () => {
    try {
      const token = TokenManager.getToken()
      const response = await fetch(getBackendApiUrl('dropdown-settings/qualifications'), {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      })
      if (response.ok) {
        const data = await response.json()
        setQualifications(data.filter((opt: any) => opt.is_active).map((opt: any) => opt.value))
      } else {
        setQualifications(["High School", "Intermediate", "Diploma", "Graduation", "Post Graduation", "Doctorate"])
      }
    } catch (error) {
      console.error('Error loading qualifications:', error)
      setQualifications(["High School", "Intermediate", "Diploma", "Graduation", "Post Graduation", "Doctorate"])
    }
  }

  // Load passing years from dropdown settings
  const loadPassingYears = async () => {
    try {
      const token = TokenManager.getToken()
      const response = await fetch(getBackendApiUrl('dropdown-settings/passing_years'), {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      })
      if (response.ok) {
        const data = await response.json()
        setPassingYears(data.filter((opt: any) => opt.is_active).map((opt: any) => opt.value))
      } else {
        const currentYear = new Date().getFullYear()
        const years = []
        for (let i = 0; i < 51; i++) years.push(String(currentYear - i))
        setPassingYears(years)
      }
    } catch (error) {
      console.error('Error loading passing years:', error)
      const currentYear = new Date().getFullYear()
      const years = []
      for (let i = 0; i < 51; i++) years.push(String(currentYear - i))
      setPassingYears(years)
    }
  }

  // Load categories
  const loadCategories = async () => {
    try {
      setIsLoadingCategories(true)
      const response = await fetch(getBackendApiUrl('categories/public/all'))
      
      if (response.ok) {
        const data = await response.json()
        setCategories(data.categories || [])
        console.log('✅ Loaded categories:', data.categories?.length || 0)
      } else {
        console.error('Failed to load categories')
      }
    } catch (error) {
      console.error('Error loading categories:', error)
      toast({
        title: "Error",
        description: "Failed to load categories",
        variant: "destructive"
      })
    } finally {
      setIsLoadingCategories(false)
    }
  }

    // Load data from APIs
  useEffect(() => {
    loadDesignations()
    loadGenders()
    loadCountries()
    loadExperienceRanges()
    loadRelations()
    loadQualifications()
    loadPassingYears()
    loadCategories()
    
    const loadBranches = async () => {
      try {
        setIsLoadingBranches(true)

        // TODO: Upload certification files first if any exist
      // if (formData.certificationFiles.length > 0) {
      //   const uploadedUrls = await uploadCertifications(formData.certificationFiles)
      //   coachData.professional_info.certifications = uploadedUrls
      // }

      // Get authentication token
        let token = TokenManager.getToken()

        // If no token, try to get one using superadmin credentials for testing
        if (!token) {
          console.log('No token found, attempting to get superadmin token...')
          try {
            const loginResponse = await fetch(getBackendApiUrl('superadmin/login'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: "pittisunilkumar3@gmail.com",
                password: "StrongPassword@123"
              })
            })

            if (loginResponse.ok) {
              const loginData = await loginResponse.json()
              console.log('✅ Got superadmin token for branches')

              // Store the token using TokenManager
              TokenManager.storeAuthData(loginData)
              token = TokenManager.getToken()
            } else {
              console.error('Failed to get superadmin token:', loginResponse.statusText)
              toast({
                title: "Authentication Error",
                description: "Unable to authenticate. Please login manually.",
                variant: "destructive",
              })
              setIsLoadingBranches(false)
              return
            }
          } catch (error) {
            console.error('Error getting superadmin token:', error)
            toast({
              title: "Authentication Error",
              description: "Please login to access branch data.",
              variant: "destructive",
            })
            setIsLoadingBranches(false)
            return
          }
        }

        // Call real backend API
        const response = await fetch(getBackendApiUrl('branches?limit=100'), {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        })

        if (response.ok) {
          const data = await response.json()
          console.log('✅ Real backend branches data:', data)

          // Set branches data
          setBranches(data.branches || [])
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
      await Promise.all([loadCategories(), loadBranches(), loadCourses()])
    }

    loadData()
  }, [toast])



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
      const token = TokenManager.getToken()
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

  const validateProfileImage = (file: File): string | null => {
    const okTypes = ["image/jpeg", "image/png", "image/webp"]
    const extOk = /\.(jpe?g|png|webp)$/i.test(file.name)
    if (!okTypes.includes(file.type) && !extOk) {
      return "Please use JPG, PNG, or WEBP"
    }
    if (file.size > 2 * 1024 * 1024) {
      return "Image must be 2MB or smaller"
    }
    return null
  }

  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const err = validateProfileImage(file)
    if (err) {
      toast({ title: "Invalid image", description: err, variant: "destructive" })
      e.target.value = ""
      return
    }
    if (formData.profileImagePreview) URL.revokeObjectURL(formData.profileImagePreview)
    setFormData((prev) => ({
      ...prev,
      profileImageFile: file,
      profileImagePreview: URL.createObjectURL(file),
    }))
  }

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    if (!formData.firstName.trim()) newErrors.firstName = "First name is required"
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required"
    if (!formData.email.trim()) newErrors.email = "Email is required"
    if (!formData.phone.trim()) newErrors.phone = "Phone number is required"
    if (!formData.password.trim()) {
      newErrors.password = "Password is required"
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters long"
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(formData.password)) {
      newErrors.password = "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    }
    if (!formData.gender) newErrors.gender = "Gender is required"
    if (!formData.designation) newErrors.designation = "Designation is required"
    if (!formData.experience) newErrors.experience = "Experience is required"
    if (formData.displayOrder.trim()) {
      const n = parseInt(formData.displayOrder, 10)
      if (!Number.isInteger(n) || n < 0 || n > 999999) {
        newErrors.displayOrder = "Display order must be a whole number from 0–999999, or leave empty"
      }
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
      // Prepare coach data according to backend API specification
      const coachData = {
        personal_info: {
          first_name: formData.firstName,
          last_name: formData.lastName,
          gender: formData.gender,
          date_of_birth: formData.dateOfBirth
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
          education_qualification: formData.qualifications.map(q => `${q.name} (${q.year})`).join(', '),
          qualifications: formData.qualifications,
          professional_experience: formData.experience,
          designation_id: formData.designation,
          category_id: formData.category || null,
          sub_category_id: formData.subCategory || null,
          certifications: formData.certificates.map(c => c.title)  // Will be replaced with URLs after upload
        },
        areas_of_expertise: formData.courses || [],
        branch_id: formData.branch || null,  // Include branch assignment
        assignment_details: {
          courses: formData.courses,  // Include course assignments
          salary: formData.salary ? parseFloat(formData.salary) : null,
          join_date: formData.joinDate || null
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

      // TODO: Upload certification files first if any exist
      // if (formData.certificationFiles.length > 0) {
      //   const uploadedUrls = await uploadCertifications(formData.certificationFiles)
      //   coachData.professional_info.certifications = uploadedUrls
      // }

      // Get authentication token
      const token = TokenManager.getToken()
      if (!token) {
        throw new Error("Authentication token not found. Please login again.")
      }

      let profile_image_url: string | null = formData.profileImageUrl?.trim() || null
      if (formData.profileImageFile) {
        const uploaded = await uploadFile(formData.profileImageFile)
        profile_image_url = extractUploadUrl(uploaded as unknown as Record<string, unknown>) || null
      }

      const payload = {
        ...coachData,
        profile_image_url,
        about_short: formData.aboutShort.trim() || null,
        featured_on_homepage: formData.featuredOnHomepage,
        homepage_rating: formData.homepageRating.trim() ? parseFloat(formData.homepageRating) : null,
        display_order:
          formData.displayOrder.trim() === "" ? null : parseInt(formData.displayOrder, 10),
      }

      // Call the backend API
      const response = await fetch(getBackendApiUrl('coaches'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })

      const result = await response.json()

      if (!response.ok) {
        console.error("Full error response:", result)
        // Handle validation errors from FastAPI
        if (Array.isArray(result.detail)) {
          const errorMessages = result.detail.map((err: any) => `${err.loc ? err.loc.join('.') + ': ' : ''}${err.msg}`).join('; ')
          throw new Error(errorMessages)
        }
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

      <main className="w-full py-4 px-4 lg:px-8">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => router.push(`${basePath}/coaches`)}
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
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Enter phone number"
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
                    <SelectTrigger className={errors.gender ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      {genders.map((gender) => (
                        <SelectItem key={gender.toLowerCase()} value={gender.toLowerCase()}>
                          {gender}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.gender && <p className="text-red-500 text-sm">{errors.gender}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Select 
                    value={formData.country} 
                    onValueChange={(value) => setFormData({ ...formData, country: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((country) => (
                        <SelectItem key={country} value={country}>
                          {country}
                        </SelectItem>
                      ))}
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

          <Card>
            <CardHeader>
              <CardTitle className="text-[#4F5077]">Profile photo &amp; website</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-[#7D8592]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Coach photo (JPG, PNG or WEBP, max 2MB)</Label>
                  <Input type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" onChange={handleProfileImageChange} />
                  {(formData.profileImagePreview || formData.profileImageUrl) ? (
                    <SafeImage
                      src={formData.profileImagePreview || formData.profileImageUrl}
                      alt="Preview"
                      resolveUrl={!formData.profileImagePreview}
                      className="mt-2 w-32 h-32 rounded-full object-cover border border-gray-200"
                    />
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="aboutShort">Short bio (homepage)</Label>
                  <Textarea
                    id="aboutShort"
                    value={formData.aboutShort}
                    onChange={(e) => setFormData({ ...formData, aboutShort: e.target.value })}
                    placeholder="Shown on the public homepage Expert Masters section"
                    rows={4}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <div className="space-y-2">
                  <Label htmlFor="displayOrder">Display order (homepage)</Label>
                  <Input
                    id="displayOrder"
                    type="number"
                    min={0}
                    max={999999}
                    step={1}
                    value={formData.displayOrder}
                    onChange={(e) => setFormData({ ...formData, displayOrder: e.target.value })}
                    placeholder="Lower numbers appear first (optional; empty = sort by date)"
                    className={errors.displayOrder ? "border-red-500" : ""}
                  />
                  {errors.displayOrder && <p className="text-red-500 text-sm">{errors.displayOrder}</p>}
                  <p className="text-xs text-gray-500">Must be unique per active coach. Max 8 shown on the site.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="homepageRating">Homepage rating (optional, 0–5)</Label>
                  <Input
                    id="homepageRating"
                    type="number"
                    min={0}
                    max={5}
                    step={0.5}
                    value={formData.homepageRating}
                    onChange={(e) => setFormData({ ...formData, homepageRating: e.target.value })}
                    placeholder="e.g. 4.5"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                  <Checkbox
                    id="featuredOnHomepage"
                    checked={formData.featuredOnHomepage}
                    onCheckedChange={(c) => setFormData({ ...formData, featuredOnHomepage: c === true })}
                  />
                  <Label htmlFor="featuredOnHomepage" className="text-sm cursor-pointer">
                    Feature flag (optional legacy)
                  </Label>
              </div>
            </CardContent>
          </Card>

          {/* Professional Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
          
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
                    <SelectTrigger className={errors.designation ? "border-red-500" : ""}>
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
                    <SelectTrigger className={errors.experience ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select experience" />
                    </SelectTrigger>
                    <SelectContent>
                      {experienceRanges.map((exp) => (
                        <SelectItem key={exp} value={exp}>
                          {exp}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.experience && <p className="text-red-500 text-sm">{errors.experience}</p>}
                </div>
              </div>

              <div className="space-y-2">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                {isLoadingCategories ? (
                  <div className="flex items-center justify-center py-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
                    <span className="ml-2 text-sm text-gray-600">Loading categories...</span>
                  </div>
                ) : (
                  <Select
                    value={formData.category}
                    onValueChange={(value) => {
                      setFormData({ ...formData, category: value, subCategory: "" })
                      loadSubCategories(value)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                          <p>No categories available</p>
                        </div>
                      ) : (
                        categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="subCategory">Sub Category</Label>
                <Select
                  value={formData.subCategory}
                  onValueChange={(value) => setFormData({ ...formData, subCategory: value })}
                  disabled={!formData.category || subCategories.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={!formData.category ? "Select category first" : "Select sub category"} />
                  </SelectTrigger>
                  <SelectContent>
                    {subCategories.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        <p>No sub categories available</p>
                      </div>
                    ) : (
                      subCategories.map((subCat) => (
                        <SelectItem key={subCat.id} value={subCat.id}>
                          {subCat.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>


              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label>Qualifications *</Label>
                  {formData.qualifications.map((qual, index) => (
                    <div key={index} className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Select
                          value={qual.name}
                          onValueChange={(value) => updateQualification(index, 'name', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select qualification" />
                          </SelectTrigger>
                          <SelectContent>
                            {qualifications.map((q) => (
                              <SelectItem key={q} value={q}>{q}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-32">
                        <Select
                          value={qual.year}
                          onValueChange={(value) => updateQualification(index, 'year', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Year" />
                          </SelectTrigger>
                          <SelectContent>
                            {passingYears.map((y) => (
                              <SelectItem key={y} value={y}>{y}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeQualification(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addQualification}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Qualification
                  </Button>
                </div>

                <div className="space-y-3">
                  <Label>Certifications</Label>
                  {formData.certificates.map((cert, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-3">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Certificate Title"
                          value={cert.title}
                          onChange={(e) => updateCertificateTitle(index, e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removeCertificate(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex gap-3 items-center">
                        <Input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleCertificateFileChange(index, e)}
                          className="flex-1"
                        />
                        {cert.preview && (
                          <img
                            src={cert.preview}
                            alt={cert.title || 'Certificate'}
                            className="w-16 h-16 object-cover rounded border"
                          />
                        )}
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addCertificate}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Certificate
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assignment Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span className="text-[#4F5077]">Assignment Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-[#7D8592]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="branch">Assign to Branch</Label>
                  {isLoadingBranches ? (
                    <div className="flex items-center justify-center py-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
                      <span className="ml-2 text-sm text-gray-600">Loading branches...</span>
                    </div>
                  ) : (
                    <Select
                      value={formData.branch}
                      onValueChange={(value) => setFormData({ ...formData, branch: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select branch" />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.length === 0 ? (
                          <div className="p-4 text-center text-gray-500">
                            <p>No branches available</p>
                          </div>
                        ) : (
                          branches.map((branch) => (
                            <SelectItem key={branch.id} value={branch.id}>
                              {branch.branch.name} ({branch.branch.code})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="joinDate">Joining Date</Label>
                  <Input
                    id="joinDate"
                    type="date"
                    value={formData.joinDate}
                    onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Assign Courses</Label>
                {isLoadingCourses ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-600"></div>
                    <span className="ml-2 text-sm text-gray-600">Loading courses...</span>
                  </div>
                ) : courses.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {courses.map((course) => (
                      <div key={course.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`course-${course.id}`}
                          checked={formData.courses.includes(course.id)}
                          onCheckedChange={() => handleCourseToggle(course.id)}
                        />
                        <Label htmlFor={`course-${course.id}`} className="text-sm cursor-pointer">
                          <div className="flex flex-col">
                            <span className="font-medium">{course.title}</span>
                            <span className="text-xs text-gray-500">
                              {course.code} • {course.difficulty_level}
                            </span>
                          </div>
                        </Label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <p className="text-sm">No courses available</p>
                  </div>
                )}

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

              <div className="space-y-2">
                <Label htmlFor="salary">Salary (Optional)</Label>
                <Input
                  id="salary"
                  value={formData.salary}
                  onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                  placeholder="Monthly salary"
                />
              </div>
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
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
                    placeholder="Emergency contact name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergencyContactPhone">Contact Phone</Label>
                  <Input
                    id="emergencyContactPhone"
                    value={formData.emergencyContactPhone}
                    onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                    placeholder="Emergency contact phone"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergencyContactRelation">Relation</Label>
                  <Select 
                    value={formData.emergencyContactRelation} 
                    onValueChange={(value) => setFormData({ ...formData, emergencyContactRelation: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select relation" />
                    </SelectTrigger>
                    <SelectContent>
                      {relations.map((relation) => (
                        <SelectItem key={relation.toLowerCase()} value={relation.toLowerCase()}>
                          {relation}
                        </SelectItem>
                      ))}
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
                <Label htmlFor="achievements">Achievements & Awards</Label>
                <Textarea
                  id="achievements"
                  value={formData.achievements}
                  onChange={(e) => setFormData({ ...formData, achievements: e.target.value })}
                  placeholder="Notable achievements, awards, competitions won, etc."
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

          {/* Form Actions */}
          <div className="flex justify-end space-x-4 py-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`${basePath}/coaches`)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-yellow-400 hover:bg-yellow-500 text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  <span>Creating Coach...</span>
                </div>
              ) : (
                "Create Coach"
              )}
            </Button>
          </div>
        </form>
      </main>

      {/* Success Popup */}
      {showSuccessPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Coach Created Successfully!</h3>
            <p className="text-gray-600 mb-6">The new coach has been added to your academy.</p>

            <div className="space-y-3">
              <Button
                onClick={sendCredentialsEmail}
                disabled={isSendingEmail || !createdCoachId}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSendingEmail ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Sending Email...
                  </>
                ) : (
                  "Send Credentials via Email"
                )}
              </Button>

              <Button
                onClick={() => {
                  setShowSuccessPopup(false)
                  router.push(`${basePath}/coaches`)
                }}
                variant="outline"
                className="w-full"
              >
                Continue to Coaches List
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
