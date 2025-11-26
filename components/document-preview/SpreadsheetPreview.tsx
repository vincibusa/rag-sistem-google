'use client'

import React, { useMemo } from 'react'
import { useChatStore } from '@/store/chat-store'
import { parseExcelStructure } from '@/lib/excel-parser'
import { SheetTabs } from './SheetTabs'
import { SpreadsheetGrid } from './SpreadsheetGrid'

export function SpreadsheetPreview() {
  const { documentPreview, setExcelStructure, setActiveSheet } = useChatStore()
  const document = documentPreview.currentDocument

  // Parse Excel structure from document
  const structure = useMemo(() => {
    if (!document) return null
    return parseExcelStructure(document)
  }, [document?.id, document?.compiled_content, document?.current_compiled_content, document?.extracted_text])

  // Initialize Excel structure if not already done
  React.useEffect(() => {
    if (structure && !documentPreview.excelStructure) {
      setExcelStructure(structure)
    }
  }, [structure, documentPreview.excelStructure, setExcelStructure])

  // Use stored structure or fall back to parsed
  const activeStructure = documentPreview.excelStructure || structure

  if (!activeStructure || activeStructure.sheets.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <p className="mb-2">No Excel data available</p>
          <p className="text-sm">Upload an Excel file to preview</p>
        </div>
      </div>
    )
  }

  const activeSheet = activeStructure.sheets[activeStructure.activeSheetIndex]

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Sheet tabs */}
      {activeStructure.sheets.length > 0 && (
        <SheetTabs
          sheets={activeStructure.sheets}
          activeIndex={activeStructure.activeSheetIndex}
          onSheetChange={setActiveSheet}
        />
      )}

      {/* Spreadsheet grid */}
      {activeSheet && (
        <SpreadsheetGrid
          sheet={activeSheet}
          sheetName={activeSheet.name}
          onCellEdit={(cellRef, value) => {
            const { updateExcelCell } = useChatStore.getState()
            updateExcelCell(activeSheet.name, cellRef, value)
          }}
        />
      )}
    </div>
  )
}
