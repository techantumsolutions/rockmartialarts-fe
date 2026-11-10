"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

export default function TestCoursesPage() {
  const router = useRouter()
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>({})

  useEffect(() => {
    const testFlow = async () => {
      try {
        console.log("🧪 Starting test flow...")
        
        // Check if user is logged in
        const token = localStorage.getItem("token")
        const user = localStorage.getItem("user")
        
        if (!token) {
          setError("No token found - please login first")
          setLoading(false)
          return
        }
        
        if (!user) {
          setError("No user data found - please login first")
          setLoading(false)
          return
        }
        
        const userData = JSON.parse(user)
        console.log("User data:", userData)
        
        setDebugInfo(prev => ({ ...prev, userData, token: token.substring(0, 20) + "..." }))
        
        // Test API call
        console.log("Testing API call...")
        const response = await fetch('/api/student-courses', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        
        console.log("API response status:", response.status)
        setDebugInfo(prev => ({ ...prev, apiStatus: response.status }))
        
        if (!response.ok) {
          throw new Error(`API failed: ${response.status}`)
        }
        
        const data = await response.json()
        console.log("API response data:", data)
        
        const enrolledCourses = data.enrolled_courses || []
        console.log("Enrolled courses:", enrolledCourses)
        
        setDebugInfo(prev => ({ ...prev, rawCourses: enrolledCourses }))
        
        // Transform data
        const transformedCourses = enrolledCourses.map((item: any) => {
          const enrollment = item.enrollment
          const course = item.course
          
          return {
            id: course.id,
            title: course.title || course.name || "Untitled Course",
            instructor: course.instructor || "TBA",
            level: course.difficulty_level || "Beginner",
            status: enrollment.is_active ? "active" : "completed",
            location: enrollment.branch_details?.name || "TBA",
            duration: `${course.duration_months || 3} months`,
            description: course.description || "No description"
          }
        })
        
        console.log("Transformed courses:", transformedCourses)
        setDebugInfo(prev => ({ ...prev, transformedCourses }))
        
        setCourses(transformedCourses)
        setLoading(false)
        
      } catch (error) {
        console.error("Test flow error:", error)
        setError(error instanceof Error ? error.message : "Unknown error")
        setDebugInfo(prev => ({ ...prev, error: error instanceof Error ? error.message : "Unknown error" }))
        setLoading(false)
      }
    }
    
    testFlow()
  }, [])

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Test Courses Page</h1>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test Courses Page</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {error}
        </div>
      )}
      
      <div className="bg-gray-100 p-4 rounded mb-4">
        <h2 className="font-bold mb-2">Debug Info:</h2>
        <pre className="text-sm overflow-auto">
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      </div>
      
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">Courses ({courses.length})</h2>
        
        {courses.length === 0 ? (
          <p className="text-gray-600">No courses found</p>
        ) : (
          <div className="space-y-4">
            {courses.map((course, index) => (
              <div key={course.id || index} className="border p-4 rounded">
                <h3 className="font-bold">{course.title}</h3>
                <p><strong>Instructor:</strong> {course.instructor}</p>
                <p><strong>Level:</strong> {course.level}</p>
                <p><strong>Status:</strong> {course.status}</p>
                <p><strong>Location:</strong> {course.location}</p>
                <p><strong>Duration:</strong> {course.duration}</p>
                <p><strong>Description:</strong> {course.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="space-x-2">
        <button 
          onClick={() => router.push('/student-dashboard/courses')}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:"
        >
          Go to Real Courses Page
        </button>
        <button 
          onClick={() => router.push('/login')}
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          Go to Login
        </button>
      </div>
    </div>
  )
}
