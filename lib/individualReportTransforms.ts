export interface ReportSummary {
  totalRecords: number
  activeRecords: number
  percentage: number
}

export interface ReportTableRow {
  id: number | string
  name: string
  value: number | string
  status: string
}

export interface ReportChartPoint {
  name: string
  value: number
}

const EMPTY_SUMMARY: ReportSummary = {
  totalRecords: 0,
  activeRecords: 0,
  percentage: 0,
}

function roundPercent(numerator: number, denominator: number): number {
  if (!denominator || denominator <= 0) return 0
  return Math.round((numerator / denominator) * 100)
}

export function transformApiData(apiData: any, categoryId: string): { summary: ReportSummary } {
  if (!apiData || typeof apiData !== "object") {
    return { summary: { ...EMPTY_SUMMARY } }
  }

  switch (categoryId) {
    case "student": {
      const enrollment = apiData.student_reports?.enrollment_statistics || []
      const byBranch = apiData.student_reports?.students_by_branch || []
      const attendance = apiData.student_reports?.attendance_statistics || []
      const totalStudents = enrollment.reduce(
        (sum: number, item: any) => sum + (item.total_students || 0),
        0
      )
      const activeRecords = byBranch.reduce(
        (sum: number, item: any) => sum + (item.total_students || 0),
        0
      )
      const avgAttendance =
        attendance.length > 0
          ? attendance.reduce(
              (sum: number, item: any) => sum + (item.attendance_percentage || 0),
              0
            ) / attendance.length
          : 0

      return {
        summary: {
          totalRecords: enrollment.length,
          activeRecords: activeRecords || totalStudents,
          percentage: Math.round(avgAttendance),
        },
      }
    }
    case "financial": {
      const summary = apiData.summary || {}
      const paidCount =
        apiData.analytics?.revenue_by_status?.find((x: any) => x._id === "paid")?.count ||
        apiData.analytics?.revenue_by_status?.find((x: any) => x._id === "completed")?.count ||
        summary.total_transactions ||
        0

      return {
        summary: {
          totalRecords: summary.total_transactions || 0,
          activeRecords: summary.total_revenue || 0,
          percentage: roundPercent(
            paidCount,
            summary.total_transactions || paidCount
          ),
        },
      }
    }
    case "coach": {
      const stats = apiData.coach_reports?.coach_statistics || []
      const byBranch = apiData.coach_reports?.coaches_by_branch || []
      const activeRecords = byBranch.reduce(
        (sum: number, item: any) => sum + (item.total_coaches || 0),
        0
      )

      return {
        summary: {
          totalRecords: stats.length,
          activeRecords,
          percentage: roundPercent(activeRecords, stats.length || activeRecords),
        },
      }
    }
    case "branch": {
      const branches = apiData.branches || []
      const legacyStats = apiData.branch_reports?.branch_statistics || []
      const rows = branches.length ? branches : legacyStats
      const active =
        apiData.summary?.active_branches ??
        rows.filter((b: any) => b.is_active !== false).length

      return {
        summary: {
          totalRecords: rows.length,
          activeRecords: active,
          percentage: roundPercent(active, rows.length),
        },
      }
    }
    case "course": {
      const legacy = apiData.course_reports?.course_enrollment_statistics || []
      const courses = apiData.courses || []
      const rows = legacy.length
        ? legacy
        : courses.map((c: any) => ({
            title: c.title,
            total_enrollments: c.total_enrollments,
            active_enrollments: c.active_enrollments,
          }))
      const totalEnrollments = rows.reduce(
        (sum: number, item: any) => sum + (item.total_enrollments || 0),
        0
      )
      const activeEnrollments = rows.reduce(
        (sum: number, item: any) => sum + (item.active_enrollments || 0),
        0
      )
      const activeCourses =
        apiData.summary?.active_courses ??
        courses.filter((c: any) => c.is_active !== false).length

      return {
        summary: {
          totalRecords: rows.length,
          activeRecords: activeCourses || activeEnrollments,
          percentage: roundPercent(activeEnrollments, totalEnrollments),
        },
      }
    }
    default:
      return { summary: { ...EMPTY_SUMMARY } }
  }
}

export function generateChartData(apiData: any, categoryId: string): ReportChartPoint[] {
  if (!apiData || typeof apiData !== "object") return []

  switch (categoryId) {
    case "financial": {
      const monthly = apiData.analytics?.monthly_revenue || []
      return [...monthly]
        .reverse()
        .map((item: any) => ({
          name: item._id || "Period",
          value: item.total_amount || 0,
        }))
    }
    case "student": {
      const enrollment = apiData.student_reports?.enrollment_statistics || []
      return enrollment.slice(0, 12).map((item: any) => ({
        name: item.course_info?.title || item._id || "Course",
        value: item.total_students || 0,
      }))
    }
    case "course": {
      const legacy = apiData.course_reports?.course_enrollment_statistics || []
      const courses = apiData.courses || []
      const rows = legacy.length ? legacy : courses
      return rows.slice(0, 12).map((item: any) => ({
        name: item.title || item.course_info?.title || "Course",
        value: item.total_enrollments || 0,
      }))
    }
    case "coach": {
      const stats = apiData.coach_reports?.coach_statistics || []
      return stats.slice(0, 12).map((item: any) => ({
        name: item.full_name || "Coach",
        value: item.total_courses || 0,
      }))
    }
    case "branch": {
      const branches = apiData.branches || []
      const legacyStats = apiData.branch_reports?.branch_statistics || []
      const rows = branches.length ? branches : legacyStats
      return rows.slice(0, 12).map((item: any) => ({
        name: item.branch_name || item.name || item.branch_info?.name || "Branch",
        value:
          item.total_enrollments ||
          item.active_enrollments ||
          item.total_students ||
          0,
      }))
    }
    default:
      return []
  }
}

