import type { On, RenderElement } from 'claude-code'
import { expect, test } from 'claude-code/testing'

import { FEED } from './fixtures'

const FEED_URL = 'https://feeds.example.com/night'
const NIGHT = { collectionName: 'Night & Day', artistName: 'Ada', feedUrl: FEED_URL }
const OTHER = { collectionName: 'Night Owls', artistName: 'Bo', feedUrl: 'https://feeds.example.com/owls' }

const pane = (bodyColumns = 80) => ({
  plugin: 'sidecast',
  component: 'Pane' as const,
  requestId: 'sidecast',
  props: { title: 'Podcasts', isFocused: true, bodyColumns, placement: 'dock' } as any,
})
const band = { plugin: 'sidecast', component: 'AbovePrompt' as const,
  props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 80 } as any }
const pod = (args: string) => ({ command: 'pod', args, origin: { kind: 'human' }, presentation: 'text' }) as any

/** The network, mpv, the store and the clock, faked beneath the mod. */
const fakes = (on: On, searchResults = [NIGHT, OTHER], client = 'nc') => {
  const store: Record<string, unknown> = {}
  const launched: string[][] = []
  const sent: string[] = []
  const tools: string[] = []
  const mpv = { isUp: false, pos: 125, dur: 3723, speed: 1 }
  const toasts: string[] = []
  const prompts: string[] = []

  on('clock.now', () => ({ value: 1_790_000_000_000 }))
  on('clock.every', () => ({ deny: 'no timers in tests' }) as any)
  on('store.get', (_$, e) => ({ value: store[e.key] }))
  on('store.set', (_$, e) => {
    store[e.key] = e.value
    return { value: undefined }
  })
  on('ui.open', () => ({ value: { id: 'sidecast' } }) as any)
  on('ui.toast', (_$, e) => {
    toasts.push(String((e as any).text ?? (e as any).message ?? JSON.stringify(e)))
    return { value: undefined } as any
  })
  on('tool.register', (_$, e) => ({ value: { tool: `mcp__sidecast__${e.name}` } }) as any)
  on('session.end', () => ({ sessionId: 'test' }) as any)
  on('model.complete', (_$, e) => {
    prompts.push(e.prompt)
    return { value: { isAnswered: true, text: 'Two hosts talk about the night sky.', usage: {} } } as any
  })
  on('http.fetch', (_$, e) => ({
    value: { status: 200, ok: true, headers: {}, text: e.url.startsWith('https://itunes') ? JSON.stringify({ results: searchResults }) : FEED },
  }) as any)
  on('process.run', (_$, e) => {
    const ok = (stdout = '') => ({ value: { exitCode: 0, stdout, stderr: '' } }) as any
    if (e.argv[0] === 'sh' && e.argv[2] === 'command -v mpv') return ok('/opt/homebrew/bin/mpv')
    if (e.argv[0] === 'sh' && e.argv[2]?.includes('uname -s')) return ok(`${client}\n`)
    if (e.argv[0] === 'sh') {
      launched.push([...e.argv])
      mpv.isUp = true
      return ok()
    }
    if (e.init?.stdin) sent.push(e.init.stdin)
    tools.push(e.argv[0] ?? '')
    const speedSet = /"set_property","speed",([\d.]+)/.exec(e.init?.stdin ?? '')
    if (speedSet && mpv.isUp) mpv.speed = Number(speedSet[1])
    if (!mpv.isUp) return { value: { exitCode: 1, stdout: '', stderr: 'no socket' } } as any
    const reply = (data: unknown) => JSON.stringify({ data, request_id: 0, error: 'success' })
    return ok([reply(mpv.pos), reply(mpv.dur), reply(false), reply(mpv.speed)].join('\n'))
  })
  on('ui.render', ($, e) => {
    const { Box } = $.ui.resolve(e)
    return h(Box, { key: 'engine' }) as RenderElement
  })
  return { store, launched, sent, mpv, prompts, toasts, tools }
}

