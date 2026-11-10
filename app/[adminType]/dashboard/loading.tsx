import MartialArtsRouteLoader from "@/components/ui/MartialArtsRouteLoader"

/** Compact loader — never a full-screen freeze during soft navigations */
export default function Loading() {
  return (
    <MartialArtsRouteLoader
      variant="compact"
      title="Loading…"
      description="Opening page"
      className="min-h-[50vh] bg-transparent"
    />
  )
}
