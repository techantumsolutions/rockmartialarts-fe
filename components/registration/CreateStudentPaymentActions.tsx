"use client"

import { Button } from "@/components/ui/button"
import { PaymentConfirmationDialog } from "@/components/payment/PaymentConfirmationDialog"
import { useState } from "react"

export type CreateStudentPaymentSummary = {
  studentName: string
  academyName: string
  courseName: string
  batchName: string
  durationName: string
  courseFee?: number
  admissionFee?: number
  quotedTotal?: number
  cashAmount?: string
}

type Props = {
  isSubmitting: boolean
  disabled?: boolean
  /** Selected method from Payment & Fee Settlement radios */
  paymentMethod: "razorpay" | "physical_cash"
  onCancel: () => void
  summary: CreateStudentPaymentSummary
  /** Return false to block opening the confirmation dialog */
  onBeforeConfirm: (method: "razorpay" | "physical_cash") => boolean
  onConfirmPayment: (method: "razorpay" | "physical_cash") => void | Promise<void>
  primaryButtonClassName?: string
  cancelButtonClassName?: string
}

function formatInr(n: number) {
  return `₹${(Number.isFinite(n) ? n : 0).toLocaleString("en-IN")}`
}

/**
 * Cancel + Proceed to Payment — uses the payment method selected above,
 * then opens a shared payment summary confirmation step.
 */
export function CreateStudentPaymentActions({
  isSubmitting,
  disabled = false,
  paymentMethod,
  onCancel,
  summary,
  onBeforeConfirm,
  onConfirmPayment,
  primaryButtonClassName = "h-12 px-6 rounded-xl font-semibold bg-[#E1BB33] text-[#171A26] hover:bg-[#d4ae2a]",
  cancelButtonClassName = "h-12 px-8 rounded-xl font-medium border-gray-300",
}: Props) {
  const [open, setOpen] = useState(false)

  const requestProceed = () => {
    if (!onBeforeConfirm(paymentMethod)) return
    setOpen(true)
  }

  const cashNum = Number(summary.cashAmount)
  const total =
    paymentMethod === "physical_cash" && Number.isFinite(cashNum) && cashNum > 0
      ? cashNum
      : Number(summary.quotedTotal || 0)

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
        disabled={isSubmitting}
        className={cancelButtonClassName}
      >
        Cancel
      </Button>
      <Button
        type="button"
        disabled={isSubmitting || disabled}
        className={primaryButtonClassName}
        onClick={requestProceed}
      >
        Proceed to Payment
      </Button>

      <PaymentConfirmationDialog
        open={open}
        onOpenChange={(next) => {
          if (!isSubmitting) setOpen(next)
        }}
        paymentMethod={paymentMethod}
        title="Confirm student payment"
        description="Review the registration summary, then confirm to continue."
        lines={[
          { label: "Student", value: summary.studentName || "—" },
          { label: "Academy", value: summary.academyName || "—" },
          { label: "Course", value: summary.courseName || "—" },
          { label: "Batch", value: summary.batchName || "—" },
          { label: "Duration", value: summary.durationName || "—" },
          ...(paymentMethod === "razorpay"
            ? [
                {
                  label: "Course fee",
                  value: formatInr(Number(summary.courseFee || 0)),
                  muted: true,
                },
                {
                  label: "Admission fee",
                  value: formatInr(Number(summary.admissionFee || 0)),
                  muted: true,
                },
              ]
            : [
                {
                  label: "Cash amount entered",
                  value: formatInr(Number.isFinite(cashNum) ? cashNum : 0),
                  muted: true,
                },
              ]),
        ]}
        totalAmount={formatInr(total)}
        confirming={isSubmitting}
        confirmLabel={
          paymentMethod === "physical_cash" ? "Confirm & Record Cash" : "Confirm & Pay Online"
        }
        footerNote={
          paymentMethod === "physical_cash"
            ? "Cash will be logged to the academy cash ledger and an invoice will be generated."
            : "Razorpay will open next. The student is created only after successful online payment."
        }
        onConfirm={() => {
          setOpen(false)
          void onConfirmPayment(paymentMethod)
        }}
      />
    </>
  )
}
