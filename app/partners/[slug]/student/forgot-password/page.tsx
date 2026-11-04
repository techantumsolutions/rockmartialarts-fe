"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { usePartnerPublicMeta } from "@/hooks/usePartnerPublicMeta"

/**
 * Student password reset uses the existing SMS OTP flow at /forgot-password.
 * This partner-branded page routes there while keeping a clear path back to partner student login.
 */
export default function PartnerStudentForgotPasswordPage() {
  const params = useParams()
  const router = useRouter()
  const slug = String(params?.slug || "").toLowerCase()
  const { partnerName, loadingMeta, disabled, notFound } = usePartnerPublicMeta(slug)

  useEffect(() => {
    if (typeof window === "undefined" || !slug) return
    try {
      sessionStorage.setItem("partner_forgot_return", `/partners/${slug}/student/login`)
      sessionStorage.setItem("partner_slug", slug)
    } catch {
      /* ignore */
    }
  }, [slug])

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl text-[#1a2332]">
            {loadingMeta ? "Loading…" : `Reset password — ${partnerName || "Partner"}`}
          </CardTitle>
          <p className="text-sm text-muted-foreground">Student password reset via mobile OTP</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingMeta ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
            </div>
          ) : disabled || notFound || !partnerName ? (
            <p className="text-sm text-gray-600 py-4">
              {disabled ? "This partner account is disabled." : "Partner not found."}
            </p>
          ) : (
            <>
              <p className="text-sm text-gray-600">
                Continue to the secure student password reset flow. After resetting, sign in again
                from your partner student login page.
              </p>
              <Button
                className="w-full bg-[#FFC403] text-[#1a2332] hover:bg-[#e6b003]"
                onClick={() => router.push("/forgot-password")}
              >
                Continue to Reset Password
              </Button>
              <div className="text-center">
                <Link
                  href={`/partners/${slug}/student/login`}
                  className="text-sm text-amber-700 hover:text-amber-900"
                >
                  ← Back to Student Login
                </Link>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
