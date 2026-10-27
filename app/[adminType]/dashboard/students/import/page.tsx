"use client"

import { getBackendApiUrl } from "@/lib/config"
import { TokenManager } from "@/lib/tokenManager"
import { useRouter, useParams } from "next/navigation"
import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Upload, FileSpreadsheet, AlertCircle, CheckCircle, Download } from "lucide-react"

const EXPECTED_HEADERS = [
  "first_name",
  "last_name",
  "email",
  "phone",
  "branch_id",
  "course_id",
  "category_id",
  "duration",
  "date_of_birth",
  "gender",
  "last_payment_date",
  "next_payment_due",
  "amount_paid",
] as const

type Row = Record<string, string>

function parseCSVLine(line: string): string[] {
  const out: string[] = []
  let cur = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      inQuotes = !inQuotes
      continue
    }
    if (!inQuotes && (c === "," || c === "\t")) {
      out.push(cur.trim())
      cur = ""
      continue
    }
    cur += c
  }
  out.push(cur.trim())
  return out
}

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (lines.length === 0) return { headers: [], rows: [] }
  const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, "_"))
  const rows = lines.slice(1).map((l) => parseCSVLine(l))
  return { headers, rows }
}

function parseFile(file: File): Promise<{ headers: string[]; rows: string[][] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        import("xlsx")
          .then((XLSX) => {
            const ab = reader.result as ArrayBuffer
            const wb = XLSX.read(new Uint8Array(ab), { type: "array" })
            const first = wb.SheetNames[0]
            const sheet = wb.Sheets[first]
            const data: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" })
            if (data.length === 0) {
              resolve({ headers: [], rows: [] })
              return
            }
            const headers = (data[0] as string[]).map((h) => String(h || "").toLowerCase().replace(/\s+/g, "_"))
            const rows = data.slice(1).map((r) => (Array.isArray(r) ? r : [r]).map((c) => String(c ?? "")))
            resolve({ headers, rows })
          })
          .catch(() => {
            reject(new Error("Excel support requires the xlsx package. Use CSV for now or Save As CSV from Excel."))
          })
      } else {
        const text = (reader.result as string) || ""
        resolve(parseCSV(text))
      }
    }
    if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
      reader.readAsArrayBuffer(file)
    } else {
      reader.readAsText(file, "UTF-8")
    }
  })
}

function buildRows(headers: string[], rows: string[][]): Row[] {
  return rows.map((cells) => {
    const row: Row = {}
    headers.forEach((h, i) => {
      row[h] = (cells[i] ?? "").trim()
    })
    return row
  })
}

