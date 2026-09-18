"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ImageIcon, Loader2, Save, Trash2, Upload } from "lucide-react"
import { getBackendApiUrl } from "@/lib/config"
import { TokenManager } from "@/lib/tokenManager"
import { uploadFile } from "@/lib/upload"
import { useDashboardBasePath } from "@/lib/useDashboardBasePath"
import { useToast } from "@/hooks/use-toast"
import { PartnerCmsScopeBanner } from "@/components/partner/PartnerCmsScopeBanner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type PartnerBranchRow = {
  branch_id: string
  branch_name?: string
  branch_code?: string
  has_branding?: boolean
}

type DayHours = {
  day: string
  open_time: string
  close_time: string
  is_closed: boolean
}

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const

const DAY_LABEL: Record<string, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
}

function defaultHours(): DayHours[] {
  return DAYS.map((day) => ({
    day,
    open_time: "06:00",
    close_time: "21:00",
    is_closed: false,
  }))
}

function str(v: unknown): string {
  return v == null ? "" : String(v)
}

function linesToList(text: string): string[] {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
}

function listToLines(list: unknown): string {
  if (!Array.isArray(list)) return ""
  return list.map((x) => String(x)).join("\n")
}

function resolveMediaUrl(path: string): string {
  if (!path) return ""
  if (path.startsWith("http://") || path.startsWith("https://")) return path
  return path.startsWith("/") ? path : `/${path}`
}

