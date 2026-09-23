export type StudentListViewFilter = "all" | "unassigned"
export type StudentAccountStatusFilter = "all" | "active" | "inactive"

export type StudentListFilters = {
  q?: string
  branch?: string
  view?: StudentListViewFilter
  status?: StudentAccountStatusFilter
  page?: number
}

export function buildStudentListQuery(filters: StudentListFilters): string {
  const params = new URLSearchParams()
  if (filters.q?.trim()) params.set("q", filters.q.trim())
  if (filters.branch && filters.branch !== "all") params.set("branch", filters.branch)
  if (filters.view && filters.view !== "all") params.set("view", filters.view)
  if (filters.status && filters.status !== "all") params.set("status", filters.status)
  if (filters.page && filters.page > 1) params.set("page", String(filters.page))
  const qs = params.toString()
  return qs ? `?${qs}` : ""
}

export function parseStudentListFilters(searchParams: URLSearchParams): Required<StudentListFilters> {
  const viewRaw = searchParams.get("view")
  const view: StudentListViewFilter = viewRaw === "unassigned" ? "unassigned" : "all"
  const statusRaw = (searchParams.get("status") || "all").toLowerCase()
  const status: StudentAccountStatusFilter =
    statusRaw === "active" || statusRaw === "inactive" ? statusRaw : "all"
  const pageRaw = Number.parseInt(searchParams.get("page") || "1", 10)
  return {
    q: searchParams.get("q") || "",
    branch: searchParams.get("branch") || "all",
    view,
    status,
    page: Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1,
  }
}

export function studentListReturnPath(basePath: string, filters: StudentListFilters): string {
  return `${basePath}/students${buildStudentListQuery(filters)}`
}
