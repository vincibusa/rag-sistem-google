'use client'

import React from 'react'
import { useChatStore } from '@/store/chat-store'
import { TextPreview } from './TextPreview'
import { VisualPreview } from './VisualPreview'
import { LayoutControls } from './LayoutControls'
import { cn } from '@/lib/utils'

export function DocumentPreview() {
  const { documentPreview } = useChatStore()

  console.log('🔍 DocumentPreview - State:', {
    isVisible: documentPreview.isVisible,
    hasCurrentDocument: !!documentPreview.currentDocument,
    currentDocument: documentPreview.currentDocument,
    previewMode: documentPreview.previewMode,
    isCollapsed: documentPreview.isCollapsed,
    splitRatio: documentPreview.splitRatio
  })

  if (!documentPreview.isVisible || !documentPreview.currentDocument) {
    console.log('🔍 DocumentPreview - NOT RENDERING: isVisible:', documentPreview.isVisible, 'hasCurrentDocument:', !!documentPreview.currentDocument)
    return null
  }

  return (
    <div className={cn(
      "flex flex-col h-full border-l bg-background",
      documentPreview.isCollapsed && "w-0 overflow-hidden"
    )} style={{
      width: documentPreview.isCollapsed ? '0' : `${documentPreview.splitRatio * 100}%`
    }}>
      {/* Header with layout controls */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">
            {documentPreview.currentDocument.original_file_name}
          </h3>
        </div>
        <LayoutControls />
      </div>

      {/* Preview content */}
      <div className="flex-1 overflow-auto">
        {documentPreview.previewMode === 'text' ? (
          <TextPreview />
        ) : (
          <VisualPreview />
        )}
      </div>
    </div>
  )
}