import { redirect } from "next/navigation"

/**
 * Collaboration partner directory is not a public website surface.
 * Partner / collaboration branches appear with other branches on /branches.
 */
export default function PartnersDirectoryPage() {
  redirect("/branches")
}
