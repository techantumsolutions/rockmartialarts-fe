"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import BranchSelectionField from "@/components/layout/BranchSelectionField"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter } from "next/navigation"
import { useDashboardBasePath } from "@/lib/useDashboardBasePath"
import { getActiveBranchId, useActiveBranch } from "@/lib/activeBranch"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/AuthContext"
import { TokenManager } from "@/lib/tokenManager"
import { ArrowLeft, Users, BookOpen, MapPin, Calendar } from "lucide-react"

interface Student {
  id: string
  full_name: string
  email: string
  phone: string
  is_active: boolean
}

interface Course {
  id: string
  title: string
  code: string
  difficulty_level: string
  pricing: {
    currency: string
    amount: number
  }
}

interface Branch {
  id: string
  branch: {
    name: string
    code: string
  }
}

interface Duration {
  id: string
  name: string
  duration_months: number
  pricing_multiplier: number
}

export default function CourseAssignmentPage() {
  const router = useRouter()
  const basePath = useDashboardBasePath()
  const isBranchAdmin = basePath.startsWith("/branch-admin")
  const { active: activeBranch } = useActiveBranch()
  const { toast } = useToast()
  const { user } = useAuth()

  // State
  const [students, setStudents] = useState<Student[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [durations, setDurations] = useState<Duration[]>([])
  
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [formData, setFormData] = useState({
    student_id: "",
    course_id: "",
    branch_id: "",
    duration_id: "",
    start_date: "",
    notes: ""
  })

  useEffect(() => {
    if (isBranchAdmin && activeBranch?.id) {
      setFormData((current) =>
        current.branch_id === activeBranch.id
          ? current
          : { ...current, branch_id: activeBranch.id }
      )
    }
  }, [activeBranch, isBranchAdmin])

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        const token = TokenManager.getToken()
        
        if (!token) {
          toast({
            title: "Authentication Error",
            description: "Please login to continue.",
            variant: "destructive"
          })
          return
        }

        // Fetch students, courses, and branches in parallel
        const [studentsRes, coursesRes, branchesRes] = await Promise.all([
          fetch('/api/backend/users/students/details', {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch('/api/backend/courses/public/all'),
          fetch('/api/backend/branches', {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ])

        if (studentsRes.ok) {
          const studentsData = await studentsRes.json()
          setStudents(studentsData.students || [])
        }

        if (coursesRes.ok) {
          const coursesData = await coursesRes.json()
          setCourses(coursesData.courses || [])
        }

        if (branchesRes.ok) {
          const branchesData = await branchesRes.json()
          setBranches(branchesData.branches || [])
        }

      } catch (error) {
        console.error('Error fetching data:', error)
        toast({
          title: "Error",
          description: "Failed to load data. Please try again.",
          variant: "destructive"
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  // Fetch durations when course is selected
  useEffect(() => {
    const fetchDurations = async () => {
      if (!formData.course_id) {
        setDurations([])
        return
      }

      try {
        const response = await fetch(`/api/backend/durations/public/by-course/${formData.course_id}`)
        if (response.ok) {
          const data = await response.json()
          setDurations(data.durations || [])
        }
      } catch (error) {
        console.error('Error fetching durations:', error)
      }
    }

    fetchDurations()
  }, [formData.course_id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.student_id || !formData.course_id || !formData.branch_id || !formData.duration_id) {
      toast({
        title: "Incomplete Form",
        description: "Please fill in all required fields.",
        variant: "destructive"
      })
      return
    }

    try {
      setIsSubmitting(true)
      const token = TokenManager.getToken()

      const enrollmentData = {
        student_id: formData.student_id,
        course_id: formData.course_id,
        branch_id: isBranchAdmin ? getActiveBranchId() || formData.branch_id : formData.branch_id,
        duration_id: formData.duration_id,
        start_date: formData.start_date || new Date().toISOString().split('T')[0],
        notes: formData.notes
      }

      const response = await fetch('/api/backend/enrollments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(enrollmentData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to create enrollment')
      }

      const result = await response.json()
      
      toast({
        title: "Success!",
        description: `Student successfully enrolled in course.`,
      })

      // Reset form
      setFormData({
        student_id: "",
        course_id: "",
        branch_id: "",
        duration_id: "",
        start_date: "",
        notes: ""
      })

    } catch (error: any) {
      console.error('Error creating enrollment:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to enroll student. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="w-full p-4 lg:px-8">
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      
      <main className="w-full p-4 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Assign Course to Student</h1>
            <p className="text-gray-600 mt-1">Enroll students in courses at specific branches</p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push(`${basePath}/courses`)}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Courses</span>
          </Button>
        </div>

        {/* Assignment Form */}
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-500" />
              <span>Course Assignment Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Student Selection */}
                <div className="space-y-2">
                  <Label htmlFor="student">Student *</Label>
                  <Select
                    value={formData.student_id}
                    onValueChange={(value) => setFormData({ ...formData, student_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a student" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{student.full_name}</span>
                            <span className="text-xs text-gray-500">{student.email}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Course Selection */}
                <div className="space-y-2">
                  <Label htmlFor="course">Course *</Label>
                  <Select
                    value={formData.course_id}
                    onValueChange={(value) => setFormData({ ...formData, course_id: value, duration_id: "" })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{course.title}</span>
                            <span className="text-xs text-gray-500">
                              {course.code} • {course.difficulty_level} • {course.pricing.currency} {course.pricing.amount}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Branch Selection */}
                <div className="space-y-2">
                  <Label htmlFor="branch">Branch *</Label>
                  {isBranchAdmin ? (
                    <BranchSelectionField readOnly className="h-10" />
                  ) : (
                    <Select
                      value={formData.branch_id}
                      onValueChange={(value) => setFormData({ ...formData, branch_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a branch" />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.map((branch) => (
                          <SelectItem key={branch.id} value={branch.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{branch.branch.name}</span>
                              <span className="text-xs text-gray-500">{branch.branch.code}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Duration Selection */}
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration *</Label>
                  <Select
                    value={formData.duration_id}
                    onValueChange={(value) => setFormData({ ...formData, duration_id: value })}
                    disabled={!formData.course_id}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={!formData.course_id ? "Select a course first" : "Select duration"} />
                    </SelectTrigger>
                    <SelectContent>
                      {durations.map((duration) => (
                        <SelectItem key={duration.id} value={duration.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{duration.name}</span>
                            <span className="text-xs text-gray-500">
                              {duration.duration_months} months • {duration.pricing_multiplier}x pricing
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Start Date */}
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any additional notes about this enrollment..."
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`${basePath}/courses`)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center space-x-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                      <span>Enrolling...</span>
                    </>
                  ) : (
                    <>
                      <Users className="w-4 h-4" />
                      <span>Enroll Student</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
