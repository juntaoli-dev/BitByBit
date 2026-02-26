'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Section } from '@/lib/db/models'
import type { ViewMode } from '@/hooks/use-reader'

interface ReaderToolbarProps {
  bookId: string
  sectionTitle: string
  isRead: boolean
  sectionId: string
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  prevSection: Section | null
  nextSection: Section | null
  onReadToggle: () => void
}

export function ReaderToolbar({
  bookId, sectionTitle, isRead, sectionId,
  viewMode, onViewModeChange,
  prevSection, nextSection, onReadToggle,
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
    <div className="flex items-center justify-between border-b px-4 py-2 bg-background">
      <div className="flex items-center gap-3">
        <Link href={`/book/${bookId}`}>
          <Button variant="ghost" size="sm">&larr; Dashboard</Button>
        </Link>
        <span className="text-sm font-medium">{sectionTitle}</span>
        <Badge
          variant={isRead ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={handleToggleRead}
        >
          {isRead ? 'Read' : 'Mark as Read'}
        </Badge>
      </div>
      <div className="flex items-center gap-2">
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
  )
}
