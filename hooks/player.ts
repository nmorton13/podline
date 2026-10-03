// One player for the machine: mpv in the background, driven over its JSON IPC
// socket, so playback outlives a reload of the mod. This file builds the
// commands and reads the replies; register.tsx runs them.
/** The socket of a player started before sockets were per play. */
export const SOCKET = '/tmp/podline-mpv.sock'

/** Each play gets its own socket, so a player still shutting down never takes the new one's. */
export const socketFor = (startedAt: number) => `/tmp/podline-${startedAt}.sock`

export type Reading = { pos: number | null; dur: number | null; isPaused: boolean | null; speed: number | null }

export const READ_COMMANDS: unknown[][] = [
  ['get_property', 'time-pos'],
  ['get_property', 'duration'],
  ['get_property', 'pause'],
  ['get_property', 'speed'],
]

/** The argv and stdin that send `commands` to mpv in one connection. */
export const ipcCall = (socket: string, commands: unknown[][]) => ({
  argv: ['nc', '-U', '-w', '1', socket],
  stdin: commands.map(command => JSON.stringify({ command })).join('\n') + '\n',
})

/** Each command's data, in order; null when nothing answered. */
export const parseReplies = (stdout: string, count: number): unknown[] | null => {
  const replies = stdout
    .split('\n')
    .filter(line => line.includes('"request_id"'))
    .map(line => JSON.parse(line) as { data?: unknown; error?: string })
  if (replies.length === 0) return null
  return Array.from({ length: count }, (_, i) => (replies[i]?.error === 'success' ? replies[i]?.data : undefined))
}

const num = (value: unknown) => (typeof value === 'number' ? value : null)

export const toReading = (data: unknown[]): Reading => ({
  pos: num(data[0]),
  dur: num(data[1]),
  isPaused: typeof data[2] === 'boolean' ? data[2] : null,
  speed: num(data[3]),
})

/** The argv that starts mpv detached; arguments travel as positional parameters, never spliced into the script. */
export const startArgv = (args: { socket: string; url: string; title: string; startAt: number; speed: number }) => [
  'sh',
  '-c',
  'nohup mpv --no-video --no-terminal --idle=no --input-ipc-server="$1" ' +
    '--start="$2" --speed="$3" --force-media-title="$4" -- "$5" >/dev/null 2>&1 &',
  'podline',
  args.socket,
  String(Math.floor(args.startAt)),
  String(args.speed),
  args.title,
  args.url,
]
