import { reportsAPI } from "@/lib/reportsAPI"

export type OperationalReportType = "enrollments" | "renewals" | "leads" | "events" | "attendance"

export const OPERATIONAL_REPORT_TYPES: OperationalReportType[] = [
  "enrollments",
  "renewals",
  "leads",
  "events",
  "attendance",
]

export function isOperationalReportType(value: string): value is OperationalReportType {
  return (OPERATIONAL_REPORT_TYPES as string[]).includes(value)
}

type FinancialExportFilters = Parameters<typeof reportsAPI.getFinancialReports>[1]
type BranchExportFilters = Record<string, string | undefined>
type OperationalExportFilters = { branch_id?: string; start_date?: string; end_date?: string }

const PAGE_SIZE = 100 // backend max for /reports/financial and /reports/branches
const MAX_PAGES = 100

const HIDDEN_OPERATIONAL_KEYS = new Set(["_id", "password", "password_hash"])

/** When a readable name column exists, hide the matching foreign-key UUID column. */
const ID_KEYS_HIDDEN_WHEN_NAMED: Record<string, string> = {
  student_id: "student_name",
  user_id: "student_name",
  course_id: "course_name",
  branch_id: "branch_name",
  duration_id: "duration_name",
  batch_ref: "batch_name",
}

/** Internal UUID refs that are not useful in the report table. */
const HIDDEN_INTERNAL_ID_KEYS = new Set([
  "enrollment_id",
  "renewed_from_enrollment_id",
  "billing_cycle_id",
  "razorpay_order_id",
  "razorpay_payment_id",
])

/** Preferred column order for enrollment reports (names first; record id kept). */
const ENROLLMENT_COLUMN_ORDER = [
  "id",
  "student_name",
  "course_name",
  "branch_name",
  "is_active",
  "payment_status",
  "fee_amount",
  "admission_fee",
  "enrollment_date",
  "start_date",
  "end_date",
  "next_due_date",
  "created_at",
]

/** Preferred column order for renewal (payment) reports. */
const RENEWAL_COLUMN_ORDER = [
  "id",
  "student_name",
  "course_name",
  "branch_name",
  "amount",
  "payment_status",
  "payment_type",
  "payment_method",
  "payment_date",
  "transaction_id",
  "is_renewal",
  "notes",
  "created_at",
]

const ATTENDANCE_COLUMN_ORDER = [
  "attendance_date",
  "record_type",
  "student_name",
  "course_name",
  "branch_name",
  "status",
  "is_present",
  "check_in_time",
  "check_out_time",
  "method",
  "notes",
]

function fileStamp(): string {
  return new Date().toISOString().slice(0, 10)
}

function formatDate(value?: string | null): string {
  if (!value) return ""
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString()
}

function titleCase(value?: string | null): string {
  if (!value) return ""
  return value.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
}

async function writeWorkbook(sheetName: string, fileBase: string, columns: string[], rows: (string | number)[][]) {
  const XLSX = await import("xlsx")
  const sheet = XLSX.utils.aoa_to_sheet([columns, ...rows])
  sheet["!cols"] = columns.map((col) => ({ wch: Math.max(12, col.length + 4) }))
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, sheet, sheetName.slice(0, 31))
  XLSX.writeFile(book, `${fileBase}-${fileStamp()}.xlsx`)
}

function downloadExportContent(data: {
  content?: string
  filename?: string
  content_type?: string
}) {
  if (!data.content) {
    throw new Error("Export returned no file content")
  }
  const blob = new Blob([data.content], { type: data.content_type || "text/csv" })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = data.filename || "report.csv"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

async function waitForExportJob(
  token: string,
  jobId: string,
  onStatus?: (status: string, jobId: string) => void
): Promise<{ row_count?: number; filename?: string }> {
  const maxAttempts = 90
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const job = await reportsAPI.getExportJob(token, jobId)
    const status = job.status || "pending"
    onStatus?.(status, jobId)
    if (status === "ready") {
      return { row_count: job.row_count, filename: job.filename }
    }
    if (status === "failed") {
      throw new Error(job.error || "Background export failed")
    }
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }
  throw new Error("Export timed out while waiting for the background job")
}

