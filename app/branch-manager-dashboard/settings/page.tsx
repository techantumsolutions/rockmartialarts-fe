"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { 
  Settings, 
  Shield, 
  Bell, 
  Database, 
  Mail, 
  Globe, 
  Lock, 
  Save, 
  RefreshCw,
  AlertTriangle,
  Info
} from "lucide-react"
import Header from "@/components/layout/Header"
import { useToast } from "@/hooks/use-toast"
import { BranchManagerAuth } from "@/lib/branchManagerAuth"
import { branchAPI } from "@/lib/branchAPI"

interface BranchSettings {
  // Branch Configuration
  branch_name: string
  branch_code: string
  branch_email: string
  branch_phone: string
  
  // Operational Settings
  operating_hours_start: string
  operating_hours_end: string
  max_students_per_class: number
  booking_advance_days: number
  cancellation_hours: number
  
  // Notification Settings
  email_notifications: boolean
  sms_notifications: boolean
  push_notifications: boolean
  student_reminder_notifications: boolean
  coach_assignment_notifications: boolean
  
  // Security Settings
  require_password_change: boolean
  session_timeout_minutes: number
  two_factor_authentication: boolean
  
  // Display Settings
  timezone: string
  date_format: string
  currency: string
  language: string
}

interface FormErrors {
  [key: string]: string
}

