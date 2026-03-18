import { parseHtml, buildDocsRequests } from './html-to-docs'
import type { ParsedParagraph } from './html-to-docs'

describe('parseHtml', () => {
  test('parses a simple paragraph', () => {
    const result = parseHtml('<p>Hello world</p>')
    expect(result).toHaveLength(1)
    expect(result[0].runs).toHaveLength(1)
    expect(result[0].runs[0]).toEqual({
      text: 'Hello world',
      bold: false,
      italic: false,
      underline: false,
    })
    expect(result[0].headingLevel).toBe(0)
  })

  test('parses multiple paragraphs', () => {
    const result = parseHtml('<p>First</p><p>Second</p>')
    expect(result).toHaveLength(2)
    expect(result[0].runs[0].text).toBe('First')
    expect(result[1].runs[0].text).toBe('Second')
  })

  test('detects bold via <b> tag', () => {
    const result = parseHtml('<p><b>bold text</b></p>')
    expect(result[0].runs[0].bold).toBe(true)
  })

  test('detects bold via <strong> tag', () => {
    const result = parseHtml('<p><strong>bold text</strong></p>')
    expect(result[0].runs[0].bold).toBe(true)
  })

  test('detects bold via inline style font-weight:700', () => {
    const result = parseHtml('<p><span style="font-weight:700">bold</span></p>')
    expect(result[0].runs[0].bold).toBe(true)
  })

  test('detects italic via <i> tag', () => {
    const result = parseHtml('<p><i>italic text</i></p>')
    expect(result[0].runs[0].italic).toBe(true)
  })

  test('detects italic via <em> tag', () => {
    const result = parseHtml('<p><em>italic text</em></p>')
    expect(result[0].runs[0].italic).toBe(true)
  })

  test('detects italic via inline style', () => {
    const result = parseHtml('<p><span style="font-style:italic">italic</span></p>')
    expect(result[0].runs[0].italic).toBe(true)
  })

  test('detects underline via <u> tag', () => {
    const result = parseHtml('<p><u>underlined</u></p>')
    expect(result[0].runs[0].underline).toBe(true)
  })

  test('detects underline via inline style', () => {
    const result = parseHtml('<p><span style="text-decoration:underline">underlined</span></p>')
    expect(result[0].runs[0].underline).toBe(true)
  })

  test('parses heading levels', () => {
    const result = parseHtml('<h1>Title</h1><h2>Subtitle</h2><p>Body</p>')
    expect(result).toHaveLength(3)
    expect(result[0].headingLevel).toBe(1)
    expect(result[1].headingLevel).toBe(2)
    expect(result[2].headingLevel).toBe(0)
  })

  test('handles nested formatting (bold inside italic)', () => {
    const result = parseHtml('<p><i>italic <b>bold-italic</b></i></p>')
    expect(result[0].runs).toHaveLength(2)
    expect(result[0].runs[0]).toEqual({
      text: 'italic ',
      bold: false,
      italic: true,
      underline: false,
    })
    expect(result[0].runs[1]).toEqual({
      text: 'bold-italic',
      bold: true,
      italic: true,
      underline: false,
    })
  })

  test('handles mixed formatted and plain text', () => {
    const result = parseHtml('<p>plain <b>bold</b> plain</p>')
    expect(result[0].runs).toHaveLength(3)
    expect(result[0].runs[0].bold).toBe(false)
    expect(result[0].runs[1].bold).toBe(true)
    expect(result[0].runs[2].bold).toBe(false)
  })

  test('treats <br> as paragraph break', () => {
    const result = parseHtml('<p>line1<br>line2</p>')
    expect(result).toHaveLength(2)
    expect(result[0].runs[0].text).toBe('line1')
    expect(result[1].runs[0].text).toBe('line2')
  })

  test('handles empty HTML', () => {
    const result = parseHtml('')
    expect(result).toHaveLength(0)
  })

  test('handles empty paragraph', () => {
    const result = parseHtml('<p>text</p><p></p><p>more</p>')
    // Empty <p> produces a paragraph with no runs
    expect(result).toHaveLength(3)
    expect(result[0].runs[0].text).toBe('text')
    expect(result[1].runs).toHaveLength(0)
    expect(result[2].runs[0].text).toBe('more')
  })

  test('handles plain text without wrapper elements', () => {
    const result = parseHtml('just plain text')
    expect(result).toHaveLength(1)
    expect(result[0].runs[0].text).toBe('just plain text')
  })

  test('handles div elements as block containers', () => {
    const result = parseHtml('<div>First</div><div>Second</div>')
    expect(result).toHaveLength(2)
    expect(result[0].runs[0].text).toBe('First')
    expect(result[1].runs[0].text).toBe('Second')
  })

  test('inherits bold from block element', () => {
    const result = parseHtml('<p style="font-weight:700">all bold here</p>')
    expect(result[0].runs[0].bold).toBe(true)
  })
})

