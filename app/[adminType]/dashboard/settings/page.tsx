"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useDashboardBasePath } from "@/lib/useDashboardBasePath"
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
  Info,
  CreditCard,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { TokenManager } from "@/lib/tokenManager"
import { settingsAPI, SystemSettings, SettingsResponse } from "@/lib/settingsAPI"

// Use the SystemSettings interface from the API

interface FormErrors {
  [key: string]: string
}

export default function SuperAdminSettingsPage() {
  const router = useRouter()
  const basePath = useDashboardBasePath()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  
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
  })

  useEffect(() => {
    // Check authentication
    if (!TokenManager.isAuthenticated()) {
      router.push("/superadmin/login")
      return
    }

    // Check if user is superadmin
    const user = TokenManager.getUser()
    if (!user || user.role !== "superadmin") {
      router.push("/superadmin/login")
      return
    }
    
    // Load settings (mock data for now)
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const token = TokenManager.getToken()
      if (!token) {
        router.push("/superadmin/login")
        return
      }

      const settingsData = await settingsAPI.getSettings(token)
      setSettings({
        ...settingsData,
        registration_fee:
          typeof settingsData.registration_fee === "number" && !Number.isNaN(settingsData.registration_fee)
            ? settingsData.registration_fee
            : 500,
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

    if (settings.email_enabled) {
      if (!settings.smtp_host.trim()) {
        newErrors.smtp_host = "SMTP host is required when email is enabled"
      }
      if (!settings.smtp_port.trim()) {
        newErrors.smtp_port = "SMTP port is required when email is enabled"
      } else if (!/^\d+$/.test(settings.smtp_port)) {
        newErrors.smtp_port = "SMTP port must be a number"
      }
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

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validateForm()) return

    setIsSubmitting(true)

    try {
      const token = TokenManager.getToken()
      if (!token) {
        router.push("/superadmin/login")
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
        router.push("/superadmin/login")
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

  return (
    <div className="min-h-screen bg-gray-50">
      
      <main className="w-full p-4 lg:px-8">
        <div className="mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
              <p className="text-gray-600">Configure system-wide settings and preferences</p>
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={handleReset}
                variant="outline"
                disabled={isSubmitting}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reset to Defaults
              </Button>
              <Button 
                onClick={handleSave}
                disabled={isSubmitting}
                className="bg-yellow-400 hover:bg-yellow-500 text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSubmitting ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </div>

          {/* System Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                System Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="system_name" className="text-sm font-medium text-gray-700">
                    System Name *
                  </Label>
                  <Input
                    id="system_name"
                    value={settings.system_name}
                    onChange={(e) => handleInputChange("system_name", e.target.value)}
                    className={errors.system_name ? "border-red-500" : ""}
                    placeholder="Enter system name"
                  />
                  {errors.system_name && (
                    <p className="mt-1 text-sm text-red-600">{errors.system_name}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="system_version" className="text-sm font-medium text-gray-700">
                    System Version
                  </Label>
                  <Input
                    id="system_version"
                    value={settings.system_version}
                    onChange={(e) => handleInputChange("system_version", e.target.value)}
                    placeholder="Enter system version"
                    disabled
                  />
                  <p className="mt-1 text-xs text-gray-500">Version is automatically managed</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium text-gray-700">Maintenance Mode</Label>
                    <p className="text-xs text-gray-500">
                      Enable to prevent user access during system updates
                    </p>
                  </div>
                  <Switch
                    checked={settings.maintenance_mode}
                    onCheckedChange={(checked) => handleInputChange("maintenance_mode", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium text-gray-700">Debug Mode</Label>
                    <p className="text-xs text-gray-500">
                      Enable detailed logging for troubleshooting
                    </p>
                  </div>
                  <Switch
                    checked={settings.debug_mode}
                    onCheckedChange={(checked) => handleInputChange("debug_mode", checked)}
                  />
                </div>
              </div>

              {settings.maintenance_mode && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-yellow-800">Maintenance Mode Active</h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        The system is currently in maintenance mode. Users will see a maintenance page.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pricing & registration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Pricing &amp; registration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-w-md">
                <Label htmlFor="registration_fee" className="text-sm font-medium text-gray-700">
                  Registration fee (INR)
                </Label>
                <Input
                  id="registration_fee"
                  type="number"
                  min={0}
                  step={1}
                  value={settings.registration_fee}
                  onChange={(e) => handleInputChange("registration_fee", parseFloat(e.target.value) || 0)}
                  className={errors.registration_fee ? "border-red-500" : ""}
                />
                {errors.registration_fee && (
                  <p className="mt-1 text-sm text-red-600">{errors.registration_fee}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Default admission/registration amount on the public registration payment page (unless overridden per branch).
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Security Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="session_timeout" className="text-sm font-medium text-gray-700">
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
                  <Label htmlFor="password_policy" className="text-sm font-medium text-gray-700">
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

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium text-gray-700">Two-Factor Authentication</Label>
                  <p className="text-xs text-gray-500">
                    Require 2FA for all superadmin accounts
                  </p>
                </div>
                <Switch
                  checked={settings.two_factor_auth}
                  onCheckedChange={(checked) => handleInputChange("two_factor_auth", checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notification Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium text-gray-700">Enable Notifications</Label>
                  <p className="text-xs text-gray-500">
                    Allow the system to send notifications
                  </p>
                </div>
                <Switch
                  checked={settings.notifications_enabled}
                  onCheckedChange={(checked) => handleInputChange("notifications_enabled", checked)}
                />
              </div>

              {settings.notifications_enabled && (
                <>
                  <Separator />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium text-gray-700">Email Notifications</Label>
                        <p className="text-xs text-gray-500">Send notifications via email</p>
                      </div>
                      <Switch
                        checked={settings.email_notifications}
                        onCheckedChange={(checked) => handleInputChange("email_notifications", checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium text-gray-700">SMS Notifications</Label>
                        <p className="text-xs text-gray-500">Send notifications via SMS</p>
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

          {/* Email Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Email Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium text-gray-700">Enable Email</Label>
                  <p className="text-xs text-gray-500">
                    Allow the system to send emails
                  </p>
                </div>
                <Switch
                  checked={settings.email_enabled}
                  onCheckedChange={(checked) => handleInputChange("email_enabled", checked)}
                />
              </div>

              {settings.email_enabled && (
                <>
                  <Separator />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="smtp_host" className="text-sm font-medium text-gray-700">
                        SMTP Host *
                      </Label>
                      <Input
                        id="smtp_host"
                        value={settings.smtp_host}
                        onChange={(e) => handleInputChange("smtp_host", e.target.value)}
                        className={errors.smtp_host ? "border-red-500" : ""}
                        placeholder="smtp.gmail.com"
                      />
                      {errors.smtp_host && (
                        <p className="mt-1 text-sm text-red-600">{errors.smtp_host}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="smtp_port" className="text-sm font-medium text-gray-700">
                        SMTP Port *
                      </Label>
                      <Input
                        id="smtp_port"
                        value={settings.smtp_port}
                        onChange={(e) => handleInputChange("smtp_port", e.target.value)}
                        className={errors.smtp_port ? "border-red-500" : ""}
                        placeholder="587"
                      />
                      {errors.smtp_port && (
                        <p className="mt-1 text-sm text-red-600">{errors.smtp_port}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="smtp_username" className="text-sm font-medium text-gray-700">
                        SMTP Username
                      </Label>
                      <Input
                        id="smtp_username"
                        value={settings.smtp_username}
                        onChange={(e) => handleInputChange("smtp_username", e.target.value)}
                        placeholder="your-email@gmail.com"
                      />
                    </div>

                    <div>
                      <Label htmlFor="smtp_security" className="text-sm font-medium text-gray-700">
                        SMTP Security
                      </Label>
                      <Select
                        value={settings.smtp_security}
                        onValueChange={(value) => handleInputChange("smtp_security", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select security protocol" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="tls">TLS</SelectItem>
                          <SelectItem value="ssl">SSL</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Backup Settings */}

          {/* Master Data */}
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push(`${basePath}/settings/dropdown-settings`)}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Master Data
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Manage dropdown options for forms like Add Coach, Add Student, etc. Configure countries, designations, specializations, and other dropdown values.
              </p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push(`${basePath}/settings/geography`)}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                State & City
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Manage states and cities used when selecting a branch location in admin and registration forms.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Backup Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium text-gray-700">Auto Backup</Label>
                  <p className="text-xs text-gray-500">
                    Enable automatic system backups
                  </p>
                </div>
                <Switch
                  checked={settings.auto_backup}
                  onCheckedChange={(checked) => handleInputChange("auto_backup", checked)}
                />
              </div>

              {settings.auto_backup && (
                <>
                  <Separator />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="backup_frequency" className="text-sm font-medium text-gray-700">
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
                      <Label htmlFor="backup_retention" className="text-sm font-medium text-gray-700">
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
        </div>
      </main>
    </div>
  )
}
