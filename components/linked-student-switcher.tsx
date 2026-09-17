"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { Users, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TokenManager, type LinkedStudentProfile } from "@/lib/tokenManager"
import { getBackendApiUrl } from "@/lib/config"

function relationshipLabel(value?: string) {
  if (!value) return ""
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, " ")
}

export default function LinkedStudentSwitcher() {
  const pathname = usePathname()
  const [profiles, setProfiles] = useState<LinkedStudentProfile[]>([])
  const [currentId, setCurrentId] = useState<string>("")
  const [switchingId, setSwitchingId] = useState<string | null>(null)

  const loadLocal = () => {
    const user = TokenManager.getUser()
    setCurrentId(user?.id || "")
    setProfiles(TokenManager.getProfiles())
  }

  useEffect(() => {
    loadLocal()
    const token = TokenManager.getToken()
    if (!token) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(getBackendApiUrl("auth/profiles"), {
          headers: TokenManager.getAuthHeaders(),
        })
        if (!res.ok) return
        const data = await res.json()
        const list = Array.isArray(data.profiles) ? data.profiles : []
        if (cancelled) return
        TokenManager.setProfiles(list)
        setProfiles(list)
        if (data.current_student_id || data.active_student_id) {
          setCurrentId(data.active_student_id || data.current_student_id)
        }
      } catch {
        // keep local cache
      }
    })()
    return () => {
      cancelled = true
    }
  }, [pathname])

  const handleSwitch = async (studentId: string) => {
    if (!studentId || studentId === currentId || switchingId) return
    setSwitchingId(studentId)
    try {
      const res = await fetch(getBackendApiUrl("auth/switch-student"), {
        method: "POST",
        headers: TokenManager.getAuthHeaders(),
        body: JSON.stringify({ student_id: studentId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.access_token || !data.user) {
        const detail =
          typeof data.detail === "string" ? data.detail : "Could not switch student"
        throw new Error(detail)
      }
      TokenManager.storeAuthData({
        access_token: data.access_token,
        token_type: data.token_type,
        expires_in: data.expires_in,
        user: data.user,
        profiles: data.profiles,
        account_id: data.account_id,
        active_student_id: data.active_student_id || data.user?.id,
      })
      window.location.assign(pathname || "/student-dashboard")
    } catch (err) {
      console.error("Switch student failed:", err)
      setSwitchingId(null)
    }
  }

  const current =
    profiles.find((p) => p.id === currentId) ||
    profiles[0] ||
    null
  const label = current?.full_name || TokenManager.getUser()?.full_name || "Student"

  if (profiles.length < 2) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex border border-gray-200 items-center space-x-2 hover:bg-gray-100/80 rounded-lg px-2 py-2 transition-all duration-200 hover:shadow-sm max-w-[220px]"
          aria-label="Switch linked student"
        >
          <Users className="w-4 h-4 text-gray-700 shrink-0" />
          <span className="text-xs font-semibold text-gray-800 truncate hidden sm:inline">
            {label}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent
          align="end"
          className="w-64 z-[1000] bg-white/95 backdrop-blur-md border border-gray-200/50 shadow-xl rounded-lg p-2"
          sideOffset={8}
        >
          <DropdownMenuLabel className="text-xs text-gray-500 font-medium px-2 py-1">
            Linked students
          </DropdownMenuLabel>
          {profiles.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">Only this student</div>
          ) : (
            profiles.map((p) => {
              const active = p.id === currentId
              return (
                <DropdownMenuItem
                  key={p.id}
                  disabled={!!switchingId}
                  onClick={() => handleSwitch(p.id)}
                  className={`cursor-pointer rounded-md px-3 py-2 text-sm ${
                    active ? "bg-yellow-50 text-gray-900" : "text-gray-700"
                  }`}
                >
                  <span className="flex-1 min-w-0">
                    <span className="block truncate font-medium">{p.full_name}</span>
                    {p.relationship ? (
                      <span className="block text-xs text-gray-500">
                        {relationshipLabel(p.relationship)}
                      </span>
                    ) : null}
                  </span>
                  {switchingId === p.id ? (
                    <Loader2 className="w-4 h-4 animate-spin ml-2 shrink-0" />
                  ) : active ? (
                    <Check className="w-4 h-4 text-yellow-600 ml-2 shrink-0" />
                  ) : null}
                </DropdownMenuItem>
              )
            })
          )}
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  )
}
