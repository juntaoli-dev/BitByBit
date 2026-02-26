'use client'

import { ScrollArea } from '@/components/ui/scroll-area'

interface TextViewerProps {
  text: string | null
  sectionTitle: string
}

export function TextViewer({ text, sectionTitle }: TextViewerProps) {
  if (!text) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground p-8">
        <p>No extracted text available. Process this chapter with AI first.</p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="prose prose-sm max-w-none p-6">
        <h2>{sectionTitle}</h2>
        <div className="whitespace-pre-wrap">{text}</div>
      </div>
    </ScrollArea>
  )
}
