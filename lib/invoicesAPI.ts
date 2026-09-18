import { getBackendApiUrl } from "@/lib/config"
import { TokenManager } from "@/lib/tokenManager"

export type InvoiceListItem = {
  id: string
  invoice_number: string
  status?: string
  total_amount: number
  currency?: string
  paid_at?: string | null
  customer_name?: string
  payment_id?: string | null
  cart_checkout_id?: string | null
  payment_reference?: string | null
  line_count?: number
  created_at?: string | null
  source?: string
}

export type InvoiceLineItem = {
  id?: string
  description?: string
  student_label?: string
  course_name?: string
  branch_name?: string
  course_fee?: number
  admission_fee?: number
  discount_amount?: number
  line_total?: number
}

export type InvoiceWhatsAppDelivery = {
  id?: string | null
  status?: string | null
  trigger?: string | null
  attempt?: number | null
  phone_masked?: string | null
  template_name?: string | null
  error?: string | null
  skip_reason?: string | null
  sent_at?: string | null
  delivered_at?: string | null
  created_at?: string | null
  provider_message_id?: string | null
}

export type InvoiceDetail = {
  id: string
  invoice_number: string
  status?: string
  total_amount: number
  subtotal_amount?: number
  admission_total?: number
  discount_total?: number
  tax_total?: number
  currency?: string
  paid_at?: string | null
  payment_id?: string | null
  payment_reference?: string | null
  payment_method?: string | null
  payment_gateway_label?: string | null
  customer?: { name?: string; email?: string; phone?: string }
  company?: { name?: string; email?: string; phone?: string }
  line_items?: InvoiceLineItem[]
  source?: string
  created_at?: string | null
  whatsapp_delivery?: InvoiceWhatsAppDelivery | null
  whatsapp_deliveries?: InvoiceWhatsAppDelivery[]
}

function authHeaders(token?: string | null): HeadersInit {
  const t = token || TokenManager.getToken()
  const headers: Record<string, string> = { Accept: "application/json" }
  if (t) headers.Authorization = `Bearer ${t}`
  return headers
}

async function parseError(res: Response): Promise<string> {
  const data = await res.json().catch(() => ({}))
  if (typeof data?.detail === "string") return data.detail
  if (Array.isArray(data?.detail)) {
    return data.detail.map((d: { msg?: string }) => d?.msg).filter(Boolean).join(", ") || res.statusText
  }
  return data?.message || res.statusText || "Request failed"
}

export const invoicesAPI = {
  async list(params?: {
    skip?: number
    limit?: number
    search?: string
    payment_id?: string
    token?: string | null
  }): Promise<{ invoices: InvoiceListItem[]; total: number }> {
    const q = new URLSearchParams()
    if (params?.skip != null) q.set("skip", String(params.skip))
    if (params?.limit != null) q.set("limit", String(params.limit))
    if (params?.search) q.set("search", params.search)
    if (params?.payment_id) q.set("payment_id", params.payment_id)
    const res = await fetch(`${getBackendApiUrl("invoices")}?${q.toString()}`, {
      headers: authHeaders(params?.token),
      cache: "no-store",
    })
    if (!res.ok) throw new Error(await parseError(res))
    const data = await res.json()
    return {
      invoices: Array.isArray(data.invoices) ? data.invoices : [],
      total: Number(data.total || 0),
    }
  },

  async get(invoiceId: string, token?: string | null): Promise<InvoiceDetail> {
    const res = await fetch(getBackendApiUrl(`invoices/${encodeURIComponent(invoiceId)}`), {
      headers: authHeaders(token),
      cache: "no-store",
    })
    if (!res.ok) throw new Error(await parseError(res))
    const data = await res.json()
    return data.invoice as InvoiceDetail
  },

  async getByPayment(paymentId: string, token?: string | null): Promise<InvoiceDetail> {
    const res = await fetch(
      getBackendApiUrl(`invoices/by-payment/${encodeURIComponent(paymentId)}`),
      { headers: authHeaders(token), cache: "no-store" }
    )
    if (!res.ok) throw new Error(await parseError(res))
    const data = await res.json()
    return data.invoice as InvoiceDetail
  },

  documentUrl(invoiceId: string): string {
    return getBackendApiUrl(`invoices/${encodeURIComponent(invoiceId)}/document`)
  },

  async openPrintableDocument(invoiceId: string, token?: string | null): Promise<void> {
    const t = token || TokenManager.getToken()
    const res = await fetch(getBackendApiUrl(`invoices/${encodeURIComponent(invoiceId)}/document`), {
      headers: authHeaders(t),
      cache: "no-store",
    })
    if (!res.ok) throw new Error(await parseError(res))
    const html = await res.text()
    const win = window.open("", "_blank")
    if (!win) throw new Error("Please allow pop-ups to view or print the invoice.")
    win.document.write(html)
    win.document.close()
  },

  async getWhatsAppDeliveries(
    invoiceId: string,
    token?: string | null
  ): Promise<{ deliveries: InvoiceWhatsAppDelivery[] }> {
    const res = await fetch(
      getBackendApiUrl(`invoices/${encodeURIComponent(invoiceId)}/whatsapp/deliveries`),
      { headers: authHeaders(token), cache: "no-store" }
    )
    if (!res.ok) throw new Error(await parseError(res))
    const data = await res.json()
    return {
      deliveries: Array.isArray(data.deliveries) ? data.deliveries : [],
    }
  },

  async resendWhatsApp(
    invoiceId: string,
    options?: { phone_override?: string; token?: string | null }
  ): Promise<{
    status?: string
    phone_masked?: string
    attempt?: number
    whatsapp_delivery?: InvoiceWhatsAppDelivery
    message?: string
  }> {
    const res = await fetch(
      getBackendApiUrl(`invoices/${encodeURIComponent(invoiceId)}/whatsapp/resend`),
      {
        method: "POST",
        headers: {
          ...authHeaders(options?.token),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone_override: options?.phone_override || null,
          force: true,
        }),
      }
    )
    if (!res.ok) throw new Error(await parseError(res))
    return await res.json()
  },
}
