import { getBackendApiUrl } from "./config"
import { TokenManager } from "./tokenManager"
import { BranchManagerAuth } from "./branchManagerAuth"

export interface CourseSyllabus {
  id: string
  course_id: string
  course_name?: string
  title?: string | null
  notes?: string | null
  version: number
  is_active: boolean
  original_filename: string
  size_bytes: number
  content_type?: string
  sha256?: string | null
  effective_from?: string | null
  effective_to?: string | null
  superseded_at?: string | null
  superseded_by_id?: string | null
  uploaded_by_name?: string | null
  created_at?: string
  updated_at?: string
}

function authHeaders(json = false): HeadersInit {
  const token = BranchManagerAuth.getToken() || TokenManager.getToken()
  const h: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Cache-Control": "no-cache",
  }
  if (json) h["Content-Type"] = "application/json"
  return h
}

async function parseError(res: Response) {
  const err = await res.json().catch(() => ({}))
  if (typeof err.detail === "string") return err.detail
  if (err.detail?.message) return err.detail.message
  return `Request failed (${res.status})`
}

class SyllabusAPI {
  async list(params: { course_id?: string; active_only?: boolean } = {}) {
    const qs = new URLSearchParams()
    if (params.course_id) qs.set("course_id", params.course_id)
    if (params.active_only) qs.set("active_only", "true")
    qs.set("limit", "200")
    const res = await fetch(getBackendApiUrl(`course-syllabi?${qs.toString()}`), {
      headers: authHeaders(),
      cache: "no-store",
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json() as Promise<{ syllabi: CourseSyllabus[]; total: number }>
  }

  async create(payload: {
    course_id: string
    file: File
    title?: string
    notes?: string
    activate?: boolean
  }) {
    const fd = new FormData()
    fd.append("course_id", payload.course_id)
    fd.append("file", payload.file)
    if (payload.title) fd.append("title", payload.title)
    if (payload.notes) fd.append("notes", payload.notes)
    fd.append("activate", payload.activate ? "true" : "false")
    const res = await fetch(getBackendApiUrl("course-syllabi"), {
      method: "POST",
      headers: authHeaders(),
      body: fd,
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json()
  }

  async replace(
    id: string,
    payload: { file: File; title?: string; notes?: string; activate?: boolean }
  ) {
    const fd = new FormData()
    fd.append("file", payload.file)
    if (payload.title) fd.append("title", payload.title)
    if (payload.notes) fd.append("notes", payload.notes)
    fd.append("activate", payload.activate === false ? "false" : "true")
    const res = await fetch(getBackendApiUrl(`course-syllabi/${id}/replace`), {
      method: "POST",
      headers: authHeaders(),
      body: fd,
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json()
  }

  async activate(id: string) {
    const res = await fetch(getBackendApiUrl(`course-syllabi/${id}/activate`), {
      method: "POST",
      headers: authHeaders(),
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json()
  }

  async deactivate(id: string) {
    const res = await fetch(getBackendApiUrl(`course-syllabi/${id}/deactivate`), {
      method: "POST",
      headers: authHeaders(),
    })
    if (!res.ok) throw new Error(await parseError(res))
    return res.json()
  }

  fileUrl(id: string) {
    return getBackendApiUrl(`course-syllabi/${id}/file`)
  }
}

export const syllabusAPI = new SyllabusAPI()
