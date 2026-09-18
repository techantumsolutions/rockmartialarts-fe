"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { getBackendApiUrl } from "@/lib/config"
import type { StudentPerformanceDashboardPayload } from "@/lib/student-performance-types"
import { ProfileCard } from "@/components/student-dashboard/ProfileCard"
import { AchievementCard } from "@/components/student-dashboard/AchievementCard"
import { SkillPerformance } from "@/components/student-dashboard/SkillPerformance"
import { AttendanceCard } from "@/components/student-dashboard/AttendanceCard"
import { CoachFeedback } from "@/components/student-dashboard/CoachFeedback"
import { FeeStatusCard } from "@/components/student-dashboard/FeeStatusCard"
import { GoalTracker } from "@/components/student-dashboard/GoalTracker"
import { WarriorStats } from "@/components/student-dashboard/WarriorStats"
import { KpiPerformanceSection } from "@/components/student-dashboard/KpiPerformanceSection"
import type { StudentKpiPerformanceMetrics } from "@/lib/student-kpi-metrics-types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Save, Settings2 } from "lucide-react"
import { toast } from "sonner"

function authHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") || localStorage.getItem("access_token") : null
  const h: Record<string, string> = { "Content-Type": "application/json" }
  if (token) h.Authorization = `Bearer ${token}`
  return h
}

async function fetchProfileStudentId(): Promise<string | null> {
  const res = await fetch(getBackendApiUrl("auth/profile"), { headers: authHeaders() })
  if (!res.ok) return null
  const body = await res.json()
  return body?.profile?.id || null
}

