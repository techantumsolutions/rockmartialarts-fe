"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ImageIcon, Loader2, Save, Trash2, Upload } from "lucide-react"
import {
  partnerOrgAPI,
  type PartnerOrgSiteAchievement,
  type PartnerOrgSiteBranch,
} from "@/lib/partnerOrgAPI"
import { uploadFile } from "@/lib/upload"
import { resolvePublicAssetUrl } from "@/lib/resolvePublicAssetUrl"
import { TokenManager } from "@/lib/tokenManager"
import { useDashboardBasePath, useDashboardRole } from "@/lib/useDashboardBasePath"
import { useToast } from "@/hooks/use-toast"
import { PartnerOrgSiteSections } from "@/components/partner-org/PartnerOrgSiteSections"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import Link from "next/link"

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

export default function PartnerOrgBrandingPage() {
  const router = useRouter()
  const role = useDashboardRole()
  const basePath = useDashboardBasePath()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<"logo" | "banner" | null>(null)
  const [hasBranding, setHasBranding] = useState(false)
  const [orgName, setOrgName] = useState("")
  const [orgSlug, setOrgSlug] = useState("")
  const [branches, setBranches] = useState<PartnerOrgSiteBranch[]>([])
  const [achievements, setAchievements] = useState<PartnerOrgSiteAchievement[]>([])

  const [logoUrl, setLogoUrl] = useState("")
  const [logoAlt, setLogoAlt] = useState("")
  const [bannerUrl, setBannerUrl] = useState("")
  const [bannerAlt, setBannerAlt] = useState("")

  const [tagline, setTagline] = useState("")
  const [shortDescription, setShortDescription] = useState("")
  const [aboutContent, setAboutContent] = useState("")
  const [vision, setVision] = useState("")
  const [mission, setMission] = useState("")
  const [ourStory, setOurStory] = useState("")
  const [whyChooseUs, setWhyChooseUs] = useState("")
  const [whyPointsText, setWhyPointsText] = useState("")

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

  const loadBranding = useCallback(async () => {
    const token = TokenManager.getToken()
    if (!token) {
      router.push("/login")
      return
    }
    try {
      setLoading(true)
      const data = await partnerOrgAPI.getMyBranding()
      setHasBranding(!!data.has_branding)
      setOrgName(str(data.org_snapshot?.name))
      setOrgSlug(str(data.org_snapshot?.slug))
      setBranches(Array.isArray(data.branches) ? data.branches : [])
      setAchievements(Array.isArray(data.achievements) ? data.achievements : [])
      const media = data.media || {}
      setLogoUrl(str(media.logo_url))
      setLogoAlt(str(media.logo_alt))
      setBannerUrl(str(media.cover_banner_url))
      setBannerAlt(str(media.cover_banner_alt))
      const content = data.content || {}
      setTagline(str(content.tagline))
      setShortDescription(str(content.short_description))
      setAboutContent(str(content.about_content))
      setVision(str(content.vision))
      setMission(str(content.mission))
      setOurStory(str(content.our_story))
      setWhyChooseUs(str(content.why_choose_us))
      setWhyPointsText(listToLines(content.why_choose_us_points))
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
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not load branding"
      toast({ title: "Error", description: msg, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [router, toast])

  useEffect(() => {
    if (role !== "partner_super_admin") {
      router.replace("/super-admin/dashboard")
      return
    }
    loadBranding()
  }, [role, router, loadBranding])

  async function handleUpload(kind: "logo" | "banner", file: File | undefined) {
    if (!file) return
    try {
      setUploading(kind)
      const result = await uploadFile(file)
      if (kind === "logo") setLogoUrl(result.file_url)
      else setBannerUrl(result.file_url)
      toast({
        title: "Uploaded",
        description: `${kind === "logo" ? "Logo" : "Banner"} uploaded.`,
      })
    } catch (e: unknown) {
      toast({
        title: "Upload failed",
        description: e instanceof Error ? e.message : "Could not upload image",
        variant: "destructive",
      })
    } finally {
      setUploading(null)
    }
  }

  async function handleSave() {
    try {
      setSaving(true)
      const data = await partnerOrgAPI.upsertMyBranding({
        media: {
          logo_url: logoUrl || null,
          logo_alt: logoAlt || null,
          cover_banner_url: bannerUrl || null,
          cover_banner_alt: bannerAlt || null,
        },
        content: {
          tagline: tagline || null,
          short_description: shortDescription || null,
          about_content: aboutContent || null,
          vision: vision || null,
          mission: mission || null,
          our_story: ourStory || null,
          why_choose_us: whyChooseUs || null,
          why_choose_us_points: linesToList(whyPointsText),
        },
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
      })
      setHasBranding(true)
      toast({
        title: "Saved",
        description: data.message || "Your organization branding was saved.",
      })
    } catch (e: unknown) {
      toast({
        title: "Save failed",
        description: e instanceof Error ? e.message : "Could not save branding",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (role !== "partner_super_admin") {
    return null
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
              Organization Branding
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Logo, banner, story, and contact content for your public landing page
              {orgName ? (
                <>
                  {" "}
                  — <span className="font-medium text-gray-700">{orgName}</span>
                </>
              ) : null}
              {hasBranding ? "" : " (first save publishes branding)"}
              {orgSlug ? (
                <>
                  . Public URL:{" "}
                  <a
                    className="text-amber-800 underline"
                    href={`/partner-orgs/${encodeURIComponent(orgSlug)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    /partner-orgs/{orgSlug}
                  </a>
                </>
              ) : null}
            </p>
          </div>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving || loading}
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

      {loading ? (
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
                <Label>Logo</Label>
                {logoUrl ? (
                  <div className="relative rounded-md border bg-gray-50 p-3 flex items-center justify-center min-h-[120px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={resolvePublicAssetUrl(logoUrl)}
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
                  {logoUrl ? (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setLogoUrl("")}>
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Clear
                    </Button>
                  ) : null}
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
                      src={resolvePublicAssetUrl(bannerUrl)}
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
                  {bannerUrl ? (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setBannerUrl("")}>
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Clear
                    </Button>
                  ) : null}
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
                <Label>Tagline</Label>
                <Input
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="Short hero tagline"
                />
              </div>
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
                <Label>About</Label>
                <Textarea
                  rows={4}
                  value={aboutContent}
                  onChange={(e) => setAboutContent(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Facilities & location</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Facilities (one per line)</Label>
                <Textarea
                  rows={4}
                  value={facilitiesText}
                  onChange={(e) => setFacilitiesText(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Location highlights (one per line)</Label>
                <Textarea
                  rows={4}
                  value={highlightsText}
                  onChange={(e) => setHighlightsText(e.target.value)}
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
                    onChange={(e) => setSocial({ ...social, [key]: e.target.value })}
                    placeholder="https://"
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Vision, mission, story & why choose us</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Vision</Label>
                <Textarea rows={2} value={vision} onChange={(e) => setVision(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Mission</Label>
                <Textarea rows={2} value={mission} onChange={(e) => setMission(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Our story</Label>
                <Textarea rows={4} value={ourStory} onChange={(e) => setOurStory(e.target.value)} />
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

          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-base">
                    Branches, courses & student achievements
                  </CardTitle>
                  <p className="text-sm text-gray-500 mt-1">
                    Same sections as your public landing — only your organization&apos;s data.
                    Manage branches/courses from the dashboard; feature achievements below.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`${basePath}/branches`}>Manage branches</Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`${basePath}/achievements-showcase`}>
                      Feature achievements
                    </Link>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <PartnerOrgSiteSections
                variant="admin"
                branches={branches as never}
                achievements={achievements}
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
