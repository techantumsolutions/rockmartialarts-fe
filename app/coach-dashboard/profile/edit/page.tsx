"use client"

import { getBackendApiUrl } from "@/lib/config"
import { useState, useEffect, useRef } from "react"
import { resolvePublicAssetUrl } from "@/lib/resolvePublicAssetUrl"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Award, 
  Building, 
  Save,
  X,
  ArrowLeft,
  Loader2,
  Camera,
  Trash2,
  Upload
} from "lucide-react"
import CoachDashboardHeader from "@/components/coach-dashboard-header"
import { checkCoachAuth } from "@/lib/coachAuth"

interface CoachProfile {
  id: string
  full_name: string
  profile_image_url?: string | null
  personal_info?: {
    first_name: string
    last_name: string
    gender?: string
    date_of_birth?: string
  }
  contact_info?: {
    email: string
    phone?: string
    country_code?: string
  }
  address_info?: {
    address?: string
    area?: string
    city?: string
    state?: string
    zip_code?: string
    country?: string
  }
  professional_info?: {
    specialization?: string
    designation_id?: string
    years_of_experience?: string
    professional_experience?: string
    education_qualification?: string
    certifications?: string[]
    bio?: string
  }
  areas_of_expertise?: string[]
  branch_id?: string
  branch_name?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function CoachProfileEditPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [profile, setProfile] = useState<CoachProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [profileImageUrl, setProfileImageUrl] = useState<string>("")
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (JPG, PNG, or WEBP)",
        variant: "destructive",
      })
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Image size must be less than 10MB",
        variant: "destructive",
      })
      return
    }

    setUploadingImage(true)
    try {
      const coachToken = localStorage.getItem("access_token") ||
                        localStorage.getItem("token") ||
                        localStorage.getItem("coachToken")

      const formDataUpload = new FormData()
      formDataUpload.append("file", file)

      let uploadedUrl = ""
      const uploadRes = await fetch(getBackendApiUrl("uploads"), {
        method: "POST",
        headers: coachToken ? { Authorization: `Bearer ${coachToken}` } : {},
        body: formDataUpload,
      })

      if (uploadRes.ok) {
        const data = await uploadRes.json()
        uploadedUrl = data.file_url || data.url || data.image_url || ""
      } else {
        const fallbackRes = await fetch(getBackendApiUrl("coaches/register/photo"), {
          method: "POST",
          body: formDataUpload,
        })
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json()
          uploadedUrl = fallbackData.file_url || fallbackData.url || ""
        } else {
          throw new Error("Failed to upload profile picture")
        }
      }

      if (uploadedUrl) {
        setProfileImageUrl(uploadedUrl)
      } else {
        throw new Error("No URL returned from upload server")
      }
    } catch (err: any) {
      console.error("Error uploading image:", err)
      toast({
        title: "Upload Failed",
        description: err.message || "Failed to upload image. Please try again.",
        variant: "destructive",
      })
    } finally {
      setUploadingImage(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    gender: "",
    dateOfBirth: "",
    address: "",
    area: "",
    city: "",
    state: "",
    zipCode: "",
    country: "India",
    specialization: "",
    experience: "",
    qualifications: "",
    certifications: "",
    bio: "",
    areasOfExpertise: [] as string[]
  })

  const genderOptions = ["male", "female", "other"]
  const experienceOptions = [
    "0-1 years",
    "1-3 years", 
    "3-5 years",
    "5-10 years",
    "10+ years"
  ]

  const designationOptions = [
    { value: "senior-coach", label: "Senior Coach" },
    { value: "junior-coach", label: "Junior Coach" },
    { value: "head-coach", label: "Head Coach" },
    { value: "assistant-coach", label: "Assistant Coach" },
    { value: "trainee-coach", label: "Trainee Coach" }
  ]

  const availableSpecializations = [
    "Karate",
    "Taekwondo",
    "Judo",
    "Boxing",
    "Kickboxing",
    "Mixed Martial Arts",
    "Self Defense",
    "Aikido",
    "Kung Fu",
    "Muay Thai"
  ]

  useEffect(() => {
    const fetchCoachProfile = async () => {
      try {
        // Use the robust coach authentication check
        const authResult = checkCoachAuth()

        if (!authResult.isAuthenticated) {
          console.log("Coach not authenticated:", authResult.error)
          router.push("/coach/login")
          return
        }

        if (!authResult.token) {
          setError("Authentication token not found")
          setLoading(false)
          return
        }

        // Fetch fresh profile data from API
        const response = await fetch(getBackendApiUrl('coaches/me'), {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${authResult.token}`,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          if (response.status === 401) {
            console.log("Token expired, redirecting to login")
            router.push("/coach/login")
            return
          }
          throw new Error(`Failed to fetch profile: ${response.status}`)
        }

        const profileData = await response.json()

        // The API returns data wrapped in a 'coach' object
        const coachData = profileData.coach || profileData

        setProfile(coachData)
        populateFormData(coachData)
        setLoading(false)

      } catch (error) {
        console.error("Error fetching coach profile:", error)
        setError(error instanceof Error ? error.message : "Failed to load profile")
        setLoading(false)
      }
    }

    fetchCoachProfile()
  }, [router])

  // Helper to sanitize phone numbers: strips non-digits, country code (+91/91), and leading zeros
  const cleanPhoneNumber = (rawPhone?: string | null): string => {
    if (!rawPhone) return ""
    // Remove all non-digits
    let digits = String(rawPhone).replace(/\D/g, "")
    // If it starts with country code 91 and has more than 10 digits, remove the 91 prefix
    if (digits.length > 10 && digits.startsWith("91")) {
      digits = digits.slice(2)
    }
    // Remove any leading zero(s) (e.g. 08179698345 -> 8179698345)
    digits = digits.replace(/^0+/, "")
    // Restrict to max 10 digits for Indian mobile numbers
    if (digits.length > 10) {
      digits = digits.slice(0, 10)
    }
    return digits
  }

  const populateFormData = (profileData: CoachProfile) => {
    console.log("Populating form with profile data:", profileData)
    setProfileImageUrl(profileData.profile_image_url || (profileData as any).profile_photo || (profileData as any).photo || "")

    setFormData({
      firstName: profileData.personal_info?.first_name || "",
      lastName: profileData.personal_info?.last_name || "",
      email: profileData.contact_info?.email || "",
      phone: cleanPhoneNumber(profileData.contact_info?.phone || (profileData as any).phone || ""),
      gender: profileData.personal_info?.gender || "",
      dateOfBirth: profileData.personal_info?.date_of_birth?.split('T')[0] || "",
      address: profileData.address_info?.address || "",
      area: profileData.address_info?.area || "",
      city: profileData.address_info?.city || "",
      state: profileData.address_info?.state || "",
      zipCode: profileData.address_info?.zip_code || "",
      country: profileData.address_info?.country || "India",
      specialization: (() => {
        const raw = (profileData.professional_info?.designation_id || profileData.professional_info?.specialization || "").trim()
        const slug = raw.toLowerCase().replace(/[\s_]+/g, "-")
        const matched = designationOptions.find((o) => o.value === raw || o.value === slug || o.label.toLowerCase() === raw.toLowerCase())
        return matched ? matched.value : ""
      })(),
      experience: (() => {
        const raw = (profileData.professional_info?.years_of_experience || profileData.professional_info?.professional_experience || "").trim()
        return experienceOptions.includes(raw) ? raw : ""
      })(),
      qualifications: profileData.professional_info?.education_qualification || "",
      certifications: Array.isArray(profileData.professional_info?.certifications)
        ? profileData.professional_info.certifications.join(', ')
        : (profileData.professional_info?.certifications || ""),
      bio: profileData.professional_info?.bio || "",
      areasOfExpertise: profileData.areas_of_expertise || []
    })
  }

  const clearFieldError = (field: string) => {
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  const scrollToFirstError = (validationErrors: { [key: string]: string }) => {
    const fieldOrder = [
      "firstName",
      "lastName",
      "gender",
      "dateOfBirth",
      "email",
      "phone",
      "address",
      "city",
      "state",
      "zipCode",
      "specialization",
      "experience",
      "qualifications",
    ]
    const firstKey = fieldOrder.find((key) => Boolean(validationErrors[key])) || Object.keys(validationErrors)[0]
    if (!firstKey || typeof document === "undefined") return

    setTimeout(() => {
      const target =
        document.getElementById(firstKey) ||
        (document.querySelector(`[data-field="${firstKey}"]`) as HTMLElement | null)
      if (target) {
        const container = (target.closest("[data-field]") as HTMLElement | null) || target
        container.scrollIntoView({ behavior: "smooth", block: "center" })
        setTimeout(() => {
          if (typeof (target as HTMLElement).focus === "function") {
            ;(target as HTMLElement).focus({ preventScroll: true })
          }
        }, 250)
      }
    }, 50)
  }

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    // Personal info validation
    if (!formData.firstName.trim()) newErrors.firstName = "First name is required"
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required"
    if (!formData.gender) newErrors.gender = "Gender is required"
    if (!formData.dateOfBirth) newErrors.dateOfBirth = "Date of birth is required"

    // Contact info validation
    if (!formData.email.trim()) newErrors.email = "Email is required"
    if (!formData.phone.trim()) newErrors.phone = "Phone number is required"

    // Address info validation
    if (!formData.address.trim()) newErrors.address = "Address is required"
    if (!formData.city.trim()) newErrors.city = "City is required"
    if (!formData.state.trim()) newErrors.state = "State is required"
    if (!formData.zipCode.trim()) newErrors.zipCode = "ZIP code is required"

    // Professional info validation
    if (!formData.specialization.trim()) newErrors.specialization = "Primary specialization is required"
    if (!formData.experience.trim()) newErrors.experience = "Years of experience is required"
    if (!formData.qualifications.trim()) newErrors.qualifications = "Education qualifications are required"

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = "Please enter a valid email address"
    }

    // Phone validation (clean 10-digit number without leading 0 or prefix)
    const cleanedPhone = cleanPhoneNumber(formData.phone)
    if (!cleanedPhone) {
      newErrors.phone = "Phone number is required"
    } else if (cleanedPhone.length !== 10) {
      newErrors.phone = "Please enter a valid 10-digit phone number"
    }

    setErrors(newErrors)
    return { isValid: Object.keys(newErrors).length === 0, newErrors }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const { isValid, newErrors } = validateForm()
    if (!isValid) {
      scrollToFirstError(newErrors)
      const firstMessage = Object.values(newErrors)[0] || "Please fix the highlighted fields in the form"
      toast({
        title: "Validation Error",
        description: firstMessage,
        variant: "destructive",
      })
      return
    }

    if (!profile) {
      toast({
        title: "Error",
        description: "Profile data not available",
        variant: "destructive",
      })
      return
    }

    setSaving(true)

    try {
      // Prepare coach data for update
      const updateData = {
        personal_info: {
          first_name: formData.firstName || "Unknown",
          last_name: formData.lastName || "User",
          gender: formData.gender || "other",
          date_of_birth: formData.dateOfBirth || "1990-01-01"
        },
        contact_info: {
          email: formData.email || "unknown@example.com",
          country_code: "+91",
          phone: cleanPhoneNumber(formData.phone)
        },
        address_info: {
          address: formData.address || "Not provided",
          area: formData.area || formData.city || "Not provided",
          city: formData.city || "Not provided",
          state: formData.state || "Not provided",
          zip_code: formData.zipCode || "000000",
          country: formData.country || "India"
        },
        professional_info: {
          designation_id: formData.specialization || "general",
          professional_experience: formData.experience || "0-1 years",
          education_qualification: formData.qualifications || "Not provided",
          certifications: formData.certifications ? formData.certifications.split(',').map(cert => cert.trim()).filter(cert => cert) : []
        },
        areas_of_expertise: formData.areasOfExpertise,
        profile_image_url: profileImageUrl || null
      }

      console.log("Updating coach profile with data:", updateData)
      console.log("Update data structure:", JSON.stringify(updateData, null, 2))

      // Get coach token from localStorage using the correct key
      const coachToken = localStorage.getItem("access_token") ||
                        localStorage.getItem("token") ||
                        localStorage.getItem("coachToken")
      if (!coachToken) {
        throw new Error("Authentication token not found. Please login again.")
      }

      // Use the local API route that proxies to backend
      const response = await fetch(getBackendApiUrl('coaches/me'), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${coachToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error("API Error Details:", errorData)
        throw new Error(errorData.detail || errorData.error || errorData.message || `HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      console.log("✅ Profile update successful:", result)

      // Sync updated coach in localStorage if stored
      try {
        const storedCoachRaw = localStorage.getItem("coach")
        if (storedCoachRaw) {
          const storedCoach = JSON.parse(storedCoachRaw)
          const updatedPhone = cleanPhoneNumber(formData.phone)
          const updatedCoachData = result.coach || result
          const newStoredCoach = {
            ...storedCoach,
            ...updatedCoachData,
            contact_info: {
              ...(storedCoach.contact_info || {}),
              ...(updatedCoachData.contact_info || {}),
              phone: updatedPhone,
              country_code: "+91",
            },
            phone: updatedPhone,
          }
          localStorage.setItem("coach", JSON.stringify(newStoredCoach))
        }
      } catch (err) {
        console.error("Error updating coach in localStorage:", err)
      }

      // Show success popup instead of immediate redirect (bottom toast removed as requested)
      setShowSuccessPopup(true)

    } catch (error) {
      console.error("Error updating profile:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update profile",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    router.push("/coach-dashboard/profile")
  }

  const handleSpecializationToggle = (specialization: string) => {
    setFormData(prev => ({
      ...prev,
      areasOfExpertise: prev.areasOfExpertise.includes(specialization)
        ? prev.areasOfExpertise.filter(s => s !== specialization)
        : [...prev.areasOfExpertise, specialization]
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <CoachDashboardHeader 
          currentPage="Edit Profile"
          coachName={profile?.full_name}
        />
        <main className="mx-auto py-4 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-yellow-400" />
              <span className="ml-2 text-gray-600">Loading profile...</span>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <CoachDashboardHeader
          currentPage="Edit Profile"
          coachName="Coach"
        />
        <main className="mx-auto py-4 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-red-600 mb-4">
                    <p className="font-medium text-lg">Error loading profile</p>
                    <p className="text-sm mt-1">{error}</p>
                  </div>
                  <div className="space-y-3">
                    <Button
                      onClick={() => window.location.reload()}
                      variant="outline"
                      className="mr-2"
                    >
                      Try Again
                    </Button>
                    <Button
                      onClick={() => router.push("/coach-dashboard/profile")}
                      variant="default"
                    >
                      Back to Profile
                    </Button>
                  </div>
                  <div className="mt-4 text-sm text-gray-600">
                    <p>If this problem persists, please:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Check your internet connection</li>
                      <li>Try logging out and logging back in</li>
                      <li>Contact support if the issue continues</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CoachDashboardHeader 
        currentPage="Edit Profile"
        coachName={profile.full_name}
      />
      
      <main className="mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Page Header - Mobile Responsive */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <Button
                onClick={handleCancel}
                variant="outline"
                size="sm"
                className="self-start sm:self-auto w-fit"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Profile
              </Button>
              <div className="space-y-1">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Edit Profile</h1>
                <p className="text-sm sm:text-base text-gray-600">Update your profile information</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4 sm:space-y-6">
            {/* Personal Information */}
            <Card className="shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl">
                  <User className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>Personal Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6">
                {/* Profile Photo Upload */}
                <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-xl bg-gray-50/70 border border-gray-200/80">
                  <div className="relative group">
                    <Avatar className="h-24 w-24 sm:h-28 sm:w-28 border-2 border-yellow-400/60 shadow-sm">
                      <AvatarImage
                        src={profileImageUrl ? resolvePublicAssetUrl(profileImageUrl) : ""}
                        alt={formData.firstName || "Coach Profile"}
                        className="object-cover"
                      />
                      <AvatarFallback className="text-xl sm:text-2xl bg-yellow-100 text-yellow-800 font-bold">
                        {formData.firstName || formData.lastName
                          ? `${formData.firstName?.[0] || ""}${formData.lastName?.[0] || ""}`.toUpperCase()
                          : "CO"}
                      </AvatarFallback>
                    </Avatar>
                    {uploadingImage && (
                      <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 text-center sm:text-left flex-1">
                    <div>
                      <Label className="text-sm sm:text-base font-semibold text-gray-900 block">
                        Profile Photo
                      </Label>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Upload a clear photo of yourself (JPG, PNG, or WEBP, max 10MB)
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        onChange={handleImageFileChange}
                        disabled={uploadingImage || saving}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={uploadingImage || saving}
                        onClick={() => fileInputRef.current?.click()}
                        className="h-9 px-3.5 border-gray-300 hover:bg-white text-gray-700 shadow-xs flex items-center gap-1.5"
                      >
                        <Camera className="w-4 h-4 text-gray-500" />
                        <span>{profileImageUrl ? "Change Photo" : "Upload Photo"}</span>
                      </Button>

                      {profileImageUrl && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={uploadingImage || saving}
                          onClick={() => setProfileImageUrl("")}
                          className="h-9 px-3 text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" />
                          <span>Remove</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2" data-field="firstName">
                    <Label htmlFor="firstName" className="text-sm font-medium">First Name <span className="text-red-500">*</span></Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => {
                        setFormData({ ...formData, firstName: e.target.value })
                        clearFieldError("firstName")
                      }}
                      placeholder="Enter first name"
                      className={`h-11 ${errors.firstName ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                    />
                    {errors.firstName && <p className="text-red-500 text-xs sm:text-sm">{errors.firstName}</p>}
                  </div>

                  <div className="space-y-2" data-field="lastName">
                    <Label htmlFor="lastName" className="text-sm font-medium">Last Name <span className="text-red-500">*</span></Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => {
                        setFormData({ ...formData, lastName: e.target.value })
                        clearFieldError("lastName")
                      }}
                      placeholder="Enter last name"
                      className={`h-11 ${errors.lastName ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                    />
                    {errors.lastName && <p className="text-red-500 text-xs sm:text-sm">{errors.lastName}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2" data-field="gender">
                    <Label htmlFor="gender" className="text-sm font-medium">Gender <span className="text-red-500">*</span></Label>
                    <Select
                      value={genderOptions.includes(formData.gender) ? formData.gender : undefined}
                      onValueChange={(value) => {
                        setFormData({ ...formData, gender: value })
                        clearFieldError("gender")
                      }}
                    >
                      <SelectTrigger id="gender" className={`w-full !h-11 ${errors.gender ? "border-red-500 focus-visible:ring-red-500" : ""}`}>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        {genderOptions.map((gender) => (
                          <SelectItem key={gender} value={gender} className="py-3">
                            {gender.charAt(0).toUpperCase() + gender.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.gender && <p className="text-red-500 text-xs sm:text-sm">{errors.gender}</p>}
                  </div>

                  <div className="space-y-2" data-field="dateOfBirth">
                    <Label htmlFor="dateOfBirth" className="text-sm font-medium">Date of Birth <span className="text-red-500">*</span></Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => {
                        setFormData({ ...formData, dateOfBirth: e.target.value })
                        clearFieldError("dateOfBirth")
                      }}
                      className={`h-11 ${errors.dateOfBirth ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                    />
                    {errors.dateOfBirth && <p className="text-red-500 text-xs sm:text-sm">{errors.dateOfBirth}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card className="shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl">
                  <Mail className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>Contact Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2" data-field="email">
                    <Label htmlFor="email" className="text-sm font-medium">Email <span className="text-red-500">*</span></Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      disabled
                      readOnly
                      placeholder="Enter email address"
                      className="h-11 bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200"
                    />
                    {errors.email ? (
                      <p className="text-red-500 text-xs sm:text-sm">{errors.email}</p>
                    ) : (
                      <p className="text-xs text-gray-500">Email address cannot be changed.</p>
                    )}
                  </div>

                  <div className="space-y-2" data-field="phone">
                    <Label htmlFor="phone" className="text-sm font-medium">Phone Number <span className="text-red-500">*</span></Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => {
                        const cleaned = cleanPhoneNumber(e.target.value)
                        setFormData((prev) => ({ ...prev, phone: cleaned }))
                        clearFieldError("phone")
                      }}
                      placeholder="Enter 10-digit phone number"
                      maxLength={10}
                      className={`h-11 ${errors.phone ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                    />
                    {errors.phone && <p className="text-red-500 text-xs sm:text-sm">{errors.phone}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Address Information */}
            <Card className="shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl">
                  <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>Address Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6">
                <div className="space-y-2" data-field="address">
                  <Label htmlFor="address" className="text-sm font-medium">Address <span className="text-red-500">*</span></Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => {
                      setFormData({ ...formData, address: e.target.value })
                      clearFieldError("address")
                    }}
                    placeholder="Enter street address"
                    className={`h-11 ${errors.address ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                  />
                  {errors.address && <p className="text-red-500 text-xs sm:text-sm">{errors.address}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="area" className="text-sm font-medium">Area</Label>
                    <Input
                      id="area"
                      value={formData.area}
                      onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                      placeholder="Enter area/locality"
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2" data-field="city">
                    <Label htmlFor="city" className="text-sm font-medium">City <span className="text-red-500">*</span></Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => {
                        setFormData({ ...formData, city: e.target.value })
                        clearFieldError("city")
                      }}
                      placeholder="Enter city"
                      className={`h-11 ${errors.city ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                    />
                    {errors.city && <p className="text-red-500 text-xs sm:text-sm">{errors.city}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  <div className="space-y-2" data-field="state">
                    <Label htmlFor="state" className="text-sm font-medium">State <span className="text-red-500">*</span></Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => {
                        setFormData({ ...formData, state: e.target.value })
                        clearFieldError("state")
                      }}
                      placeholder="Enter state"
                      className={`h-11 ${errors.state ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                    />
                    {errors.state && <p className="text-red-500 text-xs sm:text-sm">{errors.state}</p>}
                  </div>

                  <div className="space-y-2" data-field="zipCode">
                    <Label htmlFor="zipCode" className="text-sm font-medium">ZIP Code <span className="text-red-500">*</span></Label>
                    <Input
                      id="zipCode"
                      value={formData.zipCode}
                      onChange={(e) => {
                        setFormData({ ...formData, zipCode: e.target.value })
                        clearFieldError("zipCode")
                      }}
                      placeholder="Enter ZIP code"
                      className={`h-11 ${errors.zipCode ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                    />
                    {errors.zipCode && <p className="text-red-500 text-xs sm:text-sm">{errors.zipCode}</p>}
                  </div>

                  <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                    <Label htmlFor="country" className="text-sm font-medium">Country</Label>
                    <Input
                      id="country"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      placeholder="Enter country"
                      className="h-11"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Professional Information */}
            <Card className="shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl">
                  <Award className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>Professional Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2" data-field="specialization">
                    <Label htmlFor="specialization" className="text-sm font-medium">Primary Specialization <span className="text-red-500">*</span></Label>
                    <Select
                      value={designationOptions.some((o) => o.value === formData.specialization) ? formData.specialization : undefined}
                      onValueChange={(value) => {
                        setFormData({ ...formData, specialization: value })
                        clearFieldError("specialization")
                      }}
                    >
                      <SelectTrigger id="specialization" className={`w-full !h-11 ${errors.specialization ? "border-red-500 focus-visible:ring-red-500" : ""}`}>
                        <SelectValue placeholder="Select primary specialization" />
                      </SelectTrigger>
                      <SelectContent>
                        {designationOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value} className="py-3">
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.specialization && (
                      <p className="text-red-500 text-xs sm:text-sm">{errors.specialization}</p>
                    )}
                  </div>

                  <div className="space-y-2" data-field="experience">
                    <Label htmlFor="experience" className="text-sm font-medium">Years of Experience <span className="text-red-500">*</span></Label>
                    <Select
                      value={experienceOptions.includes(formData.experience) ? formData.experience : undefined}
                      onValueChange={(value) => {
                        setFormData({ ...formData, experience: value })
                        clearFieldError("experience")
                      }}
                    >
                      <SelectTrigger id="experience" className={`w-full !h-11 ${errors.experience ? "border-red-500 focus-visible:ring-red-500" : ""}`}>
                        <SelectValue placeholder="Select years of experience" />
                      </SelectTrigger>
                      <SelectContent>
                        {experienceOptions.map((exp) => (
                          <SelectItem key={exp} value={exp} className="py-3">
                            {exp}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.experience && (
                      <p className="text-red-500 text-xs sm:text-sm">{errors.experience}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2" data-field="qualifications">
                  <Label htmlFor="qualifications" className="text-sm font-medium">Education Qualifications <span className="text-red-500">*</span></Label>
                  <Textarea
                    id="qualifications"
                    value={formData.qualifications}
                    onChange={(e) => {
                      setFormData({ ...formData, qualifications: e.target.value })
                      clearFieldError("qualifications")
                    }}
                    placeholder="Enter your educational qualifications"
                    rows={3}
                    className={`resize-none ${errors.qualifications ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                  />
                  {errors.qualifications && (
                    <p className="text-red-500 text-xs sm:text-sm">{errors.qualifications}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="certifications" className="text-sm font-medium">Certifications (comma-separated)</Label>
                  <Textarea
                    id="certifications"
                    value={formData.certifications}
                    onChange={(e) => setFormData({ ...formData, certifications: e.target.value })}
                    placeholder="Enter your certifications, separated by commas"
                    rows={3}
                    className="resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio" className="text-sm font-medium">Professional Bio</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="Tell us about your professional background and experience"
                    rows={4}
                    className="resize-none"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium">Areas of Expertise</Label>
                  <div className="flex flex-wrap gap-2 sm:gap-3">
                    {availableSpecializations.map((specialization) => {
                      const isSelected = formData.areasOfExpertise.includes(specialization)
                      return (
                        <Badge
                          key={specialization}
                          variant={isSelected ? "default" : "outline"}
                          className={`cursor-pointer select-none transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-sm active:scale-95 px-3.5 py-2 text-xs sm:text-sm touch-manipulation ${
                            isSelected
                              ? "bg-gray-900 text-white border-gray-900 shadow-sm"
                              : "bg-white text-gray-700 border-gray-300"
                          }`}
                          onClick={() => handleSpecializationToggle(specialization)}
                        >
                          {specialization}
                        </Badge>
                      )
                    })}
                  </div>
                  <p className="text-xs sm:text-sm text-gray-500">Tap to select/deselect areas of expertise</p>
                </div>
              </CardContent>
            </Card>

            {/* Form Actions */}
            <div className="pt-6 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row gap-4 justify-center sm:justify-start">
                <Button
                  type="submit"
                  disabled={saving}
                  className="w-full sm:w-auto h-12 bg-yellow-400 hover:bg-yellow-500 text-white font-semibold px-8 rounded-xl"
                >
                  {saving ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black mr-3"></div>
                      Updating Profile...
                    </div>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={saving}
                  className="w-full sm:w-auto h-12 px-8 rounded-xl font-medium border-gray-300"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </form>
        </div>
      </main>

      {/* Success Popup */}
      {showSuccessPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 backdrop-blur-[2px] p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Profile Updated Successfully!</h3>
              <p className="text-gray-600 mb-6">Your profile information has been updated successfully.</p>
              <Button
                onClick={() => {
                  setShowSuccessPopup(false)
                  router.push("/coach-dashboard/profile")
                }}
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-white font-semibold py-3 rounded-xl"
              >
                Continue
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
