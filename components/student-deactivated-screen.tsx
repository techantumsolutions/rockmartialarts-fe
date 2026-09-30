"use client"

import { useState } from "react"
import { Loader2, LogOut, ShieldOff, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TokenManager, type LinkedStudentProfile } from "@/lib/tokenManager"
import { buildLoginUrl } from "@/lib/sessionAuth"
import {
  STUDENT_DEACTIVATED_MESSAGE,
  isProfileDeactivated,
  switchStudentProfile,
} from "@/lib/studentSessionStatus"

interface StudentDeactivatedScreenProps {
  studentName?: string
  currentStudentId?: string
  profiles: LinkedStudentProfile[]
}

function relationshipLabel(value?: string) {
  if (!value) return ""
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, " ")
}

export default function StudentDeactivatedScreen({
  studentName,
  currentStudentId,
  profiles,
}: StudentDeactivatedScreenProps) {
  const [switchingId, setSwitchingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const activeSiblings = profiles.filter(
    (p) => p.id && p.id !== currentStudentId && !isProfileDeactivated(p)
  )

  const handleSwitch = async (studentId: string) => {
    if (switchingId) return
    setSwitchingId(studentId)
    setError(null)
    try {
      await switchStudentProfile(studentId)
      window.location.assign("/student-dashboard")
    } catch (err: any) {
      setError(err?.message || "Could not switch student")
      setSwitchingId(null)
    }
  }

  const handleLogout = () => {
    TokenManager.clearAuthData()
    window.location.assign(buildLoginUrl())
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4">
      <div className="text-center max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <ShieldOff className="h-9 w-9 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          {studentName ? (
            <p className="text-sm font-medium text-gray-800 mb-2">{studentName}</p>
          ) : null}
          <p className="text-gray-600 mb-6">{STUDENT_DEACTIVATED_MESSAGE}</p>

          {activeSiblings.length > 0 ? (
            <div className="text-left mb-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                Switch to another student
              </p>
              <div className="space-y-2">
                {activeSiblings.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    disabled={!!switchingId}
                    onClick={() => handleSwitch(p.id)}
                    className="w-full flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors disabled:opacity-60"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-yellow-50">
                      <UserRound className="h-4 w-4 text-yellow-700" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block truncate text-sm font-medium text-gray-900">
                        {p.full_name}
                      </span>
                      {p.relationship ? (
                        <span className="block text-xs text-gray-500">
                          {relationshipLabel(p.relationship)}
                        </span>
                      ) : null}
                    </span>
                    {switchingId === p.id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-gray-500 shrink-0" />
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {error ? <p className="text-sm text-red-600 mb-4">{error}</p> : null}

          <Button variant="outline" className="w-full" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Log out
          </Button>
        </div>
      </div>
    </div>
  )
}
