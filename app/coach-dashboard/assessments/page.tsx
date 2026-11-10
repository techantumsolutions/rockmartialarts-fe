"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  ClipboardList,
  Users, 
  Star,
  Plus,
  Edit,
  Eye,
  Search,
  Filter,
  Loader2,
  Award,
  TrendingUp,
  Calendar
} from "lucide-react"
import CoachDashboardHeader from "@/components/coach-dashboard-header"
import { checkCoachAuth } from "@/lib/coachAuth"
import { kpiAssessmentAPI, AssessmentRow } from "@/lib/kpiAssessmentAPI"

interface Assessment {
  id: string
  student_name: string
  student_id: string
  course_name: string
  course_id: string
  assessment_type: "skill" | "technique" | "progress" | "belt_test"
  title: string
  description: string
  score: number
  max_score: number
  grade: string
  date: string
  status: "completed" | "pending" | "in_progress"
  notes?: string
  skills_assessed: string[]
}

interface AssessmentStats {
  total_assessments: number
  completed_assessments: number
  pending_assessments: number
  average_score: number
  students_assessed: number
}

export default function CoachAssessmentsPage() {
  const router = useRouter()
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [filteredAssessments, setFilteredAssessments] = useState<Assessment[]>([])
  const [assessmentStats, setAssessmentStats] = useState<AssessmentStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [coachData, setCoachData] = useState<any>(null)
  const [activeTab, setActiveTab] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<string>("all")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  // New assessment form state
  const [newAssessment, setNewAssessment] = useState({
    student_id: "",
    course_id: "",
    assessment_type: "",
    title: "",
    description: "",
    max_score: 100
  })

  useEffect(() => {
    // Use the robust coach authentication check
    const authResult = checkCoachAuth()

    if (!authResult.isAuthenticated) {
      console.log("Coach not authenticated:", authResult.error)
      router.push("/coach/login")
      return
    }

    if (authResult.coach && authResult.token) {
      setCoachData(authResult.coach)
      fetchAssessmentData(authResult.token, authResult.coach.id)
    } else {
      setError("Coach information not found")
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    // Filter assessments based on search term and filter type
    let filtered = assessments

    if (searchTerm) {
      filtered = filtered.filter(assessment =>
        assessment.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        assessment.course_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        assessment.title.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (filterType !== "all") {
      filtered = filtered.filter(assessment => assessment.assessment_type === filterType)
    }

    if (activeTab !== "all") {
      filtered = filtered.filter(assessment => assessment.status === activeTab)
    }

    setFilteredAssessments(filtered)
  }, [searchTerm, filterType, activeTab, assessments])

  const mapKpiRowsToAssessments = (
    rows: AssessmentRow[],
    coachId: string
  ): Assessment[] => {
    const coachRows = rows.filter((row) => {
      const evaluatorId = (row as AssessmentRow & { evaluator_id?: string })
        .evaluator_id
      return !evaluatorId || evaluatorId === coachId
    })

    return coachRows.map((row) => {
      const maxScore = row.max_score || 100
      const score = row.raw_score ?? 0
      const completed = Boolean(row.evaluated_at)
      const normalized =
        row.normalized_score ??
        (maxScore > 0 ? (score / maxScore) * 100 : 0)

      return {
        id: row.id,
        student_name: row.student_id,
        student_id: row.student_id,
        course_name: row.course_id,
        course_id: row.course_id,
        assessment_type: "progress",
        title: row.kpi_name || row.kpi_code || "KPI assessment",
        description: row.notes || "",
        score,
        max_score: maxScore,
        grade: completed ? `${Math.round(normalized)}%` : "Pending",
        date: row.evaluated_at || "",
        status: completed ? "completed" : "pending",
        notes: row.notes || undefined,
        skills_assessed: row.kpi_name ? [row.kpi_name] : [],
      }
    })
  }

  const buildStats = (items: Assessment[]): AssessmentStats => {
    const completed = items.filter((a) => a.status === "completed")
    const pending = items.filter((a) => a.status === "pending")
    const average =
      completed.length > 0
        ? completed.reduce(
            (sum, item) =>
              sum + (item.max_score > 0 ? (item.score / item.max_score) * 100 : 0),
            0
          ) / completed.length
        : 0

    return {
      total_assessments: items.length,
      completed_assessments: completed.length,
      pending_assessments: pending.length,
      average_score: Math.round(average * 10) / 10,
      students_assessed: new Set(items.map((a) => a.student_id)).size,
    }
  }

  const fetchAssessmentData = async (_token: string, coachId: string) => {
    try {
      setLoading(true)
      setError(null)

      const { assessments: rows } = await kpiAssessmentAPI.listAssessments({})

      const mapped = mapKpiRowsToAssessments(rows || [], coachId)
      setAssessments(mapped)
      setFilteredAssessments(mapped)
      setAssessmentStats(buildStats(mapped))
    } catch (error) {
      console.error("Error fetching assessment data:", error)
      setError(
        error instanceof Error ? error.message : "Failed to load assessment data"
      )
      setAssessments([])
      setFilteredAssessments([])
      setAssessmentStats(buildStats([]))
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
      case "in_progress":
        return <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getGradeBadge = (grade: string, score: number) => {
    if (grade === "Pending") {
      return <Badge variant="outline">Pending</Badge>
    }
    
    const color = score >= 90 ? "bg-green-100 text-green-800" :
                  score >= 80 ? "bg-blue-100 text-blue-800" :
                  score >= 70 ? "bg-yellow-100 text-yellow-800" :
                  "bg-red-100 text-red-800"
    
    return <Badge className={color}>{grade}</Badge>
  }

  const handleCreateAssessment = () => {
    // Implement create assessment functionality
    console.log("Creating assessment:", newAssessment)
    setIsCreateDialogOpen(false)
    // Reset form
    setNewAssessment({
      student_id: "",
      course_id: "",
      assessment_type: "",
      title: "",
      description: "",
      max_score: 100
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <CoachDashboardHeader 
          currentPage="Assessments"
          coachName={coachData?.full_name || "Coach"}
        />
        <main className="mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-yellow-600" />
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (error && !loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <CoachDashboardHeader 
          currentPage="Assessments"
          coachName={coachData?.full_name || "Coach"}
        />
        <main className="mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-red-600">
                  <p className="font-medium">Error loading assessments</p>
                  <p className="text-sm mt-1">{error}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    )
  }

  const stats = assessmentStats ?? buildStats([])

  return (
    <div className="min-h-screen bg-gray-50">
      <CoachDashboardHeader 
        currentPage="Assessments"
        coachName={coachData?.full_name || "Coach"}
      />
      
      <main className="mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Student Assessments</h1>
              <p className="text-gray-600">Evaluate and track student progress</p>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-yellow-600 hover:bg-yellow-700">
                  <Plus className="w-4 h-4 mr-2" />
                  New Assessment
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Create New Assessment</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <label htmlFor="title">Assessment Title</label>
                    <Input
                      id="title"
                      value={newAssessment.title}
                      onChange={(e) => setNewAssessment({...newAssessment, title: e.target.value})}
                      placeholder="Enter assessment title"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="type">Assessment Type</label>
                    <Select value={newAssessment.assessment_type} onValueChange={(value) => setNewAssessment({...newAssessment, assessment_type: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="skill">Skill Assessment</SelectItem>
                        <SelectItem value="technique">Technique Assessment</SelectItem>
                        <SelectItem value="progress">Progress Review</SelectItem>
                        <SelectItem value="belt_test">Belt Test</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="description">Description</label>
                    <Textarea
                      id="description"
                      value={newAssessment.description}
                      onChange={(e) => setNewAssessment({...newAssessment, description: e.target.value})}
                      placeholder="Enter assessment description"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="max_score">Maximum Score</label>
                    <Input
                      id="max_score"
                      type="number"
                      value={newAssessment.max_score}
                      onChange={(e) => setNewAssessment({...newAssessment, max_score: parseInt(e.target.value)})}
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateAssessment}>
                    Create Assessment
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <ClipboardList className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Assessments</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total_assessments}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Award className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Completed</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.completed_assessments}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Calendar className="h-8 w-8 text-yellow-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Pending</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.pending_assessments}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <TrendingUp className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Average Score</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.average_score}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-red-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Students Assessed</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.students_assessed}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filters */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search assessments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="skill">Skill Assessment</SelectItem>
                  <SelectItem value="technique">Technique Assessment</SelectItem>
                  <SelectItem value="progress">Progress Review</SelectItem>
                  <SelectItem value="belt_test">Belt Test</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All Assessments</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="in_progress">In Progress</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-6">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {filteredAssessments.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <ClipboardList className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No assessments found</h3>
                        <p className="mt-1 text-sm text-gray-500">
                          {searchTerm || filterType !== "all" ? "No assessments match your search criteria." : "No assessments have been created yet."}
                        </p>
                      </div>
                    ) : (
                      filteredAssessments.map((assessment) => (
                        <div key={assessment.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-medium text-gray-900">{assessment.title}</h3>
                                <p className="text-sm text-gray-600">{assessment.student_name} - {assessment.course_name}</p>
                                <p className="text-sm text-gray-500 mt-1">{assessment.description}</p>
                                <div className="flex items-center space-x-4 mt-2">
                                  <span className="text-xs text-gray-500">
                                    {new Date(assessment.date).toLocaleDateString()}
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {assessment.assessment_type.replace('_', ' ').toUpperCase()}
                                  </Badge>
                                  {assessment.skills_assessed.length > 0 && (
                                    <span className="text-xs text-gray-500">
                                      Skills: {assessment.skills_assessed.join(', ')}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center space-x-4 ml-4">
                                {assessment.status === "completed" && (
                                  <div className="text-center">
                                    <p className="text-sm font-medium">{assessment.score}/{assessment.max_score}</p>
                                    {getGradeBadge(assessment.grade, assessment.score)}
                                  </div>
                                )}
                                {getStatusBadge(assessment.status)}
                                <div className="flex space-x-1">
                                  <Button size="sm" variant="ghost">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button size="sm" variant="ghost">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