/** Columns for an operational report: every top-level field that holds a plain value in at least one row. */
export function operationalColumns(rows: any[]): string[] {
  const keys: string[] = []
  const seen = new Set<string>()
  const presentKeys = new Set<string>()
  rows.forEach((row) => {
    Object.keys(row || {}).forEach((key) => presentKeys.add(key))
  })

  rows.forEach((row) => {
    Object.entries(row || {}).forEach(([key, value]) => {
      if (seen.has(key) || HIDDEN_OPERATIONAL_KEYS.has(key)) return
      if (HIDDEN_INTERNAL_ID_KEYS.has(key)) return
      if (value !== null && typeof value === "object" && !Array.isArray(value)) return
      const nameKey = ID_KEYS_HIDDEN_WHEN_NAMED[key]
      if (nameKey && presentKeys.has(nameKey)) return
      seen.add(key)
      keys.push(key)
    })
  })

  const looksLikeRenewals =
    presentKeys.has("is_renewal") ||
    (presentKeys.has("payment_date") && presentKeys.has("amount") && presentKeys.has("student_id"))

  const looksLikeEnrollments =
    !looksLikeRenewals &&
    (presentKeys.has("student_name") ||
      presentKeys.has("student_id") ||
      (presentKeys.has("enrollment_date") && presentKeys.has("course_id")))

  const looksLikeAttendance =
    presentKeys.has("attendance_date") &&
    (presentKeys.has("is_present") || presentKeys.has("check_in_time"))

  const preferredOrder = looksLikeAttendance
    ? ATTENDANCE_COLUMN_ORDER
    : looksLikeRenewals
      ? RENEWAL_COLUMN_ORDER
      : looksLikeEnrollments
        ? ENROLLMENT_COLUMN_ORDER
        : null

  if (preferredOrder) {
    const ordered: string[] = []
    const remaining = new Set(keys)
    preferredOrder.forEach((key) => {
      if (remaining.has(key)) {
        ordered.push(key)
        remaining.delete(key)
      }
    })
    remaining.forEach((key) => ordered.push(key))
    return ordered
  }

  return keys
}

export function operationalColumnLabel(key: string): string {
  const labels: Record<string, string> = {
    student_name: "Student",
    course_name: "Course",
    branch_name: "Branch",
    is_active: "Active",
    is_renewal: "Renewal",
    payment_status: "Payment Status",
    payment_type: "Payment Type",
    payment_method: "Payment Method",
    payment_date: "Payment Date",
    transaction_id: "Transaction ID",
    fee_amount: "Fee Amount",
    admission_fee: "Admission Fee",
    enrollment_date: "Enrollment Date",
    start_date: "Start Date",
    end_date: "End Date",
    next_due_date: "Next Due Date",
    created_at: "Created At",
    attendance_date: "Date",
    check_in_time: "Check In",
    check_out_time: "Check Out",
    is_present: "Present",
    record_type: "Type",
    method: "Method",
  }
  return labels[key] || titleCase(key)
}

export function formatOperationalValue(value: any): string {
  if (value === null || value === undefined) return ""
  if (Array.isArray(value)) {
    return value
      .map((v) => (v !== null && typeof v === "object" ? v.name || v.title || v.id || "" : String(v)))
      .filter(Boolean)
      .join(", ")
  }
  if (typeof value === "boolean") return value ? "Yes" : "No"
  return String(value)
}

/** Gateway reference for a payment; several Razorpay flows store it only in razorpay_payment_id. */
export function paymentTransactionId(payment: any): string {
  return payment?.transaction_id || payment?.razorpay_payment_id || ""
}

/** Downloads every financial record matching the filters. Returns the number of rows exported. */
export async function exportFinancialReport(token: string, filters: FinancialExportFilters = {}): Promise<number> {
  const payments: any[] = []
  for (let page = 0; page < MAX_PAGES; page++) {
    const response = await reportsAPI.getFinancialReports(token, {
      ...filters,
      skip: page * PAGE_SIZE,
      limit: PAGE_SIZE,
    })
    const rows = response.payments || []
    payments.push(...rows)
    if (!response.pagination?.has_more || rows.length === 0) break
  }

  const columns = ["Payment ID", "Transaction ID", "Amount", "Branch", "Course", "Status", "Method", "Type", "Date"]
  const rows = payments.map((p) => [
    p.id || p._id || "N/A",
    paymentTransactionId(p) || "N/A",
    typeof p.amount === "number" ? p.amount : Number(p.amount) || 0,
    p.branch_name || "",
    p.course_name || "",
    titleCase(p.payment_status),
    titleCase(p.payment_method),
    titleCase(p.payment_type),
    p.formatted_date || formatDate(p.payment_date),
  ])
  await writeWorkbook("Financial Report", "financial-report", columns, rows)
  return rows.length
}

