'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useEntitiesStore } from '@/store/entities-store'
import { deleteEntityAction } from '@/app/actions/entities'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Search, User, Building2, Calendar, MapPin, Edit, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { EntityEditDialog } from './EntityEditDialog'
import type { Tables } from '@/lib/database.types'

type DocumentEntity = Tables<'document_entities'>

interface EntitiesListProps {
  notebookId: string
}

export function EntitiesList({ notebookId }: EntitiesListProps) {
  const { user, accessToken } = useAuth()
  const { entities, loading, searchEntities, filterByType, removeEntity } = useEntitiesStore()

  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string | null>(null)
  const [editingEntity, setEditingEntity] = useState<DocumentEntity | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Get filtered and searched entities
  const displayedEntities = (() => {
    let result = entities
    if (filterType) {
      result = filterByType(filterType)
    }
    if (searchTerm) {
      result = searchEntities(searchTerm)
    }
    return result
  })()

  const handleDelete = async (entityId: string) => {
    if (!user || !accessToken) return

    try {
      setDeletingId(entityId)
      await deleteEntityAction(user.id, accessToken, entityId)
      removeEntity(entityId)
      toast.success('Entity deleted')
    } catch (error) {
      console.error('Error deleting entity:', error)
      toast.error('Failed to delete entity')
    } finally {
      setDeletingId(null)
    }
  }

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'person':
        return <User className="h-4 w-4" />
      case 'company':
        return <Building2 className="h-4 w-4" />
      case 'date':
        return <Calendar className="h-4 w-4" />
      case 'address':
        return <MapPin className="h-4 w-4" />
      default:
        return null
    }
  }

  const getEntityTypeColor = (type: string) => {
    switch (type) {
      case 'person':
        return 'bg-blue-500/10 text-blue-500'
      case 'company':
        return 'bg-purple-500/10 text-purple-500'
      case 'date':
        return 'bg-green-500/10 text-green-500'
      case 'address':
        return 'bg-orange-500/10 text-orange-500'
      default:
        return 'bg-gray-500/10 text-gray-500'
    }
  }

  const formatAttributes = (attributes: any) => {
    const attrs = attributes as Record<string, any>
    const keys = Object.keys(attrs)
    if (keys.length === 0) return 'No attributes'

    // Show first 3 attributes
    const preview = keys
      .slice(0, 3)
      .map((key) => `${key}: ${attrs[key]}`)
      .join(', ')

    return keys.length > 3 ? `${preview}...` : preview
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data Registry</CardTitle>
        <CardDescription>
          Entities extracted from your documents. Edit or delete them to maintain accurate data.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filters and Search */}
        <div className="flex gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search entities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select
            value={filterType || 'all'}
            onValueChange={(value) => setFilterType(value === 'all' ? null : value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="person">👤 People</SelectItem>
              <SelectItem value="company">🏢 Companies</SelectItem>
              <SelectItem value="date">📅 Dates</SelectItem>
              <SelectItem value="address">📍 Addresses</SelectItem>
              <SelectItem value="other">📦 Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Entities Table */}
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : displayedEntities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm || filterType
              ? 'No entities match your search'
              : 'No entities found. Upload documents to extract data.'}
          </div>
        ) : (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Attributes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedEntities.map((entity) => (
                  <TableRow key={entity.id}>
                    <TableCell>
                      <Badge className={getEntityTypeColor(entity.entity_type)}>
                        <span className="flex items-center gap-1">
                          {getEntityIcon(entity.entity_type)}
                          {entity.entity_type}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{entity.entity_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatAttributes(entity.attributes)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingEntity(entity)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(entity.id)}
                          disabled={deletingId === entity.id}
                        >
                          {deletingId === entity.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Edit Dialog */}
        {editingEntity && (
          <EntityEditDialog
            entity={editingEntity}
            open={!!editingEntity}
            onClose={() => setEditingEntity(null)}
          />
        )}
      </CardContent>
    </Card>
  )
}
