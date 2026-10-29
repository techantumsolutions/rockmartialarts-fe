"use client"

import { getBackendApiUrl } from "@/lib/config"
import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, User, Award, MapPin, Phone, X, Plus, Building2, AlertCircle, Clock, Lock } from "lucide-react"
import { useRouter, useParams } from "next/navigation"
import { useDashboardBasePath } from "@/lib/useDashboardBasePath"
import { useActiveBranch } from "@/lib/activeBranch"
import { TokenManager } from "@/lib/tokenManager"
import { useToast } from "@/hooks/use-toast"
import { extractUploadUrl, uploadFile } from "@/lib/upload"
import { saveCoachProfilePhoto } from "@/lib/coachProfilePhoto"
import { resolvePublicAssetUrl } from "@/lib/resolvePublicAssetUrl"
import { isBranchManager } from "@/lib/branchManagerAuth"
import { WEEKDAY_CHECKLIST_ORDER } from "@/lib/formatWeekdayRanges"
import { coachAvailabilityAPI } from "@/lib/coachAvailabilityAPI"
import WeeklySlotTimePicker from "@/components/coaches/WeeklySlotTimePicker"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  type AssignedBatchInfo,
  fetchCoachAssignedBatches,
  checkSlotDeletionConflict,
  getBatchConflictForSlots,
  getBatchesCoveredBySlot,
} from "@/lib/coachBatchConflict"
import {
  normalizeAssignmentsCourses,
  type NormalizedCourseAssignment,
} from "@/lib/branchCourseSchedule"
import {
  batchAssignmentError,
  fetchExternalBatches,
  syncBranchBatchAssignments,
  cleanUpCoachBatchesInBranch,
  formatDays,
  formatRange,
  type AssignmentBatch,
  type AvailabilityWindow,
} from "@/lib/batchCoachAssignment"
import BranchSelectionField from "@/components/layout/BranchSelectionField"

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

