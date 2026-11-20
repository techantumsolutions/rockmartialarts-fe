"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { searchAPI } from "@/lib/searchAPI"

export default function TestSearchPage() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async () => {
    if (!query || query.length < 2) {
      setError("Query must be at least 2 characters")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem("token")
      if (!token) {
        setError("No authentication token found. Please login first.")
        return
      }

      const response = await searchAPI.globalSearch(query, token, { limit: 10 })
      setResults(response)
    } catch (err: any) {
      setError(err.message || "Search failed")
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Search API Test Page</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-2">
              <Input
                placeholder="Enter search query (min 2 characters)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1"
              />
              <Button 
                onClick={handleSearch} 
                disabled={loading || query.length < 2}
              >
                {loading ? "Searching..." : "Search"}
              </Button>
            </div>

            {error && (
              <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                Error: {error}
              </div>
            )}

            {results && (
              <div className="space-y-4">
                <div className="p-4 bg-green-100 border border-green-400 text-green-700 rounded">
                  <strong>Search Results for "{results.query}"</strong>
                  <br />
                  Total Results: {results.total_results}
                </div>

                {Object.entries(results.results).map(([category, data]: [string, any]) => (
                  <Card key={category}>
                    <CardHeader>
                      <CardTitle className="text-lg capitalize">
                        {category} ({data.count} results)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {data.count === 0 ? (
                        <p className="text-gray-500">No results found</p>
                      ) : (
                        <div className="space-y-2">
                          {data.data.slice(0, 3).map((item: any, index: number) => (
                            <div key={index} className="p-3 bg-gray-50 rounded border">
                              <div className="font-medium">
                                {category === 'users' && (item.full_name || item.email)}
                                {category === 'coaches' && item.full_name}
                                {category === 'courses' && item.name}
                                {category === 'branches' && (item.branch?.name || 'Academy')}
                              </div>
                              <div className="text-sm text-gray-600">
                                {category === 'users' && `${item.email} - ${item.role}`}
                                {category === 'coaches' && item.contact_info?.email}
                                {category === 'courses' && item.difficulty_level}
                                {category === 'branches' && item.branch?.address?.city}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                ID: {item.id}
                              </div>
                            </div>
                          ))}
                          {data.count > 3 && (
                            <p className="text-sm text-gray-500">
                              ... and {data.count - 3} more results
                            </p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