export default function BranchManagerSettingsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [branchRecord, setBranchRecord] = useState<Record<string, any> | null>(null)
  const [settingsReadOnlyNotice, setSettingsReadOnlyNotice] = useState<string | null>(null)
  
  const [settings, setSettings] = useState<BranchSettings>({
    branch_name: "",
    branch_code: "",
    branch_email: "",
    branch_phone: "",
    operating_hours_start: "06:00",
    operating_hours_end: "22:00",
    max_students_per_class: 20,
    booking_advance_days: 30,
    cancellation_hours: 24,
    email_notifications: false,
    sms_notifications: false,
    push_notifications: false,
    student_reminder_notifications: false,
    coach_assignment_notifications: false,
    require_password_change: false,
    session_timeout_minutes: 60,
    two_factor_authentication: false,
    timezone: "Asia/Kolkata",
    date_format: "DD/MM/YYYY",
    currency: "INR",
    language: "en"
  })

  useEffect(() => {
    // Check authentication first
    if (!BranchManagerAuth.isAuthenticated()) {
      router.push("/branch-manager/login")
      return
    }

    // Load settings data
    const loadSettings = async () => {
      try {
        setLoading(true)
        
        const currentUser = BranchManagerAuth.getCurrentUser()
        const token = BranchManagerAuth.getToken()
        const branchId = currentUser?.branch_id
        if (!currentUser || !token || !branchId) {
          throw new Error("Branch manager session or branch assignment not found")
        }

        const branch = await branchAPI.getBranchById(branchId, token)
        setBranchRecord(branch)

        const branchInfo = branch.branch || {}
        const timings = branch.operational_details?.timings || []
        const firstTiming = timings[0]
        const lastTiming = timings[timings.length - 1] || firstTiming

        setSettings((prev) => ({
          ...prev,
          branch_name: branchInfo.name || currentUser.branch_name || "",
          branch_code: branchInfo.code || branch.code || "",
          branch_email: branchInfo.email || "",
          branch_phone: branchInfo.phone || "",
          operating_hours_start: firstTiming?.open || "06:00",
          operating_hours_end: lastTiming?.close || "22:00",
        }))

        setSettingsReadOnlyNotice(
          "Notification, security, and display preferences are not stored on the branch API yet and are shown as read-only."
        )

      } catch (error) {
        console.error('Error loading settings:', error)
        toast({
          title: "Error",
          description: "Failed to load settings data",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [router, toast])

  const handleInputChange = (field: keyof BranchSettings, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }))
    }
  }

  const validateForm = () => {
    const newErrors: FormErrors = {}

    if (!settings.branch_name.trim()) {
      newErrors.branch_name = "Branch name is required"
    }

    if (!settings.branch_email.trim()) {
      newErrors.branch_email = "Branch email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.branch_email)) {
      newErrors.branch_email = "Please enter a valid email address"
    }

    if (settings.max_students_per_class < 1 || settings.max_students_per_class > 100) {
      newErrors.max_students_per_class = "Max students per class must be between 1 and 100"
    }

    if (settings.session_timeout_minutes < 15 || settings.session_timeout_minutes > 480) {
      newErrors.session_timeout_minutes = "Session timeout must be between 15 and 480 minutes"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validateForm()) {
      return
    }

    try {
      setIsSubmitting(true)

      const currentUser = BranchManagerAuth.getCurrentUser()
      const token = BranchManagerAuth.getToken()
      const branchId = currentUser?.branch_id

      if (!token || !branchId || !branchRecord) {
        throw new Error("Branch profile is not loaded")
      }

      const existingTimings = branchRecord.operational_details?.timings || []
      const updatedTimings =
        existingTimings.length > 0
          ? existingTimings.map((timing: any, index: number) =>
              index === 0
                ? {
                    ...timing,
                    open: settings.operating_hours_start,
                    close: settings.operating_hours_end,
                  }
                : timing
            )
          : [
              {
                day: "Monday",
                open: settings.operating_hours_start,
                close: settings.operating_hours_end,
              },
            ]

      await branchAPI.updateBranch(
        branchId,
        {
          branch: {
            ...(branchRecord.branch || {}),
            name: settings.branch_name,
            code: settings.branch_code || branchRecord.branch?.code,
            email: settings.branch_email,
            phone: settings.branch_phone,
          },
          operational_details: {
            ...(branchRecord.operational_details || {}),
            courses_offered:
              branchRecord.operational_details?.courses_offered || [],
            holidays: branchRecord.operational_details?.holidays || [],
            timings: updatedTimings,
          },
        },
        token
      )

      const refreshed = await branchAPI.getBranchById(branchId, token)
      setBranchRecord(refreshed)

      toast({
        title: "Success",
        description: "Branch profile and operating hours saved",
      })
    } catch (error) {
      console.error('Error updating settings:', error)
      const description =
        error instanceof Error
          ? error.message
          : "Failed to update branch settings"
      toast({
        title: "Unable to save",
        description,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    if (!branchRecord) return

    const branchInfo = branchRecord.branch || {}
    const timings = branchRecord.operational_details?.timings || []
    const firstTiming = timings[0]
    const lastTiming = timings[timings.length - 1] || firstTiming

    setSettings((prev) => ({
      ...prev,
      branch_name: branchInfo.name || "",
      branch_code: branchInfo.code || "",
      branch_email: branchInfo.email || "",
      branch_phone: branchInfo.phone || "",
      operating_hours_start: firstTiming?.open || "06:00",
      operating_hours_end: lastTiming?.close || "22:00",
    }))
    setErrors({})
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Settings" role="branch_admin" />
        <main className="w-full p-4 lg:py-4 px-19">
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-gray-200 rounded w-1/4"></div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="bg-white rounded-lg p-6 space-y-4">
                    <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                    <div className="space-y-3">
                      <div className="h-4 bg-gray-200 rounded w-full"></div>
                      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Settings" role="branch_admin" />
      
      <main className="w-full p-4 lg:py-4 px-19">
        <div className="max-w-4xl mx-auto">
          {settingsReadOnlyNotice && (
            <div className="mb-6 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
              <Info className="w-5 h-5 shrink-0 mt-0.5" />
              <p>{settingsReadOnlyNotice}</p>
            </div>
          )}

          {/* Header */}
          <div className="flex flex-col lg:flex-row justify-between items-start py-8 mb-6 lg:items-center gap-4">
            <div>
              <h1 className="text-2xl font-medium text-gray-600">Branch Settings</h1>
              <p className="text-sm text-gray-500 mt-1">Configure your branch preferences and operational settings</p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={isSubmitting}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reset to Default
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSubmitting ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Branch Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="w-5 h-5 text-blue-600" />
                  <span>Branch Configuration</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="branch_name">Branch Name *</Label>
                  <Input
                    id="branch_name"
                    value={settings.branch_name}
                    onChange={(e) => handleInputChange('branch_name', e.target.value)}
                    className={errors.branch_name ? "border-red-500" : ""}
                  />
                  {errors.branch_name && (
                    <p className="text-xs text-red-600">{errors.branch_name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="branch_code">Branch Code</Label>
                  <Input
                    id="branch_code"
                    value={settings.branch_code}
                    onChange={(e) => handleInputChange('branch_code', e.target.value)}
                    disabled
                    className="bg-gray-50"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="branch_email">Branch Email *</Label>
                  <Input
                    id="branch_email"
                    type="email"
                    value={settings.branch_email}
                    onChange={(e) => handleInputChange('branch_email', e.target.value)}
                    className={errors.branch_email ? "border-red-500" : ""}
                  />
                  {errors.branch_email && (
                    <p className="text-xs text-red-600">{errors.branch_email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="branch_phone">Branch Phone</Label>
                  <Input
                    id="branch_phone"
                    value={settings.branch_phone}
                    onChange={(e) => handleInputChange('branch_phone', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Operational Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="w-5 h-5 text-blue-600" />
                  <span>Operational Settings</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="operating_hours_start">Opening Time</Label>
                    <Input
                      id="operating_hours_start"
                      type="time"
                      value={settings.operating_hours_start}
                      onChange={(e) => handleInputChange('operating_hours_start', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="operating_hours_end">Closing Time</Label>
                    <Input
                      id="operating_hours_end"
                      type="time"
                      value={settings.operating_hours_end}
                      onChange={(e) => handleInputChange('operating_hours_end', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_students_per_class">Max Students per Class</Label>
                  <Input
                    id="max_students_per_class"
                    type="number"
                    min="1"
                    max="100"
                    value={settings.max_students_per_class}
                    onChange={(e) => handleInputChange('max_students_per_class', parseInt(e.target.value))}
                    className={errors.max_students_per_class ? "border-red-500" : ""}
                    disabled
                  />
                  {errors.max_students_per_class && (
                    <p className="text-xs text-red-600">{errors.max_students_per_class}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="booking_advance_days">Booking Advance Days</Label>
                  <Input
                    id="booking_advance_days"
                    type="number"
                    min="1"
                    max="365"
                    value={settings.booking_advance_days}
                    onChange={(e) => handleInputChange('booking_advance_days', parseInt(e.target.value))}
                    disabled
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cancellation_hours">Cancellation Hours</Label>
                  <Input
                    id="cancellation_hours"
                    type="number"
                    min="1"
                    max="168"
                    value={settings.cancellation_hours}
                    onChange={(e) => handleInputChange('cancellation_hours', parseInt(e.target.value))}
                    disabled
                  />
                </div>
              </CardContent>
            </Card>

            {/* Notification Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bell className="w-5 h-5 text-blue-600" />
                  <span>Notification Settings</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Email Notifications</Label>
                    <p className="text-xs text-gray-500">Receive notifications via email</p>
                  </div>
                  <Switch
                    checked={settings.email_notifications}
                    onCheckedChange={(checked) => handleInputChange('email_notifications', checked)}
                    disabled
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>SMS Notifications</Label>
                    <p className="text-xs text-gray-500">Receive notifications via SMS</p>
                  </div>
                  <Switch
                    checked={settings.sms_notifications}
                    onCheckedChange={(checked) => handleInputChange('sms_notifications', checked)}
                    disabled
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Push Notifications</Label>
                    <p className="text-xs text-gray-500">Receive push notifications</p>
                  </div>
                  <Switch
                    checked={settings.push_notifications}
                    onCheckedChange={(checked) => handleInputChange('push_notifications', checked)}
                    disabled
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Student Reminders</Label>
                    <p className="text-xs text-gray-500">Send reminders to students</p>
                  </div>
                  <Switch
                    checked={settings.student_reminder_notifications}
                    onCheckedChange={(checked) => handleInputChange('student_reminder_notifications', checked)}
                    disabled
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Coach Assignments</Label>
                    <p className="text-xs text-gray-500">Notify about coach assignments</p>
                  </div>
                  <Switch
                    checked={settings.coach_assignment_notifications}
                    onCheckedChange={(checked) => handleInputChange('coach_assignment_notifications', checked)}
                    disabled
                  />
                </div>
              </CardContent>
            </Card>

            {/* Security & Display Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  <span>Security & Display</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Require Password Change</Label>
                    <p className="text-xs text-gray-500">Force password change on next login</p>
                  </div>
                  <Switch
                    checked={settings.require_password_change}
                    onCheckedChange={(checked) => handleInputChange('require_password_change', checked)}
                    disabled
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="session_timeout_minutes">Session Timeout (minutes)</Label>
                  <Input
                    id="session_timeout_minutes"
                    type="number"
                    min="15"
                    max="480"
                    value={settings.session_timeout_minutes}
                    onChange={(e) => handleInputChange('session_timeout_minutes', parseInt(e.target.value))}
                    className={errors.session_timeout_minutes ? "border-red-500" : ""}
                    disabled
                  />
                  {errors.session_timeout_minutes && (
                    <p className="text-xs text-red-600">{errors.session_timeout_minutes}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select value={settings.timezone} onValueChange={(value) => handleInputChange('timezone', value)} disabled>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                      <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                      <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                      <SelectItem value="Asia/Tokyo">Asia/Tokyo (JST)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={settings.currency} onValueChange={(value) => handleInputChange('currency', value)} disabled>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">INR (₹)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
