"use client"

import { useMemo, useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { partnerOrgAPI } from "@/lib/partnerOrgAPI"
import { useToast } from "@/hooks/use-toast"

export default function PartnerSetPasswordPage() {
  const params = useParams()
  const search = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()
  const slug = String(params?.slug || "").toLowerCase()
  const token = useMemo(() => search?.get("token") || "", [search])

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token) {
      toast({
        title: "Invalid link",
        description: "This invitation link is missing a token.",
        variant: "destructive",
      })
      return
    }
    if (password.length < 8) {
      toast({
        title: "Password too short",
        description: "Use at least 8 characters.",
        variant: "destructive",
      })
      return
    }
    if (password !== confirm) {
      toast({
        title: "Passwords do not match",
        variant: "destructive",
      })
      return
    }
    setSubmitting(true)
    try {
      await partnerOrgAPI.setPassword(token, password)
      toast({
        title: "Password created",
        description: "You can now sign in to your partner dashboard.",
      })
      router.replace(`/partners/${slug}/login`)
    } catch (err) {
      toast({
        title: "Could not set password",
        description: err instanceof Error ? err.message : "Please try again.",
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
          <CardTitle className="text-xl text-[#1a2332]">Create your password</CardTitle>
          <p className="text-sm text-muted-foreground">
            Set a password for your partner admin account, then sign in.
          </p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <Button
              type="submit"
              disabled={submitting || !token}
              className="w-full bg-[#FFC403] text-[#1a2332] hover:bg-[#e6b003]"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving…
                </>
              ) : (
                "Create password"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
