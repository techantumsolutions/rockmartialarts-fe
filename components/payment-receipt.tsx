"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Download, Share2, CheckCircle2, Facebook, Twitter, Linkedin, MessageCircle, Loader2 } from "lucide-react"
import { useRef, useState } from "react"

interface PaymentReceiptProps {
  paymentId: string
  orderId: string
  amount: number
  courseName?: string
  branchName?: string
  date: string
  studentName?: string
  currency?: string
}

export function PaymentReceipt({
  paymentId,
  orderId,
  amount,
  courseName = "Course Enrollment",
  branchName = "Main Branch",
  date,
  studentName = "Student",
  currency = "INR"
}: PaymentReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    })
  }

  const [downloading, setDownloading] = useState(false)

  const handleDownloadPDF = async () => {
    try {
      setDownloading(true)
      const { jsPDF } = await import("jspdf")
      const autoTable = (await import("jspdf-autotable")).default

      const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" })
      const pageWidth = doc.internal.pageSize.getWidth()
      const margin = 40
      const contentWidth = pageWidth - margin * 2

      // Top decorative header bar
      doc.setFillColor(245, 158, 11) // amber-500
      doc.rect(0, 0, pageWidth, 6, "F")

      // Header: Brand & Title
      doc.setFont("helvetica", "bold")
      doc.setFontSize(22)
      doc.setTextColor(30, 41, 59) // slate-800
      doc.text("ROCK MARTIAL ARTS", margin, 45)

      doc.setFontSize(12)
      doc.setTextColor(217, 119, 6) // amber-600
      doc.text("PAYMENT RECEIPT", margin, 64)

      // Payment Confirmed Badge on top right
      const badgeText = "PAYMENT SUCCESSFUL"
      doc.setFontSize(9)
      doc.setFont("helvetica", "bold")
      const badgeWidth = doc.getTextWidth(badgeText) + 20
      const badgeX = pageWidth - margin - badgeWidth
      const badgeY = 32
      const badgeHeight = 22

      doc.setFillColor(220, 252, 231) // green-100
      doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 4, 4, "F")
      doc.setTextColor(22, 101, 52) // green-800
      doc.text(badgeText, badgeX + 10, badgeY + 15)

      // Divider line
      doc.setDrawColor(226, 232, 240) // slate-200
      doc.setLineWidth(1)
      doc.line(margin, 82, pageWidth - margin, 82)

      // Receipt details table
      const formattedAmount = `${currency === "INR" ? "Rs. " : currency + " "}${Number(amount || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`

      autoTable(doc, {
        startY: 96,
        body: [
          ["Student Name", studentName || "Student"],
          ["Course", courseName || "Course Enrollment"],
          ["Branch", branchName || "Main Branch"],
          ["Payment ID", paymentId || "N/A"],
          ["Order ID", orderId || paymentId || "N/A"],
          ["Date & Time", formatDate(date)],
          ["Payment Status", "Paid / Confirmed"],
        ],
        theme: "plain",
        styles: {
          fontSize: 10,
          cellPadding: { top: 9, bottom: 9, left: 10, right: 10 },
          lineColor: [241, 245, 249],
          lineWidth: { bottom: 1 },
        },
        columnStyles: {
          0: {
            fontStyle: "bold",
            textColor: [100, 116, 139],
            cellWidth: 140,
          },
          1: {
            fontStyle: "normal",
            textColor: [15, 23, 42],
          },
        },
        margin: { left: margin, right: margin },
      })

      const finalY = (doc as any).lastAutoTable?.finalY || 300

      // Amount Highlight Box
      const boxY = finalY + 16
      const boxHeight = 44
      doc.setFillColor(254, 243, 199) // amber-100
      doc.setDrawColor(245, 158, 11) // amber-500
      doc.setLineWidth(1)
      doc.roundedRect(margin, boxY, contentWidth, boxHeight, 6, 6, "FD")

      doc.setFont("helvetica", "bold")
      doc.setFontSize(11)
      doc.setTextColor(146, 64, 14) // amber-800
      doc.text("TOTAL AMOUNT PAID", margin + 14, boxY + 27)

      doc.setFontSize(16)
      doc.setTextColor(180, 83, 9) // amber-700
      const amtWidth = doc.getTextWidth(formattedAmount)
      doc.text(formattedAmount, margin + contentWidth - amtWidth - 14, boxY + 28)

      // Note box
      const noteY = boxY + boxHeight + 20
      doc.setFillColor(248, 250, 252) // slate-50
      doc.setDrawColor(226, 232, 240)
      doc.roundedRect(margin, noteY, contentWidth, 42, 6, 6, "FD")

      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)
      doc.setTextColor(71, 85, 105) // slate-600
      doc.text(
        "Thank you for your payment! You can now access your enrolled course.",
        margin + 12,
        noteY + 17
      )
      doc.text(
        "A confirmation has been recorded with your academy account.",
        margin + 12,
        noteY + 31
      )

      // Footer
      const footerY = 790
      doc.setDrawColor(226, 232, 240)
      doc.line(margin, footerY - 14, pageWidth - margin, footerY - 14)

      doc.setFontSize(8.5)
      doc.setTextColor(148, 163, 184)
      const f1 = "This is a computer-generated receipt and does not require a physical signature."
      doc.text(f1, pageWidth / 2, footerY, { align: "center" })
      const f2 = `© ${new Date().getFullYear()} Rock Martial Arts. All rights reserved.`
      doc.text(f2, pageWidth / 2, footerY + 12, { align: "center" })

      const safeName = (paymentId || orderId || "receipt").replace(/[^a-zA-Z0-9_-]/g, "_")
      doc.save(`Payment-Receipt-${safeName}.pdf`)
    } catch (err) {
      console.error("Failed to generate receipt PDF:", err)
    } finally {
      setDownloading(false)
    }
  }

  const shareText = `I just enrolled in ${courseName} at Rock Martial Arts! 🥋💪`
  const shareUrl = typeof window !== 'undefined' ? window.location.href : ''

  const handleShare = (platform: string) => {
    const encodedText = encodeURIComponent(shareText)
    const encodedUrl = encodeURIComponent(shareUrl)
    
    let url = ''
    switch (platform) {
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`
        break
      case 'twitter':
        url = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`
        break
      case 'linkedin':
        url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`
        break
      case 'whatsapp':
        url = `https://wa.me/?text=${encodedText}%20${encodedUrl}`
        break
    }
    
    if (url) {
      window.open(url, '_blank', 'width=600,height=400')
    }
  }

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Payment Receipt',
          text: shareText,
          url: shareUrl
        })
      } catch (err) {
        console.log('Share cancelled')
      }
    }
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      <Card ref={receiptRef} className="print:shadow-none">
        <CardHeader className="text-center space-y-4 pb-6">
          <div className="flex justify-center">
            <CheckCircle2 className="w-16 h-16 text-green-500" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-amber-600 mb-2">Payment Successful!</h1>
            <p className="text-muted-foreground">Your enrollment has been confirmed</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Student Name</span>
              <span className="font-medium">{studentName}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Course</span>
              <span className="font-medium">{courseName}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Branch</span>
              <span className="font-medium">{branchName}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Payment ID</span>
              <span className="font-mono text-sm">{paymentId}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Order ID</span>
              <span className="font-mono text-sm">{orderId}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Date & Time</span>
              <span className="font-medium">{formatDate(date)}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center pt-4">
              <span className="text-lg font-bold">Total Amount Paid</span>
              <span className="text-2xl font-bold text-amber-600">{formatCurrency(amount)}</span>
            </div>
          </div>

          <div className="text-center text-sm text-muted-foreground p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <p>Thank you for your payment! You can now access your enrolled course.</p>
            <p className="mt-1">A confirmation email has been sent to your registered email address.</p>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Button 
          onClick={handleDownloadPDF} 
          disabled={downloading}
          className="w-full"
          size="lg"
        >
          {downloading ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <Download className="w-5 h-5 mr-2" />
          )}
          {downloading ? "Downloading PDF..." : "Download Receipt"}
        </Button>
        
        {navigator.share ? (
          <Button 
            onClick={handleNativeShare}
            variant="outline"
            className="w-full"
            size="lg"
          >
            <Share2 className="w-5 h-5 mr-2" />
            Share Receipt
          </Button>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-center">Share on Social Media</p>
            <div className="flex gap-2 justify-center">
              <Button
                onClick={() => handleShare('facebook')}
                variant="outline"
                size="icon"
                className="hover: hover:text-white"
              >
                <Facebook className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => handleShare('twitter')}
                variant="outline"
                size="icon"
                className="hover:bg-sky-500 hover:text-white"
              >
                <Twitter className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => handleShare('linkedin')}
                variant="outline"
                size="icon"
                className="hover:text-white"
              >
                <Linkedin className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => handleShare('whatsapp')}
                variant="outline"
                size="icon"
                className="hover:bg-green-600 hover:text-white"
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
