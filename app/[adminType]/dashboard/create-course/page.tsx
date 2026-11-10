"use client"

import type React from "react"

import { getBackendApiUrl } from "@/lib/config"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock,
  FileText,
  GraduationCap,
  Image as ImageIcon,
  Info,
  Layers,
  Layout,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Users,
  X,
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/AuthContext"
import { TokenManager } from "@/lib/tokenManager"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"
import { getActiveBranchId } from "@/lib/activeBranch"
import { useDashboardBasePath } from "@/lib/useDashboardBasePath"
import { useDashboardRole } from "@/lib/useDashboardBasePath"
import { partnerOrgAPI, type PartnerOrg } from "@/lib/partnerOrgAPI"
import { CourseMediaResourcesFields } from "@/components/dashboard/CourseMediaResourcesFields"
import CourseFormSections, { PageContent } from "@/components/dashboard/CourseFormSections"

export default function CreateCoursePage() {
  const router = useRouter()
  const basePath = useDashboardBasePath()
  const dashboardRole = useDashboardRole()
  const isRockSuperAdmin = dashboardRole === "super_admin"
  const { toast } = useToast()
  const { user } = useAuth()
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // State
  const [categories, setCategories] = useState<any[]>([])
  const [allCategories, setAllCategories] = useState<any[]>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(true)
  const [prerequisites, setPrerequisites] = useState<string[]>([])
  const [newPrerequisite, setNewPrerequisite] = useState("")
  const [modules, setModules] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [difficultyLevels, setDifficultyLevels] = useState<any[]>([])
  // Fixed duration options so this dropdown never shows wrong API data (e.g. currencies)
  const [courseDurations] = useState<{ value: string; label: string }[]>([
    { value: '1 month', label: '1 month' },
    { value: '2 months', label: '2 months' },
    { value: '3 months', label: '3 months' },
    { value: '6 months', label: '6 months' },
    { value: '1 year', label: '1 year' },
    { value: '2 years', label: '2 years' },
  ])
  const [loadingBranches, setLoadingBranches] = useState(false)
  const [partnerOrgs, setPartnerOrgs] = useState<PartnerOrg[]>([])
  const [targetPartnerOrgId, setTargetPartnerOrgId] = useState("")
  const [partnerBranches, setPartnerBranches] = useState<any[]>([])
  const [selectedPartnerBranchIds, setSelectedPartnerBranchIds] = useState<string[]>([])
  const [loadingPartnerBranches, setLoadingPartnerBranches] = useState(false)
  const [branchPrices, setBranchPrices] = useState<any[]>([])
  // Tenure-based pricing state
  type MasterDuration = { id: string; name: string; code: string; duration_months: number; display_order: number }
  const [masterDurations, setMasterDurations] = useState<MasterDuration[]>([])
  const [addedTenures, setAddedTenures] = useState<string[]>([])
  const [feeByDurationId, setFeeByDurationId] = useState<Record<string, string>>({})
  const [flatPriceByDurationId, setFlatPriceByDurationId] = useState<Record<string, string>>({})
  const [addedBranchTenures, setAddedBranchTenures] = useState<Record<number, string[]>>({})
  const [enableMultipleTenures, setEnableMultipleTenures] = useState(true)
  const [formData, setFormData] = useState({
    courseTitle: "",
    courseCode: "",
    description: "",
    category: "",
    subcategory: "",
    difficultyLevel: "",
    duration: "",
    maxStudents: "",
    minAge: "",
    maxAge: "",
    currency: "INR",
    branchSpecificPricing: false,
    equipmentRequired: "",
    syllabus: "",
    imageUrl: "",
    videoUrl: "",
    videoPosterUrl: "",
    tags: [] as string[]
  })
  const [pageContent, setPageContent] = useState<PageContent>({})
  const [seoData, setSeoData] = useState({
    meta_title: "",
    meta_description: "",
    meta_keywords: "",
    og_image: ""
  })
  // UI-only publish chrome (does not change submit payload / API behavior)
  const [uiPublishStatus, setUiPublishStatus] = useState<"draft" | "publish">("draft")
  const [uiVisibility, setUiVisibility] = useState("public")

  useEffect(() => {
    if (!isRockSuperAdmin) return
    let cancelled = false
    partnerOrgAPI
      .list({ limit: 200, include_inactive: false })
      .then((data) => {
        if (cancelled) return
        setPartnerOrgs(
          (data.partners || []).filter(
            (p) => p.effective_status === "active" || p.effective_status == null
          )
        )
      })
      .catch(() => {
        if (!cancelled) setPartnerOrgs([])
      })
    return () => {
      cancelled = true
    }
  }, [isRockSuperAdmin])

  useEffect(() => {
    if (!isRockSuperAdmin || !targetPartnerOrgId) {
      setPartnerBranches([])
      setSelectedPartnerBranchIds([])
      return
    }
    let cancelled = false
    setLoadingPartnerBranches(true)
    const token = TokenManager.getToken()
    fetch(getBackendApiUrl(`branches?limit=200&active_only=true`), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        const rows = (data.branches || data || []).filter(
          (b: { partner_org_id?: string }) =>
            String(b.partner_org_id || "") === targetPartnerOrgId
        )
        setPartnerBranches(rows)
        setSelectedPartnerBranchIds(rows.map((b: { id: string }) => b.id))
      })
      .catch(() => {
        if (!cancelled) {
          setPartnerBranches([])
          setSelectedPartnerBranchIds([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingPartnerBranches(false)
      })
    return () => {
      cancelled = true
    }
  }, [isRockSuperAdmin, targetPartnerOrgId])

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoadingCategories(true)
        const token = TokenManager.getToken()
        const response = await fetch(getBackendApiUrl('categories?active_only=true&limit=200'), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          throw new Error('Failed to fetch categories')
        }

        const data = await response.json()
        const validCategories = (data.categories || []).filter((category: any) =>
          category && category.id && category.id.trim() !== ''
        )
        
        // Store all categories for subcategory filtering
        setAllCategories(validCategories)
        
        // Store only parent categories for the dropdown
        const parentCategories = validCategories.filter((cat: any) => !cat.parent_category_id)
        const uniqueParents = Array.from(new Map(parentCategories.map((cat: any) => [cat.id, cat])).values())
        setCategories(uniqueParents)
      } catch (error) {
        console.error('Error fetching categories:', error)
        const defaults = [
          { id: 'default-category-1', name: 'General Martial Arts', course_count: 0 },
          { id: 'default-category-2', name: 'Self Defense', course_count: 0 },
          { id: 'default-category-3', name: 'Fitness & Training', course_count: 0 }
        ]
        setCategories(defaults)
        setAllCategories(defaults)
        toast({
          title: "Warning",
          description: "Failed to load categories. Using default options.",
          variant: "destructive",
        })
      } finally {
        setIsLoadingCategories(false)
      }
    }

    fetchCategories()
  }, [toast])

  // Fetch difficulty levels from master data
  useEffect(() => {
    const fetchDifficultyLevels = async () => {
      try {
        const token = TokenManager.getToken()
        const response = await fetch(getBackendApiUrl('dropdown-settings/difficulty_levels'), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (response.ok) {
          const data = await response.json()
          // data is an array of {value, label, is_active, order}
          const activeLevels = data.filter((level: any) => level.is_active)
          setDifficultyLevels(activeLevels)
        } else {
          // Fallback to default difficulty levels
          setDifficultyLevels([
            { value: 'Beginner', label: 'Beginner', is_active: true },
            { value: 'Intermediate', label: 'Intermediate', is_active: true },
            { value: 'Advanced', label: 'Advanced', is_active: true },
            { value: 'Expert', label: 'Expert', is_active: true }
          ])
        }
      } catch (error) {
        console.error('Error fetching difficulty levels:', error)
        // Fallback to default difficulty levels
        setDifficultyLevels([
          { value: 'Beginner', label: 'Beginner', is_active: true },
          { value: 'Intermediate', label: 'Intermediate', is_active: true },
          { value: 'Advanced', label: 'Advanced', is_active: true },
          { value: 'Expert', label: 'Expert', is_active: true }
        ])
      }
    }

    fetchDifficultyLevels()
  }, [toast])

  // Fetch master durations for tenure pricing
  useEffect(() => {
    const fetchMasterDurations = async () => {
      try {
        const token = TokenManager.getToken()
        const response = await fetch(getBackendApiUrl('durations?active_only=true'), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        if (response.ok) {
          const data = await response.json()
          const durations = (data.durations || []).map((d: any) => ({
            id: d.id,
            name: d.name,
            code: d.code,
            duration_months: d.duration_months,
            display_order: d.display_order || 0,
          }))
          setMasterDurations(durations)
        }
      } catch (error) {
        console.error('Error fetching master durations:', error)
      }
    }
    fetchMasterDurations()
  }, [])

  // Auto-generate course code from title
  useEffect(() => {
    if (formData.courseTitle) {
      const generatedCode = formData.courseTitle
        .toUpperCase()
        .replace(/[^A-Z0-9\s]/g, "")
        .replace(/\s+/g, "_")
      setFormData(prev => ({ ...prev, courseCode: generatedCode }))
    }
  }, [formData.courseTitle])

  // Fetch branches on mount
  useEffect(() => {
    const fetchBranches = async () => {
      setLoadingBranches(true)
      try {
        const token = TokenManager.getToken()
        const res = await fetch(getBackendApiUrl('branches?active_only=true'), {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })

        if (res.ok) {
          const data = await res.json()
          console.log("Branches API response:", data)
          
          // Handle different response structures
          let branchList = []
          if (Array.isArray(data)) {
            branchList = data
          } else if (data.branches && Array.isArray(data.branches)) {
            branchList = data.branches
          } else if (data.data && Array.isArray(data.data)) {
            branchList = data.data
          }
          
          // Filter only active branches
          const activeBranches = branchList.filter(branch => branch.is_active !== false)
          console.log("Active branches:", activeBranches)
          setBranches(activeBranches)
        }
      } catch (err) {
        console.error("Failed to fetch branches:", err)
      } finally {
        setLoadingBranches(false)
      }
    }

    fetchBranches()
  }, [])

  const addPrerequisite = () => {
    if (newPrerequisite.trim() && !prerequisites.includes(newPrerequisite.trim())) {
      setPrerequisites([...prerequisites, newPrerequisite.trim()])
      setNewPrerequisite("")
    }
  }

  const removePrerequisite = (index: number) => {
    setPrerequisites(prerequisites.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (!formData.courseTitle || !formData.courseCode || !formData.description) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields.",
          variant: "destructive"
        })
        setIsSubmitting(false)
        return
      }



      if (!formData.category) {
        toast({
          title: "Validation Error",
          description: "Please select a category.",
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }

      const apiData = {
        title: formData.courseTitle,
        code: formData.courseCode,
        description: formData.description,
        difficulty_level: formData.difficultyLevel,
        category_id: formData.category,
        sub_category: formData.subcategory || null,
        // Add required fields with default values
        martial_art_style_id: 'style-default', // Will be configurable later
        instructor_id: user?.id && user.id.includes('instructor-') ? user.id : 'instructor-default',
        student_requirements: {
          min_age: parseInt(formData.minAge) || 6,
          max_age: parseInt(formData.maxAge) || 99,
          prerequisites: prerequisites
        },
        course_content: {
          syllabus: formData.syllabus || "",
          equipment_required: formData.equipmentRequired ? formData.equipmentRequired.split(',').map(item => item.trim()) : []
        },
        media_resources: {
          course_image_url: formData.imageUrl || "",
          promo_video_url: formData.videoUrl || "",
          video_poster_url: formData.videoPosterUrl || ""
        },
        pricing: {
          currency: "INR",
          amount: 0,
          branch_specific_pricing: false,
        },
        settings: {
          offers_certification: (formData as any).offersCertification || true,
          active: true
        },
        page_content: pageContent,
        seo: seoData.meta_title || seoData.meta_description ? seoData : undefined
      }
      if (isRockSuperAdmin && targetPartnerOrgId) {
        ;(apiData as { partner_org_id?: string; branch_ids?: string[] }).partner_org_id =
          targetPartnerOrgId
        ;(apiData as { branch_ids?: string[] }).branch_ids = selectedPartnerBranchIds
      }
      
      // Add curriculum if modules exist (may be handled separately by API)
      if (modules.length > 0) {
        (apiData as any).curriculum = {
          modules: modules.map(m => ({
            title: m.title,
            description: m.description,
            duration: parseFloat(m.duration) || 0,
            status: m.status,
            resource_url: m.resourceUrl,
            resource_type: m.resourceType
          }))
        }
      }

      let token = TokenManager.getToken() || BranchManagerAuth.getToken()
      if (!token && typeof window !== "undefined") {
        token = localStorage.getItem("access_token") || localStorage.getItem("token")
      }

      if (!token) {
        toast({
          title: "Authentication Error",
          description: "No authentication token available. Please login again.",
          variant: "destructive"
        })
        return
      }

      console.log('Creating course with data:', apiData)
      
      const activeBranchId = getActiveBranchId()
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
      if (activeBranchId) {
        headers['X-Active-Branch-Id'] = activeBranchId
      }

      const response = await fetch(getBackendApiUrl('courses'), {
        method: 'POST',
        headers,
        body: JSON.stringify(apiData)
      })

      const result = await response.json()

      if (!response.ok) {
        // Handle validation errors with detailed messages
        let errorMessage = `Failed to create course (${response.status})`
        
        if (result.detail) {
          if (Array.isArray(result.detail)) {
            // FastAPI validation errors format
            errorMessage = result.detail.map((err: any) => 
              `${err.loc ? err.loc.join('.') : 'Field'}: ${err.msg}`
            ).join(', ')
          } else if (typeof result.detail === 'string') {
            errorMessage = result.detail
          } else if (typeof result.detail === 'object') {
            errorMessage = JSON.stringify(result.detail)
          }
        } else if (result.message) {
          errorMessage = result.message
        }
        
        throw new Error(errorMessage)
      }

      setShowSuccessPopup(true)

    } catch (error) {
      console.error('Error creating course:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create course. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // File upload handler for module resources
  const handleModuleResourceUpload = async (index: number, file: File) => {
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    try {
      const token = TokenManager.getToken()
      const response = await fetch(getBackendApiUrl('upload'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const data = await response.json()
      const uploadedUrl = data.file_url || data.url

      // Update module with uploaded URL
      const newModules = [...modules]
      newModules[index].resourceUrl = uploadedUrl
      
      // Auto-detect resource type from file
      if (file.type.startsWith('image/')) {
        newModules[index].resourceType = 'image'
      } else if (file.type === 'application/pdf') {
        newModules[index].resourceType = 'pdf'
      } else if (file.type.startsWith('video/')) {
        newModules[index].resourceType = 'video'
      }
      
      setModules(newModules)

      toast({
        title: "Success",
        description: "File uploaded successfully",
      })
    } catch (error) {
      console.error('Upload error:', error)
      toast({
        title: "Upload Failed",
        description: "Failed to upload file. Please try again.",
        variant: "destructive"
      })
    }
  }

  const childCategories = allCategories.filter(
    (cat: any) => cat.parent_category_id && cat.parent_category_id === formData.category
  )

  const handleSuccessOk = () => {
    setShowSuccessPopup(false)
    router.push(`${basePath}/courses`)
  }

  const fieldLabel = "text-sm font-medium text-[#4F5077]"
  const inputClass =
    "h-11 rounded-lg border-gray-200 bg-white shadow-sm focus-visible:ring-[#4F5077]/30"
  const sectionCard = "rounded-2xl border border-gray-200/80 bg-white shadow-sm overflow-hidden"
  const categoryName =
    categories.find((cat) => cat.id === formData.category)?.name || "—"
  const durationLabel =
    courseDurations.find((d) => d.value === formData.duration)?.label || "—"

  const SectionHeading = ({
    icon: Icon,
    title,
    subtitle,
    tone = "violet",
  }: {
    icon: React.ElementType
    title: string
    subtitle?: string
    tone?: "violet" | "blue" | "emerald" | "amber" | "rose" | "indigo"
  }) => {
    const tones: Record<string, string> = {
      violet: "bg-violet-100 text-violet-700",
      blue: "bg-sky-100 text-sky-700",
      emerald: "bg-emerald-100 text-emerald-700",
      amber: "bg-amber-100 text-amber-700",
      rose: "bg-rose-100 text-rose-700",
      indigo: "bg-indigo-100 text-indigo-700",
    }
    return (
      <div className="flex items-start gap-3 mb-5">
        <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[#2F3153]">{title}</h2>
          {subtitle ? <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p> : null}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F6FA]">
      <main className="w-full py-6 px-4 lg:px-8 xl:px-10">
        {/* Page header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#2F3153]">Create New Course</h1>
            <p className="mt-1 text-sm text-gray-500">
              Set up course details, requirements, media, and the public page layout.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`${basePath}/courses`)}
              className="h-10 rounded-lg border-gray-200 bg-white text-[#4F5077] hover:bg-gray-50"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Courses
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => {
                const form = document.getElementById("create-course-form") as HTMLFormElement | null
                form?.requestSubmit()
              }}
              className="h-10 rounded-lg border-gray-200 bg-white text-[#4F5077] hover:bg-gray-50"
            >
              Save Draft
            </Button>
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                const form = document.getElementById("create-course-form") as HTMLFormElement | null
                form?.requestSubmit()
              }}
              className="h-10 rounded-lg bg-[#2F3153] px-4 text-white hover:bg-[#3d3f6a]"
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Create Course
            </Button>
          </div>
        </div>

        <form id="create-course-form" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
            {/* Left column */}
            <div className="space-y-5 xl:col-span-8">
              {/* Course Information */}
              <div className={`${sectionCard} p-5 sm:p-6`}>
                <SectionHeading
                  icon={BookOpen}
                  title="Course Information"
                  subtitle="Basic details that identify this course"
                  tone="violet"
                />

                <div className="space-y-4 text-[#7D8592]">
                  {isRockSuperAdmin ? (
                    <div className="space-y-2">
                      <Label className={fieldLabel}>Partner Organization</Label>
                      <Select
                        value={targetPartnerOrgId || "_rock"}
                        onValueChange={(v) => setTargetPartnerOrgId(v === "_rock" ? "" : v)}
                      >
                        <SelectTrigger className={`${inputClass} bg-white`}>
                          <SelectValue placeholder="Rock main branch (default)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_rock">Rock main branch (default)</SelectItem>
                          {partnerOrgs.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {targetPartnerOrgId ? (
                        <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50/70 p-3">
                          <Label className={fieldLabel}>Partner branches to link</Label>
                          {loadingPartnerBranches ? (
                            <p className="text-xs text-gray-500">Loading branches…</p>
                          ) : partnerBranches.length === 0 ? (
                            <p className="text-xs text-amber-800">
                              No active branches for this partner — course will still be stamped to
                              the org.
                            </p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {partnerBranches.map((b) => {
                                const checked = selectedPartnerBranchIds.includes(b.id)
                                return (
                                  <button
                                    key={b.id}
                                    type="button"
                                    onClick={() =>
                                      setSelectedPartnerBranchIds((prev) =>
                                        checked
                                          ? prev.filter((id) => id !== b.id)
                                          : [...prev, b.id]
                                      )
                                    }
                                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                                      checked
                                        ? "border-amber-400 bg-amber-200 text-[#4F5077]"
                                        : "border-gray-300 bg-white text-gray-600 hover:border-gray-400"
                                    }`}
                                  >
                                    {b.name || b.code || b.id}
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    <Label htmlFor="courseTitle" className={fieldLabel}>
                      Course Title <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="courseTitle"
                      value={formData.courseTitle}
                      onChange={(e) => setFormData({ ...formData, courseTitle: e.target.value })}
                      placeholder="e.g., Advanced Kung Fu Training"
                      required
                      className={inputClass}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="courseCode" className={fieldLabel}>
                        Course Code <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="courseCode"
                        value={formData.courseCode}
                        readOnly
                        className={`${inputClass} bg-gray-50 text-gray-600`}
                        placeholder="Auto-generated from title"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category" className={fieldLabel}>
                        Category <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) =>
                          setFormData({ ...formData, category: value, subcategory: "" })
                        }
                      >
                        <SelectTrigger className={`${inputClass} w-full`}>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {childCategories.length > 0 && (
                    <div className="space-y-2">
                      <Label htmlFor="subcategory" className={fieldLabel}>
                        Subcategory (optional)
                      </Label>
                      <Select
                        value={formData.subcategory || "none"}
                        onValueChange={(value) =>
                          setFormData({
                            ...formData,
                            subcategory: value === "none" ? "" : value,
                          })
                        }
                      >
                        <SelectTrigger className={`${inputClass} w-full`}>
                          <SelectValue placeholder="Select subcategory (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {childCategories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="difficultyLevel" className={fieldLabel}>
                        Difficulty Level <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={formData.difficultyLevel}
                        onValueChange={(value) =>
                          setFormData({ ...formData, difficultyLevel: value })
                        }
                      >
                        <SelectTrigger className={`${inputClass} w-full`}>
                          <SelectValue placeholder="Select difficulty level" />
                        </SelectTrigger>
                        <SelectContent>
                          {difficultyLevels.length > 0 ? (
                            difficultyLevels.map((level) => (
                              <SelectItem key={level.value} value={level.value}>
                                {level.label}
                              </SelectItem>
                            ))
                          ) : (
                            <>
                              <SelectItem value="Beginner">Beginner</SelectItem>
                              <SelectItem value="Intermediate">Intermediate</SelectItem>
                              <SelectItem value="Advanced">Advanced</SelectItem>
                              <SelectItem value="Expert">Expert</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="duration" className={fieldLabel}>
                        Duration <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={formData.duration}
                        onValueChange={(value) => setFormData({ ...formData, duration: value })}
                      >
                        <SelectTrigger className={`${inputClass} w-full`}>
                          <SelectValue placeholder="Select course duration" />
                        </SelectTrigger>
                        <SelectContent>
                          {courseDurations.length > 0 ? (
                            courseDurations.map((duration) => (
                              <SelectItem key={duration.value} value={duration.value}>
                                {duration.label}
                              </SelectItem>
                            ))
                          ) : (
                            <>
                              <SelectItem value="1_month">1 Month</SelectItem>
                              <SelectItem value="3_months">3 Months</SelectItem>
                              <SelectItem value="6_months">6 Months</SelectItem>
                              <SelectItem value="1_year">1 Year</SelectItem>
                              <SelectItem value="2_years">2 Years</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="description" className={fieldLabel}>
                        Course Description <span className="text-red-500">*</span>
                      </Label>
                      <span className="text-xs text-gray-400">
                        {formData.description.length}/1000
                      </span>
                    </div>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Provide a detailed description of the course, what students will learn, and benefits..."
                      rows={4}
                      required
                      className="rounded-lg border-gray-200 bg-white shadow-sm focus-visible:ring-[#4F5077]/30"
                    />
                  </div>
                </div>
              </div>

              {/* Student Requirements */}
              <div className={`${sectionCard} p-5 sm:p-6`}>
                <SectionHeading
                  icon={Users}
                  title="Student Requirements"
                  subtitle="Age range and prerequisites for enrollment"
                  tone="blue"
                />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="minAge" className={fieldLabel}>
                      Minimum Age
                    </Label>
                    <Input
                      id="minAge"
                      type="number"
                      value={formData.minAge}
                      onChange={(e) => setFormData({ ...formData, minAge: e.target.value })}
                      placeholder="6"
                      min="3"
                      max="100"
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxAge" className={fieldLabel}>
                      Maximum Age
                    </Label>
                    <Input
                      id="maxAge"
                      type="number"
                      value={formData.maxAge}
                      onChange={(e) => setFormData({ ...formData, maxAge: e.target.value })}
                      placeholder="65"
                      min="3"
                      max="100"
                      className={inputClass}
                    />
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <Label className={fieldLabel}>Prerequisites</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newPrerequisite}
                      onChange={(e) => setNewPrerequisite(e.target.value)}
                      placeholder="Add a prerequisite (e.g., Basic fitness level)"
                      onKeyDown={(e) =>
                        e.key === "Enter" && (e.preventDefault(), addPrerequisite())
                      }
                      className={inputClass}
                    />
                    <Button
                      type="button"
                      onClick={addPrerequisite}
                      className="h-11 shrink-0 rounded-lg bg-[#2F3153] px-3 text-white hover:bg-[#3d3f6a]"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {prerequisites.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {prerequisites.map((prereq, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="flex items-center gap-1 rounded-full bg-sky-50 px-3 py-1 text-sky-800 hover:bg-sky-50"
                        >
                          <span>{prereq}</span>
                          <button
                            type="button"
                            onClick={() => removePrerequisite(index)}
                            className="ml-0.5 hover:text-red-500"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Course Content */}
              <div className={`${sectionCard} p-5 sm:p-6`}>
                <SectionHeading
                  icon={FileText}
                  title="Course Content"
                  subtitle="Syllabus outline and equipment students need"
                  tone="emerald"
                />
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="syllabus" className={fieldLabel}>
                      Syllabus
                    </Label>
                    <Textarea
                      id="syllabus"
                      value={formData.syllabus}
                      onChange={(e) => setFormData({ ...formData, syllabus: e.target.value })}
                      placeholder="Outline the course curriculum, modules, techniques to be taught..."
                      rows={4}
                      className="rounded-lg border-gray-200 bg-white shadow-sm focus-visible:ring-[#4F5077]/30"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="equipmentRequired" className={fieldLabel}>
                      Equipment Required
                    </Label>
                    <Textarea
                      id="equipmentRequired"
                      value={formData.equipmentRequired}
                      onChange={(e) =>
                        setFormData({ ...formData, equipmentRequired: e.target.value })
                      }
                      placeholder="List any equipment students need to bring or purchase..."
                      rows={3}
                      className="rounded-lg border-gray-200 bg-white shadow-sm focus-visible:ring-[#4F5077]/30"
                    />
                  </div>
                </div>
              </div>

              {/* Media & Resources */}
              <div className={`${sectionCard} p-5 sm:p-6`}>
                <SectionHeading
                  icon={ImageIcon}
                  title="Media & Resources"
                  subtitle="Course image, promo video, and poster"
                  tone="indigo"
                />
                <CourseMediaResourcesFields
                  value={{
                    imageUrl: formData.imageUrl,
                    videoUrl: formData.videoUrl,
                    videoPosterUrl: formData.videoPosterUrl,
                  }}
                  onChange={(patch) => setFormData((prev) => ({ ...prev, ...patch }))}
                  hideTitle
                />
              </div>

              {/* SEO Settings */}
              <div className={`${sectionCard} p-5 sm:p-6`}>
                <SectionHeading
                  icon={Search}
                  title="SEO Settings"
                  subtitle="Search and social sharing metadata"
                  tone="amber"
                />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="seo_meta_title" className={fieldLabel}>
                      Meta Title
                    </Label>
                    <Input
                      id="seo_meta_title"
                      value={seoData.meta_title}
                      onChange={(e) => setSeoData({ ...seoData, meta_title: e.target.value })}
                      placeholder="Course page meta title"
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="seo_meta_keywords" className={fieldLabel}>
                      Meta Keywords
                    </Label>
                    <Input
                      id="seo_meta_keywords"
                      value={seoData.meta_keywords}
                      onChange={(e) => setSeoData({ ...seoData, meta_keywords: e.target.value })}
                      placeholder="keyword1, keyword2, keyword3"
                      className={inputClass}
                    />
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <Label htmlFor="seo_meta_description" className={fieldLabel}>
                    Meta Description
                  </Label>
                  <Textarea
                    id="seo_meta_description"
                    value={seoData.meta_description}
                    onChange={(e) => setSeoData({ ...seoData, meta_description: e.target.value })}
                    placeholder="Course page meta description"
                    rows={2}
                    className="rounded-lg border-gray-200 bg-white shadow-sm focus-visible:ring-[#4F5077]/30"
                  />
                </div>
                <div className="mt-4 space-y-2">
                  <Label htmlFor="seo_og_image" className={fieldLabel}>
                    OG Image URL
                  </Label>
                  <Input
                    id="seo_og_image"
                    value={seoData.og_image}
                    onChange={(e) => setSeoData({ ...seoData, og_image: e.target.value })}
                    placeholder="https://example.com/og-image.jpg"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Page Content / Visibility */}
              <div className={`${sectionCard} p-5 sm:p-6`}>
                <SectionHeading
                  icon={Layout}
                  title="Public Course Page"
                  subtitle="Toggle sections and build content for the public course page"
                  tone="rose"
                />
                <CourseFormSections value={pageContent} onChange={setPageContent} />
              </div>

              {/* Footer actions */}
              <div className="flex flex-wrap items-center justify-end gap-3 pb-8 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`${basePath}/courses`)}
                  disabled={isSubmitting}
                  className="h-11 rounded-lg border-gray-200 bg-white px-6 text-[#4F5077]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="h-11 rounded-lg bg-[#F5C518] px-8 font-semibold text-[#2F3153] hover:bg-[#e6b800]"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Course...
                    </>
                  ) : (
                    "Create Course"
                  )}
                </Button>
              </div>
            </div>

            {/* Right sidebar */}
            <aside className="space-y-4 xl:col-span-4">
              <div className="xl:sticky xl:top-6 space-y-4">
                <div className={`${sectionCard} p-5`}>
                  <div className="mb-4 flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                      <Layers className="h-4 w-4" />
                    </div>
                    <h3 className="text-base font-semibold text-[#2F3153]">Course Overview</h3>
                  </div>
                  <dl className="space-y-3 text-sm">
                    {[
                      ["Title", formData.courseTitle || "—"],
                      ["Code", formData.courseCode || "—"],
                      ["Category", categoryName],
                      ["Difficulty", formData.difficultyLevel || "—"],
                      ["Duration", durationLabel],
                      [
                        "Age Range",
                        `${formData.minAge || "—"} – ${formData.maxAge || "—"} yrs`,
                      ],
                      ["Prerequisites", `${prerequisites.length} item${prerequisites.length === 1 ? "" : "s"}`],
                    ].map(([label, value]) => (
                      <div
                        key={label as string}
                        className="flex items-start justify-between gap-3 border-b border-gray-100 pb-2 last:border-0 last:pb-0"
                      >
                        <dt className="text-gray-500">{label}</dt>
                        <dd className="max-w-[60%] text-right font-medium text-[#2F3153] break-words">
                          {value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <p className="mt-4 text-xs text-gray-400">
                    Pricing is managed from Branch → Course Assignments.
                  </p>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex gap-3">
                    <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                    <div>
                      <p className="text-sm font-semibold text-amber-900">Publishing note</p>
                      <p className="mt-1 text-xs leading-relaxed text-amber-800">
                        New courses are created active in the system. Use the overview and tips
                        below to keep details clear before publishing on the public site.
                      </p>
                    </div>
                  </div>
                </div>

                <div className={`${sectionCard} p-5`}>
                  <div className="mb-4 flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <h3 className="text-base font-semibold text-[#2F3153]">Publish & Visibility</h3>
                  </div>
                  <div className="space-y-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      Status
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {(
                        [
                          ["draft", "Draft"],
                          ["publish", "Publish"],
                        ] as const
                      ).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setUiPublishStatus(value)}
                          className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                            uiPublishStatus === value
                              ? "border-[#2F3153] bg-[#2F3153] text-white"
                              : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <div className="space-y-2 pt-1">
                      <Label className={fieldLabel}>Visibility</Label>
                      <Select value={uiVisibility} onValueChange={setUiVisibility}>
                        <SelectTrigger className={`${inputClass} w-full`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="public">Public</SelectItem>
                          <SelectItem value="private">Private</SelectItem>
                          <SelectItem value="unlisted">Unlisted</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className={`${sectionCard} p-5`}>
                  <div className="mb-4 flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                      <GraduationCap className="h-4 w-4" />
                    </div>
                    <h3 className="text-base font-semibold text-[#2F3153]">Quick Tips</h3>
                  </div>
                  <ul className="space-y-3">
                    {[
                      "Use a clear and descriptive course title",
                      "Add a compelling description students will understand",
                      "Upload a high-quality course image",
                      "Fill SEO fields for better discoverability",
                      "Enable only the public page sections you need",
                    ].map((tip) => (
                      <li key={tip} className="flex items-start gap-2 text-sm text-gray-600">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="hidden items-center gap-2 rounded-2xl border border-dashed border-gray-200 bg-white/60 px-4 py-3 text-xs text-gray-400 xl:flex">
                  <Clock className="h-3.5 w-3.5" />
                  Overview updates as you fill the form
                </div>
              </div>
            </aside>
          </div>
        </form>
      </main>

      {showSuccessPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <svg
                  className="h-8 w-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  ></path>
                </svg>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">
                Course Created Successfully!
              </h3>
              <p className="mb-6 text-gray-600">
                Your course has been created and added to the system.
              </p>
              <div className="flex space-x-3">
                <Button
                  onClick={handleSuccessOk}
                  className="flex-1 bg-[#F5C518] text-[#2F3153] hover:bg-[#e6b800]"
                >
                  OK
                </Button>
                <Button onClick={handleSuccessOk} variant="outline" className="flex-1 bg-transparent">
                  Back to List
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