describe('buildDocsRequests', () => {
  test('returns only delete request for empty paragraphs with existing content', () => {
    const result = buildDocsRequests([], 50)
    expect(result).toHaveLength(1)
    expect(result[0].deleteContentRange).toEqual({
      range: { startIndex: 1, endIndex: 49 },
    })
  })

  test('returns empty array for empty doc and empty paragraphs', () => {
    const result = buildDocsRequests([], 1)
    expect(result).toHaveLength(0)
  })

  test('generates delete, insert, clear fontSize, and NORMAL_TEXT for plain text', () => {
    const paragraphs: ParsedParagraph[] = [
      { runs: [{ text: 'Hello', bold: false, italic: false, underline: false }], headingLevel: 0 },
    ]
    const result = buildDocsRequests(paragraphs, 20)

    expect(result[0].deleteContentRange).toEqual({
      range: { startIndex: 1, endIndex: 19 },
    })
    expect(result[1].insertText).toEqual({
      location: { index: 1 },
      text: 'Hello',
    })

    // Should clear inherited fontSize on all text
    const clearFontSize = result.find(
      (r) => r.updateTextStyle?.fields === 'fontSize',
    )
    expect(clearFontSize).toBeDefined()
    expect(clearFontSize!.updateTextStyle!.range).toEqual({
      startIndex: 1,
      endIndex: 6,
    })
    expect(clearFontSize!.updateTextStyle!.textStyle).toEqual({})

    // Should set NORMAL_TEXT for body paragraphs
    const paraStyle = result.find((r) => r.updateParagraphStyle)
    expect(paraStyle!.updateParagraphStyle!.paragraphStyle.namedStyleType).toBe('NORMAL_TEXT')
  })

  test('generates text style request for bold text', () => {
    const paragraphs: ParsedParagraph[] = [
      { runs: [{ text: 'bold', bold: true, italic: false, underline: false }], headingLevel: 0 },
    ]
    const result = buildDocsRequests(paragraphs, 1)

    const styleReq = result.find(
      (r) => r.updateTextStyle && r.updateTextStyle.fields !== 'fontSize',
    )
    expect(styleReq).toBeDefined()
    expect(styleReq!.updateTextStyle).toEqual({
      range: { startIndex: 1, endIndex: 5 },
      textStyle: { bold: true },
      fields: 'bold',
    })
  })

  test('generates combined fields for bold+italic', () => {
    const paragraphs: ParsedParagraph[] = [
      { runs: [{ text: 'both', bold: true, italic: true, underline: false }], headingLevel: 0 },
    ]
    const result = buildDocsRequests(paragraphs, 1)

    const styleReq = result.find(
      (r) => r.updateTextStyle && r.updateTextStyle.fields !== 'fontSize',
    )
    expect(styleReq!.updateTextStyle!.textStyle).toEqual({ bold: true, italic: true })
    expect(styleReq!.updateTextStyle!.fields).toBe('bold,italic')
  })

  test('generates paragraph style request for headings', () => {
    const paragraphs: ParsedParagraph[] = [
      { runs: [{ text: 'Title', bold: false, italic: false, underline: false }], headingLevel: 1 },
    ]
    const result = buildDocsRequests(paragraphs, 1)

    const paraReq = result.find((r) => r.updateParagraphStyle)
    expect(paraReq).toBeDefined()
    expect(paraReq!.updateParagraphStyle!.paragraphStyle.namedStyleType).toBe('HEADING_1')
  })

  test('tracks correct offsets across multiple paragraphs', () => {
    const paragraphs: ParsedParagraph[] = [
      { runs: [{ text: 'AAA', bold: false, italic: false, underline: false }], headingLevel: 0 },
      { runs: [{ text: 'BB', bold: true, italic: false, underline: false }], headingLevel: 0 },
    ]
    // Full text: "AAA\nBB" (6 chars)
    // AAA at indices 1-3, \n at 4, BB at indices 5-6
    const result = buildDocsRequests(paragraphs, 1)

    expect(result[0].insertText!.text).toBe('AAA\nBB')

    const styleReq = result.find(
      (r) => r.updateTextStyle && r.updateTextStyle.fields !== 'fontSize',
    )
    expect(styleReq!.updateTextStyle!.range).toEqual({
      startIndex: 5,
      endIndex: 7,
    })
  })

  test('handles multiple runs in one paragraph', () => {
    const paragraphs: ParsedParagraph[] = [
      {
        runs: [
          { text: 'plain ', bold: false, italic: false, underline: false },
          { text: 'bold', bold: true, italic: false, underline: false },
          { text: ' end', bold: false, italic: false, underline: false },
        ],
        headingLevel: 0,
      },
    ]
    // Full text: "plain bold end"
    // "plain " at 1-6, "bold" at 7-10, " end" at 11-14
    const result = buildDocsRequests(paragraphs, 1)

    const styleReq = result.find(
      (r) => r.updateTextStyle && r.updateTextStyle.fields !== 'fontSize',
    )
    expect(styleReq!.updateTextStyle!.range).toEqual({
      startIndex: 7,
      endIndex: 11,
    })
  })

  test('no formatting style requests for unformatted text', () => {
    const paragraphs: ParsedParagraph[] = [
      { runs: [{ text: 'plain', bold: false, italic: false, underline: false }], headingLevel: 0 },
    ]
    const result = buildDocsRequests(paragraphs, 1)

    // There should be a fontSize-clearing request but no bold/italic/underline requests
    const formattingReqs = result.filter(
      (r) => r.updateTextStyle && r.updateTextStyle.fields !== 'fontSize',
    )
    expect(formattingReqs).toHaveLength(0)
  })
})
