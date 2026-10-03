export const clock = (seconds: number): string => {
  const s = Math.max(0, Math.floor(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`
}

export const length = (seconds: number | null): string => {
  if (!seconds) return ''
  const minutes = Math.round(seconds / 60)
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}` : `${minutes}m`
}

export const day = (ms: number): string => (ms ? new Date(ms).toISOString().slice(0, 10) : '          ')

export const fit = (text: string, width: number): string =>
  width <= 1 ? text.slice(0, Math.max(0, width)) : text.length > width ? `${text.slice(0, width - 1)}…` : text

/** A progress bar of `width` cells: filled, a playhead, then the rest. */
export const progressBar = (pos: number, dur: number, width: number): { done: string; rest: string } => {
  if (width <= 0) return { done: '', rest: '' }
  const filled = dur > 0 ? Math.min(width - 1, Math.round((pos / dur) * (width - 1))) : 0
  return { done: '━'.repeat(filled) + '●', rest: '─'.repeat(width - 1 - filled) }
}
