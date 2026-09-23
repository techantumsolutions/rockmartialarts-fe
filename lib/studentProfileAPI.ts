// API utility functions for student profile management
import { BaseAPI } from './baseAPI'

export interface StudentAddress {
  street?: string
  city?: string
  state?: string
  postal_code?: string
  country?: string
}

export interface StudentEmergencyContact {
  name?: string
  phone?: string
  relationship?: string
}

export interface StudentMedicalInfo {
  allergies?: string
  medications?: string
  conditions?: string
  blood_type?: string
}

export interface StudentEnrollment {
  id: string
  course_id: string
  course_name: string
  branch_id: string
  branch_name: string
  enrollment_date?: string
  start_date?: string
  end_date?: string
  /** Paid-date billing next renewal (M07-S02); falls back to end_date in UI when absent */
  next_due_date?: string | null
  billing_period_start?: string | null
  billing_period_end?: string | null
  /** Derived server-side status: active | expired | pending | cancelled | inactive | paused */
  status?: string
  payment_status: string
  is_active: boolean
  /** Selected pricing tenure when enrollment was created (matches prepare-checkout `duration`). */
  duration_id?: string | null
  duration_months?: number | null
  /** Branch course_schedule batch used for current admin pricing. */
  batch_ref?: string | null
  fee_amount?: number | null
  admission_fee?: number | null
}

export interface StudentProfile {
  id: string
  email: string
  phone: string
  first_name: string
  last_name: string
  full_name: string
  date_of_birth?: string
  gender?: string
  /** Public URL path e.g. /uploads/images/... */
  profile_image?: string | null
  /** Belt/rank when configured in backend (no default in UI) */
  current_belt?: string | null
  address?: StudentAddress
  emergency_contact?: StudentEmergencyContact
  medical_info?: StudentMedicalInfo
  is_active: boolean
  created_at: string
  updated_at: string
  enrollments: StudentEnrollment[]
}

export interface StudentProfileUpdateData {
  first_name?: string
  last_name?: string
  phone?: string
  date_of_birth?: string
  gender?: string
  address?: StudentAddress
  emergency_contact?: StudentEmergencyContact
  medical_info?: StudentMedicalInfo
}

export interface StudentProfileResponse {
  message: string
  profile: StudentProfile
}

export interface StudentProfileUpdateResponse {
  message: string
}

class StudentProfileAPI extends BaseAPI {
  /**
   * Get current student's profile information
   * @param token - JWT authentication token
   * @returns Promise<StudentProfileResponse>
   */
  async getProfile(token: string): Promise<StudentProfileResponse> {
    return await this.makeRequest('/api/auth/profile', {
      method: 'GET',
      token
    })
  }

  /**
   * Update current student's profile information
   * @param profileData - Profile update data
   * @param token - JWT authentication token
   * @returns Promise<StudentProfileUpdateResponse>
   */
  async updateProfile(
    profileData: StudentProfileUpdateData,
    token: string
  ): Promise<StudentProfileUpdateResponse> {
    return await this.makeRequest('/api/auth/profile', {
      method: 'PUT',
      body: profileData,
      token
    })
  }

  /**
   * Get current user info (existing endpoint)
   * @param token - JWT authentication token
   * @returns Promise<any>
   */
  async getCurrentUser(token: string): Promise<any> {
    return await this.makeRequest('/api/auth/me', {
      method: 'GET',
      token
    })
  }

  /**
   * Upload profile photo (multipart). JPG/PNG, max ~2MB enforced server-side.
   */
  async uploadProfilePhoto(
    file: File,
    token: string
  ): Promise<{ message: string; profile_image: string }> {
    const form = new FormData()
    form.append('file', file)
    const { getBackendApiUrl } = await import('@/lib/config')
    const url = getBackendApiUrl('auth/profile/photo')
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const detail = typeof data.detail === 'string' ? data.detail : data.message
      throw new Error(detail || `Upload failed (${res.status})`)
    }
    return data
  }
}

export const studentProfileAPI = new StudentProfileAPI()
