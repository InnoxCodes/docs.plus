const BLOCK_TAGS = new Set(['p', 'li', 'ul', 'ol', 'blockquote', 'pre'])

// Escape text as the HTML serializer does: it escapes U+00A0 but not quote marks.
// Then a chunk's length equals the length that the database stores.
const escapeText = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\u00a0/g, '&nbsp;')
const escapedLength = (ch: string) => escapeText(ch).length

export function chunkHtmlContent(
  htmlContent: string,
  maxLength: number
): { htmlChunks: string[]; textChunks: string[] } {
  const htmlChunks: string[] = []
  const textChunks: string[] = []
  // The caller reads an empty result as "one row"; it must still check the HTML length.
  if (htmlContent.length <= maxLength) return { htmlChunks, textChunks }

  const doc = new DOMParser().parseFromString(htmlContent, 'text/html')
  const openTags: { open: string; reopen: string; close: string }[] = []
  let html = ''
  let text = ''
  const closeLength = () => openTags.reduce((n, t) => n + t.close.length, 0)
  const room = () => maxLength - html.length - closeLength()

  const flush = () => {
    if (/\S/.test(text)) {
      // Drop tags opened at the end with no content. An empty <li> shows as a bullet.
      let depth = openTags.length
      while (depth > 0 && html.endsWith(openTags[depth - 1].open)) {
        html = html.slice(0, -openTags[--depth].open.length)
      }
      htmlChunks.push(
        html +
          openTags
            .slice(0, depth)
            .map((t) => t.close)
            .reverse()
            .join('')
      )
      textChunks.push(text)
    }
    html = openTags.map((t) => t.reopen).join('')
    text = ''
  }
  // A block break keeps the boundary that the mention trigger needs before "@".
  const addBlockBreak = (el: Element) => {
    if (BLOCK_TAGS.has(el.localName) && text && !text.endsWith('\n')) text += '\n\n'
  }
  const appendText = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) text += (node as Text).data
    if (node.nodeType !== Node.ELEMENT_NODE) return
    const el = node as Element
    if (el.localName === 'br') text += '\n'
    addBlockBreak(el)
    el.childNodes.forEach(appendText)
  }
  const splitText = (data: string) => {
    let rest = data
    while (rest) {
      let fit = 0
      for (let size = 0; fit < rest.length && size + escapedLength(rest[fit]) <= room(); fit++)
        size += escapedLength(rest[fit])
      if (fit === rest.length) {
        html += escapeText(rest)
        text += rest
        return
      }
      if (fit > 0 && /[\uD800-\uDBFF]/.test(rest[fit - 1])) fit--
      let cut = fit > 0 ? rest.lastIndexOf(' ', fit - 1) + 1 : 0
      if (cut === 0) {
        if (/\S/.test(text)) {
          flush()
          continue
        }
        cut = fit || (rest.codePointAt(0)! > 0xffff ? 2 : 1)
      }
      html += escapeText(rest.slice(0, cut))
      text += rest.slice(0, cut)
      flush()
      rest = rest.slice(cut)
    }
  }
  const place = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) return splitText((node as Text).data)
    if (node.nodeType !== Node.ELEMENT_NODE) return
    const el = node as Element
    const outerHtml = el.outerHTML
    const size = outerHtml.length
    const close = `</${el.localName}>`
    const reopen = `<${el.localName}>`
    const open = (el.cloneNode(false) as Element).outerHTML.slice(0, -close.length)
    const freshRoom = maxLength - openTags.reduce((n, t) => n + t.reopen.length + t.close.length, 0)
    // Split a big element in place, so the text before it does not post alone.
    // Start a new chunk first if the element fits in one, or if its tags do not fit here.
    // Also start one for an element with attributes, so a link keeps its href with its text.
    const startsNewChunk =
      size <= freshRoom || open !== reopen || open.length + close.length >= room()
    if (size > room() && startsNewChunk) flush()
    if (size <= room()) {
      html += outerHtml
      appendText(el)
      return
    }
    addBlockBreak(el)
    html += open
    openTags.push({ open, reopen, close })
    el.childNodes.forEach(place)
    openTags.pop()
    html += close
  }

  doc.body.childNodes.forEach(place)
  flush()
  return { htmlChunks, textChunks }
}
