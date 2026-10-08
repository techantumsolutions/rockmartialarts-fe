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

function documentAuthHeaders(token?: string | null): HeadersInit {
  const t = token || TokenManager.getToken()
  const headers: Record<string, string> = { Accept: "text/html,application/xhtml+xml" }
  if (t) headers.Authorization = `Bearer ${t}`
  return headers
}

/** Adds Print + Download controls to the opened invoice HTML tab (hidden when printing). */
function injectInvoiceViewerActions(html: string): string {
  const chrome = `
<style id="invoice-fe-actions-style">
  .invoice-fe-actions {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 99999;
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    align-items: center;
    padding: 10px 16px;
    background: #1f2937;
    color: #fff;
    font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
    box-shadow: 0 2px 10px rgba(0,0,0,.18);
  }
  .invoice-fe-actions button {
    border: 0;
    border-radius: 8px;
    padding: 8px 14px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
  }
  .invoice-fe-actions button:disabled {
    opacity: 0.65;
    cursor: wait;
  }
  .invoice-fe-actions .btn-download { background: #ffffff; color: #111827; }
  .invoice-fe-actions .btn-print { background: #FFB70F; color: #111827; }
  body { padding-top: 56px !important; }
  @media print {
    .invoice-fe-actions { display: none !important; }
    body { padding-top: 0 !important; }
  }
</style>
<div class="invoice-fe-actions" id="invoice-fe-actions">
  <button type="button" class="btn-download" id="invoice-fe-download-btn">Download PDF</button>
  <button type="button" class="btn-print" id="invoice-fe-print-btn">Print</button>
</div>
`
  if (/<body[^>]*>/i.test(html)) {
    return html.replace(/<body([^>]*)>/i, `<body$1>${chrome}`)
  }
  return `${chrome}${html}`
}

function loadScriptInWindow(win: Window, src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = win.document.querySelector(`script[data-invoice-vendor="${src}"]`)
    if (existing) {
      resolve()
      return
    }
    const script = win.document.createElement("script")
    script.src = src
    script.async = true
    script.dataset.invoiceVendor = src
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Failed to load ${src}`))
    win.document.head.appendChild(script)
  })
}

async function ensurePdfLibs(win: Window): Promise<{
  html2canvas: (el: HTMLElement, opts?: Record<string, unknown>) => Promise<HTMLCanvasElement>
  jsPDF: new (opts?: Record<string, unknown>) => {
    internal: { pageSize: { getWidth: () => number; getHeight: () => number } }
    addImage: (...args: unknown[]) => void
    addPage: () => void
    save: (name: string) => void
  }
}> {
  const origin = window.location.origin
  await loadScriptInWindow(win, `${origin}/vendor/html2canvas.min.js`)
  await loadScriptInWindow(win, `${origin}/vendor/jspdf.umd.min.js`)

  const w = win as Window & {
    html2canvas?: (el: HTMLElement, opts?: Record<string, unknown>) => Promise<HTMLCanvasElement>
    jspdf?: { jsPDF: new (opts?: Record<string, unknown>) => any }
  }
  const html2canvas = w.html2canvas
  const jsPDF = w.jspdf?.jsPDF
  if (!html2canvas || !jsPDF) {
    throw new Error("PDF tools failed to initialize. Please refresh and try again.")
  }
  return { html2canvas, jsPDF }
}

async function downloadInvoiceWindowAsPdf(win: Window, filename: string): Promise<void> {
  const body = win.document.body
  if (!body) throw new Error("Invoice content is not ready yet.")

  const { html2canvas, jsPDF } = await ensurePdfLibs(win)
  const actions = win.document.getElementById("invoice-fe-actions") as HTMLElement | null
  const prevActionDisplay = actions?.style.display ?? ""
  const prevPaddingTop = body.style.paddingTop
  if (actions) actions.style.display = "none"
  body.style.paddingTop = "0"

  try {
    const canvas = await html2canvas(body, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      windowWidth: win.document.documentElement.scrollWidth,
      windowHeight: win.document.documentElement.scrollHeight,
    })
    const imgData = canvas.toDataURL("image/png")
    const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" })
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 24
    const contentWidth = pageWidth - margin * 2
    const contentHeight = (canvas.height * contentWidth) / canvas.width

    let heightLeft = contentHeight
    let y = margin
    pdf.addImage(imgData, "PNG", margin, y, contentWidth, contentHeight)
    heightLeft -= pageHeight - margin

    while (heightLeft > 0) {
      y = margin - (contentHeight - heightLeft)
      pdf.addPage()
      pdf.addImage(imgData, "PNG", margin, y, contentWidth, contentHeight)
      heightLeft -= pageHeight - margin
    }

    pdf.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`)
  } finally {
    if (actions) actions.style.display = prevActionDisplay
    body.style.paddingTop = prevPaddingTop
  }
}

function bindInvoiceViewerActions(win: Window, filename: string) {
  const printBtn = win.document.getElementById("invoice-fe-print-btn")
  const downloadBtn = win.document.getElementById("invoice-fe-download-btn") as HTMLButtonElement | null

  if (printBtn && !(printBtn as HTMLButtonElement).dataset.bound) {
    ;(printBtn as HTMLButtonElement).dataset.bound = "1"
    printBtn.addEventListener("click", () => win.print())
  }

  if (downloadBtn && !downloadBtn.dataset.bound) {
    downloadBtn.dataset.bound = "1"
    downloadBtn.addEventListener("click", () => {
      void (async () => {
        const original = downloadBtn.textContent || "Download PDF"
        downloadBtn.disabled = true
        downloadBtn.textContent = "Preparing PDF…"
        try {
          await downloadInvoiceWindowAsPdf(win, filename)
        } catch (err) {
          win.alert(
            err instanceof Error
              ? err.message
              : "Could not download PDF. Please use Print and choose Save as PDF."
          )
        } finally {
          downloadBtn.disabled = false
          downloadBtn.textContent = original
        }
      })()
    })
  }
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
      headers: documentAuthHeaders(t),
      cache: "no-store",
    })
    if (!res.ok) throw new Error(await parseError(res))
    const html = await res.text()
    if (!html.trim()) throw new Error("Invoice document was empty. Please try again.")
    const win = window.open("", "_blank")
    if (!win) throw new Error("Please allow pop-ups to view or print the invoice.")

    const filename = `invoice-${invoiceId}.pdf`
    const enhanced = injectInvoiceViewerActions(html)
    win.document.open()
    win.document.write(enhanced)
    win.document.close()

    const bind = () => bindInvoiceViewerActions(win, filename)
    bind()
    win.addEventListener("load", bind)
    window.setTimeout(bind, 50)
    // Prefetch PDF libs so Download is ready when clicked
    void ensurePdfLibs(win).catch(() => {
      /* bind/download will retry and show a clear error if needed */
    })
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
