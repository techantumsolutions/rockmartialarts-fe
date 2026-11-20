"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Plus, X, Save, RefreshCw, ChevronDown, ChevronUp, List } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { dropdownAPI, DropdownOption, DropdownCategoryType } from "@/lib/dropdownAPI"
import { TokenManager } from "@/lib/tokenManager"

interface DropdownSettingsManagerProps {
  category: DropdownCategoryType
  title: string
  description?: string
}

export function DropdownSettingsManager({ category, title, description }: DropdownSettingsManagerProps) {
  const { toast } = useToast()
  const [isExpanded, setIsExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [options, setOptions] = useState<DropdownOption[]>([])
  const [newOption, setNewOption] = useState({ value: "", label: "" })
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    if (isExpanded) {
      loadOptions()
    }
  }, [isExpanded, category])

  const loadOptions = async () => {
    setLoading(true)
    try {
      const token = TokenManager.getToken()
      if (!token) {
        const defaultOptions = dropdownAPI.getDefaultOptions(category)
        setOptions(defaultOptions)
        setLoading(false)
        return
      }

      try {
        const fetchedOptions = await dropdownAPI.getCategoryOptions(category, token)
        console.log('Fetched options for', category, ':', fetchedOptions)
        console.log('Number of options:', fetchedOptions?.length || 0)
        setOptions(fetchedOptions)
      } catch (error) {
        console.log(`Using default options for ${category}`)
        const defaultOptions = dropdownAPI.getDefaultOptions(category)
        setOptions(defaultOptions)
      }
    } catch (error) {
      console.error(`Error loading ${category} options:`, error)
      toast({
        title: "Error",
        description: `Failed to load ${title.toLowerCase()}`,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddOption = () => {
    if (!newOption.value.trim() || !newOption.label.trim()) {
      toast({
        title: "Validation Error",
        description: "Both value and label are required",
        variant: "destructive"
      })
      return
    }

    if (options.some(opt => opt.value === newOption.value)) {
      toast({
        title: "Duplicate Value",
        description: "An option with this value already exists",
        variant: "destructive"
      })
      return
    }

    const option: DropdownOption = { ...newOption, is_active: true, order: options.length + 1 }
    setOptions([...options, option])
    setNewOption({ value: "", label: "" })
    setHasChanges(true)
  }

  const handleRemoveOption = (value: string) => {
    setOptions(options.filter(opt => opt.value !== value))
    setHasChanges(true)
  }

  const handleToggleActive = (value: string) => {
    setOptions(options.map(opt => opt.value === value ? { ...opt, is_active: !opt.is_active } : opt))
    setHasChanges(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const token = TokenManager.getToken()
      if (!token) {
        toast({ title: "Authentication Required", description: "Please login to save changes", variant: "destructive" })
        return
      }
      await dropdownAPI.updateCategoryOptions(category, options, token)
      console.log(`Saving ${category} with ${options.length} options:`, options)
      console.log(`Using token: ${token.substring(0, 20)}...`)
      toast({ title: "Success", description: `${title} updated successfully` })
      setHasChanges(false)
    } catch (error) {
      console.error(`Error saving ${category} options:`, error)
      toast({ title: "Error", description: `Failed to save ${title.toLowerCase()}`, variant: "destructive" })
      console.error("Error details:", error instanceof Error ? error.message : JSON.stringify(error))
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    if (!confirm(`Are you sure you want to reset ${title.toLowerCase()} to default values?`)) return
    
    setLoading(true)
    try {
      const token = TokenManager.getToken()
      if (token) {
        const resetData = await dropdownAPI.resetCategory(category, token)
        setOptions(resetData.options)
      } else {
        const defaultOptions = dropdownAPI.getDefaultOptions(category)
        setOptions(defaultOptions)
      }
      toast({ title: "Reset Complete", description: `${title} reset to default values` })
      setHasChanges(false)
    } catch (error) {
      console.error(`Error resetting ${category}:`, error)
      toast({ title: "Error", description: `Failed to reset ${title.toLowerCase()}`, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const moveOption = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return
    if (direction === "down" && index === options.length - 1) return

    const newOptions = [...options]
    const targetIndex = direction === "up" ? index - 1 : index + 1
    ;[newOptions[index], newOptions[targetIndex]] = [newOptions[targetIndex], newOptions[index]]
    newOptions.forEach((opt, idx) => { opt.order = idx + 1 })
    setOptions(newOptions)
    setHasChanges(true)
  }

  return (
    <Card>
      <CardHeader className="cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <List className="w-5 h-5" />
            <div>
              <div className="text-base">{title}</div>
              {description && <p className="text-sm font-normal text-gray-600 mt-1">{description}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{options.length} options</Badge>
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </CardTitle>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600"></div>
            </div>
          ) : (
            <>
              <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
                <Label className="text-sm font-medium">Add New Option</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input placeholder="Value" value={newOption.value} onChange={(e) => setNewOption({ ...newOption, value: e.target.value })} />
                  <Input placeholder="Label" value={newOption.label} onChange={(e) => setNewOption({ ...newOption, label: e.target.value })} />
                  <Button onClick={handleAddOption} className="">
                    <Plus className="w-4 h-4 mr-2" />Add Option
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Current Options</Label>
                {options.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No options available</p>
                ) : (
                  <div className="space-y-2">
                    {options.map((option, index) => (
                      <div key={option.value} className={`flex items-center gap-3 p-3 border rounded-lg ${option.is_active ? "bg-white" : "bg-gray-50"}`}>
                        <div className="flex flex-col gap-1">
                          <button onClick={() => moveOption(index, "up")} disabled={index === 0} className="p-1 hover:bg-gray-100 rounded disabled:opacity-30">
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button onClick={() => moveOption(index, "down")} disabled={index === options.length - 1} className="p-1 hover:bg-gray-100 rounded disabled:opacity-30">
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-xs text-gray-500">Value:</span>
                            <p className="text-sm font-medium">{option.value}</p>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500">Label:</span>
                            <p className="text-sm">{option.label}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-gray-500">Active</Label>
                          <Switch checked={option.is_active} onCheckedChange={() => handleToggleActive(option.value)} />
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => handleRemoveOption(option.value)} className="hover:bg-red-50 hover:text-red-600">
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {hasChanges && (
                <div className="flex gap-2 pt-4 border-t">
                  <Button onClick={handleReset} variant="outline" disabled={saving}>
                    <RefreshCw className="w-4 h-4 mr-2" />Reset to Defaults
                  </Button>
                  <Button onClick={handleSave} disabled={saving} className="">
                    <Save className="w-4 h-4 mr-2" />{saving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      )}
    </Card>
  )
}
