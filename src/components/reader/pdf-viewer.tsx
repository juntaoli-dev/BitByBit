'use client'

import { useEffect, useRef, useState } from 'react'

interface PDFViewerProps {
  pdfBlob: Blob
  pageNumber: number
  highlightRegion?: { top: number; height: number } | null
}

export function PDFViewer({ pdfBlob, pageNumber, highlightRegion }: PDFViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const render = async () => {
      try {
        const pdfjs = await import('pdfjs-dist')
        pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`

        const arrayBuffer = await pdfBlob.arrayBuffer()
        const doc = await pdfjs.getDocument({ data: arrayBuffer }).promise
        const page = await doc.getPage(pageNumber)
        const viewport = page.getViewport({ scale: 1.5 })
        const canvas = canvasRef.current
        if (!canvas || cancelled) { doc.destroy(); return }
        canvas.width = viewport.width
        canvas.height = viewport.height
        const ctx = canvas.getContext('2d')!
        await page.render({ canvasContext: ctx, viewport, canvas } as any).promise
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
