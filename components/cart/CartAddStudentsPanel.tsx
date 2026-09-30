"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "@/components/ui/use-toast"
import { CreateLinkedStudentModal } from "@/components/cart/CreateLinkedStudentModal"
import {
  addCartStudent,
  addCartStudentsBulk,
  type EnrollmentCart,
} from "@/lib/enrollmentCart"
import {
  loadAccountProfiles,
  profileDisplayName,
  relationshipLabel,
} from "@/lib/accountProfiles"
import {
  enrollmentCartStaffBlockedMessage,
  getEnrollmentCartAccess,
} from "@/lib/enrollmentCartAccess"
import type { LinkedStudentProfile } from "@/lib/tokenManager"
import { isProfileDeactivated } from "@/lib/studentSessionStatus"

type CartAddStudentsPanelProps = {
  cart: EnrollmentCart | null
  busy?: boolean
  onCartUpdated: (cart: EnrollmentCart) => void
}

export function CartAddStudentsPanel({ cart, busy, onCartUpdated }: CartAddStudentsPanelProps) {
  const [profiles, setProfiles] = useState<LinkedStudentProfile[]>([])
  const [loadingProfiles, setLoadingProfiles] = useState(true)
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [adding, setAdding] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)

  const inCartIds = useMemo(() => {
    const set = new Set<string>()
    for (const s of cart?.students || []) {
      const id = (s.student_id || "").trim()
      if (id) set.add(id)
    }
    return set
  }, [cart?.students])

  const refreshProfiles = useCallback(async () => {
    setLoadingProfiles(true)
    try {
      const access = getEnrollmentCartAccess()
      if (!access.allowed) {
        setProfiles([])
        return
      }
      setProfiles(await loadAccountProfiles())
    } finally {
      setLoadingProfiles(false)
    }
  }, [])

  useEffect(() => {
    void refreshProfiles()
  }, [refreshProfiles])

  const availableCount = useMemo(
    () =>
      profiles.filter(
        (p) => p.id && !inCartIds.has(p.id) && !isProfileDeactivated(p) && selected[p.id]
      ).length,
    [profiles, inCartIds, selected]
  )

  function toggle(id: string, checked: boolean) {
    if (inCartIds.has(id)) return
    setSelected((prev) => ({ ...prev, [id]: checked }))
  }

  function requireStudentAccess() {
    const access = getEnrollmentCartAccess()
    if (access.allowed) return true
    if (access.kind === "staff") {
      toast({
        title: "Student account required",
        description: enrollmentCartStaffBlockedMessage(access.roleLabel),
        variant: "destructive",
      })
      return false
    }
    toast({
      title: "Sign in required",
      description: "Sign in with your student account to add people from your family profiles.",
      variant: "destructive",
    })
    window.location.href = `/login?returnUrl=${encodeURIComponent("/cart")}`
    return false
  }

  async function handleAddSelected() {
    if (!requireStudentAccess()) return
    const toAdd = profiles.filter(
      (p) => p.id && selected[p.id] && !inCartIds.has(p.id) && !isProfileDeactivated(p)
    )
    if (toAdd.length === 0) {
      toast({ title: "Select at least one student", variant: "destructive" })
      return
    }
    setAdding(true)
    try {
      const payload = toAdd.map((p) => ({
        label: profileDisplayName(p),
        student_id: p.id,
      }))
      let updated: EnrollmentCart
      if (payload.length === 1) {
        updated = await addCartStudent(payload[0])
      } else {
        const result = await addCartStudentsBulk(payload)
        updated = result.cart
      }
      onCartUpdated(updated)
      setSelected({})
      toast({
        title: `${payload.length} student${payload.length === 1 ? "" : "s"} added`,
        description: "Assign courses for each student below.",
      })
    } catch (err) {
      toast({
        title: "Could not add students",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      })
    } finally {
      setAdding(false)
    }
  }

  async function handleCreated(profile: LinkedStudentProfile) {
    if (!profile.id) return
    try {
      if (inCartIds.has(profile.id)) {
        await refreshProfiles()
        return
      }
      const updated = await addCartStudent({
        label: profileDisplayName(profile),
        student_id: profile.id,
      })
      onCartUpdated(updated)
      await refreshProfiles()
    } catch (err) {
      await refreshProfiles()
      toast({
        title: "Student created",
        description:
          err instanceof Error
            ? `${err.message} Select them above to add to the cart.`
            : "Select them above to add to the cart.",
        variant: "destructive",
      })
    }
  }

  if (!getEnrollmentCartAccess().allowed) {
    const access = getEnrollmentCartAccess()
    const isStaff = access.allowed === false && access.kind === "staff"
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-5 mb-8">
        <p className="text-gray-300 text-sm mb-3">
          {isStaff
            ? enrollmentCartStaffBlockedMessage(access.roleLabel)
            : "Sign in to choose students from your account, then assign courses."}
        </p>
        {isStaff ? null : (
          <Button
            type="button"
            className="bg-[#FFB70F] text-black hover:bg-[#FFB70F]/90"
            onClick={() => {
              window.location.href = `/login?returnUrl=${encodeURIComponent("/cart")}`
            }}
          >
            Sign in to add students
          </Button>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-5 mb-8">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div>
            <h2 className="text-base font-semibold text-white">Who is enrolling?</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Choose students from your account, then add courses for each.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-[#FFB70F]/50 text-[#FFB70F] hover:bg-[#FFB70F]/10 shrink-0"
            disabled={busy || adding}
            onClick={() => {
              if (!requireStudentAccess()) return
              setCreateOpen(true)
            }}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Create new student
          </Button>
        </div>

        {loadingProfiles ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-[#FFB70F]" />
          </div>
        ) : profiles.length === 0 ? (
          <p className="text-sm text-gray-500 py-4">
            No students on this account yet. Create a student to get started.
          </p>
        ) : (
          <ul className="space-y-2 mb-4">
            {profiles.map((p) => {
              if (!p.id) return null
              const inCart = inCartIds.has(p.id)
              const deactivated = !inCart && isProfileDeactivated(p)
              const name = profileDisplayName(p)
              const rel = relationshipLabel(p.relationship)
              return (
                <li
                  key={p.id}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${
                    inCart
                      ? "border-[#FFB70F]/30 bg-[#FFB70F]/5"
                      : deactivated
                        ? "border-gray-800 bg-gray-950/40 opacity-60"
                        : "border-gray-800 bg-gray-950/40"
                  }`}
                >
                  <Checkbox
                    checked={inCart || (!deactivated && !!selected[p.id])}
                    disabled={inCart || deactivated || busy || adding}
                    onCheckedChange={(v) => toggle(p.id, v === true)}
                    className="border-gray-600 data-[state=checked]:bg-[#FFB70F] data-[state=checked]:border-[#FFB70F]"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">{name}</p>
                    {rel ? <p className="text-xs text-gray-500">{rel}</p> : null}
                  </div>
                  {inCart ? (
                    <span className="text-xs text-[#FFB70F] shrink-0">In cart</span>
                  ) : deactivated ? (
                    <span className="text-xs text-gray-400 shrink-0">Deactivated</span>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}

        <Button
          type="button"
          disabled={busy || adding || availableCount === 0}
          className="w-full sm:w-auto bg-[#FFB70F] text-black hover:bg-[#FFB70F]/90"
          onClick={() => void handleAddSelected()}
        >
          {adding ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : availableCount === 0 ? (
            "Add selected to cart"
          ) : (
            `Add ${availableCount} selected to cart`
          )}
        </Button>
      </div>

      <CreateLinkedStudentModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleCreated}
      />
    </>
  )
}
