"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Document, Page, pdfjs } from "react-pdf"
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Minus,
  Plus,
  Maximize2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { TokenManager } from "@/lib/tokenManager"
import "react-pdf/dist/esm/Page/AnnotationLayer.css"
import "react-pdf/dist/esm/Page/TextLayer.css"

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"

type Props = {
  /** Authenticated backend URL (includes student/admin stream path) */
  fileUrl: string
  title?: string
  className?: string
}

export function SyllabusPdfViewer({ fileUrl, title, className }: Props) {
  const [data, setData] = useState<Uint8Array | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [numPages, setNumPages] = useState(0)
  const [page, setPage] = useState(1)
  const [scale, setScale] = useState(1.0)
  const [containerWidth, setContainerWidth] = useState(0)

  const loadPdf = useCallback(async () => {
    setLoading(true)
    setError(null)
    setData(null)
    setPage(1)
    try {
      const token = TokenManager.getToken()
      const res = await fetch(fileUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: "no-store",
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(
          typeof err.detail === "string" ? err.detail : `Failed to load PDF (${res.status})`
        )
      }
      const buf = await res.arrayBuffer()
      setData(new Uint8Array(buf))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load PDF")
    } finally {
      setLoading(false)
    }
  }, [fileUrl])

  useEffect(() => {
    void loadPdf()
  }, [loadPdf])

  // Block app-level print / save shortcuts (best-effort; OS print cannot be fully blocked)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      if ((e.ctrlKey || e.metaKey) && (key === "p" || key === "s")) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    const onContext = (e: MouseEvent) => {
      e.preventDefault()
    }
    window.addEventListener("keydown", onKey, true)
    window.addEventListener("contextmenu", onContext, true)
    return () => {
      window.removeEventListener("keydown", onKey, true)
      window.removeEventListener("contextmenu", onContext, true)
    }
  }, [])

  useEffect(() => {
    const el = document.getElementById("syllabus-pdf-scroll")
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (w) setContainerWidth(w)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [data])

  const pageWidth = useMemo(() => {
    if (!containerWidth) return undefined
    // Fit to container with padding; scale multiplies base fit
    const base = Math.min(containerWidth - 16, 900)
    return Math.max(240, base * scale)
  }, [containerWidth, scale])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-2">
        <Loader2 className="h-7 w-7 animate-spin text-amber-600" />
        <p className="text-sm">Loading syllabus…</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-800 space-y-3">
        <p>{error || "PDF unavailable"}</p>
        <Button variant="outline" size="sm" onClick={() => void loadPdf()}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div
      className={`flex flex-col rounded-lg border border-slate-200 bg-slate-50 overflow-hidden ${className || ""}`}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b bg-white">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-800 truncate">
            {title || "Course syllabus"}
          </p>
          <p className="text-[11px] text-slate-500">
            Read-only viewer · Page {page} of {numPages || "—"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!numPages || page >= numPages}
            onClick={() => setPage((p) => Math.min(numPages, p + 1))}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="w-px h-5 bg-slate-200 mx-1" />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={scale <= 0.6}
            onClick={() => setScale((s) => Math.max(0.6, Math.round((s - 0.15) * 100) / 100))}
            aria-label="Zoom out"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="text-xs tabular-nums text-slate-600 w-12 text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={scale >= 2.2}
            onClick={() => setScale((s) => Math.min(2.2, Math.round((s + 0.15) * 100) / 100))}
            aria-label="Zoom in"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setScale(1)}
            aria-label="Reset zoom"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        id="syllabus-pdf-scroll"
        className="flex-1 overflow-auto max-h-[min(75vh,820px)] min-h-[280px] p-2 sm:p-4 flex justify-center bg-slate-100/80 select-none"
        style={{ WebkitUserSelect: "none", userSelect: "none" }}
      >
        <Document
          file={{ data }}
          loading={
            <div className="py-16 text-slate-500 text-sm flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Rendering…
            </div>
          }
          error={
            <p className="py-10 text-sm text-red-700">Could not render this PDF.</p>
          }
          onLoadSuccess={({ numPages: n }) => setNumPages(n)}
          onLoadError={() => setError("Could not render this PDF")}
        >
          <Page
            pageNumber={page}
            width={pageWidth}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            className="shadow-md bg-white"
          />
        </Document>
      </div>

      <p className="text-[10px] text-slate-400 px-3 py-1.5 border-t bg-white">
        Download and print controls are not provided in this app. Content is delivered over an
        authenticated private stream.
      </p>
    </div>
  )
}
