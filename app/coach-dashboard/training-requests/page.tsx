"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import CoachDashboardHeader from "@/components/coach-dashboard-header"
import { checkCoachAuth } from "@/lib/coachAuth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import {
  trainingRequestAPI,
  type TrainingRequest,
  type TrainingRequestType,
  TRAINING_REQUEST_TYPES,
  typeLabel,
} from "@/lib/trainingRequestAPI"
import { formatRegisteredDateTime } from "@/lib/formatRegisteredDate"
import {
  Clock,
  CheckCircle2,
  XCircle,
  Layers,
  Search,
  RefreshCw,
  MapPin,
  Phone,
  Mail,
  User,
  Building2,
  Calendar,
  AlertCircle,
  FileText,
  Check,
  X,
  Sparkles,
} from "lucide-react"

type StatusTab = "pending" | "accepted" | "rejected" | "all"

const TYPE_BADGE_STYLE: Record<string, string> = {
  home: "bg-emerald-50 text-emerald-800 border-emerald-200",
  school: "bg-sky-50 text-sky-800 border-sky-200",
  college: "bg-violet-50 text-violet-800 border-violet-200",
  corporate: "bg-orange-50 text-orange-900 border-orange-200",
  residential: "bg-rose-50 text-rose-800 border-rose-200",
}

function fmtDate(iso?: string | null) {
  if (!iso) return "—"
  const formatted = formatRegisteredDateTime(iso)
  return formatted === "-" ? "—" : formatted
}

