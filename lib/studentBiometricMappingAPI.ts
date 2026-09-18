import { getBackendApiUrl } from "./config"
import { TokenManager } from "./tokenManager"
import { BranchManagerAuth } from "./branchManagerAuth"

export interface BiometricMappingRow {
  student_id: string
  full_name?: string
  email?: string
  phone?: string
  is_active?: boolean
  branch_id?: string
  branch_name?: string
  biometric_id?: string | null
  essl_user_id?: string | null
  is_mapped?: boolean
}

function authHeaders(): HeadersInit {
  const token = BranchManagerAuth.getToken() || TokenManager.getToken()
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "Cache-Control": "no-cache",
  }
}

class StudentBiometricMappingAPI {
  async list(params: {
    q?: string
    branch_id?: string
    mapped?: string
    skip?: number
    limit?: number
  } = {}): Promise<{ students: BiometricMappingRow[]; total: number }> {
    const qs = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "" && v !== "all") qs.append(k, String(v))
    })
    const res = await fetch(
      getBackendApiUrl(`users/students/biometric-mappings${qs.toString() ? `?${qs}` : ""}`),
      { headers: authHeaders(), cache: "no-store" }
    )
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(typeof err.detail === "string" ? err.detail : `Failed to load (${res.status})`)
    }
    return res.json()
  }

  async set(
    studentId: string,
    body: { biometric_id?: string; essl_user_id?: string }
  ): Promise<{ mapping: BiometricMappingRow }> {
    const res = await fetch(getBackendApiUrl(`users/${studentId}/biometric-mapping`), {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(body),
      cache: "no-store",
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(typeof err.detail === "string" ? err.detail : `Save failed (${res.status})`)
    }
    return res.json()
  }

  async clear(studentId: string): Promise<{ mapping: BiometricMappingRow }> {
    const res = await fetch(getBackendApiUrl(`users/${studentId}/biometric-mapping`), {
      method: "DELETE",
      headers: authHeaders(),
      cache: "no-store",
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(typeof err.detail === "string" ? err.detail : `Clear failed (${res.status})`)
    }
    return res.json()
  }
}

export const studentBiometricMappingAPI = new StudentBiometricMappingAPI()
