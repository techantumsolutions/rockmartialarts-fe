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
import { useToast } from "@/hooks/use-toast"

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface PageContent {
  /**
   * Controls which sections are visible on the public course detail page.
   * Default behavior: any key not explicitly set to false is treated as enabled.
   */
  section_visibility?: Partial<Record<
    | "hero"
    | "info_bar"
    | "about"
    | "cta"
    | "course_info_sections"
    | "course_content"
    | "benefits"
    | "learning"
    | "gallery"
    | "instructors"
    | "testimonials"
    | "attachments",
    boolean
  >>
  hero_section?: {
    title?: string
    subtitle?: string
    description?: string
    hero_image?: string
    cta_text?: string
    cta_link?: string
  }
  course_info?: {
    location?: string
    duration?: string
    price?: string
    training_time?: string
  }
  course_info_sections?: {
    title?: string
    content?: string
    bullet_points?: string[]
    image?: string
    layout?: "image_left" | "image_right"
  }[]
  about_section?: {
    title?: string
    aboutTitle?: string
    description?: string
    aboutDescription?: string
    secondary_description?: string
    image1?: string
    image2?: string
    /** Legacy demo blocks — stripped on course edit load; not shown on public site */
    content_blocks?: unknown[]
  }
  benefits?: { title: string; description: string; icon?: string }[]
  learning_section?: {
    title?: string
    description?: string
    video_url?: string
    thumbnail?: string
  }
  gallery_images?: string[]
  instructors?: {
    name: string
    designation: string
    bio?: string
    photo?: string
  }[]
  testimonials?: {
    name: string
    designation: string
    text: string
    photo?: string
  }[]
  pdf_attachments?: { title: string; file_url: string }[]
}

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

  const enabled = (key: keyof NonNullable<PageContent["section_visibility"]>) => visibility[key] !== false
  const setEnabled = (key: keyof NonNullable<PageContent["section_visibility"]>, on: boolean) =>
    set("section_visibility", { ...(visibility || {}), [key]: on })

  const VisibilityBadge = ({ on }: { on: boolean }) => (
    <span
      className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        on ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
      }`}
    >
      {on ? "Visible" : "Hidden"}
    </span>
  )

  return (
    <div className="space-y-5">
      {/* Section visibility grid (mockup-style) */}
      <div className="rounded-xl border border-gray-100 bg-[#FAFBFC] p-4">
        <div className="mb-3 flex items-center gap-2">
          <Info className="h-4 w-4 text-[#4F5077]" />
          <h4 className="text-sm font-semibold text-[#2F3153]">Section Visibility</h4>
        </div>
        <p className="mb-3 text-xs text-gray-500">
          Toggle sections on the public course detail page. Disabled sections stay hidden even if they have content.
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {([
            ["hero", "Hero Section"],
            ["info_bar", "Info Bar"],
            ["about", "About Course"],
            ["cta", "CTA Banner"],
            ["course_info_sections", "Course Info Blocks"],
            ["course_content", "Course Content"],
            ["benefits", "Benefits"],
            ["learning", "What You Will Learn"],
            ["gallery", "Gallery"],
            ["instructors", "Instructors"],
            ["testimonials", "Testimonials"],
            ["attachments", "Downloads / PDFs"],
          ] as const).map(([key, label]) => (
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
              <Label>CTA Button Text</Label>
              <Input value={hero.cta_text || ""} onChange={(e) => set("hero_section", { ...hero, cta_text: e.target.value })} placeholder="Register Now" />
            </div>
            <div className="space-y-1">
              <Label>CTA Button Link</Label>
              <Input value={hero.cta_link || ""} onChange={(e) => set("hero_section", { ...hero, cta_link: e.target.value })} placeholder="/register" />
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* ---- 3. About Section ---- */}
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

      {/* ---- 3a. Course Info Sections (60-40 / 40-60 alternating) ---- */}
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

      {/* ---- 4. Benefits ---- */}
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

      {/* ---- 5. Learning Section ---- */}
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

      {/* ---- 6. Gallery ---- */}
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

      {/* ---- 7. Instructors ---- */}
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

      {/* ---- 8. Testimonials ---- */}
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

      {/* ---- 9. PDF Attachments ---- */}
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
    </Accordion>
    </div>
  )
}
