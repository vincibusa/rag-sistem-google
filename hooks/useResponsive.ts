'use client'

import { useState, useEffect } from 'react'

export type Breakpoint = 'sm' | 'md' | 'lg' | 'xl'

interface MediaQueryResult {
  isMobile: boolean    // < 768px
  isTablet: boolean    // 768px - 1024px
  isDesktop: boolean   // >= 1024px
  breakpoint: Breakpoint
}

/**
 * Hook to detect responsive breakpoints
 * Updates on window resize with debouncing
 */
export function useResponsive(): MediaQueryResult {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('lg')

  useEffect(() => {
    // Check initial breakpoint
    const checkBreakpoint = () => {
      const width = typeof window !== 'undefined' ? window.innerWidth : 0

      if (width < 768) {
        setBreakpoint('sm')
      } else if (width < 1024) {
        setBreakpoint('md')
      } else if (width < 1280) {
        setBreakpoint('lg')
      } else {
        setBreakpoint('xl')
      }
    }

    checkBreakpoint()

    // Debounced resize handler
    let timeoutId: NodeJS.Timeout
    const handleResize = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(checkBreakpoint, 150)
    }

    window.addEventListener('resize', handleResize)
    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return {
    isMobile: breakpoint === 'sm',
    isTablet: breakpoint === 'md',
    isDesktop: breakpoint === 'lg' || breakpoint === 'xl',
    breakpoint,
  }
}

/**
 * Hook to detect if a specific media query matches
 * Useful for custom breakpoints
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia(query)

    const handleChange = (e: MediaQueryListEvent) => {
      setMatches(e.matches)
    }

    // Set initial value
    setMatches(mediaQuery.matches)

    // Listen for changes
    mediaQuery.addEventListener('change', handleChange)
    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [query])

  return matches
}

/**
 * Hook to handle touch events on mobile
 */
export function useTouch() {
  const [isTouching, setIsTouching] = useState(false)

  const handleTouchStart = () => setIsTouching(true)
  const handleTouchEnd = () => setIsTouching(false)

  return {
    isTouching,
    handleTouchStart,
    handleTouchEnd,
  }
}
