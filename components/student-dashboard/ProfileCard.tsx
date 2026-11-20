"use client"

import { useRef, useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { PerformanceProfile } from "@/lib/student-performance-types"
import { Camera, Loader2, User, X } from "lucide-react"
import { getBackendApiUrl } from "@/lib/config"
import { useToast } from "@/hooks/use-toast"
import { TokenManager } from "@/lib/tokenManager"
import { resolvePublicAssetUrl } from "@/lib/resolvePublicAssetUrl"

function fmtJoin(d?: string | null) {
  if (!d) return "—"
  try {
    return new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  } catch {
    return String(d)
  }
}

const PHOTO_STORAGE_KEY = "student_profile_photos"

function getSavedPhoto(studentId: string): string | null {
  try {
    const map = JSON.parse(localStorage.getItem(PHOTO_STORAGE_KEY) || "{}")
    return map[studentId] || null
  } catch {
    return null
  }
}

function savePhoto(studentId: string, url: string) {
  try {
    const map = JSON.parse(localStorage.getItem(PHOTO_STORAGE_KEY) || "{}")
    map[studentId] = url
    localStorage.setItem(PHOTO_STORAGE_KEY, JSON.stringify(map))
  } catch {
    /* ignore */
  }
}

function clearSavedPhoto(studentId: string) {
  try {
    const map = JSON.parse(localStorage.getItem(PHOTO_STORAGE_KEY) || "{}")
    delete map[studentId]
    localStorage.setItem(PHOTO_STORAGE_KEY, JSON.stringify(map))
  } catch {
    /* ignore */
  }
}

function parseUploadError(data: any, status: number): string {
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

/**
 * Student self-upload via /api/auth/profile/photo (students cannot use admin /uploads).
 */
async function uploadStudentSelfPhoto(file: File, token: string): Promise<string> {
  const form = new FormData()
  form.append("file", file, file.name || "student-photo.jpg")

  const res = await fetch(getBackendApiUrl("auth/profile/photo"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Cache-Control": "no-cache",
    },
    body: form,
    cache: "no-store",
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(parseUploadError(data, res.status))
  }

  const url =
    data.profile_image || data.url || data.file_url || data.path || ""
  if (!url || typeof url !== "string") {
    throw new Error("Upload succeeded but no image URL was returned")
  }
  return String(url)
}

export function ProfileCard({
  profile,
  studentId,
  onPhotoUpdated,
}: {
  profile: PerformanceProfile
  studentId?: string | null
  onPhotoUpdated?: () => void
}) {
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [localImage, setLocalImage] = useState<string | null>(null)
  const [photoRemoved, setPhotoRemoved] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)

  const showPhotoError = (message: string) => {
    setPhotoError(message)
    toast({
      title: "Upload error",
      description: message,
      variant: "destructive",
    })
  }

  useEffect(() => {
    setPhotoRemoved(false)
    if (studentId) {
      const saved = getSavedPhoto(studentId)
      if (saved) setLocalImage(saved)
      else setLocalImage(null)
    } else {
      setLocalImage(null)
    }
  }, [studentId])

  const rawImage = photoRemoved ? null : localImage || profile.profile_image || null
  const displayImage = useMemo(
    () => (rawImage ? resolvePublicAssetUrl(rawImage) : null),
    [rawImage]
  )
  const initials = (profile.name || "?").charAt(0).toUpperCase()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoError(null)

    if (file.size > 2 * 1024 * 1024) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1)
      showPhotoError(`Image is ${sizeMb} MB. Maximum allowed size is 2 MB.`)
      if (fileRef.current) fileRef.current.value = ""
      return
    }

    const nameOk = /\.(jpe?g|png|webp)$/i.test(file.name || "")
    const typeOk =
      !file.type ||
      file.type === "image/jpeg" ||
      file.type === "image/jpg" ||
      file.type === "image/png" ||
      file.type === "image/webp" ||
      file.type === "application/octet-stream"
    if (!nameOk && !typeOk) {
      showPhotoError("Please choose a JPG, PNG, or WEBP image.")
      if (fileRef.current) fileRef.current.value = ""
      return
    }

    const token = TokenManager.getToken()
    if (!token) {
      showPhotoError("Please log in again.")
      return
    }

    setUploading(true)
    try {
      const imageUrl = await uploadStudentSelfPhoto(file, token)
      if (studentId) savePhoto(studentId, imageUrl)
      setLocalImage(imageUrl)
      setPhotoRemoved(false)
      setPhotoError(null)
      toast({ title: "Profile photo updated" })
      onPhotoUpdated?.()
    } catch (err) {
      showPhotoError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  const handleRemovePhoto = async () => {
    if (!displayImage || uploading || removing) return
    const token = TokenManager.getToken()
    setRemoving(true)
    setPhotoError(null)
    try {
      if (studentId && token) {
        await fetch(getBackendApiUrl(`student/profile/${encodeURIComponent(studentId)}`), {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ profile_image: null }),
        }).catch(() => {})
      }
      if (studentId) clearSavedPhoto(studentId)
      setLocalImage(null)
      setPhotoRemoved(true)
      toast({ title: "Profile photo removed" })
      onPhotoUpdated?.()
    } catch (err) {
      showPhotoError(err instanceof Error ? err.message : "Could not remove photo")
    } finally {
      setRemoving(false)
    }
  }

  return (
    <Card className="border-amber-200/60 shadow-sm bg-gradient-to-br from-white to-amber-50/30">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg text-slate-800">
          <User className="h-5 w-5 text-amber-600" />
          Profile
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <div className="shrink-0 w-[5.75rem]">
            <div className="relative group h-20 w-20 mx-auto">
              <div className="h-20 w-20 rounded-full overflow-hidden border-2 border-amber-200 bg-amber-50 flex items-center justify-center">
                {displayImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={displayImage}
                    alt={profile.name || ""}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-bold text-amber-600">{initials}</span>
                )}
              </div>
              {displayImage ? (
                <button
                  type="button"
                  onClick={() => void handleRemovePhoto()}
                  disabled={uploading || removing}
                  className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 disabled:opacity-50 z-10"
                  title="Remove photo"
                  aria-label="Remove photo"
                >
                  {removing ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <X className="h-3.5 w-3.5" />
                  )}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading || removing}
                className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-md hover:bg-amber-600 transition-colors disabled:opacity-50 z-10"
                title="Change photo"
              >
                {uploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Camera className="h-3.5 w-3.5" />
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
            {photoError ? (
              <p
                className="mt-3 text-center text-xs font-medium text-red-600 leading-snug"
                role="alert"
              >
                {photoError}
              </p>
            ) : (
              <p className="mt-3 text-center text-[10px] text-slate-500 leading-snug">
                JPG/PNG/WEBP, max 2 MB
              </p>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 text-sm text-slate-700 flex-1 min-w-0">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Name</p>
              <p className="font-semibold text-base text-slate-900">
                {profile.name || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Level / Belt</p>
              <p className="font-medium">{profile.level_or_belt || "—"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Academy</p>
              <p className="font-medium">{profile.branch || "—"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Martial art</p>
              <p className="font-medium">{profile.martial_art || "—"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Date of joining</p>
              <p className="font-medium">{fmtJoin(profile.date_of_joining)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Coach</p>
              <p className="font-medium">{profile.coach || "—"}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
