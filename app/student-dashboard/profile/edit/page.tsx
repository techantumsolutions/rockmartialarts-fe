"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import StudentDashboardLayout from "@/components/student-dashboard-layout"
import { Save, ArrowLeft, AlertCircle } from "lucide-react"
import { studentProfileAPI, type StudentProfile, type StudentProfileUpdateData } from "@/lib/studentProfileAPI"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function EditStudentProfilePage() {
  const router = useRouter()
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    date_of_birth: "",
    gender: "",
    address: {
      street: "",
      city: "",
      state: "",
      postal_code: "",
      country: "India"
    },
    emergency_contact: {
      name: "",
      phone: "",
      relationship: ""
    },
    medical_info: {
      allergies: "",
      medications: "",
      conditions: "",
      blood_type: ""
    }
  })

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

        // Pre-populate form with existing data
        setFormData({
          first_name: profile.first_name || "",
          last_name: profile.last_name || "",
          phone: profile.phone || "",
          date_of_birth: profile.date_of_birth || "",
          gender: profile.gender || "",
          address: {
            street: profile.address?.street || "",
            city: profile.address?.city || "",
            state: profile.address?.state || "",
            postal_code: profile.address?.postal_code || "",
            country: profile.address?.country || "India"
          },
          emergency_contact: {
            name: profile.emergency_contact?.name || "",
            phone: profile.emergency_contact?.phone || "",
            relationship: profile.emergency_contact?.relationship || ""
          },
          medical_info: {
            allergies: profile.medical_info?.allergies || "",
            medications: profile.medical_info?.medications || "",
            conditions: profile.medical_info?.conditions || "",
            blood_type: profile.medical_info?.blood_type || ""
          }
        })
        setError(null)
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
              phone: userData.phone || "",
              first_name: userData.first_name || "",
              last_name: userData.last_name || "",
              full_name: userData.full_name || `${userData.first_name || ""} ${userData.last_name || ""}`.trim(),
              date_of_birth: userData.date_of_birth,
              gender: userData.gender,
              address: userData.address,
              emergency_contact: userData.emergency_contact,
              medical_info: userData.medical_info,
              is_active: userData.is_active !== false,
              created_at: userData.created_at || new Date().toISOString(),
              updated_at: userData.updated_at || new Date().toISOString(),
              enrollments: []
            }
            setStudentProfile(fallbackProfile)

            // Pre-populate form with fallback data
            setFormData({
              first_name: fallbackProfile.first_name || "",
              last_name: fallbackProfile.last_name || "",
              phone: fallbackProfile.phone || "",
              date_of_birth: fallbackProfile.date_of_birth || "",
              gender: fallbackProfile.gender || "",
              address: {
                street: fallbackProfile.address?.street || "",
                city: fallbackProfile.address?.city || "",
                state: fallbackProfile.address?.state || "",
                postal_code: fallbackProfile.address?.postal_code || "",
                country: fallbackProfile.address?.country || "India"
              },
              emergency_contact: {
                name: fallbackProfile.emergency_contact?.name || "",
                phone: fallbackProfile.emergency_contact?.phone || "",
                relationship: fallbackProfile.emergency_contact?.relationship || ""
              },
              medical_info: {
                allergies: fallbackProfile.medical_info?.allergies || "",
                medications: fallbackProfile.medical_info?.medications || "",
                conditions: fallbackProfile.medical_info?.conditions || "",
                blood_type: fallbackProfile.medical_info?.blood_type || ""
              }
            })
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

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleNestedInputChange = (section: string, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        [field]: value
      }
    }))
  }

  const handleSave = async () => {
    if (!studentProfile) return

    setSaving(true)
    setError(null)
    setShowSuccessPopup(false)

    try {
      const token = localStorage.getItem("token")
      if (!token) {
        router.push("/login")
        return
      }

      // Prepare update data
      const updateData: StudentProfileUpdateData = {
        first_name: formData.first_name.trim() || undefined,
        last_name: formData.last_name.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        date_of_birth: formData.date_of_birth || undefined,
        gender: formData.gender || undefined,
        address: {
          street: formData.address.street.trim() || undefined,
          city: formData.address.city.trim() || undefined,
          state: formData.address.state.trim() || undefined,
          postal_code: formData.address.postal_code.trim() || undefined,
          country: formData.address.country.trim() || undefined
        },
        emergency_contact: {
          name: formData.emergency_contact.name.trim() || undefined,
          phone: formData.emergency_contact.phone.trim() || undefined,
          relationship: formData.emergency_contact.relationship.trim() || undefined
        },
        medical_info: {
          allergies: formData.medical_info.allergies.trim() || undefined,
          medications: formData.medical_info.medications.trim() || undefined,
          conditions: formData.medical_info.conditions.trim() || undefined,
          blood_type: formData.medical_info.blood_type.trim() || undefined
        }
      }

      // Remove empty objects
      if (!Object.values(updateData.address).some(v => v)) {
        delete updateData.address
      }
      if (!Object.values(updateData.emergency_contact).some(v => v)) {
        delete updateData.emergency_contact
      }
      if (!Object.values(updateData.medical_info).some(v => v)) {
        delete updateData.medical_info
      }

      await studentProfileAPI.updateProfile(updateData, token)

      // Update localStorage with new data
      const user = localStorage.getItem("user")
      if (user) {
        try {
          const userData = JSON.parse(user)
          const updatedUserData = {
            ...userData,
            first_name: formData.first_name || userData.first_name,
            last_name: formData.last_name || userData.last_name,
            full_name: `${formData.first_name || userData.first_name} ${formData.last_name || userData.last_name}`.trim(),
            phone: formData.phone || userData.phone,
            date_of_birth: formData.date_of_birth || userData.date_of_birth,
            gender: formData.gender || userData.gender,
            address: updateData.address || userData.address,
            emergency_contact: updateData.emergency_contact || userData.emergency_contact,
            medical_info: updateData.medical_info || userData.medical_info
          }
          localStorage.setItem("user", JSON.stringify(updatedUserData))
        } catch (error) {
          console.error("Error updating localStorage:", error)
        }
      }

      setShowSuccessPopup(true)

    } catch (error: any) {
      console.error("Error saving profile:", error)
      setError(error.message || "Failed to update profile. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <StudentDashboardLayout
        studentName="Loading..."
        onLogout={handleLogout}
        pageTitle="Edit Profile"
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
        pageTitle="Edit Profile"
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

  return (
    <StudentDashboardLayout
      studentName={studentProfile.full_name}
      onLogout={handleLogout}
      pageTitle="Edit Profile"
      pageDescription="Update your personal information and preferences"
      headerActions={
        <Button
          variant="outline"
          onClick={() => router.push("/student-dashboard/profile")}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Profile</span>
        </Button>
      }
    >
      <div className="space-y-8">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Update your personal details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      placeholder="Enter first name"
                      value={formData.first_name}
                      onChange={(e) => handleInputChange("first_name", e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      placeholder="Enter last name"
                      value={formData.last_name}
                      onChange={(e) => handleInputChange("last_name", e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email address"
                      value={studentProfile.email}
                      disabled
                      className="mt-1 bg-gray-50"
                    />
                    <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="Enter mobile number"
                      value={formData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="dateOfBirth">Date of Birth</Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      placeholder="Select date"
                      value={formData.date_of_birth}
                      onChange={(e) => handleInputChange("date_of_birth", e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="gender">Gender</Label>
                    <Select 
                      value={formData.gender} 
                      onValueChange={(value) => handleInputChange("gender", value)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                        <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Address Information */}
            <Card>
              <CardHeader>
                <CardTitle>Address Information</CardTitle>
                <CardDescription>Update your residential address</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="street">Street Address</Label>
                  <Input
                    id="street"
                    placeholder="Enter street address"
                    value={formData.address.street}
                    onChange={(e) => handleNestedInputChange("address", "street", e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      placeholder="Enter city"
                      value={formData.address.city}
                      onChange={(e) => handleNestedInputChange("address", "city", e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      placeholder="Enter state"
                      value={formData.address.state}
                      onChange={(e) => handleNestedInputChange("address", "state", e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="postalCode">Postal Code</Label>
                    <Input
                      id="postalCode"
                      placeholder="Enter postal code"
                      value={formData.address.postal_code}
                      onChange={(e) => handleNestedInputChange("address", "postal_code", e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Emergency Contact */}
            <Card>
              <CardHeader>
                <CardTitle>Emergency Contact</CardTitle>
                <CardDescription>Person to contact in case of emergency</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="emergencyName">Contact Name</Label>
                    <Input
                      id="emergencyName"
                      placeholder="Enter contact full name"
                      value={formData.emergency_contact.name}
                      onChange={(e) => handleNestedInputChange("emergency_contact", "name", e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="emergencyPhone">Contact Phone</Label>
                    <Input
                      id="emergencyPhone"
                      type="tel"
                      placeholder="Enter mobile number"
                      value={formData.emergency_contact.phone}
                      onChange={(e) => handleNestedInputChange("emergency_contact", "phone", e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="relationship">Relationship</Label>
                    <Select 
                      value={formData.emergency_contact.relationship}
                      onValueChange={(value) => handleNestedInputChange("emergency_contact", "relationship", value)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select relationship to you" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="parent">Parent</SelectItem>
                        <SelectItem value="spouse">Spouse</SelectItem>
                        <SelectItem value="sibling">Sibling</SelectItem>
                        <SelectItem value="friend">Friend</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Medical Information */}
            <Card>
              <CardHeader>
                <CardTitle>Medical Information</CardTitle>
                <CardDescription>Important medical details for training safety</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="allergies">Allergies</Label>
                    <Textarea
                      id="allergies"
                      value={formData.medical_info.allergies}
                      onChange={(e) => handleNestedInputChange("medical_info", "allergies", e.target.value)}
                      placeholder="List any allergies (or leave blank)"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="medications">Current Medications</Label>
                    <Textarea
                      id="medications"
                      value={formData.medical_info.medications}
                      onChange={(e) => handleNestedInputChange("medical_info", "medications", e.target.value)}
                      placeholder="List current medications (or leave blank)"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="conditions">Medical Conditions</Label>
                    <Textarea
                      id="conditions"
                      value={formData.medical_info.conditions}
                      onChange={(e) => handleNestedInputChange("medical_info", "conditions", e.target.value)}
                      placeholder="List any medical conditions (or leave blank)"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="bloodType">Blood Type</Label>
                    <Select
                      value={formData.medical_info.blood_type}
                      onValueChange={(value) => handleNestedInputChange("medical_info", "blood_type", value)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select blood type (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A+">A+</SelectItem>
                        <SelectItem value="A-">A-</SelectItem>
                        <SelectItem value="B+">B+</SelectItem>
                        <SelectItem value="B-">B-</SelectItem>
                        <SelectItem value="AB+">AB+</SelectItem>
                        <SelectItem value="AB-">AB-</SelectItem>
                        <SelectItem value="O+">O+</SelectItem>
                        <SelectItem value="O-">O-</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

          {/* Save Button */}
          <div className="flex justify-end space-x-4">
            <Button
              variant="outline"
              onClick={() => router.push("/student-dashboard/profile")}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </StudentDashboardLayout>
    )
}
