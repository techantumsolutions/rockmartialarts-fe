import { getBackendApiUrl } from "@/lib/config"
import { uploadFile } from "@/lib/upload"
import { TokenManager } from "@/lib/tokenManager"
import type { StudentIdCardResponse } from "@/lib/studentIdCardAPI"

export type StudentPhotoUploadResult = {
  profile_image: string
  id_card?: StudentIdCardResponse | null
  message?: string
}

function parseApiError(data: any, status: number): string {
  const detail = data?.detail
  if (typeof detail === "string" && detail.trim()) return detail
  if (Array.isArray(detail) && detail.length) {
    const parts = detail
      .map((d) => (typeof d?.msg === "string" ? d.msg : typeof d === "string" ? d : ""))
      .filter(Boolean)
    if (parts.length) return parts.join("; ")
  }
  if (typeof data?.message === "string" && data.message.trim()) return data.message
  return `Upload failed (${status})`
}

function assertImageFile(file: File) {
  const name = (file.name || "student-photo.jpg").toLowerCase()
  const okExt = /\.(jpe?g|png|webp)$/i.test(name)
  const okType =
    !file.type ||
    file.type.startsWith("image/") ||
    file.type === "application/octet-stream"
  if (!okType && !okExt) {
    throw new Error("Please choose a JPG, PNG, or WEBP image")
  }
  if (file.size > 2 * 1024 * 1024) {
    throw new Error("Photo must be 2 MB or smaller")
  }
}

/**
 * Upload student photo for ID card / profile.
 * Tries dedicated multipart endpoint, then falls back to /uploads + PUT profile_image.
 */
export async function uploadStudentPhoto(
  studentId: string,
  file: File,
  token?: string | null
): Promise<StudentPhotoUploadResult> {
  const authToken = token || TokenManager.getToken()
  if (!authToken) throw new Error("Authentication required")
  if (!studentId) throw new Error("Student id is required")
  assertImageFile(file)

  // Attempt 1 — dedicated multipart endpoint
  try {
    const form = new FormData()
    form.append("file", file, file.name || "student-photo.jpg")
    const res = await fetch(getBackendApiUrl(`users/${studentId}/profile-photo`), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Cache-Control": "no-cache",
      },
      body: form,
      cache: "no-store",
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok && data?.profile_image) {
      return {
        profile_image: String(data.profile_image),
        id_card: (data.id_card as StudentIdCardResponse) ?? null,
        message: data.message,
      }
    }
    // Soft-fail to fallback for proxy/method issues
    if (res.status === 401 || res.status === 403) {
      throw new Error(parseApiError(data, res.status))
    }
    console.warn("profile-photo endpoint failed, trying upload fallback", res.status, data)
  } catch (err: any) {
    if (err?.message && /Authentication|Not authenticated|Forbidden|403|401/i.test(err.message)) {
      throw err
    }
    console.warn("profile-photo request error, trying upload fallback", err)
  }

  // Attempt 2 — generic upload + PUT profile_image
  const uploaded = await uploadFile(file)
  const fileUrl = uploaded.file_url
  const putRes = await fetch(getBackendApiUrl(`users/${studentId}`), {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
    },
    body: JSON.stringify({ profile_image: fileUrl }),
    cache: "no-store",
  })
  const putData = await putRes.json().catch(() => ({}))
  if (!putRes.ok) {
    throw new Error(parseApiError(putData, putRes.status))
  }

  return {
    profile_image: fileUrl,
    id_card: null,
    message: "Student photo updated successfully",
  }
}
