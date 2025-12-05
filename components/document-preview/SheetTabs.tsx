'use client'

import React from 'react'
import { ExcelSheet } from '@/lib/types'
import { cn } from '@/lib/utils'

interface SheetTabsProps {
  sheets: ExcelSheet[]
  activeIndex: number
  onSheetChange: (index: number) => void
}

export function SheetTabs({
  sheets,
  activeIndex,
  onSheetChange,
}: SheetTabsProps) {
  return (
    <div className="flex border-b border-border bg-muted/30 overflow-x-auto">
      {sheets.map((sheet, index) => (
        <button
          key={`${sheet.name}-${index}`}
          onClick={() => onSheetChange(index)}
          className={cn(
            'px-4 py-2 text-sm font-medium border-r border-border whitespace-nowrap transition-colors',
            activeIndex === index
              ? 'bg-background text-primary border-b-2 border-b-primary -mb-[1px]'
              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
          )}
          title={sheet.name}
        >
          {sheet.name}
        </button>
      ))}
    </div>
  )
}
