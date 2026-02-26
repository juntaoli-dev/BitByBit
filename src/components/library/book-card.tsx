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
