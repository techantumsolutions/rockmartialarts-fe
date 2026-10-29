"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getBackendApiUrl } from "@/lib/config"
import { resolvePublicAssetUrl } from "@/lib/resolvePublicAssetUrl"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Award, 
  Building, 
  Edit, 
  Loader2, 
  UserCheck,
  ShieldAlert,
  Briefcase,
  Clock,
  Star,
  Globe,
  GraduationCap,
  Sparkles,
  FileText,
  DollarSign,
  Tag
} from "lucide-react"
import CoachDashboardHeader from "@/components/coach-dashboard-header"

interface WeeklySlot {
  weekday: string
  start_time: string
  end_time: string
  service_location_id?: string | null
}

interface CoachProfile {
  id: string
  full_name: string
  email?: string
  phone?: string
  first_name?: string
  last_name?: string
  is_active: boolean
  profile_image_url?: string | null
  about_short?: string | null
  featured_on_homepage?: boolean
  homepage_rating?: number | null
  display_order?: number | null
  achievements?: string | null
  notes?: string | null
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
    street?: string
    area?: string
    city?: string
    state?: string
    zip_code?: string
    postal_code?: string
    country?: string
  }
  professional_info?: {
    specialization?: string
    designation_id?: string
    years_of_experience?: string
    professional_experience?: string
    education_qualification?: string
    qualifications?: Array<{ name: string; year: string }>
    certifications?: string[] | string
    category_id?: string | null
    sub_category_id?: string | null
    bio?: string
  }
  areas_of_expertise?: string[]
  branch_id?: string | null
  branch_name?: string
  assignment_details?: {
    courses?: string[]
    salary?: number | string | null
    join_date?: string | null
  }
  emergency_contact?: {
    name?: string | null
    phone?: string | null
    relationship?: string | null
  }
  created_at: string
  updated_at: string
}

const WEEKDAY_ORDER: Record<string, number> = {
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  sunday: 7
}

const formatClock = (value: string) => {
  if (!value) return ""
  const match = /^(\d{1,2}):(\d{2})/.exec(value.trim())
  if (!match) return value
  let hour = Number(match[1])
  const suffix = hour >= 12 ? "PM" : "AM"
  hour = hour % 12 || 12
  return `${hour}:${match[2]} ${suffix}`
}

const cleanPhoneNumber = (rawPhone?: string | null): string => {
  if (!rawPhone) return ""
  let digits = String(rawPhone).replace(/\D/g, "")
  if (digits.length > 10 && digits.startsWith("91")) {
    digits = digits.slice(2)
  }
  digits = digits.replace(/^0+/, "")
  if (digits.length > 10) {
    digits = digits.slice(0, 10)
  }
  return digits
}

const formatDate = (dateString?: string | null) => {
  if (!dateString) return "N/A"
  try {
    const d = new Date(dateString)
    if (isNaN(d.getTime())) return String(dateString)
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  } catch {
    return "N/A"
  }
}

const calculateAge = (dateOfBirth?: string | null) => {
  if (!dateOfBirth) return "N/A"
  try {
    const birthDate = new Date(dateOfBirth)
    if (isNaN(birthDate.getTime())) return "N/A"
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age > 0 ? `${age} years old` : "N/A"
  } catch {
    return "N/A"
  }
}

