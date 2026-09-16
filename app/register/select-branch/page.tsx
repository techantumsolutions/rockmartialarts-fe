"use client"

import type React from "react"
import { getBackendApiUrl } from "@/lib/config"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRegistration } from "@/contexts/RegistrationContext"
import { useCMS } from "@/contexts/CMSContext"
import { useToast } from "@/hooks/use-toast"
import { useGeographyDropdowns } from "@/hooks/use-geography-dropdowns"
import { branchMatchesLocation } from "@/lib/branchMatchesLocation"

interface Branch {
  id: string
  name: string
  code: string
  location_id?: string
  address: {
    area?: string
    city: string
    state: string
  }
}

export default function SelectBranchPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { registrationData, updateRegistrationData } = useRegistration()
  const { cms } = useCMS()

  const [branch_id, setBranchId] = useState(registrationData.branch_id || "")
  const [allBranches, setAllBranches] = useState<Branch[]>([])
  const [filteredBranches, setFilteredBranches] = useState<Branch[]>([])
  const [selectedLocation, setSelectedLocation] = useState("")
  const geography = useGeographyDropdowns()
  const [isLoadingBranches, setIsLoadingBranches] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const isLoadingLocations = geography.isLoading

  // Fetch branches directly from backend API
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        setIsLoadingBranches(true)
        setError(null)

        // Try backend API directly - get all branches
        const response = await fetch(getBackendApiUrl('branches/public/all'))

        if (!response.ok) {
          throw new Error('Failed to fetch branches')
        }

        const data = await response.json()
        
        // Transform backend response to our format
        const branches = (data.branches || []).map((branch: any) => ({
          id: branch.id,
          name: branch.branch?.name || branch.name,
          code: branch.branch?.code || branch.code || '',
          location_id: branch.location_id || '',
          address: {
            area: branch.branch?.address?.area || branch.address?.area || '',
            city: branch.branch?.address?.city || branch.address?.city || '',
            state: branch.branch?.address?.state || branch.address?.state || ''
          }
        }))
        
        setAllBranches(branches)
        // Initially, don't show branches until a location is selected
        setFilteredBranches([])

        console.log(`Loaded ${branches.length} branches`)

      } catch (err) {
        console.error('Error fetching branches:', err)
        setError('Failed to load branches.')
        toast({
          title: "Error",
          description: "Failed to load branches.",
          variant: "destructive",
        })
      } finally {
        setIsLoadingBranches(false)
      }
    }

    fetchBranches()
  }, [toast])

  // Filter branches when location changes
  useEffect(() => {
    if (!selectedLocation) {
      setFilteredBranches([])
      setBranchId("")
    } else if (selectedLocation === 'all') {
      if (geography.selectedStateId) {
        setFilteredBranches(allBranches.filter((branch) =>
          geography.cities.some((city) => branchMatchesLocation(branch, city, city.id))
        ))
      } else {
        setFilteredBranches(allBranches)
      }
    } else {
      const selectedCity = geography.allCities.find((c) => c.id === selectedLocation)
      const filtered = allBranches.filter((branch) =>
        branchMatchesLocation(branch, selectedCity, selectedLocation)
      )
      setFilteredBranches(filtered)
      
      if (branch_id && !filtered.find(b => b.id === branch_id)) {
        setBranchId("")
      }
    }
  }, [selectedLocation, allBranches, branch_id, geography.selectedStateId, geography.states, geography.cities, geography.allCities])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleContinue()
  }

  const handleContinue = () => {
    const newErrors: Record<string, string> = {}
    if (!selectedLocation) {
      newErrors.location = "Please select a location"
    }
    if (!branch_id) {
      newErrors.branch = "Please select a branch to continue"
    }
    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors)
      return
    }
    setFieldErrors({})

    const selectedBranch = filteredBranches.find(branch => branch.id === branch_id)

    updateRegistrationData({
      branch_id,
      branch_name: selectedBranch?.name || "",
      selected_location: selectedLocation,
      branch_details: selectedBranch
        ? {
            name: selectedBranch.name,
            address: {
              ...selectedBranch.address,
              area: selectedBranch.address?.area,
              city: selectedBranch.address?.city,
              state: selectedBranch.address?.state,
            },
          }
        : null
    })

    router.push("/register/select-course")
  }

  const registrationMediaUrl = cms?.homepage?.registration_media_url
  const registrationMediaType = cms?.homepage?.registration_media_type || "auto"

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gray-200 items-center justify-center relative overflow-hidden">
        <div className="w-[300px] h-[550px] bg-cover bg-center bg-no-repeat overflow-hidden rounded-xl">
          {registrationMediaUrl ? (
            registrationMediaType === "video" || /\.(mp4|webm)$/i.test(registrationMediaUrl) ? (
              <video
                src={registrationMediaUrl}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                src={registrationMediaUrl}
                alt="Registration"
                className="w-full h-full object-cover"
              />
            )
          ) : (
            <div
              className="w-full h-full bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: "url('/images/select-branch-left.png')" }}
            />
          )}
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-3">
            <h1 className="text-3xl font-bold text-black">Branch Details</h1>
            <p className="text-gray-500 text-sm">Select your preferred location and branch to continue.</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {geography.hasStates && (
              <div>
                <Select
                  value={geography.selectedStateId}
                  onValueChange={(value) => {
                    geography.setSelectedStateId(value)
                    setSelectedLocation("")
                    setBranchId("")
                    if (fieldErrors.location) setFieldErrors(prev => ({ ...prev, location: '' }))
                  }}
                  disabled={isLoadingLocations}
                >
                  <SelectTrigger className={`!w-full !h-14 !pl-6 !pr-10 !py-4 !text-[14px] bg-[#F9F8FF] !border-0 !rounded-xl data-[placeholder]:text-black focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent !min-h-14 ${fieldErrors.location ? '!border !border-red-500' : ''}`}>
                    <SelectValue placeholder={isLoadingLocations ? "Loading locations..." : "Select State"} className="text-gray-500" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border border-gray-200 bg-white shadow-lg max-h-60">
                    {geography.states.map((state) => (
                      <SelectItem key={state.id} value={state.id} className="!py-3 !pl-3 pr-8 text-base hover:bg-gray-50 rounded-lg cursor-pointer">
                        {state.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Select
                value={selectedLocation}
                onValueChange={(value) => {
                  setSelectedLocation(value)
                  if (value !== "all") geography.setSelectedCityId(value)
                  if (fieldErrors.location) setFieldErrors(prev => ({ ...prev, location: '' }))
                }}
                disabled={isLoadingLocations || (geography.hasStates && !geography.selectedStateId)}
              >
                <SelectTrigger className={`!w-full !h-14 !pl-6 !pr-10 !py-4 !text-[14px] bg-[#F9F8FF] !border-0 !rounded-xl data-[placeholder]:text-black focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent !min-h-14 ${fieldErrors.location ? '!border !border-red-500' : ''}`}>
                  <SelectValue placeholder={isLoadingLocations ? "Loading locations..." : geography.hasStates && !geography.selectedStateId ? "Select state first" : "Select Location"} className="text-gray-500" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border border-gray-200 bg-white shadow-lg max-h-60">
                  <SelectItem value="all" className="!py-3 !pl-3 pr-8 text-base hover:bg-gray-50 rounded-lg cursor-pointer">
                    All Locations
                  </SelectItem>
                  {geography.cities.map((location) => (
                    <SelectItem key={location.id} value={location.id} className="!py-3 !pl-3 pr-8 text-base hover:bg-gray-50 rounded-lg cursor-pointer">
                      {location.name} {(location.state_name || location.state) && `(${location.state_name || location.state})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.location && <p className="text-red-500 text-xs mt-1 ml-1">{fieldErrors.location}</p>}
            </div>

            <div>
              <Select
                value={branch_id}
                onValueChange={(value) => {
                  setBranchId(value)
                  if (fieldErrors.branch) setFieldErrors(prev => ({ ...prev, branch: '' }))
                }}
                disabled={isLoadingBranches || !selectedLocation}
              >
                <SelectTrigger className={`!w-full !h-14 !pl-6 !pr-10 !py-4 !text-[14px] bg-[#F9F8FF] !border-0 !rounded-xl data-[placeholder]:text-black focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent !min-h-14 ${fieldErrors.branch ? '!border !border-red-500' : ''}`}>
                  <SelectValue placeholder={
                    !selectedLocation
                      ? "Select location first"
                      : isLoadingBranches
                        ? "Loading branches..."
                        : filteredBranches.length === 0
                          ? "No branches available"
                          : "Select Branch"
                  } className="text-gray-500" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border border-gray-200 bg-white shadow-lg max-h-60">
                  {filteredBranches.length > 0 ? (
                    filteredBranches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id} className="!py-3 !pl-3 pr-8 text-base hover:bg-gray-50 rounded-lg cursor-pointer">
                        <div className="flex flex-col">
                          <span className="font-medium">{branch.name}</span>
                          {(branch.address?.area?.trim() ||
                            branch.address?.city ||
                            branch.address?.state) && (
                            <span className="text-xs text-gray-500">
                              {branch.address.area?.trim() ||
                                [branch.address.city, branch.address.state].filter(Boolean).join(", ")}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-4 text-center text-gray-500">
                      <p className="text-sm">
                        {isLoadingBranches
                          ? "Loading branches..."
                          : "No branches available for selected location"
                        }
                      </p>
                    </div>
                  )}
                </SelectContent>
              </Select>
              {fieldErrors.branch && <p className="text-red-500 text-xs mt-1 ml-1">{fieldErrors.branch}</p>}
            </div>

            <Button
              type="submit"
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-[#ffffff] font-bold py-4 px-6 rounded-xl text-[12px] h-14 transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl mt-8"
            >
              NEXT STEP
            </Button>
          </form>

          <div className="text-center py-4">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Link href="/register" className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-sm cursor-pointer hover:bg-green-600 transition-colors">1</Link>
              <div className="w-8 h-1 bg-green-500 rounded"></div>
              <div className="w-8 h-8 bg-yellow-400 text-black rounded-full flex items-center justify-center font-bold text-sm">2</div>
              <div className="w-8 h-1 bg-gray-200 rounded"></div>
              <div className="w-8 h-8 bg-gray-200 text-gray-400 rounded-full flex items-center justify-center font-bold text-sm">3</div>
              <div className="w-8 h-1 bg-gray-200 rounded"></div>
              <div className="w-8 h-8 bg-gray-200 text-gray-400 rounded-full flex items-center justify-center font-bold text-sm">4</div>
              <div className="w-8 h-1 bg-gray-200 rounded"></div>
              <div className="w-8 h-8 bg-gray-200 text-gray-400 rounded-full flex items-center justify-center font-bold text-sm">5</div>
            </div>
            <span className="text-gray-500 text-sm font-medium">Step 2 of 5 - Branch Selection</span>
          </div>
        </div>
      </div>
    </div>
  )
}
