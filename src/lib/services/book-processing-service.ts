import { v4 as uuid } from 'uuid'
import { db } from '@/lib/db/database'
import type { Book, Chapter, Section } from '@/lib/db/models'
import { PDFService } from './pdf-service'
import { AIService } from './ai-service'

const PAGES_PER_BATCH = 10

interface ImportOptions {
  useNativeTOC: boolean
}

export class BookProcessingService {
  private pdfService: PDFService
  private aiService: AIService | null

  constructor(apiKey?: string) {
    this.pdfService = new PDFService()
    this.aiService = apiKey ? new AIService(apiKey) : null
  }

  async importBook(blob: Blob, options: ImportOptions): Promise<string> {
    const metadata = await this.pdfService.extractMetadata(blob)
    const outline = await this.pdfService.extractOutline(blob)

    const book: Book = {
      id: uuid(),
      title: metadata.title,
      author: metadata.author,
      totalPages: metadata.totalPages,
      pdfBlob: blob,
      coverImage: null,
      structureSource: options.useNativeTOC && outline ? 'native' : 'ai',
      processingStatus: 'pending',
      createdAt: Date.now(),
      lastReadAt: null,
    }
    await db.books.add(book)

    if (options.useNativeTOC && outline) {
      await this.buildChaptersFromOutline(book.id, outline, metadata.totalPages)
    } else {
      await this.buildDefaultChapters(book.id, metadata.totalPages)
    }

    return book.id
  }

  async processChapterWithAI(bookId: string, chapterId: string): Promise<void> {
    if (!this.aiService) throw new Error('No API key configured')

    const book = await db.books.get(bookId)
    if (!book) throw new Error('Book not found')

    const chapter = await db.chapters.get(chapterId)
    if (!chapter) throw new Error('Chapter not found')

    await db.books.update(bookId, { processingStatus: 'processing' })

    const pageImages: string[] = []
    const pageTexts: string[] = []

    for (let page = chapter.startPage; page <= chapter.endPage; page++) {
      const image = await this.pdfService.renderPageToImage(book.pdfBlob, page)
      const text = await this.pdfService.extractPageText(book.pdfBlob, page)
      pageImages.push(image)
      pageTexts.push(text)
    }

    const existingSections = await db.sections
      .where('bookId').equals(bookId)
      .sortBy('order')
    const lastSection = existingSections.length > 0
      ? existingSections[existingSections.length - 1]
      : null

    const result = await this.aiService.splitPagesIntoSections({
      pageImages,
      pageTexts,
      startPage: chapter.startPage,
      bookTitle: book.title,
      previousSectionTitle: lastSection?.title ?? null,
    })

    const baseOrder = existingSections.length
    const sections: Section[] = result.sections.map((s, i) => ({
      id: uuid(),
      chapterId,
      bookId,
      title: s.title,
      order: baseOrder + i + 1,
      startPage: s.startPage,
      endPage: s.endPage,
      extractedText: s.summary,
      isRead: false,
      readAt: null,
    }))

    await db.sections.bulkAdd(sections)
  }

  async processAllChaptersWithAI(
    bookId: string,
    onProgress?: (processed: number, total: number) => void,
    priorityChapterId?: string,
  ): Promise<void> {
    const chapters = await db.chapters.where('bookId').equals(bookId).sortBy('order')

    if (priorityChapterId) {
      const priorityChapter = chapters.find(c => c.id === priorityChapterId)
      if (priorityChapter) {
        await this.processChapterWithAI(bookId, priorityChapter.id)
        onProgress?.(1, chapters.length)
      }
    }

    let processed = priorityChapterId ? 1 : 0
    for (const chapter of chapters) {
      if (chapter.id === priorityChapterId) continue
      const existingSections = await db.sections.where('chapterId').equals(chapter.id).count()
      if (existingSections > 0) { processed++; continue }
      await this.processChapterWithAI(bookId, chapter.id)
      processed++
      onProgress?.(processed, chapters.length)
    }

    await db.books.update(bookId, { processingStatus: 'complete' })
  }

  private async buildChaptersFromOutline(
    bookId: string,
    outline: { title: string; pageNumber: number | null; children: any[] }[],
    totalPages: number,
  ): Promise<void> {
    const chapters: Chapter[] = outline.map((item, i) => {
      const startPage = item.pageNumber ?? (i === 0 ? 1 : Math.floor((i / outline.length) * totalPages) + 1)
      const endPage = i < outline.length - 1
        ? (outline[i + 1].pageNumber ?? Math.floor(((i + 1) / outline.length) * totalPages)) - 1
        : totalPages
      return {
        id: uuid(),
        bookId,
        title: item.title,
        order: i + 1,
        startPage,
        endPage: Math.max(startPage, endPage),
      }
    })
    await db.chapters.bulkAdd(chapters)
  }

  private async buildDefaultChapters(bookId: string, totalPages: number): Promise<void> {
    const chapters: Chapter[] = []
    for (let start = 1; start <= totalPages; start += PAGES_PER_BATCH) {
      const end = Math.min(start + PAGES_PER_BATCH - 1, totalPages)
      chapters.push({
        id: uuid(),
        bookId,
        title: `Pages ${start}-${end}`,
        order: chapters.length + 1,
        startPage: start,
        endPage: end,
      })
    }
    await db.chapters.bulkAdd(chapters)
  }
}
