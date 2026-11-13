"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, ArrowRight, Home, Key, ShieldCheck } from "lucide-react"
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

  const handleGoToLogin = () => {
    onClose()
    router.push("/training-login")
  }

  const handleGoHome = () => {
    onClose()
    router.push("/")
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md border-[#FFB70F]/40 shadow-2xl p-6 overflow-hidden">
        {/* Decorative Top Accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#FFB70F] via-amber-400 to-[#FFB70F]" />

        <div className="text-center pt-2 pb-1 space-y-3">
          <div className="mx-auto w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-inner">
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <DialogHeader className="space-y-1">
            <DialogTitle className="text-xl font-bold tracking-tight text-foreground text-center">
              Request Submitted Successfully!
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground text-center">
              Your <span className="font-semibold text-foreground">{programName}</span> request has been received by Rock Martial Arts.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Details Card */}
        <div className="bg-muted/40 rounded-xl p-4 border border-border/60 text-xs space-y-2.5">
          <div className="flex justify-between items-center py-1 border-b border-border/40">
            <span className="text-muted-foreground">Request ID:</span>
            <span className="font-mono font-bold text-foreground text-xs">{requestId}</span>
          </div>

          {contactEmail && (
            <div className="flex justify-between items-center py-1 border-b border-border/40">
              <span className="text-muted-foreground">Account Email:</span>
              <span className="font-medium text-foreground">{contactEmail}</span>
            </div>
          )}

          {contactPhone && (
            <div className="flex justify-between items-center py-1 border-b border-border/40">
              <span className="text-muted-foreground">Verified Phone:</span>
              <span className="font-medium text-foreground flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-emerald-600 inline" />
                {contactPhone}
              </span>
            </div>
          )}

          {amountPaid != null && amountPaid > 0 && (
            <div className="flex justify-between items-center py-1">
              <span className="text-muted-foreground">Fee Paid:</span>
              <span className="font-bold text-emerald-600 text-sm">
                ₹{amountPaid.toLocaleString("en-IN")}
              </span>
            </div>
          )}
        </div>

        {/* Account Ready Banner */}
        <div className="rounded-lg p-3 bg-amber-500/10 border border-[#FFB70F]/30 flex items-start gap-2.5">
          <Key className="h-4 w-4 text-[#B87D00] shrink-0 mt-0.5" />
          <div className="text-xs text-foreground/90 space-y-0.5">
            <span className="font-semibold text-foreground block">
              Training Portal Account Ready
            </span>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              You can log in to your dedicated Training Dashboard anytime to track your request approval status, assigned coach details, and training schedules.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
          <Button
            type="button"
            onClick={handleGoToLogin}
            className="flex-1 bg-[#FFB70F] hover:bg-[#E5A40E] text-black font-semibold text-sm shadow hover:shadow-md transition-all gap-1.5 h-10"
          >
            <span>Go to Training Login</span>
            <ArrowRight className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleGoHome}
            className="border-input hover:bg-muted text-foreground text-sm font-medium gap-1.5 h-10"
          >
            <Home className="h-3.5 w-3.5" />
            <span>Website Home</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

