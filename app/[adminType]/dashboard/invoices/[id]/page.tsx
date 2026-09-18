"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Loader2, ArrowLeft, Printer } from "lucide-react"
import { invoicesAPI, type InvoiceDetail } from "@/lib/invoicesAPI"
import { TokenManager } from "@/lib/tokenManager"
import { useToast } from "@/hooks/use-toast"
import { InvoiceWhatsAppPanel } from "@/components/invoices/invoice-whatsapp-panel"

function formatMoney(amount?: number, currency = "INR") {
  const value = typeof amount === "number" ? amount : 0
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value)
}

function formatDate(value?: string | null) {
  if (!value) return "—"
  const d = new Date(value)
  if (!Number.isFinite(d.getTime())) return "—"
  return d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
}

export default function AdminInvoiceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const adminType = String(params?.adminType || "super-admin")
  const invoiceId = String(params?.id || "")
  const basePath = `/${adminType}/dashboard`

  const [loading, setLoading] = useState(true)
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null)
  const [printing, setPrinting] = useState(false)

  useEffect(() => {
    async function load() {
      if (!invoiceId) return
      setLoading(true)
      try {
        if (!TokenManager.isAuthenticated()) {
          router.push(adminType.includes("branch") ? "/branch-manager/login" : "/superadmin/login")
          return
        }
        setInvoice(await invoicesAPI.get(invoiceId))
      } catch (err) {
        toast({
          title: "Invoice not found",
          description: err instanceof Error ? err.message : "Please try again.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [invoiceId])

  async function handlePrint() {
    if (!invoice) return
    setPrinting(true)
    try {
      await invoicesAPI.openPrintableDocument(invoice.id)
    } catch (err) {
      toast({
        title: "Could not open invoice",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setPrinting(false)
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="outline" asChild>
          <Link href={`${basePath}/invoices`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            All invoices
          </Link>
        </Button>
        {invoice ? (
          <Button
            className="bg-amber-500 hover:bg-amber-600"
            disabled={printing}
            onClick={() => void handlePrint()}
          >
            {printing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Printer className="h-4 w-4 mr-2" />}
            Print / Save PDF
          </Button>
        ) : null}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
        </div>
      ) : !invoice ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Invoice could not be loaded.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 justify-between">
              <CardTitle className="text-xl">Invoice {invoice.invoice_number}</CardTitle>
              <Badge variant="secondary" className="capitalize">
                {invoice.status || "issued"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Paid on {formatDate(invoice.paid_at || invoice.created_at)} · Ref{" "}
              {invoice.payment_reference || "—"} · Source {invoice.source || "payment"}
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Bill to</p>
                <p className="font-medium">{invoice.customer?.name || "—"}</p>
                <p className="text-sm text-muted-foreground">{invoice.customer?.email || ""}</p>
                <p className="text-sm text-muted-foreground">{invoice.customer?.phone || ""}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Payment</p>
                <p className="text-sm">
                  Method: {invoice.payment_gateway_label || invoice.payment_method || "—"}
                </p>
                <p className="text-sm">Payment ID: {invoice.payment_id || "—"}</p>
                <p className="text-lg font-semibold mt-2">
                  {formatMoney(invoice.total_amount, invoice.currency || "INR")}
                </p>
              </div>
            </div>

            <InvoiceWhatsAppPanel
              invoice={invoice}
              mode="admin"
              onUpdated={(next) => setInvoice(next)}
            />

            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Description</th>
                    <th className="px-3 py-2 text-right">Course</th>
                    <th className="px-3 py-2 text-right">Admission</th>
                    <th className="px-3 py-2 text-right">Discount</th>
                    <th className="px-3 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(invoice.line_items || []).map((line, idx) => (
                    <tr key={line.id || idx} className="border-t">
                      <td className="px-3 py-3">
                        <div className="font-medium">
                          {line.description || line.course_name || `Item ${idx + 1}`}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {[line.student_label, line.branch_name].filter(Boolean).join(" · ")}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right">{formatMoney(line.course_fee)}</td>
                      <td className="px-3 py-3 text-right">{formatMoney(line.admission_fee)}</td>
                      <td className="px-3 py-3 text-right">{formatMoney(line.discount_amount)}</td>
                      <td className="px-3 py-3 text-right font-medium">{formatMoney(line.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="ml-auto w-full max-w-xs space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatMoney(invoice.subtotal_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Admission</span>
                <span>{formatMoney(invoice.admission_total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount</span>
                <span>- {formatMoney(invoice.discount_total)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-base font-semibold">
                <span>Total paid</span>
                <span>{formatMoney(invoice.total_amount, invoice.currency || "INR")}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
