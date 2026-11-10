"use client"

import { useRef, useState, useCallback, useEffect } from "react"
import { Camera, ImageUp, Loader2 } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { studentProfileAPI } from "@/lib/studentProfileAPI"
import { cn } from "@/lib/utils"

const MAX_BYTES = 2 * 1024 * 1024

function validateImageFile(file: File): string | null {
  const t = (file.type || "").toLowerCase()
  const okType =
    t === "image/jpeg" ||
    t === "image/jpg" ||
    t === "image/png" ||
    t === "" || // iOS camera capture sometimes omits MIME
    t === "image/heic" ||
    t === "image/heif" ||
    t.startsWith("image/")
  if (!okType) return "Please choose a JPG or PNG image."
  if (file.size > MAX_BYTES) return "Image must be 2 MB or smaller."
  return null
}

function normalizeImageFile(file: File): File {
  const t = (file.type || "").toLowerCase()
  if (t === "image/jpeg" || t === "image/jpg" || t === "image/png") return file
  const name = (file.name || "profile-photo.jpg").replace(/\.(heic|heif)$/i, ".jpg")
  return new File([file], name.endsWith(".png") ? name : name.replace(/\.\w+$/, ".jpg") || "profile-photo.jpg", {
    type: "image/jpeg",
  })
}

/** Resolve getUserMedia across browsers (iPad Chrome / WebKit quirks). */
function resolveGetUserMedia():
  | ((constraints: MediaStreamConstraints) => Promise<MediaStream>)
  | null {
  if (typeof navigator === "undefined") return null
  const md = navigator.mediaDevices
  if (md && typeof md.getUserMedia === "function") {
    return (constraints) => md.getUserMedia(constraints)
  }
  const legacy =
    (navigator as Navigator & { getUserMedia?: typeof navigator.mediaDevices.getUserMedia })
      .getUserMedia ||
    (navigator as Navigator & { webkitGetUserMedia?: Function }).webkitGetUserMedia ||
    (navigator as Navigator & { mozGetUserMedia?: Function }).mozGetUserMedia
  if (typeof legacy === "function") {
    return (constraints) =>
      new Promise<MediaStream>((resolve, reject) => {
        legacy.call(navigator, constraints, resolve, reject)
      })
  }
  return null
}

function prefersNativeCameraCapture(): boolean {
  if (typeof navigator === "undefined") return false
  // iPad/iPhone Chrome/Safari: native camera capture is more reliable than getUserMedia
  const ua = navigator.userAgent || ""
  const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  return iOS
}

function canvasToJpegFile(canvas: HTMLCanvasElement): Promise<File | null> {
  const attempt = (quality: number) =>
    new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality)
    })

  return (async () => {
    let quality = 0.92
    let blob = await attempt(quality)
    while (blob && blob.size > MAX_BYTES && quality > 0.45) {
      quality -= 0.15
      blob = await attempt(quality)
    }
    if (!blob) return null
    return new File([blob], "profile-photo.jpg", { type: "image/jpeg" })
  })()
}

