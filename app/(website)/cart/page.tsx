"use client"

import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"
import { BookPlus, Loader2, ShoppingCart, Trash2 } from "lucide-react"
import { MultiCoursePickerModal } from "@/components/cart/MultiCoursePickerModal"
import { CartAddStudentsPanel } from "@/components/cart/CartAddStudentsPanel"
import type { CartStudentGroup } from "@/lib/enrollmentCart"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  addCartStudent,
  confirmCartCheckout,
  fetchEnrollmentCart,
  formatInr,
  prepareCartCheckout,
  removeCartItem,
  removeCartStudent,
  validateEnrollmentCart,
  type EnrollmentCart,
} from "@/lib/enrollmentCart"
import { openRazorpayCheckout } from "@/lib/razorpay"
import { TokenManager } from "@/lib/tokenManager"
import { isStudentAuthenticated, profileDisplayName, loadAccountProfiles } from "@/lib/accountProfiles"
import {
  enrollmentCartStaffBlockedMessage,
  getEnrollmentCartAccess,
} from "@/lib/enrollmentCartAccess"

export default function EnrollmentCartPage() {
  const [cart, setCart] = useState<EnrollmentCart | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const studentSeedAttempted = useRef(false)
  const [multiPickerGroup, setMultiPickerGroup] = useState<CartStudentGroup | null>(null)
  const [removeStudentTarget, setRemoveStudentTarget] = useState<CartStudentGroup | null>(null)

  const loadCart = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchEnrollmentCart()
      setCart(data)
    } catch {
      setCart(null)
      toast({
        title: "Could not load cart",
        description: "Please refresh and try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCart()
  }, [loadCart])

  // Seed only the active student when cart has no linked lines — not every profile.
  useEffect(() => {
    if (!cart || cart.students.length > 0 || studentSeedAttempted.current) return
    if (!isStudentAuthenticated()) return
    studentSeedAttempted.current = true
    ;(async () => {
      try {
        const user = TokenManager.getUser()
        if (!user?.id) return
        const profiles = await loadAccountProfiles()
        const activeId = TokenManager.getActiveStudentId() || user.id
        const match = profiles.find((p) => p.id === activeId)
        const label = match
          ? profileDisplayName(match)
          : (user.full_name || "Student").trim() || "Student"
        const updated = await addCartStudent({ label, student_id: activeId })
        setCart(updated)
      } catch {
        /* ignore — user can add from the panel */
      }
    })()
  }, [cart])

  async function handleRemoveItem(itemId: string) {
    if (!itemId) {
      toast({
        title: "Remove failed",
        description: "This course line is missing an id. Refresh the page and try again.",
        variant: "destructive",
      })
      await loadCart()
      return
    }
    setBusy(true)
    try {
      setCart(await removeCartItem(itemId))
    } catch (err) {
      toast({
        title: "Remove failed",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      })
      try {
        setCart(await fetchEnrollmentCart())
      } catch {
        /* ignore */
      }
    } finally {
      setBusy(false)
    }
  }

  async function handleRemoveStudent(studentLineId: string) {
    setBusy(true)
    try {
      setCart(await removeCartStudent(studentLineId))
      setRemoveStudentTarget(null)
      toast({ title: "Student removed", description: "Their courses were removed from the cart." })
    } catch (err) {
      toast({
        title: "Remove failed",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      })
    } finally {
      setBusy(false)
    }
  }

  async function handleValidate() {
    setBusy(true)
    try {
      const updated = await validateEnrollmentCart()
      setCart(updated)
      if (updated.is_valid) {
        toast({ title: "Cart looks good", description: "All items passed validation." })
      } else {
        const first = updated.validation_issues[0]
        toast({
          title: "Please review your cart",
          description: first?.message || "Some items need attention.",
          variant: "destructive",
        })
      }
    } catch (err) {
      toast({
        title: "Validation failed",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      })
    } finally {
      setBusy(false)
    }
  }

  async function handleCheckout() {
    const access = getEnrollmentCartAccess()
    if (!access.allowed) {
      if (access.kind === "guest") {
        toast({
          title: "Sign in required",
          description: "Please sign in as a student to pay for enrollments in this cart.",
          variant: "destructive",
        })
        window.location.href = `/login?returnUrl=${encodeURIComponent("/cart")}`
        return
      }
      toast({
        title: "Student account required",
        description: enrollmentCartStaffBlockedMessage(access.roleLabel),
        variant: "destructive",
      })
      return
    }
    if (!cart?.items?.length) {
      toast({ title: "Cart is empty", description: "Add courses before checkout.", variant: "destructive" })
      return
    }

    setBusy(true)
    try {
      const prep = await prepareCartCheckout()
      if (!prep.order?.id || !prep.key) {
        throw new Error("Could not start payment. Please try again.")
      }

      await openRazorpayCheckout({
        razorpayKeyId: prep.key,
        amountPaise: prep.order.amount,
        currency: prep.order.currency || "INR",
        name: "Rock Martial Arts",
        description: `Enrollment cart · ${prep.item_count} course(s)`,
        orderId: prep.order.id,
        onSuccess: async (response) => {
          try {
            if (!response.razorpay_order_id || !response.razorpay_signature) {
              throw new Error("Incomplete payment response")
            }
            const result = await confirmCartCheckout({
              cart_checkout_id: prep.cart_checkout_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            })
            toast({
              title: result.already_fulfilled ? "Already completed" : "Payment successful",
              description: `${result.enrollment_ids?.length || prep.item_count} enrollment(s) activated.`,
            })
            window.location.href = `/cart/success?checkout_id=${encodeURIComponent(prep.cart_checkout_id)}`
          } catch (err) {
            toast({
              title: "Payment received — confirmation pending",
              description:
                err instanceof Error
                  ? err.message
                  : "If amount was deducted, enrollments will activate shortly. Contact support with your payment ID.",
              variant: "destructive",
            })
          } finally {
            setBusy(false)
          }
        },
        onDismiss: () => {
          setBusy(false)
          toast({
            title: "Checkout cancelled",
            description: "Your cart is unchanged. You can try again anytime.",
          })
        },
        onPaymentFailure: (message) => {
          setBusy(false)
          toast({
            title: "Payment failed",
            description: message || "Please try again.",
            variant: "destructive",
          })
        },
      })
    } catch (err) {
      setBusy(false)
      const msg = err instanceof Error ? err.message : "Could not start checkout"
      if (/sign in|authentication|401/i.test(msg)) {
        toast({
          title: "Sign in required",
          description: "Please sign in as a student to checkout.",
          variant: "destructive",
        })
        window.location.href = `/login?returnUrl=${encodeURIComponent("/cart")}`
        return
      }
      toast({
        title: "Checkout failed",
        description: msg,
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#171A26] flex items-center justify-center pt-24">
        <Loader2 className="w-10 h-10 animate-spin text-[#FFB70F]" />
      </main>
    )
  }

  const groups = cart?.student_groups || []
  const totals = cart?.totals
  const hasStudents = (cart?.students.length || 0) > 0
  const cartAccess = getEnrollmentCartAccess()
  const studentCount = totals?.student_count ?? cart?.students.length ?? 0
  const showStudentWorkspace =
    hasStudents || cartAccess.allowed || (cartAccess.allowed === false && cartAccess.kind === "staff")

  return (
    <main className="min-h-screen bg-[#171A26] text-white pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="flex items-center gap-3 mb-8">
          <ShoppingCart className="w-8 h-8 text-[#FFB70F]" />
          <h1 className="text-3xl font-bold text-[#FFB70F]">Enrollment cart</h1>
        </div>
        <p className="text-gray-400 mb-8 max-w-2xl">
          Choose students from your account, assign courses, then checkout once to activate every
          enrollment after payment.
        </p>

        {!showStudentWorkspace ? (
          <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-10 text-center">
            <p className="text-gray-400 mb-6">Your cart is empty.</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild className="bg-[#FFB70F] text-black hover:bg-[#FFB70F]/90">
                <Link href="/courses">Browse courses</Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-gray-600"
                onClick={() => {
                  window.location.href = `/login?returnUrl=${encodeURIComponent("/cart")}`
                }}
              >
                Sign in to add students
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-gray-800 bg-gray-900/50 px-5 py-4 mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <span className="text-gray-300">
                <span className="text-[#FFB70F] font-semibold">{studentCount}</span> student
                {studentCount === 1 ? "" : "s"}
              </span>
              <span className="text-gray-500">·</span>
              <span className="text-gray-300">
                <span className="text-white font-medium">{totals?.item_count || 0}</span> course line
                {(totals?.item_count || 0) === 1 ? "" : "s"}
              </span>
              <span className="text-gray-500 hidden sm:inline">·</span>
              <span className="text-gray-400 hidden sm:inline">
                Each student&apos;s fees are calculated separately, then combined below.
              </span>
            </div>

            <CartAddStudentsPanel cart={cart} busy={busy} onCartUpdated={setCart} />

            {!hasStudents ? (
              <div className="rounded-xl border border-dashed border-gray-700 bg-gray-900/20 p-8 text-center mb-8">
                <p className="text-gray-400 text-sm">
                  Select students above (or create a new one), then assign courses for each.
                </p>
              </div>
            ) : null}

            <div className="space-y-6 mb-8">
              {groups.map((group, index) => (
                <section
                  key={group.student_line_id}
                  className="rounded-xl border border-gray-800 bg-gray-900/40 overflow-hidden"
                >
                  <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-gray-800">
                    <div className="flex items-start gap-3 min-w-0">
                      <span
                        className="shrink-0 w-8 h-8 rounded-full bg-[#FFB70F]/15 text-[#FFB70F] text-sm font-bold flex items-center justify-center"
                        aria-hidden
                      >
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <h2 className="text-lg font-semibold text-white truncate">{group.label}</h2>
                        <p className="text-sm text-gray-500">
                          {group.items.length} course{group.items.length === 1 ? "" : "s"} · Subtotal{" "}
                          {formatInr(group.line_total)}
                        </p>
                        {group.student_id ? (
                          <p className="text-xs text-gray-600 mt-0.5">Account student</p>
                        ) : (
                          <p className="text-xs text-amber-500/90 mt-0.5">
                            Not linked — remove and re-add from your account students
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setRemoveStudentTarget(group)}
                      className="text-gray-400 hover:text-red-400 text-sm inline-flex items-center gap-1 shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                      Remove student
                    </button>
                  </div>
                  <div className="px-5 py-3 border-b border-gray-800/80">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      className="border-[#FFB70F]/50 text-[#FFB70F] hover:bg-[#FFB70F]/10"
                      onClick={() => {
                        const access = getEnrollmentCartAccess()
                        if (!access.allowed) {
                          if (access.kind === "guest") {
                            toast({
                              title: "Sign in required",
                              description: "Please sign in as a student to add courses.",
                              variant: "destructive",
                            })
                            window.location.href = `/login?returnUrl=${encodeURIComponent("/cart")}`
                            return
                          }
                          toast({
                            title: "Student account required",
                            description: enrollmentCartStaffBlockedMessage(access.roleLabel),
                            variant: "destructive",
                          })
                          return
                        }
                        setMultiPickerGroup(group)
                      }}
                    >
                      <BookPlus className="w-4 h-4 mr-2" />
                      Add multiple courses
                    </Button>
                  </div>
                  {group.items.length === 0 ? (
                    <p className="px-5 py-6 text-gray-500 text-sm">
                      No courses yet. Use <strong className="text-gray-300">Add multiple courses</strong> above,
                      or{" "}
                      <Link href="/courses" className="text-[#FFB70F] hover:underline">
                        browse courses
                      </Link>{" "}
                      and use Add to cart on a course page.
                    </p>
                  ) : (
                    <ul className="divide-y divide-gray-800">
                      {group.items.map((item) => {
                        const lineTotal = Number(item.pricing?.total_amount ?? 0)
                        const discountAmount = Number(item.pricing?.discount_amount ?? 0)
                        return (
                        <li key={item.id || `${item.course_id}-${item.duration_id}`} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-white truncate">{item.course_name}</p>
                            <p className="text-sm text-gray-400">
                              {item.branch_name} · {item.duration_name}
                            </p>
                            {item.pricing?.is_flat_price && discountAmount ? (
                              <p className="text-xs text-[#FFB70F] mt-1">
                                Offer applied — save {formatInr(discountAmount)}
                              </p>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-[#FFB70F] font-semibold">
                              {formatInr(lineTotal)}
                            </span>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleRemoveItem(item.id)}
                              className="text-gray-400 hover:text-red-400"
                              aria-label="Remove course"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </li>
                        )
                      })}
                    </ul>
                  )}
                </section>
              ))}
            </div>

            {cart?.validation_issues?.length ? (
              <div className="rounded-xl border border-amber-700/50 bg-amber-950/30 p-4 mb-6 text-sm text-amber-100">
                <p className="font-medium mb-2">Validation notes</p>
                <ul className="list-disc pl-5 space-y-1">
                  {cart.validation_issues.map((issue, i) => (
                    <li key={`${issue.code}-${i}`}>{issue.message}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {(cart?.discount_breakdown?.length || 0) > 0 ? (
              <div className="rounded-xl border border-emerald-800/40 bg-emerald-950/20 p-5 mb-6">
                <p className="text-sm font-medium text-emerald-200 mb-3">Promotional discounts applied</p>
                <ul className="space-y-2 text-sm">
                  {cart?.discount_breakdown?.map((line, i) => (
                    <li
                      key={`${line.rule_code}-${i}`}
                      className="flex flex-wrap items-center justify-between gap-2 text-gray-300"
                    >
                      <span>
                        {line.rule_name || line.rule_code}
                        {line.student_line_id
                          ? ` · ${groups.find((g) => g.student_line_id === line.student_line_id)?.label || "Student"}`
                          : ""}
                      </span>
                      <span className="text-emerald-400 font-medium">−{formatInr(line.amount)}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 pt-3 border-t border-emerald-900/50 flex flex-wrap justify-between text-sm">
                  <span className="text-gray-400">Subtotal before promos</span>
                  <span className="text-gray-200">{formatInr(totals?.subtotal_amount ?? totals?.total_amount ?? 0)}</span>
                </div>
              </div>
            ) : null}

            <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-gray-400 text-sm">
                  {(totals?.promo_discount_total || 0) > 0 ? "Total after discounts" : "Cart total"}
                </p>
                <p className="text-3xl font-bold text-[#FFB70F]">
                  {formatInr(totals?.total_amount || 0)}
                </p>
                {(totals?.promo_discount_total || 0) > 0 ? (
                  <p className="text-sm text-emerald-400/90 mt-1">
                    You save {formatInr(totals?.promo_discount_total || 0)} on this cart
                  </p>
                ) : null}
                <p className="text-xs text-gray-500 mt-1">
                  {studentCount} student{studentCount === 1 ? "" : "s"} · {totals?.item_count || 0} item(s) ·
                  fees include admission where applicable
                </p>
                {cart?.discount_snapshot?.computed_at ? (
                  <p className="text-xs text-gray-600 mt-1">
                    Last validated pricing snapshot saved for checkout audit.
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="border-gray-600"
                  disabled={busy}
                  onClick={handleValidate}
                >
                  Validate cart
                </Button>
                <Button
                  type="button"
                  disabled={busy || !(totals?.item_count)}
                  className="bg-[#FFB70F] text-black hover:bg-[#FFB70F]/90"
                  onClick={() => void handleCheckout()}
                >
                  {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Proceed to checkout
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      <AlertDialog
        open={!!removeStudentTarget}
        onOpenChange={(open) => {
          if (!open) setRemoveStudentTarget(null)
        }}
      >
        <AlertDialogContent className="bg-[#171A26] border-gray-700 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#FFB70F]">Remove student from cart?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              {removeStudentTarget ? (
                <>
                  <strong className="text-gray-200">{removeStudentTarget.label}</strong> and their{" "}
                  {removeStudentTarget.items.length} course
                  {removeStudentTarget.items.length === 1 ? "" : "s"} ({formatInr(removeStudentTarget.line_total)})
                  will be removed. Other students in this cart are not affected.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-600 bg-transparent text-white hover:bg-gray-800">
              Keep student
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                if (removeStudentTarget) {
                  void handleRemoveStudent(removeStudentTarget.student_line_id)
                }
              }}
            >
              Remove student
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {multiPickerGroup ? (
        <MultiCoursePickerModal
          open={!!multiPickerGroup}
          onOpenChange={(open) => {
            if (!open) setMultiPickerGroup(null)
          }}
          studentLineId={multiPickerGroup.student_line_id}
          studentLabel={multiPickerGroup.label}
          existingItems={multiPickerGroup.items}
          onCartUpdated={(updated) => {
            setCart(updated)
            setMultiPickerGroup(null)
          }}
        />
      ) : null}
    </main>
  )
}
