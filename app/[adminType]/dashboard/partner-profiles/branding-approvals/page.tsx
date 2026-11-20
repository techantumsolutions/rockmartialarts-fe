"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  CheckCircle2,
  Loader2,
  RefreshCw,
  Shield,
  XCircle,
  Ban,
} from "lucide-react"
import {
  AdminCard,
  AdminPageHeader,
  AdminPageShell,
  AdminTableShell,
} from "@/components/dashboard/AdminPageShell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { TokenManager } from "@/lib/tokenManager"
import {
  partnerOrgAPI,
  type PartnerBrandingEditRequest,
} from "@/lib/partnerOrgAPI"
import { useDashboardBasePath } from "@/lib/useDashboardBasePath"

function fmtDate(iso?: string | null) {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

const STATUS_CLASS: Record<string, string> = {
  pending: "bg-amber-50 text-amber-900 border-amber-200",
  approved: "bg-green-50 text-green-800 border-green-200",
  rejected: "bg-red-50 text-red-800 border-red-200",
  revoked: "bg-gray-100 text-gray-700 border-gray-200",
}

export default function PartnerBrandingApprovalsPage() {
  const router = useRouter()
  const basePath = useDashboardBasePath()
  const { toast } = useToast()
  const [rows, setRows] = useState<PartnerBrandingEditRequest[]>([])
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState("pending")
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState<string | null>(null)
  const [reasonOpen, setReasonOpen] = useState(false)
  const [reasonAction, setReasonAction] = useState<"reject" | "revoke" | null>(null)
  const [reasonTarget, setReasonTarget] = useState<PartnerBrandingEditRequest | null>(null)
  const [reason, setReason] = useState("")

  const load = useCallback(async () => {
    if (!TokenManager.isAuthenticated()) {
      router.push("/superadmin/login")
      return
    }
    try {
      setLoading(true)
      const data = await partnerOrgAPI.listBrandingEditRequests({
        status,
        skip: 0,
        limit: 100,
      })
      setRows(data.requests || [])
      setTotal(data.total || 0)
    } catch (e: unknown) {
      toast({
        title: "Failed to load",
        description: e instanceof Error ? e.message : "Could not load requests",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [router, status, toast])

  useEffect(() => {
    load()
  }, [load])

  async function approve(row: PartnerBrandingEditRequest) {
    if (!row.id) return
    try {
      setActingId(row.id)
      await partnerOrgAPI.approveBrandingEditRequest(row.id)
      toast({
        title: "Approved",
        description: row.branch_id
          ? "Partner can now edit this academy's branding."
          : "Partner can now edit organization branding.",
      })
      await load()
    } catch (e: unknown) {
      toast({
        title: "Approve failed",
        description: e instanceof Error ? e.message : "Could not approve",
        variant: "destructive",
      })
    } finally {
      setActingId(null)
    }
  }

  function openReject(row: PartnerBrandingEditRequest) {
    setReasonTarget(row)
    setReasonAction("reject")
    setReason("")
    setReasonOpen(true)
  }

  function openRevoke(row: PartnerBrandingEditRequest) {
    setReasonTarget(row)
    setReasonAction("revoke")
    setReason("")
    setReasonOpen(true)
  }

  async function confirmReasonAction() {
    if (!reasonTarget || !reasonAction) return
    try {
      setActingId(reasonTarget.id || reasonTarget.partner_org_id || "acting")
      if (reasonAction === "reject" && reasonTarget.id) {
        await partnerOrgAPI.rejectBrandingEditRequest(reasonTarget.id, reason || undefined)
        toast({ title: "Rejected", description: "Request rejected." })
      } else if (reasonAction === "revoke" && reasonTarget.partner_org_id) {
        await partnerOrgAPI.revokeBrandingEditAccess(
          reasonTarget.partner_org_id,
          reason || undefined,
          reasonTarget.branch_id || undefined
        )
        toast({
          title: "Revoked",
          description: reasonTarget.branch_id
            ? "Academy branding edit access revoked."
            : "Organization branding edit access revoked.",
        })
      }
      setReasonOpen(false)
      await load()
    } catch (e: unknown) {
      toast({
        title: "Action failed",
        description: e instanceof Error ? e.message : "Could not complete action",
        variant: "destructive",
      })
    } finally {
      setActingId(null)
    }
  }

  return (
    <AdminPageShell>
      <AdminPageHeader
        title="Partner Edit Approvals"
        subtitle="Approve partner requests for Organization Branding or Edit Academy access."
        actions={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`${basePath}/partner-profiles`)}
            >
              Back to Partners
            </Button>
            <Button type="button" variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        }
      />

      <AdminCard>
        <div className="flex flex-col sm:flex-row sm:items-end gap-3 mb-4">
          <div className="space-y-1.5 w-full sm:w-56">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="revoked">Revoked</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-sm text-gray-500 pb-2">{total} request{total === 1 ? "" : "s"}</p>
        </div>

        <AdminTableShell>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="py-2 pr-3 font-medium">Partner</th>
                <th className="py-2 pr-3 font-medium">Scope</th>
                <th className="py-2 pr-3 font-medium">Requested by</th>
                <th className="py-2 pr-3 font-medium">Requested at</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 pr-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-gray-500">
                    <Loader2 className="inline h-4 w-4 animate-spin mr-2" />
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-gray-500">
                    <Shield className="inline h-4 w-4 mr-2" />
                    No edit access requests found.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const st = (row.status || "").toLowerCase()
                  const busy = actingId === row.id
                  const isAcademy = !!(row.branch_id || row.scope === "academy")
                  return (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="py-3 pr-3">
                        <div className="font-medium text-[#1a2332]">
                          {row.partner_name || "Partner"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {row.partner_slug || row.partner_org_id}
                        </div>
                      </td>
                      <td className="py-3 pr-3">
                        <div className="font-medium text-[#1a2332]">
                          {isAcademy ? "Edit Academy" : "Organization Branding"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {isAcademy
                            ? row.branch_name || row.branch_id || "—"
                            : "Org branding page"}
                        </div>
                      </td>
                      <td className="py-3 pr-3">
                        <div>{row.requested_by_name || "—"}</div>
                        <div className="text-xs text-gray-500">
                          {row.requested_by_email || ""}
                        </div>
                      </td>
                      <td className="py-3 pr-3 whitespace-nowrap">
                        {fmtDate(row.requested_at)}
                      </td>
                      <td className="py-3 pr-3">
                        <span
                          className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-medium capitalize ${
                            STATUS_CLASS[st] || STATUS_CLASS.pending
                          }`}
                        >
                          {st || "—"}
                        </span>
                      </td>
                      <td className="py-3 pr-3">
                        <div className="flex flex-wrap gap-2">
                          {st === "pending" && (
                            <>
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white"
                                disabled={busy}
                                onClick={() => approve(row)}
                              >
                                {busy ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                )}
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={busy}
                                onClick={() => openReject(row)}
                              >
                                <XCircle className="h-3.5 w-3.5 mr-1" />
                                Reject
                              </Button>
                            </>
                          )}
                          {st === "approved" && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              onClick={() => openRevoke(row)}
                            >
                              <Ban className="h-3.5 w-3.5 mr-1" />
                              Revoke
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </AdminTableShell>
      </AdminCard>

      <Dialog open={reasonOpen} onOpenChange={setReasonOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reasonAction === "revoke" ? "Revoke branding edit access" : "Reject request"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="review-reason">Reason (optional)</Label>
            <Input
              id="review-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Optional note for the partner"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReasonOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmReasonAction} disabled={!!actingId}>
              {actingId ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  )
}
