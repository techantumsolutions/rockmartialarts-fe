"use client"

import { getBackendApiUrl } from "@/lib/config"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search, Edit, ToggleLeft, ToggleRight, Eye } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useRouter, usePathname } from "next/navigation"
import { useDashboardBasePath } from "@/lib/useDashboardBasePath"
import { TokenManager } from "@/lib/tokenManager"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"

interface Course {
  id: string
  title: string
  name?: string // For compatibility
  code: string
  description: string
  difficulty_level: string
  student_requirements: {
    max_students: number
    min_age: number
    max_age: number
    prerequisites: string[]
  }
  pricing: {
    currency: string
    amount: number
    branch_specific_pricing: boolean
  }
  settings: {
    offers_certification: boolean
    active: boolean
  }
  created_at: string
  updated_at: string
  // Additional properties for dashboard display
  icon?: string
  branches?: number
  branchLocations?: string[]
  coachs?: number
  students?: number
  enabled?: boolean
  category?: string
}

export default function CourseListPage() {
  const router = useRouter()
  const pathname = usePathname()
  const basePath = useDashboardBasePath()
  const isBranchAdmin =
    typeof pathname === "string" && pathname.startsWith("/branch-admin")
  const [searchTerm, setSearchTerm] = useState("")
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Fetch courses from API (branch admin: only courses assigned to managed branches)
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true)
        setError(null)

        let token = isBranchAdmin ? BranchManagerAuth.getToken() : TokenManager.getToken()
        if (!token && isBranchAdmin) token = TokenManager.getToken()

        const url = isBranchAdmin ? getBackendApiUrl("courses?active_only=true&limit=100") : getBackendApiUrl("courses?limit=200")
        const headers: Record<string, string> = isBranchAdmin
          ? BranchManagerAuth.getAuthHeaders()
          : { "Content-Type": "application/json" }
        if (token && !headers["Authorization"]) {
          headers["Authorization"] = `Bearer ${token}`
        }

        const response = await fetch(url, {
          method: "GET",
          headers,
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.detail || errorData.message || `Failed to fetch courses (${response.status})`)
        }

        const data = await response.json()
        console.log("Courses fetched successfully:", data)

        // Handle different response formats
        const coursesData = data.courses || data || []
        setCourses(coursesData)

      } catch (error) {
        console.error("Error fetching courses:", error)
        setError(error instanceof Error ? error.message : 'Failed to fetch courses')
      } finally {
        setLoading(false)
      }
    }

    fetchCourses()
  }, [isBranchAdmin])



  // Branch admins search the displayed course name; other admins keep the broader search.
  const filteredCourses = courses.filter((course) => {
    const searchLower = searchTerm.trim().toLowerCase()
    if (!searchLower) return true
    if (isBranchAdmin) {
      return (course.name || course.title || "").toLowerCase().includes(searchLower)
    }

    return (
      course.title?.toLowerCase().includes(searchLower) ||
      course.id?.toLowerCase().includes(searchLower) ||
      course.description?.toLowerCase().includes(searchLower) ||
      course.difficulty_level?.toLowerCase().includes(searchLower) ||
      course.category?.toLowerCase().includes(searchLower)
    )
  })



  const handleViewClick = (courseId: string) => {
    router.push(`${basePath}/courses/${courseId}`)
  }

  const handleEditClick = (courseId: string) => {
    console.log("Editing course:", courseId)
    router.push(`${basePath}/courses/edit/${courseId}`)
  }

  const handleToggleEnable = async (courseId: string) => {
    if (isBranchAdmin) return
    try {
      const token = TokenManager.getToken()
      if (!token) {
        throw new Error("Authentication token not found. Please login again.")
      }

      const course = courses.find(c => c.id === courseId)
      if (!course) return

      const response = await fetch(getBackendApiUrl(`courses/${courseId}`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          settings: {
            ...course.settings,
            active: !course.settings.active
          }
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || errorData.message || `Failed to update course status (${response.status})`)
      }

      // Update local state
      setCourses((prev) =>
        prev.map((course) =>
          course.id === courseId
            ? { ...course, settings: { ...course.settings, active: !course.settings.active } }
            : course
        )
      )

      console.log("Course status updated successfully",courses)

    } catch (error) {
      console.error("Error updating course status:", error)
      alert(`Error updating course status: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">

      <main className="w-full p-4 lg:px-8 lg:py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-[#4F5077]">Course list</h1>
          {!isBranchAdmin && (
            <Button
              onClick={() => router.push(`${basePath}/create-course`)}
              className="bg-yellow-400 hover:bg-yellow-500 text-white px-6 py-2 rounded-lg font-medium"
            >
              + Add Course
            </Button>
          )}
        </div>

        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black w-4 h-4" />
            <Input
              placeholder={isBranchAdmin ? "Search by course name" : "Search by name, ID, Location"}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-4 px-6 font-semibold text-[#6B7A99] text-base">Course Name:</th>
                    <th className="text-left py-4 px-6 font-semibold text-[#6B7A99] text-base">Course Available in branches</th>
                    <th className="text-left py-4 px-6 font-semibold text-[#6B7A99] text-base">No of coachs assigned</th>
                    <th className="text-left py-4 px-6 font-semibold text-[#6B7A99] text-base">No. of Student choose</th>
                    <th className="text-left py-4 px-6 font-semibold text-[#6B7A99] text-base">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCourses.map((course) => (
                    <tr key={course.id} className={`border-b hover:bg-gray-50 ${!(course.enabled ?? true) ? "opacity-50" : ""}`}>
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center">
                            <span className="text-xl">{course.icon || '📚'}</span>
                          </div>
                          <span className="font-bold text-lg text-black">{course.name || course.title}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-[#6B7A99]">{course.branches || 0} Branches</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-[#6B7A99]">{course.coachs || 0} coachs</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-[#6B7A99]">{course.students || 0} students</span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-2">

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewClick(course.id)}
                            className="p-1 h-8 w-8"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4 text-blue-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClick(course.id)}
                            className="p-1 h-8 w-8"
                            title="Edit Course"
                          >
                            <Edit className="w-4 h-4 text-gray-600" />
                          </Button>
                          {!isBranchAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleEnable(course.id)}
                            className="p-1 h-8 w-8"
                          >
                            {course.settings.active  ? (
                              <ToggleRight className="w-4 h-4 text-yellow-500" />
                            ) : (
                              <ToggleLeft className="w-4 h-4 text-gray-400" />
                            )}
                          </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>



    </div>
  )
}
