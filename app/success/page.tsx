import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function SuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center space-y-6 max-w-md mx-auto px-8">
        {/* Success Message */}
        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-black">Successfully Password Reset</h1>
          <p className="text-gray-600">Your password has been successfully reset</p>
          <p className="text-gray-600">Click below to login</p>
        </div>

        {/* Login Button */}
        <Link href="/login">
          <Button className="w-full  font-bold py-3 rounded-lg text-lg">
            login
          </Button>
        </Link>
      </div>
    </div>
  )
}
