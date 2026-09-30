import { reportsAPI } from "@/lib/reportsAPI"

export type OperationalReportType = "enrollments" | "renewals" | "leads" | "events"

export const OPERATIONAL_REPORT_TYPES: OperationalReportType[] = ["enrollments", "renewals", "leads", "events"]

export function isOperationalReportType(value: string): value is OperationalReportType {
  return (OPERATIONAL_REPORT_TYPES as string[]).includes(value)
}

type FinancialExportFilters = Parameters<typeof reportsAPI.getFinancialReports>[1]
type BranchExportFilters = Record<string, string | undefined>
type OperationalExportFilters = { branch_id?: string; start_date?: string; end_date?: string }

const PAGE_SIZE = 100 // backend max for /reports/financial and /reports/branches
const OPERATIONAL_PAGE_SIZE = 1000 // backend max for operational reports
const MAX_PAGES = 100

const HIDDEN_OPERATIONAL_KEYS = new Set(["_id", "password", "password_hash"])

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

/** Columns for an operational report: every top-level field that holds a plain value in at least one row. */
export function operationalColumns(rows: any[]): string[] {
  const keys: string[] = []
  const seen = new Set<string>()
  rows.forEach((row) => {
    Object.entries(row || {}).forEach(([key, value]) => {
      if (seen.has(key) || HIDDEN_OPERATIONAL_KEYS.has(key)) return
      if (value !== null && typeof value === "object" && !Array.isArray(value)) return
      seen.add(key)
      keys.push(key)
    })
  })
  return keys
}

export function operationalColumnLabel(key: string): string {
  return titleCase(key)
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

/** Downloads every operational row matching the filters. Returns the number of rows exported. */
export async function exportOperationalReport(
  token: string,
  reportType: OperationalReportType,
  filters: OperationalExportFilters = {}
): Promise<number> {
  const all: any[] = []
  for (let page = 0; page < MAX_PAGES; page++) {
    const response = await reportsAPI.getOperationalReports(token, reportType, {
      ...filters,
      skip: page * OPERATIONAL_PAGE_SIZE,
      limit: OPERATIONAL_PAGE_SIZE,
    })
    const rows = response.rows || []
    all.push(...rows)
    const total = typeof response.total === "number" ? response.total : all.length
    if (rows.length === 0 || all.length >= total) break
  }

  const keys = operationalColumns(all)
  const rows = all.map((row) => keys.map((key) => formatOperationalValue(row?.[key])))
  await writeWorkbook(`${titleCase(reportType)} Report`, `${reportType}-report`, keys.map(operationalColumnLabel), rows)
  return rows.length
}
