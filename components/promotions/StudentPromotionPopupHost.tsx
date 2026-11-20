"use client"

import { Suspense } from "react"
import StudentPromotionPopup from "@/components/promotions/StudentPromotionPopup"

/** Root-level host so the login promo works on any post-login route (dashboard, courses, cart). */
export function StudentPromotionPopupHost() {
  return (
    <Suspense fallback={null}>
      <StudentPromotionPopup />
    </Suspense>
  )
}
