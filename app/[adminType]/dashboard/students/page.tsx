"use client"

import { getBackendApiUrl } from "@/lib/config"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search, Edit, Trash2, RefreshCw, Eye, Link2, MessageCircle } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useRouter, useParams, usePathname, useSearchParams } from "next/navigation"
import { TokenManager } from "@/lib/tokenManager"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"
import { formatRegisteredDateTime, formatRegisteredDateOnly } from "@/lib/formatRegisteredDate"
import {
  buildStudentListQuery,
  parseStudentListFilters,
  studentListReturnPath,
  type StudentAccountStatusFilter,
} from "@/lib/studentListFilters"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

function formatEnrollmentDate(iso: string | null | undefined): string {
  return formatRegisteredDateOnly(iso)
}

function computeStudentAge(student: {
  age?: number | null
  date_of_birth?: string
}): string | number {
  if (student.age && student.age > 0) return student.age
  if (student.date_of_birth) {
    try {
      const birthDate = new Date(student.date_of_birth)
      const today = new Date()
      let age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--
      }
      return age > 0 ? age : "—"
    } catch {
      return "—"
    }
  }
  return "—"
}

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
    branch_id?: string
  }>
  course_info?: {
    category_id: string
    course_id: string
    duration: string
  } | null
  branch_info?: {
    location_id?: string
    branch_id?: string
    branch_name?: string
  } | null
  has_credentials?: boolean
  start_date?: string | null
  end_date?: string | null
  student_level?: string | null
  address?: {
    line1: string
    area: string
    city: string
    state: string
    pincode: string
    country: string
  }
}

