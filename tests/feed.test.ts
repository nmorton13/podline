import { expect, test } from 'claude-code/testing'

import { decode, parseDuration, parseFeed, parseSearch, safeUrl } from '../hooks/feed'
import { parseReplies, startArgv, toReading } from '../hooks/player'
import { isFinished, nextSpeed, resumeAt } from '../hooks/register'

import { FEED } from './fixtures'

test('parses a feed: entities, CDATA, durations, newest first, audio only', () => {
  const feed = parseFeed(FEED)
  expect(feed.title).toBe('Night & Day')
  expect(feed.author).toBe('Ada & Co')
  expect(feed.episodes.map(e => e.guid)).toEqual(['ep-2', 'ep-1'])
  expect(feed.episodes[0]?.title).toBe('Newest ☃')
  expect(feed.episodes[0]?.url).toBe('https://cdn.example.com/2.mp3?a=1&b=2')
  expect(feed.episodes[0]?.duration).toBe(3723)
  expect(feed.episodes[1]?.duration).toBe(3723)
  expect(feed.episodes[1]?.summary).toBe('Hello world — ok')
})

test('small parsers', () => {
  expect(parseDuration('3723')).toBe(3723)
  expect(parseDuration('')).toBe(null)
  expect(parseDuration('abc')).toBe(null)
  expect(decode('&unknown; &lt;b&gt;')).toBe('&unknown; <b>')
  expect(parseSearch(JSON.stringify({ results: [{ collectionName: 'A', artistName: 'B', feedUrl: 'https://f' }, { collectionName: 'No feed' }] })))
    .toEqual([{ title: 'A', author: 'B', feedUrl: 'https://f' }])
})

test('mpv replies and launch arguments', () => {
  const out = '{"event":"pause"}\n{"data":12.5,"request_id":0,"error":"success"}\n{"data":null,"request_id":0,"error":"property unavailable"}\n{"data":true,"request_id":0,"error":"success"}\n'
  const data = parseReplies(out, 3)
  expect(data).toEqual([12.5, undefined, true])
  expect(parseReplies('', 1)).toBe(null)
  expect(toReading([1, 2, false, 1.5])).toEqual({ pos: 1, dur: 2, isPaused: false, speed: 1.5 })
  // A hostile title or URL stays one argument, never shell text.
  const argv = startArgv({ socket: '/tmp/sidecast-1.sock', url: 'https://x/a.mp3"; rm -rf ~', title: '$(boom)', startAt: 61.9, speed: 1.5 })
  expect(argv.slice(-5)).toEqual(['/tmp/sidecast-1.sock', '61', '1.5', '$(boom)', 'https://x/a.mp3"; rm -rf ~'])
})

test('resume and finished rules', () => {
  expect(isFinished(3590, 3600)).toBe(true)
  expect(isFinished(100, 3600)).toBe(false)
  expect(isFinished(10, 0)).toBe(false)
  expect(resumeAt(undefined)).toBe(0)
  expect(resumeAt({ pos: 100, dur: 3600, isDone: false })).toBe(95)
  expect(resumeAt({ pos: 3590, dur: 3600, isDone: true })).toBe(0)
})

test('speed ladder', () => {
  expect(nextSpeed(1)).toBe(1.25)
  expect(nextSpeed(1.75)).toBe(2)
  expect(nextSpeed(2)).toBe(1)
  expect(nextSpeed(1.1)).toBe(1.25)
})

test('feed text is made safe for the terminal and the player', () => {
  expect(decode('Hi\x1b[2J\x1b]8;;http://x\x07there\u202e!')).toBe('Hithere!')
  expect(decode('&#99999999; ok &#0;')).toBe('ok')
  expect(safeUrl('https://cdn.example.com/a.mp3')).toBe('https://cdn.example.com/a.mp3')
  expect(safeUrl('file:///etc/passwd')).toBe('')
  expect(safeUrl('javascript:alert(1)')).toBe('')
  const feed = parseFeed('<rss><channel><title>T</title><item><title>Local</title><enclosure url="file:///Users/me/secret.mp3"/></item></channel></rss>')
  expect(feed.episodes).toEqual([])
  expect(parseSearch(JSON.stringify({ results: [{ collectionName: 'X', feedUrl: 'ftp://x/feed' }] }))).toEqual([])
})
