# Security Policy

Please report vulnerabilities privately through this repository's
[Security tab](https://github.com/nmorton13/sidecast/security)
(**Report a vulnerability**), not in a public issue.

## What sidecast does on your machine

- **Network:** fetches the RSS feeds you subscribe to and the Apple Podcasts search API
  (`itunes.apple.com`), through Claude Code's host. Nothing else, and no account or key.
- **Processes:** runs `mpv` in the background to play audio, and a small client to talk to it
  over a Unix socket in a folder only you can open (`mktemp -d`, mode 0700, in
  `$XDG_RUNTIME_DIR` or `$TMPDIR`), because mpv's socket accepts any command, including running
  programs: `nc -U` on macOS; on Linux `python3` (a 12-line socket client in
  `hooks/player.ts`), else `socat`, else `nc -U`. A one-line `sh` check picks the client once per
  session, and another checks that `mpv` is installed. Arguments are passed as an argument
  vector, never pasted into a shell string.
- **Storage:** subscriptions, positions, Up Next and summaries live in Claude Code's plugin
  store for sidecast.
- **Claude:** `?` sends an episode's title and show notes to a small Claude model (Haiku) for
  a summary.

## Untrusted input

Feed titles, show notes and enclosure URLs come from third parties. sidecast strips terminal
escape sequences and control characters from feed text, plays only `http(s)` enclosures, and
labels feed text it hands to Claude as data, not instructions.
