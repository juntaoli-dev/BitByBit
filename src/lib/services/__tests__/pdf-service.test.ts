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
