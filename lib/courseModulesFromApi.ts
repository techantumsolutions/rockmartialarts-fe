export interface ParsedCourseModule {
  id: string
  title: string
  description: string
  duration_minutes: number
  order: number
  is_completed?: boolean
  resources?: string[]
}

export function parseCourseModulesFromApi(courseData: Record<string, unknown>): ParsedCourseModule[] {
  const courseContent = (courseData.course_content || {}) as Record<string, unknown>
  const rawModules = courseContent.modules

  if (Array.isArray(rawModules) && rawModules.length > 0) {
    return rawModules.map((mod: any, index: number) => ({
      id: String(mod.id || mod.module_id || `module-${index + 1}`),
      title: mod.title || mod.name || `Module ${index + 1}`,
      description: mod.description || "",
      duration_minutes: Number(mod.duration_minutes || mod.duration || 0) || 0,
      order: Number(mod.order ?? index + 1),
      is_completed: Boolean(mod.is_completed),
      resources: Array.isArray(mod.resources) ? mod.resources : undefined,
    }))
  }

  const syllabus = courseContent.syllabus
  if (typeof syllabus === "string" && syllabus.trim()) {
    const lines = syllabus.split("\n").map((line) => line.trim()).filter(Boolean)
    return lines.map((line, index) => ({
      id: `syllabus-${index + 1}`,
      title: line.replace(/^[-*\d.]+\s*/, ""),
      description: "",
      duration_minutes: 0,
      order: index + 1,
    }))
  }

  if (Array.isArray(courseData.curriculum) && courseData.curriculum.length > 0) {
    return (courseData.curriculum as string[]).map((line, index) => ({
      id: `curriculum-${index + 1}`,
      title: line,
      description: "",
      duration_minutes: 0,
      order: index + 1,
    }))
  }

  return []
}
