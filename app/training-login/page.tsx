"use client"

import React, { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Eye, EyeOff, Loader2, Lock, Mail, ArrowRight, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { trainingRequestAPI } from "@/lib/trainingRequestAPI"
import { TokenManager } from "@/lib/tokenManager"

function TrainingLoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // If already logged in, check role and redirect
    if (TokenManager.isAuthenticated()) {
      const user = TokenManager.getUser()
      if (user?.role === "training_student" || user?.role === "student") {
        router.replace("/training-dashboard")
      }
    }
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email.trim()) {
      setError("Please enter your email or registered phone number")
      return
    }
    if (!password) {
      setError("Please enter your password")
      return
    }

    setLoading(true)
    try {
      const data = await trainingRequestAPI.trainingLogin(email.trim(), password)
      TokenManager.storeAuthData({
        access_token: data.access_token,
        token_type: data.token_type,
        user: {
          id: data.user.id,
          full_name: data.user.full_name || `${data.user.first_name || ""} ${data.user.last_name || ""}`.trim() || "Student",
          email: data.user.email,
          role: data.user.role || "training_student",
          phone: data.user.phone,
        },
      })
      router.push("/training-dashboard")
    } catch (err: any) {
      setError(err?.message || "Invalid credentials. Please verify your email and password.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md bg-card/90 backdrop-blur-md rounded-2xl shadow-2xl border border-border/60 p-8 space-y-6">
      {/* Brand & Heading */}
      <div className="text-center space-y-2">
        <Link href="/" className="inline-block transition-transform hover:scale-105">
          <Image
            src="/images/logo.png"
            alt="Rock Martial Arts"
            width={120}
            height={50}
            className="h-12 w-auto mx-auto object-contain"
            priority
          />
        </Link>
        <div className="space-y-1 pt-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Training Portal Login
          </h1>
          <p className="text-xs text-muted-foreground">
            Sign in to track your training requests, view assigned coaches, and submit new requests.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-600 font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email or Phone */}
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-sm font-medium text-foreground">
            Email or Registered Phone
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="text"
              placeholder="name@example.com or 9876543210"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-9 border-input bg-background/50 focus-visible:ring-[#FFB70F]"
              disabled={loading}
              autoComplete="username"
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm font-medium text-foreground">
              Password
            </Label>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-9 pr-10 border-input bg-background/50 focus-visible:ring-[#FFB70F]"
              disabled={loading}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-[#FFB70F] hover:bg-[#E5A40E] text-black font-semibold text-sm h-11 shadow-md hover:shadow-lg transition-all gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Signing In...</span>
            </>
          ) : (
            <>
              <span>Sign In to Dashboard</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </form>

      {/* Helpful Links */}
      <div className="pt-2 border-t border-border/40 text-center space-y-2">
        <p className="text-xs text-muted-foreground">
          Need to submit a training request first?{" "}
          <Link
            href="/corporate-training"
            className="text-[#B87D00] hover:text-[#946400] font-medium hover:underline"
          >
            Explore Programs
          </Link>
        </p>
        <Link
          href="/"
          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          ← Return to Website
        </Link>
      </div>
    </div>
  )
}

export default function TrainingLoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/30 to-background flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-[#FFB70F]/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full bg-[#FFB70F]/10 blur-3xl pointer-events-none" />

      <Suspense
        fallback={
          <div className="p-8 bg-card rounded-2xl shadow-xl flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-[#FFB70F]" />
            <span className="text-sm font-medium">Loading training portal...</span>
          </div>
        }
      >
        <TrainingLoginForm />
      </Suspense>
    </div>
  )
}

