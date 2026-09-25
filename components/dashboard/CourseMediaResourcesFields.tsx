"use client"

import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Upload, X } from "lucide-react"
import { uploadFile } from "@/lib/upload"
import { resolvePublicAssetUrl } from "@/lib/resolvePublicAssetUrl"
import {
  getCoursePromoVideoMaxBytes,
  getCoursePromoVideoMaxMb,
  isCoursePromoMp4,
} from "@/lib/courseMediaLimits"

export type CourseMediaValues = {
  imageUrl: string
  videoUrl: string
  videoPosterUrl: string
}

type CourseMediaResourcesFieldsProps = {
  value: CourseMediaValues
  onChange: (patch: Partial<CourseMediaValues>) => void
}

function UploadButton({
  accept,
  uploading,
  onFile,
  label = "Upload",
}: {
  accept: string
  uploading: boolean
  onFile: (file: File) => void
  label?: string
}) {
  return (
    <label className={`cursor-pointer inline-flex ${uploading ? "opacity-60 pointer-events-none" : ""}`}>
      <input
        type="file"
        accept={accept}
        className="hidden"
        disabled={uploading}
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ""
          if (file) onFile(file)
        }}
      />
      <span className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800">
        <Upload className="w-4 h-4" />
        {uploading ? "Uploading…" : label}
      </span>
    </label>
  )
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-sm text-red-600 hover:bg-red-50"
    >
      <X className="w-4 h-4" />
      Remove
    </button>
  )
}

export function CourseMediaResourcesFields({ value, onChange }: CourseMediaResourcesFieldsProps) {
  const [uploading, setUploading] = useState<"image" | "video" | "poster" | null>(null)
  const maxMb = getCoursePromoVideoMaxMb()
  const maxBytes = getCoursePromoVideoMaxBytes()

  const imageSrc = value.imageUrl ? resolvePublicAssetUrl(value.imageUrl) : ""
  const posterSrc = value.videoPosterUrl ? resolvePublicAssetUrl(value.videoPosterUrl) : ""
  const videoSrc = value.videoUrl ? resolvePublicAssetUrl(value.videoUrl) : ""
  const isUploadedMp4 =
    Boolean(videoSrc) &&
    !/youtube\.com|youtu\.be/i.test(videoSrc) &&
    (/\.mp4(\?|$)/i.test(videoSrc) || videoSrc.includes("/uploads/"))

  const runUpload = async (kind: "image" | "video" | "poster", file: File) => {
    setUploading(kind)
    try {
      const result = await uploadFile(file)
      if (kind === "image") onChange({ imageUrl: result.file_url })
      else if (kind === "video") onChange({ videoUrl: result.file_url })
      else onChange({ videoPosterUrl: result.file_url })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed"
      alert(message)
    } finally {
      setUploading(null)
    }
  }

  const onPromoVideo = (file: File) => {
    if (!isCoursePromoMp4(file)) {
      alert("Only .mp4 promotional videos are allowed.")
      return
    }
    if (file.size > maxBytes) {
      alert(`Video is too large. Maximum size is ${maxMb} MB.`)
      return
    }
    void runUpload("video", file)
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-[#4F5077]">Media & Resources</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Course Image</Label>
          {imageSrc ? (
            <img
              src={imageSrc}
              alt="Course"
              className="w-32 h-24 object-cover rounded border"
            />
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <UploadButton
              accept="image/*"
              uploading={uploading === "image"}
              onFile={(file) => void runUpload("image", file)}
            />
            {value.imageUrl ? <RemoveButton onClick={() => onChange({ imageUrl: "" })} /> : null}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Promotional Video</Label>
          <p className="text-xs text-muted-foreground">Max {maxMb} MB, .mp4 only</p>
          {isUploadedMp4 ? (
            <video
              src={videoSrc}
              controls
              playsInline
              preload="metadata"
              className="w-full max-w-md rounded border bg-black aspect-video object-contain"
            />
          ) : value.videoUrl ? (
            <p className="text-xs text-gray-600 break-all line-clamp-2">{value.videoUrl}</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <UploadButton
              accept="video/mp4,.mp4"
              uploading={uploading === "video"}
              onFile={onPromoVideo}
            />
            {value.videoUrl ? <RemoveButton onClick={() => onChange({ videoUrl: "" })} /> : null}
          </div>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label>Video Poster</Label>
          {posterSrc ? (
            <img
              src={posterSrc}
              alt="Video poster"
              className="w-32 h-24 object-cover rounded border"
            />
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <UploadButton
              accept="image/*"
              uploading={uploading === "poster"}
              onFile={(file) => void runUpload("poster", file)}
            />
            {value.videoPosterUrl ? (
              <RemoveButton onClick={() => onChange({ videoPosterUrl: "" })} />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
