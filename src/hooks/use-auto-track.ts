'use client'

import { useEffect, useRef } from 'react'

export function useAutoTrack(sectionId: string, isRead: boolean, onMarkedRead: () => void) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (isRead) return

    const startTimer = async () => {
      const { SectionRepository } = await import('@/lib/repositories')
      const { SettingsService } = await import('@/lib/services/settings-service')
      const sectionRepo = new SectionRepository()
      const settingsService = new SettingsService()
      const threshold = settingsService.getSettings().autoReadThresholdSeconds * 1000

      timerRef.current = setTimeout(async () => {
        await sectionRepo.markAsRead(sectionId)
        onMarkedRead()
      }, threshold)
    }

    startTimer()

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [sectionId, isRead, onMarkedRead])
}
