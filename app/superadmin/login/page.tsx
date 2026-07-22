"use client"

import type React from "react"
import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Checkbox } from "@/components/ui/checkbox"
import { Shield, Lock, Mail } from "lucide-react"
import { ReCaptchaWrapper, useReCaptcha, ReCaptchaComponent } from "@/components/recaptcha"
import { SuperAdminAuth, type SuperAdminLoginResponse } from "@/lib/auth"

// Create a separate component for the superadmin login form content
function SuperAdminLoginFormContent() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState("")
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const router = useRouter();
  const searchParams = useSearchParams()
  const sessionExpired = searchParams.get("session") === "expired"
  const { getToken, resetRecaptcha, isEnabled } = useReCaptcha()

  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  // Redirect to dashboard if already logged in as superadmin
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (sessionExpired) {
        setError("Your session has expired. Please log in again.")
      }
      if (SuperAdminAuth.isAuthenticated()) {
        router.replace("/super-admin/dashboard");
      } else if (localStorage.getItem("token")) {
        SuperAdminAuth.clearAuthData()
      }
    }
  }, [router, sessionExpired]);

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

      // Prepare request body according to API specification
      const requestBody: any = { 
        email: email.trim(), 
        password
      };
      
      // Add reCAPTCHA token if available
      if (recaptchaToken) {
        requestBody.recaptchaToken = recaptchaToken;
      }

      // Use same-origin proxy so the browser never talks directly to the backend
      const res = await fetch("/api/backend/superadmin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      });

      let response: any;
      try {
        response = await res.json();
      } catch {
        setError("Server returned an invalid response. Is the backend running?");
        if (isEnabled) resetRecaptcha();
        setLoading(false);
        return;
      }
      console.log("Superadmin login response:", response);

      if (!res.ok) {
        setError(response.detail || response.message || `Login failed (${res.status})`);
        if (isEnabled) {
          resetRecaptcha();
        }
        setLoading(false);
        return;
      }

      // Validate response structure according to actual backend API specification
      if (response.status !== "success" || !response.data) {
        setError("Invalid response from server");
        if (isEnabled) {
          resetRecaptcha();
        }
        setLoading(false);
        return;
      }

      const { data } = response;

      // Validate required fields in the nested data object
      if (!data.token || !data.id || !data.full_name || !data.email) {
        setError("Incomplete response from server");
        if (isEnabled) {
          resetRecaptcha();
        }
        setLoading(false);
        return;
      }

      // Store authentication data using unified token manager
      const { TokenManager } = await import("@/lib/tokenManager");

      // Create admin object from the response data
      const adminData = {
        id: data.id,
        full_name: data.full_name,
        email: data.email,
        phone: data.phone,
        role: "superadmin" // Set role explicitly since it's not in the response
      };

      const userData = TokenManager.storeAuthData({
        access_token: data.token,
        token_type: data.token_type,
        expires_in: data.expires_in,
        admin: adminData
      });

      console.log("Superadmin login successful:", {
        admin_id: data.id,
        full_name: data.full_name,
        email: data.email,
        phone: data.phone,
        role: "superadmin",
        access_token: data.token.substring(0, 20) + "...",
        expires_in: data.expires_in
      });
      
      // Redirect to admin dashboard
      router.replace("/super-admin/dashboard");
    } catch (err) {
      console.error("SuperAdmin login error:", err);
      const msg = err instanceof Error ? err.message : String(err);
      const isNetwork = /fetch|network|failed to load/i.test(msg) || msg === "Load failed";
      setError(
        isNetwork
          ? "Cannot reach the server. Make sure the backend is running (see terminal)."
          : "An error occurred during login. Please try again."
      );
      if (isEnabled) resetRecaptcha();
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
         
          <h1 className="text-4xl font-bold">Super Admin Portal</h1>
          <p className="text-xl text-yellow-100">
            Secure access to administrative controls and system management
          </p>
          <div className="space-y-2 text-yellow-200">
            <p>• Complete system oversight</p>
            <p>• User management & control</p>
            <p>• Advanced security features</p>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md space-y-6">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <Shield className="w-8 h-8 text-yellow-600" />
              <h1 className="text-3xl font-bold text-gray-900">Super Admin</h1>
            </div>
            <div>
              
              <p className="text-gray-500 text-sm">Access administrative dashboard with elevated privileges</p>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium ml-[10px] text-gray-700">
                Super Admin Email *
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
                  placeholder="superadmin@example.com"
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
                Admin Password *
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
                  placeholder="StrongPassword@123"
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
                  Keep me signed in
                </label>
              </div>
              <Link 
                href="/superadmin/forgot-password" 
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

          {/* Quick 
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-medium text-yellow-800 mb-2">Admin Resources</h3>
            <div className="space-y-1 text-sm text-yellow-700">
              <p>• Manage system users and permissions</p>
              <p>• Monitor system performance and security</p>
              <p>• Access comprehensive admin tools</p>
            </div>
          </div>Links */}

          {/* API Information
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-800 mb-2">API Endpoint</h3>
            <div className="space-y-1 text-xs text-gray-600 font-mono">
              <p><strong>POST</strong> /api/superadmin/login</p>
              <p>Response: JWT token (24-hour expiry)</p>
              <p>Required: email, password</p>
            </div>
          </div> */}

          {/* Navigation Links */}
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

export default function SuperAdminLoginPage() {
  return (
    <ReCaptchaWrapper>
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading…</div>}>
        <SuperAdminLoginFormContent />
      </Suspense>
    </ReCaptchaWrapper>
  )
}
