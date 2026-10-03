# podline

A podcast player that lives inside [Claude Code](https://claude.com/claude-code). Subscribe to any RSS feed, browse episodes in a side pane, and listen with a now-playing bar above the prompt while you work.

```
▶ What Bitcoin Did — How AI Could Take Bitcoin to $1 Million      «15 pause 30» stop
━━━━━━━━━━━━━━●──────────────────────────────────────────────  10:05 / 1:19:41  1.5×
```

## Features

- **Subscribe** by name (searches the Apple Podcasts directory) or by feed URL
- **Library pane** with your shows and their latest episodes: ● new, ◐ in progress, ✓ played
- **Now-playing bar** with skip back 15s, play/pause, skip ahead 30s and stop
- **Resume**: every episode picks up where you left off, across sessions
- **Speed** control, remembered between episodes
- **Up Next** queue that plays on when an episode finishes
- **Episode summaries**: press `?` on an episode and Claude summarizes it from the show notes
- **Ask Claude**: "play the newest ThursdAI I haven't heard", "queue the How I AI episode about Cursor"
- **New-episode alerts**: feeds are checked every hour

## Requirements

- Claude Code with mods (function-hook plugins)
- [mpv](https://mpv.io) for playback: `brew install mpv`
- macOS or Linux with `nc` (netcat) supporting `-U`

## Install

```sh
git clone https://github.com/<you>/podline ~/Projects/podline
```

Then load it in every session by adding it to `~/.claude/settings.json`:

```json
{ "env": { "CLAUDE_CODE_PLUGIN_DIRS": "~/Projects/podline" } }
```

Or for a single session: `claude --plugin-dir ~/Projects/podline`.

## Commands

| Command | |
|---|---|
| `/pod` | open the library |
| `/pod add <name or URL>` | search, or subscribe to a feed URL |
| `/pod remove <name>` | unsubscribe |
| `/pod pause` · `/pod play` | toggle playback |
| `/pod skip [s]` · `/pod back [s]` | jump ahead 30s / back 15s (or `s` seconds) |
| `/pod speed <x>` | playback speed, 0.5–3 |
| `/pod stop` | stop; the position is kept |
| `/pod next` | play the next episode in Up Next |
| `/pod queue` | list Up Next |
| `/pod refresh` | check every feed now |
| `/pod <name>` | anything else searches for a show |

In the pane: click an episode to play it (click again to pause), `?` for Claude's summary, `+` to add it to Up Next. With the pane focused, `p` pauses, `b`/`f` jump back/forward, `x` changes speed, `n` plays next and `s` stops.

## Asking Claude

podline gives Claude six tools: `library`, `episode`, `play`, `queue`, `control` and `subscribe`. Ask in plain words and Claude looks through your shows and episode notes, then plays, queues or controls playback for you.

Playback runs in a background `mpv`, so it survives the mod reloading, and stops when the Claude Code session ends.

## License

MIT

## Development

```sh
claude plugin validate .   # what the engine would load or refuse
claude plugin test .       # tests/*.test.ts
```