/** Downloads every branch matching the filters. Returns the number of rows exported. */
export async function exportBranchReport(token: string, filters: BranchExportFilters = {}): Promise<number> {
  const branches: any[] = []
  for (let page = 0; page < MAX_PAGES; page++) {
    const response = await reportsAPI.getBranchReports(token, {
      ...filters,
      skip: page * PAGE_SIZE,
      limit: PAGE_SIZE,
    } as any)
    const rows = (response as any).branches || []
    branches.push(...rows)
    if (!(response as any).pagination?.has_more || rows.length === 0) break
  }

  const columns = ["Branch Name", "Students", "Revenue", "Status", "Performance (%)"]
  const rows = branches.map((b) => [
    b.branch_name || "Unknown Branch",
    b.active_enrollments ?? 0,
    b.total_revenue ?? 0,
    titleCase(b.status),
    b.performance_score ?? "",
  ])
  await writeWorkbook("Branch Report", "branch-report", columns, rows)
  return rows.length
}

/** Downloads every course matching the filters. Returns the number of rows exported. */
export async function exportCourseReport(
  token: string,
  filters: { branch_id?: string; category_id?: string; difficulty_level?: string; active_only?: boolean } = {}
): Promise<number> {
  const courses: any[] = []
  for (let page = 0; page < MAX_PAGES; page++) {
    const response = await reportsAPI.getCourseReports(token, {
      ...filters,
      skip: page * PAGE_SIZE,
      limit: PAGE_SIZE,
    })
    const rows = response.courses || []
    courses.push(...rows)
    if (!response.pagination?.has_more || rows.length === 0) break
  }

  const columns = ["Course Name", "Code", "Category", "Difficulty", "Total Enrollments", "Active Enrollments", "Status", "Currency", "Price"]
  const rows = courses.map((c) => [
    c.title || "",
    c.code || "",
    c.category_name || "",
    titleCase(c.difficulty_level),
    c.total_enrollments ?? 0,
    c.active_enrollments ?? 0,
    c.is_active ? "Active" : "Inactive",
    c.pricing?.currency || "",
    c.pricing?.amount ?? "",
  ])
  await writeWorkbook("Course Report", "course-report", columns, rows)
  return rows.length
}

/** Downloads an already-loaded table as Excel or PDF. */
export async function exportTableReport(
  format: "excel" | "pdf",
  title: string,
  columns: string[],
  rows: (string | number)[][]
): Promise<void> {
  const fileBase = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "report"
  if (format === "excel") {
    await writeWorkbook(title, fileBase, columns, rows)
    return
  }

  const { jsPDF } = await import("jspdf")
  const autoTable = (await import("jspdf-autotable")).default
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" })
  doc.setFontSize(14)
  doc.text(title, 40, 36)
  doc.setFontSize(9)
  doc.text(`Generated ${new Date().toLocaleString()}  |  ${rows.length} record(s)`, 40, 52)
  autoTable(doc, {
    head: [columns],
    body: rows.map((row) => row.map((cell) => String(cell ?? ""))),
    startY: 64,
    styles: { fontSize: 8, cellPadding: 3, overflow: "linebreak" },
    headStyles: { fillColor: [37, 99, 235] },
    margin: { left: 24, right: 24 },
  })
  doc.save(`${fileBase}-${fileStamp()}.pdf`)
}

/**
 * M23-S05: server-side operational export (immediate file or async job with audit).
 */
export async function exportOperationalReport(
  token: string,
  reportType: OperationalReportType,
  filters: OperationalExportFilters = {},
  onStatus?: (status: string, jobId?: string) => void
): Promise<number> {
  onStatus?.("starting")
  const payload = await reportsAPI.exportOperationalReport(token, reportType, {
    ...filters,
    format: "csv",
  })

  if (payload.async && payload.job_id) {
    onStatus?.(payload.status || "pending", payload.job_id)
    const jobMeta = await waitForExportJob(token, payload.job_id, onStatus)
    await reportsAPI.downloadExportJob(token, payload.job_id, jobMeta.filename)
    return jobMeta.row_count ?? payload.estimated_rows ?? 0
  }

  downloadExportContent(payload)
  onStatus?.("ready")
  return payload.row_count ?? 0
}