export default function CoachTrainingRequestsPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [coachName, setCoachName] = useState("Coach")
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [requests, setRequests] = useState<TrainingRequest[]>([])
  const [total, setTotal] = useState(0)
  const [counts, setCounts] = useState({
    all: 0,
    pending: 0,
    accepted: 0,
    rejected: 0,
  })

  // Filters
  const [activeTab, setActiveTab] = useState<StatusTab>("pending")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")

  // Action states
  const [actingId, setActingId] = useState<string | null>(null)
  const [acceptModal, setAcceptModal] = useState<TrainingRequest | null>(null)
  const [acceptNote, setAcceptNote] = useState("")

  const [rejectModal, setRejectModal] = useState<TrainingRequest | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [rejectError, setRejectError] = useState("")

  // Authentication check
  useEffect(() => {
    const auth = checkCoachAuth()
    if (!auth.isAuthenticated) {
      router.push("/coach/login")
      return
    }
    setCoachName(auth.coach?.full_name || "Coach")
    setReady(true)
  }, [router])

  // Debounce search input
  useEffect(() => {
    const handle = window.setTimeout(() => {
      setSearch(searchInput.trim())
    }, 350)
    return () => window.clearTimeout(handle)
  }, [searchInput])

  // Load training requests
  const loadRequests = useCallback(async () => {
    setLoading(true)
    try {
      const data = await trainingRequestAPI.myTrainingRequests({
        status: activeTab,
        type: typeFilter !== "all" ? typeFilter : undefined,
        search: search.trim() || undefined,
        skip: 0,
        limit: 100,
      })
      setRequests(Array.isArray(data.requests) ? data.requests : [])
      setTotal(typeof data.total === "number" ? data.total : data.requests?.length || 0)
      if (data.counts) {
        setCounts(data.counts)
      }
    } catch (e) {
      toast({
        title: "Could not load training requests",
        description: e instanceof Error ? e.message : "Please try again later.",
        variant: "destructive",
      })
      setRequests([])
    } finally {
      setLoading(false)
    }
  }, [activeTab, typeFilter, search, toast])

  useEffect(() => {
    if (ready) {
      loadRequests()
    }
  }, [ready, loadRequests])

  // Handle Accept Submit
  const handleConfirmAccept = async () => {
    if (!acceptModal) return
    const id = acceptModal.id
    setActingId(id)
    try {
      await trainingRequestAPI.coachRespond(id, {
        action: "accept",
        note: acceptNote.trim() || undefined,
      })
      toast({
        title: "Training Request Accepted",
        description: "You have successfully accepted this training request.",
      })
      setAcceptModal(null)
      setAcceptNote("")
      await loadRequests()
    } catch (e) {
      toast({
        title: "Action failed",
        description: e instanceof Error ? e.message : "Could not accept training request.",
        variant: "destructive",
      })
    } finally {
      setActingId(null)
    }
  }

  // Handle Reject Submit
  const handleConfirmReject = async () => {
    if (!rejectModal) return
    setRejectError("")

    const effectiveReason = rejectReason.trim()
    if (!effectiveReason) {
      setRejectError("Please enter the reason for declining this request.")
      return
    }

    const id = rejectModal.id
    setActingId(id)
    try {
      await trainingRequestAPI.coachRespond(id, {
        action: "reject",
        reason: effectiveReason,
      })
      toast({
        title: "Training Request Declined",
        description: "The request was declined and the rejection reason has been forwarded to Super Admin.",
      })
      setRejectModal(null)
      setRejectReason("")
      await loadRequests()
    } catch (e) {
      toast({
        title: "Action failed",
        description: e instanceof Error ? e.message : "Could not decline training request.",
        variant: "destructive",
      })
    } finally {
      setActingId(null)
    }
  }

  if (!ready) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <CoachDashboardHeader currentPage="Training Requests" coachName={coachName} />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Page Title & Refresh */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
              My Training Requests
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Review and respond to Home, School, College, Corporate, and Residential training sessions assigned to you.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={loadRequests}
            disabled={loading}
            className="self-start sm:self-auto border-gray-300 hover:bg-gray-100"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Metric Summary Cards (Clickable, syncs to corresponding tab) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {/* Pending Card */}
          <button
            type="button"
            onClick={() => setActiveTab("pending")}
            className={`p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
              activeTab === "pending"
                ? "bg-amber-50 border-amber-300 shadow-sm ring-2 ring-amber-400/40"
                : "bg-white border-gray-200 hover:border-amber-300 hover:bg-amber-50/50"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
                Pending Response
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold text-gray-900">{counts.pending}</span>
              <span className="text-xs text-amber-700">Awaiting your decision</span>
            </div>
          </button>

          {/* Accepted Card */}
          <button
            type="button"
            onClick={() => setActiveTab("accepted")}
            className={`p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
              activeTab === "accepted"
                ? "bg-emerald-50 border-emerald-300 shadow-sm ring-2 ring-emerald-400/40"
                : "bg-white border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                Accepted
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold text-gray-900">{counts.accepted}</span>
              <span className="text-xs text-emerald-700">Confirmed by you</span>
            </div>
          </button>

          {/* Rejected Card */}
          <button
            type="button"
            onClick={() => setActiveTab("rejected")}
            className={`p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
              activeTab === "rejected"
                ? "bg-red-50 border-red-300 shadow-sm ring-2 ring-red-400/40"
                : "bg-white border-gray-200 hover:border-red-300 hover:bg-red-50/50"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-red-800 uppercase tracking-wider">
                Declined
              </span>
              <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center">
                <XCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold text-gray-900">{counts.rejected}</span>
              <span className="text-xs text-red-700">Sent to admin</span>
            </div>
          </button>

          {/* All Requests Card */}
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
              activeTab === "all"
                ? "bg-yellow-50 border-yellow-300 shadow-sm ring-2 ring-yellow-400/50"
                : "bg-white border-gray-200 hover:border-yellow-300 hover:bg-yellow-50/50"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Total Assigned
              </span>
              <div className="w-8 h-8 rounded-lg bg-yellow-100 text-yellow-800 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold text-gray-900">{counts.all}</span>
              <span className="text-xs text-gray-500">All requests</span>
            </div>
          </button>
        </div>

        {/* Tab-Based Filter Bar (Pending, Accepted, Rejected, All Requests) */}
        <div className="bg-white p-2 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Main Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setActiveTab("pending")}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "pending"
                  ? "bg-amber-400 text-gray-900 shadow-sm font-bold"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              <Clock className="w-4 h-4" />
              Pending
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  activeTab === "pending"
                    ? "bg-amber-500 text-gray-900"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                {counts.pending}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("accepted")}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "accepted"
                  ? "bg-emerald-500 text-white shadow-sm font-bold"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              Accepted
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  activeTab === "accepted"
                    ? "bg-emerald-600 text-white"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                {counts.accepted}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("rejected")}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "rejected"
                  ? "bg-red-500 text-white shadow-sm font-bold"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              <XCircle className="w-4 h-4" />
              Rejected
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  activeTab === "rejected"
                    ? "bg-red-600 text-white"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                {counts.rejected}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "all"
                  ? "bg-gray-900 text-white shadow-sm font-bold"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              <Layers className="w-4 h-4" />
              All Requests
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  activeTab === "all"
                    ? "bg-gray-700 text-white"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                {counts.all}
              </span>
            </button>
          </div>

          {/* Secondary Filters: Type & Search */}
          <div className="flex items-center gap-2 sm:self-auto">
            {/* Training Type dropdown */}
            <Select value={typeFilter} onValueChange={(val) => setTypeFilter(val)}>
              <SelectTrigger className="w-[160px] h-10 text-xs rounded-xl border-gray-200 bg-gray-50">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent className="rounded-xl bg-white shadow-lg border border-gray-200">
                <SelectItem value="all">All Types</SelectItem>
                {TRAINING_REQUEST_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Search Input */}
            <div className="relative flex-1 sm:w-60">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search requests..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 h-10 text-xs rounded-xl border-gray-200 bg-gray-50 focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* Loading Indicator */}
        {loading && (
          <div className="p-12 text-center bg-white rounded-2xl border border-gray-200 shadow-sm">
            <RefreshCw className="w-8 h-8 text-yellow-500 animate-spin mx-auto mb-3" />
            <p className="text-gray-600 font-medium">Loading training requests...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && requests.length === 0 && (
          <div className="p-12 text-center bg-white rounded-2xl border border-gray-200 shadow-sm">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4 text-gray-400">
              {activeTab === "pending" && <Clock className="w-7 h-7 text-amber-500" />}
              {activeTab === "accepted" && <CheckCircle2 className="w-7 h-7 text-emerald-500" />}
              {activeTab === "rejected" && <XCircle className="w-7 h-7 text-red-500" />}
              {activeTab === "all" && <FileText className="w-7 h-7 text-gray-400" />}
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              {activeTab === "pending" && "No Pending Requests"}
              {activeTab === "accepted" && "No Accepted Requests"}
              {activeTab === "rejected" && "No Declined Requests"}
              {activeTab === "all" && "No Training Requests Found"}
            </h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              {activeTab === "pending" &&
                "You have no training requests awaiting your accept/reject decision. New assignments will appear here."}
              {activeTab === "accepted" &&
                "You haven't accepted any training requests yet. Check the Pending tab to review new assignments."}
              {activeTab === "rejected" &&
                "You haven't declined any training requests."}
              {activeTab === "all" &&
                "No training requests match your current filters. Try selecting a different type or clearing search."}
            </p>
          </div>
        )}

        {/* Training Request Cards List */}
        {!loading && requests.length > 0 && (
          <div className="space-y-4">
            {requests.map((req) => {
              const details = (req.details || {}) as Record<string, any>
              const isPending =
                !req.coach_assignment_status || req.coach_assignment_status === "pending"
              const isAccepted = req.coach_assignment_status === "accepted"
              const isRejected = req.coach_assignment_status === "rejected"
              const isProcessing = actingId === req.id

              // Organization/School/College info
              const orgName =
                details.school_name ||
                details.college_name ||
                details.organization_name ||
                details.participant_name ||
                req.contact_name

              return (
                <Card
                  key={req.id}
                  className="rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow bg-white overflow-hidden"
                >
                  <CardHeader className="p-4 sm:p-5 pb-3 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Training Type Badge */}
                        <Badge
                          variant="outline"
                          className={`font-semibold capitalize px-2.5 py-1 rounded-lg ${
                            TYPE_BADGE_STYLE[String(req.type).toLowerCase()] ||
                            "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {typeLabel(req.type)}
                        </Badge>

                        {/* Request ID */}
                        <span className="text-xs font-mono text-gray-400">
                          #{req.id.slice(0, 8)}
                        </span>

                        {/* Branch badge */}
                        {req.branch_name && (
                          <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-700">
                            {req.branch_name}
                          </Badge>
                        )}
                      </div>

                      {/* Coach Assignment Status Badge */}
                      <div className="flex items-center gap-2">
                        {isPending && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300">
                            <Clock className="w-3.5 h-3.5 animate-pulse text-amber-700" />
                            Awaiting Your Response
                          </span>
                        )}
                        {isAccepted && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-900 border border-emerald-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                            Accepted by You
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-900 border border-red-300">
                            <XCircle className="w-3.5 h-3.5 text-red-700" />
                            Declined by You
                          </span>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 sm:p-6 space-y-4">
                    {/* Organization / Participant Banner */}
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{orgName}</h3>
                        {details.contact_designation && (
                          <p className="text-xs text-gray-500 font-medium">
                            {details.contact_designation}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">
                        Assigned: {fmtDate(req.assigned_at || req.created_at)}
                      </span>
                    </div>

                    {/* Grid of Request Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm bg-gray-50 p-4 rounded-xl border border-gray-100">
                      {/* Contact Info */}
                      <div className="space-y-1.5">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                          Contact Details
                        </span>
                        <div className="flex items-center gap-2 text-gray-800">
                          <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="font-medium">{req.contact_name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700">
                          <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <a
                            href={`tel:${req.contact_phone}`}
                            className="hover:text-yellow-600 transition-colors"
                          >
                            {req.contact_phone}
                          </a>
                        </div>
                        {req.contact_email && (
                          <div className="flex items-center gap-2 text-gray-700">
                            <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <a
                              href={`mailto:${req.contact_email}`}
                              className="hover:text-yellow-600 transition-colors truncate"
                            >
                              {req.contact_email}
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Location / Address */}
                      <div className="space-y-1.5">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                          Training Location
                        </span>
                        <div className="flex items-start gap-2 text-gray-700">
                          <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium text-gray-900">
                              {details.address_line1 || "Address provided upon contact"}
                            </p>
                            {details.address_line2 && <p>{details.address_line2}</p>}
                            <p className="text-xs text-gray-500">
                              {[details.city, details.state, details.pincode]
                                .filter(Boolean)
                                .join(", ") || "City not specified"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Session Specifics */}
                      <div className="space-y-1.5">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                          Session Specifics
                        </span>
                        <div className="flex items-center gap-2 text-gray-700">
                          <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span>
                            {details.preferred_date || "Flexible date"} •{" "}
                            {details.preferred_time || "Flexible time"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700">
                          <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span>
                            Participants:{" "}
                            <b>
                              {details.number_of_participants ||
                                details.number_of_students ||
                                details.employee_count ||
                                1}
                            </b>
                            {details.age_group ? ` (${details.age_group})` : ""}
                          </span>
                        </div>
                        {details.training_type && (
                          <p className="text-xs text-yellow-700 font-medium">
                            Focus: {details.training_type}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Goals & Special Requirements (if any) */}
                    {(details.training_goals || details.special_requirements || req.notes) && (
                      <div className="text-xs bg-amber-50/60 border border-amber-200/80 rounded-xl p-3 text-amber-900 space-y-1">
                        {details.training_goals && (
                          <p>
                            <b>Goals:</b> {details.training_goals}
                          </p>
                        )}
                        {details.special_requirements && (
                          <p>
                            <b>Special Requirements:</b> {details.special_requirements}
                          </p>
                        )}
                        {req.notes && (
                          <p>
                            <b>Admin Notes:</b> {req.notes}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Rejection notice if declined */}
                    {isRejected && req.coach_rejection_reason && (
                      <div className="text-xs bg-red-50 border border-red-200 rounded-xl p-3.5 text-red-900 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-red-800">
                          <AlertCircle className="w-4 h-4 text-red-600" />
                          You declined this request on {fmtDate(req.coach_responded_at)}
                        </div>
                        <p className="pl-5">
                          <b>Reason:</b> {req.coach_rejection_reason}
                        </p>
                        {req.coach_response_note && (
                          <p className="pl-5 text-gray-600">
                            <b>Additional note:</b> {req.coach_response_note}
                          </p>
                        )}
                        <p className="pl-5 text-[11px] text-gray-500 pt-1">
                          This reason is visible to Super Admin for reallocating this session.
                        </p>
                      </div>
                    )}

                    {/* Accepted confirmation if accepted */}
                    {isAccepted && (
                      <div className="text-xs bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-emerald-900 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          You accepted this request on {fmtDate(req.coach_responded_at)}
                        </div>
                        {req.coach_response_note && (
                          <p className="pl-5 text-gray-700">
                            <b>Note to admin:</b> {req.coach_response_note}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Action Controls for Pending Requests */}
                    {isPending && (
                      <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-3 border-t border-gray-100">
                        <Button
                          type="button"
                          variant="outline"
                          disabled={isProcessing}
                          onClick={() => {
                            setRejectModal(req)
                            setRejectReason("")
                            setRejectError("")
                          }}
                          className="w-full sm:w-auto px-5 border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300 font-medium"
                        >
                          <X className="w-4 h-4 mr-1.5" />
                          Decline Request
                        </Button>

                        <Button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => {
                            setAcceptModal(req)
                            setAcceptNote("")
                          }}
                          className="w-full sm:w-auto px-6 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold shadow-sm"
                        >
                          <Check className="w-4 h-4 mr-1.5" />
                          Accept Request
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </main>

      {/* Accept Confirmation Dialog */}
      <Dialog open={!!acceptModal} onOpenChange={(open) => !open && setAcceptModal(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-white">
          <DialogHeader>
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <DialogTitle className="text-xl font-bold text-gray-900">
              Accept Training Request
            </DialogTitle>
            <DialogDescription className="text-gray-500 text-sm">
              Confirm your acceptance for this{" "}
              <b>{typeLabel(acceptModal?.type)}</b> session for{" "}
              <b>{acceptModal?.contact_name}</b>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="block text-xs font-semibold text-gray-700 mb-1">
                Optional Message / Notes for Admin & Client
              </Label>
              <Textarea
                placeholder="e.g. Confirmed for the requested time. I will contact the client directly."
                value={acceptNote}
                onChange={(e) => setAcceptNote(e.target.value)}
                rows={3}
                className="rounded-xl border-gray-200 text-sm"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAcceptModal(null)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmAccept}
              disabled={actingId === acceptModal?.id}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl"
            >
              {actingId === acceptModal?.id ? "Accepting..." : "Confirm Acceptance"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject with Reason Dialog */}
      <Dialog open={!!rejectModal} onOpenChange={(open) => !open && setRejectModal(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-white">
          <DialogHeader>
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-700 flex items-center justify-center mb-2">
              <XCircle className="w-6 h-6" />
            </div>
            <DialogTitle className="text-xl font-bold text-gray-900">
              Decline Training Request
            </DialogTitle>
            <DialogDescription className="text-gray-500 text-sm">
              Please enter the reason why you cannot take this session. This reason will be displayed in the{" "}
              <b>Super Admin Dashboard</b> so they can reassign the request.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Reason for Declining <span className="text-red-500">*</span>
              </Label>
              <Textarea
                placeholder="Enter the reason for declining this request (e.g. Schedule conflict, personal leave, out of service area, etc.)..."
                value={rejectReason}
                onChange={(e) => {
                  setRejectReason(e.target.value)
                  if (rejectError) setRejectError("")
                }}
                rows={4}
                className="rounded-xl border-gray-200 text-sm focus:border-red-400 focus:ring-red-400"
              />
              {rejectError && <p className="text-xs text-red-600 mt-1.5 font-medium">{rejectError}</p>}
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRejectModal(null)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmReject}
              disabled={actingId === rejectModal?.id}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl"
            >
              {actingId === rejectModal?.id ? "Declining..." : "Confirm & Decline"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

