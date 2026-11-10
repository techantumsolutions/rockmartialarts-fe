"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function TestCoachFlow() {
  const [status, setStatus] = useState('Starting test...')
  const [logs, setLogs] = useState<string[]>([])
  const router = useRouter()

  const addLog = (message: string) => {
    console.log(message)
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  useEffect(() => {
    const testFlow = async () => {
      try {
        addLog('🧪 Starting coach authentication flow test')
        
        // Clear any existing auth data
        localStorage.clear()
        addLog('🧹 Cleared localStorage')
        
        // Step 1: Test coach login
        setStatus('Testing coach login...')
        addLog('🔐 Attempting coach login...')
        
        const loginResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/coaches/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'pittisunilkumar3@gmail.com',
            password: 'Neelarani@10'
          })
        })
        
        if (!loginResponse.ok) {
          throw new Error(`Login failed: ${loginResponse.status} - ${await loginResponse.text()}`)
        }
        
        const loginData = await loginResponse.json()
        addLog('✅ Coach login successful')
        addLog(`👤 Coach: ${loginData.coach.full_name}`)
        addLog(`🎫 Token: ${loginData.access_token.substring(0, 50)}...`)
        
        // Step 2: Store auth data like the login page does
        setStatus('Storing authentication data...')
        addLog('💾 Storing authentication data...')
        
        const { TokenManager } = await import("@/lib/tokenManager");
        TokenManager.storeAuthData({
          access_token: loginData.access_token,
          token_type: loginData.token_type,
          expires_in: loginData.expires_in,
          coach: loginData.coach
        });
        localStorage.setItem("coach", JSON.stringify(loginData.coach));
        
        addLog('✅ Authentication data stored')
        
        // Step 3: Test checkCoachAuth function
        setStatus('Testing authentication check...')
        addLog('🔍 Testing checkCoachAuth function...')
        
        const { checkCoachAuth } = await import('@/lib/coachAuth')
        const authResult = checkCoachAuth()
        
        addLog(`🔍 Auth result: ${JSON.stringify({
          isAuthenticated: authResult.isAuthenticated,
          hasCoach: !!authResult.coach,
          hasToken: !!authResult.token,
          error: authResult.error
        })}`)
        
        if (authResult.isAuthenticated && authResult.coach) {
          addLog('✅ Authentication check passed')
          
          // Step 4: Redirect to create student page
          setStatus('Redirecting to create student page...')
          addLog('🔄 Redirecting to create student page in 3 seconds...')
          
          setTimeout(() => {
            router.push('/coach-dashboard/students/create')
          }, 3000)
        } else {
          addLog('❌ Authentication check failed')
          setStatus('Authentication check failed')
        }
        
      } catch (error) {
        addLog(`💥 Error: ${error.message}`)
        setStatus(`Error: ${error.message}`)
      }
    }

    testFlow()
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Coach Authentication Flow Test</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Current Status</h2>
          <p className="text-lg font-medium text-blue-600">{status}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Test Logs</h2>
          <div className="bg-gray-100 p-4 rounded max-h-96 overflow-y-auto">
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
            Restart Test
          </button>
          <a
            href="/coach/login"
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 inline-block"
          >
            Go to Coach Login
          </a>
          <a
            href="/debug-coach-auth"
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 inline-block"
          >
            Debug Auth
          </a>
        </div>
      </div>
    </div>
  )
}
