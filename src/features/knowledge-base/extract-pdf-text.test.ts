const mockGetPage = vi.hoisted(() => vi.fn())
const mockGetDocument = vi.hoisted(() => vi.fn())

vi.mock('pdfjs-dist', () => ({
  getDocument: mockGetDocument,
  GlobalWorkerOptions: { workerSrc: '' },
}))

import { extractPdfText } from './extract-pdf-text'

function makePage(text: string) {
  return {
    getTextContent: () =>
      Promise.resolve({
        items: text.split(' ').map((str) => ({ str })),
      }),
  }
}

describe('extractPdfText', () => {
  beforeEach(() => {
    mockGetDocument.mockReset()
    mockGetPage.mockReset()
  })

  test('extracts text from a single-page PDF', async () => {
    const page = makePage('Hello World')
    mockGetDocument.mockReturnValue({
      promise: Promise.resolve({
        numPages: 1,
        getPage: () => Promise.resolve(page),
      }),
    })

    const file = new File(['fake-pdf-bytes'], 'test.pdf', {
      type: 'application/pdf',
    })

    const result = await extractPdfText(file)
    expect(result).toBe('Hello World')
  })

  test('extracts and joins text from multiple pages', async () => {
    const pages = [makePage('Page one content'), makePage('Page two content')]
    mockGetDocument.mockReturnValue({
      promise: Promise.resolve({
        numPages: 2,
        getPage: (num: number) => Promise.resolve(pages[num - 1]),
      }),
    })

    const file = new File(['fake-pdf-bytes'], 'multi.pdf', {
      type: 'application/pdf',
    })

    const result = await extractPdfText(file)
    expect(result).toBe('Page one content\n\nPage two content')
  })

  test('returns empty string for a PDF with no text', async () => {
    mockGetDocument.mockReturnValue({
      promise: Promise.resolve({
        numPages: 1,
        getPage: () =>
          Promise.resolve({
            getTextContent: () => Promise.resolve({ items: [] }),
          }),
      }),
    })

    const file = new File(['fake-pdf-bytes'], 'empty.pdf', {
      type: 'application/pdf',
    })

    const result = await extractPdfText(file)
    expect(result).toBe('')
  })
})
