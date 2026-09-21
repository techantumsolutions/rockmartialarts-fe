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
  campCardIconImage,
  campEventPayload,
  campFactValue,
  parseFactDateRange,
} from "@/lib/residentialCamp"
import { TokenManager } from "@/lib/tokenManager"
import { getBackendApiUrl } from "@/lib/config"

type Props = {
  value: ResidentialCampContent
  onChange: (next: ResidentialCampContent) => void
  onHeroUpload: (file: File) => void
  onLogoUpload: (file: File) => void
  onCampIconUpload: (index: number, file: File) => void
  onStartNewEvent?: () => void
  startingNewEvent?: boolean
}

export function ResidentialCampCmsFields({
  value,
  onChange,
  onHeroUpload,
  onLogoUpload,
  onCampIconUpload,
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
            <Input value={v.event_id || ""} readOnly className="bg-gray-50" />
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
            <Input value={v.meta_title} onChange={(e) => patch({ meta_title: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Meta Description</Label>
            <Textarea
              rows={2}
              value={v.meta_description}
              onChange={(e) => patch({ meta_description: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-[#4F5077]">Top Bar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Top bar text</Label>
            <Input value={v.topbar_text} onChange={(e) => patch({ topbar_text: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-[#4F5077]">In-page Navigation</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
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
                <p className="text-xs text-gray-500">
                  Shown on the left of the camp navbar. If empty, brand text is used.
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Brand prefix</Label>
            <Input
              value={v.nav.brand_prefix}
              onChange={(e) => patch({ nav: { ...v.nav, brand_prefix: e.target.value } })}
            />
          </div>
          <div className="space-y-2">
            <Label>Brand accent</Label>
            <Input
              value={v.nav.brand_accent}
              onChange={(e) => patch({ nav: { ...v.nav, brand_accent: e.target.value } })}
            />
          </div>
          <div className="space-y-2">
            <Label>Camp link label</Label>
            <Input value={v.nav.link_camp} onChange={(e) => patch({ nav: { ...v.nav, link_camp: e.target.value } })} />
          </div>
          <div className="space-y-2">
            <Label>Training link label</Label>
            <Input
              value={v.nav.link_training}
              onChange={(e) => patch({ nav: { ...v.nav, link_training: e.target.value } })}
            />
          </div>
          <div className="space-y-2">
            <Label>Schedule link label</Label>
            <Input
              value={v.nav.link_schedule}
              onChange={(e) => patch({ nav: { ...v.nav, link_schedule: e.target.value } })}
            />
          </div>
          <div className="space-y-2">
            <Label>Register link label</Label>
            <Input
              value={v.nav.link_register}
              onChange={(e) => patch({ nav: { ...v.nav, link_register: e.target.value } })}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Mobile register button</Label>
            <Input
              value={v.nav.mobile_register_label}
              onChange={(e) => patch({ nav: { ...v.nav, mobile_register_label: e.target.value } })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-[#4F5077]">Hero</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Hero Image</Label>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Eyebrow</Label>
              <Input value={v.hero.eyebrow} onChange={(e) => patch({ hero: { ...v.hero, eyebrow: e.target.value } })} />
            </div>
            <div className="space-y-2">
              <Label>H2</Label>
              <Input value={v.hero.h2} onChange={(e) => patch({ hero: { ...v.hero, h2: e.target.value } })} />
            </div>
            <div className="space-y-2">
              <Label>H1 line 1</Label>
              <Input value={v.hero.h1_line1} onChange={(e) => patch({ hero: { ...v.hero, h1_line1: e.target.value } })} />
            </div>
            <div className="space-y-2">
              <Label>H1 line 2 (yellow)</Label>
              <Input value={v.hero.h1_line2} onChange={(e) => patch({ hero: { ...v.hero, h1_line2: e.target.value } })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Paragraph</Label>
            <Textarea rows={3} value={v.hero.paragraph} onChange={(e) => patch({ hero: { ...v.hero, paragraph: e.target.value } })} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Register CTA label</Label>
              <Input
                value={v.hero.cta_primary_label}
                onChange={(e) => patch({ hero: { ...v.hero, cta_primary_label: e.target.value } })}
              />
            </div>
            <div className="space-y-2">
              <Label>WhatsApp button label</Label>
              <Input
                value={v.hero.cta_whatsapp_label}
                onChange={(e) => patch({ hero: { ...v.hero, cta_whatsapp_label: e.target.value } })}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>WhatsApp URL</Label>
              <Input
                value={v.hero.whatsapp_url}
                onChange={(e) => patch({ hero: { ...v.hero, whatsapp_url: e.target.value } })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-[#4F5077]">Camp Section</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Kicker</Label>
            <Input value={v.camp.kicker} onChange={(e) => patch({ camp: { ...v.camp, kicker: e.target.value } })} />
          </div>
          <div className="space-y-2">
            <Label>Heading</Label>
            <Input value={v.camp.h2} onChange={(e) => patch({ camp: { ...v.camp, h2: e.target.value } })} />
          </div>
          <div className="space-y-2">
            <Label>Lead</Label>
            <Textarea rows={3} value={v.camp.lead} onChange={(e) => patch({ camp: { ...v.camp, lead: e.target.value } })} />
          </div>
          {v.camp.cards.map((card, i) => (
            <div
              key={i}
              className={`rounded-lg border p-4 space-y-3 ${card.enabled === false ? "opacity-60" : ""}`}
            >
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor={`camp-card-enabled-${i}`}>Show on website</Label>
                <Switch
                  id={`camp-card-enabled-${i}`}
                  checked={card.enabled !== false}
                  onCheckedChange={(checked) => {
                    const cards = v.camp.cards.map((c, idx) =>
                      idx === i ? { ...c, enabled: checked } : c
                    )
                    patch({ camp: { ...v.camp, cards } })
                  }}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Icon</Label>
                  <div className="flex items-center gap-3">
                    {campCardIconImage(card) ? (
                      <div className="w-12 h-12 border rounded-lg overflow-hidden flex items-center justify-center bg-gray-50 shrink-0">
                        <img
                          src={
                            resolvePublicAssetUrl(campCardIconImage(card)) ||
                            campCardIconImage(card)
                          }
                          alt=""
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                    ) : card.icon ? (
                      <div className="w-12 h-12 border rounded-lg overflow-hidden flex items-center justify-center bg-gray-50 shrink-0 text-2xl">
                        {card.icon}
                      </div>
                    ) : null}
                    <div className="flex-1 min-w-0">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) onCampIconUpload(i, file)
                        }}
                        className="text-sm"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={card.title}
                    onChange={(e) => {
                      const cards = v.camp.cards.map((c, idx) => (idx === i ? { ...c, title: e.target.value } : c))
                      patch({ camp: { ...v.camp, cards } })
                    }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Text</Label>
                <Textarea
                  rows={2}
                  value={card.text}
                  onChange={(e) => {
                    const cards = v.camp.cards.map((c, idx) => (idx === i ? { ...c, text: e.target.value } : c))
                    patch({ camp: { ...v.camp, cards } })
                  }}
                />
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              patch({
                camp: {
                  ...v.camp,
                  cards: [...v.camp.cards, { icon: "", icon_image: "", title: "", text: "", enabled: true }],
                },
              })
            }
          >
            Add camp card
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-[#4F5077]">Training Section</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Kicker</Label>
            <Input
              value={v.training.kicker}
              onChange={(e) => patch({ training: { ...v.training, kicker: e.target.value } })}
            />
          </div>
          <div className="space-y-2">
            <Label>Heading</Label>
            <Input value={v.training.h2} onChange={(e) => patch({ training: { ...v.training, h2: e.target.value } })} />
          </div>
          {v.training.cards.map((card, i) => (
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
                <Label>Title</Label>
                <Input
                  value={card.title}
                  onChange={(e) => {
                    const cards = v.training.cards.map((c, idx) => (idx === i ? { ...c, title: e.target.value } : c))
                    patch({ training: { ...v.training, cards } })
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Bullets (one per line)</Label>
                <Textarea
                  rows={4}
                  value={card.bullets.join("\n")}
                  onChange={(e) => {
                    const bullets = e.target.value.split("\n")
                    const cards = v.training.cards.map((c, idx) => (idx === i ? { ...c, bullets } : c))
                    patch({ training: { ...v.training, cards } })
                  }}
                />
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              patch({
                training: {
                  ...v.training,
                  cards: [...v.training.cards, { title: "", bullets: [], enabled: true }],
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
          <CardTitle className="text-[#4F5077]">Schedule & Pricing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Kicker</Label>
            <Input
              value={v.schedule.kicker}
              onChange={(e) => patch({ schedule: { ...v.schedule, kicker: e.target.value } })}
            />
          </div>
          <div className="space-y-2">
            <Label>Heading</Label>
            <Input value={v.schedule.h2} onChange={(e) => patch({ schedule: { ...v.schedule, h2: e.target.value } })} />
          </div>
          {v.schedule.timeline.map((item, i) => (
            <div key={i} className="rounded-lg border p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Time label</Label>
                  <Input
                    value={item.time_label}
                    onChange={(e) => {
                      const timeline = v.schedule.timeline.map((t, idx) =>
                        idx === i ? { ...t, time_label: e.target.value } : t
                      )
                      patch({ schedule: { ...v.schedule, timeline } })
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={item.title}
                    onChange={(e) => {
                      const timeline = v.schedule.timeline.map((t, idx) =>
                        idx === i ? { ...t, title: e.target.value } : t
                      )
                      patch({ schedule: { ...v.schedule, timeline } })
                    }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Text</Label>
                <Textarea
                  rows={2}
                  value={item.text}
                  onChange={(e) => {
                    const timeline = v.schedule.timeline.map((t, idx) =>
                      idx === i ? { ...t, text: e.target.value } : t
                    )
                    patch({ schedule: { ...v.schedule, timeline } })
                  }}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  patch({
                    schedule: { ...v.schedule, timeline: v.schedule.timeline.filter((_, idx) => idx !== i) },
                  })
                }
              >
                Remove item
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              patch({
                schedule: {
                  ...v.schedule,
                  timeline: [...v.schedule.timeline, { time_label: "", title: "", text: "" }],
                },
              })
            }
          >
            Add timeline item
          </Button>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
              <Label>Fee label</Label>
              <Input
                value={v.schedule.price.label}
                onChange={(e) =>
                  patch({ schedule: { ...v.schedule, price: { ...v.schedule.price, label: e.target.value } } })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                value={v.schedule.price.amount}
                onChange={(e) =>
                  patch({ schedule: { ...v.schedule, price: { ...v.schedule.price, amount: e.target.value } } })
                }
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
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Price CTA</Label>
              <Input
                value={v.schedule.price.cta_label}
                onChange={(e) =>
                  patch({ schedule: { ...v.schedule, price: { ...v.schedule.price, cta_label: e.target.value } } })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-[#4F5077]">Rules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Kicker</Label>
            <Input value={v.rules.kicker} onChange={(e) => patch({ rules: { ...v.rules, kicker: e.target.value } })} />
          </div>
          <div className="space-y-2">
            <Label>Heading</Label>
            <Input value={v.rules.h2} onChange={(e) => patch({ rules: { ...v.rules, h2: e.target.value } })} />
          </div>
          {v.rules.rules.map((rule, i) => (
            <div key={i} className="flex gap-3 items-center">
              <Input
                value={rule}
                onChange={(e) => {
                  const rules = v.rules.rules.map((r, idx) => (idx === i ? e.target.value : r))
                  patch({ rules: { ...v.rules, rules } })
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => patch({ rules: { ...v.rules, rules: v.rules.rules.filter((_, idx) => idx !== i) } })}
              >
                Remove
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() => patch({ rules: { ...v.rules, rules: [...v.rules.rules, ""] } })}
          >
            Add rule
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-[#4F5077]">Register CTA</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Kicker</Label>
            <Input
              value={v.register.kicker}
              onChange={(e) => patch({ register: { ...v.register, kicker: e.target.value } })}
            />
          </div>
          <div className="space-y-2">
            <Label>Heading</Label>
            <Input value={v.register.h2} onChange={(e) => patch({ register: { ...v.register, h2: e.target.value } })} />
          </div>
          <div className="space-y-2">
            <Label>Paragraph</Label>
            <Textarea
              rows={2}
              value={v.register.paragraph}
              onChange={(e) => patch({ register: { ...v.register, paragraph: e.target.value } })}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Call button label</Label>
              <Input
                value={v.register.call_label}
                onChange={(e) => patch({ register: { ...v.register, call_label: e.target.value } })}
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={v.register.phone}
                onChange={(e) => patch({ register: { ...v.register, phone: e.target.value } })}
              />
            </div>
            <div className="space-y-2">
              <Label>WhatsApp register label</Label>
              <Input
                value={v.register.whatsapp_register_label}
                onChange={(e) => patch({ register: { ...v.register, whatsapp_register_label: e.target.value } })}
              />
            </div>
            <div className="space-y-2">
              <Label>WhatsApp URL</Label>
              <Input
                value={v.register.whatsapp_url}
                onChange={(e) => patch({ register: { ...v.register, whatsapp_url: e.target.value } })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-[#4F5077]">Footer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Academy name</Label>
            <Input
              value={v.footer.academy_name}
              onChange={(e) => patch({ footer: { ...v.footer, academy_name: e.target.value } })}
            />
          </div>
          <div className="space-y-2">
            <Label>Tagline</Label>
            <Input
              value={v.footer.tagline}
              onChange={(e) => patch({ footer: { ...v.footer, tagline: e.target.value } })}
            />
          </div>
          <div className="space-y-2">
            <Label>Camp line</Label>
            <Input
              value={v.footer.camp_line}
              onChange={(e) => patch({ footer: { ...v.footer, camp_line: e.target.value } })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
