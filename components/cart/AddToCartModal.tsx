"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
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
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { CreateLinkedStudentModal } from "@/components/cart/CreateLinkedStudentModal"
import {
  addCartItem,
  addCartStudent,
  fetchEnrollmentCart,
  formatInr,
  type EnrollmentCart,
} from "@/lib/enrollmentCart"
import { TokenManager, type LinkedStudentProfile } from "@/lib/tokenManager"
import {
  isStudentAuthenticated,
  loadAccountProfiles,
  profileDisplayName,
} from "@/lib/accountProfiles"
import {
  enrollmentCartStaffBlockedMessage,
  getEnrollmentCartAccess,
} from "@/lib/enrollmentCartAccess"

type DurationOption = { id: string; name: string; code?: string }

type AddToCartModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  courseId: string
  courseName: string
  branchId: string
  branchName: string
  durations: DurationOption[]
  batchRef?: string
}

async function ensureActiveStudentInCart(cart: EnrollmentCart): Promise<EnrollmentCart> {
  if (cart.students.some((s) => (s.student_id || "").trim())) {
    return cart
  }
  if (!isStudentAuthenticated()) return cart
  const user = TokenManager.getUser()
  if (!user?.id) return cart
  const profiles = await loadAccountProfiles()
  const activeId = TokenManager.getActiveStudentId() || user.id
  const match = profiles.find((p) => p.id === activeId)
  return addCartStudent({
    label: match ? profileDisplayName(match) : (user.full_name || "Student").trim() || "Student",
    student_id: activeId,
  })
}

