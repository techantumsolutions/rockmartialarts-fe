"use client"

import type React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CreditCard, Banknote, Loader2 } from "lucide-react"

export type PaymentConfirmationLine = {
  label: string
  value: string
  muted?: boolean
}

export type PaymentConfirmationDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  paymentMethod: "razorpay" | "physical_cash" | string
  paymentMethodLabel?: string
  lines: PaymentConfirmationLine[]
  totalLabel?: string
  totalAmount: string
  confirmLabel?: string
  cancelLabel?: string
  confirming?: boolean
  onConfirm: () => void
  footerNote?: React.ReactNode
}

function methodMeta(method: string) {
  if (method === "physical_cash") {
    return {
      label: "Physical Hand Cash",
      icon: Banknote,
      tone: "text-emerald-700 bg-emerald-50 border-emerald-200",
    }
  }
  return {
    label: "Online Payment (Razorpay)",
    icon: CreditCard,
    tone: "text-red-700 bg-red-50 border-red-200",
  }
}

/**
 * Shared pre-payment summary layer. Use before cash record or Razorpay checkout
 * when the host screen does not already show an explicit confirm step.
 */
export function PaymentConfirmationDialog({
  open,
  onOpenChange,
  title = "Confirm payment",
  description = "Review the summary below, then confirm to continue.",
  paymentMethod,
  paymentMethodLabel,
  lines,
  totalLabel = "Total payable",
  totalAmount,
  confirmLabel,
  cancelLabel = "Go back",
  confirming = false,
  onConfirm,
  footerNote,
}: PaymentConfirmationDialogProps) {
  const meta = methodMeta(paymentMethod)
  const MethodIcon = meta.icon
  const methodText = paymentMethodLabel || meta.label
  const actionLabel =
    confirmLabel ||
    (paymentMethod === "physical_cash" ? "Confirm & Record Cash" : "Confirm & Pay Online")

  return (
    <Dialog open={open} onOpenChange={(next) => !confirming && onOpenChange(next)}>
      <DialogContent className="max-w-md rounded-2xl border border-[#E8EAF0] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-3 space-y-1.5">
          <DialogTitle className="text-xl font-semibold text-[#2F3158]">{title}</DialogTitle>
          <DialogDescription className="text-sm text-[#6B7A99]">{description}</DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-4 space-y-4">
          <div
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${meta.tone}`}
          >
            <MethodIcon className="h-3.5 w-3.5" />
            {methodText}
          </div>

          <div className="rounded-xl border border-gray-200 bg-[#F8FAFC] p-4 space-y-2.5">
            {lines.map((line) => (
              <div
                key={`${line.label}-${line.value}`}
                className="flex items-start justify-between gap-4 text-sm"
              >
                <span className={line.muted ? "text-gray-400" : "text-[#6B7A99]"}>{line.label}</span>
                <span className="text-right font-medium text-[#2F3158]">{line.value}</span>
              </div>
            ))}
            <div className="border-t border-gray-200 pt-2.5 mt-1 flex items-center justify-between gap-4">
              <span className="text-sm font-semibold text-[#4F5077]">{totalLabel}</span>
              <span className="text-lg font-bold text-red-600">{totalAmount}</span>
            </div>
          </div>

          {footerNote ? <div className="text-xs text-[#6B7A99] leading-relaxed">{footerNote}</div> : null}
        </div>

        <DialogFooter className="px-6 py-4 bg-gray-50 border-t border-gray-100 gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            disabled={confirming}
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            className="rounded-xl bg-[#E1BB33] text-[#171A26] font-semibold hover:bg-[#d4ae2a]"
            disabled={confirming}
            onClick={onConfirm}
          >
            {confirming ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing…
              </>
            ) : (
              actionLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
