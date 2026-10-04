// One player for the machine: mpv in the background, driven over its JSON IPC
// socket, so playback outlives a reload of the mod. This file builds the
// commands and reads the replies; register.tsx runs them.
/** The socket of a player started before sockets were per play. */
export const SOCKET = '/tmp/sidecast-mpv.sock'

/** Each play gets its own socket, so a player still shutting down never takes the new one's. */
export const socketFor = (startedAt: number) => `/tmp/sidecast-${startedAt}.sock`

export type Reading = { pos: number | null; dur: number | null; isPaused: boolean | null; speed: number | null }

export const READ_COMMANDS: unknown[][] = [
  ['get_property', 'time-pos'],
  ['get_property', 'duration'],
  ['get_property', 'pause'],
  ['get_property', 'speed'],
]

/** What talks to mpv's socket: whichever of these the machine has (see CLIENT_PROBE). */
export type IpcClient = 'nc' | 'python3' | 'socat'

/**
 * Prints the first usable client, or `none`. macOS has a BSD nc with -U built in (and its python3 may
 * only be an installer stub); on Linux, python3 is nearly universal, while an nc with -U is not.
 */
export const CLIENT_PROBE = [
  'case "$(uname -s)" in Darwin) order="nc python3 socat" ;; *) order="python3 socat nc" ;; esac',
  'for c in $order; do',
  '  case $c in',
  '    nc) command -v nc >/dev/null 2>&1 && nc -h 2>&1 | grep -q -- "-U" && { echo nc; exit 0; } ;;',
  '    python3) command -v python3 >/dev/null 2>&1 && { echo python3; exit 0; } ;;',
  '    socat) command -v socat >/dev/null 2>&1 && { echo socat; exit 0; } ;;',
  '  esac',
  'done',
  'echo none',
].join('\n')

export const parseClient = (stdout: string): IpcClient | null => {
  const name = stdout.trim()
  return name === 'nc' || name === 'python3' || name === 'socat' ? name : null
}

// Sends stdin to the socket and stops as soon as every command has its reply.
const PY_CLIENT = [
  'import socket, sys, time',
  's = socket.socket(socket.AF_UNIX); s.settimeout(1.5)',
  'try: s.connect(sys.argv[1])',
  'except OSError: sys.exit(1)',
  'data = sys.stdin.buffer.read(); want = data.count(b"\\n"); s.sendall(data)',
  'buf = b""; end = time.time() + 1.5',
  'while time.time() < end and sum(b\'"request_id"\' in l for l in buf.split(b"\\n")) < want:',
  '    try: chunk = s.recv(65536)',
  '    except socket.timeout: break',
  '    if not chunk: break',
  '    buf += chunk',
  'sys.stdout.buffer.write(buf)',
].join('\n')

/** The argv and stdin that send `commands` to mpv in one connection. */
export const ipcCall = (client: IpcClient, socket: string, commands: unknown[][]) => ({
  argv:
    client === 'python3' ? ['python3', '-c', PY_CLIENT, socket]
    : client === 'socat' ? ['socat', '-t', '0.3', '-', `UNIX-CONNECT:${socket}`]
    : ['nc', '-U', '-w', '1', socket],
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
  'sidecast',
  args.socket,
  String(Math.floor(args.startAt)),
  String(args.speed),
  args.title,
  args.url,
]
