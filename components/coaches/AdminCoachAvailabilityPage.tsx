"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import CoachAvailabilityEditor from "@/components/coaches/CoachAvailabilityEditor"
import { TokenManager } from "@/lib/tokenManager"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"
import { fetchAllCoaches, coachDisplayInfo } from "@/lib/coachFetch"

type CoachOpt = { id: string; name: string }

export default function AdminCoachAvailabilityPage() {
  const [coaches, setCoaches] = useState<CoachOpt[]>([])
  const [coachId, setCoachId] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = BranchManagerAuth.getToken() || TokenManager.getToken()
    if (!token) {
      setError("Not authenticated")
      setLoading(false)
      return
    }
    fetchAllCoaches(token, { activeOnly: false })
      .then((rows) => {
        const opts = (rows || [])
          .filter((c: { approval_status?: string }) => {
            const st = (c.approval_status || "approved").toLowerCase()
            return st === "approved" || !c.approval_status
          })
          .map((c: any) => ({
            id: c.id,
            name: coachDisplayInfo(c).full_name || c.id,
          }))
          .sort((a: CoachOpt, b: CoachOpt) => a.name.localeCompare(b.name))
        setCoaches(opts)
        if (opts[0]) setCoachId(opts[0].id)
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load coaches"))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="w-full p-4 lg:px-8 lg:py-6 space-y-6 max-w-5xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-[#4F5077]">Coach Availability</h1>
          <p className="text-sm text-[#6B7A99] mt-1">
            View and update weekly availability and service locations for coaches.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <Label className="text-xs text-[#6B7A99]">Select coach</Label>
            {loading ? (
              <div className="py-4 text-gray-500 text-sm">
                <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                Loading coaches…
              </div>
            ) : error ? (
              <p className="text-sm text-red-600 py-2">{error}</p>
            ) : (
              <Select value={coachId} onValueChange={setCoachId}>
                <SelectTrigger className="max-w-md mt-1">
                  <SelectValue placeholder="Choose a coach" />
                </SelectTrigger>
                <SelectContent>
                  {coaches.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        {coachId && !loading && !error && (
          <CoachAvailabilityEditor
            key={coachId}
            coachId={coachId}
            title="Edit availability"
            subtitle="Weekly slots and service locations for the selected coach."
          />
        )}
      </main>
    </div>
  )
}
