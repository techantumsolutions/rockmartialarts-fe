"use client"

import { useState, type ElementType, type ReactNode } from "react"
import { Label } from "@/components/ui/label"
import { Image as ImageIcon, Upload, Video, X } from "lucide-react"
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
  hideTitle?: boolean
}

function UploadButton({
  accept,
  uploading,
  onFile,
  label = "Choose File",
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
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-[#4F5077] shadow-sm hover:bg-gray-50">
        <Upload className="w-4 h-4" />
        {uploading ? "Uploading…" : label}
      </span>
    </label>
  )
}

function RemoveButton({
  onClick,
  confirmMessage,
}: {
  onClick: () => void
  confirmMessage: string
}) {
  return (
    <button
      type="button"
      onClick={() => {
        if (window.confirm(confirmMessage)) onClick()
      }}
      className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-red-600 hover:bg-red-50"
    >
      <X className="w-4 h-4" />
      Remove
    </button>
  )
}

function MediaZone({
  title,
  hint,
  tone,
  icon: Icon,
  preview,
  actions,
}: {
  title: string
  hint?: string
  tone: "violet" | "sky" | "emerald"
  icon: ElementType
  preview?: ReactNode
  actions: ReactNode
}) {
  const tones = {
    violet: {
      wrap: "border-violet-100 bg-violet-50/70",
      icon: "bg-violet-100 text-violet-700",
    },
    sky: {
      wrap: "border-sky-100 bg-sky-50/70",
      icon: "bg-sky-100 text-sky-700",
    },
    emerald: {
      wrap: "border-emerald-100 bg-emerald-50/70",
      icon: "bg-emerald-100 text-emerald-700",
    },
  }[tone]

  return (
    <div className={`rounded-xl border p-4 ${tones.wrap}`}>
      <div className="mb-3 flex items-center gap-2">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${tones.icon}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <Label className="text-sm font-medium text-[#2F3153]">{title}</Label>
          {hint ? <p className="text-xs text-gray-500">{hint}</p> : null}
        </div>
      </div>
      {preview ? <div className="mb-3">{preview}</div> : null}
      <div className="flex flex-wrap items-center gap-2">{actions}</div>
    </div>
  )
}

export function CourseMediaResourcesFields({
  value,
  onChange,
  hideTitle = false,
}: CourseMediaResourcesFieldsProps) {
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
      {!hideTitle ? (
        <h3 className="text-lg font-semibold text-[#4F5077]">Media & Resources</h3>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MediaZone
          title="Course Image"
          hint="Recommended 1200×800"
          tone="violet"
          icon={ImageIcon}
          preview={
            imageSrc ? (
              <img
                src={imageSrc}
                alt="Course"
                className="h-28 w-full rounded-lg border border-white object-cover shadow-sm"
              />
            ) : undefined
          }
          actions={
            <>
              <UploadButton
                accept="image/*"
                uploading={uploading === "image"}
                onFile={(file) => void runUpload("image", file)}
              />
              {value.imageUrl ? (
                <RemoveButton
                  confirmMessage="Remove this course image?"
                  onClick={() => onChange({ imageUrl: "" })}
                />
              ) : null}
            </>
          }
        />

        <MediaZone
          title="Promotional Video"
          hint={`Max ${maxMb} MB · .mp4 only`}
          tone="sky"
          icon={Video}
          preview={
            isUploadedMp4 ? (
              <video
                src={videoSrc}
                controls
                playsInline
                preload="metadata"
                className="aspect-video w-full rounded-lg border border-white bg-black object-contain shadow-sm"
              />
            ) : value.videoUrl ? (
              <p className="line-clamp-2 break-all text-xs text-gray-600">{value.videoUrl}</p>
            ) : undefined
          }
          actions={
            <>
              <UploadButton
                accept="video/mp4,.mp4"
                uploading={uploading === "video"}
                onFile={onPromoVideo}
              />
              {value.videoUrl ? (
                <RemoveButton
                  confirmMessage="Remove this promotional video?"
                  onClick={() => onChange({ videoUrl: "" })}
                />
              ) : null}
            </>
          }
        />

        <MediaZone
          title="Video Poster"
          hint="Shown before playback"
          tone="emerald"
          icon={ImageIcon}
          preview={
            posterSrc ? (
              <img
                src={posterSrc}
                alt="Video poster"
                className="h-28 w-full rounded-lg border border-white object-cover shadow-sm"
              />
            ) : undefined
          }
          actions={
            <>
              <UploadButton
                accept="image/*"
                uploading={uploading === "poster"}
                onFile={(file) => void runUpload("poster", file)}
              />
              {value.videoPosterUrl ? (
                <RemoveButton
                  confirmMessage="Remove this video poster?"
                  onClick={() => onChange({ videoPosterUrl: "" })}
                />
              ) : null}
            </>
          }
        />
      </div>
    </div>
  )
}