export default function StudentList() {
  const router = useRouter()
  const params = useParams()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const initialFilters = parseStudentListFilters(searchParams)
  const paramsAdmin = (params?.adminType as string) || ""
  const pathSegment = pathname?.split("/").filter(Boolean)[0] || ""
  const adminType =
    paramsAdmin ||
    (pathSegment === "super-admin" || pathSegment === "branch-admin" ? pathSegment : "super-admin")
  const basePath = `/${adminType}/dashboard`
  const [showAssignPopup, setShowAssignPopup] = useState(false)
  const [showDeletePopup, setShowDeletePopup] = useState(false)
  const [studentToDelete, setStudentToDelete] = useState<string | null>(null)
  const [selectedStudent, setSelectedStudent] = useState("")
  const [selectedBranch, setSelectedBranch] = useState("")
  const [selectedCourses, setSelectedCourses] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState(initialFilters.q)
  const [students, setStudents] = useState<Student[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [assignmentLoading, setAssignmentLoading] = useState(false)
  const [assignmentError, setAssignmentError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [unassignedStudents, setUnassignedStudents] = useState<Student[]>([])
  const [unassignedStudentsLoading, setUnassignedStudentsLoading] = useState(false)
  const [assignStudentSearch, setAssignStudentSearch] = useState("")
  const [assignStudentDropdownOpen, setAssignStudentDropdownOpen] = useState(false)
  const [listViewFilter, setListViewFilter] = useState<'all' | 'unassigned'>(initialFilters.view)
  /** Super-admin list filter: branch id or "all" */
  const [listBranchFilter, setListBranchFilter] = useState<string>(initialFilters.branch)
  const [accountStatusFilter, setAccountStatusFilter] = useState<StudentAccountStatusFilter>(
    initialFilters.status
  )
  const [statusDialog, setStatusDialog] = useState<{
    studentId: string
    studentName: string
    nextActive: boolean
  } | null>(null)
  const [statusReason, setStatusReason] = useState("")
  const [statusSaving, setStatusSaving] = useState(false)
// Pagination state
const [currentPage, setCurrentPage] = useState(initialFilters.page)
const itemsPerPage = 15
  const [refreshKey, setRefreshKey] = useState(0)
  const isBranchAdmin = (params?.adminType as string) === "branch-admin" ||
    (typeof pathname === "string" && pathname.startsWith("/branch-admin"))

  useEffect(() => {
    const qs = buildStudentListQuery({
      q: searchTerm,
      branch: listBranchFilter,
      view: listViewFilter,
      status: accountStatusFilter,
      page: currentPage,
    })
    const target = `${pathname}${qs}`
    if (typeof window !== "undefined" && `${pathname}${window.location.search}` !== target) {
      router.replace(target, { scroll: false })
    }
  }, [searchTerm, listBranchFilter, listViewFilter, accountStatusFilter, currentPage, pathname, router])

  const currentListReturnUrl = studentListReturnPath(basePath, {
    q: searchTerm,
    branch: listBranchFilter,
    view: listViewFilter,
    status: accountStatusFilter,
    page: currentPage,
  })

  // Fetch students from API (re-runs when refreshKey changes, e.g. after assign)
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true)
        setError(null)

        // Use branch-manager token when on branch-admin so we don't overwrite it with superadmin dev fallback
        let token = isBranchAdmin ? BranchManagerAuth.getToken() : TokenManager.getToken()
        if (!token && isBranchAdmin) token = TokenManager.getToken()

        if (!token) {
          throw new Error("Authentication token not found. Please login again.")
        }

        const qs = new URLSearchParams()
        if (adminType === "super-admin" && listBranchFilter !== "all") {
          qs.set("branch_id", listBranchFilter)
        }
        if (accountStatusFilter === "active") qs.set("is_active", "true")
        if (accountStatusFilter === "inactive") qs.set("is_active", "false")
        const studentsUrl = getBackendApiUrl(
          `users/students/details${qs.toString() ? `?${qs.toString()}` : ""}`
        )

        let response = await fetch(studentsUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          cache: 'no-store',
        })

        // If enhanced API fails, try basic users API
        if (!response.ok) {
          console.log("Enhanced API failed, trying basic users API...")
          response = await fetch(getBackendApiUrl('users?role=student'), {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            cache: 'no-store',
          })
        }

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.detail || errorData.message || `Failed to fetch students (${response.status})`)
        }

        const data = await response.json()
        console.log("Students fetched successfully:", data)

        // Handle different API response formats
        let studentsData = data.students || data.users || data || []

        // Ensure studentsData is always an array and transform data structure
        const studentsArray = Array.isArray(studentsData) ? studentsData.map(student => {
          const creds =
            student.has_credentials === false || student.hasCredentials === false ? false : true
          return {
          id: student.student_id || student.id,
          student_id: student.student_id || student.id,
          full_name: student.student_name || student.full_name || `${student.first_name || ''} ${student.last_name || ''}`.trim(),
          student_name: student.student_name || student.full_name,
          email: student.email,
          phone: student.phone,
          role: student.role || 'student',
          gender: student.gender,
          age: student.age || (student.date_of_birth ?
            new Date().getFullYear() - new Date(student.date_of_birth).getFullYear() : null),
          courses: student.courses || [],
          is_active: student.is_active !== undefined ? student.is_active : true,
          date_of_birth: student.date_of_birth,
          created_at: student.created_at,
          has_credentials: creds,
          start_date: student.start_date ?? null,
          end_date: student.end_date ?? null,
          // Add fallback course info from user model if available
          course_info: student.course || null,
          // Prefer API branch_info (has branch_name); fallback to legacy student.branch
          branch_info: student.branch_info || student.branch || null,
          branch_id: student.branch_id || student.branch_info?.branch_id,
          student_level: student.student_level ?? null,
        }}) : []

        studentsArray.sort((a, b) => {
          const ta = a.created_at ? new Date(a.created_at).getTime() : 0
          const tb = b.created_at ? new Date(b.created_at).getTime() : 0
          return tb - ta
        })

        setStudents(studentsArray)

      } catch (error) {
        console.error("Error fetching students:", error)
        setError(error instanceof Error ? error.message : 'Failed to fetch students')
      } finally {
        setLoading(false)
      }
    }

    fetchStudents()
  }, [refreshKey, pathname, listBranchFilter, accountStatusFilter, adminType])

  // Fetch branches and courses for the assignment modal
  const fetchBranchesAndCourses = async () => {
    try {
      const token = TokenManager.getToken()
      if (!token) return

      // Fetch branches
      const branchesResponse = await fetch(getBackendApiUrl('branches'), {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (branchesResponse.ok) {
        const branchesData = await branchesResponse.json()
        setBranches(branchesData.branches || branchesData || [])
      }

      // Fetch courses
      const coursesResponse = await fetch(getBackendApiUrl('courses'), {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (coursesResponse.ok) {
        const coursesData = await coursesResponse.json()
        setCourses(coursesData.courses || coursesData || [])
      }
    } catch (error) {
      console.error("Error fetching branches and courses:", error)
    }
  }

  useEffect(() => {
    if (adminType !== "super-admin") return
    void fetchBranchesAndCourses()
  }, [adminType])

  useEffect(() => {
    if (adminType !== "super-admin") {
      setListBranchFilter("all")
    }
  }, [adminType])

  const fetchUnassignedStudents = async () => {
    setUnassignedStudentsLoading(true)
    const url = getBackendApiUrl('users/students/details?unassigned_only=true')
    const tryFetch = async (token: string | null): Promise<Response | null> => {
      if (!token) return null
      return fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        cache: 'no-store',
      })
    }
    try {
      let token: string | null = isBranchAdmin ? BranchManagerAuth.getToken() : TokenManager.getToken()
      if (!token && isBranchAdmin) token = TokenManager.getToken()
      if (!token) token = TokenManager.getToken()
      let response = await tryFetch(token)
      if (response && !response.ok && response.status === 401 && isBranchAdmin) {
        const fallback = TokenManager.getToken()
        if (fallback && fallback !== token) response = await tryFetch(fallback)
      }
      if (!response) {
        setUnassignedStudents([])
        return
      }
      const data = await response.json().catch(() => ({}))
      if (response.ok) {
        const list = Array.isArray(data.students) ? data.students : Array.isArray(data) ? data : []
        list.sort((a: { created_at?: string }, b: { created_at?: string }) => {
          const ta = a.created_at ? new Date(a.created_at).getTime() : 0
          const tb = b.created_at ? new Date(b.created_at).getTime() : 0
          return tb - ta
        })
        setUnassignedStudents(list)
      } else {
        setUnassignedStudents([])
      }
    } catch (e) {
      console.error('Failed to fetch unassigned students:', e)
      setUnassignedStudents([])
    } finally {
      setUnassignedStudentsLoading(false)
    }
  }

  const handleAssignClick = async () => {
    fetchBranchesAndCourses()
    setShowAssignPopup(true)
    setUnassignedStudents([])
    await fetchUnassignedStudents()
  }

  const handleListViewFilterChange = (value: 'all' | 'unassigned') => {
    setListViewFilter(value)
    setCurrentPage(1)
    if (value === 'unassigned' && unassignedStudents.length === 0) {
      fetchUnassignedStudents()
    }
  }

  const handleListBranchFilterChange = (value: string) => {
    setListBranchFilter(value)
    setCurrentPage(1)
  }

  /** Branch shown in the table column — must match filter (not historical/other enrollments). */
  const getStudentDisplayBranchId = (student: Student): string | null =>
    student.branch_info?.branch_id ?? student.branch_id ?? null

  const studentMatchesBranchListFilter = (student: Student) => {
    if (adminType !== "super-admin" || listBranchFilter === "all") return true
    return getStudentDisplayBranchId(student) === listBranchFilter
  }

  const handleAssignConfirm = async () => {
    if (!selectedStudent || !selectedBranch || selectedCourses.length === 0) {
      setAssignmentError("Please select a student, branch, and at least one course")
      return
    }

    try {
      setAssignmentLoading(true)
      setAssignmentError(null)

      const token = isBranchAdmin ? BranchManagerAuth.getToken() : TokenManager.getToken()
      if (!token) {
        throw new Error("Authentication token not found. Please login again.")
      }

      // Update student with branch and course assignments
      const response = await fetch(getBackendApiUrl(`users/${selectedStudent}`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          branch: {
            location_id: "hyderabad", // Default location
            branch_id: selectedBranch
          },
          course: selectedCourses.length > 0 ? {
            category_id: "martial-arts", // Default category
            course_id: selectedCourses[0], // Use first selected course
            duration: "3-months" // Default duration
          } : undefined
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || errorData.message || `Failed to assign student (${response.status})`)
      }

      const assignedBranchName = branches.find((b: any) => b.id === selectedBranch)?.branch?.name
        || branches.find((b: any) => b.id === selectedBranch)?.name
        || "Assigned"
      setStudents(prevStudents =>
        prevStudents.map(student =>
          student.id === selectedStudent
            ? {
                ...student,
                branch_info: {
                  location_id: "hyderabad",
                  branch_id: selectedBranch,
                  branch_name: assignedBranchName
                },
                course_info: selectedCourses.length > 0 ? {
                  category_id: "martial-arts",
                  course_id: selectedCourses[0],
                  duration: "3-months"
                } : student.course_info
              }
            : student
        )
      )

      alert("Student assigned successfully!")
      setShowAssignPopup(false)
      setSelectedStudent("")
      setSelectedBranch("")
      setSelectedCourses([])
      setRefreshKey((k) => k + 1)

    } catch (error) {
      setAssignmentError(error instanceof Error ? error.message : 'Failed to assign student')
    } finally {
      setAssignmentLoading(false)
    }
  }

  const handleDeleteClick = (studentId: string) => {
    setStudentToDelete(studentId)
    setShowDeletePopup(true)
  }

  const handleDeleteConfirm = async () => {
    if (studentToDelete !== null) {
      try {
        // Enhanced authentication debugging
        console.log("🔍 Starting delete operation for student:", studentToDelete)

        const token = TokenManager.getToken()
        const user = TokenManager.getUser()
        const isAuth = TokenManager.isAuthenticated()

        console.log("Authentication status:", {
          hasToken: !!token,
          tokenPreview: token ? token.substring(0, 20) + "..." : "null",
          isAuthenticated: isAuth,
          user: user,
          userRole: user?.role
        })

        if (!token) {
          throw new Error("Authentication token not found. Please login again.")
        }

        if (!isAuth) {
          throw new Error("Authentication token has expired. Please login again.")
        }

        // Check user role - handle both superadmin and super_admin role names
        const allowedRoles = ['super_admin', 'coach_admin', 'superadmin']
        if (!user || !allowedRoles.includes(user.role)) {
          throw new Error(`Insufficient permissions. Only Super Admin and Coach Admin can delete students. Current role: ${user?.role || 'none'}`)
        }

        console.log("🚀 Making DELETE request to:", getBackendApiUrl(`users/${studentToDelete}`))

        const response = await fetch(getBackendApiUrl(`users/${studentToDelete}`), {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        console.log("📡 Response received:", {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          console.error("❌ Delete request failed:", errorData)

          if (response.status === 401) {
            throw new Error("Invalid authentication credentials. Please login again.")
          } else if (response.status === 403) {
            throw new Error("Insufficient permissions to delete students.")
          } else {
            throw new Error(errorData.detail || errorData.message || `Failed to delete student (${response.status})`)
          }
        }

        // Get the response message
        const responseData = await response.json().catch(() => ({ message: 'Student deleted successfully' }))
        console.log("✅ Delete successful:", responseData)

        // Remove student from local state
        setStudents((Array.isArray(students) ? students : []).filter(student => student.id !== studentToDelete))
        setStudentToDelete(null)
        setShowDeletePopup(false)

        // Show success message
        alert(responseData.message || 'Student deleted successfully')

      } catch (error) {
        console.error("❌ Error deleting student:", error)
        alert(`Error deleting student: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
  }

  const handleDeleteCancel = () => {
    setStudentToDelete(null)
    setShowDeletePopup(false)
  }

  const handleViewClick = (studentId: string) => {
    router.push(
      `${basePath}/students/${studentId}?return=${encodeURIComponent(currentListReturnUrl)}`
    )
  }

  const handleEditClick = (studentId: string) => {
    router.push(
      `${basePath}/students/edit/${studentId}?return=${encodeURIComponent(currentListReturnUrl)}`
    )
  }

  const [onboardLinkLoading, setOnboardLinkLoading] = useState<string | null>(null)
  const [notifyLoadingId, setNotifyLoadingId] = useState<string | null>(null)
  const handleNotifyStudent = async (
    studentId: string,
    kind: "welcome" | "payment_reminder"
  ) => {
    if (adminType !== "super-admin") return
    const token = TokenManager.getToken()
    if (!token) {
      alert("Please log in again.")
      return
    }
    setNotifyLoadingId(studentId)
    try {
      const res = await fetch(getBackendApiUrl(`users/${studentId}/notify-student`), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ kind }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg =
          typeof data?.detail === "string"
            ? data.detail
            : Array.isArray(data?.detail)
              ? data.detail.map((d: { msg?: string }) => d.msg).filter(Boolean).join("; ")
              : data.message || "Request failed"
        throw new Error(msg)
      }
      alert(data.message || "Message queued.")
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not send message.")
    } finally {
      setNotifyLoadingId(null)
    }
  }

  const handleSendOnboardLink = async (studentId: string) => {
    const token = isBranchAdmin ? BranchManagerAuth.getToken() : TokenManager.getToken()
    if (!token) {
      alert("Please log in again.")
      return
    }
    setOnboardLinkLoading(studentId)
    try {
      const res = await fetch(getBackendApiUrl("onboarding/generate-link"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ student_id: studentId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.detail || data.message || "Failed to generate link")
      }
      const link = data.link || ""
      if (link && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link)
        alert("Onboard link copied to clipboard. Send it to the student so they can set their password and complete their profile (course, branch, duration, joining date).")
      } else {
        prompt("Copy this link and send it to the student:", link)
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to generate onboard link")
    } finally {
      setOnboardLinkLoading(null)
    }
  }

  const handleToggleStudent = async (studentId: string) => {
    const student = (Array.isArray(students) ? students : []).find((s) => s.id === studentId)
    if (!student) return
    setStatusReason("")
    setStatusDialog({
      studentId,
      studentName: student.full_name || student.student_name || "Student",
      nextActive: !student.is_active,
    })
  }

  const confirmStatusChange = async () => {
    if (!statusDialog) return
    const { studentId, nextActive } = statusDialog
    if (!nextActive && !statusReason.trim()) {
      alert("Please enter a reason for deactivating this student.")
      return
    }
    setStatusSaving(true)
    try {
      let token = isBranchAdmin ? BranchManagerAuth.getToken() : TokenManager.getToken()
      if (!token && isBranchAdmin) token = TokenManager.getToken()
      if (!token) {
        throw new Error("Authentication token not found. Please login again.")
      }

      const response = await fetch(getBackendApiUrl(`users/${studentId}/status`), {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          is_active: nextActive,
          reason: statusReason.trim() || undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          errorData.detail || errorData.message || `Failed to update student status (${response.status})`
        )
      }

      setStudents((Array.isArray(students) ? students : []).map((s) =>
        s.id === studentId ? { ...s, is_active: nextActive } : s
      ))
      setUnassignedStudents((prev) =>
        prev.map((s) => (s.id === studentId ? { ...s, is_active: nextActive } : s))
      )
      setStatusDialog(null)
      setStatusReason("")
    } catch (error) {
      console.error("Error updating student status:", error)
      alert(
        `Error updating student status: ${error instanceof Error ? error.message : "Unknown error"}`
      )
    } finally {
      setStatusSaving(false)
    }
  }



  const handleCourseToggle = (course: string) => {
    setSelectedCourses((prev) => (prev.includes(course) ? prev.filter((c) => c !== course) : [...prev, course]))
  }

  const listFiltersActive =
    Boolean(searchTerm) ||
    (adminType === "super-admin" && listBranchFilter !== "all") ||
    accountStatusFilter !== "all"

  const listBaseStudents = listViewFilter === 'unassigned' ? unassignedStudents : students

  // Enhanced search functionality - filter students based on search term
  const filteredStudents = Array.isArray(listBaseStudents) ? listBaseStudents.filter((student) => {
    if (!studentMatchesBranchListFilter(student)) return false
    if (accountStatusFilter === "active" && !student.is_active) return false
    if (accountStatusFilter === "inactive" && student.is_active) return false
    if (!searchTerm) return true

    const searchLower = searchTerm.toLowerCase()
    return (
      student.full_name?.toLowerCase().includes(searchLower) ||
      student.student_name?.toLowerCase().includes(searchLower) ||
      student.id?.toLowerCase().includes(searchLower) ||
      student.email?.toLowerCase().includes(searchLower) ||
      student.phone?.toLowerCase().includes(searchLower) ||
      student.gender?.toLowerCase().includes(searchLower) ||
      student.branch_info?.branch_name?.toLowerCase().includes(searchLower) ||
      student.courses?.some(course =>
        course.course_name?.toLowerCase().includes(searchLower) ||
        course.course_id?.toLowerCase().includes(searchLower)
      ) ||
      student.course_info?.course_id?.toLowerCase().includes(searchLower)
    )
  }) : []

  // Calculate total pages
const totalPages = Math.ceil(filteredStudents.length / itemsPerPage)

// Slice students for current page
const paginatedStudents = filteredStudents.slice(
  (currentPage - 1) * itemsPerPage,
  currentPage * itemsPerPage
)

  return (
    <div className="min-h-screen bg-gray-50 min-w-0">
      {/* Main Content */}
      <div className="w-full min-w-0">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4 sm:mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-[#4F5077]">Student list</h1>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              size="sm"
              disabled={loading || refreshing}
              className="min-h-[44px] sm:min-h-[40px]"
            >
              <RefreshCw className={`w-4 h-4 text-[#4F5077] ${loading || refreshing ? 'animate-spin' : ''}`} />
              <span className="text-[#4F5077]">Refresh</span>
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {/* <Button
              onClick={() => router.push(`${basePath}/create-student`)}
              className="bg-yellow-400 hover:bg-yellow-500 text-white px-6 py-2 rounded-lg font-medium"
            >
              + Add Student
            </Button> */}
            {adminType === "super-admin" && (
              <Button
                onClick={() => router.push(`${basePath}/students/import`)}
                variant="outline"
                className="border-[#4F5077] text-[#4F5077] hover:bg-gray-100 px-4 sm:px-6 min-h-[48px]"
              >
                Bulk Import
              </Button>
            )}
            <Button
              onClick={handleAssignClick}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 sm:px-6 min-h-[48px]"
            >
              Assign to Branch
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow border">
              <div className="text-center">
                <p className="text-sm text-[#4F5077] mb-1">
                  {listViewFilter === 'unassigned'
                    ? 'Unassigned students'
                    : listFiltersActive
                      ? `Filtered (${filteredStudents.length}/${listBaseStudents.length})`
                      : 'Total Students'}
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {listFiltersActive ? filteredStudents.length : listBaseStudents.length}
                </p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border">
              <div className="text-center">
                <p className="text-sm text-[#4F5077] mb-1">Active Students</p>
                <p className="text-2xl font-bold text-green-600">
                  {students.filter(s => s.is_active).length}
                </p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border">
              <div className="text-center">
                <p className="text-sm text-[#4F5077] mb-1">With Courses</p>
                <p className="text-2xl font-bold text-purple-600">
                  {students.filter(s => (s.courses && s.courses.length > 0) || s.course_info).length}
                </p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border">
              <div className="text-center">
                <p className="text-sm text-[#4F5077] mb-1">Male/Female</p>
                <p className="text-2xl font-bold text-orange-600">
                  {students.filter(s => s.gender === 'male').length}/
                  {students.filter(s => s.gender === 'female').length}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* List view filter + Search - stacks on mobile */}
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-[#4F5077]">Show:</span>
            <Select value={listViewFilter} onValueChange={(v) => handleListViewFilterChange(v as 'all' | 'unassigned')}>
              <SelectTrigger className="w-full sm:w-[180px] min-h-[44px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All students</SelectItem>
                <SelectItem value="unassigned">Unassigned only</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm font-medium text-[#4F5077] sm:ml-1">Status:</span>
            <Select
              value={accountStatusFilter}
              onValueChange={(v) => {
                setAccountStatusFilter(v as StudentAccountStatusFilter)
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className="w-full sm:w-[150px] min-h-[44px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            {listViewFilter === 'unassigned' && unassignedStudentsLoading && (
              <span className="text-sm text-gray-500">Loading unassigned...</span>
            )}
            {adminType === "super-admin" && (
              <>
                <span className="text-sm font-medium text-[#4F5077] sm:ml-2">Branch:</span>
                <Select value={listBranchFilter} onValueChange={handleListBranchFilterChange}>
                  <SelectTrigger className="w-full sm:w-[200px] min-h-[44px]">
                    <SelectValue placeholder="All branches" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All branches</SelectItem>
                    {branches
                      .filter((b: { id?: string }) => Boolean(b?.id))
                      .map((b: { id: string; name?: string; branch?: { name?: string } }) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.branch?.name || b.name || "Branch"}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </>
            )}
          </div>
          <div className="relative flex-1 min-w-0 sm:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black w-4 h-4" />
            <Input
              placeholder="Search name, phone, email, course..."
              className="pl-10 text-[#6B7A99]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Students Table - horizontal scroll on small screens */}
        <div className="bg-white rounded-lg shadow overflow-hidden min-w-0">
          <div className="overflow-x-auto -mx-0 scrollbar-thin">
            <table className="w-full min-w-[640px]">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left py-4 px-4 text-sm font-medium text-[#6B7A99]">S.No</th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-[#6B7A99]">Student</th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-[#6B7A99]">Registered</th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-[#6B7A99]">Courses (Expertise)</th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-[#6B7A99]">Duration</th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-[#6B7A99]">Branch</th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-[#6B7A99]">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 px-6 text-center text-gray-500">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                        <span>Loading students...</span>
                      </div>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={7} className="py-8 px-6 text-center">
                      <div className="text-red-500 mb-2">
                        <strong>Error loading students:</strong>
                      </div>
                      <div className="text-sm text-gray-600 mb-4">{error}</div>
                      <Button
                        onClick={() => window.location.reload()}
                        variant="outline"
                        size="sm"
                        className="text-blue-600 border-blue-600 hover:bg-blue-50"
                      >
                        Retry
                      </Button>
                    </td>
                  </tr>
                ) : listViewFilter === 'unassigned' && unassignedStudentsLoading ? (
                  <tr>
                    <td colSpan={7} className="py-8 px-6 text-center text-gray-500">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                        <span>Loading unassigned students...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 px-6 text-center text-gray-500">
                      <div className="mb-2">
                        {searchTerm
                          ? `No students found matching "${searchTerm}"`
                          : listBranchFilter !== "all" && adminType === "super-admin"
                            ? "No students match this branch."
                            : "No data available"}
                      </div>
                      {!searchTerm && !(listBranchFilter !== "all" && adminType === "super-admin") && (
                        <Button
                          onClick={() => router.push(`${basePath}/create-student`)}
                          className="bg-yellow-400 hover:bg-yellow-500 text-black"
                          size="sm"
                        >
                          Add First Student
                        </Button>
                      )}
                    </td>
                  </tr>
                ) : (
                  paginatedStudents.map((student, index) => (
                    <tr key={student.id} className="border-b hover:bg-gray-50 text-[#6B7A99] text-sm">
                      <td className="py-4 px-4 align-top text-sm font-medium text-[#4F5077]">{filteredStudents.length - ((currentPage - 1) * itemsPerPage + index)}</td>
                      <td className="py-4 px-6 align-top">
                        <div className="flex flex-col gap-1.5 min-w-[12rem] max-w-[16rem]">
                          <span className="font-medium text-[#4F5077]">
                            {student.full_name || student.student_name || "N/A"}
                          </span>
                          <div className="flex flex-col gap-0.5 text-xs text-[#6B7A99] leading-snug">
                            <span>
                              <span className="text-[#9CA3AF]">Phone:</span>{" "}
                              {student.phone?.trim() ? student.phone : "—"}
                            </span>
                            <span className="capitalize">
                              <span className="text-[#9CA3AF]">Gender:</span>{" "}
                              {student.gender?.trim() ? student.gender : "—"}
                            </span>
                            <span>
                              <span className="text-[#9CA3AF]">Age:</span> {computeStudentAge(student)}
                            </span>
                          </div>
                          {adminType === "super-admin" && student.student_level ? (
                            <Badge
                              variant="outline"
                              className="w-fit text-xs font-medium border-[#4F5077]/30 text-[#4F5077]"
                            >
                              {student.student_level}
                            </Badge>
                          ) : null}
                        </div>
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap text-sm max-w-[11rem] sm:max-w-none align-top">
                        {formatRegisteredDateTime(student.created_at)}
                      </td>
                      <td className="py-4 px-6">
                        {student.courses && student.courses.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {student.courses.map((course, index) => (
                              <Badge key={index} variant="secondary" className="bg-[#D9D9D9] text-[#7D8592] rounded text-xs">
                                {course.course_name || course.course_id}
                              </Badge>
                            ))}
                          </div>
                        ) : student.course_info ? (
                          <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                            Course ID: {student.course_info.course_id}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-gray-100 text-gray-700 text-xs">
                            No Courses
                          </Badge>
                        )}
                      </td>
                      <td className="py-4 px-6 align-top">
                        <div className="flex flex-col gap-1 text-sm min-w-[9rem]">
                          <span className="font-medium text-[#4F5077]">
                            {student.courses && student.courses.length > 0 && student.courses[0].duration
                              ? student.courses[0].duration
                              : student.course_info?.duration || "—"}
                          </span>
                          <div className="flex flex-col gap-0.5 text-xs text-[#6B7A99] leading-snug">
                            <span>
                              <span className="text-[#9CA3AF]">Start:</span>{" "}
                              {formatEnrollmentDate(student.start_date ?? undefined)}
                            </span>
                            <span>
                              <span className="text-[#9CA3AF]">End:</span>{" "}
                              {formatEnrollmentDate(student.end_date ?? undefined)}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 align-top">{student.branch_info?.branch_name || 'Not assigned'}</td>
                      <td className="py-4 px-6 align-top">
                        <div className="flex items-center space-x-2">
                          {adminType === "super-admin" && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={notifyLoadingId === student.id || !student.phone?.trim()}
                                  className="p-1 h-8 w-8 shrink-0"
                                  title={
                                    student.phone?.trim()
                                      ? "Send SMS / WhatsApp"
                                      : "Add phone number to send messages"
                                  }
                                >
                                  {notifyLoadingId === student.id ? (
                                    <span className="text-[10px] text-muted-foreground">…</span>
                                  ) : (
                                    <MessageCircle className="w-4 h-4 text-emerald-600" />
                                  )}
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-52">
                                <DropdownMenuItem
                                  onClick={() => void handleNotifyStudent(student.id, "welcome")}
                                  disabled={!student.phone?.trim()}
                                >
                                  Send welcome message
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => void handleNotifyStudent(student.id, "payment_reminder")}
                                  disabled={!student.phone?.trim()}
                                >
                                  Send payment reminder
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewClick(student.id)}
                            className="p-1 h-8 w-8"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4 text-blue-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClick(student.id)}
                            className="p-1 h-8 w-8"
                            title="Edit Student"
                          >
                            <Edit className="w-4 h-4 text-gray-600" />
                          </Button>
                          {student.has_credentials === false ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSendOnboardLink(student.id)}
                            disabled={onboardLinkLoading === student.id}
                            className="p-1 h-8 w-8"
                            title="Send onboard link (set password & course/branch/duration)"
                          >
                            {onboardLinkLoading === student.id ? (
                              <span className="text-xs">...</span>
                            ) : (
                              <Link2 className="w-4 h-4 text-green-600" />
                            )}
                          </Button>
                          ) : null}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(student.id)}
                            className="p-1 h-8 w-8"
                            title="Delete Student"
                          >
                            <Trash2 className="w-4 h-4 text-gray-600" />
                          </Button>
                          <Switch
                            checked={student.is_active}
                            onCheckedChange={() => handleToggleStudent(student.id)}
                            className="data-[state=checked]:bg-yellow-400"
                            title={student.is_active ? "Deactivate student" : "Activate student"}
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

         {/* Pagination */}
<div className="flex justify-center items-center space-x-2 py-4 border-t">
  {/* Previous Button */}
  <Button
    variant="outline"
    size="sm"
    disabled={currentPage === 1}
    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
  >
    Previous
  </Button>

  {/* Page Numbers */}
  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
    <Button
      key={page}
      onClick={() => setCurrentPage(page)}
      className={`${
        currentPage === page
          ? "bg-yellow-400 hover:bg-yellow-500 text-black"
          : "bg-transparent"
      }`}
      variant={currentPage === page ? "default" : "outline"}
      size="sm"
    >
      {page}
    </Button>
  ))}

  {/* Next Button */}
  <Button
    variant="outline"
    size="sm"
    disabled={currentPage === totalPages}
    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
  >
    Next
  </Button>
</div>

        </div>
      </div>

      {/* Assign Popup */}
      {showAssignPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Assign Student to Branch & Course</h3>
              <Button variant="ghost" size="sm" onClick={() => {
                setShowAssignPopup(false)
                setAssignmentError(null)
                setSelectedStudent("")
                setSelectedBranch("")
                setSelectedCourses([])
                setAssignStudentSearch("")
                setAssignStudentDropdownOpen(false)
              }} className="p-1">
                ×
              </Button>
            </div>

            {assignmentError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{assignmentError}</p>
              </div>
            )}

            <div className="space-y-4">
              {/* Student: type to search, unassigned students only; list shows only on input click */}
              <div className="relative">
                <label className="block text-sm font-medium mb-2">Select Student (unassigned only)</label>
                {unassignedStudentsLoading ? (
                  <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500">
                    Loading unassigned students...
                  </div>
                ) : (
                  <>
                    <Input
                      type="text"
                      placeholder="Type to search unassigned students..."
                      value={assignStudentSearch}
                      onChange={(e) => {
                        setAssignStudentSearch(e.target.value)
                        setSelectedStudent("")
                      }}
                      onFocus={() => setAssignStudentDropdownOpen(true)}
                      onClick={() => setAssignStudentDropdownOpen(true)}
                      className="w-full"
                    />
                    {selectedStudent && (
                      <p className="mt-1.5 flex items-center gap-2 text-sm text-gray-700">
                        <span>Selected: {unassignedStudents.find(s => s.id === selectedStudent)?.full_name || unassignedStudents.find(s => s.id === selectedStudent)?.student_name} ({unassignedStudents.find(s => s.id === selectedStudent)?.email})</span>
                        <Button type="button" variant="ghost" size="sm" className="h-auto p-0 text-blue-600 hover:text-blue-800" onClick={() => { setSelectedStudent(""); setAssignStudentSearch(""); setAssignStudentDropdownOpen(false) }}>Change</Button>
                      </p>
                    )}
                    {!selectedStudent && assignStudentDropdownOpen && (
                      <div
                        className="mt-1 max-h-48 overflow-auto rounded-md border border-gray-200 bg-white shadow-lg z-20 absolute left-0 right-0"
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        {(() => {
                          const q = assignStudentSearch.trim().toLowerCase()
                          const filtered = q
                            ? unassignedStudents.filter(s => {
                                const name = (s.full_name || s.student_name || "").toLowerCase()
                                const email = (s.email || "").toLowerCase()
                                return name.includes(q) || email.includes(q)
                              })
                            : unassignedStudents
                          if (filtered.length === 0) {
                            return (
                              <div className="px-3 py-4 text-center text-sm text-gray-500">
                                {unassignedStudents.length === 0 ? "No unassigned students." : "No match. Type name or email."}
                              </div>
                            )
                          }
                          return (
                            <ul className="py-1">
                              {filtered.map((student) => (
                                <li key={student.id}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedStudent(student.id)
                                      setAssignStudentSearch("")
                                      setAssignStudentDropdownOpen(false)
                                    }}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                                  >
                                    {student.full_name || student.student_name} ({student.email})
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )
                        })()}
                      </div>
                    )}
                  </>
                )}
                {/* Invisible overlay to close dropdown when clicking outside */}
                {assignStudentDropdownOpen && !selectedStudent && (
                  <div
                    className="fixed inset-0 z-10"
                    aria-hidden
                    onClick={() => setAssignStudentDropdownOpen(false)}
                  />
                )}
              </div>

              {/* Branch Dropdown */}
              <div>
                <label className="block text-sm font-medium mb-2">Select Branch</label>
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a branch..." />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch) => {
                      const branchName = branch.branch?.name || branch.name
                      const address = branch.branch?.address || branch.address
                      const addressText = address ? `${address.area}, ${address.city}` : 'No address'

                      return (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branchName} - {addressText}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Course Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">Select Courses</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose courses..." />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="p-2 space-y-2">
                      {courses.map((course) => (
                        <div key={course.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={course.id}
                            checked={selectedCourses.includes(course.id)}
                            onChange={() => handleCourseToggle(course.id)}
                            className="rounded"
                          />
                          <label htmlFor={course.id} className="text-sm">
                            {course.title} - {course.difficulty_level}
                          </label>
                        </div>
                      ))}
                    </div>
                  </SelectContent>
                </Select>
                {selectedCourses.length > 0 && (
                  <div className="mt-2 text-sm text-gray-600">
                    Selected: {selectedCourses.length} course(s)
                  </div>
                )}
              </div>
            </div>

            <Button
              onClick={handleAssignConfirm}
              disabled={assignmentLoading}
              className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
            >
              {assignmentLoading ? "Assigning..." : "Assign Now"}
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Popup */}
      {showDeletePopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Delete Student</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this student? This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <Button onClick={handleDeleteCancel} variant="outline" className="flex-1 bg-transparent">
                Cancel
              </Button>
              <Button onClick={handleDeleteConfirm} className="flex-1 bg-red-600 hover:bg-red-700 text-white">
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* M08-S01 status change with reason */}
      <Dialog
        open={!!statusDialog}
        onOpenChange={(open) => {
          if (!open && !statusSaving) {
            setStatusDialog(null)
            setStatusReason("")
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {statusDialog?.nextActive ? "Activate student" : "Deactivate student"}
            </DialogTitle>
            <DialogDescription>
              {statusDialog?.nextActive
                ? `Reactivate ${statusDialog?.studentName}. They will be able to sign in again.`
                : `Deactivate ${statusDialog?.studentName}. They will not be able to sign in until reactivated.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="status-reason">
              Reason {statusDialog?.nextActive ? "(optional)" : "(required)"}
            </Label>
            <Textarea
              id="status-reason"
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value)}
              placeholder={
                statusDialog?.nextActive
                  ? "Optional note for the status history…"
                  : "Why is this student being deactivated?"
              }
              rows={3}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={statusSaving}
              onClick={() => {
                setStatusDialog(null)
                setStatusReason("")
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={statusSaving}
              className={
                statusDialog?.nextActive
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-amber-600 hover:bg-amber-700 text-white"
              }
              onClick={() => void confirmStatusChange()}
            >
              {statusSaving ? "Saving…" : statusDialog?.nextActive ? "Activate" : "Deactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
