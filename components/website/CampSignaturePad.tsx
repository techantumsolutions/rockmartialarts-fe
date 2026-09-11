"use client"

import { useEffect, useRef, useState } from "react"

function fillWhite(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d")
  if (!ctx) return
  ctx.fillStyle = "#fff"
  ctx.fillRect(0, 0, canvas.width, canvas.height)
}

export function CampSignaturePad({
  value,
  onChange,
}: {
  value: string
  onChange: (dataUrl: string) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawing = useRef(false)
  const [hasMark, setHasMark] = useState(Boolean(value))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    if (value) {
      const img = new Image()
      img.onload = () => {
        fillWhite(canvas)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      }
      img.src = value
      setHasMark(true)
      return
    }
    fillWhite(canvas)
    setHasMark(false)
  }, [value])

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const r = canvas.getBoundingClientRect()
    return {
      x: ((e.clientX - r.left) / r.width) * canvas.width,
      y: ((e.clientY - r.top) / r.height) * canvas.height,
    }
  }

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawing.current = true
    setHasMark(true)
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!ctx) return
    const p = pos(e)
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
    canvas?.setPointerCapture(e.pointerId)
  }

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return
    const ctx = canvasRef.current?.getContext("2d")
    if (!ctx) return
    const p = pos(e)
    ctx.lineWidth = 2.2
    ctx.lineCap = "round"
    ctx.strokeStyle = "#111"
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
  }

  const end = () => {
    if (!drawing.current) return
    drawing.current = false
    const canvas = canvasRef.current
    if (canvas) onChange(canvas.toDataURL("image/png"))
  }

  const clear = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    fillWhite(canvas)
    setHasMark(false)
    onChange("")
  }

  return (
    <div>
      <div className="camp-sign-wrap">
        {!hasMark ? <p className="camp-sign-hint">Draw your signature here</p> : null}
        <canvas
          ref={canvasRef}
          width={640}
          height={180}
          className="camp-sign-canvas"
          aria-label="Signature pad. Draw your signature with mouse or touch."
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
        />
      </div>
      <button type="button" className="camp-form-clear" onClick={clear}>
        Clear signature
      </button>
    </div>
  )
}
