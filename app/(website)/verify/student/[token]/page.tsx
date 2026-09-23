"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import {
  CheckCircle2,
  XCircle,
  Loader2,
  IdCard,
  Ban,
  Clock3,
  UserX,
  AlertTriangle,
} from "lucide-react"
import {
  studentIdCardAPI,
  type StudentIdVerifyResponse,
} from "@/lib/studentIdCardAPI"
import { apiConfig } from "@/lib/config"

function resolvePhotoUrl(path?: string | null): string | null {
  if (!path) return null
  if (/^https?:\/\//i.test(path)) return path
  const base = (apiConfig.baseURL || "").replace(/\/+$/, "")
  if (path.startsWith("/")) return `${base}${path}`
  return `${base}/${path}`
}

function statusMeta(status?: string, valid?: boolean) {
  const s = (status || "").toLowerCase()
  if (valid || s === "active") {
    return {
      title: "Verified",
      tone: "ok" as const,
      Icon: CheckCircle2,
      banner: "bg-green-50 border-green-200 text-green-800",
      iconClass: "text-green-600",
    }
  }
  if (s === "revoked") {
    return {
      title: "Card revoked",
      tone: "bad" as const,
      Icon: Ban,
      banner: "bg-red-50 border-red-200 text-red-800",
      iconClass: "text-red-600",
    }
  }
  if (s === "expired") {
    return {
      title: "Card expired",
      tone: "warn" as const,
      Icon: Clock3,
      banner: "bg-amber-50 border-amber-200 text-amber-900",
      iconClass: "text-amber-600",
    }
  }
  if (s === "inactive") {
    return {
      title: "Account inactive",
      tone: "warn" as const,
      Icon: UserX,
      banner: "bg-orange-50 border-orange-200 text-orange-900",
      iconClass: "text-orange-600",
    }
  }
  return {
    title: "Not verified",
    tone: "bad" as const,
    Icon: XCircle,
    banner: "bg-slate-50 border-slate-200 text-slate-800",
    iconClass: "text-slate-500",
  }
}

export default function VerifyStudentIdPage() {
  const params = useParams()
  const token = typeof params?.token === "string" ? params.token : ""
  const [loading, setLoading] = useState(true)
  const [rateLimited, setRateLimited] = useState(false)
  const [result, setResult] = useState<StudentIdVerifyResponse | null>(null)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!token || token.length < 16) {
        setResult({
          valid: false,
          status: "invalid",
          message: "This student ID could not be verified.",
          display: null,
        })
        setLoading(false)
        return
      }
      setLoading(true)
      setRateLimited(false)
      try {
        const data = await studentIdCardAPI.verifyPublic(token)
        if (!cancelled) setResult(data)
      } catch (err: any) {
        if (!cancelled) {
          if (err?.status === 429 || /too many/i.test(String(err?.message || ""))) {
            setRateLimited(true)
            setResult({
              valid: false,
              status: "invalid",
              message: "Too many verification attempts. Please try again shortly.",
              display: null,
            })
          } else {
            setResult({
              valid: false,
              status: "invalid",
              message: "This student ID could not be verified.",
              display: null,
            })
          }
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [token])

  const display = result?.display
  const meta = useMemo(
    () => statusMeta(result?.status, result?.valid),
    [result?.status, result?.valid]
  )
  const StatusIcon = meta.Icon
  const photoUrl = resolvePhotoUrl(display?.photo_url)
  const showDetails = Boolean(display) && result?.status !== "invalid"

  return (
    <div className="min-h-[70vh] bg-gradient-to-b from-slate-100 to-slate-50 px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-md">
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold tracking-[0.14em] text-blue-700 uppercase">
            Rock Martial Arts
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
            Student ID Verification
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Scan result from a student ID QR code
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-12 text-slate-600">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-sm">Verifying ID...</p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className={`rounded-xl border px-4 py-3 ${meta.banner}`}>
                <div className="flex items-start gap-3">
                  <StatusIcon className={`h-7 w-7 shrink-0 mt-0.5 ${meta.iconClass}`} />
                  <div>
                    <p className="font-semibold text-base">{meta.title}</p>
                    <p className="text-sm mt-0.5 opacity-90">
                      {result?.message || "Unable to verify this ID."}
                    </p>
                    {rateLimited ? (
                      <p className="text-xs mt-2 flex items-center gap-1 opacity-80">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Please wait a minute before trying again.
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>

              {showDetails ? (
                <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
                  <div className="flex items-start gap-4">
                    {photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photoUrl}
                        alt=""
                        className="h-16 w-16 rounded-full object-cover border border-slate-200 bg-white shrink-0"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-full bg-white border border-slate-200 flex items-center justify-center shrink-0">
                        <IdCard className="h-7 w-7 text-slate-400" />
                      </div>
                    )}
                    <div className="min-w-0 space-y-1.5 text-sm">
                      <p className="font-semibold text-slate-900 text-base truncate">
                        {display?.full_name || "Student"}
                      </p>
                      {display?.card_number ? (
                        <p className="font-mono text-slate-700 text-xs sm:text-sm break-all">
                          Card: {display.card_number}
                        </p>
                      ) : null}
                      {display?.branch_name ? (
                        <p className="text-slate-600">Branch: {display.branch_name}</p>
                      ) : null}
                      {display?.course_name ? (
                        <p className="text-slate-600">Course: {display.course_name}</p>
                      ) : null}
                      {display?.account_status ? (
                        <p className="text-slate-600">Account: {display.account_status}</p>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">
                  <XCircle className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-600">
                    No student details are available for this code.
                  </p>
                </div>
              )}

              <p className="text-xs text-slate-400 leading-relaxed">
                Only approved non-sensitive fields are shown. Email, phone, and internal IDs
                are never displayed on this page.
              </p>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          <Link href="/" className="text-blue-600 hover:underline">
            Back to home
          </Link>
        </p>
      </div>
    </div>
  )
}
