"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Edit, Trash2, RefreshCw, Eye, BookOpen, Users } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import { useRouter } from "next/navigation"
import Header from "@/components/layout/Header"
import { getBackendApiUrl } from "@/lib/config"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"

interface Course {
  id: string
  course_name: string
  category: string
  level: string
  duration: string
  price: number
  is_active: boolean
  description: string
  enrolled_students: number
  assigned_coaches: Array<{
    coach_id: string
    coach_name: string
  }>
  created_at: string
  updated_at: string
}

export default function BranchManagerCoursesList() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [showDeletePopup, setShowDeletePopup] = useState(false)
  const [courseToDelete, setCourseToDelete] = useState<string | null>(null)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 6

  // Authentication check
  useEffect(() => {
    if (!BranchManagerAuth.isAuthenticated()) {
      router.replace('/branch-manager/login')
      return
    }
  }, [router])

  // Load courses data for branch manager from API
  useEffect(() => {
    const loadCoursesData = async () => {
      try {
        setLoading(true)
        setError(null)

        const currentUser = BranchManagerAuth.getCurrentUser()
        const token = BranchManagerAuth.getToken()

        if (!currentUser || !token) {
          throw new Error("Authentication required. Please login again.")
        }

        console.log('Loading courses for branch manager:', currentUser.full_name)
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

        // Call real backend API to get courses (backend handles filtering by managed branches)
        console.log('📚 Now fetching courses...')
        const coursesResponse = await fetch(getBackendApiUrl('courses?limit=100'), {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        })

        console.log('Courses API response status:', coursesResponse.status)

        if (!coursesResponse.ok) {
          const errorText = await coursesResponse.text()
          console.error('Courses API error:', coursesResponse.status, errorText)

          if (coursesResponse.status === 401) {
            throw new Error("Authentication failed. Please login again.")
          } else if (coursesResponse.status === 403) {
            throw new Error("You don't have permission to access course information.")
          } else {
            throw new Error(`Failed to load courses: ${coursesResponse.status} - ${errorText}`)
          }
        }

        const coursesData = await coursesResponse.json()
        console.log('📚 Courses API response:', coursesData)
        console.log('📚 Courses API response type:', typeof coursesData)
        console.log('📚 Courses API response keys:', Object.keys(coursesData || {}))

        const branchCourses = coursesData.courses || []

        // Debug: Show course data and branch assignments
        console.log('📚 Processing courses:', branchCourses.length)
        branchCourses.forEach((course: any, index: number) => {
          const branchAssignments = course.branch_assignments || []
          const branchIds = branchAssignments.map((ba: any) => ba.branch_id).filter(Boolean)
          console.log(`   Course ${index + 1}: ${course.name || course.title || 'Unknown'} - Assigned to branches: ${branchIds.join(', ') || 'None'}`)
        })

        // Transform the API data to match our Course interface
        const transformedCourses: Course[] = branchCourses.map((course: any) => ({
          id: course.id,
          course_name: course.name || course.course_name || course.title,
          category: course.category_name || course.category || "General",
          level: course.difficulty_level || course.level || "Beginner",
          duration: course.duration || "3 months",
          price: course.pricing?.amount || course.price || 0,
          is_active: course.settings?.active ?? course.is_active ?? true,
          description: course.description || "",
          enrolled_students: course.student_enrollment_count || course.student_count || course.enrolled_students || 0,
          assigned_coaches: course.instructor_assignments?.map((instructor: any) => ({
            coach_id: instructor.instructor_id || instructor.id || instructor.coach_id,
            coach_name: instructor.instructor_name || instructor.full_name || instructor.coach_name || instructor.name
          })) || course.instructors?.map((instructor: any) => ({
            coach_id: instructor.id || instructor.coach_id,
            coach_name: instructor.full_name || instructor.coach_name || instructor.name
          })) || [],
          created_at: course.created_at || new Date().toISOString(),
          updated_at: course.updated_at || new Date().toISOString()
        }))

        console.log('Transformed courses:', transformedCourses)
        console.log('Final courses count:', transformedCourses.length)

        if (transformedCourses.length === 0) {
          console.log('No courses found for branch manager')
          setError("No courses available at your branches. Please contact your administrator if you expect to see courses here.")
        } else {
          console.log(`✅ Loaded ${transformedCourses.length} course(s) for ${currentUser.full_name}`)
        }

        setCourses(transformedCourses)
      } catch (err: any) {
        console.error('Error loading courses data:', err)
        setError(err.message || 'Failed to load course information')
      } finally {
        setLoading(false)
      }
    }

    if (BranchManagerAuth.isAuthenticated()) {
      loadCoursesData()
    }
  }, [])

  // Filter courses based on search term
  const normalizedSearchTerm = searchTerm.trim().toLowerCase()
  const filteredCourses = courses.filter(course =>
    course.course_name.toLowerCase().includes(normalizedSearchTerm)
  )

  // Pagination
  const totalPages = Math.ceil(filteredCourses.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentCourses = filteredCourses.slice(startIndex, endIndex)

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const token = BranchManagerAuth.getToken()
      if (!token) {
        setError("Authentication token not found. Please login again.")
        return
      }

      // Fetch fresh courses data - backend handles filtering by managed branches
      console.log('🔄 Refreshing courses data...')
      const coursesResponse = await fetch(getBackendApiUrl('courses?limit=100'), {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      if (!coursesResponse.ok) {
        const errorText = await coursesResponse.text()
        console.error('Courses refresh API error:', coursesResponse.status, errorText)
        throw new Error(`Failed to refresh courses: ${coursesResponse.status} - ${errorText}`)
      }

      const coursesData = await coursesResponse.json()
      console.log('🔄 Refreshed courses data:', coursesData)

      const branchCourses = coursesData.courses || []

      const transformedCourses: Course[] = branchCourses.map((course: any) => ({
        id: course.id,
        course_name: course.name || course.course_name || course.title,
        category: course.category_name || course.category || "General",
        level: course.difficulty_level || course.level || "Beginner",
        duration: course.duration || "3 months",
        price: course.pricing?.amount || course.price || 0,
        is_active: course.settings?.active ?? course.is_active ?? true,
        description: course.description || "",
        enrolled_students: course.student_enrollment_count || course.student_count || course.enrolled_students || 0,
        assigned_coaches: course.instructor_assignments?.map((instructor: any) => ({
          coach_id: instructor.instructor_id || instructor.id || instructor.coach_id,
          coach_name: instructor.instructor_name || instructor.full_name || instructor.coach_name || instructor.name
        })) || course.instructors?.map((instructor: any) => ({
          coach_id: instructor.id || instructor.coach_id,
          coach_name: instructor.full_name || instructor.coach_name || instructor.name
        })) || [],
        created_at: course.created_at || new Date().toISOString(),
        updated_at: course.updated_at || new Date().toISOString()
      }))

      setCourses(transformedCourses)
      setError(null)
    } catch (err: any) {
      console.error('Error refreshing courses data:', err)
      setError(err.message || 'Failed to refresh course information')
    } finally {
      setRefreshing(false)
    }
  }

  const handleViewCourse = (courseId: string) => {
    router.push(`/branch-manager-dashboard/courses/${courseId}`)
  }

  const handleEditCourse = (courseId: string) => {
    router.push(`/branch-manager-dashboard/courses/edit/${courseId}`)
  }

  const handleDeleteCourse = (courseId: string) => {
    setCourseToDelete(courseId)
    setShowDeletePopup(true)
  }

  const confirmDelete = () => {
    if (courseToDelete) {
      setCourses(courses.filter(c => c.id !== courseToDelete))
      setCourseToDelete(null)
      setShowDeletePopup(false)
    }
  }

  const toggleCourseStatus = (courseId: string) => {
    setCourses(courses.map(course =>
      course.id === courseId
        ? { ...course, is_active: !course.is_active }
        : course
    ))
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  return (
    <>
      <Header title="Courses" role="branch_admin" />
      <div className="flex flex-col lg:flex-row justify-between items-start py-4 mb-4 lg:items-center gap-4">
        <div>
          <p className="text-sm text-gray-500 mt-1">Manage courses offered in your branch</p>
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
              onClick={() => router.push("/branch-manager-dashboard/create-course")}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Add Course
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
                  placeholder="Search by course name..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setCurrentPage(1)
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Courses Grid */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Courses ({filteredCourses.length})
              </h2>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-6 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3 mb-4"></div>
                    <div className="h-8 bg-gray-200 rounded w-1/3"></div>
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
                    <h3 className="text-lg font-medium text-red-800 mb-2">Unable to Load Courses</h3>
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
            ) : currentCourses.length === 0 ? (
              <div className="text-center py-12">
                <div className="max-w-md mx-auto">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                    <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-yellow-100 rounded-full">
                      <BookOpen className="w-6 h-6 text-yellow-600" />
                    </div>
                    <h3 className="text-lg font-medium text-yellow-800 mb-2">No Courses Found</h3>
                    <p className="text-yellow-700 mb-4">
                      {searchTerm
                        ? `No courses match your search "${searchTerm}"`
                        : "You don't have any courses available at your branches yet."
                      }
                    </p>
                    {!searchTerm && (
                      <div className="text-sm text-yellow-600 mb-4 text-left">
                        <p className="mb-2">This could mean:</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>No courses have been assigned to your managed branches</li>
                          <li>Your branch manager account may not have branch assignments</li>
                          <li>The course assignments are still being processed</li>
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
                        onClick={() => router.push("/branch-manager-dashboard/create-course")}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        Add Course
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {currentCourses.map((course) => (
                  <div key={course.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-2">{course.course_name}</h3>
                        <div className="flex flex-wrap gap-2 mb-3">
                          <Badge variant="outline">{course.category}</Badge>
                          <Badge variant="secondary">{course.level}</Badge>
                          <Badge variant={course.is_active ? "default" : "secondary"}>
                            {course.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewCourse(course.id)}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditCourse(course.id)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Course
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteCourse(course.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Course
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{course.description}</p>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Duration:</span>
                        <span className="font-medium">{course.duration}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Price:</span>
                        <span className="font-medium text-green-600">{formatCurrency(course.price)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Students:</span>
                        <span className="font-medium flex items-center">
                          <Users className="w-3 h-3 mr-1" />
                          {course.enrolled_students}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="text-xs text-gray-500">
                        {course.assigned_coaches.length} coach(es)
                      </div>
                      <Switch
                        checked={course.is_active}
                        onCheckedChange={() => toggleCourseStatus(course.id)}
                        size="sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredCourses.length)} of {filteredCourses.length} courses
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
              Are you sure you want to delete this course? This action cannot be undone.
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
