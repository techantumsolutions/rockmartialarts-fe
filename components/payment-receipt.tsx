"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Download,
  Share2,
  CheckCircle2,
  Facebook,
  Twitter,
  Linkedin,
  MessageCircle,
  Loader2,
  ShieldCheck,
  Receipt,
} from "lucide-react"
import { useRef, useState } from "react"

interface PaymentReceiptProps {
  paymentId: string
  orderId?: string
  amount: number
  courseName?: string
  branchName?: string
  date: string
  studentName?: string
  studentEmail?: string
  studentPhone?: string
  invoiceNumber?: string
  isRenewal?: boolean
  currency?: string
}

function numberToIndianRupeesWords(amount: number): string {
  const n = Math.round(Number(amount) || 0)
  if (n <= 0) return "Zero Rupees Only"

  const units = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ]
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ]

  function belowThousand(num: number): string {
    const parts: string[] = []
    if (num >= 100) {
      parts.push(units[Math.floor(num / 100)] + " Hundred")
      num %= 100
    }
    if (num >= 20) {
      parts.push(tens[Math.floor(num / 10)])
      num %= 10
    }
    if (num > 0) {
      parts.push(units[num])
    }
    return parts.join(" ")
  }

  const parts: string[] = []
  let rem = n

  const crores = Math.floor(rem / 10000000)
  rem %= 10000000
  if (crores > 0) {
    parts.push(belowThousand(crores) + " Crore")
  }

  const lakhs = Math.floor(rem / 100000)
  rem %= 100000
  if (lakhs > 0) {
    parts.push(belowThousand(lakhs) + " Lakh")
  }

  const thousands = Math.floor(rem / 1000)
  rem %= 1000
  if (thousands > 0) {
    parts.push(belowThousand(thousands) + " Thousand")
  }

  if (rem > 0) {
    parts.push(belowThousand(rem))
  }

  const result = parts.join(" ").trim()
  return result ? `${result} Rupees Only` : "Zero Rupees Only"
}

async function loadLogoDataUrl(): Promise<{ data: string; format: string } | null> {
  if (typeof window === "undefined") return null

  // 1. Preferred: Load image element and render to canvas -> guaranteed valid standard PNG
  try {
    const fromCanvas = await new Promise<{ data: string; format: string } | null>((resolve) => {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas")
          canvas.width = img.naturalWidth || 256
          canvas.height = img.naturalHeight || 256
          const ctx = canvas.getContext("2d")
          if (!ctx) return resolve(null)
          ctx.drawImage(img, 0, 0)
          const pngData = canvas.toDataURL("image/png")
          resolve({ data: pngData, format: "PNG" })
        } catch {
          resolve(null)
        }
      }
      img.onerror = () => resolve(null)
      img.src = "/logo.png"
    })
    if (fromCanvas) return fromCanvas
  } catch {
    // fallback
  }

  // 2. Fallback: direct fetch
  try {
    const res = await fetch("/logo.png")
    if (res.ok) {
      const blob = await res.blob()
      const dataUri = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve((reader.result as string) || "")
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
      if (dataUri) {
        const isJpeg =
          dataUri.includes("image/jpeg") ||
          dataUri.startsWith("data:image/jpeg") ||
          dataUri.includes("/9j/")
        return { data: dataUri, format: isJpeg ? "JPEG" : "PNG" }
      }
    }
  } catch {
    // ignore
  }

  return null
}

