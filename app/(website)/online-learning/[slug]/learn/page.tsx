"use client"

import { Suspense } from "react"
import { Loader2 } from "lucide-react"
import LearningPlayerPage from "@/components/online-learning/LearningPlayerPage"

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#171A26] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#FFB70F]" />
        </div>
      }
    >
      <LearningPlayerPage />
    </Suspense>
  )
}
