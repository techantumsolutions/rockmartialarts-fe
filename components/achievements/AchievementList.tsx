"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { AchievementForm, type AchievementFormData } from "./AchievementForm"
import { AchievementGallery } from "./AchievementGallery"
import { Plus, Pencil, Trash2, Eye, Download } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { getBackendApiUrl } from "@/lib/config"
import { TokenManager } from "@/lib/tokenManager"

export interface AchievementItem {
  id: string
  student_id: string
  branch_id?: string
  title: string
  description?: string | null
  images?: string[]
  documents?: string[]
  created_at?: string
}

interface AchievementListProps {
  studentId: string
  studentName?: string
  achievements: AchievementItem[]
  onRefresh: () => void
  loading?: boolean
}

export function AchievementList({
  studentId,
  studentName,
  achievements,
  onRefresh,
  loading = false,
}: AchievementListProps) {
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [viewingId, setViewingId] = useState<string | null>(null)

  const token = TokenManager.getToken()

  const handleCreate = async (data: AchievementFormData) => {
    if (!token) return
    const res = await fetch(getBackendApiUrl("achievements/create"), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        student_id: studentId,
        title: data.title,
        description: data.description || null,
        images: data.images,
        documents: data.documents,
      }),
    })
    if (!res.ok) throw new Error(await res.text())
    setFormOpen(false)
    onRefresh()
  }

  const handleUpdate = async (data: AchievementFormData) => {
    if (!token || !editingId) return
    const res = await fetch(getBackendApiUrl(`achievements/update/${editingId}`), {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        title: data.title,
        description: data.description || null,
        images: data.images,
        documents: data.documents,
      }),
    })
    if (!res.ok) throw new Error(await res.text())
    setEditingId(null)
    onRefresh()
  }

  const handleDelete = async (id: string) => {
    if (!token || !confirm("Delete this achievement?")) return
    const res = await fetch(getBackendApiUrl(`achievements/delete/${id}`), {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error(await res.text())
    setViewingId(null)
    setEditingId(null)
    onRefresh()
  }

  const editingAchievement = editingId ? achievements.find((a) => a.id === editingId) : null

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-[#4F5077]">Student Achievements ({achievements.length})</CardTitle>
        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="min-h-[44px]">
              <Plus className="w-4 h-4 mr-2" />
              Add Achievement
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Achievement</DialogTitle>
            </DialogHeader>
            <AchievementForm
              onSubmit={handleCreate}
              onCancel={() => setFormOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-gray-500 text-sm py-4">Loading achievements…</p>
        ) : achievements.length === 0 ? (
          <p className="text-gray-500 text-sm py-4">No achievements yet. Add one above.</p>
        ) : (
          <ul className="space-y-4">
            {achievements.map((a) => (
              <li
                key={a.id}
                className="border rounded-lg p-4 bg-gray-50/50"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-[#4F5077]">{a.title}</h4>
                    {a.description && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{a.description}</p>
                    )}
                    {a.created_at && (
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(a.created_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setViewingId(viewingId === a.id ? null : a.id)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{viewingId === a.id ? "Hide" : "View"}</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingId(a.id)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Edit</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600"
                          onClick={() => handleDelete(a.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Delete</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
                {viewingId === a.id && (
                  <div className="mt-4 pt-4 border-t">
                    {a.images && a.images.length > 0 && (
                      <AchievementGallery images={a.images} />
                    )}
                    {a.documents && a.documents.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {a.documents.map((url, i) => (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-blue-600"
                          >
                            <Download className="w-4 h-4" />
                            Certificate {a.documents!.length > 1 ? i + 1 : ""}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {editingAchievement && (
          <Dialog open={!!editingId} onOpenChange={(open) => !open && setEditingId(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Achievement</DialogTitle>
              </DialogHeader>
              <AchievementForm
                initialData={{
                  title: editingAchievement.title,
                  description: editingAchievement.description ?? "",
                  images: editingAchievement.images ?? [],
                  documents: editingAchievement.documents ?? [],
                }}
                onSubmit={handleUpdate}
                onCancel={() => setEditingId(null)}
              />
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  )
}
