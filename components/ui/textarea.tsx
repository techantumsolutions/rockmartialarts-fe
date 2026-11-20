import * as React from "react"

import { cn } from "@/lib/utils"

/** Global textarea — same chrome as Input across all admin/app forms. */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-[6.5rem] w-full rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-3.5 text-[15px] text-[#2F3153] shadow-none transition-[color,box-shadow,background-color,border-color] outline-none",
        "placeholder:text-[#94A3B8]",
        "focus-visible:border-[#E1BB33] focus-visible:bg-white focus-visible:ring-[3px] focus-visible:ring-[#E1BB33]/35",
        "disabled:cursor-not-allowed disabled:bg-[#F1F5F9] disabled:opacity-100 disabled:text-[#6B7A99]",
        "aria-invalid:border-red-500 aria-invalid:bg-red-50 aria-invalid:ring-red-500/20",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
