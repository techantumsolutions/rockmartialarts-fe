"use client"

import React from "react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { CreditCard, Banknote, ShieldCheck } from "lucide-react"
import { RegistrationPricing } from "@/lib/studentRegistrationPayment"

interface PaymentSelectionSectionProps {
  paymentMethod: "razorpay" | "physical_cash"
  onPaymentMethodChange: (val: "razorpay" | "physical_cash") => void
  cashNotes: string
  onCashNotesChange: (val: string) => void
  pricing: RegistrationPricing | null
  isLoadingPricing?: boolean
}

export default function PaymentSelectionSection({
  paymentMethod,
  onPaymentMethodChange,
  cashNotes,
  onCashNotesChange,
  pricing,
  isLoadingPricing = false,
}: PaymentSelectionSectionProps) {
  const courseFee = pricing?.course_fee ?? 0
  const admissionFee = pricing?.admission_fee ?? 500
  const totalAmount = pricing?.total_amount ?? (courseFee + admissionFee)

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2 flex items-center justify-between">
        <span>Payment & Fee Settlement</span>
        {pricing && (
          <span className="text-sm font-semibold text-red-600 bg-red-50 px-2.5 py-1 rounded-md">
            Total: ₹{totalAmount.toLocaleString("en-IN")}
          </span>
        )}
      </h3>

      {/* Pricing Breakdown Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Course Fee</p>
          <p className="text-xl font-bold text-gray-900">
            {isLoadingPricing ? "..." : `₹${courseFee.toLocaleString("en-IN")}`}
          </p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Admission Fee</p>
          <p className="text-xl font-bold text-gray-900">
            {isLoadingPricing ? "..." : `₹${admissionFee.toLocaleString("en-IN")}`}
          </p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-1">Total Payable</p>
          <p className="text-2xl font-black text-red-600">
            {isLoadingPricing ? "..." : `₹${totalAmount.toLocaleString("en-IN")}`}
          </p>
        </div>
      </div>

      {/* Payment Method Selector */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold text-gray-700">Select Payment Method</Label>
        <RadioGroup
          value={paymentMethod}
          onValueChange={(val) => onPaymentMethodChange(val as "razorpay" | "physical_cash")}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {/* Online Razorpay */}
          <label
            htmlFor="pm_online"
            className={`flex items-start p-4 rounded-xl border-2 cursor-pointer transition-all ${
              paymentMethod === "razorpay"
                ? "border-red-500 bg-red-50/40 shadow-sm"
                : "border-gray-200 hover:border-gray-300 bg-white"
            }`}
          >
            <RadioGroupItem value="razorpay" id="pm_online" className="mt-1 mr-3 text-red-600" />
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <CreditCard className="w-5 h-5 text-red-600" />
                <span className="font-semibold text-gray-900 text-sm">Online Payment (Razorpay)</span>
              </div>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                Triggers the secure Razorpay payment gateway popup (UPI, Cards, NetBanking, Wallets). Marks as paid on completion.
              </p>
            </div>
          </label>

          {/* Physical Hand Cash */}
          <label
            htmlFor="pm_cash"
            className={`flex items-start p-4 rounded-xl border-2 cursor-pointer transition-all ${
              paymentMethod === "physical_cash"
                ? "border-emerald-500 bg-emerald-50/40 shadow-sm"
                : "border-gray-200 hover:border-gray-300 bg-white"
            }`}
          >
            <RadioGroupItem value="physical_cash" id="pm_cash" className="mt-1 mr-3 text-emerald-600" />
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <Banknote className="w-5 h-5 text-emerald-600" />
                <span className="font-semibold text-gray-900 text-sm">Physical Hand Cash</span>
              </div>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                Records cash collected in hand at academy desk. Tracked separately in Cash Revenue collection and generates an official invoice.
              </p>
            </div>
          </label>
        </RadioGroup>
      </div>

      {/* Cash Reference Field */}
      {paymentMethod === "physical_cash" && (
        <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 space-y-2">
          <Label htmlFor="cash_notes" className="text-xs font-semibold text-emerald-900 uppercase tracking-wide">
            Physical Cash Receipt Note (Optional)
          </Label>
          <Input
            id="cash_notes"
            type="text"
            placeholder="e.g., Hand cash collected at desk by coach/manager"
            value={cashNotes}
            onChange={(e) => onCashNotesChange(e.target.value)}
            className="bg-white border-emerald-200 text-sm h-11"
          />
          <p className="text-[11px] text-emerald-700">
            An official invoice with payment method &ldquo;Physical Hand Cash&rdquo; will be generated and logged to the cash revenue ledger.
          </p>
        </div>
      )}

      {/* Password Setup Link Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start space-x-3">
        <ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900 leading-relaxed">
          <span className="font-semibold">Automated 24-Hour Password Setup:</span> Upon registration, an account setup link with a 24-hour expiration token will be emailed directly to the student via Resend. The student can click the link to set their password and log in immediately.
        </div>
      </div>
    </div>
  )
}