export default function CoachProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<CoachProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [courseNameMap, setCourseNameMap] = useState<Record<string, string>>({})
  const [branchMap, setBranchMap] = useState<Record<string, { name: string; code: string }>>({})
  const [categoryMap, setCategoryMap] = useState<Record<string, string>>({})
  const [availabilitySlots, setAvailabilitySlots] = useState<WeeklySlot[]>([])

  // Load public courses, categories, and branches for readable names
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        // 1. Fetch public courses
        try {
          const coursesRes = await fetch(getBackendApiUrl("courses/public/all"))
          if (coursesRes.ok) {
            const data = await coursesRes.json()
            const list = Array.isArray(data?.courses) ? data.courses : (Array.isArray(data) ? data : [])
            const map: Record<string, string> = {}
            list.forEach((c: any) => {
              const id = c.id || c._id
              const name = c.title || c.name
              if (id && name) map[id] = name
            })
            setCourseNameMap((prev) => ({ ...prev, ...map }))
          }
        } catch (e) {
          console.error("Failed to load courses for name mapping:", e)
        }

        // 2. Fetch public categories & subcategories
        try {
          const catRes = await fetch(getBackendApiUrl("categories/public/all"))
          if (catRes.ok) {
            const data = await catRes.json()
            const list = Array.isArray(data?.categories) ? data.categories : (Array.isArray(data) ? data : [])
            const map: Record<string, string> = {}
            list.forEach((cat: any) => {
              if (cat.id && cat.name) map[cat.id] = cat.name
              if (Array.isArray(cat.subcategories)) {
                cat.subcategories.forEach((sub: any) => {
                  if (sub.id && sub.name) map[sub.id] = sub.name
                })
              }
            })
            setCategoryMap((prev) => ({ ...prev, ...map }))
          }
        } catch (e) {
          console.error("Failed to load categories for name mapping:", e)
        }

        // 3. Fetch public branches
        try {
          const branchesRes = await fetch(getBackendApiUrl("branches/public/all"))
          if (branchesRes.ok) {
            const data = await branchesRes.json()
            const list = Array.isArray(data?.branches) ? data.branches : (Array.isArray(data) ? data : [])
            const map: Record<string, { name: string; code: string }> = {}
            list.forEach((b: any) => {
              const id = b.id || b._id
              const name = b.name || b.branch?.name
              const code = b.code || b.branch?.code || ""
              if (id && name) map[id] = { name, code }
            })
            setBranchMap(map)
          }
        } catch (e) {
          console.error("Failed to load branches for name mapping:", e)
        }
      } catch (err) {
        console.error("Error loading profile metadata:", err)
      }
    }

    fetchMetadata()
  }, [])

  // Resolve any remaining course IDs that might be unlisted in public courses
  useEffect(() => {
    if (!profile?.areas_of_expertise || profile.areas_of_expertise.length === 0) return
    const missing = profile.areas_of_expertise.filter(
      (id) => id && id.includes("-") && !courseNameMap[id]
    )
    if (missing.length === 0) return

    const token = localStorage.getItem("access_token") || localStorage.getItem("token")

    Promise.all(
      missing.map(async (id) => {
        try {
          const res = await fetch(getBackendApiUrl(`courses/${encodeURIComponent(id)}`), {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined
          })
          if (!res.ok) return null
          const data = await res.json()
          const name = data?.title || data?.name || data?.course?.title || data?.course?.name
          return name ? ([id, String(name)] as const) : null
        } catch {
          return null
        }
      })
    ).then((results) => {
      const found = results.filter((r): r is readonly [string, string] => r !== null)
      if (found.length > 0) {
        setCourseNameMap((prev) => ({ ...prev, ...Object.fromEntries(found) }))
      }
    })
  }, [profile?.areas_of_expertise, courseNameMap])

  // Fetch coach profile and availability
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const storedCoach = localStorage.getItem("coach")
        if (!storedCoach) {
          router.push("/coach/login")
          return
        }

        const coachData = JSON.parse(storedCoach)
        const coachId = coachData.id
        const token = localStorage.getItem("access_token") || localStorage.getItem("token")

        const response = await fetch(getBackendApiUrl(`coaches/${coachId}`), {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          }
        })

        if (!response.ok) {
          throw new Error("Failed to fetch profile")
        }

        const data: CoachProfile = await response.json()
        console.log("Fetched coach profile:", data)
        setProfile(data)

        // Fetch availability slots
        try {
          const availRes = await fetch(getBackendApiUrl(`coach-availability/coach/${coachId}`), {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined
          })
          if (availRes.ok) {
            const availData = await availRes.json()
            if (Array.isArray(availData?.weekly_slots)) {
              setAvailabilitySlots(availData.weekly_slots)
            }
          }
        } catch (e) {
          console.log("No availability data found or error fetching availability:", e)
        }
      } catch (err: any) {
        setError(err.message || "Something went wrong")
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <CoachDashboardHeader currentPage="Profile" coachName={profile?.full_name} />
        <main className="mx-auto py-6 sm:px-6 lg:px-8">
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
        <CoachDashboardHeader currentPage="Profile" coachName="Coach" />
        <main className="mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-red-600">
                  <p className="font-medium">Error loading profile</p>
                  <p className="text-sm mt-1">{error}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    )
  }

  const sortedAvailability = [...availabilitySlots].sort((a, b) => {
    const orderA = WEEKDAY_ORDER[a.weekday?.toLowerCase()] || 99
    const orderB = WEEKDAY_ORDER[b.weekday?.toLowerCase()] || 99
    return orderA - orderB
  })

  // Normalize qualifications to array of objects or strings
  const qualificationsList = Array.isArray(profile.professional_info?.qualifications) && profile.professional_info?.qualifications.length > 0
    ? profile.professional_info.qualifications
    : []

  // Normalize certifications
  const certificationsList = Array.isArray(profile.professional_info?.certifications)
    ? profile.professional_info.certifications
    : typeof profile.professional_info?.certifications === "string" && profile.professional_info.certifications.trim()
    ? profile.professional_info.certifications.split(",").map(c => c.trim()).filter(Boolean)
    : []

  const branchDisplay = profile.branch_id && branchMap[profile.branch_id]
    ? `${branchMap[profile.branch_id].name}${branchMap[profile.branch_id].code ? ` (${branchMap[profile.branch_id].code})` : ""}`
    : profile.branch_name || profile.branch_id || "Not Assigned"

  const categoryDisplay = profile.professional_info?.category_id
    ? categoryMap[profile.professional_info.category_id] || profile.professional_info.category_id
    : null

  const subCategoryDisplay = profile.professional_info?.sub_category_id
    ? categoryMap[profile.professional_info.sub_category_id] || profile.professional_info.sub_category_id
    : null

  return (
    <div className="min-h-screen bg-gray-50">
      <CoachDashboardHeader currentPage="Profile" coachName={profile.full_name} />

      <main className="mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">My Profile</h1>
              <p className="text-sm text-gray-600">View and manage your coach profile details</p>
            </div>
            <Button
              variant="outline"
              className="flex items-center space-x-2 border-gray-300 hover:bg-gray-100 self-start sm:self-auto"
              onClick={() => router.push("/coach-dashboard/profile/edit")}
            >
              <Edit className="w-4 h-4" />
              <span>Edit Profile</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Overview, Emergency Contact, Account Timestamps */}
            <div className="lg:col-span-1 space-y-6">
              {/* Profile Overview Card */}
              <Card className="shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center space-x-2 text-base font-semibold text-gray-900">
                    <User className="w-5 h-5 text-gray-500" />
                    <span>Profile Overview</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <Avatar className="h-28 w-28 mx-auto mb-4 border-2 border-yellow-400/50 shadow-sm">
                      <AvatarImage
                        src={profile.profile_image_url ? resolvePublicAssetUrl(profile.profile_image_url) : ""}
                        alt={profile.full_name}
                        className="object-cover"
                      />
                      <AvatarFallback className="text-2xl bg-yellow-100 text-yellow-800 font-bold">
                        {profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {profile.full_name}
                    </h3>

                    <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
                      <Badge className={profile.is_active ? 'bg-green-100 text-green-800 hover:bg-green-100' : 'bg-red-100 text-red-800 hover:bg-red-100'}>
                        <UserCheck className="w-3 h-3 mr-1" />
                        {profile.is_active ? 'Active' : 'Inactive'}
                      </Badge>

                      {(profile.professional_info?.designation_id || profile.professional_info?.specialization) && (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200">
                          <Award className="w-3 h-3 mr-1" />
                          {profile.professional_info.designation_id || profile.professional_info.specialization}
                        </Badge>
                      )}

                      {profile.featured_on_homepage && (
                        <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300">
                          <Sparkles className="w-3 h-3 mr-1" />
                          Featured Coach
                        </Badge>
                      )}
                    </div>

                    {/* Website Metadata: Rating & Display Order */}
                    {(profile.homepage_rating != null || (profile.display_order != null && profile.display_order !== undefined)) && (
                      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-around text-xs text-gray-600">
                        {profile.homepage_rating != null && (
                          <div className="flex items-center space-x-1">
                            <Star className="w-4 h-4 text-yellow-500 fill-current" />
                            <span className="font-semibold text-gray-900">{profile.homepage_rating.toFixed(1)}</span>
                            <span>Rating</span>
                          </div>
                        )}
                        {profile.display_order != null && profile.display_order !== undefined && (
                          <div className="flex items-center space-x-1">
                            <Globe className="w-4 h-4 text-blue-500" />
                            <span>Order: <strong className="text-gray-900">#{profile.display_order}</strong></span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Short Bio / About */}
                    {(profile.about_short || profile.professional_info?.bio) && (
                      <div className="mt-4 pt-4 border-t border-gray-100 text-left">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                          {profile.about_short ? "Homepage Bio" : "About"}
                        </label>
                        <p className="text-sm text-gray-600 leading-relaxed">
                          {profile.about_short || profile.professional_info?.bio}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Emergency Contact Card */}
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-base font-semibold text-gray-900">
                    <ShieldAlert className="w-5 h-5 text-red-500" />
                    <span>Emergency Contact</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {profile.emergency_contact?.name || profile.emergency_contact?.phone ? (
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-gray-500 block">Contact Name</label>
                        <p className="text-sm font-medium text-gray-900">{profile.emergency_contact.name || "N/A"}</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 block">Contact Phone</label>
                        <p className="text-sm font-medium text-gray-900">
                          {profile.emergency_contact.phone ? cleanPhoneNumber(profile.emergency_contact.phone) : "N/A"}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 block">Relationship</label>
                        <p className="text-sm font-medium text-gray-900 capitalize">
                          {profile.emergency_contact.relationship || "N/A"}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">No emergency contact provided</p>
                  )}
                </CardContent>
              </Card>

              {/* Account Information Card */}
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-base font-semibold text-gray-900">
                    <Calendar className="w-5 h-5 text-gray-500" />
                    <span>Account Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Member Since</span>
                    <span className="font-medium text-gray-900">{formatDate(profile.created_at)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Last Updated</span>
                    <span className="font-medium text-gray-900">{formatDate(profile.updated_at)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Coach ID</span>
                    <span className="font-mono text-xs text-gray-600">{profile.id}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Personal, Contact, Address, Professional, Assignment, Availability */}
            <div className="lg:col-span-2 space-y-6">
              {/* Personal Information */}
              <Card className="shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center space-x-2 text-base font-semibold text-gray-900">
                    <User className="w-5 h-5 text-gray-500" />
                    <span>Personal Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500 block mb-1">First Name</label>
                      <p className="text-sm font-medium text-gray-900">{profile.personal_info?.first_name || profile.first_name || "N/A"}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 block mb-1">Last Name</label>
                      <p className="text-sm font-medium text-gray-900">{profile.personal_info?.last_name || profile.last_name || "N/A"}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 block mb-1">Gender</label>
                      <p className="text-sm font-medium text-gray-900 capitalize">{profile.personal_info?.gender || "N/A"}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 block mb-1">Date of Birth</label>
                      <p className="text-sm font-medium text-gray-900">
                        {profile.personal_info?.date_of_birth ? formatDate(profile.personal_info.date_of_birth) : "N/A"}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 block mb-1">Age</label>
                      <p className="text-sm font-medium text-gray-900">
                        {profile.personal_info?.date_of_birth ? calculateAge(profile.personal_info.date_of_birth) : "N/A"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Contact Information */}
              <Card className="shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center space-x-2 text-base font-semibold text-gray-900">
                    <Phone className="w-5 h-5 text-gray-500" />
                    <span>Contact Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-start space-x-3">
                      <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <label className="text-xs font-medium text-gray-500 block">Email</label>
                        <p className="text-sm font-medium text-gray-900">{profile.contact_info?.email || profile.email || "N/A"}</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <label className="text-xs font-medium text-gray-500 block">Phone Number</label>
                        <p className="text-sm font-medium text-gray-900">
                          {profile.contact_info?.country_code || "+91"} {cleanPhoneNumber(profile.contact_info?.phone || profile.phone)}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Address Information */}
              <Card className="shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center space-x-2 text-base font-semibold text-gray-900">
                    <MapPin className="w-5 h-5 text-gray-500" />
                    <span>Address Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className="text-xs font-medium text-gray-500 block mb-1">Address</label>
                      <p className="text-sm font-medium text-gray-900">
                        {profile.address_info?.address || profile.address_info?.street || "N/A"}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 block mb-1">Area / Locality</label>
                      <p className="text-sm font-medium text-gray-900">{profile.address_info?.area || "N/A"}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 block mb-1">City</label>
                      <p className="text-sm font-medium text-gray-900">{profile.address_info?.city || "N/A"}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 block mb-1">State</label>
                      <p className="text-sm font-medium text-gray-900">{profile.address_info?.state || "N/A"}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 block mb-1">ZIP Code</label>
                      <p className="text-sm font-medium text-gray-900">
                        {profile.address_info?.zip_code || profile.address_info?.postal_code || "N/A"}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 block mb-1">Country</label>
                      <p className="text-sm font-medium text-gray-900">{profile.address_info?.country || "India"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Professional Information */}
              <Card className="shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center space-x-2 text-base font-semibold text-gray-900">
                    <Award className="w-5 h-5 text-gray-500" />
                    <span>Professional Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500 block mb-1">Designation</label>
                      <p className="text-sm font-medium text-gray-900">
                        {profile.professional_info?.designation_id || profile.professional_info?.specialization || "N/A"}
                      </p>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-500 block mb-1">Years of Experience</label>
                      <p className="text-sm font-medium text-gray-900">
                        {profile.professional_info?.professional_experience || profile.professional_info?.years_of_experience || "N/A"}
                      </p>
                    </div>

                    {categoryDisplay && (
                      <div>
                        <label className="text-xs font-medium text-gray-500 block mb-1">Category</label>
                        <p className="text-sm font-medium text-gray-900">{categoryDisplay}</p>
                      </div>
                    )}

                    {subCategoryDisplay && (
                      <div>
                        <label className="text-xs font-medium text-gray-500 block mb-1">Sub Category</label>
                        <p className="text-sm font-medium text-gray-900">{subCategoryDisplay}</p>
                      </div>
                    )}
                  </div>

                  {/* Qualifications */}
                  {(qualificationsList.length > 0 || profile.professional_info?.education_qualification) && (
                    <div className="pt-2 border-t border-gray-100">
                      <label className="text-xs font-medium text-gray-500 mb-2 flex items-center">
                        <GraduationCap className="w-4 h-4 mr-1.5 text-gray-400" />
                        Qualifications
                      </label>
                      {qualificationsList.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {qualificationsList.map((q, idx) => (
                            <Badge key={idx} variant="outline" className="bg-gray-50 text-gray-800 border-gray-200">
                              {q.name} {q.year ? `(${q.year})` : ""}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-900">{profile.professional_info?.education_qualification}</p>
                      )}
                    </div>
                  )}

                  {/* Certifications */}
                  {certificationsList.length > 0 && (
                    <div className="pt-2 border-t border-gray-100">
                      <label className="text-xs font-medium text-gray-500 mb-2 flex items-center">
                        <Award className="w-4 h-4 mr-1.5 text-gray-400" />
                        Certifications
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {certificationsList.map((cert, idx) => (
                          <Badge key={idx} variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">
                            {cert}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Areas of Expertise */}
                  {profile.areas_of_expertise && profile.areas_of_expertise.length > 0 && (
                    <div className="pt-2 border-t border-gray-100">
                      <label className="text-xs font-medium text-gray-500 mb-2 flex items-center">
                        <Tag className="w-4 h-4 mr-1.5 text-gray-400" />
                        Areas of Expertise
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {profile.areas_of_expertise.map((area, index) => (
                          <Badge key={index} variant="outline" className="bg-blue-50 text-blue-800 border-blue-200">
                            {courseNameMap[area] || area}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Assignment Details Card */}
              <Card className="shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center space-x-2 text-base font-semibold text-gray-900">
                    <Briefcase className="w-5 h-5 text-gray-500" />
                    <span>Assignment Details</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex items-start space-x-3">
                      <Building className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <label className="text-xs font-medium text-gray-500 block">Assigned Branch</label>
                        <p className="text-sm font-medium text-gray-900">{branchDisplay}</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <label className="text-xs font-medium text-gray-500 block">Joining Date</label>
                        <p className="text-sm font-medium text-gray-900">
                          {profile.assignment_details?.join_date ? formatDate(profile.assignment_details.join_date) : "N/A"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <DollarSign className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <label className="text-xs font-medium text-gray-500 block">Monthly Salary</label>
                        <p className="text-sm font-medium text-gray-900">
                          {profile.assignment_details?.salary != null && profile.assignment_details?.salary !== ""
                            ? `₹${Number(profile.assignment_details.salary).toLocaleString('en-IN')}`
                            : "Not Specified"}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Weekly Availability Schedule */}
              {sortedAvailability.length > 0 && (
                <Card className="shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center space-x-2 text-base font-semibold text-gray-900">
                      <Clock className="w-5 h-5 text-gray-500" />
                      <span>Weekly Availability Schedule</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {sortedAvailability.map((slot, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50/70"
                        >
                          <span className="font-semibold text-sm capitalize text-gray-800">{slot.weekday}</span>
                          <span className="text-xs font-medium text-gray-600 bg-white px-2.5 py-1 rounded border border-gray-200">
                            {formatClock(slot.start_time)} – {formatClock(slot.end_time)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Additional Information (Achievements & Notes) */}
              {(profile.achievements || profile.notes) && (
                <Card className="shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center space-x-2 text-base font-semibold text-gray-900">
                      <FileText className="w-5 h-5 text-gray-500" />
                      <span>Additional Information</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {profile.achievements && (
                      <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                          Achievements & Awards
                        </label>
                        <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{profile.achievements}</p>
                      </div>
                    )}
                    {profile.notes && (
                      <div className={profile.achievements ? "pt-3 border-t border-gray-100" : ""}>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                          Notes
                        </label>
                        <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{profile.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
