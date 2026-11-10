"use client"

import type React from "react"

import { getBackendApiUrl } from "@/lib/config"
import { useState, useEffect, useMemo, useRef } from "react"
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
import { useRouter, useParams, usePathname } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/AuthContext"
import { TokenManager } from "@/lib/tokenManager"
import { CourseMediaResourcesFields } from "@/components/dashboard/CourseMediaResourcesFields"
import CourseFormSections, { PageContent } from "@/components/dashboard/CourseFormSections"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"

function resolveCoursesDashboardBase(pathname: string | null): string {
  if (!pathname) return "/super-admin/dashboard"
  if (pathname.startsWith("/branch-admin")) return "/branch-admin/dashboard"
  if (pathname.startsWith("/branch-manager-dashboard")) return "/branch-manager-dashboard"
  if (pathname.startsWith("/super-admin")) return "/super-admin/dashboard"
  return "/dashboard"
}

function getDashboardAccessToken(): string | null {
  return BranchManagerAuth.getToken() || TokenManager.getToken()
}

export default function EditCoursePage() {
  const router = useRouter()
  const params = useParams()
  const pathname = usePathname()
  const courseId = params.id as string
  const { toast } = useToast()
  const { user } = useAuth()
  const coursesBasePath = useMemo(() => resolveCoursesDashboardBase(pathname), [pathname])
  // Branch admin gets the same full edit form as other admins.
  const isBranchFeeOnly = false
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // State
  const [categories, setCategories] = useState<any[]>([])
  const [allCategories, setAllCategories] = useState<any[]>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(true)
  const [prerequisites, setPrerequisites] = useState<string[]>([])
  const [newPrerequisite, setNewPrerequisite] = useState("")
  const [modules, setModules] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [difficultyLevels, setDifficultyLevels] = useState<any[]>([])
  const [courseDurations, setCourseDurations] = useState<any[]>([])
  const [loadingBranches, setLoadingBranches] = useState(false)
  const [branchPrices, setBranchPrices] = useState<any[]>([])
  const [addedTenures, setAddedTenures] = useState<string[]>([])
  const [addedBranchTenures, setAddedBranchTenures] = useState<Record<number, string[]>>({})
  /** Master durations from API: id, name, code, duration_months, display_order */
  type MasterDuration = { id: string; name: string; code: string; duration_months: number; display_order: number }
  const [masterDurations, setMasterDurations] = useState<MasterDuration[]>([])
  /** Fee amount per duration id (used when tenures are duration ids from master data) */
  const [feeByDurationId, setFeeByDurationId] = useState<Record<string, string>>({})
  const [flatPriceByDurationId, setFlatPriceByDurationId] = useState<Record<string, string>>({})
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
    price: "",
    currency: "INR",
    fee_1_month: "",
    fee_3_months: "",
    fee_6_months: "",
    fee_1_year: "",
    branchSpecificPricing: false,
    equipmentRequired: "",
    syllabus: "",
    imageUrl: "",
    videoUrl: "",
    videoPosterUrl: "",
    tags: [] as string[]
  })
  const [pageContent, setPageContent] = useState<PageContent>({})
  const loadedHierarchyRef = useRef<{ categoryId?: string; subCategory?: string } | null>(null)
  const [seoData, setSeoData] = useState({
    meta_title: "",
    meta_description: "",
    meta_keywords: "",
    og_image: ""
  })
  // UI-only publish chrome (does not change submit payload / API behavior)
  const [uiPublishStatus, setUiPublishStatus] = useState<"draft" | "publish">("draft")
  const [uiVisibility, setUiVisibility] = useState("public")

  /** Selected course duration (from master data); used to limit add-tenure options to <= this duration. */
  const selectedCourseDuration = masterDurations.find((d) => d.id === formData.duration)
  /** Tenure options = same as course duration master data. Allowed = those with duration_months <= selected course duration. */
  const allowedTenureOptions = masterDurations
    .filter((d) => selectedCourseDuration && d.duration_months <= selectedCourseDuration.duration_months)
    .sort((a, b) => a.display_order - b.display_order)
  const allowedTenureIds = new Set(allowedTenureOptions.map((d) => d.id))

  useEffect(() => {
    if (isBranchFeeOnly && !isLoading) {
      setFormData((prev) => ({ ...prev, branchSpecificPricing: true }))
    }
  }, [isBranchFeeOnly, isLoading])

  // Fetch categories on mount
  // Fetch categories on mount
  useEffect(() => {
    // Fetch existing course data
    const fetchCourseData = async () => {
      try {
        const token = getDashboardAccessToken()
        if (!token) {
          toast({
            title: "Authentication Error",
            description: "Please login to continue",
            variant: "destructive",
          })
          router.push('/login')
          return
        }

        const response = await fetch(getBackendApiUrl(`courses/${courseId}`), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (!response.ok) {
          throw new Error('Failed to fetch course data')
        }

        const course = await response.json()
        const pricing = course.pricing || {}
        const feePerDuration = {
          ...(pricing.fee_per_duration && typeof pricing.fee_per_duration === "object"
            ? pricing.fee_per_duration
            : {}),
          ...(course.fee_per_duration && typeof course.fee_per_duration === "object"
            ? course.fee_per_duration
            : {}),
        }
        const branchPricingRaw = course.branch_pricing || {}
        const branchPricesList: { branch_id: string; fee_per_duration: Record<string, string> }[] = []
        const branchTenures: Record<number, string[]> = {}
        Object.keys(branchPricingRaw).forEach((branchId, idx) => {
          const val = branchPricingRaw[branchId]
          if (typeof val === "object" && val !== null) {
            const feePerDur: Record<string, string> = {}
            Object.keys(val).forEach((k) => { if (val[k] != null) feePerDur[k] = String(val[k]) })
            const keys = Object.keys(feePerDur)
            branchTenures[idx] = keys
            branchPricesList.push({ branch_id: branchId, fee_per_duration: feePerDur })
          } else if (typeof val === "number") {
            branchTenures[idx] = []
            branchPricesList.push({ branch_id: branchId, fee_per_duration: {} })
          }
        })
        setBranchPrices(branchPricesList)
        setAddedBranchTenures(branchTenures)
        const defaultAdded = Object.keys(feePerDuration).filter((k) => {
          const n = parseFloat(String(feePerDuration[k]))
          return feePerDuration[k] != null && !Number.isNaN(n) && n > 0
        })
        const feeByDur: Record<string, string> = {}
        defaultAdded.forEach((k) => { feeByDur[k] = String(feePerDuration[k]) })
        const amountHint = parseFloat(String(pricing?.amount ?? course.base_fee ?? ""))
        if (defaultAdded.length === 0 && Number.isFinite(amountHint) && amountHint > 0) {
          defaultAdded.push("1-month")
          feeByDur["1-month"] = String(amountHint)
        }
        setAddedTenures(defaultAdded)
        setFeeByDurationId(feeByDur)
        const durationRaw = course.duration?.toString() || ""
        loadedHierarchyRef.current = {
          categoryId: course.category_id || course.category || "",
          subCategory: course.sub_category || "",
        }
        setFormData({
          courseTitle: course.title || course.course_name || "",
          courseCode: course.code || "",
          description: course.description || "",
          category: course.category_id || course.category || "",
          subcategory: course.sub_category || "",
          difficultyLevel: course.difficulty_level || course.difficultyLevel || "",
          duration: durationRaw,
          maxStudents: course.max_students?.toString() || course.student_requirements?.max_students?.toString() || "",
          minAge: course.min_age?.toString() || course.student_requirements?.min_age?.toString() || "",
          maxAge: course.max_age?.toString() || course.student_requirements?.max_age?.toString() || "",
          price: pricing.amount?.toString() || course.base_fee?.toString() || feePerDuration["1-month"]?.toString() || Object.values(feePerDuration)[0]?.toString() || "",
          currency: pricing.currency || "INR",
          fee_1_month: "",
          fee_3_months: "",
          fee_6_months: "",
          fee_1_year: "",
          branchSpecificPricing: pricing.branch_specific_pricing ?? false,
          equipmentRequired: course.equipment_required || course.course_content?.equipment_required?.join?.(', ') || "",
          syllabus: course.syllabus || course.course_content?.syllabus || "",
          imageUrl: course.imageUrl || course.media_resources?.course_image_url || "",
          videoUrl: course.videoUrl || course.media_resources?.promo_video_url || "",
          videoPosterUrl: course.media_resources?.video_poster_url || "",
          tags: course.tags || [],
        })
        setIsLoading(false)
        // Populate page content sections
        if (course.page_content) {
          const pc = { ...course.page_content } as PageContent
          // Drop legacy about_section.content_blocks (not editable in CMS; caused old demo copy on public page)
          if (pc.about_section && typeof pc.about_section === "object") {
            const { content_blocks: _legacy, ...aboutRest } = pc.about_section as PageContent["about_section"] & {
              content_blocks?: unknown
            }
            pc.about_section = aboutRest
          }
          setPageContent(pc)
        }
        if (course.seo) {
          setSeoData({
            meta_title: course.seo.meta_title || "",
            meta_description: course.seo.meta_description || "",
            meta_keywords: course.seo.meta_keywords || "",
            og_image: course.seo.og_image || ""
          })
        }
      } catch (error) {
        console.error('Error fetching course:', error)
        toast({
          title: "Error",
          description: "Failed to load course data",
          variant: "destructive",
        })
        setIsLoading(false)
      }
    }

    fetchCourseData()

    const fetchCategories = async () => {
      try {
        setIsLoadingCategories(true)
        const token = getDashboardAccessToken()
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
        const token = getDashboardAccessToken()
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

  const FALLBACK_DURATIONS: MasterDuration[] = [
    { id: '1m', name: '1 month', code: '1M', duration_months: 1, display_order: 1 },
    { id: '2m', name: '2 months', code: '2M', duration_months: 2, display_order: 2 },
    { id: '3m', name: '3 months', code: '3M', duration_months: 3, display_order: 3 },
    { id: '6m', name: '6 months', code: '6M', duration_months: 6, display_order: 4 },
    { id: '1y', name: '1 year', code: '1Y', duration_months: 12, display_order: 5 },
    { id: '2y', name: '2 years', code: '2Y', duration_months: 24, display_order: 6 }
  ]

  // Fetch course durations from master data (same source as Super Admin Master Data)
  useEffect(() => {
    const fetchDurations = async () => {
      try {
        const token = getDashboardAccessToken()
        const response = await fetch(getBackendApiUrl('durations'), {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        })
        let list: MasterDuration[] = []
        if (response.ok) {
          const data = await response.json()
          const raw = (data.durations || []).filter((d: any) => d.is_active !== false)
          list = raw.map((d: any) => ({
            id: String(d.id),
            name: String(d.name || d.label || ''),
            code: String(d.code || ''),
            duration_months: typeof d.duration_months === 'number' ? d.duration_months : parseInt(String(d.duration_months), 10) || 1,
            display_order: typeof d.display_order === 'number' ? d.display_order : parseInt(String(d.display_order), 10) || 0
          })).filter((d: MasterDuration) => d.id && d.name)
        }
        if (list.length === 0) list = FALLBACK_DURATIONS
        setMasterDurations(list)
        setCourseDurations(list.map((d) => ({ value: d.id, label: d.name })))
      } catch (error) {
        console.error('Error fetching durations:', error)
        setMasterDurations(FALLBACK_DURATIONS)
        setCourseDurations(FALLBACK_DURATIONS.map((d) => ({ value: d.id, label: d.name })))
      }
    }
    fetchDurations()
  }, [])
  // Legacy: course may have category_id set to a sub-category row — show parent + subcategory
  useEffect(() => {
    const loaded = loadedHierarchyRef.current
    if (!loaded || allCategories.length === 0) return
    const cid = loaded.categoryId || ""
    const sub = loaded.subCategory || ""
    const cat = allCategories.find((c: any) => c.id === cid)
    if (cat?.parent_category_id) {
      setFormData((prev) => ({
        ...prev,
        category: cat.parent_category_id,
        subcategory: cid,
      }))
      return
    }
    setFormData((prev) => ({
      ...prev,
      category: cid,
      subcategory: sub,
    }))
  }, [allCategories])

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

  // When course duration changes, restrict added tenures to those allowed (duration_months <= selected) and clear removed fee values
  useEffect(() => {
    if (allowedTenureIds.size === 0) return
    setAddedTenures((prev) => {
      const next = prev.filter((id) => allowedTenureIds.has(id))
      return next.length === prev.length ? prev : next
    })
    setFeeByDurationId((prev) => {
      const next = { ...prev }
      let changed = false
      Object.keys(next).forEach((id) => {
        if (!allowedTenureIds.has(id)) {
          delete next[id]
          changed = true
        }
      })
      return changed ? next : prev
    })
    setAddedBranchTenures((prev) => {
      let changed = false
      const next = { ...prev }
      Object.keys(next).forEach((idx) => {
        const i = parseInt(idx, 10)
        const filtered = next[i].filter((id) => allowedTenureIds.has(id))
        if (filtered.length !== next[i].length) {
          next[i] = filtered
          changed = true
        }
      })
      return changed ? next : prev
    })
    setBranchPrices((prev) =>
      prev.map((bp) => {
        const copy = { ...(bp as any), fee_per_duration: { ...(bp as any).fee_per_duration } }
        if (copy.fee_per_duration)
          Object.keys(copy.fee_per_duration).forEach((id) => {
            if (!allowedTenureIds.has(id)) delete copy.fee_per_duration[id]
          })
        return copy
      })
    )
  }, [formData.duration, allowedTenureIds.size])

  // When master durations load: resolve duration by name to id, and migrate legacy tenure keys to duration ids
  useEffect(() => {
    if (masterDurations.length === 0) return
    const legacyToMonths: Record<string, number> = { "1-month": 1, "2-months": 2, "3-months": 3, "6-months": 6, "1-year": 12, "2-years": 24 }
    const isLegacyKey = (k: string) => legacyToMonths.hasOwnProperty(k)
    const legacyToId = (k: string): string | null => {
      const months = legacyToMonths[k]
      if (months == null) return null
      const d = masterDurations.find((m) => m.duration_months === months)
      return d?.id ?? null
    }
    setFormData((prev) => {
      if (!prev.duration) return prev
      if (masterDurations.some((d) => d.id === prev.duration)) return prev
      const byName = masterDurations.find((d) => d.name?.toLowerCase() === prev.duration?.toLowerCase())
      if (byName) return { ...prev, duration: byName.id }
      const asMonths = parseInt(prev.duration, 10)
      if (!Number.isNaN(asMonths)) {
        const byMonths = masterDurations.find((d) => d.duration_months === asMonths)
        if (byMonths) return { ...prev, duration: byMonths.id }
      }
      return prev
    })
    setFeeByDurationId((prev) => {
      const legacyKeys = Object.keys(prev).filter(isLegacyKey)
      if (legacyKeys.length === 0) return prev
      const next = { ...prev }
      legacyKeys.forEach((k) => {
        const id = legacyToId(k)
        if (id) { next[id] = next[k]; delete next[k] }
      })
      return next
    })
    setAddedTenures((prev) => {
      const migrated = prev.map((k) => (isLegacyKey(k) ? legacyToId(k) ?? k : k))
      return migrated.some((v, i) => v !== prev[i]) ? migrated : prev
    })
    setAddedBranchTenures((prev) => {
      let changed = false
      const next = { ...prev }
      Object.keys(next).forEach((idx) => {
        const i = parseInt(idx, 10)
        const migrated = next[i].map((k) => (isLegacyKey(k) ? legacyToId(k) ?? k : k))
        if (migrated.some((v, j) => v !== next[i][j])) { next[i] = migrated; changed = true }
      })
      return changed ? next : prev
    })
    setBranchPrices((prev) =>
      prev.map((bp) => {
        const fd = (bp as any).fee_per_duration || {}
        const legacyKeys = Object.keys(fd).filter(isLegacyKey)
        if (legacyKeys.length === 0) return bp
        const nextFd = { ...fd }
        legacyKeys.forEach((k) => {
          const id = legacyToId(k)
          if (id) { nextFd[id] = nextFd[k]; delete nextFd[k] }
        })
        return { ...(bp as any), fee_per_duration: nextFd }
      })
    )
  }, [masterDurations.length, formData.duration])

  // Fetch branches on mount
  useEffect(() => {
    const fetchBranches = async () => {
      setLoadingBranches(true)
      try {
        const token = getDashboardAccessToken()
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
      if (isBranchFeeOnly) {
        const entries = branchPrices
          .map((bp, idx) => ({ bp, idx }))
          .filter(({ bp }) => Boolean((bp as any).branch_id))
        if (entries.length === 0) {
          toast({
            title: "Validation Error",
            description: "Select your branch and add tenure fees.",
            variant: "destructive",
          })
          setIsSubmitting(false)
          return
        }
        let hasFee = false
        for (const { bp, idx } of entries) {
          const tenures = addedBranchTenures[idx] || []
          const fd = (bp as any).fee_per_duration || {}
          for (const tid of tenures) {
            const v = fd[tid]
            if (v !== "" && v !== undefined && parseFloat(String(v)) > 0) hasFee = true
          }
        }
        if (!hasFee) {
          toast({
            title: "Validation Error",
            description: "Enter at least one branch tenure fee greater than zero.",
            variant: "destructive",
          })
          setIsSubmitting(false)
          return
        }
        const branch_prices = entries.map(({ bp, idx }) => {
          const tenures = addedBranchTenures[idx] || []
          const fd = (bp as any).fee_per_duration || {}
          const entry: Record<string, unknown> = { branch_id: (bp as any).branch_id, currency: "INR" }
          const feePerDur: Record<string, number> = {}
          tenures.forEach((id) => {
            const v = fd[id]
            if (v !== "" && v !== undefined) {
              const n = parseFloat(String(v))
              if (!Number.isNaN(n)) feePerDur[id] = n
            }
          })
          if (Object.keys(feePerDur).length > 0) entry.fee_per_duration = feePerDur
          return entry
        })
        const token = getDashboardAccessToken()
        if (!token) {
          toast({
            title: "Authentication Error",
            description: "No authentication token available. Please login again.",
            variant: "destructive",
          })
          setIsSubmitting(false)
          return
        }
        const response = await fetch(getBackendApiUrl(`courses/${courseId}`), {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            pricing: {
              currency: "INR",
              amount: 0,
              branch_specific_pricing: true,
              branch_prices,
            },
          }),
        })
        const result = await response.json()
        if (!response.ok) {
          let errorMessage = `Failed to update branch fees (${response.status})`
          if (result.detail) {
            if (Array.isArray(result.detail)) {
              errorMessage = result.detail
                .map((err: { loc?: string[]; msg?: string }) =>
                  `${err.loc ? err.loc.join(".") : "Field"}: ${err.msg}`
                )
                .join(", ")
            } else if (typeof result.detail === "string") {
              errorMessage = result.detail
            } else if (typeof result.detail === "object") {
              errorMessage = JSON.stringify(result.detail)
            }
          } else if (result.message) {
            errorMessage = result.message
          }
          throw new Error(errorMessage)
        }
        toast({ title: "Success!", description: "Branch fees updated successfully." })
        setShowSuccessPopup(true)
        setIsSubmitting(false)
        return
      }

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

      // Live student prices are set on Branch → Course Assignments (batch fees).
      // Course-level tenure fees are optional and must not block saving course details.

      const feePerDurationPayload: Record<string, number> = {}
      const flatPricePayload: Record<string, number> = {}
      addedTenures.forEach((id) => {
        const v = feeByDurationId[id]
        if (v !== "" && v !== undefined) {
          const n = parseFloat(String(v))
          if (!Number.isNaN(n)) feePerDurationPayload[id] = n
        }
        const fp = flatPriceByDurationId[id]
        if (fp !== "" && fp !== undefined) {
          const n = parseFloat(String(fp))
          if (!Number.isNaN(n)) flatPricePayload[id] = n
        }
      })
      const firstAmount = addedTenures.length > 0 && feeByDurationId[addedTenures[0]] ? parseFloat(String(feeByDurationId[addedTenures[0]])) : 0

      const parsedMaxStudents = parseInt(String(formData.maxStudents ?? "").trim(), 10)
      const apiData = {
        title: formData.courseTitle,
        code: formData.courseCode,
        description: formData.description,
        difficulty_level: formData.difficultyLevel,
        duration: formData.duration || undefined,
        category_id: formData.category,
        sub_category: formData.subcategory || null,
        martial_art_style_id: 'style-default',
        instructor_id: user?.id && user.id.includes('instructor-') ? user.id : 'instructor-default',
        student_requirements: {
          ...(Number.isFinite(parsedMaxStudents) && parsedMaxStudents > 0
            ? { max_students: parsedMaxStudents }
            : {}),
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
          amount: firstAmount,
          branch_specific_pricing: formData.branchSpecificPricing,
          fee_per_duration: Object.keys(feePerDurationPayload).length > 0 ? feePerDurationPayload : undefined,
          branch_prices: branchPrices
            .map((bp, idx) => ((bp as any).branch_id ? { bp, idx } : null))
            .filter((x): x is { bp: any; idx: number } => x != null)
            .map(({ bp, idx }) => {
              const tenures = addedBranchTenures[idx] || []
              const fd = (bp as any).fee_per_duration || {}
              const entry: any = { branch_id: (bp as any).branch_id, currency: "INR" }
              const feePerDur: Record<string, number> = {}
              tenures.forEach((id) => {
                const v = fd[id]
                if (v !== "" && v !== undefined) {
                  const n = parseFloat(String(v))
                  if (!Number.isNaN(n)) feePerDur[id] = n
                }
              })
              if (Object.keys(feePerDur).length > 0) entry.fee_per_duration = feePerDur
              return entry
            }),
        },
        settings: {
          offers_certification: (formData as any).offersCertification || true,
          active: true
        },
        page_content: pageContent,
        seo: seoData.meta_title || seoData.meta_description ? seoData : undefined
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

      const token = getDashboardAccessToken()

      if (!token) {
        toast({
          title: "Authentication Error",
          description: "No authentication token available. Please login again.",
          variant: "destructive"
        })
        return
      }

      const response = await fetch(getBackendApiUrl(`courses/${courseId}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
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

      toast({ title: "Success!", description: "Course updated successfully." })

      setShowSuccessPopup(true)

    } catch (error) {
      console.error('Error updating course:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update course. Please try again.",
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
      const token = getDashboardAccessToken()
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
    router.push(`${coursesBasePath}/courses`)
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

  const requestEditFormSubmit = () => {
    const form = document.getElementById("edit-course-form") as HTMLFormElement | null
    form?.requestSubmit()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F6FA]">
        <div className="flex h-96 items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-[#2F3153]" />
            <p className="text-gray-600">Loading course data...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F6FA]">
      <main className="w-full py-6 px-4 lg:px-8 xl:px-10">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#2F3153]">
              {isBranchFeeOnly ? "Branch course fees" : "Edit Course"}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {isBranchFeeOnly
                ? "Edit fees for your branch only. Other course details are managed by a super admin."
                : "Update course details, requirements, media, and the public page layout."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`${coursesBasePath}/courses`)}
              className="h-10 rounded-lg border-gray-200 bg-white text-[#4F5077] hover:bg-gray-50"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Courses
            </Button>
            {!isBranchFeeOnly ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={requestEditFormSubmit}
                  className="h-10 rounded-lg border-gray-200 bg-white text-[#4F5077] hover:bg-gray-50"
                >
                  Save Draft
                </Button>
                <Button
                  type="button"
                  disabled={isSubmitting}
                  onClick={requestEditFormSubmit}
                  className="h-10 rounded-lg bg-[#2F3153] px-4 text-white hover:bg-[#3d3f6a]"
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Save
                </Button>
              </>
            ) : null}
          </div>
        </div>

        {isBranchFeeOnly ? (
          <div className="max-w-3xl">
            <div className={`${sectionCard} p-5 sm:p-6`}>
              <SectionHeading
                icon={BookOpen}
                title="Course information (read-only)"
                subtitle="Managed by a super admin"
                tone="violet"
              />
              <div className="space-y-4 text-sm text-[#7D8592]">
                <div>
                  <p className="text-xs text-gray-500">Title</p>
                  <p className="font-medium text-[#2F3153]">{formData.courseTitle || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Code</p>
                  <p className="font-medium text-[#2F3153]">{formData.courseCode || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Description</p>
                  <p className="whitespace-pre-wrap">{formData.description || "—"}</p>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-gray-500">Category</p>
                    <p className="font-medium text-[#2F3153]">
                      {categories.find((c) => c.id === formData.category)?.name || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Difficulty</p>
                    <p className="font-medium text-[#2F3153]">{formData.difficultyLevel || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Duration</p>
                    <p className="font-medium text-[#2F3153]">
                      {courseDurations.find((d) => d.value === formData.duration)?.label || "—"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <form id="edit-course-form" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
              <div className="space-y-5 xl:col-span-8">
                <div className={`${sectionCard} p-5 sm:p-6`}>
                  <SectionHeading
                    icon={BookOpen}
                    title="Course Information"
                    subtitle="Basic details that identify this course"
                    tone="violet"
                  />
                  <div className="space-y-4 text-[#7D8592]">
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

                <div className={`${sectionCard} p-5 sm:p-6`}>
                  <SectionHeading
                    icon={Layout}
                    title="Public Course Page"
                    subtitle="Toggle sections and build content for the public course page"
                    tone="rose"
                  />
                  <CourseFormSections value={pageContent} onChange={setPageContent} />
                </div>

                <div className="flex flex-wrap items-center justify-end gap-3 pb-8 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push(`${coursesBasePath}/courses`)}
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
                        Saving...
                      </>
                    ) : (
                      "Save"
                    )}
                  </Button>
                </div>
              </div>

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
                        [
                          "Prerequisites",
                          `${prerequisites.length} item${prerequisites.length === 1 ? "" : "s"}`,
                        ],
                      ].map(([label, value]) => (
                        <div
                          key={label as string}
                          className="flex items-start justify-between gap-3 border-b border-gray-100 pb-2 last:border-0 last:pb-0"
                        >
                          <dt className="text-gray-500">{label}</dt>
                          <dd className="max-w-[60%] break-words text-right font-medium text-[#2F3153]">
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
                          Changes save to the course record immediately. Use the overview and tips
                          below to keep details clear before updating the public site.
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
        )}
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
                Course Updated Successfully!
              </h3>
              <p className="mb-6 text-gray-600">Your course has been updated successfully.</p>
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
