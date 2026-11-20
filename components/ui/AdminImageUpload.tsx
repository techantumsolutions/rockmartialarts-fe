"use client"

import { useRef, useState } from "react"
import { ImageIcon, Loader2, Trash2, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { uploadFile } from "@/lib/upload"
import { resolvePublicAssetUrl } from "@/lib/resolvePublicAssetUrl"
import { adminOutlineBtnClass } from "@/components/dashboard/AdminPageShell"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

type Props = {
  label?: string
  value?: string | null
  onChange: (url: string) => void
  onClear?: () => void
  /** Optional academy scope for partner uploads */
  branchId?: string | null
  helperText?: string
  accept?: string
  maxBytes?: number
  previewClassName?: string
  disabled?: boolean
  className?: string
  /** square | wide | circle */
  shape?: "square" | "wide" | "circle"
}

const DEFAULT_ACCEPT = "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
const DEFAULT_MAX = 2 * 1024 * 1024

/**
 * Admin-standard image field: upload only (no URL text input).
 */
export function AdminImageUpload({
  label = "Image",
  value,
  onChange,
  onClear,
  branchId,
  helperText = "JPG, PNG or WEBP, max 2MB. Upload only — URL paste is not allowed.",
  accept = DEFAULT_ACCEPT,
  maxBytes = DEFAULT_MAX,
  previewClassName,
  disabled,
  className,
  shape = "square",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const [uploading, setUploading] = useState(false)
  const [localPreview, setLocalPreview] = useState<string | null>(null)

  const resolved = resolvePublicAssetUrl(value) || ""
  const displaySrc = localPreview || resolved

  const shapeClass =
    shape === "circle"
      ? "h-32 w-32 rounded-full"
      : shape === "wide"
        ? "aspect-video w-full max-w-md rounded-xl"
        : "h-36 w-36 rounded-xl"

  const pick = async (file: File | null) => {
    if (!file || disabled) return
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please upload an image (JPG, PNG, or WEBP).",
        variant: "destructive",
      })
      return
    }
    if (file.size > maxBytes) {
      toast({
        title: "File too large",
        description: `Max size is ${Math.round(maxBytes / (1024 * 1024))}MB.`,
        variant: "destructive",
      })
      return
    }

    const objectUrl = URL.createObjectURL(file)
    setLocalPreview(objectUrl)
    setUploading(true)
    try {
      const result = await uploadFile(file, { branchId })
      onChange(result.file_url)
      // Prefer server URL for stable preview; drop blob after success.
      setLocalPreview(null)
      toast({ title: "Image uploaded" })
    } catch (err) {
      setLocalPreview(null)
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Could not upload image",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
      try {
        URL.revokeObjectURL(objectUrl)
      } catch {
        /* ignore */
      }
    }
  }

  const clear = () => {
    setLocalPreview(null)
    onClear?.()
    onChange("")
    if (inputRef.current) inputRef.current.value = ""
  }

  return (
    <div className={cn("space-y-2", className)}>
      {label ? <Label>{label}</Label> : null}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        disabled={uploading || disabled}
        onChange={(e) => void pick(e.target.files?.[0] || null)}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div
          className={cn(
            "flex shrink-0 items-center justify-center overflow-hidden border border-[#E8EAF0] bg-[#F8FAFC]",
            shapeClass,
            previewClassName
          )}
        >
          {displaySrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={displaySrc} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-8 w-8 text-[#94A3B8]" />
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={uploading || disabled}
              className={cn(adminOutlineBtnClass, "border-[#E1BB33]/60 text-[#C9971A] hover:bg-[#FFF8E1]")}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              {uploading ? "Uploading…" : displaySrc ? "Replace image" : "Upload Photo"}
            </Button>
            {displaySrc ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={uploading || disabled}
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                aria-label="Remove image"
                onClick={clear}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
          {helperText ? <p className="text-xs text-[#6B7280]">{helperText}</p> : null}
        </div>
      </div>
    </div>
  )
}
