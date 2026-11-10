"use client"

import { useEffect, useState } from 'react'
import { checkCoachAuth } from '@/lib/coachAuth'

export default function DebugCoachAuth() {
  const [authResult, setAuthResult] = useState<any>(null)
  const [localStorageData, setLocalStorageData] = useState<any>({})

  useEffect(() => {
    // Check authentication
    const result = checkCoachAuth()
    setAuthResult(result)

    // Get all localStorage data
    const storageData: any = {}
    if (typeof window !== 'undefined') {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key) {
          try {
            const value = localStorage.getItem(key)
            storageData[key] = value ? JSON.parse(value) : value
          } catch {
            storageData[key] = localStorage.getItem(key)
          }
        }
      }
    }
    setLocalStorageData(storageData)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Coach Authentication Debug</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Authentication Result */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Authentication Result</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(authResult, null, 2)}
            </pre>
          </div>

          {/* LocalStorage Data */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">LocalStorage Data</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(localStorageData, null, 2)}
            </pre>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="flex gap-4 flex-wrap">
            <button
              onClick={() => {
                localStorage.clear()
                window.location.reload()
              }}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Clear LocalStorage
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:"
            >
              Refresh
            </button>
            <a
              href="/coach/login"
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 inline-block"
            >
              Go to Coach Login
            </a>
            <a
              href="/coach-dashboard/students/create"
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 inline-block"
            >
              Test Create Student Page
            </a>
            <button
              onClick={async () => {
                // Test coach login programmatically with your credentials
                try {
                  const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/coaches/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      email: 'pittisunilkumar3@gmail.com',
                      password: 'Neelarani@10'
                    })
                  })
                  const data = await response.json()
                  console.log('Login test result:', data)
                  if (data.access_token) {
                    // Store the data like the login page does
                    const { TokenManager } = await import("@/lib/tokenManager");
                    TokenManager.storeAuthData({
                      access_token: data.access_token,
                      token_type: data.token_type,
                      expires_in: data.expires_in,
                      coach: data.coach
                    });
                    localStorage.setItem("coach", JSON.stringify(data.coach));
                    alert('Login successful! Check the authentication result above.')
                    window.location.reload()
                  } else {
                    alert('Login failed: ' + JSON.stringify(data))
                  }
                } catch (error) {
                  console.error('Login test failed:', error)
                  alert('Login test failed: ' + error.message)
                }
              }}
              className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
            >
              Test Login (Your Credentials)
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
