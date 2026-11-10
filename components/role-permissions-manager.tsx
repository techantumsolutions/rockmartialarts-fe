"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Shield, User, Users, GraduationCap, Save, RotateCcw, LucideIcon } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

// Define permission structure
interface Permission {
  id: string
  name: string
  description: string
  enabled: boolean
}

interface RolePermissions {
  role: string
  displayName: string
  icon: LucideIcon
  permissions: Permission[]
}

export function RolePermissionsManager() {
  const { toast } = useToast()
  const [activeRole, setActiveRole] = useState<string>("coach")
  const [hasChanges, setHasChanges] = useState(false)
  
  // Initial permissions configuration
  const [rolePermissions, setRolePermissions] = useState<RolePermissions[]>([
    {
      role: "coach",
      displayName: "Coach",
      icon: User,
      permissions: [
        { id: "dashboard", name: "Dashboard", description: "View dashboard home", enabled: true },
        { id: "students", name: "Students", description: "View and manage students", enabled: true },
        { id: "attendance", name: "Attendance", description: "Mark and view attendance", enabled: true },
        { id: "messages", name: "Messages", description: "Send and receive messages", enabled: true },
        { id: "courses", name: "Courses", description: "View assigned courses", enabled: true },
        { id: "reports", name: "Reports", description: "View performance reports", enabled: false },
        { id: "profile", name: "Profile", description: "View and edit own profile", enabled: true },
        { id: "settings", name: "Settings", description: "Access personal settings", enabled: true },
        { id: "payments", name: "Payments", description: "View payment information", enabled: false },
        { id: "branches", name: "Branches", description: "View branch information", enabled: false },
      ]
    },
    {
      role: "branch_admin",
      displayName: "Branch Admin",
      icon: Users,
      permissions: [
        { id: "dashboard", name: "Dashboard", description: "View dashboard home", enabled: true },
        { id: "students", name: "Students", description: "View and manage students", enabled: true },
        { id: "coaches", name: "Coaches", description: "View coaches in branch", enabled: true },
        { id: "attendance", name: "Attendance", description: "View all attendance", enabled: true },
        { id: "messages", name: "Messages", description: "Send and receive messages", enabled: true },
        { id: "courses", name: "Courses", description: "Manage branch courses", enabled: true },
        { id: "reports", name: "Reports", description: "View branch reports", enabled: true },
        { id: "profile", name: "Profile", description: "View and edit own profile", enabled: true },
        { id: "settings", name: "Settings", description: "Access branch settings", enabled: true },
        { id: "payments", name: "Payments", description: "Manage payments", enabled: true },
        { id: "branches", name: "Branches", description: "View own branch details", enabled: true },
        { id: "categories", name: "Categories", description: "Manage categories", enabled: false },
      ]
    },
    {
      role: "student",
      displayName: "Student",
      icon: GraduationCap,
      permissions: [
        { id: "dashboard", name: "Dashboard", description: "View dashboard home", enabled: true },
        { id: "courses", name: "My Courses", description: "View enrolled courses", enabled: true },
        { id: "attendance", name: "Attendance", description: "View own attendance", enabled: true },
        { id: "performance", name: "Performance", description: "Student performance dashboard", enabled: true },
        { id: "messages", name: "Messages", description: "Receive messages", enabled: true },
        { id: "profile", name: "Profile", description: "View and edit own profile", enabled: true },
        { id: "settings", name: "Settings", description: "Access personal settings", enabled: true },
        { id: "payments", name: "Payments", description: "View payment history", enabled: true },
        { id: "reports", name: "Reports", description: "View performance reports", enabled: false },
        { id: "coaches", name: "Coaches", description: "View assigned coaches", enabled: true },
        { id: "branches", name: "Branches", description: "View branch information", enabled: false },
      ]
    }
  ])

  useEffect(() => {
    // Load saved permissions from localStorage
    const saved = localStorage.getItem("role_permissions")
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        // Restore icon references
        parsed[0].icon = User
        parsed[1].icon = Users
        parsed[2].icon = GraduationCap
        setRolePermissions(parsed)
      } catch (error) {
        console.error("Error loading permissions:", error)
      }
    }
  }, [])

  const togglePermission = (roleIndex: number, permissionId: string) => {
    const updated = [...rolePermissions]
    const permission = updated[roleIndex].permissions.find(p => p.id === permissionId)
    if (permission) {
      permission.enabled = !permission.enabled
      setRolePermissions(updated)
      setHasChanges(true)
    }
  }

  const handleSave = () => {
    try {
      // Save without icon references (can't serialize functions)
      const toSave = rolePermissions.map(role => ({
        ...role,
        icon: null
      }))
      localStorage.setItem("role_permissions", JSON.stringify(toSave))
      setHasChanges(false)
      toast({
        title: "Permissions Saved",
        description: "Role permissions have been updated successfully.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save permissions. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleReset = () => {
    localStorage.removeItem("role_permissions")
    window.location.reload()
  }

  const currentRole = rolePermissions.find(r => r.role === activeRole)
  const activeCount = currentRole?.permissions.filter(p => p.enabled).length || 0
  const totalCount = currentRole?.permissions.length || 0

  return (
    <Card className="border border-gray-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-600" />
          Role Permissions Management
        </CardTitle>
        <CardDescription>
          Configure menu and feature access for different user roles
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeRole} onValueChange={setActiveRole}>
          <TabsList className="grid w-full grid-cols-3">
            {rolePermissions.map(role => {
              const IconComponent = role.icon
              return (
                <TabsTrigger key={role.role} value={role.role} className="flex items-center gap-2">
                  <IconComponent className="w-4 h-4" />
                  {role.displayName}
                </TabsTrigger>
              )
            })}
          </TabsList>

          {rolePermissions.map((role, roleIndex) => {
            const IconComponent = role.icon
            return (
              <TabsContent key={role.role} value={role.role} className="space-y-4 mt-6">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg">
                      <IconComponent className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{role.displayName}</h3>
                      <p className="text-sm text-gray-600">
                        {activeCount} of {totalCount} permissions enabled
                      </p>
                    </div>
                  </div>
                  <Badge variant={activeCount > 0 ? "default" : "secondary"}>
                    {activeCount}/{totalCount}
                  </Badge>
                </div>

                <div className="space-y-3">
                  {role.permissions.map(permission => (
                    <div
                      key={permission.id}
                      className="flex items-start justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1">
                        <Label htmlFor={`${role.role}-${permission.id}`} className="font-medium text-gray-900 cursor-pointer">
                          {permission.name}
                        </Label>
                        <p className="text-sm text-gray-600 mt-1">{permission.description}</p>
                      </div>
                      <Switch
                        id={`${role.role}-${permission.id}`}
                        checked={permission.enabled}
                        onCheckedChange={() => togglePermission(roleIndex, permission.id)}
                      />
                    </div>
                  ))}
                </div>
              </TabsContent>
            )
          })}
        </Tabs>

        <div className="flex items-center justify-between mt-6 pt-6 border-t">
          <Button
            variant="outline"
            onClick={handleReset}
            className="flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Default
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges}
            className="flex items-center gap-2 hover:bg-[#3d3f5c]"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
