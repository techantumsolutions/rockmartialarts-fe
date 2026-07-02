"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import StudentDashboardLayout from "@/components/student-dashboard-layout"
import { Edit, Mail, Phone, MapPin, Calendar, Clock, User, Heart, AlertCircle, Camera } from "lucide-react"
import { studentProfileAPI, type StudentProfile } from "@/lib/studentProfileAPI"
import { StudentProfilePhotoSheet } from "@/components/student-profile-photo-sheet"
import { getBackendApiUrl } from "@/lib/config"
import { formatRegisteredDateTime } from "@/lib/formatRegisteredDate"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getEnrollmentUiStatus, formatEnrollmentUiStatusLabel } from "@/lib/student-enrollment-status"

type ProfileEnrollment = StudentProfile["enrollments"][number]

function toMs(value?: string): number {
  if (!value) return 0
  const ts = new Date(value).getTime()
  return Number.isFinite(ts) ? ts : 0
}

function dedupeProfileEnrollments(enrollments: ProfileEnrollment[] = []): ProfileEnrollment[] {
  const groups = new Map<string, ProfileEnrollment[]>()
  for (const e of enrollments) {
    const key = `${e.course_id}::${e.branch_id || ""}`
    const bucket = groups.get(key)
    if (bucket) bucket.push(e)
    else groups.set(key, [e])
  }

  const merged: ProfileEnrollment[] = []
  for (const [, group] of groups) {
    if (group.length === 1) {
      merged.push(group[0])
      continue
    }

    const paid = group.find((g) => String(g.payment_status || "").toLowerCase() === "paid")
    const pending = group.find((g) => String(g.payment_status || "").toLowerCase() === "pending")
    const chosen =
      paid ||
      pending ||
      [...group].sort((a, b) => toMs(b.end_date || b.enrollment_date || b.start_date) - toMs(a.end_date || a.enrollment_date || a.start_date))[0]

    merged.push(chosen)
  }

  return merged.sort(
    (a, b) => toMs(b.enrollment_date || b.start_date || b.end_date) - toMs(a.enrollment_date || a.start_date || a.end_date)
  )
}

