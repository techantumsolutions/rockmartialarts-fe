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
  BookOpen,
  TrendingUp,
  Users,
  Clock,
  Award,
  Edit,
  Building2,
  Star,
  Target,
  GraduationCap,
  Briefcase,
  AlertCircle,
  XCircle
} from "lucide-react"
import Header from "@/components/layout/Header"
import { getBackendApiUrl } from "@/lib/config"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"

interface CoachDetails {
  id: string
  full_name: string
  contact_info: {
    email: string
    phone: string
    address?: {
      street?: string
      city?: string
      state?: string
      postal_code?: string
      country?: string
    }
  }
  areas_of_expertise: string[]
  qualifications?: string[]
  certifications?: string[]
  hire_date?: string
  is_active: boolean
  branch_assignments?: string[]
  bio?: string
  experience_years?: number
  created_at: string
  updated_at: string
  // Performance metrics
  total_students?: number
  active_courses?: number
  student_satisfaction?: number
  retention_rate?: number
}

interface CourseAssignment {
  id: string
  course_name: string
  difficulty_level: string
  enrolled_students: number
  schedule?: string
  branch_name?: string
  status: 'active' | 'completed' | 'upcoming'
}

interface StudentAssignment {
  id: string
  student_name: string
  course_name: string
  enrollment_date: string
  progress: number
  status: 'active' | 'completed' | 'paused'
}

