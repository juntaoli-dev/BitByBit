import { db } from '@/lib/db/database'
import type { Section } from '@/lib/db/models'

export class SectionRepository {
  async bulkCreate(sections: Section[]): Promise<void> {
    await db.sections.bulkAdd(sections)
  }

  async getByChapter(chapterId: string): Promise<Section[]> {
    return db.sections.where('chapterId').equals(chapterId).sortBy('order')
  }

  async getByBook(bookId: string): Promise<Section[]> {
    return db.sections.where('bookId').equals(bookId).sortBy('order')
  }

  async markAsRead(id: string): Promise<void> {
    await db.sections.update(id, { isRead: true, readAt: Date.now() })
  }

  async markAsUnread(id: string): Promise<void> {
    await db.sections.update(id, { isRead: false, readAt: null })
  }

  async updateExtractedText(id: string, text: string): Promise<void> {
    await db.sections.update(id, { extractedText: text })
  }

  async getBookProgress(bookId: string): Promise<{ read: number; total: number; percentage: number }> {
    const all = await db.sections.where('bookId').equals(bookId).toArray()
    const read = all.filter(s => s.isRead).length
    const total = all.length
    return { read, total, percentage: total === 0 ? 0 : Math.round((read / total) * 100) }
  }

  async getChapterProgress(chapterId: string): Promise<{ read: number; total: number; percentage: number }> {
    const all = await db.sections.where('chapterId').equals(chapterId).toArray()
    const read = all.filter(s => s.isRead).length
    const total = all.length
    return { read, total, percentage: total === 0 ? 0 : Math.round((read / total) * 100) }
  }
}
