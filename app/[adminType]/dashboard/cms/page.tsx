"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Save, Globe, FileText, Image, Home, Search, MapPin } from "lucide-react"
import { TokenManager } from "@/lib/tokenManager"
import { getBackendApiUrl } from "@/lib/config"
import { normalizePopupFormForCms, type PopupFormSettings } from "@/lib/popupForm"
import { ResidentialCampCmsFields } from "@/components/cms/ResidentialCampCmsFields"
import {
  DEFAULT_RESIDENTIAL_CAMP,
  campEventPayload,
  mergeResidentialCamp,
  type ResidentialCampContent,
} from "@/lib/residentialCamp"

interface SEOSettings {
  meta_title?: string
  meta_description?: string
  meta_keywords?: string
  og_image?: string
}

interface HomepageSection {
  hero_title?: string
  hero_subtitle?: string
  hero_description?: string
  hero_image?: string
  hero_video?: string
  hero_primary_cta_text?: string
  hero_primary_cta_link?: string
  hero_secondary_cta_text?: string
  hero_secondary_cta_link?: string
  about_title?: string
  about_subtitle?: string
  courses_title?: string
  courses_subtitle?: string
  testimonials_title?: string
  testimonials_subtitle?: string
  cta_title?: string
  cta_subtitle?: string
  bottom_cta_title?: string
  bottom_cta_subtitle?: string
  registration_media_url?: string
  registration_media_type?: string
  popup_form?: PopupFormSettings
}

interface FooterContent {
  footer_text?: string
  copyright_text?: string
  address?: string
  phone?: string
  email?: string
  whatsapp_number?: string
  social_facebook?: string
  social_instagram?: string
  social_twitter?: string
  social_youtube?: string
}

interface BrandingSettings {
  navbar_logo?: string
  footer_logo?: string
  favicon?: string
  site_loader_image?: string
}

const SEO_PAGES = [
  { key: "home", label: "Home Page" },
  { key: "about", label: "About Page" },
  { key: "courses", label: "Courses Page" },
  { key: "contact", label: "Contact Page" },
  { key: "gallery", label: "Gallery Page" },
  { key: "blog", label: "Blog Page" },
]

