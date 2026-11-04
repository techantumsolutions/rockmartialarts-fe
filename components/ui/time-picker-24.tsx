"use client"

import * as React from "react"
import { Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"

interface TimePicker24Props {
  value?: string // "HH:mm"
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const MINUTES = Array.from({ length: 60 }, (_, i) => i)

function parse(value?: string): { hour: number; minute: number } {
  if (!value || !value.includes(":")) return { hour: 7, minute: 0 }
  const [hStr = "7", mStr = "0"] = value.split(":")
  let hour = parseInt(hStr, 10)
  let minute = parseInt(mStr, 10)
  if (!Number.isFinite(hour) || hour < 0 || hour > 23) hour = 7
  if (!Number.isFinite(minute) || minute < 0 || minute > 59) minute = 0
  return { hour, minute }
}

function format(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
}

export function TimePicker24({
  value = "",
  onChange,
  disabled = false,
  className,
}: TimePicker24Props) {
  const [open, setOpen] = React.useState(false)
  const { hour, minute } = parse(value)
  const hourListRef = React.useRef<HTMLDivElement>(null)
  const minuteListRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => {
      // Keep list tight: scroll selected to nearest edge — never "center"
      // (centering "00" creates the empty gap above 01).
      hourListRef.current
        ?.querySelector('[data-selected="true"]')
        ?.scrollIntoView({ block: "nearest", behavior: "auto" })
      minuteListRef.current
        ?.querySelector('[data-selected="true"]')
        ?.scrollIntoView({ block: "nearest", behavior: "auto" })
    }, 20)
    return () => window.clearTimeout(timer)
  }, [open, hour, minute])

  const display = value?.trim() ? format(hour, minute) : "--:--"

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-9 w-full min-w-0 items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none hover:bg-accent/40 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
            !value?.trim() && "text-muted-foreground",
            className
          )}
        >
          <span className="font-mono tracking-tight">{display}</span>
          <Clock className="h-4 w-4 text-gray-500 opacity-70 shrink-0 ml-2" />
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-44 p-0 shadow-xl border rounded-lg overflow-hidden z-50" align="start">
        <div className="grid grid-cols-2 gap-1.5 p-2 bg-slate-50 border-b">
          <div className="flex items-center justify-center py-1 rounded bg-blue-600 text-white font-semibold text-sm">
            {String(hour).padStart(2, "0")}
          </div>
          <div className="flex items-center justify-center py-1 rounded bg-blue-600 text-white font-semibold text-sm">
            {String(minute).padStart(2, "0")}
          </div>
        </div>

        <div className="grid grid-cols-2 divide-x h-48 bg-white">
          <div ref={hourListRef} className="overflow-y-auto overscroll-contain">
            {HOURS.map((h) => {
              const isSelected = hour === h
              return (
                <button
                  key={h}
                  type="button"
                  data-selected={isSelected ? "true" : "false"}
                  onClick={() => onChange(format(h, minute))}
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

          <div ref={minuteListRef} className="overflow-y-auto overscroll-contain">
            {MINUTES.map((m) => {
              const isSelected = minute === m
              return (
                <button
                  key={m}
                  type="button"
                  data-selected={isSelected ? "true" : "false"}
                  onClick={() => onChange(format(hour, m))}
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
        </div>

        <div className="flex justify-end p-2 border-t bg-slate-50">
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