export function StudentProfilePhotoSheet(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentImageSrc: string
  fallbackLetter: string
  token: string
  onSaved: (profileImageUrl: string) => void
}) {
  const { open, onOpenChange, currentImageSrc, fallbackLetter, token, onSaved } = props
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const cameraCaptureInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [cameraLive, setCameraLive] = useState(false)
  const [startingCamera, setStartingCamera] = useState(false)

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraLive(false)
  }, [])

  const resetPreview = useCallback(() => {
    stopCamera()
    setPreviewUrl((prev) => {
      if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev)
      return null
    })
    setPendingFile(null)
    setError(null)
    if (galleryInputRef.current) galleryInputRef.current.value = ""
    if (cameraCaptureInputRef.current) cameraCaptureInputRef.current.value = ""
  }, [stopCamera])

  useEffect(() => {
    if (!open) stopCamera()
  }, [open, stopCamera])

  useEffect(() => () => stopCamera(), [stopCamera])

  useEffect(() => {
    if (!cameraLive || !videoRef.current || !streamRef.current) return
    videoRef.current.srcObject = streamRef.current
    void videoRef.current.play().catch(() => {})
  }, [cameraLive])

  const handleFileChosen = (file: File | null) => {
    setError(null)
    if (!file) return
    const msg = validateImageFile(file)
    if (msg) {
      setError(msg)
      return
    }
    const normalized = normalizeImageFile(file)
    setPendingFile(normalized)
    setPreviewUrl(URL.createObjectURL(normalized))
  }

  const openNativeCameraCapture = () => {
    cameraCaptureInputRef.current?.click()
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) resetPreview()
    onOpenChange(next)
  }

  const startCamera = async () => {
    if (uploading) return
    setError(null)

    // iPad/iPhone (incl. Chrome): use native camera capture — getUserMedia is often unavailable
    if (prefersNativeCameraCapture()) {
      stopCamera()
      openNativeCameraCapture()
      return
    }

    const getUserMedia = resolveGetUserMedia()
    if (!getUserMedia) {
      // Desktop browsers without GUM — still try native capture as last resort
      openNativeCameraCapture()
      return
    }
    setStartingCamera(true)
    try {
      stopCamera()
      let stream: MediaStream
      try {
        stream = await getUserMedia({
          video: { facingMode: { ideal: "user" } },
          audio: false,
        })
      } catch {
        // Fallback constraints for older WebKit
        stream = await getUserMedia({ video: true, audio: false })
      }
      streamRef.current = stream
      setCameraLive(true)
    } catch {
      stopCamera()
      // If live stream fails, fall back to native camera file capture
      openNativeCameraCapture()
    } finally {
      setStartingCamera(false)
    }
  }

  const capturePhoto = async () => {
    const video = videoRef.current
    if (!video || video.readyState < 2 || video.videoWidth === 0) {
      setError("Camera is not ready yet. Please wait a moment.")
      return
    }
    const canvas = document.createElement("canvas")
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext("2d")
    if (!ctx) {
      setError("Could not capture the photo.")
      return
    }
    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, 0, 0)
    const file = await canvasToJpegFile(canvas)
    if (!file) {
      setError("Could not capture the photo.")
      return
    }
    stopCamera()
    handleFileChosen(file)
  }

  const handleSave = async () => {
    if (!pendingFile) {
      setError("Select a photo first.")
      return
    }
    setUploading(true)
    setError(null)
    try {
      const { profile_image } = await studentProfileAPI.uploadProfilePhoto(pendingFile, token)
      onSaved(profile_image)
      handleOpenChange(false)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Upload failed. Please try again."
      setError(message)
    } finally {
      setUploading(false)
    }
  }

  const displaySrc = previewUrl || currentImageSrc

  return (
    <>
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/jpeg,image/png,image/*"
        className="hidden"
        onChange={(e) => {
          stopCamera()
          handleFileChosen(e.target.files?.[0] ?? null)
        }}
      />
      {/* Native camera for iPad/iPhone Chrome/Safari where getUserMedia is blocked/missing */}
      <input
        ref={cameraCaptureInputRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={(e) => {
          stopCamera()
          handleFileChosen(e.target.files?.[0] ?? null)
        }}
      />

      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto">
          <SheetHeader className="text-left">
            <SheetTitle>Profile photo</SheetTitle>
          </SheetHeader>

          <div className="flex flex-col items-center gap-4 py-2">
            {error && (
              <Alert variant="destructive" className="w-full">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div
              className={cn(
                "relative h-40 w-40 overflow-hidden rounded-full border-4 border-muted bg-muted",
                "shadow-md"
              )}
            >
              {cameraLive ? (
                <video
                  ref={videoRef}
                  className="h-full w-full object-cover scale-x-[-1]"
                  autoPlay
                  playsInline
                  muted
                />
              ) : displaySrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={displaySrc} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-muted-foreground">
                  {fallbackLetter}
                </div>
              )}
            </div>

            <div className="grid w-full max-w-sm grid-cols-1 gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                className="h-12 justify-center gap-2"
                onClick={() => {
                  stopCamera()
                  galleryInputRef.current?.click()
                }}
                disabled={uploading || startingCamera}
              >
                <ImageUp className="h-5 w-5" />
                Upload from device
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-12 justify-center gap-2"
                onClick={() => void (cameraLive ? capturePhoto() : startCamera())}
                disabled={uploading || startingCamera}
              >
                {startingCamera ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Camera className="h-5 w-5" />
                )}
                {startingCamera ? "Starting…" : cameraLive ? "Capture" : "Take photo"}
              </Button>
            </div>

            <p className="text-center text-sm text-muted-foreground px-2">
              JPG or PNG, up to 2 MB. Preview before saving.
            </p>

            <div className="flex w-full max-w-sm flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                className="sm:flex-1"
                onClick={() => handleOpenChange(false)}
                disabled={uploading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="sm:flex-1"
                onClick={handleSave}
                disabled={!pendingFile || uploading || cameraLive}
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save photo"
                )}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
