'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/lib/auth-context'
import { useNotebookStore } from '@/store/notebook-store'
import { useFilesStore } from '@/store/files-store'
import { generateAutofilledDocumentAction } from '@/app/actions/autofill'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { toast } from 'sonner'

function AutofillPageContent() {
  const { user, accessToken } = useAuth()
  const { currentNotebookId } = useNotebookStore()
  const { files } = useFilesStore()
  const [templateFileUri, setTemplateFileUri] = useState<string>('')
  const [sourceFileUris, setSourceFileUris] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<string>('')

  const templateFile = files.find((f) => f.gemini_uri === templateFileUri)
  const sourceFiles = files.filter((f) => sourceFileUris.includes(f.gemini_uri))

  const handleToggleSourceFile = (fileUri: string) => {
    setSourceFileUris((prev) =>
      prev.includes(fileUri) ? prev.filter((u) => u !== fileUri) : [...prev, fileUri]
    )
  }

  const handleGenerateAutofill = async () => {
    if (!templateFileUri || sourceFileUris.length === 0) {
      toast.error('Please select a template and at least one source file')
      return
    }

    if (!user || !accessToken) {
      toast.error('Not authenticated')
      return
    }

    try {
      setIsLoading(true)
      const filledDocument = await generateAutofilledDocumentAction(
        user.id,
        accessToken,
        templateFileUri,
        sourceFileUris
      )
      setResult(filledDocument)
      toast.success('Document autofilled successfully')
    } catch (error) {
      console.error('Error generating autofill:', error)
      toast.error('Failed to generate autofilled document')
    } finally {
      setIsLoading(false)
    }
  }

  if (!currentNotebookId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="mb-4">Please select a notebook first</p>
          <Link href="/">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Autofill Documents</h1>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 gap-6">
          {/* Template Selection */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Step 1: Select Template</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Choose the template file (e.g., empty form) that you want to autofill
            </p>
            <Select value={templateFileUri} onValueChange={setTemplateFileUri}>
              <SelectTrigger>
                <SelectValue placeholder="Select a template file..." />
              </SelectTrigger>
              <SelectContent>
                {files.map((file) => (
                  <SelectItem key={file.id} value={file.gemini_uri}>
                    {file.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {templateFile && (
              <p className="text-sm text-green-600 mt-2">Selected: {templateFile.name}</p>
            )}
          </Card>

          {/* Source Files Selection */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Step 2: Select Source Files</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Choose one or more documents containing the information to fill the template
            </p>
            <div className="space-y-2">
              {files
                .filter((f) => f.gemini_uri !== templateFileUri)
                .map((file) => (
                  <div key={file.id} className="flex items-center gap-3 p-3 rounded-lg border">
                    <input
                      type="checkbox"
                      id={file.id}
                      checked={sourceFileUris.includes(file.gemini_uri)}
                      onChange={() => handleToggleSourceFile(file.gemini_uri)}
                      className="h-4 w-4"
                    />
                    <label htmlFor={file.id} className="flex-1 cursor-pointer">
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size_bytes / 1024 / 1024).toFixed(2)}MB
                      </p>
                    </label>
                  </div>
                ))}
            </div>
            {sourceFiles.length > 0 && (
              <p className="text-sm text-green-600 mt-4">
                Selected {sourceFiles.length} file(s)
              </p>
            )}
          </Card>

          {/* Generate Button */}
          <div className="flex gap-4">
            <Button
              onClick={handleGenerateAutofill}
              disabled={!templateFileUri || sourceFileUris.length === 0 || isLoading}
              className="flex-1"
              size="lg"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Generate Autofilled Document
            </Button>
          </div>

          {/* Result */}
          {result && (
            <>
              <Separator />
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Autofilled Document</h2>
                <div className="bg-muted p-4 rounded-lg max-h-[600px] overflow-auto">
                  <pre className="text-sm whitespace-pre-wrap break-words font-mono">
                    {result}
                  </pre>
                </div>
                <Button
                  className="mt-4 w-full"
                  onClick={() => {
                    const element = document.createElement('a')
                    element.setAttribute(
                      'href',
                      'data:text/plain;charset=utf-8,' + encodeURIComponent(result)
                    )
                    element.setAttribute('download', 'autofilled-document.txt')
                    element.style.display = 'none'
                    document.body.appendChild(element)
                    element.click()
                    document.body.removeChild(element)
                  }}
                >
                  Download Filled Document
                </Button>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AutofillPage() {
  return (
    <ProtectedRoute>
      <AutofillPageContent />
    </ProtectedRoute>
  )
}
