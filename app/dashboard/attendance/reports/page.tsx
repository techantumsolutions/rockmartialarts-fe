"use client"

import { Suspense } from "react"
import AttendanceReportsPage from "./AttendanceReportsClient"

export default function Page() {
  return (
    <Suspense
      fallback={
        <main className="w-full p-8 text-slate-500 text-sm">Loading attendance reports…</main>
      }
    >
      <AttendanceReportsPage />
    </Suspense>
  )
}
