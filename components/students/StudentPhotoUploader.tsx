"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Camera, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { resolvePublicAssetUrl } from "@/lib/resolvePublicAssetUrl"
import {
  uploadStudentPhoto,
  type StudentPhotoUploadResult,
} from "@/lib/studentPhotoUpload"

type Props = {
  studentId: string
  getToken: () => string | null
  /** Current photo URL from student profile / ID card */
  photoUrl?: string | null
  onUploaded?: (result: StudentPhotoUploadResult) => void | Promise<void>
  /** compact = outline sm button only; card = preview + button */
  variant?: "compact" | "card"
  className?: string
  disabled?: boolean
}

/**
 * Reliable student photo picker + upload (ID card + Edit Student).
 */
export function StudentPhotoUploader({
  studentId,
  getToken,
  photoUrl,
  onUploaded,
  variant = "card",
  className = "",
  disabled = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)

  const displaySrc =
    preview ||
    (photoUrl ? resolvePublicAssetUrl(photoUrl.split("?")[0]) || photoUrl : "") ||
    ""

  const onPick = async (file: File | null) => {
    if (!file) return
    const token = getToken()
    if (!token) {
      toast.error("Authentication required")
      return
    }
    setUploading(true)
    const localUrl = URL.createObjectURL(file)
    setPreview(localUrl)
    try {
      const result = await uploadStudentPhoto(studentId, file, token)
      toast.success("Student photo updated")
      await onUploaded?.(result)
      setPreview(
        `${result.profile_image}${result.profile_image.includes("?") ? "&" : "?"}v=${Date.now()}`
      )
    } catch (err: any) {
      console.error("Student photo upload failed:", err)
      setPreview(null)
      toast.error(err?.message || "Failed to update photo")
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
      try {
        URL.revokeObjectURL(localUrl)
      } catch {
        /* ignore */
      }
    }
  }

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept="image/jpeg,image/png,image/webp,image/jpg,.jpg,.jpeg,.png,.webp"
      className="sr-only"
      id={`student-photo-input-${studentId}`}
      disabled={uploading || disabled}
      onChange={(e) => void onPick(e.target.files?.[0] || null)}
    />
  )

  if (variant === "compact") {
    return (
      <div className={className}>
        {input}
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={uploading || disabled}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <Camera className="mr-1 h-4 w-4" />
          )}
          {uploading ? "Uploading…" : "Update photo"}
        </Button>
      </div>
    )
  }

  return (
    <div
      className={`flex flex-col items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4 sm:flex-row sm:items-center ${className}`}
    >
      {input}
      <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl border-2 border-[#E1BB33] bg-white">
        {displaySrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={displaySrc} alt="Student" className="h-full w-full object-cover object-top" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
            No photo
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-sm font-medium text-[#4D5077]">Student photo</p>
        <p className="text-xs text-slate-500">
          JPG, PNG or WEBP · max 2 MB. This photo is used on the Student ID card.
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={uploading || disabled}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <Camera className="mr-1 h-4 w-4" />
          )}
          {uploading ? "Uploading…" : displaySrc ? "Change photo" : "Upload photo"}
        </Button>
      </div>
    </div>
  )
}
