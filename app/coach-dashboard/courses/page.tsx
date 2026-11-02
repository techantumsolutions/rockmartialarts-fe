"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Users, Clock, Eye, Loader2 } from "lucide-react"
import CoachDashboardHeader from "@/components/coach-dashboard-header"
import { checkCoachAuth, getCoachAuthHeaders } from "@/lib/coachAuth"

interface Course {
  id: string
  course_name: string
  course_code?: string
  name?: string // For compatibility
  title?: string // For compatibility
  description?: string
  difficulty_level?: string
  status: string
  assigned_date: string
  total_students?: number
  active_students?: number
  enrolled_students?: number // For compatibility
  branch_name?: string
  branch_id?: string
  category?: string
  pricing_amount?: number
  currency?: string
  offers_certification?: boolean
  is_instructor?: boolean
  is_assigned?: boolean
  // Additional fields from enhanced API response
  martial_art_style_id?: string
  category_id?: string
  instructor_id?: string
  student_requirements?: {
    max_students: number
    min_age: number
    max_age: number
    prerequisites: string[]
  }
  course_content?: {
    syllabus: string
    equipment_required: string[]
  }
  media_resources?: {
    course_image_url?: string
    promo_video_url?: string
  }
  pricing?: {
    currency: string
    amount: number
    branch_specific_pricing: boolean
  }
  settings?: {
    offers_certification: boolean
    active: boolean
  }
  branch_assignments?: Array<{
    branch_id: string
    branch_name: string
  }>
  created_at?: string
  updated_at?: string
}

export default function AssignedCoursesPage() {
  const router = useRouter()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [coachData, setCoachData] = useState<any>(null)

  useEffect(() => {
    // Use the robust coach authentication check
    const authResult = checkCoachAuth()

    if (!authResult.isAuthenticated) {
      console.log("Coach not authenticated:", authResult.error)
      router.push("/coach/login")
      return
    }

    if (authResult.coach && authResult.token) {
      setCoachData(authResult.coach)
      fetchAssignedCourses(authResult.token, authResult.coach.id)
    } else {
      setError("Coach information not found")
      setLoading(false)
    }
  }, [router])

  const fetchAssignedCourses = async (token: string, coachId: string) => {
    try {
      setLoading(true)
      setError(null)

      // Optional: Keep minimal logging for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log("🔑 Fetching courses for coach:", coachId)
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/coaches/${coachId}/courses`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        // Get error details from response
        let errorDetails = null
        try {
          errorDetails = await response.json()
        } catch (e) {
          errorDetails = await response.text()
        }

        if (process.env.NODE_ENV === 'development') {
          console.error("❌ API Error:", {
            status: response.status,
            statusText: response.statusText,
            errorDetails
          })
        }

        if (response.status === 401) {
          // Token expired or invalid
          localStorage.clear()
          router.push("/coach/login")
          return
        }
        throw new Error(`Failed to fetch courses: ${response.status}`)
      }

      const data = await response.json()
      console.log("Fetched coach courses:", data)
      
      // Handle different response formats
      const coursesData = data.courses || data.course_assignments || []
      setCourses(coursesData)

    } catch (err: any) {
      console.error('Error fetching assigned courses:', err)
      setError(err.message || 'Failed to load assigned courses')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'inactive':
        return 'bg-gray-100 text-gray-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'completed':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getDifficultyColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'beginner':
        return 'bg-green-100 text-green-800'
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800'
      case 'advanced':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <CoachDashboardHeader 
          currentPage="Assigned Courses"
          coachName={coachData?.full_name || coachData?.name}
        />
        <main className="mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-yellow-400" />
              <span className="ml-2 text-gray-600">Loading assigned courses...</span>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CoachDashboardHeader 
        currentPage="Assigned Courses"
        coachName={coachData?.full_name || coachData?.name}
      />
      
      <main className="mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Page Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Assigned Courses</h1>
            <p className="text-gray-600">Manage and view all courses assigned to you</p>
          </div>

          {/* Error State */}
          {error && (
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="text-center text-red-600">
                  <p className="font-medium">Error loading courses</p>
                  <p className="text-sm mt-1">{error}</p>
                  <Button 
                    onClick={() => coachData && fetchAssignedCourses(localStorage.getItem("access_token")!, coachData.id)}
                    className="mt-4"
                    variant="outline"
                  >
                    Try Again
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Courses Grid */}
          {!error && (
            <>
              {courses.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-8">
                      <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Courses Assigned</h3>
                      <p className="text-gray-500">You don't have any courses assigned yet. Contact your administrator for course assignments.</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {courses.map((course) => (
                    <Card key={course.id} className="flex flex-col h-full hover:shadow-lg transition-shadow duration-200">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg font-semibold text-gray-900 mb-2">
                              {course.course_name || course.name || course.title || "Unknown Course"}
                            </CardTitle>
                            {course.course_code && (
                              <p className="text-sm text-gray-500 mb-2">Code: {course.course_code}</p>
                            )}
                            {course.pricing_amount && (
                              <p className="text-sm font-medium text-green-600 mb-2">
                                {course.currency || "INR"} {course.pricing_amount.toLocaleString()}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end space-y-1">
                            <Badge className={getStatusColor(course.status)}>
                              {course.status}
                            </Badge>
                            {course.offers_certification && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                Certified
                              </Badge>
                            )}
                          </div>
                        </div>

                        {course.description && (
                          <p className="text-sm text-gray-600 line-clamp-2">{course.description}</p>
                        )}
                      </CardHeader>
                      
                      <CardContent className="flex-1 flex flex-col justify-between pt-0">
                        <div className="space-y-3">
                          {/* Course Details */}
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Difficulty:</span>
                            {course.difficulty_level && (
                              <Badge variant="outline" className={getDifficultyColor(course.difficulty_level)}>
                                {course.difficulty_level}
                              </Badge>
                            )}
                          </div>

                          {course.branch_name && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-500">Branch:</span>
                              <span className="font-medium">{course.branch_name}</span>
                            </div>
                          )}

                          {course.category && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-500">Category:</span>
                              <span className="font-medium">{course.category}</span>
                            </div>
                          )}

                          {/* Role Information */}
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Role:</span>
                            <span className="font-medium">
                              {course.is_instructor ? "Instructor" : "Assigned"}
                            </span>
                          </div>

                          {/* Student Requirements */}
                          {course.student_requirements && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-500">Max Students:</span>
                              <span className="font-medium">{course.student_requirements.max_students}</span>
                            </div>
                          )}

                          {/* Student Stats */}
                          <div className="flex items-center space-x-4 text-sm pt-2 border-t">
                            <div className="flex items-center space-x-1">
                              <Users className="w-4 h-4 text-blue-500" />
                              <span className="text-gray-600">
                                {course.active_students || course.total_students || course.enrolled_students || 0} students
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="w-4 h-4 text-green-500" />
                              <span className="text-gray-600">
                                {course.assigned_date ? new Date(course.assigned_date).toLocaleDateString() : 'N/A'}
                              </span>
                            </div>
                          </div>

                        </div>

                        {/* Action Button */}
                        <div className="pt-4 mt-auto">
                          <Button 
                            onClick={() => router.push(`/coach-dashboard/courses/${course.id}`)}
                            className="w-full bg-yellow-400 hover:bg-yellow-500 text-black"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