export function PaymentReceipt({
  paymentId,
  orderId,
  amount,
  courseName = "Course Enrollment",
  branchName = "Balaji Nagar",
  date,
  studentName = "Student",
  studentEmail,
  studentPhone,
  invoiceNumber,
  isRenewal = false,
  currency = "INR",
}: PaymentReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null)
  const [downloading, setDownloading] = useState(false)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    } catch {
      return dateString
    }
  }

  const receiptNumber =
    invoiceNumber ||
    `REC-${(paymentId || Date.now().toString()).slice(0, 8).toUpperCase()}`

  const handleDownloadPDF = async () => {
    try {
      setDownloading(true)
      const { jsPDF } = await import("jspdf")
      const autoTable = (await import("jspdf-autotable")).default

      const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" })
      const pageWidth = doc.internal.pageSize.getWidth()
      const margin = 36
      const contentWidth = pageWidth - margin * 2

      // 1. Top Decorative Brand Stripes
      doc.setFillColor(217, 119, 6) // Amber-600
      doc.rect(0, 0, pageWidth, 6, "F")
      doc.setFillColor(30, 41, 59) // Slate-800
      doc.rect(0, 6, pageWidth, 2, "F")

      // 2. Official Header with Logo & Brand
      const logoX = margin
      const logoY = 20
      const logoSize = 52

      let logoPlaced = false
      try {
        const logoObj = await loadLogoDataUrl()
        if (logoObj?.data) {
          doc.addImage(logoObj.data, logoObj.format, logoX, logoY, logoSize, logoSize)
          logoPlaced = true
        }
      } catch (e) {
        console.warn("Logo loading error for PDF:", e)
      }

      if (!logoPlaced) {
        // Fallback emblem badge
        doc.setFillColor(245, 158, 11)
        doc.circle(logoX + 26, logoY + 26, 26, "F")
        doc.setFont("helvetica", "bold")
        doc.setFontSize(13)
        doc.setTextColor(255, 255, 255)
        doc.text("RMA", logoX + 13, logoY + 31)
      }

      const brandX = logoX + logoSize + 14
      doc.setFont("helvetica", "bold")
      doc.setFontSize(16)
      doc.setTextColor(15, 23, 42) // Slate-900
      doc.text("ROCK MARTIAL ARTS ACADEMY", brandX, 36)

      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)
      doc.setTextColor(100, 116, 139) // Slate-500
      doc.text("Official Fee Payment Receipt", brandX, 49)

      doc.setFont("helvetica", "bold")
      doc.setFontSize(8.5)
      doc.setTextColor(217, 119, 6) // Amber-600
      doc.text(`${branchName.toUpperCase()} BRANCH`, brandX, 62)

      // Right Side: Paid Badge, Receipt No, Date
      const badgeText = "PAID & VERIFIED"
      doc.setFontSize(8)
      doc.setFont("helvetica", "bold")
      const badgeWidth = doc.getTextWidth(badgeText) + 16
      const badgeHeight = 18
      const badgeX = pageWidth - margin - badgeWidth
      const badgeY = 22

      doc.setFillColor(220, 252, 231) // Green-100
      doc.setDrawColor(187, 247, 208) // Green-200
      doc.setLineWidth(0.75)
      doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 3, 3, "FD")
      doc.setTextColor(22, 101, 52) // Green-800
      doc.text(badgeText, badgeX + 8, badgeY + 12)

      doc.setFont("helvetica", "bold")
      doc.setFontSize(9)
      doc.setTextColor(30, 41, 59)
      doc.text(`Receipt #: ${receiptNumber}`, pageWidth - margin, 52, { align: "right" })

      doc.setFont("helvetica", "normal")
      doc.setFontSize(8)
      doc.setTextColor(100, 116, 139)
      doc.text(`Date: ${formatDate(date)}`, pageWidth - margin, 65, { align: "right" })

      // Divider line
      doc.setDrawColor(226, 232, 240)
      doc.setLineWidth(1)
      doc.line(margin, 82, pageWidth - margin, 82)

      // 3. Two Information Cards: Student & Payment Details
      const cardsY = 94
      const cardGap = 12
      const cardWidth = (contentWidth - cardGap) / 2
      const cardHeight = 82

      // Card 1: Student Details
      doc.setFillColor(248, 250, 252) // Slate-50
      doc.setDrawColor(226, 232, 240) // Slate-200
      doc.setLineWidth(0.75)
      doc.roundedRect(margin, cardsY, cardWidth, cardHeight, 4, 4, "FD")

      // Card 1 Header Accent
      doc.setFillColor(241, 245, 249)
      doc.roundedRect(margin, cardsY, cardWidth, 19, 4, 4, "F")
      doc.rect(margin, cardsY + 15, cardWidth, 4, "F")
      doc.setFont("helvetica", "bold")
      doc.setFontSize(8)
      doc.setTextColor(71, 85, 105)
      doc.text("BILLED TO / STUDENT DETAILS", margin + 10, cardsY + 13)

      doc.setFont("helvetica", "bold")
      doc.setFontSize(10.5)
      doc.setTextColor(15, 23, 42)
      doc.text(studentName || "Student", margin + 10, cardsY + 35)

      let studentLineY = cardsY + 49
      doc.setFont("helvetica", "normal")
      doc.setFontSize(8)
      doc.setTextColor(100, 116, 139)

      if (studentEmail) {
        doc.text(`Email: ${studentEmail}`, margin + 10, studentLineY)
        studentLineY += 12
      }
      if (studentPhone) {
        doc.text(`Phone: ${studentPhone}`, margin + 10, studentLineY)
        studentLineY += 12
      }
      doc.text(`Branch: ${branchName}`, margin + 10, studentLineY)

      // Card 2: Payment Details
      const card2X = margin + cardWidth + cardGap
      doc.setFillColor(248, 250, 252)
      doc.setDrawColor(226, 232, 240)
      doc.roundedRect(card2X, cardsY, cardWidth, cardHeight, 4, 4, "FD")

      doc.setFillColor(241, 245, 249)
      doc.roundedRect(card2X, cardsY, cardWidth, 19, 4, 4, "F")
      doc.rect(card2X, cardsY + 15, cardWidth, 4, "F")
      doc.setFont("helvetica", "bold")
      doc.setFontSize(8)
      doc.setTextColor(71, 85, 105)
      doc.text("PAYMENT INFORMATION", card2X + 10, cardsY + 13)

      let payLineY = cardsY + 35
      doc.setFont("helvetica", "bold")
      doc.setFontSize(8)
      doc.setTextColor(71, 85, 105)
      doc.text("Payment ID:", card2X + 10, payLineY)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(7.5)
      doc.setTextColor(15, 23, 42)
      const shortPaymentId =
        paymentId.length > 26 ? paymentId.slice(0, 24) + "..." : paymentId
      doc.text(shortPaymentId, card2X + 68, payLineY)

      payLineY += 13
      if (orderId && orderId !== paymentId) {
        doc.setFont("helvetica", "bold")
        doc.setFontSize(8)
        doc.setTextColor(71, 85, 105)
        doc.text("Order ID:", card2X + 10, payLineY)
        doc.setFont("helvetica", "normal")
        doc.setFontSize(7.5)
        doc.setTextColor(15, 23, 42)
        const shortOrderId =
          orderId.length > 26 ? orderId.slice(0, 24) + "..." : orderId
        doc.text(shortOrderId, card2X + 68, payLineY)
        payLineY += 13
      }

      doc.setFont("helvetica", "bold")
      doc.setFontSize(8)
      doc.setTextColor(71, 85, 105)
      doc.text("Gateway:", card2X + 10, payLineY)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(8)
      doc.setTextColor(15, 23, 42)
      doc.text("Razorpay Online", card2X + 68, payLineY)

      payLineY += 13
      doc.setFont("helvetica", "bold")
      doc.setFontSize(8)
      doc.setTextColor(71, 85, 105)
      doc.text("Status:", card2X + 10, payLineY)
      doc.setFont("helvetica", "bold")
      doc.setFontSize(8)
      doc.setTextColor(22, 101, 52)
      doc.text("Success / Completed", card2X + 68, payLineY)

      // 4. Itemized Fee Table
      const formattedAmountNumber = Number(amount || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
      const currencySymbol = currency === "INR" ? "Rs. " : `${currency} `
      const fullAmountString = `${currencySymbol}${formattedAmountNumber}`

      autoTable(doc, {
        startY: cardsY + cardHeight + 16,
        head: [["#", "Description / Course", "Branch", "Payment Type", "Amount"]],
        body: [
          [
            "1",
            `${courseName}${isRenewal ? " (Tenure Renewal)" : " (Enrollment)"}`,
            branchName,
            isRenewal ? "Course Renewal" : "Course Fee",
            fullAmountString,
          ],
        ],
        theme: "plain",
        headStyles: {
          fillColor: [15, 23, 42], // Slate-900
          textColor: [255, 255, 255],
          fontSize: 8.5,
          fontStyle: "bold",
          cellPadding: { top: 8, bottom: 8, left: 10, right: 10 },
        },
        bodyStyles: {
          textColor: [15, 23, 42],
          fontSize: 9,
          cellPadding: { top: 10, bottom: 10, left: 10, right: 10 },
          lineColor: [226, 232, 240],
          lineWidth: { bottom: 1 },
        },
        columnStyles: {
          0: { cellWidth: 26, halign: "center", fontStyle: "bold", textColor: [100, 116, 139] },
          1: { cellWidth: "auto", fontStyle: "bold" },
          2: { cellWidth: 100 },
          3: { cellWidth: 95 },
          4: { cellWidth: 95, halign: "right", fontStyle: "bold" },
        },
        margin: { left: margin, right: margin },
      })

      const finalY = (doc as any).lastAutoTable?.finalY || 280

      // 5. Total Received Box
      const totalBoxY = finalY + 14
      const totalBoxHeight = 42
      doc.setFillColor(254, 243, 199) // Amber-100
      doc.setDrawColor(245, 158, 11) // Amber-500
      doc.setLineWidth(1)
      doc.roundedRect(margin, totalBoxY, contentWidth, totalBoxHeight, 4, 4, "FD")

      doc.setFont("helvetica", "bold")
      doc.setFontSize(10)
      doc.setTextColor(146, 64, 14) // Amber-900
      doc.text("TOTAL AMOUNT RECEIVED", margin + 14, totalBoxY + 25)

      doc.setFont("helvetica", "bold")
      doc.setFontSize(15)
      doc.setTextColor(180, 83, 9) // Amber-700
      const amtW = doc.getTextWidth(fullAmountString)
      doc.text(fullAmountString, pageWidth - margin - amtW - 14, totalBoxY + 26)

      // 6. Amount in Words Box
      const wordsY = totalBoxY + totalBoxHeight + 8
      const wordsHeight = 24
      doc.setFillColor(248, 250, 252)
      doc.setDrawColor(226, 232, 240)
      doc.setLineWidth(0.75)
      doc.roundedRect(margin, wordsY, contentWidth, wordsHeight, 3, 3, "FD")

      doc.setFont("helvetica", "bold")
      doc.setFontSize(8)
      doc.setTextColor(71, 85, 105)
      doc.text("Amount in Words:", margin + 10, wordsY + 15)

      doc.setFont("helvetica", "normal")
      doc.setFontSize(8)
      doc.setTextColor(15, 23, 42)
      doc.text(numberToIndianRupeesWords(amount), margin + 88, wordsY + 15)

      // 7. Official Terms & Confirmation
      const noteY = wordsY + wordsHeight + 12
      const noteHeight = 50
      doc.setFillColor(248, 250, 252)
      doc.setDrawColor(226, 232, 240)
      doc.roundedRect(margin, noteY, contentWidth, noteHeight, 4, 4, "FD")

      doc.setFont("helvetica", "bold")
      doc.setFontSize(8)
      doc.setTextColor(71, 85, 105)
      doc.text("CONFIRMATION & TERMS", margin + 10, noteY + 14)

      doc.setFont("helvetica", "normal")
      doc.setFontSize(7.5)
      doc.setTextColor(100, 116, 139)
      doc.text(
        "• This receipt acknowledges successful receipt of fee payment for Rock Martial Arts training.",
        margin + 10,
        noteY + 26
      )
      doc.text(
        "• All course privileges and student access have been automatically renewed/activated in your student portal.",
        margin + 10,
        noteY + 36
      )
      doc.text(
        "• For any questions regarding your batch schedule or fee receipt, please contact your branch instructor.",
        margin + 10,
        noteY + 46
      )

      // 8. Authentication & Authorized Signatory
      const sigY = noteY + noteHeight + 16
      doc.setFont("helvetica", "bold")
      doc.setFontSize(8)
      doc.setTextColor(71, 85, 105)
      doc.text("AUTHENTICATION", margin, sigY + 10)

      doc.setFont("helvetica", "normal")
      doc.setFontSize(7.5)
      doc.setTextColor(100, 116, 139)
      const shortRef = paymentId.length > 36 ? paymentId.slice(0, 34) + "..." : paymentId
      doc.text(`Digital Reference: ${shortRef}`, margin, sigY + 22)
      doc.text("Payment Gateway: Razorpay Verified", margin, sigY + 32)

      const sigBoxWidth = 160
      const sigBoxX = pageWidth - margin - sigBoxWidth
      doc.setDrawColor(203, 213, 225)
      doc.setLineWidth(0.5)
      doc.line(sigBoxX, sigY + 26, sigBoxX + sigBoxWidth, sigY + 26)

      doc.setFont("helvetica", "bold")
      doc.setFontSize(8.5)
      doc.setTextColor(15, 23, 42)
      doc.text("Authorized Signatory", sigBoxX + sigBoxWidth / 2, sigY + 38, {
        align: "center",
      })

      doc.setFont("helvetica", "normal")
      doc.setFontSize(7.5)
      doc.setTextColor(100, 116, 139)
      doc.text("Rock Martial Arts Academy", sigBoxX + sigBoxWidth / 2, sigY + 48, {
        align: "center",
      })

      // 9. Footer
      const footerY = 804
      doc.setDrawColor(226, 232, 240)
      doc.setLineWidth(0.5)
      doc.line(margin, footerY - 10, pageWidth - margin, footerY - 10)

      doc.setFont("helvetica", "normal")
      doc.setFontSize(7.5)
      doc.setTextColor(148, 163, 184)
      doc.text(
        "This is a computer-generated receipt issued by Rock Martial Arts Academy and requires no physical signature.",
        pageWidth / 2,
        footerY + 2,
        { align: "center" }
      )
      doc.text(
        `© ${new Date().getFullYear()} Rock Martial Arts Academy • ${branchName} • All rights reserved.`,
        pageWidth / 2,
        footerY + 13,
        { align: "center" }
      )

      const safeReceipt = receiptNumber.replace(/[^a-zA-Z0-9_-]/g, "_")
      doc.save(`Payment-Receipt-${safeReceipt}.pdf`)
    } catch (err) {
      console.error("Failed to generate receipt PDF:", err)
    } finally {
      setDownloading(false)
    }
  }

  const shareText = `I just enrolled in ${courseName} at Rock Martial Arts Academy! 🥋💪`
  const shareUrl = typeof window !== "undefined" ? window.location.href : ""

  const handleShare = (platform: string) => {
    const encodedText = encodeURIComponent(shareText)
    const encodedUrl = encodeURIComponent(shareUrl)

    let url = ""
    switch (platform) {
      case "facebook":
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`
        break
      case "twitter":
        url = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`
        break
      case "linkedin":
        url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`
        break
      case "whatsapp":
        url = `https://wa.me/?text=${encodedText}%20${encodedUrl}`
        break
    }

    if (url) {
      window.open(url, "_blank", "width=600,height=400")
    }
  }

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Payment Receipt - Rock Martial Arts Academy",
          text: shareText,
          url: shareUrl,
        })
      } catch {
        // cancelled
      }
    }
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      <Card
        ref={receiptRef}
        className="print:shadow-none border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-950"
      >
        {/* Top gold accent line */}
        <div className="h-2 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 w-full" />

        {/* Receipt Header */}
        <div className="p-6 sm:p-8 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border border-amber-200 bg-white shadow-sm shrink-0 flex items-center justify-center">
                <img
                  src="/logo.png"
                  alt="Rock Martial Arts"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  ROCK MARTIAL ARTS ACADEMY
                </h2>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                    Official Fee Payment Receipt
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 font-semibold border border-amber-200/60 dark:border-amber-800/60">
                    {branchName} Branch
                  </span>
                </div>
              </div>
            </div>

            <div className="text-left sm:text-right shrink-0">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-xs font-semibold border border-emerald-200 dark:border-emerald-800 mb-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>PAID & VERIFIED</span>
              </div>
              <p className="text-xs text-slate-500 font-mono">
                Receipt #:{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {receiptNumber}
                </span>
              </p>
              <p className="text-xs text-slate-500">{formatDate(date)}</p>
            </div>
          </div>
        </div>

        <CardContent className="p-6 sm:p-8 space-y-6">
          {/* Metadata Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 rounded-lg p-4 space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Billed To / Student Details
              </div>
              <div className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {studentName}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 space-y-0.5">
                {studentEmail && (
                  <p>
                    <span className="text-slate-500">Email:</span> {studentEmail}
                  </p>
                )}
                {studentPhone && (
                  <p>
                    <span className="text-slate-500">Phone:</span> {studentPhone}
                  </p>
                )}
                <p>
                  <span className="text-slate-500">Branch:</span> {branchName}
                </p>
                <p>
                  <span className="text-slate-500">Status:</span> Active Student
                </p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 rounded-lg p-4 space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Payment Information
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                <p className="flex justify-between">
                  <span className="text-slate-500">Payment ID:</span>
                  <span
                    className="font-mono text-slate-800 dark:text-slate-200 text-[11px] truncate max-w-[200px]"
                    title={paymentId}
                  >
                    {paymentId}
                  </span>
                </p>
                {orderId && orderId !== paymentId && (
                  <p className="flex justify-between">
                    <span className="text-slate-500">Order ID:</span>
                    <span
                      className="font-mono text-slate-800 dark:text-slate-200 text-[11px] truncate max-w-[200px]"
                      title={orderId}
                    >
                      {orderId}
                    </span>
                  </p>
                )}
                <p className="flex justify-between">
                  <span className="text-slate-500">Payment Method:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    Online (Razorpay)
                  </span>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-500">Payment Status:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    Success / Completed
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
            <div className="bg-slate-900 text-white text-xs font-bold px-4 py-2.5 grid grid-cols-12 gap-2">
              <span className="col-span-1 text-center">#</span>
              <span className="col-span-6">Description / Course</span>
              <span className="col-span-2">Branch</span>
              <span className="col-span-3 text-right">Amount</span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              <div className="px-4 py-3 grid grid-cols-12 gap-2 items-center bg-white dark:bg-slate-950">
                <span className="col-span-1 text-center text-xs text-slate-500 font-semibold">
                  1
                </span>
                <div className="col-span-6">
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    {courseName}
                  </p>
                  <p className="text-xs text-slate-500">
                    {isRenewal ? "Course Tenure Renewal" : "Course Enrollment Fee"}
                  </p>
                </div>
                <span className="col-span-2 text-xs text-slate-600 dark:text-slate-400">
                  {branchName}
                </span>
                <span className="col-span-3 text-right font-bold text-slate-900 dark:text-slate-100">
                  {formatCurrency(amount)}
                </span>
              </div>
            </div>
          </div>

          {/* Total & Amount in words */}
          <div className="space-y-2">
            <div className="bg-amber-50/80 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-lg p-4 flex justify-between items-center">
              <div>
                <span className="text-xs uppercase font-bold text-amber-800 dark:text-amber-400 tracking-wider">
                  Total Amount Paid
                </span>
                <p className="text-xs text-amber-700/80 dark:text-amber-400/80">
                  Inclusive of all applicable fees
                </p>
              </div>
              <span className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                {formatCurrency(amount)}
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 rounded-md px-4 py-2.5 flex items-center gap-2 text-xs">
              <span className="font-semibold text-slate-600 dark:text-slate-400 shrink-0">
                Amount in Words:
              </span>
              <span className="text-slate-800 dark:text-slate-200 italic font-medium">
                {numberToIndianRupeesWords(amount)}
              </span>
            </div>
          </div>

          {/* Confirmation Notice */}
          <div className="text-xs text-slate-600 dark:text-slate-400 p-4 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-200/70 dark:border-slate-800 space-y-1">
            <p className="font-semibold text-slate-700 dark:text-slate-300">
              Official Confirmation:
            </p>
            <p>
              • Thank you for your payment! Your enrollment in{" "}
              <span className="font-semibold">{courseName}</span> is confirmed.
            </p>
            <p>
              • You can access all course material and your updated attendance in your student dashboard.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Button
          onClick={handleDownloadPDF}
          disabled={downloading}
          className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-6 shadow-sm"
          size="lg"
        >
          {downloading ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <Download className="w-5 h-5 mr-2" />
          )}
          {downloading ? "Generating Official Receipt..." : "Download Receipt"}
        </Button>

        {typeof navigator !== "undefined" && navigator.share ? (
          <Button
            onClick={handleNativeShare}
            variant="outline"
            className="w-full py-6 font-semibold"
            size="lg"
          >
            <Share2 className="w-5 h-5 mr-2" />
            Share Receipt
          </Button>
        ) : (
          <div className="flex items-center justify-between px-4 py-2 border rounded-lg bg-white dark:bg-slate-950">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Share Confirmation:
            </span>
            <div className="flex gap-1.5">
              <Button
                onClick={() => handleShare("facebook")}
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:text-blue-600"
                title="Facebook"
              >
                <Facebook className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => handleShare("twitter")}
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:text-sky-500"
                title="Twitter"
              >
                <Twitter className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => handleShare("linkedin")}
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:text-blue-700"
                title="LinkedIn"
              >
                <Linkedin className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => handleShare("whatsapp")}
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:text-green-600"
                title="WhatsApp"
              >
                <MessageCircle className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
