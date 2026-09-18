"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, Save, Search, Upload, Trash2 } from "lucide-react"
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
  has_seo?: boolean
}

function str(v: unknown): string {
  return v == null ? "" : String(v)
}

function resolveMediaUrl(path: string): string {
  if (!path) return ""
  if (path.startsWith("http://") || path.startsWith("https://")) return path
  return path.startsWith("/") ? path : `/${path}`
}

export default function PartnerSeoPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const basePath = useDashboardBasePath()
  const { toast } = useToast()

  const [partners, setPartners] = useState<PartnerBranchRow[]>([])
  const [branchId, setBranchId] = useState("")
  const [branchName, setBranchName] = useState("")
  const [hasSeo, setHasSeo] = useState(false)
  const [loadingList, setLoadingList] = useState(true)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [metaTitle, setMetaTitle] = useState("")
  const [metaDescription, setMetaDescription] = useState("")
  const [keywords, setKeywords] = useState("")
  const [ogImage, setOgImage] = useState("")

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

  const loadSeo = useCallback(
    async (id: string) => {
      if (!id) return
      try {
        setLoading(true)
        const res = await fetch(
          getBackendApiUrl(`collaboration-partners/branches/${id}/seo`),
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
        if (!res.ok) throw new Error("Failed to load SEO")
        const data = await res.json()
        setHasSeo(!!data.has_seo)
        setBranchName(data.branch_snapshot?.name || "")
        setMetaTitle(str(data.meta_title))
        setMetaDescription(str(data.meta_description))
        setKeywords(str(data.keywords))
        setOgImage(str(data.og_image))
      } catch (e: any) {
        toast({
          title: "Error",
          description: e?.message || "Could not load SEO",
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
    const fromQuery = searchParams.get("branchId") || ""
    if (fromQuery && fromQuery !== branchId) {
      setBranchId(fromQuery)
    }
  }, [searchParams, branchId])

  useEffect(() => {
    if (branchId) loadSeo(branchId)
  }, [branchId, loadSeo])

  function onSelectBranch(id: string) {
    setBranchId(id)
    const params = new URLSearchParams(searchParams.toString())
    if (id) params.set("branchId", id)
    else params.delete("branchId")
    router.replace(`${basePath}/partner-seo?${params.toString()}`)
  }

  async function handleOgUpload(file: File) {
    try {
      setUploading(true)
      const result = await uploadFile(file)
      const url = result.file_url
      if (!url) throw new Error("Upload returned no URL")
      setOgImage(url)
      toast({ title: "Uploaded", description: "OG image ready to save." })
    } catch (e: any) {
      toast({
        title: "Upload failed",
        description: e?.message || "Could not upload image",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  async function handleSave() {
    if (!branchId) return
    try {
      setSaving(true)
      const res = await fetch(
        getBackendApiUrl(`collaboration-partners/branches/${branchId}/seo`),
        {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify({
            meta_title: metaTitle.trim() || null,
            meta_description: metaDescription.trim() || null,
            keywords: keywords.trim() || null,
            og_image: ogImage.trim() || null,
          }),
        }
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.detail || "Failed to save SEO")
      }
      const data = await res.json()
      const seo = data.seo || {}
      setHasSeo(!!seo.has_seo)
      setMetaTitle(str(seo.meta_title))
      setMetaDescription(str(seo.meta_description))
      setKeywords(str(seo.keywords))
      setOgImage(str(seo.og_image))
      toast({
        title: "Saved",
        description: data.message || "Partner SEO updated",
      })
      loadPartners()
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message || "Could not save SEO",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const titleLen = metaTitle.length
  const descLen = metaDescription.length

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PartnerCmsScopeBanner />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Search className="h-6 w-6 text-amber-600" />
            Partner SEO
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Meta title, description, keywords, and OG image for collaboration
            partner branch pages. Does not affect normal branches.
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={!branchId || saving || loading}
          className="bg-amber-500 hover:bg-amber-600 text-black"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save SEO
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select partner branch</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loadingList ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading partners…
            </div>
          ) : partners.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No collaboration partners yet. Enable{" "}
              <strong>Is Collaboration Partner</strong> on a branch first.
            </p>
          ) : (
            <Select value={branchId || undefined} onValueChange={onSelectBranch}>
              <SelectTrigger className="max-w-xl">
                <SelectValue placeholder="Choose a partner branch" />
              </SelectTrigger>
              <SelectContent>
                {partners.map((p) => (
                  <SelectItem key={p.branch_id} value={p.branch_id}>
                    {p.branch_name || p.branch_id}
                    {p.branch_code ? ` (${p.branch_code})` : ""}
                    {p.has_seo ? " — SEO set" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {branchId && (
            <p className="text-xs text-muted-foreground">
              {branchName || "Partner"}{" "}
              {hasSeo ? (
                <span className="text-green-700">· SEO configured</span>
              ) : (
                <span>· No SEO saved yet</span>
              )}
              {" · "}
              <a
                href={`/partners/${encodeURIComponent(branchId)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-700 hover:underline"
              >
                Open partner landing
              </a>
            </p>
          )}
        </CardContent>
      </Card>

      {!branchId ? null : loading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-12 justify-center">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading SEO…
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Page metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="meta_title">Meta Title</Label>
                  <span
                    className={`text-xs ${
                      titleLen > 60 ? "text-amber-600" : "text-muted-foreground"
                    }`}
                  >
                    {titleLen}/60 recommended
                  </span>
                </div>
                <Input
                  id="meta_title"
                  value={metaTitle}
                  maxLength={200}
                  placeholder="e.g. Karate Classes in Hyderabad | Partner Name"
                  onChange={(e) => setMetaTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="meta_description">Meta Description</Label>
                  <span
                    className={`text-xs ${
                      descLen > 160 ? "text-amber-600" : "text-muted-foreground"
                    }`}
                  >
                    {descLen}/160 recommended
                  </span>
                </div>
                <Textarea
                  id="meta_description"
                  value={metaDescription}
                  maxLength={500}
                  rows={4}
                  placeholder="Short summary shown in search results…"
                  onChange={(e) => setMetaDescription(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="keywords">Keywords</Label>
                <Input
                  id="keywords"
                  value={keywords}
                  maxLength={500}
                  placeholder="karate, martial arts, hyderabad, kids classes"
                  onChange={(e) => setKeywords(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Comma-separated keywords for the partner page.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Open Graph image</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="og_image">OG Image URL</Label>
                <Input
                  id="og_image"
                  value={ogImage}
                  placeholder="/uploads/images/…"
                  onChange={(e) => setOgImage(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex items-center gap-2 cursor-pointer rounded-md border px-3 py-2 text-sm hover:bg-muted">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) handleOgUpload(f)
                      e.target.value = ""
                    }}
                  />
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  Upload image
                </label>
                {ogImage ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setOgImage("")}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                ) : null}
              </div>
              {ogImage ? (
                <div className="rounded-md border overflow-hidden bg-muted/30 max-w-md">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolveMediaUrl(ogImage)}
                    alt="OG preview"
                    className="w-full h-40 object-cover"
                  />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Recommended ~1200×630. Used when the partner page is shared.
                </p>
              )}

              {(metaTitle || metaDescription) && (
                <div className="rounded-md border p-3 space-y-1 bg-white">
                  <p className="text-xs text-muted-foreground mb-2">
                    Search preview
                  </p>
                  <p className="text-blue-700 text-base leading-snug truncate">
                    {metaTitle || "Page title"}
                  </p>
                  <p className="text-sm text-green-700 truncate">
                    …/branches/…
                  </p>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {metaDescription || "Meta description will appear here."}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
