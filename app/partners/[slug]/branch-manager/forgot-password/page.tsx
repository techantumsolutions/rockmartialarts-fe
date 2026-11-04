"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { usePartnerPublicMeta } from "@/hooks/usePartnerPublicMeta"
import { useToast } from "@/hooks/use-toast"

export default function PartnerBranchManagerForgotPasswordPage() {
  const params = useParams()
  const { toast } = useToast()
  const slug = String(params?.slug || "").toLowerCase()
  const { partnerName, loadingMeta, disabled, notFound } = usePartnerPublicMeta(slug)

  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) {
      setError("Email is required")
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
          description: "If a branch admin account exists with this email, you'll receive reset instructions.",
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl text-[#1a2332]">
            {loadingMeta ? "Loading…" : `Reset password — ${partnerName || "Partner"}`}
          </CardTitle>
          <p className="text-sm text-muted-foreground">Branch admin password reset</p>
        </CardHeader>
        <CardContent>
          {loadingMeta ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
            </div>
          ) : disabled || notFound || !partnerName ? (
            <p className="text-sm text-gray-600 py-4">
              {disabled ? "This partner account is disabled." : "Partner not found."}
            </p>
          ) : success ? (
            <div className="space-y-4 text-sm text-gray-700">
              <p>
                If a branch admin account exists with <strong>{email}</strong>, you&apos;ll receive
                password reset instructions shortly.
              </p>
              <Link href={`/partners/${slug}/branch-manager/login`}>
                <Button className="w-full bg-[#FFC403] text-[#1a2332] hover:bg-[#e6b003]">
                  Back to Branch Admin Login
                </Button>
              </Link>
            </div>
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
                  disabled={loading}
                />
              </div>
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#FFC403] text-[#1a2332] hover:bg-[#e6b003]"
              >
                {loading ? "Sending…" : "Send Reset Link"}
              </Button>
              <div className="text-center">
                <Link
                  href={`/partners/${slug}/branch-manager/login`}
                  className="text-sm text-amber-700 hover:text-amber-900"
                >
                  ← Back to Branch Admin Login
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
