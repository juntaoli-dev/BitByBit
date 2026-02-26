# Bit by Bit — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a web-based PDF reading tracker that breaks books into course-like sections and tracks non-linear reading progress.

**Architecture:** Next.js App Router with a layered architecture: UI Components → Service Layer → Repository Layer → Storage Adapter (IndexedDB via Dexie.js). AI splitting uses Anthropic Claude vision API. All data local-first with repository pattern enabling future backend swap.

**Tech Stack:** Next.js 14+, TypeScript, Tailwind CSS, shadcn/ui, PDF.js, Dexie.js, Anthropic SDK

**Design doc:** `docs/plans/2026-02-26-bitbybit-design.md`

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `.gitignore`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`

**Step 1: Initialize Next.js project**

Run:
```bash
cd /Users/juntaoli/Documents/GitHub/BItByBit
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

Accept defaults. This creates the full Next.js scaffold with TypeScript + Tailwind + App Router.

**Step 2: Install core dependencies**

Run:
```bash
npm install dexie pdfjs-dist @anthropic-ai/sdk uuid
npm install -D @types/uuid
```

**Step 3: Initialize shadcn/ui**

Run:
```bash
npx shadcn@latest init -d
```

Accept defaults (New York style, neutral color, CSS variables).

**Step 4: Add shadcn components we'll need**

Run:
```bash
npx shadcn@latest add button card progress dialog input label tabs tooltip scroll-area separator badge slider switch
```

**Step 5: Verify dev server starts**

Run: `npm run dev`
Expected: Server starts on localhost:3000, default Next.js page loads.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js project with Tailwind, shadcn/ui, and core deps"
```

---

### Task 2: Database Layer — Models & Dexie Setup

**Files:**
- Create: `src/lib/db/database.ts`
- Create: `src/lib/db/models.ts`
- Test: `src/lib/db/__tests__/database.test.ts`

**Step 1: Install test dependencies**

Run:
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom fake-indexeddb
```

