import { NextRequest, NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'
import jwt from 'jsonwebtoken'

// Database connection
const MONGO_URL = process.env.MONGO_URL || "mongodb://localhost:27017"
const DATABASE_NAME = "marshalats"

export async function GET(request: NextRequest) {
  let client: MongoClient | null = null

  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization required' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)

    // Decode token to get student ID
    let decoded: any
    try {
      decoded = jwt.decode(token)
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    if (!decoded || !decoded.sub) {
      return NextResponse.json({ error: 'Invalid token payload' }, { status: 401 })
    }

    const studentId = decoded.sub
    console.log(`🔍 Fallback API: Looking for enrollments for student ${studentId}`)

    // Connect to database
    client = new MongoClient(MONGO_URL)
    await client.connect()
    const db = client.db(DATABASE_NAME)

    // Find student's active enrollments
    const enrollments = await db.collection('enrollments').find({
      student_id: studentId,
      is_active: true
    }).toArray()

    console.log(`📚 Found ${enrollments.length} active enrollments`)

    if (enrollments.length === 0) {
      // Return empty array if no enrollments
      return NextResponse.json(
        {
          enrolled_courses: [],
          message: "No active enrollments found"
        },
        { status: 200 }
      )
    }

    // Get course IDs
    const courseIds = enrollments.map(enrollment => enrollment.course_id)

    // Find courses
    const courses = await db.collection('courses').find({
      id: { $in: courseIds }
    }).toArray()

    console.log(`📖 Found ${courses.length} courses`)

    // Get branch IDs
    const branchIds = enrollments.map(enrollment => enrollment.branch_id).filter(Boolean)

    // Find branches
    const branches = await db.collection('branches').find({
      id: { $in: branchIds }
    }).toArray()

    console.log(`🏢 Found ${branches.length} branches`)

    // Create course and branch lookup maps
    const courseMap = new Map()
    courses.forEach(course => {
      courseMap.set(course.id, course)
    })

    const branchMap = new Map()
    branches.forEach(branch => {
      branchMap.set(branch.id, branch)
    })

    // Build enrolled courses response
    const enrolledCourses = enrollments.map(enrollment => {
      const course = courseMap.get(enrollment.course_id)
      const branch = branchMap.get(enrollment.branch_id)

      if (!course) {
        console.warn(`⚠️ Course not found for enrollment: ${enrollment.course_id}`)
        return null
      }

      return {
        enrollment: {
          id: enrollment.id,
          student_id: enrollment.student_id,
          course_id: enrollment.course_id,
          branch_id: enrollment.branch_id,
          enrollment_date: enrollment.enrollment_date,
          start_date: enrollment.start_date,
          end_date: enrollment.end_date,
          fee_amount: enrollment.fee_amount || 0,
          admission_fee: enrollment.admission_fee || 0,
          payment_status: enrollment.payment_status || "pending",
          is_active: enrollment.is_active,
          next_due_date: enrollment.next_due_date,
          branch_details: branch ? {
            id: branch.id,
            name: branch.name || "Unknown Academy",
            location: branch.location || "Unknown Location",
            location_id: branch.location_id || "unknown"
          } : null
        },
        course: {
          id: course.id,
          title: course.title || course.name || "Untitled Course",
          name: course.name || course.title || "Untitled Course",
          code: course.code || "N/A",
          description: course.description || "No description available",
          difficulty_level: course.difficulty_level || "Beginner",
          duration_months: course.duration_months || 3,
          instructor: course.instructor || "TBA",
          category_id: course.category_id || "general",
          total_lessons: course.total_lessons || 20
        }
      }
    }).filter(Boolean) // Remove null entries

    console.log(`✅ Returning ${enrolledCourses.length} enrolled courses`)

    return NextResponse.json(
      {
        enrolled_courses: enrolledCourses,
        message: "Student courses retrieved successfully from database"
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error in student-courses fallback API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  } finally {
    // Close database connection
    if (client) {
      await client.close()
    }
  }
}
