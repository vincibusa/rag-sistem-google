declare module 'word-extractor' {
  interface WordExtractorOptions {
    extractImages?: boolean
  }

  interface WordExtractorResult {
    getBody(): string
    getFootnotes(): string
    getHeaders(): string[]
    getHeadersFooters(): string[]
    getAnnotations(): string[]
    getTextboxes(): string[]
  }

  class WordExtractor {
    constructor()
    extract(filePath: string): Promise<WordExtractorResult>
    extract(buffer: Buffer): Promise<WordExtractorResult>
  }

  export = WordExtractor
}

