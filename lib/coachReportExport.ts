import { reportsAPI, type CoachData } from "@/lib/reportsAPI"

export type CoachReportExportFilters = {
  branch_id?: string
  course_id?: string
  area_of_expertise?: string
  professional_experience?: string
  designation_id?: string
  active_only?: boolean
  search?: string
}

const PAGE_SIZE = 100 // backend max for /reports/masters
const MAX_PAGES = 100

const COLUMNS = [
  "Name",
  "Designation",
  "Email",
  "Phone",
  "Branch",
  "Courses",
  "Expertise",
  "Experience",
  "Status",
  "Join Date",
] as const

async function fetchAllCoaches(token: string, filters: CoachReportExportFilters): Promise<CoachData[]> {
  const all: CoachData[] = []
  for (let page = 0; page < MAX_PAGES; page++) {
    const response = await reportsAPI.getCoachReports(token, {
      ...filters,
      skip: page * PAGE_SIZE,
      limit: PAGE_SIZE,
    })
    const rows = response.coachs || []
    all.push(...rows)
    if (!response.pagination?.has_more || rows.length === 0) break
  }
  return all
}

function formatDate(value?: string | null): string {
  if (!value) return ""
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString()
}

function toRow(coach: CoachData): string[] {
  const expertise = (coach.areas_of_expertise || []).map(
    (area, idx) => coach.areas_of_expertise_names?.[idx] || area
  )
  const branch = coach.branch
    ? `${coach.branch.name || ""}${coach.branch.code ? ` (${coach.branch.code})` : ""}`
    : ""
  return [
    coach.full_name || `${coach.first_name || ""} ${coach.last_name || ""}`.trim(),
    coach.designation || "",
    coach.email || "",
    coach.phone || "",
    branch,
    (coach.assigned_courses || []).map((c) => c.title).filter(Boolean).join(", "),
    expertise.join(", "),
    coach.professional_experience || "",
    coach.is_active ? "Active" : "Inactive",
    formatDate(coach.join_date),
  ]
}

function fileStamp(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Downloads every coach matching the filters. Returns the number of rows exported. */
export async function exportCoachReport(
  format: "excel" | "pdf",
  token: string,
  filters: CoachReportExportFilters
): Promise<number> {
  const coaches = await fetchAllCoaches(token, filters)
  const rows = coaches.map(toRow)

  if (format === "excel") {
    const XLSX = await import("xlsx")
    const sheet = XLSX.utils.aoa_to_sheet([[...COLUMNS], ...rows])
    sheet["!cols"] = COLUMNS.map((col) => ({ wch: Math.max(12, col.length + 4) }))
    const book = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(book, sheet, "Coach Report")
    XLSX.writeFile(book, `coach-report-${fileStamp()}.xlsx`)
    return rows.length
  }

  const { jsPDF } = await import("jspdf")
  const autoTable = (await import("jspdf-autotable")).default
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" })
  doc.setFontSize(14)
  doc.text("Coach Report", 40, 36)
  doc.setFontSize(9)
  doc.text(`Generated ${new Date().toLocaleString()}  |  ${rows.length} coach(es)`, 40, 52)
  autoTable(doc, {
    head: [[...COLUMNS]],
    body: rows,
    startY: 64,
    styles: { fontSize: 7, cellPadding: 3, overflow: "linebreak" },
    headStyles: { fillColor: [37, 99, 235] },
    margin: { left: 24, right: 24 },
  })
  doc.save(`coach-report-${fileStamp()}.pdf`)
  return rows.length
}
