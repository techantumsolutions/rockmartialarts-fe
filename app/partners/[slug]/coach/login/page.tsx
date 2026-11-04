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
import { getBackendApiUrl } from "@/lib/config"
import { TokenManager } from "@/lib/tokenManager"
import { useToast } from "@/hooks/use-toast"

export default function PartnerCoachLoginPage() {
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
      const res = await fetch(getBackendApiUrl("coaches/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const errMsg =
          typeof data.detail === "string"
            ? data.detail
            : Array.isArray(data.detail)
              ? data.detail.map((x: { msg?: string }) => x.msg || JSON.stringify(x)).join(", ")
              : data.message || `Login failed (${res.status})`
        setError(errMsg)
        return
      }
      if (!data.access_token || !data.coach) {
        setError("Invalid response from server")
        return
      }
      if (data.coach?.role !== "coach") {
        setError("Access denied. Coach credentials required.")
        return
      }

      TokenManager.storeAuthData({
        access_token: data.access_token,
        token_type: data.token_type,
        expires_in: data.expires_in,
        coach: data.coach,
      })
      localStorage.setItem("coach", JSON.stringify(data.coach))
      localStorage.setItem("partner_slug", slug)
      localStorage.setItem("partner_name", partnerName)
      toast({ title: "Welcome", description: `Signed in to ${partnerName}` })
      router.push("/coach-dashboard")
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
          <p className="text-sm text-muted-foreground">Coach sign in</p>
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
                    href={`/partners/${slug}/coach/forgot-password`}
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
              <PartnerAuthLinks slug={slug} current="coach" />
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
