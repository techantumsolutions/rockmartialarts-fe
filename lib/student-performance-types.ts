export interface PerformanceProfile {
  student_id: string
  name: string
  level_or_belt?: string | null
  branch?: string | null
  martial_art?: string | null
  date_of_joining?: string | null
  coach?: string | null
  profile_image?: string | null
}

export interface PerformanceAchievements {
  student_id?: string
  gold_medals?: number
  silver_medals?: number
  bronze_medals?: number
  competitions_participated?: number
  certificates_earned?: number
}

export interface PerformanceSkills {
  strength?: number | null
  speed?: number | null
  flexibility?: number | null
  technique?: number | null
}

export interface PerformanceAttendance {
  classes_attended: number
  classes_missed: number
  attendance_percent: number | null
  training_streak_days: number
}

export interface PerformanceCoachFeedback {
  feedback: string
  coach_id?: string | null
  updated_at?: string | null
}

export interface PerformanceFeeStatus {
  status: string
  next_due_date?: string | null
  period_start?: string | null
  period_end?: string | null
  billing_status?: string | null
  overdue_days?: number | null
  grace_days_remaining?: number | null
  grace_days_total?: number | null
  is_within_grace?: boolean | null
  duration_months?: number | null
  source?: string
}

export interface PerformanceGoal {
  current_goal?: string | null
  target_belt?: string | null
  progress_percentage?: number | null
}

export interface PerformanceWarrior {
  training_streak?: number | null
  rank?: string | null
  next_level_progress?: number | null
}

export interface StudentPerformanceDashboardPayload {
  profile: PerformanceProfile
  achievements: PerformanceAchievements
  skills: PerformanceSkills
  attendance: PerformanceAttendance
  coach_feedback: PerformanceCoachFeedback
  fee_status: PerformanceFeeStatus
  goal: PerformanceGoal
  warrior: PerformanceWarrior
}
