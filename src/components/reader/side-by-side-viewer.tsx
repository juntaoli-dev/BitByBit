'use client'

import { PDFViewer } from './pdf-viewer'
import { TextViewer } from './text-viewer'
import { ScrollArea } from '@/components/ui/scroll-area'

interface SideBySideViewerProps {
  pdfBlob: Blob
  pageNumber: number
  text: string | null
  sectionTitle: string
  highlightRegion?: { top: number; height: number } | null
}

export function SideBySideViewer({ pdfBlob, pageNumber, text, sectionTitle, highlightRegion }: SideBySideViewerProps) {
  return (
    <div className="grid grid-cols-2 gap-4 h-full">
      <ScrollArea className="h-full">
        <div className="p-4">
          <TextViewer text={text} sectionTitle={sectionTitle} />
        </div>
      </ScrollArea>
      <ScrollArea className="h-full border-l">
        <div className="p-4">
          <PDFViewer pdfBlob={pdfBlob} pageNumber={pageNumber} highlightRegion={highlightRegion} />
        </div>
      </ScrollArea>
    </div>
  )
}
