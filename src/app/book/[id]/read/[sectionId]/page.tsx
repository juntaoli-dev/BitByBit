'use client'

import { use, useCallback } from 'react'
import { useReader } from '@/hooks/use-reader'
import { useAutoTrack } from '@/hooks/use-auto-track'
import { PDFViewer } from '@/components/reader/pdf-viewer'
import { TextViewer } from '@/components/reader/text-viewer'
import { SideBySideViewer } from '@/components/reader/side-by-side-viewer'
import { SectionSidebar } from '@/components/reader/section-sidebar'
import { ReaderToolbar } from '@/components/reader/reader-toolbar'

export default function ReaderPage({ params }: { params: Promise<{ id: string; sectionId: string }> }) {
  const { id: bookId, sectionId } = use(params)
  const {
    book, section, chapterSections,
    viewMode, setViewMode,
    prevSection, nextSection,
    loading, refresh,
  } = useReader(bookId, sectionId)

  const handleMarkedRead = useCallback(() => { refresh() }, [refresh])

  useAutoTrack(sectionId, section?.isRead ?? false, handleMarkedRead)

  if (loading || !book || !section) {
    return <div className="flex justify-center py-20 text-muted-foreground">Loading...</div>
  }

  return (
    <div className="flex flex-col h-screen">
      <ReaderToolbar
        bookId={bookId}
        sectionTitle={section.title}
        isRead={section.isRead}
        sectionId={sectionId}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        prevSection={prevSection}
        nextSection={nextSection}
        onReadToggle={refresh}
      />
      <div className="flex flex-1 overflow-hidden">
        <SectionSidebar
          bookId={bookId}
          sections={chapterSections}
          currentSectionId={sectionId}
        />
        <div className="flex-1 overflow-auto">
          {viewMode === 'pdf' && (
            <div className="p-4">
              <PDFViewer pdfBlob={book.pdfBlob} pageNumber={section.startPage} />
            </div>
          )}
          {viewMode === 'text' && (
            <TextViewer text={section.extractedText} sectionTitle={section.title} />
          )}
          {viewMode === 'side-by-side' && (
            <SideBySideViewer
              pdfBlob={book.pdfBlob}
              pageNumber={section.startPage}
              text={section.extractedText}
              sectionTitle={section.title}
              highlightRegion={null}
            />
          )}
        </div>
      </div>
    </div>
  )
}