export default function EditCoachPage() {
  const router = useRouter()
  const params = useParams()
  const basePath = useDashboardBasePath()
  const isBranchAdmin = basePath.startsWith("/branch-admin")
  const { active: activeBranch } = useActiveBranch()
  const coachId = params.id as string
  const { toast } = useToast()
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [createdCoachId, setCreatedCoachId] = useState<string | null>(null)

  // API data state
  const [branches, setBranches] = useState<Branch[]>([])
  const [isLoadingBranches, setIsLoadingBranches] = useState(true)
  const [courses, setCourses] = useState<Course[]>([])
  const [isLoadingCourses, setIsLoadingCourses] = useState(true)
  const [initialBranchId, setInitialBranchId] = useState<string>("")
  const [availabilitySlots, setAvailabilitySlots] = useState<
    { weekday: string; start_time: string; end_time: string }[]
  >([])
  const [slotToDeleteIndex, setSlotToDeleteIndex] = useState<number | null>(null)
  const [assignedBatches, setAssignedBatches] = useState<AssignedBatchInfo[]>([])
  const [blockedSlotConflict, setBlockedSlotConflict] = useState<{
    slotIndex: number
    conflictingBatches: AssignedBatchInfo[]
  } | null>(null)

  const handleRemoveAvailabilitySlot = (index: number) => {
    const conflictResult = checkSlotDeletionConflict(index, availabilitySlots, assignedBatches)
    if (conflictResult.hasConflict) {
      setBlockedSlotConflict({
        slotIndex: index,
        conflictingBatches: conflictResult.conflictingBatches,
      })
      const firstBatch = conflictResult.conflictingBatches[0]
      toast({
        title: "Cannot delete slot",
        description: `This slot is required by batch "${firstBatch?.batch_name}" (${firstBatch?.course_title}). Please change or reassign the coach for this batch first before removing this availability.`,
        variant: "destructive",
      })
      return
    }

    setAvailabilitySlots((rows) => rows.filter((_, rowIndex) => rowIndex !== index))
  }
  const [branchCourseAssignments, setBranchCourseAssignments] = useState<NormalizedCourseAssignment[]>([])
  const [isLoadingBranchSchedule, setIsLoadingBranchSchedule] = useState(false)
  const [selectedBranchData, setSelectedBranchData] = useState<any>(null)
  const [externalBatches, setExternalBatches] = useState<AssignmentBatch[]>([])
  const [assignedBatchIds, setAssignedBatchIds] = useState<string[]>([])
  const initialBranchBatchesLoadedRef = useRef<boolean>(false)

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
    qualifications: [] as Array<{ name: string, year: string }>,
    certifications: "",
    category: "",
    subCategory: "",
    certificates: [] as Array<{ title: string, file: File | null, preview: string }>,
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

  useEffect(() => {
    if (isBranchAdmin && activeBranch?.id) {
      setFormData((prev) => (
        prev.branch === activeBranch.id ? prev : { ...prev, branch: activeBranch.id }
      ))
    }
  }, [activeBranch?.id, isBranchAdmin])

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
  const [isUploadingProfileImage, setIsUploadingProfileImage] = useState(false)
  const [photoCacheKey, setPhotoCacheKey] = useState(0)
  const profileImageUrlRef = useRef("")
  const profilePhotoInputRef = useRef<HTMLInputElement>(null)

  const patchFormData = useCallback((patch: Partial<typeof formData>) => {
    setFormData((prev) => ({ ...prev, ...patch }))
  }, [])




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

  // Load data from APIs — coach profile (re-run only when coach id changes)
  useEffect(() => {
    const fetchCoachData = async () => {
      try {
        const token = TokenManager.getToken()
        if (!token) {
          toast({
            title: "Authentication Error",
            description: "Please login to continue",
            variant: "destructive",
          })
          router.push('/login')
          return
        }

        const response = await fetch(getBackendApiUrl(`coaches/${coachId}`), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (!response.ok) {
          throw new Error('Failed to fetch coach data')
        }

        const coach = await response.json()
        const serverPhotoUrl = coach.profile_image_url || ''

        // Populate form with existing coach data (keep unsaved photo selection/upload)
        let shouldRefreshPhotoCache = true
        setFormData(prev => {
          const hasUnsavedPhoto =
            Boolean(prev.profileImageFile || prev.profileImagePreview) ||
            Boolean(prev.profileImageUrl && prev.profileImageUrl !== serverPhotoUrl)

          if (hasUnsavedPhoto) {
            shouldRefreshPhotoCache = false
          }

          const nextPhotoUrl = hasUnsavedPhoto ? prev.profileImageUrl : serverPhotoUrl
          profileImageUrlRef.current = nextPhotoUrl

          return {
            ...prev,
            firstName: coach.personal_info?.first_name || '',
            lastName: coach.personal_info?.last_name || '',
            email: coach.contact_info?.email || coach.email || '',
            phone: coach.contact_info?.phone || '',
            password: '',
            gender: coach.personal_info?.gender || '',
            dateOfBirth: coach.personal_info?.date_of_birth || '',
            address: coach.address_info?.address || '',
            area: coach.address_info?.area || '',
            city: coach.address_info?.city || '',
            state: coach.address_info?.state || '',
            zipCode: coach.address_info?.zip_code || '',
            country: coach.address_info?.country || 'India',
            designation: coach.professional_info?.designation_id || '',
            experience: coach.professional_info?.professional_experience || '',
            qualifications: coach.professional_info?.qualifications || [],
            certifications: Array.isArray(coach.professional_info?.certifications) ? coach.professional_info.certifications.join(', ') : (coach.professional_info?.certifications || ''),
            category: coach.professional_info?.category_id || '',
            subCategory: coach.professional_info?.sub_category_id || '',
            branch: coach.branch_id || '',
            courses: coach.assignment_details?.courses || [],
            salary: coach.assignment_details?.salary ? String(coach.assignment_details.salary) : '',
            joinDate: coach.assignment_details?.join_date || '',
            emergencyContactName: coach.emergency_contact?.name || '',
            emergencyContactPhone: coach.emergency_contact?.phone || '',
            emergencyContactRelation: coach.emergency_contact?.relationship || '',
            achievements: coach.achievements || '',
            notes: coach.notes || '',
            profileImageFile: hasUnsavedPhoto ? prev.profileImageFile : null,
            profileImagePreview: hasUnsavedPhoto ? prev.profileImagePreview : '',
            profileImageUrl: hasUnsavedPhoto ? prev.profileImageUrl : serverPhotoUrl,
            aboutShort: coach.about_short || '',
            featuredOnHomepage: Boolean(coach.featured_on_homepage),
            homepageRating: coach.homepage_rating != null ? String(coach.homepage_rating) : '',
            displayOrder: coach.display_order != null && coach.display_order !== undefined ? String(coach.display_order) : '',
          }
        })

        setInitialBranchId(coach.branch_id || '')

        try {
          const avail = await coachAvailabilityAPI.getForCoach(coachId)
          if (avail && Array.isArray(avail.weekly_slots)) {
            setAvailabilitySlots(
              avail.weekly_slots.map((s: any) => ({
                weekday: s.weekday,
                start_time: s.start_time,
                end_time: s.end_time,
              }))
            )
          }
        } catch (availErr) {
          console.error('Failed to load coach availability:', availErr)
        }

        try {
          const batches = await fetchCoachAssignedBatches(coachId, token)
          setAssignedBatches(batches)
        } catch (batchErr) {
          console.error('Failed to load coach assigned batches:', batchErr)
        }

        if (shouldRefreshPhotoCache) {
          setPhotoCacheKey((k) => k + 1)
        }

        setIsLoading(false)
      } catch (error) {
        console.error('Error fetching coach:', error)
        toast({
          title: "Error",
          description: "Failed to load coach data",
          variant: "destructive",
        })
        setIsLoading(false)
      }
    }

    fetchCoachData()
  }, [coachId, router])

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
              method: 'PUT',
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
      const token = TokenManager.getToken()
      if (token) {
        fetchExternalBatches(token).then(setExternalBatches)
      }
    }

    loadData()
  }, [toast])

  // Load courses and batches allocated to the selected branch
  useEffect(() => {
    if (!formData.branch) {
      setBranchCourseAssignments([])
      setAssignedBatchIds([])
      setSelectedBranchData(null)
      return
    }
    let cancelled = false
    const loadBranchSchedule = async () => {
      setIsLoadingBranchSchedule(true)
      try {
        const token = TokenManager.getToken()
        const res = await fetch(getBackendApiUrl(`branches/${formData.branch}`), {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (!res.ok) throw new Error("Failed to fetch branch")
        const data = await res.json()
        if (cancelled) return
        setSelectedBranchData(data)
        const normalized = normalizeAssignmentsCourses(data.assignments ?? null)
        const availableCourses = normalized.filter((c) => c.is_available !== false)
        setBranchCourseAssignments(availableCourses)

        // Filter courses that are valid for this branch
        const validCourseIds = new Set(availableCourses.map((c) => c.course_id))
        setFormData((prev) => ({
          ...prev,
          courses: prev.courses.filter((id) => validCourseIds.has(id)),
        }))

        // Pre-select batches assigned to this coach on initial branch load
        if (!initialBranchBatchesLoadedRef.current) {
          initialBranchBatchesLoadedRef.current = true
          const initialBatches: string[] = []
          for (const c of availableCourses) {
            for (const b of c.batches) {
              if (b.coach_id && String(b.coach_id).trim() === String(coachId).trim()) {
                initialBatches.push(b.id)
              }
            }
          }
          setAssignedBatchIds(initialBatches)
        } else {
          const validBatchIds = new Set(
            availableCourses.flatMap((c) => c.batches.map((b) => b.id))
          )
          setAssignedBatchIds((prev) => prev.filter((id) => validBatchIds.has(id)))
        }
      } catch (err) {
        console.error("Failed to load branch course schedule:", err)
        if (!cancelled) setBranchCourseAssignments([])
      } finally {
        if (!cancelled) setIsLoadingBranchSchedule(false)
      }
    }
    loadBranchSchedule()
    return () => {
      cancelled = true
    }
  }, [formData.branch, coachId])

  // Check conditions for assigning a coach to a specific batch
  const getBatchError = (
    batch: NormalizedCourseAssignment["batches"][number],
    course: NormalizedCourseAssignment
  ): string | null => {
    if (!formData.branch) return null
    const branchName =
      selectedBranchData?.branch?.name || selectedBranchData?.name || "This branch"
    const currentBatch: AssignmentBatch = {
      id: batch.id,
      coachId: coachId,
      days: batch.days || [],
      startTime: batch.start_time,
      endTime: batch.end_time,
      batchName: batch.batch_name || "Batch",
      branchName,
      branchId: formData.branch,
    }

    const availabilityWindows: AvailabilityWindow[] = availabilitySlots.map((s) => ({
      weekday: s.weekday,
      start_time: s.start_time,
      end_time: s.end_time,
      service_location_id: null,
    }))

    const others: AssignmentBatch[] = []
    for (const c of branchCourseAssignments) {
      for (const b of c.batches) {
        if (b.id !== batch.id && assignedBatchIds.includes(b.id)) {
          others.push({
            id: b.id,
            coachId: coachId,
            days: b.days || [],
            startTime: b.start_time,
            endTime: b.end_time,
            batchName: b.batch_name || "Batch",
            branchName,
            branchId: formData.branch,
          })
        }
      }
    }
    for (const ext of externalBatches) {
      if (String(ext.coachId).trim() === String(coachId).trim() && ext.id !== batch.id) {
        others.push(ext)
      }
    }

    return batchAssignmentError(currentBatch, availabilityWindows, others)
  }

  const handleBatchToggle = (batchId: string, courseId: string) => {
    const isCurrentlyAssigned = assignedBatchIds.includes(batchId)
    if (isCurrentlyAssigned) {
      setAssignedBatchIds((prev) => prev.filter((id) => id !== batchId))
    } else {
      const course = branchCourseAssignments.find((c) => c.course_id === courseId)
      const batch = course?.batches.find((b) => b.id === batchId)
      if (batch && course) {
        const err = getBatchError(batch, course)
        if (err) {
          toast({
            title: "Trainer schedule warning",
            description: err,
            variant: "destructive",
          })
        }
      }
      setAssignedBatchIds((prev) => [...prev, batchId])
      setFormData((prev) => ({
        ...prev,
        courses: prev.courses.includes(courseId) ? prev.courses : [...prev.courses, courseId],
      }))
    }
  }

  const handleCourseToggle = (courseId: string) => {
    const isSelected = formData.courses.includes(courseId)
    if (isSelected) {
      const courseObj = branchCourseAssignments.find((c) => c.course_id === courseId)
      const courseBatchIds = new Set(courseObj?.batches.map((b) => b.id) || [])
      setFormData((prev) => ({
        ...prev,
        courses: prev.courses.filter((c) => c !== courseId),
      }))
      setAssignedBatchIds((prev) => prev.filter((id) => !courseBatchIds.has(id)))
    } else {
      setFormData((prev) => ({
        ...prev,
        courses: [...prev.courses, courseId],
      }))
    }
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

      const response = await fetch(getBackendApiUrl(`coaches/${coachId}/send-credentials`), {
        method: 'PUT',
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

  const handleProfileImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const err = validateProfileImage(file)
    if (err) {
      toast({ title: "Invalid image", description: err, variant: "destructive" })
      e.target.value = ""
      return
    }

    const preview = URL.createObjectURL(file)
    if (formData.profileImagePreview) URL.revokeObjectURL(formData.profileImagePreview)

    setFormData((prev) => ({
      ...prev,
      profileImageFile: file,
      profileImagePreview: preview,
    }))

    setIsUploadingProfileImage(true)
    try {
      const uploaded = await uploadFile(file)
      const url = extractUploadUrl(uploaded as unknown as Record<string, unknown>)
      if (!url) {
        throw new Error("Upload did not return a URL")
      }
      setFormData((prev) => ({
        ...prev,
        profileImageUrl: url,
        profileImageFile: null,
      }))
      profileImageUrlRef.current = url
      setPhotoCacheKey((k) => k + 1)
      await saveCoachProfilePhoto(coachId, url)
      toast({ title: "Photo saved", description: "Profile photo updated successfully." })
    } catch (error) {
      if (preview) URL.revokeObjectURL(preview)
      setFormData((prev) => ({
        ...prev,
        profileImageFile: null,
        profileImagePreview: "",
      }))
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Could not upload profile photo",
        variant: "destructive",
      })
    } finally {
      setIsUploadingProfileImage(false)
      e.target.value = ""
    }
  }

  const FIELD_ORDER = [
    "firstName",
    "lastName",
    "email",
    "password",
    "phone",
    "gender",
    "designation",
    "experience",
    "qualifications",
    "displayOrder",
  ]

  const scrollToFirstError = (validationErrors: Record<string, string>) => {
    const firstErrorKey = FIELD_ORDER.find((key) => Boolean(validationErrors[key]))
    if (!firstErrorKey) return

    const inputElement =
      document.getElementById(firstErrorKey) ||
      document.querySelector(`[name="${firstErrorKey}"]`)

    const labelElement =
      document.querySelector(`label[for="${firstErrorKey}"]`) ||
      document.querySelector(`[data-label-for="${firstErrorKey}"]`)

    const scrollTarget =
      labelElement ||
      inputElement?.closest(".space-y-2, .space-y-3") ||
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

    if (!formData.firstName.trim()) newErrors.firstName = "First name is required"
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required"
    if (!formData.email.trim()) {
      newErrors.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = "Please enter a valid email address"
    }
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required"
    } else if (!/^[6-9]\d{9}$/.test(formData.phone.trim())) {
      newErrors.phone = "Please enter a valid 10-digit Indian phone number (starting with 6, 7, 8, or 9)"
    }
    // Password is optional for edit mode — only validate when provided
    if (formData.password.trim()) {
      if (formData.password.length < 8) {
        newErrors.password = "Password must be at least 8 characters long"
      } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(formData.password)) {
        newErrors.password = "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
      }
    }
    if (!formData.gender) newErrors.gender = "Gender is required"
    if (!formData.designation) newErrors.designation = "Designation is required"
    if (!formData.experience) newErrors.experience = "Experience is required"
    const validQualifications = formData.qualifications.filter(
      (q) => q.name.trim() && q.year.trim()
    )
    if (validQualifications.length === 0) {
      newErrors.qualifications = "At least one qualification with name and year is required"
    } else if (formData.qualifications.some((q) => Boolean(q.name.trim()) !== Boolean(q.year.trim()))) {
      newErrors.qualifications = "Each qualification needs both a name and a year"
    }
    if (formData.displayOrder.trim()) {
      const n = parseInt(formData.displayOrder, 10)
      if (!Number.isInteger(n) || n < 0 || n > 999999) {
        newErrors.displayOrder = "Display order must be a whole number from 0–999999, or leave empty"
      }
    }

    setErrors(newErrors)
    return newErrors
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const newErrors = validateForm()
    if (Object.keys(newErrors).length > 0) {
      const firstKey = FIELD_ORDER.find((key) => newErrors[key]) || Object.keys(newErrors)[0]
      toast({
        title: "Validation Error",
        description: newErrors[firstKey] || "Please fill out all required fields.",
        variant: "destructive",
      })
      scrollToFirstError(newErrors)
      return
    }

    // Verify condition checks on all assigned batches before updating coach
    if (formData.branch && assignedBatchIds.length > 0) {
      for (const course of branchCourseAssignments) {
        for (const batch of course.batches) {
          if (assignedBatchIds.includes(batch.id)) {
            const errorMsg = getBatchError(batch, course)
            if (errorMsg) {
              toast({
                title: "Trainer schedule conflict",
                description: errorMsg,
                variant: "destructive",
              })
              return
            }
          }
        }
      }
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
          ...(formData.password ? { password: formData.password } : {})
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
        branch_id: (isBranchAdmin ? activeBranch?.id : formData.branch) || null,
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

      const token = TokenManager.getToken()
      if (!token) {
        throw new Error("Authentication token not found. Please login again.")
      }

      let profile_image_url: string | null =
        profileImageUrlRef.current?.trim() || formData.profileImageUrl?.trim() || null
      if (formData.profileImageFile) {
        const uploaded = await uploadFile(formData.profileImageFile)
        profile_image_url = extractUploadUrl(uploaded as unknown as Record<string, unknown>) || null
        if (!profile_image_url) {
          throw new Error("Profile image upload did not return a URL")
        }
        profileImageUrlRef.current = profile_image_url
        await saveCoachProfilePhoto(coachId, profile_image_url)
      }

      const coachPayload = {
        ...coachData,
        ...(profile_image_url ? { profile_image_url } : {}),
        about_short: formData.aboutShort.trim() || null,
        featured_on_homepage: formData.featuredOnHomepage,
        homepage_rating: formData.homepageRating.trim() ? parseFloat(formData.homepageRating) : null,
        display_order:
          formData.displayOrder.trim() === "" ? null : parseInt(formData.displayOrder, 10),
      }

      console.log("Updating coach with data:", coachPayload)

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

      // Validate coach availability slots against assigned batches
      const conflictCheck = getBatchConflictForSlots(assignedBatches, availabilitySlots)
      if (conflictCheck.hasConflict && conflictCheck.uncoveredBatch) {
        toast({
          title: "Cannot save coach",
          description: `The coach is currently assigned to batch "${conflictCheck.uncoveredBatch.batch_name}" (${conflictCheck.uncoveredBatch.course_title}) on ${conflictCheck.uncoveredBatch.days.join(", ")} ${conflictCheck.uncoveredBatch.start_time}-${conflictCheck.uncoveredBatch.end_time}. Please adjust availability slots to cover this batch or reassign the batch coach first.`,
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }

      // Call the backend API to update coach
      const response = await fetch(getBackendApiUrl(`coaches/${coachId}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(coachPayload)
      })

      const result = await response.json()

      if (!response.ok) {
        console.error("Full error response:", result)
        // Handle validation errors from FastAPI
        if (Array.isArray(result.detail)) {
          const errorMessages = result.detail.map((err: any) => `${err.loc ? err.loc.join('.') + ': ' : ''}${err.msg}`).join('; ')
          throw new Error(errorMessages)
        }
        throw new Error(result.detail || result.message || `Failed to update coach (${response.status})`)
      }

      console.log("Coach updated successfully:", result)

      // Update coach availability
      try {
        await coachAvailabilityAPI.updateForCoach(coachId, {
          timezone: "Asia/Kolkata",
          service_location_ids: [],
          weekly_slots: availabilitySlots.map((slot) => ({
            weekday: slot.weekday,
            start_time: slot.start_time,
            end_time: slot.end_time,
            service_location_id: null,
          })),
        })
      } catch (availabilityError: any) {
        console.error("Availability was not saved:", availabilityError)
        toast({
          title: "Availability update warning",
          description: availabilityError?.message || "Could not save coach availability slots.",
          variant: "destructive",
        })
      }

      // If coach moved to a different branch, clean up old branch batches
      if (initialBranchId && initialBranchId !== formData.branch) {
        try {
          await cleanUpCoachBatchesInBranch(initialBranchId, coachId, token)
        } catch (cleanErr) {
          console.error("Failed to clean up old branch batches:", cleanErr)
        }
      }

      // Sync batch assignments to the current selected branch
      if (formData.branch) {
        try {
          await syncBranchBatchAssignments(formData.branch, coachId, assignedBatchIds, token)
        } catch (syncErr) {
          console.error("Failed to sync branch batch assignments:", syncErr)
        }
      }

      if (profile_image_url) {
        if (formData.profileImagePreview) URL.revokeObjectURL(formData.profileImagePreview)
        profileImageUrlRef.current = profile_image_url
        setPhotoCacheKey((k) => k + 1)
        setFormData((prev) => ({
          ...prev,
          profileImageUrl: profile_image_url || prev.profileImageUrl,
          profileImageFile: null,
          profileImagePreview: "",
        }))
      }

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
      alert(`Error updating coach: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading coach data...</p>
          </div>
        </div>
      </div>
    )
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
            <h1 className="text-2xl font-bold text-[#4F5077]">Edit Coach</h1>
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
                    onChange={(e) => patchFormData({ firstName: e.target.value })}
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
                    onChange={(e) => patchFormData({ lastName: e.target.value })}
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
                    onChange={(e) => patchFormData({ email: e.target.value })}
                    placeholder="Enter email address"
                    className={errors.email ? "border-red-500" : ""}
                  />
                  {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password (optional)</Label>
                  <PasswordInput
                    id="password"
                    value={formData.password}
                    onChange={(e) => patchFormData({ password: e.target.value })}
                    placeholder="Leave blank to keep current password"
                    className={errors.password ? "border-red-500" : ""}
                  />
                  {errors.password && <p className="text-red-500 text-sm">{errors.password}</p>}
                  <p className="text-xs text-gray-500">
                    Leave blank to keep the current password. If set, must be at least 8 characters with uppercase, lowercase, number, and special character.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => patchFormData({ phone: e.target.value })}
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
                    onValueChange={(value) => patchFormData({ gender: value })}
                  >
                    <SelectTrigger id="gender" className={errors.gender ? "border-red-500" : ""}>
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
                    onChange={(e) => patchFormData({ dateOfBirth: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Select
                    value={formData.country}
                    onValueChange={(value) => patchFormData({ country: value })}
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
                  onChange={(e) => patchFormData({ address: e.target.value })}
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
                    onChange={(e) => patchFormData({ area: e.target.value })}
                    placeholder="Enter area or locality"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => patchFormData({ city: e.target.value })}
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
                    onChange={(e) => patchFormData({ state: e.target.value })}
                    placeholder="State"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zipCode">ZIP Code</Label>
                  <Input
                    id="zipCode"
                    value={formData.zipCode}
                    onChange={(e) => patchFormData({ zipCode: e.target.value })}
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
                  <input
                    ref={profilePhotoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                    onChange={handleProfileImageChange}
                    disabled={isUploadingProfileImage}
                    className="hidden"
                  />
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isUploadingProfileImage}
                      onClick={() => profilePhotoInputRef.current?.click()}
                    >
                      {isUploadingProfileImage ? "Uploading…" : "Choose photo"}
                    </Button>
                    {(formData.profileImagePreview || formData.profileImageUrl) && (
                      <Button
                        type="button"
                        variant="ghost"
                        className="text-red-600"
                        disabled={isUploadingProfileImage}
                        onClick={async () => {
                          if (formData.profileImagePreview) URL.revokeObjectURL(formData.profileImagePreview)
                          profileImageUrlRef.current = ""
                          patchFormData({
                            profileImageFile: null,
                            profileImagePreview: "",
                            profileImageUrl: "",
                          })
                          setPhotoCacheKey((k) => k + 1)
                          if (profilePhotoInputRef.current) profilePhotoInputRef.current.value = ""
                          try {
                            setIsUploadingProfileImage(true)
                            await saveCoachProfilePhoto(coachId, null)
                            toast({ title: "Photo removed", description: "Profile photo cleared." })
                          } catch (error) {
                            toast({
                              title: "Could not remove photo",
                              description: error instanceof Error ? error.message : "Please try again",
                              variant: "destructive",
                            })
                          } finally {
                            setIsUploadingProfileImage(false)
                          }
                        }}
                      >
                        Remove photo
                      </Button>
                    )}
                  </div>
                  {(formData.profileImagePreview || formData.profileImageUrl) ? (
                    <img
                      key={formData.profileImagePreview || `${formData.profileImageUrl}-${photoCacheKey}`}
                      src={
                        formData.profileImagePreview ||
                        `${resolvePublicAssetUrl(formData.profileImageUrl)}?v=${photoCacheKey}`
                      }
                      alt="Coach preview"
                      className="mt-2 w-32 h-32 rounded-full object-cover border border-gray-200 bg-gray-100"
                    />
                  ) : (
                    <div className="mt-2 w-32 h-32 rounded-full border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-xs text-gray-400 text-center px-2">
                      No photo selected
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="aboutShort">Short bio (homepage)</Label>
                  <Textarea
                    id="aboutShort"
                    value={formData.aboutShort}
                    onChange={(e) => patchFormData({ aboutShort: e.target.value })}
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
                    onChange={(e) => patchFormData({ displayOrder: e.target.value })}
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
                    onChange={(e) => patchFormData({ homepageRating: e.target.value })}
                    placeholder="e.g. 4.5"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="featuredOnHomepage"
                  checked={formData.featuredOnHomepage}
                  onCheckedChange={(c) => patchFormData({ featuredOnHomepage: c === true })}
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
                    onValueChange={(value) => patchFormData({ designation: value })}
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
                    onValueChange={(value) => patchFormData({ experience: value })}
                  >
                    <SelectTrigger id="experience" className={errors.experience ? "border-red-500" : ""}>
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
                        patchFormData({ category: value, subCategory: "" })
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
                    onValueChange={(value) => patchFormData({ subCategory: value })}
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
                <div className="space-y-3" id="qualifications">
                  <Label data-label-for="qualifications">Qualifications *</Label>
                  {formData.qualifications.map((qual, index) => (
                    <div key={index} className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Select
                          value={qual.name}
                          onValueChange={(value) => updateQualification(index, 'name', value)}
                        >
                          <SelectTrigger className={errors.qualifications ? "border-red-500" : ""}>
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
                  {errors.qualifications && (
                    <p className="text-red-500 text-sm">{errors.qualifications}</p>
                  )}
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
                  {isBranchAdmin ? (
                    <BranchSelectionField readOnly />
                  ) : isLoadingBranches ? (
                    <div className="flex items-center justify-center py-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
                      <span className="ml-2 text-sm text-gray-600">Loading branches...</span>
                    </div>
                  ) : (
                    <Select
                      value={formData.branch}
                      onValueChange={(value) => patchFormData({ branch: value })}
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
                    onChange={(e) => patchFormData({ joinDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-gray-700">Assign Courses & Batches</Label>
                  {formData.courses.length > 0 && (
                    <span className="text-xs text-gray-500 font-normal">
                      {formData.courses.length} course{formData.courses.length > 1 ? "s" : ""} selected
                      {assignedBatchIds.length > 0 && ` (${assignedBatchIds.length} batch${assignedBatchIds.length > 1 ? "es" : ""})`}
                    </span>
                  )}
                </div>

                {!formData.branch ? (
                  <div className="border border-dashed border-gray-300 rounded-lg p-6 text-center bg-gray-50/50">
                    <Building2 className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-700">Select a branch to view allocated courses</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Only courses and batches allocated to the selected branch can be assigned to the coach.
                    </p>
                  </div>
                ) : isLoadingBranchSchedule ? (
                  <div className="flex items-center justify-center py-6 text-sm text-gray-500 border rounded-lg bg-gray-50/50">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-600 mr-2"></div>
                    Loading branch courses and batches...
                  </div>
                ) : branchCourseAssignments.length === 0 ? (
                  <div className="border border-dashed border-amber-200 rounded-lg p-6 text-center bg-amber-50/40">
                    <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                    <p className="text-sm font-medium text-amber-900">No courses allocated to this branch</p>
                    <p className="text-xs text-amber-700 mt-1">
                      This branch does not have any active course allocations. You can allocate courses in Branch Management.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {branchCourseAssignments.map((courseAssignment) => {
                      const course = courses.find((c) => c.id === courseAssignment.course_id)
                      const isCourseSelected = formData.courses.includes(courseAssignment.course_id)
                      const courseBatches = courseAssignment.batches || []
                      const selectedBatchesCount = courseBatches.filter((b) =>
                        assignedBatchIds.includes(b.id)
                      ).length

                      return (
                        <div
                          key={courseAssignment.course_id}
                          className={`border rounded-lg transition-colors overflow-hidden ${isCourseSelected ? "border-blue-300 bg-blue-50/20" : "border-gray-200 bg-white"
                            }`}
                        >
                          {/* Course Header */}
                          <div className="p-3.5 flex items-center justify-between gap-3 bg-white">
                            <div className="flex items-center space-x-3 flex-1 min-w-0">
                              <Checkbox
                                id={`course-${courseAssignment.course_id}`}
                                checked={isCourseSelected}
                                onCheckedChange={() => handleCourseToggle(courseAssignment.course_id)}
                              />
                              <Label
                                htmlFor={`course-${courseAssignment.course_id}`}
                                className="cursor-pointer flex-1 min-w-0"
                              >
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-semibold text-gray-900 text-sm truncate">
                                    {course?.title || courseAssignment.course_id}
                                  </span>
                                  {course?.code && (
                                    <Badge variant="outline" className="text-[11px] font-mono py-0 px-1.5 h-5">
                                      {course.code}
                                    </Badge>
                                  )}
                                  {course?.difficulty_level && (
                                    <Badge variant="secondary" className="text-[11px] py-0 px-1.5 h-5 bg-gray-100 text-gray-700">
                                      {course.difficulty_level}
                                    </Badge>
                                  )}
                                </div>
                              </Label>
                            </div>

                            {courseBatches.length > 0 && (
                              <Badge
                                variant={selectedBatchesCount > 0 ? "default" : "outline"}
                                className={`text-xs shrink-0 ${selectedBatchesCount > 0
                                    ? "bg-blue-600 hover:bg-blue-600 text-white"
                                    : "text-gray-500 border-gray-300"
                                  }`}
                              >
                                {selectedBatchesCount > 0
                                  ? `${selectedBatchesCount} of ${courseBatches.length} batch${courseBatches.length > 1 ? "es" : ""}`
                                  : `${courseBatches.length} batch${courseBatches.length > 1 ? "es" : ""}`}
                              </Badge>
                            )}
                          </div>

                          {/* Batches List */}
                          {courseBatches.length > 0 ? (
                            <div className="border-t border-gray-100 bg-gray-50/60 p-3 space-y-2">
                              <div className="text-[11px] font-medium uppercase tracking-wider text-gray-500 px-1">
                                Batches for this branch
                              </div>
                              {courseBatches.map((batch) => {
                                const isBatchAssigned = assignedBatchIds.includes(batch.id)
                                const batchError = getBatchError(batch, courseAssignment)

                                return (
                                  <div
                                    key={batch.id}
                                    className={`p-2.5 rounded-md border transition-all ${isBatchAssigned
                                        ? batchError
                                          ? "bg-red-50/70 border-red-300"
                                          : "bg-white border-blue-200 shadow-xs"
                                        : "bg-white border-gray-200 hover:border-gray-300"
                                      }`}
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="flex items-start space-x-2.5 flex-1 min-w-0">
                                        <Checkbox
                                          id={`batch-${batch.id}`}
                                          checked={isBatchAssigned}
                                          onCheckedChange={() =>
                                            handleBatchToggle(batch.id, courseAssignment.course_id)
                                          }
                                          className="mt-0.5"
                                        />
                                        <div className="flex-1 min-w-0">
                                          <Label
                                            htmlFor={`batch-${batch.id}`}
                                            className="cursor-pointer font-medium text-xs text-gray-800 block truncate"
                                          >
                                            {batch.batch_name || "Batch"}
                                          </Label>

                                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                            {batch.days && batch.days.length > 0 && (
                                              <span className="inline-flex items-center text-[11px] text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded font-medium">
                                                {formatDays(batch.days)}
                                              </span>
                                            )}
                                            {batch.start_time && batch.end_time && (
                                              <span className="inline-flex items-center gap-1 text-[11px] text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded font-medium">
                                                <Clock className="w-3 h-3 text-gray-500" />
                                                {formatRange(batch.start_time, batch.end_time)}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Batch Assignment Status */}
                                      <div className="shrink-0 flex items-center">
                                        {isBatchAssigned ? (
                                          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-[11px] font-medium border border-emerald-200">
                                            Selected for Coach
                                          </Badge>
                                        ) : batch.coach_id && String(batch.coach_id).trim() === String(coachId).trim() ? (
                                          <Badge className="bg-blue-100 text-blue-800 text-[11px] font-medium border border-blue-200">
                                            Previously Assigned
                                          </Badge>
                                        ) : batch.coach_id ? (
                                          <Badge variant="outline" className="text-[11px] text-gray-500 border-gray-200">
                                            Assigned to other
                                          </Badge>
                                        ) : (
                                          <Badge variant="outline" className="text-[11px] text-gray-400 border-dashed border-gray-200">
                                            Unassigned
                                          </Badge>
                                        )}
                                      </div>
                                    </div>

                                    {/* Conflict / Availability Warning */}
                                    {batchError && (
                                      <div
                                        className={`mt-2 flex items-start gap-1.5 text-xs rounded p-2 ${isBatchAssigned
                                            ? "bg-red-50 text-red-700 border border-red-200 font-medium"
                                            : "bg-amber-50 text-amber-800 border border-amber-200"
                                          }`}
                                      >
                                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-current" />
                                        <span>{batchError}</span>
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          ) : (
                            <div className="border-t border-gray-100 bg-gray-50/40 p-2.5 px-4 text-xs text-gray-500 italic">
                              No specific batches created for this course in this branch.
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Badges for selected courses */}
                {formData.courses.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-gray-100">
                    {formData.courses.map((courseId) => {
                      const course = courses.find((c) => c.id === courseId)
                      return (
                        <Badge key={courseId} variant="secondary" className="bg-blue-100 text-blue-800">
                          {course?.title || courseId}
                          <button
                            type="button"
                            onClick={() => handleCourseToggle(courseId)}
                            className="ml-2 hover:text-red-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="salary">Salary (Optional)</Label>
                <Input
                  id="salary"
                  value={formData.salary}
                  onChange={(e) => patchFormData({ salary: e.target.value })}
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
                    onChange={(e) => patchFormData({ emergencyContactName: e.target.value })}
                    placeholder="Emergency contact name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergencyContactPhone">Contact Phone</Label>
                  <Input
                    id="emergencyContactPhone"
                    value={formData.emergencyContactPhone}
                    onChange={(e) => patchFormData({ emergencyContactPhone: e.target.value })}
                    placeholder="Emergency contact phone"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergencyContactRelation">Relation</Label>
                  <Select
                    value={formData.emergencyContactRelation}
                    onValueChange={(value) => patchFormData({ emergencyContactRelation: value })}
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

          {/* Availability */}
          <Card>
            <CardHeader>
              <CardTitle className="text-[#4F5077]">Availability</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-[#7D8592]">
              <p className="text-sm">Days and times this coach can be assigned to a batch.</p>
              {(() => {
                const conflict = getBatchConflictForSlots(assignedBatches, availabilitySlots)
                if (conflict.hasConflict && conflict.uncoveredBatch) {
                  return (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-xs sm:text-sm flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-semibold">Availability Conflict</p>
                        <p>
                          Coach is assigned to batch &quot;{conflict.uncoveredBatch.batch_name}&quot; ({conflict.uncoveredBatch.course_title}) on {conflict.uncoveredBatch.days.join(", ")} {conflict.uncoveredBatch.start_time} - {conflict.uncoveredBatch.end_time} at {conflict.uncoveredBatch.branch_name}. Current slots do not cover this time. Please adjust slots or reassign the coach for this batch first.
                        </p>
                      </div>
                    </div>
                  )
                }
                return null
              })()}
              {availabilitySlots.map((slot, index) => {
                const covered = getBatchesCoveredBySlot(slot, assignedBatches)
                return (
                  <div key={`availability-${index}`} className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_140px_140px_auto] gap-3 items-end">
                      <div className="space-y-1">
                        <Label className="text-xs">Day</Label>
                        <Select
                          value={slot.weekday}
                          onValueChange={(value) =>
                            setAvailabilitySlots((rows) =>
                              rows.map((row, rowIndex) => (rowIndex === index ? { ...row, weekday: value } : row))
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Day" />
                          </SelectTrigger>
                          <SelectContent>
                            {WEEKDAY_CHECKLIST_ORDER.map((day) => (
                              <SelectItem key={day} value={day}>
                                {day}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Start time</Label>
                        {isBranchManager() ? (
                          <WeeklySlotTimePicker
                            value={slot.start_time}
                            onChange={(val) =>
                              setAvailabilitySlots((rows) =>
                                rows.map((row, rowIndex) =>
                                  rowIndex === index ? { ...row, start_time: val } : row
                                )
                              )
                            }
                          />
                        ) : (
                          <Input
                            type="time"
                            value={slot.start_time}
                            onChange={(e) =>
                              setAvailabilitySlots((rows) =>
                                rows.map((row, rowIndex) =>
                                  rowIndex === index ? { ...row, start_time: e.target.value } : row
                                )
                              )
                            }
                          />
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">End time</Label>
                        {isBranchManager() ? (
                          <WeeklySlotTimePicker
                            value={slot.end_time}
                            onChange={(val) =>
                              setAvailabilitySlots((rows) =>
                                rows.map((row, rowIndex) =>
                                  rowIndex === index ? { ...row, end_time: val } : row
                                )
                              )
                            }
                          />
                        ) : (
                          <Input
                            type="time"
                            value={slot.end_time}
                            onChange={(e) =>
                              setAvailabilitySlots((rows) =>
                                rows.map((row, rowIndex) =>
                                  rowIndex === index ? { ...row, end_time: e.target.value } : row
                                )
                              )
                            }
                          />
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-10 px-3 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleRemoveAvailabilitySlot(index)}
                        title="Remove slot"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    {covered.length > 0 && (
                      <div className="flex flex-wrap gap-1 items-center pt-1">
                        <Badge variant="outline" className="text-xs bg-amber-50 text-amber-800 border-amber-300 flex items-center gap-1 font-normal">
                          <Lock className="w-3 h-3 text-amber-600 shrink-0" />
                          <span>Assigned to: {covered.map(b => `${b.batch_name} (${b.course_title})`).join(", ")}</span>
                        </Badge>
                      </div>
                    )}
                  </div>
                )
              })}
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setAvailabilitySlots((rows) => [
                    ...rows,
                    { weekday: "monday", start_time: "09:00", end_time: "17:00" },
                  ])
                }
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add availability slot
              </Button>
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
                  onChange={(e) => patchFormData({ achievements: e.target.value })}
                  placeholder="Notable achievements, awards, competitions won, etc."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => patchFormData({ notes: e.target.value })}
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
                  <span>Saving...</span>
                </div>
              ) : (
                "Save Changes"
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Coach Updated Successfully!</h3>
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
      {/* Blocked Slot Deletion Alert Dialog */}
      <AlertDialog
        open={!!blockedSlotConflict}
        onOpenChange={(open) => !open && setBlockedSlotConflict(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              Cannot Delete Availability Slot
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-left pt-2 text-slate-700">
              <p>
                This time slot cannot be deleted because this coach is currently assigned to the following course batch(es):
              </p>
              <div className="bg-slate-100 p-3 rounded-md text-sm space-y-1">
                {blockedSlotConflict?.conflictingBatches.map((b, i) => (
                  <div key={i} className="font-medium text-slate-900">
                    • <span className="font-semibold">{b.batch_name}</span> in <span className="italic">{b.course_title}</span> ({b.days.join(", ")} {b.start_time} - {b.end_time} at {b.branch_name})
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-600">
                To remove this slot, please first reassign or change the coach for the batch in the branch course schedule.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setBlockedSlotConflict(null)}>
              Understood
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
