"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { 
  ArrowLeft, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  BookOpen, 
  TrendingUp,
  CreditCard,
  Clock,
  Award,
  Edit,
  UserCheck,
  AlertCircle,
  CheckCircle,
  XCircle
} from "lucide-react"
import Header from "@/components/layout/Header"
import { getBackendApiUrl } from "@/lib/config"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"
import { formatRegisteredDateTime } from "@/lib/formatRegisteredDate"
import { formatPaymentSourceLabel } from "@/lib/formatPaymentSourceLabel"
import { StudentPlanRenewalSection } from "@/components/students/StudentPlanRenewalSection"

interface StudentDetails {
  id: string
  student_id?: string
  full_name: string
  email: string
  phone: string
  date_of_birth?: string
  gender?: string
  address?: {
    street?: string
    city?: string
    state?: string
    postal_code?: string
    country?: string
  }
  emergency_contact?: {
    name?: string
    phone?: string
    relationship?: string
  }
  is_active: boolean
  role: string
  created_at: string
  updated_at: string
  // Course enrollment data
  courses?: Array<{
    course_id: string
    course_name: string
    level: string
    duration: string
    enrollment_date: string
    completion_date?: string
    progress?: number
    status: 'active' | 'completed' | 'paused' | 'cancelled'
  }>
  // Additional computed data
  total_courses?: number
  completed_courses?: number
  attendance_percentage?: number
  outstanding_balance?: number
}

interface EnrollmentHistory {
  id: string
  course_name: string
  enrollment_date: string
  start_date?: string
  end_date?: string
  next_due_date?: string
  completion_date?: string
  status: string
  progress: number
  grade?: string
  is_active?: boolean
  payment_status?: string
  fee_amount?: number
  batch_ref?: string
  course_id?: string
  branch_id?: string
  branch_name?: string
  duration_id?: string
}

interface PaymentRecord {
  id: string
  amount: number
  payment_date: string
  payment_method: string
  status: 'completed' | 'pending' | 'failed'
  description: string
  notes?: string
  transaction_id?: string
}

interface AttendanceRecord {
  date: string
  course_name: string
  status: 'present' | 'absent' | 'late'
  duration_minutes?: number
}

