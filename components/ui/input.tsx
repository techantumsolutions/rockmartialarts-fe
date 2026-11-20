import * as React from "react"

import { cn } from "@/lib/utils"

/** Global form input — soft gray field, tall control, gold focus (all roles/pages). */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        data-slot="input"
        className={cn(
          "flex h-14 w-full min-w-0 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-2 text-[15px] text-[#2F3153] shadow-none transition-[color,box-shadow,background-color,border-color] outline-none",
          "placeholder:text-[#94A3B8]",
          "selection:bg-[#E1BB33]/30 selection:text-[#171A26]",
          "file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[#4F5077]",
          "focus-visible:border-[#E1BB33] focus-visible:bg-white focus-visible:ring-[3px] focus-visible:ring-[#E1BB33]/35",
          "disabled:cursor-not-allowed disabled:bg-[#F1F5F9] disabled:opacity-100 disabled:text-[#6B7A99]",
          "aria-invalid:border-red-500 aria-invalid:bg-red-50 aria-invalid:ring-red-500/20",
          className
        )}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
