'use client'

import React from 'react'
import { useChatStore } from '@/store/chat-store'
import { useAuth } from '@/lib/auth-context'
import { downloadCompiledDocument } from '@/app/actions/document-compilation'
import { toast } from 'sonner'
import {
  Eye,
  EyeOff,
  FileText,
  Image,
  PanelLeft,
  PanelRight,
  Minus,
  Plus,
  Download,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export function LayoutControls() {
  const {
    documentPreview,
    documentSession,
    setDocumentPreviewVisible,
    setPreviewMode,
    setSplitRatio,
    setPreviewCollapsed,
  } = useChatStore()
  const { user, accessToken } = useAuth()

  const handleToggleVisibility = () => {
    setDocumentPreviewVisible(!documentPreview.isVisible)
  }

  const handleToggleMode = () => {
    setPreviewMode(documentPreview.previewMode === 'text' ? 'visual' : 'text')
  }

  const handleToggleCollapse = () => {
    setPreviewCollapsed(!documentPreview.isCollapsed)
  }

  const handleIncreaseWidth = () => {
    const newRatio = Math.min(documentPreview.splitRatio + 0.1, 0.8)
    setSplitRatio(newRatio)
  }

  const handleDecreaseWidth = () => {
    const newRatio = Math.max(documentPreview.splitRatio - 0.1, 0.2)
    setSplitRatio(newRatio)
  }

  const handleDownload = async () => {
    if (!documentSession || !user || !accessToken) {
      toast.error('Cannot download: missing document session')
      return
    }

    try {
      toast.loading('Generating document...', { id: 'download-doc' })
      const { fileName, fileData, mimeType } = await downloadCompiledDocument(
        user.id,
        accessToken,
        documentSession.id
      )

      // Create blob and trigger download
      const blob = new Blob([fileData as BlobPart], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      a.click()
      URL.revokeObjectURL(url)

      toast.success('Document downloaded!', { id: 'download-doc' })
    } catch (error) {
      console.error('Error downloading document:', error)
      toast.error('Failed to download document', { id: 'download-doc' })
    }
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        {/* Download button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className="h-8 w-8 p-0"
              disabled={!documentSession}
            >
              <Download className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            Download Compiled Document
          </TooltipContent>
        </Tooltip>

        {/* Preview mode toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleMode}
              className="h-8 w-8 p-0"
            >
              {documentPreview.previewMode === 'text' ? (
                <FileText className="h-4 w-4" />
              ) : (
                <Image className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            Switch to {documentPreview.previewMode === 'text' ? 'Visual' : 'Text'} View
          </TooltipContent>
        </Tooltip>

        {/* Width controls */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDecreaseWidth}
              className="h-8 w-8 p-0"
              disabled={documentPreview.splitRatio <= 0.2}
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            Decrease Preview Width
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleIncreaseWidth}
              className="h-8 w-8 p-0"
              disabled={documentPreview.splitRatio >= 0.8}
            >
              <PanelRight className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            Increase Preview Width
          </TooltipContent>
        </Tooltip>

        {/* Collapse toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleCollapse}
              className="h-8 w-8 p-0"
            >
              {documentPreview.isCollapsed ? (
                <Plus className="h-4 w-4" />
              ) : (
                <Minus className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {documentPreview.isCollapsed ? 'Expand' : 'Collapse'} Preview
          </TooltipContent>
        </Tooltip>

        {/* Hide/show toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleVisibility}
              className="h-8 w-8 p-0"
            >
              {documentPreview.isVisible ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {documentPreview.isVisible ? 'Hide' : 'Show'} Preview
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}