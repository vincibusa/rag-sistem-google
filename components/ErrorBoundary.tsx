'use client'

import { Component, ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  feature?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * Generic Error Boundary component
 * Catches errors in child components and displays fallback UI
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`ErrorBoundary (${this.props.feature || 'unknown'}):`, error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div
            className="p-4 border border-red-200 bg-red-50 rounded-md space-y-2"
            role="alert"
            aria-live="assertive"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <h3 className="font-semibold text-red-900">
                Error in {this.props.feature || 'this component'}
              </h3>
            </div>
            <p className="text-sm text-red-800">{this.state.error?.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="text-sm text-red-600 hover:text-red-700 underline"
            >
              Reload page
            </button>
          </div>
        )
      )
    }

    return this.props.children
  }
}

/**
 * Specialized error boundary for chat operations
 */
export function ChatErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      feature="Chat"
      fallback={
        <div className="p-6 text-center space-y-3">
          <AlertCircle className="h-8 w-8 text-amber-600 mx-auto" />
          <h3 className="font-semibold">Chat Error</h3>
          <p className="text-sm text-muted-foreground">
            Something went wrong with the chat. Try refreshing the page.
          </p>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}

/**
 * Specialized error boundary for file operations
 */
export function FileErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      feature="File Upload"
      fallback={
        <div className="p-4 text-center space-y-2">
          <AlertCircle className="h-6 w-6 text-red-500 mx-auto" />
          <p className="text-sm font-medium">File upload error</p>
          <p className="text-xs text-muted-foreground">Try uploading again</p>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}

/**
 * Specialized error boundary for document preview
 */
export function DocumentPreviewErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      feature="Document Preview"
      fallback={
        <div className="p-4 h-full flex flex-col items-center justify-center space-y-2">
          <AlertCircle className="h-6 w-6 text-amber-600" />
          <p className="text-sm text-muted-foreground">Could not load preview</p>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}
