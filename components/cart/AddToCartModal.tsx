"use client"

import { useEffect, useState } from "react"
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
import {
  addCartItem,
  addCartStudent,
  fetchEnrollmentCart,
  formatInr,
  type EnrollmentCart,
} from "@/lib/enrollmentCart"

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
  const [studentLineId, setStudentLineId] = useState("")
  const [newStudentName, setNewStudentName] = useState("")
  const [addingStudent, setAddingStudent] = useState(false)
  const [showNewStudent, setShowNewStudent] = useState(false)
  const [durationId, setDurationId] = useState("")
  const [added, setAdded] = useState(false)

  useEffect(() => {
    if (!open) {
      setAdded(false)
      setShowNewStudent(false)
      setNewStudentName("")
      return
    }
    let cancelled = false
    setLoading(true)
    fetchEnrollmentCart()
      .then((c) => {
        if (cancelled) return
        setCart(c)
        if (c.students.length === 1) {
          setStudentLineId(c.students[0].student_line_id)
        } else if (c.students.length === 0) {
          setStudentLineId("")
        }
        if (durations.length === 1) {
          setDurationId(durations[0].id)
        }
      })
      .catch(() => {
        if (!cancelled) setCart(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, durations])

  async function ensureStudentLine(): Promise<string> {
    if (studentLineId) return studentLineId
    const label = newStudentName.trim()
    if (!label) {
      throw new Error("Enter the student name for this enrollment.")
    }
    const updated = await addCartStudent({ label })
    setCart(updated)
    const line = updated.students[updated.students.length - 1]?.student_line_id
    if (!line) throw new Error("Could not add student to cart.")
    setStudentLineId(line)
    setShowNewStudent(false)
    return line
  }

  async function handleAddAnotherStudent() {
    const label = newStudentName.trim()
    if (!label) {
      toast({ title: "Enter a student name", variant: "destructive" })
      return
    }
    setAddingStudent(true)
    try {
      const updated = await addCartStudent({ label })
      setCart(updated)
      const line = updated.students[updated.students.length - 1]?.student_line_id
      if (line) setStudentLineId(line)
      setNewStudentName("")
      setShowNewStudent(false)
      toast({ title: "Student added", description: `${label} is now available in the list.` })
    } catch (e) {
      toast({
        title: "Could not add student",
        description: e instanceof Error ? e.message : "Try again.",
        variant: "destructive",
      })
    } finally {
      setAddingStudent(false)
    }
  }

  async function handleAdd() {
    if (!durationId) {
      toast({ title: "Select a duration", variant: "destructive" })
      return
    }
    setLoading(true)
    try {
      const line = await ensureStudentLine()
      const updated = await addCartItem({
        student_line_id: line,
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
      toast({
        title: "Could not add to cart",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const selectedDuration = durations.find((d) => d.id === durationId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-[#171A26] border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-[#FFB70F]">Add to enrollment cart</DialogTitle>
          <DialogDescription className="text-gray-400">
            {courseName} — {branchName}. You can add more courses or students before checkout.
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
                {showNewStudent ? (
                  <div className="flex flex-col gap-2 pt-1">
                    <Input
                      value={newStudentName}
                      onChange={(e) => setNewStudentName(e.target.value)}
                      placeholder="New student name"
                      className="bg-gray-900 border-gray-700"
                      disabled={addingStudent}
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-gray-600 flex-1"
                        disabled={addingStudent}
                        onClick={() => {
                          setShowNewStudent(false)
                          setNewStudentName("")
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="bg-[#FFB70F] text-black flex-1"
                        disabled={addingStudent || !newStudentName.trim()}
                        onClick={handleAddAnotherStudent}
                      >
                        {addingStudent ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add student"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="text-xs text-[#FFB70F] hover:underline"
                    onClick={() => setShowNewStudent(true)}
                  >
                    Add another student to this cart
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="cart-student-name" className="text-gray-300">
                  Student name
                </Label>
                <Input
                  id="cart-student-name"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  placeholder="Who will train?"
                  className="bg-gray-900 border-gray-700"
                />
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
                disabled={loading}
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
  )
}
