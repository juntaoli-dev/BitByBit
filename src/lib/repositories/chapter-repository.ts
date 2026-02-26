import { db } from '@/lib/db/database'
import type { Chapter } from '@/lib/db/models'

export class ChapterRepository {
  async bulkCreate(chapters: Chapter[]): Promise<void> {
    await db.chapters.bulkAdd(chapters)
  }

  async getByBook(bookId: string): Promise<Chapter[]> {
    return db.chapters.where('bookId').equals(bookId).sortBy('order')
  }

  async getById(id: string): Promise<Chapter | undefined> {
    return db.chapters.get(id)
  }
}
