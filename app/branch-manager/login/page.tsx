"use client"

import type React from "react"
import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Checkbox } from "@/components/ui/checkbox"
import { Building2, Lock, Mail } from "lucide-react"
import { ReCaptchaWrapper, useReCaptcha, ReCaptchaComponent } from "@/components/recaptcha"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"
import { TokenManager } from "@/lib/tokenManager"

// Create a separate component for the branch manager login form content
function BranchManagerLoginFormContent() {
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

  // Redirect to dashboard if already logged in as branch manager (same screens as super admin)
  useEffect(() => {
    if (sessionExpired) {
      setError("Your session has expired. Please log in again.")
    }
    if (BranchManagerAuth.isAuthenticated()) {
      router.replace("/branch-admin/dashboard");
    } else if (localStorage.getItem("token") || localStorage.getItem("access_token")) {
      BranchManagerAuth.clearAuthData()
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

      console.log("Branch Manager login request:", {
        url: `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/branch-managers/login`,
        body: { ...requestBody, password: "***hidden***" }
      });

      // Use same-origin proxy so the browser never talks directly to the backend
      const res = await fetch("/api/backend/branch-managers/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      });

      let data: any;
      try {
        data = await res.json();
      } catch {
        setError("Server returned an invalid response. Is the backend running?");
        if (isEnabled) resetRecaptcha();
        setLoading(false);
        return;
      }
      console.log("Branch Manager login response:", data);

      if (!res.ok) {
        setError(data.detail || data.message || `Login failed (${res.status})`);
        if (isEnabled) {
          resetRecaptcha();
        }
        setLoading(false);
        return;
      }

      // Validate response structure according to API specification
      if (!data.access_token || !data.branch_manager) {
        setError("Invalid response from server");
        if (isEnabled) {
          resetRecaptcha();
        }
        setLoading(false);
        return;
      }

      // Store authentication data using BranchManagerAuth (primary for branch-admin)
      const userData = BranchManagerAuth.storeLoginData(data);
      // Also sync to TokenManager so /branch-admin/dashboard/* pages that use TokenManager get the same token
      TokenManager.storeAuthData({
        access_token: data.access_token,
        token_type: data.token_type || "bearer",
        expires_in: data.expires_in ?? 86400,
        user: {
          id: userData.id,
          full_name: userData.full_name,
          email: userData.email,
          role: "branch_manager",
          ...userData
        }
      });

      console.log("Branch Manager login successful:", {
        manager_id: userData.id,
        full_name: userData.full_name,
        email: userData.email,
        branch_id: userData.branch_id,
        role: "branch_manager",
        access_token: data.access_token.substring(0, 20) + "...",
        expires_in: data.expires_in
      });

      // Redirect to dashboard (same screens as super admin)
      router.replace("/branch-admin/dashboard");
    } catch (err) {
      console.error("Branch Manager login error:", err);
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
         
          <h1 className="text-4xl font-bold">Branch Manager Portal</h1>
          <p className="text-xl text-yellow-100">
            Manage your branch operations and oversee local activities
          </p>
          <div className="space-y-2 text-yellow-200">
            <p>• Branch-specific management</p>
            <p>• Local staff oversight</p>
            <p>• Operational control</p>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md space-y-6">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <Building2 className="w-8 h-8 text-yellow-600" />
              <h1 className="text-3xl font-bold text-gray-900">Branch Manager</h1>
            </div>
            <div>
              
              <p className="text-gray-500 text-sm">Access branch management dashboard</p>
            </div>
          </div>

          {/* Login Info 
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-800 mb-2 text-sm">Branch Manager Login</h3>
            <div className="space-y-1 text-xs text-blue-700">
              <p>Use your branch manager credentials provided by the administrator.</p>
              <p>If you don't have credentials, contact your system administrator.</p>
            </div>
          </div>*/}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium ml-[10px] text-gray-700">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-[#000]" />
                </div>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  className={`pl-14 py-4 text-base bg-[#F0EDFFCC] border-0 rounded-xl h-14 placeholder:text-gray-500 ${fieldErrors.email ? '!border !border-red-500' : ''}`}
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value.toLowerCase())
                    if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: '' }))
                  }}
                />
              </div>
              {fieldErrors.email && <p className="text-red-500 text-xs mt-1 ml-1">{fieldErrors.email}</p>}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium ml-[10px] text-gray-700">
                password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-[#000]" />
                </div>
                <PasswordInput
                  id="password"
                  name="password"
                  autoComplete="current-password"
                  className={`pl-14 py-4 text-base bg-[#F0EDFFCC] border-0 rounded-xl h-14 placeholder:text-gray-500 ${fieldErrors.password ? '!border !border-red-500' : ''}`}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: '' }))
                  }}
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
                href="/branch-manager/forgot-password" 
                className="text-sm font-medium text-yellow-600 hover:text-yellow-800 transition-colors"
              >
                Forgot Password?
              </Link>
            </div>

            {/* Login Button */}
            <Button
              type="submit"
              disabled={loading}
             className="w-full bg-yellow-400 hover:bg-yellow-500 text-[#fff] font-bold py-3 px-6 rounded-lg text-sm h-12 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Signing in...</span>
                </div>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

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

export default function BranchManagerLoginPage() {
  return (
    <ReCaptchaWrapper>
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading…</div>}>
        <BranchManagerLoginFormContent />
      </Suspense>
    </ReCaptchaWrapper>
  )
}
