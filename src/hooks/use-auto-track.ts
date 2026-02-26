'use client'

import { useEffect, useRef, type RefObject } from 'react'

export function useAutoTrack(
  sectionId: string,
  isRead: boolean,
  onMarkedRead: () => void,
  scrollContainerRef: RefObject<HTMLDivElement | null>,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scrollCleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (isRead) return

    const setup = async () => {
      const { SectionRepository } = await import('@/lib/repositories')
      const { SettingsService } = await import('@/lib/services/settings-service')
      const sectionRepo = new SectionRepository()
      const settingsService = new SettingsService()
      const settings = settingsService.getSettings()

      const markRead = async () => {
        await sectionRepo.markAsRead(sectionId)
        onMarkedRead()
      }

      if (settings.trackingMode === 'endofpage') {
        // End-of-page mode: mark as read when user scrolls to bottom
        const container = scrollContainerRef.current
        if (!container) return

        const handleScroll = () => {
          const { scrollTop, scrollHeight, clientHeight } = container
          if (scrollTop + clientHeight >= scrollHeight - 50) {
            markRead()
            container.removeEventListener('scroll', handleScroll)
          }
        }

        container.addEventListener('scroll', handleScroll)
        // Check immediately in case content fits without scrolling
        handleScroll()
        scrollCleanupRef.current = () => container.removeEventListener('scroll', handleScroll)
      } else {
        // Timer mode: mark as read after threshold seconds
        const threshold = settings.autoReadThresholdSeconds * 1000
        timerRef.current = setTimeout(markRead, threshold)
      }
    }

    setup()

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = null
      scrollCleanupRef.current?.()
      scrollCleanupRef.current = null
    }
  }, [sectionId, isRead, onMarkedRead, scrollContainerRef])
}
