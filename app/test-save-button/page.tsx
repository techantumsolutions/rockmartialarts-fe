"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { CheckCircle, Loader2 } from "lucide-react"

export default function TestSaveButtonPage() {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [bulkSaving, setBulkSaving] = useState(false)

  const handleBulkSave = async () => {
    setBulkSaving(true)
    // Simulate save operation
    await new Promise(resolve => setTimeout(resolve, 2000))
    setBulkSaving(false)
    setHasUnsavedChanges(false)
    alert("Save completed!")
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Save Button Test Page</h1>
        
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold mb-4">State Controls</h2>
          <div className="flex space-x-4">
            <Button 
              onClick={() => setHasUnsavedChanges(!hasUnsavedChanges)}
              variant="outline"
            >
              Toggle Unsaved Changes ({hasUnsavedChanges ? 'ON' : 'OFF'})
            </Button>
            
            <Button 
              onClick={() => setBulkSaving(!bulkSaving)}
              variant="outline"
            >
              Toggle Saving State ({bulkSaving ? 'ON' : 'OFF'})
            </Button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Save Button Tests</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">1. Conditional Button (should only show when hasUnsavedChanges = true)</h3>
              <div className="flex space-x-2">
                {hasUnsavedChanges && (
                  <Button 
                    onClick={handleBulkSave} 
                    disabled={bulkSaving}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {bulkSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Save All Changes
                      </>
                    )}
                  </Button>
                )}
                {!hasUnsavedChanges && (
                  <p className="text-gray-500 italic">Button hidden (no unsaved changes)</p>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-2">2. Always Visible Button (for comparison)</h3>
              <Button 
                onClick={handleBulkSave} 
                disabled={bulkSaving}
                className="text-white"
              >
                {bulkSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Always Visible Save Button
                  </>
                )}
              </Button>
            </div>

            <div>
              <h3 className="font-medium mb-2">3. State Display</h3>
              <div className="bg-gray-100 p-3 rounded">
                <p><strong>hasUnsavedChanges:</strong> {hasUnsavedChanges.toString()}</p>
                <p><strong>bulkSaving:</strong> {bulkSaving.toString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
