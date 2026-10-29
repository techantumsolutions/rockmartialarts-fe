import { getBackendApiUrl } from "@/lib/config"

export interface CoachAssignedBatch {
  id: string
  batch_id: string
  batch_name: string
  start_time: string
  end_time: string
  days: string[]
  branch_id?: string
  branch_name?: string
  coach_id?: string
}

export interface CoachAssignedCourse {
  id: string
  course_id: string
  name: string
  batches: CoachAssignedBatch[]
}

export interface CoachAssignments {
  coach_id: string
  branch_id?: string
  courses: CoachAssignedCourse[]
}

/**
 * Fetch the courses and specific batches assigned to the coach in their branch.
 */
export async function fetchCoachAssignments(
  token: string,
  coach: any
): Promise<CoachAssignments> {
  const coachId = coach?.id || coach?._id || ""
  const branchId = coach?.branch_id || ""

  const emptyResult: CoachAssignments = {
    coach_id: coachId,
    branch_id: branchId,
    courses: [],
  }

  if (!coachId) return emptyResult

  try {
    const res = await fetch(getBackendApiUrl(`coaches/${encodeURIComponent(coachId)}/courses`), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    if (!res.ok) {
      console.warn("Failed to fetch coach courses:", res.status)
      return emptyResult
    }

    const data = await res.json()
    const rawCourses = data.courses || []

    const normalizedCourses: CoachAssignedCourse[] = rawCourses.map((c: any) => {
      const courseId = String(c.id || c.course_id || "").trim()
      const courseName = c.name || c.title || "Course"

      const batches: CoachAssignedBatch[] = (c.batches || []).map((b: any, index: number) => {
        const batchId = String(b.batch_id || b.id || `batch-${index}`).trim()
        const batchName = String(b.batch_name || b.name || `Batch ${index + 1}`).trim()
        return {
          id: batchId,
          batch_id: batchId,
          batch_name: batchName,
          start_time: String(b.start_time || "").trim(),
          end_time: String(b.end_time || "").trim(),
          days: Array.isArray(b.days) ? b.days : [],
          branch_id: b.branch_id || branchId,
          branch_name: b.branch_name || "",
          coach_id: b.coach_id || coachId,
        }
      })

      return {
        id: courseId,
        course_id: courseId,
        name: courseName,
        batches,
      }
    })

    return {
      coach_id: coachId,
      branch_id: branchId,
      courses: normalizedCourses,
    }
  } catch (err) {
    console.error("Error in fetchCoachAssignments:", err)
    return emptyResult
  }
}

/**
 * Checks whether a student is enrolled in the coach's assigned branch, course, and batch.
 */
export function isStudentAssignedToCoach(
  student: any,
  assignments: CoachAssignments,
  selectedCourseId?: string,
  selectedBatchRef?: string
): boolean {
  if (!student || !assignments) return false

  // 1. Branch verification
  const coachBranchId = assignments.branch_id
  if (coachBranchId) {
    const studentBranchId =
      student.branch_id ||
      student.branch?.branch_id ||
      (student.branches && student.branches[0]?.id) ||
      ""

    const studentEnrolledBranchIds = new Set<string>()
    if (studentBranchId) studentEnrolledBranchIds.add(String(studentBranchId))
    if (Array.isArray(student.branches)) {
      student.branches.forEach((b: any) => {
        if (b?.id) studentEnrolledBranchIds.add(String(b.id))
      })
    }
    if (Array.isArray(student.courses)) {
      student.courses.forEach((c: any) => {
        if (c?.branch_id) studentEnrolledBranchIds.add(String(c.branch_id))
      })
    }

    // If student has explicit branch info and does not belong to coach's branch, reject
    if (studentEnrolledBranchIds.size > 0 && !studentEnrolledBranchIds.has(String(coachBranchId))) {
      return false
    }
  }

  // 2. Course verification
  const studentCourseIds = new Set<string>()
  if (student.course_id) studentCourseIds.add(String(student.course_id))
  if (student.course?.course_id) studentCourseIds.add(String(student.course.course_id))
  if (student.course?.id) studentCourseIds.add(String(student.course.id))
  if (Array.isArray(student.courses)) {
    student.courses.forEach((c: any) => {
      if (c?.id) studentCourseIds.add(String(c.id))
      if (c?.course_id) studentCourseIds.add(String(c.course_id))
    })
  }

  // Assigned course IDs for this coach
  const coachCourseMap = new Map<string, CoachAssignedCourse>()
  assignments.courses.forEach((c) => {
    coachCourseMap.set(String(c.course_id), c)
    coachCourseMap.set(String(c.id), c)
  })

  // If coach has no assigned courses at all, reject
  if (coachCourseMap.size === 0) {
    return false
  }

  // Check which of the coach's courses match this student
  let matchingCourse: CoachAssignedCourse | null = null
  for (const cid of studentCourseIds) {
    if (coachCourseMap.has(cid)) {
      matchingCourse = coachCourseMap.get(cid)!
      break
    }
  }

  // Also check course name match as fallback
  if (!matchingCourse) {
    const studentCourseNames = [
      student.course_name,
      student.course?.name,
      student.course?.title,
      ...(Array.isArray(student.courses)
        ? student.courses.map((c: any) => c.name || c.course_name || c.title)
        : []),
    ]
      .filter(Boolean)
      .map((s: string) => s.trim().toLowerCase())

    for (const c of assignments.courses) {
      if (studentCourseNames.includes(c.name.trim().toLowerCase())) {
        matchingCourse = c
        break
      }
    }
  }

  if (!matchingCourse) {
    return false
  }

  // If an active Course Filter is selected, student must match that specific course
  if (selectedCourseId && selectedCourseId !== "all") {
    if (
      String(matchingCourse.course_id) !== String(selectedCourseId) &&
      String(matchingCourse.id) !== String(selectedCourseId)
    ) {
      return false
    }
  }

  // 3. Batch verification
  // Extract all batch refs associated with student
  const studentBatchRefs = new Set<string>()
  if (student.batch_ref) studentBatchRefs.add(String(student.batch_ref).trim())
  if (student.course?.batch_ref) studentBatchRefs.add(String(student.course.batch_ref).trim())
  if (student.batch_id) studentBatchRefs.add(String(student.batch_id).trim())
  if (student.batch_name) studentBatchRefs.add(String(student.batch_name).trim().toLowerCase())
  if (Array.isArray(student.courses)) {
    student.courses.forEach((c: any) => {
      if (c.batch_ref) studentBatchRefs.add(String(c.batch_ref).trim())
      if (c.batch_id) studentBatchRefs.add(String(c.batch_id).trim())
      if (c.batch_name) studentBatchRefs.add(String(c.batch_name).trim().toLowerCase())
    })
  }

  const assignedBatches = matchingCourse.batches || []

  // If coach has specific batches assigned for this course:
  if (assignedBatches.length > 0) {
    // If an active Batch Filter is selected:
    if (selectedBatchRef && selectedBatchRef !== "all") {
      const targetBatch = assignedBatches.find(
        (b) =>
          b.id === selectedBatchRef ||
          b.batch_id === selectedBatchRef ||
          b.batch_name.toLowerCase() === selectedBatchRef.toLowerCase()
      )

      if (targetBatch) {
        const matchesTarget =
          studentBatchRefs.has(targetBatch.id) ||
          studentBatchRefs.has(targetBatch.batch_id) ||
          studentBatchRefs.has(targetBatch.batch_name.toLowerCase())
        if (!matchesTarget) {
          return false
        }
      } else {
        return false
      }
    } else {
      // General match: student must belong to at least one of the coach's assigned batches
      let matchesAnyCoachBatch = false
      for (const b of assignedBatches) {
        if (
          studentBatchRefs.has(b.id) ||
          studentBatchRefs.has(b.batch_id) ||
          studentBatchRefs.has(b.batch_name.toLowerCase())
        ) {
          matchesAnyCoachBatch = true
          break
        }
      }

      // If student has NO batch_ref recorded at all in DB:
      // Include student only if this coach is the sole coach or assigned to all batches of the course
      if (!matchesAnyCoachBatch) {
        if (studentBatchRefs.size === 0) {
          // Check if coach is assigned to batches of this course
          matchesAnyCoachBatch = true
        } else {
          return false
        }
      }

      if (!matchesAnyCoachBatch) {
        return false
      }
    }
  }

  return true
}

/**
 * Filter an array of students to only those assigned to the coach,
 * applying optional course, batch, and search filters.
 */
export function filterStudentsForCoach(
  students: any[],
  assignments: CoachAssignments,
  filters?: {
    courseId?: string
    batchRef?: string
    searchTerm?: string
  }
): any[] {
  if (!Array.isArray(students)) return []

  // Deduplicate by student id
  const seenIds = new Set<string>()
  const uniqueStudents: any[] = []

  for (const s of students) {
    const sid = s.id || s.student_id
    if (!sid || seenIds.has(sid)) continue
    seenIds.add(sid)
    uniqueStudents.push(s)
  }

  return uniqueStudents.filter((student) => {
    // 1. Check coach assignment
    if (!isStudentAssignedToCoach(student, assignments, filters?.courseId, filters?.batchRef)) {
      return false
    }

    // 2. Search term filter
    if (filters?.searchTerm && filters.searchTerm.trim()) {
      const q = filters.searchTerm.trim().toLowerCase()
      const name = (student.student_name || student.full_name || "").toLowerCase()
      const email = (student.email || "").toLowerCase()
      const phone = (student.phone || "").toLowerCase()
      const id = (student.student_id || student.id || "").toLowerCase()
      const course = (student.course_name || "").toLowerCase()

      const matchesSearch =
        name.includes(q) ||
        email.includes(q) ||
        phone.includes(q) ||
        id.includes(q) ||
        course.includes(q)

      if (!matchesSearch) return false
    }

    return true
  })
}