export default function CMSPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("homepage")

  const [homepage, setHomepage] = useState<HomepageSection>({})
  const [footer, setFooter] = useState<FooterContent>({})
  const [branding, setBranding] = useState<BrandingSettings>({})
  const [pageSeo, setPageSeo] = useState<Record<string, SEOSettings>>({})
  const [homepageAbout, setHomepageAbout] = useState({
    title: "",
    subtitle: "",
    content: "",
    image: "",
  })
  const [savingAbout, setSavingAbout] = useState(false)
  const [residentialCamp, setResidentialCamp] = useState<ResidentialCampContent>(DEFAULT_RESIDENTIAL_CAMP)
  const [startingNewEvent, setStartingNewEvent] = useState(false)

  useEffect(() => {
    fetchCMSContent()
  }, [])

  useEffect(() => {
    if (activeTab !== "residential-camp" || loading) return
    const token = TokenManager.getToken()
    ;(async () => {
      try {
        const campRes = await fetch(getBackendApiUrl("cms/residential-camp"), {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          cache: "no-store",
        })
        let campJson = campRes.ok ? await campRes.json().catch(() => null) : null
        if (!campJson) {
          const pubRes = await fetch(getBackendApiUrl("cms/public/residential-camp"), { cache: "no-store" })
          campJson = pubRes.ok ? await pubRes.json().catch(() => null) : null
        }
        if (campJson) setResidentialCamp(mergeResidentialCamp(campJson))
      } catch {
        /* keep current form values */
      }
    })()
  }, [activeTab, loading])

  const fetchCMSContent = async () => {
    try {
      setLoading(true)
      const token = TokenManager.getToken()
      const [cmsRes, aboutRes, popupRes, campRes] = await Promise.all([
        fetch(getBackendApiUrl("cms"), {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        }),
        fetch(getBackendApiUrl("homepage/public")),
        fetch("/api/cms/popup-form", { cache: "no-store" }),
        fetch(getBackendApiUrl("cms/residential-camp"), {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        }),
      ])
      if (!cmsRes.ok) throw new Error("Failed to fetch CMS content")
      const data = await cmsRes.json()
      const hp = (data.homepage || {}) as HomepageSection
      const popupJson = popupRes.ok ? await popupRes.json().catch(() => ({})) : {}
      setHomepage({
        ...hp,
        popup_form: normalizePopupFormForCms(popupJson.popup_form ?? hp.popup_form),
      })
      setFooter(data.footer || {})
      setBranding(data.branding || {})
      setPageSeo(data.page_seo || {})
      if (aboutRes.ok) {
        const aj = await aboutRes.json().catch(() => ({}))
        const a = aj.about || {}
        setHomepageAbout({
          title: a.title ?? "",
          subtitle: a.subtitle ?? "",
          content: a.content ?? "",
          image: a.image ?? "",
        })
      }
      if (campRes.ok) {
        const campJson = await campRes.json().catch(() => null)
        if (campJson) setResidentialCamp(mergeResidentialCamp(campJson))
      } else {
        const pubRes = await fetch(getBackendApiUrl("cms/public/residential-camp"), { cache: "no-store" })
        if (pubRes.ok) {
          const campJson = await pubRes.json().catch(() => null)
          if (campJson) setResidentialCamp(mergeResidentialCamp(campJson))
        }
      }
    } catch (error) {
      console.error("Error fetching CMS content:", error)
      toast({ title: "Error", description: "Failed to load CMS content", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveHomepageAbout = async () => {
    try {
      setSavingAbout(true)
      const token = TokenManager.getToken()
      if (!token) throw new Error("Not authenticated")
      const res = await fetch(getBackendApiUrl("homepage/about"), {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          title: homepageAbout.title,
          subtitle: homepageAbout.subtitle,
          content: homepageAbout.content,
          image: homepageAbout.image,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || err.message || "Save failed")
      }
      toast({ title: "Saved", description: "Homepage about section updated" })
    } catch (error) {
      console.error(error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Could not save about section",
        variant: "destructive",
      })
    } finally {
      setSavingAbout(false)
    }
  }

  const handleAboutImageUpload = async (file: File) => {
    try {
      const token = TokenManager.getToken()
      const formData = new FormData()
      formData.append("file", file)
      const uploadRes = await fetch(getBackendApiUrl("uploads"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      if (!uploadRes.ok) throw new Error("Upload failed")
      const uploadData = await uploadRes.json()
      const url = uploadData.url || uploadData.file_url || uploadData.image_url || ""
      setHomepageAbout((prev) => ({ ...prev, image: url }))
      toast({ title: "Uploaded", description: "About image uploaded" })
    } catch {
      toast({ title: "Error", description: "Upload failed", variant: "destructive" })
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const token = TokenManager.getToken()
      const popupForSave = normalizePopupFormForCms(homepage.popup_form)
      const homepageForSave = { ...homepage } as Record<string, unknown>
      delete homepageForSave.testimonials
      // FastAPI HomepageSection has no popup_form — sending it is stripped (or can 422).
      delete homepageForSave.popup_form
      const {
        id: _campId,
        created_at: _createdAt,
        updated_at: _updatedAt,
        ...campPayload
      } = residentialCamp as ResidentialCampContent & {
        id?: string
        created_at?: unknown
        updated_at?: unknown
      }
      const [res, popupRes, campRes] = await Promise.all([
        fetch(getBackendApiUrl("cms"), {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            homepage: homepageForSave as HomepageSection,
            footer,
            branding,
            page_seo: pageSeo,
          }),
        }),
        fetch("/api/cms/popup-form", {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ popup_form: popupForSave }),
        }),
        fetch(getBackendApiUrl("cms/residential-camp"), {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(campPayload),
        }),
      ])
      if (!res.ok) throw new Error("Failed to save CMS content")
      if (!popupRes.ok) throw new Error("Failed to save popup form settings")
      if (!campRes.ok) throw new Error("Failed to save residential camp page")
      const data = await res.json()
      const savedHp = (data.homepage || {}) as HomepageSection
      const popupJson = await popupRes.json().catch(() => ({}))
      setHomepage({
        ...savedHp,
        popup_form: normalizePopupFormForCms(popupJson.popup_form ?? popupForSave),
      })
      setFooter(data.footer || {})
      setBranding(data.branding || {})
      setPageSeo(data.page_seo || {})
      const campJson = await campRes.json().catch(() => null)
      if (campJson) setResidentialCamp(mergeResidentialCamp(campJson))
      toast({ title: "Success", description: "CMS content saved successfully" })
    } catch (error) {
      console.error("Error saving CMS content:", error)
      toast({ title: "Error", description: "Failed to save CMS content", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const updatePageSeo = (pageKey: string, field: keyof SEOSettings, value: string) => {
    setPageSeo((prev) => ({
      ...prev,
      [pageKey]: { ...(prev[pageKey] || {}), [field]: value },
    }))
  }

  const popupForm = normalizePopupFormForCms(homepage.popup_form)
  const patchPopupForm = (patch: Partial<PopupFormSettings>) => {
    setHomepage({
      ...homepage,
      popup_form: { ...normalizePopupFormForCms(homepage.popup_form), ...patch },
    })
  }


  const handleHeroMediaUpload = async (field: "hero_image" | "hero_video", file: File) => {
    try {
      const token = TokenManager.getToken()
      const formData = new FormData()
      formData.append("file", file)
      const uploadRes = await fetch(getBackendApiUrl("uploads"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      if (!uploadRes.ok) throw new Error("Upload failed")
      const uploadData = await uploadRes.json()
      const fileUrl = uploadData.file_url || uploadData.url || ""
      setHomepage((prev) => ({ ...prev, [field]: fileUrl }))
      toast({ title: "Uploaded", description: `${field.replace("_", " ")} uploaded successfully` })
    } catch (error) {
      console.error("Upload error:", error)
      toast({ title: "Error", description: "Failed to upload file", variant: "destructive" })
    }
  }

  const handleCampHeroUpload = async (file: File) => {
    try {
      const token = TokenManager.getToken()
      const formData = new FormData()
      formData.append("file", file)
      const uploadRes = await fetch(getBackendApiUrl("uploads"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      if (!uploadRes.ok) throw new Error("Upload failed")
      const uploadData = await uploadRes.json()
      const fileUrl = uploadData.file_url || uploadData.url || uploadData.image_url || ""
      setResidentialCamp((prev) => ({ ...prev, hero: { ...prev.hero, hero_image: fileUrl } }))
      toast({ title: "Uploaded", description: "Residential camp hero image uploaded" })
    } catch (error) {
      console.error("Upload error:", error)
      toast({ title: "Error", description: "Failed to upload image", variant: "destructive" })
    }
  }

  const handleCampLogoUpload = async (file: File) => {
    try {
      const token = TokenManager.getToken()
      const formData = new FormData()
      formData.append("file", file)
      const uploadRes = await fetch(getBackendApiUrl("uploads"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      if (!uploadRes.ok) throw new Error("Upload failed")
      const uploadData = await uploadRes.json()
      const fileUrl = uploadData.file_url || uploadData.url || uploadData.image_url || ""
      setResidentialCamp((prev) => ({ ...prev, nav: { ...prev.nav, logo: fileUrl } }))
      toast({ title: "Uploaded", description: "Residential camp navbar logo uploaded" })
    } catch (error) {
      console.error("Upload error:", error)
      toast({ title: "Error", description: "Failed to upload image", variant: "destructive" })
    }
  }

  const handleCampIconUpload = async (index: number, file: File) => {
    try {
      const token = TokenManager.getToken()
      const formData = new FormData()
      formData.append("file", file)
      const uploadRes = await fetch(getBackendApiUrl("uploads"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      if (!uploadRes.ok) throw new Error("Upload failed")
      const uploadData = await uploadRes.json()
      const fileUrl = uploadData.file_url || uploadData.url || uploadData.image_url || ""
      setResidentialCamp((prev) => ({
        ...prev,
        camp: {
          ...prev.camp,
          cards: prev.camp.cards.map((card, i) => (i === index ? { ...card, icon_image: fileUrl } : card)),
        },
      }))
      toast({ title: "Uploaded", description: "Camp card icon uploaded" })
    } catch (error) {
      console.error("Upload error:", error)
      toast({ title: "Error", description: "Failed to upload image", variant: "destructive" })
    }
  }

  const handleStartNewCampEvent = async () => {
    try {
      setStartingNewEvent(true)
      const token = TokenManager.getToken()
      const res = await fetch(getBackendApiUrl("cms/residential-camp/new-event"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(campEventPayload(residentialCamp)),
      })
      if (!res.ok) throw new Error("Could not start a new event")
      const data = await res.json()
      setResidentialCamp(mergeResidentialCamp(data))
      toast({
        title: "New camp event started",
        description: "A new Event ID is active. Event details are saved already. Registrations will link to this event.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Could not start a new event",
        variant: "destructive",
      })
    } finally {
      setStartingNewEvent(false)
    }
  }

  const handleImageUpload = async (
    field: "navbar_logo" | "footer_logo" | "favicon" | "site_loader_image",
    file: File
  ) => {
    if (field === "site_loader_image") {
      const okTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"]
      const extOk = /\.(jpe?g|png|webp|gif)$/i.test(file.name)
      if (!okTypes.includes(file.type) && !extOk) {
        toast({
          title: "Invalid file",
          description: "Loader must be JPG, PNG, WEBP, or GIF (max 2MB).",
          variant: "destructive",
        })
        return
      }
      if (file.size > 2 * 1024 * 1024) {
        toast({ title: "File too large", description: "Loader must be 2MB or smaller.", variant: "destructive" })
        return
      }
    }
    try {
      const token = TokenManager.getToken()
      const formData = new FormData()
      formData.append("file", file)
      const uploadRes = await fetch(getBackendApiUrl("uploads"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      if (!uploadRes.ok) throw new Error("Upload failed")
      const uploadData = await uploadRes.json()
      const imageUrl = uploadData.url || uploadData.file_url || uploadData.image_url || ""
      setBranding((prev) => ({ ...prev, [field]: imageUrl }))
      toast({ title: "Uploaded", description: `${field.replace(/_/g, " ")} uploaded successfully` })
    } catch (error) {
      console.error("Upload error:", error)
      toast({ title: "Error", description: "Failed to upload image", variant: "destructive" })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#4F5077]">CMS Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage homepage sections, footer, branding, and SEO settings</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-yellow-400 hover:bg-yellow-500 text-white">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          {saving ? "Saving..." : "Save All Changes"}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex w-full flex-wrap h-auto gap-1 bg-gray-100 p-1">
          <TabsTrigger value="homepage" className="flex items-center gap-2 data-[state=active]:bg-white">
            <Home className="w-4 h-4" /> Homepage
          </TabsTrigger>
          <TabsTrigger value="footer" className="flex items-center gap-2 data-[state=active]:bg-white">
            <FileText className="w-4 h-4" /> Footer
          </TabsTrigger>
          <TabsTrigger value="branding" className="flex items-center gap-2 data-[state=active]:bg-white">
            <Image className="w-4 h-4" /> Branding
          </TabsTrigger>
          <TabsTrigger value="seo" className="flex items-center gap-2 data-[state=active]:bg-white">
            <Search className="w-4 h-4" /> Page SEO
          </TabsTrigger>
          <TabsTrigger value="residential-camp" className="flex items-center gap-2 data-[state=active]:bg-white">
            <MapPin className="w-4 h-4" /> Residential Camp Page
          </TabsTrigger>
        </TabsList>

        {/* Homepage Section Titles */}
        <TabsContent value="homepage" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#4F5077]">Hero Section</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label>Hero Title</Label>
                  <Input value={homepage.hero_title || ""} onChange={(e) => setHomepage({ ...homepage, hero_title: e.target.value })} placeholder="Enter hero title" />
                </div>
                <div className="space-y-2">
                  <Label>Hero Subtitle</Label>
                  <Input value={homepage.hero_subtitle || ""} onChange={(e) => setHomepage({ ...homepage, hero_subtitle: e.target.value })} placeholder="Enter hero subtitle" />
                </div>
                <div className="space-y-2">
                  <Label>Hero Description</Label>
                  <Textarea value={homepage.hero_description || ""} onChange={(e) => setHomepage({ ...homepage, hero_description: e.target.value })} placeholder="Enter hero description" rows={3} />
                </div>
                <div className="space-y-2">
                  <Label>Hero Image</Label>
                  <div className="flex items-center gap-4">
                    {homepage.hero_image && (
                      <div className="w-24 h-16 border rounded-lg overflow-hidden flex items-center justify-center bg-gray-50">
                        <img src={homepage.hero_image} alt="Hero" className="max-w-full max-h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1 space-y-2">
                      <Input value={homepage.hero_image || ""} onChange={(e) => setHomepage({ ...homepage, hero_image: e.target.value })} placeholder="Enter image URL or upload below" />
                      <Input type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleHeroMediaUpload("hero_image", file) }} className="text-sm" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Hero Video</Label>
                  <div className="flex items-center gap-4">
                    {homepage.hero_video && (
                      <div className="w-24 h-16 border rounded-lg overflow-hidden flex items-center justify-center bg-gray-50">
                        <video src={homepage.hero_video} className="max-w-full max-h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1 space-y-2">
                      <Input value={homepage.hero_video || ""} onChange={(e) => setHomepage({ ...homepage, hero_video: e.target.value })} placeholder="Enter video URL or upload below" />
                      <Input type="file" accept="video/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleHeroMediaUpload("hero_video", file) }} className="text-sm" />
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border border-dashed border-gray-200 p-4 space-y-4">
                  <div>
                    <p className="text-sm font-medium text-[#4F5077]">Hero buttons</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Leave blank to hide. Buttons appear on the website hero only when text is set here.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Primary button text</Label>
                      <Input
                        value={homepage.hero_primary_cta_text || ""}
                        onChange={(e) => setHomepage({ ...homepage, hero_primary_cta_text: e.target.value })}
                        placeholder="e.g. Explore Courses"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Primary button link</Label>
                      <Input
                        value={homepage.hero_primary_cta_link || ""}
                        onChange={(e) => setHomepage({ ...homepage, hero_primary_cta_link: e.target.value })}
                        placeholder="e.g. #courses or /courses"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Secondary button text</Label>
                      <Input
                        value={homepage.hero_secondary_cta_text || ""}
                        onChange={(e) => setHomepage({ ...homepage, hero_secondary_cta_text: e.target.value })}
                        placeholder="e.g. Join the Academy"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Secondary button link</Label>
                      <Input
                        value={homepage.hero_secondary_cta_link || ""}
                        onChange={(e) => setHomepage({ ...homepage, hero_secondary_cta_link: e.target.value })}
                        placeholder="e.g. /register"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-[#4F5077]">Registration Media</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-500">
                Configure the media shown on the left side of the registration steps. Supports images, GIFs, or hosted videos.
              </p>
              <div className="space-y-2">
                <Label>Media URL</Label>
                <Input
                  value={homepage.registration_media_url || ""}
                  onChange={(e) => setHomepage({ ...homepage, registration_media_url: e.target.value })}
                  placeholder="Enter image / GIF / video URL"
                />
              </div>
              <div className="space-y-2">
                <Label>Media Type</Label>
                <Select
                  value={homepage.registration_media_type || ""}
                  onValueChange={(value) => setHomepage({ ...homepage, registration_media_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Auto-detect from URL" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto</SelectItem>
                    <SelectItem value="image">Image / GIF</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <CardTitle className="text-[#4F5077]">Homepage — About (full width on site)</CardTitle>
              <Button
                type="button"
                onClick={handleSaveHomepageAbout}
                disabled={savingAbout}
                className="bg-yellow-400 hover:bg-yellow-500 text-white shrink-0"
              >
                {savingAbout ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Save about section
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-500">
                This content is stored in the <code className="px-1 bg-gray-100 rounded">homepage_content</code>{" "}
                collection (title, subtitle, HTML body, image). TipTap/Quill can be added later; paste safe HTML from
                any editor.
              </p>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={homepageAbout.title}
                    onChange={(e) => setHomepageAbout((p) => ({ ...p, title: e.target.value }))}
                    placeholder="About heading"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Subtitle</Label>
                  <Textarea
                    value={homepageAbout.subtitle}
                    onChange={(e) => setHomepageAbout((p) => ({ ...p, subtitle: e.target.value }))}
                    placeholder="Supporting line under the title"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Content (HTML)</Label>
                  <Textarea
                    value={homepageAbout.content}
                    onChange={(e) => setHomepageAbout((p) => ({ ...p, content: e.target.value }))}
                    placeholder="<p>Rich text HTML…</p>"
                    rows={12}
                    className="font-mono text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label>About image (right column on homepage)</Label>
                  <div className="flex flex-wrap items-center gap-3">
                    {homepageAbout.image ? (
                      <img src={homepageAbout.image} alt="" className="h-24 w-auto rounded border object-cover" />
                    ) : null}
                    <Input
                      value={homepageAbout.image}
                      onChange={(e) => setHomepageAbout((p) => ({ ...p, image: e.target.value }))}
                      placeholder="URL or upload below"
                    />
                    <Input
                      type="file"
                      accept="image/*"
                      className="max-w-xs"
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) handleAboutImageUpload(f)
                      }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-[#4F5077]">Courses Section</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label>Courses Title (main heading)</Label>
                  <Input value={homepage.courses_title || ""} onChange={(e) => setHomepage({ ...homepage, courses_title: e.target.value })} placeholder='Main heading (e.g. "Our Classes")' />
                </div>
                <div className="space-y-2">
                  <Label>Courses Subtitle (small label above title)</Label>
                  <Textarea value={homepage.courses_subtitle || ""} onChange={(e) => setHomepage({ ...homepage, courses_subtitle: e.target.value })} placeholder='Small label (e.g. "Choose")' rows={2} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-[#4F5077]">Testimonials Section</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label>Testimonials Title (main heading)</Label>
                  <Input value={homepage.testimonials_title || ""} onChange={(e) => setHomepage({ ...homepage, testimonials_title: e.target.value })} placeholder='Main heading (e.g. "Success stories")' />
                </div>
                <div className="space-y-2">
                  <Label>Testimonials Subtitle (small label above title)</Label>
                  <Textarea value={homepage.testimonials_subtitle || ""} onChange={(e) => setHomepage({ ...homepage, testimonials_subtitle: e.target.value })} placeholder='Small label (e.g. "Testimonials")' rows={2} />
                </div>
              </div>
              <p className="text-sm text-gray-500 pt-2">
                Testimonial cards are managed only under{" "}
                <strong>Dashboard → Testimonials</strong> (MongoDB). Home and branch pages read from there.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-[#4F5077]">Tagline (below Hero)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label>Tagline Title</Label>
                  <Input
                    value={homepage.cta_title || ""}
                    onChange={(e) => setHomepage({ ...homepage, cta_title: e.target.value })}
                    placeholder="Learn martial arts with discipline energy enhance your physical and mental well-being with our holistic tai-chi training."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tagline Subtitle (optional)</Label>
                  <Textarea
                    value={homepage.cta_subtitle || ""}
                    onChange={(e) => setHomepage({ ...homepage, cta_subtitle: e.target.value })}
                    placeholder="Optional second line under the tagline"
                    rows={2}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-[#4F5077]">CTA (below Testimonials)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label>CTA Title</Label>
                  <Input
                    value={homepage.bottom_cta_title || ""}
                    onChange={(e) => setHomepage({ ...homepage, bottom_cta_title: e.target.value })}
                    placeholder="Start your martial arts journey today"
                  />
                </div>
                <div className="space-y-2">
                  <Label>CTA Subtitle</Label>
                  <Textarea
                    value={homepage.bottom_cta_subtitle || ""}
                    onChange={(e) => setHomepage({ ...homepage, bottom_cta_subtitle: e.target.value })}
                    placeholder="Join Rock Martial Arts Academy and train with expert masters in a supportive community."
                    rows={2}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-[#4F5077]">Popup form</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4 rounded-lg border px-3 py-2">
                <div>
                  <Label htmlFor="popup-enabled">Enable popup</Label>
                  <p className="text-xs text-muted-foreground">When off, the popup never appears on the website.</p>
                </div>
                <Switch
                  id="popup-enabled"
                  checked={popupForm.enabled}
                  onCheckedChange={(v) => patchPopupForm({ enabled: v })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="popup-title">Title</Label>
                <Input
                  id="popup-title"
                  value={popupForm.title}
                  onChange={(e) => patchPopupForm({ title: e.target.value })}
                  placeholder="Get a call from our team"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="popup-description">Description</Label>
                <Textarea
                  id="popup-description"
                  value={popupForm.description}
                  onChange={(e) => patchPopupForm({ description: e.target.value })}
                  placeholder="Share your details and preferred branch. Our team will contact you with course options and fees."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-800">Input fields</p>
                <div className="flex items-center justify-between gap-4 rounded-lg border px-3 py-2">
                  <Label htmlFor="popup-name">Name</Label>
                  <Switch
                    id="popup-name"
                    checked={popupForm.name_enabled}
                    onCheckedChange={(v) => patchPopupForm({ name_enabled: v })}
                  />
                </div>
                <div className="flex items-center justify-between gap-4 rounded-lg border px-3 py-2">
                  <div>
                    <Label htmlFor="popup-phone">Mobile number</Label>
                    <p className="text-xs text-muted-foreground">When on, the visitor must verify via OTP before submit.</p>
                  </div>
                  <Switch
                    id="popup-phone"
                    checked={popupForm.phone_enabled}
                    onCheckedChange={(v) => patchPopupForm({ phone_enabled: v })}
                  />
                </div>
                <div className="flex items-center justify-between gap-4 rounded-lg border px-3 py-2">
                  <Label htmlFor="popup-branch">Branch</Label>
                  <Switch
                    id="popup-branch"
                    checked={popupForm.branch_enabled}
                    onCheckedChange={(v) => patchPopupForm({ branch_enabled: v })}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-lg border px-3 py-2">
                <div>
                  <Label htmlFor="popup-skip">Skip for now</Label>
                  <p className="text-xs text-muted-foreground">When off, the skip link is hidden and the visitor must complete the form.</p>
                </div>
                <Switch
                  id="popup-skip"
                  checked={popupForm.skip_enabled}
                  onCheckedChange={(v) => patchPopupForm({ skip_enabled: v })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Footer Content */}
        <TabsContent value="footer" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#4F5077]">Footer Text</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Footer Description</Label>
                <Textarea value={footer.footer_text || ""} onChange={(e) => setFooter({ ...footer, footer_text: e.target.value })} placeholder="Enter footer description text" rows={3} />
              </div>
              <div className="space-y-2">
                <Label>Copyright Text</Label>
                <Input value={footer.copyright_text || ""} onChange={(e) => setFooter({ ...footer, copyright_text: e.target.value })} placeholder="© 2025 Rock Martial Arts. All rights reserved." />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-[#4F5077]">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Textarea value={footer.address || ""} onChange={(e) => setFooter({ ...footer, address: e.target.value })} placeholder="Enter address" rows={2} />
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input value={footer.phone || ""} onChange={(e) => setFooter({ ...footer, phone: e.target.value })} placeholder="Enter phone number" />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={footer.email || ""} onChange={(e) => setFooter({ ...footer, email: e.target.value })} placeholder="Enter email address" type="email" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>WhatsApp number (floating button on website)</Label>
                    <Input
                      value={footer.whatsapp_number || ""}
                      onChange={(e) => setFooter({ ...footer, whatsapp_number: e.target.value })}
                      placeholder="e.g. +91 9876543210 — leave blank to hide the button"
                      type="tel"
                    />
                    <p className="text-xs text-muted-foreground">Digits only or with country code; saves to CMS and updates the green chat button after save.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-[#4F5077]">Social Media Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Facebook URL</Label>
                  <Input value={footer.social_facebook || ""} onChange={(e) => setFooter({ ...footer, social_facebook: e.target.value })} placeholder="https://facebook.com/..." />
                </div>
                <div className="space-y-2">
                  <Label>Instagram URL</Label>
                  <Input value={footer.social_instagram || ""} onChange={(e) => setFooter({ ...footer, social_instagram: e.target.value })} placeholder="https://instagram.com/..." />
                </div>
                <div className="space-y-2">
                  <Label>Twitter / X URL</Label>
                  <Input value={footer.social_twitter || ""} onChange={(e) => setFooter({ ...footer, social_twitter: e.target.value })} placeholder="https://twitter.com/..." />
                </div>
                <div className="space-y-2">
                  <Label>YouTube URL</Label>
                  <Input value={footer.social_youtube || ""} onChange={(e) => setFooter({ ...footer, social_youtube: e.target.value })} placeholder="https://youtube.com/..." />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Branding */}
        <TabsContent value="branding" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#4F5077]">Website loader</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-500">
                Shown full-screen on the public site while the page loads. Displayed at max <strong>140px</strong> wide.
                Use JPG, PNG, WEBP, or GIF (animated GIF supported). Max <strong>2MB</strong>. Save all changes after upload.
              </p>
              <div className="flex items-center gap-4 flex-wrap">
                {branding.site_loader_image ? (
                  <div className="w-[140px] h-[140px] border rounded-lg overflow-hidden flex items-center justify-center bg-black">
                    <img
                      src={branding.site_loader_image}
                      alt="Loader preview"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-[140px] h-[140px] border rounded-lg flex items-center justify-center bg-gray-100 text-xs text-gray-500 text-center px-2">
                    Default site loader
                  </div>
                )}
                <div className="flex-1 space-y-2 min-w-[200px]">
                  <Label>Image URL (optional)</Label>
                  <Input
                    value={branding.site_loader_image || ""}
                    onChange={(e) => setBranding({ ...branding, site_loader_image: e.target.value })}
                    placeholder="Or paste URL from uploads"
                  />
                  <Input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleImageUpload("site_loader_image", file)
                      e.target.value = ""
                    }}
                    className="text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setBranding({ ...branding, site_loader_image: "" })}
                  >
                    Clear (use default)
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-[#4F5077]">Logo & Favicon</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {(["navbar_logo", "footer_logo", "favicon"] as const).map((field) => (
                <div key={field} className="space-y-3 pb-4 border-b last:border-b-0">
                  <Label className="text-base font-semibold capitalize">{field.replace("_", " ")}</Label>
                  <div className="flex items-center gap-4">
                    {branding[field] && (
                      <div className="w-20 h-20 border rounded-lg overflow-hidden flex items-center justify-center bg-gray-50">
                        <img src={branding[field]} alt={field} className="max-w-full max-h-full object-contain" />
                      </div>
                    )}
                    <div className="flex-1 space-y-2">
                      <Input
                        value={branding[field] || ""}
                        onChange={(e) => setBranding({ ...branding, [field]: e.target.value })}
                        placeholder="Enter image URL or upload below"
                      />
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleImageUpload(field, file)
                        }}
                        className="text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Page-wise SEO */}
        <TabsContent value="seo" className="space-y-6 mt-6">
          {SEO_PAGES.map((page) => (
            <Card key={page.key}>
              <CardHeader>
                <CardTitle className="text-[#4F5077] flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  {page.label} SEO
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Meta Title</Label>
                    <Input
                      value={pageSeo[page.key]?.meta_title || ""}
                      onChange={(e) => updatePageSeo(page.key, "meta_title", e.target.value)}
                      placeholder={`${page.label} - Meta Title`}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Meta Keywords</Label>
                    <Input
                      value={pageSeo[page.key]?.meta_keywords || ""}
                      onChange={(e) => updatePageSeo(page.key, "meta_keywords", e.target.value)}
                      placeholder="keyword1, keyword2, keyword3"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Meta Description</Label>
                  <Textarea
                    value={pageSeo[page.key]?.meta_description || ""}
                    onChange={(e) => updatePageSeo(page.key, "meta_description", e.target.value)}
                    placeholder={`${page.label} - Meta Description`}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>OG Image URL</Label>
                  <Input
                    value={pageSeo[page.key]?.og_image || ""}
                    onChange={(e) => updatePageSeo(page.key, "og_image", e.target.value)}
                    placeholder="https://example.com/og-image.jpg"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="residential-camp" className="space-y-6 mt-6">
          <ResidentialCampCmsFields
            value={residentialCamp}
            onChange={setResidentialCamp}
            onHeroUpload={handleCampHeroUpload}
            onLogoUpload={handleCampLogoUpload}
            onCampIconUpload={handleCampIconUpload}
            onStartNewEvent={handleStartNewCampEvent}
            startingNewEvent={startingNewEvent}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
