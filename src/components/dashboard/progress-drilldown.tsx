'use client'

import { Progress } from '@/components/ui/progress'
import { HeatmapGrid } from './heatmap-grid'
import { ChapterAccordion } from './chapter-accordion'
import type { BookDetail } from '@/hooks/use-book-detail'

interface ProgressDrilldownProps {
  book: BookDetail
}

export function ProgressDrilldown({ book }: ProgressDrilldownProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="font-medium">Overall Progress</span>
          <span className="text-muted-foreground">
            {book.progress.read}/{book.progress.total} sections ({book.progress.percentage}%)
          </span>
        </div>
        <Progress value={book.progress.percentage} className="h-3" />
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium">Reading Heatmap</h3>
        <HeatmapGrid sections={book.allSections} />
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium">Chapters</h3>
        <ChapterAccordion bookId={book.id} chapters={book.chapters} />
      </div>
    </div>
  )
}
