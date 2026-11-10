"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Download, Share2, CheckCircle2, Facebook, Twitter, Linkedin, MessageCircle } from "lucide-react"
import { useRef } from "react"

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

  const handleDownloadPDF = () => {
    // Simple print-to-PDF functionality
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const receiptHTML = receiptRef.current?.innerHTML || ''
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Receipt - ${paymentId}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
          }
          .receipt-header {
            text-align: center;
            margin-bottom: 30px;
          }
          .receipt-title {
            font-size: 28px;
            font-weight: bold;
            color: #f59e0b;
            margin-bottom: 10px;
          }
          .success-icon {
            color: #22c55e;
            font-size: 48px;
            margin-bottom: 20px;
          }
          .receipt-details {
            background: #f9fafb;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
          }
          .detail-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #e5e7eb;
          }
          .detail-label {
            font-weight: 600;
            color: #6b7280;
          }
          .detail-value {
            color: #111827;
          }
          .amount-row {
            font-size: 20px;
            font-weight: bold;
            color: #f59e0b;
            border-bottom: none;
            padding-top: 20px;
          }
          .footer {
            text-align: center;
            margin-top: 40px;
            color: #6b7280;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        ${receiptHTML}
        <div class="footer">
          <p>This is a computer-generated receipt and does not require a signature.</p>
          <p>© ${new Date().getFullYear()} Rock Martial Arts. All rights reserved.</p>
        </div>
      </body>
      </html>
    `)
    
    printWindow.document.close()
    setTimeout(() => {
      printWindow.print()
    }, 250)
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
          className="w-full"
          size="lg"
        >
          <Download className="w-5 h-5 mr-2" />
          Download Receipt
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
