'use client'

import React, { useState } from 'react'
import { Plus, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Notebook } from '@/lib/types'

interface SidebarProps {
  notebooks: Notebook[]
  currentNotebookId: string | null
  onSelectNotebook: (id: string) => void
  onCreateNotebook: (name: string, description?: string) => void
  onDeleteNotebook: (id: string) => void
  isLoading?: boolean
  isDeletingId?: string | null
}

export function Sidebar({
  notebooks,
  currentNotebookId,
  onSelectNotebook,
  onCreateNotebook,
  onDeleteNotebook,
  isLoading = false,
  isDeletingId = null,
}: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const handleCreate = () => {
    if (name.trim()) {
      onCreateNotebook(name, description || undefined)
      setName('')
      setDescription('')
      setIsOpen(false)
    }
  }

  return (
    <div className="flex flex-col h-full border-r bg-background">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-bold">NotebookGen</h2>
        <p className="text-xs text-muted-foreground">Chat with your documents</p>
      </div>

      {/* Create Notebook Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button className="m-4" onClick={() => setIsOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Notebook
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Notebook</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My notebook..."
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description (optional)</label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this about?"
              />
            </div>
            <Button onClick={handleCreate} disabled={!name.trim() || isLoading} className="w-full">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Separator />

      {/* Notebooks List */}
      <ScrollArea className="flex-1">
        <div className="space-y-1 p-4">
          {notebooks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No notebooks yet</p>
          ) : (
            notebooks.map((notebook) => (
              <div
                key={notebook.id}
                className={`flex items-center justify-between p-2 rounded-lg transition cursor-pointer ${
                  currentNotebookId === notebook.id
                    ? 'bg-primary/10 border border-primary'
                    : 'hover:bg-muted border border-transparent'
                }`}
                onClick={() => onSelectNotebook(notebook.id)}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{notebook.name}</p>
                  {notebook.description && (
                    <p className="text-xs text-muted-foreground truncate">{notebook.description}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteNotebook(notebook.id)
                  }}
                  disabled={isDeletingId === notebook.id}
                >
                  {isDeletingId === notebook.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
