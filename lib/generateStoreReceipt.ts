import { StoreOrder } from "@/lib/storeAPI"

export async function generateStoreReceipt(order: StoreOrder): Promise<void> {
  const { jsPDF } = await import("jspdf")
  const autoTable = (await import("jspdf-autotable")).default

  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 40
  const contentWidth = pageWidth - margin * 2

  // Top decorative bar
  doc.setFillColor(245, 158, 11) // amber-500
  doc.rect(0, 0, pageWidth, 6, "F")

  // Header Brand & Title
  doc.setFont("helvetica", "bold")
  doc.setFontSize(22)
  doc.setTextColor(30, 41, 59) // slate-800
  doc.text("ROCK MARTIAL ARTS", margin, 46)

  doc.setFontSize(12)
  doc.setTextColor(217, 119, 6) // amber-600
  doc.text("STORE PURCHASE RECEIPT", margin, 65)

  // Status Badge on top right
  const badgeText = "PAYMENT SUCCESSFUL"
  doc.setFontSize(9)
  doc.setFont("helvetica", "bold")
  const badgeWidth = doc.getTextWidth(badgeText) + 20
  const badgeX = pageWidth - margin - badgeWidth
  const badgeY = 32
  const badgeHeight = 22

  doc.setFillColor(220, 252, 231) // emerald-100
  doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 4, 4, "F")
  doc.setTextColor(22, 101, 52) // emerald-800
  doc.text(badgeText, badgeX + 10, badgeY + 15)

  // Divider line
  doc.setDrawColor(226, 232, 240) // slate-200
  doc.setLineWidth(1)
  doc.line(margin, 82, pageWidth - margin, 82)

  // Order & Student Meta Details Table
  const formattedDate = order.created_at
    ? new Date(order.created_at).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "N/A"

  autoTable(doc, {
    startY: 96,
    body: [
      ["Order Number", order.order_number || "N/A"],
      ["Date & Time", formattedDate],
      ["Student Name", order.student_name || "Student"],
      ["Email", order.student_email || "N/A"],
      ["Phone", order.student_phone || "N/A"],
      ["Assigned Branch", order.branch_name || "Main Branch"],
      ["Payment Method", "Online (Razorpay)"],
      ["Payment ID", order.payment_id || "N/A"],
      ["Payment Status", "Paid / Confirmed"],
    ],
    theme: "plain",
    styles: {
      fontSize: 9.5,
      cellPadding: { top: 6, bottom: 6, left: 8, right: 8 },
      lineColor: [241, 245, 249],
      lineWidth: { bottom: 1 },
    },
    columnStyles: {
      0: {
        fontStyle: "bold",
        textColor: [100, 116, 139],
        cellWidth: 130,
      },
      1: {
        fontStyle: "normal",
        textColor: [15, 23, 42],
      },
    },
    margin: { left: margin, right: margin },
  })

  let currentY = (doc as any).lastAutoTable?.finalY || 240

  // Purchased Items Table Header
  currentY += 16
  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.setTextColor(30, 41, 59)
  doc.text("PURCHASED GEAR DETAILS", margin, currentY)
  currentY += 8

  const tableRows = (order.items || []).map((item, idx) => {
    const finalPrice = item.final_price || item.price || 0
    const qty = item.quantity || 1
    const subtotal = finalPrice * qty
    return [
      String(idx + 1),
      item.title || "Gear Item",
      item.category_name || "General",
      `Rs. ${item.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
      item.offer_percentage > 0 ? `${item.offer_percentage}%` : "0%",
      `Rs. ${finalPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
      String(qty),
      `Rs. ${subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
    ]
  })

  autoTable(doc, {
    startY: currentY,
    head: [["#", "Item", "Category", "Base Price", "Offer", "Unit Price", "Qty", "Total"]],
    body: tableRows,
    theme: "striped",
    headStyles: {
      fillColor: [30, 41, 59], // slate-800
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: "bold",
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 6,
    },
    columnStyles: {
      0: { cellWidth: 24, halign: "center" },
      1: { cellWidth: 140 },
      2: { cellWidth: 70 },
      3: { halign: "right" },
      4: { halign: "center" },
      5: { halign: "right" },
      6: { cellWidth: 35, halign: "center" },
      7: { halign: "right", fontStyle: "bold" },
    },
    margin: { left: margin, right: margin },
  })

  currentY = (doc as any).lastAutoTable?.finalY || (currentY + 60)

  // Total Box
  const boxY = currentY + 16
  const boxHeight = 42
  doc.setFillColor(254, 243, 199) // amber-100
  doc.setDrawColor(245, 158, 11) // amber-500
  doc.setLineWidth(1)
  doc.roundedRect(margin, boxY, contentWidth, boxHeight, 6, 6, "FD")

  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.setTextColor(146, 64, 14) // amber-800
  doc.text("TOTAL AMOUNT PAID", margin + 14, boxY + 26)

  const formattedAmount = `Rs. ${Number(order.total_amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
  doc.setFontSize(15)
  doc.setTextColor(180, 83, 9) // amber-700
  const amtWidth = doc.getTextWidth(formattedAmount)
  doc.text(formattedAmount, margin + contentWidth - amtWidth - 14, boxY + 26)

  // Handover Instructions Box
  const noteY = boxY + boxHeight + 16
  doc.setFillColor(248, 250, 252) // slate-50
  doc.setDrawColor(226, 232, 240)
  doc.roundedRect(margin, noteY, contentWidth, 40, 6, 6, "FD")

  doc.setFont("helvetica", "bold")
  doc.setFontSize(8.5)
  doc.setTextColor(51, 65, 85)
  doc.text("Collection Information:", margin + 12, noteY + 15)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(71, 85, 105)
  doc.text(
    "Please present this receipt or your Order ID at your training branch to collect your martial arts gear.",
    margin + 12,
    noteY + 28
  )

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 30
  doc.setDrawColor(226, 232, 240)
  doc.line(margin, footerY - 12, pageWidth - margin, footerY - 12)

  doc.setFontSize(8)
  doc.setTextColor(148, 163, 184)
  doc.text(
    "This is an official computer-generated receipt from Rock Martial Arts.",
    pageWidth / 2,
    footerY,
    { align: "center" }
  )

  doc.save(`receipt-${order.order_number || "rma-store"}.pdf`)
}

