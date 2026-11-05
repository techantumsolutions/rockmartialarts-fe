"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PasswordInput } from "@/components/ui/password-input"
import { PartnerAuthLinks } from "@/components/partner/PartnerAuthLinks"
import { usePartnerPublicMeta } from "@/hooks/usePartnerPublicMeta"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"
import { TokenManager } from "@/lib/tokenManager"
import { useToast } from "@/hooks/use-toast"

export default function PartnerBranchManagerLoginPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const slug = String(params?.slug || "").toLowerCase()
  const { partnerName, loadingMeta, disabled, notFound } = usePartnerPublicMeta(slug)

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (disabled) return
    setError("")
    setSubmitting(true)
    try {
      const res = await fetch("/api/backend/branch-managers/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.detail || data.message || `Login failed (${res.status})`)
        return
      }
      if (!data.access_token || !data.branch_manager) {
        setError("Invalid response from server")
        return
      }

      const userData = BranchManagerAuth.storeLoginData(data)
      TokenManager.storeAuthData({
        access_token: data.access_token,
        token_type: data.token_type || "bearer",
        expires_in: data.expires_in ?? 86400,
        user: {
          id: userData.id,
          full_name: userData.full_name,
          email: userData.email,
          role: "branch_manager",
          ...userData,
        },
      })
      if (typeof window !== "undefined") {
        localStorage.setItem("partner_slug", slug)
        localStorage.setItem("partner_name", partnerName)
        localStorage.setItem("partner_bm_session", "1")
      }
      toast({ title: "Welcome", description: `Signed in to ${partnerName}` })
      router.replace("/branch-admin/dashboard")
    } catch {
      setError("An error occurred during login. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl text-[#1a2332]">
            {loadingMeta ? "Loading…" : partnerName || "Partner login"}
          </CardTitle>
          <p className="text-sm text-muted-foreground">Branch admin sign in</p>
        </CardHeader>
        <CardContent>
          {loadingMeta ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
            </div>
          ) : disabled ? (
            <p className="text-sm text-red-600 py-4">
              This partner account is disabled. Please contact the administrator.
            </p>
          ) : notFound || !partnerName ? (
            <p className="text-sm text-gray-600 py-4">Partner not found.</p>
          ) : (
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.toLowerCase())}
                  required
                  autoComplete="username"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href={`/partners/${slug}/branch-manager/forgot-password`}
                    className="text-xs font-medium text-amber-700 hover:text-amber-900"
                  >
                    Forgot Password?
                  </Link>
                </div>
                <PasswordInput
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              {error ? (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm">
                  {error}
                </div>
              ) : null}
              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#FFC403] text-[#1a2332] hover:bg-[#e6b003]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
              <PartnerAuthLinks slug={slug} current="branch_manager" />
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
