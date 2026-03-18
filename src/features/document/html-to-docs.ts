interface TextRun {
  text: string
  bold: boolean
  italic: boolean
  underline: boolean
}

export interface ParsedParagraph {
  runs: TextRun[]
  headingLevel: number
}

export interface DocsRequest {
  deleteContentRange?: {
    range: { startIndex: number; endIndex: number }
  }
  insertText?: {
    location: { index: number }
    text: string
  }
  updateTextStyle?: {
    range: { startIndex: number; endIndex: number }
    textStyle: { bold?: boolean; italic?: boolean; underline?: boolean }
    fields: string
  }
  updateParagraphStyle?: {
    range: { startIndex: number; endIndex: number }
    paragraphStyle: { namedStyleType: string }
    fields: string
  }
}

function isBold(el: HTMLElement): boolean {
  const fw = el.style.fontWeight
  if (fw === 'bold' || parseInt(fw, 10) >= 700) return true
  const tag = el.tagName.toLowerCase()
  return tag === 'b' || tag === 'strong'
}

function isItalic(el: HTMLElement): boolean {
  if (el.style.fontStyle === 'italic') return true
  const tag = el.tagName.toLowerCase()
  return tag === 'i' || tag === 'em'
}

function isUnderline(el: HTMLElement): boolean {
  const td = el.style.textDecoration || el.style.textDecorationLine || ''
  if (td.includes('underline')) return true
  return el.tagName.toLowerCase() === 'u'
}

function getHeadingLevel(el: HTMLElement): number {
  const match = el.tagName.match(/^H([1-6])$/i)
  return match ? parseInt(match[1], 10) : 0
}

const BLOCK_TAGS = new Set([
  'p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'li', 'blockquote', 'pre', 'section', 'article',
])

function isBlockTag(tag: string): boolean {
  return BLOCK_TAGS.has(tag.toLowerCase())
}

export function parseHtml(html: string): ParsedParagraph[] {
  const container = document.createElement('div')
  container.innerHTML = html

  const paragraphs: ParsedParagraph[] = []
  let current: ParsedParagraph = { runs: [], headingLevel: 0 }

  function flush() {
    paragraphs.push(current)
    current = { runs: [], headingLevel: 0 }
  }

  function walk(
    node: Node,
    fmt: { bold: boolean; italic: boolean; underline: boolean },
  ) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? ''
      if (text.length > 0) {
        current.runs.push({ text, ...fmt })
      }
      return
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return

    const el = node as HTMLElement
    const tag = el.tagName.toLowerCase()

    if (tag === 'br') {
      flush()
      return
    }

    const nextFmt = {
      bold: fmt.bold || isBold(el),
      italic: fmt.italic || isItalic(el),
      underline: fmt.underline || isUnderline(el),
    }

    if (isBlockTag(tag)) {
      if (current.runs.length > 0) flush()
      current.headingLevel = getHeadingLevel(el)
      for (const child of el.childNodes) {
        walk(child, nextFmt)
      }
      flush()
      return
    }

    for (const child of el.childNodes) {
      walk(child, nextFmt)
    }
  }

  for (const child of container.childNodes) {
    walk(child, { bold: false, italic: false, underline: false })
  }
  if (current.runs.length > 0) flush()

  return paragraphs
}

const NAMED_STYLES: Record<number, string> = {
  1: 'HEADING_1',
  2: 'HEADING_2',
  3: 'HEADING_3',
  4: 'HEADING_4',
  5: 'HEADING_5',
  6: 'HEADING_6',
}

export function buildDocsRequests(
  paragraphs: ParsedParagraph[],
  docEndIndex: number,
): DocsRequest[] {
  const requests: DocsRequest[] = []

  if (docEndIndex > 1) {
    requests.push({
      deleteContentRange: {
        range: { startIndex: 1, endIndex: docEndIndex - 1 },
      },
    })
  }

  if (paragraphs.length === 0) return requests

  const fullText = paragraphs
    .map((p) => p.runs.map((r) => r.text).join(''))
    .join('\n')

  if (fullText.length === 0) return requests

  requests.push({
    insertText: {
      location: { index: 1 },
      text: fullText,
    },
  })

  // Clear inherited font size on all inserted text so named styles control sizing
  requests.push({
    updateTextStyle: {
      range: { startIndex: 1, endIndex: 1 + fullText.length },
      textStyle: {},
      fields: 'fontSize',
    },
  })

  let offset = 1

  for (let pi = 0; pi < paragraphs.length; pi++) {
    const para = paragraphs[pi]
    const paraStart = offset

    for (const run of para.runs) {
      const runStart = offset
      const runEnd = offset + run.text.length

      if (run.bold || run.italic || run.underline) {
        const fields: string[] = []
        const textStyle: {
          bold?: boolean
          italic?: boolean
          underline?: boolean
        } = {}
        if (run.bold) {
          textStyle.bold = true
          fields.push('bold')
        }
        if (run.italic) {
          textStyle.italic = true
          fields.push('italic')
        }
        if (run.underline) {
          textStyle.underline = true
          fields.push('underline')
        }
        requests.push({
          updateTextStyle: {
            range: { startIndex: runStart, endIndex: runEnd },
            textStyle,
            fields: fields.join(','),
          },
        })
      }

      offset = runEnd
    }

    // Apply named paragraph style to every paragraph
    const namedStyle =
      para.headingLevel > 0 && NAMED_STYLES[para.headingLevel]
        ? NAMED_STYLES[para.headingLevel]
        : 'NORMAL_TEXT'

    requests.push({
      updateParagraphStyle: {
        range: { startIndex: paraStart, endIndex: offset + 1 },
        paragraphStyle: { namedStyleType: namedStyle },
        fields: 'namedStyleType',
      },
    })

    if (pi < paragraphs.length - 1) {
      offset += 1
    }
  }

  return requests
}
