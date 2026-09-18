"use client"

import type React from "react"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Checkbox } from "@/components/ui/checkbox"
import { ReCaptchaWrapper, useReCaptcha, ReCaptchaComponent } from "@/components/recaptcha"
import { TokenManager } from "@/lib/tokenManager"
import { safeStudentReturnUrl } from "@/lib/sessionAuth"

// Create a separate component for the login form content
function LoginFormContent() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState("")
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const passwordJustReset = searchParams.get("reset") === "success"
  const sessionExpired = searchParams.get("session") === "expired"
  const returnUrl = searchParams.get("returnUrl")
  const { getToken, resetRecaptcha, isEnabled } = useReCaptcha()

  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  // Redirect to dashboard if already logged in with a valid session
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (sessionExpired) {
        setError("Your session has expired. Please log in again.")
      }

      if (TokenManager.isAuthenticated()) {
        const user = TokenManager.getUser()
        if (user?.role === "student") {
          router.replace(safeStudentReturnUrl(returnUrl))
        }
      } else if (localStorage.getItem("token")) {
        TokenManager.clearAuthData()
      }
    }
  }, [router, returnUrl, sessionExpired]);

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

      const requestBody: any = { 
        email: email.trim(), 
        password,
        role: "student" // Specify role for student login
      };
      if (recaptchaToken) {
        requestBody.recaptchaToken = recaptchaToken;
      }

      // Use same-origin proxy so the browser never talks directly to the backend (avoids connection/CORS issues)
      const loginUrl = "/api/backend/auth/login";
      console.log("Student login request:", { url: loginUrl, body: { ...requestBody, password: "***hidden***" } });

      const res = await fetch(loginUrl, {
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
      console.log("Student login response:", { status: res.status, ok: res.ok, data });

      if (!res.ok) {
        const errMsg = typeof data.detail === "string"
          ? data.detail
          : Array.isArray(data.detail)
            ? data.detail.map((e: any) => e.msg || e.message || JSON.stringify(e)).join(", ")
            : data.detail?.message || data.message || `Login failed (${res.status})`;
        setError(errMsg);
        // Reset reCAPTCHA on error
        if (isEnabled) {
          resetRecaptcha();
        }
        setLoading(false);
        return;
      }

      // Validate response structure according to backend API specification
      if (!data.access_token || !data.user) {
        setError("Invalid response from server");
        if (isEnabled) {
          resetRecaptcha();
        }
        setLoading(false);
        return;
      }

      // Verify student portal access (DB may store role with different casing)
      const roleNorm = String(data.user?.role ?? "student").toLowerCase().replace(/-/g, "_")
      if (roleNorm !== "student") {
        setError("Access denied. Student credentials required.");
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
        user: data.user,
        profiles: data.profiles,
        account_id: data.account_id,
        active_student_id: data.active_student_id || data.user?.id,
      });

      console.log("Student login successful:", {
        user_id: data.user.id,
        full_name: data.user.full_name,
        email: data.user.email,
        role: data.user.role,
        branch_id: data.user.branch_id,
        access_token: data.access_token.substring(0, 20) + "...",
        expires_in: data.expires_in
      });
      
      router.push(safeStudentReturnUrl(returnUrl))
    } catch (err) {
      console.error("Student login error:", err);
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
      <div className="hidden lg:flex lg:w-1/2 bg-white items-center justify-center relative overflow-hidden">
        <div
          className="w-[800px] h-[800px] bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/images/martial-artist.png')",
          }}
        />
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md space-y-6">
          {/* Back to Website */}
          <Link href="/landing.html" className="text-sm text-[#000] hover:text-gray-600 flex items-center space-x-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to website</span>
          </Link>

          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-black">STUDENT LOGIN</h1>
            <p className="text-gray-500 text-[12px]">Access your martial arts training dashboard</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email Field */}
            <div>
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
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value.toLowerCase())
                    if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: '' }))
                  }}
                  className={`pl-14 py-4 text-[14px] bg-[#F0EDFFCC] border-0 rounded-xl h-14 placeholder:text-[#000] ${fieldErrors.email ? '!border !border-red-500' : ''}`}
                />
              </div>
              {fieldErrors.email && <p className="text-red-500 text-xs mt-1 ml-1">{fieldErrors.email}</p>}
            </div>

            {/* Password Field */}
            <div className="space-y-4">
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
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: '' }))
                  }}
                  className={`pl-14 py-4 text-[14px] bg-[#F0EDFFCC] border-0 rounded-xl h-14 placeholder:text-[#000] ${fieldErrors.password ? '!border !border-red-500' : ''}`}
                />
              </div>
              {fieldErrors.password && <p className="text-red-500 text-xs mt-1 ml-1">{fieldErrors.password}</p>}
            </div>

            {passwordJustReset && (
              <div className="text-green-700 text-sm text-center bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                Password reset successfully. Sign in with your new password.
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="text-red-500 text-sm text-center">{error}</div>
            )}

            {/* reCAPTCHA */}
            <ReCaptchaComponent />

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between py-4">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  className="w-5 h-5 border-2 border-gray-300 rounded-sm"
                />
                <label htmlFor="remember" className="text-sm font-medium text-gray-700 cursor-pointer select-none">
                  Remember me
                </label>
              </div>
              <Link 
                href="/forgot-password" 
                className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors duration-200"
              >
                Forgot Password?
              </Link>
            </div>

            {/* Login Button */}
            <Button
              type="submit"
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-[#fff] font-bold py-4 px-6 rounded-xl text-sm h-14 transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  <span>Logging in...</span>
                </div>
              ) : (
                "Login Now"
              )}
            </Button>
          </form>

          {/* Register Link */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="font-semibold text-yellow-500 hover:text-yellow-600">
                Register Now
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <ReCaptchaWrapper>
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading…</div>}>
        <LoginFormContent />
      </Suspense>
    </ReCaptchaWrapper>
  )
}