export function AddToCartModal({
  open,
  onOpenChange,
  courseId,
  courseName,
  branchId,
  branchName,
  durations,
  batchRef,
}: AddToCartModalProps) {
  const [loading, setLoading] = useState(false)
  const [cart, setCart] = useState<EnrollmentCart | null>(null)
  const [profiles, setProfiles] = useState<LinkedStudentProfile[]>([])
  const [studentLineId, setStudentLineId] = useState("")
  const [durationId, setDurationId] = useState("")
  const [added, setAdded] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [addingProfileId, setAddingProfileId] = useState<string | null>(null)

  const inCartIds = useMemo(() => {
    const set = new Set<string>()
    for (const s of cart?.students || []) {
      const id = (s.student_id || "").trim()
      if (id) set.add(id)
    }
    return set
  }, [cart?.students])

  const profilesNotInCart = useMemo(
    () => profiles.filter((p) => p.id && !inCartIds.has(p.id)),
    [profiles, inCartIds]
  )

  useEffect(() => {
    if (!open) {
      setAdded(false)
      setCreateOpen(false)
      return
    }

    const access = getEnrollmentCartAccess()
    if (!access.allowed) {
      if (access.kind === "staff") {
        toast({
          title: "Student account required",
          description: enrollmentCartStaffBlockedMessage(access.roleLabel),
          variant: "destructive",
        })
      }
      onOpenChange(false)
      return
    }

    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        let c = await fetchEnrollmentCart()
        if (cancelled) return
        try {
          c = await ensureActiveStudentInCart(c)
        } catch {
          /* keep as-fetched */
        }
        if (cancelled) return
        const list = isStudentAuthenticated() ? await loadAccountProfiles() : []
        if (cancelled) return
        setProfiles(list)
        setCart(c)
        if (c.students.length === 1) {
          setStudentLineId(c.students[0].student_line_id)
        } else if (c.students.length === 0) {
          setStudentLineId("")
        } else {
          const activeId = TokenManager.getActiveStudentId()
          const match = activeId
            ? c.students.find((s) => s.student_id === activeId)
            : undefined
          setStudentLineId(match?.student_line_id || c.students[0].student_line_id)
        }
        if (durations.length === 1) {
          setDurationId(durations[0].id)
        }
      } catch {
        if (!cancelled) setCart(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, durations, onOpenChange])

  async function addProfileToCart(profile: LinkedStudentProfile) {
    if (!profile.id) return
    setAddingProfileId(profile.id)
    try {
      const updated = await addCartStudent({
        label: profileDisplayName(profile),
        student_id: profile.id,
      })
      setCart(updated)
      const line = updated.students.find((s) => s.student_id === profile.id)
      if (line) setStudentLineId(line.student_line_id)
      toast({
        title: "Student added",
        description: `${profileDisplayName(profile)} is ready for this course.`,
      })
    } catch (e) {
      toast({
        title: "Could not add student",
        description: e instanceof Error ? e.message : "Try again.",
        variant: "destructive",
      })
    } finally {
      setAddingProfileId(null)
    }
  }

  async function handleCreated(profile: LinkedStudentProfile) {
    setProfiles(await loadAccountProfiles())
    await addProfileToCart(profile)
  }

  async function handleAdd() {
    if (!durationId) {
      toast({ title: "Select a duration", variant: "destructive" })
      return
    }
    if (!studentLineId) {
      toast({
        title: "Select a student",
        description: "Choose who this course is for, or create a new student.",
        variant: "destructive",
      })
      return
    }
    setLoading(true)
    try {
      const updated = await addCartItem({
        student_line_id: studentLineId,
        course_id: courseId,
        branch_id: branchId,
        duration_id: durationId,
        batch_ref: batchRef,
      })
      setCart(updated)
      setAdded(true)
      toast({
        title: "Added to cart",
        description: `${courseName} at ${branchName} was added.`,
      })
    } catch (e) {
      const raw = e instanceof Error ? e.message : "Please try again."
      const friendly = /already enrolled|active enrollment/i.test(raw)
        ? "This student is already enrolled in this course."
        : raw
      toast({
        title: /already enrolled|active enrollment/i.test(raw)
          ? "Already enrolled"
          : "Could not add to cart",
        description: friendly,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const selectedDuration = durations.find((d) => d.id === durationId)

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md bg-[#171A26] border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-[#FFB70F]">Add to enrollment cart</DialogTitle>
            <DialogDescription className="text-gray-400">
              {courseName} — {branchName}. Choose an account student, then add this course.
            </DialogDescription>
          </DialogHeader>

          {loading && !cart ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-[#FFB70F]" />
            </div>
          ) : added ? (
            <div className="space-y-4 py-2">
              <p className="text-gray-300 text-sm">
                Item saved. Cart total: {formatInr(cart?.totals.total_amount || 0)}
              </p>
              <DialogFooter className="flex flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="border-gray-600"
                  onClick={() => {
                    setAdded(false)
                    onOpenChange(false)
                  }}
                >
                  Continue browsing
                </Button>
                <Button type="button" className="bg-[#FFB70F] text-black hover:bg-[#FFB70F]/90" asChild>
                  <Link href="/cart">View cart</Link>
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {cart && cart.students.length > 0 ? (
                <div className="space-y-2">
                  <Label className="text-gray-300">Which student is this course for?</Label>
                  <Select value={studentLineId} onValueChange={setStudentLineId}>
                    <SelectTrigger className="bg-gray-900 border-gray-700">
                      <SelectValue placeholder="Choose student" />
                    </SelectTrigger>
                    <SelectContent>
                      {cart.students.map((s) => (
                        <SelectItem key={s.student_line_id} value={s.student_line_id}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {profilesNotInCart.length > 0 ? (
                    <div className="pt-1 space-y-1.5">
                      <p className="text-xs text-gray-500">Add another from your account</p>
                      <div className="flex flex-wrap gap-2">
                        {profilesNotInCart.map((p) => (
                          <Button
                            key={p.id}
                            type="button"
                            size="sm"
                            variant="outline"
                            className="border-gray-600 text-xs h-8"
                            disabled={!!addingProfileId || loading}
                            onClick={() => void addProfileToCart(p)}
                          >
                            {addingProfileId === p.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              profileDisplayName(p)
                            )}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <button
                    type="button"
                    className="text-xs text-[#FFB70F] hover:underline"
                    onClick={() => setCreateOpen(true)}
                  >
                    Create new student on this account
                  </button>
                </div>
              ) : (
                <div className="space-y-3 rounded-lg border border-gray-800 bg-gray-900/40 p-3">
                  <p className="text-sm text-gray-400">
                    No students in the cart yet. Add someone from your account first.
                  </p>
                  {profilesNotInCart.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {profilesNotInCart.map((p) => (
                        <Button
                          key={p.id}
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-gray-600 text-xs"
                          disabled={!!addingProfileId || loading}
                          onClick={() => void addProfileToCart(p)}
                        >
                          {addingProfileId === p.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            profileDisplayName(p)
                          )}
                        </Button>
                      ))}
                    </div>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    className="bg-[#FFB70F] text-black"
                    onClick={() => setCreateOpen(true)}
                  >
                    Create new student
                  </Button>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-gray-300">Duration</Label>
                <Select value={durationId} onValueChange={setDurationId}>
                  <SelectTrigger className="bg-gray-900 border-gray-700">
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    {durations.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedDuration ? (
                <p className="text-xs text-gray-500">
                  Fees are calculated on the server when you add this item.
                </p>
              ) : null}

              <DialogFooter>
                <Button
                  type="button"
                  disabled={loading || !studentLineId}
                  className="w-full bg-[#FFB70F] text-black hover:bg-[#FFB70F]/90"
                  onClick={handleAdd}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add to cart"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <CreateLinkedStudentModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleCreated}
      />
    </>
  )
}
