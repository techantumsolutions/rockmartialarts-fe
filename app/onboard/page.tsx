"use client"

import type React from "react"
import { Suspense, useCallback, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getBackendApiUrl } from "@/lib/config"
import { filterEnrollableCourses } from "@/lib/studentRegistrationPayment"

interface StudentPreFill {
  id: string
  email?: string
  email_masked?: string
  phone_masked?: string
  first_name: string
  last_name: string
  date_of_birth?: string | null
  gender?: string | null
}

interface Branch {
  id: string
  name: string
  code?: string
  address?: { city?: string; state?: string }
}

interface Course {
  id: string
  title: string
  code?: string
  category_id?: string
  pricing?: { amount: number; currency: string }
  available_durations?: Array<{ id: string; name: string; duration_months: number; pricing_multiplier?: number }>
}

interface Category {
  id: string
  name: string
  code?: string
}

function OnboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token") || ""

  const [validating, setValidating] = useState(true)
  const [valid, setValid] = useState(false)
  const [message, setMessage] = useState("")
  const [student, setStudent] = useState<StudentPreFill | null>(null)

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    date_of_birth: "",
    gender: "",
    password: "",
    confirm_password: "",
    location: "",
    branch_id: "",
    category_id: "",
    course_id: "",
    duration_id: "",
    joining_date: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")

  const [allBranches, setAllBranches] = useState<Branch[]>([])
  const [locations, setLocations] = useState<string[]>([])
  const [filteredBranches, setFilteredBranches] = useState<Branch[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [branchCourses, setBranchCourses] = useState<Course[]>([])
  const [durations, setDurations] = useState<Array<{ id: string; name: string; duration_months: number }>>([])

  const validateToken = useCallback(async () => {
    if (!token.trim()) {
      setValidating(false)
      setValid(false)
      setMessage("Missing link. Please use the link sent to you by the branch.")
      return
    }
    try {
      const res = await fetch(getBackendApiUrl(`onboarding/validate?token=${encodeURIComponent(token)}`))
      const data = await res.json().catch(() => ({}))
      if (data.valid && data.student) {
        setValid(true)
        setStudent(data.student)
        setForm((prev) => ({
          ...prev,
          first_name: data.student.first_name || "",
          last_name: data.student.last_name || "",
          date_of_birth: data.student.date_of_birth ? data.student.date_of_birth.slice(0, 10) : "",
          gender: data.student.gender || "",
        }))
      } else {
        setValid(false)
        setMessage(data.message || "Invalid or expired link.")
      }
    } catch {
      setValid(false)
      setMessage("Could not verify link. Please try again.")
    } finally {
      setValidating(false)
    }
  }, [token])

  useEffect(() => {
    validateToken()
  }, [validateToken])

  useEffect(() => {
    const loadBranches = async () => {
      try {
        const res = await fetch(getBackendApiUrl("branches/public/all"))
        if (!res.ok) return
        const data = await res.json()
        const list = (data.branches || []).map((b: any) => ({
          id: b.id,
          name: b.branch?.name || b.name,
          code: b.branch?.code || b.code,
          address: b.branch?.address || b.address || {},
        }))
        setAllBranches(list)
        const cities = Array.from(new Set(list.map((b: Branch) => b.address?.city).filter(Boolean))) as string[]
        setLocations(cities.sort())
      } catch {
        // ignore
      }
    }
    loadBranches()
  }, [])

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await fetch(getBackendApiUrl("categories/public/details?active_only=true"))
        if (!res.ok) return
        const data = await res.json()
        setCategories(data.categories || [])
      } catch {
        // ignore
      }
    }
    loadCategories()
  }, [])

  useEffect(() => {
    if (!form.location) {
      setFilteredBranches([])
      setForm((p) => ({ ...p, branch_id: "" }))
      return
    }
    if (form.location === "all") {
      setFilteredBranches(allBranches)
    } else {
      setFilteredBranches(
        allBranches.filter(
          (b) =>
            b.address?.city?.toLowerCase() === form.location.toLowerCase() ||
            b.name?.toLowerCase().includes(form.location.toLowerCase())
        )
      )
    }
    setForm((p) => ({ ...p, branch_id: "", category_id: "all", course_id: "", duration_id: "" }))
  }, [form.location, allBranches])

  useEffect(() => {
    if (!form.branch_id) {
      setBranchCourses([])
      setForm((p) => ({ ...p, category_id: "all", course_id: "", duration_id: "" }))
      return
    }
    const load = async () => {
      try {
        const res = await fetch(`/api/courses/by-branch/${encodeURIComponent(form.branch_id)}`)
        if (!res.ok) return
        const data = await res.json()
        setBranchCourses(filterEnrollableCourses(data.courses || []))
      } catch {
        setBranchCourses([])
      }
    }
    load()
  }, [form.branch_id])

  useEffect(() => {
    if (!form.course_id) {
      setDurations([])
      setForm((p) => ({ ...p, duration_id: "" }))
      return
    }
    const course = branchCourses.find((c) => c.id === form.course_id)
    if (course?.available_durations?.length) {
      setDurations(
        course.available_durations.map((d) => ({
          id: d.id,
          name: d.name || `${d.duration_months} month(s)`,
          duration_months: d.duration_months,
        }))
      )
    } else {
      const loadDurations = async () => {
        try {
          const res = await fetch(getBackendApiUrl(`durations/public/by-course/${form.course_id}`))
          if (!res.ok) return
          const data = await res.json()
          const list = (data.durations || data).map((d: any) => ({
            id: d.id,
            name: d.name || d.code || `${d.duration_months || 1} month(s)`,
            duration_months: d.duration_months ?? 1,
          }))
          setDurations(list)
        } catch {
          setDurations([])
        }
      }
      loadDurations()
    }
    setForm((p) => ({ ...p, duration_id: "" }))
  }, [form.course_id, branchCourses])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError("")
    const newErrors: Record<string, string> = {}
    if (!form.first_name?.trim()) newErrors.first_name = "First name is required"
    if (!form.last_name?.trim()) newErrors.last_name = "Last name is required"
    if (!form.password) newErrors.password = "Password is required"
    else if (form.password.length < 6) newErrors.password = "Password must be at least 6 characters"
    if (form.password !== form.confirm_password) newErrors.confirm_password = "Passwords do not match"
    if (!form.branch_id) newErrors.branch_id = "Please select an academy"
    if (!form.course_id) newErrors.course_id = "Please select a course"
    if (!form.duration_id) newErrors.duration_id = "Please select a duration"
    if (!form.joining_date) newErrors.joining_date = "Joining date is required"
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    setSubmitting(true)
    try {
      const res = await fetch(getBackendApiUrl("onboarding/submit"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password: form.password,
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          date_of_birth: form.date_of_birth || null,
          gender: form.gender || null,
          branch_id: form.branch_id,
          course_id: form.course_id,
          duration_id: form.duration_id,
          joining_date: form.joining_date,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setSubmitError(data.detail || data.message || "Something went wrong.")
        return
      }
      router.replace("/login?onboarded=1")
    } catch {
      setSubmitError("Network error. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500 mx-auto mb-4" />
          <p className="text-gray-600">Verifying your link...</p>
        </div>
      </div>
    )
  }

  if (!valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Invalid or expired link</h1>
          <p className="text-gray-600 mb-6">{message}</p>
          <Link href="/register">
            <Button className="w-full  font-semibold">
              Register as new student
            </Button>
          </Link>
          <p className="mt-4 text-sm text-gray-500">
            Already have an account? <Link href="/login" className="text-yellow-600 hover:underline">Login</Link>
          </p>
        </div>
      </div>
    )
  }

  const categoryIds = Array.from(new Set(branchCourses.map((c) => c.category_id).filter(Boolean)))
  const effectiveCategories = categories.filter((c) => categoryIds.includes(c.id))
  const hasCategories = effectiveCategories.length > 0
  const coursesForCategory =
    !form.category_id || form.category_id === "all" || !hasCategories
      ? branchCourses
      : branchCourses.filter((c) => c.category_id === form.category_id)

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Complete your profile</h1>
        <p className="text-gray-600 text-sm mb-6">
          Set your password and confirm your course, branch, and joining date. Next month you can pay from the app.
        </p>
        {student?.email_masked && (
          <p className="text-sm text-gray-500 mb-4">Account: {student.email_masked}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First name</label>
              <Input
                value={form.first_name}
                onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))}
                className={errors.first_name ? "border-red-500" : ""}
                placeholder="First name"
              />
              {errors.first_name && <p className="text-red-500 text-xs mt-1">{errors.first_name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last name</label>
              <Input
                value={form.last_name}
                onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))}
                className={errors.last_name ? "border-red-500" : ""}
                placeholder="Last name"
              />
              {errors.last_name && <p className="text-red-500 text-xs mt-1">{errors.last_name}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date of birth</label>
            <Input
              type="date"
              value={form.date_of_birth}
              onChange={(e) => setForm((p) => ({ ...p, date_of_birth: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
            <Select value={form.gender} onValueChange={(v) => setForm((p) => ({ ...p, gender: v }))}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <PasswordInput
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              placeholder="Choose a password (min 6 characters)"
              className={errors.password ? "border-red-500" : ""}
            />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
            <PasswordInput
              value={form.confirm_password}
              onChange={(e) => setForm((p) => ({ ...p, confirm_password: e.target.value }))}
              placeholder="Confirm password"
              className={errors.confirm_password ? "border-red-500" : ""}
            />
            {errors.confirm_password && <p className="text-red-500 text-xs mt-1">{errors.confirm_password}</p>}
          </div>

          <hr className="border-gray-200 my-6" />
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Course & branch</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <Select value={form.location} onValueChange={(v) => setForm((p) => ({ ...p, location: v }))}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All locations</SelectItem>
                {locations.map((loc) => (
                  <SelectItem key={loc} value={loc}>
                    {loc}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Academy</label>
            <Select
              value={form.branch_id}
              onValueChange={(v) => setForm((p) => ({ ...p, branch_id: v }))}
              disabled={!form.location}
            >
              <SelectTrigger className={errors.branch_id ? "border-red-500" : ""}>
                <SelectValue placeholder={form.location ? "Select academy" : "Select location first"} />
              </SelectTrigger>
              <SelectContent>
                {filteredBranches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name} {b.address?.city ? `(${b.address.city})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.branch_id && <p className="text-red-500 text-xs mt-1">{errors.branch_id}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <Select
              value={form.category_id}
              onValueChange={(v) => setForm((p) => ({ ...p, category_id: v, course_id: "", duration_id: "" }))}
              disabled={!form.branch_id}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={form.branch_id ? "Select category" : "Select academy first"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All courses</SelectItem>
                {effectiveCategories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
            <Select
              value={form.course_id}
              onValueChange={(v) => setForm((p) => ({ ...p, course_id: v, duration_id: "" }))}
              disabled={coursesForCategory.length === 0}
            >
              <SelectTrigger className={errors.course_id ? "border-red-500" : ""}>
                <SelectValue placeholder={coursesForCategory.length ? "Select course" : "No courses"} />
              </SelectTrigger>
              <SelectContent>
                {coursesForCategory.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.course_id && <p className="text-red-500 text-xs mt-1">{errors.course_id}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
            <Select
              value={form.duration_id}
              onValueChange={(v) => setForm((p) => ({ ...p, duration_id: v }))}
              disabled={durations.length === 0}
            >
              <SelectTrigger className={errors.duration_id ? "border-red-500" : ""}>
                <SelectValue placeholder={durations.length ? "Select duration" : "Select course first"} />
              </SelectTrigger>
              <SelectContent>
                {durations.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.duration_id && <p className="text-red-500 text-xs mt-1">{errors.duration_id}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Joining date</label>
            <Input
              type="date"
              value={form.joining_date}
              onChange={(e) => setForm((p) => ({ ...p, joining_date: e.target.value }))}
              className={errors.joining_date ? "border-red-500" : ""}
            />
            {errors.joining_date && <p className="text-red-500 text-xs mt-1">{errors.joining_date}</p>}
          </div>

          {submitError && <p className="text-red-500 text-sm">{submitError}</p>}

          <Button
            type="submit"
            disabled={submitting}
            className="w-full  font-semibold py-6"
          >
            {submitting ? "Saving..." : "Complete & go to login"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account? <Link href="/login" className="text-yellow-600 hover:underline">Login</Link>
        </p>
      </div>
    </div>
  )
}

function OnboardFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500 mx-auto mb-4" />
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  )
}

export default function OnboardPage() {
  return (
    <Suspense fallback={<OnboardFallback />}>
      <OnboardContent />
    </Suspense>
  )
}
