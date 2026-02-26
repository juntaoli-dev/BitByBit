'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Book, Chapter, Section } from '@/lib/db/models'

export type ViewMode = 'pdf' | 'text' | 'side-by-side'

export function useReader(bookId: string, sectionId: string) {
  const [book, setBook] = useState<Book | null>(null)
  const [section, setSection] = useState<Section | null>(null)
  const [chapter, setChapter] = useState<Chapter | null>(null)
  const [chapterSections, setChapterSections] = useState<Section[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('side-by-side')
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    const { BookRepository, SectionRepository } = await import('@/lib/repositories')
    const { db } = await import('@/lib/db/database')
    const { SettingsService } = await import('@/lib/services/settings-service')

    const bookRepo = new BookRepository()
    const sectionRepo = new SectionRepository()
    const settingsService = new SettingsService()

    setViewMode(settingsService.getSettings().defaultViewMode)

    const b = await bookRepo.getById(bookId)
    const s = await db.sections.get(sectionId)
    if (b && s) {
      const ch = await db.chapters.get(s.chapterId)
      const siblings = await sectionRepo.getByChapter(s.chapterId)
      setBook(b)
      setSection(s)
      setChapter(ch ?? null)
      setChapterSections(siblings)
      await bookRepo.updateLastRead(bookId)
    }
    setLoading(false)
  }, [bookId, sectionId])

  useEffect(() => { loadData() }, [loadData])

  const currentIndex = chapterSections.findIndex(s => s.id === sectionId)
  const prevSection = currentIndex > 0 ? chapterSections[currentIndex - 1] : null
  const nextSection = currentIndex < chapterSections.length - 1 ? chapterSections[currentIndex + 1] : null

  return {
    book, section, chapter, chapterSections,
    viewMode, setViewMode,
    prevSection, nextSection,
    loading, refresh: loadData,
  }
}
