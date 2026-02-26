'use client'

import { use, useCallback, useRef, useState } from 'react'
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
    readingMode, setReadingMode,
    prevSection, nextSection,
    loading, refreshReadStatus,
  } = useReader(bookId, sectionId)

  const contentRef = useRef<HTMLDivElement>(null)
  const [sectionProgress, setSectionProgress] = useState(0)

  const handleMarkedRead = useCallback(() => { refreshReadStatus() }, [refreshReadStatus])

  useAutoTrack(sectionId, section?.isRead ?? false, handleMarkedRead, contentRef)

  const handlePageProgress = useCallback((currentPage: number, totalPages: number, scrollPercent: number) => {
    setSectionProgress(scrollPercent)
    // Save progress to DB
    import('@/lib/db/database').then(({ db }) => {
      db.sections.update(sectionId, {
        lastPageViewed: currentPage,
        scrollProgress: scrollPercent,
      })
    })
  }, [sectionId])

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
        readingMode={readingMode}
        onReadingModeChange={setReadingMode}
        prevSection={prevSection}
        nextSection={nextSection}
        onReadToggle={refreshReadStatus}
        sectionProgress={sectionProgress}
      />
      <div className="flex flex-1 overflow-hidden">
        <SectionSidebar
          bookId={bookId}
          sections={chapterSections}
          currentSectionId={sectionId}
        />
        <div className="flex-1 overflow-hidden flex flex-col" ref={contentRef}>
          {viewMode === 'pdf' && (
            <PDFViewer
              pdfBlob={book.pdfBlob}
              startPage={section.startPage}
              endPage={section.endPage}
              readingMode={readingMode}
              onPageProgress={handlePageProgress}
            />
          )}
          {viewMode === 'text' && (
            <div className="flex-1 overflow-auto">
              <TextViewer text={section.extractedText} sectionTitle={section.title} />
            </div>
          )}
          {viewMode === 'side-by-side' && (
            <SideBySideViewer
              pdfBlob={book.pdfBlob}
              startPage={section.startPage}
              endPage={section.endPage}
              text={section.extractedText}
              sectionTitle={section.title}
              readingMode={readingMode}
              onPageProgress={handlePageProgress}
            />
          )}
        </div>
      </div>
    </div>
  )
}
