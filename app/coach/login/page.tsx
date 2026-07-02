"use client"

import type React from "react"

import { getBackendApiUrl } from "@/lib/config"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Checkbox } from "@/components/ui/checkbox"
import { User, Lock, Mail } from "lucide-react"
import { ReCaptchaWrapper, useReCaptcha, ReCaptchaComponent } from "@/components/recaptcha"

// Create a separate component for the coach login form content
function CoachLoginFormContent() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState("")
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const router = useRouter();
  const { getToken, resetRecaptcha, isEnabled } = useReCaptcha()

  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  // Redirect to dashboard if already logged in as coach
  useEffect(() => {
    if (typeof window !== "undefined") {
      const sessionExpired = new URLSearchParams(window.location.search).get("session") === "expired"
      if (sessionExpired) {
        setError("Your session has expired. Please log in again.")
      }

      const auth = (async () => {
        const { checkCoachAuth } = await import("@/lib/coachAuth")
        const result = checkCoachAuth()
        if (result.isAuthenticated) {
          router.replace("/coach-dashboard")
        }
      })()
      void auth
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {}
    if (!email.trim()) {
      newErrors.email = "Email is required"
    } else if (!validateEmail(email)) {
      newErrors.email = "Please enter a valid email address"
    }
    if (!password) {
      newErrors.password = "Password is required"
    }
    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors)
      return
    }
    setFieldErrors({})
    setError("");
    setLoading(true);
    
    try {
      let recaptchaToken = null;
      
      // Check reCAPTCHA if enabled
      if (isEnabled) {
        recaptchaToken = getToken();
        if (!recaptchaToken) {
          setError("Please complete the CAPTCHA verification.");
          setLoading(false);
          return;
        }
      }

      // Prepare request body according to your API specification
      const requestBody: any = { 
        email: email.trim(), 
        password
      };
      
      // Add reCAPTCHA token if available
      if (recaptchaToken) {
        requestBody.recaptchaToken = recaptchaToken;
      }

      console.log("Coach login request:", {
        url: getBackendApiUrl('coaches/login'),
        body: { ...requestBody, password: "***hidden***" }
      });

      // Call the coach login API endpoint
      const res = await fetch(getBackendApiUrl('coaches/login'), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      });
      
      const data = await res.json();
      console.log("Coach login response:", data);
      
      if (!res.ok) {
        const errMsg =
          typeof data.detail === "string"
            ? data.detail
            : Array.isArray(data.detail)
              ? data.detail.map((e: { msg?: string }) => e.msg || JSON.stringify(e)).join(", ")
            : data.detail?.message || data.message || `Login failed (${res.status})`
        setError(errMsg)
        if (isEnabled) {
          resetRecaptcha();
        }
        setLoading(false);
        return;
      }

      // Validate response structure according to your API specification
      if (!data.access_token || !data.coach) {
        setError("Invalid response from server");
        if (isEnabled) {
          resetRecaptcha();
        }
        setLoading(false);
        return;
      }

      // Verify that the user is actually a coach
      if (data.coach?.role !== "coach") {
        setError("Access denied. Coach credentials required.");
        if (isEnabled) {
          resetRecaptcha();
        }
        setLoading(false);
        return;
      }

      // Store authentication data using unified token manager
      const { TokenManager } = await import("@/lib/tokenManager");
      const userData = TokenManager.storeAuthData({
        access_token: data.access_token,
        token_type: data.token_type,
        expires_in: data.expires_in,
        coach: data.coach
      });

      // Store comprehensive coach data for coach-specific features
      localStorage.setItem("coach", JSON.stringify(data.coach));
      
      console.log("Coach login successful:", {
        coach_id: data.coach.id,
        full_name: data.coach.full_name,
        email: data.coach.email,
        role: data.coach.role,
        access_token: data.access_token.substring(0, 20) + "...",
        expires_in: data.expires_in
      });
      
      // Redirect to coach dashboard
      router.push("/coach-dashboard");
    } catch (err) {
      console.error("Coach login error:", err);
      setError("An error occurred during login. Please check your connection and try again.");
      if (isEnabled) {
        resetRecaptcha();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Illustration */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30"
          style={{
            backgroundImage: "url('/professional-martial-arts-coach.jpg')",
          }}
        />
        <div className="relative z-10 text-center text-white space-y-6 p-8">
         
          <h1 className="text-4xl font-bold">Coach Portal</h1>
          <p className="text-xl text-yellow-100">
            Manage your classes, students, and training schedules
          </p>
          <div className="space-y-2 text-yellow-200">
            <p>• Track student progress</p>
            <p>• Schedule training sessions</p>
            <p>• Monitor attendance</p>
            <p>• Manage class materials</p>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md space-y-6">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <User className="w-8 h-8 text-yellow-600" />
              <h1 className="text-3xl font-bold text-gray-900">Coach Login</h1>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Access your coaching dashboard and manage your students</p>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium ml-[10px] text-gray-700">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                  <svg className="w-6 h-6 text-[#000]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <Input
                  id="email"
                  type="email"
                  placeholder="coach@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value.toLowerCase())
                    if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: '' }))
                  }}
                  className={`pl-14 py-4 text-base bg-[#F0EDFFCC] border-0 rounded-xl h-14 placeholder:text-gray-500 ${fieldErrors.email ? '!border !border-red-500' : ''}`}
                />
              </div>
              {fieldErrors.email && <p className="text-red-500 text-xs mt-1 ml-1">{fieldErrors.email}</p>}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm ml-[10px] font-medium text-gray-700">
                Password
              </label>
              <div className="relative">
             <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                  <svg className="w-6 h-6 text-[#000]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                <PasswordInput
                  id="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: '' }))
                  }}
                  className={`pl-14 py-4 text-base bg-[#F0EDFFCC] border-0 rounded-xl h-14 placeholder:text-gray-500 ${fieldErrors.password ? '!border !border-red-500' : ''}`}
                />
              </div>
              {fieldErrors.password && <p className="text-red-500 text-xs mt-1 ml-1">{fieldErrors.password}</p>}
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* reCAPTCHA */}
            <ReCaptchaComponent />

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  className="w-4 h-4"
                />
                <label htmlFor="remember" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Remember me
                </label>
              </div>
              <Link 
                href="/coach/forgot-password" 
                className="text-sm font-medium text-yellow-600 hover:text-yellow-800 transition-colors"
              >
                Forgot Password?
              </Link>
            </div>

            {/* Login Button */}
            <Button
              type="submit"
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-[#fff] font-bold py-3 px-6 rounded-lg text-sm h-12 transition-all duration-200 shadow-lg hover:shadow-xl"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  <span>Signing in...</span>
                </div>
              ) : (
                <>
                  
                  Sign In
                </>
              )}
            </Button>
          </form>

          {/* Quick Links 
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-medium text-yellow-800 mb-2">Coach Resources</h3>
            <div className="space-y-1 text-sm text-yellow-700">
              <p>• Access training materials and guidelines</p>
              <p>• View class schedules and student roster</p>
              <p>• Submit progress reports and attendance</p>
            </div>
          </div>*/}

          {/* Navigation Links */}
          {/* Debug Information 
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <h3 className="font-medium text-gray-700 mb-2 text-sm">API Debug Info</h3>
            <div className="space-y-1 text-xs text-gray-600 font-mono">
              <p><strong>POST</strong> /api/coaches/login</p>
              <p><strong>Endpoint:</strong> {typeof window !== 'undefined' ? getBackendApiUrl('coaches/login') : '/api/backend/coaches/login'}</p>
              <p><strong>Expected:</strong> access_token + coach object</p>
              <p><strong>Storage:</strong> access_token, coach, user</p>
            </div>
          </div>*/}

          {/* Current Session Debug 
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <h3 className="font-medium text-blue-700 mb-2 text-sm">Current Session</h3>
            <div className="space-y-1 text-xs text-blue-600 font-mono">
              <p><strong>Access Token:</strong> {typeof window !== "undefined" && localStorage.getItem("access_token") ? "Present" : "Missing"}</p>
              <p><strong>Coach Data:</strong> {typeof window !== "undefined" && localStorage.getItem("coach") ? "Present" : "Missing"}</p>
              <p><strong>Token Expiry:</strong> {typeof window !== "undefined" && localStorage.getItem("token_expiration") ? new Date(parseInt(localStorage.getItem("token_expiration") || "0")).toLocaleString() : "None"}</p>
            </div>
          </div>*/}

          {/* Back to Main Site */}
          <div className="text-center">
            <Link 
              href="/" 
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              ← Back to main website
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CoachLoginPage() {
  return (
    <ReCaptchaWrapper>
      <CoachLoginFormContent />
    </ReCaptchaWrapper>
  )
}
