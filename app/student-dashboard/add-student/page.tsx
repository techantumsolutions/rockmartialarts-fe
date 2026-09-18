"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import StudentDashboardLayout from "@/components/student-dashboard-layout"
import { TokenManager } from "@/lib/tokenManager"
import { requireStudentSession } from "@/lib/sessionAuth"
import { getBackendApiUrl } from "@/lib/config"
import { useRazorpay } from "@/hooks/use-razorpay"

const RELATIONSHIPS = [
  { value: "child", label: "Child" },
  { value: "spouse", label: "Spouse" },
  { value: "ward", label: "Ward" },
  { value: "sibling", label: "Sibling" },
  { value: "parent", label: "Parent" },
  { value: "guardian", label: "Guardian" },
  { value: "self", label: "Self" },
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
  available_durations?: Array<{ id: string; name: string; duration_months: number }>
}

export default function AddLinkedStudentPage() {
  const router = useRouter()
  const [studentName, setStudentName] = useState("Student")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [dob, setDob] = useState("")
  const [gender, setGender] = useState("")
  const [relationship, setRelationship] = useState("child")
  const [branchId, setBranchId] = useState("")
  const [courseId, setCourseId] = useState("")
  const [duration, setDuration] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [branches, setBranches] = useState<Branch[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [estimate, setEstimate] = useState<number | null>(null)
  const { initiatePayment } = useRazorpay()

  useEffect(() => {
    const token = requireStudentSession(router, "/student-dashboard/add-student")
    if (!token) return
    const user = TokenManager.getUser()
    setStudentName(user?.full_name || "Student")
    ;(async () => {
      try {
        const res = await fetch(getBackendApiUrl("branches/public/all"))
        if (!res.ok) return
        const data = await res.json()
        setBranches(
          (data.branches || []).map((branch: any) => ({
            id: branch.id,
            name: branch.branch?.name || branch.name,
          }))
        )
      } catch {
        // ignore
      }
    })()
  }, [router])

  useEffect(() => {
    if (!branchId) {
      setCourses([])
      return
    }
    ;(async () => {
      try {
        const res = await fetch(`/api/courses/by-branch/${encodeURIComponent(branchId)}`)
        const data = await res.json().catch(() => ({}))
        setCourses(Array.isArray(data.courses) ? data.courses : [])
      } catch {
        setCourses([])
      }
    })()
  }, [branchId])

  const selectedCourse = courses.find((c) => c.id === courseId)
  const durations = selectedCourse?.available_durations || []

  useEffect(() => {
    if (!branchId || !courseId || !duration) {
      setEstimate(null)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(
          getBackendApiUrl(
            `courses/${encodeURIComponent(courseId)}/payment-info?branch_id=${encodeURIComponent(branchId)}&duration=${encodeURIComponent(duration)}`
          ),
          { cache: "no-store" }
        )
        const json = await res.json().catch(() => ({}))
        const total = json?.pricing?.total_amount
        if (!cancelled && typeof total === "number") setEstimate(total)
        else if (!cancelled) setEstimate(null)
      } catch {
        if (!cancelled) setEstimate(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [branchId, courseId, duration])

  const handleLogout = () => {
    TokenManager.clearAuthData()
    router.push("/login")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!firstName.trim() || !lastName.trim() || !gender || !dob || !relationship) {
      setError("Please fill name, date of birth, gender, and relationship.")
      return
    }
    if (!branchId || !courseId || !duration) {
      setError("Select a branch, course, and tenure so we can assign and charge the new student.")
      return
    }
    setSubmitting(true)
    try {
      const token = requireStudentSession(router, "/student-dashboard/add-student")
      if (!token) return

      const res = await fetch(getBackendApiUrl("auth/linked-students"), {
        method: "POST",
        headers: TokenManager.getAuthHeaders(),
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          date_of_birth: dob,
          gender,
          relationship,
          course: {
            category_id: categoryId || selectedCourse?.category_id || "",
            course_id: courseId,
            duration,
          },
          branch: {
            location_id: branchId,
            branch_id: branchId,
          },
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(typeof data.detail === "string" ? data.detail : "Could not add student")
      }
      if (Array.isArray(data.profiles)) {
        TokenManager.setProfiles(data.profiles)
      }
      if (!data.student_id) {
        throw new Error("Student was created without an id")
      }

      const switchRes = await fetch(getBackendApiUrl("auth/switch-student"), {
        method: "POST",
        headers: TokenManager.getAuthHeaders(),
        body: JSON.stringify({ student_id: data.student_id }),
      })
      const switchData = await switchRes.json().catch(() => ({}))
      if (!switchRes.ok || !switchData.access_token || !switchData.user) {
        throw new Error(
          typeof switchData.detail === "string" ? switchData.detail : "Could not switch to the new student"
        )
      }
      TokenManager.storeAuthData({
        access_token: switchData.access_token,
        token_type: switchData.token_type,
        expires_in: switchData.expires_in,
        user: switchData.user,
        profiles: switchData.profiles,
        account_id: switchData.account_id,
        active_student_id: switchData.active_student_id || switchData.user.id,
      })

      const newToken = TokenManager.getToken()
      const prepRes = await fetch(getBackendApiUrl("payments/prepare-student-checkout"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${newToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          course_id: courseId,
          branch_id: branchId,
          duration,
        }),
      })
      const prepJson = await prepRes.json().catch(() => ({}))
      if (!prepRes.ok) {
        throw new Error(
          typeof prepJson?.detail === "string"
            ? prepJson.detail
            : "Student was added. Open My Courses to complete payment."
        )
      }
      const prepAmount = typeof prepJson.amount === "number" ? prepJson.amount : estimate || 0
      const branchName = branches.find((b) => b.id === branchId)?.name || ""
      const courseName = selectedCourse?.title || prepJson.course_name || "Course"

      await initiatePayment({
        currency: "INR",
        enrollmentData: {
          enrollment_id: prepJson.enrollment_id,
          course_id: courseId,
          course_name: courseName,
          branch_id: branchId,
          branch_name: branchName,
          amount: prepAmount,
          student_name: `${firstName.trim()} ${lastName.trim()}`,
          student_email: switchData.user?.email,
        },
        onSuccess: (result: any) => {
          const pid = result?.payment_id ?? result?.receipt?.payment_id ?? ""
          router.replace(
            `/student-dashboard/payment-success?payment_id=${encodeURIComponent(String(pid))}&amount=${encodeURIComponent(String(prepAmount))}&course_name=${encodeURIComponent(courseName)}&branch_name=${encodeURIComponent(branchName)}`
          )
        },
        onFailure: (payErr: any) => {
          setSubmitting(false)
          setError(
            payErr instanceof Error
              ? payErr.message
              : "Student was added. Payment was not completed — pay from My Courses."
          )
          router.push("/student-dashboard/courses")
        },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add student")
      setSubmitting(false)
    }
  }

  return (
    <StudentDashboardLayout
      studentName={studentName}
      onLogout={handleLogout}
      pageTitle="Add another student"
      pageDescription="Add a linked profile on this login, then pay their course fee. Their courses, attendance, and billing stay separate."
    >
      <form onSubmit={handleSubmit} className="max-w-xl space-y-4 bg-white rounded-xl border border-gray-200 p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="h-12" />
          <Input placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} className="h-12" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select value={gender} onValueChange={setGender}>
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="h-12" />
        </div>
        <Select value={relationship} onValueChange={setRelationship}>
          <SelectTrigger className="h-12">
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
          value={branchId}
          onValueChange={(v) => {
            setBranchId(v)
            setCourseId("")
            setDuration("")
            setCategoryId("")
          }}
        >
          <SelectTrigger className="h-12">
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
        {branchId && (
          <Select
            value={courseId}
            onValueChange={(v) => {
              const c = courses.find((x) => x.id === v)
              setCourseId(v)
              setCategoryId(c?.category_id || "")
              setDuration("")
            }}
          >
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Select course" />
            </SelectTrigger>
            <SelectContent>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {durations.length > 0 && (
          <Select value={duration} onValueChange={setDuration}>
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Tenure" />
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
        {estimate != null && (
          <p className="text-sm text-gray-700">
            Payable now: <span className="font-semibold">₹{estimate.toLocaleString("en-IN")}</span>
          </p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => router.push("/student-dashboard")}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting} className="bg-yellow-400 hover:bg-yellow-500 text-black">
            {submitting ? "Processing…" : estimate != null ? `Add & pay ₹${estimate.toLocaleString("en-IN")}` : "Add student"}
          </Button>
        </div>
      </form>
    </StudentDashboardLayout>
  )
}
