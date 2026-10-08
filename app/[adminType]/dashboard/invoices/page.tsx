"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Loader2, FileText, Printer, Search } from "lucide-react"
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

function matchesInvoiceSearch(inv: InvoiceListItem, raw: string) {
  const term = raw.trim().toLowerCase()
  if (!term) return true
  const haystack = [
    inv.invoice_number,
    inv.customer_name,
    inv.payment_reference,
    inv.payment_id,
    inv.cart_checkout_id,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
  // Match if every word in the query appears somewhere in the invoice fields.
  return term.split(/\s+/).every((word) => haystack.includes(word))
}

export default function AdminInvoicesPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const adminType = String(params?.adminType || "super-admin")
  const basePath = `/${adminType}/dashboard`

  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [allItems, setAllItems] = useState<InvoiceListItem[]>([])
  const [serverTotal, setServerTotal] = useState(0)
  const [printingId, setPrintingId] = useState<string | null>(null)

  const filteredItems = useMemo(
    () => allItems.filter((inv) => matchesInvoiceSearch(inv, search)),
    [allItems, search]
  )

  const activeQuery = search.trim()
  const visibleCount = filteredItems.length

  async function load(q?: string) {
    const term = (q ?? search).trim()
    setLoading(true)
    try {
      if (!TokenManager.isAuthenticated()) {
        router.push(adminType.includes("branch") ? "/branch-manager/login" : "/superadmin/login")
        return
      }
      const data = await invoicesAPI.list({
        limit: 100,
        search: term || undefined,
      })
      const invoices = Array.isArray(data.invoices) ? data.invoices : []
      setAllItems(invoices)
      setServerTotal(Number(data.total || invoices.length))
      if (typeof q === "string") {
        setSearch(q)
      }
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
    void load("")
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Automatic invoices created after successful payments.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Invoice register</CardTitle>
          <CardDescription>
            {activeQuery
              ? `${visibleCount} match${visibleCount === 1 ? "" : "es"} for “${activeQuery}”`
              : serverTotal > 0
                ? `${serverTotal} invoice${serverTotal === 1 ? "" : "s"}`
                : "No invoices yet"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                className="pl-9"
                placeholder="Search invoice number, customer, payment reference"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    void load(search)
                  }
                }}
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              disabled={loading}
              onClick={() => void load(search)}
            >
              Search
            </Button>
            {activeQuery ? (
              <Button
                type="button"
                variant="outline"
                disabled={loading}
                onClick={() => {
                  setSearch("")
                  void load("")
                }}
              >
                Clear
              </Button>
            ) : null}
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
              <FileText className="mx-auto mb-3 h-10 w-10 opacity-40" />
              <p className="font-medium text-gray-800">
                {activeQuery ? "No matching invoices" : "No invoices yet"}
              </p>
              <p className="text-sm mt-1">
                {activeQuery
                  ? "Try a different invoice number, customer name, or payment reference."
                  : "Invoices appear automatically when payments succeed."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Invoice</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Lines</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((inv) => (
                    <tr key={inv.id} className="border-t">
                      <td className="px-4 py-3">
                        <div className="font-medium">{inv.invoice_number}</div>
                        <div className="text-xs text-muted-foreground">{inv.payment_reference || "—"}</div>
                      </td>
                      <td className="px-4 py-3">{inv.customer_name || "—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {formatDate(inv.paid_at || inv.created_at)}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {formatMoney(inv.total_amount, inv.currency || "INR")}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{inv.line_count || 0}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`${basePath}/invoices/${inv.id}`}>View</Link>
                          </Button>
                          <Button
                            size="sm"
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
  )
}
