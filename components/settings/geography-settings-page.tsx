"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, MapPin, Pencil, Plus, Search } from "lucide-react"
import DashboardHeader from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { TokenManager } from "@/lib/tokenManager"
import { useDashboardBasePath } from "@/lib/useDashboardBasePath"
import { geographyAPI, type GeoCity, type GeoState } from "@/lib/geographyAPI"

function sortByName<T extends { name?: string }>(items: T[]): T[] {
  return [...items].sort((a, b) =>
    (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" })
  )
}

export default function GeographySettingsPage() {
  const router = useRouter()
  const basePath = useDashboardBasePath()
  const { toast } = useToast()

  const [tab, setTab] = useState("states")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [states, setStates] = useState<GeoState[]>([])
  const [cities, setCities] = useState<GeoCity[]>([])

  const [newState, setNewState] = useState({ name: "", code: "" })
  const [newCity, setNewCity] = useState({ name: "", state_id: "", code: "" })
  const [editingStateId, setEditingStateId] = useState<string | null>(null)
  const [editingCityId, setEditingCityId] = useState<string | null>(null)
  const [editState, setEditState] = useState({ name: "", code: "" })
  const [editCity, setEditCity] = useState({ name: "", state_id: "", code: "" })

  const token = () => TokenManager.getToken()

  const loadData = async () => {
    const auth = token()
    if (!auth) {
      toast({ title: "Please sign in", description: "Login is required to manage geography.", variant: "destructive" })
      return
    }
    setLoading(true)
    try {
      const [statesRes, citiesRes] = await Promise.all([
        geographyAPI.getStates(auth, { active_only: false, search: search || undefined }),
        geographyAPI.getCities(auth, { active_only: false, search: search || undefined }),
      ])
      setStates(sortByName(statesRes.states || []))
      setCities(sortByName(citiesRes.cities || []))
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load geography data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filteredStates = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = !q
      ? states
      : states.filter((s) => s.name.toLowerCase().includes(q) || (s.code || "").toLowerCase().includes(q))
    return sortByName(list)
  }, [states, search])

  const filteredCities = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = !q
      ? cities
      : cities.filter((c) =>
          c.name.toLowerCase().includes(q) ||
          (c.state_name || c.state || "").toLowerCase().includes(q) ||
          (c.code || "").toLowerCase().includes(q)
        )
    return sortByName(list)
  }, [cities, search])

  const handleCreateState = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = newState.name.trim()
    if (!name) {
      toast({ title: "Validation", description: "State name is required.", variant: "destructive" })
      return
    }
    const auth = token()
    if (!auth) return
    setSaving(true)
    try {
      await geographyAPI.createState(auth, {
        name,
        code: newState.code.trim() || undefined,
        is_active: true,
      })
      toast({ title: "State created", description: `${name} is now available in dropdowns.` })
      setNewState({ name: "", code: "" })
      await loadData()
    } catch (error) {
      toast({
        title: "Could not create state",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleCreateCity = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = newCity.name.trim()
    if (!name) {
      toast({ title: "Validation", description: "City name is required.", variant: "destructive" })
      return
    }
    if (!newCity.state_id) {
      toast({ title: "Validation", description: "Please select a parent state.", variant: "destructive" })
      return
    }
    const auth = token()
    if (!auth) return
    setSaving(true)
    try {
      await geographyAPI.createCity(auth, {
        name,
        state_id: newCity.state_id,
        code: newCity.code.trim() || undefined,
        is_active: true,
      })
      toast({ title: "City created", description: `${name} is now available in dropdowns.` })
      setNewCity({ name: "", state_id: newCity.state_id, code: "" })
      await loadData()
    } catch (error) {
      toast({
        title: "Could not create city",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const toggleState = async (state: GeoState) => {
    const auth = token()
    if (!auth) return
    try {
      await geographyAPI.updateState(auth, state.id, { is_active: !state.is_active })
      await loadData()
    } catch (error) {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Could not update state status.",
        variant: "destructive",
      })
    }
  }

  const toggleCity = async (city: GeoCity) => {
    const auth = token()
    if (!auth) return
    try {
      await geographyAPI.updateCity(auth, city.id, { is_active: !city.is_active })
      await loadData()
    } catch (error) {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Could not update city status.",
        variant: "destructive",
      })
    }
  }

  const saveStateEdit = async () => {
    if (!editingStateId) return
    const name = editState.name.trim()
    if (!name) {
      toast({ title: "Validation", description: "State name is required.", variant: "destructive" })
      return
    }
    const auth = token()
    if (!auth) return
    setSaving(true)
    try {
      await geographyAPI.updateState(auth, editingStateId, {
        name,
        code: editState.code.trim() || undefined,
      })
      setEditingStateId(null)
      await loadData()
      toast({ title: "State updated" })
    } catch (error) {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Could not update state.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const saveCityEdit = async () => {
    if (!editingCityId) return
    const name = editCity.name.trim()
    if (!name) {
      toast({ title: "Validation", description: "City name is required.", variant: "destructive" })
      return
    }
    if (!editCity.state_id) {
      toast({ title: "Validation", description: "Please select a parent state.", variant: "destructive" })
      return
    }
    const auth = token()
    if (!auth) return
    setSaving(true)
    try {
      await geographyAPI.updateCity(auth, editingCityId, {
        name,
        state_id: editCity.state_id,
        code: editCity.code.trim() || undefined,
      })
      setEditingCityId(null)
      await loadData()
      toast({ title: "City updated" })
    } catch (error) {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Could not update city.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader currentPage="Geography" />
      <main className="w-full p-4 lg:px-8">
        <div className="mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => router.push(`${basePath}/settings`)}
                className="flex items-center space-x-2 hover:bg-gray-100"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-[#4F5077]">Back to Settings</span>
              </Button>
              <div className="w-px h-6 bg-gray-300"></div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <MapPin className="w-6 h-6" />
                  State & City
                </h1>
                <p className="text-gray-600 mt-1">
                  Manage states and cities used in branch, registration, and student forms.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              Create a state first, then add cities under it. Inactive records stay in admin but are hidden from public dropdowns.
            </p>
          </div>

          <div className="relative max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search states or cities"
              className="pl-9"
            />
          </div>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="states">States</TabsTrigger>
              <TabsTrigger value="cities">Cities</TabsTrigger>
            </TabsList>

            <TabsContent value="states">
              <Card>
                <CardHeader>
                  <CardTitle>States</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <form onSubmit={handleCreateState} className="space-y-4 p-4 border rounded-lg bg-muted/30">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      Add state
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="state-name">Name *</Label>
                        <Input id="state-name" value={newState.name} onChange={(e) => setNewState({ ...newState, name: e.target.value })} placeholder="Enter state name" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state-code">Code</Label>
                        <Input id="state-code" value={newState.code} onChange={(e) => setNewState({ ...newState, code: e.target.value })} placeholder="Enter state code" />
                      </div>
                    </div>
                    <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save state"}</Button>
                  </form>

                  {loading ? (
                    <p className="text-sm text-muted-foreground">Loading…</p>
                  ) : filteredStates.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No states yet. Add one above.</p>
                  ) : (
                    <ul className="space-y-2">
                      {filteredStates.map((state) => (
                        <li key={state.id} className="py-2 px-3 rounded-md border bg-background text-sm">
                          {editingStateId === state.id ? (
                            <div className="space-y-2">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <Input value={editState.name} onChange={(e) => setEditState({ ...editState, name: e.target.value })} placeholder="Enter state name" />
                                <Input value={editState.code} onChange={(e) => setEditState({ ...editState, code: e.target.value })} placeholder="Enter state code" />
                              </div>
                              <div className="flex gap-2">
                                <Button type="button" size="sm" onClick={saveStateEdit} disabled={saving}>Save</Button>
                                <Button type="button" size="sm" variant="outline" onClick={() => setEditingStateId(null)}>Cancel</Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium">{state.name}</span>
                                <span className="text-muted-foreground">({state.code})</span>
                                <Badge variant={state.is_active ? "default" : "secondary"}>
                                  {state.is_active ? "Active" : "Inactive"}
                                </Badge>
                                <span className="text-muted-foreground">{state.city_count || 0} cities</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <Switch checked={state.is_active} onCheckedChange={() => toggleState(state)} />
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingStateId(state.id)
                                    setEditState({
                                      name: state.name,
                                      code: state.code || "",
                                    })
                                  }}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="cities">
              <Card>
                <CardHeader>
                  <CardTitle>Cities</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <form onSubmit={handleCreateCity} className="space-y-4 p-4 border rounded-lg bg-muted/30">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      Add city
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>State *</Label>
                        <Select value={newCity.state_id} onValueChange={(value) => setNewCity({ ...newCity, state_id: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select state" />
                          </SelectTrigger>
                          <SelectContent>
                            {sortByName(states.filter((s) => s.is_active)).map((state) => (
                              <SelectItem key={state.id} value={state.id}>{state.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="city-name">Name *</Label>
                        <Input id="city-name" value={newCity.name} onChange={(e) => setNewCity({ ...newCity, name: e.target.value })} placeholder="Enter city name" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="city-code">Code</Label>
                        <Input id="city-code" value={newCity.code} onChange={(e) => setNewCity({ ...newCity, code: e.target.value })} placeholder="Enter city code" />
                      </div>
                    </div>
                    <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save city"}</Button>
                  </form>

                  {loading ? (
                    <p className="text-sm text-muted-foreground">Loading…</p>
                  ) : filteredCities.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No cities yet. Select a state and add a city.</p>
                  ) : (
                    <ul className="space-y-2">
                      {filteredCities.map((city) => (
                        <li key={city.id} className="py-2 px-3 rounded-md border bg-background text-sm">
                          {editingCityId === city.id ? (
                            <div className="space-y-2">
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                <Select value={editCity.state_id} onValueChange={(value) => setEditCity({ ...editCity, state_id: value })}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select state" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {sortByName(states.filter((s) => s.is_active || s.id === editCity.state_id)).map((state) => (
                                      <SelectItem key={state.id} value={state.id}>{state.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Input value={editCity.name} onChange={(e) => setEditCity({ ...editCity, name: e.target.value })} placeholder="Enter city name" />
                                <Input value={editCity.code} onChange={(e) => setEditCity({ ...editCity, code: e.target.value })} placeholder="Enter city code" />
                              </div>
                              <div className="flex gap-2">
                                <Button type="button" size="sm" onClick={saveCityEdit} disabled={saving}>Save</Button>
                                <Button type="button" size="sm" variant="outline" onClick={() => setEditingCityId(null)}>Cancel</Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium">{city.name}</span>
                                <span className="text-muted-foreground">
                                  {city.state_name || city.state || "No state"}{city.code ? ` — ${city.code}` : ""}
                                </span>
                                <Badge variant={city.is_active ? "default" : "secondary"}>
                                  {city.is_active ? "Active" : "Inactive"}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3">
                                <Switch checked={city.is_active} onCheckedChange={() => toggleCity(city)} />
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingCityId(city.id)
                                    setEditCity({
                                      name: city.name,
                                      state_id: city.state_id || "",
                                      code: city.code || "",
                                    })
                                  }}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
