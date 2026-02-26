'use client'

import Link from 'next/link'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { Section } from '@/lib/db/models'

interface SectionSidebarProps {
  bookId: string
  sections: Section[]
  currentSectionId: string
}

export function SectionSidebar({ bookId, sections, currentSectionId }: SectionSidebarProps) {
  return (
    <ScrollArea className="h-full w-64 border-r">
      <div className="p-4 space-y-1">
        <h3 className="text-sm font-medium mb-3">Sections</h3>
        {sections.map(section => (
          <Link
            key={section.id}
            href={`/book/${bookId}/read/${section.id}`}
            className={`flex items-center gap-2 py-2 px-3 rounded text-sm transition-colors ${
              section.id === currentSectionId
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            }`}
          >
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
              section.isRead ? 'bg-green-500' : 'bg-muted-foreground/30'
            }`} />
            <span className="truncate">{section.title}</span>
          </Link>
        ))}
      </div>
    </ScrollArea>
  )
}
