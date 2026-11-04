"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { PasswordInput } from "@/components/ui/password-input"
import { useToast } from "@/hooks/use-toast"

export default function BranchManagerResetPasswordForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()
  const [token, setToken] = useState<string | null>(null)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    const tokenFromUrl = searchParams.get("token")
    if (tokenFromUrl) {
      setToken(tokenFromUrl)
    } else {
      setError("No reset token found. Please check your reset link.")
    }
  }, [searchParams])

  const validatePassword = (value: string) => {
    if (value.length < 8) return "Password must be at least 8 characters long"
    if (!/[A-Z]/.test(value)) return "Password must contain at least one uppercase letter"
    if (!/[a-z]/.test(value)) return "Password must contain at least one lowercase letter"
    if (!/\d/.test(value)) return "Password must contain at least one number"
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
      return "Password must contain at least one special character"
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    const passwordError = validatePassword(password)
    if (passwordError) {
      setError(passwordError)
      return
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }
    if (!token) {
      setError("Reset token is missing.")
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/branch-managers/reset-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, new_password: password }),
        }
      )
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.detail || "Failed to reset password.")
      }
      setSuccess(data.message || "Password has been set successfully.")
      toast({
        title: "Success",
        description: "Password set successfully. You can now log in.",
      })
      setTimeout(() => {
        const partnerSlug =
          typeof window !== "undefined" ? localStorage.getItem("partner_slug") : null
        router.push(
          partnerSlug
            ? `/partners/${partnerSlug}/branch-manager/login`
            : "/branch-manager/login"
        )
      }, 2000)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to reset password."
      setError(message)
      toast({ title: "Error", description: message, variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">
            Set Your Branch Manager Password
          </CardTitle>
          <CardDescription className="text-gray-600">
            Create a secure password for your branch manager account
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <PasswordInput
                id="confirm-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </div>
            {error ? (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            ) : null}
            {success ? (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-green-600 text-sm">{success}</p>
                <p className="text-green-600 text-xs mt-1">Redirecting to login...</p>
              </div>
            ) : null}
          </CardContent>
          <CardFooter className="flex flex-col space-y-3">
            <Button
              type="submit"
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-white"
              disabled={isLoading || !token || !!success}
            >
              {isLoading ? "Setting Password..." : success ? "Password Set Successfully" : "Set Password"}
            </Button>
            <div className="text-center">
              <Link href="/branch-manager/login" className="text-sm text-gray-600 hover:text-yellow-700">
                Back to Branch Manager Login
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
