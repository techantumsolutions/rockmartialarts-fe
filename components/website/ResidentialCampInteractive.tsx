"use client"

import { useState } from "react"
import type { ResidentialCampContent } from "@/lib/residentialCamp"
import { ResidentialCampView } from "@/components/website/ResidentialCampView"
import { ResidentialCampRegistrationModal } from "@/components/website/ResidentialCampRegistrationModal"

export function ResidentialCampInteractive({ content }: { content: ResidentialCampContent }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <ResidentialCampView content={content} onRegister={() => setOpen(true)} />
      <ResidentialCampRegistrationModal open={open} onClose={() => setOpen(false)} content={content} />
    </>
  )
}