test('search, subscribe, browse and play an episode', async ($, on) => {
  const { store, launched, sent } = fakes(on)

  await $.command.run(pod('add night'))
  const ui = await $.ui.mount({ ...pane(), surface: 'terminal' })
  expect(await ui.find({ text: /Night & Day/ })).toBeDefined()

  await ui.press({ key: 'sub-0' })
  expect((store.shows as { title: string }[])[0]?.title).toBe('Night & Day')
  expect(await ui.find({ text: /Newest ☃/ })).toBeDefined()

  await ui.press({ key: 'play-0-0' })
  expect(launched.at(-1)?.at(-1)).toBe('https://cdn.example.com/2.mp3?a=1&b=2')
  await ui.unmount()

  // The pane carries the controls too.
  const panel = await $.ui.mount({ ...pane(), surface: 'terminal' })
  await panel.press({ key: 'pane-skip' })
  expect(sent.some(line => line.includes('"seek",30'))).toBe(true)
  await panel.press({ key: 'pane-speed' })
  expect(store.speed).toBe(1.25)

  // Its own row pauses it rather than starting it over.
  const before = launched.length
  const sentBefore = sent.length
  await panel.press({ key: 'play-0-0' })
  expect(launched.length).toBe(before)
  expect(sent.slice(sentBefore).some(line => line.includes('"cycle","pause"'))).toBe(true)
  await panel.unmount()

  for (const surface of ['terminal', 'desktop'] as const) {
    const bar = await $.ui.mount({ ...band, surface })
    expect(await bar.find({ text: /Newest ☃/ })).toBeDefined()
    expect(await bar.find({ text: /2:05 \/ 1:02:03/ })).toBeDefined()
    await bar.press({ key: 'pod-speed' })
    await bar.unmount()
  }

  // The band's speed key stepped it on twice more (once per surface): 1.25 → 1.5 → 1.75.
  expect(store.speed).toBe(1.75)

  // Stop keeps the place for next time.
  await $.command.run(pod('stop'))
  expect((store.progress as Record<string, { pos: number }>)['ep-2']?.pos).toBe(125)
})

test('/sidecast is the same command as /pod', async ($, on) => {
  fakes(on, [NIGHT])
  await $.command.run(pod('night and day'))
  const viaAlias = await $.command.run({ ...pod('queue'), command: 'sidecast' })
  const viaPod = await $.command.run(pod('queue'))
  expect(viaAlias.text).toBe(viaPod.text)
  expect((await $.command.run({ ...pod(''), command: 'sidecast' })).text).toBe('Podcast library opened.')
})

test('/pod <name> with one match subscribes straight away', async ($, on) => {
  const { store } = fakes(on, [NIGHT])
  const result = await $.command.run(pod('night and day'))
  expect(result.text).toBe('Subscribed to Night & Day.')
  expect((store.shows as { feedUrl: string }[])[0]?.feedUrl).toBe(FEED_URL)
})

test('Up Next plays when an episode finishes', async ($, on) => {
  const { store, launched, mpv } = fakes(on, [NIGHT])
  await $.command.run(pod('night and day'))
  const ui = await $.ui.mount({ ...pane(), surface: 'terminal' })
  await ui.press({ key: 'open-0' }) // opened already by subscribing: fold, then unfold
  await ui.press({ key: 'open-0' })
  await ui.press({ key: 'queue-0-1' })
  expect(store.queue).toEqual([{ feedUrl: FEED_URL, guid: 'ep-1' }])
  expect(await ui.find({ text: /Up next/ })).toBeDefined()

  await ui.press({ key: 'play-0-0' })
  mpv.pos = 3720
  await $.command.run(pod('skip')) // the player reports it near the end
  mpv.isUp = false
  await $.command.run(pod('skip')) // and then gone: finished
  expect(launched.at(-1)?.at(-1)).toBe('https://cdn.example.com/1.mp3')
  expect(store.queue).toEqual([])
  expect((store.progress as Record<string, { isDone: boolean }>)['ep-2']?.isDone).toBe(true)
  await ui.unmount()
})

