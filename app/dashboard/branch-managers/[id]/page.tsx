"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  ArrowLeft, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Building, 
  Edit,
  UserCheck,
  Award,
  Briefcase
} from "lucide-react"
import DashboardHeader from "@/components/dashboard-header"
import { TokenManager } from "@/lib/tokenManager"
import { getBackendApiUrl } from "@/lib/config"

interface BranchManagerDetails {
  id: string
  personal_info: {
    first_name: string
    last_name: string
    gender: string
    date_of_birth: string
  }
  address_info:{
    address: string,
    area: string,
    city: string,
    state: string,
    zip_code: string,
    country: string
  }
  phone: string
  email: string
  contact_info: {
    email: string
    phone: string
    country_code: string 
    address: {
      street: string
      area: string
      city: string
      state: string
      postal_code: string
      country: string
    }
  }
  professional_info: {
    designation: string
    education_qualification: string
    professional_experience: string
    certifications: string[]
  }
  branch_assignment: {
    branch_id: string
    branch_name: string
    branch_location: string
  }
  emergency_contact: {
    name: string
    phone: string
    relationship: string
  }
  full_name: string
  is_active: boolean
  notes: string
  created_at: string
  updated_at: string
}

export default function BranchManagerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const managerId = params.id as string

  const [manager, setManager] = useState<BranchManagerDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchManagerDetails()
  }, [managerId])

  const fetchManagerDetails = async () => {
    try {
      setLoading(true)
      setError(null)

      const token = TokenManager.getToken()
      if (!token) {
        throw new Error("Authentication token not found. Please login again.")
      }

      const response = await fetch(getBackendApiUrl(`branch-managers/${managerId}`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Academy manager not found")
        }
        const errorData = await response.json()
        throw new Error(errorData.detail || errorData.message || `Failed to fetch academy manager details (${response.status})`)
      }
      
      const data = await response.json()
      console.log("Fetched academy manager details:", data)
      setManager(data)

    } catch (err: any) {
      console.error("Error fetching academy manager details:", err)
      setError(err.message || "Failed to fetch academy manager details")
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader currentPage="Academy Manager Details" />
        <main className="w-full p-4 lg:px-8">
          <div className="mx-auto">
            <div className="animate-pulse space-y-6">
              <div className="flex items-center space-x-4">
                <div className="h-8 w-8 bg-gray-200 rounded"></div>
                <div className="h-8 bg-gray-200 rounded w-1/4"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="bg-white rounded-lg p-6 space-y-4">
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (error || !manager) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader currentPage="Academy Manager Details" />
        <main className="w-full p-4 lg:px-8">
          <div className="mx-auto">
            <div className="text-center py-8">
              <p className="text-red-600">{error || "Academy manager not found"}</p>
              <Button 
                onClick={() => router.push("/dashboard/branch-managers")}
                className="mt-4"
              >
                Back to Branch Managers
              </Button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader currentPage="Academy Manager Details" />
      
      <main className="w-full p-4 lg:px-8">
        <div className="mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/dashboard/branch-managers")}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Academy Managers</span>
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{manager.full_name}</h1>
                <p className="text-sm text-gray-500">Academy Manager Details</p>
              </div>
            </div>
            <div className="flex space-x-3">
              <Button
                onClick={() => router.push(`/dashboard/branch-managers/edit/${managerId}`)}
                className=""
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Manager
              </Button>
            </div>
          </div>

          {/* Status Badge */}
          <div className="mb-6">
            <Badge variant={manager.is_active ? "default" : "secondary"} className="text-sm">
              {manager.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <span>Personal Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">Email</p>
                    <p className="text-sm text-gray-600">{manager.email || manager.contact_info?.email}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">Phone</p>
                    <p className="text-sm text-gray-600">
                      {manager.contact_info?.country_code && `${manager.contact_info.country_code} `}
                      {manager.phone || manager.contact_info?.phone}
                    </p>
                  </div>
                </div>
                {manager.personal_info?.gender && (
                  <div className="flex items-center space-x-3">
                    <User className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">Gender</p>
                      <p className="text-sm text-gray-600">{manager.personal_info.gender}</p>
                    </div>
                  </div>
                )}
                {manager.personal_info?.date_of_birth && (
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">Date of Birth</p>
                      <p className="text-sm text-gray-600">{formatDate(manager.personal_info.date_of_birth)}</p>
                    </div>
                  </div>
                )}

                {manager.address_info && (
                  <div className="flex items-start space-x-3">
                    <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Address</p>
                      <p className="text-sm text-gray-600">
                        {manager.address_info.address && `${manager.address_info.address}`}<br />
                        {manager.address_info.area && `${manager.address_info.area}, `}
                        {manager.address_info.city && `${manager.address_info.city}, `}
                        {manager.address_info.state}<br />
                        {manager.address_info.zip_code && `${manager.address_info.zip_code}, `}
                        {manager.address_info.country}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">Joined</p>
                    <p className="text-sm text-gray-600">{formatDate(manager.created_at)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Professional Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <span>Professional Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Building className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">Designation</p>
                    <p className="text-sm text-gray-600">{manager.professional_info?.designation}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Building className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">Academy Assignment</p>
                    <p className="text-sm text-gray-600">
                      {manager.branch_assignment?.branch_name}
                      {manager.branch_assignment?.branch_location && (
                        <span className="text-gray-500"> - {manager.branch_assignment.branch_location}</span>
                      )}
                    </p>
                  </div>
                </div>

                {manager.professional_info?.professional_experience && (
                  <div className="flex items-center space-x-3">
                    <Briefcase className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">Experience</p>
                      <p className="text-sm text-gray-600">{manager.professional_info?.professional_experience} years</p>
                    </div>
                  </div>
                )}

                {manager.professional_info?.education_qualification && (
                  <div>
                    <p className="font-medium text-gray-900 mb-2">Education Qualification</p>
                    <p className="text-sm text-gray-600">{manager.professional_info?.education_qualification}</p>
                  </div>
                )}

                {manager.professional_info?.certifications && manager.professional_info?.certifications.length > 0 && (
                  <div>
                    <p className="font-medium text-gray-900 mb-2">Certifications</p>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {manager.professional_info.certifications.map((certification, index) => (
                        <li key={index} className="flex items-center space-x-2">
                          <Award className="w-4 h-4" />
                          <span>{certification}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Emergency Contact and Additional Information */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
            {/* Emergency Contact */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <span>Emergency Contact</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {manager.emergency_contact?.name ? (
                  <>
                    <div className="flex items-center space-x-3">
                      <User className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">Name</p>
                        <p className="text-sm text-gray-600">{manager.emergency_contact?.name}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Phone className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">Phone</p>
                        <p className="text-sm text-gray-600">{manager.emergency_contact?.phone}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <User className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">Relationship</p>
                        <p className="text-sm text-gray-600">{manager.emergency_contact?.relationship}</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">No emergency contact information available</p>
                )}
              </CardContent>
            </Card>

            {/* Additional Information */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {manager.notes ? (
                  <div>
                    <p className="font-medium text-gray-900 mb-2">Notes</p>
                    <p className="text-sm text-gray-600">{manager.notes}</p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No additional notes available</p>
                )}

                <div className="flex items-center space-x-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">Last Updated</p>
                    <p className="text-sm text-gray-600">{formatDate(manager.updated_at)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
