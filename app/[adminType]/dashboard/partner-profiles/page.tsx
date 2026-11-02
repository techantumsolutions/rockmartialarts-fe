"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Handshake, Plus } from "lucide-react"
import { TokenManager } from "@/lib/tokenManager"
import { useDashboardBasePath } from "@/lib/useDashboardBasePath"
import { useToast } from "@/hooks/use-toast"
import { partnerOrgAPI, type PartnerOrg } from "@/lib/partnerOrgAPI"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"

export default function PartnerProfilesPage() {
  const router = useRouter()
  const basePath = useDashboardBasePath()
  const { toast } = useToast()
  const [partners, setPartners] = useState<PartnerOrg[]>([])
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!TokenManager.isAuthenticated()) {
      router.push("/superadmin/login")
      return
    }
    setLoading(true)
    try {
      const data = await partnerOrgAPI.list({ limit: 200, include_inactive: true })
      setPartners(Array.isArray(data.partners) ? data.partners : [])
    } catch (e: any) {
      toast({
        title: "Could not load partners",
        description: e?.message || "Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [router, toast])

  useEffect(() => {
    void load()
  }, [load])

  async function toggleActive(p: PartnerOrg, next: boolean) {
    setTogglingId(p.id)
    try {
      await partnerOrgAPI.setActive(p.id, next)
      setPartners((prev) =>
        prev.map((row) =>
          row.id === p.id
            ? { ...row, is_active: next, status: next ? row.status : "disabled" }
            : row
        )
      )
      toast({
        title: next ? "Partner enabled" : "Partner disabled",
        description: next
          ? "This partner can log in to their white-label dashboard."
          : "This partner cannot log in to their dashboard.",
      })
    } catch (e: any) {
      toast({
        title: "Status update failed",
        description: e?.message || "Please try again.",
        variant: "destructive",
      })
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <div className="w-full p-4 lg:px-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-1 rounded-md bg-amber-50 border border-amber-200 p-2">
            <Handshake className="w-5 h-5 text-amber-800" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[#1a2332]">Partner Organizations</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Create white-label partners. Each partner gets an invite email, own login URL, and an
              isolated admin dashboard.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`${basePath}/partner-profiles/create`)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Partner
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Partners</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500 py-10 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading partners…
            </div>
          ) : partners.length === 0 ? (
            <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-600">
              No partners yet. Use <span className="font-medium">Create Partner</span> to add one.
              <div className="mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`${basePath}/partner-profiles/create`)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Partner
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border border-gray-100">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2.5 font-semibold">Partner</th>
                    <th className="px-3 py-2.5 font-semibold">Email</th>
                    <th className="px-3 py-2.5 font-semibold">Mobile</th>
                    <th className="px-3 py-2.5 font-semibold">Payment</th>
                    <th className="px-3 py-2.5 font-semibold">Status</th>
                    <th className="px-3 py-2.5 font-semibold">Login URL</th>
                    <th className="px-3 py-2.5 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {partners.map((p) => {
                    const enabled = p.is_active !== false && p.status !== "disabled"
                    return (
                      <tr
                        key={p.id}
                        className={`border-t ${enabled ? "bg-white" : "bg-gray-50/80"}`}
                      >
                        <td className="px-3 py-2.5 font-medium text-gray-900">
                          <div>{p.name}</div>
                          <div className="text-xs text-gray-400 font-mono">{p.slug}</div>
                        </td>
                        <td className="px-3 py-2.5 text-gray-600">{p.email}</td>
                        <td className="px-3 py-2.5 text-gray-600">{p.phone}</td>
                        <td className="px-3 py-2.5 capitalize text-gray-600">
                          {(p.payment_method || "—").replace("_", " ")}
                          {p.payment_status ? (
                            <span className="text-xs text-gray-400 block">{p.payment_status}</span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge variant="outline" className="capitalize">
                            {p.status || "—"}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-xs text-gray-600">
                          {p.login_path || (p.slug ? `/partners/${p.slug}/login` : "—")}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs text-gray-500 whitespace-nowrap">
                              {enabled ? "Enabled" : "Disabled"}
                            </span>
                            <Switch
                              checked={enabled}
                              disabled={togglingId === p.id}
                              className="data-[state=checked]:bg-yellow-400"
                              onCheckedChange={(checked) => void toggleActive(p, checked)}
                            />
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
