"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import StudentDashboardLayout from "@/components/student-dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Loader2, FileText, Printer, Search, ArrowLeft } from "lucide-react"
import { invoicesAPI, type InvoiceListItem } from "@/lib/invoicesAPI"
import { TokenManager } from "@/lib/tokenManager"
import { useToast } from "@/hooks/use-toast"

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

export default function StudentInvoicesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [items, setItems] = useState<InvoiceListItem[]>([])
  const [total, setTotal] = useState(0)
  const [printingId, setPrintingId] = useState<string | null>(null)

  async function load(q?: string) {
    setLoading(true)
    try {
      if (!TokenManager.isAuthenticated()) {
        router.replace("/login?returnUrl=/student-dashboard/invoices")
        return
      }
      const data = await invoicesAPI.list({ limit: 100, search: q?.trim() || undefined })
      setItems(data.invoices)
      setTotal(data.total)
    } catch (err) {
      toast({
        title: "Could not load invoices",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function handlePrint(id: string) {
    setPrintingId(id)
    try {
      await invoicesAPI.openPrintableDocument(id)
    } catch (err) {
      toast({
        title: "Could not open invoice",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setPrintingId(null)
    }
  }

  return (
    <StudentDashboardLayout>
      <div className="container mx-auto max-w-5xl p-4 md:p-6 space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Download or print invoices for your successful payments.
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/student-dashboard/payments">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to payments
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Your invoices</CardTitle>
            <CardDescription>
              {total > 0 ? `${total} invoice${total === 1 ? "" : "s"} found` : "No invoices yet"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                void load(search)
              }}
            >
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search by invoice number or payment reference"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button type="submit" variant="secondary">
                Search
              </Button>
            </form>

            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
                <FileText className="mx-auto mb-3 h-10 w-10 opacity-40" />
                <p className="font-medium text-gray-800">No invoices yet</p>
                <p className="text-sm mt-1">
                  After a successful payment, your invoice will appear here automatically.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Invoice</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((inv) => (
                      <tr key={inv.id} className="border-t">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{inv.invoice_number}</div>
                          <div className="text-xs text-muted-foreground">
                            {inv.payment_reference || inv.payment_id || "—"}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">{formatDate(inv.paid_at || inv.created_at)}</td>
                        <td className="px-4 py-3 font-medium">
                          {formatMoney(inv.total_amount, inv.currency || "INR")}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary" className="capitalize">
                            {inv.status || "issued"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/student-dashboard/invoices/${inv.id}`}>View</Link>
                            </Button>
                            <Button
                              size="sm"
                              variant="default"
                              className="bg-amber-500 hover:bg-amber-600"
                              disabled={printingId === inv.id}
                              onClick={() => void handlePrint(inv.id)}
                            >
                              {printingId === inv.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Printer className="h-4 w-4 mr-1" />
                                  Print
                                </>
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </StudentDashboardLayout>
  )
}
