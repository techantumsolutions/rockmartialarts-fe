"use client"

import React, { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Upload,
  Plus,
  X,
  Loader2,
  Image as ImageIcon,
  FileText,
  Video,
  Users,
  Star,
  BookOpen,
  Layout,
  Info,
  GraduationCap,
  Paperclip,
} from "lucide-react"
import { uploadFile } from "@/lib/upload"
import { AdminImageUpload } from "@/components/ui/AdminImageUpload"
import { useToast } from "@/hooks/use-toast"
import {
  COURSE_SECTIONS_BY_LAYOUT,
  LAYOUT_VARIANT_OPTIONS,
  type CourseLayoutVariant,
  type CourseSectionKey,
  type PageContent,
} from "@/lib/coursePageContent"

export type { PageContent } from "@/lib/coursePageContent"

interface Props {
  value: PageContent
  onChange: (v: PageContent) => void
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function FileUpload({
  accept,
  label,
  currentUrl,
  onUploaded,
}: {
  accept: string
  label: string
  currentUrl?: string
  onUploaded: (url: string) => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const { toast } = useToast()

  const handle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const result = await uploadFile(file)
      onUploaded(result.file_url)
      toast({ title: "Uploaded", description: file.name })
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" })
    } finally {
      setUploading(false)
      if (ref.current) ref.current.value = ""
    }
  }

  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          value={currentUrl || ""}
          onChange={(e) => onUploaded(e.target.value)}
          placeholder="URL or upload a file"
          className="flex-1"
        />
        <input ref={ref} type="file" accept={accept} className="hidden" onChange={handle} />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => ref.current?.click()}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        </Button>
      </div>
      {currentUrl && accept.startsWith("image") && (
        <img src={currentUrl} alt="" className="mt-1 h-20 rounded object-cover" />
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Main Component                                                      */
/* ------------------------------------------------------------------ */

export default function CourseFormSections({ value, onChange }: Props) {
  const pc = value || {}

  const set = <K extends keyof PageContent>(key: K, val: PageContent[K]) =>
    onChange({ ...pc, [key]: val })

  const hero = pc.hero_section || {}
  const courseInfoSections = pc.course_info_sections || []
  const rawAbout = pc.about_section || {}
  const about = {
    ...rawAbout,
    title: rawAbout.title ?? rawAbout.aboutTitle ?? "",
    description: rawAbout.description ?? rawAbout.aboutDescription ?? "",
  }
  const benefits = pc.benefits || []
  const learning = pc.learning_section || {}
  const gallery = pc.gallery_images || []
  const instructors = pc.instructors || []
  const testimonials = pc.testimonials || []
  const attachments = pc.pdf_attachments || []
  const visibility = pc.section_visibility || {}
  const learnCards = pc.learn_cards || []
  const whoCanJoin = pc.who_can_join || {}
  const trainingPrograms = pc.training_programs || []
  const whyRmaa = pc.why_rmaa || {}
  const lineage = pc.lineage || {}
  const philosophy = pc.philosophy_pillars || []
  const qualities = pc.qualities || []
  const sportSpotlight = pc.sport_spotlight || {}
  const styleCards = pc.style_cards || []
  const finalCta = pc.final_cta || {}
  const heroFeatures = hero.feature_icons || []
  const secondaryCtas = hero.secondary_ctas || []

  const enabled = (key: CourseSectionKey) => visibility[key] !== false
  const setEnabled = (key: CourseSectionKey, on: boolean) =>
    set("section_visibility", { ...(visibility || {}), [key]: on })

  const layoutVariant = (pc.layout_variant || "standard") as CourseLayoutVariant
  const layoutSections =
    COURSE_SECTIONS_BY_LAYOUT[layoutVariant] || COURSE_SECTIONS_BY_LAYOUT.standard
  const layoutSectionKeys = new Set(layoutSections.map((s) => s.key))
  const showSection = (key: CourseSectionKey) => layoutSectionKeys.has(key)

  const VisibilityBadge = ({ on }: { on: boolean }) => (
    <span
      className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        on ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
      }`}
    >
      {on ? "Visible" : "Hidden"}
    </span>
  )

  const SectionEditor = ({
    sectionKey,
    children,
  }: {
    sectionKey: CourseSectionKey
    children: React.ReactNode
  }) => (showSection(sectionKey) ? <>{children}</> : null)

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-gray-100 bg-[#FAFBFC] p-4">
        <div className="mb-3 flex items-center gap-2">
          <Layout className="h-4 w-4 text-[#4F5077]" />
          <h4 className="text-sm font-semibold text-[#2F3153]">Page Layout Variant</h4>
        </div>
        <p className="mb-3 text-xs text-gray-500">
          Controls optional section emphasis. All courses still use one dynamic page.
        </p>
        <select
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={pc.layout_variant || "standard"}
          onChange={(e) =>
            set("layout_variant", (e.target.value as CourseLayoutVariant) || "standard")
          }
        >
          {LAYOUT_VARIANT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <p className="mt-2 text-[11px] text-gray-500">
          {
            LAYOUT_VARIANT_OPTIONS.find((o) => o.value === (pc.layout_variant || "standard"))
              ?.hint
          }
        </p>
      </div>

      {/* Section visibility grid (mockup-style) */}
      <div className="rounded-xl border border-gray-100 bg-[#FAFBFC] p-4">
        <div className="mb-3 flex items-center gap-2">
          <Info className="h-4 w-4 text-[#4F5077]" />
          <h4 className="text-sm font-semibold text-[#2F3153]">Section Visibility</h4>
        </div>
        <p className="mb-3 text-xs text-gray-500">
          Only sections used by the selected layout appear here — matching the public course page.
          Disabled sections stay hidden even if they have content.
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {layoutSections.map(({ key, label }) => (
            <div
              key={key}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2.5 shadow-sm"
            >
              <div className="text-sm font-medium text-[#4F5077]">{label}</div>
              <Switch checked={enabled(key)} onCheckedChange={(v) => setEnabled(key, v)} />
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="mb-2 text-sm font-semibold text-[#2F3153]">Content Builder</h4>
        <p className="mb-3 text-xs text-gray-500">Customize copy and media for each public page section.</p>
      </div>

    <Accordion type="multiple" className="w-full space-y-2" defaultValue={["hero"]}>
      {/* ---- 1. Hero Section ---- */}
      <SectionEditor sectionKey="hero">
      <AccordionItem value="hero" className="rounded-xl border border-gray-200 bg-white px-4 shadow-sm">
        <AccordionTrigger className="text-[#4F5077] font-semibold hover:no-underline">
          <span className="flex items-center gap-2">
            <Layout className="h-4 w-4" /> Hero Section
            <VisibilityBadge on={enabled("hero")} />
          </span>
        </AccordionTrigger>
        <AccordionContent className="space-y-3 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Hero Title</Label>
              <Input value={hero.title || ""} onChange={(e) => set("hero_section", { ...hero, title: e.target.value })} placeholder="e.g. Shaolin Kung Fu" />
            </div>
            <div className="space-y-1">
              <Label>Subtitle</Label>
              <Input value={hero.subtitle || ""} onChange={(e) => set("hero_section", { ...hero, subtitle: e.target.value })} placeholder="Powerful blend of fitness..." />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Hero Description</Label>
            <Textarea value={hero.description || ""} onChange={(e) => set("hero_section", { ...hero, description: e.target.value })} rows={3} placeholder="Course introduction paragraph..." />
          </div>
          <FileUpload accept="image/*" label="Hero Background Image" currentUrl={hero.hero_image} onUploaded={(url) => set("hero_section", { ...hero, hero_image: url })} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Primary CTA Text</Label>
              <Input value={hero.cta_text || ""} onChange={(e) => set("hero_section", { ...hero, cta_text: e.target.value })} placeholder="Join Now" />
            </div>
            <div className="space-y-1">
              <Label>Primary CTA Link</Label>
              <Input value={hero.cta_link || ""} onChange={(e) => set("hero_section", { ...hero, cta_link: e.target.value })} placeholder="/register" />
            </div>
          </div>
          <div className="space-y-2 rounded-lg border border-dashed border-gray-200 p-3">
            <Label>Hero Feature Icons</Label>
            <p className="text-xs text-gray-500">Shown under the hero tagline (e.g. Flexibility, Self-Defense).</p>
            {heroFeatures.map((f, i) => (
              <div key={i} className="grid grid-cols-1 gap-2 rounded-md border p-2 md:grid-cols-3">
                <Input
                  value={f.label || ""}
                  placeholder="Label"
                  onChange={(e) => {
                    const n = [...heroFeatures]
                    n[i] = { ...f, label: e.target.value }
                    set("hero_section", { ...hero, feature_icons: n })
                  }}
                />
                <Input
                  value={f.icon || ""}
                  placeholder="Emoji / icon"
                  onChange={(e) => {
                    const n = [...heroFeatures]
                    n[i] = { ...f, icon: e.target.value }
                    set("hero_section", { ...hero, feature_icons: n })
                  }}
                />
                <div className="flex gap-2 items-start">
                  <AdminImageUpload
                    label=""
                    shape="square"
                    className="min-w-0 flex-1 space-y-1"
                    previewClassName="h-16 w-16"
                    helperText=""
                    value={f.image || ""}
                    onChange={(url) => {
                      const n = [...heroFeatures]
                      n[i] = { ...f, image: url }
                      set("hero_section", { ...hero, feature_icons: n })
                    }}
                    onClear={() => {
                      const n = [...heroFeatures]
                      n[i] = { ...f, image: "" }
                      set("hero_section", { ...hero, feature_icons: n })
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-red-500"
                    onClick={() =>
                      set("hero_section", {
                        ...hero,
                        feature_icons: heroFeatures.filter((_, idx) => idx !== i),
                      })
                    }
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                set("hero_section", {
                  ...hero,
                  feature_icons: [...heroFeatures, { label: "", icon: "" }],
                })
              }
            >
              <Plus className="mr-1 h-4 w-4" /> Add feature icon
            </Button>
          </div>
          <div className="space-y-2 rounded-lg border border-dashed border-gray-200 p-3">
            <Label>Secondary Hero CTAs</Label>
            {secondaryCtas.map((c, i) => (
              <div key={i} className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <Input
                  value={c.label || ""}
                  placeholder="Label (e.g. View All Courses)"
                  onChange={(e) => {
                    const n = [...secondaryCtas]
                    n[i] = { ...c, label: e.target.value }
                    set("hero_section", { ...hero, secondary_ctas: n })
                  }}
                />
                <div className="flex gap-2">
                  <Input
                    value={c.link || ""}
                    placeholder="Link"
                    onChange={(e) => {
                      const n = [...secondaryCtas]
                      n[i] = { ...c, link: e.target.value }
                      set("hero_section", { ...hero, secondary_ctas: n })
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-red-500"
                    onClick={() =>
                      set("hero_section", {
                        ...hero,
                        secondary_ctas: secondaryCtas.filter((_, idx) => idx !== i),
                      })
                    }
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                set("hero_section", {
                  ...hero,
                  secondary_ctas: [...secondaryCtas, { label: "", link: "/courses" }],
                })
              }
            >
              <Plus className="mr-1 h-4 w-4" /> Add secondary CTA
            </Button>
          </div>
        </AccordionContent>
      </AccordionItem>
      </SectionEditor>

      {/* ---- 3. About Section ---- */}
      <SectionEditor sectionKey="about">
      <AccordionItem value="about" className="rounded-xl border border-gray-200 bg-white px-4 shadow-sm">
        <AccordionTrigger className="text-[#4F5077] font-semibold hover:no-underline">
          <span className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" /> About Course
            <VisibilityBadge on={enabled("about")} />
          </span>
        </AccordionTrigger>
        <AccordionContent className="space-y-3 pb-4">
          <div className="space-y-1">
            <Label>Section Title</Label>
            <Input
              value={about.title || ""}
              onChange={(e) => set("about_section", { ...rawAbout, title: e.target.value })}
              placeholder="Start Today and Change Your Life"
            />
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea
              value={about.description || ""}
              onChange={(e) => set("about_section", { ...rawAbout, description: e.target.value })}
              rows={4}
              placeholder="About course description (public page — not the main course description field)"
            />
          </div>
          <div className="space-y-1">
            <Label>Secondary Description</Label>
            <Textarea
              value={about.secondary_description || ""}
              onChange={(e) => set("about_section", { ...rawAbout, secondary_description: e.target.value })}
              rows={3}
              placeholder="Additional paragraph..."
            />
          </div>
          <div className="space-y-1">
            <Label>About Image (shown on right, 40%)</Label>
            <FileUpload
              accept="image/*"
              label="Upload About Image"
              currentUrl={about.image1 || about.image2}
              onUploaded={(url) => set("about_section", { ...rawAbout, image1: url })}
            />
          </div>
        </AccordionContent>
      </AccordionItem>
      </SectionEditor>

      {/* ---- 3a. Course Info Sections (60-40 / 40-60 alternating) ---- */}
      <SectionEditor sectionKey="course_info_sections">
      <AccordionItem value="courseInfoSections" className="rounded-xl border border-gray-200 bg-white px-4 shadow-sm">
        <AccordionTrigger className="text-[#4F5077] font-semibold hover:no-underline">
          <span className="flex items-center gap-2">
            <Layout className="h-4 w-4" /> Course Info Sections ({courseInfoSections.length})
            <VisibilityBadge on={enabled("course_info_sections")} />
          </span>
        </AccordionTrigger>
        <AccordionContent className="space-y-3 pb-4">
          <p className="text-sm text-gray-500">These blocks appear on the course detail page with alternating image left/right layout (60% text, 40% image).</p>
          {courseInfoSections.map((sec, i) => (
            <div key={i} className="border rounded-lg p-3 space-y-2 relative">
              <Button type="button" variant="ghost" size="sm" className="absolute top-1 right-1 text-red-500" onClick={() => set("course_info_sections", courseInfoSections.filter((_, idx) => idx !== i))}>
                <X className="h-4 w-4" />
              </Button>
              <div className="space-y-1">
                <Label>Section Title</Label>
                <Input value={sec.title || ""} onChange={(e) => { const n = [...courseInfoSections]; n[i] = { ...sec, title: e.target.value }; set("course_info_sections", n) }} placeholder="e.g. Why Choose This Course" />
              </div>
              <div className="space-y-1">
                <Label>Content</Label>
                <Textarea value={sec.content || ""} onChange={(e) => { const n = [...courseInfoSections]; n[i] = { ...sec, content: e.target.value }; set("course_info_sections", n) }} rows={3} placeholder="Paragraph text..." />
              </div>
              <div className="space-y-1">
                <Label>Bullet points (one per line or add below)</Label>
                <div className="space-y-1">
                  {(sec.bullet_points || []).map((bp, j) => (
                    <div key={j} className="flex gap-2">
                      <Input value={bp} onChange={(e) => { const pts = [...(sec.bullet_points || [])]; pts[j] = e.target.value; const n = [...courseInfoSections]; n[i] = { ...sec, bullet_points: pts }; set("course_info_sections", n) }} placeholder="Bullet point" />
                      <Button type="button" variant="ghost" size="sm" className="text-red-500 shrink-0" onClick={() => { const pts = (sec.bullet_points || []).filter((_, k) => k !== j); const n = [...courseInfoSections]; n[i] = { ...sec, bullet_points: pts }; set("course_info_sections", n) }}><X className="h-4 w-4" /></Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={() => { const pts = [...(sec.bullet_points || []), ""]; const n = [...courseInfoSections]; n[i] = { ...sec, bullet_points: pts }; set("course_info_sections", n) }}><Plus className="h-4 w-4 mr-1" /> Add bullet</Button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>Layout</Label>
                  <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" value={sec.layout || "image_right"} onChange={(e) => { const n = [...courseInfoSections]; n[i] = { ...sec, layout: e.target.value as "image_left" | "image_right" }; set("course_info_sections", n) }}>
                    <option value="image_right">Image right (text left)</option>
                    <option value="image_left">Image left (text right)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <FileUpload accept="image/*" label="Section image" currentUrl={sec.image} onUploaded={(url) => { const n = [...courseInfoSections]; n[i] = { ...sec, image: url }; set("course_info_sections", n) }} />
                </div>
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" className="w-full border-dashed" onClick={() => set("course_info_sections", [...courseInfoSections, { title: "", content: "", layout: "image_right" }])}>
            <Plus className="h-4 w-4 mr-2" /> Add Course Info Section
          </Button>
        </AccordionContent>
      </AccordionItem>
      </SectionEditor>

      {/* ---- 4. Benefits ---- */}
      <SectionEditor sectionKey="benefits">
      <AccordionItem value="benefits" className="rounded-xl border border-gray-200 bg-white px-4 shadow-sm">
        <AccordionTrigger className="text-[#4F5077] font-semibold hover:no-underline">
          <span className="flex items-center gap-2">
            <Star className="h-4 w-4" /> Benefits ({benefits.length})
            <VisibilityBadge on={enabled("benefits")} />
          </span>
        </AccordionTrigger>
        <AccordionContent className="space-y-3 pb-4">
          {benefits.map((b, i) => (
            <div key={i} className="border rounded-lg p-3 space-y-2 relative">
              <Button type="button" variant="ghost" size="sm" className="absolute top-1 right-1 text-red-500" onClick={() => set("benefits", benefits.filter((_, idx) => idx !== i))}>
                <X className="h-4 w-4" />
              </Button>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>Title</Label>
                  <Input value={b.title} onChange={(e) => { const n = [...benefits]; n[i] = { ...b, title: e.target.value }; set("benefits", n) }} placeholder="Confidence" />
                </div>
                <div className="space-y-1">
                  <Label>Icon (optional)</Label>
                  <Input value={b.icon || ""} onChange={(e) => { const n = [...benefits]; n[i] = { ...b, icon: e.target.value }; set("benefits", n) }} placeholder="e.g. 💪 or icon name" />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Description</Label>
                <Textarea value={b.description} onChange={(e) => { const n = [...benefits]; n[i] = { ...b, description: e.target.value }; set("benefits", n) }} rows={2} />
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" className="w-full border-dashed" onClick={() => set("benefits", [...benefits, { title: "", description: "", icon: "" }])}>
            <Plus className="h-4 w-4 mr-2" /> Add Benefit
          </Button>
        </AccordionContent>
      </AccordionItem>
      </SectionEditor>

      {/* ---- 5. Learning Section ---- */}
      <SectionEditor sectionKey="learning">
      <AccordionItem value="learning" className="rounded-xl border border-gray-200 bg-white px-4 shadow-sm">
        <AccordionTrigger className="text-[#4F5077] font-semibold hover:no-underline">
          <span className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" /> What You Will Learn
            <VisibilityBadge on={enabled("learning")} />
          </span>
        </AccordionTrigger>
        <AccordionContent className="space-y-3 pb-4">
          <div className="space-y-1">
            <Label>Section Title</Label>
            <Input value={learning.title || ""} onChange={(e) => set("learning_section", { ...learning, title: e.target.value })} placeholder="What You Will Learn During Boxing Classes" />
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea value={learning.description || ""} onChange={(e) => set("learning_section", { ...learning, description: e.target.value })} rows={4} />
          </div>
          <div className="space-y-1">
            <Label>Video URL (YouTube or uploaded)</Label>
            <Input value={learning.video_url || ""} onChange={(e) => set("learning_section", { ...learning, video_url: e.target.value })} placeholder="https://youtube.com/watch?v=..." />
          </div>
          <FileUpload accept="image/*" label="Video Thumbnail" currentUrl={learning.thumbnail} onUploaded={(url) => set("learning_section", { ...learning, thumbnail: url })} />
        </AccordionContent>
      </AccordionItem>
      </SectionEditor>

      {/* ---- 6. Gallery ---- */}
      <SectionEditor sectionKey="gallery">
      <AccordionItem value="gallery" className="rounded-xl border border-gray-200 bg-white px-4 shadow-sm">
        <AccordionTrigger className="text-[#4F5077] font-semibold hover:no-underline">
          <span className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4" /> Gallery ({gallery.length})
            <VisibilityBadge on={enabled("gallery")} />
          </span>
        </AccordionTrigger>
        <AccordionContent className="space-y-3 pb-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {gallery.map((url, i) => (
              <div key={i} className="relative group">
                <img src={url} alt="" className="w-full h-24 object-cover rounded" />
                <Button type="button" variant="destructive" size="sm" className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100" onClick={() => set("gallery_images", gallery.filter((_, idx) => idx !== i))}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
          <FileUpload accept="image/*" label="Add Gallery Image" currentUrl="" onUploaded={(url) => { if (url) set("gallery_images", [...gallery, url]) }} />
        </AccordionContent>
      </AccordionItem>
      </SectionEditor>

      {/* ---- 7. Instructors ---- */}
      <SectionEditor sectionKey="instructors">
      <AccordionItem value="instructors" className="rounded-xl border border-gray-200 bg-white px-4 shadow-sm">
        <AccordionTrigger className="text-[#4F5077] font-semibold hover:no-underline">
          <span className="flex items-center gap-2">
            <Users className="h-4 w-4" /> Instructors ({instructors.length})
            <VisibilityBadge on={enabled("instructors")} />
          </span>
        </AccordionTrigger>
        <AccordionContent className="space-y-3 pb-4">
          {instructors.map((inst, i) => (
            <div key={i} className="border rounded-lg p-3 space-y-2 relative">
              <Button type="button" variant="ghost" size="sm" className="absolute top-1 right-1 text-red-500" onClick={() => set("instructors", instructors.filter((_, idx) => idx !== i))}>
                <X className="h-4 w-4" />
              </Button>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>Name</Label>
                  <Input value={inst.name} onChange={(e) => { const n = [...instructors]; n[i] = { ...inst, name: e.target.value }; set("instructors", n) }} />
                </div>
                <div className="space-y-1">
                  <Label>Designation</Label>
                  <Input value={inst.designation} onChange={(e) => { const n = [...instructors]; n[i] = { ...inst, designation: e.target.value }; set("instructors", n) }} placeholder="Martial Arts - Kung Fu" />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Bio</Label>
                <Textarea value={inst.bio || ""} onChange={(e) => { const n = [...instructors]; n[i] = { ...inst, bio: e.target.value }; set("instructors", n) }} rows={2} />
              </div>
              <FileUpload accept="image/*" label="Photo" currentUrl={inst.photo} onUploaded={(url) => { const n = [...instructors]; n[i] = { ...inst, photo: url }; set("instructors", n) }} />
            </div>
          ))}
          <Button type="button" variant="outline" className="w-full border-dashed" onClick={() => set("instructors", [...instructors, { name: "", designation: "", bio: "", photo: "" }])}>
            <Plus className="h-4 w-4 mr-2" /> Add Instructor
          </Button>
        </AccordionContent>
      </AccordionItem>
      </SectionEditor>

      {/* ---- 8. Testimonials ---- */}
      <SectionEditor sectionKey="testimonials">
      <AccordionItem value="testimonials" className="rounded-xl border border-gray-200 bg-white px-4 shadow-sm">
        <AccordionTrigger className="text-[#4F5077] font-semibold hover:no-underline">
          <span className="flex items-center gap-2">
            <Star className="h-4 w-4" /> Testimonials ({testimonials.length})
            <VisibilityBadge on={enabled("testimonials")} />
          </span>
        </AccordionTrigger>
        <AccordionContent className="space-y-3 pb-4">
          {testimonials.map((t, i) => (
            <div key={i} className="border rounded-lg p-3 space-y-2 relative">
              <Button type="button" variant="ghost" size="sm" className="absolute top-1 right-1 text-red-500" onClick={() => set("testimonials", testimonials.filter((_, idx) => idx !== i))}>
                <X className="h-4 w-4" />
              </Button>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>Name</Label>
                  <Input value={t.name} onChange={(e) => { const n = [...testimonials]; n[i] = { ...t, name: e.target.value }; set("testimonials", n) }} />
                </div>
                <div className="space-y-1">
                  <Label>Designation</Label>
                  <Input value={t.designation} onChange={(e) => { const n = [...testimonials]; n[i] = { ...t, designation: e.target.value }; set("testimonials", n) }} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Testimonial Text</Label>
                <Textarea value={t.text} onChange={(e) => { const n = [...testimonials]; n[i] = { ...t, text: e.target.value }; set("testimonials", n) }} rows={3} />
              </div>
              <FileUpload accept="image/*" label="Photo (optional)" currentUrl={t.photo} onUploaded={(url) => { const n = [...testimonials]; n[i] = { ...t, photo: url }; set("testimonials", n) }} />
            </div>
          ))}
          <Button type="button" variant="outline" className="w-full border-dashed" onClick={() => set("testimonials", [...testimonials, { name: "", designation: "", text: "", photo: "" }])}>
            <Plus className="h-4 w-4 mr-2" /> Add Testimonial
          </Button>
        </AccordionContent>
      </AccordionItem>
      </SectionEditor>

      {/* ---- 9. PDF Attachments ---- */}
      <SectionEditor sectionKey="attachments">
      <AccordionItem value="attachments" className="rounded-xl border border-gray-200 bg-white px-4 shadow-sm">
        <AccordionTrigger className="text-[#4F5077] font-semibold hover:no-underline">
          <span className="flex items-center gap-2">
            <Paperclip className="h-4 w-4" /> PDF Attachments ({attachments.length})
            <VisibilityBadge on={enabled("attachments")} />
          </span>
        </AccordionTrigger>
        <AccordionContent className="space-y-3 pb-4">
          {attachments.map((a, i) => (
            <div key={i} className="border rounded-lg p-3 space-y-2 relative">
              <Button type="button" variant="ghost" size="sm" className="absolute top-1 right-1 text-red-500" onClick={() => set("pdf_attachments", attachments.filter((_, idx) => idx !== i))}>
                <X className="h-4 w-4" />
              </Button>
              <div className="space-y-1">
                <Label>Title</Label>
                <Input value={a.title} onChange={(e) => { const n = [...attachments]; n[i] = { ...a, title: e.target.value }; set("pdf_attachments", n) }} placeholder="Course Syllabus" />
              </div>
              <FileUpload accept="application/pdf" label="PDF File" currentUrl={a.file_url} onUploaded={(url) => { const n = [...attachments]; n[i] = { ...a, file_url: url }; set("pdf_attachments", n) }} />
            </div>
          ))}
          <Button type="button" variant="outline" className="w-full border-dashed" onClick={() => set("pdf_attachments", [...attachments, { title: "", file_url: "" }])}>
            <Plus className="h-4 w-4 mr-2" /> Add PDF Attachment
          </Button>
        </AccordionContent>
      </AccordionItem>
      </SectionEditor>

      {/* ---- Learn cards ---- */}
      <SectionEditor sectionKey="learn_cards">
      <AccordionItem value="learnCards" className="rounded-xl border border-gray-200 bg-white px-4 shadow-sm">
        <AccordionTrigger className="text-[#4F5077] font-semibold hover:no-underline">
          <span className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" /> What You&apos;ll Learn Cards ({learnCards.length})
            <VisibilityBadge on={enabled("learn_cards")} />
          </span>
        </AccordionTrigger>
        <AccordionContent className="space-y-3 pb-4">
          <p className="text-xs text-muted-foreground">
            Each card needs an image, title, and description. On the public page the description appears on hover (overlay). Add more than 6 cards to enable the carousel arrows.
          </p>
          {learnCards.map((card, i) => (
            <div key={i} className="relative space-y-2 rounded-lg border p-3">
              <Button type="button" variant="ghost" size="sm" className="absolute right-1 top-1 text-red-500" onClick={() => set("learn_cards", learnCards.filter((_, idx) => idx !== i))}>
                <X className="h-4 w-4" />
              </Button>
              <Input value={card.title} placeholder="Title" onChange={(e) => { const n = [...learnCards]; n[i] = { ...card, title: e.target.value }; set("learn_cards", n) }} />
              <Textarea value={card.description || ""} rows={3} placeholder="Description (shown on hover overlay)" onChange={(e) => { const n = [...learnCards]; n[i] = { ...card, description: e.target.value }; set("learn_cards", n) }} />
              <Input value={card.subtitle || ""} placeholder="Subtitle (optional fallback if description empty)" onChange={(e) => { const n = [...learnCards]; n[i] = { ...card, subtitle: e.target.value }; set("learn_cards", n) }} />
              <Input value={card.icon || ""} placeholder="Icon / emoji (used when no image)" onChange={(e) => { const n = [...learnCards]; n[i] = { ...card, icon: e.target.value }; set("learn_cards", n) }} />
              <FileUpload accept="image/*" label="Card image (required for image cards)" currentUrl={card.image} onUploaded={(url) => { const n = [...learnCards]; n[i] = { ...card, image: url }; set("learn_cards", n) }} />
              <Textarea
                value={(card.bullet_points || []).join("\n")}
                rows={3}
                placeholder="Bullet points (one per line, optional)"
                onChange={(e) => {
                  const n = [...learnCards]
                  n[i] = {
                    ...card,
                    bullet_points: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
                  }
                  set("learn_cards", n)
                }}
              />
            </div>
          ))}
          <Button type="button" variant="outline" className="w-full border-dashed" onClick={() => set("learn_cards", [...learnCards, { title: "" }])}>
            <Plus className="mr-2 h-4 w-4" /> Add learn card
          </Button>
        </AccordionContent>
      </AccordionItem>
      </SectionEditor>

      {/* ---- Who can join ---- */}
      <SectionEditor sectionKey="who_can_join">
      <AccordionItem value="whoCanJoin" className="rounded-xl border border-gray-200 bg-white px-4 shadow-sm">
        <AccordionTrigger className="text-[#4F5077] font-semibold hover:no-underline">
          <span className="flex items-center gap-2">
            <Users className="h-4 w-4" /> Who Can Join
            <VisibilityBadge on={enabled("who_can_join")} />
          </span>
        </AccordionTrigger>
        <AccordionContent className="space-y-3 pb-4">
          <Input value={whoCanJoin.title || ""} placeholder="Section title" onChange={(e) => set("who_can_join", { ...whoCanJoin, title: e.target.value })} />
          <Textarea
            value={(whoCanJoin.items || []).join("\n")}
            rows={6}
            placeholder={"Kids (6+ Years)\nTeenagers\nAdults\n..."}
            onChange={(e) =>
              set("who_can_join", {
                ...whoCanJoin,
                items: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
              })
            }
          />
          <Input
            value={whoCanJoin.note || ""}
            placeholder="Footer note (default: No previous experience required.)"
            onChange={(e) => set("who_can_join", { ...whoCanJoin, note: e.target.value })}
          />
        </AccordionContent>
      </AccordionItem>
      </SectionEditor>

      {/* ---- Training programs ---- */}
      <SectionEditor sectionKey="training_programs">
      <AccordionItem value="trainingPrograms" className="rounded-xl border border-gray-200 bg-white px-4 shadow-sm">
        <AccordionTrigger className="text-[#4F5077] font-semibold hover:no-underline">
          <span className="flex items-center gap-2">
            <Layout className="h-4 w-4" /> Training Programs ({trainingPrograms.length})
            <VisibilityBadge on={enabled("training_programs")} />
          </span>
        </AccordionTrigger>
        <AccordionContent className="space-y-3 pb-4">
          <p className="text-xs text-gray-500">Marketing cards only — not separate checkout SKUs.</p>
          {trainingPrograms.map((p, i) => (
            <div key={i} className="relative space-y-2 rounded-lg border p-3">
              <Button type="button" variant="ghost" size="sm" className="absolute right-1 top-1 text-red-500" onClick={() => set("training_programs", trainingPrograms.filter((_, idx) => idx !== i))}>
                <X className="h-4 w-4" />
              </Button>
              <Input value={p.title} placeholder="Title (e.g. Regular Training)" onChange={(e) => { const n = [...trainingPrograms]; n[i] = { ...p, title: e.target.value }; set("training_programs", n) }} />
              <Input value={p.subtitle || ""} placeholder="Subtitle" onChange={(e) => { const n = [...trainingPrograms]; n[i] = { ...p, subtitle: e.target.value }; set("training_programs", n) }} />
              <Input value={p.kind || ""} placeholder="Kind: regular | professional | goal" onChange={(e) => { const n = [...trainingPrograms]; n[i] = { ...p, kind: e.target.value }; set("training_programs", n) }} />
              <Textarea value={p.description || ""} rows={2} placeholder="Description" onChange={(e) => { const n = [...trainingPrograms]; n[i] = { ...p, description: e.target.value }; set("training_programs", n) }} />
              <Textarea
                value={(p.bullet_points || []).join("\n")}
                rows={4}
                placeholder="Bullets (one per line)"
                onChange={(e) => {
                  const n = [...trainingPrograms]
                  n[i] = { ...p, bullet_points: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) }
                  set("training_programs", n)
                }}
              />
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <Input value={p.schedule_label || ""} placeholder="Schedule label" onChange={(e) => { const n = [...trainingPrograms]; n[i] = { ...p, schedule_label: e.target.value }; set("training_programs", n) }} />
                <Input value={p.duration_label || ""} placeholder="Duration label" onChange={(e) => { const n = [...trainingPrograms]; n[i] = { ...p, duration_label: e.target.value }; set("training_programs", n) }} />
              </div>
              <FileUpload accept="image/*" label="Program image" currentUrl={p.image} onUploaded={(url) => { const n = [...trainingPrograms]; n[i] = { ...p, image: url }; set("training_programs", n) }} />
            </div>
          ))}
          <Button type="button" variant="outline" className="w-full border-dashed" onClick={() => set("training_programs", [...trainingPrograms, { title: "", kind: "regular" }])}>
            <Plus className="mr-2 h-4 w-4" /> Add training program
          </Button>
        </AccordionContent>
      </AccordionItem>
      </SectionEditor>

      {/* ---- Why RMAA ---- */}
      <SectionEditor sectionKey="why_rmaa">
      <AccordionItem value="whyRmaa" className="rounded-xl border border-gray-200 bg-white px-4 shadow-sm">
        <AccordionTrigger className="text-[#4F5077] font-semibold hover:no-underline">
          <span className="flex items-center gap-2">
            <Star className="h-4 w-4" /> Why Learn at RMAA
            <VisibilityBadge on={enabled("why_rmaa")} />
          </span>
        </AccordionTrigger>
        <AccordionContent className="space-y-3 pb-4">
          <Input value={whyRmaa.title || ""} placeholder="Title" onChange={(e) => set("why_rmaa", { ...whyRmaa, title: e.target.value })} />
          <Textarea value={whyRmaa.body || ""} rows={3} placeholder="Paragraph" onChange={(e) => set("why_rmaa", { ...whyRmaa, body: e.target.value })} />
          <Textarea
            value={(whyRmaa.items || []).join("\n")}
            rows={5}
            placeholder="Bullet items (one per line)"
            onChange={(e) =>
              set("why_rmaa", {
                ...whyRmaa,
                items: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
              })
            }
          />
        </AccordionContent>
      </AccordionItem>
      </SectionEditor>

      {/* ---- Heritage / optional ---- */}
      <SectionEditor sectionKey="lineage">
      <AccordionItem value="lineage" className="rounded-xl border border-gray-200 bg-white px-4 shadow-sm">
        <AccordionTrigger className="text-[#4F5077] font-semibold hover:no-underline">
          <span className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" /> Lineage (Heritage)
            <VisibilityBadge on={enabled("lineage")} />
          </span>
        </AccordionTrigger>
        <AccordionContent className="space-y-3 pb-4">
          <Input value={lineage.title || ""} placeholder="Title" onChange={(e) => set("lineage", { ...lineage, title: e.target.value })} />
          <Textarea value={lineage.body || ""} rows={4} placeholder="Body" onChange={(e) => set("lineage", { ...lineage, body: e.target.value })} />
          <Input value={lineage.founder_name || ""} placeholder="Founder name" onChange={(e) => set("lineage", { ...lineage, founder_name: e.target.value })} />
          <Input value={lineage.founder_title || ""} placeholder="Founder title" onChange={(e) => set("lineage", { ...lineage, founder_title: e.target.value })} />
          <FileUpload accept="image/*" label="Lineage image" currentUrl={lineage.image} onUploaded={(url) => set("lineage", { ...lineage, image: url })} />
        </AccordionContent>
      </AccordionItem>
      </SectionEditor>

      <SectionEditor sectionKey="philosophy">
      <AccordionItem value="philosophy" className="rounded-xl border border-gray-200 bg-white px-4 shadow-sm">
        <AccordionTrigger className="text-[#4F5077] font-semibold hover:no-underline">
          <span className="flex items-center gap-2">
            <Star className="h-4 w-4" /> Philosophy Pillars ({philosophy.length})
            <VisibilityBadge on={enabled("philosophy")} />
          </span>
        </AccordionTrigger>
        <AccordionContent className="space-y-3 pb-4">
          {philosophy.map((p, i) => (
            <div key={i} className="relative space-y-2 rounded-lg border p-3">
              <Button type="button" variant="ghost" size="sm" className="absolute right-1 top-1 text-red-500" onClick={() => set("philosophy_pillars", philosophy.filter((_, idx) => idx !== i))}><X className="h-4 w-4" /></Button>
              <Input value={p.title} placeholder="Title" onChange={(e) => { const n = [...philosophy]; n[i] = { ...p, title: e.target.value }; set("philosophy_pillars", n) }} />
              <Textarea value={p.description || ""} rows={2} placeholder="Description" onChange={(e) => { const n = [...philosophy]; n[i] = { ...p, description: e.target.value }; set("philosophy_pillars", n) }} />
              <Input value={p.icon || ""} placeholder="Icon" onChange={(e) => { const n = [...philosophy]; n[i] = { ...p, icon: e.target.value }; set("philosophy_pillars", n) }} />
            </div>
          ))}
          <Button type="button" variant="outline" className="w-full border-dashed" onClick={() => set("philosophy_pillars", [...philosophy, { title: "" }])}><Plus className="mr-2 h-4 w-4" /> Add pillar</Button>
        </AccordionContent>
      </AccordionItem>
      </SectionEditor>

      <SectionEditor sectionKey="qualities">
      <AccordionItem value="qualities" className="rounded-xl border border-gray-200 bg-white px-4 shadow-sm">
        <AccordionTrigger className="text-[#4F5077] font-semibold hover:no-underline">
          <span className="flex items-center gap-2">
            <Star className="h-4 w-4" /> Warrior Qualities ({qualities.length})
            <VisibilityBadge on={enabled("qualities")} />
          </span>
        </AccordionTrigger>
        <AccordionContent className="space-y-3 pb-4">
          <p className="text-xs text-muted-foreground">
            Fully customizable &quot;Develop The Complete Warrior&quot; items. Prefer a large photo per quality; icon is used only when no image is set.
          </p>
          {qualities.map((q, i) => (
            <div key={i} className="relative space-y-2 rounded-lg border p-3">
              <Button type="button" variant="ghost" size="sm" className="absolute right-1 top-1 text-red-500" onClick={() => set("qualities", qualities.filter((_, idx) => idx !== i))}>
                <X className="h-4 w-4" />
              </Button>
              <Input value={q.title} placeholder="Title (e.g. Strength)" onChange={(e) => { const n = [...qualities]; n[i] = { ...q, title: e.target.value }; set("qualities", n) }} />
              <Textarea value={q.description || ""} rows={2} placeholder="Description" onChange={(e) => { const n = [...qualities]; n[i] = { ...q, description: e.target.value }; set("qualities", n) }} />
              <Input value={q.icon || ""} placeholder="Fallback icon / emoji (optional)" onChange={(e) => { const n = [...qualities]; n[i] = { ...q, icon: e.target.value }; set("qualities", n) }} />
              <FileUpload accept="image/*" label="Quality image (recommended — shown larger on course page)" currentUrl={q.image} onUploaded={(url) => { const n = [...qualities]; n[i] = { ...q, image: url }; set("qualities", n) }} />
            </div>
          ))}
          <Button type="button" variant="outline" className="w-full border-dashed" onClick={() => set("qualities", [...qualities, { title: "" }])}><Plus className="mr-2 h-4 w-4" /> Add quality</Button>
        </AccordionContent>
      </AccordionItem>
      </SectionEditor>

      <SectionEditor sectionKey="sport_spotlight">
      <AccordionItem value="sportSpotlight" className="rounded-xl border border-gray-200 bg-white px-4 shadow-sm">
        <AccordionTrigger className="text-[#4F5077] font-semibold hover:no-underline">
          <span className="flex items-center gap-2">
            <Info className="h-4 w-4" /> Sport Spotlight
            <VisibilityBadge on={enabled("sport_spotlight")} />
          </span>
        </AccordionTrigger>
        <AccordionContent className="space-y-3 pb-4">
          <Input value={sportSpotlight.title || ""} placeholder="Title" onChange={(e) => set("sport_spotlight", { ...sportSpotlight, title: e.target.value })} />
          <Textarea value={sportSpotlight.body || ""} rows={4} placeholder="Body" onChange={(e) => set("sport_spotlight", { ...sportSpotlight, body: e.target.value })} />
          <FileUpload accept="image/*" label="Image" currentUrl={sportSpotlight.image} onUploaded={(url) => set("sport_spotlight", { ...sportSpotlight, image: url })} />
        </AccordionContent>
      </AccordionItem>
      </SectionEditor>

      <SectionEditor sectionKey="style_cards">
      <AccordionItem value="styleCards" className="rounded-xl border border-gray-200 bg-white px-4 shadow-sm">
        <AccordionTrigger className="text-[#4F5077] font-semibold hover:no-underline">
          <span className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4" /> Style Cards ({styleCards.length})
            <VisibilityBadge on={enabled("style_cards")} />
          </span>
        </AccordionTrigger>
        <AccordionContent className="space-y-3 pb-4">
          {styleCards.map((s, i) => (
            <div key={i} className="relative space-y-2 rounded-lg border p-3">
              <Button type="button" variant="ghost" size="sm" className="absolute right-1 top-1 text-red-500" onClick={() => set("style_cards", styleCards.filter((_, idx) => idx !== i))}><X className="h-4 w-4" /></Button>
              <Input value={s.title} placeholder="Style name" onChange={(e) => { const n = [...styleCards]; n[i] = { ...s, title: e.target.value }; set("style_cards", n) }} />
              <Textarea value={s.description || ""} rows={2} placeholder="Description" onChange={(e) => { const n = [...styleCards]; n[i] = { ...s, description: e.target.value }; set("style_cards", n) }} />
              <FileUpload accept="image/*" label="Image" currentUrl={s.image} onUploaded={(url) => { const n = [...styleCards]; n[i] = { ...s, image: url }; set("style_cards", n) }} />
            </div>
          ))}
          <Button type="button" variant="outline" className="w-full border-dashed" onClick={() => set("style_cards", [...styleCards, { title: "" }])}><Plus className="mr-2 h-4 w-4" /> Add style card</Button>
        </AccordionContent>
      </AccordionItem>
      </SectionEditor>

      <SectionEditor sectionKey="final_cta">
      <AccordionItem value="finalCta" className="rounded-xl border border-gray-200 bg-white px-4 shadow-sm">
        <AccordionTrigger className="text-[#4F5077] font-semibold hover:no-underline">
          <span className="flex items-center gap-2">
            <Layout className="h-4 w-4" /> Final Journey CTA
            <VisibilityBadge on={enabled("final_cta")} />
          </span>
        </AccordionTrigger>
        <AccordionContent className="space-y-3 pb-4">
          <Input value={finalCta.headline || ""} placeholder="Headline" onChange={(e) => set("final_cta", { ...finalCta, headline: e.target.value })} />
          <Input value={finalCta.tagline || ""} placeholder="Tagline (MOVE BETTER | ...)" onChange={(e) => set("final_cta", { ...finalCta, tagline: e.target.value })} />
          <FileUpload accept="image/*" label="Background image" currentUrl={finalCta.background_image} onUploaded={(url) => set("final_cta", { ...finalCta, background_image: url })} />
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <Input value={finalCta.primary_cta_text || ""} placeholder="Primary CTA text" onChange={(e) => set("final_cta", { ...finalCta, primary_cta_text: e.target.value })} />
            <Input value={finalCta.primary_cta_link || ""} placeholder="Primary CTA link" onChange={(e) => set("final_cta", { ...finalCta, primary_cta_link: e.target.value })} />
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={finalCta.show_add_to_cart !== false} onCheckedChange={(v) => set("final_cta", { ...finalCta, show_add_to_cart: v })} />
              Show Add to Cart
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={finalCta.show_view_all !== false} onCheckedChange={(v) => set("final_cta", { ...finalCta, show_view_all: v })} />
              Show View All Courses
            </label>
          </div>
        </AccordionContent>
      </AccordionItem>
      </SectionEditor>
    </Accordion>
    </div>
  )
}
