"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import StudentDashboardLayout from "@/components/student-dashboard-layout"
import { CardSkeleton } from "@/components/ui/loading-skeleton"
import { Bell, Shield, User, Palette, Globe, Settings, AlertCircle } from "lucide-react"
import { studentProfileAPI } from "@/lib/studentProfileAPI"

export default function StudentSettingsPage() {
  const router = useRouter()
  const [studentData, setStudentData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Settings state
  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    push: true,
    classReminders: true,
    paymentReminders: true,
    progressUpdates: true
  })

  const [preferences, setPreferences] = useState({
    language: "en",
    timezone: "Asia/Kolkata",
    theme: "light"
  })

  useEffect(() => {
    const token = localStorage.getItem("token")
    const user = localStorage.getItem("user")

    if (!token) {
      router.push("/login")
      return
    }

    if (user) {
      try {
        const userData = JSON.parse(user)
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

    const loadProfile = async () => {
      try {
        const profileResponse = await studentProfileAPI.getProfile(token)
        const profile = profileResponse.profile
        setStudentData({
          name: profile.full_name || "Student",
          email: profile.email || "",
          phone: profile.phone || "",
          emergencyContact: profile.emergency_contact?.phone || "",
        })
      } catch (err) {
        console.error("Error loading profile:", err)
        if (user) {
          try {
            const userData = JSON.parse(user)
            setStudentData({
              name: userData.full_name || userData.name || "Student",
              email: userData.email || "",
              phone: "",
              emergencyContact: "",
            })
          } catch (parseErr) {
            console.error("Error parsing user:", parseErr)
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

  const handleSaveSettings = () => {
    // Here you would typically save settings to the backend
    console.log("Saving settings:", { notifications, preferences })
    // Show success message
  }

  if (loading) {
    return (
      <StudentDashboardLayout
        studentName={studentData?.name}
        onLogout={handleLogout}
        isLoading={true}
      >
        <div className="space-y-6">
          <CardSkeleton lines={4} />
          <CardSkeleton lines={6} />
        </div>
      </StudentDashboardLayout>
    )
  }

  return (
    <StudentDashboardLayout
      studentName={studentData?.name || "Student"}
      onLogout={handleLogout}
      maxWidth="lg"
    >
      <div className="space-y-6">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Settings
          </h1>
          <p className="text-gray-600">Manage your account preferences and notifications</p>
        </div>

        <div className="space-y-6">
          {/* Account Settings */}
          <Card className="rounded-xl border bg-white shadow-sm hover:shadow-md transition-all">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <User className="w-5 h-5 text-blue-600" />
                  <CardTitle>Account Settings</CardTitle>
                </div>
                <CardDescription>Update your personal information and account details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input 
                      id="fullName" 
                      defaultValue={studentData?.name}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input 
                      id="email" 
                      type="email"
                      defaultValue={studentData?.email}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input 
                      id="phone" 
                      type="tel"
                      defaultValue={studentData?.phone}
                      placeholder="Enter phone number"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="emergencyContact">Emergency Contact</Label>
                    <Input 
                      id="emergencyContact" 
                      type="tel"
                      defaultValue={studentData?.emergencyContact}
                      placeholder="Enter emergency contact"
                      className="mt-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notification Settings */}
            <Card className="rounded-xl border bg-white shadow-sm hover:shadow-md transition-all">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Bell className="w-5 h-5 text-green-600" />
                  <CardTitle>Notification Preferences</CardTitle>
                </div>
                <CardDescription>Choose how you want to receive notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Notification Channels */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Notification Channels</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="email-notifications">Email Notifications</Label>
                        <p className="text-sm text-gray-500">Receive notifications via email</p>
                      </div>
                      <Switch
                        id="email-notifications"
                        checked={notifications.email}
                        onCheckedChange={(checked) => 
                          setNotifications(prev => ({ ...prev, email: checked }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="sms-notifications">SMS Notifications</Label>
                        <p className="text-sm text-gray-500">Receive notifications via SMS</p>
                      </div>
                      <Switch
                        id="sms-notifications"
                        checked={notifications.sms}
                        onCheckedChange={(checked) => 
                          setNotifications(prev => ({ ...prev, sms: checked }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="push-notifications">Push Notifications</Label>
                        <p className="text-sm text-gray-500">Receive browser push notifications</p>
                      </div>
                      <Switch
                        id="push-notifications"
                        checked={notifications.push}
                        onCheckedChange={(checked) => 
                          setNotifications(prev => ({ ...prev, push: checked }))
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Notification Types */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Notification Types</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="class-reminders">Class Reminders</Label>
                        <p className="text-sm text-gray-500">Get reminded about upcoming classes</p>
                      </div>
                      <Switch
                        id="class-reminders"
                        checked={notifications.classReminders}
                        onCheckedChange={(checked) => 
                          setNotifications(prev => ({ ...prev, classReminders: checked }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="payment-reminders">Payment Reminders</Label>
                        <p className="text-sm text-gray-500">Get reminded about due payments</p>
                      </div>
                      <Switch
                        id="payment-reminders"
                        checked={notifications.paymentReminders}
                        onCheckedChange={(checked) => 
                          setNotifications(prev => ({ ...prev, paymentReminders: checked }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="progress-updates">Progress Updates</Label>
                        <p className="text-sm text-gray-500">Get updates about your training progress</p>
                      </div>
                      <Switch
                        id="progress-updates"
                        checked={notifications.progressUpdates}
                        onCheckedChange={(checked) => 
                          setNotifications(prev => ({ ...prev, progressUpdates: checked }))
                        }
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Preferences */}
            <Card className="rounded-xl border bg-white shadow-sm hover:shadow-md transition-all">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Globe className="w-5 h-5 text-purple-600" />
                  <CardTitle>Preferences</CardTitle>
                </div>
                <CardDescription>Customize your experience</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="language">Language</Label>
                    <Select 
                      value={preferences.language} 
                      onValueChange={(value) => 
                        setPreferences(prev => ({ ...prev, language: value }))
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="hi">Hindi</SelectItem>
                        <SelectItem value="ta">Tamil</SelectItem>
                        <SelectItem value="te">Telugu</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select 
                      value={preferences.timezone} 
                      onValueChange={(value) => 
                        setPreferences(prev => ({ ...prev, timezone: value }))
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                        <SelectItem value="Asia/Dubai">Asia/Dubai (GST)</SelectItem>
                        <SelectItem value="UTC">UTC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Security Settings */}
            <Card className="rounded-xl border bg-white shadow-sm hover:shadow-md transition-all">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-red-600" />
                  <CardTitle>Security</CardTitle>
                </div>
                <CardDescription>Manage your account security</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <Button variant="outline" className="w-full md:w-auto">
                    Change Password
                  </Button>
                  <Button variant="outline" className="w-full md:w-auto">
                    Enable Two-Factor Authentication
                  </Button>
                  <Button variant="outline" className="w-full md:w-auto">
                    Download Account Data
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end space-x-4">
              <Button variant="outline">Cancel</Button>
              <Button onClick={handleSaveSettings} >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
    </StudentDashboardLayout>
  )
}
