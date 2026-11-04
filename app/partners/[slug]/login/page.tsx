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
import { partnerOrgAPI } from "@/lib/partnerOrgAPI"
import { TokenManager } from "@/lib/tokenManager"
import { useToast } from "@/hooks/use-toast"

export default function PartnerWhiteLabelLoginPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const slug = String(params?.slug || "").toLowerCase()
  const { partnerName, loadingMeta, disabled, notFound } = usePartnerPublicMeta(slug)

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (disabled) return
    setSubmitting(true)
    try {
      const data = await partnerOrgAPI.login(slug, email.trim(), password)
      TokenManager.storeAuthData({
        access_token: data.access_token,
        token_type: data.token_type || "bearer",
        expires_in: data.expires_in || 86400,
        user: {
          id: data.user?.id,
          email: data.user?.email,
          full_name: data.user?.full_name || partnerName,
          role: "partner_super_admin",
          phone: data.user?.phone,
          partner_org_id: data.user?.partner_org_id || data.partner?.id,
          partner_slug: data.partner?.slug || slug,
          partner_name: data.partner?.name || partnerName,
        } as any,
      })
      if (typeof window !== "undefined") {
        localStorage.setItem("partner_slug", data.partner?.slug || slug)
        localStorage.setItem("partner_name", data.partner?.name || partnerName)
      }
      toast({ title: "Welcome", description: `Signed in to ${data.partner?.name || partnerName}` })
      router.replace(`/partners/${slug}/dashboard`)
    } catch (err) {
      toast({
        title: "Login failed",
        description: err instanceof Error ? err.message : "Invalid credentials",
        variant: "destructive",
      })
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
          <p className="text-sm text-muted-foreground">
            Sign in to your partner admin dashboard
          </p>
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
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href={`/partners/${slug}/forgot-password`}
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
              <PartnerAuthLinks slug={slug} current="admin" />
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
