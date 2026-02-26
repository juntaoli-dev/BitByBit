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
      pageNumber: null,
      children: (item.items || []).map((child: any) => this.mapOutlineItem(child)),
    }
  }
}