export default function StudentProfilePage() {
  const router = useRouter()
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null)
  const [attendanceRate, setAttendanceRate] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [photoSheetOpen, setPhotoSheetOpen] = useState(false)
  const [authToken, setAuthToken] = useState<string | null>(null)

  useEffect(() => {
    setAuthToken(localStorage.getItem("token"))
  }, [])

  useEffect(() => {
    const loadProfile = async () => {
      try {
        // Check if user is logged in
        const token = localStorage.getItem("token")
        const user = localStorage.getItem("user")

        if (!token) {
          router.push("/login")
          return
        }

        // Check user role from localStorage first
        if (user) {
          try {
            const userData = JSON.parse(user)

            // Check if user is actually a student
            if (userData.role !== "student") {
              if (userData.role === "coach") {
                router.push("/coach-dashboard")
              } else {
                router.push("/dashboard")
              }
              return
            }
          } catch (error) {
            console.error("Error parsing user data:", error)
          }
        }

        // Fetch profile data from API
        const response = await studentProfileAPI.getProfile(token)
        const profile = response.profile
        setStudentProfile(profile)
        setError(null)

        // Fetch attendance so we show real rate (0 or actual); new users get no data → —
        try {
          const attRes = await fetch(getBackendApiUrl("attendance/student/my-attendance"), {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (attRes.ok) {
            const att = await attRes.json()
            const pct = att?.statistics?.percentage
            setAttendanceRate(typeof pct === "number" ? pct : null)
          } else {
            setAttendanceRate(null)
          }
        } catch {
          setAttendanceRate(null)
        }
      } catch (error: any) {
        console.error("Error loading profile:", error)
        setError(error.message || "Failed to load profile data")

        // If API fails, try to use localStorage data as fallback
        const user = localStorage.getItem("user")
        if (user) {
          try {
            const userData = JSON.parse(user)
            const fallbackProfile: StudentProfile = {
              id: userData.id || "unknown",
              email: userData.email || "student@example.com",
              phone: userData.phone || "+91 98765 43210",
              first_name: userData.first_name || "Student",
              last_name: userData.last_name || "",
              full_name: userData.full_name || `${userData.first_name || "Student"} ${userData.last_name || ""}`.trim(),
              date_of_birth: userData.date_of_birth,
              gender: userData.gender,
              profile_image: userData.profile_image,
              address: userData.address,
              emergency_contact: userData.emergency_contact,
              medical_info: userData.medical_info,
              is_active: userData.is_active !== false,
              created_at: userData.created_at || new Date().toISOString(),
              updated_at: userData.updated_at || new Date().toISOString(),
              enrollments: []
            }
            setStudentProfile(fallbackProfile)
          } catch (parseError) {
            console.error("Error parsing fallback user data:", parseError)
          }
        }
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    router.push("/login")
  }

  const handleEditProfile = () => {
    router.push("/student-dashboard/profile/edit")
  }

  const applyProfileImage = (url: string) => {
    setStudentProfile((prev) => (prev ? { ...prev, profile_image: url } : null))
    const rawUser = typeof window !== "undefined" ? localStorage.getItem("user") : null
    if (rawUser) {
      try {
        const userData = JSON.parse(rawUser)
        localStorage.setItem("user", JSON.stringify({ ...userData, profile_image: url }))
      } catch {
        /* ignore */
      }
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("student-profile-image-updated"))
    }
  }

  if (loading) {
    return (
      <StudentDashboardLayout
        studentName="Loading..."
        onLogout={handleLogout}
        pageTitle="Profile"
        pageDescription="Loading your profile information..."
      >
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-yellow-400"></div>
        </div>
      </StudentDashboardLayout>
    )
  }

  if (!studentProfile) {
    return (
      <StudentDashboardLayout
        studentName="Student"
        onLogout={handleLogout}
        pageTitle="Profile"
        pageDescription="Unable to load profile information"
      >
        <div className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
          )}
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-gray-500">Unable to load profile data. Please try again later.</p>
              <div className="flex justify-center mt-4">
                <Button onClick={() => window.location.reload()}>
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </StudentDashboardLayout>
    )
  }

  const visibleEnrollments = dedupeProfileEnrollments(studentProfile.enrollments || [])

  const profileStats = {
    coursesEnrolled: visibleEnrollments.length || 0,
    attendanceRate:
      attendanceRate ??
      (studentProfile as { attendance_rate?: number }).attendance_rate ??
      (studentProfile as { attendance_percentage?: number }).attendance_percentage ??
      null,
    /** Only when API sends it (e.g. user.current_belt); never show a default belt rank */
    currentBelt: (studentProfile as { current_belt?: string | null }).current_belt?.trim() || null,
  }

  return (
    <StudentDashboardLayout
      studentName={studentProfile.full_name}
      onLogout={handleLogout}
      pageTitle="My Profile"
      pageDescription="View and manage your personal information"
      headerActions={
        <Button
          onClick={handleEditProfile}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Edit className="w-4 h-4 mr-2" />
          Edit Profile
        </Button>
      }
    >
      {authToken && (
        <StudentProfilePhotoSheet
          open={photoSheetOpen}
          onOpenChange={setPhotoSheetOpen}
          currentImageSrc={studentProfile.profile_image || ""}
          fallbackLetter={studentProfile.first_name?.charAt(0)?.toUpperCase() || "S"}
          token={authToken}
          onSaved={applyProfileImage}
        />
      )}
      <div className="space-y-8">
        {error && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Some data may be outdated. {error}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Information */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="text-center">
                <button
                  type="button"
                  onClick={() => setPhotoSheetOpen(true)}
                  className="relative mx-auto mb-4 block rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 focus-visible:ring-offset-2 touch-manipulation"
                  aria-label="Change profile photo"
                >
                  <Avatar className="w-24 h-24 cursor-pointer ring-offset-2 transition-transform hover:scale-[1.02] active:scale-[0.98]">
                    <AvatarImage src={studentProfile.profile_image || ""} alt="" />
                    <AvatarFallback className="bg-gradient-to-br from-yellow-400 to-yellow-500 text-white text-2xl font-bold">
                      {studentProfile.first_name?.charAt(0)?.toUpperCase() || "S"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-gray-900 text-white shadow-md ring-2 ring-white">
                    <Camera className="h-4 w-4" aria-hidden />
                  </span>
                </button>
                  <CardTitle className="text-xl">{studentProfile.full_name}</CardTitle>
                  <CardDescription>Student ID: {studentProfile.id.slice(-8)}</CardDescription>
                  {profileStats.currentBelt && (
                    <Badge className="bg-muted text-foreground mt-2">{profileStats.currentBelt}</Badge>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-3 text-sm">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">{studentProfile.email}</span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">{studentProfile.phone}</span>
                  </div>
                  {studentProfile.address && (
                    <div className="flex items-center space-x-3 text-sm">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">
                        {[
                          studentProfile.address.street,
                          studentProfile.address.city,
                          studentProfile.address.state,
                          studentProfile.address.postal_code
                        ].filter(Boolean).join(", ") || "Address not provided"}
                      </span>
                    </div>
                  )}
                  {studentProfile.date_of_birth && (
                    <div className="flex items-center space-x-3 text-sm">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">
                        Born: {new Date(studentProfile.date_of_birth).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center space-x-3 text-sm">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">
                      Joined: {formatRegisteredDateTime(studentProfile.created_at)}
                    </span>
                  </div>
                  {studentProfile.gender && (
                    <div className="flex items-center space-x-3 text-sm">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">Gender: {studentProfile.gender}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-lg">Quick Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Courses Enrolled</span>
                    <span className="font-semibold">{profileStats.coursesEnrolled}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Attendance Rate</span>
                    <span className="font-semibold">
                      {profileStats.attendanceRate != null ? `${profileStats.attendanceRate}%` : "—"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Enrolled Courses */}
            <Card>
              <CardHeader>
                <CardTitle>Enrolled Courses</CardTitle>
                <CardDescription>Your current training programs</CardDescription>
              </CardHeader>
              <CardContent>
                {visibleEnrollments.length > 0 ? (
                  <div className="space-y-4">
                    {visibleEnrollments.map((enrollment, index) => (
                      <div key={`${enrollment.id || enrollment.course_id}-${index}`} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                        {(() => {
                          const uiStatus = getEnrollmentUiStatus({
                            isActive: enrollment.is_active,
                            paymentStatus: enrollment.payment_status,
                            endDate: enrollment.end_date
                          })
                          const statusClass =
                            uiStatus === "active"
                              ? "bg-green-100 text-green-800"
                              : uiStatus === "expiring_soon"
                                ? "bg-amber-100 text-amber-900"
                                : uiStatus === "expired"
                                  ? "bg-red-100 text-red-800"
                                  : uiStatus === "pending"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-gray-100 text-gray-800"

                          return (
                            <div>
                              <h4 className="font-semibold text-gray-900">{enrollment.course_name}</h4>
                              <p className="text-sm text-gray-600">Branch: {enrollment.branch_name}</p>
                              {enrollment.fee_amount != null && Number(enrollment.fee_amount) > 0 && (
                                <p className="text-sm text-blue-700 mt-1">
                                  Next renewal: ₹{Number(enrollment.fee_amount).toLocaleString("en-IN")}
                                </p>
                              )}
                              <div className="flex items-center space-x-2 mt-1">
                                <Badge variant="outline" className="text-xs capitalize">
                                  {enrollment.payment_status}
                                </Badge>
                                <Badge className={`text-xs ${statusClass}`}>
                                  {formatEnrollmentUiStatusLabel(uiStatus)}
                                </Badge>
                              </div>
                            </div>
                          )
                        })()}
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Enrolled</p>
                          <p className="text-sm font-semibold text-blue-600">
                            {enrollment.enrollment_date ?
                              new Date(enrollment.enrollment_date).toLocaleDateString() :
                              'N/A'
                            }
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No active enrollments found</p>
                )}
              </CardContent>
            </Card>

            {/* Emergency Contact */}
            {studentProfile.emergency_contact && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Heart className="w-5 h-5 text-red-500" />
                    <span>Emergency Contact</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {studentProfile.emergency_contact.name && (
                    <div className="flex items-center space-x-3 text-sm">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">{studentProfile.emergency_contact.name}</span>
                    </div>
                  )}
                  {studentProfile.emergency_contact.phone && (
                    <div className="flex items-center space-x-3 text-sm">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">{studentProfile.emergency_contact.phone}</span>
                    </div>
                  )}
                  {studentProfile.emergency_contact.relationship && (
                    <div className="flex items-center space-x-3 text-sm">
                      <Heart className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">Relationship: {studentProfile.emergency_contact.relationship}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Medical Information */}
            {studentProfile.medical_info && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <AlertCircle className="w-5 h-5 text-blue-500" />
                    <span>Medical Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {studentProfile.medical_info.allergies && (
                    <div>
                      <p className="text-sm font-medium text-gray-700">Allergies:</p>
                      <p className="text-sm text-gray-600">{studentProfile.medical_info.allergies}</p>
                    </div>
                  )}
                  {studentProfile.medical_info.medications && (
                    <div>
                      <p className="text-sm font-medium text-gray-700">Medications:</p>
                      <p className="text-sm text-gray-600">{studentProfile.medical_info.medications}</p>
                    </div>
                  )}
                  {studentProfile.medical_info.conditions && (
                    <div>
                      <p className="text-sm font-medium text-gray-700">Medical Conditions:</p>
                      <p className="text-sm text-gray-600">{studentProfile.medical_info.conditions}</p>
                    </div>
                  )}
                  {studentProfile.medical_info.blood_type && (
                    <div>
                      <p className="text-sm font-medium text-gray-700">Blood Type:</p>
                      <p className="text-sm text-gray-600">{studentProfile.medical_info.blood_type}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </StudentDashboardLayout>
  )
}