export default function PartnerBrandingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const basePath = useDashboardBasePath()
  const { toast } = useToast()

  const [partners, setPartners] = useState<PartnerBranchRow[]>([])
  const [branchId, setBranchId] = useState("")
  const [branchName, setBranchName] = useState("")
  const [hasBranding, setHasBranding] = useState(false)
  const [loadingList, setLoadingList] = useState(true)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<"logo" | "banner" | null>(null)

  const [logoUrl, setLogoUrl] = useState("")
  const [logoAlt, setLogoAlt] = useState("")
  const [bannerUrl, setBannerUrl] = useState("")
  const [bannerAlt, setBannerAlt] = useState("")

  const [shortDescription, setShortDescription] = useState("")
  const [aboutContent, setAboutContent] = useState("")
  const [vision, setVision] = useState("")
  const [mission, setMission] = useState("")
  const [ourStory, setOurStory] = useState("")
  const [whyChooseUs, setWhyChooseUs] = useState("")
  const [whyPointsText, setWhyPointsText] = useState("")

  const [hours, setHours] = useState<DayHours[]>(defaultHours)
  const [hoursNotes, setHoursNotes] = useState("")

  const [facilitiesText, setFacilitiesText] = useState("")
  const [parkingInfo, setParkingInfo] = useState("")
  const [highlightsText, setHighlightsText] = useState("")
  const [mapEmbedUrl, setMapEmbedUrl] = useState("")

  const [social, setSocial] = useState({
    website: "",
    facebook: "",
    instagram: "",
    youtube: "",
    linkedin: "",
    twitter: "",
    whatsapp: "",
  })

  function authHeaders(): HeadersInit {
    const token = TokenManager.getToken()
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }
  }

  const loadPartners = useCallback(async () => {
    const token = TokenManager.getToken()
    if (!token) {
      router.push("/login")
      return
    }
    try {
      setLoadingList(true)
      const res = await fetch(
        getBackendApiUrl("collaboration-partners/partner-branches?limit=200"),
        { headers: authHeaders() }
      )
      if (!res.ok) throw new Error("Failed to load partner branches")
      const data = await res.json()
      setPartners(data.partners || [])
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message || "Could not load partners",
        variant: "destructive",
      })
    } finally {
      setLoadingList(false)
    }
  }, [router, toast])

  const loadBranding = useCallback(
    async (id: string) => {
      if (!id) return
      try {
        setLoading(true)
        const res = await fetch(
          getBackendApiUrl(`collaboration-partners/branches/${id}/branding`),
          { headers: authHeaders() }
        )
        if (res.status === 403) {
          toast({
            title: "Not a collaboration partner",
            description: "Enable Is Collaboration Partner on the branch first.",
            variant: "destructive",
          })
          setBranchId("")
          return
        }
        if (!res.ok) throw new Error("Failed to load branding")
        const data = await res.json()
        setHasBranding(!!data.has_branding)
        setBranchName(data.branch_snapshot?.name || "")
        const media = data.media || {}
        setLogoUrl(str(media.logo_url))
        setLogoAlt(str(media.logo_alt))
        setBannerUrl(str(media.cover_banner_url))
        setBannerAlt(str(media.cover_banner_alt))
        const content = data.content || {}
        setShortDescription(str(content.short_description))
        setAboutContent(str(content.about_content))
        setVision(str(content.vision))
        setMission(str(content.mission))
        setOurStory(str(content.our_story))
        setWhyChooseUs(str(content.why_choose_us))
        setWhyPointsText(listToLines(content.why_choose_us_points))
        const oh = Array.isArray(data.operating_hours) ? data.operating_hours : []
        const merged = defaultHours().map((d) => {
          const found = oh.find((x: any) => String(x.day).toLowerCase() === d.day)
          if (!found) return d
          return {
            day: d.day,
            open_time: str(found.open_time) || d.open_time,
            close_time: str(found.close_time) || d.close_time,
            is_closed: !!found.is_closed,
          }
        })
        setHours(merged)
        setHoursNotes(str(data.hours_notes))
        const fac = data.facilities || {}
        setFacilitiesText(listToLines(fac.facilities))
        setParkingInfo(str(fac.parking_info))
        setHighlightsText(listToLines(fac.location_highlights))
        setMapEmbedUrl(str(fac.map_embed_url))
        const s = data.social_links || {}
        setSocial({
          website: str(s.website),
          facebook: str(s.facebook),
          instagram: str(s.instagram),
          youtube: str(s.youtube),
          linkedin: str(s.linkedin),
          twitter: str(s.twitter),
          whatsapp: str(s.whatsapp),
        })
      } catch (e: any) {
        toast({
          title: "Error",
          description: e?.message || "Could not load branding",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    },
    [toast]
  )

  useEffect(() => {
    loadPartners()
  }, [loadPartners])

  useEffect(() => {
    const fromQuery = searchParams?.get("branchId") || ""
    if (fromQuery && !branchId) setBranchId(fromQuery)
  }, [searchParams, branchId])

  useEffect(() => {
    if (branchId) loadBranding(branchId)
  }, [branchId, loadBranding])

  async function handleUpload(kind: "logo" | "banner", file: File | undefined) {
    if (!file) return
    try {
      setUploading(kind)
      const result = await uploadFile(file)
      if (kind === "logo") setLogoUrl(result.file_url)
      else setBannerUrl(result.file_url)
      toast({ title: "Uploaded", description: `${kind === "logo" ? "Logo" : "Banner"} uploaded.` })
    } catch (e: any) {
      toast({
        title: "Upload failed",
        description: e?.message || "Could not upload image",
        variant: "destructive",
      })
    } finally {
      setUploading(null)
    }
  }

  async function handleSave() {
    if (!branchId) {
      toast({
        title: "Select a partner branch",
        description: "Choose a collaboration partner branch first.",
        variant: "destructive",
      })
      return
    }
    try {
      setSaving(true)
      const body = {
        media: {
          logo_url: logoUrl || null,
          logo_alt: logoAlt || null,
          cover_banner_url: bannerUrl || null,
          cover_banner_alt: bannerAlt || null,
        },
        content: {
          short_description: shortDescription || null,
          about_content: aboutContent || null,
          vision: vision || null,
          mission: mission || null,
          our_story: ourStory || null,
          why_choose_us: whyChooseUs || null,
          why_choose_us_points: linesToList(whyPointsText),
        },
        operating_hours: hours.map((h) => ({
          day: h.day,
          open_time: h.is_closed ? null : h.open_time || null,
          close_time: h.is_closed ? null : h.close_time || null,
          is_closed: h.is_closed,
        })),
        hours_notes: hoursNotes || null,
        facilities: {
          facilities: linesToList(facilitiesText),
          parking_info: parkingInfo || null,
          location_highlights: linesToList(highlightsText),
          map_embed_url: mapEmbedUrl || null,
        },
        social_links: {
          website: social.website || null,
          facebook: social.facebook || null,
          instagram: social.instagram || null,
          youtube: social.youtube || null,
          linkedin: social.linkedin || null,
          twitter: social.twitter || null,
          whatsapp: social.whatsapp || null,
        },
      }
      const res = await fetch(
        getBackendApiUrl(`collaboration-partners/branches/${branchId}/branding`),
        {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify(body),
        }
      )
      if (res.status === 403) {
        toast({
          title: "Partner features disabled",
          description: "This branch is not marked as a collaboration partner.",
          variant: "destructive",
        })
        return
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || "Save failed")
      }
      const data = await res.json()
      setHasBranding(true)
      toast({
        title: "Saved",
        description: data.message || "Partner branding saved for this branch only.",
      })
      await loadPartners()
    } catch (e: any) {
      toast({
        title: "Save failed",
        description: e?.message || "Could not save branding",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  function updateHour(day: string, patch: Partial<DayHours>) {
    setHours((prev) => prev.map((h) => (h.day === day ? { ...h, ...patch } : h)))
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-1 rounded-md bg-amber-50 border border-amber-200 p-2">
            <ImageIcon className="w-5 h-5 text-amber-800" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[#1a2332]">
              Partner Branding & Content
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Logo, banner, hours, facilities, socials, and story — applies only to the
              selected collaboration partner branch.
            </p>
          </div>
        </div>
        <Button
          onClick={handleSave}
          disabled={!branchId || saving || loading}
          className="bg-[#FFC403] text-[#1a2332] hover:bg-[#e6b003]"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save branding
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Partner branch</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loadingList ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading partner branches…
            </div>
          ) : partners.length === 0 ? (
            <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-600">
              No collaboration partner branches yet. Set{" "}
              <span className="font-medium">Is Collaboration Partner</span> to Yes on a
              branch first.
              <div className="mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`${basePath}/branches`)}
                >
                  Go to Branches
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 max-w-md">
              <Label>Select partner branch</Label>
              <Select value={branchId || undefined} onValueChange={setBranchId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a partner branch" />
                </SelectTrigger>
                <SelectContent>
                  {partners.map((p) => (
                    <SelectItem key={p.branch_id} value={p.branch_id}>
                      {p.branch_name || "Branch"}
                      {p.branch_code ? ` (${p.branch_code})` : ""}
                      {p.has_branding ? "" : " — branding pending"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {branchId && branchName && (
                <p className="text-xs text-gray-500">
                  Editing branding for <span className="font-medium">{branchName}</span>
                  {hasBranding ? "" : " (new — first save creates branding for this branch only)"}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {branchId &&
        (loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-gray-500">
            <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading branding…
          </div>
        ) : (
          <>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Logo & cover banner</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label>Partner logo</Label>
                  {logoUrl ? (
                    <div className="relative rounded-md border bg-gray-50 p-3 flex items-center justify-center min-h-[120px]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={resolveMediaUrl(logoUrl)}
                        alt={logoAlt || "Logo"}
                        className="max-h-24 object-contain"
                      />
                    </div>
                  ) : (
                    <div className="rounded-md border border-dashed bg-gray-50 p-6 text-center text-xs text-gray-500">
                      No logo uploaded
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <label className="inline-flex">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleUpload("logo", e.target.files?.[0])}
                      />
                      <Button type="button" variant="outline" size="sm" asChild disabled={!!uploading}>
                        <span>
                          {uploading === "logo" ? (
                            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          ) : (
                            <Upload className="w-3.5 h-3.5 mr-1.5" />
                          )}
                          Upload logo
                        </span>
                      </Button>
                    </label>
                    {logoUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setLogoUrl("")}
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Clear
                      </Button>
                    )}
                  </div>
                  <Input
                    placeholder="Logo alt text"
                    value={logoAlt}
                    onChange={(e) => setLogoAlt(e.target.value)}
                  />
                </div>

                <div className="space-y-3">
                  <Label>Cover banner</Label>
                  {bannerUrl ? (
                    <div className="relative rounded-md border bg-gray-50 overflow-hidden min-h-[120px]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={resolveMediaUrl(bannerUrl)}
                        alt={bannerAlt || "Banner"}
                        className="w-full h-32 object-cover"
                      />
                    </div>
                  ) : (
                    <div className="rounded-md border border-dashed bg-gray-50 p-6 text-center text-xs text-gray-500 min-h-[120px] flex items-center justify-center">
                      No banner uploaded — wide image recommended
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <label className="inline-flex">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleUpload("banner", e.target.files?.[0])}
                      />
                      <Button type="button" variant="outline" size="sm" asChild disabled={!!uploading}>
                        <span>
                          {uploading === "banner" ? (
                            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          ) : (
                            <Upload className="w-3.5 h-3.5 mr-1.5" />
                          )}
                          Upload banner
                        </span>
                      </Button>
                    </label>
                    {bannerUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setBannerUrl("")}
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Clear
                      </Button>
                    )}
                  </div>
                  <Input
                    placeholder="Banner alt text"
                    value={bannerAlt}
                    onChange={(e) => setBannerAlt(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Description & content</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Short description</Label>
                  <Textarea
                    rows={2}
                    value={shortDescription}
                    onChange={(e) => setShortDescription(e.target.value)}
                    placeholder="One or two sentences for listings"
                  />
                </div>
                <div className="space-y-2">
                  <Label>About / branch content</Label>
                  <Textarea
                    rows={4}
                    value={aboutContent}
                    onChange={(e) => setAboutContent(e.target.value)}
                    placeholder="Longer about text for this partner branch"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Operating hours</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  {hours.map((h) => (
                    <div
                      key={h.day}
                      className="grid grid-cols-1 sm:grid-cols-[120px_1fr_1fr_auto] gap-2 items-center"
                    >
                      <span className="text-sm font-medium text-gray-700">
                        {DAY_LABEL[h.day] || h.day}
                      </span>
                      <Input
                        type="time"
                        disabled={h.is_closed}
                        value={h.open_time}
                        onChange={(e) => updateHour(h.day, { open_time: e.target.value })}
                      />
                      <Input
                        type="time"
                        disabled={h.is_closed}
                        value={h.close_time}
                        onChange={(e) => updateHour(h.day, { close_time: e.target.value })}
                      />
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={h.is_closed}
                          onCheckedChange={(checked) =>
                            updateHour(h.day, { is_closed: !!checked })
                          }
                        />
                        <span className="text-xs text-gray-500">Closed</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <Label>Hours notes</Label>
                  <Input
                    value={hoursNotes}
                    onChange={(e) => setHoursNotes(e.target.value)}
                    placeholder="e.g. Closed on public holidays"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Facilities, parking & location
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-1">
                  <Label>Facilities (one per line)</Label>
                  <Textarea
                    rows={4}
                    value={facilitiesText}
                    onChange={(e) => setFacilitiesText(e.target.value)}
                    placeholder={"Changing rooms\nLockers\nAir conditioning"}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Location highlights (one per line)</Label>
                  <Textarea
                    rows={4}
                    value={highlightsText}
                    onChange={(e) => setHighlightsText(e.target.value)}
                    placeholder={"Near metro\nLandmark mall"}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Parking info</Label>
                  <Textarea
                    rows={2}
                    value={parkingInfo}
                    onChange={(e) => setParkingInfo(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Map embed / link URL</Label>
                  <Input
                    value={mapEmbedUrl}
                    onChange={(e) => setMapEmbedUrl(e.target.value)}
                    placeholder="https://maps.google.com/..."
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Social links</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(
                  [
                    ["website", "Website"],
                    ["facebook", "Facebook"],
                    ["instagram", "Instagram"],
                    ["youtube", "YouTube"],
                    ["linkedin", "LinkedIn"],
                    ["twitter", "Twitter / X"],
                    ["whatsapp", "WhatsApp"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="space-y-2">
                    <Label>{label}</Label>
                    <Input
                      value={social[key]}
                      onChange={(e) =>
                        setSocial({ ...social, [key]: e.target.value })
                      }
                      placeholder="https://"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Vision, mission, story & why choose us
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Vision</Label>
                  <Textarea rows={2} value={vision} onChange={(e) => setVision(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Mission</Label>
                  <Textarea
                    rows={2}
                    value={mission}
                    onChange={(e) => setMission(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Our story</Label>
                  <Textarea
                    rows={4}
                    value={ourStory}
                    onChange={(e) => setOurStory(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Why choose us (summary)</Label>
                  <Textarea
                    rows={2}
                    value={whyChooseUs}
                    onChange={(e) => setWhyChooseUs(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Why choose us points (one per line)</Label>
                  <Textarea
                    rows={4}
                    value={whyPointsText}
                    onChange={(e) => setWhyPointsText(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          </>
        ))}
    </div>
  )
}
