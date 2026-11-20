"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

export type AdmissionFeeMode = "fixed" | "per_course"

export type AdmissionFeeCourseOption = {
  id: string
  title: string
}

type Props = {
  mode: AdmissionFeeMode
  fixedFee: number
  feeByCourse: Record<string, number>
  courses: AdmissionFeeCourseOption[]
  onModeChange: (mode: AdmissionFeeMode) => void
  onFixedFeeChange: (value: number) => void
  onCourseFeeChange: (courseId: string, value: number) => void
  disabled?: boolean
}

/**
 * Academy settings: fixed admission fee for all courses, or per-course amounts.
 */
export function AdmissionFeeSettingsFields({
  mode,
  fixedFee,
  feeByCourse,
  courses,
  onModeChange,
  onFixedFeeChange,
  onCourseFeeChange,
  disabled = false,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Admission fee setup</Label>
        <RadioGroup
          value={mode}
          onValueChange={(v) => onModeChange(v === "per_course" ? "per_course" : "fixed")}
          disabled={disabled}
          className="grid gap-3 sm:grid-cols-2"
        >
          <label
            htmlFor="adm_fixed"
            className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 ${
              mode === "fixed" ? "border-[#E1BB33] bg-[#FFF8E1]/50" : "border-gray-200 bg-white"
            }`}
          >
            <RadioGroupItem value="fixed" id="adm_fixed" className="mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-[#2F3158]">Fixed for all courses</p>
              <p className="text-xs text-[#6B7A99]">
                One admission fee applied to every course at this academy.
              </p>
            </div>
          </label>
          <label
            htmlFor="adm_per_course"
            className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 ${
              mode === "per_course" ? "border-[#E1BB33] bg-[#FFF8E1]/50" : "border-gray-200 bg-white"
            }`}
          >
            <RadioGroupItem value="per_course" id="adm_per_course" className="mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-[#2F3158]">Course-based</p>
              <p className="text-xs text-[#6B7A99]">
                Set a different admission fee for each assigned course.
              </p>
            </div>
          </label>
        </RadioGroup>
      </div>

      {mode === "fixed" ? (
        <div className="space-y-2">
          <Label htmlFor="admissionFeeFixed">Admission fee (₹)</Label>
          <Input
            id="admissionFeeFixed"
            type="number"
            min={0}
            disabled={disabled}
            value={Number.isFinite(fixedFee) ? fixedFee : 0}
            onChange={(e) => onFixedFeeChange(Number(e.target.value) || 0)}
            placeholder="Enter fixed admission fee"
          />
        </div>
      ) : (
        <div className="space-y-3">
          <Label>Admission fee by course (₹)</Label>
          {courses.length === 0 ? (
            <p className="text-xs text-[#6B7A99]">
              Assign courses in Course Assignments first, then set per-course admission fees.
            </p>
          ) : (
            <div className="space-y-2 rounded-xl border border-gray-200 bg-[#F8FAFC] p-3">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="text-sm font-medium text-[#2F3158]">{course.title}</span>
                  <Input
                    type="number"
                    min={0}
                    disabled={disabled}
                    className="h-10 w-full sm:w-36"
                    value={
                      feeByCourse[course.id] != null && Number.isFinite(feeByCourse[course.id])
                        ? feeByCourse[course.id]
                        : 0
                    }
                    onChange={(e) => onCourseFeeChange(course.id, Number(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-[#6B7A99]">
            Courses without a value fall back to the academy fixed fee ({`₹${Number(fixedFee || 0).toLocaleString("en-IN")}`}).
          </p>
          <div className="space-y-2">
            <Label htmlFor="admissionFeeFallback">Fallback fixed fee (₹)</Label>
            <Input
              id="admissionFeeFallback"
              type="number"
              min={0}
              disabled={disabled}
              value={Number.isFinite(fixedFee) ? fixedFee : 0}
              onChange={(e) => onFixedFeeChange(Number(e.target.value) || 0)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
