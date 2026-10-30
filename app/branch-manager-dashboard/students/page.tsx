"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search, Edit, Trash2, RefreshCw, Eye, UserPlus } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useRouter } from "next/navigation"
import Header from "@/components/layout/Header"
import { getBackendApiUrl } from "@/lib/config"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"

interface Student {
  id: string
  student_id?: string
  full_name: string
  student_name?: string
  email: string
  phone: string
  role: string
  branch_id?: string
  date_of_birth?: string
  is_active: boolean
  created_at?: string
  gender?: string
  age?: number | null
  courses?: Array<{
    course_id: string
    course_name: string
    level?: string
    duration?: string
    branch_name?: string
  }>
  course_info?: {
    category_id: string
    course_id: string
    duration: string
  } | null
  branch_info?: {
    location_id: string
    branch_id: string
  } | null
  address?: {
    line1: string
    area: string
    city: string
    state: string
    pincode: string
    country: string
  }
  // Payment information
  payment_summary?: {
    total_paid: number
    total_pending: number
    last_payment_date?: string
    payment_status: 'paid' | 'pending' | 'overdue' | 'partial'
  }
}

export default function BranchManagerStudentList() {
  const router = useRouter()
  const [showAssignPopup, setShowAssignPopup] = useState(false)
  const [showDeletePopup, setShowDeletePopup] = useState(false)
  const [studentToDelete, setStudentToDelete] = useState<string | null>(null)
  const [selectedStudent, setSelectedStudent] = useState("")
  const [selectedBranch, setSelectedBranch] = useState("")
  const [selectedCourses, setSelectedCourses] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [students, setStudents] = useState<Student[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [assignmentLoading, setAssignmentLoading] = useState(false)
  const [assignmentError, setAssignmentError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 15

  // Authentication check
  useEffect(() => {
    if (!BranchManagerAuth.isAuthenticated()) {
      router.replace('/branch-manager/login')
      return
    }
  }, [router])

  // Helper function to fetch payment data for students
  const fetchStudentPayments = async (studentIds: string[], token: string) => {
    try {
      console.log('💰 Fetching payment data for students:', studentIds.length)

      // Fetch all payments for the branch manager (already filtered by managed branches)
      const paymentsResponse = await fetch(getBackendApiUrl('payments?limit=1000'), {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      if (!paymentsResponse.ok) {
        console.warn('Failed to fetch payment data:', paymentsResponse.status)
        return {}
      }

      const paymentsData = await paymentsResponse.json()
      const payments = paymentsData.payments || []

      console.log('💰 Retrieved payments:', payments.length)

      // Group payments by student_id and calculate summaries
      const paymentSummaries: Record<string, any> = {}

      payments.forEach((payment: any) => {
        const studentId = payment.student_id
        if (!studentId || !studentIds.includes(studentId)) return

        if (!paymentSummaries[studentId]) {
          paymentSummaries[studentId] = {
            total_paid: 0,
            total_pending: 0,
            last_payment_date: null,
            payment_status: 'pending'
          }
        }

        const amount = payment.amount || 0
        const status = payment.payment_status || 'pending'
        const paymentDate = payment.payment_date

        if (status === 'paid') {
          paymentSummaries[studentId].total_paid += amount
          if (paymentDate && (!paymentSummaries[studentId].last_payment_date || paymentDate > paymentSummaries[studentId].last_payment_date)) {
            paymentSummaries[studentId].last_payment_date = paymentDate
          }
        } else {
          paymentSummaries[studentId].total_pending += amount
        }
      })

      // Determine overall payment status for each student
      Object.keys(paymentSummaries).forEach(studentId => {
        const summary = paymentSummaries[studentId]
        if (summary.total_pending === 0 && summary.total_paid > 0) {
          summary.payment_status = 'paid'
        } else if (summary.total_paid > 0 && summary.total_pending > 0) {
          summary.payment_status = 'partial'
        } else if (summary.total_pending > 0) {
          summary.payment_status = 'pending'
        }
      })

      console.log('💰 Payment summaries calculated for', Object.keys(paymentSummaries).length, 'students')
      return paymentSummaries

    } catch (error) {
      console.error('Error fetching student payments:', error)
      return {}
    }
  }

  // Load students data for branch manager from API
  useEffect(() => {
    const loadStudentsData = async () => {
      try {
        setLoading(true)
        setError(null)

        const currentUser = BranchManagerAuth.getCurrentUser()
        const token = BranchManagerAuth.getToken()

        if (!currentUser || !token) {
          throw new Error("Authentication required. Please login again.")
        }

        console.log('Loading students for branch manager:', currentUser.full_name)
        console.log('Branch manager branch assignment:', currentUser.branch_assignment)

        // First, let's get the branches this manager manages to understand the filtering
        console.log('🔍 DEBUGGING: Fetching branches first to understand filtering...')
        const branchesResponse = await fetch(getBackendApiUrl('branches?limit=100'), {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        })

        if (branchesResponse.ok) {
          const branchesData = await branchesResponse.json()
          const managedBranches = branchesData.branches || []
          const branchIds = managedBranches.map((branch: any) => branch.id)
          console.log('🏢 Branches managed by this branch manager:', managedBranches.length)
          console.log('🏢 Branch IDs:', branchIds)
          managedBranches.forEach((branch: any, index: number) => {
            console.log(`   Branch ${index + 1}: ${branch.branch?.name || 'Unknown'} (ID: ${branch.id})`)
          })
        }

        // Call real backend API to get students
        console.log('👨‍🎓 Now fetching students...')
        const studentsResponse = await fetch(getBackendApiUrl('users/students/details'), {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        })

        console.log('Students API response status:', studentsResponse.status)

        if (!studentsResponse.ok) {
          const errorText = await studentsResponse.text()
          console.error('Students API error:', studentsResponse.status, errorText)

          if (studentsResponse.status === 401) {
            throw new Error("Authentication failed. Please login again.")
          } else if (studentsResponse.status === 403) {
            throw new Error("You don't have permission to access student information.")
          } else {
            throw new Error(`Failed to load students: ${studentsResponse.status} - ${errorText}`)
          }
        }

        const studentsData = await studentsResponse.json()
        console.log('👨‍🎓 Students API response:', studentsData)
        console.log('👨‍🎓 Students API response type:', typeof studentsData)
        console.log('👨‍🎓 Students API response keys:', Object.keys(studentsData || {}))

        const allStudents = studentsData.students || []

        // Debug: Show enrollment data for each student
        console.log('👨‍🎓 Processing students:', allStudents.length)
        allStudents.forEach((student: any, index: number) => {
          const enrollments = student.enrollments || []
          const branchIds = enrollments.map((e: any) => e.branch_id).filter(Boolean)
          console.log(`   Student ${index + 1}: ${student.full_name || 'Unknown'} - Enrolled in branches: ${branchIds.join(', ') || 'None'}`)
        })

        // The backend should already filter students by managed branches, so we use all returned students
        const branchStudents = allStudents

        // Transform the API data to match our Student interface
        const transformedStudents: Student[] = branchStudents.map((student: any) => ({
          id: student.id,
          student_id: student.student_id || student.id,
          full_name: student.full_name || `${student.first_name || ''} ${student.last_name || ''}`.trim(),
          email: student.email || "",
          phone: student.phone || "",
          role: student.role || "student",
          branch_id: student.branch_id || "",
          date_of_birth: student.date_of_birth,
          is_active: student.is_active ?? true,
          created_at: student.created_at || new Date().toISOString(),
          gender: student.gender,
          age: student.age,
          courses: student.enrollments?.map((enrollment: any) => ({
            course_id: enrollment.course_id,
            course_name: enrollment.course_name || enrollment.course?.name || "Unknown Course",
            level: enrollment.course?.difficulty_level || "Beginner",
            duration: enrollment.course?.duration || "3 months",
            branch_name: enrollment.branch_name || "Branch"
          })) || [],
          address: student.address || {
            line1: "",
            area: "",
            city: "",
            state: "",
            pincode: "",
            country: ""
          }
        }))

        console.log('Transformed students:', transformedStudents)
        console.log('Final students count:', transformedStudents.length)

        // Fetch payment data for all students
        const studentIds = transformedStudents.map(student => student.id)
        const paymentSummaries = await fetchStudentPayments(studentIds, token)

        // Integrate payment data with student data
        const studentsWithPayments = transformedStudents.map(student => ({
          ...student,
          payment_summary: paymentSummaries[student.id] || {
            total_paid: 0,
            total_pending: 0,
            last_payment_date: null,
            payment_status: 'pending' as const
          }
        }))

        if (studentsWithPayments.length === 0) {
          console.log('No students found for branch manager')
          setError("No students enrolled in your branches. Please contact your administrator if you expect to see students here.")
        } else {
          console.log(`✅ Loaded ${studentsWithPayments.length} student(s) with payment data for ${currentUser.full_name}`)
        }

        setStudents(studentsWithPayments)
      } catch (err: any) {
        console.error('Error loading students data:', err)
        setError(err.message || 'Failed to load student information')
      } finally {
        setLoading(false)
      }
    }

    if (BranchManagerAuth.isAuthenticated()) {
      loadStudentsData()
    }
  }, [])

  // Filter students based on search term
  const filteredStudents = students.filter(student =>
    student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.phone.includes(searchTerm) ||
    (student.student_id && student.student_id.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  // Pagination
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentStudents = filteredStudents.slice(startIndex, endIndex)

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const token = BranchManagerAuth.getToken()
      if (!token) {
        setError("Authentication token not found. Please login again.")
        return
      }

      // Fetch fresh students data - backend handles filtering by managed branches
      console.log('🔄 Refreshing students data...')
      const studentsResponse = await fetch(getBackendApiUrl('users/students/details'), {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      if (!studentsResponse.ok) {
        const errorText = await studentsResponse.text()
        console.error('Students refresh API error:', studentsResponse.status, errorText)
        throw new Error(`Failed to refresh students: ${studentsResponse.status} - ${errorText}`)
      }

      const studentsData = await studentsResponse.json()
      console.log('🔄 Refreshed students data:', studentsData)

      const allStudents = studentsData.students || []

      // The backend already filters students by managed branches, so we use all returned students
      const branchStudents = allStudents

      const transformedStudents: Student[] = branchStudents.map((student: any) => ({
        id: student.id,
        student_id: student.student_id || student.id,
        full_name: student.full_name || `${student.first_name || ''} ${student.last_name || ''}`.trim(),
        email: student.email || "",
        phone: student.phone || "",
        role: student.role || "student",
        branch_id: student.branch_id || "",
        date_of_birth: student.date_of_birth,
        is_active: student.is_active ?? true,
        created_at: student.created_at || new Date().toISOString(),
        gender: student.gender,
        age: student.age,
        courses: student.enrollments?.map((enrollment: any) => ({
          course_id: enrollment.course_id,
          course_name: enrollment.course_name || enrollment.course?.name || "Unknown Course",
          level: enrollment.course?.difficulty_level || "Beginner",
          duration: enrollment.course?.duration || "3 months",
          branch_name: enrollment.branch_name || "Branch"
        })) || [],
        address: student.address || {
          line1: "",
          area: "",
          city: "",
          state: "",
          pincode: "",
          country: ""
        }
      }))

      // Fetch payment data for refreshed students
      const studentIds = transformedStudents.map(student => student.id)
      const paymentSummaries = await fetchStudentPayments(studentIds, token)

      // Integrate payment data with refreshed student data
      const studentsWithPayments = transformedStudents.map(student => ({
        ...student,
        payment_summary: paymentSummaries[student.id] || {
          total_paid: 0,
          total_pending: 0,
          last_payment_date: null,
          payment_status: 'pending' as const
        }
      }))

      setStudents(studentsWithPayments)
      setError(null)
      console.log('✅ Students refreshed successfully with payment data:', studentsWithPayments.length)
    } catch (err: any) {
      console.error('Error refreshing students data:', err)
      setError(err.message || 'Failed to refresh students data')
    } finally {
      setRefreshing(false)
    }
  }

  const handleViewStudent = (studentId: string) => {
    router.push(`/branch-manager-dashboard/students/${studentId}`)
  }

  const handleEditStudent = (studentId: string) => {
    router.push(`/branch-manager-dashboard/students/edit/${studentId}`)
  }

  const handleDeleteStudent = (studentId: string) => {
    setStudentToDelete(studentId)
    setShowDeletePopup(true)
  }

  const confirmDelete = async () => {
    if (studentToDelete) {
      try {
        const authHeaders = BranchManagerAuth.getAuthHeaders()
        const currentUser = BranchManagerAuth.getCurrentUser()

        console.log("🔍 Delete Debug Info:", {
          studentToDelete,
          authHeaders,
          currentUser,
          hasToken: !!authHeaders.Authorization
        })

        if (!authHeaders.Authorization) {
          throw new Error("Authentication token not found. Please login again.")
        }

        const response = await fetch(getBackendApiUrl(`users/${studentToDelete}`), {
          method: 'DELETE',
          headers: authHeaders
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          console.error("Delete API Error Response:", {
            status: response.status,
            statusText: response.statusText,
            errorData
          })

          if (response.status === 401) {
            throw new Error("Invalid authentication credentials. Please login again.")
          } else if (response.status === 403) {
            // Show the actual error message from the backend
            throw new Error(errorData.detail || errorData.message || "Insufficient permissions to delete students.")
          } else {
            throw new Error(errorData.detail || errorData.message || `Failed to delete student (${response.status})`)
          }
        }

        // Remove student from local state
        setStudents(students.filter(s => s.id !== studentToDelete))
        setStudentToDelete(null)
        setShowDeletePopup(false)

        // Show success message
        alert('Student deleted successfully')

      } catch (error) {
        console.error("Error deleting student:", error)
        alert(`Error deleting student: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
  }

  const toggleStudentStatus = (studentId: string) => {
    setStudents(students.map(student =>
      student.id === studentId
        ? { ...student, is_active: !student.is_active }
        : student
    ))
  }

  return (
    <>
      <Header title="Students" role="branch_admin" />
      <div className="flex flex-col lg:flex-row justify-between items-start py-4 mb-4 lg:items-center gap-4">
        <div>
          <p className="text-sm text-gray-500 mt-1">Manage students in your branch</p>
        </div>
          <div className="flex flex-wrap gap-2 lg:gap-3">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center space-x-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
            <Button
              onClick={() => router.push("/branch-manager-dashboard/create-student")}
              className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-medium px-4 sm:px-6 min-h-[40px] rounded-lg flex items-center space-x-2"
            >
              <UserPlus className="w-4 h-4 text-gray-900" />
              <span>Add Student</span>
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search students by name, email, phone, or ID..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Students Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Students ({filteredStudents.length})
              </h2>
            </div>

            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg animate-pulse">
                    <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                    </div>
                    <div className="h-6 w-16 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <div className="max-w-md mx-auto">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                    <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
                      <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-red-800 mb-2">Unable to Load Students</h3>
                    <p className="text-red-700 mb-4">{error}</p>
                    <Button
                      onClick={() => window.location.reload()}
                      variant="outline"
                      className="border-red-300 text-red-700 hover:bg-red-50"
                    >
                      Try Again
                    </Button>
                  </div>
                </div>
              </div>
            ) : currentStudents.length === 0 ? (
              <div className="text-center py-12">
                <div className="max-w-md mx-auto">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                    <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-yellow-100 rounded-full">
                      <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-yellow-800 mb-2">No Students Found</h3>
                    <p className="text-yellow-700 mb-4">
                      {searchTerm
                        ? `No students match your search "${searchTerm}"`
                        : "You don't have any students enrolled in your branches yet."
                      }
                    </p>
                    {!searchTerm && (
                      <div className="text-sm text-yellow-600 mb-4 text-left">
                        <p className="mb-2">This could mean:</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>No students have enrolled in courses at your branches</li>
                          <li>Your branch manager account may not have branch assignments</li>
                          <li>The student enrollments are still being processed</li>
                        </ul>
                        <p className="mt-2">
                          Please contact your system administrator for assistance.
                        </p>
                      </div>
                    )}
                    <div className="flex justify-center space-x-3">
                      {searchTerm && (
                        <Button
                          variant="outline"
                          onClick={() => setSearchTerm("")}
                          className="border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                        >
                          Clear Search
                        </Button>
                      )}
                      <Button
                        onClick={() => window.location.reload()}
                        variant="outline"
                        className="border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                      >
                        Refresh
                      </Button>
                      <Button
                        onClick={() => router.push("/branch-manager-dashboard/add-student")}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        Add Student
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {currentStudents.map((student) => (
                  <div key={student.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-4">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src="" />
                        <AvatarFallback className="bg-blue-100 text-blue-600">
                          {student.full_name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-medium text-gray-900">{student.full_name}</h3>
                        <p className="text-sm text-gray-500">{student.email}</p>
                        <p className="text-xs text-gray-400">{student.phone}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="flex items-center space-x-2 mb-1">
                          <Badge variant={student.is_active ? "default" : "secondary"}>
                            {student.is_active ? "Active" : "Inactive"}
                          </Badge>
                          {student.payment_summary && (
                            <Badge
                              variant={
                                student.payment_summary.payment_status === 'paid' ? 'default' :
                                student.payment_summary.payment_status === 'partial' ? 'secondary' :
                                'destructive'
                              }
                              className={
                                student.payment_summary.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                                student.payment_summary.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }
                            >
                              {student.payment_summary.payment_status === 'paid' ? 'Paid' :
                               student.payment_summary.payment_status === 'partial' ? 'Partial' :
                               'Pending'}
                            </Badge>
                          )}
                        </div>
                        {student.courses && student.courses.length > 0 && (
                          <p className="text-xs text-gray-500 mt-1">
                            {student.courses[0].course_name}
                          </p>
                        )}
                        {student.payment_summary && (student.payment_summary.total_paid > 0 || student.payment_summary.total_pending > 0) && (
                          <div className="text-xs text-gray-500 mt-1">
                            {student.payment_summary.total_paid > 0 && (
                              <span className="text-green-600">₹{student.payment_summary.total_paid.toLocaleString()}</span>
                            )}
                            {student.payment_summary.total_paid > 0 && student.payment_summary.total_pending > 0 && <span> / </span>}
                            {student.payment_summary.total_pending > 0 && (
                              <span className="text-red-600">₹{student.payment_summary.total_pending.toLocaleString()} due</span>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <Switch
                        checked={student.is_active}
                        onCheckedChange={() => toggleStudentStatus(student.id)}
                      />
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewStudent(student.id)}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditStudent(student.id)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Student
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteStudent(student.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Student
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredStudents.length)} of {filteredStudents.length} students
                </p>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      {/* Delete Confirmation Modal */}
      {showDeletePopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Delete</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this student? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowDeletePopup(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
