'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import type { ChapterWithSections } from '@/hooks/use-book-detail'

interface ChapterAccordionProps {
  bookId: string
  chapters: ChapterWithSections[]
}

export function ChapterAccordion({ bookId, chapters }: ChapterAccordionProps) {
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div className="space-y-2">
      {chapters.map(chapter => (
        <div key={chapter.id} className="border rounded-lg">
          <button
            onClick={() => setExpanded(expanded === chapter.id ? null : chapter.id)}
            className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">{chapter.title}</span>
              <Badge variant="outline" className="text-xs">
                {chapter.progress.read}/{chapter.progress.total}
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <Progress value={chapter.progress.percentage} className="w-24 h-2" />
              <span className="text-xs text-muted-foreground w-8">{chapter.progress.percentage}%</span>
            </div>
          </button>
          {expanded === chapter.id && (
            <div className="px-4 pb-4 space-y-1">
              {chapter.sections.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  No sections yet. Open this chapter to process it with AI.
                </p>
              ) : (
                chapter.sections.map(section => (
                  <Link
                    key={section.id}
                    href={`/book/${bookId}/read/${section.id}`}
                    className="flex items-center justify-between py-2 px-3 rounded hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${section.isRead ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
                      <span className="text-sm">{section.title}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">p.{section.startPage}-{section.endPage}</span>
                  </Link>
                ))
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
