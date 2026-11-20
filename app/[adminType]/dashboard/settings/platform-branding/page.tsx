"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useDashboardBasePath } from "@/lib/useDashboardBasePath"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Palette, Save, RefreshCw, Upload, Building2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { TokenManager } from "@/lib/tokenManager"
import { getBackendApiUrl } from "@/lib/config"
import {
  DEFAULT_PLATFORM_BRANDING,
  normalizePlatformBranding,
  type PlatformBranding,
} from "@/lib/platformBranding"
import { usePlatformBranding } from "@/contexts/PlatformBrandingContext"
import { resolvePublicAssetUrl } from "@/lib/resolvePublicAssetUrl"
import { Switch } from "@/components/ui/switch"

function ColorField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  hint?: string
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-[#4F5077]">{label}</Label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value || "#E1BB33"}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="h-11 w-14 cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 font-mono uppercase"
          placeholder="#E1BB33"
        />
      </div>
      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
    </div>
  )
}

export default function PlatformBrandingSettingsPage() {
  const router = useRouter()
  const basePath = useDashboardBasePath()
  const { toast } = useToast()
  const { refresh } = usePlatformBranding()
  const [form, setForm] = useState<PlatformBranding>(DEFAULT_PLATFORM_BRANDING)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const token = TokenManager.getToken()
      const res = await fetch(getBackendApiUrl("cms/platform-branding"), {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "Content-Type": "application/json",
        },
        cache: "no-store",
      })
      if (!res.ok) throw new Error("Failed to load platform branding")
      const data = await res.json()
      setForm(normalizePlatformBranding(data.branding || data))
    } catch (err) {
      console.error(err)
      toast({
        title: "Could not load branding",
        description: "Showing defaults. Try refresh.",
        variant: "destructive",
      })
      setForm(DEFAULT_PLATFORM_BRANDING)
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    const user = TokenManager.getUser()
    const role = String(user?.role || "").toLowerCase()
    if (!TokenManager.isAuthenticated() || (role !== "super_admin" && role !== "superadmin")) {
      router.replace("/superadmin/login")
      return
    }
    void load()
  }, [load, router])

  const patch = (partial: Partial<PlatformBranding>) => {
    setForm((prev) => normalizePlatformBranding({ ...prev, ...partial }))
  }

  const uploadLogo = async (field: "navbar_logo" | "footer_logo" | "favicon" | "site_loader_image", file: File) => {
    setUploading(field)
    try {
      const token = TokenManager.getToken()
      const body = new FormData()
      body.append("file", file)
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body,
      })
      if (!uploadRes.ok) throw new Error("Upload failed")
      const uploaded = await uploadRes.json()
      const url = uploaded.url || uploaded.file_url || uploaded.path
      if (!url) throw new Error("No URL returned")
      patch({ [field]: url })
      toast({ title: "Image uploaded", description: "Remember to save branding." })
    } catch (err) {
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Try again",
        variant: "destructive",
      })
    } finally {
      setUploading(null)
    }
  }

  const save = async () => {
    setSaving(true)
    try {
      const token = TokenManager.getToken()
      const res = await fetch(getBackendApiUrl("cms/platform-branding"), {
        method: "PUT",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(typeof err.detail === "string" ? err.detail : "Save failed")
      }
      const data = await res.json()
      setForm(normalizePlatformBranding(data.branding || form))
      await refresh()
      toast({
        title: "Platform branding saved",
        description: "Name, logo, and colors now apply across the website and portals.",
      })
    } catch (err) {
      toast({
        title: "Save failed",
        description: err instanceof Error ? err.message : "Try again",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const previewLogo = resolvePublicAssetUrl(form.navbar_logo || undefined) || "/logo.png"

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#4F5077]">Platform Branding</h1>
          <p className="text-sm text-slate-600">
            Control the platform name, logo, and colors for the website and every portal. Academies and partners can still overlay their own branding where allowed.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void load()} disabled={loading || saving}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={() => void save()} disabled={loading || saving} className="bg-[#E1BB33] text-[#171A26] hover:bg-[#d4ae2a]">
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving…" : "Save branding"}
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden border-slate-200">
        <CardHeader className="bg-gradient-to-r from-amber-50 to-slate-50">
          <CardTitle className="flex items-center gap-2 text-[#4F5077]">
            <Building2 className="h-5 w-5" />
            Live preview
          </CardTitle>
          <CardDescription>How the platform identity appears in chrome</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4 py-5">
          <div
            className="flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-sm"
            style={{ borderColor: form.primary_color, backgroundColor: `${form.primary_color}18` }}
          >
            <img src={previewLogo} alt={form.platform_short_name} className="h-10 w-auto object-contain" />
            <div>
              <p className="text-sm font-bold" style={{ color: form.secondary_color }}>
                {form.platform_name}
              </p>
              <p className="text-xs text-slate-500">{form.platform_short_name}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {[form.primary_color, form.secondary_color, form.accent_color, form.dark_color].map((c) => (
              <div key={c} className="h-10 w-10 rounded-full border border-white shadow ring-1 ring-slate-200" style={{ backgroundColor: c }} title={c} />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-[#4F5077]">Platform name</CardTitle>
          <CardDescription>Shown in browser titles, footers, emails, invoices, and checkout</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Platform display name</Label>
            <Input
              value={form.platform_name}
              onChange={(e) => patch({ platform_name: e.target.value })}
              placeholder="Rock Martial Arts Academy"
            />
          </div>
          <div className="space-y-2">
            <Label>Short name</Label>
            <Input
              value={form.platform_short_name}
              onChange={(e) => patch({ platform_short_name: e.target.value })}
              placeholder="Rock Martial Arts"
            />
          </div>
          <div className="space-y-2">
            <Label>Legal / invoice name</Label>
            <Input
              value={form.legal_name}
              onChange={(e) => patch({ legal_name: e.target.value })}
              placeholder="Rock Martial Arts Academy"
            />
          </div>
          <div className="space-y-2">
            <Label>Support email</Label>
            <Input
              value={form.support_email || ""}
              onChange={(e) => patch({ support_email: e.target.value })}
              placeholder="support@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label>Support phone</Label>
            <Input
              value={form.support_phone || ""}
              onChange={(e) => patch({ support_phone: e.target.value })}
              placeholder="+91…"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Website URL</Label>
            <Input
              value={form.website_url || ""}
              onChange={(e) => patch({ website_url: e.target.value })}
              placeholder="https://…"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-[#4F5077]">Academy attribution</CardTitle>
          <CardDescription>
            When enabled, every academy name shows as &quot;Academy name powered by {form.platform_short_name || "Platform"}&quot;
            across the website and portals.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-800">Show &quot;powered by&quot; on academy names</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Example:{" "}
                <span className="font-medium text-slate-700">
                  Kakatiya Nagar powered by {form.platform_short_name || "Platform"}
                </span>
              </p>
            </div>
            <Switch
              checked={Boolean(form.show_academy_powered_by)}
              onCheckedChange={(checked) => patch({ show_academy_powered_by: checked })}
              aria-label="Enable academy powered by platform"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#4F5077]">
            <Palette className="h-5 w-5" />
            Brand colors
          </CardTitle>
          <CardDescription>Applied as CSS variables across website and all dashboards</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <ColorField
            label="Primary"
            value={form.primary_color}
            onChange={(v) => patch({ primary_color: v })}
            hint="Admin CTAs, highlights (was gold)"
          />
          <ColorField
            label="Secondary"
            value={form.secondary_color}
            onChange={(v) => patch({ secondary_color: v })}
            hint="Headings and admin chrome (was navy-purple)"
          />
          <ColorField
            label="Accent"
            value={form.accent_color}
            onChange={(v) => patch({ accent_color: v })}
            hint="Public website CTAs and hovers"
          />
          <ColorField
            label="Dark"
            value={form.dark_color}
            onChange={(v) => patch({ dark_color: v })}
            hint="Dark surfaces / title text"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-[#4F5077]">Logos</CardTitle>
          <CardDescription>Used in nav, footer, favicon, and site loader</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          {(
            [
              ["navbar_logo", "Navbar / app logo"],
              ["footer_logo", "Footer logo"],
              ["favicon", "Favicon"],
              ["site_loader_image", "Site loader image"],
            ] as const
          ).map(([field, label]) => (
            <div key={field} className="space-y-2 rounded-xl border border-slate-200 p-3">
              <Label>{label}</Label>
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg bg-slate-50 ring-1 ring-slate-200">
                  {form[field] ? (
                    <img
                      src={resolvePublicAssetUrl(form[field] || undefined) || ""}
                      alt={label}
                      className="max-h-12 max-w-12 object-contain"
                    />
                  ) : (
                    <span className="text-[10px] text-slate-400">None</span>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-2">
                  <Input
                    value={form[field] || ""}
                    onChange={(e) => patch({ [field]: e.target.value })}
                    placeholder="Image URL"
                    className="text-xs"
                  />
                  <div className="flex gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-slate-50">
                      <Upload className="h-3.5 w-3.5" />
                      {uploading === field ? "Uploading…" : "Upload"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={!!uploading}
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          if (f) void uploadLogo(field, f)
                          e.target.value = ""
                        }}
                      />
                    </label>
                    {form[field] ? (
                      <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={() => patch({ [field]: null })}>
                        Clear
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2 pb-8">
        <Button variant="outline" onClick={() => router.push(`${basePath}/settings`)}>
          Back to settings
        </Button>
        <Button onClick={() => void save()} disabled={saving} className="bg-[#E1BB33] text-[#171A26] hover:bg-[#d4ae2a]">
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving…" : "Save branding"}
        </Button>
      </div>
    </div>
  )
}
