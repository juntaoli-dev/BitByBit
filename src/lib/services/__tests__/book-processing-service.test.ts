import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BookProcessingService } from '../book-processing-service'
import { db } from '@/lib/db/database'

vi.mock('../pdf-service', () => {
  const PDFService = vi.fn().mockImplementation(function () {
    return {
      extractMetadata: vi.fn().mockResolvedValue({ title: 'Test', author: 'Auth', totalPages: 20 }),
      extractOutline: vi.fn().mockResolvedValue([
        { title: 'Chapter 1', pageNumber: 1, children: [] },
        { title: 'Chapter 2', pageNumber: 11, children: [] },
      ]),
      renderPageToImage: vi.fn().mockResolvedValue('data:image/png;base64,abc'),
      extractPageText: vi.fn().mockResolvedValue('Some text'),
    }
  })
  return { PDFService }
})

vi.mock('../ai-service', () => {
  const AIService = vi.fn().mockImplementation(function () {
    return {
      splitPagesIntoSections: vi.fn().mockResolvedValue({
        sections: [
          { title: 'Section 1', startPage: 1, endPage: 5, summary: 'First section' },
          { title: 'Section 2', startPage: 6, endPage: 10, summary: 'Second section' },
        ],
      }),
    }
  })
  return { AIService }
})

describe('BookProcessingService', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('should import a book with native TOC structure', async () => {
    const service = new BookProcessingService('test-key')
    const blob = new Blob(['test pdf'])
    const bookId = await service.importBook(blob, { useNativeTOC: true })

    const book = await db.books.get(bookId)
    expect(book?.title).toBe('Test')

    const chapters = await db.chapters.where('bookId').equals(bookId).sortBy('order')
    expect(chapters).toHaveLength(2)
    expect(chapters[0].title).toBe('Chapter 1')
  })

  it('should create sections via AI when requested', async () => {
    const service = new BookProcessingService('test-key')
    const blob = new Blob(['test pdf'])
    const bookId = await service.importBook(blob, { useNativeTOC: false })

    // Process first chapter with AI
    const chapters = await db.chapters.where('bookId').equals(bookId).sortBy('order')
    await service.processChapterWithAI(bookId, chapters[0].id)

    const sections = await db.sections.where('chapterId').equals(chapters[0].id).toArray()
    expect(sections.length).toBeGreaterThan(0)
  })
})
