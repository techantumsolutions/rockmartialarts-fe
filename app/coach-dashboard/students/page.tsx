"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, Users, Mail, Phone, Loader2, Eye, Plus, RefreshCw } from "lucide-react"
import CoachDashboardHeader from "@/components/coach-dashboard-header"
import { checkCoachAuth } from "@/lib/coachAuth"
import { getBackendApiUrl } from "@/lib/config"
import { cn } from "@/lib/utils"
import {
  fetchCoachAssignments,
  filterStudentsForCoach,
  CoachAssignments,
  CoachAssignedBatch,
} from "@/lib/coachStudentFilter"

interface Student {
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
  branch_id?: string
  batch_ref?: string
  batch_name?: string
  progress?: number
  attendance_percentage?: number
  status?: string
}

export default function StudentsListPage() {
  const router = useRouter()
  const [allAssignedStudents, setAllAssignedStudents] = useState<Student[]>([])
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [coachData, setCoachData] = useState<any>(null)
  const [refreshing, setRefreshing] = useState(false)

  // Dynamic Course and Batch filters
  const [coachAssignments, setCoachAssignments] = useState<CoachAssignments | null>(null)
  const [selectedCourse, setSelectedCourse] = useState<string>("all")
  const [selectedBatch, setSelectedBatch] = useState<string>("all")
  const [availableBatches, setAvailableBatches] = useState<CoachAssignedBatch[]>([])

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
      // Fetch students with coach data
      fetchStudents(authResult.token, authResult.coach)
    } else {
      setError("Coach information not found")
      setLoading(false)
    }
  }, [router])

  // Update available batches when selectedCourse changes
  useEffect(() => {
    if (!coachAssignments) return

    if (selectedCourse === "all") {
      const allBatches: CoachAssignedBatch[] = []
      coachAssignments.courses.forEach((c) => allBatches.push(...c.batches))
      setAvailableBatches(allBatches)
    } else {
      const course = coachAssignments.courses.find(
        (c) => c.id === selectedCourse || c.course_id === selectedCourse
      )
      setAvailableBatches(course?.batches || [])
    }
  }, [selectedCourse, coachAssignments])

  // Filter students based on searchTerm, selectedCourse, and selectedBatch
  useEffect(() => {
    if (!coachAssignments) {
      setFilteredStudents(allAssignedStudents)
      return
    }

    const filtered = filterStudentsForCoach(allAssignedStudents, coachAssignments, {
      courseId: selectedCourse,
      batchRef: selectedBatch,
      searchTerm: searchTerm,
    })

    setFilteredStudents(filtered)
  }, [searchTerm, selectedCourse, selectedBatch, allAssignedStudents, coachAssignments])

  // Refresh function
  const handleRefresh = async () => {
    if (!coachData) return

    setRefreshing(true)
    try {
      const token = localStorage.getItem("access_token") || localStorage.getItem("token")
      if (token) {
        await fetchStudents(token, coachData)
      }
    } catch (error) {
      console.error('Error refreshing students:', error)
    } finally {
      setRefreshing(false)
    }
  }

  const fetchStudents = async (token: string, coach: any) => {
    try {
      setLoading(true)
      setError(null)

      // 1. Fetch coach courses and assigned batches in this branch
      const assignments = await fetchCoachAssignments(token, coach)
      setCoachAssignments(assignments)

      const allBatches: CoachAssignedBatch[] = []
      assignments.courses.forEach((c) => allBatches.push(...c.batches))
      setAvailableBatches(allBatches)

      // Get the coach's branch ID
      const branchId = coach?.branch_id
      if (!branchId) {
        setError("Coach is not assigned to any branch")
        setLoading(false)
        return
      }

      // 2. Fetch students from branch search via getBackendApiUrl
      let rawStudents: any[] = []
      try {
        const response = await fetch(
          getBackendApiUrl(`search/students?branch_id=${encodeURIComponent(branchId)}&limit=100`),
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        )

        if (response.status === 401) {
          localStorage.clear()
          router.push("/coach/login")
          return
        }

        if (response.ok) {
          const data = await response.json()
          rawStudents = data.students || []
        } else {
          console.warn(`search/students returned ${response.status}, trying fallback endpoints`)
        }
      } catch (err) {
        console.warn("Error fetching from search/students:", err)
      }

      // Also fetch from coach/students endpoint to ensure completeness
      try {
        const coachStudentsRes = await fetch(
          getBackendApiUrl(`coaches/${encodeURIComponent(coach.id)}/students`),
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        )
        if (coachStudentsRes.ok) {
          const csData = await coachStudentsRes.json()
          const extra = csData.students || csData.enrolled_students || []
          if (Array.isArray(extra) && extra.length > 0) {
            rawStudents = [...rawStudents, ...extra]
          }
        }
      } catch (e) {
        console.warn("Could not fetch from coach endpoint:", e)
      }

      // Fallback to attendance endpoint if rawStudents is still empty
      if (rawStudents.length === 0) {
        try {
          const todayStr = new Date().toISOString().split('T')[0]
          const attRes = await fetch(
            getBackendApiUrl(`attendance/students?date=${encodeURIComponent(todayStr)}`),
            {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            }
          )
          if (attRes.ok) {
            const attData = await attRes.json()
            rawStudents = attData.students || []
          }
        } catch (e) {
          console.warn("Could not fetch from attendance endpoint fallback:", e)
        }
      }

      // 3. Filter strictly based on assigned courses and assigned batches in this branch!
      const assigned = filterStudentsForCoach(rawStudents, assignments)

      // Map batch names
      const batchNameMap = new Map<string, string>()
      allBatches.forEach((b) => {
        if (b.id) batchNameMap.set(b.id, b.batch_name)
        if (b.batch_id) batchNameMap.set(b.batch_id, b.batch_name)
      })

      // 4. Transform data into Student format
      const transformedStudents: Student[] = assigned.map((student: any) => {
        const primaryCourse = student.courses?.[0]
        const studentBatchRef =
          student.batch_ref ||
          primaryCourse?.batch_ref ||
          student.course?.batch_ref ||
          ""

        const resolvedBatchName =
          student.batch_name ||
          primaryCourse?.batch_name ||
          (studentBatchRef ? batchNameMap.get(studentBatchRef) : null) ||
          ""

        return {
          id: student.id,
          student_id: student.student_id || student.id,
          full_name: student.full_name || student.student_name,
          student_name: student.student_name || student.full_name,
          email: student.email,
          phone: student.phone,
          date_of_birth: student.date_of_birth,
          gender: student.gender,
          is_active: student.is_active,
          enrollment_date: primaryCourse?.enrollment_date || student.enrollment_date,
          course_name: primaryCourse?.name || primaryCourse?.course_name || student.course_name,
          course_id: primaryCourse?.id || primaryCourse?.course_id || student.course_id,
          branch_name: student.branches?.[0]?.name || student.branch_name,
          branch_id: student.branches?.[0]?.id || student.branch_id,
          batch_ref: studentBatchRef,
          batch_name: resolvedBatchName,
          progress: primaryCourse?.progress ?? student.progress,
          status: student.is_active ? 'active' : 'inactive',
        }
      })

      setAllAssignedStudents(transformedStudents)
      setFilteredStudents(transformedStudents)

    } catch (err: any) {
      console.error('Error fetching students:', err)
      setError(err.message || 'Failed to load students')
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
      return age > 0 ? age : null
    } catch {
      return null
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
          currentPage="Students"
          coachName={coachData?.full_name || coachData?.name}
        />
        <main className="mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-yellow-400" />
              <span className="ml-2 text-gray-600">Loading students...</span>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CoachDashboardHeader 
        currentPage="Students"
        coachName={coachData?.full_name || coachData?.name}
      />
      
      <main className="mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Page Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">My Students</h1>
              <p className="text-gray-600">Students enrolled in your courses</p>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="text-sm">
                <Users className="w-4 h-4 mr-1" />
                {filteredStudents.length} students
              </Badge>
              <Button
                onClick={handleRefresh}
                disabled={refreshing}
                variant="outline"
                className="text-gray-600 hover:text-gray-800"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                onClick={() => router.push("/coach-dashboard/students/create")}
                className="bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Student
              </Button>
            </div>
          </div>

          {/* Search and Filters Bar */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search students by name, email, course, or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Course Filter Dropdown - show if more than one course assigned */}
                {coachAssignments && coachAssignments.courses.length > 1 && (
                  <div className="w-full md:w-56">
                    <Select
                      value={selectedCourse}
                      onValueChange={(val) => {
                        setSelectedCourse(val)
                        setSelectedBatch("all")
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="All Courses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Courses</SelectItem>
                        {coachAssignments.courses.map((course) => (
                          <SelectItem
                            key={course.id || course.course_id}
                            value={course.course_id || course.id}
                          >
                            {course.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Batch Filter Dropdown - show if batches are available */}
                {availableBatches.length > 1 && (
                  <div className="w-full md:w-64">
                    <Select
                      value={selectedBatch}
                      onValueChange={(val) => setSelectedBatch(val)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="All Batches" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Batches</SelectItem>
                        {availableBatches.map((batch) => {
                          const timeStr =
                            batch.start_time && batch.end_time
                              ? ` (${batch.start_time} - ${batch.end_time})`
                              : ""
                          return (
                            <SelectItem
                              key={batch.id || batch.batch_id}
                              value={batch.id || batch.batch_id}
                            >
                              {batch.batch_name}{timeStr}
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Refresh Button */}
                <Button
                  variant="outline"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="shrink-0"
                >
                  <RefreshCw className={cn("w-4 h-4 mr-2", refreshing && "animate-spin")} />
                  Refresh
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Error State */}
          {error && (
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="text-center text-red-600">
                  <p className="font-medium">Error loading students</p>
                  <p className="text-sm mt-1">{error}</p>
                  <Button
                    onClick={() => coachData && fetchStudents(localStorage.getItem("access_token")!, coachData)}
                    className="mt-4"
                    variant="outline"
                  >
                    Try Again
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Students Table */}
          {!error && (
            <Card>
              <CardHeader>
                <CardTitle>Students List</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredStudents.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {searchTerm ? 'No students found' : 'No students assigned'}
                    </h3>
                    <p className="text-gray-500">
                      {searchTerm 
                        ? 'Try adjusting your search terms' 
                        : 'Students will appear here once they enroll in your courses'
                      }
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left py-4 px-6 font-medium text-gray-600">Student</th>
                          <th className="text-left py-4 px-6 font-medium text-gray-600">Course</th>
                          <th className="text-left py-4 px-6 font-medium text-gray-600">Contact</th>
                          <th className="text-left py-4 px-6 font-medium text-gray-600">Age</th>
                          <th className="text-left py-4 px-6 font-medium text-gray-600">Status</th>
                          <th className="text-left py-4 px-6 font-medium text-gray-600">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStudents.map((student, index) => (
                          <tr key={student.id || `student-${index}`} className="border-b hover:bg-gray-50">
                            <td className="py-4 px-6">
                              <div className="flex items-center space-x-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src="" alt={student.student_name || student.full_name || 'Student'} />
                                  <AvatarFallback className="bg-yellow-100 text-yellow-800">
                                    {(() => {
                                      const name = student.student_name || student.full_name
                                      return name
                                        ? name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
                                        : 'S'
                                    })()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium text-gray-900">{student.student_name || student.full_name || 'Unknown Student'}</p>
                                  {student.id && (
                                    <p className="text-sm text-gray-500">ID: {student.id}</p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <div>
                                <p className="font-medium text-gray-900">{student.course_name || 'N/A'}</p>
                                {student.batch_name && (
                                  <Badge variant="outline" className="mt-1 bg-amber-50 text-amber-800 border-amber-200 text-xs">
                                    {student.batch_name}
                                  </Badge>
                                )}
                                {student.branch_name && (
                                  <p className="text-xs text-gray-500 mt-0.5">{student.branch_name}</p>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <div className="space-y-1">
                                <div className="flex items-center space-x-1">
                                  <Mail className="w-3 h-3 text-gray-400" />
                                  <span className="text-sm text-gray-600">{student.email}</span>
                                </div>
                                {student.phone && (
                                  <div className="flex items-center space-x-1">
                                    <Phone className="w-3 h-3 text-gray-400" />
                                    <span className="text-sm text-gray-600">{student.phone}</span>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <span className="text-sm text-gray-600">
                                {student.date_of_birth ? calculateAge(student.date_of_birth) || 'N/A' : 'N/A'}
                              </span>
                            </td>
                            <td className="py-4 px-6">
                              <Badge className={getStatusColor(student.status || (student.is_active ? 'active' : 'inactive'))}>
                                {student.status || (student.is_active ? 'Active' : 'Inactive')}
                              </Badge>
                            </td>
                            <td className="py-4 px-6">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => router.push(`/coach-dashboard/students/${student.id}`)}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
