'use client'

import { PDFViewer } from './pdf-viewer'
import { TextViewer } from './text-viewer'
import { ScrollArea } from '@/components/ui/scroll-area'

interface SideBySideViewerProps {
  pdfBlob: Blob
  startPage: number
  endPage: number
  text: string | null
  sectionTitle: string
  readingMode: 'scroll' | 'flip'
  highlightRegion?: { top: number; height: number } | null
  onPageProgress?: (currentPage: number, totalPages: number, scrollPercent: number) => void
}

export function SideBySideViewer({ pdfBlob, startPage, endPage, text, sectionTitle, readingMode, onPageProgress }: SideBySideViewerProps) {
  return (
    <div className="grid grid-cols-2 h-full">
      <ScrollArea className="h-full">
        <div className="p-4">
          <TextViewer text={text} sectionTitle={sectionTitle} />
        </div>
      </ScrollArea>
      <div className="h-full border-l">
        <PDFViewer
          pdfBlob={pdfBlob}
          startPage={startPage}
          endPage={endPage}
          readingMode={readingMode}
          onPageProgress={onPageProgress}
        />
      </div>
    </div>
  )
}
