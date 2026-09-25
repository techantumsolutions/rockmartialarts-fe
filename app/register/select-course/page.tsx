"use client"

import type React from "react"
import { getBackendApiUrl } from "@/lib/config"
import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRegistration } from "@/contexts/RegistrationContext"
import { useCMS } from "@/contexts/CMSContext"
import { toast } from "@/components/ui/use-toast"
import type { BranchCoursePricing } from "@/lib/registrationPricing"
import { RegistrationStepIndicator } from "@/components/register/RegistrationStepIndicator"

interface BranchBatchOption {
  batch_ref: string
  /** Optional admin-defined name (e.g. Morning batch) */
  name?: string | null
  label: string
  batch_fee: number | null
  days?: string[]
  start_time?: string
  end_time?: string
  trainer_name?: string | null
}

function sortBatchesByStartTime(batches: BranchBatchOption[]): BranchBatchOption[] {
  const pad = (t?: string) => {
    const s = (t || "").trim()
    if (!s) return "99:99"
    const [h, m] = s.split(":")
    return `${(h || "99").padStart(2, "0")}:${(m || "99").padStart(2, "0")}`
  }
  return [...batches].sort((a, b) => pad(a.start_time).localeCompare(pad(b.start_time)))
}

function batchIsPopular(b: BranchBatchOption): boolean {
  const n = ((b.name || "") + (b.label || "")).toLowerCase()
  return n.includes("popular")
}

function formatInr(amount: number): string {
  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
}

interface Course {
  id: string;
  title: string;
  code: string;
  description: string;
  difficulty_level: string;
  category_id?: string;
  pricing: BranchCoursePricing;
  branch_batches?: BranchBatchOption[];
  available_durations: Array<{
    id: string;
    name: string;
    code: string;
    duration_months: number;
    pricing_multiplier: number;
  }>;
}

interface DurationOption {
  id: string;
  name: string;
  duration_months: number;
  pricing_multiplier: number;
}

interface Category {
  id: string;
  name: string;
  code: string;
  description: string;
  icon_url: string | null;
  color_code: string;
  course_count: number;
  subcategories: Array<{
    id: string;
    name: string;
    code: string;
    course_count: number;
  }>;
}

