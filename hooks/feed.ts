import type { Episode, SearchResult } from '../types'

export type ParsedFeed = { title: string; author: string; episodes: Episode[] }

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }

export const decode = (raw: string): string =>
  raw
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&([a-z]+);/gi, (whole, name: string) => ENTITIES[name.toLowerCase()] ?? whole)
    .trim()

const escape = (name: string) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** The text of the first `<name>` element in `xml`, decoded, or ''. */
export const tag = (xml: string, name: string): string => {
  const match = new RegExp(`<${escape(name)}(?:\\s[^>]*)?>([\\s\\S]*?)</${escape(name)}>`, 'i').exec(xml)
  return match ? decode(match[1] ?? '') : ''
}

/** An attribute of the first `<name ...>` element in `xml`, or ''. */
export const attr = (xml: string, name: string, attribute: string): string => {
  const element = new RegExp(`<${escape(name)}\\s[^>]*>`, 'i').exec(xml)?.[0] ?? ''
  const match = new RegExp(`\\s${escape(attribute)}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, 'i').exec(element)
  return match ? decode(match[2] ?? '') : ''
}

/** `itunes:duration` as seconds: `3723`, `62:03` or `1:02:03`. */
export const parseDuration = (text: string): number | null => {
  if (!text) return null
  const parts = text.split(':').map(Number)
  if (parts.some(n => !Number.isFinite(n))) return null
  return parts.reduce((total, n) => total * 60 + n, 0)
}

export const plain = (html: string, max = 280): string => {
  const text = decode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

export const parseFeed = (xml: string, limit = 50): ParsedFeed => {
  const firstItem = xml.search(/<item[\s>]/i)
  const channel = firstItem === -1 ? xml : xml.slice(0, firstItem)
  const items = xml.split(/<item[\s>]/i).slice(1).map(chunk => chunk.split(/<\/item>/i)[0] ?? '')

  const episodes: Episode[] = []
  for (const item of items) {
    const url = attr(item, 'enclosure', 'url')
    if (!url) continue
    const date = Date.parse(tag(item, 'pubDate'))
    episodes.push({
      guid: tag(item, 'guid') || url,
      title: tag(item, 'title') || 'Untitled episode',
      url,
      date: Number.isFinite(date) ? date : 0,
      duration: parseDuration(tag(item, 'itunes:duration')),
      summary: plain(tag(item, 'itunes:summary') || tag(item, 'description'), 1200),
    })
    if (episodes.length >= limit) break
  }
  episodes.sort((a, b) => b.date - a.date)

  return {
    title: tag(channel, 'title') || 'Untitled podcast',
    author: tag(channel, 'itunes:author') || tag(channel, 'managingEditor'),
    episodes,
  }
}

/** The Apple Podcasts directory search, which answers with each show's RSS feed. */
export const searchUrl = (term: string) =>
  `https://itunes.apple.com/search?media=podcast&entity=podcast&limit=8&term=${encodeURIComponent(term)}`

export const parseSearch = (json: string): SearchResult[] => {
  const body = JSON.parse(json) as { results?: { feedUrl?: string; collectionName?: string; artistName?: string }[] }
  return (body.results ?? [])
    .filter(r => r.feedUrl)
    .map(r => ({ feedUrl: r.feedUrl ?? '', title: r.collectionName ?? 'Untitled podcast', author: r.artistName ?? '' }))
}
