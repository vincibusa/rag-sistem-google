'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useEntitiesStore } from '@/store/entities-store'
import { updateEntityAction } from '@/app/actions/entities'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Loader2, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import type { Tables } from '@/lib/database.types'

type DocumentEntity = Tables<'document_entities'>

interface EntityEditDialogProps {
  entity: DocumentEntity
  open: boolean
  onClose: () => void
}

export function EntityEditDialog({ entity, open, onClose }: EntityEditDialogProps) {
  const { user, accessToken } = useAuth()
  const { updateEntity } = useEntitiesStore()

  const [entityName, setEntityName] = useState(entity.entity_name)
  const [attributes, setAttributes] = useState<Record<string, any>>(
    (entity.attributes as Record<string, any>) || {}
  )
  const [newAttrKey, setNewAttrKey] = useState('')
  const [newAttrValue, setNewAttrValue] = useState('')
  const [saving, setSaving] = useState(false)

  // Reset form when entity changes
  useEffect(() => {
    setEntityName(entity.entity_name)
    setAttributes((entity.attributes as Record<string, any>) || {})
  }, [entity])

  const handleAddAttribute = () => {
    if (!newAttrKey.trim()) return

    setAttributes((prev) => ({
      ...prev,
      [newAttrKey.trim()]: newAttrValue.trim(),
    }))

    setNewAttrKey('')
    setNewAttrValue('')
  }

  const handleRemoveAttribute = (key: string) => {
    setAttributes((prev) => {
      const newAttrs = { ...prev }
      delete newAttrs[key]
      return newAttrs
    })
  }

  const handleUpdateAttribute = (key: string, value: string) => {
    setAttributes((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const handleSave = async () => {
    if (!user || !accessToken) return

    try {
      setSaving(true)

      const updates = {
        entity_name: entityName,
        attributes: attributes,
      }

      await updateEntityAction(user.id, accessToken, entity.id, updates)
      updateEntity(entity.id, updates)

      toast.success('Entity updated successfully')
      onClose()
    } catch (error) {
      console.error('Error updating entity:', error)
      toast.error('Failed to update entity')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Entity</DialogTitle>
          <DialogDescription>
            Update the name and attributes of this {entity.entity_type}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Entity Name */}
          <div className="space-y-2">
            <Label htmlFor="entity-name">Entity Name</Label>
            <Input
              id="entity-name"
              value={entityName}
              onChange={(e) => setEntityName(e.target.value)}
              placeholder="Enter entity name"
            />
          </div>

          <Separator />

          {/* Attributes */}
          <div className="space-y-2">
            <Label>Attributes</Label>
            <div className="space-y-2">
              {Object.entries(attributes).map(([key, value]) => (
                <div key={key} className="flex gap-2">
                  <Input
                    value={key}
                    disabled
                    className="flex-1 bg-muted"
                    placeholder="Key"
                  />
                  <Input
                    value={value as string}
                    onChange={(e) => handleUpdateAttribute(key, e.target.value)}
                    className="flex-1"
                    placeholder="Value"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleRemoveAttribute(key)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              {/* Add New Attribute */}
              <div className="flex gap-2 pt-2">
                <Input
                  value={newAttrKey}
                  onChange={(e) => setNewAttrKey(e.target.value)}
                  placeholder="New attribute key"
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddAttribute()
                    }
                  }}
                />
                <Input
                  value={newAttrValue}
                  onChange={(e) => setNewAttrValue(e.target.value)}
                  placeholder="New attribute value"
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddAttribute()
                    }
                  }}
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleAddAttribute}
                  disabled={!newAttrKey.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !entityName.trim()}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