test('? asks Claude for a summary from the show notes, once', async ($, on) => {
  const { store, prompts } = fakes(on, [NIGHT])
  await $.command.run(pod('night and day'))
  const ui = await $.ui.mount({ ...pane(), surface: 'terminal' })
  await ui.press({ key: 'info-0-1' })
  expect(prompts[0]).toContain('Show notes: Hello world — ok')
  expect(await ui.find({ text: /night sky/ })).toBeDefined()
  await ui.press({ key: 'info-0-1' })
  await ui.press({ key: 'info-0-1' })
  expect(prompts.length).toBe(1)
  expect((store.summaries as Record<string, string>)['ep-1']).toContain('night sky')
  await ui.unmount()
})

test('Claude can read the library, queue and play by id', async ($, on) => {
  const { launched } = fakes(on, [NIGHT])
  await $.command.run(pod('night and day'))

  const library = await $.tool.call({ tool: 'mcp__sidecast__library' } as any)
  expect(String(library.result)).toContain('id="ep-2"')
  expect(String(library.result)).toContain('Newest ☃')

  const queued = await $.tool.call({ tool: 'mcp__sidecast__queue', id: 'ep-1' } as any)
  expect(String(queued.result)).toContain('Added Older one')

  const played = await $.tool.call({ tool: 'mcp__sidecast__play', id: 'ep-2' } as any)
  expect(String(played.result)).toContain('Playing Night & Day — Newest ☃')
  expect(launched.length).toBe(1)

  const paused = await $.tool.call({ tool: 'mcp__sidecast__control', action: 'pause' } as any)
  expect(String(paused.result)).toBe('Paused.')
})

test('a /clear empties the session copy, never the saved library', async ($, on) => {
  const { store, mpv } = fakes(on, [NIGHT])
  await $.command.run(pod('night and day'))
  await $.command.run(pod('add https://feeds.example.com/owls'))
  await $.tool.call({ tool: 'mcp__sidecast__play', id: 'ep-1' } as any)
  mpv.pos = 600
  await $.command.run(pod('stop'))
  expect((store.shows as unknown[]).length).toBe(2)

  // A /clear, after another session subscribed to a third show.
  await $.session.end({ reason: 'clear' } as any)
  store.shows = [...(store.shows as { feedUrl: string }[]), { feedUrl: 'https://feeds.example.com/third', title: 'Third Show', author: '', subscribedAt: 0 }]

  // The pane reads the record again, and the next change keeps everything.
  const ui = await $.ui.mount({ ...pane(), surface: 'terminal' })
  expect(await ui.find({ text: /Third Show/ })).toBeDefined()
  await ui.unmount()
  await $.tool.call({ tool: 'mcp__sidecast__play', id: 'ep-2' } as any)
  expect((store.shows as unknown[]).length).toBe(3)
  expect((store.progress as Record<string, { pos: number }>)['ep-1']?.pos).toBe(600)
})

test('on Linux without an nc that speaks -U, python3 drives the player', async ($, on) => {
  const { launched, tools } = fakes(on, [NIGHT], 'python3')
  await $.command.run(pod('night and day'))
  await $.tool.call({ tool: 'mcp__sidecast__play', id: 'ep-2' } as any)
  expect(launched.length).toBe(1)
  await $.command.run(pod('pause'))
  expect(tools.length > 0 && tools.every(t => t === 'python3')).toBe(true)
})

test('with nothing to talk to mpv, play says what to install and starts nothing', async ($, on) => {
  const { launched, toasts } = fakes(on, [NIGHT], 'none')
  await $.command.run(pod('night and day'))
  await $.tool.call({ tool: 'mcp__sidecast__play', id: 'ep-2' } as any)
  expect(launched.length).toBe(0)
  expect(toasts.some(t => /python3, socat, or an nc with -U/.test(t))).toBe(true)
})
