import { getBackendApiUrl } from "./config"
import { TokenManager } from "./tokenManager"

export interface SyllabusProfile {
  id: string
  full_name: string
  is_self?: boolean
}

export interface StudentSyllabusItem {
  course_id: string
  course_name: string
  branch_id?: string
  enrollment_id?: string
  enrollment_active: boolean
  has_syllabus: boolean
  syllabus: {
    id: string
    title?: string | null
    version: number
    original_filename?: string
    size_bytes?: number
    effective_from?: string | null
    is_active?: boolean
  } | null
}

export interface StudentSyllabiResponse {
  student_id: string
  student_name: string
  items: StudentSyllabusItem[]
  total_courses: number
  with_syllabus: number
}

function authHeaders(): HeadersInit {
  const token = TokenManager.getToken()
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "Cache-Control": "no-cache",
  }
}

async function parseError(res: Response) {
  const err = await res.json().catch(() => ({}))
  if (typeof err.detail === "string") return err.detail
  if (err.detail?.message) return err.detail.message
  return `Request failed (${res.status})`
}

class StudentSyllabusAPI {
  async listProfiles() {
    const res = await fetch(getBackendApiUrl("student/syllabus-profiles"), {
      headers: authHeaders(),
      cache: "no-store",
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{
      profiles: SyllabusProfile[]
      selected_student_id?: string
      count: number
    }>
  }

  async listForStudent(studentId: string) {
    const res = await fetch(
      getBackendApiUrl(`student/syllabi/${encodeURIComponent(studentId)}`),
      { headers: authHeaders(), cache: "no-store" }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<StudentSyllabiResponse>
  }

  fileUrl(studentId: string, syllabusId: string) {
    return getBackendApiUrl(
      `student/syllabi/${encodeURIComponent(studentId)}/file/${encodeURIComponent(syllabusId)}`
    )
  }
}

export const studentSyllabusAPI = new StudentSyllabusAPI()
