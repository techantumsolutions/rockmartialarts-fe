"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ArrowLeft,
  MapPin,
  Phone,
  Mail,
  Clock,
  Users,
  BookOpen,
  Building2,
  Edit,
  Calendar,
  DollarSign,
  TrendingUp,
  User
} from "lucide-react"
import Header from "@/components/layout/Header"
import { getBackendApiUrl } from "@/lib/config"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"

interface BranchDetails {
  id: string
  branch: {
    name: string
    address: {
      street: string
      city: string
      state: string
      postal_code: string
      country: string
    }
    phone: string
    email?: string
    operating_hours?: {
      monday?: string
      tuesday?: string
      wednesday?: string
      thursday?: string
      friday?: string
      saturday?: string
      sunday?: string
    }
  }
  is_active: boolean
  created_at: string
  updated_at: string
  // Additional computed data
  total_students?: number
  total_coaches?: number
  active_courses?: number
  monthly_revenue?: number
}

interface Course {
  id: string
  name: string
  difficulty_level: string
  enrolled_students: number
  instructor_name?: string
}

interface Coach {
  id: string
  full_name: string
  contact_info: {
    email: string
    phone: string
  }
  areas_of_expertise: string[]
  is_active: boolean
}

export default function BranchManagerBranchDetailPage() {
  const params = useParams()
  const router = useRouter()
  const branchId = params.id as string

  const [branch, setBranch] = useState<BranchDetails | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check authentication first
    if (!BranchManagerAuth.isAuthenticated()) {
      router.replace('/branch-manager/login')
      return
    }
    fetchBranchDetails()
  }, [branchId, router])

  const fetchBranchDetails = async () => {
    try {
      setLoading(true)
      setError(null)

      const token = BranchManagerAuth.getToken()
      if (!token) {
        throw new Error("Authentication token not found. Please login again.")
      }

      console.log('🔍 Fetching branch details for ID:', branchId)

      // Call the new backend API endpoint
      const response = await fetch(getBackendApiUrl(`branch-details/${branchId}`), {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Branch not found")
        } else if (response.status === 403) {
          throw new Error("You don't have permission to access this branch")
        } else if (response.status === 401) {
          throw new Error("Authentication failed. Please login again.")
        }

        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || errorData.message || `Failed to fetch branch details (${response.status})`)
      }

      const data = await response.json()
      console.log('✅ Branch details received:', data)

      // Map the API response to our component state
      if (data.branch) {
        setBranch(data.branch)
      }

      if (data.courses) {
        setCourses(data.courses)
      }

      if (data.coaches) {
        setCoaches(data.coaches)
      }

    } catch (err: any) {
      console.error("❌ Error fetching branch details:", err)
      setError(err.message || "Failed to fetch branch details")

      // If authentication error, redirect to login
      if (err.message.includes("Authentication") || err.message.includes("login")) {
        BranchManagerAuth.logout()
        router.replace('/branch-manager/login')
      }
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount)
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
        <Header title="Branch Details" role="branch_admin" />
        <main className="w-full p-4 lg:py-4 px-19">
          <div className="mx-auto">
            <div className="animate-pulse space-y-6">
              <div className="flex items-center space-x-4">
                <div className="h-8 w-8 bg-gray-200 rounded"></div>
                <div className="h-8 bg-gray-200 rounded w-1/4"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {Array.from({ length: 4 }).map((_, index) => (
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

  if (error || !branch) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Branch Details" role="branch_admin" />
        <main className="w-full p-4 lg:py-4 px-19">
          <div className="mx-auto">
            <div className="text-center py-8">
              <p className="text-red-600">{error || "Branch not found"}</p>
              <Button 
                onClick={() => router.push("/branch-manager-dashboard/branches")}
                className="mt-4"
              >
                Back to Branches
              </Button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Branch Details" role="branch_admin" />
      
      <main className="w-full p-4 lg:py-4 px-19">
        <div className="mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/branch-manager-dashboard/branches")}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Branches</span>
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{branch.branch.name}</h1>
                <p className="text-sm text-gray-500">Branch Details</p>
              </div>
            </div>
            <div className="flex space-x-3">
              <Button
                onClick={() => router.push(`/branch-manager-dashboard/branches/edit/${branchId}`)}
                className="text-white"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Branch
              </Button>
            </div>
          </div>

          {/* Status Badge */}
          <div className="mb-6">
            <Badge variant={branch.is_active ? "default" : "secondary"} className="text-sm">
              {branch.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Students</p>
                    <p className="text-2xl font-bold text-blue-600">{branch.total_students}</p>
                  </div>
                  <Users className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Coaches</p>
                    <p className="text-2xl font-bold text-green-600">{branch.total_coaches}</p>
                  </div>
                  <User className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Courses</p>
                    <p className="text-2xl font-bold text-purple-600">{branch.active_courses}</p>
                  </div>
                  <BookOpen className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {formatCurrency(branch.monthly_revenue || 0)}
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Branch Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  <span>Branch Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start space-x-3">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Address</p>
                    <p className="text-sm text-gray-600">
                      {branch.branch.address.street}<br />
                      {branch.branch.address.city}, {branch.branch.address.state}<br />
                      {branch.branch.address.postal_code}, {branch.branch.address.country}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">Phone</p>
                    <p className="text-sm text-gray-600">{branch.branch.phone}</p>
                  </div>
                </div>

                {branch.branch.email && (
                  <div className="flex items-center space-x-3">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">Email</p>
                      <p className="text-sm text-gray-600">{branch.branch.email}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">Established</p>
                    <p className="text-sm text-gray-600">{formatDate(branch.created_at)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Operating Hours */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <span>Operating Hours</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {branch.branch.operating_hours ? (
                  <div className="space-y-2">
                    {Array.isArray(branch.branch.operating_hours) ? (
                      // Handle array format from API (timings array)
                      branch.branch.operating_hours.map((timing: any, index: number) => (
                        <div key={index} className="flex justify-between items-center">
                          <span className="font-medium text-gray-900 capitalize">{timing.day}</span>
                          <span className="text-sm text-gray-600">{timing.open} - {timing.close}</span>
                        </div>
                      ))
                    ) : (
                      // Handle object format (day: hours)
                      Object.entries(branch.branch.operating_hours).map(([day, hours]) => (
                        <div key={day} className="flex justify-between items-center">
                          <span className="font-medium text-gray-900 capitalize">{day}</span>
                          <span className="text-sm text-gray-600">{hours}</span>
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Operating hours not specified</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Courses and Coaches */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
            {/* Active Courses */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <BookOpen className="w-5 h-5 text-blue-600" />
                    <span>Active Courses</span>
                  </div>
                  <Badge variant="secondary">{courses.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {courses.length > 0 ? (
                    courses.map((course) => (
                      <div key={course.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{course.name || 'Unknown Course'}</p>
                          <p className="text-sm text-gray-600">
                            {course.difficulty_level || 'Unknown'} • {course.enrolled_students || 0} students
                          </p>
                          {course.instructor_name && (
                            <p className="text-xs text-gray-500">Instructor: {course.instructor_name}</p>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/branch-manager-dashboard/courses/${course.id}`)}
                        >
                          View
                        </Button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 text-sm">No courses assigned to this branch yet</p>
                      <p className="text-gray-400 text-xs mt-1">Contact your administrator to assign courses</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Coaches */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    <span>Coaches</span>
                  </div>
                  <Badge variant="secondary">{coaches.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {coaches.length > 0 ? (
                    coaches.map((coach) => (
                      <div key={coach.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{coach.full_name || 'Unknown Coach'}</p>
                          <p className="text-sm text-gray-600">{coach.contact_info?.email || 'No email provided'}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {coach.areas_of_expertise && coach.areas_of_expertise.length > 0 ? (
                              coach.areas_of_expertise.map((expertise, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {expertise}
                                </Badge>
                              ))
                            ) : (
                              <Badge variant="outline" className="text-xs text-gray-400">
                                No specialization listed
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/branch-manager-dashboard/coaches/${coach.id}`)}
                        >
                          View
                        </Button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 text-sm">No coaches assigned to this branch yet</p>
                      <p className="text-gray-400 text-xs mt-1">Contact your administrator to assign coaches</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