export default function BranchManagerCoachDetailPage() {
  const params = useParams()
  const router = useRouter()
  const coachId = params.id as string

  const [coach, setCoach] = useState<CoachDetails | null>(null)
  const [courseAssignments, setCourseAssignments] = useState<CourseAssignment[]>([])
  const [studentAssignments, setStudentAssignments] = useState<StudentAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [coursesLoading, setCoursesLoading] = useState(true)
  const [studentsLoading, setStudentsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check authentication first
    if (!BranchManagerAuth.isAuthenticated()) {
      router.replace('/branch-manager/login')
      return
    }
    fetchCoachDetails()
  }, [coachId, router])

  const fetchCoachDetails = async () => {
    try {
      setLoading(true)
      setError(null)

      const token = BranchManagerAuth.getToken()
      if (!token) {
        throw new Error("Authentication token not found. Please login again.")
      }

      // Fetch coach basic details
      console.log('🔍 Fetching coach details for ID:', coachId)
      const coachResponse = await fetch(getBackendApiUrl(`coaches/${coachId}`), {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      if (!coachResponse.ok) {
        if (coachResponse.status === 404) {
          throw new Error("Coach not found")
        }
        if (coachResponse.status === 403) {
          throw new Error("You don't have permission to view this coach")
        }
        const errorText = await coachResponse.text()
        throw new Error(`Failed to fetch coach details: ${coachResponse.status} - ${errorText}`)
      }

      const coachData = await coachResponse.json()
      console.log('✅ Coach data received:', coachData)

      // Transform the API response to match our interface
      const coach: CoachDetails = {
        id: coachData.id,
        full_name: coachData.full_name,
        contact_info: {
          email: coachData.contact_info?.email || "",
          phone: coachData.contact_info?.phone || "",
          address: coachData.address_info || coachData.contact_info?.address || {
            street: "",
            city: "",
            state: "",
            postal_code: "",
            country: ""
          }
        },
        areas_of_expertise: coachData.areas_of_expertise || [],
        qualifications: coachData.professional_info?.qualifications || [],
        certifications: coachData.professional_info?.certifications || [],
        hire_date: coachData.professional_info?.hire_date || coachData.created_at,
        is_active: coachData.is_active,
        branch_assignments: coachData.branch_id ? [coachData.branch_id] : [],
        bio: coachData.professional_info?.bio || "",
        experience_years: coachData.professional_info?.experience_years || 0,
        created_at: coachData.created_at,
        updated_at: coachData.updated_at,
        total_students: 0, // Will be calculated from student assignments
        active_courses: 0, // Will be calculated from course assignments
        student_satisfaction: 0, // Would need to be calculated from ratings
        retention_rate: 0 // Would need to be calculated from historical data
      }

      // Fetch course assignments
      console.log('🔍 Fetching course assignments...')
      const coursesResponse = await fetch(getBackendApiUrl(`coaches/${coachId}/courses`), {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      let courseAssignments: CourseAssignment[] = []
      if (coursesResponse.ok) {
        const coursesData = await coursesResponse.json()
        console.log('✅ Course assignments received:', coursesData)

        courseAssignments = coursesData.courses?.map((course: any) => ({
          id: course.id,
          course_name: course.course_name || course.title || "Unknown Course",
          difficulty_level: course.difficulty_level || "Beginner",
          enrolled_students: course.enrolled_students || 0,
          schedule: course.schedule || "Schedule TBD",
          branch_name: course.branch_name || "Unknown Branch",
          status: course.status || 'active'
        })) || []
      } else {
        console.warn('⚠️ Failed to fetch course assignments:', coursesResponse.status)
      }

      // Fetch student assignments
      console.log('🔍 Fetching student assignments...')
      const studentsResponse = await fetch(getBackendApiUrl(`coaches/${coachId}/students`), {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      let studentAssignments: StudentAssignment[] = []
      if (studentsResponse.ok) {
        const studentsData = await studentsResponse.json()
        console.log('✅ Student assignments received:', studentsData)

        studentAssignments = studentsData.students?.map((student: any) => ({
          id: student.id,
          student_name: student.student_name || student.full_name || "Unknown Student",
          course_name: student.course_name || "Unknown Course",
          enrollment_date: student.enrollment_date || student.created_at,
          progress: student.progress || 0,
          status: student.status || 'active'
        })) || []
      } else {
        console.warn('⚠️ Failed to fetch student assignments:', studentsResponse.status)
      }

      // Update coach with calculated metrics
      coach.active_courses = courseAssignments.length
      coach.total_students = studentAssignments.length

      setCoach(coach)
      setCourseAssignments(courseAssignments)
      setStudentAssignments(studentAssignments)

    } catch (err: any) {
      console.error("Error fetching coach details:", err)
      setError(err.message || "Failed to fetch coach details")
    } finally {
      setLoading(false)
      setCoursesLoading(false)
      setStudentsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      case 'upcoming': return 'bg-yellow-100 text-yellow-800'
      case 'paused': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Coach Details" role="branch_admin" />
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

  if (error) {
    const getErrorIcon = () => {
      if (error.includes("permission") || error.includes("403")) {
        return <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
      }
      if (error.includes("not found") || error.includes("404")) {
        return <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
      }
      return <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
    }

    const getErrorTitle = () => {
      if (error.includes("permission") || error.includes("403")) {
        return "Access Denied"
      }
      if (error.includes("not found") || error.includes("404")) {
        return "Coach Not Found"
      }
      return "Error Loading Coach"
    }

    const getErrorDescription = () => {
      if (error.includes("permission") || error.includes("403")) {
        return "You don't have permission to view this coach. This coach may not be working in any branches you manage."
      }
      if (error.includes("not found") || error.includes("404")) {
        return "The coach you're looking for doesn't exist or may have been removed."
      }
      return "There was an error loading the coach details. Please try again."
    }

    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Coach Details" role="branch_admin" />
        <main className="w-full p-4 lg:py-4 px-19">
          <div className="mx-auto">
            <div className="flex items-center mb-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/branch-manager-dashboard/coaches")}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Coaches</span>
              </Button>
            </div>

            <Card className="max-w-md mx-auto">
              <CardContent className="text-center py-8">
                {getErrorIcon()}
                <h2 className="text-xl font-semibold text-gray-900 mb-2">{getErrorTitle()}</h2>
                <p className="text-gray-600 mb-6">{getErrorDescription()}</p>
                <div className="space-y-3">
                  <Button
                    onClick={() => fetchCoachDetails()}
                    className="w-full"
                  >
                    Try Again
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => router.push("/branch-manager-dashboard/coaches")}
                    className="w-full"
                  >
                    Back to Coaches
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    )
  }

  // Don't render if coach data is not loaded yet
  if (!coach) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Coach Details" role="branch_admin" />
        <main className="w-full p-4 lg:py-4 px-19">
          <div className="mx-auto">
            <div className="animate-pulse space-y-6">
              <div className="flex items-center space-x-4">
                <div className="h-8 w-8 bg-gray-200 rounded"></div>
                <div className="h-8 bg-gray-200 rounded w-1/4"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-white p-6 rounded-lg shadow">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Coach Details" role="branch_admin" />

      <main className="w-full p-4 lg:py-4 px-19">
        <div className="mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/branch-manager-dashboard/coaches")}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Coaches</span>
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{coach.full_name}</h1>
                <p className="text-sm text-gray-500">Coach Details</p>
              </div>
            </div>
            <div className="flex space-x-3">
              <Button
                onClick={() => router.push(`/branch-manager-dashboard/coaches/edit/${coachId}`)}
                className="text-white"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Coach
              </Button>
            </div>
          </div>

          {/* Status Badge */}
          <div className="mb-6">
            <Badge variant={coach.is_active ? "default" : "secondary"} className="text-sm">
              {coach.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Students</p>
                    <p className="text-2xl font-bold text-blue-600">{coach.total_students}</p>
                  </div>
                  <Users className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Courses</p>
                    <p className="text-2xl font-bold text-green-600">{coach.active_courses}</p>
                  </div>
                  <BookOpen className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Satisfaction</p>
                    <p className="text-2xl font-bold text-purple-600">{coach.student_satisfaction}/5</p>
                  </div>
                  <Star className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Retention Rate</p>
                    <p className="text-2xl font-bold text-orange-600">{coach.retention_rate}%</p>
                  </div>
                  <Target className="w-8 h-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="w-5 h-5 text-blue-600" />
                  <span>Personal Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">Email</p>
                    <p className="text-sm text-gray-600">{coach.contact_info.email}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">Phone</p>
                    <p className="text-sm text-gray-600">{coach.contact_info.phone}</p>
                  </div>
                </div>

                {coach.contact_info.address && (
                  <div className="flex items-start space-x-3">
                    <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Address</p>
                      <p className="text-sm text-gray-600">
                        {coach.contact_info.address.street}<br />
                        {coach.contact_info.address.city}, {coach.contact_info.address.state}<br />
                        {coach.contact_info.address.postal_code}, {coach.contact_info.address.country}
                      </p>
                    </div>
                  </div>
                )}

                {coach.hire_date && (
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">Hire Date</p>
                      <p className="text-sm text-gray-600">{formatDate(coach.hire_date)}</p>
                    </div>
                  </div>
                )}

                {coach.experience_years && (
                  <div className="flex items-center space-x-3">
                    <Briefcase className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">Experience</p>
                      <p className="text-sm text-gray-600">{coach.experience_years} years</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Professional Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Award className="w-5 h-5 text-blue-600" />
                  <span>Professional Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="font-medium text-gray-900 mb-2">Areas of Expertise</p>
                  <div className="flex flex-wrap gap-2">
                    {coach.areas_of_expertise.map((expertise, index) => (
                      <Badge key={index} variant="outline" className="text-sm">
                        {expertise}
                      </Badge>
                    ))}
                  </div>
                </div>

                {coach.qualifications && coach.qualifications.length > 0 && (
                  <div>
                    <p className="font-medium text-gray-900 mb-2">Qualifications</p>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {coach.qualifications.map((qualification, index) => (
                        <li key={index} className="flex items-center space-x-2">
                          <GraduationCap className="w-4 h-4 text-blue-500" />
                          <span>{qualification}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {coach.certifications && coach.certifications.length > 0 && (
                  <div>
                    <p className="font-medium text-gray-900 mb-2">Certifications</p>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {coach.certifications.map((certification, index) => (
                        <li key={index} className="flex items-center space-x-2">
                          <Award className="w-4 h-4 text-green-500" />
                          <span>{certification}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {coach.bio && (
                  <div>
                    <p className="font-medium text-gray-900 mb-2">Bio</p>
                    <p className="text-sm text-gray-600">{coach.bio}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Course Assignments and Students */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
            {/* Course Assignments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <BookOpen className="w-5 h-5 text-blue-600" />
                    <span>Course Assignments</span>
                  </div>
                  <Badge variant="secondary">{courseAssignments.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {courseAssignments.map((assignment) => (
                    <div key={assignment.id} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{assignment.course_name}</h4>
                        <Badge className={getStatusColor(assignment.status)}>
                          {assignment.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        Level: {assignment.difficulty_level}
                      </p>
                      <p className="text-sm text-gray-600 mb-1">
                        Students: {assignment.enrolled_students}
                      </p>
                      {assignment.schedule && (
                        <p className="text-sm text-gray-600">
                          Schedule: {assignment.schedule}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Student Assignments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    <span>Recent Students</span>
                  </div>
                  <Badge variant="secondary">{studentAssignments.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {studentAssignments.map((student) => (
                    <div key={student.id} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{student.student_name}</h4>
                        <Badge className={getStatusColor(student.status)}>
                          {student.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        Course: {student.course_name}
                      </p>
                      <p className="text-sm text-gray-600 mb-2">
                        Enrolled: {formatDate(student.enrollment_date)}
                      </p>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">Progress:</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className="h-2 rounded-full" 
                            style={{ width: `${student.progress}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900">{student.progress}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