export function StudentPerformanceDashboardClient({
  studentId: initialStudentId,
  canEdit,
  backHref,
  title = "Student performance",
}: {
  studentId?: string | null
  canEdit: boolean
  backHref?: string
  title?: string
}) {
  const router = useRouter()
  const [studentId, setStudentId] = useState<string | null>(initialStudentId || null)
  const [data, setData] = useState<StudentPerformanceDashboardPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const [medals, setMedals] = useState({ gold: 0, silver: 0, bronze: 0, comps: 0, certs: 0 })
  const [skills, setSkills] = useState({ strength: "", speed: "", flex: "", tech: "" })
  const [goal, setGoal] = useState({ current: "", belt: "", pct: "" })
  const [fb, setFb] = useState("")
  const [war, setWar] = useState({ streak: "", rank: "", next: "" })
  const [belt, setBelt] = useState("")
  const [kpiMetrics, setKpiMetrics] = useState<StudentKpiPerformanceMetrics | null>(null)
  const [kpiLoading, setKpiLoading] = useState(false)
  const [kpiPeriodId, setKpiPeriodId] = useState("")
  const [kpiCourseId, setKpiCourseId] = useState("")
  const [kpiBoundStudentId, setKpiBoundStudentId] = useState<string | null>(null)
  const kpiPeriodRef = useRef(kpiPeriodId)
  const kpiCourseRef = useRef(kpiCourseId)
  const kpiBoundRef = useRef(kpiBoundStudentId)
  kpiPeriodRef.current = kpiPeriodId
  kpiCourseRef.current = kpiCourseId
  kpiBoundRef.current = kpiBoundStudentId

  useEffect(() => {
    if (initialStudentId) setStudentId(initialStudentId)
  }, [initialStudentId])

  const loadKpiMetrics = useCallback(
    async (sid: string, periodId?: string, courseId?: string) => {
      setKpiLoading(true)
      try {
        const qs = new URLSearchParams()
        if (periodId) qs.set("period_id", periodId)
        if (courseId) qs.set("course_id", courseId)
        const q = qs.toString()
        const res = await fetch(
          getBackendApiUrl(
            `student/performance-metrics/${encodeURIComponent(sid)}${q ? `?${q}` : ""}`
          ),
          { headers: authHeaders(), cache: "no-store" }
        )
        if (!res.ok) {
          setKpiMetrics(null)
          return
        }
        const json = (await res.json()) as StudentKpiPerformanceMetrics
        setKpiMetrics(json)
        setKpiBoundStudentId(sid)
        if (json.period_id && !periodId) setKpiPeriodId(json.period_id)
        else if (periodId) setKpiPeriodId(periodId)
        if (json.course_id && !courseId) setKpiCourseId(json.course_id)
        else if (courseId) setKpiCourseId(courseId)
      } catch {
        setKpiMetrics(null)
      } finally {
        setKpiLoading(false)
      }
    },
    []
  )

  const load = useCallback(async () => {
    let sid = studentId
    if (!sid) {
      sid = await fetchProfileStudentId()
      setStudentId(sid)
    }
    if (!sid) {
      setErr("Could not resolve student.")
      setLoading(false)
      return
    }
    setLoading(true)
    setErr(null)
    try {
      const res = await fetch(getBackendApiUrl(`student/dashboard/${encodeURIComponent(sid)}`), {
        headers: authHeaders(),
      })
      if (!res.ok) {
        const t = await res.text()
        throw new Error(t || res.statusText)
      }
      const json = (await res.json()) as StudentPerformanceDashboardPayload
      setData(json)
      setBelt(json.profile?.level_or_belt || "")
      const a = json.achievements
      setMedals({
        gold: Number(a.gold_medals ?? 0),
        silver: Number(a.silver_medals ?? 0),
        bronze: Number(a.bronze_medals ?? 0),
        comps: Number(a.competitions_participated ?? 0),
        certs: Number(a.certificates_earned ?? 0),
      })
      const s = json.skills
      setSkills({
        strength: s.strength == null ? "" : String(s.strength),
        speed: s.speed == null ? "" : String(s.speed),
        flex: s.flexibility == null ? "" : String(s.flexibility),
        tech: s.technique == null ? "" : String(s.technique),
      })
      const g = json.goal
      setGoal({
        current: g.current_goal || "",
        belt: g.target_belt || "",
        pct: g.progress_percentage == null ? "" : String(g.progress_percentage),
      })
      setFb(json.coach_feedback?.feedback || "")
      const w = json.warrior
      setWar({
        streak: w.training_streak == null ? "" : String(w.training_streak),
        rank: w.rank || "",
        next: w.next_level_progress == null ? "" : String(w.next_level_progress),
      })
      const studentChanged = kpiBoundRef.current !== sid
      if (studentChanged) {
        setKpiPeriodId("")
        setKpiCourseId("")
        setKpiMetrics(null)
        void loadKpiMetrics(sid)
      } else {
        void loadKpiMetrics(
          sid,
          kpiPeriodRef.current || undefined,
          kpiCourseRef.current || undefined
        )
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to load dashboard")
    } finally {
      setLoading(false)
    }
  }, [studentId, loadKpiMetrics])

  useEffect(() => {
    void load()
  }, [load])

  const sid = studentId

  const putJson = async (path: string, body: unknown) => {
    if (!sid) return
    const res = await fetch(getBackendApiUrl(path), {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const t = await res.text()
      throw new Error(t || res.statusText)
    }
    return res.json()
  }

  const saveMedals = async () => {
    if (!sid) return
    try {
      await putJson(`student/achievements/${encodeURIComponent(sid)}`, {
        gold_medals: Number(medals.gold) || 0,
        silver_medals: Number(medals.silver) || 0,
        bronze_medals: Number(medals.bronze) || 0,
        competitions_participated: Number(medals.comps) || 0,
        certificates_earned: Number(medals.certs) || 0,
      })
      toast.success("Achievements saved")
      void load()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed")
    }
  }

  const saveSkills = async () => {
    if (!sid) return
    try {
      await putJson(`student/skills/${encodeURIComponent(sid)}`, {
        strength: skills.strength === "" ? null : Number(skills.strength),
        speed: skills.speed === "" ? null : Number(skills.speed),
        flexibility: skills.flex === "" ? null : Number(skills.flex),
        technique: skills.tech === "" ? null : Number(skills.tech),
      })
      toast.success("Skills saved")
      void load()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed")
    }
  }

  const saveGoals = async () => {
    if (!sid) return
    try {
      await putJson(`student/goals/${encodeURIComponent(sid)}`, {
        current_goal: goal.current || null,
        target_belt: goal.belt || null,
        progress_percentage: goal.pct === "" ? null : Number(goal.pct),
      })
      toast.success("Goal saved")
      void load()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed")
    }
  }

  const saveFeedback = async () => {
    if (!sid) return
    try {
      await putJson(`student/feedback/${encodeURIComponent(sid)}`, { feedback: fb })
      toast.success("Feedback saved")
      void load()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed")
    }
  }

  const saveWarrior = async () => {
    if (!sid) return
    try {
      await putJson(`student/warrior-stats/${encodeURIComponent(sid)}`, {
        training_streak: war.streak === "" ? null : Number(war.streak),
        rank: war.rank || null,
        next_level_progress: war.next === "" ? null : Number(war.next),
      })
      toast.success("Warrior stats saved")
      void load()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed")
    }
  }

  const saveProfile = async () => {
    if (!sid) return
    try {
      await putJson(`student/profile/${encodeURIComponent(sid)}`, {
        level_or_belt: belt.trim() || null,
      })
      toast.success("Level / belt saved")
      void load()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed")
    }
  }

  const shell = useMemo(() => {
    if (loading && !data) {
      return (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-600">
          <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
          <p>Loading performance dashboard…</p>
        </div>
      )
    }
    if (err || !data) {
      return (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">Could not load</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-red-900 space-y-3">
            <p>{err || "Unknown error"}</p>
            <Button variant="outline" onClick={() => void load()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )
    }
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <ProfileCard profile={data.profile} studentId={sid} onPhotoUpdated={() => void load()} />
            <div className="grid md:grid-cols-2 gap-6">
              <AchievementCard data={data.achievements} />
              <AttendanceCard data={data.attendance} />
            </div>
            <SkillPerformance skills={data.skills} />
            <KpiPerformanceSection
              metrics={kpiMetrics}
              loading={kpiLoading}
              periodId={kpiPeriodId}
              courseId={kpiCourseId}
              onPeriodChange={(id) => {
                setKpiPeriodId(id)
                setKpiCourseId("")
                if (sid) void loadKpiMetrics(sid, id || undefined, undefined)
              }}
              onCourseChange={(id) => {
                setKpiCourseId(id)
                if (sid) void loadKpiMetrics(sid, kpiPeriodId || undefined, id || undefined)
              }}
            />
            <CoachFeedback data={data.coach_feedback} />
          </div>
          <div className="space-y-6">
            <WarriorStats warrior={data.warrior} />
            <GoalTracker goal={data.goal} />
            <FeeStatusCard data={data.fee_status} />
          </div>
        </div>

        {canEdit && sid ? (
          <Card className="border-amber-200/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Settings2 className="h-5 w-5" />
                Update performance (staff)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="profile">
                <TabsList className="flex flex-wrap h-auto gap-1">
                  <TabsTrigger value="profile">Level / belt</TabsTrigger>
                  <TabsTrigger value="achievements">Achievements</TabsTrigger>
                  <TabsTrigger value="skills">Skills</TabsTrigger>
                  <TabsTrigger value="goals">Goals</TabsTrigger>
                  <TabsTrigger value="feedback">Coach feedback</TabsTrigger>
                  <TabsTrigger value="warrior">Warrior stats</TabsTrigger>
                </TabsList>
                <TabsContent value="profile" className="space-y-3 pt-4">
                  <Input
                    value={belt}
                    onChange={(e) => setBelt(e.target.value)}
                    placeholder="e.g. Yellow Belt"
                  />
                  <Button onClick={() => void saveProfile()} className="bg-amber-500 hover:bg-amber-600 text-white">
                    <Save className="h-4 w-4 mr-2" /> Save level / belt
                  </Button>
                </TabsContent>
                <TabsContent value="achievements" className="space-y-3 pt-4">
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    <Input type="number" min={0} value={medals.gold} onChange={(e) => setMedals({ ...medals, gold: Number(e.target.value) })} placeholder="Gold" />
                    <Input type="number" min={0} value={medals.silver} onChange={(e) => setMedals({ ...medals, silver: Number(e.target.value) })} placeholder="Silver" />
                    <Input type="number" min={0} value={medals.bronze} onChange={(e) => setMedals({ ...medals, bronze: Number(e.target.value) })} placeholder="Bronze" />
                    <Input type="number" min={0} value={medals.comps} onChange={(e) => setMedals({ ...medals, comps: Number(e.target.value) })} placeholder="Comps" />
                    <Input type="number" min={0} value={medals.certs} onChange={(e) => setMedals({ ...medals, certs: Number(e.target.value) })} placeholder="Certs" />
                  </div>
                  <Button onClick={() => void saveMedals()} className="bg-amber-500 hover:bg-amber-600 text-white">
                    <Save className="h-4 w-4 mr-2" /> Save achievements
                  </Button>
                </TabsContent>
                <TabsContent value="skills" className="space-y-3 pt-4">
                  <div className="grid sm:grid-cols-2 gap-2">
                    <Input value={skills.strength} onChange={(e) => setSkills({ ...skills, strength: e.target.value })} placeholder="Strength %" />
                    <Input value={skills.speed} onChange={(e) => setSkills({ ...skills, speed: e.target.value })} placeholder="Speed %" />
                    <Input value={skills.flex} onChange={(e) => setSkills({ ...skills, flex: e.target.value })} placeholder="Flexibility %" />
                    <Input value={skills.tech} onChange={(e) => setSkills({ ...skills, tech: e.target.value })} placeholder="Technique %" />
                  </div>
                  <Button onClick={() => void saveSkills()} className="bg-amber-500 hover:bg-amber-600 text-white">
                    <Save className="h-4 w-4 mr-2" /> Save skills
                  </Button>
                </TabsContent>
                <TabsContent value="goals" className="space-y-3 pt-4">
                  <Textarea value={goal.current} onChange={(e) => setGoal({ ...goal, current: e.target.value })} placeholder="Current goal" rows={3} />
                  <Input value={goal.belt} onChange={(e) => setGoal({ ...goal, belt: e.target.value })} placeholder="Target" />
                  <Input value={goal.pct} onChange={(e) => setGoal({ ...goal, pct: e.target.value })} placeholder="Progress %" />
                  <Button onClick={() => void saveGoals()} className="bg-amber-500 hover:bg-amber-600 text-white">
                    <Save className="h-4 w-4 mr-2" /> Save goal
                  </Button>
                </TabsContent>
                <TabsContent value="feedback" className="space-y-3 pt-4">
                  <Textarea value={fb} onChange={(e) => setFb(e.target.value)} placeholder="Coach feedback" rows={4} />
                  <Button onClick={() => void saveFeedback()} className="bg-amber-500 hover:bg-amber-600 text-white">
                    <Save className="h-4 w-4 mr-2" /> Save feedback
                  </Button>
                </TabsContent>
                <TabsContent value="warrior" className="space-y-3 pt-4">
                  <div className="grid sm:grid-cols-3 gap-2">
                    <Input value={war.streak} onChange={(e) => setWar({ ...war, streak: e.target.value })} placeholder="Streak days" />
                    <Input value={war.rank} onChange={(e) => setWar({ ...war, rank: e.target.value })} placeholder="Rank title" />
                    <Input value={war.next} onChange={(e) => setWar({ ...war, next: e.target.value })} placeholder="Next level %" />
                  </div>
                  <Button onClick={() => void saveWarrior()} className="bg-amber-500 hover:bg-amber-600 text-white">
                    <Save className="h-4 w-4 mr-2" /> Save warrior stats
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        ) : null}
      </div>
    )
  }, [loading, err, data, canEdit, sid, medals, skills, goal, fb, war, belt, load, kpiMetrics, kpiLoading, kpiPeriodId, kpiCourseId, loadKpiMetrics])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          <p className="text-sm text-slate-600">
            {canEdit
              ? "Fee status is read from payments. Use the form below to update belt, skills, goals, feedback, and warrior stats."
              : "Your fee status and next due date come from your enrollment and payments. Contact your branch for updates."}
          </p>
        </div>
        <div className="flex gap-2">
          {backHref ? (
            <Button variant="outline" onClick={() => router.push(backHref)}>
              Back
            </Button>
          ) : null}
        </div>
      </div>
      {shell}
    </div>
  )
}