**Step 2: Configure Vitest**

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['fake-indexeddb/auto'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

Add to `package.json` scripts: `"test": "vitest", "test:run": "vitest run"`

**Step 3: Write the models**

Create `src/lib/db/models.ts`:
```typescript
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
}
```

**Step 4: Write the failing test**

Create `src/lib/db/__tests__/database.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../database'
import { v4 as uuid } from 'uuid'

describe('Database', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('should store and retrieve a book', async () => {
    const book = {
      id: uuid(),
      title: 'Test Book',
      author: 'Author',
      totalPages: 100,
      pdfBlob: new Blob(['test'], { type: 'application/pdf' }),
      coverImage: null,
      structureSource: 'native' as const,
      processingStatus: 'pending' as const,
      createdAt: Date.now(),
      lastReadAt: null,
    }
    await db.books.add(book)
    const retrieved = await db.books.get(book.id)
    expect(retrieved?.title).toBe('Test Book')
  })

  it('should store chapters linked to a book', async () => {
    const bookId = uuid()
    const chapter = {
      id: uuid(),
      bookId,
      title: 'Chapter 1',
      order: 1,
      startPage: 1,
      endPage: 20,
    }
    await db.chapters.add(chapter)
    const chapters = await db.chapters.where('bookId').equals(bookId).toArray()
    expect(chapters).toHaveLength(1)
    expect(chapters[0].title).toBe('Chapter 1')
  })

  it('should store sections linked to a chapter', async () => {
    const bookId = uuid()
    const chapterId = uuid()
    const section = {
      id: uuid(),
      chapterId,
      bookId,
      title: 'Section 1.1',
      order: 1,
      startPage: 1,
      endPage: 5,
      extractedText: null,
      isRead: false,
      readAt: null,
    }
    await db.sections.add(section)
    const sections = await db.sections.where('chapterId').equals(chapterId).toArray()
    expect(sections).toHaveLength(1)
    expect(sections[0].isRead).toBe(false)
  })
})
```

**Step 5: Run test to verify it fails**

Run: `npx vitest run src/lib/db/__tests__/database.test.ts`
Expected: FAIL — `database.ts` doesn't exist.

**Step 6: Write the database implementation**

Create `src/lib/db/database.ts`:
```typescript
import Dexie, { type Table } from 'dexie'
import type { Book, Chapter, Section } from './models'

export class BitByBitDB extends Dexie {
  books!: Table<Book, string>
  chapters!: Table<Chapter, string>
  sections!: Table<Section, string>

  constructor() {
    super('BitByBitDB')
    this.version(1).stores({
      books: 'id, title, createdAt, lastReadAt',
      chapters: 'id, bookId, order',
      sections: 'id, chapterId, bookId, order, isRead',
    })
  }
}

export const db = new BitByBitDB()
```

**Step 7: Run tests to verify they pass**

Run: `npx vitest run src/lib/db/__tests__/database.test.ts`
Expected: All 3 tests PASS.

**Step 8: Commit**

```bash
git add src/lib/db/ vitest.config.ts package.json package-lock.json
git commit -m "feat: add Dexie database layer with Book, Chapter, Section models"
```

---

### Task 3: Repository Layer

**Files:**
- Create: `src/lib/repositories/book-repository.ts`
- Create: `src/lib/repositories/chapter-repository.ts`
- Create: `src/lib/repositories/section-repository.ts`
- Create: `src/lib/repositories/index.ts`
- Test: `src/lib/repositories/__tests__/book-repository.test.ts`
- Test: `src/lib/repositories/__tests__/section-repository.test.ts`

**Step 1: Write failing test for BookRepository**

Create `src/lib/repositories/__tests__/book-repository.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { BookRepository } from '../book-repository'
import { db } from '@/lib/db/database'

describe('BookRepository', () => {
  const repo = new BookRepository()

  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('should create a book and return it', async () => {
    const book = await repo.create({
      title: 'Test Book',
      author: 'Author',
      totalPages: 100,
      pdfBlob: new Blob(['test']),
    })
    expect(book.id).toBeDefined()
    expect(book.structureSource).toBe('native')
    expect(book.processingStatus).toBe('pending')
  })

  it('should list all books sorted by lastReadAt desc', async () => {
    await repo.create({ title: 'Old', author: 'A', totalPages: 10, pdfBlob: new Blob(['a']) })
    const newer = await repo.create({ title: 'New', author: 'B', totalPages: 20, pdfBlob: new Blob(['b']) })
    await repo.updateLastRead(newer.id)
    const books = await repo.listAll()
    expect(books[0].title).toBe('New')
  })

  it('should delete a book and its chapters/sections', async () => {
    const book = await repo.create({ title: 'Del', author: 'A', totalPages: 10, pdfBlob: new Blob(['a']) })
    await db.chapters.add({ id: 'ch1', bookId: book.id, title: 'Ch', order: 1, startPage: 1, endPage: 10 })
    await db.sections.add({ id: 's1', chapterId: 'ch1', bookId: book.id, title: 'S', order: 1, startPage: 1, endPage: 5, extractedText: null, isRead: false, readAt: null })
    await repo.delete(book.id)
    expect(await db.books.get(book.id)).toBeUndefined()
    expect(await db.chapters.where('bookId').equals(book.id).count()).toBe(0)
    expect(await db.sections.where('bookId').equals(book.id).count()).toBe(0)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/repositories/__tests__/book-repository.test.ts`
Expected: FAIL.

**Step 3: Implement BookRepository**

Create `src/lib/repositories/book-repository.ts`:
```typescript
import { v4 as uuid } from 'uuid'
import { db } from '@/lib/db/database'
import type { Book } from '@/lib/db/models'

interface CreateBookInput {
  title: string
  author: string
  totalPages: number
  pdfBlob: Blob
  coverImage?: string | null
}

export class BookRepository {
  async create(input: CreateBookInput): Promise<Book> {
    const book: Book = {
      id: uuid(),
      title: input.title,
      author: input.author,
      totalPages: input.totalPages,
      pdfBlob: input.pdfBlob,
      coverImage: input.coverImage ?? null,
      structureSource: 'native',
      processingStatus: 'pending',
      createdAt: Date.now(),
      lastReadAt: null,
    }
    await db.books.add(book)
    return book
  }

  async getById(id: string): Promise<Book | undefined> {
    return db.books.get(id)
  }

  async listAll(): Promise<Book[]> {
    return db.books.orderBy('lastReadAt').reverse().toArray()
  }

  async updateLastRead(id: string): Promise<void> {
    await db.books.update(id, { lastReadAt: Date.now() })
  }

  async updateProcessingStatus(id: string, status: Book['processingStatus']): Promise<void> {
    await db.books.update(id, { processingStatus: status })
  }

  async delete(id: string): Promise<void> {
    await db.transaction('rw', [db.books, db.chapters, db.sections], async () => {
      await db.sections.where('bookId').equals(id).delete()
      await db.chapters.where('bookId').equals(id).delete()
      await db.books.delete(id)
    })
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/repositories/__tests__/book-repository.test.ts`
Expected: All 3 tests PASS.

**Step 5: Write failing test for SectionRepository**

Create `src/lib/repositories/__tests__/section-repository.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { SectionRepository } from '../section-repository'
import { db } from '@/lib/db/database'
import type { Section } from '@/lib/db/models'

describe('SectionRepository', () => {
  const repo = new SectionRepository()

  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('should mark a section as read', async () => {
    const section: Section = {
      id: 's1', chapterId: 'ch1', bookId: 'b1', title: 'S1',
      order: 1, startPage: 1, endPage: 5, extractedText: null,
      isRead: false, readAt: null,
    }
    await db.sections.add(section)
    await repo.markAsRead('s1')
    const updated = await db.sections.get('s1')
    expect(updated?.isRead).toBe(true)
    expect(updated?.readAt).toBeDefined()
  })

  it('should calculate progress for a book', async () => {
    const sections: Section[] = [
      { id: 's1', chapterId: 'ch1', bookId: 'b1', title: 'S1', order: 1, startPage: 1, endPage: 5, extractedText: null, isRead: true, readAt: Date.now() },
      { id: 's2', chapterId: 'ch1', bookId: 'b1', title: 'S2', order: 2, startPage: 5, endPage: 10, extractedText: null, isRead: false, readAt: null },
    ]
    await db.sections.bulkAdd(sections)
    const progress = await repo.getBookProgress('b1')
    expect(progress.read).toBe(1)
    expect(progress.total).toBe(2)
    expect(progress.percentage).toBe(50)
  })

  it('should get sections by chapter ordered', async () => {
    await db.sections.bulkAdd([
      { id: 's2', chapterId: 'ch1', bookId: 'b1', title: 'Second', order: 2, startPage: 5, endPage: 10, extractedText: null, isRead: false, readAt: null },
      { id: 's1', chapterId: 'ch1', bookId: 'b1', title: 'First', order: 1, startPage: 1, endPage: 5, extractedText: null, isRead: false, readAt: null },
    ])
    const sections = await repo.getByChapter('ch1')
    expect(sections[0].title).toBe('First')
    expect(sections[1].title).toBe('Second')
  })
})
```

**Step 6: Run test to verify it fails**

Run: `npx vitest run src/lib/repositories/__tests__/section-repository.test.ts`
Expected: FAIL.

**Step 7: Implement SectionRepository and ChapterRepository**

Create `src/lib/repositories/section-repository.ts`:
```typescript
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
```

Create `src/lib/repositories/chapter-repository.ts`:
```typescript
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
```

Create `src/lib/repositories/index.ts`:
```typescript
export { BookRepository } from './book-repository'
export { ChapterRepository } from './chapter-repository'
export { SectionRepository } from './section-repository'
```

**Step 8: Run all repository tests**

Run: `npx vitest run src/lib/repositories/__tests__/`
Expected: All 6 tests PASS.

**Step 9: Commit**

```bash
git add src/lib/repositories/
git commit -m "feat: add repository layer for Book, Chapter, Section"
```

---

### Task 4: PDF Service — Upload, Store, Extract Native TOC

**Files:**
- Create: `src/lib/services/pdf-service.ts`
- Test: `src/lib/services/__tests__/pdf-service.test.ts`

**Step 1: Write failing test**

Create `src/lib/services/__tests__/pdf-service.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'
import { PDFService } from '../pdf-service'

// Mock pdfjs-dist since it needs browser APIs
vi.mock('pdfjs-dist', () => ({
  getDocument: vi.fn(),
  GlobalWorkerOptions: { workerSrc: '' },
}))

describe('PDFService', () => {
  const service = new PDFService()

  it('should extract metadata from a PDF', async () => {
    const { getDocument } = await import('pdfjs-dist')
    const mockDoc = {
      numPages: 50,
      getMetadata: vi.fn().mockResolvedValue({
        info: { Title: 'Test Book', Author: 'Test Author' },
      }),
      getOutline: vi.fn().mockResolvedValue(null),
      destroy: vi.fn(),
    }
    vi.mocked(getDocument).mockReturnValue({ promise: Promise.resolve(mockDoc) } as any)

    const result = await service.extractMetadata(new Blob(['test']))
    expect(result.title).toBe('Test Book')
    expect(result.author).toBe('Test Author')
    expect(result.totalPages).toBe(50)
  })

  it('should extract outline when available', async () => {
    const { getDocument } = await import('pdfjs-dist')
    const mockDoc = {
      numPages: 100,
      getMetadata: vi.fn().mockResolvedValue({ info: {} }),
      getOutline: vi.fn().mockResolvedValue([
        { title: 'Chapter 1', dest: 'ch1', items: [] },
        { title: 'Chapter 2', dest: 'ch2', items: [] },
      ]),
      getPage: vi.fn().mockImplementation((pageNum: number) => ({
        getTextContent: vi.fn().mockResolvedValue({ items: [] }),
      })),
      destroy: vi.fn(),
    }
    vi.mocked(getDocument).mockReturnValue({ promise: Promise.resolve(mockDoc) } as any)

    const result = await service.extractOutline(new Blob(['test']))
    expect(result).toHaveLength(2)
    expect(result![0].title).toBe('Chapter 1')
  })

  it('should return null outline when none exists', async () => {
    const { getDocument } = await import('pdfjs-dist')
    const mockDoc = {
      numPages: 10,
      getMetadata: vi.fn().mockResolvedValue({ info: {} }),
      getOutline: vi.fn().mockResolvedValue(null),
      destroy: vi.fn(),
    }
    vi.mocked(getDocument).mockReturnValue({ promise: Promise.resolve(mockDoc) } as any)

    const result = await service.extractOutline(new Blob(['test']))
    expect(result).toBeNull()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/services/__tests__/pdf-service.test.ts`
Expected: FAIL.

**Step 3: Implement PDFService**

Create `src/lib/services/pdf-service.ts`:
```typescript
import * as pdfjs from 'pdfjs-dist'

// Worker will be configured in the component that uses this
// pdfjs.GlobalWorkerOptions.workerSrc = ...

export interface PDFMetadata {
  title: string
  author: string
  totalPages: number
}

export interface PDFOutlineItem {
  title: string
  pageNumber: number | null
  children: PDFOutlineItem[]
}

export class PDFService {
  async extractMetadata(blob: Blob): Promise<PDFMetadata> {
    const arrayBuffer = await blob.arrayBuffer()
    const doc = await pdfjs.getDocument({ data: arrayBuffer }).promise
    const metadata = await doc.getMetadata()
    const info = metadata.info as Record<string, any>
    const result: PDFMetadata = {
      title: info?.Title || 'Untitled',
      author: info?.Author || 'Unknown',
      totalPages: doc.numPages,
    }
    doc.destroy()
    return result
  }

  async extractOutline(blob: Blob): Promise<PDFOutlineItem[] | null> {
    const arrayBuffer = await blob.arrayBuffer()
    const doc = await pdfjs.getDocument({ data: arrayBuffer }).promise
    const outline = await doc.getOutline()
    if (!outline || outline.length === 0) {
      doc.destroy()
      return null
    }
    const items = outline.map((item: any) => this.mapOutlineItem(item))
    doc.destroy()
    return items
  }

  async renderPageToImage(blob: Blob, pageNumber: number, scale: number = 2): Promise<string> {
    const arrayBuffer = await blob.arrayBuffer()
    const doc = await pdfjs.getDocument({ data: arrayBuffer }).promise
    const page = await doc.getPage(pageNumber)
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext('2d')!
    await page.render({ canvasContext: ctx, viewport }).promise
    const dataUrl = canvas.toDataURL('image/png')
    doc.destroy()
    return dataUrl
  }

  async extractPageText(blob: Blob, pageNumber: number): Promise<string> {
    const arrayBuffer = await blob.arrayBuffer()
    const doc = await pdfjs.getDocument({ data: arrayBuffer }).promise
    const page = await doc.getPage(pageNumber)
    const textContent = await page.getTextContent()
    const text = textContent.items.map((item: any) => item.str).join(' ')
    doc.destroy()
    return text
  }

  private mapOutlineItem(item: any): PDFOutlineItem {
    return {
      title: item.title,
      pageNumber: null, // Resolved later via dest
      children: (item.items || []).map((child: any) => this.mapOutlineItem(child)),
    }
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/services/__tests__/pdf-service.test.ts`
Expected: All 3 tests PASS.

**Step 5: Commit**

```bash
git add src/lib/services/
git commit -m "feat: add PDF service for metadata, outline, and page rendering"
```

---

### Task 5: AI Service — Claude Vision Integration for Section Splitting

**Files:**
- Create: `src/lib/services/ai-service.ts`
- Create: `src/lib/services/settings-service.ts`
- Test: `src/lib/services/__tests__/ai-service.test.ts`

**Step 1: Write failing test**

Create `src/lib/services/__tests__/ai-service.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'
import { AIService } from '../ai-service'

// Mock Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{
          type: 'text',
          text: JSON.stringify({
            sections: [
              { title: 'Introduction to Logic', startPage: 1, endPage: 1, summary: 'Overview of logical principles' },
              { title: 'Propositional Logic', startPage: 1, endPage: 2, summary: 'Basic propositional logic' },
              { title: 'Predicate Logic', startPage: 2, endPage: 3, summary: 'First-order predicate logic' },
            ]
          })
        }]
      })
    }
  }))
}))

describe('AIService', () => {
  it('should split pages into sections via Claude vision', async () => {
    const service = new AIService('test-api-key')
    const pageImages = ['data:image/png;base64,abc', 'data:image/png;base64,def']
    const pageTexts = ['Introduction to Logic...', 'Predicate Logic...']

    const result = await service.splitPagesIntoSections({
      pageImages,
      pageTexts,
      startPage: 1,
      bookTitle: 'Logic Textbook',
      previousSectionTitle: null,
    })

    expect(result.sections).toHaveLength(3)
    expect(result.sections[0].title).toBe('Introduction to Logic')
  })

  it('should include previous section context for continuity', async () => {
    const service = new AIService('test-api-key')
    const result = await service.splitPagesIntoSections({
      pageImages: ['data:image/png;base64,abc'],
      pageTexts: ['More content...'],
      startPage: 11,
      bookTitle: 'Logic Textbook',
      previousSectionTitle: 'Propositional Logic',
    })

    expect(result.sections.length).toBeGreaterThan(0)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/services/__tests__/ai-service.test.ts`
Expected: FAIL.

**Step 3: Implement SettingsService**

Create `src/lib/services/settings-service.ts`:
```typescript
const SETTINGS_KEY = 'bbb-settings'

export interface AppSettings {
  anthropicApiKey: string | null
  autoReadThresholdSeconds: number
  defaultViewMode: 'pdf' | 'text' | 'side-by-side'
}

const DEFAULT_SETTINGS: AppSettings = {
  anthropicApiKey: null,
  autoReadThresholdSeconds: 5,
  defaultViewMode: 'side-by-side',
}

export class SettingsService {
  getSettings(): AppSettings {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS
    const stored = localStorage.getItem(SETTINGS_KEY)
    if (!stored) return DEFAULT_SETTINGS
    return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) }
  }

  updateSettings(partial: Partial<AppSettings>): void {
    const current = this.getSettings()
    const updated = { ...current, ...partial }
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated))
  }

  getApiKey(): string | null {
    return this.getSettings().anthropicApiKey
  }
}
```

**Step 4: Implement AIService**

Create `src/lib/services/ai-service.ts`:
```typescript
import Anthropic from '@anthropic-ai/sdk'

interface SplitPagesInput {
  pageImages: string[]  // base64 data URLs
  pageTexts: string[]   // extracted text per page
  startPage: number
  bookTitle: string
  previousSectionTitle: string | null
}

interface SectionResult {
  title: string
  startPage: number
  endPage: number
  summary: string
}

interface SplitPagesOutput {
  sections: SectionResult[]
}

export class AIService {
  private client: Anthropic

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
  }

  async splitPagesIntoSections(input: SplitPagesInput): Promise<SplitPagesOutput> {
    const { pageImages, pageTexts, startPage, bookTitle, previousSectionTitle } = input

    const contextNote = previousSectionTitle
      ? `The previous batch ended with a section titled "${previousSectionTitle}". Continue from where that left off.`
      : 'This is the first batch of pages in the book.'

    const content: Anthropic.MessageCreateParams['messages'][0]['content'] = []

    // Add page images for vision
    for (let i = 0; i < pageImages.length; i++) {
      const base64 = pageImages[i].replace(/^data:image\/\w+;base64,/, '')
      content.push({
        type: 'image',
        source: { type: 'base64', media_type: 'image/png', data: base64 },
      })
      // Add extracted text if available
      if (pageTexts[i] && pageTexts[i].trim().length > 0) {
        content.push({
          type: 'text',
          text: `[Page ${startPage + i} extracted text]: ${pageTexts[i]}`,
        })
      }
    }

    content.push({
      type: 'text',
      text: `You are analyzing pages ${startPage} to ${startPage + pageImages.length - 1} of the book "${bookTitle}".

${contextNote}

Identify all logical sections/topics on these pages. A single page may contain multiple sections. A section may span multiple pages. Break the content into the smallest meaningful units a reader could study independently.

Respond with ONLY valid JSON in this exact format:
{
  "sections": [
    {
      "title": "Clear descriptive title for this section",
      "startPage": <page number where section starts>,
      "endPage": <page number where section ends>,
      "summary": "1-2 sentence summary of what this section covers"
    }
  ]
}`,
    })

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{ role: 'user', content }],
    })

    const text = response.content.find(c => c.type === 'text')?.text || '{}'
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('AI response did not contain valid JSON')

    return JSON.parse(jsonMatch[0]) as SplitPagesOutput
  }
}
```

**Step 5: Run tests to verify they pass**

Run: `npx vitest run src/lib/services/__tests__/ai-service.test.ts`
Expected: All 2 tests PASS.

**Step 6: Commit**

```bash
git add src/lib/services/ai-service.ts src/lib/services/settings-service.ts src/lib/services/__tests__/ai-service.test.ts
git commit -m "feat: add AI service for Claude vision section splitting and settings service"
```

---

### Task 6: Book Processing Pipeline — Orchestrator Service

**Files:**
- Create: `src/lib/services/book-processing-service.ts`
- Test: `src/lib/services/__tests__/book-processing-service.test.ts`

**Step 1: Write failing test**

Create `src/lib/services/__tests__/book-processing-service.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BookProcessingService } from '../book-processing-service'
import { db } from '@/lib/db/database'

vi.mock('../pdf-service', () => ({
  PDFService: vi.fn().mockImplementation(() => ({
    extractMetadata: vi.fn().mockResolvedValue({ title: 'Test', author: 'Auth', totalPages: 20 }),
    extractOutline: vi.fn().mockResolvedValue([
      { title: 'Chapter 1', pageNumber: 1, children: [] },
      { title: 'Chapter 2', pageNumber: 11, children: [] },
    ]),
    renderPageToImage: vi.fn().mockResolvedValue('data:image/png;base64,abc'),
    extractPageText: vi.fn().mockResolvedValue('Some text'),
  })),
}))

vi.mock('../ai-service', () => ({
  AIService: vi.fn().mockImplementation(() => ({
    splitPagesIntoSections: vi.fn().mockResolvedValue({
      sections: [
        { title: 'Section 1', startPage: 1, endPage: 5, summary: 'First section' },
        { title: 'Section 2', startPage: 6, endPage: 10, summary: 'Second section' },
      ],
    }),
  })),
}))

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

    const chapters = await db.chapters.where('bookId').equals(bookId).toArray()
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
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/services/__tests__/book-processing-service.test.ts`
Expected: FAIL.

**Step 3: Implement BookProcessingService**

Create `src/lib/services/book-processing-service.ts`:
```typescript
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
      // Create one chapter per PAGES_PER_BATCH pages as initial structure
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

    // Get previous section for context continuity
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

    // Process priority chapter first if specified
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
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/services/__tests__/book-processing-service.test.ts`
Expected: All 2 tests PASS.

**Step 5: Commit**

```bash
git add src/lib/services/book-processing-service.ts src/lib/services/__tests__/book-processing-service.test.ts
git commit -m "feat: add book processing pipeline with native TOC + AI splitting"
```

---

### Task 7: Library Page — Upload & Book Grid UI

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/app/layout.tsx` (update if needed)
- Create: `src/components/library/book-card.tsx`
- Create: `src/components/library/upload-dialog.tsx`
- Create: `src/components/library/library-grid.tsx`
- Create: `src/hooks/use-books.ts`

**Step 1: Create the useBooks hook**

Create `src/hooks/use-books.ts`:
```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Book } from '@/lib/db/models'
import { BookRepository, SectionRepository } from '@/lib/repositories'

