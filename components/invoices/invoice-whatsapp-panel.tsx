"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, MessageCircle } from "lucide-react"
import { invoicesAPI, type InvoiceDetail, type InvoiceWhatsAppDelivery } from "@/lib/invoicesAPI"
import { useToast } from "@/hooks/use-toast"

function formatWhen(value?: string | null) {
  if (!value) return "—"
  const d = new Date(value)
  if (!Number.isFinite(d.getTime())) return "—"
  return d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
}

function statusBadgeClass(status?: string | null) {
  const s = (status || "").toLowerCase()
  if (s === "delivered" || s === "sent") return "bg-emerald-100 text-emerald-900 border-emerald-200"
  if (s === "failed") return "bg-red-100 text-red-800 border-red-200"
  if (s === "skipped" || s === "queued") return "bg-slate-100 text-slate-700 border-slate-200"
  return "bg-amber-100 text-amber-900 border-amber-200"
}

function statusLabel(status?: string | null) {
  const s = (status || "").toLowerCase()
  if (!s) return "Not sent"
  if (s === "delivered") return "Delivered"
  if (s === "sent") return "Sent"
  if (s === "failed") return "Failed"
  if (s === "skipped") return "Skipped"
  if (s === "queued") return "Queued"
  return status || "Unknown"
}

type Props = {
  invoice: InvoiceDetail
  mode?: "student" | "admin"
  onUpdated?: (invoice: InvoiceDetail) => void
}

export function InvoiceWhatsAppPanel({ invoice, mode = "student", onUpdated }: Props) {
  const { toast } = useToast()
  const [sending, setSending] = useState(false)
  const delivery: InvoiceWhatsAppDelivery | null | undefined =
    invoice.whatsapp_delivery ||
    (invoice.whatsapp_deliveries && invoice.whatsapp_deliveries[0]) ||
    null

  const hasPhone = Boolean(invoice.customer?.phone)
  const showPanel = Boolean(delivery) || hasPhone || mode === "admin"
  if (!showPanel) return null

  async function handleResend() {
    setSending(true)
    try {
      const result = await invoicesAPI.resendWhatsApp(invoice.id)
      toast({
        title: "Invoice sent on WhatsApp",
        description: result.message || `Status: ${result.status || "sent"}`,
      })
      const refreshed = await invoicesAPI.get(invoice.id)
      onUpdated?.(refreshed)
    } catch (err) {
      toast({
        title: "Could not send WhatsApp",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base text-slate-800">
          <MessageCircle className="h-4 w-4 text-emerald-700" />
          WhatsApp delivery
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-600">Status</span>
          <Badge className={statusBadgeClass(delivery?.status)}>{statusLabel(delivery?.status)}</Badge>
          {delivery?.attempt ? (
            <span className="text-xs text-slate-500">Attempt #{delivery.attempt}</span>
          ) : null}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
          <p>
            <span className="text-slate-500">To:</span>{" "}
            {delivery?.phone_masked ||
              (invoice.customer?.phone
                ? `****${String(invoice.customer.phone).replace(/\D/g, "").slice(-4)}`
                : "No phone on file")}
          </p>
          <p>
            <span className="text-slate-500">Last activity:</span>{" "}
            {formatWhen(delivery?.delivered_at || delivery?.sent_at || delivery?.created_at)}
          </p>
        </div>
        {delivery?.error ? (
          <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded px-2 py-1">
            {delivery.error}
          </p>
        ) : null}
        {delivery?.skip_reason === "no_phone" ? (
          <p className="text-xs text-slate-600">
            Add a mobile number on the student profile to receive invoices on WhatsApp.
          </p>
        ) : (
          <p className="text-xs text-slate-500">
            {mode === "student"
              ? "We send invoices to the mobile number on your profile after payment."
              : "Resend uses the existing invoice — a new invoice is not created."}
          </p>
        )}
        <Button
          type="button"
          variant="outline"
          className="border-emerald-300 text-emerald-800 hover:bg-emerald-50"
          disabled={sending || (!hasPhone && !delivery?.phone_masked)}
          onClick={() => void handleResend()}
        >
          {sending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <MessageCircle className="h-4 w-4 mr-2" />
          )}
          {mode === "admin" ? "Resend on WhatsApp" : "Resend to my WhatsApp"}
        </Button>
      </CardContent>
    </Card>
  )
}
