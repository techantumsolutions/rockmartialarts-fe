"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Loader2,
  IdCard,
  RefreshCw,
  Ban,
  ExternalLink,
  FileImage,
  FileText,
} from "lucide-react"
import { toast } from "sonner"
import {
  studentIdCardAPI,
  type StudentIdCardResponse,
} from "@/lib/studentIdCardAPI"
import {
  StudentIdCardVisual,
  STUDENT_ID_CARD_HEIGHT,
  STUDENT_ID_CARD_WIDTH,
} from "@/components/students/StudentIdCardVisual"
import { StudentPhotoUploader } from "@/components/students/StudentPhotoUploader"
import {
  exportIdCardPdf,
  exportIdCardPng,
} from "@/lib/studentIdCardExport"

interface StudentIdCardSectionProps {
  studentId: string
  getToken: () => string | null
}

export function StudentIdCardSection({ studentId, getToken }: StudentIdCardSectionProps) {
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [exporting, setExporting] = useState<"png" | "pdf" | null>(null)
  const [data, setData] = useState<StudentIdCardResponse | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    const token = getToken()
    if (!token || !studentId) return
    setLoading(true)
    try {
      const res = await studentIdCardAPI.getIdCard(studentId, token)
      setData(res)
    } catch (err: any) {
      console.error("ID card load error:", err)
      setData(null)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId])

  useEffect(() => {
    load()
  }, [load])

  const applyPhotoResult = async (profileImage: string, idCard?: StudentIdCardResponse | null) => {
    const bust = `${profileImage}${profileImage.includes("?") ? "&" : "?"}v=${Date.now()}`
    if (idCard?.card) {
      setData({
        ...idCard,
        display: {
          ...(idCard.display || {}),
          photo_url: bust,
        },
      })
      return
    }
    setData((prev) =>
      prev
        ? {
            ...prev,
            display: {
              ...(prev.display || {}),
              photo_url: bust,
            },
          }
        : {
            card: null,
            display: { photo_url: bust },
          }
    )
    await load()
  }

  const handleGenerate = async (regenerate = false) => {
    const token = getToken()
    if (!token) {
      toast.error("Authentication required")
      return
    }
    if (regenerate) {
      const ok = window.confirm(
        "Regenerate ID card? The previous QR code will stop working."
      )
      if (!ok) return
    }
    setBusy(true)
    try {
      const res = await studentIdCardAPI.generateIdCard(studentId, {
        regenerate,
        token,
      })
      setData(res)
      toast.success(
        regenerate ? "ID card regenerated" : "ID card generated successfully"
      )
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate ID card")
    } finally {
      setBusy(false)
    }
  }

  const handleRevoke = async () => {
    const token = getToken()
    if (!token) {
      toast.error("Authentication required")
      return
    }
    const ok = window.confirm(
      "Revoke this ID card? Scanned QR codes will show as revoked."
    )
    if (!ok) return
    setBusy(true)
    try {
      await studentIdCardAPI.revokeIdCard(studentId, token)
      toast.success("ID card revoked")
      await load()
    } catch (err: any) {
      toast.error(err?.message || "Failed to revoke ID card")
    } finally {
      setBusy(false)
    }
  }

  const qrSrc = useMemo(() => {
    if (data?.qr_image_base64) return `data:image/png;base64,${data.qr_image_base64}`
    return null
  }, [data?.qr_image_base64])

  const fileBase = data?.card?.card_number || "student_id_card"

  const waitForImages = async (node: HTMLElement) => {
    const imgs = Array.from(node.querySelectorAll("img"))
    await Promise.all(
      imgs.map(
        (img) =>
          img.complete
            ? Promise.resolve()
            : new Promise<void>((resolve) => {
                img.onload = () => resolve()
                img.onerror = () => resolve()
                setTimeout(resolve, 2500)
              })
      )
    )
  }

  const downloadPng = async () => {
    if (!cardRef.current) return
    setExporting("png")
    try {
      await waitForImages(cardRef.current)
      await exportIdCardPng(cardRef.current, `${fileBase}.png`, 3)
      toast.success("High-resolution PNG downloaded")
    } catch (err: any) {
      console.error(err)
      if (data?.card_image_base64) {
        const link = document.createElement("a")
        link.href = `data:image/png;base64,${data.card_image_base64}`
        link.download = `${fileBase}.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        toast.success("PNG downloaded")
      } else {
        toast.error(err?.message || "Failed to export PNG")
      }
    } finally {
      setExporting(null)
    }
  }

  const downloadPdf = async () => {
    if (!cardRef.current) return
    setExporting("pdf")
    try {
      await waitForImages(cardRef.current)
      await exportIdCardPdf(cardRef.current, `${fileBase}.pdf`, 3)
      toast.success("Printable PDF downloaded")
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || "Failed to export PDF")
    } finally {
      setExporting(null)
    }
  }

  const hasCard = Boolean(data?.card?.card_number)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-bold text-[#4D5077]">
          <IdCard className="h-5 w-5" />
          Student ID Card
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-[#7F8592]">
        {loading ? (
          <div className="flex items-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading ID card...
          </div>
        ) : (
          <div className="space-y-4">
            <StudentPhotoUploader
              studentId={studentId}
              getToken={getToken}
              photoUrl={data?.display?.photo_url}
              disabled={busy || !!exporting}
              onUploaded={async (result) => {
                await applyPhotoResult(result.profile_image, result.id_card)
              }}
            />

            {!hasCard ? (
              <div className="space-y-3">
                <p className="text-sm">
                  No active ID card yet. Generate a card number and secure QR for this student.
                </p>
                <Button onClick={() => handleGenerate(false)} disabled={busy}>
                  {busy ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <IdCard className="mr-2 h-4 w-4" />
                      Generate ID Card
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="font-mono">
                    {data?.card?.card_number}
                  </Badge>
                  <Badge
                    className={
                      data?.card?.status === "active"
                        ? "bg-green-100 text-green-800 hover:bg-green-100"
                        : "bg-red-100 text-red-800 hover:bg-red-100"
                    }
                  >
                    {data?.card?.status || "unknown"}
                  </Badge>
                  {data?.display?.account_status ? (
                    <Badge variant="secondary">{data.display.account_status}</Badge>
                  ) : null}
                  {data?.card?.verify_url ? (
                    <a
                      href={data.card.verify_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                    >
                      Open verify link <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : null}
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-[#111] p-4">
                  <div
                    className="mx-auto origin-top"
                    style={{
                      width: STUDENT_ID_CARD_WIDTH,
                      transform: "scale(var(--id-card-scale, 1))",
                      transformOrigin: "top center",
                    }}
                  >
                    <style>{`
                      @media (max-width: 1100px) {
                        .student-id-card-scale-wrap { --id-card-scale: 0.78; height: ${STUDENT_ID_CARD_HEIGHT * 0.78}px; }
                      }
                      @media (max-width: 900px) {
                        .student-id-card-scale-wrap { --id-card-scale: 0.62; height: ${STUDENT_ID_CARD_HEIGHT * 0.62}px; }
                      }
                      @media (max-width: 720px) {
                        .student-id-card-scale-wrap { --id-card-scale: 0.42; height: ${STUDENT_ID_CARD_HEIGHT * 0.42}px; }
                      }
                    `}</style>
                    <div
                      className="student-id-card-scale-wrap"
                      style={{ ["--id-card-scale" as any]: 1 }}
                    >
                      <StudentIdCardVisual
                        ref={cardRef}
                        fullName={data?.display?.full_name || "Student"}
                        cardNumber={
                          data?.card?.card_number || data?.display?.card_number || ""
                        }
                        branchName={data?.display?.branch_name || "—"}
                        courseName={data?.display?.course_name || "—"}
                        beltRank={data?.display?.belt_rank || "—"}
                        batchName={data?.display?.batch_name || "—"}
                        dateOfJoining={data?.display?.date_of_joining || "—"}
                        validUntil={data?.display?.valid_until || "—"}
                        accountStatus={data?.display?.account_status || "Active"}
                        photoUrl={data?.display?.photo_url}
                        qrImageSrc={qrSrc}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => void downloadPng()}
                    disabled={!!exporting || busy}
                  >
                    {exporting === "png" ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <FileImage className="mr-1 h-4 w-4" />
                    )}
                    Download PNG
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => void downloadPdf()}
                    disabled={!!exporting || busy}
                  >
                    {exporting === "pdf" ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <FileText className="mr-1 h-4 w-4" />
                    )}
                    Download PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleGenerate(true)}
                    disabled={busy || !!exporting}
                  >
                    {busy ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-1 h-4 w-4" />
                    )}
                    Regenerate
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRevoke}
                    disabled={busy || !!exporting}
                    className="border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <Ban className="mr-1 h-4 w-4" />
                    Revoke
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
