import { Suspense } from "react"
import { Loader2 } from "lucide-react"
import StudentSyllabusClient from "./syllabus-client"

export default function StudentSyllabusPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[40vh] flex items-center justify-center text-slate-500 gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading…
        </div>
      }
    >
      <StudentSyllabusClient />
    </Suspense>
  )
}
