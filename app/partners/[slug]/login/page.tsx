"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { partnerOrgAPI } from "@/lib/partnerOrgAPI"
import { TokenManager } from "@/lib/tokenManager"
import { useToast } from "@/hooks/use-toast"

export default function PartnerWhiteLabelLoginPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const slug = String(params?.slug || "").toLowerCase()

  const [partnerName, setPartnerName] = useState("")
  const [loadingMeta, setLoadingMeta] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [disabled, setDisabled] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!slug) return
      setLoadingMeta(true)
      try {
        const meta = await partnerOrgAPI.publicBySlug(slug)
        if (cancelled) return
        setPartnerName(meta.name || slug)
        setDisabled(meta.is_active === false || meta.status === "disabled")
      } catch {
        if (!cancelled) {
          setPartnerName("")
          toast({
            title: "Partner not found",
            description: "Check the login link and try again.",
            variant: "destructive",
          })
        }
      } finally {
        if (!cancelled) setLoadingMeta(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [slug, toast])

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
          ) : !partnerName ? (
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
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
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
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
