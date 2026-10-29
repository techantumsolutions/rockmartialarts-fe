"use client"

import * as React from "react"
import { Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"

interface WeeklySlotTimePickerProps {
  value?: string // 24-hour "HH:mm", e.g. "06:00", "14:30"
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
  placeholder?: string
}

function parse24Hour(value?: string): { hour12: number; minute: number; period: "AM" | "PM" } {
  if (!value || !value.trim()) {
    return { hour12: 6, minute: 0, period: "AM" }
  }
  const [hStr = "06", mStr = "00"] = value.split(":")
  let h = parseInt(hStr, 10)
  if (isNaN(h)) h = 6
  let m = parseInt(mStr, 10)
  if (isNaN(m)) m = 0

  const period: "AM" | "PM" = h >= 12 ? "PM" : "AM"
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return { hour12, minute: m, period }
}

function format24Hour(hour12: number, minute: number, period: "AM" | "PM"): string {
  let h = hour12
  if (period === "AM") {
    if (h === 12) h = 0
  } else {
    if (h !== 12) h += 12
  }
  return `${String(h).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
}

function formatDisplay(value?: string): string {
  if (!value || !value.trim()) return "--:-- --"
  const { hour12, minute, period } = parse24Hour(value)
  return `${String(hour12).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${period}`
}

const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
const MINUTES = Array.from({ length: 60 }, (_, i) => i)

export default function WeeklySlotTimePicker({
  value = "",
  onChange,
  disabled = false,
  className,
  placeholder = "Select time",
}: WeeklySlotTimePickerProps) {
  const [open, setOpen] = React.useState(false)
  const { hour12, minute, period } = parse24Hour(value)

  const hourListRef = React.useRef<HTMLDivElement>(null)
  const minuteListRef = React.useRef<HTMLDivElement>(null)

  // Scroll active elements into view when popover opens
  React.useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        const activeHour = hourListRef.current?.querySelector('[data-selected="true"]')
        const activeMinute = minuteListRef.current?.querySelector('[data-selected="true"]')
        activeHour?.scrollIntoView({ block: "center", behavior: "auto" })
        activeMinute?.scrollIntoView({ block: "center", behavior: "auto" })
      }, 30)
      return () => clearTimeout(timer)
    }
  }, [open])

  const handleHourChange = (newHour: number) => {
    onChange(format24Hour(newHour, minute, period))
  }

  const handleMinuteChange = (newMinute: number) => {
    onChange(format24Hour(hour12, newMinute, period))
  }

  const handlePeriodChange = (newPeriod: "AM" | "PM") => {
    onChange(format24Hour(hour12, minute, newPeriod))
  }

  const displayString = value ? formatDisplay(value) : placeholder

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-2.5 sm:px-3 py-1.5 text-sm ring-offset-background hover:bg-accent/40 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-left font-normal select-none transition-colors",
            !value && "text-muted-foreground",
            className
          )}
        >
          <span className="font-mono text-xs sm:text-sm tracking-tight sm:tracking-normal whitespace-nowrap shrink-0">{displayString}</span>
          <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 shrink-0 ml-1.5 sm:ml-2 opacity-70" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-64 p-0 shadow-xl border rounded-lg bg-popover overflow-hidden z-50"
        align="start"
      >
        {/* Header row: Selected Hour, Minute, AM/PM styled in blue matching timepicker header */}
        <div className="grid grid-cols-3 gap-1.5 p-2 bg-slate-50 border-b">
          <div className="flex items-center justify-center py-1 rounded bg-blue-600 text-white font-semibold text-sm shadow-sm">
            {String(hour12).padStart(2, "0")}
          </div>
          <div className="flex items-center justify-center py-1 rounded bg-blue-600 text-white font-semibold text-sm shadow-sm">
            {String(minute).padStart(2, "0")}
          </div>
          <div className="flex items-center justify-center py-1 rounded bg-blue-600 text-white font-semibold text-sm shadow-sm">
            {period}
          </div>
        </div>

        {/* 3 columns: Hours, Minutes, AM/PM */}
        <div className="grid grid-cols-3 divide-x text-center h-48 bg-white">
          {/* Column 1: Hours (01 - 12) */}
          <div ref={hourListRef} className="overflow-y-auto py-1 scrollbar-thin">
            {HOURS.map((h) => {
              const isSelected = hour12 === h
              return (
                <button
                  key={h}
                  type="button"
                  data-selected={isSelected ? "true" : "false"}
                  onClick={() => handleHourChange(h)}
                  className={cn(
                    "w-full h-8 flex items-center justify-center text-xs font-medium transition-colors",
                    isSelected
                      ? "bg-blue-600 text-white font-semibold"
                      : "hover:bg-blue-50 text-gray-700"
                  )}
                >
                  {String(h).padStart(2, "0")}
                </button>
              )
            })}
          </div>

          {/* Column 2: Minutes (00 - 59) — NO GAP between 00 and 01 */}
          <div ref={minuteListRef} className="overflow-y-auto py-1 scrollbar-thin">
            {MINUTES.map((m) => {
              const isSelected = minute === m
              return (
                <button
                  key={m}
                  type="button"
                  data-selected={isSelected ? "true" : "false"}
                  onClick={() => handleMinuteChange(m)}
                  className={cn(
                    "w-full h-8 flex items-center justify-center text-xs font-medium transition-colors",
                    isSelected
                      ? "bg-blue-600 text-white font-semibold"
                      : "hover:bg-blue-50 text-gray-700"
                  )}
                >
                  {String(m).padStart(2, "0")}
                </button>
              )
            })}
          </div>

          {/* Column 3: AM / PM */}
          <div className="py-2 flex flex-col gap-1.5 px-1.5 justify-start">
            {(["AM", "PM"] as const).map((p) => {
              const isSelected = period === p
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => handlePeriodChange(p)}
                  className={cn(
                    "w-full h-9 flex items-center justify-center text-xs font-medium rounded transition-colors",
                    isSelected
                      ? "bg-blue-600 text-white font-semibold"
                      : "hover:bg-blue-50 text-gray-700"
                  )}
                >
                  {p}
                </button>
              )
            })}
          </div>
        </div>

        {/* Quick minute intervals & Done */}
        <div className="flex items-center justify-between p-2 border-t bg-slate-50 text-xs">
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-gray-400 font-medium">Quick:</span>
            {[0, 15, 30, 45].map((qm) => (
              <button
                key={qm}
                type="button"
                onClick={() => handleMinuteChange(qm)}
                className={cn(
                  "px-1.5 py-0.5 rounded text-[11px] font-mono",
                  minute === qm
                    ? "bg-blue-600 text-white font-semibold"
                    : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                )}
              >
                :{String(qm).padStart(2, "0")}
              </button>
            ))}
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-medium"
            onClick={() => setOpen(false)}
          >
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

