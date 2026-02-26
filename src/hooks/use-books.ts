'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Book } from '@/lib/db/models'

export interface BookWithProgress extends Book {
  progress: { read: number; total: number; percentage: number }
}

export function useBooks() {
  const [books, setBooks] = useState<BookWithProgress[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    const { BookRepository, SectionRepository } = await import('@/lib/repositories')
    const bookRepo = new BookRepository()
    const sectionRepo = new SectionRepository()
    const allBooks = await bookRepo.listAll()
    const withProgress = await Promise.all(
      allBooks.map(async (book) => {
        const progress = await sectionRepo.getBookProgress(book.id)
        return { ...book, progress }
      })
    )
    setBooks(withProgress)
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return { books, loading, refresh }
}
