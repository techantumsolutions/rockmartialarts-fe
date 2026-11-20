"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { CheckCircle } from "lucide-react"

export default function RegistrationCompletePage() {
  const router = useRouter()

  const handleGoToLogin = () => {
    router.push("/login")
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-gray-50">
      <div className="w-full max-w-md text-center space-y-6">
        {/* Success Icon */}
        <div className="flex justify-center">
          <CheckCircle className="w-20 h-20 text-green-500" />
        </div>

        {/* Success Message */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-black">Registration Complete!</h1>
          <p className="text-gray-500 text-sm">
            Your registration has been successfully submitted. Welcome to Rock Martial Arts Branch!
          </p>
          <p className="text-gray-500 text-sm">Click below to login to your account.</p>
        </div>

        {/* Login Button */}
        <Button
          onClick={handleGoToLogin}
          className="w-full  font-bold py-3 rounded-lg text-lg"
        >
          Go to Login
        </Button>

        {/* Step Indicator */}
        <div className="text-center">
          <span className="text-gray-400 text-sm">Registration Complete</span>
        </div>
      </div>
    </div>
  )
}
