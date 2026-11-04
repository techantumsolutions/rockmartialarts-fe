"use client"

import { useEffect, useState } from "react"
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

type YearPickerProps = {
  value: string
  onChange: (year: string) => void
}

const EARLIEST_YEAR = 1900

export function YearPicker({ value, onChange }: YearPickerProps) {
  const currentYear = new Date().getFullYear()
  const [open, setOpen] = useState(false)
  const [decadeStart, setDecadeStart] = useState(
    Math.floor((Number(value) || currentYear) / 10) * 10
  )

  useEffect(() => {
    if (open) {
      setDecadeStart(Math.floor((Number(value) || currentYear) / 10) * 10)
    }
  }, [open, value, currentYear])

  const years = Array.from({ length: 10 }, (_, index) => decadeStart + index)
    .filter((year) => year >= EARLIEST_YEAR && year <= currentYear)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={value ? `Qualification year: ${value}` : "Select qualification year"}
          aria-haspopup="dialog"
          aria-expanded={open}
          className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-left text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <span className={value ? "" : "text-muted-foreground"}>{value || "Select year"}</span>
          <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-3" aria-label="Select qualification year">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            aria-label="Previous decade"
            disabled={decadeStart <= EARLIEST_YEAR}
            onClick={() => setDecadeStart((start) => Math.max(EARLIEST_YEAR, start - 10))}
            className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium">
            {decadeStart}–{Math.min(decadeStart + 9, currentYear)}
          </span>
          <button
            type="button"
            aria-label="Next decade"
            disabled={decadeStart + 10 > currentYear}
            onClick={() => setDecadeStart((start) => start + 10)}
            className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {years.map((year) => (
            <button
              key={year}
              type="button"
              aria-pressed={value === String(year)}
              onClick={() => {
                onChange(String(year))
                setOpen(false)
              }}
              className={`h-9 rounded-md text-sm transition-colors ${
                value === String(year)
                  ? "bg-yellow-400 font-medium text-black hover:bg-yellow-500"
                  : "hover:bg-accent"
              }`}
            >
              {year}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
