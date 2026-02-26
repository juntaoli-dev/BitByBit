import * as pdfjs from 'pdfjs-dist'

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
    try {
      const metadata = await doc.getMetadata()
      const info = metadata.info as Record<string, any>
      return {
        title: info?.Title || 'Untitled',
        author: info?.Author || 'Unknown',
        totalPages: doc.numPages,
      }
    } finally {
      doc.destroy()
    }
  }

  async extractOutline(blob: Blob): Promise<PDFOutlineItem[] | null> {
    const arrayBuffer = await blob.arrayBuffer()
    const doc = await pdfjs.getDocument({ data: arrayBuffer }).promise
    try {
      const outline = await doc.getOutline()
      if (!outline || outline.length === 0) {
        return null
      }
      return outline.map((item: any) => this.mapOutlineItem(item))
    } finally {
      doc.destroy()
    }
  }

  async renderPageToImage(blob: Blob, pageNumber: number, scale: number = 2): Promise<string> {
    const arrayBuffer = await blob.arrayBuffer()
    const doc = await pdfjs.getDocument({ data: arrayBuffer }).promise
    try {
      const page = await doc.getPage(pageNumber)
      const viewport = page.getViewport({ scale })
      const canvas = document.createElement('canvas')
      canvas.width = viewport.width
      canvas.height = viewport.height
      const ctx = canvas.getContext('2d')!
      await page.render({ canvasContext: ctx, viewport, canvas } as unknown as import('pdfjs-dist/types/src/display/api').RenderParameters).promise
      return canvas.toDataURL('image/png')
    } finally {
      doc.destroy()
    }
  }

  async extractPageText(blob: Blob, pageNumber: number): Promise<string> {
    const arrayBuffer = await blob.arrayBuffer()
    const doc = await pdfjs.getDocument({ data: arrayBuffer }).promise
    try {
      const page = await doc.getPage(pageNumber)
      const textContent = await page.getTextContent()
      return textContent.items.map((item: any) => item.str).join(' ')
    } finally {
      doc.destroy()
    }
  }

  private mapOutlineItem(item: any): PDFOutlineItem {
    return {
      title: item.title,
      pageNumber: null,
      children: (item.items || []).map((child: any) => this.mapOutlineItem(child)),
    }
  }
}
