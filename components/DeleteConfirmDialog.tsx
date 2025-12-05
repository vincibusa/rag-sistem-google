'use client'

import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Loader2 } from 'lucide-react'

interface DeleteConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void | Promise<void>
  requireTextConfirmation?: boolean
  textToMatch?: string
  isDestructive?: boolean
  isLoading?: boolean
}

/**
 * Reusable delete confirmation dialog with optional text confirmation
 * For critical operations like notebook/file deletion
 */
export function DeleteConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  onConfirm,
  requireTextConfirmation = false,
  textToMatch = '',
  isDestructive = true,
  isLoading = false,
}: DeleteConfirmDialogProps) {
  const [inputValue, setInputValue] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const canConfirm = !requireTextConfirmation || inputValue === textToMatch
  const isButtonDisabled = !canConfirm || isProcessing || isLoading

  const handleConfirm = async () => {
    setIsProcessing(true)
    try {
      await onConfirm()
      setInputValue('')
      onOpenChange(false)
    } catch (error) {
      console.error('Delete confirmation error:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className={isDestructive ? 'text-red-600' : ''}>
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        {requireTextConfirmation && (
          <div className="space-y-2">
            <label htmlFor="confirm-input" className="text-sm font-medium">
              Type <code className="bg-muted px-1 py-0.5 rounded text-xs">{textToMatch}</code> to
              confirm:
            </label>
            <Input
              id="confirm-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={textToMatch}
              className={
                inputValue && inputValue !== textToMatch ? 'border-red-500' : ''
              }
              disabled={isProcessing || isLoading}
              aria-describedby="confirm-help"
            />
            <p id="confirm-help" className="text-xs text-muted-foreground">
              This action cannot be undone.
            </p>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isProcessing || isLoading}>
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={isButtonDisabled}
            onClick={handleConfirm}
            className={isDestructive ? 'bg-red-600 hover:bg-red-700' : ''}
          >
            {isProcessing || isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              confirmText
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
