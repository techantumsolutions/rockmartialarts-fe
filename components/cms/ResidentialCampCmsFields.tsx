"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { resolvePublicAssetUrl } from "@/lib/resolvePublicAssetUrl"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import type { ResidentialCampContent } from "@/lib/residentialCamp"
import {
  DEFAULT_RESIDENTIAL_CAMP,
  applyCampEventDetails,
  campEventPayload,
  campFactValue,
  parseFactDateRange,
  withSyncedHeroEyebrow,
} from "@/lib/residentialCamp"
import { TokenManager } from "@/lib/tokenManager"
import { getBackendApiUrl } from "@/lib/config"

type Props = {
  value: ResidentialCampContent
  onChange: (next: ResidentialCampContent) => void
  onHeroUpload: (file: File) => void
  onLogoUpload: (file: File) => void
  onCampIconUpload?: (index: number, file: File) => void
  onCampAboutUpload?: (file: File) => void
  onTrainingCardImageUpload?: (index: number, file: File) => void
  onMasterImageUpload?: (index: number, file: File) => void
  onLevelsBgUpload?: (file: File) => void
  onJourneyCtaBgUpload?: (file: File) => void
  onFooterLogoUpload?: (file: File) => void
  onFooterSocialIconUpload?: (network: "instagram" | "youtube" | "facebook", file: File) => void
  onFeatureBarIconUpload?: (index: number, file: File) => void
  onStartNewEvent?: () => void
  startingNewEvent?: boolean
}

