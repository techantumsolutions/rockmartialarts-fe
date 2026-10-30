"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Loader2, Star } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { TokenManager } from "@/lib/tokenManager"
import { getBackendApiUrl } from "@/lib/config"
import { resolvePublicAssetUrl } from "@/lib/resolvePublicAssetUrl"

type Row = {
  id: string
  student_id: string
  student_name?: string
  branch_id?: string
  branch_name?: string
  title: string
  description?: string | null
  images?: string[]
  is_featured?: boolean
  created_at?: string
}

export default function ManageShowcaseAchievementsPage() {
  const params = useParams()
  const router = useRouter()
  const adminType = ((params?.adminType as string) || "super-admin").toLowerCase().replace(/_/g, "-")
  const isSuperAdmin = adminType === "super-admin"
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<Row[]>([])
  const [search, setSearch] = useState("")
  const [togglingId, setTogglingId] = useState<string | null>(null)

  useEffect(() => {
    if (!isSuperAdmin) {
      router.replace(`/${adminType}/dashboard`)
    }
  }, [isSuperAdmin, adminType, router])

  const load = useCallback(async () => {
    const token = TokenManager.getToken()
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch(getBackendApiUrl("achievements/manage/showcase"), {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      })
      if (!res.ok) throw new Error("Failed to load")
      const data = await res.json()
      setRows(Array.isArray(data.achievements) ? data.achievements : [])
    } catch {
      toast({ title: "Error", description: "Could not load achievements", variant: "destructive" })
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    if (!isSuperAdmin) return
    load()
  }, [isSuperAdmin, load])

  const toggleFeatured = async (row: Row) => {
    const token = TokenManager.getToken()
    if (!token) return
    const next = !row.is_featured
    setTogglingId(row.id)
    try {
      const res = await fetch(getBackendApiUrl(`achievements/${encodeURIComponent(row.id)}/featured`), {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ is_featured: next }),
      })
      if (!res.ok) throw new Error("Update failed")
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, is_featured: next } : r)))
      toast({
        title: next ? "Featured on homepage" : "Removed from homepage",
        description: row.title,
      })
    } catch {
      toast({ title: "Error", description: "Could not update featured status", variant: "destructive" })
    } finally {
      setTogglingId(null)
    }
  }

  const filtered = rows.filter((r) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      (r.student_name || "").toLowerCase().includes(q) ||
      (r.title || "").toLowerCase().includes(q) ||
      (r.branch_name || "").toLowerCase().includes(q)
    )
  })

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-10 h-10 animate-spin text-[#E1BB33]" />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-10 h-10 animate-spin text-[#E1BB33]" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Homepage achievements</h1>
          <p className="text-gray-600 text-sm mt-1">
            Achievements are created on the student details page. Mark them as{" "}
            <span className="font-medium text-gray-800">Featured</span> here to show them on the home page.
          </p>
        </div>
        <Input
          placeholder="Search student, title, branch…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>

      <div className="rounded-lg border border-gray-200 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left">
              <th className="p-3 font-medium w-16">Image</th>
              <th className="p-3 font-medium">Student</th>
              <th className="p-3 font-medium">Title</th>
              <th className="p-3 font-medium">Branch</th>
              <th className="p-3 font-medium text-center">Featured</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const img = Array.isArray(r.images) && r.images[0] ? resolvePublicAssetUrl(r.images[0]) : ""
              return (
                <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50/80">
                  <td className="p-3">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img} alt="" className="w-12 h-12 rounded object-cover bg-gray-100" />
                    ) : (
                      <div className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center text-gray-400">
                        <Star className="w-4 h-4" />
                      </div>
                    )}
                  </td>
                  <td className="p-3 font-medium text-gray-900">{r.student_name || "Student"}</td>
                  <td className="p-3 text-gray-700 max-w-[240px]">
                    <div className="font-medium truncate">{r.title}</div>
                    {r.description ? (
                      <div className="text-xs text-gray-500 truncate mt-0.5">{r.description}</div>
                    ) : null}
                  </td>
                  <td className="p-3 text-gray-700">{r.branch_name || "—"}</td>
                  <td className="p-3">
                    <div className="flex items-center justify-center gap-2">
                      <Switch
                        checked={!!r.is_featured}
                        disabled={togglingId === r.id}
                        onCheckedChange={() => toggleFeatured(r)}
                        aria-label={r.is_featured ? "Unfeature achievement" : "Feature on homepage"}
                      />
                      {togglingId === r.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                      ) : r.is_featured ? (
                        <span className="text-xs font-medium text-amber-600">On home</span>
                      ) : (
                        <span className="text-xs text-gray-400">Off</span>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500">
                  No student achievements yet. Add them from a student&apos;s details page first.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
