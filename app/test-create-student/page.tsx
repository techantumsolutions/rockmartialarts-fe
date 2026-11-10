"use client"

import { useState, useEffect } from 'react'

export default function TestCreateStudent() {
  const [isLoading, setIsLoading] = useState(true)
  const [locations, setLocations] = useState([])
  const [courses, setCourses] = useState([])
  const [categories, setCategories] = useState([])
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    console.log(message)
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  useEffect(() => {
    const loadData = async () => {
      addLog('🚀 Starting data loading test...')
      setIsLoading(true)

      try {
        // Test locations API
        addLog('📍 Loading locations...')
        const locationsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/locations/public/details?active_only=true`)
        addLog(`📍 Locations response: ${locationsResponse.status}`)
        
        if (locationsResponse.ok) {
          const locationsData = await locationsResponse.json()
          setLocations(locationsData.locations || [])
          addLog(`✅ Locations loaded: ${locationsData.locations?.length || 0}`)
        } else {
          addLog(`❌ Locations failed: ${locationsResponse.status}`)
        }

        // Test courses API
        addLog('📚 Loading courses...')
        const coursesResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/courses/public/all`)
        addLog(`📚 Courses response: ${coursesResponse.status}`)
        
        if (coursesResponse.ok) {
          const coursesData = await coursesResponse.json()
          setCourses(coursesData.courses || [])
          addLog(`✅ Courses loaded: ${coursesData.courses?.length || 0}`)
        } else {
          addLog(`❌ Courses failed: ${coursesResponse.status}`)
        }

        // Test categories API
        addLog('🏷️ Loading categories...')
        const categoriesResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/courses/public/categories`)
        addLog(`🏷️ Categories response: ${categoriesResponse.status}`)
        
        if (categoriesResponse.ok) {
          const categoriesData = await categoriesResponse.json()
          setCategories(categoriesData.categories || [])
          addLog(`✅ Categories loaded: ${categoriesData.categories?.length || 0}`)
        } else {
          addLog(`❌ Categories failed: ${categoriesResponse.status}`)
        }

      } catch (error) {
        addLog(`💥 Error: ${error.message}`)
      } finally {
        addLog('✅ Data loading completed')
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-sm border p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading test data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Create Student Data Loading Test</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Locations ({locations.length})</h2>
            <div className="max-h-40 overflow-y-auto">
              {locations.map((location: any, index) => (
                <div key={index} className="text-sm mb-1">
                  {location.name || location.state || JSON.stringify(location)}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Courses ({courses.length})</h2>
            <div className="max-h-40 overflow-y-auto">
              {courses.map((course: any, index) => (
                <div key={index} className="text-sm mb-1">
                  {course.title || course.name || JSON.stringify(course)}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Categories ({categories.length})</h2>
            <div className="max-h-40 overflow-y-auto">
              {categories.map((category: any, index) => (
                <div key={index} className="text-sm mb-1">
                  {category.name || JSON.stringify(category)}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Loading Logs</h2>
          <div className="bg-gray-100 p-4 rounded max-h-60 overflow-y-auto">
            {logs.map((log, index) => (
              <div key={index} className="text-sm font-mono mb-1">
                {log}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex gap-4">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:"
          >
            Reload Test
          </button>
          <a
            href="/coach-dashboard/students/create"
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 inline-block"
          >
            Go to Create Student Page
          </a>
        </div>
      </div>
    </div>
  )
}
