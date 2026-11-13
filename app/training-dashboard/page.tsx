"use client"

import React, { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import {
  Calendar,
  Clock,
  MapPin,
  PlusCircle,
  RefreshCw,
  Search,
  UserCheck,
  Building,
  GraduationCap,
  School,
  Home,
  Tent,
  Eye,
  CheckCircle,
  AlertCircle,
  FileText,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  trainingRequestAPI,
  type TrainingRequest,
  type TrainingRequestType,
  statusLabel,
  typeLabel,
  paymentStatusLabel,
} from "@/lib/trainingRequestAPI"

export default function TrainingDashboardPage() {
  const [requests, setRequests] = useState<TrainingRequest[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [selectedRequest, setSelectedRequest] = useState<TrainingRequest | null>(null)

  const loadRequests = useCallback(async () => {
    setLoading(true)
    try {
      const res = await trainingRequestAPI.getMyRequests({
        status: statusFilter,
        type: typeFilter,
        search: search.trim() || undefined,
      })
      setRequests(res.requests || [])
      setTotal(res.total || 0)
    } catch (err) {
      console.error("Failed to load training requests:", err)
      setRequests([])
    } finally {
      setLoading(false)
    }
  }, [statusFilter, typeFilter, search])

  useEffect(() => {
    loadRequests()
  }, [loadRequests])

  // Metric counters
  const totalCount = requests.length
  const underReviewCount = requests.filter(
    (r) => r.status === "submitted" || r.status === "under_review"
  ).length
  const coachAssignedCount = requests.filter(
    (r) => r.status === "coach_assigned"
  ).length
  const scheduledCount = requests.filter((r) => r.status === "scheduled").length
  const completedCount = requests.filter((r) => r.status === "completed").length

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">Completed</Badge>
      case "scheduled":
        return <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30">Scheduled</Badge>
      case "coach_assigned":
        return <Badge className="bg-purple-500/15 text-purple-600 border-purple-500/30">Coach Assigned</Badge>
      case "under_review":
        return <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30">Under Review</Badge>
      case "submitted":
        return <Badge className="bg-yellow-500/15 text-[#B87D00] border-yellow-500/30">Submitted</Badge>
      case "rejected":
        return <Badge className="bg-red-500/15 text-red-600 border-red-500/30">Rejected</Badge>
      case "cancelled":
        return <Badge className="bg-gray-500/15 text-gray-600 border-gray-500/30">Cancelled</Badge>
      default:
        return <Badge variant="outline">{statusLabel(status)}</Badge>
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "corporate":
        return <Building className="h-4 w-4 text-blue-500" />
      case "college":
        return <GraduationCap className="h-4 w-4 text-emerald-500" />
      case "school":
        return <School className="h-4 w-4 text-amber-500" />
      case "residential":
        return <Tent className="h-4 w-4 text-purple-500" />
      case "home":
      default:
        return <Home className="h-4 w-4 text-[#FFB70F]" />
    }
  }

  const getTargetEntity = (r: TrainingRequest) => {
    const d = (r.details || {}) as Record<string, any>
    if (r.type === "corporate") return d.organization_name || "Corporate Organization"
    if (r.type === "college") return d.college_name || "College / University"
    if (r.type === "school") return d.school_name || "School Campus"
    if (r.type === "residential") return d.package_name || "Residential Camp"
    return d.participant_name || r.contact_name || "Home Training"
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            My Training Requests
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Track status updates, assigned trainers, schedules, and submit new requests.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => loadRequests()}
            disabled={loading}
            className="h-9 gap-1.5 text-xs border-border"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Link href="/training-dashboard/new-request">
            <Button
              type="button"
              size="sm"
              className="h-9 bg-[#FFB70F] hover:bg-[#E5A40E] text-black font-semibold text-xs gap-1.5 shadow"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>Submit New Request</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-card border border-border/70 rounded-xl p-3.5">
          <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Total Requests
          </div>
          <div className="text-2xl font-bold text-foreground mt-1">{totalCount}</div>
        </div>

        <div className="bg-card border border-border/70 rounded-xl p-3.5">
          <div className="text-[11px] font-medium text-amber-600 uppercase tracking-wider">
            Under Review
          </div>
          <div className="text-2xl font-bold text-amber-600 mt-1">{underReviewCount}</div>
        </div>

        <div className="bg-card border border-border/70 rounded-xl p-3.5">
          <div className="text-[11px] font-medium text-purple-600 uppercase tracking-wider">
            Coach Assigned
          </div>
          <div className="text-2xl font-bold text-purple-600 mt-1">{coachAssignedCount}</div>
        </div>

        <div className="bg-card border border-border/70 rounded-xl p-3.5">
          <div className="text-[11px] font-medium text-blue-600 uppercase tracking-wider">
            Scheduled
          </div>
          <div className="text-2xl font-bold text-blue-600 mt-1">{scheduledCount}</div>
        </div>

        <div className="bg-card border border-border/70 rounded-xl p-3.5 col-span-2 sm:col-span-1">
          <div className="text-[11px] font-medium text-emerald-600 uppercase tracking-wider">
            Completed
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{completedCount}</div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-card border border-border/70 p-3 rounded-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by ID, name, location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 text-xs h-9 border-input bg-background/50 focus-visible:ring-[#FFB70F]"
          />
        </div>

        <div className="flex gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px] text-xs h-9">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="home">Home</SelectItem>
              <SelectItem value="corporate">Corporate</SelectItem>
              <SelectItem value="school">School</SelectItem>
              <SelectItem value="college">College</SelectItem>
              <SelectItem value="residential">Residential</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px] text-xs h-9">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="under_review">Under Review</SelectItem>
              <SelectItem value="coach_assigned">Coach Assigned</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Request List */}
      {loading ? (
        <div className="p-12 text-center text-muted-foreground bg-card rounded-xl border border-border/70 space-y-2">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto text-[#FFB70F]" />
          <p className="text-xs">Loading your training requests...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="p-12 text-center bg-card rounded-xl border border-dashed border-border/80 space-y-4">
          <div className="w-12 h-12 rounded-full bg-[#FFB70F]/10 flex items-center justify-center text-[#B87D00] mx-auto">
            <FileText className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-foreground">No requests found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              You haven&apos;t submitted any training requests matching these filters yet.
            </p>
          </div>
          <Link href="/training-dashboard/new-request">
            <Button
              size="sm"
              className="bg-[#FFB70F] hover:bg-[#E5A40E] text-black font-semibold text-xs gap-1.5"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>Submit Your First Request</span>
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {requests.map((r) => {
            const details = (r.details || {}) as Record<string, any>
            return (
              <div
                key={r.id}
                className="bg-card border border-border/80 hover:border-[#FFB70F]/50 rounded-xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-3.5"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-muted/60 shrink-0">
                      {getTypeIcon(r.type)}
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-muted-foreground block">
                        #{r.id.slice(0, 8)}
                      </span>
                      <h4 className="text-sm font-bold text-foreground leading-snug">
                        {getTargetEntity(r)}
                      </h4>
                    </div>
                  </div>
                  {getStatusBadge(r.status)}
                </div>

                {/* Info Rows */}
                <div className="space-y-1.5 text-xs text-muted-foreground pt-1 border-t border-border/40">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px]">Type:</span>
                    <span className="font-medium text-foreground capitalize">
                      {typeLabel(r.type)} Training
                    </span>
                  </div>

                  {details.city && (
                    <div className="flex items-center justify-between">
                      <span className="text-[11px]">Location:</span>
                      <span className="font-medium text-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        {details.city}
                        {details.state ? `, ${details.state}` : ""}
                      </span>
                    </div>
                  )}

                  {details.preferred_date && (
                    <div className="flex items-center justify-between">
                      <span className="text-[11px]">Preferred Date:</span>
                      <span className="font-medium text-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {details.preferred_date}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-[11px]">Assigned Coach:</span>
                    {r.assigned_coach_name ? (
                      <span className="font-semibold text-foreground flex items-center gap-1">
                        <UserCheck className="h-3 w-3 text-emerald-600" />
                        {r.assigned_coach_name}
                      </span>
                    ) : (
                      <span className="text-amber-600 text-[11px] font-medium">
                        Assigning soon
                      </span>
                    )}
                  </div>

                  {r.fee_total_inr != null && r.fee_total_inr > 0 && (
                    <div className="flex items-center justify-between pt-1 border-t border-border/40">
                      <span className="text-[11px]">Fee:</span>
                      <span className="font-bold text-foreground">
                        ₹{r.fee_total_inr.toLocaleString("en-IN")}{" "}
                        <span className="text-[10px] text-emerald-600 font-normal">
                          ({r.payment_status || "paid"})
                        </span>
                      </span>
                    </div>
                  )}
                </div>

                {/* Footer Action */}
                <div className="pt-2 border-t border-border/40 flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">
                    {r.created_at ? new Date(r.created_at).toLocaleDateString() : ""}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedRequest(r)}
                    className="h-7 text-xs border-border hover:border-[#FFB70F] hover:text-[#B87D00] gap-1 px-2.5"
                  >
                    <Eye className="h-3 w-3" />
                    <span>Details</span>
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Details Slideout / Modal */}
      {selectedRequest && (
        <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
          <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto p-6 space-y-4">
            <DialogHeader className="space-y-1">
              <div className="flex items-center gap-2">
                {getTypeIcon(selectedRequest.type)}
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {typeLabel(selectedRequest.type)} Training Request
                </span>
              </div>
              <DialogTitle className="text-lg font-bold text-foreground">
                {getTargetEntity(selectedRequest)}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Request ID: <span className="font-mono text-foreground">{selectedRequest.id}</span>
              </DialogDescription>
            </DialogHeader>

            {/* Status & Coach Highlight */}
            <div className="grid grid-cols-2 gap-3 p-3.5 bg-muted/40 rounded-xl border border-border/60">
              <div>
                <span className="text-[11px] text-muted-foreground block">Status</span>
                <div className="mt-1">{getStatusBadge(selectedRequest.status)}</div>
              </div>

              <div>
                <span className="text-[11px] text-muted-foreground block">Assigned Trainer</span>
                <span className="text-xs font-bold text-foreground flex items-center gap-1 mt-1">
                  <UserCheck className="h-3.5 w-3.5 text-[#FFB70F]" />
                  {selectedRequest.assigned_coach_name || "Pending Assignment"}
                </span>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-2">
              <h5 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Contact Person
              </h5>
              <div className="grid grid-cols-2 gap-2 text-xs bg-card p-3 rounded-lg border border-border/60">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Name:</span>
                  <span className="font-medium text-foreground">{selectedRequest.contact_name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Phone:</span>
                  <span className="font-medium text-foreground">{selectedRequest.contact_phone}</span>
                </div>
                {selectedRequest.contact_email && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground block text-[11px]">Email:</span>
                    <span className="font-medium text-foreground">{selectedRequest.contact_email}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Details Fields */}
            <div className="space-y-2">
              <h5 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Training Requirements
              </h5>
              <div className="space-y-2 text-xs bg-card p-3 rounded-lg border border-border/60">
                {Object.entries((selectedRequest.details || {}) as Record<string, any>).map(
                  ([k, v]) => {
                    if (v == null || v === "") return null
                    const label = k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
                    return (
                      <div key={k} className="flex justify-between items-start gap-4 py-1 border-b border-border/40 last:border-0">
                        <span className="text-muted-foreground text-[11px] shrink-0">{label}:</span>
                        <span className="font-medium text-foreground text-right">{String(v)}</span>
                      </div>
                    )
                  }
                )}
              </div>
            </div>

            {/* Notes if any */}
            {selectedRequest.notes && (
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground block">
                  Additional Notes
                </span>
                <p className="text-xs text-foreground bg-muted/30 p-2.5 rounded-lg border border-border/40">
                  {selectedRequest.notes}
                </p>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedRequest(null)}
                className="text-xs"
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

