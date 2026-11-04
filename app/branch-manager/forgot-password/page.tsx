"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"

export default function BranchManagerForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const { toast } = useToast()

  const validateEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      setError("Email is required")
      return
    }
    if (!validateEmail(email)) {
      setError("Please enter a valid email address")
      return
    }
    setError("")
    setLoading(true)
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/branch-managers/forgot-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim() }),
        }
      )
      if (response.ok) {
        setSuccess(true)
        toast({
          title: "Reset Link Sent",
          description:
            "If a branch manager account exists with this email, you'll receive reset instructions.",
        })
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || "Failed to send reset email")
      }
    } catch {
      setError("Unable to process request. Please try again later.")
      toast({
        title: "Error",
        description: "Unable to send reset email. Please try again later.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-amber-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md text-center space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Check Your Email</h2>
          <p className="text-gray-600">
            If a branch manager account exists with <strong>{email}</strong>, you&apos;ll receive
            password reset instructions shortly.
          </p>
          <Link href="/branch-manager/login">
            <Button className="w-full bg-yellow-500 hover:bg-yellow-600 text-white">
              Back to Branch Manager Login
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-amber-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Reset Branch Manager Password</h1>
          <p className="text-gray-600">Enter your email to receive reset instructions</p>
        </div>
        <form onSubmit={handleResetRequest} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="manager@example.com"
              className="w-full"
              disabled={loading}
            />
          </div>
          {error ? (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          ) : null}
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-white"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </Button>
        </form>
        <div className="mt-6 text-center">
          <Link href="/branch-manager/login" className="text-yellow-700 hover:text-yellow-900 font-medium">
            ← Back to Branch Manager Login
          </Link>
        </div>
      </div>
    </div>
  )
}
