"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRegistration, emptyFamilyStudent, type FamilyStudentLine } from "@/contexts/RegistrationContext"
import { useCMS } from "@/contexts/CMSContext"
import { getBackendApiUrl } from "@/lib/config"
import { Plus, Trash2 } from "lucide-react"

const RELATIONSHIPS = [
  { value: "self", label: "Self" },
  { value: "child", label: "Child" },
  { value: "spouse", label: "Spouse" },
  { value: "ward", label: "Ward" },
  { value: "sibling", label: "Sibling" },
  { value: "parent", label: "Parent" },
  { value: "guardian", label: "Guardian" },
  { value: "other", label: "Other" },
]

interface Branch {
  id: string
  name: string
}

interface Course {
  id: string
  title: string
  category_id?: string
  available_durations?: Array<{
    id: string
    name: string
    duration_months: number
  }>
  branch_batches?: Array<{
    batch_ref: string
    name?: string | null
    label: string
  }>
}

interface Category {
  id: string
  name: string
}

function formatInr(amount: number): string {
  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
}

export default function FamilyStudentsPage() {
  const router = useRouter()
  const { registrationData, updateRegistrationData, registrationStorageReady } = useRegistration()
  const { cms } = useCMS()
  const [students, setStudents] = useState<FamilyStudentLine[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [coursesByBranch, setCoursesByBranch] = useState<Record<string, Course[]>>({})
  const [loadingBranch, setLoadingBranch] = useState<string>("")
  const [masterDurations, setMasterDurations] = useState<Array<{ id: string; name: string; duration_months: number }>>([])
  const [pricingBusy, setPricingBusy] = useState(false)
  const [error, setError] = useState("")
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!registrationStorageReady) return
    if (!registrationData.email || !registrationData.password) {
      router.replace("/register")
      return
    }
    if (registrationData.familyStudents?.length) {
      setStudents(registrationData.familyStudents)
    } else {
      setStudents([
        emptyFamilyStudent({
          firstName: registrationData.firstName,
          lastName: registrationData.lastName,
          dob: registrationData.dob,
          gender: registrationData.gender,
          relationship: "self",
        }),
      ])
    }
  }, [registrationStorageReady])

  useEffect(() => {
    students.forEach((s) => {
      if (s.branch_id) void loadCourses(s.branch_id)
    })
  }, [students.map((s) => s.branch_id).join(",")])

  useEffect(() => {
    ;(async () => {
      try {
        const [branchRes, catRes] = await Promise.all([
          fetch(getBackendApiUrl("branches/public/all")),
          fetch(getBackendApiUrl("categories/public/details?active_only=true")),
        ])
        if (branchRes.ok) {
          const data = await branchRes.json()
          setBranches(
            (data.branches || []).map((branch: any) => ({
              id: branch.id,
              name: branch.branch?.name || branch.name,
            }))
          )
        }
        if (catRes.ok) {
          const data = await catRes.json()
          setCategories((data.categories || []).map((c: any) => ({ id: c.id, name: c.name })))
        }
        const durRes = await fetch(getBackendApiUrl("durations/public/all"))
        if (durRes.ok) {
          const data = await durRes.json()
          const list = Array.isArray(data.durations) ? data.durations : []
          setMasterDurations(
            list.map((d: any) => ({
              id: d.id,
              name: d.name || d.code || "",
              duration_months: d.duration_months ?? 1,
            }))
          )
        }
      } catch {
        setError("Failed to load branches and courses.")
      }
    })()
  }, [])

  const loadCourses = async (branchId: string) => {
    if (!branchId || coursesByBranch[branchId]) return
    setLoadingBranch(branchId)
    try {
      const res = await fetch(`/api/courses/by-branch/${encodeURIComponent(branchId)}`)
      const data = await res.json().catch(() => ({}))
      const list = Array.isArray(data.courses) ? data.courses : []
      setCoursesByBranch((prev) => ({ ...prev, [branchId]: list }))
    } catch {
      setCoursesByBranch((prev) => ({ ...prev, [branchId]: [] }))
    } finally {
      setLoadingBranch("")
    }
  }

  const updateStudent = (id: string, patch: Partial<FamilyStudentLine>) => {
    setStudents((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
    setFieldErrors((prev) => {
      const next = { ...prev }
      Object.keys(patch).forEach((k) => {
        delete next[`${id}.${k}`]
      })
      return next
    })
  }

  const addStudent = () => {
    setStudents((prev) => [
      ...prev,
      emptyFamilyStudent({
        relationship: prev.length ? "child" : "self",
      }),
    ])
  }

  const removeStudent = (id: string) => {
    setStudents((prev) => (prev.length <= 1 ? prev : prev.filter((s) => s.id !== id)))
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (students.length < 1) {
      setError("Add at least one student.")
      return false
    }
    students.forEach((s, i) => {
      const n = i + 1
      if (!s.firstName.trim()) errs[`${s.id}.firstName`] = `Student ${n}: first name is required`
      if (!s.lastName.trim()) errs[`${s.id}.lastName`] = `Student ${n}: last name is required`
      if (!s.gender) errs[`${s.id}.gender`] = `Student ${n}: gender is required`
      if (!s.dob) errs[`${s.id}.dob`] = `Student ${n}: date of birth is required`
      if (!s.relationship) errs[`${s.id}.relationship`] = `Student ${n}: relationship is required`
      if (!s.branch_id) errs[`${s.id}.branch_id`] = `Student ${n}: branch is required`
      if (!s.course_id) errs[`${s.id}.course_id`] = `Student ${n}: course is required`
      if (!s.duration) errs[`${s.id}.duration`] = `Student ${n}: tenure is required`
    })
    setFieldErrors(errs)
    setError(Object.keys(errs).length ? "Please complete every student before continuing." : "")
    return Object.keys(errs).length === 0
  }

  const refreshPricing = async (list: FamilyStudentLine[]) => {
    const priced: FamilyStudentLine[] = []
    for (const s of list) {
      const durationQ = encodeURIComponent(s.duration)
      const batchQ = s.batch_ref?.trim() ? `&batch_ref=${encodeURIComponent(s.batch_ref.trim())}` : ""
      const res = await fetch(
        getBackendApiUrl(
          `courses/${encodeURIComponent(s.course_id)}/payment-info?branch_id=${encodeURIComponent(s.branch_id)}&duration=${durationQ}${batchQ}`
        ),
        { cache: "no-store" }
      )
      const json = await res.json().catch(() => ({}))
      if (!res.ok || typeof json?.pricing?.total_amount !== "number") {
        throw new Error(
          typeof json?.detail === "string"
            ? json.detail
            : `Could not load pricing for ${s.firstName || "a student"}.`
        )
      }
      priced.push({
        ...s,
        course_name: s.course_name || json.course_name || "",
        category_name: s.category_name || json.category_name || "",
        branch_name: s.branch_name || json.branch_name || "",
        course_price: json.pricing.course_fee,
        amount: json.pricing.total_amount,
      })
    }
    return priced
  }

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setPricingBusy(true)
    setError("")
    try {
      const priced = await refreshPricing(students)
      const first = priced[0]
      updateRegistrationData({
        accountType: "family",
        familyStudents: priced,
        firstName: first.firstName,
        lastName: first.lastName,
        gender: first.gender,
        dob: first.dob,
        branch_id: first.branch_id,
        branch_name: first.branch_name,
        category_id: first.category_id,
        category_name: first.category_name,
        course_id: first.course_id,
        course_name: first.course_name,
        duration: first.duration,
        duration_name: first.duration_name,
        duration_months: first.duration_months,
        batch_ref: first.batch_ref,
        batch_display_label: first.batch_display_label,
        course_price: priced.reduce((sum, s) => sum + (s.course_price || 0), 0),
        amount: priced.reduce((sum, s) => sum + (s.amount || 0), 0),
      })
      router.push("/register/payment")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load pricing.")
    } finally {
      setPricingBusy(false)
    }
  }

  const totalEstimate = useMemo(
    () => students.reduce((sum, s) => sum + (s.amount || 0), 0),
    [students]
  )

  const registrationMediaUrl = cms?.homepage?.registration_media_url

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gray-200 items-center justify-center relative overflow-hidden">
        <div className="w-[550px] h-[550px] bg-cover bg-center bg-no-repeat overflow-hidden rounded-xl">
          {registrationMediaUrl ? (
            <img src={registrationMediaUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div
              className="w-full h-full bg-cover bg-center"
              style={{ backgroundImage: "url('/images/registration-left.png')" }}
            />
          )}
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-start justify-center p-8 bg-white">
        <form onSubmit={handleContinue} className="w-full max-w-lg space-y-6 py-4">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-black">Family students</h1>
            <p className="text-gray-500 text-sm">
              Add each student on this account. Fees are added together at checkout.
            </p>
          </div>

          {students.map((student, index) => {
            const courses = coursesByBranch[student.branch_id] || []
            const filteredCourses = student.category_id
              ? courses.filter((c) => !student.category_id || c.category_id === student.category_id)
              : courses
            const selectedCourse = courses.find((c) => c.id === student.course_id)
            const durations =
              (selectedCourse?.available_durations && selectedCourse.available_durations.length > 0)
                ? selectedCourse.available_durations
                : masterDurations
            const batches = selectedCourse?.branch_batches || []
            return (
              <div key={student.id} className="rounded-xl border border-gray-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-gray-900">Student {index + 1}</h2>
                  {students.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeStudent(student.id)}
                      className="text-red-600 text-sm flex items-center gap-1"
                    >
                      <Trash2 className="w-4 h-4" />
                      Remove
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="First name"
                    value={student.firstName}
                    onChange={(e) => updateStudent(student.id, { firstName: e.target.value })}
                    className="w-full min-w-0 h-12 bg-[#F9F8FF] border-0 rounded-xl"
                  />
                  <Input
                    placeholder="Last name"
                    value={student.lastName}
                    onChange={(e) => updateStudent(student.id, { lastName: e.target.value })}
                    className="w-full min-w-0 h-12 bg-[#F9F8FF] border-0 rounded-xl"
                  />
                  <Select
                    value={student.gender}
                    onValueChange={(v) => updateStudent(student.id, { gender: v })}
                  >
                    <SelectTrigger className="!w-full min-w-0 h-12 bg-[#F9F8FF] border-0 rounded-xl">
                      <SelectValue placeholder="Gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="date"
                    value={student.dob}
                    onChange={(e) => updateStudent(student.id, { dob: e.target.value })}
                    className="w-full min-w-0 h-12 bg-[#F9F8FF] border-0 rounded-xl"
                  />
                  <Select
                    value={student.relationship}
                    onValueChange={(v) => updateStudent(student.id, { relationship: v })}
                  >
                    <SelectTrigger className="!w-full min-w-0 h-12 bg-[#F9F8FF] border-0 rounded-xl">
                      <SelectValue placeholder="Relationship" />
                    </SelectTrigger>
                    <SelectContent>
                      {RELATIONSHIPS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={student.branch_id}
                    onValueChange={(v) => {
                      const branch = branches.find((b) => b.id === v)
                      updateStudent(student.id, {
                        branch_id: v,
                        branch_name: branch?.name || "",
                        category_id: "",
                        category_name: "",
                        course_id: "",
                        course_name: "",
                        duration: "",
                        duration_name: "",
                        duration_months: 0,
                        batch_ref: "",
                        amount: 0,
                      })
                      void loadCourses(v)
                    }}
                  >
                    <SelectTrigger className="!w-full min-w-0 h-12 bg-[#F9F8FF] border-0 rounded-xl">
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {student.branch_id && loadingBranch === student.branch_id && (
                    <p className="col-span-2 text-xs text-gray-500">Loading courses…</p>
                  )}
                  {student.branch_id && categories.length > 0 && (
                    <Select
                      value={student.category_id}
                      onValueChange={(v) => {
                        const cat = categories.find((c) => c.id === v)
                        updateStudent(student.id, {
                          category_id: v,
                          category_name: cat?.name || "",
                          course_id: "",
                          course_name: "",
                          duration: "",
                          batch_ref: "",
                          amount: 0,
                        })
                      }}
                    >
                      <SelectTrigger className="!w-full min-w-0 h-12 bg-[#F9F8FF] border-0 rounded-xl">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {student.branch_id && (
                    <Select
                      value={student.course_id}
                      onValueChange={(v) => {
                        const course = filteredCourses.find((c) => c.id === v) || courses.find((c) => c.id === v)
                        updateStudent(student.id, {
                          course_id: v,
                          course_name: course?.title || "",
                          duration: "",
                          duration_name: "",
                          duration_months: 0,
                          batch_ref: "",
                          amount: 0,
                        })
                      }}
                    >
                      <SelectTrigger className="!w-full min-w-0 h-12 bg-[#F9F8FF] border-0 rounded-xl">
                        <SelectValue placeholder="Select course" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredCourses.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {durations.length > 0 && (
                    <Select
                      value={student.duration}
                      onValueChange={(v) => {
                        const d = durations.find((x) => x.id === v)
                        updateStudent(student.id, {
                          duration: v,
                          duration_name: d?.name || "",
                          duration_months: d?.duration_months || 1,
                        })
                      }}
                    >
                      <SelectTrigger className="!w-full min-w-0 h-12 bg-[#F9F8FF] border-0 rounded-xl">
                        <SelectValue placeholder="Select tenure" />
                      </SelectTrigger>
                      <SelectContent>
                        {durations.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {batches.length > 0 && (
                    <Select
                      value={student.batch_ref}
                      onValueChange={(v) => {
                        const b = batches.find((x) => x.batch_ref === v)
                        updateStudent(student.id, {
                          batch_ref: v,
                          batch_display_label: (b?.name && b.name.trim()) || b?.label || "",
                        })
                      }}
                    >
                      <SelectTrigger className="!w-full min-w-0 h-12 bg-[#F9F8FF] border-0 rounded-xl">
                        <SelectValue placeholder="Select batch" />
                      </SelectTrigger>
                      <SelectContent>
                        {batches.map((b) => (
                          <SelectItem key={b.batch_ref} value={b.batch_ref}>
                            {(b.name && b.name.trim()) || b.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                {Object.entries(fieldErrors)
                  .filter(([k]) => k.startsWith(`${student.id}.`))
                  .map(([k, msg]) => (
                    <p key={k} className="text-red-500 text-xs">
                      {msg}
                    </p>
                  ))}
              </div>
            )
          })}

          <Button type="button" variant="outline" onClick={addStudent} className="w-full rounded-xl h-12">
            <Plus className="w-4 h-4 mr-2" />
            Add another student
          </Button>

          {totalEstimate > 0 && (
            <p className="text-sm text-gray-700 text-center">
              Estimated total: <span className="font-semibold">{formatInr(totalEstimate)}</span>
            </p>
          )}
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <Button
            type="submit"
            disabled={pricingBusy}
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-white font-bold py-4 rounded-xl h-14"
          >
            {pricingBusy ? "Checking fees…" : "CONTINUE TO PAYMENT"}
          </Button>

          <div className="text-center py-2">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Link href="/register" className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-sm">1</Link>
              <div className="w-8 h-1 bg-yellow-400 rounded"></div>
              <div className="w-8 h-8 bg-yellow-400 text-black rounded-full flex items-center justify-center font-bold text-sm">2</div>
              <div className="w-8 h-1 bg-gray-200 rounded"></div>
              <div className="w-8 h-8 bg-gray-200 text-gray-400 rounded-full flex items-center justify-center font-bold text-sm">3</div>
            </div>
            <span className="text-gray-500 text-sm font-medium">Step 2 of 4 - Family students</span>
          </div>
        </form>
      </div>
    </div>
  )
}
