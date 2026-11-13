"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, ArrowRight, Home, Key, ShieldCheck, LogIn } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

type Props = {
  isOpen: boolean
  onClose: () => void
  requestId: string
  programName: string
  contactEmail?: string
  contactPhone?: string
  amountPaid?: number
}

export function TrainingRequestSuccessModal({
  isOpen,
  onClose,
  requestId,
  programName,
  contactEmail,
  contactPhone,
  amountPaid,
}: Props) {
  const router = useRouter()
  const [countdown, setCountdown] = useState(5)
  const [autoRedirectPaused, setAutoRedirectPaused] = useState(false)

  // Auto-redirect countdown to login page
  useEffect(() => {
    if (!isOpen || autoRedirectPaused) return

    if (countdown <= 0) {
      onClose()
      router.push("/training-login")
      return
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [isOpen, countdown, autoRedirectPaused, onClose, router])

  const handleGoToLogin = () => {
    onClose()
    router.push("/training-login")
  }

  const handleStayOnSite = () => {
    setAutoRedirectPaused(true)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleStayOnSite()}>
      <DialogContent className="sm:max-w-md bg-gray-900 border-gray-800 text-white shadow-2xl p-6 overflow-hidden">
        {/* Decorative Top Accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#FFB70F] via-amber-400 to-[#FFB70F]" />

        <div className="text-center pt-2 pb-1 space-y-3">
          <div className="mx-auto w-14 h-14 rounded-full bg-emerald-950/80 border border-emerald-700/60 flex items-center justify-center text-emerald-400 shadow-inner">
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <DialogHeader className="space-y-1">
            <DialogTitle className="text-xl font-bold tracking-tight text-white text-center">
              Request Submitted Successfully!
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-300 text-center">
              Your <span className="font-semibold text-white">{programName}</span> request has been received by Rock Martial Arts.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Details Card */}
        <div className="bg-gray-950/80 rounded-xl p-4 border border-gray-800 text-xs space-y-2.5 text-gray-300">
          <div className="flex justify-between items-center py-1 border-b border-gray-800">
            <span className="text-gray-400">Request ID:</span>
            <span className="font-mono font-bold text-white text-xs">{requestId}</span>
          </div>

          {contactEmail && (
            <div className="flex justify-between items-center py-1 border-b border-gray-800">
              <span className="text-gray-400">Account Email:</span>
              <span className="font-medium text-white">{contactEmail}</span>
            </div>
          )}

          {contactPhone && (
            <div className="flex justify-between items-center py-1 border-b border-gray-800">
              <span className="text-gray-400">Verified Phone:</span>
              <span className="font-medium text-white flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-emerald-400 inline" />
                {contactPhone}
              </span>
            </div>
          )}

          {amountPaid != null && amountPaid > 0 && (
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-400">Fee Paid:</span>
              <span className="font-bold text-emerald-400 text-sm">
                ₹{amountPaid.toLocaleString("en-IN")}
              </span>
            </div>
          )}
        </div>

        {/* Account Ready Banner */}
        <div className="rounded-lg p-3 bg-[#FFB70F]/10 border border-[#FFB70F]/30 flex items-start gap-2.5">
          <Key className="h-4 w-4 text-[#FFB70F] shrink-0 mt-0.5" />
          <div className="text-xs text-gray-200 space-y-0.5">
            <span className="font-semibold text-white block">
              Training Portal Account Ready
            </span>
            <p className="text-gray-300 text-[11px] leading-relaxed">
              Use your registered email or phone with your password to log in and track your training request progress.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          <Button
            type="button"
            onClick={handleGoToLogin}
            className="w-full bg-[#FFB70F] hover:bg-[#e0a00d] text-black font-bold text-sm shadow-md hover:shadow-lg transition-all gap-2 h-11"
          >
            <LogIn className="h-4 w-4" />
            <span>
              Proceed to Training Login {!autoRedirectPaused && `(${countdown}s)`}
            </span>
            <ArrowRight className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleStayOnSite}
            className="w-full border-gray-700 bg-gray-950/60 hover:bg-gray-800 text-gray-300 hover:text-white text-xs font-medium gap-1.5 h-9"
          >
            <Home className="h-3.5 w-3.5" />
            <span>Stay on website</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