export function generateTableData(apiData: any, categoryId: string): ReportTableRow[] {
  if (!apiData || typeof apiData !== "object") return []

  switch (categoryId) {
    case "student":
      return (apiData.student_reports?.enrollment_statistics || [])
        .slice(0, 50)
        .map((item: any, index: number) => ({
          id: item._id || item.course_info?.id || index + 1,
          name: item.course_info?.title || item._id || "Course",
          value: item.total_students || 0,
          status: (item.total_students || 0) > 0 ? "Active" : "Inactive",
        }))
    case "financial":
      return (apiData.payments || []).slice(0, 50).map((item: any, index: number) => ({
        id: item.id || index + 1,
        name:
          item.course_details?.course_name ||
          item.branch_details?.branch_name ||
          item.transaction_id ||
          "Payment",
        value: item.amount ?? item.formatted_amount ?? 0,
        status: item.payment_status || "Unknown",
      }))
    case "coach":
      return (apiData.coach_reports?.coach_statistics || [])
        .slice(0, 50)
        .map((item: any, index: number) => ({
          id: item._id || item.id || index + 1,
          name: item.full_name || item.email || "Coach",
          value: item.total_courses || 0,
          status: "Active",
        }))
    case "branch": {
      const branches = apiData.branches || []
      const legacyStats = apiData.branch_reports?.branch_statistics || []
      const rows = branches.length ? branches : legacyStats
      return rows.slice(0, 50).map((item: any, index: number) => ({
        id: item.id || item._id || index + 1,
        name: item.branch_name || item.name || "Branch",
        value:
          item.total_enrollments ||
          item.active_enrollments ||
          item.total_students ||
          0,
        status: item.is_active === false ? "Inactive" : item.status || "Active",
      }))
    }
    case "course": {
      const legacy = apiData.course_reports?.course_enrollment_statistics || []
      const courses = apiData.courses || []
      const rows = legacy.length ? legacy : courses
      return rows.slice(0, 50).map((item: any, index: number) => ({
        id: item.id || item._id || index + 1,
        name: item.title || item.course_info?.title || "Course",
        value: item.total_enrollments || 0,
        status:
          (item.active_enrollments || 0) > 0
            ? "Active"
            : (item.is_active === false ? "Inactive" : "Active"),
      }))
    }
    default:
      return []
  }
}

export function emptyReportPayload(reportName: string, categoryName: string) {
  return {
    reportName,
    categoryName,
    reportData: { summary: { ...EMPTY_SUMMARY } },
    chartData: [] as ReportChartPoint[],
    tableData: [] as ReportTableRow[],
  }
}

/** Branch-manager generic report card shape from real API payloads */
export function toBranchManagerGenericReport(
  apiData: any,
  categoryId: string,
  meta: { title: string; branchId: string; branchName: string }
) {
  const { summary } = transformApiData(apiData, categoryId)
  const chartPoints = generateChartData(apiData, categoryId)
  const tableRows = generateTableData(apiData, categoryId)

  return {
    title: meta.title,
    branch_id: meta.branchId,
    branch_name: meta.branchName,
    generated_at: apiData.generated_at || new Date().toISOString(),
    data: {
      summary: {
        total_records: summary.totalRecords,
        active_records: summary.activeRecords,
        growth_rate: `${summary.percentage}%`,
      },
      charts: chartPoints.length
        ? [
            {
              type: "bar",
              title: "Report breakdown",
              data: chartPoints.map((p) => ({ month: p.name, value: p.value })),
            },
          ]
        : [],
      tableRows,
    },
  }
}

export const BM_REPORTS_WITH_API: Record<string, string[]> = {
  course: [
    "course-popularity-analysis",
    "course-completion-rates",
    "course-revenue-breakdown",
    "course-capacity-analysis",
    "course-instructor-performance",
    "course-feedback-analysis",
  ],
  student: [
    "student-enrollment-trends",
    "student-attendance-summary",
    "student-performance-analytics",
    "student-demographics",
    "student-retention-analysis",
    "student-feedback-summary",
  ],
  financial: [
    "revenue-summary",
    "payment-collection-report",
    "outstanding-dues-analysis",
    "refund-and-adjustments",
  ],
  branch: [
    "branch-performance-overview",
    "branch-enrollment-statistics",
    "branch-revenue-analysis",
    "branch-capacity-utilization",
    "branch-staff-allocation",
    "branch-operational-hours",
  ],
  coach: ["coach-overview", "coach-performance", "coach-assignments"],
  operational: ["daily-operations-summary"],
}

export function isBranchManagerReportSupported(categoryId: string, reportId: string): boolean {
  return (BM_REPORTS_WITH_API[categoryId] || []).includes(reportId)
}
