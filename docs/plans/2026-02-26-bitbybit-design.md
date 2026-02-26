# Bit by Bit (BBB) — Design Document

## Problem

Traditional reading trackers assume linear reading. Technical book readers skip ahead to sections of interest and intend to finish later, but have no way to track which pages/sections they've actually read. Current workaround: manually ticking off pages in Notion.

## Solution

A web-based PDF reader that:
1. Breaks any book into a "course" structure (chapters → sections), like a Workday training course
2. Tracks reading progress accumulatively — sections visited are marked read regardless of order
3. Provides drill-down progress views and a heatmap grid for at-a-glance coverage

## Data Model

```
Book {
  id: string (uuid)
  title: string
  author: string
  totalPages: number
  pdfBlob: Blob
  coverImage: string (base64 thumbnail)
  structureSource: "native" | "ai" | "manual"
  createdAt: timestamp
  lastReadAt: timestamp
}

Chapter {
  id: string
  bookId: string (FK → Book)
  title: string
  order: number
  startPage: number
  endPage: number
}

Section {
  id: string
  chapterId: string (FK → Chapter)
  bookId: string (FK → Book)
  title: string
  order: number
  startPage: number
  endPage: number
  extractedText: string | null (cached AI extraction)
  isRead: boolean
  readAt: timestamp | null
}
```

All data stored in IndexedDB via Dexie.js for MVP. Schema is extensible — new fields can be added without migrations.

## Book Import & Structure Extraction Pipeline

```
Upload PDF → Store blob in IndexedDB
  → Extract native TOC via PDF.js outline API
  → Has native TOC?
      YES → Show to user: "We found N chapters. Use this structure?"
          → Yes: Build chapters from native TOC
          → No: Run AI splitting
      NO → Notify user, run AI splitting

AI Splitting:
  - 10 pages per batch
  - Send page images to Claude API (vision)
  - If text extractable: send text + images
  - If scanned/non-readable: images only (AI does OCR)
  - Each batch includes context from previous batch for continuity
  - Results cached in Section.extractedText — process once, read forever
  - Progressive loading: user can read processed chapters while rest processes

Processing Priority Queue:
  [User-clicked chapters] > [Sequential background processing]
  - User clicks unprocessed chapter → process it immediately
  - Resume background processing after
  - Already-processed chapters load instantly from cache
```

## UI Screens

### 1. Library
Grid of book cards: cover image, title, progress bar, mini heatmap preview. Click to open.

### 2. Book Dashboard
The "course page" — inspired by Workday training UI:
- Book metadata (title, author, cover)
- Overall progress bar
- Visual heatmap grid (all sections as colored blocks — green=read, gray=unread)
- 3-level drill-down: Book → Chapters (each with progress bar) → Sections (read/unread)
- "Continue Reading" button (last viewed section)
- Pick any section to jump into

### 3. Reader View
Three configurable modes (user toggles between them):
- **PDF only** — full PDF page with section navigation sidebar
- **Text only** — clean extracted text, easy screen reading
- **Side-by-side** — extracted text on left, PDF page on right with viewport box overlay highlighting the current section's location on the page (like LoL minimap camera indicator)

### 4. Section Navigation
- Previous/next section buttons
- Sidebar: all sections in current chapter with read/unread indicators
- Clicking any section navigates to it

## Auto-Tracking Rules
- Section marked "read" after user views it for X seconds (default: 5s, configurable in settings)
- Users can manually toggle read/unread on any section
- Progress calculated as: sections read / total sections (per chapter and per book)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| PDF Rendering | PDF.js |
| Local Storage | Dexie.js (IndexedDB wrapper) |
| AI | Anthropic SDK — Claude API (vision) |
| AI Auth | User-provided API key, stored in localStorage |

## Architecture (Scalability)

```
UI Components (React)
    ↓
Service Layer (BookService, ReadingService, AIService)
    ↓
Repository Layer (BookRepository, ChapterRepository, SectionRepository)
    ↓
Storage Adapter (IndexedDB for MVP → REST API for backend phase)
```

Repository pattern enables backend swap without touching UI or service code.

## MVP Scope

**In (v1):**
- Upload PDF, store locally in IndexedDB
- Native TOC extraction → chapter/section structure
- AI splitting via Claude vision (10 pages/batch, priority queue, cached results)
- Library view with book cards + progress bars
- Book dashboard with 3-level drill-down + heatmap grid
- Reader with 3 modes (PDF / text / side-by-side with viewport box)
- Auto-tracking (time-based) + manual toggle
- Settings: API key, auto-read threshold, default view mode

**Deferred (v2+):**
- Backend + user accounts + cloud sync
- Bookmarks / highlights / annotations
- Search across books
- Social features
- Export progress reports
- Multiple AI provider support
- Mobile-responsive optimization
