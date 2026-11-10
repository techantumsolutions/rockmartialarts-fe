"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Copy,
  CreditCard,
  Download,
  Eye,
  FileSpreadsheet,
  IndianRupee,
  Loader2,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import {
  learningCourseAPI,
  type LearningCourse,
  type LearningCourseEnrollment,
} from "@/lib/learningCourseAPI"

function formatInr(n?: number | null) {
  if (n == null) return "₹0"
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n)
}

export default function LearningCourseSubmissionsPage() {
  const params = useParams()
  const courseId = String(params?.courseId || "")
  const adminType = String(params?.adminType || "superadmin")
  const { toast } = useToast()

  const [course, setCourse] = useState<LearningCourse | null>(null)
  const [submissions, setSubmissions] = useState<LearningCourseEnrollment[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [detailEnrollment, setDetailEnrollment] = useState<LearningCourseEnrollment | null>(null)

  const backHref = `/${adminType}/dashboard/online-learning/courses`

  const load = useCallback(async () => {
    if (!courseId) return
    setLoading(true)
    try {
      const [courseRes, enrollmentsRes] = await Promise.all([
        learningCourseAPI.getAdmin(courseId),
        learningCourseAPI.listEnrollments(courseId),
      ])
      setCourse(courseRes.course)
      setSubmissions(enrollmentsRes.enrollments || [])
    } catch (e) {
      toast({
        title: "Failed to load submissions",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [courseId, toast])

  useEffect(() => {
    load()
  }, [load])

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: `${label} copied to clipboard` })
  }

  const exportSubmissionsCsv = () => {
    if (!submissions.length) return
    const headers = [
      "ID",
      "Course Title",
      "Student Name",
      "Email",
      "Phone",
      "Skill Level",
      "City",
      "State",
      "Address",
      "Pincode",
      "Amount Paid (INR)",
      "Payment Status",
      "Razorpay Order ID",
      "Razorpay Payment ID",
      "Goals / Notes",
      "Enrolled At",
    ]
    const rows = submissions.map((s) => [
      s.id,
      `"${(s.course_title || "").replace(/"/g, '""')}"`,
      `"${(s.student_name || "").replace(/"/g, '""')}"`,
      s.email,
      s.phone,
      s.skill_level || "",
      `"${(s.city || "").replace(/"/g, '""')}"`,
      `"${(s.state || "").replace(/"/g, '""')}"`,
      `"${(s.address || "").replace(/"/g, '""')}"`,
      s.pincode || "",
      s.amount_paid,
      s.payment_status,
      s.razorpay_order_id || "",
      s.razorpay_payment_id || "",
      `"${(s.learning_goals || s.notes || "").replace(/"/g, '""')}"`,
      s.created_at ? new Date(s.created_at).toLocaleString("en-IN") : "",
    ])
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute(
      "download",
      `submissions_${course?.slug || "course"}_${Date.now()}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const filteredSubmissions = submissions.filter((s) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      s.student_name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.phone.toLowerCase().includes(q) ||
      (s.city && s.city.toLowerCase().includes(q)) ||
      (s.state && s.state.toLowerCase().includes(q)) ||
      (s.razorpay_payment_id && s.razorpay_payment_id.toLowerCase().includes(q))
    )
  })

  const totalCollected = submissions.reduce((acc, curr) => {
    return curr.payment_status === "paid" ? acc + (curr.amount_paid || 0) : acc
  }, 0)

  const paidCount = submissions.filter((s) => s.payment_status === "paid").length

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:px-8">
      <div className="w-full max-w-none space-y-6">
        {/* Top Breadcrumb & Action bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <Link
              href={backHref}
              className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors mb-1"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to courses
            </Link>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {course ? course.title : "Course Submissions"}
              </h1>
              {course?.price != null && (
                <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-900 border-yellow-300 font-semibold">
                  {course.price > 0 ? `Price: ${formatInr(course.price)}` : "Free Course"}
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-500">
              Student enrollment submissions and verified payment records for this online course.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void load()}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={submissions.length === 0}
              onClick={exportSubmissionsCsv}
              className="border-gray-300"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Metric Cards (3 cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-blue-100 bg-white">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Enrolled
                </p>
                <p className="text-2xl font-bold text-blue-900 mt-1">
                  {submissions.length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-emerald-100 bg-white">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue Collected
                </p>
                <p className="text-2xl font-bold text-emerald-900 mt-1">
                  {formatInr(totalCollected)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <IndianRupee className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-yellow-100 bg-white">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Paid Submissions
                </p>
                <p className="text-2xl font-bold text-yellow-900 mt-1">
                  {paidCount}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-yellow-50 text-yellow-600 flex items-center justify-center">
                <CreditCard className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Card with Search & Table */}
        <Card className="bg-white">
          <CardHeader className="pb-3 border-b">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-gray-500" />
                Enrollment Submissions ({filteredSubmissions.length})
              </CardTitle>

              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                <Input
                  placeholder="Search name, email, phone, city…"
                  className="pl-9 h-9 text-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="py-16 flex flex-col items-center justify-center text-gray-500">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
                <p className="text-sm">Loading course submissions…</p>
              </div>
            ) : filteredSubmissions.length === 0 ? (
              <div className="py-16 text-center text-gray-500 px-4">
                <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <FileSpreadsheet className="w-7 h-7 text-gray-400" />
                </div>
                <h3 className="text-base font-semibold text-gray-800">
                  {submissions.length === 0 ? "No submissions yet" : "No matching submissions"}
                </h3>
                <p className="text-sm text-gray-500 max-w-md mx-auto mt-1">
                  {submissions.length === 0
                    ? "When students enroll in this course via the public page, their submitted form details and payment status will appear here."
                    : "Try adjusting your search terms."}
                </p>
                {search ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => setSearch("")}
                  >
                    Reset search
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-700 border-b">
                    <tr>
                      <th className="px-4 py-3 font-semibold whitespace-nowrap">Date</th>
                      <th className="px-4 py-3 font-semibold">Student</th>
                      <th className="px-4 py-3 font-semibold">Contact</th>
                      <th className="px-4 py-3 font-semibold">Location</th>
                      <th className="px-4 py-3 font-semibold">Amount &amp; Status</th>
                      <th className="px-4 py-3 font-semibold">Payment ID</th>
                      <th className="px-4 py-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredSubmissions.map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                          {s.created_at ? (
                            <div>
                              <div className="font-medium text-gray-700">
                                {new Date(s.created_at).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </div>
                              <div className="text-[11px] text-gray-400">
                                {new Date(s.created_at).toLocaleTimeString("en-IN", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                            </div>
                          ) : (
                            "—"
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-semibold flex items-center justify-center shrink-0 text-xs">
                              {s.student_name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{s.student_name}</div>
                              {s.skill_level && (
                                <span className="inline-block text-[11px] text-gray-500">
                                  Level: {s.skill_level}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3 text-xs">
                          <div className="flex items-center gap-1.5 text-gray-900">
                            <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span>{s.email}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-gray-500 mt-0.5">
                            <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span>{s.phone}</span>
                          </div>
                        </td>

                        <td className="px-4 py-3 text-xs text-gray-600">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span>
                              {s.city || "—"}{s.state ? `, ${s.state}` : ""}
                            </span>
                          </div>
                          {s.address && (
                            <div className="text-[11px] text-gray-400 truncate max-w-[180px] pl-4">
                              {s.address}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-semibold text-gray-900">
                            {formatInr(s.amount_paid)}
                          </div>
                          <Badge
                            variant="outline"
                            className={`text-[10px] uppercase font-bold mt-0.5 ${
                              s.payment_status === "paid"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                : s.payment_status === "free"
                                ? "bg-blue-50 text-blue-800 border-blue-300"
                                : "bg-gray-50 text-gray-700 border-gray-200"
                            }`}
                          >
                            {s.payment_status}
                          </Badge>
                        </td>

                        <td className="px-4 py-3 text-xs font-mono">
                          {s.razorpay_payment_id ? (
                            <div className="flex items-center gap-1">
                              <span className="text-gray-800 bg-gray-100 px-1.5 py-0.5 rounded text-[11px]">
                                {s.razorpay_payment_id}
                              </span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(s.razorpay_payment_id!, "Payment ID")}
                                className="text-gray-400 hover:text-gray-600 p-0.5 rounded"
                                title="Copy Payment ID"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-gray-400 font-sans text-xs">—</span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-right">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 px-2.5 text-blue-600 hover:text-blue-800 border-blue-200 hover:bg-blue-50"
                            onClick={() => setDetailEnrollment(s)}
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Complete Student Submission Details Dialog */}
      <Dialog
        open={Boolean(detailEnrollment)}
        onOpenChange={(open) => !open && setDetailEnrollment(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Enrollment Details
            </DialogTitle>
          </DialogHeader>

          {detailEnrollment && (
            <div className="space-y-4 text-sm mt-2">
              <div className="bg-gray-50 rounded-lg p-3 border space-y-1">
                <span className="text-xs text-gray-500 uppercase tracking-wide">Course</span>
                <p className="font-semibold text-gray-900">{detailEnrollment.course_title}</p>
                {course?.slug && (
                  <p className="text-xs text-gray-500 font-mono">/{course.slug}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 border-b pb-3">
                <div>
                  <span className="text-xs text-gray-500 uppercase tracking-wide">Student Name</span>
                  <p className="font-medium text-gray-900 mt-0.5">{detailEnrollment.student_name}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500 uppercase tracking-wide">Skill Level</span>
                  <p className="font-medium text-gray-900 mt-0.5">{detailEnrollment.skill_level || "Beginner"}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500 uppercase tracking-wide">Email</span>
                  <p className="font-medium text-gray-900 mt-0.5">{detailEnrollment.email}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500 uppercase tracking-wide">Phone</span>
                  <p className="font-medium text-gray-900 mt-0.5">{detailEnrollment.phone}</p>
                </div>
              </div>

              <div className="border-b pb-3 space-y-1">
                <span className="text-xs text-gray-500 uppercase tracking-wide">Location Details</span>
                <p className="text-gray-900">
                  {detailEnrollment.address ? `${detailEnrollment.address}, ` : ""}
                  {detailEnrollment.city}, {detailEnrollment.state}
                  {detailEnrollment.pincode ? ` - ${detailEnrollment.pincode}` : ""}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 border-b pb-3">
                <div>
                  <span className="text-xs text-gray-500 uppercase tracking-wide">Amount Paid</span>
                  <p className="text-lg font-bold text-emerald-700">
                    {formatInr(detailEnrollment.amount_paid)}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-gray-500 uppercase tracking-wide">Payment Status</span>
                  <p className="mt-0.5">
                    <Badge
                      variant="outline"
                      className={`text-xs uppercase font-bold ${
                        detailEnrollment.payment_status === "paid"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                          : detailEnrollment.payment_status === "free"
                          ? "bg-blue-50 text-blue-800 border-blue-300"
                          : "bg-gray-50 text-gray-700 border-gray-200"
                      }`}
                    >
                      {detailEnrollment.payment_status}
                    </Badge>
                  </p>
                </div>
                {detailEnrollment.razorpay_payment_id && (
                  <div className="col-span-2">
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Razorpay Payment ID</span>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="font-mono text-xs text-gray-800 bg-gray-100 p-1.5 rounded flex-1">
                        {detailEnrollment.razorpay_payment_id}
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2"
                        onClick={() => copyToClipboard(detailEnrollment.razorpay_payment_id!, "Payment ID")}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
                {detailEnrollment.razorpay_order_id && (
                  <div className="col-span-2">
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Razorpay Order ID</span>
                    <p className="font-mono text-xs text-gray-600 mt-1">
                      {detailEnrollment.razorpay_order_id}
                    </p>
                  </div>
                )}
              </div>

              {(detailEnrollment.learning_goals || detailEnrollment.notes) && (
                <div>
                  <span className="text-xs text-gray-500 uppercase tracking-wide">
                    Learning Goals / Notes
                  </span>
                  <p className="text-gray-700 whitespace-pre-wrap mt-1 bg-gray-50 p-3 rounded border text-xs leading-relaxed">
                    {detailEnrollment.learning_goals || detailEnrollment.notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
