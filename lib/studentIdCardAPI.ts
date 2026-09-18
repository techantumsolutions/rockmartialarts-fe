import { getBackendApiUrl } from "./config"
import { TokenManager } from "./tokenManager"

export interface StudentIdCardDisplay {
  full_name?: string
  card_number?: string
  student_ref?: string
  branch_name?: string
  course_name?: string
  account_status?: string
  photo_url?: string | null
  card_status?: string
  is_valid?: boolean
}

export interface StudentIdCardPayload {
  id?: string
  student_id?: string
  card_number?: string
  status?: string
  created_at?: string
  updated_at?: string
  created_by_name?: string
  qr_token?: string
  verify_url?: string
}

export interface StudentIdCardResponse {
  card: StudentIdCardPayload | null
  display?: StudentIdCardDisplay
  qr_image_base64?: string
  card_image_base64?: string
  visible_fields?: string[]
  fields_note?: string
  message?: string
}

export interface StudentIdVerifyResponse {
  valid: boolean
  status: string
  message: string
  display: StudentIdCardDisplay | null
  visible_fields?: string[]
}

function authHeaders(token?: string): HeadersInit {
  const authToken = token || TokenManager.getToken()
  return {
    Authorization: `Bearer ${authToken}`,
    "Content-Type": "application/json",
    "Cache-Control": "no-cache",
  }
}

class StudentIdCardAPI {
  async getIdCard(studentId: string, token?: string): Promise<StudentIdCardResponse> {
    const res = await fetch(getBackendApiUrl(`users/${studentId}/id-card`), {
      method: "GET",
      headers: authHeaders(token),
      cache: "no-store",
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(
        typeof err.detail === "string" ? err.detail : `Failed to load ID card (${res.status})`
      )
    }
    return res.json()
  }

  async generateIdCard(
    studentId: string,
    options: { regenerate?: boolean; token?: string } = {}
  ): Promise<StudentIdCardResponse> {
    const qs = options.regenerate ? "?regenerate=true" : ""
    const res = await fetch(getBackendApiUrl(`users/${studentId}/id-card${qs}`), {
      method: "POST",
      headers: authHeaders(options.token),
      cache: "no-store",
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(
        typeof err.detail === "string" ? err.detail : `Failed to generate ID card (${res.status})`
      )
    }
    return res.json()
  }

  async revokeIdCard(studentId: string, token?: string): Promise<{ message: string }> {
    const res = await fetch(getBackendApiUrl(`users/${studentId}/id-card/revoke`), {
      method: "POST",
      headers: authHeaders(token),
      cache: "no-store",
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(
        typeof err.detail === "string" ? err.detail : `Failed to revoke ID card (${res.status})`
      )
    }
    return res.json()
  }

  async verifyPublic(token: string): Promise<StudentIdVerifyResponse> {
    const res = await fetch(getBackendApiUrl(`public/student-id/verify/${encodeURIComponent(token)}`), {
      method: "GET",
      headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" },
      cache: "no-store",
    })
    if (res.status === 429) {
      const err: any = new Error("Too many verification attempts. Please try again shortly.")
      err.status = 429
      throw err
    }
    if (!res.ok) {
      return {
        valid: false,
        status: "invalid",
        message: "This student ID could not be verified.",
        display: null,
      }
    }
    const data = await res.json()
    // Client-side belt-and-suspenders: never surface forbidden fields if API drifts
    if (data?.display && typeof data.display === "object") {
      const allowed = new Set([
        "full_name",
        "card_number",
        "branch_name",
        "course_name",
        "account_status",
        "photo_url",
        "card_status",
      ])
      const cleaned: Record<string, unknown> = {}
      for (const key of allowed) {
        cleaned[key] = data.display[key] ?? null
      }
      data.display = cleaned
    }
    delete data.student_id
    delete data.email
    delete data.phone
    delete data.qr_token
    return data
  }
}

export const studentIdCardAPI = new StudentIdCardAPI()
