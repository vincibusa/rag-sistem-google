/**
 * Accessibility Utilities & Best Practices
 * WCAG 2.1 AA Compliance Helpers
 */

/**
 * Keyboard event helpers
 * Standardize keyboard interaction handling
 */
export const KeyboardEvents = {
  /**
   * Check if Enter key was pressed
   */
  isEnter: (event: React.KeyboardEvent): boolean => {
    return event.key === 'Enter' || event.keyCode === 13
  },

  /**
   * Check if Escape key was pressed
   */
  isEscape: (event: React.KeyboardEvent): boolean => {
    return event.key === 'Escape' || event.keyCode === 27
  },

  /**
   * Check if Space key was pressed
   */
  isSpace: (event: React.KeyboardEvent): boolean => {
    return event.key === ' ' || event.keyCode === 32
  },

  /**
   * Check if arrow keys were pressed
   */
  isArrowUp: (event: React.KeyboardEvent): boolean => {
    return event.key === 'ArrowUp' || event.keyCode === 38
  },

  isArrowDown: (event: React.KeyboardEvent): boolean => {
    return event.key === 'ArrowDown' || event.keyCode === 40
  },

  isArrowLeft: (event: React.KeyboardEvent): boolean => {
    return event.key === 'ArrowLeft' || event.keyCode === 37
  },

  isArrowRight: (event: React.KeyboardEvent): boolean => {
    return event.key === 'ArrowRight' || event.keyCode === 39
  },
}

/**
 * ARIA helper for screen readers
 */
export const AriaLabel = {
  /**
   * Generate button label with keyboard shortcut
   */
  buttonWithShortcut: (action: string, shortcut: string): string => {
    return `${action} (keyboard shortcut: ${shortcut})`
  },

  /**
   * Generate label for loading state
   */
  loading: (action: string): string => {
    return `Loading ${action}...`
  },

  /**
   * Generate label for error state
   */
  error: (action: string, errorMessage?: string): string => {
    return errorMessage ? `Error: ${action}. ${errorMessage}` : `Error: ${action}`
  },

  /**
   * Generate label for success state
   */
  success: (action: string): string => {
    return `Successfully completed: ${action}`
  },
}

/**
 * Focus management utilities
 * For proper keyboard navigation
 */
export const FocusManagement = {
  /**
   * Move focus to element after a delay (for dynamic content)
   */
  moveFocusTo: (elementId: string, delay: number = 100) => {
    setTimeout(() => {
      const element = document.getElementById(elementId)
      if (element) {
        element.focus()
      }
    }, delay)
  },

  /**
   * Trap focus within an element (for modals, dialogs)
   * Returns cleanup function
   */
  trapFocus: (containerRef: React.RefObject<HTMLElement>) => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return

      const container = containerRef.current
      if (!container) return

      const focusableElements = container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )

      const firstElement = focusableElements[0] as HTMLElement
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault()
          lastElement.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault()
          firstElement.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  },

  /**
   * Focus first focusable element in container
   */
  focusFirst: (containerRef: React.RefObject<HTMLElement>) => {
    const container = containerRef.current
    if (!container) return

    const firstFocusable = container.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as HTMLElement

    if (firstFocusable) {
      firstFocusable.focus()
    }
  },
}

/**
 * Screen reader announcement utilities
 */
export const ScreenReaderAnnouncements = {
  /**
   * Announce status to screen readers (polite, no interruption)
   */
  announce: (message: string) => {
    const element = document.createElement('div')
    element.setAttribute('role', 'status')
    element.setAttribute('aria-live', 'polite')
    element.setAttribute('aria-atomic', 'true')
    element.className = 'sr-only'
    element.textContent = message
    document.body.appendChild(element)

    setTimeout(() => {
      document.body.removeChild(element)
    }, 1000)
  },

  /**
   * Announce alert (urgent, should interrupt)
   */
  alert: (message: string) => {
    const element = document.createElement('div')
    element.setAttribute('role', 'alert')
    element.setAttribute('aria-live', 'assertive')
    element.setAttribute('aria-atomic', 'true')
    element.className = 'sr-only'
    element.textContent = message
    document.body.appendChild(element)

    setTimeout(() => {
      document.body.removeChild(element)
    }, 1000)
  },
}

/**
 * Contrast ratio checker (basic WCAG AA compliance)
 */
export const ColorContrast = {
  /**
   * Check if contrast ratio meets WCAG AA standard (4.5:1 for normal text)
   */
  meetsWCAGAA: (foreground: string, background: string): boolean => {
    const getLuminance = (hexColor: string): number => {
      const rgb = parseInt(hexColor.slice(1), 16)
      const r = (rgb >> 16) & 0xff
      const g = (rgb >> 8) & 0xff
      const b = (rgb >> 0) & 0xff

      return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
    }

    const l1 = getLuminance(foreground)
    const l2 = getLuminance(background)
    const lighter = Math.max(l1, l2)
    const darker = Math.min(l1, l2)

    return (lighter + 0.05) / (darker + 0.05) >= 4.5
  },
}

/**
 * Semantic HTML helpers
 * Ensure proper heading hierarchy and landmarks
 */
export const SemanticHTML = {
  /**
   * Get appropriate heading level (h1, h2, etc) based on nesting
   */
  getHeadingLevel: (depth: number): 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' => {
    const level = Math.min(Math.max(depth, 1), 6) as 1 | 2 | 3 | 4 | 5 | 6
    return (`h${level}` as any)
  },

  /**
   * Check if page has proper landmark structure
   */
  hasValidLandmarks: (): boolean => {
    const hasNav = document.querySelector('nav') !== null
    const hasMain = document.querySelector('main') !== null

    return hasNav && hasMain
  },
}

/**
 * Form accessibility helpers
 */
export const FormAccessibility = {
  /**
   * Associate label with input
   * Automatically generates id if not provided
   */
  getLabelProps: (name: string) => {
    return {
      htmlFor: `input-${name}`,
    }
  },

  /**
   * Get input props with aria attributes
   */
  getInputProps: (name: string, required?: boolean, invalid?: boolean) => {
    return {
      id: `input-${name}`,
      required,
      'aria-required': required,
      'aria-invalid': invalid,
      'aria-describedby': invalid ? `error-${name}` : undefined,
    }
  },

  /**
   * Get error message props
   */
  getErrorProps: (name: string) => {
    return {
      id: `error-${name}`,
      role: 'alert',
    }
  },
}

/**
 * Skip links for keyboard navigation
 * Allow users to skip repetitive content
 */
export function createSkipLink(href: string, text: string = 'Skip to main content') {
  return {
    className: 'sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:bg-black focus:text-white focus:px-4 focus:py-2',
    href,
    children: text,
  }
}

/**
 * Reduced motion support
 * Respect user's motion preferences
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Dark mode support
 * Respect user's color scheme preference
 */
export function prefersDarkMode(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}
