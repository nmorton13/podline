export type Show = { feedUrl: string; title: string; author: string; /** Epoch ms. */ subscribedAt: number }
export type Episode = {
  guid: string
  title: string
  url: string
  /** Publish time, epoch ms; 0 when the feed gave none. */
  date: number
  /** Seconds, when the feed says. */
  duration: number | null
  summary: string
}
export type Progress = { pos: number; dur: number; isDone: boolean }
export type Library = { shows: Show[]; episodes: Record<string, Episode[]> }
export type NowPlaying = {
  guid: string
  feedUrl: string
  show: string
  title: string
  pos: number
  dur: number
  speed: number
  isPaused: boolean
  /** True until mpv first answers: the stream is still opening. */
  isLoading: boolean
  startedAt: number
  /** mpv's control socket for this play, in a folder only this user can open. */
  socket?: string
}
export type SearchResult = { feedUrl: string; title: string; author: string }
export type View = {
  openShow: string | null
  results: SearchResult[]
  note: string | null
  /** The episode whose summary is unfolded in the pane. */
  infoGuid: string | null
}
export type QueueItem = { feedUrl: string; guid: string }

declare module 'claude-code' {
  interface PluginState {
    sidecast: {
      library: Library
      progress: Record<string, Progress>
      now: NowPlaying | null
      view: View
      queue: QueueItem[]
      /** False until this session's copy holds what the store has; a /clear empties it. */
      loaded: boolean
      /** Claude's summary per episode guid; PENDING while one is being written. */
      summaries: Record<string, string>
    }
  }
}