const bookRepo = new BookRepository()
const sectionRepo = new SectionRepository()

export interface BookWithProgress extends Book {
  progress: { read: number; total: number; percentage: number }
}

export function useBooks() {
  const [books, setBooks] = useState<BookWithProgress[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
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
```

**Step 2: Create BookCard component**

Create `src/components/library/book-card.tsx`:
```tsx
'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import type { BookWithProgress } from '@/hooks/use-books'

interface BookCardProps {
  book: BookWithProgress
}

export function BookCard({ book }: BookCardProps) {
  return (
    <Link href={`/book/${book.id}`}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
        <CardContent className="p-4 flex flex-col gap-3">
          <div className="aspect-[3/4] bg-muted rounded-md flex items-center justify-center overflow-hidden">
            {book.coverImage ? (
              <img src={book.coverImage} alt={book.title} className="object-cover w-full h-full" />
            ) : (
              <span className="text-4xl text-muted-foreground">📖</span>
            )}
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-sm line-clamp-2">{book.title}</h3>
            <p className="text-xs text-muted-foreground">{book.author}</p>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{book.progress.percentage}%</span>
              <span>{book.progress.read}/{book.progress.total} sections</span>
            </div>
            <Progress value={book.progress.percentage} className="h-2" />
          </div>
          {book.processingStatus === 'processing' && (
            <Badge variant="secondary" className="text-xs w-fit">Processing...</Badge>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
```

**Step 3: Create UploadDialog component**

Create `src/components/library/upload-dialog.tsx`:
```tsx
'use client'

import { useState, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BookProcessingService } from '@/lib/services/book-processing-service'
import { PDFService } from '@/lib/services/pdf-service'
import { SettingsService } from '@/lib/services/settings-service'

interface UploadDialogProps {
  onBookImported: () => void
}

export function UploadDialog({ onBookImported }: UploadDialogProps) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [hasOutline, setHasOutline] = useState<boolean | null>(null)
  const [step, setStep] = useState<'upload' | 'structure'>('upload')

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    // Check if PDF has native TOC
    const pdfService = new PDFService()
    const outline = await pdfService.extractOutline(f)
    setHasOutline(outline !== null && outline.length > 0)
    setStep('structure')
  }, [])

  const handleImport = useCallback(async (useNativeTOC: boolean) => {
    if (!file) return
    setLoading(true)
    const settings = new SettingsService()
    const apiKey = settings.getApiKey()
    const service = new BookProcessingService(apiKey ?? undefined)
    await service.importBook(file, { useNativeTOC })
    setLoading(false)
    setOpen(false)
    setStep('upload')
    setFile(null)
    onBookImported()
  }, [file, onBookImported])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Upload PDF</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import a Book</DialogTitle>
        </DialogHeader>
        {step === 'upload' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pdf-file">Select PDF file</Label>
              <Input id="pdf-file" type="file" accept=".pdf" onChange={handleFileChange} />
            </div>
          </div>
        )}
        {step === 'structure' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {hasOutline
                ? 'We detected a table of contents in this PDF. Would you like to use it?'
                : 'No table of contents detected. We\'ll use AI to split the book into sections.'}
            </p>
            <div className="flex gap-2">
              {hasOutline && (
                <Button onClick={() => handleImport(true)} disabled={loading}>
                  {loading ? 'Importing...' : 'Use Native TOC'}
                </Button>
              )}
              <Button variant={hasOutline ? 'outline' : 'default'} onClick={() => handleImport(false)} disabled={loading}>
                {loading ? 'Importing...' : 'Use AI Splitting'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
```

**Step 4: Create LibraryGrid component**

Create `src/components/library/library-grid.tsx`:
```tsx
'use client'

import { BookCard } from './book-card'
import type { BookWithProgress } from '@/hooks/use-books'

interface LibraryGridProps {
  books: BookWithProgress[]
}

export function LibraryGrid({ books }: LibraryGridProps) {
  if (books.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <span className="text-6xl mb-4">📚</span>
        <p className="text-lg">No books yet</p>
        <p className="text-sm">Upload a PDF to get started</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {books.map(book => (
        <BookCard key={book.id} book={book} />
      ))}
    </div>
  )
}
```

**Step 5: Wire up the main page**

Update `src/app/page.tsx`:
```tsx
'use client'

import { useBooks } from '@/hooks/use-books'
import { LibraryGrid } from '@/components/library/library-grid'
import { UploadDialog } from '@/components/library/upload-dialog'

export default function HomePage() {
  const { books, loading, refresh } = useBooks()

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Bit by Bit</h1>
          <p className="text-muted-foreground">Your reading progress, section by section</p>
        </div>
        <UploadDialog onBookImported={refresh} />
      </div>
      {loading ? (
        <div className="flex justify-center py-20 text-muted-foreground">Loading...</div>
      ) : (
        <LibraryGrid books={books} />
      )}
    </div>
  )
}
```

**Step 6: Verify it compiles**

Run: `npm run build`
Expected: Build succeeds (or fix any type errors).

**Step 7: Commit**

```bash
git add src/app/page.tsx src/components/library/ src/hooks/
git commit -m "feat: add library page with book grid, upload dialog, and progress display"
```

---

### Task 8: Book Dashboard Page — Progress Drill-Down & Heatmap

**Files:**
- Create: `src/app/book/[id]/page.tsx`
- Create: `src/components/dashboard/progress-drilldown.tsx`
- Create: `src/components/dashboard/heatmap-grid.tsx`
- Create: `src/components/dashboard/chapter-accordion.tsx`
- Create: `src/hooks/use-book-detail.ts`

**Step 1: Create useBookDetail hook**

Create `src/hooks/use-book-detail.ts`:
```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Book, Chapter, Section } from '@/lib/db/models'
import { BookRepository, ChapterRepository, SectionRepository } from '@/lib/repositories'

const bookRepo = new BookRepository()
const chapterRepo = new ChapterRepository()
const sectionRepo = new SectionRepository()

export interface ChapterWithSections extends Chapter {
  sections: Section[]
  progress: { read: number; total: number; percentage: number }
}

export interface BookDetail extends Book {
  chapters: ChapterWithSections[]
  progress: { read: number; total: number; percentage: number }
  allSections: Section[]
}

export function useBookDetail(bookId: string) {
  const [book, setBook] = useState<BookDetail | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    const b = await bookRepo.getById(bookId)
    if (!b) { setLoading(false); return }

    const chapters = await chapterRepo.getByBook(bookId)
    const allSections = await sectionRepo.getByBook(bookId)
    const bookProgress = await sectionRepo.getBookProgress(bookId)

    const chaptersWithSections: ChapterWithSections[] = await Promise.all(
      chapters.map(async (ch) => {
        const sections = await sectionRepo.getByChapter(ch.id)
        const progress = await sectionRepo.getChapterProgress(ch.id)
        return { ...ch, sections, progress }
      })
    )

    setBook({ ...b, chapters: chaptersWithSections, progress: bookProgress, allSections })
    setLoading(false)
  }, [bookId])

  useEffect(() => { refresh() }, [refresh])

  return { book, loading, refresh }
}
```

**Step 2: Create HeatmapGrid component**

Create `src/components/dashboard/heatmap-grid.tsx`:
```tsx
'use client'

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { Section } from '@/lib/db/models'

interface HeatmapGridProps {
  sections: Section[]
  onSectionClick?: (sectionId: string) => void
}

export function HeatmapGrid({ sections, onSectionClick }: HeatmapGridProps) {
  return (
    <TooltipProvider>
      <div className="flex flex-wrap gap-1">
        {sections.map(section => (
          <Tooltip key={section.id}>
            <TooltipTrigger asChild>
              <button
                onClick={() => onSectionClick?.(section.id)}
                className={`w-4 h-4 rounded-sm transition-colors cursor-pointer ${
                  section.isRead
                    ? 'bg-green-500 hover:bg-green-400'
                    : 'bg-muted hover:bg-muted-foreground/20'
                }`}
              />
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">{section.title}</p>
              <p className="text-xs text-muted-foreground">
                {section.isRead ? 'Read' : 'Unread'} — Pages {section.startPage}-{section.endPage}
              </p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  )
}
```

**Step 3: Create ChapterAccordion component**

Create `src/components/dashboard/chapter-accordion.tsx`:
```tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { ChapterWithSections } from '@/hooks/use-book-detail'

interface ChapterAccordionProps {
  bookId: string
  chapters: ChapterWithSections[]
}

export function ChapterAccordion({ bookId, chapters }: ChapterAccordionProps) {
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div className="space-y-2">
      {chapters.map(chapter => (
        <div key={chapter.id} className="border rounded-lg">
          <button
            onClick={() => setExpanded(expanded === chapter.id ? null : chapter.id)}
            className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">{chapter.title}</span>
              <Badge variant="outline" className="text-xs">
                {chapter.progress.read}/{chapter.progress.total}
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <Progress value={chapter.progress.percentage} className="w-24 h-2" />
              <span className="text-xs text-muted-foreground w-8">{chapter.progress.percentage}%</span>
            </div>
          </button>
          {expanded === chapter.id && (
            <div className="px-4 pb-4 space-y-1">
              {chapter.sections.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  No sections yet. Open this chapter to process it with AI.
                </p>
              ) : (
                chapter.sections.map(section => (
                  <Link
                    key={section.id}
                    href={`/book/${bookId}/read/${section.id}`}
                    className="flex items-center justify-between py-2 px-3 rounded hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${section.isRead ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
                      <span className="text-sm">{section.title}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">p.{section.startPage}-{section.endPage}</span>
                  </Link>
                ))
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
```

**Step 4: Create ProgressDrilldown component**

Create `src/components/dashboard/progress-drilldown.tsx`:
```tsx
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
      {/* Overall progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="font-medium">Overall Progress</span>
          <span className="text-muted-foreground">
            {book.progress.read}/{book.progress.total} sections ({book.progress.percentage}%)
          </span>
        </div>
        <Progress value={book.progress.percentage} className="h-3" />
      </div>

      {/* Heatmap */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Reading Heatmap</h3>
        <HeatmapGrid sections={book.allSections} />
      </div>

      {/* Chapter drill-down */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Chapters</h3>
        <ChapterAccordion bookId={book.id} chapters={book.chapters} />
      </div>
    </div>
  )
}
```

**Step 5: Create the Book Dashboard page**

Create `src/app/book/[id]/page.tsx`:
```tsx
'use client'

import { use } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useBookDetail } from '@/hooks/use-book-detail'
import { ProgressDrilldown } from '@/components/dashboard/progress-drilldown'

export default function BookDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { book, loading, refresh } = useBookDetail(id)

  if (loading) {
    return <div className="flex justify-center py-20 text-muted-foreground">Loading...</div>
  }

  if (!book) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Book not found.</p>
        <Link href="/"><Button variant="outline" className="mt-4">Back to Library</Button></Link>
      </div>
    )
  }

  // Find last read section or first unread section for "Continue Reading"
  const lastReadSection = [...book.allSections]
    .filter(s => s.isRead)
    .sort((a, b) => (b.readAt ?? 0) - (a.readAt ?? 0))[0]
  const firstUnreadSection = book.allSections.find(s => !s.isRead)
  const continueSection = lastReadSection ?? firstUnreadSection

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Link href="/" className="text-sm text-muted-foreground hover:underline mb-4 inline-block">
        ← Back to Library
      </Link>

      {/* Book header */}
      <div className="flex gap-6 mb-8">
        <div className="w-32 h-44 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
          {book.coverImage ? (
            <img src={book.coverImage} alt={book.title} className="object-cover w-full h-full rounded-lg" />
          ) : (
            <span className="text-5xl">📖</span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold">{book.title}</h1>
          <p className="text-muted-foreground">{book.author}</p>
          <div className="flex gap-2 mt-1">
            <Badge variant="outline">{book.totalPages} pages</Badge>
            <Badge variant="outline">{book.chapters.length} chapters</Badge>
            <Badge variant="outline">{book.allSections.length} sections</Badge>
          </div>
          {continueSection && (
            <Link href={`/book/${book.id}/read/${continueSection.id}`} className="mt-2">
              <Button>Continue Reading</Button>
            </Link>
          )}
        </div>
      </div>

      {/* Progress drill-down */}
      <ProgressDrilldown book={book} />
    </div>
  )
}
```

**Step 6: Verify it compiles**

Run: `npm run build`
Expected: Build succeeds.

**Step 7: Commit**

```bash
git add src/app/book/ src/components/dashboard/ src/hooks/use-book-detail.ts
git commit -m "feat: add book dashboard with progress drill-down and heatmap grid"
```

---

### Task 9: Reader View — PDF, Text, and Side-by-Side Modes

**Files:**
- Create: `src/app/book/[id]/read/[sectionId]/page.tsx`
- Create: `src/components/reader/pdf-viewer.tsx`
- Create: `src/components/reader/text-viewer.tsx`
- Create: `src/components/reader/side-by-side-viewer.tsx`
- Create: `src/components/reader/section-sidebar.tsx`
- Create: `src/components/reader/reader-toolbar.tsx`
- Create: `src/hooks/use-reader.ts`
- Create: `src/hooks/use-auto-track.ts`

**Step 1: Create useReader hook**

Create `src/hooks/use-reader.ts`:
```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Book, Chapter, Section } from '@/lib/db/models'
import { db } from '@/lib/db/database'
import { BookRepository, SectionRepository } from '@/lib/repositories'
import { SettingsService } from '@/lib/services/settings-service'

const bookRepo = new BookRepository()
const sectionRepo = new SectionRepository()
const settingsService = new SettingsService()

export type ViewMode = 'pdf' | 'text' | 'side-by-side'

export function useReader(bookId: string, sectionId: string) {
  const [book, setBook] = useState<Book | null>(null)
  const [section, setSection] = useState<Section | null>(null)
  const [chapter, setChapter] = useState<Chapter | null>(null)
  const [chapterSections, setChapterSections] = useState<Section[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>(settingsService.getSettings().defaultViewMode)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
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
```

**Step 2: Create useAutoTrack hook**

Create `src/hooks/use-auto-track.ts`:
```typescript
'use client'

import { useEffect, useRef } from 'react'
import { SectionRepository } from '@/lib/repositories'
import { SettingsService } from '@/lib/services/settings-service'

const sectionRepo = new SectionRepository()
const settingsService = new SettingsService()

export function useAutoTrack(sectionId: string, isRead: boolean, onMarkedRead: () => void) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (isRead) return

    const threshold = settingsService.getSettings().autoReadThresholdSeconds * 1000
    timerRef.current = setTimeout(async () => {
      await sectionRepo.markAsRead(sectionId)
      onMarkedRead()
    }, threshold)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [sectionId, isRead, onMarkedRead])
}
```

**Step 3: Create PDFViewer component**

Create `src/components/reader/pdf-viewer.tsx`:
```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import * as pdfjs from 'pdfjs-dist'

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`

interface PDFViewerProps {
  pdfBlob: Blob
  pageNumber: number
  highlightRegion?: { top: number; height: number } | null  // viewport box as percentage
}

export function PDFViewer({ pdfBlob, pageNumber, highlightRegion }: PDFViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const render = async () => {
      try {
        const arrayBuffer = await pdfBlob.arrayBuffer()
        const doc = await pdfjs.getDocument({ data: arrayBuffer }).promise
        const page = await doc.getPage(pageNumber)
        const viewport = page.getViewport({ scale: 1.5 })
        const canvas = canvasRef.current
        if (!canvas || cancelled) { doc.destroy(); return }
        canvas.width = viewport.width
        canvas.height = viewport.height
        const ctx = canvas.getContext('2d')!
        await page.render({ canvasContext: ctx, viewport }).promise
        doc.destroy()
      } catch (err) {
        if (!cancelled) setError('Failed to render PDF page')
      }
    }
    render()
    return () => { cancelled = true }
  }, [pdfBlob, pageNumber])

  if (error) return <div className="text-red-500 p-4">{error}</div>

  return (
    <div className="relative inline-block">
      <canvas ref={canvasRef} className="max-w-full h-auto" />
      {highlightRegion && (
        <div
          className="absolute left-0 right-0 border-2 border-blue-500 bg-blue-500/10 pointer-events-none"
          style={{ top: `${highlightRegion.top}%`, height: `${highlightRegion.height}%` }}
        />
      )}
    </div>
  )
}
```

**Step 4: Create TextViewer component**

Create `src/components/reader/text-viewer.tsx`:
```tsx
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
```

**Step 5: Create SideBySideViewer component**

Create `src/components/reader/side-by-side-viewer.tsx`:
```tsx
'use client'

import { PDFViewer } from './pdf-viewer'
import { TextViewer } from './text-viewer'
import { ScrollArea } from '@/components/ui/scroll-area'

interface SideBySideViewerProps {
  pdfBlob: Blob
  pageNumber: number
  text: string | null
  sectionTitle: string
  highlightRegion?: { top: number; height: number } | null
}

export function SideBySideViewer({ pdfBlob, pageNumber, text, sectionTitle, highlightRegion }: SideBySideViewerProps) {
  return (
    <div className="grid grid-cols-2 gap-4 h-full">
      <ScrollArea className="h-full">
        <div className="p-4">
          <TextViewer text={text} sectionTitle={sectionTitle} />
        </div>
      </ScrollArea>
      <ScrollArea className="h-full border-l">
        <div className="p-4">
          <PDFViewer pdfBlob={pdfBlob} pageNumber={pageNumber} highlightRegion={highlightRegion} />
        </div>
      </ScrollArea>
    </div>
  )
}
```

**Step 6: Create SectionSidebar component**

Create `src/components/reader/section-sidebar.tsx`:
```tsx
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
```

**Step 7: Create ReaderToolbar component**

Create `src/components/reader/reader-toolbar.tsx`:
```tsx
'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Section } from '@/lib/db/models'
import type { ViewMode } from '@/hooks/use-reader'
import { SectionRepository } from '@/lib/repositories'

const sectionRepo = new SectionRepository()

interface ReaderToolbarProps {
  bookId: string
  sectionTitle: string
  isRead: boolean
  sectionId: string
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  prevSection: Section | null
  nextSection: Section | null
  onReadToggle: () => void
}

export function ReaderToolbar({
  bookId, sectionTitle, isRead, sectionId,
  viewMode, onViewModeChange,
  prevSection, nextSection, onReadToggle,
}: ReaderToolbarProps) {
  const handleToggleRead = async () => {
    if (isRead) {
      await sectionRepo.markAsUnread(sectionId)
    } else {
      await sectionRepo.markAsRead(sectionId)
    }
    onReadToggle()
  }

  return (
    <div className="flex items-center justify-between border-b px-4 py-2 bg-background">
      <div className="flex items-center gap-3">
        <Link href={`/book/${bookId}`}>
          <Button variant="ghost" size="sm">← Dashboard</Button>
        </Link>
        <span className="text-sm font-medium">{sectionTitle}</span>
        <Badge
          variant={isRead ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={handleToggleRead}
        >
          {isRead ? 'Read' : 'Mark as Read'}
        </Badge>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex border rounded-md">
          {(['pdf', 'text', 'side-by-side'] as ViewMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => onViewModeChange(mode)}
              className={`px-3 py-1 text-xs capitalize ${
                viewMode === mode ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {prevSection && (
            <Link href={`/book/${bookId}/read/${prevSection.id}`}>
              <Button variant="outline" size="sm">← Prev</Button>
            </Link>
          )}
          {nextSection && (
            <Link href={`/book/${bookId}/read/${nextSection.id}`}>
              <Button variant="outline" size="sm">Next →</Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
```

**Step 8: Create the Reader page**

Create `src/app/book/[id]/read/[sectionId]/page.tsx`:
```tsx
'use client'

import { use, useCallback } from 'react'
import { useReader } from '@/hooks/use-reader'
import { useAutoTrack } from '@/hooks/use-auto-track'
import { PDFViewer } from '@/components/reader/pdf-viewer'
import { TextViewer } from '@/components/reader/text-viewer'
import { SideBySideViewer } from '@/components/reader/side-by-side-viewer'
import { SectionSidebar } from '@/components/reader/section-sidebar'
import { ReaderToolbar } from '@/components/reader/reader-toolbar'

export default function ReaderPage({ params }: { params: Promise<{ id: string; sectionId: string }> }) {
  const { id: bookId, sectionId } = use(params)
  const {
    book, section, chapterSections,
    viewMode, setViewMode,
    prevSection, nextSection,
    loading, refresh,
  } = useReader(bookId, sectionId)

  const handleMarkedRead = useCallback(() => { refresh() }, [refresh])

  useAutoTrack(sectionId, section?.isRead ?? false, handleMarkedRead)

  if (loading || !book || !section) {
    return <div className="flex justify-center py-20 text-muted-foreground">Loading...</div>
  }

  return (
    <div className="flex flex-col h-screen">
      <ReaderToolbar
        bookId={bookId}
        sectionTitle={section.title}
        isRead={section.isRead}
        sectionId={sectionId}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        prevSection={prevSection}
        nextSection={nextSection}
        onReadToggle={refresh}
      />
      <div className="flex flex-1 overflow-hidden">
        <SectionSidebar
          bookId={bookId}
          sections={chapterSections}
          currentSectionId={sectionId}
        />
        <div className="flex-1 overflow-auto">
          {viewMode === 'pdf' && (
            <div className="p-4">
              <PDFViewer pdfBlob={book.pdfBlob} pageNumber={section.startPage} />
            </div>
          )}
          {viewMode === 'text' && (
            <TextViewer text={section.extractedText} sectionTitle={section.title} />
          )}
          {viewMode === 'side-by-side' && (
            <SideBySideViewer
              pdfBlob={book.pdfBlob}
              pageNumber={section.startPage}
              text={section.extractedText}
              sectionTitle={section.title}
              highlightRegion={null}
            />
          )}
        </div>
      </div>
    </div>
  )
}
```

**Step 9: Verify it compiles**

Run: `npm run build`
Expected: Build succeeds.

**Step 10: Commit**

```bash
git add src/app/book/ src/components/reader/ src/hooks/use-reader.ts src/hooks/use-auto-track.ts
git commit -m "feat: add reader view with PDF, text, and side-by-side modes plus auto-tracking"
```

---

### Task 10: Settings Page

**Files:**
- Create: `src/app/settings/page.tsx`
- Update: `src/app/page.tsx` (add settings link)

**Step 1: Create Settings page**

Create `src/app/settings/page.tsx`:
```tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { SettingsService, type AppSettings } from '@/lib/services/settings-service'

const settingsService = new SettingsService()

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(settingsService.getSettings())
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    settingsService.updateSettings(settings)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Link href="/" className="text-sm text-muted-foreground hover:underline mb-4 inline-block">
        ← Back to Library
      </Link>
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="api-key">Anthropic API Key</Label>
          <Input
            id="api-key"
            type="password"
            placeholder="sk-ant-..."
            value={settings.anthropicApiKey ?? ''}
            onChange={e => setSettings({ ...settings, anthropicApiKey: e.target.value || null })}
          />
          <p className="text-xs text-muted-foreground">
            Required for AI-powered section splitting. Your key stays in your browser.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Auto-read threshold: {settings.autoReadThresholdSeconds}s</Label>
          <Slider
            value={[settings.autoReadThresholdSeconds]}
            onValueChange={([v]) => setSettings({ ...settings, autoReadThresholdSeconds: v })}
            min={1}
            max={30}
            step={1}
          />
          <p className="text-xs text-muted-foreground">
            Sections are marked as read after viewing for this many seconds.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Default view mode</Label>
          <div className="flex gap-2">
            {(['pdf', 'text', 'side-by-side'] as const).map(mode => (
              <Button
                key={mode}
                variant={settings.defaultViewMode === mode ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSettings({ ...settings, defaultViewMode: mode })}
                className="capitalize"
              >
                {mode}
              </Button>
            ))}
          </div>
        </div>

        <Button onClick={handleSave}>
          {saved ? 'Saved!' : 'Save Settings'}
        </Button>
      </div>
    </div>
  )
}
```

**Step 2: Add settings link to library page**

In `src/app/page.tsx`, add a settings link next to the UploadDialog button:
```tsx
// Inside the header div, after UploadDialog:
<div className="flex gap-2">
  <UploadDialog onBookImported={refresh} />
  <Link href="/settings">
    <Button variant="outline">Settings</Button>
  </Link>
</div>
```

**Step 3: Verify it compiles**

Run: `npm run build`
Expected: Build succeeds.

**Step 4: Commit**

```bash
git add src/app/settings/ src/app/page.tsx
git commit -m "feat: add settings page for API key, auto-read threshold, and view mode"
```

---

### Task 11: AI Processing Trigger in Book Dashboard

**Files:**
- Modify: `src/app/book/[id]/page.tsx`
- Create: `src/components/dashboard/process-button.tsx`

**Step 1: Create ProcessButton component**

Create `src/components/dashboard/process-button.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { BookProcessingService } from '@/lib/services/book-processing-service'
import { SettingsService } from '@/lib/services/settings-service'

interface ProcessButtonProps {
  bookId: string
  totalChapters: number
  onComplete: () => void
}

export function ProcessButton({ bookId, totalChapters, onComplete }: ProcessButtonProps) {
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const handleProcess = async () => {
    const settings = new SettingsService()
    const apiKey = settings.getApiKey()
    if (!apiKey) {
      setError('Please set your Anthropic API key in Settings first.')
      return
    }

    setProcessing(true)
    setError(null)
    try {
      const service = new BookProcessingService(apiKey)
      await service.processAllChaptersWithAI(bookId, (processed, total) => {
        setProgress(Math.round((processed / total) * 100))
      })
      onComplete()
    } catch (err: any) {
      setError(err.message ?? 'Processing failed')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="space-y-2">
      {processing ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Processing with AI... {progress}%</p>
          <Progress value={progress} className="h-2" />
        </div>
      ) : (
        <Button onClick={handleProcess} variant="secondary">
          Process All Chapters with AI
        </Button>
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}
```

**Step 2: Add ProcessButton to Book Dashboard**

In `src/app/book/[id]/page.tsx`, import and add after the "Continue Reading" button:
```tsx
import { ProcessButton } from '@/components/dashboard/process-button'

// After the continue reading button, inside the book header:
{book.processingStatus !== 'complete' && (
  <ProcessButton bookId={book.id} totalChapters={book.chapters.length} onComplete={refresh} />
)}
```

**Step 3: Verify it compiles**

Run: `npm run build`
Expected: Build succeeds.

**Step 4: Commit**

```bash
git add src/components/dashboard/process-button.tsx src/app/book/
git commit -m "feat: add AI processing trigger button to book dashboard"
```

---

### Task 12: End-to-End Manual Test & Polish

**Files:**
- Various fixes as discovered during testing

**Step 1: Start dev server and test the full flow**

Run: `npm run dev`

Test manually:
1. Go to localhost:3000 — library should show empty state
2. Go to Settings — enter Anthropic API key
3. Upload a PDF — should detect TOC or offer AI splitting
4. Book should appear in library with 0% progress
5. Click book — dashboard should show chapters, empty heatmap
6. Click "Process with AI" — should show progress bar
7. After processing, sections should appear in chapters
8. Click a section — reader should show PDF/text/side-by-side
9. Wait 5 seconds — section should auto-mark as read
10. Go back to dashboard — progress bar and heatmap should update

**Step 2: Fix any issues discovered**

Fix compilation errors, runtime errors, or UX issues found during testing.

**Step 3: Final commit**

```bash
git add -A
git commit -m "fix: polish and bug fixes from end-to-end testing"
```

---

## Summary

| Task | Description | Est. Steps |
|------|------------|-----------|
| 1 | Project scaffolding (Next.js + deps) | 6 |
| 2 | Database layer (Dexie + models) | 8 |
| 3 | Repository layer (CRUD operations) | 9 |
| 4 | PDF service (metadata, TOC, rendering) | 5 |
| 5 | AI service (Claude vision splitting) | 6 |
| 6 | Book processing pipeline (orchestrator) | 5 |
| 7 | Library page (upload + book grid) | 7 |
| 8 | Book dashboard (progress + heatmap) | 7 |
| 9 | Reader view (3 modes + auto-tracking) | 10 |
| 10 | Settings page | 4 |
| 11 | AI processing trigger in dashboard | 4 |
| 12 | End-to-end test & polish | 3 |