export function ResidentialCampCmsFields({
  value,
  onChange,
  onHeroUpload,
  onLogoUpload,
  onCampAboutUpload,
  onTrainingCardImageUpload,
  onMasterImageUpload,
  onLevelsBgUpload,
  onJourneyCtaBgUpload,
  onFooterLogoUpload,
  onFooterSocialIconUpload,
  onFeatureBarIconUpload,
  onStartNewEvent,
  startingNewEvent,
}: Props) {
  const v = value || DEFAULT_RESIDENTIAL_CAMP
  const [eventSaveHint, setEventSaveHint] = useState("")
  const skipEventSave = useRef(true)
  const eventSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const patch = (partial: Partial<ResidentialCampContent>) => onChange({ ...v, ...partial })
  const patchEvent = (
    partial: Partial<
      Pick<ResidentialCampContent, "event_name" | "start_date" | "end_date" | "min_age" | "max_age" | "camp_fee" | "event_location">
    >,
  ) => onChange(applyCampEventDetails(v, partial))

  useEffect(() => {
    if (skipEventSave.current) {
      skipEventSave.current = false
      return
    }
    if (!v.event_id) return
    if (eventSaveTimer.current) clearTimeout(eventSaveTimer.current)
    eventSaveTimer.current = setTimeout(async () => {
      setEventSaveHint("Saving event…")
      try {
        const token = TokenManager.getToken()
        const res = await fetch(getBackendApiUrl(`cms/camp-events/${encodeURIComponent(v.event_id || "")}`), {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(campEventPayload(v)),
        })
        if (!res.ok) throw new Error("save failed")
        setEventSaveHint("Event saved")
      } catch {
        setEventSaveHint("Could not save event")
      }
    }, 600)
    return () => {
      if (eventSaveTimer.current) clearTimeout(eventSaveTimer.current)
    }
  }, [v.event_id, v.event_name, v.start_date, v.end_date, v.min_age, v.max_age, v.camp_fee, v.event_location])

  const datesFromFacts = parseFactDateRange(campFactValue(v, "Dates"))
  const ageFromFacts = (() => {
    const raw = campFactValue(v, "Age Group")
    const match = raw.match(/(\d+)\s*[–-]\s*(\d+)/)
    return { min: match?.[1] || "", max: match?.[2] || "" }
  })()

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-[#4F5077]">This camp event</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Event name</Label>
            <Input
              value={v.event_name || ""}
              onChange={(e) => patchEvent({ event_name: e.target.value })}
              placeholder="Dussehra Special – Shaolin Kungfu Residential Camp 2026"
            />
            <p className="text-xs text-gray-500">
              Stored on the current event document. Registrations use this Event ID. {eventSaveHint}
            </p>
          </div>
          <div className="space-y-2">
            <Label>Event ID</Label>
            <Input value={v.event_id || ""} readOnly className="bg-gray-50" placeholder="Generated event ID" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={v.start_date || datesFromFacts.start}
                onChange={(e) => patchEvent({ start_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={v.end_date || datesFromFacts.end}
                onChange={(e) => patchEvent({ end_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Min Age</Label>
              <Input
                type="number"
                min={1}
                placeholder="e.g. 6"
                value={v.min_age || ageFromFacts.min}
                onChange={(e) => patchEvent({ min_age: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Max Age</Label>
              <Input
                type="number"
                min={1}
                placeholder="e.g. 15"
                value={v.max_age || ageFromFacts.max}
                onChange={(e) => patchEvent({ max_age: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Camp Fee</Label>
              <Input
                placeholder="e.g. ₹15,000"
                value={v.camp_fee || v.schedule?.price?.amount || campFactValue(v, "Camp Fee")}
                onChange={(e) => patchEvent({ camp_fee: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input
                placeholder="e.g. Hyderabad"
                value={v.event_location || campFactValue(v, "Location")}
                onChange={(e) => patchEvent({ event_location: e.target.value })}
              />
            </div>
          </div>
          {onStartNewEvent ? (
            <Button type="button" variant="outline" onClick={onStartNewEvent} disabled={startingNewEvent}>
              {startingNewEvent ? "Starting…" : "Start new camp event"}
            </Button>
          ) : null}
          <p className="text-xs text-gray-500">
            Start new camp event archives the current event and creates a new Event ID immediately. You do not need Save
            All Changes for these event fields. Existing registrations stay on the previous event.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-[#4F5077]">Page SEO</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Meta Title</Label>
            <Input
              value={v.meta_title}
              onChange={(e) => patch({ meta_title: e.target.value })}
              placeholder="Shaolin Kungfu Residential Camp | Rock Martial Arts Academy"
            />
          </div>
          <div className="space-y-2">
            <Label>Meta Description</Label>
            <Textarea
              rows={2}
              value={v.meta_description}
              onChange={(e) => patch({ meta_description: e.target.value })}
              placeholder="Shaolin Kungfu Residential Camp by Rock Martial Arts Academy. Dates, location, age group and fee."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-[#4F5077]">In-page Navigation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Navbar logo</Label>
            <div className="flex items-center gap-4">
              {v.nav.logo ? (
                <div className="w-24 h-16 border rounded-lg overflow-hidden flex items-center justify-center bg-gray-50">
                  <img
                    src={resolvePublicAssetUrl(v.nav.logo)}
                    alt="Navbar logo"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              ) : null}
              <div className="flex-1 space-y-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) onLogoUpload(file)
                  }}
                  className="text-sm"
                />
                {v.nav.logo ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => patch({ nav: { ...v.nav, logo: "" } })}
                  >
                    Remove logo
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Registration Button Label</Label>
            <Input
              value={v.nav.link_register}
              onChange={(e) =>
                patch({
                  nav: {
                    ...v.nav,
                    link_register: e.target.value,
                    mobile_register_label: e.target.value,
                  },
                })
              }
              placeholder="Register Now"
            />
          </div>
          <div className="rounded-lg border p-4 space-y-3">
            <p className="text-sm font-medium text-[#4F5077]">
              Nav / footer section links (feature bar excluded)
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(
                [
                  ["link_home", "Home", "#top"],
                  ["link_camp", "About", "#camp"],
                  ["link_training", "Training", "#training"],
                  ["link_schedule", "Our Masters", "#masters"],
                  ["link_levels", "Levels", "#levels"],
                  ["link_journey", "Journey", "#journey"],
                ] as const
              ).map(([key, placeholder, anchor]) => (
                <div key={key} className="space-y-1">
                  <Label>
                    {placeholder}{" "}
                    <span className="text-xs text-muted-foreground font-normal">({anchor})</span>
                  </Label>
                  <Input
                    value={(v.nav[key] as string | undefined) || ""}
                    onChange={(e) => patch({ nav: { ...v.nav, [key]: e.target.value } })}
                    placeholder={placeholder}
                  />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-[#4F5077]">Hero</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Background Image</Label>
            <div className="flex items-center gap-4">
              {v.hero.hero_image ? (
                <div className="w-24 h-16 border rounded-lg overflow-hidden flex items-center justify-center bg-gray-50">
                  <img
                    src={resolvePublicAssetUrl(v.hero.hero_image) || v.hero.hero_image}
                    alt="Hero"
                    className="max-w-full max-h-full object-cover"
                  />
                </div>
              ) : null}
              <div className="flex-1">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) onHeroUpload(file)
                  }}
                  className="text-sm"
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-4 space-y-3">
            <p className="text-sm font-medium text-[#4F5077]">Left-side content</p>
            <div className="space-y-2">
              <Label>Eyebrow (dot-separated on site)</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input
                  value={v.hero.eyebrow_part1 || ""}
                  onChange={(e) =>
                    patch({
                      hero: withSyncedHeroEyebrow(v.hero, { eyebrow_part1: e.target.value }),
                    })
                  }
                  placeholder="TRADITIONAL"
                />
                <Input
                  value={v.hero.eyebrow_part2 || ""}
                  onChange={(e) =>
                    patch({
                      hero: withSyncedHeroEyebrow(v.hero, { eyebrow_part2: e.target.value }),
                    })
                  }
                  placeholder="AUTHENTIC"
                />
                <Input
                  value={v.hero.eyebrow_part3 || ""}
                  onChange={(e) =>
                    patch({
                      hero: withSyncedHeroEyebrow(v.hero, { eyebrow_part3: e.target.value }),
                    })
                  }
                  placeholder="TRANSFORMATIVE"
                />
              </div>
              <p className="text-xs text-gray-500">
                Shown as{" "}
                {[v.hero.eyebrow_part1, v.hero.eyebrow_part2, v.hero.eyebrow_part3]
                  .map((p) => (p || "").trim())
                  .filter(Boolean)
                  .join(" • ") || "TRADITIONAL • AUTHENTIC • TRANSFORMATIVE"}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Title line 1 (yellow)</Label>
                <Input
                  value={v.hero.h1_line1}
                  onChange={(e) => patch({ hero: { ...v.hero, h1_line1: e.target.value } })}
                  placeholder="Shaolin"
                />
              </div>
              <div className="space-y-2">
                <Label>Title line 2 (white)</Label>
                <Input
                  value={v.hero.h1_line2}
                  onChange={(e) => patch({ hero: { ...v.hero, h1_line2: e.target.value } })}
                  placeholder="Kung Fu"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Subheadline</Label>
              <Input
                value={v.hero.h2}
                onChange={(e) => patch({ hero: { ...v.hero, h2: e.target.value } })}
                placeholder="Train your body. Train your mind. Build your warrior spirit."
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                rows={2}
                value={v.hero.paragraph}
                onChange={(e) => patch({ hero: { ...v.hero, paragraph: e.target.value } })}
                placeholder="Authentic Shaolin Kung Fu training in Hyderabad at Rock Martial Arts Academy."
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Primary button label</Label>
                <Input
                  value={v.hero.cta_primary_label}
                  onChange={(e) =>
                    patch({ hero: { ...v.hero, cta_primary_label: e.target.value } })
                  }
                  placeholder="Join Now"
                />
              </div>
              <div className="space-y-2">
                <Label>Secondary button label</Label>
                <Input
                  value={v.hero.cta_whatsapp_label}
                  onChange={(e) =>
                    patch({ hero: { ...v.hero, cta_whatsapp_label: e.target.value } })
                  }
                  placeholder="Book a Trial Class"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Calligraphy text</Label>
              <Input
                value={v.hero.calligraphy_text || ""}
                onChange={(e) =>
                  patch({ hero: { ...v.hero, calligraphy_text: e.target.value } })
                }
                placeholder="少林功夫"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Quote</Label>
                <Input
                  value={v.hero.quote_text || ""}
                  onChange={(e) => patch({ hero: { ...v.hero, quote_text: e.target.value } })}
                  placeholder="Not a fighter, a warrior."
                />
              </div>
              <div className="space-y-2">
                <Label>Quote author</Label>
                <Input
                  value={v.hero.quote_author || ""}
                  onChange={(e) =>
                    patch({ hero: { ...v.hero, quote_author: e.target.value } })
                  }
                  placeholder="Deva"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-lg border px-3 py-2">
            <Label htmlFor="hero-cta-primary-enabled">Show primary button</Label>
            <Switch
              id="hero-cta-primary-enabled"
              checked={v.hero.cta_primary_enabled !== false}
              onCheckedChange={(checked) =>
                patch({ hero: { ...v.hero, cta_primary_enabled: checked } })
              }
            />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg border px-3 py-2">
            <Label htmlFor="hero-cta-secondary-enabled">Show secondary button</Label>
            <Switch
              id="hero-cta-secondary-enabled"
              checked={v.hero.cta_secondary_enabled !== false}
              onCheckedChange={(checked) =>
                patch({ hero: { ...v.hero, cta_secondary_enabled: checked } })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Secondary button URL</Label>
            <Input
              value={v.hero.whatsapp_url}
              onChange={(e) => patch({ hero: { ...v.hero, whatsapp_url: e.target.value } })}
              placeholder="https://wa.me/918179941226"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-[#4F5077]">Feature Bar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(v.feature_bar?.length
            ? v.feature_bar
            : DEFAULT_RESIDENTIAL_CAMP.feature_bar || []
          ).map((item, i) => {
            const previewIcon =
              resolvePublicAssetUrl((item.icon_image || "").trim()) ||
              (item.icon_image || "").trim()
            return (
            <div
              key={i}
              className={`rounded-lg border p-4 space-y-3 ${item.enabled === false ? "opacity-60" : ""}`}
            >
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor={`feature-bar-enabled-${i}`}>Show on website</Label>
                <Switch
                  id={`feature-bar-enabled-${i}`}
                  checked={item.enabled !== false}
                  onCheckedChange={(checked) => {
                    const base = v.feature_bar?.length
                      ? v.feature_bar
                      : DEFAULT_RESIDENTIAL_CAMP.feature_bar || []
                    const feature_bar = base.map((row, idx) =>
                      idx === i ? { ...row, enabled: checked } : row
                    )
                    patch({ feature_bar })
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Label</Label>
                <Input
                  value={item.label}
                  placeholder={
                    DEFAULT_RESIDENTIAL_CAMP.feature_bar?.[i]?.label ||
                    "e.g. Physical Fitness"
                  }
                  onChange={(e) => {
                    const base = v.feature_bar?.length
                      ? v.feature_bar
                      : DEFAULT_RESIDENTIAL_CAMP.feature_bar || []
                    const feature_bar = base.map((row, idx) =>
                      idx === i ? { ...row, label: e.target.value } : row
                    )
                    patch({ feature_bar })
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Icon image</Label>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 border rounded-lg overflow-hidden flex items-center justify-center bg-gray-50 shrink-0 text-[10px] text-muted-foreground text-center px-1">
                    {previewIcon ? (
                      <img
                        src={previewIcon}
                        alt=""
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      "No icon"
                    )}
                  </div>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file && onFeatureBarIconUpload) onFeatureBarIconUpload(i, file)
                    }}
                    className="text-sm"
                  />
                </div>
                {item.icon_image ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const base = v.feature_bar?.length
                        ? v.feature_bar
                        : DEFAULT_RESIDENTIAL_CAMP.feature_bar || []
                      const feature_bar = base.map((row, idx) =>
                        idx === i ? { ...row, icon_image: "" } : row
                      )
                      patch({ feature_bar })
                    }}
                  >
                    Remove icon image
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Upload an icon — no default campaign image is used.
                  </p>
                )}
              </div>
            </div>
            )
          })}
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              patch({
                feature_bar: [
                  ...(v.feature_bar?.length
                    ? v.feature_bar
                    : DEFAULT_RESIDENTIAL_CAMP.feature_bar || []),
                  {
                    label: "",
                    icon_key: "",
                    icon_image: "",
                    enabled: true,
                  },
                ],
              })
            }
          >
            Add feature item
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-[#4F5077]">Camp Section</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Right Image</Label>
            <div className="flex items-center gap-4">
              <div className="w-28 h-16 border rounded-lg overflow-hidden flex items-center justify-center bg-gray-50">
                <img
                  src={
                    resolvePublicAssetUrl(v.camp.about_image || "/campaign/aboutsection.png") ||
                    v.camp.about_image ||
                    "/campaign/aboutsection.png"
                  }
                  alt="Camp about"
                  className="max-w-full max-h-full object-cover"
                />
              </div>
              <div className="flex-1">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file && onCampAboutUpload) onCampAboutUpload(file)
                  }}
                  className="text-sm"
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-4 space-y-3">
            <p className="text-sm font-medium text-[#4F5077]">Left-side content</p>
            <div className="space-y-2">
              <Label>Eyebrow</Label>
              <Input
                value={v.camp.kicker}
                onChange={(e) => patch({ camp: { ...v.camp, kicker: e.target.value } })}
                placeholder="ABOUT"
              />
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={v.camp.h2}
                onChange={(e) => patch({ camp: { ...v.camp, h2: e.target.value } })}
                placeholder="SHAOLIN KUNG FU"
              />
            </div>
            <div className="space-y-2">
              <Label>Description 1</Label>
              <Textarea
                rows={3}
                value={v.camp.paragraph_1 || ""}
                onChange={(e) => patch({ camp: { ...v.camp, paragraph_1: e.target.value } })}
                placeholder="Shaolin Kung Fu is a traditional Chinese martial art that combines physical training, martial techniques, flexibility, discipline and mental focus."
              />
            </div>
            <div className="space-y-2">
              <Label>Description 2</Label>
              <Textarea
                rows={3}
                value={v.camp.paragraph_2 || ""}
                onChange={(e) => patch({ camp: { ...v.camp, paragraph_2: e.target.value } })}
                placeholder="At Rock Martial Arts Academy, we offer structured and authentic Shaolin Kung Fu training for children, teenagers and adults."
              />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
              <Label htmlFor="camp-cta-enabled">Show CTA button</Label>
              <Switch
                id="camp-cta-enabled"
                checked={v.camp.cta_enabled !== false}
                onCheckedChange={(checked) =>
                  patch({ camp: { ...v.camp, cta_enabled: checked } })
                }
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>CTA Label</Label>
                <Input
                  value={v.camp.cta_label || ""}
                  onChange={(e) => patch({ camp: { ...v.camp, cta_label: e.target.value } })}
                  placeholder="LEARN MORE"
                />
              </div>
              <div className="space-y-2">
                <Label>CTA URL</Label>
                <Input
                  value={v.camp.cta_href || ""}
                  onChange={(e) => patch({ camp: { ...v.camp, cta_href: e.target.value } })}
                  placeholder="#training"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-[#4F5077]">Training Section</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <Label htmlFor="training-section-enabled">Show section on website</Label>
            <Switch
              id="training-section-enabled"
              checked={v.training.enabled !== false}
              onCheckedChange={(checked) =>
                patch({ training: { ...v.training, enabled: checked } })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Section Title</Label>
            <Input
              value={v.training.h2}
              onChange={(e) => patch({ training: { ...v.training, h2: e.target.value } })}
              placeholder="OUR TRAINING PROGRAM"
            />
          </div>
          {v.training.cards.map((card, i) => {
            const description = card.description || ""
            const preview =
              resolvePublicAssetUrl((card.image || "").trim()) || (card.image || "").trim()
            return (
              <div
                key={i}
                className={`rounded-lg border p-4 space-y-3 ${card.enabled === false ? "opacity-60" : ""}`}
              >
                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor={`training-card-enabled-${i}`}>Show on website</Label>
                  <Switch
                    id={`training-card-enabled-${i}`}
                    checked={card.enabled !== false}
                    onCheckedChange={(checked) => {
                      const cards = v.training.cards.map((c, idx) =>
                        idx === i ? { ...c, enabled: checked } : c
                      )
                      patch({ training: { ...v.training, cards } })
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Image</Label>
                  <div className="flex items-center gap-3">
                    <div className="w-20 h-14 border rounded-lg overflow-hidden flex items-center justify-center bg-gray-50 shrink-0 text-[10px] text-muted-foreground text-center px-1">
                      {preview ? (
                        <img
                          src={preview}
                          alt=""
                          className="max-w-full max-h-full object-cover"
                        />
                      ) : (
                        "No image"
                      )}
                    </div>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file && onTrainingCardImageUpload) onTrainingCardImageUpload(i, file)
                      }}
                      className="text-sm"
                    />
                  </div>
                  {card.image ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const cards = v.training.cards.map((c, idx) =>
                          idx === i ? { ...c, image: "" } : c
                        )
                        patch({ training: { ...v.training, cards } })
                      }}
                    >
                      Remove image
                    </Button>
                  ) : (
                    <p className="text-xs text-muted-foreground">Upload an image — no default campaign image is used.</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={card.title}
                    onChange={(e) => {
                      const cards = v.training.cards.map((c, idx) =>
                        idx === i ? { ...c, title: e.target.value } : c
                      )
                      patch({ training: { ...v.training, cards } })
                    }}
                    placeholder={
                      DEFAULT_RESIDENTIAL_CAMP.training.cards[i]?.title || "e.g. Stances & Forms"
                    }
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label>Description</Label>
                    <span className="text-xs text-muted-foreground">{description.length}/100</span>
                  </div>
                  <Textarea
                    rows={2}
                    maxLength={100}
                    value={description}
                    onChange={(e) => {
                      const next = e.target.value.slice(0, 100)
                      const cards = v.training.cards.map((c, idx) =>
                        idx === i ? { ...c, description: next } : c
                      )
                      patch({ training: { ...v.training, cards } })
                    }}
                    placeholder="Short description (max 100 characters)"
                  />
                </div>
              </div>
            )
          })}
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              patch({
                training: {
                  ...v.training,
                  cards: [
                    ...v.training.cards,
                    { title: "", description: "", image: "", bullets: [], enabled: true },
                  ],
                },
              })
            }
          >
            Add training card
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-[#4F5077]">Schedule & Pricing — Masters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {((v.schedule.masters?.length
            ? v.schedule.masters
            : DEFAULT_RESIDENTIAL_CAMP.schedule.masters) || []
          ).map((master, i) => {
            const preview =
              resolvePublicAssetUrl(master.image || "") ||
              master.image ||
              `/campaign/master${(i % 2) + 1}.png`
            const patchMaster = (partial: Partial<typeof master>) => {
              const base =
                v.schedule.masters?.length
                  ? v.schedule.masters
                  : DEFAULT_RESIDENTIAL_CAMP.schedule.masters || []
              const masters = base.map((m, idx) => (idx === i ? { ...m, ...partial } : m))
              patch({ schedule: { ...v.schedule, masters } })
            }
            return (
              <div
                key={i}
                className={`rounded-lg border p-4 space-y-3 ${master.enabled === false ? "opacity-60" : ""}`}
              >
                <p className="text-sm font-medium text-[#4F5077]">
                  {i === 0 ? "Left column" : "Right column"}
                </p>
                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor={`master-enabled-${i}`}>Show on website</Label>
                  <Switch
                    id={`master-enabled-${i}`}
                    checked={master.enabled !== false}
                    onCheckedChange={(checked) => patchMaster({ enabled: checked })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Image</Label>
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-20 border rounded-lg overflow-hidden flex items-center justify-center bg-gray-50 shrink-0">
                      <img src={preview} alt="" className="max-w-full max-h-full object-cover" />
                    </div>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file && onMasterImageUpload) onMasterImageUpload(i, file)
                      }}
                      className="text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Section Title</Label>
                  <Input
                    value={master.title}
                    onChange={(e) => patchMaster({ title: e.target.value })}
                    placeholder="OUR SHAOLIN LINEAGE"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Trainer Name</Label>
                  <Input
                    value={master.name}
                    onChange={(e) => patchMaster({ name: e.target.value })}
                    placeholder="MASTER DEVARAJU"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Designation</Label>
                  <Input
                    value={master.designation}
                    onChange={(e) => patchMaster({ designation: e.target.value })}
                    placeholder="Shaolin Kung Fu Coach"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    rows={4}
                    value={master.description}
                    onChange={(e) => patchMaster({ description: e.target.value })}
                    placeholder="Brief trainer biography and teaching focus."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Quotation</Label>
                  <Input
                    value={master.quote}
                    onChange={(e) => patchMaster({ quote: e.target.value })}
                    placeholder="NOT A FIGHTER, A WARRIOR."
                  />
                </div>
              </div>
            )
          })}
          <div className="rounded-lg border p-4 space-y-3">
            <p className="text-sm font-medium text-[#4F5077]">Registration pricing (not shown in this section)</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fee label</Label>
                <Input
                  value={v.schedule.price.label}
                  onChange={(e) =>
                    patch({ schedule: { ...v.schedule, price: { ...v.schedule.price, label: e.target.value } } })
                  }
                  placeholder="Camp Fee"
                />
              </div>
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input
                  value={v.schedule.price.amount}
                  onChange={(e) =>
                    patch({ schedule: { ...v.schedule, price: { ...v.schedule.price, amount: e.target.value } } })
                  }
                  placeholder="₹15,000"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Includes text</Label>
                <Input
                  value={v.schedule.price.includes_text}
                  onChange={(e) =>
                    patch({
                      schedule: { ...v.schedule, price: { ...v.schedule.price, includes_text: e.target.value } },
                    })
                  }
                  placeholder="Includes training, accommodation and meals"
                />
              </div>
              <div className="space-y-2">
                <Label>Pay now title</Label>
                <Input
                  value={v.schedule.price.pay_now_title}
                  onChange={(e) =>
                    patch({
                      schedule: { ...v.schedule, price: { ...v.schedule.price, pay_now_title: e.target.value } },
                    })
                  }
                  placeholder="Pay now to confirm"
                />
              </div>
              <div className="space-y-2">
                <Label>Pay now subtitle</Label>
                <Input
                  value={v.schedule.price.pay_now_subtitle}
                  onChange={(e) =>
                    patch({
                      schedule: { ...v.schedule, price: { ...v.schedule.price, pay_now_subtitle: e.target.value } },
                    })
                  }
                  placeholder="Limited seats available"
                />
              </div>
              <div className="space-y-2">
                <Label>Refund label</Label>
                <Input
                  value={v.schedule.price.refund_label}
                  onChange={(e) =>
                    patch({
                      schedule: { ...v.schedule, price: { ...v.schedule.price, refund_label: e.target.value } },
                    })
                  }
                  placeholder="Refund policy:"
                />
              </div>
              <div className="space-y-2">
                <Label>Refund text</Label>
                <Input
                  value={v.schedule.price.refund_text}
                  onChange={(e) =>
                    patch({
                      schedule: { ...v.schedule, price: { ...v.schedule.price, refund_text: e.target.value } },
                    })
                  }
                  placeholder="Registration/payment is non-refundable once confirmed."
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Price CTA</Label>
                <Input
                  value={v.schedule.price.cta_label}
                  onChange={(e) =>
                    patch({ schedule: { ...v.schedule, price: { ...v.schedule.price, cta_label: e.target.value } } })
                  }
                  placeholder="Secure Your Seat"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-[#4F5077]">Registration Pricing — Levels</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(() => {
            const levels = {
              ...DEFAULT_RESIDENTIAL_CAMP.levels!,
              ...(v.levels || {}),
              cards:
                v.levels?.cards?.length
                  ? v.levels.cards
                  : DEFAULT_RESIDENTIAL_CAMP.levels?.cards || [],
              panels:
                v.levels?.panels?.length
                  ? v.levels.panels
                  : DEFAULT_RESIDENTIAL_CAMP.levels?.panels || [],
            }
            const patchLevels = (partial: Partial<typeof levels>) =>
              patch({ levels: { ...levels, ...partial } })
            return (
              <>
                <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                  <Label htmlFor="levels-enabled">Show section on website</Label>
                  <Switch
                    id="levels-enabled"
                    checked={levels.enabled !== false}
                    onCheckedChange={(checked) => patchLevels({ enabled: checked })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Background Image</Label>
                  <div className="flex items-center gap-4">
                    <div className="w-28 h-16 border rounded-lg overflow-hidden bg-gray-50">
                      <img
                        src={
                          resolvePublicAssetUrl(levels.background_image || "/campaign/levelbg.png") ||
                          "/campaign/levelbg.png"
                        }
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <Input
                      type="file"
                      accept="image/*"
                      className="text-sm"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file && onLevelsBgUpload) onLevelsBgUpload(file)
                      }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Section Title</Label>
                  <Input
                    value={levels.h2}
                    onChange={(e) => patchLevels({ h2: e.target.value })}
                    placeholder="TRAINING FOR EVERY LEVEL"
                  />
                </div>
                <p className="text-sm font-medium text-[#4F5077]">Level cards</p>
                {levels.cards.map((card, i) => (
                  <div
                    key={i}
                    className={`rounded-lg border p-4 space-y-3 ${card.enabled === false ? "opacity-60" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <Label htmlFor={`level-card-enabled-${i}`}>Show card</Label>
                      <Switch
                        id={`level-card-enabled-${i}`}
                        checked={card.enabled !== false}
                        onCheckedChange={(checked) => {
                          const cards = levels.cards.map((c, idx) =>
                            idx === i ? { ...c, enabled: checked } : c
                          )
                          patchLevels({ cards })
                        }}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Title</Label>
                        <Input
                          value={card.title}
                          onChange={(e) => {
                            const cards = levels.cards.map((c, idx) =>
                              idx === i ? { ...c, title: e.target.value } : c
                            )
                            patchLevels({ cards })
                          }}
                          placeholder={
                            DEFAULT_RESIDENTIAL_CAMP.levels?.cards?.[i]?.title || "e.g. BEGINNER"
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Background color</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={card.color || "#8f9a3a"}
                            onChange={(e) => {
                              const cards = levels.cards.map((c, idx) =>
                                idx === i ? { ...c, color: e.target.value } : c
                              )
                              patchLevels({ cards })
                            }}
                            className="w-14 p-1 h-10"
                          />
                          <Input
                            value={card.color || ""}
                            onChange={(e) => {
                              const cards = levels.cards.map((c, idx) =>
                                idx === i ? { ...c, color: e.target.value } : c
                              )
                              patchLevels({ cards })
                            }}
                            placeholder="#8f9a3a"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        rows={2}
                        value={card.description}
                        onChange={(e) => {
                          const cards = levels.cards.map((c, idx) =>
                            idx === i ? { ...c, description: e.target.value } : c
                          )
                          patchLevels({ cards })
                        }}
                        placeholder={
                          DEFAULT_RESIDENTIAL_CAMP.levels?.cards?.[i]?.description ||
                          "e.g. Learn the fundamentals. No experience needed."
                        }
                      />
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    patchLevels({
                      cards: [
                        ...levels.cards,
                        { title: "", description: "", color: "#8f9a3a", enabled: true },
                      ],
                    })
                  }
                >
                  Add level card
                </Button>

                <p className="text-sm font-medium text-[#4F5077] pt-2">Info panels</p>
                {levels.panels.map((panel, i) => (
                  <div
                    key={i}
                    className={`rounded-lg border p-4 space-y-3 ${panel.enabled === false ? "opacity-60" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <Label htmlFor={`level-panel-enabled-${i}`}>Show panel</Label>
                      <Switch
                        id={`level-panel-enabled-${i}`}
                        checked={panel.enabled !== false}
                        onCheckedChange={(checked) => {
                          const panels = levels.panels.map((p, idx) =>
                            idx === i ? { ...p, enabled: checked } : p
                          )
                          patchLevels({ panels })
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Input
                        value={panel.title}
                        onChange={(e) => {
                          const panels = levels.panels.map((p, idx) =>
                            idx === i ? { ...p, title: e.target.value } : p
                          )
                          patchLevels({ panels })
                        }}
                        placeholder={
                          DEFAULT_RESIDENTIAL_CAMP.levels?.panels?.[i]?.title || "e.g. What's Included"
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        rows={2}
                        value={panel.description}
                        onChange={(e) => {
                          const panels = levels.panels.map((p, idx) =>
                            idx === i ? { ...p, description: e.target.value } : p
                          )
                          patchLevels({ panels })
                        }}
                        placeholder="Short panel description"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Checklist (one per line)</Label>
                      <Textarea
                        rows={4}
                        value={(panel.bullets || []).join("\n")}
                        onChange={(e) => {
                          const bullets = e.target.value.split("\n")
                          const panels = levels.panels.map((p, idx) =>
                            idx === i ? { ...p, bullets } : p
                          )
                          patchLevels({ panels })
                        }}
                        placeholder={"Training sessions\nAccommodation\nMeals"}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                      <Label htmlFor={`level-panel-cta-enabled-${i}`}>Show CTA button</Label>
                      <Switch
                        id={`level-panel-cta-enabled-${i}`}
                        checked={panel.cta_enabled !== false}
                        onCheckedChange={(checked) => {
                          const panels = levels.panels.map((p, idx) =>
                            idx === i ? { ...p, cta_enabled: checked } : p
                          )
                          patchLevels({ panels })
                        }}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>CTA Label</Label>
                        <Input
                          value={panel.cta_label}
                          onChange={(e) => {
                            const panels = levels.panels.map((p, idx) =>
                              idx === i ? { ...p, cta_label: e.target.value } : p
                            )
                            patchLevels({ panels })
                          }}
                          placeholder="REGISTER NOW"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>CTA URL</Label>
                        <Input
                          value={panel.cta_href}
                          onChange={(e) => {
                            const panels = levels.panels.map((p, idx) =>
                              idx === i ? { ...p, cta_href: e.target.value } : p
                            )
                            patchLevels({ panels })
                          }}
                          placeholder="#camp"
                          disabled={panel.cta_enabled === false}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                      <Label htmlFor={`level-panel-register-${i}`}>CTA opens registration modal</Label>
                      <Switch
                        id={`level-panel-register-${i}`}
                        checked={panel.cta_opens_register === true}
                        disabled={panel.cta_enabled === false}
                        onCheckedChange={(checked) => {
                          const panels = levels.panels.map((p, idx) =>
                            idx === i ? { ...p, cta_opens_register: checked } : p
                          )
                          patchLevels({ panels })
                        }}
                      />
                    </div>
                  </div>
                ))}
              </>
            )
          })()}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-[#4F5077]">Journey CTA (above footer)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(() => {
            const jc = {
              ...DEFAULT_RESIDENTIAL_CAMP.journey_cta!,
              ...(v.journey_cta || {}),
            }
            const patchJourney = (partial: Partial<typeof jc>) =>
              patch({ journey_cta: { ...jc, ...partial } })
            return (
              <>
                <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                  <Label htmlFor="journey-cta-enabled">Show section on website</Label>
                  <Switch
                    id="journey-cta-enabled"
                    checked={jc.enabled !== false}
                    onCheckedChange={(checked) => patchJourney({ enabled: checked })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Background Image</Label>
                  <div className="flex items-center gap-4">
                    <div className="w-28 h-16 border rounded-lg overflow-hidden bg-gray-50">
                      <img
                        src={
                          resolvePublicAssetUrl(jc.background_image || "/campaign/ctabg.png") ||
                          "/campaign/ctabg.png"
                        }
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <Input
                      type="file"
                      accept="image/*"
                      className="text-sm"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file && onJourneyCtaBgUpload) onJourneyCtaBgUpload(file)
                      }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Title line 1 (yellow)</Label>
                  <Input
                    value={jc.title_line1}
                    onChange={(e) => patchJourney({ title_line1: e.target.value })}
                    placeholder="START YOUR"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Title line 2 (white)</Label>
                  <Input
                    value={jc.title_line2}
                    onChange={(e) => patchJourney({ title_line2: e.target.value })}
                    placeholder="SHAOLIN JOURNEY TODAY"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    value={jc.description}
                    onChange={(e) => patchJourney({ description: e.target.value })}
                    placeholder="A STRONGER BODY. A CALMER MIND. A BRIGHTER FUTURE."
                  />
                </div>
                <div className="rounded-lg border p-4 space-y-3">
                  <p className="text-sm font-medium text-[#4F5077]">Primary CTA</p>
                  <div className="flex items-center justify-between gap-4">
                    <Label htmlFor="journey-primary-enabled">Show button</Label>
                    <Switch
                      id="journey-primary-enabled"
                      checked={jc.cta_primary_enabled !== false}
                      onCheckedChange={(checked) =>
                        patchJourney({ cta_primary_enabled: checked })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Label</Label>
                    <Input
                      value={jc.cta_primary_label}
                      onChange={(e) => patchJourney({ cta_primary_label: e.target.value })}
                      disabled={jc.cta_primary_enabled === false}
                      placeholder="REGISTER NOW"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <Label htmlFor="journey-primary-register">Opens registration modal</Label>
                    <Switch
                      id="journey-primary-register"
                      checked={jc.cta_primary_opens_register !== false}
                      disabled={jc.cta_primary_enabled === false}
                      onCheckedChange={(checked) =>
                        patchJourney({ cta_primary_opens_register: checked })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>URL (when modal is off)</Label>
                    <Input
                      value={jc.cta_primary_href || ""}
                      onChange={(e) => patchJourney({ cta_primary_href: e.target.value })}
                      disabled={
                        jc.cta_primary_enabled === false ||
                        jc.cta_primary_opens_register !== false
                      }
                      placeholder="#register"
                    />
                  </div>
                </div>
                <div className="rounded-lg border p-4 space-y-3">
                  <p className="text-sm font-medium text-[#4F5077]">Secondary CTA</p>
                  <div className="flex items-center justify-between gap-4">
                    <Label htmlFor="journey-secondary-enabled">Show button</Label>
                    <Switch
                      id="journey-secondary-enabled"
                      checked={jc.cta_secondary_enabled !== false}
                      onCheckedChange={(checked) =>
                        patchJourney({ cta_secondary_enabled: checked })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Label</Label>
                    <Input
                      value={jc.cta_secondary_label}
                      onChange={(e) => patchJourney({ cta_secondary_label: e.target.value })}
                      disabled={jc.cta_secondary_enabled === false}
                      placeholder="BOOK A TRIAL CLASS"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>URL</Label>
                    <Input
                      value={jc.cta_secondary_href || ""}
                      onChange={(e) => patchJourney({ cta_secondary_href: e.target.value })}
                      disabled={jc.cta_secondary_enabled === false}
                      placeholder="https://wa.me/..."
                    />
                  </div>
                </div>
              </>
            )
          })()}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-[#4F5077]">Footer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Logo</Label>
            <div className="flex items-center gap-4">
              {(v.footer.logo || v.nav.logo) ? (
                <div className="w-24 h-12 border rounded-lg overflow-hidden flex items-center justify-center bg-gray-50">
                  <img
                    src={
                      resolvePublicAssetUrl(v.footer.logo || v.nav.logo || "") ||
                      v.footer.logo ||
                      v.nav.logo ||
                      ""
                    }
                    alt=""
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              ) : null}
              <Input
                type="file"
                accept="image/*"
                className="text-sm"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file && onFooterLogoUpload) onFooterLogoUpload(file)
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">Falls back to navbar logo if empty.</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label>Description</Label>
              <span className="text-xs text-muted-foreground">
                {(v.footer.description || v.footer.tagline || "").length}/60
              </span>
            </div>
            <Input
              maxLength={60}
              value={v.footer.description || v.footer.tagline || ""}
              onChange={(e) => {
                const description = e.target.value.slice(0, 60)
                patch({
                  footer: {
                    ...v.footer,
                    description,
                    tagline: description,
                  },
                })
              }}
              placeholder="Become the Strongest Version of Yourself"
            />
          </div>
          <p className="text-sm font-medium text-[#4F5077]">
            Nav links match the navbar section links (feature bar excluded). Edit labels under In-page Navigation.
          </p>
          {(["instagram", "youtube", "facebook"] as const).map((network) => {
            const urlKey =
              network === "instagram"
                ? "social_instagram_url"
                : network === "youtube"
                  ? "social_youtube_url"
                  : "social_facebook_url"
            const iconKey =
              network === "instagram"
                ? "social_instagram_icon"
                : network === "youtube"
                  ? "social_youtube_icon"
                  : "social_facebook_icon"
            const iconVal = v.footer[iconKey] || ""
            return (
              <div key={network} className="rounded-lg border p-4 space-y-3">
                <p className="text-sm font-medium text-[#4F5077] capitalize">{network}</p>
                <div className="space-y-2">
                  <Label>URL</Label>
                  <Input
                    value={v.footer[urlKey] || ""}
                    onChange={(e) =>
                      patch({ footer: { ...v.footer, [urlKey]: e.target.value } })
                    }
                    placeholder={`https://${network}.com/...`}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Icon (optional)</Label>
                  <div className="flex items-center gap-3">
                    {iconVal ? (
                      <div className="w-10 h-10 border rounded-full overflow-hidden flex items-center justify-center bg-gray-50">
                        <img
                          src={resolvePublicAssetUrl(iconVal) || iconVal}
                          alt=""
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                    ) : null}
                    <Input
                      type="file"
                      accept="image/*"
                      className="text-sm"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file && onFooterSocialIconUpload) onFooterSocialIconUpload(network, file)
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Uses a default icon if empty.</p>
                </div>
              </div>
            )
          })}
          <div className="rounded-lg border p-4 space-y-3">
            <p className="text-sm font-medium text-[#4F5077]">CTA button</p>
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="footer-cta-enabled">Show button</Label>
              <Switch
                id="footer-cta-enabled"
                checked={v.footer.cta_enabled !== false}
                onCheckedChange={(checked) =>
                  patch({ footer: { ...v.footer, cta_enabled: checked } })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Label</Label>
              <Input
                value={v.footer.cta_label || ""}
                onChange={(e) => patch({ footer: { ...v.footer, cta_label: e.target.value } })}
                placeholder="ENQUIRE NOW"
                disabled={v.footer.cta_enabled === false}
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="footer-cta-register">Opens registration modal</Label>
              <Switch
                id="footer-cta-register"
                checked={v.footer.cta_opens_register !== false}
                disabled={v.footer.cta_enabled === false}
                onCheckedChange={(checked) =>
                  patch({ footer: { ...v.footer, cta_opens_register: checked } })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>URL (when modal is off)</Label>
              <Input
                value={v.footer.cta_href || ""}
                onChange={(e) => patch({ footer: { ...v.footer, cta_href: e.target.value } })}
                placeholder="#register"
                disabled={
                  v.footer.cta_enabled === false || v.footer.cta_opens_register !== false
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Academy name (tickets / internal)</Label>
            <Input
              value={v.footer.academy_name}
              onChange={(e) => patch({ footer: { ...v.footer, academy_name: e.target.value } })}
              placeholder="ROCK MARTIAL ARTS ACADEMY"
            />
          </div>
          <div className="space-y-2">
            <Label>Camp line (tickets / internal)</Label>
            <Input
              value={v.footer.camp_line}
              onChange={(e) => patch({ footer: { ...v.footer, camp_line: e.target.value } })}
              placeholder="Shaolin Kungfu Residential Camp • Hyderabad • 22–26 September 2026"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
