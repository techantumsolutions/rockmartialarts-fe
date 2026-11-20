"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import DashboardHeader from "@/components/dashboard-header"

export default function CreateBranchPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader currentPage="Create Academy" />

      <main className="w-full p-4 lg:p-6">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => router.push("/dashboard/branches")}
              className="flex items-center space-x-2 hover:bg-gray-100"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Academies</span>
            </Button>
            <div className="w-px h-6 bg-gray-300"></div>
            <h1 className="text-2xl font-bold text-gray-900">Create New Academy</h1>
          </div>
        </div>

        {/* Branch Creation Form */}
        <div className="bg-white rounded-lg shadow-sm p-6">

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Academy Name *</label>
                <input
                  type="text"
                  placeholder="Enter academy name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Academy Code *</label>
                <input
                  type="text"
                  placeholder="Enter academy code"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Email *</label>
                <input
                  type="email"
                  placeholder="Enter academy email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Phone *</label>
                <input
                  type="tel"
                  placeholder="Enter phone number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Address *</label>
              <textarea
                placeholder="Enter complete address"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">City *</label>
                <input
                  type="text"
                  placeholder="Enter city"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">State *</label>
                <input
                  type="text"
                  placeholder="Enter state"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">PIN Code *</label>
                <input
                  type="text"
                  placeholder="Enter PIN code"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Academy Manager</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500">
                <option value="">Select Manager</option>
                <option value="manager1">Ravi Kumar</option>
                <option value="manager2">Priya Sharma</option>
                <option value="manager3">Amit Singh</option>
              </select>
            </div>

            <div className="flex justify-end space-x-4 pt-6 border-t">
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard/branches")}
                className="px-6 py-2"
              >
                Cancel
              </Button>
              <Button
                className=" px-6 py-2"
                onClick={() => {
                  // Handle form submission here
                  console.log("Creating branch...")
                  router.push("/dashboard/branches")
                }}
              >
                Create Branch
              </Button>
            </div>
          </div>
          
        </div>

      </main>
    </div>
  )
}
