"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertCircle, CreditCard, Calendar } from "lucide-react"

interface SubscriptionExpiredModalProps {
  isOpen: boolean
  expiryDate?: string
  paymentStatus?: string
  onClose?: () => void
}

export default function SubscriptionExpiredModal({
  isOpen,
  expiryDate,
  paymentStatus,
  onClose
}: SubscriptionExpiredModalProps) {
  const router = useRouter()
  const [isNavigating, setIsNavigating] = useState(false)

  const handlePaymentRedirect = async () => {
    setIsNavigating(true)
    try {
      await router.push('/student-dashboard/payments')
    } catch (error) {
      console.error('Navigation error:', error)
      setIsNavigating(false)
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown'
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch {
      return 'Unknown'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]" 
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <AlertCircle className="h-10 w-10 text-red-600" />
          </div>
          <DialogTitle className="text-center text-2xl">
            Subscription Expired
          </DialogTitle>
          <DialogDescription className="text-center pt-2">
            Your subscription has expired and you no longer have access to the platform.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg bg-gray-50 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-gray-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Expiry Date</p>
                <p className="text-sm text-gray-600">{formatDate(expiryDate)}</p>
              </div>
            </div>

            {paymentStatus && (
              <div className="flex items-start gap-3">
                <CreditCard className="h-5 w-5 text-gray-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Payment Status</p>
                  <p className="text-sm text-gray-600 capitalize">{paymentStatus}</p>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">
              To Continue Your Training:
            </h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Renew your subscription to regain full access</li>
              <li>• Access all your courses and training materials</li>
              <li>• Track your progress and achievements</li>
              <li>• Connect with instructors and fellow students</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            onClick={handlePaymentRedirect}
            disabled={isNavigating}
            className="w-full"
          >
            {isNavigating ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Redirecting...
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-4 w-4" />
                Go to Payment Page
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
