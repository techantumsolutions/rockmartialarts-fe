/**
 * High-quality Student ID card export helpers (PNG + PDF).
 * Uses html-to-image at elevated pixelRatio for print sharpness.
 */

export async function exportIdCardPng(
  node: HTMLElement,
  filename: string,
  pixelRatio = 3
): Promise<string> {
  const { toPng } = await import("html-to-image")
  const dataUrl = await toPng(node, {
    cacheBust: true,
    pixelRatio,
    quality: 1,
    backgroundColor: "#050505",
    style: {
      transform: "none",
      margin: "0",
    },
  })
  triggerDownload(dataUrl, filename.endsWith(".png") ? filename : `${filename}.png`)
  return dataUrl
}

export async function exportIdCardPdf(
  node: HTMLElement,
  filename: string,
  pixelRatio = 3
): Promise<void> {
  const { toPng } = await import("html-to-image")
  const { jsPDF } = await import("jspdf")

  const dataUrl = await toPng(node, {
    cacheBust: true,
    pixelRatio,
    quality: 1,
    backgroundColor: "#050505",
  })

  // Keep aspect of 1024×682 warrior ID card canvas
  const cardWIn = 3.75
  const cardHIn = (682 / 1024) * cardWIn
  const marginIn = 0.35
  const pageW = cardWIn + marginIn * 2
  const pageH = cardHIn + marginIn * 2

  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "in",
    format: [pageW, pageH],
    compress: true,
  })
  pdf.addImage(dataUrl, "PNG", marginIn, marginIn, cardWIn, cardHIn, undefined, "FAST")
  pdf.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`)
}

function triggerDownload(dataUrl: string, filename: string) {
  const link = document.createElement("a")
  link.href = dataUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
