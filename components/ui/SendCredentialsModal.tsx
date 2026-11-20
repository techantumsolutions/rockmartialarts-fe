"use client"

import { Loader2, Mail, Send } from "lucide-react"
import { AppModal } from "@/components/ui/AppModal"
import { Button } from "@/components/ui/button"

type Props = {
  open: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  name: string
  email: string
  roleLabel?: string
  sending?: boolean
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

/**
 * Send Login Credentials popup — attached redesign, RMAA gold standard colors.
 */
export function SendCredentialsModal({
  open,
  onClose,
  onConfirm,
  name,
  email,
  roleLabel = "Academy Manager",
  sending = false,
}: Props) {
  return (
    <AppModal
      open={open}
      onClose={onClose}
      closeDisabled={sending}
      size="sm"
      centered
      title="Send Login Credentials"
      header={
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-[#FFF7E0] via-[#FEF3C7] to-[#FDE68A] shadow-[0_10px_28px_rgba(225,187,51,0.28)]">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E1BB33] text-[#171A26] shadow-md">
            <Mail className="h-7 w-7" strokeWidth={2} />
            <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-md border border-[#E1BB33]/40 bg-white text-[10px] font-bold tracking-widest text-[#4F5077]">
              ***
            </span>
          </div>
        </div>
      }
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={sending}
            className="w-full border-[#D1D5DB] text-[#4F5077] sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void onConfirm()}
            disabled={sending || !email}
            className="w-full bg-[#E1BB33] text-[#171A26] hover:bg-[#d4a82a] sm:w-auto"
          >
            {sending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Credentials
              </>
            )}
          </Button>
        </div>
      }
    >
      <p className="mb-4 text-center text-sm leading-relaxed text-[#6B7280]">
        Send login credentials to the selected {roleLabel.toLowerCase()}.
      </p>

      <div className="mb-4 flex items-center gap-3 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-3.5 py-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#E1BB33] text-sm font-bold text-[#171A26]">
          {initials(name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-[#2F3153]">{name || "—"}</p>
          <p className="text-xs text-[#6B7280]">{roleLabel}</p>
          <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-[#4F5077]">
            <Mail className="h-3.5 w-3.5 shrink-0 text-[#E1BB33]" />
            <span className="truncate">{email || "No email on file"}</span>
          </p>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-[#FDE68A]/80 bg-[#FFFBEB] px-3 py-2.5 text-left">
        <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E1BB33] text-[11px] font-bold text-[#171A26]">
          i
        </span>
        <p className="text-xs leading-relaxed text-[#78716C]">
          A secure email with login credentials and access instructions will be sent to
          the above email address.
        </p>
      </div>
    </AppModal>
  )
}
