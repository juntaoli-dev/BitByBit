'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import type { Section } from '@/lib/db/models'
import type { ViewMode } from '@/hooks/use-reader'

interface ReaderToolbarProps {
  bookId: string
  sectionTitle: string
  isRead: boolean
  sectionId: string
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  readingMode: 'scroll' | 'flip'
  onReadingModeChange: (mode: 'scroll' | 'flip') => void
  prevSection: Section | null
  nextSection: Section | null
  onReadToggle: () => void
  sectionProgress: number
}

export function ReaderToolbar({
  bookId, sectionTitle, isRead, sectionId,
  viewMode, onViewModeChange,
  readingMode, onReadingModeChange,
  prevSection, nextSection, onReadToggle,
  sectionProgress,
}: ReaderToolbarProps) {
  const handleToggleRead = async () => {
    const { SectionRepository } = await import('@/lib/repositories')
    const sectionRepo = new SectionRepository()
    if (isRead) {
      await sectionRepo.markAsUnread(sectionId)
    } else {
      await sectionRepo.markAsRead(sectionId)
    }
    onReadToggle()
  }

  return (
    <div className="border-b bg-background">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-3">
          <Link href={`/book/${bookId}`}>
            <Button variant="ghost" size="sm">&larr; Dashboard</Button>
          </Link>
          <span className="text-sm font-medium truncate max-w-[200px]">{sectionTitle}</span>
          <Badge
            variant={isRead ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={handleToggleRead}
          >
            {isRead ? 'Read' : 'Mark as Read'}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex border rounded-md">
            {(['pdf', 'text', 'side-by-side'] as ViewMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => onViewModeChange(mode)}
                className={`px-3 py-1 text-xs capitalize ${
                  viewMode === mode ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
          {/* Reading mode toggle (scroll vs flip) - only for PDF modes */}
          {viewMode !== 'text' && (
            <div className="flex border rounded-md">
              <button
                onClick={() => onReadingModeChange('scroll')}
                className={`px-3 py-1 text-xs ${
                  readingMode === 'scroll' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                }`}
              >
                Scroll
              </button>
              <button
                onClick={() => onReadingModeChange('flip')}
                className={`px-3 py-1 text-xs ${
                  readingMode === 'flip' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                }`}
              >
                Flip
              </button>
            </div>
          )}
          {/* Section nav */}
          <div className="flex gap-1">
            {prevSection && (
              <Link href={`/book/${bookId}/read/${prevSection.id}`}>
                <Button variant="outline" size="sm">&larr; Prev</Button>
              </Link>
            )}
            {nextSection && (
              <Link href={`/book/${bookId}/read/${nextSection.id}`}>
                <Button variant="outline" size="sm">Next &rarr;</Button>
              </Link>
            )}
          </div>
        </div>
      </div>
      {/* Section progress bar */}
      <Progress value={sectionProgress} className="h-1 rounded-none" />
    </div>
  )
}
