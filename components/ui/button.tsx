"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Shared Button — Skillora Alpha standard for website + all role dashboards.
 * Primary = brand gold; sizes align with Input (h-11 default).
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#E1BB33]/35 focus-visible:border-[#E1BB33] disabled:opacity-50 disabled:pointer-events-none cursor-pointer [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-xs hover:bg-[#d4ae2a] active:bg-[#c9a328]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90",
        outline:
          "border border-[#E2E8F0] bg-white text-[#171A26] shadow-xs hover:bg-[#F8FAFC] active:bg-[#F1F5F9]",
        secondary:
          "bg-[#F8FAFC] text-[#171A26] border border-[#E2E8F0] hover:bg-[#F1F5F9]",
        ghost: "text-[#171A26] hover:bg-[#F8FAFC] hover:text-[#171A26]",
        link: "text-[#4F5077] underline-offset-4 hover:underline font-medium",
      },
      size: {
        default: "h-11 px-4 py-2",
        sm: "h-9 px-3 text-[13px]",
        lg: "h-12 px-6 text-[15px]",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  /** When true, disables the button and shows a spinner until the action finishes. */
  loading?: boolean
  loadingText?: React.ReactNode
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      loadingText,
      disabled,
      children,
      onClick,
      ...props
    },
    forwardedRef
  ) => {
    const Comp = asChild ? Slot : "button"
    const isDisabled = Boolean(disabled) || Boolean(loading)
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(event)
    }
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={forwardedRef}
        disabled={asChild ? undefined : isDisabled}
        aria-busy={loading || undefined}
        aria-disabled={asChild ? isDisabled : undefined}
        data-slot="button"
        data-variant={variant || "default"}
        {...props}
        onClick={handleClick}
      >
        {loading && !asChild ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            {loadingText ?? children}
          </>
        ) : (
          children
        )}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
