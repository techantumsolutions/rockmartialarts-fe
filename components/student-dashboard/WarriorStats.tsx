"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { PerformanceWarrior } from "@/lib/student-performance-types"
import { Flame } from "lucide-react"

export function WarriorStats({ warrior }: { warrior: PerformanceWarrior }) {
  const nl = warrior.next_level_progress == null ? null : Math.min(100, Math.max(0, Number(warrior.next_level_progress)))
  return (
    <Card className="border-slate-200 shadow-sm bg-white">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg text-slate-800">
          <Flame className="h-5 w-5 text-amber-500" />
          Warrior stats
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Training streak</p>
            <p className="text-2xl font-bold text-slate-900">{warrior.training_streak ?? 0} days</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Rank</p>
            <p className="text-lg font-semibold text-slate-900">{warrior.rank?.trim() || "—"}</p>
          </div>
        </div>
        {nl != null ? (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-slate-600">
              <span>Next level progress</span>
              <span className="font-medium text-slate-800">{Math.round(nl)}%</span>
            </div>
            <Progress value={nl} className="h-2 bg-slate-100" />
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
