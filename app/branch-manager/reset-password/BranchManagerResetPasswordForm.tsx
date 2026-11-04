'use client'

import { getBackendApiUrl } from "@/lib/config"
import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { PasswordInput } from "@/components/ui/password-input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Building2, Lock } from "lucide-react"
import Link from 'next/link'

function BranchManagerResetPasswordForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()
  const [token, setToken] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    const tokenFromUrl = searchParams.get('token')
    if (tokenFromUrl) {
      setToken(tokenFromUrl)
    } else {
      setError("No reset token found in the URL. Please verify your email link.")
      toast({
        title: "Missing Token",
        description: "No reset token found in the URL.",
        variant: "destructive"
      })
    }
  }, [searchParams, toast])

  const validatePassword = (pwd: string) => {
    if (pwd.length < 8) {
      return "Password must be at least 8 characters long"
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    const pwdError = validatePassword(password)
    if (pwdError) {
      setError(pwdError)
      toast({
        title: "Invalid Password",
        description: pwdError,
        variant: "destructive"
      })
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      toast({
        title: "Error",
        description: "Passwords do not match.",
        variant: "destructive"
      })
      return
    }

    if (!token) {
      setError("Reset token is missing.")
      toast({
        title: "Error",
        description: "Reset token is missing.",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(getBackendApiUrl('branch-managers/reset-password'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          new_password: password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to set up password.')
      }

      setSuccess(data.message || 'Password has been set successfully.')
      toast({
        title: "Success",
        description: "Password has been set successfully! You can now log in to the branch manager portal.",
      })

      // Redirect to branch manager login after 2 seconds
      setTimeout(() => {
        router.push('/branch-manager/login')
      }, 2000)

    } catch (err: any) {
      setError(err.message)
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4 py-12">
      <Card className="w-full max-w-md shadow-lg border-gray-200 rounded-2xl bg-white">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-sm border border-blue-100">
            <Building2 className="w-8 h-8" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">Set Up Your Password</CardTitle>
          <CardDescription className="text-gray-600 text-sm mt-1">
            Create a secure password for your Rock Martial Arts Academy branch manager account
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full h-12 rounded-xl bg-gray-50 border-gray-200"
              />
              <p className="text-xs text-gray-500">
                Password must be at least 8 characters long
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <PasswordInput
                id="confirm-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full h-12 rounded-xl bg-gray-50 border-gray-200"
              />
            </div>
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}
            {success && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
                <p className="text-green-600 text-sm font-medium">{success}</p>
                <p className="text-green-600 text-xs mt-1">Redirecting to login...</p>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col space-y-3 pt-2">
            <Button
              type="submit"
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-base shadow-sm"
              disabled={isLoading || !token || Boolean(success)}
            >
              {isLoading ? 'Setting Password...' : success ? 'Password Set Successfully' : 'Set Password'}
            </Button>
            <div className="text-center pt-2">
              <Link href="/branch-manager/login" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">
                Back to Branch Manager Login
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

export default BranchManagerResetPasswordForm

