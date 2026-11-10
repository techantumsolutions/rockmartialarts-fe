"use client"

import { Suspense, useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useDashboardBasePath } from "@/lib/useDashboardBasePath"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Settings,
  Shield,
  Bell,
  Database,
  MapPin,
  Save,
  RefreshCw,
  AlertTriangle,
  CreditCard,
  ChevronRight,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { TokenManager } from "@/lib/tokenManager"
import { settingsAPI, SystemSettings } from "@/lib/settingsAPI"
import GeographySettingsPage from "@/components/settings/geography-settings-page"

type SettingsSection =
  | "system"
  | "pricing"
  | "security"
  | "notifications"
  | "master"
  | "geography"
  | "backup"

const SETTINGS_SECTIONS: {
  id: SettingsSection
  label: string
  description: string
  icon: typeof Settings
}[] = [
  { id: "system", label: "System Configuration", description: "Basic system details & modes.", icon: Settings },
  { id: "pricing", label: "Pricing & Registration", description: "Registration and training fees.", icon: CreditCard },
  { id: "security", label: "Security Settings", description: "Session, password & 2FA.", icon: Shield },
  { id: "notifications", label: "Notification Settings", description: "Email and SMS preferences.", icon: Bell },
  { id: "master", label: "Master Data", description: "Manage common dropdowns.", icon: Database },
  { id: "geography", label: "State & City", description: "Configure states and cities.", icon: MapPin },
  { id: "backup", label: "Backup Settings", description: "Automated backups and retention.", icon: Database },
]

function isAllowedSettingsRole(role: string | undefined | null) {
  const normalized = String(role || "").toLowerCase()
  return (
    normalized === "superadmin" ||
    normalized === "super_admin" ||
    normalized === "partner_super_admin"
  )
}

function settingsLoginPath() {
  const user = TokenManager.getUser()
  const role = String(user?.role || "").toLowerCase()
  const partnerSlug =
    (typeof window !== "undefined" && localStorage.getItem("partner_slug")) ||
    user?.partner_slug ||
    ""
  if (role === "partner_super_admin" || partnerSlug) {
    return partnerSlug ? `/partners/${partnerSlug}/login` : "/superadmin/login"
  }
  return "/superadmin/login"
}

// Use the SystemSettings interface from the API

interface FormErrors {
  [key: string]: string
}

function SuperAdminSettingsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const basePath = useDashboardBasePath()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [activeSection, setActiveSection] = useState<SettingsSection>("system")

  useEffect(() => {
    const section = (searchParams.get("section") || "").toLowerCase()
    const match = SETTINGS_SECTIONS.find((s) => s.id === section)
    if (match) setActiveSection(match.id)
  }, [searchParams])

  const selectSection = (id: SettingsSection) => {
    setActiveSection(id)
    const url = id === "system" ? `${basePath}/settings` : `${basePath}/settings?section=${id}`
    router.replace(url, { scroll: false })
  }
  
  const [settings, setSettings] = useState<SystemSettings>({
    // System Configuration
    system_name: "Marshalats Learning Management System",
    system_version: "1.0.0",
    maintenance_mode: false,
    debug_mode: false,

    // Email Configuration
    email_enabled: true,
    smtp_host: "",
    smtp_port: "587",
    smtp_username: "",
    smtp_security: "tls",

    // Notification Settings
    notifications_enabled: true,
    email_notifications: true,
    sms_notifications: false,

    // Security Settings
    session_timeout: "24",
    password_policy: "medium",
    two_factor_auth: false,

    // Backup Settings
    auto_backup: true,
    backup_frequency: "daily",
    backup_retention: "30",

    registration_fee: 500,
    coach_registration_fee: 0,
    coach_registration_fee_note: "",
    partner_registration_fee: 999,
    home_training_fee: 0,
    school_training_fee: 0,
    college_training_fee: 0,
    corporate_training_fee: 0,
    residential_training_fee: 0,
  })

  useEffect(() => {
    // Check authentication
    if (!TokenManager.isAuthenticated()) {
      router.push(settingsLoginPath())
      return
    }

    // Rock super admin or partner super admin may open Settings
    const user = TokenManager.getUser()
    if (!user || !isAllowedSettingsRole(user.role)) {
      router.push(settingsLoginPath())
      return
    }
    
    // Load settings (mock data for now)
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const token = TokenManager.getToken()
      if (!token) {
        router.push(settingsLoginPath())
        return
      }

      const settingsData = await settingsAPI.getSettings(token)
      setSettings({
        ...settingsData,
        registration_fee:
          typeof settingsData.registration_fee === "number" && !Number.isNaN(settingsData.registration_fee)
            ? settingsData.registration_fee
            : 500,
        coach_registration_fee:
          typeof settingsData.coach_registration_fee === "number" && !Number.isNaN(settingsData.coach_registration_fee)
            ? settingsData.coach_registration_fee
            : 0,
        coach_registration_fee_note:
          typeof settingsData.coach_registration_fee_note === "string"
            ? settingsData.coach_registration_fee_note
            : "",
        partner_registration_fee:
          typeof settingsData.partner_registration_fee === "number" &&
          !Number.isNaN(settingsData.partner_registration_fee)
            ? settingsData.partner_registration_fee
            : 999,
      })
      setLoading(false)
    } catch (error) {
      console.error("Error loading settings:", error)
      toast({
        title: "Error",
        description: "Failed to load system settings",
        variant: "destructive"
      })
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string | boolean | number) => {
    setSettings(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!settings.system_name.trim()) {
      newErrors.system_name = "System name is required"
    }

    if (!settings.session_timeout.trim()) {
      newErrors.session_timeout = "Session timeout is required"
    } else if (!/^\d+$/.test(settings.session_timeout)) {
      newErrors.session_timeout = "Session timeout must be a number"
    }

    if (!settings.backup_retention.trim()) {
      newErrors.backup_retention = "Backup retention is required"
    } else if (!/^\d+$/.test(settings.backup_retention)) {
      newErrors.backup_retention = "Backup retention must be a number"
    }

    if (typeof settings.registration_fee !== "number" || settings.registration_fee < 0 || Number.isNaN(settings.registration_fee)) {
      newErrors.registration_fee = "Registration fee must be a number ≥ 0"
    }

    if (typeof settings.coach_registration_fee !== "number" || settings.coach_registration_fee < 0 || Number.isNaN(settings.coach_registration_fee)) {
      newErrors.coach_registration_fee = "Coach registration fee must be a number ≥ 0"
    }

    if (
      typeof settings.partner_registration_fee !== "number" ||
      settings.partner_registration_fee < 0 ||
      Number.isNaN(settings.partner_registration_fee)
    ) {
      newErrors.partner_registration_fee = "Partner registration fee must be a number ≥ 0"
    }

    if (typeof settings.home_training_fee !== "number" || settings.home_training_fee < 0 || Number.isNaN(settings.home_training_fee)) {
      newErrors.home_training_fee = "Home training fee must be a number ≥ 0"
    }
    if (typeof settings.school_training_fee !== "number" || settings.school_training_fee < 0 || Number.isNaN(settings.school_training_fee)) {
      newErrors.school_training_fee = "School training fee must be a number ≥ 0"
    }
    if (typeof settings.college_training_fee !== "number" || settings.college_training_fee < 0 || Number.isNaN(settings.college_training_fee)) {
      newErrors.college_training_fee = "College training fee must be a number ≥ 0"
    }
    if (typeof settings.corporate_training_fee !== "number" || settings.corporate_training_fee < 0 || Number.isNaN(settings.corporate_training_fee)) {
      newErrors.corporate_training_fee = "Corporate training fee must be a number ≥ 0"
    }
    if (typeof settings.residential_training_fee !== "number" || settings.residential_training_fee < 0 || Number.isNaN(settings.residential_training_fee)) {
      newErrors.residential_training_fee = "Residential training fee must be a number ≥ 0"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validateForm()) return

    setIsSubmitting(true)

    try {
      const token = TokenManager.getToken()
      if (!token) {
        router.push(settingsLoginPath())
        return
      }

      await settingsAPI.updateSettings(settings, token)

      toast({
        title: "Settings Saved",
        description: "System settings have been updated successfully",
        variant: "default"
      })

    } catch (error) {
      console.error("Error saving settings:", error)
      toast({
        title: "Error",
        description: "Failed to save system settings",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = async () => {
    try {
      const token = TokenManager.getToken()
      if (!token) {
        router.push(settingsLoginPath())
        return
      }

      const resetSettings = await settingsAPI.resetSettings(token)
      setSettings(resetSettings)
      setErrors({})

      toast({
        title: "Settings Reset",
        description: "All settings have been reset to default values",
        variant: "default"
      })
    } catch (error) {
      console.error("Error resetting settings:", error)
      toast({
        title: "Error",
        description: "Failed to reset system settings",
        variant: "destructive"
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="w-full p-4 lg:px-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading settings...</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  const showSaveActions = activeSection !== "geography" && activeSection !== "master"

  return (
    <div className="w-full min-w-0 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#171A26]">System Settings</h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Configure system-wide settings and preferences for your academy.
          </p>
        </div>
        {showSaveActions && (
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleReset} variant="outline" disabled={isSubmitting}>
              <RefreshCw className="h-4 w-4" />
              Reset to Defaults
            </Button>
            <Button onClick={handleSave} loading={isSubmitting} loadingText="Saving...">
              <Save className="h-4 w-4" />
              Save Settings
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="h-fit rounded-2xl border border-[#E2E8F0] bg-white p-2 shadow-sm">
          <nav className="space-y-1" aria-label="Settings sections">
            {SETTINGS_SECTIONS.map((section) => {
              const Icon = section.icon
              const active = activeSection === section.id
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => selectSection(section.id)}
                  className={`flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors ${
                    active
                      ? "bg-[#FFF7DF] text-[#171A26] ring-1 ring-[#FFB70F]/40"
                      : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#171A26]"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      active ? "bg-[#FFB70F]/20 text-[#B45309]" : "bg-[#F8FAFC] text-[#64748B]"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{section.label}</span>
                    <span className="mt-0.5 block text-xs leading-snug text-[#64748B]">{section.description}</span>
                  </span>
                </button>
              )
            })}
          </nav>
        </aside>

        <div className="min-w-0 space-y-4">
          {activeSection === "system" && (
            <Card className="rounded-2xl border-[#E2E8F0] shadow-sm">
              <CardHeader className="border-b border-[#E2E8F0] pb-4">
                <CardTitle className="flex items-center gap-2 text-[#171A26]">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FFB70F]/20 text-[#B45309]">
                    <Settings className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block text-lg">System Configuration</span>
                    <span className="mt-0.5 block text-sm font-normal text-[#64748B]">
                      Configure basic system details and operational modes.
                    </span>
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="system_name" className="text-sm font-medium text-[#171A26]">
                      System Name *
                    </Label>
                    <Input
                      id="system_name"
                      value={settings.system_name}
                      onChange={(e) => handleInputChange("system_name", e.target.value)}
                      className={errors.system_name ? "border-red-500" : ""}
                      placeholder="Enter system name"
                    />
                    {errors.system_name && <p className="mt-1 text-sm text-red-600">{errors.system_name}</p>}
                  </div>
                  <div>
                    <Label htmlFor="system_version" className="text-sm font-medium text-[#171A26]">
                      System Version
                    </Label>
                    <Input id="system_version" value={settings.system_version} disabled />
                    <p className="mt-1 text-xs text-[#64748B]">Version is automatically managed</p>
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium text-[#171A26]">Maintenance Mode</Label>
                      <p className="text-xs text-[#64748B]">Enable to prevent user access during system updates</p>
                    </div>
                    <Switch
                      checked={settings.maintenance_mode}
                      onCheckedChange={(checked) => handleInputChange("maintenance_mode", checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium text-[#171A26]">Debug Mode</Label>
                      <p className="text-xs text-[#64748B]">Enable detailed logging for troubleshooting</p>
                    </div>
                    <Switch
                      checked={settings.debug_mode}
                      onCheckedChange={(checked) => handleInputChange("debug_mode", checked)}
                    />
                  </div>
                </div>
                {settings.maintenance_mode && (
                  <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="mt-0.5 h-5 w-5 text-yellow-600" />
                      <div>
                        <h4 className="text-sm font-medium text-yellow-800">Maintenance Mode Active</h4>
                        <p className="mt-1 text-sm text-yellow-700">
                          The system is currently in maintenance mode. Users will see a maintenance page.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeSection === "pricing" && (
            <Card className="rounded-2xl border-[#E2E8F0] shadow-sm">
              <CardHeader className="border-b border-[#E2E8F0] pb-4">
                <CardTitle className="flex items-center gap-2 text-[#171A26]">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FFB70F]/20 text-[#B45309]">
                    <CreditCard className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block text-lg">Pricing &amp; Registration</span>
                    <span className="mt-0.5 block text-sm font-normal text-[#64748B]">
                      Registration and training fees.
                    </span>
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {(
                    [
                      ["registration_fee", "Registration fee (INR)", "Default admission/registration amount on the public registration payment page (unless overridden per branch)."],
                      ["coach_registration_fee", "Coach registration fee (INR)", "Fee collected via Razorpay on the public coach registration page (set to 0 for free registration)."],
                      ["partner_registration_fee", "Partner registration fee (INR)", "Fee charged via Razorpay when creating a white-label partner with online payment."],
                      ["home_training_fee", "Home training fee (INR)", "Fee collected via Razorpay on the public home training request page."],
                      ["school_training_fee", "School training fee (INR)", "Fee collected via Razorpay on the public school training request page."],
                      ["college_training_fee", "College training fee (INR)", "Fee collected via Razorpay on the public college training request page."],
                      ["corporate_training_fee", "Corporate training fee (INR)", "Fee collected via Razorpay on the public corporate training request page."],
                      ["residential_training_fee", "Residential training fee (INR)", "Fee collected via Razorpay on the public residential training request page."],
                    ] as const
                  ).map(([field, label, hint]) => (
                    <div key={field}>
                      <Label htmlFor={field} className="text-sm font-medium text-[#171A26]">
                        {label}
                      </Label>
                      <Input
                        id={field}
                        type="number"
                        min={0}
                        step={1}
                        value={settings[field] as number}
                        onChange={(e) => handleInputChange(field, parseFloat(e.target.value) || 0)}
                        className={errors[field] ? "border-red-500" : ""}
                      />
                      {errors[field] && <p className="mt-1 text-sm text-red-600">{errors[field]}</p>}
                      <p className="mt-1 text-xs text-[#64748B]">{hint}</p>
                    </div>
                  ))}
                  <div className="md:col-span-2">
                    <Label htmlFor="coach_registration_fee_note" className="text-sm font-medium text-[#171A26]">
                      Coach registration fee note / subtext
                    </Label>
                    <Input
                      id="coach_registration_fee_note"
                      type="text"
                      value={settings.coach_registration_fee_note || ""}
                      onChange={(e) => handleInputChange("coach_registration_fee_note", e.target.value)}
                      placeholder="e.g. One-time non-refundable fee required to process your application via Razorpay."
                    />
                    <p className="mt-1 text-xs text-[#64748B]">
                      Custom subtext displayed in the fee card on the coach registration page. Leave empty to hide.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeSection === "security" && (
            <Card className="rounded-2xl border-[#E2E8F0] shadow-sm">
              <CardHeader className="border-b border-[#E2E8F0] pb-4">
                <CardTitle className="flex items-center gap-2 text-[#171A26]">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FFB70F]/20 text-[#B45309]">
                    <Shield className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block text-lg">Security Settings</span>
                    <span className="mt-0.5 block text-sm font-normal text-[#64748B]">
                      Session, password &amp; 2FA.
                    </span>
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="session_timeout" className="text-sm font-medium text-[#171A26]">
                      Session Timeout (hours) *
                    </Label>
                    <Input
                      id="session_timeout"
                      value={settings.session_timeout}
                      onChange={(e) => handleInputChange("session_timeout", e.target.value)}
                      className={errors.session_timeout ? "border-red-500" : ""}
                      placeholder="24"
                    />
                    {errors.session_timeout && (
                      <p className="mt-1 text-sm text-red-600">{errors.session_timeout}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="password_policy" className="text-sm font-medium text-[#171A26]">
                      Password Policy
                    </Label>
                    <Select
                      value={settings.password_policy}
                      onValueChange={(value) => handleInputChange("password_policy", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select password policy" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weak">Weak (6+ characters)</SelectItem>
                        <SelectItem value="medium">Medium (8+ chars, mixed case)</SelectItem>
                        <SelectItem value="strong">Strong (12+ chars, symbols)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium text-[#171A26]">Two-Factor Authentication</Label>
                    <p className="text-xs text-[#64748B]">Require 2FA for all superadmin accounts</p>
                  </div>
                  <Switch
                    checked={settings.two_factor_auth}
                    onCheckedChange={(checked) => handleInputChange("two_factor_auth", checked)}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {activeSection === "notifications" && (
            <Card className="rounded-2xl border-[#E2E8F0] shadow-sm">
              <CardHeader className="border-b border-[#E2E8F0] pb-4">
                <CardTitle className="flex items-center gap-2 text-[#171A26]">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FFB70F]/20 text-[#B45309]">
                    <Bell className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block text-lg">Notification Settings</span>
                    <span className="mt-0.5 block text-sm font-normal text-[#64748B]">
                      Email and SMS preferences.
                    </span>
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium text-[#171A26]">Enable Notifications</Label>
                    <p className="text-xs text-[#64748B]">Allow the system to send notifications</p>
                  </div>
                  <Switch
                    checked={settings.notifications_enabled}
                    onCheckedChange={(checked) => handleInputChange("notifications_enabled", checked)}
                  />
                </div>
                {settings.notifications_enabled && (
                  <>
                    <Separator />
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      <div className="flex items-center justify-between gap-4">
                        <div className="space-y-0.5">
                          <Label className="text-sm font-medium text-[#171A26]">Email Notifications</Label>
                          <p className="text-xs text-[#64748B]">Send notifications via email</p>
                        </div>
                        <Switch
                          checked={settings.email_notifications}
                          onCheckedChange={(checked) => handleInputChange("email_notifications", checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <div className="space-y-0.5">
                          <Label className="text-sm font-medium text-[#171A26]">SMS Notifications</Label>
                          <p className="text-xs text-[#64748B]">Send notifications via SMS</p>
                        </div>
                        <Switch
                          checked={settings.sms_notifications}
                          onCheckedChange={(checked) => handleInputChange("sms_notifications", checked)}
                        />
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {activeSection === "master" && (
            <Card className="rounded-2xl border-[#E2E8F0] shadow-sm">
              <CardHeader className="border-b border-[#E2E8F0] pb-4">
                <CardTitle className="flex items-center gap-2 text-[#171A26]">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FFB70F]/20 text-[#B45309]">
                    <Database className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block text-lg">Master Data</span>
                    <span className="mt-0.5 block text-sm font-normal text-[#64748B]">
                      Manage common dropdowns.
                    </span>
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <p className="text-sm text-[#64748B]">
                  Manage dropdown options for forms like Add Coach, Add Student, etc. Configure countries,
                  designations, specializations, and other dropdown values.
                </p>
                <Button
                  type="button"
                  onClick={() => router.push(`${basePath}/settings/dropdown-settings`)}
                >
                  Open Master Data
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          )}

          {activeSection === "geography" && (
            <Card className="rounded-2xl border-[#E2E8F0] shadow-sm">
              <CardHeader className="border-b border-[#E2E8F0] pb-4">
                <CardTitle className="flex items-center gap-2 text-[#171A26]">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FFB70F]/20 text-[#B45309]">
                    <MapPin className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block text-lg">State &amp; City</span>
                    <span className="mt-0.5 block text-sm font-normal text-[#64748B]">
                      Configure states and cities used across branch, registration, and student forms.
                    </span>
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <GeographySettingsPage embedded />
              </CardContent>
            </Card>
          )}

          {activeSection === "backup" && (
            <Card className="rounded-2xl border-[#E2E8F0] shadow-sm">
              <CardHeader className="border-b border-[#E2E8F0] pb-4">
                <CardTitle className="flex items-center gap-2 text-[#171A26]">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FFB70F]/20 text-[#B45309]">
                    <Database className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block text-lg">Backup Settings</span>
                    <span className="mt-0.5 block text-sm font-normal text-[#64748B]">
                      Automated backups and retention.
                    </span>
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium text-[#171A26]">Auto Backup</Label>
                    <p className="text-xs text-[#64748B]">Enable automatic system backups</p>
                  </div>
                  <Switch
                    checked={settings.auto_backup}
                    onCheckedChange={(checked) => handleInputChange("auto_backup", checked)}
                  />
                </div>
                {settings.auto_backup && (
                  <>
                    <Separator />
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <Label htmlFor="backup_frequency" className="text-sm font-medium text-[#171A26]">
                          Backup Frequency
                        </Label>
                        <Select
                          value={settings.backup_frequency}
                          onValueChange={(value) => handleInputChange("backup_frequency", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select backup frequency" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="backup_retention" className="text-sm font-medium text-[#171A26]">
                          Backup Retention (days) *
                        </Label>
                        <Input
                          id="backup_retention"
                          value={settings.backup_retention}
                          onChange={(e) => handleInputChange("backup_retention", e.target.value)}
                          className={errors.backup_retention ? "border-red-500" : ""}
                          placeholder="30"
                        />
                        {errors.backup_retention && (
                          <p className="mt-1 text-sm text-red-600">{errors.backup_retention}</p>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-[#64748B]">
          Loading settings…
        </div>
      }
    >
      <SuperAdminSettingsPage />
    </Suspense>
  )
}
