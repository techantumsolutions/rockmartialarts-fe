"use client"

import { useState, type FormEvent } from "react"
import { Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { TokenManager, type LinkedStudentProfile } from "@/lib/tokenManager"
import { getBackendApiUrl } from "@/lib/config"
import { STUDENT_RELATIONSHIPS, profileDisplayName } from "@/lib/accountProfiles"

type CreateLinkedStudentModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called after the profile is created on the account (and profiles cache updated). */
  onCreated: (profile: LinkedStudentProfile, profiles: LinkedStudentProfile[]) => void | Promise<void>
}

export function CreateLinkedStudentModal({
  open,
  onOpenChange,
  onCreated,
}: CreateLinkedStudentModalProps) {
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [dob, setDob] = useState("")
  const [gender, setGender] = useState("")
  const [relationship, setRelationship] = useState("child")
  const [submitting, setSubmitting] = useState(false)

  function resetForm() {
    setFirstName("")
    setLastName("")
    setDob("")
    setGender("")
    setRelationship("child")
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim()) {
      toast({ title: "Enter first and last name", variant: "destructive" })
      return
    }
    if (!dob) {
      toast({ title: "Date of birth is required", variant: "destructive" })
      return
    }
    if (!gender) {
      toast({ title: "Select a gender", variant: "destructive" })
      return
    }
    if (!relationship) {
      toast({ title: "Select a relationship", variant: "destructive" })
      return
    }

    const token = TokenManager.getToken()
    if (!token) {
      toast({
        title: "Sign in required",
        description: "Please sign in as a student to add a profile.",
        variant: "destructive",
      })
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(getBackendApiUrl("auth/linked-students"), {
        method: "POST",
        headers: TokenManager.getAuthHeaders(),
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          date_of_birth: dob,
          gender,
          relationship,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(typeof data.detail === "string" ? data.detail : "Could not create student")
      }
      const profiles = Array.isArray(data.profiles)
        ? (data.profiles as LinkedStudentProfile[])
        : []
      if (profiles.length > 0) TokenManager.setProfiles(profiles)

      const studentId = String(data.student_id || "").trim()
      let created =
        profiles.find((p) => p.id === studentId) ||
        ({
          id: studentId,
          full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          relationship,
        } as LinkedStudentProfile)

      if (!created.id) {
        throw new Error("Student was created without an id")
      }

      await onCreated(created, profiles)
      resetForm()
      onOpenChange(false)
      toast({
        title: `${profileDisplayName(created)} added`,
        description: "They are on your account. You can assign courses from the cart.",
      })
    } catch (err) {
      toast({
        title: "Could not create student",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !submitting) {
          resetForm()
          onOpenChange(false)
        } else if (next) {
          onOpenChange(true)
        }
      }}
    >
      <DialogContent className="sm:max-w-md bg-[#171A26] border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-[#FFB70F]">Add student to your account</DialogTitle>
          <DialogDescription className="text-gray-400">
            They&apos;ll share this login. You can enroll them with courses from the cart next.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="linked-first" className="text-gray-300">
                First name
              </Label>
              <Input
                id="linked-first"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="bg-gray-900 border-gray-700"
                disabled={submitting}
                autoComplete="given-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="linked-last" className="text-gray-300">
                Last name
              </Label>
              <Input
                id="linked-last"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="bg-gray-900 border-gray-700"
                disabled={submitting}
                autoComplete="family-name"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="linked-dob" className="text-gray-300">
              Date of birth
            </Label>
            <Input
              id="linked-dob"
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="bg-gray-900 border-gray-700"
              disabled={submitting}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-gray-300">Gender</Label>
              <Select value={gender} onValueChange={setGender} disabled={submitting}>
                <SelectTrigger className="bg-gray-900 border-gray-700">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                  <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-gray-300">Relationship</Label>
              <Select value={relationship} onValueChange={setRelationship} disabled={submitting}>
                <SelectTrigger className="bg-gray-900 border-gray-700">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {STUDENT_RELATIONSHIPS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="border-gray-600 sm:flex-1"
              disabled={submitting}
              onClick={() => {
                resetForm()
                onOpenChange(false)
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-[#FFB70F] text-black hover:bg-[#FFB70F]/90 sm:flex-1"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create & add to cart"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
