'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { ExcelSheet, ExcelCell } from '@/lib/types'
import { getCellRef } from '@/lib/excel-parser'
import { useExcelEditSync } from '@/hooks/useExcelEditSync'

interface SpreadsheetGridProps {
  sheet: ExcelSheet
  sheetName: string
  onCellEdit: (cellRef: string, value: string) => void
}

/**
 * Spreadsheet grid component using a simple table-based approach
 * Alternative to react-spreadsheet-grid for better compatibility
 */
export function SpreadsheetGrid({
  sheet,
  sheetName,
  onCellEdit,
}: SpreadsheetGridProps) {
  const { syncCellEdit } = useExcelEditSync()
  const [editingCell, setEditingCell] = useState<{
    rowIndex: number
    colIndex: number
  } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [isSyncing, setIsSyncing] = useState(false)

  // Track cell edits from store
  const [cellValues, setCellValues] = useState<Map<string, string>>(new Map())

  // Update local cell values when store changes
  const handleCellChangeFromStore = (cellRef: string, value: string) => {
    setCellValues(prev => new Map(prev).set(cellRef, value))
  }

  const getCellValue = (rowIndex: number, colIndex: number): string => {
    const cellRef = getCellRef(rowIndex, colIndex)
    const storedValue = cellValues.get(cellRef)
    if (storedValue !== undefined) return storedValue

    const cell = sheet.rows[rowIndex]?.[colIndex]
    return cell?.value?.toString() || ''
  }

  const handleCellClick = (rowIndex: number, colIndex: number) => {
    const cellValue = getCellValue(rowIndex, colIndex)
    setEditingCell({ rowIndex, colIndex })
    setEditValue(cellValue)
  }

  const handleCellSave = async () => {
    if (!editingCell) return

    const { rowIndex, colIndex } = editingCell
    const cellRef = getCellRef(rowIndex, colIndex)

    // Update local store
    onCellEdit(cellRef, editValue)
    setCellValues(prev => new Map(prev).set(cellRef, editValue))
    setEditingCell(null)

    // Sync to backend asynchronously
    setIsSyncing(true)
    try {
      const success = await syncCellEdit(sheetName, cellRef, editValue)
      if (success) {
        console.log(`✅ Cell ${cellRef} synced to backend`)
      } else {
        console.warn(`⚠️ Failed to sync cell ${cellRef} to backend`)
      }
    } finally {
      setIsSyncing(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleCellSave()
    } else if (e.key === 'Escape') {
      setEditingCell(null)
    }
  }

  // Column headers
  const columnCount = sheet.columnCount || 10
  const columnLetters = useMemo(() => {
    const letters = []
    for (let i = 0; i < columnCount; i++) {
      let col = ''
      let n = i
      do {
        col = String.fromCharCode(65 + (n % 26)) + col
        n = Math.floor(n / 26) - 1
      } while (n >= 0)
      letters.push(col)
    }
    return letters
  }, [columnCount])

  return (
    <div className="flex-1 overflow-auto bg-background">
      <div className="min-w-full border border-border">
        {/* Header row with column letters */}
        <div className="flex sticky top-0 z-10 bg-muted/50">
          {/* Row number column */}
          <div className="w-12 min-w-[48px] flex items-center justify-center border-r border-border bg-muted text-xs font-semibold text-muted-foreground" />

          {/* Column headers */}
          {columnLetters.map((letter, colIndex) => (
            <div
              key={letter}
              className="min-w-[120px] w-[120px] flex items-center justify-center border-r border-border bg-muted text-xs font-semibold text-muted-foreground py-2"
            >
              {letter}
            </div>
          ))}
        </div>

        {/* Data rows */}
        {sheet.rows.map((row, rowIndex) => (
          <div key={`row-${rowIndex}`} className="flex border-b border-border hover:bg-muted/20">
            {/* Row number */}
            <div className="w-12 min-w-[48px] flex items-center justify-center border-r border-border bg-muted/30 text-xs font-semibold text-muted-foreground">
              {rowIndex + 1}
            </div>

            {/* Cells */}
            {Array.from({ length: columnCount }).map((_, colIndex) => {
              const isEditing =
                editingCell?.rowIndex === rowIndex &&
                editingCell?.colIndex === colIndex
              const cellValue = getCellValue(rowIndex, colIndex)

              return (
                <div
                  key={`cell-${rowIndex}-${colIndex}`}
                  className="min-w-[120px] w-[120px] border-r border-border cursor-text"
                  onClick={() => handleCellClick(rowIndex, colIndex)}
                >
                  {isEditing ? (
                    <input
                      autoFocus
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={handleCellSave}
                      onKeyDown={handleKeyDown}
                      className="w-full h-full px-2 py-2 text-sm border-none outline-none bg-primary/10 text-foreground"
                    />
                  ) : (
                    <div className="px-2 py-2 text-sm text-foreground break-words whitespace-pre-wrap">
                      {cellValue || ''}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