export default function BulkImportStudentsPage() {
  const router = useRouter()
  const params = useParams()
  const adminType = (params?.adminType as string) || "super-admin"
  const basePath = `/${adminType}/dashboard`

  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<Row[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ created: number; total: number; errors: { row: number; email: string; error: string }[] } | null>(null)

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    setFile(f || null)
    setPreview([])
    setHeaders([])
    setError(null)
    setResult(null)
    if (!f) return
    const isCSV = f.name.endsWith(".csv") || f.name.endsWith(".txt")
    const isExcel = f.name.endsWith(".xlsx") || f.name.endsWith(".xls")
    if (!isCSV && !isExcel) {
      setError("Please upload a CSV or Excel (.xlsx) file.")
      return
    }
    parseFile(f)
      .then(({ headers: h, rows }) => {
        setHeaders(h)
        setPreview(buildRows(h, rows))
        if (rows.length === 0) setError("No data rows found.")
      })
      .catch((err) => setError(err?.message || "Failed to parse file."))
  }, [])

  const getVal = (row: Row, key: string) => row[key] ?? ""

  const handleImport = async () => {
    if (preview.length === 0) {
      setError("No rows to import.")
      return
    }
    const token = TokenManager.getToken()
    if (!token) {
      setError("Please log in as Super Admin.")
      return
    }
    setImporting(true)
    setError(null)
    setResult(null)
    try {
      const students = preview.map((row) => ({
        first_name: getVal(row, "first_name") || getVal(row, "firstname"),
        last_name: getVal(row, "last_name") || getVal(row, "lastname"),
        email: getVal(row, "email"),
        phone: getVal(row, "phone"),
        branch_id: getVal(row, "branch_id"),
        course_id: getVal(row, "course_id") || undefined,
        category_id: getVal(row, "category_id") || undefined,
        duration: getVal(row, "duration") || undefined,
        date_of_birth: getVal(row, "date_of_birth") || getVal(row, "dob") || undefined,
        gender: getVal(row, "gender") || undefined,
        last_payment_date: getVal(row, "last_payment_date") || undefined,
        next_payment_due: getVal(row, "next_payment_due") || undefined,
        amount_paid: getVal(row, "amount_paid") ? parseFloat(getVal(row, "amount_paid")) : undefined,
      }))
      const res = await fetch(getBackendApiUrl("superadmin/students/bulk-import"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ students }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.detail || data.message || `Import failed (${res.status})`)
        return
      }
      setResult({
        created: data.created ?? 0,
        total: data.total ?? 0,
        errors: data.errors ?? [],
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error.")
    } finally {
      setImporting(false)
    }
  }

  const requiredMissing = (row: Row) => {
    const a = getVal(row, "first_name") || getVal(row, "firstname")
    const b = getVal(row, "last_name") || getVal(row, "lastname")
    const c = getVal(row, "email")
    const d = getVal(row, "phone")
    const e = getVal(row, "branch_id")
    if (!a || !b || !c || !d || !e) return true
    return false
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="w-full mx-auto py-4 sm:py-6 px-4 lg:px-8">
        <div className="mb-6">
          {/* Title row: tablet portrait (md–lg) keeps Back beside the title */}
          <div className="flex items-center justify-between gap-3 mb-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#4F5077] min-w-0">
              Bulk Import Students
            </h1>
            <Button
              variant="outline"
              onClick={() => router.push(`${basePath}/students`)}
              className="hidden md:inline-flex lg:hidden shrink-0 whitespace-nowrap items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Students
            </Button>
          </div>
          {/* Mobile + desktop: same placement as before (below / right of description) */}
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start">
            <p className="text-gray-600 text-sm flex-1 min-w-0">
              Upload a CSV or Excel file to add existing students to branches. Include payment fields for reminders (email/SMS/WhatsApp later).
            </p>
            <Button
              variant="outline"
              onClick={() => router.push(`${basePath}/students`)}
              className="inline-flex md:hidden lg:inline-flex shrink-0 whitespace-nowrap items-center gap-2 self-start"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Students
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-[#4F5077] mb-2">File format</h2>
            <p className="text-gray-600 text-sm mb-2">
              Required columns: <code className="bg-gray-100 px-1 rounded">first_name</code>,{" "}
              <code className="bg-gray-100 px-1 rounded">last_name</code>, <code className="bg-gray-100 px-1 rounded">email</code>,{" "}
              <code className="bg-gray-100 px-1 rounded">phone</code>, <code className="bg-gray-100 px-1 rounded">branch_id</code>.
            </p>
            <p className="text-gray-600 text-sm mb-2">
              Optional: <code className="bg-gray-100 px-1 rounded">course_id</code>, <code className="bg-gray-100 px-1 rounded">category_id</code>,{" "}
              <code className="bg-gray-100 px-1 rounded">duration</code>, <code className="bg-gray-100 px-1 rounded">date_of_birth</code>,{" "}
              <code className="bg-gray-100 px-1 rounded">gender</code>, <code className="bg-gray-100 px-1 rounded">last_payment_date</code> (YYYY-MM-DD),{" "}
              <code className="bg-gray-100 px-1 rounded">next_payment_due</code> (YYYY-MM-DD), <code className="bg-gray-100 px-1 rounded">amount_paid</code>.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <label className="cursor-pointer">
                <span className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  <Upload className="h-4 w-4" />
                  Choose CSV or Excel
                </span>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls,.txt"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
              <a
                href="/bulk-import-students-sample.csv"
                download="bulk-import-students-sample.csv"
                className="inline-flex items-center gap-2 rounded-lg border border-[#4F5077] bg-white px-4 py-2 text-sm font-medium text-[#4F5077] hover:bg-gray-50"
              >
                <Download className="h-4 w-4" />
                Download sample CSV
              </a>
              {file && <span className="text-sm text-gray-500">{file.name}</span>}
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            {error}
          </div>
        )}

        {result && (
          <div className="mb-6 flex flex-col gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-green-800">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
              <span>Imported {result.created} of {result.total} student(s).</span>
            </div>
            {result.errors.length > 0 && (
              <ul className="list-disc list-inside text-sm mt-2">
                {result.errors.slice(0, 10).map((e, i) => (
                  <li key={i}>Row {e.row} ({e.email}): {e.error}</li>
                ))}
                {result.errors.length > 10 && <li>… and {result.errors.length - 10} more</li>}
              </ul>
            )}
          </div>
        )}

        {preview.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-[#4F5077]">Preview ({preview.length} rows)</h2>
              <Button onClick={handleImport} disabled={importing}>
                {importing ? "Importing…" : "Import to database"}
              </Button>
            </div>
            <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left p-2 font-medium text-gray-600">#</th>
                    {EXPECTED_HEADERS.map((h) => (
                      <th key={h} className="text-left p-2 font-medium text-gray-600">{h}</th>
                    ))}
                    <th className="text-left p-2 font-medium text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 100).map((row, idx) => (
                    <tr key={idx} className={requiredMissing(row) ? "bg-red-50" : "hover:bg-gray-50"}>
                      <td className="p-2">{idx + 1}</td>
                      {EXPECTED_HEADERS.map((h) => (
                        <td key={h} className="p-2 max-w-[120px] truncate" title={getVal(row, h)}>
                          {getVal(row, h) || "—"}
                        </td>
                      ))}
                      <td className="p-2">
                        {requiredMissing(row) ? (
                          <span className="text-red-600 text-xs">Missing required</span>
                        ) : (
                          <span className="text-green-600 text-xs">OK</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {preview.length > 100 && (
              <p className="p-2 text-sm text-gray-500 border-t">Showing first 100 rows. All {preview.length} will be imported.</p>
            )}
          </div>
        )}

        {!file && preview.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center text-gray-500">
            <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Upload a CSV or Excel file to get started.</p>
          </div>
        )}
      </main>
    </div>
  )
}
