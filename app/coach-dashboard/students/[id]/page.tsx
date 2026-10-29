"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  BookOpen,
  TrendingUp,
  Loader2,
  UserCheck,
  Award,
  Save,
  Pencil
} from "lucide-react"
import CoachDashboardHeader from "@/components/coach-dashboard-header"
import { checkCoachAuth } from "@/lib/coachAuth"
import { getBackendApiUrl } from "@/lib/config"
import { useToast } from "@/hooks/use-toast"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

interface StudentDetails {
  id: string
  student_id?: string
  full_name?: string
  student_name?: string  // Backend returns this field
  email: string
  phone?: string
  date_of_birth?: string
  gender?: string
  is_active?: boolean
  enrollment_date?: string
  course_name?: string
  course_id?: string
  branch_name?: string
  level_or_belt?: string
  progress?: number
  attendance_percentage?: number
  status?: string
  address?: {
    street?: string
    city?: string
    state?: string
    postal_code?: string
    country?: string
  } | string
  emergency_contact?: {
    name?: string
    phone?: string
    relationship?: string
  }
}

export default function StudentDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const studentId = params.id as string

  const { toast } = useToast()
  const [student, setStudent] = useState<StudentDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [coachData, setCoachData] = useState<any>(null)
  const [isEditBeltOpen, setIsEditBeltOpen] = useState(false)
  const [beltValue, setBeltValue] = useState("")
  const [isSavingBelt, setIsSavingBelt] = useState(false)

  const handleSaveBelt = async () => {
    if (!studentId) return
    setIsSavingBelt(true)
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") || localStorage.getItem("access_token") : null
      const res = await fetch(getBackendApiUrl(`student/profile/${encodeURIComponent(studentId)}`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ level_or_belt: beltValue.trim() || null })
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || res.statusText)
      }

      setStudent(prev => prev ? { ...prev, level_or_belt: beltValue.trim() || undefined } : null)
      setIsEditBeltOpen(false)
      toast({
        title: "Success",
        description: "Level / belt updated successfully.",
      })
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to update level / belt",
        variant: "destructive"
      })
    } finally {
      setIsSavingBelt(false)
    }
  }

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
      fetchStudentDetails(authResult.token, authResult.coach)
    } else {
      setError("Coach information not found")
      setLoading(false)
    }
  }, [router, studentId])

  const fetchStudentDetails = async (token: string, coach: any) => {
    try {
      setLoading(true)
      setError(null)

      let studentData: StudentDetails | null = null
      const coachId = coach?.id || coach?._id
      const coachBranchId = coach?.branch_id

      // 1. Primary: Try fetching directly from /api/users/{studentId}
      try {
        const userRes = await fetch(getBackendApiUrl(`users/${studentId}`), {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (userRes.status === 401) {
          localStorage.clear()
          router.push("/coach/login")
          return
        }

        if (userRes.ok) {
          const resJson = await userRes.json()
          const u = resJson.user || resJson
          const enrollments = Array.isArray(resJson.enrollments) ? resJson.enrollments : []
          const primaryEnr = enrollments[0]

          const fullName = u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Unknown Student'
          const courseName = primaryEnr?.course_details?.title || primaryEnr?.course_name || u.course_name || u.courses?.[0]?.name || u.course?.name || ''
          const courseId = primaryEnr?.course_id || primaryEnr?.course?.id || u.course_id || u.courses?.[0]?.id || ''
          const branchName = primaryEnr?.branch_details?.name || primaryEnr?.branch_name || u.branch_name || u.branches?.[0]?.name || ''
          const enrollmentDate = primaryEnr?.enrollment_date || primaryEnr?.created_at || u.enrollment_date || u.courses?.[0]?.enrollment_date || ''
          const progress = primaryEnr?.progress ?? u.progress

          studentData = {
            id: u.id || studentId,
            student_id: u.student_id || u.id || studentId,
            full_name: fullName,
            student_name: fullName,
            email: u.email || u.contact_info?.email || '',
            phone: u.phone || u.contact_info?.phone || '',
            date_of_birth: u.date_of_birth || '',
            gender: u.gender || '',
            is_active: u.is_active !== undefined ? u.is_active : true,
            status: u.status || (u.is_active === false ? 'inactive' : 'active'),
            course_name: courseName,
            course_id: courseId,
            branch_name: branchName,
            enrollment_date: enrollmentDate,
            progress: progress,
            address: u.address,
            emergency_contact: u.emergency_contact,
          }
        }
      } catch (err) {
        console.warn('Direct user fetch error:', err)
      }

      // 2. Secondary fallback: Search in branch students (/api/search/students)
      if (!studentData && coachBranchId) {
        try {
          const branchRes = await fetch(getBackendApiUrl(`search/students?branch_id=${encodeURIComponent(coachBranchId)}&limit=100`), {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
          if (branchRes.ok) {
            const branchData = await branchRes.json()
            const studentsList = branchData.students || []
            const found = studentsList.find((s: any) => s.id === studentId || s.student_id === studentId)
            if (found) {
              const fullName = found.full_name || `${found.first_name || ''} ${found.last_name || ''}`.trim() || 'Unknown Student'
              studentData = {
                id: found.id || studentId,
                student_id: found.student_id || found.id || studentId,
                full_name: fullName,
                student_name: fullName,
                email: found.email || '',
                phone: found.phone || '',
                date_of_birth: found.date_of_birth || '',
                gender: found.gender || '',
                is_active: found.is_active !== undefined ? found.is_active : true,
                status: found.status || (found.is_active === false ? 'inactive' : 'active'),
                course_name: found.courses?.[0]?.name || found.course_name || '',
                course_id: found.courses?.[0]?.id || found.course_id || '',
                branch_name: found.branches?.[0]?.name || found.branch_name || '',
                enrollment_date: found.courses?.[0]?.enrollment_date || found.enrollment_date || '',
                progress: found.courses?.[0]?.progress ?? found.progress,
                address: found.address,
                emergency_contact: found.emergency_contact,
              }
            }
          }
        } catch (err) {
          console.warn('Branch search fallback error:', err)
        }
      }

      // 3. Tertiary fallback: Coach students endpoint (/api/coaches/{coachId}/students)
      if (!studentData && coachId) {
        try {
          const coachStudentsRes = await fetch(getBackendApiUrl(`coaches/${encodeURIComponent(coachId)}/students`), {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
          if (coachStudentsRes.ok) {
            const csData = await coachStudentsRes.json()
            const students = csData.students || csData.enrolled_students || []
            const found = students.find((s: any) => s.id === studentId || s.student_id === studentId)
            if (found) {
              const fullName = found.student_name || found.full_name || 'Unknown Student'
              studentData = {
                id: found.id || studentId,
                student_id: found.student_id || found.id || studentId,
                full_name: fullName,
                student_name: fullName,
                email: found.email || '',
                phone: found.phone || '',
                date_of_birth: found.date_of_birth || '',
                gender: found.gender || '',
                is_active: found.is_active !== undefined ? found.is_active : true,
                status: found.status || (found.is_active === false ? 'inactive' : 'active'),
                course_name: found.course_name || '',
                course_id: found.course_id || '',
                branch_name: found.branch_name || '',
                enrollment_date: found.enrollment_date || '',
                progress: found.progress,
                address: found.address,
                emergency_contact: found.emergency_contact,
              }
            }
          }
        } catch (err) {
          console.warn('Coach students fallback error:', err)
        }
      }

      // 4. Quaternary fallback: attendance/coach/{coachId}/students
      if (!studentData && coachId) {
        try {
          const attRes = await fetch(getBackendApiUrl(`attendance/coach/${encodeURIComponent(coachId)}/students`), {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
          if (attRes.ok) {
            const attData = await attRes.json()
            const students = attData.students || []
            const found = students.find((s: any) => s.id === studentId || s.student_id === studentId)
            if (found) {
              const fullName = found.student_name || found.full_name || 'Unknown Student'
              studentData = {
                id: found.id || studentId,
                student_id: found.student_id || found.id || studentId,
                full_name: fullName,
                student_name: fullName,
                email: found.email || '',
                phone: found.phone || '',
                date_of_birth: found.date_of_birth || '',
                gender: found.gender || '',
                is_active: found.is_active !== undefined ? found.is_active : true,
                status: found.status || (found.is_active === false ? 'inactive' : 'active'),
                course_name: found.course_name || '',
                course_id: found.course_id || '',
                branch_name: found.branch_name || '',
                enrollment_date: found.enrollment_date || '',
                progress: found.progress,
                address: found.address,
                emergency_contact: found.emergency_contact,
              }
            }
          }
        } catch (err) {
          console.warn('Attendance students fallback error:', err)
        }
      }

      if (!studentData) {
        setError("Student not found or not enrolled in your courses/branch")
        setLoading(false)
        return
      }

      // 5. Enrich enrollments if course or branch is missing
      if (!studentData.course_name || !studentData.branch_name) {
        try {
          const enrRes = await fetch(getBackendApiUrl(`users/${studentId}/enrollments`), {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
          if (enrRes.ok) {
            const enrData = await enrRes.json()
            const enrollments = enrData.enrollments || enrData || []
            if (Array.isArray(enrollments) && enrollments.length > 0) {
              const e0 = enrollments[0]
              if (!studentData.course_name) {
                studentData.course_name = e0.course_name || e0.course_details?.title || e0.course?.name || ''
              }
              if (!studentData.course_id) {
                studentData.course_id = e0.course_id || e0.course?.id || ''
              }
              if (!studentData.branch_name) {
                studentData.branch_name = e0.branch_name || e0.branch_details?.name || e0.branch?.name || ''
              }
              if (!studentData.enrollment_date) {
                studentData.enrollment_date = e0.enrollment_date || e0.created_at || ''
              }
              if (studentData.progress === undefined && e0.progress !== undefined) {
                studentData.progress = e0.progress
              }
            }
          }
        } catch (err) {
          console.warn('Enrollment enrichment error:', err)
        }
      }

      // 6. Optional: fetch student attendance stats
      try {
        const attStatsRes = await fetch(getBackendApiUrl(`attendance/reports?student_id=${encodeURIComponent(studentId)}`), {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        if (attStatsRes.ok) {
          const attStats = await attStatsRes.json()
          if (attStats?.stats?.attendance_percentage !== undefined) {
            studentData.attendance_percentage = Math.round(attStats.stats.attendance_percentage)
          } else if (attStats?.attendance_percentage !== undefined) {
            studentData.attendance_percentage = Math.round(attStats.attendance_percentage)
          }
        }
      } catch (err) {
        console.warn('Attendance rate fetch error:', err)
      }

      // 7. Fetch performance profile for level_or_belt
      try {
        const perfRes = await fetch(getBackendApiUrl(`student/performance/${encodeURIComponent(studentId)}`), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        if (perfRes.ok) {
          const perfData = await perfRes.json()
          if (perfData?.profile?.level_or_belt) {
            studentData.level_or_belt = perfData.profile.level_or_belt
            setBeltValue(perfData.profile.level_or_belt)
          }
        }
      } catch (err) {
        console.warn('Performance profile fetch error:', err)
      }

      setStudent(studentData)

    } catch (err: any) {
      console.error('Error fetching student details:', err)
      setError(err.message || 'Failed to load student details')
    } finally {
      setLoading(false)
    }
  }

  const calculateAge = (dateOfBirth: string) => {
    try {
      const birthDate = new Date(dateOfBirth)
      const today = new Date()
      let age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--
      }
      return age > 0 ? `${age} years old` : 'N/A'
    } catch {
      return 'N/A'
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch {
      return 'N/A'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'inactive':
        return 'bg-gray-100 text-gray-800'
      case 'suspended':
        return 'bg-red-100 text-red-800'
      case 'completed':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <CoachDashboardHeader
          currentPage="Student Details"
          coachName={coachData?.full_name || coachData?.name}
        />
        <main className="mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-yellow-400" />
              <span className="ml-2 text-gray-600">Loading student details...</span>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (error || !student) {
    return (
      <div className="min-h-screen bg-gray-50">
        <CoachDashboardHeader
          currentPage="Student Details"
          coachName={coachData?.full_name || coachData?.name}
        />
        <main className="mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-red-600 font-medium mb-2">Error loading student</p>
                  <p className="text-sm text-gray-600 mb-4">{error}</p>
                  <Button
                    onClick={() => router.push("/coach-dashboard/students")}
                    variant="outline"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Students
                  </Button>
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
        currentPage="Student Details"
        coachName={coachData?.full_name || coachData?.name}
      />

      <main className="mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Back Button */}
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <Button onClick={() => router.push("/coach-dashboard/students")} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Students
            </Button>
            <Button
              variant="outline"
              className="border-amber-300 text-amber-900 hover:bg-amber-50"
              onClick={() => router.push(`/coach-dashboard/students/${studentId}/performance`)}
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Performance dashboard
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Student Profile Overview */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="w-5 h-5" />
                  <span>Student Profile</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <Avatar className="h-24 w-24 mx-auto mb-4">
                    <AvatarImage src="" alt={student.student_name || student.full_name || 'Student'} />
                    <AvatarFallback className="text-2xl bg-yellow-100 text-yellow-800">
                      {(() => {
                        const name = student.student_name || student.full_name
                        return name
                          ? name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
                          : 'S'
                      })()}
                    </AvatarFallback>
                  </Avatar>

                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {student.student_name || student.full_name || 'Unknown Student'}
                  </h3>

                  {student.student_id && (
                    <p className="text-sm text-gray-500 mb-3">ID: {student.student_id}</p>
                  )}

                  <div className="space-y-2 ">
                    <Badge className={getStatusColor(student.status || (student.is_active ? 'active' : 'inactive'))}>
                      <UserCheck className="w-3 h-3 mr-1" />
                      {student.status || (student.is_active ? 'Active' : 'Inactive')}
                    </Badge>

                    {student.course_name && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-800 ml-3">
                        <BookOpen className="w-3 h-3 mr-1" />
                        {student.course_name}
                      </Badge>
                    )}

                    {student.level_or_belt && (
                      <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 ml-2">
                        <Award className="w-3 h-3 mr-1 text-amber-600" />
                        {student.level_or_belt}
                      </Badge>
                    )}
                  </div>

                  {/* Quick Stats */}
                  <div className="mt-6 pt-6 border-t space-y-3">
                    {student.progress !== undefined && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Progress</span>
                        <span className="font-medium text-blue-600">{student.progress}%</span>
                      </div>
                    )}

                    {student.attendance_percentage !== undefined && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Attendance</span>
                        <span className="font-medium text-green-600">{student.attendance_percentage}%</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Detailed Information */}
            <div className="lg:col-span-2 space-y-6">
              <Tabs defaultValue="personal" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="personal">Personal Info</TabsTrigger>
                  <TabsTrigger value="academic">Academic Info</TabsTrigger>
                  <TabsTrigger value="contact">Contact & Emergency</TabsTrigger>
                </TabsList>

                <TabsContent value="personal">
                  <Card>
                    <CardHeader>
                      <CardTitle>Personal Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-500">Full Name</label>
                          <p className="text-gray-900">{student.student_name || student.full_name || 'Unknown Student'}</p>
                        </div>

                        <div>
                          <label className="text-sm font-medium text-gray-500">Gender</label>
                          <p className="text-gray-900 capitalize">{student.gender || 'N/A'}</p>
                        </div>

                        <div>
                          <label className="text-sm font-medium text-gray-500">Date of Birth</label>
                          <p className="text-gray-900">
                            {student.date_of_birth ? formatDate(student.date_of_birth) : 'N/A'}
                          </p>
                        </div>

                        <div>
                          <label className="text-sm font-medium text-gray-500">Age</label>
                          <p className="text-gray-900">
                            {student.date_of_birth ? calculateAge(student.date_of_birth) : 'N/A'}
                          </p>
                        </div>
                      </div>

                      {/* Address Information */}
                      {student.address && (
                        <div className="mt-6 pt-6 border-t">
                          <h4 className="text-sm font-medium text-gray-500 mb-3">Address</h4>
                          <div className="flex items-start space-x-3">
                            <MapPin className="w-5 h-5 text-gray-400 mt-1" />
                            <div>
                              <div className="space-y-1">
                                {typeof student.address === 'string' ? (
                                  <p className="text-gray-900">{student.address}</p>
                                ) : (
                                  <>
                                    {student.address.street && (
                                      <p className="text-gray-900">{student.address.street}</p>
                                    )}
                                    <p className="text-gray-900">
                                      {[
                                        student.address.city,
                                        student.address.state,
                                        student.address.postal_code
                                      ].filter(Boolean).join(', ')}
                                    </p>
                                    {student.address.country && (
                                      <p className="text-gray-900">{student.address.country}</p>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="academic">
                  <Card>
                    <CardHeader>
                      <CardTitle>Academic Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-gray-500">Course</label>
                            <p className="text-gray-900">{student.course_name || 'N/A'}</p>
                          </div>

                          <div>
                            <label className="text-sm font-medium text-gray-500">Branch</label>
                            <p className="text-gray-900">{student.branch_name || 'N/A'}</p>
                          </div>

                          <div>
                            <label className="text-sm font-medium text-gray-500">Enrollment Date</label>
                            <p className="text-gray-900">
                              {student.enrollment_date ? formatDate(student.enrollment_date) : 'N/A'}
                            </p>
                          </div>

                          <div>
                            <label className="text-sm font-medium text-gray-500">Status</label>
                            <Badge className={getStatusColor(student.status || (student.is_active ? 'active' : 'inactive'))}>
                              {student.status || (student.is_active ? 'Active' : 'Inactive')}
                            </Badge>
                          </div>

                          <div>
                            <label className="text-sm font-medium text-gray-500">Level / Belt</label>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-gray-900 font-medium">{student.level_or_belt || 'Not set'}</p>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 px-2 text-xs text-amber-800 border-amber-300 hover:bg-amber-50 flex items-center gap-1"
                                onClick={() => {
                                  setBeltValue(student.level_or_belt || "")
                                  setIsEditBeltOpen(true)
                                }}
                              >
                                <Pencil className="w-3 h-3" />
                                Edit
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Progress and Performance */}
                        <div className="pt-4 border-t">
                          <h4 className="text-sm font-medium text-gray-500 mb-3">Performance Metrics</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {student.progress !== undefined && (
                              <div className="flex items-center space-x-3">
                                <TrendingUp className="w-5 h-5 text-blue-500" />
                                <div>
                                  <p className="text-sm text-gray-500">Course Progress</p>
                                  <p className="text-lg font-semibold text-blue-600">{student.progress}%</p>
                                </div>
                              </div>
                            )}

                            {student.attendance_percentage !== undefined && (
                              <div className="flex items-center space-x-3">
                                <Calendar className="w-5 h-5 text-green-500" />
                                <div>
                                  <p className="text-sm text-gray-500">Attendance Rate</p>
                                  <p className="text-lg font-semibold text-green-600">{student.attendance_percentage}%</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="contact">
                  <Card>
                    <CardHeader>
                      <CardTitle>Contact Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center space-x-3">
                          <Mail className="w-5 h-5 text-gray-400" />
                          <div>
                            <label className="text-sm font-medium text-gray-500">Email</label>
                            <p className="text-gray-900">{student.email}</p>
                          </div>
                        </div>

                        {student.phone && (
                          <div className="flex items-center space-x-3">
                            <Phone className="w-5 h-5 text-gray-400" />
                            <div>
                              <label className="text-sm font-medium text-gray-500">Phone</label>
                              <p className="text-gray-900">{student.phone}</p>
                            </div>
                          </div>
                        )}

                        {/* Emergency Contact */}
                        {student.emergency_contact && (
                          <div className="pt-4 border-t">
                            <h4 className="text-sm font-medium text-gray-500 mb-3">Emergency Contact</h4>
                            <div className="space-y-2">
                              <div>
                                <label className="text-sm font-medium text-gray-500">Name</label>
                                <p className="text-gray-900">{student.emergency_contact.name || 'N/A'}</p>
                              </div>

                              <div>
                                <label className="text-sm font-medium text-gray-500">Relationship</label>
                                <p className="text-gray-900">{student.emergency_contact.relationship || 'N/A'}</p>
                              </div>

                              <div>
                                <label className="text-sm font-medium text-gray-500">Phone</label>
                                <p className="text-gray-900">{student.emergency_contact.phone || 'N/A'}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </main>
      {/* Update Level / Belt Dialog */}
      <Dialog open={isEditBeltOpen} onOpenChange={setIsEditBeltOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Student Level / Belt</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Level / Belt</label>
              <Input
                value={beltValue}
                onChange={(e) => setBeltValue(e.target.value)}
                placeholder="e.g. Yellow Belt, Orange Belt"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsEditBeltOpen(false)} disabled={isSavingBelt}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveBelt}
              disabled={isSavingBelt}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              {isSavingBelt ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" /> Save level/belt
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
