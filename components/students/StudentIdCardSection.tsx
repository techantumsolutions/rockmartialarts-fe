"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, IdCard, RefreshCw, Ban, Download, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import {
  studentIdCardAPI,
  type StudentIdCardResponse,
} from "@/lib/studentIdCardAPI"

interface StudentIdCardSectionProps {
  studentId: string
  getToken: () => string | null
}

export function StudentIdCardSection({ studentId, getToken }: StudentIdCardSectionProps) {
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [data, setData] = useState<StudentIdCardResponse | null>(null)

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
    // getToken is a stable page helper; intentionally omit from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId])

  useEffect(() => {
    load()
  }, [load])

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

  const downloadCardImage = () => {
    if (!data?.card_image_base64) return
    const link = document.createElement("a")
    link.href = `data:image/png;base64,${data.card_image_base64}`
    link.download = `${data.card?.card_number || "student_id_card"}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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
      <CardContent className="text-[#7F8592] space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading ID card...
          </div>
        ) : !hasCard ? (
          <div className="space-y-3">
            <p className="text-sm">
              No active ID card yet. Generate a card number and secure QR for this student.
            </p>
            <p className="text-xs text-slate-500">
              Visible fields are provisional pending client approval.
            </p>
            <Button
              onClick={() => handleGenerate(false)}
              disabled={busy}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <IdCard className="h-4 w-4 mr-2" />
                  Generate ID Card
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 text-sm">
                <p>
                  <span className="text-slate-500">Name:</span>{" "}
                  <span className="text-slate-800">{data?.display?.full_name || "—"}</span>
                </p>
                <p>
                  <span className="text-slate-500">Branch:</span>{" "}
                  <span className="text-slate-800">{data?.display?.branch_name || "—"}</span>
                </p>
                <p>
                  <span className="text-slate-500">Course:</span>{" "}
                  <span className="text-slate-800">{data?.display?.course_name || "—"}</span>
                </p>
                {data?.card?.verify_url ? (
                  <a
                    href={data.card.verify_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 text-xs hover:underline"
                  >
                    Open verify link <ExternalLink className="h-3 w-3" />
                  </a>
                ) : null}
              </div>
              <div className="flex flex-col items-center gap-2">
                {data?.card_image_base64 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`data:image/png;base64,${data.card_image_base64}`}
                    alt="Student ID card preview"
                    className="w-full max-w-sm rounded border border-slate-200 bg-white shadow-sm"
                  />
                ) : data?.qr_image_base64 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`data:image/png;base64,${data.qr_image_base64}`}
                    alt="Student ID QR code"
                    className="w-36 h-36 rounded border border-slate-200 bg-white"
                  />
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={downloadCardImage}
                disabled={!data?.card_image_base64 || busy}
              >
                <Download className="h-4 w-4 mr-1" />
                Download PNG
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleGenerate(true)}
                disabled={busy}
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-1" />
                )}
                Regenerate
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRevoke}
                disabled={busy}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <Ban className="h-4 w-4 mr-1" />
                Revoke
              </Button>
            </div>

            {data?.fields_note ? (
              <p className="text-xs text-slate-400">{data.fields_note}</p>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
