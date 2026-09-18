import { getBackendApiUrl } from "./config"
import { TokenManager } from "./tokenManager"
import { BranchManagerAuth } from "./branchManagerAuth"

export type BiometricDeviceStatus = "active" | "inactive" | "maintenance"

export interface BiometricDevice {
  id: string
  name: string
  vendor: string
  vendor_device_id: string
  branch_id: string
  branch_name?: string
  branch_code?: string
  status: BiometricDeviceStatus
  location_note?: string | null
  ip_address?: string | null
  created_at?: string
  updated_at?: string
}

export interface BiometricDevicePayload {
  name: string
  vendor?: string
  vendor_device_id: string
  branch_id: string
  status?: BiometricDeviceStatus
  location_note?: string | null
  ip_address?: string | null
}

function authToken(): string | null {
  return BranchManagerAuth.getToken() || TokenManager.getToken()
}

function authHeaders(): HeadersInit {
  const token = authToken()
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "Cache-Control": "no-cache",
  }
}

class BiometricDeviceAPI {
  async list(params: {
    branch_id?: string
    status?: string
    vendor?: string
    skip?: number
    limit?: number
  } = {}): Promise<{ devices: BiometricDevice[]; total: number }> {
    const qs = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "" && v !== "all") qs.append(k, String(v))
    })
    const res = await fetch(
      getBackendApiUrl(`biometric-devices${qs.toString() ? `?${qs}` : ""}`),
      { headers: authHeaders(), cache: "no-store" }
    )
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(typeof err.detail === "string" ? err.detail : `Failed to load devices (${res.status})`)
    }
    return res.json()
  }

  async create(body: BiometricDevicePayload): Promise<{ device: BiometricDevice }> {
    const res = await fetch(getBackendApiUrl("biometric-devices"), {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
      cache: "no-store",
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(typeof err.detail === "string" ? err.detail : `Create failed (${res.status})`)
    }
    return res.json()
  }

  async update(id: string, body: Partial<BiometricDevicePayload>): Promise<{ device: BiometricDevice }> {
    const res = await fetch(getBackendApiUrl(`biometric-devices/${id}`), {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(body),
      cache: "no-store",
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(typeof err.detail === "string" ? err.detail : `Update failed (${res.status})`)
    }
    return res.json()
  }

  async deactivate(id: string): Promise<{ device: BiometricDevice }> {
    const res = await fetch(getBackendApiUrl(`biometric-devices/${id}`), {
      method: "DELETE",
      headers: authHeaders(),
      cache: "no-store",
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(typeof err.detail === "string" ? err.detail : `Deactivate failed (${res.status})`)
    }
    return res.json()
  }
}

export const biometricDeviceAPI = new BiometricDeviceAPI()
