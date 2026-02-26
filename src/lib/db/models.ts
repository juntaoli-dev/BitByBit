export interface Book {
  id: string
  title: string
  author: string
  totalPages: number
  pdfBlob: Blob
  coverImage: string | null
  structureSource: 'native' | 'ai' | 'manual'
  processingStatus: 'pending' | 'processing' | 'complete' | 'error'
  createdAt: number
  lastReadAt: number | null
}

export interface Chapter {
  id: string
  bookId: string
  title: string
  order: number
  startPage: number
  endPage: number
}

export interface Section {
  id: string
  chapterId: string
  bookId: string
  title: string
  order: number
  startPage: number
  endPage: number
  extractedText: string | null
  isRead: boolean
  readAt: number | null
  lastPageViewed: number | null  // last page user was on within this section
  scrollProgress: number | null  // 0-100 scroll percentage in scroll mode
}
