import { chunkHtmlContent } from '@utils/chunkHtmlContent'
import { sanitizeChunk, sanitizeMessageContent } from '@utils/sanitizeContent'

const LIMIT = 3000
const MENTION_TRIGGER = /(^|[^a-z0-9_-])@bob($|[^a-z0-9_-])/

const words = (count: number, prefix: string) =>
  Array.from({ length: count }, (_, i) => `${prefix}${i}`).join(' ')

// Inputs pass through the send sanitizer first, so every length is a stored length.
const chunk = (html: string) => {
  const result = chunkHtmlContent(sanitizeMessageContent(html, '').sanitizedHtml, LIMIT)
  result.htmlChunks.forEach((htmlChunk, i) => {
    const sent = sanitizeChunk(htmlChunk, result.textChunks[i])
    expect(result.textChunks[i]).toMatch(/\S/)
    expect(sent.sanitizedHtmlChunk.length).toBeLessThanOrEqual(LIMIT)
    expect(sent.sanitizedTextChunk.length).toBeLessThanOrEqual(LIMIT)
  })
  return result
}

const sentHtmlLengths = ({ htmlChunks, textChunks }: ReturnType<typeof chunkHtmlContent>) =>
  htmlChunks.map((html, i) => sanitizeChunk(html, textChunks[i]).sanitizedHtmlChunk.length)

const NO_CHUNKS = { htmlChunks: [], textChunks: [] }

describe('chunkHtmlContent', () => {
  it('gives no chunks for 2,389 and 2,989 characters in one paragraph', () => {
    expect(chunk(`<p>${words(500, 'a')}</p>`)).toEqual(NO_CHUNKS)
    expect(chunk(`<p>${words(620, 'a')}</p>`)).toEqual(NO_CHUNKS)
  })

  it('keeps stored HTML of exactly 3,000 whole and cuts 3,001 at the limit', () => {
    expect(chunk(`<p>${'x'.repeat(2993)}</p>`)).toEqual(NO_CHUNKS)
    const result = chunk(`<p>${'x'.repeat(2994)}</p>`)
    expect(sentHtmlLengths(result)).toEqual([3000, 8])
    expect(result.textChunks.join('')).toBe('x'.repeat(2994))
  })

  it('splits 3,389 characters after the last space and loses no text', () => {
    const text = words(700, 'a')
    const result = chunk(`<p>${text}</p>`)
    expect(result.textChunks).toHaveLength(2)
    expect(result.textChunks[0]).toMatch(/ $/)
    expect(result.textChunks.join('')).toBe(text)
  })

  it('keeps a short first line in the same chunk as the long paragraph after it', () => {
    const text = words(700, 'a')
    const result = chunk(`<p>Hi team,</p><p>${text}</p>`)
    expect(result.textChunks).toHaveLength(2)
    expect(result.textChunks[0]).toMatch(/^Hi team,\n\na0 /)
    expect(result.textChunks.join('')).toBe(`Hi team,\n\n${text}`)
  })

  it('keeps whole paragraphs together with a block break', () => {
    const [p1, p2, p3] = [words(250, 'a'), words(250, 'b'), words(250, 'c')]
    const result = chunk(`<p>${p1}</p><p>${p2}</p><p>${p3}</p>`)
    expect(result.textChunks).toEqual([`${p1}\n\n${p2}`, p3])
    expect(result.htmlChunks[1]).toBe(`<p>${p3}</p>`)
  })

  it('cuts 3,500 characters with no space at the limit', () => {
    const text = 'x'.repeat(3500)
    const result = chunk(`<p>${text}</p>`)
    expect(sentHtmlLengths(result)).toEqual([3000, 514])
    expect(result.textChunks.join('')).toBe(text)
  })

  it('keeps the mention trigger boundary when a mention opens a paragraph', () => {
    const [p1, p3] = [words(250, 'a'), words(250, 'c')]
    const tail = `hi ${words(240, 'b')}`
    const mention = '<span data-type="mention" data-id="u1" data-label="bob">@bob</span>'
    const result = chunk(`<p>${p1}</p><p>${mention} ${tail}</p><p>${p3}</p>`)
    expect(result.textChunks).toEqual([`${p1}\n\n@bob ${tail}`, p3])
    const stored = sanitizeChunk(result.htmlChunks[0], result.textChunks[0]).sanitizedTextChunk
    expect(stored).toMatch(MENTION_TRIGGER)
  })

  it('measures escaped characters and keeps an emoji whole at the cut', () => {
    const plain = Array.from({ length: 200 }, (_, i) => `Tom & Jerry ${i} < 3`).join(' ')
    const escaped = plain.replace(/&/g, '&amp;').replace(/</g, '&lt;')
    expect(chunk(`<p>${escaped}</p>`).textChunks.join('')).toBe(plain)

    const emoji = chunk(`<p>${'x'.repeat(2992)}${'😀'.repeat(10)}</p>`)
    expect(emoji.textChunks).toEqual(['x'.repeat(2992), '😀'.repeat(10)])
  })

  it('reopens a split list in each later chunk', () => {
    const items = Array.from({ length: 300 }, (_, i) => `item ${i}`)
    const result = chunk(`<ul>${items.map((item) => `<li><p>${item}</p></li>`).join('')}</ul>`)
    expect(result.htmlChunks).toHaveLength(3)
    expect(result.htmlChunks[1]).toMatch(/^<ul>/)
    expect(result.htmlChunks[2]).toMatch(/^<ul>/)
    expect(result.textChunks.join('\n\n')).toBe(items.join('\n\n'))
  })

  it('does not end a chunk with an empty list item', () => {
    const [first, a, b] = [words(300, 'i'), words(400, 'a'), words(400, 'b')]
    const result = chunk(`<ul><li><p>${first}</p></li><li><p>${a}</p><p>${b}</p></li></ul>`)
    expect(result.htmlChunks[0]).toBe(`<ul><li><p>${first}</p></li></ul>`)
  })

  it('reopens a split link by tag name only', () => {
    const url = `https://e.com/${'p'.repeat(2900)}`
    const link = `<a href="${url}" target="_blank" rel="noopener noreferrer nofollow">${url}</a>`
    const result = chunk(`<p>see ${link} ok</p>`)
    expect(result.htmlChunks.map((html) => html.includes('href='))).toEqual([false, true, false])
    expect(result.htmlChunks[2]).toMatch(/^<p><a>/)
    expect(result.textChunks.join('')).toBe(`see ${url} ok`)
  })
})