export default function BranchManagerStudentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const studentId = params.id as string

  const [student, setStudent] = useState<StudentDetails | null>(null)
  const [enrollmentHistory, setEnrollmentHistory] = useState<EnrollmentHistory[]>([])
  const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>([])
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check authentication first
    if (!BranchManagerAuth.isAuthenticated()) {
      router.replace('/branch-manager/login')
      return
    }
    fetchStudentDetails()
  }, [studentId, router])

  const fetchStudentDetails = async () => {
    try {
      setLoading(true)
      setError(null)

      const token = BranchManagerAuth.getToken()
      if (!token) {
        throw new Error("Authentication token not found. Please login again.")
      }

      // Fetch student basic details
      console.log('🔍 Fetching student details for ID:', studentId)
      const studentResponse = await fetch(getBackendApiUrl(`users/${studentId}`), {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      if (!studentResponse.ok) {
        if (studentResponse.status === 404) {
          throw new Error("Student not found")
        }
        if (studentResponse.status === 403) {
          throw new Error("You don't have permission to view this student")
        }
        const errorText = await studentResponse.text()
        throw new Error(`Failed to fetch student details: ${studentResponse.status} - ${errorText}`)
      }

      const studentData = await studentResponse.json()
      console.log('✅ Student data received:', studentData)

      // Transform the API response to match our interface
      const student: StudentDetails = {
        id: studentData.user.id,
        student_id: studentData.user.student_id || studentData.user.id,
        full_name: studentData.user.full_name,
        email: studentData.user.email,
        phone: studentData.user.phone,
        date_of_birth: studentData.user.date_of_birth,
        gender: studentData.user.gender,
        address: studentData.user.address || {
          street: "",
          city: "",
          state: "",
          postal_code: "",
          country: ""
        },
        emergency_contact: studentData.user.emergency_contact || {
          name: "",
          phone: "",
          relationship: ""
        },
        is_active: studentData.user.is_active,
        role: studentData.user.role,
        created_at: studentData.user.created_at,
        updated_at: studentData.user.updated_at,
        courses: studentData.enrollments?.map((enrollment: any) => ({
          course_id: enrollment.course_id,
          course_name: enrollment.course_details?.title || "Unknown Course",
          level: enrollment.course_details?.difficulty_level || "Beginner",
          duration: "N/A", // This would need to come from course details
          enrollment_date: enrollment.enrollment_date || enrollment.created_at,
          progress: enrollment.progress || 0,
          status: enrollment.status || 'active'
        })) || [],
        total_courses: studentData.enrollments?.length || 0,
        completed_courses: studentData.enrollments?.filter((e: any) => e.status === 'completed').length || 0,
        attendance_percentage: 0, // This would need to be calculated from attendance data
        outstanding_balance: 0 // This would need to be calculated from payment data
      }

      // Fetch enrollment history
      console.log('🔍 Fetching enrollment history...')
      const enrollmentResponse = await fetch(getBackendApiUrl(`users/${studentId}/enrollments`), {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      let enrollmentHistory: EnrollmentHistory[] = []
      if (enrollmentResponse.ok) {
        const enrollmentData = await enrollmentResponse.json()
        console.log('✅ Enrollment data received:', enrollmentData)

        enrollmentHistory = enrollmentData.enrollments?.map((enrollment: any) => ({
          id: enrollment.id || enrollment.enrollment_id,
          course_name: enrollment.course_name || "Unknown Course",
          enrollment_date: enrollment.enrollment_date || enrollment.created_at,
          start_date: enrollment.start_date,
          end_date: enrollment.end_date,
          next_due_date: enrollment.next_due_date || enrollment.end_date,
          completion_date: enrollment.completion_date,
          status: enrollment.status || 'active',
          progress: enrollment.progress || 0,
          grade: enrollment.grade || undefined,
          is_active: enrollment.is_active,
          payment_status: enrollment.payment_status,
          fee_amount: enrollment.fee_amount,
          batch_ref: enrollment.batch_ref,
          course_id: enrollment.course_id,
          branch_id: enrollment.branch_id,
          branch_name: enrollment.branch_name,
          duration_id: enrollment.duration_id || enrollment.duration,
        })) || []
      } else {
        console.warn('⚠️ Failed to fetch enrollment history:', enrollmentResponse.status)
      }

      // Fetch payment history
      console.log('🔍 Fetching payment history...')
      const paymentResponse = await fetch(getBackendApiUrl(`users/${studentId}/payments`), {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      let paymentRecords: PaymentRecord[] = []
      let outstandingBalance = 0
      if (paymentResponse.ok) {
        const paymentData = await paymentResponse.json()
        console.log('✅ Payment data received:', paymentData)

        paymentRecords = paymentData.payments?.map((payment: any) => ({
          id: payment.id,
          amount: payment.amount || 0,
          payment_date: payment.payment_date || payment.created_at,
          payment_method: payment.payment_method || "Unknown",
          status: payment.status || 'pending',
          description: payment.description || `Payment for ${payment.course_name || 'Course'}`,
          notes: payment.notes,
          transaction_id: payment.transaction_id,
        })) || []

        // Calculate outstanding balance from pending payments
        outstandingBalance = paymentRecords
          .filter(payment => payment.status === 'pending')
          .reduce((sum, payment) => sum + payment.amount, 0)
      } else {
        console.warn('⚠️ Failed to fetch payment history:', paymentResponse.status)
      }

      // Update student with calculated values
      student.outstanding_balance = outstandingBalance

      // For now, use empty attendance records as we don't have that endpoint yet
      const attendanceRecords: AttendanceRecord[] = []

      setStudent(student)
      setEnrollmentHistory(enrollmentHistory)
      setPaymentRecords(paymentRecords)
      setAttendanceRecords(attendanceRecords)

    } catch (err: any) {
      console.error("Error fetching student details:", err)
      setError(err.message || "Failed to fetch student details")
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      case 'paused': return 'bg-yellow-100 text-yellow-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'failed': return 'bg-red-100 text-red-800'
      case 'present': return 'bg-green-100 text-green-800'
      case 'absent': return 'bg-red-100 text-red-800'
      case 'late': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return <CheckCircle className="w-4 h-4" />
      case 'absent': return <XCircle className="w-4 h-4" />
      case 'late': return <AlertCircle className="w-4 h-4" />
      default: return null
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Student Details" role="branch_admin" />
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

  if (error || !student) {
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
        return "Student Not Found"
      }
      return "Error Loading Student"
    }

    const getErrorDescription = () => {
      if (error.includes("permission") || error.includes("403")) {
        return "You don't have permission to view this student. This student may not be enrolled in any branches you manage."
      }
      if (error.includes("not found") || error.includes("404")) {
        return "The student you're looking for doesn't exist or may have been removed."
      }
      return "There was an error loading the student details. Please try again."
    }

    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Student Details" role="branch_admin" />
        <main className="w-full p-4 lg:py-4 px-19">
          <div className="mx-auto">
            <div className="flex items-center mb-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/branch-manager-dashboard/students")}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Students</span>
              </Button>
            </div>

            <Card className="max-w-md mx-auto">
              <CardContent className="text-center py-8">
                {getErrorIcon()}
                <h2 className="text-xl font-semibold text-gray-900 mb-2">{getErrorTitle()}</h2>
                <p className="text-gray-600 mb-6">{getErrorDescription()}</p>
                <div className="space-y-3">
                  <Button
                    onClick={() => fetchStudentDetails()}
                    className="w-full"
                  >
                    Try Again
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => router.push("/branch-manager-dashboard/students")}
                    className="w-full"
                  >
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

  // Don't render if student data is not loaded yet
  if (!student) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Student Details" role="branch_admin" />
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
      <Header title="Student Details" role="branch_admin" />

      <main className="w-full p-4 lg:py-4 px-19">
        <div className="mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/branch-manager-dashboard/students")}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Students</span>
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{student.full_name}</h1>
                <p className="text-sm text-gray-500">Student ID: {student.student_id}</p>
              </div>
            </div>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => router.push(`/branch-manager-dashboard/students/${studentId}/performance`)}
                className="border-amber-300 text-amber-900 hover:bg-amber-50"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Performance
              </Button>
              <Button
                onClick={() => router.push(`/branch-manager-dashboard/students/edit/${studentId}`)}
                className="text-white"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Student
              </Button>
            </div>
          </div>

          {/* Status Badge */}
          <div className="mb-6">
            <Badge variant={student.is_active ? "default" : "secondary"} className="text-sm">
              {student.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Courses</p>
                    <p className="text-2xl font-bold text-blue-600">{student.total_courses}</p>
                  </div>
                  <BookOpen className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Completed</p>
                    <p className="text-2xl font-bold text-green-600">{student.completed_courses}</p>
                  </div>
                  <Award className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Attendance</p>
                    <p className="text-2xl font-bold text-purple-600">{student.attendance_percentage}%</p>
                  </div>
                  <UserCheck className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Outstanding</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {formatCurrency(student.outstanding_balance || 0)}
                    </p>
                  </div>
                  <CreditCard className="w-8 h-8 text-orange-500" />
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
                    <p className="text-sm text-gray-600">{student.email}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">Phone</p>
                    <p className="text-sm text-gray-600">{student.phone}</p>
                  </div>
                </div>

                {student.date_of_birth && (
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">Date of Birth</p>
                      <p className="text-sm text-gray-600">{formatDate(student.date_of_birth)}</p>
                    </div>
                  </div>
                )}

                {student.gender && (
                  <div className="flex items-center space-x-3">
                    <User className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">Gender</p>
                      <p className="text-sm text-gray-600">{student.gender}</p>
                    </div>
                  </div>
                )}

                {student.address && (
                  <div className="flex items-start space-x-3">
                    <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Address</p>
                      <p className="text-sm text-gray-600">
                        {student.address.street}<br />
                        {student.address.city}, {student.address.state}<br />
                        {student.address.postal_code}, {student.address.country}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">Joined</p>
                    <p className="text-sm text-gray-600">{formatRegisteredDateTime(student.created_at)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Emergency Contact */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Phone className="w-5 h-5 text-blue-600" />
                  <span>Emergency Contact</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {student.emergency_contact ? (
                  <>
                    <div className="flex items-center space-x-3">
                      <User className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">Name</p>
                        <p className="text-sm text-gray-600">{student.emergency_contact.name}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Phone className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">Phone</p>
                        <p className="text-sm text-gray-600">{student.emergency_contact.phone}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <User className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">Relationship</p>
                        <p className="text-sm text-gray-600">{student.emergency_contact.relationship}</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">No emergency contact information available</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="mt-8">
            <StudentPlanRenewalSection
              studentName={student?.full_name || "Student"}
              enrollments={enrollmentHistory}
              loading={loading}
              authToken={BranchManagerAuth.getToken()}
              onRenewed={() => {
                void fetchStudentDetails()
              }}
            />
          </div>

          {/* Current Courses */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  <span>Current Courses</span>
                </div>
                <Badge variant="secondary">{student.courses?.length || 0}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {student.courses && student.courses.length > 0 ? (
                  student.courses.map((course) => (
                    <div key={course.course_id} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-gray-900">{course.course_name}</h4>
                          <p className="text-sm text-gray-600">
                            {course.level} • {course.duration} • Enrolled: {formatDate(course.enrollment_date)}
                          </p>
                        </div>
                        <Badge className={getStatusColor(course.status)}>
                          {course.status}
                        </Badge>
                      </div>
                      
                      {course.progress !== undefined && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Progress</span>
                            <span className="font-medium text-gray-900">{course.progress}%</span>
                          </div>
                          <Progress value={course.progress} className="h-2" />
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No current course enrollments</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
            {/* Recent Payments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  <span>Recent Payments</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {paymentRecords.slice(0, 5).map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{formatCurrency(payment.amount)}</p>
                        <p className="text-sm text-gray-600">{payment.description}</p>
                        <p className="text-xs text-gray-500">
                          {formatDate(payment.payment_date)} • {formatPaymentSourceLabel(payment)}
                        </p>
                      </div>
                      <Badge className={getStatusColor(payment.status)}>
                        {payment.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Attendance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <span>Recent Attendance</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {attendanceRecords.slice(0, 5).map((record, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{record.course_name}</p>
                        <p className="text-sm text-gray-600">{formatDate(record.date)}</p>
                        {record.duration_minutes && (
                          <p className="text-xs text-gray-500">{record.duration_minutes} minutes</p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(record.status)}>
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(record.status)}
                            <span>{record.status}</span>
                          </div>
                        </Badge>
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
