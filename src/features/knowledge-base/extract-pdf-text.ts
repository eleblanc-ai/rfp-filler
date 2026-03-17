import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'

GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url,
).toString()

export async function extractPdfText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const pdf = await getDocument({ data: buffer }).promise
  const pages: string[] = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const text = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
    pages.push(text)
  }

  return pages.join('\n\n')
}