export default function SelectCoursePage() {
  const router = useRouter()
  const { registrationData, updateRegistrationData } = useRegistration()
  const { cms } = useCMS()
  const branchId = registrationData.branch_id

  const [formData, setFormData] = useState({
    category_id: registrationData.category_id || "",
    course_id: registrationData.course_id || "",
    duration: registrationData.duration || "",
    batch_ref: registrationData.batch_ref || "",
  })
  const [allCategories, setAllCategories] = useState<Category[]>([])
  const [branchCourses, setBranchCourses] = useState<Course[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [masterDurations, setMasterDurations] = useState<DurationOption[] | null>(null)
  const [isLoadingDurations, setIsLoadingDurations] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  /** Real total from GET …/payment-info (same as payment step), not course list pricing. */
  const [estimateTotal, setEstimateTotal] = useState<number | null>(null)
  const [estimateLoading, setEstimateLoading] = useState(false)
  const [estimateError, setEstimateError] = useState<string | null>(null)

  // Require branch to be selected first
  useEffect(() => {
    if (!branchId) {
      router.replace("/register/select-branch")
      return
    }
  }, [branchId, router])

  // Fetch categories and courses for the selected branch
  useEffect(() => {
    if (!branchId) return

    const load = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const [catRes, coursesRes] = await Promise.all([
          fetch(getBackendApiUrl("categories/public/details?active_only=true")),
          fetch(`/api/courses/by-branch/${encodeURIComponent(branchId)}`),
        ])

        if (!catRes.ok) throw new Error("Failed to load categories")
        const catData = await catRes.json()
        const categoriesList = catData.categories || []
        setAllCategories(categoriesList)

        if (!coursesRes.ok) throw new Error("Failed to load courses for this branch")
        const coursesData = await coursesRes.json()
        const coursesList = coursesData.courses || []
        setBranchCourses(coursesList)
      } catch (err) {
        console.error("Error loading data:", err)
        setError("Failed to load courses. Please try again later.")
        toast({
          title: "Error",
          description: "Failed to load courses for this branch.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [branchId])

  // If courses don't include available_durations, fetch master durations as fallback for tenure options
  useEffect(() => {
    if (!branchId) return
    if (branchCourses.length === 0) return

    const coursesHaveDurations = branchCourses.some(
      (c) => Array.isArray(c.available_durations) && c.available_durations.length > 0
    )
    if (coursesHaveDurations || masterDurations) return

    const loadDurations = async () => {
      try {
        setIsLoadingDurations(true)
        const res = await fetch(getBackendApiUrl("durations/public/all"))
        if (!res.ok) return
        const data = await res.json()
        const list = Array.isArray(data.durations) ? data.durations : []
        const mapped: DurationOption[] = list.map((d: any) => ({
          id: d.id,
          name: d.name || d.code || "",
          duration_months: d.duration_months ?? 1,
          pricing_multiplier: d.pricing_multiplier ?? 1.0,
        }))
        if (mapped.length > 0) {
          setMasterDurations(mapped)
        }
      } catch {
        // ignore, we'll just show "No tenure options available"
      } finally {
        setIsLoadingDurations(false)
      }
    }

    loadDurations()
  }, [branchId, branchCourses, masterDurations])

  // Categories that have at least one course at this branch (don't show 0-course categories).
  // If no category mapping exists but we have courses, fall back to a single "All Courses" option.
  const categoryIdsWithCourses = new Set(
    branchCourses.map((c) => c.category_id).filter(Boolean) as string[]
  )
  // Show parent category if any branch course uses that category or one of its sub-categories (legacy data).
  const categoriesWithBranchCourses = allCategories.filter((cat) => {
    if (categoryIdsWithCourses.has(cat.id)) return true
    const subIds = new Set((cat.subcategories || []).map((s) => s.id))
    return branchCourses.some((c) => c.category_id && subIds.has(c.category_id))
  })
  const hasRealCategories = categoriesWithBranchCourses.length > 0
  const effectiveCategories: Category[] =
    hasRealCategories || branchCourses.length === 0
      ? categoriesWithBranchCourses
      : [
          {
            id: "all",
            name: "All Courses",
            code: "all",
            description: "All courses available at this branch",
            icon_url: null,
            color_code: "#000000",
            course_count: branchCourses.length,
            subcategories: [],
          },
        ]

  // For each category, count of courses at this branch
  const courseCountByCategoryId: Record<string, number> = {}
  branchCourses.forEach((c) => {
    if (c.category_id) {
      courseCountByCategoryId[c.category_id] = (courseCountByCategoryId[c.category_id] || 0) + 1
    }
  })

  // Courses for the selected category (filter from branch courses, no extra fetch)
  const courses =
    !formData.category_id || formData.category_id === "all"
      ? branchCourses
      : branchCourses.filter((c) => {
          const sel = formData.category_id
          if (c.category_id === sel) return true
          const parent = allCategories.find((cat) => cat.id === sel)
          const subIds = new Set((parent?.subcategories || []).map((s) => s.id))
          return !!(c.category_id && subIds.has(c.category_id))
        })

  const selectedCategory = effectiveCategories.find((cat) => cat.id === formData.category_id)
  const selectedCourse = courses.find((course) => course.id === formData.course_id)
  const branchBatches = useMemo(
    () => sortBatchesByStartTime(selectedCourse?.branch_batches ?? []),
    [selectedCourse?.branch_batches]
  )

  // Live estimate from API (matches payment page totals; includes batch + registration where applicable)
  useEffect(() => {
    if (!branchId || !formData.course_id || !formData.duration) {
      setEstimateTotal(null)
      setEstimateError(null)
      setEstimateLoading(false)
      return
    }
    if (branchBatches.length > 0 && !formData.batch_ref.trim()) {
      setEstimateTotal(null)
      setEstimateError(null)
      setEstimateLoading(false)
      return
    }

    const ac = new AbortController()
    const durationParam = encodeURIComponent(formData.duration)
    const batchQ =
      formData.batch_ref.trim().length > 0
        ? `&batch_ref=${encodeURIComponent(formData.batch_ref.trim())}`
        : ""

    const run = async () => {
      try {
        setEstimateLoading(true)
        setEstimateError(null)
        const url = getBackendApiUrl(
          `courses/${encodeURIComponent(formData.course_id)}/payment-info?branch_id=${encodeURIComponent(branchId)}&duration=${durationParam}${batchQ}`
        )
        const res = await fetch(url, { method: "GET", cache: "no-store", signal: ac.signal })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) {
          const detail =
            typeof json?.detail === "string" ? json.detail : "Could not load estimate."
          setEstimateTotal(null)
          setEstimateError(detail)
          return
        }
        const total = json?.pricing?.total_amount
        if (typeof total === "number" && !Number.isNaN(total)) {
          setEstimateTotal(total)
          setEstimateError(null)
        } else {
          setEstimateTotal(null)
          setEstimateError(null)
        }
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return
        setEstimateTotal(null)
        setEstimateError(null)
      } finally {
        setEstimateLoading(false)
      }
    }

    void run()
    return () => ac.abort()
  }, [
    branchId,
    formData.course_id,
    formData.duration,
    formData.batch_ref,
    branchBatches.length,
  ])

  const durationOptions: DurationOption[] =
    (selectedCourse?.available_durations as DurationOption[] | undefined)?.length
      ? (selectedCourse.available_durations as unknown as DurationOption[])
      : masterDurations || []

  // If we have courses but no category selected, default to "all" so user can pick a course.
  useEffect(() => {
    if (!branchId) return
    if (branchCourses.length > 0 && !formData.category_id && effectiveCategories.length > 0) {
      const first = effectiveCategories[0]
      setFormData((prev) => ({ ...prev, category_id: first.id }))
    }
  }, [branchId, branchCourses, effectiveCategories, formData.category_id])

  // If selected course is not in branch courses (e.g. navigated back), clear course and duration
  useEffect(() => {
    if (!formData.course_id || branchCourses.length === 0) return
    const branchCourseIds = new Set(branchCourses.map((c) => c.id))
    if (!branchCourseIds.has(formData.course_id)) {
      setFormData((prev) => ({ ...prev, course_id: "", duration: "", batch_ref: "" }))
    }
  }, [branchCourses, formData.course_id])

  // Single batch at this branch: pre-select batch_ref
  useEffect(() => {
    if (!selectedCourse?.id) return
    if (!branchBatches?.length) return
    if (branchBatches.length === 1) {
      const only = branchBatches[0].batch_ref
      setFormData((prev) =>
        prev.batch_ref === only ? prev : { ...prev, batch_ref: only }
      )
    }
  }, [selectedCourse?.id, branchBatches])

  const handleNextStep = async (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {}
    // Category is optional when we only have \"All Courses\"
    if (!formData.category_id && effectiveCategories.length > 0) {
      newErrors.category_id = "Please select a category"
    }
    if (!formData.course_id) {
      newErrors.course_id = "Please select a course"
    }
    if (!formData.duration) {
      newErrors.duration = "Please select a tenure"
    }
    if (branchBatches.length > 0 && !formData.batch_ref.trim()) {
      newErrors.batch_ref = "Please select a batch"
    }
    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors)
      return
    }
    setFieldErrors({})

    const selectedDuration = durationOptions.find((d) => d.id === formData.duration)
    if (!branchId) {
      toast({
        title: "Branch required",
        description: "Please select a branch first.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const durationParam = encodeURIComponent(formData.duration)
      const batchQ =
        formData.batch_ref.trim().length > 0
          ? `&batch_ref=${encodeURIComponent(formData.batch_ref.trim())}`
          : ""
      const payRes = await fetch(
        getBackendApiUrl(
          `courses/${encodeURIComponent(formData.course_id)}/payment-info?branch_id=${encodeURIComponent(branchId)}&duration=${durationParam}${batchQ}`
        ),
        { method: "GET", headers: { "Content-Type": "application/json" }, cache: "no-store" }
      )
      const payJson = await payRes.json().catch(() => ({}))

      if (!payRes.ok) {
        const detail =
          typeof payJson?.detail === "string"
            ? payJson.detail
            : "Could not load pricing for this course and branch."
        toast({
          title: "Pricing unavailable",
          description: detail,
          variant: "destructive",
        })
        return
      }

      const p = payJson?.pricing
      if (
        !p ||
        typeof p.course_fee !== "number" ||
        typeof p.total_amount !== "number" ||
        Number.isNaN(p.course_fee) ||
        Number.isNaN(p.total_amount)
      ) {
        toast({
          title: "Invalid pricing response",
          description: "Please try again or contact support.",
          variant: "destructive",
        })
        return
      }

      const pickedBatch =
        branchBatches.length > 0
          ? branchBatches.find((x) => x.batch_ref === formData.batch_ref.trim())
          : undefined
      const batchDisplayLabel =
        branchBatches.length > 0 && pickedBatch
          ? (pickedBatch.name && pickedBatch.name.trim()) || pickedBatch.label
          : ""

      updateRegistrationData({
        category_id: formData.category_id,
        course_id: formData.course_id,
        duration: formData.duration,
        batch_ref: formData.batch_ref.trim(),
        batch_display_label: batchDisplayLabel,
        duration_name: selectedDuration?.name || payJson.duration || "",
        duration_months: selectedDuration?.duration_months || 1,
        course_name: selectedCourse?.title || payJson.course_name || "",
        category_name: selectedCategory?.name || payJson.category_name || "",
        branch_name: payJson.branch_name || registrationData.branch_name,
        course_price: p.course_fee,
        course_currency: p.currency || "INR",
        amount: p.total_amount,
      })
      router.push("/register/payment")
    } catch (err) {
      console.error("[select-course] payment-info", err)
      toast({
        title: "Network error",
        description: "Could not verify pricing. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSelectChange = (field: string, value: string) => {
    // Clear error for this field
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: '' }))
    }
    if (field === 'category_id') {
      // Reset course and duration when category changes
      setFormData(prev => ({
        ...prev,
        category_id: value,
        course_id: "",
        duration: "",
        batch_ref: "",
      }))
    } else if (field === 'course_id') {
      // Reset duration when course changes
      setFormData(prev => ({
        ...prev,
        course_id: value,
        duration: "",
        batch_ref: "",
      }))
    } else {
      setFormData(prev => ({ ...prev, [field]: value }))
    }
  }

  const registrationMediaUrl = cms?.homepage?.registration_media_url
  const registrationMediaType = cms?.homepage?.registration_media_type || "auto"

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Illustration */}
      <div className="hidden lg:flex lg:w-1/2 bg-gray-200 items-center justify-center relative overflow-hidden">
        <div className="w-[550px] h-[550px] bg-cover bg-center bg-no-repeat overflow-hidden rounded-xl">
          {registrationMediaUrl ? (
            registrationMediaType === "video" || /\.(mp4|webm)$/i.test(registrationMediaUrl) ? (
              <video
                src={registrationMediaUrl}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                src={registrationMediaUrl}
                alt="Registration"
                className="w-full h-full object-cover"
              />
            )
          ) : (
            <div
              className="w-full h-full bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: "url('/images/select-course-left.png')" }}
            />
          )}
        </div>
      </div>

      {/* Right Side - Course Selection Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md space-y-6">
          {/* Header */}
          <div className="text-center space-y-3">
            <h1 className="text-3xl font-bold text-black">Select Course</h1>
            <p className="text-gray-500 text-sm">Please login to continue to your account.</p>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-500">{error}</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            </div>
          ) : (
          <form onSubmit={handleNextStep} className="space-y-4">
            {/* Select Category - only categories that have courses at this branch (or All Courses fallback) */}
            <div>
              <Select
                value={formData.category_id}
                onValueChange={(value) => handleSelectChange("category_id", value)}
                disabled={isLoading || effectiveCategories.length === 0}
              >
                <SelectTrigger className={`w-full !h-[60px] pl-6 pr-10 bg-[#F9F8FF] rounded-xl border-0 py-6 text-[16px] data-[placeholder]:text-black ${fieldErrors.category_id ? '!border !border-red-500' : ''}`}>
                  <SelectValue
                    placeholder={
                      isLoading
                        ? "Loading..."
                        : effectiveCategories.length === 0
                          ? "No courses available at this branch"
                          : "Select a category"
                    }
                    className="!placeholder:text-[#000]"
                  />
                </SelectTrigger>
                <SelectContent>
                  {effectiveCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name} (
                      {category.id === "all"
                        ? branchCourses.length
                        : courseCountByCategoryId[category.id] ?? 0}{" "}
                      course
                      {(category.id === "all"
                        ? branchCourses.length
                        : courseCountByCategoryId[category.id] ?? 0) !== 1
                        ? "s"
                        : ""}
                      )
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.category_id && <p className="text-red-500 text-xs mt-1 ml-1">{fieldErrors.category_id}</p>}
            </div>

            {/* Choose Course - only courses at this branch for selected category */}
            <div>
              <Select
                value={formData.course_id}
                onValueChange={(value) => handleSelectChange("course_id", value)}
                disabled={branchCourses.length === 0}
              >
                <SelectTrigger className={`w-full !h-[60px] pl-6 pr-10 bg-[#F9F8FF] rounded-xl border-0 py-6 text-[10px] data-[placeholder]:text-black data-[placeholder]:text-[16px] ${fieldErrors.course_id ? '!border !border-red-500' : ''}`}>
                  <SelectValue
                    placeholder={
                      branchCourses.length === 0
                        ? "No courses available"
                        : "Select a course"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {courses.length === 0 && formData.category_id ? (
                    <div className="p-4 text-center text-gray-500">
                      <p>No courses available for this category at this branch</p>
                    </div>
                  ) : (
                    courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        <span className="font-medium">{course.title}</span>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {fieldErrors.course_id && <p className="text-red-500 text-xs mt-1 ml-1">{fieldErrors.course_id}</p>}
            </div>

            {/* Select batch — cards (when branch defines course_schedule batches) */}
            {branchBatches.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-800 pl-1">Choose a batch</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {branchBatches.map((b) => {
                    const title = (b.name && String(b.name).trim()) || "Batch"
                    const selected = formData.batch_ref === b.batch_ref
                    const trainer =
                      (b.trainer_name && String(b.trainer_name).trim()) || null
                    const popular = batchIsPopular(b)
                    return (
                      <button
                        key={b.batch_ref}
                        type="button"
                        disabled={!formData.course_id}
                        onClick={() => {
                          if (fieldErrors.batch_ref) {
                            setFieldErrors((prev) => {
                              const next = { ...prev }
                              delete next.batch_ref
                              return next
                            })
                          }
                          setFormData((prev) => ({ ...prev, batch_ref: b.batch_ref }))
                        }}
                        className={`text-left rounded-xl border p-4 transition-all shadow-sm ${
                          selected
                            ? "border-amber-500 bg-amber-50/90 ring-2 ring-amber-400/40"
                            : "border-gray-200 bg-[#F9F8FF] hover:border-gray-300"
                        } ${!formData.course_id ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-semibold text-gray-900">{title}</span>
                          {popular ? (
                            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                              Popular
                            </span>
                          ) : null}
                        </div>
                        <p className="text-sm text-gray-700 mt-1">{b.label}</p>
                        <p className="text-sm text-gray-600 mt-2">
                          {trainer ? (
                            <>
                              <span className="text-gray-500">Trainer:</span> {trainer}
                            </>
                          ) : (
                            <span className="text-gray-400">Trainer TBA</span>
                          )}
                        </p>
                        <span className="mt-3 inline-block text-xs font-semibold text-amber-700">
                          {selected ? "Selected" : "Select"}
                        </span>
                      </button>
                    )
                  })}
                </div>
                {fieldErrors.batch_ref && (
                  <p className="text-red-500 text-xs mt-1 ml-1">{fieldErrors.batch_ref}</p>
                )}
              </div>
            )}

            {/* Select Tenure */}
            <div>
              <Select
                value={formData.duration}
                onValueChange={(value) => handleSelectChange("duration", value)}
                disabled={!formData.course_id || durationOptions.length === 0}
              >
                <SelectTrigger className={`w-full !h-[60px] pl-6 pr-10 bg-[#F9F8FF] rounded-xl border-0 py-6 text-[16px] data-[placeholder]:text-black ${fieldErrors.duration ? '!border !border-red-500' : ''}`}>
                  <SelectValue 
                    placeholder={!formData.course_id ? "Select a course first" : durationOptions.length === 0 ? "No tenure options available" : "Select tenure"} 
                  />
                </SelectTrigger>
                <SelectContent>
                  {durationOptions.map((duration) => (
                    <SelectItem key={duration.id} value={duration.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{duration.name}</span>
                        <span className="text-xs text-gray-500">
                          {duration.duration_months} months • {duration.pricing_multiplier}x pricing
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.duration && <p className="text-red-500 text-xs mt-1 ml-1">{fieldErrors.duration}</p>}
            </div>

            {/* Next Step Button */}
            {formData.course_id && formData.duration && selectedCourse ? (
              <p className="text-sm text-gray-600 text-center">
                <span className="font-medium text-gray-800">Estimate: </span>
                {estimateLoading ? (
                  <span className="text-gray-500">Calculating…</span>
                ) : estimateError ? (
                  <span className="text-amber-700">{estimateError}</span>
                ) : estimateTotal != null ? (
                  <span className="font-semibold text-gray-900 tabular-nums">
                    {formatInr(estimateTotal)}
                  </span>
                ) : (
                  <span className="text-gray-500">—</span>
                )}
                <span className="block text-xs text-gray-500 mt-1">
                  Based on your batch and tenure (same calculation as the payment step). Final total
                  is confirmed before you pay.
                </span>
              </p>
            ) : null}

            <Button 
              type="submit" 
             className="w-full bg-yellow-400 hover:bg-yellow-500 text-[#ffffff] font-bold py-4 px-6 rounded-xl text-[12px] h-14 transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl mt-8"
              disabled={
                !formData.category_id ||
                !formData.course_id ||
                !formData.duration ||
                (branchBatches.length > 0 && !formData.batch_ref.trim()) ||
                isSubmitting
              }
            >
              {isSubmitting ? "Verifying price…" : "NEXT STEP"}
            </Button>
          </form>
          )}

          {/* Step Indicator */}
          <RegistrationStepIndicator accountType="single" currentStep={3} />

      </div>
        </div>
    </div>
  )
}
